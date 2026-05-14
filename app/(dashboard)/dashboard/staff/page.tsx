import Link from 'next/link'
import SearchInput from '@/components/search-input'
import Pagination from '@/components/pagination'
import AvatarUpload from '@/components/avatar-upload'
import { redirect } from 'next/navigation'
import { getStudioContext, fetchStudio } from '@/lib/studio'
import { buildStudioConfig, getStaffRoleConfig } from '@/lib/studio-config'
import { sessionName } from '@/lib/session-title'
import { ViewSwitcher } from '@/components/view-switcher'
import { resolveLayout } from '@/lib/view-mode'

// ─── Types ─────────────────────────────────────────────────────────────────

type StaffMember = {
  staff_id:     string
  full_name:    string
  email:        string | null
  role:         string | null
  roles:        string[] | null
  working_days: string[] | null
  hire_date:    string | null
  avatar_url:   string | null
}

type TodayBooking = {
  booking_id:    string
  booking_ref?:  number | null
  session_date?: string | null
  session_type?: string | null
  status:        string
  clients?:      { full_name?: string | null } | null
  booking_staff?: { role?: string | null; staff?: { staff_id?: string | null; full_name?: string | null } | null }[] | null
}

type StaffAssignment = {
  booking_id?: string | null
  role?:       string | null
  staff?: {
    staff_id?:  string | null
    full_name?: string | null
  } | null
  bookings?: {
    booking_id?:   string | null
    booking_ref?:  number | null
    session_date?: string | null
    session_type?: string | null
    studio_id?:    string | null
    clients?: { full_name?: string | null } | null
  } | null
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

// ─── Helpers ────────────────────────────────────────────────────────────────

function pageUrl(params: Record<string, string | undefined>, pg: number) {
  const p = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v && k !== 'page') p.set(k, v) })
  p.set('page', String(pg))
  return `/dashboard/staff?${p}`
}

function tabUrl(view: string) {
  return `/dashboard/staff?view=${view}`
}

function sDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Component helpers ──────────────────────────────────────────────────────

function TabNav({ active }: { active: string }) {
  const tabs = [
    { key: 'team',     label: 'Team' },
    { key: 'today',    label: 'Today' },
    { key: 'sessions', label: 'Sessions' },
  ]
  return (
    <div style={{ display: 'flex', gap: '2px', marginBottom: '1.25rem', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '10px', padding: '3px', width: 'fit-content' }}>
      {tabs.map(t => (
        <Link key={t.key} href={tabUrl(t.key)} style={{
          padding: '6px 16px', borderRadius: '7px', fontSize: '13px', fontWeight: '500',
          textDecoration: 'none', whiteSpace: 'nowrap',
          background: active === t.key ? 'var(--btn)' : 'transparent',
          color: active === t.key ? 'var(--btn-fg)' : 'var(--text-3)',
        }}>{t.label}</Link>
      ))}
    </div>
  )
}

function StatsStrip({ items }: { items: { label: string; value: string | number }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: '12px', marginBottom: '1.5rem' }}>
      {items.map(item => (
        <div key={item.label} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.1rem 1.25rem' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '0 0 6px', fontWeight: '500' }}>{item.label}</p>
          <p style={{ fontSize: '26px', fontWeight: '500', margin: 0, lineHeight: 1.1 }}>{item.value}</p>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ message, sub }: { message: string; sub: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '4rem', border: '1px dashed var(--line)', borderRadius: '12px', color: 'var(--text-3)' }}>
      <p style={{ fontSize: '15px', margin: '0 0 4px' }}>{message}</p>
      <p style={{ fontSize: '13px', margin: 0 }}>{sub}</p>
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string; page?: string; layout?: string }>
}) {
  const { view = 'team', q = '', page = '1', layout: rawLayout } = await searchParams
  const teamLayout = view === 'team' ? resolveLayout(rawLayout, ['grid', 'list']) : 'grid'
  const pageNum = Math.max(1, parseInt(page) || 1)
  const from    = (pageNum - 1) * PAGE_SIZE
  const to      = from + PAGE_SIZE - 1

  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const studio = await fetchStudio(context.admin, context.studioId)
  const config = buildStudioConfig(
    studio?.session_types, studio?.booking_statuses, studio?.service_types,
    studio?.equipment_categories, studio?.staff_roles,
  )

  // ── Stats (always) ───────────────────────────────────────────────
  const now        = new Date()
  const todayStr   = now.toISOString().slice(0, 10)
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const [
    { count: totalStaff },
    { count: sessionsThisMonth },
    { count: todayCount },
  ] = await Promise.all([
    context.admin.from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('studio_id', context.studioId),
    context.admin.from('booking_staff')
      .select('*, bookings!inner(studio_id)', { count: 'exact', head: true })
      .eq('bookings.studio_id', context.studioId)
      .gte('bookings.session_date', monthStart),
    context.admin.from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('studio_id', context.studioId)
      .eq('session_date', todayStr),
  ])

  const statsItems = [
    { label: 'Total staff',        value: totalStaff ?? 0 },
    { label: 'Sessions this month', value: sessionsThisMonth ?? 0 },
    { label: 'Sessions today',      value: todayCount ?? 0 },
  ]

  // ── Header ───────────────────────────────────────────────────────
  const header = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
      <h1 style={{ fontSize: '22px', fontWeight: '500', margin: 0 }}>Staff</h1>
      <Link href="/dashboard/staff/new" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '14px', background: 'var(--btn)', color: 'var(--btn-fg)', textDecoration: 'none', fontWeight: '500' }}>
        Add staff
      </Link>
    </div>
  )

  // ── Today view ───────────────────────────────────────────────────
  if (view === 'today') {
    const { data: todayRaw } = await context.admin
      .from('bookings')
      .select('booking_id, booking_ref, session_date, session_type, status, clients(full_name), booking_staff(role, staff(staff_id, full_name))')
      .eq('studio_id', context.studioId)
      .eq('session_date', todayStr)
      .order('booking_ref', { ascending: true })

    const todayBookings = (todayRaw ?? []) as unknown as TodayBooking[]

    return (
      <div>
        {header}
        <StatsStrip items={statsItems} />
        <TabNav active="today" />

        {!todayBookings.length ? (
          <EmptyState message="No sessions scheduled today" sub="Sessions booked for today will appear here with their assigned staff" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {todayBookings.map(b => {
              const staffList = b.booking_staff ?? []
              return (
                <Link key={b.booking_id} href={`/dashboard/sessions/${b.booking_id}`} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem', textDecoration: 'none', color: 'inherit', display: 'block' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 3px' }}>{b.clients?.full_name ?? '—'}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 10px', fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                        {sessionName(b.clients?.full_name, b.booking_ref, b.booking_id, b.session_date)}
                        {b.session_type ? ` · ${b.session_type}` : ''}
                      </p>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-3)', whiteSpace: 'nowrap', flexShrink: 0 }}>{b.status}</span>
                  </div>

                  {staffList.length > 0 ? (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {staffList.map((bs, idx) => {
                        const rc = getStaffRoleConfig(config, bs.role)
                        return (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--active)', borderRadius: '8px', padding: '5px 10px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '600' }}>{bs.staff?.full_name ?? '—'}</span>
                            <span style={{ fontSize: '11px', padding: '1px 7px', borderRadius: '20px', background: rc.color_bg, color: rc.color_fg, fontWeight: '500' }}>{bs.role ?? '—'}</span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: 0 }}>No staff assigned yet</p>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── Sessions view ────────────────────────────────────────────────
  if (view === 'sessions') {
    const { data: assignRaw, count: assignCount } = await context.admin
      .from('booking_staff')
      .select('booking_id, role, staff(staff_id, full_name), bookings!inner(booking_id, booking_ref, session_date, session_type, studio_id, clients(full_name))', { count: 'exact' })
      .eq('bookings.studio_id', context.studioId)
      .order('bookings.session_date', { ascending: false })
      .range(from, to)

    const assignments = (assignRaw ?? []) as unknown as StaffAssignment[]
    const listTotal   = assignCount ?? 0
    const totalPages  = Math.ceil(listTotal / PAGE_SIZE)
    const prevUrl     = pageNum > 1          ? pageUrl({ view: 'sessions' }, pageNum - 1) : undefined
    const nextUrl     = pageNum < totalPages ? pageUrl({ view: 'sessions' }, pageNum + 1) : undefined

    return (
      <div>
        {header}
        <StatsStrip items={statsItems} />
        <TabNav active="sessions" />

        <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 1rem' }}>
          {listTotal} assignment{listTotal !== 1 ? 's' : ''}
        </p>

        {!assignments.length ? (
          <EmptyState message="No staff assignments yet" sub="Assign staff to sessions from the session detail page" />
        ) : (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', padding: '10px 1.25rem', borderBottom: '1px solid var(--line-inner)', fontSize: '12px', color: 'var(--text-3)', fontWeight: '500' }}>
              <span>Staff</span><span>Session</span><span>Date</span><span>Role</span>
            </div>

            {assignments.map((a, i) => {
              const rc = getStaffRoleConfig(config, a.role)
              return (
                <Link key={`${a.booking_id}-${a.staff?.staff_id}-${i}`} href={`/dashboard/sessions/${a.bookings?.booking_id}`} style={{
                  display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr',
                  padding: '0.875rem 1.25rem', textDecoration: 'none', color: 'inherit', alignItems: 'center',
                  borderBottom: i < assignments.length - 1 ? '1px solid var(--line-inner)' : 'none',
                }}>
                  <p style={{ fontSize: '13px', fontWeight: '600', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.staff?.full_name ?? '—'}
                  </p>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '500', margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.bookings?.clients?.full_name ?? '—'}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0, fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                      {sessionName(a.bookings?.clients?.full_name, a.bookings?.booking_ref, a.bookings?.booking_id, a.bookings?.session_date)}
                    </p>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>{sDate(a.bookings?.session_date)}</p>
                  <span style={{ display: 'inline-block', width: 'fit-content', fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: rc.color_bg, color: rc.color_fg, fontWeight: '500', textTransform: 'capitalize' }}>
                    {a.role ?? '—'}
                  </span>
                </Link>
              )
            })}

            <Pagination page={pageNum} totalPages={totalPages} prevUrl={prevUrl} nextUrl={nextUrl} />
          </div>
        )}
      </div>
    )
  }

  // ── Team view (default) ──────────────────────────────────────────
  let query = context.admin
    .from('staff')
    .select('*', { count: 'exact' })
    .eq('studio_id', context.studioId)

  if (q) query = query.or(`full_name.ilike.%${q}%,role.ilike.%${q}%`)

  const { data: staffRaw, count } = await query
    .order('full_name', { ascending: true })
    .range(from, to)
  const staff = (staffRaw ?? []) as unknown as StaffMember[]

  const listTotal  = count ?? 0
  const totalPages = Math.ceil(listTotal / PAGE_SIZE)
  const prevUrl    = pageNum > 1          ? pageUrl({ view: 'team', q }, pageNum - 1) : undefined
  const nextUrl    = pageNum < totalPages ? pageUrl({ view: 'team', q }, pageNum + 1) : undefined

  return (
    <div>
      {header}
      <StatsStrip items={statsItems} />
      <TabNav active="team" />

      <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', alignItems: 'center' }}>
        <SearchInput defaultValue={q} placeholder="Search by name or role..." />
        <div style={{ marginLeft: 'auto' }}>
          <ViewSwitcher modes={['grid', 'list']} storageKey="staff-team" />
        </div>
      </div>

      <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 1rem' }}>
        {listTotal} team member{listTotal !== 1 ? 's' : ''}
      </p>

      {!staff.length ? (
        <EmptyState
          message={q ? 'No staff match your search' : 'No staff yet'}
          sub={q ? 'Try adjusting your search' : 'Add your photographers and team members'}
        />
      ) : (
        <>
          {/* ── Grid view ── */}
          {teamLayout === 'grid' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
              {staff.map((member) => {
                const effectiveRoles: string[] =
                  member.roles && member.roles.length > 0
                    ? member.roles
                    : member.role ? [member.role] : []
                return (
                  <Link key={member.staff_id} href={`/dashboard/staff/${member.staff_id}`} style={{
                    background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px',
                    padding: '1.25rem', textDecoration: 'none', color: 'inherit', display: 'block',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <AvatarUpload
                        entityId={member.staff_id}
                        entityType="staff"
                        currentUrl={member.avatar_url ?? null}
                        name={member.full_name}
                        size={44}
                        editable={false}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {member.full_name}
                        </p>
                        <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {member.email ?? '—'}
                        </p>
                      </div>
                    </div>
                    {effectiveRoles.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        {effectiveRoles.map(role => {
                          const rc = getStaffRoleConfig(config, role)
                          return (
                            <span key={role} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: rc.color_bg, color: rc.color_fg, fontWeight: '500', whiteSpace: 'nowrap' }}>
                              {rc.label || role.replace(/_/g, ' ')}
                            </span>
                          )
                        })}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '16px', paddingTop: '10px', borderTop: '1px solid var(--line-inner)', fontSize: '12px', color: 'var(--text-3)' }}>
                      {member.hire_date && (
                        <span>Since {new Date(member.hire_date).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })}</span>
                      )}
                      {member.working_days && member.working_days.length > 0 && (
                        <span style={{ marginLeft: member.hire_date ? 'auto' : undefined }}>
                          {member.working_days.length}d/wk
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* ── List view ── */}
          {teamLayout === 'list' && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', padding: '10px 1.25rem', borderBottom: '1px solid var(--line-inner)', fontSize: '12px', color: 'var(--text-3)', fontWeight: '500' }}>
                <span>Name</span><span>Roles</span><span>Hire date</span><span>Days / wk</span>
              </div>
              {staff.map((member, i) => {
                const effectiveRoles: string[] =
                  member.roles && member.roles.length > 0
                    ? member.roles
                    : member.role ? [member.role] : []
                return (
                  <Link key={member.staff_id} href={`/dashboard/staff/${member.staff_id}`} style={{
                    display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr',
                    padding: '0.875rem 1.25rem', textDecoration: 'none', color: 'inherit', alignItems: 'center',
                    borderBottom: i < staff.length - 1 ? '1px solid var(--line-inner)' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <AvatarUpload entityId={member.staff_id} entityType="staff"
                        currentUrl={member.avatar_url ?? null} name={member.full_name} size={30} editable={false} />
                      <div>
                        <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 1px' }}>{member.full_name}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0 }}>{member.email ?? '—'}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {effectiveRoles.length > 0 ? effectiveRoles.map(role => {
                        const rc = getStaffRoleConfig(config, role)
                        return (
                          <span key={role} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: rc.color_bg, color: rc.color_fg, fontWeight: '500', whiteSpace: 'nowrap' }}>
                            {rc.label || role.replace(/_/g, ' ')}
                          </span>
                        )
                      }) : <span style={{ fontSize: '12px', color: 'var(--text-4)' }}>—</span>}
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>
                      {member.hire_date ? new Date(member.hire_date).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' }) : '—'}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>
                      {member.working_days?.length ?? '—'}
                    </p>
                  </Link>
                )
              })}
            </div>
          )}

          <Pagination page={pageNum} totalPages={totalPages} prevUrl={prevUrl} nextUrl={nextUrl} />
        </>
      )}
    </div>
  )
}
