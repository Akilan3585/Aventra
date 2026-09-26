-- On-duty (OD) attendance status and Google Sheets attendance sync tracking.

-- 1. Allow faculty to mark a student as "on duty" (OD). OD counts as attended
--    for percentage purposes; see src/features/attendance/domain/attendance-rules.ts.
alter table public.attendance_records
  drop constraint if exists attendance_records_status_check;

alter table public.attendance_records
  add constraint attendance_records_status_check
  check (status in ('present', 'absent', 'late', 'excused', 'od'));

-- 2. Track every push of attendance data into the campus Google Sheet so the
--    Attendance page can show the last successful refresh and any failures.
create table public.attendance_sheet_syncs (
  id uuid primary key default gen_random_uuid(),
  trigger text not null check (trigger in ('scheduled', 'manual', 'record')),
  scope text not null default 'full' check (scope in ('full', 'offering')),
  status text not null default 'running' check (status in ('running', 'succeeded', 'failed')),
  spreadsheet_id text,
  offering_ids uuid[] not null default '{}',
  records_synced integer not null default 0 check (records_synced >= 0),
  sheets_updated integer not null default 0 check (sheets_updated >= 0),
  error_message text,
  triggered_by_profile_id text references public.profiles(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index attendance_sheet_syncs_started_idx
  on public.attendance_sheet_syncs (started_at desc);

create index attendance_sheet_syncs_triggered_by_idx
  on public.attendance_sheet_syncs (triggered_by_profile_id);

alter table public.attendance_sheet_syncs enable row level security;
revoke all on table public.attendance_sheet_syncs from anon, authenticated;
