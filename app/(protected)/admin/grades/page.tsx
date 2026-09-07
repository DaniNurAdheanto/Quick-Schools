"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Plus, 
  Search, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  BookOpen, 
  PenLine, 
  Trash2, 
  ShieldCheck, 
  Lock, 
  Eye,
  Sparkles,
  LayoutGrid,
  Table as TableIcon,
  Check,
  X,
  FileSpreadsheet,
  TrendingUp,
  PenTool,
  Loader2,
  Save,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown
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

// 6 Core Assessment Types requested by user
export const ASSESSMENT_TYPES = [
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
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
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
            const role = uData.role || "admin";
            setUserRole(role === "student" || role === "siswa" ? "siswa" : role);
            if (role === "student" || role === "siswa") {
              setStudentDoc(uData);
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

  // Realtime Listeners for Grades, Students, Classes, Subjects
  useEffect(() => {
    const unsubGrades = onSnapshot(collection(db, "grades"), (snap) => {
      const data = snap.docs.map(docSnap => ({ id: docSnap.id, _firestoreId: docSnap.id, ...docSnap.data() }));
      setGrades(data);
      setLoading(false);
    }, (error) => {
      console.warn("Grades listener error:", error);
      setLoading(false);
    });

    const unsubStudents = onSnapshot(collection(db, "students"), (snap) => {
      setStudents(snap.docs.map(docSnap => ({ id: docSnap.id, _firestoreId: docSnap.id, ...docSnap.data() })));
    });

    const unsubClasses = onSnapshot(collection(db, "classes"), (snap) => {
      setClasses(snap.docs.map(docSnap => ({ id: docSnap.id, _firestoreId: docSnap.id, ...docSnap.data() })));
    });

    const unsubSubjects = onSnapshot(collection(db, "subjects"), (snap) => {
      setSubjects(snap.docs.map(docSnap => ({ id: docSnap.id, _firestoreId: docSnap.id, ...docSnap.data() })));
    });

    return () => {
      unsubGrades();
      unsubStudents();
      unsubClasses();
      unsubSubjects();
    };
  }, []);

  // Available Classes Options
  const availableClassOptions = useMemo(() => {
    if (classes.length > 0) {
      return classes.map(c => ({ label: c.name, value: c.name }));
    }
    const fromStudents = Array.from(new Set(students.map(s => s.classId).filter(Boolean)));
    return fromStudents.map(c => ({ label: c, value: c }));
  }, [classes, students]);

  // Available Subjects Options
  const availableSubjectOptions = useMemo(() => {
    if (subjects.length > 0) {
      return subjects.map(s => ({ label: s.name, value: s.name }));
    }
    return [
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
  }, [subjects]);

  // Auto-initialize matrix class and subject
  useEffect(() => {
    if (availableClassOptions.length > 0 && !matrixClassId) {
      setMatrixClassId(availableClassOptions[0].value);
    }
    if (availableSubjectOptions.length > 0 && !matrixSubject) {
      setMatrixSubject(availableSubjectOptions[0].value);
    }
  }, [availableClassOptions, availableSubjectOptions, matrixClassId, matrixSubject]);

  // Students enrolled in selected matrixClassId
  const matrixStudents = useMemo(() => {
    if (!matrixClassId) return [];
    return students.filter(s => {
      const c = s.classId || s.className || s.class;
      return c === matrixClassId;
    });
  }, [students, matrixClassId]);

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

      // 2. Type Filter
      if (selectedType !== "Semua") {
        const normalizedGType = g.type || "";
        if (selectedType === "PTS" && !normalizedGType.includes("PTS") && !normalizedGType.includes("Tengah") && normalizedGType !== "UTS") return false;
        if (selectedType === "PAS" && !normalizedGType.includes("PAS") && !normalizedGType.includes("Akhir") && normalizedGType !== "UAS") return false;
        if (selectedType === "Ulangan Harian" && !normalizedGType.includes("Ulangan") && !normalizedGType.includes("Harian")) return false;
        if (selectedType === "Asesmen Akhir" && !normalizedGType.includes("Ujian") && !normalizedGType.includes("Asesmen Akhir")) return false;
        if (selectedType !== "PTS" && selectedType !== "PAS" && selectedType !== "Ulangan Harian" && selectedType !== "Asesmen Akhir" && normalizedGType !== selectedType) return false;
      }

      // 3. Class Filter
      if (selectedClass !== "All") {
        const student = students.find(s => s.id === g.studentId);
        const studentClass = g.classId || student?.classId || student?.className;
        if (studentClass !== selectedClass) return false;
      }

      // 4. Subject Filter
      if (selectedSubject !== "All" && g.subject !== selectedSubject) {
        return false;
      }

      // 5. KKM Status Filter
      const kkm = Number(g.kkm) || 75;
      const score = Number(g.score) || 0;
      if (selectedKkmStatus === "Lulus" && score < kkm) return false;
      if (selectedKkmStatus === "Remedial" && score >= kkm) return false;

      // 6. Search Query
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
  }, [grades, isStudentRole, studentDoc, currentUser, selectedType, selectedClass, selectedSubject, selectedKkmStatus, searchQuery, students]);

  // Single Grade Submit Handler (CrudSheet)
  const handleCrudSubmit = async (data: any) => {
    if (isStudentRole) return;

    try {
      const firestoreType = mapTypeToFirestore(data.type || "Tugas");
      const numScore = Math.min(Math.max(Number(data.score) || 0, 0), 100);
      const studentName = student ? (student.fullName || student.name) : (data.studentName || "Siswa");

      if (crudState.mode === "create") {
        const newDocRef = doc(collection(db, "grades"));
        await setDoc(newDocRef, {
          studentId: data.studentId || "student_id",
          studentName: studentName,
          subject: data.subject || "Matematika Wajib",
          type: firestoreType,
          score: numScore,
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
          semester: data.semester || crudState.data.semester,
          academicYear: data.academicYear || crudState.data.academicYear,
          updatedAt: serverTimestamp()
        });
        toast.showEdit("Data nilai siswa berhasil diperbarui.", "Berhasil Edit");
      } else if (crudState.mode === "delete" && crudState.data?.id) {
        await deleteDoc(doc(db, "grades", crudState.data.id));
        toast.showWarning("Nilai siswa berhasil dihapus.", "Berhasil Hapus");
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
    const targetStudents = selectedClass === "All" 
      ? students 
      : students.filter(s => (s.classId || s.className || s.class) === selectedClass);

    targetStudents.forEach(s => {
      studentMap.set(s.id, {
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
      const entry = studentMap.get(g.studentId);
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

      const validComponents = [avgTugas, avgKuis, avgUH, avgPTS, avgPAS, avgAkhir].filter(v => v !== null) as number[];
      const finalScore = validComponents.length > 0 
        ? Math.round(validComponents.reduce((a, b) => a + b, 0) / validComponents.length)
        : null;

      let predicate = "-";
      if (finalScore !== null) {
        if (finalScore >= 90) predicate = "A (Sangat Baik)";
        else if (finalScore >= 80) predicate = "B (Baik)";
        else if (finalScore >= 75) predicate = "C (Cukup)";
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
  }, [students, accessibleGrades, selectedClass]);

  // Overall Analytics
  const totalEntries = accessibleGrades.length;
  const averageOverallScore = totalEntries > 0 
    ? (accessibleGrades.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0) / totalEntries).toFixed(1)
    : "0";
  const passedKkmCount = accessibleGrades.filter(g => (Number(g.score) || 0) >= (Number(g.kkm) || 75)).length;
  const passedPercentage = totalEntries > 0 ? Math.round((passedKkmCount / totalEntries) * 100) : 0;
  const remedialCount = totalEntries - passedKkmCount;

  // Single Form Configuration for CrudSheet
  const filteredStudentsForSingleForm = useMemo(() => {
    if (!currentFormData.classId) return [];
    return students
      .filter(s => (s.classId || s.className || s.class) === currentFormData.classId)
      .map(s => ({ label: `${s.fullName || s.name} (NISN: ${s.nisn || s.id})`, value: s.id }));
  }, [students, currentFormData.classId]);

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
      options: availableSubjectOptions,
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
      label: "Nilai KKM", 
      type: "number", 
      placeholder: "75",
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
  ], [availableClassOptions, availableSubjectOptions, filteredStudentsForSingleForm, currentFormData.classId]);

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-purple-50/70 via-white to-indigo-50/40 p-6 rounded-3xl border border-purple-100/60 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#531FFF] text-white flex items-center justify-center shadow-md shadow-[#531FFF]/25">
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
                ) : (
                  <span className="px-2.5 py-0.5 text-xs font-bold bg-purple-50 text-[#531FFF] rounded-full border border-purple-200">
                    Input Cepat Multi-Penilaian
                  </span>
                )}
              </div>
              <p className="text-[13px] text-gray-500 font-medium">
                {isStudentRole
                  ? "Lihat riwayat capaian hasil belajar, nilai ujian, dan progres KKM Anda."
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
                disabled={isSavingMatrix}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-[13px] font-extrabold shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50",
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
              onClick={() => setCrudState({ 
                open: true, 
                mode: "create",
                data: {
                  kkm: 75,
                  semester: "Ganjil",
                  academicYear: "2025/2026",
                  type: "Tugas",
                  classId: matrixClassId || availableClassOptions[0]?.value || ""
                }
              })}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-[13px] font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Entri Nilai Tunggal</span>
            </button>
          </div>
        )}
      </div>

      {/* ================= VIEW MODE SELECTOR BAR ================= */}
      <div className="bg-white border border-gray-100 rounded-2xl p-2.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-gray-100/90 rounded-xl overflow-x-auto w-full sm:w-auto">
          {/* TAB 1: SPREADSHEET MATRIX (Default) */}
          {!isStudentRole && (
            <button
              type="button"
              onClick={() => setViewMode("matrix")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer",
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
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer",
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
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer",
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
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 animate-pulse">
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
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-end">
            {/* 1. Pilih Kelas */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-gray-500">Pilih Kelas</label>
              <select
                value={matrixClassId}
                onChange={(e) => setMatrixClassId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] cursor-pointer"
              >
                {availableClassOptions.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* 2. Pilih Mata Pelajaran */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-gray-500">Mata Pelajaran</label>
              <select
                value={matrixSubject}
                onChange={(e) => setMatrixSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] cursor-pointer"
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
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] cursor-pointer"
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
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] cursor-pointer"
              >
                <option value="2025/2026">2025/2026</option>
                <option value="2026/2027">2026/2027</option>
              </select>
            </div>

            {/* 5. KKM Standar */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-gray-500">KKM Standar</label>
              <input
                type="number"
                value={matrixKkm}
                onChange={(e) => setMatrixKkm(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-black text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
              />
            </div>
          </div>

          {/* Matrix Spreadsheet Table */}
          <div className="bg-white border border-gray-100 rounded-3xl shadow-2xs overflow-hidden">
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
                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-xl">
                  {matrixStudents.length} Siswa Terdaftar
                </span>
                <button
                  type="button"
                  onClick={handleSaveMatrix}
                  disabled={isSavingMatrix}
                  className="px-4 py-2 bg-[#531FFF] hover:bg-[#4314cc] text-white rounded-xl text-xs font-bold shadow-md shadow-[#531FFF]/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
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
                        <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="font-bold text-gray-800 text-sm">Tidak ada siswa terdaftar di kelas {matrixClassId}</p>
                        <p className="text-xs text-gray-400 mt-1">Tambahkan siswa ke kelas ini pada menu Manajemen Kelas.</p>
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
                              <div className="w-7 h-7 rounded-lg bg-[#531FFF]/10 text-[#531FFF] font-black text-xs flex items-center justify-center shrink-0">
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
                                    "w-16 sm:w-20 px-2 py-1.5 rounded-xl border text-center font-black text-xs transition-all focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:bg-white",
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
                              className="w-full px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#531FFF]"
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
                  className="px-6 py-2.5 bg-[#531FFF] hover:bg-[#4314cc] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-[#531FFF]/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
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
          <div className="bg-white border border-gray-100 rounded-2xl p-3 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedType("Semua")}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-extrabold shrink-0 transition-all border cursor-pointer",
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
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all border cursor-pointer",
                      isActive
                        ? "bg-[#531FFF] text-white border-[#531FFF] shadow-xs"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-purple-50/50"
                    )}
                  >
                    <span>{type.label}</span>
                    <span className={cn(
                      "px-1.5 py-0.2 rounded-md text-[10px] font-extrabold",
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
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-2xs flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input 
                  type="text"
                  placeholder="Cari nama siswa, mapel, materi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
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
                    className="w-full sm:w-auto px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 cursor-pointer"
                  >
                    <option value="All">Semua Kelas</option>
                    {availableClassOptions.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>

                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 cursor-pointer"
                  >
                    <option value="All">Semua Mata Pelajaran</option>
                    {availableSubjectOptions.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </>
              )}

              <select
                value={selectedKkmStatus}
                onChange={(e) => setSelectedKkmStatus(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 cursor-pointer"
              >
                <option value="All">Semua Status KKM</option>
                <option value="Lulus">Lulus KKM (&gt;= 75)</option>
                <option value="Remedial">Perlu Remedial (&lt; 75)</option>
              </select>
            </div>
          </div>

          {/* Table Content */}
          <div className="bg-white border border-gray-100 rounded-3xl shadow-2xs overflow-hidden">
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
                    const student = students.find(s => s.id === grade.studentId);
                    const className = grade.classId || student?.classId || student?.className;

                    return (
                      <tr key={grade.id} className="hover:bg-purple-50/20 transition-colors group">
                        {/* Siswa */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center font-black text-xs shrink-0">
                              {(grade.studentName || "S").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-extrabold text-sm text-gray-900 group-hover:text-[#531FFF] transition-colors">
                                {grade.studentName}
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
                              "px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold border shadow-2xs",
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
                              className="p-1.5 rounded-lg text-gray-400 hover:text-[#531FFF] hover:bg-purple-50 transition-colors cursor-pointer"
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
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-[#531FFF] hover:bg-purple-50 transition-colors cursor-pointer"
                                  title="Edit Nilai"
                                >
                                  <PenTool className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCrudState({ open: true, mode: "delete", data: grade })}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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
        <div className="bg-white border border-gray-100 rounded-3xl shadow-2xs overflow-hidden animate-in fade-in duration-200">
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
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700"
              >
                <option value="All">Semua Kelas</option>
                {availableClassOptions.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
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
                            "px-3 py-1 rounded-xl text-xs font-black inline-block",
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
