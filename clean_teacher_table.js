const fs = require('fs');
const file = 'app/(protected)/admin/teachers/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// grid
const gridClasses = `                       <div className="flex justify-between items-center text-[12px]">
                         <span className="text-gray-500">Kelas:</span>
                         <span className="font-semibold text-gray-900 truncate max-w-[120px]">{item.classes || "-"}</span>
                       </div>`;
code = code.replace(gridClasses, "");

// table header
const tableTh = `                     <th className="py-3 px-6 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Kelas yang Diajar</th>`;
code = code.replace(tableTh, "");

// table data
const tableTd = `                       <td className="py-4 px-6 text-[13px] font-semibold text-gray-700">
                          {item.classes || "-"}
                       </td>`;
code = code.replace(tableTd, "");

fs.writeFileSync(file, code);
