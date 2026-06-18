import { useEffect, useState } from 'react'
import { formatTimeUntil, timeUntil } from '../lib/time'

/**
 * Cuenta regresiva en vivo. Para evitar desajuste de hidratación, el primer
 * render (servidor y cliente) usa `initialNow` (el "ahora" del servidor); solo
 * tras montar arranca el tick contra el reloj real (plan.md §6.1).
 */
export function Countdown({
  target,
  initialNow,
}: {
  target: Date
  initialNow: Date
}) {
  const [now, setNow] = useState(initialNow)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const base = mounted ? now : initialNow
  return (
    <span aria-live="polite">{formatTimeUntil(timeUntil(target, base))}</span>
  )
}
