"use client";

import { ArrowRight, CheckCircle2, LoaderCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { submitStudentOnboardingAction } from "@/features/students/application/student-onboarding-actions";
import { initialStudentOnboardingState } from "@/features/students/domain/student-onboarding";
import type { DepartmentOption } from "@/features/students/infrastructure/student.repository";

type StudentOnboardingFormProps = {
  departments: DepartmentOption[];
  email: string;
  initialDisplayName: string;
};

const fieldClassName = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export function StudentOnboardingForm({
  departments,
  email,
  initialDisplayName,
}: StudentOnboardingFormProps) {
  const [state, formAction, isPending] = useActionState(
    submitStudentOnboardingAction,
    initialStudentOnboardingState,
  );

  if (state.status === "success") {
    return (
      <div className="rounded-[28px] border border-emerald-200 bg-white p-7 shadow-[0_24px_80px_-45px_rgba(15,23,42,.5)] sm:p-9">
        <span className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="size-6" />
        </span>
        <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Profile received.</h2>
        <p aria-live="polite" className="mt-3 text-sm leading-6 text-slate-600">{state.message}</p>
        <Link className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800" href="/access-pending">
          View approval status <ArrowRight className="size-4" />
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-45px_rgba(15,23,42,.5)] sm:p-8">
      <div className="flex items-start gap-3 rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-900">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-blue-700" />
        <p>Your verified email is fixed to this request. Student details remain pending until your college directory confirms them.</p>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
          Verified email
          <input className={`${fieldClassName} cursor-not-allowed bg-slate-50 text-slate-500`} disabled value={email} />
        </label>
        <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
          Full name
          <input autoComplete="name" className={fieldClassName} defaultValue={initialDisplayName} maxLength={120} name="displayName" required />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Student number
          <input autoCapitalize="characters" className={fieldClassName} maxLength={40} name="studentNumber" placeholder="CSE/2026/041" required title="Use letters, numbers, slash, underscore, or hyphen." />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Department
          <select className={fieldClassName} defaultValue="" disabled={!departments.length} name="departmentId" required>
            <option disabled value="">Select department</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>{department.code} — {department.name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Admission year
          <input className={fieldClassName} defaultValue={new Date().getFullYear()} max={new Date().getFullYear() + 1} min={2000} name="admissionYear" required type="number" />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Current semester
          <input className={fieldClassName} defaultValue={1} max={16} min={1} name="semester" required type="number" />
        </label>
      </div>

      {!departments.length ? (
        <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">No departments are available yet. Ask your campus administrator to configure the academic directory.</p>
      ) : null}
      {state.status === "error" ? <p aria-live="polite" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{state.message}</p> : null}
      <button className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60" disabled={isPending || !departments.length} type="submit">
        {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {isPending ? "Submitting securely…" : "Submit student profile"}
      </button>
    </form>
  );
}
