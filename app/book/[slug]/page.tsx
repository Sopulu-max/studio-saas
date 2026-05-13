import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { buildStudioConfig } from '@/lib/studio-config'
import type { StudioRow } from '@/lib/studio'
import BookingForm from './booking-form'
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

  // Fetch active services + package (with linked services) in parallel
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

  // Split package data from its linked services
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
              <img src={studio.logo_url ?? undefined} alt={studio.name ?? ''}
                style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', marginBottom: '12px' }} />
            )}
            <p style={{ fontSize: '13px', color: '#aaa', marginBottom: '6px', letterSpacing: '.04em', textTransform: 'uppercase' }}>
              Photography Studio
            </p>
            <h1 style={{ fontSize: '26px', fontWeight: '700', letterSpacing: '-.02em', marginBottom: '6px' }}>
              {studio.name}
            </h1>
            <p style={{ fontSize: '14px', color: '#888' }}>
              {preselectedPackage ? 'Book a package' : 'Book a session'}
            </p>
          </div>

          {/* Card */}
          <div style={{ background: 'white', border: '0.5px solid #e5e5e5', borderRadius: '16px', padding: '28px' }}>
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

          <p style={{ textAlign: 'center', fontSize: '12px', color: '#ccc', marginTop: '28px' }}>
            Powered by Weave
          </p>
        </div>
      </div>
    </>
  )
}
