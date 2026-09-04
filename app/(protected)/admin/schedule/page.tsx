"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, PenTool, Trash2, Loader2, Calendar, Clock, LayoutGrid, List, Table,
  Search, Filter, Sparkles, AlertTriangle, CheckCircle2, User, BookOpen, GraduationCap, X, ChevronRight
} from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

const TIME_PRESETS = [
  { label: "Jam 1 (07:00 - 08:30)", start: "07:00", end: "08:30" },
  { label: "Jam 2 (08:30 - 10:00)", start: "08:30", end: "10:00" },
  { label: "Jam 3 (10:15 - 11:45)", start: "10:15", end: "11:45" },
  { label: "Jam 4 (12:30 - 14:00)", start: "12:30", end: "14:00" },
  { label: "Jam 5 (14:00 - 15:30)", start: "14:00", end: "15:30" },
];

const COLOR_PALETTES = [
  { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-900", badge: "bg-blue-100 text-blue-800", dot: "bg-blue-500", hover: "hover:bg-blue-100/70" },
  { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-900", badge: "bg-purple-100 text-purple-800", dot: "bg-purple-500", hover: "hover:bg-purple-100/70" },
  { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-900", badge: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500", hover: "hover:bg-emerald-100/70" },
  { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-900", badge: "bg-amber-100 text-amber-800", dot: "bg-amber-500", hover: "hover:bg-amber-100/70" },
  { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-900", badge: "bg-rose-100 text-rose-800", dot: "bg-rose-500", hover: "hover:bg-rose-100/70" },
  { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-900", badge: "bg-indigo-100 text-indigo-800", dot: "bg-indigo-500", hover: "hover:bg-indigo-100/70" },
  { bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-900", badge: "bg-cyan-100 text-cyan-800", dot: "bg-cyan-500", hover: "hover:bg-cyan-100/70" },
];

function getSubjectColor(subjectName: string) {
  if (!subjectName) return COLOR_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < subjectName.length; i++) {
    hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLOR_PALETTES.length;
  return COLOR_PALETTES[index];
}

export default function SchedulePage() {
  const toast = useToast();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<"weekly" | "matrix" | "daily">("weekly");
  const [selectedDay, setSelectedDay] = useState<string>("Senin");
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "delete">("create");
  const [activeItem, setActiveItem] = useState<any>(null);
  
  // Form State
  const [formDay, setFormDay] = useState<string>("Senin");
  const [formClass, setFormClass] = useState<string>("");
  const [formSubject, setFormSubject] = useState<string>("");
  const [formTeacher, setFormTeacher] = useState<string>("");
  const [formStartTime, setFormStartTime] = useState<string>("07:00");
  const [formEndTime, setFormEndTime] = useState<string>("08:30");
  
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
    const dayIndex = new Date().getDay();
    const dayStr = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][dayIndex];
    if (dayStr !== "Minggu") setSelectedDay(dayStr);

    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const currentDayString = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][now.getDay()];
  const currentTimeString = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');

  const isActive = (schedule: any) => {
    if (!mounted) return false;
    if (schedule.day !== currentDayString) return false;
    return currentTimeString >= schedule.startTime && currentTimeString <= schedule.endTime;
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(collection(db, "schedules"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const schedulesData = snapshot.docs.map(doc => ({
            _firestoreId: doc.id,
            ...doc.data()
          }));
          setSchedules(schedulesData);
          setLoading(false);
        }, (error) => {
          console.error("Error fetching schedules:", error);
          setLoading(false);
        });

        const unsubSubjects = onSnapshot(query(collection(db, "subjects")), (snapshot) => {
          setSubjects(snapshot.docs.map(d => ({ _firestoreId: d.id, ...d.data() })));
        });

        const unsubClasses = onSnapshot(query(collection(db, "classes")), (snapshot) => {
          const classData = snapshot.docs.map(d => ({ _firestoreId: d.id, ...d.data() } as any));
          setClasses(classData);
        });

        const unsubTeachers = onSnapshot(query(collection(db, "teachers")), (snapshot) => {
          setTeachers(snapshot.docs.map(d => ({ _firestoreId: d.id, ...d.data() })));
        });

        return () => {
          unsubscribe();
          unsubSubjects();
          unsubClasses();
          unsubTeachers();
        };
      } else {
        setSchedules([]);
        setSubjects([]);
        setClasses([]);
        setTeachers([]);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Helper to open modal pre-filled
  const handleOpenAddModal = (presetDay?: string, presetClass?: string, presetStart?: string, presetEnd?: string) => {
    setModalMode("create");
    setActiveItem(null);
    setFormDay(presetDay || (selectedDay !== "Minggu" ? selectedDay : "Senin"));
    setFormClass(presetClass || (selectedClassFilter !== "All" ? selectedClassFilter : (classes[0]?.name || "")));
    setFormSubject(subjects[0]?.name || "");
    
    // Auto pick teacher matching subject if available
    const matchedTeacher = teachers.find(t => t.role === (subjects[0]?.name || ""));
    setFormTeacher(matchedTeacher ? matchedTeacher.name : (teachers[0]?.name || ""));
    
    setFormStartTime(presetStart || "07:00");
    setFormEndTime(presetEnd || "08:30");
    setConflictError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (schedule: any) => {
    setModalMode("edit");
    setActiveItem(schedule);
    setFormDay(schedule.day || "Senin");
    setFormClass(schedule.class || "");
    setFormSubject(schedule.subject || "");
    setFormTeacher(schedule.teacher || "");
    setFormStartTime(schedule.startTime || "07:00");
    setFormEndTime(schedule.endTime || "08:30");
    setConflictError(null);
    setIsModalOpen(true);
  };

  const handleOpenDeleteModal = (schedule: any) => {
    setModalMode("delete");
    setActiveItem(schedule);
    setConflictError(null);
    setIsModalOpen(true);
  };

  // Subject change auto-selects qualified teacher
  const handleSubjectChange = (newSubj: string) => {
    setFormSubject(newSubj);
    const matchingTeacher = teachers.find(t => t.role === newSubj);
    if (matchingTeacher) {
      setFormTeacher(matchingTeacher.name);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConflictError(null);

    if (modalMode === "delete" && activeItem?._firestoreId) {
      setIsSubmitting(true);
      try {
        await deleteDoc(doc(db, "schedules", activeItem._firestoreId));
        toast.showError("Jadwal pelajaran berhasil dihapus.", "Berhasil Hapus");
        setIsModalOpen(false);
      } catch (err) {
        console.error("Delete error:", err);
        const msg = "Gagal menghapus jadwal. Pastikan Anda memiliki izin.";
        setConflictError(msg);
        toast.showError(msg, "Gagal Hapus");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!formClass || !formSubject || !formTeacher || !formStartTime || !formEndTime) {
      const msg = "Mohon lengkapi semua bidang isian jadwal.";
      setConflictError(msg);
      toast.showWarning(msg, "Peringatan");
      return;
    }

    // Check conflict
    const conflict = schedules.find((s: any) => {
      if (modalMode === "edit" && s._firestoreId === activeItem?._firestoreId) return false;
      if (s.day !== formDay) return false;
      if (s.teacher !== formTeacher) return false;
      if (!s.teacher || !formTeacher) return false;

      return (formStartTime < s.endTime && formEndTime > s.startTime);
    });

    if (conflict) {
      const msg = `Bentrok! Guru ${formTeacher} sudah mengajar di kelas ${conflict.class} pada jam ${conflict.startTime} - ${conflict.endTime} (Hari ${formDay}).`;
      setConflictError(msg);
      toast.showWarning(msg, "Bentrok Jadwal");
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalMode === "create") {
        await addDoc(collection(db, "schedules"), {
          day: formDay,
          class: formClass,
          subject: formSubject,
          teacher: formTeacher,
          startTime: formStartTime,
          endTime: formEndTime,
          createdAt: new Date().toISOString()
        });
        toast.showSuccess(`Jadwal pelajaran ${formSubject} di ${formClass} berhasil ditambahkan.`, "Berhasil Tambah");
      } else if (modalMode === "edit" && activeItem?._firestoreId) {
        await updateDoc(doc(db, "schedules", activeItem._firestoreId), {
          day: formDay,
          class: formClass,
          subject: formSubject,
          teacher: formTeacher,
          startTime: formStartTime,
          endTime: formEndTime,
          updatedAt: new Date().toISOString()
        });
        toast.showEdit(`Jadwal pelajaran ${formSubject} di ${formClass} berhasil diperbarui.`, "Berhasil Edit");
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Save error:", err);
      const msg = "Gagal menyimpan data jadwal.";
      setConflictError(msg);
      toast.showError(msg, "Gagal");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered schedule items
  const filteredSchedules = schedules.filter(s => {
    const matchesClass = selectedClassFilter === "All" || s.class === selectedClassFilter;
    const matchesQuery = !searchQuery || 
      (s.subject && s.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.teacher && s.teacher.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.class && s.class.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesClass && matchesQuery;
  });

  return (
    <div className="p-6 md:p-8 max-w-full mx-auto w-full flex-1 flex flex-col h-full animate-in fade-in duration-300">
      
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Jadwal Pelajaran</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#531FFF]/10 text-[#531FFF]">
              {schedules.length} Sesi
            </span>
          </div>
          <p className="text-gray-500 text-sm font-medium mt-1">Kelola dan atur alokasi mata pelajaran mingguan dengan cepat.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-gray-200 shadow-sm text-sm font-semibold text-gray-700">
             <Clock className="w-4 h-4 text-[#531FFF]" />
             <span>{mounted ? `${currentDayString}, ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : ""}</span>
          </div>
          
          <button 
            onClick={() => handleOpenAddModal()}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-[#531FFF] hover:bg-[#531FFF]/90 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-[#531FFF]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-5 h-5" />
            <span>Tambah Jadwal</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Filters & View Switcher */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* View Switcher */}
        <div className="flex bg-gray-100/80 p-1 rounded-xl">
          <button
            onClick={() => setViewMode("weekly")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
              viewMode === "weekly" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Kartu Mingguan</span>
          </button>
          <button
            onClick={() => setViewMode("matrix")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
              viewMode === "matrix" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Table className="w-4 h-4" />
            <span>Matriks Jam</span>
          </button>
          <button
            onClick={() => setViewMode("daily")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
              viewMode === "daily" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <List className="w-4 h-4" />
            <span>Timeline Harian</span>
          </button>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 md:w-56">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari mata pelajaran / guru..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
            />
          </div>

          {/* Class Filter Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 hidden sm:block" />
            <select 
              value={selectedClassFilter} 
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-800 text-xs font-bold rounded-xl focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] py-2 px-3 h-9 shadow-sm cursor-pointer"
            >
              <option value="All">Semua Kelas ({classes.length})</option>
              {classes.map(c => (
                <option key={c._firestoreId || c.name} value={c.name}>Kelas {c.name}</option>
              ))}
            </select>
          </div>
        </div>

      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 flex flex-col items-center justify-center text-gray-500 flex-1">
          <Loader2 className="w-8 h-8 animate-spin text-[#531FFF] mb-3" />
          <p className="text-sm font-medium">Memuat data jadwal pelajaran...</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          
          {/* VIEW MODE 1: WEEKLY CARDS */}
          {viewMode === "weekly" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 overflow-y-auto custom-scrollbar pb-6">
              {DAYS.map(day => {
                const daySchedules = filteredSchedules
                  .filter(s => s.day === day)
                  .sort((a, b) => a.startTime.localeCompare(b.startTime));
                const isToday = mounted && day === currentDayString;

                return (
                  <div key={day} className="flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[420px]">
                    {/* Day Column Header */}
                    <div className={cn(
                      "p-3.5 flex items-center justify-between border-b transition-colors",
                      isToday ? "bg-[#531FFF] text-white border-[#531FFF]" : "bg-gray-50/80 border-gray-100 text-gray-800"
                    )}>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm">{day}</h3>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-extrabold",
                          isToday ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
                        )}>
                          {daySchedules.length}
                        </span>
                      </div>
                      
                      {/* Quick Add Button on Day Column */}
                      <button
                        onClick={() => handleOpenAddModal(day)}
                        title={`Tambah jadwal di hari ${day}`}
                        className={cn(
                          "p-1 rounded-lg transition-all",
                          isToday 
                            ? "hover:bg-white/20 text-white" 
                            : "hover:bg-white text-gray-500 hover:text-[#531FFF] shadow-xs"
                        )}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Schedule Cards for this Day */}
                    <div className="p-3 flex-1 space-y-3 overflow-y-auto custom-scrollbar">
                      {daySchedules.map((schedule, idx) => {
                        const active = isActive(schedule);
                        const palette = getSubjectColor(schedule.subject);

                        return (
                          <div 
                            key={schedule._firestoreId || idx}
                            className={cn(
                              "group relative p-3.5 rounded-xl border transition-all duration-200",
                              palette.bg, palette.border, palette.hover,
                              active && "ring-2 ring-[#531FFF] shadow-md scale-[1.01]"
                            )}
                          >
                            {/* Active Indicator */}
                            {active && (
                              <span className="absolute -top-2 -right-2 flex h-4 w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#531FFF] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-[#531FFF] border-2 border-white"></span>
                              </span>
                            )}

                            <div className="flex justify-between items-start mb-2">
                              <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-md", palette.badge)}>
                                {schedule.startTime} - {schedule.endTime}
                              </span>

                              {/* Action Buttons: Always visible */}
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => handleOpenEditModal(schedule)}
                                  className="p-1 text-gray-400 hover:text-[#531FFF] hover:bg-white/80 rounded-md transition-colors"
                                  title="Edit"
                                >
                                  <PenTool className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleOpenDeleteModal(schedule)}
                                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-white/80 rounded-md transition-colors"
                                  title="Hapus"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <h4 className={cn("font-bold text-sm mb-2 leading-snug", palette.text)}>
                              {schedule.subject || "Tanpa Mapel"}
                            </h4>

                            <div className="space-y-1 text-xs text-gray-600 border-t border-black/5 pt-2 mt-2">
                              <div className="flex justify-between items-center">
                                <span className="text-gray-400">Kelas:</span>
                                <span className="font-bold text-gray-800">{schedule.class || "-"}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-400">Guru:</span>
                                <span className="font-bold text-gray-800 truncate max-w-[110px]" title={schedule.teacher}>
                                  {schedule.teacher || "-"}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Empty Day State */}
                      {daySchedules.length === 0 && (
                        <button
                          onClick={() => handleOpenAddModal(day)}
                          className="w-full h-32 flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 hover:border-[#531FFF]/40 hover:bg-[#531FFF]/5 text-gray-400 hover:text-[#531FFF] transition-all group p-4"
                        >
                          <Plus className="w-6 h-6 mb-1 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-semibold">Tambah Slot</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW MODE 2: TIMETABLE MATRIX GRID */}
          {viewMode === "matrix" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex-1 flex flex-col">
              <div className="overflow-x-auto custom-scrollbar flex-1">
                <table className="w-full border-collapse text-left min-w-[800px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4 w-36 border-r border-gray-100">Waktu / Slot</th>
                      {DAYS.map(day => (
                        <th key={day} className={cn(
                          "py-3.5 px-4 text-center border-r border-gray-100",
                          mounted && day === currentDayString && "bg-[#531FFF]/10 text-[#531FFF]"
                        )}>
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {TIME_PRESETS.map((slot, slotIdx) => (
                      <tr key={slotIdx} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-4 font-bold text-gray-700 bg-gray-50/40 border-r border-gray-100 align-top">
                          <div className="flex items-center gap-1.5 text-[#531FFF]">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{slot.start} - {slot.end}</span>
                          </div>
                          <span className="text-[10px] text-gray-400 font-normal">Jam ke-{slotIdx + 1}</span>
                        </td>

                        {DAYS.map(day => {
                          const slotSchedules = filteredSchedules.filter(s => 
                            s.day === day && 
                            s.startTime >= slot.start && 
                            s.startTime < slot.end
                          );

                          return (
                            <td key={day} className="py-2 px-2 border-r border-gray-100 align-top min-w-[140px] h-24">
                              {slotSchedules.length > 0 ? (
                                <div className="space-y-2">
                                  {slotSchedules.map((s, sIdx) => {
                                    const palette = getSubjectColor(s.subject);
                                    return (
                                      <div 
                                        key={s._firestoreId || sIdx}
                                        className={cn(
                                          "p-2.5 rounded-lg border text-left transition-all",
                                          palette.bg, palette.border
                                        )}
                                      >
                                        <div className="flex justify-between items-start gap-1 mb-1">
                                          <span className={cn("font-bold text-xs truncate", palette.text)}>
                                            {s.subject}
                                          </span>
                                          <div className="flex items-center gap-0.5">
                                            <button 
                                              onClick={() => handleOpenEditModal(s)}
                                              className="p-0.5 text-gray-400 hover:text-[#531FFF]"
                                            >
                                              <PenTool className="w-3 h-3" />
                                            </button>
                                            <button 
                                              onClick={() => handleOpenDeleteModal(s)}
                                              className="p-0.5 text-gray-400 hover:text-red-500"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </div>
                                        <div className="text-[11px] text-gray-600 font-medium truncate">
                                          Kelas {s.class} · {s.teacher}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleOpenAddModal(day, selectedClassFilter !== "All" ? selectedClassFilter : "", slot.start, slot.end)}
                                  className="w-full h-full flex flex-col items-center justify-center text-gray-300 hover:text-[#531FFF] hover:bg-[#531FFF]/5 rounded-lg border border-dashed border-transparent hover:border-[#531FFF]/20 transition-all group py-3"
                                >
                                  <Plus className="w-4 h-4 mb-0.5 group-hover:scale-110 transition-transform" />
                                  <span className="text-[10px] font-semibold">Isi Slot</span>
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW MODE 3: DAILY TIMELINE */}
          {viewMode === "daily" && (
            <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm p-6 overflow-hidden">
              
              {/* Day Selector Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 border-b border-gray-100 custom-scrollbar">
                {DAYS.map(day => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      "px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2",
                      selectedDay === day 
                        ? "bg-[#531FFF] text-white shadow-md shadow-[#531FFF]/20" 
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
                    )}
                  >
                    <span>{day}</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px]",
                      selectedDay === day ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
                    )}>
                      {filteredSchedules.filter(s => s.day === day).length}
                    </span>
                  </button>
                ))}
              </div>

              {/* Timeline Cards */}
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                {filteredSchedules.filter(s => s.day === selectedDay).length > 0 ? (
                  <div className="relative border-l-2 border-[#531FFF]/20 ml-4 md:ml-8 space-y-6 py-2">
                    {filteredSchedules
                      .filter(s => s.day === selectedDay)
                      .sort((a, b) => a.startTime.localeCompare(b.startTime))
                      .map((schedule, idx) => {
                        const active = isActive(schedule);
                        const palette = getSubjectColor(schedule.subject);

                        return (
                          <div key={schedule._firestoreId || idx} className="relative pl-6 md:pl-10">
                            {/* Dot Indicator */}
                            <div className={cn(
                              "absolute -left-[9px] top-4 w-4 h-4 rounded-full border-4 border-white shadow-xs",
                              active ? "bg-red-500 ring-4 ring-red-100" : palette.dot
                            )} />

                            <div className={cn(
                              "p-5 rounded-2xl border transition-all",
                              palette.bg, palette.border,
                              active && "ring-2 ring-[#531FFF] shadow-md"
                            )}>
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                                <div>
                                  <span className={cn("text-xs font-bold px-2.5 py-1 rounded-md", palette.badge)}>
                                    {schedule.startTime} - {schedule.endTime}
                                  </span>
                                  <h4 className={cn("font-extrabold text-lg mt-2 text-gray-900")}>
                                    {schedule.subject}
                                  </h4>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleOpenEditModal(schedule)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 hover:text-[#531FFF] text-xs font-bold rounded-lg border border-gray-200 shadow-xs transition-colors"
                                  >
                                    <PenTool className="w-3.5 h-3.5" /> Edit
                                  </button>
                                  <button
                                    onClick={() => handleOpenDeleteModal(schedule)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-red-600 hover:bg-red-50 text-xs font-bold rounded-lg border border-gray-200 shadow-xs transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Hapus
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4 bg-white/70 backdrop-blur-xs p-3.5 rounded-xl border border-black/5 text-xs">
                                <div>
                                  <span className="text-gray-400 font-medium">Kelas:</span>
                                  <p className="font-bold text-gray-900 mt-0.5">{schedule.class}</p>
                                </div>
                                <div>
                                  <span className="text-gray-400 font-medium">Guru Pengajar:</span>
                                  <p className="font-bold text-gray-900 mt-0.5">{schedule.teacher}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="py-16 flex flex-col items-center justify-center text-center">
                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-3 text-gray-400">
                      <Calendar className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900">Belum ada jadwal untuk {selectedDay}</h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-sm">Klik tombol di bawah untuk menambahkan sesi pelajaran baru di hari {selectedDay}.</p>
                    <button
                      onClick={() => handleOpenAddModal(selectedDay)}
                      className="mt-4 inline-flex items-center gap-2 bg-[#531FFF] hover:bg-[#531FFF]/90 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Jadwal {selectedDay}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}

      {/* QUICK-ADD & EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#531FFF]/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#531FFF] text-white flex items-center justify-center font-bold shadow-md shadow-[#531FFF]/30">
                  {modalMode === "delete" ? <Trash2 className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-lg">
                    {modalMode === "create" && "Tambah Jadwal Pelajaran"}
                    {modalMode === "edit" && "Edit Jadwal Pelajaran"}
                    {modalMode === "delete" && "Konfirmasi Hapus"}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    {modalMode === "delete" ? "Tindakan ini tidak dapat dibatalkan." : "Lengkapi rincian sesi pelajaran di bawah ini."}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              
              {/* Conflict Error Banner */}
              {conflictError && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-xs text-red-800 animate-in slide-in-from-top-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="font-medium leading-relaxed">{conflictError}</div>
                </div>
              )}

              {modalMode !== "delete" ? (
                <>
                  {/* Hari & Kelas (Grid) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Hari</label>
                      <select
                        value={formDay}
                        onChange={(e) => setFormDay(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                      >
                        {DAYS.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Kelas</label>
                      <select
                        value={formClass}
                        onChange={(e) => setFormClass(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                      >
                        {classes.length === 0 && <option value="">Pilih Kelas</option>}
                        {classes.map(c => (
                          <option key={c._firestoreId || c.name} value={c.name}>Kelas {c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Mata Pelajaran */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Mata Pelajaran</label>
                    <select
                      value={formSubject}
                      onChange={(e) => handleSubjectChange(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                    >
                      {subjects.length === 0 && <option value="">Pilih Mata Pelajaran</option>}
                      {subjects.map(s => (
                        <option key={s._firestoreId || s.name} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Guru Pengajar */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Guru Pengajar</label>
                    <select
                      value={formTeacher}
                      onChange={(e) => setFormTeacher(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                    >
                      {teachers.length === 0 && <option value="">Pilih Guru</option>}
                      {teachers.map(t => (
                        <option key={t._firestoreId || t.name} value={t.name}>
                          {t.name} {t.role ? `(${t.role})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Time Presets */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Preset Jam Cepat</label>
                    <div className="flex flex-wrap gap-1.5">
                      {TIME_PRESETS.map((preset, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => {
                            setFormStartTime(preset.start);
                            setFormEndTime(preset.end);
                          }}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all",
                            formStartTime === preset.start && formEndTime === preset.end
                              ? "bg-[#531FFF] text-white border-[#531FFF] shadow-xs"
                              : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                          )}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Jam Mulai & Jam Selesai */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Jam Mulai</label>
                      <input
                        type="time"
                        value={formStartTime}
                        onChange={(e) => setFormStartTime(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Jam Selesai</label>
                      <input
                        type="time"
                        value={formEndTime}
                        onChange={(e) => setFormEndTime(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-sm font-semibold text-gray-800">
                    Apakah Anda yakin ingin menghapus jadwal <span className="text-[#531FFF]">{activeItem?.subject}</span> ({activeItem?.day}, {activeItem?.startTime} - {activeItem?.endTime})?
                  </p>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={cn(
                    "px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all flex items-center gap-2",
                    modalMode === "delete"
                      ? "bg-red-600 hover:bg-red-700 shadow-red-600/20"
                      : "bg-[#531FFF] hover:bg-[#531FFF]/90 shadow-[#531FFF]/20"
                  )}
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {modalMode === "create" && "Simpan Jadwal"}
                    {modalMode === "edit" && "Simpan Perubahan"}
                    {modalMode === "delete" && "Ya, Hapus"}
                  </span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #E2E8F0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #CBD5E1;
        }
      `}} />

    </div>
  );
}
