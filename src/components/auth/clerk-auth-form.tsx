"use client";

import { SignIn, SignUp, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type ClerkAuthFormProps = {
  fallbackRedirectUrl?: string;
  mode: "sign-in" | "sign-up";
  path?: string;
  signInUrl?: string;
  signUpUrl?: string;
};

export function ClerkAuthForm({
  fallbackRedirectUrl = "/app",
  mode,
  path = mode === "sign-in" ? "/sign-in" : "/sign-up",
  signInUrl = "/sign-in",
  signUpUrl = "/sign-up",
}: ClerkAuthFormProps) {
  const { isLoaded, userId } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && userId) router.replace(fallbackRedirectUrl);
  }, [fallbackRedirectUrl, isLoaded, router, userId]);

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
      fallbackRedirectUrl={fallbackRedirectUrl}
      path={path}
      routing="path"
      signUpUrl={signUpUrl}
    />
  ) : (
    <SignUp
      fallbackRedirectUrl={fallbackRedirectUrl}
      path={path}
      routing="path"
      signInUrl={signInUrl}
    />
  );
}
