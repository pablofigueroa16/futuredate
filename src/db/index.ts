import { Pool, neonConfig } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import ws from 'ws'
import { env } from '../lib/env.server'
import * as schema from './schema'

// El driver serverless de Neon usa WebSocket; en Node hace falta darle uno.
// (Permite transacciones, que better-auth necesita en algunos flujos.)
neonConfig.webSocketConstructor = ws

const pool = new Pool({ connectionString: env.DATABASE_URL })

export const db = drizzle(pool, { schema })
export { schema }
