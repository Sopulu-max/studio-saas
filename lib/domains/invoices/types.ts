export type InvoiceStatsDTO = {
  total_invoiced: number
  total_collected: number
  total_outstanding: number
  total_overdue: number
}

export type InvoiceChartDataDTO = {
  monthly_revenue: { label: string; value: number }[]
  status_counts: Record<string, number>
}

export type InvoiceListDTO = {
  invoice_id: string
  client_name: string
  client_id?: string
  session_name: string
  session_id?: string
  total: number
  paid: number
  balance: number
  due_date: string | null
  status: string
}

export type OutstandingInvoiceDTO = InvoiceListDTO & {
  days_overdue: number
}

export type PaymentLogDTO = {
  payment_id: string
  date: string
  client_name: string
  session_name: string
  amount: number
  method: string
  reference: string | null
}

export type InvoiceDetailDTO = {
  invoice_id: string
  status: string
  due_date: string | null
  issued_at: string | null
  client: {
    client_id: string
    full_name: string
    email: string | null
    phone: string | null
  }
  session: {
    booking_id: string
    session_date: string | null
    session_name: string
    location: string | null
    package_name: string | null
    package_id: string | null
  }
  breakdown: {
    addons: { name: string; price: number; quantity: number }[]
    subtotal: number
    discount: number
    tax_percentage: number
    tax_amount: number
    total: number
  }
  payments: {
    payment_id: string
    amount: number
    method: string
    reference: string | null
    paid_at: string
  }[]
  amount_paid: number
  balance_due: number
}
