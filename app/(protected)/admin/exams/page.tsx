"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  CalendarRange, Search, Plus, Edit3, Trash2, Printer, 
  Clock, MapPin, User, FileText, 
  Calendar as CalendarIcon, 
  School, X, Loader2, Layers, Save
} from "lucide-react";
import { 
  collection, onSnapshot, doc, setDoc, addDoc, deleteDoc, 
  serverTimestamp, getDoc 
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { AlertBox, AlertType } from "@/components/ui/alert-box";

// Initial sample data fallback
const SAMPLE_EXAMS = [
  {
    id: "sample_1",
    title: "Penilaian Tengah Semester (PTS) Ganjil",
    examType: "PTS",
    subject: "Matematika Utama",
    classId: "10-A",
    date: "2025-09-15",
    startTime: "07:30",
    endTime: "09:00",
    room: "Lab Komputer 1",
    proctor: "Drs. Taufik Hidayat, M.Pd.",
    totalDuration: "90 Menit",
    passingScore: 75,
    status: "Akan Datang",
    instructions: "Wajib membawa pensil 2B, kartu ujian, dan datang 15 menit sebelum ujian dimulai."
  },
  {
    id: "sample_2",
    title: "Penilaian Tengah Semester (PTS) Ganjil",
    examType: "PTS",
    subject: "Bahasa Indonesia",
    classId: "10-A",
    date: "2025-09-15",
    startTime: "09:30",
    endTime: "11:00",
    room: "Ruang R.102",
    proctor: "Siti Rahmawati, S.Pd.",
    totalDuration: "90 Menit",
    passingScore: 75,
    status: "Akan Datang",
    instructions: "HP dan tas dikumpulkan di meja depan sebelum soal dibagikan."
  },
  {
    id: "sample_3",
    title: "Penilaian Akhir Semester (PAS) Genap",
    examType: "PAS",
    subject: "Fisika Dasar",
    classId: "11-IPA-1",
    date: "2025-09-16",
    startTime: "07:30",
    endTime: "09:30",
    room: "Lab Fisika",
    proctor: "Dr. Budi Santoso, M.Si.",
    totalDuration: "120 Menit",
    passingScore: 75,
    status: "Akan Datang",
    instructions: "Kalkulator scientific diperbolehkan. Dilarang pinjam meminjam alat tulis."
  },
  {
    id: "sample_4",
    title: "Ujian Praktik Kimia",
    examType: "Praktik",
    subject: "Kimia Organik",
    classId: "12-IPA-2",
    date: "2025-09-17",
    startTime: "08:00",
    endTime: "10:00",
    room: "Lab Kimia Utama",
    proctor: "Hendra Wijaya, S.Si.",
    totalDuration: "120 Menit",
    passingScore: 78,
    status: "Akan Datang",
    instructions: "Wajib memakai jas laboratorium dan jas kacamata pengaman."
  }
];

export default function ExamSchedulePage() {
  const [examSchedulesList, setExamSchedulesList] = useState<any[]>([]);
  const [schedulesList, setSchedulesList] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("admin");
  const [userEmail, setUserEmail] = useState<string>("");

  const [selectedClass, setSelectedClass] = useState<string>("All");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Alert Box Toast State
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
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: "Penilaian Tengah Semester (PTS)",
    examType: "PTS",
    subject: "Matematika Utama",
    classId: "10-A",
    date: new Date().toISOString().split("T")[0],
    startTime: "07:30",
    endTime: "09:00",
    room: "Ruang R.101",
    proctor: "Drs. Taufik Hidayat, M.Pd.",
    passingScore: 75,
    status: "Akan Datang",
    instructions: "Wajib membawa kartu peserta ujian dan alat tulis lengkap. Dilarang membawa HP ke dalam ruangan."
  });

  const isStudentRole = userRole === "student" || userRole === "siswa";

  // Check user auth & role
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUserEmail(u.email || "");
        try {
          const userSnap = await getDoc(doc(db, "users", u.uid));
          if (userSnap.exists()) {
            const r = userSnap.data().role || "admin";
            setUserRole(r);
          }
        } catch (e) {
          console.error("User role fetch error:", e);
        }
      }
    });
    return () => unsubAuth();
  }, []);

  // Firestore Subscriptions for Realtime Sync
  useEffect(() => {
    const unsubExams = onSnapshot(collection(db, "examSchedules"), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setExamSchedulesList(list);
      setLoading(false);
    }, (err) => {
      console.warn("examSchedules listener fallback:", err);
      setLoading(false);
    });

    const unsubSchedules = onSnapshot(collection(db, "schedules"), (snap) => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((d: any) => d.isExam || d.examType);
      setSchedulesList(list);
    }, (err) => {
      console.warn("schedules listener error:", err);
    });

    const unsubClasses = onSnapshot(collection(db, "classes"), (snap) => {
      setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubSubjects = onSnapshot(collection(db, "subjects"), (snap) => {
      setSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubTeachers = onSnapshot(collection(db, "teachers"), (snap) => {
      setTeachers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubStudents = onSnapshot(collection(db, "students"), (snap) => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubExams();
      unsubSchedules();
      unsubClasses();
      unsubSubjects();
      unsubTeachers();
      unsubStudents();
    };
  }, []);

  // Combined Exam List with Sample Fallback
  const allExams = useMemo(() => {
    const combined = [...examSchedulesList, ...schedulesList];
    const uniqueMap = new Map();
    combined.forEach(item => uniqueMap.set(item.id, item));
    const result = Array.from(uniqueMap.values());
    return result.length > 0 ? result : SAMPLE_EXAMS;
  }, [examSchedulesList, schedulesList]);

  // Find student's class if logged in as student
  const studentClassId = useMemo(() => {
    if (!isStudentRole || !userEmail) return null;
    const st = students.find(s => s.email && s.email.toLowerCase() === userEmail.toLowerCase());
    return st?.classId || null;
  }, [isStudentRole, userEmail, students]);

  // Filtered Exam List
  const filteredExams = useMemo(() => {
    return allExams.filter(ex => {
      const matchClass = selectedClass === "All" 
        ? (studentClassId ? ex.classId === studentClassId : true)
        : ex.classId === selectedClass;
      
      const matchType = selectedType === "All" || ex.examType === selectedType;
      
      const matchQuery = !searchQuery || 
        (ex.subject && ex.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (ex.room && ex.room.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (ex.proctor && ex.proctor.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (ex.title && ex.title.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchClass && matchType && matchQuery;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [allExams, selectedClass, selectedType, searchQuery, studentClassId]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = filteredExams.length;
    const rooms = new Set(filteredExams.map(e => e.room)).size;
    const proctors = new Set(filteredExams.map(e => e.proctor)).size;
    const upcoming = filteredExams.filter(e => e.status !== "Selesai").length;
    return { total, rooms, proctors, upcoming };
  }, [filteredExams]);

  // Handle Open Create Modal
  const handleOpenAdd = () => {
    setEditingExamId(null);

    const defaultClass = classes[0]?.name || classes[0]?.className || "10-A";
    const defaultSubject = subjects[0]?.name || subjects[0]?.subjectName || "Matematika Utama";
    const defaultTeacher = teachers[0]?.name || teachers[0]?.fullName || "Drs. Taufik Hidayat, M.Pd.";

    setFormData({
      title: "Penilaian Tengah Semester (PTS)",
      examType: "PTS",
      subject: defaultSubject,
      classId: defaultClass,
      date: new Date().toISOString().split("T")[0],
      startTime: "07:30",
      endTime: "09:00",
      room: "Ruang R.101",
      proctor: defaultTeacher,
      passingScore: 75,
      status: "Akan Datang",
      instructions: "Wajib membawa kartu peserta ujian dan alat tulis lengkap. Dilarang membawa HP ke dalam ruangan."
    });
    setIsModalOpen(true);
  };

  // Handle Edit Modal
  const handleEdit = (exam: any) => {
    setEditingExamId(exam.id);
    setFormData({
      title: exam.title || "Jadwal Ujian",
      examType: exam.examType || "PTS",
      subject: exam.subject || (subjects[0]?.name || "Matematika Utama"),
      classId: exam.classId || (classes[0]?.name || "10-A"),
      date: exam.date || new Date().toISOString().split("T")[0],
      startTime: exam.startTime || "07:30",
      endTime: exam.endTime || "09:00",
      room: exam.room || "Ruang R.101",
      proctor: exam.proctor || (teachers[0]?.name || "Drs. Taufik Hidayat, M.Pd."),
      passingScore: exam.passingScore || 75,
      status: exam.status || "Akan Datang",
      instructions: exam.instructions || ""
    });
    setIsModalOpen(true);
  };

  // Conflict Warning Detection
  const conflictWarning = useMemo(() => {
    if (!formData.date || !formData.startTime || !formData.room) return null;

    const conflict = allExams.find(e => 
      e.id !== editingExamId &&
      e.date === formData.date &&
      e.room.toLowerCase() === formData.room.toLowerCase() &&
      ((formData.startTime >= e.startTime && formData.startTime < e.endTime) ||
       (formData.endTime > e.startTime && formData.endTime <= e.endTime))
    );

    if (conflict) {
      return `Bentrokan Ruang: Ruang "${conflict.room}" sudah dipakai oleh ${conflict.subject} (${conflict.classId}) pada jam ${conflict.startTime} - ${conflict.endTime}!`;
    }
    return null;
  }, [formData, allExams, editingExamId]);

  // Save / Submit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject || !formData.classId || !formData.date) {
      triggerAlert("error", "Harap lengkapi Mata Pelajaran, Kelas, dan Tanggal Ujian.", "Gagal Validasi");
      return;
    }

    setIsSaving(true);
    try {
      let totalDuration = "90 Menit";
      if (formData.startTime && formData.endTime) {
        const [startH, startM] = formData.startTime.split(":").map(Number);
        const [endH, endM] = formData.endTime.split(":").map(Number);
        const durMinutes = (endH * 60 + endM) - (startH * 60 + startM);
        if (durMinutes > 0) totalDuration = `${durMinutes} Menit`;
      }

      const payload = {
        title: formData.title || "Jadwal Ujian",
        examType: formData.examType || "PTS",
        subject: formData.subject,
        classId: formData.classId,
        date: formData.date,
        startTime: formData.startTime || "07:30",
        endTime: formData.endTime || "09:00",
        room: formData.room || "Ruang R.101",
        proctor: formData.proctor || "Panitia Ujian",
        passingScore: Number(formData.passingScore) || 75,
        status: formData.status || "Akan Datang",
        instructions: formData.instructions || "",
        totalDuration,
        updatedAt: serverTimestamp()
      };

      if (editingExamId && !editingExamId.startsWith("sample_")) {
        try {
          await setDoc(doc(db, "examSchedules", editingExamId), payload, { merge: true });
        } catch (err) {
          await setDoc(doc(db, "schedules", editingExamId), { ...payload, isExam: true }, { merge: true });
        }
        triggerAlert("edit", `Jadwal Ujian ${formData.subject} (Kelas ${formData.classId}) telah diperbarui!`, "Berhasil Edit");
      } else {
        try {
          await addDoc(collection(db, "examSchedules"), {
            ...payload,
            createdAt: serverTimestamp()
          });
        } catch (err) {
          await addDoc(collection(db, "schedules"), {
            ...payload,
            isExam: true,
            createdAt: serverTimestamp()
          });
        }
        triggerAlert("success", `Jadwal Ujian ${formData.subject} (Kelas ${formData.classId}) berhasil ditambahkan!`, "Berhasil");
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Error saving exam schedule:", err);
      triggerAlert("error", `Gagal menyimpan data jadwal ujian: ${err?.message || "Terjadi kesalahan"}`, "Gagal");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Exam Schedule
  const handleDelete = async (id: string) => {
    if (id.startsWith("sample_")) {
      triggerAlert("warning", "Jadwal contoh sampel tidak dapat dihapus.", "Informasi");
      return;
    }
    if (!confirm("Apakah Anda yakin ingin menghapus jadwal ujian ini?")) return;
    try {
      try {
        await deleteDoc(doc(db, "examSchedules", id));
      } catch (e) {
        await deleteDoc(doc(db, "schedules", id));
      }
      triggerAlert("error", "Jadwal ujian berhasil dihapus.", "Terhapus");
    } catch (e) {
      console.error("Error deleting exam:", e);
      triggerAlert("error", "Gagal menghapus jadwal ujian.", "Gagal");
    }
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
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Jadwal Ujian & Evaluasi</h1>
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#531FFF]/10 text-[#531FFF] border border-[#531FFF]/20">
              Semester Ganjil 2025/2026
            </span>
            {isStudentRole && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                Mode Siswa (Read-Only)
              </span>
            )}
          </div>
          <p className="text-gray-500 text-xs md:text-sm font-medium mt-1">
            Pengaturan jadwal ujian, tata tertib, lokasi ruang, dan pengawas terintegrasi database master.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 w-full sm:w-auto">
            <button
              onClick={() => setViewMode("cards")}
              className={cn(
                "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                viewMode === "cards" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Kartu Grid</span>
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                viewMode === "table" ? "bg-white text-[#531FFF] shadow-xs" : "text-gray-500 hover:text-gray-900"
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Tabel Lengkap</span>
            </button>
          </div>

          <button
            onClick={() => setIsPrintModalOpen(true)}
            disabled={filteredExams.length === 0}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-[0.98]"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Jadwal (PDF)</span>
          </button>

          {!isStudentRole && (
            <button
              onClick={handleOpenAdd}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-[#531FFF] hover:bg-[#531FFF]/90 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-[#531FFF]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Jadwal Ujian</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#531FFF] flex items-center justify-center shrink-0">
            <CalendarRange className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Total Ujian</span>
            <p className="text-lg font-extrabold text-gray-900 leading-none mt-1">{metrics.total}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Akan Datang</span>
            <p className="text-lg font-extrabold text-gray-900 leading-none mt-1">{metrics.upcoming}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Ruangan Digunakan</span>
            <p className="text-lg font-extrabold text-gray-900 leading-none mt-1">{metrics.rooms}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Pengawas Bertugas</span>
            <p className="text-lg font-extrabold text-gray-900 leading-none mt-1">{metrics.proctors}</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4 mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Class Filter synchronized with Database */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500">Kelas:</span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-800 text-xs font-bold rounded-xl py-2 px-3 focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
            >
              <option value="All">Semua Kelas</option>
              {classes.map(c => {
                const cName = c.name || c.className || c.id;
                return (
                  <option key={c.id || cName} value={cName}>Kelas {cName}</option>
                );
              })}
            </select>
          </div>

          {/* Exam Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500">Jenis:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-800 text-xs font-bold rounded-xl py-2 px-3 focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
            >
              <option value="All">Semua Jenis Ujian</option>
              <option value="PTS">PTS (Tengah Semester)</option>
              <option value="PAS">PAS (Akhir Semester)</option>
              <option value="PAT">PAT (Akhir Tahun)</option>
              <option value="Praktik">Ujian Praktik</option>
              <option value="Ulangan Harian">Ulangan Harian / Kuis</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari mata pelajaran, ruang, pengawas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
          />
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 flex flex-col items-center justify-center text-gray-500 flex-1 min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-[#531FFF] mb-3" />
          <p className="text-sm font-medium">Memuat data jadwal ujian...</p>
        </div>
      ) : (
        <>
          {/* VIEW MODE 1: CARDS GRID */}
          {viewMode === "cards" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredExams.map((exam) => {
                const formattedDate = new Date(exam.date).toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric"
                });

                return (
                  <div 
                    key={exam.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#531FFF]/5 to-transparent rounded-bl-full pointer-events-none" />

                    <div>
                      {/* Badge Header */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border",
                          exam.examType === "PTS" && "bg-purple-50 text-[#531FFF] border-purple-200",
                          exam.examType === "PAS" && "bg-blue-50 text-blue-700 border-blue-200",
                          exam.examType === "Praktik" && "bg-amber-50 text-amber-700 border-amber-200",
                          exam.examType === "PAT" && "bg-emerald-50 text-emerald-700 border-emerald-200"
                        )}>
                          {exam.examType || "Ujian"}
                        </span>
                        
                        <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-md">
                          Kelas {exam.classId}
                        </span>
                      </div>

                      {/* Title & Subject */}
                      <h3 className="font-extrabold text-base text-gray-900 group-hover:text-[#531FFF] transition-colors leading-snug">
                        {exam.subject}
                      </h3>
                      <p className="text-xs font-semibold text-gray-500 mt-0.5">{exam.title}</p>

                      {/* Date & Time info */}
                      <div className="mt-4 pt-3 border-t border-gray-100 space-y-2 text-xs">
                        <div className="flex items-center gap-2 text-gray-700 font-semibold">
                          <CalendarIcon className="w-4 h-4 text-[#531FFF] shrink-0" />
                          <span>{formattedDate}</span>
                        </div>

                        <div className="flex items-center gap-2 text-gray-700 font-semibold">
                          <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>{exam.startTime} - {exam.endTime} ({exam.totalDuration || "90 Menit"})</span>
                        </div>

                        <div className="flex items-center gap-2 text-gray-700 font-semibold">
                          <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{exam.room}</span>
                        </div>

                        <div className="flex items-center gap-2 text-gray-600 font-medium">
                          <User className="w-4 h-4 text-amber-600 shrink-0" />
                          <span className="truncate">Pengawas: <span className="font-bold text-gray-800">{exam.proctor || "Panitia Ujian"}</span></span>
                        </div>
                      </div>

                      {/* Instructions snippet */}
                      {exam.instructions && (
                        <div className="mt-3 p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[11px] text-gray-600 italic">
                          "{exam.instructions}"
                        </div>
                      )}
                    </div>

                    {/* Action buttons footer */}
                    <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-gray-400">
                        KKM: <span className="text-gray-800 font-extrabold">{exam.passingScore || 75}</span>
                      </span>

                      {!isStudentRole && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(exam)}
                            className="p-1.5 text-gray-400 hover:text-[#531FFF] hover:bg-purple-50 rounded-lg transition-colors"
                            title="Edit Jadwal"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(exam.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Hapus Jadwal"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}

              {filteredExams.length === 0 && (
                <div className="col-span-full bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
                  <CalendarRange className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-medium">Tidak ada jadwal ujian yang sesuai filter.</p>
                </div>
              )}
            </div>
          )}

          {/* VIEW MODE 2: TABLE VIEW */}
          {viewMode === "table" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
                      <th className="py-3.5 px-4 w-12 text-center">No</th>
                      <th className="py-3.5 px-4">Mata Pelajaran & Ujian</th>
                      <th className="py-3.5 px-4 text-center">Kelas</th>
                      <th className="py-3.5 px-4">Tanggal & Waktu</th>
                      <th className="py-3.5 px-4">Ruangan</th>
                      <th className="py-3.5 px-4">Pengawas Ujian</th>
                      <th className="py-3.5 px-4 text-center">KKM</th>
                      {!isStudentRole && <th className="py-3.5 px-4 text-center w-20">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {filteredExams.map((exam, idx) => (
                      <tr key={exam.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-4 text-center text-gray-400">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-gray-900 text-sm">{exam.subject}</div>
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-50 text-[#531FFF] mt-0.5">
                            {exam.examType || "PTS"} - {exam.title}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-gray-800">{exam.classId}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-gray-800">{exam.date}</div>
                          <div className="text-[11px] text-gray-500">{exam.startTime} - {exam.endTime} ({exam.totalDuration || "90m"})</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                            {exam.room}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-gray-700">{exam.proctor || "-"}</td>
                        <td className="py-3 px-4 text-center font-extrabold text-gray-900">{exam.passingScore || 75}</td>
                        {!isStudentRole && (
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleEdit(exam)}
                                className="p-1.5 text-gray-400 hover:text-[#531FFF] hover:bg-purple-50 rounded-lg transition-colors"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(exam.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}

                    {filteredExams.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-gray-400 text-xs">
                          Belum ada jadwal ujian tercatat.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL TAMBAH / EDIT JADWAL UJIAN */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-xl p-6 text-gray-900">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <CalendarRange className="w-5 h-5 text-[#531FFF]" />
                <h3 className="font-extrabold text-base">
                  {editingExamId ? "Edit Jadwal Ujian" : "Tambah Jadwal Ujian Baru"}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conflict Alert Warning Component (Kuning) */}
            {conflictWarning && (
              <div className="mt-4">
                <AlertBox type="warning" title="Bentrokan Ruang / Jadwal" message={conflictWarning} />
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmitForm} className="mt-4 space-y-4 text-xs">
              
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nama / Judul Ujian</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Contoh: Penilaian Tengah Semester (PTS) Ganjil"
                  className="w-full px-3 py-2 font-medium bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Jenis Ujian</label>
                  <select
                    value={formData.examType}
                    onChange={(e) => setFormData({ ...formData, examType: e.target.value })}
                    className="w-full px-3 py-2 font-bold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20"
                  >
                    <option value="PTS">PTS (Tengah Semester)</option>
                    <option value="PAS">PAS (Akhir Semester)</option>
                    <option value="PAT">PAT (Akhir Tahun)</option>
                    <option value="Praktik">Ujian Praktik</option>
                    <option value="Ulangan Harian">Ulangan Harian / Kuis</option>
                  </select>
                </div>

                {/* DYNAMIC CLASS SELECT FROM FIRESTORE DATABASE */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Kelas Target (Database Master)</label>
                  <select
                    required
                    value={formData.classId}
                    onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                    className="w-full px-3 py-2 font-bold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20"
                  >
                    <option value="" disabled>-- Pilih Kelas --</option>
                    {classes.length > 0 ? (
                      classes.map((c) => {
                        const cName = c.name || c.className || c.id;
                        return (
                          <option key={c.id || cName} value={cName}>
                            Kelas {cName} {c.homeroomTeacher ? `(Wali: ${c.homeroomTeacher})` : ""}
                          </option>
                        );
                      })
                    ) : (
                      <>
                        <option value="10-A">Kelas 10-A</option>
                        <option value="10-B">Kelas 10-B</option>
                        <option value="11-IPA-1">Kelas 11-IPA-1</option>
                        <option value="11-IPS-1">Kelas 11-IPS-1</option>
                        <option value="12-IPA-1">Kelas 12-IPA-1</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* DYNAMIC SUBJECT SELECT FROM FIRESTORE DATABASE */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Mata Pelajaran (Database Master)</label>
                  <select
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3 py-2 font-bold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20"
                  >
                    <option value="" disabled>-- Pilih Mata Pelajaran --</option>
                    {subjects.length > 0 ? (
                      subjects.map((s) => {
                        const sName = s.name || s.subjectName || s.id;
                        return (
                          <option key={s.id || sName} value={sName}>
                            {sName} {s.code ? `(${s.code})` : ""}
                          </option>
                        );
                      })
                    ) : (
                      <>
                        <option value="Matematika Utama">Matematika Utama</option>
                        <option value="Bahasa Indonesia">Bahasa Indonesia</option>
                        <option value="Bahasa Inggris">Bahasa Inggris</option>
                        <option value="Fisika Dasar">Fisika Dasar</option>
                        <option value="Kimia Organik">Kimia Organik</option>
                        <option value="Biologi">Biologi</option>
                        <option value="Sejarah Indonesia">Sejarah Indonesia</option>
                        <option value="Pendidikan Agama">Pendidikan Agama</option>
                        <option value="PPKn">PPKn</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Ruang Ujian</label>
                  <input
                    type="text"
                    required
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    placeholder="Contoh: Lab Komputer 1"
                    className="w-full px-3 py-2 font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Tanggal Ujian</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 font-bold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 font-bold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20 text-center"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Jam Selesai</label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 font-bold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20 text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* DYNAMIC TEACHER / PROCTOR SELECT FROM FIRESTORE DATABASE */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Pengawas Ujian (Guru Database)</label>
                  <select
                    required
                    value={formData.proctor}
                    onChange={(e) => setFormData({ ...formData, proctor: e.target.value })}
                    className="w-full px-3 py-2 font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20"
                  >
                    <option value="" disabled>-- Pilih Pengawas / Guru --</option>
                    {teachers.length > 0 ? (
                      teachers.map((t) => {
                        const tName = t.name || t.fullName || t.teacherName || t.id;
                        return (
                          <option key={t.id || tName} value={tName}>
                            {tName} {t.subject ? `(${t.subject})` : ""}
                          </option>
                        );
                      })
                    ) : (
                      <>
                        <option value="Drs. Taufik Hidayat, M.Pd.">Drs. Taufik Hidayat, M.Pd.</option>
                        <option value="Siti Rahmawati, S.Pd.">Siti Rahmawati, S.Pd.</option>
                        <option value="Dr. Budi Santoso, M.Si.">Dr. Budi Santoso, M.Si.</option>
                        <option value="Hendra Wijaya, S.Si.">Hendra Wijaya, S.Si.</option>
                        <option value="Panitia Ujian">Panitia Ujian (Default)</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Batas KKM Lulus</label>
                  <input
                    type="number"
                    value={formData.passingScore}
                    onChange={(e) => setFormData({ ...formData, passingScore: Number(e.target.value) })}
                    className="w-full px-3 py-2 font-bold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20 text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Tata Tertib & Catatan Khusus</label>
                <textarea
                  rows={2}
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  placeholder="Contoh: Dilarang menggunakan HP, membawa kalkulator..."
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
                  <span>{editingExamId ? "Simpan Perubahan" : "Tambah Jadwal"}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* PRINT-READY OFFICIAL EXAM SCHEDULE SHEET MODAL */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar p-8 text-gray-900 font-sans print-area">
            
            {/* Controls */}
            <div className="flex justify-between items-center pb-6 border-b border-gray-200 no-print">
              <div className="flex items-center gap-2">
                <School className="w-5 h-5 text-[#531FFF]" />
                <h3 className="font-extrabold text-base">Pratinjau Cetak Jadwal Ujian Resmi</h3>
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
                <h2 className="text-2xl font-extrabold tracking-widest text-gray-900 uppercase">PANITIA UJIAN & EVALUASI AKADEMIK</h2>
                <h3 className="text-lg font-bold text-gray-800">SMA QUICK SCHOOLS INDONESIA</h3>
                <p className="text-xs font-medium text-gray-600 mt-1">
                  Jl. Pendidikan Utama No. 45, Jakarta Selatan · Telp: (021) 7890123 · Website: www.quickschools.sch.id
                </p>
                <p className="text-xs font-extrabold text-gray-900 uppercase mt-2 tracking-wider">
                  JADWAL UJIAN PENILAIAN AKADEMIK SISWA · TAHUN AJARAN 2025/2026
                </p>
              </div>

              {/* Rules & Meta Info */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-300 text-xs leading-relaxed space-y-1">
                <h4 className="font-bold text-gray-800 uppercase">TATA TERTIB PESERTA UJIAN:</h4>
                <ol className="list-decimal pl-4 space-y-0.5 text-gray-700">
                  <li>Peserta ujian wajib hadir 15 menit sebelum bel tanda ujian dibunyikan.</li>
                  <li>Wajib membawa Kartu Peserta Ujian dan perlengkapan alat tulis pribadi.</li>
                  <li>Dilarang membawa alat komunikasi (HP, Smartwatch) ke dalam ruang ujian.</li>
                </ol>
              </div>

              {/* Table */}
              <div>
                <table className="w-full border-collapse border border-gray-300 text-xs text-left">
                  <thead>
                    <tr className="bg-gray-100 font-bold text-gray-800">
                      <th className="border border-gray-300 p-2 text-center w-8">No</th>
                      <th className="border border-gray-300 p-2">Mata Pelajaran & Ujian</th>
                      <th className="border border-gray-300 p-2 text-center w-16">Kelas</th>
                      <th className="border border-gray-300 p-2">Tanggal & Waktu</th>
                      <th className="border border-gray-300 p-2">Ruangan</th>
                      <th className="border border-gray-300 p-2">Pengawas Ujian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExams.map((ex, i) => (
                      <tr key={i} className="border-b border-gray-200">
                        <td className="border border-gray-300 p-2 text-center font-medium">{i + 1}</td>
                        <td className="border border-gray-300 p-2 font-bold text-gray-900">
                          {ex.subject} ({ex.examType})
                        </td>
                        <td className="border border-gray-300 p-2 text-center font-bold">{ex.classId}</td>
                        <td className="border border-gray-300 p-2">{ex.date} ({ex.startTime} - {ex.endTime})</td>
                        <td className="border border-gray-300 p-2 font-bold text-emerald-800">{ex.room}</td>
                        <td className="border border-gray-300 p-2">{ex.proctor || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 text-center text-xs pt-12 border-t border-gray-300">
                <div>
                  <p>Ketua Panitia Ujian</p>
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
