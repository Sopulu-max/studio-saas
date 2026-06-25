import Link from 'next/link'
import { redirect } from 'next/navigation'
import InvoiceActions from './invoice-actions'
import { getStudioContext } from '@/lib/studio'
import { buildSignedPublicLink } from '@/lib/public-links'
import { sessionName } from '@/lib/session-title'

import { getInvoiceDetail } from '@/lib/domains/invoices/repository'

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const invoice = await getInvoiceDetail(context.admin, context.studioId, id)

  if (!invoice) redirect('/dashboard/invoices')

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
            {invoice.client.client_id ? (
              <Link href={`/dashboard/clients/${invoice.client.client_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                {invoice.client.full_name}
              </Link>
            ) : (invoice.client.full_name)}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>
            <span style={{ fontFamily: 'monospace', fontSize: '13px', letterSpacing: '0.02em' }}>{invoice.session.session_name}</span>
            {invoice.session.package_name ? ` · ${invoice.session.package_name}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Link
            href={clientViewUrl}
            target="_blank"
            rel="noreferrer"
            className="glass-panel hover-lift" style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none', padding: '4px 10px' }}
          >
            Client view
          </Link>
          <span style={{ fontSize: '13px', padding: '4px 12px', borderRadius: '20px', background: statusStyle.bg, color: statusStyle.color, fontWeight: '500' }}>
            {invoice.status}
          </span>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', margin: '0 0 12px', color: 'var(--text-3)' }}>CLIENT</p>
        {invoice.client.client_id ? (
          <Link href={`/dashboard/clients/${invoice.client.client_id}`} style={{ fontSize: '15px', fontWeight: '500', display: 'block', margin: '0 0 4px', color: 'inherit', textDecoration: 'none' }}>
            {invoice.client.full_name}
          </Link>
        ) : (
          <p style={{ fontSize: '15px', fontWeight: '500', margin: '0 0 4px' }}>{invoice.client.full_name}</p>
        )}
        <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 2px' }}>{invoice.client.email}</p>
        <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>{invoice.client.phone}</p>
        {invoice.client.client_id && (
          <div style={{ borderTop: '1px solid var(--line-inner)', marginTop: '12px', paddingTop: '12px' }}>
            <Link href={`/dashboard/clients/${invoice.client.client_id}`} style={{ fontSize: '13px', color: 'var(--link)', textDecoration: 'none' }}>
              View client →
            </Link>
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', margin: '0 0 12px', color: 'var(--text-3)' }}>SESSION</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Date</p>
            <p style={{ fontSize: '14px', margin: 0 }}>
              {invoice.session.session_date
                ? new Date(invoice.session.session_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
                : '-'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Location</p>
            <p style={{ fontSize: '14px', margin: 0 }}>{invoice.session.location || '-'}</p>
          </div>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Package</p>
            {invoice.session.package_id ? (
              <Link href={`/dashboard/packages/${invoice.session.package_id}`} style={{ fontSize: '14px', display: 'block', margin: 0, color: 'inherit', textDecoration: 'none' }}>
                {invoice.session.package_name ?? '—'}
              </Link>
            ) : (
              <p style={{ fontSize: '14px', margin: 0 }}>{invoice.session.package_name ?? '—'}</p>
            )}
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
        {invoice.session.booking_id && (
          <div style={{ borderTop: '1px solid var(--line-inner)', marginTop: '12px', paddingTop: '12px' }}>
            <Link href={`/dashboard/bookings/${invoice.session.booking_id}`} style={{ fontSize: '13px', color: 'var(--link)', textDecoration: 'none' }}>
              View session →
            </Link>
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', margin: '0 0 12px', color: 'var(--text-3)' }}>BREAKDOWN</p>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
          <span>{invoice.session.package_name ?? 'Agreed amount'}</span>
          <span>NGN {(invoice.breakdown.subtotal - invoice.breakdown.addons.reduce((sum, addon) => sum + addon.price * addon.quantity, 0)).toLocaleString('en-NG')}</span>
        </div>

        {invoice.breakdown.addons.map((addon, index) => (
          <div key={index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--text-3)', marginBottom: '8px' }}>
            <span>{addon.name} x {addon.quantity}</span>
            <span>NGN {(addon.price * addon.quantity).toLocaleString('en-NG')}</span>
          </div>
        ))}

        <div style={{ borderTop: '1px solid var(--line-inner)', marginTop: '8px', paddingTop: '8px' }}>
          {[
            { label: 'Subtotal', value: invoice.breakdown.subtotal },
            { label: 'Discount', value: -invoice.breakdown.discount },
            { label: `Tax (${invoice.breakdown.tax_percentage}%)`, value: invoice.breakdown.tax_amount },
          ].map((row) => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-3)', marginBottom: '6px' }}>
              <span>{row.label}</span>
              <span>{row.value < 0 ? '-' : ''}NGN {Math.abs(row.value).toLocaleString('en-NG')}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '500', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--line-inner)' }}>
            <span>Total</span>
            <span>NGN {invoice.breakdown.total.toLocaleString('en-NG')}</span>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', margin: '0 0 12px', color: 'var(--text-3)' }}>PAYMENTS</p>

        {!invoice.payments?.length ? (
          <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: '0 0 12px' }}>No payments recorded yet</p>
        ) : (
          <div style={{ marginBottom: '12px' }}>
            {invoice.payments.map((payment, index) => (
              <div key={payment.payment_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: index < invoice.payments.length - 1 ? '1px solid var(--line-inner)' : 'none' }}>
                <div>
                  <p style={{ fontSize: '14px', margin: '0 0 2px' }}>NGN {payment.amount.toLocaleString('en-NG')}</p>
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
          <span>NGN {invoice.amount_paid.toLocaleString('en-NG')}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: '500', color: invoice.balance_due > 0 ? '#a32d2d' : '#3b6d11' }}>
          <span>Balance due</span>
          <span>NGN {invoice.balance_due.toLocaleString('en-NG')}</span>
        </div>
      </div>

      <InvoiceActions
        invoiceId={id}
        currentStatus={invoice.status}
        balanceDue={invoice.balance_due}
        total={invoice.breakdown.total}
        clientPhone={invoice.client.phone}
        publicLink={clientViewUrl}
      />
    </div>
  )
}
