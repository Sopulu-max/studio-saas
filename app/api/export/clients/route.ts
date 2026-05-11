import { NextResponse } from 'next/server'
import { getStudioContext } from '@/lib/studio'

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

  type ClientRow = {
    client_ref?: number | null
    client_id:   string
    full_name?:  string | null
    email?:      string | null
    phone?:      string | null
    address?:    string | null
  }

  // Fetch clients + session count in parallel
  const [{ data: clientsRaw }, { data: bookingCounts }] = await Promise.all([
    context.admin
      .from('clients')
      .select('client_ref, client_id, full_name, email, phone, address')
      .eq('studio_id', context.studioId)
      .order('full_name'),
    context.admin
      .from('bookings')
      .select('client_id')
      .eq('studio_id', context.studioId),
  ])

  const clients = (clientsRaw ?? []) as unknown as ClientRow[]

  // Count bookings per client
  const sessionCount: Record<string, number> = {}
  for (const b of bookingCounts ?? []) {
    const cid = (b as { client_id: string }).client_id
    sessionCount[cid] = (sessionCount[cid] ?? 0) + 1
  }

  const header = csvRow(['Ref', 'Full name', 'Email', 'Phone', 'Address', 'Sessions'])

  const lines = clients.map(c => {
    const ref = c.client_ref != null ? `#${String(c.client_ref).padStart(4, '0')}` : c.client_id.slice(0, 8)
    return csvRow([ref, c.full_name, c.email, c.phone, c.address, sessionCount[c.client_id] ?? 0])
  })

  const csv = [header, ...lines].join('\r\n')
  const filename = `clients-${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
