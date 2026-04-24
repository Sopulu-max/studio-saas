import { redirect } from 'next/navigation'
import Link from 'next/link'
import StaffActions from './staff-actions'
import AvatarUpload from '@/components/avatar-upload'
import { getStudioContext } from '@/lib/studio'

type AssignedBooking = {
  booking_id?: string | null
  session_date?: string | null
  status?: string | null
  clients?: { full_name?: string | null } | null
}

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  lead:           { bg: '#eeedfe', color: '#534ab7' },
  second_shooter: { bg: '#e6f1fb', color: '#185fa5' },
  assistant:      { bg: '#eaf3de', color: '#3b6d11' },
  editor:         { bg: '#faeeda', color: '#854f0b' },
  manager:        { bg: '#fbeaf0', color: '#993556' },
  other:          { bg: '#f1efe8', color: '#5f5e5a' },
}

const BOOKING_STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending_confirmation: { bg: '#faeeda', color: '#854f0b' },
  confirmed:            { bg: '#e6f1fb', color: '#185fa5' },
  in_progress:          { bg: '#eeedfe', color: '#534ab7' },
  editing:              { bg: '#faeeda', color: '#854f0b' },
  delivered:            { bg: '#eaf3de', color: '#3b6d11' },
  cancelled:            { bg: '#fcebeb', color: '#a32d2d' },
}

export default async function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const { data: member } = await context.admin
    .from('staff')
    .select('*')
    .eq('staff_id', id)
    .eq('studio_id', context.studioId)
    .single()

  if (!member) redirect('/dashboard/staff')

  const { data: assignments } = await context.admin
    .from('booking_staff')
    .select('role, bookings!inner(booking_id, session_date, status, studio_id, clients(full_name))')
    .eq('staff_id', id)
    .eq('bookings.studio_id', context.studioId)
    .order('booking_id', { ascending: false })

  const effectiveRoles: string[] =
    member.roles && member.roles.length > 0
      ? member.roles
      : member.role ? [member.role] : []

  return (
    <div style={{ maxWidth: '600px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <AvatarUpload
            entityId={id}
            entityType="staff"
            currentUrl={member.avatar_url ?? null}
            name={member.full_name}
            size={56}
          />
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>{member.full_name}</h1>
            <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>{assignments?.length ?? 0} sessions assigned</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' as const, justifyContent: 'flex-end', maxWidth: '55%' }}>
          {effectiveRoles.map(role => {
            const rc = ROLE_COLORS[role] ?? ROLE_COLORS.other
            return (
              <span key={role} style={{ fontSize: '13px', padding: '4px 12px', borderRadius: '20px', background: rc.bg, color: rc.color, fontWeight: '500', whiteSpace: 'nowrap' as const }}>
                {role.replace(/_/g, ' ')}
              </span>
            )
          })}
          <Link
            href={`/dashboard/staff/${id}/edit`}
            style={{ fontSize: '13px', padding: '5px 14px', borderRadius: '8px', border: '1px solid var(--line)', color: 'var(--text-2)', textDecoration: 'none', background: 'var(--surface)' }}
          >
            Edit
          </Link>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 12px' }}>DETAILS</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Email</p>
            <p style={{ fontSize: '14px', margin: 0 }}>{member.email}</p>
          </div>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Hire date</p>
            <p style={{ fontSize: '14px', margin: 0 }}>
              {member.hire_date
                ? new Date(member.hire_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
                : '—'}
            </p>
          </div>
        </div>
      </div>

      {(() => {
        if (!assignments?.length) {
          return (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '12px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>No sessions assigned yet</p>
            </div>
          )
        }

        const ROLE_LABELS: Record<string, string> = {
          photographer:  'PHOTOGRAPHED',
          editor:        'EDITED',
          colour_grader: 'COLOUR GRADED',
        }

        // Group by role, preserving order: photographer → editor → colour_grader → others
        const roleOrder = ['photographer', 'editor', 'colour_grader']
        const grouped: Record<string, typeof assignments> = {}
        for (const a of assignments) {
          const role = a.role ?? 'other'
          grouped[role] = grouped[role] ?? []
          grouped[role].push(a)
        }
        const roles = [
          ...roleOrder.filter(r => grouped[r]),
          ...Object.keys(grouped).filter(r => !roleOrder.includes(r) && grouped[r]),
        ]

        return (
          <>
            {roles.map(role => (
              <div key={role} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden', marginBottom: '12px' }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line-inner)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: 0 }}>
                    {ROLE_LABELS[role] ?? role.replace('_', ' ').toUpperCase()}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: 0 }}>{grouped[role].length}</p>
                </div>
                {grouped[role].map((a, i) => {
                  const booking = a.bookings as AssignedBooking
                  const s = BOOKING_STATUS_COLORS[booking?.status ?? ''] ?? BOOKING_STATUS_COLORS.confirmed
                  return (
                    <Link key={booking?.booking_id} href={`/dashboard/sessions/${booking?.booking_id}`} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '0.875rem 1.25rem', textDecoration: 'none', color: 'inherit',
                      borderBottom: i < grouped[role].length - 1 ? '1px solid var(--line-inner)' : 'none',
                    }}>
                      <div>
                        <p style={{ fontSize: '14px', margin: '0 0 2px' }}>{booking?.clients?.full_name ?? '—'}</p>
                        <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>
                          {booking?.session_date
                            ? new Date(booking.session_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
                            : '—'}
                        </p>
                      </div>
                      <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: s.bg, color: s.color, fontWeight: '500', width: 'fit-content' }}>
                        {booking?.status}
                      </span>
                    </Link>
                  )
                })}
              </div>
            ))}
          </>
        )
      })()}

      <StaffActions staffId={id} />
    </div>
  )
}
