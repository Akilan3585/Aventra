import "server-only";

import type { AssistantReport, AssistantUseCaseId } from "@/ai/contracts/assistant-report";
import {
  attendanceTrend,
  departmentAttendance,
  rangeDates,
  statusBreakdown,
  studentsBelowThreshold,
  trendDelta,
} from "@/features/analytics/domain/analytics-rules";
import { loadAnalyticsDataset } from "@/features/analytics/infrastructure/analytics.repository";
import { loadAssignmentsWorkspace } from "@/features/academics/infrastructure/academic-workflows.repository";
import { attendanceStatusLabels, calculateAttendanceRate } from "@/features/attendance/domain/attendance-rules";
import { campusPolicies } from "@/features/operations/domain/operations-rules";
import { loadScheduleWorkspace } from "@/features/operations/infrastructure/campus-operations.repository";
import { platformCatalog, platformReadiness, summarizeStudentPlatforms } from "@/features/performance/domain/platform-performance";
import { loadPlatformPerformanceWorkspace } from "@/features/performance/infrastructure/platform-performance.repository";
import { listStudentDirectory, type StudentDirectoryItem } from "@/features/students/infrastructure/student.repository";
import type { Role } from "@/server/auth/permissions";

/**
 * Read-only reports for the faculty assistant. Every report is scoped on the
 * server: faculty see only students and classes they are assigned to.
 * Nothing here writes, sends, or changes a record.
 */

export type AssistantScope = { profileId: string | null; role: Role };

const threshold = campusPolicies.attendanceWarningPercent;
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const facultyId = (scope: AssistantScope) => (scope.role === "faculty" ? scope.profileId ?? "" : undefined);
const time = (iso: string) => new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(iso));
const shortDate = (iso: string) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));

async function attendanceWindow(scope: AssistantScope, days: number) {
  const dates = rangeDates(today(), days);
  const dataset = await loadAnalyticsDataset({ facultyProfileId: facultyId(scope), from: dates[0], to: dates[dates.length - 1] });
  return { dates, ...dataset };
}

function matchStudents(students: StudentDirectoryItem[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return students.filter((student) => student.displayName.toLowerCase().includes(needle) || student.studentNumber.toLowerCase().includes(needle));
}

function notFound(title: string, query: string): AssistantReport {
  return {
    generatedAt: now(),
    sections: [],
    summary: query.trim() ? `No student in your scope matches "${query.trim()}". Check the spelling or use the register number.` : "Enter a student name or register number.",
    title,
  };
}

async function dailyBriefing(scope: AssistantScope): Promise<AssistantReport> {
  const [schedule, window] = await Promise.all([loadScheduleWorkspace(facultyId(scope)), attendanceWindow(scope, 30)]);
  const date = today();
  const classes = schedule.schedules.filter((row) => row.startsAt.startsWith(date)).sort((left, right) => left.startsAt.localeCompare(right.startsAt));
  const markedToday = window.records.filter((record) => record.sessionDate === date);
  const atRisk = studentsBelowThreshold(window.records, threshold);
  const lines = [
    `${classes.length} class session${classes.length === 1 ? "" : "s"} scheduled today.`,
    `${markedToday.length} attendance mark${markedToday.length === 1 ? "" : "s"} recorded today${markedToday.length ? `, ${calculateAttendanceRate(markedToday.map((record) => record.status)) ?? "—"}% attended` : ""}.`,
    `${atRisk.length} student${atRisk.length === 1 ? " is" : "s are"} below the ${threshold}% attendance policy over the last 30 days.`,
  ];
  if (schedule.conflicts) lines.push(`${schedule.conflicts} timetable conflict${schedule.conflicts === 1 ? "" : "s"} need review.`);
  return {
    generatedAt: now(),
    sections: [
      { heading: "At a glance", lines },
      classes.length
        ? { heading: "Today's classes", table: { columns: ["Time", "Course", "Room", "Students"], rows: classes.map((row) => [`${time(row.startsAt)}–${time(row.endsAt)}`, row.course, row.roomCode, row.enrollmentCount]) } }
        : { heading: "Today's classes", lines: ["No classes are scheduled for today."] },
      ...(atRisk.length ? [{ heading: "Lowest attendance", table: { columns: ["Student", "Register no", "Rate", "Absences"], rows: atRisk.slice(0, 5).map((student) => [student.studentName, student.studentNumber, `${student.rate}%`, student.absences]) } }] : []),
    ],
    summary: lines[0] + " " + lines[2],
    title: "Daily briefing",
  };
}

async function atRiskStudents(scope: AssistantScope): Promise<AssistantReport> {
  const window = await attendanceWindow(scope, 30);
  const atRisk = studentsBelowThreshold(window.records, threshold);
  return {
    generatedAt: now(),
    sections: atRisk.length
      ? [{ heading: `Below ${threshold}% in the last 30 days`, table: { columns: ["Student", "Register no", "Dept", "Sessions", "Absences", "Rate"], rows: atRisk.map((student) => [student.studentName, student.studentNumber, student.department, student.sessions, student.absences, `${student.rate}%`]) } }]
      : [{ heading: "Result", lines: [window.records.length ? "Every student with marks is at or above the policy." : "No attendance has been recorded in the last 30 days."] }],
    summary: atRisk.length
      ? `${atRisk.length} student${atRisk.length === 1 ? " is" : "s are"} below ${threshold}%. ${atRisk.filter((student) => student.rate < campusPolicies.attendanceEmailAlertPercent).length} of them are also below the ${campusPolicies.attendanceEmailAlertPercent}% email-alert level.`
      : "No student is below the attendance policy.",
    title: "At-risk students",
  };
}

async function attendanceSummary(scope: AssistantScope): Promise<AssistantReport> {
  const window = await attendanceWindow(scope, 7);
  const trend = attendanceTrend(window.records, window.dates);
  const rate = calculateAttendanceRate(window.records.map((record) => record.status));
  const delta = trendDelta(trend);
  return {
    generatedAt: now(),
    sections: [
      { heading: "Daily rate", table: { columns: ["Date", "Marks", "Rate"], rows: trend.map((point) => [shortDate(point.date), point.marked, point.rate === null ? "—" : `${point.rate}%`]) } },
      { heading: "Status breakdown", table: { columns: ["Status", "Count"], rows: statusBreakdown(window.records).filter((item) => item.count).map((item) => [attendanceStatusLabels[item.status], item.count]) } },
      { heading: "Departments", table: { columns: ["Department", "Students", "Rate"], rows: departmentAttendance(window.records).map((item) => [item.department, item.students, item.rate === null ? "—" : `${item.rate}%`]) } },
    ],
    summary: rate === null
      ? "No attendance was recorded in the last 7 days."
      : `Attendance over the last 7 days is ${rate}% across ${window.records.length} marks${delta === null ? "" : `, ${delta >= 0 ? "up" : "down"} ${Math.abs(delta)} points from the first half of the week`}.`,
    title: "Attendance summary (7 days)",
  };
}

async function studentLookup(scope: AssistantScope, query: string): Promise<AssistantReport> {
  const [students, window, platforms] = await Promise.all([
    listStudentDirectory(facultyId(scope)),
    attendanceWindow(scope, 30),
    loadPlatformPerformanceWorkspace(),
  ]);
  const matches = matchStudents(students, query);
  if (!matches.length) return notFound("Student lookup", query);
  const student = matches[0];
  const recent = window.records.filter((record) => record.studentId === student.id);
  const absences = recent.filter((record) => record.status === "absent").map((record) => shortDate(record.sessionDate));
  const profiles = platforms.profiles.filter((item) => item.student_id === student.id);
  const coding = summarizeStudentPlatforms(profiles.map((item) => ({ platform: item.platform, score: Number(item.score) })));

  return {
    generatedAt: now(),
    sections: [
      { heading: "Profile", lines: [
        `${student.displayName} · ${student.studentNumber} · ${student.departmentCode} · Semester ${student.semester}`,
        `Overall attendance: ${student.attendanceRate === null ? "no records" : `${student.attendanceRate}%`}. Last 30 days: ${calculateAttendanceRate(recent.map((record) => record.status)) ?? "no records"}${recent.length ? "%" : ""} over ${recent.length} marks.`,
        `Recent absences: ${absences.length ? absences.join(", ") : "none in the last 30 days"}.`,
        `Latest CGPA: ${student.latestCgpa ?? "not published"}. Internal marks average: ${student.academicAverage === null ? "no marks" : `${student.academicAverage}%`}.`,
        `Risk level: ${student.riskLevel.replace("-", " ")}${student.reasons.length ? ` (${student.reasons.join("; ")})` : ""}.`,
      ] },
      profiles.length
        ? { heading: `Coding profiles · composite readiness ${coding.compositeReadiness ?? 0}%`, table: { columns: ["Platform", "Handle", "Score", "Readiness"], rows: profiles.map((item) => [platformCatalog[item.platform].label, `@${item.handle}`, Number(item.score), `${platformReadiness(item.platform, Number(item.score))}%`]) } }
        : { heading: "Coding profiles", lines: ["No coding profile linked yet."] },
      ...(matches.length > 1 ? [{ heading: "Other matches", lines: matches.slice(1, 6).map((item) => `${item.displayName} · ${item.studentNumber}`) }] : []),
    ],
    summary: `${student.displayName} has ${student.attendanceRate === null ? "no attendance records yet" : `${student.attendanceRate}% overall attendance`} and is rated ${student.riskLevel.replace("-", " ")} risk.`,
    title: `Student: ${student.displayName}`,
  };
}

async function gradingQueue(scope: AssistantScope): Promise<AssistantReport> {
  const workspace = await loadAssignmentsWorkspace(scope.role, scope.profileId);
  const pending = workspace.assignments.flatMap((assignment) => assignment.submissions
    .filter((submission) => submission.submitted_at && !submission.graded_at)
    .map((submission) => [
      assignment.title,
      `${assignment.course_offerings.courses.code} ${assignment.course_offerings.section}`,
      submission.enrollments.students.profiles?.display_name ?? submission.enrollments.students.student_number,
      shortDate(submission.submitted_at!),
    ] as (string | number)[]));
  const weekAhead = new Date(Date.now() + 7 * 86_400_000).toISOString();
  const dueSoon = workspace.assignments.filter((assignment) => assignment.status !== "draft" && assignment.due_at && assignment.due_at >= now() && assignment.due_at <= weekAhead);
  return {
    generatedAt: now(),
    sections: [
      pending.length ? { heading: "Waiting for grading", table: { columns: ["Assignment", "Class", "Student", "Submitted"], rows: pending } } : { heading: "Waiting for grading", lines: ["Nothing is waiting to be graded."] },
      dueSoon.length ? { heading: "Due in the next 7 days", table: { columns: ["Assignment", "Class", "Due", "Submitted"], rows: dueSoon.map((assignment) => [assignment.title, `${assignment.course_offerings.courses.code} ${assignment.course_offerings.section}`, shortDate(assignment.due_at!), assignment.submissions.filter((submission) => submission.submitted_at).length]) } } : { heading: "Due in the next 7 days", lines: ["No published assignment is due this week."] },
    ],
    summary: `${pending.length} submission${pending.length === 1 ? "" : "s"} waiting for grading and ${dueSoon.length} assignment${dueSoon.length === 1 ? "" : "s"} due this week.`,
    title: "Grading queue",
  };
}

async function codingLeaders(scope: AssistantScope): Promise<AssistantReport> {
  const [students, platforms] = await Promise.all([listStudentDirectory(facultyId(scope)), loadPlatformPerformanceWorkspace()]);
  const inScope = new Map(students.map((student) => [student.id, student]));
  const byStudent = new Map<string, typeof platforms.profiles>();
  for (const profile of platforms.profiles) if (inScope.has(profile.student_id)) byStudent.set(profile.student_id, [...(byStudent.get(profile.student_id) ?? []), profile]);
  const ranked = [...byStudent.entries()]
    .map(([studentId, records]) => ({ student: inScope.get(studentId)!, summary: summarizeStudentPlatforms(records.map((item) => ({ platform: item.platform, score: Number(item.score) }))) }))
    .sort((left, right) => (right.summary.compositeReadiness ?? 0) - (left.summary.compositeReadiness ?? 0));
  return {
    generatedAt: now(),
    sections: ranked.length
      ? [{ heading: "Ranked by composite readiness", table: { columns: ["#", "Student", "Register no", "Platforms", "Readiness", "Strongest"], rows: ranked.slice(0, 15).map((row, index) => [index + 1, row.student.displayName, row.student.studentNumber, row.summary.linkedPlatforms, `${row.summary.compositeReadiness ?? 0}%`, row.summary.strongest ? platformCatalog[row.summary.strongest.platform].label : "—"]) } }]
      : [{ heading: "Result", lines: ["No student in your scope has linked a coding profile yet. Students add them from My coding profiles in their workspace."] }],
    summary: ranked.length ? `${ranked.length} of ${students.length} students have linked coding profiles.` : "No coding profiles are linked yet.",
    title: "Coding leaders",
  };
}

async function draftAttendanceMessage(scope: AssistantScope, query: string): Promise<AssistantReport> {
  const [students, window] = await Promise.all([listStudentDirectory(facultyId(scope)), attendanceWindow(scope, 30)]);
  const student = matchStudents(students, query)[0];
  if (!student) return notFound("Draft attendance message", query);
  const recent = window.records.filter((record) => record.studentId === student.id);
  const recentRate = calculateAttendanceRate(recent.map((record) => record.status));
  const absences = recent.filter((record) => record.status === "absent").map((record) => shortDate(record.sessionDate));
  const rateText = student.attendanceRate === null ? "not yet recorded" : `${student.attendanceRate}%`;
  const below = student.attendanceRate !== null && student.attendanceRate < threshold;
  const draft = [
    `Dear ${student.displayName},`,
    "",
    below
      ? `Your overall attendance is ${rateText}, which is below the ${threshold}% required by the college.`
      : `Your overall attendance is ${rateText}. I am writing to check in on your recent attendance.`,
    absences.length ? `You were marked absent on ${absences.join(", ")} in the last 30 days.` : "",
    recentRate !== null ? `Your attendance over the last 30 days is ${recentRate}%.` : "",
    "",
    "Please meet me during office hours this week so we can discuss any difficulties and plan how to catch up. If you had a valid reason for these absences, bring the supporting documents.",
    "",
    "Regards,",
  ].filter((line, index, lines) => line !== "" || lines[index - 1] !== "").join("\n");
  return {
    generatedAt: now(),
    sections: [
      { heading: "Facts used", lines: [`Register no ${student.studentNumber}, ${student.departmentCode}, semester ${student.semester}.`, `Overall attendance ${rateText}; ${absences.length} absence${absences.length === 1 ? "" : "s"} in the last 30 days.`] },
      { draft, heading: "Draft message (not sent)" },
    ],
    summary: `Draft prepared for ${student.displayName}. Review and edit it before sending it yourself; the assistant never sends messages.`,
    title: "Draft attendance message",
  };
}

export async function buildAssistantReport(useCase: AssistantUseCaseId, scope: AssistantScope, input = ""): Promise<AssistantReport> {
  switch (useCase) {
    case "daily-briefing": return dailyBriefing(scope);
    case "at-risk-students": return atRiskStudents(scope);
    case "attendance-summary": return attendanceSummary(scope);
    case "student-lookup": return studentLookup(scope, input);
    case "grading-queue": return gradingQueue(scope);
    case "coding-leaders": return codingLeaders(scope);
    case "draft-attendance-message": return draftAttendanceMessage(scope, input);
  }
}
