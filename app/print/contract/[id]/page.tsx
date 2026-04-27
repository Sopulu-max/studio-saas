import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getStudioContext, fetchStudio } from '@/lib/studio'
import PrintButton from './print-button'

export default async function ContractPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const studio = await fetchStudio(context.admin, context.studioId)

  const { data: contract } = await context.admin
    .from('contracts')
    .select(`
      *,
      bookings!inner (
        studio_id,
        session_date, location,
        clients ( full_name, email ),
        packages ( name )
      )
    `)
    .eq('contract_id', id)
    .eq('bookings.studio_id', context.studioId)
    .single()

  if (!contract) redirect('/dashboard/contracts')

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, sans-serif; color: #111; background: #f0f0f0; }
        .page { max-width: 760px; margin: 0 auto; background: white; padding: 56px 64px; min-height: 100vh; }
        .no-print { margin-bottom: 24px; display: flex; gap: 10px; align-items: center; }
        .divider { border: none; border-top: 1px solid #e5e5e5; margin: 28px 0; }
        .sig-row { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 16px; }
        .sig-block p { font-size: 12px; color: #888; margin-bottom: 6px; }
        .sig-line { border-bottom: 1px solid #888; height: 36px; margin-bottom: 8px; }
        .sig-name { font-size: 12px; color: #555; }
        @media print {
          body { background: white; }
          .no-print { display: none !important; }
          .page { padding: 0; min-height: auto; }
          @page { margin: 1.5cm 1.8cm; size: A4; }
        }
      `}</style>

      <div className="page">
        <div className="no-print">
          <PrintButton />
          <Link href={`/dashboard/contracts/${id}`} style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>
            Back to contract
          </Link>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
          <div>
            <p style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>{studio?.name}</p>
            <p style={{ fontSize: '13px', color: '#666' }}>{studio?.email}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '22px', fontWeight: '300', letterSpacing: '-.02em', color: '#111' }}>CONTRACT</p>
            <p style={{ fontSize: '12px', color: '#888', marginTop: '6px' }}>
              {contract.bookings?.session_date
                ? new Date(contract.bookings.session_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
                : ''}
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '36px' }}>
          <div>
            <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '10px', fontWeight: '500' }}>Client</p>
            <p style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>{contract.bookings?.clients?.full_name}</p>
            <p style={{ fontSize: '13px', color: '#666' }}>{contract.bookings?.clients?.email}</p>
          </div>
          <div>
            <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '10px', fontWeight: '500' }}>Session</p>
            {contract.bookings?.packages?.name && (
              <p style={{ fontSize: '13px', color: '#444', marginBottom: '4px' }}>{contract.bookings.packages.name}</p>
            )}
            {contract.bookings?.location && (
              <p style={{ fontSize: '13px', color: '#666' }}>{contract.bookings.location}</p>
            )}
          </div>
        </div>

        <hr className="divider" />

        <div style={{ marginBottom: '48px' }}>
          {contract.content.split('\n').map((line: string, i: number) => (
            <p key={i} style={{ fontSize: '13px', lineHeight: '1.8', color: '#333', marginBottom: line ? '0' : '12px' }}>
              {line || <br />}
            </p>
          ))}
        </div>

        <hr className="divider" />

        <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '16px', fontWeight: '500' }}>Signatures</p>
        <div className="sig-row">
          <div className="sig-block">
            <p>Client signature</p>
            <div className="sig-line" />
            <p className="sig-name">{contract.signed_by || contract.bookings?.clients?.full_name}</p>
            {contract.signed_at && (
              <p style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>
                Signed {new Date(contract.signed_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
          <div className="sig-block">
            <p>Studio representative</p>
            <div className="sig-line" />
            <p className="sig-name">{studio?.name}</p>
          </div>
        </div>
      </div>
    </>
  )
}
