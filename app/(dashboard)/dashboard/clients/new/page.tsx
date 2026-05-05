'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { addClient, searchClients } from '@/app/actions/clients'

type ClientMatch = { client_id: string; full_name: string; email: string | null; phone: string | null }

export default function NewClientPage() {
  const router = useRouter()
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [existingId, setExistingId] = useState<string | null>(null)
  const [matches, setMatches]       = useState<ClientMatch[]>([])
  const [searching, setSearching]   = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', address: '',
  })

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
    setExistingId(null)
  }

  const searchQuery = (form.full_name || form.email || form.phone).trim()

  // Live search — fires 350 ms after the user stops typing in name, email, or phone
  useEffect(() => {
    if (searchQuery.length < 2) return

    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      const { data } = await searchClients(searchQuery)
      setMatches(data as ClientMatch[])
      setSearching(false)
    }, 350)

    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [searchQuery])

  async function handleSubmit() {
    if (!form.full_name.trim()) { setError('Name is required'); return }
    setLoading(true)
    setError('')
    setExistingId(null)

    const res = await addClient(form)
    if (res.error) {
      setError(res.error)
      setExistingId(res.existingClientId ?? null)
      setLoading(false)
    } else if (res.newClientId) {
      router.push(`/dashboard/clients/${res.newClientId}`)
    } else {
      router.push('/dashboard/clients')
    }
  }

  const labelStyle = { fontSize: '13px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }
  const inputStyle = { width: '100%', boxSizing: 'border-box' as const }

  return (
    <div style={{ maxWidth: '520px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>Add client</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>Create a new client record</p>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem' }}>

        {/* Name */}
        <div style={{ marginBottom: '16px', position: 'relative' }}>
          <label style={labelStyle}>Full name <span style={{ color: '#e24b4a' }}>*</span></label>
          <input
            type="text"
            value={form.full_name}
            onChange={e => update('full_name', e.target.value)}
            placeholder="Ada Okafor"
            style={inputStyle}
            autoComplete="off"
          />
        </div>

        {/* Email */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Email address</label>
          <input
            type="email"
            value={form.email}
            onChange={e => update('email', e.target.value)}
            placeholder="ada@example.com"
            style={inputStyle}
          />
        </div>

        {/* Phone */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Phone number</label>
          <input
            type="tel"
            value={form.phone}
            onChange={e => update('phone', e.target.value)}
            placeholder="+234 800 000 0000"
            style={inputStyle}
          />
        </div>

        {/* Address */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Address</label>
          <input
            type="text"
            value={form.address}
            onChange={e => update('address', e.target.value)}
            placeholder="123 Lekki Phase 1, Lagos"
            style={inputStyle}
          />
        </div>

        {/* Live match suggestions */}
        {(searchQuery.length >= 2 && (matches.length > 0 || searching)) && !error && (
          <div style={{
            marginBottom: '16px', border: '1px solid var(--line)', borderRadius: '10px', overflow: 'hidden',
            background: 'var(--surface)',
          }}>
            <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--line-inner)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-3)' }}>
                {searching ? 'Searching…' : `${matches.length} existing client${matches.length !== 1 ? 's' : ''} match`}
              </span>
            </div>
            {matches.map((m, i) => (
              <Link
                key={m.client_id}
                href={`/dashboard/clients/${m.client_id}`}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', textDecoration: 'none', color: 'inherit',
                  borderBottom: i < matches.length - 1 ? '1px solid var(--line-inner)' : 'none',
                  background: 'transparent',
                }}
              >
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '500', margin: '0 0 2px' }}>{m.full_name}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: 0 }}>
                    {[m.phone, m.email].filter(Boolean).join(' · ') || 'No contact details'}
                  </p>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--link)', flexShrink: 0, marginLeft: '8px' }}>View →</span>
              </Link>
            ))}
          </div>
        )}

        {/* Duplicate error with link */}
        {error && (
          <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#fcebeb', border: '1px solid #f0c0c0' }}>
            <p style={{ fontSize: '13px', color: '#a32d2d', margin: existingId ? '0 0 8px' : '0' }}>{error}</p>
            {existingId && (
              <Link
                href={`/dashboard/clients/${existingId}`}
                style={{ fontSize: '13px', color: '#a32d2d', fontWeight: '600', textDecoration: 'underline' }}
              >
                View their profile →
              </Link>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleSubmit} disabled={loading} style={{ flex: 1, padding: '10px' }}>
            {loading ? 'Saving…' : 'Save client'}
          </button>
          <button onClick={() => router.back()} style={{ padding: '10px 16px', background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--line)', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
