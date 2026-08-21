import { Ban } from "lucide-react";
import Link from "next/link";

import { AccessStateActions } from "@/components/auth/access-state-actions";

const reasonCopy: Record<string, string> = {
  expired: "Your campus access period has ended.",
  suspended: "Your campus membership is currently suspended or your verified identity no longer matches the directory.",
  "unverified-email": "Verify your primary email address before requesting campus access.",
  "role-mismatch": "This account belongs to a different campus portal. Sign out and use an account whose verified directory role matches the selected portal.",
};

export default async function AccessDeniedPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason = "suspended" } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <section className="w-full max-w-xl rounded-[28px] border border-rose-100 bg-white p-7 shadow-[0_30px_90px_-48px_rgba(15,23,42,.55)] sm:p-10">
        <Link className="text-sm font-semibold text-slate-500" href="/">Aventra AI</Link>
        <span className="mt-8 grid size-12 place-items-center rounded-2xl bg-rose-50 text-rose-700"><Ban className="size-5" /></span>
        <p className="mt-6 text-sm font-semibold text-rose-700">Access unavailable</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">This account cannot open a campus workspace.</h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">{reasonCopy[reason] ?? reasonCopy.suspended} Contact your college administrator if you believe this is incorrect.</p>
        <AccessStateActions />
      </section>
    </main>
  );
}
