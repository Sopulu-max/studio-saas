import { SupabaseClient } from '@supabase/supabase-js'

export type ServiceDTO = {
  service_id: string
  name: string
  type: 'service' | 'product' | 'digital'
  description: string | null
  price: number | null
  duration_mins: number | null
  is_active: boolean
  display_order: number
}

export type CatalogMetricsDTO = {
  total_services: number
  total_products: number
  total_active: number
}

/**
 * Fetches the raw Studio Catalog elements (Services, Products, Add-ons)
 */
export async function fetchStudioCatalog(supabase: SupabaseClient, studioId: string): Promise<ServiceDTO[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('studio_id', studioId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data.map(s => ({
    service_id: s.service_id,
    name: s.name,
    type: s.type,
    description: s.description,
    price: s.price ? Number(s.price) : null,
    duration_mins: s.duration_mins,
    is_active: s.is_active,
    display_order: s.display_order
  }))
}
