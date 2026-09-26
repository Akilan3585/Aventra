import "server-only";

import { timingSafeEqual } from "node:crypto";

/** Checks `Authorization: Bearer $CRON_SECRET` in constant time. Unset secret means every call is refused. */
export function isAuthorizedCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.includes("REPLACE_ME")) return false;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const expected = Buffer.from(secret);
  const received = Buffer.from(provided);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
