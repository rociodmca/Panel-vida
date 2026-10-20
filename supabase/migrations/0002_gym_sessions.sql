-- Panel de vida — registro de sesiones de gimnasio
-- Una fila por día con entrenamiento registrado. El usuario solo ve las suyas.

create table public.gym_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, session_date)
);

-- Índice para la consulta de racha (últimos días del usuario)
create index gym_sessions_user_date_idx
  on public.gym_sessions (user_id, session_date desc);

alter table public.gym_sessions enable row level security;

create policy "gym_select_own" on public.gym_sessions
  for select using (auth.uid() = user_id);

create policy "gym_insert_own" on public.gym_sessions
  for insert with check (auth.uid() = user_id);

create policy "gym_delete_own" on public.gym_sessions
  for delete using (auth.uid() = user_id);
