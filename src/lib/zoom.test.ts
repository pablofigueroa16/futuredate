import { describe, expect, it } from 'vitest'
import {
  differenceInCalendarDays,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  getDay,
  startOfMonth,
  startOfQuarter,
  startOfYear,
} from 'date-fns'
import { layoutForLevel, rangeForLevel } from './zoom'
import type { ZoomLevelId } from './zoom'

// Fecha foco construida con componentes locales para no depender de la TZ de la máquina.
const focus = new Date(2026, 5, 18) // jue 18 jun 2026

const days = (level: ZoomLevelId) => {
  const r = rangeForLevel(level, focus)
  return differenceInCalendarDays(r.end, r.start)
}
const ms = (d: Date) => d.getTime()

describe('layoutForLevel', () => {
  it('mapea los 5 niveles por nombre', () => {
    expect(layoutForLevel(0).name).toBe('Día')
    expect(layoutForLevel(1).name).toBe('Semana')
    expect(layoutForLevel(2).name).toBe('Mes')
    expect(layoutForLevel(3).name).toBe('Trimestre')
    expect(layoutForLevel(4).name).toBe('Año')
  })

  it('el año usa grilla tipo GitHub: semanas en columnas + heatmap', () => {
    expect(layoutForLevel(4)).toMatchObject({
      layout: 'github',
      cell: 'heatmap',
      weekAsColumn: true,
    })
  })

  it('los niveles finos no rotan la grilla', () => {
    expect(layoutForLevel(0).weekAsColumn).toBe(false)
    expect(layoutForLevel(2).weekAsColumn).toBe(false)
  })
})

describe('rangeForLevel', () => {
  it('todos los rangos empiezan a inicio de día (00:00)', () => {
    for (const lvl of [0, 1, 2, 3, 4] as const) {
      const { start } = rangeForLevel(lvl, focus)
      expect([start.getHours(), start.getMinutes(), start.getSeconds()]).toEqual([0, 0, 0])
    }
  })

  it('Día = 1 día', () => {
    expect(days(0)).toBe(1)
  })

  it('Semana = 7 días y empieza en lunes', () => {
    expect(days(1)).toBe(7)
    expect(getDay(rangeForLevel(1, focus).start)).toBe(1)
  })

  it('Mes: múltiplo de 7, empieza en lunes y cubre el mes entero', () => {
    const r = rangeForLevel(2, focus)
    expect(days(2) % 7).toBe(0)
    expect(getDay(r.start)).toBe(1)
    expect(ms(r.start)).toBeLessThanOrEqual(ms(startOfMonth(focus)))
    expect(ms(r.end)).toBeGreaterThan(ms(endOfMonth(focus)))
  })

  it('Trimestre: múltiplo de 7 y cubre el trimestre entero (~90 días)', () => {
    const r = rangeForLevel(3, focus)
    expect(days(3) % 7).toBe(0)
    expect(getDay(r.start)).toBe(1)
    expect(ms(r.start)).toBeLessThanOrEqual(ms(startOfQuarter(focus)))
    expect(ms(r.end)).toBeGreaterThan(ms(endOfQuarter(focus)))
    expect(days(3)).toBeGreaterThanOrEqual(90)
  })

  it('Año: múltiplo de 7, ~53 semanas y cubre el año entero sin scroll', () => {
    const r = rangeForLevel(4, focus)
    expect(days(4) % 7).toBe(0)
    expect(getDay(r.start)).toBe(1)
    const weeks = days(4) / 7
    expect(weeks).toBeGreaterThanOrEqual(52)
    expect(weeks).toBeLessThanOrEqual(54)
    expect(ms(r.start)).toBeLessThanOrEqual(ms(startOfYear(focus)))
    expect(ms(r.end)).toBeGreaterThan(ms(endOfYear(focus)))
  })
})
