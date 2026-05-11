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

type PublicSection = {
  section_id:    string
  title:         string
  body?:         string | null
  image_url?:    string | null
  display_order: number
}

type PublicTypedInclusion = {
  inclusion_id:  string
  label:         string
  type:          'service' | 'product' | 'digital'
  display_order: number
}

type PublicAddon = {
  addon_id:    string
  name:        string
  description?: string | null
  price?:      number | string | null
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
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const INCLUSION_TYPE_META: Record<string, { label: string; icon: string; bg: string; color: string }> = {
  service: { label: 'Service',  icon: '🎯', bg: '#eeedfe', color: '#534ab7' },
  product: { label: 'Product',  icon: '📦', bg: '#faeeda', color: '#854f0b' },
  digital: { label: 'Digital',  icon: '💻', bg: '#e6f1fb', color: '#185fa5' },
}

// ─── SEO ────────────────────────────────────────────────────────────────────

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
      title,
      description,
      type: 'website',
      ...(pkg?.cover_url ? { images: [{ url: pkg.cover_url }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(pkg?.cover_url ? { images: [pkg.cover_url] } : {}),
    },
  }
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function PublicPackageDetailPage({
  params,
}: {
  params: Promise<{ studioSlug: string; packageId: string }>
}) {
  const { studioSlug, packageId } = await params
  const admin = createAdminClient()

  // Fetch studio + package in parallel
  const [{ data: studioRaw }, { data: pkgRaw }] = await Promise.all([
    admin.from('studios').select('studio_id, name, slug, logo_url').eq('slug', studioSlug).maybeSingle(),
    admin
      .from('packages')
      .select('package_id, name, tagline, description, cover_url, base_price, duration_mins, outfits_count, edited_photos, coverage_hours, inclusions, is_public, package_sections(section_id, title, body, image_url, display_order), package_inclusions(inclusion_id, label, type, display_order), package_addons(addon_id, name, description, price)')
      .eq('package_id', packageId)
      .maybeSingle(),
  ])

  const studio = studioRaw as unknown as StudioMeta | null
  if (!studio) notFound()

  const pkg = pkgRaw as unknown as PublicPackage | null
  if (!pkg || pkg.is_public === false) notFound()

  // Sort related data
  const sections        = [...(pkg.package_sections   ?? [])].sort((a, b) => a.display_order - b.display_order)
  const typedInclusions = [...(pkg.package_inclusions ?? [])].sort((a, b) => a.display_order - b.display_order)
  const addons          = pkg.package_addons ?? []

  const price = Number(pkg.base_price ?? 0)

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, -apple-system, sans-serif; background: #f7f7f5; color: #111; }
        a { color: inherit; text-decoration: none; }
      `}</style>

      <div style={{ minHeight: '100vh', paddingBottom: '100px' }}>

        {/* Sticky header */}
        <div style={{ background: 'white', borderBottom: '0.5px solid #e5e5e5', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 50 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {studio.logo_url && (
              <img src={studio.logo_url} alt={studio.name ?? ''} style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover', border: '0.5px solid #e5e5e5' }} />
            )}
            <Link href={`/packages/${studioSlug}`} style={{ fontSize: '14px', color: '#666' }}>
              ← {studio.name}
            </Link>
          </div>
          <Link
            href={`/book/${studioSlug}`}
            style={{
              fontSize: '13px', fontWeight: '500', padding: '8px 16px',
              background: '#111', color: 'white', borderRadius: '8px',
            }}
          >
            Book now →
          </Link>
        </div>

        {/* Cover hero */}
        {pkg.cover_url && (
          <div style={{ width: '100%', maxHeight: '480px', overflow: 'hidden' }}>
            <img
              src={pkg.cover_url}
              alt={pkg.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', maxHeight: '480px' }}
            />
          </div>
        )}

        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 20px 0' }}>

          {/* Title + tagline */}
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '30px', fontWeight: '700', letterSpacing: '-.02em', marginBottom: '8px', lineHeight: '1.2' }}>
              {pkg.name}
            </h1>
            {pkg.tagline && (
              <p style={{ fontSize: '16px', color: '#555', lineHeight: '1.6' }}>{pkg.tagline}</p>
            )}
          </div>

          {/* Price + key stats */}
          <div style={{ background: 'white', border: '0.5px solid #e5e5e5', borderRadius: '14px', padding: '22px 24px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: pkg.description ? '18px' : '0' }}>
              <div>
                <p style={{ fontSize: '11px', color: '#999', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Price</p>
                <p style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '-.01em' }}>₦{price.toLocaleString()}</p>
              </div>
              {pkg.duration_mins != null && (
                <div>
                  <p style={{ fontSize: '11px', color: '#999', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Duration</p>
                  <p style={{ fontSize: '20px', fontWeight: '600' }}>{pkg.duration_mins} mins</p>
                </div>
              )}
              {pkg.outfits_count != null && (
                <div>
                  <p style={{ fontSize: '11px', color: '#999', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Outfits</p>
                  <p style={{ fontSize: '20px', fontWeight: '600' }}>{pkg.outfits_count}</p>
                </div>
              )}
              {pkg.edited_photos != null && (
                <div>
                  <p style={{ fontSize: '11px', color: '#999', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Edited photos</p>
                  <p style={{ fontSize: '20px', fontWeight: '600' }}>{pkg.edited_photos}</p>
                </div>
              )}
              {pkg.coverage_hours != null && (
                <div>
                  <p style={{ fontSize: '11px', color: '#999', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Coverage</p>
                  <p style={{ fontSize: '20px', fontWeight: '600' }}>{pkg.coverage_hours}h</p>
                </div>
              )}
            </div>
            {pkg.description && (
              <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.7', borderTop: '0.5px solid #f0f0f0', paddingTop: '16px' }}>{pkg.description}</p>
            )}
          </div>

          {/* What's included (text bullets) */}
          {(pkg.inclusions ?? []).length > 0 && (
            <div style={{ background: 'white', border: '0.5px solid #e5e5e5', borderRadius: '14px', padding: '22px 24px', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '14px' }}>
                What&apos;s included
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(pkg.inclusions ?? []).map((item: string, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ color: '#22c55e', fontSize: '15px', flexShrink: 0, marginTop: '1px' }}>✓</span>
                    <span style={{ fontSize: '14px', color: '#333', lineHeight: '1.5' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Typed deliverables */}
          {typedInclusions.length > 0 && (
            <div style={{ background: 'white', border: '0.5px solid #e5e5e5', borderRadius: '14px', padding: '22px 24px', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '14px' }}>
                Deliverables
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {typedInclusions.map(inc => {
                  const meta = INCLUSION_TYPE_META[inc.type] ?? INCLUSION_TYPE_META.service
                  return (
                    <div key={inc.inclusion_id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        fontSize: '11px', padding: '3px 9px', borderRadius: '20px',
                        background: meta.bg, color: meta.color,
                        fontWeight: '600', flexShrink: 0, whiteSpace: 'nowrap',
                      }}>
                        {meta.icon} {meta.label}
                      </span>
                      <span style={{ fontSize: '14px', color: '#333' }}>{inc.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Content sections */}
          {sections.map(sec => (
            <div key={sec.section_id} style={{ background: 'white', border: '0.5px solid #e5e5e5', borderRadius: '14px', overflow: 'hidden', marginBottom: '20px' }}>
              {sec.image_url && (
                <div style={{ width: '100%', overflow: 'hidden' }}>
                  <img src={sec.image_url} alt={sec.title} style={{ width: '100%', display: 'block', objectFit: 'cover', maxHeight: '400px' }} />
                </div>
              )}
              {(sec.title || sec.body) && (
                <div style={{ padding: '22px 24px' }}>
                  {sec.title && (
                    <h2 style={{ fontSize: '18px', fontWeight: '600', letterSpacing: '-.01em', marginBottom: sec.body ? '10px' : '0' }}>
                      {sec.title}
                    </h2>
                  )}
                  {sec.body && (
                    <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.75', whiteSpace: 'pre-line' }}>
                      {sec.body}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Add-ons */}
          {addons.length > 0 && (
            <div style={{ background: 'white', border: '0.5px solid #e5e5e5', borderRadius: '14px', overflow: 'hidden', marginBottom: '20px' }}>
              <div style={{ padding: '20px 24px', borderBottom: '0.5px solid #f0f0f0' }}>
                <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  Optional add-ons
                </h2>
              </div>
              {addons.map((addon, i) => (
                <div key={addon.addon_id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 24px',
                  borderBottom: i < addons.length - 1 ? '0.5px solid #f0f0f0' : 'none',
                }}>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '500', marginBottom: addon.description ? '2px' : '0' }}>{addon.name}</p>
                    {addon.description && (
                      <p style={{ fontSize: '12px', color: '#888' }}>{addon.description}</p>
                    )}
                  </div>
                  <p style={{ fontSize: '15px', fontWeight: '600', flexShrink: 0, marginLeft: '16px' }}>
                    + ₦{Number(addon.price ?? 0).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* CTA block */}
          <div style={{ background: '#111', borderRadius: '14px', padding: '28px 24px', textAlign: 'center', marginBottom: '20px' }}>
            <p style={{ fontSize: '20px', fontWeight: '700', color: 'white', marginBottom: '6px', letterSpacing: '-.01em' }}>
              Ready to book?
            </p>
            <p style={{ fontSize: '14px', color: '#aaa', marginBottom: '20px' }}>
              Fill in a short form and {studio.name} will get back to you.
            </p>
            <Link
              href={`/book/${studioSlug}`}
              style={{
                display: 'inline-block',
                background: 'white', color: '#111',
                fontSize: '15px', fontWeight: '600',
                padding: '13px 32px', borderRadius: '10px',
                letterSpacing: '-.01em',
              }}
            >
              Book this package →
            </Link>
          </div>

          {/* Back link */}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <Link href={`/packages/${studioSlug}`} style={{ fontSize: '13px', color: '#888' }}>
              ← Back to all packages
            </Link>
          </div>

          <p style={{ textAlign: 'center', fontSize: '12px', color: '#ccc' }}>
            Powered by Weave
          </p>
        </div>
      </div>
    </>
  )
}
