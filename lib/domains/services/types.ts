export type ServiceRowDTO = {
  service_id: string
  name: string
  type: string
  description?: string | null
  price?: number | null
  duration_mins?: number | null
  is_active: boolean
  display_order: number
}

export type ServiceStatsDTO = {
  total: number
  active: number
  service_count: number
  product_count: number
  digital_count: number
}

export type ServiceDetailDTO = {
  service_id: string
  name: string
  type: string
  description: string | null
  price: number | null
  duration_mins: number | null
  is_active: boolean
  display_order: number
  created_at: string | null
  updated_at: string | null
  studio_id: string
  service_addons: {
    addon_id: string
    name: string
    description: string | null
    price: number | null
  }[]
  service_sections: {
    section_id: string
    title: string
    content: string | null
    display_order: number
  }[]
  package_services: {
    is_addon: boolean
    addon_price: number | null
    packages: {
      package_id: string
      name: string | null
    } | null
  }[]
}
