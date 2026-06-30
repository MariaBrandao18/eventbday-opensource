'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { adminLogin } from '@/actions/admin'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="btn" disabled={pending} style={{ width: '100%', marginTop: 8 }}>
      {pending ? 'Entrando...' : 'Entrar no painel'}
    </button>
  )
}

export default function AdminLogin() {
  const [state, formAction] = useFormState(adminLogin, null)

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--bg)' }}>
      <div className="card" style={{ width: '100%', maxWidth: 400, padding: '32px 28px' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 40, lineHeight: 1, marginBottom: 8 }}>🔑</div>
          <h1 className="section-title" style={{ fontSize: 24 }}>Área do organizador</h1>
          <p className="muted" style={{ fontSize: 14, marginTop: 6 }}>
            Informe a chave de administração desta instância (variável <code>ADMIN_TOKEN</code>).
          </p>
        </div>

        <form action={formAction}>
          {state?.error && (
            <div className="wz-error" style={{ marginBottom: 12 }}>{state.error}</div>
          )}
          <div className="wz-field" style={{ margin: 0 }}>
            <label>Chave de administração</label>
            <input type="password" name="token" placeholder="ADMIN_TOKEN" autoFocus required />
          </div>
          <SubmitButton />
        </form>
      </div>
    </div>
  )
}
