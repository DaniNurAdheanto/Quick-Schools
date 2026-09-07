"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Users, 
  Plus, 
  Search, 
  GraduationCap, 
  PenTool, 
  Trash2, 
  Loader2, 
  Eye,
  UserPlus,
  UserMinus,
  ArrowRightLeft,
  Check,
  CheckCircle2,
  X,
  Sparkles,
  LayoutGrid,
  Table as TableIcon,
  AlertCircle,
  Layers
} from "lucide-react";
import { CrudSheet, CrudField } from "@/components/layouts/crud-sheet";
import { db, auth } from "@/lib/firebase";
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  writeBatch 
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";

// Standard Class Presets for Quick Creation
const STANDARD_CLASS_PRESETS = [
  { name: "10 MIPA 1", level: "Kelas 10", major: "IPA", maxCapacity: 36 },
  { name: "10 MIPA 2", level: "Kelas 10", major: "IPA", maxCapacity: 36 },
  { name: "10 IPS 1", level: "Kelas 10", major: "IPS", maxCapacity: 36 },
  { name: "10 IPS 2", level: "Kelas 10", major: "IPS", maxCapacity: 36 },
  { name: "11 MIPA 1", level: "Kelas 11", major: "IPA", maxCapacity: 36 },
  { name: "11 MIPA 2", level: "Kelas 11", major: "IPA", maxCapacity: 36 },
  { name: "11 IPS 1", level: "Kelas 11", major: "IPS", maxCapacity: 36 },
  { name: "12 MIPA 1", level: "Kelas 12", major: "IPA", maxCapacity: 36 },
  { name: "12 MIPA 2", level: "Kelas 12", major: "IPA", maxCapacity: 36 },
  { name: "12 IPS 1", level: "Kelas 12", major: "IPS", maxCapacity: 36 }
];

export default function ClassesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("All");
  const [selectedMajor, setSelectedMajor] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Student Management Modal state
  const [managingClass, setManagingClass] = useState<any | null>(null);
  const [manageTab, setManageTab] = useState<"enrolled" | "add" | "quickAdd">("enrolled");
  const [manageSearch, setManageSearch] = useState("");
  const [onlyUnassigned, setOnlyUnassigned] = useState(true);
  const [selectedStudentIdsToAdd, setSelectedStudentIdsToAdd] = useState<string[]>([]);
  const [isProcessingStudent, setIsProcessingStudent] = useState(false);

  // Quick Add new student form state
  const [newStudentForm, setNewStudentForm] = useState({
    name: "",
    nisn: "",
    gender: "Laki-laki"
  });

  // Transfer state
  const [transferringStudent, setTransferringStudent] = useState<any | null>(null);
  const [targetClassId, setTargetClassId] = useState<string>("");

  const toast = useToast();

  const [crudState, setCrudState] = useState<{ open: boolean; mode: "create" | "edit" | "delete" | "view"; data?: any }>({
    open: false,
    mode: "create"
  });

  // Real-time synchronization for classes, students, and teachers
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // 1. Classes
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

        // 2. Students
        const qStudents = query(collection(db, "students"));
        const unsubStudents = onSnapshot(qStudents, (snapshot) => {
          const studentsData = snapshot.docs.map(doc => ({
            _firestoreId: doc.id,
            id: doc.id,
            ...doc.data()
          }));
          setStudents(studentsData);
        });

        // 3. Teachers
        const qTeachers = query(collection(db, "teachers"));
        const unsubTeachers = onSnapshot(qTeachers, (snapshot) => {
          setTeachers(snapshot.docs.map(doc => ({
            _firestoreId: doc.id,
            ...doc.data()
          })));
        });
        
        return () => {
          unsubClasses();
          unsubStudents();
          unsubTeachers();
        };
      } else {
        setClasses([]);
        setStudents([]);
        setTeachers([]);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Map real-time students count to each class
  const classStudentsMap = useMemo(() => {
    const map = new Map<string, any[]>();
    classes.forEach(c => {
      map.set(c.name, []);
    });

    students.forEach(s => {
      const cName = s.classId || s.className || s.class;
      if (cName && map.has(cName)) {
        map.get(cName)?.push(s);
      }
    });

    return map;
  }, [classes, students]);

  // Form Fields Configuration for CrudSheet
  const classFields: CrudField[] = useMemo(() => [
    { 
      name: "name", 
      label: "Nama Kelas", 
      placeholder: "Contoh: 10 MIPA 1, 11 IPS 2",
      category: "akademik",
      colSpan: 1 
    },
    { 
      name: "level", 
      label: "Tingkat Pendidikan",
      type: "select",
      category: "akademik",
      placeholder: "Pilih Tingkat",
      options: [
        { label: "Kelas 10", value: "Kelas 10" },
        { label: "Kelas 11", value: "Kelas 11" },
        { label: "Kelas 12", value: "Kelas 12" }
      ],
      colSpan: 1
    },
    { 
      name: "major", 
      label: "Jurusan / Peminatan",
      type: "select",
      category: "akademik",
      placeholder: "Pilih Jurusan",
      options: [
        { label: "IPA", value: "IPA" },
        { label: "IPS", value: "IPS" },
        { label: "Bahasa", value: "Bahasa" },
        { label: "Kejuruan", value: "Kejuruan" }
      ],
      colSpan: 1
    },
    { 
      name: "homeroom", 
      label: "Wali Kelas",
      type: "select",
      category: "akademik",
      placeholder: "Pilih Wali Kelas (Opsional)",
      options: [
        { label: "-- Tanpa Wali Kelas --", value: "" },
        ...teachers.map(t => ({ label: `${t.name} (${t.subject || "Guru"})`, value: t.name }))
      ],
      colSpan: 1
    },
    { 
      name: "maxCapacity", 
      label: "Kapasitas Maksimal Siswa", 
      type: "number", 
      placeholder: "Contoh: 36",
      category: "akademik",
      colSpan: 1
    },
    {
      name: "status",
      label: "Status Kelas",
      type: "select",
      category: "darurat",
      placeholder: "Pilih Status",
      options: [
        { label: "Aktif", value: "Aktif" },
        { label: "Nonaktif", value: "Nonaktif" }
      ],
      colSpan: 1
    }
  ], [teachers]);

  // Handle Create / Edit / Delete Class
  const handleCrudSubmit = async (data: any) => {
    try {
      const payload = {
        name: (data.name || "").trim(),
        level: data.level || "Kelas 10",
        major: data.major || "IPA",
        homeroom: data.homeroom || "",
        maxCapacity: Number(data.maxCapacity) || 36,
        status: data.status || "Aktif",
        updatedAt: new Date().toISOString()
      };

      if (crudState.mode === "create") {
        await addDoc(collection(db, "classes"), {
          id: data.id || `C${Math.floor(100 + Math.random() * 900)}`,
          ...payload,
          createdAt: new Date().toISOString()
        });
      } else if (crudState.mode === "edit" && data._firestoreId) {
        await updateDoc(doc(db, "classes", data._firestoreId), payload);
      } else if (crudState.mode === "delete" && data._firestoreId) {
        await deleteDoc(doc(db, "classes", data._firestoreId));
      }
    } catch (error) {
      console.error("Error saving class data:", error);
      throw error;
    }
  };

  // Quick Preset Add Class
  const handleApplyClassPreset = async (preset: typeof STANDARD_CLASS_PRESETS[0]) => {
    try {
      // Check if already exists
      const exists = classes.some(c => c.name.toLowerCase() === preset.name.toLowerCase());
      if (exists) {
        toast.showError(`Kelas ${preset.name} sudah ada di sistem.`, "Gagal");
        return;
      }

      await addDoc(collection(db, "classes"), {
        id: `C${Math.floor(100 + Math.random() * 900)}`,
        name: preset.name,
        level: preset.level,
        major: preset.major,
        homeroom: "",
        maxCapacity: preset.maxCapacity,
        status: "Aktif",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      toast.showSuccess(`Kelas ${preset.name} berhasil dibuat!`, "Kelas Ditambahkan");
    } catch (err: any) {
      console.error("Preset add error:", err);
      toast.showError("Gagal menambahkan preset kelas.", "Gagal");
    }
  };

  // ================= STUDENT MANAGEMENT HANDLERS =================

  // 1. Unassign student from class
  const handleRemoveStudentFromClass = async (student: any) => {
    if (!student?._firestoreId) return;

    try {
      setIsProcessingStudent(true);
      await updateDoc(doc(db, "students", student._firestoreId), {
        classId: "",
        updatedAt: new Date().toISOString()
      });

      toast.showSuccess(`${student.fullName || student.name} berhasil dikeluarkan dari kelas ${managingClass.name}.`, "Siswa Dikeluarkan");
    } catch (err: any) {
      console.error("Remove student error:", err);
      toast.showError("Gagal mengeluarkan siswa dari kelas.", "Gagal");
    } finally {
      setIsProcessingStudent(false);
    }
  };

  // 2. Add single student to managingClass
  const handleAddSingleStudent = async (student: any) => {
    if (!student?._firestoreId || !managingClass?.name) return;

    try {
      setIsProcessingStudent(true);
      await updateDoc(doc(db, "students", student._firestoreId), {
        classId: managingClass.name,
        updatedAt: new Date().toISOString()
      });

      toast.showSuccess(`${student.fullName || student.name} berhasil dimasukkan ke kelas ${managingClass.name}!`, "Siswa Ditambahkan");
    } catch (err: any) {
      console.error("Add student error:", err);
      toast.showError("Gagal menambahkan siswa ke kelas.", "Gagal");
    } finally {
      setIsProcessingStudent(false);
    }
  };

  // 3. Bulk Add selected students to managingClass
  const handleBulkAddStudents = async () => {
    if (selectedStudentIdsToAdd.length === 0 || !managingClass?.name) return;

    try {
      setIsProcessingStudent(true);
      const batch = writeBatch(db);

      selectedStudentIdsToAdd.forEach((docId) => {
        const studentRef = doc(db, "students", docId);
        batch.update(studentRef, {
          classId: managingClass.name,
          updatedAt: new Date().toISOString()
        });
      });

      await batch.commit();
      toast.showSuccess(`Berhasil menambahkan ${selectedStudentIdsToAdd.length} siswa ke kelas ${managingClass.name}!`, "Siswa Ditambahkan");
      setSelectedStudentIdsToAdd([]);
      setManageTab("enrolled");
    } catch (err: any) {
      console.error("Bulk add students error:", err);
      toast.showError("Gagal menambahkan siswa secara massal.", "Gagal");
    } finally {
      setIsProcessingStudent(false);
    }
  };

  // 4. Quick Add brand new student directly to class
  const handleQuickCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentForm.name.trim() || !managingClass?.name) {
      toast.showError("Nama lengkap siswa wajib diisi.", "Peringatan");
      return;
    }

    try {
      setIsProcessingStudent(true);
      const randomAvatar = `https://images.unsplash.com/photo-${[
        "1539571696357-5a69c17a67c6",
        "1517841905240-472988babdf9",
        "1506794778202-cad84cf45f1d",
        "1534528741775-53994a69daeb"
      ][Math.floor(Math.random() * 4)]}?q=80&w=250&auto=format&fit=crop`;

      await addDoc(collection(db, "students"), {
        name: newStudentForm.name.trim(),
        fullName: newStudentForm.name.trim(),
        nisn: newStudentForm.nisn.trim() || `SIS-${Date.now().toString().slice(-6)}`,
        id: newStudentForm.nisn.trim() || `SIS-${Date.now().toString().slice(-6)}`,
        gender: newStudentForm.gender,
        classId: managingClass.name,
        status: "Aktif",
        imageUrl: randomAvatar,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      setNewStudentForm({ name: "", nisn: "", gender: "Laki-laki" });
      setManageTab("enrolled");
      toast.showSuccess(`Siswa baru berhasil didaftarkan dan masuk ke kelas ${managingClass.name}!`, "Siswa Terdaftar");
    } catch (err: any) {
      console.error("Quick create student error:", err);
      toast.showError("Gagal mendaftarkan siswa baru.", "Gagal");
    } finally {
      setIsProcessingStudent(false);
    }
  };

  // 5. Transfer student to another class
  const handleTransferStudent = async () => {
    if (!transferringStudent?._firestoreId || !targetClassId) return;

    try {
      setIsProcessingStudent(true);
      await updateDoc(doc(db, "students", transferringStudent._firestoreId), {
        classId: targetClassId,
        updatedAt: new Date().toISOString()
      });

      toast.showSuccess(
        `${transferringStudent.fullName || transferringStudent.name} berhasil dipindahkan ke kelas ${targetClassId}!`,
        "Siswa Dipindahkan"
      );
      setTransferringStudent(null);
      setTargetClassId("");
    } catch (err: any) {
      console.error("Transfer error:", err);
      toast.showError("Gagal memindahkan siswa.", "Gagal");
    } finally {
      setIsProcessingStudent(false);
    }
  };

  // Filtered classes list
  const filteredClasses = useMemo(() => {
    return classes.filter(item => {
      const matchSearch = 
        !searchQuery.trim() ||
        (item.name || "").toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        (item.homeroom || "").toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        (item.major || "").toLowerCase().includes(searchQuery.toLowerCase().trim());

      const matchLevel = selectedLevel === "All" || item.level === selectedLevel;
      const matchMajor = selectedMajor === "All" || item.major === selectedMajor;

      return matchSearch && matchLevel && matchMajor;
    });
  }, [classes, searchQuery, selectedLevel, selectedMajor]);

  // Enrolled students in currently managed class
  const currentlyEnrolledStudents = useMemo(() => {
    if (!managingClass?.name) return [];
    return students.filter(s => {
      const cName = s.classId || s.className || s.class;
      return cName === managingClass.name;
    });
  }, [students, managingClass]);

  // Available students to add to currently managed class
  const availableStudentsToAdd = useMemo(() => {
    if (!managingClass?.name) return [];
    return students.filter(s => {
      const cName = s.classId || s.className || s.class;
      // Exclude students already in this class
      if (cName === managingClass.name) return false;

      // Filter by unassigned only if toggled
      if (onlyUnassigned && cName && cName !== "-" && cName !== "") {
        return false;
      }

      // Search filter
      if (manageSearch.trim()) {
        const q = manageSearch.toLowerCase().trim();
        const sName = (s.fullName || s.name || "").toLowerCase();
        const sNisn = (s.nisn || s.id || "").toLowerCase();
        return sName.includes(q) || sNisn.includes(q);
      }

      return true;
    });
  }, [students, managingClass, onlyUnassigned, manageSearch]);

  // Metrics Analytics
  const totalAssignedStudents = useMemo(() => {
    return students.filter(s => {
      const c = s.classId || s.className || s.class;
      return c && c !== "-" && c !== "";
    }).length;
  }, [students]);

  const classesWithHomeroom = classes.filter(c => !!c.homeroom).length;
  const avgStudentsPerClass = classes.length > 0 ? Math.round(totalAssignedStudents / classes.length) : 0;

  return (
    <div className="p-4 sm:p-8 pb-16 max-w-[1600px] mx-auto w-full flex flex-col space-y-6">
      
      {/* ================= CRUD DRAWER / SHEET ================= */}
      <CrudSheet 
        open={crudState.open} 
        onOpenChange={(open) => setCrudState(s => ({ ...s, open }))}
        mode={crudState.mode}
        entityName="Kelas"
        fields={classFields}
        initialData={crudState.data}
        onSubmit={handleCrudSubmit}
        onEditRequested={() => setCrudState(s => ({ ...s, mode: "edit" }))}
      />

      {/* ================= HEADER SECTION ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-purple-50/70 via-white to-indigo-50/40 p-6 rounded-3xl border border-purple-100/60 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#531FFF] text-white flex items-center justify-center shadow-md shadow-[#531FFF]/25">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                Manajemen Kelas &amp; Siswa
              </h1>
              <p className="text-[13px] text-gray-500 font-medium">
                Kelola rombongan belajar, penugasan wali kelas, dan pembagian siswa ke dalam setiap kelas.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* New Class Button */}
          <button 
            type="button"
            onClick={() => setCrudState({ 
              open: true, 
              mode: "create",
              data: {
                level: "Kelas 10",
                major: "IPA",
                homeroom: "",
                maxCapacity: 36,
                status: "Aktif"
              }
            })}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#531FFF] hover:bg-[#4314cc] text-white rounded-xl text-[13px] font-bold shadow-md shadow-[#531FFF]/25 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kelas Baru</span>
          </button>
        </div>
      </div>

      {/* ================= QUICK PRESET TEMPLATES BAR ================= */}
      <div className="bg-white border border-gray-100 rounded-3xl p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#531FFF]" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-800">
              Template Rombel Siap Pakai
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-gray-400">
            Klik nama rombel untuk langsung membuat kelas
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {STANDARD_CLASS_PRESETS.map((preset) => {
            const isAlreadyAdded = classes.some(c => c.name.toLowerCase() === preset.name.toLowerCase());
            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleApplyClassPreset(preset)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all border cursor-pointer",
                  isAlreadyAdded 
                    ? "bg-gray-50/80 text-gray-600 border-gray-200 hover:border-[#531FFF]/50" 
                    : "bg-purple-50/60 text-[#531FFF] border-purple-200 hover:bg-purple-100 hover:border-purple-300"
                )}
                title={`Kapasitas: ${preset.maxCapacity} siswa`}
              >
                <span>{preset.name}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white border text-gray-500">
                  {preset.major}
                </span>
                {isAlreadyAdded && (
                  <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ================= METRICS STATS TILES ================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Kelas */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Kelas</p>
            <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">{classes.length}</p>
            <span className="text-[11px] font-semibold text-emerald-600 mt-0.5 inline-block">
              {classes.filter(c => (c.status || "Aktif") === "Aktif").length} Kelas Aktif
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#531FFF] flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Siswa Terdaftar */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Siswa Terdaftar</p>
            <p className="text-2xl sm:text-3xl font-black text-blue-600 mt-1">
              {totalAssignedStudents} <span className="text-sm font-semibold text-gray-400">/ {students.length}</span>
            </p>
            <span className="text-[11px] font-semibold text-gray-400 mt-0.5 inline-block">
              {students.length - totalAssignedStudents} Belum Punya Kelas
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>

        {/* Wali Kelas Terpenuhi */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Wali Kelas</p>
            <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">
              {classesWithHomeroom} <span className="text-sm font-semibold text-gray-400">/ {classes.length}</span>
            </p>
            <span className="text-[11px] font-semibold text-emerald-600 mt-0.5 inline-block">
              {classes.length > 0 ? Math.round((classesWithHomeroom / classes.length) * 100) : 0}% Terisi
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Rata-rata Kapasitas */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Rata-rata Siswa</p>
            <p className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">
              {avgStudentsPerClass} <span className="text-sm font-semibold text-gray-400">/ Rombel</span>
            </p>
            <span className="text-[11px] font-semibold text-gray-400 mt-0.5 inline-block">
              Ideal 32-36 Siswa
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ================= FILTER & SEARCH TOOLBAR ================= */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-2xs flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Search & Level Pills */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          {/* Search box */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input 
              type="text"
              placeholder="Cari nama kelas, wali, jurusan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Level Tabs */}
          <div className="flex items-center gap-1 p-1 bg-gray-100/80 rounded-xl overflow-x-auto w-full sm:w-auto shrink-0">
            {["All", "Kelas 10", "Kelas 11", "Kelas 12"].map((lvl) => {
              const isActive = selectedLevel === lvl;
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSelectedLevel(lvl)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer",
                    isActive 
                      ? "bg-white text-[#531FFF] shadow-2xs" 
                      : "text-gray-500 hover:text-gray-800"
                  )}
                >
                  {lvl === "All" ? "Semua Tingkat" : lvl}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right side: Major filter & View Switcher */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end">
          <select
            value={selectedMajor}
            onChange={(e) => setSelectedMajor(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 cursor-pointer"
          >
            <option value="All">Semua Jurusan</option>
            <option value="IPA">IPA / MIPA</option>
            <option value="IPS">IPS</option>
            <option value="Bahasa">Bahasa</option>
            <option value="Kejuruan">Kejuruan</option>
          </select>

          {/* View Format Switcher */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200/60 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                viewMode === "grid" 
                  ? "bg-white text-[#531FFF] shadow-xs" 
                  : "text-gray-400 hover:text-gray-700"
              )}
              title="Tampilan Kartu"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                viewMode === "table" 
                  ? "bg-white text-[#531FFF] shadow-xs" 
                  : "text-gray-400 hover:text-gray-700"
              )}
              title="Tampilan Tabel"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ================= MAIN CLASSES LISTING ================= */}
      {loading ? (
        <div className="py-24 bg-white border border-gray-100 rounded-3xl flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#531FFF]" />
          <p className="text-xs font-bold text-gray-500">Memuat daftar kelas...</p>
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="py-20 bg-white border border-gray-100 rounded-3xl flex flex-col items-center justify-center text-center p-6 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-purple-50 text-[#531FFF] flex items-center justify-center">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900">Tidak ada kelas ditemukan</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-md">
              {searchQuery || selectedLevel !== "All" || selectedMajor !== "All"
                ? "Tidak ada kelas yang cocok dengan filter. Coba ubah kata kunci atau reset filter."
                : "Belum ada kelas terdaftar. Buat kelas baru atau klik template rombel di atas."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedLevel("All");
              setSelectedMajor("All");
            }}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Reset Filter
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* ================= GRID CARDS VIEW ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredClasses.map((item) => {
            const enrolled = classStudentsMap.get(item.name) || [];
            const capacity = Number(item.maxCapacity) || 36;
            const fillPercentage = Math.min(Math.round((enrolled.length / capacity) * 100), 100);

            return (
              <div
                key={item._firestoreId}
                className="bg-white hover:bg-gradient-to-b hover:from-white hover:to-purple-50/20 border border-gray-100 hover:border-[#531FFF]/30 rounded-3xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top Bar: Level & Major pills + Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {item.level || "Kelas 10"}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        {item.major || "IPA"}
                      </span>
                    </div>

                    <span className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border",
                      (item.status || "Aktif") === "Aktif"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-gray-100 text-gray-500 border-gray-200"
                    )}>
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        (item.status || "Aktif") === "Aktif" ? "bg-emerald-500" : "bg-gray-400"
                      )} />
                      {item.status || "Aktif"}
                    </span>
                  </div>

                  {/* Class Name */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#531FFF] to-[#7B42FF] text-white flex items-center justify-center font-black text-lg shadow-md shadow-[#531FFF]/20 shrink-0">
                      {item.name.slice(0, 3)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xl font-black text-gray-900 group-hover:text-[#531FFF] transition-colors truncate">
                        {item.name}
                      </h3>
                      <p className="text-xs text-gray-400 font-semibold truncate">
                        ID: {item.id || item._firestoreId.slice(0, 6)}
                      </p>
                    </div>
                  </div>

                  {/* Homeroom Teacher */}
                  <div className="mt-4 pt-3.5 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-400">Wali Kelas:</span>
                    {item.homeroom ? (
                      <div className="flex items-center gap-1.5 font-bold text-gray-800">
                        <div className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-[10px] font-black">
                          {item.homeroom.charAt(0)}
                        </div>
                        <span className="truncate max-w-[160px]">{item.homeroom}</span>
                      </div>
                    ) : (
                      <span className="font-semibold text-gray-400 italic">Belum ditentukan</span>
                    )}
                  </div>

                  {/* Capacity Bar & Student Stack */}
                  <div className="mt-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-gray-700">
                        <Users className="w-3.5 h-3.5 text-[#531FFF]" />
                        <span>Kapasitas Rombel:</span>
                      </div>
                      <span className="font-black text-gray-900">
                        {enrolled.length} <span className="text-gray-400 font-semibold">/ {capacity} Siswa</span>
                      </span>
                    </div>

                    {/* Progress Track */}
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          fillPercentage >= 95
                            ? "bg-rose-500"
                            : fillPercentage >= 75
                              ? "bg-amber-500"
                              : "bg-gradient-to-r from-[#531FFF] to-purple-400"
                        )}
                        style={{ width: `${Math.max(fillPercentage, 3)}%` }}
                      />
                    </div>

                    {/* Student Avatars Stack Preview */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex -space-x-2 overflow-hidden">
                        {enrolled.slice(0, 5).map((s, idx) => (
                          <div 
                            key={s._firestoreId || idx}
                            className="inline-block h-6 w-6 rounded-full ring-2 ring-white overflow-hidden bg-gray-200"
                            title={s.fullName || s.name}
                          >
                            {s.imageUrl ? (
                              <img src={s.imageUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full bg-[#531FFF] text-white text-[9px] font-bold flex items-center justify-center">
                                {(s.fullName || s.name || "S").charAt(0)}
                              </div>
                            )}
                          </div>
                        ))}
                        {enrolled.length > 5 && (
                          <div className="inline-flex h-6 w-6 rounded-full ring-2 ring-white bg-gray-100 text-[10px] font-bold text-gray-600 items-center justify-center">
                            +{enrolled.length - 5}
                          </div>
                        )}
                      </div>

                      <span className="text-[11px] font-semibold text-gray-400">
                        {capacity - enrolled.length} slot tersisa
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions Bar */}
                <div className="mt-5 pt-3.5 border-t border-gray-100 flex items-center justify-between gap-2">
                  {/* PROMINENT "KELOLA SISWA" BUTTON */}
                  <button
                    type="button"
                    onClick={() => {
                      setManagingClass(item);
                      setManageTab("enrolled");
                      setSelectedStudentIdsToAdd([]);
                      setManageSearch("");
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-purple-50 hover:bg-[#531FFF] text-[#531FFF] hover:text-white rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer group/btn"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Kelola Siswa ({enrolled.length})</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCrudState({ open: true, mode: "view", data: item })}
                      className="p-2 rounded-xl text-gray-400 hover:text-[#531FFF] hover:bg-purple-50 transition-all cursor-pointer"
                      title="Lihat Detail Kelas"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCrudState({ open: true, mode: "edit", data: item })}
                      className="p-2 rounded-xl text-gray-400 hover:text-[#531FFF] hover:bg-purple-50 transition-all cursor-pointer"
                      title="Edit Kelas"
                    >
                      <PenTool className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCrudState({ open: true, mode: "delete", data: item })}
                      className="p-2 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                      title="Hapus Kelas"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= TABLE VIEW ================= */
        <div className="bg-white border border-gray-100 rounded-3xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/60 border-b border-gray-100">
                  <th className="py-3.5 px-6 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Nama Kelas</th>
                  <th className="py-3.5 px-6 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Tingkat</th>
                  <th className="py-3.5 px-6 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Jurusan</th>
                  <th className="py-3.5 px-6 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Wali Kelas</th>
                  <th className="py-3.5 px-6 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider text-center">Siswa / Kapasitas</th>
                  <th className="py-3.5 px-6 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider text-center">Status</th>
                  <th className="py-3.5 px-6 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredClasses.map((item) => {
                  const enrolled = classStudentsMap.get(item.name) || [];
                  const capacity = Number(item.maxCapacity) || 36;

                  return (
                    <tr key={item._firestoreId} className="hover:bg-purple-50/20 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center font-black text-xs">
                            {item.name.slice(0, 3)}
                          </div>
                          <div>
                            <div className="font-extrabold text-sm text-gray-900 group-hover:text-[#531FFF] transition-colors">
                              {item.name}
                            </div>
                            <div className="text-xs text-gray-400 font-medium">ID: {item.id || item._firestoreId.slice(0, 6)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-xs font-bold text-gray-700">
                        {item.level || "-"}
                      </td>
                      <td className="py-4 px-6 text-xs font-bold text-purple-700">
                        {item.major || "-"}
                      </td>
                      <td className="py-4 px-6 text-xs font-semibold text-gray-700">
                        {item.homeroom ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-[10px] font-black">
                              {item.homeroom.charAt(0)}
                            </div>
                            <span>{item.homeroom}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Belum Ada</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-[#531FFF] border border-purple-200/60 rounded-xl text-xs font-black">
                          <Users className="w-3 h-3" />
                          {enrolled.length} / {capacity}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                          (item.status || "Aktif") === "Aktif"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-gray-100 text-gray-500 border-gray-200"
                        )}>
                          {item.status || "Aktif"}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setManagingClass(item);
                              setManageTab("enrolled");
                              setSelectedStudentIdsToAdd([]);
                              setManageSearch("");
                            }}
                            className="px-3 py-1.5 bg-purple-50 hover:bg-[#531FFF] text-[#531FFF] hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            title="Kelola Siswa di Kelas Ini"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>Kelola ({enrolled.length})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCrudState({ open: true, mode: "view", data: item })}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#531FFF] hover:bg-purple-50 transition-colors cursor-pointer"
                            title="Lihat Detail"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCrudState({ open: true, mode: "edit", data: item })}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#531FFF] hover:bg-purple-50 transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <PenTool className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCrudState({ open: true, mode: "delete", data: item })}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ================= MODAL KELOLA SISWA DI DALAM KELAS ==================== */}
      {/* ========================================================================= */}
      {managingClass && (
        <div className="fixed inset-0 z-50 p-2 sm:p-6 bg-gray-950/60 backdrop-blur-xs flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50/80 via-white to-indigo-50/40 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#531FFF] text-white flex items-center justify-center font-black text-base shadow-md shadow-[#531FFF]/25">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">
                      Kelola Siswa: Kelas {managingClass.name}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {managingClass.level} • {managingClass.major}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium mt-0.5 flex items-center gap-3">
                    <span>Wali Kelas: <strong>{managingClass.homeroom || "Belum Ditentukan"}</strong></span>
                    <span>•</span>
                    <span>Kapasitas: <strong>{currentlyEnrolledStudents.length} / {managingClass.maxCapacity || 36} Siswa</strong></span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setManagingClass(null);
                  setTransferringStudent(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Segmented Sub-navigation Tabs */}
            <div className="px-6 pt-4 pb-2 border-b border-gray-100 flex items-center justify-between gap-4 bg-white shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setManageTab("enrolled")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer",
                    manageTab === "enrolled"
                      ? "bg-[#531FFF] text-white shadow-sm shadow-[#531FFF]/25"
                      : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                  )}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Daftar Siswa Kelas Ini</span>
                  <span className={cn(
                    "px-2 py-0.2 rounded-full text-[11px]",
                    manageTab === "enrolled" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
                  )}>
                    {currentlyEnrolledStudents.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setManageTab("add")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer",
                    manageTab === "add"
                      ? "bg-[#531FFF] text-white shadow-sm shadow-[#531FFF]/25"
                      : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                  )}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Tambah dari Database Siswa</span>
                </button>

                <button
                  type="button"
                  onClick={() => setManageTab("quickAdd")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer",
                    manageTab === "quickAdd"
                      ? "bg-[#531FFF] text-white shadow-sm shadow-[#531FFF]/25"
                      : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                  )}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Pendaftaran Siswa Baru</span>
                </button>
              </div>

              {manageTab === "enrolled" && (
                <span className="text-xs font-semibold text-gray-400 hidden sm:inline">
                  {Math.max((Number(managingClass.maxCapacity) || 36) - currentlyEnrolledStudents.length, 0)} kursi tersisa
                </span>
              )}
            </div>

            {/* Modal Body Container */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              
              {/* ================= TAB 1: ENROLLED STUDENTS ================= */}
              {manageTab === "enrolled" && (
                <div className="space-y-4">
                  {currentlyEnrolledStudents.length === 0 ? (
                    <div className="py-16 text-center space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-purple-50 text-[#531FFF] flex items-center justify-center mx-auto">
                        <Users className="w-7 h-7" />
                      </div>
                      <h4 className="text-base font-extrabold text-gray-900">Belum ada siswa di kelas ini</h4>
                      <p className="text-xs text-gray-500 max-w-sm mx-auto">
                        Kelas ini masih kosong. Klik tab &ldquo;Tambah dari Database Siswa&rdquo; untuk memasukkan siswa ke kelas ini.
                      </p>
                      <button
                        type="button"
                        onClick={() => setManageTab("add")}
                        className="px-4 py-2 bg-[#531FFF] text-white rounded-xl text-xs font-bold hover:bg-[#4314cc] transition-all cursor-pointer"
                      >
                        + Tambah Siswa Sekarang
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {currentlyEnrolledStudents.map((s, idx) => (
                        <div
                          key={s._firestoreId || idx}
                          className="bg-white border border-gray-100 hover:border-purple-200 rounded-2xl p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 ring-2 ring-gray-100 shrink-0">
                              {s.imageUrl ? (
                                <img src={s.imageUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-[#531FFF] text-white font-black text-sm flex items-center justify-center">
                                  {(s.fullName || s.name || "S").charAt(0)}
                                </div>
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm text-gray-900 group-hover:text-[#531FFF] transition-colors">
                                  {s.fullName || s.name}
                                </span>
                                {s.gender && (
                                  <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded">
                                    {s.gender}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-400 font-medium flex items-center gap-2 mt-0.5">
                                <span>NISN: {s.nisn || s.nis || s.id || "-"}</span>
                                {s.phone && (
                                  <>
                                    <span>•</span>
                                    <span>{s.phone}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 justify-end">
                            {/* Pindah Kelas Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setTransferringStudent(s);
                                setTargetClassId("");
                              }}
                              className="px-3 py-1.5 bg-gray-100 hover:bg-purple-50 text-gray-700 hover:text-[#531FFF] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                              title="Pindahkan ke kelas lain"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                              <span>Pindah Kelas</span>
                            </button>

                            {/* Keluarkan Button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveStudentFromClass(s)}
                              disabled={isProcessingStudent}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              title="Keluarkan dari kelas"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                              <span>Keluarkan</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ================= TAB 2: ADD FROM STUDENT DATABASE ================= */}
              {manageTab === "add" && (
                <div className="space-y-4">
                  {/* Search and Filters Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100">
                    <div className="relative w-full sm:w-80">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Cari nama atau NISN siswa..."
                        value={manageSearch}
                        onChange={(e) => setManageSearch(e.target.value)}
                        className="w-full pl-9 pr-7 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                      />
                      {manageSearch && (
                        <button onClick={() => setManageSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={onlyUnassigned}
                          onChange={(e) => setOnlyUnassigned(e.target.checked)}
                          className="rounded text-[#531FFF] focus:ring-[#531FFF] w-4 h-4 cursor-pointer"
                        />
                        <span>Hanya Belum Memiliki Kelas</span>
                      </label>
                    </div>
                  </div>

                  {/* Bulk Action Bar (when selected) */}
                  {selectedStudentIdsToAdd.length > 0 && (
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in duration-150">
                      <span className="text-xs font-bold text-[#531FFF]">
                        {selectedStudentIdsToAdd.length} siswa terpilih
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedStudentIdsToAdd([])}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-purple-100/60"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={handleBulkAddStudents}
                          disabled={isProcessingStudent}
                          className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-[#531FFF] hover:bg-[#4314cc] shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Masukkan Terpilih ke Kelas {managingClass.name}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* List of Available Students */}
                  {availableStudentsToAdd.length === 0 ? (
                    <div className="py-14 text-center space-y-2">
                      <AlertCircle className="w-8 h-8 text-gray-400 mx-auto" />
                      <p className="text-sm font-bold text-gray-800">Tidak ada siswa yang sesuai kriteria</p>
                      <p className="text-xs text-gray-400 max-w-sm mx-auto">
                        {onlyUnassigned 
                          ? "Semua siswa di sekolah sudah memiliki kelas. Hilangkan centang 'Hanya Belum Memiliki Kelas' untuk melihat seluruh siswa." 
                          : "Tidak ada siswa yang cocok dengan kata kunci pencarian."}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {availableStudentsToAdd.map((s) => {
                        const isSelected = selectedStudentIdsToAdd.includes(s._firestoreId);
                        const currentClass = s.classId || s.className || s.class;

                        return (
                          <div
                            key={s._firestoreId}
                            className={cn(
                              "p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3",
                              isSelected 
                                ? "bg-purple-50/60 border-[#531FFF] shadow-2xs" 
                                : "bg-white border-gray-100 hover:border-gray-200"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  setSelectedStudentIdsToAdd(prev => 
                                    e.target.checked 
                                      ? [...prev, s._firestoreId] 
                                      : prev.filter(id => id !== s._firestoreId)
                                  );
                                }}
                                className="w-4 h-4 rounded text-[#531FFF] focus:ring-[#531FFF] cursor-pointer"
                              />

                              <div className="w-9 h-9 rounded-xl bg-gray-100 overflow-hidden ring-1 ring-gray-200 shrink-0">
                                {s.imageUrl ? (
                                  <img src={s.imageUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-[#531FFF] text-white font-bold text-xs flex items-center justify-center">
                                    {(s.fullName || s.name || "S").charAt(0)}
                                  </div>
                                )}
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-extrabold text-gray-900">
                                    {s.fullName || s.name}
                                  </span>
                                  {s.gender && (
                                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded">
                                      {s.gender}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-gray-400 font-medium flex items-center gap-2 mt-0.5">
                                  <span>NISN: {s.nisn || s.nis || s.id || "-"}</span>
                                  <span>•</span>
                                  <span>Kelas Sekarang: <strong className={cn(currentClass ? "text-purple-600" : "text-amber-600")}>{currentClass || "Belum Ada"}</strong></span>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleAddSingleStudent(s)}
                              disabled={isProcessingStudent}
                              className="px-3.5 py-1.5 bg-purple-50 hover:bg-[#531FFF] text-[#531FFF] hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>Masukkan</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ================= TAB 3: QUICK REGISTER NEW STUDENT ================= */}
              {manageTab === "quickAdd" && (
                <div className="max-w-lg mx-auto py-4">
                  <form onSubmit={handleQuickCreateStudent} className="space-y-4 bg-gray-50/80 p-6 rounded-3xl border border-gray-100">
                    <div className="text-center space-y-1 mb-2">
                      <div className="w-12 h-12 rounded-2xl bg-purple-100 text-[#531FFF] flex items-center justify-center mx-auto mb-2">
                        <UserPlus className="w-6 h-6" />
                      </div>
                      <h4 className="text-base font-extrabold text-gray-900">Pendaftaran Siswa Cepat</h4>
                      <p className="text-xs text-gray-500">
                        Siswa baru akan langsung terdaftar di database dan masuk ke <strong>Kelas {managingClass.name}</strong>.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-gray-700">Nama Lengkap Siswa *</label>
                      <input
                        type="text"
                        placeholder="Contoh: Muhammad Farhan"
                        value={newStudentForm.name}
                        onChange={(e) => setNewStudentForm(prev => ({ ...prev, name: e.target.value }))}
                        required
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-gray-700">NISN / Nomor Induk Siswa</label>
                      <input
                        type="text"
                        placeholder="Contoh: 0081234567"
                        value={newStudentForm.nisn}
                        onChange={(e) => setNewStudentForm(prev => ({ ...prev, nisn: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-gray-700">Jenis Kelamin</label>
                      <div className="grid grid-cols-2 gap-2">
                        {["Laki-laki", "Perempuan"].map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setNewStudentForm(prev => ({ ...prev, gender: g }))}
                            className={cn(
                              "py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                              newStudentForm.gender === g
                                ? "bg-[#531FFF] text-white border-[#531FFF]"
                                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                            )}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3">
                      <button
                        type="submit"
                        disabled={isProcessingStudent || !newStudentForm.name.trim()}
                        className="w-full py-2.5 bg-[#531FFF] hover:bg-[#4314cc] text-white rounded-xl text-xs font-extrabold shadow-md shadow-[#531FFF]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isProcessingStudent ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Mendaftarkan...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            <span>Daftarkan &amp; Masukkan ke {managingClass.name}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-gray-100 bg-white flex items-center justify-between shrink-0">
              <span className="text-xs font-semibold text-gray-400">
                Perubahan data langsung tersimpan di sistem sekolah.
              </span>
              <button
                type="button"
                onClick={() => {
                  setManagingClass(null);
                  setTransferringStudent(null);
                }}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Selesai
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ================= TRANSFER STUDENT TO ANOTHER CLASS MODAL =============== */}
      {/* ========================================================================= */}
      {transferringStudent && (
        <div className="fixed inset-0 z-60 p-4 bg-gray-950/70 backdrop-blur-xs flex items-center justify-center animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-gray-100 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-[#531FFF] flex items-center justify-center shrink-0">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-black text-gray-900">Pindahkan Siswa</h4>
                <p className="text-xs text-gray-500 font-medium">
                  {transferringStudent.fullName || transferringStudent.name}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-gray-700">Pilih Kelas Tujuan:</label>
              <select
                value={targetClassId}
                onChange={(e) => setTargetClassId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] cursor-pointer"
              >
                <option value="">-- Pilih Kelas Tujuan --</option>
                {classes
                  .filter(c => c.name !== managingClass?.name)
                  .map(c => (
                    <option key={c._firestoreId} value={c.name}>
                      {c.name} ({c.level} • {c.major})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTransferringStudent(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleTransferStudent}
                disabled={!targetClassId || isProcessingStudent}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#531FFF] hover:bg-[#4314cc] shadow-md shadow-[#531FFF]/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isProcessingStudent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Pindahkan Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
