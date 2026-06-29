import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'
import { getInvoiceStats, getInvoiceList } from '@/lib/domains/invoices/repository'

export default async function InvoicesPage() {
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const { admin, studioId } = context

  const { stats } = await getInvoiceStats(admin, studioId)
  
  // For the new UI, let's just fetch all recent invoices (up to 100 for MVP)
  const res = await getInvoiceList(admin, studioId, 1, '', 100)
  const invoices = res.invoices

  function fmtValue(val: number) {
    return '₦' + val.toLocaleString('en-NG')
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 md:p-8 animate-enter">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text)] mb-1">Invoices & Payments</h1>
          <p className="text-sm text-[var(--text-4)] uppercase tracking-widest font-semibold">Financial Hub</p>
        </div>
        
        <div className="flex gap-3">
          <Link href="/dashboard/invoices/new" className="px-6 py-2.5 rounded-full text-sm font-bold shadow-lg hover-lift transition-all" style={{ background: 'var(--btn)', color: 'var(--btn-fg)' }}>
            + New Invoice
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-12 flex flex-col gap-8">
        
        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-panel p-6 rounded-[16px] relative overflow-hidden">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-4)] mb-2">Total Invoiced</p>
            <h3 className="text-2xl font-black text-[var(--text)] tracking-tight">{fmtValue(stats.total_invoiced)}</h3>
          </div>
          <div className="glass-panel p-6 rounded-[16px] relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-[var(--btn)] opacity-10 rounded-full blur-2xl" />
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-4)] mb-2">Collected</p>
            <h3 className="text-2xl font-black text-[var(--link)] tracking-tight">{fmtValue(stats.total_collected)}</h3>
          </div>
          <div className="glass-panel p-6 rounded-[16px] relative overflow-hidden">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-4)] mb-2">Outstanding</p>
            <h3 className="text-2xl font-black text-[var(--text)] tracking-tight">{fmtValue(stats.total_outstanding)}</h3>
          </div>
          <div className="glass-panel p-6 rounded-[16px] relative overflow-hidden" style={{ borderColor: stats.total_overdue > 0 ? 'rgba(239, 68, 68, 0.3)' : undefined }}>
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-500 opacity-10 rounded-full blur-2xl" />
            <p className="text-xs font-bold uppercase tracking-wider text-red-400 mb-2">Overdue</p>
            <h3 className="text-2xl font-black tracking-tight" style={{ color: stats.total_overdue > 0 ? '#f87171' : 'var(--text)' }}>
              {fmtValue(stats.total_overdue)}
            </h3>
          </div>
        </div>

        {/* Ledger */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--text-3)] m-0">Recent Ledger</h2>
            <div className="h-px flex-1 bg-[var(--line-inner)]" />
          </div>

          <div className="flex flex-col gap-3">
            {invoices.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-[var(--line-inner)] rounded-[16px] text-[var(--text-4)] text-sm font-medium">
                No invoices found.
              </div>
            ) : (
              invoices.map(inv => {
                const isOverdue = inv.status === 'overdue'
                const isPaid = inv.status === 'paid'
                return (
                  <Link 
                    key={inv.invoice_id}
                    href={`/dashboard/invoices/${inv.invoice_id}`}
                    className="glass-panel p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover-lift transition-all"
                    style={{ borderRadius: '16px', textDecoration: 'none' }}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Status Icon */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border border-[var(--line)] ${isPaid ? 'bg-green-500/10 text-green-500' : isOverdue ? 'bg-red-500/10 text-red-500' : 'bg-[var(--surface-2)] text-[var(--text)]'}`}>
                        {isPaid ? '✓' : isOverdue ? '!' : '📄'}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-[15px] text-[var(--text)] leading-tight m-0 truncate">
                            {inv.client_name || 'Walk-in Client'}
                          </h3>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${isPaid ? 'bg-green-500/20 text-green-400' : isOverdue ? 'bg-red-500/20 text-red-400' : 'bg-[rgba(255,255,255,0.05)] text-[var(--text-3)]'}`}>
                            {inv.status}
                          </span>
                        </div>
                        <p className="text-[12px] font-mono tracking-widest text-[var(--text-4)] m-0">
                          {inv.invoice_id.substring(0, 8)} • {fmtDate(inv.due_date || new Date().toISOString())}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-8 md:pl-4 md:border-l border-[var(--line-inner)] ml-14 md:ml-0">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-4)] mb-0.5">Billed</span>
                        <span className="text-[14px] font-black tracking-tight text-[var(--text)]">{fmtValue(inv.total)}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-4)] mb-0.5">Due</span>
                        <span className={`text-[14px] font-black tracking-tight ${isOverdue ? 'text-red-400' : 'text-[var(--link)]'}`}>
                          {fmtValue(inv.balance)}
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
