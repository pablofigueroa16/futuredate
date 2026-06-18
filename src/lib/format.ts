import { format, getQuarter, isSameDay, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import type { ZoomLevelId } from './zoom'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Clave de día estable en hora local: "2026-06-18". */
export function dayKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/** "Jueves 18 de junio, 10:00" (o sin hora si es de día completo). */
export function formatEventWhen(
  event: { start: Date; allDay: boolean },
  now: Date,
): string {
  const start = new Date(event.start)
  if (isSameDay(start, now) && !event.allDay) {
    return `Hoy, ${format(start, 'HH:mm')}`
  }
  const pattern = event.allDay
    ? "EEEE d 'de' MMMM"
    : "EEEE d 'de' MMMM, HH:mm"
  return cap(format(start, pattern, { locale: es }))
}

/** Título del periodo enfocado según el nivel de zoom. */
export function formatPeriod(level: ZoomLevelId, focus: Date): string {
  switch (level) {
    case 0:
      return cap(format(focus, "EEEE d 'de' MMMM yyyy", { locale: es }))
    case 1: {
      const ws = startOfWeek(focus, { weekStartsOn: 1 })
      return `Semana del ${cap(format(ws, "d 'de' MMMM", { locale: es }))}`
    }
    case 2:
      return cap(format(focus, 'MMMM yyyy', { locale: es }))
    case 3:
      return `T${getQuarter(focus)} ${format(focus, 'yyyy')}`
    case 4:
      return format(focus, 'yyyy')
  }
}
