'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleLogin() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      window.location.href = '/dashboard'
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '2rem', border: '1px solid var(--line)', borderRadius: '12px', background: 'var(--surface)' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '500', marginBottom: '6px' }}>Sign in</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-3)', marginBottom: '24px' }}>Weave by Creative Renaissance</p>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '13px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '13px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{ width: '100%', boxSizing: 'border-box' }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>

        {error && <p style={{ fontSize: '13px', color: '#e24b4a', marginBottom: '16px' }}>{error}</p>}

        <button onClick={handleLogin} disabled={loading} style={{ width: '100%', padding: '10px' }}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>

        <p style={{ fontSize: '13px', color: 'var(--text-3)', textAlign: 'center', marginTop: '16px' }}>
          No account? <a href="/signup" style={{ color: 'var(--link)' }}>Create one</a>
        </p>
      </div>
    </div>
  )
}