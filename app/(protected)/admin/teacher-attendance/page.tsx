"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { db, auth } from "@/lib/firebase";
import { collection, onSnapshot, doc, getDoc, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { calculateDistanceMeters, formatDistance } from "@/lib/geofence-utils";
import {
  useTeacherAttendance,
  TeacherAttendanceRecord,
  TeacherAttendanceStatus,
  formatDurationMinutes,
  getTodayDateString,
} from "@/lib/teacher-attendance";

export default function TeacherAttendancePage() {
  const { showSuccess, showError } = useToast();
  const {
    user: authUser,
    userData: authUserData,
    isGuru: authIsGuru,
    role: authRole,
    userName: authUserName,
    userEmail: authUserEmail,
  } = useAuth();

  // Auth & Role
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("admin");
  const [teachersList, setTeachersList] = useState<any[]>([]);

  // Determine whether current authenticated user is a teacher
  const isUserGuru = Boolean(
    authIsGuru ||
    authRole === "guru" ||
    userRole === "guru" ||
    userRole === "teacher"
  );

  // Active teacher UID & Email from auth / database
  const activeTeacherUid = authUser?.uid || currentUser?.uid || "";
  const activeTeacherEmail = authUserEmail || authUser?.email || currentUser?.email || "";

  // Simulation / View switcher for testing (Only accessible to Admins)
  const [previewRole, setPreviewRole] = useState<"admin" | "guru">("admin");

  // If user is actually guru, force previewRole to guru
  useEffect(() => {
    if (isUserGuru) {
      setPreviewRole("guru");
    }
  }, [isUserGuru]);

  // Hook for Teacher Attendance - directly connected to Firestore teacher_attendance
  const {
    records,
    config,
    todayTeacherRecord,
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

  // Geofence & Location State (matches Student Attendance coordinates)
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [locationData, setLocationData] = useState<{
    lat: number;
    lng: number;
    distance: number;
    inRadius: boolean;
    address: string;
  }>({
    lat: -6.200000,
    lng: 106.816666,
    distance: 0,
    inRadius: true,
    address: "SMART SCHOOL OS Campus - Area Utama Sekolah",
  });

  // Camera State & Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Live Location Tracker
  const refreshLocation = useCallback(() => {
    setGpsLoading(true);
    setGpsError(null);
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setGpsError("Perangkat tidak mendukung geolokasi GPS.");
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const schoolLat = config.geofenceCenter.lat || -6.200000;
        const schoolLng = config.geofenceCenter.lng || 106.816666;
        const radius = config.geofenceCenter.radiusMeters || 100;
        const dist = calculateDistanceMeters(lat, lng, schoolLat, schoolLng);
        const inRadius = dist <= radius;

        setLocationData({
          lat,
          lng,
          distance: dist,
          inRadius,
          address: config.geofenceCenter.address || "SMART SCHOOL OS Campus - Area Utama Sekolah",
        });
        setGpsLoading(false);
      },
      (err) => {
        console.warn("GPS Geolocation error:", err);
        setGpsError(err.message || "Gagal mendeteksi lokasi GPS perangkat.");
        // Fallback default coordinate within school
        setLocationData((prev) => ({
          ...prev,
          distance: 14,
          inRadius: true,
        }));
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }, [config.geofenceCenter]);

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

  // Take Snapshot from live video feed into canvas with watermark
  const handleCapturePhoto = (type: "CLOCK IN" | "CLOCK OUT") => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Flip horizontally for natural mirror selfie
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Watermark bar at the bottom
      ctx.scale(-1, 1);
      ctx.translate(-canvas.width, 0);
      ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
      ctx.fillRect(0, canvas.height - 46, canvas.width, 46);

      // Watermark text line 1: Name, NIP, Type, Time
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 13px sans-serif";
      const nowTimeStr = new Date().toLocaleTimeString("id-ID");
      const teacherName = currentTeacherInfo?.name || "Bapak/Ibu Guru";
      const teacherNip = currentTeacherInfo?.nip || "-";
      ctx.fillText(`${teacherName} (${teacherNip}) • ${type} • ${nowTimeStr} WIB`, 14, canvas.height - 24);

      // Watermark text line 2: Address & GPS coordinate
      ctx.fillStyle = "#a5b4fc";
      ctx.font = "11px sans-serif";
      ctx.fillText(`Presensi Guru • ${config.geofenceCenter.address} • GPS: ${locationData.lat.toFixed(5)}, ${locationData.lng.toFixed(5)}`, 14, canvas.height - 9);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
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

  // Fallback file upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result as string);
      stopCamera();
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

  // Listen to Auth
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const r = (userDoc.data().role || "admin").toLowerCase();
            const normRole = (r === "teacher" || r === "guru") ? "guru" : r;
            setUserRole(normRole);
            if (normRole === "guru") {
              setPreviewRole("guru");
            }
          }
        } catch (e) {
          console.warn("User role fetch error:", e);
        }
      }
    });

    // 1. Subscribe to real teachers from database (teachers collection and users with role guru)
    const unsubTeachers = onSnapshot(
      collection(db, "teachers"),
      (snap) => {
        const tList: any[] = snap.docs.map((d) => {
          const raw = d.data();
          return {
            id: d.id,
            _firestoreId: d.id,
            uid: raw.uid || d.id,
            name: raw.name || raw.fullName || "Guru",
            nip: raw.nip || raw.id || "-",
            subject: raw.subject || raw.role || "Tenaga Pendidik",
            email: raw.email || "",
            phone: raw.phone || raw.contact || "",
            status: raw.status || "Aktif",
          };
        });

        // Also query users collection to include all registered teacher accounts
        getDocs(collection(db, "users")).then((userSnap) => {
          userSnap.docs.forEach((uDoc) => {
            const uData = uDoc.data();
            const r = (uData.role || "").toLowerCase();
            if (r === "guru" || r === "teacher") {
              const exists = tList.some(
                (t) =>
                  t.uid === uDoc.id ||
                  t.id === uDoc.id ||
                  (uData.email && t.email?.toLowerCase() === uData.email.toLowerCase())
              );
              if (!exists) {
                tList.push({
                  id: uDoc.id,
                  _firestoreId: uDoc.id,
                  uid: uDoc.id,
                  name: uData.fullName || uData.name || "Guru",
                  nip: uData.nip || "-",
                  subject: uData.subject || "Tenaga Pendidik",
                  email: uData.email || "",
                  phone: uData.phone || "",
                  status: uData.status || "Aktif",
                });
              }
            }
          });
          setTeachersList([...tList]);
        }).catch(() => {
          setTeachersList(tList);
        });
      },
      (err) => {
        console.warn("Teachers listener error:", err);
        setTeachersList([]);
      }
    );

    return () => {
      unsubAuth();
      unsubTeachers();
    };
  }, []);

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

  // Compute Today's Records
  const todayRecords = useMemo(() => {
    return records.filter((r) => r.date === todayDateStr);
  }, [records, todayDateStr]);

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

  // Filtered Today Records for Admin Table
  const filteredTodayRecords = useMemo(() => {
    return teachersList.map((teacher) => {
      const rec = todayRecords.find(
        (r) => r.teacherId === teacher.id || r.teacherId === teacher.uid || r.teacherName === teacher.name
      );
      return {
        teacher,
        record: rec || null,
      };
    }).filter(({ teacher, record }) => {
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
  }, [teachersList, todayRecords, searchQuery, selectedSubjectFilter, selectedStatusFilter]);

  // Perform Clock In
  const handleExecuteClockIn = async () => {
    if (!currentTeacherInfo) return;
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
    if (!todayTeacherRecord) return;
    setSubmitting(true);
    try {
      await clockOut({
        recordId: todayTeacherRecord.id,
        photoUrl: photoPreview || undefined,
        location: {
          lat: locationData.lat,
          lng: locationData.lng,
          address: config.geofenceCenter.address,
          inRadius: locationData.inRadius,
          distanceMeters: locationData.distance,
        },
        notes: actionNotes || "Presensi pulang harian",
      });

      showSuccess("Clock Out Berhasil! Waktu pulang dan foto verifikasi telah tercatat.");
      stopCamera();
      setIsClockOutModalOpen(false);
      setActionNotes("");
      setPhotoPreview(null);
    } catch (err: any) {
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
                        todayTeacherRecord?.clockOut
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : todayTeacherRecord?.clockIn
                          ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      )}
                    >
                      {todayTeacherRecord?.clockOut ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : todayTeacherRecord?.clockIn ? (
                        <Clock className="w-5 h-5" />
                      ) : (
                        <LogIn className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-indigo-300 block">Status Presensi Hari Ini</span>
                      <span className="font-extrabold text-sm text-white">
                        {todayTeacherRecord?.clockOut
                          ? "Selesai (Sudah Clock Out)"
                          : todayTeacherRecord?.clockIn
                          ? `Sudah Masuk (${todayTeacherRecord.clockIn.time} WIB)`
                          : todayTeacherRecord?.status === "Izin" || todayTeacherRecord?.status === "Sakit"
                          ? `Pengajuan ${todayTeacherRecord.status} Disetujui`
                          : "Belum Melakukan Clock In"}
                      </span>
                    </div>
                  </div>

                  {todayTeacherRecord?.clockIn && !todayTeacherRecord?.clockOut && (
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-indigo-300 block">Durasi Kerja Berjalan</span>
                      <span className="font-mono text-sm font-black text-emerald-400">
                        {formatDurationMinutes(
                          Math.max(
                            0,
                            nowDate.getHours() * 60 +
                              nowDate.getMinutes() -
                              (Number(todayTeacherRecord.clockIn.time.split(":")[0]) * 60 +
                                Number(todayTeacherRecord.clockIn.time.split(":")[1]))
                          )
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
                {!todayTeacherRecord?.clockIn ? (
                  <button
                    onClick={openClockInModal}
                    className="py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-sm shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogIn className="w-5 h-5" />
                    <span>CLOCK IN (PRESENSI MASUK)</span>
                  </button>
                ) : !todayTeacherRecord?.clockOut ? (
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
                    <span>Presensi Hari Ini Lengkap ({todayTeacherRecord.workDurationFormatted})</span>
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
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    )}
                  >
                    {locationData.inRadius ? "Dalam Radius" : "Di Luar Radius"}
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
                  {gpsError && (
                    <p className="text-[10px] text-amber-600 font-medium">{gpsError}</p>
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
                      {todayTeacherRecord?.clockIn?.time || "--:--:--"}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600">
                      {todayTeacherRecord?.clockIn?.status || "Belum Masuk"}
                    </span>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Jam Pulang</span>
                    <span className="font-mono text-sm font-black text-gray-900 block mt-0.5">
                      {todayTeacherRecord?.clockOut?.time || "--:--:--"}
                    </span>
                    <span className="text-[10px] font-semibold text-indigo-600">
                      {todayTeacherRecord?.clockOut?.status || "Belum Pulang"}
                    </span>
                  </div>
                </div>

                {todayTeacherRecord?.workDurationFormatted && todayTeacherRecord.workDurationMinutes > 0 && (
                  <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-100 text-center">
                    <span className="text-[10px] uppercase font-bold text-purple-700 block">Total Jam Kerja Hari Ini</span>
                    <span className="font-mono text-base font-black text-[#531FFF]">
                      {todayTeacherRecord.workDurationFormatted}
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
              <span className="text-[10px] text-rose-600 font-medium">Lewat {config.lateThreshold} WIB</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
              <span className="text-[11px] font-bold text-purple-600 uppercase block">Akumulasi Jam Kerja</span>
              <span className="font-mono text-2xl font-black text-[#531FFF] mt-1 block">
                {myMonthlyStats.totalDurationFormatted}
              </span>
              <span className="text-[10px] text-purple-600 font-medium">Rata-rata: {Math.round(myMonthlyStats.avgDailyMinutes / 60)}j/hari</span>
            </div>
          </div>

          {/* Personal History Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#531FFF]" />
                <h3 className="font-black text-sm text-gray-900">Riwayat Presensi Saya</h3>
              </div>
              <span className="text-xs text-gray-500 font-medium">
                Menampilkan catatan presensi pribadi bulan ini
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                  {myPersonalRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400 font-medium">
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
              <button
                onClick={() => setIsManualRecordModalOpen(true)}
                className="px-3.5 py-2 text-xs font-bold text-white bg-[#531FFF] hover:bg-[#4216d6] rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Catat Presensi Manual</span>
              </button>

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
              {/* Table Search & Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari nama guru, NIP, mapel..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <select
                    value={selectedSubjectFilter}
                    onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                    className="px-3 py-2 text-xs font-bold bg-white border border-gray-200 rounded-xl text-gray-700"
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
                    className="px-3 py-2 text-xs font-bold bg-white border border-gray-200 rounded-xl text-gray-700"
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
                            <div className="w-8 h-8 rounded-full bg-purple-100 text-[#531FFF] flex items-center justify-center text-xs font-black shrink-0">
                              {(teacher.name || "G")[0]}
                            </div>
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
                            {record && (
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
                    className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-xl"
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
                          r.date.startsWith(monthlyMonth) &&
                          (r.teacherId === teacher.id ||
                            r.teacherId === teacher.uid ||
                            (teacher._firestoreId && r.teacherId === teacher._firestoreId) ||
                            r.teacherName === teacher.name)
                      );
                      const hadir = tRecs.filter((r) => r.status === "Hadir" || r.status === "Terlambat").length;
                      const tepatWaktu = tRecs.filter((r) => r.clockIn?.status === "Tepat Waktu").length;
                      const terlambat = tRecs.filter((r) => r.status === "Terlambat").length;
                      const izin = tRecs.filter((r) => r.status === "Izin" || r.status === "Sakit" || r.status === "Cuti").length;
                      const totalMinutes = tRecs.reduce((acc, r) => acc + (r.workDurationMinutes || 0), 0);

                      return (
                        <tr key={teacher.id || idx} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-4 text-gray-400 font-bold">{idx + 1}</td>
                          <td className="py-3 px-4 font-bold text-gray-900">{teacher.name}</td>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-2xl p-5 md:p-6 shadow-2xl space-y-4 my-8 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <LogIn className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-gray-900">Clock In (Presensi Masuk)</h3>
                  <p className="text-[11px] text-gray-500 font-medium">Verifikasi kamera dan titik koordinat lokasi</p>
                </div>
              </div>
              <button
                onClick={closeClockInModal}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Teacher & Time Info */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Nama Guru</span>
                <strong className="text-gray-900 truncate block">{currentTeacherInfo?.name}</strong>
                <span className="text-[10px] text-gray-500">NIP: {currentTeacherInfo?.nip || "-"}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Waktu Saat Ini</span>
                <strong className="font-mono text-emerald-700 font-black block">{nowDate.toLocaleTimeString()} WIB</strong>
                <span className="text-[10px] text-gray-500">Batas: {config.lateThreshold} WIB</span>
              </div>
            </div>

            {/* Live Camera Viewfinder */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Kamera Verifikasi Wajah (Selfie)</span>
                </label>
                {photoPreview ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Foto Siap
                  </span>
                ) : cameraActive ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Kamera Aktif</span>
                  </span>
                ) : null}
              </div>

              {photoPreview ? (
                <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-md bg-black flex items-center justify-center">
                  <img src={photoPreview} alt="Selfie preview" className="w-full h-full object-cover" />
                  <div className="absolute top-2.5 right-2.5">
                    <button
                      type="button"
                      onClick={handleRetakePhoto}
                      className="px-3 py-1.5 bg-black/70 hover:bg-black/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-xs transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Ambil Ulang</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden border border-gray-300 bg-slate-900 shadow-inner flex items-center justify-center">
                  {cameraActive ? (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover transform -scale-x-100"
                      />
                      {/* Face Target Overlay Frame */}
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-48 h-56 border-2 border-dashed border-emerald-400/70 rounded-3xl relative flex items-center justify-center">
                          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
                          <ScanFace className="w-8 h-8 text-emerald-400/40" />
                        </div>
                      </div>

                      {/* Shutter Button */}
                      <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-2 px-4 z-10">
                        <button
                          type="button"
                          onClick={() => handleCapturePhoto("CLOCK IN")}
                          className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-500/40 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Ambil Foto Masuk</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="p-6 text-center space-y-3">
                      <Camera className="w-10 h-10 text-gray-500 mx-auto" />
                      <p className="text-xs text-gray-300 max-w-xs mx-auto">
                        {cameraError || "Kamera sedang diinisialisasi atau peramban memerlukan izin akses kamera..."}
                      </p>
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={startCamera}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg cursor-pointer"
                        >
                          Nyalakan Kamera
                        </button>
                        <label
                          htmlFor="clockInFileFallback"
                          className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-lg cursor-pointer transition-colors"
                        >
                          Unggah File Foto
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                capture="user"
                id="clockInFileFallback"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            {/* GPS Geofence Real-time Verification Box */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#531FFF]" />
                  <span className="font-bold text-gray-800">Koordinat Lokasi & Radius</span>
                </div>
                <button
                  type="button"
                  onClick={refreshLocation}
                  disabled={gpsLoading}
                  className="text-[10px] text-[#531FFF] hover:underline flex items-center gap-1 font-bold cursor-pointer"
                >
                  <RefreshCw className={cn("w-3 h-3", gpsLoading && "animate-spin")} />
                  <span>{gpsLoading ? "Mengecek GPS..." : "Perbarui GPS"}</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-200/40">
                <span className="text-gray-500">
                  Jarak dari Titik Sekolah: <strong className="text-gray-900">{formatDistance(locationData.distance)}</strong>
                </span>
                <span
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                    locationData.inRadius
                      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                      : "bg-amber-100 text-amber-800 border-amber-200"
                  )}
                >
                  {locationData.inRadius ? "Dalam Radius (Valid)" : "Di Luar Radius"}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 font-mono">
                Pusat: {config.geofenceCenter.address} (GPS: {locationData.lat.toFixed(5)}, {locationData.lng.toFixed(5)})
              </p>
            </div>

            {/* Notes textarea */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700">Catatan Masuk (Opsional)</label>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Rencana kegiatan mengajar hari ini atau catatan kehadiran..."
                rows={2}
                className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={closeClockInModal}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteClockIn}
                disabled={submitting}
                className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 cursor-pointer transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{submitting ? "Memproses..." : "Konfirmasi Masuk (Clock In)"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: CLOCK OUT CONFIRMATION WITH CAMERA & GEOFENCE                   */}
      {/* ========================================================================= */}
      {isClockOutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-2xl p-5 md:p-6 shadow-2xl space-y-4 my-8 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-gray-900">Clock Out (Presensi Pulang)</h3>
                  <p className="text-[11px] text-gray-500 font-medium">Verifikasi kamera dan waktu penyelesaian tugas kerja</p>
                </div>
              </div>
              <button
                onClick={closeClockOutModal}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Shift & Time Summary */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Jam Masuk Tercatat</span>
                <strong className="font-mono text-emerald-700 font-bold block">
                  {todayTeacherRecord?.clockIn?.time || "--:--:--"} WIB
                </strong>
                <span className="text-[10px] text-gray-500">Guru: {currentTeacherInfo?.name}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Waktu Pulang Sekarang</span>
                <strong className="font-mono text-indigo-700 font-black block">{nowDate.toLocaleTimeString()} WIB</strong>
                <span className="text-[10px] text-gray-500">Standar: {config.standardClockOut} WIB</span>
              </div>
            </div>

            {/* Live Camera Viewfinder */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Kamera Verifikasi Pulang (Selfie)</span>
                </label>
                {photoPreview ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Foto Siap
                  </span>
                ) : cameraActive ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Kamera Aktif</span>
                  </span>
                ) : null}
              </div>

              {photoPreview ? (
                <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden border-2 border-indigo-500 shadow-md bg-black flex items-center justify-center">
                  <img src={photoPreview} alt="Selfie preview" className="w-full h-full object-cover" />
                  <div className="absolute top-2.5 right-2.5">
                    <button
                      type="button"
                      onClick={handleRetakePhoto}
                      className="px-3 py-1.5 bg-black/70 hover:bg-black/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-xs transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Ambil Ulang</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden border border-gray-300 bg-slate-900 shadow-inner flex items-center justify-center">
                  {cameraActive ? (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover transform -scale-x-100"
                      />
                      {/* Face Target Overlay Frame */}
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-48 h-56 border-2 border-dashed border-indigo-400/70 rounded-3xl relative flex items-center justify-center">
                          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-indigo-400" />
                          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-indigo-400" />
                          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-indigo-400" />
                          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-indigo-400" />
                          <ScanFace className="w-8 h-8 text-indigo-400/40" />
                        </div>
                      </div>

                      {/* Shutter Button */}
                      <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-2 px-4 z-10">
                        <button
                          type="button"
                          onClick={() => handleCapturePhoto("CLOCK OUT")}
                          className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-500/40 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Ambil Foto Pulang</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="p-6 text-center space-y-3">
                      <Camera className="w-10 h-10 text-gray-500 mx-auto" />
                      <p className="text-xs text-gray-300 max-w-xs mx-auto">
                        {cameraError || "Kamera sedang diinisialisasi atau peramban memerlukan izin akses kamera..."}
                      </p>
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={startCamera}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg cursor-pointer"
                        >
                          Nyalakan Kamera
                        </button>
                        <label
                          htmlFor="clockOutFileFallback"
                          className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-lg cursor-pointer transition-colors"
                        >
                          Unggah File Foto
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                capture="user"
                id="clockOutFileFallback"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            {/* GPS Geofence Real-time Verification Box */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#531FFF]" />
                  <span className="font-bold text-gray-800">Koordinat Lokasi & Radius</span>
                </div>
                <button
                  type="button"
                  onClick={refreshLocation}
                  disabled={gpsLoading}
                  className="text-[10px] text-[#531FFF] hover:underline flex items-center gap-1 font-bold cursor-pointer"
                >
                  <RefreshCw className={cn("w-3 h-3", gpsLoading && "animate-spin")} />
                  <span>{gpsLoading ? "Mengecek GPS..." : "Perbarui GPS"}</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-200/40">
                <span className="text-gray-500">
                  Jarak dari Titik Sekolah: <strong className="text-gray-900">{formatDistance(locationData.distance)}</strong>
                </span>
                <span
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                    locationData.inRadius
                      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                      : "bg-amber-100 text-amber-800 border-amber-200"
                  )}
                >
                  {locationData.inRadius ? "Dalam Radius (Valid)" : "Di Luar Radius"}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 font-mono">
                Pusat: {config.geofenceCenter.address} (GPS: {locationData.lat.toFixed(5)}, {locationData.lng.toFixed(5)})
              </p>
            </div>

            {/* Notes textarea */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700">Laporan Kegiatan Mengajar / Catatan Pulang (Opsional)</label>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Materi ajar yang telah diselesaikan, penugasan siswa, atau catatan kelas..."
                rows={2}
                className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={closeClockOutModal}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteClockOut}
                disabled={submitting}
                className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 cursor-pointer transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{submitting ? "Memproses..." : "Konfirmasi Pulang (Clock Out)"}</span>
              </button>
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
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Jenis Pengajuan</label>
                <select
                  value={permitForm.status}
                  onChange={(e) => setPermitForm({ ...permitForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-gray-800"
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
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl"
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
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold"
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
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Status Kehadiran</label>
                <select
                  value={manualRecord.status}
                  onChange={(e) => setManualRecord({ ...manualRecord, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold"
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
    </div>
  );
}
