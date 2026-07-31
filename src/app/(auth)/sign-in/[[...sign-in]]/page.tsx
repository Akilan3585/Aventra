import { ShieldCheck } from "lucide-react";
import Link from "next/link";

import { ClerkAuthForm } from "@/components/auth/clerk-auth-form";
import { isClerkConfigured } from "@/server/auth/campus-access";

export default function SignInPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary text-white shadow-lg shadow-blue-200"><ShieldCheck className="size-5" /></span><h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">Aventra Campus access</h1><p className="mt-2 text-sm text-slate-500">Sign in with an authorized campus account.</p></div>
        {isClerkConfigured() ? (
          <ClerkAuthForm mode="sign-in" />
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-white p-6 text-sm leading-6 text-slate-600 shadow-sm">
            Clerk is not configured yet. Add the Clerk publishable and secret
            keys to <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">.env.local</code>, then restart the app.
          </div>
        )}
        <p className="mt-6 text-center text-sm text-slate-500">
          New to Aventra?{" "}
          <Link className="font-semibold text-primary hover:text-blue-700" href="/sign-up">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
