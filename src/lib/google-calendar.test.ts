import { describe, expect, it } from 'vitest'
import { toEventDate } from './google-calendar'

describe('toEventDate', () => {
  it('día completo: medianoche local, sin desplazarse de día por la zona', () => {
    const d = toEventDate('2026-06-18', true)
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(5) // junio
    expect(d.getDate()).toBe(18)
    expect(d.getHours()).toBe(0)
  })

  it('con hora: instante absoluto (respeta el offset)', () => {
    const d = toEventDate('2026-06-18T10:00:00Z', false)
    expect(d.getTime()).toBe(Date.parse('2026-06-18T10:00:00Z'))
  })
})
