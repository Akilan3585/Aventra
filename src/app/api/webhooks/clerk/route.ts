import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextResponse, type NextRequest } from "next/server";

import { roles, type Role } from "@/server/auth/permissions";
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/server/supabase/admin-client";

export const runtime = "nodejs";

function isRole(value: unknown): value is Role {
  return typeof value === "string" && roles.includes(value as Role);
}

function primaryEmail(data: {
  email_addresses: Array<{ email_address: string; id: string }>;
  primary_email_address_id: string | null;
}) {
  return data.email_addresses.find(
    (email) => email.id === data.primary_email_address_id,
  )?.email_address.toLowerCase();
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
      { error: "The Clerk user does not have a primary email address." },
      { status: 422 },
    );
  }

  const metadataRole =
    event.data.private_metadata.campusRole ??
    event.data.public_metadata.campusRole;
  const campusRole: Role = isRole(metadataRole) ? metadataRole : "student";
  const displayName =
    [event.data.first_name, event.data.last_name].filter(Boolean).join(" ") ||
    event.data.username ||
    email.split("@")[0] ||
    "Campus user";
  const client = createSupabaseAdminClient();

  const { data: existingProfile, error: lookupError } = await client
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json(
      { error: "Could not look up the campus profile." },
      { status: 500 },
    );
  }

  const profileId = existingProfile?.id ?? event.data.id;
  const { error: syncError } = await client.from("profiles").upsert(
    {
      campus_role: campusRole,
      clerk_user_id: event.data.id,
      display_name: displayName,
      email,
      id: profileId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (syncError) {
    return NextResponse.json(
      { error: "Could not synchronize the campus profile." },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
