const fs = require('fs');

const path = 'app/(protected)/admin/calendar/page-content.tsx';
let content = fs.readFileSync(path, 'utf8');

// Basic syntax check by parsing with Babel or similar, but node itself can do a basic check.
console.log("File size:", content.length);
