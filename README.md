# Panel de vida

Aplicación web personal que reúne agenda, tareas, correo (solo lectura) y un
resumen matinal por correo en un único panel. Pensada para uso personal, privado
y configurable. Funciona en **modo demostración** sin ninguna credencial externa.

- **Stack:** Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind CSS 4,
  Supabase (Postgres/Auth/RLS) y despliegue en Vercel.
- **Idioma:** español de España (`dd/mm/aaaa`, 24 h). Timestamps en UTC.
- **Zona horaria por defecto:** `Europe/Madrid`.

## Arranque rápido (modo demostración)

```bash
npm install
npm run dev
```

Abre http://localhost:3000. Sin variables de entorno, la app entra en **modo
demostración**: datos ficticios claramente marcados, tareas guardadas solo en el
navegador y ninguna llamada a servicios externos.

## Puesta en marcha con Google (pasos manuales)

Para ver tu agenda y tu correo real hacen falta tres cosas que solo puedes
hacer tú. En este orden:

1. **Clave de servicio de Supabase válida.** En Supabase → Settings → API Keys
   copia la *secret key* (`sb_secret_…`) o la *service_role* heredada y ponla en
   `.env.local` como `SUPABASE_SERVICE_ROLE_KEY`. Sin ella el servidor no puede
   escribir los tokens cifrados ni la caché; la app lo avisa en Ajustes.
2. **Credenciales OAuth de Google.** Crea el cliente OAuth 2.0 (tipo «Aplicación
   web») en Google Cloud Console, activa **Google Calendar API** y **Gmail API**,
   añade tu cuenta como usuario de prueba y registra como URI de redirección
   exacta `http://localhost:3000/api/integrations/google/callback`. Copia
   `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en `.env.local`.
3. **Login con Google (opcional).** Activa el proveedor Google en Supabase
   → Authentication → Providers con el mismo `Client ID`/`Client Secret` y
   registra en Google la URI `https://<ref>.supabase.co/auth/v1/callback`.

Después, en la app: **Ajustes → Conexiones → Conectar Google (agenda y correo)**
y acepta los permisos. Los correos aparecen en «Hoy» (remitente, asunto,
fragmento, motivo de relevancia y enlace para abrirlo en Gmail).

## Qué está implementado

- Navegación responsive (Hoy, Agenda, Tareas, Ajustes) con barra inferior en móvil.
- Dashboard «Hoy»: agenda del día, correo reciente (metadatos) y resumen.
- Resumen de cada correo con IA bajo demanda (o con plantilla determinista si no
  hay proveedor configurado), con consentimiento revocable.
- Tareas: crear, editar, completar, reabrir, archivar; prioridad, fecha y etiqueta;
  captura rápida desde cualquier pantalla.
- Agenda de 7 días con origen del calendario y enlace al proveedor.
- Ajustes: perfil, preferencias del resumen matinal (hora, días, destino), vista
  previa y envío de prueba, y gestión de conexiones.
- Autenticación con Supabase (registro, login, logout) y RLS por usuario.
- Acceso con Google como proveedor de inicio de sesión (opcional).
- Conectores OAuth de Google Calendar y Gmail (metadatos) en servidor, con
  una sola autorización para ambos o por separado.
- Ruta de cron idempotente para el resumen matinal, protegida con secreto.
- Página de privacidad, estados de carga/vacío/error y accesibilidad (foco, roles,
  etiquetas, contraste).

## Configuración

Copia `.env.example` a `.env.local` y rellena los valores necesarios. **Nunca**
subas `.env.local` al repositorio.

### 1. Supabase (obligatorio para cuentas reales)

1. Crea un proyecto en https://supabase.com.
2. Copia `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y
   `SUPABASE_SERVICE_ROLE_KEY` (Settings → API) en `.env.local`.
3. Aplica las migraciones de `supabase/migrations/` en orden con el SQL Editor
   o la CLI (`supabase db push`):
   - `0001_initial_schema.sql` — tablas, índices, RLS y trigger de perfil.
   - `0002_gym_sessions.sql`, `0003_wellness.sql` — gimnasio y bienestar.
   - `0004_email_relevance.sql` — fragmento y motivo de relevancia del correo.
     (Si no la aplicas, la app sigue funcionando: omite esos campos.)
4. En Authentication → Providers, activa Email/Password.

### 2. Iniciar sesión con Google (opcional)

Permite entrar con la cuenta de Google sin contraseña de la app.

1. En Google Cloud Console crea un cliente OAuth 2.0 (tipo «Aplicación web»).
2. En Supabase → Authentication → Providers → Google, activa el proveedor y
   pega el mismo `Client ID` y `Client Secret`.
3. Añade a Google Cloud Console la URI de redirección de Supabase:
   `https://<ref>.supabase.co/auth/v1/callback`.
4. En Supabase → Authentication → URL Configuration, añade la URL de la app
   (p. ej. `http://localhost:3000/**` y la de producción) a la lista de
   redirecciones permitidas.

### 3. Google OAuth (Calendar y Gmail)

1. En Google Cloud Console crea un proyecto (o usa uno existente).
2. Activa las APIs: **Google Calendar API** y **Gmail API**
   (APIs & Services → Library).
3. Configura la pantalla de consentimiento OAuth:
   - Tipo: **Externo**.
   - Información de la aplicación: nombre «Panel de vida», correo de soporte y
     correo del desarrollador (los que tú uses).
   - Ámbito: añade `.../auth/calendar.readonly` y `.../auth/gmail.readonly`.
   - En «Usuarios de prueba» añade tu propia cuenta de Google: con la app en
     modo *Pruebas* no necesitas verificación para uso personal.
4. Crea las credenciales **OAuth 2.0 → ID de cliente de tipo Aplicación web** y
   registra la URI de redirección exacta:
   `https://<tu-dominio>/api/integrations/google/callback`
   (en local: `http://localhost:3000/api/integrations/google/callback`).
   La misma variable `GOOGLE_REDIRECT_URI` puede fijarla si no coincide.
5. Copia `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en `.env.local`.
6. Genera las claves de servidor: `openssl rand -base64 32` para
   `TOKEN_ENCRYPTION_KEY` y `openssl rand -hex 32` para `CRON_SECRET`.

Scopes solicitados (mínimos, solo lectura):

| Scope | Para qué |
|---|---|
| `calendar.readonly` | Mostrar tus próximos eventos |
| `gmail.readonly` | Ver remitente, asunto, fragmento y leer el contenido al resumir |

No se piden permisos de escritura, de cambio de etiquetas ni de envío:
`gmail.modify` y `mail.google.com` quedan fuera. **El cuerpo de los correos no
se guarda en la base de datos**: se lee de Gmail en el momento de resumir, se
recorta y se descarta; a la base de datos solo llega el resumen. El scope de
Gmail es «restringido»: para abrir el uso a terceros, Google exige verificación
de la pantalla de consentimiento y una revisión de scopes; para uso personal en
modo Pruebas no hace falta.

En **Ajustes → Conexiones** puedes conectar agenda y correo con una sola
autorización («Conectar Google») o por separado (consentimiento incremental).
Al desconectar se revoca el token en Google y se borra la caché importada.

#### Opcional: que el login con Google también dé acceso al correo

Supabase guarda en la sesión un `provider_token` de Google. Si en ese inicio de
sesión concedes además el scope de lectura de Gmail, la app puede usar ese
token como respaldo (caduca en ~1 h, así que la conexión propia de Ajustes sigue
siendo la vía principal). Se activa con:

```env
GOOGLE_LOGIN_EXTRA_SCOPES=https://www.googleapis.com/auth/gmail.readonly
```

Requiere que el mismo cliente OAuth de Google tenga ese scope en la pantalla de
consentimiento.

### 4. Leer y procesar correos con IA

En «Hoy», cada mensaje tiene un botón **Resumir con IA**:

1. El servidor pide el mensaje a Gmail con el token del usuario (nunca desde el
   navegador), recorta el cuerpo y descarta la respuesta citada.
2. Se manda al proveedor de IA solo ese texto recortado, con un prompt de
   sistema fijo del servidor. El correo va delimitado como **dato**: cualquier
   instrucción que contenga se ignora.
3. La respuesta se valida (JSON con resumen, puntos, si requiere acción y tareas)
   y se guarda en `email_summaries`. Si el proveedor falla o no hay clave, se usa
   un resumen determinista y la app sigue funcionando.

Configuración (opcional; sin esto funciona en modo determinista):

```env
AI_PROVIDER_API_KEY=...
AI_PROVIDER_MODEL=...
AI_PROVIDER_BASE_URL=https://api.openai.com/v1
```

El consentimiento es revocable con `user_preferences.ai_enabled`: si está a
`false`, el contenido del correo **no** sale del servidor.

### 5. Correo saliente (resumen matinal)

- `EMAIL_PROVIDER=log` (por defecto) simula el envío sin mandar nada.
- Para envío real: `EMAIL_PROVIDER=resend`, define `EMAIL_API_KEY` y `EMAIL_FROM`
  con un dominio verificado en el proveedor. El resumen **nunca** se envía desde
  el Gmail del usuario.

### 6. Cron del resumen

- `CRON_SECRET`: secreto que protege `/api/cron/digest`. Genera uno con
  `openssl rand -hex 32`. Vercel Cron lo envía como `Authorization: Bearer`.
- `vercel.json` define la ejecución diaria (`0 6 * * *` en UTC). La app resuelve
  la hora local del usuario y el horario de verano en lógica de aplicación.
- La idempotencia la garantiza `UNIQUE(user_id, local_date)` en
  `digest_deliveries`: un reintento no duplica el resumen.
- Nota: en plan Hobby de Vercel el cron se ejecuta una vez al día con
  variabilidad dentro de la hora; no se promete precisión al minuto.

## Comandos

```bash
npm run dev     # desarrollo
npm run build   # build de producción
npm run start   # servir el build
npm run lint    # ESLint
npx tsc --noEmit  # comprobación de tipos
```

## Despliegue en Vercel

1. Importa el repositorio en Vercel.
2. Configura las variables de entorno en Vercel (Settings → Environment Variables),
   separando desarrollo, preview y producción. Usa proyectos Supabase distintos
   por entorno.
3. Añade el dominio de producción y actualiza la URI de callback en Google Cloud.
4. Despliega. El cron de `vercel.json` se registra automáticamente.

## Seguridad y privacidad

- RLS activado en todas las tablas con datos de usuario; `integration_secrets` no
  tiene políticas de cliente (solo accesible con service role en servidor).
- Tokens OAuth y secretos solo se manejan en servidor. No se exponen con `NEXT_PUBLIC_`.
- Los refresh tokens se cifran en reposo con AES-256-GCM (`TOKEN_ENCRYPTION_KEY`).
- La caché de correo guarda solo metadatos; sin cuerpos ni adjuntos. El cuerpo se
  lee bajo demanda, se recorta y no se persiste.
- El texto del correo se trata como dato no confiable: en el prompt va delimitado
  y el modelo solo puede resumir, nunca ejecutar nada.
- La ruta de cron valida `CRON_SECRET` y las acciones validan la sesión en servidor.
- El callback OAuth valida `state` y PKCE; las sincronizaciones comprueban que
  la conexión pertenece al usuario que las pide.
- Los errores se registran sin contenido privado ni secretos.

## Pendiente / fuera del MVP

- Verificación OAuth de Google para uso público (scopes restringidos de Gmail);
  revisión legal RGPD/AEPD antes de abrir el servicio a terceros.
- Elección de calendarios por el usuario: hoy se sincronizan los que Google
  marca como seleccionados.
- Microsoft 365/Outlook, festivos españoles, lista de la compra y push.
- Automatizaciones sobre el correo: extracción de tareas automática, CRM y
  resúmenes con IA en el cron (hoy el resumen de un correo es bajo demanda).

Consulta `../contexto-handoff-antigravity.md` (junto a este proyecto) para el
brief funcional completo, fases y criterios de aceptación.
