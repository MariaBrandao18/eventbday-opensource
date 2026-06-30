import { notFound } from 'next/navigation'
import { sql } from '@/lib/db'
import { getEventBySlug } from '@/actions/events'
import { getGuestByToken } from '@/actions/guests'
import { listGifts } from '@/actions/gifts'
import { getPollsForGuest } from '@/actions/polls'
import { listSuppliesForGuest } from '@/actions/supplies'
import GuestAreaTabs from '@/components/GuestAreaTabs'
import Link from 'next/link'

const AV_COLORS = ['#E8553A','#E84C82','#F2A93B','#7A5AE0','#1F8A5B','#2A6FDB']
const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']

function avatarColor(name: string) {
  let h = 0
  for (const c of name) h = ((h * 31 + c.charCodeAt(0)) >>> 0)
  return AV_COLORS[h % AV_COLORS.length]
}
function coverGradient(seed: string) {
  const base = avatarColor(seed || 'x')
  return `radial-gradient(120% 120% at 20% 0%, color-mix(in oklch,${base},white 18%), color-mix(in oklch,${base},black 14%))`
}
function formatDate(iso: string) {
  const d = new Date(iso)
  const h = String(d.getHours()).padStart(2,'0')
  const m = String(d.getMinutes()).padStart(2,'0')
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()} · ${h}h${m}`
}

interface Props {
  params: { slug: string }
  searchParams: { token?: string }
}

export const dynamic = 'force-dynamic'

export default async function GuestAreaPage({ params, searchParams }: Props) {
  const token = searchParams.token ?? ''

  const event = await getEventBySlug(params.slug)
  if (!event) notFound()

  const guest = await getGuestByToken(token)

  // Sem token válido para este evento → orienta o convidado.
  if (!guest || guest.event_id !== event.id || guest.status !== 'CONFIRMED') {
    return (
      <main>
        <div className="card pad" style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>🔗</div>
          <h1 className="section-title" style={{ fontSize: 22, marginBottom: 8 }}>Link de acesso inválido</h1>
          <p className="muted" style={{ fontSize: 14.5, lineHeight: 1.6, marginBottom: 20 }}>
            Este link de convidado não é válido ou está incompleto. Use o link exato que foi exibido
            quando você confirmou presença, ou confirme presença novamente.
          </p>
          <Link href={`/e/${event.slug}`} className="btn">Ir para o evento →</Link>
        </div>
      </main>
    )
  }

  const confirmedGuests = await sql<{ name: string; companions: number }[]>`
    select name, companions from guests
    where event_id = ${event.id} and status = 'CONFIRMED' and is_public = true
    order by created_at asc
  `

  const [gifts, polls, supplies] = await Promise.all([
    listGifts(event.id, token),
    getPollsForGuest(event.id, token),
    listSuppliesForGuest(event.id, token),
  ])

  const showGuests = event.show_guests !== false
  const showGifts = event.show_gifts !== false
  const showPolls = event.show_polls !== false
  const showSupplies = event.show_supplies !== false
  const emoji = event.emoji || '🎉'

  const totalPeople = confirmedGuests.reduce((n, g) => n + 1 + (g.companions || 0), 0)

  return (
    <main>
      <Link href={`/e/${event.slug}`} className="back-link">← Página do evento</Link>

      <div className="guest-area-hero" style={{ background: coverGradient(event.title) }}>
        <div className="guest-area-emoji">{emoji}</div>
        <div className="guest-area-info">
          <span className="eyebrow ga-eyebrow">Você está confirmado(a) em</span>
          <h1 className="guest-area-title">{event.title}</h1>
          <div className="guest-area-meta">
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, display: 'inline', marginRight: 4, verticalAlign: -2 }}>
                <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              {formatDate(event.date)}
            </span>
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, display: 'inline', marginRight: 4, verticalAlign: -2 }}>
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
              </svg>
              {event.location}
            </span>
          </div>
        </div>
        <div className="guest-area-confirm">
          <span className="status-pill confirmed">✓ {guest.name}</span>
          {guest.companions > 0 && (
            <span className="ga-companions">+ {guest.companions} acompanhante{guest.companions > 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      <div className="guest-area-body">
        {showGuests && confirmedGuests.length > 0 && (
          <div className="card pad">
            <div className="row-between" style={{ marginBottom: 12 }}>
              <h2 className="section-title" style={{ fontSize: 17 }}>Quem vai</h2>
              <span className="muted" style={{ fontSize: 13.5 }}>{totalPeople} pessoa{totalPeople !== 1 ? 's' : ''}</span>
            </div>
            <div className="guest-strip">
              {confirmedGuests.map((g, i) => (
                <div key={i} className="guest-chip">
                  <span className="avatar sm" style={{ background: avatarColor(g.name) }}>
                    {g.name.trim().split(/\s+/).slice(0,2).map((w: string)=>w[0]).join('').toUpperCase()}
                  </span>
                  {g.name}
                  {g.companions > 0 && <span className="muted">+{g.companions}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {(showGifts || showPolls || showSupplies) && (
          <GuestAreaTabs
            gifts={gifts as any}
            polls={polls as any}
            supplies={supplies as any}
            token={token}
            showGifts={showGifts}
            showPolls={showPolls}
            showSupplies={showSupplies}
          />
        )}
      </div>
    </main>
  )
}
