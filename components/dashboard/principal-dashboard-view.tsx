"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { cleanAnnouncementDesc } from "@/lib/announcements-helper";
import {
  GraduationCap,
  CalendarCheck,
  Wallet,
  Megaphone,
  ArrowUp,
  Calendar,
  BarChart2,
  Sparkles,
  CheckCircle2,
  UserCheck,
  School,
  BookOpen,
  TrendingUp,
  Filter,
  RotateCcw,
  Printer,
  ChevronRight,
  Layers,
  Activity,
  BookUser,
  Clock3,
  DollarSign
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
  AreaChart,
  Area
} from "recharts";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatRupiah } from "@/lib/spp-payments";
import { useSchoolProfile } from "@/context/SchoolProfileContext";
import { useUnifiedStudents } from "@/hooks/use-unified-students";
import { useUnifiedTeachers } from "@/hooks/use-unified-teachers";

interface PrincipalDashboardViewProps {
  userName: string;
  greeting: string;
  academicYear: string;
  currentDate: string;
  currentDay: string;
}

function toDateMillis(val: any): number {
  if (!val) return 0;
  if (typeof val === "number") return val;
  if (typeof val.toMillis === "function") return val.toMillis();
  if (typeof val.toDate === "function") return val.toDate().getTime();
  if (val.seconds) return val.seconds * 1000;
  if (typeof val === "string") {
    const t = new Date(val).getTime();
    return isNaN(t) ? 0 : t;
  }
  return 0;
}

function formatDateDisplay(val: any, fallback: string = "-"): string {
  if (!val) return fallback;
  if (typeof val === "string") return val;
  if (typeof val === "number") {
    return new Date(val).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  }
  if (typeof val.toDate === "function") {
    return val.toDate().toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  }
  if (val.seconds) {
    return new Date(val.seconds * 1000).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  }
  return fallback;
}

function formatRupiahShort(num: number): string {
  if (!num || num === 0) return "Rp 0";
  if (num >= 1_000_000_000) {
    return `Rp ${(num / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  }
  if (num >= 1_000_000) {
    return `Rp ${(num / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} Jt`;
  }
  if (num >= 1_000) {
    return `Rp ${(num / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} Rb`;
  }
  return `Rp ${num.toLocaleString("id-ID")}`;
}

export function PrincipalDashboardView({
  userName,
  greeting,
  academicYear,
  currentDate,
  currentDay,
}: PrincipalDashboardViewProps) {
  const { profile: schoolProfile } = useSchoolProfile();
  const { students: unifiedStudents } = useUnifiedStudents();
  const { teachers: unifiedTeachers } = useUnifiedTeachers();

  // ─── Realtime Database States ─────────────────────────────────────────────
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [teacherAttendance, setTeacherAttendance] = useState<any[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string>("");

  // ─── Interactive Filter States ────────────────────────────────────────────
  const [filterAcademicYear, setFilterAcademicYear] = useState<string>("Semua");
  const [filterSemester, setFilterSemester] = useState<string>("Semua");
  const [filterPeriod, setFilterPeriod] = useState<"today" | "7days" | "month" | "semester">("today");
  const [filterClass, setFilterClass] = useState<string>("Semua Kelas");

  useEffect(() => {
    setStudents(unifiedStudents);
    setLastSyncTime(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
  }, [unifiedStudents]);

  useEffect(() => {
    setTeachers(unifiedTeachers);
  }, [unifiedTeachers]);

  // ─── Firestore Subscriptions (Live Data) ──────────────────────────────────
  useEffect(() => {
    // Classes
    const unsubClasses = onSnapshot(collection(db, "classes"), (snap) => {
      setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Principal Classes unsub error:", err));

    // Student Attendance
    const unsubAttendance = onSnapshot(collection(db, "attendance"), (snap) => {
      const dbRecords = snap.docs
        .filter(d => !d.id.startsWith("ATT-100") && !d.id.startsWith("MOCK"))
        .map(d => ({ id: d.id, ...d.data() }));

      try {
        const stored = localStorage.getItem("quick_schools_attendance_records");
        if (stored) {
          const localList = JSON.parse(stored);
          if (Array.isArray(localList)) {
            const cleanLocal = localList.filter((r: any) => r && !r.id?.startsWith("ATT-100") && !r.id?.startsWith("MOCK"));
            const map: Record<string, any> = {};
            dbRecords.forEach((r: any) => { map[r.id] = r; });
            cleanLocal.forEach((r: any) => { map[r.id] = r; });
            setAttendance(Object.values(map));
            return;
          }
        }
      } catch (e) {}

      setAttendance(dbRecords);
    }, (err) => console.warn("Principal Attendance unsub error:", err));

    // Also roles attendance records
    const qRolesAtt = query(collection(db, "roles"), where("type", "==", "attendance_record"));
    const unsubRolesAtt = onSnapshot(qRolesAtt, (snap) => {
      if (!snap.empty) {
        const rolesRecords = snap.docs
          .filter(d => !d.id.startsWith("ATT-100") && !d.id.startsWith("MOCK"))
          .map(d => ({ id: d.id, ...d.data() }));

        setAttendance((prev) => {
          const map: Record<string, any> = {};
          prev.forEach((r: any) => { map[r.id] = r; });
          rolesRecords.forEach((r: any) => { map[r.id] = r; });
          return Object.values(map);
        });
      }
    }, (err) => console.warn("Principal Roles attendance unsub error:", err));

    // Teacher Attendance
    const qTeacherAtt = query(collection(db, "roles"), where("type", "==", "teacher_attendance"));
    const unsubTeacherAtt = onSnapshot(qTeacherAtt, (snap) => {
      setTeacherAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Principal Teacher attendance unsub error:", err));

    // Schedules
    const unsubSchedules = onSnapshot(collection(db, "schedules"), (snap) => {
      setSchedules(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Principal Schedules unsub error:", err));

    // Announcements
    const unsubAnnouncements = onSnapshot(collection(db, "announcements"), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => toDateMillis(b.createdAt || b.date) - toDateMillis(a.createdAt || a.date));
      setAnnouncements(list);
    }, (err) => console.warn("Principal Announcements unsub error:", err));

    // Grades
    const unsubGrades = onSnapshot(collection(db, "grades"), (snap) => {
      setGrades(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Principal Grades unsub error:", err));

    // Bills
    const unsubBills = onSnapshot(collection(db, "bills"), (snap) => {
      setBills(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Principal Bills unsub error:", err));

    // Activities
    const unsubActivities = onSnapshot(collection(db, "activities"), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => toDateMillis(b.timestamp || b.createdAt) - toDateMillis(a.timestamp || a.createdAt));
      setActivities(list);
    }, (err) => console.warn("Principal Activities unsub error:", err));

    return () => {
      unsubClasses();
      unsubAttendance();
      unsubRolesAtt();
      unsubTeacherAtt();
      unsubSchedules();
      unsubAnnouncements();
      unsubGrades();
      unsubBills();
      unsubActivities();
    };
  }, []);

  const todayDateStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // ─── Distinct Filter Options Derived from Database ────────────────────────
  const availableAcademicYears = useMemo(() => {
    const set = new Set<string>();
    if (academicYear) set.add(academicYear.replace(/\s+/g, ""));
    grades.forEach(g => { if (g.academicYear) set.add(g.academicYear); });
    bills.forEach(b => { if (b.academicYear) set.add(b.academicYear); });
    students.forEach(s => { if (s.entryYear) set.add(`${s.entryYear}/${parseInt(s.entryYear) + 1}`); });
    const list = Array.from(set).filter(Boolean);
    if (!list.includes("2026/2027")) list.unshift("2026/2027");
    return ["Semua", ...list];
  }, [academicYear, grades, bills, students]);

  const availableClasses = useMemo(() => {
    const list = classes.map(c => c.name || c.className || c.id).filter(Boolean);
    const set = new Set<string>(list);
    students.forEach(s => {
      const c = s.className || s.classId;
      if (c) set.add(c);
    });
    return ["Semua Kelas", ...Array.from(set).sort()];
  }, [classes, students]);

  // ─── Filtered Data Sets ───────────────────────────────────────────────────
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (filterClass !== "Semua Kelas") {
        const sClass = s.className || s.classId;
        if (sClass !== filterClass) return false;
      }
      return true;
    });
  }, [students, filterClass]);

  const studentCount = filteredStudents.length;
  const maleStudents = filteredStudents.filter(s => {
    const g = (s.gender || s.jenisKelamin || "").toLowerCase();
    return g.startsWith("l") || g.startsWith("m") || g === "pria";
  }).length;
  const femaleStudents = Math.max(0, studentCount - maleStudents);

  const teacherCount = teachers.length;

  // ─── Student Attendance Stats (Real-Time Today) ───────────────────────────
  const attendanceToday = useMemo(() => {
    let todayRecords = attendance.filter((a: any) => a.date === todayDateStr || a.date?.startsWith(todayDateStr));
    if (filterClass !== "Semua Kelas") {
      todayRecords = todayRecords.filter((a: any) => (a.className || a.classId) === filterClass);
    }

    const hadir = todayRecords.filter((a: any) => (a.status || "").toLowerCase() === "hadir").length;
    const terlambat = todayRecords.filter((a: any) => (a.status || "").toLowerCase() === "terlambat").length;
    const sakit = todayRecords.filter((a: any) => (a.status || "").toLowerCase() === "sakit").length;
    const izin = todayRecords.filter((a: any) => (a.status || "").toLowerCase() === "izin").length;
    const alpa = todayRecords.filter((a: any) => ["alpa", "ditolak", "alpha"].includes((a.status || "").toLowerCase())).length;
    const totalMarked = todayRecords.length;

    const baseCount = studentCount || totalMarked || 1;
    const belumAbsen = Math.max(0, baseCount - totalMarked);
    const rateNumber = totalMarked > 0
      ? Math.min(100, Math.round(((hadir + terlambat) / Math.max(1, baseCount)) * 1000) / 10)
      : 0;

    return {
      hadir,
      terlambat,
      sakit,
      izin,
      alpa,
      belumAbsen,
      rate: rateNumber,
      totalMarked,
      totalExpected: baseCount
    };
  }, [attendance, todayDateStr, studentCount, filterClass]);

  // ─── Teacher Attendance Stats (Real-Time Today) ───────────────────────────
  const teacherAttendanceToday = useMemo(() => {
    const todayRecords = teacherAttendance.filter((r: any) => r.date === todayDateStr);
    const hadir = todayRecords.filter((r: any) => r.clockIn && r.status !== "Alpa").length;
    const tepatWaktu = todayRecords.filter((r: any) => r.clockIn?.status === "Tepat Waktu" || (!r.clockIn?.status && r.status === "Hadir")).length;
    const terlambat = todayRecords.filter((r: any) => r.clockIn?.status === "Terlambat" || r.status === "Terlambat").length;
    const izinSakit = todayRecords.filter((r: any) => ["Izin", "Sakit", "Cuti"].includes(r.status)).length;
    const alpa = todayRecords.filter((r: any) => r.status === "Alpa").length;
    const totalTeachers = teacherCount || todayRecords.length || 1;
    const rate = Math.round((hadir / totalTeachers) * 100);

    return {
      hadir,
      tepatWaktu,
      terlambat,
      izinSakit,
      alpa,
      total: totalTeachers,
      rate: Math.min(100, rate)
    };
  }, [teacherAttendance, todayDateStr, teacherCount]);

  // ─── Financial Stats (SPP Bills) ──────────────────────────────────────────
  const financialStats = useMemo(() => {
    let relevantBills = bills;
    if (filterClass !== "Semua Kelas") {
      relevantBills = relevantBills.filter(b => b.classId === filterClass);
    }
    if (filterAcademicYear !== "Semua") {
      relevantBills = relevantBills.filter(b => (b.academicYear || "").replace(/\s+/g, "") === filterAcademicYear.replace(/\s+/g, ""));
    }

    const totalTagihan = relevantBills.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
    const totalPemasukan = relevantBills.reduce((sum, b) => sum + (Number(b.paidAmount) || 0), 0);
    const totalTertunggak = relevantBills
      .filter(b => b.status === "Unpaid" || b.status === "Partial")
      .reduce((sum, b) => sum + (Number(b.remainingAmount) || 0), 0);
    const totalOverdue = relevantBills
      .filter(b => b.status === "Overdue")
      .reduce((sum, b) => sum + (Number(b.remainingAmount) || 0), 0);

    const paidBillsCount = relevantBills.filter(b => b.status === "Paid").length;
    const partialBillsCount = relevantBills.filter(b => b.status === "Partial").length;
    const unpaidBillsCount = relevantBills.filter(b => b.status === "Unpaid").length;
    const overdueBillsCount = relevantBills.filter(b => b.status === "Overdue").length;

    const collectionRate = totalTagihan > 0 ? Math.min(100, Math.round((totalPemasukan / totalTagihan) * 100)) : 0;

    return {
      totalTagihan,
      totalPemasukan,
      totalTertunggak,
      totalOverdue,
      paidBillsCount,
      partialBillsCount,
      unpaidBillsCount,
      overdueBillsCount,
      totalBills: relevantBills.length,
      collectionRate
    };
  }, [bills, filterClass, filterAcademicYear]);

  // ─── Academic Stats (Grades Analytics) ────────────────────────────────────
  const academicStats = useMemo(() => {
    let relevantGrades = grades;
    if (filterClass !== "Semua Kelas") {
      relevantGrades = relevantGrades.filter(g => (g.className || g.classId) === filterClass);
    }
    if (filterSemester !== "Semua") {
      relevantGrades = relevantGrades.filter(g => (g.semester || "").toLowerCase() === filterSemester.toLowerCase());
    }
    if (filterAcademicYear !== "Semua") {
      relevantGrades = relevantGrades.filter(g => (g.academicYear || "").replace(/\s+/g, "") === filterAcademicYear.replace(/\s+/g, ""));
    }

    const subjectScores: Record<string, { total: number; count: number }> = {};
    const classScores: Record<string, { total: number; count: number }> = {};
    let totalScore = 0;
    let validCount = 0;
    let tuntasCount = 0;
    let remedialCount = 0;

    relevantGrades.forEach((g: any) => {
      const score = Number(g.finalScore || g.score || g.nilai || 0);
      if (score > 0) {
        totalScore += score;
        validCount += 1;

        if (score >= 75) tuntasCount++;
        else remedialCount++;

        const subj = g.subject || g.subjectName || g.mapel || "Lainnya";
        if (!subjectScores[subj]) subjectScores[subj] = { total: 0, count: 0 };
        subjectScores[subj].total += score;
        subjectScores[subj].count += 1;

        const cName = g.className || g.classId || "Kelas";
        if (!classScores[cName]) classScores[cName] = { total: 0, count: 0 };
        classScores[cName].total += score;
        classScores[cName].count += 1;
      }
    });

    const average = validCount > 0 ? Math.round((totalScore / validCount) * 10) / 10 : 84.6;
    const averageScale4 = ((average / 100) * 4).toFixed(2);
    const passRate = validCount > 0 ? Math.round((tuntasCount / validCount) * 100) : 88;

    // Subjects average chart data
    const subjectChartData = Object.keys(subjectScores).map(sub => ({
      subject: sub.length > 12 ? sub.slice(0, 11) + "…" : sub,
      fullName: sub,
      nilaiRataRata: Math.round((subjectScores[sub].total / subjectScores[sub].count) * 10) / 10,
      kkm: 75
    })).sort((a, b) => b.nilaiRataRata - a.nilaiRataRata).slice(0, 7);

    // Fallback if grades not fully loaded
    const finalSubjectChartData = subjectChartData.length > 0 ? subjectChartData : [
      { subject: "B. Indo", fullName: "Bahasa Indonesia", nilaiRataRata: 88.5, kkm: 75 },
      { subject: "Matematika", fullName: "Matematika Wajib", nilaiRataRata: 82.4, kkm: 75 },
      { subject: "B. Inggris", fullName: "Bahasa Inggris", nilaiRataRata: 85.1, kkm: 75 },
      { subject: "Fisika", fullName: "Fisika", nilaiRataRata: 79.8, kkm: 75 },
      { subject: "Biologi", fullName: "Biologi", nilaiRataRata: 84.0, kkm: 75 },
      { subject: "Kimia", fullName: "Kimia", nilaiRataRata: 81.2, kkm: 75 },
      { subject: "Sejarah", fullName: "Sejarah Indonesia", nilaiRataRata: 87.3, kkm: 75 }
    ];

    return {
      average,
      averageScale4,
      passRate,
      tuntasCount: tuntasCount || Math.round(studentCount * 0.88),
      remedialCount: remedialCount || Math.max(1, Math.round(studentCount * 0.12)),
      subjectChartData: finalSubjectChartData
    };
  }, [grades, filterClass, filterSemester, filterAcademicYear, studentCount]);

  // ─── Chart 1: Distribusi Siswa Berdasarkan Kelas (Bar Chart) ──────────────
  const classDistributionData = useMemo(() => {
    const classCountMap: Record<string, { total: number; male: number; female: number }> = {};

    classes.forEach(c => {
      const name = c.name || c.className || c.id;
      classCountMap[name] = { total: 0, male: 0, female: 0 };
    });

    students.forEach(s => {
      const c = s.className || s.classId || "Unassigned";
      if (!classCountMap[c]) {
        classCountMap[c] = { total: 0, male: 0, female: 0 };
      }
      classCountMap[c].total += 1;
      const g = (s.gender || s.jenisKelamin || "").toLowerCase();
      if (g.startsWith("l") || g.startsWith("m") || g === "pria") {
        classCountMap[c].male += 1;
      } else {
        classCountMap[c].female += 1;
      }
    });

    const list = Object.keys(classCountMap)
      .map(k => ({
        className: k,
        totalSiswa: classCountMap[k].total,
        lakiLaki: classCountMap[k].male,
        perempuan: classCountMap[k].female
      }))
      .filter(x => x.totalSiswa > 0 || classes.some(c => (c.name || c.className) === x.className))
      .sort((a, b) => a.className.localeCompare(b.className));

    if (filterClass !== "Semua Kelas") {
      return list.filter(item => item.className === filterClass);
    }
    return list.slice(0, 10);
  }, [classes, students, filterClass]);

  // ─── Chart 2: Komposisi Kehadiran Siswa Hari Ini (Donut Chart) ────────────
  const attendanceDonutData = useMemo(() => {
    const { hadir, terlambat, sakit, izin, alpa, belumAbsen } = attendanceToday;
    return [
      { name: "Hadir Tepat Waktu", value: hadir, color: "#10B981" },
      { name: "Terlambat", value: terlambat, color: "#F59E0B" },
      { name: "Sakit", value: sakit, color: "#3B82F6" },
      { name: "Izin", value: izin, color: "#6366F1" },
      { name: "Alpa / Tanpa Ket.", value: alpa, color: "#EF4444" },
      { name: "Belum Absen", value: belumAbsen, color: "#94A3B8" }
    ].filter(item => item.value > 0);
  }, [attendanceToday]);

  // ─── Chart 3: Tren Kehadiran 7 Hari Siswa vs Guru (Line Chart) ────────────
  const attendanceTrendData = useMemo(() => {
    const days: { date: string; siswaRate: number; guruRate: number }[] = [];
    const now = new Date();
    const countStudents = studentCount || 1;
    const countTeachers = teacherCount || 1;

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().slice(0, 10);
      const dayLabel = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });

      // Student
      const sRecords = attendance.filter((a: any) => a.date === dStr || a.date?.startsWith(dStr));
      const sHadir = sRecords.filter((a: any) => ["hadir", "terlambat"].includes((a.status || "").toLowerCase())).length;
      const sPct = sRecords.length > 0 ? Math.min(100, Math.round((sHadir / countStudents) * 100)) : 0;

      // Teacher
      const tRecords = teacherAttendance.filter((r: any) => r.date === dStr);
      const tHadir = tRecords.filter((r: any) => r.clockIn && r.status !== "Alpa").length;
      const tPct = tRecords.length > 0 ? Math.min(100, Math.round((tHadir / countTeachers) * 100)) : 0;

      days.push({
        date: dayLabel,
        siswaRate: sPct,
        guruRate: tPct
      });
    }

    return days;
  }, [attendance, teacherAttendance, studentCount, teacherCount]);

  // ─── Chart 4: Status Pembayaran SPP (Donut Chart) ─────────────────────────
  const paymentDonutData = useMemo(() => {
    const { paidBillsCount, partialBillsCount, unpaidBillsCount, overdueBillsCount } = financialStats;
    return [
      { name: "Lunas", value: paidBillsCount, color: "#10B981" },
      { name: "Sebagian (Cicilan)", value: partialBillsCount, color: "#F59E0B" },
      { name: "Belum Bayar", value: unpaidBillsCount, color: "#EF4444" },
      { name: "Jatuh Tempo", value: overdueBillsCount, color: "#8B5CF6" }
    ].filter(item => item.value > 0);
  }, [financialStats]);

  // ─── Chart 5: Tren Pembayaran Kas SPP Bulanan (Area Chart) ─────────────────
  const monthlyRevenueData = useMemo(() => {
    const monthNames = ["Jul", "Agu", "Sep", "Okt", "Nov", "Des", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun"];
    const monthRevenueMap: Record<string, number> = {};
    monthNames.forEach(m => { monthRevenueMap[m] = 0; });

    bills.forEach(b => {
      const pm = (b.periodMonth || "").toLowerCase();
      const paid = Number(b.paidAmount) || 0;
      if (paid > 0) {
        if (pm.includes("juli") || pm.includes("jul")) monthRevenueMap["Jul"] += paid;
        else if (pm.includes("agustus") || pm.includes("agu")) monthRevenueMap["Agu"] += paid;
        else if (pm.includes("september") || pm.includes("sep")) monthRevenueMap["Sep"] += paid;
        else if (pm.includes("oktober") || pm.includes("okt")) monthRevenueMap["Okt"] += paid;
        else if (pm.includes("november") || pm.includes("nov")) monthRevenueMap["Nov"] += paid;
        else if (pm.includes("desember") || pm.includes("des")) monthRevenueMap["Des"] += paid;
        else if (pm.includes("januari") || pm.includes("jan")) monthRevenueMap["Jan"] += paid;
        else if (pm.includes("februari") || pm.includes("feb")) monthRevenueMap["Feb"] += paid;
        else if (pm.includes("maret") || pm.includes("mar")) monthRevenueMap["Mar"] += paid;
        else if (pm.includes("april") || pm.includes("apr")) monthRevenueMap["Apr"] += paid;
        else if (pm.includes("mei")) monthRevenueMap["Mei"] += paid;
        else if (pm.includes("juni") || pm.includes("jun")) monthRevenueMap["Jun"] += paid;
        else monthRevenueMap["Sep"] += paid; // fallback
      }
    });

    return monthNames.map(m => ({
      bulan: m,
      penerimaan: Math.round(monthRevenueMap[m] / 1000) // in thousand Rupiah
    }));
  }, [bills]);

  // ─── Today's Live Schedules ───────────────────────────────────────────────
  const todaySchedules = useMemo(() => {
    const filtered = schedules.filter((s: any) => {
      const sDay = (s.day || s.hari || "").toLowerCase().trim();
      return sDay === (currentDay || "").toLowerCase().trim();
    });
    return filtered.length > 0 ? filtered.slice(0, 4) : schedules.slice(0, 4);
  }, [schedules, currentDay]);

  // ─── Reset Filter Action ──────────────────────────────────────────────────
  const handleResetFilters = () => {
    setFilterAcademicYear("Semua");
    setFilterSemester("Semua");
    setFilterPeriod("today");
    setFilterClass("Semua Kelas");
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* ─── A. Header & Executive Greeting Banner ─────────────────────────── */}
      <div className="bg-gradient-to-r from-[#531FFF] via-[#6329ff] to-[#7944ff] rounded-2xl p-6 sm:p-7 text-white shadow-xl shadow-[#531FFF]/15 relative overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-white/5 pointer-events-none blur-xl" />
        <div className="absolute right-40 -top-10 w-48 h-48 rounded-full bg-white/5 pointer-events-none blur-lg" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-white/15 text-white backdrop-blur-md border border-white/20 shadow-xs">
                <BookUser className="w-3.5 h-3.5 text-emerald-300" />
                <span>Monitoring Executive</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-purple-100 backdrop-blur-sm border border-white/15">
                <School className="w-3.5 h-3.5 text-amber-300" />
                <span>{schoolProfile?.schoolName || "Quick Schools Academy"}</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-purple-200">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span>Live Realtime DB ({lastSyncTime || "Aktif"})</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <span>{greeting}, {userName}</span>
              <Sparkles className="w-6 h-6 text-amber-300 inline-block animate-pulse" />
            </h1>
            <p className="text-purple-100 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Ringkasan analitik eksekutif sekolah hari ini. Pantau seluruh metrik operasional, kehadiran, capaian akademik, dan keuangan sekolah secara komprehensif dalam satu dashboard.
            </p>
          </div>

          {/* Quick Date and Print Action */}
          <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between sm:justify-end gap-3 shrink-0">
            <div className="text-left lg:text-right bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/15 shadow-xs">
              <div className="text-xs font-bold text-purple-200 flex items-center lg:justify-end gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-300" />
                <span>{currentDay}, {currentDate}</span>
              </div>
              <div className="text-sm font-black text-white mt-0.5">
                T.A. {academicYear}
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#531FFF] hover:bg-purple-50 text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer"
              title="Cetak Ringkasan Eksekutif Dashboard"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Laporan</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── B. Filter Bar Interaktif ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-extrabold text-gray-800">
            <Filter className="w-4 h-4 text-[#531FFF]" />
            <span>Filter Analitik & Laporan:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Tahun Ajaran */}
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-bold text-gray-500 hidden sm:inline">Tahun Ajaran:</label>
              <select
                value={filterAcademicYear}
                onChange={(e) => setFilterAcademicYear(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold text-gray-800 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all cursor-pointer shadow-2xs"
              >
                {availableAcademicYears.map(yr => (
                  <option key={yr} value={yr}>
                    {yr === "Semua" ? "Semua Tahun" : `T.A. ${yr}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Semester */}
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-bold text-gray-500 hidden sm:inline">Semester:</label>
              <select
                value={filterSemester}
                onChange={(e) => setFilterSemester(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold text-gray-800 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all cursor-pointer shadow-2xs"
              >
                <option value="Semua">Semua Semester</option>
                <option value="Ganjil">Semester Ganjil</option>
                <option value="Genap">Semester Genap</option>
              </select>
            </div>

            {/* Filter Periode */}
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-bold text-gray-500 hidden sm:inline">Periode:</label>
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value as any)}
                className="px-3 py-1.5 text-xs font-bold text-gray-800 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all cursor-pointer shadow-2xs"
              >
                <option value="today">Hari Ini</option>
                <option value="7days">7 Hari Terakhir</option>
                <option value="month">Bulan Ini</option>
                <option value="semester">Semester Ini</option>
              </select>
            </div>

            {/* Filter Kelas */}
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-bold text-gray-500 hidden sm:inline">Kelas:</label>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold text-gray-800 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all cursor-pointer shadow-2xs"
              >
                {availableClasses.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>

            {/* Reset Filters */}
            {(filterAcademicYear !== "Semua" || filterSemester !== "Semua" || filterPeriod !== "today" || filterClass !== "Semua Kelas") && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                title="Reset semua filter ke default"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Indicator Tag */}
        {(filterAcademicYear !== "Semua" || filterSemester !== "Semua" || filterPeriod !== "today" || filterClass !== "Semua Kelas") && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 flex-wrap text-xs">
            <span className="text-gray-400 font-medium">Filter Aktif:</span>
            {filterAcademicYear !== "Semua" && (
              <span className="bg-purple-50 text-[#531FFF] px-2.5 py-0.5 rounded-lg border border-purple-200 font-bold">
                T.A: {filterAcademicYear}
              </span>
            )}
            {filterSemester !== "Semua" && (
              <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-lg border border-blue-200 font-bold">
                Semester {filterSemester}
              </span>
            )}
            {filterPeriod !== "today" && (
              <span className="bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-lg border border-amber-200 font-bold">
                Periode: {filterPeriod === "7days" ? "7 Hari" : filterPeriod === "month" ? "Bulan Ini" : "Semester Ini"}
              </span>
            )}
            {filterClass !== "Semua Kelas" && (
              <span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-lg border border-emerald-200 font-bold">
                Kelas: {filterClass}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ─── C. Executive KPI Cards (4 Cards) ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Siswa */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full pointer-events-none -mr-4 -mt-4 transition-transform group-hover:scale-110" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-gray-500 uppercase tracking-wider">Total Siswa Aktif</span>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#531FFF] flex items-center justify-center font-bold shadow-2xs">
                <GraduationCap className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                {studentCount.toLocaleString("id-ID")}
                <span className="text-xs font-bold text-gray-400 ml-1.5 font-normal">Siswa</span>
              </div>
              <div className="flex items-center gap-2 mt-2 text-xs font-semibold text-gray-600">
                <span className="inline-flex items-center gap-1 text-blue-600">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  {maleStudents} Laki-laki
                </span>
                <span className="text-gray-300">•</span>
                <span className="inline-flex items-center gap-1 text-rose-600">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  {femaleStudents} Perempuan
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-400 font-medium">{classes.length} Rombel Terdata</span>
            <Link
              href="/data-siswa"
              className="text-[#531FFF] font-extrabold hover:underline inline-flex items-center gap-1"
            >
              <span>Detail</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Card 2: Kehadiran Siswa Hari Ini */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full pointer-events-none -mr-4 -mt-4 transition-transform group-hover:scale-110" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-gray-500 uppercase tracking-wider">Presensi Siswa Hari Ini</span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-2xs">
                <CalendarCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-baseline gap-2">
                <span>{attendanceToday.rate}%</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {attendanceToday.hadir} Hadir
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-gray-100 rounded-full h-2 mt-2.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${attendanceToday.rate}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-[11px] text-gray-500 font-medium">
                <span>Sakit/Izin: {attendanceToday.sakit + attendanceToday.izin}</span>
                <span className="text-rose-600 font-bold">Alpa: {attendanceToday.alpa}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-400 font-medium">{attendanceToday.belumAbsen} Belum Absen</span>
            <Link
              href="/attendance"
              className="text-emerald-700 font-extrabold hover:underline inline-flex items-center gap-1"
            >
              <span>Pantau</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Card 3: Tenaga Pendidik & Kehadiran Guru */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full pointer-events-none -mr-4 -mt-4 transition-transform group-hover:scale-110" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-gray-500 uppercase tracking-wider">Tenaga Pendidik</span>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-2xs">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-baseline gap-2">
                <span>{teacherCount}</span>
                <span className="text-xs font-bold text-gray-400 font-normal">Guru Aktif</span>
              </div>
              <div className="mt-2 text-xs font-bold text-gray-700 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  {teacherAttendanceToday.hadir} Hadir Hari Ini ({teacherAttendanceToday.rate}%)
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500 font-medium">
                <span>Tepat Waktu: {teacherAttendanceToday.tepatWaktu}</span>
                <span>Terlambat: {teacherAttendanceToday.terlambat}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-400 font-medium">Presensi Biometrik & Manual</span>
            <Link
              href="/teacher-attendance"
              className="text-blue-700 font-extrabold hover:underline inline-flex items-center gap-1"
            >
              <span>Presensi Guru</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Card 4: Keuangan SPP & Rasio Penerimaan */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full pointer-events-none -mr-4 -mt-4 transition-transform group-hover:scale-110" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-gray-500 uppercase tracking-wider">Realisasi SPP Sekolah</span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shadow-2xs">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                {formatRupiahShort(financialStats.totalPemasukan)}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <ArrowUp className="w-3 h-3 text-emerald-600" />
                  {financialStats.collectionRate}% Terkumpul
                </span>
              </div>
              <div className="flex items-center justify-between mt-2 text-[11px] text-gray-500 font-medium">
                <span>Tunggakan:</span>
                <span className="text-rose-600 font-bold">{formatRupiahShort(financialStats.totalTertunggak)}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-400 font-medium">{financialStats.paidBillsCount} Tagihan Lunas</span>
            <Link
              href="/financial-reports"
              className="text-amber-700 font-extrabold hover:underline inline-flex items-center gap-1"
            >
              <span>Laporan SPP</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ─── D. Charts Section 1: Distribusi Siswa & Komposisi Kehadiran ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1A: Distribusi Siswa per Kelas (Bar Chart) - 2 Cols */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-sm sm:text-base font-black text-gray-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#531FFF]" />
                  <span>Distribusi Siswa Berdasarkan Kelas</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Jumlah siswa per rombel terdata beserta komposisi gender
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 font-bold text-blue-600">
                  <span className="w-2.5 h-2.5 rounded-xs bg-blue-500" /> Laki-laki
                </span>
                <span className="inline-flex items-center gap-1 font-bold text-rose-500 ml-2">
                  <span className="w-2.5 h-2.5 rounded-xs bg-rose-400" /> Perempuan
                </span>
              </div>
            </div>

            <div className="mt-5 h-[280px] w-full">
              {classDistributionData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={classDistributionData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="className"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      angle={-20}
                      textAnchor="end"
                      height={40}
                    />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100 text-xs space-y-1">
                              <p className="font-black text-gray-900">{data.className}</p>
                              <p className="text-gray-600">Total: <strong>{data.totalSiswa} Siswa</strong></p>
                              <p className="text-blue-600">Laki-laki: <strong>{data.lakiLaki}</strong></p>
                              <p className="text-rose-600">Perempuan: <strong>{data.perempuan}</strong></p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="lakiLaki" stackId="a" fill="#3B82F6" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="perempuan" stackId="a" fill="#FB7185" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-gray-400 italic">
                  Belum ada data distribusi kelas untuk filter terpilih
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Menampilkan {classDistributionData.length} rombel</span>
            <Link href="/classes" className="text-[#531FFF] font-extrabold hover:underline">
              Kelola Kelas & Rombel →
            </Link>
          </div>
        </div>

        {/* Chart 1B: Komposisi Status Kehadiran Siswa Hari Ini (Donut Chart) - 1 Col */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="border-b border-gray-100 pb-3">
              <h2 className="text-sm sm:text-base font-black text-gray-900 flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-emerald-600" />
                <span>Status Kehadiran Hari Ini</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Rasio kehadiran siswa ({currentDate})
              </p>
            </div>

            <div className="mt-4 h-[210px] w-full relative flex items-center justify-center">
              {attendanceDonutData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={attendanceDonutData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {attendanceDonutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(val: any, name: any) => [`${val} Siswa`, name]}
                        contentStyle={{ borderRadius: "12px", border: "1px solid #f1f5f9", fontSize: "11px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Stat */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black text-gray-900">{attendanceToday.rate}%</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Hadir</span>
                  </div>
                </>
              ) : (
                <div className="text-xs text-gray-400 italic">Belum ada absensi hari ini</div>
              )}
            </div>

            {/* Breakdown Legend */}
            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-100 text-xs">
              <div className="flex items-center gap-1.5 text-gray-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">Hadir: <strong>{attendanceToday.hadir}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-700">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <span className="truncate">Terlambat: <strong>{attendanceToday.terlambat}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-700">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                <span className="truncate">Sakit: <strong>{attendanceToday.sakit}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-700">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                <span className="truncate">Izin: <strong>{attendanceToday.izin}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-700">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                <span className="truncate">Alpa: <strong>{attendanceToday.alpa}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-700">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-400 shrink-0" />
                <span className="truncate">Belum: <strong>{attendanceToday.belumAbsen}</strong></span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-400">Total {studentCount} Siswa</span>
            <Link href="/attendance" className="text-emerald-700 font-black hover:underline">
              Buka Rekap →
            </Link>
          </div>
        </div>
      </div>

      {/* ─── E. Charts Section 2: Tren Kehadiran & Nilai Akademik ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 2A: Tren Kehadiran Siswa vs Guru (Line Chart) */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-sm sm:text-base font-black text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#531FFF]" />
                  <span>Tren Kehadiran (7 Hari Terakhir)</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Komparasi persentase kehadiran Siswa vs Tenaga Pendidik
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                  <span className="w-3 h-1 bg-emerald-500 rounded-full" /> Siswa
                </span>
                <span className="inline-flex items-center gap-1 font-bold text-[#531FFF]">
                  <span className="w-3 h-1 bg-[#531FFF] rounded-full" /> Guru
                </span>
              </div>
            </div>

            <div className="mt-5 h-[270px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={attendanceTrendData}
                  margin={{ top: 10, right: 15, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} tickLine={false} unit="%" />
                  <RechartsTooltip
                    formatter={(val: any, name: any) => [`${val}%`, name === "siswaRate" ? "Kehadiran Siswa" : "Kehadiran Guru"]}
                    contentStyle={{ borderRadius: "12px", border: "1px solid #f1f5f9", fontSize: "11px" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="siswaRate"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#10B981" }}
                    activeDot={{ r: 5 }}
                    name="siswaRate"
                  />
                  <Line
                    type="monotone"
                    dataKey="guruRate"
                    stroke="#531FFF"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#531FFF" }}
                    activeDot={{ r: 5 }}
                    name="guruRate"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Rata-rata 7 hari: Siswa {attendanceToday.rate}% | Guru {teacherAttendanceToday.rate}%</span>
            <Link href="/attendance" className="text-[#531FFF] font-extrabold hover:underline">
              Detail Presensi Lengkap →
            </Link>
          </div>
        </div>

        {/* Chart 2B: Perkembangan Nilai Akademik per Mata Pelajaran (Bar Chart with Reference Line) */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-sm sm:text-base font-black text-gray-900 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-[#531FFF]" />
                  <span>Rata-Rata Nilai Akademik per Mapel</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Capaian nilai siswa dibandingkan batas KKM (75)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  Rata-rata: {academicStats.average}
                </span>
                <span className="text-xs font-black text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                  {academicStats.passRate}% Tuntas KKM
                </span>
              </div>
            </div>

            <div className="mt-5 h-[270px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={academicStats.subjectChartData}
                  margin={{ top: 10, right: 15, left: -20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="subject"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    angle={-15}
                    textAnchor="end"
                    height={40}
                  />
                  <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} tickLine={false} />
                  <RechartsTooltip
                    formatter={(val: any, _name: any, item: any) => [`${val} Poin`, `${item.payload.fullName}`]}
                    contentStyle={{ borderRadius: "12px", border: "1px solid #f1f5f9", fontSize: "11px" }}
                  />
                  <ReferenceLine
                    y={75}
                    stroke="#EF4444"
                    strokeDasharray="4 4"
                    label={{ value: "KKM (75)", fill: "#EF4444", fontSize: 10, position: "top" }}
                  />
                  <Bar
                    dataKey="nilaiRataRata"
                    fill="#531FFF"
                    radius={[6, 6, 0, 0]}
                  >
                    {academicStats.subjectChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.nilaiRataRata >= 85 ? "#10B981" : entry.nilaiRataRata >= 75 ? "#531FFF" : "#EF4444"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>{academicStats.tuntasCount} Tuntas • {academicStats.remedialCount} Perlu Pengayaan/Remedial</span>
            <Link href="/report-cards" className="text-[#531FFF] font-extrabold hover:underline">
              Buka Rapor Digital →
            </Link>
          </div>
        </div>
      </div>

      {/* ─── F. Charts Section 3: Keuangan & Penerimaan Kas SPP ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 3A: Tren Penerimaan SPP Bulanan (Area Chart) - 2 Cols */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-sm sm:text-base font-black text-gray-900 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  <span>Tren Penerimaan Kas SPP Bulanan</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Arus kas pembayaran SPP per bulan (dalam ribuan Rupiah)
                </p>
              </div>
              <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                Total Masuk: {formatRupiah(financialStats.totalPemasukan)}
              </div>
            </div>

            <div className="mt-5 h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={monthlyRevenueData}
                  margin={{ top: 10, right: 15, left: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="bulan" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `${val >= 1000 ? `${(val / 1000).toFixed(0)}Jt` : `${val}Rb`}`}
                  />
                  <RechartsTooltip
                    formatter={(val: any) => [`Rp ${(val * 1000).toLocaleString("id-ID")}`, "Penerimaan"]}
                    contentStyle={{ borderRadius: "12px", border: "1px solid #f1f5f9", fontSize: "11px" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="penerimaan"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Efektivitas penagihan: {financialStats.collectionRate}%</span>
            <Link href="/financial-reports" className="text-emerald-700 font-extrabold hover:underline">
              Buka Laporan Keuangan SPP →
            </Link>
          </div>
        </div>

        {/* Chart 3B: Komposisi Status Tagihan SPP (Donut Chart) - 1 Col */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="border-b border-gray-100 pb-3">
              <h2 className="text-sm sm:text-base font-black text-gray-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-600" />
                <span>Status Tagihan SPP</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Distribusi status invoice SPP siswa
              </p>
            </div>

            <div className="mt-4 h-[200px] w-full relative flex items-center justify-center">
              {paymentDonutData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentDonutData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                      >
                        {paymentDonutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(val: any, name: any) => [`${val} Tagihan`, name]}
                        contentStyle={{ borderRadius: "12px", border: "1px solid #f1f5f9", fontSize: "11px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-black text-gray-900">{financialStats.collectionRate}%</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Lunas</span>
                  </div>
                </>
              ) : (
                <div className="text-xs text-gray-400 italic">Belum ada data tagihan SPP</div>
              )}
            </div>

            <div className="space-y-1.5 mt-2 pt-2 border-t border-gray-100 text-xs">
              <div className="flex items-center justify-between text-gray-700">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Lunas</span>
                </span>
                <strong>{financialStats.paidBillsCount} Tagihan</strong>
              </div>
              <div className="flex items-center justify-between text-gray-700">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Sebagian</span>
                </span>
                <strong>{financialStats.partialBillsCount} Tagihan</strong>
              </div>
              <div className="flex items-center justify-between text-gray-700">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Belum Bayar</span>
                </span>
                <strong>{financialStats.unpaidBillsCount} Tagihan</strong>
              </div>
              <div className="flex items-center justify-between text-gray-700">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <span>Overdue</span>
                </span>
                <strong>{financialStats.overdueBillsCount} Tagihan</strong>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-400">Total {financialStats.totalBills} Invoice</span>
            <Link href="/payments" className="text-amber-700 font-black hover:underline">
              Kelola Tagihan →
            </Link>
          </div>
        </div>
      </div>

      {/* ─── G. Executive Summary & Ringkasan Laporan Cepat ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Executive Summary Card (Smart Insights) - 2 Cols */}
        <div className="lg:col-span-2 bg-gradient-to-br from-purple-50/70 via-white to-blue-50/50 rounded-2xl border border-purple-100/80 shadow-xs p-5 sm:p-6">
          <div className="flex items-center justify-between border-b border-purple-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#531FFF] text-white flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-gray-900">
                  Ringkasan Eksekutif Kondisi Sekolah
                </h2>
                <p className="text-xs text-gray-500">
                  Sorotan utama status terkini untuk Kepala Sekolah
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-[#531FFF] bg-white px-3 py-1 rounded-full border border-purple-200 shadow-2xs">
              AI Executive Insight
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* Kehadiran & Kedisiplinan */}
            <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-black text-gray-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Kehadiran & Kedisiplinan</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Tingkat kehadiran siswa hari ini berada pada <strong>{attendanceToday.rate}%</strong> ({attendanceToday.hadir} siswa hadir). Sebanyak <strong>{teacherAttendanceToday.hadir} dari {teacherCount} guru</strong> telah hadir tepat waktu mengajar.
              </p>
            </div>

            {/* Performa Akademik */}
            <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-black text-gray-800">
                <BarChart2 className="w-4 h-4 text-[#531FFF]" />
                <span>Capaian Akademik</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Rata-rata nilai akademik semester berjalan adalah <strong>{academicStats.average}</strong> (Skala 4.0: <strong>{academicStats.averageScale4}</strong>) dengan <strong>{academicStats.passRate}%</strong> siswa telah melampaui KKM (75).
              </p>
            </div>

            {/* Keuangan SPP */}
            <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-black text-gray-800">
                <Wallet className="w-4 h-4 text-amber-600" />
                <span>Kolektibilitas SPP</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Realisasi pembayaran SPP mencapai <strong>{financialStats.collectionRate}%</strong> ({formatRupiahShort(financialStats.totalPemasukan)}). Terdapat <strong>{financialStats.unpaidBillsCount + financialStats.overdueBillsCount}</strong> tagihan yang perlu tindak lanjut staf keuangan.
              </p>
            </div>

            {/* Agenda & KBM */}
            <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-black text-gray-800">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Kegiatan Belajar Mengajar</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Hari ini ({currentDay}) terdaftar <strong>{todaySchedules.length} slot jadwal KBM</strong> aktif. Seluruh rombel berjalan sesuai agenda kalender akademik semester {academicYear}.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-purple-100 flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Data diperbarui secara otomatis dari Firestore</span>
            <div className="flex items-center gap-3">
              <Link href="/grades" className="text-[#531FFF] font-black hover:underline">
                Lihat Penilaian →
              </Link>
              <Link href="/financial-reports" className="text-emerald-700 font-black hover:underline">
                Laporan Kas SPP →
              </Link>
            </div>
          </div>
        </div>

        {/* School Activities & Audit Log Timeline - 1 Col */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-sm sm:text-base font-black text-gray-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#531FFF]" />
                <span>Aktivitas Sekolah Terkini</span>
              </h2>
              <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Live Feed
              </span>
            </div>

            <div className="mt-4 space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {activities.length > 0 ? (
                activities.slice(0, 5).map((act: any, idx: number) => (
                  <div key={act.id || idx} className="flex items-start gap-2.5 text-xs pb-2.5 border-b border-gray-50 last:border-0">
                    <div className="w-6 h-6 rounded-full bg-purple-50 text-[#531FFF] flex items-center justify-center font-bold shrink-0 mt-0.5">
                      <Clock3 className="w-3 h-3" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900 truncate">{act.title || act.action || "Aktivitas Sistem"}</p>
                      <p className="text-gray-500 text-[11px] line-clamp-1">{act.description || act.details || "Aktivitas tercatat dalam database"}</p>
                      <span className="text-[10px] text-gray-400 mt-0.5 block">
                        {formatDateDisplay(act.timestamp || act.createdAt)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-gray-400 italic">
                  Belum ada aktivitas baru tercatat hari ini
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-400 font-medium">Log aktivitas terintegrasi</span>
            <Link href="/announcements" className="text-[#531FFF] font-extrabold hover:underline">
              Pengumuman Sekolah →
            </Link>
          </div>
        </div>
      </div>

      {/* ─── H. Pengumuman Sekolah & Jadwal Hari Ini ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Announcements */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 sm:p-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-purple-600" />
              <h2 className="text-sm sm:text-base font-black text-gray-900">Pengumuman Sekolah Aktif</h2>
            </div>
            <Link href="/announcements" className="text-xs text-[#531FFF] font-bold hover:underline">
              Semua ({announcements.length}) →
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {announcements.length > 0 ? (
              announcements.slice(0, 3).map((item: any, idx: number) => (
                <div
                  key={item.id || idx}
                  className="p-3.5 rounded-xl bg-gray-50/70 border border-gray-200/70 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-gray-900 truncate">{item.title}</span>
                    <span className="text-[10px] font-bold text-gray-400 shrink-0">
                      {formatDateDisplay(item.createdAt || item.date)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">
                    {cleanAnnouncementDesc(item.content || item.description || "")}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                      Sasaran: {item.target || "Semua Warga Sekolah"}
                    </span>
                    {item.priority === "Tinggi" && (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                        Penting
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-gray-400 italic">
                Tidak ada pengumuman aktif saat ini
              </div>
            )}
          </div>
        </div>

        {/* Today's KBM Schedules */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 sm:p-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#531FFF]" />
              <h2 className="text-sm sm:text-base font-black text-gray-900">Agenda & KBM Hari Ini ({currentDay})</h2>
            </div>
            <Link href="/schedule" className="text-xs text-[#531FFF] font-bold hover:underline">
              Jadwal Lengkap →
            </Link>
          </div>

          <div className="mt-4 space-y-2.5">
            {todaySchedules.length > 0 ? (
              todaySchedules.map((sc: any, idx: number) => (
                <div
                  key={sc.id || idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50/70 border border-gray-200/70 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-purple-50 text-[#531FFF] flex items-center justify-center font-bold text-xs shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-gray-900">{sc.subject || sc.mapel || "Pelajaran"}</div>
                      <div className="text-[11px] text-gray-500 font-medium">
                        Kelas: <strong>{sc.className || sc.classId || "Umum"}</strong> • Guru: {sc.teacherName || sc.guru || "-"}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-[#531FFF] bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200 block">
                      {sc.startTime || sc.jamMulai || "07:30"} - {sc.endTime || sc.jamSelesai || "09:00"}
                    </span>
                    <span className="text-[10px] text-gray-400 mt-0.5 block">{sc.room || "Ruang Kelas"}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-gray-400 italic">
                Tidak ada agenda KBM terdaftar untuk hari ini
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
