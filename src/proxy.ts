import { clerkMiddleware } from "@clerk/nextjs/server";
import {
  NextResponse,
  type NextFetchEvent,
  type NextMiddleware,
  type NextRequest,
} from "next/server";

let clerkProxy: NextMiddleware | null = null;

function redirectInsecureDevelopmentHost(request: NextRequest) {
  if (process.env.NODE_ENV === "production") return null;

  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!configuredUrl) return null;

  const canonicalUrl = new URL(configuredUrl);
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  const hostHeader = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const requestHost = hostHeader
    ? new URL(`http://${hostHeader}`).hostname
    : request.nextUrl.hostname;

  // Clerk session-cookie signing needs a secure browser context. Browsers treat
  // HTTP localhost as trustworthy, but not a plain-HTTP LAN IP such as
  // 192.168.x.x. Canonicalizing before Clerk runs prevents a sign-in loop.
  if (
    canonicalUrl.protocol !== "http:" ||
    !localHosts.has(canonicalUrl.hostname) ||
    localHosts.has(requestHost) ||
    request.nextUrl.protocol !== "http:"
  ) {
    return null;
  }

  const target = new URL(
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
    canonicalUrl,
  );
  return NextResponse.redirect(target, 307);
}

function clerkIsConfigured() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const secretKey = process.env.CLERK_SECRET_KEY;
  return Boolean(
    publishableKey && secretKey &&
    !publishableKey.includes("REPLACE_ME") &&
    !secretKey.includes("REPLACE_ME"),
  );
}

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  const canonicalRedirect = redirectInsecureDevelopmentHost(request);
  if (canonicalRedirect) return canonicalRedirect;

  if (!clerkIsConfigured()) return NextResponse.next();
  clerkProxy ??= clerkMiddleware();
  return clerkProxy(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
