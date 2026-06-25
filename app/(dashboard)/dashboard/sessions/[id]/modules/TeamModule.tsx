import Link from 'next/link'
import type { BookingDetailDTO } from '@/lib/domains/bookings/types'

export default function TeamModule({ booking }: { booking: BookingDetailDTO }) {
  const staffList = booking.staff ?? []

  return (
    <div className="glass-panel animate-enter" style={{ padding: '1.5rem', animationDelay: '0.3s' }}>
      <p className="label-mini">Team & Assignments</p>

      {staffList.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--text-4)' }}>No staff assigned.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {staffList.map((member, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', background: 'var(--surface-2)', borderRadius: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--text-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bg)', fontSize: '12px', fontWeight: 'bold' }}>
                {member.staff_name?.charAt(0).toUpperCase() ?? '?'}
              </div>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '0 0 2px', textTransform: 'capitalize' }}>
                  {member.role?.replace('_', ' ')}
                </p>
                {member.staff_id ? (
                  <Link href={`/dashboard/staff/${member.staff_id}`} style={{ fontSize: '14px', fontWeight: '500', color: 'inherit', textDecoration: 'none' }} className="hover-lift">
                    {member.staff_name}
                  </Link>
                ) : (
                  <p style={{ fontSize: '14px', fontWeight: '500', margin: 0 }}>{member.staff_name}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drive Link & External Resources */}
      {booking.drive_link && (
        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--line-inner)' }}>
          <p className="label-mini">Workspace</p>
          <a href={booking.drive_link} target="_blank" rel="noreferrer"
            style={{ fontSize: '13px', color: 'var(--link)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            Open Google Drive Folder ↗
          </a>
        </div>
      )}
    </div>
  )
}
