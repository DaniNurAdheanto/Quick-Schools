"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  UserCheck,
  CheckCircle2,
  MapPin,
  Camera,
  Search,
  Download,
  Printer,
  ChevronRight,
  FileText,
  ShieldCheck,
  CalendarDays,
  Plus,
  Trash2,
  Edit2,
  X,
  LogOut,
  LogIn,
  Users,
  Activity,
  RefreshCw,
  RotateCcw,
  ScanFace,
  Eye,
  Maximize2,
  ExternalLink,
  AlertTriangle,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfileAvatar } from "@/components/ui/profile-avatar";

import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { isStudentRole } from "@/lib/roles-config";
import { formatDistance } from "@/lib/geofence-utils";
import {
  acquireCurrentLocation,
  GeolocationErrorState
} from "@/lib/geolocation-service";
import { PageContentSkeleton } from "@/components/ui/role-loading-skeleton";
import {
  useTeacherAttendance,
  TeacherAttendanceRecord,
  TeacherAttendanceStatus,
  formatDurationMinutes,
  getTodayDateString,
} from "@/lib/teacher-attendance";
import { useUnifiedTeachers } from "@/hooks/use-unified-teachers";

export default function TeacherAttendancePage() {
  const { showSuccess, showError } = useToast();
  const {
    user: authUser,
    userData: authUserData,
    isGuru: authIsGuru,
    role: authRole,
    rawRole: authRawRole,
    userName: authUserName,
    userEmail: authUserEmail,
    isAuthLoading,
    isRoleReady,
    isKepalaSekolah,
    rolePermissions,
  } = useAuth();

  // Auth & Role
  const currentUser = authUserData;
  const resolvedRole = (authRawRole || authRole || "").toLowerCase();
  const { teachers: unifiedTeachers } = useUnifiedTeachers();
  const [teachersList, setTeachersList] = useState<any[]>([]);

  // Determine whether current authenticated user is a teacher
  const isUserGuru = Boolean(
    authIsGuru ||
    resolvedRole === "guru" ||
    resolvedRole === "teacher"
  );
  const canMutateAttendance = !isKepalaSekolah || Boolean(rolePermissions?.attendance?.write);

  // Active teacher UID & Email from auth / database
  const activeTeacherUid = authUser?.uid || currentUser?.uid || "";
  const activeTeacherEmail = authUserEmail || authUser?.email || currentUser?.email || "";

  // Simulation / View switcher for testing (Only accessible to Admins)
  const [previewRole, setPreviewRole] = useState<"admin" | "guru">(isUserGuru ? "guru" : "admin");

  // If user is actually guru, keep previewRole to guru
  useEffect(() => {
    if (isUserGuru) {
      setPreviewRole("guru");
    }
  }, [isUserGuru]);

  const isStudent = isStudentRole(resolvedRole) || isStudentRole(authRole);
  const router = useRouter();

  useEffect(() => {
    if (isStudent) {
      router.replace("/admin/attendance");
    }
  }, [isStudent, router]);

  // Hook for Teacher Attendance - directly connected to Firestore teacher_attendance
  const {
    records,
    config,
    todayTeacherRecord,
    loading: isAttendanceLoading,
    clockIn,
    clockOut,
    submitPermit,
    adminSaveRecord,
    adminDeleteRecord,
  } = useTeacherAttendance(activeTeacherUid, activeTeacherEmail);

  // Active Tab for Admin
  const [activeAdminTab, setActiveAdminTab] = useState<"today" | "monthly" | "permits" | "settings">("today");

  // Live Digital Clock state
  const [nowDate, setNowDate] = useState(new Date());

  // Clock In / Clock Out Form State
  const [isClockInModalOpen, setIsClockInModalOpen] = useState(false);
  const [isClockOutModalOpen, setIsClockOutModalOpen] = useState(false);
  const [isPermitModalOpen, setIsPermitModalOpen] = useState(false);
  const [isManualRecordModalOpen, setIsManualRecordModalOpen] = useState(false);

  // Form Inputs
  const [actionNotes, setActionNotes] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Drawer state for viewing teacher attendance detail & verification photos
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<{
    teacher: any;
    record: TeacherAttendanceRecord | null;
  } | null>(null);

  // Photo Lightbox modal state
  const [zoomedPhoto, setZoomedPhoto] = useState<{ url: string; title: string } | null>(null);

  // Geofence & Location State (matches Student Attendance coordinates)
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsErrorState, setGpsErrorState] = useState<GeolocationErrorState | null>(null);
  const [locationData, setLocationData] = useState<{
    lat: number;
    lng: number;
    distance: number;
    inRadius: boolean;
    address: string;
    accuracy?: number;
  }>({
    lat: -6.200000,
    lng: 106.816666,
    distance: 0,
    inRadius: false,
    address: "SMART SCHOOL OS Campus - Area Utama Sekolah",
  });

  // Camera State & Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Live Location Tracker with two-tier fallback and friendly Indonesian error messages
  const refreshLocation = useCallback(async () => {
    setGpsLoading(true);
    setGpsError(null);
    setGpsErrorState(null);

    const schoolLat = Number(config.geofenceCenter?.lat ?? -6.200000);
    const schoolLng = Number(config.geofenceCenter?.lng ?? 106.816666);
    const radius = Number(config.geofenceCenter?.radiusMeters ?? 100);

    try {
      const res = await acquireCurrentLocation(schoolLat, schoolLng, radius);
      setLocationData({
        lat: res.lat,
        lng: res.lng,
        distance: res.distanceMeters,
        inRadius: res.inRadius,
        address: config.geofenceCenter.address || "SMART SCHOOL OS Campus - Area Utama Sekolah",
        accuracy: res.accuracy,
      });
      setGpsError(null);
      setGpsErrorState(null);
    } catch (err: any) {
      console.warn("GPS Geolocation error:", err);
      const errorMsg = err?.message || "Gagal mendeteksi lokasi GPS perangkat.";
      setGpsError(errorMsg);
      setGpsErrorState(err);

      // Keep location data with fallback status
      setLocationData((prev) => ({
        ...prev,
        distance: prev.distance || 0,
        inRadius: !config.geofenceEnabled,
      }));
    } finally {
      setGpsLoading(false);
    }
  }, [config.geofenceCenter, config.geofenceEnabled]);

  // Trigger GPS refresh on mount and whenever config updates
  useEffect(() => {
    refreshLocation();
  }, [refreshLocation]);

  // Camera Lifecycle
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          try {
            await videoRef.current.play();
          } catch (e) {
            console.warn("Video play error:", e);
          }
        }
        setCameraActive(true);
      } else {
        setCameraError("Peramban tidak mendukung akses kamera langsung.");
      }
    } catch (err: any) {
      console.warn("Camera access error:", err);
      setCameraError("Akses kamera ditolak atau tidak tersedia pada perangkat.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  // Re-attach video stream if videoRef updates
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream, isClockInModalOpen, isClockOutModalOpen]);

  // Take Snapshot from live video feed into canvas with watermark (scaled to max 480px for Firestore safety)
  const handleCapturePhoto = (type: "CLOCK IN" | "CLOCK OUT") => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const vWidth = video.videoWidth || 640;
      const vHeight = video.videoHeight || 480;
      const maxDimension = 480;
      const ratio = vHeight / vWidth;
      const targetW = Math.min(maxDimension, vWidth);
      const targetH = Math.round(targetW * ratio);

      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Flip horizontally for natural mirror selfie
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, targetW, targetH);

      // Watermark bar at the bottom
      ctx.scale(-1, 1);
      ctx.translate(-canvas.width, 0);
      const barHeight = Math.max(38, Math.round(targetH * 0.16));
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);

      // Watermark text line 1: Name, NIP, Type, Time
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px sans-serif";
      const nowTimeStr = new Date().toLocaleTimeString("id-ID");
      const teacherName = currentTeacherInfo?.name || "Bapak/Ibu Guru";
      const teacherNip = currentTeacherInfo?.nip || "-";
      ctx.fillText(`${teacherName} (${teacherNip}) • ${type} • ${nowTimeStr} WIB`, 10, canvas.height - (barHeight / 2) - 2);

      // Watermark text line 2: Address & GPS coordinate
      ctx.fillStyle = "#a5b4fc";
      ctx.font = "9px sans-serif";
      const shortAddr = (config.geofenceCenter.address || "Area Sekolah").slice(0, 40);
      ctx.fillText(`Presensi • ${shortAddr} • GPS: ${locationData.lat.toFixed(4)}, ${locationData.lng.toFixed(4)}`, 10, canvas.height - 4);

      // Compressed JPEG at 0.65 quality (~20KB payload) to prevent Firestore 1MB document limit
      const dataUrl = canvas.toDataURL("image/jpeg", 0.65);
      setPhotoPreview(dataUrl);
      stopCamera();
    } catch (err) {
      console.error("Capture photo error:", err);
    }
  };

  const handleRetakePhoto = () => {
    setPhotoPreview(null);
    startCamera();
  };

  // Fallback file upload with automatic compression
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDimension = 480;
        const ratio = img.height / img.width;
        const targetW = Math.min(maxDimension, img.width);
        const targetH = Math.round(targetW * ratio);

        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, targetW, targetH);
          const compressed = canvas.toDataURL("image/jpeg", 0.65);
          setPhotoPreview(compressed);
          stopCamera();
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Modal Openers with camera & GPS activation
  const openClockInModal = () => {
    setPhotoPreview(null);
    setActionNotes("");
    setIsClockInModalOpen(true);
    refreshLocation();
    startCamera();
  };

  const closeClockInModal = () => {
    setIsClockInModalOpen(false);
    stopCamera();
    setPhotoPreview(null);
  };

  const openClockOutModal = () => {
    setPhotoPreview(null);
    setActionNotes("");
    setIsClockOutModalOpen(true);
    refreshLocation();
    startCamera();
  };

  const closeClockOutModal = () => {
    setIsClockOutModalOpen(false);
    stopCamera();
    setPhotoPreview(null);
  };

  // Permit Form
  const [permitForm, setPermitForm] = useState({
    date: getTodayDateString(),
    status: "Izin" as "Izin" | "Sakit" | "Cuti",
    reason: "",
    permitDocUrl: "",
  });

  // Manual Record Form (Admin)
  const [manualRecord, setManualRecord] = useState<Partial<TeacherAttendanceRecord>>({
    teacherId: "",
    teacherName: "",
    nip: "",
    subject: "",
    date: getTodayDateString(),
    status: "Hadir",
    workDurationMinutes: 480,
    workDurationFormatted: "8 jam",
  });

  // Filters for Admin Today Table
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [selectedAdminDate, setSelectedAdminDate] = useState(() => getTodayDateString());

  // Filters for Monthly Recap
  const [monthlyMonth, setMonthlyMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  // Setup Live Digital Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setNowDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Synchronize teachers from unified database source
  useEffect(() => {
    setTeachersList(unifiedTeachers);
  }, [unifiedTeachers]);

  // Identify current teacher info directly from active authenticated user & database
  const currentTeacherInfo = useMemo(() => {
    const activeUid = authUser?.uid || currentUser?.uid;
    const activeEmail = (authUserEmail || authUser?.email || currentUser?.email || "").toLowerCase();
    const activeName = (authUserData?.fullName || authUserData?.name || authUserName || currentUser?.displayName || "").trim();
    const activeNip = (authUserData?.nip || authUserData?.id || "").trim();
    const activeSubject = authUserData?.subject || authUserData?.role || "";

    // 1. Try finding matching teacher record in teachersList
    const matched = teachersList.find(
      (t) =>
        (activeUid && (t.uid === activeUid || t.id === activeUid || t._firestoreId === activeUid)) ||
        (activeEmail && t.email?.toLowerCase() === activeEmail) ||
        (activeNip && activeNip !== "-" && (t.nip === activeNip || t.id === activeNip))
    );

    if (matched) {
      return {
        id: matched.id || activeUid,
        uid: matched.uid || activeUid,
        name: matched.name || activeName || "Guru",
        nip: matched.nip || activeNip || "-",
        subject: matched.subject || activeSubject || "Tenaga Pendidik",
        email: matched.email || activeEmail,
        phone: matched.phone || authUserData?.phone || "",
        imageUrl: matched.imageUrl || matched.photoUrl || authUserData?.imageUrl || authUserData?.photoUrl || "",
      };
    }

    // 2. If logged-in user exists, use their real profile
    if (activeUid) {
      return {
        id: activeUid,
        uid: activeUid,
        name: activeName || "Guru Pengajar",
        nip: activeNip || "-",
        subject: activeSubject || "Tenaga Pendidik",
        email: activeEmail,
        phone: authUserData?.phone || "",
        imageUrl: authUserData?.imageUrl || authUserData?.photoUrl || "",
      };
    }

    // 3. Fallback for unauthenticated admin preview
    if (teachersList.length > 0) {
      return teachersList[0];
    }

    return null;
  }, [authUser, authUserData, authUserName, authUserEmail, currentUser, teachersList]);

  // Today string
  const todayDateStr = useMemo(() => getTodayDateString(), []);

  // Compute Selected Date's Records for Admin Table & Metrics
  const todayRecords = useMemo(() => {
    const targetDate = selectedAdminDate || todayDateStr;
    return records.filter((r) => (r.date || "").slice(0, 10) === targetDate);
  }, [records, selectedAdminDate, todayDateStr]);

  // Effective Role (Role guru NEVER sees admin monitoring)
  const isEffectiveGuru = isUserGuru || previewRole === "guru";
  const isEffectiveAdmin = !isUserGuru && previewRole === "admin";

  // Compute Live Metrics for Admin
  const adminMetrics = useMemo(() => {
    const totalTeachers = Math.max(teachersList.length, 1);
    const presentToday = todayRecords.filter((r) => r.status === "Hadir" || r.status === "Terlambat" || r.status === "Pulang Awal");
    const onTimeToday = todayRecords.filter((r) => r.clockIn?.status === "Tepat Waktu" || r.status === "Hadir");
    const lateToday = todayRecords.filter((r) => r.clockIn?.status === "Terlambat" || r.status === "Terlambat");
    const permitToday = todayRecords.filter((r) => r.status === "Izin" || r.status === "Sakit" || r.status === "Cuti");
    const notClockedInCount = Math.max(0, totalTeachers - todayRecords.length);

    return {
      totalTeachers,
      presentCount: presentToday.length,
      presentPercent: Math.round((presentToday.length / totalTeachers) * 100),
      onTimeCount: onTimeToday.length,
      lateCount: lateToday.length,
      permitCount: permitToday.length,
      notClockedInCount,
    };
  }, [teachersList, todayRecords]);

  // Personal records of the logged in teacher
  const myPersonalRecords = useMemo(() => {
    const activeUid = authUser?.uid || currentUser?.uid;
    const activeEmail = (authUserEmail || authUser?.email || currentUser?.email || "").toLowerCase();
    const activeName = (authUserData?.fullName || authUserData?.name || authUserName || currentUser?.displayName || currentTeacherInfo?.name || "").toLowerCase().trim();
    const activeNip = (authUserData?.nip || currentTeacherInfo?.nip || "").trim();

    return records.filter((r) => {
      if (activeUid && (r.teacherId === activeUid || (r as any).uid === activeUid || r.id.includes(activeUid))) return true;
      if (activeEmail && r.email && r.email.toLowerCase() === activeEmail) return true;
      if (activeNip && activeNip !== "-" && r.nip && r.nip === activeNip) return true;
      if (activeName && r.teacherName && r.teacherName.toLowerCase().trim() === activeName) return true;
      return false;
    });
  }, [records, authUser, currentUser, authUserEmail, authUserData, authUserName, currentTeacherInfo]);

  // Current Teacher's Personal Monthly Stats - calculated directly from database records
  const myMonthlyStats = useMemo(() => {
    const presentCount = myPersonalRecords.filter((r) => r.status === "Hadir" || r.status === "Terlambat").length;
    const lateCount = myPersonalRecords.filter((r) => r.status === "Terlambat").length;
    const totalMinutes = myPersonalRecords.reduce((acc, r) => acc + (r.workDurationMinutes || 0), 0);

    return {
      totalDays: myPersonalRecords.length,
      presentCount,
      lateCount,
      totalDurationFormatted: formatDurationMinutes(totalMinutes),
      avgDailyMinutes: myPersonalRecords.length > 0 ? Math.round(totalMinutes / myPersonalRecords.length) : 0,
    };
  }, [myPersonalRecords]);

  // Unique subjects for filter
  const subjectList = useMemo(() => {
    const s = new Set<string>();
    teachersList.forEach((t) => {
      if (t.subject) s.add(t.subject);
    });
    return Array.from(s);
  }, [teachersList]);

  // Filtered Records for Admin Table with complete matching & unmatched preservation
  const filteredTodayRecords = useMemo(() => {
    const matchedRecordIds = new Set<string>();
    const targetDate = selectedAdminDate || todayDateStr;

    const rows = teachersList.map((teacher) => {
      const rec = todayRecords.find((r) => {
        const rDate = (r.date || "").slice(0, 10);
        if (rDate !== targetDate) return false;

        const rTeacherId = r.teacherId || "";
        const rUid = (r as any).uid || "";
        const rEmail = (r.email || "").toLowerCase().trim();
        const rNip = (r.nip || "").trim();
        const rName = (r.teacherName || "").toLowerCase().trim();

        if (teacher.id && (rTeacherId === teacher.id || r.id === `TA_${teacher.id}_${targetDate}` || r.id.includes(teacher.id))) return true;
        if (teacher.uid && (rTeacherId === teacher.uid || rUid === teacher.uid || r.id === `TA_${teacher.uid}_${targetDate}` || r.id.includes(teacher.uid))) return true;
        if (teacher._firestoreId && (rTeacherId === teacher._firestoreId || r.id.includes(teacher._firestoreId))) return true;
        if (teacher.email && rEmail && teacher.email.toLowerCase().trim() === rEmail) return true;
        if (teacher.nip && teacher.nip !== "-" && rNip && teacher.nip.trim() === rNip) return true;
        if (teacher.name && rName && teacher.name.toLowerCase().trim() === rName) return true;
        return false;
      });

      if (rec) {
        matchedRecordIds.add(rec.id);
      }

      return {
        teacher,
        record: rec || null,
      };
    });

    // Also include any standalone todayRecords that didn't match teachersList so NO attendance is hidden
    todayRecords.forEach((r) => {
      const rDate = (r.date || "").slice(0, 10);
      if (rDate === targetDate && !matchedRecordIds.has(r.id)) {
        rows.push({
          teacher: {
            id: r.teacherId || r.id,
            uid: r.teacherId || r.id,
            name: r.teacherName || "Guru Pengajar",
            nip: r.nip || "-",
            subject: r.subject || "Guru Pengajar",
            email: r.email || "",
            phone: r.phone || "",
            status: "Aktif",
          },
          record: r,
        });
      }
    });

    return rows.filter(({ teacher, record }) => {
      // Search
      const matchSearch =
        (teacher.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (teacher.nip || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (teacher.subject || "").toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;

      // Subject Filter
      if (selectedSubjectFilter !== "all" && teacher.subject !== selectedSubjectFilter) {
        return false;
      }

      // Status Filter
      if (selectedStatusFilter !== "all") {
        if (selectedStatusFilter === "not_yet") {
          return !record || (!record.clockIn && record.status !== "Izin" && record.status !== "Sakit" && record.status !== "Cuti");
        }
        if (!record || record.status !== selectedStatusFilter) return false;
      }

      return true;
    });
  }, [teachersList, todayRecords, selectedAdminDate, todayDateStr, searchQuery, selectedSubjectFilter, selectedStatusFilter]);

  // Robust today teacher record resolver for Guru view
  const activeTodayRecord = useMemo(() => {
    if (todayTeacherRecord) return todayTeacherRecord;
    if (!currentTeacherInfo) return null;
    const targetId = currentTeacherInfo.id || currentTeacherInfo.uid || activeTeacherUid;
    const targetEmail = (currentTeacherInfo.email || activeTeacherEmail || "").toLowerCase().trim();
    const targetNip = (currentTeacherInfo.nip || "").trim();
    const targetName = (currentTeacherInfo.name || "").toLowerCase().trim();

    return (
      todayRecords.find((r) => {
        if (targetId && (r.teacherId === targetId || (r as any).uid === targetId || r.id === `TA_${targetId}_${todayDateStr}` || r.id.includes(targetId))) return true;
        if (targetEmail && r.email && r.email.toLowerCase().trim() === targetEmail) return true;
        if (targetNip && targetNip !== "-" && r.nip && r.nip.trim() === targetNip) return true;
        if (targetName && r.teacherName && r.teacherName.toLowerCase().trim() === targetName) return true;
        return false;
      }) || null
    );
  }, [todayTeacherRecord, todayRecords, currentTeacherInfo, activeTeacherUid, activeTeacherEmail, todayDateStr]);

  // Perform Clock In
  const handleExecuteClockIn = async () => {
    if (!currentTeacherInfo) return;

    // Prevent duplicate clock-in: if today's record already exists, block
    if (activeTodayRecord?.clockIn) {
      showError("Anda sudah melakukan Clock In hari ini. Clock In hanya dapat dilakukan satu kali per hari.");
      return;
    }

    // Strict Photo Enforcement: Guru wajib melakukan foto terlebih dahulu
    if (!photoPreview) {
      showError(
        "Foto selfie kehadiran wajib diambil terlebih dahulu sebelum melakukan konfirmasi absensi masuk.",
        "Foto Belum Diambil"
      );
      return;
    }

    // Geofence Radius Validation (Strict enforcement matching Student Attendance)
    if (config.geofenceEnabled && !locationData.inRadius) {
      const radiusLimit = Number(config.geofenceCenter?.radiusMeters ?? 100);
      const outsideDistance = Math.max(0, locationData.distance - radiusLimit);
      showError(
        `Clock In ditolak! Lokasi Anda berada ${formatDistance(locationData.distance)} dari titik sekolah (${outsideDistance}m di luar batas radius ${radiusLimit}m). Anda harus berada di dalam radius sekolah untuk melakukan absensi.`,
        "Di Luar Radius Sekolah"
      );
      return;
    }

    if (config.geofenceEnabled && (gpsLoading || gpsErrorState)) {
      showError(
        "Lokasi GPS belum terverifikasi atau izin lokasi belum aktif. Pastikan GPS aktif dan berada di area sekolah.",
        "GPS Belum Terverifikasi"
      );
      return;
    }

    const targetTeacherId = currentTeacherInfo.uid || currentTeacherInfo.id || authUser?.uid || currentUser?.uid;
    if (!targetTeacherId) {
      showError("Data identitas akun guru tidak ditemukan. Silakan login kembali.");
      return;
    }
    setSubmitting(true);
    try {
      await clockIn({
        teacherId: targetTeacherId,
        teacherName: currentTeacherInfo.name || authUserData?.fullName || authUserName || "Bapak/Ibu Guru",
        nip: currentTeacherInfo.nip || authUserData?.nip || "-",
        subject: currentTeacherInfo.subject || authUserData?.subject || "Guru Pengajar",
        email: currentTeacherInfo.email || authUserEmail || currentUser?.email || "",
        phone: currentTeacherInfo.phone || authUserData?.phone || "",
        photoUrl: photoPreview || undefined,
        location: {
          lat: locationData.lat,
          lng: locationData.lng,
          address: config.geofenceCenter.address,
          inRadius: locationData.inRadius,
          distanceMeters: locationData.distance,
        },
        notes: actionNotes || "Presensi masuk harian",
      });

      showSuccess("Clock In Berhasil! Waktu masuk dan foto Anda telah diverifikasi.");
      stopCamera();
      setIsClockInModalOpen(false);
      setActionNotes("");
      setPhotoPreview(null);
    } catch (err: any) {
      showError(err.message || "Gagal melakukan Clock In.");
    } finally {
      setSubmitting(false);
    }
  };

  // Perform Clock Out
  const handleExecuteClockOut = async () => {
    const targetRecord = activeTodayRecord || todayTeacherRecord;
    if (!targetRecord) {
      showError("Data Clock In hari ini tidak ditemukan untuk akun ini.");
      return;
    }

    // Strict Photo Enforcement: Guru wajib melakukan foto kepulangan terlebih dahulu
    if (!photoPreview) {
      showError(
        "Foto selfie kepulangan wajib diambil terlebih dahulu sebelum melakukan konfirmasi absensi pulang.",
        "Foto Belum Diambil"
      );
      return;
    }

    // Geofence Radius Validation (Strict enforcement matching Clock In)
    if (config.geofenceEnabled && !locationData.inRadius) {
      const radiusLimit = Number(config.geofenceCenter?.radiusMeters ?? 100);
      const outsideDistance = Math.max(0, locationData.distance - radiusLimit);
      showError(
        `Clock Out ditolak! Lokasi Anda berada ${formatDistance(locationData.distance)} dari titik sekolah (${outsideDistance}m di luar batas radius ${radiusLimit}m). Anda harus berada di dalam radius sekolah untuk melakukan absensi pulang.`,
        "Di Luar Radius Sekolah"
      );
      return;
    }

    if (config.geofenceEnabled && (gpsLoading || gpsErrorState)) {
      showError(
        "Lokasi GPS belum terverifikasi atau izin lokasi belum aktif. Pastikan GPS aktif dan berada di area sekolah.",
        "GPS Belum Terverifikasi"
      );
      return;
    }

    setSubmitting(true);
    try {
      await clockOut({
        recordId: targetRecord.id,
        photoUrl: photoPreview || "",
        location: {
          lat: locationData.lat,
          lng: locationData.lng,
          address: config.geofenceCenter.address,
          inRadius: locationData.inRadius,
          distanceMeters: locationData.distance,
        },
        notes: actionNotes || "Presensi pulang harian",
      });

      showSuccess("Clock Out Berhasil! Waktu pulang dan foto verifikasi telah tercatat ke sistem.");
      stopCamera();
      setIsClockOutModalOpen(false);
      setActionNotes("");
      setPhotoPreview(null);
    } catch (err: any) {
      console.error("Execute clockOut error:", err);
      showError(err.message || "Gagal melakukan Clock Out.");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Permit
  const handleSubmitPermit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTeacherInfo) return;
    const targetTeacherId = currentTeacherInfo.uid || currentTeacherInfo.id || authUser?.uid || currentUser?.uid;
    if (!targetTeacherId) {
      showError("Data identitas akun guru tidak ditemukan. Silakan login kembali.");
      return;
    }
    setSubmitting(true);
    try {
      await submitPermit({
        teacherId: targetTeacherId,
        teacherName: currentTeacherInfo.name || authUserData?.fullName || authUserName || "Bapak/Ibu Guru",
        nip: currentTeacherInfo.nip || authUserData?.nip || "-",
        subject: currentTeacherInfo.subject || authUserData?.subject || "Guru Pengajar",
        date: permitForm.date,
        status: permitForm.status,
        reason: permitForm.reason,
        permitDocUrl: permitForm.permitDocUrl,
      });

      showSuccess(`Pengajuan ${permitForm.status} berhasil disimpan dan dicatat ke sistem.`);
      setIsPermitModalOpen(false);
      setPermitForm({
        date: getTodayDateString(),
        status: "Izin",
        reason: "",
        permitDocUrl: "",
      });
    } catch (err: any) {
      showError(err.message || "Gagal menyimpan pengajuan.");
    } finally {
      setSubmitting(false);
    }
  };

  // Admin Manual Record Save
  const handleSaveManualRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canMutateAttendance) {
      showError("Akun Anda berstatus Monitoring Executive (Hanya Lihat). Anda tidak memiliki izin untuk mencatat presensi guru secara manual.");
      return;
    }
    if (!manualRecord.teacherId || !manualRecord.date) {
      showError("Pilih guru dan tanggal.");
      return;
    }
    const t = teachersList.find((x) => x.id === manualRecord.teacherId);
    const docId = `TA_${manualRecord.teacherId}_${manualRecord.date}`;

    await adminSaveRecord({
      id: docId,
      teacherId: manualRecord.teacherId,
      teacherName: t?.name || manualRecord.teacherName || "Guru",
      nip: t?.nip || manualRecord.nip || "-",
      subject: t?.subject || manualRecord.subject || "Guru Pengajar",
      date: manualRecord.date,
      clockIn: {
        time: "07:00:00",
        timestamp: new Date().toISOString(),
        status: "Tepat Waktu",
        notes: "Dicatat oleh Admin",
      },
      clockOut: {
        time: "15:30:00",
        timestamp: new Date().toISOString(),
        status: "Normal",
        notes: "Dicatat oleh Admin",
      },
      workDurationMinutes: 510,
      workDurationFormatted: "8j 30m",
      status: (manualRecord.status as TeacherAttendanceStatus) || "Hadir",
    });

    showSuccess("Presensi guru berhasil disimpan secara manual.");
    setIsManualRecordModalOpen(false);
  };

  // Export CSV for Admin
  const handleExportCSV = () => {
    const headers = [
      "No",
      "Nama Guru",
      "NIP",
      "Mata Pelajaran",
      "Tanggal",
      "Waktu Clock In",
      "Waktu Clock Out",
      "Durasi Kerja",
      "Status Kehadiran",
      "Catatan",
    ];

    const rows = filteredTodayRecords.map(({ teacher, record }, idx) => [
      idx + 1,
      `"${teacher.name}"`,
      `"${teacher.nip || "-"}"`,
      `"${teacher.subject || "-"}"`,
      record?.date || todayDateStr,
      record?.clockIn?.time || "-",
      record?.clockOut?.time || "-",
      record?.workDurationFormatted || "-",
      record?.status || "Belum Absen",
      `"${record?.clockIn?.notes || record?.permitReason || "-"}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encoded = encodeURI(csvContent);
    const a = document.createElement("a");
    a.href = encoded;
    a.download = `Presensi_Guru_${todayDateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showSuccess("Laporan presensi guru berhasil diekspor ke CSV!");
  };

  if (isAuthLoading || !isRoleReady || isAttendanceLoading) {
    return <PageContentSkeleton />;
  }

  if (isStudent) {
    return (
      <div className="p-8 text-center py-28 space-y-4 max-w-md mx-auto animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-2xl bg-purple-50 text-[#531FFF] flex items-center justify-center mx-auto shadow-sm">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-gray-900">Portal Khusus Tenaga Pendidik & Guru</h2>
        <p className="text-xs font-medium text-gray-500 leading-relaxed">
          Menu Presensi Guru dikhususkan untuk pendidik dan staf sekolah. Anda dialihkan ke halaman Presensi Siswa...
        </p>
        <Link
          href="/admin/attendance"
          className="inline-block px-5 py-2.5 bg-[#531FFF] hover:bg-[#4314cc] text-white rounded-lg font-bold text-xs shadow-md shadow-[#531FFF]/20 transition-all cursor-pointer"
        >
          Buka Presensi Siswa ➔
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto w-full space-y-6 pb-24 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & ROLE SIMULATOR BAR                                         */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 md:p-6 rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center shrink-0 shadow-2xs">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                Absensi Guru & Tenaga Kependidikan
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#531FFF]/10 text-[#531FFF] border border-[#531FFF]/20">
                Sistem Clock In & Clock Out
              </span>
            </div>
            <p className="text-xs md:text-sm text-gray-500 font-medium mt-0.5">
              Pencatatan jam masuk, jam pulang, verifikasi kehadiran, dan rekapitulasi kerja staf pendidik sekolah.
            </p>
          </div>
        </div>

        {/* View Switcher / Role Simulator (Hidden on role Guru) */}
        <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
          {!isUserGuru && (
            <div className="flex items-center p-1 bg-gray-100 rounded-xl border border-gray-200 text-xs font-bold">
              <button
                onClick={() => setPreviewRole("admin")}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                  previewRole === "admin"
                    ? "bg-[#531FFF] text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Monitoring Admin</span>
              </button>
              <button
                onClick={() => setPreviewRole("guru")}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                  previewRole === "guru"
                    ? "bg-[#531FFF] text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Portal Presensi Guru</span>
              </button>
            </div>
          )}

          <Link
            href="/admin/attendance"
            className="px-3.5 py-2 text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-all inline-flex items-center gap-1.5"
          >
            <span>Buka Absensi Siswa</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. GURU VIEW: CLOCK IN / CLOCK OUT INTERACTIVE HUB                         */}
      {/* ========================================================================= */}
      {isEffectiveGuru && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Main Clock In / Clock Out Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Interactive Clock In / Out Console */}
            <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden flex flex-col justify-between">
              {/* Background ambient lighting */}
              <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-[#531FFF]/30 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -left-16 -top-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

              <div className="space-y-4 relative z-10">
                {/* User Greeting & Date */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <span className="text-xs uppercase tracking-wider font-bold text-indigo-300 block">
                      Portal Presensi Guru Mandiri
                    </span>
                    <h2 className="text-xl font-black text-white mt-0.5">
                      {currentTeacherInfo?.name || "Bapak/Ibu Guru"}
                    </h2>
                    <p className="text-xs text-indigo-200/80 font-medium">
                      NIP: {currentTeacherInfo?.nip || "-"} • {currentTeacherInfo?.subject || "Tenaga Pendidik"}
                    </p>
                  </div>

                  <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/15 text-right self-start sm:self-auto">
                    <span className="text-[10px] uppercase font-bold text-indigo-200 block">Shift Kerja Standar</span>
                    <span className="font-mono text-sm font-black text-emerald-400">
                      {config.standardClockIn} - {config.standardClockOut} WIB
                    </span>
                  </div>
                </div>

                {/* Big Live Digital Clock Display */}
                <div className="py-4 text-center sm:text-left">
                  <span className="text-xs text-indigo-200 font-semibold block">Waktu Saat Ini (Real-time)</span>
                  <div className="font-mono text-4xl sm:text-6xl font-black tracking-tight text-white mt-1 drop-shadow-sm flex items-center justify-center sm:justify-start gap-1">
                    <span>{String(nowDate.getHours()).padStart(2, "0")}</span>
                    <span className="animate-pulse text-indigo-400">:</span>
                    <span>{String(nowDate.getMinutes()).padStart(2, "0")}</span>
                    <span className="animate-pulse text-indigo-400">:</span>
                    <span>{String(nowDate.getSeconds()).padStart(2, "0")}</span>
                    <span className="text-base sm:text-xl text-indigo-300 font-bold ml-2">WIB</span>
                  </div>
                  <p className="text-xs text-indigo-300/80 font-medium mt-1">
                    {nowDate.toLocaleDateString("id-ID", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>

                {/* Status Indicator Pill */}
                <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0",
                        activeTodayRecord?.clockOut
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : activeTodayRecord?.clockIn
                          ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      )}
                    >
                      {activeTodayRecord?.clockOut ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : activeTodayRecord?.clockIn ? (
                        <Clock className="w-5 h-5" />
                      ) : (
                        <LogIn className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-indigo-300 block">Status Presensi Hari Ini</span>
                      <span className="font-extrabold text-sm text-white">
                        {activeTodayRecord?.clockOut
                          ? `Selesai (Clock Out: ${activeTodayRecord.clockOut.time} WIB)`
                          : activeTodayRecord?.clockIn
                          ? `Sudah Masuk (${activeTodayRecord.clockIn.time} WIB)`
                          : activeTodayRecord?.status === "Izin" || activeTodayRecord?.status === "Sakit"
                          ? `Pengajuan ${activeTodayRecord.status} Disetujui`
                          : "Belum Melakukan Clock In"}
                      </span>
                    </div>
                  </div>

                  {activeTodayRecord?.clockIn && !activeTodayRecord?.clockOut && (
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-indigo-300 block">Durasi Kerja Berjalan</span>
                      <span className="font-mono text-sm font-black text-emerald-400">
                        {formatDurationMinutes(
                          Math.max(
                            0,
                            nowDate.getHours() * 60 +
                              nowDate.getMinutes() -
                              (Number(activeTodayRecord.clockIn.time.split(":")[0]) * 60 +
                                Number(activeTodayRecord.clockIn.time.split(":")[1]))
                          )
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
                {!activeTodayRecord?.clockIn ? (
                  config.geofenceEnabled && !locationData.inRadius && !gpsLoading ? (
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={openClockInModal}
                        className="py-3.5 px-6 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        title="Klik untuk melihat status lokasi GPS dan verifikasi jarak"
                      >
                        <ShieldAlert className="w-5 h-5 text-rose-200 animate-pulse" />
                        <span>CLOCK IN NONAKTIF (DI LUAR RADIUS)</span>
                      </button>
                      <span className="text-[11px] text-rose-200 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <span>
                          Lokasi Anda ({formatDistance(locationData.distance)}) berada di luar jangkauan sekolah (Maks. {config.geofenceCenter.radiusMeters}m).
                        </span>
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={openClockInModal}
                      className="py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-sm shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <LogIn className="w-5 h-5" />
                      <span>CLOCK IN (PRESENSI MASUK)</span>
                    </button>
                  )
                ) : !activeTodayRecord?.clockOut ? (
                  <button
                    onClick={openClockOutModal}
                    className="py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-black text-sm shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>CLOCK OUT (PRESENSI PULANG)</span>
                  </button>
                ) : (
                  <div className="py-3.5 px-4 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Presensi Hari Ini Lengkap ({activeTodayRecord.workDurationFormatted})</span>
                  </div>
                )}

                <button
                  onClick={() => setIsPermitModalOpen(true)}
                  className="py-3.5 px-5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-indigo-300" />
                  <span>Ajukan Izin / Sakit / Cuti</span>
                </button>
              </div>
            </div>

            {/* Right: Personal Today Details & Geofence Status */}
            <div className="space-y-4">
              {/* Geofence & Location Box */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#531FFF]" />
                    <h3 className="font-bold text-xs text-gray-900">Validasi Radius Lokasi (Geofence)</h3>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                      locationData.inRadius
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    )}
                  >
                    {locationData.inRadius ? "Dalam Radius 🟢" : "Di Luar Radius 🔴"}
                  </span>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Titik Geofence Sekolah</span>
                    <button
                      type="button"
                      onClick={refreshLocation}
                      disabled={gpsLoading}
                      className="text-[10px] text-[#531FFF] hover:underline flex items-center gap-1 font-bold cursor-pointer"
                    >
                      <RefreshCw className={cn("w-3 h-3", gpsLoading && "animate-spin")} />
                      <span>{gpsLoading ? "Mendeteksi..." : "Perbarui GPS"}</span>
                    </button>
                  </div>
                  <p className="font-bold text-gray-800 leading-snug">{config.geofenceCenter.address}</p>
                  <div className="flex items-center justify-between pt-1 border-t border-gray-200/40 text-[11px]">
                    <span className="text-gray-500">
                      Jarak dari Pusat: <strong className="text-gray-800">{formatDistance(locationData.distance)}</strong>
                    </span>
                    <span className="text-[10px] text-gray-500 font-medium">
                      Maks. {config.geofenceCenter.radiusMeters} meter
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-mono">
                    GPS: {locationData.lat.toFixed(5)}, {locationData.lng.toFixed(5)}
                  </p>
                  {gpsErrorState ? (
                    <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl space-y-2 text-xs animate-in fade-in">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-bold text-amber-900 leading-tight">
                            {gpsErrorState.title}
                          </p>
                          <p className="text-[11px] text-amber-800 leading-relaxed">
                            {gpsErrorState.message}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1.5 border-t border-amber-200/60">
                        <span className="text-[10px] text-amber-700 font-medium">
                          {gpsErrorState.isPermissionDenied ? "Izin Lokasi Diperlukan" : "Sinyal GPS"}
                        </span>
                        <button
                          type="button"
                          onClick={refreshLocation}
                          disabled={gpsLoading}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className={cn("w-3 h-3", gpsLoading && "animate-spin")} />
                          <span>Minta Izin / Coba Lagi</span>
                        </button>
                      </div>
                    </div>
                  ) : gpsError ? (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 flex items-center justify-between gap-2">
                      <span>{gpsError}</span>
                      <button
                        type="button"
                        onClick={refreshLocation}
                        className="font-bold text-[#531FFF] hover:underline shrink-0 text-xs cursor-pointer"
                      >
                        Coba Lagi
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[10px] text-emerald-700 bg-emerald-50/70 px-2.5 py-1 rounded-md border border-emerald-100">
                      <span className="flex items-center gap-1 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>GPS Perangkat Terverifikasi</span>
                      </span>
                      <span className="font-mono text-gray-500">
                        Akurasi: ±{locationData.accuracy ?? 10}m
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span className="text-[11px] font-medium leading-tight">
                    Presensi guru menggunakan koordinat lokasi dan kamera yang sama dengan siswa.
                  </span>
                </div>
              </div>

              {/* Today's Recorded Details Box */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3">
                <h3 className="font-bold text-xs text-gray-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#531FFF]" />
                  <span>Rincian Waktu Hari Ini</span>
                </h3>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Jam Masuk</span>
                    <span className="font-mono text-sm font-black text-gray-900 block mt-0.5">
                      {(activeTodayRecord || todayTeacherRecord)?.clockIn?.time || "--:--:--"}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600">
                      {(activeTodayRecord || todayTeacherRecord)?.clockIn?.status || "Belum Masuk"}
                    </span>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Jam Pulang</span>
                    <span className="font-mono text-sm font-black text-gray-900 block mt-0.5">
                      {(activeTodayRecord || todayTeacherRecord)?.clockOut?.time || "--:--:--"}
                    </span>
                    <span className="text-[10px] font-semibold text-indigo-600">
                      {(activeTodayRecord || todayTeacherRecord)?.clockOut?.status || "Belum Pulang"}
                    </span>
                  </div>
                </div>

                {(activeTodayRecord || todayTeacherRecord)?.workDurationFormatted && (activeTodayRecord || todayTeacherRecord)!.workDurationMinutes > 0 && (
                  <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-100 text-center">
                    <span className="text-[10px] uppercase font-bold text-purple-700 block">Total Jam Kerja Hari Ini</span>
                    <span className="font-mono text-base font-black text-[#531FFF]">
                      {(activeTodayRecord || todayTeacherRecord)?.workDurationFormatted}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Personal Monthly Recap & Statistics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
              <span className="text-[11px] font-bold text-gray-500 uppercase block">Total Kehadiran</span>
              <span className="font-mono text-2xl font-black text-gray-900 mt-1 block">
                {myMonthlyStats.presentCount} Hari
              </span>
              <span className="text-[10px] text-gray-400 font-medium">Bulan berjalan</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
              <span className="text-[11px] font-bold text-emerald-600 uppercase block">Tepat Waktu</span>
              <span className="font-mono text-2xl font-black text-emerald-700 mt-1 block">
                {Math.max(0, myMonthlyStats.presentCount - myMonthlyStats.lateCount)} Hari
              </span>
              <span className="text-[10px] text-emerald-600 font-medium">Sesuai shift kerja</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
              <span className="text-[11px] font-bold text-rose-600 uppercase block">Terlambat</span>
              <span className="font-mono text-2xl font-black text-rose-700 mt-1 block">
                {myMonthlyStats.lateCount} Hari
              </span>
              <span className="text-[10px] text-rose-600 font-medium">Melebihi toleransi</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
              <span className="text-[11px] font-bold text-indigo-600 uppercase block">Total Jam Kerja</span>
              <span className="font-mono text-2xl font-black text-indigo-700 mt-1 block">
                {myMonthlyStats.totalDurationFormatted}
              </span>
              <span className="text-[10px] text-indigo-500 font-medium">Akumulasi durasi</span>
            </div>
          </div>

          {/* Teacher Personal Attendance Log Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-sm text-gray-900">Riwayat Presensi Guru Anda</h3>
                <p className="text-xs text-gray-500">Daftar presensi, jam kerja, dan status kehadiran pribadi Anda.</p>
              </div>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 self-start sm:self-auto">
                Tercatat {myPersonalRecords.length} Hari Kerja
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left divide-y divide-gray-100 text-xs">
                <thead className="bg-gray-50/80 font-bold text-gray-600 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Clock In (Masuk)</th>
                    <th className="py-3 px-4">Clock Out (Pulang)</th>
                    <th className="py-3 px-4">Durasi Kerja</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Catatan</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                  {myPersonalRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400 font-medium">
                        Belum ada riwayat presensi yang tercatat untuk akun Anda di database.
                      </td>
                    </tr>
                  ) : (
                    myPersonalRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-gray-900">{rec.date}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">
                          {rec.clockIn?.time || "-"}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">
                          {rec.clockOut?.time || "-"}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-gray-700">
                          {rec.workDurationFormatted || "-"}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={cn(
                              "px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1",
                              rec.status === "Hadir"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : rec.status === "Terlambat"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : rec.status === "Pulang Awal"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-purple-50 text-purple-700 border border-purple-200"
                            )}
                          >
                            {rec.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-gray-500 max-w-xs truncate">
                          {rec.clockIn?.notes || rec.permitReason || "-"}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setSelectedDetailRecord({ teacher: currentTeacherInfo, record: rec })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-[#531FFF] bg-[#531FFF]/10 hover:bg-[#531FFF]/20 rounded-lg transition-colors cursor-pointer"
                            title="Lihat Detail & Foto"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Detail</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ADMIN / MANAGEMENT VIEW: FULL MONITORING & REKAP GURU                   */}
      {/* ========================================================================= */}
      {isEffectiveAdmin && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Live Attendance Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
              <span className="text-[11px] font-bold text-gray-500 uppercase block">Total Guru & Staff</span>
              <span className="font-mono text-2xl font-black text-gray-900 mt-1 block">
                {adminMetrics.totalTeachers} Guru
              </span>
              <span className="text-[10px] text-gray-400">Terdaftar di sistem</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
              <span className="text-[11px] font-bold text-emerald-600 uppercase block">Hadir Hari Ini</span>
              <span className="font-mono text-2xl font-black text-emerald-700 mt-1 block">
                {adminMetrics.presentCount} Guru
              </span>
              <span className="text-[10px] text-emerald-600 font-bold">{adminMetrics.presentPercent}% Hadir</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
              <span className="text-[11px] font-bold text-blue-600 uppercase block">Tepat Waktu</span>
              <span className="font-mono text-2xl font-black text-blue-700 mt-1 block">
                {adminMetrics.onTimeCount} Guru
              </span>
              <span className="text-[10px] text-blue-600">Sebelum {config.lateThreshold}</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
              <span className="text-[11px] font-bold text-rose-600 uppercase block">Terlambat Masuk</span>
              <span className="font-mono text-2xl font-black text-rose-700 mt-1 block">
                {adminMetrics.lateCount} Guru
              </span>
              <span className="text-[10px] text-rose-600">Lewat batas toleransi</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
              <span className="text-[11px] font-bold text-amber-600 uppercase block">Belum Clock In</span>
              <span className="font-mono text-2xl font-black text-amber-700 mt-1 block">
                {adminMetrics.notClockedInCount} Guru
              </span>
              <span className="text-[10px] text-amber-600">Belum presensi</span>
            </div>
          </div>

          {/* Admin Sub-Tabs Navigation */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl">
              <button
                onClick={() => setActiveAdminTab("today")}
                className={cn(
                  "px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                  activeAdminTab === "today"
                    ? "bg-white text-[#531FFF] shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Presensi Hari Ini ({todayDateStr})</span>
              </button>

              <button
                onClick={() => setActiveAdminTab("monthly")}
                className={cn(
                  "px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                  activeAdminTab === "monthly"
                    ? "bg-white text-[#531FFF] shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Rekapitulasi Bulanan</span>
              </button>

              <button
                onClick={() => setActiveAdminTab("permits")}
                className={cn(
                  "px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                  activeAdminTab === "permits"
                    ? "bg-white text-[#531FFF] shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Izin & Cuti Guru</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {canMutateAttendance && (
                <button
                  onClick={() => setIsManualRecordModalOpen(true)}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-[#531FFF] hover:bg-[#4216d6] rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Catat Presensi Manual</span>
                </button>
              )}

              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Ekspor CSV</span>
              </button>

              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak</span>
              </button>
            </div>
          </div>

          {/* TAB 1: TODAY'S LIVE MONITORING TABLE */}
          {activeAdminTab === "today" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden space-y-4 p-5">
              {/* Table Controls & Filters */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm text-gray-900">Daftar Kehadiran Harian Guru</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-[#531FFF]">
                      {filteredTodayRecords.length} Guru
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Pantau waktu Clock In, Clock Out, dan foto verifikasi staf guru & tendik secara realtime.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Date Picker Selector */}
                  <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1.5 rounded-xl border border-gray-200">
                    <CalendarDays className="w-3.5 h-3.5 text-gray-500" />
                    <input
                      type="date"
                      value={selectedAdminDate}
                      onChange={(e) => setSelectedAdminDate(e.target.value)}
                      className="text-xs font-bold text-gray-800 bg-transparent border-none focus:outline-hidden cursor-pointer"
                    />
                  </div>
                  {selectedAdminDate !== todayDateStr && (
                    <button
                      onClick={() => setSelectedAdminDate(todayDateStr)}
                      className="px-2.5 py-1.5 text-xs font-bold text-[#531FFF] bg-[#531FFF]/10 hover:bg-[#531FFF]/20 rounded-xl transition-colors cursor-pointer"
                    >
                      Hari Ini
                    </button>
                  )}

                  {/* Search */}
                  <div className="relative min-w-[200px]">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Cari guru, NIP, mapel..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs font-medium bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:border-[#531FFF]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <select
                    value={selectedSubjectFilter}
                    onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                    className="px-3 py-2 text-xs font-bold bg-white border border-gray-200 rounded-lg text-gray-700"
                  >
                    <option value="all">Semua Mata Pelajaran</option>
                    {subjectList.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                    className="px-3 py-2 text-xs font-bold bg-white border border-gray-200 rounded-lg text-gray-700"
                  >
                    <option value="all">Semua Status Kehadiran</option>
                    <option value="Hadir">Hadir Tepat Waktu</option>
                    <option value="Terlambat">Terlambat Masuk</option>
                    <option value="Pulang Awal">Pulang Awal</option>
                    <option value="Izin">Izin / Sakit / Cuti</option>
                    <option value="not_yet">Belum Clock In</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left divide-y divide-gray-100 text-xs">
                  <thead className="bg-gray-50/80 font-bold text-gray-600 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4 w-12">No</th>
                      <th className="py-3 px-4">Nama Guru & NIP</th>
                      <th className="py-3 px-4">Mata Pelajaran</th>
                      <th className="py-3 px-4">Clock In (Masuk)</th>
                      <th className="py-3 px-4">Clock Out (Pulang)</th>
                      <th className="py-3 px-4">Durasi Kerja</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                    {filteredTodayRecords.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-gray-400 font-medium">
                          Belum ada data guru atau catatan presensi yang sesuai dengan filter pencarian.
                        </td>
                      </tr>
                    ) : (
                      filteredTodayRecords.map(({ teacher, record }, idx) => (
                      <tr key={teacher.id || idx} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3.5 px-4 text-gray-400 font-bold">{idx + 1}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <ProfileAvatar
                              name={teacher.name}
                              imageUrl={teacher.imageUrl}
                              photoUrl={teacher.photoUrl}
                              avatar={teacher.avatar}
                              gender={teacher.gender}
                              role="teacher"
                              size="sm"
                              shape="circle"
                            />
                            <div>
                              <span className="font-bold text-gray-900 block">{teacher.name}</span>
                              <span className="text-[11px] text-gray-400 font-mono">NIP: {teacher.nip || "-"}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="bg-gray-100 px-2 py-0.5 rounded text-[11px] font-bold text-gray-700">
                            {teacher.subject || "Guru Pengajar"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {record?.clockIn ? (
                            <div>
                              <span className="font-mono font-bold text-emerald-700 block">
                                {record.clockIn.time} WIB
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {record.clockIn.status === "Terlambat" ? (
                                  <strong className="text-rose-600 font-bold">Terlambat ({record.clockIn.lateMinutes}m)</strong>
                                ) : (
                                  "Tepat Waktu"
                                )}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">Belum masuk</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {record?.clockOut ? (
                            <div>
                              <span className="font-mono font-bold text-indigo-700 block">
                                {record.clockOut.time} WIB
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {record.clockOut.status}
                              </span>
                            </div>
                          ) : record?.clockIn ? (
                            <span className="text-blue-600 font-bold text-[10px]">Sedang Bertugas</span>
                          ) : (
                            <span className="text-gray-400 italic">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-gray-700">
                          {record?.workDurationFormatted || "-"}
                        </td>
                        <td className="py-3.5 px-4">
                          {record ? (
                            <span
                              className={cn(
                                "px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1",
                                record.status === "Hadir"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : record.status === "Terlambat"
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : record.status === "Pulang Awal"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-purple-50 text-purple-700 border border-purple-200"
                              )}
                            >
                              {record.status}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500">
                              Belum Presensi
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedDetailRecord({ teacher, record })}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-[#531FFF] bg-[#531FFF]/10 hover:bg-[#531FFF]/20 rounded-xl transition-all cursor-pointer shadow-2xs"
                              title="Lihat Detail & Foto Verifikasi"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Detail</span>
                            </button>
                            {record && canMutateAttendance && (
                              <button
                                onClick={() => adminDeleteRecord(record.id)}
                                className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                                title="Hapus Data Presensi"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: MONTHLY RECAPITULATION */}
          {activeAdminTab === "monthly" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-black text-sm text-gray-900">Rekapitulasi Kehadiran Guru Bulanan</h3>
                  <p className="text-xs text-gray-500">Akumulasi hari kerja, jam kerja, dan ketepatan waktu seluruh staf pendidik.</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="month"
                    value={monthlyMonth}
                    onChange={(e) => setMonthlyMonth(e.target.value)}
                    className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left divide-y divide-gray-100 text-xs">
                  <thead className="bg-gray-50/80 font-bold text-gray-600 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4 w-12">No</th>
                      <th className="py-3 px-4">Nama Guru</th>
                      <th className="py-3 px-4">NIP & Mapel</th>
                      <th className="py-3 px-4 text-center">Hadir</th>
                      <th className="py-3 px-4 text-center">Tepat Waktu</th>
                      <th className="py-3 px-4 text-center">Terlambat</th>
                      <th className="py-3 px-4 text-center">Izin/Cuti</th>
                      <th className="py-3 px-4 text-right">Total Jam Kerja</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                    {teachersList.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-gray-400 font-medium">
                          Belum ada data guru terdaftar di database.
                        </td>
                      </tr>
                    ) : (
                      teachersList.map((teacher, idx) => {
                      const tRecs = records.filter(
                        (r) =>
                          (r.date || "").startsWith(monthlyMonth) &&
                          (r.teacherId === teacher.id ||
                            r.teacherId === teacher.uid ||
                            (teacher._firestoreId && r.teacherId === teacher._firestoreId) ||
                            (teacher.email && r.email && r.email.toLowerCase().trim() === teacher.email.toLowerCase().trim()) ||
                            (teacher.nip && teacher.nip !== "-" && r.nip && r.nip.trim() === teacher.nip.trim()) ||
                            (teacher.name && r.teacherName && teacher.name.toLowerCase().trim() === r.teacherName.toLowerCase().trim()))
                      );
                      const hadir = tRecs.filter((r) => r.status === "Hadir" || r.status === "Terlambat").length;
                      const tepatWaktu = tRecs.filter((r) => r.clockIn?.status === "Tepat Waktu").length;
                      const terlambat = tRecs.filter((r) => r.status === "Terlambat").length;
                      const izin = tRecs.filter((r) => r.status === "Izin" || r.status === "Sakit" || r.status === "Cuti").length;
                      const totalMinutes = tRecs.reduce((acc, r) => acc + (r.workDurationMinutes || 0), 0);

                      return (
                        <tr key={teacher.id || idx} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-4 text-gray-400 font-bold">{idx + 1}</td>
                          <td className="py-3 px-4 font-bold text-gray-900">
                            <div className="flex items-center gap-2.5">
                              <ProfileAvatar
                                name={teacher.name}
                                imageUrl={teacher.imageUrl}
                                photoUrl={teacher.photoUrl}
                                avatar={teacher.avatar}
                                gender={teacher.gender}
                                role="teacher"
                                size="xs"
                                shape="circle"
                              />
                              <span>{teacher.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-500">
                            {teacher.subject || "Guru Pengajar"} • NIP: {teacher.nip || "-"}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-emerald-700">{hadir} hari</td>
                          <td className="py-3 px-4 text-center font-bold text-blue-700">{tepatWaktu} hari</td>
                          <td className="py-3 px-4 text-center font-bold text-rose-700">{terlambat} hari</td>
                          <td className="py-3 px-4 text-center font-bold text-purple-700">{izin} hari</td>
                          <td className="py-3 px-4 text-right font-mono font-black text-[#531FFF]">
                            {formatDurationMinutes(totalMinutes)}
                          </td>
                        </tr>
                      );
                    }))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: PERMITS & LEAVE */}
          {activeAdminTab === "permits" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-sm text-gray-900">Daftar Pengajuan Izin, Sakit & Cuti Guru</h3>
                  <p className="text-xs text-gray-500">Permohonan ketidakhadiran resmi guru yang tercatat dalam sistem.</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left divide-y divide-gray-100 text-xs">
                  <thead className="bg-gray-50/80 font-bold text-gray-600 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Tanggal</th>
                      <th className="py-3 px-4">Nama Guru</th>
                      <th className="py-3 px-4">Jenis Pengajuan</th>
                      <th className="py-3 px-4">Alasan / Catatan</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                    {records.filter((r) => r.status === "Izin" || r.status === "Sakit" || r.status === "Cuti").length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-gray-400 font-medium">
                          Belum ada pengajuan izin, sakit, atau cuti guru di database.
                        </td>
                      </tr>
                    ) : (
                      records
                      .filter((r) => r.status === "Izin" || r.status === "Sakit" || r.status === "Cuti")
                      .map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-4 font-bold text-gray-900">{p.date}</td>
                          <td className="py-3 px-4 font-bold text-gray-900">{p.teacherName}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600">{p.permitReason || "-"}</td>
                          <td className="py-3 px-4 text-right">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Tercatat Resmi
                            </span>
                          </td>
                        </tr>
                      )))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL: CLOCK IN CONFIRMATION WITH CAMERA & GEOFENCE                    */}
      {/* ========================================================================= */}
      {isClockInModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-3xl max-h-[92vh] md:max-h-[88vh] rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col my-auto animate-in zoom-in-95 duration-200">
            {/* Header (Compact Sticky) */}
            <div className="px-5 py-3 border-b border-gray-100 bg-white/95 backdrop-blur-xs flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <LogIn className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm md:text-base text-gray-900 leading-tight">Clock In (Presensi Masuk)</h3>
                  <p className="text-[10px] md:text-[11px] text-gray-500 font-medium">Verifikasi kamera dan titik koordinat radius sekolah</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Clock className="w-3 h-3" />
                  <span>{nowDate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB</span>
                </span>
                <button
                  onClick={closeClockInModal}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body - 2 Column Compact Grid */}
            <div className="flex-1 overflow-y-auto p-4 md:p-5">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                {/* Left Column: Camera Viewfinder */}
                <div className="md:col-span-6 flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Verifikasi Wajah (Selfie)</span>
                    </label>
                    {photoPreview ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Foto Siap 🟢
                      </span>
                    ) : cameraActive ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Kamera Aktif</span>
                      </span>
                    ) : null}
                  </div>

                  {/* Camera Frame */}
                  <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden border border-gray-200 bg-slate-950 shadow-inner flex items-center justify-center">
                    {photoPreview ? (
                      <div className="relative w-full h-full flex items-center justify-center bg-black">
                        <img src={photoPreview} alt="Selfie preview" className="w-full h-full object-cover" />
                        <div className="absolute top-2.5 right-2.5 z-10">
                          <button
                            type="button"
                            onClick={handleRetakePhoto}
                            className="px-2.5 py-1 bg-black/75 hover:bg-black/90 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 backdrop-blur-xs transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3 text-emerald-400" />
                            <span>Ambil Ulang</span>
                          </button>
                        </div>
                      </div>
                    ) : cameraActive ? (
                      <>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover transform -scale-x-100"
                        />
                        {/* Compact Face Frame */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <div className="w-36 h-44 sm:w-40 sm:h-48 border-2 border-dashed border-emerald-400/80 rounded-2xl relative flex items-center justify-center">
                            <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-emerald-400" />
                            <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-emerald-400" />
                            <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-emerald-400" />
                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-emerald-400" />
                            <ScanFace className="w-7 h-7 text-emerald-400/50" />
                          </div>
                        </div>

                        {/* Floating Shutter Button */}
                        <div className="absolute bottom-2.5 inset-x-0 flex items-center justify-center px-4 z-10">
                          <button
                            type="button"
                            onClick={() => handleCapturePhoto("CLOCK IN")}
                            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/40 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Ambil Foto Masuk</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="p-4 text-center space-y-2.5">
                        <Camera className="w-8 h-8 text-gray-400 mx-auto" />
                        <p className="text-[11px] text-gray-300 max-w-xs mx-auto leading-tight">
                          {cameraError || "Kamera perlu diinisialisasi atau izin peramban belum aktif."}
                        </p>
                        <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
                          <button
                            type="button"
                            onClick={startCamera}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg cursor-pointer"
                          >
                            Nyalakan Kamera
                          </button>
                          <label
                            htmlFor="clockInFileFallback"
                            className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-lg cursor-pointer transition-colors"
                          >
                            Unggah File
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Fallback upload text */}
                  <div className="flex items-center justify-between text-[10px] text-gray-500 pt-0.5">
                    <span>Posisi wajah di tengah bingkai</span>
                    <label
                      htmlFor="clockInFileFallback"
                      className="text-emerald-600 hover:underline font-semibold cursor-pointer"
                    >
                      Unggah Foto dari Galeri
                    </label>
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    id="clockInFileFallback"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>

                {/* Right Column: Identity, Geofence, Notes, & Actions */}
                <div className="md:col-span-6 flex flex-col justify-between space-y-2.5">
                  {/* Quick Teacher & Shift Bar */}
                  <div className="p-2.5 bg-gray-50/90 rounded-xl border border-gray-200/60 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase font-extrabold block">Identitas Guru</span>
                      <strong className="text-gray-900 truncate block text-xs">{currentTeacherInfo?.name}</strong>
                      <span className="text-[10px] text-gray-500">NIP: {currentTeacherInfo?.nip || "-"}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-gray-400 uppercase font-extrabold block">Waktu Saat Ini</span>
                      <strong className="font-mono text-emerald-700 font-black block text-xs">
                        {nowDate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} WIB
                      </strong>
                      <span className="text-[10px] text-gray-500">Batas: {config.lateThreshold} WIB</span>
                    </div>
                  </div>

                  {/* Geofence & GPS Box */}
                  <div className="p-2.5 bg-gray-50/90 rounded-xl border border-gray-200/60 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#531FFF]" />
                        <span className="font-bold text-gray-800 text-[11px]">Radius & Lokasi GPS</span>
                      </div>
                      <button
                        type="button"
                        onClick={refreshLocation}
                        disabled={gpsLoading}
                        className="text-[10px] text-[#531FFF] hover:underline flex items-center gap-1 font-bold cursor-pointer"
                      >
                        <RefreshCw className={cn("w-3 h-3", gpsLoading && "animate-spin")} />
                        <span>{gpsLoading ? "Mengecek..." : "Perbarui GPS"}</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-200/50">
                      <span className="text-gray-600">
                        Jarak: <strong className="text-gray-900">{formatDistance(locationData.distance)}</strong>{" "}
                        <span className="text-gray-400 text-[10px]">(Maks {config.geofenceCenter.radiusMeters}m)</span>
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                          locationData.inRadius
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : "bg-rose-100 text-rose-800 border-rose-200"
                        )}
                      >
                        {locationData.inRadius ? "Dalam Radius 🟢" : "Di Luar Radius 🔴"}
                      </span>
                    </div>

                    <p className="text-[10px] text-gray-400 font-mono truncate" title={config.geofenceCenter.address}>
                      {config.geofenceCenter.address} ({locationData.lat.toFixed(4)}, {locationData.lng.toFixed(4)})
                    </p>

                    {gpsErrorState && (
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] space-y-1">
                        <div className="flex items-start gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-amber-900 text-[10px]">{gpsErrorState.title}</p>
                            <p className="text-[10px] text-amber-800">{gpsErrorState.message}</p>
                          </div>
                        </div>
                        <div className="pt-0.5 flex justify-end">
                          <button
                            type="button"
                            onClick={refreshLocation}
                            disabled={gpsLoading}
                            className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[9px] font-bold transition-colors cursor-pointer"
                          >
                            Minta Ulang Izin
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Warning Alert if outside radius */}
                  {config.geofenceEnabled && !locationData.inRadius && !gpsLoading && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-800 animate-in fade-in">
                      <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-bold block text-rose-900 text-[11px]">
                          Lokasi di Luar Jangkauan Sekolah
                        </span>
                        <p className="text-rose-800 text-[10px] leading-snug">
                          Anda berjarak <strong>{formatDistance(locationData.distance)}</strong> ({Math.max(0, locationData.distance - (config.geofenceCenter?.radiusMeters ?? 100))}m di luar batas). Tombol Clock In dinonaktifkan.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Mandatory Photo Alert / Status Badge */}
                  {!photoPreview ? (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-800 animate-in fade-in">
                      <Camera className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-bold block text-amber-900 text-[11px]">
                          Wajib Foto Selfie Masuk
                        </span>
                        <p className="text-amber-800 text-[10px] leading-snug">
                          Silakan ambil foto wajah Anda melalui bingkai kamera di sebelah kiri untuk mengaktifkan tombol Konfirmasi Masuk.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800 animate-in fade-in">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-bold text-[11px] text-emerald-900">
                          Foto Masuk Berhasil Diambil & Tervalidasi ✓
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRetakePhoto}
                        className="text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer"
                      >
                        Ambil Ulang
                      </button>
                    </div>
                  )}

                  {/* Notes textarea */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-gray-700">Catatan Masuk (Opsional)</label>
                    <textarea
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      placeholder="Rencana kegiatan mengajar hari ini atau catatan kehadiran..."
                      rows={2}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] resize-none"
                    />
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={closeClockInModal}
                      className="px-3.5 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteClockIn}
                      disabled={submitting || !photoPreview || (config.geofenceEnabled && (!locationData.inRadius || gpsLoading || !!gpsErrorState))}
                      className={cn(
                        "px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5",
                        submitting || !photoPreview || (config.geofenceEnabled && (!locationData.inRadius || gpsLoading || !!gpsErrorState))
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none border border-gray-200"
                          : "text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 cursor-pointer"
                      )}
                    >
                      {submitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Memproses...</span>
                        </>
                      ) : !photoPreview ? (
                        <>
                          <Camera className="w-3.5 h-3.5 text-gray-400" />
                          <span>Ambil Foto Terlebih Dahulu</span>
                        </>
                      ) : config.geofenceEnabled && (!locationData.inRadius || gpsLoading || !!gpsErrorState) ? (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-rose-500" />
                          <span>
                            {gpsLoading
                              ? "Menunggu GPS..."
                              : gpsErrorState
                              ? "GPS Bermasalah"
                              : "Di Luar Radius Sekolah"}
                          </span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Konfirmasi Masuk (Clock In)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: CLOCK OUT CONFIRMATION WITH CAMERA & GEOFENCE                   */}
      {/* ========================================================================= */}
      {isClockOutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-3xl max-h-[92vh] md:max-h-[88vh] rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col my-auto animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-5 py-3 border-b border-gray-100 bg-white/95 backdrop-blur-xs flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <LogOut className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm md:text-base text-gray-900 leading-tight">Clock Out (Presensi Pulang)</h3>
                  <p className="text-[10px] md:text-[11px] text-gray-500 font-medium">Verifikasi kamera dan waktu penyelesaian tugas kerja</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <Clock className="w-3 h-3" />
                  <span>{nowDate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB</span>
                </span>
                <button
                  onClick={closeClockOutModal}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body - 2 Column Grid */}
            <div className="flex-1 overflow-y-auto p-4 md:p-5">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                {/* Left Column: Camera Viewfinder */}
                <div className="md:col-span-6 flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Verifikasi Pulang (Selfie)</span>
                    </label>
                    {photoPreview ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Foto Siap 🟢
                      </span>
                    ) : cameraActive ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                        <span>Kamera Aktif</span>
                      </span>
                    ) : null}
                  </div>

                  {/* Camera Frame */}
                  <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden border border-gray-200 bg-slate-950 shadow-inner flex items-center justify-center">
                    {photoPreview ? (
                      <div className="relative w-full h-full flex items-center justify-center bg-black">
                        <img src={photoPreview} alt="Selfie preview" className="w-full h-full object-cover" />
                        <div className="absolute top-2.5 right-2.5 z-10">
                          <button
                            type="button"
                            onClick={handleRetakePhoto}
                            className="px-2.5 py-1 bg-black/75 hover:bg-black/90 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 backdrop-blur-xs transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3 text-indigo-400" />
                            <span>Ambil Ulang</span>
                          </button>
                        </div>
                      </div>
                    ) : cameraActive ? (
                      <>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover transform -scale-x-100"
                        />
                        {/* Compact Face Frame */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <div className="w-36 h-44 sm:w-40 sm:h-48 border-2 border-dashed border-indigo-400/80 rounded-2xl relative flex items-center justify-center">
                            <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-indigo-400" />
                            <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-indigo-400" />
                            <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-indigo-400" />
                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-indigo-400" />
                            <ScanFace className="w-7 h-7 text-indigo-400/50" />
                          </div>
                        </div>

                        {/* Floating Shutter Button */}
                        <div className="absolute bottom-2.5 inset-x-0 flex items-center justify-center px-4 z-10">
                          <button
                            type="button"
                            onClick={() => handleCapturePhoto("CLOCK OUT")}
                            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-500/40 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Ambil Foto Pulang</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="p-4 text-center space-y-2.5">
                        <Camera className="w-8 h-8 text-gray-400 mx-auto" />
                        <p className="text-[11px] text-gray-300 max-w-xs mx-auto leading-tight">
                          {cameraError || "Kamera perlu diinisialisasi atau izin peramban belum aktif."}
                        </p>
                        <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
                          <button
                            type="button"
                            onClick={startCamera}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg cursor-pointer"
                          >
                            Nyalakan Kamera
                          </button>
                          <label
                            htmlFor="clockOutFileFallback"
                            className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-lg cursor-pointer transition-colors"
                          >
                            Unggah File
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Fallback upload text */}
                  <div className="flex items-center justify-between text-[10px] text-gray-500 pt-0.5">
                    <span>Posisi wajah di tengah bingkai</span>
                    <label
                      htmlFor="clockOutFileFallback"
                      className="text-indigo-600 hover:underline font-semibold cursor-pointer"
                    >
                      Unggah Foto dari Galeri
                    </label>
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    id="clockOutFileFallback"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>

                {/* Right Column: Identity, Geofence, Notes, & Actions */}
                <div className="md:col-span-6 flex flex-col justify-between space-y-2.5">
                  {/* Shift & Time Summary */}
                  <div className="p-2.5 bg-gray-50/90 rounded-xl border border-gray-200/60 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase font-extrabold block">Jam Masuk Tercatat</span>
                      <strong className="font-mono text-emerald-700 font-bold block text-xs">
                        {(activeTodayRecord || todayTeacherRecord)?.clockIn?.time || "--:--:--"} WIB
                      </strong>
                      <span className="text-[10px] text-gray-500 truncate block max-w-[140px]">{currentTeacherInfo?.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-gray-400 uppercase font-extrabold block">Waktu Pulang</span>
                      <strong className="font-mono text-indigo-700 font-black block text-xs">
                        {nowDate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} WIB
                      </strong>
                      <span className="text-[10px] text-gray-500">Standar: {config.standardClockOut} WIB</span>
                    </div>
                  </div>

                  {/* Geofence & GPS Verification Box */}
                  <div className="p-2.5 bg-gray-50/90 rounded-xl border border-gray-200/60 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#531FFF]" />
                        <span className="font-bold text-gray-800 text-[11px]">Radius & Lokasi GPS</span>
                      </div>
                      <button
                        type="button"
                        onClick={refreshLocation}
                        disabled={gpsLoading}
                        className="text-[10px] text-[#531FFF] hover:underline flex items-center gap-1 font-bold cursor-pointer"
                      >
                        <RefreshCw className={cn("w-3 h-3", gpsLoading && "animate-spin")} />
                        <span>{gpsLoading ? "Mengecek..." : "Perbarui GPS"}</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-200/50">
                      <span className="text-gray-600">
                        Jarak: <strong className="text-gray-900">{formatDistance(locationData.distance)}</strong>{" "}
                        <span className="text-gray-400 text-[10px]">(Maks {config.geofenceCenter.radiusMeters}m)</span>
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                          locationData.inRadius
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : "bg-rose-100 text-rose-800 border-rose-200"
                        )}
                      >
                        {locationData.inRadius ? "Dalam Radius 🟢" : "Di Luar Radius 🔴"}
                      </span>
                    </div>

                    <p className="text-[10px] text-gray-400 font-mono truncate" title={config.geofenceCenter.address}>
                      {config.geofenceCenter.address} ({locationData.lat.toFixed(4)}, {locationData.lng.toFixed(4)})
                    </p>

                    {gpsErrorState && (
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] space-y-1">
                        <div className="flex items-start gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-amber-900 text-[10px]">{gpsErrorState.title}</p>
                            <p className="text-[10px] text-amber-800">{gpsErrorState.message}</p>
                          </div>
                        </div>
                        <div className="pt-0.5 flex justify-end">
                          <button
                            type="button"
                            onClick={refreshLocation}
                            disabled={gpsLoading}
                            className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[9px] font-bold transition-colors cursor-pointer"
                          >
                            Minta Ulang Izin
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Warning Alert if outside radius */}
                  {config.geofenceEnabled && !locationData.inRadius && !gpsLoading && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-800 animate-in fade-in">
                      <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-bold block text-rose-900 text-[11px]">
                          Lokasi di Luar Jangkauan Sekolah
                        </span>
                        <p className="text-rose-800 text-[10px] leading-snug">
                          Anda berjarak <strong>{formatDistance(locationData.distance)}</strong> ({Math.max(0, locationData.distance - (config.geofenceCenter?.radiusMeters ?? 100))}m di luar batas). Tombol Clock Out dinonaktifkan.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Mandatory Photo Alert / Status Badge */}
                  {!photoPreview ? (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-800 animate-in fade-in">
                      <Camera className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-bold block text-amber-900 text-[11px]">
                          Wajib Foto Selfie Pulang
                        </span>
                        <p className="text-amber-800 text-[10px] leading-snug">
                          Silakan ambil foto wajah Anda melalui bingkai kamera di sebelah kiri untuk mengaktifkan tombol Konfirmasi Pulang.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800 animate-in fade-in">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-bold text-[11px] text-emerald-900">
                          Foto Pulang Berhasil Diambil & Tervalidasi ✓
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRetakePhoto}
                        className="text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer"
                      >
                        Ambil Ulang
                      </button>
                    </div>
                  )}

                  {/* Notes textarea */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-gray-700">Laporan Kegiatan / Catatan Pulang (Opsional)</label>
                    <textarea
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      placeholder="Materi ajar yang telah diselesaikan, penugasan, atau catatan kelas..."
                      rows={2}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] resize-none"
                    />
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={closeClockOutModal}
                      className="px-3.5 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteClockOut}
                      disabled={submitting || !photoPreview || (config.geofenceEnabled && (!locationData.inRadius || gpsLoading || !!gpsErrorState))}
                      className={cn(
                        "px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5",
                        submitting || !photoPreview || (config.geofenceEnabled && (!locationData.inRadius || gpsLoading || !!gpsErrorState))
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none border border-gray-200"
                          : "text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 cursor-pointer"
                      )}
                    >
                      {submitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Memproses...</span>
                        </>
                      ) : !photoPreview ? (
                        <>
                          <Camera className="w-3.5 h-3.5 text-gray-400" />
                          <span>Ambil Foto Terlebih Dahulu</span>
                        </>
                      ) : config.geofenceEnabled && (!locationData.inRadius || gpsLoading || !!gpsErrorState) ? (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-rose-500" />
                          <span>
                            {gpsLoading
                              ? "Menunggu GPS..."
                              : gpsErrorState
                              ? "GPS Bermasalah"
                              : "Di Luar Radius Sekolah"}
                          </span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Konfirmasi Pulang (Clock Out)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL: PENGAJUAN IZIN / SAKIT / CUTI                                   */}
      {/* ========================================================================= */}
      {isPermitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <form
            onSubmit={handleSubmitPermit}
            className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#531FFF] flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-gray-900">Pengajuan Izin / Sakit / Cuti</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPermitModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Tanggal</label>
                <input
                  type="date"
                  value={permitForm.date}
                  onChange={(e) => setPermitForm({ ...permitForm, date: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Jenis Pengajuan</label>
                <select
                  value={permitForm.status}
                  onChange={(e) => setPermitForm({ ...permitForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg font-bold text-gray-800"
                >
                  <option value="Izin">Izin (Keperluan Mendesak)</option>
                  <option value="Sakit">Sakit (Kondisi Medis)</option>
                  <option value="Cuti">Cuti Tahunan / Melahirkan</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Alasan / Keterangan</label>
                <textarea
                  rows={3}
                  value={permitForm.reason}
                  onChange={(e) => setPermitForm({ ...permitForm, reason: e.target.value })}
                  placeholder="Jelaskan alasan ketidakhadiran Anda..."
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsPermitModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 text-xs font-bold text-white bg-[#531FFF] hover:bg-[#4216d6] rounded-xl shadow-md shadow-[#531FFF]/20 cursor-pointer transition-all"
              >
                {submitting ? "Menyimpan..." : "Kirim Pengajuan"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL: CATAT MANUAL ADMIN                                              */}
      {/* ========================================================================= */}
      {isManualRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <form
            onSubmit={handleSaveManualRecord}
            className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Edit2 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-gray-900">Catat / Koreksi Presensi Guru</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsManualRecordModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Pilih Guru</label>
                <select
                  value={manualRecord.teacherId}
                  onChange={(e) => setManualRecord({ ...manualRecord, teacherId: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg font-bold"
                  required
                >
                  <option value="">-- Pilih Guru --</option>
                  {teachersList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (NIP: {t.nip || "-"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Tanggal</label>
                <input
                  type="date"
                  value={manualRecord.date}
                  onChange={(e) => setManualRecord({ ...manualRecord, date: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Status Kehadiran</label>
                <select
                  value={manualRecord.status}
                  onChange={(e) => setManualRecord({ ...manualRecord, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg font-bold"
                >
                  <option value="Hadir">Hadir Tepat Waktu</option>
                  <option value="Terlambat">Terlambat</option>
                  <option value="Pulang Awal">Pulang Awal</option>
                  <option value="Izin">Izin</option>
                  <option value="Sakit">Sakit</option>
                  <option value="Cuti">Cuti</option>
                  <option value="Alpa">Alpa / Tanpa Keterangan</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsManualRecordModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-[#531FFF] hover:bg-[#4216d6] rounded-xl shadow-md cursor-pointer transition-all"
              >
                Simpan Presensi
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. DRAWER: DETAIL PRESENSI GURU & VERIFIKASI FOTO CLOCK IN / OUT           */}
      {/* ========================================================================= */}
      {selectedDetailRecord && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            onClick={() => setSelectedDetailRecord(null)}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity cursor-pointer"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-xl md:max-w-2xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              
              {/* Drawer Header */}
              <div className="p-5 md:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md text-white flex items-center justify-center font-bold">
                    <UserCheck className="w-5 h-5 text-indigo-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base md:text-lg font-black tracking-tight text-white">
                        Detail Presensi Guru
                      </h2>
                      {selectedDetailRecord.record?.status ? (
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                            selectedDetailRecord.record.status === "Hadir"
                              ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
                              : selectedDetailRecord.record.status === "Terlambat"
                              ? "bg-rose-500/30 text-rose-300 border border-rose-500/40"
                              : selectedDetailRecord.record.status === "Pulang Awal"
                              ? "bg-amber-500/30 text-amber-300 border border-amber-500/40"
                              : "bg-purple-500/30 text-purple-300 border border-purple-500/40"
                          )}
                        >
                          {selectedDetailRecord.record.status}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white">
                          Belum Presensi
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-indigo-200/80 font-medium">
                      Verifikasi Foto Selfie Clock In & Clock Out, Lokasi GPS, serta Durasi Kerja
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDetailRecord(null)}
                  className="p-2 text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6">
                
                {/* 1. Teacher Profile Card */}
                <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#531FFF] to-[#7042FF] text-white flex items-center justify-center font-black text-lg shadow-sm">
                      {(selectedDetailRecord.teacher?.name || "G")[0]}
                    </div>
                    <div>
                      <h3 className="font-black text-sm md:text-base text-gray-900 leading-tight">
                        {selectedDetailRecord.teacher?.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
                        <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-gray-200">
                          NIP: {selectedDetailRecord.teacher?.nip || "-"}
                        </span>
                        <span className="font-bold text-[#531FFF] bg-[#531FFF]/10 px-2 py-0.5 rounded">
                          {selectedDetailRecord.teacher?.subject || "Tenaga Pendidik"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Tanggal Presensi</span>
                    <span className="text-xs font-black text-gray-800 font-mono">
                      {selectedDetailRecord.record?.date || todayDateStr}
                    </span>
                  </div>
                </div>

                {/* 2. Key Metrics Summary Grid */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-xl text-center">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">Jam Masuk</span>
                    <span className="text-sm font-black font-mono text-emerald-800">
                      {selectedDetailRecord.record?.clockIn?.time || "-"}
                    </span>
                  </div>
                  <div className="p-3 bg-indigo-50/70 border border-indigo-200/60 rounded-xl text-center">
                    <span className="text-[10px] uppercase font-bold text-indigo-700 block">Jam Pulang</span>
                    <span className="text-sm font-black font-mono text-indigo-800">
                      {selectedDetailRecord.record?.clockOut?.time || "-"}
                    </span>
                  </div>
                  <div className="p-3 bg-purple-50/70 border border-purple-200/60 rounded-xl text-center">
                    <span className="text-[10px] uppercase font-bold text-purple-700 block">Durasi Kerja</span>
                    <span className="text-sm font-black font-mono text-purple-800">
                      {selectedDetailRecord.record?.workDurationFormatted || (selectedDetailRecord.record?.clockIn && !selectedDetailRecord.record?.clockOut ? "Berjalan" : "-")}
                    </span>
                  </div>
                </div>

                {/* 3. Photos & Details Comparison: CLOCK IN vs CLOCK OUT */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-400">
                      Verifikasi Foto & Geolokasi Clock In / Clock Out
                    </h4>
                    <span className="text-[11px] text-gray-400 font-medium">Standar: {config.standardClockIn} - {config.standardClockOut} WIB</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* === CLOCK IN CARD === */}
                    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-xs flex flex-col">
                      <div className="px-4 py-3 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <LogIn className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs font-black text-emerald-900">CLOCK IN (MASUK)</span>
                        </div>
                        {selectedDetailRecord.record?.clockIn ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            {selectedDetailRecord.record.clockIn.status || "Tercatat"}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            Belum Masuk
                          </span>
                        )}
                      </div>

                      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Waktu Tercatat:</span>
                          <span className="font-mono font-black text-emerald-700">
                            {selectedDetailRecord.record?.clockIn?.time ? `${selectedDetailRecord.record.clockIn.time} WIB` : "-"}
                          </span>
                        </div>

                        {/* Photo Display */}
                        <div className="relative aspect-4/3 w-full bg-slate-100 rounded-xl overflow-hidden border border-gray-200 flex items-center justify-center group">
                          {selectedDetailRecord.record?.clockIn?.photoUrl ? (
                            <>
                              <img
                                src={selectedDetailRecord.record.clockIn.photoUrl}
                                alt="Foto Clock In"
                                className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
                                onClick={() => setZoomedPhoto({
                                  url: selectedDetailRecord.record!.clockIn!.photoUrl!,
                                  title: `Foto Clock In - ${selectedDetailRecord.teacher?.name} (${selectedDetailRecord.record?.clockIn?.time} WIB)`
                                })}
                              />
                              <div
                                onClick={() => setZoomedPhoto({
                                  url: selectedDetailRecord.record!.clockIn!.photoUrl!,
                                  title: `Foto Clock In - ${selectedDetailRecord.teacher?.name} (${selectedDetailRecord.record?.clockIn?.time} WIB)`
                                })}
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5 cursor-pointer backdrop-blur-2xs"
                              >
                                <Maximize2 className="w-4 h-4" />
                                <span>Perbesar Foto</span>
                              </div>
                            </>
                          ) : (
                            <div className="text-center p-4 text-gray-400">
                              <Camera className="w-8 h-8 mx-auto mb-1 opacity-40" />
                              <span className="text-xs font-medium">Foto tidak tersedia</span>
                            </div>
                          )}
                        </div>

                        {/* Location Info */}
                        <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 space-y-1.5 text-[11px]">
                          <div className="flex items-start gap-1.5 text-gray-700">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span className="line-clamp-2 leading-relaxed">
                              {selectedDetailRecord.record?.clockIn?.location?.address || config.geofenceCenter.address || "Area Utama Sekolah"}
                            </span>
                          </div>
                          {selectedDetailRecord.record?.clockIn?.location && (
                            <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1 border-t border-gray-200/60">
                              <span>GPS: {selectedDetailRecord.record.clockIn.location.lat?.toFixed(4)}, {selectedDetailRecord.record.clockIn.location.lng?.toFixed(4)}</span>
                              <span className={cn(
                                "px-1.5 py-0.5 rounded font-bold",
                                selectedDetailRecord.record.clockIn.location.inRadius !== false
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-rose-100 text-rose-700"
                              )}>
                                {selectedDetailRecord.record.clockIn.location.inRadius !== false ? "Dalam Radius" : "Luar Radius"}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Notes */}
                        {selectedDetailRecord.record?.clockIn?.notes && (
                          <div className="text-[11px] text-gray-600 bg-slate-50 px-3 py-1.5 rounded-lg">
                            <span className="font-bold text-gray-500 block text-[10px]">Catatan:</span>
                            "{selectedDetailRecord.record.clockIn.notes}"
                          </div>
                        )}
                      </div>
                    </div>

                    {/* === CLOCK OUT CARD === */}
                    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-xs flex flex-col">
                      <div className="px-4 py-3 bg-indigo-500/10 border-b border-indigo-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <LogOut className="w-4 h-4 text-indigo-600" />
                          <span className="text-xs font-black text-indigo-900">CLOCK OUT (PULANG)</span>
                        </div>
                        {selectedDetailRecord.record?.clockOut ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                            {selectedDetailRecord.record.clockOut.status || "Tercatat"}
                          </span>
                        ) : selectedDetailRecord.record?.clockIn ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 animate-pulse">
                            Sedang Bertugas
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            Belum Masuk
                          </span>
                        )}
                      </div>

                      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Waktu Tercatat:</span>
                          <span className="font-mono font-black text-indigo-700">
                            {selectedDetailRecord.record?.clockOut?.time ? (
                              `${selectedDetailRecord.record.clockOut.time} WIB`
                            ) : selectedDetailRecord.record?.clockIn ? (
                              <span className="text-blue-600">Sedang Bertugas</span>
                            ) : (
                              "-"
                            )}
                          </span>
                        </div>

                        {/* Photo Display */}
                        <div className="relative aspect-4/3 w-full bg-slate-100 rounded-xl overflow-hidden border border-gray-200 flex items-center justify-center group">
                          {selectedDetailRecord.record?.clockOut?.photoUrl ? (
                            <>
                              <img
                                src={selectedDetailRecord.record.clockOut.photoUrl}
                                alt="Foto Clock Out"
                                className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
                                onClick={() => setZoomedPhoto({
                                  url: selectedDetailRecord.record!.clockOut!.photoUrl!,
                                  title: `Foto Clock Out - ${selectedDetailRecord.teacher?.name} (${selectedDetailRecord.record?.clockOut?.time} WIB)`
                                })}
                              />
                              <div
                                onClick={() => setZoomedPhoto({
                                  url: selectedDetailRecord.record!.clockOut!.photoUrl!,
                                  title: `Foto Clock Out - ${selectedDetailRecord.teacher?.name} (${selectedDetailRecord.record?.clockOut?.time} WIB)`
                                })}
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5 cursor-pointer backdrop-blur-2xs"
                              >
                                <Maximize2 className="w-4 h-4" />
                                <span>Perbesar Foto</span>
                              </div>
                            </>
                          ) : selectedDetailRecord.record?.clockIn && !selectedDetailRecord.record?.clockOut ? (
                            <div className="text-center p-4 text-blue-500 space-y-1">
                              <Clock className="w-7 h-7 mx-auto text-blue-400" />
                              <span className="text-xs font-bold block text-blue-800">Sedang Bertugas</span>
                              <span className="text-[10px] text-gray-500">Guru belum melakukan presensi pulang</span>
                            </div>
                          ) : (
                            <div className="text-center p-4 text-gray-400">
                              <Camera className="w-8 h-8 mx-auto mb-1 opacity-40" />
                              <span className="text-xs font-medium">Foto tidak tersedia</span>
                            </div>
                          )}
                        </div>

                        {/* Location Info */}
                        <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 space-y-1.5 text-[11px]">
                          <div className="flex items-start gap-1.5 text-gray-700">
                            <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                            <span className="line-clamp-2 leading-relaxed">
                              {selectedDetailRecord.record?.clockOut?.location?.address ||
                                (selectedDetailRecord.record?.clockOut
                                  ? config.geofenceCenter.address
                                  : "Menunggu waktu pulang")}
                            </span>
                          </div>
                          {selectedDetailRecord.record?.clockOut?.location && (
                            <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1 border-t border-gray-200/60">
                              <span>GPS: {selectedDetailRecord.record.clockOut.location.lat?.toFixed(4)}, {selectedDetailRecord.record.clockOut.location.lng?.toFixed(4)}</span>
                              <span className={cn(
                                "px-1.5 py-0.5 rounded font-bold",
                                selectedDetailRecord.record.clockOut.location.inRadius !== false
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-rose-100 text-rose-700"
                              )}>
                                {selectedDetailRecord.record.clockOut.location.inRadius !== false ? "Dalam Radius" : "Luar Radius"}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Notes */}
                        {selectedDetailRecord.record?.clockOut?.notes && (
                          <div className="text-[11px] text-gray-600 bg-slate-50 px-3 py-1.5 rounded-lg">
                            <span className="font-bold text-gray-500 block text-[10px]">Catatan:</span>
                            "{selectedDetailRecord.record.clockOut.notes}"
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>

                {/* 4. Permit Info (if Izin/Sakit/Cuti) */}
                {(selectedDetailRecord.record?.status === "Izin" ||
                  selectedDetailRecord.record?.status === "Sakit" ||
                  selectedDetailRecord.record?.status === "Cuti" ||
                  selectedDetailRecord.record?.permitReason) && (
                  <div className="p-4 bg-purple-50/80 border border-purple-200 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-purple-900 font-bold text-xs">
                      <FileText className="w-4 h-4 text-purple-600" />
                      <span>Pengajuan Keterangan: {selectedDetailRecord.record?.status}</span>
                    </div>
                    <p className="text-xs text-purple-800 leading-relaxed">
                      {selectedDetailRecord.record?.permitReason || "Tidak ada alasan tertulis."}
                    </p>
                    {selectedDetailRecord.record?.permitDocUrl && (
                      <a
                        href={selectedDetailRecord.record.permitDocUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#531FFF] hover:underline pt-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Lihat Lampiran Dokumen Bukti</span>
                      </a>
                    )}
                  </div>
                )}

              </div>

              {/* Drawer Footer */}
              <div className="p-4 md:p-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Bukti</span>
                </button>

                <button
                  onClick={() => setSelectedDetailRecord(null)}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#531FFF] hover:bg-[#4315d6] rounded-xl shadow-md cursor-pointer transition-all"
                >
                  Tutup
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. LIGHTBOX MODAL: FULL PHOTO PREVIEW                                      */}
      {/* ========================================================================= */}
      {zoomedPhoto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-white/15 max-w-3xl w-full rounded-2xl overflow-hidden shadow-2xl space-y-3 p-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between text-white border-b border-white/10 pb-2">
              <h4 className="text-xs md:text-sm font-bold truncate pr-4">{zoomedPhoto.title}</h4>
              <button
                onClick={() => setZoomedPhoto(null)}
                className="p-1 text-white/70 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-hidden flex items-center justify-center rounded-xl bg-black">
              <img src={zoomedPhoto.url} alt={zoomedPhoto.title} className="max-h-[70vh] w-auto object-contain rounded-lg" />
            </div>
            <div className="text-right">
              <button
                onClick={() => setZoomedPhoto(null)}
                className="px-4 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
              >
                Tutup Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
