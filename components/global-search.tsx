'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

type Client  = { client_id: string; full_name: string; email?: string | null; phone?: string | null }
type Session = { booking_id: string; session_date?: string | null; status: string; color_fg?: string | null; session_type?: string | null; clients?: { full_name?: string | null } | null }
type Invoice = { invoice_id: string; total?: number | string | null; status: string; bookings?: { clients?: { full_name?: string | null } | null } | null }

// Invoice statuses are a separate fixed domain (not booking workflows) — keep as constants
const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft:   '#5f5e5a',
  sent:    '#185fa5',
  paid:    '#3b6d11',
  overdue: '#a32d2d',
  cancelled: '#a32d2d',
}

export default function GlobalSearch() {
  const router = useRouter()
  const [open,    setOpen]    = useState(false)
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<{ clients: Client[]; sessions: Session[]; invoices: Invoice[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [cursor,  setCursor]  = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keyboard shortcut Cmd/Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 2) return
    let cancelled = false
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        if (!cancelled) {
          setResults(data)
          setCursor(0)
        }
      } catch {}
      if (!cancelled) setLoading(false)
    }, 250)
    return () => {
      cancelled = true
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  // Flatten results for keyboard nav
  const allLinks: { href: string; label: string }[] = []
  if (results) {
    for (const c of results.clients)  allLinks.push({ href: `/dashboard/clients/${c.client_id}`,   label: c.full_name })
    for (const s of results.sessions) allLinks.push({ href: `/dashboard/bookings/${s.booking_id}`, label: s.clients?.full_name ?? '' })
    for (const i of results.invoices) allLinks.push({ href: `/dashboard/invoices/${i.invoice_id}`, label: i.bookings?.clients?.full_name ?? '' })
  }

  function closeSearch() {
    setOpen(false)
    setQuery('')
    setResults(null)
    setCursor(0)
    setLoading(false)
  }

  function openSearch() {
    setQuery('')
    setResults(null)
    setCursor(0)
    setLoading(false)
    setOpen(true)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, allLinks.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    if (e.key === 'Enter' && allLinks[cursor]) {
      router.push(allLinks[cursor].href)
      closeSearch()
    }
  }

  function navigate(href: string) {
    router.push(href)
    closeSearch()
  }

  if (!open) return (
    <button
      onClick={openSearch}
      title="Search (⌘K)"
      style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        width: '100%', padding: '7px 10px', borderRadius: '7px',
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: 'var(--text-4)', fontSize: '13px', textAlign: 'left',
        marginBottom: '4px',
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      Search
      <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-4)', background: 'var(--surface-2)', padding: '1px 5px', borderRadius: '4px', border: '1px solid var(--line)', letterSpacing: '0' }}>⌘K</span>
    </button>
  )

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeSearch}
        style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '18vh', left: '50%', transform: 'translateX(-50%)',
        zIndex: 201, width: '560px', maxWidth: 'calc(100vw - 32px)',
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: '14px', overflow: 'hidden',
        boxShadow: '0 24px 48px rgba(0,0,0,.2)',
      }}>
        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderBottom: '1px solid var(--line-inner)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search clients, sessions, invoices…"
            style={{
              flex: 1, border: 'none', outline: 'none', fontSize: '15px',
              background: 'transparent', color: 'var(--text)',
            }}
          />
          {loading && <span style={{ fontSize: '12px', color: 'var(--text-4)' }}>…</span>}
          <kbd onClick={closeSearch} style={{ fontSize: '11px', color: 'var(--text-4)', cursor: 'pointer', padding: '2px 6px', border: '1px solid var(--line)', borderRadius: '4px' }}>Esc</kbd>
        </div>

        {/* Results */}
        {query.length >= 2 && results && (
          <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '8px 0' }}>
            {results.clients.length === 0 && results.sessions.length === 0 && results.invoices.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-4)', padding: '12px 16px', margin: 0 }}>No results for &quot;{query}&quot;</p>
            ) : (
              <>
                {results.clients.length > 0 && (
                  <Section label="Clients">
                    {results.clients.map((c) => {
                      const idx = allLinks.findIndex(l => l.href === `/dashboard/clients/${c.client_id}`)
                      return (
                        <ResultRow key={c.client_id} active={idx === cursor}
                          onClick={() => navigate(`/dashboard/clients/${c.client_id}`)}>
                          <span style={{ fontWeight: '500', fontSize: '14px' }}>{c.full_name}</span>
                          <span style={{ fontSize: '12px', color: 'var(--text-4)' }}>{c.email ?? c.phone}</span>
                        </ResultRow>
                      )
                    })}
                  </Section>
                )}
                {results.sessions.length > 0 && (
                  <Section label="Sessions">
                    {results.sessions.map((s) => {
                      const idx = allLinks.findIndex(l => l.href === `/dashboard/bookings/${s.booking_id}`)
                      return (
                        <ResultRow key={s.booking_id} active={idx === cursor}
                          onClick={() => navigate(`/dashboard/bookings/${s.booking_id}`)}>
                          <span style={{ fontWeight: '500', fontSize: '14px' }}>{s.clients?.full_name}</span>
                          <span style={{ fontSize: '12px', color: s.color_fg ?? 'var(--text-4)' }}>
                            {s.status.replace(/_/g, ' ')}
                            {s.session_date ? ` · ${new Date(s.session_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                          </span>
                        </ResultRow>
                      )
                    })}
                  </Section>
                )}
                {results.invoices.length > 0 && (
                  <Section label="Invoices">
                    {results.invoices.map((inv) => {
                      const idx = allLinks.findIndex(l => l.href === `/dashboard/invoices/${inv.invoice_id}`)
                      return (
                        <ResultRow key={inv.invoice_id} active={idx === cursor}
                          onClick={() => navigate(`/dashboard/invoices/${inv.invoice_id}`)}>
                          <span style={{ fontWeight: '500', fontSize: '14px' }}>{inv.bookings?.clients?.full_name}</span>
                          <span style={{ fontSize: '12px', color: INVOICE_STATUS_COLORS[inv.status] ?? 'var(--text-4)' }}>
                            ₦{Number(inv.total).toLocaleString()} · {inv.status}
                          </span>
                        </ResultRow>
                      )
                    })}
                  </Section>
                )}
              </>
            )}
          </div>
        )}

        {(query.length < 2 || !results) && !loading && (
          <div style={{ padding: '20px 16px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>Type at least 2 characters to search…</p>
          </div>
        )}
      </div>
    </>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: '11px', color: 'var(--text-4)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '.06em', padding: '6px 16px 4px', margin: 0 }}>{label}</p>
      {children}
    </div>
  )
}

function ResultRow({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        width: '100%', padding: '9px 16px', textAlign: 'left',
        background: active ? 'var(--active)' : 'transparent',
        border: 'none', cursor: 'pointer', gap: '12px',
      }}
    >
      {children}
    </button>
  )
}

