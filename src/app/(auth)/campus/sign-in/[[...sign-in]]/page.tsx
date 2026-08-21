import type { Metadata } from "next";

import { PortalSignIn } from "@/components/auth/portal-sign-in";

export const metadata: Metadata = { title: "Campus administration sign in" };

export default function CampusSignInPage() {
  return <PortalSignIn portal="campus" />;
}
