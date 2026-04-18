'use server'

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStudioContext } from '@/lib/studio'
import { sendStaffInviteEmail } from '@/lib/email'

const ROLE_LABELS: Record<string, string> = {
  photographer:   'Photographer',
  editor:         'Editor',
  colour_grader:  'Colour grader',
  second_shooter: 'Second shooter',
  assistant:      'Assistant',
  manager:        'Manager',
  other:          'Team member',
}

const inviteSchema = z.object({
  fullName: z.string().min(2, 'Please enter their name'),
  email:    z.string().email('Please enter a valid email'),
  role:     z.string().min(1, 'Please select a role'),
})

export async function inviteStaffMember(data: {
  fullName: string
  email: string
  role: string
}): Promise<{ error: string | null }> {
  const context = await getStudioContext()
  if ('error' in context) return { error: 'Not authenticated' }
  if (context.role !== 'owner') return { error: 'Only the studio owner can invite staff' }

  const parsed = inviteSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const admin = createAdminClient()

  // Fetch studio details for the email
  const { data: studio } = await admin
    .from('studios')
    .select('name')
    .eq('studio_id', context.studioId)
    .single()

  if (!studio) return { error: 'Studio not found' }

  // Check if staff with this email already exists
  const { data: existing } = await admin
    .from('staff')
    .select('staff_id, invite_accepted_at')
    .eq('studio_id', context.studioId)
    .eq('email', data.email.toLowerCase())
    .maybeSingle()

  const inviteToken = crypto.randomUUID()
  const inviteSentAt = new Date().toISOString()

  if (existing) {
    if (existing.invite_accepted_at) return { error: 'This person has already joined your team.' }
    // Re-send invite — update token
    await admin.from('staff').update({ invite_token: inviteToken, invite_sent_at: inviteSentAt })
      .eq('staff_id', existing.staff_id)
  } else {
    const { error: insertErr } = await admin.from('staff').insert({
      studio_id:      context.studioId,
      full_name:      data.fullName.trim(),
      email:          data.email.toLowerCase(),
      role:           data.role,
      invite_token:   inviteToken,
      invite_sent_at: inviteSentAt,
    })
    if (insertErr) return { error: insertErr.message }
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  const inviteUrl = `${siteUrl}/invite/${inviteToken}`
  const roleLabel = ROLE_LABELS[data.role] ?? data.role

  const { error: emailErr } = await sendStaffInviteEmail({
    to:          data.email,
    inviteeName: data.fullName.trim(),
    studioName:  studio.name,
    role:        roleLabel,
    inviteUrl,
  })

  if (emailErr) return { error: `Staff added but email failed: ${emailErr}` }

  return { error: null }
}

export async function revokeStaffInvite(staffId: string): Promise<{ error: string | null }> {
  const context = await getStudioContext()
  if ('error' in context) return { error: 'Not authenticated' }
  if (context.role !== 'owner') return { error: 'Only the studio owner can remove staff' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('staff')
    .delete()
    .eq('staff_id', staffId)
    .eq('studio_id', context.studioId)

  return { error: error?.message ?? null }
}

export async function resendStaffInvite(staffId: string): Promise<{ error: string | null }> {
  const context = await getStudioContext()
  if ('error' in context) return { error: 'Not authenticated' }
  if (context.role !== 'owner') return { error: 'Only the studio owner can resend invites' }

  const admin = createAdminClient()

  const { data: staffMember } = await admin
    .from('staff')
    .select('full_name, email, role')
    .eq('staff_id', staffId)
    .eq('studio_id', context.studioId)
    .single()

  if (!staffMember) return { error: 'Staff member not found' }

  const { data: studio } = await admin
    .from('studios')
    .select('name')
    .eq('studio_id', context.studioId)
    .single()

  const inviteToken = crypto.randomUUID()
  await admin.from('staff').update({ invite_token: inviteToken, invite_sent_at: new Date().toISOString() })
    .eq('staff_id', staffId)

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  const inviteUrl = `${siteUrl}/invite/${inviteToken}`

  return sendStaffInviteEmail({
    to:          staffMember.email,
    inviteeName: staffMember.full_name,
    studioName:  studio?.name ?? 'your studio',
    role:        ROLE_LABELS[staffMember.role] ?? staffMember.role,
    inviteUrl,
  })
}
