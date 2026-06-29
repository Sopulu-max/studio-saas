import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getStudioContext } from '@/lib/studio'
import GalleryUploader from './gallery-uploader'

import { getGalleryDetail } from '@/lib/domains/galleries/repository'

export default async function GalleryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const gallery = await getGalleryDetail(context.admin, context.studioId, id)

  if (!gallery) redirect('/dashboard/galleries')

  const photos = gallery.photos
  const session = gallery.session

  const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
    processing: { bg: '#faeeda', color: '#854f0b' },
    ready:      { bg: '#e6f1fb', color: '#185fa5' },
    delivered:  { bg: '#eaf3de', color: '#3b6d11' },
    expired:    { bg: '#f1efe8', color: '#5f5e5a' },
  }
  const s = STATUS_COLORS[gallery.status ?? ''] ?? STATUS_COLORS.processing

  const studio = await context.admin.from('studios').select('slug').eq('studio_id', context.studioId).single()
  const studioSlug = (studio.data?.slug as string) ?? ''

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const clientLink = `${siteUrl}/${studioSlug}/gallery/${gallery.shared_link}`
  const selectionOpen = session?.status === 'selecting'

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>{gallery.title}</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>
            {session?.client?.client_id ? (
              <Link href={`/dashboard/clients/${session.client.client_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                {session.client.full_name}
              </Link>
            ) : session?.client?.full_name}
            {' · '}{photos?.length ?? 0} photo{photos?.length !== 1 ? 's' : ''}
            {session?.booking_id && (
              <> · <Link href={`/dashboard/bookings/${session.booking_id}`} style={{ color: 'var(--link)', textDecoration: 'none' }}>View session →</Link></>
            )}
          </p>
        </div>
        <span style={{ fontSize: '13px', padding: '4px 12px', borderRadius: '20px', background: s.bg, color: s.color, fontWeight: '500' }}>
          {gallery.status}
        </span>
      </div>

      {/* Selection status banner */}
      {selectionOpen && (
        <div style={{ background: '#e8f4fc', border: '0.5px solid #a8d4ee', borderRadius: '10px', padding: '12px 16px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '14px', fontWeight: '500', color: '#1a6a8a', margin: '0 0 2px' }}>
              Selection open — share the client link below
            </p>
            <p style={{ fontSize: '13px', color: '#1a6a8a', margin: 0, opacity: 0.8 }}>
              Client verifies with their phone number, then selects images and submits.
            </p>
          </div>
        </div>
      )}

      {/* Selections received */}
      {session?.selections_count != null && session.selections_count > 0 && (
        <div style={{ background: '#eaf3de', border: '0.5px solid #b5d98a', borderRadius: '10px', padding: '12px 16px', marginBottom: '12px' }}>
          <p style={{ fontSize: '14px', fontWeight: '500', color: '#3b6d11', margin: '0 0 2px' }}>
            ✓ Client selected {session.selections_count} image{session.selections_count !== 1 ? 's' : ''}
          </p>
          {(() => {
            const outfitsCount = session.base_outfits
            if (outfitsCount == null) return null
            return (
              <p style={{ fontSize: '13px', color: '#3b6d11', margin: 0, opacity: 0.8 }}>
                Base: {outfitsCount * 2} images ({outfitsCount} outfit{outfitsCount !== 1 ? 's' : ''} × 2)
                {session.selections_count > outfitsCount * 2
                  ? ` · ${session.selections_count - outfitsCount * 2} extra`
                  : ' · within base'}
              </p>
            )
          })()}
        </div>
      )}

      <GalleryUploader
        galleryId={id}
        currentStatus={gallery.status ?? ''}
        photos={photos}
        clientLink={clientLink}
        selectionOpen={selectionOpen}
        galleryTitle={gallery.title ?? ''}
        clientPhone={session?.client?.phone}
      />
    </div>
  )
}
