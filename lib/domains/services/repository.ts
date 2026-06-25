import { SupabaseClient } from '@supabase/supabase-js'
import {
  ServiceStatsDTO,
  ServiceRowDTO,
  ServiceDetailDTO
} from './types'

export async function getServiceStats(
  supabase: SupabaseClient,
  studioId: string
): Promise<ServiceStatsDTO> {
  const { data: allRaw } = await supabase
    .from('services')
    .select('type, is_active')
    .eq('studio_id', studioId)

  const all = (allRaw ?? []) as { type: string; is_active: boolean }[]

  return {
    total: all.length,
    active: all.filter(s => s.is_active).length,
    service_count: all.filter(s => s.type === 'service').length,
    product_count: all.filter(s => s.type === 'product').length,
    digital_count: all.filter(s => s.type === 'digital').length
  }
}

export async function getServiceList(
  supabase: SupabaseClient,
  studioId: string,
  page: number,
  q: string,
  type: string,
  active: string,
  pageSize: number
): Promise<{ services: ServiceRowDTO[]; total: number }> {
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('services')
    .select('service_id, name, type, description, price, duration_mins, is_active, display_order', { count: 'exact' })
    .eq('studio_id', studioId)

  if (q) query = query.ilike('name', `%${q}%`)
  if (type) query = query.eq('type', type)
  if (active === 'active') query = query.eq('is_active', true)
  if (active === 'inactive') query = query.eq('is_active', false)

  const { data, count } = await query
    .order('display_order', { ascending: true })
    .order('name', { ascending: true })
    .range(from, to)

  const services = (data ?? []).map((s: any) => ({
    ...s,
    price: s.price ? Number(s.price) : null
  }))

  return { services, total: count ?? 0 }
}

export async function getServiceDetail(
  supabase: SupabaseClient,
  studioId: string,
  serviceId: string
): Promise<ServiceDetailDTO | null> {
  const [{ data: serviceRaw }, { data: pkgServicesRaw }] = await Promise.all([
    supabase
      .from('services')
      .select('*, service_addons(*), service_sections(*)')
      .eq('service_id', serviceId)
      .eq('studio_id', studioId)
      .single(),
    supabase
      .from('package_services')
      .select('is_addon, addon_price, packages(package_id, name)')
      .eq('service_id', serviceId)
      .order('is_addon', { ascending: true })
  ])

  if (!serviceRaw) return null

  const s = serviceRaw as any

  return {
    service_id: s.service_id,
    name: s.name,
    type: s.type,
    description: s.description ?? null,
    price: s.price ? Number(s.price) : null,
    duration_mins: s.duration_mins ?? null,
    is_active: s.is_active ?? true,
    display_order: s.display_order ?? 0,
    created_at: s.created_at ?? null,
    updated_at: s.updated_at ?? null,
    studio_id: s.studio_id,
    service_addons: (s.service_addons ?? []).map((a: any) => ({
      ...a,
      price: a.price ? Number(a.price) : null
    })).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    service_sections: (s.service_sections ?? []).sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0)),
    package_services: (pkgServicesRaw ?? []).map((ps: any) => ({
      is_addon: ps.is_addon ?? false,
      addon_price: ps.addon_price ? Number(ps.addon_price) : null,
      packages: ps.packages ? {
        package_id: ps.packages.package_id,
        name: ps.packages.name ?? null
      } : null
    }))
  }
}
