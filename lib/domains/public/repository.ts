import { SupabaseClient } from '@supabase/supabase-js'
import {
  PublicStorefrontDTO,
  PublicBookingCatalogDTO,
  PublicGalleryDTO,
  PublicPackageDTO,
  PublicServiceDTO,
  PublicGalleryPhotoDTO
} from './types'

export async function getStorefrontBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<PublicStorefrontDTO | null> {
  const { data: studioRaw } = await supabase
    .from('studios')
    .select('studio_id, name, slug, email, phone, address, logo_url, bio, theme')
    .eq('slug', slug)
    .maybeSingle()

  if (!studioRaw) return null
  const studio = studioRaw as any

  return {
    studio_id: studio.studio_id,
    name: studio.name ?? null,
    slug: studio.slug ?? null,
    email: studio.email ?? null,
    phone: studio.phone ?? null,
    address: studio.address ?? null,
    logo_url: studio.logo_url ?? null,
    bio: studio.bio ?? null,
    theme: studio.theme ?? null,
  }
}

export async function getBookingCatalogBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<PublicBookingCatalogDTO | null> {
  const { data: studioRaw } = await supabase
    .from('studios')
    .select('studio_id, name, email, slug, session_types, service_types, booking_statuses, logo_url, theme')
    .eq('slug', slug)
    .maybeSingle()

  if (!studioRaw) return null
  const studio = studioRaw as any

  const [{ data: servicesRaw }, { data: packagesRaw }] = await Promise.all([
    supabase
      .from('services')
      .select('service_id, name, type, description, price, category_value, session_type, outfits_count, duration_mins, booking_fields')
      .eq('studio_id', studio.studio_id)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true }),
    supabase
      .from('packages')
      .select('package_id, name, tagline, base_price, package_services(service_id, is_addon, addon_price, display_order, services(service_id, name, type, description, price, category_value, session_type, outfits_count, duration_mins, booking_fields))')
      .eq('studio_id', studio.studio_id)
      .eq('is_public', true)
      .order('display_order', { ascending: true })
  ])

  const catalogServices = (servicesRaw ?? []) as PublicServiceDTO[]
  const rawPackages = (packagesRaw ?? []) as any[]

  const publicPackages: PublicPackageDTO[] = rawPackages.map(rawPkg => {
    const linkedServices = rawPkg.package_services
      ? rawPkg.package_services
          .filter((ps: any) => ps.services != null)
          .sort((a: any, b: any) => a.display_order - b.display_order)
          .map((ps: any) => ({
            service_id: ps.services.service_id,
            name: ps.services.name,
            type: ps.services.type,
            description: ps.services.description ?? null,
            price: ps.services.price ?? null,
            category_value: ps.services.category_value ?? null,
            session_type: ps.services.session_type ?? null,
            outfits_count: ps.services.outfits_count ?? null,
            duration_mins: ps.services.duration_mins ?? null,
            booking_fields: ps.services.booking_fields ?? [],
            is_addon: ps.is_addon,
            addon_price: ps.addon_price ?? null
          }))
      : []

    return {
      package_id: rawPkg.package_id,
      name: rawPkg.name,
      tagline: rawPkg.tagline ?? null,
      base_price: rawPkg.base_price ?? null,
      services: linkedServices
    }
  })

  return {
    studio: {
      studio_id: studio.studio_id,
      name: studio.name ?? null,
      email: studio.email ?? null,
      slug: studio.slug ?? null,
      session_types: studio.session_types ?? null,
      service_types: studio.service_types ?? null,
      booking_statuses: studio.booking_statuses ?? null,
      logo_url: studio.logo_url ?? null,
      theme: studio.theme ?? null,
    },
    services: catalogServices,
    packages: publicPackages
  }
}

export async function getPublicGalleryBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<PublicGalleryDTO | null> {
  const { data: galleryRaw } = await supabase
    .from('galleries')
    .select(`
      gallery_id, title, description, status, shared_link,
      bookings (
        booking_id, session_date, custom_answers, selections_count, status,
        clients ( full_name, phone ),
        packages ( name ),
        studios ( name, phone )
      )
    `)
    .eq('shared_link', slug)
    .maybeSingle()

  if (!galleryRaw) return null
  const gallery = galleryRaw as any

  if (gallery.status === 'expired') return null

  const { data: photosRaw } = await supabase
    .from('gallery_photos')
    .select('photo_id, file_url, thumbnail_url, is_favourite, is_edited, uploaded_at')
    .eq('gallery_id', gallery.gallery_id)
    .order('is_favourite', { ascending: false })
    .order('uploaded_at', { ascending: true })

  const photos = (photosRaw ?? []).map((p: any) => ({
    photo_id: p.photo_id,
    file_url: p.file_url,
    thumbnail_url: p.thumbnail_url,
    is_favourite: p.is_favourite ?? false,
    is_edited: p.is_edited ?? false,
    uploaded_at: p.uploaded_at ?? null
  })) as PublicGalleryPhotoDTO[]

  const booking = gallery.bookings

  return {
    gallery_id: gallery.gallery_id,
    title: gallery.title ?? null,
    description: gallery.description ?? null,
    status: gallery.status ?? null,
    shared_link: gallery.shared_link ?? null,
    booking: booking ? {
      booking_id: booking.booking_id,
      session_date: booking.session_date ?? null,
      selections_count: booking.selections_count ?? null,
      custom_answers: booking.custom_answers ?? null,
      status: booking.status ?? null,
      client_name: (Array.isArray(booking.clients) ? booking.clients[0]?.full_name : booking.clients?.full_name) ?? null,
      client_phone: (Array.isArray(booking.clients) ? booking.clients[0]?.phone : booking.clients?.phone) ?? null,
      package_name: (Array.isArray(booking.packages) ? booking.packages[0]?.name : booking.packages?.name) ?? null,
      studio_name: (Array.isArray(booking.studios) ? booking.studios[0]?.name : booking.studios?.name) ?? null,
      studio_phone: (Array.isArray(booking.studios) ? booking.studios[0]?.phone : booking.studios?.phone) ?? null,
    } : null,
    photos
  }
}
