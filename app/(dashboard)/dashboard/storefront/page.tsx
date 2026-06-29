import { getStudioContext, fetchStudio } from '@/lib/studio'
import { getLayout } from '@/lib/domains/builder/repository'
import { fetchStorefront } from '@/lib/domains/public/services'
import { redirect } from 'next/navigation'
import { StorefrontBuilder } from './storefront-builder'

export const metadata = { title: 'Website Builder | Weave' }

export default async function StorefrontPage() {
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const studio = await fetchStudio(context.admin, context.studioId)
  if (!studio) redirect('/onboarding')

  // Fetch full storefront payload for ecosystem blocks to render live previews
  const storefrontData = await fetchStorefront(studio.slug as string)

  // Fetch draft if it exists, otherwise fall back to published
  let layout = await getLayout(context.admin, context.studioId, 'storefront', 'draft')
  if (!layout) {
    layout = await getLayout(context.admin, context.studioId, 'storefront', 'published')
  }

  const initialBlocks = layout?.blocks || []

  return <StorefrontBuilder initialDraft={initialBlocks} storefrontData={storefrontData} />
}
