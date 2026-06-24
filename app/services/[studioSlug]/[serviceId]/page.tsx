import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { buildTheme, themeCssVars } from '@/lib/studio-theme'

// ─── Types ───────────────────────────────────────────────────────────────────

type StudioMeta = {
  studio_id: string
  name:      string | null
  slug:      string | null
  logo_url:  string | null
  theme?:    unknown
}

type PublicSection = {
  section_id:    string
  title:         string
  body?:         string | null
  image_url?:    string | null
  video_url?:    string | null
  layout:        string
  display_order: number
}

type PublicService = {
  service_id:      string
  name:            string
  description?:    string | null
  price?:          number | string | null
  duration_mins?:  number | null
  outfits_count?:  number | null
  is_active?:      boolean | null
  service_sections?:   PublicSection[] | null
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
  { params }: { params: Promise<{ studioSlug: string; serviceId: string }> }
): Promise<Metadata> {
  const { studioSlug, serviceId } = await params
  const admin = createAdminClient()
  const [{ data: studioRaw }, { data: svcRaw }] = await Promise.all([
    admin.from('studios').select('name').eq('slug', studioSlug).maybeSingle(),
    admin.from('services').select('name, description').eq('service_id', serviceId).maybeSingle(),
  ])
  const studioName  = (studioRaw as unknown as { name?: string | null } | null)?.name ?? 'Studio'
  const svc         = svcRaw as unknown as { name?: string; description?: string | null } | null
  const title       = svc?.name ? `${svc.name} — ${studioName}` : studioName
  const description = svc?.description || `Book ${svc?.name ?? 'a service'} with ${studioName}.`
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary', title, description },
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PublicServiceDetailPage({
  params,
}: {
  params: Promise<{ studioSlug: string; serviceId: string }>
}) {
  const { studioSlug, serviceId } = await params
  const admin = createAdminClient()

  const [{ data: studioRaw }, { data: svcRaw }] = await Promise.all([
    admin.from('studios').select('studio_id, name, slug, logo_url, theme').eq('slug', studioSlug).maybeSingle(),
    admin
      .from('services')
      .select('service_id, name, description, price, duration_mins, outfits_count, is_active, service_sections(section_id, title, body, image_url, video_url, layout, display_order)')
      .eq('service_id', serviceId)
      .maybeSingle(),
  ])

  const studio = studioRaw as unknown as StudioMeta | null
  if (!studio) notFound()

  const theme   = buildTheme(studio.theme)
  const cssVars = themeCssVars(theme)

  const svc = svcRaw as unknown as PublicService | null
  if (!svc || svc.is_active === false) notFound()

  const sections = [...(svc.service_sections ?? [])].sort((a, b) => a.display_order - b.display_order)
  const price    = Number(svc.price ?? 0)

  const stats = [
    svc.duration_mins != null ? { label: 'Duration', value: `${svc.duration_mins} mins` }  : null,
    svc.outfits_count != null ? { label: 'Outfits',  value: String(svc.outfits_count) }    : null,
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <>
      <style>{`
        :root { ${cssVars} }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body {
          font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
          background: var(--bg);
          color: var(--text-main);
          -webkit-font-smoothing: antialiased;
        }
        a { color: inherit; text-decoration: none; }
        img { display: block; max-width: 100%; }

        /* Nav */
        .nav {
          position: sticky; top: 0; z-index: 100;
          background: var(--nav-bg);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--primary-border);
          padding: 14px 24px;
          display: flex; justify-content: space-between; align-items: center;
        }
        .nav-studio { display: flex; align-items: center; gap: 10px; }
        .nav-logo { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
        .nav-name { font-size: 14px; color: var(--text-muted); }
        .nav-back-arrow { margin-right: 4px; opacity: .6; }
        .nav-book {
          font-size: 13px; font-weight: 600;
          padding: 9px 20px; border-radius: 100px;
          background: var(--primary); color: var(--on-primary);
          letter-spacing: .01em;
          transition: opacity .15s;
        }
        .nav-book:hover { opacity: .85; }

        /* No-cover header */
        .svc-header {
          background: #1a1814;
          padding: 64px 24px 48px;
          text-align: center;
        }
        .svc-header-name {
          font-family: var(--heading-font);
          font-size: clamp(28px, 4vw, 46px);
          font-weight: 400; color: #fff;
          margin-bottom: 24px;
        }
        .svc-header-cta {
          display: inline-block;
          font-size: 14px; font-weight: 600;
          padding: 12px 28px; border-radius: 100px;
          background: var(--primary); color: var(--on-primary);
        }

        /* Content container */
        .container { max-width: 760px; margin: 0 auto; padding: 40px 20px 80px; }

        /* Stats bar */
        .stats-bar {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: var(--radius);
          padding: 24px 28px;
          margin-bottom: 16px;
        }
        .stats-price { font-size: 32px; font-weight: 700; letter-spacing: -.02em; color: var(--text-main); margin-bottom: 4px; }
        .stats-price-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 16px; }
        .stats-grid { display: flex; gap: 32px; flex-wrap: wrap; padding-top: 16px; border-top: 1px solid var(--card-border); }
        .stat-item {}
        .stat-value { font-size: 20px; font-weight: 600; color: var(--text-main); line-height: 1; margin-bottom: 4px; }
        .stat-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: .06em; }
        .stats-desc { font-size: 14px; color: var(--text-muted); line-height: 1.75; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--card-border); }

        /* Content sections */
        .content-section {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: var(--radius);
          overflow: hidden;
          margin-bottom: 16px;
        }
        .content-section.layout-standard {
          display: flex; flex-direction: column;
        }
        .content-section.layout-split_left {
          display: flex; flex-direction: row;
        }
        .content-section.layout-split_right {
          display: flex; flex-direction: row-reverse;
        }
        .content-section.layout-split_left .media-wrap,
        .content-section.layout-split_right .media-wrap {
          width: 50%; aspect-ratio: auto; min-height: 300px; flex-shrink: 0;
        }
        .content-section.layout-split_left .section-body-pad,
        .content-section.layout-split_right .section-body-pad {
          width: 50%; display: flex; flex-direction: column; justify-content: center;
        }
        .content-section.layout-hero {
          position: relative;
          min-height: 400px;
          display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;
          color: white; border: none;
        }
        .content-section.layout-hero .media-wrap {
          position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1; aspect-ratio: auto; background: #000;
        }
        .content-section.layout-hero .media-wrap::after {
          content: ""; position: absolute; inset: 0; background: rgba(0,0,0,0.5); pointer-events: none;
        }
        .content-section.layout-hero .section-body-pad {
          position: relative; z-index: 2; width: 100%; max-width: 600px; margin: 0 auto;
        }
        .content-section.layout-hero .section-title {
          color: white; font-size: 32px;
        }
        .content-section.layout-hero .section-text {
          color: rgba(255,255,255,0.9);
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
          font-family: var(--heading-font);
          font-size: 22px; font-weight: 400; color: var(--text-main);
          margin-bottom: 10px; line-height: 1.3;
        }
        .section-text { font-size: 14px; color: var(--text-muted); line-height: 1.85; white-space: pre-line; }

        /* CTA */
        .cta-block {
          background: var(--primary-dim);
          border: 1px solid var(--primary-border);
          border-radius: var(--radius);
          padding: 48px 32px;
          text-align: center;
          margin-bottom: 20px;
        }
        .cta-title {
          font-family: var(--heading-font);
          font-size: 28px; font-weight: 400; color: var(--text-main);
          margin-bottom: 8px;
        }
        .cta-sub { font-size: 14px; color: var(--text-muted); margin-bottom: 28px; }
        .cta-btn {
          display: inline-block; font-size: 15px; font-weight: 600;
          padding: 15px 36px; border-radius: 100px;
          background: var(--primary); color: var(--on-primary);
          letter-spacing: .01em; transition: opacity .15s;
        }
        .cta-btn:hover { opacity: .85; }

        /* Footer */
        .powered { text-align: center; font-size: 11px; color: #ccc; padding-bottom: 8px; }

        @media (max-width: 600px) {
          .stats-bar { padding: 20px; }
          .section-body-pad { padding: 20px 20px; }
          .cta-block { padding: 36px 20px; }
          .content-section.layout-split_left,
          .content-section.layout-split_right {
            flex-direction: column;
          }
          .content-section.layout-split_left .media-wrap,
          .content-section.layout-split_right .media-wrap {
            width: 100%; aspect-ratio: 16/9; min-height: auto;
          }
          .content-section.layout-split_left .section-body-pad,
          .content-section.layout-split_right .section-body-pad {
            width: 100%;
          }
        }
      `}</style>

      {/* ── Nav ── */}
      <nav className="nav">
        <div className="nav-studio">
          {studio.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={studio.logo_url} alt={studio.name ?? ''} className="nav-logo" />
          )}
          <Link href={`/book/${studioSlug}`} className="nav-name">
            <span className="nav-back-arrow">←</span>{studio.name}
          </Link>
        </div>
        <Link href={`/book/${studioSlug}?service=${serviceId}`} className="nav-book">
          Book now →
        </Link>
      </nav>

      {/* ── Header ── */}
      <div className="svc-header">
        <h1 className="svc-header-name">{svc.name}</h1>
        <Link href={`/book/${studioSlug}?service=${serviceId}`} className="svc-header-cta">
          Book now — ₦{price.toLocaleString()} →
        </Link>
      </div>

      {/* ── Content ── */}
      <div className="container">

        {/* Stats */}
        <div className="stats-bar">
          <p className="stats-price-label">Price</p>
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
          {svc.description && (
            <p className="stats-desc">{svc.description}</p>
          )}
        </div>

        {/* Content sections */}
        {sections.map(sec => {
          const video = parseVideo(sec.video_url)
          const hasMedia = video || sec.image_url
          const hasText  = sec.title || sec.body
          const layoutClass = `layout-${sec.layout || 'standard'}`
          
          return (
            <div key={sec.section_id} className={`content-section ${layoutClass}`}>
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

        {/* CTA */}
        <div className="cta-block">
          <p className="cta-title">Ready to book?</p>
          <p className="cta-sub">Fill in a short form and {studio.name} will be in touch.</p>
          <Link href={`/book/${studioSlug}?service=${serviceId}`} className="cta-btn">
            Book {svc.name} →
          </Link>
        </div>

        <p className="powered">Powered by Weave</p>
      </div>
    </>
  )
}
