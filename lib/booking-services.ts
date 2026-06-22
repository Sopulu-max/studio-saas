import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

type AdminLike = ReturnType<typeof createAdminClient>

type PackageServiceRow = {
  service_id: string
  is_addon: boolean | null
  addon_price: number | string | null
  services?: {
    service_id?: string | null
    price?: number | string | null
    studio_id?: string | null
    is_active?: boolean | null
  } | null
}

type CatalogServiceRow = {
  service_id: string
  price?: number | string | null
}

type BookingServiceInsert = {
  booking_id: string
  service_id: string
  quantity: number
  price_at_booking: number | null
}

function moneyOrNull(value: number | string | null | undefined) {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export async function seedBookingServicesFromPromise({
  admin,
  studioId,
  bookingId,
  packageId,
  selectedServiceIds = [],
}: {
  admin: AdminLike
  studioId: string
  bookingId: string
  packageId?: string | null
  selectedServiceIds?: string[]
}): Promise<{ error: string | null; inserted: number }> {
  const selected = new Set(selectedServiceIds.filter(Boolean))
  const rowsByService = new Map<string, BookingServiceInsert>()

  if (packageId) {
    const { data: pkg } = await admin
      .from('packages')
      .select('package_id')
      .eq('package_id', packageId)
      .eq('studio_id', studioId)
      .maybeSingle()

    if (!pkg) return { error: 'Package not found', inserted: 0 }

    const { data: packageServices, error } = await admin
      .from('package_services')
      .select('service_id, is_addon, addon_price, services(service_id, price, studio_id, is_active)')
      .eq('package_id', packageId)
      .order('display_order', { ascending: true })

    if (error) return { error: error.message, inserted: 0 }

    for (const row of ((packageServices ?? []) as unknown as PackageServiceRow[])) {
      const serviceId = row.services?.service_id ?? row.service_id
      if (!serviceId) continue
      if (row.services?.studio_id && row.services.studio_id !== studioId) continue
      if (row.services?.is_active === false) continue

      const isAddon = row.is_addon === true
      if (isAddon && !selected.has(serviceId)) continue

      rowsByService.set(serviceId, {
        booking_id: bookingId,
        service_id: serviceId,
        quantity: 1,
        price_at_booking: isAddon
          ? moneyOrNull(row.addon_price) ?? moneyOrNull(row.services?.price)
          : moneyOrNull(row.services?.price),
      })
    }
  }

  const alreadyIncluded = new Set(rowsByService.keys())
  const standaloneServiceIds = [...selected].filter(serviceId => !alreadyIncluded.has(serviceId))

  if (standaloneServiceIds.length > 0) {
    const { data: catalogServices, error } = await admin
      .from('services')
      .select('service_id, price')
      .in('service_id', standaloneServiceIds)
      .eq('studio_id', studioId)
      .eq('is_active', true)

    if (error) return { error: error.message, inserted: 0 }

    for (const service of ((catalogServices ?? []) as unknown as CatalogServiceRow[])) {
      rowsByService.set(service.service_id, {
        booking_id: bookingId,
        service_id: service.service_id,
        quantity: 1,
        price_at_booking: moneyOrNull(service.price),
      })
    }
  }

  const insertRows = [...rowsByService.values()]
  if (insertRows.length === 0) return { error: null, inserted: 0 }

  const { error } = await admin.from('booking_services').insert(insertRows)
  if (error) return { error: error.message, inserted: 0 }

  return { error: null, inserted: insertRows.length }
}
