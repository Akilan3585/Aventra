"use client";

import { OrganizationSwitcher, SignOutButton } from "@clerk/nextjs";
import Link from "next/link";

export function AccessStateActions({
  showOrganizationSwitcher = false,
}: {
  showOrganizationSwitcher?: boolean;
}) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const clerkIsConfigured = Boolean(
    publishableKey && !publishableKey.includes("REPLACE_ME"),
  );

  return (
    <div className="mt-7">
      {clerkIsConfigured && showOrganizationSwitcher ? (
        <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <p className="mb-3 text-xs font-semibold text-blue-900">Select your verified campus organization</p>
          <OrganizationSwitcher />
        </div>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Link className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white" href="/app">Check again</Link>
        {clerkIsConfigured ? (
          <SignOutButton redirectUrl="/">
            <button className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700" type="button">Use another account</button>
          </SignOutButton>
        ) : (
          <Link className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700" href="/">Return home</Link>
        )}
      </div>
    </div>
  );
}
