import { SupabaseClient } from '@supabase/supabase-js'
import { SettingsDataDTO, SettingsContractTemplateDTO } from './types'

export async function getSettingsData(supabase: SupabaseClient, studioId: string): Promise<SettingsDataDTO> {
  const [{ data: teamMembers }, { data: rawTemplates }, { data: rawClauses }, { data: rawMessageTemplates }] = await Promise.all([
    supabase
      .from('staff')
      .select('staff_id, full_name, public_name, email, roles, invite_sent_at, invite_accepted_at, user_id, is_public, public_bio')
      .eq('studio_id', studioId)
      .order('created_at', { ascending: true }),
    supabase
      .from('contract_templates')
      .select('template_id, name, description, session_type, display_order')
      .eq('studio_id', studioId)
      .order('display_order', { ascending: true }),
    supabase
      .from('contract_clauses')
      .select('clause_id, template_id, title, body, display_order')
      .order('display_order', { ascending: true }),
    supabase
      .from('message_templates')
      .select('template_id, title, content')
      .eq('studio_id', studioId)
      .order('created_at', { ascending: true }),
  ])

  const templates = (rawTemplates ?? []) as any[]
  const allClauses = (rawClauses ?? []) as any[]

  const contractTemplates: SettingsContractTemplateDTO[] = templates.map((t) => ({
    template_id: t.template_id,
    name: t.name,
    description: t.description ?? '',
    session_type: t.session_type ?? '',
    display_order: t.display_order,
    clauses: allClauses
      .filter((c) => c.template_id === t.template_id)
      .map((c) => ({
        clause_id: c.clause_id,
        template_id: c.template_id,
        title: c.title,
        body: c.body,
        display_order: c.display_order,
      })),
  }))

  return {
    teamMembers: (teamMembers ?? []).map(m => ({
      ...m,
      public_name: m.public_name ?? null,
      public_bio: m.public_bio ?? null,
      is_public: m.is_public ?? false,
    })) as any[],
    contractTemplates,
    messageTemplates: (rawMessageTemplates ?? []) as any[],
  }
}
