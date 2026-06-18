import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { redirect } from '@tanstack/react-router'
import { and, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { auth } from '../auth/server'
import { db } from '../db'
import { eventMetadata, eventTag, tag } from '../db/schema'

async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: getRequest().headers })
  if (!session) throw redirect({ to: '/login' })
  return session.user.id
}

export interface EventMeta {
  pinned: boolean
  reminderLead: number | null
  notes: string | null
  tagIds: string[]
}

export const listTags = createServerFn({ method: 'GET' }).handler(async () => {
  const userId = await requireUserId()
  return db
    .select({ id: tag.id, name: tag.name, color: tag.color })
    .from(tag)
    .where(eq(tag.userId, userId))
})

export const createTag = createServerFn({ method: 'POST' })
  .validator((input: unknown) =>
    z.object({ name: z.string().min(1), color: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    const created = (
      await db
        .insert(tag)
        .values({ userId, name: data.name, color: data.color })
        .onConflictDoNothing()
        .returning({ id: tag.id, name: tag.name, color: tag.color })
    ).at(0)
    if (created) return created
    // Ya existía (mismo nombre): recupérala.
    return (
      await db
        .select({ id: tag.id, name: tag.name, color: tag.color })
        .from(tag)
        .where(and(eq(tag.userId, userId), eq(tag.name, data.name)))
    ).at(0)
  })

export const getEventMetadata = createServerFn({ method: 'GET' })
  .validator((input: unknown) =>
    z.object({ googleEventId: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data }): Promise<EventMeta> => {
    const userId = await requireUserId()
    const meta = (
      await db
        .select()
        .from(eventMetadata)
        .where(
          and(
            eq(eventMetadata.userId, userId),
            eq(eventMetadata.googleEventId, data.googleEventId),
          ),
        )
    ).at(0)
    if (!meta) return { pinned: false, reminderLead: null, notes: null, tagIds: [] }
    const tags = await db
      .select({ tagId: eventTag.tagId })
      .from(eventTag)
      .where(eq(eventTag.eventMetadataId, meta.id))
    return {
      pinned: meta.pinned,
      reminderLead: meta.reminderLead,
      notes: meta.notes,
      tagIds: tags.map((t) => t.tagId),
    }
  })

export const setEventMetadata = createServerFn({ method: 'POST' })
  .validator((input: unknown) =>
    z
      .object({
        googleEventId: z.string().min(1),
        pinned: z.boolean(),
        reminderLead: z.number().int().nullable(),
        notes: z.string().nullable(),
        tagIds: z.array(z.string()),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    const [row] = await db
      .insert(eventMetadata)
      .values({
        userId,
        googleEventId: data.googleEventId,
        pinned: data.pinned,
        reminderLead: data.reminderLead,
        notes: data.notes,
      })
      .onConflictDoUpdate({
        target: [eventMetadata.userId, eventMetadata.googleEventId],
        set: {
          pinned: data.pinned,
          reminderLead: data.reminderLead,
          notes: data.notes,
          updatedAt: new Date(),
        },
      })
      .returning({ id: eventMetadata.id })

    // Reemplaza las etiquetas del evento.
    await db.delete(eventTag).where(eq(eventTag.eventMetadataId, row.id))
    if (data.tagIds.length > 0) {
      // Solo etiquetas que pertenezcan al usuario.
      const owned = await db
        .select({ id: tag.id })
        .from(tag)
        .where(and(eq(tag.userId, userId), inArray(tag.id, data.tagIds)))
      if (owned.length > 0) {
        await db
          .insert(eventTag)
          .values(owned.map((t) => ({ eventMetadataId: row.id, tagId: t.id })))
      }
    }
    return { ok: true }
  })
