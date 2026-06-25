import { SupabaseClient } from '@supabase/supabase-js'
import {
  PackageStatsDTO,
  PackageRowDTO,
  PackageAddonDTO,
  PackageDetailDTO
} from './types'

export async function getPackageStats(
  supabase: SupabaseClient,
  studioId: string
): Promise<{ stats: PackageStatsDTO; studioSlug: string | null; studioName: string }> {
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const [
    { data: allPackagesRaw },
    { count: usedThisMonth },
    { data: studioSlugRow }
  ] = await Promise.all([
    supabase.from('packages')
      .select('package_id, base_price, package_addons(addon_id)')
      .eq('studio_id', studioId),
    supabase.from('bookings')
      .select('package_id, sessions!inner(session_date)', { count: 'exact', head: true })
      .eq('studio_id', studioId)
      .not('package_id', 'is', null)
      .gte('sessions.session_date', monthStart),
    supabase.from('studios')
      .select('slug, name')
      .eq('studio_id', studioId)
      .maybeSingle()
  ])

  const allPackages = (allPackagesRaw ?? []) as any[]
  const totalPackages = allPackages.length
  const totalAddons = allPackages.reduce((s, p) => s + (p.package_addons?.length ?? 0), 0)
  const avgPrice = totalPackages > 0
    ? Math.round(allPackages.reduce((s, p) => s + Number(p.base_price ?? 0), 0) / totalPackages)
    : 0

  const stats: PackageStatsDTO = {
    total_packages: totalPackages,
    avg_price: avgPrice,
    total_addons: totalAddons,
    used_this_month: usedThisMonth ?? 0
  }

  const studioSlug = studioSlugRow?.slug ?? null
  const studioName = studioSlugRow?.name ?? 'Studio'

  return { stats, studioSlug, studioName }
}

export async function getPackageList(
  supabase: SupabaseClient,
  studioId: string,
  page: number,
  q: string,
  shootType: string,
  pageSize: number
): Promise<{ packages: PackageRowDTO[]; total: number; distinctTypes: string[] }> {
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data: typeRows } = await supabase
    .from('packages')
    .select('shoot_type')
    .eq('studio_id', studioId)
    .not('shoot_type', 'is', null)

  const distinctTypes = [...new Set((typeRows ?? []).map((r: any) => r.shoot_type).filter(Boolean))].sort()

  let q2 = supabase
    .from('packages')
    .select('package_id, name, description, tagline, cover_url, is_public, shoot_type, base_price, created_at, package_addons(*)', { count: 'exact' })
    .eq('studio_id', studioId)

  if (q) q2 = q2.ilike('name', `%${q}%`)
  if (shootType) q2 = q2.eq('shoot_type', shootType)

  const { data, count } = await q2
    .order('created_at', { ascending: false })
    .range(from, to)

  const packages = (data ?? []).map((p: any) => ({
    ...p,
    base_price: Number(p.base_price ?? 0),
    package_addons: (p.package_addons ?? []).map((a: any) => ({ ...a, price: Number(a.price ?? 0) }))
  }))

  return { packages, total: count ?? 0, distinctTypes }
}

export async function getPackagesByUsage(
  supabase: SupabaseClient,
  studioId: string
): Promise<PackageRowDTO[]> {
  const { data: bookingRefs } = await supabase
    .from('bookings')
    .select('package_id')
    .eq('studio_id', studioId)
    .not('package_id', 'is', null)

  const usageMap: Record<string, number> = {}
  for (const b of (bookingRefs ?? [])) {
    if (b.package_id) usageMap[b.package_id] = (usageMap[b.package_id] ?? 0) + 1
  }

  const { data: pkgsRaw } = await supabase
    .from('packages')
    .select('package_id, name, shoot_type, base_price, package_addons(addon_id)')
    .eq('studio_id', studioId)
    .order('name', { ascending: true })

  const pkgs = (pkgsRaw ?? []).map((p: any) => ({
    ...p,
    base_price: Number(p.base_price ?? 0),
    usage_count: usageMap[p.package_id] ?? 0
  }))

  pkgs.sort((a, b) => b.usage_count - a.usage_count)

  return pkgs
}

export async function getPackageAddonsList(
  supabase: SupabaseClient,
  studioId: string
): Promise<PackageAddonDTO[]> {
  const { data: pkgsRaw } = await supabase
    .from('packages')
    .select('package_id, name, shoot_type, package_addons(*)')
    .eq('studio_id', studioId)
    .order('name', { ascending: true })

  const pkgs = (pkgsRaw ?? []) as any[]
  const addons: PackageAddonDTO[] = pkgs.flatMap(pkg =>
    (pkg.package_addons ?? []).map((a: any) => ({
      addon_id: a.addon_id,
      name: a.name,
      description: a.description,
      price: Number(a.price ?? 0),
      pkg_name: pkg.name,
      pkg_id: pkg.package_id,
      shoot_type: pkg.shoot_type
    }))
  )

  return addons
}

export async function getPackageDetail(
  supabase: SupabaseClient,
  studioId: string,
  packageId: string
): Promise<PackageDetailDTO | null> {
  const [
    { data: pkgRaw },
    { data: bookingsRaw },
    { data: pkgSvcRaw }
  ] = await Promise.all([
    supabase
      .from('packages')
      .select('*, package_addons(*), package_sections(*), package_inclusions(*)')
      .eq('package_id', packageId)
      .eq('studio_id', studioId)
      .single(),
    supabase
      .from('bookings')
      .select('booking_id, booking_ref, status, clients(client_id, full_name), sessions(session_date)')
      .eq('package_id', packageId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('package_services')
      .select('is_addon, addon_price, display_order, services(service_id, name, type, price, description)')
      .eq('package_id', packageId)
      .order('display_order', { ascending: true })
  ])

  if (!pkgRaw) return null

  const pkg = pkgRaw as any
  const bookings = (bookingsRaw ?? []) as any[]
  const pkgServices = (pkgSvcRaw ?? []) as any[]

  return {
    package_id: pkg.package_id,
    name: pkg.name,
    description: pkg.description ?? null,
    tagline: pkg.tagline ?? null,
    cover_url: pkg.cover_url ?? null,
    is_public: pkg.is_public ?? false,
    shoot_type: pkg.shoot_type ?? null,
    base_price: Number(pkg.base_price ?? 0),
    coverage_hours: pkg.coverage_hours ?? null,
    inclusions: pkg.inclusions ?? null,
    created_at: pkg.created_at ?? null,
    updated_at: pkg.updated_at ?? null,
    studio_id: pkg.studio_id,
    package_addons: (pkg.package_addons ?? []).map((a: any) => ({
      ...a,
      price: Number(a.price ?? 0)
    })).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    package_sections: (pkg.package_sections ?? []).map((s: any) => ({
      section_id: s.section_id,
      title: s.title,
      body: s.body ?? null,
      image_url: s.image_url ?? null,
      video_url: s.video_url ?? null,
      display_order: s.display_order ?? 0
    })).sort((a: any, b: any) => a.display_order - b.display_order),
    package_inclusions: (pkg.package_inclusions ?? []).map((i: any) => ({
      inclusion_id: i.inclusion_id,
      label: i.label,
      type: i.type,
      display_order: i.display_order ?? 0
    })).sort((a: any, b: any) => a.display_order - b.display_order),
    package_services: pkgServices.map(ps => ({
      is_addon: ps.is_addon ?? false,
      addon_price: ps.addon_price ? Number(ps.addon_price) : null,
      display_order: ps.display_order ?? 0,
      services: ps.services ? {
        service_id: ps.services.service_id,
        name: ps.services.name,
        type: ps.services.type,
        price: ps.services.price ? Number(ps.services.price) : null,
        description: ps.services.description ?? null
      } : null
    })).sort((a: any, b: any) => a.display_order - b.display_order),
    bookings: bookings.map(b => ({
      booking_id: b.booking_id,
      booking_ref: b.booking_ref,
      status: b.status,
      clients: b.clients ? { client_id: b.clients.client_id, full_name: b.clients.full_name } : null,
      sessions: b.sessions ?? []
    }))
  }
}
