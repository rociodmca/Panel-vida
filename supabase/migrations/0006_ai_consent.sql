-- ---------------------------------------------------------------------------
-- Consentimiento para resumir correo con IA
--
-- La columna existe en la base de datos desde la instalación inicial, pero
-- no estaba versionada. Se añade de forma idempotente para que una base de
-- datos nueva quede igual que la existente.
--
-- Opt-in explícito: sin esta preferencia activa no se envía contenido de
-- correo a ningún proveedor externo y se usa el resumen determinista.
-- ---------------------------------------------------------------------------

alter table public.user_preferences
  add column if not exists ai_enabled boolean not null default true;

comment on column public.user_preferences.ai_enabled is
  'Consentimiento para resumir correo con un proveedor de IA externo. Si es false se usa el resumen determinista.';
