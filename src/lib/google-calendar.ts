import { z } from 'zod'
import type { CalendarEvent } from './calendar-event'

/**
 * Acceso a Google Calendar API v3 (servidor). Recibe un access token ya válido
 * (lo refresca better-auth). La respuesta de Google se valida con Zod
 * (Constitución §II). Google es la fuente de verdad de los eventos (§III).
 */

const GoogleDateTime = z.object({
  date: z.string().optional(), // 'YYYY-MM-DD' para día completo
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
type GoogleEventT = z.infer<typeof GoogleEvent>

const GoogleEventsList = z.object({
  items: z.array(GoogleEvent).optional(),
})

const CALENDAR = 'primary'
const BASE = `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR}/events`

/** Mapea un evento de Google a nuestro `CalendarEvent`, o null si no es utilizable. */
function mapGoogleEvent(g: GoogleEventT): CalendarEvent | null {
  if (g.status === 'cancelled') return null
  const allDay = Boolean(g.start?.date && !g.start.dateTime)
  const startRaw = g.start?.dateTime ?? g.start?.date
  const endRaw = g.end?.dateTime ?? g.end?.date
  if (!startRaw) return null
  return {
    id: g.id,
    title: g.summary?.trim() || '(sin título)',
    start: new Date(startRaw),
    end: new Date(endRaw ?? startRaw),
    allDay,
    location: g.location,
    description: g.description,
  }
}

async function googleFetch(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })
  if (!res.ok && res.status !== 204) {
    const body = await res.text()
    throw new Error(`Google Calendar API ${res.status}: ${body.slice(0, 200)}`)
  }
  return res
}

export interface FetchEventsOptions {
  maxResults?: number
  timeMin?: Date
  timeMax?: Date
}

export async function fetchUpcomingEvents(
  token: string,
  opts: FetchEventsOptions = {},
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: String(opts.maxResults ?? 50),
    timeMin: (opts.timeMin ?? new Date()).toISOString(),
  })
  if (opts.timeMax) params.set('timeMax', opts.timeMax.toISOString())

  const res = await googleFetch(token, `?${params.toString()}`)
  const data = GoogleEventsList.parse(await res.json())
  const events: CalendarEvent[] = []
  for (const g of data.items ?? []) {
    const mapped = mapGoogleEvent(g)
    if (mapped) events.push(mapped)
  }
  return events
}

/** Campos de escritura de un evento. `start`/`end`: ISO (con hora) o 'YYYY-MM-DD' si allDay. */
export interface EventWriteInput {
  title?: string
  start?: string
  end?: string
  allDay?: boolean
  location?: string | null
  description?: string | null
}

function buildBody(input: EventWriteInput): Record<string, unknown> {
  const body: Record<string, unknown> = {}
  if (input.title !== undefined) body.summary = input.title
  if (input.location !== undefined) body.location = input.location ?? ''
  if (input.description !== undefined) body.description = input.description ?? ''
  if (input.start !== undefined) {
    body.start = input.allDay ? { date: input.start } : { dateTime: input.start }
  }
  if (input.end !== undefined) {
    body.end = input.allDay ? { date: input.end } : { dateTime: input.end }
  }
  return body
}

export async function createGoogleEvent(
  token: string,
  input: EventWriteInput,
): Promise<CalendarEvent> {
  const res = await googleFetch(token, '', {
    method: 'POST',
    body: JSON.stringify(buildBody(input)),
  })
  const mapped = mapGoogleEvent(GoogleEvent.parse(await res.json()))
  if (!mapped) throw new Error('Google devolvió un evento no utilizable')
  return mapped
}

export async function updateGoogleEvent(
  token: string,
  id: string,
  input: EventWriteInput,
): Promise<CalendarEvent> {
  const res = await googleFetch(token, `/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(buildBody(input)),
  })
  const mapped = mapGoogleEvent(GoogleEvent.parse(await res.json()))
  if (!mapped) throw new Error('Google devolvió un evento no utilizable')
  return mapped
}

export async function deleteGoogleEvent(token: string, id: string): Promise<void> {
  await googleFetch(token, `/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
