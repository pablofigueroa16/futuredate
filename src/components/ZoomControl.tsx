import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { formatPeriod } from '../lib/format'
import { ZOOM_LEVELS } from '../lib/zoom'
import type { ZoomLevelId } from '../lib/zoom'

const LEVEL_IDS: ZoomLevelId[] = [0, 1, 2, 3, 4]

export function ZoomControl({
  level,
  focus,
  onSetLevel,
  onShiftPeriod,
  onToday,
  onCreate,
}: {
  level: ZoomLevelId
  focus: Date
  onSetLevel: (level: ZoomLevelId) => void
  onShiftPeriod: (dir: -1 | 1) => void
  onToday: () => void
  onCreate: () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onShiftPeriod(-1)}
          aria-label="Periodo anterior"
          className="rounded p-1 hover:bg-neutral-100"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="min-w-40 text-center text-sm font-semibold text-neutral-800">
          {formatPeriod(level, focus)}
        </span>
        <button
          onClick={() => onShiftPeriod(1)}
          aria-label="Periodo siguiente"
          className="rounded p-1 hover:bg-neutral-100"
        >
          <ChevronRight size={18} />
        </button>
        <button
          onClick={onToday}
          className="ml-1 rounded-md border border-neutral-300 px-2 py-0.5 text-xs font-medium hover:bg-neutral-50"
        >
          Hoy
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div
          className="flex rounded-lg border border-neutral-200 p-0.5"
          role="group"
          aria-label="Nivel de zoom"
        >
          {LEVEL_IDS.map((id) => {
            const active = id === level
            return (
              <button
                key={id}
                onClick={() => onSetLevel(id)}
                aria-pressed={active}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                {ZOOM_LEVELS[id].name}
              </button>
            )
          })}
        </div>
        <button
          onClick={onCreate}
          className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          <Plus size={15} /> Crear
        </button>
      </div>
    </div>
  )
}
