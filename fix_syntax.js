const fs = require('fs');
let code = fs.readFileSync('app/(protected)/admin/schedule/page.tsx', 'utf8');

code = code.replace(/backgroundImage: \\`url/g, "backgroundImage: `url");

fs.writeFileSync('app/(protected)/admin/schedule/page.tsx', code);
