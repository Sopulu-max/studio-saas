import { SupabaseClient } from '@supabase/supabase-js'
import {
  GalleryStatsDTO,
  GalleryListDTO,
  GalleryDetailDTO,
  GalleryPhotoDTO
} from './types'

export async function getGalleryStats(
  supabase: SupabaseClient,
  studioId: string
): Promise<GalleryStatsDTO> {
  const [
    { count: totalGalleries },
    { count: deliveredCount },
    { count: readyCount },
    { count: processingCount },
  ] = await Promise.all([
    supabase.from('galleries')
      .select('gallery_id, bookings!inner(studio_id)', { count: 'exact', head: true })
      .eq('bookings.studio_id', studioId),
    supabase.from('galleries')
      .select('gallery_id, bookings!inner(studio_id)', { count: 'exact', head: true })
      .eq('bookings.studio_id', studioId).eq('status', 'delivered'),
    supabase.from('galleries')
      .select('gallery_id, bookings!inner(studio_id)', { count: 'exact', head: true })
      .eq('bookings.studio_id', studioId).eq('status', 'ready'),
    supabase.from('galleries')
      .select('gallery_id, bookings!inner(studio_id)', { count: 'exact', head: true })
      .eq('bookings.studio_id', studioId).eq('status', 'processing'),
  ])

  return {
    total: totalGalleries ?? 0,
    delivered: deliveredCount ?? 0,
    ready: readyCount ?? 0,
    processing: processingCount ?? 0
  }
}

export async function getGalleryList(
  supabase: SupabaseClient,
  studioId: string,
  options?: {
    view?: string
    q?: string
    status?: string
    page?: number
    pageSize?: number
  }
): Promise<{ items: GalleryListDTO[]; total: number }> {
  let query = supabase
    .from('galleries')
    .select('gallery_id, title, status, cover_photo_url, created_at, gallery_photos(count), bookings!inner(booking_id, booking_ref, sessions(session_date, session_type), clients(full_name), studio_id)', { count: 'exact' })
    .eq('bookings.studio_id', studioId)

  if (options?.view === 'needs-delivery') {
    query = query.in('status', ['processing', 'ready'])
  } else if (options?.view === 'delivered') {
    query = query.eq('status', 'delivered')
  } else {
    // all view filters
    if (options?.q) query = query.ilike('title', `%${options.q}%`)
    if (options?.status) query = query.eq('status', options.status)
  }

  // Ordering
  if (options?.view === 'needs-delivery') {
    query = query.order('created_at', { ascending: true })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  // Pagination
  if (options?.page && options?.pageSize) {
    const from = (options.page - 1) * options.pageSize
    const to = from + options.pageSize - 1
    query = query.range(from, to)
  } else if (options?.view === 'needs-delivery') {
    query = query.limit(200)
  }

  const { data: raw, count } = await query
  const items = (raw ?? []).map((g: any) => ({
    gallery_id: g.gallery_id,
    title: g.title ?? 'Untitled',
    status: g.status ?? 'processing',
    cover_photo_url: g.cover_photo_url ?? null,
    created_at: g.created_at ?? null,
    photo_count: g.gallery_photos?.[0]?.count ?? 0,
    session: g.bookings ? {
      booking_id: g.bookings.booking_id ?? null,
      booking_ref: g.bookings.booking_ref ?? null,
      session_date: g.bookings.sessions?.[0]?.session_date ?? null,
      client_name: g.bookings.clients?.full_name ?? null
    } : null
  }))

  return { items, total: count ?? 0 }
}

export async function getGalleryDetail(
  supabase: SupabaseClient,
  studioId: string,
  galleryId: string
): Promise<GalleryDetailDTO | null> {
  const { data: galleryRaw } = await supabase
    .from('galleries')
    .select(`
      *,
      bookings!inner(
        booking_id,
        booking_ref,
        studio_id,
        status,
        custom_answers,
        selections_count,
        sessions(session_date),
        clients(client_id, full_name, phone)
      )
    `)
    .eq('gallery_id', galleryId)
    .eq('bookings.studio_id', studioId)
    .single()

  if (!galleryRaw) return null
  const gallery = galleryRaw as any

  const { data: photosRaw } = await supabase
    .from('gallery_photos')
    .select('*')
    .eq('gallery_id', galleryId)
    .order('uploaded_at', { ascending: false })

  const photos = (photosRaw ?? []) as any[]

  return {
    gallery_id: gallery.gallery_id,
    title: gallery.title ?? 'Untitled',
    status: gallery.status ?? 'processing',
    shared_link: gallery.shared_link ?? null,
    session: gallery.bookings ? {
      booking_id: gallery.bookings.booking_id ?? null,
      booking_ref: gallery.bookings.booking_ref ?? null,
      session_date: (gallery.bookings.sessions as any)?.[0]?.session_date ?? null,
      status: gallery.bookings.status ?? null,
      selections_count: gallery.bookings.selections_count ?? null,
      base_outfits: gallery.bookings.custom_answers?.legacy_outfits ? Number(gallery.bookings.custom_answers.legacy_outfits) : null,
      client: gallery.bookings.clients ? {
        client_id: gallery.bookings.clients.client_id ?? null,
        full_name: gallery.bookings.clients.full_name ?? null,
        phone: gallery.bookings.clients.phone ?? null,
      } : null
    } : null,
    photos: photos.map(p => ({
      photo_id: p.photo_id,
      file_url: p.file_url,
      thumbnail_url: p.thumbnail_url,
      is_favourite: p.is_favourite ?? false,
      is_edited: p.is_edited ?? false,
      uploaded_at: p.uploaded_at ?? null
    }))
  }
}
