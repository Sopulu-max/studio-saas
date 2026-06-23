import { redirect } from 'next/navigation'

export default async function PackagesRedirectPage({
  params,
}: {
  params: Promise<{ studioSlug: string }>
}) {
  const { studioSlug } = await params
  redirect(`/book/${studioSlug}`)
}
