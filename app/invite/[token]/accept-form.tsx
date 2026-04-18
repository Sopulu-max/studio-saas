'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'

const ROLE_LABELS: Record<string, string> = {
  photographer:   'Photographer',
  editor:         'Editor / retoucher',
  colour_grader:  'Colour grader',
  second_shooter: 'Second shooter',
  assistant:      'Assistant',
  manager:        'Studio manager',
  other:          'Team member',
}

export default function AcceptInviteForm({
  token,
  staffId,
  fullName,
  email,
  studioName,
  role,
}: {
  token: string
  staffId: string
  fullName: string
  email: string
  studioName: string
  role: string
}) {
  const [password, setPassword]     = useState('')
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleAccept() {
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError('')

    // Sign up the user with the pre-filled email
    const { data: signupData, error: signupErr } = await supabase.auth.signUp({ email, password })
    if (signupErr) { setError(signupErr.message); setLoading(false); return }

    const userId = signupData.user?.id
    if (!userId) { setError('Could not create account. Please try again.'); setLoading(false); return }

    // Link user_id to the staff record and mark accepted
    const res = await fetch('/api/invite/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, userId }),
    })
    const json = await res.json()
    if (json.error) { setError(json.error); setLoading(false); return }

    router.push('/dashboard')
  }

  async function handleExistingLogin() {
    if (!confirming) { setConfirming(true); return }
    if (password.length < 6) { setError('Enter your password to continue'); return }
    setLoading(true); setError('')

    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
    if (signInErr) { setError(signInErr.message); setLoading(false); return }

    const userId = signInData.user?.id
    if (!userId) { setError('Sign-in failed'); setLoading(false); return }

    const res = await fetch('/api/invite/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, userId }),
    })
    const json = await res.json()
    if (json.error) { setError(json.error); setLoading(false); return }

    router.push('/dashboard')
  }

  return (
    <div style={{ width: '100%', maxWidth: '420px' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '16px', padding: '36px 40px' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: '0 0 8px' }}>Invitation</p>
        <h1 style={{ fontSize: '22px', fontWeight: '600', margin: '0 0 6px' }}>Join {studioName}</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: '0 0 28px' }}>
          You've been invited as <strong>{ROLE_LABELS[role] ?? role}</strong>.
        </p>

        <div style={{ background: 'var(--hover)', borderRadius: '8px', padding: '12px 16px', marginBottom: '24px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Joining as</p>
          <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 2px' }}>{fullName}</p>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>{email}</p>
        </div>

        {!confirming ? (
          <>
            <label style={{ fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '6px' }}>
              Create a password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAccept()}
              placeholder="Minimum 8 characters"
              style={{ width: '100%', boxSizing: 'border-box' as const, marginBottom: '16px' }}
              autoFocus
            />

            {error && <p style={{ fontSize: '13px', color: '#e24b4a', marginBottom: '14px' }}>{error}</p>}

            <button onClick={handleAccept} disabled={loading}
              style={{ width: '100%', padding: '10px', fontSize: '14px', marginBottom: '12px' }}>
              {loading ? 'Setting up…' : 'Accept & create account'}
            </button>

            <button type="button" onClick={handleExistingLogin}
              style={{ width: '100%', padding: '10px', fontSize: '13px', background: 'transparent', border: '1px solid var(--line)', color: 'var(--text-3)', borderRadius: '8px', cursor: 'pointer' }}>
              I already have an account
            </button>
          </>
        ) : (
          <>
            <label style={{ fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '6px' }}>
              Your existing password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleExistingLogin()}
              placeholder="Your password"
              style={{ width: '100%', boxSizing: 'border-box' as const, marginBottom: '16px' }}
              autoFocus
            />

            {error && <p style={{ fontSize: '13px', color: '#e24b4a', marginBottom: '14px' }}>{error}</p>}

            <button onClick={handleExistingLogin} disabled={loading}
              style={{ width: '100%', padding: '10px', fontSize: '14px', marginBottom: '12px' }}>
              {loading ? 'Signing in…' : 'Sign in & accept'}
            </button>

            <button type="button" onClick={() => { setConfirming(false); setError('') }}
              style={{ width: '100%', padding: '10px', fontSize: '13px', background: 'transparent', border: '1px solid var(--line)', color: 'var(--text-3)', borderRadius: '8px', cursor: 'pointer' }}>
              ← Back
            </button>
          </>
        )}
      </div>
    </div>
  )
}
