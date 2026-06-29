const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://xqafrxsuabyllggxqhpt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxYWZyeHN1YWJ5bGxnZ3hxaHB0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk2ODI4MywiZXhwIjoyMDkxNTQ0MjgzfQ.JQfstBO_A8FKwivLj6YBHqxLeQlOPX6EbuItYTblTAI'
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  try {
    // Get columns for key tables via RPC or direct query? We can't query information_schema directly from client if not exposed.
    // Instead we'll query a single row from each table and look at the keys.
    const tables = ['packages', 'package_addons', 'services', 'package_services']
    
    const schemas = {}
    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*').limit(1)
      if (error) {
        console.error(`Error fetching ${table}:`, error)
      } else {
        schemas[table] = data && data.length > 0 ? Object.keys(data[0]) : 'Table is empty, no keys inferred.'
      }
    }
    
    console.log(JSON.stringify(schemas, null, 2))
  } catch(e) {
    console.error(e)
  }
}
run()
