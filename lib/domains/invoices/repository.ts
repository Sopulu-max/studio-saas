import { SupabaseClient } from '@supabase/supabase-js'
import { sessionName } from '@/lib/session-title'
import {
  InvoiceStatsDTO,
  InvoiceChartDataDTO,
  InvoiceListDTO,
  OutstandingInvoiceDTO,
  PaymentLogDTO,
  InvoiceDetailDTO
} from './types'

export async function getInvoiceStats(
  supabase: SupabaseClient,
  studioId: string
): Promise<{ stats: InvoiceStatsDTO; chartData: InvoiceChartDataDTO }> {
  const { data: allInvoicesRaw } = await supabase
    .from('invoices')
    .select('invoice_id, total, status, bookings!inner(studio_id)')
    .eq('bookings.studio_id', studioId)

  const allInvoices = (allInvoicesRaw ?? []) as unknown as { invoice_id: string; total: number | string | null; status: string }[]
  const allInvoiceIds = allInvoices.map(i => i.invoice_id)

  const { data: allPaymentsRaw } = allInvoiceIds.length > 0
    ? await supabase.from('payments').select('invoice_id, amount').in('invoice_id', allInvoiceIds)
    : { data: [] }
  const allPayments = (allPaymentsRaw ?? []) as unknown as { invoice_id: string; amount: number | string | null }[]

  const paidMap: Record<string, number> = {}
  for (const p of allPayments) {
    paidMap[p.invoice_id] = (paidMap[p.invoice_id] ?? 0) + Number(p.amount)
  }

  function balance(inv: { invoice_id: string; total: number | string | null | undefined }) {
    return Math.max(0, Number(inv.total ?? 0) - (paidMap[inv.invoice_id] ?? 0))
  }

  const stats: InvoiceStatsDTO = {
    total_invoiced: allInvoices.reduce((s, i) => s + Number(i.total ?? 0), 0),
    total_collected: allInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total ?? 0), 0),
    total_outstanding: allInvoices.filter(i => i.status === 'sent' || i.status === 'draft').reduce((s, i) => s + balance(i), 0),
    total_overdue: allInvoices.filter(i => i.status === 'overdue').reduce((s, i) => s + balance(i), 0)
  }

  const chartData: InvoiceChartDataDTO = {
    monthly_revenue: [],
    status_counts: {}
  }

  for (const inv of allInvoices) {
    chartData.status_counts[inv.status] = (chartData.status_counts[inv.status] ?? 0) + 1
  }

  if (allInvoiceIds.length > 0) {
    const sixAgo = new Date()
    sixAgo.setMonth(sixAgo.getMonth() - 5)
    sixAgo.setDate(1)
    
    const { data: revenueRaw } = await supabase
      .from('payments')
      .select('paid_at, amount')
      .in('invoice_id', allInvoiceIds)
      .gte('paid_at', sixAgo.toISOString().slice(0, 10))

    const revByMo = new Map<string, number>()
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      revByMo.set(key, 0)
    }

    for (const p of (revenueRaw ?? []) as unknown as { paid_at: string | null; amount: number | string | null }[]) {
      if (!p.paid_at) continue
      const key = p.paid_at.slice(0, 7)
      if (revByMo.has(key)) revByMo.set(key, (revByMo.get(key) ?? 0) + Number(p.amount ?? 0))
    }

    chartData.monthly_revenue = [...revByMo.entries()].map(([key, val]) => ({
      label: new Date(key + '-01').toLocaleDateString('en-NG', { month: 'short' }),
      value: Math.round(val / 1000)
    }))
  }

  return { stats, chartData }
}

export async function getInvoiceList(
  supabase: SupabaseClient,
  studioId: string,
  page: number,
  status: string,
  pageSize: number
): Promise<{ invoices: InvoiceListDTO[]; total: number }> {
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let q = supabase
    .from('invoices')
    .select('*, bookings!inner(booking_id, booking_ref, sessions(session_date, session_type), clients(client_id, full_name), studio_id)', { count: 'exact' })
    .eq('bookings.studio_id', studioId)

  if (status) q = q.eq('status', status)
  
  const { data, count } = await q.order('created_at', { ascending: false }).range(from, to)
  const rawInvoices = (data ?? []) as any[]

  if (rawInvoices.length === 0) return { invoices: [], total: 0 }

  // Get payments for these specific invoices
  const invoiceIds = rawInvoices.map(i => i.invoice_id)
  const { data: paymentsRaw } = await supabase
    .from('payments')
    .select('invoice_id, amount')
    .in('invoice_id', invoiceIds)

  const paidMap: Record<string, number> = {}
  for (const p of (paymentsRaw ?? [])) {
    paidMap[p.invoice_id] = (paidMap[p.invoice_id] ?? 0) + Number(p.amount)
  }

  const invoices = rawInvoices.map(inv => {
    const paid = paidMap[inv.invoice_id] ?? 0
    const total = Number(inv.total ?? 0)
    const clientName = inv.bookings?.clients?.full_name ?? '—'
    
    return {
      invoice_id: inv.invoice_id,
      client_name: clientName,
      client_id: inv.bookings?.clients?.client_id,
      session_name: sessionName(clientName, inv.bookings?.booking_ref, inv.bookings?.booking_id, inv.bookings?.sessions?.[0]?.session_date),
      session_id: inv.bookings?.booking_id,
      total,
      paid,
      balance: Math.max(0, total - paid),
      due_date: inv.due_date,
      status: inv.status
    }
  })

  return { invoices, total: count ?? 0 }
}

export async function getOutstandingInvoices(
  supabase: SupabaseClient,
  studioId: string
): Promise<{ invoices: OutstandingInvoiceDTO[] }> {
  const { data: rawInvoices } = await supabase
    .from('invoices')
    .select('*, bookings!inner(booking_id, booking_ref, sessions(session_date, session_type), clients(client_id, full_name), studio_id)')
    .eq('bookings.studio_id', studioId)
    .in('status', ['sent', 'overdue'])
    .order('due_date', { ascending: true })

  if (!rawInvoices || rawInvoices.length === 0) return { invoices: [] }

  const invoiceIds = rawInvoices.map(i => i.invoice_id)
  const { data: paymentsRaw } = await supabase
    .from('payments')
    .select('invoice_id, amount')
    .in('invoice_id', invoiceIds)

  const paidMap: Record<string, number> = {}
  for (const p of (paymentsRaw ?? [])) {
    paidMap[p.invoice_id] = (paidMap[p.invoice_id] ?? 0) + Number(p.amount)
  }

  const nowTime = new Date().getTime()

  const outstandingInvoices = rawInvoices
    .map(inv => {
      const paid = paidMap[inv.invoice_id] ?? 0
      const total = Number(inv.total ?? 0)
      const balance = Math.max(0, total - paid)
      const clientName = inv.bookings?.clients?.full_name ?? '—'
      const daysOverdue = inv.due_date ? Math.max(0, Math.floor((nowTime - new Date(inv.due_date).getTime()) / 86_400_000)) : 0

      return {
        invoice_id: inv.invoice_id,
        client_name: clientName,
        client_id: inv.bookings?.clients?.client_id,
        session_name: sessionName(clientName, inv.bookings?.booking_ref, inv.bookings?.booking_id, inv.bookings?.sessions?.[0]?.session_date),
        session_id: inv.bookings?.booking_id,
        total,
        paid,
        balance,
        due_date: inv.due_date,
        status: inv.status,
        days_overdue: daysOverdue
      }
    })
    .filter(inv => inv.balance > 0)
    .sort((a, b) => b.days_overdue - a.days_overdue || 0) // Overdue first

  return { invoices: outstandingInvoices }
}

export async function getPaymentsList(
  supabase: SupabaseClient,
  studioId: string,
  page: number,
  method: string,
  pageSize: number
): Promise<{ payments: PaymentLogDTO[]; total: number; distinctMethods: string[] }> {
  // We need to fetch all distinct methods first
  const { data: allInvoicesRaw } = await supabase
    .from('invoices')
    .select('invoice_id, bookings!inner(studio_id)')
    .eq('bookings.studio_id', studioId)
    
  const allInvoiceIds = (allInvoicesRaw ?? []).map((i: any) => i.invoice_id)
  
  let distinctMethods: string[] = []
  if (allInvoiceIds.length > 0) {
    const { data: methodRows } = await supabase.from('payments').select('method').in('invoice_id', allInvoiceIds.slice(0, 1000))
    distinctMethods = [...new Set(((methodRows ?? []) as any[]).map((r) => r.method).filter(Boolean) as string[])].sort()
  }

  if (allInvoiceIds.length === 0) return { payments: [], total: 0, distinctMethods: [] }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let q = supabase
    .from('payments')
    .select('*, invoices!inner(booking_id, bookings!inner(booking_id, booking_ref, sessions(session_date), studio_id, clients(full_name)))', { count: 'exact' })
    .eq('invoices.bookings.studio_id', studioId)

  if (method) q = q.eq('method', method)
  
  const { data, count } = await q.order('paid_at', { ascending: false }).range(from, to)

  const payments = (data ?? []).map((p: any) => {
    const bk = p.invoices?.bookings
    const clientName = bk?.clients?.full_name ?? '—'
    
    return {
      payment_id: p.payment_id,
      date: p.paid_at,
      client_name: clientName,
      session_name: sessionName(clientName, bk?.booking_ref, bk?.booking_id, bk?.sessions?.[0]?.session_date),
      amount: Number(p.amount ?? 0),
      method: p.method,
      reference: p.reference
    }
  })

  return { payments, total: count ?? 0, distinctMethods }
}

export async function getInvoiceDetail(
  supabase: SupabaseClient,
  studioId: string,
  invoiceId: string
): Promise<InvoiceDetailDTO | null> {
  const { data: invoiceRaw } = await supabase
    .from('invoices')
    .select(`
      *,
      bookings!inner (
        booking_id, booking_ref, sessions(session_date), location, notes, status, studio_id, package_id,
        clients ( client_id, full_name, email, phone ),
        packages ( name, base_price ),
        booking_staff ( role, staff ( full_name ) )
      )
    `)
    .eq('invoice_id', invoiceId)
    .eq('bookings.studio_id', studioId)
    .single()

  if (!invoiceRaw) return null

  const inv = invoiceRaw as any

  const { data: paymentsRaw } = await supabase
    .from('payments')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('paid_at', { ascending: false })
  
  const payments = (paymentsRaw ?? []).map((p: any) => ({
    payment_id: p.payment_id,
    amount: Number(p.amount ?? 0),
    method: p.method ?? '',
    reference: p.reference ?? null,
    paid_at: p.paid_at ?? ''
  }))

  const { data: addonsRaw } = await supabase
    .from('booking_addons')
    .select('quantity, package_addons(name, price)')
    .eq('booking_id', inv.bookings?.booking_id ?? '')
  
  const addons = (addonsRaw ?? []).map((a: any) => ({
    name: a.package_addons?.name ?? '',
    price: Number(a.package_addons?.price ?? 0),
    quantity: Number(a.quantity ?? 0)
  }))

  const amountPaid = payments.reduce((sum, p) => sum + p.amount, 0)
  const total = Number(inv.total ?? 0)
  const balanceDue = Math.max(0, total - amountPaid)

  const clientName = inv.bookings?.clients?.full_name ?? '—'

  return {
    invoice_id: inv.invoice_id,
    status: inv.status ?? 'draft',
    due_date: inv.due_date,
    issued_at: inv.issued_at,
    client: {
      client_id: inv.bookings?.clients?.client_id ?? '',
      full_name: clientName,
      email: inv.bookings?.clients?.email ?? null,
      phone: inv.bookings?.clients?.phone ?? null
    },
    session: {
      booking_id: inv.bookings?.booking_id ?? '',
      session_date: inv.bookings?.sessions?.[0]?.session_date ?? null,
      session_name: sessionName(clientName, inv.bookings?.booking_ref, inv.bookings?.booking_id, inv.bookings?.sessions?.[0]?.session_date),
      location: inv.bookings?.location ?? null,
      package_name: inv.bookings?.packages?.name ?? null,
      package_id: inv.bookings?.package_id ?? null
    },
    breakdown: {
      addons,
      subtotal: Number(inv.subtotal ?? 0),
      discount: Number(inv.discount ?? 0),
      tax_percentage: Number(inv.tax ?? 0),
      tax_amount: (Number(inv.subtotal ?? 0) - Number(inv.discount ?? 0)) * (Number(inv.tax ?? 0) / 100),
      total
    },
    payments,
    amount_paid: amountPaid,
    balance_due: balanceDue
  }
}
