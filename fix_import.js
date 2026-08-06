const fs = require('fs');
const p = '/app/applet/app/(protected)/admin/attendance/page.tsx';
let data = fs.readFileSync(p, 'utf8');

if (!data.includes("import dynamic from 'next/dynamic'") && !data.includes('import dynamic from "next/dynamic"')) {
    data = data.replace(
        'import { cn } from "@/lib/utils";',
        'import { cn } from "@/lib/utils";\nimport dynamic from "next/dynamic";\nconst MapComponent = dynamic(() => import("./MapComponent"), { ssr: false });'
    );
    fs.writeFileSync(p, data);
}
