import { SupabaseClient } from '@supabase/supabase-js'

export type BlockType = 'hero' | 'text' | 'image' | 'spacer' | 'package_grid' | 'team_roster' | 'gallery_portfolio'

export interface BuilderBlock {
  id: string
  type: BlockType
  data: Record<string, any>
  style?: Record<string, any>
}

export interface LayoutDTO {
  layout_id: string
  studio_id: string
  type: string
  status: 'draft' | 'published'
  blocks: BuilderBlock[]
  created_at: string
  updated_at: string
}

export async function getLayout(
  supabase: SupabaseClient,
  studioId: string,
  type: string,
  status: 'draft' | 'published' = 'published'
): Promise<LayoutDTO | null> {
  const { data, error } = await supabase
    .from('layouts')
    .select('*')
    .eq('studio_id', studioId)
    .eq('type', type)
    .eq('status', status)
    .maybeSingle()

  if (error || !data) return null
  return data as LayoutDTO
}

export async function saveLayout(
  supabase: SupabaseClient,
  studioId: string,
  type: string,
  blocks: BuilderBlock[],
  status: 'draft' | 'published' = 'draft'
): Promise<LayoutDTO> {
  // Check if it already exists
  const { data: existing } = await supabase
    .from('layouts')
    .select('layout_id')
    .eq('studio_id', studioId)
    .eq('type', type)
    .eq('status', status)
    .maybeSingle()

  if (existing) {
    const { data, error } = await supabase
      .from('layouts')
      .update({ blocks, updated_at: new Date().toISOString() })
      .eq('layout_id', existing.layout_id)
      .select()
      .single()
    if (error) throw error
    return data as LayoutDTO
  } else {
    const { data, error } = await supabase
      .from('layouts')
      .insert({
        studio_id: studioId,
        type,
        status,
        blocks
      })
      .select()
      .single()
    if (error) throw error
    return data as LayoutDTO
  }
}
