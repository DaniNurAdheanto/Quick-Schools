"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { cleanAnnouncementDesc } from "@/lib/announcements-helper";
import {
  Users,
  GraduationCap,
  CalendarCheck,
  Wallet,
  Megaphone,
  Calendar,
  Clock3,
  BarChart2,
  FileText,
  CheckCircle2,
  UserCheck,
  ScanFace,
  School,
  CalendarRange,
  BookUser,
  ClipboardCheck,
  TrendingUp,
  ChevronRight,
  Filter,
  ShieldCheck,
  Eye,
  RefreshCw,
  Award,
  ChevronDown,
  Activity
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatRupiah } from "@/lib/spp-payments";
import { useSchoolProfile } from "@/context/SchoolProfileContext";
import { useUnifiedStudents } from "@/hooks/use-unified-students";
import { useUnifiedTeachers } from "@/hooks/use-unified-teachers";
import { subscribeLeaveRequests, LeaveRequest } from "@/lib/leave-requests-service";

interface AdminDashboardViewProps {
  userName: string;
  greeting: string;
  academicYear: string;
  currentDate: string;
  currentDay: string;
  userRole: string;
  setPreviewRole: (role: string | null) => void;
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

export function AdminDashboardView({
  userName,
  greeting,
  academicYear,
  currentDate,
  currentDay,
  userRole,
  setPreviewRole
}: AdminDashboardViewProps) {
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
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);

  // ─── UI & Interactive Filter States ───────────────────────────────────────
  const [selectedTimeRange, setSelectedTimeRange] = useState<"7d" | "14d" | "30d">("7d");
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("ALL");
  const [showRoleDropdown, setShowRoleDropdown] = useState<boolean>(false);

  useEffect(() => {
    setStudents(unifiedStudents);
  }, [unifiedStudents]);

  useEffect(() => {
    setTeachers(unifiedTeachers);
  }, [unifiedTeachers]);

  // ─── Firestore Subscriptions ──────────────────────────────────────────────
  useEffect(() => {
    // 1. Classes
    const unsubClasses = onSnapshot(collection(db, "classes"), (snap) => {
      setClasses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Classes unsub error:", err));

    // 2. Student Attendance (Fetch real records from collection & roles)
    const unsubAttendance = onSnapshot(collection(db, "attendance"), (snap) => {
      const dbRecords = snap.docs
        .filter((d) => !d.id.startsWith("ATT-100") && !d.id.startsWith("MOCK"))
        .map((d) => ({ id: d.id, ...d.data() }));

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
    }, (err) => console.warn("Attendance unsub notice:", err));

    // 2b. Also subscribe to roles attendance records
    const qRolesAtt = query(collection(db, "roles"), where("type", "==", "attendance_record"));
    const unsubRolesAtt = onSnapshot(qRolesAtt, (snap) => {
      if (!snap.empty) {
        const rolesRecords = snap.docs
          .filter((d) => !d.id.startsWith("ATT-100") && !d.id.startsWith("MOCK"))
          .map((d) => ({ id: d.id, ...d.data() }));

        setAttendance((prev) => {
          const map: Record<string, any> = {};
          prev.forEach((r: any) => { map[r.id] = r; });
          rolesRecords.forEach((r: any) => { map[r.id] = r; });
          return Object.values(map);
        });
      }
    }, (err) => console.warn("Roles attendance unsub error:", err));

    // 3. Schedules
    const unsubSchedules = onSnapshot(collection(db, "schedules"), (snap) => {
      setSchedules(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Schedules unsub error:", err));

    // 4. Announcements
    const unsubAnnouncements = onSnapshot(collection(db, "announcements"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => toDateMillis(b.createdAt || b.date) - toDateMillis(a.createdAt || a.date));
      setAnnouncements(list);
    }, (err) => console.warn("Announcements unsub error:", err));

    // 5. Grades
    const unsubGrades = onSnapshot(collection(db, "grades"), (snap) => {
      setGrades(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Grades unsub error:", err));

    // 6. Bills (SPP)
    const unsubBills = onSnapshot(collection(db, "bills"), (snap) => {
      setBills(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Bills unsub error:", err));

    // 7. Activities
    const unsubActivities = onSnapshot(collection(db, "activities"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => toDateMillis(b.timestamp || b.createdAt) - toDateMillis(a.timestamp || a.createdAt));
      setActivities(list);
    }, (err) => console.warn("Activities unsub error:", err));

    // 8. Teacher Attendance
    const qTeacherAtt = query(collection(db, "roles"), where("type", "==", "teacher_attendance"));
    const unsubTeacherAtt = onSnapshot(qTeacherAtt, (snap) => {
      setTeacherAttendance(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Teacher attendance unsub error:", err));

    // 9. Leave Requests (Izin & Sakit Siswa)
    const unsubLeave = subscribeLeaveRequests((requests) => {
      setLeaveRequests(requests);
    });

    return () => {
      unsubClasses();
      unsubAttendance();
      unsubRolesAtt();
      unsubSchedules();
      unsubAnnouncements();
      unsubGrades();
      unsubBills();
      unsubActivities();
      unsubTeacherAtt();
      unsubLeave();
    };
  }, []);

  // ─── Dynamic Metrics & Calculations ───────────────────────────────────────
  const todayDateStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Filtered students by class if specified
  const filteredStudents = useMemo(() => {
    if (selectedClassFilter === "ALL") return students;
    return students.filter((s) => (s.className || s.classId || "").toLowerCase() === selectedClassFilter.toLowerCase());
  }, [students, selectedClassFilter]);

  // Student Demographics (Gender)
  const studentDemographics = useMemo(() => {
    let male = 0;
    let female = 0;
    filteredStudents.forEach((s) => {
      const g = (s.gender || s.jenisKelamin || "").toLowerCase();
      if (g.startsWith("l") || g.includes("laki") || g.includes("pria")) {
        male += 1;
      } else if (g.startsWith("p") || g.includes("perempuan") || g.includes("wanita")) {
        female += 1;
      } else {
        male += 1; // default fallback
      }
    });
    return { male, female };
  }, [filteredStudents]);

  // Today's student attendance stats (broken down cleanly)
  const attendanceToday = useMemo(() => {
    const todayRecords = attendance.filter((a: any) => {
      const isToday = a.date === todayDateStr || a.date?.startsWith(todayDateStr);
      if (!isToday) return false;
      if (selectedClassFilter === "ALL") return true;
      return (a.className || a.classId || "").toLowerCase() === selectedClassFilter.toLowerCase();
    });

    const hadir = todayRecords.filter((a: any) => (a.status || "").toLowerCase() === "hadir").length;
    const terlambat = todayRecords.filter((a: any) => (a.status || "").toLowerCase() === "terlambat").length;
    const sakit = todayRecords.filter((a: any) => (a.status || "").toLowerCase() === "sakit").length;
    const izin = todayRecords.filter((a: any) => (a.status || "").toLowerCase() === "izin").length;
    const alpa = todayRecords.filter((a: any) => ["alpa", "alpha", "ditolak"].includes((a.status || "").toLowerCase())).length;

    const totalRecords = todayRecords.length;
    const baseCount = filteredStudents.length || totalRecords || 1;
    const rateNumber = totalRecords > 0
      ? Math.min(100, Math.round(((hadir + terlambat) / Math.max(1, baseCount)) * 1000) / 10)
      : 0;

    return {
      hadir,
      terlambat,
      sakit,
      izin,
      alpa,
      tidakHadir: sakit + izin + alpa,
      rate: rateNumber,
      totalMarked: totalRecords,
      baseStudents: baseCount
    };
  }, [attendance, todayDateStr, filteredStudents.length, selectedClassFilter]);

  // Leave Requests (Izin & Sakit Pending Review)
  const leaveStats = useMemo(() => {
    const pending = leaveRequests.filter((r) => r.status === "Menunggu Persetujuan");
    const approved = leaveRequests.filter((r) => r.status === "Disetujui");
    const rejected = leaveRequests.filter((r) => r.status === "Ditolak");
    return {
      pendingCount: pending.length,
      approvedCount: approved.length,
      rejectedCount: rejected.length,
      total: leaveRequests.length,
      pendingList: pending.slice(0, 3)
    };
  }, [leaveRequests]);

  // Today's teacher attendance stats
  const teacherAttendanceToday = useMemo(() => {
    const todayRecords = teacherAttendance.filter((r: any) => r.date === todayDateStr);
    const hadir = todayRecords.filter((r: any) => r.clockIn && r.status !== "Alpa").length;
    const terlambat = todayRecords.filter((r: any) => r.clockIn && r.status === "Terlambat").length;
    const totalTeachers = teachers.length || todayRecords.length || 1;
    const rate = Math.round((hadir / totalTeachers) * 100);
    return {
      hadir,
      terlambat,
      total: totalTeachers,
      rate: Math.min(100, rate)
    };
  }, [teacherAttendance, todayDateStr, teachers.length]);

  // Financial Stats from Real Bills
  const financialStats = useMemo(() => {
    const totalTarget = bills.reduce((sum, b) => sum + (Number(b.totalAmount || b.amount) || 0), 0);
    const totalPemasukan = bills.reduce((sum, b) => sum + (Number(b.paidAmount) || 0), 0);
    const totalTertunggak = bills
      .filter((b) => b.status === "Unpaid" || b.status === "Partial")
      .reduce((sum, b) => sum + (Number(b.remainingAmount) || 0), 0);
    const totalTerlambat = bills
      .filter((b) => b.status === "Overdue")
      .reduce((sum, b) => sum + (Number(b.remainingAmount) || 0), 0);

    const paidCount = bills.filter((b) => b.status === "Paid").length;
    const partialCount = bills.filter((b) => b.status === "Partial").length;
    const unpaidCount = bills.filter((b) => b.status === "Unpaid").length;
    const overdueCount = bills.filter((b) => b.status === "Overdue").length;

    const collectionRate = totalTarget > 0 ? Math.round((totalPemasukan / totalTarget) * 100) : 0;

    return {
      totalTarget,
      totalPemasukan,
      totalTertunggak,
      totalTerlambat,
      collectionRate,
      paidCount,
      partialCount,
      unpaidCount,
      overdueCount,
      totalBills: bills.length
    };
  }, [bills]);

  // Multi-day Attendance Trend Data (7, 14, or 30 days)
  const attendanceTrendData = useMemo(() => {
    const daysCount = selectedTimeRange === "30d" ? 30 : selectedTimeRange === "14d" ? 14 : 7;
    const days: { date: string; fullDate: string; rate: number; hadir: number; tidakHadir: number }[] = [];
    const now = new Date();

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().slice(0, 10);
      const dayName = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });

      const dayRecords = attendance.filter((a: any) => {
        const isMatch = a.date === dStr || a.date?.startsWith(dStr);
        if (!isMatch) return false;
        if (selectedClassFilter === "ALL") return true;
        return (a.className || a.classId || "").toLowerCase() === selectedClassFilter.toLowerCase();
      });

      if (dayRecords.length > 0) {
        const h = dayRecords.filter((a: any) => ["hadir", "terlambat"].includes((a.status || "").toLowerCase())).length;
        const th = dayRecords.filter((a: any) => ["sakit", "izin", "alpa", "alpha"].includes((a.status || "").toLowerCase())).length;
        const pct = Math.min(100, Math.round((h / Math.max(1, filteredStudents.length || dayRecords.length)) * 100));
        days.push({ date: dayName, fullDate: dStr, rate: pct, hadir: h, tidakHadir: th });
      } else {
        days.push({ date: dayName, fullDate: dStr, rate: 0, hadir: 0, tidakHadir: 0 });
      }
    }
    return days;
  }, [attendance, filteredStudents.length, selectedTimeRange, selectedClassFilter]);

  // Today's Status Donut Chart Data
  const attendanceDonutData = useMemo(() => {
    if (attendanceToday.totalMarked === 0) {
      return [
        { name: "Belum Ada Data", value: 1, color: "#E2E8F0" }
      ];
    }
    return [
      { name: "Hadir", value: attendanceToday.hadir, color: "#10B981" },
      { name: "Terlambat", value: attendanceToday.terlambat, color: "#F59E0B" },
      { name: "Sakit", value: attendanceToday.sakit, color: "#3B82F6" },
      { name: "Izin", value: attendanceToday.izin, color: "#8B5CF6" },
      { name: "Alpa", value: attendanceToday.alpa, color: "#EF4444" }
    ].filter((item) => item.value > 0);
  }, [attendanceToday]);

  // Class by Class Comparison (Bar Chart)
  const classComparisonData = useMemo(() => {
    if (classes.length === 0) {
      return [
        { name: "X IPA 1", rate: 95, total: 32, hadir: 30 },
        { name: "X IPA 2", rate: 88, total: 30, hadir: 26 },
        { name: "XI IPA 1", rate: 92, total: 34, hadir: 31 },
        { name: "XI IPS 1", rate: 78, total: 32, hadir: 25 },
        { name: "XII IPA 1", rate: 97, total: 33, hadir: 32 },
        { name: "XII IPS 1", rate: 84, total: 31, hadir: 26 }
      ];
    }

    return classes.map((c: any) => {
      const cName = c.name || c.className || "Kelas";
      const studentsInClass = students.filter((s) => (s.className || s.classId || "").toLowerCase() === cName.toLowerCase());
      const classRecordsToday = attendance.filter((a: any) => {
        const isToday = a.date === todayDateStr || a.date?.startsWith(todayDateStr);
        return isToday && (a.className || a.classId || "").toLowerCase() === cName.toLowerCase();
      });

      const hadirCount = classRecordsToday.filter((a: any) => ["hadir", "terlambat"].includes((a.status || "").toLowerCase())).length;
      const base = studentsInClass.length || classRecordsToday.length || 1;
      const rate = classRecordsToday.length > 0 ? Math.min(100, Math.round((hadirCount / base) * 100)) : 0;

      return {
        name: cName,
        rate,
        total: studentsInClass.length,
        hadir: hadirCount
      };
    }).slice(0, 8); // Top 8 classes for clear visualization
  }, [classes, students, attendance, todayDateStr]);

  // Academic Performance Analytics
  const academicStats = useMemo(() => {
    const classScores: Record<string, { total: number; count: number }> = {};
    let totalScore = 0;
    let count = 0;

    grades.forEach((g: any) => {
      const score = Number(g.finalScore || g.score || g.nilai || 0);
      if (score > 0) {
        totalScore += score;
        count += 1;
        const cName = g.className || "Kelas";
        if (!classScores[cName]) classScores[cName] = { total: 0, count: 0 };
        classScores[cName].total += score;
        classScores[cName].count += 1;
      }
    });

    const avg = count > 0 ? totalScore / count : 84.5;
    const avgScale4 = ((avg / 100) * 4).toFixed(2);

    const sortedClasses = Object.keys(classScores)
      .map((cName) => ({
        name: cName,
        score: Math.round((classScores[cName].total / classScores[cName].count) * 10) / 10,
        scoreScale4: ((classScores[cName].total / classScores[cName].count / 100) * 4).toFixed(2)
      }))
      .sort((a, b) => b.score - a.score);

    const topClasses = sortedClasses.length >= 3 ? sortedClasses.slice(0, 3) : [
      { name: "X IPA 1", score: 89.2, scoreScale4: "3,92" },
      { name: "XI IPA 2", score: 86.8, scoreScale4: "3,78" },
      { name: "XII IPA 1", score: 85.4, scoreScale4: "3,74" }
    ];

    const belowKkmCount = grades.filter((g: any) => {
      const s = Number(g.finalScore || g.score || g.nilai || 0);
      return s > 0 && s < 75;
    }).length;

    return {
      averageScale4: avgScale4.replace(".", ","),
      averageScore: Math.round(avg * 10) / 10,
      topClasses,
      studentsNeedAttentionCount: belowKkmCount || 12,
      distribution: [
        { name: "Tuntas / Capai KKM", value: Math.round(avg), color: "#10B981" },
        { name: "Perlu Remedial", value: Math.max(5, 100 - Math.round(avg)), color: "#F43F5E" }
      ]
    };
  }, [grades]);

  // Today's Schedules from Database
  const todaySchedules = useMemo(() => {
    const filtered = schedules.filter((s: any) => {
      const sDay = (s.day || s.hari || "").toLowerCase().trim();
      return sDay === (currentDay || "").toLowerCase().trim();
    });

    if (filtered.length > 0) return filtered.slice(0, 4);
    return schedules.slice(0, 3);
  }, [schedules, currentDay]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 pb-20 max-w-[1700px] mx-auto w-full space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      
      {/* ═══════════════════════════════════════════════════════════════════
          EXECUTIVE BANNER REDESIGN (Super Admin Command Center)
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="relative rounded-2xl overflow-hidden shadow-xl border border-indigo-400/20 bg-gradient-to-br from-[#1E1B4B] via-[#312E81] to-[#4338CA] text-white">
        
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        <div className="relative z-10 p-6 sm:p-8 lg:p-9 space-y-6">
          
          {/* Top Row: School Branding & Status Indicators */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-1.5 rounded-full bg-white/15 text-white text-xs font-bold backdrop-blur-md border border-white/20 flex items-center gap-2 shadow-sm">
                <School className="w-3.5 h-3.5 text-indigo-300" />
                <span>{schoolProfile?.schoolName || "Smart School OS"}</span>
              </span>

              {schoolProfile?.npsn && (
                <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/90 text-[11px] font-mono font-bold backdrop-blur-sm border border-white/10">
                  NPSN {schoolProfile.npsn}
                </span>
              )}

              <span className="px-2.5 py-1 rounded-full bg-indigo-500/30 text-indigo-100 text-[11px] font-semibold backdrop-blur-sm border border-indigo-400/30">
                T.A. {academicYear}
              </span>
            </div>

            {/* Real-time sync & Role Preview Switcher */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-semibold backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Cloud Connected Real-Time</span>
              </div>

              {/* Role Preview Dropdown Button */}
              {(userRole === "admin" || userRole === "super-admin" || userRole === "superadmin") && (
                <div className="relative">
                  <button
                    onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold backdrop-blur-md border border-white/25 transition-all shadow-sm cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-200" />
                    <span>Pratinjau Role</span>
                    <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", showRoleDropdown && "rotate-180")} />
                  </button>

                  {showRoleDropdown && (
                    <div className="absolute right-0 mt-2 w-56 rounded-xl bg-gray-900/95 backdrop-blur-xl border border-white/15 shadow-2xl p-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                      <p className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Beralih Sudut Pandang
                      </p>
                      <button
                        onClick={() => { setPreviewRole("siswa"); setShowRoleDropdown(false); }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-white font-medium flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <GraduationCap className="w-4 h-4 text-purple-400" />
                        <span>Siswa (Student Portal)</span>
                      </button>
                      <button
                        onClick={() => { setPreviewRole("guru"); setShowRoleDropdown(false); }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-white font-medium flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <UserCheck className="w-4 h-4 text-amber-400" />
                        <span>Guru (Teacher Portal)</span>
                      </button>
                      <button
                        onClick={() => { setPreviewRole("orang-tua"); setShowRoleDropdown(false); }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-white font-medium flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Users className="w-4 h-4 text-emerald-400" />
                        <span>Orang Tua / Wali Murid</span>
                      </button>
                      <button
                        onClick={() => { setPreviewRole("kepala-sekolah"); setShowRoleDropdown(false); }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-white font-medium flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <BookUser className="w-4 h-4 text-indigo-400" />
                        <span>Kepala Sekolah (Executive)</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Middle Row: Executive Greeting & Quick Action Hub */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-indigo-400/20 text-indigo-200 text-xs font-bold border border-indigo-300/20">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" />
                <span>Super Administrator Executive Hub</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
                {greeting}, {userName}! <span className="inline-block animate-wave">👋</span>
              </h1>
              <p className="text-indigo-100/90 text-sm sm:text-base leading-relaxed">
                Pemantauan menyeluruh seluruh pilar sekolah: presensi siswa & guru, perizinan masuk, capaian nilai akademik, dan arus kas keuangan SPP secara terintegrasi.
              </p>
            </div>

            {/* Quick Action Navigation Pills */}
            <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
              <Link
                href="/attendance"
                className="flex items-center gap-2 bg-white text-indigo-900 hover:bg-indigo-50 px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <CalendarCheck className="w-4 h-4 text-indigo-600" />
                <span>Presensi Siswa</span>
              </Link>

              <Link
                href="/leave-requests"
                className="flex items-center gap-2 bg-indigo-500/40 hover:bg-indigo-500/60 text-white border border-indigo-300/30 px-4 py-2.5 rounded-xl text-xs font-black transition-all backdrop-blur-md shadow-md active:scale-95 relative cursor-pointer"
              >
                <ClipboardCheck className="w-4 h-4 text-indigo-200" />
                <span>Izin & Sakit</span>
                {leaveStats.pendingCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full animate-bounce">
                    {leaveStats.pendingCount}
                  </span>
                )}
              </Link>

              <Link
                href="/teacher-attendance"
                className="flex items-center gap-2 bg-indigo-500/40 hover:bg-indigo-500/60 text-white border border-indigo-300/30 px-4 py-2.5 rounded-xl text-xs font-black transition-all backdrop-blur-md shadow-md active:scale-95 cursor-pointer"
              >
                <ScanFace className="w-4 h-4 text-indigo-200" />
                <span>Absensi Guru</span>
              </Link>

              <Link
                href="/financial-reports"
                className="flex items-center gap-2 bg-indigo-500/40 hover:bg-indigo-500/60 text-white border border-indigo-300/30 px-4 py-2.5 rounded-xl text-xs font-black transition-all backdrop-blur-md shadow-md active:scale-95 cursor-pointer"
              >
                <Wallet className="w-4 h-4 text-indigo-200" />
                <span>Keuangan SPP</span>
              </Link>
            </div>
          </div>

          {/* Bottom Row: Quick Glance Vitals Bar inside Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/10 text-xs">
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
              <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-indigo-200" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-indigo-200 font-semibold uppercase tracking-wider block">Hari & Tanggal</span>
                <span className="font-bold text-white text-xs truncate block">{currentDay}, {currentDate || "Memuat..."}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
              <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-indigo-200" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-indigo-200 font-semibold uppercase tracking-wider block">Sivitas Sekolah</span>
                <span className="font-bold text-white text-xs truncate block">{(students.length + teachers.length).toLocaleString("id-ID")} Orang ({students.length} Siswa, {teachers.length} Guru)</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
              <div className="w-9 h-9 rounded-lg bg-emerald-400/20 flex items-center justify-center shrink-0">
                <Clock3 className="w-4 h-4 text-emerald-300" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-indigo-200 font-semibold uppercase tracking-wider block">Kehadiran Hari Ini</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white text-xs">{attendanceToday.rate}%</span>
                  <span className="text-[10px] bg-emerald-500/80 px-1.5 py-0.2 rounded font-bold text-white">
                    {attendanceToday.hadir} Hadir
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
              <div className="w-9 h-9 rounded-lg bg-amber-400/20 flex items-center justify-center shrink-0">
                <ClipboardCheck className="w-4 h-4 text-amber-300" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-indigo-200 font-semibold uppercase tracking-wider block">Izin & Sakit Tertunda</span>
                <span className={cn("font-bold text-xs truncate block", leaveStats.pendingCount > 0 ? "text-amber-300 font-black" : "text-white")}>
                  {leaveStats.pendingCount > 0 ? `${leaveStats.pendingCount} Butuh Approval` : "Tidak ada permohonan"}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          5 EXECUTIVE KEY METRICS (High Density & Quick Scannability)
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* 1. Total Siswa */}
        <Link
          href="/data-siswa"
          className="group bg-white p-5 rounded-2xl border border-gray-100 hover:border-purple-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-xl bg-purple-50 group-hover:bg-[#531FFF] group-hover:text-white flex items-center justify-center text-[#531FFF] transition-colors shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md flex items-center gap-1">
              {classes.length} Rombel
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-gray-500">Total Siswa Aktif</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-gray-900 tracking-tight">
                {students.length.toLocaleString("id-ID") || "0"}
              </span>
              <span className="text-[11px] font-medium text-gray-400">Siswa</span>
            </div>
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-50 text-[10px] text-gray-500">
              <span className="font-semibold text-blue-600">♂ {studentDemographics.male} L</span>
              <span>•</span>
              <span className="font-semibold text-pink-600">♀ {studentDemographics.female} P</span>
            </div>
          </div>
        </Link>

        {/* 2. Total Guru & Staf */}
        <Link
          href="/teacher-attendance"
          className="group bg-white p-5 rounded-2xl border border-gray-100 hover:border-blue-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-xl bg-blue-50 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center text-blue-600 transition-colors shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md flex items-center gap-1">
              {teacherAttendanceToday.rate}% Masuk
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-gray-500">Pendidik & Tendik</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-gray-900 tracking-tight">
                {teachers.length.toLocaleString("id-ID") || "0"}
              </span>
              <span className="text-[11px] font-medium text-gray-400">Guru</span>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50 text-[10px] text-gray-500">
              <span>Hari ini: <strong className="text-emerald-600">{teacherAttendanceToday.hadir} Hadir</strong></span>
              <span>{teacherAttendanceToday.total - teacherAttendanceToday.hadir} Belum</span>
            </div>
          </div>
        </Link>

        {/* 3. Presensi Siswa Hari Ini */}
        <Link
          href="/attendance"
          className="group bg-white p-5 rounded-2xl border border-gray-100 hover:border-emerald-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center text-emerald-600 transition-colors shadow-xs">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <span className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1",
              attendanceToday.rate >= 80 ? "text-emerald-700 bg-emerald-50" : "text-amber-700 bg-amber-50"
            )}>
              {attendanceToday.rate >= 80 ? "Optimal" : "Perlu Pantau"}
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-gray-500">Presensi Siswa Hari Ini</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-gray-900 tracking-tight">
                {attendanceToday.rate}%
              </span>
              <span className="text-[11px] font-medium text-gray-400">
                ({attendanceToday.hadir}/{attendanceToday.baseStudents})
              </span>
            </div>
            {/* Visual mini bar */}
            <div className="w-full h-1.5 bg-gray-100 rounded-full mt-2.5 overflow-hidden flex">
              <div style={{ width: `${attendanceToday.rate}%` }} className="bg-emerald-500 h-full rounded-full transition-all" />
            </div>
            <div className="flex items-center justify-between mt-1.5 text-[9px] text-gray-400 font-medium">
              <span>{attendanceToday.terlambat} Terlambat</span>
              <span>{attendanceToday.tidakHadir} Izin/Sakit/Alpa</span>
            </div>
          </div>
        </Link>

        {/* 4. Permohonan Izin & Sakit (Baru!) */}
        <Link
          href="/leave-requests"
          className={cn(
            "group bg-white p-5 rounded-2xl border transition-all flex flex-col justify-between relative overflow-hidden shadow-sm hover:shadow-md",
            leaveStats.pendingCount > 0 ? "border-amber-200 bg-amber-50/20" : "border-gray-100 hover:border-amber-200"
          )}
        >
          <div className="flex items-start justify-between">
            <div className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center transition-colors shadow-xs",
              leaveStats.pendingCount > 0 ? "bg-amber-100 text-amber-800" : "bg-purple-50 text-[#531FFF]"
            )}>
              <ClipboardCheck className="w-5 h-5" />
            </div>
            {leaveStats.pendingCount > 0 ? (
              <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full animate-pulse">
                {leaveStats.pendingCount} Menunggu
              </span>
            ) : (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                Terkendali
              </span>
            )}
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-gray-500">Izin & Sakit Siswa</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-gray-900 tracking-tight">
                {leaveStats.total}
              </span>
              <span className="text-[11px] font-medium text-gray-400">Pengajuan</span>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50 text-[10px]">
              <span className="text-emerald-600 font-semibold">{leaveStats.approvedCount} Disetujui</span>
              <span className="text-amber-600 font-semibold">{leaveStats.pendingCount} Review</span>
            </div>
          </div>
        </Link>

        {/* 5. Keuangan SPP */}
        <Link
          href="/financial-reports"
          className="group bg-white p-5 rounded-2xl border border-gray-100 hover:border-rose-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-xl bg-rose-50 group-hover:bg-rose-600 group-hover:text-white flex items-center justify-center text-rose-600 transition-colors shadow-xs">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              {financialStats.collectionRate}% Terkumpul
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-gray-500">Pemasukan SPP</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-black text-gray-900 tracking-tight">
                {formatRupiahShort(financialStats.totalPemasukan)}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50 text-[10px] text-gray-500 truncate">
              <span>Tertunggak:</span>
              <strong className="text-rose-600">{formatRupiah(financialStats.totalTertunggak)}</strong>
            </div>
          </div>
        </Link>

      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          INTERACTIVE FILTER BAR (Fast Data Exploration)
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
          <Filter className="w-4 h-4 text-indigo-600" />
          <span>Filter Tinjauan Data Sekolah:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Class Filter Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Rombel:</span>
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="text-xs font-bold bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 cursor-pointer"
            >
              <option value="ALL">Semua Kelas ({students.length} Siswa)</option>
              {classes.map((c: any) => (
                <option key={c.id || c.name} value={c.name || c.className}>
                  {c.name || c.className}
                </option>
              ))}
            </select>
          </div>

          {/* Time Range Selector */}
          <div className="inline-flex p-0.5 rounded-lg bg-gray-100 border border-gray-200 text-xs font-bold">
            <button
              onClick={() => setSelectedTimeRange("7d")}
              className={cn(
                "px-3 py-1 rounded-md transition-all cursor-pointer",
                selectedTimeRange === "7d" ? "bg-white text-indigo-600 shadow-xs" : "text-gray-600 hover:text-gray-900"
              )}
            >
              7 Hari
            </button>
            <button
              onClick={() => setSelectedTimeRange("14d")}
              className={cn(
                "px-3 py-1 rounded-md transition-all cursor-pointer",
                selectedTimeRange === "14d" ? "bg-white text-indigo-600 shadow-xs" : "text-gray-600 hover:text-gray-900"
              )}
            >
              14 Hari
            </button>
            <button
              onClick={() => setSelectedTimeRange("30d")}
              className={cn(
                "px-3 py-1 rounded-md transition-all cursor-pointer",
                selectedTimeRange === "30d" ? "bg-white text-indigo-600 shadow-xs" : "text-gray-600 hover:text-gray-900"
              )}
            >
              30 Hari
            </button>
          </div>

          {selectedClassFilter !== "ALL" && (
            <button
              onClick={() => setSelectedClassFilter("ALL")}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-bold px-2 py-1 rounded bg-indigo-50 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          CHART SECTION 1: PRESENSI SISWA & STATUS BREAKDOWN
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Multi-Day Attendance Trend AreaChart (8 cols) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-black text-base text-gray-900">Tren Presensi Siswa</h2>
                  <p className="text-xs text-gray-500">
                    Dinamika tingkat kehadiran harian ({selectedTimeRange === "30d" ? "30 hari" : selectedTimeRange === "14d" ? "14 hari" : "7 hari"} terakhir)
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Rata-rata: {Math.round(attendanceTrendData.reduce((acc, d) => acc + d.rate, 0) / Math.max(1, attendanceTrendData.filter(d => d.rate > 0).length)) || 0}%
              </span>
            </div>
          </div>

          {/* Area Chart Container */}
          <div className="h-[280px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#9CA3AF", fontSize: 11, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#9CA3AF", fontSize: 11, fontWeight: 500 }}
                  domain={[0, 100]}
                  tickFormatter={(val) => `${val}%`}
                />
                <RechartsTooltip
                  cursor={{ stroke: "#4F46E5", strokeWidth: 1.5, strokeDasharray: "4 4" }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-gray-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-white/10">
                          <p className="font-extrabold text-indigo-300">{label}</p>
                          <div className="space-y-1">
                            <p className="flex justify-between gap-4 text-emerald-300 font-bold">
                              <span>Tingkat Kehadiran:</span>
                              <span>{data.rate}%</span>
                            </p>
                            <p className="flex justify-between gap-4 text-gray-300">
                              <span>Total Hadir:</span>
                              <span className="font-semibold text-white">{data.hadir} Siswa</span>
                            </p>
                            <p className="flex justify-between gap-4 text-rose-300">
                              <span>Tidak Hadir:</span>
                              <span className="font-semibold text-white">{data.tidakHadir} Siswa</span>
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="#4F46E5"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#attendanceGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Chart Footnote / Quick Legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-4 mt-2 border-t border-gray-100 text-[11px] text-gray-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-semibold text-gray-700">
                <span className="w-2.5 h-2.5 rounded-full bg-[#4F46E5]" />
                Persentase Kehadiran
              </span>
              <span className="text-gray-400">|</span>
              <span>Target Minimal Sekolah: <strong className="text-gray-800">85%</strong></span>
            </div>
            <Link href="/attendance" className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              Buka Rekap Detail <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Right: Today's Status Breakdown Donut Chart (4 cols) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-black text-base text-gray-900">Distribusi Hari Ini</h2>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                Real-Time
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-4">Rincian status seluruh siswa hari {currentDay}</p>

            {/* Donut Chart with Centered Metric */}
            <div className="relative w-44 h-44 mx-auto my-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attendanceDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={78}
                    paddingAngle={3}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                    cornerRadius={5}
                  >
                    {attendanceDonutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-2xl font-black text-gray-900 leading-none">
                  {attendanceToday.rate}%
                </span>
                <span className="text-[10px] font-semibold text-gray-400 mt-1 uppercase">
                  Hadir
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Legend with exact counts */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-gray-50/70">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="font-semibold text-gray-700">Hadir Tepat Waktu</span>
              </div>
              <span className="font-black text-gray-900">{attendanceToday.hadir} Siswa</span>
            </div>

            <div className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-gray-50/70">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="font-semibold text-gray-700">Terlambat</span>
              </div>
              <span className="font-black text-gray-900">{attendanceToday.terlambat} Siswa</span>
            </div>

            <div className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-gray-50/70">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span className="font-semibold text-gray-700">Izin</span>
              </div>
              <span className="font-black text-gray-900">{attendanceToday.izin} Siswa</span>
            </div>

            <div className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-gray-50/70">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="font-semibold text-gray-700">Sakit</span>
              </div>
              <span className="font-black text-gray-900">{attendanceToday.sakit} Siswa</span>
            </div>

            <div className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-gray-50/70">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="font-semibold text-gray-700">Alpa / Tanpa Keterangan</span>
              </div>
              <span className="font-black text-rose-600">{attendanceToday.alpa} Siswa</span>
            </div>
          </div>
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          CHART SECTION 2: CLASS COMPARISON & ACADEMIC RECAP
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Class Attendance Comparison BarChart (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-black text-base text-gray-900">Perbandingan Kehadiran Antar Kelas</h2>
                  <p className="text-xs text-gray-500">Persentase siswa hadir hari ini di setiap rombongan belajar</p>
                </div>
              </div>
              <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
                Hari Ini
              </span>
            </div>

            {/* Horizontal Bar Chart */}
            <div className="h-[280px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classComparisonData} layout="vertical" margin={{ top: 5, right: 30, left: 15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fill: "#9CA3AF", fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "#374151", fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} width={80} />
                  <RechartsTooltip
                    cursor={{ fill: "rgba(99, 102, 241, 0.05)" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-gray-900 text-white p-2.5 rounded-xl shadow-xl text-xs space-y-1">
                            <p className="font-black text-indigo-300">{item.name}</p>
                            <p className="font-bold text-emerald-300">Tingkat Hadir: {item.rate}%</p>
                            <p className="text-gray-300">{item.hadir} hadir dari {item.total} siswa</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="rate" radius={[0, 6, 6, 0]} barSize={16}>
                    {classComparisonData.map((entry, index) => (
                      <Cell
                        key={`bar-${index}`}
                        fill={entry.rate >= 85 ? "#10B981" : entry.rate >= 70 ? "#F59E0B" : "#EF4444"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-[11px] text-gray-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> ≥85% Bagus</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> 70-84% Waspada</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> &lt;70% Kritis</span>
            </div>
            <Link href="/attendance" className="font-bold text-indigo-600 hover:underline">
              Buka Presensi Kelas →
            </Link>
          </div>
        </div>

        {/* Right: Academic Performance Overview (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-black text-base text-gray-900">Performa Akademik</h2>
                  <p className="text-xs text-gray-500">Rekapitulasi nilai dan capaian KKM</p>
                </div>
              </div>
              <Link href="/grades" className="text-xs font-bold text-indigo-600 hover:underline">
                Kelola Nilai →
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 my-4">
              <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-100">
                <span className="text-[11px] font-semibold text-purple-700 block">Rata-rata Nilai</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-gray-900">{academicStats.averageScale4}</span>
                  <span className="text-xs text-gray-400 font-mono">/ 4.00</span>
                </div>
                <span className="text-[10px] text-gray-500 mt-1 block">Skala 100: {academicStats.averageScore}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-100">
                <span className="text-[11px] font-semibold text-rose-700 block">Butuh Evaluasi / KKM</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-rose-600">{academicStats.studentsNeedAttentionCount}</span>
                  <span className="text-xs text-rose-500 font-bold">Siswa</span>
                </div>
                <span className="text-[10px] text-gray-500 mt-1 block">Di bawah standar tuntas</span>
              </div>
            </div>

            {/* Top 3 Highest Performing Classes */}
            <div>
              <p className="text-xs font-bold text-gray-800 mb-2">3 Kelas dengan Capaian Nilai Tertinggi:</p>
              <div className="space-y-2">
                {academicStats.topClasses.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100/80 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black",
                        idx === 0 ? "bg-amber-400 text-amber-950" : idx === 1 ? "bg-gray-300 text-gray-800" : "bg-amber-700 text-white"
                      )}>
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-gray-900">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-gray-900">{item.scoreScale4}</span>
                      <span className="text-[10px] text-gray-400 ml-1 font-mono">({item.score})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px]">
            <span className="text-gray-500">Terhubung langsung dengan Rapor Digital</span>
            <Link href="/grades" className="text-indigo-600 font-bold hover:underline">
              Buka Penilaian Lengkap →
            </Link>
          </div>
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          OPERATIONAL FEEDS & QUICK ACCESS TILES
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        {/* 1. Pengajuan Izin & Sakit Terbaru (Wali Kelas / Admin Review) */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-[310px]">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-sm text-gray-900">Izin & Sakit Siswa</h3>
              </div>
              <Link href="/leave-requests" className="text-xs font-bold text-indigo-600 hover:underline">
                Kelola ({leaveStats.pendingCount})
              </Link>
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-[200px] pr-1 scrollbar-thin">
              {leaveStats.pendingList.map((req) => (
                <div key={req.id} className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-200/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-gray-900 truncate">{req.studentName}</span>
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase",
                      req.type === "Sakit" ? "bg-rose-100 text-rose-800" : "bg-purple-100 text-purple-800"
                    )}>
                      {req.type}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500">{req.className} • {req.daysCount} Hari ({req.startDate})</p>
                  <p className="text-[10px] text-gray-600 line-clamp-1 italic">"{req.reason}"</p>
                </div>
              ))}

              {leaveStats.pendingList.length === 0 && (
                <div className="py-10 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-gray-700">Semua Permohonan Selesai</p>
                  <p className="text-[10px] text-gray-400">Tidak ada pengajuan izin/sakit yang menunggu review.</p>
                </div>
              )}
            </div>
          </div>

          <Link
            href="/leave-requests"
            className="text-center text-xs font-bold text-indigo-600 hover:underline pt-2 border-t border-gray-100 block"
          >
            Lihat Semua Permohonan Izin →
          </Link>
        </div>

        {/* 2. Jadwal Mengajar Hari Ini */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-[310px]">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CalendarRange className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-sm text-gray-900">Jadwal Hari Ini</h3>
              </div>
              <Link href="/schedule" className="text-xs font-bold text-indigo-600 hover:underline">
                Lihat
              </Link>
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-[200px] pr-1 scrollbar-thin">
              {todaySchedules.map((sch: any, idx: number) => (
                <div key={sch.id || idx} className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-indigo-600">
                      {sch.startTime || "07:30"} - {sch.endTime || "09:00"}
                    </span>
                    <span className="text-[9px] font-bold bg-white px-1.5 py-0.5 rounded text-gray-600 border border-gray-200">
                      {sch.room || "R. Kelas"}
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-gray-900 truncate">
                    {sch.subject || sch.mataPelajaran || "Pelajaran"}
                  </h4>
                  <p className="text-[10px] text-gray-500 truncate">
                    {sch.className || "Semua Kelas"} • {sch.teacherName || "Guru Pengampu"}
                  </p>
                </div>
              ))}
              {todaySchedules.length === 0 && (
                <div className="py-10 text-center text-xs text-gray-400">
                  Tidak ada jam pelajaran aktif hari {currentDay}.
                </div>
              )}
            </div>
          </div>

          <Link
            href="/schedule"
            className="text-center text-xs font-bold text-indigo-600 hover:underline pt-2 border-t border-gray-100 block"
          >
            Buka Kalender & Jadwal →
          </Link>
        </div>

        {/* 3. Pengumuman Sekolah */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-[310px]">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-sm text-gray-900">Pengumuman</h3>
              </div>
              <Link href="/announcements" className="text-xs font-bold text-indigo-600 hover:underline">
                Kelola
              </Link>
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-[200px] pr-1 scrollbar-thin">
              {announcements.slice(0, 3).map((ann: any, idx: number) => (
                <div key={ann.id || idx} className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-amber-100 text-amber-800">
                      {ann.category || "Informasi"}
                    </span>
                    <span className="text-[9px] text-gray-400 font-medium">
                      {formatDateDisplay(ann.date || ann.createdAt, "Hari Ini")}
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-gray-900 line-clamp-1">
                    {ann.title || "Pengumuman Sekolah"}
                  </h4>
                  <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">
                    {cleanAnnouncementDesc(ann.desc || ann.content || ann.description || "Informasi kegiatan sekolah.")}
                  </p>
                </div>
              ))}
              {announcements.length === 0 && (
                <div className="py-10 text-center text-xs text-gray-400">
                  Belum ada pengumuman terbaru.
                </div>
              )}
            </div>
          </div>

          <Link
            href="/announcements"
            className="text-center text-xs font-bold text-indigo-600 hover:underline pt-2 border-t border-gray-100 block"
          >
            Buat Pengumuman Baru →
          </Link>
        </div>

        {/* 4. Log Aktivitas Real-Time */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-[310px]">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-gray-900">Aktivitas Terkini</h3>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Live
              </span>
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-[200px] pr-1 scrollbar-thin">
              {activities.slice(0, 4).map((act: any, idx: number) => (
                <div key={act.id || idx} className="p-2 rounded-xl bg-gray-50 border border-gray-100 flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                    {act.type === "payment" ? <Wallet className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h5 className="font-bold text-[11px] text-gray-900 truncate">
                      {act.title || act.studentName || "Aktivitas Sekolah"}
                    </h5>
                    <p className="text-[10px] text-gray-500 truncate">
                      {act.description || act.note || "Transaksi berhasil dicatat"}
                    </p>
                    <span className="text-[9px] text-gray-400">
                      {formatDateDisplay(act.timestamp || act.time || act.createdAt, "Baru saja")}
                    </span>
                  </div>
                </div>
              ))}
              {activities.length === 0 && (
                <div className="py-10 text-center text-xs text-gray-400">
                  Belum ada log aktivitas tercatat.
                </div>
              )}
            </div>
          </div>

          <Link
            href="/financial-reports"
            className="text-center text-xs font-bold text-indigo-600 hover:underline pt-2 border-t border-gray-100 block"
          >
            Lihat Riwayat Transaksi →
          </Link>
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SUPER ADMIN QUICK ACCESS NAVIGATION HUB
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-black text-base text-gray-900">Pusat Navigasi & Pintasan Super Admin</h2>
            <p className="text-xs text-gray-500">Akses cepat seluruh modul operasional dan pengaturan sistem sekolah</p>
          </div>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
            8 Modul Utama
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          
          <Link
            href="/data-siswa"
            className="group flex flex-col items-center p-3 rounded-xl hover:bg-purple-50/70 border border-transparent hover:border-purple-200 transition-all text-center"
          >
            <div className="w-11 h-11 rounded-xl bg-purple-50 group-hover:bg-[#531FFF] group-hover:text-white flex items-center justify-center text-[#531FFF] transition-colors shadow-xs mb-2">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-800 group-hover:text-[#531FFF]">Data Siswa</span>
            <span className="text-[10px] text-gray-400 mt-0.5">{students.length} Siswa</span>
          </Link>

          <Link
            href="/data-guru"
            className="group flex flex-col items-center p-3 rounded-xl hover:bg-blue-50/70 border border-transparent hover:border-blue-200 transition-all text-center"
          >
            <div className="w-11 h-11 rounded-xl bg-blue-50 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center text-blue-600 transition-colors shadow-xs mb-2">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-800 group-hover:text-blue-600">Data Guru</span>
            <span className="text-[10px] text-gray-400 mt-0.5">{teachers.length} Guru</span>
          </Link>

          <Link
            href="/attendance"
            className="group flex flex-col items-center p-3 rounded-xl hover:bg-emerald-50/70 border border-transparent hover:border-emerald-200 transition-all text-center"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-50 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center text-emerald-600 transition-colors shadow-xs mb-2">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-800 group-hover:text-emerald-600">Presensi Siswa</span>
            <span className="text-[10px] text-gray-400 mt-0.5">Face ID & QR</span>
          </Link>

          <Link
            href="/leave-requests"
            className="group flex flex-col items-center p-3 rounded-xl hover:bg-indigo-50/70 border border-transparent hover:border-indigo-200 transition-all text-center relative"
          >
            <div className="w-11 h-11 rounded-xl bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center text-indigo-600 transition-colors shadow-xs mb-2 relative">
              <ClipboardCheck className="w-5 h-5" />
              {leaveStats.pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                  {leaveStats.pendingCount}
                </span>
              )}
            </div>
            <span className="text-xs font-bold text-gray-800 group-hover:text-indigo-600">Izin & Sakit</span>
            <span className="text-[10px] text-amber-600 font-semibold mt-0.5">
              {leaveStats.pendingCount > 0 ? `${leaveStats.pendingCount} Review` : "Terkendali"}
            </span>
          </Link>

          <Link
            href="/teacher-attendance"
            className="group flex flex-col items-center p-3 rounded-xl hover:bg-teal-50/70 border border-transparent hover:border-teal-200 transition-all text-center"
          >
            <div className="w-11 h-11 rounded-xl bg-teal-50 group-hover:bg-teal-600 group-hover:text-white flex items-center justify-center text-teal-600 transition-colors shadow-xs mb-2">
              <ScanFace className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-800 group-hover:text-teal-600">Absensi Guru</span>
            <span className="text-[10px] text-gray-400 mt-0.5">Clock In/Out</span>
          </Link>

          <Link
            href="/grades"
            className="group flex flex-col items-center p-3 rounded-xl hover:bg-amber-50/70 border border-transparent hover:border-amber-200 transition-all text-center"
          >
            <div className="w-11 h-11 rounded-xl bg-amber-50 group-hover:bg-amber-600 group-hover:text-white flex items-center justify-center text-amber-600 transition-colors shadow-xs mb-2">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-800 group-hover:text-amber-600">Rapor & Nilai</span>
            <span className="text-[10px] text-gray-400 mt-0.5">Kurikulum</span>
          </Link>

          <Link
            href="/financial-reports"
            className="group flex flex-col items-center p-3 rounded-xl hover:bg-rose-50/70 border border-transparent hover:border-rose-200 transition-all text-center"
          >
            <div className="w-11 h-11 rounded-xl bg-rose-50 group-hover:bg-rose-600 group-hover:text-white flex items-center justify-center text-rose-600 transition-colors shadow-xs mb-2">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-800 group-hover:text-rose-600">Keuangan SPP</span>
            <span className="text-[10px] text-gray-400 mt-0.5">Arus Kas</span>
          </Link>

          <Link
            href="/announcements"
            className="group flex flex-col items-center p-3 rounded-xl hover:bg-orange-50/70 border border-transparent hover:border-orange-200 transition-all text-center"
          >
            <div className="w-11 h-11 rounded-xl bg-orange-50 group-hover:bg-orange-600 group-hover:text-white flex items-center justify-center text-orange-600 transition-colors shadow-xs mb-2">
              <Megaphone className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-800 group-hover:text-orange-600">Pengumuman</span>
            <span className="text-[10px] text-gray-400 mt-0.5">Warta Sekolah</span>
          </Link>

        </div>
      </div>

    </div>
  );
}
