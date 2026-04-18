import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type StudioContext =
  | { error: string }
  | {
      admin:   ReturnType<typeof createAdminClient>
      userId:  string
      studioId: string
      role:    'owner' | 'staff'
      staffId?: string
    }

export async function getStudioContext(): Promise<StudioContext> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Check if this user is a studio owner
  const { data: studio } = await admin
    .from('studios')
    .select('studio_id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (studio?.studio_id) {
    return { admin, userId: user.id, studioId: studio.studio_id, role: 'owner' }
  }

  // Check if this user is an invited staff member
  const { data: staffMember } = await admin
    .from('staff')
    .select('staff_id, studio_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (staffMember?.studio_id) {
    return { admin, userId: user.id, studioId: staffMember.studio_id, role: 'staff', staffId: staffMember.staff_id }
  }

  return { error: 'Studio not found' }
}

async function hasStudioRecordAccess(
  admin: ReturnType<typeof createAdminClient>,
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

export async function ownsBooking(
  admin: ReturnType<typeof createAdminClient>,
  studioId: string,
  bookingId: string
) {
  return hasStudioRecordAccess(admin, studioId, 'bookings', 'booking_id', bookingId)
}

export async function ownsClient(
  admin: ReturnType<typeof createAdminClient>,
  studioId: string,
  clientId: string
) {
  return hasStudioRecordAccess(admin, studioId, 'clients', 'client_id', clientId)
}

export async function ownsPackage(
  admin: ReturnType<typeof createAdminClient>,
  studioId: string,
  packageId: string
) {
  return hasStudioRecordAccess(admin, studioId, 'packages', 'package_id', packageId)
}

export async function ownsStaff(
  admin: ReturnType<typeof createAdminClient>,
  studioId: string,
  staffId: string
) {
  return hasStudioRecordAccess(admin, studioId, 'staff', 'staff_id', staffId)
}

export async function ownsEquipment(
  admin: ReturnType<typeof createAdminClient>,
  studioId: string,
  equipmentId: string
) {
  return hasStudioRecordAccess(admin, studioId, 'equipment', 'equipment_id', equipmentId)
}

export async function ownsPrintOrder(
  admin: ReturnType<typeof createAdminClient>,
  studioId: string,
  orderId: string
) {
  return hasStudioRecordAccess(admin, studioId, 'print_orders', 'order_id', orderId)
}

export async function ownsContract(
  admin: ReturnType<typeof createAdminClient>,
  studioId: string,
  contractId: string
) {
  const { data } = await admin
    .from('contracts')
    .select('contract_id, bookings!inner(studio_id)')
    .eq('contract_id', contractId)
    .eq('bookings.studio_id', studioId)
    .maybeSingle()

  return Boolean(data)
}

export async function ownsInvoice(
  admin: ReturnType<typeof createAdminClient>,
  studioId: string,
  invoiceId: string
) {
  const { data } = await admin
    .from('invoices')
    .select('invoice_id, bookings!inner(studio_id)')
    .eq('invoice_id', invoiceId)
    .eq('bookings.studio_id', studioId)
    .maybeSingle()

  return Boolean(data)
}

export async function ownsGallery(
  admin: ReturnType<typeof createAdminClient>,
  studioId: string,
  galleryId: string
) {
  const { data } = await admin
    .from('galleries')
    .select('gallery_id, booking_id')
    .eq('gallery_id', galleryId)
    .maybeSingle()

  if (!data?.booking_id) return false
  return ownsBooking(admin, studioId, data.booking_id)
}

export async function ownsGalleryPhoto(
  admin: ReturnType<typeof createAdminClient>,
  studioId: string,
  photoId: string
) {
  const { data } = await admin
    .from('gallery_photos')
    .select('photo_id, gallery_id')
    .eq('photo_id', photoId)
    .maybeSingle()

  if (!data?.gallery_id) return false
  return ownsGallery(admin, studioId, data.gallery_id)
}
