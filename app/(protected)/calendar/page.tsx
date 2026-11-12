"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, 
  Plus, Sun, ClipboardCheck, Flag, BookOpen, 
  Sparkles, Trash2, Edit3, Search, Printer, 
  X, Loader2, FileText, School, Save
} from "lucide-react";
import { 
  ResponsiveContainer, PieChart, Pie, Cell 
} from "recharts";
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays 
} from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { 
  collection, onSnapshot, doc, addDoc, deleteDoc, updateDoc, serverTimestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { AlertBox, AlertType } from "@/components/ui/alert-box";
import { isParentRole } from "@/lib/roles-config";
import { useAuth } from "@/context/AuthContext";
import { PageContentSkeleton } from "@/components/ui/role-loading-skeleton";

const CATEGORIES = [
  { id: "ALL", label: "Semua Agenda", color: "bg-gray-100 text-gray-800 border-gray-200" },
  { id: "AKADEMIK", label: "Akademik", color: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500", icon: BookOpen },
  { id: "UJIAN", label: "Ujian & Evaluasi", color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", icon: ClipboardCheck },
  { id: "LIBUR", label: "Libur Nasional", color: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500", icon: Sun },
  { id: "EVENT", label: "Event Sekolah", color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", icon: Sparkles },
  { id: "EKSKUL", label: "Ekstrakurikuler", color: "bg-purple-50 text-purple-700 border-purple-200", dot: "bg-purple-500", icon: Flag }
];

const SAMPLE_CALENDAR_EVENTS = [
  {
    id: "sample_cal_1",
    title: "Masa Pengenalan Lingkungan Sekolah (MPLS)",
    category: "AKADEMIK",
    date: "2025-09-08",
    startDate: "2025-09-08",
    endDate: "2025-09-10",
    isAllDay: true,
    startTime: "07:30",
    endTime: "14:00",
    location: "Aula Utama Sekolah",
    target: "Siswa Baru (Kelas 10)",
    desc: "Pengenalan fasilitas sekolah, guru, serta aturan kedisiplinan siswa."
  },
  {
    id: "sample_cal_2",
    title: "Penilaian Tengah Semester (PTS) Ganjil",
    category: "UJIAN",
    date: "2025-09-15",
    startDate: "2025-09-15",
    endDate: "2025-09-20",
    isAllDay: false,
    startTime: "07:30",
    endTime: "12:00",
    location: "Ruang Ujian Masing-masing",
    target: "Seluruh Siswa (Kelas 10, 11, 12)",
    desc: "Wajib memakai seragam rapi dan membawa kartu peserta ujian."
  },
  {
    id: "sample_cal_3",
    title: "Libur Maulid Nabi Muhammad SAW",
    category: "LIBUR",
    date: "2025-09-16",
    startDate: "2025-09-16",
    endDate: "2025-09-16",
    isAllDay: true,
    startTime: "00:00",
    endTime: "23:59",
    location: "Seluruh Wilayah",
    target: "Semua Guru & Siswa",
    desc: "Hari libur nasional memperingati Maulid Nabi."
  },
  {
    id: "sample_cal_4",
    title: "Pentas Seni & Festival Kreativitas Siswa",
    category: "EVENT",
    date: "2025-09-27",
    startDate: "2025-09-27",
    endDate: "2025-09-27",
    isAllDay: false,
    startTime: "08:00",
    endTime: "16:00",
    location: "Lapangan Olahraga Utama",
    target: "Seluruh Warga Sekolah & Orang Tua",
    desc: "Menampilkan bakat seni tari, musik, bazaar wirausaha, dan pameran karya siswa."
  }
];

export default function CalendarPage() {
  const { role: authRole, rawRole: authRawRole, isAuthLoading, isRoleReady } = useAuth();
  const userRole = (authRawRole || authRole || "").toLowerCase();
  const [events, setEvents] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const isStudent = userRole === "siswa" || userRole === "student";
  const isParent = isParentRole(userRole) || userRole === "orang-tua" || userRole === "parent";
  const isReadOnly = isStudent || isParent;
  
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(format(new Date(), 'yyyy-MM-dd'));

  // Alert State
  const [alertState, setAlertState] = useState<{
    type: AlertType;
    title?: string;
    message: string;
  } | null>(null);

  const triggerAlert = (type: AlertType, message: string, title?: string) => {
    setAlertState({ type, message, title });
    setTimeout(() => {
      setAlertState(null);
    }, 5000);
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    category: "AKADEMIK",
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    isAllDay: true,
    startTime: "08:00",
    endTime: "14:00",
    location: "Aula / Lingkungan Sekolah",
    target: "Seluruh Siswa",
    desc: ""
  });

  // Calculate Academic Progress Year Stats
  const today = new Date();
  const currentYear = today.getFullYear();
  const academicYearStart = new Date(today.getMonth() < 6 ? currentYear - 1 : currentYear, 6, 15);
  const academicYearEnd = new Date(today.getMonth() < 6 ? currentYear : currentYear + 1, 5, 15);

  const totalDays = Math.max(1, Math.ceil((academicYearEnd.getTime() - academicYearStart.getTime()) / (1000 * 60 * 60 * 24)));
  const passedDays = Math.max(0, Math.ceil((today.getTime() - academicYearStart.getTime()) / (1000 * 60 * 60 * 24)));
  const progressPercent = Math.max(0, Math.min(100, Math.round((passedDays / totalDays) * 100)));
  const currentSemester = today.getMonth() < 6 ? "Semester Genap" : "Semester Ganjil";
  const academicYearText = today.getMonth() < 6 ? `${currentYear - 1}/${currentYear}` : `${currentYear}/${currentYear + 1}`;

  // Firestore Realtime Subscription & Auto Sample Fallback
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "calendar_events"), (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEvents(docs.length > 0 ? docs : SAMPLE_CALENDAR_EVENTS);
    }, (err) => {
      console.warn("Calendar listener error:", err);
      setEvents(SAMPLE_CALENDAR_EVENTS);
    });

    return () => {
      unsub();
    };
  }, []);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const matchCat = selectedCategory === "ALL" || e.category === selectedCategory;
      const matchQuery = !searchQuery || 
        (e.title && e.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.location && e.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.desc && e.desc.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchQuery;
    }).sort((a, b) => new Date(a.startDate || a.date).getTime() - new Date(b.startDate || b.date).getTime());
  }, [events, selectedCategory, searchQuery]);

  // Upcoming Agenda
  const upcomingEvents = useMemo(() => {
    return events
      .filter(e => e.startDate && new Date(e.startDate) >= new Date(new Date().setHours(0,0,0,0)))
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 5);
  }, [events]);

  // Events on currently selected date (for mobile/tablet quick view sheet)
  const selectedDateEvents = useMemo(() => {
    if (!selectedDateStr) return [];
    return filteredEvents.filter(e => {
      if (!e.startDate && !e.date) return false;
      const s = e.startDate || e.date;
      const end = e.endDate || s;
      return selectedDateStr >= s && selectedDateStr <= end;
    });
  }, [selectedDateStr, filteredEvents]);

  // Calendar Controls
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDateStr(format(now, 'yyyy-MM-dd'));
  };

  // Category Color Lookup Helper
  const getCategoryMeta = (cat: string) => {
    const found = CATEGORIES.find(c => c.id === cat?.toUpperCase());
    if (found) return found;
    return { id: "LAINNYA", label: "Lainnya", color: "bg-gray-100 text-gray-700 border-gray-200", dot: "bg-gray-400", icon: CalendarIcon };
  };

  // Handle Open Create Modal
  const handleOpenAdd = (defaultDateStr?: string) => {
    if (isReadOnly) return;
    setEditingEventId(null);
    const dateVal = defaultDateStr || format(new Date(), 'yyyy-MM-dd');
    setFormData({
      title: "",
      category: "AKADEMIK",
      startDate: dateVal,
      endDate: dateVal,
      isAllDay: true,
      startTime: "08:00",
      endTime: "14:00",
      location: "Aula / Lingkungan Sekolah",
      target: "Seluruh Siswa",
      desc: ""
    });
    setIsModalOpen(true);
  };

  // Handle Edit Modal
  const handleEdit = (event: any) => {
    if (isReadOnly) return;
    setEditingEventId(event.id);
    setFormData({
      title: event.title || "",
      category: event.category || "AKADEMIK",
      startDate: event.startDate || event.date || format(new Date(), 'yyyy-MM-dd'),
      endDate: event.endDate || event.startDate || format(new Date(), 'yyyy-MM-dd'),
      isAllDay: event.isAllDay ?? true,
      startTime: event.startTime || "08:00",
      endTime: event.endTime || "14:00",
      location: event.location || "Lingkungan Sekolah",
      target: event.target || "Seluruh Siswa",
      desc: event.desc || ""
    });
    setIsModalOpen(true);
  };

  // Form Submit Handler
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isStudent) return;
    if (!formData.title || !formData.startDate) {
      triggerAlert("error", "Harap lengkapi Judul Agenda dan Tanggal Mulai.", "Gagal Validasi");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: formData.title,
        category: formData.category,
        date: formData.startDate,
        startDate: formData.startDate,
        endDate: formData.endDate || formData.startDate,
        isAllDay: formData.isAllDay,
        startTime: formData.isAllDay ? "00:00" : formData.startTime,
        endTime: formData.isAllDay ? "23:59" : formData.endTime,
        location: formData.location,
        target: formData.target,
        desc: formData.desc,
        updatedAt: serverTimestamp()
      };

      if (editingEventId && !editingEventId.startsWith("sample_")) {
        await updateDoc(doc(db, "calendar_events", editingEventId), payload);
        triggerAlert("edit", `Agenda "${formData.title}" berhasil diperbarui!`, "Berhasil Edit");
      } else {
        await addDoc(collection(db, "calendar_events"), {
          ...payload,
          createdAt: serverTimestamp()
        });
        triggerAlert("success", `Agenda "${formData.title}" berhasil ditambahkan ke kalender!`, "Berhasil Tambah");
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Error saving event:", err);
      triggerAlert("error", `Gagal menyimpan agenda: ${err?.message || "Terjadi kesalahan"}`, "Gagal");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Handler
  const handleDelete = async (id: string) => {
    if (isReadOnly) return;
    if (id.startsWith("sample_")) {
      triggerAlert("warning", "Contoh sampel agenda tidak perlu dihapus.", "Informasi");
      return;
    }
    if (!confirm("Apakah Anda yakin ingin menghapus agenda ini?")) return;
    try {
      await deleteDoc(doc(db, "calendar_events", id));
      triggerAlert("error", "Agenda berhasil dihapus dari kalender.", "Terhapus");
    } catch (e) {
      console.error("Error deleting event:", e);
      triggerAlert("error", "Gagal menghapus agenda.", "Gagal");
    }
  };

  // Render Calendar Grid Cells
  const renderCalendarCells = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const dateStr = format(cloneDay, 'yyyy-MM-dd');
        const formattedDayNum = format(cloneDay, 'd');
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isToday = isSameDay(day, new Date());
        const isSelected = selectedDateStr === dateStr;

        // Find events on this date
        const dayEvents = filteredEvents.filter(e => {
          if (!e.startDate && !e.date) return false;
          const s = e.startDate || e.date;
          const end = e.endDate || s;
          return dateStr >= s && dateStr <= end;
        });

        days.push(
          <div
            key={day.toString()}
            onClick={() => {
              setSelectedDateStr(dateStr);
            }}
            className={cn(
              "min-h-[72px] sm:min-h-[92px] md:min-h-[110px] p-1.5 sm:p-2 border-b border-r border-gray-100 transition-all group flex flex-col justify-between relative cursor-pointer",
              isSelected 
                ? "bg-purple-50/60 ring-2 ring-inset ring-[#531FFF]" 
                : !isCurrentMonth 
                ? "bg-gray-50/40 text-gray-400" 
                : isToday 
                ? "bg-purple-50/20" 
                : "bg-white hover:bg-purple-50/20"
            )}
          >
            {/* Top Date Header */}
            <div className="flex items-center justify-between">
              <span className={cn(
                "w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg text-[11px] sm:text-xs font-extrabold transition-all",
                isToday 
                  ? "bg-[#531FFF] text-white shadow-md shadow-[#531FFF]/20" 
                  : !isCurrentMonth 
                  ? "text-gray-400" 
                  : isSelected
                  ? "text-[#531FFF] font-black"
                  : "text-gray-800 group-hover:text-[#531FFF]"
              )}>
                {formattedDayNum}
              </span>

              {!isStudent && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenAdd(dateStr);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-[#531FFF] hover:bg-white rounded transition-all shadow-xs hidden sm:block"
                  title="Tambah Agenda Hari Ini"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Mobile Dots / Badge Indicator (Layar Ponsel < sm / < 640px) */}
            <div className="flex sm:hidden flex-wrap items-center gap-1 mt-1">
              {dayEvents.slice(0, 3).map((event, idx) => {
                const meta = getCategoryMeta(event.category);
                return (
                  <span
                    key={event.id || idx}
                    className={cn("w-2 h-2 rounded-full shrink-0 shadow-2xs", meta.dot)}
                    title={event.title}
                  />
                );
              })}
              {dayEvents.length > 3 && (
                <span className="text-[8px] font-black text-[#531FFF] leading-none">
                  +{dayEvents.length - 3}
                </span>
              )}
            </div>

            {/* Tablet & Desktop Event Pills (Layar >= sm / >= 640px) */}
            <div className="hidden sm:block space-y-1 sm:space-y-1.5 mt-1 sm:mt-2 flex-1">
              {dayEvents.slice(0, 3).map((event, idx) => {
                const meta = getCategoryMeta(event.category);
                return (
                  <div
                    key={event.id || idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isStudent) {
                        handleEdit(event);
                      }
                    }}
                    className={cn(
                      "text-[10px] font-extrabold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md truncate transition-all flex items-center gap-1 sm:gap-1.5 border shadow-2xs hover:scale-[1.02]",
                      meta.color
                    )}
                    title={`${event.title} (${event.location || ""})`}
                  >
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", meta.dot)} />
                    <span className="truncate">{event.title}</span>
                  </div>
                );
              })}

              {dayEvents.length > 3 && (
                <span className="text-[9px] font-extrabold text-[#531FFF] bg-[#531FFF]/10 px-1.5 py-0.5 rounded inline-block">
                  +{dayEvents.length - 3} agenda
                </span>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return rows;
  };

  if (isAuthLoading || !isRoleReady) {
    return <PageContentSkeleton />;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 pb-20 max-w-[1600px] mx-auto w-full flex-1 flex flex-col min-h-screen bg-gray-50/50 animate-in fade-in duration-300 relative space-y-6 sm:space-y-8">
      
      {/* FLOATING TOAST ALERT NOTIFICATION BOX */}
      {alertState && (
        <div className="fixed top-6 right-6 z-50 max-w-md w-full animate-in slide-in-from-top-4 fade-in duration-300">
          <AlertBox
            type={alertState.type}
            title={alertState.title}
            message={alertState.message}
            onClose={() => setAlertState(null)}
          />
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. HEADER BANNER SECTION                                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white p-5 sm:p-7 md:p-8 rounded-2xl border border-gray-100 shadow-xs space-y-4">
        {/* Top Row: Icon, Title, Status & Quick Info Chip */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#531FFF] to-[#7B42FF] text-white flex items-center justify-center font-bold shadow-md shadow-[#531FFF]/20 shrink-0 mt-0.5 sm:mt-0">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                  Kalender Akademik
                </h1>
                <span className="px-2.5 py-0.5 text-[11px] font-extrabold bg-purple-50 text-[#531FFF] rounded-full border border-purple-200/80 flex items-center gap-1.5 shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-[#531FFF]" />
                  T.A. {academicYearText} ({currentSemester})
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1 leading-relaxed">
                Manajemen agenda kegiatan sekolah, jadwal ujian semester, libur nasional, dan acara akademik terpadu.
              </p>
            </div>
          </div>

          {/* Quick Context Chip */}
          <div className="flex items-center gap-2 self-start lg:self-center shrink-0 flex-wrap">
            <div className="px-3.5 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-2 text-xs flex-wrap">
              <span className="text-gray-400 font-medium">Bulan Aktif:</span>
              <strong className="text-gray-900 font-bold">{format(currentDate, 'MMMM yyyy', { locale: idLocale })}</strong>
              <span className="text-gray-300 hidden sm:inline">•</span>
              <span className="text-[#531FFF] font-bold bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 text-[10px]">
                {events.length} Agenda Terdata
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Row / Toolbar: Helper Info on Left + Action Buttons on Right */}
        <div className="pt-3.5 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-50 text-amber-600 text-[11px] font-bold shrink-0">
              💡
            </span>
            <span className="line-clamp-1">
              Seluruh agenda sekolah yang ditambahkan otomatis terintegrasi ke portal guru, orang tua, dan siswa.
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap w-full sm:w-auto">
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="flex-1 sm:flex-none justify-center px-3.5 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-gray-500" />
              <span>Cetak Kalender (PDF)</span>
            </button>

            {!isReadOnly && (
              <button
                onClick={() => handleOpenAdd()}
                className="flex-1 sm:flex-none justify-center px-4 py-2 bg-gradient-to-r from-[#531FFF] to-[#7B42FF] text-white hover:shadow-lg hover:shadow-[#531FFF]/25 active:scale-[0.98] text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-md shadow-[#531FFF]/25"
              >
                <Plus className="w-3.5 h-3.5 text-white" />
                <span>Tambah Agenda Baru</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. PROGRESS & CATEGORY HIGHLIGHTS GRID                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        
        {/* Academic Year Progress Box (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-sm text-gray-900">Progress Tahun Ajaran {academicYearText}</h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {currentSemester}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6">
            <div className="w-28 h-28 relative shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[{ value: progressPercent }, { value: 100 - progressPercent }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={36}
                    outerRadius={48}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                    stroke="none"
                  >
                    <Cell fill="#531FFF" />
                    <Cell fill="#F1F5F9" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-extrabold text-gray-900 leading-none">{progressPercent}%</span>
                <span className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">Berjalan</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 w-full flex-1 text-xs">
              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Hari Berjalan</span>
                <p className="font-extrabold text-sm text-gray-900 mt-0.5">{passedDays} Hari</p>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Sisa Hari</span>
                <p className="font-extrabold text-sm text-gray-900 mt-0.5">{totalDays - passedDays} Hari</p>
              </div>
              <div className="col-span-2 text-[11px] text-gray-500 italic">
                Periode: {format(academicYearStart, 'dd MMM yyyy', { locale: idLocale })} - {format(academicYearEnd, 'dd MMM yyyy', { locale: idLocale })}
              </div>
            </div>
          </div>
        </div>

        {/* Category Filters Bar (7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-sm text-gray-900 mb-1">Filter & Legenda Kategori Agenda</h3>
            <p className="text-xs text-gray-400 mb-3 sm:mb-4">Klik kategori untuk memfilter agenda yang tampil pada kalender</p>
          </div>

          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-extrabold transition-all border cursor-pointer",
                    isSelected 
                      ? "bg-[#531FFF] text-white border-[#531FFF] shadow-md shadow-[#531FFF]/20 scale-105" 
                      : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                  )}
                >
                  {cat.dot && <span className={cn("w-2 h-2 rounded-full", isSelected ? "bg-white" : cat.dot)} />}
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Search */}
          <div className="mt-4 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari agenda sekolah, lokasi, atau keterangan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
            />
          </div>
        </div>

      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. MAIN CALENDAR CONTENT LAYOUT                                */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        
        {/* Left Column: Calendar Grid / List View (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {viewMode === "grid" ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4 sm:p-6">
              
              {/* Month Navigation & View Switcher Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
                <div className="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-3 flex-wrap">
                  <div className="flex items-center bg-gray-100 border border-gray-200 rounded-xl p-1">
                    <button 
                      onClick={prevMonth}
                      className="p-1.5 hover:bg-white rounded-lg text-gray-600 hover:text-gray-900 transition-all cursor-pointer"
                      title="Bulan Sebelumnya"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={nextMonth}
                      className="p-1.5 hover:bg-white rounded-lg text-gray-600 hover:text-gray-900 transition-all cursor-pointer"
                      title="Bulan Berikutnya"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-gray-900 capitalize">
                    {format(currentDate, 'MMMM yyyy', { locale: idLocale })}
                  </h2>

                  <button 
                    onClick={goToToday}
                    className="px-2.5 sm:px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-extrabold text-gray-700 transition-colors cursor-pointer"
                  >
                    Hari Ini
                  </button>
                </div>

                {/* View Switcher Tabbing */}
                <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 w-full sm:w-auto">
                  <button
                    onClick={() => setViewMode("grid")}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer bg-white text-gray-900 shadow-xs font-black"
                  >
                    <CalendarIcon className="w-3.5 h-3.5 text-[#531FFF]" />
                    <span>Grid Bulanan</span>
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-gray-500 hover:text-gray-900"
                  >
                    <FileText className="w-3.5 h-3.5 text-gray-400" />
                    <span>Daftar Agenda</span>
                  </button>
                </div>
              </div>

              {/* Day Headers */}
              <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-2xs">
                <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
                  {[
                    { full: 'Senin', short: 'Sen' },
                    { full: 'Selasa', short: 'Sel' },
                    { full: 'Rabu', short: 'Rab' },
                    { full: 'Kamis', short: 'Kam' },
                    { full: 'Jumat', short: 'Jum' },
                    { full: 'Sabtu', short: 'Sab' },
                    { full: 'Minggu', short: 'Min' },
                  ].map((d) => (
                    <div key={d.full} className="py-2 sm:py-2.5 text-center text-[11px] sm:text-xs font-extrabold text-gray-600 border-r border-gray-100 last:border-r-0">
                      <span className="hidden sm:inline">{d.full}</span>
                      <span className="inline sm:hidden">{d.short}</span>
                    </div>
                  ))}
                </div>

                {/* Calendar Cells Grid */}
                {renderCalendarCells()}
              </div>

              {/* SELECTED DATE QUICK DRAWER / ACTION CARD */}
              {selectedDateStr && (
                <div className="mt-4 p-4 sm:p-5 rounded-2xl border border-purple-200/80 bg-gradient-to-br from-purple-50/50 via-white to-white shadow-xs animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-purple-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#531FFF] text-white flex items-center justify-center font-bold shadow-xs">
                        <CalendarIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-xs sm:text-sm text-gray-900">
                          {format(new Date(selectedDateStr), 'EEEE, dd MMMM yyyy', { locale: idLocale })}
                        </h4>
                        <span className="text-[11px] font-semibold text-gray-500">
                          {selectedDateEvents.length > 0 ? `${selectedDateEvents.length} Agenda Terjadwal` : "Tidak ada agenda"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {!isReadOnly && (
                        <button
                          onClick={() => handleOpenAdd(selectedDateStr)}
                          className="px-3 py-1.5 bg-[#531FFF] hover:bg-[#4315cc] text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambah Agenda</span>
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedDateStr(null)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Tutup Panel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* List of events on this day */}
                  <div className="mt-3 divide-y divide-gray-100">
                    {selectedDateEvents.map((evt, idx) => {
                      const meta = getCategoryMeta(evt.category);
                      const Icon = meta.icon || CalendarIcon;
                      return (
                        <div key={evt.id || idx} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border", meta.color)}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-xs text-gray-900 truncate">{evt.title}</span>
                                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-extrabold border shrink-0", meta.color)}>
                                  {meta.label}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500 font-medium mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                <span>⏰ {evt.isAllDay ? "Sepanjang Hari" : `${evt.startTime} - ${evt.endTime}`}</span>
                                {evt.location && <span>📍 {evt.location}</span>}
                                {evt.target && <span className="text-[#531FFF]">🎯 {evt.target}</span>}
                              </p>
                            </div>
                          </div>

                          {!isStudent && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleEdit(evt)}
                                className="p-1.5 text-gray-400 hover:text-[#531FFF] hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit Agenda"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(evt.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Hapus Agenda"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {selectedDateEvents.length === 0 && (
                      <p className="text-xs text-gray-400 py-3 text-center">
                        Belum ada agenda pada tanggal ini. Klik tombol Tambah Agenda di atas untuk membuat kegiatan baru.
                      </p>
                    )}
                  </div>
                </div>
              )}

            </div>
          ) : (
            /* LIST VIEW MODE */
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
              {/* Month Navigation & View Switcher Bar for List View */}
              <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-3 flex-wrap">
                  <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-2xs">
                    <button 
                      onClick={prevMonth}
                      className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-gray-900 transition-all cursor-pointer"
                      title="Bulan Sebelumnya"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={nextMonth}
                      className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-gray-900 transition-all cursor-pointer"
                      title="Bulan Berikutnya"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-gray-900 capitalize">
                    {format(currentDate, 'MMMM yyyy', { locale: idLocale })}
                  </h2>

                  <button 
                    onClick={goToToday}
                    className="px-2.5 sm:px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-extrabold text-gray-700 transition-colors cursor-pointer shadow-2xs"
                  >
                    Hari Ini
                  </button>
                </div>

                {/* View Switcher Tabbing */}
                <div className="flex items-center bg-gray-200/80 p-1 rounded-xl border border-gray-200 w-full sm:w-auto">
                  <button
                    onClick={() => setViewMode("grid")}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-gray-600 hover:text-gray-900"
                  >
                    <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                    <span>Grid Bulanan</span>
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer bg-white text-[#531FFF] shadow-xs font-black"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#531FFF]" />
                    <span>Daftar Agenda ({filteredEvents.length})</span>
                  </button>
                </div>
              </div>

              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-white text-xs">
                <h3 className="font-bold text-gray-800 uppercase tracking-wider">Daftar Seluruh Agenda ({filteredEvents.length})</h3>
                <span className="text-gray-400 font-medium hidden sm:inline">Diurutkan berdasarkan tanggal pelaksanaan</span>
              </div>

              <div className="divide-y divide-gray-100">
                {filteredEvents.map((evt, idx) => {
                  const meta = getCategoryMeta(evt.category);
                  const Icon = meta.icon || CalendarIcon;
                  const formattedDate = format(new Date(evt.startDate || evt.date), 'dd MMMM yyyy', { locale: idLocale });

                  return (
                    <div key={evt.id || idx} className="p-3.5 sm:p-4 hover:bg-gray-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                      <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
                        <div className={cn("w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 border font-bold", meta.color)}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-extrabold text-xs sm:text-sm text-gray-900 truncate">{evt.title}</h4>
                            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-extrabold border shrink-0", meta.color)}>
                              {meta.label}
                            </span>
                          </div>
                          <div className="text-[11px] sm:text-xs text-gray-500 font-medium mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="flex items-center gap-1">📅 {formattedDate}</span>
                            <span className="flex items-center gap-1">⏰ {evt.isAllDay ? "Sepanjang Hari" : `${evt.startTime} - ${evt.endTime}`}</span>
                            {evt.location && <span className="flex items-center gap-1">📍 {evt.location}</span>}
                            {evt.target && <span className="flex items-center gap-1 text-[#531FFF]">🎯 {evt.target}</span>}
                          </div>
                        </div>
                      </div>

                      {!isStudent && (
                        <div className="flex items-center justify-end gap-1.5 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100">
                          <button
                            onClick={() => handleEdit(evt)}
                            className="p-1.5 text-gray-400 hover:text-[#531FFF] hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Agenda"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(evt.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Agenda"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredEvents.length === 0 && (
                  <div className="p-12 text-center text-gray-400 text-xs">
                    Tidak ada agenda yang cocok dengan filter pencarian.
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Upcoming Agenda & Statistics Sidebar (4 cols on desktop, 2 cols on tablet) */}
        <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
          
          {/* Upcoming Events Box */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#531FFF]" />
                  <h3 className="font-bold text-xs text-gray-800 uppercase tracking-wider">Agenda Terdekat</h3>
                </div>
                <span className="text-[11px] font-extrabold text-[#531FFF] bg-[#531FFF]/10 px-2 py-0.5 rounded-full">
                  {upcomingEvents.length} Agenda
                </span>
              </div>

              <div className="space-y-2.5 mt-3">
                {upcomingEvents.map((evt, idx) => {
                  const meta = getCategoryMeta(evt.category);
                  const Icon = meta.icon || CalendarIcon;
                  const dateText = format(new Date(evt.startDate || evt.date), 'dd MMM yyyy', { locale: idLocale });

                  return (
                    <div 
                      key={evt.id || idx}
                      onClick={() => handleEdit(evt)}
                      className="p-3 bg-gray-50 hover:bg-purple-50/50 rounded-xl border border-gray-200 transition-all cursor-pointer group flex items-start gap-3"
                    >
                      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border font-bold mt-0.5", meta.color)}>
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-extrabold text-xs text-gray-900 group-hover:text-[#531FFF] transition-colors truncate">
                          {evt.title}
                        </h4>
                        <p className="text-[11px] font-medium text-gray-500 mt-0.5">{dateText} · {evt.location || "Sekolah"}</p>
                      </div>

                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#531FFF] shrink-0 mt-2" />
                    </div>
                  );
                })}

                {upcomingEvents.length === 0 && (
                  <p className="text-center text-xs text-gray-400 py-4">Belum ada agenda terdekat.</p>
                )}
              </div>
            </div>

            {!isReadOnly && (
              <button
                onClick={() => handleOpenAdd()}
                className="w-full mt-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-[#531FFF] font-bold text-xs rounded-xl transition-colors border border-gray-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Tambah Agenda Sekarang
              </button>
            )}
          </div>

          {/* Quick Statistics Card */}
          <div className="bg-gradient-to-br from-[#531FFF] to-indigo-800 text-white rounded-2xl p-6 shadow-md relative overflow-hidden space-y-4 flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full pointer-events-none" />

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">Ringkasan Kalender</span>
              <h3 className="text-3xl font-extrabold mt-1">{events.length} Agenda</h3>
              <p className="text-xs text-white/80 mt-1">Tercatat aktif dalam database Firestore</p>
            </div>

            <div className="pt-3 border-t border-white/20 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/10 p-2.5 rounded-xl border border-white/10">
                <span className="text-[10px] text-white/70 block">Akademik</span>
                <span className="font-extrabold text-sm">{events.filter(e => e.category === 'AKADEMIK').length}</span>
              </div>
              <div className="bg-white/10 p-2.5 rounded-xl border border-white/10">
                <span className="text-[10px] text-white/70 block">Ujian</span>
                <span className="font-extrabold text-sm">{events.filter(e => e.category === 'UJIAN').length}</span>
              </div>
              <div className="bg-white/10 p-2.5 rounded-xl border border-white/10">
                <span className="text-[10px] text-white/70 block">Libur</span>
                <span className="font-extrabold text-sm">{events.filter(e => e.category === 'LIBUR').length}</span>
              </div>
              <div className="bg-white/10 p-2.5 rounded-xl border border-white/10">
                <span className="text-[10px] text-white/70 block">Event & Ekskul</span>
                <span className="font-extrabold text-sm">{events.filter(e => e.category === 'EVENT' || e.category === 'EKSKUL').length}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. MODAL TAMBAH / EDIT AGENDA KALENDER                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-xl p-5 sm:p-6 text-gray-900 my-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#531FFF] flex items-center justify-center font-bold">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-sm sm:text-base text-gray-900">
                  {editingEventId ? "Edit Agenda Kalender" : "Tambah Agenda Kalender Baru"}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitForm} className="mt-4 space-y-3.5 text-xs">
              
              <div>
                <label className="block font-bold text-gray-700 mb-1">Judul Agenda Kegiatan</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Contoh: Penilaian Akhir Semester / Pentas Seni Sekolah"
                  className="w-full px-3 py-2.5 font-medium bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Kategori Agenda</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2.5 font-bold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20 cursor-pointer"
                  >
                    <option value="AKADEMIK">Akademik (Biru)</option>
                    <option value="UJIAN">Ujian & Evaluasi (Oranye)</option>
                    <option value="LIBUR">Libur Nasional (Merah)</option>
                    <option value="EVENT">Event Sekolah (Hijau)</option>
                    <option value="EKSKUL">Ekstrakurikuler (Ungu)</option>
                    <option value="LAINNYA">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Target Peserta</label>
                  <input
                    type="text"
                    value={formData.target}
                    onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                    placeholder="Contoh: Seluruh Siswa, Kelas 10, Guru"
                    className="w-full px-3 py-2.5 font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Tanggal Mulai</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2.5 font-bold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Tanggal Selesai</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2.5 font-bold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isAllDay"
                  checked={formData.isAllDay}
                  onChange={(e) => setFormData({ ...formData, isAllDay: e.target.checked })}
                  className="w-4 h-4 text-[#531FFF] rounded focus:ring-[#531FFF] cursor-pointer"
                />
                <label htmlFor="isAllDay" className="font-bold text-gray-700 cursor-pointer">Acara Sepanjang Hari (All Day)</label>
              </div>

              {!formData.isAllDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Jam Mulai</label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full px-3 py-2.5 font-bold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20 text-center"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Jam Selesai</label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full px-3 py-2.5 font-bold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20 text-center"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-gray-700 mb-1">Lokasi / Ruangan</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Contoh: Aula Utama, Lab Komputer, Lapangan Olahraga"
                  className="w-full px-3 py-2.5 font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Deskripsi & Catatan Tambahan</label>
                <textarea
                  rows={2}
                  value={formData.desc}
                  onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
                  placeholder="Tuliskan keterangan detail kegiatan..."
                  className="w-full p-3 font-medium bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-gray-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors text-center cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#531FFF] hover:bg-[#4315cc] text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-[#531FFF]/20 transition-all cursor-pointer"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{editingEventId ? "Simpan Perubahan" : "Tambah Agenda"}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. PRINT-READY OFFICIAL ACADEMIC CALENDAR SHEET MODAL          */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar p-5 sm:p-7 md:p-8 text-gray-900 font-sans print-area my-auto">
            
            {/* Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-5 border-b border-gray-200 no-print">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#531FFF] flex items-center justify-center font-bold">
                  <School className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-sm sm:text-base">Pratinjau Cetak Kalender Akademik Resmi</h3>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => window.print()}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#531FFF] hover:bg-[#4315cc] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
                >
                  <Printer className="w-4 h-4" /> Cetak / Download PDF
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="flex-1 sm:flex-none px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer text-center"
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* Document Content */}
            <div className="pt-6 space-y-6">
              
              {/* KOP */}
              <div className="text-center border-b-2 border-gray-900 pb-4">
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-widest text-gray-900 uppercase">SMA QUICK SCHOOLS INDONESIA</h2>
                <p className="text-xs font-medium text-gray-600 mt-1">
                  Jl. Pendidikan Utama No. 45, Jakarta Selatan · Telp: (021) 7890123 · Website: www.quickschools.sch.id
                </p>
                <p className="text-xs font-extrabold text-gray-900 uppercase mt-2 tracking-wider">
                  KALENDER AKADEMIK & AGENDA KEGIATAN SEKOLAH · TAHUN AJARAN {academicYearText}
                </p>
              </div>

              {/* Table wrapped with overflow-x-auto */}
              <div className="overflow-x-auto border border-gray-300 rounded-xl">
                <table className="w-full border-collapse text-xs text-left min-w-[640px]">
                  <thead>
                    <tr className="bg-gray-100 font-bold text-gray-800 border-b border-gray-300">
                      <th className="p-2.5 text-center w-10 border-r border-gray-300">No</th>
                      <th className="p-2.5 border-r border-gray-300">Nama Agenda Kegiatan</th>
                      <th className="p-2.5 text-center w-32 border-r border-gray-300">Kategori</th>
                      <th className="p-2.5 border-r border-gray-300">Tanggal & Waktu</th>
                      <th className="p-2.5 border-r border-gray-300">Lokasi</th>
                      <th className="p-2.5">Target Peserta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredEvents.map((ex, i) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="p-2.5 text-center font-medium border-r border-gray-200">{i + 1}</td>
                        <td className="p-2.5 font-bold text-gray-900 border-r border-gray-200">{ex.title}</td>
                        <td className="p-2.5 text-center font-bold border-r border-gray-200">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-gray-100">
                            {ex.category}
                          </span>
                        </td>
                        <td className="p-2.5 border-r border-gray-200">{ex.startDate} s/d {ex.endDate}</td>
                        <td className="p-2.5 border-r border-gray-200">{ex.location || "Sekolah"}</td>
                        <td className="p-2.5">{ex.target || "Semua"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 text-center text-xs pt-8 sm:pt-12 border-t border-gray-300">
                <div>
                  <p>Waka Kurikulum</p>
                  <div className="h-14 sm:h-16" />
                  <p className="font-bold border-b border-gray-400 inline-block px-4">Drs. Taufik Hidayat, M.Pd.</p>
                </div>
                <div>
                  <p>Kepala Sekolah</p>
                  <div className="h-14 sm:h-16" />
                  <p className="font-bold border-b border-gray-400 inline-block px-4">Dr. H. Rahmat Wijaya, M.Si.</p>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Print CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

    </div>
  );
}
