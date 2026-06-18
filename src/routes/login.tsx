import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { signIn, signOut, useSession } from '../auth/client'

export const Route = createFileRoute('/login')({ component: Login })

function Login() {
  const { data: session, isPending } = useSession()
  const [loading, setLoading] = useState(false)

  async function handleGoogle() {
    setLoading(true)
    await signIn.social({ provider: 'google', callbackURL: '/' })
    // signIn redirige al consentimiento de Google; si vuelve, quitamos el loading.
    setLoading(false)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-8">
      <div>
        <h1 className="text-3xl font-bold">FutureDate</h1>
        <p className="mt-2 text-neutral-600">
          Entra con Google para ver y gestionar tu calendario.
        </p>
      </div>

      {isPending ? (
        <p className="text-neutral-500">Cargando sesión…</p>
      ) : session ? (
        <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4">
          <p className="text-sm">
            Sesión iniciada como <strong>{session.user.email}</strong>
          </p>
          <button
            onClick={() => signOut()}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Cerrar sesión
          </button>
        </div>
      ) : (
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="flex items-center justify-center gap-3 rounded-md border border-neutral-300 px-4 py-3 font-medium hover:bg-neutral-50 disabled:opacity-60"
        >
          <GoogleIcon />
          {loading ? 'Redirigiendo…' : 'Entrar con Google'}
        </button>
      )}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  )
}
