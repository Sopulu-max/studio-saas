const fs = require('fs');
const content = fs.readFileSync('app/actions/sessions.ts', 'utf8');
if (content.includes('addAdditionalSession')) {
  console.log('YES addAdditionalSession exists');
} else {
  console.log('NO addAdditionalSession');
}
