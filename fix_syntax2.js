const fs = require('fs');
let code = fs.readFileSync('app/(protected)/admin/schedule/page.tsx', 'utf8');

code = code.replace(/\\`/g, "`");

fs.writeFileSync('app/(protected)/admin/schedule/page.tsx', code);
