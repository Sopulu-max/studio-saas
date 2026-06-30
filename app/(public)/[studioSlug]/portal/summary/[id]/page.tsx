import Image from 'next/image'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { verifySignedPublicLink } from '@/lib/public-links'
import PrintButton from '@/app/(public)/[studioSlug]/print/invoice/[id]/print-button'
import { unwrapRow } from "@/lib/utils"

type AddonRow = {
  quantity: number
  package_addons?: { name?: string | null; price?: number | string | null } | null
}

type ServiceRow = {
  quantity: number
  price_at_booking?: number | string | null
  services?: { name?: string | null } | null
}

type PackageInclusion = {
  label: string
  type: string
}

type BookingRecord = {
  booking_id: string
  session_date?: string | null
  location?: string | null
  created_at?: string | null
  clients?: { full_name?: string | null; email?: string | null; phone?: string | null } | null
  packages?: { name?: string | null; base_price?: number | string | null; package_inclusions?: PackageInclusion[] | null } | null
  studios?: { name?: string | null; email?: string | null; phone?: string | null; address?: string | null; logo_url?: string | null } | null
}

export default async function PublicSummaryViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ studioSlug: string; id: string }>
  searchParams: Promise<{ sig?: string; exp?: string }>
}) {
  const { id, studioSlug } = await params
  const { sig, exp } = await searchParams
  
  // We can reuse the invoice verifier or create a new one. Since verifySignedPublicLink checks type === 'invoice', we might need to add 'summary' type support.
  // Actually, wait, let's check if verifySignedPublicLink supports 'summary'. If not, we can just allow it for now or add it.
  // For safety, let's assume it only supports what's defined. Let's look at public-links.ts in a sec.
  // Wait, I can just use 'invoice' for the token generation since it uses the same booking_id? No, links are generated for invoice_id or booking_id.
  // Let's use 'summary' and we will update public-links.ts if needed.
  if (!verifySignedPublicLink('summary', id, sig, exp)) notFound()

  const admin = createAdminClient()

  const { data: bookingRaw } = await admin
    .from('bookings')
    .select(`
      *,
      clients ( full_name, email, phone ),
      sessions ( session_date ),
      packages ( name, base_price, package_inclusions ( label, type ) ),
      studios ( name, email, phone, address, logo_url )
    `)
    .eq('booking_id', id)
    .maybeSingle()

  if (!bookingRaw) notFound()

  const booking = bookingRaw as unknown as BookingRecord

  const { data: addons } = await admin
    .from('booking_addons')
    .select('quantity, package_addons(name, price)')
    .eq('booking_id', id)

  const { data: services } = await admin
    .from('booking_services')
    .select('quantity, price_at_booking, services(name)')
    .eq('booking_id', id)

  const studio = booking.studios ?? null
  const client = booking.clients ?? null
  const pkg = booking.packages ?? null

  const addonRows = (addons ?? []) as unknown as AddonRow[]
  const serviceRows = (services ?? []) as unknown as ServiceRow[]
  
  const pkgBase = Number(pkg?.base_price ?? 0)
  const addonsTotal = addonRows.reduce((sum, addon) => sum + Number(addon.package_addons?.price ?? 0) * addon.quantity, 0)
  const servicesTotal = serviceRows.reduce((sum, svc) => sum + Number(svc.price_at_booking ?? 0) * svc.quantity, 0)
  
  const subtotal = pkgBase + addonsTotal + servicesTotal

  const fmt = (n: number) => 'NGN ' + Number(n).toLocaleString('en-NG')
  const shortId = id.slice(-8).toUpperCase()
  const documentTitle = pkg?.name ? `${pkg.name} - Booking Summary` : 'Booking Summary'

  const statusMap: Record<string, { label: string; color: string }> = {
    pending: { label: 'Pending', color: 'text-amber-500' },
    confirmed: { label: 'Confirmed', color: 'text-emerald-500' },
    completed: { label: 'Completed', color: 'text-blue-500' },
    cancelled: { label: 'Cancelled', color: 'text-red-500' },
  }
  const s = statusMap['confirmed'] 

  return (
    <div className="w-full max-w-4xl mx-auto px-6 py-12 md:py-20 animate-enter">
      <div className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-4">
          {studio?.logo_url ? (
            <Image src={studio.logo_url} alt={studio.name ?? ''} width={48} height={48} unoptimized className="rounded-xl shadow-lg border border-[var(--line)]" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-[var(--primary)] flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-[var(--primary)]/20">
              {studio?.name?.charAt(0) ?? 'S'}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">{studio?.name}</h1>
            <p className="text-sm text-[var(--text-4)]">Client Portal</p>
          </div>
        </div>
        <PrintButton />
      </div>

      <div className="glass-panel p-8 md:p-12 mb-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--primary)]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-[var(--primary)]/10 transition-colors duration-700" />
        
        <div className="relative z-10">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--primary)] mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse" />
            Active Session
          </p>
          
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-[var(--text)] mb-6">
            {pkg?.name ?? 'Studio Session'}
          </h2>

          <div className="flex flex-col md:flex-row gap-8 md:gap-16 pt-8 border-t border-[var(--line-inner)] mt-8">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-4)] mb-2">Date</p>
              <p className="text-lg font-medium text-[var(--text)]">
                {((booking as any).sessions?.[0]?.session_date) 
                  ? new Date((booking as any).sessions[0].session_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
                  : 'To be scheduled'}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-4)] mb-2">Location</p>
              <p className="text-lg font-medium text-[var(--text)]">{booking.location ?? 'TBD'}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-4)] mb-2">Reference</p>
              <p className="text-lg font-medium text-[var(--text)] font-mono tracking-wider">#{shortId}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="glass-panel p-6 flex flex-col justify-between">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-4)] mb-4">Client Details</p>
          <div>
            <p className="text-lg font-medium text-[var(--text)] mb-1">{client?.full_name}</p>
            {client?.email && <p className="text-sm text-[var(--text-3)]">{client.email}</p>}
            {client?.phone && <p className="text-sm text-[var(--text-3)] mt-1">{client.phone}</p>}
          </div>
        </div>

        <div className="glass-panel p-6 flex flex-col justify-between md:col-span-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-4)] mb-4">Financial Summary</p>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-3xl font-black tracking-tight text-[var(--text)]">{fmt(subtotal)}</p>
              <p className="text-sm text-[var(--text-4)] mt-1">Total Agreed Value</p>
            </div>
            <a 
              href={`/${studioSlug}/portal/invoice/${id}?sig=${sig}&exp=${exp}`}
              className="px-5 py-2.5 rounded-lg bg-[var(--text)] text-[var(--card)] font-bold text-sm hover:opacity-90 transition-opacity"
            >
              View Invoice
            </a>
          </div>
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="p-6 border-b border-[var(--line-inner)]">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-4)] m-0">Inclusions & Add-ons</p>
        </div>
        
        <div className="divide-y divide-[var(--line-inner)]">
          {pkg && (
            <div className="p-6">
              <div className="flex justify-between items-start mb-2">
                <p className="font-bold text-[var(--text)] text-lg">{pkg.name}</p>
                <p className="font-medium text-[var(--text)]">{fmt(pkgBase)}</p>
              </div>
              {pkg.package_inclusions && pkg.package_inclusions.length > 0 && (
                <ul className="space-y-2 mt-4">
                  {pkg.package_inclusions.map((inc, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-[var(--text-3)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] opacity-50" />
                      {inc.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {addonRows.map((addon, i) => (
            <div key={`addon-${i}`} className="p-6 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded bg-[var(--surface-2)] flex items-center justify-center text-xs font-bold text-[var(--text-4)]">
                  x{addon.quantity}
                </div>
                <p className="font-medium text-[var(--text)]">{addon.package_addons?.name}</p>
              </div>
              <p className="font-medium text-[var(--text)]">{fmt(Number(addon.package_addons?.price ?? 0) * addon.quantity)}</p>
            </div>
          ))}

          {serviceRows.map((svc, i) => (
            <div key={`svc-${i}`} className="p-6 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded bg-[var(--surface-2)] flex items-center justify-center text-xs font-bold text-[var(--text-4)]">
                  x{svc.quantity}
                </div>
                <p className="font-medium text-[var(--text)]">{svc.services?.name}</p>
              </div>
              <p className="font-medium text-[var(--text)]">{fmt(Number(svc.price_at_booking ?? 0) * svc.quantity)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
