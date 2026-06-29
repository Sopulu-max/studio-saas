import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'
import { fetchStudioCatalog } from '@/lib/domains/catalog/repository'

export default async function StudioCatalogPage() {
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const { admin, studioId } = context
  const catalog = await fetchStudioCatalog(admin, studioId)

  // Group by type for the catalog display
  const services = catalog.filter(c => c.type === 'service')
  const products = catalog.filter(c => c.type === 'product' || c.type === 'digital')

  function fmtValue(val: number | null) {
    if (val === null) return 'Variable'
    if (val === 0) return 'Free'
    return '₦' + val.toLocaleString('en-NG')
  }

  function fmtDuration(mins: number | null) {
    if (!mins) return '—'
    if (mins < 60) return `${mins} mins`
    const hrs = Math.floor(mins / 60)
    const rm = mins % 60
    return `${hrs} hr${hrs > 1 ? 's' : ''} ${rm > 0 ? `${rm} mins` : ''}`
  }

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 md:p-8 animate-enter">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text)] mb-1">Studio Catalog</h1>
          <p className="text-sm text-[var(--text-4)] uppercase tracking-widest font-semibold">Services & Add-ons</p>
        </div>
        
        <div className="flex gap-3">
          <Link href="/dashboard/services/new" className="px-6 py-2.5 rounded-full text-sm font-bold shadow-lg hover-lift transition-all" style={{ background: 'var(--btn)', color: 'var(--btn-fg)' }}>
            + New Service
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-12 flex flex-col gap-10">

        {/* CORE SERVICES */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--text-3)] m-0">Core Services</h2>
            <div className="h-px flex-1 bg-[var(--line-inner)]" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.length === 0 ? (
              <div className="col-span-full p-8 text-center border border-dashed border-[var(--line-inner)] rounded-[16px] text-[var(--text-4)] text-sm font-medium">
                No core services defined yet.
              </div>
            ) : (
              services.map(service => (
                <div key={service.service_id} className="glass-panel p-6 flex flex-col gap-4 relative overflow-hidden group hover-lift transition-all" style={{ borderRadius: '16px' }}>
                  
                  {/* Status dot */}
                  <div className="absolute top-6 right-6 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${service.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                  </div>

                  <div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3 inline-block" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-3)' }}>
                      Service
                    </span>
                    <h3 className="font-bold text-[18px] text-[var(--text)] tracking-tight leading-tight m-0 pr-6">{service.name}</h3>
                  </div>

                  <p className="text-[13px] text-[var(--text-3)] m-0 line-clamp-2 min-h-[40px]">
                    {service.description || 'No description provided.'}
                  </p>

                  <div className="flex justify-between items-end border-t border-[var(--line-inner)] pt-4 mt-auto">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-4)] mb-0.5">Duration</span>
                      <span className="text-[13px] font-bold text-[var(--text-2)]">{fmtDuration(service.duration_mins)}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-4)] mb-0.5">Starting at</span>
                      <span className="text-[16px] font-black text-[var(--text)] tracking-tight">{fmtValue(service.price)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* PRODUCTS & ADD-ONS */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--text-3)] m-0">Products & Add-ons</h2>
            <div className="h-px flex-1 bg-[var(--line-inner)]" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.length === 0 ? (
              <div className="col-span-full p-8 text-center border border-dashed border-[var(--line-inner)] rounded-[16px] text-[var(--text-4)] text-sm font-medium">
                No products or add-ons defined yet.
              </div>
            ) : (
              products.map(product => (
                <div key={product.service_id} className="glass-panel p-5 flex flex-col gap-3 relative hover-lift transition-all" style={{ borderRadius: '12px' }}>
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-bold text-[14px] text-[var(--text)] leading-tight m-0">{product.name}</h3>
                    <span className="text-[13px] font-black text-[var(--link)]">{fmtValue(product.price)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-auto">
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-4)' }}>
                      {product.type}
                    </span>
                    {!product.is_active && (
                      <span className="text-[10px] text-red-400 font-bold">Draft</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

      </div>
    </div>
  )
}
