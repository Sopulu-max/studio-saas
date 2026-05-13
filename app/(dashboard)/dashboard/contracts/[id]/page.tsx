import { redirect } from 'next/navigation'
import Link from 'next/link'
import ContractActions from './contract-actions'
import { getStudioContext } from '@/lib/studio'
import { sessionName } from '@/lib/session-title'

function parseContent(text: string | null | undefined): { title: string; body: string }[] {
  if (!text?.trim()) return []
  return text.split(/\n{3,}/).map(block => {
    const sep = block.indexOf('\n\n')
    if (sep === -1) return { title: '', body: block.trim() }
    return { title: block.slice(0, sep).trim(), body: block.slice(sep + 2).trim() }
  }).filter(c => c.title || c.body)
}

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  type ContractRecord = {
    contract_id: string
    status?: string | null
    content?: string | null
    signed_at?: string | null
    signed_by?: string | null
    bookings?: {
      booking_id?: string | null
      booking_ref?: number | null
      session_date?: string | null
      location_address?: string | null
      studio_id?: string | null
      clients?: { client_id?: string | null; full_name?: string | null; email?: string | null } | null
      packages?: { name?: string | null } | null
    } | null
  }
  const { data: contractRaw } = await context.admin
    .from('contracts')
    .select(`
      *,
      bookings!inner (
        booking_id, booking_ref, session_date, location_address, studio_id,
        clients ( client_id, full_name, email ),
        packages ( name )
      )
    `)
    .eq('contract_id', id)
    .eq('bookings.studio_id', context.studioId)
    .single()
  const contract = contractRaw as unknown as ContractRecord | null

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
          <h1 style={{ fontSize: '20px', fontWeight: '600', margin: '0 0 4px' }}>
            {contract.bookings?.clients?.client_id ? (
              <Link href={`/dashboard/clients/${contract.bookings.clients.client_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                {contract.bookings.clients.full_name ?? '—'}
              </Link>
            ) : (contract.bookings?.clients?.full_name ?? '—')}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>
            <span style={{ fontFamily: 'monospace', fontSize: '13px', letterSpacing: '0.02em' }}>{sessionName(contract.bookings?.clients?.full_name, contract.bookings?.booking_ref, contract.bookings?.booking_id, contract.bookings?.session_date)}</span>
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
        {contract.bookings?.clients?.client_id ? (
          <Link href={`/dashboard/clients/${contract.bookings.clients.client_id}`} style={{ fontSize: '15px', fontWeight: '500', display: 'block', margin: '0 0 4px', color: 'inherit', textDecoration: 'none' }}>
            {contract.bookings.clients.full_name}
          </Link>
        ) : (
          <p style={{ fontSize: '15px', fontWeight: '500', margin: '0 0 4px' }}>{contract.bookings?.clients?.full_name}</p>
        )}
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
        {(contract.bookings?.booking_id || contract.bookings?.clients?.client_id) && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--line-inner)', display: 'flex', gap: '16px' }}>
            {contract.bookings?.clients?.client_id && (
              <Link href={`/dashboard/clients/${contract.bookings.clients.client_id}`} style={{ fontSize: '13px', color: 'var(--link)', textDecoration: 'none' }}>
                View client →
              </Link>
            )}
            {contract.bookings?.booking_id && (
              <Link href={`/dashboard/sessions/${contract.bookings.booking_id}`} style={{ fontSize: '13px', color: 'var(--link)', textDecoration: 'none' }}>
                View session →
              </Link>
            )}
          </div>
        )}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }}>
        <p style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '.08em', color: 'var(--text-4)', margin: '0 0 20px', textTransform: 'uppercase' }}>
          Contract content
        </p>
        {(() => {
          const clauses = parseContent(contract.content)
          if (!clauses.length) return <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>No content</p>
          return (
            <div>
              {clauses.map((clause, i) => (
                <div key={i} style={{
                  paddingBottom: '1.25rem',
                  marginBottom: i < clauses.length - 1 ? '1.25rem' : 0,
                  borderBottom: i < clauses.length - 1 ? '1px solid var(--line-inner)' : 'none',
                }}>
                  {clause.title && (
                    <p style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '.1em', color: 'var(--text-3)', margin: '0 0 8px', textTransform: 'uppercase' }}>
                      {i + 1}. {clause.title}
                    </p>
                  )}
                  <p style={{ fontSize: '14px', lineHeight: '1.85', color: 'var(--text)', margin: 0, whiteSpace: 'pre-wrap' }}>
                    {clause.body}
                  </p>
                </div>
              ))}
            </div>
          )
        })()}
      </div>

      <ContractActions
        contractId={id}
        currentStatus={contract.status ?? ''}
        clientName={contract.bookings?.clients?.full_name ?? ''}
      />
    </div>
  )
}
