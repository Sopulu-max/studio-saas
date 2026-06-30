import Image from 'next/image'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { verifySignedPublicLink } from '@/lib/public-links'
import PublicInvoicePrintButton from './print-button'

type AddonRow = {
  quantity: number
  package_addons?: { name?: string | null; price?: number | string | null } | null
}

type InvoiceBooking = {
  booking_id: string
  session_date?: string | null
  location?: string | null
  clients?: { full_name?: string | null; email?: string | null; phone?: string | null } | null
  packages?: { name?: string | null; base_price?: number | string | null } | null
  studios?: { name?: string | null; email?: string | null; phone?: string | null; address?: string | null; logo_url?: string | null } | null
}

type InvoiceRow = {
  invoice_id: string
  total: number | string | null
  subtotal: number | string | null
  discount: number | string | null
  tax: number | string | null
  status: string | null
  issued_at: string | null
  due_date: string | null
  bookings: InvoiceBooking | null
}

export default async function PublicInvoiceViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ studioSlug: string; id: string }>
  searchParams: Promise<{ sig?: string; exp?: string }>
}) {
  const { id, studioSlug } = await params
  const { sig, exp } = await searchParams
  if (!verifySignedPublicLink('invoice', id, sig, exp)) notFound()

  const admin = createAdminClient()

  const { data: invoice } = await admin
    .from('invoices')
    .select(`
      *,
      bookings (
        booking_id, location,
        sessions ( session_date ),
        clients ( full_name, email, phone ),
        packages ( name, base_price ),
        studios ( name, email, phone, address, logo_url )
      )
    `)
    .eq('invoice_id', id)
    .maybeSingle()

  if (!invoice) notFound()

  const typedInvoice = invoice as unknown as InvoiceRow

  type PaymentRow = { payment_id: string; paid_at: string; amount: number | string; method: string; reference?: string | null }
  const { data: paymentsRaw } = await admin
    .from('payments')
    .select('*')
    .eq('invoice_id', id)
    .order('paid_at', { ascending: true })
  const payments = (paymentsRaw ?? []) as unknown as PaymentRow[]

  const booking = typedInvoice.bookings

  const { data: addons } = await admin
    .from('booking_addons')
    .select('quantity, package_addons(name, price)')
    .eq('booking_id', booking?.booking_id ?? '')

  const studio = booking?.studios ?? null
  const client = booking?.clients ?? null
  const pkg = booking?.packages ?? null
  const amountPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
  const balanceDue = Math.max(0, Number(typedInvoice.total) - amountPaid)
  const shortId = id.slice(-8).toUpperCase()
  const fmt = (n: number) => 'NGN ' + Number(n).toLocaleString('en-NG')

  const addonsList = (addons ?? []) as unknown as AddonRow[]
  const addonsTotal = addonsList.reduce((sum, addon) => sum + Number(addon.package_addons?.price ?? 0) * addon.quantity, 0)
  const baseAmount = Number(typedInvoice.subtotal) - addonsTotal

  return (
    <div className="w-full max-w-4xl mx-auto px-6 py-12 md:py-20 animate-enter">
      {/* Header Actions */}
      <div className="flex justify-between items-center mb-12">
        <a 
          href={`/${studioSlug}/portal/summary/${booking?.booking_id}?sig=${sig}&exp=${exp}`}
          className="flex items-center gap-2 text-sm font-bold text-[var(--text-3)] hover:text-[var(--text)] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back to Portal
        </a>
        <div className="flex items-center gap-3">
          <PublicInvoicePrintButton />
        </div>
      </div>

      <div className="glass-panel p-8 md:p-12 mb-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--primary)]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-[var(--primary)]/10 transition-colors duration-700" />
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-[var(--line-inner)] pb-8 mb-8">
            <div className="flex items-center gap-4">
              {studio?.logo_url ? (
                <Image src={studio.logo_url} alt={studio.name ?? ''} width={56} height={56} unoptimized className="rounded-xl shadow-lg border border-[var(--line)]" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-[var(--primary)] flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-[var(--primary)]/20">
                  {studio?.name?.charAt(0) ?? 'S'}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">{studio?.name}</h1>
                <p className="text-sm text-[var(--text-4)]">{studio?.email} • {studio?.phone}</p>
              </div>
            </div>
            <div className="text-left md:text-right">
              <p className="text-3xl font-black tracking-tight text-[var(--text)] uppercase">Invoice</p>
              <p className="text-sm text-[var(--text-4)] mt-1 font-mono tracking-wider">#{shortId}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-4)] mb-2">Billed To</p>
              <p className="text-base font-medium text-[var(--text)]">{client?.full_name}</p>
              <p className="text-sm text-[var(--text-3)]">{client?.email}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-4)] mb-2">Issued</p>
              <p className="text-base font-medium text-[var(--text)]">
                {typedInvoice.issued_at ? new Date(typedInvoice.issued_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-4)] mb-2">Due Date</p>
              <p className="text-base font-medium text-[var(--text)]">
                {typedInvoice.due_date ? new Date(typedInvoice.due_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-4)] mb-2">Status</p>
              {balanceDue <= 0 ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Paid
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Pending
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel overflow-hidden mb-8">
        <div className="p-6 border-b border-[var(--line-inner)]">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-4)] m-0">Itemized Breakdown</p>
        </div>
        
        <div className="divide-y divide-[var(--line-inner)]">
          <div className="p-6 flex justify-between items-center">
            <div>
              <p className="font-bold text-[var(--text)] text-base">{pkg?.name ?? 'Studio Session Base'}</p>
              <p className="text-sm text-[var(--text-4)]">Agreed package base rate</p>
            </div>
            <p className="font-medium text-[var(--text)]">{fmt(baseAmount)}</p>
          </div>

          {addonsList.map((addon, index) => (
            <div key={`addon-${index}`} className="p-6 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded bg-[var(--surface-2)] flex items-center justify-center text-xs font-bold text-[var(--text-4)]">
                  x{addon.quantity}
                </div>
                <div>
                  <p className="font-medium text-[var(--text)]">{addon.package_addons?.name}</p>
                  <p className="text-xs text-[var(--text-4)] uppercase tracking-wider">Add-on</p>
                </div>
              </div>
              <p className="font-medium text-[var(--text)]">{fmt(Number(addon.package_addons?.price ?? 0) * addon.quantity)}</p>
            </div>
          ))}
        </div>

        <div className="bg-[var(--surface-2)] p-6 flex flex-col items-end border-t border-[var(--line-inner)]">
          <div className="w-full max-w-sm space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-[var(--text-4)] font-medium">Subtotal</span>
              <span className="text-[var(--text)] font-medium">{fmt(Number(typedInvoice.subtotal))}</span>
            </div>
            {Number(typedInvoice.discount) > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-[var(--text-4)] font-medium">Discount</span>
                <span className="text-emerald-500 font-medium">-{fmt(Number(typedInvoice.discount))}</span>
              </div>
            )}
            {Number(typedInvoice.tax) > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-[var(--text-4)] font-medium">Tax ({typedInvoice.tax}%)</span>
                <span className="text-[var(--text)] font-medium">{fmt(Number(typedInvoice.subtotal) * Number(typedInvoice.tax) / 100)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-4 border-t border-[var(--line)]">
              <span className="text-lg font-bold text-[var(--text)]">Total</span>
              <span className="text-2xl font-black text-[var(--text)]">{fmt(Number(typedInvoice.total))}</span>
            </div>
          </div>
        </div>
      </div>

      {payments && payments.length > 0 && (
        <div className="glass-panel p-6 mb-8">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-4)] mb-6">Payment History</p>
          <div className="space-y-4">
            {payments.map((payment) => (
              <div key={payment.payment_id} className="flex justify-between items-center p-4 rounded-xl border border-[var(--line-inner)] bg-[var(--surface-2)]">
                <div>
                  <p className="text-sm font-bold text-[var(--text)] uppercase">{payment.method.replace('_', ' ')}</p>
                  <p className="text-xs text-[var(--text-4)] mt-1">
                    {new Date(payment.paid_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
                    {payment.reference ? ` • Ref: ${payment.reference}` : ''}
                  </p>
                </div>
                <p className="font-bold text-[var(--text)]">{fmt(Number(payment.amount))}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 md:p-8 pointer-events-none z-50 flex justify-center">
        <div className="glass-panel rounded-2xl shadow-2xl p-4 flex items-center gap-6 pointer-events-auto border-[var(--line)] bg-[var(--card)]/80 backdrop-blur-xl">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-4)]">Balance Due</p>
            <p className="text-2xl font-black text-[var(--text)] leading-none mt-1">{fmt(balanceDue)}</p>
          </div>
          {balanceDue > 0 ? (
            <button className="px-8 py-3 rounded-xl bg-[var(--text)] text-[var(--card)] font-bold shadow-lg hover:scale-[1.02] active:scale-95 transition-all">
              Pay Now
            </button>
          ) : (
            <div className="px-8 py-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Fully Paid
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
