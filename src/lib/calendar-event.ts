/**
 * Forma normalizada de un evento, desacoplada de Google.
 * Los server functions mapean la respuesta de Google Calendar a este tipo
 * (plan.md §4). `start` y `end` son instantes absolutos (Date = UTC interno).
 */
export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay: boolean
  location?: string
  description?: string
}
