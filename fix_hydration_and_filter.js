const fs = require('fs');
let code = fs.readFileSync('app/(protected)/admin/schedule/page.tsx', 'utf8');

// 1. Remove selectedClass state
code = code.replace(
  '  const [selectedClass, setSelectedClass] = useState<string>("");\n',
  ''
);

// 2. Fix unsubClasses to just load classes (since it's needed for the form)
code = code.replace(
  `        const unsubClasses = onSnapshot(query(collection(db, "classes")), (snapshot) => {
          const loadedClasses = snapshot.docs.map(d => ({ _firestoreId: d.id, ...d.data() } as any));
          setClasses(loadedClasses);
          if (loadedClasses.length > 0) {
            setSelectedClass(prev => prev === "all" || prev === "" ? loadedClasses[0].name : prev);
          }
        });`,
  `        const unsubClasses = onSnapshot(query(collection(db, "classes")), (snapshot) => {
          setClasses(snapshot.docs.map(d => ({ _firestoreId: d.id, ...d.data() } as any)));
        });`
);

// 3. Remove filteredSchedules logic and just use schedules
code = code.replace(
  'const filteredSchedules = schedules.filter(s => s.class === selectedClass);',
  ''
);

// We need to replace all occurrences of `filteredSchedules` with `schedules`
code = code.replace(/filteredSchedules/g, 'schedules');

// 4. Remove the class filter UI
code = code.replace(
  `          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
            {classes.map((c) => (
              <button
                key={c._firestoreId || c.name}
                onClick={() => setSelectedClass(c.name)}
                className={\`px-4 py-2 rounded-xl text-[13px] font-bold whitespace-nowrap transition-all \${selectedClass === c.name ? "bg-[#531FFF] text-white shadow-sm" : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"}\`}
              >
                {c.name}
              </button>
            ))}
          </div>`,
  ''
);

// 5. Fix hydration error with mounted
code = code.replace(
  `             <div className="text-[13px] font-bold text-gray-700">
               {currentDayString}, {now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
             </div>`,
  `             <div className="text-[13px] font-bold text-gray-700">
               {mounted ? \`\${currentDayString}, \${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}\` : ""}
             </div>`
);

fs.writeFileSync('app/(protected)/admin/schedule/page.tsx', code);
