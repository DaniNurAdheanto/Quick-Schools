
"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, Plus, Search, Filter, MoreHorizontal, GraduationCap, ChevronDown, PenTool, Trash2, ArrowUp, Loader2
} from "lucide-react";
import { CrudSheet } from "@/components/layouts/crud-sheet";
import { db, auth } from "@/lib/firebase";
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";



export default function ClassesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [crudState, setCrudState] = useState<{ open: boolean; mode: "create" | "edit" | "delete"; data?: any }>({
    open: false,
    mode: "create"
  });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(collection(db, "classes"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
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
          setTeachers(snapshot.docs.map(doc => ({
            _firestoreId: doc.id,
            ...doc.data()
          })));
        });
        
        return () => {
          unsubscribe();
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

  const classFields = [
    { name: "name", label: "Nama Kelas", placeholder: "Contoh: 10A, 11 MIPA 1" },
    { 
      name: "level", 
      label: "Tingkat",
      type: "select",
      placeholder: "Pilih Tingkat",
      options: [
        { label: "Kelas 10", value: "Kelas 10" },
        { label: "Kelas 11", value: "Kelas 11" },
        { label: "Kelas 12", value: "Kelas 12" }
      ]
    },
    { 
      name: "major", 
      label: "Jurusan",
      type: "select",
      placeholder: "Pilih Jurusan",
      options: [
        { label: "IPA", value: "IPA" },
        { label: "IPS", value: "IPS" },
        { label: "Bahasa", value: "Bahasa" },
        { label: "Kejuruan", value: "Kejuruan" }
      ]
    },
    { 
      name: "homeroom", 
      label: "Wali Kelas",
      type: "select",
      placeholder: "Pilih Wali Kelas (Opsional)",
      options: [
        { label: "-- Tanpa Wali Kelas --", value: "" },
        ...teachers.map(t => ({ label: t.name, value: t.name }))
      ]
    },
    { name: "students", label: "Kapasitas Siswa Saat Ini (Opsional)", type: "number", placeholder: "0" },
    {
      name: "status",
      label: "Status",
      type: "select",
      placeholder: "Pilih Status",
      options: [
        { label: "Aktif", value: "Aktif" },
        { label: "Nonaktif", value: "Nonaktif" }
      ]
    }
  ];

  const handleCrudSubmit = async (data: any) => {
    try {
      if (crudState.mode === "create") {
        await addDoc(collection(db, "classes"), {
          id: data.id || `C${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
          name: data.name || "",
          level: data.level || "",
          major: data.major || "",
          homeroom: data.homeroom || "",
          students: parseInt(data.students) || 0,
          status: data.status || "Aktif"
        });
      } else if (crudState.mode === "edit" && data._firestoreId) {
        await updateDoc(doc(db, "classes", data._firestoreId), {
          name: data.name || "",
          level: data.level || "",
          major: data.major || "",
          homeroom: data.homeroom || "",
          students: parseInt(data.students) || 0,
          status: data.status || "Aktif"
        });
      } else if (crudState.mode === "delete" && data._firestoreId) {
        await deleteDoc(doc(db, "classes", data._firestoreId));
      }
    } catch (error) {
      console.error("Error saving class data:", error);
      alert("Gagal menyimpan data.");
    }
  };

  const totalClasses = classes.length;
  const classesWithHomeroom = classes.filter(c => c.homeroom).length;
  const avgCapacity = totalClasses > 0 ? Math.round(classes.reduce((acc, c) => acc + (Number(c.students) || 0), 0) / totalClasses) : 0;

  return (
    <div className="p-8 pb-12 max-w-[1600px] mx-auto w-full h-full flex flex-col space-y-8">
      <CrudSheet 
        open={crudState.open} 
        onOpenChange={(open) => setCrudState(s => ({ ...s, open }))}
        mode={crudState.mode}
        entityName="Kelas"
        fields={classFields}
        initialData={crudState.data}
        onSubmit={handleCrudSubmit}
      />
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Manajemen Kelas</h1>
          <p className="text-[13px] text-gray-500 mt-1 font-medium">Kelola daftar kelas, kapasitas, dan wali kelas.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 rounded-xl text-[13px] font-bold shadow-sm transition-colors">
            <Filter className="w-4 h-4" /> Filter
          </button>
          <button 
            onClick={() => setCrudState({ open: true, mode: "create" })}
            className="flex items-center gap-2 px-4 py-2 bg-[#531FFF] text-white hover:bg-[#4314E5] rounded-xl text-[13px] font-bold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah Kelas
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Kelas */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] relative overflow-hidden flex flex-col justify-between h-[130px]">
          <div className="flex gap-4 z-10">
            <div className="w-10 h-10 rounded-full bg-[#531FFF]/10 flex items-center justify-center shrink-0">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M4 22H20C21.1 22 22 21.1 22 20V6C22 4.9 21.1 4 20 4H14L12 2H4C2.9 2 2 2.9 2 4V20C2 21.1 2.9 22 4 22Z" fill="#531FFF" fillOpacity="0.8"/>
               </svg>
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-gray-500 mb-0.5">Total Kelas</p>
              <div className="flex items-end gap-2 justify-between w-full">
                <span className="text-[28px] leading-none font-bold text-gray-900 tracking-tight">{totalClasses}</span>
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
             <path d="M0,20 L10,12 L30,15 L60,4 L80,9 L100,5 L100,20 Z" fill="url(#grad_kelas)" />
             <polyline points="0,12 10,12 30,15 60,4 80,9 100,5" fill="none" stroke="#531FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
             <defs>
               <linearGradient id="grad_kelas" x1="0%" y1="0%" x2="0%" y2="100%">
                 <stop offset="0%" stopColor="#531FFF" stopOpacity="0.5" />
                 <stop offset="100%" stopColor="#531FFF" stopOpacity="0" />
               </linearGradient>
             </defs>
          </svg>
        </div>

        {/* Wali Kelas Terisi */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] relative overflow-hidden flex flex-col justify-between h-[130px]">
          <div className="flex gap-4 z-10">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-gray-500 mb-0.5">Wali Kelas Terisi</p>
              <div className="flex items-end gap-2 justify-between w-full">
                <span className="text-[28px] leading-none font-bold text-gray-900 tracking-tight">{classesWithHomeroom}</span>
                <div className="flex flex-col items-end gap-0.5 mb-1">
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded flex items-center gap-0.5">
                    100%
                  </span>
                  <span className="text-[8px] text-gray-400">terisi</span>
                </div>
              </div>
            </div>
          </div>
          <svg className="absolute bottom-0 left-0 w-full h-8 opacity-20" viewBox="0 0 100 20" preserveAspectRatio="none">
             <path d="M0,20 L15,10 L35,16 L50,5 L70,8 L85,2 L100,5 L100,20 Z" fill="url(#grad_wali)" />
             <polyline points="0,10 15,10 35,16 50,5 70,8 85,2 100,5" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
             <defs>
               <linearGradient id="grad_wali" x1="0%" y1="0%" x2="0%" y2="100%">
                 <stop offset="0%" stopColor="#10B981" stopOpacity="0.5" />
                 <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
               </linearGradient>
             </defs>
          </svg>
        </div>

        {/* Rata-rata Kapasitas */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] relative overflow-hidden flex flex-col justify-between h-[130px]">
          <div className="flex gap-4 z-10">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-gray-500 mb-0.5">Rata-rata Kapasitas</p>
              <div className="flex items-end gap-2 justify-between w-full">
                <span className="text-[28px] leading-none font-bold text-gray-900 tracking-tight">{avgCapacity} <span className="text-lg text-gray-400 font-medium tracking-normal">/36</span></span>
                <div className="flex flex-col items-end gap-0.5 mb-1">
                  <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1 rounded flex items-center gap-0.5">
                    {totalClasses > 0 ? Math.round((avgCapacity/36)*100) : 0}%
                  </span>
                  <span className="text-[8px] text-gray-400">dari total</span>
                </div>
              </div>
            </div>
          </div>
          <svg className="absolute bottom-0 left-0 w-full h-8 opacity-20" viewBox="0 0 100 20" preserveAspectRatio="none">
             <path d="M0,20 L20,15 L40,8 L70,12 L90,2 L100,4 L100,20 Z" fill="url(#grad_capacity)" />
             <polyline points="0,15 20,15 40,8 70,12 90,2 100,4" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
             <defs>
               <linearGradient id="grad_capacity" x1="0%" y1="0%" x2="0%" y2="100%">
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
                 placeholder="Cari kelas, tingkat, atau wali kelas..."
                 className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF] focus:border-transparent transition-all"
               />
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
               <button className="flex items-center gap-2 px-3 py-2 text-[13px] font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 w-full sm:w-auto justify-center">
                 Tingkat <ChevronDown className="w-4 h-4" />
               </button>
               <button className="flex items-center gap-2 px-3 py-2 text-[13px] font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 w-full sm:w-auto justify-center">
                 Jurusan <ChevronDown className="w-4 h-4" />
               </button>
            </div>
         </div>

         {/* Table container for scrolling */}
         <div className="overflow-x-auto min-h-[300px]">
           {loading ? (
             <div className="h-full flex flex-col items-center justify-center py-20 text-gray-500">
               <Loader2 className="w-8 h-8 animate-spin text-[#531FFF] mb-4" />
               <p className="text-sm font-medium">Memuat data kelas...</p>
             </div>
           ) : classes.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center py-20">
               <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                 <Users className="w-8 h-8 text-gray-300" />
               </div>
               <h3 className="text-gray-900 font-bold mb-1">Belum ada data kelas</h3>
               <p className="text-gray-500 text-sm mb-4">Klik tambah kelas untuk memasukkan data kelas baru.</p>
               <button 
                 onClick={() => setCrudState({ open: true, mode: "create" })}
                 className="bg-[#531FFF] hover:bg-[#531FFF]/90 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
               >
                 Tambah Kelas
               </button>
             </div>
           ) : (
            <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-gray-50/50 border-b border-gray-100">
                   <th className="py-3 px-6 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Nama Kelas</th>
                   <th className="py-3 px-6 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Tingkat</th>
                   <th className="py-3 px-6 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Jurusan</th>
                   <th className="py-3 px-6 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Wali Kelas</th>
                   <th className="py-3 px-6 text-[12px] font-bold text-gray-500 uppercase tracking-wider text-center">Total Siswa</th>
                   <th className="py-3 px-6 text-[12px] font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
                   <th className="py-3 px-6 text-[12px] font-bold text-gray-500 uppercase tracking-wider text-center">Aksi</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                 {classes.map((item, i) => (
                   <tr key={item._firestoreId || i} className="hover:bg-gray-50/50 transition-colors group">
                     <td className="py-4 px-6">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-lg bg-[#531FFF]/10 flex items-center justify-center">
                             <Users className="w-5 h-5 text-[#531FFF]" />
                           </div>
                           <div>
                             <div className="font-bold text-[14px] text-gray-900 leading-none mb-1">{item.name}</div>
                             <div className="text-[12px] font-medium text-gray-500">ID: {item.id}</div>
                           </div>
                        </div>
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
                             <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-[10px] font-bold text-orange-700">
                               {item.homeroom.charAt(0)}
                             </div>
                             <span className="text-[13px] font-semibold text-gray-900">{item.homeroom}</span>
                          </div>
                        ) : (
                          <span className="text-[13px] font-medium text-gray-400">Belum diisi</span>
                        )}
                     </td>
                     <td className="py-4 px-6 text-center">
                        <span className="inline-flex py-1 px-3 bg-gray-100 text-gray-700 rounded-lg text-[13px] font-bold">
                           {item.students || 0} / 36
                        </span>
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

         {/* Pagination mockup */}
         {classes.length > 0 && (
           <div className="p-4 border-t border-gray-100 flex items-center justify-between text-[13px] font-medium text-gray-500 bg-gray-50/50 mt-auto">
              <div>Menampilkan 1 hingga {classes.length} dari {classes.length} kelas</div>
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
