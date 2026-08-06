const fs = require('fs');
let code = fs.readFileSync('app/(protected)/admin/schedule/page.tsx', 'utf8');

// 1. Add state
code = code.replace(
  'const [mounted, setMounted] = useState(false);',
  'const [mounted, setMounted] = useState(false);\n  const [selectedClass, setSelectedClass] = useState<string>("all");'
);

// 2. Add filter logic before rendering
code = code.replace(
  'return (\n    <div className="p-8 h-full flex flex-col">',
  'const filteredSchedules = selectedClass === "all" ? schedules : schedules.filter(s => s.class === selectedClass);\n\n  return (\n    <div className="p-8 h-full flex flex-col">'
);

// 3. Add pills UI right inside the bg-white container, before the loading state or grid
code = code.replace(
  '<div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col flex-1 overflow-hidden p-6">\n        {loading ? (',
  '<div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col flex-1 overflow-hidden p-6">\n        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-4 border-b border-gray-100 custom-scrollbar">\n          <button\n            onClick={() => setSelectedClass("all")}\n            className={`px-4 py-2 rounded-xl text-[13px] font-bold whitespace-nowrap transition-all ${selectedClass === "all" ? "bg-[#531FFF] text-white shadow-sm" : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"}`}\n          >\n            Semua Kelas\n          </button>\n          {classes.map((c) => (\n            <button\n              key={c._firestoreId || c.name}\n              onClick={() => setSelectedClass(c.name)}\n              className={`px-4 py-2 rounded-xl text-[13px] font-bold whitespace-nowrap transition-all ${selectedClass === c.name ? "bg-[#531FFF] text-white shadow-sm" : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"}`}\n            >\n              {c.name}\n            </button>\n          ))}\n        </div>\n\n        {loading ? ('
);

// 4. Update the schedule rendering to use filteredSchedules
code = code.replace(
  '                  {schedules\n                    .filter(s => s.day === day)',
  '                  {filteredSchedules\n                    .filter(s => s.day === day)'
);

code = code.replace(
  '{schedules.filter(s => s.day === day).length === 0 && (',
  '{filteredSchedules.filter(s => s.day === day).length === 0 && ('
);

fs.writeFileSync('app/(protected)/admin/schedule/page.tsx', code);
