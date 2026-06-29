import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'
import { fetchClientCRM } from '@/lib/domains/clients/repository'

export default async function ClientCRMPage() {
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const { admin, studioId } = context
  const clients = await fetchClientCRM(admin, studioId)

  // Calculate LTV tiers
  let totalLTV = 0
  let topClients = 0
  for (const c of clients) {
    totalLTV += c.lifetime_value
    if (c.lifetime_value > 500000) topClients++ // Arbitrary threshold for MVP
  }

  function fmtLTV(val: number) {
    if (val === 0) return '—'
    if (val > 1000000) return `₦${(val / 1000000).toFixed(1)}m`
    if (val > 1000) return `₦${(val / 1000).toFixed(0)}k`
    return `₦${val}`
  }

  function fmtDate(iso: string | null) {
    if (!iso) return 'Never'
    return new Date(iso).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 md:p-8 animate-enter">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text)] mb-1">Client CRM</h1>
          <p className="text-sm text-[var(--text-4)] uppercase tracking-widest font-semibold">Knowledge Base & Value</p>
        </div>
        
        <div className="flex gap-3">
          <Link href="/dashboard/clients/new" className="px-6 py-2.5 rounded-full text-sm font-bold shadow-lg hover-lift transition-all" style={{ background: 'var(--btn)', color: 'var(--btn-fg)' }}>
            + New Client
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-12 flex flex-col gap-8">
        
        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-[16px] relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-[var(--btn)] opacity-10 rounded-full blur-2xl" />
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-4)] mb-2">Total Network</p>
            <h3 className="text-4xl font-black text-[var(--text)] tracking-tight">{clients.length}</h3>
          </div>
          <div className="glass-panel p-6 rounded-[16px] relative overflow-hidden">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-4)] mb-2">Network LTV</p>
            <h3 className="text-4xl font-black text-[var(--text)] tracking-tight">₦{(totalLTV / 1000000).toFixed(1)}m</h3>
          </div>
          <div className="glass-panel p-6 rounded-[16px] relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-500 opacity-10 rounded-full blur-2xl" />
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-4)] mb-2">VIP Clients</p>
            <h3 className="text-4xl font-black text-[var(--link)] tracking-tight">{topClients}</h3>
          </div>
        </div>

        {/* Client Roster */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--text-3)] m-0">Client Roster</h2>
            <div className="h-px flex-1 bg-[var(--line-inner)]" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {clients.length === 0 ? (
              <div className="col-span-full p-8 text-center border border-dashed border-[var(--line-inner)] rounded-[16px] text-[var(--text-4)] text-sm font-medium">
                No clients in your CRM yet.
              </div>
            ) : (
              clients.map(client => (
                <Link 
                  key={client.client_id}
                  href={`/dashboard/clients/${client.client_id}`}
                  className="glass-panel p-5 flex items-center gap-4 relative group hover-lift transition-all"
                  style={{ borderRadius: '16px', textDecoration: 'none' }}
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 border border-[var(--line)] shadow-sm bg-[var(--surface-2)] text-[var(--text)]">
                    <span className="text-lg font-bold">
                      {client.full_name ? client.full_name.charAt(0).toUpperCase() : '?'}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[15px] text-[var(--text)] leading-tight m-0 truncate">
                      {client.full_name}
                    </h3>
                    <p className="text-[12px] text-[var(--text-4)] font-medium truncate m-0 mt-0.5">
                      {client.email || client.phone || 'No contact info'}
                    </p>
                    <p className="text-[10px] font-mono tracking-widest text-[var(--text-3)] mt-2">
                      LAST: {fmtDate(client.last_interaction)}
                    </p>
                  </div>

                  <div className="flex flex-col items-end pl-2 border-l border-[var(--line-inner)] h-full justify-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-4)] mb-0.5">LTV</span>
                    <span className="text-[15px] font-black tracking-tight" style={{ color: client.lifetime_value > 500000 ? 'var(--link)' : 'var(--text)' }}>
                      {fmtLTV(client.lifetime_value)}
                    </span>
                    <span className="text-[10px] font-bold text-[var(--text-3)] mt-1">{client.total_bookings} jobs</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
