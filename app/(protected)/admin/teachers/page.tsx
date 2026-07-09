"use client";

import React, { useState } from "react";
import { 
  Users, Plus, Search, Filter, MoreHorizontal, GraduationCap, ChevronDown, PenTool, Trash2, ArrowUp, Briefcase
} from "lucide-react";
import { CrudSheet } from "@/components/layouts/crud-sheet";

const TEACHERS_DATA = [
  { id: "T001", name: "Budi Santoso, S.Pd", role: "Guru Matematika", status: "Aktif", classes: "10A, 10B", contact: "081234567890" },
  { id: "T002", name: "Siti Amelia, S.E", role: "Guru Ekonomi", status: "Aktif", classes: "11 IPS 1, 12 IPS 1", contact: "082345678901" },
  { id: "T003", name: "Drs. Ahmad Yani", role: "Guru Fisika", status: "Aktif", classes: "11 MIPA 1, 12 MIPA 1", contact: "083456789012" },
  { id: "T004", name: "Ratna Sari, M.Pd", role: "Guru Biologi", status: "Aktif", classes: "11 MIPA 2", contact: "084567890123" },
  { id: "T005", name: "Hendro Wibowo, S.Pd", role: "Guru Sejarah", status: "Aktif", classes: "10A, 11 IPS 1", contact: "085678901234" },
  { id: "T006", name: "Linda Kusuma, M.Si", role: "Guru Kimia", status: "Cuti", classes: "12 MIPA 1", contact: "086789012345" },
  { id: "T007", name: "Eko Prasetyo, S.Pd", role: "Guru Geografi", status: "Aktif", classes: "12 IPS 1", contact: "087890123456" },
];

export default function TeachersPage() {
  const [crudState, setCrudState] = useState<{ open: boolean; mode: "create" | "edit" | "delete"; data?: any }>({
    open: false,
    mode: "create"
  });

  const teacherFields = [
    { name: "name", label: "Nama Guru" },
    { name: "id", label: "NIP" },
    { name: "role", label: "Posisi / Mapel" },
    { name: "classes", label: "Kelas yang Diajar" },
    { name: "contact", label: "Kontak" },
    { name: "status", label: "Status" }
  ];

  return (
    <div className="p-8 pb-12 max-w-[1600px] mx-auto w-full h-full flex flex-col space-y-8">
      <CrudSheet 
        open={crudState.open} 
        onOpenChange={(open) => setCrudState(s => ({ ...s, open }))}
        mode={crudState.mode}
        entityName="Guru"
        fields={teacherFields}
        initialData={crudState.data}
      />
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Staff Guru</h1>
          <p className="text-[13px] text-gray-500 mt-1 font-medium">Kelola data pengajar, mata pelajaran, dan informasi kontak.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 rounded-xl text-[13px] font-bold shadow-sm transition-colors">
            <Filter className="w-4 h-4" /> Filter
          </button>
          <button 
            onClick={() => setCrudState({ open: true, mode: "create" })}
            className="flex items-center gap-2 px-4 py-2 bg-[#531FFF] text-white hover:bg-[#4314E5] rounded-xl text-[13px] font-bold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah Guru
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Guru */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] relative overflow-hidden flex flex-col justify-between h-[130px]">
          <div className="flex gap-4 z-10">
            <div className="w-10 h-10 rounded-full bg-[#531FFF]/10 flex items-center justify-center shrink-0">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="#531FFF" fillOpacity="0.8"/>
               </svg>
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-gray-500 mb-0.5">Total Guru</p>
              <div className="flex items-end gap-2 justify-between w-full">
                <span className="text-[28px] leading-none font-bold text-gray-900 tracking-tight">86</span>
                <div className="flex flex-col items-end gap-0.5 mb-1">
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded flex items-center gap-0.5">
                    <ArrowUp className="w-2.5 h-2.5" /> 5
                  </span>
                  <span className="text-[8px] text-gray-400">dari bulan lalu</span>
                </div>
              </div>
            </div>
          </div>
          <svg className="absolute bottom-0 left-0 w-full h-8 opacity-20" viewBox="0 0 100 20" preserveAspectRatio="none">
             <path d="M0,20 L10,12 L30,15 L60,4 L80,9 L100,5 L100,20 Z" fill="url(#grad_guru)" />
             <polyline points="0,12 10,12 30,15 60,4 80,9 100,5" fill="none" stroke="#531FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
             <defs>
               <linearGradient id="grad_guru" x1="0%" y1="0%" x2="0%" y2="100%">
                 <stop offset="0%" stopColor="#531FFF" stopOpacity="0.5" />
                 <stop offset="100%" stopColor="#531FFF" stopOpacity="0" />
               </linearGradient>
             </defs>
          </svg>
        </div>

        {/* Guru Aktif */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] relative overflow-hidden flex flex-col justify-between h-[130px]">
          <div className="flex gap-4 z-10">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-gray-500 mb-0.5">Guru Aktif</p>
              <div className="flex items-end gap-2 justify-between w-full">
                <span className="text-[28px] leading-none font-bold text-gray-900 tracking-tight">82</span>
                <div className="flex flex-col items-end gap-0.5 mb-1">
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded flex items-center gap-0.5">
                    95%
                  </span>
                  <span className="text-[8px] text-gray-400">hadir hari ini</span>
                </div>
              </div>
            </div>
          </div>
          <svg className="absolute bottom-0 left-0 w-full h-8 opacity-20" viewBox="0 0 100 20" preserveAspectRatio="none">
             <path d="M0,20 L15,10 L35,16 L55,5 L75,10 L100,2 L100,20 Z" fill="url(#grad_aktif)" />
             <polyline points="0,10 15,10 35,16 55,5 75,10 100,2" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
             <defs>
               <linearGradient id="grad_aktif" x1="0%" y1="0%" x2="0%" y2="100%">
                 <stop offset="0%" stopColor="#10B981" stopOpacity="0.5" />
                 <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
               </linearGradient>
             </defs>
          </svg>
        </div>

        {/* Guru Cuti/Izin */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] relative overflow-hidden flex flex-col justify-between h-[130px]">
          <div className="flex gap-4 z-10">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-gray-500 mb-0.5">Guru Cuti/Izin</p>
              <div className="flex items-end gap-2 justify-between w-full">
                <span className="text-[28px] leading-none font-bold text-gray-900 tracking-tight">4</span>
                <div className="flex flex-col items-end gap-0.5 mb-1">
                  <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1 rounded flex items-center gap-0.5">
                    5%
                  </span>
                  <span className="text-[8px] text-gray-400">dari total</span>
                </div>
              </div>
            </div>
          </div>
          <svg className="absolute bottom-0 left-0 w-full h-8 opacity-20" viewBox="0 0 100 20" preserveAspectRatio="none">
             <path d="M0,20 L20,15 L40,8 L70,12 L90,2 L100,4 L100,20 Z" fill="url(#grad_cuti)" />
             <polyline points="0,15 20,15 40,8 70,12 90,2 100,4" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
             <defs>
               <linearGradient id="grad_cuti" x1="0%" y1="0%" x2="0%" y2="100%">
                 <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.5" />
                 <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
               </linearGradient>
             </defs>
          </svg>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex-1 flex flex-col overflow-hidden">
         {/* Toolbar */}
         <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-[320px]">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
               <input 
                 type="text"
                 placeholder="Cari nama guru, mapel, atau NIP..."
                 className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF] focus:border-transparent transition-all"
               />
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
               <button className="flex items-center gap-2 px-3 py-2 text-[13px] font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 w-full sm:w-auto justify-center">
                 Mata Pelajaran <ChevronDown className="w-4 h-4" />
               </button>
               <button className="flex items-center gap-2 px-3 py-2 text-[13px] font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 w-full sm:w-auto justify-center">
                 Status <ChevronDown className="w-4 h-4" />
               </button>
            </div>
         </div>

         {/* Table container for scrolling */}
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-gray-50/50 border-b border-gray-100">
                   <th className="py-3 px-6 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Nama Guru</th>
                   <th className="py-3 px-6 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Posisi / Mapel</th>
                   <th className="py-3 px-6 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Kelas yang Diajar</th>
                   <th className="py-3 px-6 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Kontak</th>
                   <th className="py-3 px-6 text-[12px] font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
                   <th className="py-3 px-6 text-[12px] font-bold text-gray-500 uppercase tracking-wider text-center">Aksi</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                 {TEACHERS_DATA.map((item, i) => (
                   <tr key={i} className="hover:bg-gray-50/50 transition-colors group">
                     <td className="py-4 px-6">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-[14px] font-bold text-blue-700 shrink-0">
                             {item.name.charAt(0)}
                           </div>
                           <div>
                             <div className="font-bold text-[14px] text-gray-900 leading-none mb-1">{item.name}</div>
                             <div className="text-[12px] font-medium text-gray-500">NIP: {item.id}</div>
                           </div>
                        </div>
                     </td>
                     <td className="py-4 px-6 text-[13px] font-semibold text-gray-700">
                        {item.role}
                     </td>
                     <td className="py-4 px-6 text-[13px] font-semibold text-gray-700">
                        {item.classes}
                     </td>
                     <td className="py-4 px-6 text-[13px] font-semibold text-gray-700">
                        {item.contact}
                     </td>
                     <td className="py-4 px-6 text-center">
                        <span className={`inline-flex py-1 px-2.5 border rounded-md text-[11px] font-bold uppercase tracking-wider ${
                          item.status === 'Aktif' 
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                            : 'bg-amber-50 border-amber-100 text-amber-600'
                        }`}>
                           {item.status}
                        </span>
                     </td>
                     <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button 
                             onClick={() => setCrudState({ open: true, mode: "edit", data: item })}
                             className="p-1.5 text-gray-400 hover:text-[#531FFF] hover:bg-[#531FFF]/10 rounded-md transition-colors" title="Edit">
                             <PenTool className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => setCrudState({ open: true, mode: "delete", data: item })}
                             className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Hapus">
                             <Trash2 className="w-4 h-4" />
                           </button>
                        </div>
                     </td>
                   </tr>
                 ))}
               </tbody>
            </table>
         </div>
         {/* Pagination mockup */}
         <div className="p-4 border-t border-gray-100 flex items-center justify-between text-[13px] font-medium text-gray-500 bg-gray-50/50 mt-auto">
            <div>Menampilkan 1 hingga 7 dari 86 guru</div>
            <div className="flex gap-1">
               <button className="px-3 py-1.5 border border-gray-200 bg-white text-gray-400 rounded-md cursor-not-allowed">Halaman Sebelumnya</button>
               <button className="px-3 py-1.5 bg-[#531FFF] text-white rounded-md font-bold shadow-sm">1</button>
               <button className="px-3 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-md transition-colors">2</button>
               <button className="px-3 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-md transition-colors">3</button>
               <span className="px-2 py-1.5 text-gray-400">...</span>
               <button className="px-3 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-md transition-colors">13</button>
               <button className="px-3 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-md transition-colors">Halaman Selanjutnya</button>
            </div>
         </div>
      </div>
    </div>
  );
}
