import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import {
  addDays,
  addMonths,
  addYears,
  differenceInCalendarDays,
  startOfDay,
} from 'date-fns'
import { useState } from 'react'
import { EventForm } from '../components/EventForm'
import { NextEventHero } from '../components/NextEventHero'
import { ZoomControl } from '../components/ZoomControl'
import { ZoomGrid } from '../components/ZoomGrid'
import type { CalendarEvent } from '../lib/calendar-event'
import { dayKey } from '../lib/format'
import type { ZoomLevelId } from '../lib/zoom'
import { loadCalendarView } from '../server/events'
import { updateEvent } from '../server/event-mutations'

interface AppSearch {
  level: ZoomLevelId
  date: string // yyyy-MM-dd
}

export const Route = createFileRoute('/app')({
  validateSearch: (search: Record<string, unknown>): AppSearch => {
    const lvl = Number(search.level)
    const level = (Number.isInteger(lvl) && lvl >= 0 && lvl <= 4 ? lvl : 2) as ZoomLevelId
    const date =
      typeof search.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(search.date)
        ? search.date
        : dayKey(new Date())
    return { level, date }
  },
  loaderDeps: ({ search }) => ({ level: search.level, date: search.date }),
  loader: ({ deps }) =>
    loadCalendarView({ data: { level: deps.level, date: deps.date } }),
  component: AppPage,
  pendingComponent: () => (
    <p className="p-8 text-center text-neutral-500">Cargando tu calendario…</p>
  ),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-md p-8 text-center">
      <p className="font-medium text-red-700">No pudimos cargar tus eventos</p>
      <p className="mt-1 text-sm text-neutral-500">{error.message}</p>
    </div>
  ),
})

function AppPage() {
  const data = Route.useLoaderData()
  const { level, date } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const router = useRouter()
  const [modal, setModal] = useState<
    { mode: 'new' } | { mode: 'edit'; event: CalendarEvent } | null
  >(null)

  const now = new Date(data.now)
  const focus = new Date(`${date}T12:00:00`)
  const days = data.days.map((d) => ({
    ...d,
    date: new Date(d.date),
    events: d.events.map((e) => ({ ...e, start: new Date(e.start), end: new Date(e.end) })),
  }))

  const go = (nextLevel: ZoomLevelId, nextDate: string) =>
    navigate({ search: { level: nextLevel, date: nextDate } })

  async function moveEvent(event: CalendarEvent, targetDayKey: string) {
    const delta = differenceInCalendarDays(
      new Date(`${targetDayKey}T12:00:00`),
      startOfDay(new Date(event.start)),
    )
    if (delta === 0) return
    const ns = addDays(new Date(event.start), delta)
    const ne = addDays(new Date(event.end), delta)
    await updateEvent({
      data: event.allDay
        ? { id: event.id, start: dayKey(ns), end: dayKey(ne), allDay: true }
        : { id: event.id, start: ns.toISOString(), end: ne.toISOString(), allDay: false },
    })
    void router.invalidate()
  }

  const shiftPeriod = (dir: -1 | 1) => {
    const f = focus
    const moved =
      level === 0
        ? addDays(f, dir)
        : level === 1
          ? addDays(f, 7 * dir)
          : level === 2
            ? addMonths(f, dir)
            : level === 3
              ? addMonths(f, 3 * dir)
              : addYears(f, dir)
    go(level, dayKey(moved))
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-50">
      <NextEventHero
        nextEvent={data.nextEvent}
        pinned={data.pinnedUpcoming}
        now={now}
      />
      <ZoomControl
        level={level}
        focus={focus}
        onSetLevel={(l) => go(l, date)}
        onShiftPeriod={shiftPeriod}
        onToday={() => go(level, dayKey(new Date()))}
        onCreate={() => setModal({ mode: 'new' })}
      />
      <main className="min-h-0 flex-1 p-3">
        <ZoomGrid
          level={level}
          days={days}
          now={now}
          onZoom={go}
          onSelectEvent={(event) => setModal({ mode: 'edit', event })}
          onMoveEvent={moveEvent}
        />
      </main>

      {modal && (
        <EventForm
          mode={modal.mode}
          event={modal.mode === 'edit' ? modal.event : undefined}
          defaultDate={date}
          onClose={() => setModal(null)}
          onSaved={() => router.invalidate()}
        />
      )}
    </div>
  )
}
