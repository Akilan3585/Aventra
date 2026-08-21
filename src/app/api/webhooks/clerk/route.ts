import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextResponse, type NextRequest } from "next/server";

import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/server/supabase/admin-client";

export const runtime = "nodejs";

function primaryEmail(data: {
  email_addresses: Array<{
    email_address: string;
    id: string;
    verification?: { status?: string } | null;
  }>;
  primary_email_address_id: string | null;
}) {
  const primary = data.email_addresses.find(
    (email) => email.id === data.primary_email_address_id,
  );
  if (!primary || primary.verification?.status !== "verified") return null;
  return primary.email_address.toLowerCase();
}

function adminEmails() {
  return new Set(
    (process.env.CAMPUS_ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function POST(request: NextRequest) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: "Supabase administration is not configured." },
      { status: 503 },
    );
  }

  let event;
  try {
    event = await verifyWebhook(request);
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 400 },
    );
  }

  if (event.type !== "user.created" && event.type !== "user.updated") {
    return NextResponse.json({ received: true });
  }

  const email = primaryEmail(event.data);
  if (!email) {
    return NextResponse.json(
      { error: "The Clerk user does not have a verified primary email address." },
      { status: 422 },
    );
  }

  const displayName =
    [event.data.first_name, event.data.last_name].filter(Boolean).join(" ") ||
    event.data.username ||
    email.split("@")[0] ||
    "Campus user";
  const client = createSupabaseAdminClient();

  const { data: linkedProfile, error: linkedLookupError } = await client
    .from("profiles")
    .select("id, campus_role, membership_status")
    .eq("clerk_user_id", event.data.id)
    .maybeSingle();

  if (linkedLookupError) {
    return NextResponse.json(
      { error: "Could not look up the campus profile." },
      { status: 500 },
    );
  }

  let rosterProfile = linkedProfile;
  if (!rosterProfile) {
    const { data, error } = await client
      .from("profiles")
      .select("id, campus_role, membership_status")
      .eq("email", email)
      .maybeSingle();
    if (error) {
      return NextResponse.json(
        { error: "Could not match the campus directory." },
        { status: 500 },
      );
    }
    rosterProfile = data;
  }

  const bootstrapAdmin = adminEmails().has(email);
  const profileId = rosterProfile?.id ?? event.data.id;
  const activateFacultyInvitation =
    rosterProfile?.campus_role === "faculty" &&
    rosterProfile.membership_status === "pending";
  let syncError = null;
  if (rosterProfile) {
    const result = await client
      .from("profiles")
      .update({
        // The allowlist is the explicit recovery/bootstrap authority for the
        // first campus owner. It must also repair an account that was created
        // before its email was added to CAMPUS_ADMIN_EMAILS.
        ...(bootstrapAdmin
          ? {
              approved_at: new Date().toISOString(),
              campus_role: "super-admin",
              membership_status: "active",
              valid_from: new Date().toISOString(),
            }
          : activateFacultyInvitation
            ? {
                approved_at: new Date().toISOString(),
                membership_status: "active",
                valid_from: new Date().toISOString(),
              }
            : {}),
        clerk_user_id: event.data.id,
        display_name: displayName,
        email,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profileId);
    syncError = result.error;
  } else {
    const campusRole: "student" | "super-admin" = bootstrapAdmin
      ? "super-admin"
      : "student";
    const result = await client.from("profiles").insert({
        campus_role: campusRole,
        clerk_user_id: event.data.id,
        display_name: displayName,
        email,
        id: profileId,
        membership_status: bootstrapAdmin ? "active" : "pending",
        approved_at: bootstrapAdmin ? new Date().toISOString() : null,
        valid_from: bootstrapAdmin ? new Date().toISOString() : null,
      });
    syncError = result.error;
  }

  if (syncError) {
    return NextResponse.json(
      { error: "Could not synchronize the campus profile." },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
