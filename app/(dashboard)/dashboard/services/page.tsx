import Link from 'next/link'
import SearchInput from '@/components/search-input'
import FilterSelect from '@/components/filter-select'
import Pagination from '@/components/pagination'
import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'

// ─── Types ──────────────────────────────────────────────────────────────────

type ServiceItem = {
  service_id:    string
  name:          string
  type:          string
  description?:  string | null
  price?:        number | null
  duration_mins?: number | null
  is_active:     boolean
  display_order: number
}

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
  searchParams: Promise<{ q?: string; type?: string; active?: string; page?: string }>
}) {
  const { q = '', type = '', active = '', page = '1' } = await searchParams
  const pageNum = Math.max(1, parseInt(page) || 1)
  const from    = (pageNum - 1) * PAGE_SIZE
  const to      = from + PAGE_SIZE - 1

  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  // ── Stats (always full set) ──────────────────────────────────────────
  const { data: allRaw } = await context.admin
    .from('services')
    .select('type, is_active')
    .eq('studio_id', context.studioId)
  const all = (allRaw ?? []) as { type: string; is_active: boolean }[]

  const totalCount   = all.length
  const activeCount  = all.filter(s => s.is_active).length
  const serviceCount = all.filter(s => s.type === 'service').length
  const productCount = all.filter(s => s.type === 'product').length
  const digitalCount = all.filter(s => s.type === 'digital').length

  const statsItems = [
    { label: 'Total',    value: totalCount },
    { label: 'Active',   value: activeCount,  accent: '#3b6d11' },
    { label: '🎯 Service', value: serviceCount, accent: '#534ab7' },
    { label: '📦 Product', value: productCount, accent: '#854f0b' },
    { label: '💻 Digital', value: digitalCount, accent: '#185fa5' },
  ]

  // ── List query with filters ──────────────────────────────────────────
  let query = context.admin
    .from('services')
    .select('service_id, name, type, description, price, duration_mins, is_active, display_order', { count: 'exact' })
    .eq('studio_id', context.studioId)

  if (q)    query = query.ilike('name', `%${q}%`)
  if (type) query = query.eq('type', type)
  if (active === 'active')   query = query.eq('is_active', true)
  if (active === 'inactive') query = query.eq('is_active', false)

  const { data: servicesRaw, count } = await query
    .order('display_order', { ascending: true })
    .order('name',          { ascending: true })
    .range(from, to)
  const services = (servicesRaw ?? []) as unknown as ServiceItem[]

  const listTotal  = count ?? 0
  const totalPages = Math.ceil(listTotal / PAGE_SIZE)
  const prevUrl    = pageNum > 1          ? pageUrl({ q, type, active }, pageNum - 1) : undefined
  const nextUrl    = pageNum < totalPages ? pageUrl({ q, type, active }, pageNum + 1) : undefined

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>Services</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>
            Your photography services, products, and digital offerings
          </p>
        </div>
        <Link href="/dashboard/services/new" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '14px', background: 'var(--btn)', color: 'var(--btn-fg)', textDecoration: 'none', fontWeight: '500' }}>
          Add service
        </Link>
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

      {/* List */}
      {!services.length ? (
        <EmptyState
          message={q || type || active ? 'No services match your filters' : 'No services yet'}
          sub={q || type || active ? 'Try adjusting your search or filters' : 'Add photography packages, products, and digital delivery options that clients can book'}
        />
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
            padding: '10px 1.25rem', borderBottom: '1px solid var(--line-inner)',
            fontSize: '12px', color: 'var(--text-3)', fontWeight: '500',
          }}>
            <span>Name</span><span>Type</span><span>Price</span><span>Status</span>
          </div>
          {services.map((svc, i) => {
            const tc = TYPE_COLORS[svc.type] ?? TYPE_COLORS.service
            return (
              <Link
                key={svc.service_id}
                href={`/dashboard/services/${svc.service_id}`}
                style={{
                  display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                  padding: '0.875rem 1.25rem', alignItems: 'center',
                  borderBottom: i < services.length - 1 ? '1px solid var(--line-inner)' : 'none',
                  borderLeft: `4px solid ${tc.color}`,
                  textDecoration: 'none', color: 'inherit',
                }}
              >
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 2px' }}>{svc.name}</p>
                  {svc.description && (
                    <p style={{
                      fontSize: '12px', color: 'var(--text-3)', margin: 0,
                      overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
                    }}>
                      {svc.description}
                    </p>
                  )}
                </div>
                <span>
                  <span style={{
                    fontSize: '11px', padding: '2px 8px', borderRadius: '20px',
                    background: tc.bg, color: tc.color, fontWeight: '500',
                  }}>
                    {TYPE_ICONS[svc.type]} {TYPE_LABELS[svc.type] ?? svc.type}
                  </span>
                </span>
                <span style={{ fontSize: '14px', fontWeight: '500' }}>
                  {svc.price != null
                    ? `₦${Number(svc.price).toLocaleString()}`
                    : <span style={{ color: 'var(--text-4)' }}>—</span>
                  }
                </span>
                <span>
                  <span style={{
                    fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: '500',
                    background: svc.is_active ? '#eaf3de' : '#f3f3f3',
                    color:      svc.is_active ? '#3b6d11' : '#888',
                  }}>
                    {svc.is_active ? 'Active' : 'Inactive'}
                  </span>
                </span>
              </Link>
            )
          })}
          {totalPages > 1 && (
            <Pagination page={pageNum} totalPages={totalPages} prevUrl={prevUrl} nextUrl={nextUrl} />
          )}
        </div>
      )}
    </div>
  )
}
