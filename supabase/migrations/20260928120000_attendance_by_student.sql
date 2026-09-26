-- Attendance is marked per student (campus-wide roster), not per class enrollment.
-- Records and alerts move to student_id; enrollment_id stays for history only.

alter table public.attendance_records
  add column student_id uuid references public.students(id) on delete cascade;

update public.attendance_records r
  set student_id = e.student_id
  from public.enrollments e
  where e.id = r.enrollment_id and r.student_id is null;

alter table public.attendance_records
  alter column student_id set not null,
  alter column enrollment_id drop not null;

alter table public.attendance_records
  drop constraint if exists attendance_records_enrollment_session_key;

alter table public.attendance_records
  add constraint attendance_records_student_session_key
  unique (student_id, session_date, session);

create index attendance_records_student_idx
  on public.attendance_records (student_id, session_date desc);

-- Low-attendance alerts now track a student's overall attendance.
alter table public.attendance_alerts
  add column student_id uuid references public.students(id) on delete cascade;

update public.attendance_alerts a
  set student_id = e.student_id
  from public.enrollments e
  where e.id = a.enrollment_id and a.student_id is null;

alter table public.attendance_alerts
  alter column student_id set not null,
  alter column enrollment_id drop not null;

drop index if exists public.attendance_alerts_active_enrollment_idx;

create unique index attendance_alerts_active_student_idx
  on public.attendance_alerts (student_id)
  where resolved_at is null;

create index attendance_alerts_student_idx
  on public.attendance_alerts (student_id);
