"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { collection, doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { isAnnouncementVisibleForRole, cleanAnnouncementDesc } from "@/lib/announcements-helper";

export interface MenuReadState {
  lastReadAt: Record<string, string>;
  readItemIds?: Record<string, string[]>;
  updatedAt?: string;
}

export type NotificationCategory = "all" | "announcement" | "academic" | "finance" | "system";

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  categoryLabel: string;
  categoryPath: string;
  title: string;
  description: string;
  timestamp: number;
  formattedTime: string;
  href: string;
  isRead: boolean;
  priority?: "high" | "normal" | "urgent";
}

export interface UnreadDetail {
  path: string;
  label: string;
  count: number;
}

interface NotificationBadgeContextType {
  badges: Record<string, number>;
  getBadgeCount: (path: string) => number;
  totalUnreadCount: number;
  unreadDetails: UnreadDetail[];
  notificationsList: NotificationItem[];
  markAsRead: (path: string) => Promise<void>;
  markItemAsRead: (path: string, itemId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  isLoading: boolean;
}

const NotificationBadgeContext = createContext<NotificationBadgeContextType>({
  badges: {},
  getBadgeCount: () => 0,
  totalUnreadCount: 0,
  unreadDetails: [],
  notificationsList: [],
  markAsRead: async () => {},
  markItemAsRead: async () => {},
  markAllAsRead: async () => {},
  isLoading: true,
});

const MENU_LABELS: Record<string, string> = {
  "/announcements": "Pengumuman",
  "/calendar": "Kalender Akademik",
  "/schedule": "Jadwal Pelajaran",
  "/exams": "Jadwal Ujian",
  "/payments": "Pembayaran SPP",
  "/attendance": "Absensi Siswa",
  "/teacher-attendance": "Absensi Guru",
  "/grades": "Penilaian",
  "/report-cards": "Rapor Digital",
  "/accounts": "Manajemen Akun System",
  "/data-siswa": "Data Siswa",
};

// Helper: parse date to timestamp millis safely
function parseDocTimestamp(val: any): number {
  if (!val) return 0;
  if (typeof val === "number") return val;
  if (typeof val.toMillis === "function") return val.toMillis();
  if (typeof val.toDate === "function") return val.toDate().getTime();
  if (val.seconds) return val.seconds * 1000;
  if (typeof val === "string") {
    const parsed = Date.parse(val);
    if (!isNaN(parsed)) return parsed;
  }
  return 0;
}

export function formatNotificationTime(timestampMillis: number): string {
  if (!timestampMillis) return "Baru saja";
  const now = Date.now();
  const diffSec = Math.floor((now - timestampMillis) / 1000);
  if (diffSec < 60) return "Baru saja";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}j lalu`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return "Kemarin";
  if (diffDay < 7) return `${diffDay}h lalu`;
  return new Date(timestampMillis).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

export function NotificationBadgeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, userData, role, rawRole, isSuperAdmin, isAdmin, isGuru, isStudent, isParent } = useAuth();
  const userRole = (rawRole || role || "").toLowerCase();
  const uid = user?.uid;

  const [readState, setReadState] = useState<MenuReadState>(() => {
    if (typeof window !== "undefined" && uid) {
      try {
        const cached = localStorage.getItem(`qs_menu_reads_${uid}`);
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return { lastReadAt: {}, readItemIds: {} };
  });

  // Raw data snapshots state
  const [announcementsData, setAnnouncementsData] = useState<any[]>([]);
  const [calendarData, setCalendarData] = useState<any[]>([]);
  const [schedulesData, setSchedulesData] = useState<any[]>([]);
  const [examsData, setExamsData] = useState<any[]>([]);
  const [billsData, setBillsData] = useState<any[]>([]);
  const [usersData, setUsersData] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [gradesData, setGradesData] = useState<any[]>([]);
  const [studentsData, setStudentsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Read initial cache when uid changes
  useEffect(() => {
    if (!uid) return;
    try {
      const cached = localStorage.getItem(`qs_menu_reads_${uid}`);
      if (cached) {
        setReadState(JSON.parse(cached));
      }
    } catch (e) {}
  }, [uid]);

  // 1. Synchronize user_menu_reads from Firestore
  useEffect(() => {
    if (!uid) return;

    // Listen to user_menu_reads/{uid}
    const unsub = onSnapshot(doc(db, "user_menu_reads", uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as MenuReadState;
        setReadState((prev) => {
          const merged: MenuReadState = {
            lastReadAt: { ...(prev.lastReadAt || {}), ...(data.lastReadAt || {}) },
            readItemIds: { ...(prev.readItemIds || {}), ...(data.readItemIds || {}) },
            updatedAt: data.updatedAt,
          };
          try {
            localStorage.setItem(`qs_menu_reads_${uid}`, JSON.stringify(merged));
          } catch (e) {}
          return merged;
        });
      } else if (userData?.menuReads) {
        // Fallback to user doc menuReads if exists
        const data = userData.menuReads as MenuReadState;
        setReadState((prev) => ({
          lastReadAt: { ...(prev.lastReadAt || {}), ...(data.lastReadAt || {}) },
          readItemIds: { ...(prev.readItemIds || {}), ...(data.readItemIds || {}) },
        }));
      }
      setIsLoading(false);
    }, (err) => {
      console.warn("user_menu_reads snapshot error:", err);
      setIsLoading(false);
    });

    return () => unsub();
  }, [uid, userData]);

  // 2. Real-time collections listeners
  useEffect(() => {
    if (!uid) return;

    // A. Announcements
    const unsubAnnouncements = onSnapshot(collection(db, "announcements"), (snap) => {
      setAnnouncementsData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("announcements notif error:", err));

    // B. Calendar Events
    const unsubCalendar = onSnapshot(collection(db, "calendar_events"), (snap) => {
      setCalendarData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("calendar notif error:", err));

    // C. Schedules
    const unsubSchedules = onSnapshot(collection(db, "schedules"), (snap) => {
      setSchedulesData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("schedules notif error:", err));

    // D. Exam Schedules
    const unsubExams = onSnapshot(collection(db, "examSchedules"), (snap) => {
      setExamsData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("exams notif error:", err));

    // E. SPP Bills
    const unsubBills = onSnapshot(doc(db, "roles", "spp_bills"), (snap) => {
      if (snap.exists()) {
        const raw = snap.data()?.bills;
        if (Array.isArray(raw)) setBillsData(raw);
      }
    }, (err) => console.warn("bills notif error:", err));

    // F. Users (for Super Admin & Admin)
    let unsubUsers = () => {};
    if (isSuperAdmin || isAdmin) {
      unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
        setUsersData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }, (err) => console.warn("users notif error:", err));
    }

    // G. Attendance (for Students, Parents, Guru)
    const unsubAttendance = onSnapshot(collection(db, "attendance"), (snap) => {
      setAttendanceData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("attendance notif error:", err));

    // H. Grades (for Students & Parents)
    let unsubGrades = () => {};
    if (isStudent || isParent) {
      unsubGrades = onSnapshot(collection(db, "grades"), (snap) => {
        setGradesData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }, (err) => console.warn("grades notif error:", err));
    }

    // I. Students (for Admin & Guru)
    let unsubStudents = () => {};
    if (isAdmin || isSuperAdmin || isGuru) {
      unsubStudents = onSnapshot(collection(db, "students"), (snap) => {
        setStudentsData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }, (err) => console.warn("students notif error:", err));
    }

    return () => {
      unsubAnnouncements();
      unsubCalendar();
      unsubSchedules();
      unsubExams();
      unsubBills();
      unsubUsers();
      unsubAttendance();
      unsubGrades();
      unsubStudents();
    };
  }, [uid, isSuperAdmin, isAdmin, isGuru, isStudent, isParent]);

  // Read baseline helper: if never read, use past 7 days so only fresh items trigger badges
  const getBaselineTimestamp = useCallback((path: string): number => {
    const specific = readState.lastReadAt?.[path];
    if (specific) {
      const t = parseDocTimestamp(specific);
      if (t > 0) return t;
    }
    return Date.now() - 7 * 24 * 60 * 60 * 1000;
  }, [readState.lastReadAt]);

  // Calculate live badge counts
  const badges = useMemo<Record<string, number>>(() => {
    if (!uid) return {};
    const res: Record<string, number> = {};

    // 1. Announcements (/announcements)
    {
      const path = "/announcements";
      const baseline = getBaselineTimestamp(path);
      const readIds = new Set(readState.readItemIds?.[path] || []);

      let count = 0;
      announcementsData.forEach((a) => {
        if (a.status === "Arsip") return;
        if (readIds.has(a.id)) return;

        // Role targeting check with unified helper
        if (!isAnnouncementVisibleForRole(a.target, userRole, isSuperAdmin, isAdmin)) return;

        const docTime = parseDocTimestamp(a.createdAt || a.date);
        if (docTime > baseline) {
          count++;
        }
      });
      if (count > 0) res[path] = count;
    }

    // 2. Calendar (/calendar)
    {
      const path = "/calendar";
      const baseline = getBaselineTimestamp(path);
      let count = 0;
      calendarData.forEach((c) => {
        const docTime = parseDocTimestamp(c.createdAt || c.updatedAt);
        if (docTime > baseline) count++;
      });
      if (count > 0) res[path] = count;
    }

    // 3. Schedules (/schedule)
    {
      const path = "/schedule";
      const baseline = getBaselineTimestamp(path);
      let count = 0;
      schedulesData.forEach((s) => {
        const docTime = parseDocTimestamp(s.createdAt || s.updatedAt);
        if (docTime > baseline) count++;
      });
      if (count > 0) res[path] = count;
    }

    // 4. Exams (/exams)
    {
      const path = "/exams";
      const baseline = getBaselineTimestamp(path);
      let count = 0;
      examsData.forEach((e) => {
        const docTime = parseDocTimestamp(e.createdAt || e.updatedAt);
        if (docTime > baseline) count++;
      });
      if (count > 0) res[path] = count;
    }

    // 5. SPP Payments (/payments)
    {
      const path = "/payments";
      const baseline = getBaselineTimestamp(path);
      if (isStudent || isParent) {
        const studentId = userData?.nisn || userData?.studentId || uid;
        const studentName = (userData?.name || userData?.fullName || "").trim().toLowerCase();
        let unpaidCount = 0;
        billsData.forEach((b) => {
          const isMatched =
            (b.studentId && b.studentId === studentId) ||
            (b.nisn && b.nisn === studentId) ||
            (studentName && b.studentName && b.studentName.toLowerCase().includes(studentName));
          if (isMatched && (b.status === "Unpaid" || b.status === "Overdue" || b.status === "Partial")) {
            unpaidCount++;
          }
        });
        if (unpaidCount > 0) res[path] = unpaidCount;
      } else if (isAdmin || isSuperAdmin) {
        let count = 0;
        billsData.forEach((b) => {
          const docTime = parseDocTimestamp(b.createdAt || b.updatedAt);
          if (docTime > baseline || b.status === "Overdue") {
            count++;
          }
        });
        if (count > 0) res[path] = Math.min(count, 99);
      }
    }

    // 6. Accounts Management (/accounts) - Super Admin & Admin only
    if (isSuperAdmin || isAdmin) {
      const path = "/accounts";
      const baseline = getBaselineTimestamp(path);
      let count = 0;
      usersData.forEach((u) => {
        const isUnboarded = u.onboardingCompleted === false || u.status === "Belum Onboarding";
        const docTime = parseDocTimestamp(u.createdAt);
        if (isUnboarded || docTime > baseline) {
          count++;
        }
      });
      if (count > 0) res[path] = count;
    }

    // 7. Data Siswa (/data-siswa) - Admin & Staff only
    if (isAdmin || isSuperAdmin || isGuru) {
      const path = "/data-siswa";
      const baseline = getBaselineTimestamp(path);
      let count = 0;
      studentsData.forEach((st) => {
        const docTime = parseDocTimestamp(st.createdAt || st.updatedAt);
        if (docTime > baseline) {
          count++;
        }
      });
      if (count > 0) res[path] = Math.min(count, 99);
    }

    // 8. Attendance (/attendance) - For student/parent notification
    if (isStudent || isParent) {
      const path = "/attendance";
      const baseline = getBaselineTimestamp(path);
      const studentId = userData?.nisn || userData?.studentId || uid;
      let count = 0;
      attendanceData.forEach((att) => {
        if (att.studentId === studentId || att.uid === uid) {
          const docTime = parseDocTimestamp(att.createdAt || att.timestamp || att.date);
          if (docTime > baseline && att.status && att.status !== "Hadir") {
            count++;
          }
        }
      });
      if (count > 0) res[path] = count;
    }

    // 9. Grades (/grades) - For student/parent notification
    if (isStudent || isParent) {
      const path = "/grades";
      const baseline = getBaselineTimestamp(path);
      const studentId = userData?.nisn || userData?.studentId || uid;
      let count = 0;
      gradesData.forEach((g) => {
        if (g.studentId === studentId) {
          const docTime = parseDocTimestamp(g.createdAt || g.updatedAt);
          if (docTime > baseline) {
            count++;
          }
        }
      });
      if (count > 0) res[path] = count;
    }

    return res;
  }, [
    uid,
    announcementsData,
    calendarData,
    schedulesData,
    examsData,
    billsData,
    usersData,
    attendanceData,
    gradesData,
    studentsData,
    readState,
    getBaselineTimestamp,
    isSuperAdmin,
    isAdmin,
    isGuru,
    isStudent,
    isParent,
    userData,
  ]);

  // Mark a menu path as opened / read
  const markAsRead = useCallback(async (path: string) => {
    if (!uid || !path) return;

    const nowIso = new Date().toISOString();

    // 1. Optimistic local update
    setReadState((prev) => {
      const updated: MenuReadState = {
        ...prev,
        lastReadAt: {
          ...(prev.lastReadAt || {}),
          [path]: nowIso,
        },
        updatedAt: nowIso,
      };
      try {
        localStorage.setItem(`qs_menu_reads_${uid}`, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // 2. Persist to Firestore: dual sync to user_menu_reads and users/{uid}.menuReads
    try {
      const payload = {
        uid,
        lastReadAt: {
          ...(readState.lastReadAt || {}),
          [path]: nowIso,
        },
        updatedAt: nowIso,
      };

      await Promise.allSettled([
        setDoc(doc(db, "user_menu_reads", uid), payload, { merge: true }),
        setDoc(doc(db, "users", uid), { menuReads: payload }, { merge: true }),
      ]);
    } catch (err) {
      console.warn("Failed to sync markAsRead to Firestore:", err);
    }
  }, [uid, readState.lastReadAt]);

  // Mark specific item within a menu (e.g. specific announcement) as read
  const markItemAsRead = useCallback(async (path: string, itemId: string) => {
    if (!uid || !path || !itemId) return;

    const currentItems = readState.readItemIds?.[path] || [];
    if (currentItems.includes(itemId)) return;

    const updatedItems = [...currentItems, itemId];
    const nowIso = new Date().toISOString();

    setReadState((prev) => {
      const updated: MenuReadState = {
        ...prev,
        readItemIds: {
          ...(prev.readItemIds || {}),
          [path]: updatedItems,
        },
        updatedAt: nowIso,
      };
      try {
        localStorage.setItem(`qs_menu_reads_${uid}`, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      const payload = {
        uid,
        readItemIds: {
          ...(readState.readItemIds || {}),
          [path]: updatedItems,
        },
        updatedAt: nowIso,
      };
      await Promise.allSettled([
        setDoc(doc(db, "user_menu_reads", uid), payload, { merge: true }),
        setDoc(doc(db, "users", uid), { menuReads: payload }, { merge: true }),
      ]);
    } catch (err) {
      console.warn("Failed to sync markItemAsRead to Firestore:", err);
    }
  }, [uid, readState.readItemIds]);

  // Mark all menus as read
  const markAllAsRead = useCallback(async () => {
    if (!uid) return;

    const nowIso = new Date().toISOString();
    const allPaths = Object.keys(MENU_LABELS);
    const newLastReadAt: Record<string, string> = { ...(readState.lastReadAt || {}) };
    allPaths.forEach((p) => {
      newLastReadAt[p] = nowIso;
    });

    setReadState((prev) => {
      const updated: MenuReadState = {
        ...prev,
        lastReadAt: newLastReadAt,
        updatedAt: nowIso,
      };
      try {
        localStorage.setItem(`qs_menu_reads_${uid}`, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      const payload = {
        uid,
        lastReadAt: newLastReadAt,
        updatedAt: nowIso,
      };
      await Promise.allSettled([
        setDoc(doc(db, "user_menu_reads", uid), payload, { merge: true }),
        setDoc(doc(db, "users", uid), { menuReads: payload }, { merge: true }),
      ]);
    } catch (err) {
      console.warn("Failed to sync markAllAsRead to Firestore:", err);
    }
  }, [uid, readState.lastReadAt]);

  // Automatically mark current page as read when route changes
  const prevPathRef = useRef<string>("");
  useEffect(() => {
    if (!pathname || !uid) return;

    const matchingPath = Object.keys(MENU_LABELS).find(
      (mPath) => pathname === mPath || pathname.startsWith(mPath + "/")
    );

    if (matchingPath && matchingPath !== prevPathRef.current) {
      prevPathRef.current = matchingPath;
      const timer = setTimeout(() => {
        markAsRead(matchingPath);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pathname, uid, markAsRead]);

  // Safe getter: hides badge if user is currently on that active route
  const getBadgeCount = useCallback((path: string): number => {
    if (!path) return 0;
    if (pathname === path || (path !== "/" && pathname?.startsWith(path + "/"))) {
      return 0;
    }
    return badges[path] || 0;
  }, [badges, pathname]);

  // Calculate total unread count (excluding currently open page)
  const totalUnreadCount = useMemo(() => {
    let total = 0;
    Object.keys(badges).forEach((path) => {
      if (pathname !== path && !pathname?.startsWith(path + "/")) {
        total += badges[path] || 0;
      }
    });
    return total;
  }, [badges, pathname]);

  // Detailed synthesized notification items
  const notificationsList = useMemo<NotificationItem[]>(() => {
    if (!uid) return [];
    const list: NotificationItem[] = [];

    // 1. Critical Onboarding Reminder (if account not completed)
    const isOnboardingIncomplete = userData?.onboardingCompleted === false || userData?.status === "Belum Onboarding";
    if (isOnboardingIncomplete) {
      list.push({
        id: "notif-onboarding-alert",
        category: "system",
        categoryLabel: "Verifikasi Profil",
        categoryPath: "/onboarding",
        title: "Lengkapi Biodata & Pendaftaran Akun",
        description: "Akun Anda belum menyelesaikan proses pendaftaran. Lengkapi biodata agar data tersimpan lengkap.",
        timestamp: Date.now(),
        formattedTime: "Penting",
        href: "/onboarding",
        isRead: false,
        priority: "urgent",
      });
    }

    // 2. Announcements
    const annBaseline = getBaselineTimestamp("/announcements");
    const readAnnIds = new Set(readState.readItemIds?.["/announcements"] || []);
    announcementsData.forEach((a) => {
      if (a.status === "Arsip") return;
      // Role targeting check with unified helper
      if (!isAnnouncementVisibleForRole(a.target, userRole, isSuperAdmin, isAdmin)) return;

      const docTime = parseDocTimestamp(a.createdAt || a.date);
      const isUnread = !readAnnIds.has(a.id) && docTime > annBaseline;

      list.push({
        id: a.id,
        category: "announcement",
        categoryLabel: a.tag || "Pengumuman",
        categoryPath: "/announcements",
        title: a.title || "Pengumuman Sekolah",
        description: cleanAnnouncementDesc(a.desc || "Informasi resmi untuk warga sekolah."),
        timestamp: docTime,
        formattedTime: formatNotificationTime(docTime),
        href: "/announcements",
        isRead: !isUnread,
        priority: a.tag === "PENTING" ? "high" : "normal",
      });
    });

    // 3. Calendar Events
    const calBaseline = getBaselineTimestamp("/calendar");
    const readCalIds = new Set(readState.readItemIds?.["/calendar"] || []);
    calendarData.forEach((c) => {
      const docTime = parseDocTimestamp(c.createdAt || c.updatedAt || c.date);
      const isUnread = !readCalIds.has(c.id) && docTime > calBaseline;
      list.push({
        id: c.id,
        category: "academic",
        categoryLabel: "Agenda Kalender",
        categoryPath: "/calendar",
        title: c.title || c.name || "Kegiatan Akademik",
        description: `${c.date || "Jadwal"} • ${c.description || c.type || "Kegiatan Sekolah"}`,
        timestamp: docTime,
        formattedTime: formatNotificationTime(docTime),
        href: "/calendar",
        isRead: !isUnread,
      });
    });

    // 4. Exams
    const examBaseline = getBaselineTimestamp("/exams");
    const readExamIds = new Set(readState.readItemIds?.["/exams"] || []);
    examsData.forEach((e) => {
      const docTime = parseDocTimestamp(e.createdAt || e.updatedAt);
      const isUnread = !readExamIds.has(e.id) && docTime > examBaseline;
      list.push({
        id: e.id,
        category: "academic",
        categoryLabel: "Jadwal Ujian",
        categoryPath: "/exams",
        title: `Ujian ${e.subject || e.title || "Pelajaran"}`,
        description: `${e.className || "Kelas"} • ${e.date || e.examDate || "Jadwal telah diterbitkan"}`,
        timestamp: docTime,
        formattedTime: formatNotificationTime(docTime),
        href: "/exams",
        isRead: !isUnread,
      });
    });

    // 5. SPP Bills
    if (isStudent || isParent) {
      const studentId = userData?.nisn || userData?.studentId || uid;
      const studentName = (userData?.name || userData?.fullName || "").trim().toLowerCase();
      billsData.forEach((b) => {
        const isMatched =
          (b.studentId && b.studentId === studentId) ||
          (b.nisn && b.nisn === studentId) ||
          (studentName && b.studentName && b.studentName.toLowerCase().includes(studentName));
        if (isMatched && (b.status === "Unpaid" || b.status === "Overdue" || b.status === "Partial")) {
          const docTime = parseDocTimestamp(b.createdAt || b.updatedAt);
          list.push({
            id: b.id,
            category: "finance",
            categoryLabel: "Tagihan SPP",
            categoryPath: "/payments",
            title: `Tagihan SPP: ${b.periodMonth}`,
            description: `Status: ${b.status} • Jatuh Tempo: ${b.dueDate || "-"}`,
            timestamp: docTime,
            formattedTime: formatNotificationTime(docTime),
            href: "/payments",
            isRead: false,
            priority: b.status === "Overdue" ? "high" : "normal",
          });
        }
      });
    } else if (isAdmin || isSuperAdmin) {
      billsData.slice(0, 10).forEach((b) => {
        if (b.status === "Overdue") {
          const docTime = parseDocTimestamp(b.updatedAt || b.createdAt);
          list.push({
            id: `bill-ov-${b.id}`,
            category: "finance",
            categoryLabel: "Tunggakan SPP",
            categoryPath: "/payments",
            title: `Tunggakan SPP: ${b.studentName || b.invoiceNo}`,
            description: `Periode: ${b.periodMonth || ""} • Belum lunas`,
            timestamp: docTime,
            formattedTime: formatNotificationTime(docTime),
            href: "/payments",
            isRead: false,
            priority: "high",
          });
        }
      });
    }

    // 6. Users (Admin/Super Admin only)
    if (isAdmin || isSuperAdmin) {
      usersData.forEach((u) => {
        const isUnboarded = u.onboardingCompleted === false || u.status === "Belum Onboarding";
        if (isUnboarded) {
          const docTime = parseDocTimestamp(u.createdAt);
          list.push({
            id: `user-unboard-${u.id}`,
            category: "system",
            categoryLabel: "Akun Pengguna",
            categoryPath: "/accounts",
            title: `Pendaftaran Baru: ${u.name || u.email}`,
            description: `Role: ${u.role || "User"} • Belum menyelesaikan onboarding`,
            timestamp: docTime,
            formattedTime: formatNotificationTime(docTime),
            href: "/accounts",
            isRead: false,
            priority: "normal",
          });
        }
      });
    }

    // Sort: Unread first, then newest timestamp
    return list.sort((a, b) => {
      if (a.priority === "urgent" && b.priority !== "urgent") return -1;
      if (b.priority === "urgent" && a.priority !== "urgent") return 1;
      if (!a.isRead && b.isRead) return -1;
      if (a.isRead && !b.isRead) return 1;
      return b.timestamp - a.timestamp;
    });
  }, [
    uid,
    userData,
    announcementsData,
    calendarData,
    examsData,
    billsData,
    usersData,
    readState,
    getBaselineTimestamp,
    isSuperAdmin,
    isAdmin,
    isGuru,
    isStudent,
    isParent,
  ]);

  // Detailed list of unread items for dropdown
  const unreadDetails = useMemo<UnreadDetail[]>(() => {
    return Object.entries(badges)
      .filter(([path, count]) => count > 0 && pathname !== path && !pathname?.startsWith(path + "/"))
      .map(([path, count]) => ({
        path,
        label: MENU_LABELS[path] || path,
        count,
      }));
  }, [badges, pathname]);

  return (
    <NotificationBadgeContext.Provider
      value={{
        badges,
        getBadgeCount,
        totalUnreadCount,
        unreadDetails,
        notificationsList,
        markAsRead,
        markItemAsRead,
        markAllAsRead,
        isLoading,
      }}
    >
      {children}
    </NotificationBadgeContext.Provider>
  );
}

export function useNotificationBadges() {
  return useContext(NotificationBadgeContext);
}
