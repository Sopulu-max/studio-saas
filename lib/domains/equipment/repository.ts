import { SupabaseClient } from '@supabase/supabase-js'
import {
  EquipmentStatsDTO,
  EquipmentRowDTO,
  EquipmentDetailDTO,
  EquipmentCheckoutDTO
} from './types'

export async function getEquipmentStats(
  supabase: SupabaseClient,
  studioId: string
): Promise<EquipmentStatsDTO> {
  const { data: allRaw } = await supabase
    .from('equipment')
    .select('status, category')
    .eq('studio_id', studioId)

  const all = (allRaw ?? []) as { status: string, category: string }[]

  const by_category: Record<string, number> = {}
  for (const e of all) {
    const cat = e.category ?? 'other'
    by_category[cat] = (by_category[cat] ?? 0) + 1
  }

  return {
    total: all.length,
    available: all.filter(e => e.status === 'available').length,
    in_use: all.filter(e => e.status === 'in_use').length,
    maintenance: all.filter(e => e.status === 'maintenance').length,
    by_category
  }
}

export async function getEquipmentList(
  supabase: SupabaseClient,
  studioId: string,
  options?: {
    page?: number
    pageSize?: number
    q?: string
    category?: string
    status?: string
  }
): Promise<{ items: EquipmentRowDTO[]; total: number; allEquipment?: { status: string; category: string }[] }> {
  let query = supabase
    .from('equipment')
    .select('equipment_id, name, category, serial_number, status, notes, assigned_to', { count: 'exact' })
    .eq('studio_id', studioId)

  if (options?.q) query = query.ilike('name', `%${options.q}%`)
  if (options?.category) query = query.eq('category', options.category)
  if (options?.status) query = query.eq('status', options.status)

  if (options?.page && options?.pageSize) {
    const from = (options.page - 1) * options.pageSize
    const to = from + options.pageSize - 1
    query = query.range(from, to)
  }

  const { data: raw, count } = await query
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  const items = (raw ?? []).map((item: any) => ({
    equipment_id: item.equipment_id,
    name: item.name ?? 'Unnamed',
    category: item.category ?? 'other',
    serial_number: item.serial_number ?? null,
    status: item.status ?? 'available',
    notes: item.notes ?? null,
    assigned_to: item.assigned_to ?? null,
  }))

  return { items, total: count ?? 0 }
}

export async function getEquipmentDetail(
  supabase: SupabaseClient,
  studioId: string,
  equipmentId: string
): Promise<EquipmentDetailDTO | null> {
  const [{ data: itemRaw }, { data: checkoutsRaw }] = await Promise.all([
    supabase
      .from('equipment')
      .select('*')
      .eq('equipment_id', equipmentId)
      .eq('studio_id', studioId)
      .single(),
    supabase
      .from('equipment_checkouts')
      .select('checkout_id, assigned_to, checked_out_at, checked_in_at, notes, booking_id, bookings(booking_ref, sessions(session_date))')
      .eq('equipment_id', equipmentId)
      .order('checked_out_at', { ascending: false })
      .limit(20)
  ])

  if (!itemRaw) return null

  const item = itemRaw as any
  const checkouts = (checkoutsRaw ?? []) as any[]

  return {
    equipment_id: item.equipment_id,
    name: item.name ?? 'Unnamed',
    category: item.category ?? 'other',
    serial_number: item.serial_number ?? null,
    status: item.status ?? 'available',
    notes: item.notes ?? null,
    purchase_date: item.purchase_date ?? null,
    purchase_price: item.purchase_price ? Number(item.purchase_price) : null,
    assigned_to: item.assigned_to ?? null,
    checked_out_at: item.checked_out_at ?? null,
    booking_id: item.booking_id ?? null,
    checkouts: checkouts.map(c => ({
      checkout_id: c.checkout_id,
      assigned_to: c.assigned_to ?? 'Unknown',
      checked_out_at: c.checked_out_at,
      checked_in_at: c.checked_in_at ?? null,
      notes: c.notes ?? null,
      booking_id: c.booking_id ?? null,
      session: c.bookings ? {
        booking_ref: c.bookings.booking_ref ?? null,
        session_date: (c.bookings.sessions as any)?.[0]?.session_date ?? null
      } : null
    }))
  }
}
