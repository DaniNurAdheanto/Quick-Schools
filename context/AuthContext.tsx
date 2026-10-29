"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { User, onAuthStateChanged, signOut, deleteUser } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { 
  DEFAULT_PERMISSIONS, 
  isSuperAdminRole, 
  isSaaSAdminRole,
  isStudentRole, 
  isTeacherRole,
  isParentRole,
  isKepalaSekolahRole,
  canMutateModule,
  canAccessMenu,
  normalizeRole,
  ModulePermission,
  PermissionAction
} from "@/lib/roles-config";

export type UserRole = "super-admin" | "saas-admin" | "admin" | "guru" | "siswa" | "orang-tua" | "kepala-sekolah";

export interface UserProfileData {
  uid: string;
  name?: string;
  fullName?: string;
  email?: string;
  role?: string;
  status?: string;
  onboardingCompleted?: boolean;
  pendingOnboardingReminder?: boolean;
  imageUrl?: string;
  photoUrl?: string;
  nip?: string;
  nisn?: string;
  classId?: string;
  homeroomClass?: string;
  subject?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  userData: UserProfileData | null;
  role: UserRole | null;
  rawRole: string;
  userName: string;
  userEmail: string;
  userAvatar: string;
  isAuthLoading: boolean;
  isRoleReady: boolean;
  isLoggingOut: boolean;
  userRole: string;
  rolePermissions: Record<string, ModulePermission>;
  isSuperAdmin: boolean;
  isSaaSAdmin: boolean;
  isAdmin: boolean;
  isGuru: boolean;
  isStudent: boolean;
  isParent: boolean;
  isKepalaSekolah: boolean;
  hasPermission: (menuIdOrRoute: string, action: PermissionAction) => boolean;
  canView: (menuIdOrRoute: string) => boolean;
  canCreate: (menuIdOrRoute: string) => boolean;
  canEdit: (menuIdOrRoute: string) => boolean;
  canDelete: (menuIdOrRoute: string) => boolean;
  canApprove: (menuIdOrRoute: string) => boolean;
  canExport: (menuIdOrRoute: string) => boolean;
  canWrite: (module: string) => boolean;
  canRead: (module: string) => boolean;
  refreshUserData: () => Promise<void>;
  logout: (redirectTo?: string) => Promise<void>;
}

const AUTH_CACHE_KEY = "quick_schools_auth_session_v3";
const ROLES_PERM_CACHE_KEY = "quick_schools_role_permissions_v2";

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  role: null,
  rawRole: "",
  userName: "",
  userEmail: "",
  userAvatar: "",
  isAuthLoading: true,
  isRoleReady: false,
  isLoggingOut: false,
  userRole: "",
  rolePermissions: {},
  isSuperAdmin: false,
  isSaaSAdmin: false,
  isAdmin: false,
  isGuru: false,
  isStudent: false,
  isParent: false,
  isKepalaSekolah: false,
  hasPermission: () => false,
  canView: () => false,
  canCreate: () => false,
  canEdit: () => false,
  canDelete: () => false,
  canApprove: () => false,
  canExport: () => false,
  canWrite: () => false,
  canRead: () => false,
  refreshUserData: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserProfileData | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [rawRole, setRawRole] = useState<string>("");
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [allRolePermissions, setAllRolePermissions] = useState<Record<string, Record<string, ModulePermission>>>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(ROLES_PERM_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === "object") return parsed;
        }
      } catch (e) {}
    }
    return DEFAULT_PERMISSIONS;
  });

  const fetchRolePermissions = useCallback(async () => {
    try {
      const res = await fetch("/api/roles");
      const data = await res.json();
      if (data.success && data.permissions) {
        setAllRolePermissions(data.permissions);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(ROLES_PERM_CACHE_KEY, JSON.stringify(data.permissions));
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn("AuthContext: Could not fetch /api/roles:", e);
    }
  }, []);

  useEffect(() => {
    fetchRolePermissions();

    const handleUpdate = () => {
      // Instantly hydrate from localStorage if available to eliminate UI latency
      if (typeof window !== "undefined") {
        try {
          const cached = localStorage.getItem(ROLES_PERM_CACHE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && typeof parsed === "object") {
              setAllRolePermissions(parsed);
            }
          }
        } catch (e) {}
      }
      fetchRolePermissions();
    };

    window.addEventListener("roles-permissions-updated", handleUpdate);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === ROLES_PERM_CACHE_KEY) {
        handleUpdate();
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("roles-permissions-updated", handleUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, [fetchRolePermissions]);

  const fetchUserData = useCallback(async (firebaseUser: User) => {
    try {
      const cleanEmail = (firebaseUser.email || "").toLowerCase().trim();
      const sanitizedEmail = cleanEmail.replace(/[^a-z0-9]/g, "_");

      let delDocExists = false;
      try {
        const delByUid = await getDoc(doc(db, "deleted_accounts", firebaseUser.uid));
        if (delByUid.exists()) delDocExists = true;
      } catch (e) {}

      if (!delDocExists && sanitizedEmail) {
        try {
          const delByEmail = await getDoc(doc(db, "deleted_accounts", sanitizedEmail));
          if (delByEmail.exists()) delDocExists = true;
        } catch (e) {}
      }

      if (delDocExists) {
        console.warn("Deleted account detected in deleted_accounts:", firebaseUser.uid);
        try {
          await deleteUser(firebaseUser);
        } catch (e) {}
        try {
          await signOut(auth);
        } catch (e) {}
        setUser(null);
        setUserData(null);
        setRole(null);
        setRawRole("");
        try {
          localStorage.removeItem(AUTH_CACHE_KEY);
        } catch (e) {}
        setIsAuthLoading(false);
        return;
      }

      // 1. Strict check with PostgreSQL User table
      let pgData: any = null;
      try {
        const checkRes = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: cleanEmail,
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName,
            photoUrl: firebaseUser.photoURL,
          }),
        });

        if (checkRes.ok) {
          const resJson = await checkRes.json();
          if (resJson.success && resJson.user) {
            pgData = resJson.user;
          }
        } else if (checkRes.status === 404 || checkRes.status === 403) {
          // ACCOUNT DOES NOT EXIST IN DATABASE USER TABLE OR IS NONAKTIF!
          console.warn("Account does not exist in PostgreSQL User table or is deactivated:", cleanEmail);
          try {
            await signOut(auth);
          } catch (e) {}
          setUser(null);
          setUserData(null);
          setRole(null);
          setRawRole("");
          try {
            localStorage.removeItem(AUTH_CACHE_KEY);
          } catch (e) {}
          setIsAuthLoading(false);
          return;
        }
      } catch (err) {
        console.warn("Error verifying user against PostgreSQL in fetchUserData:", err);
      }

      let userSnap: any = null;
      try {
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (snap.exists()) userSnap = snap;
      } catch (e) {
        console.warn("Error reading users doc by uid:", e);
      }

      // Fallback 1: Query users collection by email
      if (!userSnap && cleanEmail) {
        try {
          const qByEmail = query(collection(db, "users"), where("email", "==", cleanEmail));
          const querySnap = await getDocs(qByEmail);
          if (!querySnap.empty) {
            userSnap = querySnap.docs[0];
          }
        } catch (qe) {
          console.warn("Error querying users doc by email:", qe);
        }
      }

      // Fallback 2: Check sanitized email doc ID
      if (!userSnap && sanitizedEmail) {
        try {
          const snap = await getDoc(doc(db, "users", sanitizedEmail));
          if (snap.exists()) userSnap = snap;
        } catch (e) {}
      }

      // Look up companion collections (teachers, parents, students)
      let teacherSnap: any = null;
      let parentSnap: any = null;
      let studentSnap: any = null;

      try {
        const tDoc = await getDoc(doc(db, "teachers", firebaseUser.uid));
        if (tDoc.exists()) teacherSnap = tDoc;
        else if (cleanEmail) {
          const qT = query(collection(db, "teachers"), where("email", "==", cleanEmail));
          const qTSnap = await getDocs(qT);
          if (!qTSnap.empty) teacherSnap = qTSnap.docs[0];
        }
      } catch (e) {}

      try {
        const pDoc = await getDoc(doc(db, "parents", firebaseUser.uid));
        if (pDoc.exists()) parentSnap = pDoc;
        else if (cleanEmail) {
          const qP = query(collection(db, "parents"), where("email", "==", cleanEmail));
          const qPSnap = await getDocs(qP);
          if (!qPSnap.empty) parentSnap = qPSnap.docs[0];
        }
      } catch (e) {}

      try {
        const sDoc = await getDoc(doc(db, "students", firebaseUser.uid));
        if (sDoc.exists()) studentSnap = sDoc;
        else if (cleanEmail) {
          const qS = query(collection(db, "students"), where("email", "==", cleanEmail));
          const qSSnap = await getDocs(qS);
          if (!qSSnap.empty) studentSnap = qSSnap.docs[0];
        }
      } catch (e) {}

      let data: UserProfileData;
      if (pgData) {
        data = {
          id: pgData.id,
          uid: pgData.id,
          name: pgData.name,
          fullName: pgData.name,
          email: cleanEmail,
          role: pgData.role,
          status: pgData.status,
          onboardingCompleted: pgData.onboardingCompleted,
          isActive: pgData.status === "Aktif",
          phone: pgData.phone,
          avatarUrl: pgData.avatarUrl,
          photoUrl: pgData.avatarUrl,
          studentId: pgData.studentId,
          teacherId: pgData.teacherId,
          parentId: pgData.parentId,
          classId: pgData.classId,
          className: pgData.className,
          nip: pgData.nip,
          nisn: pgData.nisn,
          ...pgData,
        } as UserProfileData;
      } else if (userSnap && userSnap.exists()) {
        data = { id: userSnap.id, uid: (userSnap.data() as any)?.uid || firebaseUser.uid, ...userSnap.data() } as UserProfileData;
      } else if (teacherSnap && teacherSnap.exists()) {
        data = { id: teacherSnap.id, uid: (teacherSnap.data() as any)?.uid || firebaseUser.uid, role: "guru", ...teacherSnap.data() } as UserProfileData;
      } else if (parentSnap && parentSnap.exists()) {
        data = { id: parentSnap.id, uid: (parentSnap.data() as any)?.uid || firebaseUser.uid, role: "orang-tua", ...parentSnap.data() } as UserProfileData;
      } else if (studentSnap && studentSnap.exists()) {
        data = { id: studentSnap.id, uid: (studentSnap.data() as any)?.uid || firebaseUser.uid, role: "siswa", ...studentSnap.data() } as UserProfileData;
      } else {
        // Account does NOT exist in PostgreSQL or Firestore: reject completely!
        console.warn("Unregistered account detected in fetchUserData:", cleanEmail);
        try {
          await signOut(auth);
        } catch (e) {}
        setUser(null);
        setUserData(null);
        setRole(null);
        setRawRole("");
        try {
          localStorage.removeItem(AUTH_CACHE_KEY);
        } catch (e) {}
        setIsAuthLoading(false);
        return;
      }

      // Check for inactive / disabled status
      if (data.status === "Nonaktif" || data.status === "deleted" || data.isDeleted === true) {
        console.warn("Inactive account detected:", firebaseUser.uid);
        try {
          await signOut(auth);
        } catch (e) {}
        setUser(null);
        setUserData(null);
        setRole(null);
        setRawRole("");
        try {
          localStorage.removeItem(AUTH_CACHE_KEY);
        } catch (e) {}
        setIsAuthLoading(false);
        return;
      }

      // Merge data from companion docs if available
      if (teacherSnap && teacherSnap.exists()) {
        data = { ...teacherSnap.data(), ...data, role: data.role || "guru" };
      }
      if (parentSnap && parentSnap.exists()) {
        const pData = parentSnap.data() as any;
        const toSafeArray = (v: any): string[] => {
          if (!v) return [];
          if (Array.isArray(v)) return v.map(String).filter(Boolean);
          if (typeof v === "string") return v.includes(",") ? v.split(",").map(s => s.trim()).filter(Boolean) : [v.trim()];
          if (typeof v === "object") return Object.values(v).map(String).filter(Boolean);
          return [String(v)];
        };
        const mergedStudentIds = Array.from(new Set([...toSafeArray(data.studentIds), ...toSafeArray(pData.studentIds)]));
        const mergedLinkedIds = Array.from(new Set([...toSafeArray(data.linkedStudentIds), ...toSafeArray(pData.linkedStudentIds), ...mergedStudentIds]));

        data = {
          ...pData,
          ...data,
          studentIds: mergedStudentIds,
          linkedStudentIds: mergedLinkedIds,
          studentId: data.studentId || pData.studentId || data.nisn || pData.nisn || "",
          studentName: data.studentName || pData.studentName || "",
          nisn: data.nisn || pData.nisn || data.studentId || pData.studentId || "",
          role: data.role || "orang-tua",
        };
      }
      if (studentSnap && studentSnap.exists()) {
        data = { ...studentSnap.data(), ...data, role: data.role || "siswa" };
      }

      let uRawRole = pgData?.role || data.role;

      if (!uRawRole) {
        if (cleanEmail === "dani@gmail.com" || cleanEmail.includes("superadmin")) {
          uRawRole = "super-admin";
        } else if (
          cleanEmail.includes("kelapa") ||
          cleanEmail.includes("kepala") ||
          cleanEmail.includes("seokolah") ||
          cleanEmail.includes("kepsek") ||
          cleanEmail.includes("principal") ||
          cleanEmail.includes("headmaster") ||
          cleanEmail.includes("tohar") ||
          (data.name && (data.name.toLowerCase().includes("tohar") || data.name.toLowerCase().includes("kepala sekolah"))) ||
          (data.fullName && (data.fullName.toLowerCase().includes("tohar") || data.fullName.toLowerCase().includes("kepala sekolah"))) ||
          isKepalaSekolahRole(data.role)
        ) {
          uRawRole = "kepala-sekolah";
        } else if (cleanEmail.includes(".guru@") || cleanEmail.includes("guru.") || cleanEmail.includes("teacher")) {
          uRawRole = "guru";
        } else if (cleanEmail.includes(".wali@") || cleanEmail.includes("wali.") || cleanEmail.includes("parent") || cleanEmail.includes("orangtua")) {
          uRawRole = "orang-tua";
        } else if (cleanEmail.includes("siswa") || cleanEmail.includes("student")) {
          uRawRole = "siswa";
        } else if (cleanEmail.includes("admin") && !cleanEmail.includes("superadmin")) {
          uRawRole = "admin";
        } else if (data.role) {
          uRawRole = data.role;
        } else if (teacherSnap && teacherSnap.exists() || data.nip || data.subject) {
          uRawRole = "guru";
        } else if (parentSnap && parentSnap.exists() || data.studentId || data.studentIds) {
          uRawRole = "orang-tua";
        } else if (studentSnap && studentSnap.exists() || data.nisn || data.className || data.kelas) {
          uRawRole = "siswa";
        }
      }

      if (!uRawRole) {
        uRawRole = "admin";
      }
      const normalized = normalizeRole(uRawRole) as UserRole;

      setUserData(data);
      setRawRole(uRawRole);
      setRole(normalized);

      // Fetch custom role permissions from roles/{normalized} if available
      try {
        const roleDocRef = doc(db, "roles", normalized);
        const roleSnap = await getDoc(roleDocRef);
        if (roleSnap.exists() && roleSnap.data().modules) {
          const fsMods = roleSnap.data().modules;
          setAllRolePermissions(prev => ({
            ...prev,
            [normalized]: {
              ...(prev[normalized] || {}),
              ...fsMods,
            }
          }));
        }
      } catch (err) {}

      // Update local cache
      try {
        localStorage.setItem(
          AUTH_CACHE_KEY,
          JSON.stringify({
            uid: firebaseUser.uid,
            role: normalized,
            rawRole: uRawRole,
            userData: data,
          })
        );
      } catch (e) {}
    } catch (error) {
      console.error("AuthContext fetchUserData error:", error);
      try {
        await signOut(auth);
      } catch (e) {}
      setUser(null);
      setUserData(null);
      setRole(null);
      setRawRole("");
      try {
        localStorage.removeItem(AUTH_CACHE_KEY);
      } catch (e) {}
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  const fetchSessionFromPg = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.authenticated && data.user) {
        const pgUser = data.user;
        const uRole = normalizeRole(pgUser.role) as UserRole;
        setUser({
          uid: pgUser.id,
          id: pgUser.id,
          email: pgUser.email,
          displayName: pgUser.name,
        } as any);
        setUserData(pgUser);
        setRole(uRole);
        setRawRole(pgUser.role);
        setIsAuthLoading(false);
        try {
          localStorage.setItem(
            AUTH_CACHE_KEY,
            JSON.stringify({
              uid: pgUser.id,
              role: uRole,
              rawRole: pgUser.role,
              userData: pgUser,
            })
          );
        } catch (e) {}
        return true;
      }
      return false;
    } catch (err) {
      console.error("fetchSessionFromPg error:", err);
      return false;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      // 1. First check PostgreSQL session
      const hasPgSession = await fetchSessionFromPg();
      if (hasPgSession) {
        return;
      }

      // 2. Fast hydration from cache if available
      try {
        const raw = localStorage.getItem(AUTH_CACHE_KEY);
        if (raw) {
          const cached = JSON.parse(raw);
          if (cached && cached.userData && cached.role) {
            const norm = normalizeRole(cached.role) as UserRole;
            setUser({
              uid: cached.uid,
              id: cached.uid,
              email: cached.userData.email,
              displayName: cached.userData.name,
            } as any);
            setUserData(cached.userData);
            setRole(norm);
            setRawRole(cached.rawRole || norm);
            setIsAuthLoading(false);
          }
        }
      } catch (e) {}

      // 3. Fallback check Firebase auth during transition
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (!isMounted) return;
        if (currentUser) {
          setUser(currentUser);
          await fetchUserData(currentUser);
        } else {
          // If no PostgreSQL session AND no Firebase user, then clear session
          const pgStillActive = await fetchSessionFromPg();
          if (!pgStillActive) {
            setUser(null);
            setUserData(null);
            setRole(null);
            setRawRole("");
            setIsAuthLoading(false);
            try {
              localStorage.removeItem(AUTH_CACHE_KEY);
            } catch (e) {}
          }
        }
      });

      return () => {
        unsubscribe();
      };
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, [fetchSessionFromPg, fetchUserData]);

  const refreshUserData = useCallback(async () => {
    setIsAuthLoading(true);
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.authenticated && data.user) {
        const uRole = normalizeRole(data.user.role) as UserRole;
        setUser({
          uid: data.user.id,
          email: data.user.email,
          displayName: data.user.name,
        } as any);
        setUserData(data.user);
        setRole(uRole);
        setRawRole(data.user.role);
      } else if (auth.currentUser) {
        await fetchUserData(auth.currentUser);
      }
    } catch (e) {
      if (auth.currentUser) {
        await fetchUserData(auth.currentUser);
      }
    } finally {
      setIsAuthLoading(false);
    }
  }, [fetchUserData]);


  const logout = useCallback(async (redirectTo: string = "/login") => {
    try {
      setIsLoggingOut(true);

      // Clean local tokens and session data immediately
      try {
        localStorage.removeItem(AUTH_CACHE_KEY);
        localStorage.removeItem("quick_schools_student_profile");
        localStorage.removeItem("onboarding_completed");
        sessionStorage.clear();
      } catch (e) {}

      // Clear PostgreSQL session cookie
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } catch (e) {}

      // Sign out from Firebase
      try {
        await signOut(auth);
      } catch (e) {}

      setUser(null);
      setUserData(null);
      setRole(null);
      setRawRole("");

      // Keep isLoggingOut true during transition and perform clean redirect
      if (typeof window !== "undefined") {
        await new Promise((resolve) => setTimeout(resolve, 350));
        window.location.replace(redirectTo);
      }
    } catch (err) {
      console.error("Logout error:", err);
      if (typeof window !== "undefined") {
        window.location.replace(redirectTo);
      }
    }
  }, []);

  // Compute convenient role checks - strictly require verified active user
  const isSuperAdmin = useMemo(() => Boolean(user) && (isSuperAdminRole(rawRole) || isSuperAdminRole(role) || role === "super-admin"), [user, rawRole, role]);
  const isSaaSAdmin = useMemo(() => Boolean(user) && (isSaaSAdminRole(rawRole) || isSaaSAdminRole(role) || role === "saas-admin"), [user, rawRole, role]);
  const isGuru = useMemo(() => Boolean(user) && (isTeacherRole(rawRole) || isTeacherRole(role) || role === "guru"), [user, rawRole, role]);
  const isStudent = useMemo(() => Boolean(user) && (isStudentRole(rawRole) || isStudentRole(role) || role === "siswa"), [user, rawRole, role]);
  const isParent = useMemo(() => Boolean(user) && (isParentRole(rawRole) || isParentRole(role) || role === "orang-tua"), [user, rawRole, role]);
  const isKepalaSekolah = useMemo(() => Boolean(user) && (isKepalaSekolahRole(rawRole) || isKepalaSekolahRole(role) || role === "kepala-sekolah"), [user, rawRole, role]);
  const isAdmin = useMemo(() => Boolean(user) && (role === "admin" || (rawRole || "").toLowerCase() === "admin") && !isSuperAdmin && !isSaaSAdmin && !isKepalaSekolah, [user, role, rawRole, isSuperAdmin, isSaaSAdmin, isKepalaSekolah]);

  const activeRoleName = useMemo(() => {
    return normalizeRole(rawRole || role || "");
  }, [rawRole, role]);

  // Derive active permissions for current user's role from authoritative system permissions
  const activeRolePermissions = useMemo(() => {
    if (!activeRoleName) return {};
    return allRolePermissions[activeRoleName] || allRolePermissions[role || ""] || DEFAULT_PERMISSIONS[activeRoleName] || {};
  }, [allRolePermissions, activeRoleName, role]);

  // Real-time synchronization of role permissions when active role changes
  useEffect(() => {
    if (!activeRoleName) return;
    try {
      const unsub = onSnapshot(doc(db, "roles", activeRoleName), (docSnap) => {
        if (docSnap.exists() && docSnap.data().modules) {
          const fsMods = docSnap.data().modules;
          setAllRolePermissions(prev => ({
            ...prev,
            [activeRoleName]: {
              ...(prev[activeRoleName] || {}),
              ...fsMods,
            }
          }));
        }
      }, () => {
        // quiet fallback
      });
      return () => unsub();
    } catch (e) {
      console.warn("Could not attach role permissions snapshot listener:", e);
    }
  }, [activeRoleName]);

  const canWrite = useCallback((module: string): boolean => {
    if (!user) return false;
    return canMutateModule(rawRole || role, activeRolePermissions, module, "write");
  }, [user, rawRole, role, activeRolePermissions]);

  // Comprehensive granular permission helpers
  const hasPermission = useCallback((menuIdOrRoute: string, action: PermissionAction): boolean => {
    if (!user) return false;
    const currentActiveRole = rawRole || role || "";
    return canAccessMenu(currentActiveRole, activeRolePermissions, menuIdOrRoute, action);
  }, [user, rawRole, role, activeRolePermissions]);

  const canView = useCallback((menuIdOrRoute: string): boolean => {
    return hasPermission(menuIdOrRoute, "view");
  }, [hasPermission]);

  const canCreate = useCallback((menuIdOrRoute: string): boolean => {
    return hasPermission(menuIdOrRoute, "create");
  }, [hasPermission]);

  const canEdit = useCallback((menuIdOrRoute: string): boolean => {
    return hasPermission(menuIdOrRoute, "edit");
  }, [hasPermission]);

  const canDeleteAction = useCallback((menuIdOrRoute: string): boolean => {
    return hasPermission(menuIdOrRoute, "delete");
  }, [hasPermission]);

  const canApprove = useCallback((menuIdOrRoute: string): boolean => {
    return hasPermission(menuIdOrRoute, "approve");
  }, [hasPermission]);

  const canExport = useCallback((menuIdOrRoute: string): boolean => {
    return hasPermission(menuIdOrRoute, "export");
  }, [hasPermission]);

  const canRead = useCallback((module: string): boolean => {
    if (!user) return false;
    return hasPermission(module, "view");
  }, [user, hasPermission]);

  const userName = useMemo(() => {
    if (!user) return "";
    if (userData?.fullName) return userData.fullName;
    if (userData?.name) return userData.name;
    if (user?.displayName) return user.displayName;
    if (user?.email) return user.email.split("@")[0];
    return "";
  }, [user, userData]);

  const userEmail = useMemo(() => {
    if (!user) return "";
    return userData?.email || user?.email || "";
  }, [user, userData]);

  const userAvatar = useMemo(() => {
    if (!user) return "";
    return userData?.imageUrl || userData?.photoUrl || user?.photoURL || "";
  }, [user, userData]);

  const isRoleReady = useMemo(() => !isAuthLoading && Boolean(user) && Boolean(role), [isAuthLoading, user, role]);
  const userRole = useMemo(() => (user && role) ? role : "", [user, role]);

  const value = useMemo(
    () => ({
      user,
      userData,
      role,
      rawRole,
      userName,
      userEmail,
      userAvatar,
      isAuthLoading,
      isRoleReady,
      isLoggingOut,
      userRole,
      rolePermissions: activeRolePermissions,
      isSuperAdmin,
      isSaaSAdmin,
      isAdmin,
      isGuru,
      isStudent,
      isParent,
      isKepalaSekolah,
      hasPermission,
      canView,
      canCreate,
      canEdit,
      canDelete: canDeleteAction,
      canApprove,
      canExport,
      canWrite,
      canRead,
      refreshUserData,
      logout,
    }),
    [
      user,
      userData,
      role,
      rawRole,
      userName,
      userEmail,
      userAvatar,
      isAuthLoading,
      isRoleReady,
      isLoggingOut,
      userRole,
      activeRolePermissions,
      isSuperAdmin,
      isSaaSAdmin,
      isAdmin,
      isGuru,
      isStudent,
      isParent,
      isKepalaSekolah,
      hasPermission,
      canView,
      canCreate,
      canEdit,
      canDeleteAction,
      canApprove,
      canExport,
      canWrite,
      canRead,
      refreshUserData,
      logout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
