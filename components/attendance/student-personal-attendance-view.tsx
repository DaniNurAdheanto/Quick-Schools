"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Camera,
  Eye,
  ShieldCheck,
  TrendingUp,
  Search,
  X,
  RotateCcw,
  AlertTriangle,
  ChevronDown,
  Filter,
  UserCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AttendanceRecord, AttendanceConfig } from "@/app/(protected)/admin/attendance/page";

interface StudentInfo {
  id: string;
  name: string;
  email?: string;
  nisn?: string;
  className?: string;
  avatar?: string;
}

interface StudentPersonalAttendanceViewProps {
  student: StudentInfo;
  attendanceRecords: AttendanceRecord[];
  config: AttendanceConfig;
  onOpenScanModal: () => void;
}

const STATUS_OPTIONS = [
  { value: "Semua", label: "Semua Status", color: "bg-gray-400" },
  { value: "Hadir", label: "Hadir (Tepat Waktu)", color: "bg-emerald-500" },
  { value: "Terlambat", label: "Terlambat", color: "bg-amber-500" },
  { value: "Izin", label: "Izin", color: "bg-purple-500" },
  { value: "Sakit", label: "Sakit", color: "bg-blue-500" },
  { value: "Alpa", label: "Alpa / Tanpa Keterangan", color: "bg-rose-500" },
];

export default function StudentPersonalAttendanceView({
  student,
  attendanceRecords,
  config,
  onOpenScanModal,
}: StudentPersonalAttendanceViewProps) {
  const [statusFilter, setStatusFilter] = useState<string>("Semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProofRecord, setSelectedProofRecord] = useState<AttendanceRecord | null>(null);

  // 1. Filter records strictly for this student (Personal Isolation)
  const studentRecords = useMemo(() => {
    const studentNameLower = (student.name || "").toLowerCase().trim();
    const studentId = student.id || "";
    const studentEmail = (student.email || "").toLowerCase().trim();

    return attendanceRecords.filter((rec) => {
      // Direct ID match
      if (rec.studentId && (rec.studentId === studentId || rec.studentId === student.nisn)) {
        return true;
      }
      // Email match
      if ((rec as any).studentEmail && (rec as any).studentEmail.toLowerCase().trim() === studentEmail) {
        return true;
      }
      // Name match
      if (rec.studentName && rec.studentName.toLowerCase().trim() === studentNameLower) {
        return true;
      }
      return false;
    });
  }, [attendanceRecords, student]);

  // Today string YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Check today's attendance status
  const todayAttendance = useMemo(() => {
    return studentRecords.find((r) => r.date === todayStr);
  }, [studentRecords, todayStr]);

  // 2. Filter by status & search
  const finalDisplayRecords = useMemo(() => {
    return studentRecords.filter((rec) => {
      if (statusFilter !== "Semua") {
        if (statusFilter === "Hadir" && rec.status !== "Hadir") return false;
        if (statusFilter === "Terlambat" && rec.status !== "Terlambat") return false;
        if (statusFilter === "Izin" && rec.status !== "Izin") return false;
        if (statusFilter === "Sakit" && rec.status !== "Sakit") return false;
        if (statusFilter === "Alpa" && rec.status !== "Alpa" && rec.status !== "Ditolak") return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesDate = rec.date.toLowerCase().includes(q);
        const matchesStatus = rec.status.toLowerCase().includes(q);
        const matchesNotes = (rec.notes || "").toLowerCase().includes(q);
        return matchesDate || matchesStatus || matchesNotes;
      }
      return true;
    });
  }, [studentRecords, statusFilter, searchQuery]);

  // 3. Overall Personal Metrics
  const stats = useMemo(() => {
    let hadir = 0;
    let terlambat = 0;
    let izin = 0;
    let sakit = 0;
    let alpa = 0;

    studentRecords.forEach((r) => {
      if (r.status === "Hadir") hadir++;
      else if (r.status === "Terlambat") terlambat++;
      else if (r.status === "Izin") izin++;
      else if (r.status === "Sakit") sakit++;
      else if (r.status === "Alpa" || r.status === "Ditolak") alpa++;
    });

    const totalDays = studentRecords.length;
    const effectivePresent = hadir + terlambat;
    const percentage = totalDays > 0 ? Math.round((effectivePresent / totalDays) * 100) : 100;

    return {
      hadir,
      terlambat,
      izin,
      sakit,
      alpa,
      totalDays,
      effectivePresent,
      percentage,
    };
  }, [studentRecords]);

  // Helper date formatter in Indonesian locale
  const formatDateID = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* ----------------------------------------------------------------- */}
      {/* 1. HERO BANNER: PERSONAL STUDENT PROFILE & ATTENDANCE ACTION */}
      {/* ----------------------------------------------------------------- */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-gray-950 via-[#190C36] to-[#2E125B] p-6 sm:p-8 text-white shadow-xl shadow-purple-950/20 border border-white/10">
        {/* Glow ambient background ornaments */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-[#531FFF]/30 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-60 h-60 rounded-full bg-emerald-500/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Student Profile Info */}
          <div className="flex items-start gap-4 sm:gap-5">
            <div className="relative shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gradient-to-br from-[#531FFF] to-[#8C52FF] p-1 shadow-lg shadow-[#531FFF]/40 flex items-center justify-center text-white text-2xl font-black">
                {student.avatar ? (
                  <img
                    src={student.avatar}
                    alt={student.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <span>{student.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 px-2 py-0.5 bg-emerald-500 text-gray-950 font-black text-[9px] rounded-full uppercase tracking-wider shadow">
                Siswa
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-white/10 text-purple-200 border border-white/10 backdrop-blur-md">
                  Kelas {student.className || "10 MIPA 1"}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-white/10 text-gray-300 border border-white/10 backdrop-blur-md">
                  NISN: {student.nisn || "2023001"}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {student.name}
              </h1>
              <p className="text-xs sm:text-sm text-purple-200/80 font-medium flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Portal Presensi Pribadi & Rekap Kehadiran Siswa</span>
              </p>
            </div>
          </div>

          {/* Today's Status Box & Quick Scan Button */}
          <div className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {todayAttendance ? (
              <div className="flex items-center gap-3 px-4 py-3 bg-white/10 backdrop-blur-md border border-white/15 rounded-lg">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow",
                  todayAttendance.status === "Hadir"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                    : "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                )}>
                  {todayAttendance.status === "Hadir" ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">
                    Presensi Hari Ini ({todayAttendance.timestamp?.substring(0, 5)} WIB)
                  </div>
                  <div className="text-sm font-black text-white flex items-center gap-1.5">
                    <span>{todayAttendance.status}</span>
                    <span className="text-[10px] font-normal text-purple-200">
                      • {todayAttendance.location?.distance ? `${todayAttendance.location.distance}m dari sekolah` : "Dalam Radius"}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/20 backdrop-blur-md border border-amber-400/30 rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-amber-500/30 text-amber-300 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-amber-200 uppercase tracking-wider">
                    Belum Presensi Hari Ini
                  </div>
                  <div className="text-xs font-bold text-white">
                    Masuk: {config.schoolStartTime} WIB (Toleransi {config.lateToleranceMinutes} menit)
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onOpenScanModal}
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-[#531FFF] to-[#7E42EA] hover:from-[#4516db] hover:to-[#6f33db] text-white font-extrabold text-xs sm:text-sm rounded-lg shadow-lg shadow-[#531FFF]/40 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>{todayAttendance ? "Presensi Ulang" : "Ambil Presensi Sekarang"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 2. RINGKASAN METRIK KEHADIRAN (HADIR, TERLAMBAT, IZIN, SAKIT, ALPA) */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Hadir */}
        <div className="bg-white p-4 sm:p-5 rounded-lg border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:border-emerald-200 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">
              Total Hadir
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-gray-900">{stats.hadir}</span>
            <span className="text-[11px] font-bold text-emerald-600">Hari</span>
          </div>
          <div className="mt-2 text-[10px] font-medium text-gray-400">
            Tepat Waktu
          </div>
        </div>

        {/* Terlambat */}
        <div className="bg-white p-4 sm:p-5 rounded-lg border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:border-amber-200 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">
              Terlambat
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-gray-900">{stats.terlambat}</span>
            <span className="text-[11px] font-bold text-amber-600">Hari</span>
          </div>
          <div className="mt-2 text-[10px] font-medium text-gray-400">
            Tetap dihitung hadir
          </div>
        </div>

        {/* Izin */}
        <div className="bg-white p-4 sm:p-5 rounded-lg border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:border-purple-200 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">
              Izin
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-gray-900">{stats.izin}</span>
            <span className="text-[11px] font-bold text-purple-600">Hari</span>
          </div>
          <div className="mt-2 text-[10px] font-medium text-gray-400">
            Keterangan terverifikasi
          </div>
        </div>

        {/* Sakit */}
        <div className="bg-white p-4 sm:p-5 rounded-lg border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:border-blue-200 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">
              Sakit
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-gray-900">{stats.sakit}</span>
            <span className="text-[11px] font-bold text-blue-600">Hari</span>
          </div>
          <div className="mt-2 text-[10px] font-medium text-gray-400">
            Surat dokter / keterangan
          </div>
        </div>

        {/* Persentase Kehadiran */}
        <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-[#531FFF] to-[#3910A3] p-4 sm:p-5 rounded-lg text-white shadow-md shadow-[#531FFF]/20 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold text-purple-200 uppercase tracking-wider">
              Persentase
            </span>
            <div className="w-8 h-8 rounded-lg bg-white/15 text-white flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black text-white">{stats.percentage}%</span>
            </div>
            {/* Dynamic progress bar */}
            <div className="w-full bg-white/20 h-2 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(stats.percentage, 100)}%` }}
              />
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] font-bold text-purple-200">
            <span>{stats.percentage >= 90 ? "🌟 Sangat Baik" : stats.percentage >= 80 ? "👍 Disiplin" : "⚠️ Perlu Ditingkatkan"}</span>
            <span>Alpa: {stats.alpa}</span>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 3. MODERN CONTROLS BAR: SEARCH & STATUS DROPDOWN */}
      {/* ----------------------------------------------------------------- */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari tanggal, status, atau catatan presensi..."
              className="w-full bg-gray-50/80 border border-gray-200 text-gray-900 text-xs font-bold pl-9 pr-3.5 py-2.5 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none transition-all placeholder:text-gray-400"
            />
          </div>

          {/* Modern Status Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative min-w-[200px]">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                <Filter className="w-3.5 h-3.5 text-gray-400" />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full appearance-none bg-gray-50/80 hover:bg-white border border-gray-200 text-gray-900 text-xs font-extrabold pl-9 pr-9 py-2.5 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none transition-all cursor-pointer shadow-xs"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>

            {/* Reset Button (shown if filtered) */}
            {(statusFilter !== "Semua" || searchQuery.trim() !== "") && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("Semua");
                  setSearchQuery("");
                }}
                className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-bold transition-all cursor-pointer"
                title="Reset Filter & Pencarian"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 4. RIWAYAT PRESENSI PERSONAL SISWA */}
      {/* ----------------------------------------------------------------- */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
              <span>Riwayat Presensi Personal</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-100 text-[#531FFF] font-extrabold">
                {finalDisplayRecords.length} Catatan
              </span>
            </h3>
            <p className="text-[11px] text-gray-500 font-medium">
              Data absensi terverifikasi foto biometrik wajah & GPS geofencing
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400">
            <span>Filter Status:</span>
            <span className="text-[#531FFF] font-black">{statusFilter}</span>
          </div>
        </div>

        {finalDisplayRecords.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-16 h-16 bg-purple-50 text-[#531FFF] rounded-xl mx-auto flex items-center justify-center">
              <Calendar className="w-8 h-8 opacity-60" />
            </div>
            <h4 className="text-base font-extrabold text-gray-900">
              Tidak Ada Catatan Absensi
            </h4>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Tidak ada data absensi yang sesuai dengan status atau pencarian yang Anda pilih.
            </p>
            <button
              type="button"
              onClick={() => {
                setStatusFilter("Semua");
                setSearchQuery("");
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#531FFF] hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filter & Tampilkan Semua</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {finalDisplayRecords.map((rec) => {
              const isHadir = rec.status === "Hadir";
              const isTerlambat = rec.status === "Terlambat";
              const isIzin = rec.status === "Izin";
              const isSakit = rec.status === "Sakit";

              return (
                <div
                  key={rec.id}
                  className="p-4 sm:p-5 hover:bg-purple-50/20 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  {/* Left: Thumbnail & Details */}
                  <div className="flex items-start gap-4">
                    {/* Thumbnail foto bukti absensi */}
                    <div className="relative group shrink-0">
                      <div
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-gray-100 border-2 border-white shadow-md relative cursor-pointer"
                        onClick={() => setSelectedProofRecord(rec)}
                        title="Klik untuk memperbesar foto bukti"
                      >
                        {rec.capturedImage ? (
                          <img
                            src={rec.capturedImage}
                            alt="Bukti Absensi"
                            className="w-full h-full object-cover group-hover:scale-110 transition-all duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                            <Camera className="w-6 h-6" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Eye className="w-4 h-4" />
                        </div>
                      </div>
                      {rec.faceVerified && (
                        <div
                          className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center text-white shadow-xs"
                          title="Terverifikasi AI Biometrik Wajah"
                        >
                          <ShieldCheck className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    {/* Text Details */}
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm sm:text-base font-extrabold text-gray-900">
                          {formatDateID(rec.date)}
                        </span>
                        
                        {/* Status Badge */}
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wide flex items-center gap-1",
                            isHadir && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                            isTerlambat && "bg-amber-50 text-amber-700 border border-amber-200",
                            isIzin && "bg-purple-50 text-purple-700 border border-purple-200",
                            isSakit && "bg-blue-50 text-blue-700 border border-blue-200",
                            !isHadir && !isTerlambat && !isIzin && !isSakit && "bg-rose-50 text-rose-700 border border-rose-200"
                          )}
                        >
                          {isHadir && <CheckCircle2 className="w-3 h-3" />}
                          {isTerlambat && <Clock className="w-3 h-3" />}
                          {isIzin && <Calendar className="w-3 h-3" />}
                          {isSakit && <AlertCircle className="w-3 h-3" />}
                          <span>{rec.status}</span>
                        </span>
                      </div>

                      {/* Time and Notes */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 font-medium">
                        <span className="flex items-center gap-1 text-gray-800 font-bold">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          {rec.timestamp || "07:00:00"} WIB
                        </span>
                        {rec.notes && (
                          <span className="text-gray-400 text-xs">
                            • Catatan: <span className="text-gray-700 italic font-semibold">"{rec.notes}"</span>
                          </span>
                        )}
                        {rec.faceMatchScore && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-50 text-[#531FFF] rounded border border-purple-100">
                            AI Match: {rec.faceMatchScore}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: GPS Location Info & Action button */}
                  <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end pt-2 md:pt-0 border-t md:border-t-0 border-gray-100">
                    <div className="text-left md:text-right">
                      <div className="flex items-center md:justify-end gap-1.5 text-xs font-extrabold text-gray-800">
                        <MapPin className="w-3.5 h-3.5 text-[#531FFF]" />
                        <span>
                          {rec.location?.distance
                            ? `${rec.location.distance} meter dari sekolah`
                            : "Titik Lokasi Sekolah"}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400 font-medium">
                        {rec.location?.inRadius ? (
                          <span className="text-emerald-600 font-bold">✓ Dalam Radius Sekolah</span>
                        ) : (
                          <span className="text-amber-600 font-bold">Diluar Radius Geofence</span>
                        )}
                        {rec.location?.lat && (
                          <span className="ml-1 text-gray-400 font-mono">
                            ({rec.location.lat.toFixed(4)}, {rec.location.lng.toFixed(4)})
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedProofRecord(rec)}
                      className="px-3.5 py-2 bg-purple-50/60 hover:bg-purple-100 text-[#531FFF] border border-purple-200/80 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Lihat Bukti</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 5. MODAL DIALOG: DETAIL & BUKTI FOTO ABSENSI */}
      {/* ----------------------------------------------------------------- */}
      {selectedProofRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gray-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-900 to-gray-950 text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#531FFF] flex items-center justify-center text-white">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black">Bukti Absensi & Geolokasi Siswa</h3>
                  <p className="text-[10px] text-gray-300">
                    {formatDateID(selectedProofRecord.date)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProofRecord(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Photo Proof */}
              <div className="relative w-full h-64 rounded-lg overflow-hidden bg-gray-900 border border-gray-100 shadow-inner flex items-center justify-center">
                {selectedProofRecord.capturedImage ? (
                  <img
                    src={selectedProofRecord.capturedImage}
                    alt="Bukti Wajah Absensi"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center text-gray-400 space-y-2">
                    <Camera className="w-10 h-10 mx-auto opacity-50" />
                    <p className="text-xs font-bold">Foto selfie tidak tersedia</p>
                  </div>
                )}

                {/* Status Overlay */}
                <div className="absolute top-3 left-3 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-white text-xs font-extrabold flex items-center gap-1.5 border border-white/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{selectedProofRecord.status}</span>
                </div>

                {selectedProofRecord.faceMatchScore && (
                  <div className="absolute top-3 right-3 px-3 py-1 bg-purple-900/80 backdrop-blur-md rounded-full text-purple-200 text-[11px] font-extrabold border border-purple-400/30">
                    AI Match: {selectedProofRecord.faceMatchScore}%
                  </div>
                )}
              </div>

              {/* Data Table */}
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-500 font-bold">Siswa</span>
                  <span className="text-gray-900 font-black">{selectedProofRecord.studentName} ({student.className})</span>
                </div>

                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-500 font-bold">Waktu Absensi</span>
                  <span className="text-gray-900 font-black">{selectedProofRecord.timestamp} WIB</span>
                </div>

                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-500 font-bold">Jarak GPS ke Sekolah</span>
                  <span className="text-[#531FFF] font-black">
                    {selectedProofRecord.location?.distance ? `${selectedProofRecord.location.distance} meter` : "5 meter"}
                  </span>
                </div>

                {selectedProofRecord.location?.lat && (
                  <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-500 font-bold">Koordinat Lokasi</span>
                    <span className="text-gray-700 font-mono font-bold">
                      {selectedProofRecord.location.lat.toFixed(6)}, {selectedProofRecord.location.lng.toFixed(6)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-500 font-bold">Metode Verifikasi</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Biometrik Wajah AI & Geofence GPS
                  </span>
                </div>

                {selectedProofRecord.notes && (
                  <div className="p-3 bg-purple-50/60 border border-purple-100 rounded-lg">
                    <span className="text-[10px] font-extrabold text-[#531FFF] uppercase tracking-wider block mb-1">
                      Catatan Siswa / Keterangan
                    </span>
                    <p className="text-gray-800 font-semibold italic">"{selectedProofRecord.notes}"</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedProofRecord(null)}
                className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
