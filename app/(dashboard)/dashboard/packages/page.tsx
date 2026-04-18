import Link from 'next/link'
import SearchInput from '@/components/search-input'
import FilterSelect from '@/components/filter-select'
import Pagination from '@/components/pagination'
import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'

const PAGE_SIZE = 20

// Known category colours
const KNOWN_COLORS: Record<string, { bg: string; color: string }> = {
  portrait:    { bg: '#eeedfe', color: '#534ab7' },
  wedding:     { bg: '#fbeaf0', color: '#993556' },
  corporate:   { bg: '#e6f1fb', color: '#185fa5' },
  event:       { bg: '#faeeda', color: '#854f0b' },
  maternity:   { bg: '#fce8f3', color: '#8b2d6e' },
  fashion:     { bg: '#e8f4fc', color: '#1a6a8a' },
  birthday:    { bg: '#faeeda', color: '#854f0b' },
  graduation:  { bg: '#eaf3de', color: '#3b6d11' },
  engagement:  { bg: '#fbeaf0', color: '#993556' },
  newborn:     { bg: '#eeedfe', color: '#534ab7' },
  boudoir:     { bg: '#fce8f3', color: '#8b2d6e' },
  product:     { bg: '#e6f1fb', color: '#185fa5' },
  lifestyle:   { bg: '#eaf3de', color: '#3b6d11' },
  family:      { bg: '#e8f4fc', color: '#1a6a8a' },
  other:       { bg: '#f1efe8', color: '#5f5e5a' },
}

// Palette for unknown free-text categories — deterministic by first char
const FALLBACK_PALETTE = [
  { bg: '#eeedfe', color: '#534ab7' },
  { bg: '#fbeaf0', color: '#993556' },
  { bg: '#e6f1fb', color: '#185fa5' },
  { bg: '#faeeda', color: '#854f0b' },
  { bg: '#eaf3de', color: '#3b6d11' },
  { bg: '#fce8f3', color: '#8b2d6e' },
  { bg: '#e8f4fc', color: '#1a6a8a' },
]

function shootTypeColor(type: string | null | undefined) {
  if (!type) return KNOWN_COLORS.other
  const key = type.toLowerCase().trim()
  if (KNOWN_COLORS[key]) return KNOWN_COLORS[key]
  // Deterministic fallback based on char code sum
  const idx = [...type].reduce((s, c) => s + c.charCodeAt(0), 0) % FALLBACK_PALETTE.length
  return FALLBACK_PALETTE[idx]
}

function pageUrl(base: string, params: Record<string, string | undefined>, page: number) {
  const p = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v && k !== 'page') p.set(k, v) })
  p.set('page', page.toString())
  return `${base}?${p}`
}

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; shoot_type?: string; page?: string }>
}) {
  const { q = '', shoot_type = '', page = '1' } = await searchParams
  const pageNum = Math.max(1, parseInt(page) || 1)
  const from = (pageNum - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  // Fetch distinct shoot_types for the filter dropdown
  const { data: typeRows } = await context.admin
    .from('packages')
    .select('shoot_type')
    .eq('studio_id', context.studioId)
    .not('shoot_type', 'is', null)

  const distinctTypes = [...new Set((typeRows ?? []).map(r => r.shoot_type as string).filter(Boolean))].sort()

  let query = context.admin
    .from('packages')
    .select('*, package_addons(*)', { count: 'exact' })
    .eq('studio_id', context.studioId)

  if (q)          query = query.ilike('name', `%${q}%`)
  if (shoot_type) query = query.eq('shoot_type', shoot_type)

  const { data: packages, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  const total      = count ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const params     = { q, shoot_type }
  const prevUrl    = pageNum > 1          ? pageUrl('/dashboard/packages', params, pageNum - 1) : undefined
  const nextUrl    = pageNum < totalPages ? pageUrl('/dashboard/packages', params, pageNum + 1) : undefined

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>Packages</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>{total} result{total !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/dashboard/packages/new" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '14px', background: 'var(--btn)', color: 'var(--btn-fg)', textDecoration: 'none', fontWeight: '500' }}>
          New package
        </Link>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <SearchInput defaultValue={q} placeholder="Search packages..." />
        {distinctTypes.length > 0 && (
          <FilterSelect
            name="shoot_type"
            defaultValue={shoot_type}
            placeholder="All categories"
            options={distinctTypes.map(t => ({ value: t, label: t }))}
          />
        )}
      </div>

      {!packages?.length ? (
        <div style={{ textAlign: 'center', padding: '4rem', border: '1px dashed var(--line)', borderRadius: '12px', color: 'var(--text-3)' }}>
          <p style={{ fontSize: '15px', margin: '0 0 4px' }}>{q || shoot_type ? 'No packages match your filters' : 'No packages yet'}</p>
          <p style={{ fontSize: '13px', margin: 0 }}>{q || shoot_type ? 'Try adjusting your search or filters' : 'Create your first package to start taking bookings'}</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {packages.map(pkg => {
              const s = shootTypeColor(pkg.shoot_type)
              return (
                <Link key={pkg.package_id} href={`/dashboard/packages/${pkg.package_id}`} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem', display: 'block', textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <p style={{ fontSize: '15px', fontWeight: '500', margin: 0 }}>{pkg.name}</p>
                    {pkg.shoot_type && (
                      <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: s.bg, color: s.color, fontWeight: '500', whiteSpace: 'nowrap', marginLeft: '8px', flexShrink: 0 }}>
                        {pkg.shoot_type}
                      </span>
                    )}
                  </div>
                  {pkg.description && (
                    <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 12px', lineHeight: '1.5' }}>{pkg.description}</p>
                  )}
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: '0 0 2px' }}>Price</p>
                      <p style={{ fontSize: '15px', fontWeight: '500', margin: 0 }}>₦{Number(pkg.base_price).toLocaleString()}</p>
                    </div>
                    {pkg.outfits_count != null && (
                      <div>
                        <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: '0 0 2px' }}>Outfits</p>
                        <p style={{ fontSize: '15px', fontWeight: '500', margin: 0 }}>{pkg.outfits_count}</p>
                      </div>
                    )}
                    {pkg.edited_photos != null && (
                      <div>
                        <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: '0 0 2px' }}>Photos</p>
                        <p style={{ fontSize: '15px', fontWeight: '500', margin: 0 }}>{pkg.edited_photos}</p>
                      </div>
                    )}
                    <div>
                      <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: '0 0 2px' }}>Duration</p>
                      <p style={{ fontSize: '15px', fontWeight: '500', margin: 0 }}>{pkg.duration_mins} mins</p>
                    </div>
                    {pkg.package_addons?.length > 0 && (
                      <div>
                        <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: '0 0 2px' }}>Add-ons</p>
                        <p style={{ fontSize: '15px', fontWeight: '500', margin: 0 }}>{pkg.package_addons.length}</p>
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
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
