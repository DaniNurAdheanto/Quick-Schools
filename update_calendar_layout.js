const fs = require('fs');

const path = 'app/(protected)/admin/calendar/page-content.tsx';
let content = fs.readFileSync(path, 'utf8');

// The block to move starts with `<div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">`
const gridStartIdx = content.indexOf('<div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">');
if (gridStartIdx === -1) {
    console.error("Could not find grid start");
    process.exit(1);
}

// Find the end of this grid.
// It ends around here:
//             </div>
//          </div>
//        </div>
//
//        {/* Sidebar Space (Right) */}

const sidebarStartIdx = content.indexOf('{/* Sidebar Space (Right) */}');
if (sidebarStartIdx === -1) {
    console.error("Could not find sidebar space start");
    process.exit(1);
}

// We need to carefully extract the grid block.
let beforeGrid = content.substring(0, gridStartIdx);
let afterGridText = content.substring(gridStartIdx, sidebarStartIdx);

// `afterGridText` contains the grid block and the closing `</div>` for `<div className="flex-1 space-y-6 flex flex-col">`
const lastDivIdx = afterGridText.lastIndexOf('</div>');
let gridBlock = afterGridText.substring(0, lastDivIdx).trim();

// Change grid block classes to remove flex-1 so it acts normally at the top
gridBlock = gridBlock.replace('<div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">', '<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">');


// Insert gridBlock BEFORE Calendar Card
const calendarCardIdx = beforeGrid.indexOf('{/* Calendar Card */}');
if (calendarCardIdx === -1) {
    console.error("Could not find Calendar Card");
    process.exit(1);
}

let beforeCalendar = beforeGrid.substring(0, calendarCardIdx);
let calendarCard = beforeGrid.substring(calendarCardIdx);

let newContent = beforeCalendar + gridBlock + '\n\n          ' + calendarCard + '\n        </div>\n\n        {/* Sidebar Space (Right) */}' + content.substring(sidebarStartIdx + '{/* Sidebar Space (Right) */}'.length);

const dynamicLogic = `
  const today = new Date();
  const currentYear = today.getFullYear();
  const academicYearStart = new Date(today.getMonth() < 6 ? currentYear - 1 : currentYear, 6, 15);
  const academicYearEnd = new Date(today.getMonth() < 6 ? currentYear : currentYear + 1, 5, 15);

  const totalDays = Math.max(1, Math.ceil((academicYearEnd.getTime() - academicYearStart.getTime()) / (1000 * 60 * 60 * 24)));
  const passedDays = Math.max(0, Math.ceil((today.getTime() - academicYearStart.getTime()) / (1000 * 60 * 60 * 24)));
  const progressPercent = Math.max(0, Math.min(100, Math.round((passedDays / totalDays) * 100)));
  
  const currentSemester = today.getMonth() < 6 ? "Semester 2" : "Semester 1";
  const academicYearText = today.getMonth() < 6 ? \`\${currentYear - 1} / \${currentYear}\` : \`\${currentYear} / \${currentYear + 1}\`;

  const upcomingEvents = events
    .filter(e => e.date && new Date(e.date) >= new Date(new Date().setHours(0,0,0,0)))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);
`;

const stateIndex = newContent.indexOf('const [currentDate, setCurrentDate] = useState(new Date());');
newContent = newContent.substring(0, stateIndex + 'const [currentDate, setCurrentDate] = useState(new Date());'.length) + '\n' + dynamicLogic + '\n' + newContent.substring(stateIndex + 'const [currentDate, setCurrentDate] = useState(new Date());'.length);

// Now update Timeline and Progress cards visually
const timelineCardStart = newContent.indexOf('{/* Timeline Card */}');
const progressCardStart = newContent.indexOf('{/* Progress Card */}');

const timelineContent = `
             {/* Timeline Card */}
             <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] p-6 flex flex-col justify-between h-full">
               <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-3">
                   <h2 className="text-[16px] font-bold text-gray-900">Agenda Mendatang</h2>
                   <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded text-[10px] font-bold">{currentSemester}</span>
                 </div>
                 <button className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600">
                   <ChevronRight className="w-4 h-4" />
                 </button>
               </div>
               
               <div className="relative pt-4 pb-2 flex-1">
                 <div className="absolute top-[21px] left-0 right-0 h-[2px] bg-gray-100 rounded-full z-0"></div>
                 
                 <div className="flex justify-between relative z-10">
                   {upcomingEvents.length === 0 ? (
                     <div className="text-sm text-gray-500 text-center w-full py-4">Tidak ada agenda mendatang</div>
                   ) : upcomingEvents.map((evt, idx) => (
                    <div key={evt.id || idx} className="flex flex-col items-center gap-3 relative flex-1 max-w-[80px]">
                      <div className={\`w-3 h-3 rounded-full \${idx === 0 ? 'bg-[#531FFF] ring-4 ring-[#531FFF]/20' : 'bg-gray-300 ring-4 ring-white'} z-10\`}></div>
                      <div className="text-center px-1">
                        <p className="text-[10px] font-semibold text-gray-500 mb-1 capitalize">{format(new Date(evt.date), 'MMM yyyy', { locale: idLocale })}</p>
                        <p className="text-[12px] font-bold text-gray-900 leading-tight line-clamp-2" title={evt.title}>{evt.title}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{format(new Date(evt.date), 'dd MMM', { locale: idLocale })}</p>
                      </div>
                    </div>
                   ))}
                 </div>
               </div>
             </div>
`;

const sidebarStart = newContent.indexOf('</div>\n\n        {/* Sidebar Space (Right) */}');
if (sidebarStart === -1) {
  console.log("Cannot find sidebar space");
  process.exit(1);
}

const progressContent = `
             {/* Progress Card */}
             <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] p-6 flex flex-col justify-between h-full">
               <h2 className="text-[16px] font-bold text-gray-900 mb-6">Progress Tahun Ajaran {academicYearText}</h2>
               <div className="flex items-center gap-8">
                  <div className="w-[120px] h-[120px] relative shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[{ value: progressPercent }, { value: 100 - progressPercent }]}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={55}
                          dataKey="value"
                          startAngle={90}
                          endAngle={-270}
                          stroke="none"
                        >
                           <Cell fill="#531FFF" />
                           <Cell fill="#F3F4F6" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-bold text-gray-900 leading-none">{progressPercent}%</span>
                      <span className="text-[10px] font-medium text-gray-500">Berjalan</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                     <div>
                       <p className="text-[11px] font-medium text-gray-500 mb-0.5">Hari Berjalan</p>
                       <p className="text-[14px] font-bold text-gray-900">{passedDays} Hari</p>
                     </div>
                     <div>
                       <p className="text-[11px] font-medium text-gray-500 mb-0.5">Sisa Hari</p>
                       <p className="text-[14px] font-bold text-gray-900">{totalDays - passedDays} Hari</p>
                     </div>
                     <div>
                       <p className="text-[11px] font-medium text-gray-500 mb-0.5">Semester</p>
                       <p className="text-[14px] font-bold text-gray-900">{currentSemester}</p>
                     </div>
                  </div>
               </div>
               <p className="text-[10px] text-gray-400 mt-4 pt-4 border-t border-gray-100">Periode: {format(academicYearStart, 'dd MMM yyyy', { locale: idLocale })} - {format(academicYearEnd, 'dd MMM yyyy', { locale: idLocale })}</p>
             </div>
          </div>
`;

newContent = newContent.substring(0, timelineCardStart) + timelineContent + '\n' + progressContent + '\n' + newContent.substring(sidebarStart);

fs.writeFileSync(path, newContent);
console.log("Replaced successfully!");
