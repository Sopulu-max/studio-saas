import Link from 'next/link'
import SearchInput from '@/components/search-input'
import Pagination from '@/components/pagination'
import AvatarUpload from '@/components/avatar-upload'
import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'

const PAGE_SIZE = 20

// Known roles get a colour; anything else gets a neutral grey.
// Role values are now free text, so we match case-insensitively on a few key words.
function getRoleColor(role: string): { bg: string; color: string } {
  const r = role.toLowerCase()
  if (r.includes('lead') || r.includes('head'))        return { bg: '#eeedfe', color: '#534ab7' }
  if (r.includes('second') || r.includes('shooter'))   return { bg: '#e6f1fb', color: '#185fa5' }
  if (r.includes('editor') || r.includes('editing'))   return { bg: '#faeeda', color: '#854f0b' }
  if (r.includes('colour') || r.includes('color') || r.includes('grader')) return { bg: '#fce8f3', color: '#8b2d6e' }
  if (r.includes('manager') || r.includes('director')) return { bg: '#fbeaf0', color: '#993556' }
  if (r.includes('assist'))                            return { bg: '#eaf3de', color: '#3b6d11' }
  if (r.includes('reception') || r.includes('admin'))  return { bg: '#e6f1fb', color: '#185fa5' }
  if (r.includes('video'))                             return { bg: '#eeedfe', color: '#534ab7' }
  return { bg: '#f1efe8', color: '#5f5e5a' }
}

function pageUrl(base: string, params: Record<string, string | undefined>, page: number) {
  const p = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v && k !== 'page') p.set(k, v) })
  p.set('page', page.toString())
  return `${base}?${p}`
}

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const { q = '', page = '1' } = await searchParams
  const pageNum = Math.max(1, parseInt(page) || 1)
  const from = (pageNum - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  let query = context.admin
    .from('staff')
    .select('*', { count: 'exact' })
    .eq('studio_id', context.studioId)

  if (q) query = query.or(`full_name.ilike.%${q}%,role.ilike.%${q}%`)

  const { data: staff, count } = await query
    .order('full_name', { ascending: true })
    .range(from, to)

  const total = count ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const params = { q }
  const prevUrl = pageNum > 1 ? pageUrl('/dashboard/staff', params, pageNum - 1) : undefined
  const nextUrl = pageNum < totalPages ? pageUrl('/dashboard/staff', params, pageNum + 1) : undefined

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>Staff</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>{total} team member{total !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/dashboard/staff/new" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '14px', background: 'var(--btn)', color: 'var(--btn-fg)', textDecoration: 'none', fontWeight: '500' }}>
          Add staff
        </Link>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <SearchInput defaultValue={q} placeholder="Search by name or role..." />
      </div>

      {!staff?.length ? (
        <div style={{ textAlign: 'center', padding: '4rem', border: '1px dashed var(--line)', borderRadius: '12px', color: 'var(--text-3)' }}>
          <p style={{ fontSize: '15px', margin: '0 0 4px' }}>{q ? 'No staff match your search' : 'No staff yet'}</p>
          <p style={{ fontSize: '13px', margin: 0 }}>{q ? 'Try adjusting your search' : 'Add your photographers and team members'}</p>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
          {staff.map((member, i) => {
            const r = getRoleColor(member.role)
            return (
              <Link key={member.staff_id} href={`/dashboard/staff/${member.staff_id}`} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '1rem 1.25rem', textDecoration: 'none', color: 'inherit',
                borderBottom: i < staff.length - 1 ? '1px solid var(--line-inner)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <AvatarUpload
                    entityId={member.staff_id}
                    entityType="staff"
                    currentUrl={member.avatar_url ?? null}
                    name={member.full_name}
                    size={36}
                    editable={false}
                  />
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 2px' }}>{member.full_name}</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>{member.email}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {member.hire_date && (
                    <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: 0 }}>
                      Since {new Date(member.hire_date).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })}
                    </p>
                  )}
                  <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: r.bg, color: r.color, fontWeight: '500' }}>
                    {member.role}
                  </span>
                </div>
              </Link>
            )
          })}
          <Pagination page={pageNum} totalPages={totalPages} prevUrl={prevUrl} nextUrl={nextUrl} />
        </div>
      )}
    </div>
  )
}
