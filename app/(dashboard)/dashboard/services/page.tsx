import Link from 'next/link'
import SearchInput from '@/components/search-input'
import FilterSelect from '@/components/filter-select'
import Pagination from '@/components/pagination'
import { ViewSwitcher } from '@/components/view-switcher'
import { resolveLayout } from '@/lib/view-mode'
import DonutChart from '@/components/donut-chart'
import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'
import { AnimatedList, AnimatedItem } from '@/components/animated-list'

import { getServiceStats, getServiceList } from '@/lib/domains/services/repository'

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  service: { bg: '#eeedfe', color: '#534ab7' },
  product: { bg: '#faeeda', color: '#854f0b' },
  digital: { bg: '#e6f1fb', color: '#185fa5' },
}

const TYPE_LABELS: Record<string, string> = {
  service: 'Service',
  product: 'Product',
  digital: 'Digital',
}

const TYPE_ICONS: Record<string, string> = {
  service: '🎯',
  product: '📦',
  digital: '💻',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pageUrl(params: Record<string, string | undefined>, pg: number) {
  const p = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v && k !== 'page') p.set(k, v) })
  p.set('page', String(pg))
  return `/dashboard/services?${p}`
}

// ─── Component helpers ───────────────────────────────────────────────────────

function StatsStrip({ items }: { items: { label: string; value: string | number; accent?: string }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: '12px', marginBottom: '1.5rem' }}>
      {items.map(item => (
        <div key={item.label} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.1rem 1.25rem' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '0 0 6px', fontWeight: '500' }}>{item.label}</p>
          <p style={{ fontSize: '26px', fontWeight: '500', margin: 0, color: item.accent ?? 'var(--text)', lineHeight: 1.1 }}>{item.value}</p>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ message, sub }: { message: string; sub: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '4rem', border: '1px dashed var(--line)', borderRadius: '12px', color: 'var(--text-3)' }}>
      <p style={{ fontSize: '15px', margin: '0 0 4px' }}>{message}</p>
      <p style={{ fontSize: '13px', margin: 0 }}>{sub}</p>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; active?: string; page?: string; layout?: string }>
}) {
  const { q = '', type = '', active = '', page = '1', layout: rawLayout } = await searchParams
  const layout = resolveLayout(rawLayout, ['grid', 'list', 'chart-donut'])
  const pageNum = Math.max(1, parseInt(page) || 1)
  const from    = (pageNum - 1) * PAGE_SIZE
  const to      = from + PAGE_SIZE - 1

  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  // ── Stats (always full set) ──────────────────────────────────────────
  const stats = await getServiceStats(context.admin, context.studioId)

  const statsItems = [
    { label: 'Total',    value: stats.total },
    { label: 'Active',   value: stats.active,  accent: '#3b6d11' },
    { label: '🎯 Service', value: stats.service_count, accent: '#534ab7' },
    { label: '📦 Product', value: stats.product_count, accent: '#854f0b' },
    { label: '💻 Digital', value: stats.digital_count, accent: '#185fa5' },
  ]

  // ── List query with filters ──────────────────────────────────────────
  const { services, total: listTotal } = await getServiceList(
    context.admin,
    context.studioId,
    pageNum,
    q,
    type,
    active,
    PAGE_SIZE
  )
  const totalPages = Math.ceil(listTotal / PAGE_SIZE)
  const prevUrl    = pageNum > 1          ? pageUrl({ q, type, active }, pageNum - 1) : undefined
  const nextUrl    = pageNum < totalPages ? pageUrl({ q, type, active }, pageNum + 1) : undefined

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>Services, Catalog & Add-ons</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>
            Standalone items that can be attached to Offerings.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <ViewSwitcher modes={['grid', 'list', 'chart-donut']} storageKey="services" />
          <Link href="/dashboard/services/new" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '14px', background: 'var(--btn)', color: 'var(--btn-fg)', textDecoration: 'none', fontWeight: '500' }}>
            Add service
          </Link>
        </div>
      </div>

      <StatsStrip items={statsItems} />

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <SearchInput defaultValue={q} placeholder="Search by name..." />
        <FilterSelect
          name="type"
          defaultValue={type}
          placeholder="All types"
          options={[
            { value: 'service', label: '🎯 Service' },
            { value: 'product', label: '📦 Product' },
            { value: 'digital', label: '💻 Digital' },
          ]}
        />
        <FilterSelect
          name="active"
          defaultValue={active}
          placeholder="All statuses"
          options={[
            { value: 'active',   label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]}
        />
      </div>

      <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 1rem' }}>
        {listTotal} service{listTotal !== 1 ? 's' : ''}
      </p>

      {/* ── Chart: donut breakdown ───────────────────────────── */}
      {layout === 'chart-donut' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem' }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-3)', margin: '0 0 1.25rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>By type</p>
            <DonutChart title="services" segments={[
              { label: '🎯 Service', value: stats.service_count, color: '#534ab7' },
              { label: '📦 Product', value: stats.product_count, color: '#854f0b' },
              { label: '💻 Digital', value: stats.digital_count, color: '#185fa5' },
            ]} />
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem' }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-3)', margin: '0 0 1.25rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>Active vs inactive</p>
            <DonutChart title="services" segments={[
              { label: 'Active',   value: stats.active,            color: '#3b6d11' },
              { label: 'Inactive', value: stats.total - stats.active, color: '#888' },
            ]} />
          </div>
        </div>
      )}

      {/* ── Card grid ────────────────────────────────────────── */}
      {layout !== 'chart-donut' && !services.length && (
        <EmptyState
          message={q || type || active ? 'No services match your filters' : 'No services yet'}
          sub={q || type || active ? 'Try adjusting your search or filters' : 'Add photography packages, products, and digital delivery options that clients can book'}
        />
      )}

      {/* ── Grid view ────────────────────────────────────────── */}
      {layout === 'grid' && services.length > 0 && (
        <>
          <AnimatedList style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
            {services.map((svc, i) => {
              const tc = TYPE_COLORS[svc.type] ?? TYPE_COLORS.service
              return (
                <AnimatedItem key={svc.service_id} delay={i * 0.05}>
                  <Link href={`/dashboard/services/${svc.service_id}`}
                    style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden', display: 'block', textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ height: '5px', background: tc.color }} />
                    <div style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '20px', lineHeight: 1 }}>{TYPE_ICONS[svc.type]}</span>
                        <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '20px', fontWeight: '600', background: svc.is_active ? '#eaf3de' : '#f3f3f3', color: svc.is_active ? '#3b6d11' : '#888', flexShrink: 0 }}>
                          {svc.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 4px', lineHeight: 1.3 }}>{svc.name}</p>
                      {svc.description && (
                        <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '0 0 10px', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                          {svc.description}
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px solid var(--line-inner)' }}>
                        <div>
                          <p style={{ fontSize: '10px', color: 'var(--text-4)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Price</p>
                          <p style={{ fontSize: '16px', fontWeight: '600', margin: 0, lineHeight: 1.1 }}>
                            {svc.price != null ? `₦${Number(svc.price).toLocaleString()}` : <span style={{ color: 'var(--text-4)', fontWeight: '400' }}>—</span>}
                          </p>
                        </div>
                        {svc.duration_mins != null && (
                          <div>
                            <p style={{ fontSize: '10px', color: 'var(--text-4)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Duration</p>
                            <p style={{ fontSize: '14px', fontWeight: '500', margin: 0, lineHeight: 1.1 }}>{svc.duration_mins} min</p>
                          </div>
                        )}
                        <div style={{ marginLeft: 'auto' }}>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: tc.bg, color: tc.color, fontWeight: '500' }}>
                            {TYPE_LABELS[svc.type] ?? svc.type}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </AnimatedItem>
              )
            })}
          </AnimatedList>
          {totalPages > 1 && <div style={{ marginTop: '1rem' }}><Pagination page={pageNum} totalPages={totalPages} prevUrl={prevUrl} nextUrl={nextUrl} /></div>}
        </>
      )}

      {/* ── List view ────────────────────────────────────────── */}
      {layout === 'list' && services.length > 0 && (
        <>
          <AnimatedList style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '10px 1.25rem', borderBottom: '1px solid var(--line-inner)', fontSize: '12px', color: 'var(--text-3)', fontWeight: '500' }}>
              <span>Name</span><span>Type</span><span>Price</span><span>Status</span>
            </div>
            {services.map((svc, i) => {
              const tc = TYPE_COLORS[svc.type] ?? TYPE_COLORS.service
              return (
                <AnimatedItem key={svc.service_id} delay={i * 0.05}>
                  <Link href={`/dashboard/services/${svc.service_id}`}
                    style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '0.875rem 1.25rem', alignItems: 'center', borderBottom: i < services.length - 1 ? '1px solid var(--line-inner)' : 'none', borderLeft: `4px solid ${tc.color}`, textDecoration: 'none', color: 'inherit' }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 2px' }}>{svc.name}</p>
                      {svc.description && <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' as const }}>{svc.description}</p>}
                    </div>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: tc.bg, color: tc.color, fontWeight: '500', display: 'inline-block', width: 'fit-content' }}>
                      {TYPE_ICONS[svc.type]} {TYPE_LABELS[svc.type] ?? svc.type}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>
                      {svc.price != null ? `₦${Number(svc.price).toLocaleString()}` : <span style={{ color: 'var(--text-4)' }}>—</span>}
                    </span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: '500', background: svc.is_active ? '#eaf3de' : '#f3f3f3', color: svc.is_active ? '#3b6d11' : '#888', display: 'inline-block', width: 'fit-content' }}>
                      {svc.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </Link>
                </AnimatedItem>
              )
            })}
          </AnimatedList>
          {totalPages > 1 && <div style={{ marginTop: '1rem' }}><Pagination page={pageNum} totalPages={totalPages} prevUrl={prevUrl} nextUrl={nextUrl} /></div>}
        </>
      )}
    </div>
  )
}
