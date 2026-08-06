const fs = require('fs');
let code = fs.readFileSync('app/(protected)/admin/schedule/page.tsx', 'utf8');

const target = `            )}
          </div>`;

const replacement = `            )}
            <div className="flex items-center gap-2">
              <select 
                value={selectedClassFilter} 
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="bg-white border border-gray-200 text-gray-700 text-[13px] font-bold rounded-xl focus:ring-[#531FFF] focus:border-[#531FFF] block w-full py-2 px-4 h-[38px] shadow-sm appearance-none pr-8 cursor-pointer relative"
                style={{
                  backgroundImage: \`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")\`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.5rem center',
                  backgroundSize: '1.2em 1.2em'
                }}
              >
                <option value="All">Semua Kelas</option>
                {classes.map(c => (
                  <option key={c._firestoreId || c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>`;

code = code.replace(target, replacement);
fs.writeFileSync('app/(protected)/admin/schedule/page.tsx', code);
