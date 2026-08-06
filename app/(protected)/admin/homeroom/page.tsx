
"use client";

import React, { useState, useEffect } from "react";
import { 
  GraduationCap, Search, PenTool, Trash2, Loader2, Users
} from "lucide-react";
import { CrudSheet } from "@/components/layouts/crud-sheet";
import { db, auth } from "@/lib/firebase";
import { collection, query, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";



export default function HomeroomPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [crudState, setCrudState] = useState<{ open: boolean; mode: "edit" | "create" | "delete"; data?: any }>({
    open: false,
    mode: "edit"
  });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const qClasses = query(collection(db, "classes"));
        const unsubClasses = onSnapshot(qClasses, (snapshot) => {
          const classesData = snapshot.docs.map(doc => ({
            _firestoreId: doc.id,
            ...doc.data()
          }));
          setClasses(classesData);
          setLoading(false);
        }, (error) => {
          console.error("Error fetching classes:", error);
          setLoading(false);
        });

        const qTeachers = query(collection(db, "teachers"));
        const unsubTeachers = onSnapshot(qTeachers, (snapshot) => {
          const teachersData = snapshot.docs.map(doc => ({
            _firestoreId: doc.id,
            ...doc.data()
          }));
          setTeachers(teachersData);
        }, (error) => {
          console.error("Error fetching teachers:", error);
        });
        
        return () => {
          unsubClasses();
          unsubTeachers();
        };
      } else {
        setClasses([]);
        setTeachers([]);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const editHomeroomFields = [
    { name: "name", label: "Nama Kelas", disabled: true },
    { 
      name: "homeroom", 
      label: "Pilih Wali Kelas", 
      type: "select", 
      placeholder: "Pilih Guru",
      options: [
        { label: "-- Hapus Wali Kelas --", value: "" },
        ...teachers.map(t => ({ label: t.name, value: t.name }))
      ]
    }
  ];

  const handleCrudSubmit = async (data: any) => {
    try {
      if (crudState.mode === "edit" && data._firestoreId) {
        await updateDoc(doc(db, "classes", data._firestoreId), {
          homeroom: data.homeroom || "",
        });
      }
    } catch (error) {
      console.error("Error saving homeroom data:", error);
      alert("Gagal menyimpan data wali kelas.");
    }
  };

  const filledHomerooms = classes.filter(c => c.homeroom).length;
  const emptyHomerooms = classes.length - filledHomerooms;

  return (
    <div className="p-8 pb-12 max-w-[1600px] mx-auto w-full h-full flex flex-col space-y-8">
      <CrudSheet 
        open={crudState.open} 
        onOpenChange={(open) => setCrudState(s => ({ ...s, open }))}
        mode={crudState.mode}
        entityName="Wali Kelas"
        fields={editHomeroomFields}
        initialData={crudState.data}
        onSubmit={handleCrudSubmit}
      />
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Wali Kelas</h1>
          <p className="text-[13px] text-gray-500 mt-1 font-medium">Penugasan guru sebagai wali kelas untuk setiap kelas.</p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] relative overflow-hidden flex flex-col justify-between h-[130px]">
          <div className="flex gap-4 z-10">
            <div className="w-10 h-10 rounded-full bg-[#531FFF]/10 flex items-center justify-center shrink-0">
               <GraduationCap className="w-5 h-5 text-[#531FFF]" />
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-gray-500 mb-0.5">Total Kelas</p>
              <div className="flex items-end gap-2 justify-between w-full">
                <span className="text-[28px] leading-none font-bold text-gray-900 tracking-tight">{classes.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] relative overflow-hidden flex flex-col justify-between h-[130px]">
          <div className="flex gap-4 z-10">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
               <Users className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-gray-500 mb-0.5">Terisi Wali Kelas</p>
              <div className="flex items-end gap-2 justify-between w-full">
                <span className="text-[28px] leading-none font-bold text-gray-900 tracking-tight">{filledHomerooms}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] relative overflow-hidden flex flex-col justify-between h-[130px]">
          <div className="flex gap-4 z-10">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
               <Search className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-gray-500 mb-0.5">Belum Ada Wali Kelas</p>
              <div className="flex items-end gap-2 justify-between w-full">
                <span className="text-[28px] leading-none font-bold text-gray-900 tracking-tight">{emptyHomerooms}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex-1 flex flex-col overflow-hidden">
         {/* Content container */}
         <div className="overflow-y-auto min-h-[300px] flex-1">
           {loading ? (
             <div className="h-full flex flex-col items-center justify-center py-20 text-gray-500">
               <Loader2 className="w-8 h-8 animate-spin text-[#531FFF] mb-4" />
               <p className="text-sm font-medium">Memuat data...</p>
             </div>
           ) : classes.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center py-20">
               <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                 <GraduationCap className="w-8 h-8 text-gray-300" />
               </div>
               <h3 className="text-gray-900 font-bold mb-1">Belum ada kelas</h3>
               <p className="text-gray-500 text-sm mb-4">Silakan tambah kelas terlebih dahulu di menu Kelas.</p>
             </div>
           ) : (
            <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-gray-50/50 border-b border-gray-100">
                   <th className="py-3 px-6 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Kelas</th>
                   <th className="py-3 px-6 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Tingkat</th>
                   <th className="py-3 px-6 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Jurusan</th>
                   <th className="py-3 px-6 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Wali Kelas</th>
                   <th className="py-3 px-6 text-[12px] font-bold text-gray-500 uppercase tracking-wider text-center">Status Kelas</th>
                   <th className="py-3 px-6 text-[12px] font-bold text-gray-500 uppercase tracking-wider text-center">Aksi</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                 {classes.map((item, i) => (
                   <tr key={item._firestoreId || i} className="hover:bg-gray-50/50 transition-colors group">
                     <td className="py-4 px-6 text-[14px] font-bold text-gray-900">
                        {item.name || "-"}
                     </td>
                     <td className="py-4 px-6 text-[13px] font-semibold text-gray-700">
                        {item.level || "-"}
                     </td>
                     <td className="py-4 px-6 text-[13px] font-semibold text-gray-700">
                        {item.major || "-"}
                     </td>
                     <td className="py-4 px-6">
                        {item.homeroom ? (
                          <div className="flex items-center gap-2">
                             <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-[12px] font-bold text-orange-700">
                               {item.homeroom.charAt(0)}
                             </div>
                             <span className="text-[13px] font-bold text-gray-900">{item.homeroom}</span>
                          </div>
                        ) : (
                          <span className="inline-flex py-1 px-2.5 bg-red-50 text-red-600 rounded-md text-[11px] font-bold">Belum Diisi</span>
                        )}
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
                             className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-[#531FFF] bg-[#531FFF]/10 hover:bg-[#531FFF]/20 rounded-md transition-colors">
                             <PenTool className="w-3.5 h-3.5" /> Set Wali Kelas
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
