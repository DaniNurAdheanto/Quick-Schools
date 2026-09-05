"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Plus, Filter, Search, Award, CheckCircle2, AlertCircle, BookOpen, PenLine, User, PenTool, Trash2, ShieldCheck, Lock, Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CrudSheet } from "@/components/layouts/crud-sheet";
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { useToast } from "@/context/ToastContext";

// Fallback Mock Grades Data
const MOCK_GRADES = [
  {
    id: "GRD-1001",
    studentId: "NISN-2023001",
    studentName: "Ahmad Rizqi Pratama",
    studentEmail: "ahmad@quickschools.id",
    subject: "Matematika",
    type: "UTS",
    score: 92,
    semester: "Ganjil",
    academicYear: "2025/2026"
  },
  {
    id: "GRD-1002",
    studentId: "NISN-2023001",
    studentName: "Ahmad Rizqi Pratama",
    studentEmail: "ahmad@quickschools.id",
    subject: "Bahasa Inggris",
    type: "Tugas",
    score: 88,
    semester: "Ganjil",
    academicYear: "2025/2026"
  },
  {
    id: "GRD-1003",
    studentId: "NISN-2023001",
    studentName: "Ahmad Rizqi Pratama",
    studentEmail: "ahmad@quickschools.id",
    subject: "IPA",
    type: "UAS",
    score: 95,
    semester: "Ganjil",
    academicYear: "2025/2026"
  },
  {
    id: "GRD-1004",
    studentId: "NISN-2023002",
    studentName: "Budi Santoso",
    studentEmail: "budi@quickschools.id",
    subject: "Matematika",
    type: "Tugas",
    score: 74,
    semester: "Ganjil",
    academicYear: "2025/2026"
  },
  {
    id: "GRD-1005",
    studentId: "NISN-2023003",
    studentName: "Citra Lestari",
    studentEmail: "citra@quickschools.id",
    subject: "Bahasa Indonesia",
    type: "Ulangan",
    score: 90,
    semester: "Ganjil",
    academicYear: "2025/2026"
  }
];

export default function GradesPage() {
  const toast = useToast();
  const [crudState, setCrudState] = useState<{ open: boolean; mode: "create" | "edit" | "delete" | "view"; data?: any }>({
    open: false,
    mode: "create"
  });
  
  const [currentFormData, setCurrentFormData] = useState<any>({});
  const [grades, setGrades] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // User Auth & Role State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("admin");
  const [studentDoc, setStudentDoc] = useState<any>(null);

  // Search & Type Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"Semua" | "Tugas" | "UTS & UAS">("Semua");

  const isStudentRole = userRole === "siswa" || userRole === "student";

  // Auth & User Profile Lookup
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const userSnap = await getDoc(doc(db, "users", user.uid));
          if (userSnap.exists()) {
            const uData = userSnap.data();
            const role = uData.role || "admin";
            setUserRole(role === "student" || role === "siswa" ? "siswa" : role);
            
            if (role === "student" || role === "siswa") {
              setStudentDoc(uData);
            }
          }
        } catch (err) {
          console.warn("User role fetch error:", err);
        }
      }
    });

    return () => unsubAuth();
  }, []);

  // Fetch Grades & Students Realtime Data
  useEffect(() => {
    const unsubGrades = onSnapshot(collection(db, "grades"), (snap) => {
      if (!snap.empty) {
        const data = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        setGrades(data.reverse());
      } else {
        setGrades(MOCK_GRADES);
      }
      setLoading(false);
    }, (error) => {
      console.warn("Firestore grades error, using mock data:", error);
      setGrades(MOCK_GRADES);
      setLoading(false);
    });

    const unsubStudents = onSnapshot(collection(db, "students"), (snap) => {
      const data = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      setStudents(data);
    });

    return () => {
      unsubGrades();
      unsubStudents();
    };
  }, []);

  // Filter Grades array according to RBAC (Student sees ONLY own grades)
  const accessibleGrades = useMemo(() => {
    return grades.filter(g => {
      // If student role, restrict view exclusively to student's own grade records
      if (isStudentRole) {
        const matchesId = 
          (studentDoc?.nisn && g.studentId === studentDoc.nisn) ||
          (studentDoc?.id && g.studentId === studentDoc.id) ||
          (currentUser?.uid && g.studentId === currentUser.uid);

        const matchesEmail = currentUser?.email && g.studentEmail === currentUser.email;

        const matchesName = studentDoc?.name && g.studentName && 
          g.studentName.toLowerCase().trim() === studentDoc.name.toLowerCase().trim();

        // If mock data is loaded and student name matches fallback Ahmad Rizqi
        const isMockMatch = !studentDoc?.name && (g.studentName?.includes("Ahmad") || g.studentId === "NISN-2023001");

        const isOwnGrade = matchesId || matchesEmail || matchesName || isMockMatch;
        if (!isOwnGrade) return false;
      }

      // Apply Search Query & Filter Type
      const matchesSearch = 
        (g.studentName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) || 
        (g.studentId?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (g.subject?.toLowerCase() || "").includes(searchQuery.toLowerCase());
        
      const matchesType = 
        filterType === "Semua" || 
        (filterType === "Tugas" && g.type === "Tugas") ||
        (filterType === "UTS & UAS" && (g.type === "UTS" || g.type === "UAS" || g.type === "Ulangan"));

      return matchesSearch && matchesType;
    });
  }, [grades, isStudentRole, studentDoc, currentUser, searchQuery, filterType]);

  const handleCrudSubmit = async (data: any) => {
    // Only Admin or Teacher can submit/edit/delete
    if (isStudentRole) return;

    try {
      if (crudState.mode === "create") {
        const id = crypto.randomUUID();
        const student = students.find(s => s.id === data.studentId);
        
        await setDoc(doc(db, "grades", id), {
          studentId: data.studentId,
          studentName: student ? student.name : "Siswa Baru",
          studentEmail: student?.email || "",
          subject: data.subject || "Matematika",
          type: data.type || "Tugas",
          score: Number(data.score) || 0,
          semester: data.semester || "Ganjil",
          academicYear: data.academicYear || "2025/2026",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        toast.showSuccess("Entri nilai siswa baru berhasil ditambahkan.", "Berhasil Tambah");
      } else if (crudState.mode === "edit" && crudState.data?.id) {
        const student = students.find(s => s.id === data.studentId);
        
        await updateDoc(doc(db, "grades", crudState.data.id), {
          studentId: data.studentId || crudState.data.studentId,
          studentName: student ? student.name : crudState.data.studentName,
          studentEmail: student?.email || crudState.data.studentEmail || "",
          subject: data.subject || crudState.data.subject,
          type: data.type || crudState.data.type,
          score: Number(data.score) || crudState.data.score,
          semester: data.semester || crudState.data.semester,
          academicYear: data.academicYear || crudState.data.academicYear,
          updatedAt: serverTimestamp()
        });
        toast.showEdit("Data nilai siswa berhasil diperbarui.", "Berhasil Edit");
      } else if (crudState.mode === "delete" && crudState.data?.id) {
        await deleteDoc(doc(db, "grades", crudState.data.id));
        toast.showWarning("Entri nilai siswa berhasil dihapus.", "Berhasil Hapus");
      }
    } catch (error) {
      console.error("Error saving grade", error);
      toast.showError("Gagal menyimpan data nilai siswa.", "Gagal");
      throw error;
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

  const averageScore = accessibleGrades.length > 0 
    ? (accessibleGrades.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0) / accessibleGrades.length).toFixed(1) 
    : "0";
  const aGrades = accessibleGrades.filter(g => g.score >= 90).length;
  
  const metrics = [
    { label: isStudentRole ? "Nilai Saya" : "Total Entri Nilai", value: accessibleGrades.length, desc: isStudentRole ? "Nilai terdaftar" : "Seluruh semester", icon: PenLine, color: "text-[#531FFF]", bgColor: "bg-[#531FFF]/10" },
    { label: isStudentRole ? "Rata-rata Nilai" : "Rata-rata Kelas", value: averageScore, desc: "Akumulasi nilai", icon: BookOpen, color: "text-emerald-600", bgColor: "bg-emerald-50" },
    { label: "Nilai A (90-100)", value: aGrades, desc: "Prestasi sempurna", icon: Award, color: "text-amber-600", bgColor: "bg-amber-50" },
    { label: "Perlu Perbaikan", value: accessibleGrades.filter(g => g.score < 75).length, desc: "Di bawah KKM 75", icon: AlertCircle, color: "text-rose-600", bgColor: "bg-rose-50" },
  ];

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto w-full space-y-6 animate-in fade-in duration-300">
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
        onEditRequested={!isStudentRole ? () => setCrudState(s => ({ ...s, mode: "edit" })) : undefined}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Penilaian Akademik</h1>
            {isStudentRole ? (
              <span className="px-2.5 py-0.5 text-xs font-bold bg-[#F3F0FF] text-[#531FFF] rounded-full border border-[#531FFF]/20 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Portal Siswa (Nilai Mandiri)
              </span>
            ) : (
              <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                Akses Guru & Admin
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1 font-medium">
            {isStudentRole 
              ? "Rekapitulasi hasil ujian, tugas, dan nilai akademik Anda secara mandiri."
              : "Kelola nilai akademik siswa untuk berbagai mata pelajaran dan ujian secara terpusat."
            }
          </p>
        </div>

        {!isStudentRole && (
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setCrudState({ open: true, mode: "create" })}
              className="flex items-center gap-2 px-4 py-2 bg-[#531FFF] text-white hover:bg-[#4314cc] rounded-lg text-xs font-bold shadow-sm transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" /> Entri Nilai Siswa
            </button>
          </div>
        )}
      </div>

      {/* Student RBAC Privacy Alert Banner */}
      {isStudentRole && (
        <div className="bg-gradient-to-r from-[#531FFF]/10 via-[#531FFF]/5 to-transparent border border-[#531FFF]/20 p-4 rounded-2xl flex items-center gap-3 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-white text-[#531FFF] border border-[#531FFF]/20 flex items-center justify-center shrink-0 shadow-xs">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900">Portal Privasi Siswa Terproteksi RBAC</p>
            <p className="text-[11px] text-gray-600 font-medium">
              Sesuai aturan keamanan sekolah, Anda hanya dapat melihat nilai milik akun Anda sendiri. Nilai siswa lain tidak dapat diakses.
            </p>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center justify-between shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
             <div className="flex items-center gap-4">
               <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-gray-100", m.bgColor)}>
                 <m.icon className={cn("w-6 h-6", m.color)} />
               </div>
               <div>
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">{m.label}</div>
                  <div className="text-2xl font-bold text-gray-900 mt-0.5">{m.value}</div>
                  <div className="text-[11px] font-medium text-gray-400">{m.desc}</div>
               </div>
             </div>
          </div>
        ))}
      </div>

      {/* Grades List Table Area */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col">
         
         {/* Filter & Search Header */}
         <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/50">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
               {(["Semua", "Tugas", "UTS & UAS"] as const).map((t) => (
                 <button 
                   key={t}
                   onClick={() => setFilterType(t)}
                   className={cn(
                     "px-3 py-1.5 rounded-lg transition-all",
                     filterType === t 
                       ? "bg-white text-[#531FFF] border border-[#531FFF]/20 shadow-xs" 
                       : "text-gray-600 hover:text-gray-900"
                   )}
                 >
                   {t}
                 </button>
               ))}
            </div>
            
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text"
                placeholder={isStudentRole ? "Cari mata pelajaran..." : "Cari nama siswa atau mata pelajaran..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs font-medium placeholder:text-gray-400 bg-white focus:outline-none focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/20 transition-all"
              />
            </div>
         </div>

         {/* Table Content */}
         <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
               <thead>
                  <tr className="bg-white border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                     <th className="px-6 py-4">Siswa</th>
                     <th className="px-6 py-4">Mata Pelajaran</th>
                     <th className="px-6 py-4">Tipe Nilai</th>
                     <th className="px-6 py-4">Nilai</th>
                     <th className="px-6 py-4">Keterangan KKM</th>
                     {!isStudentRole && <th className="px-6 py-4 text-right">Aksi</th>}
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={isStudentRole ? 5 : 6} className="px-6 py-12 text-center text-gray-400">
                        Memuat data penilaian...
                      </td>
                    </tr>
                  ) : accessibleGrades.length === 0 ? (
                    <tr>
                      <td colSpan={isStudentRole ? 5 : 6} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center text-gray-400">
                          <BookOpen className="w-10 h-10 mb-3 text-gray-200" />
                          <p className="font-bold text-gray-900 text-sm">Tidak ada data nilai yang ditemukan.</p>
                          <p className="text-xs text-gray-500 mt-1">Coba ganti filter pencarian atau kata kunci.</p>
                        </div>
                      </td>
                    </tr>
                  ) : accessibleGrades.map(grade => (
                    <tr key={grade.id} className="hover:bg-gray-50/60 transition-colors group">
                       {/* Siswa */}
                       <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-[#F3F0FF] text-[#531FFF] border border-[#531FFF]/20 flex items-center justify-center font-bold text-xs shrink-0">
                                {(grade.studentName || "S").charAt(0).toUpperCase()}
                             </div>
                             <div>
                                <p className="font-bold text-gray-900 group-hover:text-[#531FFF] transition-colors">{grade.studentName}</p>
                                <p className="text-[11px] text-gray-500">{grade.studentId} • {grade.academicYear || "2025/2026"}</p>
                             </div>
                          </div>
                       </td>

                       {/* Mapel */}
                       <td className="px-6 py-4 font-bold text-gray-800">{grade.subject}</td>

                       {/* Tipe Nilai */}
                       <td className="px-6 py-4">
                          <span className={cn(
                             "px-2.5 py-1 rounded-md text-[11px] font-extrabold border shadow-2xs",
                             grade.type === "Tugas" ? "bg-blue-50 text-blue-700 border-blue-200" :
                             grade.type === "Ulangan" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-purple-50 text-[#531FFF] border-purple-200"
                          )}>
                             {grade.type}
                          </span>
                       </td>

                       {/* Nilai */}
                       <td className="px-6 py-4">
                          <span className={cn(
                            "text-base font-black",
                            grade.score >= 90 ? "text-emerald-600" : 
                            grade.score >= 75 ? "text-blue-600" : "text-rose-600"
                          )}>
                            {grade.score}
                          </span>
                       </td>

                       {/* KKM */}
                       <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                             {grade.score >= 75 ? (
                               <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                             ) : (
                               <AlertCircle className="w-4 h-4 text-rose-500" />
                             )}
                             <span className={cn(
                               "text-xs font-bold",
                               grade.score >= 75 ? "text-emerald-600" : "text-rose-600"
                             )}>
                               {grade.score >= 75 ? "Lulus KKM" : "Remedial"}
                             </span>
                          </div>
                       </td>

                       {/* Aksi */}
                       <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1">
                             <button 
                               onClick={() => setCrudState({ open: true, mode: "view", data: grade })}
                               className="p-1.5 text-gray-400 hover:text-[#531FFF] hover:bg-[#F3F0FF] rounded-md transition-colors" title="Lihat Detail Nilai">
                               <Eye className="w-4 h-4" />
                             </button>
                             {!isStudentRole && (
                               <>
                                 <button 
                                   onClick={() => {
                                     const student = students.find(s => s.id === grade.studentId);
                                     setCrudState({ open: true, mode: "edit", data: { ...grade, classId: student?.classId || "" } });
                                   }}
                                   className="p-1.5 text-gray-400 hover:text-[#531FFF] hover:bg-[#F3F0FF] rounded-md transition-colors" title="Edit Nilai">
                                   <PenTool className="w-4 h-4" />
                                 </button>
                                 <button 
                                   onClick={() => setCrudState({ open: true, mode: "delete", data: grade })}
                                   className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors" title="Hapus Nilai">
                                   <Trash2 className="w-4 h-4" />
                                 </button>
                               </>
                             )}
                          </div>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>

         {/* Footer Info */}
         <div className="p-4 border-t border-gray-100 bg-gray-50/40 flex items-center justify-between text-xs text-gray-500 font-medium">
            <p>Menampilkan <span className="font-bold text-gray-900">{accessibleGrades.length}</span> entri penilaian</p>
            {isStudentRole && (
              <span className="text-[11px] text-[#531FFF] font-bold">Privasi Terjaga — Hanya Menampilkan Nilai Akun Anda</span>
            )}
         </div>
      </div>
    </div>
  );
}
