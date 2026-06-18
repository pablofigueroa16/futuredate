import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { db } from '../db'
import * as schema from '../db/schema'
import { env } from '../lib/env.server'

/**
 * Instancia de better-auth (servidor). Provider Google con acceso a Calendar.
 * Ver plan.md §7. `tanstackStartCookies()` debe ir SIEMPRE el último plugin.
 */
export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      // email/profile/openid ya van por defecto; añadimos Calendar (lectura/escritura).
      scope: ['https://www.googleapis.com/auth/calendar.events'],
      // offline + consent → garantiza refresh token la primera vez.
      accessType: 'offline',
      prompt: 'consent',
    },
  },
  plugins: [tanstackStartCookies()],
})
