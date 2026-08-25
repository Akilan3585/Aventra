import { GraduationCap, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { BrandLogo } from "@/components/brand/brand-logo";
import { ClerkAuthForm } from "@/components/auth/clerk-auth-form";
import { isClerkConfigured } from "@/server/auth/campus-access";

export default function StudentSignUpPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,#ede9fe,transparent_36%),#f8fafc] p-6">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <Link aria-label="Aventra AI home" className="mx-auto mb-6 inline-flex rounded-2xl border border-slate-200 bg-white p-2 shadow-sm" href="/"><BrandLogo className="w-40" eager /></Link>
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-200"><GraduationCap className="size-5" /></span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">Create your student account</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Verify your identity first, then submit your academic details for campus approval.</p>
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700"><ShieldCheck className="size-3.5" />Student access only—no role self-assignment</p>
        </div>
        {isClerkConfigured() ? (
          <ClerkAuthForm fallbackRedirectUrl="/student/onboarding" mode="sign-up" path="/student/sign-up" signInUrl="/student/sign-in" />
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-white p-6 text-sm leading-6 text-slate-600 shadow-sm">Clerk keys are required before student account creation is enabled.</div>
        )}
        <p className="mt-6 text-center text-sm text-slate-500">Already registered? <Link className="font-semibold text-indigo-700 hover:text-indigo-800" href="/student/sign-in">Student sign in</Link></p>
      </div>
    </main>
  );
}
