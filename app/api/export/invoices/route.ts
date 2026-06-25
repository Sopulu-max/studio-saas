import { NextResponse } from 'next/server'
import { getStudioContext } from '@/lib/studio'
import { unwrapRow } from "@/lib/utils";

function csvCell(v: string | number | null | undefined): string {
  const s = String(v ?? '')
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}
function csvRow(cells: (string | number | null | undefined)[]) {
  return cells.map(csvCell).join(',')
}

export async function GET() {
  const context = await getStudioContext()
  if ('error' in context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  type InvoiceRow = {
    invoice_id: string
    total?:     number | string | null
    status:     string
    due_date?:  string | null
    issued_at?: string | null
    bookings?: {
      booking_ref?:  number | null
      sessions?: { session_date?: string | null }[] | null
      clients?: { full_name?: string | null; email?: string | null } | null
    } | null
    payments?: { amount: number | string }[] | null
  }

  const { data } = await context.admin
    .from('invoices')
    .select('invoice_id, total, status, due_date, issued_at, bookings!inner(booking_ref, sessions(session_date), clients(full_name, email)), payments(amount)')
    .eq('bookings.studio_id', context.studioId)
    .order('issued_at', { ascending: false })

  const rows = (data ?? []) as unknown as InvoiceRow[]

  const header = csvRow(['Invoice ID', 'Client', 'Email', 'Session ref', 'Session date', 'Total (₦)', 'Paid (₦)', 'Outstanding (₦)', 'Status', 'Due date', 'Issued'])

  const fmtDate = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

  const lines = rows.map(r => {
    const total       = Number(r.total ?? 0)
    const paid        = (r.payments ?? []).reduce((s, p) => s + Number(p.amount ?? 0), 0)
    const outstanding = r.status === 'cancelled' ? 0 : Math.max(0, total - paid)
    const sessionRef  = unwrapRow(r.bookings)?.booking_ref != null ? `#${String(unwrapRow(r.bookings).booking_ref).padStart(4, '0')}` : ''
    return csvRow([
      r.invoice_id.slice(0, 8),
      unwrapRow(unwrapRow(r.bookings)?.clients)?.full_name,
      unwrapRow(unwrapRow(r.bookings)?.clients)?.email,
      sessionRef,
      fmtDate((unwrapRow(r.bookings)?.sessions as any)?.[0]?.session_date),
      total,
      paid,
      outstanding,
      r.status,
      fmtDate(r.due_date),
      fmtDate(r.issued_at),
    ])
  })

  const csv = [header, ...lines].join('\r\n')
  const filename = `invoices-${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
