import Link from 'next/link'
import type { BookingDetailDTO } from '@/lib/domains/bookings/types'

export default function FulfillmentModule({ booking }: { booking: BookingDetailDTO }) {
  const services = booking.services ?? []
  const addons = booking.addons ?? []
  const gallery = booking.gallery
  const printOrder = booking.printOrder

  return (
    <div className="glass-panel animate-enter" style={{ padding: '1.5rem', animationDelay: '0.2s', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Deliverables (Services) */}
      <div>
        <p className="label-mini">Deliverables (Services)</p>
        {services.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-4)' }}>No services attached.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {services.map((s, i) => (
              <div key={i} className="data-row">
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 2px' }}>{s.service_name}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>Qty: {s.quantity}</p>
                </div>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: 'var(--surface-2)', border: '1px solid var(--line-inner)' }}>
                  {s.status ?? 'Pending'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add-ons */}
      {addons.length > 0 && (
        <div style={{ borderTop: '1px solid var(--line-inner)', paddingTop: '1.5rem' }}>
          <p className="label-mini">Add-ons</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {addons.map((a, i) => (
              <div key={i} className="data-row">
                <span style={{ fontSize: '13px' }}>{a.addon_name} × {a.quantity}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-3)' }}>₦{(Number(a.price) * a.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deliverable Portals */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderTop: '1px solid var(--line-inner)', paddingTop: '1.5rem' }}>
        
        {/* Gallery */}
        <div className="hover-lift" style={{ background: 'var(--surface-2)', borderRadius: '12px', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <p className="label-mini" style={{ margin: 0 }}>Gallery</p>
            {gallery ? (
              <Link href={`/dashboard/galleries/${gallery.gallery_id}`} style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none' }}>Open →</Link>
            ) : (
              <Link href={`/dashboard/galleries/new?session=${booking.booking_id}`} style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none' }}>Create →</Link>
            )}
          </div>
          {gallery ? (
            <>
              <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 4px' }}>{gallery.title}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0, textTransform: 'capitalize' }}>{gallery.status}</p>
            </>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>Not created</p>
          )}
        </div>

        {/* Print Order */}
        <div className="hover-lift" style={{ background: 'var(--surface-2)', borderRadius: '12px', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <p className="label-mini" style={{ margin: 0 }}>Print Order</p>
            {printOrder ? (
              <Link href={`/dashboard/print-orders/${printOrder.order_id}`} style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none' }}>Open →</Link>
            ) : (
              <Link href={`/dashboard/print-orders/new?session=${booking.booking_id}`} style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none' }}>Create →</Link>
            )}
          </div>
          {printOrder ? (
            <>
              <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 4px' }}>₦{(printOrder.total_amount ?? 0).toLocaleString()}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0, textTransform: 'capitalize' }}>{printOrder.status}</p>
            </>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>Not created</p>
          )}
        </div>
      </div>
      
    </div>
  )
}
