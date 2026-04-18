'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { signUpWithStudio } from '@/app/actions/auth'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [studioName, setStudioName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSignup() {
  setLoading(true)
  setError('')

  const { error } = await signUpWithStudio(email, password, studioName)
  if (error) {
    setError(error)
    setLoading(false)
    return
  }

  router.push('/onboarding')
}

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '2rem', border: '1px solid var(--line)', borderRadius: '12px', background: 'var(--surface)' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '500', marginBottom: '6px' }}>Create your studio</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-3)', marginBottom: '24px' }}>Weave · Get started in seconds</p>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '13px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>Studio name</label>
          <input
            type="text"
            value={studioName}
            onChange={e => setStudioName(e.target.value)}
            placeholder="Lagos Lens Studio"
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>

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
            onKeyDown={e => e.key === 'Enter' && handleSignup()}
          />
        </div>

        {error && <p style={{ fontSize: '13px', color: '#e24b4a', marginBottom: '16px' }}>{error}</p>}

        <button onClick={handleSignup} disabled={loading} style={{ width: '100%', padding: '10px' }}>
          {loading ? 'Creating studio...' : 'Create studio'}
        </button>

        <p style={{ fontSize: '13px', color: 'var(--text-3)', textAlign: 'center', marginTop: '16px' }}>
          Already have an account? <a href="/login" style={{ color: 'var(--link)' }}>Sign in</a>
        </p>
      </div>
    </div>
  )
}