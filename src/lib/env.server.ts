import 'dotenv/config'
import { z } from 'zod'

/**
 * Variables de entorno del servidor, validadas al arrancar.
 * Solo debe importarse desde código de servidor (auth, db, server functions).
 * Ver `specs/001-agenda-cuenta-regresiva/plan.md` §8.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().min(1),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  const faltan = parsed.error.issues.map((i) => i.path.join('.')).join(', ')
  throw new Error(
    `Faltan o son inválidas variables de entorno: ${faltan}. ` +
      `Copia .env.example a .env y rellénalas.`,
  )
}

export const env = parsed.data
