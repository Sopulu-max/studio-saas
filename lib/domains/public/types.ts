export type PublicStorefrontDTO = {
  studio_id: string
  name: string | null
  slug: string | null
  email: string | null
  phone: string | null
  address: string | null
  logo_url: string | null
  cover_url: string | null
  bio: string | null
  theme: any | null
  packages?: PublicPackageDTO[]
  team?: {
    staff_id: string
    name: string
    bio: string | null
    avatar_url: string | null
  }[]
  portfolio?: {
    gallery_id: string
    title: string | null
    shared_link: string | null
    cover_photo_url: string | null
  }[]
}

export type PublicServiceDTO = {
  service_id: string
  name: string
  type: string
  description?: string | null
  price?: number | null
  category_value?: string | null
  session_type?: string | null
  outfits_count?: number | null
  duration_mins?: number | null
  booking_fields?: any[]
}

export type PublicPackageServiceDTO = {
  service_id: string
  name: string
  type: string
  description?: string | null
  price?: number | null
  category_value?: string | null
  session_type?: string | null
  outfits_count?: number | null
  duration_mins?: number | null
  booking_fields?: any[]
  is_addon: boolean
  addon_price?: number | null
}

export type PublicPackageDTO = {
  package_id: string
  name: string
  tagline?: string | null
  description?: string | null
  cover_url?: string | null
  base_price?: number | null
  services: PublicPackageServiceDTO[]
}

export type PublicBookingCatalogDTO = {
  studio: {
    studio_id: string
    name: string | null
    email: string | null
    slug: string | null
    session_types: any[] | null
    service_types: any[] | null
    booking_statuses: any[] | null
    logo_url: string | null
    theme: any | null
  }
  services: PublicServiceDTO[]
  packages: PublicPackageDTO[]
}

export type PublicGalleryPhotoDTO = {
  photo_id: string
  file_url: string
  thumbnail_url: string
  is_favourite: boolean
  is_edited: boolean
  uploaded_at: string | null
}

export type PublicGalleryDTO = {
  gallery_id: string
  title: string | null
  description: string | null
  status: string | null
  shared_link: string | null
  booking: {
    booking_id: string
    session_date: string | null
    selections_count: number | null
    custom_answers: Record<string, any> | null
    status: string | null
    client_name: string | null
    client_phone: string | null
    package_name: string | null
    studio_name: string | null
    studio_phone: string | null
  } | null
  photos: PublicGalleryPhotoDTO[]
}
