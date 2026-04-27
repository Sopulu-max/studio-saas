import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
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
    return { admin, userId: user.id, studioId: studio.studio_id, role: 'owner' }
  }

  if (staffMember?.studio_id) {
    return { admin, userId: user.id, studioId: staffMember.studio_id, role: 'staff', staffId: staffMember.staff_id }
  }

  return { error: 'Studio not found' }
}
