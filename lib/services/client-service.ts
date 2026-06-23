import { SupabaseClient } from '@supabase/supabase-js'

export async function findOrCreateClient(
  admin: SupabaseClient<any, "public", any>,
  params: {
    studio_id: string
    full_name: string
    phone: string
    email?: string | null
    address?: string | null
  }
): Promise<{ clientId: string | null; error: string | null }> {
  try {
    // 1. Try to find existing client by phone
    if (params.phone) {
      const { data: existing } = await admin
        .from('clients')
        .select('client_id')
        .eq('studio_id', params.studio_id)
        .eq('phone', params.phone.trim())
        .maybeSingle()

      if (existing) {
        return { clientId: existing.client_id as string, error: null }
      }
    }

    // 2. Fallback: try to find by email if provided
    if (params.email) {
      const { data: byEmail } = await admin
        .from('clients')
        .select('client_id')
        .eq('studio_id', params.studio_id)
        .eq('email', params.email.trim().toLowerCase())
        .maybeSingle()

      if (byEmail) {
        return { clientId: byEmail.client_id as string, error: null }
      }
    }

    // 3. Create new client
    const { data: newClient, error: clientError } = await admin
      .from('clients')
      .insert({
        studio_id: params.studio_id,
        full_name: params.full_name.trim(),
        phone: params.phone.trim() || null,
        email: params.email?.trim().toLowerCase() || null,
        address: params.address?.trim() || null,
      })
      .select('client_id')
      .single()

    if (clientError || !newClient) {
      return { clientId: null, error: clientError?.message ?? 'Failed to create client' }
    }

    return { clientId: newClient.client_id as string, error: null }
  } catch (error: any) {
    return { clientId: null, error: error.message || 'An unexpected error occurred' }
  }
}

export async function createClient(
  admin: SupabaseClient<any, "public", any>,
  params: {
    studio_id: string
    full_name: string
    phone?: string | null
    email?: string | null
    address?: string | null
  }
): Promise<{ newClientId: string | null; existingClientId: string | null; existingClientName: string | null; error: string | null }> {
  // Duplicate check — email (hard block), then phone (hard block)
  if (params.email) {
    const { data: byEmail } = await admin
      .from('clients')
      .select('client_id, full_name')
      .eq('studio_id', params.studio_id)
      .eq('email', params.email.trim().toLowerCase())
      .maybeSingle()
    if (byEmail) {
      return {
        error: `A client named "${byEmail.full_name as string}" is already registered with this email.`,
        existingClientId: byEmail.client_id as string,
        existingClientName: byEmail.full_name as string,
        newClientId: null,
      }
    }
  }

  if (params.phone) {
    const { data: byPhone } = await admin
      .from('clients')
      .select('client_id, full_name')
      .eq('studio_id', params.studio_id)
      .eq('phone', params.phone.trim())
      .maybeSingle()
    if (byPhone) {
      return {
        error: `A client named "${byPhone.full_name as string}" is already registered with this phone number.`,
        existingClientId: byPhone.client_id as string,
        existingClientName: byPhone.full_name as string,
        newClientId: null,
      }
    }
  }

  const { data: inserted, error } = await admin.from('clients').insert({
    full_name: params.full_name,
    email:     params.email || null,
    phone:     params.phone || null,
    address:   params.address || null,
    studio_id: params.studio_id,
  }).select('client_id').single()

  return { 
    error: error?.message ?? null, 
    existingClientId: null, 
    existingClientName: null, 
    newClientId: (inserted?.client_id as string | undefined) ?? null 
  }
}

export async function editClient(
  admin: SupabaseClient<any, "public", any>,
  clientId: string,
  params: {
    studio_id: string
    full_name: string
    phone?: string | null
    email?: string | null
    address?: string | null
  }
): Promise<{ error: string | null; existingClientId: string | null }> {
  if (params.email) {
    const { data: byEmail } = await admin
      .from('clients')
      .select('client_id, full_name')
      .eq('studio_id', params.studio_id)
      .eq('email', params.email.trim().toLowerCase())
      .neq('client_id', clientId)
      .maybeSingle()
    if (byEmail) return { error: `"${byEmail.full_name as string}" is already registered with this email.`, existingClientId: byEmail.client_id as string }
  }

  if (params.phone) {
    const { data: byPhone } = await admin
      .from('clients')
      .select('client_id, full_name')
      .eq('studio_id', params.studio_id)
      .eq('phone', params.phone.trim())
      .neq('client_id', clientId)
      .maybeSingle()
    if (byPhone) return { error: `"${byPhone.full_name as string}" is already registered with this phone number.`, existingClientId: byPhone.client_id as string }
  }

  const { error } = await admin
    .from('clients')
    .update({ 
      full_name: params.full_name, 
      email: params.email || null, 
      phone: params.phone || null, 
      address: params.address || null 
    })
    .eq('client_id', clientId)

  return { error: error?.message ?? null, existingClientId: null }
}
