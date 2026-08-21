import type { Metadata } from "next";

import { PortalSignIn } from "@/components/auth/portal-sign-in";

export const metadata: Metadata = { title: "Faculty sign in" };

export default function FacultySignInPage() {
  return <PortalSignIn portal="faculty" />;
}
