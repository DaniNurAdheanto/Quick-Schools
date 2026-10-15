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
  Activity,
  CalendarDays
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
  Cell,
  Line,
  LineChart
} from "recharts";
import { formatRupiah } from "@/lib/spp-payments";
import { useSchoolProfile } from "@/context/SchoolProfileContext";
import { isSchoolOperationalDay, getOperationalDayStatus } from "@/lib/operational-days";
import { useUnifiedStudents } from "@/hooks/use-unified-students";
import { useUnifiedTeachers } from "@/hooks/use-unified-teachers";
import { subscribeLeaveRequests, getDatesBetween, LeaveRequest } from "@/lib/leave-requests-service";

interface AdminDashboardViewProps {
  userName: string;
  greeting: string;
  academicYear: string;
  currentDate: string;
  currentDay: string;
  userRole: string;
  setPreviewRole: (role: string | null) => void;
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
  const [activities] = useState<any[]>([]);
  const [teacherAttendance, setTeacherAttendance] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);

  // ─── UI & Interactive Filter States ───────────────────────────────────────
  const [selectedTimeRange, setSelectedTimeRange] = useState<"7d" | "14d" | "30d">("7d");
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("ALL");
  const [showRoleDropdown, setShowRoleDropdown] = useState<boolean>(false);

  // ─── Attendance Mode & Historical States ──────────────────────────────────
  const [selectedAttendanceMode, setSelectedAttendanceMode] = useState<"siswa" | "guru" | "komparasi">("siswa");
  const [selectedAdminAttendanceDate, setSelectedAdminAttendanceDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [selectedDistributionMode, setSelectedDistributionMode] = useState<"siswa" | "guru">("siswa");
  const [selectedDateStudentRecords, setSelectedDateStudentRecords] = useState<any[]>([]);
  const [selectedDateTeacherRecords, setSelectedDateTeacherRecords] = useState<any[]>([]);
  const [studentDailyTrends, setStudentDailyTrends] = useState<any[]>([]);
  const [teacherDailyTrends, setTeacherDailyTrends] = useState<any[]>([]);

  const operationalStatusForSelected = useMemo(
    () => getOperationalDayStatus(selectedAdminAttendanceDate, schoolProfile?.operationalDays || "Senin - Jumat"),
    [selectedAdminAttendanceDate, schoolProfile?.operationalDays]
  );

  useEffect(() => {
    setStudents(unifiedStudents);
  }, [unifiedStudents]);

  useEffect(() => {
    setTeachers(unifiedTeachers);
  }, [unifiedTeachers]);

  // ─── PostgreSQL Data Fetching ─────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const opDays = schoolProfile?.operationalDays || "Senin - Jumat";
        const [
          classesRes,
          attendanceRes,
          teacherAttendanceRes,
          dateAttendanceRes,
          dateTeacherAttendanceRes,
          announcementsRes,
          paymentsRes,
          schedulesRes,
          gradesRes
        ] = await Promise.allSettled([
          fetch("/api/classes").then((r) => r.json()),
          fetch(`/api/attendance?range=30d&operationalDays=${encodeURIComponent(opDays)}`).then((r) => r.json()),
          fetch(`/api/teacher-attendance?range=30d&operationalDays=${encodeURIComponent(opDays)}`).then((r) => r.json()),
          fetch(`/api/attendance?date=${selectedAdminAttendanceDate}&operationalDays=${encodeURIComponent(opDays)}`).then((r) => r.json()),
          fetch(`/api/teacher-attendance?date=${selectedAdminAttendanceDate}&operationalDays=${encodeURIComponent(opDays)}`).then((r) => r.json()),
          fetch("/api/announcements").then((r) => r.json()),
          fetch("/api/payments").then((r) => r.json()),
          fetch("/api/schedules").then((r) => r.json()),
          fetch("/api/grades").then((r) => r.json()),
        ]);

        if (!isMounted) return;

        if (classesRes.status === "fulfilled" && classesRes.value.classes) {
          setClasses(classesRes.value.classes);
        }
        if (attendanceRes.status === "fulfilled") {
          const val = attendanceRes.value;
          const atts = val.records || val.attendance || [];
          setAttendance(atts);
          if (val.dailyTrends) setStudentDailyTrends(val.dailyTrends);
        }
        if (teacherAttendanceRes.status === "fulfilled") {
          const val = teacherAttendanceRes.value;
          const tAtts = val.records || val.attendance || [];
          setTeacherAttendance(tAtts);
          if (val.dailyTrends) setTeacherDailyTrends(val.dailyTrends);
        }
        if (dateAttendanceRes.status === "fulfilled" && dateAttendanceRes.value.success) {
          setSelectedDateStudentRecords(dateAttendanceRes.value.records || []);
        }
        if (dateTeacherAttendanceRes.status === "fulfilled" && dateTeacherAttendanceRes.value.success) {
          setSelectedDateTeacherRecords(dateTeacherAttendanceRes.value.records || []);
        }
        if (announcementsRes.status === "fulfilled" && announcementsRes.value.announcements) {
          setAnnouncements(announcementsRes.value.announcements);
        }
        if (paymentsRes.status === "fulfilled" && paymentsRes.value.bills) {
          setBills(paymentsRes.value.bills);
        }
        if (schedulesRes.status === "fulfilled" && schedulesRes.value.schedules) {
          setSchedules(schedulesRes.value.schedules);
        }
        if (gradesRes.status === "fulfilled" && gradesRes.value.grades) {
          setGrades(gradesRes.value.grades);
        }
      } catch (e) {
        console.warn("Error loading admin dashboard data from PostgreSQL:", e);
      }
    };

    loadData();
    const interval = setInterval(loadData, 15000);

    const unsubLeave = subscribeLeaveRequests((requests) => {
      if (isMounted) setLeaveRequests(requests);
    });

    return () => {
      isMounted = false;
      clearInterval(interval);
      unsubLeave();
    };
  }, [selectedAdminAttendanceDate, schoolProfile?.operationalDays]);

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

  // Synthesize complete attendance records (Firestore attendance + roles attendance_record + leave_requests)
  const effectiveAttendance = useMemo(() => {
    const map = new Map<string, any>();

    // 1. Direct attendance records
    attendance.forEach((r: any) => {
      if (r && r.id) {
        const rawStatus = (r.status || "").toLowerCase().trim();
        const normStatus = (rawStatus === "leave_request" || r.type === "leave_request" || rawStatus === "disetujui")
          ? (r.leaveType === "Sakit" || r.type === "Sakit" ? "Sakit" : "Izin")
          : (r.status || "Hadir");

        map.set(r.id, {
          ...r,
          status: normStatus
        });
      }
    });

    // 2. Synthesize leave requests (Izin & Sakit)
    leaveRequests.forEach((lr: any) => {
      if (lr.status === "Ditolak") return;
      const dates = getDatesBetween(lr.startDate || lr.date, lr.endDate || lr.startDate || lr.date);
      const studentId = lr.studentId || lr.nisn || lr.studentUid || "";
      const leaveType = lr.type === "Sakit" ? "Sakit" : "Izin";

      dates.forEach((dateStr) => {
        const docKey = `leave_${lr.id}_${dateStr}`;
        let alreadyHasPresentRecord = false;
        for (const existing of map.values()) {
          if (
            existing.date === dateStr &&
            (existing.studentId === studentId || existing.nisn === studentId || (existing.studentName && lr.studentName && existing.studentName.toLowerCase().trim() === lr.studentName.toLowerCase().trim()))
          ) {
            if (["hadir", "terlambat"].includes((existing.status || "").toLowerCase())) {
              alreadyHasPresentRecord = true;
            } else {
              existing.status = leaveType;
              existing.notes = lr.reason ? `Permohonan ${leaveType}: ${lr.reason}` : existing.notes;
              alreadyHasPresentRecord = true;
            }
          }
        }

        if (!alreadyHasPresentRecord) {
          map.set(docKey, {
            id: docKey,
            studentId,
            studentName: lr.studentName || "",
            className: lr.className || "",
            date: dateStr,
            status: leaveType,
            notes: lr.reason ? `Permohonan ${leaveType}: ${lr.reason}` : "",
            time: "07:00",
            source: "permit"
          });
        }
      });
    });

    return Array.from(map.values());
  }, [attendance, leaveRequests]);

  // Selected Date's student attendance stats (synchronized with PostgreSQL & Menu Absensi Siswa)
  const attendanceToday = useMemo(() => {
    const isTargetToday = selectedAdminAttendanceDate === todayDateStr;
    const targetDate = selectedAdminAttendanceDate || todayDateStr;
    const isOp = operationalStatusForSelected.isOperational;
    const now = new Date();
    const isPastDate = targetDate < todayDateStr;
    const isPastCutoff = isPastDate || (isTargetToday && now.getHours() >= 12);

    const map = new Map<string, any>();
    selectedDateStudentRecords.forEach((r) => {
      const key = r.studentId || r.nisn || r.id;
      map.set(key, r);
    });
    effectiveAttendance.forEach((r) => {
      if (r.date === targetDate || r.date?.startsWith(targetDate)) {
        const key = r.studentId || r.nisn || r.id;
        if (!map.has(key)) map.set(key, r);
      }
    });

    let targetStudents = filteredStudents;
    const totalStudents = Math.max(targetStudents.length, 1);
    let hadir = 0;
    let terlambat = 0;
    let sakit = 0;
    let izin = 0;
    let alpa = 0;
    let belumAbsen = 0;

    targetStudents.forEach((student: any) => {
      const sId = (student.id || "").toLowerCase().trim();
      const sNisn = (student.nisn || "").toLowerCase().trim();
      const sName = (student.name || "").toLowerCase().trim();

      let record: any = null;
      for (const val of map.values()) {
        const aId = (val.studentId || val.id || "").toLowerCase().trim();
        const aNisn = (val.nisn || "").toLowerCase().trim();
        const aName = (val.studentName || val.name || val.fullName || "").toLowerCase().trim();
        if (
          (sId && (aId === sId || aId.includes(sId) || sId.includes(aId))) ||
          (sNisn && (aNisn === sNisn || aId === sNisn)) ||
          (sName && aName && (sName === aName || sName.includes(aName) || aName.includes(sName)))
        ) {
          record = val;
          break;
        }
      }

      if (record) {
        const st = (record.status || "").toLowerCase().trim();
        if (st === "hadir") {
          hadir++;
        } else if (st === "terlambat") {
          terlambat++;
          hadir++;
        } else if (st === "sakit") {
          sakit++;
        } else if (st === "izin") {
          izin++;
        } else if (["alpa", "ditolak", "alpha"].includes(st)) {
          alpa++;
        } else {
          if (!isOp) belumAbsen++;
          else if (isPastCutoff) alpa++;
          else belumAbsen++;
        }
      } else {
        if (!isOp) {
          belumAbsen++;
        } else if (isPastCutoff) {
          alpa++;
        } else {
          belumAbsen++;
        }
      }
    });

    const rateNumber = isOp && totalStudents > 0
      ? Math.min(100, Math.round((hadir / Math.max(1, totalStudents)) * 1000) / 10)
      : 0;

    return {
      hadir: Math.max(0, hadir - terlambat), // Hadir Tepat Waktu
      terlambat,
      sakit,
      izin,
      alpa,
      belumAbsen,
      tidakHadir: sakit + izin + alpa,
      rate: rateNumber,
      totalMarked: hadir + sakit + izin + alpa,
      baseStudents: totalStudents,
      isOperational: isOp,
      targetDate,
      isTargetToday,
    };
  }, [
    selectedAdminAttendanceDate,
    todayDateStr,
    operationalStatusForSelected.isOperational,
    selectedDateStudentRecords,
    effectiveAttendance,
    filteredStudents,
  ]);

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

  // Selected Date's teacher attendance stats (connected directly to PostgreSQL)
  const teacherAttendanceToday = useMemo(() => {
    const isTargetToday = selectedAdminAttendanceDate === todayDateStr;
    const targetDate = selectedAdminAttendanceDate || todayDateStr;
    const isOp = operationalStatusForSelected.isOperational;
    const now = new Date();
    const isPastDate = targetDate < todayDateStr;
    const isPastCutoff = isPastDate || (isTargetToday && now.getHours() >= 12);

    const map = new Map<string, any>();
    selectedDateTeacherRecords.forEach((r) => {
      const key = r.teacherId || r.nip || r.id;
      map.set(key, r);
    });
    teacherAttendance.forEach((r) => {
      if (r.date === targetDate || r.date?.startsWith(targetDate)) {
        const key = r.teacherId || r.nip || r.id;
        if (!map.has(key)) map.set(key, r);
      }
    });

    const totalTeachers = teachers.length || unifiedTeachers.length || 1;
    let hadir = 0;
    let tepatWaktu = 0;
    let terlambat = 0;
    let izinSakit = 0;
    let alpa = 0;
    let belumPresensi = 0;

    teachers.forEach((tc) => {
      const tId = (tc.id || tc.uid || "").toLowerCase().trim();
      const tNip = (tc.nip || "").toLowerCase().trim();
      const tName = (tc.name || tc.fullName || "").toLowerCase().trim();

      let rec: any = null;
      for (const val of map.values()) {
        const rId = (val.teacherId || val.id || "").toLowerCase().trim();
        const rNip = (val.nip || "").toLowerCase().trim();
        const rName = (val.teacherName || val.name || val.fullName || "").toLowerCase().trim();
        if (
          (tId && (rId === tId || rId.includes(tId) || tId.includes(rId))) ||
          (tNip && tNip !== "-" && (rNip === tNip || rId === tNip)) ||
          (tName && rName && (tName === rName || tName.includes(rName) || rName.includes(tName)))
        ) {
          rec = val;
          break;
        }
      }

      if (rec) {
        const st = (rec.status || "").toLowerCase().trim();
        if (st === "hadir" || (rec.clockIn && st !== "alpa")) {
          hadir++;
          if (rec.clockIn?.status === "Terlambat" || st === "terlambat") {
            terlambat++;
          } else {
            tepatWaktu++;
          }
        } else if (st === "terlambat") {
          hadir++;
          terlambat++;
        } else if (["izin", "sakit", "cuti"].includes(st)) {
          izinSakit++;
        } else if (st === "alpa") {
          alpa++;
        } else {
          belumPresensi++;
        }
      } else {
        if (!isOp) {
          belumPresensi++;
        } else if (isPastCutoff) {
          alpa++;
        } else {
          belumPresensi++;
        }
      }
    });

    const rate = isOp && totalTeachers > 0
      ? Math.min(100, Math.round((hadir / totalTeachers) * 100))
      : 0;

    return {
      hadir,
      tepatWaktu,
      terlambat,
      izinSakit,
      alpa,
      belumPresensi,
      total: totalTeachers,
      rate,
      isOperational: isOp,
      targetDate,
      isTargetToday,
    };
  }, [
    selectedAdminAttendanceDate,
    todayDateStr,
    operationalStatusForSelected.isOperational,
    selectedDateTeacherRecords,
    teacherAttendance,
    teachers,
    unifiedTeachers.length,
  ]);

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
    const days: {
      date: string;
      fullDate: string;
      rate: number;
      hadir: number;
      terlambat: number;
      izin: number;
      sakit: number;
      alpa: number;
      tidakHadir: number;
      total: number;
    }[] = [];
    const now = new Date();

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().slice(0, 10);
      const dayName = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
      const isOp = isSchoolOperationalDay(dStr, schoolProfile?.operationalDays || "Senin - Jumat");

      const sTrend = selectedClassFilter === "ALL" ? studentDailyTrends.find((t: any) => t.fullDate === dStr) : null;

      if (dStr === todayDateStr && selectedClassFilter === "ALL") {
        const totalHadir = attendanceToday.hadir + attendanceToday.terlambat;
        const totalTidakHadir = attendanceToday.sakit + attendanceToday.izin + (isOp ? attendanceToday.alpa : 0);
        days.push({
          date: dayName,
          fullDate: dStr,
          rate: attendanceToday.rate,
          hadir: totalHadir,
          terlambat: attendanceToday.terlambat,
          izin: attendanceToday.izin,
          sakit: attendanceToday.sakit,
          alpa: isOp ? attendanceToday.alpa : 0,
          tidakHadir: totalTidakHadir,
          total: totalHadir + totalTidakHadir
        });
      } else if (sTrend) {
        days.push({
          date: dayName,
          fullDate: dStr,
          rate: sTrend.rate,
          hadir: sTrend.hadir,
          terlambat: sTrend.terlambat || 0,
          izin: sTrend.izin || 0,
          sakit: sTrend.sakit || 0,
          alpa: sTrend.alpa || 0,
          tidakHadir: (sTrend.izin || 0) + (sTrend.sakit || 0) + (sTrend.alpa || 0),
          total: sTrend.total || sTrend.base || 0
        });
      } else {
        let h = 0;
        let t = 0;
        let s = 0;
        let iz = 0;
        let a = 0;

        const dayRecords = effectiveAttendance.filter((rec: any) => {
          const isMatch = rec.date === dStr || rec.date?.startsWith(dStr);
          if (!isMatch) return false;
          if (selectedClassFilter === "ALL") return true;
          const c = (rec.className || rec.classId || "").toLowerCase().trim();
          const target = selectedClassFilter.toLowerCase().trim();
          return c === target || c.replace(/\s+/g, "") === target.replace(/\s+/g, "");
        });

        dayRecords.forEach((rec: any) => {
          const st = (rec.status || "").toLowerCase().trim();
          if (st === "hadir") h++;
          else if (st === "terlambat") { t++; h++; }
          else if (st === "sakit") s++;
          else if (st === "izin") iz++;
          else if (isOp) a++;
        });

        if (isOp && dayRecords.length > 0 && filteredStudents.length > dayRecords.length) {
          a += (filteredStudents.length - dayRecords.length);
        }

        const totalHadir = h;
        const totalTidakHadir = s + iz + a;
        const base = filteredStudents.length || (totalHadir + totalTidakHadir) || 1;
        const pct = isOp && (totalHadir + totalTidakHadir) > 0 ? Math.min(100, Math.round((totalHadir / Math.max(1, base)) * 100)) : 0;

        days.push({
          date: dayName,
          fullDate: dStr,
          rate: pct,
          hadir: totalHadir,
          terlambat: t,
          izin: iz,
          sakit: s,
          alpa: a,
          tidakHadir: totalTidakHadir,
          total: totalHadir + totalTidakHadir
        });
      }
    }
    return days;
  }, [
    effectiveAttendance,
    filteredStudents.length,
    selectedTimeRange,
    selectedClassFilter,
    todayDateStr,
    attendanceToday,
    studentDailyTrends,
    schoolProfile?.operationalDays
  ]);

  // Multi-day Teacher Attendance Trend Data (7, 14, or 30 days)
  const teacherAttendanceTrendData = useMemo(() => {
    const daysCount = selectedTimeRange === "30d" ? 30 : selectedTimeRange === "14d" ? 14 : 7;
    const days: {
      date: string;
      fullDate: string;
      rate: number;
      hadir: number;
      tepatWaktu: number;
      terlambat: number;
      izinSakit: number;
      alpa: number;
      total: number;
    }[] = [];
    const now = new Date();
    const countTeachers = teachers.length || unifiedTeachers.length || 1;

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().slice(0, 10);
      const dayName = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
      const isOp = isSchoolOperationalDay(dStr, schoolProfile?.operationalDays || "Senin - Jumat");

      if (dStr === todayDateStr) {
        days.push({
          date: dayName,
          fullDate: dStr,
          rate: teacherAttendanceToday.rate,
          hadir: teacherAttendanceToday.hadir,
          tepatWaktu: teacherAttendanceToday.tepatWaktu,
          terlambat: teacherAttendanceToday.terlambat,
          izinSakit: teacherAttendanceToday.izinSakit,
          alpa: teacherAttendanceToday.alpa,
          total: teacherAttendanceToday.total
        });
      } else {
        const tTrend = teacherDailyTrends.find((t: any) => t.fullDate === dStr);
        if (tTrend) {
          days.push({
            date: dayName,
            fullDate: dStr,
            rate: tTrend.rate,
            hadir: tTrend.hadir,
            tepatWaktu: Math.max(0, (tTrend.hadir || 0) - (tTrend.terlambat || 0)),
            terlambat: tTrend.terlambat || 0,
            izinSakit: (tTrend.izin || 0) + (tTrend.sakit || 0),
            alpa: tTrend.alpa || 0,
            total: tTrend.total || countTeachers
          });
        } else {
          const tRecords = teacherAttendance.filter((r: any) => r.date === dStr || r.date?.startsWith(dStr));
          let h = 0;
          let tw = 0;
          let ter = 0;
          let is = 0;
          let a = 0;

          tRecords.forEach((r: any) => {
            const st = (r.status || "").toLowerCase().trim();
            if (st === "hadir" || (r.clockIn && st !== "alpa")) {
              h++;
              if (r.clockIn?.status === "Terlambat" || st === "terlambat") {
                ter++;
              } else {
                tw++;
              }
            } else if (st === "terlambat") {
              h++;
              ter++;
            } else if (["izin", "sakit", "cuti"].includes(st)) {
              is++;
            } else if (st === "alpa") {
              a++;
            }
          });

          if (isOp && countTeachers > tRecords.length) {
            a += (countTeachers - tRecords.length);
          }

          const pct = isOp && countTeachers > 0 ? Math.min(100, Math.round((h / countTeachers) * 100)) : 0;

          days.push({
            date: dayName,
            fullDate: dStr,
            rate: pct,
            hadir: h,
            tepatWaktu: tw,
            terlambat: ter,
            izinSakit: is,
            alpa: a,
            total: countTeachers
          });
        }
      }
    }
    return days;
  }, [
    teacherAttendance,
    teachers.length,
    unifiedTeachers.length,
    selectedTimeRange,
    todayDateStr,
    teacherAttendanceToday,
    teacherDailyTrends,
    schoolProfile?.operationalDays
  ]);

  // Comparative Attendance Data (Siswa vs Guru)
  const comparativeAttendanceData = useMemo(() => {
    return attendanceTrendData.map((sItem) => {
      const tItem = teacherAttendanceTrendData.find((t) => t.fullDate === sItem.fullDate);
      return {
        date: sItem.date,
        fullDate: sItem.fullDate,
        siswaRate: sItem.rate,
        guruRate: tItem ? tItem.rate : 0,
        siswaHadir: sItem.hadir,
        guruHadir: tItem ? tItem.hadir : 0,
        guruTepatWaktu: tItem ? tItem.tepatWaktu : 0,
        guruTerlambat: tItem ? tItem.terlambat : 0,
      };
    });
  }, [attendanceTrendData, teacherAttendanceTrendData]);

  // Selected Date's Status Donut Chart Data (supports Siswa vs Guru toggle)
  const attendanceDonutData = useMemo(() => {
    if (selectedDistributionMode === "guru") {
      if (teacherAttendanceToday.total === 0 || (teacherAttendanceToday.hadir + teacherAttendanceToday.izinSakit + teacherAttendanceToday.alpa) === 0) {
        return [
          { name: "Belum Ada Data", value: 1, color: "#E2E8F0" }
        ];
      }
      return [
        { name: "Hadir Tepat Waktu", value: teacherAttendanceToday.tepatWaktu, color: "#10B981" },
        { name: "Terlambat", value: teacherAttendanceToday.terlambat, color: "#F59E0B" },
        { name: "Izin / Sakit / Cuti", value: teacherAttendanceToday.izinSakit, color: "#8B5CF6" },
        { name: "Alpa / Tanpa Keterangan", value: teacherAttendanceToday.alpa, color: "#EF4444" },
        { name: "Belum Presensi", value: teacherAttendanceToday.belumPresensi, color: "#94A3B8" }
      ].filter((item) => item.value > 0);
    }

    if (attendanceToday.totalMarked === 0 && attendanceToday.belumAbsen === 0) {
      return [
        { name: "Belum Ada Data", value: 1, color: "#E2E8F0" }
      ];
    }
    return [
      { name: "Hadir Tepat Waktu", value: attendanceToday.hadir, color: "#10B981" },
      { name: "Terlambat", value: attendanceToday.terlambat, color: "#F59E0B" },
      { name: "Sakit", value: attendanceToday.sakit, color: "#3B82F6" },
      { name: "Izin", value: attendanceToday.izin, color: "#8B5CF6" },
      { name: "Alpa", value: attendanceToday.alpa, color: "#EF4444" },
      { name: "Belum Absen", value: attendanceToday.belumAbsen, color: "#94A3B8" }
    ].filter((item) => item.value > 0);
  }, [selectedDistributionMode, attendanceToday, teacherAttendanceToday]);

  // Class by Class Comparison (Bar Chart)
  const classComparisonData = useMemo(() => {
    const classList = classes.length > 0 ? classes : [
      { name: "10 MIPA 1" },
      { name: "10 MIPA 2" },
      { name: "11 MIPA 1" },
      { name: "12 IPA 1" },
      { name: "12 IPS 1" }
    ];

    return classList.map((c: any) => {
      const cName = c.name || c.className || "Kelas";
      const cClean = cName.toLowerCase().trim();
      const cNoSpace = cClean.replace(/\s+/g, "");

      const studentsInClass = students.filter((s) => {
        const sc = (s.className || s.classId || s.class || s.kelas || "").toLowerCase().trim();
        return sc === cClean || sc.replace(/\s+/g, "") === cNoSpace;
      });

      let hadirCount = 0;
      let izinCount = 0;
      let sakitCount = 0;
      let alpaCount = 0;

      studentsInClass.forEach((st: any) => {
        const sId = (st.id || "").toLowerCase().trim();
        const sNisn = (st.nisn || "").toLowerCase().trim();
        const sName = (st.name || "").toLowerCase().trim();

        const record = effectiveAttendance.find((a: any) => {
          const isToday = a.date === todayDateStr || a.date?.startsWith(todayDateStr);
          if (!isToday) return false;

          const aId = (a.studentId || a.id || "").toLowerCase().trim();
          const aNisn = (a.nisn || "").toLowerCase().trim();
          const aName = (a.studentName || "").toLowerCase().trim();

          return (
            (sId && (aId === sId || aId.includes(sId) || sId.includes(aId))) ||
            (sNisn && (aNisn === sNisn || aId === sNisn)) ||
            (sName && aName && (sName === aName || sName.includes(aName) || aName.includes(sName)))
          );
        });

        if (record) {
          const stStatus = (record.status || "").toLowerCase().trim();
          if (["hadir", "terlambat"].includes(stStatus)) hadirCount++;
          else if (stStatus === "izin") izinCount++;
          else if (stStatus === "sakit") sakitCount++;
          else alpaCount++;
        } else {
          alpaCount++;
        }
      });

      const base = studentsInClass.length || 1;
      const rate = studentsInClass.length > 0 ? Math.min(100, Math.round((hadirCount / base) * 100)) : 0;

      return {
        name: cName,
        rate,
        total: studentsInClass.length,
        hadir: hadirCount,
        izin: izinCount,
        sakit: sakitCount,
        alpa: alpaCount
      };
    }).slice(0, 8); // Top 8 classes for clear visualization
  }, [classes, students, effectiveAttendance, todayDateStr]);

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
          CHART SECTION 1: RIWAYAT & TREN PRESENSI SISWA & GURU
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Multi-Day Attendance Trend Chart (8 cols) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center font-bold transition-colors",
                    selectedAttendanceMode === "siswa" ? "bg-indigo-50 text-indigo-600" :
                    selectedAttendanceMode === "guru" ? "bg-emerald-50 text-emerald-600" : "bg-purple-50 text-purple-600"
                  )}>
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-black text-base text-gray-900">
                      {selectedAttendanceMode === "siswa" && "Tren Riwayat Presensi Siswa"}
                      {selectedAttendanceMode === "guru" && "Tren Riwayat Presensi Guru & Tendik"}
                      {selectedAttendanceMode === "komparasi" && "Komparasi Tren Kehadiran: Siswa vs Guru"}
                    </h2>
                    <p className="text-xs text-gray-500">
                      Dinamika tingkat kehadiran harian ({selectedTimeRange === "30d" ? "30 hari" : selectedTimeRange === "14d" ? "14 hari" : "7 hari"} terakhir) terhubung ke database
                    </p>
                  </div>
                </div>
              </div>

              {/* Mode Toggle & Average Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex p-0.5 rounded-lg bg-gray-100 border border-gray-200 text-xs font-bold">
                  <button
                    onClick={() => setSelectedAttendanceMode("siswa")}
                    className={cn(
                      "px-2.5 py-1 rounded-md transition-all cursor-pointer",
                      selectedAttendanceMode === "siswa" ? "bg-indigo-600 text-white shadow-xs" : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    Siswa
                  </button>
                  <button
                    onClick={() => setSelectedAttendanceMode("guru")}
                    className={cn(
                      "px-2.5 py-1 rounded-md transition-all cursor-pointer",
                      selectedAttendanceMode === "guru" ? "bg-emerald-600 text-white shadow-xs" : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    Guru & Tendik
                  </button>
                  <button
                    onClick={() => setSelectedAttendanceMode("komparasi")}
                    className={cn(
                      "px-2.5 py-1 rounded-md transition-all cursor-pointer",
                      selectedAttendanceMode === "komparasi" ? "bg-purple-600 text-white shadow-xs" : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    Komparasi
                  </button>
                </div>

                {selectedAttendanceMode === "siswa" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    Rata-rata: {Math.round(attendanceTrendData.reduce((acc, d) => acc + d.rate, 0) / Math.max(1, attendanceTrendData.filter(d => d.rate > 0).length)) || 0}%
                  </span>
                )}
                {selectedAttendanceMode === "guru" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Rata-rata: {Math.round(teacherAttendanceTrendData.reduce((acc, d) => acc + d.rate, 0) / Math.max(1, teacherAttendanceTrendData.filter(d => d.rate > 0).length)) || 0}%
                  </span>
                )}
                {selectedAttendanceMode === "komparasi" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-100">
                    Siswa: {Math.round(attendanceTrendData.reduce((acc, d) => acc + d.rate, 0) / Math.max(1, attendanceTrendData.filter(d => d.rate > 0).length)) || 0}% | Guru: {Math.round(teacherAttendanceTrendData.reduce((acc, d) => acc + d.rate, 0) / Math.max(1, teacherAttendanceTrendData.filter(d => d.rate > 0).length)) || 0}%
                  </span>
                )}
              </div>
            </div>

            {/* Dynamic Charts: Student / Teacher / Comparison */}
            <div className="h-[280px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                {selectedAttendanceMode === "siswa" ? (
                  <AreaChart data={attendanceTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.35} />
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
                            <div className="bg-gray-900/95 backdrop-blur-md text-white p-3.5 rounded-xl shadow-xl text-xs space-y-2 border border-white/10 min-w-[200px]">
                              <p className="font-extrabold text-indigo-300 pb-1 border-b border-white/10">{label}</p>
                              <div className="space-y-1.5">
                                <p className="flex justify-between gap-4 text-emerald-400 font-bold">
                                  <span>Tingkat Hadir Siswa:</span>
                                  <span>{data.rate}% ({data.hadir} Siswa)</span>
                                </p>
                                <p className="flex justify-between gap-4 text-purple-300 font-medium">
                                  <span>Izin:</span>
                                  <span className="font-bold text-white">{data.izin} Siswa</span>
                                </p>
                                <p className="flex justify-between gap-4 text-blue-300 font-medium">
                                  <span>Sakit:</span>
                                  <span className="font-bold text-white">{data.sakit} Siswa</span>
                                </p>
                                <p className="flex justify-between gap-4 text-rose-300 font-medium">
                                  <span>Alpa / Tanpa Ket.:</span>
                                  <span className="font-bold text-white">{data.alpa} Siswa</span>
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
                      name="Tingkat Hadir Siswa"
                      stroke="#4F46E5"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#attendanceGradient)"
                    />
                    <Line
                      type="monotone"
                      dataKey="izin"
                      name="Izin"
                      stroke="#8B5CF6"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#8B5CF6" }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="sakit"
                      name="Sakit"
                      stroke="#3B82F6"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#3B82F6" }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="alpa"
                      name="Alpa"
                      stroke="#EF4444"
                      strokeWidth={2}
                      strokeDasharray="3 3"
                      dot={{ r: 2.5, fill: "#EF4444" }}
                      activeDot={{ r: 4 }}
                    />
                  </AreaChart>
                ) : selectedAttendanceMode === "guru" ? (
                  <AreaChart data={teacherAttendanceTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="teacherAttendanceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
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
                      cursor={{ stroke: "#10B981", strokeWidth: 1.5, strokeDasharray: "4 4" }}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-gray-900/95 backdrop-blur-md text-white p-3.5 rounded-xl shadow-xl text-xs space-y-2 border border-white/10 min-w-[210px]">
                              <p className="font-extrabold text-emerald-300 pb-1 border-b border-white/10">{label}</p>
                              <div className="space-y-1.5">
                                <p className="flex justify-between gap-4 text-emerald-400 font-bold">
                                  <span>Tingkat Hadir Guru:</span>
                                  <span>{data.rate}% ({data.hadir} Guru)</span>
                                </p>
                                <p className="flex justify-between gap-4 text-emerald-300 font-medium">
                                  <span>Tepat Waktu:</span>
                                  <span className="font-bold text-white">{data.tepatWaktu} Guru</span>
                                </p>
                                <p className="flex justify-between gap-4 text-amber-300 font-medium">
                                  <span>Terlambat:</span>
                                  <span className="font-bold text-white">{data.terlambat} Guru</span>
                                </p>
                                <p className="flex justify-between gap-4 text-purple-300 font-medium">
                                  <span>Izin / Sakit / Cuti:</span>
                                  <span className="font-bold text-white">{data.izinSakit} Guru</span>
                                </p>
                                <p className="flex justify-between gap-4 text-rose-300 font-medium">
                                  <span>Alpa / Belum Presensi:</span>
                                  <span className="font-bold text-white">{data.alpa} Guru</span>
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
                      name="Tingkat Hadir Guru"
                      stroke="#10B981"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#teacherAttendanceGradient)"
                    />
                    <Line
                      type="monotone"
                      dataKey="tepatWaktu"
                      name="Tepat Waktu"
                      stroke="#059669"
                      strokeWidth={2}
                      dot={{ r: 2.5, fill: "#059669" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="terlambat"
                      name="Terlambat"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      dot={{ r: 2.5, fill: "#F59E0B" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="izinSakit"
                      name="Izin/Sakit/Cuti"
                      stroke="#8B5CF6"
                      strokeWidth={2}
                      dot={{ r: 2.5, fill: "#8B5CF6" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="alpa"
                      name="Alpa"
                      stroke="#EF4444"
                      strokeWidth={2}
                      strokeDasharray="3 3"
                      dot={{ r: 2.5, fill: "#EF4444" }}
                    />
                  </AreaChart>
                ) : (
                  <LineChart data={comparativeAttendanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-gray-900/95 backdrop-blur-md text-white p-3.5 rounded-xl shadow-xl text-xs space-y-2 border border-white/10 min-w-[210px]">
                              <p className="font-extrabold text-purple-300 pb-1 border-b border-white/10">{label}</p>
                              <div className="space-y-1.5">
                                <p className="flex justify-between gap-4 text-indigo-400 font-bold">
                                  <span>Kehadiran Siswa:</span>
                                  <span>{data.siswaRate}% ({data.siswaHadir} Siswa)</span>
                                </p>
                                <p className="flex justify-between gap-4 text-emerald-400 font-bold">
                                  <span>Kehadiran Guru:</span>
                                  <span>{data.guruRate}% ({data.guruHadir} Guru)</span>
                                </p>
                                <p className="flex justify-between gap-4 text-gray-300 text-[10px]">
                                  <span>Guru Tepat Waktu:</span>
                                  <span>{data.guruTepatWaktu} • Terlambat: {data.guruTerlambat}</span>
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="siswaRate"
                      name="Kehadiran Siswa (%)"
                      stroke="#4F46E5"
                      strokeWidth={3}
                      dot={{ r: 3.5, fill: "#4F46E5" }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="guruRate"
                      name="Kehadiran Guru (%)"
                      stroke="#10B981"
                      strokeWidth={3}
                      dot={{ r: 3.5, fill: "#10B981" }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart Footnote / Quick Legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-4 mt-2 border-t border-gray-100 text-[11px] text-gray-500">
            {selectedAttendanceMode === "siswa" ? (
              <div className="flex flex-wrap items-center gap-3.5">
                <span className="flex items-center gap-1.5 font-semibold text-gray-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4F46E5]" />
                  Kehadiran Siswa (%)
                </span>
                <span className="flex items-center gap-1.5 font-semibold text-purple-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" />
                  Izin
                </span>
                <span className="flex items-center gap-1.5 font-semibold text-blue-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
                  Sakit
                </span>
                <span className="flex items-center gap-1.5 font-semibold text-rose-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                  Alpa
                </span>
              </div>
            ) : selectedAttendanceMode === "guru" ? (
              <div className="flex flex-wrap items-center gap-3.5">
                <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                  Kehadiran Guru (%)
                </span>
                <span className="flex items-center gap-1.5 font-semibold text-emerald-900">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#059669]" />
                  Tepat Waktu
                </span>
                <span className="flex items-center gap-1.5 font-semibold text-amber-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                  Terlambat
                </span>
                <span className="flex items-center gap-1.5 font-semibold text-purple-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" />
                  Izin/Sakit/Cuti
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3.5">
                <span className="flex items-center gap-1.5 font-bold text-indigo-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4F46E5]" />
                  Tingkat Hadir Siswa (%)
                </span>
                <span className="flex items-center gap-1.5 font-bold text-emerald-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                  Tingkat Hadir Guru (%)
                </span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Link
                href="/attendance"
                className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                Rekap Siswa <ChevronRight className="w-3.5 h-3.5" />
              </Link>
              <span className="text-gray-300">|</span>
              <Link
                href="/teacher-attendance"
                className="font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
              >
                Presensi Guru <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Right: Date-Selective Status Breakdown Donut Chart (4 cols) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-indigo-600" />
                <h2 className="font-black text-base text-gray-900">Distribusi Presensi</h2>
              </div>
              <div className="inline-flex p-0.5 rounded-lg bg-gray-100 border border-gray-200 text-[11px] font-bold">
                <button
                  onClick={() => setSelectedDistributionMode("siswa")}
                  className={cn(
                    "px-2 py-0.5 rounded-md transition-all cursor-pointer",
                    selectedDistributionMode === "siswa" ? "bg-white text-indigo-700 shadow-xs font-black" : "text-gray-500 hover:text-gray-800"
                  )}
                >
                  Siswa
                </button>
                <button
                  onClick={() => setSelectedDistributionMode("guru")}
                  className={cn(
                    "px-2 py-0.5 rounded-md transition-all cursor-pointer",
                    selectedDistributionMode === "guru" ? "bg-white text-emerald-700 shadow-xs font-black" : "text-gray-500 hover:text-gray-800"
                  )}
                >
                  Guru
                </button>
              </div>
            </div>

            {/* Date Selector & Quick Filters */}
            <div className="space-y-1.5 mb-3">
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={selectedAdminAttendanceDate}
                  max={todayDateStr}
                  onChange={(e) => setSelectedAdminAttendanceDate(e.target.value)}
                  className="text-xs font-semibold px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1"
                />
                <button
                  onClick={() => setSelectedAdminAttendanceDate(todayDateStr)}
                  className={cn(
                    "px-2 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer",
                    selectedAdminAttendanceDate === todayDateStr
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  Hari Ini
                </button>
                <button
                  onClick={() => {
                    const y = new Date();
                    y.setDate(y.getDate() - 1);
                    setSelectedAdminAttendanceDate(y.toISOString().slice(0, 10));
                  }}
                  className={cn(
                    "px-2 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer",
                    selectedAdminAttendanceDate !== todayDateStr
                      ? "bg-indigo-100 text-indigo-700 font-extrabold"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  Kemarin
                </button>
              </div>

              {/* Operational Day Badge */}
              <div className="flex items-center justify-between">
                {operationalStatusForSelected.isOperational ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Hari Aktif Sekolah
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    Hari Libur ({operationalStatusForSelected.reason})
                  </span>
                )}
                <span className="text-[10px] font-semibold text-gray-400">
                  {selectedAdminAttendanceDate === todayDateStr ? "Live Database" : `Data ${selectedAdminAttendanceDate}`}
                </span>
              </div>
            </div>

            {/* Donut Chart with Centered Metric */}
            <div className="relative w-40 h-40 mx-auto my-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attendanceDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={72}
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
                  {selectedDistributionMode === "guru" ? teacherAttendanceToday.rate : attendanceToday.rate}%
                </span>
                <span className="text-[10px] font-semibold text-gray-400 mt-1 uppercase">
                  {selectedDistributionMode === "guru" ? "Masuk" : "Hadir"}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Legend with exact counts */}
          <div className="space-y-1.5 pt-2 border-t border-gray-100">
            {selectedDistributionMode === "siswa" ? (
              <>
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
                {attendanceToday.belumAbsen > 0 && (
                  <div className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                      <span className="font-semibold text-slate-600">
                        {operationalStatusForSelected.isOperational ? "Belum Diabsen" : "Hari Libur"}
                      </span>
                    </div>
                    <span className="font-bold text-slate-500">{attendanceToday.belumAbsen} Siswa</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-gray-50/70">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="font-semibold text-gray-700">Hadir Tepat Waktu</span>
                  </div>
                  <span className="font-black text-gray-900">{teacherAttendanceToday.tepatWaktu} Guru</span>
                </div>
                <div className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-gray-50/70">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="font-semibold text-gray-700">Terlambat Masuk</span>
                  </div>
                  <span className="font-black text-amber-700">{teacherAttendanceToday.terlambat} Guru</span>
                </div>
                <div className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-gray-50/70">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    <span className="font-semibold text-gray-700">Izin / Sakit / Cuti</span>
                  </div>
                  <span className="font-black text-purple-700">{teacherAttendanceToday.izinSakit} Guru</span>
                </div>
                <div className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-gray-50/70">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="font-semibold text-gray-700">Alpa / Tanpa Keterangan</span>
                  </div>
                  <span className="font-black text-rose-600">{teacherAttendanceToday.alpa} Guru</span>
                </div>
                {teacherAttendanceToday.belumPresensi > 0 && (
                  <div className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                      <span className="font-semibold text-slate-600">
                        {operationalStatusForSelected.isOperational ? "Belum Clock-In" : "Hari Libur"}
                      </span>
                    </div>
                    <span className="font-bold text-slate-500">{teacherAttendanceToday.belumPresensi} Guru</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          DEDICATED SECTION: RIWAYAT & KEDISIPLINAN PRESENSI GURU & TENDIK
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-gray-900">Monitoring & Kedisiplinan Presensi Guru</h3>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  PostgreSQL Real-Time
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Data presensi guru & tenaga kependidikan tersimpan permanen di database dan selalu sinkron
              </p>
            </div>
          </div>

          <Link
            href="/teacher-attendance"
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
          >
            <span>Buka Modul Presensi Guru Lengkap</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 4 KPI Cards for Teachers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100">
            <span className="text-[11px] font-bold text-emerald-800">Tingkat Kehadiran Guru</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-950">{teacherAttendanceToday.rate}%</span>
              <span className="text-xs font-semibold text-emerald-700">
                ({teacherAttendanceToday.hadir}/{teacherAttendanceToday.total} Guru)
              </span>
            </div>
            <p className="text-[10px] text-emerald-700 mt-1">
              {teacherAttendanceToday.rate >= 90 ? "Tingkat kehadiran prima" : "Monitoring harian aktif"}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-100">
            <span className="text-[11px] font-bold text-teal-800">Hadir Tepat Waktu</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-teal-950">{teacherAttendanceToday.tepatWaktu}</span>
              <span className="text-xs font-semibold text-teal-700">Guru</span>
            </div>
            <p className="text-[10px] text-teal-700 mt-1">Clock-in sebelum batas toleransi</p>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-100">
            <span className="text-[11px] font-bold text-amber-800">Terlambat Masuk</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-amber-950">{teacherAttendanceToday.terlambat}</span>
              <span className="text-xs font-semibold text-amber-700">Guru</span>
            </div>
            <p className="text-[10px] text-amber-700 mt-1">Tercatat jam & alasan dispensasi</p>
          </div>

          <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100">
            <span className="text-[11px] font-bold text-purple-800">Izin / Sakit / Cuti</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-purple-950">{teacherAttendanceToday.izinSakit}</span>
              <span className="text-xs font-semibold text-purple-700">Guru</span>
            </div>
            <p className="text-[10px] text-purple-700 mt-1">
              {teacherAttendanceToday.alpa > 0 ? `${teacherAttendanceToday.alpa} Guru Alpa` : "Semua izin terverifikasi"}
            </p>
          </div>
        </div>

        {/* Quick Teacher Presence Preview (Last recorded entries for the date) */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-gray-700">
              Log Presensi Terakhir ({selectedAdminAttendanceDate}):
            </span>
            <span className="text-[11px] text-gray-500 font-medium">
              Menampilkan {Math.min(5, (selectedDateTeacherRecords.length || teacherAttendance.length))} dari {teacherAttendanceToday.total} Guru
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {((selectedDateTeacherRecords.length > 0 ? selectedDateTeacherRecords : teacherAttendance)
              .filter((r: any) => r.date === selectedAdminAttendanceDate || r.date?.startsWith(selectedAdminAttendanceDate))
              .slice(0, 6)
            ).map((rec: any, idx: number) => {
              const st = (rec.status || "").toLowerCase();
              const isHadir = st === "hadir" || (rec.clockIn && st !== "alpa");
              const isLate = st === "terlambat" || rec.clockIn?.status === "Terlambat";
              const isPermit = ["izin", "sakit", "cuti"].includes(st);

              return (
                <div key={rec.id || idx} className="p-2.5 rounded-xl bg-gray-50/80 border border-gray-100 flex items-center justify-between">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs font-bold text-gray-900 truncate">
                      {rec.teacherName || rec.name || "Guru Pengajar"}
                    </p>
                    <p className="text-[10px] text-gray-500 truncate">
                      NIP: {rec.nip || "-"} • {rec.clockIn?.time || rec.time || "07:00"}
                    </p>
                  </div>
                  <div>
                    {isLate ? (
                      <span className="text-[10px] font-extrabold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                        Terlambat
                      </span>
                    ) : isHadir ? (
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                        Hadir
                      </span>
                    ) : isPermit ? (
                      <span className="text-[10px] font-extrabold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                        {rec.status || "Izin"}
                      </span>
                    ) : (
                      <span className="text-[10px] font-extrabold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                        Alpa
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {((selectedDateTeacherRecords.length > 0 ? selectedDateTeacherRecords : teacherAttendance)
              .filter((r: any) => r.date === selectedAdminAttendanceDate || r.date?.startsWith(selectedAdminAttendanceDate))
              .length === 0
            ) && (
              <div className="col-span-full py-4 text-center text-xs text-gray-400">
                {operationalStatusForSelected.isOperational
                  ? `Belum ada guru yang melakukan clock-in untuk tanggal ${selectedAdminAttendanceDate}.`
                  : `Tanggal ${selectedAdminAttendanceDate} adalah Hari Libur (${operationalStatusForSelected.reason}). Presensi dinas ditiadakan.`}
              </div>
            )}
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
