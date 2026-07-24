-- Aventra AI initial normalized campus schema.
-- Supabase SQL migrations are the sole schema authority for this application.

create type public.room_kind as enum ('classroom', 'laboratory');
create type public.equipment_status as enum ('operational', 'degraded', 'offline', 'retired');
create type public.ticket_priority as enum ('low', 'medium', 'high', 'critical');
create type public.ticket_status as enum ('open', 'assigned', 'in_progress', 'resolved', 'closed');
create type public.notification_status as enum ('queued', 'sent', 'failed', 'read');
create type public.agent_run_status as enum ('queued', 'running', 'completed', 'failed', 'cancelled');

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id text primary key,
  display_name text not null,
  email text not null unique,
  campus_role text not null check (campus_role in ('super-admin', 'admin', 'faculty', 'maintenance-staff', 'student')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  profile_id text unique references public.profiles(id) on delete set null,
  department_id uuid not null references public.departments(id) on delete restrict,
  student_number text not null unique,
  admission_year integer not null check (admission_year between 2000 and 2200),
  semester smallint not null check (semester between 1 and 16),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.faculty_members (
  id uuid primary key default gen_random_uuid(),
  profile_id text unique references public.profiles(id) on delete set null,
  department_id uuid not null references public.departments(id) on delete restrict,
  employee_number text not null unique,
  designation text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id) on delete restrict,
  code text not null unique,
  title text not null,
  credit_hours numeric(3, 1) not null check (credit_hours > 0 and credit_hours <= 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.course_offerings (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete restrict,
  faculty_id uuid references public.faculty_members(id) on delete set null,
  academic_year integer not null check (academic_year between 2000 and 2200),
  term text not null check (term in ('spring', 'summer', 'fall', 'winter')),
  section text not null,
  capacity integer not null check (capacity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, academic_year, term, section)
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  offering_id uuid not null references public.course_offerings(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  unique (student_id, offering_id)
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  kind public.room_kind not null,
  building text not null,
  floor text,
  capacity integer not null check (capacity > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete restrict,
  asset_tag text not null unique,
  name text not null,
  category text not null,
  status public.equipment_status not null default 'operational',
  installed_at date,
  last_serviced_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.course_offerings(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_by_profile_id text references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index schedules_room_time_idx on public.schedules (room_id, starts_at, ends_at);
create index schedules_offering_time_idx on public.schedules (offering_id, starts_at);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  session_date date not null,
  status text not null check (status in ('present', 'absent', 'late', 'excused')),
  recorded_by_profile_id text references public.profiles(id) on delete set null,
  recorded_at timestamptz not null default now(),
  unique (enrollment_id, session_date)
);

create index attendance_records_session_idx on public.attendance_records (session_date, status);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.course_offerings(id) on delete cascade,
  title text not null,
  maximum_marks numeric(6, 2) not null check (maximum_marks > 0),
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  submitted_at timestamptz,
  score numeric(6, 2) check (score >= 0),
  feedback text,
  graded_by_profile_id text references public.profiles(id) on delete set null,
  graded_at timestamptz,
  unique (assignment_id, enrollment_id)
);

create table public.internal_marks (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  assessment_name text not null,
  maximum_marks numeric(6, 2) not null check (maximum_marks > 0),
  marks_obtained numeric(6, 2) not null check (marks_obtained >= 0),
  recorded_by_profile_id text references public.profiles(id) on delete set null,
  recorded_at timestamptz not null default now(),
  check (marks_obtained <= maximum_marks),
  unique (enrollment_id, assessment_name)
);

create table public.semester_results (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  academic_year integer not null check (academic_year between 2000 and 2200),
  term text not null check (term in ('spring', 'summer', 'fall', 'winter')),
  semester smallint not null check (semester between 1 and 16),
  gpa numeric(3, 2) not null check (gpa >= 0 and gpa <= 10),
  cgpa numeric(3, 2) not null check (cgpa >= 0 and cgpa <= 10),
  published_at timestamptz,
  unique (student_id, academic_year, term)
);

create table public.maintenance_tickets (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid references public.equipment(id) on delete set null,
  room_id uuid not null references public.rooms(id) on delete restrict,
  reported_by_profile_id text references public.profiles(id) on delete set null,
  assigned_to_profile_id text references public.profiles(id) on delete set null,
  title text not null,
  description text not null,
  priority public.ticket_priority not null default 'medium',
  status public.ticket_status not null default 'open',
  opened_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status not in ('resolved', 'closed')) or resolved_at is not null)
);

create index maintenance_tickets_queue_idx on public.maintenance_tickets (status, priority, opened_at);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_profile_id text not null references public.profiles(id) on delete cascade,
  channel text not null check (channel in ('in_app', 'email')),
  subject text not null,
  body text not null,
  status public.notification_status not null default 'queued',
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_idx on public.notifications (recipient_profile_id, status, created_at desc);

create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_name text not null check (agent_name in ('coordinator', 'student-success', 'classroom', 'maintenance')),
  requested_by_profile_id text references public.profiles(id) on delete set null,
  correlation_id uuid not null default gen_random_uuid(),
  status public.agent_run_status not null default 'queued',
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  check ((status <> 'completed') or output is not null)
);

create index agent_runs_correlation_idx on public.agent_runs (correlation_id, created_at);

create table public.agent_decisions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  decision_type text not null,
  confidence numeric(4, 3) not null check (confidence >= 0 and confidence <= 1),
  reasons jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  requires_human_review boolean not null default false,
  approved_by_profile_id text references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.agent_messages (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  sender_agent text not null,
  recipient_agent text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id text references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  correlation_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_actor_time_idx on public.audit_logs (actor_profile_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'departments', 'profiles', 'students', 'faculty_members', 'courses',
    'course_offerings', 'enrollments', 'rooms', 'equipment', 'schedules',
    'attendance_records', 'assignments', 'assignment_submissions', 'internal_marks',
    'semester_results', 'maintenance_tickets', 'notifications', 'agent_runs',
    'agent_decisions', 'agent_messages', 'audit_logs'
  ]
  loop
    execute format('alter table public.%I enable row level security', target_table);
    execute format('revoke all on table public.%I from anon, authenticated', target_table);
  end loop;
end;
$$;
