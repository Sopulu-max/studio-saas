import { createAdminClient } from '@/lib/supabase/admin'
import { getSettingsData } from './repository'
import { SettingsDataDTO } from './types'

export async function fetchStudioSettings(studioId: string): Promise<SettingsDataDTO> {
  const supabase = createAdminClient()
  return getSettingsData(supabase, studioId)
}
