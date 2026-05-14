'use client'

import { useEffect } from 'react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[dashboard error]', error)
  }, [error])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', padding: '2rem', textAlign: 'center',
    }}>
      <p style={{ fontSize: '28px', margin: '0 0 8px' }}>⚠️</p>
      <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px', color: 'var(--text)' }}>
        Something went wrong
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: '0 0 24px', maxWidth: '360px', lineHeight: 1.6 }}>
        {error.message?.includes('fetch') || error.message?.includes('connect')
          ? 'Could not reach the database. Check your connection and try again.'
          : 'An unexpected error occurred while loading this page.'}
      </p>
      <button
        onClick={reset}
        style={{
          padding: '9px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '500',
          background: 'var(--btn)', color: 'var(--btn-fg)', border: 'none', cursor: 'pointer',
        }}
      >
        Try again
      </button>
      {error.digest && (
        <p style={{ fontSize: '11px', color: 'var(--text-4)', marginTop: '16px', fontFamily: 'monospace' }}>
          Error ID: {error.digest}
        </p>
      )}
    </div>
  )
}
