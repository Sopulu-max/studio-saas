'use server'

import { revalidatePath } from 'next/cache'
import { getStudioContext } from '@/lib/studio'

export type ContractTemplates = {
  studio:  string
  outdoor: string
  event:   string
}

export async function getContractTemplates(): Promise<ContractTemplates> {
  const context = await getStudioContext()
  if ('error' in context) return { studio: '', outdoor: '', event: '' }

  const { data } = await context.admin
    .from('studios')
    .select('contract_templates')
    .eq('studio_id', context.studioId)
    .single()

  const t = (data?.contract_templates ?? {}) as Partial<ContractTemplates>
  return {
    studio:  t.studio  ?? '',
    outdoor: t.outdoor ?? '',
    event:   t.event   ?? '',
  }
}

export async function saveContractTemplates(templates: ContractTemplates) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  const { error } = await context.admin
    .from('studios')
    .update({ contract_templates: templates })
    .eq('studio_id', context.studioId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/settings')
  return { error: null }
}
