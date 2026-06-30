import { fetchStorefront, fetchBookingCatalog } from '@/lib/domains/public/services'
import { PublicServiceDTO } from '@/lib/domains/public/types'
import { notFound } from 'next/navigation'
import { buildStudioConfig } from '@/lib/studio-config'
import type { StudioRow } from '@/lib/studio'
import BookingForm, { type PublicPackage } from './booking-form'
import Link from 'next/link'
import type { Metadata } from 'next'

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

  const catalogServices = catalog.services as unknown as PublicServiceDTO[]
  const publicPackages = catalog.packages as unknown as PublicPackage[]

  return (
    <div className="w-full min-h-screen pb-32 animate-enter">
      {/* Sticky nav */}
      <header className="sticky top-0 z-50 bg-[var(--background)]/70 backdrop-blur-xl border-b border-[var(--border)] px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {studio.logo_url && (
            <img src={studio.logo_url ?? undefined} alt={studio.name ?? ''}
              className="w-8 h-8 rounded-full object-cover border border-[var(--border)]" />
          )}
          <span className="font-bold text-sm tracking-tight text-[var(--foreground)]">{studio.name}</span>
        </div>
        <Link href={`/${studioSlug}#packages`} className="text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors flex items-center gap-2">
          ← View packages
        </Link>
      </header>

      <div className="max-w-xl mx-auto pt-16 px-6">
        {/* Studio hero */}
        <div className="text-center mb-12">
          {studio.logo_url && (
            <img src={studio.logo_url ?? undefined} alt={studio.name ?? ''}
              className="w-20 h-20 rounded-full object-cover mb-6 border-4 border-[var(--background)] shadow-2xl mx-auto" />
          )}
          <p className="text-[11px] font-bold text-[var(--primary)] uppercase tracking-[0.15em] mb-3">
            Book a session
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] mb-6">
            {studio.name}
          </h1>
          {/* Rule */}
          <div className="w-12 h-1 bg-[var(--primary)]/20 mx-auto rounded-full" />
        </div>

        {/* Form card */}
        <div className="glass-panel p-6 md:p-10 relative group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)]/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-[var(--primary)]/10 transition-colors duration-700 pointer-events-none" />
          
          <div className="relative z-10">
            <BookingForm
              studioId={studio.studio_id}
              studioName={studio.name ?? ''}
              sessionTypes={config.sessionTypes.map(t => ({ value: t.value, label: t.label, is_event: t.is_event }))}
              catalogServices={catalogServices}
              publicPackages={publicPackages}
              initialPackageId={initialPackageId}
            />
          </div>
        </div>

        <p className="text-center text-xs font-medium text-[var(--muted-foreground)] mt-12 tracking-wide opacity-50">
          Powered by Weave
        </p>
      </div>
    </div>
  )
}
