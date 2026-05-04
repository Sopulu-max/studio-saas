import Link from 'next/link'
import SearchInput from '@/components/search-input'
import FilterSelect from '@/components/filter-select'
import Pagination from '@/components/pagination'
import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'
import { sessionName } from '@/lib/session-title'

// ─── Types ─────────────────────────────────────────────────────────────────

type GalleryPhotoCount = { count?: number | null }

type GalleryListRow = {
  gallery_id:       string
  title:            string
  status:           string
  cover_photo_url?: string | null
  created_at?:      string | null
  gallery_photos?:  GalleryPhotoCount[] | null
  bookings?: {
    booking_id?:   string | null
    booking_ref?:  number | null
    session_date?: string | null
    session_type?: string | null
    clients?: { full_name?: string | null } | null
  } | null
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  processing: { bg: '#faeeda', color: '#854f0b' },
  ready:      { bg: '#e6f1fb', color: '#185fa5' },
  delivered:  { bg: '#eaf3de', color: '#3b6d11' },
  expired:    { bg: '#f1efe8', color: '#5f5e5a' },
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function pageUrl(params: Record<string, string | undefined>, pg: number) {
  const p = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v && k !== 'page') p.set(k, v) })
  p.set('page', String(pg))
  return `/dashboard/galleries?${p}`
}

function tabUrl(view: string) {
  return `/dashboard/galleries?view=${view}`
}

function sDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Component helpers ──────────────────────────────────────────────────────

function TabNav({ active }: { active: string }) {
  const tabs = [
    { key: 'all',             label: 'All' },
    { key: 'needs-delivery',  label: 'Needs delivery' },
    { key: 'delivered',       label: 'Delivered' },
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

// ─── Gallery card (used in all views) ───────────────────────────────────────

function GalleryCard({ g }: { g: GalleryListRow }) {
  const s          = STATUS_COLORS[g.status] ?? STATUS_COLORS.processing
  const photoCount = g.gallery_photos?.[0]?.count ?? 0
  return (
    <Link href={`/dashboard/galleries/${g.gallery_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ height: '120px', background: 'var(--active)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {g.cover_photo_url
            ? <img src={g.cover_photo_url} alt={g.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>No cover photo</p>
          }
        </div>
        <div style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
            <p style={{ fontSize: '14px', fontWeight: '500', margin: 0 }}>{g.title}</p>
            <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: s.bg, color: s.color, fontWeight: '500', whiteSpace: 'nowrap', marginLeft: '8px' }}>
              {g.status}
            </span>
          </div>
          <p style={{ fontSize: '12px', fontWeight: '600', margin: '0 0 2px', color: 'var(--text-2)' }}>
            {g.bookings?.clients?.full_name ?? '—'}
          </p>
          <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: '0 0 8px', fontFamily: 'monospace', letterSpacing: '0.02em' }}>
            {sessionName(g.bookings?.clients?.full_name, g.bookings?.booking_ref, g.bookings?.booking_id, g.bookings?.session_date)}
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-4)' }}>
            <span>{photoCount} photo{photoCount !== 1 ? 's' : ''}</span>
            <span>{sDate(g.bookings?.session_date)}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function GalleriesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string; status?: string; page?: string }>
}) {
  const { view = 'all', q = '', status = '', page = '1' } = await searchParams
  const pageNum = Math.max(1, parseInt(page) || 1)
  const from    = (pageNum - 1) * PAGE_SIZE
  const to      = from + PAGE_SIZE - 1

  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  // ── Stats (always) ───────────────────────────────────────────────
  const [
    { count: totalGalleries },
    { count: deliveredCount },
    { count: readyCount },
    { count: processingCount },
  ] = await Promise.all([
    context.admin.from('galleries')
      .select('gallery_id, bookings!inner(studio_id)', { count: 'exact', head: true })
      .eq('bookings.studio_id', context.studioId),
    context.admin.from('galleries')
      .select('gallery_id, bookings!inner(studio_id)', { count: 'exact', head: true })
      .eq('bookings.studio_id', context.studioId).eq('status', 'delivered'),
    context.admin.from('galleries')
      .select('gallery_id, bookings!inner(studio_id)', { count: 'exact', head: true })
      .eq('bookings.studio_id', context.studioId).eq('status', 'ready'),
    context.admin.from('galleries')
      .select('gallery_id, bookings!inner(studio_id)', { count: 'exact', head: true })
      .eq('bookings.studio_id', context.studioId).eq('status', 'processing'),
  ])

  const statsItems = [
    { label: 'Total galleries', value: totalGalleries ?? 0 },
    { label: 'Delivered',       value: deliveredCount ?? 0, accent: '#3b6d11' },
    { label: 'Ready',           value: readyCount ?? 0,     accent: '#185fa5' },
    { label: 'Processing',      value: processingCount ?? 0, accent: '#854f0b' },
  ]

  // ── Header ───────────────────────────────────────────────────────
  const header = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
      <h1 style={{ fontSize: '22px', fontWeight: '500', margin: 0 }}>Galleries</h1>
      <Link href="/dashboard/galleries/new" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '14px', background: 'var(--btn)', color: 'var(--btn-fg)', textDecoration: 'none', fontWeight: '500' }}>
        New gallery
      </Link>
    </div>
  )

  // ── Needs delivery view ──────────────────────────────────────────
  if (view === 'needs-delivery') {
    const { data: raw } = await context.admin
      .from('galleries')
      .select('gallery_id, title, status, cover_photo_url, created_at, gallery_photos(count), bookings!inner(booking_id, booking_ref, session_date, session_type, clients(full_name), studio_id)')
      .eq('bookings.studio_id', context.studioId)
      .in('status', ['processing', 'ready'])
      .order('created_at', { ascending: true })
      .limit(200)

    const galleries = (raw ?? []) as unknown as GalleryListRow[]

    return (
      <div>
        {header}
        <StatsStrip items={statsItems} />
        <TabNav active="needs-delivery" />

        {!galleries.length ? (
          <EmptyState message="Nothing pending delivery" sub="All galleries have been delivered to clients" />
        ) : (
          <>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 1rem' }}>
              {galleries.length} gallery{galleries.length !== 1 ? 's' : ''} pending — oldest first
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {galleries.map(g => <GalleryCard key={g.gallery_id} g={g} />)}
            </div>
          </>
        )}
      </div>
    )
  }

  // ── Delivered view ───────────────────────────────────────────────
  if (view === 'delivered') {
    const { data: raw, count: delCount } = await context.admin
      .from('galleries')
      .select('gallery_id, title, status, cover_photo_url, created_at, gallery_photos(count), bookings!inner(booking_id, booking_ref, session_date, session_type, clients(full_name), studio_id)', { count: 'exact' })
      .eq('bookings.studio_id', context.studioId)
      .eq('status', 'delivered')
      .order('created_at', { ascending: false })
      .range(from, to)

    const galleries  = (raw ?? []) as unknown as GalleryListRow[]
    const listTotal  = delCount ?? 0
    const totalPages = Math.ceil(listTotal / PAGE_SIZE)
    const prevUrl    = pageNum > 1          ? pageUrl({ view: 'delivered' }, pageNum - 1) : undefined
    const nextUrl    = pageNum < totalPages ? pageUrl({ view: 'delivered' }, pageNum + 1) : undefined

    return (
      <div>
        {header}
        <StatsStrip items={statsItems} />
        <TabNav active="delivered" />

        <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 1rem' }}>
          {listTotal} gallery{listTotal !== 1 ? 's' : ''} delivered
        </p>

        {!galleries.length ? (
          <EmptyState message="No delivered galleries yet" sub="Delivered galleries will appear here" />
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {galleries.map(g => <GalleryCard key={g.gallery_id} g={g} />)}
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

  // ── All view (default) — card grid preserved ─────────────────────
  let query = context.admin
    .from('galleries')
    .select('gallery_id, title, status, cover_photo_url, created_at, gallery_photos(count), bookings!inner(booking_id, booking_ref, session_date, session_type, clients(full_name), studio_id)', { count: 'exact' })
    .eq('bookings.studio_id', context.studioId)

  if (q)      query = query.ilike('title', `%${q}%`)
  if (status) query = query.eq('status', status)

  const { data: galleriesRaw, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)
  const galleries  = (galleriesRaw ?? []) as unknown as GalleryListRow[]
  const listTotal  = count ?? 0
  const totalPages = Math.ceil(listTotal / PAGE_SIZE)
  const prevUrl    = pageNum > 1          ? pageUrl({ view: 'all', q, status }, pageNum - 1) : undefined
  const nextUrl    = pageNum < totalPages ? pageUrl({ view: 'all', q, status }, pageNum + 1) : undefined

  return (
    <div>
      {header}
      <StatsStrip items={statsItems} />
      <TabNav active="all" />

      <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <SearchInput defaultValue={q} placeholder="Search by title..." />
        <FilterSelect
          name="status"
          defaultValue={status}
          placeholder="All statuses"
          options={[
            { value: 'processing', label: 'Processing' },
            { value: 'ready',      label: 'Ready' },
            { value: 'delivered',  label: 'Delivered' },
            { value: 'expired',    label: 'Expired' },
          ]}
        />
      </div>

      <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 1rem' }}>
        {listTotal} result{listTotal !== 1 ? 's' : ''}
      </p>

      {!galleries.length ? (
        <EmptyState
          message={q || status ? 'No galleries match your filters' : 'No galleries yet'}
          sub={q || status ? 'Try adjusting your search or filters' : 'Create a gallery to deliver photos to your clients'}
        />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {galleries.map(g => <GalleryCard key={g.gallery_id} g={g} />)}
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
