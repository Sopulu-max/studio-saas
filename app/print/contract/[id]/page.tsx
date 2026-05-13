import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getStudioContext, fetchStudio } from '@/lib/studio'
import PrintButton from './print-button'

function parseContent(text: string | null | undefined): { title: string; body: string }[] {
  if (!text?.trim()) return []
  return text.split(/\n{3,}/).map(block => {
    const sep = block.indexOf('\n\n')
    if (sep === -1) return { title: '', body: block.trim() }
    return { title: block.slice(0, sep).trim(), body: block.slice(sep + 2).trim() }
  }).filter(c => c.title || c.body)
}

export default async function ContractPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const studio = await fetchStudio(context.admin, context.studioId)

  type PrintContractRecord = {
    contract_id?: string | null
    content: string
    status?: string | null
    signed_at?: string | null
    signed_by?: string | null
    bookings?: {
      studio_id?: string | null
      session_date?: string | null
      location?: string | null
      clients?: { full_name?: string | null; email?: string | null; phone?: string | null } | null
      packages?: { name?: string | null } | null
    } | null
  }

  const { data: contractRaw } = await context.admin
    .from('contracts')
    .select(`
      *,
      bookings!inner (
        studio_id,
        session_date, location,
        clients ( full_name, email, phone ),
        packages ( name )
      )
    `)
    .eq('contract_id', id)
    .eq('bookings.studio_id', context.studioId)
    .single()
  const contract = contractRaw as unknown as PrintContractRecord | null

  if (!contract) redirect('/dashboard/contracts')

  const clauses    = parseContent(contract.content)
  const sessionDate = contract.bookings?.session_date
    ? new Date(contract.bookings.session_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const studioContact = [studio?.email, studio?.phone, studio?.address].filter(Boolean).join('  ·  ')

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, -apple-system, sans-serif; color: #111; background: #e8e8e8; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

        .no-print { padding: 16px 24px; display: flex; gap: 10px; align-items: center; background: #fff; border-bottom: 1px solid #e0e0e0; }
        .no-print a { font-size: 13px; color: #888; text-decoration: none; }

        .page {
          max-width: 794px; margin: 32px auto 64px; background: #fff;
          box-shadow: 0 4px 32px rgba(0,0,0,.12);
        }

        .page-inner { padding: 64px 72px; }

        /* Header */
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; }
        .studio-logo { width: 56px; height: 56px; border-radius: 8px; object-fit: cover; margin-bottom: 10px; display: block; }
        .studio-name { font-size: 18px; font-weight: 700; letter-spacing: -.01em; color: #111; margin-bottom: 3px; }
        .studio-sub  { font-size: 12px; color: #888; }
        .contract-label { text-align: right; }
        .contract-title { font-size: 26px; font-weight: 300; letter-spacing: .06em; text-transform: uppercase; color: #111; line-height: 1; }
        .contract-date  { font-size: 12px; color: #888; margin-top: 8px; }

        /* Gold rule */
        .rule { border: none; height: 1px; background: linear-gradient(90deg, #c9a96e 0%, #e8d5a3 50%, #c9a96e 100%); margin: 0 0 36px; }

        /* Party grid */
        .party-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
        .party-label { font-size: 10px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; color: #c9a96e; margin-bottom: 8px; }
        .party-name  { font-size: 16px; font-weight: 600; color: #111; margin-bottom: 3px; line-height: 1.3; }
        .party-detail { font-size: 12px; color: #666; line-height: 1.6; }

        /* Clauses */
        .clauses { margin-bottom: 52px; }
        .clause   { margin-bottom: 28px; padding-bottom: 28px; border-bottom: 1px solid #f0f0f0; }
        .clause:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
        .clause-heading {
          font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase;
          color: #c9a96e; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;
        }
        .clause-heading::after {
          content: ''; flex: 1; height: 1px; background: #f0e8d4;
        }
        .clause-body {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 13.5px; line-height: 1.95; color: #2a2a2a;
          white-space: pre-wrap;
        }

        /* Signature */
        .sig-section { margin-top: 48px; padding-top: 36px; border-top: 1px solid #e8e8e8; }
        .sig-label-top { font-size: 10px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; color: #c9a96e; margin-bottom: 24px; }
        .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; }
        .sig-party-label { font-size: 11px; font-weight: 600; color: #888; margin-bottom: 4px; }
        .sig-line { border-bottom: 1.5px solid #bbb; height: 44px; margin-bottom: 8px; }
        .sig-name { font-size: 12px; color: #444; font-weight: 500; }
        .sig-date { font-size: 11px; color: #aaa; margin-top: 3px; }
        .sig-signed-badge { font-size: 11px; color: #3b6d11; background: #eaf3de; padding: 2px 8px; border-radius: 10px; display: inline-block; margin-top: 4px; }

        /* Footer */
        .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #f0f0f0; text-align: center; }
        .footer p { font-size: 10px; color: #bbb; letter-spacing: .04em; }

        @media print {
          body { background: white; }
          .no-print { display: none !important; }
          .page { margin: 0; box-shadow: none; }
          .page-inner { padding: 0; }
          @page { margin: 1.8cm 2cm; size: A4; }
        }
      `}</style>

      <div className="no-print">
        <PrintButton />
        <Link href={`/dashboard/contracts/${id}`}>← Back to contract</Link>
      </div>

      <div className="page">
        <div className="page-inner">

          {/* ── Header ── */}
          <div className="header">
            <div>
              {studio?.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={studio.logo_url} alt={studio?.name ?? 'Studio logo'} className="studio-logo" />
              )}
              <p className="studio-name">{studio?.name}</p>
              {studio?.email && <p className="studio-sub">{studio.email}</p>}
            </div>
            <div className="contract-label">
              <p className="contract-title">Contract</p>
              {sessionDate && <p className="contract-date">{sessionDate}</p>}
            </div>
          </div>

          <hr className="rule" />

          {/* ── Parties ── */}
          <div className="party-grid">
            <div>
              <p className="party-label">Client</p>
              <p className="party-name">{contract.bookings?.clients?.full_name ?? '—'}</p>
              {contract.bookings?.clients?.email && (
                <p className="party-detail">{contract.bookings.clients.email}</p>
              )}
              {contract.bookings?.clients?.phone && (
                <p className="party-detail">{contract.bookings.clients.phone}</p>
              )}
            </div>
            <div>
              <p className="party-label">Session details</p>
              {contract.bookings?.packages?.name && (
                <p className="party-name">{contract.bookings.packages.name}</p>
              )}
              {sessionDate && (
                <p className="party-detail">{sessionDate}</p>
              )}
              {contract.bookings?.location && (
                <p className="party-detail">{contract.bookings.location}</p>
              )}
            </div>
          </div>

          <hr className="rule" />

          {/* ── Clauses ── */}
          <div className="clauses">
            {clauses.map((clause, i) => (
              <div key={i} className="clause">
                {clause.title && (
                  <p className="clause-heading">
                    <span>{String(i + 1).padStart(2, '0')}. {clause.title}</span>
                  </p>
                )}
                <p className="clause-body">{clause.body}</p>
              </div>
            ))}
          </div>

          {/* ── Signatures ── */}
          <div className="sig-section">
            <p className="sig-label-top">Signatures</p>
            <div className="sig-grid">
              <div>
                <p className="sig-party-label">Client signature</p>
                <div className="sig-line" />
                <p className="sig-name">{contract.signed_by ?? contract.bookings?.clients?.full_name}</p>
                {contract.signed_at ? (
                  <>
                    <p className="sig-date">
                      Signed {new Date(contract.signed_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <span className="sig-signed-badge">Signed</span>
                  </>
                ) : (
                  <p className="sig-date">Date: ___________________</p>
                )}
              </div>
              <div>
                <p className="sig-party-label">Studio representative</p>
                <div className="sig-line" />
                <p className="sig-name">{studio?.name}</p>
                <p className="sig-date">Date: ___________________</p>
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          {studioContact && (
            <div className="footer">
              <p>{studioContact}</p>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
