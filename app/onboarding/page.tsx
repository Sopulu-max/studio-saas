import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildStudioConfig } from '@/lib/studio-config'
import OnboardingWizard from './wizard'

export default async function OnboardingPage() {
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const admin = createAdminClient()
  const { data: studio } = await admin
    .from('studios')
    .select('*')
    .eq('studio_id', context.studioId)
    .single()

  if (!studio) redirect('/login')

  // Already onboarded — send to dashboard
  if (studio.onboarding_completed_at) redirect('/dashboard')

  const config = buildStudioConfig(studio.session_types, null, null)
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: '2rem 1rem',
    }}>
      <OnboardingWizard
        initialName={studio.name ?? ''}
        initialSlug={studio.slug ?? ''}
        initialTimezone={studio.timezone ?? ''}
        initialPhone={studio.phone ?? ''}
        initialSessionTypes={config.sessionTypes}
        siteUrl={siteUrl}
      />
    </div>
  )
}
