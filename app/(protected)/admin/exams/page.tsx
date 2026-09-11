"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  CalendarRange, Search, Plus, Edit3, Trash2, Printer, 
  Clock, MapPin, User, FileText, 
  Calendar as CalendarIcon, 
  School, X, Loader2, Save,
  ArrowLeft, ChevronRight,
  FolderPlus, BookOpen, GraduationCap, LayoutGrid,
  Settings, AlertTriangle
} from "lucide-react";
import { 
  collection, onSnapshot, doc, setDoc, addDoc, deleteDoc, 
  serverTimestamp, getDoc 
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { AlertBox, AlertType } from "@/components/ui/alert-box";
import { useTimePresets } from "@/lib/time-presets";
import TimePresetManagerModal from "@/components/schedule/TimePresetManagerModal";

// ==========================================
// TYPES & INTERFACES
// ==========================================

export interface ExamGroup {
  id: string;
  name: string; // e.g. "UJIAN PTS XII IPA"
  examType: string; // PTS, PAS, PAT, UTS, UAS, Sumatif, Praktik, Try Out, etc.
  academicYear: string; // e.g. "2025/2026 - Ganjil"
  targetClass: string; // e.g. "12 MIPA 1", "XII IPA", "Semua Kelas 12"
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
  status: "Akan Datang" | "Sedang Berlangsung" | "Selesai" | "Draft";
  description?: string;
  instructions?: string;
  isGroup?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface ExamScheduleItem {
  id: string;
  groupId?: string;
  groupName?: string;
  title: string;
  examType: string;
  subject: string;
  classId: string;
  date: string;
  startTime: string;
  endTime: string;
  totalDuration?: string;
  room: string;
  proctor: string;
  passingScore: number;
  status: "Akan Datang" | "Sedang Berlangsung" | "Selesai";
  instructions?: string;
  isGroup?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

// Local Storage Helper for resilience & instant offline/online reactivity
const getLocalGroups = (): ExamGroup[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("qs_exam_groups");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const saveLocalGroups = (groups: ExamGroup[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("qs_exam_groups", JSON.stringify(groups));
  } catch (e) {}
};

export default function ExamSchedulePage() {
  // Navigation / Selection State: null = Daftar Kelompok Ujian, string = Detail Kelompok
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Firestore & Real database state
  const [examGroupsList, setExamGroupsList] = useState<ExamGroup[]>([]);
  const [examSchedulesList, setExamSchedulesList] = useState<ExamScheduleItem[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // Local cache groups to guarantee zero flicker and immediate UI update
  const [localGroups, setLocalGroups] = useState<ExamGroup[]>([]);

  // App & User Role State
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("admin");
  const [studentClass, setStudentClass] = useState<string>("");

  // Filters for Daftar Kelompok (Main Page)
  const [groupSearchQuery, setGroupSearchQuery] = useState<string>("");
  const [selectedGroupType, setSelectedGroupType] = useState<string>("All");
  const [selectedGroupClass, setSelectedGroupClass] = useState<string>("All");
  const [selectedGroupStatus, setSelectedGroupStatus] = useState<string>("All");
  const [groupViewMode, setGroupViewMode] = useState<"cards" | "table">("cards");

  // Filters for Detail Kelompok (Sub Page)
  const [scheduleSearchQuery, setScheduleSearchQuery] = useState<string>("");
  const [scheduleDateFilter, setScheduleDateFilter] = useState<string>("All");
  const [scheduleViewMode, setScheduleViewMode] = useState<"cards" | "table">("cards");

  // Alert Box Toast State
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

  // Modals State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [isGroupSaving, setIsGroupSaving] = useState(false);

  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [isExamSaving, setIsExamSaving] = useState(false);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Delete Confirmation Modal State
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    type: "group" | "schedule";
    id: string;
    title: string;
    scheduleCount?: number;
    loading: boolean;
  }>({
    isOpen: false,
    type: "group",
    id: "",
    title: "",
    scheduleCount: 0,
    loading: false,
  });

  // Group Form Data
  const [groupFormData, setGroupFormData] = useState<{
    name: string;
    examType: string;
    academicYear: string;
    targetClass: string;
    startDate: string;
    endDate: string;
    status: "Akan Datang" | "Sedang Berlangsung" | "Selesai" | "Draft";
    description: string;
    instructions: string;
  }>({
    name: "",
    examType: "PTS",
    academicYear: "2025/2026 - Ganjil",
    targetClass: "10 MIPA 1",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0],
    status: "Akan Datang",
    description: "",
    instructions: "Wajib membawa kartu peserta ujian dan perlengkapan tulis lengkap. Hadir 15 menit sebelum bel."
  });

  // Exam Schedule Item Form Data
  const [examFormData, setExamFormData] = useState<{
    groupId: string;
    title: string;
    examType: string;
    subject: string;
    classId: string;
    date: string;
    startTime: string;
    endTime: string;
    room: string;
    proctor: string;
    passingScore: number;
    status: "Akan Datang" | "Sedang Berlangsung" | "Selesai";
    instructions: string;
  }>({
    groupId: "",
    title: "Penilaian Tengah Semester (PTS)",
    examType: "PTS",
    subject: "Matematika Utama",
    classId: "10 MIPA 1",
    date: new Date().toISOString().split("T")[0],
    startTime: "07:30",
    endTime: "09:30",
    room: "Ruang R.101",
    proctor: "Panitia Ujian",
    passingScore: 75,
    status: "Akan Datang",
    instructions: "Wajib membawa kartu peserta ujian dan alat tulis lengkap."
  });

  const { presets: timePresets } = useTimePresets();
  const [showTimePresetModal, setShowTimePresetModal] = useState(false);

  const isStudentRole = userRole === "student" || userRole === "siswa";

  // Load initial local groups
  useEffect(() => {
    setLocalGroups(getLocalGroups());
  }, []);

  // Check user auth & role & student class
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          const userSnap = await getDoc(doc(db, "users", u.uid));
          let r = "admin";
          let sClass = "";
          if (userSnap.exists()) {
            const data = userSnap.data();
            r = (data.role || "admin").toLowerCase();
            sClass = data.className || data.classId || data.kelas || "";
          }

          try {
            const studentSnap = await getDoc(doc(db, "students", u.uid));
            if (studentSnap.exists()) {
              const sData = studentSnap.data();
              if (sData.classId || sData.className) {
                sClass = sData.classId || sData.className;
              }
            }
          } catch (e) {}

          const roleNormalized = (r === "student" || r === "siswa") ? "siswa" : r;
          setUserRole(roleNormalized);
          if (sClass) {
            setStudentClass(sClass);
          }
        } catch (e) {
          console.error("User role fetch error:", e);
        }
      }
    });
    return () => unsubAuth();
  }, []);

  // Realtime Subscriptions directly from Firestore Database
  useEffect(() => {
    // 1. Exam Schedules & Groups stored in examSchedules collection
    const unsubExams = onSnapshot(collection(db, "examSchedules"), (snap) => {
      const allDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Separate groups (isGroup === true) from actual schedules
      const groups = allDocs.filter((d: any) => d.isGroup === true) as ExamGroup[];
      const schedules = allDocs.filter((d: any) => !d.isGroup) as ExamScheduleItem[];

      setExamGroupsList(groups);
      setExamSchedulesList(schedules);
      setLoading(false);

      if (groups.length > 0) {
        setLocalGroups(groups);
        saveLocalGroups(groups);
      }
    }, (err) => {
      console.warn("examSchedules listener fallback:", err);
      setLoading(false);
    });

    const unsubClasses = onSnapshot(collection(db, "classes"), (snap) => {
      setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubSubjects = onSnapshot(collection(db, "subjects"), (snap) => {
      setSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubTeachers = onSnapshot(collection(db, "teachers"), (snap) => {
      setTeachers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubStudents = onSnapshot(collection(db, "students"), (snap) => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubExams();
      unsubClasses();
      unsubSubjects();
      unsubTeachers();
      unsubStudents();
    };
  }, []);

  // Match student class fallback
  useEffect(() => {
    if (isStudentRole && !studentClass && students.length > 0 && auth.currentUser) {
      const uid = auth.currentUser.uid;
      const email = auth.currentUser.email?.toLowerCase();
      const match = students.find(s => s.id === uid || s.uid === uid || (s.email && s.email.toLowerCase() === email));
      if (match && (match.classId || match.className)) {
        setStudentClass(match.classId || match.className);
      }
    }
  }, [isStudentRole, studentClass, students]);

  // Pure Database Exam Groups (Combined Firestore + local reactive cache, deduplicated)
  const allGroups = useMemo<ExamGroup[]>(() => {
    const map = new Map<string, ExamGroup>();
    // Add local groups first
    localGroups.forEach(g => map.set(g.id, g));
    // Firestore overrides/updates local groups
    examGroupsList.forEach(g => map.set(g.id, g));
    return Array.from(map.values()).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  }, [examGroupsList, localGroups]);

  // Pure Database Exam Schedules (Items belonging to exam groups)
  const allSchedules = useMemo<ExamScheduleItem[]>(() => {
    const uniqueMap = new Map<string, ExamScheduleItem>();
    examSchedulesList.forEach(item => {
      if (!item.isGroup && item.groupId) {
        uniqueMap.set(item.id, item);
      }
    });
    return Array.from(uniqueMap.values());
  }, [examSchedulesList]);

  // Helper to match class names flexibly (e.g. "10 MIPA 1" vs "10-MIPA-1")
  const matchClassId = (clsA?: string, clsB?: string): boolean => {
    if (!clsA || !clsB) return false;
    const cleanA = clsA.toLowerCase().replace(/[\s\-_]/g, "");
    const cleanB = clsB.toLowerCase().replace(/[\s\-_]/g, "");
    return cleanA === cleanB || cleanA.includes(cleanB) || cleanB.includes(cleanA);
  };

  // Helper to check if exam is a Semester Exam (UTS/PTS or UAS/PAS)
  const isSemesterExamType = (type?: string, title?: string): boolean => {
    const t = (type || "").toUpperCase().trim();
    const tit = (title || "").toUpperCase().trim();
    const isUTS = t === "PTS" || t === "UTS" || t.includes("TENGAH") || tit.includes("PTS") || tit.includes("UTS") || tit.includes("TENGAH");
    const isUAS = t === "PAS" || t === "UAS" || t === "PAT" || t.includes("AKHIR") || tit.includes("PAS") || tit.includes("UAS") || tit.includes("AKHIR");
    return isUTS || isUAS;
  };

  // Map each group to its schedules
  const groupSchedulesMap = useMemo(() => {
    const map = new Map<string, ExamScheduleItem[]>();
    allGroups.forEach(g => map.set(g.id, []));

    allSchedules.forEach(sc => {
      if (sc.groupId && map.has(sc.groupId)) {
        map.get(sc.groupId)!.push(sc);
      } else {
        // Fallback match: if groupId doesn't match directly, match by group name or class & type
        const foundGroup = allGroups.find(g => 
          (sc.groupName && g.name.toLowerCase() === sc.groupName.toLowerCase()) ||
          (g.examType === sc.examType && matchClassId(g.targetClass, sc.classId))
        );
        if (foundGroup && map.has(foundGroup.id)) {
          map.get(foundGroup.id)!.push(sc);
        }
      }
    });

    // Sort schedules inside each group by date and start time
    map.forEach((list) => {
      list.sort((a, b) => {
        const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return (a.startTime || "").localeCompare(b.startTime || "");
      });
    });

    return map;
  }, [allGroups, allSchedules]);

  // Filtered Groups for Main List
  const filteredGroups = useMemo(() => {
    const effectiveStudentClass = studentClass || "10 MIPA 1";

    return allGroups.filter(grp => {
      // 1. If student: only show groups for student's class and semester exams
      if (isStudentRole) {
        if (!isSemesterExamType(grp.examType, grp.name)) return false;
        if (!matchClassId(grp.targetClass, effectiveStudentClass)) {
          const schedules = groupSchedulesMap.get(grp.id) || [];
          const hasClassSchedule = schedules.some(s => matchClassId(s.classId, effectiveStudentClass));
          if (!hasClassSchedule) return false;
        }
      }

      // 2. Class Filter
      if (!isStudentRole && selectedGroupClass !== "All") {
        if (!matchClassId(grp.targetClass, selectedGroupClass)) return false;
      }

      // 3. Type Filter
      if (selectedGroupType !== "All" && grp.examType !== selectedGroupType) {
        return false;
      }

      // 4. Status Filter
      if (selectedGroupStatus !== "All" && grp.status !== selectedGroupStatus) {
        return false;
      }

      // 5. Search Query
      if (groupSearchQuery.trim()) {
        const q = groupSearchQuery.toLowerCase();
        const matchName = grp.name.toLowerCase().includes(q);
        const matchType = grp.examType.toLowerCase().includes(q);
        const matchClass = grp.targetClass.toLowerCase().includes(q);
        const matchDesc = (grp.description || "").toLowerCase().includes(q);
        if (!matchName && !matchType && !matchClass && !matchDesc) return false;
      }

      return true;
    });
  }, [allGroups, isStudentRole, studentClass, selectedGroupClass, selectedGroupType, selectedGroupStatus, groupSearchQuery, groupSchedulesMap]);

  // The active selected group (if any)
  const currentGroup = useMemo(() => {
    if (!selectedGroupId) return null;
    return allGroups.find(g => g.id === selectedGroupId) || null;
  }, [selectedGroupId, allGroups]);

  // Schedules in current selected group
  const currentGroupSchedules = useMemo(() => {
    if (!currentGroup) return [];
    const schedules = groupSchedulesMap.get(currentGroup.id) || [];
    
    return schedules.filter(sc => {
      // Date filter
      if (scheduleDateFilter !== "All" && sc.date !== scheduleDateFilter) {
        return false;
      }
      // Search filter
      if (scheduleSearchQuery.trim()) {
        const q = scheduleSearchQuery.toLowerCase();
        const matchSubj = sc.subject.toLowerCase().includes(q);
        const matchRoom = sc.room.toLowerCase().includes(q);
        const matchProctor = sc.proctor.toLowerCase().includes(q);
        const matchClass = sc.classId.toLowerCase().includes(q);
        if (!matchSubj && !matchRoom && !matchProctor && !matchClass) return false;
      }
      return true;
    });
  }, [currentGroup, groupSchedulesMap, scheduleDateFilter, scheduleSearchQuery]);

  // Unique dates in current group for filter
  const currentGroupDates = useMemo(() => {
    if (!currentGroup) return [];
    const schedules = groupSchedulesMap.get(currentGroup.id) || [];
    return Array.from(new Set(schedules.map(s => s.date))).sort();
  }, [currentGroup, groupSchedulesMap]);

  // Overall Metrics
  const globalMetrics = useMemo(() => {
    const totalGroups = allGroups.length;
    const totalSchedules = allSchedules.length;
    const activeGroups = allGroups.filter(g => g.status === "Akan Datang" || g.status === "Sedang Berlangsung").length;
    const rooms = new Set(allSchedules.map(s => s.room)).size;
    return { totalGroups, totalSchedules, activeGroups, rooms };
  }, [allGroups, allSchedules]);

  // Current Group Metrics
  const currentGroupMetrics = useMemo(() => {
    if (!currentGroup) return { totalMapel: 0, rooms: 0, proctors: 0, completed: 0 };
    const schedules = groupSchedulesMap.get(currentGroup.id) || [];
    const totalMapel = schedules.length;
    const rooms = new Set(schedules.map(s => s.room)).size;
    const proctors = new Set(schedules.map(s => s.proctor)).size;
    const completed = schedules.filter(s => s.status === "Selesai").length;
    return { totalMapel, rooms, proctors, completed };
  }, [currentGroup, groupSchedulesMap]);

  // ==========================================
  // COMPLETE CRUD HANDLERS: KELOMPOK UJIAN
  // ==========================================

  // 1. OPEN CREATE MODAL
  const handleOpenAddGroup = () => {
    setEditingGroupId(null);
    const defaultClass = classes[0]?.name || classes[0]?.className || "10 MIPA 1";
    setGroupFormData({
      name: "",
      examType: "PTS",
      academicYear: "2025/2026 - Ganjil",
      targetClass: defaultClass,
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0],
      status: "Akan Datang",
      description: "",
      instructions: "Wajib membawa kartu peserta ujian dan perlengkapan tulis lengkap. Hadir 15 menit sebelum bel."
    });
    setIsGroupModalOpen(true);
  };

  // 2. OPEN EDIT MODAL (PRE-FILLED)
  const handleEditGroup = (grp: ExamGroup) => {
    setEditingGroupId(grp.id);
    setGroupFormData({
      name: grp.name,
      examType: grp.examType,
      academicYear: grp.academicYear || "2025/2026 - Ganjil",
      targetClass: grp.targetClass || (classes[0]?.name || "10 MIPA 1"),
      startDate: grp.startDate || new Date().toISOString().split("T")[0],
      endDate: grp.endDate || new Date().toISOString().split("T")[0],
      status: grp.status || "Akan Datang",
      description: grp.description || "",
      instructions: grp.instructions || ""
    });
    setIsGroupModalOpen(true);
  };

  // 3. SUBMIT FORM (CREATE / UPDATE TO FIRESTORE DATABASE)
  const handleSubmitGroupForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupFormData.name || !groupFormData.startDate || !groupFormData.endDate) {
      triggerAlert("error", "Harap lengkapi nama kelompok ujian dan rentang tanggal.", "Gagal Validasi");
      return;
    }

    setIsGroupSaving(true);
    try {
      const payload = {
        name: groupFormData.name.trim(),
        examType: groupFormData.examType,
        academicYear: groupFormData.academicYear,
        targetClass: groupFormData.targetClass,
        startDate: groupFormData.startDate,
        endDate: groupFormData.endDate,
        status: groupFormData.status,
        description: groupFormData.description || "",
        instructions: groupFormData.instructions || "",
        isGroup: true,
        updatedAt: serverTimestamp()
      };

      if (editingGroupId) {
        // --- UPDATE EXISTING GROUP ---
        await setDoc(doc(db, "examSchedules", editingGroupId), payload, { merge: true });
        
        // Update local state immediately
        const updatedLocal = localGroups.map(g => g.id === editingGroupId ? { ...g, ...payload, id: editingGroupId } : g);
        setLocalGroups(updatedLocal);
        saveLocalGroups(updatedLocal);

        // Also update groupName in linked schedules
        const linkedSchedules = allSchedules.filter(s => s.groupId === editingGroupId);
        for (const sc of linkedSchedules) {
          try {
            await setDoc(doc(db, "examSchedules", sc.id), { groupName: groupFormData.name.trim() }, { merge: true });
          } catch (e) {}
        }

        triggerAlert("edit", `Kelompok Ujian "${groupFormData.name}" berhasil diperbarui di database!`, "Berhasil Edit");
      } else {
        // --- CREATE NEW GROUP ---
        const newDocRef = await addDoc(collection(db, "examSchedules"), {
          ...payload,
          createdAt: serverTimestamp()
        });

        const newGroupObj: ExamGroup = {
          id: newDocRef.id,
          ...payload,
          createdAt: { seconds: Math.floor(Date.now() / 1000) }
        };

        const updatedLocal = [newGroupObj, ...localGroups];
        setLocalGroups(updatedLocal);
        saveLocalGroups(updatedLocal);

        triggerAlert("success", `Kelompok Ujian "${groupFormData.name}" berhasil disimpan ke database Firestore!`, "Berhasil");
        setSelectedGroupId(newDocRef.id);
      }

      setIsGroupModalOpen(false);
    } catch (err: any) {
      console.error("Error saving exam group:", err);
      triggerAlert("error", `Gagal menyimpan kelompok ujian: ${err?.message || "Terjadi kesalahan"}`, "Gagal");
    } finally {
      setIsGroupSaving(false);
    }
  };

  // 4. OPEN DELETE CONFIRMATION MODAL FOR GROUP
  const handleDeleteGroup = (groupId: string, groupName: string) => {
    const associatedCount = allSchedules.filter(s => s.groupId === groupId).length;
    setDeleteModalState({
      isOpen: true,
      type: "group",
      id: groupId,
      title: groupName,
      scheduleCount: associatedCount,
      loading: false,
    });
  };

  // CONFIRM DELETE HANDLER (FIRESTORE EXECUTION)
  const handleConfirmDelete = async () => {
    if (!deleteModalState.id) return;
    setDeleteModalState(prev => ({ ...prev, loading: true }));

    try {
      if (deleteModalState.type === "group") {
        const groupId = deleteModalState.id;
        const groupName = deleteModalState.title;

        // 1. Delete group document from Firestore
        await deleteDoc(doc(db, "examSchedules", groupId));

        // 2. Delete all associated exam schedules from Firestore
        const associatedSchedules = allSchedules.filter(s => s.groupId === groupId);
        for (const sc of associatedSchedules) {
          try {
            await deleteDoc(doc(db, "examSchedules", sc.id));
          } catch (e) {}
        }

        // 3. Update local state
        const updatedLocal = localGroups.filter(g => g.id !== groupId);
        setLocalGroups(updatedLocal);
        saveLocalGroups(updatedLocal);

        if (selectedGroupId === groupId) {
          setSelectedGroupId(null);
        }
        triggerAlert("error", `Kelompok Ujian "${groupName}" berhasil dihapus dari database.`, "Terhapus");
      } else {
        await deleteDoc(doc(db, "examSchedules", deleteModalState.id));
        triggerAlert("error", `Jadwal ujian ${deleteModalState.title} berhasil dihapus dari database.`, "Terhapus");
      }

      setDeleteModalState(prev => ({ ...prev, isOpen: false, loading: false }));
    } catch (err: any) {
      console.error("Error deleting from database:", err);
      triggerAlert("error", `Gagal menghapus data: ${err?.message || "Terjadi kesalahan"}`, "Gagal");
      setDeleteModalState(prev => ({ ...prev, loading: false }));
    }
  };

  // ==========================================
  // COMPLETE CRUD HANDLERS: JADWAL MAPEL DI KELOMPOK
  // ==========================================

  const handleOpenAddSchedule = () => {
    if (!currentGroup) return;
    setEditingExamId(null);

    const defaultSubject = subjects[0]?.name || subjects[0]?.subjectName || "Matematika Utama";
    const defaultTeacher = teachers[0]?.name || teachers[0]?.fullName || "Drs. Taufik Hidayat, M.Pd.";
    const defaultClass = currentGroup.targetClass || classes[0]?.name || "10 MIPA 1";

    setExamFormData({
      groupId: currentGroup.id,
      title: `${currentGroup.name} - ${currentGroup.examType}`,
      examType: currentGroup.examType,
      subject: defaultSubject,
      classId: defaultClass,
      date: currentGroup.startDate || new Date().toISOString().split("T")[0],
      startTime: "07:30",
      endTime: "09:30",
      room: "Ruang R.101",
      proctor: defaultTeacher,
      passingScore: 75,
      status: "Akan Datang",
      instructions: "Wajib membawa kartu peserta ujian dan alat tulis lengkap."
    });
    setIsExamModalOpen(true);
  };

  const handleEditSchedule = (schedule: ExamScheduleItem) => {
    setEditingExamId(schedule.id);
    setExamFormData({
      groupId: schedule.groupId || (currentGroup?.id || ""),
      title: schedule.title || "Jadwal Ujian",
      examType: schedule.examType || (currentGroup?.examType || "PTS"),
      subject: schedule.subject,
      classId: schedule.classId || (currentGroup?.targetClass || "10 MIPA 1"),
      date: schedule.date,
      startTime: schedule.startTime || "07:30",
      endTime: schedule.endTime || "09:30",
      room: schedule.room || "Ruang R.101",
      proctor: schedule.proctor || "Panitia Ujian",
      passingScore: schedule.passingScore || 75,
      status: schedule.status || "Akan Datang",
      instructions: schedule.instructions || ""
    });
    setIsExamModalOpen(true);
  };

  // Conflict Warning Detection
  const conflictWarning = useMemo(() => {
    if (!examFormData.date || !examFormData.startTime || !examFormData.room) return null;

    const conflict = allSchedules.find(e => 
      e.id !== editingExamId &&
      e.date === examFormData.date &&
      e.room.toLowerCase() === examFormData.room.toLowerCase() &&
      ((examFormData.startTime >= e.startTime && examFormData.startTime < e.endTime) ||
       (examFormData.endTime > e.startTime && examFormData.endTime <= e.endTime))
    );

    if (conflict) {
      return `Bentrokan Ruang: Ruang "${conflict.room}" sudah dipakai oleh ${conflict.subject} (${conflict.classId}) pada jam ${conflict.startTime} - ${conflict.endTime}!`;
    }
    return null;
  }, [examFormData, allSchedules, editingExamId]);

  const handleSubmitExamForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examFormData.subject || !examFormData.classId || !examFormData.date) {
      triggerAlert("error", "Harap lengkapi mata pelajaran, kelas, dan tanggal ujian.", "Gagal Validasi");
      return;
    }

    setIsExamSaving(true);
    try {
      let totalDuration = "90 Menit";
      if (examFormData.startTime && examFormData.endTime) {
        const [startH, startM] = examFormData.startTime.split(":").map(Number);
        const [endH, endM] = examFormData.endTime.split(":").map(Number);
        const durMinutes = (endH * 60 + endM) - (startH * 60 + startM);
        if (durMinutes > 0) totalDuration = `${durMinutes} Menit`;
      }

      const activeGroupId = examFormData.groupId || currentGroup?.id || "custom";
      const activeGroupName = currentGroup?.name || examFormData.title;

      const payload = {
        groupId: activeGroupId,
        groupName: activeGroupName,
        title: examFormData.title || activeGroupName,
        examType: examFormData.examType || (currentGroup?.examType || "PTS"),
        subject: examFormData.subject,
        classId: examFormData.classId,
        date: examFormData.date,
        startTime: examFormData.startTime || "07:30",
        endTime: examFormData.endTime || "09:30",
        room: examFormData.room || "Ruang R.101",
        proctor: examFormData.proctor || "Panitia Ujian",
        passingScore: Number(examFormData.passingScore) || 75,
        status: examFormData.status || "Akan Datang",
        instructions: examFormData.instructions || "",
        totalDuration,
        isGroup: false,
        updatedAt: serverTimestamp()
      };

      if (editingExamId) {
        await setDoc(doc(db, "examSchedules", editingExamId), payload, { merge: true });
        triggerAlert("edit", `Jadwal ${examFormData.subject} berhasil diperbarui di database!`, "Berhasil Edit");
      } else {
        await addDoc(collection(db, "examSchedules"), {
          ...payload,
          createdAt: serverTimestamp()
        });
        triggerAlert("success", `Jadwal ${examFormData.subject} berhasil ditambahkan ke database!`, "Berhasil");
      }

      setIsExamModalOpen(false);
    } catch (err: any) {
      console.error("Error saving exam schedule:", err);
      triggerAlert("error", `Gagal menyimpan jadwal: ${err?.message || "Terjadi kesalahan"}`, "Gagal");
    } finally {
      setIsExamSaving(false);
    }
  };

  const handleDeleteSchedule = (id: string, subject: string) => {
    setDeleteModalState({
      isOpen: true,
      type: "schedule",
      id,
      title: subject,
      scheduleCount: 0,
      loading: false,
    });
  };

  // Helper formatting date
  const formatIndonesianDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      });
    } catch (e) {
      return dateStr;
    }
  };

  const formatShortDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    } catch (e) {
      return dateStr;
    }
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

      {/* ========================================================================= */}
      {/* 1. TOP BREADCRUMB (INSIDE A SELECTED EXAM GROUP)                          */}
      {/* ========================================================================= */}
      {selectedGroupId && currentGroup ? (
        <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
          <button
            onClick={() => setSelectedGroupId(null)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:text-[#531FFF] hover:border-[#531FFF]/40 transition-all cursor-pointer shadow-xs active:scale-95 group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Kembali ke Daftar Kelompok Ujian</span>
          </button>

          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
            <span className="text-gray-400">Jadwal Ujian</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <span className="text-gray-400">Kelompok Ujian</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <span className="text-[#531FFF] bg-purple-50 px-2.5 py-0.5 rounded-md border border-purple-200">
              {currentGroup.name}
            </span>
          </div>
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* 2. MAIN HEADER BAR                                                        */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4 bg-white p-5 md:p-6 rounded-lg border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
              {currentGroup ? currentGroup.name : "Jadwal Ujian & Evaluasi"}
            </h1>
            
            {currentGroup ? (
              <>
                <span className={cn(
                  "px-3 py-0.5 rounded-full text-xs font-extrabold border uppercase",
                  currentGroup.examType === "PTS" && "bg-purple-50 text-[#531FFF] border-purple-200",
                  currentGroup.examType === "PAS" && "bg-blue-50 text-blue-700 border-blue-200",
                  currentGroup.examType === "PAT" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                  currentGroup.examType === "Praktik" && "bg-amber-50 text-amber-700 border-amber-200",
                  !["PTS", "PAS", "PAT", "Praktik"].includes(currentGroup.examType) && "bg-gray-100 text-gray-700 border-gray-200"
                )}>
                  {currentGroup.examType}
                </span>

                <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200 flex items-center gap-1.5">
                  <School className="w-3.5 h-3.5 text-gray-500" />
                  <span>Kelas: {currentGroup.targetClass}</span>
                </span>
              </>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#531FFF]/10 text-[#531FFF] border border-[#531FFF]/20">
                Sistem Kelompok Ujian
              </span>
            )}

            {isStudentRole && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F3F0FF] text-[#531FFF] border border-[#531FFF]/20 flex items-center gap-1">
                <School className="w-3.5 h-3.5" />
                <span>Kelas {studentClass || "10 MIPA 1"}</span>
              </span>
            )}
          </div>

          <p className="text-gray-500 text-xs md:text-sm font-medium mt-1.5">
            {currentGroup ? (
              currentGroup.description || `Daftar seluruh jadwal mata pelajaran pada kelompok ujian ${currentGroup.name}.`
            ) : (
              isStudentRole 
                ? `Pilih kelompok ujian resmi (PTS, PAS, UTS, UAS) yang terjadwal untuk kelas ${studentClass || "Anda"}.`
                : "Kelola kelompok ujian langsung terintegrasi dengan database Firestore Quick Schools."
            )}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Print PDF Button */}
          <button
            onClick={() => setIsPrintModalOpen(true)}
            disabled={currentGroup ? currentGroupSchedules.length === 0 : allSchedules.length === 0}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-lg text-xs font-bold shadow-xs transition-all active:scale-[0.98] cursor-pointer disabled:opacity-40"
          >
            <Printer className="w-4 h-4" />
            <span>{currentGroup ? "Cetak Kelompok Ini (PDF)" : "Cetak Jadwal (PDF)"}</span>
          </button>

          {/* Primary Action */}
          {!isStudentRole && (
            currentGroup ? (
              <button
                onClick={handleOpenAddSchedule}
                className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-[#531FFF] hover:bg-[#531FFF]/90 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md shadow-[#531FFF]/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Jadwal Mapel</span>
              </button>
            ) : (
              <button
                onClick={handleOpenAddGroup}
                className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-[#531FFF] hover:bg-[#531FFF]/90 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md shadow-[#531FFF]/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <FolderPlus className="w-4 h-4" />
                <span>Buat Kelompok Ujian Baru</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. METRICS BANNER (PURE DATABASE)                                         */}
      {/* ========================================================================= */}
      {!currentGroup ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-[#531FFF] flex items-center justify-center shrink-0">
              <CalendarRange className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase">Total Kelompok Ujian</span>
              <p className="text-lg font-extrabold text-gray-900 leading-none mt-1">{globalMetrics.totalGroups}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase">Total Jadwal Mapel</span>
              <p className="text-lg font-extrabold text-gray-900 leading-none mt-1">{globalMetrics.totalSchedules}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase">Ujian Aktif / Mendatang</span>
              <p className="text-lg font-extrabold text-gray-900 leading-none mt-1">{globalMetrics.activeGroups}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase">Ruang Ujian Digunakan</span>
              <p className="text-lg font-extrabold text-gray-900 leading-none mt-1">{globalMetrics.rooms}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-[#531FFF] flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase">Total Mata Pelajaran</span>
              <p className="text-lg font-extrabold text-gray-900 leading-none mt-1">{currentGroupMetrics.totalMapel}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase">Periode Pelaksanaan</span>
              <p className="text-xs font-bold text-gray-900 leading-snug mt-1">
                {formatShortDate(currentGroup.startDate)} - {formatShortDate(currentGroup.endDate)}
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase">Ruangan Terpakai</span>
              <p className="text-lg font-extrabold text-gray-900 leading-none mt-1">{currentGroupMetrics.rooms}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase">Pengawas Ujian</span>
              <p className="text-lg font-extrabold text-gray-900 leading-none mt-1">{currentGroupMetrics.proctors}</p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. CONTENT VIEW A: DAFTAR KELOMPOK UJIAN (MAIN PAGE)                      */}
      {/* ========================================================================= */}
      {!selectedGroupId ? (
        <>
          {/* FILTER & SEARCH BAR */}
          <div className="bg-white rounded-lg border border-gray-100 shadow-xs p-4 mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Exam Type Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500">Jenis:</span>
                <select
                  value={selectedGroupType}
                  onChange={(e) => setSelectedGroupType(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-gray-800 text-xs font-bold rounded-lg py-2 px-3 focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] cursor-pointer"
                >
                  <option value="All">Semua Jenis Ujian</option>
                  <option value="PTS">PTS (Tengah Semester)</option>
                  <option value="PAS">PAS (Akhir Semester)</option>
                  <option value="PAT">PAT (Akhir Tahun)</option>
                  <option value="UTS">UTS</option>
                  <option value="UAS">UAS</option>
                  <option value="Sumatif">Asesmen Sumatif</option>
                  <option value="Praktik">Ujian Praktik</option>
                  <option value="Try Out">Try Out</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              {/* Class Filter */}
              {!isStudentRole ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500">Kelas:</span>
                  <select
                    value={selectedGroupClass}
                    onChange={(e) => setSelectedGroupClass(e.target.value)}
                    className="bg-gray-50 border border-gray-200 text-gray-800 text-xs font-bold rounded-lg py-2 px-3 focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] cursor-pointer"
                  >
                    <option value="All">Semua Kelas</option>
                    {classes.map(c => {
                      const cName = c.name || c.className || c.id;
                      return (
                        <option key={c.id || cName} value={cName}>Kelas {cName}</option>
                      );
                    })}
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-[#F3F0FF] border border-[#531FFF]/20 rounded-lg text-xs font-extrabold text-[#531FFF]">
                  <School className="w-4 h-4" />
                  <span>Kelas: {studentClass || "10 MIPA 1"}</span>
                </div>
              )}

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500">Status:</span>
                <select
                  value={selectedGroupStatus}
                  onChange={(e) => setSelectedGroupStatus(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-gray-800 text-xs font-bold rounded-lg py-2 px-3 focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] cursor-pointer"
                >
                  <option value="All">Semua Status</option>
                  <option value="Akan Datang">Akan Datang</option>
                  <option value="Sedang Berlangsung">Sedang Berlangsung</option>
                  <option value="Selesai">Selesai</option>
                  <option value="Draft">Draft</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search Box */}
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari kelompok ujian..."
                  value={groupSearchQuery}
                  onChange={(e) => setGroupSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                />
              </div>

              {/* Grid / Table Toggle */}
              <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200 shrink-0">
                <button
                  onClick={() => setGroupViewMode("cards")}
                  className={cn(
                    "p-1.5 rounded-md text-xs font-bold transition-all cursor-pointer",
                    groupViewMode === "cards" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
                  )}
                  title="Tampilan Kartu"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setGroupViewMode("table")}
                  className={cn(
                    "p-1.5 rounded-md text-xs font-bold transition-all cursor-pointer",
                    groupViewMode === "table" ? "bg-white text-[#531FFF] shadow-xs" : "text-gray-500 hover:text-gray-900"
                  )}
                  title="Tampilan Tabel"
                >
                  <FileText className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* GROUPS LIST CONTENT */}
          {loading ? (
            <div className="bg-white rounded-lg border border-gray-100 p-12 flex flex-col items-center justify-center text-gray-500 flex-1 min-h-[400px]">
              <Loader2 className="w-8 h-8 animate-spin text-[#531FFF] mb-3" />
              <p className="text-sm font-medium">Memuat data kelompok ujian dari database...</p>
            </div>
          ) : (
            <>
              {groupViewMode === "cards" ? (
                /* CARD VIEW FOR EXAM GROUPS */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredGroups.map((group) => {
                    const schedules = groupSchedulesMap.get(group.id) || [];
                    const subjectCount = schedules.length;
                    const roomCount = new Set(schedules.map(s => s.room)).size;

                    return (
                      <div
                        key={group.id}
                        className="bg-white rounded-lg border border-gray-100 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between group relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-[#531FFF]/5 to-transparent rounded-bl-full pointer-events-none" />

                        <div>
                          {/* Badges */}
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span className={cn(
                              "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border",
                              group.examType === "PTS" && "bg-purple-50 text-[#531FFF] border-purple-200",
                              group.examType === "PAS" && "bg-blue-50 text-blue-700 border-blue-200",
                              group.examType === "PAT" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                              group.examType === "Praktik" && "bg-amber-50 text-amber-700 border-amber-200",
                              !["PTS", "PAS", "PAT", "Praktik"].includes(group.examType) && "bg-gray-100 text-gray-700 border-gray-200"
                            )}>
                              {group.examType}
                            </span>

                            <span className={cn(
                              "px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                              group.status === "Akan Datang" && "bg-blue-50 text-blue-600 border-blue-100",
                              group.status === "Sedang Berlangsung" && "bg-emerald-50 text-emerald-600 border-emerald-100 animate-pulse",
                              group.status === "Selesai" && "bg-gray-100 text-gray-600 border-gray-200",
                              group.status === "Draft" && "bg-amber-50 text-amber-600 border-amber-100"
                            )}>
                              {group.status}
                            </span>
                          </div>

                          {/* Group Name & Target Class */}
                          <h3 
                            onClick={() => setSelectedGroupId(group.id)}
                            className="font-extrabold text-lg text-gray-900 group-hover:text-[#531FFF] transition-colors leading-snug cursor-pointer flex items-center justify-between"
                          >
                            <span>{group.name}</span>
                          </h3>
                          
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-bold text-gray-600 flex items-center gap-1">
                              <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
                              <span>{group.targetClass}</span>
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="text-xs font-medium text-gray-500">{group.academicYear}</span>
                          </div>

                          {/* Info Rows */}
                          <div className="mt-4 pt-3 border-t border-gray-100 space-y-2 text-xs">
                            <div className="flex items-center gap-2 text-gray-700 font-semibold">
                              <CalendarIcon className="w-4 h-4 text-[#531FFF] shrink-0" />
                              <span>{formatShortDate(group.startDate)} s/d {formatShortDate(group.endDate)}</span>
                            </div>

                            <div className="flex items-center gap-2 text-gray-700 font-medium">
                              <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
                              <span><strong>{subjectCount}</strong> Mata Pelajaran Terjadwal</span>
                            </div>

                            <div className="flex items-center gap-2 text-gray-700 font-medium">
                              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span><strong>{roomCount}</strong> Ruangan Ujian</span>
                            </div>
                          </div>

                          {/* Description */}
                          {group.description && (
                            <p className="mt-3 text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                              {group.description}
                            </p>
                          )}
                        </div>

                        {/* Card Actions Footer */}
                        <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                          <button
                            onClick={() => setSelectedGroupId(group.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#531FFF] hover:bg-[#531FFF]/90 text-white rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                          >
                            <span>Buka Jadwal</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>

                          {!isStudentRole && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleEditGroup(group)}
                                className="p-1.5 text-gray-400 hover:text-[#531FFF] hover:bg-purple-50 rounded-md transition-colors"
                                title="Edit Info Kelompok"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteGroup(group.id, group.name)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                title="Hapus Kelompok Ujian"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })}

                  {filteredGroups.length === 0 && (
                    <div className="col-span-full bg-white rounded-lg border border-gray-100 p-12 text-center text-gray-400 flex flex-col items-center justify-center">
                      <div className="w-14 h-14 rounded-full bg-purple-50 text-[#531FFF] flex items-center justify-center mb-3">
                        <FolderPlus className="w-7 h-7" />
                      </div>
                      <h3 className="text-base font-bold text-gray-900">Belum Ada Kelompok Ujian di Database</h3>
                      <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                        {isStudentRole 
                          ? `Belum ada kelompok ujian yang terdaftar untuk kelas ${studentClass || "Anda"} di database.`
                          : "Seluruh data kelompok ujian tersinkronisasi langsung dari database Firestore. Buat kelompok ujian baru untuk mulai menjadwalkan."}
                      </p>
                      {!isStudentRole && (
                        <div className="mt-4 flex items-center gap-3 flex-wrap justify-center">
                          <button
                            onClick={handleOpenAddGroup}
                            className="inline-flex items-center gap-2 bg-[#531FFF] hover:bg-[#531FFF]/90 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                          >
                            <FolderPlus className="w-4 h-4" />
                            <span>Buat Kelompok Ujian Baru</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* TABLE VIEW FOR EXAM GROUPS */
                <div className="bg-white rounded-lg border border-gray-100 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
                          <th className="py-3.5 px-4 w-12 text-center">No</th>
                          <th className="py-3.5 px-4">Nama Kelompok Ujian</th>
                          <th className="py-3.5 px-4 text-center">Jenis</th>
                          <th className="py-3.5 px-4">Target Kelas</th>
                          <th className="py-3.5 px-4">Periode Pelaksanaan</th>
                          <th className="py-3.5 px-4 text-center">Jumlah Mapel</th>
                          <th className="py-3.5 px-4 text-center">Status</th>
                          <th className="py-3.5 px-4 text-center w-28">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium">
                        {filteredGroups.map((grp, idx) => {
                          const schedules = groupSchedulesMap.get(grp.id) || [];
                          return (
                            <tr key={grp.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="py-3 px-4 text-center text-gray-400">{idx + 1}</td>
                              <td className="py-3 px-4">
                                <div 
                                  onClick={() => setSelectedGroupId(grp.id)}
                                  className="font-bold text-gray-900 text-sm hover:text-[#531FFF] cursor-pointer"
                                >
                                  {grp.name}
                                </div>
                                <div className="text-[11px] text-gray-400 font-normal">{grp.academicYear}</div>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-50 text-[#531FFF] border border-purple-200">
                                  {grp.examType}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-bold text-gray-800">{grp.targetClass}</td>
                              <td className="py-3 px-4 text-gray-700">
                                {formatShortDate(grp.startDate)} - {formatShortDate(grp.endDate)}
                              </td>
                              <td className="py-3 px-4 text-center font-bold text-gray-800">
                                <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-800">
                                  {schedules.length} Mapel
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={cn(
                                  "px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                                  grp.status === "Akan Datang" && "bg-blue-50 text-blue-600 border-blue-100",
                                  grp.status === "Sedang Berlangsung" && "bg-emerald-50 text-emerald-600 border-emerald-100",
                                  grp.status === "Selesai" && "bg-gray-100 text-gray-600 border-gray-200",
                                  grp.status === "Draft" && "bg-amber-50 text-amber-600 border-amber-100"
                                )}>
                                  {grp.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => setSelectedGroupId(grp.id)}
                                    className="px-2.5 py-1 bg-[#531FFF] text-white rounded text-[11px] font-bold hover:bg-[#531FFF]/90 shadow-xs cursor-pointer"
                                  >
                                    Buka
                                  </button>
                                  {!isStudentRole && (
                                    <>
                                      <button
                                        onClick={() => handleEditGroup(grp)}
                                        className="p-1 text-gray-400 hover:text-[#531FFF] hover:bg-purple-50 rounded"
                                        title="Edit"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteGroup(grp.id, grp.name)}
                                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                        title="Hapus"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {filteredGroups.length === 0 && (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-gray-400 text-xs">
                              Belum ada kelompok ujian di database.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        /* ========================================================================= */
        /* 6. CONTENT VIEW B: DETAIL JADWAL DALAM KELOMPOK TERPILIH                  */
        /* ========================================================================= */
        <>
          {/* GROUP INFO BANNER & GENERAL INSTRUCTIONS */}
          <div className="bg-gradient-to-r from-purple-50/70 via-indigo-50/40 to-white rounded-lg border border-purple-100 p-4 md:p-5 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Petunjuk Umum Kelompok:</span>
                <span className="text-xs font-extrabold text-[#531FFF]">{currentGroup?.name}</span>
              </div>
              <p className="text-xs text-gray-700 font-medium leading-relaxed max-w-3xl">
                {currentGroup?.instructions || "Seluruh peserta wajib hadir 15 menit sebelum bel masuk dan membawa kartu peserta ujian resmi."}
              </p>
            </div>

            {!isStudentRole && currentGroup && (
              <button
                onClick={() => handleEditGroup(currentGroup)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:text-[#531FFF] hover:border-[#531FFF]/30 rounded-lg text-xs font-bold shadow-xs cursor-pointer shrink-0"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Ubah Info Kelompok</span>
              </button>
            )}
          </div>

          {/* FILTER & SEARCH FOR SCHEDULES INSIDE CURRENT GROUP */}
          <div className="bg-white rounded-lg border border-gray-100 shadow-xs p-4 mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Date Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500">Tanggal:</span>
                <select
                  value={scheduleDateFilter}
                  onChange={(e) => setScheduleDateFilter(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-gray-800 text-xs font-bold rounded-lg py-2 px-3 focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] cursor-pointer"
                >
                  <option value="All">Semua Tanggal ({currentGroupSchedules.length} Sesi)</option>
                  {currentGroupDates.map(d => (
                    <option key={d} value={d}>{formatIndonesianDate(d)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search Box */}
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari mapel, ruang, pengawas..."
                  value={scheduleSearchQuery}
                  onChange={(e) => setScheduleSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                />
              </div>

              {/* Grid / Table Toggle */}
              <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200 shrink-0">
                <button
                  onClick={() => setScheduleViewMode("cards")}
                  className={cn(
                    "p-1.5 rounded-md text-xs font-bold transition-all cursor-pointer",
                    scheduleViewMode === "cards" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
                  )}
                  title="Tampilan Kartu"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setScheduleViewMode("table")}
                  className={cn(
                    "p-1.5 rounded-md text-xs font-bold transition-all cursor-pointer",
                    scheduleViewMode === "table" ? "bg-white text-[#531FFF] shadow-xs" : "text-gray-500 hover:text-gray-900"
                  )}
                  title="Tampilan Tabel"
                >
                  <FileText className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* SCHEDULES LIST VIEW */}
          {scheduleViewMode === "cards" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentGroupSchedules.map((schedule) => {
                const formattedDate = formatIndonesianDate(schedule.date);

                return (
                  <div 
                    key={schedule.id}
                    className="bg-white rounded-lg border border-gray-100 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#531FFF]/5 to-transparent rounded-bl-full pointer-events-none" />

                    <div>
                      {/* Header Badge */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border",
                          schedule.examType === "PTS" && "bg-purple-50 text-[#531FFF] border-purple-200",
                          schedule.examType === "PAS" && "bg-blue-50 text-blue-700 border-blue-200",
                          schedule.examType === "Praktik" && "bg-amber-50 text-amber-700 border-amber-200",
                          schedule.examType === "PAT" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                          !["PTS", "PAS", "PAT", "Praktik"].includes(schedule.examType) && "bg-gray-100 text-gray-700 border-gray-200"
                        )}>
                          {schedule.examType || "Ujian"}
                        </span>
                        
                        <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded">
                          Kelas {schedule.classId}
                        </span>
                      </div>

                      {/* Subject */}
                      <h3 className="font-extrabold text-base text-gray-900 group-hover:text-[#531FFF] transition-colors leading-snug">
                        {schedule.subject}
                      </h3>
                      <p className="text-xs font-semibold text-gray-400 mt-0.5">{schedule.title}</p>

                      {/* Schedule details */}
                      <div className="mt-4 pt-3 border-t border-gray-100 space-y-2 text-xs">
                        <div className="flex items-center gap-2 text-gray-700 font-semibold">
                          <CalendarIcon className="w-4 h-4 text-[#531FFF] shrink-0" />
                          <span>{formattedDate}</span>
                        </div>

                        <div className="flex items-center gap-2 text-gray-700 font-semibold">
                          <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>{schedule.startTime} - {schedule.endTime} ({schedule.totalDuration || "90 Menit"})</span>
                        </div>

                        <div className="flex items-center gap-2 text-gray-700 font-semibold">
                          <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{schedule.room}</span>
                        </div>

                        <div className="flex items-center gap-2 text-gray-600 font-medium">
                          <User className="w-4 h-4 text-amber-600 shrink-0" />
                          <span className="truncate">Pengawas: <span className="font-bold text-gray-800">{schedule.proctor || "Panitia Ujian"}</span></span>
                        </div>
                      </div>

                      {/* Instructions snippet */}
                      {schedule.instructions && (
                        <div className="mt-3 p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-[11px] text-gray-600 italic">
                          "{schedule.instructions}"
                        </div>
                      )}
                    </div>

                    {/* Footer / Actions */}
                    <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-gray-400">
                        KKM: <span className="text-gray-800 font-extrabold">{schedule.passingScore || 75}</span>
                      </span>

                      {!isStudentRole && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditSchedule(schedule)}
                            className="p-1.5 text-gray-400 hover:text-[#531FFF] hover:bg-purple-50 rounded-md transition-colors"
                            title="Edit Jadwal Mapel"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSchedule(schedule.id, schedule.subject)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                            title="Hapus Jadwal Mapel"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}

              {currentGroupSchedules.length === 0 && (
                <div className="col-span-full bg-white rounded-lg border border-gray-100 p-12 text-center text-gray-400">
                  <CalendarRange className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-medium">Belum ada jadwal mata pelajaran pada kelompok ujian ini.</p>
                  {!isStudentRole && (
                    <button
                      onClick={handleOpenAddSchedule}
                      className="mt-4 inline-flex items-center gap-2 bg-[#531FFF] text-white px-4 py-2 rounded-lg text-xs font-bold shadow-xs hover:bg-[#531FFF]/90 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Jadwal Mapel Pertama</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* TABLE VIEW FOR SCHEDULES */
            <div className="bg-white rounded-lg border border-gray-100 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
                      <th className="py-3.5 px-4 w-12 text-center">No</th>
                      <th className="py-3.5 px-4">Mata Pelajaran</th>
                      <th className="py-3.5 px-4 text-center">Kelas</th>
                      <th className="py-3.5 px-4">Tanggal & Waktu</th>
                      <th className="py-3.5 px-4">Ruangan</th>
                      <th className="py-3.5 px-4">Pengawas Ujian</th>
                      <th className="py-3.5 px-4 text-center">KKM</th>
                      {!isStudentRole && <th className="py-3.5 px-4 text-center w-20">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {currentGroupSchedules.map((schedule, idx) => (
                      <tr key={schedule.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-4 text-center text-gray-400">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-gray-900 text-sm">{schedule.subject}</div>
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-50 text-[#531FFF] mt-0.5">
                            {schedule.examType || "PTS"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-gray-800">{schedule.classId}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-gray-800">{formatShortDate(schedule.date)}</div>
                          <div className="text-[11px] text-gray-500">{schedule.startTime} - {schedule.endTime} ({schedule.totalDuration || "90m"})</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 font-semibold text-gray-800">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            <span>{schedule.room}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 text-gray-700">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                            <span>{schedule.proctor}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full font-bold bg-gray-100 text-gray-700">
                            {schedule.passingScore || 75}
                          </span>
                        </td>
                        {!isStudentRole && (
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleEditSchedule(schedule)}
                                className="p-1.5 text-gray-400 hover:text-[#531FFF] hover:bg-purple-50 rounded-md transition-colors"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteSchedule(schedule.id, schedule.subject)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}

                    {currentGroupSchedules.length === 0 && (
                      <tr>
                        <td colSpan={isStudentRole ? 7 : 8} className="py-8 text-center text-gray-400 text-xs">
                          Belum ada jadwal mata pelajaran pada kelompok ujian ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL: BUAT / EDIT KELOMPOK UJIAN (CRUD CREATE / UPDATE)                */}
      {/* ========================================================================= */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200 w-full max-w-xl p-6 text-gray-900">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-[#531FFF]" />
                <h3 className="font-extrabold text-base">
                  {editingGroupId ? "Edit Kelompok Ujian" : "Buat Kelompok Ujian Baru"}
                </h3>
              </div>
              <button 
                onClick={() => setIsGroupModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitGroupForm} className="mt-4 space-y-4 text-xs">
              
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nama Kelompok Ujian</label>
                <input
                  type="text"
                  required
                  value={groupFormData.name}
                  onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                  placeholder="Contoh: UJIAN PTS XII IPA, PAS GANJIL X MIPA, dll."
                  className="w-full px-3 py-2 font-bold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Jenis Ujian</label>
                  <select
                    value={groupFormData.examType}
                    onChange={(e) => setGroupFormData({ ...groupFormData, examType: e.target.value })}
                    className="w-full px-3 py-2 font-bold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                  >
                    <option value="PTS">PTS (Tengah Semester)</option>
                    <option value="PAS">PAS (Akhir Semester)</option>
                    <option value="PAT">PAT (Akhir Tahun)</option>
                    <option value="UTS">UTS</option>
                    <option value="UAS">UAS</option>
                    <option value="Sumatif">Asesmen Sumatif</option>
                    <option value="Praktik">Ujian Praktik</option>
                    <option value="Try Out">Try Out</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Target Tingkat / Kelas</label>
                  <select
                    value={groupFormData.targetClass}
                    onChange={(e) => setGroupFormData({ ...groupFormData, targetClass: e.target.value })}
                    className="w-full px-3 py-2 font-bold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                  >
                    {classes.length > 0 ? (
                      classes.map(c => {
                        const cName = c.name || c.className || c.id;
                        return (
                          <option key={c.id || cName} value={cName}>Kelas {cName}</option>
                        );
                      })
                    ) : (
                      <>
                        <option value="10 MIPA 1">Kelas 10 MIPA 1</option>
                        <option value="11 IPS 1">Kelas 11 IPS 1</option>
                        <option value="12 MIPA 1">Kelas 12 MIPA 1</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Tahun Ajaran & Semester</label>
                  <input
                    type="text"
                    value={groupFormData.academicYear}
                    onChange={(e) => setGroupFormData({ ...groupFormData, academicYear: e.target.value })}
                    placeholder="Contoh: 2025/2026 - Ganjil"
                    className="w-full px-3 py-2 font-semibold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Status Kelompok</label>
                  <select
                    value={groupFormData.status}
                    onChange={(e: any) => setGroupFormData({ ...groupFormData, status: e.target.value })}
                    className="w-full px-3 py-2 font-bold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                  >
                    <option value="Akan Datang">Akan Datang</option>
                    <option value="Sedang Berlangsung">Sedang Berlangsung</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Tanggal Mulai Pelaksanaan</label>
                  <input
                    type="date"
                    required
                    value={groupFormData.startDate}
                    onChange={(e) => setGroupFormData({ ...groupFormData, startDate: e.target.value })}
                    className="w-full px-3 py-2 font-bold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Tanggal Selesai Pelaksanaan</label>
                  <input
                    type="date"
                    required
                    value={groupFormData.endDate}
                    onChange={(e) => setGroupFormData({ ...groupFormData, endDate: e.target.value })}
                    className="w-full px-3 py-2 font-bold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Deskripsi / Keterangan Singkat</label>
                <textarea
                  rows={2}
                  value={groupFormData.description}
                  onChange={(e) => setGroupFormData({ ...groupFormData, description: e.target.value })}
                  placeholder="Keterangan umum mengenai kelompok ujian ini..."
                  className="w-full p-3 font-medium bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Tata Tertib & Petunjuk Peserta Ujian</label>
                <textarea
                  rows={2}
                  value={groupFormData.instructions}
                  onChange={(e) => setGroupFormData({ ...groupFormData, instructions: e.target.value })}
                  placeholder="Instruksi dan tata tertib yang wajib ditaati peserta kelompok ujian ini..."
                  className="w-full p-3 font-medium bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="px-4 py-2 font-bold text-gray-500 hover:bg-gray-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isGroupSaving}
                  className="flex items-center gap-2 bg-[#531FFF] hover:bg-[#531FFF]/90 text-white px-5 py-2 rounded-lg font-bold shadow-md shadow-[#531FFF]/20 cursor-pointer"
                >
                  {isGroupSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{editingGroupId ? "Simpan Perubahan" : "Simpan ke Database"}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. MODAL: TAMBAH / EDIT JADWAL MAPEL DI DALAM KELOMPOK                    */}
      {/* ========================================================================= */}
      {isExamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200 w-full max-w-xl p-6 text-gray-900">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <CalendarRange className="w-5 h-5 text-[#531FFF]" />
                <h3 className="font-extrabold text-base">
                  {editingExamId ? "Edit Jadwal Mata Pelajaran" : "Tambah Jadwal Mata Pelajaran"}
                </h3>
              </div>
              <button 
                onClick={() => setIsExamModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Group Banner */}
            <div className="mt-3 p-2.5 rounded-lg bg-purple-50/70 border border-purple-200 flex items-center justify-between text-xs">
              <span className="font-bold text-gray-600">Kelompok Ujian:</span>
              <span className="font-extrabold text-[#531FFF]">{currentGroup?.name || "Kelompok Aktif"}</span>
            </div>

            {/* Conflict Alert Warning */}
            {conflictWarning && (
              <div className="mt-4">
                <AlertBox type="warning" title="Bentrokan Ruang / Jadwal" message={conflictWarning} />
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmitExamForm} className="mt-4 space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-3">
                {/* Mata Pelajaran */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Mata Pelajaran (Database Master)</label>
                  <select
                    required
                    value={examFormData.subject}
                    onChange={(e) => setExamFormData({ ...examFormData, subject: e.target.value })}
                    className="w-full px-3 py-2 font-bold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                  >
                    <option value="" disabled>-- Pilih Mata Pelajaran --</option>
                    {subjects.length > 0 ? (
                      subjects.map((s) => {
                        const sName = s.name || s.subjectName || s.id;
                        return (
                          <option key={s.id || sName} value={sName}>
                            {sName} {s.code ? `(${s.code})` : ""}
                          </option>
                        );
                      })
                    ) : (
                      <>
                        <option value="Matematika Utama">Matematika Utama</option>
                        <option value="Bahasa Indonesia">Bahasa Indonesia</option>
                        <option value="Bahasa Inggris">Bahasa Inggris</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Target Class */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Kelas Spesifik</label>
                  <select
                    required
                    value={examFormData.classId}
                    onChange={(e) => setExamFormData({ ...examFormData, classId: e.target.value })}
                    className="w-full px-3 py-2 font-bold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                  >
                    {classes.length > 0 ? (
                      classes.map(c => {
                        const cName = c.name || c.className || c.id;
                        return (
                          <option key={c.id || cName} value={cName}>Kelas {cName}</option>
                        );
                      })
                    ) : (
                      <>
                        <option value="10 MIPA 1">Kelas 10 MIPA 1</option>
                        <option value="11 IPS 1">Kelas 11 IPS 1</option>
                        <option value="12 MIPA 1">Kelas 12 MIPA 1</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Preset Jam / Template Waktu */}
              <div className="bg-purple-50/50 border border-purple-200/80 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#531FFF]" />
                    Preset Jam / Template Waktu
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowTimePresetModal(true)}
                    className="text-[11px] font-semibold text-[#531FFF] hover:text-[#4216d6] hover:underline flex items-center gap-1 transition-colors"
                  >
                    <Settings className="w-3 h-3" />
                    Kelola Template Jam
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {timePresets.map((preset) => {
                    const isSelected =
                      examFormData.startTime === preset.startTime &&
                      examFormData.endTime === preset.endTime;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setExamFormData({
                            ...examFormData,
                            startTime: preset.startTime,
                            endTime: preset.endTime,
                          });
                        }}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer",
                          isSelected
                            ? "bg-[#531FFF] text-white border-[#531FFF] shadow-xs ring-2 ring-[#531FFF]/20"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                        )}
                      >
                        <span className="font-mono">{preset.startTime}–{preset.endTime}</span>
                        <span
                          className={cn(
                            "text-[10px]",
                            isSelected ? "text-purple-200" : "text-gray-400"
                          )}
                        >
                          ({preset.name})
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-gray-500">
                  Pilih salah satu preset di atas untuk mengisi jam secara otomatis, atau atur jam secara manual di bawah.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Tanggal Ujian</label>
                  <input
                    type="date"
                    required
                    value={examFormData.date}
                    onChange={(e) => setExamFormData({ ...examFormData, date: e.target.value })}
                    className="w-full px-3 py-2 font-bold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    required
                    value={examFormData.startTime}
                    onChange={(e) => setExamFormData({ ...examFormData, startTime: e.target.value })}
                    className="w-full px-3 py-2 font-bold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20 text-center"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Jam Selesai</label>
                  <input
                    type="time"
                    required
                    value={examFormData.endTime}
                    onChange={(e) => setExamFormData({ ...examFormData, endTime: e.target.value })}
                    className="w-full px-3 py-2 font-bold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20 text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Ruang Ujian</label>
                  <input
                    type="text"
                    required
                    value={examFormData.room}
                    onChange={(e) => setExamFormData({ ...examFormData, room: e.target.value })}
                    placeholder="Contoh: Ruang R.101, Lab Fisika..."
                    className="w-full px-3 py-2 font-semibold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Batas KKM Lulus</label>
                  <input
                    type="number"
                    value={examFormData.passingScore}
                    onChange={(e) => setExamFormData({ ...examFormData, passingScore: Number(e.target.value) })}
                    className="w-full px-3 py-2 font-bold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20 text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Pengawas Guru */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Pengawas Ujian (Guru Database)</label>
                  <select
                    required
                    value={examFormData.proctor}
                    onChange={(e) => setExamFormData({ ...examFormData, proctor: e.target.value })}
                    className="w-full px-3 py-2 font-semibold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                  >
                    <option value="" disabled>-- Pilih Pengawas / Guru --</option>
                    {teachers.length > 0 ? (
                      teachers.map((t) => {
                        const tName = t.name || t.fullName || t.teacherName || t.id;
                        return (
                          <option key={t.id || tName} value={tName}>
                            {tName} {t.subject ? `(${t.subject})` : ""}
                          </option>
                        );
                      })
                    ) : (
                      <>
                        <option value="Panitia Ujian">Panitia Ujian (Default)</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Status Sesi</label>
                  <select
                    value={examFormData.status}
                    onChange={(e: any) => setExamFormData({ ...examFormData, status: e.target.value })}
                    className="w-full px-3 py-2 font-bold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                  >
                    <option value="Akan Datang">Akan Datang</option>
                    <option value="Sedang Berlangsung">Sedang Berlangsung</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Petunjuk Khusus Mata Pelajaran</label>
                <textarea
                  rows={2}
                  value={examFormData.instructions}
                  onChange={(e) => setExamFormData({ ...examFormData, instructions: e.target.value })}
                  placeholder="Contoh: Kalkulator diperbolehkan, wajib membawa pensil 2B..."
                  className="w-full p-3 font-medium bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExamModalOpen(false)}
                  className="px-4 py-2 font-bold text-gray-500 hover:bg-gray-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isExamSaving}
                  className="flex items-center gap-2 bg-[#531FFF] hover:bg-[#531FFF]/90 text-white px-5 py-2 rounded-lg font-bold shadow-md shadow-[#531FFF]/20 cursor-pointer"
                >
                  {isExamSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{editingExamId ? "Simpan Perubahan" : "Tambahkan ke Database"}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. PRINT-READY OFFICIAL EXAM SCHEDULE SHEET MODAL                         */}
      {/* ========================================================================= */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar p-8 text-gray-900 font-sans print-area">
            
            {/* Controls */}
            <div className="flex justify-between items-center pb-6 border-b border-gray-200 no-print">
              <div className="flex items-center gap-2">
                <School className="w-5 h-5 text-[#531FFF]" />
                <h3 className="font-extrabold text-base">
                  Pratinjau Cetak Jadwal Ujian Resmi {currentGroup ? `- ${currentGroup.name}` : ""}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 bg-[#531FFF] hover:bg-[#531FFF]/90 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Cetak / Download PDF
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* Document Content */}
            <div className="pt-6 space-y-6">
              
              {/* KOP */}
              <div className="text-center border-b-2 border-gray-900 pb-4">
                <h2 className="text-2xl font-extrabold tracking-widest text-gray-900 uppercase">PANITIA UJIAN & EVALUASI AKADEMIK</h2>
                <h3 className="text-lg font-bold text-gray-800">SMA QUICK SCHOOLS INDONESIA</h3>
                <p className="text-xs font-medium text-gray-600 mt-1">
                  Jl. Pendidikan Utama No. 45, Jakarta Selatan · Telp: (021) 7890123 · Website: www.quickschools.sch.id
                </p>
                <p className="text-xs font-extrabold text-gray-900 uppercase mt-2 tracking-wider">
                  {currentGroup 
                    ? `JADWAL ${currentGroup.name} · TAHUN AJARAN ${currentGroup.academicYear}`
                    : "JADWAL KELOMPOK UJIAN PENILAIAN AKADEMIK · TAHUN AJARAN 2025/2026"}
                </p>
              </div>

              {/* Rules & Meta Info */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-300 text-xs leading-relaxed space-y-1">
                <h4 className="font-bold text-gray-800 uppercase">TATA TERTIB PESERTA UJIAN:</h4>
                <ol className="list-decimal pl-4 space-y-0.5 text-gray-700">
                  <li>Peserta ujian wajib hadir 15 menit sebelum bel tanda ujian dibunyikan.</li>
                  <li>Wajib membawa Kartu Peserta Ujian dan perlengkapan alat tulis pribadi.</li>
                  <li>Dilarang membawa alat komunikasi (HP, Smartwatch) ke dalam ruang ujian.</li>
                  <li>Menempati nomor meja dan ruang ujian sesuai kartu tanda peserta.</li>
                </ol>
              </div>

              {/* Table */}
              <div>
                <table className="w-full border-collapse border border-gray-300 text-xs text-left">
                  <thead>
                    <tr className="bg-gray-100 font-bold text-gray-800">
                      <th className="border border-gray-300 p-2 text-center w-8">No</th>
                      <th className="border border-gray-300 p-2">Mata Pelajaran & Ujian</th>
                      <th className="border border-gray-300 p-2 text-center w-16">Kelas</th>
                      <th className="border border-gray-300 p-2">Tanggal & Waktu</th>
                      <th className="border border-gray-300 p-2">Ruangan</th>
                      <th className="border border-gray-300 p-2">Pengawas Ujian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(currentGroup ? currentGroupSchedules : allSchedules).map((ex, i) => (
                      <tr key={i} className="border-b border-gray-200">
                        <td className="border border-gray-300 p-2 text-center font-medium">{i + 1}</td>
                        <td className="border border-gray-300 p-2 font-bold text-gray-900">
                          {ex.subject} ({ex.examType})
                        </td>
                        <td className="border border-gray-300 p-2 text-center font-bold">{ex.classId}</td>
                        <td className="border border-gray-300 p-2">{ex.date} ({ex.startTime} - {ex.endTime})</td>
                        <td className="border border-gray-300 p-2 font-bold text-emerald-800">{ex.room}</td>
                        <td className="border border-gray-300 p-2">{ex.proctor || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 text-center text-xs pt-12 border-t border-gray-300">
                <div>
                  <p>Ketua Panitia Ujian</p>
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

      {/* ========================================================================= */}
      {/* 9. DELETE CONFIRMATION MODAL                                             */}
      {/* ========================================================================= */}
      {deleteModalState.isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col">
            {/* Modal Body */}
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100 shadow-xs">
                <Trash2 className="w-7 h-7" />
              </div>

              <h3 className="text-base font-bold text-gray-900 mb-2">
                {deleteModalState.type === "group"
                  ? "Hapus Kelompok Ujian?"
                  : "Hapus Jadwal Mata Pelajaran?"}
              </h3>

              <div className="text-xs text-gray-600 space-y-3 leading-relaxed">
                <p>
                  {deleteModalState.type === "group" ? (
                    <>
                      Apakah Anda yakin ingin menghapus kelompok ujian{" "}
                      <strong className="text-gray-900 font-bold">"{deleteModalState.title}"</strong> dari database
                      beserta seluruh jadwal di dalamnya?
                    </>
                  ) : (
                    <>
                      Apakah Anda yakin ingin menghapus jadwal ujian mata pelajaran{" "}
                      <strong className="text-gray-900 font-bold">"{deleteModalState.title}"</strong> dari database?
                    </>
                  )}
                </p>

                {deleteModalState.type === "group" && (deleteModalState.scheduleCount || 0) > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5 text-left">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold">Perhatian:</strong> Terdapat{" "}
                      <span className="font-extrabold underline">
                        {deleteModalState.scheduleCount} jadwal mata pelajaran
                      </span>{" "}
                      di dalam kelompok ini yang akan ikut terhapus secara permanen.
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-gray-400">
                  Tindakan ini permanen dan tidak dapat dibatalkan. Data akan dihapus dari server database sekolah.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button
                type="button"
                disabled={deleteModalState.loading}
                onClick={() => setDeleteModalState((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleteModalState.loading}
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-md shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {deleteModalState.loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>
                  {deleteModalState.loading
                    ? "Menghapus..."
                    : deleteModalState.type === "group"
                    ? "Ya, Hapus Kelompok Ujian"
                    : "Ya, Hapus Jadwal"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time Preset Manager Modal */}
      <TimePresetManagerModal
        isOpen={showTimePresetModal}
        onClose={() => setShowTimePresetModal(false)}
        onSelectPreset={(p) => {
          setExamFormData((prev) => ({
            ...prev,
            startTime: p.startTime,
            endTime: p.endTime,
          }));
        }}
      />

      {/* Print CSS */}
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
