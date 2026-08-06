const fs = require('fs');

const file = 'app/(protected)/admin/calendar/page.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import dynamic from "next/dynamic"')) {
    // we need to wrap the export default with dynamic
    const newFile = file.replace('page.tsx', 'page-content.tsx');
    fs.writeFileSync(newFile, content);
    
    fs.writeFileSync(file, `
import dynamic from "next/dynamic";
const Content = dynamic(() => import('./page-content'), { ssr: false });
export default function Page() {
    return <Content />;
}
    `.trim());
}

const file2 = 'app/(protected)/admin/announcements/page.tsx';
let content2 = fs.readFileSync(file2, 'utf8');
if (!content2.includes('import dynamic from "next/dynamic"')) {
    const newFile2 = file2.replace('page.tsx', 'page-content.tsx');
    fs.writeFileSync(newFile2, content2);
    
    fs.writeFileSync(file2, `
import dynamic from "next/dynamic";
const Content = dynamic(() => import('./page-content'), { ssr: false });
export default function Page() {
    return <Content />;
}
    `.trim());
}
