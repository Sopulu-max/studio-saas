import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getStudioContext } from '@/lib/studio'
import ServiceActions from './service-actions'

type ServiceRecord = {
  service_id:    string
  name:          string
  type:          string
  description?:  string | null
  price?:        number | null
  duration_mins?: number | null
  is_active:     boolean
  display_order: number
  created_at:    string
}

type PackageServiceRow = {
  is_addon:  boolean
  addon_price?: number | null
  packages?: { package_id?: string; name?: string | null } | null
}

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  service: { bg: '#eeedfe', color: '#534ab7' },
  product: { bg: '#faeeda', color: '#854f0b' },
  digital: { bg: '#e6f1fb', color: '#185fa5' },
}
const TYPE_LABELS: Record<string, string> = {
  service: 'Service',
  product: 'Product',
  digital: 'Digital',
}
const TYPE_ICONS: Record<string, string> = {
  service: '🎯',
  product: '📦',
  digital: '💻',
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const [{ data: svcRaw }, { data: pkgServicesRaw }] = await Promise.all([
    context.admin
      .from('services')
      .select('*')
      .eq('service_id', id)
      .eq('studio_id', context.studioId)
      .single(),
    context.admin
      .from('package_services')
      .select('is_addon, addon_price, packages(package_id, name)')
      .eq('service_id', id)
      .order('is_addon', { ascending: true }),
  ])

  const svc = svcRaw as unknown as ServiceRecord | null
  if (!svc) redirect('/dashboard/services')

  const pkgServices = (pkgServicesRaw ?? []) as unknown as PackageServiceRow[]
  const tc = TYPE_COLORS[svc.type] ?? TYPE_COLORS.service

  const included  = pkgServices.filter(ps => !ps.is_addon)
  const addons    = pkgServices.filter(ps => ps.is_addon)

  return (
    <div style={{ maxWidth: '600px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 8px' }}>{svc.name}</h1>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '12px', padding: '3px 10px', borderRadius: '20px',
              background: tc.bg, color: tc.color, fontWeight: '500',
            }}>
              {TYPE_ICONS[svc.type]} {TYPE_LABELS[svc.type] ?? svc.type}
            </span>
            <span style={{
              fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: '500',
              background: svc.is_active ? '#eaf3de' : '#f3f3f3',
              color:      svc.is_active ? '#3b6d11' : '#888',
              border:     svc.is_active ? 'none' : '1px solid #e0e0e0',
            }}>
              {svc.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        <Link
          href={`/dashboard/services/${id}/edit`}
          style={{
            fontSize: '13px', padding: '6px 14px', borderRadius: '8px',
            background: 'transparent', border: '1px solid var(--line)',
            color: 'var(--text-2)', textDecoration: 'none', flexShrink: 0,
          }}
        >
          Edit service
        </Link>
      </div>

      {/* Details card */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 12px' }}>DETAILS</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Price</p>
            <p style={{ fontSize: '18px', fontWeight: '500', margin: 0 }}>
              {svc.price != null ? `₦${Number(svc.price).toLocaleString()}` : <span style={{ color: 'var(--text-4)', fontSize: '14px' }}>Not set</span>}
            </p>
          </div>
          {svc.duration_mins != null && (
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Duration</p>
              <p style={{ fontSize: '18px', fontWeight: '500', margin: 0 }}>{svc.duration_mins} mins</p>
            </div>
          )}
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Display order</p>
            <p style={{ fontSize: '18px', fontWeight: '500', margin: 0 }}>{svc.display_order}</p>
          </div>
        </div>
        {svc.description && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--line-inner)' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 4px' }}>Description</p>
            <p style={{ fontSize: '14px', color: 'var(--text-2)', margin: 0, lineHeight: '1.6' }}>{svc.description}</p>
          </div>
        )}
      </div>

      {/* Packages using this service */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden', marginBottom: '12px' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line-inner)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: 0 }}>LINKED PACKAGES</p>
          <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: 0 }}>{pkgServices.length} package{pkgServices.length !== 1 ? 's' : ''}</p>
        </div>
        {pkgServices.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0, padding: '1rem 1.25rem' }}>
            Not linked to any packages yet
          </p>
        ) : (
          <div>
            {included.length > 0 && (
              <div>
                <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-3)', padding: '8px 1.25rem 4px', margin: 0, letterSpacing: '.04em' }}>INCLUDED IN</p>
                {included.map((ps, i) => {
                  const pkg = ps.packages as { package_id?: string; name?: string | null } | null
                  return (
                    <div key={i} style={{ padding: '10px 1.25rem', borderTop: '1px solid var(--line-inner)' }}>
                      {pkg?.package_id ? (
                        <Link href={`/dashboard/packages/${pkg.package_id}`}
                          style={{ fontSize: '14px', color: 'var(--link)', textDecoration: 'none' }}>
                          {pkg.name ?? 'Unnamed package'}
                        </Link>
                      ) : (
                        <span style={{ fontSize: '14px' }}>{pkg?.name ?? 'Unnamed package'}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            {addons.length > 0 && (
              <div>
                <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-3)', padding: '8px 1.25rem 4px', margin: 0, letterSpacing: '.04em' }}>ADD-ON IN</p>
                {addons.map((ps, i) => {
                  const pkg = ps.packages as { package_id?: string; name?: string | null } | null
                  return (
                    <div key={i} style={{ padding: '10px 1.25rem', borderTop: '1px solid var(--line-inner)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {pkg?.package_id ? (
                        <Link href={`/dashboard/packages/${pkg.package_id}`}
                          style={{ fontSize: '14px', color: 'var(--link)', textDecoration: 'none' }}>
                          {pkg.name ?? 'Unnamed package'}
                        </Link>
                      ) : (
                        <span style={{ fontSize: '14px' }}>{pkg?.name ?? 'Unnamed package'}</span>
                      )}
                      {ps.addon_price != null && (
                        <span style={{ fontSize: '13px', color: 'var(--text-3)' }}>
                          ₦{Number(ps.addon_price).toLocaleString()}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <ServiceActions serviceId={id} isActive={svc.is_active} />

      {/* Back link */}
      <div style={{ marginTop: '1.5rem' }}>
        <Link href="/dashboard/services" style={{ fontSize: '13px', color: 'var(--text-3)', textDecoration: 'none' }}>
          ← All services
        </Link>
      </div>
    </div>
  )
}
