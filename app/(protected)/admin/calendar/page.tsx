"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, 
  Download, Plus, Sun, ClipboardCheck, Flag, BookOpen, Filter, 
  Sparkles, Trash2, Edit3, Search, Clock, MapPin, Users, Printer, 
  X, Check, Loader2, Tag, ArrowRight, Layers, FileText, CheckCircle2, AlertTriangle, School, Save
} from "lucide-react";
import { 
  ResponsiveContainer, PieChart, Pie, Cell 
} from "recharts";
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, 
  parseISO, isWithinInterval 
} from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { 
  collection, onSnapshot, doc, getDoc, setDoc, addDoc, deleteDoc, updateDoc, serverTimestamp 
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { AlertBox, AlertType } from "@/components/ui/alert-box";

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
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [userRole, setUserRole] = useState<string>("admin");
  const isStudent = userRole === "siswa" || userRole === "student";
  
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

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
    location: "Lingkungan Sekolah",
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

  // Firestore Realtime Subscription & Auto Sample Fallback + Auth Role fetch
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userSnap = await getDoc(doc(db, "users", user.uid));
          if (userSnap.exists()) {
            setUserRole(userSnap.data().role || "admin");
          }
        } catch (e) {
          console.warn("User role fetch error", e);
        }
      }
    });

    const unsub = onSnapshot(collection(db, "calendar_events"), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEvents(list.length > 0 ? list : SAMPLE_CALENDAR_EVENTS);
      setLoading(false);
    }, (err) => {
      console.warn("Calendar events fetch error:", err);
      setEvents(SAMPLE_CALENDAR_EVENTS);
      setLoading(false);
    });

    return () => {
      unsubAuth();
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

  // Calendar Controls
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Category Color Lookup Helper
  const getCategoryMeta = (cat: string) => {
    const found = CATEGORIES.find(c => c.id === cat?.toUpperCase());
    if (found) return found;
    return { id: "LAINNYA", label: "Lainnya", color: "bg-gray-100 text-gray-700 border-gray-200", dot: "bg-gray-400", icon: CalendarIcon };
  };

  // Handle Open Create Modal
  const handleOpenAdd = (defaultDateStr?: string) => {
    if (isStudent) return;
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
    if (isStudent) return;
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
    if (isStudent) return;
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
              if (userRole !== "siswa") handleOpenAdd(dateStr);
            }}
            className={cn(
              "min-h-[110px] p-2 border-b border-r border-gray-100 transition-all group flex flex-col justify-between relative",
              userRole !== "siswa" && "cursor-pointer hover:bg-purple-50/30",
              !isCurrentMonth ? "bg-gray-50/40 text-gray-400" : isToday ? "bg-purple-50/20" : "bg-white"
            )}
          >
            {/* Top Date Header */}
            <div className="flex items-center justify-between">
              <span className={cn(
                "w-7 h-7 flex items-center justify-center rounded-xl text-xs font-extrabold transition-all",
                isToday 
                  ? "bg-[#531FFF] text-white shadow-md shadow-[#531FFF]/20" 
                  : !isCurrentMonth 
                  ? "text-gray-400" 
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
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-[#531FFF] hover:bg-white rounded-md transition-all shadow-xs"
                  title="Tambah Agenda Hari Ini"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Event Pills */}
            <div className="space-y-1.5 mt-2 flex-1">
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
                      "text-[10px] font-extrabold px-2 py-1 rounded-lg truncate transition-all flex items-center gap-1.5 border shadow-2xs hover:scale-[1.02]",
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
                <span className="text-[9px] font-extrabold text-[#531FFF] bg-[#531FFF]/10 px-1.5 py-0.5 rounded-md inline-block">
                  +{dayEvents.length - 3} agenda lainnya
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

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-full mx-auto w-full flex-1 flex flex-col min-h-screen bg-gray-50/50 animate-in fade-in duration-300 relative">
      
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

      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4 bg-white p-5 md:p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Kalender Akademik</h1>
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#531FFF]/10 text-[#531FFF] border border-[#531FFF]/20">
              Tahun Ajaran {academicYearText} ({currentSemester})
            </span>
          </div>
          <p className="text-gray-500 text-xs md:text-sm font-medium mt-1">
            Manajemen agenda kegiatan sekolah, jadwal ujian, libur nasional, dan acara akademik terpadu.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* View Switcher */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 w-full sm:w-auto">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                viewMode === "grid" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
              )}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Grid Bulanan</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                viewMode === "list" ? "bg-white text-[#531FFF] shadow-xs" : "text-gray-500 hover:text-gray-900"
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Daftar Agenda</span>
            </button>
          </div>

          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-[0.98]"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Kalender (PDF)</span>
          </button>

          {!isStudent && (
            <button
              onClick={() => handleOpenAdd()}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-[#531FFF] hover:bg-[#531FFF]/90 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-[#531FFF]/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Agenda Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress & Category Highlights Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-6">
        
        {/* Academic Year Progress Box (5 cols) */}
        <div className="xl:col-span-5 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-sm text-gray-900">Progress Tahun Ajaran {academicYearText}</h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {currentSemester}
            </span>
          </div>

          <div className="flex items-center gap-6">
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

            <div className="grid grid-cols-2 gap-3 flex-1 text-xs">
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
        <div className="xl:col-span-7 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-sm text-gray-900 mb-1">Filter & Legenda Kategori Agenda</h3>
            <p className="text-xs text-gray-400 mb-4">Klik kategori untuk memfilter agenda yang tampil pada kalender</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all border",
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

      {/* Main Calendar Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        
        {/* Left Column: Calendar Grid / List View (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {viewMode === "grid" ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-6">
              
              {/* Month Navigation Controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-gray-100 border border-gray-200 rounded-xl p-1">
                    <button 
                      onClick={prevMonth}
                      className="p-1.5 hover:bg-white rounded-lg text-gray-600 hover:text-gray-900 transition-all"
                      title="Bulan Sebelumnya"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={nextMonth}
                      className="p-1.5 hover:bg-white rounded-lg text-gray-600 hover:text-gray-900 transition-all"
                      title="Bulan Berikutnya"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <button 
                    onClick={goToToday}
                    className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-extrabold text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Hari Ini (Today)
                  </button>
                </div>

                <h2 className="text-xl font-extrabold text-gray-900 capitalize">
                  {format(currentDate, 'MMMM yyyy', { locale: idLocale })}
                </h2>
              </div>

              {/* Day Headers */}
              <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-2xs">
                <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
                  {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((day) => (
                    <div key={day} className="py-2.5 text-center text-xs font-extrabold text-gray-600 border-r border-gray-100 last:border-r-0">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Cells Grid */}
                {renderCalendarCells()}
              </div>

            </div>
          ) : (
            /* LIST VIEW MODE */
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <h3 className="font-bold text-xs text-gray-800 uppercase tracking-wider">Daftar Seluruh Agenda ({filteredEvents.length})</h3>
                <span className="text-xs text-gray-400 font-medium">Diurutkan berdasarkan tanggal</span>
              </div>

              <div className="divide-y divide-gray-100">
                {filteredEvents.map((evt, idx) => {
                  const meta = getCategoryMeta(evt.category);
                  const Icon = meta.icon || CalendarIcon;
                  const formattedDate = format(new Date(evt.startDate || evt.date), 'dd MMMM yyyy', { locale: idLocale });

                  return (
                    <div key={evt.id || idx} className="p-4 hover:bg-gray-50/50 transition-colors flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border font-bold", meta.color)}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-extrabold text-sm text-gray-900 truncate">{evt.title}</h4>
                            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-extrabold border", meta.color)}>
                              {meta.label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 font-medium mt-0.5 flex items-center gap-3">
                            <span>📅 {formattedDate}</span>
                            <span>⏰ {evt.isAllDay ? "Sepanjang Hari" : `${evt.startTime} - ${evt.endTime}`}</span>
                            <span>📍 {evt.location || "Sekolah"}</span>
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

        {/* Right Column: Upcoming Agenda Sidebar (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Upcoming Events Box */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#531FFF]" />
                <h3 className="font-bold text-xs text-gray-800 uppercase tracking-wider">Agenda Terdekat</h3>
              </div>
              <span className="text-[11px] font-extrabold text-[#531FFF] bg-[#531FFF]/10 px-2 py-0.5 rounded-full">
                {upcomingEvents.length} Agenda
              </span>
            </div>

            <div className="space-y-3">
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

            {!isStudent && (
              <button
                onClick={() => handleOpenAdd()}
                className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-[#531FFF] font-bold text-xs rounded-xl transition-colors border border-gray-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Tambah Agenda Sekarang
              </button>
            )}
          </div>

          {/* Quick Statistics Card */}
          <div className="bg-gradient-to-br from-[#531FFF] to-indigo-800 text-white rounded-2xl p-6 shadow-md relative overflow-hidden space-y-4">
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

      {/* MODAL TAMBAH / EDIT AGENDA KALENDER */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-xl p-6 text-gray-900">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-[#531FFF]" />
                <h3 className="font-extrabold text-base">
                  {editingEventId ? "Edit Agenda Kalender" : "Tambah Agenda Kalender Baru"}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitForm} className="mt-4 space-y-4 text-xs">
              
              <div>
                <label className="block font-bold text-gray-700 mb-1">Judul Agenda Kegiatan</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Contoh: Ujian Tengah Semester Ganjil / Pentas Seni Sekolah"
                  className="w-full px-3 py-2 font-medium bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Kategori Agenda</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 font-bold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20"
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
                    className="w-full px-3 py-2 font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Tanggal Mulai</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 font-bold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Tanggal Selesai</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 font-bold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isAllDay"
                  checked={formData.isAllDay}
                  onChange={(e) => setFormData({ ...formData, isAllDay: e.target.checked })}
                  className="w-4 h-4 text-[#531FFF] rounded focus:ring-[#531FFF]"
                />
                <label htmlFor="isAllDay" className="font-bold text-gray-700">Acara Sepanjang Hari (All Day)</label>
              </div>

              {!formData.isAllDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Jam Mulai</label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full px-3 py-2 font-bold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20 text-center"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Jam Selesai</label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full px-3 py-2 font-bold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20 text-center"
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
                  className="w-full px-3 py-2 font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20"
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
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-bold text-gray-500 hover:bg-gray-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-[#531FFF] hover:bg-[#531FFF]/90 text-white px-5 py-2 rounded-xl font-bold shadow-md shadow-[#531FFF]/20"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{editingEventId ? "Simpan Perubahan" : "Tambah Agenda"}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* PRINT-READY OFFICIAL ACADEMIC CALENDAR SHEET MODAL */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar p-8 text-gray-900 font-sans print-area">
            
            {/* Controls */}
            <div className="flex justify-between items-center pb-6 border-b border-gray-200 no-print">
              <div className="flex items-center gap-2">
                <School className="w-5 h-5 text-[#531FFF]" />
                <h3 className="font-extrabold text-base">Pratinjau Cetak Kalender Akademik Resmi</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 bg-[#531FFF] hover:bg-[#531FFF]/90 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs"
                >
                  <Printer className="w-4 h-4" /> Cetak / Download PDF
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl"
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* Document Content */}
            <div className="pt-6 space-y-6">
              
              {/* KOP */}
              <div className="text-center border-b-2 border-gray-900 pb-4">
                <h2 className="text-2xl font-extrabold tracking-widest text-gray-900 uppercase">SMA QUICK SCHOOLS INDONESIA</h2>
                <p className="text-xs font-medium text-gray-600 mt-1">
                  Jl. Pendidikan Utama No. 45, Jakarta Selatan · Telp: (021) 7890123 · Website: www.quickschools.sch.id
                </p>
                <p className="text-xs font-extrabold text-gray-900 uppercase mt-2 tracking-wider">
                  KALENDER AKADEMIK & AGENDA KEGIATAN SEKOLAH · TAHUN AJARAN {academicYearText}
                </p>
              </div>

              {/* Table */}
              <div>
                <table className="w-full border-collapse border border-gray-300 text-xs text-left">
                  <thead>
                    <tr className="bg-gray-100 font-bold text-gray-800">
                      <th className="border border-gray-300 p-2 text-center w-8">No</th>
                      <th className="border border-gray-300 p-2">Nama Agenda Kegiatan</th>
                      <th className="border border-gray-300 p-2 text-center w-28">Kategori</th>
                      <th className="border border-gray-300 p-2">Tanggal & Waktu</th>
                      <th className="border border-gray-300 p-2">Lokasi</th>
                      <th className="border border-gray-300 p-2">Target Peserta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.map((ex, i) => (
                      <tr key={i} className="border-b border-gray-200">
                        <td className="border border-gray-300 p-2 text-center font-medium">{i + 1}</td>
                        <td className="border border-gray-300 p-2 font-bold text-gray-900">{ex.title}</td>
                        <td className="border border-gray-300 p-2 text-center font-bold">{ex.category}</td>
                        <td className="border border-gray-300 p-2">{ex.startDate} s/d {ex.endDate}</td>
                        <td className="border border-gray-300 p-2">{ex.location || "Sekolah"}</td>
                        <td className="border border-gray-300 p-2">{ex.target || "Semua"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 text-center text-xs pt-12 border-t border-gray-300">
                <div>
                  <p>Waka Kurikulum</p>
                  <div className="h-16" />
                  <p className="font-bold border-b border-gray-400 inline-block px-4">Drs. Taufik Hidayat, M.Pd.</p>
                </div>
                <div>
                  <p>Kepala Sekolah</p>
                  <div className="h-16" />
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
