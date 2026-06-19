import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { format, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { Pin, Star } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useElementSize } from '../hooks/use-element-size'
import { snapMinutes } from '../lib/time'
import { layoutForLevel } from '../lib/zoom'
import type { ZoomLevelId } from '../lib/zoom'
import type { CalendarEvent } from '../lib/calendar-event'
import type { DayCell, GridEvent } from '../server/events'

const GAP = 3
const CHIP_CLASS =
  'flex items-center gap-0.5 truncate rounded bg-emerald-100 px-1 text-left text-[10px] leading-tight text-emerald-900'

export function ZoomGrid({
  level,
  days,
  now,
  onZoom,
  onSelectEvent,
  onMoveEvent,
  onReschedule,
  onCreateAt,
}: {
  level: ZoomLevelId
  days: DayCell[]
  now: Date
  onZoom: (level: ZoomLevelId, dateKey: string) => void
  onSelectEvent: (event: CalendarEvent) => void
  onMoveEvent: (event: CalendarEvent, targetDayKey: string) => void
  onReschedule: (event: CalendarEvent, newStart: Date) => void
  onCreateAt: (start: Date) => void
}) {
  if (level === 0)
    return (
      <DayTimeline
        day={days[0]}
        now={now}
        onSelectEvent={onSelectEvent}
        onReschedule={onReschedule}
        onCreateAt={onCreateAt}
      />
    )
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
  const [activeEvent, setActiveEvent] = useState<GridEvent | null>(null)
  // Distancia de activación: distingue click (editar) de arrastre (mover).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
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

  function handleDragStart(e: DragStartEvent) {
    setActiveEvent((e.active.data.current?.event as GridEvent | undefined) ?? null)
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveEvent(null)
    const overId = e.over?.id
    const event = e.active.data.current?.event as GridEvent | undefined
    if (event && typeof overId === 'string') onMoveEvent(event, overId)
  }

  return (
    <div ref={ref} className="flex h-full w-full items-center justify-center">
      {width > 0 && height > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveEvent(null)}
        >
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

          {/* Copia flotante del chip arrastrado: por encima de todo y sin recortes. */}
          <DragOverlay dropAnimation={null}>
            {activeEvent ? <ChipView event={activeEvent} dragging /> : null}
          </DragOverlay>
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
    // Sin `layout`: la animación de morfología interfería con la detección de
    // soltado de dnd-kit. Solo opacidad al entrar/salir.
    <motion.div
      ref={setNodeRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{ width: w, height: h }}
      className={`relative flex flex-col gap-0.5 overflow-hidden rounded border p-1 ${
        isOver
          ? 'border-blue-400 bg-blue-100 ring-2 ring-blue-400'
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

/** Visual del chip (compartida entre el chip en la celda y la copia flotante). */
function ChipView({ event, dragging }: { event: GridEvent; dragging?: boolean }) {
  const color = event.tags[0]?.color
  return (
    <div
      style={{ borderLeft: color ? `3px solid ${color}` : undefined }}
      className={`${CHIP_CLASS} ${dragging ? 'cursor-grabbing shadow-lg ring-1 ring-emerald-400' : ''}`}
    >
      {event.pinned && (
        <Star size={8} className="shrink-0 text-amber-600" fill="currentColor" />
      )}
      <span className="truncate">{event.title}</span>
    </div>
  )
}

function DraggableChip({
  event,
  onSelect,
}: {
  event: GridEvent
  onSelect: (event: CalendarEvent) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: event.id,
    data: { event },
  })
  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(event)
      }}
      style={{ opacity: isDragging ? 0.3 : 1, touchAction: 'none' }}
      className="block w-full cursor-grab"
    >
      <ChipView event={event} />
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

// --- Vista Día: agenda horaria con crear/mover por arrastre ---

const HOUR_PX = 48
const PX_PER_MIN = HOUR_PX / 60
const DAY_MIN = 24 * 60
const GUTTER = 52

type DayInteraction =
  | {
      kind: 'move'
      event: GridEvent
      durMin: number
      grabOffsetMin: number
      curStartMin: number
    }
  | { kind: 'create'; durMin: number; curStartMin: number }

const minutesOfDay = (d: Date) => d.getHours() * 60 + d.getMinutes()
const fmtMin = (min: number) => {
  const h = Math.floor(min / 60) % 24
  const m = Math.round(min % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function DayTimeline({
  day,
  now,
  onSelectEvent,
  onReschedule,
  onCreateAt,
}: {
  day: DayCell | undefined
  now: Date
  onSelectEvent: (event: CalendarEvent) => void
  onReschedule: (event: CalendarEvent, newStart: Date) => void
  onCreateAt: (start: Date) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [interaction, setInteraction] = useState<DayInteraction | null>(null)
  const isToday = day ? isSameDay(day.date, now) : false

  // Scroll inicial a la hora actual (si es hoy) o a las 7:00.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const min = isToday ? minutesOfDay(now) : 7 * 60
    el.scrollTop = Math.max(0, min * PX_PER_MIN - 80)
  }, [day?.key])

  if (!day) return null
  const theDay = day

  const timed = theDay.events.filter((e) => !e.allDay)
  const allDayEvents = theDay.events.filter((e) => e.allDay)

  const pointerMin = (clientY: number) => {
    const rect = innerRef.current?.getBoundingClientRect()
    return rect ? (clientY - rect.top) / PX_PER_MIN : 0
  }
  const clampStart = (min: number, dur: number) =>
    Math.max(0, Math.min(DAY_MIN - dur, min))
  const dateAt = (min: number) => {
    const d = new Date(theDay.date)
    d.setHours(Math.floor(min / 60), Math.round(min % 60), 0, 0)
    return d
  }
  const durationMin = (e: GridEvent) => {
    const m = (new Date(e.end).getTime() - new Date(e.start).getTime()) / 60000
    return m > 0 ? m : 60
  }

  function startGrid(e: React.PointerEvent) {
    if (e.button !== 0) return
    innerRef.current?.setPointerCapture(e.pointerId)
    setInteraction({
      kind: 'create',
      durMin: 60,
      curStartMin: clampStart(snapMinutes(pointerMin(e.clientY)), 60),
    })
  }

  function startMove(e: React.PointerEvent, ev: GridEvent) {
    if (e.button !== 0) return
    e.stopPropagation()
    innerRef.current?.setPointerCapture(e.pointerId)
    const startMin = minutesOfDay(new Date(ev.start))
    setInteraction({
      kind: 'move',
      event: ev,
      durMin: durationMin(ev),
      grabOffsetMin: pointerMin(e.clientY) - startMin,
      curStartMin: startMin,
    })
  }

  function onMove(e: React.PointerEvent) {
    if (!interaction) return
    const pm = pointerMin(e.clientY)
    const raw = interaction.kind === 'move' ? pm - interaction.grabOffsetMin : pm
    const next = clampStart(snapMinutes(raw), interaction.durMin)
    if (next !== interaction.curStartMin) {
      setInteraction({ ...interaction, curStartMin: next })
    }
  }

  function onUp() {
    if (!interaction) return
    if (interaction.kind === 'move') {
      const orig = minutesOfDay(new Date(interaction.event.start))
      if (interaction.curStartMin === orig) onSelectEvent(interaction.event)
      else onReschedule(interaction.event, dateAt(interaction.curStartMin))
    } else {
      onCreateAt(dateAt(interaction.curStartMin))
    }
    setInteraction(null)
  }

  const blockStyle = (startMin: number, durMin: number): React.CSSProperties => ({
    position: 'absolute',
    top: startMin * PX_PER_MIN,
    height: Math.max(18, durMin * PX_PER_MIN - 2),
    left: GUTTER,
    right: 8,
  })

  return (
    <div className="flex h-full w-full flex-col">
      {allDayEvents.length > 0 && (
        <div className="flex shrink-0 flex-wrap gap-1 border-b border-neutral-200 p-1.5">
          {allDayEvents.map((e) => (
            <button
              key={e.id}
              onClick={() => onSelectEvent(e)}
              className="flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-900"
            >
              {e.pinned && <Star size={10} className="text-amber-600" fill="currentColor" />}
              {e.title}
            </button>
          ))}
        </div>
      )}

      <div ref={scrollRef} className="relative flex-1 overflow-y-auto">
        <div
          ref={innerRef}
          onPointerDown={startGrid}
          onPointerMove={onMove}
          onPointerUp={onUp}
          className="relative w-full select-none"
          style={{ height: DAY_MIN * PX_PER_MIN }}
        >
          {Array.from({ length: 24 }, (_, h) => (
            <div
              key={h}
              className="absolute inset-x-0 border-t border-neutral-100"
              style={{ top: h * HOUR_PX }}
            >
              <span className="absolute -top-2 left-1 text-[10px] tabular-nums text-neutral-400">
                {String(h).padStart(2, '0')}:00
              </span>
            </div>
          ))}

          {isToday && (
            <div
              className="absolute inset-x-0 z-10 border-t-2 border-red-500"
              style={{ top: minutesOfDay(now) * PX_PER_MIN }}
            >
              <span className="absolute -top-1 left-0 h-2 w-2 -translate-x-1/2 rounded-full bg-red-500" />
            </div>
          )}

          {timed.map((e) => {
            const startMin = minutesOfDay(new Date(e.start))
            const dragging =
              interaction?.kind === 'move' && interaction.event.id === e.id
            return (
              <div
                key={e.id}
                onPointerDown={(ev) => startMove(ev, e)}
                style={{
                  ...blockStyle(startMin, durationMin(e)),
                  opacity: dragging ? 0.3 : 1,
                  touchAction: 'none',
                }}
                className="cursor-grab overflow-hidden rounded-md border-l-4 border-emerald-500 bg-emerald-100 px-2 py-0.5 text-xs text-emerald-900 shadow-sm"
              >
                <div className="flex items-center gap-1 font-medium">
                  {e.pinned && <Star size={10} className="text-amber-600" fill="currentColor" />}
                  <span className="truncate">{e.title}</span>
                </div>
                <div className="text-[10px] text-emerald-700">{fmtMin(startMin)}</div>
              </div>
            )
          })}

          {interaction && (
            <div
              style={blockStyle(interaction.curStartMin, interaction.durMin)}
              className="pointer-events-none z-20 flex flex-col justify-center rounded-md border-2 border-blue-500 bg-blue-200/80 px-2 text-xs font-medium text-blue-900 shadow-lg"
            >
              <span className="truncate">
                {interaction.kind === 'create' ? 'Nuevo evento' : interaction.event.title}
              </span>
              <span className="text-[10px]">
                {fmtMin(interaction.curStartMin)}–
                {fmtMin(interaction.curStartMin + interaction.durMin)}
              </span>
            </div>
          )}
        </div>
      </div>
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
