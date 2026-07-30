import { clerkMiddleware } from "@clerk/nextjs/server";
import {
  NextResponse,
  type NextFetchEvent,
  type NextMiddleware,
  type NextRequest,
} from "next/server";

let clerkProxy: NextMiddleware | null = null;

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
