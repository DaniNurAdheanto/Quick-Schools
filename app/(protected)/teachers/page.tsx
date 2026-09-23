"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Users, 
  Plus, 
  Search, 
  ChevronDown, 
  Edit2, 
  Trash2, 
  Loader2, 
  LayoutGrid, 
  List,
  Download,
  X,
  RefreshCw,
  CheckCircle2,
  BookOpen,
  UserCheck,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CrudSheet } from "@/components/layouts/crud-sheet";
import { db, storage } from "@/lib/firebase";
import { collection, query, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useToast } from "@/context/ToastContext";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { useAuth } from "@/context/AuthContext";
import { PageContentSkeleton } from "@/components/ui/role-loading-skeleton";
import { 
  getSubjectsForTeacher, 
  syncTeacherSubjectRelations 
} from "@/lib/subject-teacher-relations";
import { useUnifiedTeachers } from "@/hooks/use-unified-teachers";
import { syncTeacherRecord, deleteTeacherRecord } from "@/lib/unified-sync-service";

// Helper to compress uploaded photo into lightweight Base64 JPEG data URL (~15KB)
async function compressImageFileToBase64(file: File, maxWidth = 360, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement("img");
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            let width = img.width || maxWidth;
            let height = img.height || maxWidth;
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const dataUrl = canvas.toDataURL("image/jpeg", quality);
              resolve(dataUrl);
              return;
            }
            resolve((e.target?.result as string) || "");
          } catch {
            resolve((e.target?.result as string) || "");
          }
        };
        img.onerror = () => resolve((e.target?.result as string) || "");
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    } catch {
      resolve("");
    }
  });
}

export default function TeachersPage() {
  const toast = useToast();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const { teachers, setTeachers, loading } = useUnifiedTeachers();
  const [subjectsList, setSubjectsList] = useState<any[]>([]);

  // Centralized useAuth
  const { role: authRole, rawRole: authRawRole, isAuthLoading, isRoleReady } = useAuth();
  const rawR = (authRawRole || authRole || "").toLowerCase();
  const isGuru = rawR === "guru" || rawR === "teacher";

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");

  const [crudState, setCrudState] = useState<{ open: boolean; mode: "create" | "edit" | "delete" | "view"; data?: any }>({
    open: false,
    mode: "create"
  });

  useEffect(() => {
    const qSubjects = query(collection(db, "subjects"));
    const unsubscribeSubjects = onSnapshot(qSubjects, (snapshot) => {
      setSubjectsList(snapshot.docs.map(doc => ({ _firestoreId: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeSubjects();
    };
  }, []);

  const teacherFields = [
    { name: "name", label: "Nama Lengkap & Gelar", placeholder: "Contoh: Budi Santoso, M.Pd." },
    { name: "id", label: "NIP", placeholder: "Nomor Induk Pegawai" },
    { 
      name: "subjectIds", 
      label: "Mata Pelajaran yang Diampu (Bisa Lebih dari 1)",
      type: "multiselect",
      placeholder: "Pilih satu atau lebih mata pelajaran...",
      helperText: "Seorang guru dapat mengajar satu atau beberapa mata pelajaran sekaligus.",
      options: subjectsList.map(s => ({ 
        label: s.name, 
        value: s._firestoreId || s.id || s.code,
        sublabel: `${s.code || "MAPEL"}${s.category ? ` • ${s.category}` : ""}${s.level ? ` • ${s.level}` : ""}`
      }))
    },
    { name: "contact", label: "Nomor Kontak / WhatsApp", placeholder: "08..." },
    { 
      name: "status", 
      label: "Status Guru",
      type: "select",
      placeholder: "Pilih Status",
      options: [
        { label: "Aktif", value: "Aktif" },
        { label: "Cuti", value: "Cuti" },
        { label: "Nonaktif", value: "Nonaktif" }
      ]
    },
    {
      name: "pasFoto",
      label: "Foto Profil (Opsional)",
      type: "file",
    }
  ];

  // Centralized Helper to Open Teacher CRUD Sheet with Full Relation Resolution
  const openTeacherCrud = (mode: "create" | "edit" | "delete" | "view", item?: any) => {
    if (!item) {
      setCrudState({
        open: true,
        mode,
        data: {
          status: "Aktif",
          subjectIds: [],
          subjects: []
        }
      });
      return;
    }

    let resolvedSubjectIds: string[] = [];
    if (Array.isArray(item.subjectIds) && item.subjectIds.length > 0) {
      resolvedSubjectIds = item.subjectIds;
    } else {
      const matched = getSubjectsForTeacher(item, subjectsList);
      resolvedSubjectIds = matched.map(s => s._firestoreId || s.id || s.code).filter((id): id is string => Boolean(id));
    }

    setCrudState({
      open: true,
      mode,
      data: {
        ...item,
        subjectIds: resolvedSubjectIds
      }
    });
  };

  const handleCrudSubmit = async (data: any) => {
    if (isGuru) {
      toast.showError("Anda tidak memiliki hak akses untuk mengubah data staff guru.", "Akses Ditolak");
      return;
    }
    try {
      let imageUrl = data.imageUrl || "";

      if (data.pasFoto instanceof File) {
        // 1. Immediately compress locally to ~15KB data URL
        const compressedBase64 = await compressImageFileToBase64(data.pasFoto, 360, 0.7);
        if (compressedBase64) {
          imageUrl = compressedBase64;
        }

        // 2. Non-blocking Firebase Storage attempt with 2.5s race timeout
        try {
          const storagePromise = (async () => {
            const fileRef = ref(storage, `teachers/${Date.now()}_${data.pasFoto.name}`);
            const snapshot = await uploadBytes(fileRef, data.pasFoto);
            return await getDownloadURL(snapshot.ref);
          })();
          const timeoutPromise = new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 2500));
          const storageUrl = await Promise.race([storagePromise, timeoutPromise]);
          if (storageUrl) {
            imageUrl = storageUrl;
          }
        } catch (storageErr) {
          console.warn("Storage upload bypassed, using compressed image:", storageErr);
        }
      }

      // Resolve multiple subject assignments
      const rawSubjectIds: string[] = Array.isArray(data.subjectIds)
        ? data.subjectIds
        : (typeof data.subjectIds === "string" && data.subjectIds.trim() && data.subjectIds !== "-")
          ? data.subjectIds.split(",").map((s: string) => s.trim()).filter(Boolean)
          : [];

      const selectedSubjects = subjectsList.filter(s => {
        const sid = (s._firestoreId || "").toLowerCase();
        const scode = (s.code || "").toLowerCase();
        const sdoc = (s.id || "").toLowerCase();
        return rawSubjectIds.some(rid => {
          const norm = rid.toLowerCase().trim();
          return norm === sid || norm === scode || norm === sdoc;
        });
      });

      const subjectIds = selectedSubjects.map(s => s._firestoreId || s.id || s.code).filter(Boolean);
      const subjectsNames = selectedSubjects.map(s => s.name).filter(Boolean);
      const subjectString = subjectsNames.join(", ") || (rawSubjectIds.length > 0 ? "Mata Pelajaran Diampu" : "");

      const nipValue = data.id || data.nip || `T${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      const contactValue = data.contact || data.phone || "";

      if (crudState.mode === "create") {
        await syncTeacherRecord(db, {
          id: nipValue,
          nip: nipValue,
          name: data.name || "",
          fullName: data.name || "",
          role: subjectString,
          subject: subjectString,
          subjectIds: subjectIds,
          subjects: subjectsNames,
          contact: contactValue,
          phone: contactValue,
          status: data.status || "Aktif",
          imageUrl: imageUrl,
          photoUrl: imageUrl,
          createdAt: new Date().toISOString()
        });

        await syncTeacherSubjectRelations(db, nipValue, subjectIds, subjectsList, {
          id: nipValue,
          name: data.name || "",
          nip: nipValue
        });
      } else if (crudState.mode === "edit") {
        const targetId = data._firestoreId || crudState.data?._firestoreId || data.uid || crudState.data?.uid || data.id;
        const targetUid = data.uid || crudState.data?.uid;

        const updatePayload: any = {
          _firestoreId: targetId,
          _allDocIds: data._allDocIds || crudState.data?._allDocIds,
          uid: targetUid,
          id: nipValue,
          nip: nipValue,
          name: data.name || "",
          fullName: data.name || "",
          role: subjectString,
          subject: subjectString,
          subjectIds: subjectIds,
          subjects: subjectsNames,
          contact: contactValue,
          phone: contactValue,
          status: data.status || "Aktif",
          updatedAt: new Date().toISOString(),
          ...(imageUrl ? { imageUrl, photoUrl: imageUrl } : {})
        };

        await syncTeacherRecord(db, updatePayload);

        await syncTeacherSubjectRelations(db, targetId, subjectIds, subjectsList, {
          id: nipValue,
          name: data.name || "",
          nip: nipValue
        });

        setTeachers((prev) =>
          prev.map((t) => (t._firestoreId === targetId || (targetUid && t.uid === targetUid) ? { ...t, ...updatePayload } : t))
        );
      } else if (crudState.mode === "delete" && (data._firestoreId || data.id || data.uid)) {
        await deleteTeacherRecord(db, {
          _firestoreId: data._firestoreId,
          uid: data.uid,
          id: data.id,
          nip: data.nip,
          _allDocIds: data._allDocIds
        });

        setTeachers((prev) =>
          prev.filter(
            (t) =>
              t._firestoreId !== data._firestoreId &&
              (!data.uid || t.uid !== data.uid)
          )
        );
      }
    } catch (error) {
      console.error("Error saving teacher data:", error);
      throw error;
    }
  };

  // Filtered Teachers List
  const filteredTeachers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return teachers.filter(teacher => {
      const assignedSubjects = getSubjectsForTeacher(teacher, subjectsList);
      const subjectNames = assignedSubjects.map(s => s.name).join(" ").toLowerCase();

      const matchSearch = !q || 
        (teacher.name && teacher.name.toLowerCase().includes(q)) ||
        (teacher.id && teacher.id.toLowerCase().includes(q)) ||
        (teacher.role && teacher.role.toLowerCase().includes(q)) ||
        (teacher.contact && teacher.contact.toLowerCase().includes(q)) ||
        subjectNames.includes(q);

      const matchSubject = selectedSubject === "All" || 
        teacher.role === selectedSubject ||
        (Array.isArray(teacher.subjects) && teacher.subjects.includes(selectedSubject)) ||
        assignedSubjects.some(s => s.name === selectedSubject);

      const matchStatus = selectedStatus === "All" || (teacher.status || "Aktif") === selectedStatus;

      return matchSearch && matchSubject && matchStatus;
    });
  }, [teachers, searchQuery, selectedSubject, selectedStatus, subjectsList]);

  // Dynamic Statistics
  const dynamicStats = [
    { label: "Total Guru", value: teachers.length.toString(), icon: Users, color: "text-[#531FFF] bg-[#531FFF]/10" },
    { label: "Guru Aktif", value: teachers.filter(t => (t.status || "Aktif") === "Aktif").length.toString(), icon: CheckCircle2, color: "text-emerald-600 bg-emerald-100" },
    { label: "Guru Cuti/Izin", value: teachers.filter(t => t.status === "Cuti").length.toString(), icon: UserCheck, color: "text-amber-600 bg-amber-100" },
    { label: "Total Mapel", value: subjectsList.length.toString(), icon: BookOpen, color: "text-blue-600 bg-blue-100" },
  ];

  // Subject options for dropdown filter
  const subjectOptions = useMemo(() => {
    const list = new Set<string>();
    subjectsList.forEach(s => {
      if (s.name) list.add(s.name);
    });
    teachers.forEach(t => {
      if (Array.isArray(t.subjects)) {
        t.subjects.forEach((s: string) => list.add(s));
      } else if (t.role && t.role !== "-") {
        list.add(t.role);
      }
    });
    return Array.from(list).sort();
  }, [teachers, subjectsList]);

  // CSV Export Handler
  const handleExportCSV = () => {
    if (filteredTeachers.length === 0) return;
    const headers = ["NIP", "Nama Lengkap", "Mata Pelajaran", "Kontak", "Status"];
    const rows = filteredTeachers.map(t => [
      `"${t.id || ""}"`,
      `"${t.name || ""}"`,
      `"${t.role || ""}"`,
      `"${t.contact || ""}"`,
      `"${t.status || "Aktif"}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `data_guru_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isFiltered = searchQuery !== "" || selectedSubject !== "All" || selectedStatus !== "All";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedSubject("All");
    setSelectedStatus("All");
  };

  if (isAuthLoading || !isRoleReady || loading) {
    return <PageContentSkeleton />;
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto w-full h-full space-y-6 animate-in fade-in duration-300">
      <CrudSheet 
        open={crudState.open} 
        onOpenChange={(open) => setCrudState(s => ({ ...s, open }))}
        mode={crudState.mode}
        entityName="Guru"
        fields={teacherFields}
        initialData={crudState.data}
        onSubmit={handleCrudSubmit}
        onEditRequested={isGuru ? undefined : () => setCrudState(s => ({ ...s, mode: "edit", open: true }))}
      />

      {/* Page Header Card */}
      <div className="bg-white rounded-lg p-6 border border-gray-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-[#531FFF]/10 flex items-center justify-center text-[#531FFF] shrink-0 font-bold">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Staff Guru</h1>
              {isGuru && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  Mode Lihat (Read-Only)
                </span>
              )}
            </div>
            <p className="text-gray-500 text-xs md:text-sm font-medium mt-0.5">
              Kelola direktori pengajar, penetapan mata pelajaran, dan informasi kontak resmi.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isGuru && (
            <button 
              onClick={() => openTeacherCrud("create")}
              className="flex items-center justify-center gap-2 bg-[#531FFF] hover:bg-[#531FFF]/90 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md shadow-[#531FFF]/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Guru</span>
            </button>
          )}
          
          <button 
            onClick={handleExportCSV}
            disabled={filteredTeachers.length === 0}
            className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-bold border border-gray-200 shadow-xs transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-[#531FFF]" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {dynamicStats.map((stat, i) => {
          const IconComp = stat.icon;
          return (
            <div key={i} className="bg-white p-5 rounded-lg border border-gray-100 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-2xl md:text-3xl font-black text-gray-900 mt-1 tracking-tight">{stat.value}</h3>
              </div>
              <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center font-bold", stat.color)}>
                <IconComp className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Filter & Toolbar Bar */}
      <div className="bg-white rounded-lg p-5 border border-gray-100 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search & Filters Left Group */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama guru, NIP, atau mata pelajaran..." 
              className="w-full pl-9 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
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

          {/* Filter by Mata Pelajaran Dropdown */}
          <div className="relative min-w-[170px]">
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full pl-4 pr-8 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] appearance-none cursor-pointer"
            >
              <option value="All">Semua Mapel</option>
              {subjectOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Filter by Status Dropdown */}
          <div className="relative min-w-[140px]">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full pl-4 pr-8 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] appearance-none cursor-pointer"
            >
              <option value="All">Semua Status</option>
              <option value="Aktif">Aktif</option>
              <option value="Cuti">Cuti</option>
              <option value="Nonaktif">Nonaktif</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Reset Filters Button */}
          {isFiltered && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
              title="Reset Filter"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* View Mode Switcher Right */}
        <div className="flex items-center justify-between md:justify-end gap-3">
          <span className="text-xs font-bold text-gray-400">
            {filteredTeachers.length} dari {teachers.length} Guru
          </span>

          <div className="flex items-center bg-gray-100 p-1 rounded-lg shrink-0 border border-gray-200">
            <button 
              onClick={() => setViewMode("grid")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5", 
                viewMode === "grid" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button 
              onClick={() => setViewMode("list")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5", 
                viewMode === "list" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
              )}
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Tabel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-24 bg-white rounded-lg border border-gray-100 flex flex-col items-center justify-center gap-3 text-gray-400 shadow-xs">
          <Loader2 className="w-8 h-8 animate-spin text-[#531FFF]" />
          <p className="text-sm font-semibold">Memuat direktori data guru...</p>
        </div>
      ) : (
        <>
          {/* MODERN GRID VIEW (Matching Data Siswa Card Aesthetic) */}
          {viewMode === "grid" && filteredTeachers.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {filteredTeachers.map((teacher, i) => {
                const assignedSubjects = getSubjectsForTeacher(teacher, subjectsList);
                return (
                  <div 
                    key={teacher._firestoreId || i} 
                    className="group bg-white rounded-xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_30px_-8px_rgba(83,31,255,0.12)] transition-all duration-300 hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between"
                  >
                    {/* Top Decorative Cover Header */}
                    <div>
                      <div className="h-20 bg-gradient-to-r from-[#531FFF]/15 via-[#6E3BFF]/10 to-[#531FFF]/5 relative p-3 flex items-start justify-end">
                        {/* Status Badge */}
                        <div className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 backdrop-blur-md border shadow-xs",
                          (teacher.status || "Aktif") === "Aktif" 
                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" 
                            : teacher.status === "Cuti"
                            ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
                            : "bg-rose-500/10 text-rose-700 border-rose-500/20"
                        )}>
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            (teacher.status || "Aktif") === "Aktif" 
                              ? "bg-emerald-500 animate-pulse" 
                              : teacher.status === "Cuti"
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          )} />
                          {teacher.status || "Aktif"}
                        </div>
                      </div>

                      {/* Overlapping Avatar */}
                      <div className="px-4 flex items-end justify-between -mt-8 relative z-10 mb-3">
                        <ProfileAvatar
                          name={teacher.name}
                          imageUrl={teacher.imageUrl}
                          photoUrl={teacher.photoUrl}
                          avatar={teacher.avatar}
                          gender={teacher.gender}
                          role="teacher"
                          size="xl"
                          shape="rounded"
                          ring="ring-4 ring-white shadow-md"
                          className="group-hover:scale-105"
                        />

                        {/* Subject Badge */}
                        <span 
                          className="px-2.5 py-1 rounded-lg bg-[#531FFF]/10 text-[#531FFF] font-extrabold text-[11px] border border-[#531FFF]/20 max-w-[130px] truncate" 
                          title={assignedSubjects.map(s => s.name).join(", ") || teacher.role || "Guru"}
                        >
                          {assignedSubjects.length > 1 ? `${assignedSubjects.length} Mapel` : (assignedSubjects[0]?.name || teacher.role || "Pengajar")}
                        </span>
                      </div>

                      {/* Teacher Info Body */}
                      <div className="px-4 pb-2 space-y-1">
                        <h3 className="font-extrabold text-sm text-gray-900 group-hover:text-[#531FFF] transition-colors truncate tracking-tight" title={teacher.name}>
                          {teacher.name}
                        </h3>
                        <p className="text-[12px] font-semibold text-gray-400">
                          NIP: <span className="text-gray-600">{teacher.id || "-"}</span>
                        </p>
                        
                        {/* Multiple Subjects Tag Badges */}
                        <div className="pt-1">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                            Mapel Diampu:
                          </p>
                          {assignedSubjects.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {assignedSubjects.map((s, sIdx) => (
                                <span 
                                  key={sIdx}
                                  className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-50 text-[#531FFF] border border-purple-100 text-[10px] font-bold shadow-2xs"
                                  title={s.code ? `Kode: ${s.code}` : undefined}
                                >
                                  {s.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic text-[11px]">Belum Ditentukan</span>
                          )}
                        </div>

                        {teacher.contact && (
                          <p className="text-[11px] font-medium text-gray-500 truncate pt-1">
                            Kontak: {teacher.contact}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Card Action Footer */}
                    <div className="p-4 pt-3 border-t border-gray-100/80 flex items-center justify-between mt-2">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        Staf Guru
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => openTeacherCrud("view", teacher)}
                          className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-[#531FFF]/10 text-gray-500 hover:text-[#531FFF] transition-all flex items-center justify-center cursor-pointer"
                          title="Lihat Detail Guru"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {!isGuru && (
                          <>
                            <button 
                              onClick={() => openTeacherCrud("edit", teacher)}
                              className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-[#531FFF]/10 text-gray-500 hover:text-[#531FFF] transition-all flex items-center justify-center cursor-pointer"
                              title="Edit Data Guru"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => openTeacherCrud("delete", teacher)}
                              className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-rose-50 text-gray-500 hover:text-rose-600 transition-all flex items-center justify-center cursor-pointer"
                              title="Hapus Data Guru"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* LIST / TABLE VIEW */}
          {viewMode === "list" && filteredTeachers.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-100 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-400 text-[11px] font-extrabold uppercase tracking-wider">
                      <th className="py-3.5 px-6">Nama Guru</th>
                      <th className="py-3.5 px-6">NIP</th>
                      <th className="py-3.5 px-6">Mata Pelajaran</th>
                      <th className="py-3.5 px-6">Kontak</th>
                      <th className="py-3.5 px-6">Status</th>
                      <th className="py-3.5 px-6 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTeachers.map((teacher, i) => {
                      const assignedSubjects = getSubjectsForTeacher(teacher, subjectsList);
                      return (
                        <tr key={teacher._firestoreId || i} className="hover:bg-purple-50/20 transition-colors group">
                          <td className="py-3.5 px-6">
                            <div className="flex items-center gap-3">
                              <ProfileAvatar
                                name={teacher.name}
                                imageUrl={teacher.imageUrl}
                                photoUrl={teacher.photoUrl}
                                avatar={teacher.avatar}
                                gender={teacher.gender}
                                role="teacher"
                                size="md"
                                shape="circle"
                              />
                              <div>
                                <span className="font-bold text-sm text-gray-900 group-hover:text-[#531FFF] transition-colors block">
                                  {teacher.name}
                                </span>
                                <span className="text-[11px] text-gray-400 font-medium">
                                  NIP: {teacher.nip || teacher.id || "-"}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-6 font-semibold text-sm text-gray-600">
                            {teacher.id || "-"}
                          </td>
                          <td className="py-3.5 px-6">
                            {assignedSubjects.length > 0 ? (
                              <div className="flex flex-wrap items-center gap-1.5 max-w-[280px]">
                                {assignedSubjects.map((s, idx) => (
                                  <span 
                                    key={idx}
                                    className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-[#531FFF]/10 text-[#531FFF] border border-[#531FFF]/20 shadow-2xs"
                                  >
                                    {s.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400 italic text-xs">{teacher.role || "-"}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-6 font-medium text-xs text-gray-600">
                            {teacher.contact || "-"}
                          </td>
                          <td className="py-3.5 px-6">
                            <span className={cn(
                              "px-2.5 py-1 rounded text-xs font-bold inline-flex items-center gap-1.5 border",
                              (teacher.status || "Aktif") === "Aktif"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : teacher.status === "Cuti"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            )}>
                              <span className={cn(
                                "w-1.5 h-1.5 rounded-full", 
                                (teacher.status || "Aktif") === "Aktif" ? "bg-emerald-500" : teacher.status === "Cuti" ? "bg-amber-500" : "bg-rose-500"
                              )} />
                              {teacher.status || "Aktif"}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openTeacherCrud("view", teacher)}
                                className="p-2 text-gray-500 hover:text-[#531FFF] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                                title="Lihat Detail"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {!isGuru && (
                                <>
                                  <button
                                    onClick={() => openTeacherCrud("edit", teacher)}
                                    className="p-2 text-gray-500 hover:text-[#531FFF] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                                    title="Edit"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => openTeacherCrud("delete", teacher)}
                                    className="p-2 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Hapus"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
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

          {/* EMPTY STATE */}
          {filteredTeachers.length === 0 && (
            <div className="py-20 bg-white rounded-lg border border-gray-100 text-center flex flex-col items-center justify-center p-6 shadow-xs">
              <div className="w-16 h-16 bg-purple-50 text-[#531FFF] rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-gray-900 font-extrabold text-base mb-1">
                {isFiltered ? "Guru tidak ditemukan" : "Belum ada data guru"}
              </h3>
              <p className="text-gray-500 text-sm max-w-sm mb-5 font-medium">
                {isFiltered 
                  ? "Coba ubah kata kunci pencarian atau reset filter untuk menampilkan pengajar lainnya."
                  : isGuru
                  ? "Belum ada data staf guru yang terdaftar."
                  : "Silakan tambahkan data guru baru ke dalam direktori pengajar sekolah."
                }
              </p>
              
              {isFiltered ? (
                <button 
                  onClick={handleResetFilters}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-5 py-2.5 rounded-lg text-sm font-bold transition-all"
                >
                  Reset Filter
                </button>
              ) : !isGuru ? (
                <button 
                  onClick={() => setCrudState({ open: true, mode: "create" })}
                  className="bg-[#531FFF] hover:bg-[#531FFF]/90 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all shadow-md shadow-[#531FFF]/20"
                >
                  + Tambah Guru Baru
                </button>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}
