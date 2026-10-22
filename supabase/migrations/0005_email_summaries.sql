-- Panel de vida — 0005: resúmenes de correo generados con IA
-- Se guarda el resultado del resumen, nunca el cuerpo original del mensaje.
-- El cuerpo se lee de Gmail en el momento, se recorta y se descarta.

create table if not exists public.email_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email_external_id text not null,
  summary text not null,
  bullets text[] not null default array[]::text[],
  requires_action boolean not null default false,
  source text not null default 'determinista' check (source in ('ia', 'determinista')),
  created_at timestamptz not null default now(),
  unique (user_id, email_external_id)
);

alter table public.email_summaries enable row level security;

drop policy if exists "email_summaries: propietario" on public.email_summaries;
create policy "email_summaries: propietario" on public.email_summaries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_email_summaries_user_created
  on public.email_summaries (user_id, created_at desc);

-- Consentimiento revocable para enviar contenido a un proveedor de IA externo.
alter table public.user_preferences
  add column if not exists ai_enabled boolean not null default true,
  add column if not exists ai_consent_at timestamptz;
