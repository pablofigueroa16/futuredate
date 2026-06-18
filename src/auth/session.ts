import { auth } from './server'

/** Devuelve la sesión actual (o null) a partir de las cabeceras de la request. */
export async function getSession(request: Request) {
  return auth.api.getSession({ headers: request.headers })
}

/** Igual que getSession pero lanza 401 si no hay sesión. Para server functions. */
export async function requireSession(request: Request) {
  const session = await getSession(request)
  if (!session) {
    throw new Response('No autenticado', { status: 401 })
  }
  return session
}

/**
 * Devuelve un access token de Google válido para el usuario, refrescándolo
 * automáticamente si ha expirado (better-auth usa el refresh token guardado
 * en la tabla `account`). Base de `getGoogleClient` (plan.md §6.2 / T-1.6).
 */
export async function getGoogleAccessToken(userId: string): Promise<string> {
  const { accessToken } = await auth.api.getAccessToken({
    body: { providerId: 'google', userId },
  })
  return accessToken
}
