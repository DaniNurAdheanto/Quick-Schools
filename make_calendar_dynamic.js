const fs = require('fs');
const path = 'app/(protected)/admin/calendar/page.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('export const dynamic = "force-dynamic";')) {
    content = content.replace('export default function CalendarPage', 'export const dynamic = "force-dynamic";\n\nexport default function CalendarPage');
    fs.writeFileSync(path, content);
    console.log('Added force-dynamic to calendar page');
}
