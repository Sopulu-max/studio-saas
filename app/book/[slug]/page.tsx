import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { buildStudioConfig } from '@/lib/studio-config'
import BookingForm from './booking-form'
import type { Metadata } from 'next'

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const admin = createAdminClient()
  const { data: studio } = await admin
    .from('studios')
    .select('name')
    .eq('slug', slug)
    .maybeSingle()
  return { title: studio ? `Book a session — ${studio.name}` : 'Book a session' }
}

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const admin = createAdminClient()

  const { data: studio } = await admin
    .from('studios')
    .select('studio_id, name, email, slug, session_types, service_types, logo_url')
    .eq('slug', slug)
    .maybeSingle()

  if (!studio) notFound()

  const config = buildStudioConfig(studio.session_types, null, studio.service_types)

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, -apple-system, sans-serif; background: #f7f7f5; color: #111; }
        input, select, textarea, button {
          font-family: inherit; font-size: 14px;
          border: 0.5px solid #d5d5d5; border-radius: 8px;
          padding: 9px 12px; outline: none; color: #111;
          background: white;
          transition: border-color .15s;
        }
        button { display: block; white-space: normal; text-align: center; }
        input:focus, select:focus, textarea:focus { border-color: #111; }
        input::placeholder, textarea::placeholder { color: #bbb; }
      `}</style>

      <div style={{ minHeight: '100vh', padding: '40px 16px 80px' }}>
        <div style={{ maxWidth: '520px', margin: '0 auto' }}>

          {/* Studio header */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            {studio.logo_url && (
              <img src={studio.logo_url} alt={studio.name}
                style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', marginBottom: '12px' }} />
            )}
            <p style={{ fontSize: '13px', color: '#aaa', marginBottom: '6px', letterSpacing: '.04em', textTransform: 'uppercase' }}>
              Photography Studio
            </p>
            <h1 style={{ fontSize: '26px', fontWeight: '700', letterSpacing: '-.02em', marginBottom: '6px' }}>
              {studio.name}
            </h1>
            <p style={{ fontSize: '14px', color: '#888' }}>Book a session</p>
          </div>

          {/* Card */}
          <div style={{ background: 'white', border: '0.5px solid #e5e5e5', borderRadius: '16px', padding: '28px' }}>
            <BookingForm
              studioId={studio.studio_id}
              studioName={studio.name}
              sessionTypes={config.sessionTypes.map(t => ({ value: t.value, label: t.label }))}
              serviceTypes={config.serviceTypes.map(t => ({ value: t.value, label: t.label }))}
            />
          </div>

          <p style={{ textAlign: 'center', fontSize: '12px', color: '#ccc', marginTop: '28px' }}>
            Powered by Weave
          </p>
        </div>
      </div>
    </>
  )
}
