-- Session-based attendance marking with remarks and edit tracking.
-- Logical unique key becomes student enrollment + date + session (period).

alter table public.attendance_records
  add column session text not null default 'Period 1'
    check (char_length(session) between 1 and 40),
  add column remarks text
    check (remarks is null or char_length(remarks) <= 500),
  add column updated_at timestamptz not null default now(),
  add column updated_by_profile_id text references public.profiles(id) on delete set null;

-- Existing rows were last touched when they were recorded.
update public.attendance_records
  set updated_at = recorded_at, updated_by_profile_id = recorded_by_profile_id;

alter table public.attendance_records
  drop constraint if exists attendance_records_enrollment_id_session_date_key;

alter table public.attendance_records
  add constraint attendance_records_enrollment_session_key
  unique (enrollment_id, session_date, session);

-- Permission and leave join excused as statuses excluded from the percentage;
-- present, late, and OD count as attended (attendance-rules.ts).
alter table public.attendance_records
  drop constraint if exists attendance_records_status_check;

alter table public.attendance_records
  add constraint attendance_records_status_check
  check (status in ('present', 'absent', 'late', 'excused', 'od', 'permission', 'leave'));

create index attendance_records_session_period_idx
  on public.attendance_records (session_date, session);

create index attendance_records_updated_by_idx
  on public.attendance_records (updated_by_profile_id);

drop trigger if exists set_attendance_records_updated_at on public.attendance_records;
create trigger set_attendance_records_updated_at
  before update on public.attendance_records
  for each row execute function public.set_updated_at();
