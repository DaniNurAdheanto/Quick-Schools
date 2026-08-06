const fs = require('fs');
const glob = require('glob');

const pages = [
  'app/(protected)/admin/classes/page.tsx',
  'app/(protected)/admin/homeroom/page.tsx',
  'app/(protected)/admin/subjects/page.tsx',
  'app/(protected)/admin/teachers/page.tsx',
  'app/(protected)/admin/data-siswa/page.tsx',
  'app/(protected)/admin/dashboard/page.tsx'
];

pages.forEach(file => {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        if (!content.includes('import dynamic from "next/dynamic"')) {
            const newFile = file.replace('page.tsx', 'page-content.tsx');
            fs.writeFileSync(newFile, content);
            
            fs.writeFileSync(file, `
import dynamic from "next/dynamic";
const Content = dynamic(() => import('./page-content'), { ssr: false });
export default function Page() {
    return <Content />;
}
            `.trim());
            console.log("Wrapped: " + file);
        }
    }
});
