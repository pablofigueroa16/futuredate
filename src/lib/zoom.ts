import {
  addDays,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
} from 'date-fns'

/**
 * Lógica pura del zoom semántico de la grilla (plan.md §6.2).
 * El zoom no agranda píxeles: cambia cuántos días se muestran. Cada nivel
 * tiene un rango de días y una forma de pintar la celda. Regla: en cada nivel
 * todos los cuadrados caben en pantalla (la disposición se adapta).
 */

export type ZoomLevelId = 0 | 1 | 2 | 3 | 4

export type GridLayout = 'day' | 'week' | 'month' | 'compact' | 'github'
export type CellRenderer = 'full' | 'blocks' | 'chips' | 'dots' | 'heatmap'

/** La semana empieza en lunes (es-ES). */
const WEEK_OPTS = { weekStartsOn: 1 } as const

/** Rango de días [start, end) — end es exclusivo y siempre a inicio de día. */
export interface DateRange {
  start: Date
  end: Date
}

export interface ZoomLevel {
  id: ZoomLevelId
  name: string
  layout: GridLayout
  cell: CellRenderer
  /** En 'github' (año) las semanas son columnas: 7 filas de día. */
  weekAsColumn: boolean
}

export const ZOOM_LEVELS: Record<ZoomLevelId, ZoomLevel> = {
  0: { id: 0, name: 'Día', layout: 'day', cell: 'full', weekAsColumn: false },
  1: { id: 1, name: 'Semana', layout: 'week', cell: 'blocks', weekAsColumn: false },
  2: { id: 2, name: 'Mes', layout: 'month', cell: 'chips', weekAsColumn: false },
  3: { id: 3, name: 'Trimestre', layout: 'compact', cell: 'dots', weekAsColumn: false },
  4: { id: 4, name: 'Año', layout: 'github', cell: 'heatmap', weekAsColumn: true },
}

export function layoutForLevel(level: ZoomLevelId): ZoomLevel {
  return ZOOM_LEVELS[level]
}

/** Expande [firstDay, lastDay] a semanas completas (lunes→domingo). */
function fullWeeksRange(firstDay: Date, lastDay: Date): DateRange {
  const start = startOfWeek(startOfDay(firstDay), WEEK_OPTS)
  const lastInclusive = endOfWeek(startOfDay(lastDay), WEEK_OPTS)
  return { start, end: startOfDay(addDays(lastInclusive, 1)) }
}

/**
 * Rango de días a mostrar en cada nivel, anclado a `focus`.
 * - 0 Día: solo ese día.
 * - 1 Semana: la semana (lunes→domingo) que lo contiene.
 * - 2/3/4: mes / trimestre / año, expandidos a semanas completas para que la
 *   grilla forme un rectángulo limpio (clave para el layout tipo GitHub).
 */
export function rangeForLevel(level: ZoomLevelId, focus: Date): DateRange {
  switch (level) {
    case 0: {
      const start = startOfDay(focus)
      return { start, end: addDays(start, 1) }
    }
    case 1: {
      const start = startOfWeek(focus, WEEK_OPTS)
      return { start, end: addDays(start, 7) }
    }
    case 2:
      return fullWeeksRange(startOfMonth(focus), endOfMonth(focus))
    case 3:
      return fullWeeksRange(startOfQuarter(focus), endOfQuarter(focus))
    case 4:
      return fullWeeksRange(startOfYear(focus), endOfYear(focus))
  }
}
