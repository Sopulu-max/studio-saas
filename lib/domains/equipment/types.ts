export type EquipmentStatsDTO = {
  total: number
  available: number
  in_use: number
  maintenance: number
  by_category: Record<string, number>
}

export type EquipmentRowDTO = {
  equipment_id: string
  name: string
  category: string
  serial_number: string | null
  status: string
  notes: string | null
  assigned_to: string | null
}

export type EquipmentCheckoutDTO = {
  checkout_id: string
  assigned_to: string
  checked_out_at: string
  checked_in_at: string | null
  notes: string | null
  booking_id: string | null
  session: {
    booking_ref: number | null
    session_date: string | null
  } | null
}

export type EquipmentDetailDTO = {
  equipment_id: string
  name: string
  category: string
  serial_number: string | null
  status: string
  notes: string | null
  purchase_date: string | null
  purchase_price: number | null
  assigned_to: string | null
  checked_out_at: string | null
  booking_id: string | null
  checkouts: EquipmentCheckoutDTO[]
}
