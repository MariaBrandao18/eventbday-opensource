'use client'

import { useState } from 'react'

interface Props {
  value: string
}

export default function CopyButton({ value }: Props) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle')

  async function handleCopy() {
    let success = false
    try {
      await navigator.clipboard.writeText(value)
      success = true
    } catch {
      const ta = document.createElement('textarea')
      ta.value = value
      document.body.appendChild(ta)
      ta.select()
      success = document.execCommand('copy')
      document.body.removeChild(ta)
    }

    if (success) {
      setState('copied')
      setTimeout(() => setState('idle'), 1800)
    } else {
      setState('error')
      setTimeout(() => setState('idle'), 2000)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`btn sm share-copy${state === 'copied' ? ' copied' : ''}`}
      id="share-copy-btn"
      type="button"
    >
      {state === 'copied' ? (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          Copiado!
        </>
      ) : state === 'error' ? (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
          </svg>
          Erro ao copiar
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Copiar
        </>
      )}
    </button>
  )
}
