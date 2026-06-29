const fs = require('fs');
const file = 'app/(dashboard)/dashboard/bookings/[id]/session-actions.tsx';
let lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
let idx = lines.findIndex(l => l.includes('placeholder={Client selected'));
if (idx !== -1) {
  lines[idx] = '              placeholder={`Client selected... (Base: ${baseImages})`}';
  fs.writeFileSync(file, lines.join('\n'), 'utf8');
}
