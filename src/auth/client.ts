import { createAuthClient } from 'better-auth/react'

/**
 * Cliente de better-auth (navegador). baseURL por defecto = origen actual,
 * por lo que apunta a /api/auth automáticamente.
 */
export const authClient = createAuthClient()

export const { signIn, signOut, useSession } = authClient
