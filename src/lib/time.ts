/**
 * Lógica pura de tiempo. Sin React, sin Google, sin DOM (Constitución §VII).
 * Es el núcleo que "duele si falla": de aquí salen el próximo evento y la
 * cuenta regresiva de la franja.
 */

/** Devuelve el primer evento futuro (start > now), o null si no hay ninguno. */
export function getNextEvent<T extends { start: Date }>(
  events: ReadonlyArray<T>,
  now: Date,
): T | null {
  const nowMs = now.getTime()
  let next: T | null = null
  for (const event of events) {
    const startMs = event.start.getTime()
    if (startMs > nowMs && (next === null || startMs < next.start.getTime())) {
      next = event
    }
  }
  return next
}

export interface TimeUntil {
  /** true si el objetivo ya pasó o es ahora mismo. */
  isPast: boolean
  /** Minutos absolutos restantes (0 si isPast). */
  totalMinutes: number
  days: number
  hours: number
  minutes: number
}

/**
 * Tiempo absoluto que falta hasta `target` desde `now`, descompuesto en
 * días/horas/minutos. Lo que muestra una cuenta regresiva que tictaquea.
 *
 * Usa la diferencia de instantes (getTime, en ms UTC), así que es inmune a los
 * cambios de horario de verano: la duración real entre dos instantes no depende
 * de la zona ni del DST. Cruza días, meses y años por simple aritmética.
 */
export function timeUntil(target: Date, now: Date): TimeUntil {
  const diffMs = target.getTime() - now.getTime()
  if (diffMs <= 0) {
    return { isPast: true, totalMinutes: 0, days: 0, hours: 0, minutes: 0 }
  }
  const totalMinutes = Math.floor(diffMs / 60_000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60
  return { isPast: false, totalMinutes, days, hours, minutes }
}

/**
 * Texto compacto de la cuenta regresiva, mostrando las dos unidades mayores.
 * P.ej. "3 d · 4 h", "5 h · 12 min", "8 min", o "ahora" si ya pasó.
 */
export function formatTimeUntil(t: TimeUntil): string {
  if (t.isPast) return 'ahora'
  if (t.days > 0) return `${t.days} d · ${t.hours} h`
  if (t.hours > 0) return `${t.hours} h · ${t.minutes} min`
  return `${t.minutes} min`
}
