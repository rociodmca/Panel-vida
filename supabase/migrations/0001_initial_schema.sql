-- Panel de vida — esquema inicial
-- UUIDs, timestamps en UTC, RLS por propietario en todas las tablas de usuario.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Perfiles y preferencias
-- ---------------------------------------------------------------------------

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  locale text not null default 'es-ES',
  timezone text not null default 'Europe/Madrid',
  created_at timestamptz not null default now()
);

create table public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  digest_enabled boolean not null default false,
  digest_local_time time not null default '07:00',
  digest_days smallint[] not null default array[1, 2, 3, 4, 5],
  digest_email text,
  week_start text not null default 'lunes' check (week_start in ('lunes', 'domingo')),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Integraciones (sin tokens en campos legibles por el cliente)
-- ---------------------------------------------------------------------------

create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('google_calendar', 'gmail')),
  provider_account_id text not null,
  scopes text[] not null default array[]::text[],
  status text not null default 'conectado' check (status in ('conectado', 'error', 'revocado')),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, provider_account_id)
);

create table public.integration_secrets (
  integration_id uuid primary key references public.integrations (id) on delete cascade,
  encrypted_refresh_token text not null,
  key_version text not null default 'v1',
  updated_at timestamptz not null default now()
);

create table public.calendar_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  integration_id uuid not null references public.integrations (id) on delete cascade,
  external_id text not null,
  name text not null,
  enabled boolean not null default true,
  color text,
  unique (integration_id, external_id)
);

-- ---------------------------------------------------------------------------
-- Cachés de eventos y correo (mínimo necesario, con expiración)
-- ---------------------------------------------------------------------------

create table public.events_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  calendar_source_id uuid references public.calendar_sources (id) on delete cascade,
  external_id text not null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  location text,
  external_url text,
  expires_at timestamptz not null default now() + interval '14 days',
  updated_at timestamptz not null default now()
);

create table public.email_items_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  integration_id uuid not null references public.integrations (id) on delete cascade,
  external_id text not null,
  sender_name text,
  sender_email text not null,
  subject text not null,
  received_at timestamptz not null,
  is_unread boolean not null default false,
  is_important boolean not null default false,
  external_url text,
  expires_at timestamptz not null default now() + interval '7 days',
  unique (integration_id, external_id)
);

-- ---------------------------------------------------------------------------
-- Tareas y notas
-- ---------------------------------------------------------------------------

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  notes text,
  due_at timestamptz,
  priority text not null default 'media' check (priority in ('baja', 'media', 'alta')),
  status text not null default 'pendiente' check (status in ('pendiente', 'completada', 'archivada')),
  label text,
  source text not null default 'manual',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text not null default '',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Auditoría operativa del digest y de sincronizaciones
-- ---------------------------------------------------------------------------

create table public.digest_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  local_date date not null,
  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  status text not null check (status in ('enviado', 'error', 'omitido')),
  idempotency_key text not null,
  error_code text
);

create table public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  integration_id uuid references public.integrations (id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('en_curso', 'completado', 'error')),
  items_synced integer not null default 0,
  error_code text
);

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------

create index idx_tasks_user_due_status on public.tasks (user_id, due_at, status);
create index idx_events_cache_user_starts on public.events_cache (user_id, starts_at);
create index idx_email_items_integration_external on public.email_items_cache (integration_id, external_id);
create index idx_digest_deliveries_user_local_date on public.digest_deliveries (user_id, local_date);
create index idx_integrations_user on public.integrations (user_id);
create index idx_sync_runs_user on public.sync_runs (user_id);

create unique index uniq_events_user_external on public.events_cache (user_id, external_id);

-- Idempotencia diaria del digest (adaptable si se permiten varios resúmenes).
create unique index uniq_digest_daily on public.digest_deliveries (user_id, local_date);

-- ---------------------------------------------------------------------------
-- Row Level Security: activado por defecto y políticas por propietario
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.integrations enable row level security;
alter table public.integration_secrets enable row level security;
alter table public.calendar_sources enable row level security;
alter table public.events_cache enable row level security;
alter table public.email_items_cache enable row level security;
alter table public.tasks enable row level security;
alter table public.notes enable row level security;
alter table public.digest_deliveries enable row level security;
alter table public.sync_runs enable row level security;

create policy "profiles: propietario" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "preferences: propietario" on public.user_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "integrations: propietario" on public.integrations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- integration_secrets NO tiene políticas de cliente: solo accesible con
-- service role desde backend (cron / callbacks OAuth).

create policy "calendar_sources: propietario" on public.calendar_sources
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "events_cache: propietario" on public.events_cache
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "email_items_cache: propietario" on public.email_items_cache
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "tasks: propietario" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "notes: propietario" on public.notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "digest_deliveries: propietario" on public.digest_deliveries
  for select using (auth.uid() = user_id);

create policy "sync_runs: propietario" on public.sync_runs
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Perfil y preferencias al registrarse
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, split_part(new.email, '@', 1));
  insert into public.user_preferences (user_id, digest_email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
