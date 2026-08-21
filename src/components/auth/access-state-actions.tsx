"use client";

import { SignOutButton } from "@clerk/nextjs";
import Link from "next/link";

export function AccessStateActions() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const clerkIsConfigured = Boolean(
    publishableKey && !publishableKey.includes("REPLACE_ME"),
  );

  return (
    <div className="mt-7 flex flex-wrap gap-3">
      <Link className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white" href="/app">Check again</Link>
      {clerkIsConfigured ? (
        <SignOutButton redirectUrl="/">
          <button className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700" type="button">Use another account</button>
        </SignOutButton>
      ) : (
        <Link className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700" href="/">Return home</Link>
      )}
    </div>
  );
}
