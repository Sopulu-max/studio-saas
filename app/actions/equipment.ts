'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getStudioContext, ownsEquipment } from '@/lib/studio'

const equipmentSchema = z.object({
  name:           z.string().min(1, 'Name is required'),
  category:       z.string().min(1, 'Category is required'),
  serial_number:  z.string().optional().default(''),
  status:         z.enum(['available', 'in_use', 'maintenance', 'retired'], { error: 'Invalid status' }),
  notes:          z.string().optional().default(''),
  purchase_date:  z.string().optional().default(''),
  purchase_price: z.string().optional().default(''),
})

export async function addEquipment(form: {
  name: string
  category: string
  serial_number: string
  status: string
  notes?: string
  purchase_date?: string
  purchase_price?: string
}) {
  const result = equipmentSchema.safeParse(form)
  if (!result.success) return { error: result.error.issues[0].message }

  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (form.serial_number) {
    const { data: bySerial } = await context.admin
      .from('equipment')
      .select('equipment_id, name')
      .eq('studio_id', context.studioId)
      .eq('serial_number', form.serial_number.trim())
      .maybeSingle()
    if (bySerial) return { error: `"${bySerial.name as string}" is already registered with this serial number.`, existingEquipmentId: bySerial.equipment_id as string }
  }

  const { data: item, error } = await context.admin.from('equipment').insert({
    name:           form.name,
    category:       form.category,
    serial_number:  form.serial_number || null,
    status:         form.status,
    notes:          form.notes         || null,
    purchase_date:  form.purchase_date  || null,
    purchase_price: form.purchase_price ? Number(form.purchase_price) : null,
    studio_id:      context.studioId,
  }).select().single()

  if (error) return { error: error.message }
  return { error: null, equipmentId: item?.equipment_id ?? null }
}

export async function updateEquipment(equipmentId: string, form: {
  name: string
  category: string
  serial_number: string
  status: string
  notes?: string
  purchase_date?: string
  purchase_price?: string
}) {
  const result = equipmentSchema.safeParse(form)
  if (!result.success) return { error: result.error.issues[0].message }

  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsEquipment(context.admin, context.studioId, equipmentId))) {
    return { error: 'Equipment not found' }
  }

  if (form.serial_number) {
    const { data: bySerial } = await context.admin
      .from('equipment')
      .select('equipment_id, name')
      .eq('studio_id', context.studioId)
      .eq('serial_number', form.serial_number.trim())
      .neq('equipment_id', equipmentId)
      .maybeSingle()
    if (bySerial) return { error: `"${bySerial.name as string}" is already registered with this serial number.`, existingEquipmentId: bySerial.equipment_id as string }
  }

  const { error } = await context.admin
    .from('equipment')
    .update({
      name:           form.name,
      category:       form.category,
      serial_number:  form.serial_number  || null,
      status:         form.status,
      notes:          form.notes          || null,
      purchase_date:  form.purchase_date  || null,
      purchase_price: form.purchase_price ? Number(form.purchase_price) : null,
    })
    .eq('equipment_id', equipmentId)

  if (!error) {
    revalidatePath(`/dashboard/equipment/${equipmentId}`)
    revalidatePath('/dashboard/equipment')
  }
  return { error: error?.message ?? null }
}

export async function checkoutEquipment(
  equipmentId: string,
  assignedTo: string,
  bookingId?: string,
  checkoutNotes?: string,
) {
  if (!assignedTo.trim()) return { error: 'Enter who is taking this equipment' }

  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsEquipment(context.admin, context.studioId, equipmentId))) {
    return { error: 'Equipment not found' }
  }

  const now = new Date().toISOString()

  // Update equipment row
  const { error: eqErr } = await context.admin
    .from('equipment')
    .update({
      status:         'in_use',
      assigned_to:    assignedTo.trim(),
      checked_out_at: now,
      booking_id:     bookingId || null,
    })
    .eq('equipment_id', equipmentId)

  if (eqErr) return { error: eqErr.message }

  // Insert history row
  await context.admin.from('equipment_checkouts').insert({
    equipment_id:   equipmentId,
    studio_id:      context.studioId,
    assigned_to:    assignedTo.trim(),
    booking_id:     bookingId || null,
    checked_out_at: now,
    notes:          checkoutNotes?.trim() || null,
  })

  revalidatePath(`/dashboard/equipment/${equipmentId}`)
  revalidatePath('/dashboard/equipment')
  return { error: null }
}

export async function checkinEquipment(equipmentId: string) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsEquipment(context.admin, context.studioId, equipmentId))) {
    return { error: 'Equipment not found' }
  }

  const now = new Date().toISOString()

  // Clear checkout columns on equipment
  const { error: eqErr } = await context.admin
    .from('equipment')
    .update({
      status:         'available',
      assigned_to:    null,
      checked_out_at: null,
      booking_id:     null,
    })
    .eq('equipment_id', equipmentId)

  if (eqErr) return { error: eqErr.message }

  // Close the open history row (most recent without a check-in)
  await context.admin
    .from('equipment_checkouts')
    .update({ checked_in_at: now })
    .eq('equipment_id', equipmentId)
    .is('checked_in_at', null)

  revalidatePath(`/dashboard/equipment/${equipmentId}`)
  revalidatePath('/dashboard/equipment')
  return { error: null }
}

export async function updateEquipmentStatus(equipmentId: string, status: string) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsEquipment(context.admin, context.studioId, equipmentId))) {
    return { error: 'Equipment not found' }
  }

  const { error } = await context.admin
    .from('equipment')
    .update({ status })
    .eq('equipment_id', equipmentId)
  return { error: error?.message ?? null }
}

export async function deleteEquipment(equipmentId: string) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsEquipment(context.admin, context.studioId, equipmentId))) {
    return { error: 'Equipment not found' }
  }

  const { error } = await context.admin
    .from('equipment')
    .delete()
    .eq('equipment_id', equipmentId)
  return { error: error?.message ?? null }
}
