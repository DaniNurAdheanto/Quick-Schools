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
  ExternalLink,
  Sparkles,
  Printer,
  FileText,
  Save,
  Check,
  Send,
  Info,
  CalendarDays,
  AlertCircle,
  Eye,
  HeartPulse,
  UserCheck,
  UserX,
  Filter,
  GraduationCap,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  query,
  where
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useToast } from "@/context/ToastContext";
import { QuickAttendanceModal } from "@/components/modals/quick-attendance-modal";
import AttendanceGeofenceMap from "@/components/attendance/attendance-geofence-map";
import StudentPersonalAttendanceView from "@/components/attendance/student-personal-attendance-view";

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
  photoUrl?: string;
  location?: {
    lat: number;
    lng: number;
    distance: number;
    inRadius: boolean;
  };
  source?: "biometric" | "manual" | "qr";
  markedBy?: string;
  type?: string;
  createdAt?: any;
}

export interface StudentDailyAttendance {
  status: AttendanceStatus | "Belum Absen";
  notes: string;
  time: string;
  isRecorded: boolean;
  source?: "biometric" | "manual" | "qr";
  faceVerified?: boolean;
  faceMatchScore?: number;
  capturedImage?: string;
  location?: {
    lat: number;
    lng: number;
    distance: number;
    inRadius: boolean;
  };
  record?: AttendanceRecord;
}

const mergeAttendanceRecords = (base: AttendanceRecord[], incoming: AttendanceRecord[]): AttendanceRecord[] => {
  const map: Record<string, AttendanceRecord> = {};
  base.forEach((r) => { map[r.id] = r; });
  incoming.forEach((r) => { map[r.id] = r; });
  const merged = Object.values(map);
  merged.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return (b.timestamp || "").localeCompare(a.timestamp || "");
  });
  return merged;
};

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

  // Tab State: "daily" | "biometric" | "monthly"
  const [activeTab, setActiveTab] = useState<"daily" | "biometric" | "monthly">("daily");

  // User Authentication State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("admin");
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [previewAsGuru, setPreviewAsGuru] = useState(false);

  // General Page State
  const [loading, setLoading] = useState(true);
  const [showScanModal, setShowScanModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  // Firestore Real-Time Data State
  const [classesList, setClassesList] = useState<any[]>([]);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [config, setConfig] = useState<AttendanceConfig>(DEFAULT_CONFIG);

  // Tab 1: Daily Class Attendance State
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [selectedClass, setSelectedClass] = useState<string>("Semua Kelas");
  const [classAttendanceMap, setClassAttendanceMap] = useState<Record<string, StudentDailyAttendance>>({});
  const [dailySubFilter, setDailySubFilter] = useState<"all" | "sudah" | "belum" | "hadir" | "terlambat" | "izin_sakit" | "alpa">("all");
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
            setCurrentUserData(data);
            const rawRole = (data.role || "admin").toLowerCase();
            const role = (rawRole === "student" || rawRole === "siswa") ? "siswa" : rawRole;
            setUserRole(role);
            setStudentInfo({
              id: user.uid,
              name: data.name || data.fullName || user.displayName || user.email?.split("@")[0] || "Siswa",
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

      // Match current student if logged in
      const cUser = auth.currentUser;
      if (cUser) {
        const matched = list.find((s) => 
          (s.email && s.email.toLowerCase() === cUser.email?.toLowerCase()) || 
          s.id === cUser.uid ||
          (s.name && cUser.displayName && s.name.toLowerCase() === cUser.displayName.toLowerCase())
        );
        if (matched) {
          setStudentInfo((prev: any) => ({
            ...prev,
            id: matched.id || cUser.uid,
            name: matched.name || prev?.name,
            nisn: matched.nisn || matched.id || prev?.nisn,
            className: matched.classId || matched.className || prev?.className || "10 MIPA 1",
            avatar: matched.imageUrl || matched.avatar || prev?.avatar
          }));
        }
      }
    }, (err) => {
      console.warn("Students snapshot error:", err);
    });

    // 3b. Fetch Teachers from Firestore for Homeroom (Wali Kelas) identification
    const unsubTeachers = onSnapshot(collection(db, "teachers"), (snap) => {
      const list: any[] = [];
      snap.forEach((d) => {
        list.push({ _firestoreId: d.id, id: d.id, ...d.data() });
      });
      setTeachersList(list);
    }, (err) => {
      console.warn("Teachers snapshot error in attendance:", err);
    });

    // 4. Fetch Attendance Records from localStorage, roles collection, and attendance collection
    try {
      const stored = localStorage.getItem("quick_schools_attendance_records");
      if (stored) {
        const localList: AttendanceRecord[] = JSON.parse(stored);
        if (Array.isArray(localList) && localList.length > 0) {
          setAttendanceRecords(() => mergeAttendanceRecords(MOCK_BIOMETRIC_FEED, localList));
        }
      }
    } catch (e) {}

    // Subscribe to attendance records stored in roles (allowed in Firestore rules)
    const qRolesAtt = query(collection(db, "roles"), where("type", "==", "attendance_record"));
    const unsubRolesAtt = onSnapshot(
      qRolesAtt,
      (snap) => {
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
              source: data.source || "biometric",
              markedBy: data.markedBy || "Admin",
              createdAt: data.createdAt
            });
          });

          setAttendanceRecords((prev) => mergeAttendanceRecords(prev, list));
        }
        setLoading(false);
      },
      (err) => {
        console.warn("Roles attendance snapshot error:", err);
      }
    );

    const unsubAttendance = onSnapshot(
      collection(db, "attendance"),
      (snap) => {
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

          setAttendanceRecords((prev) => mergeAttendanceRecords(prev, list));
        }
        setLoading(false);
      },
      (err) => {
        console.warn("Attendance snapshot restricted, using roles/mock data:", err);
        setLoading(false);
      }
    );

    // 5. Fetch Attendance Config from Firestore & localStorage
    try {
      const cached = localStorage.getItem("quick_schools_attendance_config");
      if (cached) {
        setConfig((prev) => ({ ...prev, ...JSON.parse(cached) }));
      }
    } catch (e) {}

    const unsubConfig = onSnapshot(doc(db, "roles", "attendance_config"), (dSnap) => {
      if (dSnap.exists()) {
        const data = dSnap.data();
        setConfig((prev) => ({ ...prev, ...data }));
        try {
          localStorage.setItem("quick_schools_attendance_config", JSON.stringify(data));
        } catch (e) {}
      }
    }, (err) => {
      console.warn("Attendance config read error from roles, using fallback:", err);
    });

    return () => {
      unsubAuth();
      unsubClasses();
      unsubStudents();
      unsubTeachers();
      unsubRolesAtt();
      unsubAttendance();
      unsubConfig();
    };
  }, []);

  const [previewAsStudent, setPreviewAsStudent] = useState(false);
  const isStudentRole = (userRole === "siswa" || userRole === "student") || previewAsStudent;
  const isGuru = (userRole === "guru" || userRole === "teacher") || previewAsGuru;

  // Determine homeroom class(es) for the logged-in Guru (Wali Kelas)
  const teacherHomeroomClasses = useMemo(() => {
    if (!isGuru) return [];

    const tName = (currentUserData?.fullName || currentUserData?.name || currentUser?.displayName || "").trim().toLowerCase();
    const tNip = (currentUserData?.nip || currentUserData?.id || "").trim().toLowerCase();
    const tEmail = (currentUserData?.email || currentUser?.email || "").trim().toLowerCase();
    const tUid = currentUser?.uid;

    const matched = new Set<string>();

    // 1. Match from classes collection
    classesList.forEach((c) => {
      const cName = c.name || c.id;
      const cHomeroom = (c.homeroom || c.homeroomTeacher || c.waliKelas || "").trim().toLowerCase();
      const cNip = (c.homeroomNip || "").trim().toLowerCase();
      const cId = (c.homeroomId || "").trim();

      const matchName = tName && cHomeroom && (
        cHomeroom === tName ||
        (tName.length > 5 && cHomeroom.includes(tName)) ||
        (cHomeroom.length > 5 && tName.includes(cHomeroom))
      );
      const matchNip = tNip && cNip && cNip === tNip;
      const matchId = tUid && cId && cId === tUid;

      if (matchName || matchNip || matchId) {
        if (cName) matched.add(cName);
      }
    });

    // 2. Direct field in user document
    const directClass = currentUserData?.homeroomClass || currentUserData?.homeroom || currentUserData?.className || currentUserData?.classId;
    if (directClass && directClass !== "-" && directClass !== "Semua Kelas") {
      matched.add(directClass);
    }

    // 3. Match from teachers collection
    const tDoc = teachersList.find((t) =>
      (tEmail && t.email?.toLowerCase() === tEmail) ||
      (tNip && (t.nip === tNip || t.id === tNip)) ||
      (tUid && (t.uid === tUid || t._firestoreId === tUid || t.id === tUid)) ||
      (tName && (t.name?.toLowerCase() === tName || (tName.length > 5 && t.name?.toLowerCase().includes(tName))))
    );
    if (tDoc) {
      const tClass = tDoc.homeroomClass || tDoc.homeroom || tDoc.class || tDoc.className || tDoc.waliKelas;
      if (tClass && tClass !== "-" && tClass !== "Semua Kelas") {
        matched.add(tClass);
      }
    }

    // Fallback for preview mode so admin preview is never empty
    if (matched.size === 0 && previewAsGuru) {
      const defaultHomeroom = classesList.find(c => c.homeroom || c.name === "12 MIPA 1")?.name || classesList[0]?.name || "12 MIPA 1";
      if (defaultHomeroom) matched.add(defaultHomeroom);
    }

    return Array.from(matched);
  }, [isGuru, currentUser, currentUserData, classesList, teachersList, previewAsGuru]);

  const isTeacherWaliKelas = Boolean(isGuru && teacherHomeroomClasses.length > 0);
  const primaryTeacherClass = teacherHomeroomClasses.length > 0 ? teacherHomeroomClasses[0] : "";

  // Auto-synchronize selectedClass, biometricClassFilter, monthlyClassFilter for Guru
  useEffect(() => {
    if (isGuru && teacherHomeroomClasses.length > 0) {
      if (!teacherHomeroomClasses.includes(selectedClass)) {
        setSelectedClass(teacherHomeroomClasses[0]);
      }
      if (!teacherHomeroomClasses.includes(biometricClassFilter)) {
        setBiometricClassFilter(teacherHomeroomClasses[0]);
      }
      if (!teacherHomeroomClasses.includes(monthlyClassFilter)) {
        setMonthlyClassFilter(teacherHomeroomClasses[0]);
      }
    }
  }, [isGuru, teacherHomeroomClasses, selectedClass, biometricClassFilter, monthlyClassFilter]);

  // Selectable classes list (Restricted exclusively to homeroom for Guru)
  const selectableClasses = useMemo(() => {
    if (isGuru) {
      return classesList.filter((c) => teacherHomeroomClasses.includes(c.name || c.id));
    }
    return classesList;
  }, [isGuru, classesList, teacherHomeroomClasses]);

  // Scoped students pool for Guru
  const scopedStudentsList = useMemo(() => {
    if (!isGuru) return studentsList;
    if (teacherHomeroomClasses.length === 0) return [];
    return studentsList.filter((s) => {
      const sc = (s.classId || s.className || s.kelas || s.class || "").trim().toLowerCase();
      const scNoSpace = sc.replace(/\s+/g, "");
      return teacherHomeroomClasses.some((tc) => {
        const target = tc.trim().toLowerCase();
        const targetNoSpace = target.replace(/\s+/g, "");
        return sc === target || scNoSpace === targetNoSpace;
      });
    });
  }, [isGuru, teacherHomeroomClasses, studentsList]);

  // Scoped attendance records for Guru
  const scopedAttendanceRecords = useMemo(() => {
    if (!isGuru) return attendanceRecords;
    if (teacherHomeroomClasses.length === 0) return [];
    return attendanceRecords.filter((r) => {
      const rc = (r.className || "").trim().toLowerCase();
      const rcNoSpace = rc.replace(/\s+/g, "");
      return teacherHomeroomClasses.some((tc) => {
        const target = tc.trim().toLowerCase();
        const targetNoSpace = target.replace(/\s+/g, "");
        return rc === target || rcNoSpace === targetNoSpace;
      });
    });
  }, [isGuru, teacherHomeroomClasses, attendanceRecords]);

  // -------------------------------------------------------------
  // Filtered Students for the selected class (Tab 1)
  // -------------------------------------------------------------
  const classStudents = useMemo(() => {
    // If Guru is not assigned as Wali Kelas, they cannot view student data
    if (isGuru && teacherHomeroomClasses.length === 0) {
      return [];
    }

    if (studentsList.length === 0) {
      // Fallback sample students if students collection is empty
      const fallbackClass = primaryTeacherClass || "12 MIPA 1";
      return [
        { id: "S101", name: "Ahmad Rizqi Pratama", classId: fallbackClass, nisn: "2023001" },
        { id: "S102", name: "Budi Santoso", classId: fallbackClass, nisn: "2023002" },
        { id: "S103", name: "Bintang Pratama", classId: fallbackClass, nisn: "2023003" },
        { id: "S104", name: "Citra Lestari", classId: fallbackClass, nisn: "2023004" },
        { id: "S105", name: "Wahyu Hidayat", classId: fallbackClass, nisn: "2023005" }
      ];
    }

    // Source pool of students
    const pool = isGuru ? scopedStudentsList : studentsList;

    // 1. If "Semua Kelas" or empty (only available for non-guru)
    if (!isGuru && (selectedClass === "Semua Kelas" || selectedClass === "all" || !selectedClass)) {
      return pool;
    }

    // 2. Filter students matching the selected class
    const target = selectedClass.toLowerCase().trim();
    const targetNoSpace = target.replace(/\s+/g, "");

    const filtered = pool.filter((s) => {
      const cName = (s.classId || s.className || s.class || s.kelas || "").toString().toLowerCase().trim();
      const cNameNoSpace = cName.replace(/\s+/g, "");
      return cName === target || cNameNoSpace === targetNoSpace;
    });

    // Return only students matching this class. If none, return [] (do not fallback to other classes)
    return filtered;
  }, [studentsList, selectedClass, isGuru, teacherHomeroomClasses, scopedStudentsList, primaryTeacherClass]);

  // Synchronize classAttendanceMap when class, date, or records change
  useEffect(() => {
    const map: Record<string, StudentDailyAttendance> = {};

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
          time: existing.timestamp || "07:00",
          isRecorded: true,
          source: existing.source,
          faceVerified: existing.faceVerified,
          faceMatchScore: existing.faceMatchScore,
          capturedImage: existing.capturedImage || existing.photoUrl,
          location: existing.location,
          record: existing
        };
      } else {
        // Default to "Belum Absen" for clear monitoring
        map[student.id] = {
          status: "Belum Absen",
          notes: "",
          time: "-",
          isRecorded: false,
          source: "manual"
        };
      }
    });

    setClassAttendanceMap(map);
  }, [selectedClass, selectedDate, classStudents, attendanceRecords]);

  // Class Level KPI & Monitoring Statistics
  const classStats = useMemo(() => {
    const total = classStudents.length;
    let sudahAbsen = 0;
    let belumAbsen = 0;
    let hadir = 0;
    let terlambat = 0;
    let izin = 0;
    let sakit = 0;
    let alpa = 0;

    classStudents.forEach((st) => {
      const att = classAttendanceMap[st.id];
      if (!att || att.status === "Belum Absen") {
        belumAbsen++;
      } else {
        sudahAbsen++;
        if (att.status === "Hadir") hadir++;
        else if (att.status === "Terlambat") terlambat++;
        else if (att.status === "Izin") izin++;
        else if (att.status === "Sakit") sakit++;
        else if (att.status === "Alpa") alpa++;
      }
    });

    const percentage = total > 0 ? Math.round((sudahAbsen / total) * 100) : 0;

    return {
      total,
      sudahAbsen,
      belumAbsen,
      hadir,
      terlambat,
      izin,
      sakit,
      izinSakit: izin + sakit,
      alpa,
      percentage
    };
  }, [classStudents, classAttendanceMap]);

  // Filtered Students for Tab 1 with Sub-Filters
  const displayedDailyStudents = useMemo(() => {
    return classStudents.filter((student) => {
      const nameMatch = (student.name || "").toLowerCase().includes(searchTermDaily.toLowerCase());
      const nisnMatch = (student.nisn || student.id || "").toLowerCase().includes(searchTermDaily.toLowerCase());
      if (searchTermDaily && !nameMatch && !nisnMatch) return false;

      const att = classAttendanceMap[student.id];
      const status = att?.status || "Belum Absen";

      if (dailySubFilter === "sudah") return status !== "Belum Absen";
      if (dailySubFilter === "belum") return status === "Belum Absen";
      if (dailySubFilter === "hadir") return status === "Hadir";
      if (dailySubFilter === "terlambat") return status === "Terlambat";
      if (dailySubFilter === "izin_sakit") return status === "Izin" || status === "Sakit";
      if (dailySubFilter === "alpa") return status === "Alpa";
      return true; // "all"
    });
  }, [classStudents, searchTermDaily, classAttendanceMap, dailySubFilter]);

  // Quick action: Mark all as Hadir
  const handleMarkAllHadir = () => {
    const updated = { ...classAttendanceMap };
    classStudents.forEach((st) => {
      const prev = updated[st.id];
      updated[st.id] = {
        ...(prev || {}),
        status: "Hadir",
        notes: prev?.notes || "",
        time: prev?.time && prev?.time !== "-" ? prev.time : (config.schoolStartTime || "07:00"),
        isRecorded: true,
        source: "manual"
      };
    });
    setClassAttendanceMap(updated);
    toast.showSuccess(
      `Semua ${classStudents.length} siswa ${selectedClass === "Semua Kelas" ? "di seluruh kelas" : `di kelas ${selectedClass}`} ditandai Hadir.`,
      "Tandai Semua Hadir"
    );
  };

  // Quick action: Mark all unrecorded as Alpa
  const handleMarkRemainingAlpa = () => {
    const updated = { ...classAttendanceMap };
    let count = 0;
    classStudents.forEach((st) => {
      const current = updated[st.id];
      if (!current || current.status === "Belum Absen") {
        updated[st.id] = {
          status: "Alpa",
          notes: "Tanpa Keterangan (Belum Absen)",
          time: "-",
          isRecorded: true,
          source: "manual"
        };
        count++;
      }
    });
    setClassAttendanceMap(updated);
    if (count > 0) {
      toast.showInfo(`${count} siswa yang belum absen telah ditandai Alpa.`, "Tandai Alpa");
    } else {
      toast.showInfo("Semua siswa sudah memiliki data absensi.", "Info");
    }
  };

  // Quick single change
  const handleStudentStatusChange = (studentId: string, status: AttendanceStatus | "Belum Absen") => {
    setClassAttendanceMap((prev) => {
      const prevItem = prev[studentId] || { notes: "", time: "07:00", isRecorded: false };
      const defaultTime = status === "Belum Absen" ? "-" : (prevItem.time === "-" ? (config.schoolStartTime || "07:00") : prevItem.time);
      return {
        ...prev,
        [studentId]: {
          ...prevItem,
          status,
          time: defaultTime,
          isRecorded: status !== "Belum Absen",
          source: prevItem.source || "manual"
        }
      };
    });
  };

  const handleStudentNotesChange = (studentId: string, notes: string) => {
    setClassAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { status: "Belum Absen", time: "-", isRecorded: false }),
        notes
      }
    }));
  };

  // Save Batch Class Attendance to Firestore (using allowed roles collection + local cache)
  const handleSaveClassAttendance = async () => {
    setIsSavingBatch(true);
    try {
      const updatedList: AttendanceRecord[] = [];

      for (const student of classStudents) {
        const att = classAttendanceMap[student.id] || { status: "Belum Absen", notes: "", time: "-", isRecorded: false };
        const effectiveStatus: AttendanceStatus = att.status === "Belum Absen" ? "Alpa" : att.status;
        const effectiveTime = att.time === "-" ? (config.schoolStartTime || "07:00:00") : att.time;
        const effectiveNotes = att.notes || (att.status === "Belum Absen" ? "Tanpa Keterangan (Belum Absen)" : "");
        const studentClassName = student.classId || student.className || student.class || (selectedClass !== "Semua Kelas" ? selectedClass : "Umum");

        const docId = `att_rec_${selectedDate}_${student.id}`;
        const payload: AttendanceRecord = {
          id: docId,
          type: "attendance_record" as any,
          studentId: student.id,
          studentName: student.name,
          className: studentClassName,
          date: selectedDate,
          timestamp: effectiveTime,
          status: effectiveStatus,
          notes: effectiveNotes,
          source: att.source || "manual",
          markedBy: currentUser?.displayName || currentUser?.email || "Admin",
          faceVerified: effectiveStatus === "Hadir" || effectiveStatus === "Terlambat",
          faceMatchScore: att.faceMatchScore || 100,
          capturedImage: att.capturedImage || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
          location: att.location || {
            lat: config.schoolCenterLat,
            lng: config.schoolCenterLng,
            distance: 5,
            inRadius: true
          },
          createdAt: new Date().toISOString()
        };

        updatedList.push(payload);

        // 1. Primary write to allowed collection: 'roles'
        await setDoc(doc(db, "roles", docId), payload, { merge: true });

        // 2. Silent try to write to 'attendance' collection
        try {
          await setDoc(doc(db, "attendance", docId), payload, { merge: true });
        } catch (e) {}
      }

      // Save to localStorage for instant client-side update
      try {
        const stored = localStorage.getItem("quick_schools_attendance_records");
        const list: AttendanceRecord[] = stored ? JSON.parse(stored) : [];
        const mergedLocal = mergeAttendanceRecords(list, updatedList);
        localStorage.setItem("quick_schools_attendance_records", JSON.stringify(mergedLocal.slice(0, 200)));
      } catch (e) {}

      // Update local state immediately
      setAttendanceRecords((prev) => mergeAttendanceRecords(prev, updatedList));

      toast.showSuccess(
        `Presensi ${selectedClass === "Semua Kelas" ? "seluruh kelas" : `kelas ${selectedClass}`} untuk tanggal ${selectedDate} berhasil disimpan.`,
        "Presensi Disimpan"
      );
    } catch (err: any) {
      console.warn("Class attendance remote write error, falling back to local storage:", err);
      toast.showError("Gagal menyimpan presensi kelas: " + err.message, "Gagal");
    } finally {
      setIsSavingBatch(false);
    }
  };


  // -------------------------------------------------------------
  // Summary Metrics Calculation
  // -------------------------------------------------------------
  const todayDateStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const statsToday = useMemo(() => {
    const todayRecords = scopedAttendanceRecords.filter((r) => r.date === todayDateStr || r.date === selectedDate);
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
  }, [scopedAttendanceRecords, todayDateStr, selectedDate, classStudents.length, classAttendanceMap]);

  // -------------------------------------------------------------
  // Biometric Filtered Logs (Tab 2)
  // -------------------------------------------------------------
  const filteredBiometricData = useMemo(() => {
    return scopedAttendanceRecords.filter((item) => {
      const matchSearch =
        (item.studentName?.toLowerCase() || "").includes(biometricSearch.toLowerCase()) ||
        (item.studentId?.toLowerCase() || "").includes(biometricSearch.toLowerCase()) ||
        (item.className?.toLowerCase() || "").includes(biometricSearch.toLowerCase()) ||
        (item.date?.toLowerCase() || "").includes(biometricSearch.toLowerCase());

      const matchStatus =
        biometricStatusFilter === "Semua" ||
        item.status === biometricStatusFilter;

      const matchClass =
        (!isGuru && biometricClassFilter === "Semua Kelas") ||
        item.className === biometricClassFilter;

      return matchSearch && matchStatus && matchClass;
    });
  }, [scopedAttendanceRecords, biometricSearch, biometricStatusFilter, biometricClassFilter, isGuru]);

  // Leaflet map marker formatting for Tab 2
  const mapAttendanceMarkers = useMemo(() => {
    return filteredBiometricData
      .filter((item) => item.location?.lat && item.location?.lng)
      .map((item) => ({
        id: item.id,
        lat: item.location!.lat,
        lng: item.location!.lng,
        label: item.studentName,
        subLabel: `${item.className} • ${item.date} ${item.timestamp}`,
        status: item.status,
        distance: item.location!.distance,
        inRadius: item.location?.inRadius ?? (item.location!.distance <= config.geofenceRadiusMeters),
        time: item.timestamp,
        photoUrl: item.capturedImage || item.photoUrl,
      }));
  }, [filteredBiometricData, config.geofenceRadiusMeters]);

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

    const pool = isGuru ? scopedStudentsList : studentsList;

    // Populate from scoped students
    pool.forEach((st) => {
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
    scopedAttendanceRecords.forEach((r) => {
      if (r.date && r.date.startsWith(monthlyMonth)) {
        let entry = map[r.studentId];
        if (!entry) {
          // If student not in map, create only if student belongs to homeroom or not guru
          const studentMatches = !isGuru || teacherHomeroomClasses.some(tc => (r.className || "").trim().toLowerCase() === tc.trim().toLowerCase());
          if (studentMatches) {
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
        }

        if (entry) {
          entry.total++;
          if (r.status === "Hadir") entry.hadir++;
          else if (r.status === "Terlambat") entry.terlambat++;
          else if (r.status === "Sakit") entry.sakit++;
          else if (r.status === "Izin") entry.izin++;
          else if (r.status === "Alpa" || r.status === "Ditolak") entry.alpa++;
        }
      }
    });

    const arr = Object.values(map);

    // Filter by class if selected
    const filtered = (monthlyClassFilter === "Semua" && !isGuru)
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
  }, [isGuru, scopedStudentsList, studentsList, scopedAttendanceRecords, monthlyMonth, monthlyClassFilter, teacherHomeroomClasses]);

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
          const val = classAttendanceMap[st.id] || { status: "Belum Absen", notes: "", time: "-" };
          const stClass = st.classId || st.className || st.class || (selectedClass !== "Semua Kelas" ? selectedClass : "Umum");
          return [st.id, `"${st.name}"`, `"${stClass}"`, selectedDate, val.time, val.status, "Manual/Kelas", `"${val.notes}"`];
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
    const filenameSafe = selectedClass === "Semua Kelas" ? "Semua_Kelas" : selectedClass.replace(/\s+/g, "_");
    link.setAttribute("download", `Laporan_Presensi_${filenameSafe}_${selectedDate}.csv`);
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
      {/* Dynamic View: Personal Student View vs Admin/Teacher Management */}
      {/* ------------------------------------------------------------- */}
      {isStudentRole ? (
        <div className="space-y-4">
          {previewAsStudent && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border border-purple-200/80 rounded-lg text-xs shadow-xs">
              <div className="flex items-center gap-2.5 text-purple-900 font-bold">
                <div className="w-6 h-6 rounded-md bg-[#531FFF] text-white flex items-center justify-center shrink-0">
                  <Eye className="w-3.5 h-3.5" />
                </div>
                <span>Mode Pratinjau Siswa Aktif — Menampilkan portal presensi mandiri dengan isolasi data personal siswa.</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewAsStudent(false)}
                className="px-3.5 py-1.5 bg-[#531FFF] hover:bg-[#4215cb] text-white font-extrabold text-xs rounded-lg shadow-xs transition-all cursor-pointer shrink-0"
              >
                Kembali ke Mode Admin
              </button>
            </div>
          )}
          <StudentPersonalAttendanceView
            student={
              studentInfo || {
                id: "S103",
                name: "Bintang Pratama",
                email: currentUser?.email || "student@gmail.com",
                nisn: "2023003",
                className: selectedClass || "10 MIPA 1",
                avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
              }
            }
            attendanceRecords={attendanceRecords}
            config={config}
            onOpenScanModal={() => setShowScanModal(true)}
          />
        </div>
      ) : (
        <>
          {/* 1. Header & Executive Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#531FFF] to-[#7344FF] text-white flex items-center justify-center shadow-md shadow-[#531FFF]/20">
                  {isGuru ? <GraduationCap className="w-5 h-5" /> : <CalendarDays className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                      {isGuru ? "Absensi Kelas Binaan (Wali Kelas)" : "Manajemen & Monitoring Absensi"}
                    </h1>
                    <span className="px-2.5 py-0.5 text-xs font-bold bg-[#F3F0FF] text-[#531FFF] rounded-full border border-[#531FFF]/20 flex items-center gap-1.5">
                      <span className={cn("w-1.5 h-1.5 rounded-full", loading ? "bg-amber-400 animate-ping" : "bg-emerald-500 animate-pulse")} />
                      {loading ? "Memuat Data..." : "Live Sync"}
                    </span>
                    {isGuru && (
                      <span className={cn(
                        "px-2.5 py-0.5 text-xs font-bold rounded-full border flex items-center gap-1.5 shadow-2xs",
                        isTeacherWaliKelas
                          ? "bg-purple-100/80 text-[#531FFF] border-[#531FFF]/30"
                          : "bg-amber-50 text-amber-700 border-amber-300"
                      )}>
                        <GraduationCap className="w-3.5 h-3.5" />
                        {isTeacherWaliKelas
                          ? `Wali Kelas: ${teacherHomeroomClasses.join(", ")}`
                          : "Guru (Belum Ditugaskan Sebagai Wali Kelas)"}
                      </span>
                    )}
                    {previewAsGuru && (
                      <span className="px-2 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-800 rounded border border-amber-200">
                        Pratinjau Role Guru
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">
                    {isGuru
                      ? isTeacherWaliKelas
                        ? `Memantau dan mengelola rekap absensi harian dan bulanan siswa di kelas ${teacherHomeroomClasses.join(", ")}.`
                        : "Anda masuk dengan role Guru. Penugasan kelas Wali Kelas belum terhubung dengan akun Anda."
                      : "Pencatatan harian kelas, monitoring biometrik & GPS, dan rekapitulasi kehadiran siswa."}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {!isGuru && (
                <button
                  type="button"
                  onClick={() => setPreviewAsGuru(true)}
                  className="flex items-center gap-2 px-3.5 py-2.5 bg-purple-50 text-[#531FFF] border border-purple-200/80 rounded-lg hover:bg-purple-100 active:scale-[0.98] transition-all text-xs font-extrabold shadow-xs cursor-pointer"
                  title="Pratinjau tampilan khusus Wali Kelas (Role Guru)"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Preview Guru</span>
                </button>
              )}

              {previewAsGuru && (
                <button
                  type="button"
                  onClick={() => {
                    setPreviewAsGuru(false);
                    setSelectedClass("Semua Kelas");
                  }}
                  className="flex items-center gap-2 px-3.5 py-2.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100 active:scale-[0.98] transition-all text-xs font-bold shadow-xs cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Keluar Preview Guru</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setPreviewAsStudent(true)}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-purple-50 text-[#531FFF] border border-purple-200/80 rounded-lg hover:bg-purple-100 active:scale-[0.98] transition-all text-xs font-extrabold shadow-xs cursor-pointer"
                title="Pratinjau tampilan portal absensi siswa"
              >
                <Eye className="w-4 h-4" />
                <span>Preview Siswa</span>
              </button>

              <button
                onClick={() => setShowScanModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:shadow-lg hover:shadow-emerald-500/25 active:scale-[0.98] transition-all text-xs font-extrabold shadow-sm cursor-pointer border border-white/20"
              >
                <ScanFace className="w-4 h-4 text-white animate-pulse" />
                <span>Kamera & GPS Scan</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 active:scale-[0.98] transition-all text-xs font-bold shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4 text-gray-500" />
                <span>Ekspor CSV</span>
              </button>

              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 active:scale-[0.98] transition-all text-xs font-bold shadow-xs print:hidden cursor-pointer"
              >
                <Printer className="w-4 h-4 text-gray-500" />
                <span>Cetak Rekap</span>
              </button>
            </div>
          </div>

          {/* Banner notification if Guru is not assigned as Wali Kelas */}
          {isGuru && !isTeacherWaliKelas && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3 shadow-xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-900">Akses Terbatas: Belum Ditugaskan Sebagai Wali Kelas</h4>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  Pada menu Absensi untuk role Guru, sistem secara otomatis hanya menampilkan data siswa dari kelas yang menjadi tanggung jawab Anda sebagai <strong>Wali Kelas</strong>. Saat ini akun Anda belum terdaftar sebagai wali kelas dari kelas manapun. Silakan hubungi Administrator Sekolah untuk mengatur penugasan Wali Kelas pada modul Manajemen Kelas.
                </p>
              </div>
            </div>
          )}

      {/* ------------------------------------------------------------- */}
      {/* 2. Real-Time KPI Cards (Ringkasan Kehadiran Hari Ini) */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Tingkat Kehadiran */}
        <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:border-[#531FFF]/30 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Tingkat Hadir</span>
            <div className="w-7 h-7 rounded-md bg-purple-50 text-[#531FFF] flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">{statsToday.attendanceRate}%</h3>
            <p className="text-[11px] text-emerald-600 font-bold mt-0.5">Persentase Hari Ini</p>
          </div>
        </div>

        {/* Total Siswa */}
        <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:border-gray-200 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Total Siswa</span>
            <div className="w-7 h-7 rounded-md bg-gray-100 text-gray-600 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">{statsToday.total}</h3>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">Terjadwal</p>
          </div>
        </div>

        {/* Hadir Tepat */}
        <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:border-emerald-200 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Hadir Tepat</span>
            <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-emerald-600 tracking-tight">{statsToday.hadir}</h3>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">Siswa Hadir</p>
          </div>
        </div>

        {/* Terlambat */}
        <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:border-amber-200 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Terlambat</span>
            <div className="w-7 h-7 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-amber-600 tracking-tight">{statsToday.terlambat}</h3>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">Lewat jam masuk</p>
          </div>
        </div>

        {/* Sakit & Izin */}
        <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:border-blue-200 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Sakit / Izin</span>
            <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <Info className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-blue-600 tracking-tight">{statsToday.sakit + statsToday.izin}</h3>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">Dengan Keterangan</p>
          </div>
        </div>

        {/* Alpa / Tanpa Keterangan */}
        <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:border-rose-200 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Alpa</span>
            <div className="w-7 h-7 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center">
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
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. TAB 1: PRESENSI HARIAN KELAS (MONITORING & PENCATATAN) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "daily" && (
        <div className="space-y-4">
          
          {/* A. Top Controls & Action Bar */}
          <div className="bg-white rounded-lg sm:rounded-xl border border-gray-100 p-4 sm:p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Class Selector Dropdown */}
              <div>
                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">
                  {isGuru ? "Kelas Binaan (Wali Kelas)" : "Pilih Kelas"}
                </label>
                <div className="relative min-w-[170px]">
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full appearance-none bg-gray-50/80 hover:bg-gray-100/80 border border-gray-200 text-gray-900 font-bold pl-3.5 pr-9 py-2 rounded-lg text-xs focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none transition-all cursor-pointer shadow-xs"
                  >
                    {!isGuru && (
                      <option value="Semua Kelas">Semua Kelas (Seluruh Siswa)</option>
                    )}
                    {selectableClasses.map((cls) => (
                      <option key={cls.id || cls.name} value={cls.name}>
                        Kelas {cls.name} {isGuru ? "(Wali Kelas Anda)" : ""}
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
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-gray-50/80 hover:bg-gray-100/80 border border-gray-200 text-gray-900 font-bold px-3 py-2 rounded-lg text-xs focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none transition-all shadow-xs"
                  />
                  {selectedDate !== new Date().toISOString().split("T")[0] && (
                    <button
                      type="button"
                      onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
                      className="px-2.5 py-2 bg-purple-50 text-[#531FFF] rounded-lg text-[11px] font-bold hover:bg-purple-100 transition-colors cursor-pointer"
                    >
                      Hari Ini
                    </button>
                  )}
                </div>
              </div>

              {/* Search in Class */}
              <div>
                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">
                  Cari Siswa di Kelas
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Nama / NISN..."
                    value={searchTermDaily}
                    onChange={(e) => setSearchTermDaily(e.target.value)}
                    className="pl-8 pr-3 py-2 bg-gray-50/80 hover:bg-gray-100/80 border border-gray-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none w-48 sm:w-56 transition-all"
                  />
                  {searchTermDaily && (
                    <button
                      type="button"
                      onClick={() => setSearchTermDaily("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Batch Actions Right */}
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <button
                type="button"
                onClick={handleMarkAllHadir}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-all active:scale-[0.98] flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Tandai semua siswa di kelas ini Hadir"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Semua Hadir</span>
              </button>

              <button
                type="button"
                onClick={handleMarkRemainingAlpa}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all active:scale-[0.98] flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Tandai siswa yang belum ada data absensi sebagai Alpa"
              >
                <UserX className="w-3.5 h-3.5" />
                <span>Belum Absen → Alpa</span>
              </button>

              <button
                type="button"
                onClick={handleSaveClassAttendance}
                disabled={isSavingBatch}
                className="px-4 sm:px-5 py-2 bg-gradient-to-r from-[#531FFF] to-[#7344FF] hover:from-[#4314cc] hover:to-[#5e31e6] text-white rounded-lg text-xs font-extrabold transition-all active:scale-[0.98] flex items-center gap-2 shadow-sm shadow-[#531FFF]/25 cursor-pointer disabled:opacity-50"
              >
                <Save className={cn("w-4 h-4", isSavingBatch && "animate-spin")} />
                <span>{isSavingBatch ? "Menyimpan..." : "Simpan Presensi Kelas"}</span>
              </button>
            </div>
          </div>

          {/* B. Live Monitoring Dashboard Card for the Selected Class */}
          <div className="bg-gradient-to-br from-purple-950 via-[#3a0ca3] to-[#531FFF] text-white rounded-lg sm:rounded-xl p-5 sm:p-6 shadow-lg relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-56 h-56 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              
              {/* Left: Class Attendance Progress */}
              <div className="space-y-2 max-w-md w-full">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-purple-100 text-[11px] font-extrabold border border-white/20 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {selectedClass === "Semua Kelas" ? "Seluruh Kelas" : `Kelas ${selectedClass}`}
                  </span>
                  <span className="text-purple-200 text-xs font-medium">
                    {new Date(selectedDate).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </span>
                </div>

                <div className="flex items-baseline gap-3">
                  <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                    {classStats.percentage}%
                  </h2>
                  <span className="text-sm text-purple-200 font-semibold">
                    Kehadiran Tercatat ({classStats.sudahAbsen} dari {classStats.total} Siswa)
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-black/25 h-3 rounded-full overflow-hidden p-0.5 border border-white/10">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      classStats.percentage >= 85 ? "bg-gradient-to-r from-emerald-400 to-teal-300" :
                      classStats.percentage >= 60 ? "bg-gradient-to-r from-amber-400 to-yellow-300" :
                      "bg-gradient-to-r from-rose-400 to-pink-400"
                    )}
                    style={{ width: `${Math.min(100, Math.max(0, classStats.percentage))}%` }}
                  />
                </div>
              </div>

              {/* Right: Monitoring Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full md:w-auto">
                
                {/* Sudah Absen */}
                <div
                  onClick={() => setDailySubFilter("sudah")}
                  className={cn(
                    "rounded-lg p-3 border cursor-pointer transition-all active:scale-[0.98]",
                    dailySubFilter === "sudah"
                      ? "bg-white/25 border-white text-white shadow-sm"
                      : "bg-white/10 hover:bg-white/20 border-white/15"
                  )}
                >
                  <div className="flex items-center justify-between text-emerald-300 mb-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-200">Sudah Absen</span>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-xl font-black text-white">{classStats.sudahAbsen}</p>
                  <p className="text-[10px] text-emerald-300 font-bold mt-0.5">Tercatat di sistem</p>
                </div>

                {/* Belum Absen */}
                <div
                  onClick={() => setDailySubFilter("belum")}
                  className={cn(
                    "rounded-lg p-3 border cursor-pointer transition-all active:scale-[0.98]",
                    dailySubFilter === "belum"
                      ? "bg-amber-500/40 border-amber-300 text-white shadow-sm"
                      : classStats.belumAbsen > 0
                      ? "bg-amber-500/20 hover:bg-amber-500/30 border-amber-400/40 text-amber-200"
                      : "bg-white/10 hover:bg-white/20 border-white/15 text-purple-200"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Belum Absen</span>
                    <Clock className="w-3.5 h-3.5 text-amber-300" />
                  </div>
                  <p className="text-xl font-black text-white">{classStats.belumAbsen}</p>
                  <p className="text-[10px] text-amber-300 font-bold mt-0.5">
                    {classStats.belumAbsen > 0 ? "Perlu ditindaklanjuti" : "Semua sudah absen"}
                  </p>
                </div>

                {/* Hadir Tepat */}
                <div
                  onClick={() => setDailySubFilter("hadir")}
                  className={cn(
                    "rounded-lg p-3 border cursor-pointer transition-all active:scale-[0.98]",
                    dailySubFilter === "hadir"
                      ? "bg-white/25 border-white text-white shadow-sm"
                      : "bg-white/10 hover:bg-white/20 border-white/15"
                  )}
                >
                  <div className="flex items-center justify-between text-teal-300 mb-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-200">Hadir Tepat</span>
                    <UserCheck className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-xl font-black text-white">{classStats.hadir}</p>
                  <p className="text-[10px] text-teal-300 font-bold mt-0.5">Tepat Waktu</p>
                </div>

                {/* Terlambat */}
                <div
                  onClick={() => setDailySubFilter("terlambat")}
                  className={cn(
                    "rounded-lg p-3 border cursor-pointer transition-all active:scale-[0.98]",
                    dailySubFilter === "terlambat"
                      ? "bg-white/25 border-white text-white shadow-sm"
                      : "bg-white/10 hover:bg-white/20 border-white/15"
                  )}
                >
                  <div className="flex items-center justify-between text-amber-300 mb-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-200">Terlambat</span>
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-xl font-black text-white">{classStats.terlambat}</p>
                  <p className="text-[10px] text-amber-300 font-bold mt-0.5">Lewat jam masuk</p>
                </div>

                {/* Izin / Sakit */}
                <div
                  onClick={() => setDailySubFilter("izin_sakit")}
                  className={cn(
                    "rounded-lg p-3 border cursor-pointer transition-all active:scale-[0.98]",
                    dailySubFilter === "izin_sakit"
                      ? "bg-white/25 border-white text-white shadow-sm"
                      : "bg-white/10 hover:bg-white/20 border-white/15"
                  )}
                >
                  <div className="flex items-center justify-between text-blue-300 mb-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-200">Izin / Sakit</span>
                    <HeartPulse className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-xl font-black text-white">{classStats.izinSakit}</p>
                  <p className="text-[10px] text-blue-300 font-bold mt-0.5">{classStats.sakit} Sakit, {classStats.izin} Izin</p>
                </div>

                {/* Alpa */}
                <div
                  onClick={() => setDailySubFilter("alpa")}
                  className={cn(
                    "rounded-lg p-3 border cursor-pointer transition-all active:scale-[0.98]",
                    dailySubFilter === "alpa"
                      ? "bg-white/25 border-white text-white shadow-sm"
                      : "bg-white/10 hover:bg-white/20 border-white/15"
                  )}
                >
                  <div className="flex items-center justify-between text-rose-300 mb-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-200">Alpa</span>
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-xl font-black text-white">{classStats.alpa}</p>
                  <p className="text-[10px] text-rose-300 font-bold mt-0.5">Tanpa Keterangan</p>
                </div>

              </div>
            </div>
          </div>

          {/* C. Sub-Filters Chips & Table Container */}
          <div className="bg-white rounded-lg sm:rounded-xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
            
            {/* Sub-filter Chips Bar */}
            <div className="p-3.5 sm:p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between gap-3 overflow-x-auto scrollbar-none">
              <div className="flex items-center gap-1.5 min-w-max">
                <span className="text-xs font-bold text-gray-500 mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-gray-400" />
                  Filter Siswa:
                </span>

                <button
                  type="button"
                  onClick={() => setDailySubFilter("all")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    dailySubFilter === "all"
                      ? "bg-[#531FFF] text-white shadow-xs"
                      : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/80"
                  )}
                >
                  Semua Siswa ({classStats.total})
                </button>

                <button
                  type="button"
                  onClick={() => setDailySubFilter("sudah")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                    dailySubFilter === "sudah"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200/80"
                  )}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Sudah Absen ({classStats.sudahAbsen})
                </button>

                <button
                  type="button"
                  onClick={() => setDailySubFilter("belum")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                    dailySubFilter === "belum"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "bg-white text-amber-700 hover:bg-amber-50 border border-amber-200/80"
                  )}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  Belum Absen ({classStats.belumAbsen})
                  {classStats.belumAbsen > 0 && (
                    <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[10px] font-extrabold">
                      Perlu Cek
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setDailySubFilter("terlambat")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    dailySubFilter === "terlambat"
                      ? "bg-orange-600 text-white shadow-xs"
                      : "bg-white text-orange-700 hover:bg-orange-50 border border-orange-200/80"
                  )}
                >
                  Terlambat ({classStats.terlambat})
                </button>

                <button
                  type="button"
                  onClick={() => setDailySubFilter("izin_sakit")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    dailySubFilter === "izin_sakit"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-white text-blue-700 hover:bg-blue-50 border border-blue-200/80"
                  )}
                >
                  Izin & Sakit ({classStats.izinSakit})
                </button>

                <button
                  type="button"
                  onClick={() => setDailySubFilter("alpa")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    dailySubFilter === "alpa"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "bg-white text-rose-700 hover:bg-rose-50 border border-rose-200/80"
                  )}
                >
                  Alpa ({classStats.alpa})
                </button>
              </div>

              <span className="text-xs text-gray-400 font-medium hidden sm:inline-block">
                Menampilkan {displayedDailyStudents.length} dari {classStudents.length} siswa
              </span>
            </div>

            {/* Students Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-gray-100 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                    <th className="px-5 py-3.5 w-12 text-center">No</th>
                    <th className="px-5 py-3.5">Nama & NISN Siswa</th>
                    <th className="px-5 py-3.5">Status Presensi</th>
                    <th className="px-5 py-3.5">Jam Masuk</th>
                    <th className="px-5 py-3.5">Metode & Bukti</th>
                    <th className="px-5 py-3.5">Catatan / Keterangan</th>
                    <th className="px-5 py-3.5 text-center">Aksi Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {displayedDailyStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Users className="w-8 h-8 text-gray-300" />
                          <p className="font-bold text-gray-700 text-sm">
                            {classStudents.length === 0
                              ? isGuru && teacherHomeroomClasses.length === 0
                                ? "Anda Belum Ditugaskan Sebagai Wali Kelas"
                                : `Belum Ada Siswa Terdaftar di Kelas ${selectedClass}`
                              : "Tidak ada siswa pada filter ini"}
                          </p>
                          <p className="text-xs text-gray-400 max-w-sm">
                            {classStudents.length === 0
                              ? isGuru && teacherHomeroomClasses.length === 0
                                ? "Silakan hubungi Administrator Sekolah untuk penugasan kelas Wali Kelas Anda."
                                : isGuru
                                ? `Belum ada data siswa yang terdaftar di kelas binaan Anda (${selectedClass}).`
                                : `Belum ada data siswa yang terdaftar di kelas ${selectedClass}. Silakan pilih kelas lain atau klik tombol di bawah untuk menampilkan seluruh kelas.`
                              : dailySubFilter === "belum"
                              ? "Semua siswa di kelas ini sudah berhasil melakukan absensi!"
                              : "Coba ubah kata kunci pencarian atau pilih filter status lainnya."}
                          </p>
                          {!isGuru && classStudents.length === 0 && selectedClass !== "Semua Kelas" && (
                            <button
                              type="button"
                              onClick={() => setSelectedClass("Semua Kelas")}
                              className="mt-2 px-3.5 py-1.5 bg-purple-50 text-[#531FFF] hover:bg-purple-100 rounded-lg text-xs font-bold transition-all cursor-pointer border border-purple-200"
                            >
                              Tampilkan Semua Kelas
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    displayedDailyStudents.map((student, idx) => {
                      const att = classAttendanceMap[student.id] || {
                        status: "Belum Absen",
                        notes: "",
                        time: "-",
                        isRecorded: false
                      };

                      return (
                        <tr
                          key={student.id}
                          className={cn(
                            "hover:bg-gray-50/80 transition-colors",
                            att.status === "Belum Absen" && "bg-amber-50/20"
                          )}
                        >
                          {/* Number */}
                          <td className="px-5 py-3.5 text-center text-gray-400 font-bold">
                            {idx + 1}
                          </td>

                          {/* Student Profile */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-9 h-9 rounded-lg font-bold flex items-center justify-center text-xs shrink-0 border",
                                att.status === "Hadir" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                att.status === "Terlambat" ? "bg-amber-50 text-amber-700 border-amber-100" :
                                att.status === "Belum Absen" ? "bg-gray-100 text-gray-600 border-gray-200" :
                                "bg-purple-50 text-[#531FFF] border-purple-100"
                              )}>
                                {student.name?.charAt(0) || "S"}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="font-bold text-gray-900 leading-tight">
                                    {student.name}
                                  </p>
                                  {att.status === "Belum Absen" && (
                                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" title="Belum absen" />
                                  )}
                                  {(student.classId || student.className || student.class) && (
                                    <span className="px-1.5 py-0.5 rounded bg-purple-50 text-[#531FFF] text-[10px] font-extrabold border border-purple-100">
                                      {student.classId || student.className || student.class}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                                  NISN: {student.nisn || student.id.slice(0, 8)}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Status Presensi Dropdown / Selector */}
                          <td className="px-5 py-3.5">
                            <div className="relative inline-block min-w-[140px]">
                              <select
                                value={att.status}
                                onChange={(e) => handleStudentStatusChange(student.id, e.target.value as any)}
                                className={cn(
                                  "w-full appearance-none pl-3 pr-8 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20",
                                  att.status === "Hadir" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                                  att.status === "Terlambat" && "bg-amber-50 text-amber-700 border-amber-200",
                                  att.status === "Sakit" && "bg-blue-50 text-blue-700 border-blue-200",
                                  att.status === "Izin" && "bg-indigo-50 text-indigo-700 border-indigo-200",
                                  att.status === "Alpa" && "bg-rose-50 text-rose-700 border-rose-200",
                                  att.status === "Belum Absen" && "bg-gray-100 text-gray-600 border-gray-200 font-medium"
                                )}
                              >
                                <option value="Belum Absen">⏳ Belum Absen</option>
                                <option value="Hadir">✅ Hadir</option>
                                <option value="Terlambat">⚠️ Terlambat</option>
                                <option value="Sakit">🏥 Sakit</option>
                                <option value="Izin">📝 Izin</option>
                                <option value="Alpa">❌ Alpa</option>
                              </select>
                              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                          </td>

                          {/* Jam Masuk */}
                          <td className="px-5 py-3.5">
                            {att.status === "Belum Absen" ? (
                              <span className="text-gray-400 text-xs font-mono">-</span>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                <input
                                  type="time"
                                  value={att.time === "-" ? "07:00" : att.time}
                                  onChange={(e) => {
                                    const newTime = e.target.value;
                                    setClassAttendanceMap((prev) => ({
                                      ...prev,
                                      [student.id]: {
                                        ...(prev[student.id] || { status: "Hadir", notes: "", isRecorded: true }),
                                        time: newTime
                                      }
                                    }));
                                  }}
                                  className="px-2 py-1 bg-white border border-gray-200 rounded-md text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#531FFF]"
                                />
                              </div>
                            )}
                          </td>

                          {/* Metode & Bukti Kehadiran */}
                          <td className="px-5 py-3.5">
                            {att.capturedImage || att.record?.capturedImage ? (
                              <div className="flex items-center gap-2">
                                <div
                                  onClick={() => setSelectedRecord(att.record || null)}
                                  className="relative w-8 h-8 rounded-md overflow-hidden border border-gray-200 cursor-pointer group shrink-0"
                                  title="Klik untuk memperbesar bukti foto"
                                >
                                  <img
                                    src={att.capturedImage || att.record?.capturedImage}
                                    alt={student.name}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                  />
                                </div>
                                <div>
                                  <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                                    <ScanFace className="w-2.5 h-2.5" />
                                    AI {att.faceMatchScore || 98}%
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedRecord(att.record || null)}
                                    className="text-[10px] text-[#531FFF] font-bold hover:underline block mt-0.5 cursor-pointer"
                                  >
                                    Lihat Foto →
                                  </button>
                                </div>
                              </div>
                            ) : att.status !== "Belum Absen" ? (
                              <span className="px-2 py-1 rounded text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                                {att.source === "biometric" ? "Biometrik" : "Manual (Guru/Admin)"}
                              </span>
                            ) : (
                              <span className="text-[11px] text-gray-400 italic">
                                Belum ada data
                              </span>
                            )}
                          </td>

                          {/* Catatan / Keterangan */}
                          <td className="px-5 py-3.5">
                            <input
                              type="text"
                              placeholder={
                                att.status === "Sakit"
                                  ? "Surat dokter / keluhan..."
                                  : att.status === "Izin"
                                  ? "Alasan permohonan izin..."
                                  : att.status === "Belum Absen"
                                  ? "Catatan konfirmasi (opsional)..."
                                  : "Catatan tambahan..."
                              }
                              value={att.notes}
                              onChange={(e) => handleStudentNotesChange(student.id, e.target.value)}
                              className="w-full min-w-[160px] px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                            />
                          </td>

                          {/* Aksi Cepat */}
                          <td className="px-5 py-3.5 text-center">
                            {att.status === "Belum Absen" ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleStudentStatusChange(student.id, "Hadir")}
                                  className="px-2 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer border border-emerald-200"
                                  title="Tandai Hadir"
                                >
                                  Hadir
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStudentStatusChange(student.id, "Izin")}
                                  className="px-2 py-1 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer border border-indigo-200"
                                  title="Tandai Izin"
                                >
                                  Izin
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStudentStatusChange(student.id, "Alpa")}
                                  className="px-2 py-1 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer border border-rose-200"
                                  title="Tandai Alpa"
                                >
                                  Alpa
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleStudentStatusChange(student.id, "Belum Absen")}
                                className="px-2.5 py-1 rounded-md text-[10px] font-bold text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                                title="Reset status kembali ke Belum Absen"
                              >
                                Reset
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Actions */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 font-medium">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-extrabold text-gray-900">Keterangan Status:</span>
                <span className="flex items-center gap-1 font-bold text-emerald-700"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Hadir</span>
                <span className="flex items-center gap-1 font-bold text-amber-700"><span className="w-2 h-2 rounded-full bg-amber-500" /> Terlambat</span>
                <span className="flex items-center gap-1 font-bold text-blue-700"><span className="w-2 h-2 rounded-full bg-blue-500" /> Sakit</span>
                <span className="flex items-center gap-1 font-bold text-indigo-700"><span className="w-2 h-2 rounded-full bg-indigo-500" /> Izin</span>
                <span className="flex items-center gap-1 font-bold text-rose-700"><span className="w-2 h-2 rounded-full bg-rose-500" /> Alpa</span>
                <span className="flex items-center gap-1 font-bold text-gray-600"><span className="w-2 h-2 rounded-full bg-gray-400" /> Belum Absen</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs">
                  {classStats.belumAbsen > 0 ? `${classStats.belumAbsen} siswa belum absen` : "Semua kehadiran telah terdata"}
                </span>
                <button
                  type="button"
                  onClick={handleSaveClassAttendance}
                  disabled={isSavingBatch}
                  className="px-4 py-2 bg-[#531FFF] hover:bg-[#4314cc] text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSavingBatch ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. TAB 2: LOG BIOMETRIK & GPS FEED (PENGECEKAN BIOMETRIK) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "biometric" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col">
          
          {/* Biometric Filter Toolbar */}
          <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/50">
            {/* View Switcher & Search */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center bg-gray-200/70 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setBiometricViewMode("table")}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer",
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
                    "flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer",
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
                    "flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer",
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
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                />
              </div>
            </div>

            {/* Class & Status Filter */}
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <div className="relative">
                <select
                  value={biometricClassFilter}
                  onChange={(e) => setBiometricClassFilter(e.target.value)}
                  className="appearance-none bg-white border border-gray-200 text-gray-700 pl-3.5 pr-8 py-2 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all cursor-pointer shadow-xs"
                >
                  {!isGuru && <option value="Semua Kelas">Semua Kelas</option>}
                  {selectableClasses.map((cls) => (
                    <option key={cls.id || cls.name} value={cls.name}>
                      {cls.name} {isGuru ? "(Wali Kelas)" : ""}
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
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
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
                                "px-2.5 py-1 rounded-md text-xs font-extrabold inline-flex items-center gap-1.5 border",
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
                                "w-7 h-7 rounded-md flex items-center justify-center shrink-0 border",
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
                              "px-2.5 py-1 text-xs font-bold rounded-md inline-flex items-center gap-1 border shadow-2xs",
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
                            className="px-3 py-1.5 bg-gray-100 hover:bg-[#F3F0FF] text-gray-700 hover:text-[#531FFF] rounded-lg font-bold transition-all border border-gray-200 cursor-pointer"
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
                  className="bg-white rounded-lg border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-lg hover:border-[#531FFF]/30 transition-all overflow-hidden cursor-pointer group flex flex-col"
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
                          "px-2 py-0.5 text-[10px] font-extrabold rounded backdrop-blur-md shadow-xs",
                          item.status === "Hadir" && "bg-emerald-500/90 text-white",
                          item.status === "Terlambat" && "bg-amber-500/90 text-white",
                          (item.status === "Alpa" || item.status === "Ditolak") && "bg-rose-500/90 text-white"
                        )}
                      >
                        {item.status}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-extrabold bg-black/60 text-white rounded backdrop-blur-md flex items-center gap-1 shadow-xs">
                        <ScanFace className="w-3 h-3 text-cyan-300" />
                        {item.faceMatchScore}%
                      </span>
                    </div>
                    <div className="absolute bottom-2.5 left-2.5 bg-white/90 backdrop-blur-md px-2 py-0.5 rounded text-[11px] font-bold text-gray-900 shadow-xs flex items-center gap-1">
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

          {/* View Mode 3: Radar Peta GPS Leaflet */}
          {biometricViewMode === "map" && (
            <div className="p-6 bg-gray-50/50 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Map className="w-4 h-4 text-[#531FFF]" />
                    Peta Persebaran Lokasi Presensi Siswa (Real-Time GPS)
                  </h4>
                  <p className="text-xs text-gray-500">
                    Menampilkan titik presensi {filteredBiometricData.length} siswa relatif terhadap lingkaran radius absensi ({config.geofenceRadiusMeters}m).
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Di Dalam Radius
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> Di Luar Radius
                  </span>
                </div>
              </div>

              <AttendanceGeofenceMap
                centerLat={config.schoolCenterLat}
                centerLng={config.schoolCenterLng}
                radius={config.geofenceRadiusMeters}
                interactive={false}
                attendanceMarkers={mapAttendanceMarkers}
                onSelectMarker={(m) => {
                  const found = filteredBiometricData.find((r) => r.id === m.id);
                  if (found) setSelectedRecord(found);
                }}
                height="500px"
              />
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
            <div className="bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-500/20">
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
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Kirim Notifikasi Peringatan
                </button>
              </div>
            </div>
          )}

          {/* Monthly Table Card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
            
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
                    className="bg-white border border-gray-200 text-gray-900 font-bold px-3 py-1.5 rounded-lg text-xs focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none shadow-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">
                    Filter Kelas
                  </label>
                  <select
                    value={monthlyClassFilter}
                    onChange={(e) => setMonthlyClassFilter(e.target.value)}
                    className="bg-white border border-gray-200 text-gray-900 font-bold px-3 py-1.5 rounded-lg text-xs focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none shadow-xs cursor-pointer"
                  >
                    {!isGuru && <option value="Semua">Semua Kelas</option>}
                    {selectableClasses.map((c) => (
                      <option key={c.id || c.name} value={c.name}>
                        {c.name} {isGuru ? "(Wali Kelas)" : ""}
                      </option>
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
                            "px-2 py-0.5 rounded font-extrabold text-xs",
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
                          <span className="px-2.5 py-1 text-[11px] font-black bg-rose-100 text-rose-800 rounded-md inline-flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            Perhatian Khusus
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 rounded-md">
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
              <div className="flex items-center gap-3.5 p-4 rounded-lg bg-gray-50 border border-gray-100">
                <div className="w-14 h-14 rounded-lg bg-white overflow-hidden relative shrink-0 border border-gray-200 shadow-xs">
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
                      "mt-1.5 px-2 py-0.5 text-[10px] font-black rounded inline-block",
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
                  <div className="p-3.5 rounded-lg bg-purple-50/50 border border-purple-100">
                    <p className="text-purple-700 font-bold">Face Match Score</p>
                    <p className="text-2xl font-black text-[#531FFF] mt-1">{selectedRecord.faceMatchScore || 0}%</p>
                    <p className="text-[10px] text-purple-600 mt-1">Batas Minimal: {config.minFaceMatchScore}%</p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-100">
                    <p className="text-gray-500 font-bold">Status Verifikasi</p>
                    <p className={cn("text-base font-black mt-1", selectedRecord.faceVerified ? "text-emerald-600" : "text-rose-600")}>
                      {selectedRecord.faceVerified ? "Valid Sesuai" : "Gagal Cocok"}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">Master Database</p>
                  </div>
                </div>

                {/* Photo Preview */}
                <div className="relative aspect-[4/3] w-full rounded-lg overflow-hidden bg-gray-900 border border-gray-200 shadow-inner">
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
                    "font-extrabold text-[11px] px-2 py-0.5 rounded",
                    selectedRecord.location?.inRadius ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                  )}>
                    {selectedRecord.location?.distance || 0} Meter
                  </span>
                </div>

                <div className="w-full h-36 rounded-lg bg-gray-100 relative overflow-hidden border border-gray-200">
                  <iframe
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    src={`https://maps.google.com/maps?q=${selectedRecord.location?.lat || config.schoolCenterLat},${selectedRecord.location?.lng || config.schoolCenterLng}&z=16&output=embed`}
                  />
                </div>

                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between text-[11px]">
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
                className="w-full py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-100 transition-all text-xs shadow-xs cursor-pointer"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
