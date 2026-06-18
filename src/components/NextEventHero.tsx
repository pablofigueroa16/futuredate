import { CalendarClock, Pin } from 'lucide-react'
import type { CalendarEvent } from '../lib/calendar-event'
import { formatEventWhen } from '../lib/format'
import { timeUntil } from '../lib/time'
import { Countdown } from './Countdown'

/**
 * Franja "Próximo" (sticky, siempre visible). Muestra el próximo evento futuro
 * con cuenta regresiva en vivo + los eventos fijados (★). Es lo primero que ve
 * el usuario, sin importar el nivel de zoom (Constitución §IV, RF-2).
 */
export function NextEventHero({
  nextEvent,
  pinned,
  now,
}: {
  nextEvent: CalendarEvent | null
  pinned: CalendarEvent[]
  now: Date
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <div className="mx-auto max-w-3xl p-4">
        {nextEvent ? (
          <NextEvent event={nextEvent} now={now} />
        ) : (
          <EmptyState />
        )}

        {pinned.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {pinned.map((e) => (
              <PinnedCard key={e.id} event={e} now={now} />
            ))}
          </ul>
        )}
      </div>
    </header>
  )
}

function NextEvent({ event, now }: { event: CalendarEvent; now: Date }) {
  const start = new Date(event.start)
  const { days } = timeUntil(start, now)
  const urgency =
    days === 0
      ? 'bg-red-50 text-red-700 ring-red-600/20'
      : days < 7
        ? 'bg-amber-50 text-amber-800 ring-amber-600/20'
        : 'bg-neutral-100 text-neutral-700 ring-neutral-500/20'

  return (
    <div className="flex items-center gap-4">
      <div
        className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset ${urgency}`}
      >
        <CalendarClock size={15} aria-hidden />
        en <Countdown target={start} initialNow={now} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Próximo
        </p>
        <h2 className="truncate text-lg font-semibold text-neutral-900">
          {event.title}
        </h2>
        <p className="truncate text-sm text-neutral-500">
          {formatEventWhen(event, now)}
          {event.location ? ` · ${event.location}` : ''}
        </p>
      </div>
    </div>
  )
}

function PinnedCard({ event, now }: { event: CalendarEvent; now: Date }) {
  const start = new Date(event.start)
  return (
    <li className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm">
      <Pin size={13} className="text-neutral-400" aria-label="Fijado" />
      <span className="max-w-[12rem] truncate font-medium">{event.title}</span>
      <span className="text-neutral-500">
        en <Countdown target={start} initialNow={now} />
      </span>
    </li>
  )
}

function EmptyState() {
  return (
    <div className="flex items-center gap-3 text-neutral-500">
      <CalendarClock size={18} aria-hidden />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Próximo
        </p>
        <p className="text-sm">No tienes nada próximo. 🎉</p>
      </div>
    </div>
  )
}
