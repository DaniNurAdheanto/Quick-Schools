const fs = require('fs');
let code = fs.readFileSync('components/layouts/crud-sheet.tsx', 'utf8');

code = code.replace(
  '  onSubmit?: (data: any) => void;\n}',
  '  onSubmit?: (data: any) => void;\n  onDataChange?: (data: any) => void;\n}'
);

code = code.replace(
  '  onSubmit\n}: CrudSheetProps) {',
  '  onSubmit,\n  onDataChange\n}: CrudSheetProps) {'
);

code = code.replace(
  '  const handleChange = (name: string, value: string | File) => {\n    setFormData((prev: any) => ({ ...prev, [name]: value }));\n  };',
  '  const handleChange = (name: string, value: string | File) => {\n    setFormData((prev: any) => {\n      const next = { ...prev, [name]: value };\n      if (onDataChange) onDataChange(next);\n      return next;\n    });\n  };'
);

code = code.replace(
  '      // eslint-disable-next-line react-hooks/set-state-in-effect\n      setFormData(initialData || {});',
  '      // eslint-disable-next-line react-hooks/set-state-in-effect\n      const data = initialData || {};\n      setFormData(data);\n      if (onDataChange) onDataChange(data);'
);

fs.writeFileSync('components/layouts/crud-sheet.tsx', code);
