'use client'

import { useState, useTransition } from 'react'
import { reserveGift, cancelGiftReservation } from '@/actions/gifts'
import { vote } from '@/actions/polls'
import { signupForSupply, leaveSupply } from '@/actions/supplies'

interface Gift {
  id: string
  description: string
  status: string
  reservedByMe: boolean
}
interface PollOption { id: string; text: string; votes?: number }
interface Poll {
  id: string
  question: string
  is_active: boolean
  deadline: string | null
  result_visibility: string
  poll_options: PollOption[]
  userVoteOptionId?: string | null
}
interface Supply {
  id: string
  name: string
  quantity: number
  mode: string
  signedCount: number
  signedByMe: boolean
}

interface Props {
  gifts: Gift[]
  polls: Poll[]
  supplies: Supply[]
  token: string
  showGifts: boolean
  showPolls: boolean
  showSupplies: boolean
}

export default function GuestAreaTabs({ gifts, polls, supplies, token, showGifts, showPolls, showSupplies }: Props) {
  const tabs = [
    showGifts && { key: 'gifts', label: '🎁 Presentes' },
    showPolls && { key: 'polls', label: '📊 Enquetes' },
    showSupplies && { key: 'supplies', label: '🛒 Insumos' },
  ].filter(Boolean) as { key: string; label: string }[]

  const [activeTab, setActiveTab] = useState(tabs[0]?.key ?? 'gifts')
  const [, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  function flash(msg: string, type: 'success' | 'error' = 'success') {
    setFeedback({ msg, type })
    setTimeout(() => setFeedback(null), 2800)
  }

  function handleReserve(giftId: string, reservedByMe: boolean) {
    if (pendingId !== null) return
    setPendingId(giftId)
    startTransition(async () => {
      try {
        if (reservedByMe) {
          const res = await cancelGiftReservation(giftId, token)
          if (res?.error) flash(res.error, 'error')
          else flash('Reserva cancelada.')
        } else {
          const fd = new FormData()
          fd.set('gift_id', giftId)
          fd.set('token', token)
          const res = await reserveGift(fd)
          if (res?.error) flash(res.error, 'error')
          else flash('Presente reservado! 🎁')
        }
      } finally {
        setPendingId(null)
      }
    })
  }

  function handleVote(pollId: string, optionId: string) {
    if (pendingId !== null) return
    setPendingId(pollId)
    startTransition(async () => {
      try {
        const fd = new FormData()
        fd.set('poll_id', pollId)
        fd.set('option_id', optionId)
        fd.set('token', token)
        const res = await vote(fd)
        if (res?.error) flash(res.error, 'error')
        else flash('Voto registrado!')
      } finally {
        setPendingId(null)
      }
    })
  }

  function handleSupply(supplyId: string, signedByMe: boolean) {
    if (pendingId !== null) return
    setPendingId(supplyId)
    startTransition(async () => {
      try {
        const res = signedByMe
          ? await leaveSupply(supplyId, token)
          : await signupForSupply(supplyId, token)
        if (res?.error) flash(res.error, 'error')
        else flash(signedByMe ? 'Inscrição removida.' : 'Você entrou neste item!')
      } finally {
        setPendingId(null)
      }
    })
  }

  if (tabs.length === 0) return null

  return (
    <div>
      {feedback && (
        <div
          className={feedback.type === 'error' ? 'wz-error' : 'wz-feedback-success'}
          style={{ marginBottom: 12 }}
        >
          {feedback.msg}
        </div>
      )}

      <div className="tabs">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`tab${activeTab === t.key ? ' active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* PRESENTES */}
      {activeTab === 'gifts' && (
        <div className="tab-panel">
          {gifts.length === 0 ? (
            <p className="empty-hint">Nenhum presente na lista.</p>
          ) : (
            <ul className="gift-list">
              {gifts.map(g => (
                <li key={g.id} className={`gift${g.reservedByMe ? ' mine' : ''}`}>
                  <span className="gift-name">{g.description}</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {g.status === 'RESERVED' && !g.reservedByMe && (
                      <span className="gtag bring"><span className="d" />Alguém vai levar</span>
                    )}
                    {g.reservedByMe && (
                      <span className="gtag bring"><span className="d" />Você vai levar</span>
                    )}
                    {(g.status === 'AVAILABLE' || g.reservedByMe) && (
                      <button
                        className={`btn sm${g.reservedByMe ? ' secondary' : ''}`}
                        disabled={pendingId === g.id}
                        onClick={() => handleReserve(g.id, g.reservedByMe)}
                      >
                        {pendingId === g.id ? '...' : g.reservedByMe ? 'Cancelar' : 'Reservar'}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ENQUETES */}
      {activeTab === 'polls' && (
        <div className="tab-panel">
          {polls.length === 0 ? (
            <p className="empty-hint">Nenhuma enquete disponível.</p>
          ) : (
            <div className="poll-list">
              {polls.map(p => {
                const totalVotes = p.poll_options.reduce((s, o) => s + (o.votes ?? 0), 0)
                const deadlinePassed = !!p.deadline && new Date(p.deadline) < new Date()
                const showResults =
                  p.result_visibility === 'REALTIME' ||
                  !p.is_active ||
                  (p.result_visibility === 'AFTER_DEADLINE' && deadlinePassed)
                return (
                  <div key={p.id} className="poll card-inner">
                    <h3 className="poll-q">{p.question}</h3>
                    {!p.is_active && <span className="poll-closed-tag">Encerrada</span>}
                    <div className="poll-options">
                      {p.poll_options.map(o => {
                        const pct = totalVotes > 0 ? Math.round(((o.votes ?? 0) / totalVotes) * 100) : 0
                        const voted = p.userVoteOptionId === o.id
                        const canVote = p.is_active && !p.userVoteOptionId && pendingId !== p.id
                        return (
                          <div
                            key={o.id}
                            className={`poll-opt${voted ? ' voted' : ''}${!canVote ? ' no-click' : ''}`}
                            onClick={() => canVote && handleVote(p.id, o.id)}
                            role={canVote ? 'button' : undefined}
                            tabIndex={canVote ? 0 : undefined}
                            onKeyDown={e => e.key === 'Enter' && canVote && handleVote(p.id, o.id)}
                          >
                            <div className="poll-opt-label">
                              <span>{o.text}</span>
                              {voted && <span className="poll-check">✓</span>}
                              {showResults && <span className="poll-pct">{pct}%</span>}
                            </div>
                            {showResults && (
                              <div className="poll-bar">
                                <div className="poll-fill" style={{ width: `${pct}%` }} />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    {p.is_active && !p.userVoteOptionId && (
                      <p className="poll-hint">Clique em uma opção para votar.</p>
                    )}
                    {p.userVoteOptionId && (
                      <p className="poll-hint voted">Você votou!</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* INSUMOS */}
      {activeTab === 'supplies' && (
        <div className="tab-panel">
          {supplies.length === 0 ? (
            <p className="empty-hint">Nenhum insumo listado.</p>
          ) : (
            <ul className="supply-list">
              {supplies.map(s => {
                const full = s.signedCount >= s.quantity
                return (
                  <li key={s.id} className={`supply${s.signedByMe ? ' mine' : ''}`}>
                    <div className="supply-info">
                      <span className="supply-name">{s.name}</span>
                      <span className="supply-progress">
                        {s.signedCount}/{s.quantity}
                        {full && !s.signedByMe && <span className="supply-full"> · completo</span>}
                      </span>
                    </div>
                    <div className="supply-bar-wrap">
                      <div className="supply-bar">
                        <div className="supply-fill" style={{ width: `${Math.min(100, (s.signedCount / s.quantity) * 100)}%` }} />
                      </div>
                    </div>
                    <button
                      className={`btn sm${s.signedByMe ? ' secondary' : full ? ' ghost' : ''}`}
                      disabled={pendingId === s.id || (full && !s.signedByMe)}
                      onClick={() => handleSupply(s.id, s.signedByMe)}
                    >
                      {pendingId === s.id ? '...' : s.signedByMe ? 'Sair' : full ? 'Completo' : 'Participar'}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
