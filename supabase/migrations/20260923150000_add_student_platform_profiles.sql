-- External platform performance for students: LinkedIn, HackerRank,
-- CodeChef, LeetCode, and GitHub profiles with the platform's headline
-- score (rating, points, connections, contributions) and an activity count
-- (problems solved, badges, endorsements, repositories). One row per
-- student per platform; re-recording a platform upserts the row so the
-- dashboard always reflects the latest recorded snapshot.
-- Readiness bands are computed deterministically in
-- src/features/performance/domain/platform-performance.ts.

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

revoke all on function public.set_updated_at() from public;
revoke all on function public.set_updated_at() from anon, authenticated;

create type public.coding_platform as enum ('linkedin', 'hackerrank', 'codechef', 'leetcode', 'github');

create table public.student_platform_profiles (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  recorded_by_profile_id text references public.profiles(id) on delete set null,
  platform public.coding_platform not null,
  handle text not null check (char_length(handle) between 1 and 80),
  profile_url text not null check (profile_url ~* '^https?://'),
  score numeric(10, 2) not null default 0 check (score >= 0),
  activity_count integer check (activity_count is null or activity_count >= 0),
  tier text check (tier is null or char_length(tier) <= 40),
  recorded_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, platform)
);

create index student_platform_profiles_platform_score_idx
  on public.student_platform_profiles (platform, score desc);

create index student_platform_profiles_recorded_by_profile_id_idx
  on public.student_platform_profiles (recorded_by_profile_id);

create trigger set_updated_at
before insert or update on public.student_platform_profiles
for each row execute function public.set_updated_at();

alter table public.student_platform_profiles enable row level security;
revoke all on table public.student_platform_profiles from anon, authenticated;

comment on table public.student_platform_profiles is
  'Latest recorded LinkedIn, HackerRank, CodeChef, LeetCode, and GitHub metrics per student.';
