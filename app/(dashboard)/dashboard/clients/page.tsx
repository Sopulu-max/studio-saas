import Link from 'next/link'
import SearchInput from '@/components/search-input'
import Pagination from '@/components/pagination'
import AvatarUpload from '@/components/avatar-upload'
import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'
import { ViewSwitcher } from '@/components/view-switcher'
import { resolveLayout } from '@/lib/view-mode'
import BarChart from '@/components/bar-chart'
import DonutChart from '@/components/donut-chart'

const PAGE_SIZE = 20

function getTier(sessions: number): { label: string; bg: string; color: string } {
  if (sessions >= 10) return { label: 'VIP',       bg: '#faeeda', color: '#854f0b' }
  if (sessions >= 5)  return { label: 'Regular',   bg: '#eaf3de', color: '#3b6d11' }
  if (sessions >= 2)  return { label: 'Returning', bg: '#e6f1fb', color: '#185fa5' }
  return                     { label: 'New',       bg: '#f1efe8', color: '#5f5e5a' }
}

function relDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7)  return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

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
  searchParams: Promise<{ view?: string; q?: string; page?: string; layout?: string }>
}) {
  const { view = 'all', q = '', page = '1', layout: rawLayout } = await searchParams
  const pageNum = Math.max(1, parseInt(page) || 1)
  const clientLayout = view === 'all' ? resolveLayout(rawLayout, ['grid', 'list', 'chart-bar']) : 'grid'

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

  // ── Tier distribution (always — derived from existing data) ───
  const tierMap = { New: 0, Returning: 0, Regular: 0, VIP: 0 }
  for (const [, cnt] of sessionCountMap) {
    const t = getTier(cnt).label as keyof typeof tierMap
    tierMap[t]++
  }
  tierMap.New += Math.max(0, (totalClients ?? 0) - sessionCountMap.size)

  // ── Monthly new-clients data (only when chart-bar is active) ──
  let monthlyNewClients: { label: string; value: number }[] = []
  if (view === 'all' && clientLayout === 'chart-bar') {
    const sixAgo = new Date()
    sixAgo.setMonth(sixAgo.getMonth() - 5)
    sixAgo.setDate(1)
    const { data: recentRaw } = await context.admin
      .from('clients')
      .select('created_at')
      .eq('studio_id', context.studioId)
      .gte('created_at', sixAgo.toISOString().slice(0, 10))
    const countsByMo = new Map<string, number>()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      countsByMo.set(key, 0)
    }
    for (const c of (recentRaw ?? []) as unknown as { created_at: string | null }[]) {
      if (!c.created_at) continue
      const key = c.created_at.slice(0, 7)
      if (countsByMo.has(key)) countsByMo.set(key, (countsByMo.get(key) ?? 0) + 1)
    }
    monthlyNewClients = [...countsByMo.entries()].map(([key, value]) => ({
      label: new Date(key + '-01').toLocaleDateString('en-NG', { month: 'short' }),
      value,
    }))
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
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', alignItems: 'center' }}>
            <SearchInput defaultValue={q} placeholder="Search by name or email…" />
            <div style={{ marginLeft: 'auto' }}>
              <ViewSwitcher modes={['grid', 'list', 'chart-bar']} storageKey="clients-all" />
            </div>
          </div>

          {/* ── Chart view ── */}
          {clientLayout === 'chart-bar' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem' }}>
                <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-3)', margin: '0 0 1.25rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>New clients — last 6 months</p>
                <BarChart data={monthlyNewClients} color="#c9a96e" />
              </div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem' }}>
                <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-3)', margin: '0 0 1.25rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>Client tiers</p>
                <DonutChart title="clients" segments={[
                  { label: 'New',       value: tierMap.New,       color: '#888' },
                  { label: 'Returning', value: tierMap.Returning, color: '#185fa5' },
                  { label: 'Regular',   value: tierMap.Regular,   color: '#3b6d11' },
                  { label: 'VIP',       value: tierMap.VIP,       color: '#854f0b' },
                ]} />
              </div>
            </div>
          )}

          {clientLayout !== 'chart-bar' && (
            <>
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
                  {/* ── Grid view ── */}
                  {clientLayout === 'grid' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                      {allClients.map((client) => {
                        const sessions = sessionCountMap.get(client.client_id) ?? 0
                        const lastDate = lastSessionMap.get(client.client_id)
                        const tier     = getTier(sessions)
                        const ref      = client.client_ref != null ? `#${String(client.client_ref).padStart(4, '0')}` : `#${client.client_id.slice(0, 6).toUpperCase()}`
                        return (
                          <Link key={client.client_id} href={`/dashboard/clients/${client.client_id}`} style={{
                            background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px',
                            padding: '1rem 1.25rem', textDecoration: 'none', color: 'inherit', display: 'block',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                              <AvatarUpload entityId={client.client_id} entityType="client"
                                currentUrl={client.avatar_url ?? null} name={client.full_name} size={38} editable={false} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.full_name}</p>
                                <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0, fontFamily: 'monospace' }}>
                                  {ref}{client.email ? ` · ${client.email}` : ''}
                                </p>
                              </div>
                              <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '20px', background: tier.bg, color: tier.color, fontWeight: '600', flexShrink: 0, letterSpacing: '.03em' }}>
                                {tier.label}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: '20px', paddingTop: '10px', borderTop: '1px solid var(--line-inner)' }}>
                              <div>
                                <p style={{ fontSize: '10px', color: 'var(--text-4)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Sessions</p>
                                <p style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: 'var(--text)', lineHeight: 1.1 }}>{sessions}</p>
                              </div>
                              {lastDate && (
                                <div>
                                  <p style={{ fontSize: '10px', color: 'var(--text-4)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Last session</p>
                                  <p style={{ fontSize: '13px', fontWeight: '500', margin: 0, color: 'var(--text-2)', lineHeight: 1.2 }}>{relDate(lastDate)}</p>
                                </div>
                              )}
                              {client.phone && (
                                <div style={{ marginLeft: 'auto' }}>
                                  <p style={{ fontSize: '10px', color: 'var(--text-4)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Phone</p>
                                  <p style={{ fontSize: '12px', margin: 0, color: 'var(--text-3)' }}>{client.phone}</p>
                                </div>
                              )}
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}

                  {/* ── List view ── */}
                  {clientLayout === 'list' && (
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 70px 100px 100px', padding: '10px 1.25rem', borderBottom: '1px solid var(--line-inner)', fontSize: '12px', color: 'var(--text-3)', fontWeight: '500' }}>
                        <span>Client</span><span>Sessions</span><span>Last session</span><span>Tier</span>
                      </div>
                      {allClients.map((client, i) => {
                        const sessions = sessionCountMap.get(client.client_id) ?? 0
                        const lastDate = lastSessionMap.get(client.client_id)
                        const tier     = getTier(sessions)
                        return (
                          <Link key={client.client_id} href={`/dashboard/clients/${client.client_id}`} style={{
                            display: 'grid', gridTemplateColumns: '2fr 70px 100px 100px',
                            padding: '0.875rem 1.25rem', textDecoration: 'none', color: 'inherit', alignItems: 'center',
                            borderBottom: i < allClients.length - 1 ? '1px solid var(--line-inner)' : 'none',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <AvatarUpload entityId={client.client_id} entityType="client"
                                currentUrl={client.avatar_url ?? null} name={client.full_name} size={30} editable={false} />
                              <div>
                                <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 1px' }}>{client.full_name}</p>
                                <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0 }}>{client.email ?? client.phone ?? '—'}</p>
                              </div>
                            </div>
                            <p style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>{sessions}</p>
                            <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>{lastDate ? relDate(lastDate) : '—'}</p>
                            <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '20px', background: tier.bg, color: tier.color, fontWeight: '600', display: 'inline-block', width: 'fit-content', letterSpacing: '.03em' }}>
                              {tier.label}
                            </span>
                          </Link>
                        )
                      })}
                    </div>
                  )}

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
