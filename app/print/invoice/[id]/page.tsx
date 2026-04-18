import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import PrintButton from './print-button'

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: studio } = await admin
    .from('studios')
    .select('name, email, slug, address, phone, logo_url')
    .eq('owner_id', user.id)
    .single()

  const { data: invoice } = await admin
    .from('invoices')
    .select(`
      *,
      bookings (
        booking_id, session_date, location,
        clients ( full_name, email, phone ),
        packages ( name, base_price )
      )
    `)
    .eq('invoice_id', id)
    .single()

  if (!invoice) redirect('/dashboard/invoices')

  const { data: payments } = await admin
    .from('payments')
    .select('*')
    .eq('invoice_id', id)
    .order('paid_at', { ascending: true })

  const { data: addons } = await admin
    .from('booking_addons')
    .select('quantity, package_addons(name, price)')
    .eq('booking_id', invoice.bookings?.booking_id ?? '')

  const amountPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0
  const balanceDue = Math.max(0, Number(invoice.total) - amountPaid)
  const fmt = (n: number) => '₦' + Number(n).toLocaleString('en-NG')

  const shortId = id.slice(-8).toUpperCase()

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
        td { padding: 9px 0; border-bottom: 1px solid #f4f4f4; }
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
          <a href={`/dashboard/invoices/${id}`} style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>← Back to invoice</a>
        </div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            {studio?.logo_url && (
              <img src={studio.logo_url} alt={studio.name} style={{ width: '52px', height: '52px', objectFit: 'contain', borderRadius: '6px', flexShrink: 0 }} />
            )}
            <div>
              <p style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>{studio?.name}</p>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '2px' }}>{studio?.email}</p>
              {studio?.phone   && <p style={{ fontSize: '13px', color: '#666', marginBottom: '2px' }}>{studio.phone}</p>}
              {studio?.address && <p style={{ fontSize: '13px', color: '#666', whiteSpace: 'pre-line' }}>{studio.address}</p>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '26px', fontWeight: '300', letterSpacing: '-.02em', color: '#111', marginBottom: '6px' }}>INVOICE</p>
            <p style={{ fontSize: '12px', color: '#888' }}>#{shortId}</p>
            {invoice.issued_at && (
              <p style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                Issued: {new Date(invoice.issued_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
            {invoice.due_date && (
              <p style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                Due: {new Date(invoice.due_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>

        {/* Bill To + Session */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '36px' }}>
          <div>
            <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '10px', fontWeight: '500' }}>Bill To</p>
            <p style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>{invoice.bookings?.clients?.full_name}</p>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '2px' }}>{invoice.bookings?.clients?.email}</p>
            <p style={{ fontSize: '13px', color: '#666' }}>{invoice.bookings?.clients?.phone}</p>
          </div>
          <div>
            <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '10px', fontWeight: '500' }}>Session</p>
            {invoice.bookings?.session_date && (
              <p style={{ fontSize: '13px', color: '#444', marginBottom: '4px' }}>
                {new Date(invoice.bookings.session_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
            {invoice.bookings?.location && (
              <p style={{ fontSize: '13px', color: '#666' }}>{invoice.bookings.location}</p>
            )}
          </div>
        </div>

        {/* Line items */}
        <table style={{ marginBottom: '20px' }}>
          <thead>
            <tr>
              <th>Description</th>
              <th style={{ width: '80px' }}>Qty</th>
              <th style={{ width: '120px' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{invoice.bookings?.packages?.name ?? 'Agreed amount'}</td>
              <td style={{ textAlign: 'right' }}>1</td>
              <td style={{ textAlign: 'right' }}>
                {fmt(Number(invoice.subtotal) - (addons?.reduce((s, a) => s + Number((a.package_addons as any)?.price) * a.quantity, 0) ?? 0))}
              </td>
            </tr>
            {addons?.map((a, i) => (
              <tr key={i}>
                <td style={{ color: '#555' }}>{(a.package_addons as any)?.name}</td>
                <td style={{ textAlign: 'right', color: '#555' }}>{a.quantity}</td>
                <td style={{ textAlign: 'right', color: '#555' }}>
                  {fmt(Number((a.package_addons as any)?.price) * a.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ maxWidth: '280px', marginLeft: 'auto', marginBottom: '36px' }}>
          <div className="row"><span style={{ color: '#666' }}>Subtotal</span><span>{fmt(Number(invoice.subtotal))}</span></div>
          {Number(invoice.discount) > 0 && (
            <div className="row"><span style={{ color: '#666' }}>Discount</span><span>-{fmt(Number(invoice.discount))}</span></div>
          )}
          {Number(invoice.tax) > 0 && (
            <div className="row"><span style={{ color: '#666' }}>Tax ({invoice.tax}%)</span><span>{fmt(Number(invoice.subtotal) * Number(invoice.tax) / 100)}</span></div>
          )}
          <div className="row total"><span>Total</span><span>{fmt(Number(invoice.total))}</span></div>
        </div>

        {/* Payments */}
        {payments && payments.length > 0 && (
          <>
            <hr className="divider" />
            <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px', fontWeight: '500' }}>Payment History</p>
            {payments.map((p) => (
              <div key={p.payment_id} className="row" style={{ marginBottom: '8px' }}>
                <span style={{ color: '#555' }}>
                  {new Date(p.paid_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {' · '}{p.method.replace('_', ' ')}
                  {p.reference ? ` · Ref: ${p.reference}` : ''}
                </span>
                <span>{fmt(Number(p.amount))}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '600', color: balanceDue > 0 ? '#a32d2d' : '#3b6d11', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e5e5' }}>
              <span>Balance Due</span>
              <span>{fmt(balanceDue)}</span>
            </div>
          </>
        )}

        {/* Footer */}
        <hr className="divider" style={{ marginTop: '48px' }} />
        <p style={{ fontSize: '12px', color: '#aaa', textAlign: 'center', marginTop: '16px' }}>
          Thank you for your business · {studio?.name}
        </p>
      </div>
    </>
  )
}
