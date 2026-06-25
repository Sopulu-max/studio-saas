export type ContractListDTO = {
  contract_id: string
  created_at: string | null
  signed_by: string | null
  status: string
  client_name: string | null
  booking_ref: number | null
  booking_id: string | null
  session_date: string | null
  session_type: string | null
}

export type NoContractBookingDTO = {
  booking_id: string
  booking_ref: number | null
  status: string
  client_name: string | null
  session_date: string | null
  session_type: string | null
}

export type ContractStatsDTO = {
  total: number
  signed: number
  awaiting: number
  voided: number
  signRate: number
}

export type ContractDetailDTO = {
  contract_id: string
  status: string
  content: string | null
  signed_at: string | null
  signed_by: string | null
  client_id: string | null
  client_name: string | null
  client_email: string | null
  booking_id: string | null
  booking_ref: number | null
  session_date: string | null
  location_address: string | null
}

export type BookingOptionDTO = {
  booking_id: string
  booking_ref: number | null
  status: string
  client_name: string | null
  client_phone: string | null
  session_date: string | null
  session_type: string | null
  package_id: string | null
  package_name: string | null
  contract_template_id: string | null
}
