import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'
import { getPackageList } from '@/lib/domains/packages/repository'
import { AnimatedList, AnimatedItem } from '@/components/animated-list'

export default async function LegacyPackagesPage() {
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const { admin, studioId } = context

  // Fetch legacy packages
  const res = await getPackageList(admin, studioId, 1, '', '', 500)
  const packages = res.packages

  function fmtValue(val: number | null) {
    if (val === null) return 'Variable'
    if (val === 0) return 'Free'
    return '₦' + val.toLocaleString('en-NG')
  }

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 md:p-8 animate-enter">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text)] mb-1">Legacy Packages</h1>
          <p className="text-sm text-[var(--text-4)] uppercase tracking-widest font-semibold">Pre-built Bundles</p>
        </div>
        
        <div className="flex gap-3">
          <Link href="/dashboard/packages/new" className="px-6 py-2.5 rounded-full text-sm font-bold shadow-lg hover-lift transition-all" style={{ background: 'var(--btn)', color: 'var(--btn-fg)' }}>
            + New Legacy Package
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-12 flex flex-col gap-10">
        
        {/* WARNING ALERT */}
        <div className="glass-panel p-5 rounded-[12px] border-l-4 border-l-amber-500 bg-[rgba(245,158,11,0.05)]">
          <h3 className="font-bold text-amber-500 mb-1">Legacy Architecture</h3>
          <p className="text-[13px] text-[var(--text-3)] m-0">
            Packages are being phased out in favor of the new <strong>Services & Add-ons</strong> matrix. You can still manage your existing bundled packages here, but we recommend building future offerings in the Services Catalog.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.length === 0 ? (
            <div className="col-span-full p-8 text-center border border-dashed border-[var(--line-inner)] rounded-[16px] text-[var(--text-4)] text-sm font-medium">
              No legacy packages found.
            </div>
          ) : (
            packages.map((pkg: any) => (
              <Link 
                key={pkg.package_id}
                href={`/dashboard/packages/${pkg.package_id}`}
                className="glass-panel p-6 flex flex-col gap-4 relative overflow-hidden group hover-lift transition-all" 
                style={{ borderRadius: '16px', textDecoration: 'none' }}
              >
                
                {/* Status dot */}
                <div className="absolute top-6 right-6 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${pkg.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                </div>

                <div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3 inline-block" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-3)' }}>
                    Bundle
                  </span>
                  <h3 className="font-bold text-[18px] text-[var(--text)] tracking-tight leading-tight m-0 pr-6">{pkg.name}</h3>
                </div>

                <div className="flex justify-between items-end border-t border-[var(--line-inner)] pt-4 mt-auto">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-4)] mb-0.5">Category</span>
                    <span className="text-[13px] font-bold text-[var(--text-2)] capitalize">{pkg.shoot_type || 'Uncategorized'}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-4)] mb-0.5">Bundle Price</span>
                    <span className="text-[16px] font-black text-[var(--text)] tracking-tight">{fmtValue(pkg.price)}</span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

      </div>
    </div>
  )
}
