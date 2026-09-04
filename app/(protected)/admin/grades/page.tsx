"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Plus, Filter, Search, Award, CheckCircle2, AlertCircle, BookOpen, PenLine, User, PenTool, Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CrudSheet } from "@/components/layouts/crud-sheet";
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function GradesPage() {
  const [crudState, setCrudState] = useState<{ open: boolean; mode: "create" | "edit" | "delete"; data?: any }>({
    open: false,
    mode: "create"
  });
  
  const [currentFormData, setCurrentFormData] = useState<any>({});
  const [grades, setGrades] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubGrades = onSnapshot(collection(db, "grades"), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGrades(data.reverse());
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    const unsubStudents = onSnapshot(collection(db, "students"), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(data);
    });

    return () => {
      unsubGrades();
      unsubStudents();
    };
  }, []);

  const handleCrudSubmit = async (data: any) => {
    try {
      if (crudState.mode === "create") {
        const id = crypto.randomUUID();
        // find student name if only ID was passed (or vice versa)
        const student = students.find(s => s.id === data.studentId);
        
        await setDoc(doc(db, "grades", id), {
          studentId: data.studentId,
          studentName: student ? student.name : "Siswa Baru",
          subject: data.subject || "Umum",
          type: data.type || "Tugas",
          score: Number(data.score) || 0,
          semester: data.semester || "Ganjil",
          academicYear: data.academicYear || "2025/2026",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else if (crudState.mode === "edit" && crudState.data?.id) {
        const student = students.find(s => s.id === data.studentId);
        
        await updateDoc(doc(db, "grades", crudState.data.id), {
          studentId: data.studentId || crudState.data.studentId,
          studentName: student ? student.name : crudState.data.studentName,
          subject: data.subject || crudState.data.subject,
          type: data.type || crudState.data.type,
          score: Number(data.score) || crudState.data.score,
          semester: data.semester || crudState.data.semester,
          academicYear: data.academicYear || crudState.data.academicYear,
          updatedAt: serverTimestamp()
        });
      } else if (crudState.mode === "delete" && crudState.data?.id) {
        await deleteDoc(doc(db, "grades", crudState.data.id));
      }
      setCrudState({ open: false, mode: "create" });
    } catch (error) {
      console.error("Error saving grade", error);
      alert("Terjadi kesalahan: " + (error as Error).message);
    }
  };

  const classes = useMemo(() => {
    const uniqueClasses = new Set(students.map(s => s.classId).filter(Boolean));
    return Array.from(uniqueClasses).sort().map(c => ({ label: c, value: c }));
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (!currentFormData.classId) return [];
    return students
      .filter(s => s.classId === currentFormData.classId)
      .map(s => ({ label: `${s.name} (${s.id})`, value: s.id }));
  }, [students, currentFormData.classId]);

  const gradeFields = [
    { name: "classId", label: "Kelas", type: "select", options: classes },
    { 
      name: "studentId", 
      label: "Nama Siswa", 
      type: "select", 
      options: filteredStudents,
      placeholder: currentFormData.classId ? "Pilih Siswa" : "Pilih kelas terlebih dahulu"
    },
    { name: "subject", label: "Mata Pelajaran", type: "select", options: [
      { label: "Matematika", value: "Matematika" },
      { label: "Bahasa Indonesia", value: "Bahasa Indonesia" },
      { label: "Bahasa Inggris", value: "Bahasa Inggris" },
      { label: "IPA", value: "IPA" },
      { label: "IPS", value: "IPS" }
    ] },
    { name: "type", label: "Tipe Nilai", type: "select", options: [
      { label: "Tugas", value: "Tugas" },
      { label: "Ulangan", value: "Ulangan" },
      { label: "UTS", value: "UTS" },
      { label: "UAS", value: "UAS" }
    ] },
    { name: "score", label: "Nilai (0-100)", type: "number" },
    { name: "semester", label: "Semester", type: "select", options: [
      { label: "Ganjil", value: "Ganjil" },
      { label: "Genap", value: "Genap" }
    ] },
    { name: "academicYear", label: "Tahun Ajaran", type: "select", options: [
      { label: "2025/2026", value: "2025/2026" },
      { label: "2026/2027", value: "2026/2027" }
    ] }
  ];

  const averageScore = grades.length > 0 ? (grades.reduce((acc, curr) => acc + curr.score, 0) / grades.length).toFixed(1) : "0";
  const aGrades = grades.filter(g => g.score >= 90).length;
  
  const metrics = [
    { label: "Total Entri Nilai", value: grades.length, desc: "Seluruh semester", icon: PenLine, color: "text-[#531FFF]", bgColor: "bg-[#531FFF]/10", iconBg: "bg-[#531FFF]" },
    { label: "Rata-rata Kelas", value: averageScore, desc: "Akumulasi nilai", icon: BookOpen, color: "text-emerald-500", bgColor: "bg-emerald-50", iconBg: "bg-emerald-500" },
    { label: "Nilai A (90-100)", value: aGrades, desc: "Siswa berprestasi", icon: Award, color: "text-amber-500", bgColor: "bg-amber-50", iconBg: "bg-amber-500" },
    { label: "Perlu Perbaikan", value: grades.filter(g => g.score < 75).length, desc: "Nilai di bawah 75", icon: AlertCircle, color: "text-red-500", bgColor: "bg-red-50", iconBg: "bg-red-500" },
  ];

  return (
    <div className="p-8 pb-12 max-w-[1600px] mx-auto w-full h-full flex flex-col space-y-6">
      <CrudSheet 
        open={crudState.open} 
        onOpenChange={(open) => {
          setCrudState(s => ({ ...s, open }));
          if (!open) setCurrentFormData({});
        }}
        mode={crudState.mode}
        entityName="Nilai Siswa"
        fields={gradeFields}
        initialData={crudState.data}
        onSubmit={handleCrudSubmit}
        onDataChange={(data) => setCurrentFormData(data)}
      />
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Penilaian</h1>
          <p className="text-[13px] text-gray-500 mt-1 font-medium">Kelola nilai akademik siswa untuk berbagai mata pelajaran dan ujian.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 rounded-xl text-[13px] font-bold shadow-sm transition-colors">
            <Filter className="w-4 h-4" /> Filter
          </button>
          <button 
            onClick={() => setCrudState({ open: true, mode: "create" })}
            className="flex items-center gap-2 px-4 py-2 bg-[#531FFF] text-white hover:bg-[#4314E5] rounded-xl text-[13px] font-bold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Entri Nilai
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-[24px] p-5 flex items-center justify-between shadow-sm">
             <div className="flex items-center gap-4">
               <div className={cn("w-14 h-14 rounded-full flex items-center justify-center", m.bgColor)}>
                 <m.icon className={cn("w-6 h-6", m.color)} />
               </div>
               <div>
                  <div className="text-[12px] font-bold text-gray-500 mb-0.5">{m.label}</div>
                  <div className="text-2xl font-bold text-gray-900">{m.value}</div>
                  <div className="text-[11px] font-medium text-gray-400 mt-0.5">{m.desc}</div>
               </div>
             </div>
          </div>
        ))}
      </div>

      {/* List Layout Area */}
      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden flex flex-col flex-1">
         <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white">
            <div className="flex items-center gap-4 text-[13px] font-bold text-gray-500">
               <button className="text-[#531FFF] border-b-2 border-[#531FFF] pb-1 relative top-[4px]">Semua</button>
               <button className="hover:text-gray-900 pb-1 relative top-[4px]">Tugas</button>
               <button className="hover:text-gray-900 pb-1 relative top-[4px]">UTS & UAS</button>
            </div>
            
            <div className="relative w-full sm:w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text"
                placeholder="Cari nama siswa atau NIS..."
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-[13px] placeholder:text-gray-400 bg-white focus:outline-none focus:border-[#531FFF] focus:ring-1 focus:ring-[#531FFF] transition-all"
              />
            </div>
         </div>

         <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-[13px]">
               <thead className="bg-gray-50/50 sticky top-0 z-10">
                  <tr>
                     <th className="px-6 py-4 font-bold text-gray-500">Siswa</th>
                     <th className="px-6 py-4 font-bold text-gray-500">Mata Pelajaran</th>
                     <th className="px-6 py-4 font-bold text-gray-500">Tipe</th>
                     <th className="px-6 py-4 font-bold text-gray-500">Nilai</th>
                     <th className="px-6 py-4 font-bold text-gray-500">Keterangan</th>
                     <th className="px-6 py-4 font-bold text-gray-500 text-right">Aksi</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
                  ) : grades.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center text-gray-400">
                          <BookOpen className="w-10 h-10 mb-3 text-gray-200" />
                          <p className="font-medium text-[13px]">Belum ada entri nilai yang tercatat.</p>
                        </div>
                      </td>
                    </tr>
                  ) : grades.map(grade => (
                    <tr key={grade.id} className="hover:bg-gray-50/50 transition-colors group">
                       <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center font-bold text-xs shrink-0">
                                {grade.studentName.charAt(0).toUpperCase()}
                             </div>
                             <div>
                                <p className="font-bold text-gray-900">{grade.studentName}</p>
                                <p className="text-xs text-gray-500">{grade.studentId}</p>
                             </div>
                          </div>
                       </td>
                       <td className="px-6 py-4 font-semibold text-gray-700">{grade.subject}</td>
                       <td className="px-6 py-4">
                          <span className={cn(
                             "px-2.5 py-1 rounded-md text-[11px] font-bold",
                             grade.type === "Tugas" ? "bg-blue-50 text-blue-600" :
                             grade.type === "Ulangan" ? "bg-amber-50 text-amber-600" : "bg-purple-50 text-purple-600"
                          )}>
                             {grade.type}
                          </span>
                       </td>
                       <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                             <span className={cn(
                               "text-[16px] font-black",
                               grade.score >= 90 ? "text-emerald-600" : 
                               grade.score >= 75 ? "text-blue-600" : "text-red-600"
                             )}>
                               {grade.score}
                             </span>
                          </div>
                       </td>
                       <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                             {grade.score >= 75 ? (
                               <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                             ) : (
                               <AlertCircle className="w-4 h-4 text-red-500" />
                             )}
                             <span className={cn(
                               "text-[12px] font-bold",
                               grade.score >= 75 ? "text-emerald-600" : "text-red-600"
                             )}>
                               {grade.score >= 75 ? "Lulus KKM" : "Remedial"}
                             </span>
                          </div>
                       </td>
                       <td className="px-6 py-4">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button 
                               onClick={() => {
                                 const student = students.find(s => s.id === grade.studentId);
                                 setCrudState({ open: true, mode: "edit", data: { ...grade, classId: student?.classId || "" } });
                               }}
                               className="p-1.5 text-gray-400 hover:text-[#531FFF] hover:bg-[#531FFF]/10 rounded-lg transition-colors" title="Edit">
                               <PenTool className="w-4 h-4" />
                             </button>
                             <button 
                               onClick={() => setCrudState({ open: true, mode: "delete", data: grade })}
                               className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
                               <Trash2 className="w-4 h-4" />
                             </button>
                          </div>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}
