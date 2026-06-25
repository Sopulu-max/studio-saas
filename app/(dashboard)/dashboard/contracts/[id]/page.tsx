import { redirect } from 'next/navigation'
import Link from 'next/link'
import ContractActions from './contract-actions'
import { getStudioContext } from '@/lib/studio'
import { sessionName } from '@/lib/session-title'
import { getContractDetail } from '@/lib/domains/contracts/repository'

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

  const contract = await getContractDetail(context.admin, context.studioId, id)

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
            {contract.client_id ? (
              <Link href={`/dashboard/clients/${contract.client_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                {contract.client_name ?? '—'}
              </Link>
            ) : (contract.client_name ?? '—')}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>
            <span style={{ fontFamily: 'monospace', fontSize: '13px', letterSpacing: '0.02em' }}>{sessionName(contract.client_name, contract.booking_ref, contract.booking_id, contract.session_date)}</span>
            {contract.session_date
              ? ` · ${new Date(contract.session_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}`
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
              className="glass-panel hover-lift" style={{ fontSize: '13px', padding: '5px 14px', color: 'var(--text-2)', textDecoration: 'none' }}
            >
              Edit
            </Link>
          )}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 12px' }}>CLIENT</p>
        {contract.client_id ? (
          <Link href={`/dashboard/clients/${contract.client_id}`} style={{ fontSize: '15px', fontWeight: '500', display: 'block', margin: '0 0 4px', color: 'inherit', textDecoration: 'none' }}>
            {contract.client_name}
          </Link>
        ) : (
          <p style={{ fontSize: '15px', fontWeight: '500', margin: '0 0 4px' }}>{contract.client_name}</p>
        )}
        <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 2px' }}>{contract.client_email}</p>
        <div style={{ display: 'flex', gap: '24px', marginTop: '12px' }}>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Session date</p>
            <p style={{ fontSize: '13px', margin: 0 }}>
              {contract.session_date
                ? new Date(contract.session_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
                : '—'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Location</p>
            <p style={{ fontSize: '13px', margin: 0 }}>{contract.location_address || '—'}</p>
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
        {(contract.booking_id || contract.client_id) && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--line-inner)', display: 'flex', gap: '16px' }}>
            {contract.client_id && (
              <Link href={`/dashboard/clients/${contract.client_id}`} style={{ fontSize: '13px', color: 'var(--link)', textDecoration: 'none' }}>
                View client →
              </Link>
            )}
            {contract.booking_id && (
              <Link href={`/dashboard/bookings/${contract.booking_id}`} style={{ fontSize: '13px', color: 'var(--link)', textDecoration: 'none' }}>
                View session →
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '12px' }}>
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
        clientName={contract.client_name ?? ''}
      />
    </div>
  )
}
