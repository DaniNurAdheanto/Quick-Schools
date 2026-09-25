"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { User, onAuthStateChanged, signOut, deleteUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { 
  DEFAULT_PERMISSIONS, 
  isSuperAdminRole, 
  isStudentRole, 
  isTeacherRole,
  isParentRole,
  isKepalaSekolahRole,
  canMutateModule,
  ModulePermission
} from "@/lib/roles-config";

export type UserRole = "super-admin" | "admin" | "guru" | "siswa" | "orang-tua" | "kepala-sekolah";

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
  isAdmin: boolean;
  isGuru: boolean;
  isStudent: boolean;
  isParent: boolean;
  isKepalaSekolah: boolean;
  canWrite: (module: string) => boolean;
  canDelete: (module: string) => boolean;
  canRead: (module: string) => boolean;
  refreshUserData: () => Promise<void>;
  logout: (redirectTo?: string) => Promise<void>;
}

const AUTH_CACHE_KEY = "quick_schools_auth_session";

function normalizeRole(roleStr: string = ""): UserRole {
  const r = (roleStr || "").toLowerCase().trim();
  if (r === "super-admin" || r === "superadmin" || r === "owner" || r === "developer") return "super-admin";
  if (r === "guru" || r === "teacher" || r === "pengajar") return "guru";
  if (r === "siswa" || r === "student" || r === "murid") return "siswa";
  if (r === "orang-tua" || r === "orang tua" || r === "wali" || r === "wali-murid" || r === "parent") return "orang-tua";
  if (
    r === "kepala-sekolah" || 
    r === "kepala sekolah" || 
    r === "kepala_sekolah" || 
    r === "kepsek" || 
    r === "principal" || 
    r === "headmaster"
  ) return "kepala-sekolah";
  return "admin";
}

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
  isAdmin: false,
  isGuru: false,
  isStudent: false,
  isParent: false,
  isKepalaSekolah: false,
  canWrite: () => false,
  canDelete: () => false,
  canRead: () => false,
  refreshUserData: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Read initial cache if present to prevent any layout jumping
  const initialCached = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(AUTH_CACHE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }, []);

  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserProfileData | null>(initialCached?.userData || null);
  const [role, setRole] = useState<UserRole | null>(initialCached?.role ? normalizeRole(initialCached.role) : null);
  const [rawRole, setRawRole] = useState<string>(initialCached?.rawRole || "");
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [rolePermissions, setRolePermissions] = useState<Record<string, ModulePermission>>(
    initialCached?.role ? (DEFAULT_PERMISSIONS[normalizeRole(initialCached.role)] || {}) : {}
  );

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

      let userSnap = await getDoc(doc(db, "users", firebaseUser.uid));
      // If user document is not found, wait briefly to avoid registration race condition before checking again
      if (!userSnap.exists() && !delDocExists) {
        await new Promise((r) => setTimeout(r, 600));
        userSnap = await getDoc(doc(db, "users", firebaseUser.uid));
      }

      const isDeleted = delDocExists || !userSnap.exists();

      if (isDeleted) {
        console.warn("Deleted or unauthorized account detected:", firebaseUser.uid);
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
        setRolePermissions({});
        try {
          localStorage.removeItem(AUTH_CACHE_KEY);
        } catch (e) {}
        setIsAuthLoading(false);
        return;
      }

      let data = userSnap.data() as UserProfileData;

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
        setRolePermissions({});
        try {
          localStorage.removeItem(AUTH_CACHE_KEY);
        } catch (e) {}
        setIsAuthLoading(false);
        return;
      }

      const uRawRole = data.role || "admin";
      const normalized = normalizeRole(uRawRole);

      // If parent role, merge data from parents collection to ensure complete student links
      if (normalized === "orang-tua") {
        try {
          const parentRef = doc(db, "parents", firebaseUser.uid);
          const parentSnap = await getDoc(parentRef);
          if (parentSnap.exists()) {
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
            };
          }
        } catch (pe) {}
      }

      setUserData(data);
      setRawRole(uRawRole);
      setRole(normalized);

      // Fetch custom role permissions from roles/{normalized} or fallback
      let perms = DEFAULT_PERMISSIONS[normalized] || DEFAULT_PERMISSIONS["admin"] || {};
      try {
        const roleDocRef = doc(db, "roles", normalized);
        const roleSnap = await getDoc(roleDocRef);
        if (roleSnap.exists() && roleSnap.data().modules) {
          perms = roleSnap.data().modules;
        }
      } catch (err) {}
      setRolePermissions(perms);

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
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await fetchUserData(currentUser);
      } else {
        setUser(null);
        setUserData(null);
        setRole(null);
        setRawRole("");
        setRolePermissions({});
        setIsAuthLoading(false);
        try {
          localStorage.removeItem(AUTH_CACHE_KEY);
        } catch (e) {}
      }
    });

    return () => unsubscribe();
  }, [fetchUserData]);

  const refreshUserData = useCallback(async () => {
    if (auth.currentUser) {
      setIsAuthLoading(true);
      await fetchUserData(auth.currentUser);
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

      // Sign out from Firebase
      await signOut(auth);

      setUser(null);
      setUserData(null);
      setRole(null);
      setRawRole("");
      setRolePermissions({});

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

  // Compute convenient role checks
  const isSuperAdmin = useMemo(() => isSuperAdminRole(rawRole) || isSuperAdminRole(role) || role === "super-admin", [rawRole, role]);
  const isGuru = useMemo(() => isTeacherRole(rawRole) || isTeacherRole(role) || role === "guru", [rawRole, role]);
  const isStudent = useMemo(() => isStudentRole(rawRole) || isStudentRole(role) || role === "siswa", [rawRole, role]);
  const isParent = useMemo(() => isParentRole(rawRole) || isParentRole(role) || role === "orang-tua", [rawRole, role]);
  const isKepalaSekolah = useMemo(() => isKepalaSekolahRole(rawRole) || isKepalaSekolahRole(role) || role === "kepala-sekolah", [rawRole, role]);
  const isAdmin = useMemo(() => (role === "admin" || (rawRole || "").toLowerCase() === "admin") && !isSuperAdmin && !isKepalaSekolah, [role, rawRole, isSuperAdmin, isKepalaSekolah]);

  const canWrite = useCallback((module: string): boolean => {
    return canMutateModule(rawRole || role, rolePermissions, module, "write");
  }, [rawRole, role, rolePermissions]);

  const canDelete = useCallback((module: string): boolean => {
    return canMutateModule(rawRole || role, rolePermissions, module, "delete");
  }, [rawRole, role, rolePermissions]);

  const canRead = useCallback((module: string): boolean => {
    const activeR = rawRole || role;
    if (isSuperAdminRole(activeR)) return true;
    if (rolePermissions && rolePermissions[module]) {
      return Boolean(rolePermissions[module].read);
    }
    const def = DEFAULT_PERMISSIONS[role || "admin"];
    return def && def[module] ? Boolean(def[module].read) : false;
  }, [rawRole, role, rolePermissions]);

  const userName = useMemo(() => {
    if (userData?.fullName) return userData.fullName;
    if (userData?.name) return userData.name;
    if (user?.displayName) return user.displayName;
    if (user?.email) return user.email.split("@")[0];
    return "";
  }, [userData, user]);

  const userEmail = useMemo(() => {
    return userData?.email || user?.email || "";
  }, [userData, user]);

  const userAvatar = useMemo(() => {
    return userData?.imageUrl || userData?.photoUrl || user?.photoURL || "";
  }, [userData, user]);

  const isRoleReady = useMemo(() => !isAuthLoading && Boolean(role), [isAuthLoading, role]);
  const userRole = useMemo(() => role || "", [role]);

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
      rolePermissions,
      isSuperAdmin,
      isAdmin,
      isGuru,
      isStudent,
      isParent,
      isKepalaSekolah,
      canWrite,
      canDelete,
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
      rolePermissions,
      isSuperAdmin,
      isAdmin,
      isGuru,
      isStudent,
      isParent,
      isKepalaSekolah,
      canWrite,
      canDelete,
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
