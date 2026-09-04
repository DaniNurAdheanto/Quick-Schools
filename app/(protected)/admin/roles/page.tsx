"use client";

import React, { useState } from "react";
import { 
  ShieldAlert, 
  ShieldCheck, 
  Users, 
  GraduationCap, 
  User, 
  Save, 
  Check, 
  Info,
  BookUser
} from "lucide-react";
import { cn } from "@/lib/utils";

const ROLES = [
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

const PERMISSION_MODULES = [
  { id: "dashboard", name: "Dashboard & Analytics" },
  { id: "users", name: "Manajemen Pengguna (Siswa/Guru)" },
  { id: "academic", name: "Akademik (Jadwal/Kelas/Pelajaran)" },
  { id: "attendance", name: "Absensi" },
  { id: "grades", name: "Penilaian & Rapor" },
  { id: "finance", name: "Keuangan & SPP" },
  { id: "announcements", name: "Pengumuman" },
  { id: "settings", name: "Pengaturan Sistem" },
];

const DEFAULT_PERMISSIONS: Record<string, Record<string, { read: boolean; write: boolean; delete: boolean }>> = {
  "super-admin": {}, // akan di set true semua
  "admin": {
    "dashboard": { read: true, write: false, delete: false },
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

// Initialize super-admin with all true
PERMISSION_MODULES.forEach(mod => {
  if (!DEFAULT_PERMISSIONS["super-admin"]) {
    DEFAULT_PERMISSIONS["super-admin"] = {};
  }
  DEFAULT_PERMISSIONS["super-admin"][mod.id] = { read: true, write: true, delete: true };
});

export default function RolesAndPermissionsPage() {
  const [activeRole, setActiveRole] = useState(ROLES[0].id);
  const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleToggle = (moduleId: string, action: "read" | "write" | "delete") => {
    if (activeRole === "super-admin") return;

    setPermissions(prev => {
      const rolePerms = { ...prev[activeRole] };
      const modPerms = { ...rolePerms[moduleId] };
      modPerms[action] = !modPerms[action];
      
      if ((action === "write" || action === "delete") && modPerms[action]) {
        modPerms.read = true;
      }
      if (action === "read" && !modPerms[action]) {
        modPerms.write = false;
        modPerms.delete = false;
      }

      rolePerms[moduleId] = modPerms;
      return { ...prev, [activeRole]: rolePerms };
    });
  };

  const handleSave = () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 1000);
  };

  const activeRoleData = ROLES.find(r => r.id === activeRole);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Role & Permission</h1>
          <p className="text-gray-500 mt-1">Kelola hak akses (RBAC) untuk berbagai peran pengguna dalam sistem.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving || activeRole === "super-admin"}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-full font-medium transition-all text-sm",
            activeRole === "super-admin"
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : saveSuccess
                ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
          )}
        >
          {saveSuccess ? (
            <>
              <Check className="w-4 h-4" />
              Tersimpan
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
                    "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left",
                    isActive
                      ? "bg-blue-50/50 text-blue-900 shadow-sm ring-1 ring-blue-100/50"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-xl transition-colors",
                    isActive ? "bg-white shadow-sm text-blue-600" : "bg-gray-100 text-gray-500"
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{role.name}</div>
                    {isActive && (
                      <div className="text-[10px] text-blue-600 font-medium mt-0.5">Role Aktif</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Permissions Main Area */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                  {activeRoleData && <activeRoleData.icon className="w-6 h-6" />}
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-gray-900">Hak Akses: {activeRoleData?.name}</h2>
                </div>
              </div>
              
              {activeRole === "super-admin" && (
                <div className="mt-4 flex items-start gap-3 p-4 bg-amber-50 text-amber-800 rounded-2xl text-sm border border-amber-100/50">
                  <Info className="w-5 h-5 shrink-0 text-amber-600" />
                  <p>
                    Role <strong>Super Admin</strong> memiliki akses absolut ke seluruh sistem. Anda tidak dapat mengubah permission untuk role ini.
                  </p>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/30">
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600 border-b border-gray-100">Modul Sistem</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600 border-b border-gray-100 text-center">Lihat (Read)</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600 border-b border-gray-100 text-center">Ubah (Write)</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600 border-b border-gray-100 text-center">Hapus (Delete)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {PERMISSION_MODULES.map((mod) => {
                    const modPerms = permissions[activeRole]?.[mod.id] || { read: false, write: false, delete: false };
                    
                    return (
                      <tr key={mod.id} className="hover:bg-gray-50/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{mod.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">Akses ke modul {mod.name.toLowerCase()}</div>
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
          ? "bg-blue-600 border-blue-600 text-white shadow-sm" 
          : "bg-white border-gray-300 text-transparent"
      )}>
        <Check className="w-3.5 h-3.5" strokeWidth={3} />
      </div>
    </label>
  );
}
