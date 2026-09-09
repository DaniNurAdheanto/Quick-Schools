"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Award, Search, Printer, Save, CheckCircle2, 
  BookOpen, FileText, Sparkles, 
  Loader2, Edit3, ShieldCheck, Check, Calendar, School, Trash2,
  BarChart3, TrendingUp, Database, RefreshCw, Plus
} from "lucide-react";
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, RadarChart, 
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Cell, Legend
} from "recharts";
import { collection, onSnapshot, doc, setDoc, addDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { AlertBox, AlertType } from "@/components/ui/alert-box";
import { useUnifiedStudents } from "@/hooks/use-unified-students";

// Standard Indonesian Curriculum Subject Presets (Kurikulum Merdeka & Nasional)
const STANDARD_SUBJECT_PRESETS = [
  { code: "PAI", name: "Pendidikan Agama & Budi Pekerti", category: "Kelompok A (Wajib / Umum)", kkm: 75 },
  { code: "PKN", name: "Pendidikan Pancasila (PPKn)", category: "Kelompok A (Wajib / Umum)", kkm: 75 },
  { code: "BIN", name: "Bahasa Indonesia", category: "Kelompok A (Wajib / Umum)", kkm: 75 },
  { code: "MAT", name: "Matematika Wajib", category: "Kelompok A (Wajib / Umum)", kkm: 75 },
  { code: "BIG", name: "Bahasa Inggris", category: "Kelompok A (Wajib / Umum)", kkm: 75 },
  { code: "SEJ", name: "Sejarah Indonesia", category: "Kelompok A (Wajib / Umum)", kkm: 75 },
  { code: "PJK", name: "Pendidikan Jasmani (PJOK)", category: "Kelompok B (Umum / Terapan)", kkm: 75 },
  { code: "SNB", name: "Seni Budaya & Prakarya", category: "Kelompok B (Umum / Terapan)", kkm: 75 },
  { code: "INF", name: "Informatika", category: "Kelompok B (Umum / Terapan)", kkm: 75 },
  { code: "FIS", name: "Fisika", category: "Kelompok C (Peminatan MIPA)", kkm: 75 },
  { code: "KIM", name: "Kimia", category: "Kelompok C (Peminatan MIPA)", kkm: 75 },
  { code: "BIO", name: "Biologi", category: "Kelompok C (Peminatan MIPA)", kkm: 75 },
  { code: "MTL", name: "Matematika Tingkat Lanjut", category: "Kelompok C (Peminatan MIPA)", kkm: 75 },
  { code: "EKO", name: "Ekonomi", category: "Kelompok C (Peminatan IPS)", kkm: 75 },
  { code: "GEO", name: "Geografi", category: "Kelompok C (Peminatan IPS)", kkm: 75 },
  { code: "SOS", name: "Sosiologi", category: "Kelompok C (Peminatan IPS)", kkm: 75 },
  { code: "BHD", name: "Bahasa Daerah", category: "Muatan Lokal", kkm: 75 },
  { code: "PLH", name: "Pendidikan Lingkungan Hidup", category: "Muatan Lokal", kkm: 75 }
];

function normalizeSubjectName(rawName: string): string {
  if (!rawName) return "";
  const trimmed = rawName.trim();
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
  const [teachers, setTeachers] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [reportCardsData, setReportCardsData] = useState<Record<string, any>>({});
  const [isSyncingSubjects, setIsSyncingSubjects] = useState(false);
  
  const [userRole, setUserRole] = useState<string>("admin");
  const [userEmail, setUserEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  
  const [selectedClass, setSelectedClass] = useState<string>("All");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [semester, setSemester] = useState<string>("Ganjil");
  const [academicYear, setAcademicYear] = useState<string>("2025/2026");

  const [activeTab, setActiveTab] = useState<"report" | "analytics">("report");

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
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const isStudentRole = userRole === "student" || userRole === "siswa";

  // Check auth & user role
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

    const unsubTeachers = onSnapshot(collection(db, "teachers"), (snap) => {
      setTeachers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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
      unsubTeachers();
      unsubSchedules();
      unsubAttendance();
      unsubReportCards();
    };
  }, []);

  // Initialize selectedStudentId when students load
  useEffect(() => {
    if (students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0]._firestoreId || students[0].uid || students[0].id);
    }
  }, [students, selectedStudentId]);

  // Auto-select student if student role
  useEffect(() => {
    if (isStudentRole && students.length > 0 && userEmail) {
      const matchingStudent = students.find(s => 
        (s.email && s.email.toLowerCase() === userEmail.toLowerCase()) ||
        (s.name && userEmail.toLowerCase().includes(s.name.toLowerCase().split(' ')[0]))
      );
      if (matchingStudent) {
        setSelectedStudentId(matchingStudent._firestoreId || matchingStudent.uid || matchingStudent.id);
      }
    }
  }, [isStudentRole, students, userEmail]);

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchClass = selectedClass === "All" || s.classId === selectedClass || s.className === selectedClass;
      const nisnVal = getStudentNisn(s).toLowerCase();
      const matchQuery = !searchQuery || 
        (s.name && s.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.fullName && s.fullName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.id && s.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
        nisnVal.includes(searchQuery.toLowerCase());
      return matchClass && matchQuery;
    });
  }, [students, selectedClass, searchQuery]);

  // Selected Student Object (Resilient lookup across _firestoreId, uid, id, and nisn)
  const currentStudent = useMemo(() => {
    if (!students || students.length === 0) return null;
    return students.find(s => 
      (s._firestoreId && s._firestoreId === selectedStudentId) ||
      (s.uid && s.uid === selectedStudentId) ||
      (s.id && s.id === selectedStudentId) ||
      (s.nisn && s.nisn === selectedStudentId)
    ) || filteredStudents[0] || students[0] || null;
  }, [students, selectedStudentId, filteredStudents]);

  // Dynamic Homeroom Teacher lookup from classes and teachers collections
  const homeroomTeacher = useMemo(() => {
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
  }, [currentStudent, classes, teachers]);

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

  // Calculate Subject Averages & Predicates for Current Student (Fully Synchronized with Database)
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

    // Gather ALL subjects belonging to the database curriculum:
    // 1. All subjects from master 'subjects' collection
    // 2. All subjects scheduled in 'schedules' for this student's class
    // 3. All subjects recorded in 'grades' for this student's class or this student
    const allDbSubjectNames = new Set<string>();

    subjects.forEach(s => {
      if (s.name) {
        allDbSubjectNames.add(normalizeSubjectName(s.name));
      }
    });

    if (currentStudent.classId) {
      schedules.forEach(sc => {
        if (
          sc.subject && 
          (sc.classId === currentStudent.classId || sc.className === currentStudent.classId || sc.class === currentStudent.classId)
        ) {
          allDbSubjectNames.add(normalizeSubjectName(sc.subject));
        }
      });

      grades.forEach(g => {
        if (
          g.subject && 
          (g.classId === currentStudent.classId || g.className === currentStudent.classId || g.class === currentStudent.classId)
        ) {
          allDbSubjectNames.add(normalizeSubjectName(g.subject));
        }
      });
    }

    // Always include subjects the student has grades in
    Object.keys(subjectGradeMap).forEach(s => allDbSubjectNames.add(s));

    // Ensure common core subjects are covered if DB is still newly initialized
    if (allDbSubjectNames.size < 3) {
      ["Pendidikan Agama & Budi Pekerti", "Pendidikan Pancasila (PPKn)", "Bahasa Indonesia", "Matematika Wajib", "Bahasa Inggris", "Sejarah Indonesia", "Seni Budaya & Prakarya"].forEach(s => {
        allDbSubjectNames.add(s);
      });
    }

    const formatCategory = (rawCat?: string, subjName: string = "") => {
      if (rawCat) {
        const lower = rawCat.toLowerCase();
        if (lower === "wajib" || lower.includes("kelompok a")) return "Kelompok A (Wajib / Umum)";
        if (lower.includes("kelompok b") || lower.includes("terapan") || lower.includes("seni") || lower.includes("jasmani")) return "Kelompok B (Umum / Terapan)";
        if (lower === "peminatan" || lower.includes("kelompok c")) return "Kelompok C (Peminatan)";
        if (lower.includes("muatan lokal")) return "Muatan Lokal";
        return rawCat;
      }
      const preset = STANDARD_SUBJECT_PRESETS.find(p => p.name.toLowerCase() === subjName.toLowerCase());
      if (preset) return preset.category;
      if (["Matematika", "Bahasa Indonesia", "Bahasa Inggris", "Agama", "PPKn", "Pancasila", "Sejarah"].some(w => subjName.includes(w))) {
        return "Kelompok A (Wajib / Umum)";
      }
      if (["Fisika", "Kimia", "Biologi", "Ekonomi", "Geografi", "Sosiologi"].some(w => subjName.includes(w))) {
        return "Kelompok C (Peminatan)";
      }
      return "Kelompok B (Umum / Terapan)";
    };

    const getCategoryPriority = (cat: string) => {
      if (cat.includes("Kelompok A")) return 1;
      if (cat.includes("Kelompok B")) return 2;
      if (cat.includes("Kelompok C")) return 3;
      if (cat.includes("Muatan Lokal")) return 4;
      return 5;
    };

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

      const masterSubj = subjects.find(
        s => normalizeSubjectName(s.name).toLowerCase() === subjName.toLowerCase() ||
             (s.code && s.code.toLowerCase() === subjName.toLowerCase())
      );
      const presetSubj = STANDARD_SUBJECT_PRESETS.find(p => p.name.toLowerCase() === subjName.toLowerCase());

      const kkm = masterSubj?.kkm || presetSubj?.kkm || 75;
      const category = formatCategory(masterSubj?.category || presetSubj?.category, subjName);
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
        category,
        categoryOrder: getCategoryPriority(category),
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

    // Sort by Category Priority (Kelompok A -> Kelompok B -> Kelompok C -> Mulok), then alphabetically
    return subjectList.sort((a, b) => {
      if (a.categoryOrder !== b.categoryOrder) {
        return a.categoryOrder - b.categoryOrder;
      }
      return a.name.localeCompare(b.name);
    });
  }, [currentStudent, grades, subjects, schedules, subjectNotes, semester, academicYear]);

  // Check subjects in Section A that do not yet exist as documents in Firestore 'subjects' collection
  const missingSubjects = useMemo(() => {
    return studentSubjectScores.filter(s => !s.inMasterDb);
  }, [studentSubjectScores]);

  // One-click sync to create missing subjects in Firestore 'subjects' collection
  const handleSyncMissingSubjectsToMaster = async () => {
    if (missingSubjects.length === 0) return;
    setIsSyncingSubjects(true);
    try {
      for (const subj of missingSubjects) {
        const preset = STANDARD_SUBJECT_PRESETS.find(p => p.name.toLowerCase() === subj.name.toLowerCase());
        await addDoc(collection(db, "subjects"), {
          code: subj.code || preset?.code || subj.name.slice(0, 3).toUpperCase(),
          name: subj.name,
          category: subj.category.includes("Wajib") ? "Wajib" : subj.category.includes("Peminatan") ? "Peminatan" : "Muatan Lokal",
          creditHours: "3 JP",
          level: "Semua Tingkat",
          kkm: subj.kkm || 75,
          icon: "📚",
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
    setSickCount(dbAttendanceStats.sick);
    setPermitCount(dbAttendanceStats.permit);
    setAlphaCount(dbAttendanceStats.alpha);
    triggerAlert("success", `Data presensi berhasil disinkronkan dari database presensi harian (${dbAttendanceStats.total} log: ${dbAttendanceStats.present} Hadir, ${dbAttendanceStats.sick} Sakit, ${dbAttendanceStats.permit} Izin, ${dbAttendanceStats.alpha} Alpa).`, "Sinkronisasi Berhasil");
  };

  // Save Complete Report Card to Firestore (Unified Single Save Button)
  const handleSaveReportCard = async () => {
    if (!currentStudent || !reportDocKey || isStudentRole) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const studentNisn = getStudentNisn(currentStudent);

      await setDoc(doc(db, "reportCards", reportDocKey), {
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
        updatedAt: serverTimestamp()
      }, { merge: true });

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);

      triggerAlert("edit", `Data Rapor Digital untuk siswa ${currentStudent.name} (NISN: ${studentNisn}) berhasil disimpan ke database!`, "Rapor Siswa Tersimpan");
    } catch (err: any) {
      console.error("Error saving report card:", err);
      triggerAlert("error", `Gagal menyimpan data Rapor Digital: ${err?.message || "Terjadi kesalahan"}`, "Gagal");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddExtra = (presetName?: string) => {
    const name = presetName || "Ekstrakurikuler Baru";
    setExtraCurriculars(prev => [...prev, { name, grade: "A", desc: "Aktif dan menunjukkan perkembangan positif." }]);
  };

  const handleUpdateExtra = (index: number, field: string, value: string) => {
    setExtraCurriculars(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveExtra = (idx: number) => {
    setExtraCurriculars(prev => prev.filter((_, i) => i !== idx));
  };

  // Quick preset teacher notes
  const applyPresetNote = (noteText: string) => {
    setTeacherNotes(noteText);
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
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Rapor Digital Siswa</h1>
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#531FFF]/10 text-[#531FFF] border border-[#531FFF]/20">
              Kurikulum Merdeka / K13
            </span>
            {isStudentRole && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                Mode Siswa (Read-Only)
              </span>
            )}
          </div>
          <p className="text-gray-500 text-xs md:text-sm font-medium mt-1">
            Laporan hasil penilaian, evaluasi akademik terpadu, capaian kompetensi, dan grafik performa siswa.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Tab Nav Buttons */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab("report")}
              className={cn(
                "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                activeTab === "report" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Lembar Rapor</span>
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={cn(
                "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                activeTab === "analytics" ? "bg-white text-[#531FFF] shadow-xs" : "text-gray-500 hover:text-gray-900"
              )}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Grafik Performa</span>
            </button>
          </div>

          <button
            onClick={() => setIsPrintModalOpen(true)}
            disabled={!currentStudent}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-[0.98] cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Rapor (PDF)</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4 mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Class Filter */}
          {!isStudentRole && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500">Kelas:</span>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-800 text-xs font-bold rounded-xl py-2 px-3 focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
              >
                <option value="All">Semua Kelas ({classes.length})</option>
                {classes.map(c => (
                  <option key={c.id || c.name} value={c.name}>Kelas {c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Semester Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500">Semester:</span>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-800 text-xs font-bold rounded-xl py-2 px-3 focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
            >
              <option value="Ganjil">Semester Ganjil</option>
              <option value="Genap">Semester Genap</option>
            </select>
          </div>

          {/* Academic Year Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500">Tahun Ajaran:</span>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-800 text-xs font-bold rounded-xl py-2 px-3 focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
            >
              <option value="2025/2026">2025/2026</option>
              <option value="2024/2025">2024/2025</option>
            </select>
          </div>
        </div>

        {/* Student Search */}
        {!isStudentRole && (
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama / NISN siswa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
            />
          </div>
        )}
      </div>

      {(loading || studentsLoading) ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 flex flex-col items-center justify-center text-gray-500 flex-1 min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-[#531FFF] mb-3" />
          <p className="text-sm font-medium">Memuat data Rapor Digital...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
          
          {/* LEFT SIDEBAR: Student List (3.5 cols) - Hidden for Student Role */}
          {!isStudentRole && (
            <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 shadow-xs flex flex-col overflow-hidden h-fit max-h-[800px]">
              <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <h3 className="font-bold text-xs text-gray-700 uppercase tracking-wider">Daftar Siswa ({filteredStudents.length})</h3>
                <span className="text-[11px] text-gray-400 font-medium">Klik untuk ganti siswa</span>
              </div>

              <div className="p-2 space-y-1 overflow-y-auto custom-scrollbar flex-1 max-h-[680px]">
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

                  return (
                    <button
                      key={student._firestoreId || student.uid || student.id}
                      onClick={() => setSelectedStudentId(student._firestoreId || student.uid || student.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-xl transition-all flex items-center justify-between gap-3 group border cursor-pointer",
                        isSelected 
                          ? "bg-[#531FFF] text-white border-[#531FFF] shadow-md shadow-[#531FFF]/20" 
                          : "bg-white border-transparent hover:bg-gray-50 hover:border-gray-200 text-gray-800"
                      )}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <div className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border transition-all",
                          isSelected ? "bg-white/20 border-white/30 text-white" : "bg-blue-50 border-blue-100 text-blue-700"
                        )}>
                          {student.name ? student.name.charAt(0) : "S"}
                        </div>
                        <div className="truncate">
                          <h4 className="font-bold text-xs truncate leading-tight">{student.name}</h4>
                          <p className={cn("text-[11px] font-medium mt-0.5", isSelected ? "text-white/80" : "text-gray-400")}>
                            NISN: {studentNisn} · Kelas {student.classId || student.className || "-"}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={cn(
                          "inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold",
                          isSelected 
                            ? "bg-white/20 text-white" 
                            : avg >= 75 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                        )}>
                          Rata: {avg}
                        </span>
                      </div>
                    </button>
                  );
                })}

                {filteredStudents.length === 0 && (
                  <div className="p-8 text-center text-gray-400 text-xs font-medium">
                    Siswa tidak ditemukan.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* RIGHT CONTENT AREA: Report Cards or Analytics */}
          <div className={cn(
            "flex flex-col gap-6",
            isStudentRole ? "lg:col-span-12" : "lg:col-span-8"
          )}>
            
            {currentStudent ? (
              <>
                {/* Student Profile Overview Card */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#531FFF]/10 via-[#531FFF]/5 to-transparent rounded-bl-full pointer-events-none" />
                  
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 via-[#531FFF] to-indigo-700 text-white flex items-center justify-center font-extrabold text-2xl shadow-lg shadow-[#531FFF]/20 shrink-0">
                        {currentStudent.name ? currentStudent.name.charAt(0) : "S"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl font-extrabold text-gray-900">{currentStudent.name}</h2>
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border",
                            isOverallPassed ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"
                          )}>
                            {isOverallPassed ? "Tuntas KKM" : "Perlu Bimbingan"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 font-medium mt-1">
                          NISN: <span className="font-bold text-gray-800">{getStudentNisn(currentStudent)}</span> · 
                          Kelas: <span className="font-bold text-gray-800">{currentStudent.classId || currentStudent.className || "-"}</span> · 
                          Tahun Ajaran: <span className="font-bold text-gray-800">{academicYear} ({semester})</span>
                        </p>
                      </div>
                    </div>

                    {/* Stats Metric Cards & Quick Save Button */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                      <div className="grid grid-cols-3 gap-2 w-full md:w-auto bg-gray-50 p-2.5 rounded-xl border border-gray-200/80">
                        <div className="text-center px-3 py-1 border-r border-gray-200">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Rata-rata</span>
                          <p className="text-lg font-extrabold text-[#531FFF]">{overallAverage}</p>
                        </div>
                        <div className="text-center px-3 py-1 border-r border-gray-200">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Peringkat</span>
                          <p className="text-lg font-extrabold text-gray-900">
                            #{studentRank.rank} <span className="text-xs font-normal text-gray-400">/ {studentRank.totalInClass}</span>
                          </p>
                        </div>
                        <div className="text-center px-3 py-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Kehadiran</span>
                          <p className="text-lg font-extrabold text-emerald-600">{attendanceRate}%</p>
                        </div>
                      </div>

                      {!isStudentRole && (
                        <button
                          type="button"
                          onClick={handleSaveReportCard}
                          disabled={isSaving || !currentStudent}
                          className="flex items-center justify-center gap-2 bg-[#531FFF] hover:bg-[#531FFF]/90 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-[#531FFF]/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 cursor-pointer shrink-0"
                          title={`Simpan seluruh nilai dan catatan rapor khusus untuk siswa ${currentStudent.name}`}
                        >
                          {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : saveSuccess ? (
                            <Check className="w-4 h-4 text-emerald-300" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          <span>{saveSuccess ? "Tersimpan!" : "Simpan Rapor Siswa"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* TAB 1: LEMBAR RAPOR UTAMA */}
                {activeTab === "report" && (
                  <div className="space-y-6">
                    
                    {/* Section A: Capaian Hasil Belajar Akademik */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                      <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-[#531FFF]" />
                          <h3 className="font-bold text-xs text-gray-800 uppercase tracking-wider">A. Capaian Hasil Belajar Akademik</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 font-medium bg-white px-2.5 py-1 rounded-lg border border-gray-200">
                            {studentSubjectScores.length} Mata Pelajaran
                          </span>
                          {!isStudentRole && missingSubjects.length > 0 && (
                            <button
                              onClick={handleSyncMissingSubjectsToMaster}
                              disabled={isSyncingSubjects}
                              className="text-[11px] font-bold text-[#531FFF] bg-[#531FFF]/10 hover:bg-[#531FFF]/20 border border-[#531FFF]/20 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              title="Simpan mata pelajaran kurikulum ini ke master collection subjects di database"
                            >
                              {isSyncingSubjects ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Sparkles className="w-3 h-3" />
                              )}
                              <span>Sinkronkan {missingSubjects.length} Mapel ke DB</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
                              <th className="py-3 px-4 w-12 text-center">No</th>
                              <th className="py-3 px-4">Mata Pelajaran</th>
                              <th className="py-3 px-4 text-center">KKM</th>
                              <th className="py-3 px-4 text-center">Nilai Akhir</th>
                              <th className="py-3 px-4 text-center">Predikat</th>
                              <th className="py-3 px-4 min-w-[240px]">Capaian Kompetensi / Catatan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 font-medium">
                            {studentSubjectScores.map((item, idx) => (
                              <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                <td className="py-3 px-4 text-center text-gray-400">{idx + 1}</td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-900">{item.name}</span>
                                    {item.code && (
                                      <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                        {item.code}
                                      </span>
                                    )}
                                  </div>
                                  <span className={cn(
                                    "inline-block px-2 py-0.5 rounded text-[9px] font-semibold mt-0.5 border",
                                    item.category.includes("Kelompok A") ? "bg-purple-50 text-purple-700 border-purple-200" :
                                    item.category.includes("Kelompok B") ? "bg-blue-50 text-blue-700 border-blue-200" :
                                    item.category.includes("Kelompok C") ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                    "bg-amber-50 text-amber-700 border-amber-200"
                                  )}>
                                    {item.category}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center font-semibold text-gray-600">{item.kkm}</td>
                                <td className="py-3 px-4 text-center font-extrabold text-sm text-gray-900">
                                  {item.hasData ? item.score : <span className="text-gray-300 font-normal">-</span>}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  {item.hasData ? (
                                    <span className={cn(
                                      "inline-block px-2.5 py-0.5 rounded-md font-extrabold text-xs border",
                                      item.predicate === "A" && "bg-emerald-50 text-emerald-800 border-emerald-200",
                                      item.predicate === "B" && "bg-blue-50 text-blue-800 border-blue-200",
                                      item.predicate === "C" && "bg-amber-50 text-amber-800 border-amber-200",
                                      item.predicate === "D" && "bg-red-50 text-red-800 border-red-200"
                                    )}>
                                      {item.predicate}
                                    </span>
                                  ) : (
                                    <span className="text-gray-300 font-bold">-</span>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  {isStudentRole ? (
                                    <p className="text-xs text-gray-600 leading-relaxed italic">{item.description}</p>
                                  ) : (
                                    <textarea
                                      rows={2}
                                      value={subjectNotes[item.name] ?? item.description}
                                      onChange={(e) => setSubjectNotes(prev => ({ ...prev, [item.name]: e.target.value }))}
                                      className="w-full p-2 text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                                    />
                                  )}
                                </td>
                              </tr>
                            ))}

                            {studentSubjectScores.length === 0 && (
                              <tr>
                                <td colSpan={6} className="py-8 text-center text-gray-400 text-xs">
                                  Belum ada data nilai mata pelajaran untuk siswa ini.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Section B & C: Sikap & Ketidakhadiran */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Section B: Penilaian Sikap & Karakter */}
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between border-b border-gray-100 pb-3 gap-2">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4 text-[#531FFF]" />
                              <h3 className="font-bold text-xs text-gray-800 uppercase tracking-wider">B. Penilaian Sikap & Karakter</h3>
                            </div>
                          </div>

                          <div className="space-y-4 mt-3">
                            {/* Sikap Spiritual */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-bold text-gray-700">1. Sikap Spiritual</label>
                                <select
                                  disabled={isStudentRole}
                                  value={spiritualAttitude}
                                  onChange={(e) => setSpiritualAttitude(e.target.value)}
                                  className="px-2.5 py-1 text-xs font-bold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20 disabled:opacity-80"
                                >
                                  <option value="Sangat Baik">Sangat Baik (A)</option>
                                  <option value="Baik">Baik (B)</option>
                                  <option value="Cukup">Cukup (C)</option>
                                  <option value="Perlu Bimbingan">Perlu Bimbingan (D)</option>
                                </select>
                              </div>

                              {!isStudentRole && (
                                <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                                  <span className="text-[10px] text-gray-400 font-medium">Preset:</span>
                                  <button
                                    type="button"
                                    onClick={() => setSpiritualDesc("Terbiasa berdoa sebelum/sesudah belajar, taat menjalankan ibadah sesuai keyakinan, dan menunjukkan toleransi tinggi.")}
                                    className="text-[10px] font-medium text-[#531FFF] bg-[#531FFF]/5 hover:bg-[#531FFF]/15 px-2 py-0.5 rounded border border-[#531FFF]/20 transition-colors"
                                  >
                                    Taat Ibadah & Toleransi
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setSpiritualDesc("Menunjukkan keimanan dan ketakwaan yang teguh, berakhlak mulia kepada sesama, serta bersyukur dalam setiap keadaan.")}
                                    className="text-[10px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition-colors"
                                  >
                                    Beriman & Bertakwa
                                  </button>
                                </div>
                              )}

                              <textarea
                                rows={2}
                                disabled={isStudentRole}
                                value={spiritualDesc}
                                onChange={(e) => setSpiritualDesc(e.target.value)}
                                placeholder="Deskripsi perkembangan sikap spiritual siswa..."
                                className="w-full p-2.5 text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20 disabled:opacity-80 leading-relaxed"
                              />
                            </div>

                            {/* Sikap Sosial */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-bold text-gray-700">2. Sikap Sosial</label>
                                <select
                                  disabled={isStudentRole}
                                  value={socialAttitude}
                                  onChange={(e) => setSocialAttitude(e.target.value)}
                                  className="px-2.5 py-1 text-xs font-bold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20 disabled:opacity-80"
                                >
                                  <option value="Sangat Baik">Sangat Baik (A)</option>
                                  <option value="Baik">Baik (B)</option>
                                  <option value="Cukup">Cukup (C)</option>
                                  <option value="Perlu Bimbingan">Perlu Bimbingan (D)</option>
                                </select>
                              </div>

                              {!isStudentRole && (
                                <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                                  <span className="text-[10px] text-gray-400 font-medium">Preset:</span>
                                  <button
                                    type="button"
                                    onClick={() => setSocialDesc("Sangat santun dalam bertutur kata, berjiwa gotong royong, peduli terhadap teman, dan disiplin dalam mengerjakan tugas.")}
                                    className="text-[10px] font-medium text-[#531FFF] bg-[#531FFF]/5 hover:bg-[#531FFF]/15 px-2 py-0.5 rounded border border-[#531FFF]/20 transition-colors"
                                  >
                                    Gotong Royong & Santun
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setSocialDesc("Memiliki kemandirian dan rasa tanggung jawab tinggi, aktif dalam kerja kelompok, serta bernalar kritis.")}
                                    className="text-[10px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 transition-colors"
                                  >
                                    Mandiri & Bertanggung Jawab
                                  </button>
                                </div>
                              )}

                              <textarea
                                rows={2}
                                disabled={isStudentRole}
                                value={socialDesc}
                                onChange={(e) => setSocialDesc(e.target.value)}
                                placeholder="Deskripsi perkembangan sikap sosial siswa..."
                                className="w-full p-2.5 text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20 disabled:opacity-80 leading-relaxed"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section C: Ketidakhadiran (Presensi) */}
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between border-b border-gray-100 pb-3 gap-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-[#531FFF]" />
                              <h3 className="font-bold text-xs text-gray-800 uppercase tracking-wider">C. Ketidakhadiran (Presensi)</h3>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                {attendanceRate}% Kehadiran
                              </span>

                              {!isStudentRole && (
                                <button
                                  type="button"
                                  onClick={handleSyncAttendanceFromDb}
                                  className="text-[10px] font-bold text-[#531FFF] bg-[#531FFF]/10 hover:bg-[#531FFF]/20 px-2.5 py-1 rounded-lg border border-[#531FFF]/20 transition-all flex items-center gap-1 cursor-pointer"
                                  title="Tarik & cocokkan ulang data dari log absensi harian"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  <span>Tarik Presensi DB</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Live DB Attendance Sync Banner */}
                          <div className="mt-3 bg-gradient-to-r from-blue-50/80 to-purple-50/80 p-3 rounded-xl border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2">
                              <Database className="w-4 h-4 text-[#531FFF] shrink-0" />
                              <div className="text-[11px]">
                                <span className="font-bold text-gray-800 block">Database Presensi Harian Terdeteksi</span>
                                <span className="text-gray-600">
                                  {dbAttendanceStats.total > 0 ? (
                                    <>Tercatat {dbAttendanceStats.total} log ({dbAttendanceStats.present} Hadir, {dbAttendanceStats.sick} Sakit, {dbAttendanceStats.permit} Izin, {dbAttendanceStats.alpha} Alpa)</>
                                  ) : (
                                    <>Belum ada log presensi khusus di database (tersedia opsi manual)</>
                                  )}
                                </span>
                              </div>
                            </div>

                            {!isStudentRole && (
                              <button
                                type="button"
                                onClick={handleSyncAttendanceFromDb}
                                className="shrink-0 flex items-center gap-1.5 bg-white hover:bg-gray-50 text-[#531FFF] border border-purple-200 px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-xs transition-colors"
                                title="Tarik dan terapkan data dari koleksi presensi harian"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>Tarik Presensi DB</span>
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-3 mt-4">
                            {/* Sakit */}
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-center hover:border-gray-300 transition-colors">
                              <label className="block text-[11px] font-bold text-gray-600 mb-1.5">Sakit (Hari)</label>
                              <div className="flex items-center justify-center gap-1.5">
                                {!isStudentRole && (
                                  <button
                                    onClick={() => setSickCount(Math.max(0, sickCount - 1))}
                                    className="w-6 h-6 rounded-md bg-white border border-gray-300 flex items-center justify-center text-xs font-bold text-gray-600 hover:bg-gray-100 active:scale-95"
                                  >
                                    -
                                  </button>
                                )}
                                <input
                                  type="number"
                                  min={0}
                                  disabled={isStudentRole}
                                  value={sickCount}
                                  onChange={(e) => setSickCount(Math.max(0, parseInt(e.target.value) || 0))}
                                  className="w-12 text-center text-base font-extrabold text-gray-900 bg-white border border-gray-200 rounded-md py-0.5"
                                />
                                {!isStudentRole && (
                                  <button
                                    onClick={() => setSickCount(sickCount + 1)}
                                    className="w-6 h-6 rounded-md bg-white border border-gray-300 flex items-center justify-center text-xs font-bold text-gray-600 hover:bg-gray-100 active:scale-95"
                                  >
                                    +
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Izin */}
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-center hover:border-gray-300 transition-colors">
                              <label className="block text-[11px] font-bold text-gray-600 mb-1.5">Izin (Hari)</label>
                              <div className="flex items-center justify-center gap-1.5">
                                {!isStudentRole && (
                                  <button
                                    onClick={() => setPermitCount(Math.max(0, permitCount - 1))}
                                    className="w-6 h-6 rounded-md bg-white border border-gray-300 flex items-center justify-center text-xs font-bold text-gray-600 hover:bg-gray-100 active:scale-95"
                                  >
                                    -
                                  </button>
                                )}
                                <input
                                  type="number"
                                  min={0}
                                  disabled={isStudentRole}
                                  value={permitCount}
                                  onChange={(e) => setPermitCount(Math.max(0, parseInt(e.target.value) || 0))}
                                  className="w-12 text-center text-base font-extrabold text-gray-900 bg-white border border-gray-200 rounded-md py-0.5"
                                />
                                {!isStudentRole && (
                                  <button
                                    onClick={() => setPermitCount(permitCount + 1)}
                                    className="w-6 h-6 rounded-md bg-white border border-gray-300 flex items-center justify-center text-xs font-bold text-gray-600 hover:bg-gray-100 active:scale-95"
                                  >
                                    +
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Tanpa Keterangan */}
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-center hover:border-gray-300 transition-colors">
                              <label className="block text-[11px] font-bold text-gray-600 mb-1.5">Alpa (Hari)</label>
                              <div className="flex items-center justify-center gap-1.5">
                                {!isStudentRole && (
                                  <button
                                    onClick={() => setAlphaCount(Math.max(0, alphaCount - 1))}
                                    className="w-6 h-6 rounded-md bg-white border border-gray-300 flex items-center justify-center text-xs font-bold text-gray-600 hover:bg-gray-100 active:scale-95"
                                  >
                                    -
                                  </button>
                                )}
                                <input
                                  type="number"
                                  min={0}
                                  disabled={isStudentRole}
                                  value={alphaCount}
                                  onChange={(e) => setAlphaCount(Math.max(0, parseInt(e.target.value) || 0))}
                                  className="w-12 text-center text-base font-extrabold text-gray-900 bg-white border border-gray-200 rounded-md py-0.5"
                                />
                                {!isStudentRole && (
                                  <button
                                    onClick={() => setAlphaCount(alphaCount + 1)}
                                    className="w-6 h-6 rounded-md bg-white border border-gray-300 flex items-center justify-center text-xs font-bold text-gray-600 hover:bg-gray-100 active:scale-95"
                                  >
                                    +
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="text-[11px] text-gray-500 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100 flex items-center gap-2 mt-3">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Status kehadiran otomatis menghitung persentase keikutsertaan siswa dalam kegiatan belajar mengajar semester ini.</span>
                        </div>
                      </div>

                    </div>

                    {/* Section D: Kegiatan Ekstrakurikuler */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-[#531FFF]" />
                          <h3 className="font-bold text-xs text-gray-800 uppercase tracking-wider">D. Kegiatan Ekstrakurikuler</h3>
                        </div>
                      </div>

                      {!isStudentRole && (
                        <div className="flex items-center gap-2 flex-wrap bg-gray-50/80 p-2.5 rounded-xl border border-gray-200/70">
                          <span className="text-[11px] font-bold text-gray-500">Preset Cepat:</span>
                          {["Pramuka Wajib", "PMR (Palang Merah)", "Paskibra", "Rohis & Keagamaan", "English Club", "Futsal", "Seni Tari", "Robotik & KIR"].map((p, pIdx) => (
                            <button
                              key={pIdx}
                              onClick={() => handleAddExtra(p)}
                              className="text-[10px] font-bold text-[#531FFF] bg-white hover:bg-[#531FFF]/10 border border-[#531FFF]/20 px-2 py-1 rounded-md transition-colors shadow-2xs"
                            >
                              + {p}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="space-y-3">
                        {extraCurriculars.map((ex, exIdx) => (
                          <div key={exIdx} className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3">
                              <input
                                type="text"
                                disabled={isStudentRole}
                                value={ex.name}
                                onChange={(e) => handleUpdateExtra(exIdx, "name", e.target.value)}
                                placeholder="Nama Ekstrakurikuler..."
                                className="md:col-span-4 px-3 py-1.5 font-bold bg-white border border-gray-200 rounded-lg disabled:opacity-80 focus:ring-2 focus:ring-[#531FFF]/20"
                              />
                              <select
                                disabled={isStudentRole}
                                value={ex.grade}
                                onChange={(e) => handleUpdateExtra(exIdx, "grade", e.target.value)}
                                className="md:col-span-2 px-2.5 py-1.5 font-bold bg-white border border-gray-200 rounded-lg disabled:opacity-80 focus:ring-2 focus:ring-[#531FFF]/20"
                              >
                                <option value="A">Nilai A (Sangat Baik)</option>
                                <option value="B">Nilai B (Baik)</option>
                                <option value="C">Nilai C (Cukup)</option>
                                <option value="D">Nilai D (Kurang)</option>
                              </select>
                              <input
                                type="text"
                                disabled={isStudentRole}
                                value={ex.desc}
                                onChange={(e) => handleUpdateExtra(exIdx, "desc", e.target.value)}
                                placeholder="Keterangan perkembangan, keaktifan, dan capaian prestasi..."
                                className="md:col-span-6 px-3 py-1.5 font-medium bg-white border border-gray-200 rounded-lg disabled:opacity-80 focus:ring-2 focus:ring-[#531FFF]/20"
                              />
                            </div>

                            {!isStudentRole && (
                              <button
                                onClick={() => handleRemoveExtra(exIdx)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors shrink-0"
                                title="Hapus Ekstrakurikuler"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}

                        {extraCurriculars.length === 0 && (
                          <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl">
                            <p className="text-xs text-gray-400 mb-2">Belum ada kegiatan ekstrakurikuler tercatat untuk siswa ini.</p>
                            {!isStudentRole && (
                              <button
                                onClick={() => handleAddExtra()}
                                className="text-xs font-bold text-[#531FFF] bg-[#531FFF]/10 hover:bg-[#531FFF]/20 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Tambah Ekstrakurikuler</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {!isStudentRole && extraCurriculars.length > 0 && (
                        <button
                          onClick={() => handleAddExtra()}
                          className="text-xs font-bold text-[#531FFF] hover:text-[#531FFF]/80 flex items-center gap-1.5 pt-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambah Kegiatan Ekstrakurikuler Lainnya</span>
                        </button>
                      )}
                    </div>

                    {/* Section E: Catatan Perkembangan Wali Kelas */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-2">
                          <Edit3 className="w-4 h-4 text-[#531FFF]" />
                          <h3 className="font-bold text-xs text-gray-800 uppercase tracking-wider">E. Catatan Perkembangan Wali Kelas</h3>
                        </div>
                      </div>

                      {!isStudentRole && (
                        <div className="flex items-center gap-2 flex-wrap pb-1">
                          <span className="text-[11px] font-medium text-gray-400">Template Cepat:</span>
                          <button
                            onClick={() => applyPresetNote("Selamat atas pencapaian prestasi belajar yang sangat gemilang semester ini! Pertahankan semangat belajar, keaktifan berorganisasi, dan tetap rendah hati.")}
                            className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors"
                          >
                            🌟 Sangat Memuaskan
                          </button>
                          <button
                            onClick={() => applyPresetNote("Ananda menunjukkan kemajuan belajar yang konsisten dan aktif berpartisipasi di kelas. Tingkatkan terus minat literasi dan ketekunan untuk meraih hasil yang lebih prima.")}
                            className="text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors"
                          >
                            📈 Menunjukkan Kemajuan
                          </button>
                          <button
                            onClick={() => applyPresetNote("Perlu meningkatkan fokus belajar mandiri di rumah dan kedisiplinan mengumpulkan tugas. Jangan ragu berkonsultasi dengan bapak/ibu guru jika mengalami kendala materi.")}
                            className="text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition-colors"
                          >
                            💪 Motivasi Belajar
                          </button>
                          <button
                            onClick={() => applyPresetNote("Tingkatkan kehadiran harian dan ketepatan waktu agar tidak tertinggal materi esensial. Potensi diri ananda sangat baik jika diasah dengan kedisiplinan.")}
                            className="text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200 transition-colors"
                          >
                            🎯 Peningkatan Disiplin
                          </button>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">Catatan Motivasi & Evaluasi Wali Kelas:</label>
                        <textarea
                          rows={3}
                          disabled={isStudentRole}
                          value={teacherNotes}
                          onChange={(e) => setTeacherNotes(e.target.value)}
                          placeholder="Tuliskan catatan motivasi dan saran perkembangan untuk siswa..."
                          className="w-full p-3 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] disabled:opacity-80 leading-relaxed"
                        />
                      </div>

                      {/* Administrative Fields: Promotion Decision, Homeroom Info, Decision Date */}
                      <div className="pt-3 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        {/* Status Kenaikan / Kelulusan */}
                        <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-200/80">
                          <label className="block text-[11px] font-bold text-gray-700 mb-1.5">Status Kenaikan / Kelulusan:</label>
                          <select
                            disabled={isStudentRole}
                            value={promotionStatus}
                            onChange={(e) => setPromotionStatus(e.target.value)}
                            className="w-full p-2 text-xs font-bold bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20 disabled:opacity-80"
                          >
                            <option value="Naik ke Kelas Berikutnya">Naik ke Kelas Berikutnya</option>
                            <option value="Lulus (Memenuhi Seluruh Syarat Kelulusan)">Lulus (Memenuhi Kriteria)</option>
                            <option value="Melanjutkan ke Semester Genap">Melanjutkan ke Semester Genap</option>
                            <option value="Tinggal di Kelas Ini">Tinggal di Kelas Ini</option>
                          </select>
                        </div>

                        {/* Wali Kelas Penanggung Jawab (from Database) */}
                        <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-200/80">
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-[11px] font-bold text-gray-700">Wali Kelas Penanggung Jawab:</label>
                            <span className="text-[9px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                              Database Guru
                            </span>
                          </div>
                          <input
                            type="text"
                            disabled={isStudentRole}
                            value={customHomeroomName || homeroomTeacher?.name || ""}
                            onChange={(e) => setCustomHomeroomName(e.target.value)}
                            placeholder="Nama Wali Kelas..."
                            className="w-full p-2 text-xs font-bold bg-white border border-gray-200 rounded-lg disabled:opacity-80 focus:ring-2 focus:ring-[#531FFF]/20"
                          />
                          <div className="mt-1 flex items-center justify-between text-[10px] text-gray-500">
                            <span>NIP:</span>
                            <input
                              type="text"
                              disabled={isStudentRole}
                              value={customHomeroomNip || homeroomTeacher?.nip || ""}
                              onChange={(e) => setCustomHomeroomNip(e.target.value)}
                              placeholder="NIP Wali Kelas..."
                              className="text-right text-[10px] font-medium bg-transparent border-b border-gray-300 focus:outline-none max-w-[140px]"
                            />
                          </div>
                        </div>

                        {/* Tanggal Penetapan / Titimangsa Rapor */}
                        <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-200/80">
                          <label className="block text-[11px] font-bold text-gray-700 mb-1.5">Tanggal Titimangsa Rapor:</label>
                          <input
                            type="text"
                            disabled={isStudentRole}
                            value={decisionDate}
                            onChange={(e) => setDecisionDate(e.target.value)}
                            placeholder="Contoh: 19 Desember 2025"
                            className="w-full p-2 text-xs font-bold bg-white border border-gray-200 rounded-lg disabled:opacity-80 focus:ring-2 focus:ring-[#531FFF]/20"
                          />
                          <p className="text-[10px] text-gray-400 mt-1">Dicantumkan pada lembar tanda tangan rapor.</p>
                        </div>
                      </div>
                    </div>

                    {/* ------------------------------------------------------------- */}
                    {/* SELESAI PENGISIAN RAPOR - ACTION CARD (Alur Akhir Pengisian)   */}
                    {/* ------------------------------------------------------------- */}
                    {!isStudentRole && (
                      <div className="bg-gradient-to-r from-purple-50/90 via-white to-purple-50/60 rounded-2xl border-2 border-[#531FFF]/20 p-5 sm:p-6 shadow-md shadow-[#531FFF]/5 flex flex-col md:flex-row items-center justify-between gap-5 transition-all hover:border-[#531FFF]/40">
                        <div className="flex items-start sm:items-center gap-4 w-full md:w-auto">
                          <div className="w-12 h-12 rounded-2xl bg-[#531FFF] text-white flex items-center justify-center shadow-md shadow-[#531FFF]/30 shrink-0">
                            <Save className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-extrabold text-base text-gray-900">
                                Selesai Mengisi Rapor untuk {currentStudent?.name || "Siswa"}?
                              </h4>
                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#531FFF]/10 text-[#531FFF] border border-[#531FFF]/20">
                                NISN: {getStudentNisn(currentStudent)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 max-w-xl">
                              Pastikan seluruh capaian akademik (A), penilaian sikap (B), presensi (C), ekstrakurikuler (D), dan catatan wali kelas (E) sudah terisi dengan benar sebelum disimpan ke database.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-end">
                          <button
                            type="button"
                            onClick={() => setIsPrintModalOpen(true)}
                            disabled={!currentStudent}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-3 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-[0.98] cursor-pointer"
                          >
                            <Printer className="w-4 h-4 text-gray-500" />
                            <span>Pratinjau / Cetak</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleSaveReportCard}
                            disabled={isSaving || !currentStudent}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2.5 bg-[#531FFF] hover:bg-[#531FFF]/90 text-white px-6 py-3 rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-[#531FFF]/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 cursor-pointer"
                            title={`Simpan seluruh data rapor khusus untuk siswa ${currentStudent?.name || ""}`}
                          >
                            {isSaving ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Menyimpan Rapor {currentStudent ? currentStudent.name.split(' ')[0] : "Siswa"}...</span>
                              </>
                            ) : saveSuccess ? (
                              <>
                                <Check className="w-4 h-4 text-emerald-300" />
                                <span>Rapor Berhasil Tersimpan!</span>
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4" />
                                <span>Simpan Data Rapor Siswa</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                )}

                {/* TAB 2: ANALISIS & GRAFIK PERFORMA */}
                {activeTab === "analytics" && (
                  <div className="space-y-6">
                    
                    {/* Performance Overview Banner */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                          <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Mata Pelajaran Tertinggi</span>
                          <p className="font-extrabold text-sm text-gray-900 mt-0.5">
                            {studentSubjectScores.length > 0 ? studentSubjectScores[0].name : "-"} ({studentSubjectScores.length > 0 ? studentSubjectScores[0].score : 0})
                          </p>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-50 text-[#531FFF] flex items-center justify-center font-bold shrink-0">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tingkat Ketuntasan</span>
                          <p className="font-extrabold text-sm text-gray-900 mt-0.5">
                            {studentSubjectScores.filter(s => s.isPassed).length} / {studentSubjectScores.length} Tuntas KKM
                          </p>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
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
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
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
                      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
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
                      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="w-5 h-5 text-[#531FFF]" />
                            <h3 className="font-extrabold text-sm text-gray-900">Rekomendasi & Analisis Pembelajaran</h3>
                          </div>
                          
                          <div className="space-y-3 text-xs">
                            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                              <span className="font-bold text-emerald-800 block mb-1">💪 Bidang Keunggulan:</span>
                              <p className="text-emerald-700">
                                Siswa sangat menonjol pada mata pelajaran 
                                <span className="font-bold"> {studentSubjectScores.filter(s => s.score >= 85).map(s => s.name).join(", ") || "Umum"}</span>. 
                                Dorong partisipasi dalam perlombaan akademik atau olimpiade.
                              </p>
                            </div>

                            {studentSubjectScores.some(s => s.score < 75) && (
                              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                                <span className="font-bold text-amber-800 block mb-1">⚠️ Perlu Peningkatan:</span>
                                <p className="text-amber-700">
                                  Mata pelajaran <span className="font-bold">{studentSubjectScores.filter(s => s.score < 75).map(s => s.name).join(", ")}</span> memerlukan bimbingan ekstra dan jadwal remedial.
                                </p>
                              </div>
                            )}

                            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
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
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
                Pilih siswa dari daftar di samping untuk melihat lembar Rapor Digital.
              </div>
            )}

          </div>

        </div>
      )}

      {/* PRINT-READY OFFICIAL REPORT CARD MODAL */}
      {isPrintModalOpen && currentStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar p-8 text-gray-900 font-sans print-area">
            
            {/* Modal Controls */}
            <div className="flex justify-between items-center pb-6 border-b border-gray-200 no-print">
              <div className="flex items-center gap-2">
                <School className="w-5 h-5 text-[#531FFF]" />
                <h3 className="font-extrabold text-base">Pratinjau Cetak Rapor Digital Official</h3>
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

            {/* Printable Document Sheet */}
            <div className="pt-6 space-y-6">
              
              {/* KOP SEKOLAH */}
              <div className="text-center border-b-2 border-gray-900 pb-4">
                <h2 className="text-2xl font-extrabold tracking-widest text-gray-900 uppercase">SMA QUICK SCHOOLS INDONESIA</h2>
                <p className="text-xs font-medium text-gray-600 mt-1">
                  Jl. Pendidikan Utama No. 45, Jakarta Selatan · Telp: (021) 7890123 · Website: www.quickschools.sch.id
                </p>
                <p className="text-xs font-bold text-gray-800 uppercase mt-2 tracking-wider">
                  LAPORAN HASIL BELAJAR (RAPOR DIGITAL SISWA) · TAHUN AJARAN {academicYear}
                </p>
              </div>

              {/* Student Metadata */}
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold bg-gray-50 p-4 rounded-xl border border-gray-300">
                <div className="space-y-1.5">
                  <p><span className="text-gray-500 font-normal">Nama Siswa:</span> <span className="font-extrabold text-gray-900">{currentStudent.name}</span></p>
                  <p><span className="text-gray-500 font-normal">NISN:</span> <span className="font-bold text-gray-800">{getStudentNisn(currentStudent)}</span></p>
                  <p><span className="text-gray-500 font-normal">Sekolah:</span> SMA Quick Schools Indonesia</p>
                </div>
                <div className="space-y-1.5">
                  <p><span className="text-gray-500 font-normal">Kelas / Fase:</span> <span className="font-bold text-gray-800">{currentStudent.classId || "-"}</span></p>
                  <p><span className="text-gray-500 font-normal">Semester:</span> <span className="font-bold text-gray-800">{semester}</span></p>
                  <p><span className="text-gray-500 font-normal">Peringkat Kelas:</span> <span className="font-bold text-gray-900">#{studentRank.rank} dari {studentRank.totalInClass} Siswa</span></p>
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
                    {studentSubjectScores.map((s, i) => (
                      <tr key={i} className="border-b border-gray-200">
                        <td className="border border-gray-300 p-2 text-center font-medium">{i + 1}</td>
                        <td className="border border-gray-300 p-2 font-bold text-gray-900">{s.name}</td>
                        <td className="border border-gray-300 p-2 text-center">{s.kkm}</td>
                        <td className="border border-gray-300 p-2 text-center font-extrabold">{s.score}</td>
                        <td className="border border-gray-300 p-2 text-center font-bold">{s.predicate}</td>
                        <td className="border border-gray-300 p-2 leading-tight text-[11px]">{s.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Attitude & Attendance Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="border border-gray-300 rounded-xl p-3">
                  <h4 className="font-bold uppercase mb-2 text-gray-800">B. PENILAIAN SIKAP & KARAKTER</h4>
                  <p><span className="font-bold">1. Sikap Spiritual:</span> <span className="font-extrabold">{spiritualAttitude}</span></p>
                  <p className="text-[11px] text-gray-600 italic mt-0.5 mb-2">"{spiritualDesc}"</p>
                  <p><span className="font-bold">2. Sikap Sosial:</span> <span className="font-extrabold">{socialAttitude}</span></p>
                  <p className="text-[11px] text-gray-600 italic mt-0.5">"{socialDesc}"</p>
                </div>

                <div className="border border-gray-300 rounded-xl p-3">
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
              <div className="border border-gray-300 rounded-xl p-3 text-xs">
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
              <div className="border border-gray-300 rounded-xl p-4 text-xs space-y-2">
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
                  <p className="font-bold border-b border-gray-400 inline-block px-4">Dr. H. Rahmat Wijaya, M.Si.</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">NIP. 19750812 200003 1 002</p>
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
