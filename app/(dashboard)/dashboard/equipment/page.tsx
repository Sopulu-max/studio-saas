import Link from 'next/link'
import SearchInput from '@/components/search-input'
import FilterSelect from '@/components/filter-select'
import Pagination from '@/components/pagination'
import EquipmentCard from './equipment-card'
import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'

const PAGE_SIZE = 20

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  camera:    { bg: '#eeedfe', color: '#534ab7' },
  lens:      { bg: '#e6f1fb', color: '#185fa5' },
  lighting:  { bg: '#faeeda', color: '#854f0b' },
  accessory: { bg: '#eaf3de', color: '#3b6d11' },
  other:     { bg: '#f1efe8', color: '#5f5e5a' },
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  available:   { bg: '#eaf3de', color: '#3b6d11' },
  in_use:      { bg: '#e6f1fb', color: '#185fa5' },
  maintenance: { bg: '#faeeda', color: '#854f0b' },
  retired:     { bg: '#fcebeb', color: '#a32d2d' },
}

function pageUrl(base: string, params: Record<string, string | undefined>, page: number) {
  const p = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v && k !== 'page') p.set(k, v) })
  p.set('page', page.toString())
  return `${base}?${p}`
}

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; status?: string; page?: string }>
}) {
  const { q = '', category = '', status = '', page = '1' } = await searchParams
  const pageNum = Math.max(1, parseInt(page) || 1)
  const from = (pageNum - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  // Summary counts (unfiltered)
  const { data: allEquipment } = await context.admin
    .from('equipment')
    .select('status')
    .eq('studio_id', context.studioId)

  const available   = allEquipment?.filter(e => e.status === 'available').length ?? 0
  const inUse       = allEquipment?.filter(e => e.status === 'in_use').length ?? 0
  const maintenance = allEquipment?.filter(e => e.status === 'maintenance').length ?? 0

  let query = context.admin
    .from('equipment')
    .select('*', { count: 'exact' })
    .eq('studio_id', context.studioId)

  if (q) query = query.ilike('name', `%${q}%`)
  if (category) query = query.eq('category', category)
  if (status) query = query.eq('status', status)

  const { data: equipment, count } = await query
    .order('category', { ascending: true })
    .order('name', { ascending: true })
    .range(from, to)

  const total = count ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const params = { q, category, status }
  const prevUrl = pageNum > 1 ? pageUrl('/dashboard/equipment', params, pageNum - 1) : undefined
  const nextUrl = pageNum < totalPages ? pageUrl('/dashboard/equipment', params, pageNum + 1) : undefined

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>Equipment</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>{total} item{total !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/dashboard/equipment/new" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '14px', background: 'var(--btn)', color: 'var(--btn-fg)', textDecoration: 'none', fontWeight: '500' }}>
          Add equipment
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '1.5rem' }}>
        {[
          { label: 'Available',   value: available,   bg: '#eaf3de', color: '#3b6d11' },
          { label: 'In use',      value: inUse,       bg: '#e6f1fb', color: '#185fa5' },
          { label: 'Maintenance', value: maintenance, bg: '#faeeda', color: '#854f0b' },
        ].map(stat => (
          <div key={stat.label} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 6px' }}>{stat.label}</p>
            <p style={{ fontSize: '28px', fontWeight: '500', margin: 0, color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <SearchInput defaultValue={q} placeholder="Search by name..." />
        <FilterSelect
          name="category"
          defaultValue={category}
          placeholder="All categories"
          options={[
            { value: 'camera',    label: 'Camera' },
            { value: 'lens',      label: 'Lens' },
            { value: 'lighting',  label: 'Lighting' },
            { value: 'accessory', label: 'Accessory' },
            { value: 'other',     label: 'Other' },
          ]}
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

      {!equipment?.length ? (
        <div style={{ textAlign: 'center', padding: '4rem', border: '1px dashed var(--line)', borderRadius: '12px', color: 'var(--text-3)' }}>
          <p style={{ fontSize: '15px', margin: '0 0 4px' }}>{q || category || status ? 'No equipment match your filters' : 'No equipment yet'}</p>
          <p style={{ fontSize: '13px', margin: 0 }}>{q || category || status ? 'Try adjusting your search or filters' : 'Add your cameras, lenses, and lighting gear'}</p>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '10px 1.25rem', borderBottom: '1px solid var(--line-inner)', fontSize: '12px', color: 'var(--text-3)', fontWeight: '500' }}>
            <span>Name</span><span>Category</span><span>Serial no.</span><span>Status</span>
          </div>
          {equipment.map((item, i) => {
            const cat = CATEGORY_COLORS[item.category ?? ''] ?? CATEGORY_COLORS.other
            const st  = STATUS_COLORS[item.status ?? '']    ?? STATUS_COLORS.available
            return (
              <EquipmentCard
                key={item.equipment_id}
                item={item}
                catStyle={cat}
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
