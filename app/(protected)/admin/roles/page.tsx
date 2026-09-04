"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  ShieldCheck, 
  Users, 
  GraduationCap, 
  User, 
  Save, 
  Check, 
  Info,
  BookUser,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { doc, getDoc, setDoc, onSnapshot, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/context/ToastContext";

export const ROLES = [
  { 
    id: "admin", 
    name: "Admin", 
    icon: ShieldCheck, 
    needs: "Kontrol & Manajemen",
    journey: "Setup → input data → monitoring → reporting",
    description: "Akses pengelolaan data sekolah dan operasional." 
  },
  { 
    id: "guru", 
    name: "Guru", 
    icon: GraduationCap, 
    needs: "Kemudahan Mengajar",
    journey: "Login → mengajar → beri tugas → nilai → monitoring",
    description: "Akses fitur akademik, absensi, dan penilaian." 
  },
  { 
    id: "siswa", 
    name: "Siswa", 
    icon: User, 
    needs: "Akses belajar",
    journey: "Login → belajar → submit tugas → lihat nilai",
    description: "Akses untuk melihat jadwal, tugas, dan nilai sendiri." 
  },
  { 
    id: "orang-tua", 
    name: "Orang Tua", 
    icon: Users, 
    needs: "Monitoring & pembayaran",
    journey: "Login → monitoring → bayar → komunikasi",
    description: "Akses memantau perkembangan dan tagihan anak." 
  },
  { 
    id: "kepala-sekolah", 
    name: "Kepala Sekolah", 
    icon: BookUser, 
    needs: "Insight & laporan",
    journey: "Login → monitoring",
    description: "Akses pemantauan insight dan pelaporan seluruh aktivitas sekolah." 
  },
  { 
    id: "super-admin", 
    name: "Super Admin", 
    icon: ShieldAlert, 
    needs: "Akses Sistem Penuh",
    journey: "Sistem Manajemen Role dan Permission",
    description: "Akses penuh ke seluruh sistem." 
  },
];

export const PERMISSION_MODULES = [
  { id: "dashboard", name: "Dashboard & Analytics" },
  { id: "users", name: "Manajemen Pengguna (Siswa/Guru)" },
  { id: "academic", name: "Akademik (Jadwal/Kelas/Pelajaran)" },
  { id: "attendance", name: "Absensi" },
  { id: "grades", name: "Penilaian & Rapor" },
  { id: "finance", name: "Keuangan & SPP" },
  { id: "announcements", name: "Pengumuman" },
  { id: "settings", name: "Pengaturan Sistem" },
];

export const DEFAULT_PERMISSIONS: Record<string, Record<string, { read: boolean; write: boolean; delete: boolean }>> = {
  "super-admin": {},
  "admin": {
    "dashboard": { read: true, write: true, delete: false },
    "users": { read: true, write: true, delete: false },
    "academic": { read: true, write: true, delete: false },
    "attendance": { read: true, write: true, delete: false },
    "grades": { read: true, write: true, delete: false },
    "finance": { read: true, write: true, delete: false },
    "announcements": { read: true, write: true, delete: false },
    "settings": { read: true, write: true, delete: false },
  },
  "guru": {
    "dashboard": { read: true, write: false, delete: false },
    "users": { read: true, write: false, delete: false },
    "academic": { read: true, write: false, delete: false },
    "attendance": { read: true, write: true, delete: false },
    "grades": { read: true, write: true, delete: false },
    "finance": { read: false, write: false, delete: false },
    "announcements": { read: true, write: false, delete: false },
    "settings": { read: false, write: false, delete: false },
  },
  "siswa": {
    "dashboard": { read: true, write: false, delete: false },
    "users": { read: false, write: false, delete: false },
    "academic": { read: true, write: false, delete: false },
    "attendance": { read: true, write: false, delete: false },
    "grades": { read: true, write: false, delete: false },
    "finance": { read: true, write: false, delete: false },
    "announcements": { read: true, write: false, delete: false },
    "settings": { read: false, write: false, delete: false },
  },
  "student": {
    "dashboard": { read: true, write: false, delete: false },
    "users": { read: false, write: false, delete: false },
    "academic": { read: true, write: false, delete: false },
    "attendance": { read: true, write: false, delete: false },
    "grades": { read: true, write: false, delete: false },
    "finance": { read: true, write: false, delete: false },
    "announcements": { read: true, write: false, delete: false },
    "settings": { read: false, write: false, delete: false },
  },
  "orang-tua": {
    "dashboard": { read: true, write: false, delete: false },
    "users": { read: false, write: false, delete: false },
    "academic": { read: true, write: false, delete: false },
    "attendance": { read: true, write: false, delete: false },
    "grades": { read: true, write: false, delete: false },
    "finance": { read: true, write: false, delete: false },
    "announcements": { read: true, write: false, delete: false },
    "settings": { read: false, write: false, delete: false },
  },
  "kepala-sekolah": {
    "dashboard": { read: true, write: false, delete: false },
    "users": { read: true, write: false, delete: false },
    "academic": { read: true, write: false, delete: false },
    "attendance": { read: true, write: false, delete: false },
    "grades": { read: true, write: false, delete: false },
    "finance": { read: true, write: false, delete: false },
    "announcements": { read: true, write: false, delete: false },
    "settings": { read: false, write: false, delete: false },
  },
};

PERMISSION_MODULES.forEach(mod => {
  if (!DEFAULT_PERMISSIONS["super-admin"]) {
    DEFAULT_PERMISSIONS["super-admin"] = {};
  }
  DEFAULT_PERMISSIONS["super-admin"][mod.id] = { read: true, write: true, delete: true };
});

export default function RolesAndPermissionsPage() {
  const toast = useToast();
  const [activeRole, setActiveRole] = useState(ROLES[0].id);
  const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  // Subscribe to Firestore roles collection
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "roles"), (snapshot) => {
      const dbPerms = { ...DEFAULT_PERMISSIONS };
      snapshot.docs.forEach(docSnap => {
        const roleId = docSnap.id;
        dbPerms[roleId] = docSnap.data().modules || DEFAULT_PERMISSIONS[roleId] || {};
      });
      setPermissions(dbPerms);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching roles from Firestore:", err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleToggle = (moduleId: string, action: "read" | "write" | "delete") => {
    if (activeRole === "super-admin") return;

    setPermissions(prev => {
      const currentRolePerms = prev[activeRole] || DEFAULT_PERMISSIONS[activeRole] || {};
      const modPerms = { ...(currentRolePerms[moduleId] || { read: false, write: false, delete: false }) };
      modPerms[action] = !modPerms[action];
      
      if ((action === "write" || action === "delete") && modPerms[action]) {
        modPerms.read = true;
      }
      if (action === "read" && !modPerms[action]) {
        modPerms.write = false;
        modPerms.delete = false;
      }

      const updatedRole = { ...currentRolePerms, [moduleId]: modPerms };
      const nextPerms = { ...prev, [activeRole]: updatedRole };
      
      // Keep "student" role in sync with "siswa"
      if (activeRole === "siswa") {
        nextPerms["student"] = updatedRole;
      }

      return nextPerms;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // Save current active role modules to Firestore
      const roleModules = permissions[activeRole] || {};
      await setDoc(doc(db, "roles", activeRole), {
        roleId: activeRole,
        modules: roleModules,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // If active role is siswa, also sync student
      if (activeRole === "siswa") {
        await setDoc(doc(db, "roles", "student"), {
          roleId: "student",
          modules: roleModules,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      setIsSaving(false);
      setSaveSuccess(true);
      toast.showEdit(`Konfigurasi hak akses role ${activeRole.toUpperCase()} berhasil diperbarui.`, "Berhasil Edit");
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving role permissions:", err);
      setIsSaving(false);
      toast.showError("Gagal menyimpan konfigurasi hak akses.", "Gagal");
    }
  };

  const activeRoleData = ROLES.find(r => r.id === activeRole);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Role & Permission</h1>
          <p className="text-gray-500 mt-1">Kelola hak akses (RBAC) untuk berbagai peran pengguna dalam sistem secara real-time.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving || activeRole === "super-admin"}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-full font-medium transition-all text-sm shadow-sm",
            activeRole === "super-admin"
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : saveSuccess
                ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                : "bg-[#531FFF] hover:bg-[#531FFF]/90 text-white"
          )}
        >
          {saveSuccess ? (
            <>
              <Check className="w-4 h-4" />
              Tersimpan di Database!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Roles Sidebar */}
        <div className="lg:col-span-1 bg-white border border-gray-100 rounded-3xl p-4 shadow-sm h-fit">
          <h2 className="text-sm font-semibold text-gray-900 px-4 mb-3 uppercase tracking-wider">Peran Pengguna</h2>
          <div className="space-y-1">
            {ROLES.map((role) => {
              const Icon = role.icon;
              const isActive = activeRole === role.id;

              return (
                <button
                  key={role.id}
                  onClick={() => setActiveRole(role.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all",
                    isActive 
                      ? "bg-[#531FFF] text-white shadow-md shadow-[#531FFF]/20" 
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-xl shrink-0",
                    isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold leading-tight">{role.name}</div>
                    <div className={cn("text-[11px] truncate max-w-[140px]", isActive ? "text-white/80" : "text-gray-400")}>
                      {role.needs}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Permissions Table */}
        <div className="lg:col-span-3 space-y-6">
          {/* Info Card */}
          {activeRoleData && (
            <div className="bg-gradient-to-r from-[#531FFF]/5 to-transparent border border-[#531FFF]/10 rounded-3xl p-5 flex items-start gap-4">
              <div className="p-3 bg-white rounded-2xl border border-[#531FFF]/10 text-[#531FFF] shrink-0 shadow-xs">
                <Info className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-gray-900 text-sm">Hak Akses: {activeRoleData.name}</h3>
                <p className="text-xs text-gray-600 leading-relaxed">{activeRoleData.description}</p>
                <div className="text-[11px] font-medium text-[#531FFF] pt-1">
                  Alur Pengguna: {activeRoleData.journey}
                </div>
              </div>
            </div>
          )}

          {/* Matrix Table */}
          <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Modul Fitur</span>
              <span className="text-xs text-gray-400">Centang opsi untuk memberikan izin</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Nama Modul</th>
                    <th className="px-6 py-4 text-center">Lihat (Read)</th>
                    <th className="px-6 py-4 text-center">Tambah/Edit (Write)</th>
                    <th className="px-6 py-4 text-center">Hapus (Delete)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                  {PERMISSION_MODULES.map((mod) => {
                    const rolePerms = permissions[activeRole] || DEFAULT_PERMISSIONS[activeRole] || {};
                    const modPerms = rolePerms[mod.id] || { read: false, write: false, delete: false };

                    return (
                      <tr key={mod.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-800">
                          {mod.name}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <PermissionCheckbox 
                            checked={modPerms.read} 
                            onChange={() => handleToggle(mod.id, "read")}
                            disabled={activeRole === "super-admin"}
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <PermissionCheckbox 
                            checked={modPerms.write} 
                            onChange={() => handleToggle(mod.id, "write")}
                            disabled={activeRole === "super-admin"}
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <PermissionCheckbox 
                            checked={modPerms.delete} 
                            onChange={() => handleToggle(mod.id, "delete")}
                            disabled={activeRole === "super-admin" || (!modPerms.write && !modPerms.read)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PermissionCheckbox({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <label className={cn(
      "relative inline-flex items-center justify-center cursor-pointer p-2 rounded-lg transition-all",
      disabled ? "cursor-not-allowed opacity-60" : "hover:bg-gray-100"
    )}>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <div className={cn(
        "w-6 h-6 flex items-center justify-center rounded-md border transition-all duration-200",
        checked 
          ? "bg-[#531FFF] border-[#531FFF] text-white shadow-sm" 
          : "bg-white border-gray-300 text-transparent"
      )}>
        <Check className="w-3.5 h-3.5" strokeWidth={3} />
      </div>
    </label>
  );
}
