import "server-only";

import { DatabaseQueryError } from "@/server/database/database-query-error";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";
import { intervalsOverlap, readinessLabel, readinessScore, ticketSlaHours } from "@/features/operations/domain/operations-rules";

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export type AttendanceRow = {
  course: string;
  id: string;
  sessionDate: string;
  status: AttendanceStatus;
  studentName: string;
  studentNumber: string;
};

export type EnrollmentOption = {
  course: string;
  id: string;
  student: string;
};

export type AttendanceWorkspace = {
  absent: number;
  attendanceRate: number | null;
  enrollmentOptions: EnrollmentOption[];
  late: number;
  records: AttendanceRow[];
  todayRecorded: number;
};

export async function loadAttendanceWorkspace(): Promise<AttendanceWorkspace> {
  const client = createSupabaseAdminClient();
  const [recordsResult, enrollmentsResult] = await Promise.all([
    client.from("attendance_records").select(`
      id, session_date, status,
      enrollments (
        id,
        students (student_number, profiles (display_name)),
        course_offerings (section, courses (code, title))
      )
    `).order("session_date", { ascending: false }).limit(150),
    client.from("enrollments").select(`
      id,
      students (student_number, profiles (display_name)),
      course_offerings (section, courses (code, title))
    `).order("enrolled_at", { ascending: false }).limit(500),
  ]);
  if (recordsResult.error) throw new DatabaseQueryError("load attendance", recordsResult.error.message);
  if (enrollmentsResult.error) throw new DatabaseQueryError("load attendance enrollments", enrollmentsResult.error.message);

  const records: AttendanceRow[] = recordsResult.data.map((record) => ({
    course: `${record.enrollments.course_offerings.courses.code} · ${record.enrollments.course_offerings.section}`,
    id: record.id,
    sessionDate: record.session_date,
    status: record.status as AttendanceStatus,
    studentName: record.enrollments.students.profiles?.display_name ?? "Profile not linked",
    studentNumber: record.enrollments.students.student_number,
  }));
  const counted = records.filter((record) => record.status !== "excused");
  const attended = counted.filter((record) => record.status === "present" || record.status === "late").length;
  const today = new Date().toISOString().slice(0, 10);

  return {
    absent: records.filter((record) => record.status === "absent").length,
    attendanceRate: counted.length ? Math.round((attended / counted.length) * 1000) / 10 : null,
    enrollmentOptions: enrollmentsResult.data.map((enrollment) => ({
      course: `${enrollment.course_offerings.courses.code} · ${enrollment.course_offerings.section}`,
      id: enrollment.id,
      student: `${enrollment.students.student_number} — ${enrollment.students.profiles?.display_name ?? "Profile not linked"}`,
    })),
    late: records.filter((record) => record.status === "late").length,
    records,
    todayRecorded: records.filter((record) => record.sessionDate === today).length,
  };
}

export type ScheduleRow = {
  capacityMismatch: boolean;
  course: string;
  endsAt: string;
  enrollmentCount: number;
  faculty: string;
  hasConflict: boolean;
  id: string;
  roomCapacity: number;
  roomCode: string;
  startsAt: string;
};

export type ScheduleOption = { id: string; label: string; capacity?: number };

export type ScheduleWorkspace = {
  conflicts: number;
  offeringOptions: ScheduleOption[];
  roomOptions: ScheduleOption[];
  schedules: ScheduleRow[];
  todaySessions: number;
  utilizationPercent: number;
};

export async function loadScheduleWorkspace(): Promise<ScheduleWorkspace> {
  const client = createSupabaseAdminClient();
  const [scheduleResult, enrollmentResult, offeringsResult, roomsResult] = await Promise.all([
    client.from("schedules").select(`
      id, starts_at, ends_at,
      rooms (code, name, capacity),
      course_offerings (
        id, section, capacity,
        courses (code, title),
        faculty_members (employee_number, profiles (display_name))
      )
    `).order("starts_at", { ascending: true }).limit(250),
    client.from("enrollments").select("offering_id"),
    client.from("course_offerings").select("id, section, courses (code, title)").order("academic_year", { ascending: false }).limit(300),
    client.from("rooms").select("id, code, name, capacity").eq("is_active", true).order("code"),
  ]);
  if (scheduleResult.error) throw new DatabaseQueryError("load schedules", scheduleResult.error.message);
  if (enrollmentResult.error) throw new DatabaseQueryError("load schedule enrollments", enrollmentResult.error.message);
  if (offeringsResult.error) throw new DatabaseQueryError("load offerings", offeringsResult.error.message);
  if (roomsResult.error) throw new DatabaseQueryError("load rooms", roomsResult.error.message);

  const enrollmentCounts = new Map<string, number>();
  enrollmentResult.data.forEach(({ offering_id }) => enrollmentCounts.set(offering_id, (enrollmentCounts.get(offering_id) ?? 0) + 1));
  const baseRows = scheduleResult.data.map((schedule) => {
    const enrollmentCount = enrollmentCounts.get(schedule.course_offerings.id) ?? 0;
    return {
      capacityMismatch: enrollmentCount > schedule.rooms.capacity,
      course: `${schedule.course_offerings.courses.code} · ${schedule.course_offerings.section}`,
      endsAt: schedule.ends_at,
      enrollmentCount,
      faculty: schedule.course_offerings.faculty_members?.profiles?.display_name ?? "Faculty unassigned",
      hasConflict: false,
      id: schedule.id,
      roomCapacity: schedule.rooms.capacity,
      roomCode: schedule.rooms.code,
      startsAt: schedule.starts_at,
    };
  });
  const schedules = baseRows.map((schedule, index) => ({
    ...schedule,
    hasConflict: baseRows.some((candidate, candidateIndex) => candidateIndex !== index && candidate.roomCode === schedule.roomCode && intervalsOverlap(schedule, candidate)),
  }));
  const today = new Date().toISOString().slice(0, 10);
  const totalSeats = schedules.reduce((sum, schedule) => sum + schedule.roomCapacity, 0);
  const allocatedSeats = schedules.reduce((sum, schedule) => sum + Math.min(schedule.enrollmentCount, schedule.roomCapacity), 0);

  return {
    conflicts: schedules.filter((schedule) => schedule.hasConflict || schedule.capacityMismatch).length,
    offeringOptions: offeringsResult.data.map((offering) => ({ id: offering.id, label: `${offering.courses.code} — ${offering.courses.title} · ${offering.section}` })),
    roomOptions: roomsResult.data.map((room) => ({ capacity: room.capacity, id: room.id, label: `${room.code} — ${room.name} (${room.capacity})` })),
    schedules,
    todaySessions: schedules.filter((schedule) => schedule.startsAt.startsWith(today)).length,
    utilizationPercent: totalSeats ? Math.round((allocatedSeats / totalSeats) * 100) : 0,
  };
}

export type ClassroomRow = {
  building: string;
  capacity: number;
  code: string;
  degradedEquipment: number;
  id: string;
  kind: "classroom" | "laboratory";
  name: string;
  offlineEquipment: number;
  openTickets: number;
  readiness: "ready" | "attention" | "unavailable";
  readinessScore: number;
  totalEquipment: number;
};

export type ClassroomWorkspace = {
  attentionRooms: number;
  averageReadiness: number;
  classrooms: ClassroomRow[];
  laboratories: number;
  totalCapacity: number;
};

export async function loadClassroomWorkspace(): Promise<ClassroomWorkspace> {
  const client = createSupabaseAdminClient();
  const [roomsResult, ticketsResult] = await Promise.all([
    client.from("rooms").select("id, code, name, kind, building, capacity, is_active, equipment (id, status)").order("building").order("code"),
    client.from("maintenance_tickets").select("room_id, status").in("status", ["open", "assigned", "in_progress"]),
  ]);
  if (roomsResult.error) throw new DatabaseQueryError("load classrooms", roomsResult.error.message);
  if (ticketsResult.error) throw new DatabaseQueryError("load classroom tickets", ticketsResult.error.message);

  const ticketCounts = new Map<string, number>();
  ticketsResult.data.forEach(({ room_id }) => ticketCounts.set(room_id, (ticketCounts.get(room_id) ?? 0) + 1));
  const classrooms: ClassroomRow[] = roomsResult.data.map((room) => {
    const degradedEquipment = room.equipment.filter((item) => item.status === "degraded").length;
    const offlineEquipment = room.equipment.filter((item) => item.status === "offline").length;
    const openTickets = ticketCounts.get(room.id) ?? 0;
    const score = readinessScore({ active: room.is_active, degraded: degradedEquipment, offline: offlineEquipment, openTickets });
    return {
      building: room.building,
      capacity: room.capacity,
      code: room.code,
      degradedEquipment,
      id: room.id,
      kind: room.kind,
      name: room.name,
      offlineEquipment,
      openTickets,
      readiness: readinessLabel(score),
      readinessScore: score,
      totalEquipment: room.equipment.length,
    };
  });

  return {
    attentionRooms: classrooms.filter((room) => room.readiness !== "ready").length,
    averageReadiness: classrooms.length ? Math.round(classrooms.reduce((sum, room) => sum + room.readinessScore, 0) / classrooms.length) : 0,
    classrooms,
    laboratories: classrooms.filter((room) => room.kind === "laboratory").length,
    totalCapacity: classrooms.reduce((sum, room) => sum + room.capacity, 0),
  };
}

export type MaintenanceRow = {
  ageHours: number;
  description: string;
  equipment: string | null;
  id: string;
  isOverdue: boolean;
  priority: "low" | "medium" | "high" | "critical";
  room: string;
  status: "open" | "assigned" | "in_progress" | "resolved" | "closed";
  title: string;
};

export type MaintenanceWorkspace = {
  critical: number;
  equipmentOptions: Array<{ id: string; label: string; roomId: string }>;
  inProgress: number;
  overdue: number;
  roomOptions: ScheduleOption[];
  tickets: MaintenanceRow[];
};

export async function loadMaintenanceWorkspace(): Promise<MaintenanceWorkspace> {
  const client = createSupabaseAdminClient();
  const [ticketsResult, roomsResult, equipmentResult] = await Promise.all([
    client.from("maintenance_tickets").select("id, title, description, priority, status, opened_at, rooms (code, name), equipment (asset_tag, name)").order("opened_at", { ascending: true }).limit(250),
    client.from("rooms").select("id, code, name").order("code"),
    client.from("equipment").select("id, room_id, asset_tag, name").order("asset_tag"),
  ]);
  if (ticketsResult.error) throw new DatabaseQueryError("load maintenance", ticketsResult.error.message);
  if (roomsResult.error) throw new DatabaseQueryError("load maintenance rooms", roomsResult.error.message);
  if (equipmentResult.error) throw new DatabaseQueryError("load maintenance equipment", equipmentResult.error.message);

  const now = Date.now();
  const tickets: MaintenanceRow[] = ticketsResult.data.map((ticket) => {
    const ageHours = Math.max(0, Math.floor((now - new Date(ticket.opened_at).getTime()) / 3_600_000));
    const active = !["resolved", "closed"].includes(ticket.status);
    return {
      ageHours,
      description: ticket.description,
      equipment: ticket.equipment ? `${ticket.equipment.asset_tag} · ${ticket.equipment.name}` : null,
      id: ticket.id,
      isOverdue: active && ageHours > ticketSlaHours(ticket.priority),
      priority: ticket.priority,
      room: `${ticket.rooms.code} · ${ticket.rooms.name}`,
      status: ticket.status,
      title: ticket.title,
    };
  });

  return {
    critical: tickets.filter((ticket) => ticket.priority === "critical" && !["resolved", "closed"].includes(ticket.status)).length,
    equipmentOptions: equipmentResult.data.map((item) => ({ id: item.id, label: `${item.asset_tag} — ${item.name}`, roomId: item.room_id })),
    inProgress: tickets.filter((ticket) => ticket.status === "in_progress").length,
    overdue: tickets.filter((ticket) => ticket.isOverdue).length,
    roomOptions: roomsResult.data.map((room) => ({ id: room.id, label: `${room.code} — ${room.name}` })),
    tickets,
  };
}

export type CampusDashboard = {
  activeAgentRuns: number;
  attendanceRate: number | null;
  attentionRooms: number;
  openTickets: number;
  scheduleConflicts: number;
  students: number;
  todaySessions: number;
};

export async function loadCampusDashboard(): Promise<CampusDashboard> {
  const client = createSupabaseAdminClient();
  const [attendance, schedules, classrooms, maintenance, studentsResult, runsResult] = await Promise.all([
    loadAttendanceWorkspace(), loadScheduleWorkspace(), loadClassroomWorkspace(), loadMaintenanceWorkspace(),
    client.from("students").select("id", { count: "exact", head: true }),
    client.from("agent_runs").select("id", { count: "exact", head: true }).in("status", ["queued", "running"]),
  ]);
  if (studentsResult.error) throw new DatabaseQueryError("count students", studentsResult.error.message);
  if (runsResult.error) throw new DatabaseQueryError("count agent runs", runsResult.error.message);
  return {
    activeAgentRuns: runsResult.count ?? 0,
    attendanceRate: attendance.attendanceRate,
    attentionRooms: classrooms.attentionRooms,
    openTickets: maintenance.tickets.filter((ticket) => !["resolved", "closed"].includes(ticket.status)).length,
    scheduleConflicts: schedules.conflicts,
    students: studentsResult.count ?? 0,
    todaySessions: schedules.todaySessions,
  };
}
