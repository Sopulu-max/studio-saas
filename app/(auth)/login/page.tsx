'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { unwrapRow } from "@/lib/utils";

const REDIRECT_MESSAGES: Record<string, string> = {
  'not-authenticated': 'Your session expired. Please sign in again.',
  'studio-not-found':  'No studio found for this account. Please sign up first.',
  'auth-error':        'Authentication error. Please sign in again.',
}

function LoginForm() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const searchParams            = useSearchParams()
  const supabase                = createClient()

  const redirectReason = searchParams.get('reason')
  const redirectMsg    = redirectReason ? REDIRECT_MESSAGES[redirectReason] : null

  async function handleLogin() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      toast.error(error.message)
      setLoading(false)
    } else {
      window.location.href = '/dashboard'
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '500', marginBottom: '6px' }}>Sign in</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-3)', marginBottom: '24px' }}>Weave by Creative Renaissance</p>

        {redirectMsg && (
          <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', fontSize: '13px', color: '#856404' }}>
            {redirectMsg}
          </div>
        )}

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

        {error && (
          <div style={{ background: '#fdecea', border: '1px solid #e24b4a', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', fontSize: '13px', color: '#c0392b', fontWeight: '500' }}>
            {error}
          </div>
        )}

        <button onClick={handleLogin} disabled={loading} style={{ width: '100%', padding: '10px' }}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>

        <p style={{ fontSize: '13px', color: 'var(--text-3)', textAlign: 'center', marginTop: '16px' }}>
          No account? <Link href="/signup" style={{ color: 'var(--link)' }}>Create one</Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
