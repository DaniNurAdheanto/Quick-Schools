
"use client";

import React, { useState, useEffect } from "react";
import { 
  BookOpen, Plus, Search, Filter, PenTool, Trash2, ArrowUp, Loader2
} from "lucide-react";
import { CrudSheet } from "@/components/layouts/crud-sheet";
import { db, auth } from "@/lib/firebase";
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";



export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [crudState, setCrudState] = useState<{ open: boolean; mode: "create" | "edit" | "delete"; data?: any }>({
    open: false,
    mode: "create"
  });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(collection(db, "subjects"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const subjectsData = snapshot.docs.map(doc => ({
            _firestoreId: doc.id,
            ...doc.data()
          }));
          setSubjects(subjectsData);
          setLoading(false);
        }, (error) => {
          console.error("Error fetching subjects:", error);
          setLoading(false);
        });
        
        return () => unsubscribe();
      } else {
        setSubjects([]);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const subjectFields = [
    { name: "code", label: "Kode Mapel", placeholder: "Contoh: MAT, IPA, BHS" },
    { name: "name", label: "Nama Mata Pelajaran", placeholder: "Contoh: Matematika" },
    { name: "category", label: "Kategori", type: "select", options: [
      { label: "Wajib", value: "Wajib" },
      { label: "Peminatan", value: "Peminatan" },
      { label: "Muatan Lokal", value: "Muatan Lokal" }
    ]},
    { name: "status", label: "Status", type: "select", options: [
      { label: "Aktif", value: "Aktif" },
      { label: "Nonaktif", value: "Nonaktif" }
    ]}
  ];

  const handleCrudSubmit = async (data: any) => {
    try {
      if (crudState.mode === "create") {
        await addDoc(collection(db, "subjects"), {
          code: data.code || "",
          name: data.name || "",
          category: data.category || "Wajib",
          status: data.status || "Aktif"
        });
      } else if (crudState.mode === "edit" && data._firestoreId) {
        await updateDoc(doc(db, "subjects", data._firestoreId), {
          code: data.code || "",
          name: data.name || "",
          category: data.category || "Wajib",
          status: data.status || "Aktif"
        });
      } else if (crudState.mode === "delete" && data._firestoreId) {
        await deleteDoc(doc(db, "subjects", data._firestoreId));
      }
    } catch (error) {
      console.error("Error saving subject data:", error);
      alert("Gagal menyimpan data.");
    }
  };

  const activeSubjects = subjects.filter(s => s.status === "Aktif").length;

  return (
    <div className="p-8 pb-12 max-w-[1600px] mx-auto w-full h-full flex flex-col space-y-8">
      <CrudSheet 
        open={crudState.open} 
        onOpenChange={(open) => setCrudState(s => ({ ...s, open }))}
        mode={crudState.mode}
        entityName="Mata Pelajaran"
        fields={subjectFields}
        initialData={crudState.data}
        onSubmit={handleCrudSubmit}
      />
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Mata Pelajaran</h1>
          <p className="text-[13px] text-gray-500 mt-1 font-medium">Kelola daftar mata pelajaran yang diajarkan.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setCrudState({ open: true, mode: "create" })}
            className="flex items-center gap-2 px-4 py-2 bg-[#531FFF] text-white hover:bg-[#4314E5] rounded-xl text-[13px] font-bold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah Mapel
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] relative overflow-hidden flex flex-col justify-between h-[130px]">
          <div className="flex gap-4 z-10">
            <div className="w-10 h-10 rounded-full bg-[#531FFF]/10 flex items-center justify-center shrink-0">
               <BookOpen className="w-5 h-5 text-[#531FFF]" />
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-gray-500 mb-0.5">Total Mapel</p>
              <div className="flex items-end gap-2 justify-between w-full">
                <span className="text-[28px] leading-none font-bold text-gray-900 tracking-tight">{subjects.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] relative overflow-hidden flex flex-col justify-between h-[130px]">
          <div className="flex gap-4 z-10">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
               <BookOpen className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-gray-500 mb-0.5">Mapel Aktif</p>
              <div className="flex items-end gap-2 justify-between w-full">
                <span className="text-[28px] leading-none font-bold text-gray-900 tracking-tight">{activeSubjects}</span>
              </div>
            </div>
          </div>
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
                 placeholder="Cari kode atau nama mapel..."
                 className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF] focus:border-transparent transition-all"
               />
            </div>
         </div>

         {/* Content container */}
         <div className="overflow-y-auto min-h-[300px] flex-1">
           {loading ? (
             <div className="h-full flex flex-col items-center justify-center py-20 text-gray-500">
               <Loader2 className="w-8 h-8 animate-spin text-[#531FFF] mb-4" />
               <p className="text-sm font-medium">Memuat data mapel...</p>
             </div>
           ) : subjects.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center py-20">
               <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                 <BookOpen className="w-8 h-8 text-gray-300" />
               </div>
               <h3 className="text-gray-900 font-bold mb-1">Belum ada data mata pelajaran</h3>
               <p className="text-gray-500 text-sm mb-4">Klik tambah mapel untuk memasukkan data mapel baru.</p>
               <button 
                 onClick={() => setCrudState({ open: true, mode: "create" })}
                 className="bg-[#531FFF] hover:bg-[#531FFF]/90 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
               >
                 Tambah Mapel
               </button>
             </div>
           ) : (
            <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-gray-50/50 border-b border-gray-100">
                   <th className="py-3 px-6 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Kode</th>
                   <th className="py-3 px-6 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Nama Mata Pelajaran</th>
                   <th className="py-3 px-6 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Kategori</th>
                   <th className="py-3 px-6 text-[12px] font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
                   <th className="py-3 px-6 text-[12px] font-bold text-gray-500 uppercase tracking-wider text-center">Aksi</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                 {subjects.map((item, i) => (
                   <tr key={item._firestoreId || i} className="hover:bg-gray-50/50 transition-colors group">
                     <td className="py-4 px-6 text-[13px] font-bold text-gray-700">
                        {item.code || "-"}
                     </td>
                     <td className="py-4 px-6 text-[14px] font-bold text-gray-900">
                        {item.name || "-"}
                     </td>
                     <td className="py-4 px-6 text-[13px] font-semibold text-gray-700">
                        {item.category || "-"}
                     </td>
                     <td className="py-4 px-6 text-center">
                        <span className={`inline-flex py-1 px-2.5 border rounded-md text-[11px] font-bold uppercase tracking-wider ${
                          item.status === 'Aktif' 
                             ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                             : 'bg-gray-50 border-gray-200 text-gray-500'
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
           )}
         </div>
      </div>
    </div>
  );
}
