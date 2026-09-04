"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Award, Search, Filter, Printer, Save, User, CheckCircle2, 
  AlertCircle, BookOpen, GraduationCap, ChevronRight, FileText, Sparkles, 
  Loader2, Edit3, ShieldCheck, Check, Calendar, ArrowUpRight, School, Plus, Trash2, Heart,
  BarChart3, PieChart, TrendingUp, RefreshCw, Layers, ThumbsUp, HelpCircle
} from "lucide-react";
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, RadarChart, 
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Cell, Legend
} from "recharts";
import { collection, onSnapshot, doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { AlertBox, AlertType } from "@/components/ui/alert-box";

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
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [reportCardsData, setReportCardsData] = useState<Record<string, any>>({});
  
  const [userRole, setUserRole] = useState<string>("admin");
  const [userEmail, setUserEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  
  const [selectedClass, setSelectedClass] = useState<string>("All");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [semester, setSemester] = useState<string>("Ganjil");
  const [academicYear, setAcademicYear] = useState<string>("2025/2026");

  const [activeTab, setActiveTab] = useState<"report" | "analytics">("report");

  // Editable fields for selected student's report card
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

  // Firestore Realtime Subscriptions
  useEffect(() => {
    const unsubStudents = onSnapshot(collection(db, "students"), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setStudents(list);
      if (list.length > 0 && !selectedStudentId) {
        setSelectedStudentId(list[0].id);
      }
      setLoading(false);
    });

    const unsubClasses = onSnapshot(collection(db, "classes"), (snap) => {
      setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubGrades = onSnapshot(collection(db, "grades"), (snap) => {
      setGrades(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubSubjects = onSnapshot(collection(db, "subjects"), (snap) => {
      setSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubReportCards = onSnapshot(collection(db, "reportCards"), (snap) => {
      const map: Record<string, any> = {};
      snap.docs.forEach(d => {
        map[d.id] = d.data();
      });
      setReportCardsData(map);
    });

    return () => {
      unsubStudents();
      unsubClasses();
      unsubGrades();
      unsubSubjects();
      unsubReportCards();
    };
  }, []);

  // Auto-select student if student role
  useEffect(() => {
    if (isStudentRole && students.length > 0 && userEmail) {
      const matchingStudent = students.find(s => 
        (s.email && s.email.toLowerCase() === userEmail.toLowerCase()) ||
        (s.name && userEmail.toLowerCase().includes(s.name.toLowerCase().split(' ')[0]))
      );
      if (matchingStudent) {
        setSelectedStudentId(matchingStudent.id);
      }
    }
  }, [isStudentRole, students, userEmail]);

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchClass = selectedClass === "All" || s.classId === selectedClass;
      const matchQuery = !searchQuery || 
        (s.name && s.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.id && s.id.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchClass && matchQuery;
    });
  }, [students, selectedClass, searchQuery]);

  // Selected Student Object
  const currentStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId) || filteredStudents[0] || null;
  }, [students, selectedStudentId, filteredStudents]);

  // Sync saved report card details when current student changes
  const reportDocKey = currentStudent ? `${currentStudent.id}_${semester}_${academicYear}` : "";

  useEffect(() => {
    if (reportDocKey && reportCardsData[reportDocKey]) {
      const rc = reportCardsData[reportDocKey];
      setTeacherNotes(rc.teacherNotes || "Menunjukkan prestasi belajar yang sangat baik dan kedisiplinan yang tinggi dalam mengikuti pembelajaran.");
      setSpiritualAttitude(rc.spiritualAttitude || "Sangat Baik");
      setSpiritualDesc(rc.spiritualDesc || "Terbiasa berdoa sebelum/sesudah belajar, taat beribadah, dan menunjukkan toleransi yang tinggi.");
      setSocialAttitude(rc.socialAttitude || "Baik");
      setSocialDesc(rc.socialDesc || "Sangat santun dalam bertutur kata, disiplin dalam mengumpulkan tugas, dan peduli terhadap sesama.");
      setSickCount(rc.sickCount ?? 0);
      setPermitCount(rc.permitCount ?? 1);
      setAlphaCount(rc.alphaCount ?? 0);
      if (rc.extraCurriculars && Array.isArray(rc.extraCurriculars)) {
        setExtraCurriculars(rc.extraCurriculars);
      }
      if (rc.subjectNotes && typeof rc.subjectNotes === "object") {
        setSubjectNotes(rc.subjectNotes);
      } else {
        setSubjectNotes({});
      }
    } else {
      // Default initial values
      setTeacherNotes("Menunjukkan perkembangan akademik yang konsisten dan aktif dalam kegiatan pembelajaran di kelas. Pertahankan semangat belajar!");
      setSpiritualAttitude("Sangat Baik");
      setSpiritualDesc("Terbiasa berdoa sebelum dan sesudah belajar, taat beribadah, serta menunjukkan sikap toleransi yang tinggi.");
      setSocialAttitude("Baik");
      setSocialDesc("Sangat santun dalam bertutur kata, memiliki kepedulian sosial yang baik, dan dapat bekerja sama.");
      setSickCount(0);
      setPermitCount(0);
      setAlphaCount(0);
      setExtraCurriculars([
        { name: "Pramuka Wajib", grade: "A", desc: "Aktif dan menunjukkan jiwa kedisiplinan yang baik." }
      ]);
      setSubjectNotes({});
    }
  }, [reportDocKey, reportCardsData]);

  // Calculate Subject Averages & Predicates for Current Student
  const studentSubjectScores = useMemo(() => {
    if (!currentStudent) return [];

    const studentGrades = grades.filter(g => g.studentId === currentStudent.id);
    
    // Group by subject
    const subjectMap: Record<string, { total: number; count: number; scores: number[] }> = {};
    
    studentGrades.forEach(g => {
      const subj = g.subject || "Umum";
      if (!subjectMap[subj]) {
        subjectMap[subj] = { total: 0, count: 0, scores: [] };
      }
      const val = Number(g.score) || 0;
      subjectMap[subj].total += val;
      subjectMap[subj].count += 1;
      subjectMap[subj].scores.push(val);
    });

    // Match with master subjects or fallback
    const allSubjectNames = Array.from(new Set([
      ...subjects.map(s => s.name),
      ...Object.keys(subjectMap)
    ]));

    return allSubjectNames.map(subjName => {
      const data = subjectMap[subjName];
      const avg = data ? Math.round(data.total / data.count) : 0;
      
      let predicate = "D";
      if (avg >= 90) predicate = "A";
      else if (avg >= 80) predicate = "B";
      else if (avg >= 70) predicate = "C";

      const masterSubj = subjects.find(s => s.name === subjName);
      const kkm = masterSubj?.kkm || 75;
      const isPassed = avg >= kkm;

      // Auto generated competency description if custom note not specified
      let autoDesc = "";
      if (avg >= 90) {
        autoDesc = `Menunjukkan penguasaan materi yang sangat baik dalam memahami dan menerapkan konsep ${subjName} secara mandiri.`;
      } else if (avg >= 80) {
        autoDesc = `Menunjukkan penguasaan materi yang baik dalam memahami konsep dasar ${subjName} dan mampu menyelesaikan tugas dengan terstruktur.`;
      } else if (avg >= 70) {
        autoDesc = `Cukup memahami konsep dasar ${subjName}, perlu sedikit meningkatkan latihan soal dan ketelitian.`;
      } else if (avg > 0) {
        autoDesc = `Memerlukan bimbingan tambahan dan latihan intensif untuk memperkuat pemahaman konsep dasar ${subjName}.`;
      } else {
        autoDesc = `Belum ada entri nilai untuk mata pelajaran ${subjName}.`;
      }

      const customDesc = subjectNotes[subjName] || "";

      return {
        name: subjName,
        category: masterSubj?.category || (["Matematika", "Bahasa Indonesia", "Bahasa Inggris", "IPA", "IPS", "PPKn", "Agama"].some(x => subjName.includes(x)) ? "Kelompok A (Umum)" : "Kelompok B (Muatan Lokal / Seni)"),
        score: avg,
        predicate,
        kkm,
        isPassed,
        hasData: Boolean(data),
        description: customDesc || autoDesc
      };
    }).sort((a, b) => b.score - a.score);
  }, [currentStudent, grades, subjects, subjectNotes]);

  // Split subjects into Kelompok A and Kelompok B for Kurikulum Merdeka / K13 presentation
  const kelompokA = useMemo(() => {
    return studentSubjectScores.filter(s => s.category.includes("Kelompok A") || s.category.includes("Wajib") || s.category.includes("Umum"));
  }, [studentSubjectScores]);

  const kelompokB = useMemo(() => {
    return studentSubjectScores.filter(s => !kelompokA.includes(s));
  }, [studentSubjectScores, kelompokA]);

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
    
    const classStudents = students.filter(s => s.classId === currentStudent.classId);
    
    const rankedList = classStudents.map(st => {
      const stGrades = grades.filter(g => g.studentId === st.id);
      const avg = stGrades.length > 0 
        ? Math.round(stGrades.reduce((acc, g) => acc + (Number(g.score) || 0), 0) / stGrades.length) 
        : 0;
      return { id: st.id, avg };
    }).sort((a, b) => b.avg - a.avg);

    const rankIdx = rankedList.findIndex(r => r.id === currentStudent.id);
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

  // Save Report Card to Firestore
  const handleSaveReportCard = async () => {
    if (!currentStudent || !reportDocKey || isStudentRole) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await setDoc(doc(db, "reportCards", reportDocKey), {
        studentId: currentStudent.id,
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
        extraCurriculars,
        subjectNotes,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setSaveSuccess(true);
      triggerAlert("edit", `Catatan & Nilai Rapor Digital untuk ${currentStudent.name} berhasil disimpan!`, "Berhasil Edit");
      setTimeout(() => setSaveSuccess(false), 3000);
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
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-[0.98]"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Rapor (PDF)</span>
          </button>

          {!isStudentRole && (
            <button
              onClick={handleSaveReportCard}
              disabled={isSaving || !currentStudent}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-[#531FFF] hover:bg-[#531FFF]/90 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-[#531FFF]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saveSuccess ? (
                <Check className="w-4 h-4 text-emerald-300" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{saveSuccess ? "Tersimpan!" : "Simpan Catatan"}</span>
            </button>
          )}
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
              placeholder="Cari nama / NIS siswa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
            />
          </div>
        )}
      </div>

      {loading ? (
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
                  const isSelected = currentStudent?.id === student.id;
                  
                  const stGrades = grades.filter(g => g.studentId === student.id);
                  const avg = stGrades.length > 0 
                    ? Math.round(stGrades.reduce((acc, g) => acc + (Number(g.score) || 0), 0) / stGrades.length) 
                    : 0;

                  return (
                    <button
                      key={student.id}
                      onClick={() => setSelectedStudentId(student.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-xl transition-all flex items-center justify-between gap-3 group border",
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
                            NIS: {student.id} · Kelas {student.classId || "-"}
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
                          NIS: <span className="font-bold text-gray-800">{currentStudent.id}</span> · 
                          Kelas: <span className="font-bold text-gray-800">{currentStudent.classId || "-"}</span> · 
                          Tahun Ajaran: <span className="font-bold text-gray-800">{academicYear} ({semester})</span>
                        </p>
                      </div>
                    </div>

                    {/* Stats Metric Cards */}
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
                  </div>
                </div>

                {/* TAB 1: LEMBAR RAPOR UTAMA */}
                {activeTab === "report" && (
                  <div className="space-y-6">
                    
                    {/* Section A: Capaian Hasil Belajar Akademik */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                      <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-[#531FFF]" />
                          <h3 className="font-bold text-xs text-gray-800 uppercase tracking-wider">A. Capaian Hasil Belajar Akademik</h3>
                        </div>
                        <span className="text-xs text-gray-400 font-medium">{studentSubjectScores.length} Mata Pelajaran</span>
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
                                  <div className="font-bold text-gray-900">{item.name}</div>
                                  <span className="inline-block px-2 py-0.5 rounded text-[9px] font-semibold bg-gray-100 text-gray-500 mt-0.5">
                                    {item.category}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center font-semibold text-gray-600">{item.kkm}</td>
                                <td className="py-3 px-4 text-center font-extrabold text-sm text-gray-900">
                                  {item.hasData ? item.score : <span className="text-gray-300 font-normal">-</span>}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className={cn(
                                    "inline-block px-2.5 py-0.5 rounded-md font-extrabold text-xs border",
                                    item.predicate === "A" && "bg-emerald-50 text-emerald-800 border-emerald-200",
                                    item.predicate === "B" && "bg-blue-50 text-blue-800 border-blue-200",
                                    item.predicate === "C" && "bg-amber-50 text-amber-800 border-amber-200",
                                    item.predicate === "D" && "bg-red-50 text-red-800 border-red-200"
                                  )}>
                                    {item.predicate}
                                  </span>
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
                      
                      {/* Penilaian Sikap */}
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
                        <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                          <ShieldCheck className="w-4 h-4 text-[#531FFF]" />
                          <h3 className="font-bold text-xs text-gray-800 uppercase tracking-wider">B. Penilaian Sikap & Karakter</h3>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-xs font-bold text-gray-700">1. Sikap Spiritual</label>
                              <select
                                disabled={isStudentRole}
                                value={spiritualAttitude}
                                onChange={(e) => setSpiritualAttitude(e.target.value)}
                                className="px-2 py-1 text-xs font-bold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20 disabled:opacity-80"
                              >
                                <option value="Sangat Baik">Sangat Baik (A)</option>
                                <option value="Baik">Baik (B)</option>
                                <option value="Cukup">Cukup (C)</option>
                              </select>
                            </div>
                            <textarea
                              rows={2}
                              disabled={isStudentRole}
                              value={spiritualDesc}
                              onChange={(e) => setSpiritualDesc(e.target.value)}
                              placeholder="Deskripsi perkembangan sikap spiritual..."
                              className="w-full p-2.5 text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20 disabled:opacity-80"
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-xs font-bold text-gray-700">2. Sikap Sosial</label>
                              <select
                                disabled={isStudentRole}
                                value={socialAttitude}
                                onChange={(e) => setSocialAttitude(e.target.value)}
                                className="px-2 py-1 text-xs font-bold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20 disabled:opacity-80"
                              >
                                <option value="Sangat Baik">Sangat Baik (A)</option>
                                <option value="Baik">Baik (B)</option>
                                <option value="Cukup">Cukup (C)</option>
                              </select>
                            </div>
                            <textarea
                              rows={2}
                              disabled={isStudentRole}
                              value={socialDesc}
                              onChange={(e) => setSocialDesc(e.target.value)}
                              placeholder="Deskripsi perkembangan sikap sosial..."
                              className="w-full p-2.5 text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20 disabled:opacity-80"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Ketidakhadiran */}
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-[#531FFF]" />
                            <h3 className="font-bold text-xs text-gray-800 uppercase tracking-wider">C. Ketidakhadiran (Presensi)</h3>
                          </div>
                          <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            {attendanceRate}% Kehadiran
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-center">
                            <label className="block text-[11px] font-bold text-gray-600 mb-2">Sakit (Hari)</label>
                            <div className="flex items-center justify-center gap-2">
                              {!isStudentRole && (
                                <button
                                  onClick={() => setSickCount(Math.max(0, sickCount - 1))}
                                  className="w-6 h-6 rounded-md bg-white border border-gray-300 flex items-center justify-center text-xs font-bold text-gray-600 hover:bg-gray-100"
                                >
                                  -
                                </button>
                              )}
                              <span className="text-base font-extrabold text-gray-900 w-8">{sickCount}</span>
                              {!isStudentRole && (
                                <button
                                  onClick={() => setSickCount(sickCount + 1)}
                                  className="w-6 h-6 rounded-md bg-white border border-gray-300 flex items-center justify-center text-xs font-bold text-gray-600 hover:bg-gray-100"
                                >
                                  +
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-center">
                            <label className="block text-[11px] font-bold text-gray-600 mb-2">Izin (Hari)</label>
                            <div className="flex items-center justify-center gap-2">
                              {!isStudentRole && (
                                <button
                                  onClick={() => setPermitCount(Math.max(0, permitCount - 1))}
                                  className="w-6 h-6 rounded-md bg-white border border-gray-300 flex items-center justify-center text-xs font-bold text-gray-600 hover:bg-gray-100"
                                >
                                  -
                                </button>
                              )}
                              <span className="text-base font-extrabold text-gray-900 w-8">{permitCount}</span>
                              {!isStudentRole && (
                                <button
                                  onClick={() => setPermitCount(permitCount + 1)}
                                  className="w-6 h-6 rounded-md bg-white border border-gray-300 flex items-center justify-center text-xs font-bold text-gray-600 hover:bg-gray-100"
                                >
                                  +
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-center">
                            <label className="block text-[11px] font-bold text-gray-600 mb-2">Tanpa Ket. (Hari)</label>
                            <div className="flex items-center justify-center gap-2">
                              {!isStudentRole && (
                                <button
                                  onClick={() => setAlphaCount(Math.max(0, alphaCount - 1))}
                                  className="w-6 h-6 rounded-md bg-white border border-gray-300 flex items-center justify-center text-xs font-bold text-gray-600 hover:bg-gray-100"
                                >
                                  -
                                </button>
                              )}
                              <span className="text-base font-extrabold text-gray-900 w-8">{alphaCount}</span>
                              {!isStudentRole && (
                                <button
                                  onClick={() => setAlphaCount(alphaCount + 1)}
                                  className="w-6 h-6 rounded-md bg-white border border-gray-300 flex items-center justify-center text-xs font-bold text-gray-600 hover:bg-gray-100"
                                >
                                  +
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-[11px] text-gray-500 bg-blue-50/50 p-2.5 rounded-xl border border-blue-100 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>Status kehadiran berada dalam kondisi aman untuk mengikuti ujian semester.</span>
                        </div>
                      </div>

                    </div>

                    {/* Section D: Kegiatan Ekstrakurikuler */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-[#531FFF]" />
                          <h3 className="font-bold text-xs text-gray-800 uppercase tracking-wider">D. Kegiatan Ekstrakurikuler</h3>
                        </div>
                        {!isStudentRole && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-medium text-gray-400">Preset:</span>
                            {["Pramuka Wajib", "PMR", "Paskibra", "English Club", "Futsal"].map((p, pIdx) => (
                              <button
                                key={pIdx}
                                onClick={() => handleAddExtra(p)}
                                className="text-[10px] font-bold text-[#531FFF] bg-[#531FFF]/10 hover:bg-[#531FFF]/20 px-2 py-0.5 rounded-md transition-colors"
                              >
                                + {p}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        {extraCurriculars.map((ex, exIdx) => (
                          <div key={exIdx} className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3">
                              <input
                                type="text"
                                disabled={isStudentRole}
                                value={ex.name}
                                onChange={(e) => handleUpdateExtra(exIdx, "name", e.target.value)}
                                placeholder="Nama Ekstrakurikuler"
                                className="md:col-span-4 px-3 py-1.5 font-bold bg-white border border-gray-200 rounded-lg disabled:opacity-80"
                              />
                              <select
                                disabled={isStudentRole}
                                value={ex.grade}
                                onChange={(e) => handleUpdateExtra(exIdx, "grade", e.target.value)}
                                className="md:col-span-2 px-2 py-1.5 font-bold bg-white border border-gray-200 rounded-lg disabled:opacity-80"
                              >
                                <option value="A">Nilai A (Sangat Baik)</option>
                                <option value="B">Nilai B (Baik)</option>
                                <option value="C">Nilai C (Cukup)</option>
                              </select>
                              <input
                                type="text"
                                disabled={isStudentRole}
                                value={ex.desc}
                                onChange={(e) => handleUpdateExtra(exIdx, "desc", e.target.value)}
                                placeholder="Keterangan perkembangan..."
                                className="md:col-span-6 px-3 py-1.5 font-medium bg-white border border-gray-200 rounded-lg disabled:opacity-80"
                              />
                            </div>

                            {!isStudentRole && (
                              <button
                                onClick={() => handleRemoveExtra(exIdx)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors shrink-0"
                                title="Hapus Ekstrakurikuler"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}

                        {extraCurriculars.length === 0 && (
                          <p className="text-center text-xs text-gray-400 py-3">Belum ada kegiatan ekstrakurikuler tercatat.</p>
                        )}
                      </div>
                    </div>

                    {/* Section E: Catatan Perkembangan Wali Kelas */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-2">
                          <Edit3 className="w-4 h-4 text-[#531FFF]" />
                          <h3 className="font-bold text-xs text-gray-800 uppercase tracking-wider">E. Catatan Perkembangan Wali Kelas</h3>
                        </div>
                        {!isStudentRole && (
                          <span className="text-[11px] text-gray-400 font-medium">Gunakan template di bawah untuk mempercepat</span>
                        )}
                      </div>

                      {!isStudentRole && (
                        <div className="flex items-center gap-2 flex-wrap pb-1">
                          <button
                            onClick={() => applyPresetNote("Selamat atas prestasi gemilang semester ini! Pertahankan semangat belajar, keaktifan di kelas, dan tetap rendah hati.")}
                            className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors"
                          >
                            🌟 Template Prestatif
                          </button>
                          <button
                            onClick={() => applyPresetNote("Ananda menunjukkan kemajuan akademik yang sangat baik. Tingkatkan terus konsistensi dan minat baca untuk meraih hasil optimal.")}
                            className="text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors"
                          >
                            📈 Template Konsisten
                          </button>
                          <button
                            onClick={() => applyPresetNote("Perlu meningkatkan konsentrasi dan kedisiplinan belajar di rumah. Jangan ragu bertanya kepada guru jika menemukan kesulitan.")}
                            className="text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition-colors"
                          >
                            💪 Template Bimbingan
                          </button>
                        </div>
                      )}

                      <textarea
                        rows={3}
                        disabled={isStudentRole}
                        value={teacherNotes}
                        onChange={(e) => setTeacherNotes(e.target.value)}
                        placeholder="Tuliskan catatan motivasi dan saran perkembangan untuk siswa..."
                        className="w-full p-3 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] disabled:opacity-80 leading-relaxed"
                      />
                    </div>

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
                  <p><span className="text-gray-500 font-normal">NIS / NISN:</span> <span className="font-bold text-gray-800">{currentStudent.id}</span></p>
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

              {/* Teacher Notes */}
              <div className="border border-gray-300 rounded-xl p-4 text-xs">
                <h4 className="font-bold uppercase mb-1 text-gray-800">E. CATATAN WALI KELAS</h4>
                <p className="italic leading-relaxed text-gray-800">"{teacherNotes}"</p>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-3 text-center text-xs pt-8 border-t border-gray-300">
                <div>
                  <p>Orang Tua / Wali Siswa</p>
                  <div className="h-16" />
                  <p className="font-bold border-b border-gray-400 inline-block px-4">( ........................................ )</p>
                </div>
                <div>
                  <p>Wali Kelas</p>
                  <div className="h-16" />
                  <p className="font-bold border-b border-gray-400 inline-block px-4">Drs. Taufik Hidayat, M.Pd.</p>
                </div>
                <div>
                  <p>Kepala Sekolah</p>
                  <div className="h-16" />
                  <p className="font-bold border-b border-gray-400 inline-block px-4">Dr. H. Rahmat Wijaya, M.Si.</p>
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
