import Image from 'next/image'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { verifySignedPublicLink } from '@/lib/public-links'

type ContractBooking = {
  booking_id?: string | null
  session_date?: string | null
  location_address?: string | null
  clients?: { full_name?: string | null; email?: string | null } | null
  packages?: { name?: string | null } | null
  studios?: { name?: string | null; email?: string | null; phone?: string | null; address?: string | null; logo_url?: string | null } | null
}

export default async function PublicContractViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ studioSlug: string; id: string }>
  searchParams: Promise<{ sig?: string; exp?: string }>
}) {
  const { id, studioSlug } = await params
  const { sig, exp } = await searchParams
  if (!verifySignedPublicLink('contract', id, sig, exp)) notFound()

  const admin = createAdminClient()

  const { data: contract } = await admin
    .from('contracts')
    .select(`
      *,
      bookings (
        booking_id,
        sessions ( session_date, location_address ),
        clients ( full_name, email ),
        packages ( name ),
        studios ( name, email, phone, address, logo_url )
      )
    `)
    .eq('contract_id', id)
    .maybeSingle()

  if (!contract) notFound()

  type ContractRow = {
    contract_id: string
    status: string | null
    content: string | null
    signed_by: string | null
    signed_at: string | null
    bookings: ContractBooking | null
  }
  const typedContract = contract as unknown as ContractRow
  const booking = typedContract.bookings
  const studio = booking?.studios ?? null
  const client = booking?.clients ?? null
  const pkg = booking?.packages ?? null

  return (
    <div className="w-full max-w-4xl mx-auto px-6 py-12 md:py-20 animate-enter pb-32">
      <div className="flex justify-between items-center mb-12">
        <a 
          href={`/${studioSlug}/portal/summary/${booking?.booking_id}?sig=${sig}&exp=${exp}`}
          className="flex items-center gap-2 text-sm font-bold text-[var(--text-3)] hover:text-[var(--text)] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back to Portal
        </a>
        <div className="flex items-center gap-3">
          <button id="print-btn" className="px-5 py-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--line)] text-[var(--text)] font-bold text-sm hover:opacity-90 transition-opacity flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            Save as PDF
          </button>
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: `
        document.getElementById('print-btn')?.addEventListener('click', function() {
          window.print();
        });
      `}} />

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
              <p className="text-3xl font-black tracking-tight text-[var(--text)] uppercase">Contract</p>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mt-2 ${typedContract.status === 'signed' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                {typedContract.status === 'signed' ? (
                  <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Signed</>
                ) : (
                  <><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Pending Signature</>
                )}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-4)] mb-2">Client</p>
              <p className="text-base font-medium text-[var(--text)]">{client?.full_name}</p>
              <p className="text-sm text-[var(--text-3)]">{client?.email}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-4)] mb-2">Session</p>
              <p className="text-base font-medium text-[var(--text)]">
                {((booking as any).sessions?.[0]?.session_date) 
                  ? new Date((booking as any).sessions[0].session_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
                  : 'TBD'}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-4)] mb-2">Location</p>
              <p className="text-base font-medium text-[var(--text)]">
                {((booking as any).sessions?.[0]?.location_address) || 'TBD'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel p-8 md:p-12 mb-8 prose prose-neutral dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:text-sm md:prose-p:text-base prose-headings:font-bold prose-h2:text-xl">
        {(typedContract.content ?? '').split('\n').map((line: string, index: number) => {
          if (line.startsWith('## ')) return <h2 key={index} className="mt-8 mb-4 border-b border-[var(--line-inner)] pb-2">{line.replace('## ', '')}</h2>
          if (line.startsWith('# ')) return <h1 key={index} className="mt-8 mb-4 text-2xl font-black">{line.replace('# ', '')}</h1>
          return (
            <p key={index} className="mb-4 text-[var(--text-2)]">
              {line || <br />}
            </p>
          )
        })}
      </div>

      <div className="glass-panel p-8 md:p-12">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-4)] mb-8">Signatures</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <p className="text-sm font-bold text-[var(--text-3)] mb-4">Client Signature</p>
            {typedContract.status === 'signed' ? (
              <div className="h-16 flex flex-col justify-end border-b border-[var(--text)] mb-2">
                <span className="font-serif text-2xl text-[var(--text)] italic">{typedContract.signed_by || client?.full_name}</span>
              </div>
            ) : (
              <div className="h-16 border-b border-[var(--line)] mb-2 bg-[var(--surface-2)]/50 rounded-t-lg" />
            )}
            <p className="text-sm font-medium text-[var(--text)]">{client?.full_name}</p>
            {typedContract.signed_at && (
              <p className="text-xs text-[var(--text-4)] mt-1">
                Signed on {new Date(typedContract.signed_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--text-3)] mb-4">Studio Representative</p>
            <div className="h-16 flex flex-col justify-end border-b border-[var(--line)] mb-2">
              <span className="font-serif text-2xl text-[var(--text-4)] italic">Electronic Signature</span>
            </div>
            <p className="text-sm font-medium text-[var(--text)]">{studio?.name}</p>
          </div>
        </div>
      </div>

      {/* Floating Action Bar for unsigned contracts */}
      {typedContract.status !== 'signed' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 md:p-8 pointer-events-none z-50 flex justify-center">
          <div className="glass-panel rounded-2xl shadow-2xl p-4 flex flex-col sm:flex-row items-center gap-6 pointer-events-auto border-[var(--primary)]/20 bg-[var(--card)]/90 backdrop-blur-xl max-w-3xl w-full">
            <div className="flex-1">
              <p className="text-sm font-bold text-[var(--text)]">Ready to sign?</p>
              <p className="text-xs text-[var(--text-4)] mt-1">By signing, you agree to the terms and conditions outlined above.</p>
            </div>
            <button className="px-8 py-3 rounded-xl bg-[var(--primary)] text-white font-bold shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] hover:scale-[1.02] active:scale-95 transition-all w-full sm:w-auto">
              Sign & Accept
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
