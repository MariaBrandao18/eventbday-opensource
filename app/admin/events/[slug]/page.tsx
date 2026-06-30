import { notFound } from 'next/navigation'
import { sql } from '@/lib/db'
import { getEventBySlug, updateEventStatus, toggleEventSection, toggleSupplySuggestions, deleteEvent } from '@/actions/events'
import { addGift, removeGift } from '@/actions/gifts'
import { removeGuest } from '@/actions/guests'
import { createPoll, closePoll, removePoll, getPollsForOrganizer } from '@/actions/polls'
import { addSupply, removeSupply, listSuppliesForOrganizer } from '@/actions/supplies'
import CopyButton from '@/components/CopyButton'
import Link from 'next/link'

const AV_COLORS = ['#E8553A','#E84C82','#F2A93B','#7A5AE0','#1F8A5B','#2A6FDB']

function avatarColor(name: string) {
  let h = 0
  for (const c of name) h = ((h * 31 + c.charCodeAt(0)) >>> 0)
  return AV_COLORS[h % AV_COLORS.length]
}
function initials(name: string) {
  return name.trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase()
}
function coverGradient(seed: string) {
  const base = avatarColor(seed || 'x')
  return `radial-gradient(120% 120% at 20% 0%, color-mix(in oklch,${base},white 18%), color-mix(in oklch,${base},black 14%))`
}
function formatDateFull(iso: string) {
  const d = new Date(iso)
  const h = String(d.getHours()).padStart(2,'0')
  const m = String(d.getMinutes()).padStart(2,'0')
  return `${d.getDate()} de ${['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'][d.getMonth()]} de ${d.getFullYear()} · ${h}h${m}`
}

interface Props { params: { slug: string } }

type SectionKey = 'show_guests' | 'show_gifts' | 'show_polls' | 'show_supplies'
type FA = (fd: FormData) => void

export const dynamic = 'force-dynamic'

export default async function ManageEventPage({ params }: Props) {
  const event = await getEventBySlug(params.slug)
  if (!event) notFound()

  const ev = event

  const [guests, gifts, polls, supplies] = await Promise.all([
    sql<{ id: string; name: string; email: string | null; status: string; companions: number; companion_names: string[]; is_public: boolean }[]>`
      select id, name, email, status, companions, companion_names, is_public
      from guests where event_id = ${event.id} order by created_at asc
    `,
    sql<{ id: string; description: string; status: string }[]>`
      select id, description, status from gifts where event_id = ${event.id} order by created_at asc
    `,
    getPollsForOrganizer(event.id),
    listSuppliesForOrganizer(event.id),
  ])

  const confirmedCount = guests.filter(g => g.status === 'CONFIRMED').length
  const giftReservedCount = gifts.filter(g => g.status === 'RESERVED').length

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const publicUrl = `${baseUrl}/e/${event.slug}`

  const sections: { key: SectionKey; label: string; icon: string }[] = [
    { key: 'show_guests', label: 'Lista de convidados', icon: '👥' },
    { key: 'show_gifts', label: 'Lista de presentes', icon: '🎁' },
    { key: 'show_polls', label: 'Enquetes', icon: '📊' },
    { key: 'show_supplies', label: 'Insumos', icon: '🛒' },
  ]

  const totalGuests = guests.length
  const totalPeople = guests.filter(g => g.status === 'CONFIRMED').reduce((n, g) => n + 1 + (g.companions || 0), 0)

  const addGiftAction = addGift as unknown as FA
  const createPollAction = createPoll as unknown as FA
  const addSupplyAction = addSupply as unknown as FA

  return (
    <main>
      <Link href="/admin" className="back-link">← Meus eventos</Link>

      <div className="manage-grid">
        {/* ── COLUNA ESQUERDA ─────────────── */}
        <div className="manage-left">

          <div className="cover-card" style={{ background: coverGradient(event.title) }}>
            <span className="cover-emoji">{ev.emoji || '🎉'}</span>
            <div className="cover-body">
              <h1 className="cover-title">{event.title}</h1>
              <p className="cover-date">{formatDateFull(event.date)}</p>
              <p className="cover-loc">{event.location}</p>
            </div>
            <Link href={`/admin/events/${event.slug}/edit`} className="cover-edit-btn btn sm secondary">
              Editar
            </Link>
          </div>

          <div className="card pad">
            <h2 className="section-title" style={{ fontSize: 16, marginBottom: 12 }}>Link do evento</h2>
            <div className="share-row">
              <span className="share-url">{publicUrl}</span>
              <CopyButton value={publicUrl} />
            </div>
            <Link href={`/e/${event.slug}`} target="_blank" className="btn ghost sm" style={{ marginTop: 8, paddingLeft: 0 }}>
              Ver página pública →
            </Link>
          </div>

          <div className="metrics-grid">
            <div className="metric-card">
              <span className="metric-val">{totalGuests}</span>
              <span className="metric-lab">Convidados</span>
            </div>
            <div className="metric-card accent">
              <span className="metric-val">{confirmedCount}</span>
              <span className="metric-lab">Confirmados</span>
            </div>
            <div className="metric-card">
              <span className="metric-val">{totalPeople}</span>
              <span className="metric-lab">Pessoas</span>
            </div>
            <div className="metric-card">
              <span className="metric-val">{giftReservedCount}</span>
              <span className="metric-lab">Presentes reservados</span>
            </div>
          </div>

          {guests.filter(g => g.status === 'CONFIRMED').length > 0 && (
            <div className="card pad">
              <h2 className="section-title" style={{ fontSize: 16, marginBottom: 12 }}>Quem confirmou</h2>
              <ul className="item-list">
                {guests.filter(g => g.status === 'CONFIRMED').map(g => (
                  <li key={g.id} className="item-row" style={{ alignItems: 'center' }}>
                    <div className="av-sm" style={{ background: avatarColor(g.name), flexShrink: 0 }}>
                      {initials(g.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span className="item-name">{g.name}</span>
                      {(g.companion_names?.length > 0) && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 6px', marginTop: 4 }}>
                          {g.companion_names.map((cn, i) => (
                            <span key={i} style={{ fontSize: 12, color: 'var(--ink-soft)', background: 'var(--surface-2)', borderRadius: 6, padding: '1px 7px' }}>
                              {cn}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {(g.companions ?? 0) > 0 && (
                      <span className="muted" style={{ fontSize: 13, flexShrink: 0 }}>
                        +{g.companions} acomp.
                      </span>
                    )}
                    <form action={removeGuest.bind(null, g.id) as unknown as FA}>
                      <button type="submit" className="row-del-btn" title="Remover convidado">×</button>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="card pad">
            <h2 className="section-title" style={{ fontSize: 16, marginBottom: 14 }}>O que aparece no evento</h2>
            <div className="section-toggles">
              {sections.map(s => (
                <div key={s.key} className="toggle-row">
                  <span className="toggle-label">
                    <span className="toggle-ico">{s.icon}</span>
                    {s.label}
                  </span>
                  <form action={toggleEventSection.bind(null, event.id, s.key, ev[s.key] === false, event.slug) as unknown as FA}>
                    <button type="submit" className={`toggle-btn${ev[s.key] !== false ? ' on' : ''}`}>
                      {ev[s.key] !== false ? 'Visível' : 'Oculto'}
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </div>

          <div className="card pad">
            <h2 className="section-title" style={{ fontSize: 16, marginBottom: 14 }}>Status do evento</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {event.status !== 'ACTIVE' && (
                <form action={updateEventStatus.bind(null, event.id, 'ACTIVE') as unknown as FA}>
                  <button type="submit" className="btn sm">Ativar</button>
                </form>
              )}
              {event.status === 'ACTIVE' && (
                <form action={updateEventStatus.bind(null, event.id, 'CLOSED') as unknown as FA}>
                  <button type="submit" className="btn secondary sm">Encerrar</button>
                </form>
              )}
              {event.status !== 'ARCHIVED' && event.status !== 'ACTIVE' && (
                <form action={deleteEvent.bind(null, event.id) as unknown as FA}>
                  <button type="submit" className="btn danger sm" style={{ marginLeft: 'auto' }}>Excluir evento</button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* ── COLUNA DIREITA ─────────────── */}
        <div className="manage-right">

          {/* Presentes */}
          <div className="card pad">
            <div className="row-between" style={{ marginBottom: 16 }}>
              <h2 className="section-title" style={{ fontSize: 19 }}>Presentes</h2>
              <span className="status free"><span className="d" />{gifts.length} itens</span>
            </div>

            <form action={addGiftAction} className="add-form">
              <input type="hidden" name="event_id" value={event.id} />
              <div style={{ display: 'flex', gap: 8 }}>
                <input name="description" type="text" required placeholder="Nome do presente" className="wz-input" style={{ flex: 1 }} />
                <button type="submit" className="btn sm">Adicionar</button>
              </div>
            </form>

            {gifts.length === 0 ? (
              <p className="empty-hint">Nenhum presente adicionado.</p>
            ) : (
              <ul className="item-list">
                {gifts.map(g => (
                  <li key={g.id} className="item-row">
                    <span className="item-name">{g.description}</span>
                    <span className={`gtag ${g.status === 'RESERVED' ? 'bring' : 'suggest'}`}>
                      <span className="d" />
                      {g.status === 'RESERVED' ? 'Reservado' : 'Disponível'}
                    </span>
                    <form action={removeGift.bind(null, g.id) as unknown as FA}>
                      <button type="submit" className="row-del-btn" title="Remover">×</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Enquetes */}
          <div className="card pad">
            <div className="row-between" style={{ marginBottom: 16 }}>
              <h2 className="section-title" style={{ fontSize: 19 }}>Enquetes</h2>
              <span className="status free"><span className="d" />{polls.length} enquetes</span>
            </div>

            <form action={createPollAction} className="poll-form">
              <input type="hidden" name="event_id" value={event.id} />
              <input name="question" type="text" required placeholder="Pergunta da enquete" className="wz-input" style={{ width: '100%', marginBottom: 8 }} />
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input name="options" type="text" required placeholder="Opção 1" className="wz-input" style={{ flex: 1 }} />
                <input name="options" type="text" required placeholder="Opção 2" className="wz-input" style={{ flex: 1 }} />
              </div>
              <button type="submit" className="btn sm">Criar enquete</button>
            </form>

            {polls.length === 0 ? (
              <p className="empty-hint">Nenhuma enquete criada.</p>
            ) : (
              <ul className="item-list">
                {polls.map(p => (
                  <li key={p.id} className="poll-item">
                    <div className="poll-head">
                      <span className="poll-question">{p.question}</span>
                      <span className={`status-pill ${p.is_active ? 'confirmed' : 'declined'}`}>
                        {p.is_active ? 'Ativa' : 'Encerrada'}
                      </span>
                    </div>
                    <div className="poll-options">
                      {p.options.map((o) => (
                        <div key={o.id} className="poll-bar-row">
                          <span className="poll-opt-text">{o.text}</span>
                          <span className="poll-opt-votes">{o.votes} voto{o.votes !== 1 ? 's' : ''}</span>
                        </div>
                      ))}
                    </div>
                    <div className="poll-actions">
                      {p.is_active && (
                        <form action={closePoll.bind(null, p.id) as unknown as FA}>
                          <button type="submit" className="btn ghost sm">Encerrar</button>
                        </form>
                      )}
                      <form action={removePoll.bind(null, p.id) as unknown as FA}>
                        <button type="submit" className="btn ghost sm danger-text">Excluir</button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Insumos */}
          <div className="card pad">
            <div className="row-between" style={{ marginBottom: 8 }}>
              <h2 className="section-title" style={{ fontSize: 19 }}>Insumos</h2>
              <span className="status free"><span className="d" />{supplies.length} itens</span>
            </div>

            <form action={addSupplyAction} className="add-form">
              <input type="hidden" name="event_id" value={event.id} />
              <div style={{ display: 'flex', gap: 8 }}>
                <input name="name" type="text" required placeholder="Ex.: Refrigerante 2L" className="wz-input" style={{ flex: 1 }} />
                <input name="quantity" type="number" min={1} defaultValue={1} className="wz-input" style={{ width: 64 }} />
                <button type="submit" className="btn sm">Adicionar</button>
              </div>
            </form>

            {supplies.length === 0 ? (
              <p className="empty-hint">Nenhum insumo adicionado.</p>
            ) : (
              <ul className="item-list">
                {supplies.map(s => (
                  <li key={s.id} className="item-row supply-row">
                    <span className="item-name">{s.name}</span>
                    <span className="supply-count muted">
                      {s.signedCount}/{s.quantity}
                      {s.mode === 'NOMINAL' && s.signers.length > 0 && (
                        <span className="supply-signers"> · {s.signers.join(', ')}</span>
                      )}
                    </span>
                    <form action={removeSupply.bind(null, s.id) as unknown as FA}>
                      <button type="submit" className="row-del-btn" title="Remover">×</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
