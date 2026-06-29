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
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', position: 'relative', overflow: 'hidden', padding: '16px', gap: '16px' }}>
        
        {/* Ambient Glows */}
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, rgba(9,9,11,0) 70%)', filter: 'blur(100px)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '70vw', height: '70vw', background: 'radial-gradient(circle, rgba(167,139,250,0.08) 0%, rgba(9,9,11,0) 60%)', filter: 'blur(120px)', pointerEvents: 'none', zIndex: 0 }} />

        {/* Floating Sidebar Island */}
        <div style={{ zIndex: 10, display: 'flex', flexShrink: 0, height: 'calc(100vh - 32px)' }}>
          <Sidebar studioName={studio?.name ?? 'My Studio'} studioSlug={studio?.slug ?? ''} isOwner={isOwner} messageTemplates={(messageTemplates ?? []) as { template_id: string; title: string; content: string }[]} />
        </div>

        {/* Floating Main Content Island */}
        <main className="glass-panel" style={{
          flex: 1,
          height: 'calc(100vh - 32px)',
          overflowY: 'auto',
          maxWidth: '100%',
          zIndex: 10,
          position: 'relative',
          borderRadius: '24px', /* Large Dribbble-style radius */
          border: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(255,255,255,0.015)',
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.4)',
        }}>
          {children}
        </main>
        
        <style>{`
          @media (max-width: 768px) {
            .dashboard-main {
              height: 100vh !important;
              border-radius: 0 !important;
              border: none !important;
            }
          }
        `}</style>
      </div>
    </StudioConfigProvider>
  )
}
