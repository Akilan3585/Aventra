import "server-only";

type AttendanceEmail = {
  alertId: string;
  attendanceRate: number;
  courseCode: string;
  courseTitle: string;
  recipientEmail: string;
  studentName: string;
  threshold: number;
};

export type EmailDeliveryResult =
  | { status: "not-configured" }
  | { messageId: string; status: "sent" };

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

export async function sendAttendanceAlertEmail(input: AttendanceEmail): Promise<EmailDeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ATTENDANCE_ALERT_FROM_EMAIL;
  if (!apiKey || !from || apiKey.includes("REPLACE_ME") || from.includes("your-campus.edu")) {
    return { status: "not-configured" };
  }

  const workspaceUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://aventra-ai.vercel.app"}/student-workspace`;
  const studentName = escapeHtml(input.studentName);
  const course = escapeHtml(`${input.courseCode} · ${input.courseTitle}`);
  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from,
      html: `
        <div style="background:#f8fafc;padding:32px 16px;font-family:Arial,sans-serif;color:#0f172a">
          <div style="margin:0 auto;max-width:560px;border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;padding:32px">
            <p style="margin:0 0 24px;color:#2563eb;font-size:14px;font-weight:700">Aventra AI · Attendance support</p>
            <h1 style="margin:0 0 16px;font-size:26px;line-height:1.25">Your attendance needs attention</h1>
            <p style="margin:0 0 16px;line-height:1.65">Hello ${studentName},</p>
            <p style="margin:0 0 16px;line-height:1.65">Your attendance for <strong>${course}</strong> is currently <strong>${input.attendanceRate}%</strong>, which is below the ${input.threshold}% requirement.</p>
            <p style="margin:0 0 24px;line-height:1.65">Please review your attendance and contact your faculty member or student-support team if you need help.</p>
            <a href="${escapeHtml(workspaceUrl)}" style="display:inline-block;border-radius:10px;background:#0f172a;color:#ffffff;padding:12px 18px;text-decoration:none;font-weight:700">Open student workspace</a>
          </div>
        </div>`,
      reply_to: process.env.ATTENDANCE_ALERT_REPLY_TO || undefined,
      subject: `Attendance alert: ${input.courseCode} is below ${input.threshold}%`,
      to: [input.recipientEmail],
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `attendance-alert-${input.alertId}`,
    },
    method: "POST",
  });

  const payload = await response.json().catch(() => null) as { id?: string; message?: string } | null;
  if (!response.ok || !payload?.id) {
    throw new Error(payload?.message ?? `Resend returned HTTP ${response.status}.`);
  }

  return { messageId: payload.id, status: "sent" };
}
