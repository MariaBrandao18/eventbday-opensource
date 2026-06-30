'use server'

import { sql } from '@/lib/db'
import { isAdmin } from '@/lib/admin-auth'
import { rsvpSchema } from '@/lib/validations'
import { generateInviteToken } from '@/lib/utils'
import { revalidatePath } from 'next/cache'
import type { Guest } from '@/types/database'

/**
 * RSVP público — sem conta de usuário e sem envio de e-mail.
 * Insere o convidado, gera um token único e retorna o link de acesso,
 * que a própria tela exibe para o convidado salvar.
 */
export async function rsvp(eventId: string, eventSlug: string, formData: FormData) {
  let companionNames: string[] = []
  try {
    const rawNames = formData.get('companion_names')
    if (rawNames) companionNames = JSON.parse(rawNames as string)
  } catch {}

  const raw = {
    name: formData.get('name'),
    email: formData.get('email') || '',
    companions: Number(formData.get('companions') ?? 0),
    companion_names: companionNames,
    dietary_notes: formData.get('dietary_notes') || undefined,
    is_public: formData.get('is_public') !== 'false',
  }

  const parsed = rsvpSchema.safeParse(raw)
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos', code: 'VALIDATION_ERROR' }

  // Confirma que o evento existe e está aberto a confirmações.
  const [event] = await sql<{ id: string; status: string }[]>`
    select id, status from events where id = ${eventId} limit 1
  `
  if (!event) return { error: 'Evento não encontrado', code: 'NOT_FOUND' }
  if (event.status !== 'ACTIVE') return { error: 'As confirmações para este evento estão encerradas.', code: 'EVENT_CLOSED' }

  const token = generateInviteToken()

  await sql`
    insert into guests (event_id, name, email, token, status, is_public, companions, companion_names, dietary_notes)
    values (
      ${eventId},
      ${parsed.data.name},
      ${parsed.data.email || null},
      ${token},
      'CONFIRMED',
      ${parsed.data.is_public},
      ${parsed.data.companions},
      ${parsed.data.companion_names},
      ${parsed.data.dietary_notes ?? null}
    )
  `

  revalidatePath(`/e/${eventSlug}`)
  revalidatePath('/admin')
  return { success: true, token, slug: eventSlug }
}

export async function removeGuest(guestId: string) {
  if (!isAdmin()) return { error: 'Não autorizado', code: 'UNAUTHORIZED' }

  const [guest] = await sql<{ id: string; event_id: string }[]>`
    select id, event_id from guests where id = ${guestId} limit 1
  `
  if (!guest) return { error: 'Convidado não encontrado', code: 'NOT_FOUND' }

  const [event] = await sql<{ slug: string }[]>`select slug from events where id = ${guest.event_id} limit 1`

  await sql`delete from guests where id = ${guestId}`

  if (event) revalidatePath(`/admin/events/${event.slug}`)
  return { success: true }
}

/** Resolve um convidado a partir do token de acesso (área do convidado). */
export async function getGuestByToken(token: string): Promise<Guest | null> {
  if (!token) return null
  const [guest] = await sql<Guest[]>`select * from guests where token = ${token} limit 1`
  return guest ?? null
}
