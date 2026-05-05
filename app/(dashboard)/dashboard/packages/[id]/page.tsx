import { redirect } from 'next/navigation'
import Link from 'next/link'
import PackageActions from './package-actions'
import { getStudioContext, fetchStudio } from '@/lib/studio'
import { buildStudioConfig, getSessionTypeConfig, getServiceTypeConfig } from '@/lib/studio-config'

type PackageAddon = {
  addon_id: string
  name: string
  description?: string | null
  price?: number | string | null
}

type PackageRecord = {
  name?: string | null
  shoot_type?: string | null
  session_type?: string | null
  service_type?: string | null
  base_price?: number | string | null
  duration_mins?: number | null
  outfits_count?: number | null
  edited_photos?: number | null
  coverage_hours?: number | null
  description?: string | null
  inclusions?: string[] | null
  package_addons?: PackageAddon[] | null
}

// Known category colours — same palette as packages list page
const KNOWN_COLORS: Record<string, { bg: string; color: string }> = {
  portrait:    { bg: '#eeedfe', color: '#534ab7' },
  wedding:     { bg: '#fbeaf0', color: '#993556' },
  corporate:   { bg: '#e6f1fb', color: '#185fa5' },
  event:       { bg: '#faeeda', color: '#854f0b' },
  maternity:   { bg: '#fce8f3', color: '#8b2d6e' },
  fashion:     { bg: '#e8f4fc', color: '#1a6a8a' },
  birthday:    { bg: '#faeeda', color: '#854f0b' },
  graduation:  { bg: '#eaf3de', color: '#3b6d11' },
  engagement:  { bg: '#fbeaf0', color: '#993556' },
  newborn:     { bg: '#eeedfe', color: '#534ab7' },
  boudoir:     { bg: '#fce8f3', color: '#8b2d6e' },
  product:     { bg: '#e6f1fb', color: '#185fa5' },
  lifestyle:   { bg: '#eaf3de', color: '#3b6d11' },
  family:      { bg: '#e8f4fc', color: '#1a6a8a' },
  other:       { bg: '#f1efe8', color: '#5f5e5a' },
}

const FALLBACK_PALETTE = [
  { bg: '#eeedfe', color: '#534ab7' },
  { bg: '#fbeaf0', color: '#993556' },
  { bg: '#e6f1fb', color: '#185fa5' },
  { bg: '#faeeda', color: '#854f0b' },
  { bg: '#eaf3de', color: '#3b6d11' },
  { bg: '#fce8f3', color: '#8b2d6e' },
  { bg: '#e8f4fc', color: '#1a6a8a' },
]

function shootTypeColor(type: string | null | undefined) {
  if (!type) return KNOWN_COLORS.other
  const key = type.toLowerCase().trim()
  if (KNOWN_COLORS[key]) return KNOWN_COLORS[key]
  const idx = [...type].reduce((s, c) => s + c.charCodeAt(0), 0) % FALLBACK_PALETTE.length
  return FALLBACK_PALETTE[idx]
}

export default async function PackageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const studioRow = await fetchStudio(context.admin, context.studioId)
  const config = buildStudioConfig(studioRow?.session_types, studioRow?.booking_statuses, studioRow?.service_types)

  const { data: pkgRaw } = await context.admin
    .from('packages')
    .select('*, package_addons(*)')
    .eq('package_id', id)
    .eq('studio_id', context.studioId)
    .single()
  const pkg = pkgRaw as unknown as PackageRecord | null

  if (!pkg) redirect('/dashboard/packages')

  const s           = shootTypeColor(pkg.shoot_type)
  const typeCfg     = getSessionTypeConfig(config, pkg.session_type)
  const svcTypeCfg  = getServiceTypeConfig(config, pkg.service_type ?? 'photo')

  return (
    <div style={{ maxWidth: '600px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>{pkg.name}</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>
            {pkg.package_addons?.length ?? 0} add-ons
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: svcTypeCfg.color_bg, color: svcTypeCfg.color_fg, fontWeight: '500' }}>
            {svcTypeCfg.label}
          </span>
          <span style={{ fontSize: '13px', padding: '4px 12px', borderRadius: '20px', background: typeCfg.color_bg, color: typeCfg.color_fg, fontWeight: '500' }}>
            {typeCfg.label}
          </span>
          <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: s.bg, color: s.color }}>
            {pkg.shoot_type}
          </span>
          <Link
            href={`/dashboard/packages/${id}/edit`}
            style={{
              fontSize: '13px', padding: '6px 14px', borderRadius: '8px',
              background: 'transparent', border: '1px solid var(--line)',
              color: 'var(--text-2)', textDecoration: 'none', display: 'inline-block',
            }}
          >
            Edit package
          </Link>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 12px' }}>DETAILS</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Base price</p>
            <p style={{ fontSize: '18px', fontWeight: '500', margin: 0 }}>₦{Number(pkg.base_price).toLocaleString()}</p>
          </div>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Duration</p>
            <p style={{ fontSize: '18px', fontWeight: '500', margin: 0 }}>{pkg.duration_mins} mins</p>
          </div>
          {pkg.outfits_count != null && (
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Outfits</p>
              <p style={{ fontSize: '18px', fontWeight: '500', margin: 0 }}>{pkg.outfits_count}</p>
            </div>
          )}
          {pkg.edited_photos != null && (
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Edited photos</p>
              <p style={{ fontSize: '18px', fontWeight: '500', margin: 0 }}>{pkg.edited_photos}</p>
            </div>
          )}
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

      {/* Inclusions */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden', marginBottom: '12px' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line-inner)' }}>
          <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: 0 }}>INCLUSIONS</p>
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

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden', marginBottom: '12px' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line-inner)' }}>
          <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: 0 }}>ADD-ONS</p>
        </div>
        {!pkg.package_addons?.length ? (
          <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0, padding: '1rem 1.25rem' }}>No add-ons for this package</p>
        ) : (
          (pkg.package_addons as PackageAddon[] ?? []).map((addon, i: number) => (
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

      <PackageActions packageId={id} />
    </div>
  )
}
