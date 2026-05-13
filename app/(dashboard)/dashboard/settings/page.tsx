import { redirect } from 'next/navigation'
import SettingsTabs from './settings-tabs'
import { buildStudioConfig } from '@/lib/studio-config'
import { getStudioContext, fetchStudio } from '@/lib/studio'

export default async function SettingsPage() {
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const studio = await fetchStudio(context.admin, context.studioId)
  if (!studio) redirect('/dashboard')

  const config = buildStudioConfig(studio.session_types, studio.booking_statuses, studio.service_types, studio.equipment_categories, studio.staff_roles)

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  // Fetch contract templates + clauses in parallel with team members
  const [{ data: teamMembers }, { data: rawTemplates }, { data: rawClauses }] = await Promise.all([
    context.admin
      .from('staff')
      .select('staff_id, full_name, email, role, invite_sent_at, invite_accepted_at, user_id')
      .eq('studio_id', context.studioId)
      .order('created_at', { ascending: true }),
    context.admin
      .from('contract_templates')
      .select('template_id, name, description, session_type, display_order')
      .eq('studio_id', context.studioId)
      .order('display_order', { ascending: true }),
    context.admin
      .from('contract_clauses')
      .select('clause_id, template_id, title, body, display_order')
      .order('display_order', { ascending: true }),
  ])

  type TemplateRow = { template_id: string; name: string; description: string | null; session_type: string | null; display_order: number }
  type ClauseRow   = { clause_id: string; template_id: string; title: string; body: string; display_order: number }

  const templates = (rawTemplates ?? []) as unknown as TemplateRow[]
  const allClauses = (rawClauses ?? []) as unknown as ClauseRow[]

  const contractTemplates = templates.map(t => ({
    template_id:   t.template_id,
    name:          t.name,
    description:   t.description ?? '',
    session_type:  t.session_type ?? '',
    display_order: t.display_order,
    clauses: allClauses
      .filter(c => c.template_id === t.template_id)
      .map(c => ({ clause_id: c.clause_id, title: c.title, body: c.body, display_order: c.display_order })),
  }))

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
        equipmentCategories={config.equipmentCategories}
        staffRoles={config.staffRoles}
        contractTemplates={contractTemplates}
        teamMembers={(teamMembers ?? []) as unknown as { staff_id: string; full_name: string; email: string; role: string; invite_sent_at: string | null; invite_accepted_at: string | null; user_id: string | null }[]}
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
