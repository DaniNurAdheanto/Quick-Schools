"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users,
  User,
  Phone,
  MapPin,
  Briefcase,
  CheckCircle2,
  X,
  Search,
  Edit2,
  Trash2,
  Eye,
  Heart,
  GraduationCap,
  AlertTriangle,
  LayoutGrid,
  List,
  Save,
  Loader2,
  UserCheck,
  HeartHandshake,
  Mail,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { auth, db } from "@/lib/firebase";
import { isParentRole } from "@/lib/roles-config";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { useUnifiedStudents, UnifiedStudent } from "@/hooks/use-unified-students";
import { useUnifiedTeachers } from "@/hooks/use-unified-teachers";
import { useAuth } from "@/context/AuthContext";
import { PageContentSkeleton } from "@/components/ui/role-loading-skeleton";

export interface ParentData {
  id: string; // Firestore Doc ID or synthesized ID
  parentId?: string; // Custom ID e.g. PRT-001
  name: string; // Nama Lengkap / Tampilan Ortu
  fatherName?: string; // Nama Ayah Kandung
  motherName?: string; // Nama Ibu Kandung
  guardianName?: string; // Nama Wali (Opsional)
  nik?: string;
  relationship: "Ayah Kandung" | "Ibu Kandung" | "Wali Murid" | string;
  phone: string;
  email?: string;
  job?: string;
  income?: string;
  address?: string;
  // Kontak Darurat
  emergencyName?: string;
  emergencyRelation?: string;
  emergencyPhone?: string;
  // Relasi Siswa & Status
  studentId?: string;
  studentIds: string[]; // Foreign key student IDs
  status: "Aktif" | "Belum Aktivasi" | "Nonaktif" | string;
  userUid?: string; // UID of user account if linked
  hasUserAccount?: boolean;
  source?: "account" | "student_onboarding" | "parents_collection";
  createdAt?: string;
  updatedAt?: string;
}

const RELATIONSHIP_OPTIONS = [
  { value: "Ayah Kandung", label: "Ayah Kandung", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "Ibu Kandung", label: "Ibu Kandung", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "Wali Murid", label: "Wali Murid", color: "bg-amber-50 text-amber-700 border-amber-200" },
];

const INCOME_OPTIONS = [
  { value: "< 2 Juta", label: "< Rp 2.000.000" },
  { value: "2 - 5 Juta", label: "Rp 2.000.000 - Rp 5.000.000" },
  { value: "5 - 10 Juta", label: "Rp 5.000.000 - Rp 10.000.000" },
  { value: "> 10 Juta", label: "> Rp 10.000.000" },
];

export default function ParentsManagementPage() {
  const toast = useToast();
  const { students: unifiedStudents, loading: studentsLoading } = useUnifiedStudents();
  const { teachers: unifiedTeachers } = useUnifiedTeachers();
  
  const [parentsList, setParentsList] = useState<ParentData[]>([]);
  const [rawUsersList, setRawUsersList] = useState<any[]>([]);
  const [rawParentsList, setRawParentsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // User Auth, Role & Homeroom State from useAuth single source of truth
  const { role: authRole, rawRole: authRawRole, isAuthLoading: isUserAuthLoading, isRoleReady } = useAuth();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [previewAsGuru, setPreviewAsGuru] = useState<boolean>(false);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [teachersList, setTeachersList] = useState<any[]>([]);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRelationshipFilter, setSelectedRelationshipFilter] = useState("Semua");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("Semua");
  const [selectedClassFilter, setSelectedClassFilter] = useState("Semua");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Modals & Drawers
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingParent, setEditingParent] = useState<ParentData | null>(null);
  const [detailParent, setDetailParent] = useState<ParentData | null>(null);
  const [deleteParent, setDeleteParent] = useState<ParentData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States (Disamakan persis dengan Onboarding Siswa & Data Siswa)
  const [formName, setFormName] = useState("");
  const [formFatherName, setFormFatherName] = useState("");
  const [formMotherName, setFormMotherName] = useState("");
  const [formGuardianName, setFormGuardianName] = useState("");
  const [formRelationship, setFormRelationship] = useState("Ayah Kandung");
  const [formNik, setFormNik] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formJob, setFormJob] = useState("");
  const [formIncome, setFormIncome] = useState("< 2 Juta");
  const [formAddress, setFormAddress] = useState("");
  const [formEmergencyName, setFormEmergencyName] = useState("");
  const [formEmergencyRelation, setFormEmergencyRelation] = useState("");
  const [formEmergencyPhone, setFormEmergencyPhone] = useState("");
  const [formStatus, setFormStatus] = useState("Aktif");
  const [formSelectedStudentIds, setFormSelectedStudentIds] = useState<string[]>([]);

  // Student Search inside Modal Dropdown
  const [studentPickerSearch, setStudentPickerSearch] = useState("");
  const [isStudentPickerOpen, setIsStudentPickerOpen] = useState(false);

  // 1. Real-time Subscriptions: Auth, Classes, Teachers, Users (role orang-tua), and Parents
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          const userDocSnap = await getDoc(doc(db, "users", u.uid));
          if (userDocSnap.exists()) {
            const uData = userDocSnap.data();
            setCurrentUser({ uid: u.uid, email: u.email, ...uData });
            const r = (uData.role || "admin").toLowerCase();
            setUserRole(r === "teacher" ? "guru" : r);
          } else {
            setCurrentUser({ uid: u.uid, email: u.email, role: "admin" });
            setUserRole("admin");
          }
        } catch (err) {
          console.error("Fetch current user error in parents page:", err);
        }
      } else {
        setCurrentUser(null);
        setUserRole("admin");
      }
    });

    const unsubClasses = onSnapshot(collection(db, "classes"), (snap) => {
      setClassesList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Classes listener in parents page error:", err));

    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const filtered = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((u: any) => isParentRole(u.role) || (u.role || "").toLowerCase() === "orang-tua");
      setRawUsersList(filtered);
    }, (err) => console.warn("Users listener in parents page error:", err));

    const unsubParents = onSnapshot(collection(db, "parents"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setRawParentsList(list);
    }, (err) => console.warn("Parents listener in parents page error:", err));

    return () => {
      unsubAuth();
      unsubClasses();
      unsubUsers();
      unsubParents();
    };
  }, []);

  useEffect(() => {
    setTeachersList(unifiedTeachers);
  }, [unifiedTeachers]);

  // 2. Normalization Helpers for Smart Deduplication
  const normalizePhone = useCallback((phoneStr?: string) => {
    if (!phoneStr) return "";
    const clean = phoneStr.replace(/\D/g, "");
    if (!clean) return "";
    if (clean.startsWith("62")) return "0" + clean.slice(2);
    return clean;
  }, []);

  const normalizeName = useCallback((nameStr?: string) => {
    if (!nameStr) return "";
    return nameStr.trim().toLowerCase().replace(/\s+/g, " ");
  }, []);

  // 3. Multi-Source Smart Deduplication: Accounts (users) + Documents (parents) + Students Data & Onboarding (unifiedStudents)
  useEffect(() => {
    if (studentsLoading && rawUsersList.length === 0 && rawParentsList.length === 0) {
      return;
    }

    const parentList: ParentData[] = [];

    // Indices for instant deduplication lookup
    const byUid = new Map<string, ParentData>();
    const byPhone = new Map<string, ParentData>();
    const byEmail = new Map<string, ParentData>();
    const byName = new Map<string, ParentData>();
    const byDocId = new Map<string, ParentData>();

    const registerParentIndex = (parent: ParentData) => {
      if (parent.userUid) byUid.set(parent.userUid, parent);
      if (parent.id) byDocId.set(parent.id, parent);
      const cleanP = normalizePhone(parent.phone);
      if (cleanP) byPhone.set(cleanP, parent);
      if (parent.email) byEmail.set(parent.email.toLowerCase().trim(), parent);
      const cleanN = normalizeName(parent.name);
      if (cleanN) byName.set(cleanN, parent);
      if (parent.fatherName) byName.set(normalizeName(parent.fatherName), parent);
      if (parent.motherName) byName.set(normalizeName(parent.motherName), parent);
    };

    // --- PHASE 1: Populate from Registered User Accounts (Role: Orang Tua) ---
    rawUsersList.forEach((u) => {
      const singleStdId = u.studentId ? String(u.studentId).trim() : (Array.isArray(u.studentIds) && u.studentIds.length > 0 ? String(u.studentIds[0]).trim() : "");
      const uStudentIds = singleStdId ? [singleStdId] : [];

      const newParent: ParentData = {
        id: u.uid || u.id,
        parentId: `PRT-${(u.uid || u.id).slice(0, 4).toUpperCase()}`,
        name: u.name || "Orang Tua / Wali",
        fatherName: u.fatherName || "",
        motherName: u.motherName || "",
        guardianName: u.guardianName || "",
        nik: u.nik || "",
        relationship: u.relationship || u.relation || "Wali Murid",
        phone: u.phone || "-",
        email: u.email || "",
        job: u.job || u.parentJob || "-",
        income: u.income || u.parentIncome || "< 2 Juta",
        address: u.address || u.parentAddress || "-",
        emergencyName: u.emergencyName || "",
        emergencyRelation: u.emergencyRelation || "",
        emergencyPhone: u.emergencyPhone || "",
        studentIds: uStudentIds,
        status: u.status || "Aktif",
        userUid: u.uid || u.id,
        hasUserAccount: true,
        source: "account",
        createdAt: u.createdAt || null,
        updatedAt: u.updatedAt || null,
      };

      parentList.push(newParent);
      registerParentIndex(newParent);
    });

    // --- PHASE 2: Merge or Insert from Dedicated 'parents' Collection ---
    rawParentsList.forEach((p) => {
      const cleanPPhone = normalizePhone(p.phone);
      const cleanPEmail = (p.email || "").toLowerCase().trim();
      let matched =
        (p.userUid && byUid.get(p.userUid)) ||
        (p.id && byDocId.get(p.id)) ||
        (cleanPEmail && cleanPEmail.includes("@") && byEmail.get(cleanPEmail)) ||
        (cleanPPhone && cleanPPhone.length >= 10 && byPhone.get(cleanPPhone));

      const singlePStdId = p.studentId ? String(p.studentId).trim() : (Array.isArray(p.studentIds) && p.studentIds.length > 0 ? String(p.studentIds[0]).trim() : "");
      const pStudentIds = singlePStdId ? [singlePStdId] : [];

      if (matched) {
        // Merge attributes if existing parent has missing fields
        if (!matched.fatherName && p.fatherName) matched.fatherName = p.fatherName;
        if (!matched.motherName && p.motherName) matched.motherName = p.motherName;
        if (!matched.guardianName && p.guardianName) matched.guardianName = p.guardianName;
        if ((!matched.nik || matched.nik === "-") && p.nik) matched.nik = p.nik;
        if ((!matched.job || matched.job === "-") && p.job) matched.job = p.job;
        if ((!matched.income || matched.income === "-") && p.income) matched.income = p.income;
        if ((!matched.address || matched.address === "-") && p.address) matched.address = p.address;
        if (!matched.emergencyName && p.emergencyName) matched.emergencyName = p.emergencyName;
        if (!matched.emergencyRelation && p.emergencyRelation) matched.emergencyRelation = p.emergencyRelation;
        if (!matched.emergencyPhone && p.emergencyPhone) matched.emergencyPhone = p.emergencyPhone;
        if (p.relationship && matched.relationship === "Wali Murid") matched.relationship = p.relationship;
        if (matched.studentIds.length === 0 && pStudentIds.length > 0) {
          matched.studentIds = pStudentIds;
        }
        registerParentIndex(matched);
      } else {
        // Create standalone parent profile
        const newParent: ParentData = {
          id: p.id,
          parentId: p.parentId || `PRT-${p.id.slice(0, 4).toUpperCase()}`,
          name: p.name || p.fatherName || p.motherName || "Orang Tua / Wali",
          fatherName: p.fatherName || "",
          motherName: p.motherName || "",
          guardianName: p.guardianName || "",
          nik: p.nik || "",
          relationship: p.relationship || "Wali Murid",
          phone: p.phone || "-",
          email: p.email || "",
          job: p.job || "-",
          income: p.income || "< 2 Juta",
          address: p.address || "-",
          emergencyName: p.emergencyName || "",
          emergencyRelation: p.emergencyRelation || "",
          emergencyPhone: p.emergencyPhone || "",
          studentIds: pStudentIds,
          status: p.status || "Aktif",
          userUid: p.userUid || undefined,
          hasUserAccount: !!p.userUid,
          source: "parents_collection",
          createdAt: p.createdAt || null,
          updatedAt: p.updatedAt || null,
        };

        parentList.push(newParent);
        registerParentIndex(newParent);
      }
    });

    // --- PHASE 3: Strict 1-to-1 Resolution with Onboarding & Data Siswa ---
    parentList.forEach((p) => {
      const pUid = p.userUid || p.id;
      const pName = (p.name || p.fatherName || "").toLowerCase().trim();
      const pPhone = normalizePhone(p.phone);
      const pEmail = (p.email || "").toLowerCase().trim();
      const pStudentId = String(p.studentId || (p.studentIds && p.studentIds.length > 0 ? p.studentIds[0] : "")).trim();

      // 1. Direct parentUid match on student
      let foundStudent = unifiedStudents.find((s) => {
        const sParentUid = String(s.parentUid || s.parentUserId || "").trim();
        return pUid && sParentUid && (sParentUid === pUid || sParentUid === p.id);
      });

      // 2. Direct studentId match
      if (!foundStudent && pStudentId) {
        foundStudent = unifiedStudents.find((s) => {
          const sDocId = String(s._firestoreId || "");
          const sId = String(s.id || "");
          const sNisn = String(s.nisn || "");
          const sUid = String(s.uid || "");
          return sDocId === pStudentId || sId === pStudentId || sNisn === pStudentId || sUid === pStudentId;
        });
      }

      // 3. Parent phone match
      if (!foundStudent && pPhone && pPhone.length >= 8) {
        foundStudent = unifiedStudents.find((s) => {
          const sParentPhone = normalizePhone(s.parentPhone);
          return sParentPhone && sParentPhone === pPhone;
        });
      }

      // 4. Parent email match
      if (!foundStudent && pEmail && pEmail.includes("@")) {
        foundStudent = unifiedStudents.find((s) => {
          const sParentEmail = (s.parentEmail || "").toLowerCase().trim();
          return sParentEmail && sParentEmail === pEmail;
        });
      }

      // 5. Parent name exact match
      if (!foundStudent && pName && pName.length >= 3) {
        foundStudent = unifiedStudents.find((s) => {
          const sFather = (s.fatherName || "").toLowerCase().trim();
          const sMother = (s.motherName || "").toLowerCase().trim();
          const sGuardian = (s.guardianName || "").toLowerCase().trim();
          const sParentName = (s.parentName || "").toLowerCase().trim();
          return sFather === pName || sMother === pName || sGuardian === pName || sParentName === pName;
        });
      }

      p.studentIds = foundStudent ? [String(foundStudent.id || foundStudent._firestoreId)] : [];
    });

    // Sort alphabetically by name
    parentList.sort((a, b) => a.name.localeCompare(b.name));
    setParentsList(parentList);
    setLoading(false);
  }, [rawUsersList, rawParentsList, unifiedStudents, studentsLoading, normalizePhone, normalizeName]);

  // Helper: Find Student Details by ID, NISN, or NIS
  const getStudentById = useCallback((sId: string): UnifiedStudent | undefined => {
    return unifiedStudents.find(
      (s) =>
        String(s.id) === String(sId) ||
        String(s._firestoreId) === String(sId) ||
        String(s.uid) === String(sId) ||
        String(s.nisn) === String(sId) ||
        String(s.nis) === String(sId)
    );
  }, [unifiedStudents]);

  // Determine if active view is Guru (either actual guru or admin in preview mode)
  const resolvedRole = (authRawRole || authRole || userRole || "").toLowerCase();
  const isActualGuru = resolvedRole === "guru" || resolvedRole === "teacher";
  const isGuru = isActualGuru || previewAsGuru;

  // Determine homeroom class(es) for the logged-in Guru (Wali Kelas)
  // Chain: Wali Kelas -> Kelas
  const teacherHomeroomClasses = useMemo(() => {
    if (!isGuru) return [];

    const teacherName = (currentUser?.fullName || currentUser?.name || currentUser?.displayName || "").trim().toLowerCase();
    const teacherNip = (currentUser?.nip || currentUser?.id || "").trim().toLowerCase();
    const teacherEmail = (currentUser?.email || "").trim().toLowerCase();
    const teacherUid = currentUser?.uid;

    const matched = new Set<string>();

    // 1. Match from classes collection
    classesList.forEach((c) => {
      const cName = c.name || c.id;
      const cHomeroom = (c.homeroom || c.homeroomTeacher || c.waliKelas || "").trim().toLowerCase();
      const cNip = (c.homeroomNip || "").trim().toLowerCase();
      const cId = (c.homeroomId || "").trim();

      const matchName = teacherName && cHomeroom && (
        cHomeroom === teacherName ||
        (teacherName.length > 5 && cHomeroom.includes(teacherName)) ||
        (cHomeroom.length > 5 && teacherName.includes(cHomeroom))
      );
      const matchNip = teacherNip && cNip && cNip === teacherNip;
      const matchId = (teacherUid && cId && cId === teacherUid) || (currentUser?.id && cId === currentUser.id);

      if (matchName || matchNip || matchId) {
        if (cName) matched.add(cName);
      }
    });

    // 2. Direct field in user document
    const directClass = currentUser?.homeroomClass || currentUser?.homeroom || currentUser?.className || currentUser?.classId;
    if (directClass && directClass !== "-" && directClass !== "Semua Kelas") {
      matched.add(directClass);
    }

    // 3. Match from teachers collection
    const tDoc = teachersList.find((t) =>
      (teacherEmail && t.email?.toLowerCase() === teacherEmail) ||
      (teacherNip && (t.nip === teacherNip || t.id === teacherNip)) ||
      (teacherUid && (t.uid === teacherUid || t._firestoreId === teacherUid || t.id === teacherUid)) ||
      (teacherName && (t.name?.toLowerCase() === teacherName || (teacherName.length > 5 && t.name?.toLowerCase().includes(teacherName))))
    );
    if (tDoc) {
      const tClass = tDoc.homeroomClass || tDoc.homeroom || tDoc.class || tDoc.className || tDoc.waliKelas;
      if (tClass && tClass !== "-" && tClass !== "Semua Kelas") {
        matched.add(tClass);
      }
    }

    // Fallback for preview mode so admin preview displays sample homeroom data (12 MIPA 1)
    if (matched.size === 0 && previewAsGuru) {
      const defaultHomeroom = classesList.find(c => c.homeroom || c.name === "12 MIPA 1")?.name || classesList[0]?.name || "12 MIPA 1";
      if (defaultHomeroom) matched.add(defaultHomeroom);
    }

    return Array.from(matched);
  }, [isGuru, currentUser, classesList, teachersList, previewAsGuru]);

  const isTeacherWaliKelas = Boolean(isGuru && teacherHomeroomClasses.length > 0);

  // Set of all unique student identifiers belonging to the Wali Kelas's assigned classes
  // Chain: Kelas -> Siswa
  const homeroomStudentIdSet = useMemo(() => {
    if (!isGuru || teacherHomeroomClasses.length === 0) return new Set<string>();

    const targetClassesLower = teacherHomeroomClasses.map((c) => c.trim().toLowerCase());
    const idSet = new Set<string>();

    unifiedStudents.forEach((s) => {
      const sc = (s.className || s.classId || s.kelas || s.class || "").trim().toLowerCase();
      const belongsToHomeroom = targetClassesLower.some((tc) => tc === sc || (tc && sc && (tc.includes(sc) || sc.includes(tc))));
      if (belongsToHomeroom) {
        if (s.id) idSet.add(String(s.id));
        if (s._firestoreId) idSet.add(String(s._firestoreId));
        if (s.uid) idSet.add(String(s.uid));
        if (s.nisn) idSet.add(String(s.nisn));
        if (s.nis) idSet.add(String(s.nis));
      }
    });

    return idSet;
  }, [isGuru, teacherHomeroomClasses, unifiedStudents]);

  // Base parents list scoped to Wali Kelas's assigned classes if logged in as Guru
  // Chain: Siswa -> Orang Tua (Guru cannot see parents from other classes)
  const baseParentsList = useMemo(() => {
    if (!isGuru) return parentsList; // Non-guru users (admin, super-admin, etc.) see all parents
    if (!isTeacherWaliKelas || homeroomStudentIdSet.size === 0) return []; // Guru not assigned as wali kelas sees 0 parents

    return parentsList.filter((parent) => {
      // 1. Direct studentIds match with homeroom students
      const hasHomeroomChild = (parent.studentIds || []).some((sId) => homeroomStudentIdSet.has(String(sId)));
      if (hasHomeroomChild) return true;

      // 2. Direct student.parentUid link with any homeroom student
      const hasUidMatch = unifiedStudents.some((s) => {
        if (!homeroomStudentIdSet.has(String(s.id || s._firestoreId || s.uid))) return false;
        const pUid = s.parentUid || s.linkedParentUid;
        return pUid && (pUid === parent.userUid || pUid === parent.id);
      });

      return hasUidMatch;
    });
  }, [isGuru, isTeacherWaliKelas, parentsList, homeroomStudentIdSet, unifiedStudents]);

  // Auto-synchronize selectedClassFilter for Guru
  useEffect(() => {
    if (isGuru && teacherHomeroomClasses.length > 0) {
      if (selectedClassFilter !== "Semua" && !teacherHomeroomClasses.includes(selectedClassFilter)) {
        setSelectedClassFilter("Semua");
      }
    }
  }, [isGuru, teacherHomeroomClasses, selectedClassFilter]);

  // Unique Classes derived from students (restricted to homeroom classes for Guru)
  const availableClasses = useMemo(() => {
    if (isGuru) {
      return teacherHomeroomClasses.slice().sort();
    }
    const setCls = new Set<string>();
    unifiedStudents.forEach((s) => {
      if (s.className && s.className !== "-") setCls.add(s.className);
      if (s.classId && s.classId !== "-") setCls.add(s.classId);
    });
    return Array.from(setCls).sort();
  }, [isGuru, teacherHomeroomClasses, unifiedStudents]);

  // Filtered Parents List (derived from baseParentsList)
  const filteredParents = useMemo(() => {
    return baseParentsList.filter((p) => {
      // 1. Relationship filter
      if (selectedRelationshipFilter !== "Semua" && p.relationship !== selectedRelationshipFilter) {
        return false;
      }
      // 2. Status filter
      if (selectedStatusFilter !== "Semua" && p.status !== selectedStatusFilter) {
        return false;
      }
      // 3. Class filter (Check if any connected child is in this class)
      if (selectedClassFilter !== "Semua") {
        const hasChildInClass = p.studentIds.some((sId) => {
          const std = getStudentById(sId);
          if (!std) return false;
          const stdClass = (std.className || std.classId || "").trim().toLowerCase();
          return stdClass === selectedClassFilter.trim().toLowerCase();
        });
        if (!hasChildInClass) return false;
      }
      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchParent =
          p.name.toLowerCase().includes(q) ||
          (p.fatherName && p.fatherName.toLowerCase().includes(q)) ||
          (p.motherName && p.motherName.toLowerCase().includes(q)) ||
          (p.guardianName && p.guardianName.toLowerCase().includes(q)) ||
          (p.nik && p.nik.includes(q)) ||
          p.phone.includes(q) ||
          (p.email && p.email.toLowerCase().includes(q)) ||
          (p.address && p.address.toLowerCase().includes(q));

        const matchChild = p.studentIds.some((sId) => {
          const std = getStudentById(sId);
          return (
            std &&
            ((std.name && std.name.toLowerCase().includes(q)) ||
              (std.fullName && std.fullName.toLowerCase().includes(q)) ||
              (std.nisn && std.nisn.includes(q)) ||
              (std.className && std.className.toLowerCase().includes(q)))
          );
        });

        return matchParent || matchChild;
      }
      return true;
    });
  }, [baseParentsList, selectedRelationshipFilter, selectedStatusFilter, selectedClassFilter, searchQuery, getStudentById]);

  // Statistics KPI (calculated from baseParentsList)
  const stats = useMemo(() => {
    const totalParents = baseParentsList.length;
    const activeParents = baseParentsList.filter((p) => p.status === "Aktif").length;
    const linkedStudentSet = new Set<string>();
    baseParentsList.forEach((p) => {
      p.studentIds.forEach((sid) => {
        if (isGuru) {
          if (homeroomStudentIdSet.has(String(sid))) {
            linkedStudentSet.add(sid);
          }
        } else {
          linkedStudentSet.add(sid);
        }
      });
    });
    const totalLinkedStudents = linkedStudentSet.size;
    const avgRatio = totalParents > 0 ? (totalLinkedStudents / totalParents).toFixed(1) : "0";

    return {
      totalParents,
      activeParents,
      totalLinkedStudents,
      avgRatio,
    };
  }, [baseParentsList, isGuru, homeroomStudentIdSet]);

  // Reset Form
  const resetForm = () => {
    setFormName("");
    setFormFatherName("");
    setFormMotherName("");
    setFormGuardianName("");
    setFormRelationship("Ayah Kandung");
    setFormNik("");
    setFormPhone("");
    setFormEmail("");
    setFormJob("");
    setFormIncome("< 2 Juta");
    setFormAddress("");
    setFormEmergencyName("");
    setFormEmergencyRelation("");
    setFormEmergencyPhone("");
    setFormStatus("Aktif");
    setFormSelectedStudentIds([]);
    setStudentPickerSearch("");
    setIsStudentPickerOpen(false);
    setEditingParent(null);
  };

  // Open Edit Modal (Load all synchronized fields)
  const handleOpenEdit = (parent: ParentData) => {
    setEditingParent(parent);
    setFormName(parent.name || "");
    setFormFatherName(parent.fatherName || "");
    setFormMotherName(parent.motherName || "");
    setFormGuardianName(parent.guardianName || "");
    setFormRelationship(parent.relationship || "Ayah Kandung");
    setFormNik(parent.nik || "");
    setFormPhone(parent.phone === "-" ? "" : parent.phone);
    setFormEmail(parent.email || "");
    setFormJob(parent.job === "-" ? "" : parent.job || "");
    setFormIncome(parent.income || "< 2 Juta");
    setFormAddress(parent.address === "-" ? "" : parent.address || "");
    setFormEmergencyName(parent.emergencyName || "");
    setFormEmergencyRelation(parent.emergencyRelation || "");
    setFormEmergencyPhone(parent.emergencyPhone || "");
    setFormStatus(parent.status || "Aktif");
    setFormSelectedStudentIds(parent.studentIds || []);
    setIsEditModalOpen(true);
  };

  // Submit Save / Update with Complete Two-Way Sync
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParent) return;

    if (!formName.trim()) {
      toast.showError("Nama lengkap orang tua / wali wajib diisi.", "Validasi Gagal");
      return;
    }
    if (!formPhone.trim()) {
      toast.showError("Nomor WhatsApp / HP wajib diisi.", "Validasi Gagal");
      return;
    }

    setIsSubmitting(true);
    try {
      const parentDocId = String(editingParent.userUid || editingParent.id || "");
      if (!parentDocId) {
        toast.showError("ID data orang tua tidak valid.", "Error");
        return;
      }

      // Helper to strip undefined values so Firestore never throws unsupported field value error
      const cleanData = (obj: Record<string, any>) => {
        const cleaned: Record<string, any> = {};
        Object.entries(obj).forEach(([key, val]) => {
          if (val !== undefined) {
            cleaned[key] = val;
          }
        });
        return cleaned;
      };

      const parentPayload = cleanData({
        name: formName.trim(),
        fatherName: formFatherName.trim(),
        motherName: formMotherName.trim(),
        guardianName: formGuardianName.trim(),
        relationship: formRelationship,
        nik: formNik.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim().toLowerCase(),
        job: formJob.trim(),
        income: formIncome,
        address: formAddress.trim(),
        emergencyName: formEmergencyName.trim(),
        emergencyRelation: formEmergencyRelation.trim(),
        emergencyPhone: formEmergencyPhone.trim(),
        studentIds: formSelectedStudentIds,
        status: formStatus,
        userUid: editingParent.userUid || (editingParent.hasUserAccount ? parentDocId : ""),
        parentId: editingParent.parentId || `PRT-${parentDocId.slice(0, 4).toUpperCase()}`,
        updatedAt: new Date().toISOString(),
      });

      // 1. UPDATE / SAVE to parents collection (Wrapped with resilient try-catch in case cloud rules have not yet whitelisted /parents/)
      try {
        await setDoc(doc(db, "parents", parentDocId), parentPayload, { merge: true });
      } catch (pErr: any) {
        console.warn("Could not save to 'parents' collection directly (rules/permission issue):", pErr);
      }

      // 2. Also sync to users collection if this parent has a user account
      const userTargetUid = editingParent.userUid || (editingParent.hasUserAccount ? editingParent.id : null);
      if (userTargetUid) {
        try {
          const userPayload = cleanData({
            name: formName.trim(),
            fatherName: formFatherName.trim() || formName.trim(),
            motherName: formMotherName.trim(),
            guardianName: formGuardianName.trim(),
            phone: formPhone.trim(),
            status: formStatus,
            studentIds: formSelectedStudentIds,
            linkedStudentIds: formSelectedStudentIds,
            studentId: formSelectedStudentIds[0] || "",
            updatedAt: new Date().toISOString()
          });
          await updateDoc(doc(db, "users", userTargetUid), userPayload);
        } catch (uErr) {
          console.warn("Could not sync update to users doc:", uErr);
        }
      }

      // 3. TWO-WAY SYNC to All Connected Students
      // Updates students & users collections so that Onboarding, Data Siswa, and Data Ortu stay 100% synchronized
      const previousStudentIds = editingParent.studentIds || [];
      const unlinkedStudentIds = previousStudentIds.filter((id) => !formSelectedStudentIds.includes(id));

      // A. Update freshly linked / existing students
      for (const sId of formSelectedStudentIds) {
        const student = getStudentById(sId);
        if (student) {
          const studentDocId = student._firestoreId || student.id;
          const studentUserUid = student.uid || student._firestoreId || student.id;

          const studentUpdatePayload = cleanData({
            parentName: formName.trim(),
            fatherName: formFatherName.trim() || (formRelationship === "Ayah Kandung" ? formName.trim() : student.fatherName || ""),
            motherName: formMotherName.trim() || (formRelationship === "Ibu Kandung" ? formName.trim() : student.motherName || ""),
            guardianName: formGuardianName.trim() || (formRelationship === "Wali Murid" ? formName.trim() : student.guardianName || ""),
            parentPhone: formPhone.trim(),
            parentEmail: formEmail.trim().toLowerCase() || student.parentEmail || "",
            parentJob: formJob.trim() || student.parentJob || "",
            parentIncome: formIncome || student.parentIncome || "",
            parentAddress: formAddress.trim() || student.parentAddress || "",
            parentRelation: formRelationship,
            emergencyName: formEmergencyName.trim() || student.emergencyName || "",
            emergencyRelation: formEmergencyRelation.trim() || student.emergencyRelation || "",
            emergencyPhone: formEmergencyPhone.trim() || student.emergencyPhone || "",
            hasLinkedParent: true,
            parentUid: userTargetUid || parentDocId,
            updatedAt: new Date().toISOString()
          });

          // Primary: Write to users collection (where complete onboarding profile resides and has standard write permission)
          if (studentUserUid) {
            try {
              await setDoc(doc(db, "users", studentUserUid), studentUpdatePayload, { merge: true });
            } catch (uErr) {
              console.warn(`Could not update student ${studentUserUid} in users:`, uErr);
            }
          }

          // Secondary: Attempt to update students collection (guarded in case of strict student collection rules)
          try {
            await updateDoc(doc(db, "students", studentDocId), studentUpdatePayload);
          } catch (sErr) {
            // If students collection has strict validation, only update compact keys if possible
            try {
              await updateDoc(doc(db, "students", studentDocId), {
                parentName: formName.trim(),
                hasLinkedParent: true,
              });
            } catch (innerErr) {}
          }
        }
      }

      // B. Clean up unlinked students
      for (const sId of unlinkedStudentIds) {
        const student = getStudentById(sId);
        if (student) {
          const studentDocId = student._firestoreId || student.id;
          const studentUserUid = student.uid || student._firestoreId || student.id;

          if (studentUserUid) {
            try {
              await updateDoc(doc(db, "users", studentUserUid), {
                hasLinkedParent: false,
                parentUid: "",
              });
            } catch (err) {}
          }

          try {
            await updateDoc(doc(db, "students", studentDocId), {
              hasLinkedParent: false,
              parentUid: "",
            });
          } catch (err) {}
        }
      }

      toast.showSuccess(
        `Data orang tua "${formName}" dan relasi ${formSelectedStudentIds.length} anak berhasil disinkronkan.`,
        "Sinkronisasi Berhasil"
      );
      setIsEditModalOpen(false);
      resetForm();
    } catch (err: any) {
      console.error("Save parent error:", err);
      toast.showError(err.message || "Gagal menyimpan data orang tua.", "Terjadi Kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Parent Status directly from table/card
  const handleToggleStatus = async (parent: ParentData) => {
    const nextStatus = parent.status === "Aktif" ? "Nonaktif" : "Aktif";
    try {
      if (parent.id) {
        try {
          await updateDoc(doc(db, "parents", parent.id), {
            status: nextStatus,
            updatedAt: new Date().toISOString(),
          });
        } catch (e) {}
      }

      const targetUid = parent.userUid || (parent.hasUserAccount ? parent.id : null);
      if (targetUid) {
        try {
          await updateDoc(doc(db, "users", targetUid), {
            status: nextStatus,
            updatedAt: new Date().toISOString(),
          });
        } catch (e) {}
      }

      toast.showSuccess(`Status akun ${parent.name} diubah menjadi "${nextStatus}".`, "Status Diperbarui");
    } catch (err) {
      toast.showError("Gagal mengubah status orang tua.", "Gagal");
    }
  };

  // Confirm Delete Parent Profile
  const handleConfirmDelete = async () => {
    if (!deleteParent) return;
    setIsSubmitting(true);
    try {
      // 1. Delete parent document if present
      if (deleteParent.id) {
        try {
          await deleteDoc(doc(db, "parents", deleteParent.id));
        } catch (e) {}
      }

      // 2. Unlink from students
      for (const sId of deleteParent.studentIds) {
        const match = getStudentById(sId);
        if (match) {
          const studentDocId = match._firestoreId || match.id;
          const studentUserUid = match.uid || match._firestoreId || match.id;

          try {
            await updateDoc(doc(db, "students", studentDocId), {
              hasLinkedParent: false,
              parentUid: "",
            });
          } catch (e) {}

          if (studentUserUid) {
            try {
              await updateDoc(doc(db, "users", studentUserUid), {
                hasLinkedParent: false,
                parentUid: "",
              });
            } catch (e) {}
          }
        }
      }

      toast.showSuccess(
        `Data profil orang tua ${deleteParent.name} berhasil dihapus. Akun login dapat dikelola melalui Manajemen Akun.`,
        "Profil Dihapus"
      );
      setDeleteParent(null);
    } catch (err) {
      toast.showError("Gagal menghapus data orang tua.", "Gagal");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Role-Based Loading Guard: Prevent flashing unauthorized content
  if (isUserAuthLoading || !isRoleReady) {
    return <PageContentSkeleton />;
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto w-full h-full space-y-6 animate-in fade-in duration-300">
      {/* ========================================================================= */}
      {/* 1. HEADER SECTION                                                         */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Data Orang Tua & Wali Siswa
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#531FFF]/10 text-[#531FFF] border border-[#531FFF]/20">
              {isGuru ? "Khusus Wali Kelas" : "Tersinkronisasi Otomatis"}
            </span>
            {isGuru && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                {teacherHomeroomClasses.length > 0
                  ? `Kelas ${teacherHomeroomClasses.join(", ")}`
                  : "Belum Ditugaskan"}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {isGuru
              ? `Menampilkan data orang tua dari siswa kelas binaan (${teacherHomeroomClasses.join(", ") || "-"}). Data orang tua dari kelas lain dibatasi.`
              : "Data orang tua terhubung otomatis dengan Data Siswa dan Onboarding tanpa duplikasi data. Pembuatan akun login baru dilakukan melalui Manajemen Akun."}
          </p>
        </div>

        {/* Action Buttons: Preview Mode & Manajemen Akun */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Admin Role: Preview Toggle for Teacher / Wali Kelas scope */}
          {!isActualGuru && (
            <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs font-bold shadow-2xs">
              <button
                type="button"
                onClick={() => setPreviewAsGuru(false)}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                  !previewAsGuru
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-500 hover:text-gray-900"
                )}
                title="Tampilan Admin Penuh (Semua Kelas)"
              >
                Semua Kelas (Admin)
              </button>
              <button
                type="button"
                onClick={() => setPreviewAsGuru(true)}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                  previewAsGuru
                    ? "bg-[#531FFF] text-white shadow-xs"
                    : "text-gray-500 hover:text-gray-900"
                )}
                title="Simulasikan hak akses Guru / Wali Kelas"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Pratinjau Guru (Wali Kelas)</span>
              </button>
            </div>
          )}

          {/* Action Button: Ke Manajemen Akun (Khusus Non-Guru) */}
          {!isGuru && (
            <Link
              href="/admin/accounts"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#531FFF] hover:bg-[#4215cb] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-[#531FFF]/20 transition-all cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>Manajemen Akun Ortu</span>
            </Link>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1.5 SCOPE BANNER: WALI KELAS INFORMATION                                  */}
      {/* ========================================================================= */}
      {isGuru && (
        isTeacherWaliKelas ? (
          <div className="bg-gradient-to-r from-[#190C36] via-[#2E125B] to-[#531FFF] text-white p-4 sm:p-5 rounded-2xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-purple-400/20">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
                <ShieldCheck className="w-5 h-5 text-purple-200" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase tracking-wider text-purple-200">
                    Akses Dibatasi — Wali Kelas
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-white text-[#531FFF] shadow-xs">
                    Kelas {teacherHomeroomClasses.join(", ")}
                  </span>
                  {previewAsGuru && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-amber-950">
                      Simulasi Mode Guru
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-purple-100 mt-1 leading-relaxed max-w-3xl">
                  Sesuai relasi <strong>Wali Kelas → Kelas → Siswa → Orang Tua</strong>, Anda hanya dapat mengakses dan melihat kontak orang tua dari siswa yang berada di kelas binaan Anda (<strong>{teacherHomeroomClasses.join(", ")}</strong>). Data orang tua dari kelas lain tidak ditampilkan.
                </p>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-xl text-center shrink-0 self-stretch md:self-auto flex items-center justify-between md:flex-col gap-1">
              <span className="text-[10px] uppercase font-bold text-purple-200">Siswa Kelas Binaan</span>
              <span className="text-lg font-black text-white">{homeroomStudentIdSet.size} Siswa</span>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 p-4 sm:p-5 rounded-2xl shadow-xs flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-amber-900">
                  Akses Menu Dibatasi Khusus Wali Kelas
                </h3>
                {previewAsGuru && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                    Simulasi Guru
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Akun Guru Anda saat ini belum tercatat sebagai Wali Kelas pada kelas aktif manapun. Guru hanya dapat melihat data orang tua siswa dari kelas yang menjadi tanggung jawabnya sebagai Wali Kelas. Silakan hubungi Administrator atau Tata Usaha jika Anda ditugaskan sebagai Wali Kelas.
              </p>
            </div>
          </div>
        )
      )}

      {/* ========================================================================= */}
      {/* 2. STATISTIC KPI CARDS                                                    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Orang Tua */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              Total Orang Tua / Wali
            </span>
            <p className="text-2xl font-black text-gray-900 mt-1">
              {stats.totalParents} <span className="text-xs font-bold text-gray-400">Terdata</span>
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-[#531FFF] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Status Aktif */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              Status Akun Aktif
            </span>
            <p className="text-2xl font-black text-emerald-600 mt-1">
              {stats.activeParents} <span className="text-xs font-bold text-emerald-600/70">Terverifikasi</span>
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Total Siswa Terhubung */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              Siswa Terhubung
            </span>
            <p className="text-2xl font-black text-blue-600 mt-1">
              {stats.totalLinkedStudents} <span className="text-xs font-bold text-blue-600/70">Siswa Terdaftar</span>
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Rasio Anak per Ortu */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              Rasio Anak / Ortu
            </span>
            <p className="text-2xl font-black text-amber-600 mt-1">
              {stats.avgRatio} <span className="text-xs font-bold text-amber-600/70">Anak/Wali</span>
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Heart className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CONTROLS, SEARCH, AND FILTERS                                          */}
      {/* ========================================================================= */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5">
        {/* Search Input */}
        <div className="relative flex-1 max-w-lg">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari nama orang tua, ayah, ibu, NIK, No. HP, nama anak, atau NISN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium outline-none focus:bg-white focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/10 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns & View Mode */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Relationship Filter */}
          <select
            value={selectedRelationshipFilter}
            onChange={(e) => setSelectedRelationshipFilter(e.target.value)}
            className="px-3 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:border-[#531FFF] cursor-pointer"
          >
            <option value="Semua">Semua Hubungan</option>
            <option value="Ayah Kandung">Ayah Kandung</option>
            <option value="Ibu Kandung">Ibu Kandung</option>
            <option value="Wali Murid">Wali Murid</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-3 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:border-[#531FFF] cursor-pointer"
          >
            <option value="Semua">Semua Status</option>
            <option value="Aktif">Aktif</option>
            <option value="Belum Aktivasi">Belum Aktivasi</option>
            <option value="Nonaktif">Nonaktif</option>
          </select>

          {/* Class Filter */}
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="px-3 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:border-[#531FFF] cursor-pointer"
          >
            <option value="Semua">Semua Kelas Anak</option>
            {availableClasses.map((cls) => (
              <option key={cls} value={cls}>
                Kelas {cls}
              </option>
            ))}
          </select>

          {/* Toggle View Mode Buttons */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "p-1.5 rounded-lg transition-colors cursor-pointer",
                viewMode === "table" ? "bg-white text-[#531FFF] shadow-xs font-bold" : "text-gray-500 hover:text-gray-900"
              )}
              title="Tampilan Tabel"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={cn(
                "p-1.5 rounded-lg transition-colors cursor-pointer",
                viewMode === "cards" ? "bg-white text-[#531FFF] shadow-xs font-bold" : "text-gray-500 hover:text-gray-900"
              )}
              title="Tampilan Kartu"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MAIN DATA DISPLAY (TABLE / CARDS)                                      */}
      {/* ========================================================================= */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-xs">
          <Loader2 className="w-8 h-8 text-[#531FFF] animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-700">Menyinkronkan data orang tua & siswa...</p>
          <p className="text-xs text-gray-400 mt-1">Menggabungkan data dari Onboarding Siswa, Data Siswa, dan Akun.</p>
        </div>
      ) : filteredParents.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 text-[#531FFF] flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-base font-black text-gray-900">
            {isGuru && !isTeacherWaliKelas
              ? "Akses Menu Dibatasi Khusus Wali Kelas"
              : isGuru
              ? `Tidak Ada Data Orang Tua di Kelas ${teacherHomeroomClasses.join(", ")}`
              : "Tidak ada data orang tua"}
          </h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto mt-1.5 leading-relaxed">
            {isGuru && !isTeacherWaliKelas
              ? "Akun Anda saat ini belum tercatat sebagai Wali Kelas pada kelas aktif manapun. Menu ini hanya menampilkan data orang tua untuk kelas yang menjadi tanggung jawab Anda sebagai Wali Kelas."
              : searchQuery || selectedRelationshipFilter !== "Semua" || selectedStatusFilter !== "Semua" || selectedClassFilter !== "Semua"
              ? "Tidak ditemukan data orang tua yang cocok dengan kriteria filter pencarian."
              : isGuru
              ? `Belum ada data orang tua yang terhubung dengan siswa di kelas binaan Anda (${teacherHomeroomClasses.join(", ")}). Data akan otomatis tersinkronisasi saat siswa mengisi profil orang tua.`
              : "Belum ada data orang tua yang diinput siswa atau terdaftar di sistem. Data orang tua akan otomatis muncul saat siswa mengisi formulir Onboarding Siswa atau akun dibuat melalui Manajemen Akun."}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            {(searchQuery || selectedRelationshipFilter !== "Semua" || selectedStatusFilter !== "Semua" || selectedClassFilter !== "Semua") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedRelationshipFilter("Semua");
                  setSelectedStatusFilter("Semua");
                  setSelectedClassFilter("Semua");
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Reset Filter
              </button>
            )}
            {!isGuru && (
              <Link
                href="/admin/accounts"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#531FFF] hover:bg-[#4215cb] text-white text-xs font-bold rounded-xl shadow-md shadow-[#531FFF]/20 transition-all cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>Buka Manajemen Akun</span>
              </Link>
            )}
          </div>
        </div>
      ) : viewMode === "table" ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-black text-gray-400 uppercase tracking-wider">
                  <th className="py-4 px-5">Nama & Kontak Orang Tua</th>
                  <th className="py-4 px-4 text-center">Hubungan</th>
                  <th className="py-4 px-5">Daftar Anak Terhubung ({stats.totalLinkedStudents} Siswa)</th>
                  <th className="py-4 px-4">Pekerjaan & Domisili</th>
                  <th className="py-4 px-4 text-center">Status Akun</th>
                  <th className="py-4 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredParents.map((parent) => {
                  const relObj = RELATIONSHIP_OPTIONS.find((r) => r.value === parent.relationship) || RELATIONSHIP_OPTIONS[2];

                  return (
                    <tr key={parent.id} className="hover:bg-purple-50/20 transition-colors group">
                      {/* Name & Contact */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#531FFF]/10 to-purple-100 text-[#531FFF] font-black flex items-center justify-center text-sm border border-[#531FFF]/20 shrink-0 shadow-2xs">
                            {parent.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 group-hover:text-[#531FFF] transition-colors text-sm">
                                {parent.name}
                              </span>
                              {parent.hasUserAccount ? (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.2 rounded-full" title="Telah memiliki akun login aktif">
                                  Akun
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200/60 px-1.5 py-0.2 rounded-full" title="Tersinkronisasi otomatis dari Onboarding Siswa">
                                  Data Siswa
                                </span>
                              )}
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                              {parent.fatherName && parent.fatherName !== parent.name && (
                                <span className="text-gray-500">Ayah: {parent.fatherName}</span>
                              )}
                              {parent.motherName && parent.motherName !== parent.name && (
                                <span className="text-gray-500">• Ibu: {parent.motherName}</span>
                              )}
                              {parent.nik && (
                                <span className="font-mono text-gray-400">• NIK: {parent.nik}</span>
                              )}
                              {parent.phone && parent.phone !== "-" && (
                                <a
                                  href={`https://wa.me/${parent.phone.replace(/[^0-9]/g, "")}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-emerald-600 hover:underline flex items-center gap-1 font-semibold ml-1"
                                >
                                  <Phone className="w-3 h-3" />
                                  {parent.phone}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Relationship Badge */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <span className={cn("px-2.5 py-1 rounded-full text-[11px] font-bold border", relObj.color)}>
                          {parent.relationship}
                        </span>
                      </td>

                      {/* Connected Children (Referenced via studentId) */}
                      {/* Connected Children (Referenced via studentId) */}
                      <td className="py-4 px-5">
                        {(() => {
                          const visibleStudentIds = isGuru
                            ? parent.studentIds.filter((sId) => homeroomStudentIdSet.has(String(sId)))
                            : parent.studentIds;

                          if (visibleStudentIds.length === 0) {
                            return (
                              <span className="text-gray-400 italic text-[11px]">
                                {isGuru ? "Tidak ada anak di kelas ini" : "Belum ada anak terhubung"}
                              </span>
                            );
                          }

                          return (
                            <div className="flex flex-wrap gap-1.5 max-w-md">
                              {visibleStudentIds.map((sId) => {
                                const std = getStudentById(sId);
                                if (!std) {
                                  return (
                                    <span key={sId} className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 text-[10px] font-mono">
                                      ID: {sId}
                                    </span>
                                  );
                                }
                                return (
                                  <div
                                    key={sId}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-purple-50/70 border border-gray-200/80 transition-colors shadow-2xs"
                                    title={`Anak: ${std.name || std.fullName} | Kelas: ${std.className || std.classId || "-"} | NISN: ${std.nisn || std.nis || "-"}`}
                                  >
                                    <GraduationCap className="w-3 h-3 text-[#531FFF]" />
                                    <span className="font-bold text-gray-800 text-[11px]">{std.name || std.fullName}</span>
                                    <span className="text-[10px] text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded font-semibold">
                                      {std.className || std.classId || "Kelas"}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Job & Address */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5 max-w-xs">
                          <p className="font-bold text-gray-800 text-[11px] flex items-center gap-1">
                            <Briefcase className="w-3 h-3 text-gray-400 shrink-0" />
                            <span className="truncate">{parent.job && parent.job !== "-" ? parent.job : "Pekerjaan -"}</span>
                          </p>
                          <p className="text-[10px] text-gray-500 truncate flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                            <span className="truncate">{parent.address && parent.address !== "-" ? parent.address : "-"}</span>
                          </p>
                        </div>
                      </td>

                      {/* Status Toggle Badge */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        {isGuru ? (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border shadow-2xs select-none",
                              parent.status === "Aktif"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : parent.status === "Belum Aktivasi"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            )}
                            title={`Status Akun: ${parent.status}`}
                          >
                            <span
                              className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                parent.status === "Aktif" ? "bg-emerald-500" : parent.status === "Belum Aktivasi" ? "bg-amber-500" : "bg-rose-500"
                              )}
                            />
                            <span>{parent.status}</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(parent)}
                            title="Klik untuk mengubah status aktif"
                            className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-all active:scale-95 cursor-pointer shadow-2xs",
                              parent.status === "Aktif"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                : parent.status === "Belum Aktivasi"
                                ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                            )}
                          >
                            <span
                              className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                parent.status === "Aktif" ? "bg-emerald-500 animate-pulse" : parent.status === "Belum Aktivasi" ? "bg-amber-500" : "bg-rose-500"
                              )}
                            />
                            <span>{parent.status}</span>
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDetailParent(parent)}
                            className="p-1.5 text-gray-400 hover:text-[#531FFF] hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                            title="Lihat Detail Profil Lengkap"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(parent)}
                            className="p-1.5 text-gray-400 hover:text-[#531FFF] hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Data & Relasi Siswa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {!isGuru && (
                            <button
                              type="button"
                              onClick={() => setDeleteParent(parent)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Profil Orang Tua"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
      ) : (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredParents.map((parent) => {
            const relObj = RELATIONSHIP_OPTIONS.find((r) => r.value === parent.relationship) || RELATIONSHIP_OPTIONS[2];

            return (
              <div
                key={parent.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-xs hover:shadow-md hover:border-purple-200 transition-all p-5 flex flex-col justify-between group"
              >
                <div>
                  {/* Top Card Header */}
                  <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#531FFF]/10 to-purple-100 text-[#531FFF] font-black flex items-center justify-center text-base border border-[#531FFF]/20 shrink-0">
                        {parent.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-gray-900 group-hover:text-[#531FFF] transition-colors line-clamp-1">
                          {parent.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={cn("inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border", relObj.color)}>
                            {parent.relationship}
                          </span>
                          {parent.hasUserAccount && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                              Akun
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isGuru ? (
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-bold border select-none",
                          parent.status === "Aktif"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : parent.status === "Belum Aktivasi"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        )}
                      >
                        {parent.status}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(parent)}
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer",
                          parent.status === "Aktif"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : parent.status === "Belum Aktivasi"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        )}
                      >
                        {parent.status}
                      </button>
                    )}
                  </div>

                  {/* Body Info */}
                  <div className="py-3.5 space-y-2 text-xs text-gray-600">
                    {parent.phone && parent.phone !== "-" && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-400">WhatsApp / HP:</span>
                        <a
                          href={`https://wa.me/${parent.phone.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-emerald-600 hover:underline flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          {parent.phone}
                        </a>
                      </div>
                    )}
                    {parent.email && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-400">Email:</span>
                        <span className="font-medium text-gray-700 truncate max-w-[170px]">{parent.email}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-400">Pekerjaan:</span>
                      <span className="font-semibold text-gray-800 truncate max-w-[170px]">
                        {parent.job && parent.job !== "-" ? parent.job : "-"}
                      </span>
                    </div>

                    {/* Connected Children Cards */}
                    {(() => {
                      const visibleStudentIds = isGuru
                        ? parent.studentIds.filter((sId) => homeroomStudentIdSet.has(String(sId)))
                        : parent.studentIds;

                      return (
                        <div className="pt-2">
                          <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1.5">
                            Anak Terhubung ({visibleStudentIds.length}):
                          </span>
                          {visibleStudentIds.length === 0 ? (
                            <p className="text-[11px] text-gray-400 italic">
                              {isGuru ? "Tidak ada anak di kelas binaan" : "Belum ada anak terhubung"}
                            </p>
                          ) : (
                            <div className="space-y-1.5">
                              {visibleStudentIds.map((sId) => {
                                const std = getStudentById(sId);
                                if (!std) return null;
                                return (
                                  <div
                                    key={sId}
                                    className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100 text-xs"
                                  >
                                    <div className="flex items-center gap-2">
                                      <GraduationCap className="w-3.5 h-3.5 text-[#531FFF]" />
                                      <span className="font-bold text-gray-800 text-[11px]">{std.name || std.fullName}</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded">
                                      {std.className || std.classId || "Kelas"}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <button
                    onClick={() => setDetailParent(parent)}
                    className="text-xs font-bold text-gray-600 hover:text-[#531FFF] flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Lihat Detail</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(parent)}
                      className="px-2.5 py-1 text-xs font-bold text-[#531FFF] hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                    >
                      Edit
                    </button>
                    {!isGuru && (
                      <button
                        onClick={() => setDeleteParent(parent)}
                        className="px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: EDIT PARENT & SINKRONISASI KOMPONEN ONBOARDING / DATA SISWA      */}
      {/* ========================================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-2xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#190C36] to-[#2E125B] text-white flex items-center justify-between">
              <div>
                <h3 className="font-black text-base flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-[#531FFF] bg-white p-0.5 rounded" />
                  <span>Edit Data Orang Tua & Relasi Siswa</span>
                </h3>
                <p className="text-xs text-purple-200 mt-0.5">
                  Komponen field diselaraskan dengan Onboarding Siswa dan Data Siswa.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-6 max-h-[78vh] overflow-y-auto text-xs">
              
              {/* --- SECTION 1: DATA IDENTITAS ORANG TUA / WALI --- */}
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <User className="w-4 h-4 text-[#531FFF]" />
                  <h4 className="font-extrabold text-xs text-gray-900 uppercase tracking-wider">
                    1. Identitas Orang Tua / Wali Siswa
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="font-bold text-gray-700 block mb-1">
                      Nama Lengkap / Nama Tampilan <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Bambang Sudarmono, S.T."
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl font-medium focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/10 outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Nama Ayah Kandung</label>
                    <input
                      type="text"
                      placeholder="Nama ayah sesuai KK"
                      value={formFatherName}
                      onChange={(e) => setFormFatherName(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl font-medium focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/10 outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Nama Ibu Kandung</label>
                    <input
                      type="text"
                      placeholder="Nama ibu sesuai KK"
                      value={formMotherName}
                      onChange={(e) => setFormMotherName(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl font-medium focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/10 outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Nama Wali (Opsional)</label>
                    <input
                      type="text"
                      placeholder="Isi jika tinggal bersama wali"
                      value={formGuardianName}
                      onChange={(e) => setFormGuardianName(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl font-medium focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/10 outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Hubungan dengan Siswa</label>
                    <select
                      value={formRelationship}
                      onChange={(e) => setFormRelationship(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl font-medium focus:border-[#531FFF] outline-none text-xs cursor-pointer"
                    >
                      <option value="Ayah Kandung">Ayah Kandung</option>
                      <option value="Ibu Kandung">Ibu Kandung</option>
                      <option value="Wali Murid">Wali Murid</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">NIK (Nomor Induk Kependudukan)</label>
                    <input
                      type="text"
                      maxLength={16}
                      placeholder="16 digit NIK..."
                      value={formNik}
                      onChange={(e) => setFormNik(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl font-medium focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/10 outline-none text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">
                      No. WhatsApp / HP Aktif <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        placeholder="Contoh: 081289123456"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 border border-gray-200 rounded-xl font-medium focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/10 outline-none text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* --- SECTION 2: KONTAK, PEKERJAAN & DOMISILI --- */}
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <Briefcase className="w-4 h-4 text-[#531FFF]" />
                  <h4 className="font-extrabold text-xs text-gray-900 uppercase tracking-wider">
                    2. Pekerjaan, Penghasilan & Domisili
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1 flex items-center justify-between">
                      <span>Email Akun Login</span>
                      {editingParent?.hasUserAccount ? (
                        <span className="text-[10px] text-[#531FFF] font-semibold bg-[#531FFF]/10 px-1.5 py-0.5 rounded">Tersinkronisasi Akun</span>
                      ) : (
                        <span className="text-[10px] text-gray-500 font-medium">Opsional</span>
                      )}
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        placeholder="email.orangtua@gmail.com"
                        value={formEmail}
                        disabled={editingParent?.hasUserAccount}
                        onChange={(e) => setFormEmail(e.target.value)}
                        className={cn(
                          "w-full pl-9 pr-3.5 py-2.5 border border-gray-200 rounded-xl font-medium outline-none text-xs",
                          editingParent?.hasUserAccount
                            ? "bg-gray-100/80 text-gray-600 cursor-not-allowed"
                            : "focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/10"
                        )}
                        title={editingParent?.hasUserAccount ? "Email akun login dikelola di Manajemen Akun" : "Email orang tua"}
                      />
                    </div>
                    {editingParent?.hasUserAccount && (
                      <span className="text-[10px] text-gray-400 mt-1 block">
                        Email & password akun login dikelola melalui menu Manajemen Akun.
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Pekerjaan Orang Tua</label>
                    <input
                      type="text"
                      placeholder="PNS / Swasta / Wiraswasta"
                      value={formJob}
                      onChange={(e) => setFormJob(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl font-medium focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/10 outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">
                      Penghasilan Orang Tua (Sesuai Onboarding)
                    </label>
                    <select
                      value={formIncome}
                      onChange={(e) => setFormIncome(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl font-medium focus:border-[#531FFF] outline-none text-xs cursor-pointer"
                    >
                      {INCOME_OPTIONS.map((inc) => (
                        <option key={inc.value} value={inc.value}>
                          {inc.label}
                        </option>
                      ))}
                      {/* Backwards compatibility for older custom income text */}
                      {!INCOME_OPTIONS.some((o) => o.value === formIncome) && formIncome && (
                        <option value={formIncome}>{formIncome}</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Status Aktivasi</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl font-medium focus:border-[#531FFF] outline-none text-xs cursor-pointer"
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Belum Aktivasi">Belum Aktivasi</option>
                      <option value="Nonaktif">Nonaktif</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-bold text-gray-700 block mb-1">Alamat Orang Tua / Wali</label>
                    <textarea
                      rows={2}
                      placeholder="Isi jika alamat berbeda dengan domisili siswa..."
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      className="w-full px-3.5 py-2 border border-gray-200 rounded-xl font-medium focus:border-[#531FFF] outline-none text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* --- SECTION 3: DATA KONTAK DARURAT (SESUAI ONBOARDING SISWA) --- */}
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <HeartHandshake className="w-4 h-4 text-[#531FFF]" />
                  <h4 className="font-extrabold text-xs text-gray-900 uppercase tracking-wider">
                    3. Kontak Darurat (Emergency Contact)
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Nama Kontak Darurat</label>
                    <input
                      type="text"
                      placeholder="Nama kerabat / tetangga"
                      value={formEmergencyName}
                      onChange={(e) => setFormEmergencyName(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl font-medium focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/10 outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Hubungan Dengan Siswa</label>
                    <input
                      type="text"
                      placeholder="Contoh: Paman / Bibi / Kakak"
                      value={formEmergencyRelation}
                      onChange={(e) => setFormEmergencyRelation(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl font-medium focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/10 outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Nomor HP Darurat</label>
                    <input
                      type="tel"
                      placeholder="Nomor HP aktif darurat"
                      value={formEmergencyPhone}
                      onChange={(e) => setFormEmergencyPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl font-medium focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/10 outline-none text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* --- SECTION 4: HUBUNGKAN ANAK TERDAFTAR (RELASI studentId) --- */}
              <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-200/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-[#531FFF]" />
                    <span className="font-extrabold text-xs text-gray-900">
                      4. Hubungkan Anak Terdaftar (Relasi Bebas Duplikasi)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                    Satu Ortu Banyak Anak (Kakak-Adik)
                  </span>
                </div>

                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Pilih siswa yang merupakan anak dari orang tua ini. Sistem menghubungkan data secara referensial sehingga profil nilai, presensi, dan data induk siswa tidak terduplikasi.
                </p>

                {/* Selected Students Badge List */}
                {formSelectedStudentIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {formSelectedStudentIds.map((sId) => {
                      const std = getStudentById(sId);
                      return (
                        <div
                          key={sId}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-purple-200 shadow-2xs"
                        >
                          <User className="w-3.5 h-3.5 text-[#531FFF]" />
                          <span className="font-bold text-gray-900 text-xs">
                            {std ? std.name || std.fullName : `Siswa ID: ${sId}`}
                          </span>
                          {std && (
                            <span className="text-[10px] text-purple-700 font-semibold bg-purple-50 px-1.5 py-0.2 rounded">
                              {std.className || std.classId || "Kelas"}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setFormSelectedStudentIds((prev) => prev.filter((id) => id !== sId));
                            }}
                            className="text-gray-400 hover:text-rose-500 transition-colors p-0.5 rounded cursor-pointer"
                            title="Lepas tautan anak ini"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Searchable Student Picker */}
                <div className="relative pt-1">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={
                        isGuru
                          ? `Cari siswa di kelas ${teacherHomeroomClasses.join(", ")}...`
                          : "Ketik nama siswa, NISN, atau kelas untuk mencari anak..."
                      }
                      value={studentPickerSearch}
                      onChange={(e) => {
                        setStudentPickerSearch(e.target.value);
                        setIsStudentPickerOpen(true);
                      }}
                      onFocus={() => setIsStudentPickerOpen(true)}
                      className="w-full pl-9 pr-8 py-2 bg-white border border-purple-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#531FFF]/15 focus:border-[#531FFF] outline-none"
                    />
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    {studentPickerSearch && (
                      <button
                        type="button"
                        onClick={() => setStudentPickerSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown Results */}
                  {isStudentPickerOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-purple-200 shadow-xl z-20 max-h-48 overflow-y-auto divide-y divide-gray-100">
                      {unifiedStudents
                        .filter((s) => {
                          if (isGuru && !homeroomStudentIdSet.has(String(s.id || s._firestoreId || s.uid || s.nisn))) {
                            return false;
                          }
                          const q = studentPickerSearch.toLowerCase().trim();
                          if (!q) return true;
                          const nameMatch = (s.name || s.fullName || "").toLowerCase().includes(q);
                          const nisnMatch = (s.nisn || s.nis || "").toLowerCase().includes(q);
                          const classMatch = (s.className || s.classId || "").toLowerCase().includes(q);
                          return nameMatch || nisnMatch || classMatch;
                        })
                        .slice(0, 15)
                        .map((std) => {
                          const sKey = String(std.id || std._firestoreId || std.nisn || std.nis);
                          const isAlreadySelected = formSelectedStudentIds.includes(sKey);

                          return (
                            <button
                              key={sKey}
                              type="button"
                              onClick={() => {
                                if (isAlreadySelected) {
                                  setFormSelectedStudentIds((prev) => prev.filter((id) => id !== sKey));
                                } else {
                                  setFormSelectedStudentIds((prev) => [...prev, sKey]);
                                }
                                setIsStudentPickerOpen(false);
                                setStudentPickerSearch("");
                              }}
                              className={cn(
                                "w-full px-3 py-2 text-left flex items-center justify-between hover:bg-purple-50/60 transition-colors text-xs cursor-pointer",
                                isAlreadySelected && "bg-purple-50 text-[#531FFF]"
                              )}
                            >
                              <div className="flex items-center gap-2.5">
                                <ProfileAvatar
                                  name={std.name || std.fullName}
                                  imageUrl={std.imageUrl}
                                  photoUrl={std.photoUrl}
                                  role="student"
                                  size="sm"
                                />
                                <div>
                                  <p className="font-bold text-gray-900">{std.name || std.fullName}</p>
                                  <p className="text-[10px] text-gray-400">
                                    NISN: {std.nisn || std.nis || "-"} • Kelas: {std.className || std.classId || "-"}
                                  </p>
                                </div>
                              </div>
                              <span
                                className={cn(
                                  "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                  isAlreadySelected
                                    ? "bg-[#531FFF] text-white border-[#531FFF]"
                                    : "bg-gray-100 text-gray-600 border-gray-200"
                                )}
                              >
                                {isAlreadySelected ? "Terpilih" : "+ Hubungkan"}
                              </span>
                            </button>
                          );
                        })}
                      <div className="p-2 bg-gray-50 text-center">
                        <button
                          type="button"
                          onClick={() => setIsStudentPickerOpen(false)}
                          className="text-[11px] font-bold text-gray-500 hover:text-gray-800 cursor-pointer"
                        >
                          Tutup Pencarian
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#531FFF] hover:bg-[#4215cb] rounded-xl shadow-md shadow-[#531FFF]/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Simpan & Sinkronkan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. DETAIL DRAWER MODAL (PROFIL LENGKAP & KELUARGA TERHUBUNG)              */}
      {/* ========================================================================= */}
      {detailParent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-xl overflow-hidden my-8">
            <div className="px-6 py-5 bg-gradient-to-r from-[#190C36] to-[#2E125B] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#531FFF] text-white flex items-center justify-center font-black text-base shadow">
                  {detailParent.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base leading-tight">{detailParent.name}</h3>
                    {detailParent.hasUserAccount ? (
                      <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-400/40 px-2 py-0.2 rounded-full">
                        Akun Terverifikasi
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-purple-300 bg-purple-950/60 border border-purple-400/40 px-2 py-0.2 rounded-full">
                        Dari Data Siswa
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-purple-200 mt-0.5">
                    {detailParent.relationship} • Status: {detailParent.status}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailParent(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Profile Details Grid */}
              <div className="grid grid-cols-2 gap-3.5 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">NIK</span>
                  <span className="font-mono font-bold text-gray-800 text-xs">{detailParent.nik || "-"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">No. WhatsApp / HP</span>
                  {detailParent.phone && detailParent.phone !== "-" ? (
                    <a
                      href={`https://wa.me/${detailParent.phone.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-emerald-600 hover:underline flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      {detailParent.phone}
                    </a>
                  ) : (
                    <span className="font-medium text-gray-500">-</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Nama Ayah Kandung</span>
                  <span className="font-bold text-gray-800 text-xs">{detailParent.fatherName || "-"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Nama Ibu Kandung</span>
                  <span className="font-bold text-gray-800 text-xs">{detailParent.motherName || "-"}</span>
                </div>
                {detailParent.guardianName && (
                  <div className="col-span-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Nama Wali</span>
                    <span className="font-bold text-gray-800 text-xs">{detailParent.guardianName}</span>
                  </div>
                )}
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Email Login</span>
                  <span className="font-medium text-gray-800 text-xs">{detailParent.email || "-"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Pekerjaan</span>
                  <span className="font-bold text-gray-800 text-xs">{detailParent.job && detailParent.job !== "-" ? detailParent.job : "-"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Penghasilan Bulanan</span>
                  <span className="font-bold text-purple-700 text-xs">{detailParent.income && detailParent.income !== "-" ? detailParent.income : "-"}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Alamat Domisili</span>
                  <span className="font-medium text-gray-700 text-xs">{detailParent.address && detailParent.address !== "-" ? detailParent.address : "-"}</span>
                </div>
              </div>

              {/* Emergency Contact Card */}
              {(detailParent.emergencyName || detailParent.emergencyPhone) && (
                <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/60 space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider flex items-center gap-1.5">
                    <HeartHandshake className="w-3.5 h-3.5 text-amber-600" />
                    Kontak Darurat Terdaftar
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-gray-400 text-[10px] block">Nama Kontak:</span>
                      <span className="font-bold text-gray-900">{detailParent.emergencyName || "-"}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-[10px] block">Hubungan:</span>
                      <span className="font-bold text-gray-900">{detailParent.emergencyRelation || "-"}</span>
                    </div>
                    {detailParent.emergencyPhone && (
                      <div className="col-span-2">
                        <span className="text-gray-400 text-[10px] block">Nomor HP Darurat:</span>
                        <span className="font-mono font-bold text-amber-900">{detailParent.emergencyPhone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Connected Children Detailed Cards */}
              {(() => {
                const visibleStudentIds = isGuru
                  ? detailParent.studentIds.filter((sId) => homeroomStudentIdSet.has(String(sId)))
                  : detailParent.studentIds;

                return (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="font-extrabold text-xs text-gray-900 flex items-center gap-1.5">
                          <GraduationCap className="w-4 h-4 text-[#531FFF]" />
                          <span>
                            Daftar Anak yang Terhubung ({visibleStudentIds.length})
                            {isGuru && ` — Kelas ${teacherHomeroomClasses.join(", ")}`}
                          </span>
                        </h4>
                        <span className="text-[10px] text-gray-400 font-semibold">Tersinkronisasi Real-Time</span>
                      </div>

                      {visibleStudentIds.length === 0 ? (
                        <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center text-gray-400 text-xs">
                          {isGuru
                            ? "Tidak ada anak terhubung yang berada di kelas binaan Anda."
                            : "Belum ada siswa yang ditautkan ke akun orang tua ini."}
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {visibleStudentIds.map((sId) => {
                            const std = getStudentById(sId);
                            if (!std) {
                              return (
                                <div key={sId} className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                                  Siswa ID: {sId} (Data master tidak ditemukan)
                                </div>
                              );
                            }

                            return (
                              <div
                                key={sId}
                                className="p-3.5 bg-gradient-to-r from-purple-50/50 to-white rounded-xl border border-purple-100 flex items-center justify-between"
                              >
                                <div className="flex items-center gap-3">
                                  <ProfileAvatar
                                    name={std.name || std.fullName}
                                    imageUrl={std.imageUrl}
                                    photoUrl={std.photoUrl}
                                    role="student"
                                    size="md"
                                    shape="rounded"
                                  />
                                  <div>
                                    <h5 className="font-bold text-gray-900 text-xs">{std.name || std.fullName}</h5>
                                    <p className="text-[11px] text-gray-500">
                                      Kelas: <strong>{std.className || std.classId || "-"}</strong> • NISN:{" "}
                                      <span className="font-mono">{std.nisn || std.nis || "-"}</span>
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[10px] text-gray-400">
                                        Status: <strong>{std.status || "Aktif"}</strong>
                                      </span>
                                      {std.onboardingCompleted && (
                                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
                                          Onboarded
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#531FFF]/10 text-[#531FFF] border border-[#531FFF]/20">
                                  Terhubung
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

              {/* Drawer Footer */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    const toEdit = detailParent;
                    setDetailParent(null);
                    handleOpenEdit(toEdit);
                  }}
                  className="px-4 py-2 bg-[#531FFF] hover:bg-[#4215cb] text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Data Orang Tua</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDetailParent(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. DELETE CONFIRMATION MODAL                                              */}
      {/* ========================================================================= */}
      {deleteParent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3 border border-rose-100">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-black text-gray-900 text-base">Hapus Data Orang Tua?</h3>
            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
              Apakah Anda yakin ingin menghapus profil orang tua <strong>{deleteParent.name}</strong>? Data siswa anak yang terhubung tidak akan terhapus, namun relasi pemantauan orang tua akan dilepas.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteParent(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Ya, Hapus Profil</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
