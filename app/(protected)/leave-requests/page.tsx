"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  ClipboardCheck, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Stethoscope, 
  Search, 
  Plus, 
  Eye, 
  GraduationCap, 
  CalendarDays, 
  RefreshCw,
  FileText,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { useUnifiedStudents } from "@/hooks/use-unified-students";
import { 
  LeaveRequest, 
  subscribeLeaveRequests, 
  approveLeaveRequest
} from "@/lib/leave-requests-service";
import { CreateLeaveRequestModal } from "@/components/modals/create-leave-request-modal";
import { LeaveRequestDetailModal } from "@/components/modals/leave-request-detail-modal";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";

export default function LeaveRequestsPage() {
  const toast = useToast();
  const { user: currentUser, userData: currentUserData, role: userRole } = useAuth();
  const { activeAcademicYear, activeSemester } = useAcademicYear();

  const { students: unifiedStudents } = useUnifiedStudents();

  const [classesList, setClassesList] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & State
  const [statusFilter, setStatusFilter] = useState<string>("Semua");
  const [typeFilter, setTypeFilter] = useState<string>("Semua");
  const [selectedClass, setSelectedClass] = useState<string>("Semua Kelas");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Role Checks
  const roleLower = (userRole || currentUserData?.role || "").toLowerCase();
  const isStudent = roleLower === "siswa" || roleLower === "student";
  const isParent = roleLower === "orang-tua" || roleLower === "parent";
  const isGuru = roleLower === "guru" || roleLower === "teacher";
  const isAdmin = ["admin", "super-admin", "super admin", "kepala-sekolah", "kepala sekolah"].includes(roleLower);

  // 1. Subscribe to classes collection
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "classes"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setClassesList(list);
    }, (err) => {
      console.warn("Error fetching classes in leave requests:", err);
    });
    return () => unsub();
  }, []);

  // 2. Subscribe to real-time leave requests
  useEffect(() => {
    const unsub = subscribeLeaveRequests((requests) => {
      setLeaveRequests(requests);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 3. Resolve student profile if current user is student or parent
  const myStudentProfile = useMemo(() => {
    if (!currentUser) return null;
    const uid = currentUser.uid;
    const email = (currentUser.email || "").toLowerCase().trim();
    const name = (currentUser.displayName || currentUserData?.fullName || currentUserData?.name || "").toLowerCase().trim();

    return unifiedStudents.find((s) => {
      if (s.id === uid || s.uid === uid) return true;
      if (s.email && s.email.toLowerCase().trim() === email) return true;
      if (currentUserData?.nisn && (s.nisn === currentUserData.nisn || s.id === currentUserData.nisn)) return true;
      if (name && s.name && s.name.toLowerCase().trim() === name) return true;
      return false;
    }) || {
      id: currentUserData?.nisn || uid,
      name: currentUserData?.fullName || currentUser.displayName || "Siswa",
      nisn: currentUserData?.nisn || "-",
      className: currentUserData?.className || currentUserData?.kelas || "10 MIPA 1",
      uid
    };
  }, [currentUser, currentUserData, unifiedStudents]);

  // 4. Resolve homeroom class(es) for teacher
  const teacherHomeroomClasses = useMemo(() => {
    if (!isGuru) return [];

    const tName = (currentUserData?.fullName || currentUserData?.name || currentUser?.displayName || "").trim().toLowerCase();
    const tNip = (currentUserData?.nip || currentUserData?.id || "").trim().toLowerCase();
    const tEmail = (currentUserData?.email || currentUser?.email || "").trim().toLowerCase();
    const tUid = currentUser?.uid;

    const matched = new Set<string>();

    classesList.forEach((c) => {
      const cName = c.name || c.id;
      const cHomeroom = (c.homeroom || c.homeroomTeacher || c.waliKelas || "").trim().toLowerCase();
      const cNip = (c.homeroomNip || "").trim().toLowerCase();
      const cId = (c.homeroomId || "").trim();
      const cEmail = (c.homeroomEmail || "").trim().toLowerCase();

      const matchName = tName && cHomeroom && (
        cHomeroom === tName ||
        (tName.length > 5 && cHomeroom.includes(tName)) ||
        (cHomeroom.length > 5 && tName.includes(cHomeroom))
      );
      const matchNip = tNip && cNip && cNip === tNip;
      const matchId = tUid && cId && cId === tUid;
      const matchEmail = tEmail && cEmail && cEmail === tEmail;

      if (matchName || matchNip || matchId || matchEmail) {
        if (cName) matched.add(cName);
      }
    });

    const directClass = currentUserData?.homeroomClass || currentUserData?.homeroom || currentUserData?.className || currentUserData?.classId;
    if (directClass && directClass !== "-" && directClass !== "Semua Kelas") {
      matched.add(directClass);
    }

    return Array.from(matched);
  }, [isGuru, currentUser, currentUserData, classesList]);

  const isTeacherWaliKelas = Boolean(isGuru && teacherHomeroomClasses.length > 0);

  // Set default selectedClass for teacher
  useEffect(() => {
    if (isGuru && teacherHomeroomClasses.length > 0 && selectedClass === "Semua Kelas") {
      setSelectedClass(teacherHomeroomClasses[0]);
    }
  }, [isGuru, teacherHomeroomClasses, selectedClass]);

  // 5. Scoped Requests based on role
  const scopedRequests = useMemo(() => {
    if (isStudent || isParent) {
      // Students/Parents only see their own requests
      const targetId = myStudentProfile?.id;
      const targetNisn = myStudentProfile?.nisn;
      const targetName = (myStudentProfile?.name || "").toLowerCase().trim();
      const targetUid = currentUser?.uid;

      return leaveRequests.filter((r) => {
        if (targetId && (r.studentId === targetId || r.id?.includes(targetId))) return true;
        if (targetNisn && (r.studentNisn === targetNisn || r.studentId === targetNisn)) return true;
        if (targetUid && (r.studentUid === targetUid || r.studentId === targetUid)) return true;
        if (targetName && r.studentName && r.studentName.toLowerCase().trim() === targetName) return true;
        return false;
      });
    }

    if (isGuru) {
      // Wali Kelas sees requests for their homeroom classes
      if (teacherHomeroomClasses.length > 0) {
        return leaveRequests.filter((r) => {
          const reqClass = (r.className || "").trim().toLowerCase();
          return teacherHomeroomClasses.some((tc) => tc.trim().toLowerCase() === reqClass);
        });
      }
      return leaveRequests;
    }

    // Admin / Kepala Sekolah sees all
    return leaveRequests;
  }, [leaveRequests, isStudent, isParent, isGuru, teacherHomeroomClasses, myStudentProfile, currentUser]);

  // 6. Filtered Requests by UI selections
  const filteredRequests = useMemo(() => {
    return scopedRequests.filter((r) => {
      // Class filter
      if (selectedClass !== "Semua Kelas") {
        const c1 = (r.className || "").toLowerCase().replace(/\s+/g, "");
        const c2 = selectedClass.toLowerCase().replace(/\s+/g, "");
        if (c1 !== c2) return false;
      }

      // Status filter
      if (statusFilter !== "Semua") {
        if (r.status !== statusFilter) return false;
      }

      // Type filter
      if (typeFilter !== "Semua") {
        if (r.type !== typeFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (r.studentName || "").toLowerCase().includes(q);
        const matchesNisn = (r.studentNisn || r.studentId || "").toLowerCase().includes(q);
        const matchesReason = (r.reason || "").toLowerCase().includes(q);
        const matchesClass = (r.className || "").toLowerCase().includes(q);
        if (!matchesName && !matchesNisn && !matchesReason && !matchesClass) return false;
      }

      return true;
    });
  }, [scopedRequests, selectedClass, statusFilter, typeFilter, searchQuery]);

  // 7. Summary KPI Metrics
  const metrics = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let sakit = 0;
    let izin = 0;

    scopedRequests.forEach((r) => {
      if (r.status === "Menunggu Persetujuan") pending++;
      else if (r.status === "Disetujui") approved++;
      else if (r.status === "Ditolak") rejected++;

      if (r.type === "Sakit") sakit++;
      else if (r.type === "Izin") izin++;
    });

    return {
      total: scopedRequests.length,
      pending,
      approved,
      rejected,
      sakit,
      izin
    };
  }, [scopedRequests]);

  // Quick Action: Approve
  const handleQuickApprove = async (req: LeaveRequest) => {
    const approverName = currentUserData?.fullName || currentUser?.displayName || (isGuru ? "Wali Kelas" : "Admin");
    const confirmApprove = window.confirm(
      `Setujui pengajuan ${req.type} untuk ${req.studentName} selama ${req.daysCount} hari (${req.startDate} s/d ${req.endDate})?\n\nData absensi siswa otomatis akan diperbarui menjadi '${req.type}'.`
    );
    if (!confirmApprove) return;

    try {
      await approveLeaveRequest(req, approverName);
      toast.showSuccess(
        `Permohonan ${req.type} untuk ${req.studentName} berhasil disetujui. Rekap presensi otomatis diperbarui.`,
        "Disetujui"
      );
    } catch (e: any) {
      toast.showError("Gagal menyetujui: " + e.message, "Gagal");
    }
  };

  // Helper date formatter
  const formatDateRange = (start: string, end: string) => {
    try {
      const s = new Date(start);
      const e = new Date(end);
      const startFormatted = s.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
      const endFormatted = e.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
      if (start === end) {
        return s.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
      }
      return `${startFormatted} - ${endFormatted}`;
    } catch {
      return `${start} s/d ${end}`;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
      
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP HERO BANNER (Standard Quick Schools Aesthetics)       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 sm:p-6 transition-all">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          <div className="flex items-start sm:items-center gap-3.5 sm:gap-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#531FFF] to-[#7344FF] text-white flex items-center justify-center shrink-0 shadow-sm shadow-[#531FFF]/25">
              <ClipboardCheck className="w-6 h-6" />
            </div>

            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight leading-tight">
                  Pengajuan Izin & Sakit Siswa
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-purple-50 text-[#531FFF] border border-purple-200 shrink-0">
                  {isStudent ? "Portal Siswa" : isGuru ? "Wali Kelas Review" : "Monitoring Sekolah"}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed">
                {isStudent || isParent
                  ? "Formulir resmi permohonan ketidakhadiran (Sakit / Izin) yang langsung diverifikasi dan disetujui oleh Wali Kelas."
                  : isGuru
                  ? isTeacherWaliKelas
                    ? `Verifikasi dan berikan persetujuan atas permohonan izin & sakit siswa di kelas binaan Anda (${teacherHomeroomClasses.join(", ")}).`
                    : "Tinjau dan kelola permohonan izin serta surat keterangan sakit siswa."
                  : "Monitoring dan manajemen seluruh permohonan izin & sakit siswa terintegrasi dengan absensi kelas."}
              </p>
            </div>
          </div>

          {/* Right Header Status Badges & Button */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start lg:self-auto">
            <span className="px-3 py-1.5 text-xs font-bold rounded-xl bg-purple-50 text-[#531FFF] border border-purple-200 flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-[#531FFF]" />
              TA {activeAcademicYear} ({activeSemester})
            </span>

            {isTeacherWaliKelas && (
              <span className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />
                Wali: {teacherHomeroomClasses.join(", ")}
              </span>
            )}

            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-[#531FFF] to-[#7344FF] hover:from-[#4314cc] hover:to-[#5e31e6] text-white rounded-xl text-xs font-extrabold transition-all active:scale-[0.98] flex items-center gap-2 shadow-sm shadow-[#531FFF]/25 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isStudent || isParent ? "Ajukan Izin / Sakit" : "+ Buat Pengajuan"}</span>
            </button>
          </div>
        </div>

        {/* Row 2: Tips Banner */}
        <div className="mt-4 pt-3.5 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-500 font-medium">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
            <span>💡 <strong>Integrasi Otomatis:</strong> Ketika Wali Kelas menyetujui permohonan, status kehadiran pada tanggal terkait otomatis tercatat sebagai <strong>Izin</strong> atau <strong>Sakit</strong> di rekap absensi.</span>
          </div>

          <Link
            href="/attendance"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#531FFF] hover:underline"
          >
            <span>Buka Rekap Absensi Siswa</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. SUMMARY KPI METRIC CARDS                                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Total */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-extrabold text-gray-400 uppercase tracking-wider">
              Total Pengajuan
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#531FFF] flex items-center justify-center font-bold">
              <ClipboardCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-gray-900">{metrics.total}</span>
            <span className="text-xs text-gray-500 font-bold">Berkas</span>
          </div>
          <span className="text-[10px] text-gray-400 font-medium mt-1">
            {metrics.sakit} Sakit, {metrics.izin} Izin Resmi
          </span>
        </div>

        {/* Pending */}
        <div 
          onClick={() => setStatusFilter("Menunggu Persetujuan")}
          className={cn(
            "p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between",
            statusFilter === "Menunggu Persetujuan"
              ? "bg-amber-500/10 border-amber-300 ring-2 ring-amber-400/20"
              : "bg-white hover:bg-amber-50/30 border-gray-100 shadow-xs"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-extrabold text-amber-700 uppercase tracking-wider">
              Menunggu Review
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-amber-600">{metrics.pending}</span>
            <span className="text-xs text-amber-700 font-bold">Menunggu</span>
          </div>
          <span className="text-[10px] text-amber-600 font-semibold mt-1">
            {metrics.pending > 0 ? "⚠️ Perlu persetujuan Wali Kelas" : "Semua telah direview"}
          </span>
        </div>

        {/* Approved */}
        <div 
          onClick={() => setStatusFilter("Disetujui")}
          className={cn(
            "p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between",
            statusFilter === "Disetujui"
              ? "bg-emerald-500/10 border-emerald-300 ring-2 ring-emerald-400/20"
              : "bg-white hover:bg-emerald-50/30 border-gray-100 shadow-xs"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-extrabold text-emerald-700 uppercase tracking-wider">
              Disetujui
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600">{metrics.approved}</span>
            <span className="text-xs text-emerald-700 font-bold">Disetujui</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold mt-1">
            Tercatat di presensi kelas
          </span>
        </div>

        {/* Rejected */}
        <div 
          onClick={() => setStatusFilter("Ditolak")}
          className={cn(
            "p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between",
            statusFilter === "Ditolak"
              ? "bg-rose-500/10 border-rose-300 ring-2 ring-rose-400/20"
              : "bg-white hover:bg-rose-50/30 border-gray-100 shadow-xs"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-extrabold text-rose-700 uppercase tracking-wider">
              Ditolak
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-rose-600">{metrics.rejected}</span>
            <span className="text-xs text-rose-700 font-bold">Ditolak</span>
          </div>
          <span className="text-[10px] text-rose-600 font-semibold mt-1">
            Tidak memenuhi syarat
          </span>
        </div>

      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. FILTER CONTROLS & SEARCH BAR                              */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama siswa, NISN, atau keterangan alasan..."
              className="w-full bg-gray-50 border border-gray-200 text-xs font-bold text-gray-900 pl-10 pr-4 py-2.5 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none transition-all placeholder:text-gray-400"
            />
          </div>

          {/* Controls: Class, Type, Status */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Class Dropdown for teachers/admin */}
            {!isStudent && !isParent && (
              <div className="relative min-w-[150px]">
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full appearance-none bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-extrabold text-gray-800 px-3.5 py-2.5 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 cursor-pointer"
                >
                  <option value="Semua Kelas">Semua Kelas</option>
                  {classesList.map((c) => {
                    const cName = c.name || c.id;
                    return (
                      <option key={c.id || cName} value={cName}>
                        Kelas {cName}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Type Dropdown (Sakit / Izin) */}
            <div className="relative min-w-[120px]">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full appearance-none bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-extrabold text-gray-800 px-3.5 py-2.5 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 cursor-pointer"
              >
                <option value="Semua">Semua Jenis</option>
                <option value="Sakit">Sakit</option>
                <option value="Izin">Izin Resmi</option>
              </select>
            </div>

            {/* Status Dropdown */}
            <div className="relative min-w-[160px]">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full appearance-none bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-extrabold text-gray-800 px-3.5 py-2.5 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 cursor-pointer"
              >
                <option value="Semua">Semua Status</option>
                <option value="Menunggu Persetujuan">Menunggu Persetujuan</option>
                <option value="Disetujui">Disetujui</option>
                <option value="Ditolak">Ditolak</option>
              </select>
            </div>

          </div>

        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. LEAVE REQUESTS LIST / TABLE                               */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        
        {loading ? (
          <div className="py-16 text-center text-gray-400">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-3 text-[#531FFF]" />
            <p className="text-xs font-bold">Memuat daftar pengajuan izin & sakit...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 text-[#531FFF] flex items-center justify-center mx-auto mb-3">
              <ClipboardCheck className="w-7 h-7" />
            </div>
            <h3 className="text-base font-extrabold text-gray-900">
              Belum Ada Pengajuan Izin / Sakit
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 leading-relaxed">
              {searchQuery || statusFilter !== "Semua" || typeFilter !== "Semua"
                ? "Tidak ada permohonan yang sesuai dengan filter atau kata kunci pencarian Anda."
                : isStudent
                ? "Anda belum pernah mengajukan izin atau sakit. Klik tombol di bawah untuk mengajukan permohonan ke Wali Kelas."
                : "Belum ada siswa yang mengajukan izin atau surat keterangan sakit untuk saat ini."}
            </p>
            {isStudent && (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-4 px-4 py-2 bg-[#531FFF] hover:bg-[#4314cc] text-white text-xs font-extrabold rounded-xl inline-flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Pengajuan Sekarang</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Siswa & Kelas</th>
                  <th className="py-3.5 px-4">Jenis</th>
                  <th className="py-3.5 px-4">Rentang Waktu</th>
                  <th className="py-3.5 px-4 min-w-[200px]">Alasan / Keterangan</th>
                  <th className="py-3.5 px-4 text-center">Bukti Lampiran</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredRequests.map((req) => {
                  const isPending = req.status === "Menunggu Persetujuan";
                  const canMutate = isGuru || isAdmin;

                  return (
                    <tr 
                      key={req.id} 
                      className="hover:bg-purple-50/20 transition-colors group"
                    >
                      {/* Siswa & Kelas */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <ProfileAvatar
                            name={req.studentName}
                            role="student"
                            size="md"
                            shape="rounded-xl"
                          />
                          <div>
                            <div className="font-extrabold text-gray-900 group-hover:text-[#531FFF] transition-colors">
                              {req.studentName}
                            </div>
                            <div className="text-[11px] text-gray-400 font-medium">
                              Kelas <strong className="text-gray-700">{req.className || "-"}</strong> • NISN: {req.studentNisn || req.studentId || "-"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Jenis Permohonan */}
                      <td className="py-3.5 px-4">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black",
                          req.type === "Sakit"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-purple-50 text-purple-700 border border-purple-200"
                        )}>
                          {req.type === "Sakit" ? <Stethoscope className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
                          <span>{req.type}</span>
                        </span>
                      </td>

                      {/* Rentang Waktu */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-gray-900 whitespace-nowrap">
                          {formatDateRange(req.startDate, req.endDate)}
                        </div>
                        <div className="text-[11px] text-gray-400 font-semibold mt-0.5">
                          Total: <strong className="text-[#531FFF]">{req.daysCount} Hari</strong>
                        </div>
                      </td>

                      {/* Alasan */}
                      <td className="py-3.5 px-4">
                        <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed max-w-sm">
                          {req.reason}
                        </p>
                      </td>

                      {/* Bukti Lampiran */}
                      <td className="py-3.5 px-4 text-center">
                        {req.attachmentUrl ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRequest(req);
                              setIsDetailModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold text-[11px] transition-colors cursor-pointer"
                            title="Klik untuk melihat bukti surat"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#531FFF]" />
                            <span>Lihat Surat</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-gray-400 italic">Tanpa Lampiran</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide",
                          req.status === "Disetujui"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
                            : req.status === "Ditolak"
                            ? "bg-rose-50 text-rose-700 border border-rose-300"
                            : "bg-amber-50 text-amber-800 border border-amber-300"
                        )}>
                          {req.status === "Disetujui" ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : req.status === "Ditolak" ? (
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                          )}
                          <span>{req.status}</span>
                        </span>

                        {req.approvedBy && (
                          <div className="text-[10px] text-gray-400 mt-1 truncate max-w-[130px]" title={req.approvedBy}>
                            Oleh: {req.approvedBy}
                          </div>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* Wali Kelas quick approval buttons */}
                          {canMutate && isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleQuickApprove(req)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer active:scale-95"
                                title="Setujui permohonan izin/sakit ini"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Setujui</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRequest(req);
                                  setIsDetailModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                title="Tolak permohonan dengan alasan"
                              >
                                Tolak
                              </button>
                            </>
                          )}

                          {/* Detail Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRequest(req);
                              setIsDetailModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-gray-50 hover:bg-purple-50 text-gray-600 hover:text-[#531FFF] border border-gray-200 hover:border-purple-200 transition-colors cursor-pointer"
                            title="Buka rincian lengkap permohonan"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. MODAL DIALOGS                                             */}
      {/* ───────────────────────────────────────────────────────────── */}
      {/* A. Create Request Modal */}
      <CreateLeaveRequestModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        student={{
          id: myStudentProfile?.id || "siswa",
          name: myStudentProfile?.name || "Siswa",
          nisn: myStudentProfile?.nisn,
          className: myStudentProfile?.className || (selectedClass !== "Semua Kelas" ? selectedClass : "10 MIPA 1"),
          uid: currentUser?.uid
        }}
        academicYear={activeAcademicYear}
        semester={activeSemester}
        onSuccess={() => {
          // Handled by realtime snapshot
        }}
      />

      {/* B. Detail & Approval Modal */}
      <LeaveRequestDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedRequest(null);
        }}
        request={selectedRequest}
        canApprove={isGuru || isAdmin}
        approverName={currentUserData?.fullName || currentUser?.displayName || (isGuru ? "Wali Kelas" : "Admin")}
        onUpdated={() => {
          // Handled by realtime snapshot
        }}
      />

    </div>
  );
}
