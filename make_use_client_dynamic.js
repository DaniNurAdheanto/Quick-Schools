const fs = require('fs');

const files = [
  'app/(protected)/admin/calendar/page.tsx',
  'app/(protected)/admin/announcements/page.tsx',
  'app/(protected)/admin/classes/page.tsx',
  'app/(protected)/admin/homeroom/page.tsx',
  'app/(protected)/admin/subjects/page.tsx',
  'app/(protected)/admin/teachers/page.tsx',
  'app/(protected)/admin/data-siswa/page.tsx',
  'app/(protected)/admin/dashboard/page.tsx'
];

files.forEach(file => {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        if (!content.includes('"use client"')) {
            content = '"use client";\n' + content;
            fs.writeFileSync(file, content);
        }
    }
});
