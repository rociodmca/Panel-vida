-- Panel de vida — 0004: fragmento y motivo de relevancia del correo
-- Solo metadatos: el cuerpo del mensaje nunca se almacena.

alter table public.email_items_cache
  add column if not exists snippet text,
  add column if not exists relevance_score real,
  add column if not exists relevance_reason text;

-- Orden del buzón por relevancia y fecha.
create index if not exists idx_email_items_user_received
  on public.email_items_cache (user_id, received_at desc);

create index if not exists idx_email_items_user_relevance
  on public.email_items_cache (user_id, relevance_score desc, received_at desc);
