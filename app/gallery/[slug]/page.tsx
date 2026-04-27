import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import GalleryViewer from './gallery-viewer'

type PublicGalleryBooking = {
  booking_id: string
  session_date?: string | null
  outfits_count?: number | null
  selections_count?: number | null
  status?: string | null
  clients?: { full_name?: string | null; phone?: string | null } | null
  packages?: { name?: string | null } | null
}

export default async function PublicGalleryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const admin = createAdminClient()

  const { data: gallery } = await admin
    .from('galleries')
    .select(`
      *,
      bookings (
        booking_id, session_date, outfits_count, selections_count, status,
        clients ( full_name, phone ),
        packages ( name )
      )
    `)
    .eq('shared_link', slug)
    .maybeSingle()

  if (!gallery || gallery.status === 'expired') notFound()

  const { data: photos } = await admin
    .from('gallery_photos')
    .select('*')
    .eq('gallery_id', gallery.gallery_id)
    .order('is_favourite', { ascending: false })
    .order('uploaded_at', { ascending: true })

  const booking        = gallery.bookings as unknown as PublicGalleryBooking | null
  type GalleryPhoto = { photo_id: string; file_url: string; thumbnail_url: string; is_favourite: boolean; is_edited: boolean }
  const allPhotos      = (photos ?? []) as unknown as GalleryPhoto[]
  const selectionMode  = booking?.status === 'selecting'
  const outfitsCount   = booking?.outfits_count ?? null
  const baseCount      = outfitsCount != null ? outfitsCount * 2 : null
  const alreadySubmitted = booking?.selections_count != null && booking.selections_count > 0

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, -apple-system, sans-serif; }
      `}</style>

      {/* Header */}
      <div style={{
        background: 'white', borderBottom: '0.5px solid #e5e5e5',
        padding: '1.25rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: '500', margin: '0 0 2px' }}>{gallery.title}</h1>
          <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
            {booking?.clients?.full_name}
            {booking?.packages?.name ? ` · ${booking.packages.name}` : ''}
            {booking?.session_date
              ? ` · ${new Date(booking.session_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}`
              : ''}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '13px', color: '#888', margin: '0 0 2px' }}>{allPhotos.length} photos</p>
          {selectionMode && (
            <p style={{ fontSize: '12px', color: '#378add', margin: 0, fontWeight: '500' }}>
              Selection open
            </p>
          )}
        </div>
      </div>

      {gallery.description && (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1.25rem 2rem 0' }}>
          <p style={{ fontSize: '14px', color: '#666', margin: 0, lineHeight: '1.6' }}>{gallery.description}</p>
        </div>
      )}

      <GalleryViewer
        photos={allPhotos}
        galleryId={gallery.gallery_id}
        selectionMode={selectionMode}
        baseCount={baseCount}
        alreadySubmitted={alreadySubmitted}
        previousCount={booking?.selections_count ?? null}
      />
    </div>
  )
}
