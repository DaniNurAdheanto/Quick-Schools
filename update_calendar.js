const fs = require('fs');

let content = fs.readFileSync('app/(protected)/admin/calendar/page.tsx', 'utf8');

const importStatement = `
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  parseISO,
  isToday
} from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
`;

content = content.replace('import { CrudSheet } from "@/components/layouts/crud-sheet";', 'import { CrudSheet } from "@/components/layouts/crud-sheet";' + importStatement);

const stateStatements = `
  const [currentDate, setCurrentDate] = useState(new Date());

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const renderCalendarCells = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = '';

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, 'd');
        const cloneDay = day;
        
        // Find events for this day
        const dayEvents = events.filter(e => {
          if (!e.date) return false;
          try {
            return e.date === format(cloneDay, 'yyyy-MM-dd');
          } catch(err) { return false; }
        });

        days.push(
          <div 
            key={day.toISOString()} 
            className={\`p-2 border-b border-r border-gray-100 min-h-[96px] cursor-pointer hover:bg-gray-50 transition-colors \${!isSameMonth(day, monthStart) ? 'bg-gray-50/30' : ''}\`}
            onClick={() => {
              setCrudState({ open: true, mode: 'create', data: { date: format(cloneDay, 'yyyy-MM-dd') } });
            }}
          >
            <div className="flex justify-between items-start mb-1">
              <span className={\`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full \${
                isSameDay(day, new Date()) ? 'bg-[#531FFF] text-white' :
                !isSameMonth(day, monthStart) ? 'text-gray-400' :
                (i === 6) ? 'text-red-500' : 'text-gray-900'
              }\`}>
                {formattedDate}
              </span>
            </div>
            <div className="mt-1 space-y-1">
              {dayEvents.map((evt, idx) => {
                const details = getCategoryDetails(evt.category);
                return (
                  <div key={idx} 
                    className={\`text-[10px] font-semibold px-2 py-1 rounded truncate border flex items-center gap-1.5 \${details.bgClass} \${details.textClass} \${details.borderClass}\`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCrudState({ open: true, mode: 'edit', data: evt });
                    }}
                  >
                    <span className={\`w-1.5 h-1.5 rounded-full shrink-0 \${details.bgClass.replace('bg-', 'bg-').replace('-50', '-500')}\`}></span> 
                    {evt.title}
                  </div>
                );
              })}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toISOString()}>
          {days}
        </div>
      );
      days = [];
    }
    return rows;
  };
`;

content = content.replace('const [loading, setLoading] = useState(true);', 'const [loading, setLoading] = useState(true);' + stateStatements);


// Replace the hardcoded calendar header and grid
const calendarContainerStart = content.indexOf('<div className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] p-6">');
const calendarHeaderStart = content.indexOf('<div className="flex items-center justify-between mb-6">', calendarContainerStart);
const calendarGridEnd = content.indexOf('{/* Timeline Horizontal */}');

const calendarSection = `
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center bg-gray-50 border border-gray-100 rounded-lg p-1">
                  <button onClick={prevMonth} className="p-1 px-2.5 hover:bg-white rounded shadow-sm text-gray-500 hover:text-gray-900 transition-all font-semibold">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={nextMonth} className="p-1 px-2.5 hover:bg-white rounded shadow-sm text-gray-500 hover:text-gray-900 transition-all font-semibold">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <button onClick={goToToday} className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
                  Today
                </button>
              </div>
              <h2 className="text-xl font-bold text-gray-900 capitalize">{format(currentDate, 'MMMM yyyy', { locale: idLocale })}</h2>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  Month
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  <Filter className="w-3.5 h-3.5" />
                  Filter
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="border-t border-l border-gray-100 rounded-xl overflow-hidden">
              <div className="grid grid-cols-7 bg-gray-50/50 border-b border-gray-100">
                {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((day) => (
                  <div key={day} className="py-3 text-center text-[12px] font-bold text-gray-500 border-r border-gray-100">
                    {day}
                  </div>
                ))}
              </div>
              {renderCalendarCells()}
            </div>
            `;

const before = content.substring(0, calendarHeaderStart);
const after = content.substring(calendarGridEnd);

content = before + calendarSection + after;

// Change date field to use date input type
content = content.replace('{ name: "date", label: "Tanggal" },', '{ name: "date", label: "Tanggal", type: "date" },');

fs.writeFileSync('app/(protected)/admin/calendar/page.tsx', content);

