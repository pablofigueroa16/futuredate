# FutureDate

Calendario personal sincronizado con Google Calendar, construido con **TanStack Start**.

Sus dos rasgos distintivos:

1. **Franja "Próximo" sticky:** siempre ves cuánto falta para tu próximo evento (y los que
   fijes con ★), aunque caigan en un mes futuro, sin hacer scroll.
2. **Grilla zoomable estilo GitHub:** una sola grilla de días con **zoom semántico**. El
   zoom no agranda píxeles: cambia *cuántos días* se muestran (Día → Semana → Mes →
   Trimestre → Año), y **en cada nivel todo cabe en pantalla sin scroll**. Al alejar, los
   cuadrados aparecen con animación y su contenido se simplifica (evento → chip → punto →
   heatmap).

## Cómo trabajamos: Spec-Driven Development (SDD)

No se escribe código que no esté respaldado por una spec aprobada. El flujo es:

```
constitution.md   →   spec.md        →   plan.md          →   tasks.md        →   código
(principios        (QUÉ y POR QUÉ,     (CÓMO técnico,       (pasos ordenados,
 no negociables)    sin tecnología)     stack y diseño)      ejecutables)
```

Specs vivas en [`specs/`](./specs).

| Documento | Pregunta que responde |
|-----------|-----------------------|
| [`specs/constitution.md`](./specs/constitution.md) | ¿Qué reglas nunca rompemos? |
| [`specs/001-agenda-cuenta-regresiva/spec.md`](./specs/001-agenda-cuenta-regresiva/spec.md) | ¿Qué hace el producto y para quién? |
| [`specs/001-agenda-cuenta-regresiva/plan.md`](./specs/001-agenda-cuenta-regresiva/plan.md) | ¿Con qué y cómo lo construimos? |
| [`specs/001-agenda-cuenta-regresiva/tasks.md`](./specs/001-agenda-cuenta-regresiva/tasks.md) | ¿En qué orden lo hacemos? |

## Stack

- **TanStack Start** (React + Router + Query, SSR, server functions)
- **Google Calendar API v3** vía OAuth 2.0 (Authorization Code)
- **Neon** (Postgres serverless) + **Drizzle ORM**
- **better-auth** para login con Google y almacenamiento seguro de tokens
- **Tailwind CSS** + componentes propios
- **TypeScript** estricto, **Zod** para validación, **Vitest** para tests

## Estado

🟢 **Fase 2 completada** — lógica pura de tiempo y zoom con TDD (date-fns): `getNextEvent`,
`timeUntil` (inmune a DST), `rangeForLevel` y `layoutForLevel`, con **23 tests en verde**.
La Fase 1 (auth Google + DB Neon) ya estaba verificada de punta a punta. Siguiente:
**Fase 3** (franja "Próximo" con cuenta regresiva en vivo). Ver
[`tasks.md`](./specs/001-agenda-cuenta-regresiva/tasks.md).

## Desarrollo

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build      # build de producción (cliente + SSR)
pnpm test       # vitest
pnpm lint       # eslint
```
