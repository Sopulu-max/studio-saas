import { redirect } from 'next/navigation'
import Link from 'next/link'
import ClientActions from './client-actions'
import AvatarUpload from '@/components/avatar-upload'
import { getStudioContext, fetchStudio } from '@/lib/studio'
import { sessionName } from '@/lib/session-title'
import { buildStudioConfig, getStatusConfig } from '@/lib/studio-config'

type BookingPackageRelation = { name?: string | null } | null

type ClientRow = {
  client_id: string
  client_ref?: number | null
  full_name: string | null
  email: string | null
  phone: string | null
  address: string | null
  avatar_url?: string | null
}

type BookingRow = {
  booking_id: string
  booking_ref: number | null
  session_type: string | null
  session_date: string | null
  status: string | null
  packages: BookingPackageRelation
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const { data: clientRaw } = await context.admin
    .from('clients')
    .select('*')
    .eq('client_id', id)
    .eq('studio_id', context.studioId)
    .single()

  if (!clientRaw) redirect('/dashboard/clients')

  const client = clientRaw as unknown as ClientRow

  const [bookingsResult, studioRow] = await Promise.all([
    context.admin
      .from('bookings')
      .select('booking_id, booking_ref, session_type, session_date, status, packages(name)')
      .eq('client_id', id)
      .eq('studio_id', context.studioId)
      .order('session_date', { ascending: false }),
    fetchStudio(context.admin, context.studioId),
  ])

  const bookings = (bookingsResult.data ?? []) as unknown as BookingRow[]
  const config = buildStudioConfig(studioRow?.session_types, studioRow?.booking_statuses, studioRow?.service_types)

  return (
    <div style={{ maxWidth: '640px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
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
          style={{ fontSize: '13px', padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--line)', color: 'var(--text-2)', textDecoration: 'none', background: 'var(--surface)', flexShrink: 0 }}
        >
          Edit
        </Link>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }}>
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

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden', marginBottom: '12px' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line-inner)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: 0 }}>SESSIONS</p>
          <Link href={`/dashboard/sessions/new`} style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none' }}>
            New session →
          </Link>
        </div>
        {!bookings?.length ? (
          <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0, padding: '1rem 1.25rem' }}>No sessions yet</p>
        ) : (
          bookings.map((b, i) => {
            const s = getStatusConfig(config, b.status)
            return (
              <Link key={b.booking_id} href={`/dashboard/sessions/${b.booking_id}`} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.875rem 1.25rem', textDecoration: 'none', color: 'inherit',
                borderBottom: i < bookings.length - 1 ? '1px solid var(--line-inner)' : 'none',
              }}>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 2px' }}>
                    {(b.packages as BookingPackageRelation)?.name ?? client.full_name}
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

      <ClientActions clientId={id} />
    </div>
  )
}
