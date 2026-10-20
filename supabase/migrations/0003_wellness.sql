-- Panel de vida — bienestar: hábitos, registro de sueño, micro-diario y series de gimnasio
-- El usuario solo ve y escribe sus propias filas (RLS por propietario).

-- ---------------------------------------------------------------------------
-- Hábitos diarios (máximo ~6 activos, límite aplicado en la capa de servicio)
-- ---------------------------------------------------------------------------

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Un registro por hábito y día local.
create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  log_date date not null,
  created_at timestamptz not null default now(),
  unique (habit_id, log_date)
);

-- ---------------------------------------------------------------------------
-- Sueño y energía al despertar (datos de salud: borrado individual disponible)
-- ---------------------------------------------------------------------------

create table public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  hours numeric(3, 1) not null check (hours >= 0 and hours <= 24),
  energy smallint not null check (energy between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

-- ---------------------------------------------------------------------------
-- Micro-diario de cierre: 3 gratitudes + nota breve (sin diario completo)
-- ---------------------------------------------------------------------------

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  gratitude_1 text not null check (char_length(gratitude_1) between 1 and 300),
  gratitude_2 text check (char_length(gratitude_2) <= 300),
  gratitude_3 text check (char_length(gratitude_3) <= 300),
  reflection text check (char_length(reflection) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

-- ---------------------------------------------------------------------------
-- Series de gimnasio (detalle de la sesión del día)
-- ---------------------------------------------------------------------------

create table public.gym_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null references public.gym_sessions (id) on delete cascade,
  exercise text not null check (char_length(exercise) between 1 and 120),
  reps integer not null check (reps between 1 and 500),
  weight_kg numeric(5, 2) check (weight_kg >= 0 and weight_kg <= 500),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------

create index habits_user_idx on public.habits (user_id) where active;
create index habit_logs_user_date_idx on public.habit_logs (user_id, log_date desc);
create index sleep_logs_user_date_idx on public.sleep_logs (user_id, log_date desc);
create index journal_entries_user_date_idx on public.journal_entries (user_id, log_date desc);
create index gym_sets_session_idx on public.gym_sets (session_id);
create index gym_sets_user_idx on public.gym_sets (user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.sleep_logs enable row level security;
alter table public.journal_entries enable row level security;
alter table public.gym_sets enable row level security;

create policy "habits: propietario" on public.habits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "habit_logs: propietario" on public.habit_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "sleep_logs: propietario" on public.sleep_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "journal_entries: propietario" on public.journal_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "gym_sets: propietario" on public.gym_sets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
