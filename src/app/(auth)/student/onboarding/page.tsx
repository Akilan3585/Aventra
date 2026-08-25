import { currentUser } from "@clerk/nextjs/server";
import { GraduationCap, LockKeyhole, UserCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BrandLogo } from "@/components/brand/brand-logo";
import { canSubmitStudentOnboarding } from "@/features/students/domain/student-onboarding";
import { listDepartments } from "@/features/students/infrastructure/student.repository";
import { StudentOnboardingForm } from "@/features/students/presentation/student-onboarding-form";
import { getCampusIdentity, isClerkConfigured } from "@/server/auth/campus-access";
import { isSupabaseAdminConfigured } from "@/server/supabase/admin-client";

export const dynamic = "force-dynamic";

export default async function StudentOnboardingPage() {
  if (!isClerkConfigured()) redirect("/student/sign-in");

  const identity = await getCampusIdentity();
  if (!identity) redirect("/student/sign-in");
  if (identity.role && identity.role !== "student") {
    redirect("/access-denied?reason=role-mismatch&portal=student");
  }
  if (identity.role === "student" && identity.status === "active") redirect("/student-workspace");
  if (identity.status === "active") {
    redirect("/access-denied?reason=role-mismatch&portal=student");
  }
  if (!canSubmitStudentOnboarding({ role: identity.role, status: identity.status })) {
    redirect(`/access-denied?reason=${encodeURIComponent(identity.status)}&portal=student`);
  }

  if (!isSupabaseAdminConfigured()) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
        <div className="max-w-lg rounded-[28px] border border-amber-200 bg-white p-8 shadow-xl">
          <LockKeyhole className="size-8 text-amber-700" />
          <h1 className="mt-5 text-2xl font-semibold text-slate-950">Student onboarding needs the campus database.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Configure the Supabase server credentials, then reload this page. No student data has been submitted.</p>
        </div>
      </main>
    );
  }

  const [departments, user] = await Promise.all([listDepartments(), currentUser()]);
  const displayName = user?.fullName?.trim() || identity.email.split("@")[0] || "";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ede9fe,transparent_34%),radial-gradient(circle_at_bottom_right,#dbeafe,transparent_32%),#f8fafc] px-5 py-7 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <Link aria-label="Aventra AI home" className="inline-flex rounded-2xl border border-white bg-white/90 p-2 shadow-sm" href="/"><BrandLogo className="w-40" eager /></Link>
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[.8fr_1.2fr] lg:gap-14">
          <section className="pt-3">
            <span className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-xl shadow-indigo-200"><GraduationCap className="size-6" /></span>
            <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">Student onboarding</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-5xl">Connect your verified identity to campus life.</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">Complete your academic profile once. After your campus team verifies the record, Aventra opens only the student workspace and its learning services.</p>
            <ol className="mt-8 space-y-4 text-sm text-slate-700">
              <li className="flex gap-3"><UserCheck className="mt-0.5 size-5 shrink-0 text-indigo-600" /><span><strong>Identity verified by Clerk.</strong><br />Your primary email is taken from the signed-in account.</span></li>
              <li className="flex gap-3"><GraduationCap className="mt-0.5 size-5 shrink-0 text-indigo-600" /><span><strong>Academic details matched.</strong><br />Your campus office confirms the student number and department.</span></li>
              <li className="flex gap-3"><LockKeyhole className="mt-0.5 size-5 shrink-0 text-indigo-600" /><span><strong>Access activated safely.</strong><br />Onboarding cannot grant faculty or administration permissions.</span></li>
            </ol>
          </section>
          <StudentOnboardingForm departments={departments} email={identity.email} initialDisplayName={displayName} />
        </div>
      </div>
    </main>
  );
}
