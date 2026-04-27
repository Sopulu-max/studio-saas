import { redirect } from 'next/navigation'
import Sidebar from '@/components/sidebar'
import { StudioConfigProvider } from '@/components/studio-config-provider'
import { getStudioContext, fetchStudio } from '@/lib/studio'
import { buildStudioConfig } from '@/lib/studio-config'


export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const context = await getStudioContext()
  if ('error' in context) {
    const reason = context.error === 'Not authenticated' ? 'not-authenticated' : 'studio-not-found'
    redirect(`/login?reason=${reason}`)
  }

  const studio = await fetchStudio(context.admin, context.studioId)

  // Redirect only when the column explicitly = null (migration ran, studio is genuinely new).
  // If the column is undefined (migration not run yet), let existing studios through.
  if (studio?.onboarding_completed_at === null) redirect('/onboarding')

  const config = buildStudioConfig(studio?.session_types, studio?.booking_statuses, studio?.service_types)

  const isOwner = !('role' in context) || context.role === 'owner'

  return (
    <StudioConfigProvider config={config}>
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
        <Sidebar studioName={studio?.name ?? 'My Studio'} isOwner={isOwner} />
        <main style={{
          flex: 1,
          padding: '2rem 2.5rem',
          overflowY: 'auto',
          maxWidth: '100%',
        }} className="dashboard-main">
          {children}
        </main>
        <style>{`
          @media (max-width: 768px) {
            .dashboard-main {
              padding: 4.5rem 1.25rem 2rem !important;
            }
          }
        `}</style>
      </div>
    </StudioConfigProvider>
  )
}
