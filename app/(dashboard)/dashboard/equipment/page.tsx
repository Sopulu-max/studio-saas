import Link from 'next/link'
import SearchInput from '@/components/search-input'
import FilterSelect from '@/components/filter-select'
import Pagination from '@/components/pagination'
import EquipmentCard from './equipment-card'
import { redirect } from 'next/navigation'
import { getStudioContext, fetchStudio } from '@/lib/studio'
import { buildStudioConfig, getEquipmentCategoryConfig } from '@/lib/studio-config'
import { ViewSwitcher } from '@/components/view-switcher'
import { resolveLayout } from '@/lib/view-mode'
import DonutChart from '@/components/donut-chart'
import { AnimatedList, AnimatedItem } from '@/components/animated-list'

import { getEquipmentStats, getEquipmentList } from '@/lib/domains/equipment/repository'
import { EquipmentRowDTO } from '@/lib/domains/equipment/types'

// ─── Constants ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  available:   { bg: '#eaf3de', color: '#3b6d11' },
  in_use:      { bg: '#e6f1fb', color: '#185fa5' },
  maintenance: { bg: '#faeeda', color: '#854f0b' },
  retired:     { bg: '#fcebeb', color: '#a32d2d' },
}

const STATUS_ORDER = ['available', 'in_use', 'maintenance', 'retired']
const STATUS_LABELS: Record<string, string> = {
  available:   'Available',
  in_use:      'In use',
  maintenance: 'Maintenance',
  retired:     'Retired',
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function pageUrl(params: Record<string, string | undefined>, pg: number) {
  const p = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v && k !== 'page') p.set(k, v) })
  p.set('page', String(pg))
  return `/dashboard/equipment?${p}`
}

function tabUrl(view: string) {
  return `/dashboard/equipment?view=${view}`
}

// ─── Component helpers ──────────────────────────────────────────────────────

function TabNav({ active }: { active: string }) {
  const tabs = [
    { key: 'all',         label: 'All' },
    { key: 'by-status',   label: 'By status' },
    { key: 'by-category', label: 'By category' },
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

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string; category?: string; status?: string; page?: string; layout?: string }>
}) {
  const { view = 'all', q = '', category = '', status = '', page = '1', layout: rawLayout } = await searchParams
  const equipLayout = view === 'all' ? resolveLayout(rawLayout, ['grid', 'list', 'chart-donut']) : 'grid'
  const pageNum = Math.max(1, parseInt(page) || 1)
  const from    = (pageNum - 1) * PAGE_SIZE
  const to      = from + PAGE_SIZE - 1

  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const studio = await fetchStudio(context.admin, context.studioId)
  const config = buildStudioConfig(
    studio?.session_types, studio?.booking_statuses, studio?.service_types,
    studio?.equipment_categories, studio?.staff_roles,
  )

  // ── Stats (always) ───────────────────────────────────────────────
  const stats = await getEquipmentStats(context.admin, context.studioId)

  const statsItems = [
    { label: 'Total items',  value: stats.total },
    { label: 'Available',    value: stats.available,   accent: '#3b6d11' },
    { label: 'In use',       value: stats.in_use,       accent: '#185fa5' },
    { label: 'Maintenance',  value: stats.maintenance, accent: '#854f0b' },
  ]

  // ── Header ───────────────────────────────────────────────────────
  const header = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
      <h1 style={{ fontSize: '22px', fontWeight: '500', margin: 0 }}>Equipment</h1>
      <Link href="/dashboard/equipment/new" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '14px', background: 'var(--btn)', color: 'var(--btn-fg)', textDecoration: 'none', fontWeight: '500' }}>
        Add equipment
      </Link>
    </div>
  )

  // ── By status view ───────────────────────────────────────────────
  if (view === 'by-status') {
    const { items } = await getEquipmentList(context.admin, context.studioId)

    // Group by status in defined order
    const groups: Record<string, EquipmentRowDTO[]> = {}
    for (const s of STATUS_ORDER) groups[s] = []
    for (const item of items) {
      const key = item.status in groups ? item.status : 'available'
      groups[key].push(item)
    }

    const nonEmptyGroups = STATUS_ORDER.filter(s => groups[s].length > 0)

    return (
      <div>
        {header}
        <StatsStrip items={statsItems} />
        <TabNav active="by-status" />

        {!items.length ? (
          <EmptyState message="No equipment yet" sub="Add your cameras, lenses, and lighting gear" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {nonEmptyGroups.map(statusKey => {
              const sc    = STATUS_COLORS[statusKey] ?? STATUS_COLORS.available
              const group = groups[statusKey]
              const pct   = stats.total > 0 ? (group.length / stats.total) * 100 : 0
              return (
                <div key={statusKey}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: sc.bg, color: sc.color, fontWeight: '500' }}>
                      {STATUS_LABELS[statusKey] ?? statusKey}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-4)' }}>{group.length} item{group.length !== 1 ? 's' : ''}</span>
                    <div style={{ flex: 1, maxWidth: '140px', height: '4px', background: 'var(--line)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct.toFixed(1)}%`, background: sc.color, borderRadius: '2px' }} />
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-4)' }}>{pct.toFixed(0)}%</span>
                  </div>
                  <AnimatedList style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '10px 1.25rem', borderBottom: '1px solid var(--line-inner)', fontSize: '12px', color: 'var(--text-3)', fontWeight: '500' }}>
                      <span>Name</span><span>Category</span><span>Serial no.</span><span>Status</span>
                    </div>
                    {group.map((item, i) => {
                      const catCfg = getEquipmentCategoryConfig(config, item.category)
                      return (
                        <AnimatedItem key={item.equipment_id} delay={i * 0.05}>
                          <EquipmentCard item={item} catStyle={{ bg: catCfg.color_bg, color: catCfg.color_fg }} statusStyle={sc} isLast={i === group.length - 1} />
                        </AnimatedItem>
                      )
                    })}
                  </AnimatedList>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── By category view ─────────────────────────────────────────────
  if (view === 'by-category') {
    const { items } = await getEquipmentList(context.admin, context.studioId)

    // Build category groups (config order first, then unknown)
    const configCatOrder = config.equipmentCategories.map(c => c.value)
    const catGroups: Record<string, EquipmentRowDTO[]> = {}
    for (const item of items) {
      const key = item.category ?? 'other'
      if (!catGroups[key]) catGroups[key] = []
      catGroups[key].push(item)
    }

    const allCats = [
      ...configCatOrder.filter(c => catGroups[c]?.length > 0),
      ...Object.keys(catGroups).filter(c => !configCatOrder.includes(c)),
    ]

    return (
      <div>
        {header}
        <StatsStrip items={statsItems} />
        <TabNav active="by-category" />

        {!items.length ? (
          <EmptyState message="No equipment yet" sub="Add your cameras, lenses, and lighting gear" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {allCats.map(catKey => {
              const cc    = getEquipmentCategoryConfig(config, catKey)
              const group = catGroups[catKey]
              const pct   = stats.total > 0 ? (group.length / stats.total) * 100 : 0
              return (
                <div key={catKey}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: cc.color_bg, color: cc.color_fg, fontWeight: '500', textTransform: 'capitalize' }}>
                      {cc.label || catKey}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-4)' }}>{group.length} item{group.length !== 1 ? 's' : ''}</span>
                    <div style={{ flex: 1, maxWidth: '140px', height: '4px', background: 'var(--line)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct.toFixed(1)}%`, background: cc.color_fg, borderRadius: '2px' }} />
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-4)' }}>{pct.toFixed(0)}%</span>
                  </div>
                  <AnimatedList style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '10px 1.25rem', borderBottom: '1px solid var(--line-inner)', fontSize: '12px', color: 'var(--text-3)', fontWeight: '500' }}>
                      <span>Name</span><span>Category</span><span>Serial no.</span><span>Status</span>
                    </div>
                    {group.map((item, i) => {
                      const sc = STATUS_COLORS[item.status ?? ''] ?? STATUS_COLORS.available
                      return (
                        <AnimatedItem key={item.equipment_id} delay={i * 0.05}>
                          <EquipmentCard item={item} catStyle={{ bg: cc.color_bg, color: cc.color_fg }} statusStyle={sc} isLast={i === group.length - 1} />
                        </AnimatedItem>
                      )
                    })}
                  </AnimatedList>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── All view (default) ───────────────────────────────────────────
  const { items: equipment, total: listTotal } = await getEquipmentList(context.admin, context.studioId, {
    q,
    category,
    status,
    page: pageNum,
    pageSize: PAGE_SIZE
  })
  const totalPages = Math.ceil(listTotal / PAGE_SIZE)
  const prevUrl    = pageNum > 1          ? pageUrl({ view: 'all', q, category, status }, pageNum - 1) : undefined
  const nextUrl    = pageNum < totalPages ? pageUrl({ view: 'all', q, category, status }, pageNum + 1) : undefined

  return (
    <div>
      {header}
      <StatsStrip items={statsItems} />
      <TabNav active="all" />

      <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchInput defaultValue={q} placeholder="Search by name..." />
        <FilterSelect
          name="category"
          defaultValue={category}
          placeholder="All categories"
          options={config.equipmentCategories.map(c => ({ value: c.value, label: c.label }))}
        />
        <FilterSelect
          name="status"
          defaultValue={status}
          placeholder="All statuses"
          options={[
            { value: 'available',   label: 'Available' },
            { value: 'in_use',      label: 'In use' },
            { value: 'maintenance', label: 'Maintenance' },
            { value: 'retired',     label: 'Retired' },
          ]}
        />
        <div style={{ marginLeft: 'auto' }}>
          <ViewSwitcher modes={['grid', 'list', 'chart-donut']} storageKey="equipment-all" />
        </div>
      </div>

      <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 1rem' }}>
        {listTotal} item{listTotal !== 1 ? 's' : ''}
      </p>

      {/* ── Chart: donut breakdown ── */}
      {equipLayout === 'chart-donut' && (() => {
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem' }}>
              <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-3)', margin: '0 0 1.25rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>By status</p>
              <DonutChart title="items" segments={[
                { label: 'Available',    value: stats.available,   color: '#3b6d11' },
                { label: 'In use',       value: stats.in_use,       color: '#185fa5' },
                { label: 'Maintenance',  value: stats.maintenance, color: '#854f0b' },
                { label: 'Retired',      value: stats.total - stats.available - stats.in_use - stats.maintenance, color: '#a32d2d' },
              ]} />
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem' }}>
              <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-3)', margin: '0 0 1.25rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>By category</p>
              <DonutChart title="items" segments={
                Object.entries(stats.by_category).map(([cat, cnt], idx) => {
                  const cc = getEquipmentCategoryConfig(config, cat)
                  const palette = ['#534ab7','#185fa5','#3b6d11','#854f0b','#a32d2d','#888']
                  return { label: cc.label || cat, value: cnt, color: cc.color_fg || palette[idx % palette.length] }
                })
              } />
            </div>
          </div>
        )
      })()}

      {equipLayout !== 'chart-donut' && !equipment.length && (
        <EmptyState
          message={q || category || status ? 'No equipment match your filters' : 'No equipment yet'}
          sub={q || category || status ? 'Try adjusting your search or filters' : 'Add your cameras, lenses, and lighting gear'}
        />
      )}

      {/* ── Grid view ── */}
      {equipLayout === 'grid' && equipment.length > 0 && (
        <>
          <AnimatedList style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
            {equipment.map((item, i) => {
              const catCfg = getEquipmentCategoryConfig(config, item.category)
              const st     = STATUS_COLORS[item.status ?? ''] ?? STATUS_COLORS.available
              return (
                <AnimatedItem key={item.equipment_id} delay={i * 0.05}>
                  <Link href={`/dashboard/equipment/${item.equipment_id}`}
                    style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden', display: 'block', textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ height: '5px', background: st.color }} />
                    <div style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                        <p style={{ fontSize: '14px', fontWeight: '600', margin: 0, lineHeight: 1.3 }}>{item.name}</p>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: st.bg, color: st.color, fontWeight: '500', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {STATUS_LABELS[item.status] ?? item.status.replace('_', ' ')}
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: catCfg.color_bg, color: catCfg.color_fg, fontWeight: '500', textTransform: 'capitalize' }}>
                        {catCfg.label || item.category}
                      </span>
                      <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--line-inner)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0, fontFamily: 'monospace' }}>
                          {item.serial_number ? `S/N ${item.serial_number}` : 'No serial no.'}
                        </p>
                        {item.status === 'in_use' && item.assigned_to && (
                          <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: 0 }}>→ {item.assigned_to}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                </AnimatedItem>
              )
            })}
          </AnimatedList>
          {totalPages > 1 && (
            <div style={{ marginTop: '1rem' }}>
              <Pagination page={pageNum} totalPages={totalPages} prevUrl={prevUrl} nextUrl={nextUrl} />
            </div>
          )}
        </>
      )}

      {/* ── List view ── */}
      {equipLayout === 'list' && equipment.length > 0 && (
        <>
          <AnimatedList style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '10px 1.25rem', borderBottom: '1px solid var(--line-inner)', fontSize: '12px', color: 'var(--text-3)', fontWeight: '500' }}>
              <span>Name</span><span>Category</span><span>Serial no.</span><span>Status</span>
            </div>
            {equipment.map((item, i) => {
              const catCfg = getEquipmentCategoryConfig(config, item.category)
              const st     = STATUS_COLORS[item.status ?? ''] ?? STATUS_COLORS.available
              return (
                <AnimatedItem key={item.equipment_id} delay={i * 0.05}>
                  <Link href={`/dashboard/equipment/${item.equipment_id}`} style={{
                    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                    padding: '0.875rem 1.25rem', textDecoration: 'none', color: 'inherit', alignItems: 'center',
                    borderBottom: i < equipment.length - 1 ? '1px solid var(--line-inner)' : 'none',
                    borderLeft: `4px solid ${st.color}`,
                  }}>
                    <p style={{ fontSize: '13px', fontWeight: '600', margin: 0 }}>{item.name}</p>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: catCfg.color_bg, color: catCfg.color_fg, fontWeight: '500', textTransform: 'capitalize', display: 'inline-block', width: 'fit-content' }}>
                      {catCfg.label || item.category}
                    </span>
                    <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0, fontFamily: 'monospace' }}>
                      {item.serial_number ?? '—'}
                    </p>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: st.bg, color: st.color, fontWeight: '500', display: 'inline-block', width: 'fit-content' }}>
                      {STATUS_LABELS[item.status] ?? item.status.replace('_', ' ')}
                    </span>
                  </Link>
                </AnimatedItem>
              )
            })}
          </AnimatedList>
          {totalPages > 1 && (
            <div style={{ marginTop: '1rem' }}>
              <Pagination page={pageNum} totalPages={totalPages} prevUrl={prevUrl} nextUrl={nextUrl} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
