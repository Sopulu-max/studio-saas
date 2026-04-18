import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const { token, userId } = await request.json()

  if (!token || !userId) {
    return NextResponse.json({ error: 'Missing token or userId' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verify token exists and hasn't been accepted
  const { data: staffMember } = await admin
    .from('staff')
    .select('staff_id, invite_accepted_at')
    .eq('invite_token', token)
    .maybeSingle()

  if (!staffMember) {
    return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 })
  }

  if (staffMember.invite_accepted_at) {
    return NextResponse.json({ error: 'This invitation has already been accepted' }, { status: 409 })
  }

  const { error } = await admin
    .from('staff')
    .update({
      user_id:             userId,
      invite_accepted_at:  new Date().toISOString(),
      invite_token:        null, // invalidate token
    })
    .eq('staff_id', staffMember.staff_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
