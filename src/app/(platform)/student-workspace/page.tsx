import { ArrowRight, Bell, BookOpen, CalendarDays, CheckCircle2, Clock3, GraduationCap, TrendingUp } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ProgressBar, StatusPill } from "@/components/operations/operations-ui";
import { Card } from "@/design-system/primitives/card";
import { attendanceStatusLabels } from "@/features/attendance/domain/attendance-rules";
import { listPlatformSnapshotsForStudent, studentIdForProfile, type StudentPlatformSnapshot } from "@/features/performance/infrastructure/platform-performance.repository";
import { MyCodingProfiles } from "@/features/performance/presentation/my-coding-profiles";
import { loadStudentRoleWorkspace } from "@/features/workspaces/infrastructure/role-workspace.repository";
import { getCampusAccess } from "@/server/auth/campus-access";

export const dynamic = "force-dynamic";

const time = (value: string) => new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(new Date(value));

export default async function StudentWorkspacePage() {
  const access = await getCampusAccess();
  if (!access) redirect("/student/sign-in");
  if (access.role !== "student") redirect("/access-denied?reason=role-mismatch&portal=student");

  const data = await loadStudentRoleWorkspace(access.userId);

  if (!data.linked) return <section className="mx-auto max-w-4xl py-8 sm:py-14">
    <div className="rounded-[28px] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-violet-50 p-7 sm:p-10">
      <span className="grid size-12 place-items-center rounded-2xl bg-blue-600 text-white"><GraduationCap className="size-5" /></span>
      <p className="mt-7 text-sm font-semibold text-blue-700">Welcome to Aventra</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">Your student workspace is almost ready, {data.name}.</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">Your account is active. Ask your college administrator to link it to your student number; your timetable, attendance, courses, and results will then appear here automatically.</p>
      <div className="mt-7 flex flex-wrap gap-3"><Link className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white" href="/profile">Check my profile</Link><Link className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700" href="/notifications">View messages</Link></div>
    </div>
  </section>;

  let codingProfiles: StudentPlatformSnapshot[] = [];
  try {
    const studentId = access.profileId ? await studentIdForProfile(access.profileId) : null;
    if (studentId) codingProfiles = await listPlatformSnapshotsForStudent(studentId);
  } catch {
    codingProfiles = [];
  }

  const attendance = data.attendanceRate ?? 0;
  return <section className="space-y-6">
    <div className="overflow-hidden rounded-[28px] bg-slate-950 p-6 text-white sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-blue-300">Your day at a glance</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Hi {data.name}, you&apos;re ready for today.</h1><p className="mt-3 text-sm text-slate-300">{data.studentNumber} · Semester {data.semester} · {data.department}</p></div><Link className="inline-flex items-center gap-2 self-start rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950" href="/notifications">Messages <ArrowRight className="size-4" /></Link></div>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[{ icon: CalendarDays, label: "Classes today", value: data.todayClasses.length, detail: "Your personal timetable" }, { icon: BookOpen, label: "My courses", value: data.courses.length, detail: "Current enrollments" }, { icon: CheckCircle2, label: "Attendance", value: data.attendanceRate === null ? "—" : `${data.attendanceRate}%`, detail: "Across recorded classes" }, { icon: TrendingUp, label: "Current CGPA", value: data.latestResult?.cgpa ?? "—", detail: data.latestResult ? `${data.latestResult.term} ${data.latestResult.academic_year}` : "Not published yet" }].map(({ detail, icon: Icon, label, value }) => <Card className="p-5" key={label}><span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><Icon className="size-4.5" /></span><p className="mt-4 text-sm font-medium text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></Card>)}
    </div>

    <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
      <Card className="overflow-hidden"><div className="border-b border-slate-100 p-5 sm:px-6"><h2 className="font-semibold text-slate-950">Today&apos;s classes</h2><p className="mt-1 text-sm text-slate-500">Only the sessions relevant to you.</p></div><div className="divide-y divide-slate-100">{data.todayClasses.length ? data.todayClasses.map((session) => <div className="flex items-center gap-4 p-5 sm:px-6" key={session.id}><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700"><Clock3 className="size-5" /></span><div className="min-w-0 flex-1"><p className="font-semibold text-slate-900">{session.course}</p><p className="mt-1 text-sm text-slate-500">{time(session.startsAt)}–{time(session.endsAt)} · {session.room}</p></div><StatusPill tone="good">scheduled</StatusPill></div>) : <div className="p-8 text-center"><CalendarDays className="mx-auto size-7 text-slate-300" /><p className="mt-3 font-semibold text-slate-800">No classes today</p><p className="mt-1 text-sm text-slate-500">Use the time to review your courses or messages.</p></div>}</div></Card>

      <Card className="p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-950">Attendance health</h2><p className="mt-1 text-sm text-slate-500">Overall rate and your latest sessions.</p></div><span className="text-2xl font-semibold text-slate-950">{data.attendanceRate === null ? "—" : `${data.attendanceRate}%`}</span></div><div className="mt-6"><ProgressBar tone={attendance >= 75 ? "emerald" : "amber"} value={attendance} /></div><div className="mt-6 space-y-3">{data.recentAttendance.length ? data.recentAttendance.map((record) => <div className="flex items-center justify-between gap-3" key={record.id}><p className="truncate text-sm font-medium text-slate-700"><span className="font-mono">{record.date}</span> · {record.session}</p><StatusPill tone={record.status === "absent" ? "critical" : record.status === "late" ? "warning" : record.status === "present" || record.status === "od" ? "good" : "neutral"}>{record.status ? attendanceStatusLabels[record.status] : "unknown"}</StatusPill></div>) : <p className="text-sm text-slate-500">No attendance has been recorded yet.</p>}</div></Card>
    </div>

    <MyCodingProfiles snapshots={codingProfiles} />

    <div className="grid gap-6 lg:grid-cols-2"><Card className="overflow-hidden"><div className="border-b border-slate-100 p-5 sm:px-6"><h2 className="font-semibold text-slate-950">My courses</h2><p className="mt-1 text-sm text-slate-500">The people and subjects connected to you.</p></div><div className="divide-y divide-slate-100">{data.courses.map((course) => <div className="flex items-center gap-4 p-5 sm:px-6" key={course.code}><span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700">{course.code.slice(0, 2)}</span><div><p className="text-sm font-semibold text-slate-900">{course.title}</p><p className="mt-1 text-xs text-slate-500">{course.code} · {course.faculty}</p></div></div>)}</div></Card><Card className="overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 p-5 sm:px-6"><div><h2 className="font-semibold text-slate-950">College messages</h2><p className="mt-1 text-sm text-slate-500">Important updates without ERP noise.</p></div><Bell className="size-5 text-blue-600" /></div><div className="divide-y divide-slate-100">{data.messages.length ? data.messages.map((message) => <Link className="block p-5 transition hover:bg-slate-50 sm:px-6" href="/notifications" key={message.id}><p className="text-sm font-semibold text-slate-900">{message.subject}</p><p className="mt-1 text-xs text-slate-500">{new Date(message.createdAt).toLocaleDateString("en-IN")}</p></Link>) : <p className="p-8 text-center text-sm text-slate-500">You are all caught up.</p>}</div></Card></div>
  </section>;
}
