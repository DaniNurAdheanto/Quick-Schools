const fs = require('fs');
if (fs.existsSync('components/layouts/crud-sheet-content.tsx')) {
  let content = fs.readFileSync('components/layouts/crud-sheet-content.tsx', 'utf8');
  fs.writeFileSync('components/layouts/crud-sheet.tsx', content);
  fs.unlinkSync('components/layouts/crud-sheet-content.tsx');
  console.log("Restored crud-sheet");
}
