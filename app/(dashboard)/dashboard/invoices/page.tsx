import Link from 'next/link'
import FilterSelect from '@/components/filter-select'
import Pagination from '@/components/pagination'
import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'
import { sessionName } from '@/lib/session-title'
import { ViewSwitcher } from '@/components/view-switcher'
import { resolveLayout } from '@/lib/view-mode'
import BarChart from '@/components/bar-chart'
import DonutChart from '@/components/donut-chart'
import { AnimatedList, AnimatedItem } from '@/components/animated-list'

import {
  getInvoiceStats,
  getInvoiceList,
  getOutstandingInvoices,
  getPaymentsList
} from '@/lib/domains/invoices/repository'

const PAGE_SIZE = 20

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft:     { bg: '#f1efe8', color: '#5f5e5a' },
  sent:      { bg: '#e6f1fb', color: '#185fa5' },
  paid:      { bg: '#eaf3de', color: '#3b6d11' },
  overdue:   { bg: '#fcebeb', color: '#a32d2d' },
  cancelled: { bg: '#f1efe8', color: '#5f5e5a' },
}

function tabUrl(viewKey: string) {
  return `/dashboard/invoices?view=${viewKey}`
}

function pageUrl(view: string, params: Record<string, string>, pg: number) {
  const p = new URLSearchParams({ view, ...params, page: String(pg) })
  return `/dashboard/invoices?${p}`
}

function TabNav({ active }: { active: string }) {
  const tabs = [
    { key: 'all',         label: 'All' },
    { key: 'outstanding', label: 'Outstanding' },
    { key: 'payments',    label: 'Payments log' },
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

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; status?: string; method?: string; page?: string; layout?: string }>
}) {
  const { view = 'all', status = '', method = '', page = '1', layout: rawLayout } = await searchParams
  const invoiceLayout = view === 'all' ? resolveLayout(rawLayout, ['list', 'grid', 'chart-bar']) : 'list'
  const pageNum = Math.max(1, parseInt(page) || 1)

  const context = await getStudioContext()
  if ('error' in context) redirect('/login')
  const nowTime = new Date().getTime()

  const { stats, chartData } = await getInvoiceStats(context.admin, context.studioId)

  let invoices: any[] = []
  let invoiceTotal = 0
  let outstandingInvoices: any[] = []
  let payments: any[] = []
  let paymentTotal = 0
  let distinctMethods: string[] = []

  if (view === 'all') {
    const res = await getInvoiceList(context.admin, context.studioId, pageNum, status, PAGE_SIZE)
    invoices = res.invoices
    invoiceTotal = res.total
  } else if (view === 'outstanding') {
    const res = await getOutstandingInvoices(context.admin, context.studioId)
    outstandingInvoices = res.invoices
  } else if (view === 'payments') {
    const res = await getPaymentsList(context.admin, context.studioId, pageNum, method, PAGE_SIZE)
    payments = res.payments
    paymentTotal = res.total
    distinctMethods = res.distinctMethods
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div>
      {/* ── Page header ─────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', margin: 0 }}>Invoices</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <a href="/api/export/invoices" style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '13px', border: '1px solid var(--line)', color: 'var(--text-2)', textDecoration: 'none', background: 'var(--surface)', fontWeight: '500' }}>
            Export CSV
          </a>
          <Link href="/dashboard/invoices/new" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '14px', background: 'var(--btn)', color: 'var(--btn-fg)', textDecoration: 'none', fontWeight: '500' }}>
            New invoice
          </Link>
        </div>
      </div>

      {/* ── Stats strip ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '1.25rem' }}>
        {[
          { label: 'Total invoiced', value: `₦${stats.total_invoiced.toLocaleString()}` },
          { label: 'Collected',      value: `₦${stats.total_collected.toLocaleString()}` },
          { label: 'Outstanding',    value: `₦${stats.total_outstanding.toLocaleString()}`, highlight: stats.total_outstanding > 0 },
          { label: 'Overdue',        value: `₦${stats.total_overdue.toLocaleString()}`,    highlight: stats.total_overdue > 0 },
        ].map(s => (
          <div key={s.label} className="glass-panel" style={{ border: s.highlight ? '1px solid #e5c98a' : undefined, borderRadius: '12px', padding: '1rem 1.25rem' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '0 0 6px', fontWeight: '600' }}>{s.label}</p>
            <p style={{ fontSize: '20px', fontWeight: '500', margin: 0, color: s.highlight ? '#854f0b' : 'var(--text)' }}>{s.value}</p>
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
            <FilterSelect name="status" defaultValue={status} placeholder="All statuses"
              options={['draft','sent','paid','overdue','cancelled'].map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }))} />
            <div style={{ marginLeft: 'auto' }}>
              <ViewSwitcher modes={['list', 'grid', 'chart-bar']} storageKey="invoices-all" />
            </div>
          </div>

          {/* ── Chart view ── */}
          {invoiceLayout === 'chart-bar' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              <div className="glass-panel" style={{ borderRadius: '12px', padding: '1.25rem' }}>
                <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-3)', margin: '0 0 1.25rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>Revenue collected — last 6 months (₦k)</p>
                <BarChart data={chartData.monthly_revenue} color="#c9a96e" valueSuffix="k" />
              </div>
              <div className="glass-panel" style={{ borderRadius: '12px', padding: '1.25rem' }}>
                <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-3)', margin: '0 0 1.25rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>By status</p>
                <DonutChart title="invoices" segments={
                  Object.entries(chartData.status_counts).map(([st, cnt]) => ({
                    label: st.charAt(0).toUpperCase() + st.slice(1),
                    value: cnt,
                    color: STATUS_COLORS[st]?.color ?? '#888',
                  }))
                } />
              </div>
            </div>
          )}

          {invoiceLayout !== 'chart-bar' && (
            <>
              <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 12px' }}>
                {invoiceTotal} result{invoiceTotal !== 1 ? 's' : ''}
              </p>
              {!invoices.length ? (
                <div style={{ textAlign: 'center', padding: '4rem', border: '1px dashed var(--line)', borderRadius: '12px', color: 'var(--text-3)' }}>
                  <p style={{ fontSize: '15px', margin: '0 0 4px' }}>{status ? 'No invoices match your filter' : 'No invoices yet'}</p>
                  <p style={{ fontSize: '13px', margin: 0 }}>{status ? 'Try a different status' : 'Create your first invoice from a booking'}</p>
                </div>
              ) : (
                <>
                  {/* ── List view ── */}
                  {invoiceLayout === 'list' && (
                    <AnimatedList className="glass-panel" style={{ borderRadius: '12px', overflow: 'hidden' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '10px 1.25rem', borderBottom: '1px solid var(--line-inner)', fontSize: '12px', color: 'var(--text-3)', fontWeight: '500' }}>
                        <span>Session</span><span>Total / paid</span><span>Due date</span><span>Status</span>
                      </div>
                      {invoices.map((inv, i) => {
                        const s = STATUS_COLORS[inv.status] ?? STATUS_COLORS.draft
                        const partial = inv.paid > 0 && inv.balance > 0
                        return (
                          <AnimatedItem key={inv.invoice_id} delay={i * 0.05}>
                            <Link href={`/dashboard/invoices/${inv.invoice_id}`} style={{
                              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                              padding: '1rem 1.25rem', textDecoration: 'none', color: 'inherit', alignItems: 'center',
                              borderBottom: i < invoices.length - 1 ? '1px solid var(--line-inner)' : 'none',
                            }}>
                            <div>
                              <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 2px' }}>{inv.client_name}</p>
                              <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0, fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                                {inv.session_name}
                              </p>
                            </div>
                            <div>
                              <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 2px' }}>₦{inv.total.toLocaleString()}</p>
                              {partial && (
                                <p style={{ fontSize: '11px', color: '#854f0b', margin: '0 0 4px', fontWeight: '500' }}>
                                  ₦{inv.paid.toLocaleString()} paid · ₦{inv.balance.toLocaleString()} due
                                </p>
                              )}
                              {inv.status === 'paid' && inv.paid > 0 && (
                                <p style={{ fontSize: '11px', color: '#3b6d11', margin: '0 0 4px', fontWeight: '500' }}>✓ Paid in full</p>
                              )}
                              {inv.total > 0 && (
                                <div style={{ height: '3px', background: 'var(--line)', borderRadius: '2px', overflow: 'hidden', width: '80px' }}>
                                  <div style={{ height: '100%', width: `${Math.min(100, (inv.paid / inv.total) * 100).toFixed(0)}%`, background: inv.paid >= inv.total ? '#3b6d11' : '#c9a96e', borderRadius: '2px' }} />
                                </div>
                              )}
                            </div>
                            <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>
                              {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) : '—'}
                            </p>
                            <span style={{ display: 'inline-block', width: 'fit-content', fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: s.bg, color: s.color, fontWeight: '500' }}>
                              {inv.status}
                            </span>
                            </Link>
                          </AnimatedItem>
                        )
                      })}
                    </AnimatedList>
                  )}

                  {/* ── Grid view ── */}
                  {invoiceLayout === 'grid' && (
                    <AnimatedList style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                      {invoices.map((inv, i) => {
                        const s     = STATUS_COLORS[inv.status] ?? STATUS_COLORS.draft
                        return (
                          <AnimatedItem key={inv.invoice_id} delay={i * 0.05}>
                            <Link href={`/dashboard/invoices/${inv.invoice_id}`}
                              className="glass-panel hover-lift"
                              style={{ borderRadius: '12px', overflow: 'hidden', display: 'block', textDecoration: 'none', color: 'inherit' }}>
                            <div style={{ height: '4px', background: s.color }} />
                            <div style={{ padding: '1rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                                <p style={{ fontSize: '14px', fontWeight: '600', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {inv.client_name}
                                </p>
                                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: s.bg, color: s.color, fontWeight: '500', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                  {inv.status}
                                </span>
                              </div>
                              <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: '0 0 10px', fontFamily: 'monospace', letterSpacing: '0.01em' }}>
                                {inv.session_name}
                              </p>
                              <div style={{ paddingTop: '10px', borderTop: '1px solid var(--line-inner)' }}>
                                <p style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 2px' }}>₦{inv.total.toLocaleString()}</p>
                                {inv.balance > 0 && inv.balance < inv.total && (
                                  <p style={{ fontSize: '11px', color: '#854f0b', margin: '0 0 6px', fontWeight: '500' }}>₦{inv.balance.toLocaleString()} remaining</p>
                                )}
                                {inv.total > 0 && (
                                  <div style={{ height: '3px', background: 'var(--line)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${Math.min(100, (inv.paid / inv.total) * 100).toFixed(0)}%`, background: inv.paid >= inv.total ? '#3b6d11' : '#c9a96e', borderRadius: '2px' }} />
                                  </div>
                                )}
                                {inv.due_date && (
                                  <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: '6px 0 0' }}>
                                    Due {new Date(inv.due_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                                  </p>
                                )}
                              </div>
                              </div>
                            </Link>
                          </AnimatedItem>
                        )
                      })}
                    </AnimatedList>
                  )}

                  <Pagination
                    page={pageNum}
                    totalPages={Math.ceil(invoiceTotal / PAGE_SIZE)}
                    prevUrl={pageNum > 1 ? pageUrl('all', { status }, pageNum - 1) : undefined}
                    nextUrl={pageNum < Math.ceil(invoiceTotal / PAGE_SIZE) ? pageUrl('all', { status }, pageNum + 1) : undefined}
                  />
                </>
              )}
            </>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════
          VIEW: OUTSTANDING
          ══════════════════════════════════════════════════════ */}
      {view === 'outstanding' && (
        <>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 1.25rem' }}>
            Sent + overdue invoices with remaining balance — sorted by due date
          </p>
          {outstandingInvoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', border: '1px dashed var(--line)', borderRadius: '12px', color: 'var(--text-3)' }}>
              <p style={{ fontSize: '15px', margin: '0 0 4px' }}>✓ Nothing outstanding</p>
              <p style={{ fontSize: '13px', margin: 0 }}>All sent invoices have been settled</p>
            </div>
          ) : (
            <AnimatedList className="glass-panel" style={{ borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 90px', padding: '10px 1.25rem', borderBottom: '1px solid var(--line-inner)', fontSize: '11px', color: 'var(--text-4)', fontWeight: '600', letterSpacing: '0.04em' }}>
                <span>SESSION</span><span>INVOICE</span><span>BALANCE DUE</span><span>DUE DATE</span><span>STATUS</span>
              </div>
              {outstandingInvoices.map((inv, i) => {
                const s = STATUS_COLORS[inv.status] ?? STATUS_COLORS.sent
                const isOverdue = inv.days_overdue > 0
                return (
                  <AnimatedItem key={inv.invoice_id} delay={i * 0.05}>
                    <Link href={`/dashboard/invoices/${inv.invoice_id}`} style={{
                      display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 90px',
                      padding: '1rem 1.25rem', textDecoration: 'none', color: 'inherit', alignItems: 'center',
                      borderBottom: i < outstandingInvoices.length - 1 ? '1px solid var(--line-inner)' : 'none',
                    }}>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 2px' }}>{inv.client_name}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0, fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                        {inv.session_name}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 4px' }}>₦{inv.total.toLocaleString()}</p>
                      {inv.total > 0 && (
                        <div style={{ height: '3px', background: 'var(--line)', borderRadius: '2px', overflow: 'hidden', width: '64px' }}>
                          <div style={{ height: '100%', width: `${Math.min(100, (inv.paid / inv.total) * 100).toFixed(0)}%`, background: '#c9a96e', borderRadius: '2px' }} />
                        </div>
                      )}
                    </div>
                    <p style={{ fontSize: '14px', fontWeight: '600', margin: 0, color: isOverdue ? '#a32d2d' : 'var(--text)' }}>
                      ₦{inv.balance.toLocaleString()}
                    </p>
                    <div>
                      <p style={{ fontSize: '13px', margin: '0 0 2px', color: isOverdue ? '#a32d2d' : 'var(--text-3)' }}>
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </p>
                      {isOverdue && (
                        <p style={{ fontSize: '11px', color: '#a32d2d', margin: 0, fontWeight: '500' }}>
                          {inv.days_overdue}d overdue
                        </p>
                      )}
                    </div>
                    <span style={{ display: 'inline-block', width: 'fit-content', fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: s.bg, color: s.color, fontWeight: '500' }}>
                      {inv.status}
                    </span>
                  </Link>
                  </AnimatedItem>
                )
              })}
            </AnimatedList>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════
          VIEW: PAYMENTS LOG
          ══════════════════════════════════════════════════════ */}
      {view === 'payments' && (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
            {distinctMethods.length > 0 && (
              <FilterSelect name="method" defaultValue={method} placeholder="All methods"
                options={distinctMethods.map(m => ({ value: m, label: m }))} />
            )}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 12px' }}>
            {paymentTotal} payment{paymentTotal !== 1 ? 's' : ''} recorded
          </p>
          {payments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', border: '1px dashed var(--line)', borderRadius: '12px', color: 'var(--text-3)' }}>
              <p style={{ fontSize: '15px', margin: '0 0 4px' }}>No payments recorded yet</p>
              <p style={{ fontSize: '13px', margin: 0 }}>Payments are recorded from the invoice detail page</p>
            </div>
          ) : (
            <>
              <div className="glass-panel" style={{ borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 2fr 1fr 100px 1fr', padding: '10px 1.25rem', borderBottom: '1px solid var(--line-inner)', fontSize: '11px', color: 'var(--text-4)', fontWeight: '600', letterSpacing: '0.04em' }}>
                  <span>DATE</span><span>CLIENT · SESSION</span><span>AMOUNT</span><span>METHOD</span><span>REFERENCE</span>
                </div>
                {payments.map((p, i) => {
                  return (
                    <div key={p.payment_id} style={{
                      display: 'grid', gridTemplateColumns: '120px 2fr 1fr 100px 1fr',
                      padding: '1rem 1.25rem', alignItems: 'center',
                      borderBottom: i < payments.length - 1 ? '1px solid var(--line-inner)' : 'none',
                    }}>
                      <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>
                        {p.date ? new Date(p.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </p>
                      <div>
                        <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 2px' }}>{p.client_name}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0, fontFamily: 'monospace', letterSpacing: '0.01em' }}>
                          {p.session_name}
                        </p>
                      </div>
                      <p style={{ fontSize: '14px', fontWeight: '600', margin: 0, color: '#3b6d11' }}>
                        ₦{Number(p.amount ?? 0).toLocaleString()}
                      </p>
                      <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '20px', background: 'var(--active)', color: 'var(--text-3)', fontWeight: '500', textTransform: 'capitalize', width: 'fit-content' }}>
                        {p.method ?? '—'}
                      </span>
                      <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: 0, fontFamily: 'monospace' }}>
                        {p.reference ?? '—'}
                      </p>
                    </div>
                  )
                })}
              </div>
              <Pagination
                page={pageNum}
                totalPages={Math.ceil(paymentTotal / PAGE_SIZE)}
                prevUrl={pageNum > 1 ? pageUrl('payments', { method }, pageNum - 1) : undefined}
                nextUrl={pageNum < Math.ceil(paymentTotal / PAGE_SIZE) ? pageUrl('payments', { method }, pageNum + 1) : undefined}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}
