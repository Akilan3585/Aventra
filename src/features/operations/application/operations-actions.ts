"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requirePermission } from "@/server/auth/campus-access";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";

export type OperationActionState = {
  message: string;
  status: "idle" | "error" | "success";
};

function refreshOperations(...paths: string[]) {
  [...paths, "/dashboard", "/analytics"].forEach((path) => revalidatePath(path));
}

function errorState(message: string): OperationActionState {
  return { message, status: "error" };
}

const attendanceSchema = z.object({
  enrollmentId: z.uuid(),
  sessionDate: z.iso.date(),
  status: z.enum(["present", "absent", "late", "excused"]),
});

export async function recordAttendanceAction(
  _previous: OperationActionState,
  formData: FormData,
): Promise<OperationActionState> {
  try {
    const access = await requirePermission("attendance:record");
    const parsed = attendanceSchema.safeParse({
      enrollmentId: formData.get("enrollmentId"),
      sessionDate: formData.get("sessionDate"),
      status: formData.get("status"),
    });
    if (!parsed.success) return errorState("Choose an enrollment, date, and valid attendance status.");

    const client = createSupabaseAdminClient();
    const { error } = await client.from("attendance_records").upsert({
      enrollment_id: parsed.data.enrollmentId,
      recorded_by_profile_id: null,
      session_date: parsed.data.sessionDate,
      status: parsed.data.status,
    }, { onConflict: "enrollment_id,session_date" });
    if (error) return errorState("Attendance could not be saved.");

    await client.from("audit_logs").insert({
      action: "attendance.recorded",
      actor_profile_id: null,
      entity_id: parsed.data.enrollmentId,
      entity_type: "enrollment",
      metadata: { actor_clerk_id: access.userId, date: parsed.data.sessionDate, status: parsed.data.status },
    });
    refreshOperations("/attendance", "/students");
    return { message: "Attendance saved and the success signals were refreshed.", status: "success" };
  } catch {
    return errorState("Sign in with attendance-recording permission.");
  }
}

const scheduleSchema = z.object({
  endsAt: z.iso.datetime({ local: true }),
  offeringId: z.uuid(),
  roomId: z.uuid(),
  startsAt: z.iso.datetime({ local: true }),
});

export async function createScheduleAction(
  _previous: OperationActionState,
  formData: FormData,
): Promise<OperationActionState> {
  try {
    const access = await requirePermission("schedules:manage");
    const parsed = scheduleSchema.safeParse({
      endsAt: formData.get("endsAt"), offeringId: formData.get("offeringId"), roomId: formData.get("roomId"), startsAt: formData.get("startsAt"),
    });
    if (!parsed.success) return errorState("Complete the offering, room, start, and end time.");
    const startsAt = new Date(parsed.data.startsAt);
    const endsAt = new Date(parsed.data.endsAt);
    if (endsAt <= startsAt) return errorState("End time must be after start time.");

    const client = createSupabaseAdminClient();
    const [conflictsResult, roomResult, enrollmentResult] = await Promise.all([
      client.from("schedules").select("id").eq("room_id", parsed.data.roomId).lt("starts_at", endsAt.toISOString()).gt("ends_at", startsAt.toISOString()).limit(1),
      client.from("rooms").select("capacity, is_active").eq("id", parsed.data.roomId).single(),
      client.from("enrollments").select("id", { count: "exact", head: true }).eq("offering_id", parsed.data.offeringId),
    ]);
    if (conflictsResult.error || roomResult.error || enrollmentResult.error) return errorState("Schedule constraints could not be checked.");
    if (conflictsResult.data.length) return errorState("That room already has an overlapping session.");
    if (!roomResult.data.is_active) return errorState("The selected room is inactive.");
    if ((enrollmentResult.count ?? 0) > roomResult.data.capacity) return errorState(`Room capacity is ${roomResult.data.capacity}, below the ${enrollmentResult.count ?? 0} enrolled students.`);

    const { data, error } = await client.from("schedules").insert({
      created_by_profile_id: null,
      ends_at: endsAt.toISOString(),
      offering_id: parsed.data.offeringId,
      room_id: parsed.data.roomId,
      starts_at: startsAt.toISOString(),
    }).select("id").single();
    if (error) return errorState("The schedule could not be created.");
    await client.from("audit_logs").insert({ action: "schedule.created", actor_profile_id: null, entity_id: data.id, entity_type: "schedule", metadata: { actor_clerk_id: access.userId } });
    refreshOperations("/schedules", "/classrooms");
    return { message: "Session scheduled after capacity and overlap checks.", status: "success" };
  } catch {
    return errorState("Sign in with schedule-management permission.");
  }
}

const ticketSchema = z.object({
  description: z.string().trim().min(10).max(2000),
  equipmentId: z.union([z.uuid(), z.literal("")]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  roomId: z.uuid(),
  title: z.string().trim().min(4).max(160),
});

export async function createMaintenanceTicketAction(
  _previous: OperationActionState,
  formData: FormData,
): Promise<OperationActionState> {
  try {
    const access = await requirePermission("maintenance:manage");
    const parsed = ticketSchema.safeParse({
      description: formData.get("description"), equipmentId: formData.get("equipmentId") ?? "", priority: formData.get("priority"), roomId: formData.get("roomId"), title: formData.get("title"),
    });
    if (!parsed.success) return errorState("Complete the room, title, description, and priority.");
    const client = createSupabaseAdminClient();
    if (parsed.data.equipmentId) {
      const { data: equipment, error: equipmentError } = await client.from("equipment").select("room_id").eq("id", parsed.data.equipmentId).single();
      if (equipmentError || equipment.room_id !== parsed.data.roomId) return errorState("Selected equipment does not belong to that room.");
    }
    const { data, error } = await client.from("maintenance_tickets").insert({
      description: parsed.data.description,
      equipment_id: parsed.data.equipmentId || null,
      priority: parsed.data.priority,
      reported_by_profile_id: null,
      room_id: parsed.data.roomId,
      title: parsed.data.title,
    }).select("id").single();
    if (error) return errorState("The maintenance ticket could not be created.");
    await client.from("audit_logs").insert({ action: "maintenance.created", actor_profile_id: null, entity_id: data.id, entity_type: "maintenance_ticket", metadata: { actor_clerk_id: access.userId, priority: parsed.data.priority } });
    refreshOperations("/maintenance", "/classrooms");
    return { message: "Maintenance ticket opened and readiness was recalculated.", status: "success" };
  } catch {
    return errorState("Sign in with maintenance-management permission.");
  }
}

const ticketStatusSchema = z.object({ ticketId: z.uuid(), status: z.enum(["open", "assigned", "in_progress", "resolved", "closed"]) });

export async function updateMaintenanceStatusAction(formData: FormData) {
  await requirePermission("maintenance:manage");
  const parsed = ticketStatusSchema.safeParse({ ticketId: formData.get("ticketId"), status: formData.get("status") });
  if (!parsed.success) return;
  const terminal = ["resolved", "closed"].includes(parsed.data.status);
  const client = createSupabaseAdminClient();
  await client.from("maintenance_tickets").update({ resolved_at: terminal ? new Date().toISOString() : null, status: parsed.data.status }).eq("id", parsed.data.ticketId);
  refreshOperations("/maintenance", "/classrooms");
}
