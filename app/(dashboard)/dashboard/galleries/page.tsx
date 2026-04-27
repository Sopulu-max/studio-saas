import Link from 'next/link'
import SearchInput from '@/components/search-input'
import FilterSelect from '@/components/filter-select'
import Pagination from '@/components/pagination'
import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'
import { sessionName } from '@/lib/session-title'

type GalleryPhotoCount = { count?: number | null }

type GalleryListRow = {
  gallery_id: string
  title: string
  status: string
  cover_photo_url?: string | null
  gallery_photos?: GalleryPhotoCount[] | null
  bookings?: { booking_id?: string | null; booking_ref?: number | null; session_date?: string | null; session_type?: string | null; clients?: { full_name?: string | null } | null } | null
}

const PAGE_SIZE = 20

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  processing: { bg: '#faeeda', color: '#854f0b' },
  ready:      { bg: '#e6f1fb', color: '#185fa5' },
  delivered:  { bg: '#eaf3de', color: '#3b6d11' },
  expired:    { bg: '#f1efe8', color: '#5f5e5a' },
}

function pageUrl(base: string, params: Record<string, string | undefined>, page: number) {
  const p = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v && k !== 'page') p.set(k, v) })
  p.set('page', page.toString())
  return `${base}?${p}`
}

export default async function GalleriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}) {
  const { q = '', status = '', page = '1' } = await searchParams
  const pageNum = Math.max(1, parseInt(page) || 1)
  const from = (pageNum - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const { count: galleryCount } = await context.admin
    .from('galleries')
    .select('gallery_id, bookings!inner(studio_id)', { count: 'exact', head: true })
    .eq('bookings.studio_id', context.studioId)

  if (!galleryCount) {
    return renderPage([], 0, pageNum, q, status)
  }

  let query = context.admin
    .from('galleries')
    .select('*, gallery_photos(count), bookings!inner(booking_id, booking_ref, session_date, session_type, clients(full_name), studio_id)', { count: 'exact' })
    .eq('bookings.studio_id', context.studioId)

  if (q) query = query.ilike('title', `%${q}%`)
  if (status) query = query.eq('status', status)

  const { data: galleriesRaw, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)
  const galleries = (galleriesRaw ?? []) as unknown as GalleryListRow[]

  return renderPage(galleries, count ?? 0, pageNum, q, status)
}

function renderPage(galleries: GalleryListRow[], total: number, page: number, q: string, status: string) {
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const params = { q, status }
  const prevUrl = page > 1 ? pageUrl('/dashboard/galleries', params, page - 1) : undefined
  const nextUrl = page < totalPages ? pageUrl('/dashboard/galleries', params, page + 1) : undefined

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>Galleries</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>{total} result{total !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/dashboard/galleries/new" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '14px', background: 'var(--btn)', color: 'var(--btn-fg)', textDecoration: 'none', fontWeight: '500' }}>
          New gallery
        </Link>
      </div>

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

      {!galleries.length ? (
        <div style={{ textAlign: 'center', padding: '4rem', border: '1px dashed var(--line)', borderRadius: '12px', color: 'var(--text-3)' }}>
          <p style={{ fontSize: '15px', margin: '0 0 4px' }}>{q || status ? 'No galleries match your filters' : 'No galleries yet'}</p>
          <p style={{ fontSize: '13px', margin: 0 }}>{q || status ? 'Try adjusting your search or filters' : 'Create a gallery to deliver photos to your clients'}</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {galleries.map(gallery => {
              const s = STATUS_COLORS[gallery.status] ?? STATUS_COLORS.processing
              const photoCount = gallery.gallery_photos?.[0]?.count ?? 0
              return (
                <Link key={gallery.gallery_id} href={`/dashboard/galleries/${gallery.gallery_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ height: '120px', background: 'var(--active)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {gallery.cover_photo_url
                        ? <img src={gallery.cover_photo_url} alt={gallery.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>No cover photo</p>
                      }
                    </div>
                    <div style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <p style={{ fontSize: '14px', fontWeight: '500', margin: 0 }}>{gallery.title}</p>
                        <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: s.bg, color: s.color, fontWeight: '500', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                          {gallery.status}
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', fontWeight: '600', margin: '0 0 2px', color: 'var(--text-2)' }}>
                        {gallery.bookings?.clients?.full_name ?? '—'}
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: '0 0 8px', fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                        {sessionName(gallery.bookings?.clients?.full_name, gallery.bookings?.booking_ref, gallery.bookings?.booking_id, gallery.bookings?.session_date)}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-4)' }}>
                        <span>{photoCount} photo{photoCount !== 1 ? 's' : ''}</span>
                        <span>
                          {gallery.bookings?.session_date
                            ? new Date(gallery.bookings.session_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
                            : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
          {totalPages > 1 && (
            <div style={{ marginTop: '1rem' }}>
              <Pagination page={page} totalPages={totalPages} prevUrl={prevUrl} nextUrl={nextUrl} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
