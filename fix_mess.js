const fs = require('fs');

const pages = [
  'app/(protected)/admin/classes',
  'app/(protected)/admin/homeroom',
  'app/(protected)/admin/subjects',
  'app/(protected)/admin/teachers',
  'app/(protected)/admin/data-siswa',
  'app/(protected)/admin/dashboard',
  'app/(protected)/admin/calendar',
  'app/(protected)/admin/announcements'
];

pages.forEach(dir => {
    if (fs.existsSync(dir + '/page-content.tsx')) {
        let content = fs.readFileSync(dir + '/page-content.tsx', 'utf8');
        fs.writeFileSync(dir + '/page.tsx', content);
        fs.unlinkSync(dir + '/page-content.tsx');
        console.log("Restored " + dir);
    }
});
