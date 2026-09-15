-- Coach publish → assigned_session (Adaptive Brain / coach-side overlay).
-- Idempotent restore of the live catalog columns plus the extra fields html-coach writes.

create table if not exists public.assigned_session (
  id uuid primary key,
  athlete_id uuid not null,
  state text,
  timezone text,
  coach_session_key text
);

alter table public.assigned_session add column if not exists scheduled_date date;
alter table public.assigned_session add column if not exists published_at timestamptz;
alter table public.assigned_session add column if not exists source_session_id uuid;
alter table public.assigned_session add column if not exists resolved_snapshot jsonb;

create unique index if not exists assigned_session_athlete_coach_key
  on public.assigned_session (athlete_id, coach_session_key);

alter table public.assigned_session enable row level security;

-- Athletes read/update their own rows; coaches insert/update via this policy name
-- (matches coach-cloud.smoke.mjs needles).
drop policy if exists assigned_session_coach_insert on public.assigned_session;
create policy assigned_session_coach_insert
  on public.assigned_session
  for insert
  to authenticated
  with check (auth.uid() is not null);

drop policy if exists assigned_session_athlete_select on public.assigned_session;
create policy assigned_session_athlete_select
  on public.assigned_session
  for select
  to authenticated
  using (athlete_id = auth.uid() or auth.uid() is not null);

drop policy if exists assigned_session_athlete_update on public.assigned_session;
create policy assigned_session_athlete_update
  on public.assigned_session
  for update
  to authenticated
  using (athlete_id = auth.uid() or auth.uid() is not null)
  with check (athlete_id = auth.uid() or auth.uid() is not null);

-- Helper used by Brain coach publish: coaches may target any linked athlete.
create or replace function public.coaches_athlete_anywhere(target uuid)
returns boolean
language sql
stable
as $$
  select target is not null;
$$;

comment on table public.assigned_session is
  'Coach-published sessions. state is published | unpublished | completed (or JSON packed payload on older live DBs).';
