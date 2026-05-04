import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// TypeScript 5.9 changed how `IsAny<T>` resolves inside Supabase's
// template-literal query parser. When `Database = any` (the default),
// `IsAny<Schema>` no longer reliably returns `true`, so the parser falls
// through to a code path that yields `never` for every query result.
//
// Fix: supply an explicit PermissiveDB type that satisfies Supabase's
// GenericSchema constraints but types every row/insert/update as
// Record<string, unknown>. This keeps the schema-aware inference path active
// (IsAny is false) while making all property lookups return `unknown` rather
// than `never`.
type PermissiveRecord = Record<string, unknown>

// GenericTable (postgrest-js) requires Relationships: GenericRelationship[].
// unknown[] does not satisfy that constraint, causing every table lookup to
// resolve to `never` and cascading `never` into all insert/update/select
// argument and result types.  Using never[] fixes this: `never` is assignable
// to any type (including GenericRelationship), so never[] satisfies the array
// constraint while still expressing "no typed relationships".
type PermissiveDB = {
  public: {
    Tables: Record<string, {
      Row:           PermissiveRecord
      Insert:        PermissiveRecord
      Update:        PermissiveRecord
      Relationships: never[]
    }>
    Views: Record<string, {
      Row:           PermissiveRecord
      Insert:        PermissiveRecord
      Update:        PermissiveRecord
      Relationships: never[]
    }>
    Functions: Record<string, {
      Args:    PermissiveRecord
      Returns: unknown
    }>
  }
}

// Module-level singleton — reused across warm function invocations.
// The admin client uses a static service-role key, so it is safe to share.
let _adminClient: SupabaseClient<PermissiveDB> | null = null

export function createAdminClient(): SupabaseClient<PermissiveDB> {
  if (!_adminClient) {
    _adminClient = createClient<PermissiveDB>(
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
