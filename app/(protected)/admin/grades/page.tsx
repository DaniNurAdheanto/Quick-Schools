"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Search,
  Award,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Trash2,
  ShieldCheck,
  Eye,
  Sparkles,
  LayoutGrid,
  Table as TableIcon,
  X,
  FileSpreadsheet,
  TrendingUp,
  PenTool,
  Loader2,
  Save,
  ChevronDown,
  ChevronUp,
  Printer,
  GraduationCap,
  BadgeCheck,
  Users,
  MessageSquare,
  Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CrudSheet, CrudField } from "@/components/layouts/crud-sheet";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  getDoc,
  writeBatch
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { useToast } from "@/context/ToastContext";
import { useUnifiedStudents } from "@/hooks/use-unified-students";

// 6 Core Assessment Types requested by user
const ASSESSMENT_TYPES = [
  { id: "Tugas", key: "tugas", label: "Tugas", shortLabel: "Tugas", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "Kuis", key: "kuis", label: "Kuis", shortLabel: "Kuis", badge: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { id: "Ulangan Harian", key: "ulanganHarian", label: "Ulangan Harian", shortLabel: "UH", badge: "bg-purple-50 text-purple-700 border-purple-200" },
  { id: "Penilaian Tengah Semester (PTS)", key: "pts", label: "PTS", shortLabel: "PTS", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "Penilaian Akhir Semester (PAS)", key: "pas", label: "PAS", shortLabel: "PAS", badge: "bg-orange-50 text-orange-700 border-orange-200" },
  { id: "Ujian / Asesmen Akhir", key: "asesmenAkhir", label: "Asesmen Akhir", shortLabel: "Akhir", badge: "bg-rose-50 text-rose-700 border-rose-200" }
] as const;

export default function GradesPage() {
  const toast = useToast();

  // Firestore Realtime Collections
  const [grades, setGrades] = useState<any[]>([]);
  const { students, getStudentByIdOrName } = useUnifiedStudents();
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // User Auth & Role State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("admin");
  const [studentDoc, setStudentDoc] = useState<any>(null);

  // View Mode: 'matrix' (Spreadsheet multi-input), 'table' (Log view), 'gradebook' (Rekap Rapor)
  const [viewMode, setViewMode] = useState<"matrix" | "table" | "gradebook">("matrix");

  // Matrix Configuration States
  const [matrixClassId, setMatrixClassId] = useState<string>("");
  const [matrixSubject, setMatrixSubject] = useState<string>("");
  const [matrixSemester, setMatrixSemester] = useState<string>("Ganjil");
  const [matrixAcademicYear, setMatrixAcademicYear] = useState<string>("2025/2026");
  const [matrixKkm, setMatrixKkm] = useState<number>(75);

  // Local Editable Matrix Grid: studentId -> { tugas: string, kuis: string, ulanganHarian: string, pts: string, pas: string, asesmenAkhir: string, notes: string }
  const [gridValues, setGridValues] = useState<Record<string, Record<string, string>>>({});
  const [isSavingMatrix, setIsSavingMatrix] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Filters for Table Log View
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("Semua");
  const [selectedClass, setSelectedClass] = useState<string>("All");
  const [selectedSubject, setSelectedSubject] = useState<string>("All");
  const [selectedKkmStatus, setSelectedKkmStatus] = useState<string>("All");

  // Single Entry CrudSheet State
  const [crudState, setCrudState] = useState<{ open: boolean; mode: "create" | "edit" | "delete" | "view"; data?: any }>({
    open: false,
    mode: "create"
  });
  const [currentFormData, setCurrentFormData] = useState<any>({});

  // Student-specific Portal UI states
  const [studentTab, setStudentTab] = useState<"bySubject" | "allGrades">("bySubject");
  const [studentSubjectFilter, setStudentSubjectFilter] = useState<string>("All");
  const [studentTypeFilter, setStudentTypeFilter] = useState<string>("Semua");
  const [studentStatusFilter, setStudentStatusFilter] = useState<string>("All");
  const [studentSemesterFilter, setStudentSemesterFilter] = useState<string>("All");
  const [studentSearch, setStudentSearch] = useState<string>("");
  const [expandedSubjectCard, setExpandedSubjectCard] = useState<string | null>(null);
  const [detailModalGrade, setDetailModalGrade] = useState<any | null>(null);
  const [currentUserData, setCurrentUserData] = useState<any>(null);

  const isStudentRole = userRole === "siswa" || userRole === "student";

  // Auth & Role Listener
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const userSnap = await getDoc(doc(db, "users", user.uid));
          if (userSnap.exists()) {
            const uData = userSnap.data();
            setCurrentUserData(uData);
            const role = (uData.role || "admin").toLowerCase();
            const normRole = (role === "student" || role === "siswa") ? "siswa" : (role === "teacher" || role === "guru") ? "guru" : role;
            setUserRole(normRole);
            setStudentDoc(uData);
            if (normRole === "siswa") {
              setViewMode("table"); // Students see table of their own grades
            }
          }
        } catch (err) {
          console.warn("User role fetch error:", err);
        }
      }
    });

    return () => unsubAuth();
  }, []);

  // Determine if logged in user is Guru and their assigned Homeroom Class (Wali Kelas) or Subject Teaching Responsibilities
  const isGuru = userRole === "guru" || userRole === "teacher";

  // Resolve Teacher Profile and Identifiers
  const teacherInfo = useMemo(() => {
    if (!isGuru) return null;
    const userObj = currentUserData || currentUser || {};
    const tName = (userObj.fullName || userObj.name || currentUser?.displayName || "").trim();
    const tNip = (userObj.nip || userObj.id || "").trim();
    const tEmail = (userObj.email || currentUser?.email || "").trim().toLowerCase();
    const tUid = currentUser?.uid || userObj.uid;

    // Cross-reference with teachers collection
    const tDoc = teachers.find(t =>
      (tEmail && t.email?.toLowerCase() === tEmail) ||
      (tNip && (t.nip === tNip || t.id === tNip)) ||
      (tUid && (t.uid === tUid || t._firestoreId === tUid)) ||
      (tName && t.name && (
        t.name.toLowerCase() === tName.toLowerCase() ||
        (tName.length > 5 && t.name.toLowerCase().includes(tName.toLowerCase())) ||
        (t.name.length > 5 && tName.toLowerCase().includes(t.name.toLowerCase()))
      ))
    );

    const finalName = tDoc?.name || tName || "Guru";
    const finalNip = tDoc?.nip || tDoc?.id || tNip || "-";
    const finalSubject = tDoc?.subject || userObj.subject || "";
    const finalSubjects: string[] = [];
    if (finalSubject) finalSubjects.push(finalSubject);
    if (Array.isArray(tDoc?.subjects)) finalSubjects.push(...tDoc.subjects);
    if (Array.isArray(userObj?.subjects)) finalSubjects.push(...userObj.subjects);

    return {
      name: finalName,
      nip: finalNip,
      email: tEmail,
      uid: tUid,
      primarySubject: finalSubject,
      declaredSubjects: Array.from(new Set(finalSubjects.filter(Boolean))),
      teacherDoc: tDoc
    };
  }, [isGuru, currentUser, currentUserData, teachers]);

  // 1. Homeroom Classes (Wali Kelas)
  const homeroomClasses = useMemo(() => {
    if (!isGuru || !teacherInfo) return [];

    const matched = new Set<string>();
    const tName = teacherInfo.name.toLowerCase();
    const tNip = teacherInfo.nip.toLowerCase();
    const tUid = teacherInfo.uid;

    // Match from classes collection
    classes.forEach(c => {
      const cName = c.name || c.id;
      const cHomeroom = (c.homeroom || "").trim().toLowerCase();
      const cNip = (c.homeroomNip || "").trim().toLowerCase();
      const cId = (c.homeroomId || "").trim();

      const matchName = tName && cHomeroom && (
        cHomeroom === tName ||
        (tName.length > 5 && cHomeroom.includes(tName)) ||
        (cHomeroom.length > 5 && tName.includes(cHomeroom))
      );
      const matchNip = tNip && tNip !== "-" && cNip && cNip === tNip;
      const matchId = (tUid && cId && cId === tUid) || (currentUserData?.id && cId === currentUserData.id);

      if (matchName || matchNip || matchId) {
        if (cName) matched.add(cName);
      }
    });

    // Direct field in users collection or teacherDoc
    const directClass = teacherInfo.teacherDoc?.homeroomClass || teacherInfo.teacherDoc?.homeroom || currentUserData?.homeroomClass || currentUserData?.homeroom || currentUserData?.className || currentUserData?.classId;
    if (directClass && directClass !== "-" && classes.some(c => (c.name || c.id) === directClass)) {
      matched.add(directClass);
    }

    return Array.from(matched);
  }, [isGuru, teacherInfo, classes, currentUserData]);

  // 2. Subject Teaching Responsibilities (Guru Mata Pelajaran pairs: { class, subject })
  const taughtSubjectClassPairs = useMemo(() => {
    if (!isGuru || !teacherInfo) return [];

    const pairs: { class: string; subject: string }[] = [];
    const pairKeys = new Set<string>();

    const addPair = (cls: string, subj: string) => {
      if (!cls || !subj) return;
      const cleanClass = cls.trim();
      const cleanSubj = subj.trim();
      const key = `${cleanClass.toLowerCase()}:::${cleanSubj.toLowerCase()}`;
      if (!pairKeys.has(key)) {
        pairKeys.add(key);
        pairs.push({ class: cleanClass, subject: cleanSubj });
      }
    };

    const tName = teacherInfo.name.toLowerCase();
    const tNip = teacherInfo.nip.toLowerCase();
    const tEmail = teacherInfo.email.toLowerCase();
    const tUid = teacherInfo.uid;

    // A. From schedules collection
    schedules.forEach(s => {
      const sTeacher = (s.teacher || "").toLowerCase().trim();
      const sNip = (s.teacherNip || "").toLowerCase().trim();
      const sId = (s.teacherId || "").trim();
      const sEmail = (s.teacherEmail || "").toLowerCase().trim();

      const matchName = tName && sTeacher && (
        sTeacher === tName ||
        (tName.length > 4 && sTeacher.includes(tName)) ||
        (sTeacher.length > 4 && tName.includes(sTeacher))
      );
      const matchNip = tNip && tNip !== "-" && sNip && sNip === tNip;
      const matchId = tUid && sId && sId === tUid;
      const matchEmail = tEmail && sEmail && sEmail === tEmail;

      if (matchName || matchNip || matchId || matchEmail) {
        const sClass = s.class || s.className;
        const sSubj = s.subject || s.subjectName;
        if (sClass && sSubj) {
          addPair(sClass, sSubj);
        }
      }
    });

    // B. From subjects collection where subject.teacher matches this teacher
    subjects.forEach(subj => {
      const subjTeacher = (subj.teacher || "").toLowerCase().trim();
      const matchName = tName && subjTeacher && (
        subjTeacher === tName ||
        (tName.length > 4 && subjTeacher.includes(tName)) ||
        (subjTeacher.length > 4 && tName.includes(subjTeacher))
      );
      if (matchName) {
        // Find classes in schedules for this subject
        const matchingSchedules = schedules.filter(s => (s.subject || "").toLowerCase().trim() === subj.name?.toLowerCase().trim());
        if (matchingSchedules.length > 0) {
          matchingSchedules.forEach(ms => {
            if (ms.class) addPair(ms.class, subj.name);
          });
        } else {
          // If no specific schedule found, check if teacher doc has classes
          const tClasses = teacherInfo.teacherDoc?.classes || currentUserData?.classes;
          if (Array.isArray(tClasses)) {
            tClasses.forEach(tc => addPair(tc, subj.name));
          } else if (classes.length > 0) {
            const lvl = (subj.level || "").toLowerCase();
            classes.forEach(c => {
              const cName = c.name || "";
              if (!lvl || lvl === "semua tingkat" || cName.toLowerCase().includes(lvl.replace("kelas ", ""))) {
                addPair(cName, subj.name);
              }
            });
          }
        }
      }
    });

    // C. From teacher declared subjects
    teacherInfo.declaredSubjects.forEach(declaredSubj => {
      schedules.forEach(s => {
        const sSubj = (s.subject || "").toLowerCase().trim();
        if (sSubj === declaredSubj.toLowerCase().trim()) {
          const sTeacher = (s.teacher || "").toLowerCase().trim();
          if (sTeacher === tName || (tName.length > 4 && sTeacher.includes(tName)) || (sTeacher.length > 4 && tName.includes(sTeacher))) {
            if (s.class) addPair(s.class, s.subject || declaredSubj);
          }
        }
      });

      const tClasses = teacherInfo.teacherDoc?.classes || currentUserData?.classes;
      if (Array.isArray(tClasses)) {
        tClasses.forEach(tc => addPair(tc, declaredSubj));
      }
    });

    return pairs;
  }, [isGuru, teacherInfo, schedules, subjects, classes, currentUserData]);

  // 3. Combined Authorized Classes for this Teacher (Homeroom + Classes Taught)
  const authorizedClasses = useMemo(() => {
    if (!isGuru) return null; // Non-guru users (admin, super-admin, etc.) are unrestricted
    const classSet = new Set<string>();
    homeroomClasses.forEach(c => classSet.add(c));
    taughtSubjectClassPairs.forEach(p => classSet.add(p.class));
    return Array.from(classSet);
  }, [isGuru, homeroomClasses, taughtSubjectClassPairs]);

  const isTeacherWaliKelas = Boolean(isGuru && homeroomClasses.length > 0);
  const primaryTeacherClass = authorizedClasses && authorizedClasses.length > 0 ? authorizedClasses[0] : "";
  const hasAnyGradingAccess = !isGuru || (authorizedClasses !== null && authorizedClasses.length > 0);
  const isSuperAdmin = userRole === "superadmin" || userRole === "super_admin" || userRole === "super-admin";

  // Helper: check if teacher is authorized to grade a specific (class, subject)
  const isTeacherAuthorizedFor = (classId: string, subjectName: string): boolean => {
    if (!isGuru) return true;
    if (!classId || !subjectName) return false;

    const normClass = classId.trim().toLowerCase();
    const normSubj = subjectName.trim().toLowerCase();

    // 1. Wali Kelas for this class -> authorized for all subjects in their homeroom class
    if (homeroomClasses.some(hc => hc.trim().toLowerCase() === normClass)) {
      return true;
    }

    // 2. Guru Mata Pelajaran for this (class, subject)
    const isTaught = taughtSubjectClassPairs.some(
      p => p.class.trim().toLowerCase() === normClass && p.subject.trim().toLowerCase() === normSubj
    );
    if (isTaught) {
      return true;
    }

    return false;
  };

  // Helper: get list of authorized subjects for a specific class
  const getAuthorizedSubjectsForClass = (targetClass: string): string[] => {
    if (!isGuru) {
      return subjects.map(s => s.name);
    }
    if (!targetClass) return [];

    const normClass = targetClass.trim().toLowerCase();

    // If teacher is Wali Kelas of this class: access to all subjects in their homeroom class
    const isWali = homeroomClasses.some(hc => hc.trim().toLowerCase() === normClass);
    if (isWali) {
      return subjects.length > 0
        ? subjects.map(s => s.name)
        : ["Matematika Wajib", "Bahasa Indonesia", "Bahasa Inggris", "Fisika", "Kimia", "Biologi", "Ekonomi", "Sosiologi", "Pendidikan Agama"];
    }

    // If Guru Mata Pelajaran: return only subjects taught in this class
    const taught = taughtSubjectClassPairs
      .filter(p => p.class.trim().toLowerCase() === normClass)
      .map(p => p.subject);

    return Array.from(new Set(taught));
  };

  // Realtime School Configuration for KKM and Assessment Weights (managed by Super Admin)
  const [schoolGrading, setSchoolGrading] = useState<{
    kkmScore: number;
    assignmentWeight: number;
    midtermWeight: number;
    finalWeight: number;
  }>({
    kkmScore: 75,
    assignmentWeight: 30,
    midtermWeight: 30,
    finalWeight: 40
  });

  // Realtime Listeners for Grades, Students, Users, Classes, Subjects, Teachers, Schedules, Settings
  useEffect(() => {
    const unsubGrades = onSnapshot(collection(db, "grades"), (snap) => {
      const data = snap.docs.map(docSnap => ({ id: docSnap.id, _firestoreId: docSnap.id, ...docSnap.data() }));
      setGrades(data);
      setLoading(false);
    }, (error) => {
      console.warn("Grades listener error:", error);
      setLoading(false);
    });

    const unsubClasses = onSnapshot(collection(db, "classes"), (snap) => {
      setClasses(snap.docs.map(docSnap => ({ id: docSnap.id, _firestoreId: docSnap.id, ...docSnap.data() })));
    });

    const unsubSubjects = onSnapshot(collection(db, "subjects"), (snap) => {
      setSubjects(snap.docs.map(docSnap => ({ id: docSnap.id, _firestoreId: docSnap.id, ...docSnap.data() })));
    });

    const unsubTeachers = onSnapshot(collection(db, "teachers"), (snap) => {
      setTeachers(snap.docs.map(docSnap => ({ id: docSnap.id, _firestoreId: docSnap.id, ...docSnap.data() })));
    });

    const unsubSchedules = onSnapshot(collection(db, "schedules"), (snap) => {
      setSchedules(snap.docs.map(docSnap => ({ id: docSnap.id, _firestoreId: docSnap.id, ...docSnap.data() })));
    });

    const unsubSettings = onSnapshot(doc(db, "settings", "school_configuration"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data?.grading) {
          setSchoolGrading({
            kkmScore: Number(data.grading.kkmScore) || 75,
            assignmentWeight: Number(data.grading.assignmentWeight) || 30,
            midtermWeight: Number(data.grading.midtermWeight) || 30,
            finalWeight: Number(data.grading.finalWeight) || 40,
          });
        }
      }
    });

    return () => {
      unsubGrades();
      unsubClasses();
      unsubSubjects();
      unsubTeachers();
      unsubSchedules();
      unsubSettings();
    };
  }, []);

  // Synchronize KKM from subject / settings set by Super Admin
  useEffect(() => {
    if (matrixSubject) {
      const subjDoc = subjects.find(s => s.name?.toLowerCase().trim() === matrixSubject.toLowerCase().trim());
      const kkmVal = Number(subjDoc?.kkm) || Number(schoolGrading?.kkmScore) || 75;
      setMatrixKkm(kkmVal);
    }
  }, [matrixSubject, subjects, schoolGrading]);

  // Available Classes Options: dynamic count from synchronized students
  const availableClassOptions = useMemo(() => {
    const classNamesFromClasses = classes.map(c => c.name?.trim()).filter(Boolean);
    const classNamesFromStudents = students.map(s => (s.classId || s.className || s.class)?.trim()).filter(Boolean);
    let uniqueClassNames = Array.from(new Set([...classNamesFromClasses, ...classNamesFromStudents])).sort();

    // For Guru role: limit to authorized classes (homeroom + taught classes)
    if (isGuru) {
      if (!authorizedClasses || authorizedClasses.length === 0) {
        return [];
      }
      uniqueClassNames = uniqueClassNames.filter(cName =>
        authorizedClasses.some(ac => ac.trim().toLowerCase() === cName.toLowerCase())
      );
    }

    return uniqueClassNames.map(cName => {
      const count = students.filter(s => (s.classId || s.className || s.class)?.trim().toLowerCase() === cName.toLowerCase()).length;
      const isWali = homeroomClasses.some(hc => hc.trim().toLowerCase() === cName.toLowerCase());
      const taughtInThisClass = taughtSubjectClassPairs
        .filter(p => p.class.trim().toLowerCase() === cName.toLowerCase())
        .map(p => p.subject);

      let roleLabel = "";
      if (isGuru) {
        if (isWali && taughtInThisClass.length > 0) {
          roleLabel = ` • Wali Kelas & ${taughtInThisClass.join(", ")}`;
        } else if (isWali) {
          roleLabel = " • Wali Kelas";
        } else if (taughtInThisClass.length > 0) {
          roleLabel = ` • Guru ${taughtInThisClass.join(", ")}`;
        }
      }

      return {
        label: count > 0 ? `${cName} (${count} Siswa)${roleLabel}` : `${cName}${roleLabel}`,
        value: cName,
        studentCount: count,
        isWali,
        taughtSubjects: taughtInThisClass
      };
    });
  }, [classes, students, isGuru, authorizedClasses, homeroomClasses, taughtSubjectClassPairs]);

  // Available Subjects Options for Matrix view (dynamically filtered for Guru based on matrixClassId)
  const availableSubjectOptions = useMemo(() => {
    const allSubjects = subjects.length > 0
      ? subjects.map(s => ({ label: s.name, value: s.name }))
      : [
        { label: "Matematika Wajib", value: "Matematika Wajib" },
        { label: "Bahasa Indonesia", value: "Bahasa Indonesia" },
        { label: "Bahasa Inggris", value: "Bahasa Inggris" },
        { label: "Fisika", value: "Fisika" },
        { label: "Kimia", value: "Kimia" },
        { label: "Biologi", value: "Biologi" },
        { label: "Ekonomi", value: "Ekonomi" },
        { label: "Sosiologi", value: "Sosiologi" },
        { label: "Pendidikan Agama", value: "Pendidikan Agama" }
      ];

    if (!isGuru) return allSubjects;

    if (!matrixClassId) {
      const myTaughtSubjs = Array.from(new Set(taughtSubjectClassPairs.map(p => p.subject)));
      if (myTaughtSubjs.length > 0) {
        return myTaughtSubjs.map(s => ({ label: s, value: s }));
      }
      return allSubjects;
    }

    const normClass = matrixClassId.trim().toLowerCase();
    const isWali = homeroomClasses.some(hc => hc.trim().toLowerCase() === normClass);
    if (isWali) {
      return allSubjects.map(s => ({
        ...s,
        label: `${s.label} (Wali Kelas)`
      }));
    }

    const allowed = getAuthorizedSubjectsForClass(matrixClassId);
    if (allowed.length > 0) {
      return allowed.map(s => ({ label: `${s} (Guru Pengampu)`, value: s }));
    }

    return [];
  }, [subjects, isGuru, matrixClassId, homeroomClasses, taughtSubjectClassPairs]);

  // Available Subjects Options for Table Log filter
  const availableSubjectOptionsForFilter = useMemo(() => {
    const allSubjects = subjects.length > 0
      ? subjects.map(s => ({ label: s.name, value: s.name }))
      : [
        { label: "Matematika Wajib", value: "Matematika Wajib" },
        { label: "Bahasa Indonesia", value: "Bahasa Indonesia" },
        { label: "Bahasa Inggris", value: "Bahasa Inggris" },
        { label: "Fisika", value: "Fisika" },
        { label: "Kimia", value: "Kimia" },
        { label: "Biologi", value: "Biologi" },
        { label: "Ekonomi", value: "Ekonomi" },
        { label: "Sosiologi", value: "Sosiologi" },
        { label: "Pendidikan Agama", value: "Pendidikan Agama" }
      ];

    if (!isGuru) return allSubjects;

    if (selectedClass && selectedClass !== "All") {
      const normClass = selectedClass.trim().toLowerCase();
      const isWali = homeroomClasses.some(hc => hc.trim().toLowerCase() === normClass);
      if (isWali) return allSubjects;

      const allowed = getAuthorizedSubjectsForClass(selectedClass);
      if (allowed.length > 0) {
        return allowed.map(s => ({ label: s, value: s }));
      }
      return [];
    }

    if (isTeacherWaliKelas) return allSubjects;
    const taughtSubjs = Array.from(new Set(taughtSubjectClassPairs.map(p => p.subject)));
    if (taughtSubjs.length > 0) {
      return taughtSubjs.map(s => ({ label: s, value: s }));
    }
    return allSubjects;
  }, [subjects, isGuru, selectedClass, homeroomClasses, isTeacherWaliKelas, taughtSubjectClassPairs]);

  // Auto-initialize matrix class smartly
  useEffect(() => {
    if (availableClassOptions.length > 0) {
      const isCurrentValid = availableClassOptions.some(opt => opt.value.toLowerCase() === matrixClassId.trim().toLowerCase());

      if (!matrixClassId || !isCurrentValid) {
        const classWithStudents = availableClassOptions.find(opt => opt.studentCount > 0);
        if (classWithStudents) {
          setMatrixClassId(classWithStudents.value);
        } else {
          setMatrixClassId(availableClassOptions[0].value);
        }
      }
    } else if (isGuru && (!authorizedClasses || authorizedClasses.length === 0)) {
      setMatrixClassId("");
    }
  }, [availableClassOptions, matrixClassId, isGuru, authorizedClasses]);

  // Sync matrixSubject when matrixClassId or availableSubjectOptions change
  useEffect(() => {
    if (availableSubjectOptions.length > 0) {
      const isSubjectValid = availableSubjectOptions.some(
        opt => opt.value.toLowerCase().trim() === matrixSubject.toLowerCase().trim()
      );
      if (!matrixSubject || !isSubjectValid) {
        setMatrixSubject(availableSubjectOptions[0].value);
      }
    } else if (isGuru) {
      setMatrixSubject("");
    }
  }, [availableSubjectOptions, matrixSubject, isGuru]);

  // Sync selectedClass and matrixClassId for Guru
  useEffect(() => {
    if (isGuru && authorizedClasses && authorizedClasses.length > 0) {
      if (selectedClass !== "All" && !authorizedClasses.some(ac => ac.trim().toLowerCase() === selectedClass.trim().toLowerCase())) {
        setSelectedClass(authorizedClasses[0]);
      }
      if (!authorizedClasses.some(ac => ac.trim().toLowerCase() === matrixClassId.trim().toLowerCase())) {
        setMatrixClassId(authorizedClasses[0]);
      }
    }
  }, [isGuru, authorizedClasses, selectedClass, matrixClassId]);

  // Students enrolled in selected matrixClassId (trimmed, case-insensitive)
  const matrixStudents = useMemo(() => {
    if (!matrixClassId) return [];
    if (isGuru) {
      if (!authorizedClasses || authorizedClasses.length === 0) return [];
      const isAllowed = authorizedClasses.some(ac => ac.trim().toLowerCase() === matrixClassId.trim().toLowerCase());
      if (!isAllowed) return [];
      if (matrixSubject && !isTeacherAuthorizedFor(matrixClassId, matrixSubject)) {
        return [];
      }
    }
    const target = matrixClassId.trim().toLowerCase();
    return students.filter(s => {
      const c = (s.classId || s.className || s.class || "").trim().toLowerCase();
      return c === target;
    });
  }, [students, matrixClassId, matrixSubject, isGuru, authorizedClasses, homeroomClasses, taughtSubjectClassPairs]);

  // Pre-populate gridValues from Firestore grades when matrix filters change or grades update
  useEffect(() => {
    if (!matrixClassId || !matrixSubject) return;
    // Don't overwrite if user is actively typing unsaved changes
    if (hasUnsavedChanges) return;

    const newGrid: Record<string, Record<string, string>> = {};

    matrixStudents.forEach(s => {
      newGrid[s.id] = {
        tugas: "",
        kuis: "",
        ulanganHarian: "",
        pts: "",
        pas: "",
        asesmenAkhir: "",
        notes: ""
      };
    });

    // Populate existing grade values from Firestore
    grades.forEach(g => {
      if (
        g.subject === matrixSubject &&
        g.semester === matrixSemester &&
        (g.academicYear || "2025/2026") === matrixAcademicYear
      ) {
        if (newGrid[g.studentId]) {
          const valStr = g.score !== undefined && g.score !== null ? String(g.score) : "";
          const t = g.type || "";

          if (t === "Tugas") newGrid[g.studentId].tugas = valStr;
          else if (t === "Ulangan") {
            // If ulanganHarian is empty, set it
            if (!newGrid[g.studentId].ulanganHarian) {
              newGrid[g.studentId].ulanganHarian = valStr;
            } else {
              newGrid[g.studentId].kuis = valStr;
            }
          } else if (t === "UTS" || t.includes("PTS")) {
            newGrid[g.studentId].pts = valStr;
          } else if (t === "UAS" || t.includes("PAS")) {
            if (!newGrid[g.studentId].pas) {
              newGrid[g.studentId].pas = valStr;
            } else {
              newGrid[g.studentId].asesmenAkhir = valStr;
            }
          }

          if (g.notes && !newGrid[g.studentId].notes) {
            newGrid[g.studentId].notes = g.notes;
          }
        }
      }
    });

    setGridValues(newGrid);
    setHasUnsavedChanges(false);
  }, [matrixClassId, matrixSubject, matrixSemester, matrixAcademicYear, matrixStudents, grades, hasUnsavedChanges]);

  // Cell Change Handler for Matrix Grid
  const handleCellChange = (studentId: string, fieldKey: string, value: string) => {
    setGridValues(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [fieldKey]: value
      }
    }));
    setHasUnsavedChanges(true);
  };

  // Quick Autofill for a specific column
  const handleAutofillColumn = (fieldKey: string, scoreToSet: number) => {
    setGridValues(prev => {
      const next = { ...prev };
      matrixStudents.forEach(s => {
        if (next[s.id]) {
          next[s.id] = {
            ...next[s.id],
            [fieldKey]: String(scoreToSet)
          };
        }
      });
      return next;
    });
    setHasUnsavedChanges(true);
    toast.showSuccess(`Seluruh siswa diisi nilai ${scoreToSet} pada kolom ${fieldKey.toUpperCase()}.`, "Autofill Berhasil");
  };

  // Clear specific column
  const handleClearColumn = (fieldKey: string) => {
    setGridValues(prev => {
      const next = { ...prev };
      matrixStudents.forEach(s => {
        if (next[s.id]) {
          next[s.id] = {
            ...next[s.id],
            [fieldKey]: ""
          };
        }
      });
      return next;
    });
    setHasUnsavedChanges(true);
  };

  // Save Matrix to Firestore (Writes all edited/filled cells simultaneously!)
  // Helper to map UI assessment types to Firestore rules allowed types: ['Tugas', 'Ulangan', 'UTS', 'UAS']
  const mapTypeToFirestore = (type: string): "Tugas" | "Ulangan" | "UTS" | "UAS" => {
    if (type === "Tugas") return "Tugas";
    if (type === "Kuis" || type.includes("Ulangan") || type === "PH") return "Ulangan";
    if (type.includes("PTS") || type === "UTS" || type.includes("Tengah")) return "UTS";
    return "UAS"; // PAS, UAS, Ujian, Asesmen Akhir
  };

  // Save Matrix to Firestore (Writes all edited/filled cells simultaneously, or even just 1 cell!)
  const handleSaveMatrix = async () => {
    if (isGuru) {
      if (!hasAnyGradingAccess) {
        toast.showError("Anda belum memiliki penugasan mengajar mata pelajaran atau penugasan wali kelas.", "Akses Ditolak");
        return;
      }
      if (!isTeacherAuthorizedFor(matrixClassId, matrixSubject)) {
        toast.showError(`Anda hanya memiliki wewenang penilaian untuk kelas dan mata pelajaran yang ditugaskan kepada Anda.`, "Akses Ditolak");
        return;
      }
    }

    if (!matrixClassId || !matrixSubject) {
      toast.showError("Pilih kelas dan mata pelajaran terlebih dahulu.", "Data Belum Lengkap");
      return;
    }

    if (matrixStudents.length === 0) {
      toast.showError(`Tidak ada siswa terdaftar di kelas ${matrixClassId}.`, "Kelas Kosong");
      return;
    }

    try {
      setIsSavingMatrix(true);
      const batch = writeBatch(db);
      let savedCount = 0;

      // Existing grade map for fast lookup: `${studentId}_${firestoreType}` -> gradeDoc
      const existingGradeMap = new Map<string, { id: string; createdAt?: any }>();
      grades.forEach(g => {
        if (
          g.subject === matrixSubject &&
          g.semester === matrixSemester &&
          (g.academicYear || "2025/2026") === matrixAcademicYear
        ) {
          existingGradeMap.set(`${g.studentId}_${g.type}`, {
            id: g.id,
            createdAt: g.createdAt
          });
        }
      });

      matrixStudents.forEach(s => {
        const studentRow = gridValues[s.id];
        if (!studentRow) return;

        ASSESSMENT_TYPES.forEach(item => {
          const rawVal = studentRow[item.key];
          // Only save cells that are filled by the user!
          if (rawVal !== undefined && rawVal !== null && rawVal.trim() !== "") {
            const numScore = Number(rawVal);
            if (!isNaN(numScore)) {
              const clampedScore = Math.min(Math.max(numScore, 0), 100);
              const firestoreType = mapTypeToFirestore(item.id);
              const lookupKey = `${s.id}_${firestoreType}`;
              const existingDoc = existingGradeMap.get(lookupKey);

              const studentDisplayName = s.fullName || s.name || "Siswa";

              if (existingDoc) {
                // Update existing grade doc with exact allowed schema keys in Firestore rules:
                // ['studentId', 'studentName', 'subject', 'type', 'score', 'semester', 'academicYear', 'updatedAt']
                const docRef = doc(db, "grades", existingDoc.id);
                batch.update(docRef, {
                  studentId: s.id,
                  studentName: studentDisplayName,
                  subject: matrixSubject,
                  type: firestoreType,
                  score: clampedScore,
                  semester: matrixSemester,
                  academicYear: matrixAcademicYear,
                  updatedAt: serverTimestamp()
                });
              } else {
                // Create new grade doc with exact allowed schema keys in Firestore rules:
                // ['studentId', 'studentName', 'subject', 'type', 'score', 'semester', 'academicYear', 'createdAt', 'updatedAt']
                const newDocRef = doc(collection(db, "grades"));
                batch.set(newDocRef, {
                  studentId: s.id,
                  studentName: studentDisplayName,
                  subject: matrixSubject,
                  type: firestoreType,
                  score: clampedScore,
                  semester: matrixSemester,
                  academicYear: matrixAcademicYear,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp()
                });
              }
              savedCount++;
            }
          }
        });
      });

      if (savedCount === 0) {
        toast.showWarning("Belum ada nilai yang diisi pada tabel.", "Nilai Masih Kosong");
        setIsSavingMatrix(false);
        return;
      }

      await batch.commit();
      setHasUnsavedChanges(false);
      toast.showSuccess(
        `Berhasil menyimpan ${savedCount} nilai untuk kelas ${matrixClassId} (${matrixSubject})!`,
        "Nilai Berhasil Disimpan"
      );
    } catch (err: any) {
      console.error("Save matrix error:", err);
      toast.showError("Gagal menyimpan nilai: " + (err?.message || "Kesalahan sistem"), "Gagal");
    } finally {
      setIsSavingMatrix(false);
    }
  };

  // Filtered Grades for Table View
  const accessibleGrades = useMemo(() => {
    return grades.filter(g => {
      // 1. RBAC for Student Role
      if (isStudentRole) {
        const matchesId =
          (studentDoc?.nisn && g.studentId === studentDoc.nisn) ||
          (studentDoc?.id && g.studentId === studentDoc.id) ||
          (currentUser?.uid && g.studentId === currentUser.uid);

        const matchesEmail = currentUser?.email && g.studentEmail === currentUser.email;
        const matchesName = studentDoc?.name && g.studentName &&
          g.studentName.toLowerCase().trim() === studentDoc.name.toLowerCase().trim();

        if (!matchesId && !matchesEmail && !matchesName) return false;
      }

      // 2. RBAC for Guru (Wali Kelas & Guru Mata Pelajaran)
      if (isGuru) {
        if (!hasAnyGradingAccess) return false;
        const student = getStudentByIdOrName(g.studentId) || getStudentByIdOrName(g.studentName);
        const studentClass = (g.classId || student?.classId || student?.className || student?.class || "").trim().toLowerCase();
        const gradeSubject = (g.subject || "").trim().toLowerCase();

        const isHomeroom = homeroomClasses.some(hc => hc.trim().toLowerCase() === studentClass);
        const isTaughtSubject = taughtSubjectClassPairs.some(
          p => p.class.trim().toLowerCase() === studentClass && p.subject.trim().toLowerCase() === gradeSubject
        );

        if (!isHomeroom && !isTaughtSubject) return false;
      }

      // 3. Type Filter
      if (selectedType !== "Semua") {
        const normalizedGType = g.type || "";
        if (selectedType === "PTS" && !normalizedGType.includes("PTS") && !normalizedGType.includes("Tengah") && normalizedGType !== "UTS") return false;
        if (selectedType === "PAS" && !normalizedGType.includes("PAS") && !normalizedGType.includes("Akhir") && normalizedGType !== "UAS") return false;
        if (selectedType === "Ulangan Harian" && !normalizedGType.includes("Ulangan") && !normalizedGType.includes("Harian")) return false;
        if (selectedType === "Asesmen Akhir" && !normalizedGType.includes("Ujian") && !normalizedGType.includes("Asesmen Akhir")) return false;
        if (selectedType !== "PTS" && selectedType !== "PAS" && selectedType !== "Ulangan Harian" && selectedType !== "Asesmen Akhir" && normalizedGType !== selectedType) return false;
      }

      // 4. Class Filter
      if (selectedClass !== "All") {
        const student = getStudentByIdOrName(g.studentId) || getStudentByIdOrName(g.studentName);
        const studentClass = (g.classId || student?.classId || student?.className || student?.class || "").trim().toLowerCase();
        if (studentClass !== selectedClass.trim().toLowerCase()) return false;
      }

      // 5. Subject Filter
      if (selectedSubject !== "All" && g.subject !== selectedSubject) {
        return false;
      }

      // 6. KKM Status Filter
      const kkm = Number(g.kkm) || 75;
      const score = Number(g.score) || 0;
      if (selectedKkmStatus === "Lulus" && score < kkm) return false;
      if (selectedKkmStatus === "Remedial" && score >= kkm) return false;

      // 7. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const sName = (g.studentName || "").toLowerCase();
        const sId = (g.studentId || "").toLowerCase();
        const subj = (g.subject || "").toLowerCase();
        const title = (g.assessmentName || g.topic || "").toLowerCase();
        return sName.includes(q) || sId.includes(q) || subj.includes(q) || title.includes(q);
      }

      return true;
    });
  }, [grades, isStudentRole, studentDoc, currentUser, isGuru, hasAnyGradingAccess, homeroomClasses, taughtSubjectClassPairs, selectedType, selectedClass, selectedSubject, selectedKkmStatus, searchQuery, getStudentByIdOrName]);

  // Single Grade Submit Handler (CrudSheet)
  const handleCrudSubmit = async (data: any) => {
    if (isStudentRole) return;

    if (isGuru) {
      if (!hasAnyGradingAccess) {
        toast.showError("Anda belum memiliki penugasan mengajar mata pelajaran atau wali kelas.", "Akses Ditolak");
        return;
      }
      const targetStudent = getStudentByIdOrName(data.studentId || crudState.data?.studentId);
      const studentClass = (data.classId || crudState.data?.classId || targetStudent?.classId || targetStudent?.className || targetStudent?.class || "").trim();
      const subjectName = (data.subject || crudState.data?.subject || "").trim();

      if (!isTeacherAuthorizedFor(studentClass, subjectName)) {
        toast.showError(
          `Anda hanya dapat memberikan atau mengelola nilai untuk mata pelajaran ${subjectName || ""} pada kelas yang menjadi tanggung jawab Anda.`,
          "Akses Ditolak"
        );
        return;
      }
    }

    try {
      const firestoreType = mapTypeToFirestore(data.type || "Tugas");
      const numScore = Math.min(Math.max(Number(data.score) || 0, 0), 100);
      const targetStudent = getStudentByIdOrName(data.studentId);
      const studentName = targetStudent ? (targetStudent.fullName || targetStudent.name) : (data.studentName || "Siswa");
      const targetSubject = subjects.find(s => s.name?.toLowerCase().trim() === (data.subject || "").toLowerCase().trim());
      const officialKkm = Number(targetSubject?.kkm) || Number(schoolGrading.kkmScore) || 75;

      if (crudState.mode === "create") {
        const newDocRef = doc(collection(db, "grades"));
        await setDoc(newDocRef, {
          studentId: data.studentId || targetStudent?.id || "student_id",
          studentName: studentName,
          subject: data.subject || "Matematika Wajib",
          type: firestoreType,
          score: numScore,
          kkm: officialKkm,
          semester: data.semester || "Ganjil",
          academicYear: data.academicYear || "2025/2026",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        toast.showSuccess("Nilai siswa berhasil ditambahkan.", "Berhasil Tambah");
      } else if (crudState.mode === "edit" && crudState.data?.id) {
        await updateDoc(doc(db, "grades", crudState.data.id), {
          studentId: data.studentId || crudState.data.studentId,
          studentName: studentName,
          subject: data.subject || crudState.data.subject,
          type: firestoreType,
          score: numScore,
          kkm: officialKkm,
          semester: data.semester || crudState.data.semester,
          academicYear: data.academicYear || crudState.data.academicYear,
          updatedAt: serverTimestamp()
        });
        toast.showSuccess("Data nilai siswa berhasil diperbarui.", "Berhasil Edit");
      } else if (crudState.mode === "delete" && crudState.data?.id) {
        await deleteDoc(doc(db, "grades", crudState.data.id));
        toast.showSuccess("Nilai siswa berhasil dihapus.", "Berhasil Hapus");
      }
    } catch (error: any) {
      console.error("Error saving grade:", error);
      toast.showError("Gagal menyimpan data nilai siswa.", "Gagal");
      throw error;
    }
  };

  // Gradebook Grouping (for Rekap Rapor View)
  const gradebookData = useMemo(() => {
    const studentMap = new Map<string, any>();
    const target = selectedClass.trim().toLowerCase();

    let baseStudentList = students;
    if (isGuru) {
      if (!authorizedClasses || authorizedClasses.length === 0) return [];
      baseStudentList = students.filter(s => {
        const c = (s.classId || s.className || s.class || "").trim().toLowerCase();
        return authorizedClasses.some(ac => ac.trim().toLowerCase() === c);
      });
    }

    const targetStudents = selectedClass === "All"
      ? baseStudentList
      : baseStudentList.filter(s => (s.classId || s.className || s.class || "").trim().toLowerCase() === target);

    targetStudents.forEach(s => {
      const key = s.id || s._firestoreId || s.uid;
      studentMap.set(key, {
        student: s,
        scoresByType: {
          "Tugas": [] as number[],
          "Kuis": [] as number[],
          "Ulangan Harian": [] as number[],
          "PTS": [] as number[],
          "PAS": [] as number[],
          "Asesmen Akhir": [] as number[]
        }
      });
    });

    accessibleGrades.forEach(g => {
      const matched = getStudentByIdOrName(g.studentId) || getStudentByIdOrName(g.studentName);
      const entry = matched
        ? (studentMap.get(matched.id) || studentMap.get(matched._firestoreId) || studentMap.get(matched.uid))
        : studentMap.get(g.studentId);

      if (entry) {
        const sc = Number(g.score) || 0;
        const t = g.type || "";
        if (t === "Tugas") entry.scoresByType["Tugas"].push(sc);
        else if (t === "Kuis") entry.scoresByType["Kuis"].push(sc);
        else if (t.includes("Ulangan")) entry.scoresByType["Ulangan Harian"].push(sc);
        else if (t.includes("PTS") || t === "UTS") entry.scoresByType["PTS"].push(sc);
        else if (t.includes("PAS") || t === "UAS") entry.scoresByType["PAS"].push(sc);
        else entry.scoresByType["Asesmen Akhir"].push(sc);
      }
    });

    return Array.from(studentMap.values()).map(item => {
      const calcAvg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
      const avgTugas = calcAvg(item.scoresByType["Tugas"]);
      const avgKuis = calcAvg(item.scoresByType["Kuis"]);
      const avgUH = calcAvg(item.scoresByType["Ulangan Harian"]);
      const avgPTS = calcAvg(item.scoresByType["PTS"]);
      const avgPAS = calcAvg(item.scoresByType["PAS"]);
      const avgAkhir = calcAvg(item.scoresByType["Asesmen Akhir"]);

      // Calculate weighted final score using Super Admin's official weights
      let weightedSum = 0;
      let totalWeights = 0;

      const harianScores = [avgTugas, avgKuis, avgUH].filter(v => v !== null) as number[];
      const avgHarian = harianScores.length > 0 ? Math.round(harianScores.reduce((a, b) => a + b, 0) / harianScores.length) : null;
      if (avgHarian !== null) {
        weightedSum += avgHarian * (schoolGrading.assignmentWeight || 30);
        totalWeights += (schoolGrading.assignmentWeight || 30);
      }

      if (avgPTS !== null) {
        weightedSum += avgPTS * (schoolGrading.midtermWeight || 30);
        totalWeights += (schoolGrading.midtermWeight || 30);
      }

      const akhirScores = [avgPAS, avgAkhir].filter(v => v !== null) as number[];
      const avgAkhirTotal = akhirScores.length > 0 ? Math.round(akhirScores.reduce((a, b) => a + b, 0) / akhirScores.length) : null;
      if (avgAkhirTotal !== null) {
        weightedSum += avgAkhirTotal * (schoolGrading.finalWeight || 40);
        totalWeights += (schoolGrading.finalWeight || 40);
      }

      const finalScore = totalWeights > 0 ? Math.round(weightedSum / totalWeights) : null;

      let predicate = "-";
      if (finalScore !== null) {
        if (finalScore >= 90) predicate = "A (Sangat Baik)";
        else if (finalScore >= 80) predicate = "B (Baik)";
        else if (finalScore >= (schoolGrading.kkmScore || 75)) predicate = "C (Cukup)";
        else predicate = "D (Perlu Bimbingan)";
      }

      return {
        ...item,
        avgTugas,
        avgKuis,
        avgUH,
        avgPTS,
        avgPAS,
        avgAkhir,
        finalScore,
        predicate
      };
    });
  }, [students, accessibleGrades, selectedClass, isGuru, authorizedClasses, getStudentByIdOrName, schoolGrading]);

  // Single Form Configuration for CrudSheet
  const filteredStudentsForSingleForm = useMemo(() => {
    let pool = students;
    if (isGuru) {
      if (!authorizedClasses || authorizedClasses.length === 0) return [];
      pool = students.filter(s => {
        const c = (s.classId || s.className || s.class || "").trim().toLowerCase();
        return authorizedClasses.some(ac => ac.trim().toLowerCase() === c);
      });
    }

    if (!currentFormData.classId) {
      return pool.map(s => {
        const c = s.classId || s.className || s.class || "Tanpa Kelas";
        return {
          label: `${s.fullName || s.name} (${c})`,
          value: s.id
        };
      });
    }
    const target = currentFormData.classId.trim().toLowerCase();
    return pool
      .filter(s => (s.classId || s.className || s.class || "").trim().toLowerCase() === target)
      .map(s => ({ label: `${s.fullName || s.name} (NISN: ${s.nisn || s.id})`, value: s.id }));
  }, [students, currentFormData.classId, isGuru, authorizedClasses]);

  // Dynamic Subject Options for Single Form (filtered based on selected class in form)
  const availableSubjectOptionsForSingleForm = useMemo(() => {
    const allSubjects = subjects.length > 0
      ? subjects.map(s => ({ label: s.name, value: s.name }))
      : [
        { label: "Matematika Wajib", value: "Matematika Wajib" },
        { label: "Bahasa Indonesia", value: "Bahasa Indonesia" },
        { label: "Bahasa Inggris", value: "Bahasa Inggris" },
        { label: "Fisika", value: "Fisika" },
        { label: "Kimia", value: "Kimia" },
        { label: "Biologi", value: "Biologi" },
        { label: "Ekonomi", value: "Ekonomi" },
        { label: "Sosiologi", value: "Sosiologi" },
        { label: "Pendidikan Agama", value: "Pendidikan Agama" }
      ];

    if (!isGuru) return allSubjects;

    if (!currentFormData.classId) {
      const taughtSubjs = Array.from(new Set(taughtSubjectClassPairs.map(p => p.subject)));
      if (taughtSubjs.length > 0) {
        return taughtSubjs.map(s => ({ label: s, value: s }));
      }
      return allSubjects;
    }

    const normClass = currentFormData.classId.trim().toLowerCase();
    const isWali = homeroomClasses.some(hc => hc.trim().toLowerCase() === normClass);
    if (isWali) return allSubjects;

    const allowed = getAuthorizedSubjectsForClass(currentFormData.classId);
    if (allowed.length > 0) {
      return allowed.map(s => ({ label: s, value: s }));
    }
    return [];
  }, [subjects, isGuru, currentFormData.classId, homeroomClasses, taughtSubjectClassPairs]);

  const singleGradeFields: CrudField[] = useMemo(() => [
    {
      name: "classId",
      label: "Kelas Siswa",
      type: "select",
      options: availableClassOptions,
      category: "akademik",
      colSpan: 1
    },
    {
      name: "studentId",
      label: "Pilih Siswa",
      type: "select",
      options: filteredStudentsForSingleForm,
      placeholder: currentFormData.classId ? "Pilih Siswa" : "Pilih kelas terlebih dahulu",
      category: "akademik",
      colSpan: 1
    },
    {
      name: "subject",
      label: "Mata Pelajaran",
      type: "select",
      options: availableSubjectOptionsForSingleForm,
      category: "akademik",
      colSpan: 1
    },
    {
      name: "type",
      label: "Tipe Penilaian",
      type: "select",
      options: ASSESSMENT_TYPES.map(t => ({ label: t.label, value: t.id })),
      category: "akademik",
      colSpan: 1
    },
    {
      name: "assessmentName",
      label: "Nama / Topik Penilaian",
      placeholder: "Contoh: Tugas 1 Aljabar / Ulangan Bab 2",
      category: "akademik",
      colSpan: 1
    },
    {
      name: "score",
      label: "Nilai Siswa (0-100)",
      type: "number",
      placeholder: "0 - 100",
      category: "akademik",
      colSpan: 1
    },
    {
      name: "kkm",
      label: "Nilai KKM (Ditetapkan Super Admin)",
      type: "number",
      disabled: true,
      readOnly: true,
      helperText: "Batas KKM dan bobot nilai diatur oleh Super Admin pada kurikulum mata pelajaran",
      placeholder: String(subjects.find(s => s.name?.toLowerCase().trim() === (currentFormData.subject || "").toLowerCase().trim())?.kkm || schoolGrading.kkmScore || 75),
      category: "akademik",
      colSpan: 1
    },
    {
      name: "semester",
      label: "Semester",
      type: "select",
      options: [
        { label: "Ganjil", value: "Ganjil" },
        { label: "Genap", value: "Genap" }
      ],
      category: "akademik",
      colSpan: 1
    },
    {
      name: "notes",
      label: "Catatan Evaluasi Guru (Opsional)",
      placeholder: "Catatan kemajuan siswa...",
      category: "pribadi",
      colSpan: 2
    }
  ], [availableClassOptions, availableSubjectOptions, filteredStudentsForSingleForm, currentFormData.classId, currentFormData.subject, subjects, schoolGrading]);

  // =========================================================================
  // LOGIKA RESOLUSI DATA SISWA UNTUK PORTAL SISWA
  // =========================================================================
  const matchedStudent = useMemo(() => {
    if (!currentUser) return null;
    const uid = currentUser.uid;
    const email = currentUser.email?.toLowerCase();
    const uName = (currentUserData?.name || currentUserData?.fullName || studentDoc?.name || "").toLowerCase().trim();
    const uNisn = currentUserData?.nisn || studentDoc?.nisn;

    return students.find(s =>
      s.id === uid ||
      s._firestoreId === uid ||
      (email && s.email && s.email.toLowerCase() === email) ||
      (uNisn && (s.nisn === uNisn || s.id === uNisn)) ||
      (uName && s.name && s.name.toLowerCase().trim() === uName) ||
      (uName && s.fullName && s.fullName.toLowerCase().trim() === uName)
    ) || null;
  }, [students, currentUser, currentUserData, studentDoc]);

  const studentClassId = useMemo(() => {
    return matchedStudent?.classId || matchedStudent?.className || matchedStudent?.class ||
      currentUserData?.classId || currentUserData?.className || currentUserData?.class ||
      studentDoc?.classId || studentDoc?.className || studentDoc?.class || "";
  }, [matchedStudent, currentUserData, studentDoc]);

  const studentMyClass = useMemo(() => {
    if (!studentClassId) return null;
    return classes.find(c =>
      c.name?.toLowerCase() === studentClassId.toLowerCase() ||
      c.id?.toLowerCase() === studentClassId.toLowerCase() ||
      c._firestoreId === studentClassId
    ) || null;
  }, [classes, studentClassId]);

  const studentHomeroomTeacher = useMemo(() => {
    const hrName = studentMyClass?.homeroom;
    if (!hrName) return null;
    return teachers.find(t => t.name?.toLowerCase() === hrName.toLowerCase()) || { name: hrName };
  }, [studentMyClass, teachers]);

  const studentDisplayName = matchedStudent?.fullName || matchedStudent?.name || currentUserData?.name || currentUser?.displayName || "Siswa";
  const studentNisn = matchedStudent?.nisn || matchedStudent?.id || currentUserData?.nisn || studentDoc?.nisn || "-";

  // Filter nilai spesifik milik siswa ini
  const myStudentGrades = useMemo(() => {
    if (!isStudentRole) return [];
    const uid = currentUser?.uid;
    const email = currentUser?.email?.toLowerCase();
    const uName = (currentUserData?.name || currentUserData?.fullName || studentDoc?.name || "").toLowerCase().trim();
    const sName = (matchedStudent?.name || matchedStudent?.fullName || "").toLowerCase().trim();
    const sId = matchedStudent?.id;
    const sNisn = matchedStudent?.nisn || currentUserData?.nisn || studentDoc?.nisn;

    return grades.filter(g => {
      // 1. Cocokkan ID atau NISN
      if (sId && g.studentId === sId) return true;
      if (uid && (g.studentId === uid || g.uid === uid)) return true;
      if (sNisn && (g.studentId === sNisn || g.nisn === sNisn)) return true;

      // 2. Cocokkan Email
      if (email && g.studentEmail && g.studentEmail.toLowerCase() === email) return true;

      // 3. Cocokkan Nama Siswa
      if (g.studentName) {
        const gName = g.studentName.toLowerCase().trim();
        if (sName && (gName === sName || gName.includes(sName) || sName.includes(gName))) return true;
        if (uName && (gName === uName || gName.includes(uName) || uName.includes(gName))) return true;
      }

      return false;
    });
  }, [grades, isStudentRole, currentUser, currentUserData, studentDoc, matchedStudent]);

  // Kelompokkan nilai per mata pelajaran yang sudah dinilai
  const studentGradesBySubject = useMemo(() => {
    const map = new Map<string, any[]>();

    myStudentGrades.forEach(g => {
      const subj = g.subject || "Mata Pelajaran";
      if (!map.has(subj)) {
        map.set(subj, []);
      }
      map.get(subj)!.push(g);
    });

    return Array.from(map.entries()).map(([subjName, subjGrades]) => {
      const totalScore = subjGrades.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0);
      const avgScore = subjGrades.length > 0 ? Math.round((totalScore / subjGrades.length) * 10) / 10 : 0;
      const kkm = Number(subjGrades[0]?.kkm) || 75;
      const isPassed = avgScore >= kkm;

      const getScoreForType = (typeKeywords: string[]) => {
        const found = subjGrades.find(g => {
          const t = (g.type || "").toLowerCase();
          return typeKeywords.some(kw => t.includes(kw.toLowerCase()));
        });
        return found && found.score !== undefined && found.score !== null ? Number(found.score) : null;
      };

      const tugas = getScoreForType(["Tugas"]);
      const kuis = getScoreForType(["Kuis"]);
      const uh = getScoreForType(["Ulangan", "UH"]);
      const pts = getScoreForType(["PTS", "UTS", "Tengah"]);
      const pas = getScoreForType(["PAS", "UAS", "Akhir Semester"]);
      const akhir = getScoreForType(["Asesmen Akhir", "Ujian Akhir"]);

      let gradeLetter = "D";
      let gradePred = "Perlu Bimbingan";
      if (avgScore >= 90) {
        gradeLetter = "A";
        gradePred = "Sangat Baik";
      } else if (avgScore >= 80) {
        gradeLetter = "B";
        gradePred = "Baik";
      } else if (avgScore >= kkm) {
        gradeLetter = "C";
        gradePred = "Cukup";
      }

      const notesWithText = subjGrades.filter(g => g.notes && g.notes.trim() !== "");
      const latestNote = notesWithText.length > 0 ? notesWithText[0].notes : null;
      const subjMeta = subjects.find(s => s.name?.toLowerCase() === subjName.toLowerCase());

      return {
        subject: subjName,
        category: subjMeta?.category || "Wajib",
        creditHours: subjMeta?.creditHours || "3 JP",
        kkm,
        avgScore,
        isPassed,
        gradeLetter,
        gradePred,
        tugas,
        kuis,
        uh,
        pts,
        pas,
        akhir,
        totalItems: subjGrades.length,
        latestNote,
        gradesList: subjGrades
      };
    }).sort((a, b) => b.avgScore - a.avgScore);
  }, [myStudentGrades, subjects]);

  // Statistik Kumulatif Siswa
  const studentTotalGradesCount = myStudentGrades.length;
  const studentOverallAverage = studentTotalGradesCount > 0
    ? (myStudentGrades.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0) / studentTotalGradesCount).toFixed(1)
    : "0";
  const studentPassedSubjectsCount = studentGradesBySubject.filter(s => s.isPassed).length;
  const studentTotalSubjectsCount = studentGradesBySubject.length;
  const studentPassingPercentage = studentTotalSubjectsCount > 0
    ? Math.round((studentPassedSubjectsCount / studentTotalSubjectsCount) * 100)
    : 100;

  const studentHighestScore = useMemo(() => {
    if (myStudentGrades.length === 0) return null;
    return [...myStudentGrades].sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0))[0];
  }, [myStudentGrades]);

  const studentAvailableSubjects = useMemo(() => {
    return Array.from(new Set(myStudentGrades.map(g => g.subject).filter(Boolean)));
  }, [myStudentGrades]);

  // Filter daftar riwayat penilaian untuk Tab Riwayat Lengkap
  const studentFilteredHistoryGrades = useMemo(() => {
    return myStudentGrades.filter(g => {
      if (studentSubjectFilter !== "All" && g.subject !== studentSubjectFilter) return false;

      if (studentTypeFilter !== "Semua") {
        const t = (g.type || "").toLowerCase();
        if (studentTypeFilter === "PTS" && !t.includes("pts") && !t.includes("uts") && !t.includes("tengah")) return false;
        if (studentTypeFilter === "PAS" && !t.includes("pas") && !t.includes("uas") && !t.includes("akhir semester")) return false;
        if (studentTypeFilter === "Ulangan Harian" && !t.includes("ulangan") && !t.includes("uh")) return false;
        if (studentTypeFilter === "Asesmen Akhir" && !t.includes("ujian") && !t.includes("asesmen akhir")) return false;
        if (studentTypeFilter !== "PTS" && studentTypeFilter !== "PAS" && studentTypeFilter !== "Ulangan Harian" && studentTypeFilter !== "Asesmen Akhir" && g.type !== studentTypeFilter) return false;
      }

      const score = Number(g.score) || 0;
      const kkm = Number(g.kkm) || 75;
      if (studentStatusFilter === "Tuntas" && score < kkm) return false;
      if (studentStatusFilter === "Remedial" && score >= kkm) return false;

      if (studentSemesterFilter !== "All" && g.semester && g.semester !== studentSemesterFilter) return false;

      if (studentSearch.trim()) {
        const q = studentSearch.toLowerCase().trim();
        const sSubj = (g.subject || "").toLowerCase();
        const sType = (g.type || "").toLowerCase();
        const sName = (g.assessmentName || g.topic || "").toLowerCase();
        const sNote = (g.notes || "").toLowerCase();
        return sSubj.includes(q) || sType.includes(q) || sName.includes(q) || sNote.includes(q);
      }

      return true;
    });
  }, [myStudentGrades, studentSubjectFilter, studentTypeFilter, studentStatusFilter, studentSemesterFilter, studentSearch]);

  // =========================================================================
  // VIEW KHUSUS ROLE SISWA: PORTAL CAPAIAN & PENILAIAN DIRI SENDIRI
  // =========================================================================
  if (isStudentRole && !loading) {
    if (!studentMyClass && !studentClassId) {
      return (
        <div className="p-4 sm:p-8 max-w-[1200px] mx-auto w-full space-y-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-xl border border-gray-100 p-8 sm:p-12 text-center max-w-lg mx-auto shadow-xs my-12">
            <div className="w-16 h-16 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-sm">
              <AlertCircle className="w-8 h-8" />
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
              Belum Terdaftar di Kelas
            </span>
            <h2 className="text-xl font-black text-gray-900 mt-3 tracking-tight">Data Kelas Belum Terhubung</h2>
            <p className="text-xs text-gray-500 mt-2 font-medium leading-relaxed">
              Akun Anda saat ini belum terdaftar pada rombongan belajar/kelas manapun. Hasil penilaian dan capaian belajar akan otomatis ditampilkan di sini setelah Anda ditempatkan pada kelas resmi.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 sm:p-8 pb-16 max-w-[1600px] mx-auto w-full flex flex-col space-y-6 animate-in fade-in duration-200 printable-area">

        {/* ================= HEADER PORTAL SISWA ================= */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-purple-50/70 via-white to-indigo-50/40 p-6 rounded-xl border border-purple-100/60 shadow-2xs">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-[#531FFF] text-white flex items-center justify-center shadow-lg shadow-[#531FFF]/25">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                    Capaian & Penilaian Belajar
                  </h1>
                  <span className="px-2.5 py-0.5 text-xs font-bold bg-[#F3F0FF] text-[#531FFF] rounded-full border border-[#531FFF]/20 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Portal Siswa
                  </span>
                  <span className="px-2.5 py-0.5 text-xs font-bold bg-purple-50 text-purple-700 rounded-full border border-purple-200 flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5" /> Kelas {studentMyClass?.name || studentClassId}
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  Transparansi hasil evaluasi belajar, tugas harian, PTS, dan PAS milik <strong className="text-gray-800">{studentDisplayName}</strong> (NISN: {studentNisn}).
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 no-print">
            <button
              onClick={() => window.print()}
              className="px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-extrabold rounded-lg border border-gray-200 shadow-xs flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-98 cursor-pointer"
              title="Cetak transkrip nilai capaian"
            >
              <Printer className="w-4 h-4 text-[#531FFF]" />
              <span>Cetak Rapor Capaian</span>
            </button>
          </div>
        </div>

        {/* ================= METRICS CARDS ================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* CARD 1: RATA-RATA NILAI */}
          <div className="p-5 rounded-xl bg-white border border-gray-100 shadow-xs flex flex-col justify-between hover:border-purple-200 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">Rata-Rata Kumulatif</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#531FFF] flex items-center justify-center font-bold">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-gray-900 tracking-tight">{studentOverallAverage}</span>
                <span className="text-xs font-bold text-gray-400">/ 100</span>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider",
                  Number(studentOverallAverage) >= 90 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                    Number(studentOverallAverage) >= 80 ? "bg-blue-50 text-blue-700 border border-blue-200" :
                      Number(studentOverallAverage) >= 75 ? "bg-amber-50 text-amber-700 border border-amber-200" :
                        "bg-rose-50 text-rose-700 border border-rose-200"
                )}>
                  {Number(studentOverallAverage) >= 90 ? "Predikat A (Sangat Baik)" :
                    Number(studentOverallAverage) >= 80 ? "Predikat B (Baik)" :
                      Number(studentOverallAverage) >= 75 ? "Predikat C (Cukup)" : "Predikat D (Perlu Bimbingan)"}
                </span>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#531FFF] to-indigo-600 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, Number(studentOverallAverage)))}%` }}
              />
            </div>
          </div>

          {/* CARD 2: KETUNTASAN KKM */}
          <div className="p-5 rounded-xl bg-white border border-gray-100 shadow-xs flex flex-col justify-between hover:border-emerald-200 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">Ketuntasan KKM</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-gray-900 tracking-tight">
                  {studentPassedSubjectsCount} <span className="text-sm font-bold text-gray-400">/ {studentTotalSubjectsCount} Mapel</span>
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {studentPassingPercentage}% Memenuhi KKM
                </span>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${studentPassingPercentage}%` }}
              />
            </div>
          </div>

          {/* CARD 3: TOTAL EVALUASI TERINPUT */}
          <div className="p-5 rounded-xl bg-white border border-gray-100 shadow-xs flex flex-col justify-between hover:border-blue-200 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">Evaluasi Dinilai</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-gray-900 tracking-tight">{studentTotalGradesCount}</span>
                <span className="text-xs font-bold text-gray-400">Tugas / Ujian</span>
              </div>
              <div className="mt-1.5">
                <span className="text-[11px] font-medium text-gray-500">
                  Dari {studentTotalSubjectsCount} mata pelajaran aktif
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-[#531FFF]">
              <BadgeCheck className="w-3.5 h-3.5" /> Terverifikasi Guru Pengampu
            </div>
          </div>

          {/* CARD 4: CAPAIAN TERTINGGI */}
          <div className="p-5 rounded-xl bg-white border border-gray-100 shadow-xs flex flex-col justify-between hover:border-amber-200 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">Nilai Tertinggi</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-amber-600 tracking-tight">
                  {studentHighestScore ? studentHighestScore.score : "-"}
                </span>
                <span className="text-xs font-bold text-gray-400">/ 100</span>
              </div>
              <div className="mt-1.5 truncate">
                <span className="text-[11px] font-bold text-gray-700 truncate block">
                  {studentHighestScore ? `${studentHighestScore.subject} (${studentHighestScore.type || "Tugas"})` : "Belum ada evaluasi"}
                </span>
              </div>
            </div>
            <div className="text-[10px] font-extrabold text-emerald-600 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Prestasi Terbaik Semester Ini
            </div>
          </div>

        </div>

        {/* ================= TAB NAVIGATION ================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3 no-print">
          <div className="flex items-center gap-2 bg-gray-100/80 p-1 rounded-lg w-fit">
            <button
              onClick={() => setStudentTab("bySubject")}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer",
                studentTab === "bySubject"
                  ? "bg-white text-gray-900 shadow-xs"
                  : "text-gray-500 hover:text-gray-900"
              )}
            >
              <LayoutGrid className="w-4 h-4 text-[#531FFF]" />
              <span>Ringkasan Per Mata Pelajaran</span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-black",
                studentTab === "bySubject" ? "bg-purple-50 text-[#531FFF]" : "bg-gray-200 text-gray-600"
              )}>
                {studentGradesBySubject.length}
              </span>
            </button>

            <button
              onClick={() => setStudentTab("allGrades")}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer",
                studentTab === "allGrades"
                  ? "bg-white text-gray-900 shadow-xs"
                  : "text-gray-500 hover:text-gray-900"
              )}
            >
              <TableIcon className="w-4 h-4 text-[#531FFF]" />
              <span>Riwayat Lengkap Penilaian</span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-black",
                studentTab === "allGrades" ? "bg-purple-50 text-[#531FFF]" : "bg-gray-200 text-gray-600"
              )}>
                {myStudentGrades.length}
              </span>
            </button>
          </div>

          <div className="text-xs font-medium text-gray-500 flex items-center gap-2">
            <span>Wali Kelas:</span>
            <strong className="text-gray-800">{studentHomeroomTeacher?.name || studentMyClass?.homeroom || "-"}</strong>
          </div>
        </div>

        {/* ================= TAB CONTENT 1: PER MATA PELAJARAN ================= */}
        {studentTab === "bySubject" && (
          <div className="space-y-4">
            {studentGradesBySubject.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-8 sm:p-12 text-center max-w-lg mx-auto shadow-xs my-8">
                <div className="w-16 h-16 rounded-xl bg-purple-50 text-[#531FFF] flex items-center justify-center mx-auto mb-4 border border-purple-100 shadow-sm">
                  <Award className="w-8 h-8" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-[#531FFF]/10 text-[#531FFF] border border-[#531FFF]/20 uppercase tracking-wider">
                  Belum Ada Nilai Terbit
                </span>
                <h2 className="text-xl font-black text-gray-900 mt-3 tracking-tight">Belum Ada Penilaian yang Diterbitkan</h2>
                <p className="text-xs text-gray-500 mt-2 font-medium leading-relaxed">
                  Bapak/Ibu guru mata pelajaran belum menginput nilai evaluasi (Tugas, Kuis, UH, PTS, atau PAS) untuk semester ini. Nilai capaian Anda akan otomatis tampil di sini segera setelah diterbitkan oleh guru pengampu.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {studentGradesBySubject.map((item) => {
                  const isExpanded = expandedSubjectCard === item.subject;

                  return (
                    <div
                      key={item.subject}
                      className="bg-white rounded-xl border border-gray-100 hover:border-purple-200 shadow-xs p-6 flex flex-col justify-between transition-all duration-200"
                    >
                      <div>
                        {/* Header Card */}
                        <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-100">
                                {item.category}
                              </span>
                              <span className="text-xs font-semibold text-gray-400">
                                {item.creditHours}
                              </span>
                            </div>
                            <h3 className="text-lg font-black text-gray-900 tracking-tight">
                              {item.subject}
                            </h3>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-gray-50 text-gray-600 border border-gray-200">
                              Target KKM: {item.kkm}
                            </span>
                            <span className={cn(
                              "px-2 py-0.5 rounded-md text-[10px] font-black flex items-center gap-1",
                              item.isPassed
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            )}>
                              {item.isPassed ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3" /> Tuntas KKM
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="w-3 h-3" /> Perlu Remedial
                                </>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Nilai Rata-rata & Visual Progress */}
                        <div className="my-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/70 p-4 rounded-lg border border-gray-100">
                          <div>
                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Rata-Rata Capaian</span>
                            <div className="flex items-baseline gap-2 mt-0.5">
                              <span className={cn(
                                "text-3xl font-black tracking-tight",
                                item.avgScore >= 90 ? "text-emerald-600" :
                                  item.avgScore >= 75 ? "text-blue-600" : "text-rose-600"
                              )}>
                                {item.avgScore}
                              </span>
                              <span className="text-xs font-bold text-gray-400">/ 100</span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end">
                            <span className="text-xs font-black text-gray-800">
                              Predikat {item.gradeLetter}
                            </span>
                            <span className="text-[11px] font-medium text-gray-500">
                              {item.gradePred}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar with KKM line */}
                        <div className="space-y-1.5 mb-5">
                          <div className="relative w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={cn(
                                "h-2 rounded-full transition-all duration-500",
                                item.isPassed ? "bg-emerald-500" : "bg-rose-500"
                              )}
                              style={{ width: `${Math.min(100, Math.max(0, item.avgScore))}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] font-bold text-gray-400">
                            <span>0</span>
                            <span className="text-gray-600">Batas KKM: {item.kkm}</span>
                            <span>100</span>
                          </div>
                        </div>

                        {/* 6 Assessment Type Scores Matrix */}
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2 pb-2">
                          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-blue-50/50 border border-blue-100">
                            <span className="text-[10px] font-bold text-blue-700">Tugas</span>
                            <span className="text-sm font-black text-gray-900 mt-0.5">
                              {item.tugas !== null ? item.tugas : "-"}
                            </span>
                          </div>

                          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-indigo-50/50 border border-indigo-100">
                            <span className="text-[10px] font-bold text-indigo-700">Kuis</span>
                            <span className="text-sm font-black text-gray-900 mt-0.5">
                              {item.kuis !== null ? item.kuis : "-"}
                            </span>
                          </div>

                          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-purple-50/50 border border-purple-100">
                            <span className="text-[10px] font-bold text-purple-700">UH</span>
                            <span className="text-sm font-black text-gray-900 mt-0.5">
                              {item.uh !== null ? item.uh : "-"}
                            </span>
                          </div>

                          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-amber-50/50 border border-amber-100">
                            <span className="text-[10px] font-bold text-amber-700">PTS</span>
                            <span className="text-sm font-black text-gray-900 mt-0.5">
                              {item.pts !== null ? item.pts : "-"}
                            </span>
                          </div>

                          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-orange-50/50 border border-orange-100">
                            <span className="text-[10px] font-bold text-orange-700">PAS</span>
                            <span className="text-sm font-black text-gray-900 mt-0.5">
                              {item.pas !== null ? item.pas : "-"}
                            </span>
                          </div>

                          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-rose-50/50 border border-rose-100">
                            <span className="text-[10px] font-bold text-rose-700">Akhir</span>
                            <span className="text-sm font-black text-gray-900 mt-0.5">
                              {item.akhir !== null ? item.akhir : "-"}
                            </span>
                          </div>
                        </div>

                        {/* Teacher Note Quote (if any) */}
                        {item.latestNote && (
                          <div className="mt-3 p-3 rounded-lg bg-purple-50/60 border border-purple-100 flex items-start gap-2.5">
                            <MessageSquare className="w-4 h-4 text-[#531FFF] shrink-0 mt-0.5" />
                            <div>
                              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
                                Catatan Guru Pengampu:
                              </span>
                              <p className="text-xs text-gray-700 font-medium italic mt-0.5">
                                "{item.latestNote}"
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Accordion Toggle to View Sub-evaluations */}
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => setExpandedSubjectCard(isExpanded ? null : item.subject)}
                          className="w-full py-2 px-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <span>Rincian Evaluasi ({item.totalItems} Komponen Dinilai)</span>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-[#531FFF]" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </button>

                        {/* Accordion Details Content */}
                        {isExpanded && (
                          <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                            {item.gradesList.map((g: any, idx: number) => {
                              const scoreNum = Number(g.score) || 0;
                              const isSubPassed = scoreNum >= item.kkm;

                              return (
                                <div
                                  key={g.id || idx}
                                  className="p-3 bg-white rounded-lg border border-gray-200 flex items-center justify-between gap-2 hover:border-purple-300 transition-colors"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-50 text-[#531FFF] border border-purple-100">
                                        {g.type || "Tugas"}
                                      </span>
                                      <span className="text-xs font-bold text-gray-900 truncate">
                                        {g.assessmentName || g.topic || `${g.type || "Tugas"} Evaluasi`}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-gray-400 font-medium mt-0.5">
                                      Semester {g.semester || "Ganjil"} • TA {g.academicYear || "2025/2026"}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3 shrink-0">
                                    <div className="text-right">
                                      <span className={cn(
                                        "text-base font-black block",
                                        isSubPassed ? "text-emerald-600" : "text-rose-600"
                                      )}>
                                        {g.score}
                                      </span>
                                      <span className="text-[9px] font-bold text-gray-400 block">
                                        {isSubPassed ? "Tuntas" : "Remedial"}
                                      </span>
                                    </div>

                                    <button
                                      onClick={() => setDetailModalGrade(g)}
                                      className="p-1.5 rounded-md bg-gray-50 hover:bg-purple-50 hover:text-[#531FFF] text-gray-400 border border-gray-200 transition-colors cursor-pointer"
                                      title="Lihat detail nilai"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB CONTENT 2: RIWAYAT LENGKAP PENILAIAN ================= */}
        {studentTab === "allGrades" && (
          <div className="space-y-4">

            {/* Filter Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 no-print">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari mata pelajaran, materi, atau catatan..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                {/* Subject Filter */}
                <select
                  value={studentSubjectFilter}
                  onChange={(e) => setStudentSubjectFilter(e.target.value)}
                  className="px-3 py-2 text-xs font-bold bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] cursor-pointer"
                >
                  <option value="All">Semua Mata Pelajaran</option>
                  {studentAvailableSubjects.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                {/* Type Filter */}
                <select
                  value={studentTypeFilter}
                  onChange={(e) => setStudentTypeFilter(e.target.value)}
                  className="px-3 py-2 text-xs font-bold bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] cursor-pointer"
                >
                  <option value="Semua">Semua Komponen</option>
                  <option value="Tugas">Tugas</option>
                  <option value="Kuis">Kuis</option>
                  <option value="Ulangan Harian">Ulangan Harian</option>
                  <option value="PTS">PTS</option>
                  <option value="PAS">PAS</option>
                  <option value="Asesmen Akhir">Asesmen Akhir</option>
                </select>

                {/* Status KKM */}
                <select
                  value={studentStatusFilter}
                  onChange={(e) => setStudentStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs font-bold bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] cursor-pointer"
                >
                  <option value="All">Semua Status</option>
                  <option value="Tuntas">Tuntas KKM</option>
                  <option value="Remedial">Perlu Remedial</option>
                </select>

                {/* Semester */}
                <select
                  value={studentSemesterFilter}
                  onChange={(e) => setStudentSemesterFilter(e.target.value)}
                  className="px-3 py-2 text-xs font-bold bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] cursor-pointer"
                >
                  <option value="All">Semua Semester</option>
                  <option value="Ganjil">Semester Ganjil</option>
                  <option value="Genap">Semester Genap</option>
                </select>
              </div>
            </div>

            {/* Table of Grades */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                      <th className="py-3.5 px-6">Mata Pelajaran</th>
                      <th className="py-3.5 px-4">Komponen & Topik Penilaian</th>
                      <th className="py-3.5 px-4 text-center">Nilai</th>
                      <th className="py-3.5 px-4 text-center">Target KKM</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4">Semester</th>
                      <th className="py-3.5 px-4">Catatan Guru</th>
                      <th className="py-3.5 px-6 text-right no-print">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {studentFilteredHistoryGrades.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-gray-400 font-medium">
                          Tidak ada penilaian yang sesuai dengan kriteria filter.
                        </td>
                      </tr>
                    ) : (
                      studentFilteredHistoryGrades.map((grade) => {
                        const scoreVal = Number(grade.score) || 0;
                        const kkmVal = Number(grade.kkm) || 75;
                        const isTuntas = scoreVal >= kkmVal;

                        return (
                          <tr key={grade.id} className="hover:bg-purple-50/30 transition-colors">
                            <td className="py-3.5 px-6">
                              <span className="font-extrabold text-gray-900 block">{grade.subject}</span>
                              <span className="text-[10px] text-gray-400 font-medium">Kelas {grade.className || studentMyClass?.name || studentClassId}</span>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-50 text-[#531FFF] border border-purple-100">
                                  {grade.type || "Tugas"}
                                </span>
                                <span className="font-bold text-gray-800">
                                  {grade.assessmentName || grade.topic || "-"}
                                </span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <span className={cn(
                                "text-base font-black px-2.5 py-0.5 rounded-md inline-block",
                                scoreVal >= 90 ? "bg-emerald-50 text-emerald-700" :
                                  scoreVal >= kkmVal ? "bg-blue-50 text-blue-700" : "bg-rose-50 text-rose-700"
                              )}>
                                {grade.score}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-center font-bold text-gray-500">
                              {kkmVal}
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <span className={cn(
                                "px-2.5 py-0.5 rounded-full text-[10px] font-black inline-flex items-center gap-1",
                                isTuntas
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              )}>
                                {isTuntas ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                {isTuntas ? "Tuntas" : "Remedial"}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 font-semibold text-gray-600">
                              {grade.semester || "Ganjil"} <span className="text-[10px] text-gray-400">({grade.academicYear || "2025/2026"})</span>
                            </td>

                            <td className="py-3.5 px-4 max-w-xs truncate text-gray-500 italic">
                              {grade.notes || "-"}
                            </td>

                            <td className="py-3.5 px-6 text-right no-print">
                              <button
                                onClick={() => setDetailModalGrade(grade)}
                                className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-purple-50 text-[#531FFF] border border-gray-200 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Detail</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ================= DETAIL MODAL ================= */}
        {detailModalGrade && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200 no-print">
            <div className="bg-white w-full max-w-md rounded-xl border border-gray-100 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 p-6 space-y-5">

              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#531FFF] flex items-center justify-center font-bold">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 text-sm">Rincian Hasil Penilaian</h3>
                    <span className="text-[10px] text-gray-400 font-medium">Informasi resmi evaluasi belajar</span>
                  </div>
                </div>
                <button
                  onClick={() => setDetailModalGrade(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">

                {/* Subject & Component Header */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                    {detailModalGrade.type || "Tugas"}
                  </span>
                  <h4 className="text-base font-black text-gray-900 mt-2">
                    {detailModalGrade.subject}
                  </h4>
                  <p className="text-xs text-gray-600 font-medium mt-0.5">
                    Topik: <strong className="text-gray-800">{detailModalGrade.assessmentName || detailModalGrade.topic || "Evaluasi Berkala"}</strong>
                  </p>
                </div>

                {/* Big Score Box */}
                <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50/50 to-indigo-50/50 border border-purple-100/70 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Perolehan Nilai</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className={cn(
                        "text-4xl font-black tracking-tight",
                        Number(detailModalGrade.score) >= (Number(detailModalGrade.kkm) || 75) ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {detailModalGrade.score}
                      </span>
                      <span className="text-xs font-bold text-gray-400">/ 100</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={cn(
                      "px-3 py-1 rounded-lg text-xs font-black inline-block",
                      Number(detailModalGrade.score) >= (Number(detailModalGrade.kkm) || 75)
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    )}>
                      {Number(detailModalGrade.score) >= (Number(detailModalGrade.kkm) || 75) ? "TUNTAS KKM" : "PERLU REMEDIAL"}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 block mt-1">
                      KKM: {detailModalGrade.kkm || 75}
                    </span>
                  </div>
                </div>

                {/* Details Table */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold block">Semester</span>
                    <span className="font-extrabold text-gray-800">{detailModalGrade.semester || "Ganjil"}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold block">Tahun Ajaran</span>
                    <span className="font-extrabold text-gray-800">{detailModalGrade.academicYear || "2025/2026"}</span>
                  </div>
                </div>

                {/* Teacher Feedback / Notes */}
                <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-200 space-y-1">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#531FFF]" /> Catatan & Saran Guru Pengampu:
                  </span>
                  <p className="text-xs text-gray-700 font-medium italic">
                    {detailModalGrade.notes ? `"${detailModalGrade.notes}"` : "Tidak ada catatan khusus yang diberikan guru untuk penilaian ini."}
                  </p>
                </div>

              </div>

              <div className="pt-2">
                <button
                  onClick={() => setDetailModalGrade(null)}
                  className="w-full py-2.5 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-black transition-all cursor-pointer shadow-xs"
                >
                  Tutup Rincian
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    );
  }

  // =========================================================================
  // VIEW UNTUK GURU / ADMIN / SUPERADMIN (FULL MATRIX & CRUD)
  // =========================================================================
  return (
    <div className="p-4 sm:p-8 pb-16 max-w-[1600px] mx-auto w-full flex flex-col space-y-6 animate-in fade-in duration-200">

      {/* ================= CRUD DRAWER / SHEET ================= */}
      <CrudSheet
        open={crudState.open}
        onOpenChange={(open) => {
          setCrudState(s => ({ ...s, open }));
          if (!open) setCurrentFormData({});
        }}
        mode={crudState.mode}
        entityName="Nilai Siswa"
        fields={singleGradeFields}
        initialData={crudState.data}
        onSubmit={handleCrudSubmit}
        onDataChange={(data) => setCurrentFormData(data)}
        onEditRequested={!isStudentRole ? () => setCrudState(s => ({ ...s, mode: "edit" })) : undefined}
      />

      {/* ================= HEADER SECTION ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-purple-50/70 via-white to-indigo-50/40 p-6 rounded-xl border border-purple-100/60 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-[#531FFF] text-white flex items-center justify-center shadow-md shadow-[#531FFF]/25">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                  Penilaian Akademik
                </h1>
                {isStudentRole ? (
                  <span className="px-2.5 py-0.5 text-xs font-bold bg-[#F3F0FF] text-[#531FFF] rounded-full border border-[#531FFF]/20 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Portal Siswa
                  </span>
                ) : isGuru ? (
                  <span className={cn(
                    "px-2.5 py-0.5 text-xs font-bold rounded-full border flex items-center gap-1.5",
                    hasAnyGradingAccess
                      ? "bg-purple-50 text-[#531FFF] border-purple-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  )}>
                    <GraduationCap className="w-3.5 h-3.5" />
                    {isTeacherWaliKelas && taughtSubjectClassPairs.length > 0
                      ? `Wali Kelas (${homeroomClasses.join(", ")}) & Guru Mapel`
                      : isTeacherWaliKelas
                        ? `Wali Kelas: ${homeroomClasses.join(", ")}`
                        : taughtSubjectClassPairs.length > 0
                          ? `Guru Mapel: ${Array.from(new Set(taughtSubjectClassPairs.map(p => p.subject))).join(", ")}`
                          : "Guru (Belum Ada Penugasan)"}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 text-xs font-bold bg-purple-50 text-[#531FFF] rounded-full border border-purple-200">
                    Input Cepat Multi-Penilaian
                  </span>
                )}
              </div>
              <p className="text-[13px] text-gray-500 font-medium">
                {isStudentRole
                  ? "Lihat riwayat capaian hasil belajar, nilai ujian, dan progres KKM Anda."
                  : isGuru
                    ? "Penginputan dan pengelolaan nilai untuk kelas dan mata pelajaran yang menjadi tanggung jawab Anda."
                    : "Input seluruh atau sebagian nilai siswa (Tugas, Kuis, UH, PTS, PAS, Asesmen Akhir) dalam satu tampilan spreadsheet yang fleksibel."}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons for Teachers & Admins */}
        {!isStudentRole && (
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Save Matrix Button when in Matrix view */}
            {viewMode === "matrix" && (
              <button
                type="button"
                onClick={handleSaveMatrix}
                disabled={isSavingMatrix || (isGuru && (!hasAnyGradingAccess || !isTeacherAuthorizedFor(matrixClassId, matrixSubject)))}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-[13px] font-extrabold shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                  hasUnsavedChanges
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-500/25 ring-2 ring-emerald-400/50 animate-pulse"
                    : "bg-[#531FFF] hover:bg-[#4314cc] text-white shadow-[#531FFF]/25"
                )}
              >
                {isSavingMatrix ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan ke Database...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan Semua Nilai ({matrixClassId || "Kelas"})</span>
                  </>
                )}
              </button>
            )}

            {/* Single Entry Button */}
            <button
              type="button"
              disabled={isGuru && !hasAnyGradingAccess}
              onClick={() => setCrudState({
                open: true,
                mode: "create",
                data: {
                  kkm: schoolGrading?.kkmScore || 75,
                  semester: "Ganjil",
                  academicYear: "2025/2026",
                  type: "Tugas",
                  classId: matrixClassId || primaryTeacherClass || availableClassOptions[0]?.value || "",
                  subject: matrixSubject || (matrixClassId ? getAuthorizedSubjectsForClass(matrixClassId)[0] : "") || ""
                }
              })}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-[13px] font-bold shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              <span>Entri Nilai Tunggal</span>
            </button>
          </div>
        )}
      </div>

      {/* Warning Notice for Guru who has no assigned classes or subjects */}
      {isGuru && !hasAnyGradingAccess && !loading && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3.5 shadow-2xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 space-y-1">
            <p className="font-extrabold text-sm text-amber-900">Akses Terbatas: Belum Ditugaskan Kelas atau Mata Pelajaran</p>
            <p className="text-amber-700 font-medium">
              Akun Anda terdaftar dengan role Guru, namun saat ini belum memiliki penugasan mata pelajaran di rombel/jadwal mengajar ataupun penugasan sebagai wali kelas. Silakan hubungi Administrator untuk penugasan kelas dan mata pelajaran Anda.
            </p>
          </div>
        </div>
      )}

      {/* ================= VIEW MODE SELECTOR BAR ================= */}
      <div className="bg-white border border-gray-100 rounded-lg p-2.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-gray-100/90 rounded-lg overflow-x-auto w-full sm:w-auto">
          {/* TAB 1: SPREADSHEET MATRIX (Default) */}
          {!isStudentRole && (
            <button
              type="button"
              onClick={() => setViewMode("matrix")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-xs font-extrabold transition-all cursor-pointer",
                viewMode === "matrix"
                  ? "bg-white text-[#531FFF] shadow-xs"
                  : "text-gray-500 hover:text-gray-900"
              )}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Matriks Input Multi-Nilai (Spreadsheet)</span>
              {hasUnsavedChanges && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              )}
            </button>
          )}

          {/* TAB 2: TABLE LOG */}
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-xs font-extrabold transition-all cursor-pointer",
              viewMode === "table"
                ? "bg-white text-[#531FFF] shadow-xs"
                : "text-gray-500 hover:text-gray-900"
            )}
          >
            <TableIcon className="w-4 h-4" />
            <span>Riwayat &amp; Daftar Nilai</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-gray-200/80 rounded-full text-gray-600 font-bold">
              {accessibleGrades.length}
            </span>
          </button>

          {/* TAB 3: GRADEBOOK REKAP */}
          {!isStudentRole && (
            <button
              type="button"
              onClick={() => setViewMode("gradebook")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-xs font-extrabold transition-all cursor-pointer",
                viewMode === "gradebook"
                  ? "bg-white text-[#531FFF] shadow-xs"
                  : "text-gray-500 hover:text-gray-900"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Rekap Transkrip Rapor</span>
            </button>
          )}
        </div>

        {/* Unsaved notification indicator */}
        {viewMode === "matrix" && hasUnsavedChanges && (
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 animate-pulse">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Ada nilai yang belum disimpan! Klik tombol simpan di atas.</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ============ MODE 1: MATRIKS INPUT NILAI MASSAL (ALL-IN-ONE) ============ */}
      {/* ========================================================================= */}
      {viewMode === "matrix" && !isStudentRole && (
        <div className="space-y-4 animate-in fade-in duration-200">

          {/* Configuration Toolbar for Matrix Input */}
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-end">
            {/* 1. Pilih Kelas */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-gray-500">Pilih Kelas</label>
              <select
                value={matrixClassId}
                onChange={(e) => setMatrixClassId(e.target.value)}
                disabled={isGuru && availableClassOptions.length <= 1}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {availableClassOptions.length === 0 ? (
                  <option value="">(Belum Ada Kelas Ditugaskan)</option>
                ) : (
                  availableClassOptions.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))
                )}
              </select>
            </div>

            {/* 2. Pilih Mata Pelajaran */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-gray-500">Mata Pelajaran</label>
              <select
                value={matrixSubject}
                onChange={(e) => setMatrixSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] cursor-pointer"
              >
                {availableSubjectOptions.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* 3. Semester */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-gray-500">Semester</label>
              <select
                value={matrixSemester}
                onChange={(e) => setMatrixSemester(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] cursor-pointer"
              >
                <option value="Ganjil">Semester Ganjil</option>
                <option value="Genap">Semester Genap</option>
              </select>
            </div>

            {/* 4. Tahun Ajaran */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-gray-500">Tahun Ajaran</label>
              <select
                value={matrixAcademicYear}
                onChange={(e) => setMatrixAcademicYear(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] cursor-pointer"
              >
                <option value="2025/2026">2025/2026</option>
                <option value="2026/2027">2026/2027</option>
              </select>
            </div>

            {/* 5. KKM Standar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-wider text-gray-500">KKM Standar</label>
                <span className={cn(
                  "text-[9px] font-extrabold px-1.5 py-0.5 rounded border",
                  isSuperAdmin ? "text-[#531FFF] bg-purple-50 border-purple-200" : "text-amber-700 bg-amber-50 border-amber-200"
                )}>
                  {isSuperAdmin ? "Super Admin" : "Diatur Super Admin"}
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={matrixKkm}
                  disabled={!isSuperAdmin}
                  readOnly={!isSuperAdmin}
                  onChange={(e) => isSuperAdmin && setMatrixKkm(Number(e.target.value))}
                  title={!isSuperAdmin ? "Nilai KKM ditentukan oleh Super Admin pada kurikulum mata pelajaran" : "Ubah KKM"}
                  className={cn(
                    "w-full px-3.5 py-2.5 rounded-lg text-xs font-black transition-all",
                    !isSuperAdmin
                      ? "bg-gray-100/90 border border-gray-200 text-gray-500 cursor-not-allowed select-none pl-8"
                      : "bg-gray-50 border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                  )}
                />
                {!isSuperAdmin && (
                  <Lock className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                )}
              </div>
            </div>

            {/* Authority Verification Chip for Guru */}
            {isGuru && matrixClassId && matrixSubject && (
              <div className="sm:col-span-2 lg:col-span-5 pt-1">
                {isTeacherAuthorizedFor(matrixClassId, matrixSubject) ? (
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50/80 border border-emerald-200/80 px-3.5 py-2 rounded-lg shadow-2xs">
                    <BadgeCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Wewenang Terverifikasi: {homeroomClasses.some(hc => hc.toLowerCase() === matrixClassId.toLowerCase())
                        ? `Wali Kelas ${matrixClassId} (Akses Penuh Penilaian)`
                        : `Guru Pengampu Mata Pelajaran ${matrixSubject} di Kelas ${matrixClassId}`}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-800 bg-rose-50/80 border border-rose-200/80 px-3.5 py-2 rounded-lg shadow-2xs">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      Akses Terbatas: Anda tidak ditugaskan mengampu mata pelajaran {matrixSubject} di kelas {matrixClassId}.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bobot Penilaian & KKM Info Bar (Ditetapkan Super Admin) */}
          <div className="bg-gradient-to-r from-purple-50/70 via-indigo-50/40 to-white border border-purple-100/80 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-center gap-2 text-purple-950 font-bold">
              <ShieldCheck className="w-4 h-4 text-[#531FFF]" />
              <span>Standar KKM & Bobot Penilaian Resmi (Ditetapkan Super Admin):</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-[11px] font-extrabold text-[#531FFF] shadow-2xs flex items-center gap-1.5">
                <span className="text-gray-400 font-semibold">KKM:</span>
                <span className="font-black text-xs">{matrixKkm}</span>
              </span>
              <span className="px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-[11px] font-semibold text-gray-700 shadow-2xs flex items-center gap-1.5">
                <span className="text-gray-400">Tugas / Harian:</span>
                <strong className="text-gray-900 font-black">{schoolGrading.assignmentWeight}%</strong>
              </span>
              <span className="px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-[11px] font-semibold text-gray-700 shadow-2xs flex items-center gap-1.5">
                <span className="text-gray-400">PTS (Tengah Semester):</span>
                <strong className="text-gray-900 font-black">{schoolGrading.midtermWeight}%</strong>
              </span>
              <span className="px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-[11px] font-semibold text-gray-700 shadow-2xs flex items-center gap-1.5">
                <span className="text-gray-400">PAS (Akhir Semester):</span>
                <strong className="text-gray-900 font-black">{schoolGrading.finalWeight}%</strong>
              </span>
            </div>
          </div>

          {/* Matrix Spreadsheet Table */}
          <div className="bg-white border border-gray-100 rounded-xl shadow-2xs overflow-hidden">
            {/* Table Header Bar */}
            <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <span>Lembar Penilaian: Kelas {matrixClassId}</span>
                  <span className="text-gray-300">•</span>
                  <span className="text-[#531FFF] font-extrabold">{matrixSubject}</span>
                </h3>
                <p className="text-xs text-gray-400 font-medium mt-0.5">
                  Isi seluruh atau sebagian nilai pada kolom di bawah ini. Anda dapat menginput nilai harian dan ujian dalam satu tampilan.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
                  {matrixStudents.length} Siswa Terdaftar
                </span>
                <button
                  type="button"
                  onClick={handleSaveMatrix}
                  disabled={isSavingMatrix}
                  className="px-4 py-2 bg-[#531FFF] hover:bg-[#4314cc] text-white rounded-lg text-xs font-bold shadow-md shadow-[#531FFF]/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  title="Simpan perubahan nilai yang telah diisi"
                >
                  {isSavingMatrix ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>{isSavingMatrix ? "Menyimpan..." : "Simpan Nilai"}</span>
                </button>
              </div>
            </div>

            {/* The Interactive Spreadsheet Grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[960px]">
                <thead>
                  <tr className="bg-white border-b border-gray-100 text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">No.</th>
                    <th className="py-3 px-5 min-w-[200px]">Nama Siswa &amp; NISN</th>

                    {/* 6 Assessment Type Headers with Quick Fill Options */}
                    {ASSESSMENT_TYPES.map((type) => (
                      <th key={type.key} className="py-3 px-3 min-w-[110px] text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={cn("px-2 py-0.5 rounded text-[10px] font-black border", type.badge)}>
                            {type.shortLabel}
                          </span>
                          {/* Quick fill preset button */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleAutofillColumn(type.key, 80)}
                              className="text-[9px] font-bold text-gray-400 hover:text-[#531FFF] underline cursor-pointer"
                              title={`Isi semua ${type.label} nilai 80`}
                            >
                              Isi 80
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                              type="button"
                              onClick={() => handleClearColumn(type.key)}
                              className="text-[9px] font-semibold text-gray-300 hover:text-rose-500 cursor-pointer"
                              title={`Kosongkan kolom ${type.label}`}
                            >
                              Reset
                            </button>
                          </div>
                        </div>
                      </th>
                    ))}

                    <th className="py-3 px-4 w-24 text-center">Rata-rata</th>
                    <th className="py-3 px-4 w-28 text-center">Status KKM</th>
                    <th className="py-3 px-4 min-w-[160px]">Catatan Evaluasi</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 font-medium">
                  {matrixStudents.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-16 text-center text-gray-400">
                        <div className="w-12 h-12 rounded-lg bg-purple-50 text-[#531FFF] flex items-center justify-center mx-auto mb-3">
                          <Users className="w-6 h-6" />
                        </div>
                        <p className="font-bold text-gray-800 text-sm">Tidak ada siswa terdaftar di kelas {matrixClassId}</p>
                        <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                          Siswa di kelas ini belum tersedia. Anda dapat memilih kelas lain yang telah memiliki siswa:
                        </p>
                        {availableClassOptions.filter(o => o.studentCount > 0).length > 0 && (
                          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                            {availableClassOptions.filter(o => o.studentCount > 0).map(opt => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => setMatrixClassId(opt.value)}
                                className="px-3.5 py-1.5 bg-[#531FFF]/10 hover:bg-[#531FFF]/20 text-[#531FFF] font-extrabold text-xs rounded-lg transition-all cursor-pointer shadow-2xs"
                              >
                                Buka Kelas {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    matrixStudents.map((student, idx) => {
                      const rowData = gridValues[student.id] || {};

                      // Real-time calculation of student's average across filled cells
                      const numericScores = [
                        rowData.tugas,
                        rowData.kuis,
                        rowData.ulanganHarian,
                        rowData.pts,
                        rowData.pas,
                        rowData.asesmenAkhir
                      ]
                        .map(val => val !== undefined && val !== "" ? Number(val) : null)
                        .filter(v => v !== null && !isNaN(v)) as number[];

                      const avgScore = numericScores.length > 0
                        ? Math.round(numericScores.reduce((a, b) => a + b, 0) / numericScores.length)
                        : null;

                      const isPassed = avgScore !== null ? avgScore >= matrixKkm : null;

                      return (
                        <tr key={student.id} className="hover:bg-purple-50/15 transition-colors">
                          {/* No. */}
                          <td className="py-3 px-4 text-center text-xs font-bold text-gray-400">
                            {idx + 1}
                          </td>

                          {/* Student Name */}
                          <td className="py-3 px-5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-md bg-[#531FFF]/10 text-[#531FFF] font-black text-xs flex items-center justify-center shrink-0">
                                {(student.fullName || student.name || "S").charAt(0)}
                              </div>
                              <div className="truncate">
                                <div className="font-extrabold text-xs text-gray-900 truncate">
                                  {student.fullName || student.name}
                                </div>
                                <div className="text-[10px] text-gray-400 font-medium">
                                  NISN: {student.nisn || student.id}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 6 Assessment Inputs */}
                          {ASSESSMENT_TYPES.map((type) => {
                            const val = rowData[type.key] || "";
                            const numVal = val !== "" ? Number(val) : null;

                            return (
                              <td key={type.key} className="py-2.5 px-2 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  placeholder="-"
                                  value={val}
                                  onChange={(e) => handleCellChange(student.id, type.key, e.target.value)}
                                  className={cn(
                                    "w-16 sm:w-20 px-2 py-1.5 rounded-lg border text-center font-black text-xs transition-all focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:bg-white",
                                    numVal === null
                                      ? "bg-gray-50/80 border-gray-200 text-gray-400"
                                      : numVal >= matrixKkm
                                        ? "bg-emerald-50/60 border-emerald-300 text-emerald-700 font-black"
                                        : "bg-rose-50/60 border-rose-300 text-rose-700 font-black"
                                  )}
                                />
                              </td>
                            );
                          })}

                          {/* Realtime Average */}
                          <td className="py-3 px-4 text-center">
                            {avgScore !== null ? (
                              <span className={cn(
                                "font-black text-sm",
                                avgScore >= 80 ? "text-emerald-600" :
                                  avgScore >= matrixKkm ? "text-blue-600" :
                                    "text-rose-600"
                              )}>
                                {avgScore}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-xs">-</span>
                            )}
                          </td>

                          {/* Status KKM */}
                          <td className="py-3 px-4 text-center">
                            {isPassed !== null ? (
                              <span className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border",
                                isPassed
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200"
                              )}>
                                {isPassed ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                <span>{isPassed ? "Tuntas" : "Remedial"}</span>
                              </span>
                            ) : (
                              <span className="text-gray-300 text-[11px]">-</span>
                            )}
                          </td>

                          {/* Notes */}
                          <td className="py-2.5 px-4">
                            <input
                              type="text"
                              placeholder="Catatan..."
                              value={rowData.notes || ""}
                              onChange={(e) => handleCellChange(student.id, "notes", e.target.value)}
                              className="w-full px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#531FFF]"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Matrix Bottom Action Bar */}
            <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                <Sparkles className="w-4 h-4 text-[#531FFF]" />
                <span>Tip: Anda dapat mengisi sebagian kolom saja (misal hanya Tugas &amp; Kuis). Nilai yang diisi akan otomatis terakumulasi.</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveMatrix}
                  disabled={isSavingMatrix}
                  className="px-6 py-2.5 bg-[#531FFF] hover:bg-[#4314cc] text-white rounded-lg text-xs sm:text-sm font-bold shadow-md shadow-[#531FFF]/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSavingMatrix ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Simpan Seluruh Nilai</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ============ MODE 2: TABEL RIWAYAT NILAI (DETAILED LOG VIEW) ============ */}
      {/* ========================================================================= */}
      {viewMode === "table" && (
        <div className="space-y-4 animate-in fade-in duration-200">

          {/* Assessment Type Selector Filter Bar */}
          <div className="bg-white border border-gray-100 rounded-lg p-3 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedType("Semua")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-extrabold shrink-0 transition-all border cursor-pointer",
                  selectedType === "Semua"
                    ? "bg-[#531FFF] text-white border-[#531FFF] shadow-xs"
                    : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                )}
              >
                Semua ({grades.length})
              </button>

              {ASSESSMENT_TYPES.map((type) => {
                const isActive = selectedType === type.id;
                const count = grades.filter(g => {
                  const t = g.type || "";
                  if (type.id.includes("PTS")) return t.includes("PTS") || t === "UTS";
                  if (type.id.includes("PAS")) return t.includes("PAS") || t === "UAS";
                  if (type.id.includes("Ulangan")) return t.includes("Ulangan");
                  if (type.id.includes("Akhir")) return t.includes("Ujian") || t.includes("Akhir");
                  return t === type.id;
                }).length;

                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setSelectedType(type.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all border cursor-pointer",
                      isActive
                        ? "bg-[#531FFF] text-white border-[#531FFF] shadow-xs"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-purple-50/50"
                    )}
                  >
                    <span>{type.label}</span>
                    <span className={cn(
                      "px-1.5 py-0.2 rounded text-[10px] font-extrabold",
                      isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                    )}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-2xs flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari nama siswa, mapel, materi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {!isStudentRole && (
                <>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    disabled={isGuru && availableClassOptions.length <= 1}
                    className="w-full sm:w-auto px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    {!isGuru && <option value="All">Semua Kelas</option>}
                    {isGuru && authorizedClasses && authorizedClasses.length > 1 && (
                      <option value="All">Semua Kelas Tanggung Jawab ({authorizedClasses.join(", ")})</option>
                    )}
                    {availableClassOptions.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>

                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 cursor-pointer"
                  >
                    <option value="All">Semua Mata Pelajaran</option>
                    {availableSubjectOptionsForFilter.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </>
              )}

              <select
                value={selectedKkmStatus}
                onChange={(e) => setSelectedKkmStatus(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 cursor-pointer"
              >
                <option value="All">Semua Status KKM</option>
                <option value="Lulus">Lulus KKM (&gt;= 75)</option>
                <option value="Remedial">Perlu Remedial (&lt; 75)</option>
              </select>
            </div>
          </div>

          {/* Table Content */}
          <div className="bg-white border border-gray-100 rounded-xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/60 border-b border-gray-100">
                    <th className="py-3.5 px-6 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Siswa</th>
                    <th className="py-3.5 px-6 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Mata Pelajaran</th>
                    <th className="py-3.5 px-6 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Komponen &amp; Topik</th>
                    <th className="py-3.5 px-6 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider text-center">Nilai</th>
                    <th className="py-3.5 px-6 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider text-center">Status KKM</th>
                    <th className="py-3.5 px-6 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Semester</th>
                    <th className="py-3.5 px-6 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {accessibleGrades.map((grade) => {
                    const score = Number(grade.score) || 0;
                    const kkm = Number(grade.kkm) || 75;
                    const isPassed = score >= kkm;
                    const student = getStudentByIdOrName(grade.studentId) || getStudentByIdOrName(grade.studentName);
                    const studentDisplayName = grade.studentName || student?.fullName || student?.name || "Siswa";
                    const className = grade.classId || student?.classId || student?.className;

                    return (
                      <tr key={grade.id} className="hover:bg-purple-50/20 transition-colors group">
                        {/* Siswa */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center font-black text-xs shrink-0">
                              {(studentDisplayName || "S").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-extrabold text-sm text-gray-900 group-hover:text-[#531FFF] transition-colors">
                                {studentDisplayName}
                              </div>
                              <div className="text-[11px] text-gray-400 font-medium flex items-center gap-1.5">
                                <span>NISN: {grade.studentId}</span>
                                {className && (
                                  <>
                                    <span>•</span>
                                    <span className="font-bold text-purple-600">{className}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Mapel */}
                        <td className="py-4 px-6">
                          <span className="font-bold text-xs text-gray-900">{grade.subject}</span>
                        </td>

                        {/* Komponen & Topik */}
                        <td className="py-4 px-6">
                          <div className="flex flex-col gap-1 items-start">
                            <span className={cn(
                              "px-2.5 py-0.5 rounded-md text-[10px] font-extrabold border shadow-2xs",
                              grade.type === "Tugas" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                grade.type === "Kuis" ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                                  grade.type?.includes("Ulangan") ? "bg-purple-50 text-purple-700 border-purple-200" :
                                    grade.type?.includes("PTS") || grade.type === "UTS" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                      grade.type?.includes("PAS") || grade.type === "UAS" ? "bg-orange-50 text-orange-700 border-orange-200" :
                                        "bg-rose-50 text-rose-700 border-rose-200"
                            )}>
                              {grade.type}
                            </span>
                            {grade.assessmentName && (
                              <span className="text-[11px] text-gray-500 font-medium truncate max-w-[200px]">
                                {grade.assessmentName}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Nilai */}
                        <td className="py-4 px-6 text-center">
                          <span className={cn(
                            "text-lg font-black",
                            score >= 90 ? "text-emerald-600" :
                              score >= 75 ? "text-blue-600" : "text-rose-600"
                          )}>
                            {score}
                          </span>
                        </td>

                        {/* Status KKM */}
                        <td className="py-4 px-6 text-center">
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border",
                            isPassed
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          )}>
                            {isPassed ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <AlertCircle className="w-3 h-3 text-rose-600" />}
                            <span>{isPassed ? `Lulus (KKM ${kkm})` : `Remedial`}</span>
                          </span>
                        </td>

                        {/* Semester */}
                        <td className="py-4 px-6 text-xs text-gray-500 font-medium">
                          <div>{grade.semester || "Ganjil"}</div>
                          <div className="text-[10px] text-gray-400 font-semibold">{grade.academicYear || "2025/2026"}</div>
                        </td>

                        {/* Aksi */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setCrudState({ open: true, mode: "view", data: grade })}
                              className="p-1.5 rounded-md text-gray-400 hover:text-[#531FFF] hover:bg-purple-50 transition-colors cursor-pointer"
                              title="Lihat Detail Nilai"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {!isStudentRole && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setCrudState({
                                    open: true,
                                    mode: "edit",
                                    data: { ...grade, classId: className || "" }
                                  })}
                                  className="p-1.5 rounded-md text-gray-400 hover:text-[#531FFF] hover:bg-purple-50 transition-colors cursor-pointer"
                                  title="Edit Nilai"
                                >
                                  <PenTool className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCrudState({ open: true, mode: "delete", data: grade })}
                                  className="p-1.5 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Hapus Nilai"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ============ MODE 3: GRADEBOOK REKAP MATRIX (REKAP RAPOR) =============== */}
      {/* ========================================================================= */}
      {viewMode === "gradebook" && !isStudentRole && (
        <div className="bg-white border border-gray-100 rounded-xl shadow-2xs overflow-hidden animate-in fade-in duration-200">
          <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#531FFF]" />
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-900">
                Rekap Transkrip Nilai Siswa per Rombel (6 Asesmen Lengkap)
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                disabled={isGuru && availableClassOptions.length <= 1}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 disabled:bg-gray-100 disabled:cursor-not-allowed cursor-pointer"
              >
                {!isGuru && <option value="All">Semua Kelas</option>}
                {isGuru && authorizedClasses && authorizedClasses.length > 1 && (
                  <option value="All">Semua Kelas Tanggung Jawab ({authorizedClasses.join(", ")})</option>
                )}
                {availableClassOptions.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Bobot Penilaian & KKM Info Bar (Ditetapkan Super Admin) */}
          <div className="p-3.5 sm:p-4 bg-purple-50/50 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-purple-950 font-bold">
              <ShieldCheck className="w-4 h-4 text-[#531FFF]" />
              <span>Rumus Nilai Rapor Akhir Ditetapkan Super Admin:</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 bg-white border border-purple-200 rounded-md text-[11px] font-semibold text-gray-700 shadow-2xs">
                Harian (Tugas/Kuis/UH): <strong className="text-gray-900 font-black">{schoolGrading.assignmentWeight}%</strong>
              </span>
              <span className="px-2.5 py-1 bg-white border border-purple-200 rounded-md text-[11px] font-semibold text-gray-700 shadow-2xs">
                PTS (Tengah Semester): <strong className="text-gray-900 font-black">{schoolGrading.midtermWeight}%</strong>
              </span>
              <span className="px-2.5 py-1 bg-white border border-purple-200 rounded-md text-[11px] font-semibold text-gray-700 shadow-2xs">
                PAS / Akhir: <strong className="text-gray-900 font-black">{schoolGrading.finalWeight}%</strong>
              </span>
              <span className="px-2.5 py-1 bg-white border border-purple-200 rounded-md text-[11px] font-extrabold text-[#531FFF] shadow-2xs">
                Standar KKM: {schoolGrading.kkmScore}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-gray-100 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Siswa</th>
                  <th className="py-3.5 px-4 text-center">Tugas</th>
                  <th className="py-3.5 px-4 text-center">Kuis</th>
                  <th className="py-3.5 px-4 text-center">Ulangan Harian</th>
                  <th className="py-3.5 px-4 text-center">PTS</th>
                  <th className="py-3.5 px-4 text-center">PAS</th>
                  <th className="py-3.5 px-4 text-center">Ujian Akhir</th>
                  <th className="py-3.5 px-6 text-center">Nilai Rapor Akhir</th>
                  <th className="py-3.5 px-6 text-center">Predikat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {gradebookData.map(({ student, avgTugas, avgKuis, avgUH, avgPTS, avgPAS, avgAkhir, finalScore, predicate }) => {
                  return (
                    <tr key={student.id} className="hover:bg-purple-50/20 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-extrabold text-xs text-gray-900">{student.fullName || student.name}</div>
                        <div className="text-[11px] text-gray-400 font-medium">
                          {student.classId || "Tanpa Kelas"} • NISN: {student.nisn || student.id}
                        </div>
                      </td>

                      <td className="py-4 px-4 text-center font-bold text-xs">
                        {avgTugas !== null ? <span className={cn(avgTugas >= 75 ? "text-blue-600" : "text-rose-600")}>{avgTugas}</span> : <span className="text-gray-300">-</span>}
                      </td>

                      <td className="py-4 px-4 text-center font-bold text-xs">
                        {avgKuis !== null ? <span className={cn(avgKuis >= 75 ? "text-indigo-600" : "text-rose-600")}>{avgKuis}</span> : <span className="text-gray-300">-</span>}
                      </td>

                      <td className="py-4 px-4 text-center font-bold text-xs">
                        {avgUH !== null ? <span className={cn(avgUH >= 75 ? "text-purple-600" : "text-rose-600")}>{avgUH}</span> : <span className="text-gray-300">-</span>}
                      </td>

                      <td className="py-4 px-4 text-center font-bold text-xs">
                        {avgPTS !== null ? <span className={cn(avgPTS >= 75 ? "text-amber-600" : "text-rose-600")}>{avgPTS}</span> : <span className="text-gray-300">-</span>}
                      </td>

                      <td className="py-4 px-4 text-center font-bold text-xs">
                        {avgPAS !== null ? <span className={cn(avgPAS >= 75 ? "text-orange-600" : "text-rose-600")}>{avgPAS}</span> : <span className="text-gray-300">-</span>}
                      </td>

                      <td className="py-4 px-4 text-center font-bold text-xs">
                        {avgAkhir !== null ? <span className={cn(avgAkhir >= 75 ? "text-rose-600" : "text-rose-600")}>{avgAkhir}</span> : <span className="text-gray-300">-</span>}
                      </td>

                      <td className="py-4 px-6 text-center">
                        {finalScore !== null ? (
                          <span className={cn(
                            "px-3 py-1 rounded-lg text-xs font-black inline-block",
                            finalScore >= 80 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                              finalScore >= 75 ? "bg-blue-50 text-blue-700 border border-blue-200" :
                                "bg-rose-50 text-rose-700 border border-rose-200"
                          )}>
                            {finalScore}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">-</span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-center">
                        <span className="text-xs font-bold text-gray-700">{predicate}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
