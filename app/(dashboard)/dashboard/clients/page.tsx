import Link from 'next/link'
import SearchInput from '@/components/search-input'
import Pagination from '@/components/pagination'
import AvatarUpload from '@/components/avatar-upload'
import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'

const PAGE_SIZE = 20

function pageUrl(base: string, params: Record<string, string | undefined>, page: number) {
  const p = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v && k !== 'page') p.set(k, v) })
  p.set('page', page.toString())
  return `${base}?${p}`
}

export default async function ClientsPage({
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
    .from('clients')
    .select('*', { count: 'exact' })
    .eq('studio_id', context.studioId)

  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)

  const { data: clients, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  // Session counts per client — one extra query, grouped in JS
  const clientIds = (clients ?? []).map(c => c.client_id)
  const sessionCountMap = new Map<string, number>()
  if (clientIds.length) {
    const { data: bookings } = await context.admin
      .from('bookings')
      .select('client_id')
      .eq('studio_id', context.studioId)
      .in('client_id', clientIds)
    for (const b of bookings ?? []) {
      sessionCountMap.set(b.client_id, (sessionCountMap.get(b.client_id) ?? 0) + 1)
    }
  }

  const total = count ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const params = { q }
  const prevUrl = pageNum > 1 ? pageUrl('/dashboard/clients', params, pageNum - 1) : undefined
  const nextUrl = pageNum < totalPages ? pageUrl('/dashboard/clients', params, pageNum + 1) : undefined

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>Clients</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>{total} result{total !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/dashboard/clients/new" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '14px', background: 'var(--btn)', color: 'var(--btn-fg)', textDecoration: 'none', fontWeight: '500' }}>
          Add client
        </Link>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
        <SearchInput defaultValue={q} placeholder="Search by name or email..." />
      </div>

      {!clients?.length ? (
        <div style={{ textAlign: 'center', padding: '4rem', border: '1px dashed var(--line)', borderRadius: '12px', color: 'var(--text-3)' }}>
          <p style={{ fontSize: '15px', margin: '0 0 4px' }}>{q ? 'No clients match your search' : 'No clients yet'}</p>
          <p style={{ fontSize: '13px', margin: 0 }}>{q ? 'Try a different search term' : 'Add your first client to get started'}</p>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
          {clients.map((client, i) => (
            <Link key={client.client_id} href={`/dashboard/clients/${client.client_id}`} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '1rem 1.25rem', textDecoration: 'none', color: 'inherit',
              borderBottom: i < clients.length - 1 ? '1px solid var(--line-inner)' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <AvatarUpload
                  entityId={client.client_id}
                  entityType="client"
                  currentUrl={client.avatar_url ?? null}
                  name={client.full_name}
                  size={36}
                  editable={false}
                />
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 2px' }}>{client.full_name}</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>{client.email}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' as const }}>
                <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 2px' }}>{client.phone ?? '—'}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: 0 }}>
                  {sessionCountMap.get(client.client_id) ?? 0} session{(sessionCountMap.get(client.client_id) ?? 0) !== 1 ? 's' : ''}
                </p>
              </div>
            </Link>
          ))}
          <Pagination page={pageNum} totalPages={totalPages} prevUrl={prevUrl} nextUrl={nextUrl} />
        </div>
      )}
    </div>
  )
}
