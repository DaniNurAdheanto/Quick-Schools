"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  Award,
  CalendarCheck,
  CreditCard,
  CalendarRange,
  Clock,
  MapPin,
  TrendingUp,
  Star,
  AlertTriangle,
  AlertCircle,
  ChevronRight,
  Megaphone,
  Phone,
  ShieldCheck,
  Calendar,
  Lock,
  School,
  CheckCircle,
  BadgeCheck
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
  ReferenceLine
} from "recharts";
import { collection, onSnapshot, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { cn, getTodayDateString } from "@/lib/utils";
import { formatRupiah } from "@/lib/spp-payments";
import { isAnnouncementVisibleForRole, cleanAnnouncementDesc } from "@/lib/announcements-helper";
import { useSchoolProfile } from "@/context/SchoolProfileContext";
import { useAuth } from "@/context/AuthContext";
import { useUnifiedStudents } from "@/hooks/use-unified-students";

export interface ParentDashboardViewProps {
  userName: string;
  greeting: string;
  academicYear: string;
  currentDate: string;
  currentDay: string;
}

const toSafeArray = (val: any): any[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string") return val.includes(",") ? val.split(",").map(s => s.trim()).filter(Boolean) : [val.trim()];
  if (typeof val === "object") return Object.values(val);
  return [val];
};

export function ParentDashboardView({
  userName,
  greeting,
  academicYear,
  currentDate,
  currentDay
}: ParentDashboardViewProps) {
  const { profile: schoolProfile } = useSchoolProfile();
  const { user: authUser, userData: authUserData } = useAuth();

  // Current authenticated user state
  const [currentUser, setCurrentUser] = useState<any>(authUser || null);
  const [parentData, setParentData] = useState<any>(authUserData || null);

  // Unified Students collection (merging students + users role siswa)
  const { students: unifiedStudentsList } = useUnifiedStudents();

  // Direct child document fallback (for immediate resolution if studentId is present)
  const [directChild, setDirectChild] = useState<any>(null);

  // Raw Database Collections
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [gradesRecords, setGradesRecords] = useState<any[]>([]);
  const [schedulesList, setSchedulesList] = useState<any[]>([]);
  const [examSchedulesList, setExamSchedulesList] = useState<any[]>([]);
  const [sppBillsList, setSppBillsList] = useState<any[]>([]);
  const [announcementsList, setAnnouncementsList] = useState<any[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);

  // Active Selected Child State
  const [selectedChildId, setSelectedChildId] = useState<string>("");

  // Live time tracker
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

  // Sync with useAuth when available
  useEffect(() => {
    if (authUser) setCurrentUser(authUser);
    if (authUserData) {
      setParentData((prev: any) => ({ ...prev, ...authUserData }));
    }
  }, [authUser, authUserData]);

  // 1. Auth & Parent Identity Realtime Fetching
  useEffect(() => {
    let unsubUserDoc: (() => void) | null = null;
    let unsubParentDoc: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setCurrentUser(u);

        // Realtime listener on users doc
        unsubUserDoc = onSnapshot(doc(db, "users", u.uid), (snap) => {
          if (snap.exists()) {
            const uData = snap.data();
            setParentData((prev: any) => ({
              ...prev,
              ...uData,
              studentIds: toSafeArray(uData.studentIds || prev?.studentIds),
              linkedStudentIds: toSafeArray(uData.linkedStudentIds || prev?.linkedStudentIds || uData.studentIds || prev?.studentIds),
              studentId: uData.studentId || prev?.studentId || uData.nisn || prev?.nisn || "",
              studentName: uData.studentName || prev?.studentName || "",
              nisn: uData.nisn || prev?.nisn || uData.studentId || prev?.studentId || "",
            }));
          }
        });

        // Realtime listener on parents doc
        unsubParentDoc = onSnapshot(doc(db, "parents", u.uid), (snap) => {
          if (snap.exists()) {
            const pData = snap.data();
            setParentData((prev: any) => ({
              ...prev,
              ...pData,
              studentIds: toSafeArray(pData.studentIds || prev?.studentIds),
              linkedStudentIds: toSafeArray(pData.linkedStudentIds || prev?.linkedStudentIds || pData.studentIds || prev?.studentIds),
              studentId: pData.studentId || prev?.studentId || pData.nisn || prev?.nisn || "",
              studentName: pData.studentName || prev?.studentName || "",
              nisn: pData.nisn || prev?.nisn || pData.studentId || prev?.studentId || "",
            }));
          }
        });
      }
    });

    return () => {
      unsubAuth();
      if (unsubUserDoc) unsubUserDoc();
      if (unsubParentDoc) unsubParentDoc();
    };
  }, []);

  // 2. Realtime Subscriptions
  useEffect(() => {
    const unsubAttendance = onSnapshot(collection(db, "attendance"), (snap) => {
      setAttendanceRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Attendance listener warning:", err));

    const unsubGrades = onSnapshot(collection(db, "grades"), (snap) => {
      setGradesRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Grades listener warning:", err));

    const unsubSchedules = onSnapshot(collection(db, "schedules"), (snap) => {
      setSchedulesList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Schedules listener warning:", err));

    const unsubExams = onSnapshot(collection(db, "examSchedules"), (snap) => {
      setExamSchedulesList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("ExamSchedules listener warning:", err));

    const unsubBills = onSnapshot(collection(db, "sppBills"), (snap) => {
      setSppBillsList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("SppBills listener warning:", err));

    const unsubAnnouncements = onSnapshot(collection(db, "announcements"), (snap) => {
      setAnnouncementsList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Announcements listener warning:", err));

    const unsubClasses = onSnapshot(collection(db, "classes"), (snap) => {
      setClassesList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Classes listener warning:", err));

    return () => {
      unsubAttendance();
      unsubGrades();
      unsubSchedules();
      unsubExams();
      unsubBills();
      unsubAnnouncements();
      unsubClasses();
    };
  }, []);

  useEffect(() => {
    setStudentsList(unifiedStudentsList);
  }, [unifiedStudentsList]);

  // Direct child document fallback (for immediate resolution if studentId is present)
  useEffect(() => {
    const targetStudentId = parentData?.studentId || parentData?.studentIds?.[0] || parentData?.linkedStudentIds?.[0];
    if (!targetStudentId) return;

    let isMounted = true;
    const fetchDirectChild = async () => {
      try {
        const userSnap = await getDoc(doc(db, "users", targetStudentId));
        if (userSnap.exists() && isMounted) {
          const data = userSnap.data();
          setDirectChild({
            ...data,
            _firestoreId: userSnap.id,
            docId: userSnap.id,
            id: data.nisn || data.id || userSnap.id,
            rawId: data.id || "",
            nisn: data.nisn || data.nis || "",
            uid: data.uid || userSnap.id,
            name: data.fullName || data.name || "",
            fullName: data.fullName || data.name || "",
            className: data.className || data.classId || data.kelas || "",
            classId: data.classId || data.className || data.kelas || "",
          });
          return;
        }

        const studentSnap = await getDoc(doc(db, "students", targetStudentId));
        if (studentSnap.exists() && isMounted) {
          const data = studentSnap.data();
          setDirectChild({
            ...data,
            _firestoreId: studentSnap.id,
            docId: studentSnap.id,
            id: data.id || studentSnap.id,
            rawId: data.id || "",
            nisn: data.nisn || data.nis || data.id || "",
            uid: data.uid || studentSnap.id,
            name: data.name || data.fullName || "",
            fullName: data.name || data.fullName || "",
            className: data.classId || data.className || "",
            classId: data.classId || data.className || "",
          });
        }
      } catch (err) {
        console.warn("Direct child lookup fallback warning:", err);
      }
    };

    fetchDirectChild();
    return () => {
      isMounted = false;
    };
  }, [parentData?.studentId, parentData?.studentIds, parentData?.linkedStudentIds]);

  // Combine unifiedStudentsList (which includes users role siswa) with raw students listener and direct child fallback
  const allAvailableStudents = useMemo(() => {
    const map = new Map<string, any>();

    // 1. From Unified Students (users role siswa + students docs)
    if (unifiedStudentsList && unifiedStudentsList.length > 0) {
      unifiedStudentsList.forEach(s => {
        const key = s._firestoreId || s.uid || s.id;
        if (key) map.set(key, s);
      });
    }

    // 2. From raw students listener
    if (studentsList && studentsList.length > 0) {
      studentsList.forEach(s => {
        const key = s._firestoreId || s.uid || s.id;
        if (key && !map.has(key)) map.set(key, s);
      });
    }

    // 3. From direct child fallback
    if (directChild) {
      const key = directChild._firestoreId || directChild.uid || directChild.id;
      if (key && !map.has(key)) map.set(key, directChild);
    }

    return Array.from(map.values());
  }, [unifiedStudentsList, studentsList, directChild]);

  // 3. Resolve Connected Child (Strict 1-to-1 Matching or Registered Siblings)
  const connectedChildren = useMemo(() => {
    if (!allAvailableStudents || allAvailableStudents.length === 0) {
      return directChild ? [directChild] : [];
    }

    const parentUid = currentUser?.uid || authUser?.uid;
    const parentEmail = (currentUser?.email || authUser?.email || parentData?.email || authUserData?.email || "").toLowerCase().trim();
    const parentPhone = (parentData?.phone || authUserData?.phone || currentUser?.phoneNumber || "").replace(/[^0-9]/g, "");
    const pParentName = (parentData?.name || authUserData?.name || parentData?.fullName || authUserData?.fullName || "").toLowerCase().trim();
    const targetStudentName = (parentData?.studentName || authUserData?.studentName || "").toLowerCase().trim();
    const specificStudentId = String(parentData?.studentId || authUserData?.studentId || parentData?.nisn || authUserData?.nisn || "").trim();
    const rawIds = toSafeArray(parentData?.studentIds || authUserData?.studentIds || parentData?.linkedStudentIds);

    const matches: any[] = [];
    const seenIds = new Set<string>();

    const addIfNew = (s: any) => {
      const key = s._firestoreId || s.uid || s.id;
      if (key && !seenIds.has(key)) {
        seenIds.add(key);
        matches.push(s);
      }
    };

    // 1. First Priority: Direct parentUid match on student record
    if (parentUid) {
      allAvailableStudents.forEach(s => {
        const sParentUid = String(s.parentUid || s.parentUserId || "").trim();
        if (sParentUid && sParentUid === parentUid) addIfNew(s);
      });
    }

    // 2. Second Priority: Direct target studentIds / linkedStudentIds
    if (rawIds.length > 0) {
      for (const rId of rawIds) {
        const strId = String(rId).toLowerCase().trim();
        const found = allAvailableStudents.find(s => {
          const sDocId = String(s._firestoreId || s.docId || "").toLowerCase();
          const sId = String(s.id || "").toLowerCase();
          const sNisn = String(s.nisn || "").toLowerCase();
          const sUid = String(s.uid || "").toLowerCase();
          return sDocId === strId || sId === strId || sNisn === strId || sUid === strId;
        });
        if (found) addIfNew(found);
      }
    }

    // 3. Third Priority: Direct specific Student ID or NISN match
    if (specificStudentId) {
      const cId = specificStudentId.toLowerCase();
      const matchById = allAvailableStudents.find(s => {
        const sDocId = String(s._firestoreId || s.docId || "").toLowerCase();
        const sId = String(s.id || "").toLowerCase();
        const sRawId = String(s.rawId || "").toLowerCase();
        const sNisn = String(s.nisn || "").toLowerCase();
        const sNis = String(s.nis || "").toLowerCase();
        const sUid = String(s.uid || "").toLowerCase();
        return (
          sDocId === cId ||
          sId === cId ||
          sRawId === cId ||
          sNisn === cId ||
          sNis === cId ||
          sUid === cId
        );
      });
      if (matchById) addIfNew(matchById);
    }

    // 4. Fourth Priority: Exact Parent Phone match
    if (matches.length === 0 && parentPhone && parentPhone.length >= 8) {
      const matchByPhone = allAvailableStudents.find(s => {
        const sPhone = String(s.parentPhone || "").replace(/[^0-9]/g, "");
        return sPhone && sPhone === parentPhone;
      });
      if (matchByPhone) addIfNew(matchByPhone);
    }

    // 5. Fifth Priority: Exact Parent Email match
    if (matches.length === 0 && parentEmail && parentEmail.includes("@")) {
      const matchByEmail = allAvailableStudents.find(s => {
        const sEmail = String(s.parentEmail || "").toLowerCase().trim();
        return sEmail && sEmail === parentEmail;
      });
      if (matchByEmail) addIfNew(matchByEmail);
    }

    // 6. Sixth Priority: Exact Student Name match
    if (matches.length === 0 && targetStudentName && targetStudentName.length >= 3) {
      const matchByStudentName = allAvailableStudents.find(s => {
        const sName = String(s.name || s.fullName || "").toLowerCase().trim();
        return sName === targetStudentName;
      });
      if (matchByStudentName) addIfNew(matchByStudentName);
    }

    // 7. Seventh Priority: Exact Father / Mother / Guardian / Parent Name match
    if (matches.length === 0 && pParentName && pParentName.length >= 3) {
      const matchByParentName = allAvailableStudents.find(s => {
        const fName = String(s.fatherName || "").toLowerCase().trim();
        const mName = String(s.motherName || "").toLowerCase().trim();
        const gName = String(s.guardianName || "").toLowerCase().trim();
        const sParent = String(s.parentName || "").toLowerCase().trim();
        return (
          (fName && fName === pParentName) ||
          (mName && mName === pParentName) ||
          (gName && gName === pParentName) ||
          (sParent && sParent === pParentName)
        );
      });
      if (matchByParentName) addIfNew(matchByParentName);
    }

    if (matches.length > 0) return matches;
    return directChild ? [directChild] : [];
  }, [allAvailableStudents, directChild, currentUser, authUser, parentData, authUserData]);

  // Auto select first child if none selected yet
  useEffect(() => {
    if (connectedChildren.length > 0 && !selectedChildId) {
      setSelectedChildId(connectedChildren[0]._firestoreId || connectedChildren[0].id || connectedChildren[0].uid);
    }
  }, [connectedChildren, selectedChildId]);

  // Active Child Object
  const activeChild = useMemo(() => {
    if (connectedChildren.length === 0) return null;
    if (!selectedChildId) return connectedChildren[0];
    const found = connectedChildren.find(c => 
      c.id === selectedChildId || 
      c._firestoreId === selectedChildId || 
      c.uid === selectedChildId || 
      c.docId === selectedChildId || 
      c.nisn === selectedChildId
    );
    return found || connectedChildren[0];
  }, [selectedChildId, connectedChildren]);

  // Active child normalized details
  const childName = activeChild?.fullName || activeChild?.name || "";
  const childClass = activeChild?.className || activeChild?.classId || activeChild?.kelas || "";
  const childNisn = activeChild?.nisn || activeChild?.nis || "";

  // Resolve homeroom teacher for child
  const homeroomTeacher = useMemo(() => {
    if (!activeChild) return "-";
    if (activeChild.homeroom || activeChild.waliKelas) {
      return activeChild.homeroom || activeChild.waliKelas;
    }
    if (childClass && classesList.length > 0) {
      const cleanTarget = childClass.toLowerCase().replace(/[\s\-_]/g, "");
      const matched = classesList.find(c => {
        const cleanName = (c.name || c.className || c.id || "").toLowerCase().replace(/[\s\-_]/g, "");
        return cleanName === cleanTarget || cleanName.includes(cleanTarget) || cleanTarget.includes(cleanName);
      });
      if (matched && (matched.homeroomTeacher || matched.waliKelas)) {
        return matched.homeroomTeacher || matched.waliKelas;
      }
    }
    return "Wali Kelas";
  }, [activeChild, childClass, classesList]);

  // 4. Computed Attendance for Active Child (strictly unique student ID, NEVER by name)
  const childAttendance = useMemo(() => {
    if (!activeChild) {
      return {
        total: 0,
        hadir: 0,
        terlambat: 0,
        sakit: 0,
        izin: 0,
        alpa: 0,
        percentage: "0.0",
        todayRecord: null,
        pieData: [],
        recentLogs: [],
        isLive: false
      };
    }

    const sId = String(activeChild.id || activeChild._firestoreId || "");
    const sUid = String(activeChild.uid || "");
    const sNisn = childNisn ? String(childNisn) : "";

    const myRecords = attendanceRecords.filter(r => {
      if (sId && String(r.studentId) === sId) return true;
      if (sUid && (String(r.studentId) === sUid || String(r.uid) === sUid)) return true;
      if (sNisn && (String(r.studentId) === sNisn || String(r.nisn) === sNisn)) return true;
      return false;
    });

    const todayStr = getTodayDateString();
    const todayRecord = myRecords.find(r => r.date === todayStr);

    const total = myRecords.length;
    const hadir = myRecords.filter(r => r.status === "Hadir").length;
    const terlambat = myRecords.filter(r => r.status === "Terlambat").length;
    const sakit = myRecords.filter(r => r.status === "Sakit").length;
    const izin = myRecords.filter(r => r.status === "Izin").length;
    const alpa = myRecords.filter(r => r.status === "Alpa" || r.status === "Ditolak").length;

    let percentage = "0.0";
    if (total > 0) {
      percentage = (((hadir + terlambat) / total) * 100).toFixed(1);
    }

    const pieData = [
      { name: "Hadir", value: hadir, color: "#531FFF" },
      { name: "Terlambat", value: terlambat, color: "#8B5CF6" },
      { name: "Izin", value: izin, color: "#F59E0B" },
      { name: "Sakit", value: sakit, color: "#3B82F6" },
      { name: "Alpa", value: alpa, color: "#EF4444" },
    ].filter(item => item.value > 0);

    const recentLogs = [...myRecords]
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      .slice(0, 5);

    return {
      total,
      hadir,
      terlambat,
      sakit,
      izin,
      alpa,
      percentage,
      todayRecord,
      pieData,
      recentLogs,
      isLive: total > 0
    };
  }, [attendanceRecords, activeChild, childNisn]);

  // 5. Computed Academic Performance & Grades for Active Child (strictly unique student ID, NEVER by name)
  const childGrades = useMemo(() => {
    if (!activeChild) {
      return {
        chartData: [],
        averageScore: "0.0",
        predikat: "Belum Ada Nilai",
        passRate: 0,
        recentEvaluations: [],
        isLive: false
      };
    }

    const sId = String(activeChild.id || activeChild._firestoreId || "");
    const sUid = String(activeChild.uid || "");
    const sNisn = childNisn ? String(childNisn) : "";

    const myGrades = gradesRecords.filter(g => {
      if (sId && (String(g.studentId) === sId || String(g.studentUid) === sId)) return true;
      if (sUid && (String(g.studentId) === sUid || String(g.studentUid) === sUid || String(g.uid) === sUid)) return true;
      if (sNisn && (String(g.studentId) === sNisn || String(g.nisn) === sNisn)) return true;
      return false;
    });

    if (myGrades.length === 0) {
      return {
        chartData: [],
        averageScore: "0.0",
        predikat: "Belum Ada Data Nilai",
        passRate: 0,
        recentEvaluations: [],
        isLive: false
      };
    }

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
      chartData,
      averageScore: totalAvg.toFixed(1),
      predikat,
      passRate,
      recentEvaluations: recent,
      isLive: true
    };
  }, [gradesRecords, activeChild, childNisn]);

  // 6. Computed Daily Timetable for Child's Class
  const childTimetable = useMemo(() => {
    const daysIndo = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const todayIndex = new Date().getDay();
    const todayName = daysIndo[todayIndex];
    const isWeekend = todayIndex === 0 || todayIndex === 6;

    if (!activeChild || !childClass) {
      return {
        dayList: [],
        isWeekend,
        targetDay: isWeekend ? "Senin" : todayName,
        nextSubject: "-",
        nextTime: "-"
      };
    }

    const cleanChildClass = childClass.toLowerCase().replace(/[\s\-_]/g, "");

    const matchedSchedules = schedulesList.filter(s => {
      const sClass = (s.classId || s.className || "").toLowerCase().replace(/[\s\-_]/g, "");
      return sClass === cleanChildClass || sClass.includes(cleanChildClass) || cleanChildClass.includes(sClass);
    });

    const targetDay = isWeekend ? "Senin" : todayName;
    const dayList = matchedSchedules.filter(s => (s.day || "").toLowerCase() === targetDay.toLowerCase());

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
      nextSubject: nextSubject !== "-" ? nextSubject : (mapped[0]?.subject || "-"),
      nextTime: nextTime !== "-" ? nextTime : (mapped[0]?.time || "-")
    };
  }, [schedulesList, childClass, nowTimeStr, activeChild]);

  // 7. Computed Semester Exams for Child's Class
  const childExams = useMemo(() => {
    if (!activeChild || !childClass) {
      return {
        list: [],
        nearest: null,
        countdownLabel: "-"
      };
    }

    const cleanChildClass = childClass.toLowerCase().replace(/[\s\-_]/g, "");
    const allExams = [...examSchedulesList, ...schedulesList.filter(s => s.isExam || s.examType)];

    const filtered = allExams.filter(e => {
      if (e.isGroup || !e.subject) return false;
      const eClass = (e.classId || e.className || "").toLowerCase().replace(/[\s\-_]/g, "");
      if (eClass && !cleanChildClass.includes(eClass) && !eClass.includes(cleanChildClass)) return false;

      const typeUpper = (e.examType || "").toUpperCase();
      const titleUpper = (e.title || "").toUpperCase();
      return typeUpper.includes("PTS") || typeUpper.includes("UTS") ||
             typeUpper.includes("PAS") || typeUpper.includes("UAS") ||
             titleUpper.includes("PTS") || titleUpper.includes("UTS") ||
             titleUpper.includes("PAS") || titleUpper.includes("UAS");
    });

    const examItems = [...filtered];
    examItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const nearest = examItems[0] || null;

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
      else countdownLabel = "Berlangsung";
    }

    return {
      list: examItems,
      nearest,
      countdownLabel
    };
  }, [examSchedulesList, schedulesList, childClass, activeChild]);

  // 8. Computed SPP Billing & Payment Status for Child (strictly unique student ID, NEVER by name)
  const childSPP = useMemo(() => {
    if (!activeChild) {
      return {
        currentBill: null,
        arrearsCount: 0,
        totalArrears: 0,
        isUpToDate: true,
        receipts: []
      };
    }

    const sId = String(activeChild.id || activeChild._firestoreId || "");
    const sUid = String(activeChild.uid || "");
    const sNisn = childNisn ? String(childNisn) : "";

    // Filter child bills strictly by ID or NISN
    const myBills = sppBillsList.filter(b => {
      if (sId && (String(b.studentId) === sId || String(b.studentUid) === sId)) return true;
      if (sUid && (String(b.studentId) === sUid || String(b.studentUid) === sUid || String(b.uid) === sUid)) return true;
      if (sNisn && (String(b.studentId) === sNisn || String(b.nisn) === sNisn)) return true;
      return false;
    });

    if (myBills.length === 0) {
      return {
        currentBill: null,
        arrearsCount: 0,
        totalArrears: 0,
        isUpToDate: true,
        receipts: []
      };
    }

    // Sort bills by period / date
    const unpaidBills = myBills.filter(b => b.status === "Unpaid" || b.status === "Overdue" || b.status === "Partial");
    const totalArrears = unpaidBills.reduce((acc, b) => acc + (Number(b.remainingAmount) || (Number(b.amount) - (Number(b.paidAmount) || 0))), 0);

    const paidBills = myBills.filter(b => b.status === "Paid" || (b.paidAmount && b.paidAmount > 0));
    const allReceipts: any[] = [];
    paidBills.forEach(b => {
      if (b.transactions && Array.isArray(b.transactions) && b.transactions.length > 0) {
        b.transactions.forEach((tx: any) => {
          allReceipts.push({
            receiptNo: tx.receiptNo || `KW-${b.invoiceNo}`,
            periodMonth: b.periodMonth || "Bulan SPP",
            amount: tx.amount || b.paidAmount || b.amount,
            date: tx.paymentDate || tx.createdAt || b.paidAt || "Terbaru",
            method: tx.paymentMethod || b.paymentMethod || "Kasir / Transfer",
            cashier: tx.cashierName || b.cashierName || "Sistem"
          });
        });
      } else {
        allReceipts.push({
          receiptNo: `KW-${b.invoiceNo || b.id.slice(0, 8)}`,
          periodMonth: b.periodMonth || "Bulan SPP",
          amount: b.paidAmount || b.amount,
          date: b.paidAt || "Terbaru",
          method: b.paymentMethod || "Transfer Bank",
          cashier: b.cashierName || "Sistem"
        });
      }
    });

    const currentBill = myBills[0] || null;

    return {
      currentBill,
      arrearsCount: unpaidBills.length,
      totalArrears,
      isUpToDate: totalArrears === 0,
      receipts: allReceipts.slice(0, 5)
    };
  }, [sppBillsList, activeChild, childNisn]);

  // 9. Computed School Announcements for Parents
  const parentAnnouncements = useMemo(() => {
    const valid = announcementsList
      .filter((a) => {
        const target = a.target || a.targetAudience || a.audience || "Semua";
        return isAnnouncementVisibleForRole(target, "orang-tua", false, false);
      })
      .slice(0, 3);


    if (valid.length === 0) {
      return [
        {
          id: "ann_p_1",
          title: "Pertemuan Paguyuban Wali Murid & Laporan Capaian Tengah Semester",
          desc: "Undangan silaturahmi dan evaluasi proses belajar peserta didik bersama Wali Kelas pada Sabtu, 20 September 2026.",
          tag: "PENTING",
          date: "10 Sep 2026"
        },
        {
          id: "ann_p_2",
          title: "Pemberitahuan Pelaksanaan Penilaian Tengah Semester (PTS) Ganjil",
          desc: "Mohon kerja sama Bapak/Ibu Wali Murid untuk mengawasi ketertiban jadwal belajar mandiri putra/putri di rumah.",
          tag: "AKADEMIK",
          date: "05 Sep 2026"
        }
      ];
    }
    return valid;
  }, [announcementsList]);

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto w-full space-y-6 animate-in fade-in duration-300">
      
      {/* ── Top Bar: Child Info & Verification Chip (Otomatis berdasarkan relasi resmi) ─────────────────────── */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Child Identity Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 text-[#531FFF] flex items-center justify-center font-black shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Siswa Terdaftar:</span>
              {connectedChildren.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <BadgeCheck className="w-3 h-3 text-emerald-600" />
                  Terverifikasi
                </span>
              )}
            </div>
            
            {/* If parent has multiple registered children (siblings), provide clean tab switcher */}
            {connectedChildren.length > 1 ? (
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {connectedChildren.map((child) => {
                  const childKey = child._firestoreId || child.id || child.uid;
                  const isActive = (
                    childKey === selectedChildId ||
                    child.id === activeChild?.id ||
                    child._firestoreId === activeChild?._firestoreId ||
                    child.uid === activeChild?.uid
                  );
                  return (
                    <button
                      key={childKey}
                      onClick={() => setSelectedChildId(childKey)}
                      className={cn(
                        "px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                        isActive
                          ? "bg-[#531FFF] text-white shadow-xs"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      )}
                    >
                      <span>{child.fullName || child.name}</span>
                      <span className={cn("text-[10px]", isActive ? "text-purple-200" : "text-gray-400")}>
                        ({child.className || child.classId || "Siswa"})
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <h2 className="text-sm font-extrabold text-gray-900 mt-0.5">
                {childName ? (
                  <>
                    {childName} <span className="text-xs font-semibold text-gray-500">· Kelas {childClass || "-"} {childNisn ? `(NISN: ${childNisn})` : ""}</span>
                  </>
                ) : (
                  <span className="text-gray-400 italic font-normal text-xs">Belum ada siswa terhubung ke akun ini</span>
                )}
              </h2>
            )}
          </div>
        </div>

        {/* Read-Only Badge & Fast Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold border border-gray-200" title="Data disajikan khusus untuk akun Orang Tua dalam mode baca">
            <Lock className="w-3.5 h-3.5 text-gray-500" />
            <span>Portal Khusus Wali (Read-Only)</span>
          </div>

          <Link
            href="/payments"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#531FFF] hover:bg-[#4314cc] text-white rounded-lg text-xs font-bold transition-all shadow-xs active:scale-95"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Cek & Bayar SPP</span>
          </Link>
        </div>

      </div>

      {/* ── Empty State Banner if no student connected ──────────────────────── */}
      {connectedChildren.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 md:p-6 text-amber-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm md:text-base font-bold text-amber-900">Akun Orang Tua Belum Terhubung dengan Data Siswa</h3>
              <p className="text-xs text-amber-700 mt-1 max-w-2xl leading-relaxed">
                Data anak ditampilkan otomatis berdasarkan ID Siswa / NISN resmi yang terdaftar pada akun Orang Tua. Sistem mendeteksi akun ini belum memiliki relasi siswa yang terdaftar. Silakan hubungi bagian Tata Usaha atau Admin Sekolah untuk menghubungkan profil siswa ke akun Anda.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Hero Welcome Section ─────────────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#3B0DBE] via-[#531FFF] to-[#7942FF] p-6 md:p-8 text-white shadow-xl flex flex-col lg:flex-row justify-between lg:items-center gap-6 border border-white/15">
        
        {/* Ambient background glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="z-10 relative space-y-4 flex-1">
          
          {/* Status Badges */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 flex items-center gap-1.5 backdrop-blur-md shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Monitoring Anak Aktif
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white border border-white/20 backdrop-blur-md">
              Tahun Ajaran {academicYear}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white border border-white/20 backdrop-blur-md flex items-center gap-1">
              <School className="w-3.5 h-3.5 text-purple-200" />
              <span>{schoolProfile?.schoolName || "Quick Schools"}</span>
            </span>
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight mb-1 flex items-center gap-2">
              {greeting}, Bapak/Ibu {userName}! <span className="inline-block animate-bounce">👋</span>
            </h1>
            <p className="text-white/85 text-xs md:text-sm font-medium max-w-2xl leading-relaxed">
              Pantau perkembangan akademik, rekap presensi kehadiran harian, jadwal belajar, evaluasi nilai, serta status pembayaran SPP putra/putri Anda secara transparan dan real-time.
            </p>
          </div>

          {/* Child Identity Chips */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="bg-white/10 hover:bg-white/20 px-3.5 py-2 rounded-lg border border-white/15 backdrop-blur-md text-xs font-bold flex items-center gap-1.5 transition-colors">
              <span className="text-white/60">Putra/Putri:</span>
              <span className="text-white">{childName}</span>
            </div>

            <div className="bg-white/10 hover:bg-white/20 px-3.5 py-2 rounded-lg border border-white/15 backdrop-blur-md text-xs font-bold flex items-center gap-1.5 transition-colors">
              <span className="text-white/60">Kelas:</span>
              <span className="text-white">{childClass}</span>
            </div>

            <div className="bg-white/10 hover:bg-white/20 px-3.5 py-2 rounded-lg border border-white/15 backdrop-blur-md text-xs font-bold flex items-center gap-1.5 transition-colors">
              <span className="text-white/60">Wali Kelas:</span>
              <span className="text-white">{homeroomTeacher}</span>
            </div>
          </div>

        </div>

        {/* Right Quick Summary Card */}
        <div className="z-10 relative bg-white/15 backdrop-blur-md border border-white/25 p-5 rounded-xl shrink-0 lg:w-[320px] flex flex-col justify-between space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-white/80">Capaian Akademik Anak</span>
            <div className="w-8 h-8 rounded-lg bg-amber-400/20 flex items-center justify-center text-amber-300">
              <Star className="w-4 h-4 fill-amber-300" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white tracking-tight flex items-baseline gap-2">
              {childGrades.averageScore} <span className="text-xs font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-400/30">KKM: 75</span>
            </div>
            <p className="text-xs text-white/90 font-semibold mt-1 flex items-center gap-1">
              <span>{childGrades.predikat}</span>
            </p>
          </div>
          <div className="pt-2 border-t border-white/15 flex items-center justify-between text-xs font-bold text-white/90">
            <span>Kehadiran Semester</span>
            <span className="text-emerald-300">{childAttendance.percentage}% ({childAttendance.hadir} Hari Hadir)</span>
          </div>
        </div>

      </div>

      {/* ── 4 Main KPI Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        
        {/* KPI 1: Kehadiran Hari Ini */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Presensi Hari Ini</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xl font-black text-gray-900 tracking-tight mb-1 flex items-center gap-1.5">
            {childAttendance.todayRecord ? (
              <>
                <span className="text-emerald-600 font-extrabold">Hadir</span>
                <span className="text-xs font-semibold text-gray-400">({childAttendance.todayRecord.timestamp || "07:15 WIB"})</span>
              </>
            ) : (
              <span className="text-blue-600">Terjadwal Hari Ini</span>
            )}
          </div>
          <div className="text-xs text-gray-500 font-medium">
            Tingkat Presensi: <strong className="text-emerald-600 font-bold">{childAttendance.percentage}%</strong> ({childAttendance.hadir}H / {childAttendance.total}H)
          </div>
        </div>

        {/* KPI 2: Rata-Rata Nilai */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Rata-Rata Nilai</span>
            <div className="w-10 h-10 rounded-xl bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 tracking-tight mb-1">
            {childGrades.averageScore} <span className="text-xs text-gray-400 font-normal">/ 100</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> {childGrades.passRate}% Tuntas KKM (75)
            </span>
          </div>
        </div>

        {/* KPI 3: Status Tagihan & Tunggakan SPP */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status Pembayaran SPP</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xl font-black text-gray-900 tracking-tight mb-1">
            {childSPP.isUpToDate ? (
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle className="w-5 h-5" /> Lunas Terbayar
              </span>
            ) : (
              <span className="text-rose-600">
                {formatRupiah(childSPP.totalArrears)}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 font-medium truncate">
            {childSPP.isUpToDate ? (
              <span>SPP bulan berjalan telah lunas</span>
            ) : (
              <span className="text-rose-600 font-bold">{childSPP.arrearsCount} bulan tagihan belum diselesaikan</span>
            )}
          </div>
        </div>

        {/* KPI 4: Ujian Semester Terdekat (UTS/UAS) */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Ujian Semester (UTS/UAS)</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#531FFF] flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <CalendarRange className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#531FFF] tracking-tight mb-1">
            {childExams.countdownLabel !== "-" ? childExams.countdownLabel : "Tidak Ada Ujian"}
          </div>
          <div className="text-xs text-gray-500 font-medium truncate">
            {childExams.nearest ? (
              <span>{childExams.nearest.subject} ({childExams.nearest.examType || "PTS"})</span>
            ) : (
              <span>Tidak ada jadwal ujian dekat</span>
            )}
          </div>
        </div>

      </div>

      {/* ── Main Grid Layout: Left 2 Cols & Right 1 Col ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT SECTION: Jadwal Pelajaran, Grafik Nilai, Rekap Kehadiran */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 1. Jadwal Pelajaran Kelas Anak Hari Ini */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="p-5 md:p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#531FFF]" />
                  <span>Jadwal Pelajaran {childTimetable.isWeekend ? "(Hari Senin Mendatang)" : `Hari Ini (${currentDay}, ${currentDate})`}</span>
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  Kelas {childClass} · Ruang belajar & jadwal mengajar aktif
                </p>
              </div>
              <Link href="/schedule" className="text-xs font-bold text-[#531FFF] hover:underline flex items-center gap-1">
                Semua Jadwal <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-400 uppercase tracking-wider font-extrabold border-b border-gray-100">
                    <th className="py-3 px-5">Waktu</th>
                    <th className="py-3 px-5">Mata Pelajaran</th>
                    <th className="py-3 px-5">Ruang Kelas</th>
                    <th className="py-3 px-5">Guru Pengajar</th>
                    <th className="py-3 px-5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                  {childTimetable.dayList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-gray-400">
                        Tidak ada jadwal pelajaran aktif untuk hari ini ({childTimetable.targetDay}).
                      </td>
                    </tr>
                  ) : (
                    childTimetable.dayList.map((item, idx) => (
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Grafik Batang Pencapaian Nilai Akademik terhadap KKM */}
          <div className="bg-white p-5 md:p-6 rounded-xl border border-gray-100 shadow-xs">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
              <div>
                <h2 className="text-base font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#531FFF]" />
                  <span>Grafik Pencapaian Nilai per Mata Pelajaran</span>
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  Perbandingan capaian nilai siswa terhadap batas standar KKM sekolah (75)
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-bold">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-[#531FFF]" /> Nilai Siswa
                </span>
                <span className="flex items-center gap-1.5 text-rose-500">
                  <span className="w-3 h-0.5 bg-rose-500" /> Batas KKM (75)
                </span>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={childGrades.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis 
                    dataKey="subject" 
                    tick={{ fill: "#64748B", fontSize: 11, fontWeight: 600 }}
                    axisLine={{ stroke: "#E2E8F0" }}
                    tickLine={false}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    tick={{ fill: "#64748B", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-gray-900 text-white p-3 rounded-lg shadow-xl text-xs font-medium space-y-1">
                            <p className="font-bold text-sm text-purple-300">{data.subject}</p>
                            <p className="flex justify-between gap-4">
                              <span>Nilai:</span>
                              <span className="font-bold text-emerald-400">{data.score} / 100</span>
                            </p>
                            <p className="flex justify-between gap-4 text-gray-300">
                              <span>Standar KKM:</span>
                              <span>{data.kkm}</span>
                            </p>
                            <p className="flex justify-between gap-4 text-gray-300">
                              <span>Predikat:</span>
                              <span className="font-bold text-amber-300">{data.grade}</span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine y={75} stroke="#EF4444" strokeDasharray="3 3" strokeWidth={1.5} />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={38}>
                    {childGrades.chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.score >= 75 ? "#531FFF" : "#EF4444"} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Evaluasi / Tugas Terbaru */}
            <div className="mt-6 pt-5 border-t border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Riwayat Evaluasi & Penilaian Terbaru
                </h3>
                <Link href="/grades" className="text-xs font-bold text-[#531FFF] hover:underline flex items-center gap-0.5">
                  Lihat Buku Nilai <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {childGrades.recentEvaluations.map((ev, i) => (
                  <div key={i} className="p-3.5 bg-gray-50/70 border border-gray-100 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-extrabold text-gray-900">{ev.subject}</div>
                      <div className="text-[11px] text-gray-500 font-medium">{ev.type} · {ev.date}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black text-[#531FFF]">{ev.score}</div>
                      <span className="inline-block px-1.5 py-0.2 text-[9px] font-extrabold text-emerald-700 bg-emerald-100 rounded">
                        {ev.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* 3. Rekap Kehadiran Presensi Lengkap */}
          <div className="bg-white p-5 md:p-6 rounded-xl border border-gray-100 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-[#531FFF]" />
                  <span>Rekapitulasi Presensi Kehadiran Siswa</span>
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  Monitoring absensi semester ini · Total {childAttendance.total} hari efektif sekolah
                </p>
              </div>
              <Link href="/attendance" className="text-xs font-bold text-[#531FFF] hover:underline flex items-center gap-0.5">
                Detail Presensi <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Attendance Counters Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
              <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl text-center">
                <span className="text-[10px] font-bold text-[#531FFF] uppercase">Hadir</span>
                <p className="text-xl font-black text-gray-900 mt-0.5">{childAttendance.hadir}</p>
                <span className="text-[10px] text-gray-500 font-medium">Hari</span>
              </div>
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-center">
                <span className="text-[10px] font-bold text-indigo-700 uppercase">Terlambat</span>
                <p className="text-xl font-black text-gray-900 mt-0.5">{childAttendance.terlambat}</p>
                <span className="text-[10px] text-gray-500 font-medium">Hari</span>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-center">
                <span className="text-[10px] font-bold text-amber-700 uppercase">Izin</span>
                <p className="text-xl font-black text-gray-900 mt-0.5">{childAttendance.izin}</p>
                <span className="text-[10px] text-gray-500 font-medium">Hari</span>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-center">
                <span className="text-[10px] font-bold text-blue-700 uppercase">Sakit</span>
                <p className="text-xl font-black text-gray-900 mt-0.5">{childAttendance.sakit}</p>
                <span className="text-[10px] text-gray-500 font-medium">Hari</span>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-center col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold text-rose-700 uppercase">Alpa</span>
                <p className="text-xl font-black text-gray-900 mt-0.5">{childAttendance.alpa}</p>
                <span className="text-[10px] text-gray-500 font-medium">Hari</span>
              </div>
            </div>

            {/* Log Kehadiran 5 Hari Terakhir */}
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">
                Riwayat Presensi Terbaru
              </h4>
              <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                {childAttendance.recentLogs.length > 0 ? (
                  childAttendance.recentLogs.map((rec, i) => (
                    <div key={rec.id || i} className="p-3 bg-white flex items-center justify-between text-xs hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-gray-600">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-extrabold text-gray-900">{rec.date || "Hari Ini"}</p>
                          <p className="text-[11px] text-gray-400 font-medium">
                            Masuk: {rec.timestamp || rec.time || "07:05 WIB"} {rec.location ? `· ${rec.location}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {rec.faceVerified && (
                          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <ShieldCheck className="w-3 h-3" /> Wajah Valid
                          </span>
                        )}
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-black",
                          rec.status === "Hadir" ? "bg-emerald-100 text-emerald-800" :
                          rec.status === "Terlambat" ? "bg-amber-100 text-amber-800" :
                          rec.status === "Sakit" ? "bg-blue-100 text-blue-800" :
                          rec.status === "Izin" ? "bg-amber-100 text-amber-800" :
                          "bg-rose-100 text-rose-800"
                        )}>
                          {rec.status || "Hadir"}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-gray-400 font-medium">
                    Belum ada catatan presensi terekam hari ini.
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: Keuangan SPP, Jadwal Ujian, Pengumuman, Kontak */}
        <div className="space-y-6">
          
          {/* Card 1: Pembayaran SPP & Rincian Tunggakan */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-5 md:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900">Keuangan & SPP Anak</h3>
                  <p className="text-[11px] text-gray-400 font-medium">Status tagihan SPP sekolah</p>
                </div>
              </div>
              <Link href="/payments" className="text-[11px] font-bold text-[#531FFF] hover:underline flex items-center gap-0.5">
                Portal SPP <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Current SPP Status Highlight */}
            <div className={cn(
              "p-4 rounded-xl border space-y-2",
              childSPP.isUpToDate 
                ? "bg-emerald-50/50 border-emerald-200" 
                : "bg-rose-50/50 border-rose-200"
            )}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">Tagihan SPP Bulan Ini</span>
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase",
                  childSPP.isUpToDate ? "bg-emerald-200 text-emerald-900" : "bg-rose-200 text-rose-900"
                )}>
                  {childSPP.isUpToDate ? "Lunas" : "Belum Lunas"}
                </span>
              </div>
              <div className="text-xl font-black text-gray-900">
                {formatRupiah(childSPP.currentBill?.amount || 500000)}
              </div>
              <p className="text-[11px] text-gray-500 font-medium">
                Periode: {childSPP.currentBill?.periodMonth || "September 2026"} · Jatuh Tempo tgl 10
              </p>
            </div>

            {/* Arrears warning if any */}
            {!childSPP.isUpToDate && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Perhatian Tunggakan:</p>
                  <p className="text-[11px] text-amber-800">
                    Terdapat {childSPP.arrearsCount} bulan tagihan yang belum diselesaikan sebesar {formatRupiah(childSPP.totalArrears)}.
                  </p>
                </div>
              </div>
            )}

            {/* Payment Method / Virtual Account Guide */}
            <div className="p-3.5 bg-gray-50 border border-gray-100 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between text-[11px] font-bold text-gray-500">
                <span>Virtual Account BCA Resmi:</span>
                <span className="text-[#531FFF] font-extrabold cursor-pointer hover:underline">Salin</span>
              </div>
              <div className="font-mono font-black text-sm text-gray-900 tracking-wider">
                12899{childNisn}
              </div>
              <p className="text-[10px] text-gray-400 font-medium">
                Atas Nama: {childName} ({schoolProfile?.schoolName || "Quick Schools"})
              </p>
            </div>

            {/* Recent Payment Receipts */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Histori Kuitansi Pembayaran
              </span>
              <div className="space-y-1.5">
                {childSPP.receipts.map((rc, idx) => (
                  <div key={idx} className="p-2.5 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <p className="font-extrabold text-gray-900">{rc.periodMonth}</p>
                      <p className="text-[10px] text-gray-400 font-medium">{rc.receiptNo} · {rc.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-emerald-600">{formatRupiah(rc.amount)}</p>
                      <span className="text-[9px] font-bold text-gray-500">{rc.method}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Card 2: Jadwal Ujian Semester (UTS / UAS) */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-5 md:p-6 space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#531FFF] flex items-center justify-center">
                  <CalendarRange className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900">Jadwal Ujian Semester</h3>
                  <p className="text-[11px] text-gray-400 font-medium">PTS & PAS Kelas {childClass}</p>
                </div>
              </div>
              <Link href="/exams" className="text-[11px] font-bold text-[#531FFF] hover:underline flex items-center gap-0.5">
                Semua Ujian <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {childExams.list.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400">
                  Belum ada jadwal ujian yang terdaftar untuk kelas ini.
                </div>
              ) : (
                childExams.list.map((ex, i) => (
                  <div key={ex.id || i} className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[9px] font-black bg-[#531FFF] text-white tracking-wide uppercase">
                        {ex.examType || "PTS"}
                      </span>
                      <span className="text-[11px] font-extrabold text-[#531FFF]">{ex.date}</span>
                    </div>
                    <h4 className="text-xs font-bold text-gray-900">{ex.subject}</h4>
                    <div className="flex items-center justify-between text-[11px] text-gray-500 pt-0.5">
                      <span>Waktu: {ex.startTime} - {ex.endTime}</span>
                      <span className="font-semibold text-gray-700">{ex.room || "Ruang Ujian"}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Card 3: Pengumuman Sekolah Khusus Orang Tua */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-5 md:p-6 space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900">Pengumuman & Informasi</h3>
                  <p className="text-[11px] text-gray-400 font-medium">Khusus Orang Tua / Wali Murid</p>
                </div>
              </div>
              <Link href="/announcements" className="text-[11px] font-bold text-[#531FFF] hover:underline flex items-center gap-0.5">
                Semua <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {parentAnnouncements.map((ann, i) => (
                <div key={ann.id || i} className="p-3 bg-gray-50/70 border border-gray-100 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[9px] font-extrabold tracking-wide uppercase",
                      ann.tag === "PENTING" ? "bg-rose-100 text-rose-700" : "bg-purple-100 text-[#531FFF]"
                    )}>
                      {ann.tag || "PENGUMUMAN"}
                    </span>
                    <span className="text-[10px] text-gray-400 font-semibold">{ann.date || "Terbaru"}</span>
                  </div>
                  <h4 className="text-xs font-bold text-gray-900 leading-snug">{ann.title}</h4>
                  <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">{cleanAnnouncementDesc(ann.desc)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Card 4: Kontak Narahubung Penting */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-5 space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Narahubung Resmi Sekolah
            </h3>
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-extrabold text-gray-900">Wali Kelas ({homeroomTeacher})</p>
                  <p className="text-[11px] text-gray-400 font-medium">Konsultasi perkembangan belajar</p>
                </div>
                <button 
                  onClick={() => alert(`Menghubungi Wali Kelas: ${homeroomTeacher}`)}
                  className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors cursor-pointer"
                  title="Hubungi Wali Kelas"
                >
                  <Phone className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-extrabold text-gray-900">Tata Usaha & Keuangan SPP</p>
                  <p className="text-[11px] text-gray-400 font-medium">08:00 - 15:00 WIB (Hari Kerja)</p>
                </div>
                <button 
                  onClick={() => alert("Layanan Tata Usaha & Kasir SPP Sekolah")}
                  className="p-2 bg-purple-50 hover:bg-purple-100 text-[#531FFF] rounded-lg transition-colors cursor-pointer"
                  title="Hubungi TU Sekolah"
                >
                  <Phone className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
