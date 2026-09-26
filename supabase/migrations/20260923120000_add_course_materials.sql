-- Study materials that faculty publish to the students enrolled in a course
-- offering. Materials are organised into per-offering folders (for example
-- "Unit A") and may carry written notes, an external link, or an uploaded
-- document stored in the private `course-materials` storage bucket.
-- Read access is scoped in the application layer: faculty see their assigned
-- offerings, students see their enrolled offerings.

-- The shared updated_at trigger function is defined in
-- 202608140001_add_updated_at_triggers.sql. Re-declare it here so this
-- migration also applies cleanly on projects where that one was skipped.
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

create type public.course_material_kind as enum ('notes', 'study-material', 'link', 'document');

create table public.course_material_folders (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.course_offerings(id) on delete cascade,
  created_by_profile_id text references public.profiles(id) on delete set null,
  name text not null check (char_length(name) between 2 and 80 and name !~ '[/\\]'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (offering_id, name)
);

create index course_material_folders_created_by_profile_id_idx
  on public.course_material_folders (created_by_profile_id);

create trigger set_updated_at
before insert or update on public.course_material_folders
for each row execute function public.set_updated_at();

alter table public.course_material_folders enable row level security;
revoke all on table public.course_material_folders from anon, authenticated;

comment on table public.course_material_folders is
  'Named folders that group study materials within a course offering.';

create table public.course_materials (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.course_offerings(id) on delete cascade,
  folder_id uuid references public.course_material_folders(id) on delete set null,
  published_by_profile_id text references public.profiles(id) on delete set null,
  kind public.course_material_kind not null default 'notes',
  title text not null check (char_length(title) between 3 and 160),
  content text check (content is null or char_length(content) <= 8000),
  resource_url text check (resource_url is null or resource_url ~* '^https?://'),
  file_path text unique,
  file_name text check (file_name is null or char_length(file_name) <= 255),
  file_size bigint check (file_size is null or file_size > 0),
  mime_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_materials_has_body
    check (content is not null or resource_url is not null or file_path is not null),
  constraint course_materials_file_fields
    check ((file_path is null) = (file_name is null) and (file_path is null) = (file_size is null))
);

create index course_materials_offering_time_idx
  on public.course_materials (offering_id, created_at desc);

create index course_materials_folder_id_idx
  on public.course_materials (folder_id);

create index course_materials_published_by_profile_id_idx
  on public.course_materials (published_by_profile_id);

create trigger set_updated_at
before insert or update on public.course_materials
for each row execute function public.set_updated_at();

alter table public.course_materials enable row level security;
revoke all on table public.course_materials from anon, authenticated;

comment on table public.course_materials is
  'Notes, links, and uploaded documents published by faculty to an enrolled class.';

-- Private bucket for uploaded documents. Only the server-side secret key
-- reads or writes objects; students receive short-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit)
values ('course-materials', 'course-materials', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = 10485760;
