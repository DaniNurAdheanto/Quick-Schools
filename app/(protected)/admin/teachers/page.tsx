
"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, Plus, Search, Filter, MoreHorizontal, GraduationCap, ChevronDown, PenTool, Trash2, ArrowUp, Briefcase, Loader2, LayoutGrid, List
} from "lucide-react";
import { CrudSheet } from "@/components/layouts/crud-sheet";
import { db, auth } from "@/lib/firebase";
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";



export default function TeachersPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [crudState, setCrudState] = useState<{ open: boolean; mode: "create" | "edit" | "delete"; data?: any }>({
    open: false,
    mode: "create"
  });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(collection(db, "teachers"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const teachersData = snapshot.docs.map(doc => ({
            _firestoreId: doc.id,
            ...doc.data()
          }));
          setTeachers(teachersData);
          setLoading(false);
        }, (error) => {
          console.error("Error fetching teachers:", error);
          setLoading(false);
        });

        const qClasses = query(collection(db, "classes"));
        const unsubClasses = onSnapshot(qClasses, (snapshot) => {
          setClassesList(snapshot.docs.map(doc => ({ _firestoreId: doc.id, ...doc.data() })));
        });

        const qSubjects = query(collection(db, "subjects"));
        const unsubSubjects = onSnapshot(qSubjects, (snapshot) => {
          setSubjectsList(snapshot.docs.map(doc => ({ _firestoreId: doc.id, ...doc.data() })));
        });
        
        return () => {
          unsubscribe();
          unsubClasses();
          unsubSubjects();
        };
      } else {
        setTeachers([]);
        setClassesList([]);
        setSubjectsList([]);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const teacherFields = [
    { name: "name", label: "Nama Guru" },
    { name: "id", label: "NIP" },
    { 
      name: "role", 
      label: "Mata Pelajaran",
      type: "select",
      placeholder: "Pilih Mata Pelajaran",
      options: subjectsList.map(s => ({ label: s.name, value: s.name }))
    },

    { name: "contact", label: "Kontak" },
    { 
      name: "status", 
      label: "Status",
      type: "select",
      placeholder: "Pilih Status",
      options: [
        { label: "Aktif", value: "Aktif" },
        { label: "Cuti", value: "Cuti" },
        { label: "Nonaktif", value: "Nonaktif" }
      ]
    }
  ];

  const handleCrudSubmit = async (data: any) => {
    try {
      if (crudState.mode === "create") {
        await addDoc(collection(db, "teachers"), {
          id: data.id || `T${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
          name: data.name || "",
          role: data.role || "",
          classes: data.classes || "",
          contact: data.contact || "",
          status: data.status || "Aktif"
        });
      } else if (crudState.mode === "edit" && data._firestoreId) {
        await updateDoc(doc(db, "teachers", data._firestoreId), {
          id: data.id || "",
          name: data.name || "",
          role: data.role || "",
          classes: data.classes || "",
          contact: data.contact || "",
          status: data.status || "Aktif"
        });
      } else if (crudState.mode === "delete" && data._firestoreId) {
        await deleteDoc(doc(db, "teachers", data._firestoreId));
      }
    } catch (error) {
      console.error("Error saving teacher data:", error);
      alert("Gagal menyimpan data.");
    }
  };

  const totalTeachers = teachers.length;
  const activeTeachers = teachers.filter(t => t.status === "Aktif").length;
  const inactiveTeachers = teachers.filter(t => t.status !== "Aktif").length;
  const activePercentage = totalTeachers > 0 ? Math.round((activeTeachers / totalTeachers) * 100) : 0;
  const inactivePercentage = totalTeachers > 0 ? Math.round((inactiveTeachers / totalTeachers) * 100) : 0;

  return (
    <div className="p-8 pb-12 max-w-[1600px] mx-auto w-full h-full flex flex-col space-y-8">
      <CrudSheet 
        open={crudState.open} 
        onOpenChange={(open) => setCrudState(s => ({ ...s, open }))}
        mode={crudState.mode}
        entityName="Guru"
        fields={teacherFields}
        initialData={crudState.data}
        onSubmit={handleCrudSubmit}
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
                <span className="text-[28px] leading-none font-bold text-gray-900 tracking-tight">{totalTeachers}</span>
                <div className="flex flex-col items-end gap-0.5 mb-1">
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded flex items-center gap-0.5">
                    <ArrowUp className="w-2.5 h-2.5" /> 0
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
                <span className="text-[28px] leading-none font-bold text-gray-900 tracking-tight">{activeTeachers}</span>
                <div className="flex flex-col items-end gap-0.5 mb-1">
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded flex items-center gap-0.5">
                    {activePercentage}%
                  </span>
                  <span className="text-[8px] text-gray-400">dari total</span>
                </div>
              </div>
            </div>
          </div>
          <svg className="absolute bottom-0 left-0 w-full h-8 opacity-20" viewBox="0 0 100 20" preserveAspectRatio="none">
             <path d="M0,20 L15,10 L35,16 L50,5 L70,8 L85,2 L100,5 L100,20 Z" fill="url(#grad_aktif)" />
             <polyline points="0,10 15,10 35,16 50,5 70,8 85,2 100,5" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
                <span className="text-[28px] leading-none font-bold text-gray-900 tracking-tight">{inactiveTeachers}</span>
                <div className="flex flex-col items-end gap-0.5 mb-1">
                  <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1 rounded flex items-center gap-0.5">
                    {inactivePercentage}%
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
               <div className="flex items-center bg-gray-100 p-1 rounded-xl shrink-0 ml-2">
                 <button 
                   onClick={() => setViewMode("grid")}
                   className={`p-1.5 rounded-lg transition-colors ${viewMode === "grid" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-900"}`}
                 >
                   <LayoutGrid className="w-4 h-4" />
                 </button>
                 <button 
                   onClick={() => setViewMode("list")}
                   className={`p-1.5 rounded-lg transition-colors ${viewMode === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-900"}`}
                 >
                   <List className="w-4 h-4" />
                 </button>
               </div>
            </div>
         </div>

         {/* Content container */}
         <div className="overflow-y-auto min-h-[300px] p-4 custom-scrollbar flex-1 bg-gray-50/30">
           {loading ? (
             <div className="h-full flex flex-col items-center justify-center py-20 text-gray-500">
               <Loader2 className="w-8 h-8 animate-spin text-[#531FFF] mb-4" />
               <p className="text-sm font-medium">Memuat data guru...</p>
             </div>
           ) : teachers.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center py-20">
               <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                 <Users className="w-8 h-8 text-gray-300" />
               </div>
               <h3 className="text-gray-900 font-bold mb-1">Belum ada data guru</h3>
               <p className="text-gray-500 text-sm mb-4">Klik tambah guru untuk memasukkan data guru baru.</p>
               <button 
                 onClick={() => setCrudState({ open: true, mode: "create" })}
                 className="bg-[#531FFF] hover:bg-[#531FFF]/90 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
               >
                 Tambah Guru
               </button>
             </div>
           ) : viewMode === "grid" ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
               {teachers.map((item, i) => (
                 <div key={item._firestoreId || i} className="group bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all relative">
                   <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button 
                       onClick={() => setCrudState({ open: true, mode: "edit", data: item })}
                       className="p-1.5 bg-gray-50 text-gray-500 hover:text-[#531FFF] hover:bg-[#531FFF]/10 rounded-lg transition-colors"
                     >
                       <PenTool className="w-4 h-4" />
                     </button>
                     <button 
                       onClick={() => setCrudState({ open: true, mode: "delete", data: item })}
                       className="p-1.5 bg-gray-50 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                     >
                       <Trash2 className="w-4 h-4" />
                     </button>
                   </div>
                   
                   <div className="flex flex-col items-center text-center">
                     <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-[24px] font-bold text-blue-600 mb-3 border-2 border-white shadow-sm ring-1 ring-gray-100">
                       {item.name ? item.name.charAt(0) : "G"}
                     </div>
                     <h3 className="font-bold text-gray-900 text-[15px] mb-1">{item.name}</h3>
                     <p className="text-[#531FFF] text-[13px] font-bold mb-1">{item.role}</p>
                     <p className="text-gray-500 text-[12px] font-medium mb-3">NIP: {item.id}</p>
                     
                     <span className={`inline-flex py-1 px-3 border rounded-md text-[11px] font-bold uppercase tracking-wider mb-4 ${
                       item.status === 'Aktif' 
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                          : 'bg-amber-50 border-amber-100 text-amber-600'
                     }`}>
                        {item.status || "Aktif"}
                     </span>
                     
                     <div className="w-full pt-4 border-t border-gray-100 flex flex-col gap-2 text-left">

                       <div className="flex justify-between items-center text-[12px]">
                         <span className="text-gray-500">Kontak:</span>
                         <span className="font-semibold text-gray-900">{item.contact || "-"}</span>
                       </div>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
           ) : (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-gray-50/50 border-b border-gray-100">
                     <th className="py-3 px-6 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Nama Guru</th>
                     <th className="py-3 px-6 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Mata Pelajaran</th>

                     <th className="py-3 px-6 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Kontak</th>
                     <th className="py-3 px-6 text-[12px] font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
                     <th className="py-3 px-6 text-[12px] font-bold text-gray-500 uppercase tracking-wider text-center">Aksi</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                   {teachers.map((item, i) => (
                     <tr key={item._firestoreId || i} className="hover:bg-gray-50/50 transition-colors group">
                       <td className="py-4 px-6">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-[14px] font-bold text-blue-700 shrink-0">
                               {item.name ? item.name.charAt(0) : "G"}
                             </div>
                             <div>
                               <div className="font-bold text-[14px] text-gray-900 leading-none mb-1">{item.name}</div>
                               <div className="text-[12px] font-medium text-gray-500">NIP: {item.id}</div>
                             </div>
                          </div>
                       </td>
                       <td className="py-4 px-6 text-[13px] font-semibold text-gray-700">
                          {item.role || "-"}
                       </td>

                       <td className="py-4 px-6 text-[13px] font-semibold text-gray-700">
                          {item.contact || "-"}
                       </td>
                       <td className="py-4 px-6 text-center">
                          <span className={`inline-flex py-1 px-2.5 border rounded-md text-[11px] font-bold uppercase tracking-wider ${
                            item.status === 'Aktif' 
                               ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                               : 'bg-amber-50 border-amber-100 text-amber-600'
                          }`}>
                             {item.status || "Aktif"}
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
           )}
         </div>

         {/* Pagination mockup */}
         {teachers.length > 0 && (
           <div className="p-4 border-t border-gray-100 flex items-center justify-between text-[13px] font-medium text-gray-500 bg-white mt-auto">
              <div>Menampilkan 1 hingga {teachers.length} dari {teachers.length} guru</div>
              <div className="flex gap-1">
                 <button className="px-3 py-1.5 border border-gray-200 bg-white text-gray-400 rounded-md cursor-not-allowed">Halaman Sebelumnya</button>
                 <button className="px-3 py-1.5 bg-[#531FFF] text-white rounded-md font-bold shadow-sm">1</button>
                 <button className="px-3 py-1.5 border border-gray-200 bg-white text-gray-400 rounded-md cursor-not-allowed">Halaman Selanjutnya</button>
              </div>
           </div>
         )}
      </div>
    </div>
  );
}
