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
import { AnimatedList, AnimatedItem } from '@/components/animated-list'

const PAGE_SIZE = 20

import { getClientStats, getClientList } from '@/lib/domains/clients/repository'

function pageUrl(view: string, params: Record<string, string>, pg: number) {
  const p = new URLSearchParams({ view, ...params, page: String(pg) })
  return `/dashboard/clients?${p}`
}

function tabUrl(viewKey: string) {
  return `/dashboard/clients?view=${viewKey}`
}

function TabNav({ active }: { active: string }) {
  const tabs = [
    { key: 'all',      label: 'All' },
    { key: 'frequent', label: 'Frequent' },
    { key: 'recent',   label: 'Recent' },
    { key: 'dormant',  label: 'Dormant' },
  ]
  return (
    <div className="glass-panel" style={{ display: 'flex', gap: '2px', marginBottom: '1.25rem', padding: '3px', width: 'fit-content' }}>
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

  // ── Stats data ────────────────────────────────────────
  const { stats, chartData } = await getClientStats(context.admin, context.studioId)

  // ── View-specific data ─────────────────────────────────────────
  const { clients: displayClients, totalCount: allTotal } = await getClientList(
    context.admin, 
    context.studioId, 
    { view, search: q, page: pageNum, pageSize: PAGE_SIZE }
  )

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div>
      {/* ── Page header ─────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', margin: 0 }}>Clients</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <a href="/api/export/clients" className="glass-panel hover-lift" style={{ padding: '8px 14px', fontSize: '13px', color: 'var(--text-2)', textDecoration: 'none', fontWeight: '500' }}>
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
          { label: 'Total clients',  value: stats.total_clients },
          { label: 'New this month', value: stats.new_this_month },
          { label: 'Returning (2+)', value: stats.returning_count },
          { label: 'Dormant (90d+)', value: stats.dormant_count },
        ].map(s => (
          <div key={s.label} className="glass-panel" style={{ borderRadius: '12px', padding: '1rem 1.25rem' }}>
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
              <div className="glass-panel" style={{ borderRadius: '12px', padding: '1.25rem' }}>
                <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-3)', margin: '0 0 1.25rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>New clients — last 6 months</p>
                <BarChart data={chartData.monthly_new_clients} color="#c9a96e" />
              </div>
              <div className="glass-panel" style={{ borderRadius: '12px', padding: '1.25rem' }}>
                <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-3)', margin: '0 0 1.25rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>Client tiers</p>
                <DonutChart title="clients" segments={[
                  { label: 'New',       value: chartData.tier_distribution.New,       color: '#888' },
                  { label: 'Returning', value: chartData.tier_distribution.Returning, color: '#185fa5' },
                  { label: 'Regular',   value: chartData.tier_distribution.Regular,   color: '#3b6d11' },
                  { label: 'VIP',       value: chartData.tier_distribution.VIP,       color: '#854f0b' },
                ]} />
              </div>
            </div>
          )}

          {clientLayout !== 'chart-bar' && (
            <>
              <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 12px' }}>
                {allTotal} result{allTotal !== 1 ? 's' : ''}
              </p>

              {!displayClients.length ? (
                <div style={{ textAlign: 'center', padding: '4rem', border: '1px dashed var(--line)', borderRadius: '12px', color: 'var(--text-3)' }}>
                  <p style={{ fontSize: '15px', margin: '0 0 4px' }}>{q ? 'No clients match your search' : 'No clients yet'}</p>
                  <p style={{ fontSize: '13px', margin: 0 }}>{q ? 'Try a different search term' : 'Add your first client to get started'}</p>
                </div>
              ) : (
                <>
                  {/* ── Grid view ── */}
                  {clientLayout === 'grid' && (
                    <AnimatedList style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                      {displayClients.map((client, i) => {
                        const tier = client.tier
                        const ref  = client.client_ref != null ? `#${String(client.client_ref).padStart(4, '0')}` : `#${client.client_id.slice(0, 6).toUpperCase()}`
                        return (
                          <AnimatedItem key={client.client_id} delay={i * 0.05}>
                            <Link href={`/dashboard/clients/${client.client_id}`} className="glass-panel hover-lift" style={{
                              borderRadius: '12px',
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
                                  <p style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: 'var(--text)', lineHeight: 1.1 }}>{client.sessions_count}</p>
                                </div>
                                {client.last_session_date && (
                                  <div>
                                    <p style={{ fontSize: '10px', color: 'var(--text-4)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Last session</p>
                                    <p style={{ fontSize: '13px', fontWeight: '500', margin: 0, color: 'var(--text-2)', lineHeight: 1.2 }}>
                                      {new Date(client.last_session_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                                    </p>
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
                          </AnimatedItem>
                        )
                      })}
                    </AnimatedList>
                  )}

                  {/* ── List view ── */}
                  {clientLayout === 'list' && (
                    <AnimatedList className="glass-panel" style={{ borderRadius: '12px', overflow: 'hidden' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 70px 100px 100px', padding: '10px 1.25rem', borderBottom: '1px solid var(--line-inner)', fontSize: '12px', color: 'var(--text-3)', fontWeight: '500' }}>
                        <span>Client</span><span>Sessions</span><span>Last session</span><span>Tier</span>
                      </div>
                      {displayClients.map((client, i) => {
                        const tier = client.tier
                        return (
                          <AnimatedItem key={client.client_id} delay={i * 0.05}>
                            <Link href={`/dashboard/clients/${client.client_id}`} style={{
                              display: 'grid', gridTemplateColumns: '2fr 70px 100px 100px',
                              padding: '0.875rem 1.25rem', textDecoration: 'none', color: 'inherit', alignItems: 'center',
                              borderBottom: i < displayClients.length - 1 ? '1px solid var(--line-inner)' : 'none',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <AvatarUpload entityId={client.client_id} entityType="client"
                                  currentUrl={client.avatar_url ?? null} name={client.full_name} size={30} editable={false} />
                                <div>
                                  <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 1px' }}>{client.full_name}</p>
                                  <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0 }}>{client.email ?? client.phone ?? '—'}</p>
                                </div>
                              </div>
                              <p style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>{client.sessions_count}</p>
                              <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>
                                {client.last_session_date ? new Date(client.last_session_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) : '—'}
                              </p>
                              <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '20px', background: tier.bg, color: tier.color, fontWeight: '600', display: 'inline-block', width: 'fit-content', letterSpacing: '.03em' }}>
                                {tier.label}
                              </span>
                            </Link>
                          </AnimatedItem>
                        )
                      })}
                    </AnimatedList>
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
            <AnimatedList className="glass-panel" style={{ borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 80px 120px 120px', padding: '8px 1.25rem', borderBottom: '1px solid var(--line-inner)', fontSize: '11px', color: 'var(--text-4)', fontWeight: '600', letterSpacing: '0.04em', alignItems: 'center' }}>
                <span>#</span><span>CLIENT</span><span>SESSIONS</span><span>LAST BOOKING</span><span>LAST CATEGORY</span>
              </div>
              {displayClients.map((c, i) => (
                <AnimatedItem key={c.client_id} delay={i * 0.05}>
                  <Link href={`/dashboard/clients/${c.client_id}`} style={{
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
                    <p style={{ fontSize: '14px', fontWeight: '600', margin: 0, color: 'var(--text)' }}>{c.sessions_count}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>
                      {c.last_session_date ? new Date(c.last_session_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>{c.last_session_type || '—'}</p>
                  </Link>
                </AnimatedItem>
              ))}
            </AnimatedList>
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
            <AnimatedList className="glass-panel" style={{ borderRadius: '12px', overflow: 'hidden' }}>
              {displayClients.map((c, i) => (
                <AnimatedItem key={c.client_id} delay={i * 0.05}>
                  <Link href={`/dashboard/clients/${c.client_id}`} style={{
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
                        {c.last_session_date ? new Date(c.last_session_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </p>
                      <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: 0 }}>
                        {c.sessions_count} total session{c.sessions_count !== 1 ? 's' : ''}
                        {c.last_session_type ? ` · ${c.last_session_type}` : ''}
                      </p>
                    </div>
                  </Link>
                </AnimatedItem>
              ))}
            </AnimatedList>
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
            <AnimatedList className="glass-panel" style={{ borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px 80px', padding: '8px 1.25rem', borderBottom: '1px solid var(--line-inner)', fontSize: '11px', color: 'var(--text-4)', fontWeight: '600', letterSpacing: '0.04em' }}>
                <span>CLIENT</span><span>LAST SESSION</span><span>DORMANT FOR</span><span>SESSIONS</span>
              </div>
              {displayClients.map((c, i) => (
                <AnimatedItem key={c.client_id} delay={i * 0.05}>
                  <Link href={`/dashboard/clients/${c.client_id}`} style={{
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
                      {c.last_session_date ? new Date(c.last_session_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </p>
                    <p style={{ fontSize: '13px', fontWeight: '500', margin: 0, color: (c.days_since_last_session ?? 0) > 180 ? '#a32d2d' : '#854f0b' }}>
                      {c.days_since_last_session == null ? '—' : `${c.days_since_last_session} days`}
                    </p>
                    <p style={{ fontSize: '13px', margin: 0 }}>{c.sessions_count}</p>
                  </Link>
                </AnimatedItem>
              ))}
            </AnimatedList>
          )}
        </>
      )}
    </div>
  )
}
