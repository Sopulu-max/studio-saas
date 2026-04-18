import { NextRequest, NextResponse } from 'next/server'
import { getStudioContext } from '@/lib/studio'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return NextResponse.json({ clients: [], sessions: [], invoices: [] })

  const context = await getStudioContext()
  if ('error' in context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const like = `%${q}%`

  const [
    { data: clients },
    { data: sessions },
    { data: invoices },
  ] = await Promise.all([
    context.admin
      .from('clients')
      .select('client_id, full_name, email, phone')
      .eq('studio_id', context.studioId)
      .or(`full_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
      .limit(5),

    context.admin
      .from('bookings')
      .select('booking_id, session_date, status, session_type, clients(full_name)')
      .eq('studio_id', context.studioId)
      .limit(5)
      // Search by client name via a sub-query using client IDs
      .in('client_id', await (async () => {
        const { data } = await context.admin
          .from('clients')
          .select('client_id')
          .eq('studio_id', context.studioId)
          .ilike('full_name', like)
          .limit(20)
        return (data ?? []).map(c => c.client_id)
      })()),

    context.admin
      .from('invoices')
      .select('invoice_id, total, status, bookings!inner(studio_id, clients(full_name))')
      .eq('bookings.studio_id', context.studioId)
      .limit(4),
  ])

  return NextResponse.json({
    clients:  clients  ?? [],
    sessions: sessions ?? [],
    invoices: (invoices ?? []).filter((inv: any) => {
      const name: string = inv.bookings?.clients?.full_name ?? ''
      return name.toLowerCase().includes(q.toLowerCase())
    }),
  })
}
