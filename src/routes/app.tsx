import { createFileRoute } from '@tanstack/react-router'
import { NextEventHero } from '../components/NextEventHero'
import type { CalendarEvent } from '../lib/calendar-event'
import { formatEventWhen } from '../lib/format'
import { formatTimeUntil, timeUntil } from '../lib/time'
import { loadAppData } from '../server/events'

export const Route = createFileRoute('/app')({
  loader: () => loadAppData(),
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
  const now = new Date(data.now)

  return (
    <div className="min-h-screen bg-neutral-50">
      <NextEventHero nextEvent={data.nextEvent} pinned={data.pinned} now={now} />
      <main className="mx-auto max-w-3xl p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Próximos eventos
        </h2>
        {data.upcoming.length === 0 ? (
          <p className="text-neutral-500">No hay eventos futuros.</p>
        ) : (
          <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 bg-white">
            {data.upcoming.map((event) => (
              <UpcomingRow key={event.id} event={event} now={now} />
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

function UpcomingRow({ event, now }: { event: CalendarEvent; now: Date }) {
  const t = timeUntil(new Date(event.start), now)
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate font-medium text-neutral-900">{event.title}</p>
        <p className="truncate text-sm text-neutral-500">
          {formatEventWhen(event, now)}
        </p>
      </div>
      <span className="shrink-0 text-sm text-neutral-400">
        en {formatTimeUntil(t)}
      </span>
    </li>
  )
}
