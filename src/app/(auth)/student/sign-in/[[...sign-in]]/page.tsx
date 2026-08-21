import type { Metadata } from "next";

import { PortalSignIn } from "@/components/auth/portal-sign-in";

export const metadata: Metadata = { title: "Student sign in" };

export default function StudentSignInPage() {
  return <PortalSignIn portal="student" />;
}
