import { createFileRoute } from '@tanstack/react-router'
import { auth } from '../../../auth/server'

/** Catch-all que delega todo /api/auth/* al handler de better-auth (incluye callback OAuth). */
export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: ({ request }) => auth.handler(request),
    },
  },
})
