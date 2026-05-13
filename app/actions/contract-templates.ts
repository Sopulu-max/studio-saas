'use server'

import { revalidatePath } from 'next/cache'
import { getStudioContext } from '@/lib/studio'

export type ContractClause = {
  clause_id?:    string
  title:         string
  body:          string
  display_order: number
}

export type ContractTemplate = {
  template_id:   string
  name:          string
  description:   string
  session_type:  string   // '' = applies to any session type
  display_order: number
  clauses:       ContractClause[]
}

export async function getContractTemplatesWithClauses(): Promise<ContractTemplate[]> {
  const context = await getStudioContext()
  if ('error' in context) return []

  const { data: templates } = await context.admin
    .from('contract_templates')
    .select('template_id, name, description, session_type, display_order')
    .eq('studio_id', context.studioId)
    .order('display_order', { ascending: true })

  if (!templates?.length) return []

  const templateIds = templates.map(t => t.template_id as string)
  const { data: clauses } = await context.admin
    .from('contract_clauses')
    .select('clause_id, template_id, title, body, display_order')
    .in('template_id', templateIds)
    .order('display_order', { ascending: true })

  return templates.map(t => ({
    template_id:   t.template_id as string,
    name:          t.name as string,
    description:   (t.description ?? '') as string,
    session_type:  (t.session_type ?? '') as string,
    display_order: (t.display_order ?? 0) as number,
    clauses: (clauses ?? [])
      .filter(c => (c.template_id as string) === (t.template_id as string))
      .map(c => ({
        clause_id:     c.clause_id as string,
        title:         c.title as string,
        body:          c.body as string,
        display_order: c.display_order as number,
      })),
  }))
}

export async function saveContractTemplate(form: {
  template_id?: string
  name:         string
  description:  string
  session_type: string
  clauses:      { title: string; body: string }[]
}): Promise<{ error: string | null; templateId?: string }> {
  if (!form.name.trim()) return { error: 'Template name is required' }
  if (!form.clauses.length) return { error: 'Add at least one clause' }
  for (const c of form.clauses) {
    if (!c.title.trim()) return { error: 'Every clause needs a title' }
  }

  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  let templateId = form.template_id

  if (templateId) {
    const { data: existing } = await context.admin
      .from('contract_templates')
      .select('template_id')
      .eq('template_id', templateId)
      .eq('studio_id', context.studioId)
      .maybeSingle()
    if (!existing) return { error: 'Template not found' }

    const { error } = await context.admin
      .from('contract_templates')
      .update({
        name:         form.name.trim(),
        description:  form.description.trim(),
        session_type: form.session_type.trim() || null,
      })
      .eq('template_id', templateId)
    if (error) return { error: error.message }
  } else {
    const { data: last } = await context.admin
      .from('contract_templates')
      .select('display_order')
      .eq('studio_id', context.studioId)
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data: created, error } = await context.admin
      .from('contract_templates')
      .insert({
        studio_id:     context.studioId,
        name:          form.name.trim(),
        description:   form.description.trim(),
        session_type:  form.session_type.trim() || null,
        display_order: ((last?.display_order as number | null) ?? 0) + 1,
      })
      .select('template_id')
      .single()
    if (error || !created) return { error: error?.message ?? 'Failed to create template' }
    templateId = created.template_id as string
  }

  // Replace clauses — delete all + re-insert
  await context.admin.from('contract_clauses').delete().eq('template_id', templateId)

  const { error: clauseError } = await context.admin
    .from('contract_clauses')
    .insert(form.clauses.map((c, i) => ({
      template_id:   templateId,
      title:         c.title.trim(),
      body:          c.body,
      display_order: i,
    })))
  if (clauseError) return { error: clauseError.message }

  revalidatePath('/dashboard/settings')
  return { error: null, templateId }
}

export async function deleteContractTemplate(templateId: string) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  const { data: existing } = await context.admin
    .from('contract_templates')
    .select('template_id')
    .eq('template_id', templateId)
    .eq('studio_id', context.studioId)
    .maybeSingle()
  if (!existing) return { error: 'Template not found' }

  const { error } = await context.admin
    .from('contract_templates')
    .delete()
    .eq('template_id', templateId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/settings')
  return { error: null }
}
