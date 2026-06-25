import { redirect } from 'next/navigation'
import { getStudioContext, fetchStudio } from '@/lib/studio'
import StorefrontForm from './storefront-form'

export const metadata = { title: 'Website | Weave' }

export default async function StorefrontPage() {
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const studio = await fetchStudio(context.admin, context.studioId)
  if (!studio) redirect('/onboarding')

  // Fetch staff to show in the preview
  const { data: staff } = await context.admin
    .from('staff')
    .select('*, users(full_name, avatar_url, phone)')
    .eq('studio_id', context.studioId)
    .order('created_at', { ascending: true })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const publicLink = `${siteUrl.replace(/\/$/, '')}/${studio.slug}`

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '600', margin: '0 0 8px' }}>Website</h1>
          <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '14px' }}>
            Manage your studio's public website.
          </p>
        </div>
        <a 
          href={publicLink} 
          target="_blank" 
          rel="noopener noreferrer"
          className="glass-panel hover-lift"
          style={{ 
            padding: '8px 16px', fontSize: '13px', color: 'var(--text)', 
            textDecoration: 'none', fontWeight: '500'
          }}
        >
          View Live Page ↗
        </a>
      </div>

      <StorefrontForm studio={studio} staff={staff || []} />
    </div>
  )
}
