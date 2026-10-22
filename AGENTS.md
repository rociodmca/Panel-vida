<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->


<!-- BEGIN:handoff-panel-vida -->

# Brief de producto — Panel de vida (MVP)

> Contexto de producto y guía de implementación obligatorio para este repositorio. Original: contexto-handoff-antigravity2.md.

# Panel de vida — contexto y handoff para Antigravity

> **Estado:** brief de producto y guía de implementación para el MVP.  
> **Idioma inicial:** español (España).  
> **Zona horaria:** `Europe/Madrid`.  
> **Decisiones confirmadas:** Google Calendar, Gmail, resumen matinal por email, un único usuario inicial, finanzas pospuestas, diseño premium inspirado en Linear/Notion, IA en la nube, Supabase y Vercel.

## 1. Contexto del producto

**Panel de vida** es una aplicación web personal que reúne en una sola vista la información práctica necesaria para empezar y organizar el día: agenda, correo importante, tareas y recordatorios. Además, prepara y envía por email un resumen matinal con lo que requiere atención.

Está pensada para una persona media que vive en España y quiere reducir el tiempo que pasa saltando entre aplicaciones. El producto debe sentirse tranquilo, claro y fiable: muestra lo importante, permite actuar rápidamente y explica de dónde procede cada dato. No pretende sustituir Google Calendar ni Gmail.

### Decisiones de producto

| Área | Decisión |
|---|---|
| Calendario | Google Calendar; lectura y selección de calendarios en el MVP |
| Correo | Gmail; acceso mínimo necesario para resumir y enlazar mensajes |
| Resumen | Email matinal, configurable por hora y días |
| Usuarios | Un usuario inicial; diseñar el esquema con `user_id` para no bloquear una futura ampliación |
| Finanzas | Fuera del MVP; considerar en una fase posterior |
| Diseño | Premium, limpio y responsive, con referencias de calidad visual a Linear y Notion, sin copiar su interfaz ni marca |
| IA | Servicio cloud para resumir y ayudar a organizar texto; nunca autorizar acciones externas por su cuenta |
| Backend y despliegue | Supabase y Vercel |

## 2. Objetivos del MVP

1. Ofrecer una página de inicio útil para revisar el día en menos de un minuto.
2. Conectar de forma segura una cuenta de Google y permitir elegir calendarios.
3. Mostrar próximos eventos, tareas personales y una selección de correos que probablemente requieren atención.
4. Crear, completar, reprogramar y archivar tareas dentro de Panel de vida.
5. Preparar y enviar un email matinal útil, breve y fiable según la hora local de España.
6. Permitir revisar y corregir las preferencias, desconectar Google y borrar los datos de la aplicación.
7. Entregar una experiencia móvil de calidad, instalable como PWA si no añade complejidad desproporcionada.

## 3. No objetivos del MVP

- Finanzas, agregación bancaria, presupuestos, inversiones o asesoramiento financiero.
- Colaboración, equipos, roles, uso compartido o administración multiusuario visible.
- Sustituir Gmail, ofrecer un cliente de correo completo o enviar respuestas automáticamente.
- Modificar, borrar o crear eventos de Google Calendar en nombre del usuario; dejarlo para una ampliación explícita.
- Integraciones con Outlook, Apple Calendar, WhatsApp, AEAT, banca, salud u otros proveedores.
- Automatizaciones autónomas que tomen decisiones o ejecuten acciones externas sin confirmación.
- Prometer cumplimiento legal por el mero hecho de usar proveedores conocidos: la configuración y el tratamiento deben revisarse antes del lanzamiento público.

## 4. Usuarios y casos de uso

### Usuario principal

Una persona que vive en España, usa Gmail y Google Calendar, tiene días con compromisos y tareas diversas y necesita una vista fiable, accesible desde móvil y ordenador.

### Flujos esenciales

1. **Primera visita:** entiende el valor, inicia sesión y conecta Google mediante OAuth.
2. **Configuración:** elige calendarios, hora del resumen, días de envío, email de destino y preferencias de privacidad/IA.
3. **Inicio del día:** ve fecha local, próximos eventos, tareas vencidas o de hoy, correos destacados y resumen matinal.
4. **Organización:** captura una tarea rápidamente, asigna fecha/prioridad y la completa o reprograma.
5. **Correo:** ve remitente, asunto, fragmento mínimo, razón de relevancia y enlace para abrir el mensaje en Gmail.
6. **Conexiones y privacidad:** consulta estado de sincronización, renueva o revoca conexión, exporta o elimina datos.

## 5. Funciones priorizadas

### P0 — imprescindibles para validar el MVP

- Autenticación de un único usuario mediante Supabase Auth (preferiblemente Google como proveedor de acceso, coherente con la cuenta conectada).
- Onboarding con consentimiento claro y conexión OAuth de Google para Calendar y Gmail.
- Panel diario con eventos próximos, tareas de hoy/vencidas y correos destacados.
- Tareas propias: alta rápida, edición, prioridad, fecha límite, completar y eliminar/archivar.
- Preferencias: zona horaria `Europe/Madrid`, hora de envío, días de envío, calendarios seleccionados y destinatario.
- Resumen matinal por email con enlaces profundos a la aplicación y a mensajes/eventos originales.
- Estados vacíos, errores recuperables, estado de conexión y última sincronización.
- Desconectar proveedor, borrar cuenta/datos y política de conservación entendible.
- Diseño responsive con accesibilidad básica de teclado, contraste y lectores de pantalla.

### P1 — valiosas si P0 está estable

- Captura rápida de tarea desde cualquier pantalla y atajos de teclado.
- Captura rápida de ideas o «brain dump»: nota libre de acceso inmediato, sin convertir el producto en un gestor de notas completo.
- Etiquetas ligeras para tareas (p. ej., personal, casa, trabajo) sin taxonomía compleja.
- Búsqueda unificada simple en tareas y datos ya sincronizados.
- **Tracker de gimnasio básico** (ya implementado): registro diario de sesión con racha y vista semanal; ampliar a detalle de rutinas/series en P2.
- **Hábitos diarios con rachas**: verificación diaria de hábitos personales (meditación, lectura, agua, suplementos…) con contador de rachas visuales, siguiendo el patrón del tracker de gimnasio. Un máximo de ~6 hábitos activos para mantener la interfaz tranquila.
- PWA instalable y caché limitada de la interfaz; evitar caché offline de contenido sensible por defecto.
- Reglas sencillas de relevancia del correo configurables (remitentes importantes, excluir newsletters).

### P2 — ideas posteriores, no comprometer el MVP

- **Gimnasio avanzado**: planificador de rutinas (empuje/tirón/pierna/cardio), registro de series, repeticiones y pesos, historial y gráficos de progreso.
- **Sueño y energía**: registro básico de horas de sueño y escala de energía al despertar (1-5); datos de salud personal, tratar con consentimiento explícito y minimización en RGPD.
- **Modo enfoque / Pomodoro**: interfaz simplificada con la tarea actual y temporizador; reproducir sonido ambiente opcional.
- **Micro-diario de cierre**: check-in nocturno breve (3 gratitudes + nota de reflexión), sin convertirlo en diario completo.
- **Clima local y frase motivacional en el digest**: añadir contexto del día al resumen matinal; requiere API meteorológica y selección de frase determinista.
- Finanzas personales con evaluación de proveedor, seguridad y alcance regulatorio antes de diseñar.
- Integraciones adicionales (Outlook, Apple, tareas externas, transporte o festivos).
- Acciones de calendario y correo con confirmación explícita.
- Aplicación móvil nativa, colaboración, automatizaciones avanzadas y recomendaciones personales.

## 6. Experiencia y dirección visual

- Interfaz sobria y premium: tipografía legible, jerarquía clara, espacios generosos, bordes y sombras discretos, iconografía consistente.
- Inspiración en la densidad y pulido de Linear y la claridad de Notion; crear identidad propia y no reutilizar sus assets ni replicar pantallas.
- Navegación sugerida: **Hoy**, **Tareas**, **Correo**, **Calendario**, **Ajustes**. En móvil, navegación inferior o menú compacto.
- En “Hoy”, priorizar: saludo/fecha local, resumen del día, siguiente evento, tareas prioritarias, correos que requieren acción y widgets de bienestar (gimnasio/hábitos) con rachas visibles.
- Diferenciar contenido sincronizado de contenido creado en la app y mostrar la hora de actualización.
- Estados de carga con skeletons, errores con una acción de recuperación, estados vacíos con siguiente paso concreto.
- Reducir movimiento; respetar `prefers-reduced-motion`; no depender solo del color para comunicar prioridad.
- Diseño responsive desde móvil, objetivos táctiles cómodos y formularios utilizables con teclado.
- Mantener un tono en español natural de España, evitando traducciones literales o lenguaje alarmista.

## 7. Arquitectura propuesta

### Stack

- **Next.js** con App Router y TypeScript, desplegado en Vercel.
- **Supabase**: PostgreSQL, Auth y almacenamiento solo si aparece un caso necesario. Usar Edge Functions o funciones server-side para integraciones y tareas programadas.
- **Google APIs**: Google Calendar API y Gmail API con OAuth 2.0.
- **Proveedor de email transaccional**: elegir uno compatible con el despliegue, SPF/DKIM/DMARC y requisitos de privacidad antes de producción.
- **Proveedor de IA cloud**: detrás de una capa de servicio propia para poder cambiarlo; no exponer claves al navegador.
- **Vercel Cron** o un planificador equivalente que invoque una función protegida para preparar y enviar resúmenes.

### Límites de confianza

1. El navegador solo recibe datos necesarios para la interfaz y una sesión de usuario.
2. Las rutas server-side validan sesión, usuario, esquema y permisos antes de acceder a datos.
3. Las credenciales de Google y claves de proveedores se guardan cifradas en el servidor; no se devuelven al cliente.
4. Las operaciones programadas verifican un secreto de cron y recorren únicamente usuarios con resumen habilitado.
5. Los resultados de IA se tratan como texto no confiable: escapar al renderizar y no ejecutarlos como instrucciones ni acciones.

### Módulos sugeridos

- `auth`: sesión, onboarding y protección de rutas. El acceso con Google usa PKCE: Supabase devuelve el código en `?code=` y la ruta `src/app/auth/callback/route.ts` lo canjea por la sesión (`exchangeCodeForSession`) antes de entrar al panel. Sin ese canje el proveedor autoriza pero la app no inicia sesión.
- `google`: OAuth, refresh, scopes, Calendar, Gmail, revocación y errores.
- `tasks`: CRUD y reglas de usuario.
- `dashboard`: consultas agregadas para “Hoy”.
- `digest`: selección de información, generación, plantilla y envío.
- `ai`: resumen estructurado con límites de datos y fallback sin IA.
- `settings`: preferencias, consentimiento, exportación y borrado.

## 8. OAuth seguro para Google Calendar y Gmail

### Flujo recomendado

1. Desde el servidor, iniciar OAuth 2.0 Authorization Code con PKCE, `state` aleatorio de un solo uso y URI de redirección registrada exactamente.
2. Solicitar scopes mínimos. Separar scopes de Calendar y Gmail cuando sea viable, explicar para qué se pide cada uno y solicitar consentimiento incremental.
3. Para Calendar, preferir scopes de solo lectura (por ejemplo, lectura de eventos) mientras el MVP no modifica agenda.
4. Para Gmail, pedir solo el acceso necesario para identificar y leer mensajes relevantes. Evaluar cuidadosamente los scopes de Gmail y la revisión/verificación que Google pueda exigir; evitar permisos de envío y modificación en MVP.
5. Intercambiar el código en backend; validar `state`, PKCE y expiración; guardar access/refresh tokens cifrados con clave disponible únicamente en servidor.
6. Asociar la conexión al `user_id` de Supabase y registrar scopes concedidos, vencimiento y estado, nunca el token en logs.
7. Renovar tokens solo en servidor; ante `invalid_grant`, marcar la conexión como expirada y guiar al usuario a reconectar.
8. Permitir revocación/desconexión: intentar revocar en Google, eliminar credenciales locales y detener sincronizaciones/resúmenes.

### Consideraciones de despliegue Google

- Configurar pantalla de consentimiento, dominios autorizados, URI de callback de local/staging/producción y usuarios de prueba.
- Confirmar clasificación de scopes y requisitos de verificación de Google antes de abrir el acceso a usuarios externos; algunos permisos de Gmail pueden requerir revisión y justificar alcance.
- No usar scopes amplios por comodidad. Documentar en la UI qué datos lee la aplicación y con qué finalidad.
- No permitir que la IA o el cliente web obtengan tokens OAuth.

## 9. Modelo de datos inicial (PostgreSQL/Supabase)

Usar UUID, `created_at`/`updated_at` UTC y `user_id` en toda fila personal. Añadir índices por usuario y por campos de orden/filtro. Las migraciones deben versionarse.

### `profiles`

- `id uuid primary key references auth.users(id)`
- `display_name text null`
- `timezone text not null default 'Europe/Madrid'`
- `locale text not null default 'es-ES'`
- `created_at`, `updated_at`

### `user_settings`

- `user_id uuid primary key references profiles(id)`
- `digest_enabled boolean not null default false`
- `digest_email text null`
- `digest_local_time time not null default '07:00'`
- `digest_days smallint[] not null` (convención documentada: ISO 1=lunes…7=domingo)
- `ai_enabled boolean not null default true` con consentimiento separado y revocable
- `created_at`, `updated_at`

### `google_connections`

- `id uuid primary key`, `user_id uuid not null`
- `google_subject text not null`, `email text null`
- `scopes text[] not null`, `status text not null`
- `access_token_ciphertext text null`, `refresh_token_ciphertext text null`
- `access_token_expires_at timestamptz null`, `last_sync_at timestamptz null`
- `created_at`, `updated_at`
- Tokens inaccesibles al cliente mediante grants/policies; preferir tabla o almacén aislado y RPC/servicio server-only.

### `calendar_selections`

- `id uuid primary key`, `user_id uuid not null`, `connection_id uuid not null`
- `google_calendar_id text not null`, `calendar_name text null`, `selected boolean not null default true`
- `created_at`, `updated_at`
- Restricción única `(user_id, google_calendar_id)`.

### `tasks`

- `id uuid primary key`, `user_id uuid not null`
- `title text not null`, `notes text null`, `status text not null default 'open'`
- `priority smallint not null default 2` (documentar escala)
- `due_at timestamptz null`, `completed_at timestamptz null`
- `source text not null default 'manual'`, `created_at`, `updated_at`
- Validar límites de longitud y valores con constraints.

### `email_items` (opcional, mantener mínima la copia local)

- `id uuid primary key`, `user_id uuid not null`, `connection_id uuid not null`
- `gmail_message_id text not null`, `thread_id text null`, `sender text null`, `subject text null`
- `snippet text null`, `received_at timestamptz null`, `relevance_score real null`
- `reason text null`, `last_seen_at timestamptz`, `created_at`
- Restricción única `(user_id, gmail_message_id)`. Retención corta y sin guardar cuerpo/adjuntos en el MVP.

### `digest_runs`

- `id uuid primary key`, `user_id uuid not null`, `local_date date not null`
- `status text not null`, `started_at timestamptz`, `sent_at timestamptz null`
- `provider_message_id text null`, `error_code text null`, `created_at`
- Restricción única `(user_id, local_date)` para idempotencia.

### `audit_events` (mínimo necesario)

- `id uuid primary key`, `user_id uuid null`, `event_type text not null`, `created_at`
- Guardar acciones de seguridad relevantes sin tokens, cuerpos de correo ni contenido sensible innecesario; definir retención.

## 10. Seguridad, RLS y gestión de secretos

- Activar RLS en todas las tablas con información de usuario.
- Políticas de lectura/escritura basadas en `auth.uid() = user_id`; para `profiles`, validar `id = auth.uid()`.
- No confiar en ocultar botones o filtrar datos solo en el frontend.
- La `service_role` de Supabase y secretos de cifrado son exclusivamente server-side. Nunca prefijo `NEXT_PUBLIC_`.
- Para tablas con tokens: denegar acceso a `authenticated` y `anon`; leer/escribir solo desde backend con servicio controlado. Revisar también vistas, funciones y grants.
- Cifrar tokens OAuth en reposo con clave gestionada como secreto, rotación planificada y versión de cifrado. No imprimir tokens en errores o telemetría.
- Validar entradas con esquemas (p. ej., Zod), aplicar límites de tamaño, paginación, rate limits y protección CSRF donde corresponda.
- Proteger endpoints de cron con secreto en cabecera, comparar en servidor, usar idempotencia y evitar reenvíos duplicados.
- Sanitizar contenido y escapar HTML de mensajes/IA. Tratar email y calendario como datos no confiables, incluidos enlaces e instrucciones dentro del texto.
- Añadir cabeceras de seguridad, CSP razonable, cookies `HttpOnly`, `Secure`, `SameSite`, y no almacenar tokens en `localStorage`.
- Registros sin contenido privado: IDs internos, códigos de error y tiempos; establecer retención y acceso restringido.
- Revisar dependencias, permisos de Google, configuración de Supabase/Vercel y protección de ramas antes de producción.

## 11. Resumen matinal programado

### Comportamiento esperado

- Hora inicial sugerida: **07:00 Europe/Madrid**, editable. No es una decisión esencial irreversible.
- Días configurables; sugerencia inicial: lunes a viernes.
- El cron puede ejecutarse cada pocos minutos y seleccionar usuarios cuyo horario local ya haya llegado y cuyo resumen aún no se haya enviado para esa fecha local.
- Calcular `local_date` y próxima ejecución con una biblioteca de zonas horarias compatible con IANA; no sumar 24 horas a mano. Gestionar cambios de horario de verano/invierno.
- Procesar por lotes, con timeout y reintentos limitados. Registrar `digest_runs` antes del envío o usar outbox/idempotencia para impedir duplicados.
- Crear resumen con eventos del día, tareas vencidas/prioritarias y mensajes relevantes recientes. Enlazar a la fuente; no copiar más texto de email del necesario.
- Si Gmail, Calendar o IA fallan, enviar una versión parcial o notificar claramente según preferencia; no bloquear el envío por un proveedor opcional.
- Evitar enviar si no hay contenido útil, salvo que el usuario elija recibir un “día tranquilo”.
- Proporcionar vista previa y email de prueba desde Ajustes.

### Resumen asistido por IA

- Enviar al proveedor cloud solo los campos imprescindibles; por defecto excluir cuerpo completo y adjuntos.
- Preferir generación estructurada (JSON validado) con títulos, puntos y referencias a IDs de origen; limitar tamaño/token y establecer timeout.
- Prompt de sistema fijo del servidor, resistente a prompt injection en asuntos, fragmentos y descripciones de eventos. El contenido externo es dato, no instrucción.
- No pedir a la IA que envíe correos, cambie eventos o realice acciones. Nunca permitirle producir HTML ejecutable.
- Si falla, recurrir a una plantilla determinista con listas y enlaces.
- Mostrar indicación de resumen asistido por IA y permitir desactivarlo. Definir retención y revisar condiciones del proveedor.

## 12. Privacidad y RGPD

Esto es una guía de diseño y no sustituye una revisión legal antes de ofrecer el servicio públicamente.

- Aplicar minimización: sincronizar solo datos que habilitan funciones visibles; evitar almacenar cuerpos completos y adjuntos.
- Los datos de salud y bienestar (sueño, energía, hábitos) son datos personales sensibles: exigir consentimiento explícito y granular, permitir borrado individual por categoría y no inferir ni derivar conclusiones de salud a partir de ellos.
- Informar de responsable, finalidades, bases jurídicas, proveedores/encargados, transferencias internacionales, conservación, derechos y contacto antes de conectar servicios.
- Obtener consentimiento/acción afirmativa clara para conectar Google y para enviar contenido a IA cloud; granularidad y revocación sencilla.
- Definir contrato y configuración de tratamiento con Supabase, Vercel, email e IA; revisar región de alojamiento y transferencias internacionales aplicables.
- Facilitar exportación, rectificación y borrado. Al desconectar, retirar credenciales y detener procesos; al borrar cuenta, purgar datos locales según una política documentada y comunicar límites de copias de seguridad.
- Establecer plazos de conservación para correos cacheados, logs, tokens y ejecuciones de resumen.
- No utilizar datos personales para entrenar modelos propios. Confirmar con el proveedor IA que no se reutilizan para entrenamiento y entender retención.
- Evitar analítica invasiva; si se incorpora, documentar finalidad, consentimiento cuando corresponda y evitar contenido sensible.
- Evaluar si la escala, perfiles o datos tratados requieren evaluación de impacto u otras medidas antes de ampliar el producto.

## 13. Pruebas y criterios de aceptación

### Pruebas recomendadas

- Unitarias: conversión de hora local, DST, políticas de selección de contenido, idempotencia, validadores y fallback de IA.
- Integración: RLS con dos usuarios de prueba; OAuth callback/estado; renovación y revocación; CRUD de tareas; cron protegido y repetido.
- E2E: onboarding, conectar Google en modo de prueba, seleccionar calendario, revisar panel, crear tarea, configurar horario y previsualizar resumen.
- Seguridad: verificar que tokens y claves no aparecen en bundle del cliente, HTML, logs, URLs ni respuestas; probar acceso cruzado entre usuarios.
- Accesibilidad y responsive: navegación por teclado, estados de foco, contraste y viewport móvil/escritorio.
- Operación: fallos de Google, IA y proveedor de email; reintentos y recuperación sin envío duplicado.

### Criterios de aceptación del MVP

- Un usuario puede registrarse/iniciar sesión, conectar Google y desconectarlo sin exponer credenciales.
- El panel muestra eventos de calendarios seleccionados, tareas propias y mensajes recientes seleccionados con enlaces de origen.
- Un usuario solo puede leer y modificar sus propios datos; la comprobación se hace en backend y mediante RLS.
- Crear/completar/reprogramar una tarea funciona en móvil y escritorio y persiste tras recargar.
- El resumen se envía a la hora y días configurados de `Europe/Madrid`, contempla DST y no se duplica al reintentar.
- El resumen sigue funcionando con plantilla determinista si el proveedor IA falla y no ejecuta acciones externas.
- El usuario puede desactivar IA y el resumen, cambiar ajustes, solicitar exportación y borrar los datos de la aplicación.
- La UI ofrece estados de carga, error, vacío y conexión expirada con próximos pasos claros.
- No hay secretos en el cliente ni scopes de escritura innecesarios en la configuración del MVP.

## 14. Variables de entorno

Crear `.env.example` con nombres y explicaciones, sin valores reales. Validar variables requeridas al arrancar; no exponer secretos con prefijo público.

| Variable | Uso | Exposición |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | Pública |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública Supabase; RLS obligatoria | Pública |
| `SUPABASE_SERVICE_ROLE_KEY` | Operaciones server-side privilegiadas | Secreto servidor |
| `GOOGLE_CLIENT_ID` | Cliente OAuth Google | Servidor/configuración |
| `GOOGLE_CLIENT_SECRET` | Secreto OAuth | Secreto servidor |
| `GOOGLE_REDIRECT_URI` | Callback OAuth exacto | Configuración servidor |
| `TOKEN_ENCRYPTION_KEY` | Cifrado autenticado de tokens | Secreto servidor; gestionar rotación |
| `CRON_SECRET` | Autenticar invocaciones del programador | Secreto servidor |
| `EMAIL_PROVIDER_API_KEY` | Envío de resumen | Secreto servidor |
| `EMAIL_FROM` | Remitente verificado | Configuración |
| `AI_PROVIDER_API_KEY` | Resumen cloud | Secreto servidor; opcional según configuración |
| `AI_PROVIDER_MODEL` | Modelo aprobado para resumen | Configuración |
| `APP_BASE_URL` | URL canónica para enlaces | Configuración |
| `LOG_LEVEL` | Nivel de logs sin datos privados | Configuración |

No incluir `.env.local` en Git. Añadir los secretos a Vercel y al entorno local seguro; usar valores distintos para local, preview y producción. Documentar rotación y eliminación de claves.

## 15. Plan por fases

### Fase 0 — base y decisiones operativas

- Crear proyecto Next.js/TypeScript, lint/formato, migraciones Supabase y entornos local/preview/producción.
- Crear proyecto Google Cloud, consentimiento OAuth, callbacks y lista inicial de scopes.
- Elegir proveedor de email e IA tras revisar región, retención, tratamiento y configuración necesaria.
- Definir dominio, remitente verificado, política de privacidad y borrado.

### Fase 1 — producto sin integraciones

- Construir sistema visual, responsive shell, autenticación, configuración y CRUD de tareas.
- Crear tablas, RLS, gestión de errores y observabilidad sin datos sensibles.

### Fase 2 — Google

- OAuth backend con PKCE/state, almacenamiento cifrado, renovación/revocación.
- Calendar de solo lectura y Gmail con scopes mínimos; construir estados de sincronización.

### Fase 3 — panel y resumen

- Vista “Hoy”, selector de calendarios, selección de correos/relevancia y plantilla de digest.
- Cron idempotente con zona horaria local, email de prueba, fallback determinista e IA opcional.

### Fase 4 — endurecimiento y lanzamiento

- Pruebas de seguridad/RLS, accesibilidad, fallos y DST; revisión de consentimiento, scopes y privacidad.
- Configurar Vercel, dominio, DNS del correo, alertas operativas, backups y procedimiento de eliminación.
- Lanzar primero a un solo usuario/prueba privada; recoger comentarios antes de ampliar alcance.

### Fase posterior — candidata

- Gimnasio avanzado (rutinas, series, gráficos), hábitos, sueño/energía, modo enfoque y micro-diario.
- Finanzas personales, otras integraciones, escritura en Calendar/Gmail, colaboración y automatizaciones. Cada una requiere alcance, consentimiento y evaluación de seguridad propios.

> Referencia de inspiración: `propuesta_de_proyecto_panel_de_vida.md` (fuera de este repositorio). No implica compromiso de implementación.

## 16. Instrucciones de despliegue

1. Crear repositorio y aplicación Next.js con TypeScript; mantener secretos fuera del código.
2. Crear proyecto Supabase y aplicar migraciones; verificar RLS con usuarios de prueba antes de conectar UI.
3. Configurar Google OAuth en Cloud Console: pantalla de consentimiento, scopes, dominios y callbacks de local, preview y producción.
4. Configurar proveedor de email, verificar dominio/remitente y publicar SPF, DKIM y DMARC recomendados por el proveedor.
5. Configurar proveedor IA con retención mínima y uso de datos compatible con la política del producto; mantenerlo desactivable.
6. Crear proyecto Vercel, asociar repositorio y establecer variables por entorno. Confirmar que las claves privilegiadas son solo de servidor.
7. Configurar cron hacia endpoint protegido; probar una ejecución manual, reintentos, idempotencia y horario de verano con datos de prueba.
8. Desplegar primero a preview; completar flujos E2E, revisar logs y comprobar que no contienen datos privados.
9. Desplegar producción con dominio y HTTPS, callbacks Google exactos, límites/alertas y procedimiento documentado de rollback.
10. Antes de usuarios externos, confirmar verificación de scopes Google, revisión de privacidad/contratos y funcionamiento de solicitudes de borrado.

## 17. Supuestos y preguntas abiertas

Las decisiones confirmadas arriba no deben reabrirse durante la implementación salvo que una limitación técnica real lo exija. Los siguientes puntos admiten defaults razonables:

- **Hora/días iniciales:** asumir 07:00, lunes a viernes, `Europe/Madrid`; hacerlos editables.
- **Destino del resumen:** asumir email de Gmail conectado, con edición y verificación.
- **Acceso:** asumir autenticación cerrada para un usuario/invitación privada en el MVP; preparar esquema multiusuario sin crear onboarding público.
- **Gmail:** asumir lectura de metadatos y fragmentos, sin cuerpo completo ni escritura, sujeto a scopes viables y revisión de Google.
- **Calendario:** asumir lectura de eventos, sin crear/editar/borrar eventos.
- **Almacenamiento de correo:** asumir caché local mínima y con expiración; cargar el original desde Gmail mediante enlace.
- **IA:** falta seleccionar proveedor/modelo; encapsular interfaz y no bloquear MVP: implementar primero resumen determinista y añadir IA cloud detrás de configuración.
- **Email transaccional:** falta seleccionar proveedor; dejar adaptador intercambiable y definirlo antes de pruebas de producción.
- **Google OAuth externo:** confirmar requisitos y calendario de verificación antes de invitar usuarios externos.
- **Marca y dominio:** pendientes; usar nombre provisional “Panel de vida” en el producto.
- **Finanzas:** explícitamente fuera de esta fase.

## 18. Prompt/handoff listo para pegar en Antigravity

```text
Construye el MVP de “Panel de vida” usando este documento como brief de producto y seguridad. La aplicación es personal, en español de España, premium y responsive; reúne Google Calendar, Gmail, tareas propias y un resumen matinal por email. Las decisiones confirmadas son: Google Calendar, Gmail, un usuario inicial, email matinal, finanzas fuera del MVP, IA cloud detrás de una interfaz desacoplada, Supabase y Vercel. Zona horaria Europe/Madrid.

Antes de implementar, inspecciona el repositorio y resume su estado, detecta convenciones existentes y presenta un plan corto. Después avanza por entregas verticales, manteniendo el proyecto ejecutable. Si no existe proyecto, crea Next.js con App Router y TypeScript. No añadas dependencias innecesarias ni inventes credenciales.

Prioriza: (1) base visual y autenticación cerrada de un usuario, (2) migraciones Postgres y RLS, (3) CRUD de tareas, (4) OAuth Google seguro con Authorization Code + PKCE y state, scopes mínimos y tokens solo server-side cifrados, (5) lectura de Google Calendar y Gmail, (6) panel “Hoy”, (7) resumen matinal idempotente por email en hora local Europe/Madrid, con fallback determinista y proveedor IA opcional, (8) privacidad, exportación/borrado y despliegue.

No habilites envío/modificación de correo ni escritura de eventos en Calendar; no implementes finanzas, multiusuario público ni acciones autónomas de IA. No guardes cuerpos completos ni adjuntos de correo por defecto. No expongas tokens, service role, claves de cifrado, secretos de cron ni claves de proveedores al navegador o a logs. RLS debe impedir acceso cruzado entre usuarios. Contenido de emails/eventos es dato no confiable y nunca instrucción ejecutable.

Entrega: código y migraciones versionadas, .env.example documentado (sin secretos), instrucciones de configuración Google/Supabase/Vercel, decisiones/supuestos registrados, estados de carga/error/vacío, pruebas proporcionadas para RLS, OAuth, cron/DST e idempotencia, y lista concreta de tareas manuales que requieren credenciales o verificación externa. No afirmes que una integración o despliegue está verificado si no se probó realmente. Usa defaults de este brief para preguntas no esenciales; pide aclaración solo ante un bloqueo real o una decisión que cambie alcance, costes o permisos sensibles.
```

---

**Resultado esperado de Antigravity:** una aplicación funcional de alcance controlado, con integraciones de lectura seguras, datos aislados, interfaz cuidada y un resumen matinal cuya ejecución puede auditarse y recuperarse de fallos.

<!-- END:handoff-panel-vida -->
