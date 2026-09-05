"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  ChevronDown, 
  Edit2, 
  Trash2, 
  Briefcase, 
  Loader2, 
  LayoutGrid, 
  List,
  Download,
  X,
  RefreshCw,
  CheckCircle2,
  XCircle,
  BookOpen,
  UserCheck,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CrudSheet } from "@/components/layouts/crud-sheet";
import { db, auth, storage } from "@/lib/firebase";
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function TeachersPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [teachers, setTeachers] = useState<any[]>([]);
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");

  const [crudState, setCrudState] = useState<{ open: boolean; mode: "create" | "edit" | "delete" | "view"; data?: any }>({
    open: false,
    mode: "create"
  });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const qTeachers = query(collection(db, "teachers"));
        const unsubscribeTeachers = onSnapshot(qTeachers, (snapshot) => {
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

        const qSubjects = query(collection(db, "subjects"));
        const unsubSubjects = onSnapshot(qSubjects, (snapshot) => {
          setSubjectsList(snapshot.docs.map(doc => ({ _firestoreId: doc.id, ...doc.data() })));
        });
        
        return () => {
          unsubscribeTeachers();
          unsubSubjects();
        };
      } else {
        setTeachers([]);
        setSubjectsList([]);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const teacherFields = [
    { name: "name", label: "Nama Lengkap & Gelar" },
    { name: "id", label: "NIP" },
    { 
      name: "role", 
      label: "Mata Pelajaran",
      type: "select",
      placeholder: "Pilih Mata Pelajaran",
      options: subjectsList.map(s => ({ label: s.name, value: s.name }))
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

  const handleCrudSubmit = async (data: any) => {
    try {
      let imageUrl = data.imageUrl || "";

      if (data.pasFoto instanceof File) {
        const fileRef = ref(storage, `teachers/${Date.now()}_${data.pasFoto.name}`);
        const snapshot = await uploadBytes(fileRef, data.pasFoto);
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      if (crudState.mode === "create") {
        await addDoc(collection(db, "teachers"), {
          id: data.id || `T${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
          name: data.name || "",
          role: data.role || "",
          contact: data.contact || "",
          status: data.status || "Aktif",
          imageUrl: imageUrl
        });
      } else if (crudState.mode === "edit" && data._firestoreId) {
        await updateDoc(doc(db, "teachers", data._firestoreId), {
          id: data.id || "",
          name: data.name || "",
          role: data.role || "",
          contact: data.contact || "",
          status: data.status || "Aktif",
          ...(imageUrl ? { imageUrl } : {})
        });
      } else if (crudState.mode === "delete" && data._firestoreId) {
        await deleteDoc(doc(db, "teachers", data._firestoreId));
      }
    } catch (error) {
      console.error("Error saving teacher data:", error);
      throw error;
    }
  };

  // Filtered Teachers List
  const filteredTeachers = useMemo(() => {
    return teachers.filter(teacher => {
      const matchSearch = !searchQuery || 
        (teacher.name && teacher.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (teacher.id && teacher.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (teacher.role && teacher.role.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (teacher.contact && teacher.contact.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchSubject = selectedSubject === "All" || teacher.role === selectedSubject;
      const matchStatus = selectedStatus === "All" || (teacher.status || "Aktif") === selectedStatus;

      return matchSearch && matchSubject && matchStatus;
    });
  }, [teachers, searchQuery, selectedSubject, selectedStatus]);

  // Dynamic Statistics
  const dynamicStats = [
    { label: "Total Guru", value: teachers.length.toString(), icon: Users, color: "text-[#531FFF] bg-[#531FFF]/10" },
    { label: "Guru Aktif", value: teachers.filter(t => (t.status || "Aktif") === "Aktif").length.toString(), icon: CheckCircle2, color: "text-emerald-600 bg-emerald-100" },
    { label: "Guru Cuti/Izin", value: teachers.filter(t => t.status === "Cuti").length.toString(), icon: UserCheck, color: "text-amber-600 bg-amber-100" },
    { label: "Total Mapel", value: subjectsList.length.toString(), icon: BookOpen, color: "text-blue-600 bg-blue-100" },
  ];

  // Subject options for dropdown filter
  const subjectOptions = useMemo(() => {
    const list = Array.from(new Set(teachers.map(t => t.role).filter(Boolean)));
    subjectsList.forEach(s => {
      if (s.name && !list.includes(s.name)) list.push(s.name);
    });
    return list.sort();
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
        onEditRequested={() => setCrudState(s => ({ ...s, mode: "edit" }))}
      />

      {/* Page Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#531FFF]/10 flex items-center justify-center text-[#531FFF] shrink-0 font-bold">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Staff Guru</h1>
            <p className="text-gray-500 text-xs md:text-sm font-medium mt-0.5">
              Kelola direktori pengajar, penetapan mata pelajaran, dan informasi kontak resmi.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setCrudState({ open: true, mode: "create" })}
            className="flex items-center justify-center gap-2 bg-[#531FFF] hover:bg-[#531FFF]/90 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-[#531FFF]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Guru</span>
          </button>
          
          <button 
            onClick={handleExportCSV}
            disabled={filteredTeachers.length === 0}
            className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-bold border border-gray-200 shadow-xs transition-colors disabled:opacity-50"
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
            <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-2xl md:text-3xl font-black text-gray-900 mt-1 tracking-tight">{stat.value}</h3>
              </div>
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center font-bold", stat.color)}>
                <IconComp className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Filter & Toolbar Bar */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
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

          {/* Filter by Mata Pelajaran Dropdown */}
          <div className="relative min-w-[170px]">
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full pl-4 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] appearance-none cursor-pointer"
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
              className="w-full pl-4 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] appearance-none cursor-pointer"
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
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
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

          <div className="flex items-center bg-gray-100 p-1 rounded-xl shrink-0 border border-gray-200">
            <button 
              onClick={() => setViewMode("grid")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5", 
                viewMode === "grid" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button 
              onClick={() => setViewMode("list")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5", 
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
        <div className="py-24 bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center gap-3 text-gray-400 shadow-xs">
          <Loader2 className="w-8 h-8 animate-spin text-[#531FFF]" />
          <p className="text-sm font-semibold">Memuat direktori data guru...</p>
        </div>
      ) : (
        <>
          {/* MODERN GRID VIEW (Matching Data Siswa Card Aesthetic) */}
          {viewMode === "grid" && filteredTeachers.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {filteredTeachers.map((teacher, i) => (
                <div 
                  key={teacher._firestoreId || i} 
                  className="group bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_30px_-8px_rgba(83,31,255,0.12)] transition-all duration-300 hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between"
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
                      <div className="w-16 h-16 rounded-2xl ring-4 ring-white shadow-md relative overflow-hidden border border-gray-100 bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center font-extrabold text-xl shrink-0">
                        {teacher.imageUrl ? (
                          <Image 
                            src={teacher.imageUrl} 
                            alt={teacher.name || "Teacher"}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                            unoptimized
                          />
                        ) : (
                          <span>{teacher.name ? teacher.name.charAt(0).toUpperCase() : "G"}</span>
                        )}
                      </div>

                      {/* Subject Badge */}
                      <span className="px-3 py-1 rounded-xl bg-[#531FFF]/10 text-[#531FFF] font-extrabold text-xs border border-[#531FFF]/20 max-w-[130px] truncate" title={teacher.role || "Guru"}>
                        {teacher.role || "Pengajar"}
                      </span>
                    </div>

                    {/* Teacher Info Body */}
                    <div className="px-4 pb-2 space-y-0.5">
                      <h3 className="font-extrabold text-sm text-gray-900 group-hover:text-[#531FFF] transition-colors truncate tracking-tight" title={teacher.name}>
                        {teacher.name}
                      </h3>
                      <p className="text-[12px] font-semibold text-gray-400">
                        NIP: <span className="text-gray-600">{teacher.id || "-"}</span>
                      </p>
                      {teacher.contact && (
                        <p className="text-[11px] font-medium text-gray-500 truncate pt-0.5">
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
                        onClick={() => setCrudState({ open: true, mode: "view", data: teacher })}
                        className="w-8 h-8 rounded-xl bg-gray-50 hover:bg-[#531FFF]/10 text-gray-500 hover:text-[#531FFF] transition-all flex items-center justify-center"
                        title="Lihat Detail Guru"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => setCrudState({ open: true, mode: "edit", data: teacher })}
                        className="w-8 h-8 rounded-xl bg-gray-50 hover:bg-[#531FFF]/10 text-gray-500 hover:text-[#531FFF] transition-all flex items-center justify-center"
                        title="Edit Data Guru"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => setCrudState({ open: true, mode: "delete", data: teacher })}
                        className="w-8 h-8 rounded-xl bg-gray-50 hover:bg-rose-50 text-gray-500 hover:text-rose-600 transition-all flex items-center justify-center"
                        title="Hapus Data Guru"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* LIST / TABLE VIEW */}
          {viewMode === "list" && filteredTeachers.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
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
                    {filteredTeachers.map((teacher, i) => (
                      <tr key={teacher._firestoreId || i} className="hover:bg-purple-50/20 transition-colors group">
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full relative overflow-hidden bg-[#531FFF]/10 text-[#531FFF] font-extrabold text-sm flex items-center justify-center border border-gray-200 shrink-0">
                              {teacher.imageUrl ? (
                                <Image
                                  src={teacher.imageUrl}
                                  alt={teacher.name || "Teacher"}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              ) : (
                                <span>{teacher.name ? teacher.name.charAt(0).toUpperCase() : "G"}</span>
                              )}
                            </div>
                            <span className="font-bold text-sm text-gray-900 group-hover:text-[#531FFF] transition-colors">
                              {teacher.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-6 font-semibold text-sm text-gray-600">
                          {teacher.id || "-"}
                        </td>
                        <td className="py-3.5 px-6">
                          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#531FFF]/10 text-[#531FFF]">
                            {teacher.role || "-"}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 font-medium text-xs text-gray-600">
                          {teacher.contact || "-"}
                        </td>
                        <td className="py-3.5 px-6">
                          <span className={cn(
                            "px-2.5 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1.5 border",
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
                              onClick={() => setCrudState({ open: true, mode: "view", data: teacher })}
                              className="p-2 text-gray-500 hover:text-[#531FFF] hover:bg-gray-100 rounded-xl transition-colors"
                              title="Lihat Detail"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setCrudState({ open: true, mode: "edit", data: teacher })}
                              className="p-2 text-gray-500 hover:text-[#531FFF] hover:bg-gray-100 rounded-xl transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setCrudState({ open: true, mode: "delete", data: teacher })}
                              className="p-2 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                              title="Hapus"
                            >
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
          )}

          {/* EMPTY STATE */}
          {filteredTeachers.length === 0 && (
            <div className="py-20 bg-white rounded-2xl border border-gray-100 text-center flex flex-col items-center justify-center p-6 shadow-xs">
              <div className="w-16 h-16 bg-purple-50 text-[#531FFF] rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-gray-900 font-extrabold text-base mb-1">
                {isFiltered ? "Guru tidak ditemukan" : "Belum ada data guru"}
              </h3>
              <p className="text-gray-500 text-sm max-w-sm mb-5 font-medium">
                {isFiltered 
                  ? "Coba ubah kata kunci pencarian atau reset filter untuk menampilkan pengajar lainnya."
                  : "Silakan tambahkan data guru baru ke dalam direktori pengajar sekolah."
                }
              </p>
              
              {isFiltered ? (
                <button 
                  onClick={handleResetFilters}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
                >
                  Reset Filter
                </button>
              ) : (
                <button 
                  onClick={() => setCrudState({ open: true, mode: "create" })}
                  className="bg-[#531FFF] hover:bg-[#531FFF]/90 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md shadow-[#531FFF]/20"
                >
                  + Tambah Guru Baru
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
