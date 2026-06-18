import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { redirect } from '@tanstack/react-router'
import { eachDayOfInterval, subDays } from 'date-fns'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { auth } from '../auth/server'
import { getGoogleAccessToken } from '../auth/session'
import { db } from '../db'
import { eventMetadata } from '../db/schema'
import { dayKey } from '../lib/format'
import { fetchUpcomingEvents } from '../lib/google-calendar'
import { getNextEvent } from '../lib/time'
import { rangeForLevel } from '../lib/zoom'
import type { ZoomLevelId } from '../lib/zoom'
import type { CalendarEvent } from '../lib/calendar-event'

/** Una celda-día de la grilla. `events` solo se puebla en niveles finos (≤ 2). */
export interface DayCell {
  key: string // yyyy-MM-dd
  date: Date
  count: number
  pinned: boolean
  events: CalendarEvent[]
}

export interface CalendarView {
  user: { name: string; email: string; image: string | null }
  now: Date
  level: ZoomLevelId
  range: { start: Date; end: Date }
  // Franja "Próximo" (siempre desde ahora, independiente del rango de la grilla):
  nextEvent: CalendarEvent | null
  pinnedUpcoming: CalendarEvent[]
  // Grilla:
  days: DayCell[]
}

const ViewInput = z.object({
  level: z.coerce.number().int().min(0).max(4),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

/**
 * Carga todo lo que la vista necesita en un solo viaje:
 * - franja "Próximo" (próximo evento futuro + fijados), desde ahora.
 * - grilla: eventos del rango del nivel actual, agregados por día. En niveles
 *   gruesos (trimestre/año) cada celda lleva solo el conteo (heatmap); en finos
 *   lleva los eventos completos. Ver plan.md §4 y §6.2.
 */
export const loadCalendarView = createServerFn({ method: 'GET' })
  .validator((input: unknown) => ViewInput.parse(input))
  .handler(async ({ data }): Promise<CalendarView> => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) {
      throw redirect({ to: '/login' })
    }

    const userId = session.user.id
    const token = await getGoogleAccessToken(userId)
    const now = new Date()
    const level = data.level as ZoomLevelId
    const focus = new Date(`${data.date}T12:00:00`)
    const range = rangeForLevel(level, focus)

    // Ids fijados (★) del usuario.
    const pinnedRows = await db
      .select({ googleEventId: eventMetadata.googleEventId })
      .from(eventMetadata)
      .where(and(eq(eventMetadata.userId, userId), eq(eventMetadata.pinned, true)))
    const pinnedIds = new Set(pinnedRows.map((r) => r.googleEventId))

    // Franja "Próximo": próximos eventos desde ahora.
    const upcoming = await fetchUpcomingEvents(token, { timeMin: now, maxResults: 50 })
    const nextEvent = getNextEvent(upcoming, now)
    const pinnedUpcoming = upcoming.filter((e) => pinnedIds.has(e.id))

    // Grilla: eventos dentro del rango del nivel.
    const inRange = await fetchUpcomingEvents(token, {
      timeMin: range.start,
      timeMax: range.end,
      maxResults: 2500,
    })

    const fineLevel = level <= 2
    const byDay = new Map<string, CalendarEvent[]>()
    for (const e of inRange) {
      const k = dayKey(new Date(e.start))
      const list = byDay.get(k)
      if (list) list.push(e)
      else byDay.set(k, [e])
    }

    const days: DayCell[] = eachDayOfInterval({
      start: range.start,
      end: subDays(range.end, 1),
    }).map((date) => {
      const k = dayKey(date)
      const dayEvents = byDay.get(k) ?? []
      return {
        key: k,
        date,
        count: dayEvents.length,
        pinned: dayEvents.some((e) => pinnedIds.has(e.id)),
        events: fineLevel ? dayEvents : [],
      }
    })

    return {
      user: {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image ?? null,
      },
      now,
      level,
      range,
      nextEvent,
      pinnedUpcoming,
      days,
    }
  })
