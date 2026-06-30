'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createEvent } from '@/actions/events'
import { generateSlug } from '@/lib/utils'
import Link from 'next/link'

const EMOJI_SUGGESTIONS = ['🎂', '🎉', '🎈', '🍖', '🍼', '🥂', '🎓', '🏠', '🌟', '💍']

export default function NewEventPage() {
  const router = useRouter()
  const [slug, setSlug] = useState('')
  const [emoji, setEmoji] = useState('🎉')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [nameErr, setNameErr] = useState(false)
  const [dateErr, setDateErr] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    const title = (fd.get('title') as string || '').trim()
    const date = fd.get('date_part') as string
    let ok = true
    if (!title) { setNameErr(true); ok = false }
    if (!date) {
      setDateErr(true); ok = false
    } else {
      const d = new Date(date)
      const today = new Date(); today.setHours(0, 0, 0, 0)
      if (d < today) { setDateErr(true); ok = false }
    }
    if (!ok) return
    setLoading(true)
    setError('')
    const result = await createEvent(fd)
    setLoading(false)
    if (result?.error) { setError(result.error); return }
    if (result?.data) router.push(`/admin/events/${result.data.slug}`)
  }

  return (
    <main>
      <Link href="/admin" className="back-link">← Meus eventos</Link>

      <div style={{ margin: '6px 0 28px' }}>
        <span className="eyebrow">Novo evento</span>
        <h1 className="section-title" style={{ fontSize: 32 }}>Criar evento</h1>
      </div>

      <div className="card" style={{ maxWidth: 560, padding: '28px 28px 24px' }}>
        <form onSubmit={handleSubmit} className="ev-form">
          {error && (
            <div style={{ padding: '12px 16px', background: 'color-mix(in oklch, #C53D2E, transparent 92%)', borderRadius: 'var(--radius-sm)', color: '#C53D2E', fontSize: 14, fontWeight: 600 }}>
              {error}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Emoji do evento</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              {EMOJI_SUGGESTIONS.map(em => (
                <button
                  key={em} type="button"
                  onClick={() => setEmoji(em)}
                  style={{
                    width: 40, height: 40, fontSize: 22, borderRadius: 'var(--radius-sm)',
                    border: `1.5px solid ${emoji === em ? 'var(--accent)' : 'var(--line-strong)'}`,
                    background: emoji === em ? 'color-mix(in oklch, var(--accent), transparent 92%)' : 'var(--surface)',
                    cursor: 'pointer', display: 'grid', placeItems: 'center',
                  }}
                >
                  {em}
                </button>
              ))}
            </div>
            <input type="hidden" name="emoji" value={emoji} />
          </div>

          <div className={`wz-field${nameErr ? ' invalid' : ''}`} style={{ margin: 0 }}>
            <label>Título do evento <span className="req">*</span></label>
            <input
              type="text" name="title" placeholder="Ex.: Aniversário da Maria"
              onChange={e => {
                setSlug(generateSlug(e.target.value))
                setNameErr(false)
              }}
            />
            <div className="err">Informe um título para o evento.</div>
          </div>

          <div className="wz-field" style={{ margin: 0 }}>
            <label>Descrição</label>
            <input type="text" name="description" placeholder="Uma frase de convite..." />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div className={`wz-field${dateErr ? ' invalid' : ''}`} style={{ flex: 1, margin: 0 }}>
              <label>Data <span className="req">*</span></label>
              <input type="date" name="date_part" onChange={() => setDateErr(false)} />
              <div className="err">A data deve ser hoje ou no futuro.</div>
            </div>
            <div className="wz-field" style={{ flex: '0 0 130px', margin: 0 }}>
              <label>Hora</label>
              <input type="time" name="time_part" defaultValue="19:00" />
            </div>
          </div>

          <div className="wz-field" style={{ margin: 0 }}>
            <label>Local</label>
            <input type="text" name="location" placeholder="Endereço do evento" />
          </div>

          <div className="wz-field" style={{ margin: 0 }}>
            <label>Endereço do evento (URL)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}>/e/</span>
              <input
                type="text" name="slug" value={slug} required
                onChange={e => setSlug(e.target.value)}
                placeholder="aniversario-da-maria"
                style={{ flex: 1 }}
              />
            </div>
            <div className="hint">Apenas letras minúsculas, números e hífens.</div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <Link href="/admin" className="btn secondary" style={{ flex: 'none' }}>Cancelar</Link>
            <button type="submit" disabled={loading} className="btn" style={{ flex: 1 }}>
              {loading ? 'Criando...' : 'Criar evento 🎉'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
