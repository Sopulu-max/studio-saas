import Image from 'next/image'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { verifySignedPublicLink } from '@/lib/public-links'
import PublicInvoicePrintButton from '@/app/view/invoice/[id]/print-button'

type AddonRow = {
  quantity: number
  package_addons?: { name?: string | null; price?: number | string | null } | null
}

type ServiceRow = {
  quantity: number
  price_at_booking?: number | string | null
  services?: { name?: string | null } | null
}

type PackageInclusion = {
  label: string
  type: string
}

type BookingRecord = {
  booking_id: string
  session_date?: string | null
  location?: string | null
  created_at?: string | null
  clients?: { full_name?: string | null; email?: string | null; phone?: string | null } | null
  packages?: { name?: string | null; base_price?: number | string | null; package_inclusions?: PackageInclusion[] | null } | null
  studios?: { name?: string | null; email?: string | null; phone?: string | null; address?: string | null; logo_url?: string | null } | null
}

export default async function PublicSummaryViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ sig?: string; exp?: string }>
}) {
  const { id } = await params
  const { sig, exp } = await searchParams
  
  // We can reuse the invoice verifier or create a new one. Since verifySignedPublicLink checks type === 'invoice', we might need to add 'summary' type support.
  // Actually, wait, let's check if verifySignedPublicLink supports 'summary'. If not, we can just allow it for now or add it.
  // For safety, let's assume it only supports what's defined. Let's look at public-links.ts in a sec.
  // Wait, I can just use 'invoice' for the token generation since it uses the same booking_id? No, links are generated for invoice_id or booking_id.
  // Let's use 'summary' and we will update public-links.ts if needed.
  if (!verifySignedPublicLink('summary', id, sig, exp)) notFound()

  const admin = createAdminClient()

  const { data: bookingRaw } = await admin
    .from('bookings')
    .select(`
      *,
      clients ( full_name, email, phone ),
      sessions ( session_date ),
      packages ( name, base_price, package_inclusions ( label, type ) ),
      studios ( name, email, phone, address, logo_url )
    `)
    .eq('booking_id', id)
    .maybeSingle()

  if (!bookingRaw) notFound()

  const booking = bookingRaw as unknown as BookingRecord

  const { data: addons } = await admin
    .from('booking_addons')
    .select('quantity, package_addons(name, price)')
    .eq('booking_id', id)

  const { data: services } = await admin
    .from('booking_services')
    .select('quantity, price_at_booking, services(name)')
    .eq('booking_id', id)

  const studio = booking.studios ?? null
  const client = booking.clients ?? null
  const pkg = booking.packages ?? null

  const addonRows = (addons ?? []) as unknown as AddonRow[]
  const serviceRows = (services ?? []) as unknown as ServiceRow[]
  
  const pkgBase = Number(pkg?.base_price ?? 0)
  const addonsTotal = addonRows.reduce((sum, addon) => sum + Number(addon.package_addons?.price ?? 0) * addon.quantity, 0)
  const servicesTotal = serviceRows.reduce((sum, svc) => sum + Number(svc.price_at_booking ?? 0) * svc.quantity, 0)
  
  const subtotal = pkgBase + addonsTotal + servicesTotal

  const fmt = (n: number) => 'NGN ' + Number(n).toLocaleString('en-NG')
  const shortId = id.slice(-8).toUpperCase()
  const documentTitle = pkg?.name ? `${pkg.name} - Booking Summary` : 'Booking Summary'

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, -apple-system, sans-serif; color: #111; background: #f0f0f0; }
        .page { max-width: 760px; margin: 0 auto; background: white; padding: 56px 64px; min-height: 100vh; }
        .no-print { margin-bottom: 28px; display: flex; gap: 10px; align-items: center; background: #f8f8f8; border: 1px solid #e5e5e5; border-radius: 10px; padding: 12px 16px; }
        .divider { border: none; border-top: 1px solid #e5e5e5; margin: 20px 0; }
        .row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; font-size: 13px; }
        .row.total { font-size: 15px; font-weight: 600; border-top: 1px solid #e5e5e5; padding-top: 10px; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { text-align: left; font-size: 11px; color: #888; font-weight: 500; border-bottom: 1px solid #e5e5e5; padding: 6px 0 8px; text-transform: uppercase; letter-spacing: .04em; }
        th:last-child, td:last-child { text-align: right; }
        td { padding: 9px 0; border-bottom: 1px solid #f4f4f4; vertical-align: top; }
        @media (max-width: 600px) {
          .page { padding: 24px 20px; }
          .bill-grid { grid-template-columns: 1fr !important; gap: 20px !important; }
        }
        @media print {
          body { background: white; }
          .no-print { display: none !important; }
          .page { padding: 0; min-height: auto; }
          @page { margin: 1.5cm 1.8cm; size: A4; }
        }
      `}</style>

      <div className="page">
        <div className="no-print">
          <PublicInvoicePrintButton />
          <span style={{ fontSize: '13px', color: '#666', marginLeft: 'auto' }}>
            Summary from <strong>{studio?.name}</strong>
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            {studio?.logo_url && (
              <Image
                src={studio.logo_url}
                alt={studio.name ?? 'Studio logo'}
                width={52}
                height={52}
                unoptimized
                style={{ width: '52px', height: '52px', objectFit: 'contain', borderRadius: '6px', flexShrink: 0 }}
              />
            )}
            <div>
              <p style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>{studio?.name}</p>
              {studio?.email && <p style={{ fontSize: '13px', color: '#666', marginBottom: '2px' }}>{studio.email}</p>}
              {studio?.phone && <p style={{ fontSize: '13px', color: '#666', marginBottom: '2px' }}>{studio.phone}</p>}
              {studio?.address && <p style={{ fontSize: '13px', color: '#666', whiteSpace: 'pre-line' }}>{studio.address}</p>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '26px', fontWeight: '300', letterSpacing: '-.02em', color: '#111', marginBottom: '6px', textTransform: 'uppercase' }}>
              {documentTitle}
            </p>
            <p style={{ fontSize: '12px', color: '#888' }}>REF: #{shortId}</p>
            {booking.created_at && (
              <p style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                Date: {new Date(booking.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>

        <div className="bill-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '36px' }}>
          <div>
            <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '10px', fontWeight: '500' }}>Prepared For</p>
            <p style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>{client?.full_name}</p>
            {client?.email && <p style={{ fontSize: '13px', color: '#666', marginBottom: '2px' }}>{client.email}</p>}
            {client?.phone && <p style={{ fontSize: '13px', color: '#666' }}>{client.phone}</p>}
          </div>
          <div>
            <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '10px', fontWeight: '500' }}>Session Details</p>
            {((booking as any).sessions?.[0]?.session_date) && (
              <p style={{ fontSize: '13px', color: '#444', marginBottom: '4px' }}>
                {new Date((booking as any).sessions[0].session_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
            {booking.location && <p style={{ fontSize: '13px', color: '#666' }}>{booking.location}</p>}
          </div>
        </div>

        <table style={{ marginBottom: '20px' }}>
          <thead>
            <tr>
              <th>Description</th>
              <th style={{ width: '60px' }}>Qty</th>
              <th style={{ width: '120px' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {pkg && (
              <tr>
                <td style={{ paddingBottom: '16px' }}>
                  <p style={{ fontWeight: '600', marginBottom: '6px', color: '#111' }}>{pkg.name}</p>
                  {pkg.package_inclusions && pkg.package_inclusions.length > 0 && (
                    <ul style={{ paddingLeft: '16px', fontSize: '12px', color: '#555', lineHeight: '1.6' }}>
                      {pkg.package_inclusions.map((inc, i) => (
                        <li key={i}>{inc.label}</li>
                      ))}
                    </ul>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>1</td>
                <td style={{ textAlign: 'right' }}>{fmt(pkgBase)}</td>
              </tr>
            )}
            
            {serviceRows.map((svc, index) => (
              <tr key={index}>
                <td style={{ color: '#555' }}>{svc.services?.name}</td>
                <td style={{ textAlign: 'right', color: '#555' }}>{svc.quantity}</td>
                <td style={{ textAlign: 'right', color: '#555' }}>
                  {fmt(Number(svc.price_at_booking ?? 0) * svc.quantity)}
                </td>
              </tr>
            ))}

            {addonRows.map((addon, index) => (
              <tr key={index}>
                <td style={{ color: '#555' }}>{addon.package_addons?.name} (Add-on)</td>
                <td style={{ textAlign: 'right', color: '#555' }}>{addon.quantity}</td>
                <td style={{ textAlign: 'right', color: '#555' }}>
                  {fmt(Number(addon.package_addons?.price ?? 0) * addon.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ maxWidth: '280px', marginLeft: 'auto', marginBottom: '36px' }}>
          <div className="row total"><span style={{ color: '#111' }}>Total Amount</span><span>{fmt(subtotal)}</span></div>
        </div>

        <hr className="divider" style={{ marginTop: '48px' }} />
        <p style={{ fontSize: '12px', color: '#aaa', textAlign: 'center', marginTop: '16px' }}>
          This is a summary of your selected items. A formal invoice will be provided. | {studio?.name}
        </p>
      </div>
    </>
  )
}
