import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { auth } from '../auth/server'
import { getGoogleAccessToken } from '../auth/session'
import {
  createGoogleEvent,
  deleteGoogleEvent,
  updateGoogleEvent,
} from '../lib/google-calendar'

/** Sesión + access token de Google, o redirige a /login. */
async function requireToken(): Promise<string> {
  const session = await auth.api.getSession({ headers: getRequest().headers })
  if (!session) throw redirect({ to: '/login' })
  return getGoogleAccessToken(session.user.id)
}

const CreateInput = z.object({
  title: z.string().min(1),
  start: z.string().min(1),
  end: z.string().min(1),
  allDay: z.boolean(),
  location: z.string().optional(),
  description: z.string().optional(),
})

const UpdateInput = z.object({
  id: z.string().min(1),
  title: z.string().min(1).optional(),
  start: z.string().min(1).optional(),
  end: z.string().min(1).optional(),
  allDay: z.boolean().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
})

const DeleteInput = z.object({ id: z.string().min(1) })

export const createEvent = createServerFn({ method: 'POST' })
  .validator((input: unknown) => CreateInput.parse(input))
  .handler(async ({ data }) => {
    const token = await requireToken()
    return createGoogleEvent(token, data)
  })

export const updateEvent = createServerFn({ method: 'POST' })
  .validator((input: unknown) => UpdateInput.parse(input))
  .handler(async ({ data }) => {
    const token = await requireToken()
    const { id, ...fields } = data
    return updateGoogleEvent(token, id, fields)
  })

export const deleteEvent = createServerFn({ method: 'POST' })
  .validator((input: unknown) => DeleteInput.parse(input))
  .handler(async ({ data }) => {
    const token = await requireToken()
    await deleteGoogleEvent(token, data.id)
    return { ok: true }
  })
