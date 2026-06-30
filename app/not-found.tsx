'use client'

import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ fontSize: 64, marginBottom: 8, lineHeight: 1 }}>🎈</div>

        <div style={{
          fontFamily: 'var(--title-font, "Bricolage Grotesque", sans-serif)',
          fontSize: 'clamp(80px, 20vw, 120px)',
          fontWeight: 800,
          color: 'var(--accent)',
          lineHeight: 1,
          marginBottom: 16,
          letterSpacing: '-0.03em',
        }}>
          404
        </div>

        <h1 style={{
          fontFamily: 'var(--title-font, "Bricolage Grotesque", sans-serif)',
          fontSize: 22,
          fontWeight: 700,
          color: 'var(--ink)',
          marginBottom: 10,
        }}>
          Essa página foi para a festa errada.
        </h1>

        <p style={{
          color: 'var(--ink-soft)',
          fontSize: 15,
          lineHeight: 1.6,
          marginBottom: 32,
        }}>
          Não encontramos o que você estava procurando.<br />
          Talvez o link tenha expirado ou o evento foi removido.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" className="btn">
            Ir para o início
          </Link>
          <Link href="/admin" className="btn secondary">
            Área do organizador
          </Link>
        </div>
      </div>
    </div>
  )
}
