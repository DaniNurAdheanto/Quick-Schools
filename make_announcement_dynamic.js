const fs = require('fs');
const path = 'app/(protected)/admin/announcements/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// The error is `Cannot read properties of null (reading 'useContext')`
// It happens on prerender. Let's make this page completely dynamically rendered.
// Add `export const dynamic = "force-dynamic";` to the top.

if (!content.includes('export const dynamic = "force-dynamic";')) {
    content = content.replace('export default function AnnouncementsPage', 'export const dynamic = "force-dynamic";\n\nexport default function AnnouncementsPage');
    fs.writeFileSync(path, content);
    console.log('Added force-dynamic to announcements page');
}
