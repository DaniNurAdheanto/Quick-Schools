const fs = require('fs');
let code = fs.readFileSync('app/(protected)/admin/schedule/page.tsx', 'utf8');

// Fix 1: Active class check in Day headers
code = code.replace(
  /\`text-center py-3 rounded-xl mb-4 border \$\{day === currentDayString \? 'bg-\[#531FFF\] text-white border-\[#531FFF\]' : 'bg-gray-50 border-gray-100 text-gray-700'\}\`/g,
  "`text-center py-3 rounded-xl mb-4 border ${mounted && day === currentDayString ? 'bg-[#531FFF] text-white border-[#531FFF]' : 'bg-gray-50 border-gray-100 text-gray-700'}`"
);

// Fix 2: isActive method to only return true if mounted
code = code.replace(
  '  const isActive = (schedule: any) => {',
  '  const isActive = (schedule: any) => {\n    if (!mounted) return false;'
);

fs.writeFileSync('app/(protected)/admin/schedule/page.tsx', code);
