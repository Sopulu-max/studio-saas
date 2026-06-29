const fs = require('fs');
const file = 'app/(dashboard)/dashboard/dashboard-widgets.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace standard widget container inline styles with the premium glass-panel class
content = content.replace(
  /style=\{\{\s*background:\s*'var\(--surface\)',\s*border:\s*'1px solid var\(--line\)',\s*borderRadius:\s*'12px'/g,
  'className="glass-panel" style={{ borderRadius: \'16px\''
);

// Specifically target the KPIs container mapping to use glass-panel on the KPI cards
content = content.replace(
  /style=\{\{\s*background:\s*'var\(--surface\)',\s*border:\s*'1px solid var\(--line\)',\s*borderRadius:\s*'10px',\s*padding:\s*'1\.25rem',\s*display:\s*'flex',\s*flexDirection:\s*'column',\s*gap:\s*'8px'/g,
  'className="glass-panel hover-lift" style={{ borderRadius: \'16px\', padding: \'1.5rem\', display: \'flex\', flexDirection: \'column\', gap: \'10px\', border: \'1px solid rgba(255,255,255,0.06)\''
);

// Target header block for widgets (where the label is) to give it a better padding
content = content.replace(
  /style=\{\{\s*padding:\s*'0\.875rem 1\.25rem 0\.25rem'/g,
  'style={{ padding: \'1.25rem 1.5rem 0.5rem\''
);

// Same for the "No items" sections
content = content.replace(
  /style=\{\{\s*padding:\s*'0\.5rem 1\.25rem 1rem'/g,
  'style={{ padding: \'0.75rem 1.5rem 1.5rem\''
);

// General data-row padding
content = content.replace(
  /padding:\s*'0\.7rem 1\.25rem'/g,
  'padding: \'0.85rem 1.5rem\''
);

fs.writeFileSync(file, content);
console.log('Successfully updated dashboard-widgets.tsx');
