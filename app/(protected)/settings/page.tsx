"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  Building2, 
  Palette, 
  Sliders, 
  Award, 
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
  Camera,
  CheckCircle2,
  MessageSquare,
  Smartphone,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  Check,
  CreditCard,
  Globe,
  Phone,
  Mail,
  Navigation,
  School as SchoolIcon,
  GraduationCap,
  Briefcase,
  BookOpen,
  Layers,
  ArrowRight,
  ExternalLink,
  User,
  Calendar
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { db, auth } from "@/lib/firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import AttendanceGeofenceMap from "@/components/attendance/attendance-geofence-map";
import { acquireCurrentLocation } from "@/lib/geolocation-service";
import { reverseGeocodeGps } from "@/lib/geocoding-service";
import { useTimePresets, TimePreset } from "@/lib/time-presets";
import SPPPaymentSettings from "@/components/settings/spp-payment-settings";
import AcademicYearSettings from "@/components/settings/academic-year-settings";
import { useSchoolProfile, DEFAULT_SCHOOL_PROFILE, SchoolProfile } from "@/context/SchoolProfileContext";
import {
  EducationalStage,
  VocationalProgram,
  STAGE_CONFIGS
} from "@/lib/school-level-config";

type SettingCategory = 
  | "profile" 
  | "academic_stage"
  | "academic_year"
  | "grading" 
  | "attendance"
  | "geofence"
  | "time_presets"
  | "spp_config";

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
      { id: "profile", label: "Profil Sekolah", desc: "Nama, logo, NPSN & alamat resmi", icon: Building2 },
      { id: "academic_stage", label: "Jenjang & Kurikulum", desc: "Pilihan SD, SMP, SMA, SMK & Jurusan", icon: GraduationCap, badge: "Utama" },
      { id: "academic_year", label: "Tahun Ajaran & Semester", desc: "Konteks periode aktif, arsip & multi-tahun", icon: Calendar, badge: "Konteks Utama" }
    ]
  },
  {
    groupTitle: "KEUANGAN & TATA USAHA",
    items: [
      {
        id: "spp_config",
        label: "Pengaturan Pembayaran SPP",
        desc: "Jenis SPP, tarif kelas, denda, cicilan & metode",
        icon: CreditCard,
        badge: "Penting",
      }
    ]
  },
  {
    groupTitle: "KURIKULUM & PENILAIAN",
    items: [
      { id: "grading", label: "Penilaian & KKM", desc: "Batas KKM, bobot UTS/UAS & rapor", icon: Award }
    ]
  },
  {
    groupTitle: "OPERASIONAL & JADWAL",
    items: [
      { id: "attendance", label: "Mode Absensi & Face AI", desc: "Dual mode Face ID, toleransi & jam presensi", icon: ScanFace, badge: "AI Powered" },
      { id: "geofence", label: "Lokasi & Geofence GPS", desc: "Peta sekolah, koordinat & radius validasi", icon: Compass, badge: "GPS" },
      { id: "time_presets", label: "Template Jam & Sesi", desc: "Preset sesi jam pelajaran & ujian", icon: Clock }
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

  const { isSuperAdmin, isAdmin, isKepalaSekolah, rolePermissions, isAuthLoading } = useAuth();
  const canReadSettings = (isSuperAdmin || isAdmin || Boolean(rolePermissions?.settings?.read)) && (!isKepalaSekolah || Boolean(rolePermissions?.settings?.read));
  const canWriteSettings = (isSuperAdmin || isAdmin || Boolean(rolePermissions?.settings?.write)) && (!isKepalaSekolah || Boolean(rolePermissions?.settings?.write));

  const searchParams = useSearchParams();
  const tabParam = searchParams?.get("tab") as SettingCategory | null;

  const [activeTab, setActiveTab] = useState<SettingCategory>("profile");
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tabParam && ["profile", "academic_stage", "academic_year", "grading", "attendance", "geofence", "time_presets", "spp_config"].includes(tabParam)) {
      setActiveTab(tabParam as SettingCategory);
    }
  }, [tabParam]);

  // Modals state
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [selectedAuditLog, setSelectedAuditLog] = useState<any | null>(null);

  // School Profile Single Source of Truth
  const { 
    profile: globalSchoolProfile, 
    saveProfile: saveGlobalSchoolProfile, 
    resetToDefault: resetSchoolProfileDefault,
    currentStage,
    stageConfig,
    gradeLevels,
    majorOptions,
    setEducationalStage,
    addVocationalProgram,
    updateVocationalProgram,
    deleteVocationalProgram,
    resetVocationalProgramsToDefault
  } = useSchoolProfile();

  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  const [showCustomLogoUrl, setShowCustomLogoUrl] = useState(false);
  const [customLogoUrlInput, setCustomLogoUrlInput] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false);

  // Vocational Programs CRUD Modal State (for SMK)
  const [showVocationalModal, setShowVocationalModal] = useState(false);
  const [editingVocationalProgram, setEditingVocationalProgram] = useState<VocationalProgram | null>(null);
  const [vocationalForm, setVocationalForm] = useState<{
    code: string;
    name: string;
    field: string;
    headOfProgram: string;
    description: string;
    status: "Aktif" | "Non-Aktif";
  }>({
    code: "",
    name: "",
    field: "Teknologi Informasi & Komunikasi",
    headOfProgram: "",
    description: "",
    status: "Aktif"
  });
  const [savingVocational, setSavingVocational] = useState(false);
  const [vocationalSearch, setVocationalSearch] = useState("");
  const [vocationalFieldFilter, setVocationalFieldFilter] = useState("All");

  // Form State Definitions
  const [profile, setProfile] = useState<SchoolProfile>(() => {
    return {
      ...DEFAULT_SCHOOL_PROFILE,
      ...(globalSchoolProfile || {}),
    };
  });

  // Keep local profile state in sync when global profile loads or changes from Firestore
  useEffect(() => {
    if (globalSchoolProfile) {
      setProfile((prev) => ({
        ...prev,
        ...globalSchoolProfile,
        educationalStage: globalSchoolProfile.educationalStage || prev.educationalStage || "SMA",
        vocationalPrograms: Array.isArray(globalSchoolProfile.vocationalPrograms) && globalSchoolProfile.vocationalPrograms.length > 0
          ? globalSchoolProfile.vocationalPrograms
          : prev.vocationalPrograms,
        latitude: Number(globalSchoolProfile.latitude ?? prev.latitude ?? -6.200000),
        longitude: Number(globalSchoolProfile.longitude ?? prev.longitude ?? 106.816666),
        radiusMeters: Number(globalSchoolProfile.radiusMeters ?? prev.radiusMeters ?? 100),
      }));
    }
  }, [globalSchoolProfile]);

  // Handler to change Educational Stage
  const handleChangeStage = async (newStage: EducationalStage) => {
    const info = STAGE_CONFIGS[newStage];
    let correspondingType = profile.schoolType;
    if (newStage === "SD") correspondingType = "SD (Sekolah Dasar)";
    if (newStage === "SMP") correspondingType = "SMP (Sekolah Menengah Pertama)";
    if (newStage === "SMA") correspondingType = "SMA (Sekolah Menengah Atas)";
    if (newStage === "SMK") correspondingType = "SMK (Sekolah Menengah Kejuruan)";

    const updatedProfile = {
      ...profile,
      educationalStage: newStage,
      schoolType: correspondingType
    };
    setProfile(updatedProfile);

    await setEducationalStage(newStage);
    await saveGlobalSchoolProfile({
      educationalStage: newStage,
      schoolType: correspondingType
    });

    if (showSuccess) {
      showSuccess(
        `Jenjang berhasil dialihkan ke ${info.name} (${info.fullName}). Seluruh kelas, mata pelajaran, dan penilaian otomatis menyesuaikan!`,
        "Jenjang Sekolah Diperbarui"
      );
    }
  };

  // Vocational Program Modal Handlers
  const handleOpenAddVocational = () => {
    setEditingVocationalProgram(null);
    setVocationalForm({
      code: "",
      name: "",
      field: "Teknologi Informasi & Komunikasi",
      headOfProgram: "",
      description: "",
      status: "Aktif"
    });
    setShowVocationalModal(true);
  };

  const handleOpenEditVocational = (program: VocationalProgram) => {
    setEditingVocationalProgram(program);
    setVocationalForm({
      code: program.code,
      name: program.name,
      field: program.field || "Teknologi Informasi & Komunikasi",
      headOfProgram: program.headOfProgram || "",
      description: program.description || "",
      status: program.status || "Aktif"
    });
    setShowVocationalModal(true);
  };

  const handleSaveVocationalForm = async () => {
    if (!vocationalForm.code.trim() || !vocationalForm.name.trim()) {
      if (showError) showError("Kode dan Nama Jurusan wajib diisi!", "Validasi Gagal");
      return;
    }

    try {
      setSavingVocational(true);
      if (editingVocationalProgram) {
        await updateVocationalProgram(editingVocationalProgram.id, vocationalForm);
        if (showSuccess) showSuccess(`Program keahlian ${vocationalForm.code} berhasil diperbarui!`, "Berhasil Edit");
      } else {
        await addVocationalProgram(vocationalForm);
        if (showSuccess) showSuccess(`Program keahlian ${vocationalForm.code} berhasil ditambahkan!`, "Berhasil Tambah");
      }
      setShowVocationalModal(false);
    } catch (err: any) {
      if (showError) showError(err.message || "Gagal menyimpan jurusan", "Error");
    } finally {
      setSavingVocational(false);
    }
  };

  const handleDeleteVocational = async (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus program keahlian "${name}"? Data kelas dengan jurusan ini mungkin terpengaruh.`)) {
      await deleteVocationalProgram(id);
      if (showSuccess) showSuccess(`Program keahlian "${name}" berhasil dihapus.`, "Berhasil Hapus");
    }
  };

  const handleLoadPopularSMKPresets = async () => {
    if (confirm("Muat daftar 6 program keahlian / jurusan SMK populer (RPL, TKJ, DKV, AKL, MPLB, TKRO)?")) {
      await resetVocationalProgramsToDefault();
      if (showSuccess) showSuccess("Preset 6 jurusan SMK populer berhasil dimuat!", "Berhasil Muat Preset");
    }
  };

  const handleToggleVocationalStatus = async (program: VocationalProgram) => {
    const newStatus = program.status === "Aktif" ? "Non-Aktif" : "Aktif";
    await updateVocationalProgram(program.id, { status: newStatus });
    if (showSuccess) showSuccess(`Status program keahlian ${program.code} diubah menjadi ${newStatus}.`);
  };

  const filteredVocationalPrograms = useMemo(() => {
    const list = profile.vocationalPrograms || [];
    return list.filter((p) => {
      const q = vocationalSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        p.code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.headOfProgram && p.headOfProgram.toLowerCase().includes(q)) ||
        (p.field && p.field.toLowerCase().includes(q));
      const matchField = vocationalFieldFilter === "All" || p.field === vocationalFieldFilter;
      return matchSearch && matchField;
    });
  }, [profile.vocationalPrograms, vocationalSearch, vocationalFieldFilter]);

  const uniqueVocationalFields = useMemo(() => {
    const list = profile.vocationalPrograms || [];
    const fields = new Set<string>();
    list.forEach((p) => {
      if (p.field) fields.add(p.field);
    });
    return Array.from(fields);
  }, [profile.vocationalPrograms]);

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
    teacherAttendanceMode: "face_recognition" as "face_recognition" | "selfie_only",
    studentAttendanceMode: "face_recognition" as "face_recognition" | "selfie_only",
    attendanceMode: "face_recognition", // fallback alias
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
      } else if (tabParam === "geofence" || tabParam === "gps" || tabParam === "lokasi") {
        setActiveTab("geofence");
      }
      if (tabParam === "time_presets" || tabParam === "preset" || tabParam === "jam" || tabParam === "jadwal") {
        setActiveTab("time_presets");
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

  // Time Presets State & Handlers
  const {
    presets: timePresets,
    addPreset: addTimePreset,
    updatePreset: updateTimePreset,
    deletePreset: deleteTimePreset,
    resetToDefault: resetTimePresetsToDefault,
  } = useTimePresets();

  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [isAddingPreset, setIsAddingPreset] = useState(false);
  const [presetFormData, setPresetFormData] = useState({
    name: "",
    startTime: "07:00",
    endTime: "08:30",
    description: "",
  });
  const [savingPreset, setSavingPreset] = useState(false);

  const calculateDuration = (start: string, end: string) => {
    try {
      const [sh, sm] = start.split(":").map(Number);
      const [eh, em] = end.split(":").map(Number);
      const totalMinutes = eh * 60 + em - (sh * 60 + sm);
      if (totalMinutes <= 0) return "Waktu tidak valid";
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      if (h > 0 && m > 0) return `${h} jam ${m} mnt (${totalMinutes} mnt)`;
      if (h > 0) return `${h} jam (${totalMinutes} mnt)`;
      return `${m} Menit`;
    } catch {
      return "-";
    }
  };

  const handleStartAddPreset = () => {
    setEditingPresetId(null);
    setPresetFormData({
      name: `Sesi ${timePresets.length + 1}`,
      startTime: "07:00",
      endTime: "08:30",
      description: "",
    });
    setIsAddingPreset(true);
  };

  const handleStartEditPreset = (preset: TimePreset) => {
    setIsAddingPreset(false);
    setEditingPresetId(preset.id);
    setPresetFormData({
      name: preset.name,
      startTime: preset.startTime,
      endTime: preset.endTime,
      description: preset.description || "",
    });
  };

  const handleSavePreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!presetFormData.name.trim()) {
      if (showError) showError("Nama template sesi wajib diisi!");
      return;
    }
    if (!presetFormData.startTime || !presetFormData.endTime) {
      if (showError) showError("Jam mulai dan jam selesai wajib ditentukan!");
      return;
    }
    if (presetFormData.startTime >= presetFormData.endTime) {
      if (showError) showError("Jam mulai harus lebih awal dari jam selesai!");
      return;
    }

    setSavingPreset(true);
    try {
      if (editingPresetId) {
        await updateTimePreset(editingPresetId, {
          name: presetFormData.name.trim(),
          startTime: presetFormData.startTime,
          endTime: presetFormData.endTime,
          start: presetFormData.startTime,
          end: presetFormData.endTime,
          label: `${presetFormData.startTime} - ${presetFormData.endTime} (${presetFormData.name.trim()})`,
          description: presetFormData.description.trim(),
        });
        if (showSuccess) showSuccess("Template jam berhasil diperbarui!");
        setEditingPresetId(null);
      } else {
        await addTimePreset({
          name: presetFormData.name.trim(),
          startTime: presetFormData.startTime,
          endTime: presetFormData.endTime,
          description: presetFormData.description.trim(),
        });
        if (showSuccess) showSuccess("Template jam baru berhasil ditambahkan!");
        setIsAddingPreset(false);
      }
    } catch (err) {
      if (showError) showError("Gagal menyimpan template jam!");
    } finally {
      setSavingPreset(false);
    }
  };

  const handleDeletePreset = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus template jam "${name}"?`)) return;
    try {
      await deleteTimePreset(id);
      if (showSuccess) showSuccess(`Template jam "${name}" berhasil dihapus!`);
      if (editingPresetId === id) setEditingPresetId(null);
    } catch (err) {
      if (showError) showError("Gagal menghapus template jam!");
    }
  };

  const handleResetPresets = async () => {
    if (
      !confirm(
        "Kembalikan template jam ke 5 preset standar sistem (07:00–08:30, 08:30–10:00, 10:30–12:00, 13:00–14:30, 14:30–16:00)?"
      )
    ) {
      return;
    }
    try {
      await resetTimePresetsToDefault();
      if (showInfo) showInfo("Template jam berhasil direset ke standar!");
      setEditingPresetId(null);
      setIsAddingPreset(false);
    } catch (err) {
      if (showError) showError("Gagal mereset template jam!");
    }
  };

  // Handle Logo Upload from Local Device
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      if (showError) showError("Format file harus berupa gambar (PNG, JPG, WebP, SVG)!", "Format Salah");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      if (showError) showError("Ukuran gambar logo maksimal 3MB!", "File Terlalu Besar");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setProfile((prev) => ({ ...prev, logoUrl: dataUrl }));
        if (showSuccess) showSuccess("Logo baru dipilih. Klik 'Simpan Profil Sekolah' untuk memperbarui ke database.", "Logo Diperbarui");
      }
    };
    reader.readAsDataURL(file);
  };

  // Synchronize school address fields from GPS coordinates using reverse geocoding
  const handleSyncAddressFromCoordinates = async (customLat?: number, customLng?: number) => {
    const targetLat = Number(customLat ?? profile.latitude ?? attendance.schoolCenterLat ?? -6.200000);
    const targetLng = Number(customLng ?? profile.longitude ?? attendance.schoolCenterLng ?? 106.816666);

    if (isNaN(targetLat) || isNaN(targetLng) || (targetLat === 0 && targetLng === 0)) {
      if (showError) showError("Koordinat GPS tidak valid untuk mendeteksi alamat.", "Koordinat Kosong");
      return;
    }

    setIsGeocodingAddress(true);
    try {
      const geo = await reverseGeocodeGps(targetLat, targetLng);
      if (geo && (geo.street || geo.fullAddress)) {
        setProfile((prev) => ({
          ...prev,
          address: geo.street || geo.fullAddress,
          city: geo.city || prev.city,
          province: geo.province || prev.province,
          postalCode: geo.postalCode || prev.postalCode,
          locationAddress: geo.locationAddress || prev.locationAddress,
        }));
        if (showSuccess) {
          if (geo.hasRtRw) {
            showSuccess(
              `Alamat lengkap terdeteksi: ${geo.street}`,
              "Alamat Lengkap (RT/RW) Terdeteksi dari GPS"
            );
          } else {
            showSuccess(
              `Alamat terdeteksi: ${geo.street}. Anda dapat melengkapi RT/RW jika belum tercantum di data satelit.`,
              "Alamat Berhasil Disesuaikan dari GPS"
            );
          }
        }
      } else {
        if (showError) showError("Tidak dapat mendeteksi alamat jalan dari titik koordinat ini.", "Geocoding Gagal");
      }
    } catch (err: any) {
      console.error("Reverse geocoding error:", err);
      if (showError) showError("Gagal mengambil alamat dari GPS: " + (err.message || "Timeout"), "Error");
    } finally {
      setIsGeocodingAddress(false);
    }
  };

  // Detect current admin geolocation with two-tier fallback
  const handleDetectCurrentLocation = async () => {
    try {
      const res = await acquireCurrentLocation();
      const lat = res.lat;
      const lng = res.lng;
      setProfile((prev) => ({
        ...prev,
        latitude: lat,
        longitude: lng,
      }));
      setAttendance((prev) => ({
        ...prev,
        schoolCenterLat: lat,
        schoolCenterLng: lng,
        schoolLat: lat,
        schoolLng: lng,
      }));
      if (showSuccess) showSuccess(`Titik sekolah disesuaikan dengan koordinat GPS Anda: ${lat}, ${lng}`, "Lokasi GPS Terdeteksi");
      
      // Otomatis sinkronisasi alamat dari koordinat GPS yang baru terdeteksi
      await handleSyncAddressFromCoordinates(lat, lng);
    } catch (err: any) {
      const errMsg = err?.message || "Gagal mengambil lokasi GPS dari perangkat.";
      if (showError) showError(`${errMsg} ${err?.instruction || ""}`, err?.title || "GPS Gagal");
    }
  };

  // Dedicated Save Handler for School Profile as Single Source of Truth
  const handleSaveProfileOnly = async () => {
    setSavingProfile(true);
    const targetLat = Number(profile.latitude ?? attendance.schoolCenterLat ?? -6.200000);
    const targetLng = Number(profile.longitude ?? attendance.schoolCenterLng ?? 106.816666);
    const targetRadius = Number(profile.radiusMeters ?? attendance.geofenceRadiusMeters ?? 100);

    const profilePayload: SchoolProfile = {
      ...profile,
      educationalStage: profile.educationalStage || currentStage,
      vocationalPrograms: profile.vocationalPrograms || globalSchoolProfile?.vocationalPrograms || [],
      latitude: targetLat,
      longitude: targetLng,
      radiusMeters: targetRadius,
    };

    setProfile((prev) => ({ ...prev, latitude: targetLat, longitude: targetLng, radiusMeters: targetRadius }));
    setAttendance((prev) => ({
      ...prev,
      schoolCenterLat: targetLat,
      schoolCenterLng: targetLng,
      schoolLat: targetLat,
      schoolLng: targetLng,
      geofenceRadiusMeters: targetRadius,
      gpsRadiusMeter: targetRadius,
    }));

    try {
      const res = await saveGlobalSchoolProfile(profilePayload);
      if (res.success) {
        // Also ensure attendance_config in roles collection is updated
        try {
          await setDoc(
            doc(db, "roles", "attendance_config"),
            {
              schoolCenterLat: targetLat,
              schoolCenterLng: targetLng,
              schoolLat: targetLat,
              schoolLng: targetLng,
              geofenceRadiusMeters: targetRadius,
              gpsRadiusMeter: targetRadius,
              address: profilePayload.address,
              schoolAddress: profilePayload.address,
              locationAddress: profilePayload.locationAddress,
              geofenceCenter: {
                lat: targetLat,
                lng: targetLng,
                radiusMeters: targetRadius,
                address: profilePayload.address || profilePayload.locationAddress || "Area Utama Sekolah",
              },
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (e) {}

        // Also ensure teacher_attendance_config in roles collection is updated
        try {
          await setDoc(
            doc(db, "roles", "teacher_attendance_config"),
            {
              geofenceCenter: {
                lat: targetLat,
                lng: targetLng,
                radiusMeters: targetRadius,
                address: profilePayload.address || profilePayload.locationAddress || "Area Utama Sekolah",
              },
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (e) {}

        if (showSuccess) showSuccess("Profil & identitas sekolah serta titik koordinat tersimpan ke database!", "Profil Berhasil Disimpan");
      } else {
        if (showError) showError(res.error || "Gagal menyimpan profil sekolah", "Error");
      }
    } catch (err: any) {
      if (showError) showError(err.message || "Gagal menyimpan profil", "Error");
    } finally {
      setSavingProfile(false);
    }
  };

  // Dedicated Save Handler for Attendance & Geofencing Settings
  const handleSaveAttendanceConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingAttendance(true);

    // Prioritize coordinates from attendance (which user just modified on the map/inputs in this tab)
    const targetLat = Number(
      attendance.schoolCenterLat ?? 
      attendance.schoolLat ?? 
      profile.latitude ?? 
      -6.200000
    );
    const targetLng = Number(
      attendance.schoolCenterLng ?? 
      attendance.schoolLng ?? 
      profile.longitude ?? 
      106.816666
    );
    const targetRadius = Number(
      attendance.geofenceRadiusMeters ?? 
      attendance.gpsRadiusMeter ?? 
      profile.radiusMeters ?? 
      100
    );

    const teacherMode = attendance.teacherAttendanceMode || "face_recognition";
    const studentMode = attendance.studentAttendanceMode || "face_recognition";

    const schoolAddr = profile.address || profile.locationAddress || "Area Utama Sekolah";
    const payload = {
      ...attendance,
      teacherAttendanceMode: teacherMode,
      studentAttendanceMode: studentMode,
      attendanceMode: studentMode, // fallback alias
      minFaceMatchScore: Number(attendance.minFaceMatchScore ?? 80),
      requireLiveness: Boolean(attendance.requireLiveness),
      schoolCenterLat: targetLat,
      schoolCenterLng: targetLng,
      schoolLat: targetLat,
      schoolLng: targetLng,
      geofenceRadiusMeters: targetRadius,
      gpsRadiusMeter: targetRadius,
      address: profile.address || "",
      schoolAddress: schoolAddr,
      locationAddress: profile.locationAddress || "",
      geofenceCenter: {
        lat: targetLat,
        lng: targetLng,
        radiusMeters: targetRadius,
        address: schoolAddr,
      },
      schoolStartTime: attendance.schoolStartTime || attendance.checkInStart || "07:00",
      lateToleranceMinutes: Number(attendance.lateToleranceMinutes || attendance.lateToleranceMin || 15),
      absentThresholdTime: attendance.absentThresholdTime || attendance.autoAbsentTime || "09:00",
      schoolEndTime: attendance.schoolEndTime || attendance.checkOutEnd || "15:00",
      updatedAt: new Date().toISOString(),
      updatedBy: auth.currentUser?.email || "Admin",
    };

    // Keep both local states in sync immediately so UI does not revert
    setAttendance((prev) => ({
      ...prev,
      ...payload,
    }));
    setProfile((prev) => ({
      ...prev,
      latitude: targetLat,
      longitude: targetLng,
      radiusMeters: targetRadius,
    }));

    try {
      // 1. Primary allowed store in Firestore (roles/attendance_config)
      await setDoc(doc(db, "roles", "attendance_config"), payload, { merge: true });

      // 2. Also update profile location in global store (roles/school_profile & settings/school_profile)
      await saveGlobalSchoolProfile({
        latitude: targetLat,
        longitude: targetLng,
        radiusMeters: targetRadius,
        address: profile.address,
        locationAddress: profile.locationAddress,
      });

      // 3. Client-side localStorage persistence
      try {
        localStorage.setItem("quick_schools_attendance_config", JSON.stringify(payload));
        localStorage.setItem("smart_school_teacher_attendance_config_v1", JSON.stringify({
          attendanceMode: teacherMode,
          minFaceMatchScore: Number(attendance.minFaceMatchScore ?? 80),
          requireLiveness: Boolean(attendance.requireLiveness),
          geofenceEnabled: Boolean(attendance.requireRadius),
          geofenceCenter: {
            lat: targetLat,
            lng: targetLng,
            radiusMeters: targetRadius,
            address: schoolAddr,
          },
          standardClockIn: attendance.schoolStartTime || "07:00",
          standardClockOut: attendance.schoolEndTime || "15:30",
        }));
      } catch (e) {}

      // 4. Background attempt to attendance_config/general
      try {
        await setDoc(doc(db, "attendance_config", "general"), payload, { merge: true });
      } catch (e) {}

      // 5. Also sync to teacher attendance config
      try {
        await setDoc(
          doc(db, "roles", "teacher_attendance_config"),
          {
            attendanceMode: teacherMode,
            requirePhoto: true,
            minFaceMatchScore: Number(attendance.minFaceMatchScore ?? 80),
            requireLiveness: Boolean(attendance.requireLiveness),
            geofenceEnabled: Boolean(attendance.requireRadius),
            geofenceCenter: {
              lat: targetLat,
              lng: targetLng,
              radiusMeters: targetRadius,
              address: schoolAddr,
            },
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (e) {}

      if (showSuccess) showSuccess("Pengaturan absensi & geofence GPS berhasil diperbarui!", "Pengaturan Tersimpan");
    } catch (err: any) {
      console.error("Save attendance error:", err);
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

  // Save All Settings Handler
  const handleSaveSettings = async () => {
    if (!canWriteSettings) {
      if (showError) showError("Anda hanya memiliki izin melihat. Perubahan konfigurasi tidak diizinkan.", "Akses Ditolak");
      return;
    }
    setSaving(true);
    const targetLat = Number(
      attendance.schoolCenterLat ?? 
      attendance.schoolLat ?? 
      profile.latitude ?? 
      -6.200000
    );
    const targetLng = Number(
      attendance.schoolCenterLng ?? 
      attendance.schoolLng ?? 
      profile.longitude ?? 
      106.816666
    );
    const targetRadius = Number(
      attendance.geofenceRadiusMeters ?? 
      attendance.gpsRadiusMeter ?? 
      profile.radiusMeters ?? 
      100
    );

    const profilePayload: SchoolProfile = {
      ...profile,
      educationalStage: profile.educationalStage || currentStage,
      vocationalPrograms: profile.vocationalPrograms || globalSchoolProfile?.vocationalPrograms || [],
      latitude: targetLat,
      longitude: targetLng,
      radiusMeters: targetRadius,
    };

    const attendancePayload = {
      ...attendance,
      schoolCenterLat: targetLat,
      schoolCenterLng: targetLng,
      geofenceRadiusMeters: targetRadius,
      schoolLat: targetLat,
      schoolLng: targetLng,
      gpsRadiusMeter: targetRadius,
      schoolStartTime: attendance.schoolStartTime || attendance.checkInStart || "07:00",
      lateToleranceMinutes: Number(attendance.lateToleranceMinutes || attendance.lateToleranceMin || 15),
      absentThresholdTime: attendance.absentThresholdTime || attendance.autoAbsentTime || "09:00",
      schoolEndTime: attendance.schoolEndTime || attendance.checkOutEnd || "15:00",
      updatedAt: new Date().toISOString(),
      updatedBy: auth.currentUser?.email || "Admin",
    };

    try {
      // 1. Save global school profile (syncs to roles/school_profile, settings/school_profile, attendance_config & localStorage)
      await saveGlobalSchoolProfile(profilePayload);

      // 2. Always persist attendance config to allowed store
      await setDoc(doc(db, "roles", "attendance_config"), attendancePayload, { merge: true });
      try {
        localStorage.setItem("quick_schools_attendance_config", JSON.stringify(attendancePayload));
      } catch (e) {}

      // 3. Try settings document in background
      try {
        await setDoc(doc(db, "settings", "school_configuration"), {
          profile: profilePayload,
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
      if (showSuccess) showSuccess("Semua konfigurasi sekolah, profil & absensi berhasil diperbarui!", "Pengaturan Tersimpan");
    } catch (err) {
      console.error("Save settings error:", err);
      setSaving(false);
      if (showSuccess) showSuccess("Konfigurasi sekolah tersimpan!", "Pengaturan Tersimpan");
    }
  };

  if (!isAuthLoading && !canReadSettings) {
    return (
      <div className="p-6 md:p-12 max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl border border-red-100 p-8 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Akses Terbatas</h2>
          <p className="text-sm text-gray-600 max-w-md mx-auto mb-6">
            Anda tidak memiliki izin untuk mengakses Pengaturan Sistem. Halaman ini hanya dapat diakses oleh Administrator sekolah atau pengguna yang diberikan izin khusus.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#531FFF] text-white text-sm font-semibold rounded-xl hover:bg-[#4316D0] transition-colors"
          >
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto w-full space-y-6 animate-in fade-in duration-300">
      
      {!canWriteSettings && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-medium shadow-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            <strong>Mode Pemantauan (Hanya Lihat):</strong> Anda memiliki hak akses untuk meninjau konfigurasi sistem, namun tidak diizinkan menambah, mengubah, atau menghapus pengaturan kecuali diberikan izin khusus oleh Administrator.
          </span>
        </div>
      )}

      {/* Top Main Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                Pusat Konfigurasi Sekolah <span className="text-xs px-2.5 py-0.5 font-bold bg-[#F3F0FF] text-[#531FFF] rounded-full border border-[#531FFF]/20">{canWriteSettings ? "Enterprise Admin" : "Monitoring Mode"}</span>
              </h1>
              <p className="text-sm text-gray-500 font-medium mt-0.5">
                Kelola profil, struktur akademik, absensi geofence, kurikulum, penilaian, dan keamanan Smart School OS.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Header Buttons */}
        <div className="flex items-center gap-3">
          {canWriteSettings && (
            <button
              onClick={() => {
                if (showInfo) showInfo("Formulir pengaturan diset ulang ke nilai semula", "Reset Default");
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 active:scale-[0.98] transition-all text-xs font-bold shadow-xs cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-gray-500" />
              Reset
            </button>
          )}

          {canWriteSettings ? (
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#531FFF] to-[#7B42FF] text-white rounded-lg hover:shadow-lg hover:shadow-[#531FFF]/25 active:scale-[0.98] transition-all text-xs font-extrabold shadow-sm cursor-pointer border border-white/20 disabled:opacity-50"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Save className="w-4 h-4 text-white" />
              )}
              <span>Simpan Perubahan</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-200 text-gray-500 rounded-lg text-xs font-bold">
              <span>Read-Only</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Settings Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side Settings Navigation (4 Columns) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-5 sticky top-6">
          
          {/* Search Settings Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Cari pengaturan (contoh: KKM, GPS, Logo)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
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
                          "w-full text-left p-3 rounded-lg transition-all flex items-center justify-between group cursor-pointer border",
                          isActive 
                            ? "bg-[#F3F0FF] text-[#531FFF] border-[#531FFF]/30 shadow-xs font-bold" 
                            : "bg-white text-gray-700 border-transparent hover:bg-gray-50 hover:border-gray-100"
                        )}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105",
                            isActive ? "bg-[#531FFF] text-white border-transparent" : "bg-gray-100 text-gray-500 border-gray-200"
                          )}>
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-bold truncate flex items-center gap-2">
                              {item.label}
                              {item.badge && (
                                <span className="px-1.5 py-0.2 text-[9px] font-extrabold bg-amber-100 text-amber-800 rounded">
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
          
          {/* TAB 1: School Profile (Single Source of Truth) */}
          {activeTab === "profile" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Header Banner - Clean 2-Row Architecture */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.04)] space-y-4">
                {/* Top Row: Icon, Title, Status & Quick Info Chip */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#531FFF] to-[#7B42FF] text-white flex items-center justify-center font-bold shadow-md shadow-[#531FFF]/20 shrink-0 mt-0.5 sm:mt-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                          Profil &amp; Identitas Sekolah
                        </h2>
                        <span className="px-2.5 py-0.5 text-[11px] font-extrabold bg-indigo-50 text-[#531FFF] rounded-full border border-indigo-200 flex items-center gap-1.5 shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Single Source of Truth
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1 leading-relaxed">
                        Seluruh data identitas, kontak, logo resmi, dan titik koordinat sekolah terhubung langsung ke database dan otomatis disinkronkan ke seluruh modul sistem.
                      </p>
                    </div>
                  </div>

                  {/* NPSN & Akreditasi Quick Chip */}
                  <div className="hidden lg:flex items-center gap-2 self-start lg:self-center shrink-0">
                    <div className="px-3.5 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-2 text-xs">
                      <span className="text-gray-400 font-medium">NPSN:</span>
                      <strong className="text-gray-900 font-mono font-bold">{profile.npsn || "Terdaftar"}</strong>
                      <span className="text-gray-300">•</span>
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[10px]">
                        Akreditasi {profile.accreditation || "A"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Row / Toolbar: Helper Info on Left + Action Buttons on Right */}
                <div className="pt-3.5 border-t border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-50 text-amber-600 text-[11px] font-bold shrink-0">
                      💡
                    </span>
                    <span className="line-clamp-1">
                      Data ini otomatis digunakan resmi pada kop dokumen rapor, kartu pelajar, tagihan SPP, dan kuitansi pembayaran.
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm("Kembalikan seluruh data profil sekolah ke nilai standar default?")) {
                          await resetSchoolProfileDefault();
                          if (showInfo) showInfo("Profil sekolah direset ke default sistem.", "Reset Selesai");
                        }
                      }}
                      className="px-3.5 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
                      <span>Reset Default</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveProfileOnly}
                      disabled={savingProfile}
                      className="px-4 py-2 bg-gradient-to-r from-[#531FFF] to-[#7B42FF] text-white hover:shadow-lg hover:shadow-[#531FFF]/25 active:scale-[0.98] text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-md shadow-[#531FFF]/25 disabled:opacity-50"
                    >
                      {savingProfile ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5 text-white" />
                          <span>Simpan Profil Sekolah</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* CARD 1: Logo Resmi & Brand Identity */}
              <div className="bg-white p-6 md:p-8 rounded-xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-4">
                <div className="border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#531FFF]" />
                    Logo Resmi Instansi
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Logo ini akan otomatis tampil pada kop rapor digital, nota pembayaran, halaman login, dan sidebar sistem.
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-gray-50/80 border border-gray-200/80 flex flex-col sm:flex-row items-center gap-6">
                  {/* Logo Display */}
                  <div className="w-24 h-24 rounded-2xl bg-white overflow-hidden relative shrink-0 border-2 border-gray-200 shadow-md flex items-center justify-center p-2">
                    {profile.logoUrl ? (
                      <Image 
                        src={profile.logoUrl} 
                        alt="Logo Sekolah" 
                        fill 
                        className="object-contain p-2" 
                        unoptimized 
                      />
                    ) : (
                      <SchoolIcon className="w-10 h-10 text-gray-400" />
                    )}
                  </div>

                  {/* Logo Actions */}
                  <div className="space-y-2 text-center sm:text-left flex-1">
                    <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                      <span className="text-xs font-bold text-gray-900">Format yang didukung:</span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-purple-100/80 text-[#531FFF] font-bold">PNG</span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-purple-100/80 text-[#531FFF] font-bold">JPG / JPEG</span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-purple-100/80 text-[#531FFF] font-bold">SVG</span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-purple-100/80 text-[#531FFF] font-bold">WebP</span>
                      <span className="text-[11px] text-gray-400 font-medium">(Maksimal 3MB)</span>
                    </div>

                    <p className="text-xs text-gray-500">
                      Disarankan menggunakan gambar rasio 1:1 (bujur sangkar) dengan latar belakang transparan.
                    </p>

                    {/* Hidden input for local file upload */}
                    <input 
                      type="file" 
                      ref={logoFileInputRef}
                      accept="image/png, image/jpeg, image/webp, image/svg+xml"
                      onChange={handleLogoUpload}
                      className="hidden" 
                    />

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1.5">
                      <button 
                        type="button"
                        onClick={() => logoFileInputRef.current?.click()}
                        className="px-3.5 py-2 bg-[#531FFF] text-white rounded-lg text-xs font-bold hover:bg-[#4317CC] transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                      >
                        <Upload className="w-3.5 h-3.5" /> 
                        Unggah Logo Baru
                      </button>

                      <button 
                        type="button"
                        onClick={() => setShowCustomLogoUrl(!showCustomLogoUrl)}
                        className="px-3.5 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-100 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Globe className="w-3.5 h-3.5 text-gray-500" />
                        Gunakan URL Web
                      </button>

                      <button 
                        type="button"
                        onClick={() => {
                          setProfile((prev) => ({ ...prev, logoUrl: DEFAULT_SCHOOL_PROFILE.logoUrl }));
                          if (showInfo) showInfo("Logo dikembalikan ke logo default.", "Reset Logo");
                        }}
                        className="px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-100 transition-all cursor-pointer"
                      >
                        Default
                      </button>

                      <button 
                        type="button"
                        onClick={() => {
                          setProfile((prev) => ({ ...prev, logoUrl: "" }));
                          if (showInfo) showInfo("Logo dihapus. Simpan untuk menerapkan.", "Hapus Logo");
                        }}
                        className="px-3 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                      >
                        Hapus
                      </button>
                    </div>

                    {/* URL Input Bar */}
                    {showCustomLogoUrl && (
                      <div className="mt-3 flex items-center gap-2 pt-2 border-t border-gray-200/80 animate-in fade-in duration-200">
                        <input
                          type="url"
                          placeholder="https://domain-sekolah.sch.id/logo.png"
                          value={customLogoUrlInput}
                          onChange={(e) => setCustomLogoUrlInput(e.target.value)}
                          className="flex-1 px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!customLogoUrlInput.trim()) return;
                            setProfile((prev) => ({ ...prev, logoUrl: customLogoUrlInput.trim() }));
                            setShowCustomLogoUrl(false);
                            setCustomLogoUrlInput("");
                            if (showSuccess) showSuccess("URL logo diterapkan.", "Logo Diperbarui");
                          }}
                          className="px-3 py-1.5 bg-[#531FFF] text-white text-xs font-bold rounded-lg hover:bg-[#4317CC] transition-all cursor-pointer"
                        >
                          Terapkan
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* CARD 2: Identitas Legalitas, Kontak & Pimpinan */}
              <div className="bg-white p-6 md:p-8 rounded-xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-6">
                
                {/* Subsection A: Legalitas Sekolah */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                    <SchoolIcon className="w-4 h-4 text-[#531FFF]" />
                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                      Identitas Legalitas & Satuan Pendidikan
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-medium">
                    <div className="lg:col-span-2">
                      <label className="block text-gray-700 font-bold mb-1.5">
                        Nama Sekolah Resmi <span className="text-rose-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        value={profile.schoolName}
                        onChange={(e) => setProfile({ ...profile, schoolName: e.target.value })}
                        placeholder="Contoh: SMA Garuda Nusantara Smart School"
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] font-bold text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-1.5">Kode Instansi Sekolah</label>
                      <input 
                        type="text" 
                        value={profile.schoolCode}
                        onChange={(e) => setProfile({ ...profile, schoolCode: e.target.value })}
                        placeholder="Contoh: SCH-GNS-2026"
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] font-mono text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-1.5">
                        NPSN (Nomor Pokok Sekolah Nasional) <span className="text-rose-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        value={profile.npsn}
                        onChange={(e) => setProfile({ ...profile, npsn: e.target.value })}
                        placeholder="Contoh: 20194820"
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] font-mono font-bold text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-1.5">Bentuk / Jenjang Satuan</label>
                      <select 
                        value={profile.schoolType}
                        onChange={(e) => setProfile({ ...profile, schoolType: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] font-bold text-gray-900 cursor-pointer"
                      >
                        <option value="SMA / Nasional Plus">SMA / Nasional Plus</option>
                        <option value="SMA (Sekolah Menengah Atas)">SMA (Sekolah Menengah Atas)</option>
                        <option value="SMK (Sekolah Menengah Kejuruan)">SMK (Sekolah Menengah Kejuruan)</option>
                        <option value="MA (Madrasah Aliyah)">MA (Madrasah Aliyah)</option>
                        <option value="SMP (Sekolah Menengah Pertama)">SMP (Sekolah Menengah Pertama)</option>
                        <option value="MTs (Madrasah Tsanawiyah)">MTs (Madrasah Tsanawiyah)</option>
                        <option value="SD (Sekolah Dasar)">SD (Sekolah Dasar)</option>
                        <option value="MI (Madrasah Ibtidaiyah)">MI (Madrasah Ibtidaiyah)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-1.5">Status Akreditasi BAN-S/M</label>
                      <select 
                        value={profile.accreditation}
                        onChange={(e) => setProfile({ ...profile, accreditation: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] font-bold text-gray-900 cursor-pointer"
                      >
                        <option value="A (Sangat Baik / Unggul)">A (Sangat Baik / Unggul)</option>
                        <option value="B (Baik)">B (Baik)</option>
                        <option value="C (Cukup)">C (Cukup)</option>
                        <option value="Belum Terakreditasi">Belum Terakreditasi</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Subsection B: Kontak & Saluran Komunikasi */}
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                    <Phone className="w-4 h-4 text-[#531FFF]" />
                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                      Kontak & Saluran Komunikasi Resmi
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-medium">
                    <div>
                      <label className="block text-gray-700 font-bold mb-1.5 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        Nomor Telepon
                      </label>
                      <input 
                        type="text" 
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        placeholder="+62 21 7890-1234"
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] text-gray-900 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-1.5 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        Email Resmi
                      </label>
                      <input 
                        type="email" 
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        placeholder="info@sekolah.sch.id"
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-1.5 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-gray-400" />
                        Website Resmi
                      </label>
                      <input 
                        type="url" 
                        value={profile.website}
                        onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                        placeholder="https://sekolah.sch.id"
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-1.5 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        Jam Operasional
                      </label>
                      <input 
                        type="text" 
                        value={profile.operatingHours}
                        onChange={(e) => setProfile({ ...profile, operatingHours: e.target.value })}
                        placeholder="06:30 - 16:00 WIB"
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] text-gray-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Subsection C: Alamat Domisili Sekolah (Berdasarkan Titik Maps) */}
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                          Alamat Domisili Sekolah (Titik Maps)
                        </h3>
                        <p className="text-[11px] text-gray-500 font-medium">
                          Alamat sekolah ditentukan langsung dari titik koordinat peta &amp; GPS (tanpa input teks manual).
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <button
                        type="button"
                        onClick={handleDetectCurrentLocation}
                        className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 border border-emerald-200 shadow-2xs active:scale-95"
                        title="Gunakan koordinat GPS perangkat saya saat ini dan sinkronkan alamat"
                      >
                        <Compass className="w-3.5 h-3.5 text-emerald-600" />
                        Deteksi Lokasi Saya
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSyncAddressFromCoordinates()}
                        disabled={isGeocodingAddress}
                        className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-[#531FFF] text-xs font-bold rounded-lg border border-purple-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95 disabled:opacity-50"
                        title="Perbarui alamat otomatis dari koordinat peta"
                      >
                        <RefreshCw className={cn("w-3.5 h-3.5", isGeocodingAddress && "animate-spin")} />
                        {isGeocodingAddress ? "Menyesuaikan..." : "Perbarui Alamat"}
                      </button>

                      <span className="font-mono text-gray-800 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold">
                        {Number(profile.latitude).toFixed(5)}, {Number(profile.longitude).toFixed(5)}
                      </span>
                    </div>
                  </div>

                  {/* Leaflet Interactive Map View - Pure Point Picker */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-[11px] text-gray-500 flex items-center gap-1.5">
                        <Navigation className="w-3.5 h-3.5 text-[#531FFF]" />
                        Klik pada peta atau seret marker sekolah (🏫) untuk menentukan titik lokasi alamat sekolah.
                      </span>
                    </div>

                    <AttendanceGeofenceMap
                      centerLat={Number(profile.latitude || -6.200000)}
                      centerLng={Number(profile.longitude || 106.816666)}
                      radius={Number(profile.radiusMeters || 100)}
                      showRadiusCircle={false}
                      interactive={true}
                      onLocationChange={(lat, lng) => {
                        setProfile((prev) => ({
                          ...prev,
                          latitude: lat,
                          longitude: lng,
                        }));
                        setAttendance((prev) => ({
                          ...prev,
                          schoolCenterLat: lat,
                          schoolCenterLng: lng,
                          schoolLat: lat,
                          schoolLng: lng,
                        }));
                        handleSyncAddressFromCoordinates(lat, lng);
                      }}
                      height="380px"
                    />
                  </div>

                  {/* Tampilan Hasil Alamat Otomatis Berdasarkan Titik Maps */}
                  <div className="p-4 bg-gray-50/90 rounded-xl border border-gray-200/80 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5 flex-1">
                        <span className="text-[10px] uppercase tracking-wider text-gray-400 font-extrabold block">
                          Alamat Domisili Sekolah (Hasil Titik Peta &amp; GPS):
                        </span>
                        <p className="text-xs font-bold text-gray-900 leading-relaxed">
                          📍 {profile.address || "Geser pin pada peta untuk menentukan alamat sekolah secara otomatis."}
                        </p>
                      </div>
                    </div>

                    {/* Derived Address Badges (Read-Only) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-gray-200/60 text-xs">
                      <div className="p-2.5 bg-white rounded-lg border border-gray-200/60 shadow-2xs">
                        <span className="text-[10px] text-gray-400 font-bold block">Kota / Kabupaten</span>
                        <span className="font-extrabold text-gray-800 text-xs truncate block">{profile.city || "-"}</span>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-gray-200/60 shadow-2xs">
                        <span className="text-[10px] text-gray-400 font-bold block">Provinsi</span>
                        <span className="font-extrabold text-gray-800 text-xs truncate block">{profile.province || "-"}</span>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-gray-200/60 shadow-2xs">
                        <span className="text-[10px] text-gray-400 font-bold block">Kode Pos</span>
                        <span className="font-mono font-extrabold text-gray-800 text-xs block">{profile.postalCode || "-"}</span>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-gray-200/60 shadow-2xs">
                        <span className="text-[10px] text-gray-400 font-bold block">Titik Koordinat GPS</span>
                        <span className="font-mono font-bold text-emerald-700 text-[11px] block">
                          {Number(profile.latitude).toFixed(5)}, {Number(profile.longitude).toFixed(5)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-gray-400">
                      <span>💡 Koordinat otomatis diperbarui saat pin digeser atau menekan &quot;Deteksi Lokasi Saya&quot;.</span>
                      <span className="font-medium text-gray-500">
                        Batas radius geofence diatur pada tab <strong>Geofence Absensi</strong>.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Subsection D: Pimpinan & Profil Singkat Lembaga */}
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                    <UserCog className="w-4 h-4 text-[#531FFF]" />
                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                      Pimpinan Instansi & Profil Lembaga
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
                    <div>
                      <label className="block text-gray-700 font-bold mb-1.5">
                        Nama Kepala Sekolah Lengkap & Gelar <span className="text-rose-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        value={profile.principalName}
                        onChange={(e) => setProfile({ ...profile, principalName: e.target.value })}
                        placeholder="Dr. Danur Adhi, M.Pd"
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] font-bold text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-1.5">NIP Kepala Sekolah</label>
                      <input 
                        type="text" 
                        value={profile.principalNip}
                        onChange={(e) => setProfile({ ...profile, principalNip: e.target.value })}
                        placeholder="19750812 200003 1 002"
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] font-mono text-gray-900"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-gray-700 font-bold mb-1.5">Deskripsi / Visi Misi / Slogan Sekolah</label>
                      <textarea 
                        rows={2}
                        value={profile.description}
                        onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                        placeholder="Pusat keunggulan pendidikan berbasis teknologi AI, biometrik, dan kepemimpinan berkarakter."
                        className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] text-gray-900 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Titik lokasi maps dan profil sekolah akan otomatis terhubung ke seluruh sistem absensi.</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveProfileOnly}
                    disabled={savingProfile}
                    className="px-6 py-3 bg-gradient-to-r from-[#531FFF] to-[#7B42FF] text-white hover:shadow-lg hover:shadow-[#531FFF]/25 active:scale-[0.98] text-xs font-extrabold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {savingProfile ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Menyimpan ke Database...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Simpan Data Profil &amp; Lokasi Sekolah
                      </>
                    )}
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* TAB 1.5: Educational Stage & Vocational Programs (SD, SMP, SMA, SMK) */}
          {activeTab === "academic_stage" && (
            <div className="space-y-8 animate-in fade-in duration-300">
              
              {/* ================= HERO HEADER & LIVE STATUS KPI STRIP ================= */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.04)] overflow-hidden">
                <div className="h-1.5 w-full bg-gradient-to-r from-[#531FFF] via-[#8B5CF6] to-pink-500" />
                
                <div className="p-5 sm:p-6 space-y-4">
                  {/* Top Row: Icon, Title, Status & Stage Quick Chip */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#531FFF] to-[#7B42FF] text-white flex items-center justify-center font-bold shadow-md shadow-[#531FFF]/20 shrink-0 mt-0.5 sm:mt-0">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                            Jenjang Pendidikan &amp; Struktur Kurikulum
                          </h2>
                          <span className="px-2.5 py-0.5 text-[11px] font-extrabold bg-purple-50 text-[#531FFF] rounded-full border border-purple-200/80 flex items-center gap-1.5 shadow-2xs shrink-0">
                            <Sparkles className="w-3.5 h-3.5 text-[#531FFF]" />
                            Konfigurasi Master Sekolah
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1 leading-relaxed">
                          Pilihan jenjang satuan pendidikan (SD, SMP, SMA, SMK) secara dinamis menyelaraskan rombel kelas, kurikulum mata pelajaran, standar ketuntasan (KKM), dan jurusan.
                        </p>
                      </div>
                    </div>

                    {/* Active Stage Indicator Chip */}
                    <div className="hidden lg:flex items-center gap-2 self-start lg:self-center shrink-0">
                      <div className="px-3.5 py-1.5 bg-purple-50/70 border border-purple-200/80 rounded-xl flex items-center gap-2 text-xs">
                        <span className="text-purple-600 font-medium">Jenjang Aktif:</span>
                        <strong className="text-purple-950 font-black text-xs">{stageConfig.id}</strong>
                        <span className="text-purple-300">•</span>
                        <span className="text-[#531FFF] font-extrabold text-[11px]">
                          {stageConfig.name}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row / Toolbar: Helper Info on Left + Action Buttons on Right */}
                  <div className="pt-3.5 border-t border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-50 text-amber-600 text-[11px] font-bold shrink-0">
                        💡
                      </span>
                      <span className="line-clamp-1">
                        Perubahan jenjang otomatis menyelaraskan tingkat kelas dan kurikulum mata pelajaran di seluruh modul.
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
                      <button
                        type="button"
                        onClick={handleSaveProfileOnly}
                        disabled={savingProfile}
                        className="px-4 py-2 bg-gradient-to-r from-[#531FFF] to-[#7B42FF] text-white hover:shadow-lg hover:shadow-[#531FFF]/25 active:scale-[0.98] text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-md shadow-[#531FFF]/25 disabled:opacity-50"
                      >
                        {savingProfile ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                            <span>Menyimpan...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5 text-white" />
                            <span>Simpan Konfigurasi Jenjang</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 4 Live Summary KPI Tiles */}
                  <div>
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      Ringkasan Status Jenjang Sekolah Aktif
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                      {/* KPI 1: Jenjang Aktif */}
                      <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50/60 to-white border border-purple-100 shadow-2xs flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-white border border-purple-200 flex items-center justify-center text-[#531FFF] font-black text-base shadow-xs shrink-0">
                          {stageConfig.id}
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                            Satuan Pendidikan
                          </span>
                          <span className="text-sm font-black text-gray-900 block truncate">
                            Jenjang {stageConfig.name}
                          </span>
                          <span className="text-[11px] text-[#531FFF] font-bold block truncate">
                            {stageConfig.fullName}
                          </span>
                        </div>
                      </div>

                      {/* KPI 2: Rentang Rombel */}
                      <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-200/70 shadow-2xs flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-blue-600 font-bold shadow-xs shrink-0">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                            Rombongan Belajar
                          </span>
                          <span className="text-sm font-black text-gray-900 block truncate">
                            {stageConfig.levelRange}
                          </span>
                          <span className="text-[11px] text-gray-500 font-medium block truncate">
                            {gradeLevels.length} Tingkat Kelas Aktif
                          </span>
                        </div>
                      </div>

                      {/* KPI 3: Standar KKM */}
                      <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 shadow-2xs flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-white border border-emerald-200 flex items-center justify-center text-emerald-600 font-bold shadow-xs shrink-0">
                          <Award className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                            Standar Ketuntasan
                          </span>
                          <span className="text-sm font-black text-emerald-800 block truncate">
                            KKM {stageConfig.defaultKkm} Poin
                          </span>
                          <span className="text-[11px] text-emerald-600 font-medium block truncate">
                            Rujukan Baku Buku Nilai
                          </span>
                        </div>
                      </div>

                      {/* KPI 4: Model Peminatan / Jurusan */}
                      <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-100 shadow-2xs flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-white border border-amber-200 flex items-center justify-center text-amber-600 font-bold shadow-xs shrink-0">
                          <Briefcase className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                            Struktur Jurusan
                          </span>
                          <span className="text-sm font-black text-amber-900 block truncate">
                            {currentStage === "SMK"
                              ? `${(profile.vocationalPrograms || []).length} Program Keahlian`
                              : currentStage === "SMA"
                              ? "3 Peminatan Akademik"
                              : "Kelas Reguler Terpadu"}
                          </span>
                          <span className="text-[11px] text-amber-700 font-medium block truncate">
                            {currentStage === "SMK"
                              ? `${(profile.vocationalPrograms || []).filter(p => p.status === "Aktif").length} Jurusan Aktif`
                              : currentStage === "SMA"
                              ? "MIPA, IPS, & Bahasa"
                              : "Tanpa Penjurusan Khusus"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ================= SECTION 1: 4 INTERACTIVE STAGE SELECTOR CARDS ================= */}
              <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black bg-purple-100 text-[#531FFF]">
                        Langkah 1
                      </span>
                      <h3 className="text-base font-black text-gray-900 tracking-tight">
                        Pilih Satuan Pendidikan Sekolah
                      </h3>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Klik salah satu kartu jenjang di bawah ini untuk mengubah konfigurasi utama sistem secara instan.
                    </p>
                  </div>

                  <span className="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200/60 self-start sm:self-auto">
                    4 Jenjang Pendidikan Nasional
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                  {(["SD", "SMP", "SMA", "SMK"] as EducationalStage[]).map((stageKey) => {
                    const cfg = STAGE_CONFIGS[stageKey];
                    const isSelected = (profile.educationalStage || currentStage) === stageKey;

                    return (
                      <div
                        key={stageKey}
                        onClick={() => handleChangeStage(stageKey)}
                        className={cn(
                          "relative rounded-2xl p-6 border-2 transition-all cursor-pointer flex flex-col justify-between group text-left",
                          isSelected
                            ? "bg-gradient-to-b from-purple-50/80 via-white to-indigo-50/30 border-[#531FFF] shadow-lg shadow-purple-500/10 ring-2 ring-[#531FFF]/20 scale-[1.01]"
                            : "bg-white border-gray-200/90 hover:border-purple-200 hover:shadow-md hover:bg-gray-50/30"
                        )}
                      >
                        <div className="space-y-4">
                          {/* Header: Stage Icon, Titles & Selected Badge */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center font-black text-base shadow-xs shrink-0 border",
                                cfg.badgeBg, cfg.badgeColor, cfg.borderColor
                              )}>
                                {stageKey}
                              </div>
                              <div className="min-w-0">
                                <span className="text-base md:text-lg font-black text-gray-900 block leading-tight">
                                  Jenjang {stageKey}
                                </span>
                                <span className="text-xs text-gray-500 font-medium block mt-0.5">
                                  {cfg.fullName}
                                </span>
                              </div>
                            </div>

                            {isSelected && (
                              <div className="flex items-center gap-1.5 bg-[#531FFF] text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-xs shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span>Sedang Aktif</span>
                              </div>
                            )}
                          </div>

                          {/* Quick Spec Tags */}
                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <div className="p-2.5 rounded-xl bg-gray-50/80 border border-gray-100/90">
                              <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                                Rentang Kelas
                              </span>
                              <span className="text-xs md:text-sm font-bold text-gray-800 block mt-0.5">
                                {cfg.levelRange}
                              </span>
                            </div>

                            <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100/90">
                              <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider block">
                                KKM Acuan
                              </span>
                              <span className="text-xs md:text-sm font-black text-emerald-800 block mt-0.5">
                                {cfg.defaultKkm} Poin
                              </span>
                            </div>
                          </div>

                          {/* Curriculum & Cycle Info */}
                          <div className="p-3 rounded-xl bg-gray-50/90 border border-gray-100 space-y-1">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-[#531FFF]" />
                              Siklus Kurikulum
                            </span>
                            <span className="text-xs md:text-sm text-gray-800 font-bold block leading-snug">
                              {cfg.curriculumCycle}
                            </span>
                          </div>

                          {/* Description */}
                          <p className="text-xs text-gray-600 leading-relaxed font-medium">
                            {cfg.description}
                          </p>
                        </div>

                        {/* Interactive Footer Button */}
                        <div className="mt-5 pt-3 border-t border-gray-100">
                          <button
                            type="button"
                            className={cn(
                              "w-full py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer",
                              isSelected
                                ? "bg-[#531FFF] text-white shadow-sm"
                                : "bg-gray-100 text-gray-700 hover:bg-purple-100 hover:text-[#531FFF]"
                            )}
                          >
                            {isSelected ? (
                              <>
                                <Check className="w-4 h-4 stroke-[3]" />
                                <span>Jenjang Terpilih</span>
                              </>
                            ) : (
                              <>
                                <span>Beralih ke Jenjang Ini</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ================= SECTION 2: DYNAMIC STAGE CONFIG & VOCATIONAL CONSOLE ================= */}
              {(profile.educationalStage || currentStage) === "SMK" ? (
                /* SMK: COMPREHENSIVE VOCATIONAL PROGRAM CONSOLE */
                <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-6">
                  
                  {/* Top Bar with Filter and Action Buttons */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black bg-amber-100 text-amber-800">
                          Langkah 2
                        </span>
                        <h3 className="text-base md:text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                          Pengelolaan Jurusan & Program Keahlian SMK
                        </h3>
                      </div>
                      <p className="text-xs text-gray-500 font-medium mt-1">
                        Kelola daftar kompetensi keahlian resmi sekolah. Setiap jurusan akan otomatis menjadi pilihan pada form kelas, rombel, guru pengampu, dan data siswa.
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                      <button
                        type="button"
                        onClick={handleLoadPopularSMKPresets}
                        className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-2xs active:scale-95"
                      >
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        <span>Muat 6 Preset Populer</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenAddVocational}
                        className="px-5 py-2.5 bg-[#531FFF] hover:bg-[#4317CC] text-white text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-md shadow-[#531FFF]/20 active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Tambah Jurusan Baru</span>
                      </button>
                    </div>
                  </div>

                  {/* Search, Filter & Quick Count Strip */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/80 p-3 rounded-xl border border-gray-200/70">
                    <div className="flex items-center gap-2.5 flex-1 max-w-lg">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Cari kode, nama jurusan, bidang, atau kaprog..."
                          value={vocationalSearch}
                          onChange={(e) => setVocationalSearch(e.target.value)}
                          className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/20 transition-all"
                        />
                        {vocationalSearch && (
                          <button
                            type="button"
                            onClick={() => setVocationalSearch("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <select
                        value={vocationalFieldFilter}
                        onChange={(e) => setVocationalFieldFilter(e.target.value)}
                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 focus:outline-none focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/20 cursor-pointer shrink-0"
                      >
                        <option value="All">Semua Bidang Keahlian</option>
                        {uniqueVocationalFields.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500 self-end sm:self-auto">
                      <span className="px-2.5 py-1 bg-white rounded-lg border border-gray-200 text-gray-700">
                        Total: <strong className="text-gray-900">{(profile.vocationalPrograms || []).length}</strong>
                      </span>
                      <span className="px-2.5 py-1 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-800">
                        Aktif: <strong>{(profile.vocationalPrograms || []).filter(p => p.status === "Aktif").length}</strong>
                      </span>
                    </div>
                  </div>

                  {/* List of Vocational Programs Cards */}
                  {(!profile.vocationalPrograms || profile.vocationalPrograms.length === 0) ? (
                    /* Initial Empty State */
                    <div className="p-10 md:p-14 text-center bg-amber-50/30 rounded-2xl border-2 border-dashed border-amber-200 space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-sm">
                        <Briefcase className="w-8 h-8" />
                      </div>
                      <div className="max-w-md mx-auto space-y-1">
                        <h4 className="text-base font-black text-gray-900">
                          Belum Ada Program Keahlian / Jurusan SMK
                        </h4>
                        <p className="text-xs text-gray-500 leading-relaxed">
                          Daftarkan program keahlian secara manual atau muat paket 6 preset jurusan SMK populer (RPL, TKJ, DKV, AKL, MPLB, TKRO) dalam sekali klik.
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={handleLoadPopularSMKPresets}
                          className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-black rounded-xl hover:shadow-md transition-all cursor-pointer flex items-center gap-2"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>Muat 6 Preset Jurusan Populer</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleOpenAddVocational}
                          className="px-5 py-2.5 bg-[#531FFF] text-white text-xs font-black rounded-xl hover:bg-[#4317CC] transition-all cursor-pointer flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Tambah Manual</span>
                        </button>
                      </div>
                    </div>
                  ) : filteredVocationalPrograms.length === 0 ? (
                    /* Filter Empty State */
                    <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                      <p className="text-xs font-bold text-gray-700">
                        Tidak ada jurusan yang cocok dengan pencarian &quot;{vocationalSearch}&quot;.
                      </p>
                      <button
                        type="button"
                        onClick={() => { setVocationalSearch(""); setVocationalFieldFilter("All"); }}
                        className="text-xs text-[#531FFF] font-bold hover:underline"
                      >
                        Reset Filter Pencarian
                      </button>
                    </div>
                  ) : (
                    /* Populated Grid */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredVocationalPrograms.map((prog) => {
                        const isActive = prog.status === "Aktif";

                        return (
                          <div
                            key={prog.id}
                            className={cn(
                              "bg-white border rounded-2xl p-5 space-y-4 hover:shadow-md transition-all flex flex-col justify-between group",
                              isActive ? "border-gray-200 hover:border-[#531FFF]/40" : "border-gray-200/60 opacity-75 bg-gray-50/50"
                            )}
                          >
                            <div className="space-y-3">
                              {/* Top Bar: Code Badge, Status Toggle, Actions */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="px-3 py-1 bg-gradient-to-r from-[#531FFF] to-[#7B42FF] text-white font-mono font-black text-xs rounded-xl shadow-xs">
                                    {prog.code}
                                  </span>

                                  {/* Clickable Quick Status Toggle */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleVocationalStatus(prog)}
                                    title="Klik untuk mengubah status aktif/non-aktif"
                                    className={cn(
                                      "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer",
                                      isActive 
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100" 
                                        : "bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200"
                                    )}
                                  >
                                    <span className={cn("w-1.5 h-1.5 rounded-full", isActive ? "bg-emerald-500" : "bg-gray-400")} />
                                    <span>{prog.status || "Aktif"}</span>
                                  </button>
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditVocational(prog)}
                                    title="Ubah Data Program Keahlian"
                                    className="p-2 text-gray-400 hover:text-[#531FFF] hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteVocational(prog.id, prog.name)}
                                    title="Hapus Program Keahlian"
                                    className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Program Name & Field */}
                              <div>
                                <h4 className="font-black text-sm text-gray-900 leading-snug">
                                  {prog.name}
                                </h4>
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100 mt-1.5">
                                  <Briefcase className="w-3 h-3 text-amber-600" />
                                  {prog.field || "Teknologi & Kejuruan"}
                                </span>
                              </div>

                              {/* Description */}
                              {prog.description && (
                                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed font-normal">
                                  {prog.description}
                                </p>
                              )}
                            </div>

                            {/* Card Footer: Kaprog Info */}
                            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                              <span className="text-gray-400 font-medium flex items-center gap-1">
                                <User className="w-3 h-3 text-gray-400" />
                                Ka. Program:
                              </span>
                              <span className="font-bold text-gray-800">
                                {prog.headOfProgram || "Belum Ditugaskan"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* System Note for SMK */}
                  <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100 flex items-start gap-3">
                    <Sparkles className="w-4 h-4 text-[#531FFF] shrink-0 mt-0.5" />
                    <div className="space-y-0.5 text-xs text-purple-900">
                      <p className="font-bold">Informasi Integrasi Otomatis Jurusan SMK:</p>
                      <p className="text-[11px] text-purple-700 leading-relaxed font-medium">
                        Setiap program keahlian yang berstatus <strong>Aktif</strong> otomatis muncul pada menu pembuatan kelas rombel (<code className="bg-white/80 px-1 py-0.5 rounded font-mono text-purple-900">/classes</code>), form pemilihan jurusan data siswa (<code className="bg-white/80 px-1 py-0.5 rounded font-mono text-purple-900">/data-siswa</code>), dan pembagian guru mata pelajaran produktif kejuruan (<code className="bg-white/80 px-1 py-0.5 rounded font-mono text-purple-900">/subjects</code>).
                      </p>
                    </div>
                  </div>
                </div>
              ) : (profile.educationalStage || currentStage) === "SMA" ? (
                /* SMA: VISUAL ACADEMIC TRACK MAP */
                <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-6">
                  <div className="border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black bg-indigo-100 text-indigo-800">
                        Langkah 2
                      </span>
                      <h3 className="text-base font-black text-gray-900 tracking-tight">
                        Peta Peminatan Akademik & Kurikulum SMA
                      </h3>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Jenjang SMA menggunakan peminatan akademik nasional terstandar yang mempersiapkan siswa menuju perguruan tinggi dan karir akademik.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* MIPA Card */}
                    <div className="p-5 rounded-2xl bg-gradient-to-b from-blue-50/60 to-white border border-blue-200/80 space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs">
                        IPA
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-gray-900">MIPA (Matematika &amp; Sains)</h4>
                        <p className="text-xs text-gray-500 mt-0.5">Fokus sains murni, logika analitis, dan teknologi.</p>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-blue-100 space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Mata Pelajaran Khas:</span>
                        <span className="text-xs font-bold text-blue-900 block">Fisika, Kimia, Biologi, Matematika Tingkat Lanjut</span>
                      </div>
                      <span className="text-[11px] text-gray-500 block">
                        Rujukan karir: Kedokteran, Teknik, Farmasi, Data Science.
                      </span>
                    </div>

                    {/* IPS Card */}
                    <div className="p-5 rounded-2xl bg-gradient-to-b from-amber-50/60 to-white border border-amber-200/80 space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black text-xs">
                        IPS
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-gray-900">IPS (Sosial &amp; Humaniora)</h4>
                        <p className="text-xs text-gray-500 mt-0.5">Fokus dinamika masyarakat, ekonomi, dan peradaban.</p>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-amber-100 space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Mata Pelajaran Khas:</span>
                        <span className="text-xs font-bold text-amber-900 block">Ekonomi, Sosiologi, Geografi, Sejarah Lanjut</span>
                      </div>
                      <span className="text-[11px] text-gray-500 block">
                        Rujukan karir: Bisnis, Hukum, Akuntansi, Kebijakan Publik.
                      </span>
                    </div>

                    {/* Bahasa Card */}
                    <div className="p-5 rounded-2xl bg-gradient-to-b from-emerald-50/60 to-white border border-emerald-200/80 space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs">
                        BHS
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-gray-900">Bahasa &amp; Budaya</h4>
                        <p className="text-xs text-gray-500 mt-0.5">Fokus literasi global, komunikasi, dan antropologi.</p>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-emerald-100 space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Mata Pelajaran Khas:</span>
                        <span className="text-xs font-bold text-emerald-900 block">Bahasa &amp; Sastra Asing, Antropologi, Linguistik</span>
                      </div>
                      <span className="text-[11px] text-gray-500 block">
                        Rujukan karir: Hubungan Internasional, Sastra, Komunikasi.
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* SD & SMP: THEMATIC & REGULAR FOUNDATION PROGRESSION */
                <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-6">
                  <div className="border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black bg-emerald-100 text-emerald-800">
                        Langkah 2
                      </span>
                      <h3 className="text-base font-black text-gray-900 tracking-tight">
                        Struktur Fase Pembelajaran Reguler Terpadu (Jenjang {stageConfig.name})
                      </h3>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Jenjang {stageConfig.name} tidak memerlukan peminatan jurusan kejuruan rumit. Sistem secara otomatis menerapkan rombel kelas reguler dengan kurikulum terpadu.
                    </p>
                  </div>

                  {currentStage === "SD" ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/70 space-y-2">
                        <span className="px-2.5 py-1 bg-emerald-600 text-white font-black text-xs rounded-lg inline-block">
                          Fase A (Kelas 1 - 2)
                        </span>
                        <h4 className="text-sm font-black text-gray-900">Fondasi Literasi &amp; Numerasi</h4>
                        <p className="text-xs text-gray-500 leading-relaxed font-medium">
                          Pembiasaan karakter dasar, membaca lancar, berhitung konkret, dan eksplorasi lingkungan tematik.
                        </p>
                      </div>

                      <div className="p-5 rounded-2xl bg-sky-50/50 border border-sky-200/70 space-y-2">
                        <span className="px-2.5 py-1 bg-sky-600 text-white font-black text-xs rounded-lg inline-block">
                          Fase B (Kelas 3 - 4)
                        </span>
                        <h4 className="text-sm font-black text-gray-900">Penguatan Konseptual</h4>
                        <p className="text-xs text-gray-500 leading-relaxed font-medium">
                          Mulai mengenal IPAS terpadu dasar, logika sains sederhana, kerja kelompok, dan seni budaya terapan.
                        </p>
                      </div>

                      <div className="p-5 rounded-2xl bg-purple-50/50 border border-purple-200/70 space-y-2">
                        <span className="px-2.5 py-1 bg-[#531FFF] text-white font-black text-xs rounded-lg inline-block">
                          Fase C (Kelas 5 - 6)
                        </span>
                        <h4 className="text-sm font-black text-gray-900">Pemantapan &amp; Kesiapan SMP</h4>
                        <p className="text-xs text-gray-500 leading-relaxed font-medium">
                          Penalaran kritis mandiri, proyek P5 Kurikulum Merdeka, dan persiapan kelulusan menuju jenjang menengah.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 rounded-2xl bg-sky-50/60 border border-sky-200 space-y-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-gray-900">Fase D Kurikulum Merdeka (Kelas 7, 8, dan 9 SMP)</h4>
                          <p className="text-xs text-gray-500">Pematangan konsep mata pelajaran mandiri sebelum menentukan peminatan di tingkat SMA/SMK.</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed font-medium">
                        Pada jenjang SMP, mata pelajaran dipisahkan secara terstruktur (IPA Terpadu, IPS Terpadu, Informatika, Bahasa Inggris, PPKn, dsb.) dengan pengelolaan rombel kelas reguler (A, B, C / Unggulan) yang sangat fleksibel.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ================= SECTION 3: LIVE CROSS-MODULE INTEGRATION PIPELINE ================= */}
              <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-6">
                <div className="border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black bg-purple-100 text-[#531FFF]">
                      Langkah 3
                    </span>
                    <h3 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#531FFF]" />
                      Status Penyelarasan Sistem Global Antar Modul
                    </h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Setiap pergantian jenjang sekolah secara otomatis mengalirkan konfigurasi ke seluruh modul operasional berikut secara real-time:
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Module 1: Classes */}
                  <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-200/80 space-y-3 flex flex-col justify-between hover:bg-white hover:border-[#531FFF]/40 hover:shadow-sm transition-all">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 text-[#531FFF] flex items-center justify-center font-bold">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-extrabold">
                          Tersinkron 100%
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-gray-900">Manajemen Rombel Kelas</h4>
                      <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                        Opsi tingkat dibatasi ke <strong>{gradeLevels.join(", ")}</strong>. Jurusan: <strong>{majorOptions.slice(0, 3).map(m => m.value).join(", ")}{majorOptions.length > 3 ? "..." : ""}</strong>.
                      </p>
                    </div>

                    <Link
                      href="/classes"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#531FFF] hover:underline pt-2 border-t border-gray-200/60"
                    >
                      <span>Buka Modul Kelas</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>

                  {/* Module 2: Subjects */}
                  <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-200/80 space-y-3 flex flex-col justify-between hover:bg-white hover:border-[#531FFF]/40 hover:shadow-sm transition-all">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-extrabold">
                          Tersinkron 100%
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-gray-900">Kurikulum Mata Pelajaran</h4>
                      <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                        Paket preset kurikulum otomatis menyajikan mapel rujukan jenjang <strong>{stageConfig.name}</strong>.
                      </p>
                    </div>

                    <Link
                      href="/subjects"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#531FFF] hover:underline pt-2 border-t border-gray-200/60"
                    >
                      <span>Buka Modul Mapel</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>

                  {/* Module 3: Grades */}
                  <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-200/80 space-y-3 flex flex-col justify-between hover:bg-white hover:border-[#531FFF]/40 hover:shadow-sm transition-all">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                          <Award className="w-4 h-4" />
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-extrabold">
                          Tersinkron 100%
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-gray-900">Penilaian &amp; Buku Nilai</h4>
                      <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                        Standar KKM matriks spreadsheet otomatis terpatok ke <strong>{stageConfig.defaultKkm} poin</strong>.
                      </p>
                    </div>

                    <Link
                      href="/grades"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#531FFF] hover:underline pt-2 border-t border-gray-200/60"
                    >
                      <span>Buka Buku Nilai</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>

                  {/* Module 4: Students */}
                  <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-200/80 space-y-3 flex flex-col justify-between hover:bg-white hover:border-[#531FFF]/40 hover:shadow-sm transition-all">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                          <UserCog className="w-4 h-4" />
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-extrabold">
                          Tersinkron 100%
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-gray-900">Basis Data Siswa</h4>
                      <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                        Form pendaftaran siswa otomatis menyelaraskan opsi jurusan dan tingkat rombel sekolah.
                      </p>
                    </div>

                    <Link
                      href="/data-siswa"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#531FFF] hover:underline pt-2 border-t border-gray-200/60"
                    >
                      <span>Buka Data Siswa</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: Appearance & Branding */}
          {(activeTab as string) === "branding" && (
            <div className="bg-white p-6 md:p-8 rounded-xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-6 animate-in fade-in duration-200">
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
                <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 space-y-2">
                  <label className="block text-xs font-bold text-gray-700">Warna Utama (Primary)</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      value={branding.primaryColor}
                      onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                      className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
                    />
                    <span className="text-xs font-mono font-bold text-gray-900">{branding.primaryColor}</span>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 space-y-2">
                  <label className="block text-xs font-bold text-gray-700">Warna Sekunder (Secondary)</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      value={branding.secondaryColor}
                      onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                      className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
                    />
                    <span className="text-xs font-mono font-bold text-gray-900">{branding.secondaryColor}</span>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 space-y-2">
                  <label className="block text-xs font-bold text-gray-700">Warna Akses (Accent)</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      value={branding.accentColor}
                      onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                      className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
                    />
                    <span className="text-xs font-mono font-bold text-gray-900">{branding.accentColor}</span>
                  </div>
                </div>
              </div>

              {/* Live Interactive Branding Preview Box */}
              <div className="p-6 rounded-xl border border-gray-200 space-y-4 shadow-sm relative overflow-hidden" style={{ backgroundColor: '#FAF9FF' }}>
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
                  <div className="p-4 rounded-lg bg-white border border-gray-100 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900">Tombol Utama</span>
                      <button className="px-3 py-1.5 rounded-lg text-xs font-extrabold text-white shadow-xs" style={{ backgroundColor: branding.primaryColor }}>
                        Simpan Data
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-500">Pratinjau elemen tombol navigasi utama pada sistem.</p>
                  </div>

                  <div className="p-4 rounded-lg bg-white border border-gray-100 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900">Badge & Status</span>
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold text-white" style={{ backgroundColor: branding.accentColor }}>
                        Presensi Hadir
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500">Pratinjau elemen status badge & indikator kelulusan.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1.6: Academic Year & Semester Configuration (Multi-Period Context) */}
          {activeTab === "academic_year" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <AcademicYearSettings />
            </div>
          )}

          {/* TAB 3: Attendance Settings (Mode Absensi & Face Recognition AI) */}
          {activeTab === "attendance" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header Banner - Clean 2-Row Architecture */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.04)] space-y-4">
                {/* Top Row: Icon, Title, Status & Mode Chip */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#531FFF] to-[#7344FF] text-white flex items-center justify-center font-bold shadow-md shadow-[#531FFF]/20 shrink-0 mt-0.5 sm:mt-0">
                      <ScanFace className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                          Pengaturan Mode Absensi &amp; Face Recognition AI
                        </h2>
                        <span className="px-2.5 py-0.5 text-[11px] font-extrabold bg-purple-50 text-[#531FFF] rounded-full border border-purple-200 flex items-center gap-1.5 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#531FFF] animate-pulse" />
                          Dual Mode System
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1 leading-relaxed">
                        Pilih metode validasi presensi (Face Recognition AI vs Foto Selfie Biasa) untuk Guru &amp; Siswa, jam operasional sekolah, dan metode notifikasi.
                      </p>
                    </div>
                  </div>

                  {/* Mode Aktif Quick Chip */}
                  <div className="hidden lg:flex items-center gap-2 self-start lg:self-center shrink-0">
                    <div className="px-3.5 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-2 text-xs">
                      <span className="text-gray-400 font-medium">Mode Siswa:</span>
                      <strong className="text-gray-900 font-bold">
                        {attendance.studentAttendanceMode === "face_recognition" ? "Face ID AI" : "Foto Selfie"}
                      </strong>
                      <span className="text-gray-300">•</span>
                      <span className="text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 text-[10px]">
                        Toleransi {attendance.lateToleranceMinutes}m
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Row / Toolbar: Helper Info on Left + Action Buttons on Right */}
                <div className="pt-3.5 border-t border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-50 text-amber-600 text-[11px] font-bold shrink-0">
                      💡
                    </span>
                    <span className="line-clamp-1">
                      Mode Face ID AI dilengkapi liveness check anti-spoofing untuk mencegah kecurangan titip absen foto/layar HP.
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                    <button
                      type="button"
                      onClick={handleSaveAttendanceConfig}
                      disabled={savingAttendance}
                      className="px-4 py-2 bg-[#531FFF] hover:bg-[#4316D0] active:scale-[0.98] text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-md shadow-[#531FFF]/25 disabled:opacity-50"
                    >
                      {savingAttendance ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Simpan Pengaturan Absensi</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* CARD 1: Mode Validasi Presensi & Kamera AI (Dual Mode: Face Recognition vs Foto Selfie Biasa) */}
              <div className="bg-white p-6 md:p-8 rounded-xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-[#531FFF] text-white flex items-center justify-center shadow-sm">
                      <ScanFace className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-gray-900 text-base">Mode Validasi Presensi &amp; Kamera AI</h3>
                        <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-purple-50 text-[#531FFF] border border-purple-200">
                          Dual Mode System
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Pilih metode verifikasi kehadiran untuk Guru dan Siswa: <strong>Face Recognition (AI)</strong> untuk proteksi biometrik atau <strong>Foto Selfie Biasa</strong> untuk kecepatan &amp; perangkat standar.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 1. SELEKTOR MODE GURU & TENAGA PENDIDIK */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#531FFF]" />
                      <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                        1. Mode Validasi Absensi Guru &amp; Staf (Pendidik)
                      </h4>
                    </div>
                    <span className="text-[11px] font-bold text-gray-500">
                      Aktif: <strong className={attendance.teacherAttendanceMode === "face_recognition" ? "text-[#531FFF]" : "text-emerald-700"}>
                        {attendance.teacherAttendanceMode === "face_recognition" ? "Face Recognition (AI) + GPS" : "Foto Selfie Biasa + GPS"}
                      </strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Option Guru 1: Face Recognition AI */}
                    <div
                      onClick={() => setAttendance((prev) => ({ ...prev, teacherAttendanceMode: "face_recognition" }))}
                      className={cn(
                        "p-4 rounded-xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between",
                        attendance.teacherAttendanceMode === "face_recognition"
                          ? "bg-purple-50/50 border-[#531FFF] shadow-sm shadow-[#531FFF]/10"
                          : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/60"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                            attendance.teacherAttendanceMode === "face_recognition"
                              ? "bg-[#531FFF] text-white"
                              : "bg-gray-100 text-gray-600"
                          )}>
                            <ScanFace className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-extrabold text-sm text-gray-900">Face Recognition (AI)</h5>
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#531FFF]/10 text-[#531FFF]">
                                Rekomendasi
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">Verifikasi biometrik wajah master + GPS</p>
                          </div>
                        </div>

                        <div className={cn(
                          "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all",
                          attendance.teacherAttendanceMode === "face_recognition"
                            ? "border-[#531FFF] bg-[#531FFF] text-white"
                            : "border-gray-300 bg-white"
                        )}>
                          {attendance.teacherAttendanceMode === "face_recognition" && (
                            <Check className="w-3.5 h-3.5" />
                          )}
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-100/80 text-[11px] text-gray-600 space-y-1">
                        <p className="flex items-center gap-1.5 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          Mencocokkan wajah guru langsung dengan data master wajah terdaftar.
                        </p>
                        <p className="flex items-center gap-1.5 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          Anti-titip absen 100% &amp; mencatat titik koordinat GPS radius sekolah.
                        </p>
                      </div>
                    </div>

                    {/* Option Guru 2: Foto Selfie Biasa */}
                    <div
                      onClick={() => setAttendance((prev) => ({ ...prev, teacherAttendanceMode: "selfie_only" }))}
                      className={cn(
                        "p-4 rounded-xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between",
                        attendance.teacherAttendanceMode === "selfie_only"
                          ? "bg-emerald-50/40 border-emerald-600 shadow-sm shadow-emerald-500/10"
                          : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/60"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                            attendance.teacherAttendanceMode === "selfie_only"
                              ? "bg-emerald-600 text-white"
                              : "bg-gray-100 text-gray-600"
                          )}>
                            <Camera className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-extrabold text-sm text-gray-900">Hanya Foto Selfie Biasa</h5>
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                                Ringan &amp; Cepat
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">Foto selfie visual + watermark GPS &amp; Jam</p>
                          </div>
                        </div>

                        <div className={cn(
                          "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all",
                          attendance.teacherAttendanceMode === "selfie_only"
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-gray-300 bg-white"
                        )}>
                          {attendance.teacherAttendanceMode === "selfie_only" && (
                            <Check className="w-3.5 h-3.5" />
                          )}
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-100/80 text-[11px] text-gray-600 space-y-1">
                        <p className="flex items-center gap-1.5 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          Tidak memerlukan pencocokan wajah AI (sangat ringan untuk HP apapun).
                        </p>
                        <p className="flex items-center gap-1.5 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          Watermark otomatis Nama, NIP, Jam WIB, dan GPS tetap dicetak pada foto.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. SELEKTOR MODE SISWA */}
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                      <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                        2. Mode Validasi Absensi Siswa
                      </h4>
                    </div>
                    <span className="text-[11px] font-bold text-gray-500">
                      Aktif: <strong className={attendance.studentAttendanceMode === "face_recognition" ? "text-[#531FFF]" : "text-emerald-700"}>
                        {attendance.studentAttendanceMode === "face_recognition" ? "Face Recognition (AI) + GPS" : "Foto Selfie Biasa + GPS"}
                      </strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Option Siswa 1: Face Recognition AI */}
                    <div
                      onClick={() => setAttendance((prev) => ({ ...prev, studentAttendanceMode: "face_recognition" }))}
                      className={cn(
                        "p-4 rounded-xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between",
                        attendance.studentAttendanceMode === "face_recognition"
                          ? "bg-purple-50/50 border-[#531FFF] shadow-sm shadow-[#531FFF]/10"
                          : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/60"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                            attendance.studentAttendanceMode === "face_recognition"
                              ? "bg-[#531FFF] text-white"
                              : "bg-gray-100 text-gray-600"
                          )}>
                            <ScanFace className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-extrabold text-sm text-gray-900">Face Recognition (AI)</h5>
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#531FFF]/10 text-[#531FFF]">
                                Anti-Titip Absen
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">Siswa wajib scan wajah langsung di kamera</p>
                          </div>
                        </div>

                        <div className={cn(
                          "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all",
                          attendance.studentAttendanceMode === "face_recognition"
                            ? "border-[#531FFF] bg-[#531FFF] text-white"
                            : "border-gray-300 bg-white"
                        )}>
                          {attendance.studentAttendanceMode === "face_recognition" && (
                            <Check className="w-3.5 h-3.5" />
                          )}
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-100/80 text-[11px] text-gray-600 space-y-1">
                        <p className="flex items-center gap-1.5 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          Mencegah siswa saling titip login akun ke teman sekelas.
                        </p>
                        <p className="flex items-center gap-1.5 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          Mencocokkan wajah siswa dengan database biometrik induk siswa.
                        </p>
                      </div>
                    </div>

                    {/* Option Siswa 2: Foto Selfie Biasa */}
                    <div
                      onClick={() => setAttendance((prev) => ({ ...prev, studentAttendanceMode: "selfie_only" }))}
                      className={cn(
                        "p-4 rounded-xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between",
                        attendance.studentAttendanceMode === "selfie_only"
                          ? "bg-emerald-50/40 border-emerald-600 shadow-sm shadow-emerald-500/10"
                          : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/60"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                            attendance.studentAttendanceMode === "selfie_only"
                              ? "bg-emerald-600 text-white"
                              : "bg-gray-100 text-gray-600"
                          )}>
                            <Camera className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-extrabold text-sm text-gray-900">Hanya Foto Selfie Biasa</h5>
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                                Fleksibel &amp; Praktis
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">Siswa cukup mengambil foto selfie bukti hadir</p>
                          </div>
                        </div>

                        <div className={cn(
                          "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all",
                          attendance.studentAttendanceMode === "selfie_only"
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-gray-300 bg-white"
                        )}>
                          {attendance.studentAttendanceMode === "selfie_only" && (
                            <Check className="w-3.5 h-3.5" />
                          )}
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-100/80 text-[11px] text-gray-600 space-y-1">
                        <p className="flex items-center gap-1.5 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          Siswa dapat absen tanpa perlu perekaman wajah master terlebih dahulu.
                        </p>
                        <p className="flex items-center gap-1.5 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          Tetap dilengkapi watermark Nama, NISN, Jam, dan Validasi Geofence GPS.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. PARAMETER AI & PROTEKSI BIOMETRIK */}
                {(attendance.teacherAttendanceMode === "face_recognition" || attendance.studentAttendanceMode === "face_recognition") && (
                  <div className="p-4 sm:p-5 rounded-xl bg-purple-50/60 border border-purple-200/80 space-y-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#531FFF]" />
                      <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                        Konfigurasi Parameter AI Face Recognition
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
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
                        <p className="text-[10px] text-gray-500 mt-1">
                          Nilai standar 80%. Wajah dinyatakan cocok jika skor kemiripan sama atau lebih tinggi dari angka ini.
                        </p>
                      </div>

                      <div className="flex items-center justify-between p-3.5 rounded-lg bg-white border border-purple-100">
                        <div>
                          <p className="font-bold text-gray-900">Anti-Spoofing &amp; Liveness Detection</p>
                          <p className="text-[11px] text-gray-500">Mencegah penggunaan foto cetak atau layar HP lain saat scan.</p>
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

                    {/* Notice Info Box */}
                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-white/80 border border-purple-200/60 text-[11px] text-purple-950 font-medium">
                      <Sparkles className="w-4 h-4 text-[#531FFF] shrink-0 mt-0.5" />
                      <div>
                        <strong>Pendaftaran Data Wajah Master (Face Enrolment):</strong>
                        {" "}Guru dan siswa merekam foto wajah master sekali saja melalui menu Profil Saya. Data vektor biometrik (~1 KB) akan menjadi acuan tetap saat melakukan absensi harian.
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* CARD 2: Jadwal & Jam Operasional Presensi */}
              <div className="bg-white p-6 md:p-8 rounded-xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-5">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                  <div className="w-9 h-9 rounded-lg bg-purple-50 text-[#531FFF] flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-gray-900 text-sm">Jadwal &amp; Jam Presensi Sekolah</h3>
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
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg font-bold text-gray-900 focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Siswa/guru dihitung tepat waktu jika sebelum jam ini.</p>
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
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg font-bold text-gray-900 focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none"
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
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg font-bold text-gray-900 focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none"
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
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg font-bold text-gray-900 focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Presensi kepulangan dibuka setelah jam ini.</p>
                  </div>
                </div>
              </div>

              {/* CARD 3: Metode Cadangan & Notifikasi */}
              <div className="bg-white p-6 md:p-8 rounded-xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-5">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-gray-900 text-sm">Metode Presensi Cadangan &amp; Notifikasi</h3>
                    <p className="text-xs text-gray-500">Konfigurasi opsi alternatif jika kamera kendala dan integrasi pesan instan.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-cyan-600" />
                        QR Code Kartu Siswa
                      </p>
                      <p className="text-[10px] text-gray-500">Scan QR fisik di kartu pelajar jika kamera bermasalah</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={attendance.methodQr}
                      onChange={(e) => setAttendance({ ...attendance, methodQr: e.target.checked })}
                      className="w-5 h-5 accent-[#531FFF] rounded cursor-pointer"
                    />
                  </div>

                  <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        <UserCog className="w-4 h-4 text-emerald-600" />
                        Manual Guru / Wali Kelas
                      </p>
                      <p className="text-[10px] text-gray-500">Wali kelas dapat mengabsenkan siswa langsung di kelas</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={attendance.methodManual}
                      onChange={(e) => setAttendance({ ...attendance, methodManual: e.target.checked })}
                      className="w-5 h-5 accent-[#531FFF] rounded cursor-pointer"
                    />
                  </div>
                </div>

                {/* WhatsApp Notification Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-purple-50/50 border border-purple-100">
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
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Semua perubahan mode absensi tersimpan secara aman ke server dan sesi aktif.</span>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={handleSaveAttendanceConfig}
                    disabled={savingAttendance}
                    className="px-5 py-2.5 bg-[#531FFF] hover:bg-[#4316D0] active:scale-[0.98] text-white text-xs font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-2 shadow-md shadow-[#531FFF]/25 disabled:opacity-50"
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

          {/* TAB 3.5: Geofence GPS Settings (Peta & Radius Lokasi Sekolah) */}
          {activeTab === "geofence" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header Banner - Clean 2-Row Architecture (No Text Squishing) */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.04)] space-y-4">
                {/* Top Row: Icon, Title, Status & Radius Chip */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0 mt-0.5 sm:mt-0">
                      <Compass className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                          Pengaturan Lokasi &amp; Geofence GPS Sekolah
                        </h2>
                        {attendance.requireRadius ? (
                          <span className="px-2.5 py-0.5 text-[11px] font-extrabold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 flex items-center gap-1.5 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Geofence Aktif
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 text-[11px] font-extrabold bg-amber-50 text-amber-700 rounded-full border border-amber-200 flex items-center gap-1.5 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Geofence Toleransi
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1 leading-relaxed">
                        Tentukan titik pusat sekolah pada peta interaktif, batas radius wilayah absensi (meter), dan validasi radius kehadiran.
                      </p>
                    </div>
                  </div>

                  {/* Radius Quick Metric Chip on the right */}
                  <div className="hidden lg:flex items-center gap-2 self-start lg:self-center shrink-0">
                    <div className="px-3.5 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-2 text-xs">
                      <span className="text-gray-400 font-medium">Batas Radius:</span>
                      <strong className="text-gray-900 font-black">{attendance.geofenceRadiusMeters || attendance.gpsRadiusMeter || 100}m</strong>
                    </div>
                  </div>
                </div>

                {/* Bottom Row / Toolbar: Helper Info on Left + Action Buttons on Right */}
                <div className="pt-3.5 border-t border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-50 text-amber-600 text-[11px] font-bold shrink-0">
                      💡
                    </span>
                    <span className="line-clamp-1">
                      Geser marker sekolah pada peta atau gunakan tombol di samping untuk menyesuaikan posisi.
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSyncAddressFromCoordinates()}
                      disabled={isGeocodingAddress}
                      className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-[#531FFF] text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-purple-200/70 shadow-2xs disabled:opacity-50"
                      title="Perbarui alamat profil sekolah sesuai koordinat GPS"
                    >
                      <RefreshCw className={cn("w-3.5 h-3.5", isGeocodingAddress && "animate-spin")} />
                      <span>{isGeocodingAddress ? "Mencari Alamat..." : "Sesuaikan Alamat GPS"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDetectCurrentLocation}
                      className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-emerald-200/70 shadow-2xs"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Deteksi Lokasi Saya</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveAttendanceConfig}
                      disabled={savingAttendance}
                      className="px-4 py-2 bg-[#531FFF] hover:bg-[#4316D0] active:scale-[0.98] text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-md shadow-[#531FFF]/25 disabled:opacity-50"
                    >
                      {savingAttendance ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Simpan Pengaturan Geofence</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* CARD 1: Peta Interaktif & Dynamic Radius Geofencing */}
              <div className="bg-white p-6 md:p-8 rounded-xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Map className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-gray-900 text-sm">Pratinjau Peta Interaktif &amp; Batas Radius Geofence</h3>
                      <p className="text-xs text-gray-500">
                        Marker lokasi sekolah dan area lingkaran dinamis otomatis diperbarui saat koordinat atau radius diubah.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-gray-700 bg-gray-100 px-3 py-1 rounded-lg border border-gray-200 font-bold">
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
                      setProfile((prev) => ({
                        ...prev,
                        latitude: lat,
                        longitude: lng,
                      }));
                      // Automatically reverse-geocode and adjust address
                      handleSyncAddressFromCoordinates(lat, lng);
                    }}
                    height="400px"
                  />
                </div>

                {/* Radius Slider & Quick Presets */}
                <div className="space-y-4 pt-3 border-t border-gray-100">
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <label className="font-bold text-gray-700 text-xs">Radius Absensi Sekolah (Meter)</label>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] text-gray-400 font-medium mr-1">Preset Cepat:</span>
                        {[50, 100, 250, 500, 1000].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => {
                              setAttendance((prev) => ({
                                ...prev,
                                geofenceRadiusMeters: val,
                                gpsRadiusMeter: val,
                              }));
                              setProfile((prev) => ({
                                ...prev,
                                radiusMeters: val,
                              }));
                            }}
                            className={cn(
                              "px-2.5 py-1 text-[11px] font-bold rounded-md transition-all border cursor-pointer",
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
                          setProfile((prev) => ({ ...prev, radiusMeters: v }));
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
                            setProfile((prev) => ({ ...prev, radiusMeters: v }));
                          }}
                          className="w-20 px-2.5 py-1.5 border border-gray-200 rounded-lg font-bold text-gray-900 text-center text-xs focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none"
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
                          setProfile((prev) => ({ ...prev, latitude: v }));
                        }}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg font-mono text-gray-900 text-xs focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none"
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
                          setProfile((prev) => ({ ...prev, longitude: v }));
                        }}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg font-mono text-gray-900 text-xs focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none"
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

                  {/* Alamat Sekolah Lengkap Berdasarkan Titik GPS */}
                  <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-xl space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#531FFF]" />
                        <span className="font-extrabold text-gray-900">Alamat Sekolah Berdasarkan Titik GPS</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSyncAddressFromCoordinates()}
                        disabled={isGeocodingAddress}
                        className="text-[11px] text-[#531FFF] hover:underline flex items-center gap-1 font-bold cursor-pointer disabled:opacity-50"
                        title="Ambil data lengkap alamat dari koordinat GPS"
                      >
                        <RefreshCw className={cn("w-3 h-3", isGeocodingAddress && "animate-spin")} />
                        <span>{isGeocodingAddress ? "Menyesuaikan..." : "Perbarui Alamat dari GPS"}</span>
                      </button>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-purple-200/60 shadow-2xs space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-gray-400 font-extrabold block">Alamat Lengkap Digunakan untuk Absensi:</span>
                      <p className="text-gray-800 font-medium leading-relaxed text-xs">
                        📍 {profile.address || profile.locationAddress || "Alamat belum tersinkronisasi. Klik 'Perbarui Alamat dari GPS' atau geser pin pada peta."}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-gray-600 pt-0.5">
                      <span><strong>Kota / Kab:</strong> {profile.city || "-"}</span>
                      <span><strong>Provinsi:</strong> {profile.province || "-"}</span>
                      <span><strong>Kode Pos:</strong> {profile.postalCode || "-"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Sticky Action Bar */}
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Pengaturan titik koordinat dan radius geofence akan disinkronkan ke seluruh modul presensi.</span>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={handleSaveAttendanceConfig}
                    disabled={savingAttendance}
                    className="px-5 py-2.5 bg-[#531FFF] hover:bg-[#4316D0] active:scale-[0.98] text-white text-xs font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-2 shadow-md shadow-[#531FFF]/25 disabled:opacity-50"
                  >
                    {savingAttendance ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Menyimpan Perubahan...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Simpan Pengaturan Geofence
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Grading & Reports */}
          {activeTab === "grading" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header Banner - Clean 2-Row Architecture */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.04)] space-y-4">
                {/* Top Row: Icon, Title, Status & KKM Quick Chip */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20 shrink-0 mt-0.5 sm:mt-0">
                      <Award className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                          Penilaian, KKM &amp; Kalkulasi Rapor
                        </h2>
                        <span className="px-2.5 py-0.5 text-[11px] font-extrabold bg-amber-50 text-amber-700 rounded-full border border-amber-200 flex items-center gap-1.5 shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                          Standar Kelulusan &amp; Asesmen
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1 leading-relaxed">
                        Tentukan batas KKM sekolah, formula persentase bobot nilai akhir, dan kalkulasi otomatis rapor digital siswa.
                      </p>
                    </div>
                  </div>

                  {/* KKM Metric Indicator Chip */}
                  <div className="hidden lg:flex items-center gap-2 self-start lg:self-center shrink-0">
                    <div className="px-3.5 py-1.5 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center gap-2 text-xs">
                      <span className="text-amber-700 font-medium">Batas KKM:</span>
                      <strong className="text-amber-950 font-black text-sm">{grading.kkmScore}</strong>
                      <span className="text-amber-300">•</span>
                      <span className="text-amber-800 font-bold text-[11px]">
                        Total Bobot: {grading.assignmentWeight + grading.midtermWeight + grading.finalWeight}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Row / Toolbar: Helper Info on Left + Action Buttons on Right */}
                <div className="pt-3.5 border-t border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-50 text-amber-600 text-[11px] font-bold shrink-0">
                      💡
                    </span>
                    <span className="line-clamp-1">
                      Total persentase bobot (Tugas + UTS + UAS) idealnya berjumlah 100% untuk akurasi nilai akhir rapor.
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
                    <button
                      type="button"
                      onClick={() => setGrading(prev => ({ ...prev, kkmScore: 75, assignmentWeight: 30, midtermWeight: 30, finalWeight: 40 }))}
                      className="px-3.5 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
                      <span>Reset Standar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveSettings()}
                      disabled={saving}
                      className="px-4 py-2 bg-gradient-to-r from-[#531FFF] to-[#7B42FF] text-white hover:shadow-lg hover:shadow-[#531FFF]/25 active:scale-[0.98] text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-md shadow-[#531FFF]/25 disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5 text-white" />
                          <span>Simpan Penilaian &amp; KKM</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Main Content Card: Inputs & Formula */}
              <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-6">

              {/* KKM & Weight Slider Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-medium">
                <div className="p-4 rounded-lg bg-amber-50/60 border border-amber-200">
                  <label className="block font-bold text-amber-900 mb-1">Batas KKM Minimum</label>
                  <input 
                    type="number" 
                    value={grading.kkmScore}
                    onChange={(e) => setGrading({ ...grading, kkmScore: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-lg font-black text-amber-900"
                  />
                  <p className="text-[10px] text-amber-700 mt-1 font-medium">Skor minimal kelulusan matpel</p>
                </div>

                <div className="p-4 rounded-lg bg-purple-50/60 border border-purple-200">
                  <label className="block font-bold text-purple-900 mb-1">Bobot Tugas (%)</label>
                  <input 
                    type="number" 
                    value={grading.assignmentWeight}
                    onChange={(e) => setGrading({ ...grading, assignmentWeight: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-lg font-black text-purple-900"
                  />
                </div>

                <div className="p-4 rounded-lg bg-blue-50/60 border border-blue-200">
                  <label className="block font-bold text-blue-900 mb-1">Bobot UTS (%)</label>
                  <input 
                    type="number" 
                    value={grading.midtermWeight}
                    onChange={(e) => setGrading({ ...grading, midtermWeight: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg text-lg font-black text-blue-900"
                  />
                </div>

                <div className="p-4 rounded-lg bg-emerald-50/60 border border-emerald-200">
                  <label className="block font-bold text-emerald-900 mb-1">Bobot UAS (%)</label>
                  <input 
                    type="number" 
                    value={grading.finalWeight}
                    onChange={(e) => setGrading({ ...grading, finalWeight: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-lg font-black text-emerald-900"
                  />
                </div>
              </div>

              {/* Dynamic Formula Display Box */}
              <div className="p-5 rounded-lg bg-gray-900 text-white space-y-2 shadow-md">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-400">
                  FORMULA KALKULASI NILAI AKHIR RAPOR
                </span>
                <div className="text-sm font-mono font-bold text-white flex flex-wrap items-center gap-2">
                  <span>Nilai Akhir =</span>
                  <span className="bg-purple-800/80 px-2.5 py-1 rounded-md border border-purple-400/30">
                    (Tugas × {grading.assignmentWeight}%)
                  </span>
                  <span>+</span>
                  <span className="bg-blue-800/80 px-2.5 py-1 rounded-md border border-blue-400/30">
                    (UTS × {grading.midtermWeight}%)
                  </span>
                  <span>+</span>
                  <span className="bg-emerald-800/80 px-2.5 py-1 rounded-md border border-emerald-400/30">
                    (UAS × {grading.finalWeight}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

          {/* TAB 8: Roles & Permissions */}
          {(activeTab as string) === "roles" && (
            <div className="bg-white p-6 md:p-8 rounded-xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-6 animate-in fade-in duration-200">
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

                <Link href="/admin/roles" className="px-3.5 py-2 bg-[#531FFF] text-white rounded-lg text-xs font-bold hover:bg-[#4317CC] transition-all flex items-center gap-1.5 shrink-0 shadow-xs">
                  <ShieldCheck className="w-4 h-4" /> Kelola Detail Role →
                </Link>
              </div>

              {/* Permission Matrix Table */}
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
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
                            className="w-4 h-4 accent-[#531FFF] rounded cursor-pointer"
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
                            className="w-4 h-4 accent-[#531FFF] rounded cursor-pointer"
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
                            className="w-4 h-4 accent-[#531FFF] rounded cursor-pointer"
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
                            className="w-4 h-4 accent-[#531FFF] rounded cursor-pointer"
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
            <div className="bg-white p-6 md:p-8 rounded-xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-6 animate-in fade-in duration-200">
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
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
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
                            className="px-3 py-1.5 bg-gray-100 hover:bg-[#F3F0FF] text-gray-700 hover:text-[#531FFF] rounded-lg text-xs font-bold transition-all border border-gray-200"
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
            <div className="bg-white p-6 md:p-8 rounded-xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-6 animate-in fade-in duration-200">
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
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Session Timeout (Menit Inaktif)</label>
                  <input 
                    type="number" 
                    value={security.sessionTimeoutMinutes}
                    onChange={(e) => setSecurity({ ...security, sessionTimeoutMinutes: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 font-bold"
                  />
                </div>
              </div>

              <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-900">Autentikasi Dua Faktor (2FA)</p>
                  <p className="text-[10px] text-gray-500">Wajibkan verifikasi OTP untuk akun Administrator & Guru</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={security.enable2FA}
                  onChange={(e) => setSecurity({ ...security, enable2FA: e.target.checked })}
                  className="w-5 h-5 accent-[#531FFF] rounded cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 16: System Preferences */}
          {(activeTab as string) === "preferences" && (
            <div className="bg-white p-6 md:p-8 rounded-xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-6 animate-in fade-in duration-200">
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
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg font-bold text-gray-900"
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
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg font-bold text-gray-900"
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
            <div className="bg-white p-6 md:p-8 rounded-xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-6 animate-in fade-in duration-200">
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
              <div className="p-5 rounded-lg bg-purple-50/60 border border-purple-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-purple-900">Ekspor Arsip Lengkap Sekolah</h4>
                  <p className="text-[11px] text-purple-700 mt-0.5">Unduh seluruh database siswa, nilai, dan absensi dalam format ZIP / CSV.</p>
                </div>
                <button 
                  onClick={() => {
                    if (showInfo) showInfo("Menyiapkan unduhan arsip data sekolah (ZIP)...", "Ekspor Data");
                  }}
                  className="px-4 py-2 bg-[#531FFF] text-white rounded-lg text-xs font-bold hover:bg-[#4317CC] transition-all flex items-center gap-1.5 shadow-xs"
                >
                  <Download className="w-4 h-4" /> Unduh Arsip ZIP
                </button>
              </div>

              {/* Danger Zone Box */}
              <div className="p-5 rounded-lg bg-rose-50 border border-rose-200 space-y-3">
                <div className="flex items-center gap-2 text-rose-700 font-black text-xs">
                  <AlertTriangle className="w-4 h-4" /> DANGER ZONE - PEMBERSIHAN DATA
                </div>
                <p className="text-xs text-rose-800">
                  Tindakan ini akan mengosongkan seluruh data pengujian dan mereset sistem ke pengaturan awal pabrik.
                </p>
                <button
                  onClick={() => setShowPurgeModal(true)}
                  className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition-all shadow-xs cursor-pointer"
                >
                  Purge Data & Reset Pabrik
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 4. TAB TIME PRESETS (TEMPLATE JAM & SESI)                                 */}
          {/* ========================================================================= */}
          {activeTab === "time_presets" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header Banner - Clean 2-Row Architecture */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.04)] space-y-4">
                {/* Top Row: Icon, Title, Status & Count Quick Chip */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20 shrink-0 mt-0.5 sm:mt-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                          Template Jam Pelajaran &amp; Ujian
                        </h2>
                        <span className="px-2.5 py-0.5 text-[11px] font-extrabold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200 flex items-center gap-1.5 shrink-0">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          Penjadwalan KBM &amp; Ujian
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1 leading-relaxed">
                        Kelola pilihan preset jam cepat yang digunakan pada formulir Jadwal Ujian dan Jadwal Pelajaran (KBM) sekolah.
                      </p>
                    </div>
                  </div>

                  {/* Preset Count Metric Chip */}
                  <div className="hidden lg:flex items-center gap-2 self-start lg:self-center shrink-0">
                    <div className="px-3.5 py-1.5 bg-indigo-50/70 border border-indigo-200/80 rounded-xl flex items-center gap-2 text-xs">
                      <span className="text-indigo-600 font-medium">Preset Aktif:</span>
                      <strong className="text-indigo-950 font-black text-sm">{timePresets.length}</strong>
                      <span className="text-indigo-300">•</span>
                      <span className="text-indigo-800 font-mono font-bold text-[11px]">
                        {timePresets[0]?.startTime || "07:00"}–{timePresets[timePresets.length - 1]?.endTime || "16:00"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Row / Toolbar: Helper Info on Left + Action Buttons on Right */}
                <div className="pt-3.5 border-t border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-50 text-amber-600 text-[11px] font-bold shrink-0">
                      💡
                    </span>
                    <span className="line-clamp-1">
                      Preset jam memudahkan guru dan admin saat menyusun jadwal pelajaran tanpa mengetik jam secara manual.
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
                    <button
                      type="button"
                      onClick={handleResetPresets}
                      className="px-3.5 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      title="Kembalikan ke 5 preset standar sistem"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
                      <span>Reset Standar</span>
                    </button>

                    {!isAddingPreset && !editingPresetId && (
                      <button
                        type="button"
                        onClick={handleStartAddPreset}
                        className="px-4 py-2 bg-gradient-to-r from-[#531FFF] to-[#7B42FF] text-white hover:shadow-lg hover:shadow-[#531FFF]/25 active:scale-[0.98] text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-md shadow-[#531FFF]/25"
                      >
                        <Plus className="w-3.5 h-3.5 text-white" />
                        <span>Tambah Preset Baru</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Main Content Card */}
              <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-6">

              {/* Summary Stats Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 bg-purple-50/60 border border-purple-200 rounded-xl">
                  <span className="text-[11px] text-purple-700 font-bold uppercase tracking-wider block mb-1">
                    Total Template Jam
                  </span>
                  <div className="text-xl font-black text-purple-950 flex items-baseline gap-1.5">
                    {timePresets.length} <span className="text-xs font-semibold text-purple-600">Preset Aktif</span>
                  </div>
                </div>

                <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl">
                  <span className="text-[11px] text-blue-700 font-bold uppercase tracking-wider block mb-1">
                    Rentang Waktu KBM / Ujian
                  </span>
                  <div className="text-xl font-black text-blue-950 flex items-baseline gap-1.5">
                    {timePresets[0]?.startTime || "07:00"} – {timePresets[timePresets.length - 1]?.endTime || "16:00"}
                  </div>
                </div>

                <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                  <span className="text-[11px] text-emerald-700 font-bold uppercase tracking-wider block mb-1">
                    Sinkronisasi Modul
                  </span>
                  <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5 mt-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    Tersambung ke Ujian & Jadwal
                  </div>
                </div>
              </div>

              {/* Form Add / Edit */}
              {(isAddingPreset || editingPresetId) && (
                <form
                  onSubmit={handleSavePreset}
                  className="p-5 bg-purple-50/40 border-2 border-purple-200 rounded-xl space-y-4 animate-in fade-in"
                >
                  <div className="flex items-center justify-between border-b border-purple-200/80 pb-2.5">
                    <span className="font-bold text-purple-950 text-xs flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-[#531FFF]" />
                      {editingPresetId ? "Edit Template Jam" : "Tambah Template Jam Baru"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingPreset(false);
                        setEditingPresetId(null);
                      }}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Nama Sesi / Label</label>
                      <input
                        type="text"
                        required
                        value={presetFormData.name}
                        onChange={(e) => setPresetFormData({ ...presetFormData, name: e.target.value })}
                        placeholder="Contoh: Sesi 1 / Jam Ke-1"
                        className="w-full px-3 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Jam Mulai</label>
                      <input
                        type="time"
                        required
                        value={presetFormData.startTime}
                        onChange={(e) => setPresetFormData({ ...presetFormData, startTime: e.target.value })}
                        className="w-full px-3 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Jam Selesai</label>
                      <input
                        type="time"
                        required
                        value={presetFormData.endTime}
                        onChange={(e) => setPresetFormData({ ...presetFormData, endTime: e.target.value })}
                        className="w-full px-3 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] text-center"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Keterangan / Catatan (Opsional)</label>
                      <input
                        type="text"
                        value={presetFormData.description}
                        onChange={(e) => setPresetFormData({ ...presetFormData, description: e.target.value })}
                        placeholder="Contoh: Sesi Pagi / Ujian Teori"
                        className="w-full px-3 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                      />
                    </div>
                    <div className="flex items-end">
                      <div className="w-full px-3.5 py-2.5 bg-purple-100/60 rounded-lg border border-purple-200 text-xs text-purple-900 font-medium">
                        Durasi Pelaksanaan:{" "}
                        <span className="font-bold text-purple-950">
                          {calculateDuration(presetFormData.startTime, presetFormData.endTime)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1 border-t border-purple-200/50">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingPreset(false);
                        setEditingPresetId(null);
                      }}
                      className="px-3 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={savingPreset}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#531FFF] hover:bg-[#4317CC] rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      {editingPresetId ? "Simpan Perubahan Preset" : "Tambahkan Preset Baru"}
                    </button>
                  </div>
                </form>
              )}

              {/* Table of Presets */}
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50 font-bold text-gray-700">
                    <tr>
                      <th className="py-3 px-4 w-14 text-center">No</th>
                      <th className="py-3 px-4">Nama Sesi</th>
                      <th className="py-3 px-4">Rentang Waktu</th>
                      <th className="py-3 px-4">Durasi</th>
                      <th className="py-3 px-4">Keterangan</th>
                      <th className="py-3 px-4 text-right w-28">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-700 bg-white">
                    {timePresets.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-gray-400">
                          Belum ada template jam. Klik "Reset Standar" atau "Tambah Preset Baru" di atas.
                        </td>
                      </tr>
                    ) : (
                      timePresets.map((preset, idx) => (
                        <tr key={preset.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3 px-4 text-center text-gray-400 font-bold">{idx + 1}</td>
                          <td className="py-3 px-4 font-bold text-gray-900">{preset.name}</td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 text-[#531FFF] border border-purple-100 font-mono font-bold text-xs">
                              <Clock className="w-3 h-3" />
                              {preset.startTime} – {preset.endTime}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-700 font-semibold">
                            {calculateDuration(preset.startTime, preset.endTime)}
                          </td>
                          <td className="py-3 px-4 text-gray-500 text-[11px]">
                            {preset.description || "-"}
                          </td>
                          <td className="py-3 px-4 text-right space-x-1">
                            <button
                              type="button"
                              onClick={() => handleStartEditPreset(preset)}
                              className="p-1.5 text-gray-500 hover:text-[#531FFF] hover:bg-purple-50 rounded-md transition-colors cursor-pointer"
                              title="Edit Preset"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePreset(preset.id, preset.name)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                              title="Hapus Preset"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Preview Chips */}
              <div className="p-4 bg-gray-50/80 border border-gray-200 rounded-xl space-y-2">
                <div className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#531FFF]" />
                  Pratinjau Tampilan Chip pada Form Jadwal Ujian & Pelajaran
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {timePresets.map((preset) => (
                    <div
                      key={preset.id}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-gray-700 border border-gray-200 flex items-center gap-1.5 shadow-2xs"
                    >
                      <span className="font-mono text-[#531FFF]">{preset.startTime}–{preset.endTime}</span>
                      <span className="text-[10px] text-gray-400">({preset.name})</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-gray-500 pt-1">
                  Tombol chip di atas dapat langsung diklik oleh pengguna di form Jadwal Ujian dan Jadwal Pelajaran untuk mengisi jam secara otomatis tanpa perlu mengetik manual.
                </p>
              </div>

              {/* Notice info */}
              <div className="flex items-start gap-3 p-4 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 text-xs leading-relaxed">
                <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold mb-0.5">Integrasi Sistem Terpadu</h4>
                  <p>
                    Setiap penambahan, pengubahan, atau penghapusan template jam akan otomatis tersinkronisasi
                    secara real-time ke seluruh akun pengguna dan halaman Jadwal Ujian maupun Jadwal Pelajaran. Pengguna
                    tetap bebas mengubah jam mulai atau selesai secara manual apabila terdapat jadwal ujian/kelas di luar preset.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

          {/* ========================================================================= */}
          {/* 5. TAB PENGATURAN PEMBAYARAN SPP                                          */}
          {/* ========================================================================= */}
          {activeTab === "spp_config" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <SPPPaymentSettings />
            </div>
          )}

          {/* Render Default Placeholder for Other Active Tabs */}
          {!["profile", "branding", "attendance", "grading", "roles", "history", "security", "preferences", "privacy", "time_presets", "spp_config", "academic_stage"].includes(activeTab) && (
            <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] text-center space-y-4">
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
                className="px-5 py-2.5 bg-[#531FFF] text-white rounded-lg text-xs font-bold hover:bg-[#4317CC] transition-all shadow-xs"
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
          <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-10 animate-in zoom-in-95 duration-200">
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
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 space-y-1">
                <p className="font-bold text-gray-900">{selectedAuditLog.summary}</p>
                <p className="text-gray-500">Oleh {selectedAuditLog.user} ({selectedAuditLog.role}) • {selectedAuditLog.timestamp}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 space-y-1">
                  <span className="text-[10px] font-bold text-rose-700 uppercase">Sebelum (Before)</span>
                  <pre className="text-[11px] text-rose-900 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(selectedAuditLog.before, null, 2)}
                  </pre>
                </div>

                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 space-y-1">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase">Sesudah (After)</span>
                  <pre className="text-[11px] text-emerald-900 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(selectedAuditLog.after, null, 2)}
                  </pre>
                </div>
              </div>

              <button 
                onClick={() => setSelectedAuditLog(null)}
                className="w-full py-2.5 bg-gray-900 text-white rounded-lg font-bold hover:bg-gray-800 transition-all"
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
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-gray-100 p-6 z-10 space-y-4 text-center">
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
                className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200"
              >
                Batal
              </button>
              <button 
                onClick={() => {
                  setShowPurgeModal(false);
                  if (showError) showError("Pembersihan data dibatalkan demi keamanan!", "Perhatian Security");
                }}
                className="w-full py-2.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 shadow-md"
              >
                Konfirmasi Purge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VOCATIONAL PROGRAM MODAL (SMK JURUSAN CRUD) */}
      {showVocationalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" 
            onClick={() => !savingVocational && setShowVocationalModal(false)} 
          />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-10 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-50 via-white to-purple-50/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center border border-[#531FFF]/20">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900">
                    {editingVocationalProgram ? "Ubah Program Keahlian (Jurusan)" : "Tambah Jurusan Baru"}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    {editingVocationalProgram ? `Mengedit jurusan ${editingVocationalProgram.code}` : "Tambahkan program keahlian baru untuk jenjang SMK"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => !savingVocational && setShowVocationalModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Kode Jurusan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: RPL"
                    value={vocationalForm.code}
                    onChange={(e) => setVocationalForm({ ...vocationalForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/20 outline-none transition-all uppercase"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Singkatan / Akronim</p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Nama Program Keahlian <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Rekayasa Perangkat Lunak"
                    value={vocationalForm.name}
                    onChange={(e) => setVocationalForm({ ...vocationalForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/20 outline-none transition-all"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Nama lengkap jurusan</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Bidang / Sektor Keahlian
                </label>
                <select
                  value={vocationalForm.field}
                  onChange={(e) => setVocationalForm({ ...vocationalForm, field: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:bg-white focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/20 outline-none transition-all"
                >
                  <option value="Teknologi Informasi & Komunikasi">Teknologi Informasi & Komunikasi (TIK)</option>
                  <option value="Bisnis dan Manajemen">Bisnis dan Manajemen (Bismen)</option>
                  <option value="Teknologi Manufaktur dan Rekayasa">Teknologi Manufaktur dan Rekayasa (Teknik Mesin/Otomotif)</option>
                  <option value="Seni dan Ekonomi Kreatif">Seni dan Ekonomi Kreatif (DKV / Multimedia)</option>
                  <option value="Energi dan Pertambangan">Energi dan Pertambangan (Listrik / Elektronika)</option>
                  <option value="Kesehatan dan Pekerjaan Sosial">Kesehatan dan Pekerjaan Sosial (Farmasi / Keperawatan)</option>
                  <option value="Pariwisata">Pariwisata (Perhotelan / Kuliner / Tata Boga)</option>
                  <option value="Agribisnis dan Agriteknologi">Agribisnis dan Agriteknologi (Pertanian / Peternakan)</option>
                  <option value="Lainnya">Bidang Lainnya</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Kepala Program (Kaprog)
                  </label>
                  <input
                    type="text"
                    placeholder="Nama Kaprog / Koordinator"
                    value={vocationalForm.headOfProgram}
                    onChange={(e) => setVocationalForm({ ...vocationalForm, headOfProgram: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:bg-white focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/20 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Status Program
                  </label>
                  <select
                    value={vocationalForm.status}
                    onChange={(e) => setVocationalForm({ ...vocationalForm, status: e.target.value as "Aktif" | "Non-Aktif" })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:bg-white focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/20 outline-none transition-all"
                  >
                    <option value="Aktif">Aktif (Dapat dipilih di kelas & siswa)</option>
                    <option value="Non-Aktif">Non-Aktif</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Deskripsi / Keterangan Singkat
                </label>
                <textarea
                  rows={2}
                  placeholder="Keterangan kompetensi atau fokus kurikulum jurusan..."
                  value={vocationalForm.description}
                  onChange={(e) => setVocationalForm({ ...vocationalForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:bg-white focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/20 outline-none transition-all resize-none"
                />
              </div>

              <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl flex items-start gap-2.5 text-xs text-purple-900">
                <Sparkles className="w-4 h-4 text-[#531FFF] shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  Program keahlian ini akan langsung tersedia di menu pembuatan kelas, pemilihan jurusan siswa, dan pembagian mata pelajaran kejuruan.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={savingVocational}
                onClick={() => setShowVocationalModal(false)}
                className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition-all cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={savingVocational}
                onClick={handleSaveVocationalForm}
                className="px-5 py-2.5 bg-[#531FFF] text-white rounded-xl text-xs font-bold hover:bg-[#4317CC] transition-all shadow-md shadow-purple-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {savingVocational ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>{editingVocationalProgram ? "Simpan Perubahan" : "Tambah Program"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
