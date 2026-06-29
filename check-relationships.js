import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function check() {
  const { data, error } = await supabase.from('booking_staff').select('session_id').limit(1)
  console.log('booking_staff session_id:', error ? error.message : 'exists')

  const { data: d2, error: e2 } = await supabase.from('equipment_checkouts').select('session_id').limit(1)
  console.log('equipment_checkouts session_id:', e2 ? e2.message : 'exists')
  
  const { data: d3, error: e3 } = await supabase.from('equipment').select('session_id').limit(1)
  console.log('equipment session_id:', e3 ? e3.message : 'exists')
}

check()
