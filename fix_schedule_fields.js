const fs = require('fs');
let code = fs.readFileSync('app/(protected)/admin/schedule/page.tsx', 'utf8');

// Add state for formSubject
code = code.replace(
  'const [crudState, setCrudState] = useState<{ open: boolean; mode: "create" | "edit" | "delete"; data?: any }>({',
  'const [formSubject, setFormSubject] = useState<string>("");\n  const [crudState, setCrudState] = useState<{ open: boolean; mode: "create" | "edit" | "delete"; data?: any }>({'
);

// Update scheduleFields
const oldFields = `    { 
      name: "teacher", 
      label: "Guru Pengajar",
      type: "select",
      placeholder: "Pilih Guru",
      options: teachers.map(t => ({ label: t.name, value: t.name }))
    },`;
const newFields = `    { 
      name: "teacher", 
      label: "Guru Pengajar",
      type: "select",
      placeholder: "Pilih Guru",
      options: teachers.filter(t => !formSubject || t.role === formSubject).map(t => ({ label: t.name, value: t.name }))
    },`;
code = code.replace(oldFields, newFields);

// Pass onDataChange to CrudSheet
const oldCrudSheet = `      <CrudSheet
        open={crudState.open}
        onOpenChange={(open) => !open && setCrudState(prev => ({ ...prev, open: false }))}
        mode={crudState.mode}
        entityName="Jadwal Pelajaran"
        fields={scheduleFields}
        initialData={crudState.data}
        onSubmit={handleCrudSubmit}
      />`;
const newCrudSheet = `      <CrudSheet
        open={crudState.open}
        onOpenChange={(open) => !open && setCrudState(prev => ({ ...prev, open: false }))}
        mode={crudState.mode}
        entityName="Jadwal Pelajaran"
        fields={scheduleFields}
        initialData={crudState.data}
        onSubmit={handleCrudSubmit}
        onDataChange={(data) => setFormSubject(data?.subject || "")}
      />`;
code = code.replace(oldCrudSheet, newCrudSheet);

fs.writeFileSync('app/(protected)/admin/schedule/page.tsx', code);
