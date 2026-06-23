import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// ─── Shared studio row type ──────────────────────────────────────────────────
// The studios table has JSONB columns (session_types, booking_statuses,
// service_types, contract_templates) that are not present in the generated
// Supabase type definitions. Any query that selects those columns returns
// `never` from the typed client. fetchStudio handles the cast once so every
// page gets a properly typed row without repeating the workaround.

export type StudioRow = {
  studio_id:                string
  name:                     string | null
  slug:                     string | null
  email:                    string | null
  phone:                    string | null
  address:                  string | null
  timezone:                 string | null
  logo_url:                 string | null
  bio:                      string | null
  onboarding_completed_at:  string | null
  session_types:            unknown
  booking_statuses:         unknown
  service_types:            unknown
  contract_templates:       unknown
  equipment_categories:     unknown
  staff_roles:              unknown
  theme:                    unknown
}

export async function fetchStudio(
  admin: ReturnType<typeof createAdminClient>,
  studioId: string,
): Promise<StudioRow | null> {
  const { data } = await admin.from('studios').select('*').eq('studio_id', studioId).single()
  return (data ?? null) as unknown as StudioRow | null
}

export {
  ownsBooking,
  ownsClient,
  ownsPackage,
  ownsStaff,
  ownsEquipment,
  ownsPrintOrder,
  ownsContract,
  ownsInvoice,
  ownsGallery,
  ownsGalleryPhoto,
  ownsService,
} from '@/lib/studio-ownership'

type StudioContext =
  | { error: string }
  | {
      admin:   ReturnType<typeof createAdminClient>
      userId:  string
      studioId: string
      role:    'owner' | 'staff'
      staffId?: string
    }

export async function getStudioContext(): Promise<StudioContext> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Fire both lookups in parallel — saves a round-trip for staff users
  const [{ data: studio }, { data: staffMember }] = await Promise.all([
    admin.from('studios').select('studio_id').eq('owner_id', user.id).maybeSingle(),
    admin.from('staff').select('staff_id, studio_id').eq('user_id', user.id).maybeSingle(),
  ])

  if (studio?.studio_id) {
    return { admin, userId: user.id, studioId: studio.studio_id as string, role: 'owner' }
  }

  if (staffMember?.studio_id) {
    return { admin, userId: user.id, studioId: staffMember.studio_id as string, role: 'staff', staffId: staffMember.staff_id as string | undefined }
  }

  return { error: 'Studio not found' }
}
