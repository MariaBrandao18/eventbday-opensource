'use server'

import { sql } from '@/lib/db'
import { isAdmin } from '@/lib/admin-auth'
import { createEventSchema, updateEventSchema } from '@/lib/validations'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { Event, EventWithGuestCount } from '@/types/database'

const UNAUTHORIZED = { error: 'Não autorizado', code: 'UNAUTHORIZED' as const }

function dateFromForm(formData: FormData): string | null {
  let dateValue = formData.get('date') as string | null
  if (!dateValue) {
    const dp = formData.get('date_part') as string | null
    const tp = (formData.get('time_part') as string | null) || '19:00'
    if (dp) dateValue = `${dp}T${tp}:00`
  }
  return dateValue
}

export async function createEvent(formData: FormData) {
  if (!isAdmin()) return UNAUTHORIZED

  const raw = {
    title: formData.get('title'),
    slug: formData.get('slug'),
    date: dateFromForm(formData),
    location: formData.get('location') || 'Local a definir',
    description: formData.get('description') || undefined,
    emoji: formData.get('emoji') || '🎉',
  }

  const parsed = createEventSchema.safeParse(raw)
  if (!parsed.success)
    return { error: 'Dados inválidos: ' + parsed.error.issues.map(i => i.message).join(', '), code: 'VALIDATION_ERROR' }

  const [existing] = await sql`select id from events where slug = ${parsed.data.slug} limit 1`
  if (existing) return { error: 'Esse endereço já está em uso. Tente outro.', code: 'SLUG_CONFLICT' }

  const [event] = await sql<Event[]>`
    insert into events (title, slug, date, location, description, emoji, status)
    values (
      ${parsed.data.title},
      ${parsed.data.slug},
      ${new Date(parsed.data.date).toISOString()},
      ${parsed.data.location},
      ${parsed.data.description ?? null},
      ${parsed.data.emoji},
      'ACTIVE'
    )
    returning *
  `

  revalidatePath('/admin')
  return { data: event }
}

export async function updateEvent(eventId: string, formData: FormData) {
  if (!isAdmin()) return UNAUTHORIZED

  const raw = {
    title: formData.get('title'),
    date: dateFromForm(formData),
    location: formData.get('location') || 'Local a definir',
    description: formData.get('description') || undefined,
    emoji: formData.get('emoji') || '🎉',
  }

  const parsed = updateEventSchema.safeParse(raw)
  if (!parsed.success) return { error: 'Dados inválidos', code: 'VALIDATION_ERROR' }

  await sql`
    update events set
      title = ${parsed.data.title},
      date = ${new Date(parsed.data.date).toISOString()},
      location = ${parsed.data.location},
      description = ${parsed.data.description ?? null},
      emoji = ${parsed.data.emoji}
    where id = ${eventId}
  `

  revalidatePath('/admin')
  return { success: true }
}

type SectionKey = 'show_guests' | 'show_gifts' | 'show_polls' | 'show_supplies'

export async function toggleEventSection(
  eventId: string,
  section: SectionKey,
  value: boolean,
  eventSlug?: string
) {
  if (!isAdmin()) return UNAUTHORIZED

  await sql`update events set ${sql(section)} = ${value} where id = ${eventId}`

  revalidatePath(eventSlug ? `/admin/events/${eventSlug}` : '/admin')
  return { success: true }
}

export async function toggleSupplySuggestions(eventId: string, value: boolean, eventSlug?: string) {
  if (!isAdmin()) return UNAUTHORIZED

  await sql`update events set allow_supply_suggestions = ${value} where id = ${eventId}`

  revalidatePath(eventSlug ? `/admin/events/${eventSlug}` : '/admin')
  return { success: true }
}

export async function updateEventStatus(
  eventId: string,
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED'
) {
  if (!isAdmin()) return UNAUTHORIZED

  await sql`update events set status = ${status} where id = ${eventId}`

  revalidatePath('/admin')
  return { success: true }
}

export async function deleteEvent(eventId: string) {
  if (!isAdmin()) return UNAUTHORIZED

  await sql`delete from events where id = ${eventId}`

  revalidatePath('/admin')
  redirect('/admin')
}

export async function getOrganizerEvents(): Promise<EventWithGuestCount[]> {
  if (!isAdmin()) return []

  const events = await sql<Event[]>`select * from events order by date desc`
  if (!events.length) return []

  return Promise.all(
    events.map(async (event) => {
      const [{ total }] = await sql<{ total: number }[]>`
        select count(*)::int as total from guests where event_id = ${event.id}
      `
      const [{ confirmed }] = await sql<{ confirmed: number }[]>`
        select count(*)::int as confirmed from guests
        where event_id = ${event.id} and status = 'CONFIRMED'
      `
      return { ...event, totalCount: total, confirmedCount: confirmed }
    })
  )
}

export async function getEventBySlug(slug: string): Promise<Event | null> {
  const [event] = await sql<Event[]>`select * from events where slug = ${slug} limit 1`
  return event ?? null
}
