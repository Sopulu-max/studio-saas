import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Module-level singleton — reused across warm function invocations.
// The admin client uses a static service-role key, so it is safe to share.
let _adminClient: ReturnType<typeof createClient> | null = null

export function createAdminClient() {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )
  }
  // Non-null assertion: the block above guarantees _adminClient is set.
  // TypeScript cannot narrow module-level `let` variables through conditionals,
  // so the assertion is required to keep the return type non-nullable.
  return _adminClient!
}
