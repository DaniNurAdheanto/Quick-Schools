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
  BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CrudSheet } from "@/components/layouts/crud-sheet";
import { db, auth } from "@/lib/firebase";
import { collection, query, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function HomeroomPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");

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
      label: "Pilih Guru Sebagai Wali Kelas", 
      type: "select", 
      placeholder: "Pilih Guru Wali Kelas",
      options: [
        { label: "-- Kosongkan (Tanpa Wali Kelas) --", value: "" },
        ...teachers.map(t => ({ label: `${t.name} (${t.role || 'Guru'})`, value: t.name }))
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
      throw error;
    }
  };

  // Filtered Classes List
  const filteredClasses = useMemo(() => {
    return classes.filter(cls => {
      const matchSearch = !searchQuery || 
        (cls.name && cls.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (cls.level && cls.level.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (cls.major && cls.major.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (cls.homeroom && cls.homeroom.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchLevel = selectedLevel === "All" || cls.level === selectedLevel;
      
      const isFilled = Boolean(cls.homeroom);
      const matchStatus = selectedStatus === "All" || 
        (selectedStatus === "Terisi" && isFilled) || 
        (selectedStatus === "Belum" && !isFilled);

      return matchSearch && matchLevel && matchStatus;
    });
  }, [classes, searchQuery, selectedLevel, selectedStatus]);

  // Statistics
  const filledHomerooms = classes.filter(c => c.homeroom).length;
  const emptyHomerooms = classes.length - filledHomerooms;

  const dynamicStats = [
    { label: "Total Kelas", value: classes.length.toString(), icon: GraduationCap, color: "text-[#531FFF] bg-[#531FFF]/10" },
    { label: "Terisi Wali Kelas", value: filledHomerooms.toString(), icon: CheckCircle2, color: "text-emerald-600 bg-emerald-100" },
    { label: "Belum Ada Wali Kelas", value: emptyHomerooms.toString(), icon: AlertCircle, color: "text-rose-600 bg-rose-100" },
    { label: "Total Staff Guru", value: teachers.length.toString(), icon: Users, color: "text-blue-600 bg-blue-100" },
  ];

  // Level options
  const levelOptions = useMemo(() => {
    const list = Array.from(new Set(classes.map(c => c.level).filter(Boolean)));
    return list.sort();
  }, [classes]);

  // CSV Export Handler
  const handleExportCSV = () => {
    if (filteredClasses.length === 0) return;
    const headers = ["Nama Kelas", "Tingkat", "Jurusan", "Wali Kelas", "Status Penugasan"];
    const rows = filteredClasses.map(c => [
      `"${c.name || ""}"`,
      `"${c.level || ""}"`,
      `"${c.major || ""}"`,
      `"${c.homeroom || "Belum Diisi"}"`,
      `"${c.homeroom ? "Terisi" : "Belum Diisi"}"`
    ]);
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

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto w-full h-full space-y-6 animate-in fade-in duration-300">
      <CrudSheet 
        open={crudState.open} 
        onOpenChange={(open) => setCrudState(s => ({ ...s, open }))}
        mode={crudState.mode}
        entityName="Wali Kelas"
        fields={editHomeroomFields}
        initialData={crudState.data}
        onSubmit={handleCrudSubmit}
      />

      {/* Page Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#531FFF]/10 flex items-center justify-center text-[#531FFF] shrink-0 font-bold">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Wali Kelas</h1>
            <p className="text-gray-500 text-xs md:text-sm font-medium mt-0.5">
              Penugasan staf guru sebagai wali kelas dan pendamping akademis peserta didik.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportCSV}
            disabled={filteredClasses.length === 0}
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
              placeholder="Cari kelas, tingkat, jurusan, atau nama wali kelas..." 
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

          {/* Filter by Tingkat Dropdown */}
          <div className="relative min-w-[150px]">
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full pl-4 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] appearance-none cursor-pointer"
            >
              <option value="All">Semua Tingkat</option>
              {levelOptions.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Filter by Status Penugasan Dropdown */}
          <div className="relative min-w-[160px]">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full pl-4 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] appearance-none cursor-pointer"
            >
              <option value="All">Semua Status</option>
              <option value="Terisi">Terisi Wali Kelas</option>
              <option value="Belum">Belum Ada Wali</option>
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
            {filteredClasses.length} dari {classes.length} Kelas
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
          <p className="text-sm font-semibold">Memuat penugasan wali kelas...</p>
        </div>
      ) : (
        <>
          {/* MODERN GRID VIEW (Matching Data Siswa & Teacher Card Aesthetics) */}
          {viewMode === "grid" && filteredClasses.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {filteredClasses.map((item, i) => {
                const teacherMatch = teachers.find(t => t.name === item.homeroom);
                const teacherPhoto = teacherMatch?.imageUrl || "";

                return (
                  <div 
                    key={item._firestoreId || i} 
                    className="group bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_30px_-8px_rgba(83,31,255,0.12)] transition-all duration-300 hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between"
                  >
                    {/* Top Decorative Cover Header */}
                    <div>
                      <div className="h-20 bg-gradient-to-r from-[#531FFF]/15 via-[#6E3BFF]/10 to-[#531FFF]/5 relative p-3 flex items-start justify-between">
                        {/* Class Name Badge */}
                        <span className="px-3 py-1 rounded-full text-xs font-black bg-[#531FFF] text-white shadow-xs tracking-tight">
                          {item.name || "Kelas"}
                        </span>

                        {/* Status Badge */}
                        <div className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 backdrop-blur-md border shadow-xs",
                          item.homeroom
                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" 
                            : "bg-rose-500/10 text-rose-700 border-rose-500/20"
                        )}>
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            item.homeroom ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                          )} />
                          {item.homeroom ? "Terisi" : "Belum Diisi"}
                        </div>
                      </div>

                      {/* Overlapping Avatar */}
                      <div className="px-4 flex items-end justify-between -mt-8 relative z-10 mb-3">
                        <div className="w-16 h-16 rounded-2xl ring-4 ring-white shadow-md relative overflow-hidden border border-gray-100 bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center font-extrabold text-xl shrink-0">
                          {teacherPhoto ? (
                            <Image 
                              src={teacherPhoto} 
                              alt={item.homeroom || "Wali Kelas"}
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-110"
                              unoptimized
                            />
                          ) : item.homeroom ? (
                            <span>{item.homeroom.charAt(0).toUpperCase()}</span>
                          ) : (
                            <UserCheck className="w-6 h-6 text-gray-400" />
                          )}
                        </div>

                        {/* Major / Level Badge */}
                        <span className="px-2.5 py-1 rounded-xl bg-gray-100 text-gray-700 font-extrabold text-xs border border-gray-200">
                          {item.level || item.major || "Reguler"}
                        </span>
                      </div>

                      {/* Info Body */}
                      <div className="px-4 pb-2 space-y-0.5">
                        <h3 className="font-extrabold text-sm text-gray-900 group-hover:text-[#531FFF] transition-colors truncate tracking-tight" title={item.homeroom || "Belum Ditetapkan"}>
                          {item.homeroom || "Belum Ditetapkan"}
                        </h3>
                        <p className="text-[12px] font-semibold text-gray-500 truncate">
                          {item.name}
                        </p>
                      </div>
                    </div>

                    {/* Card Action Footer */}
                    <div className="p-4 pt-3 border-t border-gray-100/80 flex items-center justify-end mt-2">
                      <button 
                        onClick={() => setCrudState({ open: true, mode: "edit", data: item })}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#531FFF]/10 hover:bg-[#531FFF]/20 text-[#531FFF] text-xs font-extrabold transition-all"
                      >
                        <PenTool className="w-3.5 h-3.5" />
                        <span>Set Wali Kelas</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* LIST / TABLE VIEW */}
          {viewMode === "list" && filteredClasses.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-400 text-[11px] font-extrabold uppercase tracking-wider">
                      <th className="py-3.5 px-6">Kelas</th>
                      <th className="py-3.5 px-6">Tingkat</th>
                      <th className="py-3.5 px-6">Jurusan</th>
                      <th className="py-3.5 px-6">Wali Kelas</th>
                      <th className="py-3.5 px-6">Status</th>
                      <th className="py-3.5 px-6 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredClasses.map((item, i) => (
                      <tr key={item._firestoreId || i} className="hover:bg-purple-50/20 transition-colors group">
                        <td className="py-3.5 px-6 font-extrabold text-sm text-gray-900">
                          {item.name || "-"}
                        </td>
                        <td className="py-3.5 px-6 font-semibold text-sm text-gray-600">
                          {item.level || "-"}
                        </td>
                        <td className="py-3.5 px-6 font-semibold text-sm text-gray-600">
                          {item.major || "-"}
                        </td>
                        <td className="py-3.5 px-6">
                          {item.homeroom ? (
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-[#531FFF]/10 text-[#531FFF] font-extrabold text-xs flex items-center justify-center border border-[#531FFF]/20">
                                {item.homeroom.charAt(0)}
                              </div>
                              <span className="font-bold text-sm text-gray-900">{item.homeroom}</span>
                            </div>
                          ) : (
                            <span className="inline-flex py-1 px-2.5 bg-rose-50 text-rose-600 rounded-md text-xs font-bold border border-rose-100">
                              Belum Diisi
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-6">
                          <span className={cn(
                            "px-2.5 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1.5 border",
                            item.homeroom
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          )}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", item.homeroom ? "bg-emerald-500" : "bg-rose-500")} />
                            {item.homeroom ? "Terisi" : "Belum Diisi"}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <button
                            onClick={() => setCrudState({ open: true, mode: "edit", data: item })}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#531FFF] bg-[#531FFF]/10 hover:bg-[#531FFF]/20 rounded-xl transition-colors ml-auto"
                          >
                            <PenTool className="w-3.5 h-3.5" />
                            <span>Set Wali Kelas</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* EMPTY STATE */}
          {filteredClasses.length === 0 && (
            <div className="py-20 bg-white rounded-2xl border border-gray-100 text-center flex flex-col items-center justify-center p-6 shadow-xs">
              <div className="w-16 h-16 bg-purple-50 text-[#531FFF] rounded-full flex items-center justify-center mb-4">
                <UserCheck className="w-8 h-8" />
              </div>
              <h3 className="text-gray-900 font-extrabold text-base mb-1">
                {isFiltered ? "Penugasan tidak ditemukan" : "Belum ada data kelas"}
              </h3>
              <p className="text-gray-500 text-sm max-w-sm mb-5 font-medium">
                {isFiltered 
                  ? "Coba ubah kata kunci pencarian atau reset filter untuk menampilkan wali kelas lainnya."
                  : "Silakan tambahkan data kelas baru di menu Manajemen Kelas terlebih dahulu."
                }
              </p>
              
              {isFiltered && (
                <button 
                  onClick={handleResetFilters}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
                >
                  Reset Filter
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
