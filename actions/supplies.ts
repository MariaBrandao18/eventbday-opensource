'use server'

import { sql } from '@/lib/db'
import { isAdmin } from '@/lib/admin-auth'
import { revalidatePath } from 'next/cache'

async function guestIdFromToken(token: string, eventId: string): Promise<string | null> {
  if (!token) return null
  const [guest] = await sql<{ id: string }[]>`
    select id from guests
    where token = ${token} and event_id = ${eventId} and status = 'CONFIRMED'
    limit 1
  `
  return guest?.id ?? null
}

export async function addSupply(formData: FormData) {
  if (!isAdmin()) return { error: 'Não autorizado', code: 'UNAUTHORIZED' }

  const event_id = formData.get('event_id') as string
  const name = (formData.get('name') as string | null)?.trim()
  const quantity = Number(formData.get('quantity') ?? 1)
  const mode = (formData.get('mode') as string) === 'NOMINAL' ? 'NOMINAL' : 'ANONYMOUS'

  if (!event_id || !name) return { error: 'Dados inválidos', code: 'VALIDATION_ERROR' }

  const [event] = await sql<{ slug: string }[]>`select slug from events where id = ${event_id} limit 1`
  if (!event) return { error: 'Evento não encontrado', code: 'NOT_FOUND' }

  await sql`
    insert into supplies (event_id, name, quantity, mode)
    values (${event_id}, ${name}, ${Math.max(1, quantity)}, ${mode})
  `

  revalidatePath(`/admin/events/${event.slug}`)
  return { success: true }
}

export async function removeSupply(supplyId: string) {
  if (!isAdmin()) return { error: 'Não autorizado', code: 'UNAUTHORIZED' }

  const [supply] = await sql<{ event_id: string }[]>`select event_id from supplies where id = ${supplyId} limit 1`
  if (!supply) return { error: 'Item não encontrado', code: 'NOT_FOUND' }

  const [event] = await sql<{ slug: string }[]>`select slug from events where id = ${supply.event_id} limit 1`

  await sql`delete from supplies where id = ${supplyId}`

  if (event) revalidatePath(`/admin/events/${event.slug}`)
  return { success: true }
}

export async function signupForSupply(supplyId: string, token: string) {
  const [supply] = await sql<{ event_id: string }[]>`select event_id from supplies where id = ${supplyId} limit 1`
  if (!supply) return { error: 'Item não encontrado', code: 'NOT_FOUND' }

  const myGuestId = await guestIdFromToken(token, supply.event_id)
  if (!myGuestId) return { error: 'Você não é convidado confirmado', code: 'FORBIDDEN' }

  try {
    await sql`insert into supply_signups (supply_id, guest_id) values (${supplyId}, ${myGuestId})`
  } catch {
    return { error: 'Já inscrito neste item', code: 'ALREADY_SIGNED' }
  }

  const [event] = await sql<{ slug: string }[]>`select slug from events where id = ${supply.event_id} limit 1`
  if (event) revalidatePath(`/e/${event.slug}/guest`)
  return { success: true }
}

export async function leaveSupply(supplyId: string, token: string) {
  const [supply] = await sql<{ event_id: string }[]>`select event_id from supplies where id = ${supplyId} limit 1`
  if (!supply) return { error: 'Item não encontrado', code: 'NOT_FOUND' }

  const myGuestId = await guestIdFromToken(token, supply.event_id)
  if (!myGuestId) return { error: 'Sem permissão', code: 'FORBIDDEN' }

  await sql`delete from supply_signups where supply_id = ${supplyId} and guest_id = ${myGuestId}`

  const [event] = await sql<{ slug: string }[]>`select slug from events where id = ${supply.event_id} limit 1`
  if (event) revalidatePath(`/e/${event.slug}/guest`)
  return { success: true }
}

export async function listSuppliesForGuest(eventId: string, token: string) {
  const myGuestId = await guestIdFromToken(token, eventId)

  const supplies = await sql<{ id: string; name: string; quantity: number; mode: string }[]>`
    select id, name, quantity, mode from supplies where event_id = ${eventId} order by created_at asc
  `

  return Promise.all(
    supplies.map(async (s) => {
      const signups = await sql<{ guest_id: string }[]>`
        select guest_id from supply_signups where supply_id = ${s.id}
      `
      return {
        id: s.id,
        name: s.name,
        quantity: s.quantity,
        mode: s.mode,
        signedCount: signups.length,
        signedByMe: myGuestId ? signups.some(sg => sg.guest_id === myGuestId) : false,
      }
    })
  )
}

export async function listSuppliesForOrganizer(eventId: string) {
  const supplies = await sql<{ id: string; name: string; quantity: number; mode: string }[]>`
    select id, name, quantity, mode from supplies where event_id = ${eventId} order by created_at asc
  `

  return Promise.all(
    supplies.map(async (s) => {
      const signers = await sql<{ name: string }[]>`
        select g.name from supply_signups ss
        join guests g on g.id = ss.guest_id
        where ss.supply_id = ${s.id}
      `
      return {
        id: s.id,
        name: s.name,
        quantity: s.quantity,
        mode: s.mode,
        signedCount: signers.length,
        signers: signers.map(x => x.name),
      }
    })
  )
}
