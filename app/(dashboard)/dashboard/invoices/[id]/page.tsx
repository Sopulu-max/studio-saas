import { redirect } from 'next/navigation'
import InvoiceActions from './invoice-actions'
import { getStudioContext } from '@/lib/studio'

type InvoiceAddonRelation = {
  quantity: number
  package_addons?: { name?: string | null; price?: number | string | null } | null
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const { data: invoice } = await context.admin
    .from('invoices')
    .select(`
      *,
      bookings!inner (
        booking_id, session_date, location, notes, status, studio_id,
        clients ( full_name, email, phone ),
        packages ( name, base_price ),
        booking_staff ( role, staff ( full_name ) )
      )
    `)
    .eq('invoice_id', id)
    .eq('bookings.studio_id', context.studioId)
    .single()

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

  const amountPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0
  const balanceDue = Number(invoice.total) - amountPaid

  const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
    draft:     { bg: '#f1efe8', color: '#5f5e5a' },
    sent:      { bg: '#e6f1fb', color: '#185fa5' },
    paid:      { bg: '#eaf3de', color: '#3b6d11' },
    overdue:   { bg: '#fcebeb', color: '#a32d2d' },
    cancelled: { bg: '#f1efe8', color: '#5f5e5a' },
  }
  const s = STATUS_COLORS[invoice.status ?? ''] ?? STATUS_COLORS.draft

  return (
    <div style={{ maxWidth: '640px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>Invoice</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>
            {invoice.bookings?.clients?.full_name} · {invoice.bookings?.packages?.name}
          </p>
        </div>
        <span style={{ fontSize: '13px', padding: '4px 12px', borderRadius: '20px', background: s.bg, color: s.color, fontWeight: '500' }}>
          {invoice.status}
        </span>
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
                : '—'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Location</p>
            <p style={{ fontSize: '14px', margin: 0 }}>{invoice.bookings?.location || '—'}</p>
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
                : '—'}
            </p>
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', margin: '0 0 12px', color: 'var(--text-3)' }}>BREAKDOWN</p>

        {/* Agreed / base amount line */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
          <span>{invoice.bookings?.packages?.name ?? 'Agreed amount'}</span>
          <span>₦{(Number(invoice.subtotal) - ((addons as InvoiceAddonRelation[] | null)?.reduce((sum, addon) => sum + Number(addon.package_addons?.price) * addon.quantity, 0) ?? 0)).toLocaleString()}</span>
        </div>

        {(addons as InvoiceAddonRelation[] | null)?.map((a, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--text-3)', marginBottom: '8px' }}>
            <span>{a.package_addons?.name} × {a.quantity}</span>
            <span>₦{(Number(a.package_addons?.price) * a.quantity).toLocaleString()}</span>
          </div>
        ))}

        <div style={{ borderTop: '1px solid var(--line-inner)', marginTop: '8px', paddingTop: '8px' }}>
          {[
            { label: 'Subtotal', value: Number(invoice.subtotal) },
            { label: 'Discount', value: -Number(invoice.discount) },
            { label: `Tax (${invoice.tax}%)`, value: Number(invoice.subtotal) * Number(invoice.tax) / 100 },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-3)', marginBottom: '6px' }}>
              <span>{row.label}</span>
              <span>{row.value < 0 ? '-' : ''}₦{Math.abs(row.value).toLocaleString()}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '500', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--line-inner)' }}>
            <span>Total</span>
            <span>₦{Number(invoice.total).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', margin: '0 0 12px', color: 'var(--text-3)' }}>PAYMENTS</p>

        {!payments?.length ? (
          <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: '0 0 12px' }}>No payments recorded yet</p>
        ) : (
          <div style={{ marginBottom: '12px' }}>
            {payments.map((p, i) => (
              <div key={p.payment_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < payments.length - 1 ? '1px solid var(--line-inner)' : 'none' }}>
                <div>
                  <p style={{ fontSize: '14px', margin: '0 0 2px' }}>₦{Number(p.amount).toLocaleString()}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: 0 }}>
                    {p.method} · {new Date(p.paid_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {p.reference ? ` · Ref: ${p.reference}` : ''}
                  </p>
                </div>
                <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: '#eaf3de', color: '#3b6d11', fontWeight: '500' }}>paid</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
          <span style={{ color: 'var(--text-3)' }}>Amount paid</span>
          <span>₦{amountPaid.toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: '500', color: balanceDue > 0 ? '#a32d2d' : '#3b6d11' }}>
          <span>Balance due</span>
          <span>₦{Math.max(0, balanceDue).toLocaleString()}</span>
        </div>
      </div>

      <InvoiceActions
        invoiceId={id}
        currentStatus={invoice.status}
        balanceDue={balanceDue}
      />
    </div>
  )
}
