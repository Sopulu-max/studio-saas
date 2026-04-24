type QueryChain<T> = {
  select(query: string): QueryChain<T>
  eq(column: string, value: string): QueryChain<T>
  maybeSingle(): Promise<{ data: T | null }>
}

type AdminLike = {
  from(table: string): QueryChain<unknown>
}

async function hasStudioRecordAccess(
  admin: AdminLike,
  studioId: string,
  table: string,
  idColumn: string,
  idValue: string
) {
  const { data } = await admin
    .from(table)
    .select(idColumn)
    .eq(idColumn, idValue)
    .eq('studio_id', studioId)
    .maybeSingle()

  return Boolean(data)
}

export async function ownsBooking(admin: AdminLike, studioId: string, bookingId: string) {
  return hasStudioRecordAccess(admin, studioId, 'bookings', 'booking_id', bookingId)
}

export async function ownsClient(admin: AdminLike, studioId: string, clientId: string) {
  return hasStudioRecordAccess(admin, studioId, 'clients', 'client_id', clientId)
}

export async function ownsPackage(admin: AdminLike, studioId: string, packageId: string) {
  return hasStudioRecordAccess(admin, studioId, 'packages', 'package_id', packageId)
}

export async function ownsStaff(admin: AdminLike, studioId: string, staffId: string) {
  return hasStudioRecordAccess(admin, studioId, 'staff', 'staff_id', staffId)
}

export async function ownsEquipment(admin: AdminLike, studioId: string, equipmentId: string) {
  return hasStudioRecordAccess(admin, studioId, 'equipment', 'equipment_id', equipmentId)
}

export async function ownsPrintOrder(admin: AdminLike, studioId: string, orderId: string) {
  return hasStudioRecordAccess(admin, studioId, 'print_orders', 'order_id', orderId)
}

export async function ownsContract(admin: AdminLike, studioId: string, contractId: string) {
  const { data } = await admin
    .from('contracts')
    .select('contract_id, bookings!inner(studio_id)')
    .eq('contract_id', contractId)
    .eq('bookings.studio_id', studioId)
    .maybeSingle()

  return Boolean(data)
}

export async function ownsInvoice(admin: AdminLike, studioId: string, invoiceId: string) {
  const { data } = await admin
    .from('invoices')
    .select('invoice_id, bookings!inner(studio_id)')
    .eq('invoice_id', invoiceId)
    .eq('bookings.studio_id', studioId)
    .maybeSingle()

  return Boolean(data)
}

export async function ownsGallery(admin: AdminLike, studioId: string, galleryId: string) {
  const { data } = await admin
    .from('galleries')
    .select('gallery_id, booking_id')
    .eq('gallery_id', galleryId)
    .maybeSingle()

  const row = data as { booking_id?: string } | null
  if (!row?.booking_id) return false
  return ownsBooking(admin, studioId, row.booking_id)
}

export async function ownsGalleryPhoto(admin: AdminLike, studioId: string, photoId: string) {
  const { data } = await admin
    .from('gallery_photos')
    .select('photo_id, gallery_id')
    .eq('photo_id', photoId)
    .maybeSingle()

  const row = data as { gallery_id?: string } | null
  if (!row?.gallery_id) return false
  return ownsGallery(admin, studioId, row.gallery_id)
}
