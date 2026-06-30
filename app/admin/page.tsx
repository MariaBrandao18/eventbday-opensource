import { getOrganizerEvents } from '@/actions/events'
import Link from 'next/link'

const AV_COLORS = ['#E8553A', '#E84C82', '#F2A93B', '#7A5AE0', '#1F8A5B', '#2A6FDB']
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function avatarColor(seed: string) {
  let h = 0
  for (const c of seed) h = ((h * 31 + c.charCodeAt(0)) >>> 0)
  return AV_COLORS[h % AV_COLORS.length]
}
function coverGradient(seed: string) {
  const base = avatarColor(seed || 'x')
  return `radial-gradient(120% 120% at 20% 0%, color-mix(in oklch,${base},white 18%), color-mix(in oklch,${base},black 14%))`
}
function shortDate(iso: string) {
  const d = new Date(iso)
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`
}

const calIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
)
const usersIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" />
  </svg>
)

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const events = await getOrganizerEvents()

  return (
    <main>
      <header className="home-head">
        <span className="eyebrow">Painel do organizador</span>
        <h1 className="home-greeting">Seus eventos 🎉</h1>
        <p className="muted" style={{ fontSize: 16 }}>Tudo o que você organiza nesta instância, em um só lugar.</p>
      </header>

      <section className="home-section">
        <div className="home-section-head">
          <div>
            <h2 className="home-section-title">Eventos</h2>
            <p className="home-section-sub">{events.length} evento{events.length !== 1 ? 's' : ''} sob sua gestão</p>
          </div>
          <Link href="/admin/events/new" className="btn sm">+ Criar evento</Link>
        </div>

        <div className="ev-grid">
          <Link href="/admin/events/new" className="ev-card ev-new" style={{ display: 'flex' }}>
            <span className="ev-new-plus">+</span>
            <span className="ev-new-label">Criar evento</span>
          </Link>

          {events.map(e => (
            <Link key={e.id} href={`/admin/events/${e.slug}`} className="ev-card">
              <div className="ev-cover" style={{ background: coverGradient(e.title) }}>
                <span className="ev-emoji">{e.emoji || '🎉'}</span>
                <span className="ev-role-tag organizer">Organizador</span>
              </div>
              <div className="ev-card-body">
                <h3 className="ev-card-name">{e.title}</h3>
                <div className="ev-card-meta">{calIcon}<span>{shortDate(e.date)}</span></div>
                <div className="ev-card-foot">
                  <span className="ev-people">
                    {usersIcon}
                    <span>{e.confirmedCount}</span>
                  </span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-faint)', background: 'var(--surface-2)', padding: '3px 9px', borderRadius: 999 }}>
                    {e.status === 'ACTIVE' ? 'Ativo' : e.status === 'DRAFT' ? 'Rascunho' : e.status === 'CLOSED' ? 'Encerrado' : 'Arquivado'}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
