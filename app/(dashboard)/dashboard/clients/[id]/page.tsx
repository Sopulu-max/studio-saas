import { redirect } from 'next/navigation'
import Link from 'next/link'
import ClientActions from './client-actions'
import AvatarUpload from '@/components/avatar-upload'
import { getStudioContext, fetchStudio } from '@/lib/studio'
import { sessionName } from '@/lib/session-title'
import { buildStudioConfig, getStatusConfig } from '@/lib/studio-config'
import WhatsAppActions from '@/components/whatsapp-actions'

import { getClientDetail } from '@/lib/domains/clients/repository'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const [detailResult, studioRow] = await Promise.all([
    getClientDetail(context.admin, context.studioId, id),
    fetchStudio(context.admin, context.studioId)
  ])

  const { client, bookings, invoices } = detailResult
  if (!client) redirect('/dashboard/clients')

  const config = buildStudioConfig(studioRow?.session_types, studioRow?.booking_statuses, studioRow?.service_types)

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 md:p-8 animate-enter pb-24 max-w-4xl mx-auto w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 shrink-0">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <AvatarUpload
            entityId={id}
            entityType="client"
            currentUrl={client.avatar_url ?? null}
            name={client.full_name ?? ''}
            size={56}
          />
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
              {client.client_ref != null ? `#${String(client.client_ref).padStart(4, '0')}` : `#${id.slice(0, 6).toUpperCase()}`}
            </p>
            <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>{client.full_name}</h1>
            <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>{bookings?.length ?? 0} sessions</p>
          </div>
        </div>
        <Link
          href={`/dashboard/clients/${id}/edit`}
          className="px-4 py-2 rounded-lg font-bold text-[13px] border border-[var(--line)] bg-[var(--surface-2)] text-[var(--text)] hover-lift transition-all"
          style={{ textDecoration: 'none' }}
        >
          Edit Client
        </Link>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 12px' }}>CONTACT</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Email</p>
            <p style={{ fontSize: '14px', margin: 0 }}>{client.email}</p>
          </div>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Phone</p>
            <p style={{ fontSize: '14px', margin: 0 }}>{client.phone ?? '—'}</p>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Address</p>
            <p style={{ fontSize: '14px', margin: 0, color: client.address ? 'var(--text)' : 'var(--text-4)' }}>
              {client.address ?? '—'}
            </p>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 12px' }}>FINANCIALS</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Total invoiced</p>
            <p style={{ fontSize: '16px', fontWeight: '600', margin: 0, letterSpacing: '-0.01em' }}>
              {invoices.length === 0 ? '—' : `₦${client.total_invoiced.toLocaleString('en-NG')}`}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Total paid</p>
            <p style={{ fontSize: '16px', fontWeight: '600', margin: 0, letterSpacing: '-0.01em', color: client.total_paid > 0 ? '#3b6d11' : 'var(--text)' }}>
              {invoices.length === 0 ? '—' : `₦${client.total_paid.toLocaleString('en-NG')}`}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Outstanding</p>
            <p style={{ fontSize: '16px', fontWeight: '600', margin: 0, letterSpacing: '-0.01em', color: client.outstanding > 0 ? '#a32d2d' : (invoices.length > 0 ? '#3b6d11' : 'var(--text)') }}>
              {invoices.length === 0 ? '—' : client.outstanding > 0 ? `₦${client.outstanding.toLocaleString('en-NG')}` : 'Settled'}
            </p>
          </div>
        </div>
        {invoices.length > 0 && (
          <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '12px 0 0' }}>
            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} ·{' '}
            <Link href="/dashboard/invoices" style={{ color: 'var(--link)', textDecoration: 'none' }}>View all invoices →</Link>
          </p>
        )}
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden', marginBottom: '12px' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line-inner)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: 0 }}>SESSIONS</p>
          <Link href={`/dashboard/bookings/new`} style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none' }}>
            New session →
          </Link>
        </div>
        {!bookings?.length ? (
          <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0, padding: '1rem 1.25rem' }}>No sessions yet</p>
        ) : (
          bookings.map((b, i) => {
            const s = getStatusConfig(config, b.status)
            return (
              <Link key={b.session_id} href={`/dashboard/bookings/${b.booking_id}`} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.875rem 1.25rem', textDecoration: 'none', color: 'inherit',
                borderBottom: i < bookings.length - 1 ? '1px solid var(--line-inner)' : 'none',
              }}>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 2px' }}>
                    {b.package_name ?? client.full_name}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>
                    <span style={{ fontFamily: 'monospace', letterSpacing: '0.02em' }}>{sessionName(client.full_name, b.booking_ref, b.booking_id, b.session_date)}</span>
                    {b.session_date ? ` · ${new Date(b.session_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                  </p>
                </div>
                <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: s.color_bg, color: s.color_fg, fontWeight: '500' }}>
                  {s.label}
                </span>
              </Link>
            )
          })
        )}
      </div>

      <WhatsAppActions
        phone={client.phone}
        actions={[
          {
            label: 'Send Check-in',
            msg: `Hi ${client.full_name?.split(' ')[0] || 'there'}, just checking in from ${context.studioId}!`,
          },
          ...(client.outstanding > 0 ? [{
            label: 'Send Account Balance Reminder',
            msg: `Hi ${client.full_name?.split(' ')[0] || 'there'}, a quick reminder that there is an outstanding balance of ₦${client.outstanding.toLocaleString('en-NG')} on your account. Please let us know if you have any questions!`,
            priority: true,
          }] : []),
          ...(bookings.length > 0 ? [{
            label: 'Follow up on last session',
            msg: `Hi ${client.full_name?.split(' ')[0] || 'there'}, we hope you loved the photos from your last session. Let us know if you'd like to book another!`,
          }] : [])
        ]}
      />

      <ClientActions clientId={id} />
    </div>
  )
}
