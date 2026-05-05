import Image from 'next/image'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { verifySignedPublicLink } from '@/lib/public-links'

type ContractBooking = {
  session_date?: string | null
  location_address?: string | null
  clients?: { full_name?: string | null; email?: string | null } | null
  packages?: { name?: string | null } | null
  studios?: { name?: string | null; email?: string | null; phone?: string | null; address?: string | null; logo_url?: string | null } | null
}

export default async function PublicContractViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ sig?: string; exp?: string }>
}) {
  const { id } = await params
  const { sig, exp } = await searchParams
  if (!verifySignedPublicLink('contract', id, sig, exp)) notFound()

  const admin = createAdminClient()

  const { data: contract } = await admin
    .from('contracts')
    .select(`
      *,
      bookings (
        session_date, location_address,
        clients ( full_name, email ),
        packages ( name ),
        studios ( name, email, phone, address, logo_url )
      )
    `)
    .eq('contract_id', id)
    .maybeSingle()

  if (!contract) notFound()

  type ContractRow = {
    contract_id: string
    status: string | null
    content: string | null
    signed_by: string | null
    signed_at: string | null
    bookings: ContractBooking | null
  }
  const typedContract = contract as unknown as ContractRow
  const booking = typedContract.bookings
  const studio = booking?.studios ?? null
  const client = booking?.clients ?? null
  const pkg = booking?.packages ?? null

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, -apple-system, sans-serif; color: #111; background: #f0f0f0; }
        .page { max-width: 760px; margin: 0 auto; background: white; padding: 56px 64px; min-height: 100vh; }
        .toolbar { margin-bottom: 28px; display: flex; gap: 12px; align-items: center; background: #f8f8f8; padding: 14px 20px; border-radius: 10px; border: 1px solid #e5e5e5; }
        .divider { border: none; border-top: 1px solid #e5e5e5; margin: 28px 0; }
        .sig-row { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 16px; }
        .sig-block p { font-size: 12px; color: #888; margin-bottom: 6px; }
        .sig-line { border-bottom: 1px solid #888; height: 36px; margin-bottom: 8px; }
        .sig-name { font-size: 12px; color: #555; }
        .save-btn {
          padding: 9px 20px; font-size: 13px; font-weight: 600;
          background: #111; color: white; border: none; border-radius: 8px;
          cursor: pointer; font-family: inherit;
        }
        .save-btn:hover { opacity: 0.82; }
        @media print {
          body { background: white; }
          .toolbar { display: none !important; }
          .page { padding: 0; min-height: auto; }
          @page { margin: 1.5cm 1.8cm; size: A4; }
        }
      `}</style>

      <div className="page">
        <div className="toolbar">
          <button className="save-btn" onClick={() => {}} id="print-btn">
            Save as PDF
          </button>
          <span style={{ fontSize: '13px', color: '#888' }}>
            Use your browser&apos;s Save as PDF option when the print dialog opens.
          </span>
        </div>
        <script dangerouslySetInnerHTML={{ __html: `
          document.getElementById('print-btn').addEventListener('click', function() {
            window.print();
          });
        `}} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {studio?.logo_url && (
              <Image
                src={studio.logo_url}
                alt={studio?.name ?? 'Studio logo'}
                width={44}
                height={44}
                unoptimized
                style={{ height: '44px', width: '44px', objectFit: 'cover', borderRadius: '8px' }}
              />
            )}
            <div>
              <p style={{ fontSize: '20px', fontWeight: '700', marginBottom: '2px' }}>{studio?.name}</p>
              <p style={{ fontSize: '13px', color: '#666' }}>{studio?.email}</p>
              {studio?.phone && <p style={{ fontSize: '12px', color: '#888' }}>{studio.phone}</p>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '22px', fontWeight: '300', letterSpacing: '-.02em', color: '#111' }}>CONTRACT</p>
            <p style={{ fontSize: '12px', color: '#888', marginTop: '6px' }}>
              {booking?.session_date
                ? new Date(booking.session_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
                : ''}
            </p>
            <span style={{
              display: 'inline-block', marginTop: '8px', fontSize: '11px', fontWeight: '600',
              padding: '3px 10px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '.04em',
              background: typedContract.status === 'signed' ? '#eaf3de' : typedContract.status === 'sent' ? '#e6f1fb' : '#f1efe8',
              color: typedContract.status === 'signed' ? '#3b6d11' : typedContract.status === 'sent' ? '#185fa5' : '#5f5e5a',
            }}>
              {typedContract.status}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '36px' }}>
          <div>
            <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '10px', fontWeight: '600' }}>Client</p>
            <p style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>{client?.full_name}</p>
            <p style={{ fontSize: '13px', color: '#666' }}>{client?.email}</p>
          </div>
          <div>
            <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '10px', fontWeight: '600' }}>Session</p>
            {pkg?.name && <p style={{ fontSize: '13px', color: '#444', marginBottom: '4px' }}>{pkg.name}</p>}
            {booking?.location_address && (
              <p style={{ fontSize: '13px', color: '#666' }}>{booking.location_address}</p>
            )}
          </div>
        </div>

        <hr className="divider" />

        <div style={{ marginBottom: '48px' }}>
          {(typedContract.content ?? '').split('\n').map((line: string, index: number) => (
            <p key={index} style={{ fontSize: '13px', lineHeight: '1.8', color: '#333', marginBottom: line ? '0' : '12px' }}>
              {line || <>&nbsp;</>}
            </p>
          ))}
        </div>

        <hr className="divider" />

        <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '16px', fontWeight: '600' }}>Signatures</p>
        <div className="sig-row">
          <div className="sig-block">
            <p>Client signature</p>
            <div className="sig-line" />
            <p className="sig-name">{typedContract.signed_by || client?.full_name}</p>
            {typedContract.signed_at && (
              <p style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>
                Signed {new Date(typedContract.signed_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
          <div className="sig-block">
            <p>Studio representative</p>
            <div className="sig-line" />
            <p className="sig-name">{studio?.name}</p>
          </div>
        </div>

        {studio?.address && (
          <>
            <hr className="divider" />
            <p style={{ fontSize: '11px', color: '#aaa', textAlign: 'center' }}>{studio.address}</p>
          </>
        )}
      </div>
    </>
  )
}
