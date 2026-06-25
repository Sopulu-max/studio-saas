import Link from 'next/link'
import WhatsAppActions from '../whatsapp-actions'
import QuickPayment from '../quick-payment'
import type { BookingDetailDTO } from '@/lib/domains/bookings/types'

export default function CommercialModule({ session }: { session: BookingDetailDTO }) {
  const invoice = session.invoice
  const contract = session.contract
  const amountPaid = invoice?.amount_paid ?? 0
  const balanceDue = invoice?.balance_due ?? 0

  return (
    <div className="glass-panel animate-enter" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      {/* Header */}
      <div>
        <p className="label-mini">Commercial Overview</p>
        <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 4px' }}>
          {session.client_id ? (
            <Link href={`/dashboard/clients/${session.client_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
              {session.client_name ?? 'Unknown Client'}
            </Link>
          ) : (session.client_name ?? 'Unknown Client')}
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>
          {session.client_email} {session.client_phone ? `· ${session.client_phone}` : ''}
        </p>
      </div>

      {/* Invoice Section */}
      <div style={{ background: 'var(--surface-2)', borderRadius: '12px', padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <p className="label-mini" style={{ margin: 0 }}>Invoice</p>
          {invoice ? (
            <Link href={`/dashboard/invoices/${invoice.invoice_id}`} style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none' }}>View →</Link>
          ) : (
            <Link href={`/dashboard/invoices/new?session=${session.booking_id}`} style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none' }}>Create →</Link>
          )}
        </div>
        {invoice ? (
          <>
            <p style={{ fontSize: '20px', fontWeight: '500', margin: '0 0 4px' }}>₦{Number(invoice.total).toLocaleString()}</p>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0, textTransform: 'capitalize' }}>
              {invoice.status} {balanceDue > 0 ? `· ₦${balanceDue.toLocaleString()} due` : ''}
            </p>
            {balanceDue > 0 && invoice.status !== 'cancelled' && (
              <div style={{ marginTop: '12px' }}>
                <QuickPayment invoiceId={invoice.invoice_id} balanceDue={balanceDue} />
              </div>
            )}
          </>
        ) : (
          <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>No invoice generated yet.</p>
        )}
      </div>

      {/* Contract Section */}
      <div style={{ background: 'var(--surface-2)', borderRadius: '12px', padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <p className="label-mini" style={{ margin: 0 }}>Contract</p>
          {contract ? (
            <Link href={`/dashboard/contracts/${contract.contract_id}`} style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none' }}>View →</Link>
          ) : (
            <Link href={`/dashboard/contracts/new?session=${session.booking_id}`} style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none' }}>Create →</Link>
          )}
        </div>
        {contract ? (
          <p style={{ fontSize: '14px', margin: 0 }}>
            {contract.status === 'signed' ? '✅ Signed' : contract.status === 'sent' ? '⏳ Awaiting signature' : 'Draft'}
          </p>
        ) : (
          <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>No contract generated yet.</p>
        )}
      </div>

      {/* WhatsApp Omnichannel */}
      <div style={{ marginTop: 'auto' }}>
        <WhatsAppActions 
          phone={session.client_phone ?? null}
          clientName={session.client_name ?? null}
          balanceDue={balanceDue}
          hasInvoice={!!invoice}
          hasGallery={!!session.gallery}
          status={session.status ?? 'pending'}
          sessionRef={session.booking_ref ?? null}
        />
      </div>
    </div>
  )
}
