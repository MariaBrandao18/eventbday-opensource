import Link from 'next/link'

export default function Home() {
  return (
    <main>
      <div className="card pad" style={{ maxWidth: 560, margin: '80px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 56, lineHeight: 1, marginBottom: 12 }}>🎂</div>
        <h1 className="section-title" style={{ fontSize: 34, marginBottom: 10 }}>Event<span style={{ color: 'var(--accent)' }}>Bday</span></h1>
        <p className="muted" style={{ fontSize: 16, lineHeight: 1.6, marginBottom: 24 }}>
          Sua instância self-hosted de gestão de eventos e aniversários.
          Crie eventos, monte o RSVP, lista de presença, lista de presentes anônima e enquetes —
          tudo sem contas de usuário e sem serviços pagos.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/admin" className="btn">Área do organizador →</Link>
        </div>
        <p className="muted" style={{ fontSize: 13, marginTop: 22 }}>
          Convidado? Acesse a página do evento pelo link que o organizador compartilhou
          (<code>/e/seu-evento</code>).
        </p>
      </div>
    </main>
  )
}
