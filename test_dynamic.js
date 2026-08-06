const fs = require('fs');

const path = 'app/(protected)/admin/announcements/page-content.tsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /import \{([^\}]+)\} from "lucide-react";/;
const match = content.match(regex);
if (match) {
    const icons = match[1].split(',').map(s => s.trim()).filter(Boolean);
    console.log(icons);
}
