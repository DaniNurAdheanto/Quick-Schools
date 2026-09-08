"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  MapPin,
  ScanFace,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  AlertTriangle,
  Map,
  Calendar,
  Users,
  List,
  Download,
  ChevronDown,
  LayoutGrid,
  ShieldCheck,
  Building2,
  ExternalLink,
  Sliders,
  Sparkles,
  Printer,
  FileText,
  Save,
  Check,
  Send,
  Smartphone,
  Info,
  CalendarDays,
  AlertCircle,
  Compass
} from "lucide-react";
import { cn } from "@/lib/utils";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  setDoc
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useToast } from "@/context/ToastContext";
import { QuickAttendanceModal } from "@/components/modals/quick-attendance-modal";

// -------------------------------------------------------------
// Types & Defaults
// -------------------------------------------------------------
export type AttendanceStatus = "Hadir" | "Terlambat" | "Sakit" | "Izin" | "Alpa" | "Ditolak";

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // HH:mm:ss
  status: AttendanceStatus;
  notes?: string;
  faceVerified?: boolean;
  faceMatchScore?: number;
  capturedImage?: string;
  location?: {
    lat: number;
    lng: number;
    distance: number;
    inRadius: boolean;
  };
  source?: "biometric" | "manual" | "qr";
  markedBy?: string;
  createdAt?: any;
}

export interface AttendanceConfig {
  schoolStartTime: string;
  lateToleranceMinutes: number;
  absentThresholdTime: string;
  schoolEndTime: string;
  activeDays: string[];
  geofenceRadiusMeters: number;
  schoolCenterLat: number;
  schoolCenterLng: number;
  requireRadius: boolean;
  enableFaceBiometric: boolean;
  enableLivenessDetection: boolean;
  minFaceMatchScore: number;
  notifyParentOnLate: boolean;
  notifyParentOnAbsent: boolean;
  whatsappTemplateLate: string;
  whatsappTemplateAbsent: string;
}

const DEFAULT_CONFIG: AttendanceConfig = {
  schoolStartTime: "07:00",
  lateToleranceMinutes: 15,
  absentThresholdTime: "08:30",
  schoolEndTime: "15:30",
  activeDays: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
  geofenceRadiusMeters: 100,
  schoolCenterLat: -6.200000,
  schoolCenterLng: 106.816666,
  requireRadius: true,
  enableFaceBiometric: true,
  enableLivenessDetection: true,
  minFaceMatchScore: 80,
  notifyParentOnLate: true,
  notifyParentOnAbsent: true,
  whatsappTemplateLate: "Yth. Orang Tua/Wali dari [NAMA_SISWA], kami informasikan bahwa ananda terlambat tiba di sekolah pada pukul [WAKTU]. Terima kasih.",
  whatsappTemplateAbsent: "Yth. Orang Tua/Wali dari [NAMA_SISWA], hingga pukul [WAKTU] ananda tercatat belum hadir tanpa keterangan (Alpa). Mohon konfirmasi ke pihak sekolah."
};

// Fallback Mock data for Biometric feed demo if attendance collection is empty
const MOCK_BIOMETRIC_FEED: AttendanceRecord[] = [
  {
    id: "ATT-1001",
    studentName: "Ahmad Rizqi Pratama",
    studentId: "NISN-2023001",
    className: "10 MIPA 1",
    timestamp: "06:45:22",
    date: new Date().toISOString().split("T")[0],
    faceVerified: true,
    faceMatchScore: 98.5,
    capturedImage: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80",
    location: {
      lat: -6.200000,
      lng: 106.816666,
      distance: 12,
      inRadius: true
    },
    status: "Hadir",
    source: "biometric"
  },
  {
    id: "ATT-1002",
    studentName: "Budi Santoso",
    studentId: "NISN-2023002",
    className: "10 MIPA 1",
    timestamp: "07:08:15",
    date: new Date().toISOString().split("T")[0],
    faceVerified: true,
    faceMatchScore: 92.1,
    capturedImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
    location: {
      lat: -6.200100,
      lng: 106.816700,
      distance: 25,
      inRadius: true
    },
    status: "Terlambat",
    source: "biometric",
    notes: "Terlambat 8 menit melewati jam 07:00"
  },
  {
    id: "ATT-1003",
    studentName: "Citra Lestari",
    studentId: "NISN-2023003",
    className: "10 MIPA 2",
    timestamp: "06:50:05",
    date: new Date().toISOString().split("T")[0],
    faceVerified: false,
    faceMatchScore: 45.2,
    capturedImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80",
    location: {
      lat: -6.200050,
      lng: 106.816680,
      distance: 15,
      inRadius: true
    },
    status: "Ditolak",
    notes: "Wajah Tidak Cocok dengan Master Database",
    source: "biometric"
  },
  {
    id: "ATT-1004",
    studentName: "Bintang Pratama",
    studentId: "IS3U2ZSg0WaOIad7HHYmiEeVXHz1",
    className: "10 MIPA 1",
    timestamp: "06:38:40",
    date: new Date().toISOString().split("T")[0],
    faceVerified: true,
    faceMatchScore: 97.2,
    capturedImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
    location: {
      lat: -6.200010,
      lng: 106.816670,
      distance: 8,
      inRadius: true
    },
    status: "Hadir",
    source: "biometric"
  },
  {
    id: "ATT-1005",
    studentName: "Wahyu Hidayat",
    studentId: "Kv8XK680MQOZXrwLVLTg4vaq55p1",
    className: "10 MIPA 1",
    timestamp: "06:52:19",
    date: new Date().toISOString().split("T")[0],
    faceVerified: true,
    faceMatchScore: 94.8,
    capturedImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80",
    location: {
      lat: -6.200020,
      lng: 106.816680,
      distance: 14,
      inRadius: true
    },
    status: "Hadir",
    source: "biometric"
  }
];

export default function AttendancePage() {
  const toast = useToast();

  // Tab State: "daily" | "biometric" | "monthly" | "config"
  const [activeTab, setActiveTab] = useState<"daily" | "biometric" | "monthly" | "config">("daily");

  // User Authentication State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("admin");
  const [studentInfo, setStudentInfo] = useState<any>(null);

  // General Page State
  const [loading, setLoading] = useState(true);
  const [showScanModal, setShowScanModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  // Firestore Real-Time Data State
  const [classesList, setClassesList] = useState<any[]>([]);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [config, setConfig] = useState<AttendanceConfig>(DEFAULT_CONFIG);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Tab 1: Daily Class Attendance State
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [selectedClass, setSelectedClass] = useState<string>("10 MIPA 1");
  const [classAttendanceMap, setClassAttendanceMap] = useState<Record<string, { status: AttendanceStatus; notes: string; time: string }>>({});
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [searchTermDaily, setSearchTermDaily] = useState("");

  // Tab 2: Biometric Log State
  const [biometricSearch, setBiometricSearch] = useState("");
  const [biometricStatusFilter, setBiometricStatusFilter] = useState("Semua");
  const [biometricClassFilter, setBiometricClassFilter] = useState("Semua Kelas");
  const [biometricViewMode, setBiometricViewMode] = useState<"table" | "grid" | "map">("table");

  // Tab 3: Monthly Summary State
  const [monthlyMonth, setMonthlyMonth] = useState<string>("2026-09");
  const [monthlyClassFilter, setMonthlyClassFilter] = useState<string>("Semua");

  // -------------------------------------------------------------
  // 1. Initial Listeners (Auth, Classes, Students, Attendance, Config)
  // -------------------------------------------------------------
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const rawRole = (data.role || "admin").toLowerCase();
            const role = (rawRole === "student" || rawRole === "siswa") ? "siswa" : rawRole;
            setUserRole(role);
            setStudentInfo({
              id: user.uid,
              name: data.name || user.displayName || user.email?.split("@")[0] || "Siswa",
              email: user.email,
              nisn: data.nisn || data.studentId || "NISN-2023001",
              className: data.className || data.kelas || "10 MIPA 1"
            });
            if (role === "siswa") {
              setSelectedClass(data.className || data.kelas || "10 MIPA 1");
            }
          }
        } catch (err) {
          console.error("Attendance user role fetch error:", err);
        }
      }
    });

    // 2. Fetch Classes from Firestore
    const unsubClasses = onSnapshot(collection(db, "classes"), (snap) => {
      const list: any[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      if (list.length > 0) {
        setClassesList(list);
        if (!selectedClass || selectedClass === "10 MIPA 1") {
          const found = list.find(c => c.name === "10 MIPA 1") || list[0];
          setSelectedClass(found.name);
        }
      } else {
        // Fallback default school classes
        const defaultClasses = [
          { id: "c1", name: "10 MIPA 1" },
          { id: "c2", name: "10 MIPA 2" },
          { id: "c3", name: "10 MIPA 3" },
          { id: "c4", name: "11 MIPA 1" },
          { id: "c5", name: "12 MIPA 1" }
        ];
        setClassesList(defaultClasses);
      }
    }, (err) => {
      console.warn("Classes snapshot error, using default classes:", err);
      setClassesList([
        { id: "c1", name: "10 MIPA 1" },
        { id: "c2", name: "10 MIPA 2" },
        { id: "c3", name: "11 MIPA 1" },
        { id: "c4", name: "12 MIPA 1" }
      ]);
    });

    // 3. Fetch Students from Firestore
    const unsubStudents = onSnapshot(collection(db, "students"), (snap) => {
      const list: any[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setStudentsList(list);
    }, (err) => {
      console.warn("Students snapshot error:", err);
    });

    // 4. Fetch Attendance Records from Firestore
    const unsubAttendance = onSnapshot(collection(db, "attendance"), (snap) => {
      if (!snap.empty) {
        const list: AttendanceRecord[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            studentId: data.studentId || d.id,
            studentName: data.studentName || "Siswa",
            className: data.className || data.classId || "10 MIPA 1",
            date: data.date || new Date().toISOString().split("T")[0],
            timestamp: data.timestamp || "07:00:00",
            status: data.status || "Hadir",
            notes: data.notes || "",
            faceVerified: data.faceVerified ?? true,
            faceMatchScore: data.faceMatchScore ?? 95,
            capturedImage: data.capturedImage || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
            location: data.location || {
              lat: -6.200000,
              lng: 106.816666,
              distance: 10,
              inRadius: true
            },
            source: data.source || "manual",
            markedBy: data.markedBy || "Admin",
            createdAt: data.createdAt
          });
        });

        // Sort newest first
        list.sort((a, b) => {
          if (a.date !== b.date) return b.date.localeCompare(a.date);
          return (b.timestamp || "").localeCompare(a.timestamp || "");
        });

        setAttendanceRecords(list);
      } else {
        setAttendanceRecords(MOCK_BIOMETRIC_FEED);
      }
      setLoading(false);
    }, (err) => {
      console.warn("Attendance snapshot error, using mock data:", err);
      setAttendanceRecords(MOCK_BIOMETRIC_FEED);
      setLoading(false);
    });

    // 5. Fetch Attendance Config from Firestore
    const unsubConfig = onSnapshot(doc(db, "attendance_config", "general"), (dSnap) => {
      if (dSnap.exists()) {
        setConfig({ ...DEFAULT_CONFIG, ...dSnap.data() } as AttendanceConfig);
      }
    }, (err) => {
      console.warn("Attendance config read error:", err);
    });

    return () => {
      unsubAuth();
      unsubClasses();
      unsubStudents();
      unsubAttendance();
      unsubConfig();
    };
  }, []);

  const isStudentRole = userRole === "siswa" || userRole === "student";

  // -------------------------------------------------------------
  // Filtered Students for the selected class (Tab 1)
  // -------------------------------------------------------------
  const classStudents = useMemo(() => {
    if (studentsList.length === 0) {
      // Fallback sample students if students collection is empty
      return [
        { id: "S101", name: "Ahmad Rizqi Pratama", classId: selectedClass, nisn: "2023001" },
        { id: "S102", name: "Budi Santoso", classId: selectedClass, nisn: "2023002" },
        { id: "S103", name: "Bintang Pratama", classId: selectedClass, nisn: "2023003" },
        { id: "S104", name: "Citra Lestari", classId: selectedClass, nisn: "2023004" },
        { id: "S105", name: "Wahyu Hidayat", classId: selectedClass, nisn: "2023005" }
      ];
    }

    const filtered = studentsList.filter((s) => {
      const cName = (s.classId || s.className || "").toString().toLowerCase().trim();
      const target = selectedClass.toLowerCase().trim();
      return cName === target || cName.replace(/\s+/g, "") === target.replace(/\s+/g, "");
    });

    if (filtered.length > 0) return filtered;

    // If no students match the exact class, return all students or first 12
    return studentsList.slice(0, 12);
  }, [studentsList, selectedClass]);

  // Synchronize classAttendanceMap when class, date, or records change
  useEffect(() => {
    const map: Record<string, { status: AttendanceStatus; notes: string; time: string }> = {};

    classStudents.forEach((student) => {
      // Check if there is an existing record for this student on this date
      const existing = attendanceRecords.find(
        (r) =>
          r.date === selectedDate &&
          (r.studentId === student.id || r.studentName.toLowerCase() === (student.name || "").toLowerCase())
      );

      if (existing) {
        map[student.id] = {
          status: existing.status,
          notes: existing.notes || "",
          time: existing.timestamp || "07:00"
        };
      } else {
        // Default to "Hadir"
        map[student.id] = {
          status: "Hadir",
          notes: "",
          time: "06:55"
        };
      }
    });

    setClassAttendanceMap(map);
  }, [selectedClass, selectedDate, classStudents, attendanceRecords]);

  // Quick action: Mark all as Hadir
  const handleMarkAllHadir = () => {
    const updated = { ...classAttendanceMap };
    classStudents.forEach((st) => {
      updated[st.id] = {
        status: "Hadir",
        notes: "",
        time: config.schoolStartTime
      };
    });
    setClassAttendanceMap(updated);
    toast.showSuccess(`Semua ${classStudents.length} siswa di kelas ${selectedClass} ditandai Hadir.`, "Tandai Semua Hadir");
  };

  // Quick single change
  const handleStudentStatusChange = (studentId: string, status: AttendanceStatus) => {
    setClassAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { notes: "", time: "07:00" }),
        status
      }
    }));
  };

  const handleStudentNotesChange = (studentId: string, notes: string) => {
    setClassAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { status: "Hadir", time: "07:00" }),
        notes
      }
    }));
  };

  // Save Batch Class Attendance to Firestore
  const handleSaveClassAttendance = async () => {
    setIsSavingBatch(true);
    try {
      for (const student of classStudents) {
        const att = classAttendanceMap[student.id] || { status: "Hadir", notes: "", time: "07:00" };
        const docId = `ATT-${selectedDate}-${student.id}`;

        await setDoc(doc(db, "attendance", docId), {
          id: docId,
          studentId: student.id,
          studentName: student.name,
          className: selectedClass,
          date: selectedDate,
          timestamp: att.time || "07:00:00",
          status: att.status,
          notes: att.notes || "",
          source: "manual",
          markedBy: currentUser?.displayName || currentUser?.email || "Admin",
          faceVerified: att.status === "Hadir" || att.status === "Terlambat",
          faceMatchScore: 100,
          location: {
            lat: config.schoolCenterLat,
            lng: config.schoolCenterLng,
            distance: 5,
            inRadius: true
          },
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      toast.showSuccess(
        `Presensi kelas ${selectedClass} untuk tanggal ${selectedDate} berhasil disimpan.`,
        "Presensi Disimpan"
      );
    } catch (err: any) {
      console.error("Save class attendance error:", err);
      toast.showError("Gagal menyimpan presensi kelas: " + err.message, "Gagal");
    } finally {
      setIsSavingBatch(false);
    }
  };

  // -------------------------------------------------------------
  // Save Attendance Configuration (Tab 4)
  // -------------------------------------------------------------
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      await setDoc(doc(db, "attendance_config", "general"), {
        ...config,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.email || "admin"
      }, { merge: true });

      toast.showSuccess("Aturan & Konfigurasi Jam Presensi berhasil disimpan.", "Pengaturan Diperbarui");
    } catch (err: any) {
      console.error("Error saving attendance config:", err);
      toast.showError("Gagal menyimpan pengaturan: " + err.message, "Error");
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Get Current Geolocation helper
  const handleDetectCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setConfig((prev) => ({
            ...prev,
            schoolCenterLat: Number(pos.coords.latitude.toFixed(6)),
            schoolCenterLng: Number(pos.coords.longitude.toFixed(6))
          }));
          toast.showSuccess("Koordinat GPS berhasil disinkronkan dengan lokasi Anda.", "Lokasi Terdeteksi");
        },
        (err) => {
          toast.showError("Gagal mengambil lokasi: " + err.message, "GPS Gagal");
        }
      );
    } else {
      toast.showError("Geolocation tidak didukung oleh browser Anda.", "Tidak Didukung");
    }
  };

  // -------------------------------------------------------------
  // Summary Metrics Calculation
  // -------------------------------------------------------------
  const todayDateStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const statsToday = useMemo(() => {
    const todayRecords = attendanceRecords.filter((r) => r.date === todayDateStr || r.date === selectedDate);
    const total = todayRecords.length || classStudents.length;

    let hadir = 0;
    let terlambat = 0;
    let sakit = 0;
    let izin = 0;
    let alpa = 0;

    if (todayRecords.length > 0) {
      todayRecords.forEach((r) => {
        if (r.status === "Hadir") hadir++;
        else if (r.status === "Terlambat") terlambat++;
        else if (r.status === "Sakit") sakit++;
        else if (r.status === "Izin") izin++;
        else if (r.status === "Alpa" || r.status === "Ditolak") alpa++;
      });
    } else {
      // Use classAttendanceMap for current class
      Object.values(classAttendanceMap).forEach((val) => {
        if (val.status === "Hadir") hadir++;
        else if (val.status === "Terlambat") terlambat++;
        else if (val.status === "Sakit") sakit++;
        else if (val.status === "Izin") izin++;
        else if (val.status === "Alpa") alpa++;
      });
    }

    const attendanceRate = total > 0 ? (((hadir + terlambat) / total) * 100).toFixed(1) : "100.0";

    return { total, hadir, terlambat, sakit, izin, alpa, attendanceRate };
  }, [attendanceRecords, todayDateStr, selectedDate, classStudents.length, classAttendanceMap]);

  // -------------------------------------------------------------
  // Biometric Filtered Logs (Tab 2)
  // -------------------------------------------------------------
  const filteredBiometricData = useMemo(() => {
    return attendanceRecords.filter((item) => {
      const matchSearch =
        (item.studentName?.toLowerCase() || "").includes(biometricSearch.toLowerCase()) ||
        (item.studentId?.toLowerCase() || "").includes(biometricSearch.toLowerCase()) ||
        (item.className?.toLowerCase() || "").includes(biometricSearch.toLowerCase()) ||
        (item.date?.toLowerCase() || "").includes(biometricSearch.toLowerCase());

      const matchStatus =
        biometricStatusFilter === "Semua" ||
        item.status === biometricStatusFilter;

      const matchClass =
        biometricClassFilter === "Semua Kelas" ||
        item.className === biometricClassFilter;

      return matchSearch && matchStatus && matchClass;
    });
  }, [attendanceRecords, biometricSearch, biometricStatusFilter, biometricClassFilter]);

  // -------------------------------------------------------------
  // Monthly Analytics & Early Warning (Tab 3)
  // -------------------------------------------------------------
  const monthlySummaryList = useMemo(() => {
    const map: Record<
      string,
      {
        id: string;
        name: string;
        className: string;
        hadir: number;
        terlambat: number;
        sakit: number;
        izin: number;
        alpa: number;
        total: number;
      }
    > = {};

    // Populate from all students
    studentsList.forEach((st) => {
      map[st.id] = {
        id: st.id,
        name: st.name || "Siswa",
        className: st.classId || st.className || "10 MIPA 1",
        hadir: 0,
        terlambat: 0,
        sakit: 0,
        izin: 0,
        alpa: 0,
        total: 0
      };
    });

    // Tally attendance records matching monthlyMonth (YYYY-MM)
    attendanceRecords.forEach((r) => {
      if (r.date && r.date.startsWith(monthlyMonth)) {
        let entry = map[r.studentId];
        if (!entry) {
          // If student not in map, create
          entry = {
            id: r.studentId,
            name: r.studentName,
            className: r.className,
            hadir: 0,
            terlambat: 0,
            sakit: 0,
            izin: 0,
            alpa: 0,
            total: 0
          };
          map[r.studentId] = entry;
        }

        entry.total++;
        if (r.status === "Hadir") entry.hadir++;
        else if (r.status === "Terlambat") entry.terlambat++;
        else if (r.status === "Sakit") entry.sakit++;
        else if (r.status === "Izin") entry.izin++;
        else if (r.status === "Alpa" || r.status === "Ditolak") entry.alpa++;
      }
    });

    const arr = Object.values(map);

    // Filter by class if selected
    const filtered = monthlyClassFilter === "Semua"
      ? arr
      : arr.filter(i => i.className === monthlyClassFilter);

    // Calculate attendance percentage & sort by most issues first
    return filtered.map((item) => {
      const activeDaysCount = item.total || 22; // default 22 school days in month
      const attended = item.hadir + item.terlambat;
      const rate = activeDaysCount > 0 ? ((attended / activeDaysCount) * 100).toFixed(1) : "100.0";
      return {
        ...item,
        activeDaysCount,
        rate: Number(rate),
        isCritical: item.alpa >= 3 || item.terlambat >= 4
      };
    }).sort((a, b) => (b.alpa + b.terlambat) - (a.alpa + a.terlambat));
  }, [studentsList, attendanceRecords, monthlyMonth, monthlyClassFilter]);

  const criticalStudents = useMemo(() => {
    return monthlySummaryList.filter((s) => s.isCritical);
  }, [monthlySummaryList]);

  // -------------------------------------------------------------
  // Export & Print Handlers
  // -------------------------------------------------------------
  const handleExportCSV = () => {
    const headers = [
      "ID Siswa",
      "Nama Siswa",
      "Kelas",
      "Tanggal",
      "Waktu",
      "Status",
      "Sumber",
      "Keterangan"
    ];

    const dataToExport = activeTab === "daily"
      ? classStudents.map((st) => {
          const val = classAttendanceMap[st.id] || { status: "Hadir", notes: "", time: "07:00" };
          return [st.id, `"${st.name}"`, `"${selectedClass}"`, selectedDate, val.time, val.status, "Manual/Kelas", `"${val.notes}"`];
        })
      : filteredBiometricData.map((r) => [
          r.studentId,
          `"${r.studentName}"`,
          `"${r.className}"`,
          r.date,
          r.timestamp,
          r.status,
          r.source || "Biometric",
          `"${r.notes || ''}"`
        ]);

    const csvContent = [headers.join(","), ...dataToExport.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_Presensi_${selectedClass}_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.showInfo("Laporan absensi berhasil diekspor ke file CSV.", "Ekspor Selesai");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6 animate-in fade-in duration-300">
      
      {/* Quick Attendance Scan Camera Modal */}
      <QuickAttendanceModal
        isOpen={showScanModal}
        onClose={() => setShowScanModal(false)}
        userName={studentInfo?.name || currentUser?.displayName || "Siswa"}
        studentClass={studentInfo?.className || selectedClass}
        studentId={studentInfo?.nisn || "NISN-2023001"}
      />

      {/* ------------------------------------------------------------- */}
      {/* 1. Header & Executive Controls */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#531FFF] to-[#7344FF] text-white flex items-center justify-center shadow-md shadow-[#531FFF]/20">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                  Manajemen & Monitoring Absensi
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-bold bg-[#F3F0FF] text-[#531FFF] rounded-full border border-[#531FFF]/20 flex items-center gap-1.5">
                  <span className={cn("w-1.5 h-1.5 rounded-full", loading ? "bg-amber-400 animate-ping" : "bg-emerald-500 animate-pulse")} />
                  {loading ? "Memuat Data..." : "Live Sync"}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Pencatatan harian kelas, monitoring biometrik & GPS, rekapitulasi kehadiran, serta konfigurasi aturan sekolah.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowScanModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 active:scale-[0.98] transition-all text-xs font-extrabold shadow-sm cursor-pointer border border-white/20"
          >
            <ScanFace className="w-4 h-4 text-white animate-pulse" />
            <span>Kamera & GPS Scan</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 active:scale-[0.98] transition-all text-xs font-bold shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-gray-500" />
            <span>Ekspor CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 active:scale-[0.98] transition-all text-xs font-bold shadow-xs print:hidden cursor-pointer"
          >
            <Printer className="w-4 h-4 text-gray-500" />
            <span>Cetak Rekap</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. Real-Time KPI Cards (Ringkasan Kehadiran Hari Ini) */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Tingkat Kehadiran */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:border-[#531FFF]/30 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Tingkat Hadir</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-[#531FFF] flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">{statsToday.attendanceRate}%</h3>
            <p className="text-[11px] text-emerald-600 font-bold mt-0.5">Persentase Hari Ini</p>
          </div>
        </div>

        {/* Total Siswa */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:border-gray-200 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Total Siswa</span>
            <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">{statsToday.total}</h3>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">Terjadwal</p>
          </div>
        </div>

        {/* Hadir Tepat */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:border-emerald-200 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Hadir Tepat</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-emerald-600 tracking-tight">{statsToday.hadir}</h3>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">Siswa Hadir</p>
          </div>
        </div>

        {/* Terlambat */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:border-amber-200 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Terlambat</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-amber-600 tracking-tight">{statsToday.terlambat}</h3>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">Lewat jam masuk</p>
          </div>
        </div>

        {/* Sakit & Izin */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:border-blue-200 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Sakit / Izin</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Info className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-blue-600 tracking-tight">{statsToday.sakit + statsToday.izin}</h3>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">Dengan Keterangan</p>
          </div>
        </div>

        {/* Alpa / Tanpa Keterangan */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:border-rose-200 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Alpa</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-rose-600 tracking-tight">{statsToday.alpa}</h3>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">Tanpa Keterangan</p>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. Navigation Tabs Bar */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center justify-between border-b border-gray-200 overflow-x-auto scrollbar-none gap-2">
        <div className="flex items-center gap-1.5 min-w-max">
          <button
            type="button"
            onClick={() => setActiveTab("daily")}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer",
              activeTab === "daily"
                ? "border-[#531FFF] text-[#531FFF] bg-purple-50/40 rounded-t-xl"
                : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
            )}
          >
            <Calendar className="w-4 h-4" />
            <span>Presensi Harian Kelas</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-600 font-extrabold">
              {classStudents.length} Siswa
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("biometric")}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer",
              activeTab === "biometric"
                ? "border-[#531FFF] text-[#531FFF] bg-purple-50/40 rounded-t-xl"
                : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
            )}
          >
            <ScanFace className="w-4 h-4" />
            <span>Log Biometrik & GPS</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 font-extrabold">
              {filteredBiometricData.length} Feed
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("monthly")}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer",
              activeTab === "monthly"
                ? "border-[#531FFF] text-[#531FFF] bg-purple-50/40 rounded-t-xl"
                : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
            )}
          >
            <FileText className="w-4 h-4" />
            <span>Rekap Bulanan & Siswa Kritis</span>
            {criticalStudents.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-50 text-rose-700 font-extrabold">
                {criticalStudents.length} Perhatian
              </span>
            )}
          </button>

          {!isStudentRole && (
            <button
              type="button"
              onClick={() => setActiveTab("config")}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer",
                activeTab === "config"
                  ? "border-[#531FFF] text-[#531FFF] bg-purple-50/40 rounded-t-xl"
                  : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
              )}
            >
              <Sliders className="w-4 h-4" />
              <span>Aturan & Konfigurasi Jam</span>
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. TAB 1: PRESENSI HARIAN KELAS (ATUR & KELOLA) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "daily" && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden space-y-0">
          
          {/* Controls Bar for Class & Date Selection */}
          <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              
              {/* Class Selector Dropdown */}
              <div>
                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">
                  Pilih Kelas
                </label>
                <div className="relative">
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="appearance-none bg-white border border-gray-200 text-gray-900 font-bold pl-3.5 pr-9 py-2 rounded-xl text-xs focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none shadow-xs cursor-pointer"
                  >
                    {classesList.map((cls) => (
                      <option key={cls.id || cls.name} value={cls.name}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Date Selector */}
              <div>
                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">
                  Tanggal Presensi
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-white border border-gray-200 text-gray-900 font-bold px-3 py-1.5 rounded-xl text-xs focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none shadow-xs"
                  />
                </div>
              </div>

              {/* Search in Class */}
              <div>
                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">
                  Cari Nama Siswa
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Nama atau NISN..."
                    value={searchTermDaily}
                    onChange={(e) => setSearchTermDaily(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none w-44"
                  />
                </div>
              </div>
            </div>

            {/* Quick Actions Right */}
            <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
              <button
                type="button"
                onClick={handleMarkAllHadir}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all active:scale-[0.98] flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Tandai Semua Hadir</span>
              </button>

              <button
                type="button"
                onClick={handleSaveClassAttendance}
                disabled={isSavingBatch}
                className="px-5 py-2 bg-[#531FFF] hover:bg-[#4314cc] text-white rounded-xl text-xs font-extrabold transition-all active:scale-[0.98] flex items-center gap-2 shadow-sm shadow-[#531FFF]/20 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingBatch ? "Menyimpan..." : "Simpan Presensi Kelas"}</span>
              </button>
            </div>
          </div>

          {/* Students Class Attendance Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="px-5 py-3.5 w-12 text-center">No</th>
                  <th className="px-5 py-3.5">Nama Siswa & NISN</th>
                  <th className="px-5 py-3.5 text-center">Status Kehadiran</th>
                  <th className="px-5 py-3.5">Jam Masuk</th>
                  <th className="px-5 py-3.5">Catatan / Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs">
                {classStudents
                  .filter((st) => (st.name || "").toLowerCase().includes(searchTermDaily.toLowerCase()))
                  .map((student, idx) => {
                    const currentAtt = classAttendanceMap[student.id] || { status: "Hadir", notes: "", time: "07:00" };

                    return (
                      <tr key={student.id} className="hover:bg-gray-50/70 transition-colors">
                        {/* Number */}
                        <td className="px-5 py-3 text-center text-gray-400 font-bold">
                          {idx + 1}
                        </td>

                        {/* Student Name */}
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-50 text-[#531FFF] font-bold flex items-center justify-center text-xs shrink-0 border border-purple-100">
                              {student.name?.charAt(0) || "S"}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{student.name}</p>
                              <p className="text-[11px] text-gray-400 font-medium">NISN: {student.nisn || student.id.slice(0, 8)}</p>
                            </div>
                          </div>
                        </td>

                        {/* Interactive Status Buttons: H, S, I, T, A */}
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Hadir */}
                            <button
                              type="button"
                              onClick={() => handleStudentStatusChange(student.id, "Hadir")}
                              className={cn(
                                "px-2.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer",
                                currentAtt.status === "Hadir"
                                  ? "bg-emerald-600 text-white shadow-xs scale-105"
                                  : "bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
                              )}
                              title="Hadir"
                            >
                              H
                            </button>

                            {/* Terlambat */}
                            <button
                              type="button"
                              onClick={() => handleStudentStatusChange(student.id, "Terlambat")}
                              className={cn(
                                "px-2.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer",
                                currentAtt.status === "Terlambat"
                                  ? "bg-amber-500 text-white shadow-xs scale-105"
                                  : "bg-gray-100 text-gray-600 hover:bg-amber-50 hover:text-amber-700"
                              )}
                              title="Terlambat"
                            >
                              T
                            </button>

                            {/* Sakit */}
                            <button
                              type="button"
                              onClick={() => handleStudentStatusChange(student.id, "Sakit")}
                              className={cn(
                                "px-2.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer",
                                currentAtt.status === "Sakit"
                                  ? "bg-blue-600 text-white shadow-xs scale-105"
                                  : "bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                              )}
                              title="Sakit (Surat Dokter)"
                            >
                              S
                            </button>

                            {/* Izin */}
                            <button
                              type="button"
                              onClick={() => handleStudentStatusChange(student.id, "Izin")}
                              className={cn(
                                "px-2.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer",
                                currentAtt.status === "Izin"
                                  ? "bg-indigo-600 text-white shadow-xs scale-105"
                                  : "bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-700"
                              )}
                              title="Izin"
                            >
                              I
                            </button>

                            {/* Alpa */}
                            <button
                              type="button"
                              onClick={() => handleStudentStatusChange(student.id, "Alpa")}
                              className={cn(
                                "px-2.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer",
                                currentAtt.status === "Alpa"
                                  ? "bg-rose-600 text-white shadow-xs scale-105"
                                  : "bg-gray-100 text-gray-600 hover:bg-rose-50 hover:text-rose-700"
                              )}
                              title="Alpa / Tanpa Keterangan"
                            >
                              A
                            </button>
                          </div>
                        </td>

                        {/* Timestamp Input */}
                        <td className="px-5 py-3">
                          <input
                            type="time"
                            value={currentAtt.time}
                            onChange={(e) => {
                              const newTime = e.target.value;
                              setClassAttendanceMap((prev) => ({
                                ...prev,
                                [student.id]: {
                                  ...(prev[student.id] || { status: "Hadir", notes: "" }),
                                  time: newTime
                                }
                              }));
                            }}
                            className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#531FFF]"
                          />
                        </td>

                        {/* Notes Input */}
                        <td className="px-5 py-3">
                          <input
                            type="text"
                            placeholder={
                              currentAtt.status === "Sakit"
                                ? "Isi keterangan surat dokter..."
                                : currentAtt.status === "Izin"
                                ? "Alasan permohonan izin..."
                                : "Catatan tambahan (opsional)..."
                            }
                            value={currentAtt.notes}
                            onChange={(e) => handleStudentNotesChange(student.id, e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#531FFF]"
                          />
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Table Footer Actions */}
          <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 font-medium">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-bold text-gray-900">Keterangan:</span>
              <span className="flex items-center gap-1 font-bold text-emerald-700"><span className="w-2 h-2 rounded-full bg-emerald-500" /> H = Hadir</span>
              <span className="flex items-center gap-1 font-bold text-amber-700"><span className="w-2 h-2 rounded-full bg-amber-500" /> T = Terlambat</span>
              <span className="flex items-center gap-1 font-bold text-blue-700"><span className="w-2 h-2 rounded-full bg-blue-500" /> S = Sakit</span>
              <span className="flex items-center gap-1 font-bold text-indigo-700"><span className="w-2 h-2 rounded-full bg-indigo-500" /> I = Izin</span>
              <span className="flex items-center gap-1 font-bold text-rose-700"><span className="w-2 h-2 rounded-full bg-rose-500" /> A = Alpa</span>
            </div>

            <button
              type="button"
              onClick={handleSaveClassAttendance}
              disabled={isSavingBatch}
              className="px-4 py-2 bg-[#531FFF] hover:bg-[#4314cc] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSavingBatch ? "Menyimpan Data..." : "Simpan Perubahan Presensi"}
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. TAB 2: LOG BIOMETRIK & GPS FEED (PENGECEKAN BIOMETRIK) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "biometric" && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col">
          
          {/* Biometric Filter Toolbar */}
          <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/50">
            {/* View Switcher & Search */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center bg-gray-200/70 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setBiometricViewMode("table")}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer",
                    biometricViewMode === "table" ? "bg-white text-gray-900 shadow-xs" : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  <List className="w-3.5 h-3.5" />
                  Tabel
                </button>
                <button
                  type="button"
                  onClick={() => setBiometricViewMode("grid")}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer",
                    biometricViewMode === "grid" ? "bg-white text-gray-900 shadow-xs" : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Kartu Foto
                </button>
                <button
                  type="button"
                  onClick={() => setBiometricViewMode("map")}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer",
                    biometricViewMode === "map" ? "bg-white text-gray-900 shadow-xs" : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  <Map className="w-3.5 h-3.5" />
                  Peta Radar GPS
                </button>
              </div>

              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari nama, NISN, atau kelas..."
                  value={biometricSearch}
                  onChange={(e) => setBiometricSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                />
              </div>
            </div>

            {/* Class & Status Filter */}
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <div className="relative">
                <select
                  value={biometricClassFilter}
                  onChange={(e) => setBiometricClassFilter(e.target.value)}
                  className="appearance-none bg-white border border-gray-200 text-gray-700 pl-3.5 pr-8 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all cursor-pointer shadow-xs"
                >
                  <option value="Semua Kelas">Semua Kelas</option>
                  {classesList.map((cls) => (
                    <option key={cls.id || cls.name} value={cls.name}>
                      {cls.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                {["Semua", "Hadir", "Terlambat", "Ditolak"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setBiometricStatusFilter(st)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                      biometricStatusFilter === st
                        ? "bg-[#F3F0FF] text-[#531FFF] border border-[#531FFF]/30 shadow-xs"
                        : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                    )}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* View Mode 1: Table */}
          {biometricViewMode === "table" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Siswa</th>
                    <th className="px-6 py-4">Face Recognition (AI)</th>
                    <th className="px-6 py-4">Waktu & Tanggal</th>
                    <th className="px-6 py-4">Lokasi & Radius GPS</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {filteredBiometricData.length > 0 ? (
                    filteredBiometricData.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/70 transition-colors group">
                        {/* Student info */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden relative shrink-0 border border-gray-200 shadow-xs">
                              <Image
                                src={item.capturedImage || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80"}
                                alt={item.studentName || "Siswa"}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 group-hover:text-[#531FFF] transition-colors">
                                {item.studentName}
                              </p>
                              <p className="text-gray-400 font-medium mt-0.5">
                                {item.studentId} • {item.className}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Face Recognition Score */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "px-2.5 py-1 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 border",
                                item.faceVerified
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200"
                              )}
                            >
                              <ScanFace className="w-3.5 h-3.5" />
                              {item.faceMatchScore || 0}% Match
                            </span>
                          </div>
                        </td>

                        {/* Timestamp */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 font-bold text-gray-800">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            <span>{item.timestamp}</span>
                          </div>
                          <p className="text-[11px] text-gray-400 mt-0.5">{item.date}</p>
                        </td>

                        {/* GPS Radius */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border",
                                item.location?.inRadius
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                                  : "bg-rose-50 border-rose-200 text-rose-600"
                              )}
                            >
                              <MapPin className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">
                                {item.location?.distance || 0}m <span className="text-gray-400 font-normal">dari sekolah</span>
                              </p>
                              <p
                                className={cn(
                                  "text-[10px] font-bold",
                                  item.location?.inRadius ? "text-emerald-600" : "text-rose-600"
                                )}
                              >
                                {item.location?.inRadius ? "Dalam Radius" : "Luar Radius"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          <span
                            className={cn(
                              "px-2.5 py-1 text-xs font-bold rounded-lg inline-flex items-center gap-1 border shadow-2xs",
                              item.status === "Hadir" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                              item.status === "Terlambat" && "bg-amber-50 text-amber-700 border-amber-200",
                              item.status === "Sakit" && "bg-blue-50 text-blue-700 border-blue-200",
                              item.status === "Izin" && "bg-indigo-50 text-indigo-700 border-indigo-200",
                              (item.status === "Alpa" || item.status === "Ditolak") && "bg-rose-50 text-rose-700 border-rose-200"
                            )}
                          >
                            {item.status === "Hadir" && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                            {item.status === "Terlambat" && <Clock className="w-3 h-3 text-amber-600" />}
                            {(item.status === "Alpa" || item.status === "Ditolak") && <XCircle className="w-3 h-3 text-rose-600" />}
                            {item.status}
                          </span>
                        </td>

                        {/* Detail Action */}
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedRecord(item)}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-[#F3F0FF] text-gray-700 hover:text-[#531FFF] rounded-xl font-bold transition-all border border-gray-200 cursor-pointer"
                          >
                            Detail AI
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                        Belum ada log biometrik yang cocok dengan filter pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* View Mode 2: Photo Cards Grid */}
          {biometricViewMode === "grid" && (
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50/50">
              {filteredBiometricData.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedRecord(item)}
                  className="bg-white rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-lg hover:border-[#531FFF]/30 transition-all overflow-hidden cursor-pointer group flex flex-col"
                >
                  <div className="relative aspect-[4/3] w-full bg-gray-100">
                    <Image
                      src={item.capturedImage || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80"}
                      alt={item.studentName}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      unoptimized
                    />
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                      <span
                        className={cn(
                          "px-2 py-0.5 text-[10px] font-extrabold rounded-md backdrop-blur-md shadow-xs",
                          item.status === "Hadir" && "bg-emerald-500/90 text-white",
                          item.status === "Terlambat" && "bg-amber-500/90 text-white",
                          (item.status === "Alpa" || item.status === "Ditolak") && "bg-rose-500/90 text-white"
                        )}
                      >
                        {item.status}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-extrabold bg-black/60 text-white rounded-md backdrop-blur-md flex items-center gap-1 shadow-xs">
                        <ScanFace className="w-3 h-3 text-cyan-300" />
                        {item.faceMatchScore}%
                      </span>
                    </div>
                    <div className="absolute bottom-2.5 left-2.5 bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-md text-[11px] font-bold text-gray-900 shadow-xs flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#531FFF]" />
                      {item.timestamp}
                    </div>
                  </div>

                  <div className="p-3.5 flex flex-col justify-between flex-1">
                    <div>
                      <h4 className="font-bold text-gray-900 group-hover:text-[#531FFF] transition-colors truncate">
                        {item.studentName}
                      </h4>
                      <p className="text-[11px] text-gray-400 font-medium">
                        {item.studentId} • {item.className}
                      </p>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
                      <span className="text-gray-500 flex items-center gap-1 font-medium">
                        <MapPin className="w-3 h-3 text-emerald-600" />
                        {item.location?.distance || 0}m radius
                      </span>
                      <span className="text-[#531FFF] font-bold">Detail AI →</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* View Mode 3: Radar Peta GPS */}
          {biometricViewMode === "map" && (
            <div className="p-6 bg-gray-50/50">
              <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-xs relative h-[500px] overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-[radial-gradient(#531FFF_1px,transparent_1px)] [background-size:16px_16px] opacity-10" />

                {/* School Center Radar */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
                  <div className="w-14 h-14 bg-white rounded-full shadow-2xl border-4 border-[#531FFF] flex items-center justify-center z-10 relative animate-pulse">
                    <Building2 className="w-7 h-7 text-[#531FFF]" />
                  </div>
                  <div className="w-96 h-96 border-2 border-dashed border-[#531FFF]/30 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#531FFF]/5 pointer-events-none" />
                  <div className="w-48 h-48 border border-[#531FFF]/30 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#531FFF]/10 pointer-events-none" />
                  <span className="mt-3 text-xs font-extrabold text-gray-900 bg-white px-3 py-1 rounded-full shadow-md border border-gray-200">
                    Pusat Sekolah ({config.geofenceRadiusMeters}m Geofence Radius)
                  </span>
                </div>

                {/* Plotted student pins */}
                {filteredBiometricData.map((item, idx) => {
                  const centerLat = config.schoolCenterLat;
                  const centerLng = config.schoolCenterLng;
                  const latDiff = ((item.location?.lat || centerLat) - centerLat) * 120000;
                  const lngDiff = ((item.location?.lng || centerLng) - centerLng) * 120000;

                  const top = `calc(50% - ${latDiff}px)`;
                  const left = `calc(50% + ${lngDiff}px)`;
                  const isSuccess = item.status === "Hadir" || item.status === "Terlambat";

                  return (
                    <div
                      key={item.id || idx}
                      className="absolute z-20 group cursor-pointer"
                      style={{ top, left }}
                      onClick={() => setSelectedRecord(item)}
                    >
                      <div className="relative -translate-x-1/2 -translate-y-1/2">
                        <div
                          className={cn(
                            "w-5 h-5 rounded-full border-2 bg-white shadow-md transition-transform group-hover:scale-150 flex items-center justify-center",
                            isSuccess ? "border-emerald-500 bg-emerald-50" : "border-rose-500 bg-rose-50"
                          )}
                        >
                          <div className={cn("w-2 h-2 rounded-full", isSuccess ? "bg-emerald-500" : "bg-rose-500")} />
                        </div>

                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 p-3 opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-30 transform group-hover:translate-y-0 translate-y-1">
                          <p className="text-xs font-bold text-gray-900 truncate">{item.studentName}</p>
                          <p className="text-[10px] text-gray-400">{item.className} • {item.timestamp}</p>
                          <div className="mt-1 pt-1 border-t border-gray-100 flex justify-between text-[10px]">
                            <span className="text-gray-500">Jarak GPS:</span>
                            <span className="font-bold text-gray-800">{item.location?.distance}m</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. TAB 3: REKAP BULANAN & EARLY WARNING (SISWA KRITIS) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "monthly" && (
        <div className="space-y-6">
          
          {/* Early Warning Banner if critical students exist */}
          {criticalStudents.length > 0 && (
            <div className="bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-200 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-500/20">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-rose-900">
                    Peringatan Dini: {criticalStudents.length} Siswa Perlu Perhatian Khusus
                  </h3>
                  <p className="text-xs text-rose-700 mt-0.5">
                    Terdapat siswa dengan jumlah Alpa ≥ 3 kali atau Keterlambatan ≥ 4 kali pada bulan ini. Disarankan segera koordinasi dengan Wali Kelas & Guru BK.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    toast.showInfo("Pengingat notifikasi otomatis dikirimkan ke orang tua siswa yang bersangkutan.", "Notifikasi Peringatan");
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Kirim Notifikasi Peringatan
                </button>
              </div>
            </div>
          )}

          {/* Monthly Table Card */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
            
            {/* Filter Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div>
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">
                    Bulan Rekap
                  </label>
                  <input
                    type="month"
                    value={monthlyMonth}
                    onChange={(e) => setMonthlyMonth(e.target.value)}
                    className="bg-white border border-gray-200 text-gray-900 font-bold px-3 py-1.5 rounded-xl text-xs focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none shadow-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">
                    Filter Kelas
                  </label>
                  <select
                    value={monthlyClassFilter}
                    onChange={(e) => setMonthlyClassFilter(e.target.value)}
                    className="bg-white border border-gray-200 text-gray-900 font-bold px-3 py-1.5 rounded-xl text-xs focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none shadow-xs cursor-pointer"
                  >
                    <option value="Semua">Semua Kelas</option>
                    {classesList.map((c) => (
                      <option key={c.id || c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="text-xs text-gray-500 font-medium">
                Total Siswa Terdata: <span className="font-bold text-gray-900">{monthlySummaryList.length}</span>
              </div>
            </div>

            {/* Table Matrix */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="px-5 py-4">Nama Siswa</th>
                    <th className="px-5 py-4">Kelas</th>
                    <th className="px-5 py-4 text-center">Hadir (H)</th>
                    <th className="px-5 py-4 text-center">Terlambat (T)</th>
                    <th className="px-5 py-4 text-center">Sakit (S)</th>
                    <th className="px-5 py-4 text-center">Izin (I)</th>
                    <th className="px-5 py-4 text-center">Alpa (A)</th>
                    <th className="px-5 py-4 text-center">% Kehadiran</th>
                    <th className="px-5 py-4 text-right">Status Evaluasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {monthlySummaryList.map((item) => (
                    <tr
                      key={item.id}
                      className={cn(
                        "hover:bg-gray-50/70 transition-colors",
                        item.isCritical && "bg-rose-50/30"
                      )}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-purple-50 text-[#531FFF] font-bold flex items-center justify-center text-[11px]">
                            {item.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{item.name}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{item.id.slice(0, 10)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-gray-600">{item.className}</td>
                      <td className="px-5 py-3.5 text-center font-bold text-emerald-600">{item.hadir}</td>
                      <td className="px-5 py-3.5 text-center font-bold text-amber-600">{item.terlambat}</td>
                      <td className="px-5 py-3.5 text-center font-bold text-blue-600">{item.sakit}</td>
                      <td className="px-5 py-3.5 text-center font-bold text-indigo-600">{item.izin}</td>
                      <td className="px-5 py-3.5 text-center font-black text-rose-600">{item.alpa}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-md font-extrabold text-xs",
                            item.rate >= 90
                              ? "bg-emerald-50 text-emerald-700"
                              : item.rate >= 75
                              ? "bg-amber-50 text-amber-700"
                              : "bg-rose-50 text-rose-700"
                          )}
                        >
                          {item.rate}%
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {item.isCritical ? (
                          <span className="px-2.5 py-1 text-[11px] font-black bg-rose-100 text-rose-800 rounded-lg inline-flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            Perhatian Khusus
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 rounded-lg">
                            Disiplin Baik
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. TAB 4: ATURAN & KONFIGURASI SISTEM ABSENSI (ATURAN & JAM) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "config" && !isStudentRole && (
        <form onSubmit={handleSaveConfig} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Card 1: Pengaturan Jam Sekolah & Batas Toleransi */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#531FFF] flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-sm">Jadwal & Jam Presensi Sekolah</h3>
                  <p className="text-xs text-gray-500">Aturan jam masuk, batas toleransi, dan jam kepulangan.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Jam Masuk Sekolah</label>
                  <input
                    type="time"
                    required
                    value={config.schoolStartTime}
                    onChange={(e) => setConfig({ ...config, schoolStartTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Siswa mulai dihitung terlambat setelah jam ini.</p>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Toleransi Terlambat (Menit)</label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    required
                    value={config.lateToleranceMinutes}
                    onChange={(e) => setConfig({ ...config, lateToleranceMinutes: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Masa tenggang sebelum status menjadi Terlambat.</p>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Batas Maksimal Dihitung Alpa</label>
                  <input
                    type="time"
                    required
                    value={config.absentThresholdTime}
                    onChange={(e) => setConfig({ ...config, absentThresholdTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Belum hadir lewat jam ini otomatis dihitung Alpa.</p>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Jam Kepulangan Sekolah</label>
                  <input
                    type="time"
                    required
                    value={config.schoolEndTime}
                    onChange={(e) => setConfig({ ...config, schoolEndTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Presensi pulang dibuka setelah jam ini.</p>
                </div>
              </div>
            </div>

            {/* Card 2: Pengaturan Radius Geofencing GPS */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-gray-900 text-sm">Geofencing & Radius GPS Sekolah</h3>
                    <p className="text-xs text-gray-500">Koordinat titik pusat sekolah dan toleransi jarak.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDetectCurrentLocation}
                  className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-[#531FFF] text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-purple-200/60"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Deteksi Lokasi Saya
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Radius Geofencing (Meter)</label>
                  <input
                    type="number"
                    min={20}
                    max={2000}
                    required
                    value={config.geofenceRadiusMeters}
                    onChange={(e) => setConfig({ ...config, geofenceRadiusMeters: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Jarak maksimum siswa dari sekolah untuk presensi.</p>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Wajib Di Dalam Radius</label>
                  <div className="flex items-center gap-3 h-10">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.requireRadius}
                        onChange={(e) => setConfig({ ...config, requireRadius: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#531FFF]" />
                    </label>
                    <span className="text-xs font-semibold text-gray-700">
                      {config.requireRadius ? "Wajib (Tolak jika di luar)" : "Opsional"}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Latitude Gedung Sekolah</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={config.schoolCenterLat}
                    onChange={(e) => setConfig({ ...config, schoolCenterLat: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl font-mono text-gray-900 focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Longitude Gedung Sekolah</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={config.schoolCenterLng}
                    onChange={(e) => setConfig({ ...config, schoolCenterLng: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl font-mono text-gray-900 focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Card 3: Keamanan Biometrik & AI Recognition */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
                  <ScanFace className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-sm">Biometrik Wajah & AI Anti-Spoofing</h3>
                  <p className="text-xs text-gray-500">Parameter akurasi deteksi wajah dan keamanan liveness.</p>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-bold text-gray-700">Ambang Batas Skor AI Minimal</label>
                    <span className="font-black text-[#531FFF] text-sm">{config.minFaceMatchScore}%</span>
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={98}
                    value={config.minFaceMatchScore}
                    onChange={(e) => setConfig({ ...config, minFaceMatchScore: Number(e.target.value) })}
                    className="w-full accent-[#531FFF] cursor-pointer"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Presensi ditolak jika kecocokan wajah di bawah batas ini.</p>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <div>
                    <p className="font-bold text-gray-900">Deteksi Anti-Spoofing / Kedipan</p>
                    <p className="text-[11px] text-gray-500">Mencegah penggunaan foto cetak atau layar HP lain.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.enableLivenessDetection}
                      onChange={(e) => setConfig({ ...config, enableLivenessDetection: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#531FFF]" />
                  </label>
                </div>
              </div>
            </div>

            {/* Card 4: Otomasi Notifikasi WhatsApp Orang Tua */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-sm">Otomasi Notifikasi Orang Tua (WhatsApp)</h3>
                  <p className="text-xs text-gray-500">Pemberitahuan instan saat ananda terlambat atau alpa.</p>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <div>
                    <p className="font-bold text-gray-900">Kirim WhatsApp saat Siswa Terlambat</p>
                    <p className="text-[11px] text-gray-500">Kirim pesan otomatis saat jam masuk terlewati.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.notifyParentOnLate}
                      onChange={(e) => setConfig({ ...config, notifyParentOnLate: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#531FFF]" />
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <div>
                    <p className="font-bold text-gray-900">Kirim WhatsApp saat Siswa Alpa</p>
                    <p className="text-[11px] text-gray-500">Kirim pesan otomatis pada pukul 08:30 pagi.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.notifyParentOnAbsent}
                      onChange={(e) => setConfig({ ...config, notifyParentOnAbsent: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#531FFF]" />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Save Configuration Floating Bar */}
          <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-md flex items-center justify-between">
            <p className="text-xs text-gray-500 font-medium">
              Konfigurasi ini akan berlaku untuk seluruh sistem absensi siswa dan staf guru.
            </p>
            <button
              type="submit"
              disabled={isSavingConfig}
              className="px-6 py-2.5 bg-[#531FFF] hover:bg-[#4314cc] text-white rounded-xl text-xs font-black transition-all active:scale-[0.98] flex items-center gap-2 shadow-sm shadow-[#531FFF]/20 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingConfig ? "Menyimpan..." : "Simpan Pengaturan Absensi"}</span>
            </button>
          </div>
        </form>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 8. Slide-Over Drawer for Biometric AI Detail */}
      {/* ------------------------------------------------------------- */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedRecord(null)}
          />

          <div className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300 flex flex-col h-full z-10">
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-20">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#531FFF]" />
                <h3 className="text-base font-black text-gray-900">Verifikasi Presensi AI</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-6 space-y-6 flex-1 overflow-y-auto text-xs">
              
              {/* Student info card */}
              <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="w-14 h-14 rounded-2xl bg-white overflow-hidden relative shrink-0 border border-gray-200 shadow-xs">
                  <Image
                    src={selectedRecord.capturedImage || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80"}
                    alt={selectedRecord.studentName}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">{selectedRecord.studentName}</h4>
                  <p className="text-gray-400 font-medium mt-0.5">{selectedRecord.studentId} • {selectedRecord.className}</p>
                  <span
                    className={cn(
                      "mt-1.5 px-2 py-0.5 text-[10px] font-black rounded-md inline-block",
                      selectedRecord.status === "Hadir" && "bg-emerald-100 text-emerald-800",
                      selectedRecord.status === "Terlambat" && "bg-amber-100 text-amber-800",
                      (selectedRecord.status === "Alpa" || selectedRecord.status === "Ditolak") && "bg-rose-100 text-rose-800"
                    )}
                  >
                    {selectedRecord.status}
                  </span>
                </div>
              </div>

              {/* AI Facial Metrics */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-gray-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <ScanFace className="w-3.5 h-3.5 text-[#531FFF]" />
                  Hasil Verifikasi AI Biometrik
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-purple-50/50 border border-purple-100">
                    <p className="text-purple-700 font-bold">Face Match Score</p>
                    <p className="text-2xl font-black text-[#531FFF] mt-1">{selectedRecord.faceMatchScore || 0}%</p>
                    <p className="text-[10px] text-purple-600 mt-1">Batas Minimal: {config.minFaceMatchScore}%</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                    <p className="text-gray-500 font-bold">Status Verifikasi</p>
                    <p className={cn("text-base font-black mt-1", selectedRecord.faceVerified ? "text-emerald-600" : "text-rose-600")}>
                      {selectedRecord.faceVerified ? "Valid Sesuai" : "Gagal Cocok"}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">Master Database</p>
                  </div>
                </div>

                {/* Photo Preview */}
                <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-gray-900 border border-gray-200 shadow-inner">
                  <Image
                    src={selectedRecord.capturedImage || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80"}
                    alt="Foto Presensi"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-3 text-white">
                    <p className="text-[11px] font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3 text-cyan-300" />
                      {selectedRecord.timestamp} ({selectedRecord.date})
                    </p>
                  </div>
                </div>
              </div>

              {/* Geolokasi Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-gray-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#531FFF]" />
                    Lokasi GPS Presensi
                  </h4>
                  <span className={cn(
                    "font-extrabold text-[11px] px-2 py-0.5 rounded-md",
                    selectedRecord.location?.inRadius ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                  )}>
                    {selectedRecord.location?.distance || 0} Meter
                  </span>
                </div>

                <div className="w-full h-36 rounded-2xl bg-gray-100 relative overflow-hidden border border-gray-200">
                  <iframe
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    src={`https://maps.google.com/maps?q=${selectedRecord.location?.lat || config.schoolCenterLat},${selectedRecord.location?.lng || config.schoolCenterLng}&z=16&output=embed`}
                  />
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-[11px]">
                  <span className="text-gray-500 font-mono">
                    {selectedRecord.location?.lat || config.schoolCenterLat}, {selectedRecord.location?.lng || config.schoolCenterLng}
                  </span>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${selectedRecord.location?.lat || config.schoolCenterLat},${selectedRecord.location?.lng || config.schoolCenterLng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#531FFF] font-bold flex items-center gap-1 hover:underline"
                  >
                    Buka Google Maps <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="w-full py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition-all text-xs shadow-xs cursor-pointer"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
