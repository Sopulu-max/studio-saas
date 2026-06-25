export type BookingStatsDTO = {
  total: number
  thisMonth: number
  pipeline: number
  cancelledThisMonth: number
}

export type BookingListDTO = {
  booking_id: string
  booking_ref: number | null
  session_date: string | null
  session_type: string | null
  shoot_type: string | null
  status: string
  client_id: string | null
  client_name: string | null
  client_email: string | null
  package_name: string | null
}

export type StaffAssignmentDTO = {
  role: string | null
  staff_id: string | null
  staff_name: string | null
}

export type AddonRelationDTO = {
  quantity: number
  addon_name: string | null
  price: number
}

export type InvoiceSummaryDTO = {
  invoice_id: string
  total: number
  status: string | null
  amount_paid: number
  balance_due: number
}

export type GallerySummaryDTO = {
  gallery_id: string
  title: string | null
  status: string | null
}

export type PrintOrderSummaryDTO = {
  order_id: string
  status: string | null
  item_count: number
  total_amount: number
}

export type ContractSummaryDTO = {
  contract_id: string
  status: string | null
}

export type BookedServiceDTO = {
  booking_service_id: string
  quantity: number
  price_at_booking: number | null
  status: string | null
  service_name: string | null
  service_type: string | null
  service_category: string | null
  booking_fields: any[] | null
}

export type SessionDetailDTO = {
  session_date: string | null
  session_type: string | null
  shoot_type: string | null
  location_address: string | null
  event_name: string | null
  event_date: string | null
}

export type BookingDetailDTO = {
  booking_id: string
  booking_ref: number | null
  status: string
  notes: string | null
  drive_link: string | null
  selections_count: number | null
  extra_outfits: number | null
  extra_pictures: number | null

  client_id: string | null
  client_name: string | null
  client_email: string | null
  client_phone: string | null

  package_id: string | null
  package_name: string | null
  base_price: number | null

  custom_answers: Record<string, any> | null

  sessions: SessionDetailDTO[]
  staff: StaffAssignmentDTO[]
  addons: AddonRelationDTO[]
  services: BookedServiceDTO[]

  invoice: InvoiceSummaryDTO | null
  gallery: GallerySummaryDTO | null
  printOrder: PrintOrderSummaryDTO | null
  contract: ContractSummaryDTO | null
}
