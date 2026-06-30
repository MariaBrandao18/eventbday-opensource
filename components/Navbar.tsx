import Link from 'next/link'
import { adminLogout } from '@/actions/admin'

export default function Navbar() {
  return (
    <nav className="topbar">
      <div className="topbar-inner">
        <Link href="/admin" className="brand">
          <div className="brand-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 21h16v-7H4z" />
              <path d="M4 14c0-1.5 1-2 2-2s2 .5 2 2 1 2 2 2 2-.5 2-2 1-2 2-2 2 .5 2 2" />
              <path d="M12 8V4" />
              <circle cx="12" cy="3" r="1" />
            </svg>
          </div>
          <span className="brand-name">Event<b>Bday</b></span>
        </Link>

        <div className="nav-links">
          <Link href="/admin" className="nav-link">Eventos</Link>
        </div>

        <div style={{ marginLeft: 'auto' }}>
          <form action={adminLogout}>
            <button type="submit" className="btn secondary sm">Sair do painel</button>
          </form>
        </div>
      </div>
    </nav>
  )
}
