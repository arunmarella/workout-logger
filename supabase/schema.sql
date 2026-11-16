-- Rep Journal / Workout Logger — Supabase schema
-- Run this in Supabase Dashboard → SQL Editor (once).
-- Tables match lib/data.js and hooks/useWorkoutState.js.
-- NOTE (verified Nov 15, 2026 against project xczgiglapdzmvedkypkx):
-- all four tables already exist there with these exact columns, so this
-- file is a fresh-project record / no-op there. Do NOT re-run the seed
-- inserts blindly if you already have user data; the tib insert is
-- idempotent (on conflict do update).

create table if not exists public.templates (
  id text primary key,
  name text not null,
  exercises jsonb not null default '[]'::jsonb,
  user_id uuid references auth.users(id) on delete cascade,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.history (
  id text primary key,
  template_name text,
  date timestamptz not null,
  duration integer, -- minutes
  exercises jsonb not null default '[]'::jsonb,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Live table uses text ids (not uuid); 873 exercises already seeded there.
create table if not exists public.exercises (
  id text primary key,
  name text not null,
  muscle_group text,
  equipment text,
  description text,
  created_at timestamptz not null default now()
);

-- Live table has NO created_at column, only updated_at.
create table if not exists public.active_workouts (
  id uuid primary key,
  template_id text,
  template_name text,
  state jsonb not null default '{}'::jsonb,
  user_id uuid not null references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists templates_user_idx on public.templates (user_id);
create index if not exists templates_system_idx on public.templates (is_system);
create index if not exists history_user_date_idx on public.history (user_id, date desc);
create index if not exists exercises_name_idx on public.exercises using gin (to_tsvector('english', name));

-- Row Level Security: users see their own rows + system templates; guests (anon) see system templates only.
alter table public.templates enable row level security;
alter table public.history enable row level security;
alter table public.exercises enable row level security;
alter table public.active_workouts enable row level security;

drop policy if exists "templates readable" on public.templates;
create policy "templates readable" on public.templates for select
  using (is_system = true or auth.uid() = user_id);
drop policy if exists "templates writable" on public.templates;
create policy "templates writable" on public.templates for all
  using (auth.uid() = user_id or is_system = false)
  with check (auth.uid() = user_id or is_system = false);

drop policy if exists "history owner only" on public.history;
create policy "history owner only" on public.history for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "exercises readable" on public.exercises;
create policy "exercises readable" on public.exercises for select using (true);

drop policy if exists "active_workouts owner only" on public.active_workouts;
create policy "active_workouts owner only" on public.active_workouts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Seed: system templates (visible to everyone, including guests).
-- Tib & Ankle Strength — Mon/Wed/Fri, ~10 min. From the tib-raises routine, Nov 14 2026.
insert into public.templates (id, name, exercises, user_id, is_system) values
('tib-ankle-strength', 'Tib & Ankle Strength', '[
  {"id":"tib-raises","name":"Tib Raises","sets":[{"reps":10,"weight":0,"notes":"Feet close to wall if hard, knees straight"},{"reps":10,"weight":0,"notes":""},{"reps":10,"weight":0,"notes":""}]},
  {"id":"calf-raises","name":"Calf Raises","sets":[{"reps":12,"weight":0,"notes":""},{"reps":12,"weight":0,"notes":""},{"reps":12,"weight":0,"notes":""}]},
  {"id":"single-leg-balance","name":"Single-Leg Balance","sets":[{"reps":30,"weight":0,"notes":"30 sec / side"},{"reps":30,"weight":0,"notes":"30 sec / side"}]},
  {"id":"ankle-circles","name":"Ankle Circles","sets":[{"reps":10,"weight":0,"notes":"10 each direction / foot"},{"reps":10,"weight":0,"notes":"10 each direction / foot"}]}
]'::jsonb, null, true),
('push-day', 'Push Day', '[
  {"id":"e1","name":"Bench Press","sets":[{"reps":8,"weight":135,"notes":""},{"reps":8,"weight":135,"notes":""},{"reps":6,"weight":145,"notes":""}]},
  {"id":"e2","name":"Overhead Press","sets":[{"reps":10,"weight":75,"notes":""},{"reps":10,"weight":75,"notes":""}]},
  {"id":"e3","name":"Tricep Dips","sets":[{"reps":12,"weight":0,"notes":""},{"reps":12,"weight":0,"notes":""}]}
]'::jsonb, null, true)
on conflict (id) do update set name = excluded.name, exercises = excluded.exercises, is_system = true;

-- Seed a small exercise library (extend as needed; live project already
-- has 873 exercises, so this only matters for a fresh project).
insert into public.exercises (id, name, muscle_group, equipment) values
('bench-press','Bench Press','chest','barbell'), ('overhead-press','Overhead Press','shoulders','barbell'),
('squat','Squat','quads','barbell'), ('deadlift','Deadlift','back','barbell'),
('tib-raises','Tib Raises','calves','bodyweight'), ('calf-raises','Calf Raises','calves','bodyweight'),
('single-leg-balance','Single-Leg Balance','calves','bodyweight'), ('ankle-circles','Ankle Circles','calves','bodyweight'),
('pull-up','Pull-Up','back','bodyweight'), ('barbell-row','Barbell Row','back','barbell'),
('tricep-dips','Tricep Dips','triceps','bodyweight'), ('bicep-curl','Bicep Curl','biceps','dumbbell')
on conflict (id) do nothing;
