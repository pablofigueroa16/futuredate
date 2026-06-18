import { addDays, format, parseISO } from 'date-fns'
import { Trash2, X } from 'lucide-react'
import { useState } from 'react'
import type { CalendarEvent } from '../lib/calendar-event'
import { createEvent, deleteEvent, updateEvent } from '../server/event-mutations'

const toLocalInput = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm")
const toDateInput = (d: Date) => format(d, 'yyyy-MM-dd')

export function EventForm({
  mode,
  event,
  defaultDate,
  onClose,
  onSaved,
}: {
  mode: 'new' | 'edit'
  event?: CalendarEvent
  defaultDate: string // yyyy-MM-dd
  onClose: () => void
  onSaved: () => void
}) {
  const base = event ? new Date(event.start) : new Date(`${defaultDate}T09:00:00`)
  const baseEnd = event ? new Date(event.end) : new Date(`${defaultDate}T10:00:00`)

  const [title, setTitle] = useState(event?.title ?? '')
  const [allDay, setAllDay] = useState(event?.allDay ?? false)
  const [start, setStart] = useState(
    event?.allDay ? toDateInput(base) : toLocalInput(base),
  )
  // En allDay el fin de Google es exclusivo; mostramos el día inclusivo (−1).
  const [end, setEnd] = useState(
    event?.allDay
      ? toDateInput(addDays(baseEnd, -1))
      : toLocalInput(event ? baseEnd : baseEnd),
  )
  const [location, setLocation] = useState(event?.location ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [busy, setBusy] = useState<null | 'save' | 'delete'>(null)
  const [error, setError] = useState<string | null>(null)

  // Al cambiar allDay, reformatea los inputs de fecha.
  function toggleAllDay(next: boolean) {
    const s = parseLoose(start)
    const e = parseLoose(end)
    setStart(next ? toDateInput(s) : toLocalInput(s))
    setEnd(next ? toDateInput(e) : toLocalInput(e))
    setAllDay(next)
  }

  function buildPayload() {
    if (allDay) {
      // start/end como 'YYYY-MM-DD'; Google quiere fin exclusivo (+1 día).
      const endExclusive = toDateInput(addDays(parseISO(end), 1))
      return { title, start, end: endExclusive, allDay: true as const, location, description }
    }
    return {
      title,
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      allDay: false as const,
      location,
      description,
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!title.trim()) return setError('El título es obligatorio.')
    setBusy('save')
    try {
      const payload = buildPayload()
      if (mode === 'edit' && event) {
        await updateEvent({ data: { id: event.id, ...payload } })
      } else {
        await createEvent({ data: payload })
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
      setBusy(null)
    }
  }

  async function handleDelete() {
    if (!event) return
    if (!window.confirm(`¿Eliminar "${event.title}"? No se puede deshacer.`)) return
    setBusy('delete')
    try {
      await deleteEvent({ data: { id: event.id } })
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar')
      setBusy(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSave}
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {mode === 'edit' ? 'Editar evento' : 'Nuevo evento'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="p-1">
            <X size={18} />
          </button>
        </div>

        <label className="block text-sm font-medium">
          Título
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </label>

        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => toggleAllDay(e.target.checked)}
          />
          Todo el día
        </label>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium">
            Inicio
            <input
              type={allDay ? 'date' : 'datetime-local'}
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-2"
            />
          </label>
          <label className="block text-sm font-medium">
            Fin
            <input
              type={allDay ? 'date' : 'datetime-local'}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-2"
            />
          </label>
        </div>

        <label className="mt-3 block text-sm font-medium">
          Lugar
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </label>

        <label className="mt-3 block text-sm font-medium">
          Descripción
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </label>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex items-center justify-between">
          {mode === 'edit' ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy !== null}
              className="flex items-center gap-1 rounded-md px-2 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 size={15} /> Eliminar
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy !== null}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy === 'save' ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

/** Parsea el valor de un input date o datetime-local a Date. */
function parseLoose(value: string): Date {
  const d = new Date(value)
  return isNaN(d.getTime()) ? new Date() : d
}
