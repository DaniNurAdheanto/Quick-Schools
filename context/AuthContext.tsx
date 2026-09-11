"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { 
  DEFAULT_PERMISSIONS, 
  isSuperAdminRole, 
  isStudentRole, 
  isTeacherRole,
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
  rolePermissions: Record<string, ModulePermission>;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isGuru: boolean;
  isStudent: boolean;
  isParent: boolean;
  isKepalaSekolah: boolean;
  refreshUserData: () => Promise<void>;
  logout: () => Promise<void>;
}

const AUTH_CACHE_KEY = "qs_auth_role_cache_v1";

function normalizeRole(rawRole?: string | null): UserRole {
  if (!rawRole) return "admin";
  const r = rawRole.toLowerCase().trim().replace(/[-_ ]/g, "");
  if (r === "superadmin") return "super-admin";
  if (r === "guru" || r === "teacher") return "guru";
  if (r === "siswa" || r === "student") return "siswa";
  if (r === "orangtua" || r === "parent" || r === "walimurid") return "orang-tua";
  if (r === "kepalasekolah" || r === "principal") return "kepala-sekolah";
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
  rolePermissions: {},
  isSuperAdmin: false,
  isAdmin: false,
  isGuru: false,
  isStudent: false,
  isParent: false,
  isKepalaSekolah: false,
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
  const [rolePermissions, setRolePermissions] = useState<Record<string, ModulePermission>>(
    initialCached?.role ? (DEFAULT_PERMISSIONS[normalizeRole(initialCached.role)] || {}) : {}
  );

  const fetchUserData = useCallback(async (firebaseUser: User) => {
    try {
      const userRef = doc(db, "users", firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfileData;
        const uRawRole = data.role || "admin";
        const normalized = normalizeRole(uRawRole);

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
      } else {
        // Fallback for user record not in firestore yet
        const defaultRole = "admin";
        setRawRole(defaultRole);
        setRole(defaultRole);
        setUserData({ uid: firebaseUser.uid, email: firebaseUser.email || "", role: defaultRole });
        setRolePermissions(DEFAULT_PERMISSIONS[defaultRole]);
      }
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

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserData(null);
      setRole(null);
      setRawRole("");
      setRolePermissions({});
      localStorage.removeItem(AUTH_CACHE_KEY);
    } catch (err) {
      console.error("Logout error:", err);
    }
  }, []);

  // Compute convenient role checks
  const isSuperAdmin = useMemo(() => isSuperAdminRole(rawRole) || role === "super-admin", [rawRole, role]);
  const isGuru = useMemo(() => isTeacherRole(rawRole) || role === "guru", [rawRole, role]);
  const isStudent = useMemo(() => isStudentRole(rawRole) || role === "siswa", [rawRole, role]);
  const isParent = useMemo(() => role === "orang-tua", [role]);
  const isKepalaSekolah = useMemo(() => role === "kepala-sekolah", [role]);
  const isAdmin = useMemo(() => role === "admin" && !isSuperAdmin, [role, isSuperAdmin]);

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
      rolePermissions,
      isSuperAdmin,
      isAdmin,
      isGuru,
      isStudent,
      isParent,
      isKepalaSekolah,
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
      rolePermissions,
      isSuperAdmin,
      isAdmin,
      isGuru,
      isStudent,
      isParent,
      isKepalaSekolah,
      refreshUserData,
      logout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
