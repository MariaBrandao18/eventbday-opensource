'use client'

import { useState, useTransition } from 'react'
import { rsvp } from '@/actions/guests'
import { reserveGift } from '@/actions/gifts'
import CopyButton from './CopyButton'

const DIET_OPTIONS = [
  { label: 'Nenhuma restrição alimentar' },
  { label: 'Alergia à proteína do leite de vaca (APLV)', desc: 'Reação imunológica às proteínas do leite, diferente da intolerância à lactose.' },
  { label: 'Alergia a oleaginosas (Castanhas e Amendoim)', desc: 'Inclui nozes, castanhas, amendoim e similares. Pode causar reações graves.' },
  { label: 'Alergia a frutos do mar', desc: 'Inclui camarão, caranguejo, lagosta e outros crustáceos e moluscos.' },
  { label: 'Alergia a ovo', desc: 'Reação às proteínas da clara ou da gema do ovo.' },
  { label: 'Alergia a soja', desc: 'Reação às proteínas da soja e seus derivados.' },
  { label: 'Intolerância à Lactose', desc: 'Dificuldade em digerir o açúcar do leite (lactose). Afeta laticínios em geral.' },
  { label: 'Intolerância a Glúten', desc: 'Sensibilidade ao glúten presente em trigo, centeio e cevada.' },
  { label: 'Doença Celíaca', desc: 'Reação autoimune ao glúten. Exige alimentação 100% livre de glúten.' },
  { label: 'Diabetes', desc: 'Controle do consumo de açúcar e carboidratos simples.' },
  { label: 'Hipertensão (Restrição de sódio)', desc: 'Redução do consumo de sal e alimentos ricos em sódio.' },
  { label: 'Vegetarianismo', desc: 'Não consome carne, mas pode consumir ovos e laticínios.' },
  { label: 'Veganismo', desc: 'Não consome nenhum produto de origem animal.' },
  { label: 'Alimentação Kosher', desc: 'Segue as leis dietéticas da tradição judaica.' },
  { label: 'Alimentação Halal', desc: 'Segue as normas dietéticas da tradição islâmica.' },
]

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}

interface Gift { id: string; description: string }
interface Props {
  event: { id: string; slug: string; title: string }
  gifts: Gift[]
  inline?: boolean
}

export default function RsvpModal({ event, gifts, inline }: Props) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)
  const [guestToken, setGuestToken] = useState('')
  const [pending, startTransition] = useTransition()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // step 0 - identity
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  // step 1 - companions
  const [companions, setCompanions] = useState(0)
  const [wantNames, setWantNames] = useState(false)
  const [companionNames, setCompanionNames] = useState<string[]>([])
  const [isPublic, setIsPublic] = useState(true)

  // step 2 - diet
  const [diet, setDiet] = useState<string[]>([])

  // step 3 - gift
  const [selectedGift, setSelectedGift] = useState<string | null>(null)

  const totalSteps = gifts.length > 0 ? 4 : 3

  function handleCompanionsChange(next: number) {
    setCompanions(next)
    setCompanionNames(prev => {
      const arr = [...prev]
      while (arr.length < next) arr.push('')
      return arr.slice(0, next)
    })
    if (next === 0) setWantNames(false)
  }

  function setCompanionName(i: number, val: string) {
    setCompanionNames(prev => prev.map((n, idx) => idx === i ? val : n))
  }

  function toggleDiet(label: string) {
    if (label === 'Nenhuma restrição alimentar') {
      setDiet(prev => prev.includes(label) ? [] : [label])
      return
    }
    setDiet(prev => {
      const without = prev.filter(d => d !== 'Nenhuma restrição alimentar')
      return without.includes(label) ? without.filter(d => d !== label) : [...without, label]
    })
  }

  function handleOpen() {
    setOpen(true)
    setStep(0)
    setDone(false)
    setGuestToken('')
    setError('')
  }
  function handleClose() { setOpen(false) }

  function handleNext() {
    setError('')

    if (step === 0) {
      if (!name.trim()) { setError('Informe seu nome'); return }
      if (email.trim() && !isValidEmail(email.trim())) { setError('E-mail inválido. Use o formato nome@dominio.com'); return }
    }

    if (step === 1 && wantNames) {
      const empty = companionNames.findIndex(n => !n.trim())
      if (empty !== -1) { setError(`Informe o nome do acompanhante ${empty + 1}`); return }
    }

    if (step === 2 && diet.length === 0) {
      setError('Selecione ao menos uma opção.')
      return
    }

    setStep(s => Math.min(s + 1, totalSteps - 1))
  }

  function handleSubmit() {
    if (submitting) return
    setSubmitting(true)
    startTransition(async () => {
      try {
        const fd = new FormData()
        fd.set('name', name.trim())
        fd.set('email', email.trim())
        fd.set('companions', String(companions))
        fd.set('companion_names', JSON.stringify(wantNames ? companionNames.filter(n => n.trim()) : []))
        fd.set('dietary_notes', diet.join(', '))
        fd.set('is_public', String(isPublic))

        const res = await rsvp(event.id, event.slug, fd)
        if (res?.error || !res?.token) { setError(res?.error ?? 'Erro ao confirmar presença'); return }

        const token = res.token

        if (selectedGift) {
          const gfd = new FormData()
          gfd.set('gift_id', selectedGift)
          gfd.set('token', token)
          const giftRes = await reserveGift(gfd)
          if (giftRes?.error) {
            setError(`Presença confirmada! Mas o presente não pôde ser reservado: ${giftRes.error}`)
          }
        }

        setGuestToken(token)
        setDone(true)
      } finally {
        setSubmitting(false)
      }
    })
  }

  const isLastStep = step === totalSteps - 1

  const guestUrl = guestToken
    ? `${typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_BASE_URL ?? '')}/e/${event.slug}/guest?token=${guestToken}`
    : ''

  const trigger = inline ? (
    <button onClick={handleOpen} className="btn confirm-cta-inline">
      Confirmar presença
    </button>
  ) : (
    <div className="rsvp-fab-wrap">
      <button onClick={handleOpen} className="btn rsvp-fab">
        🎉 Confirmar presença
      </button>
    </div>
  )

  return (
    <>
      {trigger}

      {open && (
        <div className="rsvp-overlay" onClick={e => { if (e.target === e.currentTarget) handleClose() }}>
          <div className="rsvp-modal">
            {done ? (
              <div className="wz-success">
                <div className="wz-success-icon">🎉</div>
                <h2>Presença confirmada!</h2>
                <p>Ficamos felizes que você vai ao <strong>{event.title}</strong>.</p>
                {selectedGift && <p className="wz-success-gift">Você também reservou um presente. Obrigado!</p>}

                <div style={{ marginTop: 18, textAlign: 'left' }}>
                  <p className="wz-sub" style={{ marginBottom: 8 }}>
                    <strong>Guarde este link de acesso.</strong> É por ele que você reserva presentes,
                    vota em enquetes e participa dos insumos. Não há login — o link é a sua chave.
                  </p>
                  <div className="share-row">
                    <span className="share-url">{guestUrl}</span>
                    <CopyButton value={guestUrl} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
                  <button onClick={handleClose} className="btn secondary">Fechar</button>
                  <a href={guestUrl} className="btn">Acessar área do convidado →</a>
                </div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="wz-head">
                  <div className="wz-steps">
                    {Array.from({ length: totalSteps }).map((_, i) => (
                      <span key={i} className={`wz-dot${i === step ? ' active' : i < step ? ' done' : ''}`} />
                    ))}
                  </div>
                  <button onClick={handleClose} className="wz-close" aria-label="Fechar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="wz-body">
                  {error && <div className="wz-error">{error}</div>}

                  {/* Step 0 – Identity */}
                  {step === 0 && (
                    <div className="wz-step">
                      <h2 className="wz-title">Você foi convidado(a) 🎈</h2>
                      <p className="wz-sub">Para confirmar presença em <strong>{event.title}</strong>, precisamos de alguns dados.</p>
                      <div className="wz-field">
                        <label>Seu nome</label>
                        <input
                          type="text"
                          value={name}
                          onChange={e => setName(e.target.value)}
                          placeholder="Como podemos te chamar?"
                        />
                      </div>
                      <div className="wz-field">
                        <label>Seu e-mail <span className="muted" style={{ fontWeight: 400 }}>(opcional)</span></label>
                        <input
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="seu@email.com"
                          onBlur={() => {
                            if (email && !isValidEmail(email)) setError('E-mail inválido. Use o formato nome@dominio.com')
                            else setError('')
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Step 1 – Companions */}
                  {step === 1 && (
                    <div className="wz-step">
                      <h2 className="wz-title">Vai trazer alguém? 👨‍👩‍👧</h2>
                      <p className="wz-sub">Informe quantos acompanhantes vão com você (além de você).</p>
                      <div className="wz-counter">
                        <button
                          type="button"
                          className="wz-counter-btn"
                          onClick={() => handleCompanionsChange(Math.max(0, companions - 1))}
                          disabled={companions === 0}
                        >−</button>
                        <span className="wz-counter-val">{companions}</span>
                        <button
                          type="button"
                          className="wz-counter-btn"
                          onClick={() => handleCompanionsChange(Math.min(10, companions + 1))}
                        >+</button>
                      </div>
                      <p className="wz-hint">
                        {companions === 0
                          ? 'Só você mesmo. Que ótimo!'
                          : `Você + ${companions} = ${companions + 1} pessoas no total.`}
                      </p>

                      {companions > 0 && (
                        <div className="wz-toggle-row" style={{ marginTop: 16 }}>
                          <label className="wz-toggle-label">
                            <input
                              type="checkbox"
                              checked={wantNames}
                              onChange={e => setWantNames(e.target.checked)}
                            />
                            Quero informar os nomes dos acompanhantes
                          </label>
                        </div>
                      )}

                      {companions > 0 && wantNames && (
                        <div className="wz-companion-names">
                          {companionNames.map((n, i) => (
                            <div key={i} className="wz-field" style={{ marginBottom: 10 }}>
                              <label>Acompanhante {i + 1}</label>
                              <input
                                type="text"
                                value={n}
                                onChange={e => setCompanionName(i, e.target.value)}
                                placeholder={`Nome do acompanhante ${i + 1}`}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="wz-toggle-row" style={{ marginTop: 16 }}>
                        <label className="wz-toggle-label">
                          <input
                            type="checkbox"
                            checked={isPublic}
                            onChange={e => setIsPublic(e.target.checked)}
                          />
                          Aparecer na lista pública de convidados
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Step 2 – Diet */}
                  {step === 2 && (
                    <div className="wz-step">
                      <h2 className="wz-title">Restrições alimentares? 🥗</h2>
                      <p className="wz-sub">Selecione as que se aplicam a você.</p>
                      <div className="wz-diet-list">
                        {DIET_OPTIONS.map(opt => (
                          <label
                            key={opt.label}
                            className={`wz-diet-item${diet.includes(opt.label) ? ' selected' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={diet.includes(opt.label)}
                              onChange={() => toggleDiet(opt.label)}
                            />
                            <div className="wz-diet-text">
                              <span className="wz-diet-name">{opt.label}</span>
                              {'desc' in opt && <span className="wz-diet-desc">{opt.desc}</span>}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 3 – Gift */}
                  {step === 3 && gifts.length > 0 && (
                    <div className="wz-step">
                      <h2 className="wz-title">Quer levar um presente? 🎁</h2>
                      <p className="wz-sub">Opcional. Só você saberá o que escolheu.</p>
                      <div className="wz-gift-list">
                        {gifts.map(g => (
                          <label key={g.id} className={`wz-gift-item${selectedGift === g.id ? ' selected' : ''}`}>
                            <input
                              type="radio"
                              name="gift"
                              value={g.id}
                              checked={selectedGift === g.id}
                              onChange={() => setSelectedGift(g.id)}
                            />
                            <span>{g.description}</span>
                          </label>
                        ))}
                        <label className={`wz-gift-item${selectedGift === null ? ' selected' : ''}`}>
                          <input
                            type="radio"
                            name="gift"
                            value=""
                            checked={selectedGift === null}
                            onChange={() => setSelectedGift(null)}
                          />
                          <span>Prefiro não escolher agora</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="wz-foot">
                  {step > 0 && (
                    <button className="btn secondary" onClick={() => { setStep(s => s - 1); setError('') }} disabled={pending || submitting}>
                      Voltar
                    </button>
                  )}
                  {!isLastStep ? (
                    <button className="btn" onClick={handleNext} disabled={pending || submitting} style={{ marginLeft: 'auto' }}>
                      Continuar →
                    </button>
                  ) : (
                    <button className="btn" onClick={handleSubmit} disabled={pending || submitting} style={{ marginLeft: 'auto' }}>
                      {submitting ? 'Confirmando...' : 'Confirmar presença 🎉'}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
