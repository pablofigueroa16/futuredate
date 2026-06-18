# Tareas 001 — Grilla zoomable + cuenta regresiva

> Pasos ordenados derivados de `plan.md`. Marca `[x]` al completar.
> Cada tarea es lo bastante pequeña para revisarse de una sentada.

## Fase 0 — Scaffolding y prerrequisitos

- [x] **T-0.1** Crear proyecto TanStack Start con Vite + React + TypeScript estricto.
- [x] **T-0.2** Añadir Tailwind CSS y estilos base. *(incluido en el scaffold)*
- [x] **T-0.3** Configurar ESLint + Prettier + `tsconfig` estricto. *(scaffold ya trae
      `strict`, `noUnusedLocals/Parameters`, `noFallthroughCasesInSwitch`)*
- [x] **T-0.4** Crear `.env.example` con las variables del plan §8 y `.gitignore`.
- [x] **T-0.5** `git init` y commit inicial del scaffold + specs.
- [x] **T-0.6** *(prerrequisito del usuario)* Crear proyecto en Google Cloud Console,
      habilitar Google Calendar API, crear credenciales OAuth (Web), añadir
      `http://localhost:3000/api/auth/callback/google` como redirect URI. *(credenciales
      en `.env`)*
- [x] **T-0.7** Crear el proyecto/branch Neon y obtener `DATABASE_URL`. *(vía Neon MCP:
      proyecto `futuredate` = project_id `sweet-sun-02862383`, branch `main`, DB `neondb`,
      Postgres 18; connection string pooled en `.env`)*

## Fase 1 — Base de datos y autenticación

- [x] **T-1.1** Instalar y configurar Drizzle + driver Neon serverless. *(`src/db/`)*
- [x] **T-1.2** Instalar better-auth; configurar provider Google con los scopes del plan §7.
      *(`src/auth/server.ts`; `accessType: offline`, `prompt: consent`)*
- [x] **T-1.3** Esquema Drizzle: tablas de better-auth + `event_metadata` (con `pinned`),
      `tag`, `event_tag`. *(`src/db/schema.ts`)*
- [x] **T-1.4** Generar y aplicar la primera migración a Neon. *(7 tablas verificadas vía
      MCP en el proyecto `sweet-sun-02862383`)*
- [x] **T-1.5** Ruta `/api/auth/$` (handler better-auth) y página `/login` con botón Google.
      *(`/api/auth/ok` → `{ok:true}`, `/api/auth/get-session` → `null`, `/login` → 200)*
- [x] **T-1.6** Helper `requireSession()` y `getGoogleAccessToken()` con refresh de token.
      *(`src/auth/session.ts`)*
- [x] **T-1.7** Verificar: login → consent → sesión persistida → refresh funciona.
      *(login real exitoso; user + account con refresh_token guardado en Neon, scopes
      Calendar+email+profile+openid confirmados vía MCP.)*

## Fase 2 — Lógica pura (TDD)

- [x] **T-2.1** Decidir librería de fechas (date-fns vs Temporal) y justificar. *(date-fns 4:
      maduro, tree-shakeable, sin polyfill pesado; `timeUntil` usa ms UTC → inmune a DST)*
- [x] **T-2.2** Tests + impl de `getNextEvent(events, now)` (vacío, todo pasado, cruce mes/año,
      en curso, desordenado). *(`src/lib/time.ts`)*
- [x] **T-2.3** Tests + impl de `timeUntil(start, now)` (minutos, días, cruce de año, DST).
      *(`src/lib/time.ts`)*
- [x] **T-2.4** Tests + impl de `rangeForLevel(level, focusDate)` (rango de cada nivel 0–4,
      expandido a semanas completas). *(`src/lib/zoom.ts`)*
- [x] **T-2.5** Tests + impl de `layoutForLevel(level)` (renderer por nivel; año = GitHub,
      semanas en columnas). *(`src/lib/zoom.ts`)*

> ✅ 23 tests en verde (`time.test.ts`, `zoom.test.ts`); tipo `CalendarEvent` compartido en
> `src/lib/calendar-event.ts`.

## Fase 3 — Franja "Próximo"

- [x] **T-3.1** Server function `loadAppData` que lee Google Calendar y mapea a
      `CalendarEvent` (Zod en `google-calendar.ts`); guard de sesión + redirect. *(verificado
      en runtime: `/app` sin sesión → 307 /login)*
- [x] **T-3.2** `<NextEventHero>` sticky con SSR del próximo evento. *(`src/components/`)*
- [x] **T-3.3** Cuenta regresiva en vivo sin desajuste de hidratación (`Countdown`, base =
      `now` del servidor hasta montar; plan §6.1).
- [x] **T-3.4** Tarjetas de eventos fijados ★ en la franja. *(render listo; el "fijar" llega
      en Fase 6, hasta entonces la lista de pinned va vacía)*
- [x] **T-3.5** Estado vacío (RF-11, "No tienes nada próximo") y `pendingComponent` /
      `errorComponent` de la ruta `/app`.
- [~] **Checkpoint:** la franja muestra el próximo evento y su countdown nada más abrir. 🎯
      *(server path verificado; falta confirmación visual autenticada en el navegador del
      usuario — requiere :3000 libre de Progressia)*

## Fase 4 — Grilla zoomable (el protagonista)

- [x] **T-4.1** Server function `loadCalendarView` (Zod): eventos del rango + agregados por
      día; finos llevan eventos, gruesos solo conteo (heatmap). *(`src/server/events.ts`)*
- [x] **T-4.2** `<ZoomGrid>` + `<ZoomControl>`; `level` y `date` en search params de `/app`
      (back/forward navega el zoom).
- [x] **T-4.3** Medición de viewport (`useElementSize`) → tamaño de celda = f(viewport,
      cols/filas); la grilla se centra y cabe sin scroll (RF-4, RNF-2).
- [x] **T-4.4** Renderers de celda por nivel: `full` (día), `blocks` (semana), `chips` (mes),
      `dots` (trimestre), `heatmap` (año) (RF-6).
- [x] **T-4.5** Layout adaptable: Mes/Trimestre 7-ancho; **Año estilo GitHub** (semanas en
      columnas, 7 filas) (RF-5).
- [x] **T-4.6** Transición animada entre niveles con `motion` (`layout` + key por día,
      enter/exit) (RF-5).
- [x] **T-4.7** Marca ★ (pin) en la celda en todos los niveles cuando el día tiene un
      evento fijado (RF-7).
- [x] **T-4.8** Interacción: Trimestre/Año click → baja un nivel sobre esa fecha; Mes/Semana
      → salta al Día (RF-9). Navegación ◀ ▶ por periodo + botón "Hoy".
- [~] **Checkpoint:** en nivel Año, todos los eventos del año caben **sin scroll**; subir de
      nivel anima los cuadrados; un evento a 40 días se ve marcado. 🎯
      *(código y build verificados; confirmación visual autenticada pendiente en el
      navegador del usuario)*

## Fase 5 — Escritura (crear / editar / borrar / mover)

- [x] **T-5.1** Server functions `createEvent`, `updateEvent`, `deleteEvent` (Zod + Google).
      *(`src/server/event-mutations.ts`; escritura en `src/lib/google-calendar.ts`)*
- [x] **T-5.2** Formulario clásico crear/editar (modal `EventForm` sobre la grilla; ＋ Crear
      en la barra, click en evento del Día → editar). *Mover = cambiar la fecha en el form.*
- [ ] **T-5.3** Arrastrar evento de día con @dnd-kit en Día/Semana/Mes → `updateEvent` (RF-9).
      *(pendiente; "mover" ya funciona vía formulario. El drag requiere reestructurar las
      celdas (chips arrastrables, celda droppable) e iteración visual.)*
- [x] **T-5.4** Invalidación del loader (`router.invalidate()`) tras cada mutación;
      `window.confirm` antes de borrar.
- [ ] **Checkpoint:** crear/editar/borrar/mover se refleja en calendar.google.com. 🎯

## Fase 6 — Fijar y metadatos propios

- [x] **T-6.1** Server functions `setEventMetadata` (incl. `pinned`), `getEventMetadata`,
      `listTags`, `createTag`. *(`src/server/metadata.ts`; upsert + reemplazo de etiquetas)*
- [x] **T-6.2** Acción "fijar ★" en el modal de edición → aparece en la franja (pinnedUpcoming)
      y se marca en la grilla (★ por celda y por evento en vista Día).
- [x] **T-6.3** UI de etiquetas (toggle + crear) y recordatorio (select) en el modal de edición.
- [x] **T-6.4** Persistencia tras recargar: `loadCalendarView` enriquece los eventos con
      `pinned`+`tags`; `getEventMetadata` rellena el form al reabrir (RF-10).

## Fase 7 — Pulido y cierre

- [ ] **T-7.1** Accesibilidad: franja `aria-live`; navegación de niveles por teclado (RNF-5).
- [ ] **T-7.2** Fluidez del zoom con muchos eventos: degradar detalle, no fps (RNF-3).
- [ ] **T-7.3** Manejo de rate limits / errores de Google con reintentos (RNF-7).
- [ ] **T-7.4** Repaso de zonas horarias con un evento en otra TZ (RNF-6).
- [ ] **T-7.5** `pnpm build` + `pnpm test` en verde; revisar todos los criterios de §7.

## Decisiones pendientes (de spec §9)

- [ ] **Multi-año:** ¿varios años a la vez o navegación año-por-año ◀ ▶? (decidir tras ver
      el nivel Año real; inclinado a botón).
- [ ] ¿Existe un nivel 5 más allá del año?
- [ ] ¿Notificación del navegador además de recordatorio visual? (antes de Fase 4 final)
- [ ] ¿Quick-add con lenguaje natural además del formulario clásico?
