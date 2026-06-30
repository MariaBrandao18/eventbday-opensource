'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { updateEvent } from '@/actions/events'
import Link from 'next/link'

const EMOJI_SUGGESTIONS = ['🎂', '🎉', '🎈', '🍖', '🍼', '🥂', '🎓', '🏠', '🌟', '💍']

interface Props {
  eventId: string
  slug: string
  initial: {
    title: string
    description: string
    location: string
    emoji: string
    date: string
  }
}

function toDatePart(iso: string) {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
function toTimePart(iso: string) {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}`
}

export default function EditEventForm({ eventId, slug, initial }: Props) {
  const router = useRouter()
  const [emoji, setEmoji] = useState(initial.emoji || '🎉')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setLoading(true)
    setError('')
    const result = await updateEvent(eventId, fd)
    setLoading(false)
    if (result?.error) { setError(result.error); return }
    router.push(`/admin/events/${slug}`)
    router.refresh()
  }

  return (
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

      <div className="wz-field" style={{ margin: 0 }}>
        <label>Título do evento</label>
        <input type="text" name="title" defaultValue={initial.title} required />
      </div>

      <div className="wz-field" style={{ margin: 0 }}>
        <label>Descrição</label>
        <input type="text" name="description" defaultValue={initial.description} placeholder="Uma frase de convite..." />
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div className="wz-field" style={{ flex: 1, margin: 0 }}>
          <label>Data</label>
          <input type="date" name="date_part" defaultValue={toDatePart(initial.date)} required />
        </div>
        <div className="wz-field" style={{ flex: '0 0 130px', margin: 0 }}>
          <label>Hora</label>
          <input type="time" name="time_part" defaultValue={toTimePart(initial.date)} />
        </div>
      </div>

      <div className="wz-field" style={{ margin: 0 }}>
        <label>Local</label>
        <input type="text" name="location" defaultValue={initial.location} placeholder="Endereço do evento" />
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <Link href={`/admin/events/${slug}`} className="btn secondary" style={{ flex: 'none' }}>Cancelar</Link>
        <button type="submit" disabled={loading} className="btn" style={{ flex: 1 }}>
          {loading ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </form>
  )
}
