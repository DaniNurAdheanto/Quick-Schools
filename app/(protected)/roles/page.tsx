"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  Save, 
  Check, 
  Search, 
  RotateCcw, 
  RefreshCw,
  Lock, 
  Eye, 
  Plus,
  Edit3, 
  Trash2,
  CheckCircle,
  Download,
  ShieldAlert,
  Shield,
  Users,
  ArrowUpRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { doc, setDoc, onSnapshot, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { 
  ROLES, 
  APP_MENUS, 
  DEFAULT_PERMISSIONS, 
  normalizeRole, 
  MenuPermission, 
  resolveMenuPermission,
  PermissionAction 
} from "@/lib/roles-config";

const ACTION_COLUMNS: { key: PermissionAction; label: string; desc: string; color: string; icon: any }[] = [
  { key: "view", label: "View", desc: "Akses & Lihat Data", color: "text-blue-600 bg-blue-50 border-blue-200", icon: Eye },
  { key: "create", label: "Create", desc: "Tambah Data Baru", color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: Plus },
  { key: "edit", label: "Edit", desc: "Ubah / Update Data", color: "text-amber-600 bg-amber-50 border-amber-200", icon: Edit3 },
  { key: "delete", label: "Delete", desc: "Hapus Data", color: "text-rose-600 bg-rose-50 border-rose-200", icon: Trash2 },
  { key: "approve", label: "Approve", desc: "Persetujuan / Validasi", color: "text-purple-600 bg-purple-50 border-purple-200", icon: CheckCircle },
  { key: "export", label: "Export", desc: "Ekspor Excel/PDF", color: "text-sky-600 bg-sky-50 border-sky-200", icon: Download },
];

export default function RolesAndPermissionsPage() {
  const toast = useToast();
  const { isSuperAdmin, isAdmin, userRole } = useAuth();
  const [activeRole, setActiveRole] = useState(ROLES[0].id);
  const [permissions, setPermissions] = useState<Record<string, Record<string, MenuPermission>>>(DEFAULT_PERMISSIONS);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Semua");
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // 1. Fetch stored permissions from backend API on mount
  useEffect(() => {
    const fetchApiPermissions = async () => {
      try {
        const res = await fetch("/api/roles");
        const data = await res.json();
        if (data.success && data.permissions) {
          setPermissions(prev => ({
            ...prev,
            ...data.permissions,
          }));
        }
      } catch (err) {
        console.warn("Could not fetch /api/roles on mount:", err);
      }
    };
    fetchApiPermissions();
  }, []);

  // 2. Subscribe to Firestore roles collection for live multi-tab synchronization
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "roles"), (snapshot) => {
      setPermissions(prev => {
        const updated = { ...prev };
        snapshot.docs.forEach(docSnap => {
          const roleId = docSnap.id;
          // Only process canonical role IDs
          if (!ROLES.some(r => r.id === roleId) && roleId !== "student" && roleId !== "teacher" && roleId !== "parent") {
            return;
          }
          const data = docSnap.data();
          if (data && data.modules) {
            const cleanedMods: Record<string, MenuPermission> = { ...(prev[roleId] || {}) };
            for (const [mId, mPerm] of Object.entries(data.modules)) {
              cleanedMods[mId] = resolveMenuPermission(mPerm as any);
            }
            updated[roleId] = cleanedMods;
          }
        });
        return updated;
      });
    }, (err) => {
      console.warn("Firestore roles query error, fallback to initial state:", err);
    });

    return () => unsub();
  }, []);

  // 3. Load authoritative real accounts strictly from PostgreSQL (/api/accounts)
  const loadAccounts = React.useCallback(async () => {
    try {
      setLoadingUsers(true);
      const res = await fetch("/api/accounts");
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        setUsersList(data.users);
      }
    } catch (err) {
      console.warn("Failed to load accounts from /api/accounts:", err);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
    const interval = setInterval(loadAccounts, 20000);
    return () => clearInterval(interval);
  }, [loadAccounts]);

  // Map users to roles strictly by user.role from database
  const roleUserMap = useMemo(() => {
    const map: Record<string, any[]> = {
      "super-admin": [],
      "admin": [],
      "guru": [],
      "siswa": [],
      "orang-tua": [],
      "kepala-sekolah": []
    };

    usersList.forEach(u => {
      const email = (u.email || "").toLowerCase().trim();
      let r = normalizeRole(u.role);

      if (email === "dani@gmail.com" || email === "superadmin@school.com") {
        r = "super-admin";
      }

      if (map[r]) {
        map[r].push(u);
      } else if (r === "student") {
        map["siswa"]?.push(u);
      } else if (r === "parent" || r === "orangtua") {
        map["orang-tua"]?.push(u);
      } else {
        map["admin"]?.push(u);
      }
    });

    return map;
  }, [usersList]);

  const activeRoleData = useMemo(() => {
    return ROLES.find(r => r.id === activeRole) || ROLES[0];
  }, [activeRole]);

  // Filter modules based on search and category
  const filteredModules = useMemo(() => {
    return APP_MENUS.filter(mod => {
      const matchesSearch = 
        mod.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        mod.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mod.route.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "Semua" || mod.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, categoryFilter]);

  // Toggle single action on single menu
  const handleToggle = (menuId: string, action: PermissionAction) => {
    if (activeRole === "super-admin") {
      toast.showInfo("Role Super Admin memiliki hak akses penuh mutlak pada seluruh fitur sistem.", "Akses Penuh");
      return;
    }

    if (menuId === "accounts") {
      toast.showWarning("Modul Manajemen Akun System bersifat eksklusif dan hanya dapat diakses oleh Super Admin.", "Akses Terkunci");
      return;
    }

    setPermissions(prev => {
      const currentRolePerms = prev[activeRole] || DEFAULT_PERMISSIONS[activeRole] || {};
      const currentModPerm = resolveMenuPermission(currentRolePerms[menuId]);
      const nextVal = !currentModPerm[action];

      const updatedModPerm: MenuPermission = {
        ...currentModPerm,
        [action]: nextVal,
      };

      // Cascade rule: enabling any mutation/export automatically enables view
      if (action !== "view" && nextVal) {
        updatedModPerm.view = true;
      }

      // Cascade rule: disabling view automatically disables all other actions
      if (action === "view" && !nextVal) {
        updatedModPerm.create = false;
        updatedModPerm.edit = false;
        updatedModPerm.delete = false;
        updatedModPerm.approve = false;
        updatedModPerm.export = false;
      }

      // Sync backward compatibility read/write
      updatedModPerm.read = updatedModPerm.view;
      updatedModPerm.write = updatedModPerm.create || updatedModPerm.edit;

      const updatedRole = {
        ...currentRolePerms,
        [menuId]: updatedModPerm,
      };

      const nextState: Record<string, Record<string, MenuPermission>> = {
        ...prev,
        [activeRole]: updatedRole,
      };

      if (activeRole === "siswa") nextState["student"] = updatedRole;
      if (activeRole === "orang-tua") {
        nextState["parent"] = updatedRole;
        nextState["orangtua"] = updatedRole;
      }
      if (activeRole === "guru") nextState["teacher"] = updatedRole;
      if (activeRole === "kepala-sekolah") nextState["kepalasekolah"] = updatedRole;

      return nextState;
    });
  };

  // Toggle Entire Column (View, Create, Edit, Delete, Approve, Export)
  const handleToggleColumn = (action: PermissionAction) => {
    if (activeRole === "super-admin") return;

    const currentRolePerms = permissions[activeRole] || DEFAULT_PERMISSIONS[activeRole] || {};
    const targetModules = filteredModules.filter(m => m.id !== "accounts");
    const allEnabled = targetModules.every(mod => {
      const p = resolveMenuPermission(currentRolePerms[mod.id]);
      return Boolean(p[action]);
    });
    const nextVal = !allEnabled;

    setPermissions(prev => {
      const nextRolePerms = { ...(prev[activeRole] || {}) };
      targetModules.forEach(mod => {
        const cur = resolveMenuPermission(nextRolePerms[mod.id]);
        const updated: MenuPermission = {
          ...cur,
          [action]: nextVal,
        };

        if (action !== "view" && nextVal) {
          updated.view = true;
        }
        if (action === "view" && !nextVal) {
          updated.create = false;
          updated.edit = false;
          updated.delete = false;
          updated.approve = false;
          updated.export = false;
        }

        updated.read = updated.view;
        updated.write = updated.create || updated.edit;
        nextRolePerms[mod.id] = updated;
      });

      const nextState = { ...prev, [activeRole]: nextRolePerms };
      if (activeRole === "siswa") nextState["student"] = nextRolePerms;
      if (activeRole === "orang-tua") {
        nextState["parent"] = nextRolePerms;
        nextState["orangtua"] = nextRolePerms;
      }
      return nextState;
    });
  };

  // Quick Preset Actions
  const applyPreset = (presetType: "standard" | "readOnly" | "fullWrite" | "clear") => {
    if (activeRole === "super-admin") return;

    let updatedModules: Record<string, MenuPermission> = {};

    if (presetType === "standard") {
      const canonicalDefaults = DEFAULT_PERMISSIONS[activeRole] || DEFAULT_PERMISSIONS["admin"];
      APP_MENUS.forEach(mod => {
        updatedModules[mod.id] = resolveMenuPermission(canonicalDefaults[mod.id]);
      });
      toast.showInfo(`Rekomendasi standar sekolah diterapkan untuk role ${activeRoleData.name}.`, "Preset Sekolah");
    } else if (presetType === "readOnly") {
      APP_MENUS.forEach(mod => {
        updatedModules[mod.id] = resolveMenuPermission({
          view: true,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          export: true,
        });
      });
      toast.showInfo(`Izin di-set ke Hanya Lihat (Read-Only) untuk seluruh menu.`, "Preset Read-Only");
    } else if (presetType === "fullWrite") {
      APP_MENUS.forEach(mod => {
        updatedModules[mod.id] = resolveMenuPermission({
          view: true,
          create: true,
          edit: true,
          delete: true,
          approve: true,
          export: true,
        });
      });
      toast.showInfo(`Izin Penuh (Akses Lengkap) diaktifkan untuk seluruh menu.`, "Preset Akses Penuh");
    } else if (presetType === "clear") {
      APP_MENUS.forEach(mod => {
        updatedModules[mod.id] = resolveMenuPermission({
          view: false,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          export: false,
        });
      });
      toast.showInfo(`Seluruh hak akses dibatasi untuk role ini.`, "Preset Dibatasi");
    }

    // Always enforce accounts lock for non-super-admin
    if (activeRole !== "super-admin") {
      updatedModules["accounts"] = resolveMenuPermission({
        view: false,
        create: false,
        edit: false,
        delete: false,
        approve: false,
        export: false,
      });
    }

    setPermissions(prev => ({
      ...prev,
      [activeRole]: updatedModules,
      ...(activeRole === "siswa" ? { student: updatedModules } : {}),
      ...(activeRole === "orang-tua" ? { parent: updatedModules, orangtua: updatedModules } : {}),
      ...(activeRole === "guru" ? { teacher: updatedModules } : {}),
      ...(activeRole === "kepala-sekolah" ? { kepalasekolah: updatedModules } : {}),
    }));
  };

  // Save updated permissions to backend API & Firestore
  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const roleModules = permissions[activeRole] || {};

      // 1. Post to backend API (persists to data/roles-permissions.json)
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId: activeRole,
          modules: roleModules,
          userRole: userRole,
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || "Gagal menyimpan ke server");
      }

      // 2. Broadcast local update immediately so AuthContext, Sidebar, and other tabs receive it instantly
      if (typeof window !== "undefined") {
        try {
          const cached = localStorage.getItem("quick_schools_role_permissions_v2");
          const currentCache = cached ? JSON.parse(cached) : {};
          currentCache[activeRole] = roleModules;
          if (activeRole === "siswa") currentCache["student"] = roleModules;
          if (activeRole === "orang-tua") {
            currentCache["parent"] = roleModules;
            currentCache["orangtua"] = roleModules;
          }
          if (activeRole === "guru") currentCache["teacher"] = roleModules;
          if (activeRole === "kepala-sekolah") currentCache["kepalasekolah"] = roleModules;

          localStorage.setItem("quick_schools_role_permissions_v2", JSON.stringify(currentCache));
          window.dispatchEvent(new CustomEvent("roles-permissions-updated"));
        } catch (e) {}
      }

      // 3. Sync to Firestore collection "roles" for live multi-device updates
      try {
        await setDoc(doc(db, "roles", activeRole), {
          roleId: activeRole,
          modules: roleModules,
          updatedAt: new Date().toISOString(),
        }, { merge: true });

        if (activeRole === "siswa") {
          await setDoc(doc(db, "roles", "student"), {
            roleId: "student",
            modules: roleModules,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        } else if (activeRole === "orang-tua") {
          await setDoc(doc(db, "roles", "parent"), {
            roleId: "parent",
            modules: roleModules,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        } else if (activeRole === "guru") {
          await setDoc(doc(db, "roles", "teacher"), {
            roleId: "teacher",
            modules: roleModules,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        } else if (activeRole === "kepala-sekolah") {
          await setDoc(doc(db, "roles", "kepalasekolah"), {
            roleId: "kepalasekolah",
            modules: roleModules,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        }
      } catch (fsErr) {
        console.warn("Firestore sync warning:", fsErr);
      }

      setIsSaving(false);
      setSaveSuccess(true);
      toast.showSuccess(
        `Konfigurasi hak akses role "${activeRoleData.name}" berhasil disimpan dan diterapkan di seluruh sistem.`,
        "Hak Akses Diperbarui"
      );
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error("Error saving role permissions:", err);
      setIsSaving(false);
      toast.showError(err.message || "Gagal menyimpan konfigurasi hak akses.", "Gagal Simpan");
    }
  };

  // Reset to Factory Default
  const handleResetToDefault = async () => {
    if (!confirm(`Apakah Anda yakin ingin mereset hak akses role "${activeRoleData.name}" ke konfigurasi standar sekolah?`)) {
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId: activeRole,
          reset: true,
          userRole: userRole,
        }),
      });

      const resData = await res.json();
      if (resData.success && resData.permissions) {
        setPermissions(prev => ({
          ...prev,
          [activeRole]: resData.permissions,
        }));

        if (typeof window !== "undefined") {
          try {
            const cached = localStorage.getItem("quick_schools_role_permissions_v2");
            const currentCache = cached ? JSON.parse(cached) : {};
            currentCache[activeRole] = resData.permissions;
            localStorage.setItem("quick_schools_role_permissions_v2", JSON.stringify(currentCache));
            window.dispatchEvent(new CustomEvent("roles-permissions-updated"));
          } catch (e) {}
        }

        toast.showSuccess(`Role ${activeRoleData.name} berhasil direset ke standar sekolah.`, "Reset Berhasil");
      }
    } catch (err: any) {
      toast.showError("Gagal mereset role ke standar.", "Gagal");
    } finally {
      setIsSaving(false);
    }
  };

  // If authenticated user is NOT Super Admin or Admin, block settings access
  if (!isSuperAdmin && !isAdmin) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-xl max-w-md space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-extrabold text-gray-900">Akses Pengaturan Terbatas</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Halaman konfigurasi <strong>Role & Permission</strong> hanya dapat diakses oleh Administrator Sekolah.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-[#531FFF] hover:bg-[#4314cc] text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
          >
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const rolePermsForActive = permissions[activeRole] || DEFAULT_PERMISSIONS[activeRole] || {};

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. HEADER SECTION                                             */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <span className="text-xs font-extrabold text-[#531FFF] uppercase tracking-wider">
              Kontrol Akses Terpadu (RBAC)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Role & Permission Management
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">
            Atur izin <strong>View, Create, Edit, Delete, Approve, dan Export</strong> per menu untuk setiap peran pengguna.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetToDefault}
            disabled={isSaving || activeRole === "super-admin"}
            className="px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-50 cursor-pointer active:scale-98"
            title="Kembalikan izin role ini ke standar rekomendasi sekolah"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Standar</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || activeRole === "super-admin"}
            className={cn(
              "px-5 py-2.5 rounded-xl text-white text-xs font-black flex items-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer",
              saveSuccess
                ? "bg-emerald-600 shadow-emerald-500/25"
                : "bg-[#531FFF] hover:bg-[#4314cc] shadow-[#531FFF]/25 disabled:opacity-50"
            )}
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-4 h-4 text-white" strokeWidth={3} />
                <span>Tersimpan!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan Hak Akses</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. ROLE SELECTOR TABS                                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {ROLES.map((r) => {
          const isActive = activeRole === r.id;
          const RoleIcon = r.icon;
          const count = roleUserMap[r.id]?.length || 0;

          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setActiveRole(r.id)}
              className={cn(
                "p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between group cursor-pointer",
                isActive
                  ? "bg-white border-[#531FFF] shadow-md shadow-[#531FFF]/10 ring-2 ring-[#531FFF]/15"
                  : "bg-white border-gray-100 hover:border-gray-200 hover:shadow-xs shadow-2xs"
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
                    isActive
                      ? "bg-[#531FFF] text-white"
                      : "bg-gray-100 text-gray-600 group-hover:bg-[#531FFF]/10 group-hover:text-[#531FFF]"
                  )}
                >
                  <RoleIcon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                  {count} Akun
                </span>
              </div>

              <div>
                <p className={cn("text-xs font-black truncate", isActive ? "text-[#531FFF]" : "text-gray-900")}>
                  {r.name}
                </p>
                <p className="text-[10px] text-gray-400 font-semibold truncate mt-0.5">
                  {r.badge}
                </p>
              </div>

              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#531FFF]" />
              )}
            </button>
          );
        })}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. ACTIVE ROLE BANNER & PRESETS                               */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-gray-100 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#531FFF] flex items-center justify-center shrink-0">
            {React.createElement(activeRoleData.icon, { className: "w-5 h-5" })}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-extrabold text-gray-900">
                Konfigurasi Hak Akses: {activeRoleData.name}
              </h2>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#531FFF]/10 text-[#531FFF]">
                {activeRoleData.badge}
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium mt-0.5 leading-relaxed">
              {activeRoleData.description}
            </p>
          </div>
        </div>

        {activeRole !== "super-admin" && (
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <span className="text-[11px] font-bold text-gray-400 mr-1 hidden sm:inline">
              Template Cepat:
            </span>
            <button
              type="button"
              onClick={() => applyPreset("standard")}
              className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer"
            >
              Standar Sekolah
            </button>
            <button
              type="button"
              onClick={() => applyPreset("readOnly")}
              className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors cursor-pointer"
            >
              Hanya Lihat (View Only)
            </button>
            <button
              type="button"
              onClick={() => applyPreset("fullWrite")}
              className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
            >
              Akses Penuh
            </button>
            <button
              type="button"
              onClick={() => applyPreset("clear")}
              className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors cursor-pointer"
            >
              Batas Total
            </button>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. PERMISSIONS MATRIX TABLE                                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
        {/* Table Toolbar: Search & Category Filter */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari menu, rute (/attendance), atau kata kunci..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {["Semua", "Umum", "Master Data", "Akademik", "Keuangan", "Komunikasi", "Sistem"].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-colors cursor-pointer",
                  categoryFilter === cat
                    ? "bg-[#531FFF] text-white shadow-2xs"
                    : "bg-white hover:bg-gray-100 text-gray-600 border border-gray-200"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Matrix Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                <th className="py-3.5 px-6 min-w-[240px]">Menu & Rute Aplikasi</th>
                <th className="py-3.5 px-4 text-center">Kategori</th>
                {ACTION_COLUMNS.map((col) => {
                  const Icon = col.icon;
                  return (
                    <th key={col.key} className="py-3.5 px-3 text-center min-w-[100px]">
                      <button
                        type="button"
                        onClick={() => handleToggleColumn(col.key)}
                        disabled={activeRole === "super-admin"}
                        className="inline-flex items-center gap-1 hover:text-[#531FFF] transition-colors cursor-pointer group"
                        title={`Klik untuk toggle seluruh kolom ${col.label}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{col.label}</span>
                      </button>
                      <div className="text-[9px] font-medium text-gray-400 normal-case tracking-normal">
                        {col.desc}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filteredModules.length > 0 ? (
                filteredModules.map((menu) => {
                  const modPerm = resolveMenuPermission(rolePermsForActive[menu.id]);
                  const isAccountsMenu = menu.id === "accounts";
                  const isAccountsLocked = isAccountsMenu && activeRole !== "super-admin";
                  const MenuIcon = menu.icon;

                  return (
                    <tr
                      key={menu.id}
                      className={cn(
                        "hover:bg-purple-50/20 transition-colors group",
                        isAccountsLocked && "bg-rose-50/15"
                      )}
                    >
                      {/* Menu Name, Icon & Route */}
                      <td className="py-3 px-6">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-[#531FFF]/10 text-gray-600 group-hover:text-[#531FFF] flex items-center justify-center shrink-0 transition-colors mt-0.5">
                            <MenuIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-gray-900 group-hover:text-[#531FFF] transition-colors">
                                {menu.name}
                              </span>
                              <code className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                {menu.route}
                              </code>
                              {isAccountsMenu && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                                  <Lock className="w-2.5 h-2.5" />
                                  Super Admin
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                              {menu.description}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="px-2 py-1 rounded-md text-[10px] font-extrabold bg-gray-100 text-gray-600 border border-gray-200">
                          {menu.category}
                        </span>
                      </td>

                      {/* View Action Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <PermissionToggle
                          checked={modPerm.view}
                          onChange={() => handleToggle(menu.id, "view")}
                          disabled={activeRole === "super-admin" || isAccountsLocked}
                          activeColor="bg-blue-600 border-blue-600"
                        />
                      </td>

                      {/* Create Action Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <PermissionToggle
                          checked={modPerm.create}
                          onChange={() => handleToggle(menu.id, "create")}
                          disabled={activeRole === "super-admin" || isAccountsLocked}
                          activeColor="bg-emerald-600 border-emerald-600"
                        />
                      </td>

                      {/* Edit Action Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <PermissionToggle
                          checked={modPerm.edit}
                          onChange={() => handleToggle(menu.id, "edit")}
                          disabled={activeRole === "super-admin" || isAccountsLocked}
                          activeColor="bg-amber-600 border-amber-600"
                        />
                      </td>

                      {/* Delete Action Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <PermissionToggle
                          checked={modPerm.delete}
                          onChange={() => handleToggle(menu.id, "delete")}
                          disabled={activeRole === "super-admin" || isAccountsLocked}
                          activeColor="bg-rose-600 border-rose-600"
                        />
                      </td>

                      {/* Approve Action Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <PermissionToggle
                          checked={modPerm.approve}
                          onChange={() => handleToggle(menu.id, "approve")}
                          disabled={activeRole === "super-admin" || isAccountsLocked}
                          activeColor="bg-purple-600 border-purple-600"
                        />
                      </td>

                      {/* Export Action Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <PermissionToggle
                          checked={modPerm.export}
                          onChange={() => handleToggle(menu.id, "export")}
                          disabled={activeRole === "super-admin" || isAccountsLocked}
                          activeColor="bg-sky-600 border-sky-600"
                        />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400 font-medium">
                    Tidak ada menu yang sesuai dengan pencarian atau filter kategori.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Matrix Footer Note */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 font-medium">
          <p>
            Menampilkan <strong className="text-gray-900">{filteredModules.length}</strong> menu fitur RBAC terkonfigurasi.
          </p>
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Tersinkronisasi langsung dengan Sidebar, Route Guard, dan Aksi CRUD</span>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. REGISTERED USERS UNDER THIS ROLE                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#531FFF] flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-gray-900">
                  Pengguna dengan Role {activeRoleData.name} ({roleUserMap[activeRole]?.length || 0} akun)
                </h3>
                {loadingUsers && (
                  <RefreshCw className="w-3 h-3 text-[#531FFF] animate-spin" />
                )}
              </div>
              <p className="text-[11px] text-gray-500 font-medium">
                Daftar akun riil dari database yang saat ini terpengaruh oleh konfigurasi hak akses di atas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={loadAccounts}
              disabled={loadingUsers}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all cursor-pointer disabled:opacity-50"
              title="Segarkan daftar pengguna terbaru dari database"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 text-gray-500", loadingUsers && "animate-spin text-[#531FFF]")} />
              <span>Segarkan Data</span>
            </button>

            {isSuperAdmin && (
              <Link
                href="/accounts"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#531FFF] bg-[#F3F0FF] hover:bg-[#531FFF] hover:text-white transition-all cursor-pointer"
              >
                <span>Kelola di Akun System</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>

        {(roleUserMap[activeRole] || []).length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(roleUserMap[activeRole] || []).map((acc) => {
              const extraInfo = acc.role === "guru"
                ? (acc.nip ? `NIP: ${acc.nip}` : acc.subject || "Guru Mata Pelajaran")
                : acc.role === "siswa"
                ? (acc.className ? `${acc.className}${acc.nisn ? ` • NISN: ${acc.nisn}` : ""}` : (acc.nisn ? `NISN: ${acc.nisn}` : "Siswa"))
                : acc.role === "orang-tua"
                ? (acc.studentName ? `Wali dari: ${acc.studentName}` : "Wali Murid")
                : acc.role === "kepala-sekolah"
                ? "Kepala Sekolah Quick Schools"
                : acc.role === "super-admin"
                ? "Super Administrator"
                : "Staff Administrasi";

              return (
                <div
                  key={acc.id || acc.uid || acc.email}
                  className="p-3.5 bg-gray-50/70 hover:bg-purple-50/30 border border-gray-200/80 hover:border-purple-200 rounded-xl flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#531FFF] to-[#8252FF] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      {(acc.name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{acc.name}</p>
                      <p className="text-[11px] text-gray-500 font-medium truncate">{acc.email}</p>
                      <p className="text-[10px] text-[#531FFF] font-semibold truncate mt-0.5">
                        {extraInfo}
                      </p>
                    </div>
                  </div>

                  <span className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-extrabold border shrink-0",
                    acc.status === "Aktif"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : acc.status === "Belum Onboarding"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-gray-100 text-gray-600 border-gray-200"
                  )}>
                    {acc.status || "Aktif"}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-400 text-xs font-medium bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
            Belum ada akun pengguna yang terdaftar dengan peran {activeRoleData.name}.
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Reusable interactive permission checkbox component
 */
function PermissionToggle({
  checked,
  onChange,
  disabled = false,
  activeColor = "bg-[#531FFF] border-[#531FFF]",
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  activeColor?: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={cn(
        "w-6 h-6 rounded-lg border flex items-center justify-center transition-all mx-auto",
        disabled ? "opacity-30 cursor-not-allowed bg-gray-100 border-gray-200" : "cursor-pointer active:scale-90",
        checked
          ? `${activeColor} text-white shadow-xs`
          : "bg-white border-gray-300 hover:border-gray-400 text-transparent"
      )}
    >
      <Check className={cn("w-3.5 h-3.5 transition-transform", checked ? "scale-100 text-white" : "scale-0")} strokeWidth={3} />
    </button>
  );
}
