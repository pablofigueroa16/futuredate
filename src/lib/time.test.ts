import { describe, expect, it } from 'vitest'
import { formatTimeUntil, getNextEvent, timeUntil } from './time'

const ev = (id: string, iso: string) => ({ id, start: new Date(iso) })

describe('getNextEvent', () => {
  const now = new Date('2026-06-18T10:00:00Z')

  it('devuelve null si no hay eventos', () => {
    expect(getNextEvent([], now)).toBeNull()
  })

  it('devuelve null si todos son pasados', () => {
    const events = [ev('a', '2026-06-18T09:59:00Z'), ev('b', '2026-01-01T00:00:00Z')]
    expect(getNextEvent(events, now)).toBeNull()
  })

  it('ignora un evento exactamente "ahora" (necesita start > now)', () => {
    expect(getNextEvent([ev('a', '2026-06-18T10:00:00Z')], now)).toBeNull()
  })

  it('elige el futuro más cercano aunque la lista esté desordenada', () => {
    const events = [
      ev('lejano', '2026-12-25T00:00:00Z'),
      ev('cercano', '2026-06-18T10:30:00Z'),
      ev('medio', '2026-07-01T00:00:00Z'),
    ]
    expect(getNextEvent(events, now)?.id).toBe('cercano')
  })

  it('ignora un evento en curso (empezó antes de now) y toma el siguiente', () => {
    const events = [ev('enCurso', '2026-06-18T09:00:00Z'), ev('siguiente', '2026-06-20T08:00:00Z')]
    expect(getNextEvent(events, now)?.id).toBe('siguiente')
  })

  it('cruza el límite de mes', () => {
    const now2 = new Date('2026-06-30T23:00:00Z')
    const events = [ev('julio', '2026-07-01T09:00:00Z')]
    expect(getNextEvent(events, now2)?.id).toBe('julio')
  })

  it('cruza el límite de año', () => {
    const now2 = new Date('2026-12-31T23:30:00Z')
    const events = [ev('añoNuevo', '2027-01-01T00:00:00Z')]
    expect(getNextEvent(events, now2)?.id).toBe('añoNuevo')
  })
})

describe('timeUntil', () => {
  it('marca isPast cuando el objetivo ya pasó', () => {
    const r = timeUntil(new Date('2026-06-18T09:00:00Z'), new Date('2026-06-18T10:00:00Z'))
    expect(r.isPast).toBe(true)
    expect(r.totalMinutes).toBe(0)
  })

  it('marca isPast cuando es exactamente ahora', () => {
    const t = new Date('2026-06-18T10:00:00Z')
    expect(timeUntil(t, t).isPast).toBe(true)
  })

  it('solo minutos', () => {
    const r = timeUntil(new Date('2026-06-18T10:45:00Z'), new Date('2026-06-18T10:00:00Z'))
    expect(r).toMatchObject({ isPast: false, days: 0, hours: 0, minutes: 45 })
  })

  it('horas y minutos', () => {
    const r = timeUntil(new Date('2026-06-18T13:30:00Z'), new Date('2026-06-18T10:00:00Z'))
    expect(r).toMatchObject({ days: 0, hours: 3, minutes: 30 })
  })

  it('días, horas y minutos a la vez', () => {
    const r = timeUntil(new Date('2026-06-21T14:24:00Z'), new Date('2026-06-18T10:00:00Z'))
    expect(r).toMatchObject({ days: 3, hours: 4, minutes: 24 })
    expect(r.totalMinutes).toBe(3 * 24 * 60 + 4 * 60 + 24)
  })

  it('cruza el cambio de año (evento a 40 días vista)', () => {
    const r = timeUntil(new Date('2027-01-27T10:00:00Z'), new Date('2026-12-18T10:00:00Z'))
    expect(r.days).toBe(40)
  })

  it('es inmune al horario de verano: 72h absolutas = 3 días exactos', () => {
    // Rango que en zonas con DST "saltaría" una hora de pared, pero la
    // duración absoluta entre instantes no cambia.
    const now = new Date('2026-03-29T00:00:00Z')
    const target = new Date('2026-04-01T00:00:00Z')
    expect(timeUntil(target, now)).toMatchObject({ days: 3, hours: 0, minutes: 0 })
  })
})

describe('formatTimeUntil', () => {
  const fmt = (target: string, now: string) =>
    formatTimeUntil(timeUntil(new Date(target), new Date(now)))

  it('días y horas', () => {
    expect(fmt('2026-06-21T14:00:00Z', '2026-06-18T10:00:00Z')).toBe('3 d · 4 h')
  })
  it('horas y minutos', () => {
    expect(fmt('2026-06-18T13:30:00Z', '2026-06-18T10:00:00Z')).toBe('3 h · 30 min')
  })
  it('solo minutos', () => {
    expect(fmt('2026-06-18T10:08:00Z', '2026-06-18T10:00:00Z')).toBe('8 min')
  })
  it('pasado → "ahora"', () => {
    expect(fmt('2026-06-18T09:00:00Z', '2026-06-18T10:00:00Z')).toBe('ahora')
  })
})
