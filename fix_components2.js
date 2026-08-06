const fs = require('fs');

const path = 'app/(protected)/admin/announcements/page-content.tsx';
let content = fs.readFileSync(path, 'utf8');

// There's a problem with lucide-react tree shaking or icon imports in some Next.js versions.
// Recharts uses useContext, but it's not imported here.
// Let's replace the whole Announcements page with a simpler version just to isolate the issue.
// If it works, we know the issue is inside the complex version.

fs.writeFileSync('app/(protected)/admin/announcements/test.txt', 'test');
