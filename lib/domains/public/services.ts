import { createAdminClient } from '@/lib/supabase/admin'
import {
  getStorefrontBySlug,
  getBookingCatalogBySlug,
  getPublicGalleryBySlug
} from './repository'
import {
  PublicStorefrontDTO,
  PublicBookingCatalogDTO,
  PublicGalleryDTO
} from './types'

export async function fetchStorefront(slug: string): Promise<PublicStorefrontDTO | null> {
  const supabase = createAdminClient()
  return getStorefrontBySlug(supabase, slug)
}

export async function fetchBookingCatalog(slug: string): Promise<PublicBookingCatalogDTO | null> {
  const supabase = createAdminClient()
  return getBookingCatalogBySlug(supabase, slug)
}

export async function fetchPublicGallery(slug: string): Promise<PublicGalleryDTO | null> {
  const supabase = createAdminClient()
  return getPublicGalleryBySlug(supabase, slug)
}
