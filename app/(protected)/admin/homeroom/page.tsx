"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { 
  GraduationCap, 
  Search, 
  PenTool, 
  Loader2, 
  Users,
  LayoutGrid,
  List,
  Download,
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  UserCheck,
  Plus,
  UserMinus,
  ShieldCheck,
  Check,
  ArrowRight,
  MessageCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { db, auth } from "@/lib/firebase";
import { 
  collection, 
  query, 
  onSnapshot, 
  updateDoc, 
  doc, 
  serverTimestamp 
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function HomeroomPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"classes" | "teachers">("classes");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state for Classes Tab
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");

  // Filters state for Teachers Tab
  const [teacherSearch, setTeacherSearch] = useState("");
  const [teacherFilterStatus, setTeacherFilterStatus] = useState<"all" | "available" | "assigned">("all");

  // Assign Modal State
  const [assignModal, setAssignModal] = useState<{
    open: boolean;
    targetClass?: any;
    preSelectedTeacher?: any;
  }>({
    open: false,
    targetClass: undefined,
    preSelectedTeacher: undefined
  });

  // Unassign Confirm Modal State
  const [unassignModal, setUnassignModal] = useState<{
    open: boolean;
    targetClass?: any;
  }>({
    open: false,
    targetClass: undefined
  });

  // Search inside assign modal
  const [modalSearch, setModalSearch] = useState("");
  const [modalFilter, setModalFilter] = useState<"all" | "available" | "assigned">("available");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Listen to classes and teachers
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
          const teachersData = snapshot.docs.map(doc => {
            const raw = doc.data();
            const nip = raw.id || raw.nip || "";
            const role = raw.role || raw.subject || "Guru Pengajar";
            const contact = raw.contact || raw.phone || "";
            return {
              _firestoreId: doc.id,
              ...raw,
              id: nip,
              nip: nip,
              role: role,
              subject: role,
              contact: contact,
              phone: contact,
              status: raw.status || "Aktif",
            };
          });
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

  // Map of which teacher is assigned to which class
  // Key: teacher's normalized name (lowercase) -> class info
  const teacherHomeroomMap = useMemo(() => {
    const map = new Map<string, any>();
    classes.forEach(c => {
      if (c.homeroom && String(c.homeroom).trim() !== "") {
        const normName = String(c.homeroom).trim().toLowerCase();
        map.set(normName, c);
      }
    });
    return map;
  }, [classes]);

  // Statistics
  const totalClasses = classes.length;
  const filledHomerooms = classes.filter(c => c.homeroom && String(c.homeroom).trim() !== "").length;
  const emptyHomerooms = totalClasses - filledHomerooms;
  const assignmentPercentage = totalClasses > 0 ? Math.round((filledHomerooms / totalClasses) * 100) : 0;
  
  // Teachers allocation statistics
  const availableTeachers = useMemo(() => {
    return teachers.filter(t => !teacherHomeroomMap.has(String(t.name).trim().toLowerCase()));
  }, [teachers, teacherHomeroomMap]);

  // Filtered Classes List
  const filteredClasses = useMemo(() => {
    return classes.filter(cls => {
      const matchSearch = !searchQuery || 
        (cls.name && cls.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (cls.level && cls.level.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (cls.major && cls.major.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (cls.homeroom && cls.homeroom.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchLevel = selectedLevel === "All" || cls.level === selectedLevel;
      
      const isFilled = Boolean(cls.homeroom && String(cls.homeroom).trim() !== "");
      const matchStatus = selectedStatus === "All" || 
        (selectedStatus === "Terisi" && isFilled) || 
        (selectedStatus === "Belum" && !isFilled);

      return matchSearch && matchLevel && matchStatus;
    });
  }, [classes, searchQuery, selectedLevel, selectedStatus]);

  // Filtered Teachers List
  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      const matchSearch = !teacherSearch ||
        (t.name && t.name.toLowerCase().includes(teacherSearch.toLowerCase())) ||
        (t.nip && t.nip.toLowerCase().includes(teacherSearch.toLowerCase())) ||
        (t.role && t.role.toLowerCase().includes(teacherSearch.toLowerCase())) ||
        (t.contact && t.contact.toLowerCase().includes(teacherSearch.toLowerCase()));

      const isAssigned = teacherHomeroomMap.has(String(t.name).trim().toLowerCase());
      const matchFilter = 
        teacherFilterStatus === "all" ||
        (teacherFilterStatus === "available" && !isAssigned) ||
        (teacherFilterStatus === "assigned" && isAssigned);

      return matchSearch && matchFilter;
    });
  }, [teachers, teacherSearch, teacherFilterStatus, teacherHomeroomMap]);

  // Level options
  const levelOptions = useMemo(() => {
    const list = Array.from(new Set(classes.map(c => c.level).filter(Boolean)));
    return list.sort();
  }, [classes]);

  // Open assign modal for a specific class
  const handleOpenAssignModal = (cls: any) => {
    const currentTeacher = teachers.find(
      t => String(t.name).trim().toLowerCase() === String(cls.homeroom).trim().toLowerCase()
    );
    setSelectedTeacherId(currentTeacher?._firestoreId || "");
    setModalSearch("");
    setModalFilter("available");
    setAssignModal({
      open: true,
      targetClass: cls,
      preSelectedTeacher: undefined
    });
  };

  // Open assign modal for a teacher to choose a class
  const handleAssignTeacherToClass = (teacher: any) => {
    setSelectedTeacherId(teacher._firestoreId);
    setModalSearch("");
    setModalFilter("all");
    // Pick the first empty class if available
    const firstEmptyClass = classes.find(c => !c.homeroom || String(c.homeroom).trim() === "");
    setAssignModal({
      open: true,
      targetClass: firstEmptyClass || classes[0],
      preSelectedTeacher: teacher
    });
  };

  // Execute assignment
  const handleSaveAssignment = async () => {
    if (!assignModal.targetClass?._firestoreId) {
      toast.showError("Target kelas tidak valid.", "Gagal");
      return;
    }

    try {
      setIsSaving(true);
      const selectedTeacher = teachers.find(t => t._firestoreId === selectedTeacherId);

      const targetDocId = assignModal.targetClass._firestoreId;
      const newHomeroomName = selectedTeacher ? selectedTeacher.name : "";
      const newHomeroomNip = selectedTeacher ? (selectedTeacher.nip || selectedTeacher.id || "") : "";
      const newHomeroomContact = selectedTeacher ? (selectedTeacher.contact || selectedTeacher.phone || "") : "";

      await updateDoc(doc(db, "classes", targetDocId), {
        homeroom: newHomeroomName,
        homeroomNip: newHomeroomNip,
        homeroomContact: newHomeroomContact,
        updatedAt: serverTimestamp()
      });

      // Optimistic update
      setClasses(prev => prev.map(c => {
        if (c._firestoreId === targetDocId) {
          return {
            ...c,
            homeroom: newHomeroomName,
            homeroomNip: newHomeroomNip,
            homeroomContact: newHomeroomContact
          };
        }
        return c;
      }));

      if (newHomeroomName) {
        toast.showSuccess(
          `${newHomeroomName} berhasil ditetapkan sebagai wali kelas ${assignModal.targetClass.name}.`,
          "Wali Kelas Ditetapkan"
        );
      } else {
        toast.showEdit(
          `Penugasan wali kelas untuk ${assignModal.targetClass.name} telah dikosongkan.`,
          "Wali Kelas Dikosongkan"
        );
      }

      setAssignModal({ open: false });
    } catch (error: any) {
      console.error("Error updating homeroom:", error);
      toast.showError(error?.message || "Gagal memperbarui penugasan wali kelas.", "Gagal");
    } finally {
      setIsSaving(false);
    }
  };

  // Execute unassign
  const handleConfirmUnassign = async () => {
    if (!unassignModal.targetClass?._firestoreId) return;

    try {
      setIsSaving(true);
      const targetDocId = unassignModal.targetClass._firestoreId;
      const prevTeacher = unassignModal.targetClass.homeroom;

      await updateDoc(doc(db, "classes", targetDocId), {
        homeroom: "",
        homeroomNip: "",
        homeroomContact: "",
        updatedAt: serverTimestamp()
      });

      setClasses(prev => prev.map(c => {
        if (c._firestoreId === targetDocId) {
          return { ...c, homeroom: "", homeroomNip: "", homeroomContact: "" };
        }
        return c;
      }));

      toast.showEdit(
        `Penugasan ${prevTeacher || "guru"} pada kelas ${unassignModal.targetClass.name} berhasil dilepas.`,
        "Wali Kelas Dilepas"
      );
      setUnassignModal({ open: false });
    } catch (error: any) {
      console.error("Error unassigning homeroom:", error);
      toast.showError("Gagal melepas penugasan wali kelas.", "Gagal");
    } finally {
      setIsSaving(false);
    }
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    if (filteredClasses.length === 0) return;
    const headers = ["Nama Kelas", "Tingkat", "Jurusan", "Total Siswa", "Nama Wali Kelas", "NIP Wali", "Kontak Wali", "Status"];
    const rows = filteredClasses.map(c => {
      const isFilled = Boolean(c.homeroom && String(c.homeroom).trim() !== "");
      const teacherMatch = teachers.find(t => String(t.name).trim().toLowerCase() === String(c.homeroom).trim().toLowerCase());
      const nip = c.homeroomNip || teacherMatch?.nip || "-";
      const contact = c.homeroomContact || teacherMatch?.contact || "-";

      return [
        `"${c.name || ""}"`,
        `"${c.level || ""}"`,
        `"${c.major || ""}"`,
        `"${c.students || 0}"`,
        `"${c.homeroom || "Belum Ditetapkan"}"`,
        `"${nip}"`,
        `"${contact}"`,
        `"${isFilled ? "Terisi" : "Belum Diisi"}"`
      ];
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `data_wali_kelas_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isFiltered = searchQuery !== "" || selectedLevel !== "All" || selectedStatus !== "All";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedLevel("All");
    setSelectedStatus("All");
  };

  // Modal teacher filter list
  const modalFilteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      const matchSearch = !modalSearch ||
        (t.name && t.name.toLowerCase().includes(modalSearch.toLowerCase())) ||
        (t.nip && t.nip.toLowerCase().includes(modalSearch.toLowerCase())) ||
        (t.role && t.role.toLowerCase().includes(modalSearch.toLowerCase()));

      const assignedClass = teacherHomeroomMap.get(String(t.name).trim().toLowerCase());
      const isAssigned = Boolean(assignedClass);
      const isAssignedToThisClass = assignedClass?._firestoreId === assignModal.targetClass?._firestoreId;

      if (modalFilter === "available") {
        return matchSearch && (!isAssigned || isAssignedToThisClass);
      }
      if (modalFilter === "assigned") {
        return matchSearch && isAssigned && !isAssignedToThisClass;
      }
      return matchSearch;
    });
  }, [teachers, modalSearch, modalFilter, teacherHomeroomMap, assignModal.targetClass]);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto w-full h-full space-y-6 animate-in fade-in duration-300">
      
      {/* PAGE HEADER */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-[#531FFF]/5 via-[#531FFF]/2 to-transparent pointer-events-none" />
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#531FFF] to-[#7B42FF] flex items-center justify-center text-white shadow-lg shadow-[#531FFF]/25 shrink-0">
            <UserCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Manajemen Wali Kelas</h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-black bg-[#531FFF]/10 text-[#531FFF] border border-[#531FFF]/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                Sistem Penugasan
              </span>
            </div>
            <p className="text-gray-500 text-xs sm:text-sm font-medium mt-1">
              Atur penetapan staf pengajar sebagai wali kelas, pantau rasio kelas terisi, dan koordinasikan pendampingan siswa.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button 
            onClick={handleExportCSV}
            disabled={filteredClasses.length === 0}
            className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-bold border border-gray-200 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#531FFF]" />
            <span className="hidden sm:inline">Export Rekap CSV</span>
          </button>
        </div>
      </div>

      {/* KPI METRICS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Kelas */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Total Kelas</p>
            <h3 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1 tracking-tight">{totalClasses}</h3>
            <p className="text-[11px] font-semibold text-gray-400 mt-0.5">Rombongan Belajar</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#531FFF]/10 flex items-center justify-center text-[#531FFF] shrink-0 font-bold">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>

        {/* Kelas Berwali & Progress */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-wider">Kelas Berwali</p>
              <h3 className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1 tracking-tight">
                {filledHomerooms} <span className="text-sm text-gray-400 font-bold">/ {totalClasses}</span>
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0 font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 mb-1">
              <span>Rasio Terisi</span>
              <span>{assignmentPercentage}%</span>
            </div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${assignmentPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Belum Ada Wali */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-extrabold text-rose-600 uppercase tracking-wider">Belum Ada Wali</p>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-2xl sm:text-3xl font-black text-rose-700 tracking-tight">{emptyHomerooms}</h3>
              {emptyHomerooms > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 animate-pulse">
                  Perlu Ditindak
                </span>
              )}
            </div>
            <p className="text-[11px] font-semibold text-gray-400 mt-0.5">Memerlukan Penugasan</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-700 shrink-0 font-bold">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Guru Siap Ditugaskan */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-extrabold text-blue-600 uppercase tracking-wider">Guru Bebas Tugas Wali</p>
            <h3 className="text-2xl sm:text-3xl font-black text-blue-700 mt-1 tracking-tight">
              {availableTeachers.length} <span className="text-sm text-gray-400 font-bold">/ {teachers.length} Guru</span>
            </h3>
            <p className="text-[11px] font-semibold text-gray-400 mt-0.5">Tersedia untuk Ditugaskan</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700 shrink-0 font-bold">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* CALLOUT BANNER IF THERE ARE UNASSIGNED CLASSES */}
      {emptyHomerooms > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0 font-bold">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-amber-950">
                Peringatan: {emptyHomerooms} Kelas Belum Memiliki Wali Kelas!
              </h4>
              <p className="text-xs font-semibold text-amber-800/80 mt-0.5">
                Segera tetapkan guru pendamping kelas agar administrasi absensi, rapor, dan koordinasi wali murid berjalan tertib.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveTab("classes");
              setSelectedStatus("Belum");
            }}
            className="px-4 py-2 rounded-xl text-xs font-extrabold text-amber-900 bg-amber-200/80 hover:bg-amber-300 transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>Tampilkan Kelas Belum Terisi</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* DUAL VIEW NAVIGATION TABS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-gray-200/80 pb-2">
        <div className="flex items-center gap-2 bg-gray-100/90 p-1.5 rounded-2xl border border-gray-200">
          <button
            onClick={() => setActiveTab("classes")}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer",
              activeTab === "classes"
                ? "bg-white text-gray-900 shadow-md shadow-black/5"
                : "text-gray-500 hover:text-gray-900"
            )}
          >
            <GraduationCap className="w-4 h-4 text-[#531FFF]" />
            <span>Penugasan Per Kelas</span>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-black",
              activeTab === "classes" ? "bg-[#531FFF]/10 text-[#531FFF]" : "bg-gray-200 text-gray-600"
            )}>
              {classes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("teachers")}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer",
              activeTab === "teachers"
                ? "bg-white text-gray-900 shadow-md shadow-black/5"
                : "text-gray-500 hover:text-gray-900"
            )}
          >
            <Users className="w-4 h-4 text-[#531FFF]" />
            <span>Matriks Beban & Alokasi Guru</span>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-black",
              activeTab === "teachers" ? "bg-[#531FFF]/10 text-[#531FFF]" : "bg-gray-200 text-gray-600"
            )}>
              {teachers.length}
            </span>
          </button>
        </div>

        {activeTab === "classes" && (
          <div className="flex items-center justify-between sm:justify-end gap-3">
            <span className="text-xs font-bold text-gray-400">
              {filteredClasses.length} dari {classes.length} Kelas
            </span>

            <div className="flex items-center bg-gray-100 p-1 rounded-xl shrink-0 border border-gray-200">
              <button 
                onClick={() => setViewMode("grid")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer", 
                  viewMode === "grid" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
                )}
                title="Tampilan Grid Card"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Grid Card</span>
              </button>
              <button 
                onClick={() => setViewMode("list")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer", 
                  viewMode === "list" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
                )}
                title="Tampilan Tabel Rapi"
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">Tabel</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PENUGASAN PER KELAS                                                */}
      {/* ========================================================================= */}
      {activeTab === "classes" && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Search Box */}
              <div className="relative flex-1 min-w-[220px] max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama kelas, tingkat, jurusan, atau wali kelas..." 
                  className="w-full pl-9 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Tingkat Dropdown */}
              <div className="relative min-w-[140px]">
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="w-full pl-3.5 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] appearance-none cursor-pointer"
                >
                  <option value="All">Semua Tingkat</option>
                  {levelOptions.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              {/* Status Dropdown */}
              <div className="relative min-w-[150px]">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full pl-3.5 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] appearance-none cursor-pointer"
                >
                  <option value="All">Semua Status</option>
                  <option value="Terisi">Terisi Wali Kelas</option>
                  <option value="Belum">Belum Ada Wali</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              {/* Reset Filter Button */}
              {isFiltered && (
                <button
                  onClick={handleResetFilters}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset Filter</span>
                </button>
              )}
            </div>
          </div>

          {/* Main Classes Content */}
          {loading ? (
            <div className="py-24 bg-white rounded-3xl border border-gray-100 flex flex-col items-center justify-center gap-3 text-gray-400 shadow-xs">
              <Loader2 className="w-8 h-8 animate-spin text-[#531FFF]" />
              <p className="text-sm font-semibold">Memuat penugasan wali kelas...</p>
            </div>
          ) : (
            <>
              {/* GRID CARD VIEW */}
              {viewMode === "grid" && filteredClasses.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {filteredClasses.map((item, i) => {
                    const hasHomeroom = Boolean(item.homeroom && String(item.homeroom).trim() !== "");
                    const teacherMatch = hasHomeroom 
                      ? teachers.find(t => String(t.name).trim().toLowerCase() === String(item.homeroom).trim().toLowerCase()) 
                      : null;
                    const teacherPhoto = teacherMatch?.imageUrl || "";
                    const teacherRole = teacherMatch?.role || teacherMatch?.subject || "Guru Pengajar";
                    const teacherNip = item.homeroomNip || teacherMatch?.nip || teacherMatch?.id || "-";
                    const teacherPhone = item.homeroomContact || teacherMatch?.contact || teacherMatch?.phone || "";

                    return (
                      <div 
                        key={item._firestoreId || i}
                        className={cn(
                          "group bg-white rounded-3xl border transition-all duration-300 relative overflow-hidden flex flex-col justify-between",
                          hasHomeroom 
                            ? "border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_30px_-8px_rgba(83,31,255,0.14)] hover:-translate-y-1"
                            : "border-rose-200/80 bg-rose-50/20 shadow-xs hover:border-rose-300"
                        )}
                      >
                        {/* Card Header */}
                        <div>
                          <div className={cn(
                            "p-4 flex items-start justify-between border-b",
                            hasHomeroom 
                              ? "bg-gradient-to-r from-[#531FFF]/10 via-[#6E3BFF]/5 to-transparent border-gray-100" 
                              : "bg-rose-500/10 border-rose-100"
                          )}>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-base font-black text-gray-900 tracking-tight">
                                  {item.name || "Kelas"}
                                </span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-white text-gray-700 border border-gray-200 shadow-2xs">
                                  {item.level || "Kelas 10"}
                                </span>
                              </div>
                              <p className="text-[11px] font-semibold text-gray-500 mt-0.5">
                                Jurusan: <span className="text-gray-800 font-bold">{item.major || "Umum"}</span> • {item.students || 0} Siswa
                              </p>
                            </div>

                            {/* Status Pill */}
                            <span className={cn(
                              "px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 border shadow-2xs",
                              hasHomeroom
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200 animate-pulse"
                            )}>
                              <span className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                hasHomeroom ? "bg-emerald-500" : "bg-rose-500"
                              )} />
                              {hasHomeroom ? "Terisi" : "Belum Ada"}
                            </span>
                          </div>

                          {/* Card Body - Homeroom Teacher Profile */}
                          <div className="p-4 sm:p-5">
                            {hasHomeroom ? (
                              <div className="space-y-3.5">
                                <div className="flex items-center gap-3.5">
                                  <div className="w-13 h-13 rounded-2xl ring-2 ring-[#531FFF]/20 bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center font-extrabold text-lg shrink-0 overflow-hidden relative border border-gray-100">
                                    {teacherPhoto ? (
                                      <Image 
                                        src={teacherPhoto} 
                                        alt={item.homeroom} 
                                        fill 
                                        className="object-cover" 
                                        unoptimized 
                                      />
                                    ) : (
                                      <span>{item.homeroom.charAt(0).toUpperCase()}</span>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <h4 className="font-extrabold text-sm text-gray-900 truncate group-hover:text-[#531FFF] transition-colors" title={item.homeroom}>
                                        {item.homeroom}
                                      </h4>
                                    </div>
                                    <p className="text-[11px] font-semibold text-[#531FFF] truncate">
                                      {teacherRole}
                                    </p>
                                    <p className="text-[11px] font-medium text-gray-400 truncate mt-0.5">
                                      NIP: <span className="text-gray-600">{teacherNip}</span>
                                    </p>
                                  </div>
                                </div>

                                {/* WhatsApp Quick Action if phone exists */}
                                {teacherPhone && (
                                  <div className="pt-1 flex items-center justify-between text-xs bg-emerald-50/70 border border-emerald-100 rounded-xl px-3 py-1.5">
                                    <span className="text-[11px] font-semibold text-emerald-800 truncate">
                                      {teacherPhone}
                                    </span>
                                    <a
                                      href={`https://wa.me/${teacherPhone.replace(/[^0-9]/g, "")}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 hover:text-emerald-900 hover:underline"
                                      title="Kirim pesan WhatsApp"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Chat WA</span>
                                    </a>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="py-6 px-3 border-2 border-dashed border-rose-200 rounded-2xl text-center flex flex-col items-center justify-center gap-2 bg-white">
                                <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center">
                                  <UserCheck className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="text-xs font-extrabold text-gray-800">Belum Ada Wali Kelas</p>
                                  <p className="text-[11px] text-gray-400 font-medium">Klik tombol di bawah untuk menetapkan guru</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Card Action Footer */}
                        <div className="p-4 pt-3 border-t border-gray-100/90 flex items-center gap-2 bg-gray-50/50 rounded-b-3xl">
                          {hasHomeroom ? (
                            <>
                              <button
                                onClick={() => handleOpenAssignModal(item)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white hover:bg-[#531FFF] text-gray-700 hover:text-white border border-gray-200 hover:border-[#531FFF] text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                              >
                                <PenTool className="w-3.5 h-3.5 text-[#531FFF] group-hover:text-white" />
                                <span>Ganti Wali</span>
                              </button>
                              
                              <button
                                onClick={() => setUnassignModal({ open: true, targetClass: item })}
                                className="p-2.5 rounded-xl bg-white hover:bg-rose-50 text-gray-400 hover:text-rose-600 border border-gray-200 hover:border-rose-200 transition-colors shadow-2xs cursor-pointer"
                                title="Lepas Penugasan Wali Kelas"
                              >
                                <UserMinus className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleOpenAssignModal(item)}
                              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#531FFF] hover:bg-[#4314cc] text-white text-xs font-extrabold shadow-md shadow-[#531FFF]/20 transition-all cursor-pointer active:scale-95"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Tetapkan Wali Kelas</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* LIST / TABLE VIEW */}
              {viewMode === "list" && filteredClasses.length > 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-400 text-[11px] font-extrabold uppercase tracking-wider">
                          <th className="py-4 px-6">Nama Kelas</th>
                          <th className="py-4 px-6">Tingkat & Jurusan</th>
                          <th className="py-4 px-6">Total Siswa</th>
                          <th className="py-4 px-6">Wali Kelas Ditetapkan</th>
                          <th className="py-4 px-6">Kontak WhatsApp</th>
                          <th className="py-4 px-6">Status</th>
                          <th className="py-4 px-6 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredClasses.map((item, i) => {
                          const hasHomeroom = Boolean(item.homeroom && String(item.homeroom).trim() !== "");
                          const teacherMatch = hasHomeroom 
                            ? teachers.find(t => String(t.name).trim().toLowerCase() === String(item.homeroom).trim().toLowerCase()) 
                            : null;
                          const teacherPhone = item.homeroomContact || teacherMatch?.contact || teacherMatch?.phone || "";

                          return (
                            <tr key={item._firestoreId || i} className="hover:bg-purple-50/20 transition-colors group">
                              <td className="py-4 px-6 font-extrabold text-sm text-gray-900">
                                {item.name || "-"}
                              </td>
                              <td className="py-4 px-6 font-semibold text-xs text-gray-600">
                                <span className="font-bold text-gray-800">{item.level || "-"}</span> • {item.major || "Umum"}
                              </td>
                              <td className="py-4 px-6 font-bold text-xs text-gray-700">
                                {item.students || 0} Siswa
                              </td>
                              <td className="py-4 px-6">
                                {hasHomeroom ? (
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-[#531FFF]/10 text-[#531FFF] font-extrabold text-xs flex items-center justify-center border border-[#531FFF]/20 shrink-0">
                                      {item.homeroom.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="font-bold text-sm text-gray-900 leading-tight">{item.homeroom}</p>
                                      <p className="text-[11px] text-gray-400 font-medium">
                                        {teacherMatch?.role || "Guru Pengajar"}
                                      </p>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="inline-flex py-1 px-2.5 bg-rose-50 text-rose-600 rounded-md text-xs font-bold border border-rose-200">
                                    Belum Diisi
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-6 text-xs font-semibold text-gray-600">
                                {teacherPhone ? (
                                  <a
                                    href={`https://wa.me/${teacherPhone.replace(/[^0-9]/g, "")}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-900 font-bold hover:underline"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>{teacherPhone}</span>
                                  </a>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="py-4 px-6">
                                <span className={cn(
                                  "px-2.5 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1.5 border",
                                  hasHomeroom
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-rose-50 text-rose-700 border-rose-200"
                                )}>
                                  <span className={cn("w-1.5 h-1.5 rounded-full", hasHomeroom ? "bg-emerald-500" : "bg-rose-500")} />
                                  {hasHomeroom ? "Terisi" : "Belum Ada"}
                                </span>
                              </td>
                              <td className="py-4 px-6 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {hasHomeroom ? (
                                    <>
                                      <button
                                        onClick={() => handleOpenAssignModal(item)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#531FFF] bg-[#531FFF]/10 hover:bg-[#531FFF]/20 rounded-xl transition-colors cursor-pointer"
                                      >
                                        <PenTool className="w-3.5 h-3.5" />
                                        <span>Ganti</span>
                                      </button>
                                      <button
                                        onClick={() => setUnassignModal({ open: true, targetClass: item })}
                                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                        title="Lepas Wali"
                                      >
                                        <UserMinus className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => handleOpenAssignModal(item)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#531FFF] hover:bg-[#4314cc] rounded-xl transition-all shadow-xs cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Tetapkan</span>
                                    </button>
                                  )}
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

              {/* EMPTY SEARCH RESULT */}
              {filteredClasses.length === 0 && (
                <div className="py-20 bg-white rounded-3xl border border-gray-100 text-center flex flex-col items-center justify-center p-6 shadow-xs">
                  <div className="w-16 h-16 bg-purple-50 text-[#531FFF] rounded-full flex items-center justify-center mb-4">
                    <UserCheck className="w-8 h-8" />
                  </div>
                  <h3 className="text-gray-900 font-extrabold text-base mb-1">
                    {isFiltered ? "Penugasan kelas tidak ditemukan" : "Belum ada data kelas"}
                  </h3>
                  <p className="text-gray-500 text-sm max-w-sm mb-5 font-medium">
                    {isFiltered 
                      ? "Coba ubah kata kunci pencarian atau reset filter untuk menampilkan kelas lainnya."
                      : "Silakan tambahkan data kelas baru di menu Manajemen Kelas terlebih dahulu."
                    }
                  </p>
                  
                  {isFiltered && (
                    <button 
                      onClick={handleResetFilters}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MATRIKS BEBAN & ALOKASI GURU                                       */}
      {/* ========================================================================= */}
      {activeTab === "teachers" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Teacher Search & Filter Bar */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  placeholder="Cari guru berdasarkan nama, NIP, mapel, atau kontak..." 
                  className="w-full pl-9 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                />
                {teacherSearch && (
                  <button 
                    onClick={() => setTeacherSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs font-bold">
                <button
                  onClick={() => setTeacherFilterStatus("all")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                    teacherFilterStatus === "all" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
                  )}
                >
                  Semua ({teachers.length})
                </button>
                <button
                  onClick={() => setTeacherFilterStatus("available")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                    teacherFilterStatus === "available" ? "bg-white text-emerald-700 shadow-xs" : "text-gray-500 hover:text-gray-900"
                  )}
                >
                  Bebas Tugas ({availableTeachers.length})
                </button>
                <button
                  onClick={() => setTeacherFilterStatus("assigned")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                    teacherFilterStatus === "assigned" ? "bg-white text-[#531FFF] shadow-xs" : "text-gray-500 hover:text-gray-900"
                  )}
                >
                  Sudah Bertugas ({teachers.length - availableTeachers.length})
                </button>
              </div>
            </div>

            <span className="text-xs font-bold text-gray-400">
              {filteredTeachers.length} dari {teachers.length} Guru
            </span>
          </div>

          {/* Teachers Matrix Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredTeachers.map((teacher, i) => {
              const assignedClass = teacherHomeroomMap.get(String(teacher.name).trim().toLowerCase());
              const isAssigned = Boolean(assignedClass);

              return (
                <div 
                  key={teacher._firestoreId || i}
                  className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center font-extrabold text-base shrink-0 overflow-hidden relative border border-gray-100">
                        {teacher.imageUrl ? (
                          <Image 
                            src={teacher.imageUrl} 
                            alt={teacher.name} 
                            fill 
                            className="object-cover" 
                            unoptimized 
                          />
                        ) : (
                          <span>{teacher.name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>

                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border",
                        isAssigned
                          ? "bg-purple-50 text-[#531FFF] border-[#531FFF]/20"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      )}>
                        {isAssigned ? "Wali Kelas" : "Bebas Tugas"}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-sm text-gray-900 group-hover:text-[#531FFF] transition-colors line-clamp-1" title={teacher.name}>
                        {teacher.name}
                      </h4>
                      <p className="text-xs font-bold text-[#531FFF] mt-0.5">
                        {teacher.role || teacher.subject || "Guru"}
                      </p>
                      <p className="text-[11px] font-semibold text-gray-400 mt-0.5">
                        NIP: <span className="text-gray-600">{teacher.nip || teacher.id || "-"}</span>
                      </p>
                    </div>

                    {/* Assignment Status Pill */}
                    <div className={cn(
                      "p-2.5 rounded-xl text-xs font-bold border",
                      isAssigned 
                        ? "bg-[#531FFF]/5 border-[#531FFF]/15 text-gray-800" 
                        : "bg-gray-50 border-gray-200 text-gray-500"
                    )}>
                      {isAssigned ? (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 text-[11px]">Mengampu:</span>
                          <span className="font-extrabold text-[#531FFF] text-xs">
                            {assignedClass.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-[11px]">Belum memegang kelas</span>
                      )}
                    </div>
                  </div>

                  {/* Teacher Matrix Actions */}
                  <div className="pt-4 border-t border-gray-100 mt-4 flex items-center gap-2">
                    {isAssigned ? (
                      <button
                        onClick={() => handleOpenAssignModal(assignedClass)}
                        className="w-full py-2 px-3 rounded-xl bg-gray-100 hover:bg-[#531FFF]/10 text-gray-700 hover:text-[#531FFF] text-xs font-extrabold transition-all cursor-pointer"
                      >
                        Ubah Kelas ({assignedClass.name})
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAssignTeacherToClass(teacher)}
                        className="w-full py-2 px-3 rounded-xl bg-[#531FFF] hover:bg-[#4314cc] text-white text-xs font-extrabold shadow-xs transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tugaskan ke Kelas</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUICK ASSIGN MODAL (MODAL PENETAPAN WALI KELAS)                           */}
      {/* ========================================================================= */}
      {assignModal.open && assignModal.targetClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-start justify-between bg-gradient-to-r from-[#531FFF]/5 via-white to-transparent">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#531FFF] text-white shadow-2xs">
                    {assignModal.targetClass.name}
                  </span>
                  <span className="text-xs font-bold text-gray-500">
                    {assignModal.targetClass.level} • {assignModal.targetClass.major}
                  </span>
                </div>
                <h3 className="text-xl font-black text-gray-900 mt-1.5 tracking-tight">
                  Penetapan Wali Kelas
                </h3>
                <p className="text-xs font-medium text-gray-500 mt-0.5">
                  Pilih guru yang akan ditugaskan sebagai pendamping utama kelas ini.
                </p>
              </div>

              <button
                onClick={() => setAssignModal({ open: false })}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Class Selector if launched from Teacher Allocation tab */}
            {assignModal.preSelectedTeacher && (
              <div className="p-4 bg-[#531FFF]/5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-600">Pilih Kelas Tujuan:</span>
                  <select
                    value={assignModal.targetClass._firestoreId}
                    onChange={(e) => {
                      const selected = classes.find(c => c._firestoreId === e.target.value);
                      if (selected) {
                        setAssignModal(prev => ({ ...prev, targetClass: selected }));
                      }
                    }}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-extrabold text-[#531FFF] cursor-pointer"
                  >
                    {classes.map(c => (
                      <option key={c._firestoreId} value={c._firestoreId}>
                        {c.name} ({c.level}) - {c.homeroom ? `Wali: ${c.homeroom}` : "Belum Berwali"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Teacher Search & Filters inside Modal */}
            <div className="p-4 border-b border-gray-100 space-y-3 bg-gray-50/50">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  placeholder="Cari guru berdasarkan nama, NIP, atau mata pelajaran..." 
                  className="w-full pl-9 pr-9 py-2 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                />
                {modalSearch && (
                  <button 
                    onClick={() => setModalSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Segmented Filter Chips */}
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setModalFilter("available")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg border transition-all cursor-pointer",
                    modalFilter === "available"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs font-extrabold"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-100"
                  )}
                >
                  Rekomendasi (Tersedia)
                </button>
                <button
                  type="button"
                  onClick={() => setModalFilter("all")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg border transition-all cursor-pointer",
                    modalFilter === "all"
                      ? "bg-[#531FFF]/10 text-[#531FFF] border-[#531FFF]/30 shadow-2xs font-extrabold"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-100"
                  )}
                >
                  Semua Guru
                </button>
                <button
                  type="button"
                  onClick={() => setModalFilter("assigned")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg border transition-all cursor-pointer",
                    modalFilter === "assigned"
                      ? "bg-amber-50 text-amber-800 border-amber-300 shadow-2xs font-extrabold"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-100"
                  )}
                >
                  Sudah Mengampu
                </button>
              </div>
            </div>

            {/* Selectable Teachers List */}
            <div className="p-4 overflow-y-auto max-h-[380px] space-y-2">
              {/* Option to clear homeroom assignment */}
              <div
                onClick={() => setSelectedTeacherId("")}
                className={cn(
                  "p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer",
                  selectedTeacherId === ""
                    ? "bg-rose-50/70 border-rose-300 ring-2 ring-rose-500/20"
                    : "bg-white border-gray-200 hover:bg-gray-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                    <UserMinus className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-sm text-gray-900">Tanpa Wali Kelas</h5>
                    <p className="text-xs text-gray-400 font-medium">Kosongkan penugasan wali kelas untuk kelas ini</p>
                  </div>
                </div>
                <div className={cn(
                  "w-5 h-5 rounded-full border flex items-center justify-center",
                  selectedTeacherId === "" ? "border-rose-600 bg-rose-600 text-white" : "border-gray-300"
                )}>
                  {selectedTeacherId === "" && <Check className="w-3 h-3" />}
                </div>
              </div>

              {/* Teachers List */}
              {modalFilteredTeachers.map((t) => {
                const isSelected = selectedTeacherId === t._firestoreId;
                const assignedClass = teacherHomeroomMap.get(String(t.name).trim().toLowerCase());
                const isAssigned = Boolean(assignedClass);
                const isCurrentlyThisClass = assignedClass?._firestoreId === assignModal.targetClass?._firestoreId;

                return (
                  <div
                    key={t._firestoreId}
                    onClick={() => setSelectedTeacherId(t._firestoreId)}
                    className={cn(
                      "p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer",
                      isSelected
                        ? "bg-[#531FFF]/5 border-[#531FFF] ring-2 ring-[#531FFF]/20"
                        : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/80"
                    )}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center font-extrabold text-sm shrink-0 overflow-hidden relative border border-gray-100">
                        {t.imageUrl ? (
                          <Image src={t.imageUrl} alt={t.name} fill className="object-cover" unoptimized />
                        ) : (
                          <span>{t.name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h5 className="font-extrabold text-sm text-gray-900 truncate" title={t.name}>
                            {t.name}
                          </h5>
                          {isCurrentlyThisClass ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#531FFF]/10 text-[#531FFF]">
                              Wali Saat Ini
                            </span>
                          ) : isAssigned ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                              Mengampu {assignedClass.name}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                              Tersedia
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-[#531FFF] truncate">
                          {t.role || t.subject || "Guru Pengajar"}
                        </p>
                        <p className="text-[11px] font-medium text-gray-400 truncate">
                          NIP: {t.nip || t.id || "-"} {t.contact ? `• WA: ${t.contact}` : ""}
                        </p>
                      </div>
                    </div>

                    {/* Radio Indicator */}
                    <div className={cn(
                      "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ml-3",
                      isSelected ? "border-[#531FFF] bg-[#531FFF] text-white" : "border-gray-300"
                    )}>
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                  </div>
                );
              })}

              {modalFilteredTeachers.length === 0 && (
                <div className="py-8 text-center text-gray-400">
                  <p className="text-xs font-semibold">Tidak ada guru yang sesuai kriteria pencarian.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-gray-100 flex items-center justify-between bg-white">
              <button
                type="button"
                onClick={() => setAssignModal({ open: false })}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                disabled={isSaving}
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleSaveAssignment}
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-white bg-[#531FFF] hover:bg-[#4314cc] shadow-md shadow-[#531FFF]/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Simpan Penugasan</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRMATION UNASSIGN MODAL                                               */}
      {/* ========================================================================= */}
      {unassignModal.open && unassignModal.targetClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <UserMinus className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h4 className="text-lg font-black text-gray-900">Lepas Penugasan Wali Kelas?</h4>
              <p className="text-xs font-medium text-gray-500 leading-relaxed">
                Anda akan melepas <strong>{unassignModal.targetClass.homeroom}</strong> dari kelas <strong>{unassignModal.targetClass.name}</strong>. Kelas ini akan menjadi tidak memiliki wali kelas sampai Anda menetapkan guru pengganti.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setUnassignModal({ open: false })}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                disabled={isSaving}
              >
                Batal
              </button>
              <button
                onClick={handleConfirmUnassign}
                disabled={isSaving}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Ya, Lepas Penugasan</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
