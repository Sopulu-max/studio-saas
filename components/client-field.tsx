'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { searchClients, addClient } from '@/app/actions/clients'

type Client = { client_id: string; full_name: string; phone?: string | null; email?: string | null }

type Props = {
  value:          string   // selected client_id
  selectedName:   string   // display name for selected client
  initialClients: Client[] // pre-loaded list shown on first focus
  onChange: (clientId: string, clientName: string) => void
}

export default function ClientField({ value, selectedName, initialClients, onChange }: Props) {
  const [query, setQuery]            = useState('')
  const [open, setOpen]              = useState(false)
  const [results, setResults]        = useState<Client[]>(initialClients.slice(0, 8))
  const [searchPending, startSearch] = useTransition()

  // Create-inline state
  const [showCreate, setShowCreate]   = useState(false)
  const [createForm, setCreateForm]   = useState({ full_name: '', phone: '', email: '' })
  const [creating, setCreating]       = useState(false)
  const [createError, setCreateError] = useState('')
  const [existingMatch, setExistingMatch] = useState<{ client_id: string; full_name: string } | null>(null)

  const inputRef     = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setShowCreate(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  function handleQueryChange(q: string) {
    setQuery(q)
    setOpen(true)
    setShowCreate(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q || q.length < 2) {
      const lower    = q.toLowerCase()
      const filtered = q
        ? initialClients.filter(c =>
            c.full_name.toLowerCase().includes(lower) ||
            (c.phone ?? '').includes(q)
          ).slice(0, 8)
        : initialClients.slice(0, 8)
      setResults(filtered)
      return
    }
    debounceRef.current = setTimeout(() => {
      startSearch(async () => {
        const { data } = await searchClients(q)
        setResults(data as Client[])
      })
    }, 200)
  }

  function openDropdown() {
    setOpen(true)
    if (!query) setResults(initialClients.slice(0, 8))
  }

  function selectClient(c: { client_id: string; full_name: string }) {
    onChange(c.client_id, c.full_name)
    setQuery('')
    setOpen(false)
    setShowCreate(false)
    setExistingMatch(null)
    setCreateError('')
  }

  function startCreate() {
    setShowCreate(true)
    setCreateForm({ full_name: query.trim(), phone: '', email: '' })
    setCreateError('')
    setExistingMatch(null)
  }

  async function handleCreate() {
    if (!createForm.full_name.trim()) { setCreateError('Name is required'); return }
    setCreating(true)
    setCreateError('')
    setExistingMatch(null)

    const res = await addClient({
      full_name: createForm.full_name.trim(),
      phone:     createForm.phone.trim(),
      email:     createForm.email.trim(),
      address:   '',
    })

    if (res.existingClientId) {
      setExistingMatch({ client_id: res.existingClientId, full_name: res.existingClientName ?? createForm.full_name.trim() })
      setCreateError(res.error ?? 'This client already exists.')
      setCreating(false)
      return
    }

    if (res.error) { setCreateError(res.error); setCreating(false); return }

    // Created successfully — auto-select
    onChange(res.newClientId!, createForm.full_name.trim())
    setOpen(false)
    setShowCreate(false)
    setCreating(false)
  }

  // ── Selected state ────────────────────────────────────────────────────────

  if (value && !open) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '8px 12px', border: '1px solid var(--line)', borderRadius: '8px',
        background: 'var(--surface)',
      }}>
        <span style={{ flex: 1, fontSize: '13px', fontWeight: 500 }}>{selectedName}</span>
        <button
          type="button"
          title="Change client"
          onClick={() => {
            onChange('', '')
            setQuery('')
            setOpen(true)
            setTimeout(() => inputRef.current?.focus(), 30)
          }}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--text-4)', fontSize: '18px', lineHeight: 1, padding: '0 2px',
          }}
        >×</button>
      </div>
    )
  }

  // ── Search + dropdown ─────────────────────────────────────────────────────

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Search input */}
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
          onFocus={openDropdown}
          placeholder="Search by name or phone…"
          style={{ width: '100%', boxSizing: 'border-box' as const }}
        />
        {searchPending && (
          <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: 'var(--text-4)' }}>
            …
          </span>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 60,
          background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '10px',
          boxShadow: '0 4px 20px rgba(0,0,0,.12)', overflow: 'hidden',
        }}>

          {/* Results */}
          {results.length > 0 && results.map((c, i) => (
            <button
              key={c.client_id}
              type="button"
              onClick={() => selectClient(c)}
              style={{
                display: 'flex', flexDirection: 'column', width: '100%', textAlign: 'left',
                padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer',
                borderBottom: i < results.length - 1 ? '1px solid var(--line-inner)' : 'none',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 500 }}>{c.full_name}</span>
              {(c.phone || c.email) && (
                <span style={{ fontSize: '11px', color: 'var(--text-4)', marginTop: '1px' }}>
                  {c.phone ?? c.email}
                </span>
              )}
            </button>
          ))}

          {results.length === 0 && query.length >= 2 && !showCreate && (
            <p style={{ fontSize: '13px', color: 'var(--text-4)', padding: '10px 14px', margin: 0 }}>
              No clients match &ldquo;{query}&rdquo;
            </p>
          )}

          {/* Create trigger — always visible */}
          {!showCreate && (
            <button
              type="button"
              onClick={startCreate}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                width: '100%', textAlign: 'left', cursor: 'pointer',
                padding: '10px 14px', fontSize: '13px', fontWeight: 500, color: 'var(--link)',
                background: results.length > 0 ? 'var(--hover)' : 'transparent',
                border: 'none',
                borderTop: results.length > 0 ? '1px solid var(--line-inner)' : 'none',
              }}
            >
              <span style={{ fontSize: '18px', lineHeight: 1, fontWeight: 300 }}>+</span>
              {query.trim()
                ? `Create "${query.trim()}" as new client`
                : 'Create new client'}
            </button>
          )}

          {/* Inline create form */}
          {showCreate && (
            <div style={{
              padding: '14px',
              borderTop: results.length > 0 ? '1px solid var(--line-inner)' : 'none',
            }}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                New client
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                <input
                  type="text"
                  placeholder="Full name *"
                  value={createForm.full_name}
                  onChange={e => setCreateForm(f => ({ ...f, full_name: e.target.value }))}
                  style={{ width: '100%', boxSizing: 'border-box' as const }}
                  autoFocus
                />
                <input
                  type="tel"
                  placeholder="Phone (optional)"
                  value={createForm.phone}
                  onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))}
                  style={{ width: '100%', boxSizing: 'border-box' as const }}
                />
                <input
                  type="email"
                  placeholder="Email (optional)"
                  value={createForm.email}
                  onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                  style={{ width: '100%', boxSizing: 'border-box' as const }}
                />

                {/* Error / duplicate match */}
                {createError && (
                  <div style={{
                    padding: '8px 10px', borderRadius: '7px',
                    background: '#fef3f2', border: '1px solid #fda29b',
                  }}>
                    <p style={{ fontSize: '12px', color: '#b42318', margin: existingMatch ? '0 0 8px' : 0 }}>
                      {createError}
                    </p>
                    {existingMatch && (
                      <button
                        type="button"
                        onClick={() => selectClient(existingMatch)}
                        style={{
                          fontSize: '12px', padding: '4px 12px', borderRadius: '6px',
                          background: 'var(--btn)', color: 'var(--btn-fg)',
                          border: 'none', cursor: 'pointer', fontWeight: 500,
                        }}
                      >
                        Use {existingMatch.full_name} instead →
                      </button>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={creating}
                    style={{
                      flex: 1, padding: '7px 12px', borderRadius: '7px',
                      background: 'var(--btn)', color: 'var(--btn-fg)',
                      border: 'none', cursor: creating ? 'default' : 'pointer',
                      fontSize: '13px', fontWeight: 500, opacity: creating ? 0.6 : 1,
                    }}
                  >
                    {creating ? 'Adding…' : 'Add client'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowCreate(false); setCreateError(''); setExistingMatch(null) }}
                    style={{
                      padding: '7px 12px', borderRadius: '7px',
                      background: 'transparent', color: 'var(--text-3)',
                      border: '1px solid var(--line)', cursor: 'pointer', fontSize: '13px',
                    }}
                  >
                    Back
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
