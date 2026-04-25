'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getStudioContext, ownsStaff } from '@/lib/studio'

const staffSchema = z.object({
  full_name:    z.string().min(1, 'Name is required'),
  email:        z.string().email('Invalid email address'),
  roles:        z.array(z.string()).min(1, 'At least one role is required'),
  phone:        z.string().optional().default(''),
  hire_date:    z.string().optional().default(''),
  working_days: z.array(z.string()).optional().default([]),
})

export async function addStaff(form: {
  full_name:    string
  email:        string
  roles:        string[]
  phone:        string
  hire_date:    string
  working_days?: string[]
}) {
  const result = staffSchema.safeParse(form)
  if (!result.success) return { error: result.error.issues[0].message }

  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (form.email) {
    const { data: byEmail } = await context.admin
      .from('staff')
      .select('staff_id, full_name')
      .eq('studio_id', context.studioId)
      .eq('email', form.email.trim().toLowerCase())
      .maybeSingle()
    if (byEmail) return { error: `"${byEmail.full_name}" is already registered with this email.`, existingStaffId: byEmail.staff_id }
  }

  const { error } = await context.admin.from('staff').insert({
    full_name:    form.full_name,
    email:        form.email,
    roles:        form.roles,
    role:         form.roles[0] ?? null,
    phone:        form.phone || null,
    hire_date:    form.hire_date || null,
    working_days: form.working_days ?? [],
    studio_id:    context.studioId,
  })
  return { error: error?.message ?? null, existingStaffId: null }
}

export async function updateStaff(staffId: string, form: {
  full_name:    string
  email:        string
  roles:        string[]
  phone:        string
  hire_date:    string
  working_days?: string[]
}) {
  const result = staffSchema.safeParse(form)
  if (!result.success) return { error: result.error.issues[0].message }

  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsStaff(context.admin, context.studioId, staffId))) {
    return { error: 'Staff member not found' }
  }

  if (form.email) {
    const { data: byEmail } = await context.admin
      .from('staff')
      .select('staff_id, full_name')
      .eq('studio_id', context.studioId)
      .eq('email', form.email.trim().toLowerCase())
      .neq('staff_id', staffId)
      .maybeSingle()
    if (byEmail) return { error: `"${byEmail.full_name}" is already registered with this email.`, existingStaffId: byEmail.staff_id }
  }

  const { error } = await context.admin
    .from('staff')
    .update({
      full_name:    form.full_name,
      email:        form.email,
      roles:        form.roles,
      role:         form.roles[0] ?? null,  // keep primary role for backward compat
      phone:        form.phone || null,
      hire_date:    form.hire_date || null,
      working_days: form.working_days ?? [],
    })
    .eq('staff_id', staffId)

  if (!error) {
    revalidatePath(`/dashboard/staff/${staffId}`)
    revalidatePath('/dashboard/staff')
  }
  return { error: error?.message ?? null }
}

export async function deleteStaff(staffId: string) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsStaff(context.admin, context.studioId, staffId))) {
    return { error: 'Staff member not found' }
  }

  const { error } = await context.admin
    .from('staff')
    .delete()
    .eq('staff_id', staffId)
  return { error: error?.message ?? null }
}

export async function updateStaffAvatar(staffId: string, avatarUrl: string) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsStaff(context.admin, context.studioId, staffId))) {
    return { error: 'Staff member not found' }
  }

  const { error } = await context.admin
    .from('staff')
    .update({ avatar_url: avatarUrl })
    .eq('staff_id', staffId)
  revalidatePath(`/dashboard/staff/${staffId}`)
  revalidatePath('/dashboard/staff')
  return { error: error?.message ?? null }
}
