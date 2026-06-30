import { notFound } from 'next/navigation'
import { sql } from '@/lib/db'
import { getEventBySlug } from '@/actions/events'
import CountdownTimer from '@/components/CountdownTimer'
import RsvpModal from '@/components/RsvpModal'
import Link from 'next/link'

const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
const AV_COLORS = ['#E8553A','#E84C82','#F2A93B','#7A5AE0','#1F8A5B','#2A6FDB']

function avatarColor(name: string) {
  let h = 0
  for (const c of name) h = ((h * 31 + c.charCodeAt(0)) >>> 0)
  return AV_COLORS[h % AV_COLORS.length]
}
function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}
function formatDate(iso: string) {
  const d = new Date(iso)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()} · ${h}h${m}`
}

const CONFETTI_SEEDS = [[6,12,-18],[16,82,24],[34,46,8],[58,8,-12],[72,90,30],[88,30,-22],[44,70,14],[24,24,40]]
const CONFETTI_COLORS_CSS = ['var(--coral)','var(--amber)','var(--pink)','var(--coral)','var(--amber)','var(--pink)','#7A5AE0']

interface Props {
  params: { slug: string }
}

export const dynamic = 'force-dynamic'

export default async function PublicEventPage({ params }: Props) {
  const event = await getEventBySlug(params.slug)

  if (!event || event.status === 'DRAFT' || event.status === 'ARCHIVED') notFound()

  const [confirmedGuests, giftList] = await Promise.all([
    sql<{ name: string; companions: number }[]>`
      select name, companions from guests
      where event_id = ${event.id} and status = 'CONFIRMED' and is_public = true
      order by created_at asc
    `,
    sql<{ id: string; description: string; status: string }[]>`
      select id, description, status from gifts where event_id = ${event.id} order by created_at asc
    `,
  ])

  const emoji = event.emoji || '🎉'
  const showGuests = event.show_guests !== false
  const showGifts = event.show_gifts !== false

  const totalPeople = confirmedGuests.reduce((n, g) => n + 1 + (g.companions || 0), 0)

  const confettiItems = CONFETTI_SEEDS.map((s, i) =>
    `<i style="top:${s[0]}%;left:${s[1]}%;background:${CONFETTI_COLORS_CSS[i % CONFETTI_COLORS_CSS.length]};transform:rotate(${s[2]}deg)"></i>`
  ).join('')

  const hasRightCol = showGuests || showGifts

  return (
    <>
      <nav className="topbar">
        <div className="topbar-inner">
          <Link href="/" className="brand">
            <div className="brand-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 21h16v-7H4z" /><path d="M4 14c0-1.5 1-2 2-2s2 .5 2 2 1 2 2 2 2-.5 2-2 1-2 2-2 2 .5 2 2" />
                <path d="M12 8V4" /><circle cx="12" cy="3" r="1" />
              </svg>
            </div>
            <span className="brand-name">Event<b>Bday</b></span>
          </Link>
        </div>
      </nav>

      <main>
        <div className={`event-layout${hasRightCol ? '' : ' solo'}`}>
          {/* CAPA */}
          <div className="hero cover">
            <div className="confetti" dangerouslySetInnerHTML={{ __html: confettiItems }} />
            <div className="hero-grid">
              <span className="event-pill">{emoji} Você foi convidado(a) para:</span>
              <h1 className="event-name">{event.title}</h1>
              {event.description && <p className="event-desc">{event.description}</p>}
              <div className="event-meta">
                <div className="meta-item">
                  <span className="meta-ico">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                  </span>
                  <span>
                    <span className="lab">Quando</span>
                    <span className="val">{formatDate(event.date)}</span>
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-ico">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
                    </svg>
                  </span>
                  <span>
                    <span className="lab">Onde</span>
                    <span className="val">{event.location}</span>
                  </span>
                </div>
              </div>
              <CountdownTimer targetDate={event.date} />

              {/* CTA mobile */}
              {event.status === 'ACTIVE' && (
                <RsvpModal
                  event={{ id: event.id, slug: event.slug, title: event.title }}
                  gifts={giftList.filter(g => g.status === 'AVAILABLE').map(g => ({ id: g.id, description: g.description }))}
                  inline
                />
              )}
            </div>
          </div>

          {/* COLUNA DIREITA */}
          {hasRightCol && (
            <div className="col-right">
              {showGuests && (
                <div className="card pad guest-card">
                  <div className="row-between" style={{ marginBottom: 16 }}>
                    <h2 className="section-title" style={{ fontSize: 19 }}>Lista de convidados</h2>
                    <span className="status free"><span className="d" />{confirmedGuests.length}</span>
                  </div>
                  <div className="guest-strip">
                    {confirmedGuests.length > 0
                      ? confirmedGuests.map((g, i) => (
                        <div key={i} className="guest-chip">
                          <span className="avatar" style={{ background: avatarColor(g.name) }}>
                            {initials(g.name)}
                          </span>
                          {g.name}
                          {g.companions > 0 && <span className="muted" style={{ fontWeight: 600 }}>+{g.companions}</span>}
                        </div>
                      ))
                      : <p className="guest-empty">Seja o primeiro a confirmar presença! 🎉</p>
                    }
                  </div>
                  <p className="guest-count-note">{totalPeople} pessoa(s) confirmada(s), incluindo acompanhantes.</p>
                </div>
              )}

              {showGifts && giftList.length > 0 && (
                <div className="card pad gift-card">
                  <div className="row-between" style={{ marginBottom: 6 }}>
                    <h2 className="section-title" style={{ fontSize: 19 }}>Lista de presentes</h2>
                    <span className="anon-tag">🕶️ anônimo</span>
                  </div>
                  <p className="muted" style={{ fontSize: 13.5, marginBottom: 12 }}>Quem reservou um presente fica anônimo.</p>
                  <div className="gift-mini-list">
                    {giftList.map(g => (
                      <div key={g.id} className="gift-mini">
                        <span className="gift-mini-name">{g.description}</span>
                        {g.status === 'RESERVED'
                          ? <span className="gtag bring"><span className="d" />Alguém vai levar</span>
                          : <span className="gtag suggest"><span className="d" />Sugestão</span>
                        }
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CTA desktop */}
        {event.status === 'ACTIVE' && (
          <RsvpModal
            event={{ id: event.id, slug: event.slug, title: event.title }}
            gifts={giftList.filter(g => g.status === 'AVAILABLE').map(g => ({ id: g.id, description: g.description }))}
          />
        )}
      </main>
    </>
  )
}
