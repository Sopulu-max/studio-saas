import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { buildTheme, themeCssVars } from '@/lib/studio-theme'

// ─── Types ──────────────────────────────────────────────────────────────────

type StudioMeta = {
  studio_id: string
  name:      string | null
  slug:      string | null
  logo_url:  string | null
  theme?:    unknown
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

  const { data: studioRaw } = await admin
    .from('studios')
    .select('studio_id, name, slug, logo_url, theme')
    .eq('slug', studioSlug)
    .maybeSingle()
  const studio = studioRaw as unknown as StudioMeta | null
  if (!studio) notFound()

  const theme   = buildTheme(studio.theme)
  const cssVars = themeCssVars(theme)

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

        .pkg-card {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: var(--radius);
          overflow: hidden;
          display: block;
          transition: transform .2s ease, box-shadow .2s ease;
        }
        .pkg-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 40px rgba(0,0,0,.1);
        }
        .pkg-card:hover .pkg-cta {
          opacity: .85;
        }
        .pkg-cta {
          display: block;
          width: 100%;
          text-align: center;
          padding: 11px 16px;
          border-radius: var(--radius-sm);
          background: var(--primary);
          color: var(--on-primary);
          font-size: 13px;
          font-weight: 600;
          letter-spacing: .03em;
          transition: opacity .2s;
        }

        @media (max-width: 640px) {
          .pkg-grid { grid-template-columns: 1fr !important; }
          .hero-title { font-size: 28px !important; }
        }
      `}</style>

      <div style={{ minHeight: '100vh', paddingBottom: '80px' }}>

        {/* ── Sticky nav ───────────────────────────────────────── */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: 'var(--nav-bg)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--primary-border)',
          padding: '0 1.5rem',
          height: '60px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {studio.logo_url && (
              <img
                src={studio.logo_url}
                alt={studio.name ?? ''}
                style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #e8e3da' }}
              />
            )}
            <span style={{ fontSize: '15px', fontWeight: '600', letterSpacing: '-.01em' }}>{studio.name}</span>
          </div>
          <Link
            href={`/book/${studioSlug}`}
            style={{
              fontSize: '13px', fontWeight: '600', padding: '8px 18px',
              background: 'var(--primary)', color: 'var(--on-primary)', borderRadius: '8px',
              letterSpacing: '.02em',
            }}
          >
            Book a session →
          </Link>
        </header>

        {/* ── Hero ─────────────────────────────────────────────── */}
        <div style={{ maxWidth: '760px', margin: '0 auto', padding: '72px 20px 56px', textAlign: 'center' }}>
          <p style={{
            fontSize: '11px', color: 'var(--primary)', letterSpacing: '.14em',
            textTransform: 'uppercase', fontWeight: '600', marginBottom: '18px',
          }}>
            {studio.name}
          </p>
          <h1 className="hero-title" style={{
            fontFamily: 'var(--heading-font)',
            fontSize: '38px', fontWeight: '400', letterSpacing: '-.02em',
            lineHeight: '1.15', color: 'var(--text-main)', marginBottom: '18px',
          }}>
            Our Packages
          </h1>
          {/* rule */}
          <div style={{
            width: '48px', height: '1px', margin: '0 auto 20px',
            background: 'var(--rule)',
          }} />
          <p style={{
            fontSize: '15px', color: 'var(--text-muted)', maxWidth: '440px',
            margin: '0 auto', lineHeight: '1.7',
          }}>
            Choose a package below to see what&apos;s included, then book your session online.
          </p>
        </div>

        {/* ── Package grid ─────────────────────────────────────── */}
        <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 20px' }}>
          {packages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: '#aaa' }}>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: '17px', color: '#8a8580' }}>
                No packages available yet.
              </p>
            </div>
          ) : (
            <div className="pkg-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '24px',
            }}>
              {packages.map(pkg => (
                <Link
                  key={pkg.package_id}
                  href={`/packages/${studioSlug}/${pkg.package_id}`}
                  className="pkg-card"
                >
                  {/* Cover */}
                  {pkg.cover_url ? (
                    <div style={{ width: '100%', aspectRatio: '4 / 3', overflow: 'hidden' }}>
                      <img
                        src={pkg.cover_url}
                        alt={pkg.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    </div>
                  ) : (
                    <div style={{
                      width: '100%', aspectRatio: '4 / 3',
                      background: 'linear-gradient(135deg, #f0ece4 0%, #e8e3da 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c9a96e" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                  )}

                  {/* Body */}
                  <div style={{ padding: '22px' }}>
                    {/* Category pill */}
                    {pkg.shoot_type && (
                      <p style={{
                        fontSize: '10px', color: 'var(--primary)', fontWeight: '600',
                        letterSpacing: '.1em', textTransform: 'uppercase',
                        marginBottom: '8px',
                      }}>
                        {pkg.shoot_type}
                      </p>
                    )}

                    <h2 style={{
                      fontFamily: 'var(--heading-font)',
                      fontSize: '20px', fontWeight: '400', lineHeight: '1.25',
                      color: 'var(--text-main)', marginBottom: '8px',
                    }}>
                      {pkg.name}
                    </h2>

                    {(pkg.tagline || pkg.description) && (
                      <p style={{
                        fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6',
                        marginBottom: '18px',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical' as const,
                      }}>
                        {pkg.tagline || pkg.description}
                      </p>
                    )}

                    {/* Stats */}
                    <div style={{
                      display: 'flex', gap: '20px', flexWrap: 'wrap',
                      paddingBottom: '18px', marginBottom: '18px',
                      borderBottom: '1px solid var(--card-border)',
                    }}>
                      <div>
                        <p style={{ fontSize: '10px', color: 'var(--text-faint)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Price</p>
                        <p style={{ fontSize: '19px', fontWeight: '700', color: 'var(--text-main)', letterSpacing: '-.01em' }}>
                          ₦{Number(pkg.base_price ?? 0).toLocaleString()}
                        </p>
                      </div>
                      {pkg.duration_mins != null && (
                        <div>
                          <p style={{ fontSize: '10px', color: 'var(--text-faint)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Duration</p>
                          <p style={{ fontSize: '19px', fontWeight: '600', color: 'var(--text-main)' }}>{pkg.duration_mins} mins</p>
                        </div>
                      )}
                      {pkg.outfits_count != null && (
                        <div>
                          <p style={{ fontSize: '10px', color: 'var(--text-faint)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Outfits</p>
                          <p style={{ fontSize: '19px', fontWeight: '600', color: 'var(--text-main)' }}>{pkg.outfits_count}</p>
                        </div>
                      )}
                      {pkg.edited_photos != null && (
                        <div>
                          <p style={{ fontSize: '10px', color: 'var(--text-faint)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Photos</p>
                          <p style={{ fontSize: '19px', fontWeight: '600', color: 'var(--text-main)' }}>{pkg.edited_photos}</p>
                        </div>
                      )}
                    </div>

                    <span className="pkg-cta">View package →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Footer */}
          <p style={{ textAlign: 'center', fontSize: '12px', color: '#c8c4bc', marginTop: '80px', letterSpacing: '.04em' }}>
            Powered by Weave
          </p>
        </div>
      </div>
    </>
  )
}
