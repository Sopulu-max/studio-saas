import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { buildStudioConfig } from '@/lib/studio-config'
import type { StudioRow } from '@/lib/studio'
import BookingForm from './booking-form'
import Link from 'next/link'
import type { Metadata } from 'next'

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const admin = createAdminClient()
  const { data: studioMeta } = await admin
    .from('studios')
    .select('name')
    .eq('slug', slug)
    .maybeSingle()
  const name = (studioMeta as unknown as { name?: string | null } | null)?.name ?? 'Studio'
  const title = `Book a session — ${name}`
  const description = `Request a photography session with ${name}. Pick your session type and preferred date.`
  return {
    title,
    description,
    icons: { icon: [{ url: '/icon.svg', type: 'image/svg+xml' }] },
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary', title, description },
  }
}

export type PreselectedPackage = {
  package_id:     string
  name:           string
  tagline?:       string | null
  base_price?:    number | null
  session_type?:  string | null
  service_type?:  string | null
  outfits_count?: number | null
  duration_mins?: number | null
}

export type PackageLinkedService = {
  service_id:   string
  name:         string
  type:         string
  description?: string | null
  price?:       number | null
  is_addon:     boolean
  addon_price?: number | null
}

export default async function PublicBookingPage({
  params,
  searchParams,
}: {
  params:       Promise<{ slug: string }>
  searchParams: Promise<{ package?: string }>
}) {
  const [{ slug }, { package: packageParam }] = await Promise.all([params, searchParams])
  const admin = createAdminClient()

  const { data: studioRaw } = await admin
    .from('studios')
    .select('studio_id, name, email, slug, session_types, service_types, booking_statuses, logo_url')
    .eq('slug', slug)
    .maybeSingle()
  const studio = studioRaw as unknown as StudioRow | null
  if (!studio) notFound()

  const config = buildStudioConfig(studio.session_types, studio.booking_statuses, studio.service_types)

  type PublicService = {
    service_id:   string
    name:         string
    type:         string
    description?: string | null
    price?:       number | null
  }

  type RawPkgService = {
    service_id:    string
    is_addon:      boolean
    addon_price:   number | null
    display_order: number
    services: {
      service_id:   string
      name:         string
      type:         string
      description?: string | null
      price?:       number | null
    } | null
  }

  type RawPackage = PreselectedPackage & {
    package_services?: RawPkgService[] | null
  }

  const [{ data: servicesRaw }, { data: pkgRaw }] = await Promise.all([
    admin
      .from('services')
      .select('service_id, name, type, description, price')
      .eq('studio_id', studio.studio_id)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('name',          { ascending: true }),
    packageParam
      ? admin
          .from('packages')
          .select('package_id, name, tagline, base_price, session_type, service_type, outfits_count, duration_mins, package_services(service_id, is_addon, addon_price, display_order, services(service_id, name, type, description, price))')
          .eq('package_id', packageParam)
          .eq('studio_id',  studio.studio_id)
          .eq('is_public',  true)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const catalogServices = (servicesRaw ?? []) as unknown as PublicService[]
  const rawPkg          = pkgRaw as unknown as RawPackage | null

  const preselectedPackage: PreselectedPackage | null = rawPkg
    ? {
        package_id:    rawPkg.package_id,
        name:          rawPkg.name,
        tagline:       rawPkg.tagline,
        base_price:    rawPkg.base_price,
        session_type:  rawPkg.session_type,
        service_type:  rawPkg.service_type,
        outfits_count: rawPkg.outfits_count,
        duration_mins: rawPkg.duration_mins,
      }
    : null

  const packageLinkedServices: PackageLinkedService[] = rawPkg?.package_services
    ? rawPkg.package_services
        .filter(ps => ps.services != null)
        .sort((a, b) => a.display_order - b.display_order)
        .map(ps => ({
          service_id:  ps.services!.service_id,
          name:        ps.services!.name,
          type:        ps.services!.type,
          description: ps.services!.description,
          price:       ps.services!.price,
          is_addon:    ps.is_addon,
          addon_price: ps.addon_price,
        }))
    : []

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body {
          font-family: system-ui, -apple-system, sans-serif;
          background: #f5f3ef;
          color: #1a1a1a;
          -webkit-font-smoothing: antialiased;
        }
        a { color: inherit; text-decoration: none; }
        input, select, textarea, button {
          font-family: inherit;
          font-size: 14px;
          border: 1px solid #ddd8cf;
          border-radius: 10px;
          padding: 10px 13px;
          outline: none;
          color: #1a1a1a;
          background: #fff;
          transition: border-color .15s, box-shadow .15s;
        }
        button { display: block; white-space: normal; text-align: center; }
        input:focus, select:focus, textarea:focus {
          border-color: #c9a96e;
          box-shadow: 0 0 0 3px rgba(201,169,110,.12);
        }
        input::placeholder, textarea::placeholder { color: #c4bdb4; }
        select option { background: #fff; }
      `}</style>

      <div style={{ minHeight: '100vh', paddingBottom: '80px' }}>

        {/* Sticky nav */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: 'rgba(245,243,239,.9)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(201,169,110,.2)',
          padding: '0 1.5rem',
          height: '56px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {studio.logo_url && (
              <img src={studio.logo_url ?? undefined} alt={studio.name ?? ''}
                style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #e8e3da' }} />
            )}
            <span style={{ fontSize: '14px', fontWeight: '600', letterSpacing: '-.01em' }}>{studio.name}</span>
          </div>
          <Link href={`/packages/${slug}`} style={{
            fontSize: '12px', color: '#8a8580', display: 'flex', alignItems: 'center', gap: '4px',
          }}>
            ← View packages
          </Link>
        </header>

        <div style={{ maxWidth: '540px', margin: '0 auto', padding: '48px 16px 0' }}>

          {/* Studio hero */}
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            {studio.logo_url && (
              <img src={studio.logo_url ?? undefined} alt={studio.name ?? ''}
                style={{
                  width: '72px', height: '72px', borderRadius: '50%',
                  objectFit: 'cover', marginBottom: '16px',
                  border: '3px solid #e8e3da',
                  boxShadow: '0 4px 16px rgba(0,0,0,.08)',
                }} />
            )}
            <p style={{ fontSize: '11px', color: '#c9a96e', letterSpacing: '.12em', textTransform: 'uppercase', fontWeight: '600', marginBottom: '10px' }}>
              Book a session
            </p>
            <h1 style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: '28px', fontWeight: '400', letterSpacing: '-.01em',
              lineHeight: '1.2', color: '#1a1a1a', marginBottom: '16px',
            }}>
              {studio.name}
            </h1>
            {/* Gold rule */}
            <div style={{
              width: '40px', height: '1px', margin: '0 auto',
              background: 'linear-gradient(90deg, #c9a96e 0%, #e8d5a3 50%, #c9a96e 100%)',
            }} />
          </div>

          {/* Form card */}
          <div style={{
            background: '#fff',
            border: '1px solid #e8e3da',
            borderRadius: '20px',
            padding: '28px 28px 32px',
            boxShadow: '0 2px 20px rgba(0,0,0,.04)',
          }}>
            <BookingForm
              studioId={studio.studio_id}
              studioName={studio.name ?? ''}
              sessionTypes={config.sessionTypes.map(t => ({ value: t.value, label: t.label }))}
              serviceTypes={config.serviceTypes.map(t => ({
                value:          t.value,
                label:          t.label,
                booking_fields: t.booking_fields ?? [],
              }))}
              catalogServices={catalogServices}
              preselectedPackage={preselectedPackage}
              packageLinkedServices={packageLinkedServices}
            />
          </div>

          <p style={{ textAlign: 'center', fontSize: '12px', color: '#c8c4bc', marginTop: '28px', letterSpacing: '.04em' }}>
            Powered by Weave
          </p>
        </div>
      </div>
    </>
  )
}
