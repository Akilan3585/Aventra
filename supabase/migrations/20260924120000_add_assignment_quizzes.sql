-- Assignment publishing workflow and Google-Form style MCQ quizzes.
--
-- * `assignments` gains a kind (coursework or quiz), a draft/published/closed
--   status, instructions, and quiz settings (time limit, shuffle, results).
-- * `assignment_questions` / `assignment_question_options` hold the MCQ bank
--   for a quiz assignment. Every option carries an `is_correct` flag so the
--   server can auto-grade an attempt.
-- * `assignment_answers` stores one row per (submission, question) with the
--   chosen option ids and the marks awarded, which feeds the per-assignment
--   analytics dashboard (completion, score distribution, per-question and
--   per-option breakdown).
-- Read access is scoped in the application layer: faculty see their assigned
-- offerings, students see only published assignments for enrolled offerings.

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

create type public.assignment_kind as enum ('coursework', 'quiz');
create type public.assignment_status as enum ('draft', 'published', 'closed');

alter table public.assignments
  add column kind public.assignment_kind not null default 'coursework',
  add column status public.assignment_status not null default 'published',
  add column instructions text check (instructions is null or char_length(instructions) <= 4000),
  add column time_limit_minutes integer check (time_limit_minutes is null or time_limit_minutes between 1 and 600),
  add column shuffle_questions boolean not null default false,
  add column show_results boolean not null default true,
  add column created_by_profile_id text references public.profiles(id) on delete set null,
  add column published_at timestamptz;

-- Existing rows were created directly as live coursework.
update public.assignments set published_at = created_at where published_at is null;

create index assignments_offering_status_idx
  on public.assignments (offering_id, status, due_at);

create index assignments_created_by_profile_id_idx
  on public.assignments (created_by_profile_id);

comment on column public.assignments.kind is
  'coursework = graded by hand; quiz = auto-graded multiple choice questions.';
comment on column public.assignments.status is
  'draft = only visible to faculty; published = open to students; closed = no more attempts.';

alter table public.assignment_submissions
  add column started_at timestamptz;

create table public.assignment_questions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  position integer not null check (position >= 1),
  prompt text not null check (char_length(prompt) between 3 and 2000),
  explanation text check (explanation is null or char_length(explanation) <= 2000),
  marks numeric(6, 2) not null check (marks > 0),
  allow_multiple boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, position)
);

create trigger set_updated_at
before insert or update on public.assignment_questions
for each row execute function public.set_updated_at();

alter table public.assignment_questions enable row level security;
revoke all on table public.assignment_questions from anon, authenticated;

comment on table public.assignment_questions is
  'Multiple choice questions that make up a quiz assignment.';

create table public.assignment_question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.assignment_questions(id) on delete cascade,
  position integer not null check (position >= 1),
  label text not null check (char_length(label) between 1 and 500),
  is_correct boolean not null default false,
  unique (question_id, position)
);

create index assignment_question_options_question_id_idx
  on public.assignment_question_options (question_id);

alter table public.assignment_question_options enable row level security;
revoke all on table public.assignment_question_options from anon, authenticated;

comment on table public.assignment_question_options is
  'Answer choices for a quiz question; at least one option per question is correct.';

create table public.assignment_answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.assignment_submissions(id) on delete cascade,
  question_id uuid not null references public.assignment_questions(id) on delete cascade,
  selected_option_ids uuid[] not null default '{}',
  is_correct boolean not null default false,
  awarded_marks numeric(6, 2) not null default 0 check (awarded_marks >= 0),
  created_at timestamptz not null default now(),
  unique (submission_id, question_id)
);

create index assignment_answers_question_id_idx
  on public.assignment_answers (question_id);

alter table public.assignment_answers enable row level security;
revoke all on table public.assignment_answers from anon, authenticated;

comment on table public.assignment_answers is
  'A student''s selected options for one quiz question, with the auto-graded outcome.';
