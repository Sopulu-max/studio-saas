import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getStudioContext } from '@/lib/studio'
import ServiceActions from './service-actions'

import { getServiceDetail } from '@/lib/domains/services/repository'

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

  const svc = await getServiceDetail(context.admin, context.studioId, id)
  if (!svc) redirect('/dashboard/services')

  const pkgServices = svc.package_services ?? []
  const tc = TYPE_COLORS[svc.type] ?? TYPE_COLORS.service

  const included  = pkgServices.filter(ps => !ps.is_addon)
  const addons    = pkgServices.filter(ps => ps.is_addon)

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 md:p-8 animate-enter pb-24 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text)] m-0 mb-1">{svc.name}</h1>
          <div className="flex gap-2 flex-wrap items-center">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest" style={{ background: tc.bg, color: tc.color }}>
              {TYPE_ICONS[svc.type]} {TYPE_LABELS[svc.type] ?? svc.type}
            </span>
            <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest border ${svc.is_active ? 'bg-[#eaf3de] text-[#3b6d11] border-transparent' : 'bg-[var(--surface-2)] text-[var(--text-4)] border-[var(--line)]'}`}>
              {svc.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        <Link
          href={`/dashboard/services/${id}/edit`}
          className="px-4 py-2 rounded-lg font-bold text-[13px] border border-[var(--line)] bg-[var(--surface-2)] text-[var(--text)] hover-lift transition-all"
          style={{ textDecoration: 'none' }}
        >
          Edit service
        </Link>
      </div>

      {/* Details card */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '12px' }}>
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
      <div className="glass-panel" style={{ overflow: 'hidden', marginBottom: '12px' }}>
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
