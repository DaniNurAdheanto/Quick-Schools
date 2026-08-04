const fs = require('fs');
const lines = fs.readFileSync('app/(protected)/admin/calendar/page.tsx', 'utf8').split('\n');

const firstPart = lines.slice(0, 411).join('\n');
// Now we need the part after calendar grid in the original file
// It seems `Tags Legenda` was at line 967 in the corrupted file, which is a duplicate of the original.
const secondPartIdx = lines.findIndex((line, i) => i > 411 && line.includes('{/* Tags Legenda */}'));

if (secondPartIdx !== -1) {
  const secondPart = lines.slice(secondPartIdx).join('\n');
  fs.writeFileSync('app/(protected)/admin/calendar/page.tsx', firstPart + '\n' + secondPart);
} else {
  console.error("Could not find Tags Legenda");
}
