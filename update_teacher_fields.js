const fs = require('fs');
const file = 'app/(protected)/admin/teachers/page.tsx';
let code = fs.readFileSync(file, 'utf8');

const oldFields = `    { 
      name: "classes", 
      label: "Kelas yang Diajar",
      type: "select",
      placeholder: "Pilih Kelas",
      options: classesList.map(c => ({ label: c.name, value: c.name }))
    },`;

code = code.replace(oldFields, "");
fs.writeFileSync(file, code);
