import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="text-4xl font-bold">FutureDate</h1>
      <p className="mt-4 text-lg text-neutral-600">
        Calendario personal con franja "Próximo" y grilla zoomable estilo GitHub.
      </p>
      <p className="mt-2 text-sm text-neutral-500">
        Scaffold listo (Fase 0). Siguiente: autenticación con Google y base de datos
        (Fase 1). Ver <code>specs/</code>.
      </p>
    </div>
  )
}
