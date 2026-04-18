import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import AcceptInviteForm from './accept-form'

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: staffMember } = await admin
    .from('staff')
    .select('staff_id, full_name, email, role, invite_accepted_at, studios(name)')
    .eq('invite_token', token)
    .maybeSingle()

  if (!staffMember) notFound()

  if (staffMember.invite_accepted_at) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '2rem' }}>
        <div style={{ maxWidth: '400px', textAlign: 'center' }}>
          <p style={{ fontSize: '32px', marginBottom: '16px' }}>✓</p>
          <h1 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Already accepted</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', marginBottom: '20px' }}>This invitation has already been used. Sign in to access your dashboard.</p>
          <a href="/login" style={{ display: 'inline-block', padding: '10px 24px', background: 'var(--btn)', color: 'var(--btn-fg)', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}>
            Sign in
          </a>
        </div>
      </div>
    )
  }

  const studioName = Array.isArray(staffMember.studios)
    ? staffMember.studios[0]?.name ?? 'your studio'
    : (staffMember.studios as any)?.name ?? 'your studio'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '2rem 1rem' }}>
      <AcceptInviteForm
        token={token}
        staffId={staffMember.staff_id}
        fullName={staffMember.full_name}
        email={staffMember.email}
        studioName={studioName}
        role={staffMember.role}
      />
    </div>
  )
}
