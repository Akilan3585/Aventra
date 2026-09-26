import "server-only";

import { calculateAttendanceRate, isAttendanceStatus, isBelowAttendanceThreshold } from "@/features/attendance/domain/attendance-rules";
import { campusPolicies } from "@/features/operations/domain/operations-rules";
import { sendAttendanceAlertEmail } from "@/server/email/resend";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";

export type AttendanceAlertOutcome =
  | "already-sent"
  | "failed"
  | "not-required"
  | "queued"
  | "recipient-missing"
  | "sent";

const alertContext = "Overall attendance";

/**
 * Evaluates a student's overall attendance after a save. Opens (and emails) one
 * alert per student while the rate is below the policy, and resolves it once
 * the rate recovers.
 */
export async function evaluateAttendanceEmailAlert(studentId: string): Promise<AttendanceAlertOutcome> {
  const client = createSupabaseAdminClient();
  const threshold = campusPolicies.attendanceEmailAlertPercent;
  const [recordsResult, studentResult] = await Promise.all([
    client.from("attendance_records").select("status").eq("student_id", studentId),
    client.from("students").select("id, student_number, profiles (id, display_name, email)").eq("id", studentId).maybeSingle(),
  ]);

  if (recordsResult.error || studentResult.error || !studentResult.data) return "failed";
  const rate = calculateAttendanceRate(recordsResult.data.map((record) => record.status).filter(isAttendanceStatus));

  if (!isBelowAttendanceThreshold(rate, threshold)) {
    const { error } = await client
      .from("attendance_alerts")
      .update({ resolved_at: new Date().toISOString(), observed_percent: rate ?? 0 })
      .eq("student_id", studentId)
      .is("resolved_at", null);
    return error ? "failed" : "not-required";
  }

  const profile = studentResult.data.profiles;
  if (!profile?.id || !profile.email) return "recipient-missing";

  let { data: alert, error: alertError } = await client.from("attendance_alerts").insert({
    observed_percent: rate,
    recipient_profile_id: profile.id,
    student_id: studentId,
    threshold_percent: threshold,
  }).select("id, notification_id, status").single();

  if (alertError?.code === "23505") {
    const existing = await client.from("attendance_alerts")
      .select("id, notification_id, status")
      .eq("student_id", studentId)
      .is("resolved_at", null)
      .maybeSingle();
    alert = existing.data;
    alertError = existing.error;
  }

  if (alertError || !alert) return "failed";
  if (alert.status === "sent") return "already-sent";
  if (alert.status === "failed") return "failed";

  let notificationId = alert.notification_id;
  if (!notificationId) {
    const subject = `Attendance alert: ${alertContext} is below ${threshold}%`;
    const body = `Your overall attendance is ${rate}%, below the ${threshold}% requirement. Please contact your faculty member or student-support team.`;
    const notification = await client.from("notifications").insert({
      body,
      channel: "email",
      recipient_profile_id: profile.id,
      subject,
    }).select("id").single();
    if (notification.error) return "failed";
    notificationId = notification.data.id;
    const linked = await client.from("attendance_alerts").update({ notification_id: notificationId }).eq("id", alert.id);
    if (linked.error) return "failed";
  }

  try {
    const delivery = await sendAttendanceAlertEmail({
      alertId: alert.id,
      attendanceRate: rate,
      context: alertContext,
      recipientEmail: profile.email,
      studentName: profile.display_name,
      threshold,
    });
    if (delivery.status === "not-configured") return "queued";

    const sentAt = new Date().toISOString();
    const [alertUpdate, notificationUpdate] = await Promise.all([
      client.from("attendance_alerts").update({ last_attempted_at: sentAt, provider_message_id: delivery.messageId, sent_at: sentAt, status: "sent" }).eq("id", alert.id),
      client.from("notifications").update({ sent_at: sentAt, status: "sent" }).eq("id", notificationId),
    ]);
    return alertUpdate.error || notificationUpdate.error ? "failed" : "sent";
  } catch {
    const attemptedAt = new Date().toISOString();
    await Promise.all([
      client.from("attendance_alerts").update({ last_attempted_at: attemptedAt, status: "failed" }).eq("id", alert.id),
      client.from("notifications").update({ status: "failed" }).eq("id", notificationId),
    ]);
    return "failed";
  }
}
