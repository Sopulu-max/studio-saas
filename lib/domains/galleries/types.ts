export type GalleryStatsDTO = {
  total: number
  delivered: number
  ready: number
  processing: number
}

export type GalleryListDTO = {
  gallery_id: string
  title: string
  status: string
  cover_photo_url: string | null
  created_at: string | null
  photo_count: number
  session: {
    booking_id: string | null
    booking_ref: number | null
    session_date: string | null
    client_name: string | null
  } | null
}

export type GalleryPhotoDTO = {
  photo_id: string
  file_url: string
  thumbnail_url: string
  is_favourite: boolean
  is_edited: boolean
  uploaded_at: string | null
}

export type GalleryDetailDTO = {
  gallery_id: string
  title: string
  status: string
  shared_link: string | null
  session: {
    booking_id: string | null
    booking_ref: number | null
    session_date: string | null
    status: string | null
    selections_count: number | null
    base_outfits: number | null
    client: {
      client_id: string | null
      full_name: string | null
      phone: string | null
    } | null
  } | null
  photos: GalleryPhotoDTO[]
}
