import Link from 'next/link'
import SearchInput from '@/components/search-input'
import Pagination from '@/components/pagination'
import AvatarUpload from '@/components/avatar-upload'
import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'

const PAGE_SIZE = 20

type ClientRow = {
  client_id:   string
  full_name:   string
  email?:      string | null
  phone?:      string | null
  address?:    string | null
  avatar_url?: string | null
  client_ref?: number | null
  created_at?: string | null
}

type BookingSummary = {
  client_id:    string
  booking_id:   string
  session_date?: string | null
  session_type?: string | null
  shoot_type?:   string | null
  status:        string
  booking_ref?:  number | null
}

function pageUrl(view: string, params: Record<string, string>, pg: number) {
  const p = new URLSearchParams({ view, ...params, page: String(pg) })
  return `/dashboard/clients?${p}`
}

function tabUrl(viewKey: string) {
  return `/dashboard/clients?view=${viewKey}`
}

function daysSince(dateStr: string | null | undefined): number {
  if (!dateStr) return Infinity
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

function TabNav({ active }: { active: string }) {
  const tabs = [
    { key: 'all',      label: 'All' },
    { key: 'frequent', label: 'Frequent' },
    { key: 'recent',   label: 'Recent' },
    { key: 'dormant',  label: 'Dormant' },
  ]
  return (
    <div style={{ display: 'flex', gap: '2px', marginBottom: '1.25rem', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '10px', padding: '3px', width: 'fit-content' }}>
      {tabs.map(t => (
        <Link key={t.key} href={tabUrl(t.key)} style={{
          padding: '6px 16px', borderRadius: '7px', fontSize: '13px', fontWeight: '500',
          textDecoration: 'none', whiteSpace: 'nowrap',
          background: active === t.key ? 'var(--btn)' : 'transparent',
          color: active === t.key ? 'var(--btn-fg)' : 'var(--text-3)',
        }}>{t.label}</Link>
      ))}
    </div>
  )
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string; page?: string }>
}) {
  const { view = 'all', q = '', page = '1' } = await searchParams
  const pageNum = Math.max(1, parseInt(page) || 1)

  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  // ── Stats data (always) ────────────────────────────────────────
  // Fetch all clients + all bookings for this studio in parallel
  const now = new Date()
  const nowTime = now.getTime()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const ninetyDaysAgo = new Date(nowTime - 90 * 86_400_000).toISOString().slice(0, 10)
  const thirtyDaysAgo = new Date(nowTime - 30 * 86_400_000).toISOString().slice(0, 10)

  const [
    { count: totalClients },
    { count: newThisMonth },
    { data: allBookingsRaw },
  ] = await Promise.all([
    context.admin.from('clients').select('*', { count: 'exact', head: true }).eq('studio_id', context.studioId),
    context.admin.from('clients').select('*', { count: 'exact', head: true })
      .eq('studio_id', context.studioId).gte('created_at', monthStart),
    context.admin.from('bookings')
      .select('client_id, booking_id, session_date, session_type, shoot_type, status, booking_ref')
      .eq('studio_id', context.studioId),
  ])

  const allBookings = (allBookingsRaw ?? []) as unknown as BookingSummary[]

  // Compute per-client stats
  const sessionCountMap = new Map<string, number>()
  const lastSessionMap  = new Map<string, string>()    // latest session_date
  const lastStatusMap   = new Map<string, string>()
  const lastTypeMap     = new Map<string, string>()

  for (const b of allBookings) {
    sessionCountMap.set(b.client_id, (sessionCountMap.get(b.client_id) ?? 0) + 1)
    const existing = lastSessionMap.get(b.client_id) ?? ''
    if ((b.session_date ?? '') > existing) {
      lastSessionMap.set(b.client_id, b.session_date ?? '')
      lastStatusMap.set(b.client_id, b.status)
      lastTypeMap.set(b.client_id, b.shoot_type ?? b.session_type ?? '')
    }
  }

  // Stats: returning (2+ sessions), dormant (last session 90+ days ago)
  let returningCount = 0
  let dormantCount   = 0
  for (const [cid, count] of sessionCountMap) {
    if (count >= 2) returningCount++
    const last = lastSessionMap.get(cid)
    if (last && last < ninetyDaysAgo) dormantCount++
  }

  // ── View-specific data ─────────────────────────────────────────
  let allClients: ClientRow[]  = []
  let allTotal   = 0
  let displayClients: Array<ClientRow & { _sessions?: number; _lastDate?: string; _lastType?: string; _daysSince?: number }> = []

  if (view === 'all') {
    const from = (pageNum - 1) * PAGE_SIZE
    const to   = from + PAGE_SIZE - 1

    let query = context.admin.from('clients').select('*', { count: 'exact' }).eq('studio_id', context.studioId)
    if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
    const { data, count } = await query.order('created_at', { ascending: false }).range(from, to)
    allClients = (data ?? []) as unknown as ClientRow[]
    allTotal   = count ?? 0
  }

  if (view === 'frequent') {
    // All clients, sorted by session count desc
    const { data } = await context.admin.from('clients').select('*').eq('studio_id', context.studioId).order('full_name')
    const clients = (data ?? []) as unknown as ClientRow[]
    displayClients = clients
      .map(c => ({
        ...c,
        _sessions:  sessionCountMap.get(c.client_id) ?? 0,
        _lastDate:  lastSessionMap.get(c.client_id)  ?? '',
        _lastType:  lastTypeMap.get(c.client_id)     ?? '',
      }))
      .filter(c => (c._sessions ?? 0) > 0)
      .sort((a, b) => (b._sessions ?? 0) - (a._sessions ?? 0))
  }

  if (view === 'recent') {
    // Clients who had a session in the last 30 days
    const { data: recentBookingsRaw } = await context.admin
      .from('bookings')
      .select('client_id, session_date, session_type, shoot_type, status, booking_id, booking_ref')
      .eq('studio_id', context.studioId)
      .gte('session_date', thirtyDaysAgo)
      .order('session_date', { ascending: false })

    const recentBookings = (recentBookingsRaw ?? []) as unknown as BookingSummary[]
    const recentClientIds = [...new Set(recentBookings.map(b => b.client_id))]

    if (recentClientIds.length > 0) {
      const { data } = await context.admin.from('clients').select('*').eq('studio_id', context.studioId).in('client_id', recentClientIds)
      const clientMap = new Map<string, ClientRow>()
      for (const c of (data ?? []) as unknown as ClientRow[]) clientMap.set(c.client_id, c)

      displayClients = recentClientIds
        .map(id => {
          const c = clientMap.get(id)
          if (!c) return null
          return {
            ...c,
            _sessions: sessionCountMap.get(id) ?? 0,
            _lastDate: lastSessionMap.get(id) ?? '',
            _lastType: lastTypeMap.get(id) ?? '',
          }
        })
        .filter((c): c is NonNullable<typeof c> => c !== null)
    }
  }

  if (view === 'dormant') {
    // Clients with sessions, but last one was 90+ days ago
    const dormantIds: string[] = []
    for (const [cid, last] of lastSessionMap) {
      if (last < ninetyDaysAgo) dormantIds.push(cid)
    }

    if (dormantIds.length > 0) {
      const { data } = await context.admin.from('clients').select('*').eq('studio_id', context.studioId).in('client_id', dormantIds)
      displayClients = (data ?? []) as unknown as ClientRow[]
      displayClients = displayClients
        .map(c => ({
          ...c,
          _sessions:  sessionCountMap.get(c.client_id) ?? 0,
          _lastDate:  lastSessionMap.get(c.client_id)  ?? '',
          _daysSince: daysSince(lastSessionMap.get(c.client_id)),
        }))
        .sort((a, b) => (b._daysSince ?? 0) - (a._daysSince ?? 0)) // longest dormant first
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div>
      {/* ── Page header ─────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', margin: 0 }}>Clients</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <a href="/api/export/clients" style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '13px', border: '1px solid var(--line)', color: 'var(--text-2)', textDecoration: 'none', background: 'var(--surface)', fontWeight: '500' }}>
            Export CSV
          </a>
          <Link href="/dashboard/clients/new" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '14px', background: 'var(--btn)', color: 'var(--btn-fg)', textDecoration: 'none', fontWeight: '500' }}>
            Add client
          </Link>
        </div>
      </div>

      {/* ── Stats strip ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '1.25rem' }}>
        {[
          { label: 'Total clients',  value: totalClients ?? 0 },
          { label: 'New this month', value: newThisMonth ?? 0 },
          { label: 'Returning (2+)', value: returningCount },
          { label: 'Dormant (90d+)', value: dormantCount },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1rem 1.25rem' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '0 0 6px', fontWeight: '600' }}>{s.label}</p>
            <p style={{ fontSize: '22px', fontWeight: '500', margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Tab nav ─────────────────────────────────────────── */}
      <TabNav active={view} />

      {/* ══════════════════════════════════════════════════════
          VIEW: ALL
          ══════════════════════════════════════════════════════ */}
      {view === 'all' && (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
            <SearchInput defaultValue={q} placeholder="Search by name or email…" />
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 12px' }}>
            {allTotal} result{allTotal !== 1 ? 's' : ''}
          </p>

          {!allClients.length ? (
            <div style={{ textAlign: 'center', padding: '4rem', border: '1px dashed var(--line)', borderRadius: '12px', color: 'var(--text-3)' }}>
              <p style={{ fontSize: '15px', margin: '0 0 4px' }}>{q ? 'No clients match your search' : 'No clients yet'}</p>
              <p style={{ fontSize: '13px', margin: 0 }}>{q ? 'Try a different search term' : 'Add your first client to get started'}</p>
            </div>
          ) : (
            <>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
                {allClients.map((client, i) => (
                  <Link key={client.client_id} href={`/dashboard/clients/${client.client_id}`} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '1rem 1.25rem', textDecoration: 'none', color: 'inherit',
                    borderBottom: i < allClients.length - 1 ? '1px solid var(--line-inner)' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <AvatarUpload entityId={client.client_id} entityType="client"
                        currentUrl={client.avatar_url ?? null} name={client.full_name} size={36} editable={false} />
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 2px' }}>{client.full_name}</p>
                        <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: 0, fontFamily: 'monospace' }}>
                          {client.client_ref != null ? `#${String(client.client_ref).padStart(4, '0')}` : `#${client.client_id.slice(0, 6).toUpperCase()}`}
                          {client.email ? ` · ${client.email}` : ''}
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' as const }}>
                      <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 2px' }}>{client.phone ?? '—'}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: 0 }}>
                        {sessionCountMap.get(client.client_id) ?? 0} session{(sessionCountMap.get(client.client_id) ?? 0) !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
              <Pagination
                page={pageNum}
                totalPages={Math.ceil(allTotal / PAGE_SIZE)}
                prevUrl={pageNum > 1 ? pageUrl('all', { q }, pageNum - 1) : undefined}
                nextUrl={pageNum < Math.ceil(allTotal / PAGE_SIZE) ? pageUrl('all', { q }, pageNum + 1) : undefined}
              />
            </>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════
          VIEW: FREQUENT
          ══════════════════════════════════════════════════════ */}
      {view === 'frequent' && (
        <>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 1.25rem' }}>
            Clients sorted by total session count — your most loyal clients
          </p>
          {displayClients.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', border: '1px dashed var(--line)', borderRadius: '12px', color: 'var(--text-3)' }}>
              <p style={{ fontSize: '15px', margin: 0 }}>No clients with sessions yet</p>
            </div>
          ) : (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 80px 120px 120px', padding: '8px 1.25rem', borderBottom: '1px solid var(--line-inner)', fontSize: '11px', color: 'var(--text-4)', fontWeight: '600', letterSpacing: '0.04em', alignItems: 'center' }}>
                <span>#</span><span>CLIENT</span><span>SESSIONS</span><span>LAST BOOKING</span><span>LAST CATEGORY</span>
              </div>
              {displayClients.map((c, i) => (
                <Link key={c.client_id} href={`/dashboard/clients/${c.client_id}`} style={{
                  display: 'grid', gridTemplateColumns: '32px 1fr 80px 120px 120px',
                  padding: '0.875rem 1.25rem', textDecoration: 'none', color: 'inherit', alignItems: 'center',
                  borderBottom: i < displayClients.length - 1 ? '1px solid var(--line-inner)' : 'none',
                }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-4)', fontFamily: 'monospace' }}>{i + 1}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <AvatarUpload entityId={c.client_id} entityType="client"
                      currentUrl={c.avatar_url ?? null} name={c.full_name} size={30} editable={false} />
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 1px' }}>{c.full_name}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0 }}>{c.email ?? '—'}</p>
                    </div>
                  </div>
                  <p style={{ fontSize: '14px', fontWeight: '600', margin: 0, color: 'var(--text)' }}>{c._sessions ?? 0}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>
                    {c._lastDate ? new Date(c._lastDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>{c._lastType || '—'}</p>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════
          VIEW: RECENT
          ══════════════════════════════════════════════════════ */}
      {view === 'recent' && (
        <>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 1.25rem' }}>
            Clients who had a session in the last 30 days — {displayClients.length} client{displayClients.length !== 1 ? 's' : ''}
          </p>
          {displayClients.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', border: '1px dashed var(--line)', borderRadius: '12px', color: 'var(--text-3)' }}>
              <p style={{ fontSize: '15px', margin: 0 }}>No sessions in the last 30 days</p>
            </div>
          ) : (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
              {displayClients.map((c, i) => (
                <Link key={c.client_id} href={`/dashboard/clients/${c.client_id}`} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '1rem 1.25rem', textDecoration: 'none', color: 'inherit',
                  borderBottom: i < displayClients.length - 1 ? '1px solid var(--line-inner)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <AvatarUpload entityId={c.client_id} entityType="client"
                      currentUrl={c.avatar_url ?? null} name={c.full_name} size={36} editable={false} />
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 2px' }}>{c.full_name}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: 0 }}>{c.email ?? '—'}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' as const }}>
                    <p style={{ fontSize: '13px', fontWeight: '500', margin: '0 0 2px' }}>
                      {c._lastDate ? new Date(c._lastDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: 0 }}>
                      {c._sessions ?? 0} total session{(c._sessions ?? 0) !== 1 ? 's' : ''}
                      {c._lastType ? ` · ${c._lastType}` : ''}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════
          VIEW: DORMANT
          ══════════════════════════════════════════════════════ */}
      {view === 'dormant' && (
        <>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 1.25rem' }}>
            Clients whose last session was 90+ days ago — potential re-engagement targets
          </p>
          {displayClients.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', border: '1px dashed var(--line)', borderRadius: '12px', color: 'var(--text-3)' }}>
              <p style={{ fontSize: '15px', margin: '0 0 4px' }}>No dormant clients</p>
              <p style={{ fontSize: '13px', margin: 0 }}>All your clients have had a recent session</p>
            </div>
          ) : (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px 80px', padding: '8px 1.25rem', borderBottom: '1px solid var(--line-inner)', fontSize: '11px', color: 'var(--text-4)', fontWeight: '600', letterSpacing: '0.04em' }}>
                <span>CLIENT</span><span>LAST SESSION</span><span>DORMANT FOR</span><span>SESSIONS</span>
              </div>
              {displayClients.map((c, i) => (
                <Link key={c.client_id} href={`/dashboard/clients/${c.client_id}`} style={{
                  display: 'grid', gridTemplateColumns: '1fr 100px 120px 80px',
                  padding: '0.875rem 1.25rem', textDecoration: 'none', color: 'inherit', alignItems: 'center',
                  borderBottom: i < displayClients.length - 1 ? '1px solid var(--line-inner)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <AvatarUpload entityId={c.client_id} entityType="client"
                      currentUrl={c.avatar_url ?? null} name={c.full_name} size={30} editable={false} />
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 1px' }}>{c.full_name}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0 }}>{c.phone ?? c.email ?? '—'}</p>
                    </div>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>
                    {c._lastDate ? new Date(c._lastDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </p>
                  <p style={{ fontSize: '13px', fontWeight: '500', margin: 0, color: (c._daysSince ?? 0) > 180 ? '#a32d2d' : '#854f0b' }}>
                    {c._daysSince === Infinity ? '—' : `${c._daysSince} days`}
                  </p>
                  <p style={{ fontSize: '13px', margin: 0 }}>{c._sessions ?? 0}</p>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
