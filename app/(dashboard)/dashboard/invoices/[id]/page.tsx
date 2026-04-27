import Link from 'next/link'
import { redirect } from 'next/navigation'
import InvoiceActions from './invoice-actions'
import { getStudioContext } from '@/lib/studio'
import { buildSignedPublicLink } from '@/lib/public-links'
import { sessionName } from '@/lib/session-title'

type InvoiceAddonRelation = {
  quantity: number
  package_addons?: { name?: string | null; price?: number | string | null } | null
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  type InvoiceRecord = {
    invoice_id: string
    total?: number | string | null
    subtotal?: number | string | null
    discount?: number | string | null
    tax?: number | string | null
    status?: string | null
    due_date?: string | null
    issued_at?: string | null
    bookings?: {
      booking_id?: string | null
      booking_ref?: number | null
      session_date?: string | null
      location?: string | null
      notes?: string | null
      status?: string | null
      studio_id?: string | null
      clients?: { full_name?: string | null; email?: string | null; phone?: string | null } | null
      packages?: { name?: string | null; base_price?: number | string | null } | null
    } | null
  }
  const { data: invoiceRaw } = await context.admin
    .from('invoices')
    .select(`
      *,
      bookings!inner (
        booking_id, booking_ref, session_date, location, notes, status, studio_id,
        clients ( full_name, email, phone ),
        packages ( name, base_price ),
        booking_staff ( role, staff ( full_name ) )
      )
    `)
    .eq('invoice_id', id)
    .eq('bookings.studio_id', context.studioId)
    .single()
  const invoice = invoiceRaw as unknown as InvoiceRecord | null

  if (!invoice) redirect('/dashboard/invoices')

  const { data: payments } = await context.admin
    .from('payments')
    .select('*')
    .eq('invoice_id', id)
    .order('paid_at', { ascending: false })

  const { data: addons } = await context.admin
    .from('booking_addons')
    .select('quantity, package_addons(name, price)')
    .eq('booking_id', invoice.bookings?.booking_id ?? '')

  const amountPaid = payments?.reduce((sum, payment) => sum + Number(payment.amount), 0) ?? 0
  const balanceDue = Number(invoice.total) - amountPaid

  const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
    draft:     { bg: '#f1efe8', color: '#5f5e5a' },
    sent:      { bg: '#e6f1fb', color: '#185fa5' },
    paid:      { bg: '#eaf3de', color: '#3b6d11' },
    overdue:   { bg: '#fcebeb', color: '#a32d2d' },
    cancelled: { bg: '#f1efe8', color: '#5f5e5a' },
  }
  const statusStyle = STATUS_COLORS[invoice.status ?? ''] ?? STATUS_COLORS.draft

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const clientViewUrl = buildSignedPublicLink('invoice', id, siteUrl)

  return (
    <div style={{ maxWidth: '640px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', margin: '0 0 4px' }}>
            {invoice.bookings?.clients?.full_name ?? '—'}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>
            <span style={{ fontFamily: 'monospace', fontSize: '13px', letterSpacing: '0.02em' }}>{sessionName(invoice.bookings?.clients?.full_name, invoice.bookings?.booking_ref, invoice.bookings?.booking_id, invoice.bookings?.session_date)}</span>
            {invoice.bookings?.packages?.name ? ` · ${invoice.bookings.packages.name}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Link
            href={clientViewUrl}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none', padding: '4px 10px', border: '1px solid var(--line)', borderRadius: '8px', background: 'var(--surface)' }}
          >
            Client view
          </Link>
          <span style={{ fontSize: '13px', padding: '4px 12px', borderRadius: '20px', background: statusStyle.bg, color: statusStyle.color, fontWeight: '500' }}>
            {invoice.status}
          </span>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', margin: '0 0 12px', color: 'var(--text-3)' }}>CLIENT</p>
        <p style={{ fontSize: '15px', fontWeight: '500', margin: '0 0 4px' }}>{invoice.bookings?.clients?.full_name}</p>
        <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 2px' }}>{invoice.bookings?.clients?.email}</p>
        <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>{invoice.bookings?.clients?.phone}</p>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', margin: '0 0 12px', color: 'var(--text-3)' }}>SESSION</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Date</p>
            <p style={{ fontSize: '14px', margin: 0 }}>
              {invoice.bookings?.session_date
                ? new Date(invoice.bookings.session_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
                : '-'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Location</p>
            <p style={{ fontSize: '14px', margin: 0 }}>{invoice.bookings?.location || '-'}</p>
          </div>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Package</p>
            <p style={{ fontSize: '14px', margin: 0 }}>{invoice.bookings?.packages?.name}</p>
          </div>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Due date</p>
            <p style={{ fontSize: '14px', margin: 0 }}>
              {invoice.due_date
                ? new Date(invoice.due_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
                : '-'}
            </p>
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', margin: '0 0 12px', color: 'var(--text-3)' }}>BREAKDOWN</p>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
          <span>{invoice.bookings?.packages?.name ?? 'Agreed amount'}</span>
          <span>NGN {(Number(invoice.subtotal) - ((addons as unknown as InvoiceAddonRelation[] | null)?.reduce((sum, addon) => sum + Number(addon.package_addons?.price) * addon.quantity, 0) ?? 0)).toLocaleString('en-NG')}</span>
        </div>

        {(addons as unknown as InvoiceAddonRelation[] | null)?.map((addon, index) => (
          <div key={index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--text-3)', marginBottom: '8px' }}>
            <span>{addon.package_addons?.name} x {addon.quantity}</span>
            <span>NGN {(Number(addon.package_addons?.price) * addon.quantity).toLocaleString('en-NG')}</span>
          </div>
        ))}

        <div style={{ borderTop: '1px solid var(--line-inner)', marginTop: '8px', paddingTop: '8px' }}>
          {[
            { label: 'Subtotal', value: Number(invoice.subtotal) },
            { label: 'Discount', value: -Number(invoice.discount) },
            { label: `Tax (${invoice.tax}%)`, value: Number(invoice.subtotal) * Number(invoice.tax) / 100 },
          ].map((row) => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-3)', marginBottom: '6px' }}>
              <span>{row.label}</span>
              <span>{row.value < 0 ? '-' : ''}NGN {Math.abs(row.value).toLocaleString('en-NG')}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '500', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--line-inner)' }}>
            <span>Total</span>
            <span>NGN {Number(invoice.total).toLocaleString('en-NG')}</span>
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', margin: '0 0 12px', color: 'var(--text-3)' }}>PAYMENTS</p>

        {!payments?.length ? (
          <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: '0 0 12px' }}>No payments recorded yet</p>
        ) : (
          <div style={{ marginBottom: '12px' }}>
            {payments.map((payment, index) => (
              <div key={payment.payment_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: index < payments.length - 1 ? '1px solid var(--line-inner)' : 'none' }}>
                <div>
                  <p style={{ fontSize: '14px', margin: '0 0 2px' }}>NGN {Number(payment.amount).toLocaleString('en-NG')}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: 0 }}>
                    {payment.method} | {new Date(payment.paid_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {payment.reference ? ` | Ref: ${payment.reference}` : ''}
                  </p>
                </div>
                <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: '#eaf3de', color: '#3b6d11', fontWeight: '500' }}>paid</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
          <span style={{ color: 'var(--text-3)' }}>Amount paid</span>
          <span>NGN {amountPaid.toLocaleString('en-NG')}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: '500', color: balanceDue > 0 ? '#a32d2d' : '#3b6d11' }}>
          <span>Balance due</span>
          <span>NGN {Math.max(0, balanceDue).toLocaleString('en-NG')}</span>
        </div>
      </div>

      <InvoiceActions
        invoiceId={id}
        currentStatus={invoice.status ?? ''}
        balanceDue={balanceDue}
      />
    </div>
  )
}
