import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GalleryUploader from './gallery-uploader'

export default async function GalleryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: gallery } = await admin
    .from('galleries')
    .select(`*, bookings(booking_id, session_date, status, outfits_count, selections_count, clients(full_name))`)
    .eq('gallery_id', id)
    .single()

  if (!gallery) redirect('/dashboard/galleries')

  const { data: photos } = await admin
    .from('gallery_photos')
    .select('*')
    .eq('gallery_id', id)
    .order('uploaded_at', { ascending: false })

  const booking = gallery.bookings as any

  const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
    processing: { bg: '#faeeda', color: '#854f0b' },
    ready:      { bg: '#e6f1fb', color: '#185fa5' },
    delivered:  { bg: '#eaf3de', color: '#3b6d11' },
    expired:    { bg: '#f1efe8', color: '#5f5e5a' },
  }
  const s = STATUS_COLORS[gallery.status ?? ''] ?? STATUS_COLORS.processing

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const clientLink = `${siteUrl}/gallery/${gallery.shared_link}`
  const selectionOpen = booking?.status === 'selecting'

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>{gallery.title}</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>
            {booking?.clients?.full_name} · {photos?.length ?? 0} photo{photos?.length !== 1 ? 's' : ''}
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
      {booking?.selections_count != null && booking.selections_count > 0 && (
        <div style={{ background: '#eaf3de', border: '0.5px solid #b5d98a', borderRadius: '10px', padding: '12px 16px', marginBottom: '12px' }}>
          <p style={{ fontSize: '14px', fontWeight: '500', color: '#3b6d11', margin: '0 0 2px' }}>
            ✓ Client selected {booking.selections_count} image{booking.selections_count !== 1 ? 's' : ''}
          </p>
          {booking.outfits_count != null && (
            <p style={{ fontSize: '13px', color: '#3b6d11', margin: 0, opacity: 0.8 }}>
              Base: {booking.outfits_count * 2} images ({booking.outfits_count} outfit{booking.outfits_count !== 1 ? 's' : ''} × 2)
              {booking.selections_count > booking.outfits_count * 2
                ? ` · ${booking.selections_count - booking.outfits_count * 2} extra`
                : ' · within base'}
            </p>
          )}
        </div>
      )}

      <GalleryUploader
        galleryId={id}
        currentStatus={gallery.status}
        photos={photos ?? []}
        clientLink={clientLink}
        selectionOpen={selectionOpen}
      />
    </div>
  )
}
