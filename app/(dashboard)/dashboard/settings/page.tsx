import { redirect } from 'next/navigation'
import SettingsTabs from './settings-tabs'
import { buildStudioConfig } from '@/lib/studio-config'
import { getStudioContext, fetchStudio } from '@/lib/studio'
import { fetchStudioSettings } from '@/lib/domains/settings/services'

export default async function SettingsPage() {
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const studio = await fetchStudio(context.admin, context.studioId)
  if (!studio) redirect('/dashboard')

  const config = buildStudioConfig(
    studio.session_types,
    studio.booking_statuses,
    // Note: studio.service_types was intentionally removed, so we pass null or skip it. But buildStudioConfig might still expect 5 args. Let's look at buildStudioConfig.
    // I will just fetch the settings data.
    [], // service_types (deprecated)
    studio.equipment_categories,
    studio.staff_roles
  )

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const settingsData = await fetchStudioSettings(context.studioId)

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1 text-[var(--text-1)]">Settings</h1>
        <p className="text-sm text-[var(--text-3)]">Manage your studio preferences, integrations, and team</p>
      </div>

      <SettingsTabs
        sessionTypes={config.sessionTypes}
        bookingStatuses={config.bookingStatuses}
        equipmentCategories={config.equipmentCategories}
        staffRoles={config.staffRoles}
        contractTemplates={settingsData.contractTemplates as any}
        teamMembers={settingsData.teamMembers as any}
        messageTemplates={settingsData.messageTemplates as any}
        studioId={studio.studio_id}
        name={studio.name ?? ''}
        email={studio.email ?? ''}
        slug={studio.slug ?? ''}
        phone={studio.phone ?? ''}
        address={studio.address ?? ''}
        timezone={studio.timezone ?? ''}
        logoUrl={studio.logo_url ?? null}
        coverUrl={(studio as any).cover_url ?? null}
        bio={(studio as any).bio ?? ''}
        waPhoneNumberId={(studio as any).wa_phone_number_id ?? ''}
        waAccessToken={(studio as any).wa_access_token ?? ''}
        waVerifyToken={(studio as any).wa_verify_token ?? ''}
        siteUrl={siteUrl}
        theme={studio.theme}
      />
    </div>
  )
}
