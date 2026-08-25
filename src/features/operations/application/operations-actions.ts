"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requirePermission } from "@/server/auth/campus-access";
import { facultyOwnsEnrollment } from "@/server/auth/academic-scope";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";
import { evaluateAttendanceEmailAlert } from "@/features/attendance/application/attendance-alert.service";
import {
  canTransitionMaintenanceTicket,
  isFutureCampusDate,
  maintenanceStatuses,
  maintenanceTransitionNeedsVerification,
} from "@/features/operations/domain/operations-rules";

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
    if (isFutureCampusDate(parsed.data.sessionDate)) return errorState("Attendance cannot be recorded for a future date.");
    if (
      access.role === "faculty" &&
      (!access.profileId || !(await facultyOwnsEnrollment(access.profileId, parsed.data.enrollmentId)))
    ) return errorState("You can record attendance only for students in your assigned classes.");

    const client = createSupabaseAdminClient();
    const { error } = await client.from("attendance_records").upsert({
      enrollment_id: parsed.data.enrollmentId,
      recorded_by_profile_id: access.profileId,
      session_date: parsed.data.sessionDate,
      status: parsed.data.status,
    }, { onConflict: "enrollment_id,session_date" });
    if (error) return errorState("Attendance could not be saved.");

    await client.from("audit_logs").insert({
      action: "attendance.recorded",
      actor_profile_id: access.profileId,
      entity_id: parsed.data.enrollmentId,
      entity_type: "enrollment",
      metadata: { actor_clerk_id: access.userId, date: parsed.data.sessionDate, status: parsed.data.status },
    });
    const alertOutcome = await evaluateAttendanceEmailAlert(parsed.data.enrollmentId);
    refreshOperations("/attendance", "/students");
    let alertMessage = "";
    if (alertOutcome === "failed") alertMessage = " The low-attendance email could not be delivered; its failed status was recorded for review.";
    if (alertOutcome === "queued") alertMessage = " A low-attendance email was queued; add the Resend environment settings to enable delivery.";
    if (alertOutcome === "sent") alertMessage = " The student was emailed because attendance is below 70%.";
    return { message: `Attendance saved and the success signals were refreshed.${alertMessage}`, status: "success" };
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
    const [roomConflicts, offeringConflicts, roomResult, enrollmentResult, offeringResult] = await Promise.all([
      client.from("schedules").select("id").eq("room_id", parsed.data.roomId).lt("starts_at", endsAt.toISOString()).gt("ends_at", startsAt.toISOString()).limit(1),
      client.from("schedules").select("id").eq("offering_id", parsed.data.offeringId).lt("starts_at", endsAt.toISOString()).gt("ends_at", startsAt.toISOString()).limit(1),
      client.from("rooms").select("capacity, is_active").eq("id", parsed.data.roomId).single(),
      client.from("enrollments").select("id", { count: "exact", head: true }).eq("offering_id", parsed.data.offeringId),
      client.from("course_offerings").select("faculty_id").eq("id", parsed.data.offeringId).single(),
    ]);
    if (roomConflicts.error || offeringConflicts.error || roomResult.error || enrollmentResult.error || offeringResult.error) return errorState("Schedule constraints could not be checked.");
    if (roomConflicts.data.length) return errorState("That room already has an overlapping session.");
    if (offeringConflicts.data.length) return errorState("That class already has an overlapping session.");
    if (!roomResult.data.is_active) return errorState("The selected room is inactive.");
    if ((enrollmentResult.count ?? 0) > roomResult.data.capacity) return errorState(`Room capacity is ${roomResult.data.capacity}, below the ${enrollmentResult.count ?? 0} enrolled students.`);
    if (offeringResult.data.faculty_id) {
      const { data: facultyConflicts, error: facultyConflictError } = await client
        .from("schedules")
        .select("id, course_offerings!inner(faculty_id)")
        .eq("course_offerings.faculty_id", offeringResult.data.faculty_id)
        .lt("starts_at", endsAt.toISOString())
        .gt("ends_at", startsAt.toISOString())
        .limit(1);
      if (facultyConflictError) return errorState("Faculty availability could not be checked.");
      if (facultyConflicts.length) return errorState("The assigned faculty member already has an overlapping session.");
    }

    const { data, error } = await client.from("schedules").insert({
      created_by_profile_id: access.profileId,
      ends_at: endsAt.toISOString(),
      offering_id: parsed.data.offeringId,
      room_id: parsed.data.roomId,
      starts_at: startsAt.toISOString(),
    }).select("id").single();
    if (error) return errorState("The schedule could not be created.");
    await client.from("audit_logs").insert({ action: "schedule.created", actor_profile_id: access.profileId, entity_id: data.id, entity_type: "schedule", metadata: { actor_clerk_id: access.userId } });
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
      reported_by_profile_id: access.profileId,
      room_id: parsed.data.roomId,
      title: parsed.data.title,
    }).select("id").single();
    if (error) return errorState("The maintenance ticket could not be created.");
    await client.from("audit_logs").insert({ action: "maintenance.created", actor_profile_id: access.profileId, entity_id: data.id, entity_type: "maintenance_ticket", metadata: { actor_clerk_id: access.userId, priority: parsed.data.priority } });
    refreshOperations("/maintenance", "/classrooms");
    return { message: "Maintenance ticket opened and readiness was recalculated.", status: "success" };
  } catch {
    return errorState("Sign in with maintenance-management permission.");
  }
}

const ticketStatusSchema = z.object({
  resolutionVerified: z.boolean(),
  ticketId: z.uuid(),
  status: z.enum(maintenanceStatuses),
});

export async function updateMaintenanceStatusAction(formData: FormData) {
  const access = await requirePermission("maintenance:manage");
  const parsed = ticketStatusSchema.safeParse({
    resolutionVerified: formData.get("resolutionVerified") === "on",
    ticketId: formData.get("ticketId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;
  const client = createSupabaseAdminClient();
  const { data: ticket, error: ticketError } = await client
    .from("maintenance_tickets")
    .select("status")
    .eq("id", parsed.data.ticketId)
    .maybeSingle();
  if (ticketError || !ticket) return;
  if (!canTransitionMaintenanceTicket(ticket.status, parsed.data.status)) return;
  if (maintenanceTransitionNeedsVerification(parsed.data.status) && !parsed.data.resolutionVerified) return;

  const terminal = maintenanceTransitionNeedsVerification(parsed.data.status);
  const { data: updated, error } = await client
    .from("maintenance_tickets")
    .update({ resolved_at: terminal ? new Date().toISOString() : null, status: parsed.data.status })
    .eq("id", parsed.data.ticketId)
    .eq("status", ticket.status)
    .select("id")
    .maybeSingle();
  if (error || !updated) return;
  await client.from("audit_logs").insert({
    action: "maintenance.status_changed",
    actor_profile_id: access.profileId,
    entity_id: parsed.data.ticketId,
    entity_type: "maintenance_ticket",
    metadata: {
      actor_clerk_id: access.userId,
      from_status: ticket.status,
      resolution_verified: parsed.data.resolutionVerified,
      to_status: parsed.data.status,
    },
  });
  refreshOperations("/maintenance", "/classrooms");
}
