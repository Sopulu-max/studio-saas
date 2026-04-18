import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import SettingsTabs from './settings-tabs'
import { buildStudioConfig } from '@/lib/studio-config'

export default async function SettingsPage() {
  const supabase = await createClient()
  const admin    = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: studio } = await admin
    .from('studios')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!studio) redirect('/dashboard')

  const config = buildStudioConfig(studio.session_types, studio.booking_statuses, studio.service_types)

  type ContractTemplates = { studio: string; outdoor: string; event: string }
  const rawTemplates = (studio.contract_templates ?? {}) as Partial<ContractTemplates>
  const contractTemplates: ContractTemplates = {
    studio:  rawTemplates.studio  ?? '',
    outdoor: rawTemplates.outdoor ?? '',
    event:   rawTemplates.event   ?? '',
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const { data: teamMembers } = await admin
    .from('staff')
    .select('staff_id, full_name, email, role, invite_sent_at, invite_accepted_at, user_id')
    .eq('studio_id', studio.studio_id)
    .order('created_at', { ascending: true })

  return (
    <div style={{ maxWidth: '680px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>Settings</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>Manage your studio</p>
      </div>

      <SettingsTabs
        sessionTypes={config.sessionTypes}
        serviceTypes={config.serviceTypes}
        bookingStatuses={config.bookingStatuses}
        contractTemplates={contractTemplates}
        teamMembers={teamMembers ?? []}
        studioId={studio.studio_id}
        name={studio.name ?? ''}
        email={studio.email ?? ''}
        slug={studio.slug ?? ''}
        phone={studio.phone ?? ''}
        address={studio.address ?? ''}
        timezone={studio.timezone ?? ''}
        logoUrl={studio.logo_url ?? null}
        siteUrl={siteUrl}
      />
    </div>
  )
}
