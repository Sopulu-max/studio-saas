import { redirect } from 'next/navigation'
import Sidebar from '@/components/sidebar'
import { StudioConfigProvider } from '@/components/studio-config-provider'
import { getStudioContext, fetchStudio } from '@/lib/studio'
import { buildStudioConfig } from '@/lib/studio-config'
import { cookies } from 'next/headers'


export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const context = await getStudioContext()
  if ('error' in context) {
    const reason = context.error === 'Not authenticated' ? 'not-authenticated' : 'studio-not-found'
    redirect(`/login?reason=${reason}`)
  }

  const [studio, { data: messageTemplates }] = await Promise.all([
    fetchStudio(context.admin, context.studioId),
    context.admin
      .from('message_templates')
      .select('template_id, title, content')
      .eq('studio_id', context.studioId)
      .order('created_at', { ascending: true })
  ])

  // Redirect only when the column explicitly = null (migration ran, studio is genuinely new).
  // If the column is undefined (migration not run yet), let existing studios through.
  if (studio?.onboarding_completed_at === null) redirect('/onboarding')

  const config = buildStudioConfig(studio?.session_types, studio?.booking_statuses, studio?.service_types)

  const isOwner = !('role' in context) || context.role === 'owner'

  const cookieStore = await cookies()
  const navOrderCookie = cookieStore.get('sidebar-nav-order')?.value
  let initialNavOrder: string[] | null = null
  if (navOrderCookie) {
    try { initialNavOrder = JSON.parse(decodeURIComponent(navOrderCookie)) } catch {}
  }

  return (
    <StudioConfigProvider config={config}>
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
        <Sidebar studioName={studio?.name ?? 'My Studio'} studioSlug={studio?.slug ?? ''} isOwner={isOwner} messageTemplates={(messageTemplates ?? []) as { template_id: string; title: string; content: string }[]} initialNavOrder={initialNavOrder} />
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
