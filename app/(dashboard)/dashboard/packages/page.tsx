import Link from 'next/link'
import SearchInput from '@/components/search-input'
import FilterSelect from '@/components/filter-select'
import Pagination from '@/components/pagination'
import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'
import { buildPackagesShareLink } from '@/lib/whatsapp-links'

// ─── Types ─────────────────────────────────────────────────────────────────

type PackageAddon = {
  addon_id:     string
  name:         string
  description?: string | null
  price?:       number | string | null
}

type PackageRow = {
  package_id:    string
  name:          string
  description?:  string | null
  tagline?:      string | null
  cover_url?:    string | null
  is_public?:    boolean | null
  shoot_type?:   string | null
  session_type?: string | null
  base_price?:   number | string | null
  inclusions?:   string[] | null
  created_at?:   string | null
  package_addons?: PackageAddon[] | null
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

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

const FALLBACK_PALETTE = [
  { bg: '#eeedfe', color: '#534ab7' },
  { bg: '#fbeaf0', color: '#993556' },
  { bg: '#e6f1fb', color: '#185fa5' },
  { bg: '#faeeda', color: '#854f0b' },
  { bg: '#eaf3de', color: '#3b6d11' },
  { bg: '#fce8f3', color: '#8b2d6e' },
  { bg: '#e8f4fc', color: '#1a6a8a' },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

function shootTypeColor(type: string | null | undefined) {
  if (!type) return KNOWN_COLORS.other
  const key = type.toLowerCase().trim()
  if (KNOWN_COLORS[key]) return KNOWN_COLORS[key]
  const idx = [...type].reduce((s, c) => s + c.charCodeAt(0), 0) % FALLBACK_PALETTE.length
  return FALLBACK_PALETTE[idx]
}

function pageUrl(params: Record<string, string | undefined>, pg: number) {
  const p = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v && k !== 'page') p.set(k, v) })
  p.set('page', String(pg))
  return `/dashboard/packages?${p}`
}

function tabUrl(view: string) {
  return `/dashboard/packages?view=${view}`
}

// ─── Component helpers ──────────────────────────────────────────────────────

function TabNav({ active }: { active: string }) {
  const tabs = [
    { key: 'all',      label: 'All' },
    { key: 'by-usage', label: 'By usage' },
    { key: 'add-ons',  label: 'Add-ons' },
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

function StatsStrip({ items }: { items: { label: string; value: string | number }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: '12px', marginBottom: '1.5rem' }}>
      {items.map(item => (
        <div key={item.label} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.1rem 1.25rem' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '0 0 6px', fontWeight: '500' }}>{item.label}</p>
          <p style={{ fontSize: '26px', fontWeight: '500', margin: 0, lineHeight: 1.1 }}>{item.value}</p>
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

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string; shoot_type?: string; page?: string }>
}) {
  const { view = 'all', q = '', shoot_type = '', page = '1' } = await searchParams
  const pageNum = Math.max(1, parseInt(page) || 1)
  const from    = (pageNum - 1) * PAGE_SIZE
  const to      = from + PAGE_SIZE - 1

  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  // ── Stats (always) ───────────────────────────────────────────────
  const now        = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const [
    { data: allPackagesRaw },
    { count: usedThisMonth },
    { data: studioSlugRow },
  ] = await Promise.all([
    context.admin.from('packages')
      .select('package_id, base_price, package_addons(addon_id)')
      .eq('studio_id', context.studioId),
    context.admin.from('bookings')
      .select('package_id', { count: 'exact', head: true })
      .eq('studio_id', context.studioId)
      .not('package_id', 'is', null)
      .gte('session_date', monthStart),
    context.admin.from('studios')
      .select('slug, name')
      .eq('studio_id', context.studioId)
      .maybeSingle(),
  ])
  const studioSlug = (studioSlugRow as unknown as { slug?: string | null; name?: string | null } | null)?.slug ?? null
  const studioName = (studioSlugRow as unknown as { slug?: string | null; name?: string | null } | null)?.name ?? 'Studio'

  type MinPackage = { package_id: string; base_price?: number | string | null; package_addons?: { addon_id: string }[] | null }
  const allPackages = (allPackagesRaw ?? []) as unknown as MinPackage[]

  const totalPackages = allPackages.length
  const totalAddons   = allPackages.reduce((s, p) => s + (p.package_addons?.length ?? 0), 0)
  const avgPrice      = totalPackages > 0
    ? Math.round(allPackages.reduce((s, p) => s + Number(p.base_price ?? 0), 0) / totalPackages)
    : 0

  const statsItems = [
    { label: 'Total packages',   value: totalPackages },
    { label: 'Avg price',        value: `₦${avgPrice.toLocaleString()}` },
    { label: 'Total add-ons',    value: totalAddons },
    { label: 'Used this month',  value: usedThisMonth ?? 0 },
  ]

  // ── Header ───────────────────────────────────────────────────────
  const header = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>Packages & Offerings</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>
          Curate and design your studio's offerings and packages.
        </p>
        {studioSlug && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px' }}>
            <Link href={`/packages/${studioSlug}`} target="_blank" style={{ fontSize: '12px', color: 'var(--text-3)', textDecoration: 'none' }}>
              View public catalog ↗
            </Link>
            <a href={buildPackagesShareLink(studioName, studioSlug)} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#25D366', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 0C5.385 0 0 5.385 0 12.031C0 14.673 1.05 17.202 2.87 19.166L1.134 23.366L5.438 21.63C7.355 23.303 9.773 24 12.031 24C18.677 24 24 18.615 24 11.969C24 5.323 18.677 0 12.031 0ZM18.57 16.711C18.293 17.487 16.892 18.172 16.208 18.256C15.655 18.339 14.898 18.423 11.83 17.151C8.077 15.589 5.666 11.758 5.485 11.517C5.304 11.276 4 9.539 4 7.747C4 5.955 4.908 5.086 5.274 4.721C5.551 4.444 5.986 4.316 6.388 4.316C6.516 4.316 6.634 4.321 6.743 4.326C7.02 4.341 7.159 4.356 7.34 4.789C7.568 5.339 8.125 6.702 8.192 6.841C8.258 6.98 8.35 7.16 8.258 7.34C8.167 7.52 8.106 7.595 7.97 7.747C7.835 7.899 7.7 8.084 7.564 8.192C7.429 8.3 7.279 8.423 7.444 8.708C7.61 8.993 8.183 9.932 9.034 10.688C10.13 11.587 11.018 11.874 11.334 12.008C11.56 12.102 11.846 12.078 12.012 11.898C12.223 11.673 12.479 11.282 12.736 10.891C12.932 10.59 13.174 10.545 13.43 10.635C13.702 10.726 15.134 11.433 15.42 11.568C15.706 11.704 15.897 11.779 15.957 11.884C16.017 11.99 16.017 12.516 15.741 13.292" /></svg>
              Share via WhatsApp
            </a>
          </div>
        )}
      </div>
      <Link href="/dashboard/packages/new" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '14px', background: 'var(--btn)', color: 'var(--btn-fg)', textDecoration: 'none', fontWeight: '500' }}>
        New package
      </Link>
    </div>
  )

  // ── By usage view ────────────────────────────────────────────────
  if (view === 'by-usage') {
    // Fetch all bookings with a package, get count per package_id
    const { data: bookingRefs } = await context.admin
      .from('bookings')
      .select('package_id')
      .eq('studio_id', context.studioId)
      .not('package_id', 'is', null)

    const usageMap: Record<string, number> = {}
    for (const b of (bookingRefs ?? []) as unknown as { package_id: string | null }[]) {
      if (b.package_id) usageMap[b.package_id] = (usageMap[b.package_id] ?? 0) + 1
    }

    // Fetch all packages (full rows) for display
    const { data: pkgsRaw } = await context.admin
      .from('packages')
      .select('package_id, name, shoot_type, base_price, duration_mins, package_addons(addon_id)')
      .eq('studio_id', context.studioId)
      .order('name', { ascending: true })

    const pkgs = (pkgsRaw ?? []) as unknown as (PackageRow & { package_addons?: { addon_id: string }[] | null })[]

    // Sort by usage count desc
    const sorted = [...pkgs].sort((a, b) => {
      const ua = usageMap[a.package_id] ?? 0
      const ub = usageMap[b.package_id] ?? 0
      return ub - ua
    })

    return (
      <div>
        {header}
        <StatsStrip items={statsItems} />
        <TabNav active="by-usage" />

        {!sorted.length ? (
          <EmptyState message="No packages yet" sub="Create your first package to start tracking usage" />
        ) : (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '32px 2fr 1fr 1fr 1fr 80px', padding: '10px 1.25rem', borderBottom: '1px solid var(--line-inner)', fontSize: '12px', color: 'var(--text-3)', fontWeight: '500', alignItems: 'center' }}>
              <span>#</span><span>Package</span><span>Category</span><span>Price</span><span>Add-ons</span><span style={{ textAlign: 'right' }}>Bookings</span>
            </div>

            {sorted.map((pkg, i) => {
              const usage = usageMap[pkg.package_id] ?? 0
              const s     = shootTypeColor(pkg.shoot_type)
              return (
                <Link key={pkg.package_id} href={`/dashboard/packages/${pkg.package_id}`} style={{
                  display: 'grid', gridTemplateColumns: '32px 2fr 1fr 1fr 1fr 80px',
                  padding: '0.875rem 1.25rem', textDecoration: 'none', color: 'inherit', alignItems: 'center',
                  borderBottom: i < sorted.length - 1 ? '1px solid var(--line-inner)' : 'none',
                }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-4)' }}>{i + 1}</span>
                  <p style={{ fontSize: '13px', fontWeight: '600', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pkg.name}</p>
                  {pkg.shoot_type ? (
                    <span style={{ display: 'inline-block', width: 'fit-content', fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: s.bg, color: s.color, fontWeight: '500' }}>
                      {pkg.shoot_type}
                    </span>
                  ) : (
                    <span style={{ fontSize: '13px', color: 'var(--text-4)' }}>—</span>
                  )}
                  <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>₦{Number(pkg.base_price ?? 0).toLocaleString()}</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>{pkg.package_addons?.length ?? 0}</p>
                  <p style={{ fontSize: '14px', fontWeight: usage > 0 ? '600' : '400', color: usage > 0 ? 'var(--text)' : 'var(--text-4)', margin: 0, textAlign: 'right' }}>
                    {usage}
                  </p>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── Add-ons view ─────────────────────────────────────────────────
  if (view === 'add-ons') {
    const { data: pkgsRaw } = await context.admin
      .from('packages')
      .select('package_id, name, shoot_type, package_addons(*)')
      .eq('studio_id', context.studioId)
      .order('name', { ascending: true })

    type PkgWithAddons = { package_id: string; name: string; shoot_type?: string | null; package_addons?: PackageAddon[] | null }
    const pkgs    = (pkgsRaw ?? []) as unknown as PkgWithAddons[]
    const addons  = pkgs.flatMap(pkg =>
      (pkg.package_addons ?? []).map(a => ({ ...a, _pkg_name: pkg.name, _pkg_id: pkg.package_id, _shoot_type: pkg.shoot_type }))
    )

    return (
      <div>
        {header}
        <StatsStrip items={statsItems} />
        <TabNav active="add-ons" />

        {!addons.length ? (
          <EmptyState message="No add-ons yet" sub="Add optional extras to your packages from the package detail page" />
        ) : (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', padding: '10px 1.25rem', borderBottom: '1px solid var(--line-inner)', fontSize: '12px', color: 'var(--text-3)', fontWeight: '500' }}>
              <span>Add-on</span><span>Package</span><span style={{ textAlign: 'right' }}>Price</span>
            </div>

            {addons.map((a, i) => {
              const s = shootTypeColor(a._shoot_type)
              return (
                <Link key={a.addon_id} href={`/dashboard/packages/${a._pkg_id}`} style={{
                  display: 'grid', gridTemplateColumns: '2fr 2fr 1fr',
                  padding: '0.875rem 1.25rem', textDecoration: 'none', color: 'inherit', alignItems: 'center',
                  borderBottom: i < addons.length - 1 ? '1px solid var(--line-inner)' : 'none',
                }}>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 2px' }}>{a.name}</p>
                    {a.description && (
                      <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.description}</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a._pkg_name}</p>
                    {a._shoot_type && (
                      <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '20px', background: s.bg, color: s.color, fontWeight: '500', flexShrink: 0 }}>{a._shoot_type}</span>
                    )}
                  </div>
                  <p style={{ fontSize: '13px', fontWeight: '500', margin: 0, textAlign: 'right' }}>
                    {a.price ? `₦${Number(a.price).toLocaleString()}` : '—'}
                  </p>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── All view (default) — card grid preserved ─────────────────────
  const { data: typeRows } = await context.admin
    .from('packages')
    .select('shoot_type')
    .eq('studio_id', context.studioId)
    .not('shoot_type', 'is', null)

  const distinctTypes = [...new Set((typeRows ?? []).map(r => (r as { shoot_type: string }).shoot_type).filter(Boolean))].sort()

  let q2 = context.admin
    .from('packages')
    .select('package_id, name, description, tagline, cover_url, is_public, shoot_type, session_type, base_price, inclusions, created_at, package_addons(*)', { count: 'exact' })
    .eq('studio_id', context.studioId)

  if (q)          q2 = q2.ilike('name', `%${q}%`)
  if (shoot_type) q2 = q2.eq('shoot_type', shoot_type)

  const { data: packages, count } = await q2
    .order('created_at', { ascending: false })
    .range(from, to)

  const listTotal   = count ?? 0
  const totalPages  = Math.ceil(listTotal / PAGE_SIZE)
  const params      = { view: 'all', q, shoot_type }
  const prevUrl     = pageNum > 1          ? pageUrl(params, pageNum - 1) : undefined
  const nextUrl     = pageNum < totalPages ? pageUrl(params, pageNum + 1) : undefined

  return (
    <div>
      {header}
      <StatsStrip items={statsItems} />
      <TabNav active="all" />

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
        <EmptyState
          message={q || shoot_type ? 'No packages match your filters' : 'No packages yet'}
          sub={q || shoot_type ? 'Try adjusting your search or filters' : 'Create your first package to start taking bookings'}
        />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {(packages as unknown as PackageRow[]).map(pkg => {
              const s = shootTypeColor(pkg.shoot_type)
              return (
                <Link key={pkg.package_id} href={`/dashboard/packages/${pkg.package_id}`} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden', display: 'block', textDecoration: 'none', color: 'inherit' }}>
                  {/* Cover image */}
                  {pkg.cover_url ? (
                    <div style={{ width: '100%', aspectRatio: '16 / 9', overflow: 'hidden' }}>
                      <img src={pkg.cover_url} alt={pkg.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </div>
                  ) : (
                    <div style={{ width: '100%', aspectRatio: '16 / 9', background: 'var(--hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                  )}
                  <div style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <p style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>{pkg.name}</p>
                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0, marginLeft: '8px' }}>
                        {pkg.is_public === false && (
                          <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '20px', background: '#f3f3f3', color: '#888', border: '1px solid #e0e0e0', fontWeight: '500' }}>
                            Hidden
                          </span>
                        )}
                        {pkg.shoot_type && (
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: s.bg, color: s.color, fontWeight: '500', whiteSpace: 'nowrap' }}>
                            {pkg.shoot_type}
                          </span>
                        )}
                      </div>
                    </div>
                    {(pkg.tagline || pkg.description) && (
                      <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '0 0 10px', lineHeight: '1.5', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                        {pkg.tagline || pkg.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                      <div>
                        <p style={{ fontSize: '10px', color: 'var(--text-4)', margin: '0 0 1px' }}>Price</p>
                        <p style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>₦{Number(pkg.base_price).toLocaleString()}</p>
                      </div>

                      {(pkg.package_addons?.length ?? 0) > 0 && (
                        <div>
                          <p style={{ fontSize: '10px', color: 'var(--text-4)', margin: '0 0 1px' }}>Add-ons</p>
                          <p style={{ fontSize: '14px', fontWeight: '500', margin: 0 }}>{pkg.package_addons!.length}</p>
                        </div>
                      )}
                    </div>
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
