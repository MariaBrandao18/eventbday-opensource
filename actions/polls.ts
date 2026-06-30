'use server'

import { sql } from '@/lib/db'
import { isAdmin } from '@/lib/admin-auth'
import { voteSchema, createPollSchema } from '@/lib/validations'
import { revalidatePath } from 'next/cache'
import type { Poll, PollOption, PollWithOptions } from '@/types/database'

async function guestIdFromToken(token: string, eventId: string): Promise<string | null> {
  if (!token) return null
  const [guest] = await sql<{ id: string }[]>`
    select id from guests
    where token = ${token} and event_id = ${eventId} and status = 'CONFIRMED'
    limit 1
  `
  return guest?.id ?? null
}

export async function vote(formData: FormData) {
  const raw = {
    poll_id: formData.get('poll_id'),
    option_id: formData.get('option_id'),
    token: formData.get('token'),
  }
  const parsed = voteSchema.safeParse(raw)
  if (!parsed.success) return { error: 'Dados inválidos', code: 'VALIDATION_ERROR' }

  const [poll] = await sql<{ id: string; is_active: boolean; deadline: string | null; event_id: string }[]>`
    select id, is_active, deadline, event_id from polls where id = ${parsed.data.poll_id} limit 1
  `
  if (!poll?.is_active) return { error: 'Enquete encerrada', code: 'POLL_CLOSED' }
  if (poll.deadline && new Date(poll.deadline) < new Date())
    return { error: 'Prazo expirado', code: 'POLL_EXPIRED' }

  const myGuestId = await guestIdFromToken(parsed.data.token, poll.event_id)
  if (!myGuestId) return { error: 'Sem permissão', code: 'FORBIDDEN' }

  await sql`
    insert into poll_votes (poll_id, option_id, guest_id)
    values (${parsed.data.poll_id}, ${parsed.data.option_id}, ${myGuestId})
    on conflict (poll_id, guest_id) do update set option_id = excluded.option_id
  `

  const [event] = await sql<{ slug: string }[]>`select slug from events where id = ${poll.event_id} limit 1`
  if (event) revalidatePath(`/e/${event.slug}/guest`)
  return { success: true }
}

export async function createPoll(formData: FormData) {
  if (!isAdmin()) return { error: 'Não autorizado', code: 'UNAUTHORIZED' }

  const raw = {
    event_id: formData.get('event_id'),
    question: formData.get('question'),
    options: formData.getAll('options'),
    deadline: formData.get('deadline') || undefined,
    result_visibility: formData.get('result_visibility') ?? 'REALTIME',
  }

  const parsed = createPollSchema.safeParse(raw)
  if (!parsed.success) return { error: 'Dados inválidos', code: 'VALIDATION_ERROR' }

  const [event] = await sql<{ slug: string }[]>`select slug from events where id = ${parsed.data.event_id} limit 1`
  if (!event) return { error: 'Evento não encontrado', code: 'NOT_FOUND' }

  const [poll] = await sql<Poll[]>`
    insert into polls (event_id, question, deadline, result_visibility)
    values (${parsed.data.event_id}, ${parsed.data.question}, ${parsed.data.deadline ?? null}, ${parsed.data.result_visibility})
    returning *
  `

  for (const text of parsed.data.options) {
    await sql`insert into poll_options (poll_id, text) values (${poll.id}, ${text})`
  }

  revalidatePath(`/admin/events/${event.slug}`)
  return { data: poll }
}

export async function closePoll(pollId: string) {
  if (!isAdmin()) return { error: 'Não autorizado', code: 'UNAUTHORIZED' }

  const [poll] = await sql<{ event_id: string }[]>`select event_id from polls where id = ${pollId} limit 1`
  if (!poll) return { error: 'Enquete não encontrada', code: 'NOT_FOUND' }

  await sql`update polls set is_active = false where id = ${pollId}`

  const [event] = await sql<{ slug: string }[]>`select slug from events where id = ${poll.event_id} limit 1`
  if (event) revalidatePath(`/admin/events/${event.slug}`)
  return { success: true }
}

export async function removePoll(pollId: string) {
  if (!isAdmin()) return { error: 'Não autorizado', code: 'UNAUTHORIZED' }

  const [poll] = await sql<{ event_id: string }[]>`select event_id from polls where id = ${pollId} limit 1`
  if (!poll) return { error: 'Enquete não encontrada', code: 'NOT_FOUND' }

  await sql`delete from polls where id = ${pollId}`

  const [event] = await sql<{ slug: string }[]>`select slug from events where id = ${poll.event_id} limit 1`
  if (event) revalidatePath(`/admin/events/${event.slug}`)
  return { success: true }
}

export async function getPollsForOrganizer(eventId: string) {
  const polls = await sql<Poll[]>`
    select * from polls where event_id = ${eventId} order by created_at asc
  `

  return Promise.all(
    polls.map(async (p) => {
      const options = await sql<{ id: string; text: string; votes: number }[]>`
        select o.id, o.text, count(v.id)::int as votes
        from poll_options o
        left join poll_votes v on v.option_id = o.id
        where o.poll_id = ${p.id}
        group by o.id, o.text
        order by o.id
      `
      return { ...p, options }
    })
  )
}

export async function getPollsForGuest(eventId: string, token: string): Promise<PollWithOptions[]> {
  const myGuestId = await guestIdFromToken(token, eventId)

  const polls = await sql<Poll[]>`
    select * from polls where event_id = ${eventId} and is_active = true order by created_at asc
  `

  return Promise.all(
    polls.map(async (poll) => {
      const poll_options = await sql<PollOption[]>`
        select * from poll_options where poll_id = ${poll.id} order by id
      `
      // Anexa a contagem de votos por opção (resultado sempre agregado).
      const counts = await sql<{ option_id: string; votes: number }[]>`
        select option_id, count(*)::int as votes from poll_votes where poll_id = ${poll.id} group by option_id
      `
      const countMap = new Map(counts.map(c => [c.option_id, c.votes]))
      const withVotes = poll_options.map(o => ({ ...o, votes: countMap.get(o.id) ?? 0 }))

      let userVoteOptionId: string | null = null
      if (myGuestId) {
        const [myVote] = await sql<{ option_id: string }[]>`
          select option_id from poll_votes where poll_id = ${poll.id} and guest_id = ${myGuestId} limit 1
        `
        userVoteOptionId = myVote?.option_id ?? null
      }

      return { ...poll, poll_options: withVotes as PollOption[], userVoteOptionId }
    })
  )
}
