import { NextResponse } from 'next/server'
import { getStudioContext, fetchStudio } from '@/lib/studio'
import { buildStudioConfig, getStatusConfig, getSessionTypeConfig } from '@/lib/studio-config'

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

  const studioRow = await fetchStudio(context.admin, context.studioId)
  const config    = buildStudioConfig(studioRow?.session_types, studioRow?.booking_statuses, studioRow?.service_types)

  type Row = {
    booking_ref?:      number | null
    booking_id:        string
    session_date?:     string | null
    session_type?:     string | null
    shoot_type?:       string | null
    status:            string
    location_address?: string | null
    notes?:            string | null
    clients?: { full_name?: string | null; email?: string | null; phone?: string | null } | null
    packages?: { name?: string | null } | null
  }

  const { data } = await context.admin
    .from('bookings')
    .select('booking_ref, booking_id, session_date, session_type, shoot_type, status, location_address, notes, clients(full_name, email, phone), packages(name)')
    .eq('studio_id', context.studioId)
    .order('session_date', { ascending: false })

  const rows = (data ?? []) as unknown as Row[]

  const header = csvRow(['Ref', 'Client', 'Email', 'Phone', 'Session type', 'Category', 'Date', 'Status', 'Package', 'Location', 'Notes'])

  const lines = rows.map(r => {
    const ref      = r.booking_ref != null ? `#${String(r.booking_ref).padStart(4, '0')}` : r.booking_id.slice(0, 8)
    const typeCfg  = getSessionTypeConfig(config, r.session_type)
    const statusCfg = getStatusConfig(config, r.status)
    const date     = r.session_date ? new Date(r.session_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
    return csvRow([
      ref,
      r.clients?.full_name,
      r.clients?.email,
      r.clients?.phone,
      typeCfg.label,
      r.shoot_type,
      date,
      statusCfg.label,
      (r.packages as { name?: string | null } | null)?.name,
      r.location_address,
      r.notes,
    ])
  })

  const csv = [header, ...lines].join('\r\n')
  const filename = `sessions-${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
