import { fetchStorefront, fetchBookingCatalog } from '@/lib/domains/public/services'
import { PublicServiceDTO } from '@/lib/domains/public/types'
import { notFound } from 'next/navigation'
import { buildStudioConfig } from '@/lib/studio-config'
import type { StudioRow } from '@/lib/studio'
import BookingForm, { type PublicPackage } from './booking-form'
import Link from 'next/link'
import type { Metadata } from 'next'
import { buildTheme, themeCssVars } from '@/lib/studio-theme'

export async function generateMetadata(
  { params }: { params: Promise<{ studioSlug: string }> }
): Promise<Metadata> {
  const { studioSlug } = await params
  const studio = await fetchStorefront(studioSlug)
  const name = studio?.name ?? 'Studio'
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
}

export type PackageLinkedService = {
  service_id:   string
  name:         string
  type:         string
  description?: string | null
  price?:       number | null
  category_value?: string | null
  session_type?: string | null
  outfits_count?: number | null
  duration_mins?: number | null
  booking_fields?: any[]
  is_addon:     boolean
  addon_price?: number | null
}

export default async function PublicBookingPage({
  params,
  searchParams,
}: {
  params:       Promise<{ studioSlug: string }>
  searchParams: Promise<{ package?: string }>
}) {
  const [{ studioSlug }, search] = await Promise.all([params, searchParams])
  const initialPackageId = search.package

  const catalog = await fetchBookingCatalog(studioSlug)
  if (!catalog) notFound()

  const studio = catalog.studio as unknown as StudioRow
  const config   = buildStudioConfig(studio.session_types, studio.booking_statuses, studio.service_types)
  const theme    = buildTheme(studio.theme)
  const cssVars  = themeCssVars(theme)

  const catalogServices = catalog.services as unknown as PublicServiceDTO[]
  const publicPackages = catalog.packages as unknown as PublicPackage[]

  return (
    <>
      <style>{`
        :root { ${cssVars} }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body {
          font-family: system-ui, -apple-system, sans-serif;
          background: var(--bg);
          color: var(--text-main);
          -webkit-font-smoothing: antialiased;
        }
        a { color: inherit; text-decoration: none; }
        input, select, textarea, button {
          font-family: inherit;
          font-size: 14px;
          border: 1px solid var(--card-border);
          border-radius: var(--radius-sm);
          padding: 10px 13px;
          outline: none;
          color: var(--text-main);
          background: var(--card-bg);
          transition: border-color .15s, box-shadow .15s;
        }
        button { display: block; white-space: normal; text-align: center; }
        input:focus, select:focus, textarea:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-dim);
        }
        input::placeholder, textarea::placeholder { color: var(--text-faint); }
        select option { background: var(--card-bg); }
      `}</style>

      <div style={{ minHeight: '100vh', paddingBottom: '80px' }}>

        {/* Sticky nav */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: 'var(--nav-bg)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--primary-border)',
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
          <Link href={`/${studioSlug}#packages`} style={{
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
            <p style={{ fontSize: '11px', color: 'var(--primary)', letterSpacing: '.12em', textTransform: 'uppercase', fontWeight: '600', marginBottom: '10px' }}>
              Book a session
            </p>
            <h1 style={{
              fontFamily: 'var(--heading-font)',
              fontSize: '28px', fontWeight: '400', letterSpacing: '-.01em',
              lineHeight: '1.2', color: 'var(--text-main)', marginBottom: '16px',
            }}>
              {studio.name}
            </h1>
            {/* Rule */}
            <div style={{
              width: '40px', height: '1px', margin: '0 auto',
              background: 'var(--rule)',
            }} />
          </div>

          {/* Form card */}
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: 'var(--radius)',
            padding: '28px 28px 32px',
            boxShadow: '0 2px 20px rgba(0,0,0,.04)',
          }}>
            <BookingForm
              studioId={studio.studio_id}
              studioName={studio.name ?? ''}
              sessionTypes={config.sessionTypes.map(t => ({ value: t.value, label: t.label, is_event: t.is_event }))}

              catalogServices={catalogServices}
              publicPackages={publicPackages}
              initialPackageId={initialPackageId}
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
