export type SettingsStaffDTO = {
  staff_id: string
  full_name: string
  public_name: string | null
  email: string
  roles: string[]
  invite_sent_at: string | null
  invite_accepted_at: string | null
  user_id: string | null
  is_public: boolean
  public_bio: string | null
}

export type SettingsContractClauseDTO = {
  clause_id: string
  template_id: string
  title: string
  body: string
  display_order: number
}

export type SettingsContractTemplateDTO = {
  template_id: string
  name: string
  description: string
  session_type: string
  display_order: number
  clauses: SettingsContractClauseDTO[]
}

export type SettingsMessageTemplateDTO = {
  template_id: string
  title: string
  content: string
}

export type SettingsDataDTO = {
  teamMembers: SettingsStaffDTO[]
  contractTemplates: SettingsContractTemplateDTO[]
  messageTemplates: SettingsMessageTemplateDTO[]
}
