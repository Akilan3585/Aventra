-- Keep row modification timestamps authoritative at the database boundary.

create or replace function public.set_updated_at()
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

-- Trigger functions are internal implementation details, not Data API RPCs.
revoke all on function public.set_updated_at() from public;
revoke all on function public.set_updated_at() from anon, authenticated;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'departments',
    'profiles',
    'students',
    'faculty_members',
    'courses',
    'course_offerings',
    'rooms',
    'equipment',
    'schedules',
    'assignments',
    'maintenance_tickets'
  ]
  loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I',
      target_table
    );
    execute format(
      'create trigger set_updated_at before insert or update on public.%I '
      'for each row execute function public.set_updated_at()',
      target_table
    );
  end loop;
end;
$$;

comment on function public.set_updated_at() is
  'Sets updated_at to the current statement timestamp before a row insert or update.';
