import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getInviteAcceptanceError } from '@/lib/invite-accept'

export async function POST(request: Request) {
  const { token } = await request.json()

  if (!token) {
    return NextResponse.json({ error: 'Missing invitation token' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'You must be signed in to accept this invitation' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Verify token exists and hasn't been accepted
  const { data: staffMember } = await admin
    .from('staff')
    .select('staff_id, email, invite_accepted_at')
    .eq('invite_token', token)
    .maybeSingle()

  if (!staffMember) {
    return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 })
  }

  const acceptanceError = getInviteAcceptanceError({
    inviteAcceptedAt: staffMember.invite_accepted_at as string | null,
    invitedEmail: staffMember.email as string | null,
    signedInEmail: user.email,
  })
  if (acceptanceError) {
    return NextResponse.json({ error: acceptanceError.error }, { status: acceptanceError.status })
  }

  const { data: updatedStaff, error } = await admin
    .from('staff')
    .update({
      user_id:             user.id,
      invite_accepted_at:  new Date().toISOString(),
      invite_token:        null, // invalidate token
    })
    .eq('staff_id', staffMember.staff_id as string)
    .select('staff_id')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!updatedStaff) {
    return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 409 })
  }

  return NextResponse.json({ ok: true })
}
