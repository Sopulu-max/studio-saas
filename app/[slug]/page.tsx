import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import StorefrontView from '@/components/storefront-view'

export const revalidate = 60 // Revalidate every 60 seconds or we can rely on path revalidation

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const admin = createAdminClient()
  const { data: studio } = await admin.from('studios').select('name, bio').eq('slug', params.slug).maybeSingle()
  if (!studio) return { title: 'Studio not found' }
  return {
    title: studio.name || 'Studio Storefront',
    description: studio.bio || `Welcome to ${studio.name}`,
  }
}

export default async function PublicStorefrontPage({ params }: { params: { slug: string } }) {
  const admin = createAdminClient()
  const { data: studio } = await admin
    .from('studios')
    .select('*')
    .eq('slug', params.slug)
    .maybeSingle()

  if (!studio) notFound()

  // Fetch staff but don't show it per user request (showTeam={false})
  // We can fetch it just in case, but passing an empty array is also fine if we don't show it.
  
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 16px' }}>
      <StorefrontView 
        studio={studio as any} 
        staff={[]} 
        showTeam={false} 
      />
    </div>
  )
}
