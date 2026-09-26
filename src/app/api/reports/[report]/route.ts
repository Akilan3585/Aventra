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
    const { data, error } = await client.from("attendance_records").select("session_date, session, status, remarks, recorded_at, updated_at, students (student_number, semester, departments (code), profiles (display_name))").order("session_date", { ascending: false }).order("session");
    if (error) return NextResponse.json({ error: "Report query failed." }, { status: 500 });
    rows = data.map((item) => ({ date: item.session_date, session: item.session, student_number: item.students.student_number, student: item.students.profiles?.display_name ?? "", department: item.students.departments.code, semester: item.students.semester, status: item.status, remarks: item.remarks ?? "", recorded_at: item.recorded_at, updated_at: item.updated_at }));
  } else return NextResponse.json({ error: "Unknown report." }, { status: 404 });
  return new NextResponse(toCsv(rows), { headers: { "Content-Disposition": `attachment; filename="aventra-${report}-${new Date().toISOString().slice(0, 10)}.csv"`, "Content-Type": "text/csv; charset=utf-8", "X-Content-Type-Options": "nosniff" } });
}
