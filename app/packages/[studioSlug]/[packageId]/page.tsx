import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'

// ─── Types ───────────────────────────────────────────────────────────────────

type StudioMeta = {
  studio_id: string
  name:      string | null
  slug:      string | null
  logo_url:  string | null
}

type PublicSection = {
  section_id:    string
  title:         string
  body?:         string | null
  image_url?:    string | null
  video_url?:    string | null
  display_order: number
}

type PublicTypedInclusion = {
  inclusion_id:  string
  label:         string
  type:          'service' | 'product' | 'digital'
  display_order: number
}

type PublicAddon = {
  addon_id:     string
  name:         string
  description?: string | null
  price?:       number | string | null
}

type PublicPkgService = {
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

type PublicPackage = {
  package_id:      string
  name:            string
  tagline?:        string | null
  description?:    string | null
  cover_url?:      string | null
  base_price?:     number | string | null
  duration_mins?:  number | null
  outfits_count?:  number | null
  edited_photos?:  number | null
  coverage_hours?: number | null
  inclusions?:     string[] | null
  is_public?:      boolean | null
  package_sections?:   PublicSection[] | null
  package_inclusions?: PublicTypedInclusion[] | null
  package_addons?:     PublicAddon[] | null
  package_services?:   PublicPkgService[] | null
}

// ─── Video embed helper ───────────────────────────────────────────────────────

function parseVideo(url: string | null | undefined): { type: 'iframe' | 'video'; src: string } | null {
  if (!url?.trim()) return null
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  if (yt) return { type: 'iframe', src: `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1&color=white` }
  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  if (vimeo) return { type: 'iframe', src: `https://player.vimeo.com/video/${vimeo[1]}?byline=0&portrait=0&title=0&dnt=1` }
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)) return { type: 'video', src: url }
  return null
}

// ─── SEO ─────────────────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ studioSlug: string; packageId: string }> }
): Promise<Metadata> {
  const { studioSlug, packageId } = await params
  const admin = createAdminClient()
  const [{ data: studioRaw }, { data: pkgRaw }] = await Promise.all([
    admin.from('studios').select('name').eq('slug', studioSlug).maybeSingle(),
    admin.from('packages').select('name, tagline, description, cover_url').eq('package_id', packageId).maybeSingle(),
  ])
  const studioName  = (studioRaw as unknown as { name?: string | null } | null)?.name ?? 'Studio'
  const pkg         = pkgRaw as unknown as { name?: string; tagline?: string | null; description?: string | null; cover_url?: string | null } | null
  const title       = pkg?.name ? `${pkg.name} — ${studioName}` : studioName
  const description = pkg?.tagline || pkg?.description || `Book the ${pkg?.name ?? 'package'} with ${studioName}.`
  return {
    title,
    description,
    openGraph: {
      title, description, type: 'website',
      ...(pkg?.cover_url ? { images: [{ url: pkg.cover_url }] } : {}),
    },
    twitter: {
      card: 'summary_large_image', title, description,
      ...(pkg?.cover_url ? { images: [pkg.cover_url] } : {}),
    },
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PublicPackageDetailPage({
  params,
}: {
  params: Promise<{ studioSlug: string; packageId: string }>
}) {
  const { studioSlug, packageId } = await params
  const admin = createAdminClient()

  const [{ data: studioRaw }, { data: pkgRaw }] = await Promise.all([
    admin.from('studios').select('studio_id, name, slug, logo_url').eq('slug', studioSlug).maybeSingle(),
    admin
      .from('packages')
      .select('package_id, name, tagline, description, cover_url, base_price, duration_mins, outfits_count, edited_photos, coverage_hours, inclusions, is_public, package_sections(section_id, title, body, image_url, video_url, display_order), package_inclusions(inclusion_id, label, type, display_order), package_addons(addon_id, name, description, price), package_services(service_id, is_addon, addon_price, display_order, services(service_id, name, type, description, price))')
      .eq('package_id', packageId)
      .maybeSingle(),
  ])

  const studio = studioRaw as unknown as StudioMeta | null
  if (!studio) notFound()

  const pkg = pkgRaw as unknown as PublicPackage | null
  if (!pkg || pkg.is_public === false) notFound()

  const sections        = [...(pkg.package_sections   ?? [])].sort((a, b) => a.display_order - b.display_order)
  const typedInclusions = [...(pkg.package_inclusions ?? [])].sort((a, b) => a.display_order - b.display_order)
  const textAddons      = pkg.package_addons ?? []
  const pkgServices     = [...(pkg.package_services ?? [])].sort((a, b) => a.display_order - b.display_order)
  const includedCatalog = pkgServices.filter(s => !s.is_addon && s.services)
  const addonCatalog    = pkgServices.filter(s =>  s.is_addon && s.services)
  const price           = Number(pkg.base_price ?? 0)

  const stats = [
    pkg.duration_mins  != null ? { label: 'Duration',      value: `${pkg.duration_mins} mins` }  : null,
    pkg.outfits_count  != null ? { label: 'Outfits',        value: String(pkg.outfits_count) }    : null,
    pkg.edited_photos  != null ? { label: 'Edited photos',  value: String(pkg.edited_photos) }    : null,
    pkg.coverage_hours != null ? { label: 'Coverage',       value: `${pkg.coverage_hours}h` }     : null,
  ].filter(Boolean) as { label: string; value: string }[]

  const hasInclusions  = (pkg.inclusions ?? []).length > 0 || typedInclusions.length > 0 || includedCatalog.length > 0
  const hasAddons      = textAddons.length > 0 || addonCatalog.length > 0

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body {
          font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
          background: #f5f3ef;
          color: #1a1814;
          -webkit-font-smoothing: antialiased;
        }
        a { color: inherit; text-decoration: none; }
        img { display: block; max-width: 100%; }

        /* Nav */
        .nav {
          position: sticky; top: 0; z-index: 100;
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid #ede9e1;
          padding: 14px 24px;
          display: flex; justify-content: space-between; align-items: center;
        }
        .nav-studio { display: flex; align-items: center; gap: 10px; }
        .nav-logo { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
        .nav-name { font-size: 14px; color: #6b6358; }
        .nav-back-arrow { margin-right: 4px; opacity: .6; }
        .nav-book {
          font-size: 13px; font-weight: 600;
          padding: 9px 20px; border-radius: 100px;
          background: #1a1814; color: #f5f3ef;
          letter-spacing: .01em;
          transition: opacity .15s;
        }
        .nav-book:hover { opacity: .85; }

        /* Hero */
        .hero {
          position: relative;
          width: 100%;
          min-height: 68vh;
          display: flex; flex-direction: column; justify-content: flex-end;
          overflow: hidden;
          background: #1a1814;
        }
        .hero-img {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          object-fit: cover;
          opacity: .75;
        }
        .hero-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(15,13,10,.9) 0%, rgba(15,13,10,.3) 60%, transparent 100%);
        }
        .hero-content {
          position: relative; z-index: 1;
          padding: 56px 32px 48px;
          max-width: 760px; margin: 0 auto; width: 100%;
        }
        .hero-name {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(32px, 5vw, 52px);
          font-weight: 400; line-height: 1.15;
          color: #fff; letter-spacing: -.01em;
          margin-bottom: 12px;
        }
        .hero-tagline { font-size: 16px; color: rgba(255,255,255,.7); line-height: 1.6; margin-bottom: 28px; max-width: 520px; }
        .hero-price { font-size: 28px; font-weight: 700; color: #fff; letter-spacing: -.01em; }
        .hero-cta {
          display: inline-block; margin-top: 28px;
          font-size: 15px; font-weight: 600; letter-spacing: .01em;
          padding: 14px 32px; border-radius: 100px;
          background: #c9a96e; color: #1a1814;
          transition: background .15s;
        }
        .hero-cta:hover { background: #d4ba85; }

        /* No-cover header */
        .pkg-header {
          background: #1a1814;
          padding: 64px 24px 48px;
          text-align: center;
        }
        .pkg-header-name {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(28px, 4vw, 46px);
          font-weight: 400; color: #fff;
          margin-bottom: 10px;
        }
        .pkg-header-tagline { font-size: 16px; color: rgba(255,255,255,.6); margin-bottom: 24px; }
        .pkg-header-cta {
          display: inline-block;
          font-size: 14px; font-weight: 600;
          padding: 12px 28px; border-radius: 100px;
          background: #c9a96e; color: #1a1814;
        }

        /* Content container */
        .container { max-width: 760px; margin: 0 auto; padding: 40px 20px 80px; }

        /* Section label */
        .section-label {
          font-size: 10px; font-weight: 700; letter-spacing: .14em;
          text-transform: uppercase; color: #c9a96e;
          margin-bottom: 16px;
        }

        /* Stats bar */
        .stats-bar {
          background: #fff;
          border: 1px solid #ede9e1;
          border-radius: 16px;
          padding: 24px 28px;
          margin-bottom: 16px;
        }
        .stats-price { font-size: 32px; font-weight: 700; letter-spacing: -.02em; color: #1a1814; margin-bottom: 4px; }
        .stats-price-label { font-size: 11px; color: #9c9187; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 16px; }
        .stats-grid { display: flex; gap: 32px; flex-wrap: wrap; padding-top: 16px; border-top: 1px solid #f0ede8; }
        .stat-item {}
        .stat-value { font-size: 20px; font-weight: 600; color: #1a1814; line-height: 1; margin-bottom: 4px; }
        .stat-label { font-size: 11px; color: #9c9187; text-transform: uppercase; letter-spacing: .06em; }
        .stats-desc { font-size: 14px; color: #6b6358; line-height: 1.75; margin-top: 16px; padding-top: 16px; border-top: 1px solid #f0ede8; }

        /* Inclusions card */
        .card {
          background: #fff;
          border: 1px solid #ede9e1;
          border-radius: 16px;
          padding: 24px 28px;
          margin-bottom: 16px;
        }
        .inclusion-row { display: flex; align-items: flex-start; gap: 12px; padding: 6px 0; }
        .inclusion-check { color: #c9a96e; font-size: 16px; flex-shrink: 0; margin-top: 1px; }
        .inclusion-text { font-size: 14px; color: #2a2520; line-height: 1.55; }

        .type-badge {
          font-size: 11px; padding: 3px 10px; border-radius: 100px;
          font-weight: 600; white-space: nowrap; flex-shrink: 0;
        }
        .deliverable-row { display: flex; align-items: center; gap: 10px; padding: 7px 0; }
        .deliverable-text { font-size: 14px; color: #2a2520; }

        /* Catalog services */
        .service-row {
          display: flex; justify-content: space-between; align-items: center;
          gap: 12px; padding: 12px 0;
          border-bottom: 1px solid #f5f2ec;
        }
        .service-row:last-child { border-bottom: none; }
        .service-name { font-size: 14px; font-weight: 500; color: #1a1814; }
        .service-desc { font-size: 12px; color: #9c9187; margin-top: 2px; }
        .service-price { font-size: 14px; font-weight: 600; color: #1a1814; flex-shrink: 0; }
        .service-included { font-size: 13px; font-weight: 600; color: #6a8c4f; flex-shrink: 0; }

        /* Content sections */
        .content-section {
          background: #fff;
          border: 1px solid #ede9e1;
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 16px;
        }
        .media-wrap {
          width: 100%; aspect-ratio: 16/9; overflow: hidden; background: #0f0d0a;
          position: relative;
        }
        .media-wrap img { width: 100%; height: 100%; object-fit: cover; }
        .media-wrap iframe, .media-wrap video {
          width: 100%; height: 100%; border: none; display: block;
        }
        .section-body-pad { padding: 28px 32px; }
        .section-title {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 22px; font-weight: 400; color: #1a1814;
          margin-bottom: 10px; line-height: 1.3;
        }
        .section-text { font-size: 14px; color: #6b6358; line-height: 1.85; white-space: pre-line; }

        /* Add-ons */
        .addon-row {
          display: flex; justify-content: space-between; align-items: center;
          gap: 16px; padding: 14px 0; border-bottom: 1px solid #f5f2ec;
        }
        .addon-row:last-child { border-bottom: none; }
        .addon-name { font-size: 14px; font-weight: 500; }
        .addon-desc { font-size: 12px; color: #9c9187; margin-top: 2px; }
        .addon-price { font-size: 15px; font-weight: 600; color: #1a1814; flex-shrink: 0; }

        /* CTA */
        .cta-block {
          background: #1a1814;
          border-radius: 20px;
          padding: 48px 32px;
          text-align: center;
          margin-bottom: 20px;
        }
        .cta-title {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 28px; font-weight: 400; color: #fff;
          margin-bottom: 8px;
        }
        .cta-sub { font-size: 14px; color: rgba(255,255,255,.5); margin-bottom: 28px; }
        .cta-btn {
          display: inline-block; font-size: 15px; font-weight: 600;
          padding: 15px 36px; border-radius: 100px;
          background: #c9a96e; color: #1a1814;
          letter-spacing: .01em; transition: background .15s;
        }
        .cta-btn:hover { background: #d4ba85; }

        /* Footer link */
        .footer-link { text-align: center; padding: 8px 0 24px; }
        .footer-link a { font-size: 13px; color: #9c9187; }
        .powered { text-align: center; font-size: 11px; color: #ccc; padding-bottom: 8px; }

        @media (max-width: 600px) {
          .hero-content { padding: 40px 20px 40px; }
          .stats-bar, .card { padding: 20px; }
          .section-body-pad { padding: 20px 20px; }
          .cta-block { padding: 36px 20px; }
        }
      `}</style>

      {/* ── Nav ── */}
      <nav className="nav">
        <div className="nav-studio">
          {studio.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={studio.logo_url} alt={studio.name ?? ''} className="nav-logo" />
          )}
          <Link href={`/packages/${studioSlug}`} className="nav-name">
            <span className="nav-back-arrow">←</span>{studio.name}
          </Link>
        </div>
        <Link href={`/book/${studioSlug}?package=${packageId}`} className="nav-book">
          Book now →
        </Link>
      </nav>

      {/* ── Hero ── */}
      {pkg.cover_url ? (
        <div className="hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pkg.cover_url} alt={pkg.name} className="hero-img" />
          <div className="hero-overlay" />
          <div className="hero-content">
            <h1 className="hero-name">{pkg.name}</h1>
            {pkg.tagline && <p className="hero-tagline">{pkg.tagline}</p>}
            <p className="hero-price">₦{price.toLocaleString()}</p>
            <Link href={`/book/${studioSlug}?package=${packageId}`} className="hero-cta">
              Book this package →
            </Link>
          </div>
        </div>
      ) : (
        <div className="pkg-header">
          <h1 className="pkg-header-name">{pkg.name}</h1>
          {pkg.tagline && <p className="pkg-header-tagline">{pkg.tagline}</p>}
          <Link href={`/book/${studioSlug}?package=${packageId}`} className="pkg-header-cta">
            Book now — ₦{price.toLocaleString()} →
          </Link>
        </div>
      )}

      {/* ── Content ── */}
      <div className="container">

        {/* Stats */}
        <div className="stats-bar">
          <p className="stats-price-label">Starting from</p>
          <p className="stats-price">₦{price.toLocaleString()}</p>
          {stats.length > 0 && (
            <div className="stats-grid">
              {stats.map(s => (
                <div className="stat-item" key={s.label}>
                  <p className="stat-value">{s.value}</p>
                  <p className="stat-label">{s.label}</p>
                </div>
              ))}
            </div>
          )}
          {pkg.description && (
            <p className="stats-desc">{pkg.description}</p>
          )}
        </div>

        {/* Inclusions */}
        {hasInclusions && (
          <div className="card">
            <p className="section-label">What&apos;s included</p>

            {(pkg.inclusions ?? []).map((item, i) => (
              <div key={i} className="inclusion-row">
                <span className="inclusion-check">✦</span>
                <span className="inclusion-text">{item}</span>
              </div>
            ))}

            {typedInclusions.length > 0 && (pkg.inclusions ?? []).length > 0 && (
              <div style={{ height: '12px' }} />
            )}

            {typedInclusions.map(inc => {
              const colors = inc.type === 'service'
                ? { bg: '#eeedfe', color: '#534ab7' }
                : inc.type === 'product'
                ? { bg: '#faeeda', color: '#854f0b' }
                : { bg: '#e6f1fb', color: '#185fa5' }
              return (
                <div key={inc.inclusion_id} className="deliverable-row">
                  <span className="type-badge" style={{ background: colors.bg, color: colors.color }}>
                    {inc.type}
                  </span>
                  <span className="deliverable-text">{inc.label}</span>
                </div>
              )
            })}

            {includedCatalog.length > 0 && (
              <div style={{ marginTop: typedInclusions.length > 0 || (pkg.inclusions ?? []).length > 0 ? '16px' : '0', paddingTop: '16px', borderTop: typedInclusions.length > 0 || (pkg.inclusions ?? []).length > 0 ? '1px solid #f5f2ec' : 'none' }}>
                {includedCatalog.map(ps => {
                  const svc = ps.services!
                  const colors = svc.type === 'service'
                    ? { bg: '#eeedfe', color: '#534ab7' }
                    : svc.type === 'product'
                    ? { bg: '#faeeda', color: '#854f0b' }
                    : { bg: '#e6f1fb', color: '#185fa5' }
                  return (
                    <div key={ps.service_id} className="service-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="type-badge" style={{ background: colors.bg, color: colors.color }}>{svc.type}</span>
                        <div>
                          <p className="service-name">{svc.name}</p>
                          {svc.description && <p className="service-desc">{svc.description}</p>}
                        </div>
                      </div>
                      <span className="service-included">Included</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Content sections */}
        {sections.map(sec => {
          const video = parseVideo(sec.video_url)
          const hasMedia = video || sec.image_url
          const hasText  = sec.title || sec.body
          return (
            <div key={sec.section_id} className="content-section">
              {hasMedia && (
                <div className="media-wrap">
                  {video ? (
                    video.type === 'iframe' ? (
                      <iframe
                        src={video.src}
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                        title={sec.title || 'Video'}
                      />
                    ) : (
                      <video
                        src={video.src}
                        poster={sec.image_url ?? undefined}
                        controls
                        playsInline
                      />
                    )
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={sec.image_url!} alt={sec.title || ''} />
                  )}
                </div>
              )}
              {hasText && (
                <div className="section-body-pad">
                  {sec.title && <h2 className="section-title">{sec.title}</h2>}
                  {sec.body  && <p  className="section-text">{sec.body}</p>}
                </div>
              )}
            </div>
          )
        })}

        {/* Add-ons */}
        {hasAddons && (
          <div className="card">
            <p className="section-label">Optional add-ons</p>

            {addonCatalog.map(ps => {
              const svc = ps.services!
              const displayPrice = ps.addon_price ?? svc.price
              const colors = svc.type === 'service'
                ? { bg: '#eeedfe', color: '#534ab7' }
                : svc.type === 'product'
                ? { bg: '#faeeda', color: '#854f0b' }
                : { bg: '#e6f1fb', color: '#185fa5' }
              return (
                <div key={ps.service_id} className="addon-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="type-badge" style={{ background: colors.bg, color: colors.color }}>{svc.type}</span>
                    <div>
                      <p className="addon-name">{svc.name}</p>
                      {svc.description && <p className="addon-desc">{svc.description}</p>}
                    </div>
                  </div>
                  {displayPrice != null && (
                    <span className="addon-price">+ ₦{Number(displayPrice).toLocaleString()}</span>
                  )}
                </div>
              )
            })}

            {textAddons.map(addon => (
              <div key={addon.addon_id} className="addon-row">
                <div>
                  <p className="addon-name">{addon.name}</p>
                  {addon.description && <p className="addon-desc">{addon.description}</p>}
                </div>
                <span className="addon-price">+ ₦{Number(addon.price ?? 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="cta-block">
          <p className="cta-title">Ready to book?</p>
          <p className="cta-sub">Fill in a short form and {studio.name} will be in touch.</p>
          <Link href={`/book/${studioSlug}?package=${packageId}`} className="cta-btn">
            Book this package →
          </Link>
        </div>

        <div className="footer-link">
          <Link href={`/packages/${studioSlug}`}>← Back to all packages</Link>
        </div>
        <p className="powered">Powered by Weave</p>
      </div>
    </>
  )
}
