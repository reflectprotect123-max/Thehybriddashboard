-- Hybrid Strength + The Engine tables discovered on live project orysjncrksmdfabpuftd.
-- Recreates working_max_event, pr_event, strength_block_item, exercise, and engine_session.

create table if not exists public.exercise (
  id text primary key,
  owner_id uuid,
  name text
);

create table if not exists public.working_max_event (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null,
  exercise_id text not null,
  value_kg numeric not null,
  effective_at timestamptz not null default now(),
  source text
);

create table if not exists public.pr_event (
  athlete_id uuid not null,
  exercise_id text not null,
  value_kg numeric not null,
  rep_count integer not null default 1,
  primary key (athlete_id, exercise_id, rep_count)
);

create table if not exists public.strength_block_item (
  id uuid primary key default gen_random_uuid(),
  exercise_id text,
  block_id text
);

create table if not exists public.engine_session (
  id text primary key,
  athlete_id uuid not null,
  session_id text,
  zone_seconds jsonb,
  load numeric,
  recorded_at timestamptz default now()
);

create table if not exists public.engine_zone_event (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null,
  session_id text,
  zone_key text,
  seconds numeric,
  recorded_at timestamptz default now()
);

alter table public.working_max_event enable row level security;
alter table public.pr_event enable row level security;
alter table public.strength_block_item enable row level security;
alter table public.engine_session enable row level security;
alter table public.engine_zone_event enable row level security;
alter table public.exercise enable row level security;

drop policy if exists working_max_event_own on public.working_max_event;
create policy working_max_event_own on public.working_max_event
  for all to authenticated using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());

drop policy if exists pr_event_own on public.pr_event;
create policy pr_event_own on public.pr_event
  for all to authenticated using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());

drop policy if exists engine_session_own on public.engine_session;
create policy engine_session_own on public.engine_session
  for all to authenticated using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());

drop policy if exists engine_zone_event_own on public.engine_zone_event;
create policy engine_zone_event_own on public.engine_zone_event
  for all to authenticated using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());

drop policy if exists exercise_read on public.exercise;
create policy exercise_read on public.exercise
  for select to authenticated using (true);
