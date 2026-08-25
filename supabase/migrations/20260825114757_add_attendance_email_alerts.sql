-- Track one active low-attendance alert per enrollment. The active-row
-- uniqueness constraint makes threshold alerts safe when attendance updates
-- are retried or submitted concurrently.

create function public.set_attendance_alert_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  new.updated_at = statement_timestamp();
  return new;
end;
$$;

revoke all on function public.set_attendance_alert_updated_at() from public;
revoke all on function public.set_attendance_alert_updated_at() from anon, authenticated;

create table public.attendance_alerts (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  recipient_profile_id text not null references public.profiles(id) on delete cascade,
  notification_id uuid references public.notifications(id) on delete set null,
  threshold_percent numeric(5, 2) not null check (threshold_percent > 0 and threshold_percent <= 100),
  observed_percent numeric(5, 2) not null check (observed_percent >= 0 and observed_percent <= 100),
  status public.notification_status not null default 'queued',
  provider_message_id text,
  last_attempted_at timestamptz,
  sent_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index attendance_alerts_active_enrollment_idx
  on public.attendance_alerts (enrollment_id)
  where resolved_at is null;

create index attendance_alerts_recipient_time_idx
  on public.attendance_alerts (recipient_profile_id, created_at desc);

create trigger set_updated_at
before insert or update on public.attendance_alerts
for each row execute function public.set_attendance_alert_updated_at();

alter table public.attendance_alerts enable row level security;
revoke all on table public.attendance_alerts from anon, authenticated;

comment on table public.attendance_alerts is
  'Durable, deduplicated delivery state for enrollment attendance threshold alerts.';
