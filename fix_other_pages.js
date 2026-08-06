const fs = require('fs');

const pages = [
  'app/(protected)/admin/classes/page.tsx',
  'app/(protected)/admin/homeroom/page.tsx',
  'app/(protected)/admin/schedule/page.tsx',
  'app/(protected)/admin/subjects/page.tsx',
  'app/(protected)/admin/teachers/page.tsx',
  'app/(protected)/admin/data-siswa/page.tsx'
];

pages.forEach(path => {
  if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    if (!content.includes('export const dynamic = "force-dynamic";')) {
      content = content.replace(/export default function/g, 'export const dynamic = "force-dynamic";\n\nexport default function');
      fs.writeFileSync(path, content);
      console.log('Added force-dynamic to ' + path);
    }
  }
});
