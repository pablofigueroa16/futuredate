import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { redirect } from '@tanstack/react-router'
import { eachDayOfInterval, subDays } from 'date-fns'
import { eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { auth } from '../auth/server'
import { getGoogleAccessToken } from '../auth/session'
import { db } from '../db'
import { eventMetadata, eventTag, tag } from '../db/schema'
import { dayKey } from '../lib/format'
import { fetchUpcomingEvents } from '../lib/google-calendar'
import { getNextEvent } from '../lib/time'
import { rangeForLevel } from '../lib/zoom'
import type { ZoomLevelId } from '../lib/zoom'
import type { CalendarEvent } from '../lib/calendar-event'

export interface TagLite {
  name: string
  color: string
}

/** Evento de la grilla enriquecido con nuestros metadatos (★ y etiquetas). */
export interface GridEvent extends CalendarEvent {
  pinned: boolean
  tags: TagLite[]
}

/** Una celda-día de la grilla. `events` solo se puebla en niveles finos (≤ 2). */
export interface DayCell {
  key: string // yyyy-MM-dd
  date: Date
  count: number
  pinned: boolean
  events: GridEvent[]
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

    // Metadatos propios del usuario (★ + etiquetas), indexados por googleEventId.
    const metaRows = await db
      .select({
        id: eventMetadata.id,
        googleEventId: eventMetadata.googleEventId,
        pinned: eventMetadata.pinned,
      })
      .from(eventMetadata)
      .where(eq(eventMetadata.userId, userId))
    const metaIds = metaRows.map((m) => m.id)
    const tagRows = metaIds.length
      ? await db
          .select({
            emId: eventTag.eventMetadataId,
            name: tag.name,
            color: tag.color,
          })
          .from(eventTag)
          .innerJoin(tag, eq(tag.id, eventTag.tagId))
          .where(inArray(eventTag.eventMetadataId, metaIds))
      : []
    const tagsByMetaId = new Map<string, TagLite[]>()
    for (const t of tagRows) {
      const list = tagsByMetaId.get(t.emId)
      const lite = { name: t.name, color: t.color }
      if (list) list.push(lite)
      else tagsByMetaId.set(t.emId, [lite])
    }
    const metaByEventId = new Map<string, { pinned: boolean; tags: TagLite[] }>()
    for (const m of metaRows) {
      metaByEventId.set(m.googleEventId, {
        pinned: m.pinned,
        tags: tagsByMetaId.get(m.id) ?? [],
      })
    }
    const pinnedIds = new Set(metaRows.filter((m) => m.pinned).map((m) => m.googleEventId))

    const toGrid = (e: CalendarEvent): GridEvent => ({
      ...e,
      pinned: metaByEventId.get(e.id)?.pinned ?? false,
      tags: metaByEventId.get(e.id)?.tags ?? [],
    })

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
    const byDay = new Map<string, GridEvent[]>()
    for (const e of inRange) {
      const k = dayKey(new Date(e.start))
      const list = byDay.get(k)
      if (list) list.push(toGrid(e))
      else byDay.set(k, [toGrid(e)])
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
