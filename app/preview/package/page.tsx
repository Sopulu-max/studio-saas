'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { themeCssVars } from '@/lib/studio-theme'

function parseVideo(url?: string | null) {
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      const id = u.hostname.includes('youtu.be') ? u.pathname.slice(1) : u.searchParams.get('v')
      return id ? { type: 'iframe', src: `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}` } : null
    }
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').pop()
      return id ? { type: 'iframe', src: `https://player.vimeo.com/video/${id}?background=1&autoplay=1&loop=1&byline=0&title=0` } : null
    }
    if (url.endsWith('.mp4') || url.endsWith('.webm')) return { type: 'video', src: url }
    return null
  } catch { return null }
}

export default function PackagePreview() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'UPDATE_PREVIEW' && e.data?.data) {
        setData(e.data.data)
      }
    }
    window.addEventListener('message', handler)
    // Send ready ping in case parent is waiting
    window.parent?.postMessage({ type: 'PREVIEW_READY' }, '*')
    return () => window.removeEventListener('message', handler)
  }, [])

  if (!data) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: '#666', background: '#fafafa', fontFamily: 'sans-serif' }}>
        Loading preview...
      </div>
    )
  }

  const { pkg, studio, theme } = data

  const cssVars = themeCssVars(theme)
  
  const sections        = [...(pkg.sections ?? [])].sort((a, b) => a.display_order - b.display_order)
  const firstIsHero     = sections[0]?.layout === 'hero'
  const heroSec         = firstIsHero ? sections[0] : null
  const contentSections = firstIsHero ? sections.slice(1) : sections

  const typedInclusions = [...(pkg.typed_inclusions ?? [])].sort((a: any, b: any) => a.display_order - b.display_order)
  const textAddons      = pkg.addons ?? []
  const pkgServices     = [...(pkg.linked_services ?? [])].sort((a: any, b: any) => a.display_order - b.display_order)
  const includedCatalog = pkgServices.filter(s => !s.is_addon)
  const addonCatalog    = pkgServices.filter(s =>  s.is_addon)
  const price           = Number(pkg.base_price ?? 0)

  const stats = [
    pkg.duration_mins  ? { label: 'Duration',      value: `${pkg.duration_mins} mins` }  : null,
    pkg.outfits_count  ? { label: 'Outfits',        value: String(pkg.outfits_count) }    : null,
    pkg.edited_photos  ? { label: 'Edited photos',  value: String(pkg.edited_photos) }    : null,
    pkg.coverage_hours ? { label: 'Coverage',       value: `${pkg.coverage_hours}h` }     : null,
  ].filter(Boolean) as { label: string; value: string }[]

  const hasInclusions  = (pkg.inclusions ?? []).length > 0 || typedInclusions.length > 0 || includedCatalog.length > 0
  const hasAddons      = textAddons.length > 0 || addonCatalog.length > 0

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
          font-family: var(--heading-font);
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
          background: var(--primary); color: var(--on-primary);
          transition: opacity .15s;
        }
        .hero-cta:hover { opacity: .85; }

        /* No-cover header */
        .pkg-header {
          background: #1a1814;
          padding: 64px 24px 48px;
          text-align: center;
        }
        .pkg-header-name {
          font-family: var(--heading-font);
          font-size: clamp(28px, 4vw, 46px);
          font-weight: 400; color: #fff;
          margin-bottom: 10px;
        }
        .pkg-header-tagline { font-size: 16px; color: rgba(255,255,255,.6); margin-bottom: 24px; }
        .pkg-header-cta {
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

        /* Sections */
        .section-label {
          font-size: 12px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase;
          color: var(--text-muted); margin-bottom: 16px;
        }
        .card {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: var(--radius);
          padding: 24px 28px;
          margin-bottom: 16px;
        }

        /* Inclusions */
        .inc-list { display: flex; flex-direction: column; gap: 12px; }
        .inc-item { display: flex; align-items: flex-start; gap: 10px; }
        .inc-icon { flex-shrink: 0; color: var(--primary); margin-top: 2px; }
        .inc-text { font-size: 15px; color: var(--text-main); line-height: 1.5; }

        /* Services */
        .service-list { display: flex; flex-direction: column; gap: 10px; }
        .service-item {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 16px; background: var(--bg); border: 1px solid var(--line);
          border-radius: 8px;
        }
        .service-name { font-size: 14px; font-weight: 500; color: var(--text-main); margin-bottom: 2px; }
        .service-desc { font-size: 13px; color: var(--text-muted); }
        .service-price { font-size: 14px; font-weight: 600; color: var(--text-main); }
        .service-included { font-size: 12px; font-weight: 600; color: var(--primary); background: var(--primary-dim); padding: 4px 10px; border-radius: 20px; }

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

        /* Addons */
        .addon-item { padding: 16px 0; border-bottom: 1px solid var(--line); }
        .addon-item:last-child { border-bottom: none; padding-bottom: 0; }
        .addon-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
        .addon-name { font-size: 15px; font-weight: 600; color: var(--text-main); }
        .addon-price { font-size: 15px; font-weight: 600; color: var(--text-main); }
        .addon-desc { font-size: 14px; color: var(--text-muted); line-height: 1.5; }

        /* Footer */
        .powered { text-align: center; font-size: 11px; color: var(--text-muted); padding-bottom: 24px; opacity: .7; }

        @media (max-width: 600px) {
          .hero-content { padding: 32px 24px; }
          .pkg-header { padding: 48px 20px 32px; }
          .stats-bar { padding: 20px; }
          .card { padding: 24px 20px; }
          .section-body-pad { padding: 20px 20px; }
          
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
          <span className="nav-name">
            <span className="nav-back-arrow">←</span>{studio.name}
          </span>
        </div>
        <span className="nav-book">
          Book now →
        </span>
      </nav>

      {/* ── Header / Hero ── */}
      {heroSec ? (
        <div className="hero">
          <div className="hero-img" style={{ background: '#0f0d0a' }}>
            {(() => {
              const video = parseVideo(heroSec.video_url)
              if (video?.type === 'iframe') return <iframe src={video.src} allowFullScreen title="Video" style={{ width: '100%', height: '100%', border: 'none' }} />
              if (video?.type === 'video')  return <video src={video.src} poster={heroSec.image_url ?? undefined} autoPlay muted loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              if (heroSec.image_url)        return <img src={heroSec.image_url} alt={heroSec.title || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              return null
            })()}
          </div>
          <div className="hero-overlay" />
          <div className="hero-content">
            <h1 className="hero-name">{heroSec.title || pkg.name || 'Untitled Package'}</h1>
            {heroSec.body && <p className="hero-tagline">{heroSec.body}</p>}
            <p className="hero-price">₦{price.toLocaleString()}</p>
            <span className="hero-cta">
              Book this package →
            </span>
          </div>
        </div>
      ) : (
        <div className="pkg-header">
          <h1 className="pkg-header-name">{pkg.name || 'Untitled Package'}</h1>
          <span className="pkg-header-cta">
            Book now — ₦{price.toLocaleString()} →
          </span>
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
        </div>

        {/* Inclusions */}
        {hasInclusions && (
          <div className="card">
            <p className="section-label">What&apos;s included</p>
            
            {(pkg.inclusions ?? []).length > 0 && (
              <div className="inc-list" style={{ marginBottom: (typedInclusions.length > 0 || includedCatalog.length > 0) ? '20px' : '0' }}>
                {pkg.inclusions.map((inc: string, i: number) => (
                  <div className="inc-item" key={i}>
                    <svg className="inc-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    <span className="inc-text">{inc}</span>
                  </div>
                ))}
              </div>
            )}

            {typedInclusions.length > 0 && (
              <div className="inc-list" style={{ marginBottom: includedCatalog.length > 0 ? '20px' : '0' }}>
                {typedInclusions.map((inc: any, i: number) => (
                  <div className="inc-item" key={i}>
                    <svg className="inc-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    <span className="inc-text">{inc.label} <span style={{ opacity: 0.5, fontSize: '13px', marginLeft: '4px' }}>({inc.type})</span></span>
                  </div>
                ))}
              </div>
            )}

            {includedCatalog.length > 0 && (
              <div className="service-list">
                {includedCatalog.map((ps: any) => {
                  const svc = typeof ps.service_id === 'object' ? ps.service_id : { name: 'Linked Service', type: 'service' } // Mocked for preview
                  return (
                    <div className="service-item" key={ps.service_id}>
                      <div>
                        <p className="service-name">{svc.name}</p>
                        <p className="service-desc">{svc.type}</p>
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
        {contentSections.map((sec: any) => {
          const video = parseVideo(sec.video_url)
          const hasMedia = video || sec.image_url
          const hasText  = sec.title || sec.body
          const layoutClass = `layout-${sec.layout || 'standard'}`
          
          return (
            <div key={sec.section_id || sec.id} className={`content-section ${layoutClass}`}>
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

            {addonCatalog.map((ps: any) => {
              const svc = typeof ps.service_id === 'object' ? ps.service_id : { name: 'Linked Service', price: 0 } // Mock
              const displayPrice = ps.addon_price ?? svc.price
              return (
                <div className="addon-item" key={ps.service_id}>
                  <div className="addon-header">
                    <p className="addon-name">{svc.name}</p>
                    <p className="addon-price">+₦{Number(displayPrice).toLocaleString()}</p>
                  </div>
                  {svc.description && <p className="addon-desc">{svc.description}</p>}
                </div>
              )
            })}

            {textAddons.map((add: any, i: number) => (
              <div className="addon-item" key={i}>
                <div className="addon-header">
                  <p className="addon-name">{add.name}</p>
                  <p className="addon-price">+₦{Number(add.price).toLocaleString()}</p>
                </div>
                {add.description && <p className="addon-desc">{add.description}</p>}
              </div>
            ))}
          </div>
        )}

      </div>
      <div className="powered">Powered by Photostudio SaaS</div>
    </>
  )
}
