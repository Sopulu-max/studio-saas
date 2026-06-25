import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getStudioContext, fetchStudio } from '@/lib/studio'
import PrintButton from '@/app/print/invoice/[id]/print-button'

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

export default async function SummaryPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const studio = await fetchStudio(context.admin, context.studioId)

  type BookingRecord = {
    booking_id: string
    session_date?: string | null
    location?: string | null
    created_at?: string | null
    clients?: { full_name?: string | null; email?: string | null; phone?: string | null } | null
    packages?: { name?: string | null; base_price?: number | string | null; package_inclusions?: PackageInclusion[] | null } | null
  }
  
  const { data: bookingRaw } = await context.admin
    .from('bookings')
    .select(`
      *,
      clients ( full_name, email, phone ),
      sessions ( session_date ),
      packages ( name, base_price, package_inclusions ( label, type ) )
    `)
    .eq('booking_id', id)
    .eq('studio_id', context.studioId)
    .single()
    
  const booking = bookingRaw as unknown as BookingRecord | null

  if (!booking) redirect('/dashboard/bookings')

  const { data: addons } = await context.admin
    .from('booking_addons')
    .select('quantity, package_addons(name, price)')
    .eq('booking_id', booking.booking_id)

  const { data: services } = await context.admin
    .from('booking_services')
    .select('quantity, price_at_booking, services(name)')
    .eq('booking_id', booking.booking_id)

  const addonRows = (addons ?? []) as unknown as AddonRow[]
  const serviceRows = (services ?? []) as unknown as ServiceRow[]
  
  const pkgBase = Number(booking.packages?.base_price ?? 0)
  const addonsTotal = addonRows.reduce((sum, addon) => sum + Number(addon.package_addons?.price ?? 0) * addon.quantity, 0)
  const servicesTotal = serviceRows.reduce((sum, svc) => sum + Number(svc.price_at_booking ?? 0) * svc.quantity, 0)
  
  const subtotal = pkgBase + addonsTotal + servicesTotal
  
  const fmt = (n: number) => 'NGN ' + Number(n).toLocaleString('en-NG')
  const shortId = id.slice(-8).toUpperCase()
  
  // The user requested: "The name of the package plus Booking summary"
  const documentTitle = booking.packages?.name ? `${booking.packages.name} - Booking Summary` : 'Booking Summary'

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, sans-serif; color: #111; background: #f0f0f0; }
        .page { max-width: 760px; margin: 0 auto; background: white; padding: 56px 64px; min-height: 100vh; }
        .no-print { margin-bottom: 24px; display: flex; gap: 10px; align-items: center; }
        .divider { border: none; border-top: 1px solid #e5e5e5; margin: 20px 0; }
        .row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; font-size: 13px; }
        .row.total { font-size: 15px; font-weight: 600; border-top: 1px solid #e5e5e5; padding-top: 10px; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { text-align: left; font-size: 11px; color: #888; font-weight: 500; border-bottom: 1px solid #e5e5e5; padding: 6px 0 8px; text-transform: uppercase; letter-spacing: .04em; }
        th:last-child, td:last-child { text-align: right; }
        td { padding: 9px 0; border-bottom: 1px solid #f4f4f4; vertical-align: top; }
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
          <Link href={`/dashboard/bookings/${id}`} style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>
            Back to session
          </Link>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            {studio?.logo_url && (
              <Image
                src={studio.logo_url}
                alt={studio.name ?? ''}
                width={52}
                height={52}
                unoptimized
                style={{ width: '52px', height: '52px', objectFit: 'contain', borderRadius: '6px', flexShrink: 0 }}
              />
            )}
            <div>
              <p style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>{studio?.name}</p>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '2px' }}>{studio?.email}</p>
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '36px' }}>
          <div>
            <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '10px', fontWeight: '500' }}>Prepared For</p>
            <p style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>{booking.clients?.full_name}</p>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '2px' }}>{booking.clients?.email}</p>
            <p style={{ fontSize: '13px', color: '#666' }}>{booking.clients?.phone}</p>
          </div>
          <div>
            <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '10px', fontWeight: '500' }}>Session Details</p>
            {((booking as any).sessions?.[0]?.session_date) && (
              <p style={{ fontSize: '13px', color: '#444', marginBottom: '4px' }}>
                {new Date((booking as any).sessions[0].session_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
            {booking.location && (
              <p style={{ fontSize: '13px', color: '#666' }}>{booking.location}</p>
            )}
          </div>
        </div>

        <table style={{ marginBottom: '20px' }}>
          <thead>
            <tr>
              <th>Description</th>
              <th style={{ width: '80px' }}>Qty</th>
              <th style={{ width: '120px' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {booking.packages && (
              <tr>
                <td style={{ paddingBottom: '16px' }}>
                  <p style={{ fontWeight: '600', marginBottom: '6px', color: '#111' }}>{booking.packages.name}</p>
                  {booking.packages.package_inclusions && booking.packages.package_inclusions.length > 0 && (
                    <ul style={{ paddingLeft: '16px', fontSize: '12px', color: '#555', lineHeight: '1.6' }}>
                      {booking.packages.package_inclusions.map((inc, i) => (
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
