# Plan técnico 001 — Grilla zoomable + cuenta regresiva

> Cómo construimos lo descrito en `spec.md`. Debe respetar `constitution.md`.

## 1. Stack

| Capa | Elección | Por qué |
|------|----------|---------|
| Framework | **TanStack Start** (Vite + React 19) | SSR + server functions; el "próximo evento" se renderiza en servidor (RNF-1). |
| Routing | **TanStack Router** (file-based) | Type-safe, integrado en Start. |
| Datos cliente | **TanStack Query** | Caché, revalidación e invalidación tras mutaciones. |
| Auth | **better-auth** (provider Google) | Maneja OAuth, sesión y guarda access/refresh token en la DB (Constitución §III, §V). |
| API externa | **Google Calendar API v3** | Fuente de verdad de eventos. |
| DB | **Neon** (Postgres serverless) | Ya elegida; encaja con server functions. |
| ORM | **Drizzle** | Tipos derivados del esquema, migraciones simples. |
| Validación | **Zod** | Toda entrada externa. |
| Estilos | **Tailwind CSS** | Rápido y consistente. |
| Fechas | **date-fns** + `date-fns-tz` (o **Temporal** polyfill) | Cálculo de tiempo y TZ. Decisión en T-2.1. |
| Animación grilla | **Framer Motion** (layout animations) | Transiciones de zoom: cuadrados que aparecen/reescalan a 60 fps (RNF-3). |
| Drag de eventos | **@dnd-kit** | Arrastrar para mover de día en niveles finos (RF-9). |
| Tests | **Vitest** | Lógica de tiempo, de zoom y server functions. |

## 2. Arquitectura

```
Navegador (React)
  │  loaders / useQuery
  ▼
Server functions (TanStack Start)  ──►  better-auth (sesión + tokens)
  │                                         │
  │  con access token del usuario           ▼
  ├──────────────────────────►  Google Calendar API v3
  └──────────────────────────►  Neon Postgres (Drizzle): metadatos, etiquetas, caché
```

Regla: el cliente nunca llama a Google ni a la DB directamente. Todo pasa por server
functions que (a) verifican sesión, (b) recuperan el token de la cuenta, (c) refrescan si
expiró.

## 3. Modelo de datos (Drizzle / Neon)

Tablas de **better-auth** (generadas): `user`, `session`, `account` (guarda
`accessToken`, `refreshToken`, `accessTokenExpiresAt` de Google), `verification`.

Tablas propias:

```ts
// event_metadata: datos nuestros sobre un evento de Google
event_metadata {
  id            uuid pk
  userId        text  -> user.id
  googleEventId text                 // id del evento en Google
  pinned        boolean default false // ★ fijado (franja + marca en todos los niveles)
  reminderLead  integer  null        // minutos de antelación personalizada
  notes         text     null        // notas privadas
  createdAt, updatedAt timestamptz
  unique(userId, googleEventId)
}

// tag + event_tag (muchos-a-muchos)
tag       { id uuid pk, userId text, name text, color text, unique(userId, name) }
event_tag { eventMetadataId uuid -> event_metadata.id, tagId uuid -> tag.id, pk(both) }
```

Los campos del evento (título, fechas, lugar) **no** se persisten: se leen de Google.

## 4. Server functions (superficie de API)

| Función | Entrada (Zod) | Salida | Notas |
|---------|---------------|--------|-------|
| `getNextEvent` | `{}` | `Event \| null` | Primer evento futuro; usado por la franja (SSR). |
| `listUpcomingEvents` | `{ from?, maxResults }` | `Event[]` | Pinned + próximos para la franja. |
| `listEventsInRange` | `{ start, end }` | `Event[]` | **Núcleo de la grilla**: trae el rango del nivel actual. |
| `getEventCountsByDay` | `{ start, end }` | `Record<date, count>` | Para niveles gruesos (Trimestre/Año): heatmap sin traer cada evento. |
| `createEvent` | `{ title, start, end, location?, description?, allDay? }` | `Event` | POST a Google, invalida queries. |
| `updateEvent` | `{ id, ...campos }` | `Event` | PATCH a Google (incluye mover de día por drag). |
| `deleteEvent` | `{ id }` | `void` | DELETE en Google + limpia metadata. |
| `setEventMetadata` | `{ googleEventId, pinned?, reminderLead?, notes?, tagIds? }` | `EventMetadata` | Upsert en Neon. |
| `listTags` / `createTag` | … | … | Gestión de etiquetas. |

Cada función: `requireSession()` → `getGoogleClient(session)` (refresca token si hace
falta) → llamada. La grilla en niveles gruesos usa `getEventCountsByDay` para no descargar
365 días de eventos completos.

## 5. Rutas (TanStack Router, file-based)

```
/                  → redirige a /app si hay sesión, si no a /login
/login             → botón "Entrar con Google"
/api/auth/$        → handler de better-auth (callback OAuth incluido)
/app               → layout: <NextEventHero> sticky arriba + <ZoomGrid> centrado
/app?level=0..4&date=YYYY-MM-DD   → nivel y fecha-foco como search params (estado en URL)
/app/events/new    → modal/form crear (sobre la grilla)
/app/events/$id    → modal detalle / editar / borrar / fijar / metadatos
```

No hay rutas separadas por vista: **el nivel de zoom es un search param** (`level`), no una
ruta. Así el back/forward del navegador navega el zoom y el estado es compartible.

## 6. Diseño de los dos elementos clave

### 6.1 `<NextEventHero>` (franja sticky superior)
- SSR con el resultado de `getNextEvent` (aparece sin esperar a la grilla).
- Muestra: próximo evento (título, fecha legible, **cuenta regresiva en vivo**
  "en 3 d · 4 h · 12 min") + tarjetas de eventos **fijados ★**.
- El tick de la cuenta regresiva se calcula contra un **instante UTC absoluto** y solo
  arranca tras montar, para evitar desajuste de hidratación.
- Color/urgencia por proximidad, nunca solo color (RNF-5). Estado vacío explícito (RF-11).

### 6.2 `<ZoomGrid>` (grilla zoomable — protagonista)

**Modelo mental:** un nivel = `{ rango de días, layout, renderer de celda }`.

```ts
type ZoomLevel = {
  id: 0|1|2|3|4
  days: number            // 1, 7, ~30, ~90, ~365
  layout: 'day'|'week'|'month'|'compact'|'github'  // disposición
  cell: 'full'|'blocks'|'chips'|'dots'|'heatmap'   // renderer de celda
}
```

- **Regla "todo cabe sin scroll":** el contenedor mide el viewport disponible (debajo de la
  franja) y calcula el **tamaño de celda = f(viewport, nº de columnas del layout)**. Nunca
  se hace scroll; si no cabe el detalle, baja el `cell` renderer.
- **Layout adaptable:**
  - Mes → grilla clásica de **7 de ancho**.
  - Año → **estilo GitHub**: semanas como **columnas** (7 filas de día × ~53 columnas de
    semana) para llenar el ancho y entrar entero en 16:9.
- **Transición de nivel (RF-5):** Framer Motion `layout` + `AnimatePresence`; los cuadrados
  nuevos hacen *enter* y todos reescalan con un `layoutId` por día. Animación ≤ 300 ms.
- **Renderers de celda (degradación):** `full` (Día) → `blocks` (Semana) → `chips` (Mes) →
  `dots`/`count` (Trimestre) → `heatmap` (Año). Niveles gruesos usan `getEventCountsByDay`.
- **Marca ★** dibujada en la celda en todos los niveles (RF-7).
- **Interacción por nivel (RF-9):**
  - Día/Semana/Mes: **@dnd-kit** para arrastrar evento a otro día → `updateEvent`. Click en
    evento → modal `/app/events/$id`. Click en celda vacía → `/app/events/new` con esa fecha.
  - Trimestre/Año: click en celda → **baja un nivel** centrado en esa fecha (cambia `level`
    y `date` en la URL).
- **Estado en URL:** `level` y `date` como search params (sección §5).

### 6.3 Lógica pura, testeada
- `getNextEvent(events, now)` → primer evento con `start > now`.
- `timeUntil(start, now)` → `{ days, hours, minutes }` correcto cruzando mes/año/DST.
- `rangeForLevel(level, focusDate)` → `{ start, end }` del rango a pedir.
- `layoutForLevel(level)` → columnas/filas y renderer de celda.
- Aisladas de React, Google y DOM para poder testearlas (Constitución §VII).

## 7. OAuth / scopes

- Provider Google en better-auth con scopes:
  `openid email profile https://www.googleapis.com/auth/calendar.events`.
- `access_type=offline` + `prompt=consent` la primera vez para obtener **refresh token**.
- Refresh automático en `getGoogleClient` cuando `accessTokenExpiresAt < now`.

## 8. Variables de entorno

```
DATABASE_URL=               # Neon (pooled connection string)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
BETTER_AUTH_SECRET=         # openssl rand -base64 32
BETTER_AUTH_URL=            # http://localhost:3000 en dev
```

`.env` en `.gitignore`; se entrega `.env.example`.

## 9. Riesgos y mitigaciones

- **"Todo cabe sin scroll" con muchos eventos** → la celda se degrada de renderer (chips →
  dots → heatmap) antes que crecer o hacer scroll. El tamaño de celda lo manda el viewport.
- **Fluidez del zoom (365 celdas animadas)** → en nivel Año no animar cada evento, solo el
  heatmap; `layoutId` por día, no por evento; virtualizar si hiciera falta.
- **Desajuste de hidratación en la cuenta regresiva** → texto estable en SSR; `setInterval`
  solo tras montar; cálculo contra timestamp absoluto.
- **Coste de datos en niveles gruesos** → `getEventCountsByDay` (agregado) en vez de traer
  todos los eventos del año.
- **Refresh token ausente** → forzar `prompt=consent`; detectar ausencia y re-pedir.
- **Rate limits de Google** → caché TanStack Query + rangos acotados + backoff.
- **Zonas horarias** → UTC interno; formateo en TZ del usuario.

## 10. Definición de "hecho"

Todos los criterios de aceptación de `spec.md §7` pasan, hay tests verdes de la lógica de
tiempo y de zoom, y `pnpm build` + `pnpm test` pasan en limpio.
