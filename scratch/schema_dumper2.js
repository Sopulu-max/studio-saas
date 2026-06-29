const https = require('https');

const supabaseUrl = 'xqafrxsuabyllggxqhpt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxYWZyeHN1YWJ5bGxnZ3hxaHB0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk2ODI4MywiZXhwIjoyMDkxNTQ0MjgzfQ.JQfstBO_A8FKwivLj6YBHqxLeQlOPX6EbuItYTblTAI';

const options = {
  hostname: supabaseUrl,
  port: 443,
  path: '/rest/v1/',
  method: 'GET',
  headers: {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const spec = JSON.parse(data);
      const tables = ['packages', 'package_addons', 'services', 'package_services'];
      
      const result = {};
      for (const table of tables) {
        if (spec.definitions && spec.definitions[table]) {
          result[table] = Object.keys(spec.definitions[table].properties);
        } else {
          result[table] = 'Not found in spec';
        }
      }
      
      console.log(JSON.stringify(result, null, 2));
    } catch(e) {
      console.error('Failed to parse JSON', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error(e);
});
req.end();
