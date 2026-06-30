'use server'

import { sql } from '@/lib/db'
import { isAdmin } from '@/lib/admin-auth'
import { reserveGiftSchema } from '@/lib/validations'
import { revalidatePath } from 'next/cache'
import type { GiftPublic } from '@/types/database'

/** Resolve o guest_id internamente a partir do token — NUNCA é exposto. */
async function guestIdFromToken(token: string, eventId: string): Promise<string | null> {
  if (!token) return null
  const [guest] = await sql<{ id: string }[]>`
    select id from guests
    where token = ${token} and event_id = ${eventId} and status = 'CONFIRMED'
    limit 1
  `
  return guest?.id ?? null
}

export async function addGift(formData: FormData) {
  if (!isAdmin()) return { error: 'Não autorizado', code: 'UNAUTHORIZED' }

  const event_id = formData.get('event_id') as string
  const description = (formData.get('description') as string | null)?.trim()
  if (!event_id || !description) return { error: 'Dados inválidos', code: 'VALIDATION_ERROR' }

  const [event] = await sql<{ slug: string }[]>`select slug from events where id = ${event_id} limit 1`
  if (!event) return { error: 'Evento não encontrado', code: 'NOT_FOUND' }

  await sql`insert into gifts (event_id, description, status) values (${event_id}, ${description}, 'AVAILABLE')`

  revalidatePath(`/admin/events/${event.slug}`)
  return { success: true }
}

export async function removeGift(giftId: string) {
  if (!isAdmin()) return { error: 'Não autorizado', code: 'UNAUTHORIZED' }

  const [gift] = await sql<{ event_id: string }[]>`select event_id from gifts where id = ${giftId} limit 1`
  if (!gift) return { error: 'Presente não encontrado', code: 'NOT_FOUND' }

  const [event] = await sql<{ slug: string }[]>`select slug from events where id = ${gift.event_id} limit 1`

  await sql`delete from gifts where id = ${giftId}`

  if (event) revalidatePath(`/admin/events/${event.slug}`)
  return { success: true }
}

/**
 * Lista de presentes para o convidado. Retorna apenas { id, description,
 * status } + reservedByMe — o guest_id NUNCA sai desta Server Action.
 */
export async function listGifts(eventId: string, token: string): Promise<GiftPublic[]> {
  const myGuestId = await guestIdFromToken(token, eventId)

  const gifts = await sql<{ id: string; event_id: string; description: string; status: string; guest_id: string | null }[]>`
    select id, event_id, description, status, guest_id
    from gifts where event_id = ${eventId}
    order by created_at asc
  `

  return gifts.map(({ guest_id, ...gift }) => ({
    ...(gift as Omit<GiftPublic, 'reservedByMe'>),
    reservedByMe: myGuestId ? guest_id === myGuestId : false,
  }))
}

export async function reserveGift(formData: FormData) {
  const raw = { gift_id: formData.get('gift_id'), token: formData.get('token') }
  const parsed = reserveGiftSchema.safeParse(raw)
  if (!parsed.success) return { error: 'Dados inválidos', code: 'VALIDATION_ERROR' }

  const [gift] = await sql<{ id: string; status: string; guest_id: string | null; event_id: string }[]>`
    select id, status, guest_id, event_id from gifts where id = ${parsed.data.gift_id} limit 1
  `
  if (!gift) return { error: 'Presente não encontrado', code: 'NOT_FOUND' }

  const myGuestId = await guestIdFromToken(parsed.data.token, gift.event_id)
  if (!myGuestId) return { error: 'Você não é convidado confirmado deste evento', code: 'FORBIDDEN' }

  if (gift.status === 'RESERVED' && gift.guest_id === myGuestId)
    return { success: true, alreadyReserved: true }
  if (gift.status === 'RESERVED')
    return { error: 'Presente já reservado', code: 'ALREADY_RESERVED' }

  // UPDATE atômico condicional — evita race condition entre dois convidados.
  const updated = await sql`
    update gifts set status = 'RESERVED', guest_id = ${myGuestId}
    where id = ${parsed.data.gift_id} and status = 'AVAILABLE'
    returning id
  `
  if (!updated.length)
    return { error: 'Presente já foi reservado por outra pessoa', code: 'ALREADY_RESERVED' }

  const [event] = await sql<{ slug: string }[]>`select slug from events where id = ${gift.event_id} limit 1`
  if (event) revalidatePath(`/e/${event.slug}/guest`)
  return { success: true }
}

export async function cancelGiftReservation(giftId: string, token: string) {
  const [gift] = await sql<{ id: string; guest_id: string | null; event_id: string }[]>`
    select id, guest_id, event_id from gifts where id = ${giftId} limit 1
  `
  if (!gift) return { error: 'Presente não encontrado', code: 'NOT_FOUND' }

  const myGuestId = await guestIdFromToken(token, gift.event_id)
  if (!myGuestId || gift.guest_id !== myGuestId) return { error: 'Sem permissão', code: 'FORBIDDEN' }

  await sql`update gifts set status = 'AVAILABLE', guest_id = null where id = ${giftId}`

  const [event] = await sql<{ slug: string }[]>`select slug from events where id = ${gift.event_id} limit 1`
  if (event) revalidatePath(`/e/${event.slug}/guest`)
  return { success: true }
}
