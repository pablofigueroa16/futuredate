import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { format, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { Pin, Star } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useElementSize } from '../hooks/use-element-size'
import { layoutForLevel } from '../lib/zoom'
import type { ZoomLevelId } from '../lib/zoom'
import type { CalendarEvent } from '../lib/calendar-event'
import type { DayCell, GridEvent } from '../server/events'

const GAP = 3

export function ZoomGrid({
  level,
  days,
  now,
  onZoom,
  onSelectEvent,
  onMoveEvent,
}: {
  level: ZoomLevelId
  days: DayCell[]
  now: Date
  onZoom: (level: ZoomLevelId, dateKey: string) => void
  onSelectEvent: (event: CalendarEvent) => void
  onMoveEvent: (event: CalendarEvent, targetDayKey: string) => void
}) {
  if (level === 0)
    return <DayColumn day={days[0]} now={now} onSelectEvent={onSelectEvent} />
  return (
    <GridSurface
      level={level}
      days={days}
      now={now}
      onZoom={onZoom}
      onSelectEvent={onSelectEvent}
      onMoveEvent={onMoveEvent}
    />
  )
}

function GridSurface({
  level,
  days,
  now,
  onZoom,
  onSelectEvent,
  onMoveEvent,
}: {
  level: ZoomLevelId
  days: DayCell[]
  now: Date
  onZoom: (level: ZoomLevelId, dateKey: string) => void
  onSelectEvent: (event: CalendarEvent) => void
  onMoveEvent: (event: CalendarEvent, targetDayKey: string) => void
}) {
  const [ref, { width, height }] = useElementSize<HTMLDivElement>()
  // Pequeña distancia de activación: distingue click (editar) de arrastre (mover).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )
  const layout = layoutForLevel(level)
  const weeks = Math.max(1, Math.round(days.length / 7))

  const weekAsColumn = layout.weekAsColumn
  const cols = weekAsColumn ? weeks : 7
  const rows = weekAsColumn ? 7 : level === 1 ? 1 : weeks

  const cellW = (width - GAP * (cols - 1)) / cols
  const cellH = (height - GAP * (rows - 1)) / rows
  const sq = Math.max(0, Math.min(cellW, cellH))
  const w = level === 1 ? Math.max(0, cellW) : sq
  const h = level === 1 ? Math.max(0, cellH) : sq

  const gridStyle: React.CSSProperties = weekAsColumn
    ? {
        gridTemplateRows: `repeat(7, ${h}px)`,
        gridAutoColumns: `${w}px`,
        gridAutoFlow: 'column',
      }
    : {
        gridTemplateColumns: `repeat(7, ${w}px)`,
        gridAutoRows: `${h}px`,
        gridAutoFlow: 'row',
      }

  function handleClick(day: DayCell) {
    if (level >= 3) onZoom((level - 1) as ZoomLevelId, day.key)
    else onZoom(0, day.key)
  }

  function handleDragEnd(e: DragEndEvent) {
    const overId = e.over?.id
    const event = e.active.data.current?.event as GridEvent | undefined
    if (event && typeof overId === 'string' && overId !== e.active.id) {
      onMoveEvent(event, overId)
    }
  }

  return (
    <div ref={ref} className="flex h-full w-full items-center justify-center">
      {width > 0 && height > 0 && (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="grid" style={{ ...gridStyle, gap: GAP }}>
            <AnimatePresence initial={false}>
              {days.map((day) =>
                level === 2 ? (
                  <MonthCell
                    key={day.key}
                    day={day}
                    w={w}
                    h={h}
                    now={now}
                    onZoomDay={(k) => onZoom(0, k)}
                    onSelectEvent={onSelectEvent}
                  />
                ) : (
                  <motion.button
                    layout
                    key={day.key}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => handleClick(day)}
                    aria-label={`${format(day.date, "EEEE d 'de' MMMM", { locale: es })}: ${day.count} evento${day.count === 1 ? '' : 's'}${day.pinned ? ', fijado' : ''}`}
                    aria-current={isSameDay(day.date, now) ? 'date' : undefined}
                    style={{ width: w, height: h }}
                    className="relative overflow-hidden rounded text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <Cell day={day} cell={layout.cell} now={now} px={Math.min(w, h)} />
                  </motion.button>
                ),
              )}
            </AnimatePresence>
          </div>
        </DndContext>
      )}
    </div>
  )
}

function MonthCell({
  day,
  w,
  h,
  now,
  onZoomDay,
  onSelectEvent,
}: {
  day: DayCell
  w: number
  h: number
  now: Date
  onZoomDay: (dateKey: string) => void
  onSelectEvent: (event: CalendarEvent) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: day.key })
  const today = isSameDay(day.date, now)
  const maxChips = Math.min(w, h) >= 64 ? 3 : 2
  const shown = day.events.slice(0, maxChips)
  const rest = day.events.length - shown.length

  return (
    <motion.div
      layout
      ref={setNodeRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{ width: w, height: h }}
      className={`relative flex flex-col gap-0.5 overflow-hidden rounded border p-1 ${
        isOver
          ? 'border-blue-400 bg-blue-100'
          : today
            ? 'border-blue-500 bg-blue-50'
            : 'border-neutral-200 bg-white'
      }`}
    >
      <button
        onClick={() => onZoomDay(day.key)}
        aria-label={`${format(day.date, "EEEE d 'de' MMMM", { locale: es })}: ${day.count} evento${day.count === 1 ? '' : 's'}`}
        aria-current={today ? 'date' : undefined}
        className={`self-start rounded px-1 text-[11px] font-medium leading-none ${today ? 'text-blue-700' : 'text-neutral-500'}`}
      >
        {day.date.getDate()}
      </button>
      {shown.map((e) => (
        <DraggableChip key={e.id} event={e} onSelect={onSelectEvent} />
      ))}
      {rest > 0 && <span className="text-[9px] text-neutral-400">+{rest}</span>}
      {day.pinned && <Pin className="absolute right-0.5 top-0.5 text-amber-500" size={10} />}
    </motion.div>
  )
}

function DraggableChip({
  event,
  onSelect,
}: {
  event: GridEvent
  onSelect: (event: CalendarEvent) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
    data: { event },
  })
  const color = event.tags[0]?.color
  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(event)
      }}
      style={{
        transform: transform
          ? `translate(${transform.x}px, ${transform.y}px)`
          : undefined,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 50 : undefined,
        position: 'relative',
        borderLeft: color ? `3px solid ${color}` : undefined,
        touchAction: 'none',
      }}
      className="flex items-center gap-0.5 truncate rounded bg-emerald-100 px-1 text-left text-[10px] leading-tight text-emerald-900"
    >
      {event.pinned && (
        <Star size={8} className="shrink-0 text-amber-600" fill="currentColor" />
      )}
      <span className="truncate">{event.title}</span>
    </button>
  )
}

function Cell({
  day,
  cell,
  now,
  px,
}: {
  day: DayCell
  cell: ReturnType<typeof layoutForLevel>['cell']
  now: Date
  px: number
}) {
  const today = isSameDay(day.date, now)
  const dayNum = day.date.getDate()

  if (cell === 'heatmap') {
    return (
      <div
        className={`h-full w-full rounded-sm ${heatColor(day.count)} ${today ? 'ring-2 ring-blue-500' : ''}`}
        title={`${day.key} · ${day.count} evento(s)`}
      >
        {day.pinned && <Pin className="absolute right-0 top-0 text-amber-600" size={8} />}
      </div>
    )
  }

  if (cell === 'dots') {
    return (
      <div
        className={`flex h-full w-full flex-col rounded border p-0.5 ${today ? 'border-blue-500 bg-blue-50' : 'border-neutral-200 bg-white'}`}
      >
        <span className="text-[9px] leading-none text-neutral-400">{dayNum}</span>
        <div className="mt-auto flex flex-wrap gap-0.5">
          {day.count > 0 &&
            Array.from({ length: Math.min(day.count, 4) }).map((_, i) => (
              <span key={i} className="h-1 w-1 rounded-full bg-emerald-500" />
            ))}
        </div>
        {day.pinned && <Pin className="absolute right-0.5 top-0.5 text-amber-500" size={9} />}
      </div>
    )
  }

  // blocks (semana) / fallback
  const maxChips = px >= 64 ? 3 : 2
  const shown = day.events.slice(0, maxChips)
  const rest = day.events.length - shown.length
  return (
    <div
      className={`flex h-full w-full flex-col gap-0.5 rounded border p-1 ${today ? 'border-blue-500 bg-blue-50' : 'border-neutral-200 bg-white'}`}
    >
      <span
        className={`text-[11px] font-medium leading-none ${today ? 'text-blue-700' : 'text-neutral-500'}`}
      >
        {dayNum}
      </span>
      {shown.map((e) => (
        <span
          key={e.id}
          className="truncate rounded bg-emerald-100 px-1 text-[10px] leading-tight text-emerald-900"
        >
          {e.title}
        </span>
      ))}
      {rest > 0 && <span className="text-[9px] text-neutral-400">+{rest}</span>}
      {day.pinned && <Pin className="absolute right-0.5 top-0.5 text-amber-500" size={10} />}
    </div>
  )
}

function DayColumn({
  day,
  now,
  onSelectEvent,
}: {
  day: DayCell | undefined
  now: Date
  onSelectEvent: (event: CalendarEvent) => void
}) {
  if (!day) return null
  return (
    <div className="mx-auto h-full w-full max-w-lg overflow-y-auto p-2">
      {day.events.length === 0 ? (
        <p className="mt-8 text-center text-neutral-400">Nada este día.</p>
      ) : (
        <ul className="space-y-2">
          {day.events.map((e) => (
            <li key={e.id}>
              <button
                onClick={() => onSelectEvent(e)}
                className="flex w-full items-baseline gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-left hover:border-neutral-300 hover:bg-neutral-50"
              >
                <span className="w-12 shrink-0 text-sm tabular-nums text-neutral-500">
                  {e.allDay
                    ? 'Todo'
                    : new Date(e.start).toLocaleTimeString('es', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                </span>
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  {e.pinned && (
                    <Star size={13} className="shrink-0 text-amber-500" fill="currentColor" />
                  )}
                  <span className="truncate font-medium text-neutral-900">{e.title}</span>
                  {e.tags.map((t) => (
                    <span
                      key={t.name}
                      title={t.name}
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: t.color }}
                    />
                  ))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {/* `now` reservado para resaltar la hora actual en una iteración futura */}
      <span hidden>{now.toISOString()}</span>
    </div>
  )
}

function heatColor(count: number): string {
  if (count === 0) return 'bg-neutral-100'
  if (count <= 1) return 'bg-emerald-200'
  if (count <= 3) return 'bg-emerald-400'
  if (count <= 5) return 'bg-emerald-500'
  return 'bg-emerald-600'
}
