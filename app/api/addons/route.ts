import { NextRequest, NextResponse } from 'next/server'
import { getStudioContext, ownsPackage } from '@/lib/studio'

export async function GET(request: NextRequest) {
  const packageId = request.nextUrl.searchParams.get('package_id')
  if (!packageId) return NextResponse.json([])

  const context = await getStudioContext()
  if ('error' in context) {
    return NextResponse.json({ error: context.error }, { status: 401 })
  }

  if (!(await ownsPackage(context.admin, context.studioId, packageId))) {
    return NextResponse.json({ error: 'Package not found' }, { status: 404 })
  }

  const { data } = await context.admin
    .from('package_addons')
    .select('*')
    .eq('package_id', packageId)

  return NextResponse.json(data ?? [])
}
