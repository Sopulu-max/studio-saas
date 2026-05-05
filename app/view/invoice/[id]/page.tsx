import Image from 'next/image'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { verifySignedPublicLink } from '@/lib/public-links'
import PublicInvoicePrintButton from './print-button'

type AddonRow = {
  quantity: number
  package_addons?: { name?: string | null; price?: number | string | null } | null
}

type InvoiceBooking = {
  booking_id: string
  session_date?: string | null
  location?: string | null
  clients?: { full_name?: string | null; email?: string | null; phone?: string | null } | null
  packages?: { name?: string | null; base_price?: number | string | null } | null
  studios?: { name?: string | null; email?: string | null; phone?: string | null; address?: string | null; logo_url?: string | null } | null
}

type InvoiceRow = {
  invoice_id: string
  total: number | string | null
  subtotal: number | string | null
  discount: number | string | null
  tax: number | string | null
  status: string | null
  issued_at: string | null
  due_date: string | null
  bookings: InvoiceBooking | null
}

export default async function PublicInvoiceViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ sig?: string; exp?: string }>
}) {
  const { id } = await params
  const { sig, exp } = await searchParams
  if (!verifySignedPublicLink('invoice', id, sig, exp)) notFound()

  const admin = createAdminClient()

  const { data: invoice } = await admin
    .from('invoices')
    .select(`
      *,
      bookings (
        booking_id, session_date, location,
        clients ( full_name, email, phone ),
        packages ( name, base_price ),
        studios ( name, email, phone, address, logo_url )
      )
    `)
    .eq('invoice_id', id)
    .maybeSingle()

  if (!invoice) notFound()

  const typedInvoice = invoice as unknown as InvoiceRow

  type PaymentRow = { payment_id: string; paid_at: string; amount: number | string; method: string; reference?: string | null }
  const { data: paymentsRaw } = await admin
    .from('payments')
    .select('*')
    .eq('invoice_id', id)
    .order('paid_at', { ascending: true })
  const payments = (paymentsRaw ?? []) as unknown as PaymentRow[]

  const booking = typedInvoice.bookings

  const { data: addons } = await admin
    .from('booking_addons')
    .select('quantity, package_addons(name, price)')
    .eq('booking_id', booking?.booking_id ?? '')

  const studio = booking?.studios ?? null
  const client = booking?.clients ?? null
  const pkg = booking?.packages ?? null
  const amountPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
  const balanceDue = Math.max(0, Number(typedInvoice.total) - amountPaid)
  const shortId = id.slice(-8).toUpperCase()
  const fmt = (n: number) => 'NGN ' + Number(n).toLocaleString('en-NG')

  const addonsList = (addons ?? []) as unknown as AddonRow[]
  const addonsTotal = addonsList.reduce((sum, addon) => sum + Number(addon.package_addons?.price ?? 0) * addon.quantity, 0)
  const baseAmount = Number(typedInvoice.subtotal) - addonsTotal

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
        td { padding: 9px 0; border-bottom: 1px solid #f4f4f4; }
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
          <span style={{ fontSize: '13px', color: '#666' }}>
            Invoice from <strong>{studio?.name}</strong>
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
            <p style={{ fontSize: '26px', fontWeight: '300', letterSpacing: '-.02em', color: '#111', marginBottom: '6px' }}>INVOICE</p>
            <p style={{ fontSize: '12px', color: '#888' }}>#{shortId}</p>
            {typedInvoice.issued_at && (
              <p style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                Issued: {new Date(typedInvoice.issued_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
            {typedInvoice.due_date && (
              <p style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                Due: {new Date(typedInvoice.due_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>

        <div className="bill-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '36px' }}>
          <div>
            <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '10px', fontWeight: '500' }}>Bill To</p>
            <p style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>{client?.full_name}</p>
            {client?.email && <p style={{ fontSize: '13px', color: '#666', marginBottom: '2px' }}>{client.email}</p>}
            {client?.phone && <p style={{ fontSize: '13px', color: '#666' }}>{client.phone}</p>}
          </div>
          <div>
            <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '10px', fontWeight: '500' }}>Session</p>
            {booking?.session_date && (
              <p style={{ fontSize: '13px', color: '#444', marginBottom: '4px' }}>
                {new Date(booking.session_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
            {pkg?.name && <p style={{ fontSize: '13px', color: '#444', marginBottom: '4px' }}>{pkg.name}</p>}
            {booking?.location && <p style={{ fontSize: '13px', color: '#666' }}>{booking.location}</p>}
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
            <tr>
              <td>{pkg?.name ?? 'Agreed amount'}</td>
              <td style={{ textAlign: 'right' }}>1</td>
              <td style={{ textAlign: 'right' }}>{fmt(baseAmount)}</td>
            </tr>
            {addonsList.map((addon, index) => (
              <tr key={index}>
                <td style={{ color: '#555' }}>{addon.package_addons?.name}</td>
                <td style={{ textAlign: 'right', color: '#555' }}>{addon.quantity}</td>
                <td style={{ textAlign: 'right', color: '#555' }}>
                  {fmt(Number(addon.package_addons?.price ?? 0) * addon.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ maxWidth: '280px', marginLeft: 'auto', marginBottom: '36px' }}>
          <div className="row"><span style={{ color: '#666' }}>Subtotal</span><span>{fmt(Number(typedInvoice.subtotal))}</span></div>
          {Number(typedInvoice.discount) > 0 && (
            <div className="row"><span style={{ color: '#666' }}>Discount</span><span>-{fmt(Number(typedInvoice.discount))}</span></div>
          )}
          {Number(typedInvoice.tax) > 0 && (
            <div className="row"><span style={{ color: '#666' }}>Tax ({typedInvoice.tax}%)</span><span>{fmt(Number(typedInvoice.subtotal) * Number(typedInvoice.tax) / 100)}</span></div>
          )}
          <div className="row total"><span>Total</span><span>{fmt(Number(typedInvoice.total))}</span></div>
        </div>

        {payments && payments.length > 0 && (
          <>
            <hr className="divider" />
            <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px', fontWeight: '500' }}>Payment History</p>
            {payments.map((payment) => (
              <div key={payment.payment_id} className="row" style={{ marginBottom: '8px' }}>
                <span style={{ color: '#555' }}>
                  {new Date(payment.paid_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {' | '}{payment.method.replace('_', ' ')}
                  {payment.reference ? ` | Ref: ${payment.reference}` : ''}
                </span>
                <span>{fmt(Number(payment.amount))}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '600', color: balanceDue > 0 ? '#a32d2d' : '#3b6d11', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e5e5' }}>
              <span>Balance Due</span>
              <span>{fmt(balanceDue)}</span>
            </div>
          </>
        )}

        <hr className="divider" style={{ marginTop: '48px' }} />
        <p style={{ fontSize: '12px', color: '#aaa', textAlign: 'center', marginTop: '16px' }}>
          Thank you for your business | {studio?.name}
        </p>
      </div>
    </>
  )
}
