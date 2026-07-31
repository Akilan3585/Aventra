import { NextResponse } from "next/server";

import { requirePermission } from "@/server/auth/campus-access";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";

export const runtime = "nodejs";

function csvValue(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "No records\r\n";
  const columns = Object.keys(rows[0]);
  return [columns.map(csvValue).join(","), ...rows.map((row) => columns.map((column) => csvValue(row[column])).join(","))].join("\r\n");
}

export async function GET(_: Request, { params }: { params: Promise<{ report: string }> }) {
  try { await requirePermission("reports:read"); } catch { return NextResponse.json({ error: "Permission denied." }, { status: 403 }); }
  const { report } = await params;
  const client = createSupabaseAdminClient();
  let rows: Record<string, unknown>[] = [];
  if (report === "students") {
    const { data, error } = await client.from("students").select("student_number, admission_year, semester, departments (code, name), profiles (display_name, email)").order("student_number");
    if (error) return NextResponse.json({ error: "Report query failed." }, { status: 500 });
    rows = data.map((item) => ({ student_number: item.student_number, name: item.profiles?.display_name ?? "", email: item.profiles?.email ?? "", department_code: item.departments.code, department: item.departments.name, admission_year: item.admission_year, semester: item.semester }));
  } else if (report === "attendance") {
    const { data, error } = await client.from("attendance_records").select("session_date, status, enrollments (students (student_number), course_offerings (section, courses (code, title)))").order("session_date", { ascending: false });
    if (error) return NextResponse.json({ error: "Report query failed." }, { status: 500 });
    rows = data.map((item) => ({ date: item.session_date, student_number: item.enrollments.students.student_number, course_code: item.enrollments.course_offerings.courses.code, course: item.enrollments.course_offerings.courses.title, section: item.enrollments.course_offerings.section, status: item.status }));
  } else if (report === "facilities") {
    const { data, error } = await client.from("rooms").select("code, name, kind, building, floor, capacity, is_active").order("code");
    if (error) return NextResponse.json({ error: "Report query failed." }, { status: 500 });
    rows = data;
  } else if (report === "maintenance") {
    const { data, error } = await client.from("maintenance_tickets").select("title, priority, status, opened_at, resolved_at, rooms (code, name), equipment (asset_tag)").order("opened_at", { ascending: false });
    if (error) return NextResponse.json({ error: "Report query failed." }, { status: 500 });
    rows = data.map((item) => ({ title: item.title, priority: item.priority, status: item.status, room_code: item.rooms.code, room: item.rooms.name, asset_tag: item.equipment?.asset_tag ?? "", opened_at: item.opened_at, resolved_at: item.resolved_at ?? "" }));
  } else return NextResponse.json({ error: "Unknown report." }, { status: 404 });
  return new NextResponse(toCsv(rows), { headers: { "Content-Disposition": `attachment; filename="aventra-${report}-${new Date().toISOString().slice(0, 10)}.csv"`, "Content-Type": "text/csv; charset=utf-8", "X-Content-Type-Options": "nosniff" } });
}
