// ============================================================================
// CLIENT DTOs (Data Transfer Objects)
// ============================================================================

export type ClientTier = {
  label: string
  bg: string
  color: string
}

export type ClientListDTO = {
  client_id: string
  full_name: string
  email: string | null
  phone: string | null
  address: string | null
  avatar_url: string | null
  client_ref: number | null
  created_at: string | null
  
  // Pre-computed stats
  sessions_count: number
  last_session_date: string | null
  last_session_type: string | null
  days_since_last_session: number | null
  tier: ClientTier
}

export type ClientStatsDTO = {
  total_clients: number
  new_this_month: number
  returning_count: number
  dormant_count: number
}

export type ClientChartDataDTO = {
  monthly_new_clients: { label: string; value: number }[]
  tier_distribution: { New: number; Returning: number; Regular: number; VIP: number }
}

export type ClientDetailDTO = {
  client_id: string
  client_ref: number | null
  full_name: string
  email: string | null
  phone: string | null
  address: string | null
  avatar_url: string | null

  total_invoiced: number
  total_paid: number
  outstanding: number
}

export type ClientBookingDTO = {
  session_id: string
  session_date: string | null
  session_type: string | null
  booking_id: string
  booking_ref: number | null
  status: string
  package_name: string | null
}

export type ClientInvoiceDTO = {
  invoice_id: string
  total: number
  status: string
  amount_paid: number
}
