import { redirect } from 'next/navigation'
import Link from 'next/link'
import StaffActions from './staff-actions'
import AvatarUpload from '@/components/avatar-upload'
import { getStudioContext, fetchStudio } from '@/lib/studio'
import { buildStudioConfig, getStaffRoleConfig } from '@/lib/studio-config'
import { sessionName } from '@/lib/session-title'
import { getStaffDetail } from '@/lib/domains/staff/repository'

const WEEKDAYS = [
  { value: 'monday',    label: 'Mon' },
  { value: 'tuesday',   label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday',  label: 'Thu' },
  { value: 'friday',    label: 'Fri' },
  { value: 'saturday',  label: 'Sat' },
  { value: 'sunday',    label: 'Sun' },
]

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

  const [member, studio] = await Promise.all([
    getStaffDetail(context.admin, context.studioId, id),
    fetchStudio(context.admin, context.studioId),
  ])

  if (!member) redirect('/dashboard/staff')

  const config = buildStudioConfig(
    studio?.session_types, studio?.booking_statuses, studio?.service_types,
    studio?.equipment_categories, studio?.staff_roles,
  )

  const assignments    = member.assignments
  const recentCheckins = member.recent_checkins
  const effectiveRoles = member.roles

  return (
    <div style={{ maxWidth: '600px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <AvatarUpload
            entityId={id}
            entityType="staff"
            currentUrl={member.avatar_url ?? null}
            name={member.full_name ?? ''}
            size={56}
          />
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>{member.full_name}</h1>
            <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>{assignments?.length ?? 0} sessions assigned</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' as const, justifyContent: 'flex-end', maxWidth: '55%' }}>
          {effectiveRoles.map(role => {
            const rc = getStaffRoleConfig(config, role)
            return (
              <span key={role} style={{ fontSize: '13px', padding: '4px 12px', borderRadius: '20px', background: rc.color_bg, color: rc.color_fg, fontWeight: '500', whiteSpace: 'nowrap' as const }}>
                {rc.label || role.replace(/_/g, ' ')}
              </span>
            )
          })}
          <Link
            href={`/dashboard/staff/${id}/edit`}
            className="glass-panel hover-lift" style={{ fontSize: '13px', padding: '5px 14px', color: 'var(--text-2)', textDecoration: 'none' }}
          >
            Edit
          </Link>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '12px' }}>
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

      {/* Working days */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 12px' }}>WORKING DAYS</p>
        {member.working_days && member.working_days.length > 0 ? (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
            {WEEKDAYS.map(d => {
              const active = (member.working_days as string[]).includes(d.value)
              return (
                <span key={d.value} style={{
                  fontSize: '12px', fontWeight: '500', padding: '5px 12px', borderRadius: '8px',
                  background: active ? 'var(--active)' : 'transparent',
                  border: `1px solid ${active ? 'var(--btn)' : 'var(--line)'}`,
                  color: active ? 'var(--btn)' : 'var(--text-4)',
                }}>
                  {d.label}
                </span>
              )
            })}
          </div>
        ) : (
          <p style={{ fontSize: '14px', color: 'var(--text-4)', margin: 0 }}>Not set — varies each week</p>
        )}
      </div>

      {/* Recent check-ins */}
      {recentCheckins && recentCheckins.length > 0 && (
        <div className="glass-panel" style={{ overflow: 'hidden', marginBottom: '12px' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line-inner)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: 0 }}>RECENT CHECK-INS</p>
            <Link href="/dashboard/attendance" style={{ fontSize: '12px', color: 'var(--text-4)', textDecoration: 'none' }}>
              Attendance board →
            </Link>
          </div>
          {recentCheckins.map((c, i) => {
            const inTime  = new Date(c.checked_in_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
            const outTime = c.checked_out_at
              ? new Date(c.checked_out_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
              : null
            const dateLabel = new Date(c.date).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' })
            return (
              <div key={c.checkin_id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.75rem 1.25rem',
                borderBottom: i < recentCheckins.length - 1 ? '1px solid var(--line-inner)' : 'none',
              }}>
                <p style={{ fontSize: '13px', fontWeight: '500', margin: 0 }}>{dateLabel}</p>
                <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>
                  In: <strong style={{ color: 'var(--text-2)' }}>{inTime}</strong>
                  {outTime && <> &nbsp;·&nbsp; Out: <strong style={{ color: 'var(--text-2)' }}>{outTime}</strong></>}
                  {!outTime && <span style={{ marginLeft: '6px', fontSize: '11px', padding: '2px 7px', borderRadius: '20px', background: '#e6f1fb', color: '#185fa5' }}>active</span>}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {(() => {
        if (!assignments?.length) {
          return (
            <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '12px' }}>
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
              <div key={role} className="glass-panel" style={{ overflow: 'hidden', marginBottom: '12px' }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line-inner)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: 0 }}>
                    {ROLE_LABELS[role] ?? role.replace('_', ' ').toUpperCase()}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: 0 }}>{grouped[role].length}</p>
                </div>
                {grouped[role].map((a, i) => {
                  const session = a.session
                  const s = BOOKING_STATUS_COLORS[session?.status ?? ''] ?? BOOKING_STATUS_COLORS.confirmed
                  return (
                    <Link key={session?.booking_id} href={`/dashboard/bookings/${session?.booking_id}`} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '0.875rem 1.25rem', textDecoration: 'none', color: 'inherit',
                      borderBottom: i < grouped[role].length - 1 ? '1px solid var(--line-inner)' : 'none',
                    }}>
                      <div>
                        <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 2px' }}>
                          {session?.client_name ?? '—'}
                        </p>
                        <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>
                          <span style={{ fontFamily: 'monospace', letterSpacing: '0.02em' }}>{sessionName(session?.client_name, session?.booking_ref, session?.booking_id, session?.session_date)}</span>
                          {session?.session_date ? ` · ${new Date(session.session_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                        </p>
                      </div>
                      <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: s.bg, color: s.color, fontWeight: '500', width: 'fit-content' }}>
                        {session?.status}
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
