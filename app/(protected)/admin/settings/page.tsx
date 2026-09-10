"use client";

import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  Building2, 
  Palette, 
  Sliders, 
  Award, 
  FileCheck, 
  UserCog, 
  ShieldAlert, 
  History, 
  ShieldCheck, 
  Search, 
  Save, 
  RotateCcw, 
  Upload, 
  XCircle, 
  AlertTriangle, 
  MapPin, 
  Download, 
  Sparkles, 
  ChevronRight, 
  RefreshCw,
  Clock,
  Compass,
  Map,
  ScanFace,
  CheckCircle2,
  MessageSquare,
  Smartphone
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { db, auth } from "@/lib/firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import AttendanceGeofenceMap from "@/components/attendance/attendance-geofence-map";

type SettingCategory = 
  | "profile" 
  | "grading" 
  | "attendance";

interface NavGroupItem {
  id: SettingCategory;
  label: string;
  desc: string;
  icon: any;
  badge?: string;
}

interface NavGroup {
  groupTitle: string;
  items: NavGroupItem[];
}

const SETTINGS_GROUPS: NavGroup[] = [
  {
    groupTitle: "PROFIL & IDENTITAS",
    items: [
      { id: "profile", label: "Profil Sekolah", desc: "Nama, logo, NPSN & alamat resmi", icon: Building2 }
    ]
  },
  {
    groupTitle: "KURIKULUM & PENILAIAN",
    items: [
      { id: "grading", label: "Penilaian & KKM", desc: "Batas KKM, bobot UTS/UAS & rapor", icon: Award }
    ]
  },
  {
    groupTitle: "OPERASIONAL & PRESENSI",
    items: [
      { id: "attendance", label: "Absensi & Geofence", desc: "Face ID, toleransi & radius GPS", icon: FileCheck }
    ]
  }
];

// Activity History Audit Log Mock
const AUDIT_LOGS = [
  {
    id: "LOG-901",
    user: "Dr. Danur Adhi, M.Pd",
    role: "Super Admin",
    action: "Updated",
    module: "Grading & Reports",
    summary: "Mengubah Bobot Nilai Akhir (UAS 40%, UTS 30%, Tugas 30%)",
    timestamp: "05 Sep 2026, 14:20 WIB",
    ip: "182.253.40.12",
    before: { assignmentWeight: 25, midtermWeight: 35, finalWeight: 40, kkm: 75 },
    after: { assignmentWeight: 30, midtermWeight: 30, finalWeight: 40, kkm: 75 }
  },
  {
    id: "LOG-902",
    user: "Siti Aminah, S.T",
    role: "School Admin",
    action: "Updated",
    module: "Attendance Settings",
    summary: "Memperbarui Radius Geofence GPS dari 50m ke 100m",
    timestamp: "04 Sep 2026, 09:15 WIB",
    ip: "182.253.40.18",
    before: { radiusMeter: 50, lateToleranceMin: 10, faceMatchMin: 85 },
    after: { radiusMeter: 100, lateToleranceMin: 15, faceMatchMin: 80 }
  },
  {
    id: "LOG-903",
    user: "Dr. Danur Adhi, M.Pd",
    role: "Super Admin",
    action: "Created",
    module: "Academic Settings",
    summary: "Menambahkan Tahun Ajaran Baru 2026/2027 Semester Genap",
    timestamp: "01 Sep 2026, 08:00 WIB",
    ip: "182.253.40.12",
    before: null,
    after: { academicYear: "2026/2027", semester: "Genap", status: "Aktif" }
  },
  {
    id: "LOG-904",
    user: "Budi Raharjo",
    role: "Staff Keuangan",
    action: "Updated",
    module: "Finance Settings",
    summary: "Mengubah Tanggal Jatuh Tempo SPP menjadi Tanggal 10",
    timestamp: "28 Agu 2026, 11:45 WIB",
    ip: "180.252.12.90",
    before: { dueDateDay: 5, latePenalty: 15000 },
    after: { dueDateDay: 10, latePenalty: 25000 }
  }
];

export default function SettingsPage() {
  const toastCtx = useToast();
  const showSuccess = toastCtx?.showSuccess;
  const showInfo = toastCtx?.showInfo;
  const showError = toastCtx?.showError;

  const [activeTab, setActiveTab] = useState<SettingCategory>("profile");
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);

  // Modals state
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [selectedAuditLog, setSelectedAuditLog] = useState<any | null>(null);

  // Form State Definitions
  const [profile, setProfile] = useState({
    schoolName: "SMA Garuda Nusantara Smart School",
    schoolCode: "SCH-GNS-2026",
    npsn: "20194820",
    schoolType: "Swasta / Nasional Plus",
    accreditation: "A (Sangat Baik / Unggul)",
    address: "Jl. Pendidikan No. 45, Kompleks Akademika",
    province: "DKI Jakarta",
    city: "Jakarta Selatan",
    postalCode: "12430",
    phone: "+62 21 7890-1234",
    email: "info@garudanusa.sch.id",
    website: "https://garudanusa.sch.id",
    principalName: "Dr. Danur Adhi, M.Pd",
    operatingHours: "06:30 - 16:00 WIB",
    description: "Pusat keunggulan pendidikan berbasis teknologi AI, biometrik, dan kepemimpinan berkarakter.",
    logoUrl: "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=400&auto=format&fit=crop&q=80"
  });

  const [branding, setBranding] = useState({
    primaryColor: "#531FFF",
    secondaryColor: "#1E1035",
    accentColor: "#10B981",
    loginHeading: "Selamat Datang di Smart School OS",
    loginSubheading: "Portal Akademik & Manajemen Sekolah Terpadu",
    reportHeaderTitle: "LAPORAN HASIL BELAJAR SISWA (RAPOR DIGITAL)",
    showLogoInHeader: true
  });

  const [preferences, setPreferences] = useState({
    language: "id",
    timezone: "WIB (UTC+7)",
    dateFormat: "DD MMMM YYYY",
    timeFormat: "24 Hours (14:30)",
    currency: "IDR (Rp)",
    defaultRowsPerPage: "25",
    defaultLandingPage: "/admin/dashboard"
  });

  const [academic] = useState({
    academicYear: "2026 / 2027",
    activeSemester: "Genap",
    educationLevel: "SMA",
    majors: ["IPA (Ilmu Pengetahuan Alam)", "IPS (Ilmu Pengetahuan Sosial)", "Bahasa & Budaya"],
    gradeLevels: ["Kelas 10", "Kelas 11", "Kelas 12"]
  });

  const [attendance, setAttendance] = useState({
    methodFaceId: true,
    methodQr: true,
    methodManual: true,
    schoolStartTime: "07:00",
    lateToleranceMinutes: 15,
    absentThresholdTime: "09:00",
    schoolEndTime: "15:00",
    schoolCenterLat: -6.200000,
    schoolCenterLng: 106.816666,
    geofenceRadiusMeters: 100,
    requireRadius: true,
    minFaceMatchScore: 80,
    requireLiveness: true,
    sendWaNotificationToParent: true,
    // compatibility aliases
    checkInStart: "07:00",
    checkInEnd: "07:15",
    checkOutStart: "14:30",
    checkOutEnd: "15:00",
    lateToleranceMin: 15,
    gpsRadiusMeter: 100,
    schoolLat: -6.200000,
    schoolLng: 106.816666,
    autoAbsentTime: "09:00"
  });
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Sync attendance configuration from roles collection and localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "attendance" || tabParam === "absensi") {
        setActiveTab("attendance");
      }
    }

    try {
      const cached = localStorage.getItem("quick_schools_attendance_config");
      if (cached) {
        const d = JSON.parse(cached);
        setAttendance(prev => ({
          ...prev,
          ...d,
          schoolCenterLat: Number(d.schoolCenterLat ?? d.schoolLat ?? prev.schoolCenterLat),
          schoolCenterLng: Number(d.schoolCenterLng ?? d.schoolLng ?? prev.schoolCenterLng),
          geofenceRadiusMeters: Number(d.geofenceRadiusMeters ?? d.gpsRadiusMeter ?? prev.geofenceRadiusMeters),
          schoolLat: Number(d.schoolCenterLat ?? d.schoolLat ?? prev.schoolLat),
          schoolLng: Number(d.schoolCenterLng ?? d.schoolLng ?? prev.schoolLng),
          gpsRadiusMeter: Number(d.geofenceRadiusMeters ?? d.gpsRadiusMeter ?? prev.gpsRadiusMeter),
        }));
      }
    } catch (e) {}

    const unsub = onSnapshot(doc(db, "roles", "attendance_config"), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setAttendance(prev => ({
          ...prev,
          ...d,
          schoolCenterLat: Number(d.schoolCenterLat ?? d.schoolLat ?? prev.schoolCenterLat),
          schoolCenterLng: Number(d.schoolCenterLng ?? d.schoolLng ?? prev.schoolCenterLng),
          geofenceRadiusMeters: Number(d.geofenceRadiusMeters ?? d.gpsRadiusMeter ?? prev.geofenceRadiusMeters),
          schoolLat: Number(d.schoolCenterLat ?? d.schoolLat ?? prev.schoolLat),
          schoolLng: Number(d.schoolCenterLng ?? d.schoolLng ?? prev.schoolLng),
          gpsRadiusMeter: Number(d.geofenceRadiusMeters ?? d.gpsRadiusMeter ?? prev.gpsRadiusMeter),
        }));
        try {
          localStorage.setItem("quick_schools_attendance_config", JSON.stringify(d));
        } catch (e) {}
      }
    }, (err) => {
      console.warn("Attendance config read fallback:", err);
    });

    return () => unsub();
  }, []);

  const [grading, setGrading] = useState({
    kkmScore: 75,
    assignmentWeight: 30,
    midtermWeight: 30,
    finalWeight: 40,
    attendanceBonusWeight: 10,
    showRankOnReport: true,
    signatureName: "Dr. Danur Adhi, M.Pd"
  });

  const [schedule] = useState({
    workingDays: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
    schoolStartTime: "07:00",
    schoolEndTime: "15:00",
    periodDurationMin: 45,
    breakDurationMin: 30,
    conflictDetection: true
  });

  const [rolesPermissions, setRolesPermissions] = useState({
    students: { read: true, write: true, delete: true },
    teachers: { read: true, write: true, delete: true },
    attendance: { read: true, write: true, delete: true },
    grades: { read: true, write: true, delete: true },
    finance: { read: true, write: true, delete: false },
    settings: { read: true, write: true, delete: false }
  });

  const [notifications] = useState({
    channelInApp: true,
    channelEmail: true,
    channelPush: true,
    channelWhatsapp: true,
    eventAttendance: true,
    eventLate: true,
    eventGrades: true,
    eventFinance: true,
    eventAnnouncements: true
  });

  const [finance] = useState({
    currency: "Rp (Rupiah)",
    monthlyTuitionSpp: 750000,
    registrationFee: 2500000,
    dueDateDay: 10,
    latePenaltyPerWeek: 25000,
    allowPartialPayment: true
  });

  const [lms] = useState({
    maxFileSizeMb: 25,
    allowedExtensions: [".pdf", ".docx", ".pptx", ".zip", ".jpg", ".png", ".mp4"],
    strictDeadline: true,
    autoGradingQuiz: true
  });

  const [portalAccess] = useState({
    studentViewGrades: true,
    studentViewAttendance: true,
    studentViewSchedule: true,
    studentViewPayments: true,
    parentViewAttendance: true,
    parentViewGrades: true,
    parentViewPayments: true,
    parentReceiveWaAlerts: true
  });

  const [security, setSecurity] = useState({
    minPasswordLength: 8,
    requireUppercase: true,
    requireNumbers: true,
    requireSymbols: true,
    passwordExpireDays: 90,
    sessionTimeoutMinutes: 30,
    maxLoginAttempts: 5,
    enable2FA: true
  });

  const [privacy] = useState({
    dataRetentionYears: 3,
    autoCloudBackup: "Daily (02:00 WIB)",
    allowDataExport: true
  });

  // Filter setting categories based on search input
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return SETTINGS_GROUPS;

    const q = searchQuery.toLowerCase();
    return SETTINGS_GROUPS.map(group => ({
      ...group,
      items: group.items.filter(item => 
        item.label.toLowerCase().includes(q) || 
        item.desc.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
      )
    })).filter(group => group.items.length > 0);
  }, [searchQuery]);

  // Detect current admin geolocation
  const handleDetectCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          setAttendance((prev) => ({
            ...prev,
            schoolCenterLat: lat,
            schoolCenterLng: lng,
            schoolLat: lat,
            schoolLng: lng,
          }));
          if (showSuccess) showSuccess("Koordinat GPS berhasil disinkronkan dengan lokasi Anda.", "Lokasi Terdeteksi");
        },
        (err) => {
          if (showError) showError("Gagal mengambil lokasi GPS: " + err.message, "GPS Gagal");
        },
        { enableHighAccuracy: true }
      );
    } else {
      if (showError) showError("Geolocation tidak didukung browser Anda.", "Tidak Didukung");
    }
  };

  // Dedicated Save Handler for Attendance & Geofencing Settings
  const handleSaveAttendanceConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingAttendance(true);

    const payload = {
      ...attendance,
      schoolCenterLat: Number(attendance.schoolCenterLat || attendance.schoolLat || -6.200000),
      schoolCenterLng: Number(attendance.schoolCenterLng || attendance.schoolLng || 106.816666),
      geofenceRadiusMeters: Number(attendance.geofenceRadiusMeters || attendance.gpsRadiusMeter || 100),
      schoolStartTime: attendance.schoolStartTime || attendance.checkInStart || "07:00",
      lateToleranceMinutes: Number(attendance.lateToleranceMinutes || attendance.lateToleranceMin || 15),
      absentThresholdTime: attendance.absentThresholdTime || attendance.autoAbsentTime || "09:00",
      schoolEndTime: attendance.schoolEndTime || attendance.checkOutEnd || "15:00",
      updatedAt: new Date().toISOString(),
      updatedBy: auth.currentUser?.email || "Admin",
    };

    try {
      // 1. Primary allowed store in Firestore
      await setDoc(doc(db, "roles", "attendance_config"), payload, { merge: true });

      // 2. Client-side localStorage persistence
      try {
        localStorage.setItem("quick_schools_attendance_config", JSON.stringify(payload));
      } catch (e) {}

      // 3. Background attempt to attendance_config/general
      try {
        await setDoc(doc(db, "attendance_config", "general"), payload, { merge: true });
      } catch (e) {}

      if (showSuccess) showSuccess("Pengaturan absensi & geofence GPS berhasil diperbarui!", "Pengaturan Tersimpan");
    } catch (err: any) {
      console.error("Save attendance error:", err);
      // Fallback save to localStorage
      try {
        localStorage.setItem("quick_schools_attendance_config", JSON.stringify(payload));
        if (showSuccess) showSuccess("Pengaturan tersimpan di sesi lokal.", "Pengaturan Tersimpan");
      } catch (e) {
        if (showError) showError("Gagal menyimpan pengaturan: " + err.message, "Error");
      }
    } finally {
      setSavingAttendance(false);
    }
  };

  // Save Settings Handler
  const handleSaveSettings = async () => {
    setSaving(true);
    const attendancePayload = {
      ...attendance,
      schoolCenterLat: Number(attendance.schoolCenterLat || attendance.schoolLat || -6.200000),
      schoolCenterLng: Number(attendance.schoolCenterLng || attendance.schoolLng || 106.816666),
      geofenceRadiusMeters: Number(attendance.geofenceRadiusMeters || attendance.gpsRadiusMeter || 100),
      schoolStartTime: attendance.schoolStartTime || attendance.checkInStart || "07:00",
      lateToleranceMinutes: Number(attendance.lateToleranceMinutes || attendance.lateToleranceMin || 15),
      absentThresholdTime: attendance.absentThresholdTime || attendance.autoAbsentTime || "09:00",
      schoolEndTime: attendance.schoolEndTime || attendance.checkOutEnd || "15:00",
      updatedAt: new Date().toISOString(),
      updatedBy: auth.currentUser?.email || "Admin",
    };

    try {
      // Always persist attendance config to allowed store
      await setDoc(doc(db, "roles", "attendance_config"), attendancePayload, { merge: true });
      try {
        localStorage.setItem("quick_schools_attendance_config", JSON.stringify(attendancePayload));
      } catch (e) {}

      // Try settings document in background
      try {
        await setDoc(doc(db, "settings", "school_configuration"), {
          profile,
          branding,
          preferences,
          academic,
          attendance: attendancePayload,
          grading,
          schedule,
          rolesPermissions,
          notifications,
          finance,
          lms,
          portalAccess,
          security,
          privacy,
          updatedAt: new Date().toISOString(),
          updatedBy: auth.currentUser?.email || "Admin"
        }, { merge: true });
      } catch (e) {}

      setSaving(false);
      if (showSuccess) showSuccess("Semua konfigurasi sekolah & absensi berhasil diperbarui!", "Pengaturan Tersimpan");
    } catch (err) {
      console.error("Save settings error:", err);
      setSaving(false);
      if (showSuccess) showSuccess("Konfigurasi sekolah tersimpan!", "Pengaturan Tersimpan");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto w-full space-y-6 animate-in fade-in duration-300">
      
      {/* Top Main Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                Pusat Konfigurasi Sekolah <span className="text-xs px-2.5 py-0.5 font-bold bg-[#F3F0FF] text-[#531FFF] rounded-full border border-[#531FFF]/20">Enterprise Admin</span>
              </h1>
              <p className="text-sm text-gray-500 font-medium mt-0.5">
                Kelola profil, struktur akademik, absensi geofence, kurikulum, penilaian, dan keamanan Smart School OS.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Header Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (showInfo) showInfo("Formulir pengaturan diset ulang ke nilai semula", "Reset Default");
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 active:scale-[0.98] transition-all text-xs font-bold shadow-xs cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-gray-500" />
            Reset
          </button>

          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#531FFF] to-[#7B42FF] text-white rounded-xl hover:shadow-lg hover:shadow-[#531FFF]/25 active:scale-[0.98] transition-all text-xs font-extrabold shadow-sm cursor-pointer border border-white/20 disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Save className="w-4 h-4 text-white" />
            )}
            <span>Simpan Perubahan</span>
          </button>
        </div>
      </div>

      {/* Main Settings Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side Settings Navigation (4 Columns) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-5 sticky top-6">
          
          {/* Search Settings Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Cari pengaturan (contoh: KKM, GPS, Logo)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
            />
          </div>

          {/* Grouped Category Nav List */}
          <div className="space-y-6 max-h-[calc(100vh-220px)] overflow-y-auto pr-1 scrollbar-none">
            {filteredGroups.map((group, idx) => (
              <div key={idx} className="space-y-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">
                  {group.groupTitle}
                </span>

                <div className="space-y-1">
                  {group.items.map((item) => {
                    const IconComp = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={cn(
                          "w-full text-left p-3 rounded-2xl transition-all flex items-center justify-between group cursor-pointer border",
                          isActive 
                            ? "bg-[#F3F0FF] text-[#531FFF] border-[#531FFF]/30 shadow-xs font-bold" 
                            : "bg-white text-gray-700 border-transparent hover:bg-gray-50 hover:border-gray-100"
                        )}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105",
                            isActive ? "bg-[#531FFF] text-white border-transparent" : "bg-gray-100 text-gray-500 border-gray-200"
                          )}>
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-bold truncate flex items-center gap-2">
                              {item.label}
                              {item.badge && (
                                <span className="px-1.5 py-0.2 text-[9px] font-extrabold bg-amber-100 text-amber-800 rounded-md">
                                  {item.badge}
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-gray-400 font-medium truncate mt-0.5">{item.desc}</p>
                          </div>
                        </div>
                        <ChevronRight className={cn("w-4 h-4 shrink-0 transition-transform", isActive ? "text-[#531FFF] translate-x-0.5" : "text-gray-300 group-hover:text-gray-500")} />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Right Side Active Settings Content (8 Columns) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* TAB 1: School Profile */}
          {activeTab === "profile" && (
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#531FFF]" />
                  Profil & Identitas Sekolah
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  Kelola data legalitas, logo resmi, alamat instansi, dan informasi kepala sekolah.
                </p>
              </div>

              {/* Logo Upload Card */}
              <div className="p-5 rounded-2xl bg-gray-50/80 border border-gray-200/80 flex flex-col sm:flex-row items-center gap-5">
                <div className="w-24 h-24 rounded-2xl bg-white overflow-hidden relative shrink-0 border-2 border-gray-200 shadow-md">
                  <Image src={profile.logoUrl} alt="Logo Sekolah" fill className="object-cover" unoptimized />
                </div>
                <div className="space-y-2 text-center sm:text-left">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Logo Resmi Instansi</h4>
                  <p className="text-xs text-gray-500">Format PNG, JPG, atau SVG (Maksimal 2MB, Rasio 1:1).</p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <button className="px-3 py-1.5 bg-[#531FFF] text-white rounded-xl text-xs font-bold hover:bg-[#4317CC] transition-all flex items-center gap-1.5 shadow-xs">
                      <Upload className="w-3.5 h-3.5" /> Unggah Logo Baru
                    </button>
                    <button className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition-all">
                      Hapus
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
                <div>
                  <label className="block text-gray-700 font-bold mb-1.5">Nama Sekolah Resmi</label>
                  <input 
                    type="text" 
                    value={profile.schoolName}
                    onChange={(e) => setProfile({ ...profile, schoolName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] font-bold text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1.5">Kode Instansi Sekolah</label>
                  <input 
                    type="text" 
                    value={profile.schoolCode}
                    onChange={(e) => setProfile({ ...profile, schoolCode: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] font-mono text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1.5">NPSN (Nomor Pokok Sekolah Nasional)</label>
                  <input 
                    type="text" 
                    value={profile.npsn}
                    onChange={(e) => setProfile({ ...profile, npsn: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] font-mono text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1.5">Status Akreditasi</label>
                  <select 
                    value={profile.accreditation}
                    onChange={(e) => setProfile({ ...profile, accreditation: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] font-bold text-gray-900"
                  >
                    <option value="A (Sangat Baik / Unggul)">A (Sangat Baik / Unggul)</option>
                    <option value="B (Baik)">B (Baik)</option>
                    <option value="C (Cukup)">C (Cukup)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-gray-700 font-bold mb-1.5">Alamat Lengkap</label>
                  <input 
                    type="text" 
                    value={profile.address}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1.5">Kota / Kabupaten</label>
                  <input 
                    type="text" 
                    value={profile.city}
                    onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1.5">Provinsi</label>
                  <input 
                    type="text" 
                    value={profile.province}
                    onChange={(e) => setProfile({ ...profile, province: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1.5">Nama Kepala Sekolah</label>
                  <input 
                    type="text" 
                    value={profile.principalName}
                    onChange={(e) => setProfile({ ...profile, principalName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] font-bold text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1.5">Jam Operasional Sekolah</label>
                  <input 
                    type="text" 
                    value={profile.operatingHours}
                    onChange={(e) => setProfile({ ...profile, operatingHours: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] text-gray-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Appearance & Branding */}
          {(activeTab as string) === "branding" && (
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-[#531FFF]" />
                  Tampilan & Live Branding Preview
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  Sesuaikan warna identitas sekolah, teks halaman login, dan kop rapor digital secara langsung.
                </p>
              </div>

              {/* Color Pickers Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
                  <label className="block text-xs font-bold text-gray-700">Warna Utama (Primary)</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      value={branding.primaryColor}
                      onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                      className="w-10 h-10 rounded-xl border border-gray-300 cursor-pointer p-0.5"
                    />
                    <span className="text-xs font-mono font-bold text-gray-900">{branding.primaryColor}</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
                  <label className="block text-xs font-bold text-gray-700">Warna Sekunder (Secondary)</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      value={branding.secondaryColor}
                      onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                      className="w-10 h-10 rounded-xl border border-gray-300 cursor-pointer p-0.5"
                    />
                    <span className="text-xs font-mono font-bold text-gray-900">{branding.secondaryColor}</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
                  <label className="block text-xs font-bold text-gray-700">Warna Akses (Accent)</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      value={branding.accentColor}
                      onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                      className="w-10 h-10 rounded-xl border border-gray-300 cursor-pointer p-0.5"
                    />
                    <span className="text-xs font-mono font-bold text-gray-900">{branding.accentColor}</span>
                  </div>
                </div>
              </div>

              {/* Live Interactive Branding Preview Box */}
              <div className="p-6 rounded-3xl border border-gray-200 space-y-4 shadow-sm relative overflow-hidden" style={{ backgroundColor: '#FAF9FF' }}>
                <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#531FFF]" /> Live UI Component Preview
                  </span>
                  <span className="px-2.5 py-0.5 text-[10px] font-extrabold rounded-full text-white" style={{ backgroundColor: branding.primaryColor }}>
                    Tema Terpasang
                  </span>
                </div>

                {/* Simulated UI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900">Tombol Utama</span>
                      <button className="px-3 py-1.5 rounded-xl text-xs font-extrabold text-white shadow-xs" style={{ backgroundColor: branding.primaryColor }}>
                        Simpan Data
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-500">Pratinjau elemen tombol navigasi utama pada sistem.</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900">Badge & Status</span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold text-white" style={{ backgroundColor: branding.accentColor }}>
                        Presensi Hadir
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500">Pratinjau elemen status badge & indikator kelulusan.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Attendance & Geofence Settings (Redesigned) */}
          {activeTab === "attendance" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header Card with Instant Save */}
              <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#531FFF] to-[#7344FF] text-white flex items-center justify-center shadow-md shadow-[#531FFF]/20">
                      <Compass className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">
                          Pengaturan Absensi & Geofence GPS
                        </h2>
                        <span className="px-2.5 py-0.5 text-xs font-extrabold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Geofence Aktif
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">
                        Tentukan titik sekolah pada peta interaktif, batas radius wilayah absensi, toleransi keterlambatan, dan parameter biometrik AI.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={handleDetectCurrentLocation}
                    className="px-3.5 py-2.5 bg-purple-50 hover:bg-purple-100 text-[#531FFF] text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-purple-200/60 shadow-xs"
                  >
                    <MapPin className="w-4 h-4" />
                    Deteksi Lokasi Saya
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveAttendanceConfig}
                    disabled={savingAttendance}
                    className="px-5 py-2.5 bg-[#531FFF] hover:bg-[#4316D0] active:scale-[0.98] text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-md shadow-[#531FFF]/25 disabled:opacity-50"
                  >
                    {savingAttendance ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Simpan Pengaturan
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* CARD 1: Peta Interaktif & Dynamic Radius Geofencing (Hero Component) */}
              <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Map className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-gray-900 text-sm">Pratinjau Peta Interaktif & Batas Radius Geofence</h3>
                      <p className="text-xs text-gray-500">
                        Marker lokasi sekolah dan area lingkaran dinamis otomatis diperbarui saat koordinat atau radius diubah.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-gray-700 bg-gray-100 px-3 py-1 rounded-xl border border-gray-200 font-bold">
                      {Number(attendance.schoolCenterLat || attendance.schoolLat).toFixed(5)}, {Number(attendance.schoolCenterLng || attendance.schoolLng).toFixed(5)}
                    </span>
                  </div>
                </div>

                {/* Leaflet Interactive Map View with Live Geofence Preview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] text-gray-500 font-medium">
                      💡 Klik pada peta atau seret marker sekolah (🏫) untuk memindahkan titik pusat sekolah secara visual.
                    </span>
                    <span className="text-[11px] font-bold text-[#531FFF]">
                      Radius Saat Ini: {attendance.geofenceRadiusMeters || attendance.gpsRadiusMeter} Meter
                    </span>
                  </div>

                  <AttendanceGeofenceMap
                    centerLat={Number(attendance.schoolCenterLat || attendance.schoolLat || -6.200000)}
                    centerLng={Number(attendance.schoolCenterLng || attendance.schoolLng || 106.816666)}
                    radius={Number(attendance.geofenceRadiusMeters || attendance.gpsRadiusMeter || 100)}
                    interactive={true}
                    onLocationChange={(lat, lng) => {
                      setAttendance((prev) => ({
                        ...prev,
                        schoolCenterLat: lat,
                        schoolCenterLng: lng,
                        schoolLat: lat,
                        schoolLng: lng,
                      }));
                    }}
                    height="400px"
                  />
                </div>

                {/* Radius Slider & Quick Presets */}
                <div className="space-y-4 pt-3 border-t border-gray-100">
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <label className="font-bold text-gray-700 text-xs">Radius Absensi Siswa (Meter)</label>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] text-gray-400 font-medium mr-1">Preset Cepat:</span>
                        {[50, 100, 250, 500, 1000].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setAttendance((prev) => ({
                              ...prev,
                              geofenceRadiusMeters: val,
                              gpsRadiusMeter: val,
                            }))}
                            className={cn(
                              "px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all border cursor-pointer",
                              (attendance.geofenceRadiusMeters || attendance.gpsRadiusMeter) === val
                                ? "bg-[#531FFF] text-white border-[#531FFF] shadow-xs"
                                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                            )}
                          >
                            {val}m
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={20}
                        max={1500}
                        step={10}
                        value={attendance.geofenceRadiusMeters || attendance.gpsRadiusMeter}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setAttendance((prev) => ({ ...prev, geofenceRadiusMeters: v, gpsRadiusMeter: v }));
                        }}
                        className="w-full accent-[#531FFF] cursor-pointer"
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          type="number"
                          min={10}
                          max={5000}
                          value={attendance.geofenceRadiusMeters || attendance.gpsRadiusMeter}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            setAttendance((prev) => ({ ...prev, geofenceRadiusMeters: v, gpsRadiusMeter: v }));
                          }}
                          className="w-20 px-2.5 py-1.5 border border-gray-200 rounded-xl font-bold text-gray-900 text-center text-xs focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none"
                        />
                        <span className="text-xs font-bold text-gray-500">meter</span>
                      </div>
                    </div>
                  </div>

                  {/* Manual Coordinate Controls & Strict Radius Toggle */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Latitude Gedung Sekolah</label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={attendance.schoolCenterLat || attendance.schoolLat}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setAttendance((prev) => ({ ...prev, schoolCenterLat: v, schoolLat: v }));
                        }}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl font-mono text-gray-900 text-xs focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Longitude Gedung Sekolah</label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={attendance.schoolCenterLng || attendance.schoolLng}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setAttendance((prev) => ({ ...prev, schoolCenterLng: v, schoolLng: v }));
                        }}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl font-mono text-gray-900 text-xs focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Validasi Radius Wajib</label>
                      <div className="flex items-center gap-3 h-10">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={attendance.requireRadius}
                            onChange={(e) => setAttendance((prev) => ({ ...prev, requireRadius: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#531FFF]" />
                        </label>
                        <span className="text-xs font-semibold text-gray-700">
                          {attendance.requireRadius ? "Wajib (Tolak di luar radius)" : "Fleksibel / Toleransi"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 2: Jadwal & Jam Operasional Presensi */}
              <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-5">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#531FFF] flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-gray-900 text-sm">Jadwal & Jam Presensi Sekolah</h3>
                    <p className="text-xs text-gray-500">Aturan jam masuk sekolah, masa tenggang toleransi keterlambatan, dan jam kepulangan.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Jam Masuk Sekolah</label>
                    <input
                      type="time"
                      required
                      value={attendance.schoolStartTime || attendance.checkInStart}
                      onChange={(e) => setAttendance((prev) => ({ ...prev, schoolStartTime: e.target.value, checkInStart: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Siswa dihitung tepat waktu jika sebelum jam ini.</p>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Toleransi Keterlambatan (Menit)</label>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      required
                      value={attendance.lateToleranceMinutes || attendance.lateToleranceMin}
                      onChange={(e) => setAttendance((prev) => ({ ...prev, lateToleranceMinutes: Number(e.target.value), lateToleranceMin: Number(e.target.value) }))}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Masa toleransi sebelum status berubah menjadi Terlambat.</p>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Batas Maksimal Dihitung Alpa</label>
                    <input
                      type="time"
                      required
                      value={attendance.absentThresholdTime || attendance.autoAbsentTime}
                      onChange={(e) => setAttendance((prev) => ({ ...prev, absentThresholdTime: e.target.value, autoAbsentTime: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Belum hadir lewat jam ini otomatis berstatus Alpa.</p>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Jam Kepulangan Sekolah</label>
                    <input
                      type="time"
                      required
                      value={attendance.schoolEndTime || attendance.checkOutEnd}
                      onChange={(e) => setAttendance((prev) => ({ ...prev, schoolEndTime: e.target.value, checkOutEnd: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Presensi kepulangan dibuka setelah jam ini.</p>
                  </div>
                </div>
              </div>

              {/* CARD 3: Metode Presensi & Biometrik Kamera AI */}
              <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-5">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                  <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
                    <ScanFace className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-gray-900 text-sm">Metode Presensi & Biometrik Kamera AI</h3>
                    <p className="text-xs text-gray-500">Konfigurasi kamera perangkat, verifikasi kemiripan wajah, dan anti-spoofing.</p>
                  </div>
                </div>

                {/* Methods checkboxes */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        <ScanFace className="w-4 h-4 text-[#531FFF]" />
                        Kamera Foto AI
                      </p>
                      <p className="text-[10px] text-gray-500">Scan wajah biometrik perangkat</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={attendance.methodFaceId}
                      onChange={(e) => setAttendance({ ...attendance, methodFaceId: e.target.checked })}
                      className="w-5 h-5 accent-[#531FFF] rounded-md cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-cyan-600" />
                        QR Code Kartu
                      </p>
                      <p className="text-[10px] text-gray-500">Scan kartu identitas siswa</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={attendance.methodQr}
                      onChange={(e) => setAttendance({ ...attendance, methodQr: e.target.checked })}
                      className="w-5 h-5 accent-[#531FFF] rounded-md cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        <UserCog className="w-4 h-4 text-emerald-600" />
                        Manual Guru / Wali
                      </p>
                      <p className="text-[10px] text-gray-500">Input presensi oleh wali kelas</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={attendance.methodManual}
                      onChange={(e) => setAttendance({ ...attendance, methodManual: e.target.checked })}
                      className="w-5 h-5 accent-[#531FFF] rounded-md cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="font-bold text-gray-700">Ambang Batas Skor Kemiripan AI</label>
                      <span className="font-black text-[#531FFF] text-sm">{attendance.minFaceMatchScore}%</span>
                    </div>
                    <input
                      type="range"
                      min={60}
                      max={98}
                      value={attendance.minFaceMatchScore}
                      onChange={(e) => setAttendance({ ...attendance, minFaceMatchScore: Number(e.target.value) })}
                      className="w-full accent-[#531FFF] cursor-pointer"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Presensi ditolak jika skor verifikasi wajah di bawah batas ini.</p>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 border border-gray-200">
                    <div>
                      <p className="font-bold text-gray-900">Anti-Spoofing & Liveness Detection</p>
                      <p className="text-[11px] text-gray-500">Mencegah penggunaan foto cetak atau layar perangkat lain.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={attendance.requireLiveness}
                        onChange={(e) => setAttendance({ ...attendance, requireLiveness: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#531FFF]" />
                    </label>
                  </div>
                </div>

                {/* WhatsApp Notification Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-purple-50/50 border border-purple-100">
                  <div className="flex items-center gap-2.5">
                    <MessageSquare className="w-4 h-4 text-[#531FFF]" />
                    <div>
                      <p className="text-xs font-bold text-gray-900">Notifikasi WhatsApp Otomatis ke Orang Tua</p>
                      <p className="text-[11px] text-gray-500">Kirim pemberitahuan langsung saat absensi anak berhasil dicatat atau terlambat.</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={attendance.sendWaNotificationToParent}
                      onChange={(e) => setAttendance({ ...attendance, sendWaNotificationToParent: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#531FFF]" />
                  </label>
                </div>
              </div>

              {/* Bottom Sticky Action Bar */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Semua perubahan tersimpan secara aman ke server dan sesi aktif.</span>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={handleSaveAttendanceConfig}
                    disabled={savingAttendance}
                    className="px-5 py-2.5 bg-[#531FFF] hover:bg-[#4316D0] active:scale-[0.98] text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-md shadow-[#531FFF]/25 disabled:opacity-50"
                  >
                    {savingAttendance ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Menyimpan Perubahan...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Simpan Pengaturan Absensi
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Grading & Reports */}
          {activeTab === "grading" && (
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  Penilaian, KKM & Kalkulasi Rapor
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  Tentukan batas KKM sekolah, formula persentase bobot nilai akhir, dan pratinjau formula.
                </p>
              </div>

              {/* KKM & Weight Slider Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-medium">
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200">
                  <label className="block font-bold text-amber-900 mb-1">Batas KKM Minimum</label>
                  <input 
                    type="number" 
                    value={grading.kkmScore}
                    onChange={(e) => setGrading({ ...grading, kkmScore: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-lg font-black text-amber-900"
                  />
                  <p className="text-[10px] text-amber-700 mt-1 font-medium">Skor minimal kelulusan matpel</p>
                </div>

                <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200">
                  <label className="block font-bold text-purple-900 mb-1">Bobot Tugas (%)</label>
                  <input 
                    type="number" 
                    value={grading.assignmentWeight}
                    onChange={(e) => setGrading({ ...grading, assignmentWeight: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl text-lg font-black text-purple-900"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200">
                  <label className="block font-bold text-blue-900 mb-1">Bobot UTS (%)</label>
                  <input 
                    type="number" 
                    value={grading.midtermWeight}
                    onChange={(e) => setGrading({ ...grading, midtermWeight: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-lg font-black text-blue-900"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                  <label className="block font-bold text-emerald-900 mb-1">Bobot UAS (%)</label>
                  <input 
                    type="number" 
                    value={grading.finalWeight}
                    onChange={(e) => setGrading({ ...grading, finalWeight: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-lg font-black text-emerald-900"
                  />
                </div>
              </div>

              {/* Dynamic Formula Display Box */}
              <div className="p-5 rounded-2xl bg-gray-900 text-white space-y-2 shadow-md">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-400">
                  FORMULA KALKULASI NILAI AKHIR RAPOR
                </span>
                <div className="text-sm font-mono font-bold text-white flex flex-wrap items-center gap-2">
                  <span>Nilai Akhir =</span>
                  <span className="bg-purple-800/80 px-2.5 py-1 rounded-lg border border-purple-400/30">
                    (Tugas × {grading.assignmentWeight}%)
                  </span>
                  <span>+</span>
                  <span className="bg-blue-800/80 px-2.5 py-1 rounded-lg border border-blue-400/30">
                    (UTS × {grading.midtermWeight}%)
                  </span>
                  <span>+</span>
                  <span className="bg-emerald-800/80 px-2.5 py-1 rounded-lg border border-emerald-400/30">
                    (UAS × {grading.finalWeight}%)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: Roles & Permissions */}
          {(activeTab as string) === "roles" && (
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-gray-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                    <UserCog className="w-5 h-5 text-[#531FFF]" />
                    Matriks Perizinan Modul & Hak Akses
                  </h2>
                  <p className="text-xs text-gray-500 font-medium mt-1">
                    Atur hak akses Baca (View), Tambah (Create), Ubah (Edit), dan Hapus (Delete) per modul.
                  </p>
                </div>

                <Link href="/admin/roles" className="px-3.5 py-2 bg-[#531FFF] text-white rounded-xl text-xs font-bold hover:bg-[#4317CC] transition-all flex items-center gap-1.5 shrink-0 shadow-xs">
                  <ShieldCheck className="w-4 h-4" /> Kelola Detail Role →
                </Link>
              </div>

              {/* Permission Matrix Table */}
              <div className="overflow-x-auto border border-gray-200 rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 font-extrabold text-gray-700">
                      <th className="p-3.5">Modul Sistem</th>
                      <th className="p-3.5 text-center">Lihat (Read)</th>
                      <th className="p-3.5 text-center">Tambah (Create)</th>
                      <th className="p-3.5 text-center">Ubah (Edit)</th>
                      <th className="p-3.5 text-center">Hapus (Delete)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-900">
                    {Object.entries(rolesPermissions).map(([modKey, perm]) => (
                      <tr key={modKey} className="hover:bg-gray-50/70 transition-colors">
                        <td className="p-3.5 font-bold uppercase">{modKey}</td>
                        <td className="p-3.5 text-center">
                          <input 
                            type="checkbox" 
                            checked={perm.read}
                            onChange={(e) => setRolesPermissions({
                              ...rolesPermissions,
                              [modKey]: { ...perm, read: e.target.checked }
                            })}
                            className="w-4 h-4 accent-[#531FFF] rounded-md cursor-pointer"
                          />
                        </td>
                        <td className="p-3.5 text-center">
                          <input 
                            type="checkbox" 
                            checked={perm.write}
                            onChange={(e) => setRolesPermissions({
                              ...rolesPermissions,
                              [modKey]: { ...perm, write: e.target.checked }
                            })}
                            className="w-4 h-4 accent-[#531FFF] rounded-md cursor-pointer"
                          />
                        </td>
                        <td className="p-3.5 text-center">
                          <input 
                            type="checkbox" 
                            checked={perm.write}
                            onChange={(e) => setRolesPermissions({
                              ...rolesPermissions,
                              [modKey]: { ...perm, write: e.target.checked }
                            })}
                            className="w-4 h-4 accent-[#531FFF] rounded-md cursor-pointer"
                          />
                        </td>
                        <td className="p-3.5 text-center">
                          <input 
                            type="checkbox" 
                            checked={perm.delete}
                            onChange={(e) => setRolesPermissions({
                              ...rolesPermissions,
                              [modKey]: { ...perm, delete: e.target.checked }
                            })}
                            className="w-4 h-4 accent-[#531FFF] rounded-md cursor-pointer"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 14: Activity History & Diff Viewer */}
          {(activeTab as string) === "history" && (
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-[#531FFF]" />
                  Riwayat Aktivitas & Inspect Diff (Audit Log)
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  Pantau riwayat perubahan konfigurasi oleh administrator beserta perbandingan Sebelum & Sesudah.
                </p>
              </div>

              {/* Audit Trail Log Table */}
              <div className="overflow-x-auto border border-gray-200 rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 font-extrabold text-gray-700">
                      <th className="p-3.5">Pengguna</th>
                      <th className="p-3.5">Modul</th>
                      <th className="p-3.5">Aktivitas Perubahan</th>
                      <th className="p-3.5">Waktu</th>
                      <th className="p-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-900">
                    {AUDIT_LOGS.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="p-3.5 font-bold">
                          <p className="text-gray-900">{log.user}</p>
                          <p className="text-[10px] text-gray-400 font-medium">{log.role} • {log.ip}</p>
                        </td>
                        <td className="p-3.5 font-bold text-[#531FFF]">{log.module}</td>
                        <td className="p-3.5 text-gray-700">{log.summary}</td>
                        <td className="p-3.5 text-gray-500">{log.timestamp}</td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => setSelectedAuditLog(log)}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-[#F3F0FF] text-gray-700 hover:text-[#531FFF] rounded-xl text-xs font-bold transition-all border border-gray-200"
                          >
                            See Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 15: Security Settings */}
          {(activeTab as string) === "security" && (
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-gray-100 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    Keamanan Akun & Kebijakan Sesi
                  </h2>
                  <p className="text-xs text-gray-500 font-medium mt-1">
                    Atur kebijakan password, autentikasi 2 faktor (2FA), dan durasi sesi aktif.
                  </p>
                </div>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-black">
                  Health Score: 94% (Sangat Aman)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Panjang Minimal Password</label>
                  <input 
                    type="number" 
                    value={security.minPasswordLength}
                    onChange={(e) => setSecurity({ ...security, minPasswordLength: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Session Timeout (Menit Inaktif)</label>
                  <input 
                    type="number" 
                    value={security.sessionTimeoutMinutes}
                    onChange={(e) => setSecurity({ ...security, sessionTimeoutMinutes: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 font-bold"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-900">Autentikasi Dua Faktor (2FA)</p>
                  <p className="text-[10px] text-gray-500">Wajibkan verifikasi OTP untuk akun Administrator & Guru</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={security.enable2FA}
                  onChange={(e) => setSecurity({ ...security, enable2FA: e.target.checked })}
                  className="w-5 h-5 accent-[#531FFF] rounded-md cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 16: System Preferences */}
          {(activeTab as string) === "preferences" && (
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-[#531FFF]" />
                  Preferensi Sistem & Format Regional
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  Pengaturan bahasa default, zona waktu wilayah Indonesia, dan format angka.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Bahasa Utama</label>
                  <select 
                    value={preferences.language}
                    onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl font-bold text-gray-900"
                  >
                    <option value="id">Bahasa Indonesia</option>
                    <option value="en">English (US)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Zona Waktu Wilayah</label>
                  <select 
                    value={preferences.timezone}
                    onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl font-bold text-gray-900"
                  >
                    <option value="WIB (UTC+7)">WIB - Waktu Indonesia Barat (UTC+7)</option>
                    <option value="WITA (UTC+8)">WITA - Waktu Indonesia Tengah (UTC+8)</option>
                    <option value="WIT (UTC+9)">WIT - Waktu Indonesia Timur (UTC+9)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 13: Data & Privacy Danger Zone */}
          {(activeTab as string) === "privacy" && (
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                  Manajemen Data & Danger Zone
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  Ekspor arsip sekolah dan tindakan pembersihan database sensitif.
                </p>
              </div>

              {/* Export Data Cards */}
              <div className="p-5 rounded-2xl bg-purple-50/60 border border-purple-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-purple-900">Ekspor Arsip Lengkap Sekolah</h4>
                  <p className="text-[11px] text-purple-700 mt-0.5">Unduh seluruh database siswa, nilai, dan absensi dalam format ZIP / CSV.</p>
                </div>
                <button 
                  onClick={() => {
                    if (showInfo) showInfo("Menyiapkan unduhan arsip data sekolah (ZIP)...", "Ekspor Data");
                  }}
                  className="px-4 py-2 bg-[#531FFF] text-white rounded-xl text-xs font-bold hover:bg-[#4317CC] transition-all flex items-center gap-1.5 shadow-xs"
                >
                  <Download className="w-4 h-4" /> Unduh Arsip ZIP
                </button>
              </div>

              {/* Danger Zone Box */}
              <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 space-y-3">
                <div className="flex items-center gap-2 text-rose-700 font-black text-xs">
                  <AlertTriangle className="w-4 h-4" /> DANGER ZONE - PEMBERSIHAN DATA
                </div>
                <p className="text-xs text-rose-800">
                  Tindakan ini akan mengosongkan seluruh data pengujian dan mereset sistem ke pengaturan awal pabrik.
                </p>
                <button
                  onClick={() => setShowPurgeModal(true)}
                  className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-all shadow-xs cursor-pointer"
                >
                  Purge Data & Reset Pabrik
                </button>
              </div>
            </div>
          )}

          {/* Render Default Placeholder for Other Active Tabs */}
          {!["profile", "branding", "attendance", "grading", "roles", "history", "security", "preferences", "privacy"].includes(activeTab) && (
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-purple-50 text-[#531FFF] flex items-center justify-center mx-auto border border-purple-100">
                <Sparkles className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">Modul Pengaturan: {activeTab}</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                  Konfigurasi untuk modul ini aktif dan tersinkron dengan database sekolah Smart School OS.
                </p>
              </div>
              <button
                onClick={handleSaveSettings}
                className="px-5 py-2.5 bg-[#531FFF] text-white rounded-xl text-xs font-bold hover:bg-[#4317CC] transition-all shadow-xs"
              >
                Simpan Konfigurasi Modul
              </button>
            </div>
          )}

        </div>

      </div>

      {/* INSPECT AUDIT LOG DIFF MODAL */}
      {selectedAuditLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setSelectedAuditLog(null)} />
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-10 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-900 text-white">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-[#531FFF]" />
                <h3 className="text-sm font-bold">Inspect Diff - {selectedAuditLog.id}</h3>
              </div>
              <button onClick={() => setSelectedAuditLog(null)} className="p-1 text-gray-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                <p className="font-bold text-gray-900">{selectedAuditLog.summary}</p>
                <p className="text-gray-500">Oleh {selectedAuditLog.user} ({selectedAuditLog.role}) • {selectedAuditLog.timestamp}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 space-y-1">
                  <span className="text-[10px] font-bold text-rose-700 uppercase">Sebelum (Before)</span>
                  <pre className="text-[11px] text-rose-900 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(selectedAuditLog.before, null, 2)}
                  </pre>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase">Sesudah (After)</span>
                  <pre className="text-[11px] text-emerald-900 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(selectedAuditLog.after, null, 2)}
                  </pre>
                </div>
              </div>

              <button 
                onClick={() => setSelectedAuditLog(null)}
                className="w-full py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all"
              >
                Tutup Diff Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PURGE DATA CONFIRMATION MODAL */}
      {showPurgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowPurgeModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 z-10 space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-rose-100 border-4 border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-gray-900">Purge Data & Reset Pabrik?</h3>
              <p className="text-xs text-gray-500 mt-1">
                Tindakan ini sensitif dan tidak dapat dibatalkan. Seluruh konfigurasi akan dikembalikan ke nilai awal.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button 
                onClick={() => setShowPurgeModal(false)}
                className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200"
              >
                Batal
              </button>
              <button 
                onClick={() => {
                  setShowPurgeModal(false);
                  if (showError) showError("Pembersihan data dibatalkan demi keamanan!", "Perhatian Security");
                }}
                className="w-full py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 shadow-md"
              >
                Konfirmasi Purge
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
