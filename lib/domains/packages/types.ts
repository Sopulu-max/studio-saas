export type PackageAddonDTO = {
  addon_id: string
  name: string
  description?: string | null
  price?: number | null
  pkg_name?: string
  pkg_id?: string
  shoot_type?: string | null
}

export type PackageRowDTO = {
  package_id: string
  name: string
  description?: string | null
  tagline?: string | null
  cover_url?: string | null
  is_public?: boolean | null
  shoot_type?: string | null
  base_price?: number | null
  created_at?: string | null
  package_addons?: PackageAddonDTO[] | null
  usage_count?: number
}

export type PackageStatsDTO = {
  total_packages: number
  avg_price: number
  total_addons: number
  used_this_month: number
}

export type PackageDetailDTO = {
  package_id: string
  name: string
  description: string | null
  tagline: string | null
  cover_url: string | null
  is_public: boolean
  shoot_type: string | null
  base_price: number
  coverage_hours: number | null
  inclusions: string[] | null
  created_at: string | null
  updated_at: string | null
  studio_id: string
  package_addons: PackageAddonDTO[]
  package_sections: {
    section_id: string
    title: string
    body: string | null
    image_url: string | null
    video_url: string | null
    display_order: number
  }[]
  package_inclusions: {
    inclusion_id: string
    label: string
    type: 'service' | 'product' | 'digital'
    display_order: number
  }[]
  package_services: {
    is_addon: boolean
    addon_price: number | null
    display_order: number
    services: {
      service_id: string
      name: string
      type: string
      price: number | null
      description: string | null
    } | null
  }[]
  bookings: {
    booking_id: string
    booking_ref: number | null
    status: string
    clients: {
      client_id: string
      full_name: string
    } | null
    sessions: {
      session_date: string | null
    }[]
  }[]
}
