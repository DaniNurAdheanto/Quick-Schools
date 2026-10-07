"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Calendar,
  CalendarCheck,
  Clock,
  Users,
  Award,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  ArrowRight,
  School,
  CheckCircle2,
  Megaphone,
  CreditCard,
  BookOpen,
  FileText,
  CheckCircle,
  GraduationCap,
  CalendarRange,
  MapPin,
  Activity,
  Camera,
  ClipboardCheck,
  Lock,
  AlertCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  Cell
} from "recharts";
import { onAuthStateChanged } from "firebase/auth";
import { doc, collection, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { isAnnouncementVisibleForRole, cleanAnnouncementDesc } from "@/lib/announcements-helper";
import { cn, getTodayDateString } from "@/lib/utils";
import { formatRupiah } from "@/lib/spp-payments";
import { getDatesBetween } from "@/lib/leave-requests-service";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { useAuth } from "@/context/AuthContext";
import { useSchoolProfile } from "@/context/SchoolProfileContext";
import { useToast } from "@/context/ToastContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { QuickAttendanceModal } from "@/components/modals/quick-attendance-modal";

export interface StudentDashboardViewProps {
  userName: string;
  greeting: string;
  academicYear: string;
  currentDate: string;
  currentDay: string;
}

const DAYS_ORDER = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export function StudentDashboardView({
  userName,
  greeting,
  academicYear: propAcademicYear,
  currentDate,
  currentDay,
}: StudentDashboardViewProps) {
  const { user: authUser, userData: authUserData } = useAuth();
  const { profile: schoolProfile } = useSchoolProfile();
  const { activeAcademicYear } = useAcademicYear();
  const toastCtx = useToast();
  const showError = toastCtx?.showError;

  // Active Current User State
  const [currentUser, setCurrentUser] = useState<any>(authUser || null);
  const [studentDoc, setStudentDoc] = useState<any>(authUserData || null);

  // Student specific identity
  const [studentClass, setStudentClass] = useState<string>("");
  const [studentNisn, setStudentNisn] = useState<string>("");
  const [homeroomTeacher, setHomeroomTeacher] = useState<string>("");

  // Attendance modal trigger
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);

  // Instant reactive state for attendance right after completion
  const [liveAttendedRecord, setLiveAttendedRecord] = useState<any>(null);

  // Raw Database Collections (realtime)
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [gradesRecords, setGradesRecords] = useState<any[]>([]);
  const [schedulesList, setSchedulesList] = useState<any[]>([]);
  const [examSchedulesList, setExamSchedulesList] = useState<any[]>([]);
  const [sppBillsList, setSppBillsList] = useState<any[]>([]);
  const [announcementsList, setAnnouncementsList] = useState<any[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [leaveRequestsList, setLeaveRequestsList] = useState<any[]>([]);

  // Selected Day for Timetable
  const [selectedDay, setSelectedDay] = useState<string>(() => {
    return DAYS_ORDER.includes(currentDay) ? currentDay : "Senin";
  });

  // Current local calendar date (YYYY-MM-DD), rolling over automatically at 00:00 midnight
  const [currentLocalDate, setCurrentLocalDate] = useState<string>(() => getTodayDateString());

  // Realtime clock for live class status & midnight day rollover detection
  const [nowTimeStr, setNowTimeStr] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setNowTimeStr(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
      const today = getTodayDateString(d);
      setCurrentLocalDate((prevDate) => {
        if (prevDate !== today) {
          // Midnight has passed! Reset live attended record immediately for the new day
          setLiveAttendedRecord(null);
          return today;
        }
        return prevDate;
      });
    }, 10000); // Check every 10 seconds for real-time midnight rollover
    return () => clearInterval(timer);
  }, []);

  // Update selected day if currentDay changes
  useEffect(() => {
    if (DAYS_ORDER.includes(currentDay)) {
      setSelectedDay(currentDay);
    }
  }, [currentDay]);

  // Attendance Configuration (Batas Maksimal Dihitung Alpa, schoolStartTime, dll)
  const [attendanceConfig, setAttendanceConfig] = useState<any>(() => {
    try {
      const stored = localStorage.getItem("quick_schools_attendance_config");
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return { absentThresholdTime: "08:30", schoolStartTime: "07:00", lateToleranceMinutes: 15 };
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "roles", "attendance_config"), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setAttendanceConfig((prev: any) => ({
          ...prev,
          ...d,
          absentThresholdTime: d.absentThresholdTime || d.autoAbsentTime || prev?.absentThresholdTime || "08:30"
        }));
        try {
          localStorage.setItem("quick_schools_attendance_config", JSON.stringify(d));
        } catch (e) {}
      }
    }, (err) => {
      console.warn("Attendance config read error in student dashboard:", err);
    });
    return () => unsub();
  }, []);

  // Read local storage cached attendance on mount and when local date changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem("quick_schools_attendance_records");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const today = currentLocalDate;
          const uid = currentUser?.uid;
          const nisn = studentNisn;
          const found = parsed.find((r: any) => {
            // Strictly check for today's local date!
            const isToday =
              r.date === today ||
              r.id === `att_${nisn}_${today}` ||
              (uid && r.id === `att_${uid}_${today}`);
            if (!isToday) return false;
            if (uid && (r.studentUid === uid || r.uid === uid || r.studentId === uid)) return true;
            if (nisn && (r.nisn === nisn || r.studentId === nisn)) return true;
            return false;
          });
          if (found) {
            setLiveAttendedRecord(found);
          } else {
            setLiveAttendedRecord(null);
          }
        }
      }
    } catch (e) {}
  }, [currentUser, studentNisn, currentLocalDate]);

  // Listen to cross-component instant attendance event
  useEffect(() => {
    const handleAttendanceUpdate = (e: any) => {
      if (e.detail) {
        setLiveAttendedRecord(e.detail);
        setAttendanceRecords((prev) => {
          const exists = prev.some((r) => r.id === e.detail.id);
          return exists ? prev.map((r) => (r.id === e.detail.id ? e.detail : r)) : [e.detail, ...prev];
        });
      }
    };
    window.addEventListener("attendance_updated", handleAttendanceUpdate);
    return () => window.removeEventListener("attendance_updated", handleAttendanceUpdate);
  }, []);

  // Sync authUser & authUserData when available
  useEffect(() => {
    if (authUser) setCurrentUser(authUser);
    if (authUserData) {
      setStudentDoc((prev: any) => ({ ...prev, ...authUserData }));
      if (authUserData.className || authUserData.classId || authUserData.kelas) {
        setStudentClass(authUserData.className || authUserData.classId || authUserData.kelas);
      }
      const resolvedNisn =
        authUserData.nisn ||
        authUserData.nis ||
        authUserData.studentId ||
        (authUserData.id && authUserData.id !== authUser?.uid ? authUserData.id : "");
      if (resolvedNisn) {
        setStudentNisn(String(resolvedNisn));
      }
      if (authUserData.homeroom || authUserData.waliKelas) {
        setHomeroomTeacher(authUserData.homeroom || authUserData.waliKelas);
      }
    }
  }, [authUser, authUserData]);

  // 1. Auth & Student Identity Fetching
  useEffect(() => {
    let unsubUserDoc: (() => void) | null = null;
    let unsubStudentDoc: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setCurrentUser(u);

        // Realtime user doc
        unsubUserDoc = onSnapshot(doc(db, "users", u.uid), (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setStudentDoc((prev: any) => ({ ...prev, ...data }));
            if (data.className || data.classId || data.kelas) {
              setStudentClass(data.className || data.classId || data.kelas);
            }
            const resolvedNisn =
              data.nisn ||
              data.nis ||
              data.studentId ||
              (data.id && data.id !== u.uid ? data.id : "");
            if (resolvedNisn) {
              setStudentNisn(String(resolvedNisn));
            }
          }
        }, (err) => {
          console.warn("User doc listener warning:", err);
        });

        // Realtime student doc fallback
        unsubStudentDoc = onSnapshot(doc(db, "students", u.uid), (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setStudentDoc((prev: any) => ({ ...prev, ...data }));
            if (data.className || data.classId || data.kelas) {
              setStudentClass(data.className || data.classId || data.kelas);
            }
            const resolvedNisn =
              data.nisn ||
              data.nis ||
              data.studentId ||
              (data.id && data.id !== u.uid ? data.id : "");
            if (resolvedNisn) {
              setStudentNisn(String(resolvedNisn));
            }
            if (data.homeroom || data.waliKelas) {
              setHomeroomTeacher(data.homeroom || data.waliKelas);
            }
          }
        }, (err) => {
          console.warn("Student doc listener warning:", err);
        });
      }
    });

    return () => {
      unsubAuth();
      if (unsubUserDoc) unsubUserDoc();
      if (unsubStudentDoc) unsubStudentDoc();
    };
  }, []);

  // 2. Realtime Subscriptions directly from Firestore
  useEffect(() => {
    // 2a. Attendance (Dual collection listener: attendance + roles attendance_record)
    let directRecords: any[] = [];
    let rolesRecords: any[] = [];

    const mergeAndSetAttendance = () => {
      const map = new Map<string, any>();
      directRecords.forEach((d) => map.set(d.id, d));
      rolesRecords.forEach((d) => {
        if (!map.has(d.id)) map.set(d.id, d);
      });
      setAttendanceRecords(Array.from(map.values()));
    };

    const unsubAttendance = onSnapshot(collection(db, "attendance"), (snap) => {
      directRecords = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      mergeAndSetAttendance();
    }, (err) => console.warn("Attendance listener warning:", err));

    const unsubRolesAtt = onSnapshot(
      collection(db, "roles"),
      (snap) => {
        rolesRecords = snap.docs
          .filter((d) => {
            const data = d.data();
            if (data.type === "leave_request" || data.typeMarker === "leave_request" || d.id.startsWith("leave_")) {
              return false;
            }
            return (
              d.id.startsWith("att_") ||
              d.id.startsWith("att_rec_") ||
              data.type === "attendance_record"
            );
          })
          .map((d) => ({ id: d.id, ...d.data() }));
        mergeAndSetAttendance();
      },
      (err) => console.warn("Roles attendance listener warning:", err)
    );

    // 2b. Grades
    const unsubGrades = onSnapshot(collection(db, "grades"), (snap) => {
      setGradesRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Grades listener warning:", err));

    // 2c. Schedules
    const unsubSchedules = onSnapshot(collection(db, "schedules"), (snap) => {
      setSchedulesList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Schedules listener warning:", err));

    // 2d. Exam Schedules
    const unsubExams = onSnapshot(collection(db, "examSchedules"), (snap) => {
      setExamSchedulesList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Exams listener warning:", err));

    // 2e. SPP Bills
    const unsubBills = onSnapshot(collection(db, "sppBills"), (snap) => {
      setSppBillsList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("SppBills listener warning:", err));

    // 2f. Announcements
    const unsubAnnouncements = onSnapshot(collection(db, "announcements"), (snap) => {
      setAnnouncementsList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Announcements listener warning:", err));

    // 2g. Classes
    const unsubClasses = onSnapshot(collection(db, "classes"), (snap) => {
      setClassesList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Classes listener warning:", err));

    // 2h. Leave Requests (Permits / Sick Leave)
    const unsubLeave = onSnapshot(collection(db, "leave_requests"), (snap) => {
      setLeaveRequestsList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Leave requests listener warning:", err));

    return () => {
      unsubAttendance();
      unsubRolesAtt();
      unsubGrades();
      unsubSchedules();
      unsubExams();
      unsubBills();
      unsubAnnouncements();
      unsubClasses();
      unsubLeave();
    };
  }, []);

  // Match class names flexibly (e.g., "12 IPA 1" vs "12-IPA-1")
  const matchClass = useCallback((c1: string, c2: string): boolean => {
    if (!c1 || !c2) return false;
    const clean1 = c1.toLowerCase().replace(/[\s\-_]/g, "");
    const clean2 = c2.toLowerCase().replace(/[\s\-_]/g, "");
    return clean1 === clean2 || clean1.includes(clean2) || clean2.includes(clean1);
  }, []);

  // Auto-resolve homeroom teacher from classesList if not in student doc
  useEffect(() => {
    if (!homeroomTeacher && studentClass && classesList.length > 0) {
      const matchedClass = classesList.find(c => matchClass(c.name || c.className || c.id || "", studentClass));
      if (matchedClass && (matchedClass.homeroomTeacher || matchedClass.waliKelas)) {
        setHomeroomTeacher(matchedClass.homeroomTeacher || matchedClass.waliKelas);
      }
    }
  }, [homeroomTeacher, studentClass, classesList, matchClass]);

  // Normalized Student Information
  const studentFullName = studentDoc?.fullName || studentDoc?.name || userName || "Siswa";
  const studentDisplayName = studentDoc?.nickname || studentDoc?.name?.split(" ")[0] || userName?.split(" ")[0] || "Siswa";
  const studentDisplayClass = studentClass || studentDoc?.className || studentDoc?.classId || studentDoc?.kelas || "-";
  const studentDisplayNisn = studentNisn || studentDoc?.nisn || studentDoc?.nis || "-";
  const studentPhoto = studentDoc?.photoUrl || studentDoc?.imageUrl || studentDoc?.pasFoto || "";

  // ── 3. COMPUTED ATTENDANCE STATS (Strictly for Current Student) ─────────────
  const attendanceData = useMemo(() => {
    const myUid = (currentUser?.uid || "").trim().toLowerCase();
    const myEmail = (currentUser?.email || studentDoc?.email || "").trim().toLowerCase();
    const myNisn = (studentNisn || studentDoc?.nisn || studentDoc?.nis || studentDoc?.studentId || "").trim().toLowerCase();
    const myDocId = (studentDoc?.id || "").trim().toLowerCase();
    const myName = (studentDoc?.fullName || studentDoc?.name || userName || "").trim().toLowerCase();
    const isGenericName = !myName || myName === "siswa" || myName === "student";

    const normalizeStatus = (r: any): "Hadir" | "Terlambat" | "Izin" | "Sakit" | "Alpa" => {
      const raw = String(r.status || r.type || "").trim();
      const rawLower = raw.toLowerCase();

      if (rawLower === "hadir" || rawLower === "present") return "Hadir";
      if (rawLower === "terlambat" || rawLower === "late") return "Terlambat";
      if (rawLower === "sakit" || rawLower === "sick" || r.leaveType === "Sakit" || r.type === "Sakit") return "Sakit";
      if (rawLower === "izin" || rawLower === "permit" || rawLower === "leave_request" || rawLower === "disetujui" || r.leaveType === "Izin" || r.type === "Izin") return "Izin";
      if (rawLower === "alpa" || rawLower === "absent" || rawLower === "ditolak") return "Alpa";

      if (r.source === "permit" || r.typeMarker === "leave_request" || r.type === "leave_request") {
        return r.type === "Sakit" || r.leaveType === "Sakit" ? "Sakit" : "Izin";
      }

      return "Hadir";
    };

    // 1. Base records from attendance collection & roles
    const combinedRecords: any[] = [];

    // 2. Synthesize/merge leave requests (Izin / Sakit) for this student
    if (leaveRequestsList && leaveRequestsList.length > 0) {
      leaveRequestsList.forEach((lr: any) => {
        if (lr.status === "Ditolak") return;
        const reqStudentId = String(lr.studentId || lr.nisn || lr.studentUid || "").toLowerCase().trim();
        const reqStudentName = String(lr.studentName || "").toLowerCase().trim();
        const reqEmail = String(lr.studentEmail || "").toLowerCase().trim();

        const isMyLeave =
          (myUid && (reqStudentId === myUid || reqStudentId.includes(myUid))) ||
          (myNisn && myNisn.length >= 4 && (reqStudentId === myNisn || reqStudentId.includes(myNisn))) ||
          (myDocId && myDocId.length >= 4 && (reqStudentId === myDocId || reqStudentId.includes(myDocId))) ||
          (myEmail && reqEmail && reqEmail === myEmail) ||
          (!isGenericName && myName.length > 3 && reqStudentName && (reqStudentName === myName || reqStudentName.includes(myName) || myName.includes(reqStudentName)));

        if (!isMyLeave) return;

        const dates = getDatesBetween(lr.startDate || lr.date, lr.endDate || lr.startDate || lr.date);
        const resolvedType = lr.type === "Sakit" ? "Sakit" : "Izin";

        dates.forEach((dateStr) => {
          const recId = `leave_${lr.id}_${dateStr}`;
          combinedRecords.push({
            id: recId,
            studentId: lr.studentId || myNisn || myUid,
            studentName: lr.studentName || studentFullName,
            className: lr.className || studentDisplayClass,
            date: dateStr,
            status: resolvedType,
            notes: lr.reason ? `Permohonan ${resolvedType}: ${lr.reason}` : `Disetujui oleh Wali Kelas`,
            timestamp: "07:00 WIB",
            time: "07:00",
            source: "permit",
            capturedImage: lr.attachmentUrl || null,
            approvedBy: lr.approvedBy || "Wali Kelas",
          });
        });
      });
    }

    // Add attendanceRecords
    attendanceRecords.forEach((r) => {
      if (!r) return;
      combinedRecords.push({
        ...r,
        status: normalizeStatus(r)
      });
    });

    // 3. Merge live local/event record if present
    if (liveAttendedRecord && !combinedRecords.some((r) => r.id === liveAttendedRecord.id)) {
      combinedRecords.unshift({
        ...liveAttendedRecord,
        status: normalizeStatus(liveAttendedRecord)
      });
    }

    // 4. Strictly filter records for this student
    const isRecordForMe = (r: any) => {
      if (!r) return false;
      if (liveAttendedRecord && (r.id === liveAttendedRecord.id || r._id === liveAttendedRecord._id)) return true;

      const rStudentId = String(r.studentId || "").trim().toLowerCase();
      const rUid = String(r.uid || r.studentUid || "").trim().toLowerCase();
      const rNisn = String(r.nisn || "").trim().toLowerCase();
      const rEmail = String(r.email || r.studentEmail || "").trim().toLowerCase();
      const rName = String(r.studentName || r.name || "").trim().toLowerCase();
      const rDocId = String(r.id || "").trim().toLowerCase();

      // 1. Direct UID match
      if (myUid && (rStudentId === myUid || rUid === myUid || rDocId.endsWith(`_${myUid}`))) return true;

      // 2. Direct NISN match
      if (myNisn && myNisn.length >= 4 && (rStudentId === myNisn || rNisn === myNisn || rDocId.endsWith(`_${myNisn}`))) return true;

      // 3. Direct Firestore Student Doc ID match
      if (myDocId && myDocId.length >= 4 && (rStudentId === myDocId || rDocId.endsWith(`_${myDocId}`))) return true;

      // 4. Email match
      if (myEmail && rEmail && rEmail === myEmail) return true;

      // 5. Full name match
      if (!isGenericName && myName.length > 3 && rName && (rName === myName || (rName.length > 5 && (rName.includes(myName) || myName.includes(rName))))) {
        return true;
      }

      return false;
    };

    const myRawRecords = combinedRecords.filter(isRecordForMe);

    // 5. Deduplicate by date (keep highest precedence: Hadir/Terlambat > Izin/Sakit > Alpa)
    const recordByDate = new Map<string, any>();
    myRawRecords.forEach((r) => {
      const dateKey = r.date;
      if (!dateKey) return;
      const normalized = { ...r, status: normalizeStatus(r) };

      if (!recordByDate.has(dateKey)) {
        recordByDate.set(dateKey, normalized);
      } else {
        const existing = recordByDate.get(dateKey);
        if (r.id === liveAttendedRecord?.id || r.source === "biometric" || r.capturedImage) {
          recordByDate.set(dateKey, normalized);
        } else if (existing.status === "Alpa" && normalized.status !== "Alpa") {
          recordByDate.set(dateKey, normalized);
        }
      }
    });

    const myRecords = Array.from(recordByDate.values());
    const todayDate = currentLocalDate;

    let todayRecord = myRecords.find((r) => r.date === todayDate) || null;

    if (!todayRecord && liveAttendedRecord) {
      const isToday =
        liveAttendedRecord.date === todayDate ||
        liveAttendedRecord.id === `att_${myNisn}_${todayDate}` ||
        (myUid && liveAttendedRecord.id === `att_${myUid}_${todayDate}`);
      if (isToday) {
        todayRecord = { ...liveAttendedRecord, status: normalizeStatus(liveAttendedRecord) };
      }
    }

    // Check if current time has passed Batas Maksimal Dihitung Alpa
    const absentThresholdStr = attendanceConfig?.absentThresholdTime || attendanceConfig?.autoAbsentTime || "08:30";
    const [absH, absM] = absentThresholdStr.split(":").map(Number);
    const absentTotalMinutes = (isNaN(absH) ? 8 : absH) * 60 + (isNaN(absM) ? 30 : absM);

    const nowD = new Date();
    const currentTotalMinutes = nowD.getHours() * 60 + nowD.getMinutes();
    const isPastAbsentThreshold = currentTotalMinutes >= absentTotalMinutes;
    // Aturan penguncian otomatis setelah pukul 10:00 WIB (600 menit)
    const isAttendanceLocked = currentTotalMinutes >= 10 * 60;

    const total = myRecords.length;
    const hadirTepatWaktu = myRecords.filter((r) => r.status === "Hadir").length;
    const terlambat = myRecords.filter((r) => r.status === "Terlambat").length;
    const hadir = hadirTepatWaktu + terlambat; // Total Kehadiran
    const sakit = myRecords.filter((r) => r.status === "Sakit").length;
    const izin = myRecords.filter((r) => r.status === "Izin").length;
    const alpa = myRecords.filter((r) => r.status === "Alpa" || r.status === "Ditolak").length;

    let percentage = "0.0";
    if (total > 0) {
      percentage = (((hadirTepatWaktu + terlambat) / total) * 100).toFixed(1);
    }

    const pieData = [
      { name: "Hadir", value: hadir, color: "#531FFF" },
      { name: "Terlambat", value: terlambat, color: "#8B5CF6" },
      { name: "Izin", value: izin, color: "#F59E0B" },
      { name: "Sakit", value: sakit, color: "#3B82F6" },
      { name: "Alpa", value: alpa, color: "#EF4444" },
    ].filter((item) => item.value > 0);

    const recentLogs = [...myRecords]
      .sort((a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime())
      .slice(0, 5);

    return {
      myRecords,
      todayRecord,
      isAttendanceLocked,
      absentThresholdStr,
      isPastAbsentThreshold,
      total,
      hadir,
      hadirTepatWaktu,
      terlambat,
      sakit,
      izin,
      alpa,
      percentage,
      pieData,
      recentLogs,
      hasData: total > 0,
    };
  }, [attendanceRecords, leaveRequestsList, currentUser, studentNisn, studentDoc, liveAttendedRecord, currentLocalDate, attendanceConfig]);

  // ── 4. COMPUTED ACADEMIC GRADES (Strictly for Current Student) ─────────────
  const gradesData = useMemo(() => {
    const uid = currentUser?.uid;
    const nisn = studentNisn;
    const studentDocId = studentDoc?.id || "";

    const myGrades = gradesRecords.filter((g) => {
      if (uid && (g.studentId === uid || g.uid === uid || g.studentUid === uid)) return true;
      if (nisn && (g.studentId === nisn || g.nisn === nisn)) return true;
      if (studentDocId && g.studentId === studentDocId) return true;
      return false;
    });

    if (myGrades.length === 0) {
      return {
        hasData: false,
        chartData: [],
        averageScore: "0.0",
        predikat: "Belum Ada Nilai",
        passRate: 0,
        recentEvaluations: [],
      };
    }

    // Group scores by subject to calculate average per subject
    const subjectMap = new Map<string, number[]>();
    myGrades.forEach((g) => {
      const sub = g.subject || g.mataPelajaran || "Umum";
      const sc = Number(g.score ?? g.nilai) || 0;
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

    const passedCount = chartData.filter((d) => d.score >= 75).length;
    const passRate = Math.round((passedCount / (chartData.length || 1)) * 100);

    let predikat = "B · Baik";
    if (totalAvg >= 90) predikat = "A+ · Istimewa";
    else if (totalAvg >= 85) predikat = "A · Sangat Memuaskan";
    else if (totalAvg >= 75) predikat = "B · Baik (Tuntas KKM)";
    else if (totalAvg >= 65) predikat = "C · Cukup";
    else predikat = "D · Perlu Bimbingan";

    const recent = [...myGrades]
      .sort((a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime())
      .slice(0, 4)
      .map((g) => ({
        id: g.id,
        subject: g.subject || g.mataPelajaran || "Mata Pelajaran",
        type: g.type || g.jenis || "Evaluasi",
        score: Number(g.score ?? g.nilai) || 0,
        kkm: 75,
        date: g.date || "Terbaru",
        status: (Number(g.score ?? g.nilai) || 0) >= 75 ? "Lulus KKM" : "Remedial",
        teacher: g.teacherName || g.guru || "-",
      }));

    return {
      hasData: true,
      chartData,
      averageScore: totalAvg.toFixed(1),
      predikat,
      passRate,
      recentEvaluations: recent,
    };
  }, [gradesRecords, currentUser, studentNisn, studentDoc]);

  // ── 5. COMPUTED TIMETABLE & CURRENT SUBJECT (Strictly for Student Class) ──
  const timetableData = useMemo(() => {
    if (!studentClass) {
      return {
        hasData: false,
        dayList: [],
        currentSubject: null,
        nextSubject: null,
      };
    }

    const matchedSchedules = schedulesList.filter((s) => {
      const sClass = s.class || s.classId || s.className || "";
      return matchClass(sClass, studentClass);
    });

    const dayList = matchedSchedules.filter(
      (s) => (s.day || "").toLowerCase() === selectedDay.toLowerCase()
    );

    // Calculate current and next subject based on live clock
    const [nowH, nowM] = nowTimeStr.split(":").map(Number);
    const nowMin = nowH * 60 + nowM;

    let currentSubject: any = null;
    let nextSubject: any = null;

    const mapped = dayList.map((item) => {
      const sTime = item.startTime || (item.time ? item.time.split("-")[0]?.trim() : "07:00");
      const eTime = item.endTime || (item.time ? item.time.split("-")[1]?.trim() : "08:30");

      const [sH, sM] = sTime.split(":").map(Number);
      const [eH, eM] = eTime.split(":").map(Number);
      const sMin = (sH || 0) * 60 + (sM || 0);
      const eMin = (eH || 0) * 60 + (eM || 0);

      let status = "Mendatang";
      if (selectedDay.toLowerCase() === currentDay.toLowerCase()) {
        if (nowMin >= sMin && nowMin < eMin) {
          status = "Berlangsung";
          currentSubject = { ...item, sTime, eTime };
        } else if (nowMin >= eMin) {
          status = "Selesai";
        } else if (nowMin < sMin && !nextSubject) {
          status = "Selanjutnya";
          nextSubject = { ...item, sTime, eTime };
        }
      }

      return {
        ...item,
        sTime,
        eTime,
        time: `${sTime} - ${eTime}`,
        status,
      };
    });

    // Sort by startTime
    mapped.sort((a, b) => (a.sTime || "").localeCompare(b.sTime || ""));

    return {
      hasData: mapped.length > 0,
      dayList: mapped,
      currentSubject,
      nextSubject: nextSubject || (mapped.length > 0 && selectedDay.toLowerCase() === currentDay.toLowerCase() ? mapped[0] : null),
    };
  }, [schedulesList, studentClass, selectedDay, currentDay, nowTimeStr, matchClass]);

  // ── 6. COMPUTED EXAM SCHEDULES (Strictly for Student Class) ───────────────
  const examData = useMemo(() => {
    if (!studentClass) return { hasData: false, list: [], nearest: null, countdownLabel: "-" };

    const allExams = [
      ...examSchedulesList,
      ...schedulesList.filter((s) => s.isExam || s.examType),
    ];

    const filtered = allExams.filter((e) => {
      if (e.isGroup || !e.subject) return false;
      const eClass = e.class || e.classId || e.className || "";
      if (eClass && !matchClass(eClass, studentClass)) return false;
      return true;
    });

    if (filtered.length === 0) {
      return { hasData: false, list: [], nearest: null, countdownLabel: "-" };
    }

    filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const nearest = filtered[0] || null;

    let countdownLabel = "-";
    if (nearest?.date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(nearest.date);
      target.setHours(0, 0, 0, 0);
      const diffMs = target.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 0) countdownLabel = "Hari Ini!";
      else if (diffDays === 1) countdownLabel = "Besok";
      else if (diffDays > 1) countdownLabel = `${diffDays} Hari Lagi`;
      else countdownLabel = "Sedang Berlangsung";
    }

    return {
      hasData: true,
      list: filtered.slice(0, 5),
      nearest,
      countdownLabel,
    };
  }, [examSchedulesList, schedulesList, studentClass, matchClass]);

  // ── 7. COMPUTED SPP BILLING (Strictly for Current Student) ────────────────
  const sppData = useMemo(() => {
    const uid = currentUser?.uid;
    const nisn = studentNisn;
    const studentDocId = studentDoc?.id || "";

    const myBills = sppBillsList.filter((b) => {
      if (uid && (b.studentId === uid || b.studentUid === uid || b.uid === uid)) return true;
      if (nisn && (b.studentId === nisn || b.nisn === nisn)) return true;
      if (studentDocId && b.studentId === studentDocId) return true;
      return false;
    });

    if (myBills.length === 0) {
      return {
        hasData: false,
        activeBill: null,
        totalArrears: 0,
        arrearsCount: 0,
        isUpToDate: true,
        recentReceipts: [],
      };
    }

    const unpaid = myBills.filter((b) => {
      const st = (b.status || "").toLowerCase();
      return st === "belum bayar" || st === "terlambat" || st === "pending";
    });

    const totalArrears = unpaid.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
    const activeBill = unpaid[0] || null;

    const receipts = myBills
      .filter((b) => (b.status || "").toLowerCase() === "lunas")
      .sort((a, b) => new Date(b.paymentDate || b.date || 0).getTime() - new Date(a.paymentDate || a.date || 0).getTime())
      .slice(0, 3);

    return {
      hasData: true,
      activeBill,
      totalArrears,
      arrearsCount: unpaid.length,
      isUpToDate: unpaid.length === 0,
      recentReceipts: receipts,
    };
  }, [sppBillsList, currentUser, studentNisn, studentDoc]);

  // ── 8. COMPUTED ANNOUNCEMENTS (Targeted to Siswa & All) ────────────────────
  const announcementsData = useMemo(() => {
    const filtered = announcementsList.filter((a) => {
      const target = a.target || a.targetAudience || a.audience || "Semua";
      return isAnnouncementVisibleForRole(target, "siswa", false, false);
    });

    filtered.sort((a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime());
    return filtered.slice(0, 4);
  }, [announcementsList]);


  // ── 9. COMBINED RECENT ACTIVITY STREAM ────────────────────────────────────
  const recentActivities = useMemo(() => {
    const stream: Array<{
      id: string;
      type: "attendance" | "grade" | "payment" | "announcement";
      title: string;
      desc: string;
      time: string;
      badgeText: string;
      badgeClass: string;
    }> = [];

    // Add recent attendance
    attendanceData.recentLogs.slice(0, 2).forEach((log) => {
      stream.push({
        id: `att_${log.id}`,
        type: "attendance",
        title: `Presensi ${log.status}`,
        desc: `Status kehadiran tercatat pada ${log.timestamp || "waktu presensi mandiri"}`,
        time: log.date || "Hari ini",
        badgeText: log.status,
        badgeClass:
          log.status === "Hadir"
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : log.status === "Terlambat"
            ? "bg-purple-50 text-purple-700 border-purple-200"
            : "bg-amber-50 text-amber-700 border-amber-200",
      });
    });

    // Add recent grades
    gradesData.recentEvaluations.slice(0, 2).forEach((evalItem) => {
      stream.push({
        id: `grd_${evalItem.id}`,
        type: "grade",
        title: `Nilai Baru: ${evalItem.subject}`,
        desc: `${evalItem.type} memperoleh nilai ${evalItem.score} (${evalItem.status})`,
        time: evalItem.date,
        badgeText: `${evalItem.score}/100`,
        badgeClass:
          evalItem.score >= 75
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-rose-50 text-rose-700 border-rose-200",
      });
    });

    // Add recent payments
    sppData.recentReceipts.slice(0, 1).forEach((rec) => {
      stream.push({
        id: `pay_${rec.id}`,
        type: "payment",
        title: `Pembayaran SPP Lunas`,
        desc: `Tagihan SPP bulan ${rec.month || "berjalan"} berhasil diverifikasi`,
        time: rec.paymentDate || "Terverifikasi",
        badgeText: "LUNAS",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      });
    });

    return stream.slice(0, 5);
  }, [attendanceData, gradesData, sppData]);

  // Attendance trigger handler
  const handleOpenAttendance = useCallback(() => {
    if (attendanceData.isAttendanceLocked) {
      if (showError) {
        showError(
          "Waktu absensi telah melewati pukul 10:00 WIB. Data absensi hari ini telah dikunci otomatis dan berstatus FINAL. Presensi tidak dapat dicatat atau diubah lagi.",
          "Data Absensi Terkunci (Final)"
        );
      }
      return;
    }
    if (attendanceData.todayRecord) {
      if (showError) {
        showError(
          `Status kehadiran Anda hari ini telah tercatat sebagai ${attendanceData.todayRecord.status}.`,
          "Presensi Hari Ini Telah Tercatat"
        );
      }
      return;
    }
    setShowAttendanceModal(true);
  }, [attendanceData.todayRecord, attendanceData.isAttendanceLocked, showError]);

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto w-full space-y-6 animate-in fade-in duration-300">
      
      {/* ── TOP BAR: Student Profile Header ───────────────────────────────────── */}
      <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        <div className="flex items-center gap-3.5">
          <ProfileAvatar
            name={studentFullName}
            imageUrl={studentPhoto}
            role="siswa"
            size="lg"
            className="w-12 h-12 md:w-14 md:h-14 rounded-2xl ring-2 ring-purple-100 shadow-xs shrink-0"
          />

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base md:text-lg font-black text-gray-900 tracking-tight">
                {studentFullName}
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-50 text-[#531FFF] border border-purple-200">
                <GraduationCap className="w-3.5 h-3.5 text-[#531FFF]" />
                Siswa Aktif
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold text-gray-500 mt-1 flex-wrap">
              <span>Kelas: <strong className="text-gray-900">{studentDisplayClass}</strong></span>
              <span>•</span>
              <span>NISN: <strong className="text-gray-900">{studentDisplayNisn}</strong></span>
              <span>•</span>
              <span>Wali Kelas: <strong className="text-gray-900">{homeroomTeacher || "Tata Usaha"}</strong></span>
            </div>
          </div>
        </div>

        {/* Quick Top Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleOpenAttendance}
            id="btn-top-attendance"
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer",
              !attendanceData.todayRecord
                ? "bg-gradient-to-r from-[#531FFF] to-[#6d35ff] hover:from-[#4314cc] hover:to-[#5a2ad6] text-white shadow-purple-500/25 active:scale-95 ring-2 ring-purple-300/40"
                : attendanceData.todayRecord.status === "Izin"
                ? "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300"
                : attendanceData.todayRecord.status === "Sakit"
                ? "bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300"
                : attendanceData.todayRecord.status === "Alpa"
                ? "bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300"
                : attendanceData.todayRecord.status === "Terlambat"
                ? "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300"
                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300"
            )}
          >
            {attendanceData.todayRecord ? (
              <>
                {attendanceData.todayRecord.status === "Izin" ? (
                  <Calendar className="w-4 h-4 text-amber-600" />
                ) : attendanceData.todayRecord.status === "Sakit" ? (
                  <AlertCircle className="w-4 h-4 text-blue-600" />
                ) : attendanceData.todayRecord.status === "Alpa" ? (
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                )}
                <span>
                  Presensi: {attendanceData.todayRecord.status} ({(attendanceData.todayRecord.timestamp || attendanceData.todayRecord.time || "Tercatat").replace(/\s*WIB/gi, "").trim()} WIB)
                </span>
              </>
            ) : attendanceData.isAttendanceLocked ? (
              <>
                <Lock className="w-4 h-4 text-amber-600" />
                <span>Presensi Terkunci (Pukul 10:00 WIB)</span>
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 animate-pulse" />
                <span>Absensi Sekarang (Hari Ini)</span>
              </>
            )}
          </button>

          <Link
            href="/payments"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold border border-gray-200 transition-colors"
          >
            <CreditCard className="w-4 h-4 text-gray-500" />
            <span>Tagihan SPP</span>
          </Link>

          <Link
            href="/leave-requests"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-purple-50 hover:bg-purple-100 text-[#531FFF] rounded-xl text-xs font-bold border border-purple-200 transition-colors"
          >
            <ClipboardCheck className="w-4 h-4 text-[#531FFF]" />
            <span>Izin & Sakit</span>
          </Link>
        </div>

      </div>

      {/* ── STRATEGIC HIGH-VISIBILITY ATTENDANCE ACTION BANNER ─────────────────── */}
      {!attendanceData.todayRecord ? (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#20054F] via-[#531FFF] to-[#6A28EE] p-5 md:p-6 text-white shadow-xl border-2 border-purple-400/40 animate-in slide-in-from-top-2 duration-300">
          <div className="absolute -right-8 -top-8 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute right-1/3 -bottom-10 w-36 h-36 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start md:items-center gap-4">
              <div className="w-13 h-13 md:w-15 md:h-15 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
                <CalendarCheck className="w-7 h-7 md:w-8 md:h-8 text-amber-300 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-amber-950 shadow-xs">
                    Wajib Hari Ini
                  </span>
                  <span className="text-xs text-purple-200 font-bold">
                    {currentDay}, {currentDate}
                  </span>
                  <span className="hidden sm:inline-flex text-[11px] text-purple-200 font-mono">
                    • Waktu: {nowTimeStr} WIB
                  </span>
                </div>
                <h3 className="text-lg md:text-xl font-black text-white tracking-tight mt-1">
                  Presensi Kehadiran Siswa Belum Tercatat
                </h3>
                <p className="text-xs md:text-sm text-purple-100 font-medium mt-0.5 max-w-2xl leading-relaxed">
                  Lakukan absensi mandiri dengan foto wajah langsung dan verifikasi radius GPS sekolah secara cepat dan mudah.
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-3">
              <button
                type="button"
                onClick={handleOpenAttendance}
                id="btn-strategic-attendance"
                className="w-full md:w-auto px-6 py-3.5 rounded-xl bg-white hover:bg-purple-50 text-[#531FFF] hover:text-[#4314cc] font-black text-sm tracking-wide flex items-center justify-center gap-2.5 shadow-xl hover:shadow-2xl transition-all cursor-pointer active:scale-95 group"
              >
                <Camera className="w-5 h-5 text-[#531FFF] group-hover:scale-110 transition-transform" />
                <span>Ambil Absensi Sekarang</span>
                <ArrowRight className="w-4 h-4 text-[#531FFF] group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      ) : attendanceData.todayRecord.status === "Izin" ? (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950 via-amber-900 to-yellow-950 border border-amber-500/40 p-4 md:p-5 text-white shadow-lg animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-amber-200 uppercase tracking-wider">
                    Presensi Hari Ini: Izin Terverifikasi
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/40 text-amber-100 border border-amber-400/50">
                    Status: Izin
                  </span>
                </div>
                <p className="text-xs md:text-sm font-bold text-amber-100 mt-0.5">
                  {attendanceData.todayRecord.notes || "Permohonan Izin Anda telah disetujui oleh pihak sekolah/Wali Kelas."} ({currentDate}).
                </p>
              </div>
            </div>
            <Link
              href="/leave-requests"
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <ClipboardCheck className="w-3.5 h-3.5 text-amber-300" />
              <span>Detail Surat Izin</span>
            </Link>
          </div>
        </div>
      ) : attendanceData.todayRecord.status === "Sakit" ? (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 border border-blue-500/40 p-4 md:p-5 text-white shadow-lg animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-blue-200 uppercase tracking-wider">
                    Presensi Hari Ini: Sakit Terverifikasi
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-500/40 text-blue-100 border border-blue-400/50">
                    Status: Sakit
                  </span>
                </div>
                <p className="text-xs md:text-sm font-bold text-blue-100 mt-0.5">
                  {attendanceData.todayRecord.notes || "Keterangan Sakit Anda telah diverifikasi oleh Wali Kelas."} ({currentDate}).
                </p>
              </div>
            </div>
            <Link
              href="/leave-requests"
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <ClipboardCheck className="w-3.5 h-3.5 text-blue-300" />
              <span>Detail Keterangan Sakit</span>
            </Link>
          </div>
        </div>
      ) : attendanceData.todayRecord.status === "Alpa" ? (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-950 via-rose-900 to-red-950 border border-rose-500/40 p-4 md:p-5 text-white shadow-lg animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-rose-200 uppercase tracking-wider">
                    Presensi Hari Ini: Alpa
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/40 text-rose-100 border border-rose-400/50">
                    Tanpa Keterangan
                  </span>
                </div>
                <p className="text-xs md:text-sm font-bold text-rose-100 mt-0.5">
                  Status kehadiran Anda tercatat sebagai <strong className="text-white font-black">Alpa</strong> di sistem database absensi sekolah.
                </p>
              </div>
            </div>
            {attendanceData.isAttendanceLocked ? (
              <div className="px-3.5 py-2 bg-rose-500/20 text-rose-100 rounded-xl text-xs font-bold border border-rose-400/30 flex items-center gap-1.5 shrink-0 self-start sm:self-auto shadow-xs">
                <Lock className="w-3.5 h-3.5 text-rose-300" />
                <span>Data Final Terkunci (Pukul 10:00 WIB)</span>
              </div>
            ) : null}
          </div>
        </div>
      ) : attendanceData.todayRecord.status === "Terlambat" ? (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50/80 border border-amber-300/80 p-4 md:p-5 text-amber-950 shadow-xs animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-amber-800 uppercase tracking-wider">
                    Presensi Hari Ini: Terlambat
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900 border border-amber-300">
                    Status: Terlambat
                  </span>
                  {attendanceData.isAttendanceLocked && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-700" />
                      Data Final (Terkunci 10:00 WIB)
                    </span>
                  )}
                </div>
                <p className="text-xs md:text-sm font-bold text-amber-950 mt-0.5">
                  Kehadiran Anda telah tercatat pada pukul{" "}
                  <strong className="text-amber-900 font-extrabold">
                    {(attendanceData.todayRecord.timestamp || attendanceData.todayRecord.time || "waktu presensi").replace(/\s*WIB/gi, "").trim()} WIB
                  </strong>{" "}
                  ({currentDate}). Tetap dihitung hadir.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 bg-white/90 px-3.5 py-2 rounded-xl border border-amber-200 shadow-xs self-start sm:self-auto">
              <MapPin className="w-4 h-4 text-amber-600" />
              <span>
                {attendanceData.todayRecord.location?.distance || attendanceData.todayRecord.distance
                  ? `Radius GPS: ${attendanceData.todayRecord.location?.distance || attendanceData.todayRecord.distance}m (Valid)`
                  : "Lokasi GPS Terverifikasi"}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-50 to-teal-50/80 border border-emerald-300/80 p-4 md:p-5 text-emerald-950 shadow-xs animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-emerald-800 uppercase tracking-wider">
                    Presensi Mandiri Terverifikasi
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-200 text-emerald-900 border border-emerald-300">
                    Status: {attendanceData.todayRecord.status || "Hadir"}
                  </span>
                  {attendanceData.isAttendanceLocked && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-700" />
                      Data Final (Terkunci 10:00 WIB)
                    </span>
                  )}
                </div>
                <p className="text-xs md:text-sm font-bold text-emerald-950 mt-0.5">
                  Kehadiran Anda telah tercatat pada pukul{" "}
                  <strong className="text-emerald-900 font-extrabold">
                    {(attendanceData.todayRecord.timestamp || attendanceData.todayRecord.time || "waktu presensi").replace(/\s*WIB/gi, "").trim()} WIB
                  </strong>{" "}
                  ({currentDate}).
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-white/90 px-3.5 py-2 rounded-xl border border-emerald-200 shadow-xs self-start sm:self-auto">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>
                {attendanceData.todayRecord.location?.distance || attendanceData.todayRecord.distance
                  ? `Radius GPS: ${attendanceData.todayRecord.location?.distance || attendanceData.todayRecord.distance}m (Valid)`
                  : "Lokasi GPS Terverifikasi"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── HERO BANNER: Personalized Student Dashboard Greeting ──────────────── */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#3B0DBE] via-[#531FFF] to-[#7942FF] p-6 md:p-8 text-white shadow-xl flex flex-col lg:flex-row justify-between lg:items-center gap-6 border border-white/15">
        
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="z-10 relative space-y-4 flex-1">
          {/* Status Badges */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 flex items-center gap-1.5 backdrop-blur-md shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Portal Siswa Terhubung
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white border border-white/20 backdrop-blur-md">
              Tahun Ajaran {activeAcademicYear || propAcademicYear}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white border border-white/20 backdrop-blur-md flex items-center gap-1">
              <School className="w-3.5 h-3.5 text-purple-200" />
              <span>{schoolProfile?.schoolName || "Quick Schools"}</span>
            </span>
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight mb-1 flex items-center gap-2">
              {greeting}, {studentDisplayName}! <span className="inline-block animate-bounce">🚀</span>
            </h1>
            <p className="text-white/85 text-xs md:text-sm font-medium max-w-2xl leading-relaxed">
              Selamat datang di portal akademik Anda. Pantau jadwal belajar harian, rekap presensi mandiri, capaian nilai ujian, serta tagihan SPP Anda secara langsung.
            </p>
          </div>

          {/* Quick Action Pills */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <Link
              href="/schedule"
              className="bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded-lg border border-white/15 backdrop-blur-md text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-purple-200" />
              <span>Jadwal Lengkap</span>
            </Link>
            <Link
              href="/grades"
              className="bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded-lg border border-white/15 backdrop-blur-md text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Award className="w-3.5 h-3.5 text-amber-300" />
              <span>Rekap Nilai</span>
            </Link>
            <Link
              href="/report-cards"
              className="bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded-lg border border-white/15 backdrop-blur-md text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-300" />
              <span>Rapor Digital</span>
            </Link>
            <Link
              href="/leave-requests"
              className="bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded-lg border border-white/15 backdrop-blur-md text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <ClipboardCheck className="w-3.5 h-3.5 text-blue-300" />
              <span>Pengajuan Izin</span>
            </Link>
          </div>
        </div>

        {/* Right Hero Status Widget */}
        <div className="z-10 relative bg-white/15 backdrop-blur-md border border-white/25 p-5 rounded-2xl shrink-0 lg:w-[320px] flex flex-col justify-between space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-white/80">Sesi Belajar Hari Ini</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-white/20 text-white">
              {currentDay}
            </span>
          </div>

          <div>
            <div className="text-xs text-white/70 font-semibold mb-0.5">
              {timetableData.currentSubject ? "Mata Pelajaran Saat Ini:" : "Mata Pelajaran Selanjutnya:"}
            </div>
            <div className="text-xl font-black text-white tracking-tight truncate">
              {timetableData.currentSubject?.subject || timetableData.nextSubject?.subject || "Tidak Ada Sesi Aktif"}
            </div>
            <p className="text-xs text-purple-200 mt-1 flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-purple-300" />
              <span>
                {timetableData.currentSubject?.time || timetableData.nextSubject?.time || "Hari ini bebas jam pelajaran"}
              </span>
            </p>
          </div>

          <div className="pt-2 border-t border-white/15 flex items-center justify-between text-xs font-bold text-white/90">
            <span>Presensi Kehadiran</span>
            <span className="text-emerald-300">
              {attendanceData.hasData ? `${attendanceData.percentage}% (${attendanceData.hadir} Hari)` : "Belum ada rekap"}
            </span>
          </div>
        </div>

      </div>

      {/* ── 4 KEY METRIC CARDS ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        
        {/* KPI 1: Presensi Hari Ini */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Presensi Hari Ini</span>
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center font-bold group-hover:scale-110 transition-transform",
              !attendanceData.todayRecord
                ? "bg-amber-50 text-amber-600"
                : attendanceData.todayRecord.status === "Izin"
                ? "bg-amber-50 text-amber-600"
                : attendanceData.todayRecord.status === "Sakit"
                ? "bg-blue-50 text-blue-600"
                : attendanceData.todayRecord.status === "Alpa"
                ? "bg-rose-50 text-rose-600"
                : attendanceData.todayRecord.status === "Terlambat"
                ? "bg-amber-50 text-amber-600"
                : "bg-emerald-50 text-emerald-600"
            )}>
              {attendanceData.todayRecord?.status === "Izin" ? (
                <Calendar className="w-5 h-5" />
              ) : attendanceData.todayRecord?.status === "Sakit" ? (
                <AlertCircle className="w-5 h-5" />
              ) : attendanceData.todayRecord?.status === "Alpa" ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <CalendarCheck className="w-5 h-5" />
              )}
            </div>
          </div>
          <div className="text-xl font-black text-gray-900 tracking-tight mb-1 flex items-center gap-1.5">
            {attendanceData.todayRecord ? (
              <>
                <span className={cn(
                  attendanceData.todayRecord.status === "Izin"
                    ? "text-amber-600"
                    : attendanceData.todayRecord.status === "Sakit"
                    ? "text-blue-600"
                    : attendanceData.todayRecord.status === "Alpa"
                    ? "text-rose-600"
                    : attendanceData.todayRecord.status === "Terlambat"
                    ? "text-amber-600"
                    : "text-emerald-600",
                  "font-extrabold"
                )}>
                  {attendanceData.todayRecord.status}
                </span>
                <span className="text-xs font-semibold text-gray-400">({(attendanceData.todayRecord.timestamp || attendanceData.todayRecord.time || "Tercatat").replace(/\s*WIB/gi, "").trim()} WIB)</span>
              </>
            ) : (
              <span className="text-amber-600 font-extrabold">Belum Presensi</span>
            )}
          </div>
          <div className="text-xs text-gray-500 font-medium flex items-center justify-between mt-2">
            <span>Persentase Kehadiran:</span>
            <strong className="text-emerald-600 font-bold">{attendanceData.percentage}%</strong>
          </div>
          {attendanceData.isAttendanceLocked && !attendanceData.todayRecord ? (
            <div className="mt-3 w-full py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 bg-gray-100 text-gray-500 border border-gray-200">
              <Lock className="w-3.5 h-3.5 text-gray-400" />
              <span>Data Final (Terkunci 10:00 WIB)</span>
            </div>
          ) : !attendanceData.todayRecord ? (
            <button
              onClick={handleOpenAttendance}
              id="btn-kpi-attendance"
              className="mt-3 w-full py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95 border bg-purple-50 hover:bg-purple-100 text-[#531FFF] border-purple-200"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Absensi Sekarang →</span>
            </button>
          ) : null}
        </div>

        {/* KPI 2: Rata-Rata Nilai Akademik */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Rata-Rata Nilai</span>
            <div className="w-10 h-10 rounded-xl bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 tracking-tight mb-1">
            {gradesData.averageScore} <span className="text-xs text-gray-400 font-normal">/ 100</span>
          </div>
          <div className="flex items-center justify-between text-xs mt-2">
            <span className="text-gray-500">{gradesData.predikat}</span>
            <span className="text-[#531FFF] font-bold">KKM: 75</span>
          </div>
        </div>

        {/* KPI 3: Jadwal Ujian Terdekat */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Ujian Terdekat</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <CalendarRange className="w-5 h-5" />
            </div>
          </div>
          <div className="text-lg font-black text-gray-900 tracking-tight mb-1 truncate">
            {examData.nearest?.subject || (examData.hasData ? "Terjadwal" : "Tidak Ada Ujian")}
          </div>
          <div className="text-xs text-gray-500 font-medium flex items-center justify-between mt-2">
            <span>Hitung Mundur:</span>
            <span className={cn(
              "px-2 py-0.5 rounded text-[10px] font-black",
              examData.hasData ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-500"
            )}>
              {examData.countdownLabel}
            </span>
          </div>
        </div>

        {/* KPI 4: Tagihan SPP */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status SPP</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="text-lg font-black text-gray-900 tracking-tight mb-1">
            {sppData.activeBill ? (
              <span className="text-rose-600">{formatRupiah(sppData.activeBill.amount || 0)}</span>
            ) : sppData.hasData ? (
              <span className="text-emerald-600 font-bold">Lunas Terbayar</span>
            ) : (
              <span className="text-gray-600 font-bold">Bebas Tagihan</span>
            )}
          </div>
          <div className="text-xs text-gray-500 font-medium flex items-center justify-between mt-2">
            <span>{sppData.activeBill ? `Jatuh tempo: ${sppData.activeBill.dueDate || "Bulan ini"}` : "Semua tagihan lunas"}</span>
            <Link href="/payments" className="text-[#531FFF] font-bold hover:underline">
              Detail →
            </Link>
          </div>
        </div>

      </div>

      {/* ── MAIN CONTENT GRID: 2 COLUMNS ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Jadwal & Evaluasi Nilai (2/3 width on desktop) */}
        <div className="lg:col-span-2 space-y-6">

          {/* SECTION: Jadwal Pelajaran Interaktif */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 md:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#531FFF]" />
                  <span>Jadwal Pelajaran Kelas {studentDisplayClass}</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Jadwal pembelajaran aktif yang telah ditetapkan oleh kurikulum sekolah
                </p>
              </div>

              {/* Day Selector Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                {DAYS_ORDER.map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                      selectedDay === day
                        ? "bg-[#531FFF] text-white shadow-xs"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {/* Timetable List or Empty State */}
            {timetableData.hasData ? (
              <div className="space-y-2.5">
                {timetableData.dayList.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className={cn(
                      "p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3",
                      item.status === "Berlangsung"
                        ? "bg-purple-50/70 border-purple-200 shadow-xs"
                        : "bg-gray-50/50 border-gray-100 hover:bg-gray-50"
                    )}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0",
                        item.status === "Berlangsung"
                          ? "bg-[#531FFF] text-white"
                          : "bg-white text-gray-700 border border-gray-200"
                      )}>
                        {idx + 1}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-gray-900">{item.subject}</h4>
                          {item.status === "Berlangsung" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 animate-pulse">
                              Sedang Berlangsung
                            </span>
                          )}
                          {item.status === "Selanjutnya" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800">
                              Selanjutnya
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 font-medium mt-0.5">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-gray-400" />
                            {item.teacherName || item.teacher || "Guru Pengajar"}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            {item.room || `Ruang Kelas ${studentDisplayClass}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-gray-900">{item.time}</div>
                      <div className="text-[10px] font-semibold text-gray-400">WIB</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center space-y-2.5 bg-gray-50/60 rounded-xl border border-dashed border-gray-200">
                <Calendar className="w-8 h-8 text-gray-400 mx-auto" />
                <h4 className="text-sm font-bold text-gray-800">Tidak Ada Jadwal Belajar untuk Hari {selectedDay}</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Hari ini bebas jam kegiatan belajar mengajar atau jadwal belum dialokasikan oleh bagian kurikulum.
                </p>
              </div>
            )}
          </div>

          {/* SECTION: Performa Nilai & Akademik */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 md:p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#531FFF]" />
                  <span>Capaian Evaluasi Nilai Akademik</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Rekapitulasi nilai mata pelajaran terhadap standar KKM 75
                </p>
              </div>

              <Link
                href="/grades"
                className="text-xs font-bold text-[#531FFF] hover:text-[#4314cc] flex items-center gap-1 transition-colors"
              >
                <span>Lihat Seluruh Nilai</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {gradesData.hasData ? (
              <div className="space-y-6">
                {/* Recharts Bar Chart */}
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={gradesData.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                      <XAxis
                        dataKey="subject"
                        tick={{ fontSize: 11, fill: "#6B7280" }}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                      />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#6B7280" }} />
                      <RechartsTooltip
                        formatter={(val: any) => [`${val} / 100`, "Nilai Rata-Rata"]}
                        contentStyle={{ borderRadius: 10, borderColor: "#E5E7EB", fontSize: 12, fontWeight: 700 }}
                      />
                      <ReferenceLine y={75} stroke="#EF4444" strokeDasharray="3 3" label={{ value: "KKM 75", fill: "#EF4444", fontSize: 10, position: "top" }} />
                      <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                        {gradesData.chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.score >= 75 ? "#531FFF" : "#EF4444"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Recent Evaluations Table */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Evaluasi & Tugas Terbaru</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {gradesData.recentEvaluations.map((evalItem) => (
                      <div
                        key={evalItem.id}
                        className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="text-xs font-bold text-gray-900">{evalItem.subject}</div>
                          <div className="text-[11px] text-gray-500 font-medium mt-0.5">{evalItem.type} • {evalItem.date}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-base font-black text-gray-900">{evalItem.score}</div>
                          <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded",
                            evalItem.score >= 75 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                          )}>
                            {evalItem.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center space-y-2.5 bg-gray-50/60 rounded-xl border border-dashed border-gray-200">
                <Award className="w-8 h-8 text-gray-400 mx-auto" />
                <h4 className="text-sm font-bold text-gray-800">Belum Ada Nilai yang Diterbitkan</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Nilai tugas, kuis, atau ujian semester Anda akan otomatis ditampilkan di sini setelah diinput oleh Bapak/Ibu guru pengajar.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Presensi Mandiri, SPP, Ujian, Pengumuman (1/3 width) */}
        <div className="space-y-6">

          {/* WIDGET 1: Presensi Mandiri Status Card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 md:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-[#531FFF]" />
                <span>Presensi Kehadiran Siswa</span>
              </h3>
              <span className="text-[11px] font-bold text-gray-500">{currentDate}</span>
            </div>

            <div className="p-4 rounded-xl border bg-gray-50/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600">Status Hari Ini:</span>
                {attendanceData.todayRecord ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border",
                      attendanceData.todayRecord.status === "Izin"
                        ? "bg-amber-50 text-amber-800 border-amber-300"
                        : attendanceData.todayRecord.status === "Sakit"
                        ? "bg-blue-50 text-blue-800 border-blue-300"
                        : attendanceData.todayRecord.status === "Alpa"
                        ? "bg-rose-50 text-rose-800 border-rose-300"
                        : attendanceData.todayRecord.status === "Terlambat"
                        ? "bg-amber-50 text-amber-800 border-amber-300"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    )}
                  >
                    {attendanceData.todayRecord.status === "Izin" ? (
                      <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    ) : attendanceData.todayRecord.status === "Sakit" ? (
                      <AlertCircle className="w-3.5 h-3.5 text-blue-600" />
                    ) : attendanceData.todayRecord.status === "Alpa" ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    ) : (
                      <CheckCircle
                        className={cn(
                          "w-3.5 h-3.5",
                          attendanceData.todayRecord.status === "Terlambat" ? "text-amber-600" : "text-emerald-600"
                        )}
                      />
                    )}
                    {attendanceData.todayRecord.status} ({(attendanceData.todayRecord.timestamp || attendanceData.todayRecord.time || "Tercatat").replace(/\s*WIB/gi, "").trim()} WIB)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Belum Presensi
                  </span>
                )}
              </div>

              {attendanceData.isAttendanceLocked && !attendanceData.todayRecord ? (
                <div className="w-full py-2.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold flex items-center justify-center gap-2 shadow-2xs">
                  <Lock className="w-4 h-4 text-amber-600" />
                  <span>Data Presensi Telah Dikunci (Final Pukul 10:00 WIB)</span>
                </div>
              ) : !attendanceData.todayRecord ? (
                <button
                  onClick={handleOpenAttendance}
                  className="w-full py-2.5 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95 bg-[#531FFF] hover:bg-[#4314cc]"
                >
                  <CalendarCheck className="w-4 h-4" />
                  <span>Ambil Foto Presensi Sekarang</span>
                </button>
              ) : null}
            </div>

            {/* Attendance breakdown pills (Hadir, Terlambat, Izin, Sakit, Alpa) */}
            <div className="grid grid-cols-5 gap-1.5 text-center pt-1">
              <div className="p-2 rounded-xl bg-purple-50/70 border border-purple-100">
                <div className="text-xs font-black text-[#531FFF]">{attendanceData.hadirTepatWaktu}</div>
                <div className="text-[10px] font-semibold text-gray-500">Hadir</div>
              </div>
              <div className="p-2 rounded-xl bg-indigo-50/70 border border-indigo-100">
                <div className="text-xs font-black text-indigo-700">{attendanceData.terlambat}</div>
                <div className="text-[10px] font-semibold text-gray-500">Terlambat</div>
              </div>
              <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-100">
                <div className="text-xs font-black text-amber-700">{attendanceData.izin}</div>
                <div className="text-[10px] font-semibold text-gray-500">Izin</div>
              </div>
              <div className="p-2 rounded-xl bg-blue-50/70 border border-blue-100">
                <div className="text-xs font-black text-blue-700">{attendanceData.sakit}</div>
                <div className="text-[10px] font-semibold text-gray-500">Sakit</div>
              </div>
              <div className="p-2 rounded-xl bg-rose-50/70 border border-rose-100">
                <div className="text-xs font-black text-rose-700">{attendanceData.alpa}</div>
                <div className="text-[10px] font-semibold text-gray-500">Alpa</div>
              </div>
            </div>
          </div>

          {/* WIDGET 2: Tagihan SPP & Keuangan */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 md:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#531FFF]" />
                <span>Tagihan SPP Siswa</span>
              </h3>
              <Link href="/payments" className="text-xs font-bold text-[#531FFF] hover:underline">
                Portal SPP →
              </Link>
            </div>

            {sppData.activeBill ? (
              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-800">Tagihan Belum Lunas</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-700 uppercase">
                    {sppData.activeBill.month || "Bulan Berjalan"}
                  </span>
                </div>
                <div className="text-2xl font-black text-rose-700">
                  {formatRupiah(sppData.activeBill.amount || 0)}
                </div>
                <div className="text-xs text-rose-600 font-medium">
                  Jatuh tempo: {sppData.activeBill.dueDate || "Akhir bulan ini"}
                </div>
                <Link
                  href="/payments"
                  className="w-full py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <span>Bayar Tagihan Sekarang</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 text-center space-y-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                <h4 className="text-xs font-bold text-emerald-900">Tagihan SPP Bebas / Lunas</h4>
                <p className="text-[11px] text-emerald-700">
                  Tidak ada tagihan tertunggak pada akun Anda saat ini. Terima kasih telah menyelesaikan pembayaran tepat waktu.
                </p>
              </div>
            )}
          </div>

          {/* WIDGET 3: Pengumuman Sekolah Terbaru */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 md:p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-[#531FFF]" />
                <span>Pengumuman Sekolah</span>
              </h3>
              <Link href="/announcements" className="text-xs font-bold text-[#531FFF] hover:underline">
                Semua →
              </Link>
            </div>

            {announcementsData.length > 0 ? (
              <div className="space-y-2.5">
                {announcementsData.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-100/70 transition-colors space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-gray-900 truncate">{item.title}</h4>
                      {item.isPinned && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-100 text-purple-700 shrink-0">
                          PENTING
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed">
                      {cleanAnnouncementDesc(item.content || item.desc || "Pengumuman resmi dari pihak sekolah.")}
                    </p>
                    <div className="text-[10px] text-gray-400 font-semibold pt-0.5">
                      {item.date || "Terbaru"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-gray-400 italic">
                Belum ada pengumuman terbaru untuk siswa.
              </div>
            )}
          </div>

          {/* WIDGET 4: Aliran Aktivitas Terbaru */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 md:p-6 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
              <Activity className="w-4 h-4 text-[#531FFF]" />
              <span>Aktivitas Terbaru Akun</span>
            </h3>

            {recentActivities.length > 0 ? (
              <div className="space-y-3">
                {recentActivities.map((act) => (
                  <div key={act.id} className="flex items-start gap-2.5 text-xs">
                    <div className="w-2 h-2 rounded-full bg-[#531FFF] mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-gray-900 truncate">{act.title}</span>
                        <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0", act.badgeClass)}>
                          {act.badgeText}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">{act.desc}</p>
                      <span className="text-[10px] text-gray-400">{act.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-gray-400 italic">
                Belum ada riwayat aktivitas terbaru yang tercatat.
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Quick Attendance Modal Integration */}
      <QuickAttendanceModal
        isOpen={showAttendanceModal}
        onClose={() => setShowAttendanceModal(false)}
        userName={studentFullName}
        studentClass={studentDisplayClass}
        studentId={studentDisplayNisn !== "-" ? studentDisplayNisn : currentUser?.uid || "SISWA"}
        alreadyAttendedToday={!!attendanceData.todayRecord}
        onAttendanceSuccess={(record) => {
          setLiveAttendedRecord(record);
        }}
      />

    </div>
  );
}
