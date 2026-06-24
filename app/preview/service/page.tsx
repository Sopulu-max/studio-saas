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

export default function ServicePreview() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'UPDATE_PREVIEW' && e.data?.data) {
        setData(e.data.data)
      }
    }
    window.addEventListener('message', handler)
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

  const { svc, studio, theme } = data

  const cssVars = themeCssVars(theme)
  
  const sections        = [...(svc.sections ?? [])].sort((a, b) => a.display_order - b.display_order)
  const firstIsHero     = sections[0]?.layout === 'hero'
  const heroSec         = firstIsHero ? sections[0] : null
  const contentSections = firstIsHero ? sections.slice(1) : sections

  const price = Number(svc.price ?? 0)

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

        /* Footer */
        .powered { text-align: center; font-size: 11px; color: var(--text-muted); padding-bottom: 24px; opacity: .7; }

        @media (max-width: 600px) {
          .pkg-header { padding: 48px 20px 32px; }
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
        <div className="content-section layout-hero" style={{ margin: 0, borderRadius: 0, minHeight: '50vh' }}>
          <div className="media-wrap" style={{ background: '#0f0d0a' }}>
            {(() => {
              const video = parseVideo(heroSec.video_url)
              if (video?.type === 'iframe') return <iframe src={video.src} allowFullScreen title="Video" style={{ width: '100%', height: '100%', border: 'none' }} />
              if (video?.type === 'video')  return <video src={video.src} poster={heroSec.image_url ?? undefined} autoPlay muted loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              if (heroSec.image_url)        return <img src={heroSec.image_url} alt={heroSec.title || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              return null
            })()}
          </div>
          <div className="hero-overlay" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,13,10,.9) 0%, rgba(15,13,10,.3) 60%, transparent 100%)' }} />
          <div className="section-body-pad" style={{ zIndex: 2 }}>
            <h1 className="section-title" style={{ fontSize: 'clamp(32px, 5vw, 52px)', marginBottom: '12px' }}>{heroSec.title || svc.name || 'Untitled Service'}</h1>
            {heroSec.body && <p className="section-text" style={{ fontSize: '16px', marginBottom: '28px' }}>{heroSec.body}</p>}
            <p style={{ fontSize: '28px', fontWeight: 700, marginBottom: '28px' }}>₦{price.toLocaleString()}</p>
            <span style={{
              display: 'inline-block', fontSize: '15px', fontWeight: 600, padding: '14px 32px', borderRadius: '100px', background: 'var(--primary)', color: 'var(--on-primary)'
            }}>
              Book this service →
            </span>
          </div>
        </div>
      ) : (
        <div className="svc-header">
          <h1 className="svc-header-name">{svc.name || 'Untitled Service'}</h1>
          <span className="svc-header-cta">
            Book now — ₦{price.toLocaleString()} →
          </span>
        </div>
      )}

      {/* ── Content ── */}
      <div className="container">
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
      </div>
      <div className="powered">Powered by Photostudio SaaS</div>
    </>
  )
}
