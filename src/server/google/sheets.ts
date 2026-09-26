import "server-only";

import { createSign } from "node:crypto";

/**
 * Minimal Google Sheets client backed by a service account. Uses the REST API
 * through plain `fetch` (no googleapis dependency) and signs the OAuth JWT with
 * Node's crypto module, mirroring the dependency-free Resend integration.
 *
 * Share the target spreadsheet with GOOGLE_SERVICE_ACCOUNT_EMAIL as an editor.
 * This module is server-only; credentials never reach the browser.
 */

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets";

export type SheetsConfiguration = {
  clientEmail: string;
  privateKey: string;
  spreadsheetId: string;
};

export type SheetTab = { sheetId: number; title: string };
export type SheetRow = ReadonlyArray<string | number>;

export function resolveGoogleSheetsConfiguration(): SheetsConfiguration | null {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEETS_ATTENDANCE_SPREADSHEET_ID;
  const unset = [clientEmail, privateKey, spreadsheetId].some(
    (value) => !value || value.includes("REPLACE_ME") || value.includes("your-project"),
  );
  if (unset || !clientEmail || !privateKey || !spreadsheetId) return null;
  return { clientEmail, privateKey: privateKey.replace(/\\n/g, "\n"), spreadsheetId };
}

export function isGoogleSheetsConfigured() {
  return resolveGoogleSheetsConfiguration() !== null;
}

/** Error surfaced to callers; never includes credentials or raw provider payloads. */
export class GoogleSheetsError extends Error {
  constructor(message: string, readonly httpStatus?: number) {
    super(message);
    this.name = "GoogleSheetsError";
  }
}

function base64Url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

let cachedToken: { clientEmail: string; expiresAt: number; value: string } | null = null;

async function fetchAccessToken(config: SheetsConfiguration) {
  if (cachedToken && cachedToken.clientEmail === config.clientEmail && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(JSON.stringify({
    aud: TOKEN_URL,
    exp: issuedAt + 3600,
    iat: issuedAt,
    iss: config.clientEmail,
    scope: SCOPE,
  }));
  let signature: Buffer;
  try {
    signature = createSign("RSA-SHA256").update(`${header}.${claims}`).end().sign(config.privateKey);
  } catch {
    throw new GoogleSheetsError("The Google service-account private key could not be parsed.");
  }
  const assertion = `${header}.${claims}.${base64Url(signature)}`;

  const response = await fetch(TOKEN_URL, {
    body: new URLSearchParams({ assertion, grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer" }),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    method: "POST",
  });
  const payload = await response.json().catch(() => null) as
    | { access_token?: string; error?: string; expires_in?: number }
    | null;
  if (!response.ok || !payload?.access_token) {
    throw new GoogleSheetsError(`Google rejected the service-account credentials (${payload?.error ?? `HTTP ${response.status}`}).`, response.status);
  }
  cachedToken = {
    clientEmail: config.clientEmail,
    expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000,
    value: payload.access_token,
  };
  return cachedToken.value;
}

async function sheetsRequest<T>(config: SheetsConfiguration, path: string, init: RequestInit = {}): Promise<T> {
  const token = await fetchAccessToken(config);
  const response = await fetch(`${SHEETS_API}/${config.spreadsheetId}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
  });
  const payload = await response.json().catch(() => null) as (T & { error?: { message?: string; status?: string } }) | null;
  if (!response.ok) {
    const reason = payload?.error?.status ?? `HTTP ${response.status}`;
    if (response.status === 403) throw new GoogleSheetsError("The spreadsheet is not shared with the service account (or the Sheets API is disabled).", 403);
    if (response.status === 404) throw new GoogleSheetsError("The configured spreadsheet ID was not found.", 404);
    if (response.status === 429) throw new GoogleSheetsError("Google Sheets rate limit reached; retry shortly.", 429);
    throw new GoogleSheetsError(`Google Sheets request failed (${reason}).`, response.status);
  }
  return payload as T;
}

function quoteTitle(title: string) {
  return `'${title.replace(/'/g, "''")}'`;
}

export async function listSheetTabs(config: SheetsConfiguration): Promise<SheetTab[]> {
  const payload = await sheetsRequest<{ sheets?: Array<{ properties: { sheetId: number; title: string } }> }>(
    config,
    "?fields=sheets.properties(sheetId,title)",
  );
  return (payload.sheets ?? []).map((sheet) => sheet.properties);
}

/**
 * Creates any missing tabs and writes the header row into tabs that are empty.
 * Existing headers are left untouched so hand-edited sheets are not clobbered.
 */
export async function ensureSheetTabsWithHeaders(
  config: SheetsConfiguration,
  tabs: ReadonlyArray<{ header: SheetRow; title: string }>,
) {
  const existing = await listSheetTabs(config);
  const missing = tabs.filter((tab) => !existing.some((sheet) => sheet.title === tab.title));
  if (missing.length) {
    await sheetsRequest(config, ":batchUpdate", {
      body: JSON.stringify({ requests: missing.map((tab) => ({ addSheet: { properties: { title: tab.title } } })) }),
      method: "POST",
    });
  }

  const firstRows = await Promise.all(tabs.map((tab) => readSheetRange(config, `${quoteTitle(tab.title)}!1:1`)));
  const headerless = tabs.filter((_tab, index) => !firstRows[index]?.[0]?.length);
  if (headerless.length) {
    await sheetsRequest(config, "/values:batchUpdate", {
      body: JSON.stringify({
        data: headerless.map((tab) => ({ range: `${quoteTitle(tab.title)}!A1`, values: [tab.header] })),
        valueInputOption: "RAW",
      }),
      method: "POST",
    });
  }
}

export async function readSheetRange(config: SheetsConfiguration, range: string): Promise<string[][]> {
  const payload = await sheetsRequest<{ values?: string[][] }>(config, `/values/${encodeURIComponent(range)}`);
  return payload.values ?? [];
}

/** Column A of a tab, index 0 = row 1. Empty cells come back as undefined. */
export async function readSheetIdColumn(config: SheetsConfiguration, title: string): Promise<Array<string | undefined>> {
  const rows = await readSheetRange(config, `${quoteTitle(title)}!A:A`);
  return rows.map((row) => row[0]);
}

export async function appendSheetRows(config: SheetsConfiguration, title: string, rows: readonly SheetRow[]) {
  if (!rows.length) return;
  await sheetsRequest(config, `/values/${encodeURIComponent(quoteTitle(title))}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    body: JSON.stringify({ values: rows }),
    method: "POST",
  });
}

/** Rewrites whole rows in place, keyed by 1-based sheet row number. */
export async function updateSheetRows(
  config: SheetsConfiguration,
  title: string,
  updates: ReadonlyArray<{ rowNumber: number; values: SheetRow }>,
) {
  if (!updates.length) return;
  await sheetsRequest(config, "/values:batchUpdate", {
    body: JSON.stringify({
      data: updates.map((update) => ({ range: `${quoteTitle(title)}!A${update.rowNumber}`, values: [update.values] })),
      valueInputOption: "RAW",
    }),
    method: "POST",
  });
}
