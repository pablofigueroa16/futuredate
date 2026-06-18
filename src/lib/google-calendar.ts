import { z } from 'zod'
import type { CalendarEvent } from './calendar-event'

/**
 * Acceso a Google Calendar API v3 (servidor). Recibe un access token ya válido
 * (lo refresca better-auth) y devuelve eventos mapeados a `CalendarEvent`.
 * La respuesta de Google se valida con Zod (Constitución §II).
 */

const GoogleDateTime = z.object({
  date: z.string().optional(), // 'YYYY-MM-DD' para eventos de día completo
  dateTime: z.string().optional(), // ISO con hora
  timeZone: z.string().optional(),
})

const GoogleEvent = z.object({
  id: z.string(),
  status: z.string().optional(),
  summary: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  start: GoogleDateTime.optional(),
  end: GoogleDateTime.optional(),
})

const GoogleEventsList = z.object({
  items: z.array(GoogleEvent).optional(),
})

export interface FetchEventsOptions {
  maxResults?: number
  timeMin?: Date
  timeMax?: Date
}

const EVENTS_URL =
  'https://www.googleapis.com/calendar/v3/calendars/primary/events'

export async function fetchUpcomingEvents(
  accessToken: string,
  opts: FetchEventsOptions = {},
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    singleEvents: 'true', // expande recurrentes a instancias
    orderBy: 'startTime',
    maxResults: String(opts.maxResults ?? 50),
    timeMin: (opts.timeMin ?? new Date()).toISOString(),
  })
  if (opts.timeMax) params.set('timeMax', opts.timeMax.toISOString())

  const res = await fetch(`${EVENTS_URL}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(
      `Google Calendar API respondió ${res.status}: ${body.slice(0, 200)}`,
    )
  }

  const data = GoogleEventsList.parse(await res.json())
  const events: CalendarEvent[] = []
  for (const g of data.items ?? []) {
    if (g.status === 'cancelled') continue
    const allDay = Boolean(g.start?.date && !g.start.dateTime)
    const startRaw = g.start?.dateTime ?? g.start?.date
    const endRaw = g.end?.dateTime ?? g.end?.date
    if (!startRaw) continue
    events.push({
      id: g.id,
      title: g.summary?.trim() || '(sin título)',
      start: new Date(startRaw),
      end: new Date(endRaw ?? startRaw),
      allDay,
      location: g.location,
      description: g.description,
    })
  }
  return events
}
