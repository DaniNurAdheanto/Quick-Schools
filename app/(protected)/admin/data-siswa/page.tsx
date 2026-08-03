"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { 
  UserPlus, 
  User,
  Download, 
  MoreHorizontal, 
  TrendingUp, 
  Search, 
  ChevronDown, 
  LayoutGrid, 
  List,
  Edit2,
  Trash2,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CrudSheet } from "@/components/layouts/crud-sheet";
import { db, auth, storage } from "@/lib/firebase";
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function DataSiswaPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [crudState, setCrudState] = useState<{ open: boolean; mode: "create" | "edit" | "delete"; data?: any }>({
    open: false,
    mode: "create"
  });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const qStudents = query(collection(db, "students"));
        const unsubscribeStudents = onSnapshot(qStudents, (snapshot) => {
          const studentsData = snapshot.docs.map(doc => ({
            _firestoreId: doc.id,
            ...doc.data()
          }));
          setStudents(studentsData);
          setLoading(false);
        }, (error) => {
          console.error("Error fetching students:", error);
          setLoading(false);
        });

        const qClasses = query(collection(db, "classes"));
        const unsubscribeClasses = onSnapshot(qClasses, (snapshot) => {
          const classesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setClasses(classesData);
        }, (error) => {
          console.error("Error fetching classes:", error);
        });
        
        return () => {
          unsubscribeStudents();
          unsubscribeClasses();
        };
      } else {
        setStudents([]);
        setClasses([]);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const studentFields = [
    { name: "name", label: "Nama Lengkap" },
    { name: "id", label: "NIS / NISN" },
    { 
      name: "classId", 
      label: "Kelas",
      type: "select",
      placeholder: "Pilih Kelas",
      options: classes.map(c => ({ label: c.name || c.id, value: c.name || c.id }))
    },
    { 
      name: "status", 
      label: "Status Siswa",
      type: "select",
      placeholder: "Pilih Status",
      options: [
        { label: "Aktif", value: "Aktif" },
        { label: "Nonaktif", value: "Nonaktif" }
      ]
    },
    {
      name: "pasFoto",
      label: "Pas Foto",
      type: "file",
    }
  ];

  const handleCrudSubmit = async (data: any) => {
    try {
      let imageUrl = data.imageUrl || `https://images.unsplash.com/photo-${[
        "1539571696357-5a69c17a67c6",
        "1517841905240-472988babdf9",
        "1506794778202-cad84cf45f1d",
        "1534528741775-53994a69daeb"
      ][Math.floor(Math.random() * 4)]}?q=80&w=250&auto=format&fit=crop`;

      if (data.pasFoto instanceof File) {
        const fileRef = ref(storage, `students/${Date.now()}_${data.pasFoto.name}`);
        const snapshot = await uploadBytes(fileRef, data.pasFoto);
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      if (crudState.mode === "create") {
        await addDoc(collection(db, "students"), {
          id: data.id || "",
          name: data.name || "",
          classId: data.classId || "",
          status: data.status || "Aktif",
          imageUrl: imageUrl
        });
      } else if (crudState.mode === "edit" && data._firestoreId) {
        await updateDoc(doc(db, "students", data._firestoreId), {
          id: data.id || "",
          name: data.name || "",
          classId: data.classId || "",
          status: data.status || "Aktif",
          imageUrl: imageUrl
        });
      } else if (crudState.mode === "delete" && data._firestoreId) {
        await deleteDoc(doc(db, "students", data._firestoreId));
      }
    } catch (error) {
      console.error("Error saving student data:", error);
      alert("Gagal menyimpan data.");
    }
  };

  const dynamicStats = [
    { label: "Total Siswa", value: students.length.toString(), trend: "+ 0%", isPositive: true },
    { label: "Siswa Aktif", value: students.filter(s => s.status === "Aktif").length.toString(), trend: "+ 0%", isPositive: true },
    { label: "Siswa Baru", value: "0", trend: "+ 0%", isPositive: true },
    { label: "Pertumbuhan Siswa", value: "0", trend: "+ 0%", isPositive: true },
  ];

  return (
    <div className="p-8 pb-12 max-w-[1600px] mx-auto w-full h-full">
      <CrudSheet 
        open={crudState.open} 
        onOpenChange={(open) => setCrudState(s => ({ ...s, open }))}
        mode={crudState.mode}
        entityName="Data Siswa"
        fields={studentFields}
        initialData={crudState.data}
        onSubmit={handleCrudSubmit}
      />
      <div className="bg-white rounded-2xl shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] border border-gray-100 p-8 space-y-8">
        
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#531FFF]/10 flex items-center justify-center text-[#531FFF]">
              <User className="w-5 h-5 fill-current" />
            </div>
            <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Data Siswa</h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setCrudState({ open: true, mode: "create" })}
              className="flex items-center justify-center gap-2 bg-[#531FFF] hover:bg-[#531FFF]/90 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm"
            >
              <span className="text-lg leading-none">+</span>
              Tambah Data Siswa
            </button>
            <button className="flex items-center justify-center gap-2 bg-[#531FFF]/5 hover:bg-[#531FFF]/10 text-[#531FFF] px-5 py-2.5 rounded-lg text-sm font-semibold transition-all border border-[#531FFF]/10">
              <Download className="w-4 h-4" />
              Download CSV
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {dynamicStats.map((stat, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] flex flex-col justify-between h-[150px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#531FFF]/5 flex items-center justify-center text-[#531FFF]">
                    <User className="w-4 h-4 fill-current opacity-80" />
                  </div>
                  <span className="text-[13px] font-semibold text-gray-900">{stat.label}</span>
                </div>
                <button className="text-gray-400 hover:text-gray-600">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex items-end justify-between">
                <span className="text-[32px] font-bold text-gray-900 tracking-tight leading-none">{stat.value}</span>
                <div className="flex items-center gap-1.5 text-emerald-500 text-[11px] font-bold pb-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{stat.trend}</span>
                  <span className="text-gray-400 font-medium ml-0.5">vs last month</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
          <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search Siswa" 
                className="pl-9 pr-4 py-2 w-[240px] bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
              />
            </div>
            <div className="h-6 w-px bg-gray-200 shrink-0 mx-1" />
            {["Kelas", "Status Siswa", "Tahun Ajaran", "Jurusan"].map((filter) => (
              <button key={filter} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 whitespace-nowrap">
                {filter}
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
            ))}
          </div>

          <div className="flex items-center bg-gray-100 p-1 rounded-xl shrink-0">
            <button 
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-1.5 rounded-lg transition-colors", 
                viewMode === "grid" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-900"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode("list")}
              className={cn(
                "p-1.5 rounded-lg transition-colors", 
                viewMode === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-900"
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin text-[#531FFF]" />
            <p className="text-sm font-medium">Memuat data siswa...</p>
          </div>
        ) : (
          <>
            {/* Grid View */}
            {viewMode === "grid" && students.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                {students.map((student, i) => (
                  <div key={student._firestoreId || i} className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col border border-gray-100">
                    {/* Active Badge */}
                    <div className="absolute top-3 left-3 z-20 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setCrudState({ open: true, mode: "edit", data: student })}
                        className="p-1.5 bg-white/90 backdrop-blur-sm rounded-lg text-gray-700 hover:text-[#531FFF] shadow-sm transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setCrudState({ open: true, mode: "delete", data: student })}
                        className="p-1.5 bg-white/90 backdrop-blur-sm rounded-lg text-gray-700 hover:text-red-600 shadow-sm transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="absolute top-3 right-3 z-10 bg-[#E8F5E9] px-2.5 py-1 rounded-md text-[10px] font-bold text-emerald-600 shadow-sm uppercase tracking-wide border border-emerald-100/50">
                      {student.status || "Aktif"}
                    </div>

                    <div className="aspect-[3/4] relative w-full bg-gray-100 shrink-0">
                      <Image 
                        src={student.imageUrl || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=250&auto=format&fit=crop"} 
                        alt={student.name || "Student"}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      
                      {/* Text Content Overlay */}
                      <div className="absolute inset-x-0 bottom-0 top-1/2 flex flex-col justify-end">
                        {/* Subtle white fade overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/50 to-transparent" />
                        
                        {/* Frosted glass blur effect with gradient mask to fade smoothly */}
                        <div className="absolute inset-0 backdrop-blur-[12px] [mask-image:linear-gradient(to_top,white_50%,transparent_100%)]" />
                        
                        {/* Text Content */}
                        <div className="relative p-4 flex flex-col z-10 text-left">
                          <h3 className="font-bold text-[14px] leading-tight text-gray-900 truncate mb-1">{student.name}</h3>
                          <div className="flex flex-col text-[12px] text-gray-700 space-y-0.5 mt-0.5">
                            <span className="font-medium">{student.id}</span>
                            <span className="font-bold text-gray-900">{student.classId}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {viewMode === "grid" && students.length === 0 && (
              <div className="py-20 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <User className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-gray-900 font-bold mb-1">Belum ada data siswa</h3>
                <p className="text-gray-500 text-sm mb-4">Klik tambah data untuk memasukkan data siswa baru.</p>
                <button 
                  onClick={() => setCrudState({ open: true, mode: "create" })}
                  className="bg-[#531FFF] hover:bg-[#531FFF]/90 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
                >
                  Tambah Data Siswa
                </button>
              </div>
            )}

            {/* List View placeholder */}
            {viewMode === "list" && (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500 text-sm">
                List view implemented in full table.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
