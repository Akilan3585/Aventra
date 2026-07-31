"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";

type AuthProviderProps = {
  children: ReactNode;
  publishableKey?: string;
};

export function AuthProvider({ children, publishableKey }: AuthProviderProps) {
  if (!publishableKey || publishableKey.includes("REPLACE_ME")) return children;

  return (
    <ClerkProvider publishableKey={publishableKey}>
      {children}
    </ClerkProvider>
  );
}
