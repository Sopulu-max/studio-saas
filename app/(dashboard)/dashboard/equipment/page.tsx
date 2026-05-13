import Link from 'next/link'
import SearchInput from '@/components/search-input'
import FilterSelect from '@/components/filter-select'
import Pagination from '@/components/pagination'
import EquipmentCard from './equipment-card'
import { redirect } from 'next/navigation'
import { getStudioContext, fetchStudio } from '@/lib/studio'
import { buildStudioConfig, getEquipmentCategoryConfig } from '@/lib/studio-config'

// ─── Types ─────────────────────────────────────────────────────────────────

type EquipmentItem = {
  equipment_id:  string
  name:          string
  category:      string
  serial_number?: string | null
  status:        string
  notes?:        string | null
  assigned_to?:  string | null
}

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
  searchParams: Promise<{ view?: string; q?: string; category?: string; status?: string; page?: string }>
}) {
  const { view = 'all', q = '', category = '', status = '', page = '1' } = await searchParams
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
  const { data: allEquipmentRaw } = await context.admin
    .from('equipment')
    .select('status, category')
    .eq('studio_id', context.studioId)
  const allEquipment = (allEquipmentRaw ?? []) as { status: string; category: string }[]

  const totalItems  = allEquipment.length
  const available   = allEquipment.filter(e => e.status === 'available').length
  const inUse       = allEquipment.filter(e => e.status === 'in_use').length
  const maintenance = allEquipment.filter(e => e.status === 'maintenance').length

  const statsItems = [
    { label: 'Total items',  value: totalItems },
    { label: 'Available',    value: available,   accent: '#3b6d11' },
    { label: 'In use',       value: inUse,       accent: '#185fa5' },
    { label: 'Maintenance',  value: maintenance, accent: '#854f0b' },
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
    const { data: raw } = await context.admin
      .from('equipment')
      .select('equipment_id, name, category, serial_number, status, notes, assigned_to')
      .eq('studio_id', context.studioId)
      .order('name', { ascending: true })

    const items = (raw ?? []) as unknown as EquipmentItem[]

    // Group by status in defined order
    const groups: Record<string, EquipmentItem[]> = {}
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
              return (
                <div key={statusKey}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: sc.bg, color: sc.color, fontWeight: '500' }}>
                      {STATUS_LABELS[statusKey] ?? statusKey}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-4)' }}>{group.length} item{group.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '10px 1.25rem', borderBottom: '1px solid var(--line-inner)', fontSize: '12px', color: 'var(--text-3)', fontWeight: '500' }}>
                      <span>Name</span><span>Category</span><span>Serial no.</span><span>Status</span>
                    </div>
                    {group.map((item, i) => {
                      const catCfg = getEquipmentCategoryConfig(config, item.category)
                      return (
                        <EquipmentCard key={item.equipment_id} item={item} catStyle={{ bg: catCfg.color_bg, color: catCfg.color_fg }} statusStyle={sc} isLast={i === group.length - 1} />
                      )
                    })}
                  </div>
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
    const { data: raw } = await context.admin
      .from('equipment')
      .select('equipment_id, name, category, serial_number, status, notes, assigned_to')
      .eq('studio_id', context.studioId)
      .order('name', { ascending: true })

    const items = (raw ?? []) as unknown as EquipmentItem[]

    // Build category groups (config order first, then unknown)
    const configCatOrder = config.equipmentCategories.map(c => c.value)
    const catGroups: Record<string, EquipmentItem[]> = {}
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
              return (
                <div key={catKey}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: cc.color_bg, color: cc.color_fg, fontWeight: '500', textTransform: 'capitalize' }}>
                      {cc.label || catKey}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-4)' }}>{group.length} item{group.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '10px 1.25rem', borderBottom: '1px solid var(--line-inner)', fontSize: '12px', color: 'var(--text-3)', fontWeight: '500' }}>
                      <span>Name</span><span>Category</span><span>Serial no.</span><span>Status</span>
                    </div>
                    {group.map((item, i) => {
                      const sc = STATUS_COLORS[item.status ?? ''] ?? STATUS_COLORS.available
                      return (
                        <EquipmentCard key={item.equipment_id} item={item} catStyle={{ bg: cc.color_bg, color: cc.color_fg }} statusStyle={sc} isLast={i === group.length - 1} />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── All view (default) ───────────────────────────────────────────
  let query = context.admin
    .from('equipment')
    .select('equipment_id, name, category, serial_number, status, notes, assigned_to', { count: 'exact' })
    .eq('studio_id', context.studioId)

  if (q)        query = query.ilike('name', `%${q}%`)
  if (category) query = query.eq('category', category)
  if (status)   query = query.eq('status', status)

  const { data: equipmentRaw, count } = await query
    .order('category', { ascending: true })
    .order('name',     { ascending: true })
    .range(from, to)
  const equipment = (equipmentRaw ?? []) as unknown as EquipmentItem[]

  const listTotal  = count ?? 0
  const totalPages = Math.ceil(listTotal / PAGE_SIZE)
  const prevUrl    = pageNum > 1          ? pageUrl({ view: 'all', q, category, status }, pageNum - 1) : undefined
  const nextUrl    = pageNum < totalPages ? pageUrl({ view: 'all', q, category, status }, pageNum + 1) : undefined

  return (
    <div>
      {header}
      <StatsStrip items={statsItems} />
      <TabNav active="all" />

      <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
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
      </div>

      <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 1rem' }}>
        {listTotal} item{listTotal !== 1 ? 's' : ''}
      </p>

      {!equipment.length ? (
        <EmptyState
          message={q || category || status ? 'No equipment match your filters' : 'No equipment yet'}
          sub={q || category || status ? 'Try adjusting your search or filters' : 'Add your cameras, lenses, and lighting gear'}
        />
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '10px 1.25rem', borderBottom: '1px solid var(--line-inner)', fontSize: '12px', color: 'var(--text-3)', fontWeight: '500' }}>
            <span>Name</span><span>Category</span><span>Serial no.</span><span>Status</span>
          </div>
          {equipment.map((item, i) => {
            const catCfg = getEquipmentCategoryConfig(config, item.category)
            const st     = STATUS_COLORS[item.status ?? ''] ?? STATUS_COLORS.available
            return (
              <EquipmentCard
                key={item.equipment_id}
                item={item}
                catStyle={{ bg: catCfg.color_bg, color: catCfg.color_fg }}
                statusStyle={st}
                isLast={i === equipment.length - 1}
              />
            )
          })}
          <Pagination page={pageNum} totalPages={totalPages} prevUrl={prevUrl} nextUrl={nextUrl} />
        </div>
      )}
    </div>
  )
}
