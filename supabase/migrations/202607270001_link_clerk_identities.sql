alter table public.profiles
  add column if not exists clerk_user_id text;

create unique index if not exists profiles_clerk_user_id_key
  on public.profiles (clerk_user_id)
  where clerk_user_id is not null;

comment on column public.profiles.clerk_user_id is
  'Clerk user identifier linked by the verified Clerk webhook. Null for invited roster profiles that have not signed up yet.';
