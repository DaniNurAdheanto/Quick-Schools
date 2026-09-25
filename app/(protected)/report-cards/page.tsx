"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Award, Search, Printer, Save, CheckCircle2,
  BookOpen, FileText, Sparkles,
  Loader2, Edit3, ShieldCheck, Check, Calendar, School, Trash2,
  BarChart3, TrendingUp, Database, RefreshCw, Plus,
  GraduationCap, X, AlertTriangle,
  Layers, ChevronRight, UserCheck, Clock, CheckCircle,
  ArrowLeft, ArrowRight, ArrowDown, Zap, CheckCheck,
  PanelLeftClose, PanelLeftOpen, Eye, ShieldAlert
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Cell, Legend
} from "recharts";
import { collection, onSnapshot, doc, setDoc, addDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { AlertBox, AlertType } from "@/components/ui/alert-box";
import { useUnifiedStudents } from "@/hooks/use-unified-students";
import { useUnifiedTeachers } from "@/hooks/use-unified-teachers";
import { useSchoolProfile } from "@/context/SchoolProfileContext";
import { isParentRole } from "@/lib/roles-config";
import { resolveParentStudent } from "@/lib/parent-child-resolver";
import { useAuth } from "@/context/AuthContext";
import { PageContentSkeleton } from "@/components/ui/role-loading-skeleton";
import { SubjectGroup, fetchSubjectGroupsFromDb } from "@/lib/subject-groups";

// Standard Indonesian Curriculum Subject Presets (Kurikulum Merdeka & Nasional)
const STANDARD_SUBJECT_PRESETS = [
  // 1. Kelompok Mata Pelajaran Umum - Berlaku untuk SEMUA Jurusan
  { code: "PAI", name: "Pendidikan Agama dan Budi Pekerti", category: "Kelompok Mata Pelajaran Umum", major: "Semua Jurusan / Umum", kkm: 75 },
  { code: "PKN", name: "Pendidikan Pancasila", category: "Kelompok Mata Pelajaran Umum", major: "Semua Jurusan / Umum", kkm: 75 },
  { code: "BIN", name: "Bahasa Indonesia", category: "Kelompok Mata Pelajaran Umum", major: "Semua Jurusan / Umum", kkm: 75 },
  { code: "MAT", name: "Matematika", category: "Kelompok Mata Pelajaran Umum", major: "Semua Jurusan / Umum", kkm: 75 },
  { code: "BIG", name: "Bahasa Inggris", category: "Kelompok Mata Pelajaran Umum", major: "Semua Jurusan / Umum", kkm: 75 },
  { code: "PJK", name: "PJOK", category: "Kelompok Mata Pelajaran Umum", major: "Semua Jurusan / Umum", kkm: 75 },
  { code: "SEJ", name: "Sejarah", category: "Kelompok Mata Pelajaran Umum", major: "Semua Jurusan / Umum", kkm: 75 },

  // 2. Kelompok MIPA (Jurusan IPA)
  { code: "BIO", name: "Biologi", category: "Kelompok MIPA", major: "IPA", kkm: 75 },
  { code: "FIS", name: "Fisika", category: "Kelompok MIPA", major: "IPA", kkm: 75 },
  { code: "KIM", name: "Kimia", category: "Kelompok MIPA", major: "IPA", kkm: 75 },
  { code: "MTL", name: "Matematika Tingkat Lanjut", category: "Kelompok MIPA", major: "IPA", kkm: 75 },

  // 3. Kelompok IPS (Jurusan IPS)
  { code: "EKO", name: "Ekonomi", category: "Kelompok IPS", major: "IPS", kkm: 75 },
  { code: "GEO", name: "Geografi", category: "Kelompok IPS", major: "IPS", kkm: 75 },
  { code: "SOS", name: "Sosiologi", category: "Kelompok IPS", major: "IPS", kkm: 75 },
  { code: "SJL", name: "Sejarah Tingkat Lanjut", category: "Kelompok IPS", major: "IPS", kkm: 75 },

  // 4. Kelompok Bahasa (Jurusan Bahasa)
  { code: "BSI", name: "Bahasa dan Sastra Indonesia", category: "Kelompok Bahasa", major: "Bahasa", kkm: 75 },
  { code: "BSE", name: "Bahasa dan Sastra Inggris", category: "Kelompok Bahasa", major: "Bahasa", kkm: 75 },
  { code: "BSA", name: "Bahasa Asing Pilihan", category: "Kelompok Bahasa", major: "Bahasa", kkm: 75 },
  { code: "ANT", name: "Antropologi", category: "Kelompok Bahasa", major: "Bahasa", kkm: 75 },

  // Kejuruan SMK - RPL
  { code: "RPL-DAS", name: "Dasar-Dasar Kejuruan RPL", category: "Dasar Program Keahlian (C2) - RPL", major: "RPL", kkm: 75 },
  { code: "RPL-PBO", name: "Pemrograman Berorientasi Objek", category: "Konsentrasi Keahlian (C3) - RPL", major: "RPL", kkm: 75 },
  { code: "RPL-WEB", name: "Pemrograman Web & Bergerak", category: "Konsentrasi Keahlian (C3) - RPL", major: "RPL", kkm: 75 },
  { code: "RPL-DB", name: "Basis Data", category: "Konsentrasi Keahlian (C3) - RPL", major: "RPL", kkm: 75 },
  { code: "RPL-PKK", name: "Produk Kreatif & Kewirausahaan", category: "Konsentrasi Keahlian (C3) - RPL", major: "RPL", kkm: 75 },

  // Kejuruan SMK - TKJ
  { code: "TKJ-DAS", name: "Dasar-Dasar Kejuruan TKJ", category: "Dasar Program Keahlian (C2) - TKJ", major: "TKJ", kkm: 75 },
  { code: "TKJ-WAN", name: "Teknologi Jaringan Berbasis Luas (WAN)", category: "Konsentrasi Keahlian (C3) - TKJ", major: "TKJ", kkm: 75 },
  { code: "TKJ-ASJ", name: "Administrasi Server Jaringan", category: "Konsentrasi Keahlian (C3) - TKJ", major: "TKJ", kkm: 75 },

  // Muatan Lokal
  { code: "BHD", name: "Bahasa Daerah", category: "Muatan Lokal & Pilihan", major: "Semua Jurusan / Umum", kkm: 75 },
  { code: "PLH", name: "Pendidikan Lingkungan Hidup", category: "Muatan Lokal & Pilihan", major: "Semua Jurusan / Umum", kkm: 75 }
];

// Helper: Cek apakah mapel adalah mapel umum kurikulum nasional (wajib/kewilayahan)
function isCommonCurriculumSubject(subjName: string): boolean {
  if (!subjName) return false;
  const norm = subjName.toLowerCase().trim();
  if (norm.includes("tingkat lanjut") || norm.includes("peminatan") || norm.includes("kejuruan")) return false;
  return (
    norm.includes("agama") ||
    norm.includes("pancasila") ||
    norm.includes("ppkn") ||
    norm.includes("pkn") ||
    norm.includes("bahasa indonesia") ||
    (norm.startsWith("matematika") && !norm.includes("tingkat lanjut") && !norm.includes("peminatan")) ||
    norm.includes("bahasa inggris") ||
    norm.includes("pjok") ||
    norm.includes("jasmani") ||
    (norm.startsWith("sejarah") && !norm.includes("tingkat lanjut") && !norm.includes("peminatan")) ||
    norm.includes("seni budaya") ||
    norm.includes("prakarya") ||
    norm.includes("informatika") ||
    norm.includes("muatan lokal") ||
    norm.includes("bahasa daerah")
  );
}

// Helper: Deteksi jurusan spesifik dari nama mata pelajaran
function getPresetMajorForSubject(subjName: string): string | null {
  if (!subjName) return null;
  const norm = subjName.toLowerCase().trim();
  // 1. MIPA / IPA
  if (
    norm.includes("biologi") ||
    norm.includes("fisika") ||
    norm.includes("kimia") ||
    norm.includes("matematika tingkat lanjut") ||
    norm.includes("matematika peminatan")
  ) {
    return "IPA";
  }
  // 2. IPS
  if (
    norm.includes("ekonomi") ||
    norm.includes("geografi") ||
    norm.includes("sosiologi") ||
    norm.includes("sejarah tingkat lanjut") ||
    norm.includes("sejarah peminatan")
  ) {
    return "IPS";
  }
  // 3. Bahasa
  if (
    norm.includes("sastra indonesia") ||
    norm.includes("sastra inggris") ||
    norm.includes("bahasa asing") ||
    norm.includes("antropologi")
  ) {
    return "Bahasa";
  }
  // 4. SMK
  if (norm.includes("rpl") || norm.includes("perangkat lunak") || norm.includes("pemrograman") || norm.includes("basis data") || norm.includes("pbo")) {
    return "RPL";
  }
  if (norm.includes("tkj") || norm.includes("komputer & jaringan") || norm.includes("jaringan berbasis luas") || norm.includes("administrasi server")) {
    return "TKJ";
  }
  if (norm.includes("dkv") || norm.includes("komunikasi visual") || norm.includes("fotografi") || norm.includes("videografi")) {
    return "DKV";
  }
  return null;
}

function normalizeSubjectName(rawName: string): string {
  if (!rawName) return "";
  const trimmed = rawName.trim();
  const lower = trimmed.toLowerCase();

  // Pemetaan variasi/sinonim nama kurikulum ke nama resmi SMA Kurikulum Merdeka
  if (lower.includes("agama") && (lower.includes("budi pekerti") || lower.includes("islam") || lower.includes("kristen") || lower.includes("katolik") || lower.includes("hindu") || lower.includes("buddha") || lower.includes("khonghucu") || lower === "pai")) {
    return "Pendidikan Agama dan Budi Pekerti";
  }
  if (lower.includes("pancasila") || lower.includes("ppkn") || lower === "pkn") {
    return "Pendidikan Pancasila";
  }
  if (lower === "bahasa indonesia" || lower === "b. indonesia" || lower === "b indonesia" || lower === "bin") {
    return "Bahasa Indonesia";
  }
  if (lower === "matematika" || lower === "matematika wajib" || lower === "mtk" || lower === "mat") {
    return "Matematika";
  }
  if (lower === "bahasa inggris" || lower === "b. inggris" || lower === "b inggris" || lower === "big") {
    return "Bahasa Inggris";
  }
  if (lower.includes("pjok") || lower.includes("jasmani") || lower.includes("olahraga")) {
    return "PJOK";
  }
  if (lower === "sejarah" || lower === "sejarah indonesia" || lower === "sej") {
    return "Sejarah";
  }
  if (lower === "sejarah tingkat lanjut" || lower === "sejarah peminatan" || lower === "sjl") {
    return "Sejarah Tingkat Lanjut";
  }
  if (lower === "matematika tingkat lanjut" || lower === "matematika peminatan" || lower === "mtl") {
    return "Matematika Tingkat Lanjut";
  }
  if (lower === "biologi" || lower === "bio") {
    return "Biologi";
  }
  if (lower === "fisika" || lower === "fis") {
    return "Fisika";
  }
  if (lower === "kimia" || lower === "kim") {
    return "Kimia";
  }
  if (lower === "ekonomi" || lower === "eko") {
    return "Ekonomi";
  }
  if (lower === "geografi" || lower === "geo") {
    return "Geografi";
  }
  if (lower === "sosiologi" || lower === "sos") {
    return "Sosiologi";
  }
  if (lower.includes("sastra indonesia") || lower === "bsi") {
    return "Bahasa dan Sastra Indonesia";
  }
  if (lower.includes("sastra inggris") || lower === "bse") {
    return "Bahasa dan Sastra Inggris";
  }
  if (lower.includes("bahasa asing") || lower === "bsa") {
    return "Bahasa Asing Pilihan";
  }
  if (lower.includes("antropologi") || lower === "ant") {
    return "Antropologi";
  }

  const found = STANDARD_SUBJECT_PRESETS.find(
    p => p.name.toLowerCase() === trimmed.toLowerCase() || p.code.toLowerCase() === trimmed.toLowerCase()
  );
  if (found) return found.name;

  // Title Case if all uppercase like "BIOLOGI"
  if (trimmed === trimmed.toUpperCase() && trimmed.length > 2) {
    return trimmed
      .split(" ")
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }
  return trimmed;
}

// Clean helper to get the real NISN from student data (avoiding raw 20+ char Firestore document UIDs)
function getStudentNisn(student: any): string {
  if (!student) return "-";
  const isDocId = (val: any) => typeof val === "string" && val.length >= 20 && !/^\d+$/.test(val);

  if (student.nisn && !isDocId(student.nisn) && student.nisn !== "-") return String(student.nisn);
  if (student.nis && !isDocId(student.nis) && student.nis !== "-") return String(student.nis);
  if (student.id && !isDocId(student.id) && student.id !== "-") return String(student.id);
  if (student.nis_nasional && !isDocId(student.nis_nasional)) return String(student.nis_nasional);
  return "-";
}

export default function ReportCardsPage() {
  const { profile: schoolProfile, majorOptions, currentStage } = useSchoolProfile();
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

  // Realtime Unified Student Data (Merged from students + users collections, same as data-siswa)
  const { students, loading: studentsLoading } = useUnifiedStudents();
  const [classes, setClasses] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [subjectGroups, setSubjectGroups] = useState<SubjectGroup[]>([]);
  const { teachers: unifiedTeachers } = useUnifiedTeachers();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [reportCardsData, setReportCardsData] = useState<Record<string, any>>({});
  const [isSyncingSubjects, setIsSyncingSubjects] = useState(false);

  // Centralized useAuth
  const { role: authRole, rawRole: authRawRole, userData, isAuthLoading, isRoleReady, isKepalaSekolah, rolePermissions } = useAuth();
  const currentUserData = userData;
  const userRole = (authRawRole || authRole || "").toLowerCase();
  const userEmail = userData?.email || auth.currentUser?.email || "";
  const [previewAsGuru, setPreviewAsGuru] = useState(false);
  const [loading, setLoading] = useState(true);

  const [selectedClass, setSelectedClass] = useState<string>("All");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [semester, setSemester] = useState<string>("Ganjil");
  const [academicYear, setAcademicYear] = useState<string>("2025/2026");

  const [activeTab, setActiveTab] = useState<"report" | "analytics">("report");
  const [activeSectionFilter, setActiveSectionFilter] = useState<"all" | "academic" | "attitude" | "attendance" | "extracurricular" | "notes">("all");
  // Mode Pengisian Rapor: "continuous" (Default: Alur Mengalir Utuh tanpa harus bolak-balik tab) atau "tabbed" (Mode Fokus Tab)
  const [reportEntryMode, setReportEntryMode] = useState<"continuous" | "tabbed">("continuous");

  // Editable fields for selected student's report card (Sections B, C, D, E)
  const [teacherNotes, setTeacherNotes] = useState<string>("");
  const [spiritualAttitude, setSpiritualAttitude] = useState<string>("Sangat Baik");
  const [spiritualDesc, setSpiritualDesc] = useState<string>("Terbiasa berdoa sebelum/sesudah belajar, taat beribadah, dan menunjukkan toleransi yang tinggi.");
  const [socialAttitude, setSocialAttitude] = useState<string>("Baik");
  const [socialDesc, setSocialDesc] = useState<string>("Sangat santun dalam bertutur kata, disiplin dalam mengumpulkan tugas, dan peduli terhadap sesama.");

  const [sickCount, setSickCount] = useState<number>(0);
  const [permitCount, setPermitCount] = useState<number>(0);
  const [alphaCount, setAlphaCount] = useState<number>(0);

  const [extraCurriculars, setExtraCurriculars] = useState<{ name: string; grade: string; desc: string }[]>([
    { name: "Pramuka Wajib", grade: "A", desc: "Aktif dan menunjukkan jiwa kepemimpinan yang tinggi." },
    { name: "Palang Merah Remaja", grade: "B", desc: "Berpartisipasi aktif dalam kegiatan kemanusiaan dan pertolongan pertama." }
  ]);

  const [subjectNotes, setSubjectNotes] = useState<Record<string, string>>({});

  // Section E: Homeroom & Promotion Decision
  const [promotionStatus, setPromotionStatus] = useState<string>("Naik ke Kelas Berikutnya");
  const [decisionDate, setDecisionDate] = useState<string>("19 Desember 2025");
  const [customHomeroomName, setCustomHomeroomName] = useState<string>("");
  const [customHomeroomNip, setCustomHomeroomNip] = useState<string>("");

  // Saving states
  const [isSaving, setIsSaving] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const isParent = isParentRole(userRole) || userRole === "orang-tua" || isParentRole(currentUserData?.role);
  const isStudentRole = userRole === "student" || userRole === "siswa" || isParent;
  const isGuru = (userRole === "guru" || userRole === "teacher") || previewAsGuru;
  const canMutateGrades = !isKepalaSekolah || Boolean(rolePermissions?.grades?.write);
  const isReadOnly = isStudentRole || !canMutateGrades;

  // Determine homeroom class(es) for the logged-in Guru (Wali Kelas)
  const teacherHomeroomClasses = useMemo(() => {
    if (!isGuru) return [];

    const tName = (currentUserData?.fullName || currentUserData?.name || auth.currentUser?.displayName || "").trim().toLowerCase();
    const tNip = (currentUserData?.nip || currentUserData?.id || "").trim().toLowerCase();
    const tEmail = (currentUserData?.email || userEmail || auth.currentUser?.email || "").trim().toLowerCase();
    const tUid = currentUserData?.uid || auth.currentUser?.uid;

    const matched = new Set<string>();

    // 1. Match from classes collection
    classes.forEach((c) => {
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
    if (directClass && directClass !== "-" && directClass !== "All" && directClass !== "Semua Kelas") {
      matched.add(directClass);
    }

    // 3. Match from teachers collection
    const tDoc = teachers.find((t) =>
      (tEmail && t.email?.toLowerCase() === tEmail) ||
      (tNip && (t.nip === tNip || t.id === tNip)) ||
      (tUid && (t.uid === tUid || t._firestoreId === tUid || t.id === tUid)) ||
      (tName && (t.name?.toLowerCase() === tName || (tName.length > 5 && t.name?.toLowerCase().includes(tName))))
    );
    if (tDoc) {
      const tClass = tDoc.homeroomClass || tDoc.homeroom || tDoc.class || tDoc.className || tDoc.waliKelas;
      if (tClass && tClass !== "-" && tClass !== "All" && tClass !== "Semua Kelas") {
        matched.add(tClass);
      }
    }

    // Fallback for admin preview mode so preview is never empty
    if (matched.size === 0 && previewAsGuru) {
      const defaultHomeroom = classes.find(c => c.homeroom || c.name === "12 MIPA 1")?.name || classes[0]?.name || "12 MIPA 1";
      if (defaultHomeroom) matched.add(defaultHomeroom);
    }

    return Array.from(matched);
  }, [isGuru, currentUserData, userEmail, classes, teachers, previewAsGuru]);

  const isTeacherWaliKelas = Boolean(isGuru && teacherHomeroomClasses.length > 0);

  // Auto-synchronize selectedClass for Guru
  useEffect(() => {
    if (isGuru && teacherHomeroomClasses.length > 0) {
      if (!teacherHomeroomClasses.includes(selectedClass)) {
        setSelectedClass(teacherHomeroomClasses[0]);
      }
    }
  }, [isGuru, teacherHomeroomClasses, selectedClass]);

  // Selectable classes list (Restricted exclusively to homeroom for Guru)
  const selectableClasses = useMemo(() => {
    if (isGuru) {
      return classes.filter(c => teacherHomeroomClasses.includes(c.name || c.id));
    }
    return classes;
  }, [isGuru, classes, teacherHomeroomClasses]);

  // Scoped students pool for Guru
  const scopedStudents = useMemo(() => {
    if (!isGuru) return students;
    if (teacherHomeroomClasses.length === 0) return [];
    return students.filter((s) => {
      const sc = (s.classId || s.className || s.kelas || s.class || "").trim().toLowerCase();
      const scNoSpace = sc.replace(/\s+/g, "");
      return teacherHomeroomClasses.some((tc) => {
        const target = tc.trim().toLowerCase();
        const targetNoSpace = target.replace(/\s+/g, "");
        return sc === target || scNoSpace === targetNoSpace;
      });
    });
  }, [isGuru, teacherHomeroomClasses, students]);

  // Firestore Realtime Subscriptions (Classes, Grades, Subjects, Teachers, Attendance, ReportCards)
  useEffect(() => {
    const unsubClasses = onSnapshot(collection(db, "classes"), (snap) => {
      setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubGrades = onSnapshot(collection(db, "grades"), (snap) => {
      setGrades(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubSubjects = onSnapshot(collection(db, "subjects"), (snap) => {
      setSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qGroups = query(collection(db, "subject_groups"), orderBy("order", "asc"));
    const unsubSubjectGroups = onSnapshot(qGroups, (snap) => {
      if (!snap.empty) {
        setSubjectGroups(snap.docs.map(d => ({ id: d.id, ...d.data() }) as SubjectGroup));
      } else {
        fetchSubjectGroupsFromDb(currentStage, majorOptions).then(res => {
          if (res && res.length > 0) setSubjectGroups(res);
        });
      }
    }, () => {
      fetchSubjectGroupsFromDb(currentStage, majorOptions).then(res => {
        if (res && res.length > 0) setSubjectGroups(res);
      });
    });

    const unsubSchedules = onSnapshot(collection(db, "schedules"), (snap) => {
      setSchedules(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubAttendance = onSnapshot(collection(db, "attendance"), (snap) => {
      setAttendanceRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubReportCards = onSnapshot(collection(db, "reportCards"), (snap) => {
      const map: Record<string, any> = {};
      snap.docs.forEach(d => {
        map[d.id] = d.data();
      });
      setReportCardsData(map);
      setLoading(false);
    });

    return () => {
      unsubClasses();
      unsubGrades();
      unsubSubjects();
      unsubSubjectGroups();
      unsubSchedules();
      unsubAttendance();
      unsubReportCards();
    };
  }, [currentStage, majorOptions]);

  useEffect(() => {
    setTeachers(unifiedTeachers);
  }, [unifiedTeachers]);

  // Initialize selectedStudentId when students load
  useEffect(() => {
    if (students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0]._firestoreId || students[0].uid || students[0].id);
    }
  }, [students, selectedStudentId]);

  // Auto-select student if student role or parent role
  useEffect(() => {
    if (isParent && students.length > 0) {
      const resolved = resolveParentStudent(auth.currentUser, currentUserData, students);
      if (resolved.student) {
        setSelectedStudentId(resolved.student._firestoreId || resolved.student.uid || resolved.student.id);
      }
    } else if (isStudentRole && students.length > 0 && userEmail) {
      const matchingStudent = students.find(s =>
        (s.email && s.email.toLowerCase() === userEmail.toLowerCase()) ||
        (s.name && userEmail.toLowerCase().includes(s.name.toLowerCase().split(' ')[0]))
      );
      if (matchingStudent) {
        setSelectedStudentId(matchingStudent._firestoreId || matchingStudent.uid || matchingStudent.id);
      }
    }
  }, [isParent, isStudentRole, students, userEmail, currentUserData]);

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    return scopedStudents.filter(s => {
      const matchClass = (!isGuru && selectedClass === "All") || s.classId === selectedClass || s.className === selectedClass;
      const nisnVal = getStudentNisn(s).toLowerCase();
      const matchQuery = !searchQuery ||
        (s.name && s.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.fullName && s.fullName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.id && s.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
        nisnVal.includes(searchQuery.toLowerCase());
      return matchClass && matchQuery;
    });
  }, [scopedStudents, selectedClass, searchQuery, isGuru]);

  // Selected Student Object (Resilient lookup across _firestoreId, uid, id, and nisn)
  const currentStudent = useMemo(() => {
    if (!scopedStudents || scopedStudents.length === 0) return null;
    return filteredStudents.find(s =>
      (s._firestoreId && s._firestoreId === selectedStudentId) ||
      (s.uid && s.uid === selectedStudentId) ||
      (s.id && s.id === selectedStudentId) ||
      (s.nisn && s.nisn === selectedStudentId)
    ) || filteredStudents[0] || scopedStudents[0] || null;
  }, [scopedStudents, selectedStudentId, filteredStudents]);

  // Dynamic Homeroom Teacher lookup from classes and teachers collections
  const homeroomTeacher = useMemo(() => {
    if (isGuru && currentUserData) {
      return {
        name: currentUserData.fullName || currentUserData.name || auth.currentUser?.displayName || "Wali Kelas",
        nip: currentUserData.nip || currentUserData.id || "-"
      };
    }
    if (!currentStudent) return null;
    const studentClass = classes.find(c =>
      c.id === currentStudent.classId ||
      c.name === currentStudent.classId ||
      c.name === currentStudent.className
    );
    if (!studentClass) return null;
    const hrName = studentClass.homeroom;
    if (!hrName) return null;
    const tObj = teachers.find(t =>
      (t.name && t.name.toLowerCase() === hrName.toLowerCase()) ||
      (t.id && t.id === hrName)
    );
    return {
      name: tObj?.name || hrName,
      nip: tObj?.nip || studentClass.homeroomNip || "-"
    };
  }, [isGuru, currentUserData, currentStudent, classes, teachers]);

  // Realtime attendance stats calculated directly from Firestore 'attendance' collection
  const dbAttendanceStats = useMemo(() => {
    if (!currentStudent) return { sick: 0, permit: 0, alpha: 0, present: 0, late: 0, total: 0 };

    const studentRecords = attendanceRecords.filter((rec: any) => {
      const matchId = rec.studentId && (
        rec.studentId === currentStudent.id ||
        rec.studentId === currentStudent.uid ||
        rec.studentId === currentStudent.nis ||
        rec.studentId === currentStudent.nisn ||
        rec.studentId === currentStudent._firestoreId ||
        (currentStudent._allDocIds && currentStudent._allDocIds.includes(rec.studentId))
      );
      const matchName = rec.studentName && currentStudent.name && (
        rec.studentName.toLowerCase().trim() === currentStudent.name.toLowerCase().trim() ||
        (currentStudent.fullName && rec.studentName.toLowerCase().trim() === currentStudent.fullName.toLowerCase().trim())
      );
      return Boolean(matchId || matchName);
    });

    const sick = studentRecords.filter((r: any) => (r.status || "").toLowerCase() === "sakit").length;
    const permit = studentRecords.filter((r: any) => (r.status || "").toLowerCase() === "izin").length;
    const alpha = studentRecords.filter((r: any) => {
      const s = (r.status || "").toLowerCase();
      return s === "alpa" || s === "alpha" || s === "tanpa keterangan";
    }).length;
    const present = studentRecords.filter((r: any) => (r.status || "").toLowerCase() === "hadir").length;
    const late = studentRecords.filter((r: any) => (r.status || "").toLowerCase() === "terlambat").length;

    return {
      sick,
      permit,
      alpha,
      present,
      late,
      total: studentRecords.length
    };
  }, [currentStudent, attendanceRecords]);

  // Sync saved report card details when current student changes (sanitize slashes in year for Firestore doc id)
  const sanitizedAcademicYear = academicYear.replace(/\//g, "-");
  const reportDocKey = useMemo(() => {
    if (!currentStudent) return "";
    const nisn = getStudentNisn(currentStudent);
    const primaryId = (nisn !== "-" ? nisn : (currentStudent.id || currentStudent.uid || currentStudent._firestoreId));

    // Check if there's already an existing record saved under different candidate keys
    const candidateKeys = [
      nisn !== "-" ? `${nisn}_${semester}_${sanitizedAcademicYear}` : null,
      currentStudent.id ? `${currentStudent.id}_${semester}_${sanitizedAcademicYear}` : null,
      currentStudent._firestoreId ? `${currentStudent._firestoreId}_${semester}_${sanitizedAcademicYear}` : null,
      currentStudent.uid ? `${currentStudent.uid}_${semester}_${sanitizedAcademicYear}` : null,
    ].filter(Boolean) as string[];

    for (const key of candidateKeys) {
      if (reportCardsData[key]) return key;
    }

    return `${primaryId}_${semester}_${sanitizedAcademicYear}`;
  }, [currentStudent, semester, sanitizedAcademicYear, reportCardsData]);

  // Identifikasi Dokumen Rapor Digital & Status Publikasi Saat Ini
  const currentReportDoc = useMemo(() => {
    if (!reportDocKey || !reportCardsData) return null;
    return reportCardsData[reportDocKey] || null;
  }, [reportDocKey, reportCardsData]);

  const isReportPublished = useMemo(() => {
    if (!currentReportDoc) return false;
    return currentReportDoc.isPublished === true || currentReportDoc.status === "published";
  }, [currentReportDoc]);

  const isReportDraft = useMemo(() => {
    if (!currentReportDoc) return false;
    return currentReportDoc.status === "draft" || (!isReportPublished && Boolean(currentReportDoc.updatedAt || currentReportDoc.studentId));
  }, [currentReportDoc, isReportPublished]);

  useEffect(() => {
    if (reportDocKey && reportCardsData[reportDocKey]) {
      const rc = reportCardsData[reportDocKey];
      setTeacherNotes(rc.teacherNotes || "Menunjukkan prestasi belajar yang sangat baik dan kedisiplinan yang tinggi dalam mengikuti pembelajaran.");
      setSpiritualAttitude(rc.spiritualAttitude || "Sangat Baik");
      setSpiritualDesc(rc.spiritualDesc || "Terbiasa berdoa sebelum/sesudah belajar, taat beribadah, dan menunjukkan toleransi yang tinggi.");
      setSocialAttitude(rc.socialAttitude || "Baik");
      setSocialDesc(rc.socialDesc || "Sangat santun dalam bertutur kata, disiplin dalam mengumpulkan tugas, dan peduli terhadap sesama.");

      // If explicit attendance saved in reportCard, use it; otherwise auto-use live DB counts
      setSickCount(rc.sickCount !== undefined ? rc.sickCount : dbAttendanceStats.sick);
      setPermitCount(rc.permitCount !== undefined ? rc.permitCount : dbAttendanceStats.permit);
      setAlphaCount(rc.alphaCount !== undefined ? rc.alphaCount : dbAttendanceStats.alpha);

      if (rc.extraCurriculars && Array.isArray(rc.extraCurriculars)) {
        setExtraCurriculars(rc.extraCurriculars);
      }
      if (rc.subjectNotes && typeof rc.subjectNotes === "object") {
        setSubjectNotes(rc.subjectNotes);
      } else {
        setSubjectNotes({});
      }

      setPromotionStatus(rc.promotionStatus || "Naik ke Kelas Berikutnya");
      setDecisionDate(rc.decisionDate || "19 Desember 2025");
      setCustomHomeroomName(rc.homeroomTeacherName || homeroomTeacher?.name || "");
      setCustomHomeroomNip(rc.homeroomTeacherNip || homeroomTeacher?.nip || "");
    } else {
      // Default initial values dynamically connected with live DB
      setTeacherNotes("Menunjukkan perkembangan akademik yang konsisten dan aktif dalam kegiatan pembelajaran di kelas. Pertahankan semangat belajar!");
      setSpiritualAttitude("Sangat Baik");
      setSpiritualDesc("Terbiasa berdoa sebelum dan sesudah belajar, taat beribadah, serta menunjukkan sikap toleransi yang tinggi.");
      setSocialAttitude("Baik");
      setSocialDesc("Sangat santun dalam bertutur kata, memiliki kepedulian sosial yang baik, dan dapat bekerja sama.");

      // Real counts from attendance database!
      setSickCount(dbAttendanceStats.sick);
      setPermitCount(dbAttendanceStats.permit);
      setAlphaCount(dbAttendanceStats.alpha);

      setExtraCurriculars([
        { name: "Pramuka Wajib", grade: "A", desc: "Aktif dan menunjukkan jiwa kedisiplinan yang baik." },
        { name: "Palang Merah Remaja (PMR)", grade: "A", desc: "Berpartisipasi aktif dalam kegiatan sosial dan kemanusiaan." }
      ]);
      setSubjectNotes({});
      setPromotionStatus("Naik ke Kelas Berikutnya");
      setDecisionDate("19 Desember 2025");
      setCustomHomeroomName(homeroomTeacher?.name || "");
      setCustomHomeroomNip(homeroomTeacher?.nip || "");
    }
  }, [reportDocKey, reportCardsData, dbAttendanceStats.sick, dbAttendanceStats.permit, dbAttendanceStats.alpha, homeroomTeacher]);

  // Resolusi Dokumen Rombel Kelas Siswa Terpilih
  const selectedStudentClassObj = useMemo(() => {
    if (!currentStudent) return null;
    return classes.find(c => 
      c.name === currentStudent.classId || 
      c.className === currentStudent.classId || 
      c.id === currentStudent.classId || 
      c._firestoreId === currentStudent.classDocId ||
      c._firestoreId === currentStudent.classId
    ) || null;
  }, [currentStudent, classes]);

  // Resolusi Jurusan / Program Keahlian Siswa Terpilih
  const studentMajor = useMemo(() => {
    if (!currentStudent) return "";
    // 1. Langsung dari properti data siswa
    if (currentStudent.major && currentStudent.major !== "All" && currentStudent.major !== "Semua") {
      return String(currentStudent.major).trim();
    }
    // 2. Dari rombel kelas siswa
    if (selectedStudentClassObj?.major && selectedStudentClassObj.major !== "All" && selectedStudentClassObj.major !== "Semua") {
      return String(selectedStudentClassObj.major).trim();
    }
    // 3. Fallback: deteksi dari nama kelas (misal "XII RPL 1" -> "RPL", "XI MIPA 2" -> "MIPA")
    const classStr = (currentStudent.classId || currentStudent.className || selectedStudentClassObj?.name || "").toUpperCase();
    for (const opt of majorOptions) {
      const val = (opt.value || "").toUpperCase().trim();
      if (val && val !== "ALL" && val !== "UMUM" && classStr.includes(val)) {
        return opt.value;
      }
    }
    return "";
  }, [currentStudent, selectedStudentClassObj, majorOptions]);

  // Kelompok Mata Pelajaran yang Relevan Khusus untuk Jurusan Siswa Ini
  const studentRelevantGroups = useMemo(() => {
    if (!subjectGroups || subjectGroups.length === 0) return [];
    
    const sMajor = (studentMajor || "").toLowerCase().trim();

    return subjectGroups
      .filter(g => (g.status || "Aktif") === "Aktif")
      .filter(g => {
        const gMajor = (g.major || "").toLowerCase().trim();
        const isGeneral = !gMajor || gMajor === "semua jurusan / umum" || gMajor === "umum" || gMajor === "all" || gMajor === "semua jurusan";
        if (isGeneral) return true;
        
        // Jika kelompok ini ditujukan untuk jurusan tertentu, hanya sertakan jika cocok dengan jurusan siswa!
        if (!sMajor) {
          // Bila siswa belum terdeteksi jurusannya (misal tingkat SD/SMP), kelompok umum yang tampil
          return false;
        }
        return gMajor === sMajor || 
               g.name.toLowerCase().includes(sMajor) || 
               g.code.toLowerCase().includes(sMajor);
      })
      .sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
  }, [subjectGroups, studentMajor]);

  // Calculate Subject Averages & Predicates for Current Student (Fully Synchronized with Database & Jurusan)
  const studentSubjectScores = useMemo(() => {
    if (!currentStudent) return [];

    // Filter grades for current student matching semester and academic year
    const studentGrades = grades.filter(g => {
      const matchStudent =
        g.studentId === currentStudent.id ||
        g.studentId === currentStudent.uid ||
        g.studentId === currentStudent.nis ||
        g.studentId === currentStudent.nisn ||
        g.studentId === currentStudent._firestoreId ||
        (currentStudent._allDocIds && currentStudent._allDocIds.includes(g.studentId)) ||
        (g.studentName && currentStudent.name && g.studentName.toLowerCase().trim() === currentStudent.name.toLowerCase().trim()) ||
        (g.studentName && currentStudent.fullName && g.studentName.toLowerCase().trim() === currentStudent.fullName.toLowerCase().trim());

      if (!matchStudent) return false;

      const matchSemester = !g.semester || g.semester === semester;
      const matchYear = !g.academicYear || g.academicYear === academicYear;
      return matchSemester && matchYear;
    });

    // Group by normalized subject name
    const subjectGradeMap: Record<string, { total: number; count: number; scores: number[] }> = {};

    studentGrades.forEach(g => {
      const rawSubj = g.subject || "Umum";
      const normSubj = normalizeSubjectName(rawSubj);
      if (!subjectGradeMap[normSubj]) {
        subjectGradeMap[normSubj] = { total: 0, count: 0, scores: [] };
      }
      const val = Number(g.score) || 0;
      subjectGradeMap[normSubj].total += val;
      subjectGradeMap[normSubj].count += 1;
      subjectGradeMap[normSubj].scores.push(val);
    });

    // Helper: Validasi apakah suatu mata pelajaran diperbolehkan untuk jurusan siswa saat ini
    const isSubjectAllowedForStudent = (
      subjName: string,
      targetMajor: string,
      subjectObj?: any,
      groupObj?: any
    ): boolean => {
      // 1. Mapel Umum / Nasional (PAI, PPKn, BIN, MAT Wajib, BIG, SEJ, PJOK, SNB, INF, Mulok) SELALU DIPERBOLEHKAN
      if (isCommonCurriculumSubject(subjName)) {
        return true;
      }

      const inferredMajor = getPresetMajorForSubject(subjName);
      const objMajor = subjectObj?.major ? String(subjectObj.major).toLowerCase().trim() : "";
      const grpMajor = groupObj?.major ? String(groupObj.major).toLowerCase().trim() : "";
      const sMajNorm = targetMajor.toLowerCase().trim();

      // Jika siswa di kelas umum / belum ada jurusan (SD/SMP/Umum): tolak mapel spesifik peminatan jurusan
      if (!sMajNorm || sMajNorm === "semua jurusan / umum" || sMajNorm === "umum" || sMajNorm === "all") {
        return !inferredMajor && (!objMajor || objMajor === "semua jurusan / umum" || objMajor === "umum");
      }

      // Jika mapel ini adalah peminatan jurusan LAIN (misal Fisika/IPA saat siswa adalah IPS):
      if (inferredMajor && inferredMajor.toLowerCase() !== sMajNorm && !sMajNorm.includes(inferredMajor.toLowerCase())) {
        return false;
      }

      // Jika objek mata pelajaran di DB memiliki major jurusan LAIN yang tidak cocok dengan siswa:
      if (objMajor && objMajor !== "semua jurusan / umum" && objMajor !== "umum" && objMajor !== "all" && objMajor !== sMajNorm && !sMajNorm.includes(objMajor)) {
        return false;
      }

      // Jika kelompok mapel adalah kelompok peminatan jurusan LAIN:
      if (grpMajor && grpMajor !== "semua jurusan / umum" && grpMajor !== "umum" && grpMajor !== "all" && grpMajor !== sMajNorm && !sMajNorm.includes(grpMajor)) {
        return false;
      }

      return true;
    };

    // Kumpulkan seluruh nama mata pelajaran yang SAH & RELEVAN untuk jurusan siswa saat ini:
    const allDbSubjectNames = new Set<string>();
    const sMajor = (studentMajor || "").toLowerCase().trim();

    // 1. Ambil dari master collection subjects yang sesuai untuk jurusan siswa ini
    subjects.forEach(s => {
      if (!s.name) return;
      const norm = normalizeSubjectName(s.name);
      const matchedGroup = studentRelevantGroups.find(g => 
        g.id === s.groupId || 
        (Array.isArray(g.subjectIds) && (g.subjectIds.includes(s.id) || g.subjectIds.includes(s._firestoreId) || g.subjectIds.includes(s.code)))
      );

      if (isSubjectAllowedForStudent(norm, sMajor, s, matchedGroup)) {
        allDbSubjectNames.add(norm);
      }
    });

    // 2. Ambil dari jadwal dan nilai siswa HANYA yang sesuai dengan jurusan siswa saat ini
    if (currentStudent.classId) {
      schedules.forEach(sc => {
        if (
          sc.subject &&
          (sc.classId === currentStudent.classId || sc.className === currentStudent.classId || sc.class === currentStudent.classId)
        ) {
          const norm = normalizeSubjectName(sc.subject);
          if (isSubjectAllowedForStudent(norm, sMajor)) {
            allDbSubjectNames.add(norm);
          }
        }
      });

      grades.forEach(g => {
        if (
          g.subject &&
          (g.classId === currentStudent.classId || g.className === currentStudent.classId || g.class === currentStudent.classId)
        ) {
          const norm = normalizeSubjectName(g.subject);
          if (isSubjectAllowedForStudent(norm, sMajor)) {
            allDbSubjectNames.add(norm);
          }
        }
      });
    }

    // 3. Masukkan dari nilai yang dimiliki siswa, HANYA jika cocok dengan jurusan saat ini (membuang nilai jurusan lama)
    Object.keys(subjectGradeMap).forEach(s => {
      if (isSubjectAllowedForStudent(s, sMajor)) {
        allDbSubjectNames.add(s);
      }
    });

    // 4. Pastikan mata pelajaran wajib nasional selalu tercover lengkap tanpa duplikasi
    const coreNational = [
      "Pendidikan Agama dan Budi Pekerti",
      "Pendidikan Pancasila",
      "Bahasa Indonesia",
      "Matematika",
      "Bahasa Inggris",
      "PJOK",
      "Sejarah"
    ];
    coreNational.forEach(s => allDbSubjectNames.add(s));

    // 5. Pastikan mata pelajaran peminatan yang sesuai dengan jurusan siswa saat ini tersedia:
    if (sMajor === "ipa" || sMajor === "mipa") {
      ["Biologi", "Fisika", "Kimia", "Matematika Tingkat Lanjut"].forEach(s => allDbSubjectNames.add(s));
    } else if (sMajor === "ips") {
      ["Ekonomi", "Geografi", "Sosiologi", "Sejarah Tingkat Lanjut"].forEach(s => allDbSubjectNames.add(s));
    } else if (sMajor === "bahasa" || sMajor === "bhs") {
      ["Bahasa dan Sastra Indonesia", "Bahasa dan Sastra Inggris", "Bahasa Asing Pilihan", "Antropologi"].forEach(s => allDbSubjectNames.add(s));
    } else if (sMajor === "rpl") {
      ["Dasar-Dasar Kejuruan RPL", "Pemrograman Berorientasi Objek", "Pemrograman Web & Bergerak", "Basis Data", "Produk Kreatif & Kewirausahaan"].forEach(s => allDbSubjectNames.add(s));
    } else if (sMajor === "tkj") {
      ["Dasar-Dasar Kejuruan TKJ", "Teknologi Jaringan Berbasis Luas (WAN)", "Administrasi Server Jaringan"].forEach(s => allDbSubjectNames.add(s));
    }

    const formatCategory = (rawCat?: string, subjName: string = "") => {
      if (rawCat) {
        const lower = rawCat.toLowerCase();
        if (lower === "wajib" || lower.includes("kelompok a") || lower.includes("nasional") || lower.includes("mata pelajaran umum")) return "Kelompok Mata Pelajaran Umum";
        if (lower.includes("kelompok b") || lower.includes("terapan") || lower.includes("seni") || lower.includes("jasmani") || lower.includes("kewilayahan")) return "Kelompok B (Umum / Kewilayahan)";
        if (lower === "peminatan" || lower.includes("kelompok c")) return "Kelompok C (Peminatan)";
        if (lower.includes("muatan lokal")) return "Muatan Lokal & Pilihan";
        return rawCat;
      }
      const preset = STANDARD_SUBJECT_PRESETS.find(p => p.name.toLowerCase() === subjName.toLowerCase());
      if (preset) return preset.category;
      if (isCommonCurriculumSubject(subjName)) {
        return "Kelompok Mata Pelajaran Umum";
      }
      return "Kelompok C (Peminatan)";
    };

    const getCategoryPriority = (cat: string) => {
      if (cat.includes("Kelompok Mata Pelajaran Umum") || cat.includes("Kelompok A") || cat.includes("Nasional")) return 1;
      if (cat.includes("Kelompok MIPA")) return 2;
      if (cat.includes("Kelompok IPS")) return 3;
      if (cat.includes("Kelompok Bahasa")) return 4;
      if (cat.includes("Kelompok B") || cat.includes("Kewilayahan")) return 5;
      if (cat.includes("C1")) return 6;
      if (cat.includes("C2") || cat.includes("Dasar Program Keahlian")) return 7;
      if (cat.includes("C3") || cat.includes("Konsentrasi Keahlian")) return 8;
      if (cat.includes("Kelompok C") || cat.includes("Peminatan")) return 9;
      if (cat.includes("Muatan Lokal")) return 10;
      return 11;
    };

    // Bangun daftar mata pelajaran tanpa duplikasi
    const subjectList = Array.from(allDbSubjectNames).map(subjName => {
      const data = subjectGradeMap[subjName];
      const avg = data && data.count > 0 ? Math.round(data.total / data.count) : 0;

      let predicate = "-";
      if (data && data.count > 0) {
        if (avg >= 90) predicate = "A";
        else if (avg >= 80) predicate = "B";
        else if (avg >= 70) predicate = "C";
        else predicate = "D";
      }

      // Cari masterSubj di koleksi subjects yang paling cocok untuk siswa jurusan ini:
      const candidateSubjects = subjects.filter(
        s => normalizeSubjectName(s.name).toLowerCase() === subjName.toLowerCase() ||
          (s.code && s.code.toLowerCase() === subjName.toLowerCase())
      );

      // Prioritas 1: Yang jurusannya cocok persis dengan jurusan siswa
      // Prioritas 2: Yang terdaftar di kelompok relevan siswa
      // Prioritas 3: Yang umum (Semua Jurusan / Umum atau kosong)
      // Prioritas 4: Jangan gunakan yang jurusannya jurusan LAIN
      const masterSubj = candidateSubjects.find(s => {
        const sm = (s.major || "").toLowerCase().trim();
        return sm && sMajor && (sm === sMajor || sMajor.includes(sm));
      }) || candidateSubjects.find(s => {
        return studentRelevantGroups.some(g => g.id === s.groupId || (Array.isArray(g.subjectIds) && g.subjectIds.includes(s.id)));
      }) || candidateSubjects.find(s => {
        const sm = (s.major || "").toLowerCase().trim();
        return !sm || sm === "semua jurusan / umum" || sm === "umum" || sm === "all";
      }) || candidateSubjects[0];

      const presetSubj = STANDARD_SUBJECT_PRESETS.find(p => p.name.toLowerCase() === subjName.toLowerCase());

      // Apakah ini mata pelajaran umum kurikulum nasional?
      const isCommon = isCommonCurriculumSubject(subjName);

      // Cari kelompok yang paling relevan untuk mapel ini dari database subject_groups
      let matchedGroup = null;
      if (isCommon) {
        // Untuk mapel umum, carikan kelompok Wajib / Umum
        matchedGroup = studentRelevantGroups.find(g => {
          const gCat = (g.category || "").toLowerCase();
          const gName = g.name.toLowerCase();
          const gMajor = (g.major || "").toLowerCase();
          const isGeneral = !gMajor || gMajor.includes("semua") || gMajor.includes("umum");
          return isGeneral && (
            gName.includes("kelompok mata pelajaran umum") ||
            gName.includes("umum") ||
            gName.includes("wajib") ||
            gName.includes("muatan nasional") ||
            gCat === "wajib" ||
            gCat.includes("umum") ||
            (Array.isArray(g.subjectIds) && (
              (!!masterSubj?.id && g.subjectIds.includes(masterSubj.id)) || 
              (!!masterSubj?._firestoreId && g.subjectIds.includes(masterSubj._firestoreId)) || 
              (!!masterSubj?.code && g.subjectIds.includes(masterSubj.code)) ||
              (!!presetSubj?.code && g.subjectIds.includes(presetSubj.code))
            ))
          );
        }) || null;
      } else {
        // Untuk mapel peminatan, carikan kelompok peminatan yang cocok dengan jurusan siswa
        matchedGroup = studentRelevantGroups.find(g => {
          const gMajor = (g.major || "").toLowerCase().trim();
          const gName = g.name.toLowerCase();
          const gCode = g.code.toLowerCase();
          return (
            (gMajor && sMajor && (gMajor === sMajor || sMajor.includes(gMajor))) ||
            (sMajor && (gName.includes(sMajor) || gCode.includes(sMajor))) ||
            g.id === masterSubj?.groupId ||
            (Array.isArray(g.subjectIds) && (
              (!!masterSubj?.id && g.subjectIds.includes(masterSubj.id)) || 
              (!!masterSubj?._firestoreId && g.subjectIds.includes(masterSubj._firestoreId)) || 
              (!!masterSubj?.code && g.subjectIds.includes(masterSubj.code)) ||
              (!!presetSubj?.code && g.subjectIds.includes(presetSubj.code))
            ))
          );
        }) || null;
      }

      // Resolusi Nama Kategori & Kelompok yang Bersih:
      let resolvedCategory = "";
      let resolvedGroupCode = "";
      let resolvedGroupOrder = 99;
      let resolvedGroupMajor = "Semua Jurusan / Umum";

      if (matchedGroup) {
        resolvedCategory = matchedGroup.name;
        resolvedGroupCode = matchedGroup.code || (isCommon ? "A" : (sMajor ? `C-${sMajor.toUpperCase()}` : "C"));
        resolvedGroupOrder = Number(matchedGroup.order) || (isCommon ? 1 : 2);
        resolvedGroupMajor = isCommon ? "Semua Jurusan / Umum" : (matchedGroup.major || studentMajor || "Peminatan");
      } else if (presetSubj) {
        resolvedCategory = presetSubj.category;
        if (presetSubj.category === "Kelompok Mata Pelajaran Umum") {
          resolvedGroupCode = "A";
          resolvedGroupOrder = 1;
          resolvedGroupMajor = "Semua Jurusan / Umum";
        } else if (presetSubj.category === "Kelompok MIPA") {
          resolvedGroupCode = "C-MIPA";
          resolvedGroupOrder = 2;
          resolvedGroupMajor = "IPA";
        } else if (presetSubj.category === "Kelompok IPS") {
          resolvedGroupCode = "C-IPS";
          resolvedGroupOrder = 3;
          resolvedGroupMajor = "IPS";
        } else if (presetSubj.category === "Kelompok Bahasa") {
          resolvedGroupCode = "C-BHS";
          resolvedGroupOrder = 4;
          resolvedGroupMajor = "Bahasa";
        } else {
          resolvedGroupCode = sMajor ? `C-${sMajor.toUpperCase()}` : "C";
          resolvedGroupOrder = getCategoryPriority(presetSubj.category);
          resolvedGroupMajor = presetSubj.major || studentMajor || "Peminatan";
        }
      } else if (isCommon) {
        const isKelompokB = subjName.includes("Seni") || subjName.includes("Jasmani") || subjName.includes("Informatika");
        resolvedCategory = isKelompokB ? "Kelompok B (Umum / Kewilayahan)" : "Kelompok Mata Pelajaran Umum";
        resolvedGroupCode = isKelompokB ? "B" : "A";
        resolvedGroupOrder = isKelompokB ? 2 : 1;
        resolvedGroupMajor = "Semua Jurusan / Umum";
      } else {
        resolvedCategory = formatCategory(masterSubj?.category, subjName);
        resolvedGroupCode = sMajor ? `C-${sMajor.toUpperCase()}` : "C";
        resolvedGroupOrder = getCategoryPriority(resolvedCategory);
        resolvedGroupMajor = studentMajor || "Peminatan";
      }

      const resolvedGroupId = matchedGroup ? matchedGroup.id : `group_${resolvedCategory.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

      // Khusus mapel umum: JANGAN PERNAH membawa groupMajor dari jurusan IPA/IPS!
      const finalItemMajor = isCommon 
        ? "Semua Jurusan / Umum" 
        : (matchedGroup?.major || masterSubj?.major || studentMajor || "Semua Jurusan / Umum");

      const kkm = masterSubj?.kkm || presetSubj?.kkm || 75;
      const isPassed = data && data.count > 0 ? avg >= kkm : false;

      // Auto generated competency description if custom note not specified
      let autoDesc = "";
      if (data && data.count > 0) {
        if (avg >= 90) {
          autoDesc = `Menunjukkan penguasaan materi yang sangat baik dalam memahami dan menerapkan konsep ${subjName} secara mandiri.`;
        } else if (avg >= 80) {
          autoDesc = `Menunjukkan penguasaan materi yang baik dalam memahami konsep dasar ${subjName} dan mampu menyelesaikan tugas dengan terstruktur.`;
        } else if (avg >= 70) {
          autoDesc = `Cukup memahami konsep dasar ${subjName}, perlu sedikit meningkatkan latihan soal dan ketelitian.`;
        } else {
          autoDesc = `Memerlukan bimbingan tambahan dan latihan intensif untuk memperkuat pemahaman konsep dasar ${subjName}.`;
        }
      } else {
        autoDesc = `Belum ada entri nilai untuk mata pelajaran ${subjName}.`;
      }

      const customDesc = subjectNotes[subjName] || "";

      return {
        name: subjName,
        code: masterSubj?.code || presetSubj?.code || "",
        groupId: resolvedGroupId,
        groupCode: resolvedGroupCode,
        groupName: resolvedCategory,
        groupOrder: resolvedGroupOrder,
        groupCategory: isCommon ? "Wajib" : (matchedGroup?.category || masterSubj?.category || "Peminatan"),
        groupMajor: resolvedGroupMajor,
        itemMajor: finalItemMajor,
        category: resolvedCategory,
        categoryOrder: resolvedGroupOrder,
        score: data && data.count > 0 ? avg : 0,
        displayScore: data && data.count > 0 ? avg : "-",
        predicate,
        kkm,
        isPassed,
        hasData: Boolean(data && data.count > 0),
        description: customDesc || autoDesc,
        inMasterDb: Boolean(masterSubj)
      };
    });

    // Sort by Group Order, then alphabetically by subject name
    return subjectList.sort((a, b) => {
      if (a.categoryOrder !== b.categoryOrder) {
        return a.categoryOrder - b.categoryOrder;
      }
      return a.name.localeCompare(b.name);
    });
  }, [currentStudent, grades, subjects, schedules, subjectNotes, semester, academicYear, studentMajor, studentRelevantGroups]);

  // Kelompokkan Nilai Mata Pelajaran Sesuai Struktur Kelompok Kurikulum Resmi
  const groupedSubjectScores = useMemo(() => {
    if (studentSubjectScores.length === 0) return [];

    const map = new Map<string, {
      groupId: string;
      groupCode: string;
      groupName: string;
      groupCategory: string;
      groupMajor: string;
      groupOrder: number;
      subjects: typeof studentSubjectScores;
    }>();

    studentSubjectScores.forEach(sub => {
      const gid = sub.groupId || sub.groupName;
      if (!map.has(gid)) {
        map.set(gid, {
          groupId: gid,
          groupCode: sub.groupCode || "",
          groupName: sub.groupName,
          groupCategory: sub.groupCategory || "Wajib",
          groupMajor: sub.groupMajor || "Semua Jurusan / Umum",
          groupOrder: sub.groupOrder || 99,
          subjects: []
        });
      }
      map.get(gid)!.subjects.push(sub);
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.groupOrder !== b.groupOrder) return a.groupOrder - b.groupOrder;
      return a.groupName.localeCompare(b.groupName);
    });
  }, [studentSubjectScores]);

  // Tracking pergantian jurusan siswa secara dinamis (misal IPA -> IPS)
  const prevStudentMajorRef = React.useRef<string>("");
  useEffect(() => {
    if (studentMajor && prevStudentMajorRef.current && prevStudentMajorRef.current !== studentMajor) {
      // Jurusan siswa baru saja berganti! Bersihkan catatan mapel lama yang tidak relevan
      setSubjectNotes(prev => {
        const cleaned: Record<string, string> = {};
        Object.entries(prev).forEach(([key, val]) => {
          const inferred = getPresetMajorForSubject(key);
          if (!inferred || inferred.toLowerCase() === studentMajor.toLowerCase()) {
            cleaned[key] = val;
          }
        });
        return cleaned;
      });
      triggerAlert(
        "edit",
        `Terdeteksi perubahan jurusan siswa ke "${studentMajor}". Komponen A. Capaian Hasil Belajar telah otomatis disesuaikan dengan kurikulum jurusan ${studentMajor}.`,
        "Pembaruan Jurusan Siswa"
      );
    }
    prevStudentMajorRef.current = studentMajor;
  }, [studentMajor, currentStudent]);

  // Check subjects in Section A that do not yet exist as documents in Firestore 'subjects' collection
  const missingSubjects = useMemo(() => {
    return studentSubjectScores.filter(s => !s.inMasterDb);
  }, [studentSubjectScores]);

  // State sinkronisasi ulang jurusan
  const [isResyncingMajor, setIsResyncingMajor] = useState(false);

  // Fungsi Sinkronisasi Ulang Jurusan & Mapel (Membersihkan mapel jurusan lama & menyesuaikan ke jurusan terbaru)
  const handleResyncStudentMajorAndSubjects = async () => {
    if (!currentStudent || !studentMajor || isReadOnly) return;
    if (!canMutateGrades) {
      triggerAlert("error", "Akun Anda berstatus Monitoring Executive (Hanya Lihat). Anda tidak memiliki izin untuk mengubah mata pelajaran atau data rapor.", "Akses Terbatas");
      return;
    }
    setIsResyncingMajor(true);

    try {
      // 1. Bersihkan subjectNotes lama yang berasal dari mapel jurusan lain
      const cleanedNotes: Record<string, string> = {};
      const validSubjectNames = new Set(studentSubjectScores.map(s => s.name));
      
      Object.entries(subjectNotes).forEach(([key, val]) => {
        if (validSubjectNames.has(key)) {
          cleanedNotes[key] = val;
        }
      });
      setSubjectNotes(cleanedNotes);

      // 2. Koreksi di master database 'subjects' jika ada mapel umum yang salah dilabeli jurusan tertentu
      const subjectsToCorrect = subjects.filter(s => {
        if (!s.name) return false;
        const norm = normalizeSubjectName(s.name);
        const isCommon = isCommonCurriculumSubject(norm);
        return isCommon && s.major && s.major !== "Semua Jurusan / Umum";
      });

      for (const subj of subjectsToCorrect) {
        if (subj._firestoreId || subj.id) {
          const docId = subj._firestoreId || subj.id;
          await setDoc(doc(db, "subjects", docId), {
            major: "Semua Jurusan / Umum",
            groupId: "",
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
      }

      // 3. Tambahkan mata pelajaran peminatan jurusan siswa yang belum ada di database
      for (const subj of missingSubjects) {
        const isCommon = isCommonCurriculumSubject(subj.name);
        const preset = STANDARD_SUBJECT_PRESETS.find(p => p.name.toLowerCase() === subj.name.toLowerCase());
        
        await addDoc(collection(db, "subjects"), {
          code: subj.code || preset?.code || subj.name.slice(0, 3).toUpperCase(),
          name: subj.name,
          category: isCommon ? "Wajib" : "Peminatan",
          major: isCommon ? "Semua Jurusan / Umum" : (studentMajor || "Semua Jurusan / Umum"),
          groupId: isCommon ? "" : (subj.groupId || ""),
          creditHours: "3 JP",
          level: "Semua Tingkat",
          kkm: subj.kkm || 75,
          icon: isCommon ? "📚" : "🔬",
          description: `Mata pelajaran ${subj.name} terintegrasi kurikulum jurusan ${studentMajor}`,
          status: "Aktif",
          createdAt: serverTimestamp()
        });
      }

      // 4. Update data rapot digital siswa di Firestore jika reportDocKey ada
      if (reportDocKey) {
        const studentNisn = getStudentNisn(currentStudent);
        await setDoc(doc(db, "reportCards", reportDocKey), {
          studentId: currentStudent.id,
          studentUid: currentStudent.uid || currentStudent._firestoreId || "",
          studentNisn,
          studentName: currentStudent.name,
          classId: currentStudent.classId || "",
          major: studentMajor,
          semester,
          academicYear,
          subjectNotes: cleanedNotes,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      triggerAlert(
        "success", 
        `Data Komponen A berhasil disinkronkan ulang dengan jurusan ${studentMajor}! Mata pelajaran dari jurusan lain telah disesuaikan dan dibersihkan dari duplikasi.`, 
        "Sinkronisasi Jurusan Sukses"
      );
    } catch (err: any) {
      console.error("Error resyncing student major and subjects:", err);
      triggerAlert("error", `Gagal menyinkronkan ulang: ${err?.message || "Terjadi kesalahan"}`, "Gagal Sinkronisasi");
    } finally {
      setIsResyncingMajor(false);
    }
  };

  // One-click sync to create missing subjects in Firestore 'subjects' collection
  const handleSyncMissingSubjectsToMaster = async () => {
    if (missingSubjects.length === 0 || isReadOnly) return;
    if (!canMutateGrades) {
      triggerAlert("error", "Akun Anda berstatus Monitoring Executive (Hanya Lihat). Anda tidak memiliki izin untuk menambah mata pelajaran ke database.", "Akses Terbatas");
      return;
    }
    setIsSyncingSubjects(true);
    try {
      for (const subj of missingSubjects) {
        const isCommon = isCommonCurriculumSubject(subj.name);
        const preset = STANDARD_SUBJECT_PRESETS.find(p => p.name.toLowerCase() === subj.name.toLowerCase());
        await addDoc(collection(db, "subjects"), {
          code: subj.code || preset?.code || subj.name.slice(0, 3).toUpperCase(),
          name: subj.name,
          category: isCommon ? "Wajib" : (subj.category.includes("Wajib") ? "Wajib" : "Peminatan"),
          major: isCommon ? "Semua Jurusan / Umum" : (studentMajor || "Semua Jurusan / Umum"),
          groupId: isCommon ? "" : (subj.groupId || ""),
          creditHours: "3 JP",
          level: "Semua Tingkat",
          kkm: subj.kkm || 75,
          icon: isCommon ? "📚" : "🔬",
          description: `Mata pelajaran ${subj.name} terintegrasi kurikulum`,
          status: "Aktif",
          createdAt: serverTimestamp()
        });
      }
      triggerAlert("edit", `Berhasil menyelaraskan ${missingSubjects.length} mata pelajaran ke master database subjects!`, "Database Selaras");
    } catch (err: any) {
      console.error("Error syncing subjects to master:", err);
      triggerAlert("error", "Gagal menyelaraskan mata pelajaran ke database", "Gagal");
    } finally {
      setIsSyncingSubjects(false);
    }
  };


  // Overall Average Score
  const overallAverage = useMemo(() => {
    const scoredSubjs = studentSubjectScores.filter(s => s.hasData);
    if (scoredSubjs.length === 0) return 0;
    const sum = scoredSubjs.reduce((acc, s) => acc + s.score, 0);
    return Math.round(sum / scoredSubjs.length);
  }, [studentSubjectScores]);

  // Overall Status
  const isOverallPassed = overallAverage >= 75;

  // Calculate Ranking in Class
  const studentRank = useMemo(() => {
    if (!currentStudent || !currentStudent.classId) return { rank: 1, totalInClass: 1 };

    const classStudents = students.filter(s => s.classId === currentStudent.classId || s.className === currentStudent.classId);

    const rankedList = classStudents.map(st => {
      const stGrades = grades.filter(g =>
        g.studentId === st.id ||
        g.studentId === st.uid ||
        g.studentId === st._firestoreId ||
        (g.studentName && st.name && g.studentName.toLowerCase().trim() === st.name.toLowerCase().trim())
      );
      const avg = stGrades.length > 0
        ? Math.round(stGrades.reduce((acc, g) => acc + (Number(g.score) || 0), 0) / stGrades.length)
        : 0;
      return { id: st.id, _firestoreId: st._firestoreId, uid: st.uid, avg };
    }).sort((a, b) => b.avg - a.avg);

    const rankIdx = rankedList.findIndex(r =>
      r.id === currentStudent.id ||
      (currentStudent._firestoreId && r._firestoreId === currentStudent._firestoreId) ||
      (currentStudent.uid && r.uid === currentStudent.uid)
    );
    return {
      rank: rankIdx >= 0 ? rankIdx + 1 : 1,
      totalInClass: classStudents.length
    };
  }, [currentStudent, students, grades]);

  // Total Attendance Percentage
  const attendanceRate = useMemo(() => {
    const totalAbsent = sickCount + permitCount + alphaCount;
    // Assuming 100 effective school days per semester
    const effectiveDays = 100;
    const rate = Math.max(0, Math.round(((effectiveDays - totalAbsent) / effectiveDays) * 100));
    return rate;
  }, [sickCount, permitCount, alphaCount]);

  // Sync attendance with Firestore attendance collection
  const handleSyncAttendanceFromDb = () => {
    if (isReadOnly) return;
    setSickCount(dbAttendanceStats.sick);
    setPermitCount(dbAttendanceStats.permit);
    setAlphaCount(dbAttendanceStats.alpha);
    triggerAlert("success", `Data presensi berhasil disinkronkan dari database presensi harian (${dbAttendanceStats.total} log: ${dbAttendanceStats.present} Hadir, ${dbAttendanceStats.sick} Sakit, ${dbAttendanceStats.permit} Izin, ${dbAttendanceStats.alpha} Alpa).`, "Sinkronisasi Berhasil");
  };

  // Save Complete Report Card to Firestore with Draft or Published status
  const handleSaveReportCard = async (targetStatus: "draft" | "published" = "published") => {
    if (!currentStudent || !reportDocKey || isReadOnly) return;
    if (!canMutateGrades) {
      triggerAlert("error", "Akun Anda berstatus Monitoring Executive (Hanya Lihat). Anda tidak memiliki izin untuk menyimpan perubahan rapor.", "Akses Terbatas");
      return;
    }
    setIsSaving(true);

    try {
      const studentNisn = getStudentNisn(currentStudent);
      const isPublished = targetStatus === "published";

      const subjectScoresSnapshot = studentSubjectScores.map(s => ({
        name: s.name,
        score: s.score,
        kkm: s.kkm,
        predicate: s.predicate,
        description: s.description || "",
        note: subjectNotes[s.name] || "",
        groupId: s.groupId,
        groupName: s.groupName,
        groupCode: s.groupCode,
        groupMajor: s.groupMajor
      }));

      const dataToSave: any = {
        studentId: currentStudent.id,
        studentUid: currentStudent.uid || currentStudent._firestoreId || "",
        studentNisn,
        studentName: currentStudent.name,
        classId: currentStudent.classId || "",
        semester,
        academicYear,
        overallAverage,
        rank: studentRank.rank,
        totalInClass: studentRank.totalInClass,
        teacherNotes,
        spiritualAttitude,
        spiritualDesc,
        socialAttitude,
        socialDesc,
        sickCount,
        permitCount,
        alphaCount,
        attendanceRate,
        extraCurriculars,
        promotionStatus,
        decisionDate,
        homeroomTeacherName: customHomeroomName || homeroomTeacher?.name || "",
        homeroomTeacherNip: customHomeroomNip || homeroomTeacher?.nip || "",
        subjectNotes,
        subjectScores: subjectScoresSnapshot,
        status: targetStatus,
        isPublished: isPublished,
        updatedAt: serverTimestamp()
      };

      if (isPublished) {
        dataToSave.publishedAt = serverTimestamp();
        dataToSave.publishedBy = currentUserData?.fullName || currentUserData?.name || auth.currentUser?.displayName || "Wali Kelas";
      }

      await setDoc(doc(db, "reportCards", reportDocKey), dataToSave, { merge: true });

      if (isPublished) {
        triggerAlert("success", `Rapor Digital untuk siswa ${currentStudent.name} berhasil DIPUBLIKASIKAN! Nilai sekarang resmi dapat dilihat siswa.`, "Rapor Dipublikasikan");
      } else {
        triggerAlert("edit", `Rapor Digital untuk siswa ${currentStudent.name} berhasil disimpan sebagai DRAFT. Nilai masih disembunyikan dari siswa hingga Anda mempublikasikannya.`, "Draft Tersimpan");
      }
    } catch (err: any) {
      console.error("Error saving report card:", err);
      triggerAlert("error", `Gagal menyimpan data Rapor Digital: ${err?.message || "Terjadi kesalahan"}`, "Gagal");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddExtra = (presetName?: string) => {
    if (isReadOnly) return;
    const name = presetName || "Ekstrakurikuler Baru";
    setExtraCurriculars(prev => [...prev, { name, grade: "A", desc: "Aktif dan menunjukkan perkembangan positif." }]);
  };

  const handleUpdateExtra = (index: number, field: string, value: string) => {
    if (isReadOnly) return;
    setExtraCurriculars(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveExtra = (idx: number) => {
    if (isReadOnly) return;
    setExtraCurriculars(prev => prev.filter((_, i) => i !== idx));
  };

  // Quick preset teacher notes
  const applyPresetNote = (noteText: string) => {
    if (isReadOnly) return;
    setTeacherNotes(noteText);
  };

  // Section Completion Status for Rapid Filling Overview
  const sectionStatus = useMemo(() => {
    const academicDone = studentSubjectScores.length > 0 && studentSubjectScores.every(s => s.score > 0);
    const attitudeDone = !!(spiritualDesc && spiritualDesc.trim().length > 3 && socialDesc && socialDesc.trim().length > 3);
    const attendanceDone = true; // Presensi selalu memiliki data
    const extraDone = extraCurriculars.length > 0;
    const notesDone = !!(teacherNotes && teacherNotes.trim().length > 3);

    let filledCount = 0;
    if (academicDone) filledCount++;
    if (attitudeDone) filledCount++;
    if (attendanceDone) filledCount++;
    if (extraDone) filledCount++;
    if (notesDone) filledCount++;

    const percent = Math.round((filledCount / 5) * 100);

    return {
      academicDone,
      attitudeDone,
      attendanceDone,
      extraDone,
      notesDone,
      filledCount,
      percent
    };
  }, [studentSubjectScores, spiritualDesc, socialDesc, extraCurriculars, teacherNotes]);

  // Student list pagination & instant switcher
  const currentStudentIndex = useMemo(() => {
    if (!currentStudent || !filteredStudents || filteredStudents.length === 0) return -1;
    return filteredStudents.findIndex(s =>
      (s._firestoreId && s._firestoreId === currentStudent.id) ||
      (s.uid && s.uid === currentStudent.id) ||
      (s.id && s.id === currentStudent.id) ||
      (s.nisn && s.nisn === currentStudent.id)
    );
  }, [currentStudent, filteredStudents]);

  const prevStudent = currentStudentIndex > 0 ? filteredStudents[currentStudentIndex - 1] : null;
  const nextStudent = currentStudentIndex >= 0 && currentStudentIndex < filteredStudents.length - 1 ? filteredStudents[currentStudentIndex + 1] : null;

  const handleSelectPrevStudent = () => {
    if (prevStudent) {
      setSelectedStudentId(prevStudent.id || prevStudent.uid || prevStudent._firestoreId || "");
    }
  };

  const handleSelectNextStudent = () => {
    if (nextStudent) {
      setSelectedStudentId(nextStudent.id || nextStudent.uid || nextStudent._firestoreId || "");
    }
  };

  // Instant Save and Advance to Next Student in Class
  const handleSaveAndNextStudent = async (targetStatus?: "draft" | "published") => {
    if (!currentStudent || !reportDocKey || isReadOnly) return;
    if (!canMutateGrades) {
      triggerAlert("error", "Akun Anda berstatus Monitoring Executive (Hanya Lihat). Anda tidak memiliki izin untuk menyimpan perubahan rapor.", "Akses Terbatas");
      return;
    }
    const statusToUse = targetStatus || (isReportPublished ? "published" : "draft");
    await handleSaveReportCard(statusToUse);
    if (nextStudent) {
      setSelectedStudentId(nextStudent.id || nextStudent.uid || nextStudent._firestoreId || "");
      window.scrollTo({ top: 180, behavior: "smooth" });
    } else {
      triggerAlert("success", "Semua siswa pada kelas/daftar ini telah selesai diinput dan disimpan!", "Pengisian Selesai");
    }
  };

  // 1-Click Quick Fill Default Template (Sikap Sangat Baik, Presensi Hadir Penuh, Catatan Positif)
  const handleApplyQuickDefaults = () => {
    if (isReadOnly) return;
    setSpiritualAttitude("Sangat Baik");
    setSpiritualDesc("Terbiasa berdoa sebelum/sesudah belajar, taat beribadah, dan menunjukkan toleransi serta akhlak mulia yang tinggi.");
    setSocialAttitude("Baik");
    setSocialDesc("Sangat santun dalam bertutur kata, disiplin dalam pengumpulan tugas, serta aktif dan suportif dalam kerjasama kelompok.");
    if (!teacherNotes || teacherNotes.trim().length === 0) {
      setTeacherNotes("Selamat atas pencapaian prestasi belajar yang sangat baik semester ini. Pertahankan ketekunan, integritas, dan semangat belajarmu!");
    }
    triggerAlert("edit", "Template bawaan (Sikap Sangat Baik, Presensi Penuh, Catatan Positif) berhasil diisikan. Anda dapat mengubahnya kembali jika diperlukan.", "Isi Cepat Berhasil");
  };

  // Smooth scroll navigator
  const handleSectionNavigate = (sectionKey: "all" | "academic" | "attitude" | "attendance" | "extracurricular" | "notes", elementId?: string) => {
    if (reportEntryMode === "tabbed") {
      setActiveSectionFilter(sectionKey);
    } else {
      setActiveSectionFilter("all");
      if (elementId) {
        const el = document.getElementById(elementId);
        if (el) {
          const yOffset = -85;
          const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: "smooth" });
        }
      }
    }
  };

  if (isAuthLoading || !isRoleReady || loading) {
    return <PageContentSkeleton />;
  }

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 max-w-full mx-auto w-full flex-1 flex flex-col min-h-screen bg-gray-50/50 animate-in fade-in duration-300 relative">

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
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4 bg-white p-5 md:p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
              {isGuru ? "Rapor Digital Kelas Binaan" : "Rapor Digital Siswa"}
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-[#531FFF]/10 text-[#531FFF] border border-[#531FFF]/20">
              Kurikulum Merdeka
            </span>
            {isGuru && (
              <span className={cn(
                "px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 shadow-2xs",
                isTeacherWaliKelas
                  ? "bg-purple-100/80 text-[#531FFF] border-[#531FFF]/30"
                  : "bg-amber-50 text-amber-700 border-amber-300"
              )}>
                <GraduationCap className="w-4 h-4" />
                {isTeacherWaliKelas
                  ? `Wali Kelas: ${teacherHomeroomClasses.join(", ")}`
                  : "Guru (Belum Ditugaskan Sebagai Wali Kelas)"}
              </span>
            )}
            {previewAsGuru && (
              <span className="px-2.5 py-1 text-xs font-bold bg-amber-100 text-amber-900 rounded-full border border-amber-200">
                Mode Pratinjau Guru
              </span>
            )}
            {isStudentRole && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {isParent ? "Mode Orang Tua (Read-Only)" : "Mode Siswa (Read-Only)"}
              </span>
            )}
          </div>
          <p className="text-gray-500 text-xs md:text-sm font-medium mt-1.5 max-w-3xl leading-relaxed">
            {isGuru
              ? isTeacherWaliKelas
                ? `Pengelolaan evaluasi capaian kompetensi, catatan perkembangan, dan penerbitan rapor resmi kelas ${teacherHomeroomClasses.join(", ")}.`
                : "Anda login sebagai Guru. Penugasan kelas Wali Kelas belum terhubung dengan akun Anda."
              : "Laporan hasil belajar komprehensif, evaluasi capaian kompetensi akademik, presensi, dan grafik performa siswa terpadu."}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto shrink-0">
          {/* Admin Switch to Preview Mode Guru */}
          {!isGuru && !isStudentRole && (
            <button
              type="button"
              onClick={() => setPreviewAsGuru(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-purple-50 text-[#531FFF] border border-purple-200 hover:bg-purple-100 active:scale-[0.98] transition-all text-xs font-bold rounded-xl shadow-2xs cursor-pointer"
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
                setSelectedClass("All");
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl hover:bg-rose-100 active:scale-[0.98] transition-all text-xs font-bold shadow-2xs cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Keluar Preview Guru</span>
            </button>
          )}

          {/* Tab Nav Buttons (Segmented Control) */}
          <div className="flex items-center bg-gray-100/80 p-1 rounded-xl border border-gray-200 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab("report")}
              className={cn(
                "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer",
                activeTab === "report"
                  ? "bg-white text-gray-900 shadow-xs"
                  : "text-gray-500 hover:text-gray-900"
              )}
            >
              <FileText className="w-4 h-4 text-[#531FFF]" />
              <span>Lembar Rapor</span>
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={cn(
                "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer",
                activeTab === "analytics"
                  ? "bg-white text-[#531FFF] shadow-xs"
                  : "text-gray-500 hover:text-gray-900"
              )}
            >
              <BarChart3 className="w-4 h-4 text-[#531FFF]" />
              <span>Grafik Performa</span>
            </button>
          </div>

          <button
            onClick={() => setIsPrintModalOpen(true)}
            disabled={!currentStudent}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-[#1A1A2E] hover:bg-black text-white px-4 py-2.5 rounded-xl text-xs font-extrabold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Rapor (PDF)</span>
          </button>
        </div>
      </div>

      {/* Banner notification if Guru is not assigned as Wali Kelas */}
      {isGuru && !isTeacherWaliKelas && (
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 mb-6 flex items-start gap-3.5 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-amber-900">Akses Terbatas: Belum Ditugaskan Sebagai Wali Kelas</h4>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              Pada menu Rapor Digital untuk role Guru, sistem secara otomatis hanya menampilkan dan mengelola data siswa dari kelas yang menjadi tanggung jawab Anda sebagai <strong>Wali Kelas</strong>. Saat ini akun Anda belum terdaftar sebagai wali kelas dari kelas manapun. Silakan hubungi Administrator Sekolah untuk mengatur penugasan Wali Kelas pada modul Manajemen Kelas.
            </p>
          </div>
        </div>
      )}

      {/* Filter Bar (Modern Toolbar) */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-4 mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Class Filter */}
          {!isStudentRole && (
            <div className="flex items-center gap-2 bg-gray-50/80 border border-gray-200/80 rounded-xl px-3 py-1.5">
              <School className="w-4 h-4 text-[#531FFF] shrink-0" />
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                {isGuru ? "Kelas Binaan:" : "Kelas:"}
              </span>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-transparent text-gray-800 text-xs font-black focus:outline-none cursor-pointer"
              >
                {!isGuru && (
                  <option value="All">Semua Kelas ({classes.length})</option>
                )}
                {selectableClasses.map(c => (
                  <option key={c.id || c.name} value={c.name}>
                    Kelas {c.name} {isGuru ? "(Wali Kelas Anda)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Semester Selector */}
          <div className="flex items-center gap-2 bg-gray-50/80 border border-gray-200/80 rounded-xl px-3 py-1.5">
            <Calendar className="w-4 h-4 text-[#531FFF] shrink-0" />
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Semester:</span>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="bg-transparent text-gray-800 text-xs font-black focus:outline-none cursor-pointer"
            >
              <option value="Ganjil">Semester Ganjil</option>
              <option value="Genap">Semester Genap</option>
            </select>
          </div>

          {/* Academic Year Selector */}
          <div className="flex items-center gap-2 bg-gray-50/80 border border-gray-200/80 rounded-xl px-3 py-1.5">
            <Clock className="w-4 h-4 text-[#531FFF] shrink-0" />
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Tahun:</span>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="bg-transparent text-gray-800 text-xs font-black focus:outline-none cursor-pointer"
            >
              <option value="2025/2026">2025/2026</option>
              <option value="2024/2025">2024/2025</option>
            </select>
          </div>
        </div>

        {/* Student Search */}
        {!isStudentRole && (
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama atau NISN siswa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs font-semibold bg-gray-50/80 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
            />
          </div>
        )}
      </div>

      {(loading || studentsLoading) ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-16 flex flex-col items-center justify-center text-gray-500 flex-1 min-h-[420px]">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 text-[#531FFF] flex items-center justify-center mb-4 shadow-sm animate-pulse">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>
          <h4 className="font-extrabold text-gray-800 text-base">Memuat Data Rapor Digital</h4>
          <p className="text-xs text-gray-400 mt-1">Menyelaraskan struktur kurikulum, nilai akademik, dan profil siswa...</p>
        </div>
      ) : (
        <div className={cn(
          "grid grid-cols-1 gap-5 flex-1 w-full",
          isStudentRole || isSidebarCollapsed ? "grid-cols-1" : "lg:grid-cols-12"
        )}>

          {/* LEFT SIDEBAR: Student List Directory - Hidden for Student Role or Collapsed */}
          {!isStudentRole && !isSidebarCollapsed && (
            <div className="lg:col-span-3 xl:col-span-3 bg-white rounded-2xl border border-gray-200/80 shadow-xs flex flex-col overflow-hidden h-fit max-h-[860px] sticky top-4 transition-all">
              <div className="p-3.5 border-b border-gray-100 bg-gradient-to-r from-gray-50/90 to-purple-50/20 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#531FFF]" />
                    <h3 className="font-black text-xs text-gray-900 uppercase tracking-wider">
                      Daftar Siswa
                    </h3>
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                    {selectedClass === "All" ? "Semua Kelas Terdaftar" : `Kelas ${selectedClass}`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#531FFF]/10 text-[#531FFF] border border-[#531FFF]/20">
                    {filteredStudents.length} Siswa
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsSidebarCollapsed(true)}
                    className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                    title="Sembunyikan panel siswa untuk memperlebar area rapor ke kiri"
                  >
                    <PanelLeftClose className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-2 space-y-1.5 overflow-y-auto custom-scrollbar flex-1 max-h-[720px]">
                {filteredStudents.map(student => {
                  const isSelected = currentStudent && (
                    currentStudent.id === student.id ||
                    currentStudent._firestoreId === student._firestoreId ||
                    currentStudent.uid === student.uid
                  );

                  const stGrades = grades.filter(g =>
                    g.studentId === student.id ||
                    g.studentId === student.uid ||
                    g.studentId === student._firestoreId ||
                    (g.studentName && student.name && g.studentName.toLowerCase().trim() === student.name.toLowerCase().trim())
                  );
                  const avg = stGrades.length > 0
                    ? Math.round(stGrades.reduce((acc, g) => acc + (Number(g.score) || 0), 0) / stGrades.length)
                    : 0;

                  const studentNisn = getStudentNisn(student);
                  const candidateKeys = [
                    `${student._firestoreId || student.id}_${semester}_${sanitizedAcademicYear}`,
                    studentNisn !== "-" ? `${studentNisn}_${semester}_${sanitizedAcademicYear}` : null,
                    student.uid ? `${student.uid}_${semester}_${sanitizedAcademicYear}` : null,
                  ].filter(Boolean) as string[];

                  let studentRptDoc: any = null;
                  for (const k of candidateKeys) {
                    if (reportCardsData[k]) {
                      studentRptDoc = reportCardsData[k];
                      break;
                    }
                  }

                  const isPublishedStudent = Boolean(studentRptDoc?.isPublished || studentRptDoc?.status === "published");
                  const isDraftStudent = Boolean(studentRptDoc?.status === "draft" || (!isPublishedStudent && studentRptDoc));

                  return (
                    <button
                      key={student._firestoreId || student.uid || student.id}
                      onClick={() => setSelectedStudentId(student._firestoreId || student.uid || student.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-xl transition-all flex items-center justify-between gap-3 group border cursor-pointer",
                        isSelected
                          ? "bg-gradient-to-r from-[#531FFF] to-[#6730FF] text-white border-[#531FFF] shadow-md shadow-[#531FFF]/25"
                          : "bg-white border-transparent hover:bg-purple-50/40 hover:border-purple-200/60 text-gray-800"
                      )}
                    >
                      <div className="flex items-center gap-3 truncate min-w-0">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border transition-all",
                          isSelected
                            ? "bg-white/20 border-white/30 text-white shadow-2xs"
                            : "bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-100 text-[#531FFF]"
                        )}>
                          {student.name ? student.name.charAt(0).toUpperCase() : "S"}
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-extrabold text-xs truncate leading-tight">
                              {student.name}
                            </h4>
                            {isPublishedStudent ? (
                              <span title="Rapor telah dipublikasikan" className="inline-flex items-center">
                                <CheckCircle className={cn("w-3 h-3 shrink-0", isSelected ? "text-emerald-300" : "text-emerald-500")} />
                              </span>
                            ) : isDraftStudent ? (
                              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", isSelected ? "bg-amber-300" : "bg-amber-500")} title="Rapor status draft" />
                            ) : null}
                          </div>
                          <p className={cn("text-[11px] font-medium mt-0.5 truncate", isSelected ? "text-white/80" : "text-gray-400")}>
                            NISN: {studentNisn} · {student.classId || student.className || "Kelas -"}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex items-center gap-1.5">
                        <span className={cn(
                          "inline-block px-2 py-0.5 rounded-md text-[9px] font-black tracking-tight border",
                          isSelected
                            ? "bg-white/20 text-white border-white/30"
                            : isPublishedStudent
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : isDraftStudent
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-gray-100 text-gray-400 border-gray-200"
                        )}>
                          {isPublishedStudent ? "✓ Terbit" : isDraftStudent ? "Draft" : avg > 0 ? `${avg}` : "Kosong"}
                        </span>
                        {isSelected && (
                          <ChevronRight className="w-4 h-4 text-white/80 shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}

                {filteredStudents.length === 0 && (
                  <div className="p-8 text-center text-gray-400 text-xs font-medium">
                    {isGuru && teacherHomeroomClasses.length === 0
                      ? "Tidak ada kelas binaan yang ditugaskan kepada Anda."
                      : "Siswa tidak ditemukan."}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* RIGHT CONTENT AREA: Report Cards or Analytics */}
          <div className={cn(
            "flex flex-col gap-6 min-w-0 w-full",
            isStudentRole || isSidebarCollapsed ? "lg:col-span-12" : "lg:col-span-9 xl:col-span-9"
          )}>
            {/* Banner when sidebar is collapsed to easily restore */}
            {!isStudentRole && isSidebarCollapsed && (
              <div className="bg-gradient-to-r from-purple-50/90 via-indigo-50/50 to-white border border-purple-200/80 rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center shrink-0">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-gray-900 block">Tampilan Rapor Diperlebar Penuh (Layar Maksimal)</span>
                    <span className="text-[11px] text-gray-500 font-medium">Panel siswa disembunyikan agar tabel nilai dan komponen rapor tidak melebihi layar.</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(false)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#531FFF] hover:bg-[#4314cc] text-white rounded-xl text-xs font-black shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  <PanelLeftOpen className="w-4 h-4" />
                  <span>Buka Panel Siswa ({filteredStudents.length})</span>
                </button>
              </div>
            )}
            {isStudentRole && !isReportPublished ? (
              /* EMPTY STATE UNTUK ROLE SISWA SAAT RAPOR BELUM DISIMPAN / BELUM DIPUBLIKASIKAN */
              <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm p-8 sm:p-14 text-center flex flex-col items-center justify-center gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#531FFF]/10 via-[#531FFF]/3 to-transparent rounded-bl-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-amber-500/5 to-transparent rounded-tr-full pointer-events-none" />

                {/* Animated Badge Icon */}
                <div className="relative">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-purple-50 via-[#531FFF]/10 to-indigo-50 border border-[#531FFF]/25 flex items-center justify-center shadow-lg shadow-[#531FFF]/15 text-[#531FFF]">
                    <Clock className="w-10 h-10 sm:w-12 sm:h-12 animate-pulse text-[#531FFF]" />
                  </div>
                  <span className="absolute -bottom-1 -right-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-sm border-2 border-white">
                    {isReportDraft ? "Draft" : "Belum Terbit"}
                  </span>
                </div>

                <div className="max-w-lg space-y-2 relative z-10">
                  <span className="px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                    Rapor Digital Belum Dipublikasikan
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight pt-1">
                    Nilai Sedang Dalam Tahap Rekapitulasi
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                    Nilai ulangan, ujian harian, capaian kompetensi akademik, evaluasi sikap, dan presensi untuk <strong className="text-gray-800">Semester {semester} Tahun Ajaran {academicYear}</strong> masih dalam proses penyusunan dan belum difinalisasi oleh pihak sekolah.
                  </p>
                </div>

                {/* Info Siswa & Kelas */}
                <div className="bg-gray-50/90 p-4 sm:p-5 rounded-2xl border border-gray-200/80 max-w-md w-full grid grid-cols-2 gap-3 text-left relative z-10 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Siswa</span>
                    <span className="font-black text-gray-800 truncate block">{currentStudent?.name || "Siswa"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">NISN</span>
                    <span className="font-mono font-bold text-gray-700 block">{currentStudent ? getStudentNisn(currentStudent) : "-"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Kelas & Jurusan</span>
                    <span className="font-bold text-gray-800 block truncate">
                      {currentStudent?.classId || currentStudent?.className || "-"} {studentMajor ? `• ${studentMajor}` : ""}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Wali Kelas</span>
                    <span className="font-bold text-gray-800 block truncate">{customHomeroomName || homeroomTeacher?.name || "Dewan Guru"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 bg-purple-50/60 px-4 py-2 rounded-xl border border-purple-100 relative z-10">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Rapor digital resmi akan otomatis ditampilkan di sini setelah Wali Kelas menyimpan dan mempublikasikannya.</span>
                </div>
              </div>
            ) : currentStudent ? (
              <>
                {/* Student Profile Hero Banner */}
                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#531FFF]/10 via-[#531FFF]/5 to-transparent rounded-bl-full pointer-events-none" />

                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-16 h-16 md:w-18 md:h-18 rounded-2xl bg-gradient-to-br from-[#531FFF] via-[#6C3BFF] to-indigo-700 text-white flex items-center justify-center font-black text-2xl md:text-3xl shadow-lg shadow-[#531FFF]/25 shrink-0 border border-white/20">
                        {currentStudent.name ? currentStudent.name.charAt(0).toUpperCase() : "S"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight truncate">
                            {currentStudent.name}
                          </h2>
                          <span className={cn(
                            "px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide border shadow-2xs",
                            isOverallPassed
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-rose-50 text-rose-800 border-rose-200"
                          )}>
                            {isOverallPassed ? "✓ Tuntas KKM" : "⚠ Perlu Bimbingan"}
                          </span>
                          {studentMajor && (
                            <span className="px-3 py-0.5 rounded-full text-[11px] font-extrabold bg-[#531FFF]/10 text-[#531FFF] border border-[#531FFF]/20 flex items-center gap-1 shadow-2xs">
                              Jurusan: {studentMajor}
                            </span>
                          )}

                          {/* Publication Status Badge */}
                          {isReportPublished ? (
                            <span className="px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>✓ Rapor Dipublikasikan</span>
                            </span>
                          ) : isReportDraft ? (
                            <span className="px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1 shadow-2xs">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>📝 Draft Rapor (Belum Terbit)</span>
                            </span>
                          ) : (
                            <span className="px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-gray-100 text-gray-600 border border-gray-200 flex items-center gap-1 shadow-2xs">
                              ⚪ Belum Disimpan
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 font-medium mt-1.5">
                          <span className="bg-gray-100/80 px-2 py-0.5 rounded-md font-mono text-gray-700 font-bold">
                            NISN: {getStudentNisn(currentStudent)}
                          </span>
                          <span>•</span>
                          <span>Kelas: <span className="font-bold text-gray-900">{currentStudent.classId || currentStudent.className || "-"}</span></span>
                          {studentMajor && (
                            <>
                              <span>•</span>
                              <span>Program: <span className="font-bold text-[#531FFF]">{studentMajor}</span></span>
                            </>
                          )}
                          <span>•</span>
                          <span>Tahun: <span className="font-bold text-gray-900">{academicYear} ({semester})</span></span>
                        </div>
                      </div>
                    </div>

                    {/* Stats Metric Cards & Rapid Student Switcher */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-end gap-3 w-full lg:w-auto shrink-0">
                      {/* Rapid Student Switcher */}
                      {!isStudentRole && filteredStudents.length > 1 && (
                        <div className="flex items-center justify-between sm:justify-end gap-1.5 w-full bg-gray-50/90 p-1.5 rounded-xl border border-gray-200/80 shadow-2xs">
                          <button
                            type="button"
                            onClick={handleSelectPrevStudent}
                            disabled={!prevStudent}
                            className="px-2.5 py-1 rounded-lg text-xs font-black text-gray-700 hover:bg-white hover:shadow-2xs disabled:opacity-30 disabled:hover:bg-transparent transition-all flex items-center gap-1 cursor-pointer"
                            title={prevStudent ? `Sebelumnya: ${prevStudent.name}` : "Siswa pertama"}
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Sebelumnya</span>
                          </button>
                          <span className="text-[11px] font-black text-gray-600 px-2 min-w-[70px] text-center">
                            {currentStudentIndex >= 0 ? `${currentStudentIndex + 1} / ${filteredStudents.length}` : "-"}
                          </span>
                          <button
                            type="button"
                            onClick={handleSelectNextStudent}
                            disabled={!nextStudent}
                            className="px-2.5 py-1 rounded-lg text-xs font-black text-[#531FFF] hover:bg-white hover:shadow-2xs disabled:opacity-30 disabled:hover:bg-transparent transition-all flex items-center gap-1 cursor-pointer"
                            title={nextStudent ? `Berikutnya: ${nextStudent.name}` : "Siswa terakhir"}
                          >
                            <span className="hidden sm:inline">Berikutnya</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-2.5 w-full bg-gray-50/90 p-2.5 rounded-2xl border border-gray-200/80">
                        <div className="bg-white px-3.5 py-2 rounded-xl text-center shadow-2xs border border-gray-100">
                          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Rata-rata</span>
                          <p className="text-xl font-black text-[#531FFF] leading-none mt-1">{overallAverage}</p>
                        </div>
                        <div className="bg-white px-3.5 py-2 rounded-xl text-center shadow-2xs border border-gray-100">
                          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Peringkat</span>
                          <p className="text-xl font-black text-gray-900 leading-none mt-1">
                            #{studentRank.rank} <span className="text-[10px] font-normal text-gray-400">/{studentRank.totalInClass}</span>
                          </p>
                        </div>
                        <div className="bg-white px-3.5 py-2 rounded-xl text-center shadow-2xs border border-gray-100">
                          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Presensi</span>
                          <p className="text-xl font-black text-emerald-600 leading-none mt-1">{attendanceRate}%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* TAB 1: LEMBAR RAPOR UTAMA */}
                {activeTab === "report" && (
                  <div className="space-y-6">

                    {/* Section Navigation & Rapid Entry Toolbar (Sticky) */}
                    <div className="sticky top-3 z-20 bg-white/95 backdrop-blur-md p-3 rounded-2xl border border-gray-200/90 shadow-md space-y-2.5">
                      {/* Top Bar: Progress & Mode Switcher */}
                      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-gray-100 pb-2.5">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-gray-800">
                              Kelengkapan Rapor:
                            </span>
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[11px] font-black border",
                              sectionStatus.percent === 100
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-purple-50 text-[#531FFF] border-purple-200"
                            )}>
                              {sectionStatus.filledCount}/5 Bagian ({sectionStatus.percent}%)
                            </span>
                          </div>

                          {/* Mini Progress Bar */}
                          <div className="hidden sm:block w-28 md:w-32 h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200/60">
                            <div
                              className="h-full bg-gradient-to-r from-[#531FFF] to-indigo-500 rounded-full transition-all duration-300"
                              style={{ width: `${sectionStatus.percent}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Quick Fill Button */}
                          {!isReadOnly && (
                            <button
                              type="button"
                              onClick={handleApplyQuickDefaults}
                              className="text-[11px] font-extrabold text-[#531FFF] bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                              title="Terapkan template sikap sangat baik, hadir 100%, dan catatan motivasi dengan 1 klik"
                            >
                              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                              <span>⚡ Isi Cepat Default</span>
                            </button>
                          )}

                          {/* View Mode Toggle Switcher */}
                          <div className="flex items-center bg-gray-100 p-0.5 rounded-xl border border-gray-200 text-[11px] font-bold">
                            <button
                              type="button"
                              onClick={() => {
                                setReportEntryMode("continuous");
                                setActiveSectionFilter("all");
                              }}
                              className={cn(
                                "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                                reportEntryMode === "continuous"
                                  ? "bg-white text-[#531FFF] shadow-2xs font-black"
                                  : "text-gray-500 hover:text-gray-900"
                              )}
                              title="Semua bagian A sampai E tampil berurutan dalam satu lembar tanpa perlu pindah tab"
                            >
                              Alur Mengalir (Utuh)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setReportEntryMode("tabbed");
                                if (activeSectionFilter === "all") setActiveSectionFilter("academic");
                              }}
                              className={cn(
                                "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                                reportEntryMode === "tabbed"
                                  ? "bg-white text-[#531FFF] shadow-2xs font-black"
                                  : "text-gray-500 hover:text-gray-900"
                              )}
                              title="Fokus satu per satu bagian"
                            >
                              Mode Tab
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Row: Section Pills (Quick Jump or Tab Filter) */}
                      <div className="flex items-center gap-1.5 overflow-x-auto py-1 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                        {reportEntryMode === "tabbed" && (
                          <button
                            type="button"
                            onClick={() => handleSectionNavigate("all")}
                            className={cn(
                              "px-2.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap",
                              activeSectionFilter === "all"
                                ? "bg-[#531FFF] text-white shadow-xs"
                                : "text-gray-600 hover:bg-gray-100"
                            )}
                          >
                            <Layers className="w-3.5 h-3.5" />
                            <span>Semua Bagian</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleSectionNavigate("academic", "section-academic")}
                          className={cn(
                            "px-2.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border whitespace-nowrap",
                            reportEntryMode === "tabbed" && activeSectionFilter === "academic"
                              ? "bg-[#531FFF] text-white border-[#531FFF] shadow-xs"
                              : "bg-white text-gray-700 border-gray-200 hover:border-purple-300 hover:text-[#531FFF]"
                          )}
                        >
                          <BookOpen className="w-3.5 h-3.5 text-[#531FFF]" />
                          <span>A. Nilai Akademik ({studentSubjectScores.length})</span>
                          {sectionStatus.academicDone && (
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 fill-emerald-100" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSectionNavigate("attitude", "section-attitude")}
                          className={cn(
                            "px-2.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border whitespace-nowrap",
                            reportEntryMode === "tabbed" && activeSectionFilter === "attitude"
                              ? "bg-[#531FFF] text-white border-[#531FFF] shadow-xs"
                              : "bg-white text-gray-700 border-gray-200 hover:border-purple-300 hover:text-[#531FFF]"
                          )}
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-[#531FFF]" />
                          <span>B. Sikap & Karakter</span>
                          {sectionStatus.attitudeDone && (
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 fill-emerald-100" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSectionNavigate("attendance", "section-attendance")}
                          className={cn(
                            "px-2.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border whitespace-nowrap",
                            reportEntryMode === "tabbed" && activeSectionFilter === "attendance"
                              ? "bg-[#531FFF] text-white border-[#531FFF] shadow-xs"
                              : "bg-white text-gray-700 border-gray-200 hover:border-purple-300 hover:text-[#531FFF]"
                          )}
                        >
                          <Calendar className="w-3.5 h-3.5 text-[#531FFF]" />
                          <span>C. Presensi ({attendanceRate}%)</span>
                          {sectionStatus.attendanceDone && (
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 fill-emerald-100" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSectionNavigate("extracurricular", "section-extracurricular")}
                          className={cn(
                            "px-2.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border whitespace-nowrap",
                            reportEntryMode === "tabbed" && activeSectionFilter === "extracurricular"
                              ? "bg-[#531FFF] text-white border-[#531FFF] shadow-xs"
                              : "bg-white text-gray-700 border-gray-200 hover:border-purple-300 hover:text-[#531FFF]"
                          )}
                        >
                          <Award className="w-3.5 h-3.5 text-[#531FFF]" />
                          <span>D. Ekstrakurikuler ({extraCurriculars.length})</span>
                          {sectionStatus.extraDone && (
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 fill-emerald-100" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSectionNavigate("notes", "section-notes")}
                          className={cn(
                            "px-2.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border whitespace-nowrap",
                            reportEntryMode === "tabbed" && activeSectionFilter === "notes"
                              ? "bg-[#531FFF] text-white border-[#531FFF] shadow-xs"
                              : "bg-white text-gray-700 border-gray-200 hover:border-purple-300 hover:text-[#531FFF]"
                          )}
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#531FFF]" />
                          <span>E. Catatan & Keputusan</span>
                          {sectionStatus.notesDone && (
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 fill-emerald-100" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Section A: Capaian Hasil Belajar Akademik */}
                    {(reportEntryMode === "continuous" || activeSectionFilter === "all" || activeSectionFilter === "academic") && (
                      <div id="section-academic" className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden scroll-mt-24">
                        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50/90 to-purple-50/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center font-black">
                              <BookOpen className="w-4 h-4" />
                            </div>
                            <div>
                              <h3 className="font-black text-sm text-gray-900 uppercase tracking-wider">
                                A. Capaian Hasil Belajar Akademik
                              </h3>
                              <p className="text-[11px] text-gray-400 font-medium">
                                Pengelompokan mata pelajaran resmi sesuai jurusan siswa ({studentMajor || "Umum"})
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-gray-600 font-extrabold bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-2xs">
                              {studentSubjectScores.length} Mata Pelajaran
                            </span>
                            {!isReadOnly && (
                              <button
                                onClick={handleResyncStudentMajorAndSubjects}
                                disabled={isResyncingMajor}
                                className="text-xs font-extrabold text-white bg-[#531FFF] hover:bg-[#531FFF]/90 border border-[#531FFF] px-3.5 py-1.5 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                title="Sinkronkan ulang mata pelajaran dan kelompok dengan jurusan siswa saat ini serta bersihkan mapel dari jurusan sebelumnya"
                              >
                                {isResyncingMajor ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-3.5 h-3.5" />
                                )}
                                <span>Sinkronkan Ulang Jurusan ({studentMajor || "Umum"})</span>
                              </button>
                            )}
                            {!isReadOnly && missingSubjects.length > 0 && (
                              <button
                                onClick={handleSyncMissingSubjectsToMaster}
                                disabled={isSyncingSubjects}
                                className="text-xs font-extrabold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                title="Simpan mata pelajaran kurikulum ini ke master collection subjects di database"
                              >
                                {isSyncingSubjects ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Sparkles className="w-3.5 h-3.5" />
                                )}
                                <span>Simpan {missingSubjects.length} Mapel ke DB</span>
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-gray-50/90 border-b border-gray-200 text-gray-500 font-extrabold uppercase tracking-wider text-[11px]">
                                <th className="py-3 px-4 w-12 text-center">No</th>
                                <th className="py-3 px-4 min-w-[200px]">Mata Pelajaran</th>
                                <th className="py-3 px-4 text-center w-16">KKM</th>
                                <th className="py-3 px-4 text-center w-24">Nilai Akhir</th>
                                <th className="py-3 px-4 text-center w-20">Predikat</th>
                                <th className="py-3 px-4 min-w-[280px]">Capaian Kompetensi / Catatan Guru</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 font-medium">
                              {groupedSubjectScores.map((group, gIdx) => {
                                const groupValidScores = group.subjects.filter(s => s.hasData);
                                const groupAvg = groupValidScores.length > 0
                                  ? Math.round(groupValidScores.reduce((acc, s) => acc + s.score, 0) / groupValidScores.length)
                                  : 0;

                                return (
                                  <React.Fragment key={group.groupId || gIdx}>
                                    {/* Sub-header Kelompok Mata Pelajaran */}
                                    <tr className="bg-gradient-to-r from-purple-50/80 via-indigo-50/40 to-white border-y border-purple-100">
                                      <td colSpan={6} className="py-3 px-4">
                                        <div className="flex flex-wrap items-center justify-between gap-2.5">
                                          <div className="flex items-center gap-2.5">
                                            <span className="w-7 h-7 rounded-lg bg-[#531FFF] text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0">
                                              {group.groupCode || String.fromCharCode(65 + (gIdx % 26))}
                                            </span>
                                            <span className="font-black text-xs text-gray-900 uppercase tracking-wide">
                                              {group.groupName}
                                            </span>
                                            {group.groupMajor && group.groupMajor !== "Semua Jurusan / Umum" && (
                                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#531FFF]/10 text-[#531FFF] border border-[#531FFF]/20">
                                                Konsentrasi: {group.groupMajor}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2">
                                            {groupAvg > 0 && (
                                              <span className="text-[11px] font-bold text-gray-600 bg-white px-2.5 py-0.5 rounded-lg border border-gray-200">
                                                Rata-rata: <strong className="text-[#531FFF]">{groupAvg}</strong>
                                              </span>
                                            )}
                                            <span className="text-[11px] font-bold text-gray-500 bg-white px-2.5 py-0.5 rounded-lg border border-gray-200">
                                              {group.subjects.length} Mapel
                                            </span>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>

                                    {/* Baris Mata Pelajaran dalam Kelompok */}
                                    {group.subjects.map((item, idx) => (
                                      <tr key={`${group.groupId}-${idx}`} className="hover:bg-purple-50/30 transition-colors">
                                        <td className="py-3 px-4 text-center text-gray-400 font-bold">{idx + 1}</td>
                                        <td className="py-3 px-4">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-extrabold text-gray-900">{item.name}</span>
                                            {item.code && (
                                              <span className="text-[10px] font-mono font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                                {item.code}
                                              </span>
                                            )}
                                          </div>
                                          {!isCommonCurriculumSubject(item.name) && item.itemMajor && item.itemMajor !== "Semua Jurusan / Umum" && (
                                            <span className="inline-block text-[9px] font-bold text-[#531FFF] mt-0.5">
                                              Konsentrasi Keahlian: {item.itemMajor}
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-3 px-4 text-center font-bold text-gray-500">
                                          <span className="bg-gray-100 px-2 py-0.5 rounded-md text-[11px]">{item.kkm}</span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                          {item.hasData ? (
                                            <div className="flex flex-col items-center justify-center">
                                              <span className="font-black text-sm text-gray-900">{item.score}</span>
                                              <span className={cn(
                                                "text-[9px] font-bold mt-0.5",
                                                item.isPassed ? "text-emerald-600" : "text-rose-500"
                                              )}>
                                                {item.isPassed ? "Tuntas" : "Remedial"}
                                              </span>
                                            </div>
                                          ) : (
                                            <span className="text-gray-300 font-normal">-</span>
                                          )}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                          {item.hasData ? (
                                            <span className={cn(
                                              "inline-block px-2.5 py-1 rounded-lg font-black text-xs border shadow-2xs",
                                              item.predicate === "A" && "bg-emerald-50 text-emerald-800 border-emerald-300",
                                              item.predicate === "B" && "bg-blue-50 text-blue-800 border-blue-300",
                                              item.predicate === "C" && "bg-amber-50 text-amber-800 border-amber-300",
                                              item.predicate === "D" && "bg-rose-50 text-rose-800 border-rose-300"
                                            )}>
                                              {item.predicate}
                                            </span>
                                          ) : (
                                            <span className="text-gray-300 font-bold">-</span>
                                          )}
                                        </td>
                                        <td className="py-3 px-4">
                                          {isReadOnly ? (
                                            <p className="text-xs text-gray-700 leading-relaxed italic">{item.description}</p>
                                          ) : (
                                            <textarea
                                              rows={2}
                                              value={subjectNotes[item.name] ?? item.description}
                                              onChange={(e) => setSubjectNotes(prev => ({ ...prev, [item.name]: e.target.value }))}
                                              placeholder="Tuliskan capaian kompetensi siswa..."
                                              className="w-full p-2.5 text-xs text-gray-800 bg-gray-50/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] leading-relaxed transition-all"
                                            />
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </React.Fragment>
                                );
                              })}

                              {groupedSubjectScores.length === 0 && (
                                <tr>
                                  <td colSpan={6} className="py-12 text-center text-gray-400 text-xs">
                                    Belum ada data nilai mata pelajaran untuk siswa ini.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Action link to next section */}
                        <div className="p-3.5 bg-gray-50/80 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                          <span className="text-[11px] text-gray-500 font-medium">
                            {studentSubjectScores.length} Mata Pelajaran terdaftar dalam kurikulum {studentMajor || "Umum"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSectionNavigate("attitude", "section-attitude")}
                            className="inline-flex items-center gap-1.5 text-xs font-black text-[#531FFF] bg-purple-50 hover:bg-purple-100 px-3.5 py-1.5 rounded-xl border border-purple-200 transition-all cursor-pointer shadow-2xs self-end sm:self-auto"
                          >
                            <span>Lanjut ke B. Sikap & Karakter</span>
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Section B & C: Sikap & Ketidakhadiran */}
                    {(reportEntryMode === "continuous" || activeSectionFilter === "all" || activeSectionFilter === "attitude" || activeSectionFilter === "attendance") && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                          {/* Section B: Penilaian Sikap & Karakter */}
                          {(reportEntryMode === "continuous" || activeSectionFilter === "all" || activeSectionFilter === "attitude") && (
                            <div id="section-attitude" className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 space-y-4 flex flex-col justify-between scroll-mt-24">
                            <div>
                              <div className="flex items-center justify-between border-b border-gray-100 pb-3 gap-2">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#531FFF] flex items-center justify-center font-bold">
                                    <ShieldCheck className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <h3 className="font-black text-xs text-gray-900 uppercase tracking-wider">
                                      B. Penilaian Sikap & Karakter
                                    </h3>
                                    <p className="text-[10px] text-gray-400">Profil Pelajar Pancasila</p>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-4 mt-3">
                                                    <div className="bg-gray-50/60 p-3.5 rounded-xl border border-gray-200/70">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-xs font-black text-gray-800">1. Sikap Spiritual</label>
                                    <select
                                      disabled={isReadOnly}
                                      value={spiritualAttitude}
                                      onChange={(e) => setSpiritualAttitude(e.target.value)}
                                      className="px-2.5 py-1 text-xs font-extrabold bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20 disabled:opacity-80 cursor-pointer shadow-2xs"
                                    >
                                      <option value="Sangat Baik">Sangat Baik (A)</option>
                                      <option value="Baik">Baik (B)</option>
                                      <option value="Cukup">Cukup (C)</option>
                                      <option value="Perlu Bimbingan">Perlu Bimbingan (D)</option>
                                    </select>
                                  </div>

                                  {!isReadOnly && (
                                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                                      <span className="text-[10px] text-gray-400 font-bold">Preset:</span>
                                      <button
                                        type="button"
                                        onClick={() => setSpiritualDesc("Terbiasa berdoa sebelum/sesudah belajar, taat menjalankan ibadah sesuai keyakinan, dan menunjukkan toleransi tinggi.")}
                                        className="text-[10px] font-bold text-[#531FFF] bg-[#531FFF]/5 hover:bg-[#531FFF]/15 px-2 py-0.5 rounded-md border border-[#531FFF]/20 transition-colors"
                                      >
                                        Taat Ibadah & Toleransi
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setSpiritualDesc("Menunjukkan keimanan dan ketakwaan yang teguh, berakhlak mulia kepada sesama, serta bersyukur dalam setiap keadaan.")}
                                        className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200 transition-colors"
                                      >
                                        Beriman & Bertakwa
                                      </button>
                                    </div>
                                  )}

                                  <textarea
                                    rows={2}
                                    disabled={isReadOnly}
                                    value={spiritualDesc}
                                    onChange={(e) => setSpiritualDesc(e.target.value)}
                                    placeholder="Deskripsi perkembangan sikap spiritual siswa..."
                                    className="w-full p-2.5 text-xs text-gray-700 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20 disabled:opacity-80 leading-relaxed shadow-2xs"
                                  />
                                </div>

                                {/* Sikap Sosial */}
                                <div className="bg-gray-50/60 p-3.5 rounded-xl border border-gray-200/70">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-xs font-black text-gray-800">2. Sikap Sosial</label>
                                    <select
                                      disabled={isReadOnly}
                                      value={socialAttitude}
                                      onChange={(e) => setSocialAttitude(e.target.value)}
                                      className="px-2.5 py-1 text-xs font-extrabold bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20 disabled:opacity-80 cursor-pointer shadow-2xs"
                                    >
                                      <option value="Sangat Baik">Sangat Baik (A)</option>
                                      <option value="Baik">Baik (B)</option>
                                      <option value="Cukup">Cukup (C)</option>
                                      <option value="Perlu Bimbingan">Perlu Bimbingan (D)</option>
                                    </select>
                                  </div>

                                  {!isReadOnly && (
                                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                                      <span className="text-[10px] text-gray-400 font-bold">Preset:</span>
                                      <button
                                        type="button"
                                        onClick={() => setSocialDesc("Sangat santun dalam bertutur kata, berjiwa gotong royong, peduli terhadap teman, dan disiplin dalam mengerjakan tugas.")}
                                        className="text-[10px] font-bold text-[#531FFF] bg-[#531FFF]/5 hover:bg-[#531FFF]/15 px-2 py-0.5 rounded-md border border-[#531FFF]/20 transition-colors"
                                      >
                                        Gotong Royong & Santun
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setSocialDesc("Memiliki kemandirian dan rasa tanggung jawab tinggi, aktif dalam kerja kelompok, serta bernalar kritis.")}
                                        className="text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200 transition-colors"
                                      >
                                        Mandiri & Tanggung Jawab
                                      </button>
                                    </div>
                                  )}

                                  <textarea
                                    rows={2}
                                    disabled={isReadOnly}
                                    value={socialDesc}
                                    onChange={(e) => setSocialDesc(e.target.value)}
                                    placeholder="Deskripsi perkembangan sikap sosial siswa..."
                                    className="w-full p-2.5 text-xs text-gray-700 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20 disabled:opacity-80 leading-relaxed shadow-2xs"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Section C: Ketidakhadiran (Presensi) */}
                        {(reportEntryMode === "continuous" || activeSectionFilter === "all" || activeSectionFilter === "attendance") && (
                          <div id="section-attendance" className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 space-y-4 flex flex-col justify-between scroll-mt-24">
                            <div>
                              <div className="flex items-center justify-between border-b border-gray-100 pb-3 gap-2">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#531FFF] flex items-center justify-center font-bold">
                                    <Calendar className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <h3 className="font-black text-xs text-gray-900 uppercase tracking-wider">
                                      C. Ketidakhadiran (Presensi)
                                    </h3>
                                    <p className="text-[10px] text-gray-400">Rekap semester ini</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                                    {attendanceRate}% Hadir
                                  </span>

                                  {!isReadOnly && (
                                    <button
                                      type="button"
                                      onClick={handleSyncAttendanceFromDb}
                                      className="text-[10px] font-black text-[#531FFF] bg-[#531FFF]/10 hover:bg-[#531FFF]/20 px-2.5 py-1 rounded-lg border border-[#531FFF]/20 transition-all flex items-center gap-1 cursor-pointer"
                                      title="Tarik & cocokkan ulang data dari log absensi harian"
                                    >
                                      <RefreshCw className="w-3 h-3" />
                                      <span>Sync DB</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Live DB Attendance Sync Banner */}
                              <div className="mt-3 bg-gradient-to-r from-blue-50/90 to-purple-50/90 p-3.5 rounded-xl border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                                  <div className="flex items-center gap-2.5">
                                    <Database className="w-4 h-4 text-[#531FFF] shrink-0" />
                                    <div className="text-[11px]">
                                      <span className="font-black text-gray-800 block">Database Presensi Harian Terdeteksi</span>
                                      <span className="text-gray-600 font-medium">
                                        {dbAttendanceStats.total > 0 ? (
                                          <>Tercatat {dbAttendanceStats.total} log ({dbAttendanceStats.present} Hadir, {dbAttendanceStats.sick} Sakit, {dbAttendanceStats.permit} Izin, {dbAttendanceStats.alpha} Alpa)</>
                                        ) : (
                                          <>Belum ada log presensi khusus di database (tersedia opsi manual)</>
                                        )}
                                      </span>
                                    </div>
                                  </div>

                                  {!isReadOnly && (
                                    <button
                                      type="button"
                                      onClick={handleSyncAttendanceFromDb}
                                      className="shrink-0 flex items-center gap-1 bg-white hover:bg-gray-50 text-[#531FFF] border border-purple-200 px-2.5 py-1 rounded-lg text-[10px] font-black shadow-2xs transition-colors cursor-pointer"
                                      title="Tarik dan terapkan data dari koleksi presensi harian"
                                    >
                                      <RefreshCw className="w-3 h-3" />
                                      <span>Tarik Presensi DB</span>
                                    </button>
                                  )}
                              </div>

                              <div className="grid grid-cols-3 gap-3 mt-4">
                                {/* Sakit */}
                                <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-200 text-center hover:border-gray-300 transition-colors">
                                  <label className="block text-[11px] font-black text-gray-700 mb-1.5">Sakit (Hari)</label>
                                  <div className="flex items-center justify-center gap-1.5">
                                    {!isReadOnly && (
                                      <button
                                        type="button"
                                        onClick={() => setSickCount(Math.max(0, sickCount - 1))}
                                        className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-xs font-black text-gray-600 hover:bg-gray-100 active:scale-95 shadow-2xs cursor-pointer"
                                      >
                                        -
                                      </button>
                                    )}
                                    <input
                                      type="number"
                                      min={0}
                                      disabled={isReadOnly}
                                      value={sickCount}
                                      onChange={(e) => setSickCount(Math.max(0, parseInt(e.target.value) || 0))}
                                      className="w-12 text-center text-base font-black text-gray-900 bg-white border border-gray-200 rounded-lg py-1 shadow-2xs"
                                    />
                                    {!isReadOnly && (
                                      <button
                                        type="button"
                                        onClick={() => setSickCount(sickCount + 1)}
                                        className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-xs font-black text-gray-600 hover:bg-gray-100 active:scale-95 shadow-2xs cursor-pointer"
                                      >
                                        +
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Izin */}
                                <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-200 text-center hover:border-gray-300 transition-colors">
                                  <label className="block text-[11px] font-black text-gray-700 mb-1.5">Izin (Hari)</label>
                                  <div className="flex items-center justify-center gap-1.5">
                                    {!isReadOnly && (
                                      <button
                                        type="button"
                                        onClick={() => setPermitCount(Math.max(0, permitCount - 1))}
                                        className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-xs font-black text-gray-600 hover:bg-gray-100 active:scale-95 shadow-2xs cursor-pointer"
                                      >
                                        -
                                      </button>
                                    )}
                                    <input
                                      type="number"
                                      min={0}
                                      disabled={isReadOnly}
                                      value={permitCount}
                                      onChange={(e) => setPermitCount(Math.max(0, parseInt(e.target.value) || 0))}
                                      className="w-12 text-center text-base font-black text-gray-900 bg-white border border-gray-200 rounded-lg py-1 shadow-2xs"
                                    />
                                    {!isReadOnly && (
                                      <button
                                        type="button"
                                        onClick={() => setPermitCount(permitCount + 1)}
                                        className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-xs font-black text-gray-600 hover:bg-gray-100 active:scale-95 shadow-2xs cursor-pointer"
                                      >
                                        +
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Tanpa Keterangan */}
                                <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-200 text-center hover:border-gray-300 transition-colors">
                                  <label className="block text-[11px] font-black text-gray-700 mb-1.5">Alpa (Hari)</label>
                                  <div className="flex items-center justify-center gap-1.5">
                                    {!isReadOnly && (
                                      <button
                                        type="button"
                                        onClick={() => setAlphaCount(Math.max(0, alphaCount - 1))}
                                        className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-xs font-black text-gray-600 hover:bg-gray-100 active:scale-95 shadow-2xs cursor-pointer"
                                      >
                                        -
                                      </button>
                                    )}
                                    <input
                                      type="number"
                                      min={0}
                                      disabled={isReadOnly}
                                      value={alphaCount}
                                      onChange={(e) => setAlphaCount(Math.max(0, parseInt(e.target.value) || 0))}
                                      className="w-12 text-center text-base font-black text-gray-900 bg-white border border-gray-200 rounded-lg py-1 shadow-2xs"
                                    />
                                    {!isReadOnly && (
                                      <button
                                        type="button"
                                        onClick={() => setAlphaCount(alphaCount + 1)}
                                        className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-xs font-black text-gray-600 hover:bg-gray-100 active:scale-95 shadow-2xs cursor-pointer"
                                      >
                                        +
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="text-[11px] text-gray-500 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100 flex items-center gap-2 mt-3 font-medium">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>Status kehadiran otomatis menghitung persentase keikutsertaan siswa dalam kegiatan belajar mengajar semester ini.</span>
                            </div>
                          </div>
                        )}

                        </div>

                        {/* Action link to advance to Section D */}
                        <div className="flex items-center justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => handleSectionNavigate("extracurricular", "section-extracurricular")}
                            className="inline-flex items-center gap-1.5 text-xs font-black text-[#531FFF] bg-purple-50 hover:bg-purple-100 px-3.5 py-1.5 rounded-xl border border-purple-200 transition-all cursor-pointer shadow-2xs"
                          >
                            <span>Lanjut ke D. Ekstrakurikuler</span>
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Section D: Kegiatan Ekstrakurikuler */}
                    {(reportEntryMode === "continuous" || activeSectionFilter === "all" || activeSectionFilter === "extracurricular") && (
                      <div id="section-extracurricular" className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 space-y-4 scroll-mt-24">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#531FFF] flex items-center justify-center font-bold">
                              <Award className="w-4 h-4" />
                            </div>
                            <div>
                              <h3 className="font-black text-xs text-gray-900 uppercase tracking-wider">
                                D. Kegiatan Ekstrakurikuler
                              </h3>
                              <p className="text-[10px] text-gray-400">Pengembangan bakat dan minat non-akademik</p>
                            </div>
                          </div>
                          {!isReadOnly && (
                            <button
                              type="button"
                              onClick={() => handleAddExtra()}
                              className="text-xs font-bold text-[#531FFF] bg-[#531FFF]/10 hover:bg-[#531FFF]/20 px-3 py-1.5 rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Tambah Ekstrakurikuler</span>
                            </button>
                          )}
                        </div>

                        {!isReadOnly && (
                          <div className="flex items-center gap-2 flex-wrap bg-gray-50/80 p-3 rounded-xl border border-gray-200/70">
                            <span className="text-[11px] font-black text-gray-500">Preset Cepat:</span>
                            {["Pramuka Wajib", "PMR (Palang Merah)", "Paskibra", "Rohis & Keagamaan", "English Club", "Futsal", "Seni Tari", "Robotik & KIR"].map((p, pIdx) => (
                              <button
                                key={pIdx}
                                type="button"
                                onClick={() => handleAddExtra(p)}
                                className="text-[10px] font-extrabold text-[#531FFF] bg-white hover:bg-[#531FFF]/10 border border-[#531FFF]/20 px-2.5 py-1 rounded-lg transition-colors shadow-2xs cursor-pointer"
                              >
                                + {p}
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="space-y-3">
                          {extraCurriculars.map((ex, exIdx) => (
                            <div key={exIdx} className="p-3.5 bg-gray-50/70 rounded-xl border border-gray-200/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3">
                                <input
                                  type="text"
                                  disabled={isReadOnly}
                                  value={ex.name}
                                  onChange={(e) => handleUpdateExtra(exIdx, "name", e.target.value)}
                                  placeholder="Nama Ekstrakurikuler..."
                                  className="md:col-span-4 px-3 py-2 font-bold bg-white border border-gray-200 rounded-xl disabled:opacity-80 focus:ring-2 focus:ring-[#531FFF]/20 shadow-2xs"
                                />
                                <select
                                  disabled={isReadOnly}
                                  value={ex.grade}
                                  onChange={(e) => handleUpdateExtra(exIdx, "grade", e.target.value)}
                                  className="md:col-span-2 px-2.5 py-2 font-black bg-white border border-gray-200 rounded-xl disabled:opacity-80 focus:ring-2 focus:ring-[#531FFF]/20 shadow-2xs cursor-pointer"
                                >
                                  <option value="A">Nilai A (Sangat Baik)</option>
                                  <option value="B">Nilai B (Baik)</option>
                                  <option value="C">Nilai C (Cukup)</option>
                                  <option value="D">Nilai D (Kurang)</option>
                                </select>
                                <input
                                  type="text"
                                  disabled={isReadOnly}
                                  value={ex.desc}
                                  onChange={(e) => handleUpdateExtra(exIdx, "desc", e.target.value)}
                                  placeholder="Keterangan perkembangan, keaktifan, dan capaian prestasi..."
                                  className="md:col-span-6 px-3 py-2 font-medium bg-white border border-gray-200 rounded-xl disabled:opacity-80 focus:ring-2 focus:ring-[#531FFF]/20 shadow-2xs"
                                />
                              </div>

                              {!isReadOnly && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveExtra(exIdx)}
                                  className="p-2 text-gray-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors shrink-0 shadow-2xs cursor-pointer"
                                  title="Hapus Ekstrakurikuler"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}

                          {extraCurriculars.length === 0 && (
                            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-2xl">
                              <p className="text-xs text-gray-400 mb-2 font-medium">Belum ada kegiatan ekstrakurikuler tercatat untuk siswa ini.</p>
                              {!isReadOnly && (
                                <button
                                  type="button"
                                  onClick={() => handleAddExtra()}
                                  className="text-xs font-bold text-[#531FFF] bg-[#531FFF]/10 hover:bg-[#531FFF]/20 px-3.5 py-1.5 rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Tambah Ekstrakurikuler</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action link to advance to Section E */}
                        <div className="flex items-center justify-end pt-3 border-t border-gray-100">
                          <button
                            type="button"
                            onClick={() => handleSectionNavigate("notes", "section-notes")}
                            className="inline-flex items-center gap-1.5 text-xs font-black text-[#531FFF] bg-purple-50 hover:bg-purple-100 px-3.5 py-1.5 rounded-xl border border-purple-200 transition-all cursor-pointer shadow-2xs"
                          >
                            <span>Lanjut ke E. Catatan & Keputusan</span>
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Section E: Catatan Perkembangan Wali Kelas */}
                    {(reportEntryMode === "continuous" || activeSectionFilter === "all" || activeSectionFilter === "notes") && (
                      <div id="section-notes" className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 space-y-4 scroll-mt-24">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#531FFF] flex items-center justify-center font-bold">
                              <Edit3 className="w-4 h-4" />
                            </div>
                            <div>
                              <h3 className="font-black text-xs text-gray-900 uppercase tracking-wider">
                                E. Catatan Perkembangan Wali Kelas & Keputusan
                              </h3>
                              <p className="text-[10px] text-gray-400">Evaluasi menyeluruh, motivasi, dan keputusan akhir</p>
                            </div>
                          </div>
                        </div>

                        {!isReadOnly && (
                          <div className="flex items-center gap-2 flex-wrap pb-1">
                            <span className="text-[11px] font-black text-gray-400">Template Cepat:</span>
                            <button
                              type="button"
                              onClick={() => applyPresetNote("Selamat atas pencapaian prestasi belajar yang sangat gemilang semester ini! Pertahankan semangat belajar, keaktifan berorganisasi, dan tetap rendah hati.")}
                              className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors shadow-2xs cursor-pointer"
                            >
                              🌟 Sangat Memuaskan
                            </button>
                            <button
                              type="button"
                              onClick={() => applyPresetNote("Ananda menunjukkan kemajuan belajar yang konsisten dan aktif berpartisipasi di kelas. Tingkatkan terus minat literasi dan ketekunan untuk meraih hasil yang lebih prima.")}
                              className="text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors shadow-2xs cursor-pointer"
                            >
                              📈 Menunjukkan Kemajuan
                            </button>
                            <button
                              type="button"
                              onClick={() => applyPresetNote("Perlu meningkatkan fokus belajar mandiri di rumah dan kedisiplinan mengumpulkan tugas. Jangan ragu berkonsultasi dengan bapak/ibu guru jika mengalami kendala materi.")}
                              className="text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition-colors shadow-2xs cursor-pointer"
                            >
                              💪 Motivasi Belajar
                            </button>
                            <button
                              type="button"
                              onClick={() => applyPresetNote("Tingkatkan kehadiran harian dan ketepatan waktu agar tidak tertinggal materi esensial. Potensi diri ananda sangat baik jika diasah dengan kedisiplinan.")}
                              className="text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200 transition-colors shadow-2xs cursor-pointer"
                            >
                              🎯 Peningkatan Disiplin
                            </button>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-black text-gray-800 mb-1.5">Catatan Motivasi & Evaluasi Wali Kelas:</label>
                          <textarea
                            rows={3}
                            disabled={isReadOnly}
                            value={teacherNotes}
                            onChange={(e) => setTeacherNotes(e.target.value)}
                            placeholder="Tuliskan catatan motivasi dan saran perkembangan untuk siswa..."
                            className="w-full p-3.5 text-xs font-medium bg-gray-50/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] disabled:opacity-80 leading-relaxed shadow-2xs transition-all"
                          />
                        </div>

                        {/* Administrative Fields: Promotion Decision, Homeroom Info, Decision Date */}
                        <div className="pt-3 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                          {/* Status Kenaikan / Kelulusan */}
                          <div className="bg-gray-50/80 p-3.5 rounded-xl border border-gray-200/80">
                            <label className="block text-[11px] font-black text-gray-700 mb-1.5">Status Kenaikan / Kelulusan:</label>
                            <select
                              disabled={isReadOnly}
                              value={promotionStatus}
                              onChange={(e) => setPromotionStatus(e.target.value)}
                              className="w-full p-2 text-xs font-black bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20 disabled:opacity-80 shadow-2xs cursor-pointer"
                            >
                              <option value="Naik ke Kelas Berikutnya">Naik ke Kelas Berikutnya</option>
                              <option value="Lulus (Memenuhi Seluruh Syarat Kelulusan)">Lulus (Memenuhi Kriteria)</option>
                              <option value="Melanjutkan ke Semester Genap">Melanjutkan ke Semester Genap</option>
                              <option value="Tinggal di Kelas Ini">Tinggal di Kelas Ini</option>
                            </select>
                          </div>

                          {/* Wali Kelas Penanggung Jawab (from Database) */}
                          <div className="bg-gray-50/80 p-3.5 rounded-xl border border-gray-200/80">
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="block text-[11px] font-black text-gray-700">Wali Kelas Penanggung Jawab:</label>
                              <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                Database Guru
                              </span>
                            </div>
                            <input
                              type="text"
                              disabled={isReadOnly}
                              value={customHomeroomName || homeroomTeacher?.name || ""}
                              onChange={(e) => setCustomHomeroomName(e.target.value)}
                              placeholder="Nama Wali Kelas..."
                              className="w-full p-2 text-xs font-black bg-white border border-gray-200 rounded-lg disabled:opacity-80 focus:ring-2 focus:ring-[#531FFF]/20 shadow-2xs"
                            />
                            <div className="mt-1.5 flex items-center justify-between text-[10px] text-gray-500 font-medium">
                              <span>NIP:</span>
                              <input
                                type="text"
                                disabled={isReadOnly}
                                value={customHomeroomNip || homeroomTeacher?.nip || ""}
                                onChange={(e) => setCustomHomeroomNip(e.target.value)}
                                placeholder="NIP Wali Kelas..."
                                className="text-right text-[10px] font-bold bg-transparent border-b border-gray-300 focus:outline-none max-w-[140px]"
                              />
                            </div>
                          </div>

                          {/* Tanggal Penetapan / Titimangsa Rapor */}
                          <div className="bg-gray-50/80 p-3.5 rounded-xl border border-gray-200/80">
                            <label className="block text-[11px] font-black text-gray-700 mb-1.5">Tanggal Titimangsa Rapor:</label>
                            <input
                              type="text"
                              disabled={isReadOnly}
                              value={decisionDate}
                              onChange={(e) => setDecisionDate(e.target.value)}
                              placeholder="Contoh: 19 Desember 2025"
                              className="w-full p-2 text-xs font-black bg-white border border-gray-200 rounded-lg disabled:opacity-80 focus:ring-2 focus:ring-[#531FFF]/20 shadow-2xs"
                            />
                            <p className="text-[10px] text-gray-400 mt-1 font-medium">Dicantumkan pada lembar tanda tangan rapor resmi.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ------------------------------------------------------------- */}
                    {/* STICKY BOTTOM ACTION BAR (Alur Penyimpanan & Cetak Terpadu)   */}
                    {/* ------------------------------------------------------------- */}
                    {!isStudentRole && (
                      <div className="sticky bottom-4 z-30 bg-white/95 backdrop-blur-md rounded-2xl border border-purple-200/90 shadow-xl p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4 transition-all hover:border-[#531FFF]/40">
                        <div className="flex items-center gap-3.5 w-full md:w-auto">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#531FFF] to-indigo-600 text-white flex items-center justify-center shadow-md shadow-[#531FFF]/30 shrink-0">
                            {canMutateGrades ? <Save className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-black text-sm text-gray-900 truncate">
                                {canMutateGrades ? `Simpan Rapor: ${currentStudent?.name || "Siswa"}` : `Pratinjau Rapor: ${currentStudent?.name || "Siswa"}`}
                              </h4>
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#531FFF]/10 text-[#531FFF] border border-[#531FFF]/20">
                                {academicYear} ({semester})
                              </span>
                              {!canMutateGrades && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  <ShieldAlert className="w-3 h-3 text-amber-600" />
                                  Monitoring Eksekutif
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500 font-medium truncate mt-0.5">
                              {canMutateGrades 
                                ? "Nilai akademik, sikap spiritual & sosial, presensi, ekskul, dan catatan wali kelas."
                                : "Mode pemantauan eksekutif: Anda dapat memeriksa capaian nilai dan mencetak dokumen rapor resmi."}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 justify-end flex-wrap">
                          <button
                            type="button"
                            onClick={() => setIsPrintModalOpen(true)}
                            disabled={!currentStudent}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
                          >
                            <Printer className="w-4 h-4 text-gray-600" />
                            <span>Pratinjau / Cetak</span>
                          </button>

                          {canMutateGrades && (
                            <>
                              {/* Tombol Simpan Draft (Belum dilihat siswa) */}
                              <button
                                type="button"
                                onClick={() => handleSaveReportCard("draft")}
                                disabled={isSaving || !currentStudent}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-2xs active:scale-[0.98] disabled:opacity-70 cursor-pointer"
                                title="Simpan nilai dan catatan sebagai Draft. Siswa belum dapat melihat nilai sampai Anda mempublikasikannya."
                              >
                                <FileText className="w-4 h-4 text-amber-600" />
                                <span>Simpan Draft</span>
                              </button>

                              {/* Tombol Publikasikan Rapor (Final / Resmi dilihat siswa) */}
                              <button
                                type="button"
                                onClick={() => handleSaveReportCard("published")}
                                disabled={isSaving || !currentStudent}
                                className={cn(
                                  "flex-1 md:flex-none flex items-center justify-center gap-2 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 cursor-pointer",
                                  isReportPublished
                                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/25"
                                    : "bg-[#531FFF] hover:bg-[#531FFF]/90 shadow-[#531FFF]/25"
                                )}
                                title={
                                  isReportPublished
                                    ? "Perbarui isi rapor yang sudah dipublikasikan ke siswa"
                                    : "Publikasikan rapor secara resmi agar data nilai muncul dan dapat diakses oleh siswa"
                                }
                              >
                                {isSaving ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Menyimpan...</span>
                                  </>
                                ) : isReportPublished ? (
                                  <>
                                    <Check className="w-4 h-4 text-emerald-200" />
                                    <span>Perbarui Publikasi Rapor</span>
                                  </>
                                ) : (
                                  <>
                                    <Save className="w-4 h-4" />
                                    <span>Publikasikan Rapor (Resmi)</span>
                                  </>
                                )}
                              </button>

                              {nextStudent && (
                                <button
                                  type="button"
                                  onClick={() => handleSaveAndNextStudent()}
                                  disabled={isSaving || !currentStudent}
                                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-[#531FFF] hover:from-indigo-700 hover:to-[#531FFF]/90 text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 cursor-pointer"
                                  title={`Simpan rapor ${currentStudent?.name || ""} dan langsung lanjut ke siswa berikutnya: ${nextStudent.name}`}
                                >
                                  <CheckCheck className="w-4 h-4 text-indigo-200" />
                                  <span>Simpan & Lanjut ({nextStudent.name.split(' ')[0]}) →</span>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* STICKY ACTION BAR KHUSUS ROLE SISWA SAAT RAPOR TELAH TERBIT */}
                    {isStudentRole && isReportPublished && (
                      <div className="sticky bottom-4 z-30 bg-white/95 backdrop-blur-md rounded-2xl border border-emerald-200/90 shadow-xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shrink-0">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-black text-sm text-gray-900">
                              Rapor Digital Semester {semester} Resmi
                            </h4>
                            <p className="text-[11px] text-gray-500 font-medium">
                              Telah diverifikasi dan dipublikasikan oleh {customHomeroomName || homeroomTeacher?.name || "Wali Kelas"}.
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsPrintModalOpen(true)}
                          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#531FFF] hover:bg-[#531FFF]/90 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-[#531FFF]/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                          <span>Unduh / Cetak Lembar Rapor</span>
                        </button>
                      </div>
                    )}

                  </div>
                )}

                {/* TAB 2: ANALISIS & GRAFIK PERFORMA */}
                {activeTab === "analytics" && (
                  <div className="space-y-6">

                    {/* Performance Overview Banner */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-xs flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                          <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Mata Pelajaran Tertinggi</span>
                          <p className="font-extrabold text-sm text-gray-900 mt-0.5">
                            {studentSubjectScores.length > 0 ? studentSubjectScores[0].name : "-"} ({studentSubjectScores.length > 0 ? studentSubjectScores[0].score : 0})
                          </p>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-xs flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-purple-50 text-[#531FFF] flex items-center justify-center font-bold shrink-0">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tingkat Ketuntasan</span>
                          <p className="font-extrabold text-sm text-gray-900 mt-0.5">
                            {studentSubjectScores.filter(s => s.isPassed).length} / {studentSubjectScores.length} Tuntas KKM
                          </p>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-xs flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                          <Award className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Peringkat Kelas</span>
                          <p className="font-extrabold text-sm text-gray-900 mt-0.5">
                            Peringkat #{studentRank.rank} dari {studentRank.totalInClass} Siswa
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Chart 1: Subject Scores vs KKM Baseline Bar Chart */}
                    <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-xs">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="font-extrabold text-sm text-gray-900">Perbandingan Nilai Akhir vs KKM</h3>
                          <p className="text-xs text-gray-400 mt-0.5">Visualisasi capaian nilai tiap mata pelajaran dibandingkan KKM (75)</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#531FFF]/10 text-[#531FFF]">
                          Bar Chart
                        </span>
                      </div>

                      <div className="w-full h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={studentSubjectScores} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                            <Tooltip
                              contentStyle={{ borderRadius: '12px', fontSize: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                            <Bar dataKey="score" name="Nilai Siswa" fill="#531FFF" radius={[6, 6, 0, 0]}>
                              {studentSubjectScores.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.score >= 90 ? "#10B981" : entry.score >= 75 ? "#531FFF" : "#EF4444"} />
                              ))}
                            </Bar>
                            <Bar dataKey="kkm" name="Batas KKM" fill="#CBD5E1" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Chart 2: Competency Radar Chart */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-xs">
                        <h3 className="font-extrabold text-sm text-gray-900 mb-1">Radar Penguasaan Kompetensi</h3>
                        <p className="text-xs text-gray-400 mb-4">Peta kekuatan bidang akademik siswa</p>

                        <div className="w-full h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={studentSubjectScores}>
                              <PolarGrid stroke="#E2E8F0" />
                              <PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                              <Radar name="Nilai Siswa" dataKey="score" stroke="#531FFF" fill="#531FFF" fillOpacity={0.4} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Summary & Suggestions Card */}
                      <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="w-5 h-5 text-[#531FFF]" />
                            <h3 className="font-extrabold text-sm text-gray-900">Rekomendasi & Analisis Pembelajaran</h3>
                          </div>

                          <div className="space-y-3 text-xs">
                            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                              <span className="font-bold text-emerald-800 block mb-1">💪 Bidang Keunggulan:</span>
                              <p className="text-emerald-700">
                                Siswa sangat menonjol pada mata pelajaran
                                <span className="font-bold"> {studentSubjectScores.filter(s => s.score >= 85).map(s => s.name).join(", ") || "Umum"}</span>.
                                Dorong partisipasi dalam perlombaan akademik atau olimpiade.
                              </p>
                            </div>

                            {studentSubjectScores.some(s => s.score < 75) && (
                              <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                                <span className="font-bold text-amber-800 block mb-1">⚠️ Perlu Peningkatan:</span>
                                <p className="text-amber-700">
                                  Mata pelajaran <span className="font-bold">{studentSubjectScores.filter(s => s.score < 75).map(s => s.name).join(", ")}</span> memerlukan bimbingan ekstra dan jadwal remedial.
                                </p>
                              </div>
                            )}

                            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                              <span className="font-bold text-blue-800 block mb-1">📌 Catatan Kehadiran & Karakter:</span>
                              <p className="text-blue-700">
                                Kehadiran {attendanceRate}% dan predikat sikap {spiritualAttitude} menunjukkan kesiapan belajar yang prima.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100 mt-4 flex items-center justify-between text-[11px] text-gray-400">
                          <span>Dianalisis secara otomatis berdasarkan data Firestore</span>
                          <span className="font-bold text-[#531FFF]">Kurikulum Merdeka</span>
                        </div>
                      </div>
                    </div>

                  </div>
                )}

              </>
            ) : (
              <div className="bg-white rounded-lg border border-gray-100 p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
                <GraduationCap className="w-10 h-10 text-gray-300" />
                <p className="text-sm font-semibold text-gray-600">
                  {isGuru && teacherHomeroomClasses.length === 0
                    ? "Anda belum ditugaskan sebagai Wali Kelas. Hubungi Administrator untuk penugasan kelas."
                    : filteredStudents.length === 0
                      ? "Tidak ada data siswa pada kelas binaan Anda."
                      : "Pilih siswa dari daftar di samping untuk melihat lembar Rapor Digital."}
                </p>
              </div>
            )}

          </div>

        </div>
      )}

      {/* PRINT-READY OFFICIAL REPORT CARD MODAL */}
      {isPrintModalOpen && currentStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar p-8 text-gray-900 font-sans print-area">

            {/* Modal Controls */}
            <div className="flex justify-between items-center pb-6 border-b border-gray-200 no-print">
              <div className="flex items-center gap-2">
                <School className="w-5 h-5 text-[#531FFF]" />
                <h3 className="font-extrabold text-base">Pratinjau Cetak Rapor Digital Official</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 bg-[#531FFF] hover:bg-[#531FFF]/90 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-xs"
                >
                  <Printer className="w-4 h-4" /> Cetak / Download PDF
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg"
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* Printable Document Sheet */}
            <div className="pt-6 space-y-6">

              {/* KOP SEKOLAH */}
              <div className="text-center border-b-2 border-gray-900 pb-4 relative">
                {schoolProfile?.logoUrl && (
                  <div className="w-16 h-16 absolute left-2 top-0 overflow-hidden hidden sm:flex items-center justify-center">
                    <Image src={schoolProfile.logoUrl} alt="Logo Sekolah" width={64} height={64} className="object-contain" unoptimized />
                  </div>
                )}
                <h2 className="text-2xl font-extrabold tracking-widest text-gray-900 uppercase">
                  {schoolProfile?.schoolName || "SMA QUICK SCHOOLS INDONESIA"}
                </h2>
                <p className="text-xs font-medium text-gray-600 mt-1">
                  {schoolProfile?.address ? `${schoolProfile.address}, ${schoolProfile.city || ""}` : "Jl. Pendidikan No. 45, Jakarta Selatan"} · Telp: {schoolProfile?.phone || "(021) 7890123"} · Website: {schoolProfile?.website || "www.quickschools.sch.id"}
                </p>
                <p className="text-xs font-bold text-gray-800 uppercase mt-2 tracking-wider">
                  LAPORAN HASIL BELAJAR (RAPOR DIGITAL SISWA) · TAHUN AJARAN {academicYear}
                </p>
              </div>

              {/* Student Metadata */}
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold bg-gray-50 p-4 rounded-lg border border-gray-300">
                <div className="space-y-1.5">
                  <p><span className="text-gray-500 font-normal">Nama Siswa:</span> <span className="font-extrabold text-gray-900">{currentStudent.name}</span></p>
                  <p><span className="text-gray-500 font-normal">NISN:</span> <span className="font-bold text-gray-800">{getStudentNisn(currentStudent)}</span></p>
                  <p><span className="text-gray-500 font-normal">Sekolah:</span> {schoolProfile?.schoolName || "SMA Quick Schools Indonesia"}</p>
                  <p><span className="text-gray-500 font-normal">Program Keahlian:</span> <span className="font-bold text-gray-800">{studentMajor || "Umum"}</span></p>
                </div>
                <div className="space-y-1.5">
                  <p><span className="text-gray-500 font-normal">Kelas / Fase:</span> <span className="font-bold text-gray-800">{currentStudent.classId || "-"}</span></p>
                  <p><span className="text-gray-500 font-normal">Semester:</span> <span className="font-bold text-gray-800">{semester}</span></p>
                  <p><span className="text-gray-500 font-normal">NPSN:</span> <span className="font-bold text-gray-800">{schoolProfile?.npsn || "-"}</span></p>
                </div>
              </div>

              {/* Subject Table */}
              <div>
                <h4 className="font-bold text-xs uppercase mb-2 text-gray-800 tracking-wider">A. CAPAIAN AKADEMIK & KOMPETENSI</h4>
                <table className="w-full border-collapse border border-gray-300 text-xs text-left">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-300 font-bold text-gray-800">
                      <th className="border border-gray-300 p-2 text-center w-8">No</th>
                      <th className="border border-gray-300 p-2 w-48">Mata Pelajaran</th>
                      <th className="border border-gray-300 p-2 text-center w-12">KKM</th>
                      <th className="border border-gray-300 p-2 text-center w-12">Nilai</th>
                      <th className="border border-gray-300 p-2 text-center w-12">Predikat</th>
                      <th className="border border-gray-300 p-2">Deskripsi Capaian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedSubjectScores.map((group, gIdx) => (
                      <React.Fragment key={group.groupId || gIdx}>
                        <tr className="bg-gray-100 font-bold border-y-2 border-gray-400">
                          <td colSpan={6} className="border border-gray-300 p-2 text-xs uppercase tracking-wide text-gray-900 bg-gray-100">
                            {group.groupCode ? `${group.groupCode}. ` : ""}{group.groupName}
                            {group.groupMajor && group.groupMajor !== "Semua Jurusan / Umum" ? ` - KONSENTRASI KEAHLIAN ${group.groupMajor.toUpperCase()}` : ""}
                          </td>
                        </tr>
                        {group.subjects.map((s, i) => (
                          <tr key={`${group.groupId}-${i}`} className="border-b border-gray-200">
                            <td className="border border-gray-300 p-2 text-center font-medium">{i + 1}</td>
                            <td className="border border-gray-300 p-2 font-bold text-gray-900">
                              {s.name}
                              {s.code && <span className="text-[10px] text-gray-500 font-normal ml-1">({s.code})</span>}
                            </td>
                            <td className="border border-gray-300 p-2 text-center">{s.kkm}</td>
                            <td className="border border-gray-300 p-2 text-center font-extrabold">{s.hasData ? s.score : "-"}</td>
                            <td className="border border-gray-300 p-2 text-center font-bold">{s.predicate}</td>
                            <td className="border border-gray-300 p-2 leading-tight text-[11px]">{s.description}</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                    {groupedSubjectScores.length === 0 && (
                      <tr>
                        <td colSpan={6} className="border border-gray-300 p-4 text-center text-gray-400">
                          Belum ada data nilai mata pelajaran untuk siswa ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Attitude & Attendance Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="border border-gray-300 rounded-lg p-3">
                  <h4 className="font-bold uppercase mb-2 text-gray-800">B. PENILAIAN SIKAP & KARAKTER</h4>
                  <p><span className="font-bold">1. Sikap Spiritual:</span> <span className="font-extrabold">{spiritualAttitude}</span></p>
                  <p className="text-[11px] text-gray-600 italic mt-0.5 mb-2">"{spiritualDesc}"</p>
                  <p><span className="font-bold">2. Sikap Sosial:</span> <span className="font-extrabold">{socialAttitude}</span></p>
                  <p className="text-[11px] text-gray-600 italic mt-0.5">"{socialDesc}"</p>
                </div>

                <div className="border border-gray-300 rounded-lg p-3">
                  <h4 className="font-bold uppercase mb-2 text-gray-800">C. KETIDAKHADIRAN (PRESENSI)</h4>
                  <div className="space-y-1">
                    <p>Sakit: <span className="font-bold">{sickCount}</span> hari</p>
                    <p>Izin: <span className="font-bold">{permitCount}</span> hari</p>
                    <p>Tanpa Keterangan: <span className="font-bold">{alphaCount}</span> hari</p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-gray-200 font-bold text-[11px] text-gray-700">
                    Tingkat Kehadiran: {attendanceRate}%
                  </div>
                </div>
              </div>

              {/* Extracurriculars */}
              <div className="border border-gray-300 rounded-lg p-3 text-xs">
                <h4 className="font-bold uppercase mb-2 text-gray-800">D. KEGIATAN EKSTRAKURIKULER</h4>
                <table className="w-full border-collapse border border-gray-300 text-xs text-left">
                  <thead>
                    <tr className="bg-gray-100 font-bold text-gray-800">
                      <th className="border border-gray-300 p-1.5 w-8 text-center">No</th>
                      <th className="border border-gray-300 p-1.5 w-48">Kegiatan Ekstrakurikuler</th>
                      <th className="border border-gray-300 p-1.5 text-center w-16">Nilai</th>
                      <th className="border border-gray-300 p-1.5">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extraCurriculars.map((ex, exI) => (
                      <tr key={exI}>
                        <td className="border border-gray-300 p-1.5 text-center">{exI + 1}</td>
                        <td className="border border-gray-300 p-1.5 font-bold">{ex.name}</td>
                        <td className="border border-gray-300 p-1.5 text-center font-bold">{ex.grade}</td>
                        <td className="border border-gray-300 p-1.5">{ex.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Teacher Notes & Promotion Decision */}
              <div className="border border-gray-300 rounded-lg p-4 text-xs space-y-2">
                <h4 className="font-bold uppercase text-gray-800">E. CATATAN & KEPUTUSAN WALI KELAS</h4>
                <p className="italic leading-relaxed text-gray-800">"{teacherNotes}"</p>
                {promotionStatus && (
                  <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-700">Keputusan Akhir Semester:</span>
                    <span className="font-extrabold text-[#531FFF] bg-[#531FFF]/10 px-2.5 py-0.5 rounded border border-[#531FFF]/20">
                      {promotionStatus}
                    </span>
                  </div>
                )}
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-3 text-center text-xs pt-8 border-t border-gray-300">
                <div>
                  <p>Orang Tua / Wali Siswa</p>
                  <div className="h-14" />
                  <p className="font-bold border-b border-gray-400 inline-block px-4">( ........................................ )</p>
                </div>
                <div>
                  <p>Mengetahui,</p>
                  <p>Kepala Sekolah</p>
                  <div className="h-14" />
                  <p className="font-bold border-b border-gray-400 inline-block px-4">
                    {schoolProfile?.principalName || "Dr. Danur Adhi, M.Pd"}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {schoolProfile?.principalNip ? `NIP. ${schoolProfile.principalNip}` : "NIP. 19750812 200003 1 002"}
                  </p>
                </div>
                <div>
                  <p>Jakarta, {decisionDate}</p>
                  <p>Wali Kelas</p>
                  <div className="h-14" />
                  <p className="font-bold border-b border-gray-400 inline-block px-4">{customHomeroomName || homeroomTeacher?.name || "Drs. Taufik Hidayat, M.Pd."}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">NIP. {customHomeroomNip || homeroomTeacher?.nip || "-"}</p>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Custom print CSS */}
      <style dangerouslySetInnerHTML={{
        __html: `
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
