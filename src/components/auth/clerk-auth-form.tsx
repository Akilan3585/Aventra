"use client";

import { SignIn, SignUp, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function ClerkAuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const { isLoaded, userId } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && userId) router.replace("/dashboard");
  }, [isLoaded, router, userId]);

  if (!isLoaded || userId) {
    return (
      <div className="grid min-h-72 place-items-center rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="text-center">
          <span className="mx-auto block size-7 animate-spin rounded-full border-2 border-blue-100 border-t-primary" />
          <p className="mt-4 text-sm text-slate-500">
            {userId ? "Opening your workspace…" : "Loading secure access…"}
          </p>
        </div>
      </div>
    );
  }

  return mode === "sign-in" ? (
    <SignIn
      fallbackRedirectUrl="/dashboard"
      path="/sign-in"
      routing="path"
      signUpUrl="/sign-up"
    />
  ) : (
    <SignUp
      fallbackRedirectUrl="/dashboard"
      path="/sign-up"
      routing="path"
      signInUrl="/sign-in"
    />
  );
}
