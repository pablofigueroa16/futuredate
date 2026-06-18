import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { redirect } from '@tanstack/react-router'
import { and, eq } from 'drizzle-orm'
import { auth } from '../auth/server'
import { getGoogleAccessToken } from '../auth/session'
import { db } from '../db'
import { eventMetadata } from '../db/schema'
import { fetchUpcomingEvents } from '../lib/google-calendar'
import { getNextEvent } from '../lib/time'
import type { CalendarEvent } from '../lib/calendar-event'

export interface AppData {
  user: { name: string; email: string; image: string | null }
  now: Date
  nextEvent: CalendarEvent | null
  upcoming: CalendarEvent[]
  pinned: CalendarEvent[]
}

/**
 * Carga los datos de la franja "Próximo" + agenda: sesión, próximos eventos de
 * Google Calendar (fuente de verdad) y cuáles están fijados (★) según la DB.
 * Si no hay sesión, redirige a /login.
 */
export const loadAppData = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AppData> => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) {
      throw redirect({ to: '/login' })
    }

    const token = await getGoogleAccessToken(session.user.id)
    const now = new Date()
    const upcoming = await fetchUpcomingEvents(token, {
      maxResults: 50,
      timeMin: now,
    })
    const nextEvent = getNextEvent(upcoming, now)

    // Eventos fijados (★): sus ids viven en nuestra DB; se resaltan en la franja.
    const pinnedRows = await db
      .select({ googleEventId: eventMetadata.googleEventId })
      .from(eventMetadata)
      .where(
        and(
          eq(eventMetadata.userId, session.user.id),
          eq(eventMetadata.pinned, true),
        ),
      )
    const pinnedIds = new Set(pinnedRows.map((r) => r.googleEventId))
    const pinned = upcoming.filter((e) => pinnedIds.has(e.id))

    return {
      user: {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image ?? null,
      },
      now,
      nextEvent,
      upcoming,
      pinned,
    }
  },
)
