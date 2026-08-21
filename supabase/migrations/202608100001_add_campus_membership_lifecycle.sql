-- Make the campus directory the authoritative authorization source.
-- Only identities already linked to Clerk are preserved as active memberships.
-- Unlinked roster entries and newly created identities remain pending.

alter table public.profiles
  add column if not exists membership_status text not null default 'pending',
  add column if not exists valid_from timestamptz,
  add column if not exists valid_until timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by_profile_id text;

update public.profiles
set membership_status = 'active',
    valid_from = coalesce(valid_from, created_at),
    approved_at = coalesce(approved_at, created_at)
where membership_status = 'pending'
  and clerk_user_id is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_membership_status_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_membership_status_check
      check (membership_status in ('pending', 'active', 'suspended', 'expired'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_membership_validity_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_membership_validity_check
      check (valid_until is null or valid_from is null or valid_until > valid_from);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_approved_by_profile_id_fkey'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_approved_by_profile_id_fkey
      foreign key (approved_by_profile_id)
      references public.profiles(id)
      on delete set null;
  end if;
end
$$;

create index if not exists profiles_membership_status_updated_idx
  on public.profiles (membership_status, updated_at desc);

create index if not exists profiles_approved_by_profile_id_idx
  on public.profiles (approved_by_profile_id)
  where approved_by_profile_id is not null;

comment on column public.profiles.membership_status is
  'Authoritative campus authorization state. Clerk authenticates identity; this value controls workspace access.';
