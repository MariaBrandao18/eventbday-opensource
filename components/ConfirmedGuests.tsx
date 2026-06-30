'use client'

import { useState } from 'react'
import { removeGuest } from '@/actions/guests'
import CopyButton from '@/components/CopyButton'

const AV_COLORS = ['#E8553A', '#E84C82', '#F2A93B', '#7A5AE0', '#1F8A5B', '#2A6FDB']
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

function avatarColor(name: string) {
  let h = 0
  for (const c of name) h = ((h * 31 + c.charCodeAt(0)) >>> 0)
  return AV_COLORS[h % AV_COLORS.length]
}
function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}
function formatDateFull(iso: string) {
  const d = new Date(iso)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()} · ${h}h${m}`
}

export interface ConfirmedGuest {
  id: string
  name: string
  email: string | null
  status: string
  companions: number
  companion_names: string[]
  is_public: boolean
  token: string
  dietary_notes: string | null
  created_at: string
}

interface Props {
  guests: ConfirmedGuest[]
  baseUrl: string
  slug: string
}

export default function ConfirmedGuests({ guests, baseUrl, slug }: Props) {
  const [selected, setSelected] = useState<ConfirmedGuest | null>(null)

  if (guests.length === 0) return null

  const guestLink = selected ? `${baseUrl}/e/${slug}/guest?token=${selected.token}` : ''

  return (
    <div className="card pad">
      <h2 className="section-title" style={{ fontSize: 16, marginBottom: 12 }}>Quem confirmou</h2>
      <ul className="item-list">
        {guests.map(g => (
          <li
            key={g.id}
            className="item-row guest-row-clickable"
            style={{ alignItems: 'center', cursor: 'pointer' }}
            role="button"
            tabIndex={0}
            onClick={() => setSelected(g)}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setSelected(g))}
          >
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
            <form
              action={removeGuest.bind(null, g.id) as unknown as (fd: FormData) => void}
              onClick={e => e.stopPropagation()}
            >
              <button type="submit" className="row-del-btn" title="Remover convidado">×</button>
            </form>
          </li>
        ))}
      </ul>

      {selected && (
        <div
          className="ev-overlay open"
          onClick={() => setSelected(null)}
        >
          <div className="card ev-modal" onClick={e => e.stopPropagation()}>
            <div className="row-between" style={{ marginBottom: 16, alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
                <div className="av-sm" style={{ background: avatarColor(selected.name), flexShrink: 0 }}>
                  {initials(selected.name)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <h2 className="section-title" style={{ fontSize: 19, lineHeight: 1.2 }}>{selected.name}</h2>
                  <span className="status-pill confirmed" style={{ marginTop: 4, display: 'inline-block' }}>Confirmado</span>
                </div>
              </div>
              <button
                type="button"
                className="row-del-btn"
                title="Fechar"
                onClick={() => setSelected(null)}
                style={{ flexShrink: 0 }}
              >
                ×
              </button>
            </div>

            <dl className="guest-detail-list">
              <div className="guest-detail-row">
                <dt>E-mail</dt>
                <dd>{selected.email || <span className="muted">Não informado</span>}</dd>
              </div>
              <div className="guest-detail-row">
                <dt>Acompanhantes</dt>
                <dd>
                  {(selected.companions ?? 0) === 0
                    ? <span className="muted">Nenhum</span>
                    : (
                      <>
                        {selected.companions} acompanhante{selected.companions !== 1 ? 's' : ''}
                        {selected.companion_names?.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 6px', marginTop: 6 }}>
                            {selected.companion_names.map((cn, i) => (
                              <span key={i} style={{ fontSize: 12, color: 'var(--ink-soft)', background: 'var(--surface-2)', borderRadius: 6, padding: '1px 7px' }}>
                                {cn}
                              </span>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                </dd>
              </div>
              <div className="guest-detail-row">
                <dt>Restrições / observações</dt>
                <dd>{selected.dietary_notes || <span className="muted">Nenhuma</span>}</dd>
              </div>
              <div className="guest-detail-row">
                <dt>Visibilidade</dt>
                <dd>{selected.is_public ? 'Aparece na lista pública' : 'Anônimo (oculto da lista)'}</dd>
              </div>
              <div className="guest-detail-row">
                <dt>Confirmou em</dt>
                <dd>{formatDateFull(selected.created_at)}</dd>
              </div>
            </dl>

            <div className="ev-visblock" style={{ marginTop: 18 }}>
              <div className="ev-visblock-title">Link da área do convidado</div>
              <div className="share-row" style={{ marginTop: 8 }}>
                <span className="share-url">{guestLink}</span>
                <CopyButton value={guestLink} />
              </div>
              <a href={guestLink} target="_blank" rel="noopener noreferrer" className="btn ghost sm" style={{ marginTop: 8, paddingLeft: 0 }}>
                Abrir área do convidado →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
