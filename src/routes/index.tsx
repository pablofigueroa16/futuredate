import { createFileRoute, redirect } from '@tanstack/react-router'

// La home no tiene contenido propio: si hay sesión, /app; si no, /app redirige a /login.
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/app' })
  },
})
