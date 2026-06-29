import { notFound } from 'next/navigation'
import { fetchStorefront } from '@/lib/domains/public/services'
import StorefrontView from '@/components/storefront-view'
import { createClient } from '@/lib/supabase/server'
import { getLayout } from '@/lib/domains/builder/repository'
import { UniversalBuilder } from '@/components/builder'

export const revalidate = 60 // Revalidate every 60 seconds

export async function generateMetadata({ params }: { params: Promise<{ studioSlug: string }> }) {
  const { studioSlug } = await params
  const studio = await fetchStorefront(studioSlug)
  if (!studio) return { title: 'Studio not found' }
  return {
    title: studio.name || 'Studio Storefront',
    description: studio.bio || `Welcome to ${studio.name}`,
  }
}

export default async function PublicStorefrontPage({ params }: { params: Promise<{ studioSlug: string }> }) {
  const { studioSlug } = await params
  const storefront = await fetchStorefront(studioSlug)

  if (!storefront) notFound()

  // Try to load custom builder layout
  const supabase = await createClient()
  const layout = await getLayout(supabase, storefront.studio_id, 'storefront', 'published')

  if (layout && layout.blocks.length > 0) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
        <UniversalBuilder initialBlocks={layout.blocks} isEditMode={false} storefrontData={storefront} />
      </div>
    )
  }

  // Fallback to legacy view
  return (
    <StorefrontView storefront={storefront} />
  )
}
