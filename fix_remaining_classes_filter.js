const fs = require('fs');
let code = fs.readFileSync('app/(protected)/admin/schedule/page.tsx', 'utf8');

const regex = /<div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">\s*\{classes\.map\(\(c\) => \(\s*<button\s*key=\{c\._firestoreId \|\| c\.name\}\s*onClick=\{\(\) => setSelectedClass\(c\.name\)\}\s*className=\{`[^`]+`\}\s*>\s*\{c\.name\}\s*<\/button>\s*\)\)\}\s*<\/div>/g;

code = code.replace(regex, '');

fs.writeFileSync('app/(protected)/admin/schedule/page.tsx', code);
