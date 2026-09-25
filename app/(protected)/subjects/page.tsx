"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  BookOpen, 
  Plus, 
  Search, 
  PenTool, 
  Trash2, 
  Loader2, 
  Eye, 
  Sparkles, 
  Clock, 
  Target, 
  UserCheck, 
  Layers, 
  LayoutGrid, 
  Table as TableIcon, 
  Check, 
  X, 
  ChevronRight,
  GraduationCap,
  AlertCircle,
  BadgeCheck,
  FolderKanban
} from "lucide-react";
import { SubjectModal } from "@/components/subjects/subject-modal";
import { DeleteSubjectModal } from "@/components/subjects/delete-subject-modal";
import { 
  saveSubjectWithCascade, 
  deleteSubjectWithCascade, 
  type SubjectInputData 
} from "@/lib/subject-sync-service";
import { db, auth } from "@/lib/firebase";
import { collection, query, onSnapshot, doc, writeBatch, orderBy } from "firebase/firestore";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { PageContentSkeleton } from "@/components/ui/role-loading-skeleton";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { 
  getTeachersForSubject 
} from "@/lib/subject-teacher-relations";
import { useSchoolProfile } from "@/context/SchoolProfileContext";
import { getSubjectPresetsForStage, SubjectPresetDef } from "@/lib/school-level-config";
import { useUnifiedStudents } from "@/hooks/use-unified-students";
import { useUnifiedTeachers } from "@/hooks/use-unified-teachers";
import { 
  SubjectGroup, 
  getPresetSubjectGroups, 
  fetchSubjectGroupsFromDb, 
  saveSubjectGroupToDb, 
  deleteSubjectGroupFromDb, 
  batchSaveSubjectGroups,
  syncSmaCurriculumStructureToDb
} from "@/lib/subject-groups";
import { SubjectGroupModal } from "@/components/subjects/subject-group-modal";
import { AssignGroupSubjectsModal } from "@/components/subjects/assign-group-subjects-modal";

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const { teachers: unifiedTeachers } = useUnifiedTeachers();
  const { students: unifiedStudents } = useUnifiedStudents();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedBatchPresets, setSelectedBatchPresets] = useState<string[]>([]);
  const [isBatchAdding, setIsBatchAdding] = useState(false);
  const toast = useToast();
  const { currentStage, stageConfig, gradeLevels, majorOptions } = useSchoolProfile();
  const activePresets = useMemo(() => getSubjectPresetsForStage(currentStage), [currentStage]);

  // Tab state: "subjects" | "groups"
  const [activeTab, setActiveTab] = useState<"subjects" | "groups">("subjects");

  // Subject Groups state
  const [subjectGroups, setSubjectGroups] = useState<SubjectGroup[]>([]);
  const [selectedMajorFilter, setSelectedMajorFilter] = useState("All");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState("All");
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [groupMajorFilter, setGroupMajorFilter] = useState("All");

  // Subject Group Modal State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<SubjectGroup | null>(null);

  // Assign Subjects to Group Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignTargetGroup, setAssignTargetGroup] = useState<SubjectGroup | null>(null);

  // Centralized useAuth
  const { role: authRole, rawRole: authRawRole, userData, isAuthLoading, isRoleReady, isKepalaSekolah, rolePermissions } = useAuth();
  const rawRole = (authRawRole || authRole || "").toLowerCase();
  const currentUserRole = (rawRole === "student" || rawRole === "siswa") ? "siswa" : (rawRole === "teacher" || rawRole === "guru") ? "guru" : rawRole;
  const currentUserData = userData;
  const currentStudentClass = userData?.classId || userData?.className || userData?.class || "";
  const [classes, setClasses] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // Student filter states
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [studentCategoryFilter, setStudentCategoryFilter] = useState("All");
  const [studentViewMode, setStudentViewMode] = useState<"grid" | "table">("grid");

  const isGuru = currentUserRole === "guru" || currentUserRole === "teacher";
  const canMutateAcademic = ((!isGuru && !isKepalaSekolah) || Boolean(rolePermissions?.academic?.write)) && !((isGuru || isKepalaSekolah) && !rolePermissions?.academic?.write);
  const isReadOnly = !canMutateAcademic;

  const [subjectModalState, setSubjectModalState] = useState<{
    isOpen: boolean;
    mode: "create" | "edit" | "view";
    subject: any | null;
  }>({
    isOpen: false,
    mode: "create",
    subject: null
  });

  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    subject: any | null;
  }>({
    isOpen: false,
    subject: null
  });

  // Real-time subjects, teachers, classes, schedules, students & subject_groups listener
  useEffect(() => {
    // 1. Subjects
    const qSubjects = query(collection(db, "subjects"));
    const unsubSubjects = onSnapshot(qSubjects, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        _firestoreId: doc.id,
        ...doc.data()
      }));
      setSubjects(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching subjects:", error);
      setLoading(false);
    });

    // 2. Classes
    const qClasses = query(collection(db, "classes"));
    const unsubClasses = onSnapshot(qClasses, (snapshot) => {
      setClasses(snapshot.docs.map(doc => ({ _firestoreId: doc.id, ...doc.data() })));
    });

    // 3. Schedules
    const qSchedules = query(collection(db, "schedules"));
    const unsubSchedules = onSnapshot(qSchedules, (snapshot) => {
      setSchedules(snapshot.docs.map(doc => ({ _firestoreId: doc.id, ...doc.data() })));
    });

    // 4. Subject Groups listener
    const qGroups = query(collection(db, "subject_groups"), orderBy("order", "asc"));
    const unsubGroups = onSnapshot(qGroups, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as SubjectGroup[];
        setSubjectGroups(data);
      } else {
        // Fallback or initialize presets
        fetchSubjectGroupsFromDb(currentStage, majorOptions).then((data) => {
          if (data && data.length > 0) {
            setSubjectGroups(data);
          }
        });
      }
    }, async (err) => {
      console.warn("Firestore subject_groups listener fallback:", err);
      const fallback = await fetchSubjectGroupsFromDb(currentStage, majorOptions);
      setSubjectGroups(fallback);
    });
    
    return () => {
      unsubSubjects();
      unsubClasses();
      unsubSchedules();
      unsubGroups();
    };
  }, [currentStage, majorOptions]);

  useEffect(() => {
    setTeachers(unifiedTeachers);
  }, [unifiedTeachers]);

  useEffect(() => {
    setStudents(unifiedStudents);
  }, [unifiedStudents]);

  // Helper to Open Subject Modal or Delete Modal with Full Teacher & Group Relation Resolution
  const openSubjectCrud = (mode: "create" | "edit" | "delete" | "view", item?: any) => {
    if (mode === "delete") {
      if (isReadOnly) {
        toast.showError("Akses ditolak. Anda tidak memiliki hak akses menghapus mata pelajaran.", "Akses Ditolak");
        return;
      }
      setDeleteModalState({
        isOpen: true,
        subject: item || null,
      });
      return;
    }

    if (mode === "create" && isReadOnly) {
      toast.showError("Akses ditolak. Anda tidak memiliki izin menambah mata pelajaran.", "Akses Ditolak");
      return;
    }

    if (mode === "edit" && isReadOnly) {
      mode = "view";
    }

    if (!item) {
      setSubjectModalState({
        isOpen: true,
        mode,
        subject: {
          code: "",
          name: "",
          category: "Wajib",
          groupId: "",
          major: "Semua Jurusan / Umum",
          creditHours: "3 JP",
          level: "Semua Tingkat",
          kkm: stageConfig.defaultKkm || 75,
          status: "Aktif",
          teacherIds: [],
          teachers: [],
          teacher: "-",
          description: ""
        }
      });
      return;
    }

    let resolvedTeacherIds: string[] = [];
    if (Array.isArray(item.teacherIds) && item.teacherIds.length > 0) {
      resolvedTeacherIds = item.teacherIds;
    } else {
      const matched = getTeachersForSubject(item, teachers);
      resolvedTeacherIds = matched.map(t => t.id || t._firestoreId || t.nip).filter((id): id is string => Boolean(id));
    }

    setSubjectModalState({
      isOpen: true,
      mode,
      subject: {
        ...item,
        groupId: item.groupId || "",
        major: item.major || "Semua Jurusan / Umum",
        teacherIds: resolvedTeacherIds
      }
    });
  };

  // CRUD Submission Handler with Cascade to Database, Groups, Schedules & Grades
  const handleSaveSubject = async (formData: SubjectInputData, previousSubject?: any) => {
    if (isReadOnly) {
      toast.showError("Akses ditolak. Anda hanya memiliki hak akses lihat data.", "Akses Ditolak");
      return;
    }

    try {
      const isEdit = subjectModalState.mode === "edit";
      const subjectDocId = previousSubject?._firestoreId || previousSubject?.id;

      const result = await saveSubjectWithCascade({
        db,
        mode: isEdit ? "edit" : "create",
        subjectId: subjectDocId,
        data: formData,
        previousSubject,
        allTeachers: teachers,
        allSubjectGroups: subjectGroups,
      });

      let successMsg = isEdit
        ? `Mata pelajaran "${formData.name}" berhasil diperbarui!`
        : `Mata pelajaran "${formData.name}" berhasil ditambahkan!`;

      if (result.schedulesUpdated > 0 || result.gradesUpdated > 0) {
        successMsg += ` (${result.schedulesUpdated} jadwal & ${result.gradesUpdated} penilaian disinkronkan)`;
      }

      toast.showSuccess(successMsg, "Tersimpan");
      setSubjectModalState(s => ({ ...s, isOpen: false }));
    } catch (error: any) {
      console.error("Error saving subject data:", error);
      toast.showError("Gagal menyimpan mata pelajaran: " + (error?.message || "Terjadi kesalahan"), "Gagal");
      throw error;
    }
  };

  const handleConfirmDeleteSubject = async (subjectToDelete: any) => {
    if (isReadOnly) {
      toast.showError("Akses ditolak. Anda tidak memiliki hak akses menghapus mata pelajaran.", "Akses Ditolak");
      return;
    }

    try {
      const subjectDocId = subjectToDelete?._firestoreId || subjectToDelete?.id;
      if (!subjectDocId) {
        throw new Error("ID dokumen mata pelajaran tidak ditemukan.");
      }

      const res = await deleteSubjectWithCascade({
        db,
        subjectId: subjectDocId,
        subject: subjectToDelete,
        allTeachers: teachers,
        allSubjectGroups: subjectGroups,
      });

      let msg = `Mata pelajaran "${subjectToDelete.name || subjectToDelete.code}" berhasil dihapus dari database.`;
      if (res.groupsCleaned > 0 || res.schedulesCleaned > 0) {
        msg += ` (${res.groupsCleaned} kelompok & ${res.schedulesCleaned} jadwal diselaraskan)`;
      }

      toast.showSuccess(msg, "Berhasil Dihapus");
      setDeleteModalState({ isOpen: false, subject: null });
    } catch (error: any) {
      console.error("Error deleting subject:", error);
      toast.showError("Gagal menghapus mata pelajaran: " + (error?.message || "Terjadi kesalahan"), "Gagal");
      throw error;
    }
  };

  // Group Handlers
  const handleSaveGroup = async (group: SubjectGroup) => {
    try {
      await saveSubjectGroupToDb(group);
      toast.showSuccess(`Kelompok mata pelajaran "${group.name}" berhasil disimpan!`, "Berhasil");
      setIsGroupModalOpen(false);
      setEditingGroup(null);
    } catch (err: any) {
      console.error("Error saving subject group:", err);
      toast.showError("Gagal menyimpan kelompok mata pelajaran: " + (err.message || ""), "Gagal");
    }
  };

  const handleDeleteGroup = async (group: SubjectGroup) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus kelompok "${group.name}"? Mata pelajaran di dalamnya tidak akan terhapus, hanya dilepas dari kelompok ini.`)) {
      return;
    }
    try {
      await deleteSubjectGroupFromDb(group.id);
      // Lepas groupId dan groupName dari mapel yang ada di kelompok ini
      const batch = writeBatch(db);
      const affectedSubjects = subjects.filter(s => s.groupId === group.id || group.subjectIds?.includes(s.id || s._firestoreId || s.code));
      affectedSubjects.forEach(sub => {
        const docId = sub._firestoreId || sub.id;
        if (docId) {
          batch.update(doc(db, "subjects", docId), {
            groupId: "",
            groupName: "",
            updatedAt: new Date().toISOString()
          });
        }
      });
      await batch.commit();
      toast.showSuccess(`Kelompok "${group.name}" berhasil dihapus.`, "Berhasil Dihapus");
    } catch (err: any) {
      console.error("Error deleting subject group:", err);
      toast.showError("Gagal menghapus kelompok mata pelajaran.", "Gagal");
    }
  };

  const handleSaveAssignSubjects = async (groupId: string, updatedSubjectIds: string[]) => {
    try {
      const group = subjectGroups.find(g => g.id === groupId);
      if (!group) return;

      const updatedGroup: SubjectGroup = {
        ...group,
        subjectIds: updatedSubjectIds,
        updatedAt: new Date().toISOString()
      };
      await saveSubjectGroupToDb(updatedGroup);

      // Sinkronkan ke dokumen subjects juga
      const batch = writeBatch(db);
      subjects.forEach(sub => {
        const subId = sub.id || sub._firestoreId || sub.code;
        const isMember = updatedSubjectIds.includes(subId) || updatedSubjectIds.includes(sub.code);
        const currentGroupIsThis = sub.groupId === groupId;

        if (isMember && !currentGroupIsThis) {
          const docId = sub._firestoreId || sub.id;
          if (docId) {
            batch.update(doc(db, "subjects", docId), {
              groupId: group.id,
              groupName: group.name,
              major: group.major !== "Semua Jurusan / Umum" ? group.major : (sub.major || "Semua Jurusan / Umum"),
              updatedAt: new Date().toISOString()
            });
          }
        } else if (!isMember && currentGroupIsThis) {
          const docId = sub._firestoreId || sub.id;
          if (docId) {
            batch.update(doc(db, "subjects", docId), {
              groupId: "",
              groupName: "",
              updatedAt: new Date().toISOString()
            });
          }
        }
      });
      await batch.commit();

      toast.showSuccess("Anggota mata pelajaran kelompok berhasil diperbarui!", "Sinkronisasi Berhasil");
      setIsAssignModalOpen(false);
      setAssignTargetGroup(null);
    } catch (err: any) {
      console.error("Error assigning subjects to group:", err);
      toast.showError("Gagal menugaskan mata pelajaran ke kelompok.", "Gagal");
    }
  };

  const [isSyncingSmaCurriculum, setIsSyncingSmaCurriculum] = useState(false);

  const handleSyncSmaStructure = async () => {
    setIsSyncingSmaCurriculum(true);
    try {
      const res = await syncSmaCurriculumStructureToDb();
      toast.showSuccess(
        `Berhasil menyusun & menyelaraskan Kurikulum SMA: ${res.groupsCount} Kelompok Mata Pelajaran (Umum, MIPA, IPS, Bahasa) & ${res.subjectsCount} Mata Pelajaran telah terhubung dengan Jurusan masing-masing!`,
        "Kurikulum SMA Selaras"
      );
    } catch (err: any) {
      console.error("Error syncing SMA curriculum structure:", err);
      toast.showError("Gagal menyelaraskan struktur kurikulum SMA.", "Gagal");
    } finally {
      setIsSyncingSmaCurriculum(false);
    }
  };

  const handleLoadPresetGroups = async () => {
    try {
      const presets = getPresetSubjectGroups(currentStage, majorOptions);
      await batchSaveSubjectGroups(presets);
      toast.showSuccess(`Berhasil memuat ${presets.length} kelompok mata pelajaran standar kurikulum (${currentStage})!`, "Preset Dimuat");
    } catch (err: any) {
      console.error("Error loading preset groups:", err);
      toast.showError("Gagal memuat preset kelompok mata pelajaran.", "Gagal");
    }
  };

  // Quick Apply Preset to New Form
  const handleApplyPreset = (preset: SubjectPresetDef) => {
    if (isReadOnly) return;
    setSubjectModalState({
      isOpen: true,
      mode: "create",
      subject: {
        code: preset.code,
        name: preset.name,
        category: (preset.category === "Kejuruan / Produktif" ? "Peminatan" : preset.category) as "Wajib" | "Peminatan" | "Muatan Lokal",
        creditHours: preset.creditHours,
        level: preset.level,
        kkm: preset.kkm,
        description: preset.description,
        groupId: "",
        major: "Semua Jurusan / Umum",
        teacherIds: [],
        teachers: [],
        teacher: "-",
        status: "Aktif"
      }
    });
  };

  // Batch Add Standard Curriculum Package
  const handleBatchAddPresets = async () => {
    if (isReadOnly) {
      toast.showError("Akses ditolak. Anda hanya memiliki hak akses lihat data.", "Akses Ditolak");
      return;
    }

    if (selectedBatchPresets.length === 0) {
      toast.showError("Pilih minimal 1 mata pelajaran untuk ditambahkan.", "Peringatan");
      return;
    }

    try {
      setIsBatchAdding(true);
      const batch = writeBatch(db);
      let count = 0;

      selectedBatchPresets.forEach(code => {
        const preset = activePresets.find(p => p.code === code);
        if (preset) {
          const docRef = doc(collection(db, "subjects"));
          batch.set(docRef, {
            code: preset.code,
            name: preset.name,
            category: preset.category,
            creditHours: preset.creditHours,
            level: preset.level,
            kkm: preset.kkm,
            description: preset.description,
            teacher: "-",
            status: "Aktif",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          count++;
        }
      });

      await batch.commit();
      setShowBatchModal(false);
      setSelectedBatchPresets([]);
      toast.showSuccess(`Berhasil menambahkan ${count} mata pelajaran standar nasional!`, "Paket Berhasil Ditambahkan");
    } catch (err: any) {
      console.error("Batch add error:", err);
      toast.showError("Gagal menambahkan paket mata pelajaran.", "Gagal");
    } finally {
      setIsBatchAdding(false);
    }
  };

  // Filtered & Searched Subjects List
  const filteredSubjects = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return subjects.filter((item) => {
      const assignedTeachers = getTeachersForSubject(item, teachers);
      const teacherNames = assignedTeachers.map(t => t.name).join(" ").toLowerCase();

      const matchSearch = 
        !q ||
        (item.name || "").toLowerCase().includes(q) ||
        (item.code || "").toLowerCase().includes(q) ||
        (item.teacher || "").toLowerCase().includes(q) ||
        (item.groupName || "").toLowerCase().includes(q) ||
        (item.major || "").toLowerCase().includes(q) ||
        teacherNames.includes(q);

      const matchCategory = 
        selectedCategory === "All" || item.category === selectedCategory;

      const matchStatus = 
        selectedStatus === "All" || (item.status || "Aktif") === selectedStatus;

      const matchMajor = 
        selectedMajorFilter === "All" || 
        item.major === selectedMajorFilter || 
        (selectedMajorFilter === "Umum" && (!item.major || item.major === "Semua Jurusan / Umum"));

      const matchGroup = 
        selectedGroupFilter === "All" || 
        item.groupId === selectedGroupFilter ||
        (item.groupName && subjectGroups.find(g => g.id === selectedGroupFilter)?.name === item.groupName);

      return matchSearch && matchCategory && matchStatus && matchMajor && matchGroup;
    });
  }, [subjects, searchQuery, selectedCategory, selectedStatus, selectedMajorFilter, selectedGroupFilter, teachers, subjectGroups]);

  // Filtered Groups for "groups" Tab
  const filteredGroups = useMemo(() => {
    const q = groupSearchQuery.toLowerCase().trim();
    return subjectGroups.filter((g) => {
      const matchSearch = 
        !q ||
        (g.name || "").toLowerCase().includes(q) ||
        (g.code || "").toLowerCase().includes(q) ||
        (g.major || "").toLowerCase().includes(q) ||
        (g.description || "").toLowerCase().includes(q);

      const matchMajor = 
        groupMajorFilter === "All" || 
        g.major === groupMajorFilter || 
        (groupMajorFilter === "Umum" && (!g.major || g.major === "Semua Jurusan / Umum"));

      return matchSearch && matchMajor;
    });
  }, [subjectGroups, groupSearchQuery, groupMajorFilter]);

  // Analytics Subjects
  const activeCount = subjects.filter(s => (s.status || "Aktif") === "Aktif").length;
  const wajibCount = subjects.filter(s => s.category === "Wajib").length;
  const peminatanCount = subjects.filter(s => s.category === "Peminatan").length;
  const mulokCount = subjects.filter(s => s.category === "Muatan Lokal").length;

  // Analytics Groups
  const groupWajibCount = subjectGroups.filter(g => g.category === "Wajib").length;
  const groupPeminatanCount = subjectGroups.filter(g => g.category === "Peminatan").length;
  const groupMulokCount = subjectGroups.filter(g => g.category === "Muatan Lokal").length;

  // Existing subject codes in lowercase for quick checking in batch modal
  const existingCodes = useMemo(() => {
    return new Set(subjects.map(s => (s.code || "").toUpperCase().trim()));
  }, [subjects]);

  // =========================================================================
  // LOGIKA KHUSUS ROLE SISWA: RESOLUSI KELAS & MAPEL KELAS SISWA
  // =========================================================================
  const isStudent = currentUserRole === "siswa" || currentUserRole === "student";

  const studentClassId = useMemo(() => {
    if (currentStudentClass) return currentStudentClass;
    if (!auth.currentUser) return null;
    const user = auth.currentUser;
    const matched = students.find(s => 
      s.id === user.uid || 
      s._firestoreId === user.uid || 
      (s.email && s.email.toLowerCase() === user.email?.toLowerCase()) ||
      (s.name && currentUserData?.name && s.name.toLowerCase() === currentUserData.name.toLowerCase())
    );
    if (matched?.classId || matched?.className) {
      return matched.classId || matched.className;
    }
    return currentUserData?.classId || currentUserData?.className || null;
  }, [currentStudentClass, students, currentUserData]);

  // Find student's own class object
  const studentMyClass = useMemo(() => {
    if (!studentClassId) return null;
    return classes.find(c => 
      c.name?.toLowerCase() === studentClassId.toLowerCase() ||
      c.id?.toLowerCase() === studentClassId.toLowerCase() ||
      c._firestoreId === studentClassId
    ) || null;
  }, [classes, studentClassId]);

  // Determine subjects specifically for this student's class
  const classSubjects = useMemo(() => {
    if (!studentClassId) return [];
    const classNameClean = (studentMyClass?.name || studentClassId || "").toLowerCase();
    const classMajor = (studentMyClass?.major || (classNameClean.includes("ips") ? "IPS" : "IPA")).toUpperCase();

    // 1. Get all schedules assigned to this class
    const classSchedules = schedules.filter(s => {
      const c = (s.class || s.classId || "").toLowerCase();
      return c === classNameClean;
    });

    // Create a map of subject -> schedule
    const schedMap = new Map<string, any>();
    classSchedules.forEach(sc => {
      if (sc.subject) {
        schedMap.set(sc.subject.toLowerCase().trim(), sc);
      }
    });

    // 2. Filter subjects that apply to this class
    const result: any[] = [];
    const seenSubjectNames = new Set<string>();

    // First: include all subjects found in this class's schedule
    classSchedules.forEach(sc => {
      const sName = sc.subject?.trim();
      if (!sName || seenSubjectNames.has(sName.toLowerCase())) return;
      seenSubjectNames.add(sName.toLowerCase());

      const matchedSubject = subjects.find(sub => 
        (sub.name || "").toLowerCase().trim() === sName.toLowerCase()
      );

      result.push({
        _firestoreId: matchedSubject?._firestoreId || sc._firestoreId,
        code: matchedSubject?.code || (classMajor === "IPA" ? "IPA" : "IPS"),
        name: sName,
        category: matchedSubject?.category || "Wajib",
        creditHours: matchedSubject?.creditHours || "3 JP",
        kkm: matchedSubject?.kkm || sc.passingScore || 75,
        level: matchedSubject?.level || studentMyClass?.level || "Semua Tingkat",
        teacher: sc.teacher || matchedSubject?.teacher || "-",
        description: matchedSubject?.description || `Mata pelajaran kurikulum untuk rombongan belajar ${studentMyClass?.name || studentClassId}.`,
        status: matchedSubject?.status || "Aktif",
        scheduleDay: sc.day || null,
        scheduleTime: sc.startTime && sc.endTime ? `${sc.startTime} - ${sc.endTime}` : null
      });
    });

    // Second: include standard subjects from the subjects collection that match the major & level
    subjects.forEach(sub => {
      const sName = (sub.name || "").trim();
      if (!sName || seenSubjectNames.has(sName.toLowerCase())) return;

      const subCode = (sub.code || "").toUpperCase().trim();
      // If subject is clearly for the other major, skip it
      if (classMajor === "IPA" && subCode === "IPS") return;
      if (classMajor === "IPS" && subCode === "IPA") return;

      // Check level match if specified
      if (sub.level && sub.level !== "Semua Tingkat" && studentMyClass?.level) {
        if (!sub.level.toLowerCase().includes(studentMyClass.level.toLowerCase())) {
          return;
        }
      }

      seenSubjectNames.add(sName.toLowerCase());
      const sched = schedMap.get(sName.toLowerCase());

      result.push({
        ...sub,
        teacher: (sub.teacher && sub.teacher !== "-") ? sub.teacher : (sched?.teacher || "-"),
        scheduleDay: sched?.day || null,
        scheduleTime: sched?.startTime && sched?.endTime ? `${sched.startTime} - ${sched.endTime}` : null
      });
    });

    return result;
  }, [studentClassId, studentMyClass, schedules, subjects]);

  // Filtered subjects for student search & category
  const filteredClassSubjects = useMemo(() => {
    return classSubjects.filter(sub => {
      const matchSearch = !studentSearchQuery.trim() ||
        (sub.name || "").toLowerCase().includes(studentSearchQuery.toLowerCase().trim()) ||
        (sub.code || "").toLowerCase().includes(studentSearchQuery.toLowerCase().trim()) ||
        (sub.teacher || "").toLowerCase().includes(studentSearchQuery.toLowerCase().trim());

      const matchCategory = 
        studentCategoryFilter === "All" || sub.category === studentCategoryFilter;

      return matchSearch && matchCategory;
    });
  }, [classSubjects, studentSearchQuery, studentCategoryFilter]);

  // Role & Data Loading Guard to prevent flash of admin subjects
  if (isAuthLoading || !isRoleReady || loading) {
    return <PageContentSkeleton />;
  }

  // =========================================================================
  // VIEW KHUSUS ROLE SISWA: HANYA MENAMPILKAN MATA PELAJARAN KELAS DIA SENDIRI
  // =========================================================================
  if (isStudent) {
    if (!studentMyClass && !studentClassId) {
      return (
        <div className="p-4 sm:p-8 max-w-[1200px] mx-auto w-full space-y-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-xl border border-gray-100 p-8 sm:p-12 text-center max-w-lg mx-auto shadow-xs my-12">
            <div className="w-16 h-16 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-sm">
              <AlertCircle className="w-8 h-8" />
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
              Belum Ada Kelas
            </span>
            <h2 className="text-xl font-black text-gray-900 mt-3 tracking-tight">Belum Terdaftar di Kelas</h2>
            <p className="text-xs text-gray-500 mt-2 font-medium leading-relaxed">
              Akun Anda saat ini belum terhubung dengan rombongan belajar/kelas manapun. Silakan hubungi wali kelas atau bagian Tata Usaha sekolah untuk penempatan kelas Anda.
            </p>
          </div>
        </div>
      );
    }

    const studentWajibCount = classSubjects.filter(s => s.category === "Wajib").length;
    const studentPeminatanCount = classSubjects.filter(s => s.category === "Peminatan").length;
    const totalJPNumber = classSubjects.reduce((acc, curr) => {
      const jp = parseInt(curr.creditHours) || 3;
      return acc + jp;
    }, 0);

    return (
      <div className="p-4 sm:p-8 pb-16 max-w-[1500px] mx-auto w-full flex flex-col space-y-6 animate-in fade-in duration-300">
        
        {/* Top Header Card */}
        <div className="bg-white rounded-xl p-6 sm:p-7 border border-gray-100 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-[#531FFF]/5 via-[#531FFF]/2 to-transparent pointer-events-none" />
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 rounded-lg bg-gradient-to-tr from-[#531FFF] to-[#7B42FF] flex items-center justify-center text-white shadow-lg shadow-[#531FFF]/25 shrink-0">
              <BookOpen className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#531FFF]/10 text-[#531FFF] border border-[#531FFF]/20">
                  Portal Siswa
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {studentMyClass?.level || "Kelas 10"} • Peminatan {studentMyClass?.major || "IPA"}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Kurikulum Aktif
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mt-1">
                Mata Pelajaran: {studentMyClass?.name || studentClassId}
              </h1>
              <p className="text-gray-500 text-xs sm:text-sm font-medium mt-1">
                Daftar mata pelajaran resmi, alokasi jam belajar mingguan (JP), dan guru pengampu untuk kelas Anda.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10 self-start sm:self-auto">
            <div className="px-4 py-2 bg-gray-50 rounded-lg border border-gray-100 text-right">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kurikulum</p>
              <p className="text-xs font-black text-gray-800">Merdeka Belajar</p>
            </div>
          </div>
        </div>

        {/* 3 Detail Info Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Card 1: Total Mata Pelajaran */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[10px] font-black tracking-wider uppercase text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100">
                Mata Pelajaran Terdaftar
              </span>
              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-3xl font-black text-gray-900">{classSubjects.length}</span>
                <span className="text-xs font-bold text-gray-400">Total Mapel di Kelas</span>
              </div>
              <p className="text-xs font-bold text-gray-500">
                {studentWajibCount} Mapel Wajib • {studentPeminatanCount} Peminatan {studentMyClass?.major || "IPA"}
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-gray-100 text-[11px] text-emerald-700 font-bold flex items-center gap-1.5">
              <BadgeCheck className="w-4 h-4 text-emerald-600" />
              <span>Sesuai standar rombel {studentMyClass?.name || studentClassId}</span>
            </div>
          </div>

          {/* Card 2: Beban Belajar / Alokasi JP */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[10px] font-black tracking-wider uppercase text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                Beban Jam Belajar (JP)
              </span>
              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-3xl font-black text-gray-900">{totalJPNumber} JP</span>
                <span className="text-xs font-bold text-gray-400">/ Minggu</span>
              </div>
              <p className="text-xs font-bold text-gray-500">
                Rata-rata 3 - 4 Jam Pelajaran tatap muka per mata pelajaran
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-gray-100 text-[11px] text-gray-400 font-medium flex items-center justify-between">
              <span>1 Jam Pelajaran (JP)</span>
              <span className="font-bold text-gray-700">45 Menit</span>
            </div>
          </div>

          {/* Card 3: Standar KKM Minimum */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[10px] font-black tracking-wider uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                Kriteria Ketuntasan (KKM)
              </span>
              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-3xl font-black text-gray-900">75</span>
                <span className="text-xs font-bold text-gray-400">Standar Minimum KKM</span>
              </div>
              <p className="text-xs font-bold text-gray-500">
                Batas capaian minimal kompetensi pembelajaran kelulusan
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-gray-100 text-[11px] text-gray-400 font-medium flex items-center justify-between">
              <span>Skala Penilaian</span>
              <span className="font-bold text-gray-700">0 - 100</span>
            </div>
          </div>

        </div>

        {/* Section: Daftar Mata Pelajaran */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-xs space-y-5">
          
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">
                Daftar Pelajaran Kelas {studentMyClass?.name || studentClassId} ({filteredClassSubjects.length})
              </h2>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Mata pelajaran yang diajarkan pada rombongan belajar Anda beserta guru pengampu.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari mapel atau guru..."
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                />
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs font-bold">
                {["All", "Wajib", "Peminatan", "Muatan Lokal"].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setStudentCategoryFilter(cat)}
                    className={cn(
                      "px-2.5 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap",
                      studentCategoryFilter === cat ? "bg-white text-gray-900 shadow-2xs" : "text-gray-500 hover:text-gray-900"
                    )}
                  >
                    {cat === "All" ? "Semua" : cat}
                  </button>
                ))}
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
                <button
                  type="button"
                  onClick={() => setStudentViewMode("grid")}
                  className={cn(
                    "p-1.5 rounded-md transition-all cursor-pointer",
                    studentViewMode === "grid" ? "bg-white text-[#531FFF] shadow-2xs" : "text-gray-400 hover:text-gray-600"
                  )}
                  title="Tampilan Kartu"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setStudentViewMode("table")}
                  className={cn(
                    "p-1.5 rounded-md transition-all cursor-pointer",
                    studentViewMode === "table" ? "bg-white text-[#531FFF] shadow-2xs" : "text-gray-400 hover:text-gray-600"
                  )}
                  title="Tampilan Tabel"
                >
                  <TableIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Content List */}
          {filteredClassSubjects.length > 0 ? (
            studentViewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredClassSubjects.map((sub, idx) => {
                  const isWajib = sub.category === "Wajib";

                  return (
                    <div
                      key={sub._firestoreId || sub.name || idx}
                      className="rounded-lg p-4 bg-white border border-gray-100 hover:border-gray-200 hover:shadow-xs transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                            isWajib ? "bg-purple-50 text-[#531FFF] border border-purple-100" : "bg-blue-50 text-blue-700 border border-blue-100"
                          )}>
                            {sub.category}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-gray-400 px-2 py-0.5 bg-gray-50 rounded border border-gray-100">
                            {sub.code || "MAPEL"}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-black text-gray-900 line-clamp-1" title={sub.name}>
                            {sub.name}
                          </h4>
                          <p className="text-[11px] text-gray-500 font-medium line-clamp-2 mt-1 leading-relaxed">
                            {sub.description || "Mata pelajaran kurikulum standar nasional sekolah."}
                          </p>
                        </div>

                        {/* Teacher Box */}
                        <div className="p-3 rounded-lg bg-gray-50/80 border border-gray-100 flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-white text-[#531FFF] border border-gray-200/80 shadow-2xs flex items-center justify-center font-bold text-xs shrink-0">
                            {sub.teacher && sub.teacher !== "-" ? sub.teacher.charAt(0).toUpperCase() : "G"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Guru Pengampu</p>
                            <p className="text-xs font-bold text-gray-900 truncate" title={sub.teacher}>
                              {sub.teacher && sub.teacher !== "-" ? sub.teacher : "Belum Ditentukan"}
                            </p>
                          </div>
                        </div>

                        {/* Schedule Info if scheduled */}
                        {sub.scheduleDay && sub.scheduleTime && (
                          <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-100 text-blue-900 text-[11px] font-bold flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="truncate">
                              {sub.scheduleDay}, {sub.scheduleTime}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-500">
                        <span className="text-[#531FFF] font-black">{sub.creditHours || "3 JP"}</span>
                        <span>KKM: <strong className="text-gray-900">{sub.kkm || 75}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60 font-bold text-gray-400 uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4 w-12 text-center">No</th>
                      <th className="py-3 px-4">Kode</th>
                      <th className="py-3 px-4">Nama Mata Pelajaran</th>
                      <th className="py-3 px-4">Kategori</th>
                      <th className="py-3 px-4">Guru Pengampu</th>
                      <th className="py-3 px-4">Jadwal Kelas</th>
                      <th className="py-3 px-4 text-center">Alokasi JP</th>
                      <th className="py-3 px-4 text-center">KKM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredClassSubjects.map((sub, idx) => (
                      <tr key={sub._firestoreId || sub.name || idx} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3 px-4 text-center font-bold text-gray-400">{idx + 1}</td>
                        <td className="py-3 px-4 font-mono font-bold text-gray-700">{sub.code || "-"}</td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-gray-900">{sub.name}</p>
                          <p className="text-[10px] text-gray-400 truncate max-w-xs">{sub.description || "-"}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold",
                            sub.category === "Wajib" ? "bg-purple-50 text-[#531FFF]" : "bg-blue-50 text-blue-700"
                          )}>
                            {sub.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-gray-800">
                          {sub.teacher && sub.teacher !== "-" ? sub.teacher : "Belum Ditentukan"}
                        </td>
                        <td className="py-3 px-4 text-gray-600 font-medium">
                          {sub.scheduleDay && sub.scheduleTime ? `${sub.scheduleDay}, ${sub.scheduleTime}` : "-"}
                        </td>
                        <td className="py-3 px-4 text-center font-black text-[#531FFF]">{sub.creditHours || "3 JP"}</td>
                        <td className="py-3 px-4 text-center font-bold text-gray-900">{sub.kkm || 75}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="py-12 text-center text-gray-400 text-xs font-semibold">
              Tidak ada mata pelajaran yang cocok dengan pencarian &quot;{studentSearchQuery}&quot;.
            </div>
          )}

        </div>

      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 pb-16 max-w-[1600px] mx-auto w-full flex flex-col space-y-6">
      
      {/* ================= SUBJECT MODAL (CREATE / EDIT / VIEW) ================= */}
      <SubjectModal
        isOpen={subjectModalState.isOpen}
        mode={subjectModalState.mode}
        subject={subjectModalState.subject}
        onClose={() => setSubjectModalState(s => ({ ...s, isOpen: false }))}
        onSave={handleSaveSubject}
        onSwitchToEdit={isReadOnly ? undefined : (sub) => setSubjectModalState({ isOpen: true, mode: "edit", subject: sub })}
        subjectGroups={subjectGroups}
        majorOptions={majorOptions}
        gradeLevels={gradeLevels}
        currentStage={currentStage}
        stageConfig={stageConfig}
        teachers={teachers}
        isGuru={isReadOnly}
      />

      {/* ================= DEDICATED DELETE MODAL ================= */}
      <DeleteSubjectModal
        isOpen={deleteModalState.isOpen}
        subject={deleteModalState.subject}
        onClose={() => setDeleteModalState({ isOpen: false, subject: null })}
        onConfirmDelete={handleConfirmDeleteSubject}
      />

      {/* ================= HEADER SECTION ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-purple-50/70 via-white to-indigo-50/40 p-6 rounded-xl border border-purple-100/60 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-[#531FFF] text-white flex items-center justify-center shadow-md shadow-[#531FFF]/25">
              {activeTab === "subjects" ? <BookOpen className="w-5 h-5" /> : <FolderKanban className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                  {activeTab === "subjects" ? "Mata Pelajaran" : "Kelompok Mata Pelajaran (Jurusan)"}
                </h1>
                {isReadOnly && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    Mode Lihat (Read-Only)
                  </span>
                )}
              </div>
              <p className="text-[13px] text-gray-500 font-medium">
                {activeTab === "subjects" 
                  ? "Kelola struktur mata pelajaran, alokasi jam pembelajaran (JP), KKM, dan penugasan guru pengampu."
                  : `Kelompokkan mata pelajaran kurikulum ${stageConfig.name} berdasarkan jurusan/program keahlian untuk Kelas, Jadwal, Nilai, & Rapot.`}
              </p>
            </div>
          </div>
        </div>

        {!isReadOnly && (
          <div className="flex flex-wrap items-center gap-2.5">
            {activeTab === "subjects" ? (
              <>
                {/* SMA Automatic Full Curriculum Setup */}
                {currentStage === "SMA" && (
                  <button
                    type="button"
                    onClick={handleSyncSmaStructure}
                    disabled={isSyncingSmaCurriculum}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/80 rounded-lg text-[13px] font-bold transition-all shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
                    title="Susun dan selaraskan otomatis seluruh mata pelajaran SMA ke Kelompok Umum, MIPA, IPS, dan Bahasa"
                  >
                    {isSyncingSmaCurriculum ? (
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-emerald-700" />
                    )}
                    <span>Susun Kurikulum SMA Lengkap</span>
                  </button>
                )}

                {/* Batch Add Preset Button */}
                <button
                  type="button"
                  onClick={() => {
                    const unadded = activePresets.filter(p => !existingCodes.has(p.code.toUpperCase())).map(p => p.code);
                    setSelectedBatchPresets(unadded);
                    setShowBatchModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-purple-50 text-[#531FFF] hover:bg-purple-100 border border-purple-200/80 rounded-lg text-[13px] font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-4 h-4 text-[#531FFF]" />
                  <span>Paket Kurikulum {stageConfig.name}</span>
                </button>

                {/* New Subject Button */}
                <button 
                  type="button"
                  onClick={() => openSubjectCrud("create")}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#531FFF] hover:bg-[#4314cc] text-white rounded-lg text-[13px] font-bold shadow-md shadow-[#531FFF]/25 transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Mapel Baru</span>
                </button>
              </>
            ) : (
              <>
                {/* SMA Automatic Full Curriculum Setup */}
                {currentStage === "SMA" && (
                  <button
                    type="button"
                    onClick={handleSyncSmaStructure}
                    disabled={isSyncingSmaCurriculum}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/80 rounded-lg text-[13px] font-bold transition-all shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
                    title="Susun dan selaraskan otomatis seluruh kelompok mata pelajaran SMA beserta mata pelajaran anggotanya"
                  >
                    {isSyncingSmaCurriculum ? (
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-emerald-700" />
                    )}
                    <span>Susun Kurikulum SMA Lengkap</span>
                  </button>
                )}

                {/* Load Preset Groups */}
                <button
                  type="button"
                  onClick={handleLoadPresetGroups}
                  className="flex items-center gap-2 px-4 py-2.5 bg-purple-50 text-[#531FFF] hover:bg-purple-100 border border-purple-200/80 rounded-lg text-[13px] font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-4 h-4 text-[#531FFF]" />
                  <span>Muat Preset Kurikulum {currentStage}</span>
                </button>

                {/* New Group Button */}
                <button 
                  type="button"
                  onClick={() => {
                    setEditingGroup(null);
                    setIsGroupModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#531FFF] hover:bg-[#4314cc] text-white rounded-lg text-[13px] font-bold shadow-md shadow-[#531FFF]/25 transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Kelompok Baru</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ================= NAVIGATION TABS (MAPEL VS KELOMPOK) ================= */}
      <div className="flex items-center gap-2 p-1.5 bg-gray-100/90 rounded-xl border border-gray-200/80 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("subjects")}
          className={cn(
            "flex items-center gap-2.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-extrabold transition-all cursor-pointer",
            activeTab === "subjects"
              ? "bg-white text-[#531FFF] shadow-xs"
              : "text-gray-500 hover:text-gray-800"
          )}
        >
          <BookOpen className="w-4 h-4" />
          <span>Daftar Mata Pelajaran</span>
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[11px] font-mono",
            activeTab === "subjects" ? "bg-purple-50 text-[#531FFF] border border-purple-100" : "bg-gray-200/80 text-gray-600"
          )}>
            {subjects.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("groups")}
          className={cn(
            "flex items-center gap-2.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-extrabold transition-all cursor-pointer",
            activeTab === "groups"
              ? "bg-white text-[#531FFF] shadow-xs"
              : "text-gray-500 hover:text-gray-800"
          )}
        >
          <FolderKanban className="w-4 h-4" />
          <span>Kelompok Mata Pelajaran (Jurusan)</span>
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[11px] font-mono",
            activeTab === "groups" ? "bg-purple-50 text-[#531FFF] border border-purple-100" : "bg-gray-200/80 text-gray-600"
          )}>
            {subjectGroups.length}
          </span>
        </button>
      </div>

      {/* ================= TAB 1: DAFTAR MATA PELAJARAN ================= */}
      {activeTab === "subjects" && (
        <div className="space-y-6">
          {/* ================= QUICK PRESET TEMPLATES BAR ================= */}
          {!isReadOnly && (
            <div className="bg-white border border-gray-100 rounded-xl p-4 sm:p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#531FFF]" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-800">
                    Template Cepat: Tambah Sekali Klik ({stageConfig.name})
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-gray-400">
                  Klik nama mapel untuk mengisi formulir otomatis
                </span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                {activePresets.slice(0, 10).map((preset) => {
                  const isAlreadyAdded = existingCodes.has(preset.code.toUpperCase());
                  return (
                    <button
                      key={preset.code}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all border cursor-pointer",
                        isAlreadyAdded 
                          ? "bg-gray-50/80 text-gray-600 border-gray-200 hover:border-[#531FFF]/50 hover:text-[#531FFF]" 
                          : "bg-purple-50/60 text-[#531FFF] border-purple-200 hover:bg-purple-100 hover:border-purple-300"
                      )}
                      title={preset.description}
                    >
                      <span>{preset.icon}</span>
                      <span>{preset.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-white border text-gray-500 font-mono">
                        {preset.code}
                      </span>
                      {isAlreadyAdded && (
                        <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                      )}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setShowBatchModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#531FFF] hover:underline shrink-0 cursor-pointer"
                >
                  <span>Lihat Semua ({activePresets.length})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ================= METRICS STATS TILES ================= */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Mapel */}
            <div className="bg-white p-4 sm:p-5 rounded-lg border border-gray-100 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Mapel</p>
                <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">{subjects.length}</p>
                <span className="text-[11px] font-semibold text-emerald-600 mt-0.5 inline-block">
                  {activeCount} Mapel Aktif
                </span>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-50 text-[#531FFF] flex items-center justify-center">
                <BookOpen className="w-6 h-6" />
              </div>
            </div>

            {/* Mapel Wajib */}
            <div className="bg-white p-4 sm:p-5 rounded-lg border border-gray-100 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Kelompok Wajib</p>
                <p className="text-2xl sm:text-3xl font-black text-blue-600 mt-1">{wajibCount}</p>
                <span className="text-[11px] font-semibold text-gray-400 mt-0.5 inline-block">
                  Kurikulum Nasional
                </span>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <GraduationCap className="w-6 h-6" />
              </div>
            </div>

            {/* Mapel Peminatan */}
            <div className="bg-white p-4 sm:p-5 rounded-lg border border-gray-100 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Peminatan</p>
                <p className="text-2xl sm:text-3xl font-black text-purple-600 mt-1">{peminatanCount}</p>
                <span className="text-[11px] font-semibold text-gray-400 mt-0.5 inline-block">
                  Kejuruan &amp; Peminatan
                </span>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Layers className="w-6 h-6" />
              </div>
            </div>

            {/* Muatan Lokal */}
            <div className="bg-white p-4 sm:p-5 rounded-lg border border-gray-100 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Muatan Lokal</p>
                <p className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">{mulokCount}</p>
                <span className="text-[11px] font-semibold text-gray-400 mt-0.5 inline-block">
                  Kearifan Sekolah &amp; Daerah
                </span>
              </div>
              <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Target className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* ================= FILTER & SEARCH TOOLBAR ================= */}
          <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-2xs flex flex-col xl:flex-row items-center justify-between gap-4">
            {/* Search & Category Pills */}
            <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 w-full xl:w-auto">
              {/* Search box */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input 
                  type="text"
                  placeholder="Cari nama, kode, kelompok..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
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

              {/* Category Tabs */}
              <div className="flex items-center gap-1 p-1 bg-gray-100/80 rounded-lg overflow-x-auto w-full sm:w-auto shrink-0">
                {["All", "Wajib", "Peminatan", "Muatan Lokal"].map((cat) => {
                  const isActive = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs font-bold transition-all shrink-0 cursor-pointer",
                        isActive 
                          ? "bg-white text-[#531FFF] shadow-2xs" 
                          : "text-gray-500 hover:text-gray-800"
                      )}
                    >
                      {cat === "All" ? "Semua Kategori" : cat}
                    </button>
                  );
                })}
              </div>

              {/* Major Filter Dropdown */}
              <select
                value={selectedMajorFilter}
                onChange={(e) => setSelectedMajorFilter(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 cursor-pointer w-full sm:w-auto"
                title="Filter berdasarkan Jurusan / Program Keahlian"
              >
                <option value="All">Semua Jurusan / Peminatan</option>
                <option value="Umum">Umum (Semua Jurusan)</option>
                {majorOptions.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>

              {/* Group Filter Dropdown */}
              <select
                value={selectedGroupFilter}
                onChange={(e) => setSelectedGroupFilter(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 cursor-pointer w-full sm:w-auto"
                title="Filter berdasarkan Kelompok Mata Pelajaran"
              >
                <option value="All">Semua Kelompok Mapel</option>
                {subjectGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.name} ({g.code})</option>
                ))}
              </select>
            </div>

            {/* Right side: Status Filter & View Mode Switcher */}
            <div className="flex items-center gap-2.5 w-full xl:w-auto justify-end">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 cursor-pointer"
              >
                <option value="All">Semua Status</option>
                <option value="Aktif">Aktif</option>
                <option value="Nonaktif">Nonaktif</option>
              </select>

              {/* View Format Switcher */}
              <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200/60 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "p-1.5 rounded-md text-xs font-bold transition-all cursor-pointer",
                    viewMode === "grid" 
                      ? "bg-white text-[#531FFF] shadow-xs" 
                      : "text-gray-400 hover:text-gray-700"
                  )}
                  title="Tampilan Kartu"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={cn(
                    "p-1.5 rounded-md text-xs font-bold transition-all cursor-pointer",
                    viewMode === "table" 
                      ? "bg-white text-[#531FFF] shadow-xs" 
                      : "text-gray-400 hover:text-gray-700"
                  )}
                  title="Tampilan Tabel"
                >
                  <TableIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* ================= MAIN SUBJECTS LISTING ================= */}
          {loading ? (
            <div className="py-24 bg-white border border-gray-100 rounded-xl flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#531FFF]" />
              <p className="text-xs font-bold text-gray-500">Memuat daftar mata pelajaran...</p>
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="py-20 bg-white border border-gray-100 rounded-xl flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-16 h-16 rounded-xl bg-purple-50 text-[#531FFF] flex items-center justify-center">
                <BookOpen className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900">Tidak ada mata pelajaran ditemukan</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-md">
                  {searchQuery || selectedCategory !== "All" || selectedStatus !== "All" || selectedMajorFilter !== "All" || selectedGroupFilter !== "All"
                    ? "Tidak ada data yang cocok dengan filter yang Anda gunakan. Coba reset filter."
                    : "Belum ada mata pelajaran terdaftar dalam sistem. Anda dapat menambahkan mapel baru atau mengimpor paket kurikulum nasional."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {searchQuery || selectedCategory !== "All" || selectedStatus !== "All" || selectedMajorFilter !== "All" || selectedGroupFilter !== "All" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("All");
                      setSelectedStatus("All");
                      setSelectedMajorFilter("All");
                      setSelectedGroupFilter("All");
                    }}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Reset Filter
                  </button>
                ) : !isReadOnly ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowBatchModal(true)}
                      className="px-4 py-2 bg-purple-50 text-[#531FFF] hover:bg-purple-100 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-purple-200"
                    >
                      ⚡ Impor Paket Standar
                    </button>
                    <button
                      type="button"
                      onClick={() => openSubjectCrud("create")}
                      className="px-4 py-2 bg-[#531FFF] text-white hover:bg-[#4314cc] rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      + Tambah Manual
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ) : viewMode === "grid" ? (
            /* ================= GRID CARDS VIEW ================= */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredSubjects.map((item) => {
                const isWajib = item.category === "Wajib";
                const isPeminatan = item.category === "Peminatan";
                const assignedTeachers = getTeachersForSubject(item, teachers);

                // Resolve group name if stored or match by id
                const matchedGroup = subjectGroups.find(g => g.id === item.groupId || g.subjectIds?.includes(item._firestoreId || item.id || item.code));
                const displayGroupName = item.groupName || (matchedGroup ? matchedGroup.name : null);
                const displayMajor = item.major && item.major !== "Semua Jurusan / Umum" ? item.major : (matchedGroup && matchedGroup.major !== "Semua Jurusan / Umum" ? matchedGroup.major : null);

                return (
                  <div
                    key={item._firestoreId}
                    className="bg-white hover:bg-gradient-to-b hover:from-white hover:to-purple-50/20 border border-gray-100 hover:border-[#531FFF]/30 rounded-xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Bar: Code chip + Category Pill + Status */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2.5 py-1 rounded-lg bg-gray-100 font-mono font-black text-xs text-gray-800 border border-gray-200/60">
                            {item.code || "MAPEL"}
                          </span>
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-md text-[11px] font-bold border",
                            isWajib 
                              ? "bg-blue-50 text-blue-700 border-blue-200" 
                              : isPeminatan 
                                ? "bg-purple-50 text-purple-700 border-purple-200" 
                                : "bg-amber-50 text-amber-700 border-amber-200"
                          )}>
                            {item.category || "Wajib"}
                          </span>
                        </div>

                        <span className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border shrink-0",
                          (item.status || "Aktif") === "Aktif"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-gray-100 text-gray-500 border-gray-200"
                        )}>
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            (item.status || "Aktif") === "Aktif" ? "bg-emerald-500" : "bg-gray-400"
                          )} />
                          {item.status || "Aktif"}
                        </span>
                      </div>

                      {/* Subject Title */}
                      <h3 className="text-lg font-black text-gray-900 group-hover:text-[#531FFF] transition-colors leading-tight">
                        {item.name || "-"}
                      </h3>

                      {/* Group & Major Badges */}
                      {(displayGroupName || displayMajor) && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          {displayGroupName && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50/80 text-[#531FFF] border border-purple-100">
                              <FolderKanban className="w-3 h-3 text-[#531FFF]" />
                              <span className="truncate max-w-[200px]">{displayGroupName}</span>
                            </span>
                          )}
                          {displayMajor && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                              <GraduationCap className="w-3 h-3 text-indigo-600" />
                              <span>{displayMajor}</span>
                            </span>
                          )}
                        </div>
                      )}
                      
                      {item.description && (
                        <p className="text-xs text-gray-400 font-medium mt-2 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}

                      {/* Quick Specs Badges */}
                      <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                          <Clock className="w-3.5 h-3.5 text-[#531FFF]" />
                          <span>{item.creditHours || "3 JP"}</span>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                          <Target className="w-3.5 h-3.5 text-emerald-600" />
                          <span>KKM: <strong>{item.kkm || 75}</strong></span>
                        </div>

                        <div className="col-span-2 pt-2 border-t border-gray-100 flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                            <UserCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            <span className="font-bold">Guru Pengajar ({assignedTeachers.length}):</span>
                          </div>
                          {assignedTeachers.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 pl-5">
                              {assignedTeachers.map((t, idx) => (
                                <span 
                                  key={idx}
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-50 text-[#531FFF] border border-purple-100 text-[11px] font-bold shadow-2xs"
                                  title={t.nip ? `NIP: ${t.nip}` : undefined}
                                >
                                  <ProfileAvatar name={t.name} size="xs" />
                                  <span className="truncate max-w-[140px]">{t.name}</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="pl-5 text-gray-400 italic text-[11px]">Belum Ditentukan</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions Bar */}
                    <div className="flex items-center justify-between gap-2 mt-5 pt-3 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => openSubjectCrud("view", item)}
                        className="text-xs font-bold text-gray-500 hover:text-[#531FFF] flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lihat Detail</span>
                      </button>

                      {!isReadOnly && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openSubjectCrud("edit", item)}
                            className="p-2 rounded-lg text-gray-400 hover:text-[#531FFF] hover:bg-purple-50 transition-all cursor-pointer"
                            title="Edit Mapel"
                          >
                            <PenTool className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openSubjectCrud("delete", item)}
                            className="p-2 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                            title="Hapus Mapel"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ================= TABLE VIEW ================= */
            <div className="bg-white border border-gray-100 rounded-xl shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/60 border-b border-gray-100">
                      <th className="py-3.5 px-6 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Kode</th>
                      <th className="py-3.5 px-6 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Mata Pelajaran</th>
                      <th className="py-3.5 px-6 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Kelompok &amp; Jurusan</th>
                      <th className="py-3.5 px-6 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Kategori</th>
                      <th className="py-3.5 px-6 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Beban / KKM</th>
                      <th className="py-3.5 px-6 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Guru Pengampu</th>
                      <th className="py-3.5 px-6 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider text-center">Status</th>
                      <th className="py-3.5 px-6 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider text-right">{isReadOnly ? "Detail" : "Aksi"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredSubjects.map((item) => {
                      const assignedTeachers = getTeachersForSubject(item, teachers);
                      const matchedGroup = subjectGroups.find(g => g.id === item.groupId || g.subjectIds?.includes(item._firestoreId || item.id || item.code));
                      const displayGroupName = item.groupName || (matchedGroup ? matchedGroup.name : "-");
                      const displayMajor = item.major && item.major !== "Semua Jurusan / Umum" ? item.major : (matchedGroup && matchedGroup.major !== "Semua Jurusan / Umum" ? matchedGroup.major : "Semua");

                      return (
                        <tr key={item._firestoreId} className="hover:bg-purple-50/20 transition-colors group">
                          <td className="py-4 px-6 font-mono font-black text-xs text-gray-800">
                            {item.code || "-"}
                          </td>
                          <td className="py-4 px-6">
                            <div className="font-extrabold text-sm text-gray-900 group-hover:text-[#531FFF] transition-colors">
                              {item.name || "-"}
                            </div>
                            {item.level && item.level !== "Semua Tingkat" && (
                              <span className="text-[10px] text-gray-400 font-semibold">{item.level}</span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <div className="text-xs font-bold text-gray-800 flex flex-col gap-0.5">
                              <span className="truncate max-w-[180px]">{displayGroupName}</span>
                              <span className="text-[10px] font-semibold text-indigo-600">{displayMajor}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className={cn(
                              "px-2.5 py-0.5 rounded-md text-xs font-bold border",
                              item.category === "Wajib" 
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : item.category === "Peminatan"
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                            )}>
                              {item.category || "Wajib"}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="text-xs font-bold text-gray-800">{item.creditHours || "3 JP"}</div>
                            <div className="text-[11px] font-medium text-emerald-600">KKM: {item.kkm || 75}</div>
                          </td>
                          <td className="py-4 px-6 text-xs font-semibold text-gray-700">
                            {assignedTeachers.length > 0 ? (
                              <div className="flex flex-wrap items-center gap-1.5 max-w-[280px]">
                                {assignedTeachers.map((t, idx) => (
                                  <span 
                                    key={idx}
                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-50 text-[#531FFF] border border-purple-100 text-[11px] font-bold shadow-2xs"
                                    title={t.nip ? `NIP: ${t.nip}` : undefined}
                                  >
                                    <ProfileAvatar name={t.name} size="xs" />
                                    <span>{t.name}</span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">Belum Ada</span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className={cn(
                              "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                              (item.status || "Aktif") === "Aktif"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-gray-100 text-gray-500 border-gray-200"
                            )}>
                              {item.status || "Aktif"}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openSubjectCrud("view", item)}
                                className="p-1.5 rounded-md text-gray-400 hover:text-[#531FFF] hover:bg-purple-50 transition-colors cursor-pointer"
                                title="Lihat Detail"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {!isReadOnly && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openSubjectCrud("edit", item)}
                                    className="p-1.5 rounded-md text-gray-400 hover:text-[#531FFF] hover:bg-purple-50 transition-colors cursor-pointer"
                                    title="Edit"
                                  >
                                    <PenTool className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openSubjectCrud("delete", item)}
                                    className="p-1.5 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                    title="Hapus"
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
          )}
        </div>
      )}

      {/* ================= TAB 2: KELOMPOK MATA PELAJARAN (JURUSAN) ================= */}
      {activeTab === "groups" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* ================= METRICS STATS TILES KELOMPOK ================= */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Kelompok */}
            <div className="bg-white p-4 sm:p-5 rounded-lg border border-gray-100 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Kelompok</p>
                <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">{subjectGroups.length}</p>
                <span className="text-[11px] font-semibold text-purple-600 mt-0.5 inline-block">
                  Struktur Kurikulum {stageConfig.name}
                </span>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-50 text-[#531FFF] flex items-center justify-center">
                <FolderKanban className="w-6 h-6" />
              </div>
            </div>

            {/* Kelompok Wajib / Umum */}
            <div className="bg-white p-4 sm:p-5 rounded-lg border border-gray-100 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Muatan Umum / Wajib</p>
                <p className="text-2xl sm:text-3xl font-black text-blue-600 mt-1">{groupWajibCount}</p>
                <span className="text-[11px] font-semibold text-gray-400 mt-0.5 inline-block">
                  Kelompok A / B Nasional
                </span>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <GraduationCap className="w-6 h-6" />
              </div>
            </div>

            {/* Kelompok Kejuruan / Peminatan */}
            <div className="bg-white p-4 sm:p-5 rounded-lg border border-gray-100 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Kejuruan / Peminatan</p>
                <p className="text-2xl sm:text-3xl font-black text-purple-600 mt-1">{groupPeminatanCount}</p>
                <span className="text-[11px] font-semibold text-gray-400 mt-0.5 inline-block">
                  Kelompok C1, C2, C3 Jurusan
                </span>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Layers className="w-6 h-6" />
              </div>
            </div>

            {/* Kelompok Muatan Lokal */}
            <div className="bg-white p-4 sm:p-5 rounded-lg border border-gray-100 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Muatan Lokal</p>
                <p className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">{groupMulokCount}</p>
                <span className="text-[11px] font-semibold text-gray-400 mt-0.5 inline-block">
                  Kearifan Daerah
                </span>
              </div>
              <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Target className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* ================= GROUP SEARCH & FILTER TOOLBAR ================= */}
          <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input 
                  type="text"
                  placeholder="Cari nama, kode, atau jurusan kelompok..."
                  value={groupSearchQuery}
                  onChange={(e) => setGroupSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                />
                {groupSearchQuery && (
                  <button 
                    onClick={() => setGroupSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Major Filter for Groups */}
              <select
                value={groupMajorFilter}
                onChange={(e) => setGroupMajorFilter(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 cursor-pointer w-full sm:w-auto"
              >
                <option value="All">Semua Jurusan</option>
                <option value="Umum">Umum / Semua Jurusan</option>
                {majorOptions.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="text-xs font-bold text-gray-500">
              Menampilkan {filteredGroups.length} dari {subjectGroups.length} kelompok
            </div>
          </div>

          {/* ================= GROUP CARDS LISTING ================= */}
          {filteredGroups.length === 0 ? (
            <div className="py-20 bg-white border border-gray-100 rounded-xl flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-16 h-16 rounded-xl bg-purple-50 text-[#531FFF] flex items-center justify-center">
                <FolderKanban className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900">Belum Ada Kelompok Mata Pelajaran</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-md">
                  Kelompok mata pelajaran memungkinkan Anda menampung dan mengelompokkan mapel berdasarkan jurusan (seperti Muatan Nasional, C1, C2, dan C3).
                </p>
              </div>
              {!isReadOnly && (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleLoadPresetGroups}
                    className="px-5 py-2.5 bg-purple-50 text-[#531FFF] hover:bg-purple-100 rounded-lg text-xs font-bold transition-all border border-purple-200 cursor-pointer flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Muat Preset Standar Kurikulum {currentStage}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingGroup(null);
                      setIsGroupModalOpen(true);
                    }}
                    className="px-5 py-2.5 bg-[#531FFF] text-white hover:bg-[#4314cc] rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Kelompok Baru</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredGroups.map((group) => {
                // Find subjects associated with this group
                const groupSubjects = subjects.filter((s) => {
                  const sId = s._firestoreId || s.id;
                  const inGroupArray = Array.isArray(group.subjectIds) && (group.subjectIds.includes(sId) || group.subjectIds.includes(s.code));
                  const matchesGroupId = s.groupId === group.id;
                  return inGroupArray || matchesGroupId;
                });

                const isWajib = group.category === "Wajib";
                const isPeminatan = group.category === "Peminatan";

                return (
                  <div
                    key={group.id}
                    className="bg-white border border-gray-100 hover:border-[#531FFF]/40 rounded-xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
                  >
                    <div className="space-y-4">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2.5 py-1 rounded-lg bg-gray-100 font-mono font-black text-xs text-gray-800 border border-gray-200/60">
                            {group.code}
                          </span>
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-md text-[11px] font-bold border",
                            isWajib 
                              ? "bg-blue-50 text-blue-700 border-blue-200" 
                              : isPeminatan 
                                ? "bg-purple-50 text-purple-700 border-purple-200" 
                                : "bg-amber-50 text-amber-700 border-amber-200"
                          )}>
                            {group.category}
                          </span>
                        </div>

                        <span className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border shrink-0",
                          group.status === "Aktif"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-gray-100 text-gray-500 border-gray-200"
                        )}>
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            group.status === "Aktif" ? "bg-emerald-500" : "bg-gray-400"
                          )} />
                          {group.status}
                        </span>
                      </div>

                      {/* Group Title */}
                      <div>
                        <h3 className="text-lg font-black text-gray-900 group-hover:text-[#531FFF] transition-colors leading-tight">
                          {group.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            <GraduationCap className="w-3 h-3 text-indigo-600" />
                            <span>{group.major}</span>
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                            <span>{group.level}</span>
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      {group.description && (
                        <p className="text-xs text-gray-500 font-medium leading-relaxed line-clamp-2">
                          {group.description}
                        </p>
                      )}

                      {/* Subjects in this group */}
                      <div className="pt-3 border-t border-gray-100 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                          <span className="flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-[#531FFF]" />
                            <span>Mata Pelajaran Terdaftar ({groupSubjects.length})</span>
                          </span>
                        </div>

                        {groupSubjects.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar p-1">
                            {groupSubjects.map((sub) => (
                              <span
                                key={sub._firestoreId || sub.code}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-50/70 hover:bg-purple-100 text-[#531FFF] border border-purple-200/80 text-[11px] font-bold transition-colors"
                              >
                                <span className="font-mono text-[10px] opacity-75">{sub.code}</span>
                                <span className="truncate max-w-[150px]">{sub.name}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic py-1">
                            Belum ada mata pelajaran dalam kelompok ini.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-between gap-2 mt-5 pt-3 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => {
                          setAssignTargetGroup(group);
                          setIsAssignModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-purple-50 text-[#531FFF] hover:bg-purple-100 rounded-lg text-xs font-bold transition-all border border-purple-200 cursor-pointer flex items-center gap-1.5 active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Kelola Mapel</span>
                      </button>

                      {!isReadOnly && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingGroup(group);
                              setIsGroupModalOpen(true);
                            }}
                            className="p-2 rounded-lg text-gray-400 hover:text-[#531FFF] hover:bg-purple-50 transition-all cursor-pointer"
                            title="Edit Kelompok"
                          >
                            <PenTool className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteGroup(group)}
                            className="p-2 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                            title="Hapus Kelompok"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= SUBJECT GROUP MODAL ================= */}
      <SubjectGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => {
          setIsGroupModalOpen(false);
          setEditingGroup(null);
        }}
        onSave={handleSaveGroup}
        editingGroup={editingGroup}
        majorOptions={majorOptions}
        gradeLevels={gradeLevels}
        currentStage={currentStage}
        availableSubjects={subjects}
      />

      {/* ================= ASSIGN SUBJECTS MODAL ================= */}
      <AssignGroupSubjectsModal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setAssignTargetGroup(null);
        }}
        group={assignTargetGroup}
        availableSubjects={subjects}
        onSave={handleSaveAssignSubjects}
      />

      {/* ================= BATCH ADD MODAL (PAKET KURIKULUM NASIONAL) ================= */}
      {!isReadOnly && showBatchModal && (
        <div className="fixed inset-0 z-50 p-3 sm:p-6 bg-gray-950/60 backdrop-blur-xs flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50/80 to-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#531FFF] text-white flex items-center justify-center shadow-md shadow-[#531FFF]/25">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 tracking-tight">
                    Impor Paket Kurikulum Standar Nasional
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    Pilih mata pelajaran yang ingin ditambahkan secara massal ke database sekolah.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Select All Bar */}
            <div className="p-4 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between text-xs font-bold text-gray-600 shrink-0">
              <span>{selectedBatchPresets.length} dari {activePresets.length} dipilih</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const unadded = activePresets.filter(p => !existingCodes.has(p.code.toUpperCase())).map(p => p.code);
                    setSelectedBatchPresets(unadded);
                  }}
                  className="text-[#531FFF] hover:underline cursor-pointer"
                >
                  Pilih Semua yang Belum Ada
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setSelectedBatchPresets([])}
                  className="text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  Batal Pilih Semua
                </button>
              </div>
            </div>

            {/* Modal Presets List */}
            <div className="p-5 overflow-y-auto flex-1 custom-scrollbar space-y-2.5">
              {activePresets.map((preset) => {
                const isAlreadyInSystem = existingCodes.has(preset.code.toUpperCase());
                const isSelected = selectedBatchPresets.includes(preset.code);

                return (
                  <div
                    key={preset.code}
                    onClick={() => {
                      if (isAlreadyInSystem) return;
                      setSelectedBatchPresets(prev => 
                        prev.includes(preset.code) 
                          ? prev.filter(c => c !== preset.code) 
                          : [...prev, preset.code]
                      );
                    }}
                    className={cn(
                      "p-3.5 rounded-lg border transition-all flex items-center justify-between gap-3 select-none",
                      isAlreadyInSystem
                        ? "bg-gray-50/60 border-gray-200/60 opacity-60 cursor-not-allowed"
                        : isSelected
                          ? "bg-purple-50/50 border-[#531FFF] shadow-2xs cursor-pointer"
                          : "bg-white border-gray-200 hover:border-gray-300 cursor-pointer"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all",
                        isAlreadyInSystem
                          ? "bg-gray-200 border-gray-300 text-gray-500"
                          : isSelected
                            ? "bg-[#531FFF] border-[#531FFF] text-white"
                            : "border-gray-300 bg-white"
                      )}>
                        {(isAlreadyInSystem || isSelected) && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      <span className="text-xl shrink-0">{preset.icon}</span>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-gray-900 truncate">
                            {preset.name}
                          </span>
                          <span className="font-mono text-[11px] font-bold px-1.5 py-0.2 bg-gray-100 rounded text-gray-600">
                            {preset.code}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 font-medium truncate mt-0.5">
                          {preset.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-md text-[10px] font-bold border",
                        preset.category === "Wajib" ? "bg-blue-50 text-blue-700 border-blue-200" : preset.category === "Peminatan" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-amber-50 text-amber-700 border-amber-200"
                      )}>
                        {preset.category}
                      </span>
                      <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                        {preset.creditHours}
                      </span>
                      {isAlreadyInSystem && (
                        <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          Sudah Ada
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 sm:p-5 border-t border-gray-100 bg-white flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="px-5 py-2.5 rounded-lg text-xs sm:text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                disabled={isBatchAdding}
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleBatchAddPresets}
                disabled={isBatchAdding || selectedBatchPresets.length === 0}
                className="px-6 py-2.5 bg-[#531FFF] hover:bg-[#4314cc] text-white rounded-lg text-xs sm:text-sm font-bold shadow-md shadow-[#531FFF]/25 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {isBatchAdding ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menambahkan ke Database...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Tambahkan {selectedBatchPresets.length} Mapel Terpilih</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
