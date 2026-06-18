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

- [ ] **T-1.1** Instalar y configurar Drizzle + driver Neon serverless.
- [ ] **T-1.2** Instalar better-auth; configurar provider Google con los scopes del plan §7.
- [ ] **T-1.3** Esquema Drizzle: tablas de better-auth + `event_metadata` (con `pinned`),
      `tag`, `event_tag`.
- [ ] **T-1.4** Generar y aplicar la primera migración a Neon.
- [ ] **T-1.5** Ruta `/api/auth/$` (handler better-auth) y página `/login` con botón Google.
- [ ] **T-1.6** Helper `requireSession()` y `getGoogleClient(session)` con refresh de token.
- [ ] **T-1.7** Verificar: login → consent → sesión persistida → refresh funciona.

## Fase 2 — Lógica pura (TDD)

- [ ] **T-2.1** Decidir librería de fechas (date-fns vs Temporal) y justificar.
- [ ] **T-2.2** Tests + impl de `getNextEvent(events, now)` (vacío, todo pasado, cruce mes/año).
- [ ] **T-2.3** Tests + impl de `timeUntil(start, now)` (minutos, días, cruce de año, DST).
- [ ] **T-2.4** Tests + impl de `rangeForLevel(level, focusDate)` (rango de cada nivel 0–4).
- [ ] **T-2.5** Tests + impl de `layoutForLevel(level)` (columnas/filas y renderer; año = GitHub).

## Fase 3 — Franja "Próximo"

- [ ] **T-3.1** Server functions `getNextEvent`, `listUpcomingEvents` (Zod) + mapeo a `Event`.
- [ ] **T-3.2** `<NextEventHero>` sticky con SSR del próximo evento.
- [ ] **T-3.3** Cuenta regresiva en vivo sin desajuste de hidratación (plan §6.1).
- [ ] **T-3.4** Tarjetas de eventos fijados ★ en la franja.
- [ ] **T-3.5** Estado vacío (RF-11) y estados cargando/error.
- [ ] **Checkpoint:** la franja muestra el próximo evento y su countdown nada más abrir. 🎯

## Fase 4 — Grilla zoomable (el protagonista)

- [ ] **T-4.1** Server functions `listEventsInRange` y `getEventCountsByDay` (Zod).
- [ ] **T-4.2** `<ZoomGrid>` con control de nivel; `level` y `date` en search params (URL).
- [ ] **T-4.3** Medición de viewport → **tamaño de celda = f(viewport, columnas)**; garantizar
      "todo cabe sin scroll" en cada nivel (RF-4, RNF-2).
- [ ] **T-4.4** Renderers de celda por nivel: `full`/`blocks`/`chips`/`dots`/`heatmap` (RF-6).
- [ ] **T-4.5** Layout adaptable: Mes 7-ancho; **Año estilo GitHub** (semanas en columnas) (RF-5).
- [ ] **T-4.6** Transición animada entre niveles con Framer Motion (`layoutId` por día) (RF-5).
- [ ] **T-4.7** Marca ★ en la celda en los 5 niveles (RF-7).
- [ ] **T-4.8** Interacción: Trimestre/Año click → baja de nivel sobre esa fecha (RF-9).
- [ ] **Checkpoint:** en nivel Año, todos los eventos del año caben **sin scroll**; subir de
      nivel anima los cuadrados; un evento a 40 días se ve marcado. 🎯

## Fase 5 — Escritura (crear / editar / borrar / mover)

- [ ] **T-5.1** Server functions `createEvent`, `updateEvent`, `deleteEvent` (Zod + Google).
- [ ] **T-5.2** Formulario clásico crear/editar (`/app/events/new`, `/app/events/$id`).
- [ ] **T-5.3** Arrastrar evento de día con @dnd-kit en Día/Semana/Mes → `updateEvent` (RF-9).
- [ ] **T-5.4** Invalidación de queries tras cada mutación; confirmación antes de borrar.
- [ ] **Checkpoint:** crear/editar/borrar/mover se refleja en calendar.google.com. 🎯

## Fase 6 — Fijar y metadatos propios

- [ ] **T-6.1** Server functions `setEventMetadata` (incl. `pinned`), `listTags`, `createTag`.
- [ ] **T-6.2** Acción "fijar ★" en el detalle → aparece en franja y se marca en la grilla.
- [ ] **T-6.3** UI de etiquetas y antelación de recordatorio en el detalle del evento.
- [ ] **T-6.4** Persistencia tras recargar (RF-10).

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
