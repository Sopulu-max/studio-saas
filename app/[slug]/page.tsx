import { notFound } from 'next/navigation'
import { fetchStorefront } from '@/lib/domains/public/services'
import StorefrontView from '@/components/storefront-view'

export const revalidate = 60 // Revalidate every 60 seconds or we can rely on path revalidation

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const studio = await fetchStorefront(slug)
  if (!studio) return { title: 'Studio not found' }
  return {
    title: studio.name || 'Studio Storefront',
    description: studio.bio || `Welcome to ${studio.name}`,
  }
}

export default async function PublicStorefrontPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const studio = await fetchStorefront(slug)

  if (!studio) notFound()

  // Fetch staff but don't show it per user request (showTeam={false})
  // We can fetch it just in case, but passing an empty array is also fine if we don't show it.
  
  return (
    <StorefrontView 
      studio={studio as any} 
      staff={[]} 
      showTeam={false}
      isPublic={true}
    />
  )
}
