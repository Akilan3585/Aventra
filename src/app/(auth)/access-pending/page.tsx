import { Clock3, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { AccessStateActions } from "@/components/auth/access-state-actions";
import { BrandLogo } from "@/components/brand/brand-logo";
import { getCampusIdentity } from "@/server/auth/campus-access";

export const dynamic = "force-dynamic";

export default async function AccessPendingPage() {
  const identity = await getCampusIdentity();
  const needsStudentProfile = identity?.status === "unlinked" || identity?.role === "student";

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,#e0e7ff,transparent_42%),#f8fafc] p-6">
      <section className="w-full max-w-xl rounded-[28px] border border-white bg-white/95 p-7 shadow-[0_30px_90px_-48px_rgba(15,23,42,.55)] sm:p-10">
        <Link aria-label="Aventra AI home" className="inline-flex rounded-xl border border-slate-100 p-2" href="/"><BrandLogo className="w-36" eager /></Link>
        <span className="mt-8 grid size-12 place-items-center rounded-2xl bg-amber-50 text-amber-700"><Clock3 className="size-5" /></span>
        <p className="mt-6 text-sm font-semibold text-amber-700">Campus approval pending</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Your identity is verified. Your campus membership is next.</h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">{needsStudentProfile ? "Submit your student number and department, then a faculty member of your department or a campus administrator verifies the record and activates your membership. Assignments and study materials open only after that approval." : "A campus administrator must match your verified email to the student, faculty, or staff directory and activate your membership."} You cannot select your own role.</p>
        <div className="mt-5 flex gap-3 rounded-2xl bg-blue-50 p-4 text-sm text-blue-800"><ShieldCheck className="mt-0.5 size-4 shrink-0" /><p>This protects academic records and prevents personal accounts from entering a campus workspace.</p></div>
        <AccessStateActions
          primaryHref={needsStudentProfile ? "/student/onboarding" : "/app"}
          primaryLabel={needsStudentProfile ? "Complete student profile" : "Check again"}
        />
      </section>
    </main>
  );
}
