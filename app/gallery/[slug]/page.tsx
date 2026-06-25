import { fetchPublicGallery } from '@/lib/domains/public/services'
import { notFound } from 'next/navigation'
import GalleryViewer from './gallery-viewer'



export default async function PublicGalleryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const gallery = await fetchPublicGallery(slug)
  if (!gallery) notFound()

  const booking = gallery.booking
  type GalleryPhoto = { photo_id: string; file_url: string; thumbnail_url: string; is_favourite: boolean; is_edited: boolean }
  const allPhotos = gallery.photos as GalleryPhoto[]
  const selectionMode  = booking?.status === 'selecting'
  const outfitsCount   = booking?.custom_answers?.legacy_outfits ? Number(booking.custom_answers.legacy_outfits) : null
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
            {booking?.client_name}
            {booking?.package_name ? ` · ${booking.package_name}` : ''}
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
        studioPhone={booking?.studio_phone ?? null}
        studioName={booking?.studio_name ?? null}
      />
    </div>
  )
}
