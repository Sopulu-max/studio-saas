import { redirect } from 'next/navigation'
import Link from 'next/link'
import ContractActions from './contract-actions'
import { getStudioContext } from '@/lib/studio'

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const { data: contract } = await context.admin
    .from('contracts')
    .select(`
      *,
      bookings!inner (
        booking_id, session_date, location_address, studio_id,
        clients ( full_name, email ),
        packages ( name )
      )
    `)
    .eq('contract_id', id)
    .eq('bookings.studio_id', context.studioId)
    .single()

  if (!contract) redirect('/dashboard/contracts')

  const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
    draft:  { bg: '#f1efe8', color: '#5f5e5a' },
    sent:   { bg: '#e6f1fb', color: '#185fa5' },
    signed: { bg: '#eaf3de', color: '#3b6d11' },
    void:   { bg: '#fcebeb', color: '#a32d2d' },
  }
  const s = STATUS_COLORS[contract.status ?? ''] ?? STATUS_COLORS.draft

  return (
    <div style={{ maxWidth: '680px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>Contract</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>
            {contract.bookings?.clients?.full_name}
            {contract.bookings?.session_date
              ? ` · ${new Date(contract.bookings.session_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}`
              : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', padding: '4px 12px', borderRadius: '20px', background: s.bg, color: s.color, fontWeight: '500' }}>
            {contract.status}
          </span>
          {contract.status === 'draft' && (
            <Link
              href={`/dashboard/contracts/${id}/edit`}
              style={{ fontSize: '13px', padding: '5px 14px', borderRadius: '8px', border: '1px solid var(--line)', color: 'var(--text-2)', textDecoration: 'none', background: 'var(--surface)' }}
            >
              Edit
            </Link>
          )}
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 12px' }}>CLIENT</p>
        <p style={{ fontSize: '15px', fontWeight: '500', margin: '0 0 4px' }}>{contract.bookings?.clients?.full_name}</p>
        <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 2px' }}>{contract.bookings?.clients?.email}</p>
        <div style={{ display: 'flex', gap: '24px', marginTop: '12px' }}>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Session date</p>
            <p style={{ fontSize: '13px', margin: 0 }}>
              {contract.bookings?.session_date
                ? new Date(contract.bookings.session_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
                : '—'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Location</p>
            <p style={{ fontSize: '13px', margin: 0 }}>{contract.bookings?.location_address || '—'}</p>
          </div>
          {contract.signed_at && (
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Signed</p>
              <p style={{ fontSize: '13px', margin: 0 }}>
                {new Date(contract.signed_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          )}
          {contract.signed_by && (
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Signed by</p>
              <p style={{ fontSize: '13px', margin: 0 }}>{contract.signed_by}</p>
            </div>
          )}
        </div>
        {contract.bookings?.booking_id && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--line-inner)' }}>
            <Link
              href={`/dashboard/sessions/${contract.bookings.booking_id}`}
              style={{ fontSize: '13px', color: 'var(--link)', textDecoration: 'none' }}
            >
              View session →
            </Link>
          </div>
        )}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 16px' }}>CONTRACT CONTENT</p>
        <pre style={{ fontSize: '13px', lineHeight: '1.8', color: 'var(--text-2)', margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)' }}>
          {contract.content}
        </pre>
      </div>

      <ContractActions
        contractId={id}
        currentStatus={contract.status}
        clientEmail={contract.bookings?.clients?.email ?? ''}
        clientName={contract.bookings?.clients?.full_name ?? ''}
      />
    </div>
  )
}
