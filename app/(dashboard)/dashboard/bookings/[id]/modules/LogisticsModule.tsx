import type { BookingDetailDTO } from '@/lib/domains/bookings/types'
import AddSessionButton from './AddSessionButton'

export default function LogisticsModule({ booking }: { booking: BookingDetailDTO }) {
  const sessions = booking.sessions ?? []

  return (
    <div className="glass-panel animate-enter" style={{ padding: '1.5rem', animationDelay: '0.1s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <p className="label-mini" style={{ margin: 0 }}>Logistics & Locations</p>
        <AddSessionButton bookingId={booking.booking_id} />
      </div>

      {sessions.length === 0 ? (
        <p style={{ fontSize: '14px', color: 'var(--text-4)' }}>No sessions scheduled.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {sessions.map((sess, i) => {
            const isEvent = sess.session_type === 'event'
            
            return (
              <div key={i} className="hover-lift" style={{ background: 'var(--surface-2)', borderRadius: '12px', padding: '1rem', borderLeft: '3px solid var(--text-3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: '500', margin: '0 0 2px' }}>
                      {sess.shoot_type || sess.session_type || 'Session'}
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>
                      {sess.session_date ? new Date(sess.session_date).toLocaleString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Date TBD'}
                    </p>
                  </div>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--line-inner)' }}>
                    {sess.session_type}
                  </span>
                </div>

                {sess.location_address && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--line-inner)' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>{isEvent ? 'Venue' : 'Location'}</p>
                    <p style={{ fontSize: '14px', margin: 0 }}>{sess.location_address}</p>
                  </div>
                )}

                {isEvent && sess.event_name && (
                  <div style={{ marginTop: '8px' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Event Name</p>
                    <p style={{ fontSize: '14px', margin: 0 }}>{sess.event_name}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Booking Notes */}
      {booking.notes && (
        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--line)' }}>
          <p className="label-mini">Booking Notes</p>
          <p style={{ fontSize: '14px', color: 'var(--text-2)', margin: 0, lineHeight: '1.6' }}>{booking.notes}</p>
        </div>
      )}
    </div>
  )
}
