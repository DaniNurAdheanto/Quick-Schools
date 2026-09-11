
"use client";

import Link from "next/link";
import { 
  Users, 
  GraduationCap, 
  CalendarCheck, 
  Wallet, 
  ChevronDown, 
  ChevronRight, 
  Megaphone, 
  ArrowUp, 
  ArrowDown, 
  Calendar, 
  Clock, 
  Clock3, 
  BarChart2, 
  FileText, 
  Settings, 
  Sparkles, 
  AlertTriangle, 
  Star, 
  CheckCircle2, 
  UserCheck, 
  Shield, 
  Droplet, 
  Award, 
  BookOpen, 
  MapPin, 
  ScanFace,
  School,
  CheckCircle,
  CalendarRange,
  TrendingUp
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  ReferenceLine 
} from 'recharts';
import Image from "next/image";
import { useEffect, useState, useMemo } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { cn } from "@/lib/utils";

const ATTENDANCE_DATA = [
  { date: '15 Mei', value: 40 },
  { date: '16 Mei', value: 65 },
  { date: '17 Mei', value: 80 },
  { date: '18 Mei', value: 60 },
  { date: '19 Mei', value: 75 },
  { date: '20 Mei', value: 97 },
  { date: '21 Mei', value: 85 },
];

import { QuickAttendanceModal } from "@/components/modals/quick-attendance-modal";
import { TeacherDashboardView } from "@/components/dashboard/teacher-dashboard-view";

const DISTRIBUTION_DATA = [
  { name: 'Average', value: 75, color: '#4ADE80' }, 
  { name: 'Remaining', value: 25, color: '#E2E8F0' }, 
];

function StudentDashboardView({ userName, greeting, academicYear, currentDate, currentDay }: {
  userName: string;
  greeting: string;
  academicYear: string;
  currentDate: string;
  currentDay: string;
}) {
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [studentDoc, setStudentDoc] = useState<any>(null);
  const [studentClass, setStudentClass] = useState<string>("10 MIPA 1");
  const [studentNisn, setStudentNisn] = useState<string>("202300124");
  const [homeroomTeacher, setHomeroomTeacher] = useState<string>("");

  // Firestore Realtime Collections
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [gradesRecords, setGradesRecords] = useState<any[]>([]);
  const [schedulesList, setSchedulesList] = useState<any[]>([]);
  const [examSchedulesList, setExamSchedulesList] = useState<any[]>([]);
  const [announcementsList, setAnnouncementsList] = useState<any[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);

  // Time tracker for live class status
  const [nowTimeStr, setNowTimeStr] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setNowTimeStr(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // 1. Auth & Student Identity Fetching
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setCurrentUser(u);
        try {
          // Fetch from users collection
          const userSnap = await getDoc(doc(db, "users", u.uid));
          let sClass = "";
          let sNisn = "";
          if (userSnap.exists()) {
            const uData = userSnap.data();
            sClass = uData.className || uData.classId || uData.kelas || "";
            sNisn = uData.nisn || uData.nis || "";
          }

          // Fetch from students collection
          try {
            const studentSnap = await getDoc(doc(db, "students", u.uid));
            if (studentSnap.exists()) {
              const sData = studentSnap.data();
              setStudentDoc(sData);
              if (sData.className || sData.classId || sData.kelas) {
                sClass = sData.className || sData.classId || sData.kelas;
              }
              if (sData.nisn || sData.nis) {
                sNisn = sData.nisn || sData.nis;
              }
              if (sData.homeroom || sData.waliKelas) {
                setHomeroomTeacher(sData.homeroom || sData.waliKelas);
              }
            }
          } catch (e) {
            console.warn("Student doc fetch error:", e);
          }

          if (sClass) setStudentClass(sClass);
          if (sNisn) setStudentNisn(sNisn);
        } catch (err) {
          console.error("Profile fetch error:", err);
        }
      }
    });
    return () => unsubAuth();
  }, []);

  // 2. Realtime Subscriptions
  useEffect(() => {
    // Attendance
    const unsubAttendance = onSnapshot(collection(db, "attendance"), (snap) => {
      setAttendanceRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Attendance listener warning:", err));

    // Grades
    const unsubGrades = onSnapshot(collection(db, "grades"), (snap) => {
      setGradesRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Grades listener warning:", err));

    // Schedules
    const unsubSchedules = onSnapshot(collection(db, "schedules"), (snap) => {
      setSchedulesList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Schedules listener warning:", err));

    // Exams
    const unsubExams = onSnapshot(collection(db, "examSchedules"), (snap) => {
      setExamSchedulesList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("ExamSchedules listener warning:", err));

    // Announcements
    const unsubAnnouncements = onSnapshot(collection(db, "announcements"), (snap) => {
      setAnnouncementsList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Announcements listener warning:", err));

    // Classes
    const unsubClasses = onSnapshot(collection(db, "classes"), (snap) => {
      setClassesList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Classes listener warning:", err));

    return () => {
      unsubAttendance();
      unsubGrades();
      unsubSchedules();
      unsubExams();
      unsubAnnouncements();
      unsubClasses();
    };
  }, []);

  // Helper to match class names flexibly (e.g. "10 MIPA 1" vs "10-MIPA-1")
  const matchClass = (examClass: string, targetClass: string): boolean => {
    if (!examClass || !targetClass) return false;
    const cleanExam = examClass.toLowerCase().replace(/[\s\-_]/g, "");
    const cleanTarget = targetClass.toLowerCase().replace(/[\s\-_]/g, "");
    return cleanExam === cleanTarget || cleanExam.includes(cleanTarget) || cleanTarget.includes(cleanExam);
  };

  // Auto-resolve homeroom teacher from classesList if not yet set
  useEffect(() => {
    if (!homeroomTeacher && studentClass && classesList.length > 0) {
      const matchedClass = classesList.find(c => matchClass(c.name || c.className || c.id, studentClass));
      if (matchedClass && (matchedClass.homeroomTeacher || matchedClass.waliKelas)) {
        setHomeroomTeacher(matchedClass.homeroomTeacher || matchedClass.waliKelas);
      }
    }
  }, [homeroomTeacher, studentClass, classesList]);

  // 3. Computed Attendance Stats & Today's Checkin Status
  const attendanceComputed = useMemo(() => {
    const uid = currentUser?.uid;
    const nameLower = (userName || "").toLowerCase().trim();
    const nisn = studentNisn;

    // Filter student records
    const myRecords = attendanceRecords.filter(r => {
      if (uid && (r.studentId === uid || r.uid === uid)) return true;
      if (nisn && (r.studentId === nisn || r.nisn === nisn)) return true;
      if (studentDoc?.id && r.studentId === studentDoc.id) return true;
      if (r.studentName && r.studentName.toLowerCase().trim() === nameLower) return true;
      return false;
    });

    const todayStr = new Date().toISOString().split("T")[0];
    const todayRecord = myRecords.find(r => r.date === todayStr);

    const total = myRecords.length;
    const hadir = myRecords.filter(r => r.status === "Hadir").length;
    const terlambat = myRecords.filter(r => r.status === "Terlambat").length;
    const sakit = myRecords.filter(r => r.status === "Sakit").length;
    const izin = myRecords.filter(r => r.status === "Izin").length;
    const alpa = myRecords.filter(r => r.status === "Alpa").length;

    let percentage = "98.5";
    if (total > 0) {
      percentage = (((hadir + terlambat) / total) * 100).toFixed(1);
    }

    const pieData = [
      { name: "Hadir", value: total > 0 ? hadir : 42, color: "#531FFF", count: `${total > 0 ? hadir : 42} Hari` },
      { name: "Terlambat", value: total > 0 ? terlambat : 1, color: "#8B5CF6", count: `${total > 0 ? terlambat : 1} Hari` },
      { name: "Izin", value: total > 0 ? izin : 1, color: "#F59E0B", count: `${total > 0 ? izin : 1} Hari` },
      { name: "Sakit", value: total > 0 ? sakit : 1, color: "#3B82F6", count: `${total > 0 ? sakit : 1} Hari` },
      { name: "Alfa", value: total > 0 ? alpa : 0, color: "#EF4444", count: `${total > 0 ? alpa : 0} Hari` },
    ].filter(item => item.value > 0);

    return {
      myRecords,
      todayRecord,
      total: total > 0 ? total : 45,
      hadir: total > 0 ? hadir : 42,
      terlambat: total > 0 ? terlambat : 1,
      sakit: total > 0 ? sakit : 1,
      izin: total > 0 ? izin : 1,
      alpa: total > 0 ? alpa : 0,
      percentage,
      pieData,
      isLive: total > 0
    };
  }, [attendanceRecords, currentUser, userName, studentNisn, studentDoc]);

  // 4. Computed Academic Grades & Chart
  const gradesComputed = useMemo(() => {
    const uid = currentUser?.uid;
    const nameLower = (userName || "").toLowerCase().trim();
    const nisn = studentNisn;

    const myGrades = gradesRecords.filter(g => {
      if (uid && (g.studentId === uid || g.uid === uid)) return true;
      if (nisn && (g.studentId === nisn || g.nisn === nisn)) return true;
      if (studentDoc?.id && g.studentId === studentDoc.id) return true;
      if (g.studentName && g.studentName.toLowerCase().trim() === nameLower) return true;
      return false;
    });

    // Default baseline curriculum subjects if student has no entered grades in db yet
    const FALLBACK_GRADES = [
      { subject: "Matematika", score: 88, kkm: 75, grade: "A" },
      { subject: "B. Indonesia", score: 92, kkm: 75, grade: "A+" },
      { subject: "B. Inggris", score: 95, kkm: 75, grade: "A+" },
      { subject: "Fisika", score: 82, kkm: 75, grade: "B+" },
      { subject: "Kimia", score: 85, kkm: 75, grade: "A" },
      { subject: "Biologi", score: 90, kkm: 75, grade: "A" },
      { subject: "Sejarah", score: 86, kkm: 75, grade: "A" },
    ];

    if (myGrades.length === 0) {
      return {
        gradesChartData: FALLBACK_GRADES,
        averageScore: "88.3",
        predikat: "A · Sangat Memuaskan",
        passRate: 100,
        recentEvaluations: [
          { subject: "Bahasa Inggris", type: "UTS Genap", score: 95, kkm: 75, date: "02 Mei 2026", status: "Lulus KKM" },
          { subject: "Matematika", type: "Tugas 2 Integral", score: 88, kkm: 75, date: "28 Apr 2026", status: "Lulus KKM" },
          { subject: "Fisika Dasar", type: "Kuis Termodinamika", score: 82, kkm: 75, date: "22 Apr 2026", status: "Lulus KKM" },
          { subject: "Biologi", type: "Praktikum Sel", score: 90, kkm: 75, date: "15 Apr 2026", status: "Lulus KKM" },
        ],
        isLive: false
      };
    }

    // Group scores per subject
    const subjectMap = new Map<string, number[]>();
    myGrades.forEach(g => {
      const sub = g.subject || "Umum";
      const sc = Number(g.score) || 0;
      if (!subjectMap.has(sub)) subjectMap.set(sub, []);
      subjectMap.get(sub)!.push(sc);
    });

    const chartData = Array.from(subjectMap.entries()).map(([sub, scores]) => {
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      const grade = avg >= 90 ? "A+" : avg >= 85 ? "A" : avg >= 75 ? "B" : avg >= 65 ? "C" : "D";
      return { subject: sub, score: avg, kkm: 75, grade };
    });

    const totalAvg = Math.round(
      chartData.reduce((acc, curr) => acc + curr.score, 0) / (chartData.length || 1)
    );

    const passedCount = chartData.filter(d => d.score >= 75).length;
    const passRate = Math.round((passedCount / (chartData.length || 1)) * 100);

    let predikat = "B · Baik";
    if (totalAvg >= 90) predikat = "A+ · Istimewa";
    else if (totalAvg >= 85) predikat = "A · Sangat Memuaskan";
    else if (totalAvg >= 75) predikat = "B · Baik (Tuntas KKM)";
    else if (totalAvg >= 65) predikat = "C · Cukup";
    else predikat = "D · Perlu Bimbingan";

    // Recent evaluations sorted
    const recent = [...myGrades]
      .sort((a, b) => (new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime()))
      .slice(0, 4)
      .map(g => ({
        subject: g.subject || "Mata Pelajaran",
        type: g.type || "Evaluasi",
        score: Number(g.score) || 0,
        kkm: 75,
        date: g.date || "Terbaru",
        status: (Number(g.score) || 0) >= 75 ? "Lulus KKM" : "Remedial"
      }));

    return {
      gradesChartData: chartData,
      averageScore: totalAvg.toFixed(1),
      predikat,
      passRate,
      recentEvaluations: recent,
      isLive: true
    };
  }, [gradesRecords, currentUser, userName, studentNisn, studentDoc]);

  // 5. Computed Today's Class Schedule
  const scheduleComputed = useMemo(() => {
    const daysIndo = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const todayDayIndex = new Date().getDay();
    const todayDayName = daysIndo[todayDayIndex];
    const isWeekend = todayDayIndex === 0 || todayDayIndex === 6;

    // Filter by student class
    const classSchedules = schedulesList.filter(s => matchClass(s.classId || s.className || "", studentClass));

    // Find schedules for today (or Monday if weekend)
    const targetDay = isWeekend ? "Senin" : todayDayName;
    let dayList = classSchedules.filter(s => (s.day || "").toLowerCase() === targetDay.toLowerCase());

    // Fallback if no specific schedules found in db
    if (dayList.length === 0) {
      dayList = [
        { time: "07:00 - 08:30", startTime: "07:00", endTime: "08:30", subject: "Matematika", room: "Ruang X-IPA-1", teacher: "Drs. Bambang H.", type: "Wajib" },
        { time: "08:30 - 10:00", startTime: "08:30", endTime: "10:00", subject: "Bahasa Indonesia", room: "Ruang X-IPA-1", teacher: "Ibu Dewi R., M.Pd", type: "Wajib" },
        { time: "10:15 - 11:45", startTime: "10:15", endTime: "11:45", subject: "Fisika Dasar", room: "Lab Fisika A", teacher: "Bp. Hendra W., S.T", type: "Praktikum" },
        { time: "12:30 - 14:00", startTime: "12:30", endTime: "14:00", subject: "Bahasa Inggris", room: "Ruang X-IPA-1", teacher: "Ibu Rina K., M.Hum", type: "Wajib" },
      ];
    }

    // Determine live status for each item based on current time
    const [nowH, nowM] = nowTimeStr.split(":").map(Number);
    const nowMin = nowH * 60 + nowM;

    let nextSubject = "-";
    let nextTime = "-";

    const mapped = dayList.map(item => {
      const sTime = item.startTime || (item.time ? item.time.split("-")[0]?.trim() : "07:00");
      const eTime = item.endTime || (item.time ? item.time.split("-")[1]?.trim() : "08:30");
      
      const [sH, sM] = sTime.split(":").map(Number);
      const [eH, eM] = eTime.split(":").map(Number);
      const sMin = sH * 60 + sM;
      const eMin = eH * 60 + eM;

      let status = "Selanjutnya";
      if (!isWeekend) {
        if (nowMin >= sMin && nowMin < eMin) {
          status = "Berlangsung";
        } else if (nowMin >= eMin) {
          status = "Selesai";
        }
      }

      if (status === "Berlangsung") {
        nextSubject = item.subject;
        nextTime = `${sTime} - ${eTime}`;
      } else if (status === "Selanjutnya" && nextSubject === "-") {
        nextSubject = item.subject;
        nextTime = `${sTime} WIB`;
      }

      return {
        ...item,
        startTime: sTime,
        endTime: eTime,
        time: `${sTime} - ${eTime}`,
        status
      };
    });

    return {
      dayList: mapped,
      isWeekend,
      targetDay,
      nextSubject: nextSubject !== "-" ? nextSubject : (mapped[0]?.subject || "Matematika"),
      nextTime: nextTime !== "-" ? nextTime : (mapped[0]?.time || "07:00 WIB")
    };
  }, [schedulesList, studentClass, nowTimeStr]);

  // 6. Computed Upcoming Semester Exams (UTS / UAS)
  const upcomingExamsComputed = useMemo(() => {
    // Combine examSchedules + schedules with isExam
    const allExams = [...examSchedulesList, ...schedulesList.filter(s => s.isExam || s.examType)];
    
    // Filter for student's class and semester exams (PTS/UTS & PAS/UAS)
    const filtered = allExams.filter(e => {
      if (e.isGroup || !e.subject) return false;
      if (!matchClass(e.classId || "", studentClass)) return false;
      const typeUpper = (e.examType || "").toUpperCase();
      const titleUpper = (e.title || "").toUpperCase();
      const isUTS = typeUpper.includes("PTS") || typeUpper.includes("UTS") || titleUpper.includes("PTS") || titleUpper.includes("UTS") || titleUpper.includes("TENGAH");
      const isUAS = typeUpper.includes("PAS") || typeUpper.includes("UAS") || titleUpper.includes("PAS") || titleUpper.includes("UAS") || titleUpper.includes("AKHIR");
      return isUTS || isUAS;
    });

    // Fallback sample if no semester exams found in db
    let examItems = filtered;
    if (examItems.length === 0) {
      examItems = [
        {
          id: "sample_uts_1",
          title: "Penilaian Tengah Semester (PTS) Ganjil",
          examType: "PTS",
          subject: "Matematika Peminatan",
          classId: studentClass,
          date: "2025-09-15",
          startTime: "07:30",
          endTime: "09:00",
          room: "Ruang R.101",
          proctor: "Drs. Taufik Hidayat, M.Pd.",
          status: "Akan Datang"
        },
        {
          id: "sample_uts_2",
          title: "Penilaian Tengah Semester (PTS) Ganjil",
          examType: "PTS",
          subject: "Fisika Terapan",
          classId: studentClass,
          date: "2025-09-16",
          startTime: "07:30",
          endTime: "09:00",
          room: "Lab Fisika A",
          proctor: "Dr. Budi Santoso, M.Si.",
          status: "Akan Datang"
        }
      ];
    }

    // Sort by date ascending
    examItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const nearest = examItems[0] || null;

    let daysRemaining: number | null = null;
    let countdownLabel = "Segera";
    if (nearest?.date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(nearest.date);
      target.setHours(0, 0, 0, 0);
      const diffMs = target.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      daysRemaining = diffDays;
      if (diffDays === 0) countdownLabel = "Hari Ini!";
      else if (diffDays === 1) countdownLabel = "Besok";
      else if (diffDays > 1) countdownLabel = `${diffDays} Hari Lagi`;
      else countdownLabel = "Berlangsung";
    }

    return {
      list: examItems,
      nearest,
      daysRemaining,
      countdownLabel
    };
  }, [examSchedulesList, schedulesList, studentClass]);

  // 7. Computed Announcements
  const recentAnnouncements = useMemo(() => {
    const valid = announcementsList
      .filter(a => {
        const target = (a.target || "").toLowerCase();
        return !target || target === "semua" || target === "siswa" || target.includes("siswa");
      })
      .slice(0, 3);

    if (valid.length === 0) {
      return [
        {
          id: "ann_1",
          title: "Jadwal Pelaksanaan Penilaian Tengah Semester (PTS) Ganjil",
          desc: "Seluruh siswa dimohon mempersiapkan kartu peserta ujian dan mematuhi tata tertib ruangan.",
          tag: "AKADEMIK",
          date: "05 Sep 2025"
        },
        {
          id: "ann_2",
          title: "Pemutakhiran Presensi Wajah & Geofence GPS Mandiri",
          desc: "Gunakan fitur scan wajah mandiri pada jam masuk 06.30 - 07.15 WIB di area sekolah.",
          tag: "PENTING",
          date: "02 Sep 2025"
        }
      ];
    }
    return valid;
  }, [announcementsList]);

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto w-full space-y-6 animate-in fade-in duration-300">
      
      {/* Quick Attendance Modal with Real Student Class & ID */}
      <QuickAttendanceModal 
        isOpen={showAttendanceModal}
        onClose={() => setShowAttendanceModal(false)}
        userName={userName}
        studentClass={studentClass}
        studentId={studentNisn}
      />

      {/* Hero Welcome Banner */}
      <div className="relative rounded-xl overflow-hidden bg-gradient-to-r from-[#4410D9] via-[#531FFF] to-[#7942FF] p-6 md:p-8 text-white shadow-xl flex flex-col lg:flex-row justify-between lg:items-center gap-6 border border-white/15">
        
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="z-10 relative space-y-4 flex-1">
          {/* Status Badges */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 flex items-center gap-1.5 backdrop-blur-md shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Siswa Aktif
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white border border-white/20 backdrop-blur-md">
              Tahun Ajaran {academicYear}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white border border-white/20 backdrop-blur-md flex items-center gap-1">
              <School className="w-3.5 h-3.5 text-purple-200" />
              <span>Kelas {studentClass}</span>
            </span>
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight mb-1 flex items-center gap-2">
              {greeting}, {userName}! <span className="animate-bounce inline-block">👋</span>
            </h1>
            <p className="text-white/85 text-xs md:text-sm font-medium max-w-2xl leading-relaxed">
              Selamat datang di portal akademik mandiri. Pantau rekap presensi kehadiran, grafik pencapaian nilai, serta jadwal pelajaran dan ujian semester Anda.
            </p>
          </div>

          {/* Action Button & Quick Profile Chips */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {/* Realtime Attendance Status Chip or Action */}
            {attendanceComputed.todayRecord ? (
              <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500/25 border border-emerald-300/40 text-emerald-100 rounded-lg text-xs font-extrabold backdrop-blur-md shadow-sm">
                <CheckCircle className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>Sudah Presensi Hari Ini ({attendanceComputed.todayRecord.timestamp || "07:15 WIB"})</span>
                {attendanceComputed.todayRecord.faceVerified && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 text-[10px] text-emerald-200 font-bold border border-emerald-300/30">
                    Wajah Terverifikasi
                  </span>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowAttendanceModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white rounded-lg font-extrabold text-xs md:text-sm shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer border border-white/20"
              >
                <ScanFace className="w-4 h-4 animate-pulse" />
                <span>Absen Masuk (Face & GPS)</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              </button>
            )}

            <div className="bg-white/10 hover:bg-white/20 px-3.5 py-2 rounded-lg border border-white/15 backdrop-blur-md text-xs font-bold flex items-center gap-1.5 transition-colors">
              <span className="text-white/60">NISN:</span>
              <span className="tracking-wide text-white">{studentNisn}</span>
            </div>

            {homeroomTeacher && (
              <div className="bg-white/10 hover:bg-white/20 px-3.5 py-2 rounded-lg border border-white/15 backdrop-blur-md text-xs font-bold flex items-center gap-1.5 transition-colors">
                <span className="text-white/60">Wali Kelas:</span>
                <span className="text-white">{homeroomTeacher}</span>
              </div>
            )}
          </div>
        </div>

        {/* Motivational Card Right */}
        <div className="z-10 relative bg-white/15 backdrop-blur-md border border-white/25 p-5 rounded-lg shrink-0 lg:w-[320px] flex flex-col justify-between space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-white/80">Indeks Prestasi Siswa</span>
            <div className="w-8 h-8 rounded-lg bg-amber-400/20 flex items-center justify-center text-amber-300">
              <Star className="w-4 h-4 fill-amber-300" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white tracking-tight flex items-baseline gap-2">
              {gradesComputed.averageScore} <span className="text-xs font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-400/30">KKM: 75</span>
            </div>
            <p className="text-xs text-white/90 font-semibold mt-1 flex items-center gap-1">
              <span>{gradesComputed.predikat}</span>
            </p>
          </div>
          <div className="pt-2 border-t border-white/15 flex items-center justify-between text-xs font-bold text-white/90">
            <span>Presensi Kehadiran</span>
            <span className="text-emerald-300">{attendanceComputed.percentage}% (Tinggi)</span>
          </div>
        </div>
      </div>

      {/* 4 Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        
        {/* KPI 1: Rata-Rata Nilai */}
        <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Rata-Rata Nilai</span>
            <div className="w-10 h-10 rounded-lg bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 tracking-tight mb-1">
            {gradesComputed.averageScore} <span className="text-xs text-gray-400 font-normal">/ 100</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> {gradesComputed.passRate}% Tuntas KKM
            </span>
          </div>
        </div>

        {/* KPI 2: Kehadiran Presensi */}
        <div 
          onClick={() => setShowAttendanceModal(true)}
          className="bg-white p-5 rounded-lg border border-gray-100 shadow-xs hover:shadow-md transition-all group cursor-pointer hover:border-emerald-200"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Tingkat Presensi</span>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <ScanFace className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mb-1">
            <div className="text-2xl font-black text-gray-900 tracking-tight">
              {attendanceComputed.percentage}%
            </div>
            <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              + Presensi
            </span>
          </div>
          <div className="text-xs text-gray-500 font-medium">
            {attendanceComputed.hadir} Hadir · {attendanceComputed.izin} Izin · {attendanceComputed.sakit} Sakit · {attendanceComputed.alpa} Alfa
          </div>
        </div>

        {/* KPI 3: Jadwal Pelajaran Hari Ini */}
        <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              {scheduleComputed.isWeekend ? "Jadwal Hari Senin" : "Pelajaran Hari Ini"}
            </span>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 tracking-tight mb-1">
            {scheduleComputed.dayList.length} Mata Pelajaran
          </div>
          <div className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded inline-flex items-center gap-1 max-w-full truncate">
            <Clock className="w-3 h-3 shrink-0" />
            <span className="truncate">Next: {scheduleComputed.nextSubject} ({scheduleComputed.nextTime})</span>
          </div>
        </div>

        {/* KPI 4: Ujian Semester Terdekat (UTS / UAS) */}
        <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Ujian Semester (UTS/UAS)</span>
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-[#531FFF] flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <CalendarRange className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#531FFF] tracking-tight mb-1 flex items-center gap-2">
            <span>{upcomingExamsComputed.countdownLabel}</span>
          </div>
          <div className="text-xs text-gray-500 font-medium truncate">
            {upcomingExamsComputed.nearest ? (
              <span>{upcomingExamsComputed.nearest.subject} ({upcomingExamsComputed.nearest.examType})</span>
            ) : (
              <span>Tidak ada ujian minggu ini</span>
            )}
          </div>
        </div>

      </div>

      {/* Main Grid: Left Content (2 cols) and Right Sidebar (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Jadwal Hari Ini & Grafik Nilai */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Widget 1: Jadwal Pelajaran Hari Ini */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="p-5 md:p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#531FFF]" />
                  <span>Jadwal Pelajaran {scheduleComputed.isWeekend ? "(Hari Senin Mendatang)" : `Hari Ini (${currentDay}, ${currentDate})`}</span>
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  Kelas {studentClass} · Jam masuk 07.00 s/d 14.00 WIB
                </p>
              </div>
              <Link href="/admin/schedule" className="text-xs font-bold text-[#531FFF] hover:underline flex items-center gap-1">
                Semua Jadwal <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-400 uppercase tracking-wider font-extrabold border-b border-gray-100">
                    <th className="py-3 px-5">Waktu</th>
                    <th className="py-3 px-5">Mata Pelajaran</th>
                    <th className="py-3 px-5">Ruangan</th>
                    <th className="py-3 px-5">Guru Pengajar</th>
                    <th className="py-3 px-5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                  {scheduleComputed.dayList.map((item, idx) => (
                    <tr 
                      key={idx} 
                      className={cn(
                        "transition-colors",
                        item.status === "Berlangsung" 
                          ? "bg-emerald-50/50 hover:bg-emerald-50/80 font-semibold" 
                          : "hover:bg-gray-50/80"
                      )}
                    >
                      <td className="py-3.5 px-5 font-bold text-gray-900 whitespace-nowrap">
                        {item.time}
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-gray-900 text-sm">{item.subject}</div>
                        <span className="text-[10px] text-gray-400 font-medium">{item.type || "Wajib"}</span>
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-[#531FFF] rounded-md font-bold">
                          <MapPin className="w-3 h-3 text-[#531FFF]" /> {item.room || "Ruang Kelas"}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-gray-600 font-semibold whitespace-nowrap">
                        {item.teacher || "Guru Pengampu"}
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        {item.status === "Berlangsung" ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full font-extrabold shadow-xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Sedang Berlangsung
                          </span>
                        ) : item.status === "Selesai" ? (
                          <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full font-bold">
                            Selesai
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full font-bold">
                            Selanjutnya
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Widget 2: Grafik Batang Pencapaian Nilai per Mata Pelajaran */}
          <div className="bg-white p-5 md:p-6 rounded-xl border border-gray-100 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
              <div>
                <h2 className="text-base font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-[#531FFF]" />
                  <span>Grafik Pencapaian Nilai per Mata Pelajaran</span>
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-0.5">Perbandingan capaian nilai siswa terhadap batas standar KKM (75)</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-[#531FFF] bg-[#531FFF]/10 px-3 py-1 rounded-full border border-[#531FFF]/20">
                  Semester Ganjil 2025/2026
                </span>
              </div>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gradesComputed.gradesChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="subject" tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#1E293B', borderRadius: '12px', color: '#fff', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    formatter={(val: any) => [`${val} / 100`, 'Nilai Siswa']}
                  />
                  <ReferenceLine y={75} stroke="#EF4444" strokeDasharray="4 4" label={{ value: 'Batas KKM (75)', fill: '#EF4444', fontSize: 10, fontWeight: 700 }} />
                  <Bar dataKey="score" radius={[8, 8, 0, 0]} fill="#531FFF">
                    {gradesComputed.gradesChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.score >= 90 ? '#531FFF' : entry.score >= 75 ? '#7B42FF' : '#F59E0B'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between text-xs font-semibold text-gray-500 gap-2">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-[#531FFF]" /> Nilai Istimewa (≥ 90)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-[#7B42FF]" /> Tuntas KKM (75 - 89)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-[#F59E0B]" /> Di Bawah KKM (&lt; 75)
                </span>
              </div>
              <span className="text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                {gradesComputed.passRate}% Lulus KKM
              </span>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Ujian Mendatang, Pie Kehadiran, Nilai Terbaru, Pengumuman */}
        <div className="space-y-6">
          
          {/* Card 1: Pengingat Ujian Semester (UTS/UAS) Khusus Kelas Anda */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-5 md:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#531FFF] flex items-center justify-center">
                  <CalendarRange className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900">Ujian Semester Mendatang</h3>
                  <p className="text-[11px] text-gray-400 font-medium">Khusus Kelas {studentClass}</p>
                </div>
              </div>
              <Link href="/admin/exams" className="text-[11px] font-bold text-[#531FFF] hover:underline flex items-center gap-0.5">
                Semua Ujian <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {upcomingExamsComputed.nearest ? (
              <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50/80 via-white to-purple-50/40 border border-purple-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded text-[10px] font-black bg-[#531FFF] text-white uppercase tracking-wider">
                    {upcomingExamsComputed.nearest.examType || "UTS"}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                    {upcomingExamsComputed.countdownLabel}
                  </span>
                </div>
                <div>
                  <h4 className="font-extrabold text-gray-900 text-sm">{upcomingExamsComputed.nearest.subject}</h4>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">{upcomingExamsComputed.nearest.title}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-gray-600 pt-2 border-t border-purple-100/60">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>{upcomingExamsComputed.nearest.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span>{upcomingExamsComputed.nearest.startTime} - {upcomingExamsComputed.nearest.endTime}</span>
                  </div>
                  <div className="flex items-center gap-1.5 col-span-2">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>{upcomingExamsComputed.nearest.room} · Pengawas: {upcomingExamsComputed.nearest.proctor}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400 text-xs font-medium">
                Belum ada jadwal UTS atau UAS yang dijadwalkan untuk kelas Anda.
              </div>
            )}
          </div>

          {/* Card 2: Donut Chart Ringkasan Kehadiran */}
          <div className="bg-white p-5 md:p-6 rounded-xl border border-gray-100 shadow-xs flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-emerald-500" />
                  <span>Proporsi Kehadiran Siswa</span>
                </h3>
                <p className="text-[11px] text-gray-400 font-medium">Rekap semester berjalan</p>
              </div>
              <Link href="/admin/attendance" className="text-[11px] font-bold text-[#531FFF] hover:underline flex items-center gap-0.5">
                Detail <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="h-[180px] w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attendanceComputed.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {attendanceComputed.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(val: any) => [`${val} Hari`, 'Total']} />
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-gray-900">{attendanceComputed.percentage}%</span>
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Hadir</span>
              </div>
            </div>

            {/* Breakdown Legend */}
            <div className="space-y-1.5 pt-2 border-t border-gray-100">
              {attendanceComputed.pieData.map(item => (
                <div key={item.name} className="flex items-center justify-between text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-700 font-bold">{item.name}</span>
                  </div>
                  <span className="font-extrabold text-gray-800">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Nilai & Evaluasi Terbaru */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-5 md:p-6 space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900">Nilai & Evaluasi Terbaru</h3>
                  <p className="text-[11px] text-gray-400 font-medium">Hasil tugas & ujian terakhir</p>
                </div>
              </div>
              <Link href="/admin/grades" className="text-[11px] font-bold text-[#531FFF] hover:underline flex items-center gap-0.5">
                Lihat Nilai <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {gradesComputed.recentEvaluations.map((evalItem, i) => (
                <div key={i} className="p-3 bg-gray-50/80 hover:bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-between transition-all">
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">{evalItem.subject}</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">{evalItem.type} · {evalItem.date}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-[#531FFF]">{evalItem.score}</div>
                    <span className={cn(
                      "text-[9px] font-extrabold px-1.5 py-0.5 rounded border inline-block mt-0.5",
                      evalItem.score >= 75 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                        : "bg-red-50 text-red-600 border-red-200"
                    )}>
                      {evalItem.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 4: Pengumuman Sekolah */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-5 md:p-6 space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#531FFF] flex items-center justify-center">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900">Pengumuman Sekolah</h3>
                  <p className="text-[11px] text-gray-400 font-medium">Informasi resmi sekolah</p>
                </div>
              </div>
              <Link href="/admin/announcements" className="text-[11px] font-bold text-[#531FFF] hover:underline flex items-center gap-0.5">
                Semua <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-3">
              {recentAnnouncements.map((ann, i) => (
                <div key={ann.id || i} className="p-3 bg-gray-50/70 border border-gray-100 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[9px] font-extrabold tracking-wide uppercase",
                      ann.tag === "PENTING" ? "bg-red-100 text-red-700" : "bg-purple-100 text-purple-800"
                    )}>
                      {ann.tag || "INFORMASI"}
                    </span>
                    <span className="text-[10px] text-gray-400 font-semibold">{ann.date || "Terbaru"}</span>
                  </div>
                  <h4 className="text-xs font-bold text-gray-900 leading-snug">{ann.title}</h4>
                  <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">{ann.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Academic Shortcuts */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4 grid grid-cols-2 gap-2 text-center text-xs font-bold">
            <Link href="/admin/schedule" className="p-3 bg-gray-50 hover:bg-purple-50 border border-gray-100 hover:border-purple-200 rounded-lg text-[#531FFF] transition-all flex items-center justify-center gap-2 shadow-2xs">
              <Calendar className="w-4 h-4" /> Jadwal Pelajaran
            </Link>
            <Link href="/admin/exams" className="p-3 bg-gray-50 hover:bg-purple-50 border border-gray-100 hover:border-purple-200 rounded-lg text-[#531FFF] transition-all flex items-center justify-center gap-2 shadow-2xs">
              <CalendarRange className="w-4 h-4" /> Jadwal Ujian
            </Link>
            <Link href="/admin/grades" className="p-3 bg-gray-50 hover:bg-purple-50 border border-gray-100 hover:border-purple-200 rounded-lg text-[#531FFF] transition-all flex items-center justify-center gap-2 shadow-2xs">
              <Award className="w-4 h-4" /> Nilai Siswa
            </Link>
            <Link href="/admin/report-cards" className="p-3 bg-gray-50 hover:bg-purple-50 border border-gray-100 hover:border-purple-200 rounded-lg text-[#531FFF] transition-all flex items-center justify-center gap-2 shadow-2xs">
              <FileText className="w-4 h-4" /> Rapor Digital
            </Link>
          </div>

        </div>

      </div>

    </div>
  );
}

export default function DashboardPage() {
  const [userName, setUserName] = useState("Adiratna");
  const [userRole, setUserRole] = useState<string>("admin");
  const [previewRole, setPreviewRole] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("Selamat pagi");
  const [academicYear, setAcademicYear] = useState("2026 / 2027");
  const [currentDate, setCurrentDate] = useState("");
  const [currentDay, setCurrentDay] = useState("");

  useEffect(() => {
    const updateGreeting = () => {
      const now = new Date();
      const currentHour = (now.getUTCHours() + 7) % 24; // WIB (UTC+7)
      
      if (currentHour >= 5 && currentHour < 12) {
        setGreeting("Selamat pagi");
      } else if (currentHour >= 12 && currentHour < 15) {
        setGreeting("Selamat siang");
      } else if (currentHour >= 15 && currentHour < 18) {
        setGreeting("Selamat sore");
      } else {
        setGreeting("Selamat malam");
      }

      const year = now.getFullYear();
      const month = now.getMonth();
      const startYear = month >= 6 ? year : year - 1;
      setAcademicYear(`${startYear} / ${startYear + 1}`);

      const dateFormatter = new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      setCurrentDate(dateFormatter.format(now));

      const dayFormatter = new Intl.DateTimeFormat('id-ID', {
        weekday: 'long'
      });
      setCurrentDay(dayFormatter.format(now));
    };
    
    updateGreeting();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.name || data.fullName) setUserName(data.fullName || data.name);
            else setUserName(user.displayName || user.email?.split('@')[0] || "User");

            const rawRole = (data.role || "admin").toLowerCase();
            const role = (rawRole === "student" || rawRole === "siswa") 
              ? "siswa" 
              : (rawRole === "teacher" || rawRole === "guru")
                ? "guru"
                : rawRole;
            setUserRole(role);
          } else {
            setUserName(user.displayName || user.email?.split('@')[0] || "User");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUserName(user.displayName || user.email?.split('@')[0] || "User");
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const activeRole = previewRole || userRole;

  if (activeRole === "siswa") {
    return (
      <StudentDashboardView 
        userName={userName}
        greeting={greeting}
        academicYear={academicYear}
        currentDate={currentDate}
        currentDay={currentDay}
      />
    );
  }

  if (activeRole === "guru" || activeRole === "teacher") {
    return (
      <div className="relative">
        {previewRole && (
          <div className="bg-amber-500 text-white px-6 py-2.5 text-xs font-bold flex items-center justify-between shadow-sm sticky top-0 z-30">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>Pratinjau Guru: Anda sedang melihat Dashboard sebagai <strong>Guru Pengajar</strong>.</span>
            </div>
            <button
              onClick={() => setPreviewRole(null)}
              className="px-3 py-1 bg-white text-amber-900 rounded-md text-xs font-black hover:bg-amber-100 transition-colors cursor-pointer"
            >
              Kembali ke Mode Asli ({userRole})
            </button>
          </div>
        )}
        <TeacherDashboardView 
          userName={userName}
          greeting={greeting}
          academicYear={academicYear}
          currentDate={currentDate}
          currentDay={currentDay}
        />
      </div>
    );
  }

  return (
    <div className="p-8 pb-12 max-w-[1600px] mx-auto w-full h-full space-y-6">
      
      {/* Top Banner */}
      <div className="relative rounded-xl overflow-hidden bg-gradient-to-r from-[#4E54C8] to-[#8F94FB] p-8 text-white shadow-md flex justify-between items-center">
        <div className="z-10 relative space-y-6 flex-1">
          <div>
            <h1 className="text-[32px] font-bold tracking-tight mb-2 flex items-center gap-2">
              {greeting}, {userName}! <span>👋</span>
            </h1>
            <p className="text-white/80 text-[15px]">Kelola sekolah dengan lebih mudah hari ini.</p>
          </div>
          
          <div className="flex gap-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-white/80 font-medium">Tahun Ajaran</span>
                <span className="text-lg font-bold">{academicYear}</span>
              </div>
            </div>

            <div className="w-px h-10 bg-white/20"></div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <CalendarCheck className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-white/80 font-medium">Hari ini</span>
                <span className="text-lg font-bold">{currentDate || "Memuat..."}</span>
                <span className="text-[11px] text-white/80 mt-[-2px]">{currentDay}</span>
              </div>
            </div>

            <div className="w-px h-10 bg-white/20"></div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Clock3 className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-white/80 font-medium">Tingkat Kehadiran</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">95,4%</span>
                  <span className="text-[10px] bg-emerald-500/80 px-1.5 py-0.5 rounded-full flex items-center text-white font-bold backdrop-blur-sm border border-emerald-400">
                    <ArrowUp className="w-2.5 h-2.5 mr-0.5" /> 1.2%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Action Buttons & Illustration area */}
        <div className="z-10 relative flex flex-col items-end gap-2.5 min-w-[200px]">
          {(userRole === "admin" || userRole === "super-admin" || userRole === "superadmin") && (
            <button
              onClick={() => setPreviewRole("guru")}
              className="w-full flex items-center justify-center gap-2 bg-amber-400/90 hover:bg-amber-400 text-amber-950 px-4 py-2.5 rounded-lg text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <GraduationCap className="w-4 h-4" />
              Pratinjau Dashboard Guru
            </button>
          )}
          {userRole !== "siswa" && (
            <button className="w-full flex items-center justify-center gap-2 bg-white text-[#4E54C8] hover:bg-gray-50 px-5 py-3 rounded-lg text-sm font-bold transition-colors shadow-sm">
              <BarChart2 className="w-4 h-4" />
              Generate Report
            </button>
          )}
          <button className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-5 py-3 rounded-lg text-sm font-bold transition-all backdrop-blur-sm">
            <Calendar className="w-4 h-4" />
            Lihat Kalender
          </button>
        </div>
        
        {/* Background Building Illustration Placeholder */}
        <div className="absolute right-[25%] bottom-0 h-[100px] w-[300px] pointer-events-none opacity-60">
            {/* Simple CSS shapes imitating buildings since we don't have the exact image */}
            <div className="absolute bottom-0 left-10 w-20 h-28 bg-[#A8B2FF] rounded-t-lg"></div>
            <div className="absolute bottom-0 left-28 w-32 h-36 bg-[#E2E8FF] rounded-t-lg">
              {/* Clock */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white flex items-center justify-center">
                <div className="w-1 h-3 bg-gray-300 rounded-full origin-bottom rotate-45 transform translate-y-[-2px]"></div>
              </div>
            </div>
            <div className="absolute bottom-0 left-56 w-24 h-24 bg-[#B8C2FF] rounded-t-lg"></div>
            {/* Base platform */}
            <div className="absolute bottom-0 left-0 w-full h-2 bg-[#CBD5E1]"></div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Total Siswa */}
        <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] relative overflow-hidden flex flex-col justify-between h-[130px]">
          <div className="flex gap-4 z-10">
            <div className="w-10 h-10 rounded-full bg-[#531FFF]/10 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 text-[#531FFF]" />
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-gray-500 mb-0.5">Total Siswa</p>
              <div className="flex items-end gap-2 justify-between w-full">
                <span className="text-[28px] leading-none font-bold text-gray-900 tracking-tight">2.456</span>
                <div className="flex flex-col items-end gap-0.5 mb-1">
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded flex items-center gap-0.5">
                    <ArrowUp className="w-2.5 h-2.5" /> 12
                  </span>
                  <span className="text-[8px] text-gray-400">dari bulan lalu</span>
                </div>
              </div>
            </div>
          </div>
          {/* Subtle line chart graphic bottom */}
          <svg className="absolute bottom-0 left-0 w-full h-8 opacity-20" viewBox="0 0 100 20" preserveAspectRatio="none">
             <path d="M0,20 L10,15 L30,18 L50,8 L70,12 L90,2 L100,2 L100,20 Z" fill="url(#grad1)" />
             <polyline points="0,15 10,15 30,18 50,8 70,12 90,2 100,2" fill="none" stroke="#531FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
             <defs>
               <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
                 <stop offset="0%" stopColor="#531FFF" stopOpacity="0.5" />
                 <stop offset="100%" stopColor="#531FFF" stopOpacity="0" />
               </linearGradient>
             </defs>
          </svg>
        </div>

        {/* Total Guru */}
        <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] relative overflow-hidden flex flex-col justify-between h-[130px]">
          <div className="flex gap-4 z-10">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-gray-500 mb-0.5">Total Guru</p>
              <div className="flex items-end gap-2 justify-between w-full">
                <span className="text-[28px] leading-none font-bold text-gray-900 tracking-tight">156</span>
                <div className="flex flex-col items-end gap-0.5 mb-1">
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded flex items-center gap-0.5">
                    <ArrowUp className="w-2.5 h-2.5" /> 4
                  </span>
                  <span className="text-[8px] text-gray-400">dari bulan lalu</span>
                </div>
              </div>
            </div>
          </div>
          <svg className="absolute bottom-0 left-0 w-full h-8 opacity-20" viewBox="0 0 100 20" preserveAspectRatio="none">
             <path d="M0,20 L15,10 L35,16 L55,5 L75,10 L100,2 L100,20 Z" fill="url(#grad2)" />
             <polyline points="0,10 15,10 35,16 55,5 75,10 100,2" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
             <defs>
               <linearGradient id="grad2" x1="0%" y1="0%" x2="0%" y2="100%">
                 <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.5" />
                 <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
               </linearGradient>
             </defs>
          </svg>
        </div>

        {/* Total Kelas */}
        <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] relative overflow-hidden flex flex-col justify-between h-[130px]">
          <div className="flex gap-4 z-10">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M4 22H20C21.1 22 22 21.1 22 20V6C22 4.9 21.1 4 20 4H14L12 2H4C2.9 2 2 2.9 2 4V20C2 21.1 2.9 22 4 22Z" fill="#10B981" fillOpacity="0.8"/>
               </svg>
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-gray-500 mb-0.5">Total Kelas</p>
              <div className="flex items-end gap-2 justify-between w-full">
                <span className="text-[28px] leading-none font-bold text-gray-900 tracking-tight">64</span>
                <div className="flex flex-col items-end gap-0.5 mb-1">
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded flex items-center gap-0.5">
                    <ArrowUp className="w-2.5 h-2.5" /> 2
                  </span>
                  <span className="text-[8px] text-gray-400">dari bulan lalu</span>
                </div>
              </div>
            </div>
          </div>
          <svg className="absolute bottom-0 left-0 w-full h-8 opacity-20" viewBox="0 0 100 20" preserveAspectRatio="none">
             <path d="M0,20 L10,12 L30,15 L60,4 L80,9 L100,5 L100,20 Z" fill="url(#grad3)" />
             <polyline points="0,12 10,12 30,15 60,4 80,9 100,5" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
             <defs>
               <linearGradient id="grad3" x1="0%" y1="0%" x2="0%" y2="100%">
                 <stop offset="0%" stopColor="#10B981" stopOpacity="0.5" />
                 <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
               </linearGradient>
             </defs>
          </svg>
        </div>

        {/* Kehadiran Hari Ini */}
        <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] relative overflow-hidden flex flex-col justify-between h-[130px]">
          <div className="flex gap-4 z-10">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
              <CalendarCheck className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-gray-500 mb-0.5">Kehadiran Hari Ini</p>
              <div className="flex items-end gap-2 justify-between w-full">
                <span className="text-[28px] leading-none font-bold text-gray-900 tracking-tight">95,4%</span>
                <div className="flex flex-col items-end gap-0.5 mb-1">
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded flex items-center gap-0.5">
                    <ArrowUp className="w-2.5 h-2.5" /> 1.2%
                  </span>
                  <span className="text-[8px] text-gray-400">dari kemarin</span>
                </div>
              </div>
            </div>
          </div>
          <svg className="absolute bottom-0 left-0 w-full h-8 opacity-20" viewBox="0 0 100 20" preserveAspectRatio="none">
             <path d="M0,20 L20,15 L40,8 L70,12 L90,2 L100,4 L100,20 Z" fill="url(#grad4)" />
             <polyline points="0,15 20,15 40,8 70,12 90,2 100,4" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
             <defs>
               <linearGradient id="grad4" x1="0%" y1="0%" x2="0%" y2="100%">
                 <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.5" />
                 <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
               </linearGradient>
             </defs>
          </svg>
        </div>

        {/* Pendapatan */}
        <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] relative overflow-hidden flex flex-col justify-between h-[130px]">
          <div className="flex gap-4 z-10">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-gray-500 mb-0.5 whitespace-nowrap">Pendapatan Bulan Ini</p>
              <div className="flex items-end gap-2 justify-between w-full">
                <span className="text-[20px] leading-none font-bold text-gray-900 tracking-tight pb-0.5">Rp 125M</span>
                <div className="flex flex-col items-end gap-0.5 mb-1">
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded flex items-center gap-0.5">
                    <ArrowUp className="w-2.5 h-2.5" /> 8.4%
                  </span>
                  <span className="text-[8px] text-gray-400">dari bulan lalu</span>
                </div>
              </div>
            </div>
          </div>
          <svg className="absolute bottom-0 left-0 w-full h-8 opacity-20" viewBox="0 0 100 20" preserveAspectRatio="none">
             <path d="M0,20 L15,10 L30,12 L50,4 L80,10 L100,2 L100,20 Z" fill="url(#grad5)" />
             <polyline points="0,10 15,10 30,12 50,4 80,10 100,2" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
             <defs>
               <linearGradient id="grad5" x1="0%" y1="0%" x2="0%" y2="100%">
                 <stop offset="0%" stopColor="#EF4444" stopOpacity="0.5" />
                 <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
               </linearGradient>
             </defs>
          </svg>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Area Chart Kehadiran */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-[16px] text-gray-900">Analitik Kehadiran</h2>
            <button className="flex items-center gap-2 text-[11px] font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-md shadow-sm">
              7 Hari Terakhir
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
          <div className="flex flex-1 gap-6">
             {/* Chart */}
             <div className="flex-1 min-w-0 pr-2 mt-4">
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={ATTENDANCE_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                   <XAxis 
                     dataKey="date" 
                     axisLine={false} 
                     tickLine={false} 
                     tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 500 }} 
                     dy={10} 
                   />
                   <YAxis 
                     axisLine={false} 
                     tickLine={false} 
                     tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 500 }} 
                     ticks={[0, 25, 50, 75, 100]}
                     domain={[0, 100]}
                     tickFormatter={(val) => `${val}%`}
                   />
                   <RechartsTooltip 
                      cursor={{ stroke: '#531FFF', strokeWidth: 1, strokeDasharray: '3 3' }}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100 min-w-[120px]">
                              <p className="text-[11px] text-gray-500 mb-1 font-medium">{label}</p>
                              <p className="font-bold text-gray-900 text-sm">
                                Kehadiran: <span className="text-[#531FFF]">{payload[0].value}%</span>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                   />
                   <Line 
                     type="monotone" 
                     dataKey="value" 
                     stroke="#531FFF" 
                     strokeWidth={3} 
                     dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#531FFF' }} 
                     activeDot={{ r: 6, strokeWidth: 0, fill: '#531FFF' }}
                   />
                 </LineChart>
               </ResponsiveContainer>
             </div>
             
             {/* Legend Stats */}
             <div className="w-[150px] flex flex-col justify-center gap-4 shrink-0">
               <div className="bg-white border border-emerald-100/60 rounded-lg p-4 shadow-sm shadow-emerald-50">
                 <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center gap-1.5">
                     <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                       <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                     </div>
                     <span className="text-[12px] font-bold text-gray-600">Hadir</span>
                   </div>
                 </div>
                 <div className="flex items-baseline justify-between mt-1">
                    <span className="text-[18px] font-bold text-gray-900">2.312</span>
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">90,2%</span>
                 </div>
               </div>
               
               <div className="bg-white border border-amber-100/60 rounded-lg p-4 shadow-sm shadow-amber-50">
                 <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center gap-1.5">
                     <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                       <Clock className="w-3.5 h-3.5 text-amber-600" />
                     </div>
                     <span className="text-[12px] font-bold text-gray-600">Terlambat</span>
                   </div>
                 </div>
                 <div className="flex items-baseline justify-between mt-1">
                    <span className="text-[18px] font-bold text-gray-900">86</span>
                    <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">3,4%</span>
                 </div>
               </div>

               <div className="bg-white border border-red-100/60 rounded-lg p-4 shadow-sm shadow-red-50">
                 <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center gap-1.5">
                     <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                       <span className="text-[12px]">🚫</span>
                     </div>
                     <span className="text-[12px] font-bold text-gray-600">Tidak Hadir</span>
                   </div>
                 </div>
                 <div className="flex items-baseline justify-between mt-1">
                    <span className="text-[18px] font-bold text-gray-900">58</span>
                    <span className="text-[11px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">2,4%</span>
                 </div>
               </div>
             </div>
          </div>
        </div>

        {/* Performa Akademik chart */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] h-[400px] flex flex-col">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-[16px] text-gray-900">Performa Akademik</h2>
            <button className="flex items-center gap-2 text-[11px] font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-md shadow-sm">
              Semester Genap
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
          
          <div className="flex flex-1 mt-6 gap-6">
            <div className="flex-1 flex flex-col pr-2">
               
               <div>
                 <p className="text-[12px] font-medium text-gray-500 mb-1">Rata-rata Nilai</p>
                 <div className="flex items-baseline gap-1">
                   <span className="text-[32px] font-bold text-gray-900 tracking-tight">3,68</span>
                   <span className="text-[12px] font-medium text-gray-400 font-mono">/ 4,00</span>
                 </div>
                 <div className="inline-flex mt-1 items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-1 rounded text-[11px] font-bold">
                   <ArrowUp className="w-3 h-3" /> 0.12 <span className="font-medium text-gray-500 ml-1">dari semester lalu</span>
                 </div>
               </div>

               <div className="flex-1 flex items-center justify-center mt-4 min-h-[180px]">
                 <div className="w-[180px] h-[180px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={DISTRIBUTION_DATA}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        cornerRadius={8}
                      >
                        {DISTRIBUTION_DATA.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-12 h-12 bg-[#531FFF] rounded-full flex items-center justify-center shadow-lg shadow-[#531FFF]/20">
                       <GraduationCap className="w-6 h-6 text-white" />
                     </div>
                  </div>
                 </div>
               </div>
            </div>

            <div className="w-[45%] flex flex-col justify-between pb-1">
               <div>
                 <p className="text-[13px] font-semibold text-gray-900 mb-4">Kelas Terbaik</p>
                 <div className="space-y-4">
                   <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                     <div className="flex items-center gap-2.5">
                       <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 xl:w-6 xl:h-6 xl:rounded-full text-[11px] font-bold flex items-center justify-center">1</span>
                       <span className="text-[13px] font-bold text-gray-900">X IPA 1</span>
                     </div>
                     <span className="text-[13px] font-bold text-gray-900">3,92</span>
                   </div>
                   <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                     <div className="flex items-center gap-2.5">
                       <span className="w-6 h-6 rounded-full bg-gray-50 text-gray-500 xl:w-6 xl:h-6 xl:rounded-full text-[11px] font-bold flex items-center justify-center">2</span>
                       <span className="text-[13px] font-semibold text-gray-700">XI IPA 2</span>
                     </div>
                     <span className="text-[13px] font-bold text-gray-900">3,78</span>
                   </div>
                   <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                     <div className="flex items-center gap-2.5">
                       <span className="w-6 h-6 rounded-full bg-gray-50 text-gray-500 xl:w-6 xl:h-6 xl:rounded-full text-[11px] font-bold flex items-center justify-center">3</span>
                       <span className="text-[13px] font-semibold text-gray-700">XII IPA 1</span>
                     </div>
                     <span className="text-[13px] font-bold text-gray-900">3,74</span>
                   </div>
                 </div>
               </div>

               <div className="mt-6 bg-red-50/50 rounded-lg p-3.5 flex gap-3 border border-red-100 items-center shrink-0">
                 <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                   <Users className="w-5 h-5 text-red-600" />
                 </div>
                 <div className="flex-1 min-w-0">
                   <div className="flex items-baseline justify-between mb-0.5">
                     <p className="text-[11px] font-medium text-gray-600 truncate mr-2">Siswa Perlu Perhatian</p>
                     <p className="text-[13px] font-bold text-red-600 shrink-0">12 Siswa</p>
                   </div>
                   <p className="text-[10px] text-gray-500 leading-tight">Perlu bimbingan lebih lanjut</p>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Cards Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        
        {/* Jadwal Hari Ini */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] flex flex-col h-[280px]">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-[14px] text-gray-900">Jadwal Hari Ini</h2>
            <button className="text-[11px] font-semibold text-[#531FFF] hover:underline">Lihat Semua</button>
          </div>
          <div className="space-y-4 overflow-y-auto pr-2 scrollbar-thin flex-1">
            <div className="flex items-start gap-3 relative pb-4">
              <div className="absolute left-5 top-8 bottom-0 w-px bg-gray-100"></div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 relative z-10 border-[3px] border-white shadow-sm">
                <FileText className="w-4 h-4" />
              </div>
              <div className="w-full">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[10px] font-bold text-gray-500">08:00 - 09:30</span>
                </div>
                <h3 className="font-bold text-[12px] text-gray-900">Matematika</h3>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-[10px] text-gray-500">Kelas X IPA 1</p>
                  <span className="px-1.5 py-0.5 bg-blue-50 text-[#531FFF] rounded text-[9px] font-bold">Ruang 201</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3 relative pb-4">
              <div className="absolute left-5 top-8 bottom-0 w-px bg-gray-100"></div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center shrink-0 relative z-10 border-[3px] border-white shadow-sm">
                <Shield className="w-4 h-4" />
              </div>
              <div className="w-full">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[10px] font-bold text-gray-500">10:00 - 11:30</span>
                </div>
                <h3 className="font-bold text-[12px] text-gray-900">Fisika</h3>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-[10px] text-gray-500">Kelas X IPA 2</p>
                  <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[9px] font-bold">Ruang 203</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 relative">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 relative z-10 border-[3px] border-white shadow-sm">
                <Droplet className="w-4 h-4" />
              </div>
              <div className="w-full">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[10px] font-bold text-gray-500">13:00 - 14:30</span>
                </div>
                <h3 className="font-bold text-[12px] text-gray-900">Kimia</h3>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-[10px] text-gray-500">Kelas XI IPA 1</p>
                  <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-bold">Ruang 205</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pengumuman Terbaru */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] flex flex-col h-[280px]">
           <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-[14px] text-gray-900">Pengumuman Terbaru</h2>
            <button className="text-[11px] font-semibold text-[#531FFF] hover:underline">Lihat Semua</button>
          </div>
          <div className="space-y-2 flex-1 overflow-y-auto pr-1 scrollbar-thin">
            <div className="flex gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
              <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center shrink-0 text-red-500">
                <Megaphone className="w-4 h-4 ml-[-2px] mt-[-2px]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between items-start mb-0.5">
                  <h3 className="font-bold text-[11px] text-gray-900 truncate pr-2">Ujian Tengah Semester</h3>
                  <span className="text-[9px] font-medium text-gray-400 shrink-0">20 Mei 2026</span>
                </div>
                <p className="text-[10px] text-gray-500 line-clamp-1">Ujian akan dilaksanakan pada 1 - 7 Juni 2026</p>
              </div>
            </div>

            <div className="flex gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
              <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center shrink-0 text-amber-500">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between items-start mb-0.5">
                  <h3 className="font-bold text-[11px] text-gray-900 truncate pr-2">Libur Kenaikan Isa Al Masih</h3>
                  <span className="text-[9px] font-medium text-gray-400 shrink-0">18 Mei 2026</span>
                </div>
                <p className="text-[10px] text-gray-500 line-clamp-1">Sekolah libur pada 29 Mei 2026</p>
              </div>
            </div>

            <div className="flex gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
              <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-600">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between items-start mb-0.5">
                  <h3 className="font-bold text-[11px] text-gray-900 truncate pr-2">Rapor Semester Genap</h3>
                  <span className="text-[9px] font-medium text-gray-400 shrink-0">16 Mei 2026</span>
                </div>
                <p className="text-[10px] text-gray-500 line-clamp-1">Rapor akan dibagikan pada 20 Juni 2026</p>
              </div>
            </div>
          </div>
        </div>

        {/* Ringkasan Keuangan */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] flex flex-col justify-between h-[280px]">
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-[14px] text-gray-900">Ringkasan Keuangan</h2>
              <button className="flex items-center gap-1 text-[10px] font-semibold text-gray-600 hover:text-gray-900 bg-gray-50 border border-gray-200 px-2 py-1 rounded">
                Bulan Ini
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-50/50 border border-emerald-100 flex items-center justify-center text-emerald-500">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-medium">Total Pemasukan</p>
                    <p className="text-[12px] font-bold text-gray-900">Rp 450.000.000</p>
                  </div>
                </div>
                <span className="text-[9px] font-bold text-emerald-600 flex items-center"><ArrowUp className="w-2.5 h-2.5 mr-0.5" /> 12.6%</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-red-50/50 border border-red-100 flex items-center justify-center text-red-500">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-medium">Total Tertunggak</p>
                    <p className="text-[12px] font-bold text-gray-900">Rp 35.000.000</p>
                  </div>
                </div>
                <span className="text-[9px] font-bold text-amber-500 flex items-center"><ArrowUp className="w-2.5 h-2.5 mr-0.5" /> 5.2%</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-rose-50/50 border border-rose-100 flex items-center justify-center text-rose-500">
                    <Clock3 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-medium">Total Terlambat</p>
                    <p className="text-[12px] font-bold text-gray-900">Rp 12.000.000</p>
                  </div>
                </div>
                <span className="text-[9px] font-bold text-rose-500 flex items-center"><ArrowUp className="w-2.5 h-2.5 mr-0.5" /> 3.1%</span>
              </div>
            </div>
          </div>
          
          <button className="text-[11px] font-semibold text-[#531FFF] hover:underline text-right mt-2 flex items-center justify-end gap-1">
            Lihat Laporan Keuangan <span className="text-[9px]">→</span>
          </button>
        </div>

        {/* AI Insight */}
        <div className="bg-[#F8F7FF] p-5 rounded-xl border border-[#531FFF]/10 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] flex flex-col h-[280px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[14px] text-gray-900 flex items-center gap-1.5">
              AI Insight
              <Sparkles className="w-3.5 h-3.5 text-[#531FFF]" />
            </h2>
            <div className="w-6 h-6 rounded bg-[#531FFF]/10 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-[#531FFF]" />
            </div>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto scrollbar-thin">
            <div className="flex gap-2.5">
              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                 <ArrowUp className="w-3 h-3 text-emerald-600" />
              </div>
              <p className="text-[11px] text-gray-700 leading-snug">
                Tingkat kehadiran meningkat <span className="font-bold text-gray-900">5%</span> dibandingkan minggu lalu.
              </p>
            </div>

            <div className="flex gap-2.5">
              <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                 <AlertTriangle className="w-3 h-3 text-amber-600" />
              </div>
              <p className="text-[11px] text-gray-700 leading-snug">
                <span className="font-bold">12 siswa</span> menunjukkan penurunan performa akademik.
              </p>
            </div>

            <div className="flex gap-2.5">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                 <Star className="w-3 h-3 text-blue-600" />
              </div>
              <p className="text-[11px] text-gray-700 leading-snug">
                Kelas <span className="font-bold">XI IPA 2</span> adalah kelas dengan performa terbaik bulan ini.
              </p>
            </div>
          </div>

          <button className="text-[11px] font-bold text-[#531FFF] hover:underline text-center mt-2 flex items-center justify-center gap-1 pt-2 border-t border-[#531FFF]/10">
            Lihat Semua Insight <span className="text-[9px]">→</span>
          </button>
        </div>

      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        
        {/* Aktivitas Terbaru */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[14px] text-gray-900">Aktivitas Terbaru</h2>
            <button className="text-[11px] font-semibold text-[#531FFF] hover:underline">Lihat Semua</button>
          </div>
          
          <div className="grid grid-cols-4 gap-3">
            
            <div className="flex gap-2.5 items-center">
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden">
                  <Image src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=150&auto=format&fit=crop" width={36} height={36} alt="User" unoptimized />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-[1.5px] border-white rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-2 h-2 text-white" />
                </div>
              </div>
              <div className="min-w-0">
                <h3 className="text-[11px] font-bold text-gray-900 truncate">Aidan Pratama</h3>
                <p className="text-[10px] text-gray-500 truncate">Check in pukul 07:01</p>
                <p className="text-[9px] text-gray-400 mt-0.5">2 menit yang lalu</p>
              </div>
            </div>

            <div className="flex gap-2.5 items-center">
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden">
                  <Image src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop" width={36} height={36} alt="User" unoptimized />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-blue-500 border-[1.5px] border-white rounded-full flex items-center justify-center">
                  <FileText className="w-2 h-2 text-white" />
                </div>
              </div>
              <div className="min-w-0">
                <h3 className="text-[11px] font-bold text-gray-900 truncate">Maya Putri</h3>
                <p className="text-[10px] text-gray-500 truncate">Mengumpulkan tugas</p>
                <p className="text-[9px] text-gray-400 mt-0.5">15 menit yang lalu</p>
              </div>
            </div>

            <div className="flex gap-2.5 items-center">
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden">
                  <Image src="https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=150&auto=format&fit=crop" width={36} height={36} alt="User" unoptimized />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-[1.5px] border-white rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-2 h-2 text-white" />
                </div>
              </div>
              <div className="min-w-0">
                <h3 className="text-[11px] font-bold text-gray-900 truncate">Rizky Akbar</h3>
                <p className="text-[10px] text-gray-500 truncate">Kehadiran disetujui</p>
                <p className="text-[9px] text-gray-400 mt-0.5">1 jam yang lalu</p>
              </div>
            </div>

            <div className="flex gap-2.5 items-center">
               <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden">
                  <Image src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150&auto=format&fit=crop" width={36} height={36} alt="User" unoptimized />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-rose-500 border-[1.5px] border-white rounded-full flex items-center justify-center">
                  <span className="text-white text-[6px] font-bold mt-px">PDF</span>
                </div>
              </div>
              <div className="min-w-0">
                <h3 className="text-[11px] font-bold text-gray-900 truncate">Bu Santi</h3>
                <p className="text-[10px] text-gray-500 truncate">Mengunggah materi</p>
                <p className="text-[9px] text-gray-400 mt-0.5">2 jam yang lalu</p>
              </div>
            </div>

          </div>
        </div>

        {/* Quick Access */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)]">
           <h2 className="font-bold text-[14px] text-gray-900 mb-4">Quick Access</h2>
           
           <div className="grid grid-cols-3 gap-y-4 gap-x-2">
             <div className="flex flex-col items-center gap-1.5 cursor-pointer group">
               <div className="w-10 h-10 rounded-lg bg-gray-50 group-hover:bg-[#531FFF]/5 flex items-center justify-center transition-colors shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] border border-gray-100/50">
                 <UserCheck className="w-4 h-4 text-[#531FFF]" />
               </div>
               <span className="text-[9px] font-bold text-gray-600 text-center">Tambah Siswa</span>
             </div>

             <div className="flex flex-col items-center gap-1.5 cursor-pointer group">
               <div className="w-10 h-10 rounded-lg bg-gray-50 group-hover:bg-emerald-50 flex items-center justify-center transition-colors shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] border border-gray-100/50">
                 <CalendarCheck className="w-4 h-4 text-emerald-500" />
               </div>
               <span className="text-[9px] font-bold text-gray-600 text-center">Absensi</span>
             </div>

             <div className="flex flex-col items-center gap-1.5 cursor-pointer group">
               <div className="w-10 h-10 rounded-lg bg-gray-50 group-hover:bg-amber-50 flex items-center justify-center transition-colors shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] border border-gray-100/50">
                 <FileText className="w-4 h-4 text-amber-500" />
               </div>
               <span className="text-[9px] font-bold text-gray-600 text-center">Penilaian</span>
             </div>

             <div className="flex flex-col items-center gap-1.5 cursor-pointer group">
               <div className="w-10 h-10 rounded-lg bg-gray-50 group-hover:bg-red-50 flex items-center justify-center transition-colors shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] border border-gray-100/50">
                 <Megaphone className="w-4 h-4 text-red-500" />
               </div>
               <span className="text-[9px] font-bold text-gray-600 text-center">Pengumuman</span>
             </div>

             <div className="flex flex-col items-center gap-1.5 cursor-pointer group">
               <div className="w-10 h-10 rounded-lg bg-gray-50 group-hover:bg-blue-50 flex items-center justify-center transition-colors shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] border border-gray-100/50">
                 <BarChart2 className="w-4 h-4 text-blue-500" />
               </div>
               <span className="text-[9px] font-bold text-gray-600 text-center">Laporan</span>
             </div>

             <div className="flex flex-col items-center gap-1.5 cursor-pointer group">
               <div className="w-10 h-10 rounded-lg bg-gray-50 group-hover:bg-gray-100 flex items-center justify-center transition-colors shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] border border-gray-100/50">
                 <Settings className="w-4 h-4 text-gray-500" />
               </div>
               <span className="text-[9px] font-bold text-gray-600 text-center">Pengaturan</span>
             </div>
           </div>
        </div>

      </div>
    </div>
  );
}
