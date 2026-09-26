-- Remove the campus-operations (facilities and maintenance) domain and the
-- maintenance-staff role. Rooms are kept because schedules reference them.

-- 1. Retire the maintenance-staff role. Existing accounts are moved to the
--    faculty role but suspended, so nobody silently gains teaching access;
--    an administrator must re-approve them.
update public.profiles
set campus_role = 'faculty',
    membership_status = 'suspended',
    updated_at = now()
where campus_role = 'maintenance-staff';

alter table public.profiles
  drop constraint if exists profiles_campus_role_check;

alter table public.profiles
  add constraint profiles_campus_role_check
  check (campus_role in ('super-admin', 'admin', 'faculty', 'student'));

-- 2. Drop maintenance tickets and equipment. Audit rows that referenced these
--    entities remain in audit_logs as historical records.
drop table if exists public.maintenance_tickets;
drop table if exists public.equipment;

drop type if exists public.ticket_status;
drop type if exists public.ticket_priority;
drop type if exists public.equipment_status;
