import { format, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

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
