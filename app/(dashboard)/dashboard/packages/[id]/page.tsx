import { redirect } from 'next/navigation'
import Link from 'next/link'
import PackageActions from './package-actions'
import { getStudioContext, fetchStudio } from '@/lib/studio'
import { buildStudioConfig, getSessionTypeConfig, getServiceTypeConfig } from '@/lib/studio-config'

function parseVideo(url: string | null | undefined): { type: 'iframe' | 'video'; src: string } | null {
  if (!url?.trim()) return null
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  if (yt) return { type: 'iframe', src: `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1` }
  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  if (vimeo) return { type: 'iframe', src: `https://player.vimeo.com/video/${vimeo[1]}?byline=0&portrait=0&title=0&dnt=1` }
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)) return { type: 'video', src: url }
  return null
}

import { getPackageDetail } from '@/lib/domains/packages/repository'

const KNOWN_COLORS: Record<string, { bg: string; color: string }> = {
  portrait:   { bg: '#eeedfe', color: '#534ab7' },
  wedding:    { bg: '#fbeaf0', color: '#993556' },
  corporate:  { bg: '#e6f1fb', color: '#185fa5' },
  event:      { bg: '#faeeda', color: '#854f0b' },
  maternity:  { bg: '#fce8f3', color: '#8b2d6e' },
  fashion:    { bg: '#e8f4fc', color: '#1a6a8a' },
  birthday:   { bg: '#faeeda', color: '#854f0b' },
  graduation: { bg: '#eaf3de', color: '#3b6d11' },
  engagement: { bg: '#fbeaf0', color: '#993556' },
  newborn:    { bg: '#eeedfe', color: '#534ab7' },
  boudoir:    { bg: '#fce8f3', color: '#8b2d6e' },
  product:    { bg: '#e6f1fb', color: '#185fa5' },
  lifestyle:  { bg: '#eaf3de', color: '#3b6d11' },
  family:     { bg: '#e8f4fc', color: '#1a6a8a' },
  other:      { bg: '#f1efe8', color: '#5f5e5a' },
}
const FALLBACK_PALETTE = [
  { bg: '#eeedfe', color: '#534ab7' }, { bg: '#fbeaf0', color: '#993556' },
  { bg: '#e6f1fb', color: '#185fa5' }, { bg: '#faeeda', color: '#854f0b' },
  { bg: '#eaf3de', color: '#3b6d11' }, { bg: '#fce8f3', color: '#8b2d6e' },
  { bg: '#e8f4fc', color: '#1a6a8a' },
]

function shootTypeColor(type: string | null | undefined) {
  if (!type) return KNOWN_COLORS.other
  const key = type.toLowerCase().trim()
  if (KNOWN_COLORS[key]) return KNOWN_COLORS[key]
  const idx = [...type].reduce((s, c) => s + c.charCodeAt(0), 0) % FALLBACK_PALETTE.length
  return FALLBACK_PALETTE[idx]
}

const INCLUSION_TYPE_META: Record<string, { label: string; icon: string; bg: string; color: string }> = {
  service: { label: 'Service',  icon: '🎯', bg: '#eeedfe', color: '#534ab7' },
  product: { label: 'Product',  icon: '📦', bg: '#faeeda', color: '#854f0b' },
  digital: { label: 'Digital',  icon: '💻', bg: '#e6f1fb', color: '#185fa5' },
}

export default async function PackageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const pkg = await getPackageDetail(context.admin, context.studioId, id)
  if (!pkg) redirect('/dashboard/packages')

  const pkgServices = pkg.package_services ?? []
  const includedCatalogSvcs = pkgServices.filter(ps => !ps.is_addon)
  const addonCatalogSvcs    = pkgServices.filter(ps => ps.is_addon)

  const sections         = pkg.package_sections
  const typedInclusions  = pkg.package_inclusions

  const s = shootTypeColor(pkg.shoot_type)

  return (
    <div style={{ maxWidth: '640px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>{pkg.name}</h1>
          {pkg.tagline && (
            <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: '0 0 6px', lineHeight: '1.5' }}>{pkg.tagline}</p>
          )}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {pkg.shoot_type && (
              <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: s.bg, color: s.color }}>
                {pkg.shoot_type}
              </span>
            )}
            {pkg.is_public === false && (
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: '#f3f3f3', color: '#888', fontWeight: '500', border: '1px solid #e0e0e0' }}>
                Hidden
              </span>
            )}
          </div>
        </div>
        <Link
          href={`/dashboard/packages/${id}/edit`}
          style={{
            fontSize: '13px', padding: '6px 14px', borderRadius: '8px',
            background: 'transparent', border: '1px solid var(--line)',
            color: 'var(--text-2)', textDecoration: 'none', display: 'inline-block', flexShrink: 0,
          }}
        >
          Edit package
        </Link>
      </div>

      {/* Cover image */}
      {pkg.cover_url && (
        <div style={{ marginBottom: '12px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--line)', aspectRatio: '16 / 9' }}>
          <img
            src={pkg.cover_url}
            alt={pkg.name ?? ''}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}

      {/* Details */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 12px' }}>DETAILS</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Base price</p>
            <p style={{ fontSize: '18px', fontWeight: '500', margin: 0 }}>₦{Number(pkg.base_price).toLocaleString()}</p>
          </div>
          {pkg.coverage_hours != null && (
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Coverage hours</p>
              <p style={{ fontSize: '18px', fontWeight: '500', margin: 0 }}>{pkg.coverage_hours}h</p>
            </div>
          )}
        </div>
        {pkg.description && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--line-inner)' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 4px' }}>Description</p>
            <p style={{ fontSize: '14px', color: 'var(--text-2)', margin: 0, lineHeight: '1.6' }}>{pkg.description}</p>
          </div>
        )}
      </div>

      {/* What's included (text bullets) */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden', marginBottom: '12px' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line-inner)' }}>
          <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: 0 }}>WHAT&apos;S INCLUDED</p>
        </div>
        {!pkg.inclusions?.length ? (
          <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0, padding: '1rem 1.25rem' }}>No inclusions listed</p>
        ) : (
          <div style={{ padding: '1rem 1.25rem' }}>
            {pkg.inclusions.map((item: string, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', padding: '4px 0' }}>
                <span style={{ color: 'var(--text-3)' }}>✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Typed deliverables */}
      {typedInclusions.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden', marginBottom: '12px' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line-inner)' }}>
            <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: 0 }}>DELIVERABLES</p>
          </div>
          <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {typedInclusions.map((inc) => {
              const meta = INCLUSION_TYPE_META[inc.type] ?? INCLUSION_TYPE_META.service
              return (
                <div key={inc.inclusion_id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    fontSize: '11px', padding: '2px 8px', borderRadius: '20px', whiteSpace: 'nowrap',
                    background: meta.bg, color: meta.color, fontWeight: '500', flexShrink: 0,
                  }}>
                    {meta.icon} {meta.label}
                  </span>
                  <span style={{ fontSize: '14px' }}>{inc.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Catalog services */}
      {pkgServices.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden', marginBottom: '12px' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line-inner)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: 0 }}>CATALOG SERVICES</p>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: 0 }}>
              {includedCatalogSvcs.length} included · {addonCatalogSvcs.length} add-on
            </p>
          </div>

          {includedCatalogSvcs.length > 0 && (
            <div>
              <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-3)', padding: '8px 1.25rem 4px', margin: 0, letterSpacing: '.04em' }}>INCLUDED</p>
              {includedCatalogSvcs.map((ps, i) => {
                const svc = ps.services
                const tc  = INCLUSION_TYPE_META[svc?.type ?? 'service'] ?? INCLUSION_TYPE_META.service
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 1.25rem', borderTop: '1px solid var(--line-inner)',
                    justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: tc.bg, color: tc.color, fontWeight: '500', flexShrink: 0 }}>
                        {tc.icon} {svc?.type ?? 'service'}
                      </span>
                      <span style={{ fontSize: '14px' }}>{svc?.name ?? '—'}</span>
                    </div>
                    {svc?.price != null && (
                      <span style={{ fontSize: '13px', color: 'var(--text-3)' }}>
                        ₦{Number(svc.price).toLocaleString()}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {addonCatalogSvcs.length > 0 && (
            <div>
              <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-3)', padding: '8px 1.25rem 4px', margin: 0, letterSpacing: '.04em' }}>OPTIONAL ADD-ONS</p>
              {addonCatalogSvcs.map((ps, i) => {
                const svc = ps.services
                const tc  = INCLUSION_TYPE_META[svc?.type ?? 'service'] ?? INCLUSION_TYPE_META.service
                const displayPrice = ps.addon_price ?? svc?.price
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 1.25rem', borderTop: '1px solid var(--line-inner)',
                    justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: tc.bg, color: tc.color, fontWeight: '500', flexShrink: 0 }}>
                        {tc.icon} {svc?.type ?? 'service'}
                      </span>
                      <span style={{ fontSize: '14px' }}>{svc?.name ?? '—'}</span>
                    </div>
                    {displayPrice != null && (
                      <span style={{ fontSize: '13px', fontWeight: '500' }}>
                        ₦{Number(displayPrice).toLocaleString()}
                        {ps.addon_price != null && ps.addon_price !== svc?.price && (
                          <span style={{ fontSize: '11px', color: 'var(--text-4)', marginLeft: '4px' }}>(override)</span>
                        )}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Add-ons */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden', marginBottom: '12px' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line-inner)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: 0 }}>ADD-ONS</p>
          <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: 0 }}>{pkg.package_addons?.length ?? 0} total</p>
        </div>
        {!pkg.package_addons?.length ? (
          <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0, padding: '1rem 1.25rem' }}>No add-ons for this package</p>
        ) : (
          (pkg.package_addons ?? []).map((addon, i: number) => (
            <div key={addon.addon_id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0.875rem 1.25rem',
              borderBottom: i < (pkg.package_addons?.length ?? 0) - 1 ? '1px solid var(--line-inner)' : 'none',
            }}>
              <div>
                <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 2px' }}>{addon.name}</p>
                {addon.description && (
                  <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>{addon.description}</p>
                )}
              </div>
              <p style={{ fontSize: '14px', fontWeight: '500', margin: 0 }}>₦{Number(addon.price).toLocaleString()}</p>
            </div>
          ))
        )}
      </div>

      {/* Content sections */}
      {sections.length > 0 && sections.map((sec) => {
        const videoInfo = parseVideo(sec.video_url)
        return (
          <div key={sec.section_id} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden', marginBottom: '12px' }}>
            {videoInfo ? (
              <div style={{ width: '100%', aspectRatio: '16 / 9', overflow: 'hidden', background: '#000' }}>
                {videoInfo.type === 'iframe' ? (
                  <iframe
                    src={videoInfo.src}
                    style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={videoInfo.src}
                    poster={sec.image_url ?? undefined}
                    controls
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                )}
              </div>
            ) : sec.image_url ? (
              <div style={{ width: '100%', aspectRatio: '16 / 9', overflow: 'hidden' }}>
                <img src={sec.image_url} alt={sec.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
            ) : null}
            <div style={{ padding: '1.25rem' }}>
              {sec.title && (
                <p style={{ fontSize: '15px', fontWeight: '600', margin: '0 0 8px' }}>{sec.title}</p>
              )}
              {sec.body && (
                <p style={{ fontSize: '14px', color: 'var(--text-2)', margin: 0, lineHeight: '1.65', whiteSpace: 'pre-line' }}>{sec.body}</p>
              )}
            </div>
          </div>
        )
      })}

      <PackageActions packageId={id} />
    </div>
  )
}
