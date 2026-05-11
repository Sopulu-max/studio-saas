import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'

// ─── Types ──────────────────────────────────────────────────────────────────

type StudioMeta = {
  studio_id: string
  name:      string | null
  slug:      string | null
  logo_url:  string | null
}

type PublicPackage = {
  package_id:    string
  name:          string
  tagline?:      string | null
  description?:  string | null
  cover_url?:    string | null
  base_price?:   number | string | null
  duration_mins?: number | null
  outfits_count?: number | null
  edited_photos?: number | null
  shoot_type?:   string | null
  display_order: number
}

// ─── SEO ────────────────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ studioSlug: string }> }
): Promise<Metadata> {
  const { studioSlug } = await params
  const admin = createAdminClient()
  const { data } = await admin
    .from('studios')
    .select('name')
    .eq('slug', studioSlug)
    .maybeSingle()
  const name = (data as unknown as { name?: string | null } | null)?.name ?? 'Studio'
  const title       = `Packages — ${name}`
  const description = `Browse photography packages from ${name}. Choose a package and book your session online.`
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter:   { card: 'summary_large_image', title, description },
  }
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function PublicPackageCatalogPage({
  params,
}: {
  params: Promise<{ studioSlug: string }>
}) {
  const { studioSlug } = await params
  const admin = createAdminClient()

  // Fetch studio
  const { data: studioRaw } = await admin
    .from('studios')
    .select('studio_id, name, slug, logo_url')
    .eq('slug', studioSlug)
    .maybeSingle()
  const studio = studioRaw as unknown as StudioMeta | null
  if (!studio) notFound()

  // Fetch public packages ordered by display_order then name
  const { data: packagesRaw } = await admin
    .from('packages')
    .select('package_id, name, tagline, description, cover_url, base_price, duration_mins, outfits_count, edited_photos, shoot_type, display_order')
    .eq('studio_id', studio.studio_id)
    .eq('is_public', true)
    .order('display_order', { ascending: true })
    .order('name',          { ascending: true })

  const packages = (packagesRaw ?? []) as unknown as PublicPackage[]

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, -apple-system, sans-serif; background: #f7f7f5; color: #111; }
        a { color: inherit; text-decoration: none; }
      `}</style>

      <div style={{ minHeight: '100vh', paddingBottom: '80px' }}>

        {/* Header */}
        <div style={{ background: 'white', borderBottom: '0.5px solid #e5e5e5', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 50 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {studio.logo_url && (
              <img src={studio.logo_url} alt={studio.name ?? ''} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '0.5px solid #e5e5e5' }} />
            )}
            <span style={{ fontSize: '15px', fontWeight: '600' }}>{studio.name}</span>
          </div>
          <Link
            href={`/book/${studioSlug}`}
            style={{
              fontSize: '13px', fontWeight: '500', padding: '8px 16px',
              background: '#111', color: 'white', borderRadius: '8px',
            }}
          >
            Book a session →
          </Link>
        </div>

        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 20px 0' }}>

          {/* Hero heading */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <p style={{ fontSize: '13px', color: '#888', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
              {studio.name}
            </p>
            <h1 style={{ fontSize: '32px', fontWeight: '700', letterSpacing: '-.02em', marginBottom: '10px' }}>
              Our packages
            </h1>
            <p style={{ fontSize: '15px', color: '#666', maxWidth: '480px', margin: '0 auto', lineHeight: '1.6' }}>
              Choose a package below to see what&apos;s included, then book your session online.
            </p>
          </div>

          {/* Package grid */}
          {packages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: '#aaa' }}>
              <p style={{ fontSize: '15px' }}>No packages available yet.</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
              gap: '20px',
            }}>
              {packages.map(pkg => (
                <Link
                  key={pkg.package_id}
                  href={`/packages/${studioSlug}/${pkg.package_id}`}
                  style={{
                    background: 'white',
                    border: '0.5px solid #e5e5e5',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    display: 'block',
                    transition: 'box-shadow .15s',
                  }}
                >
                  {/* Cover */}
                  {pkg.cover_url ? (
                    <div style={{ width: '100%', aspectRatio: '16 / 9', overflow: 'hidden' }}>
                      <img
                        src={pkg.cover_url}
                        alt={pkg.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    </div>
                  ) : (
                    <div style={{ width: '100%', aspectRatio: '16 / 9', background: '#f3f3f3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                  )}

                  {/* Body */}
                  <div style={{ padding: '18px' }}>
                    <div style={{ marginBottom: '12px' }}>
                      <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '5px', lineHeight: '1.3' }}>
                        {pkg.name}
                      </h2>
                      {(pkg.tagline || pkg.description) && (
                        <p style={{
                          fontSize: '13px', color: '#666', lineHeight: '1.55',
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}>
                          {pkg.tagline || pkg.description}
                        </p>
                      )}
                    </div>

                    {/* Stats row */}
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
                      <div>
                        <p style={{ fontSize: '11px', color: '#999', marginBottom: '2px' }}>Price</p>
                        <p style={{ fontSize: '17px', fontWeight: '700' }}>
                          ₦{Number(pkg.base_price ?? 0).toLocaleString()}
                        </p>
                      </div>
                      {pkg.duration_mins != null && (
                        <div>
                          <p style={{ fontSize: '11px', color: '#999', marginBottom: '2px' }}>Duration</p>
                          <p style={{ fontSize: '17px', fontWeight: '600' }}>{pkg.duration_mins} mins</p>
                        </div>
                      )}
                      {pkg.outfits_count != null && (
                        <div>
                          <p style={{ fontSize: '11px', color: '#999', marginBottom: '2px' }}>Outfits</p>
                          <p style={{ fontSize: '17px', fontWeight: '600' }}>{pkg.outfits_count}</p>
                        </div>
                      )}
                      {pkg.edited_photos != null && (
                        <div>
                          <p style={{ fontSize: '11px', color: '#999', marginBottom: '2px' }}>Photos</p>
                          <p style={{ fontSize: '17px', fontWeight: '600' }}>{pkg.edited_photos}</p>
                        </div>
                      )}
                    </div>

                    <div style={{
                      display: 'block', width: '100%', textAlign: 'center',
                      padding: '10px', borderRadius: '8px',
                      background: '#111', color: 'white',
                      fontSize: '13px', fontWeight: '500',
                    }}>
                      View details →
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Footer */}
          <p style={{ textAlign: 'center', fontSize: '12px', color: '#ccc', marginTop: '60px' }}>
            Powered by Weave
          </p>
        </div>
      </div>
    </>
  )
}
