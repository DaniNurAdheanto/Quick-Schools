"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Search,
  RotateCcw,
  Sparkles,
  Lock,
  Unlock,
  Eye,
  Edit3,
  Trash2,
  CheckCircle2,
  SlidersHorizontal,
  Building2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { doc, getDoc, setDoc, onSnapshot, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/context/ToastContext";

export const ROLES = [
  { 
    id: "admin", 
    name: "Admin Sekolah / TU", 
    icon: ShieldCheck, 
    badge: "Manajemen Utama",
    journey: "Input Data Master → Kelola Siswa & Guru → Jadwal → Keuangan",
    description: "Hak akses operasional tata usaha, kelola master data, jadwal, presensi, dan keuangan sekolah." 
  },
  { 
    id: "guru", 
    name: "Guru Pengajar", 
    icon: GraduationCap, 
    badge: "Akademik & Mengajar",
    journey: "Lihat Jadwal → Input Presensi Kelas → Beri Nilai & Rapor",
    description: "Hak akses guru untuk mengelola presensi kelas, mata pelajaran, dan penilaian siswa." 
  },
  { 
    id: "siswa", 
    name: "Siswa (Student)", 
    icon: User, 
    badge: "Portal Siswa",
    journey: "Lihat Jadwal Pelajaran → Absensi Mandiri → Lihat Nilai & SPP",
    description: "Hak akses siswa mandiri untuk memantau jadwal, presensi, rapor digital, dan tagihan SPP." 
  },
  { 
    id: "orang-tua", 
    name: "Orang Tua / Wali", 
    icon: Users, 
    badge: "Monitoring Anak",
    journey: "Monitoring Kehadiran Anak → Lihat Rapor → Bayar SPP",
    description: "Hak akses wali murid untuk memantau perkembangan akademik dan histori pembayaran anak." 
  },
  { 
    id: "kepala-sekolah", 
    name: "Kepala Sekolah", 
    icon: BookUser, 
    badge: "Monitoring Executive",
    journey: "Dashboard Insight → Laporan Presensi → Laporan Keuangan",
    description: "Hak akses pemantauan executive untuk memantau performa sekolah dan laporan komprehensif." 
  },
  { 
    id: "super-admin", 
    name: "Super Admin", 
    icon: ShieldAlert, 
    badge: "Akses Penuh Sistem",
    journey: "Konfigurasi Sistem → Keamanan & Hak Akses",
    description: "Hak akses tertinggi tanpa batasan untuk manajemen seluruh sistem sekolah." 
  },
];

export const PERMISSION_MODULES = [
  { id: "dashboard", name: "Dashboard & Analitik", category: "Umum", description: "Halaman utama grafik rekapitulasi data sekolah." },
  { id: "users", name: "Manajemen Data Siswa & Guru", category: "Master Data", description: "Kelola data biodata siswa, guru, wali kelas, dan akun." },
  { id: "accounts", name: "Manajemen Akun System", category: "Sistem", description: "Kelola seluruh akun terdaftar, status keaktifan (Aktif/Nonaktif), dan role user." },
  { id: "academic", name: "Jadwal & Mata Pelajaran", category: "Akademik", description: "Jadwal kelas, kalender akademik, dan kurikulum." },
  { id: "attendance", name: "Absensi & Face Recognition", category: "Akademik", description: "Monitoring kehadiran siswa, guru, dan geolokasi." },
  { id: "grades", name: "Penilaian & Rapor Digital", category: "Akademik", description: "Input nilai harian, ujian, dan pencetakan rapor." },
  { id: "finance", name: "Keuangan & Tagihan SPP", category: "Keuangan", description: "Pembayaran SPP, invoicing, dan laporan kas." },
  { id: "announcements", name: "Pengumuman & Notifikasi", category: "Komunikasi", description: "Penerbitan pengumuman sekolah dan pemberitahuan." },
  { id: "settings", name: "Pengaturan Sistem & Sekolah", category: "Sistem", description: "Pengaturan identitas sekolah, tahun ajaran, dan modul." },
];

export const DEFAULT_PERMISSIONS: Record<string, Record<string, { read: boolean; write: boolean; delete: boolean }>> = {
  "super-admin": {},
  "admin": {
    "dashboard": { read: true, write: true, delete: false },
    "users": { read: true, write: true, delete: true },
    "accounts": { read: false, write: false, delete: false },
    "academic": { read: true, write: true, delete: true },
    "attendance": { read: true, write: true, delete: true },
    "grades": { read: true, write: true, delete: false },
    "finance": { read: true, write: true, delete: false },
    "announcements": { read: true, write: true, delete: true },
    "settings": { read: true, write: true, delete: false },
  },
  "guru": {
    "dashboard": { read: true, write: false, delete: false },
    "users": { read: true, write: false, delete: false },
    "accounts": { read: false, write: false, delete: false },
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
    "accounts": { read: false, write: false, delete: false },
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
    "accounts": { read: false, write: false, delete: false },
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
    "accounts": { read: false, write: false, delete: false },
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
    "accounts": { read: false, write: false, delete: false },
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
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Semua");

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
      console.warn("Firestore roles query error, using default presets:", err);
      setPermissions(DEFAULT_PERMISSIONS);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const activeRoleData = useMemo(() => {
    return ROLES.find(r => r.id === activeRole) || ROLES[0];
  }, [activeRole]);

  // Filter modules based on search and category
  const filteredModules = useMemo(() => {
    return PERMISSION_MODULES.filter(mod => {
      const matchesSearch = 
        mod.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        mod.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "Semua" || mod.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, categoryFilter]);

  const handleToggle = (moduleId: string, action: "read" | "write" | "delete") => {
    if (activeRole === "super-admin") return;

    if (moduleId === "accounts") {
      toast.showWarning("Modul Manajemen Akun System bersifat eksklusif dan hanya dapat diakses oleh peran Super Admin.", "Akses Terkunci");
      return;
    }

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
      
      if (activeRole === "siswa") {
        nextPerms["student"] = updatedRole;
      }

      return nextPerms;
    });
  };

  // Quick Preset Actions
  const applyPreset = (presetType: "standard" | "readOnly" | "fullWrite" | "clear") => {
    if (activeRole === "super-admin") return;

    let updatedModules: Record<string, { read: boolean; write: boolean; delete: boolean }> = {};

    if (presetType === "standard") {
      updatedModules = DEFAULT_PERMISSIONS[activeRole] || DEFAULT_PERMISSIONS["siswa"];
      toast.showInfo(`Rekomendasi standar sekolah diterapkan untuk role ${activeRoleData.name}.`, "Preset Sekolah");
    } else if (presetType === "readOnly") {
      PERMISSION_MODULES.forEach(mod => {
        updatedModules[mod.id] = { read: true, write: false, delete: false };
      });
      toast.showInfo(`Izin di-set ke Read-Only untuk semua modul.`, "Preset Read-Only");
    } else if (presetType === "fullWrite") {
      PERMISSION_MODULES.forEach(mod => {
        updatedModules[mod.id] = { read: true, write: true, delete: false };
      });
      toast.showInfo(`Izin Tambah/Edit diaktifkan untuk semua modul.`, "Preset Full Write");
    } else if (presetType === "clear") {
      PERMISSION_MODULES.forEach(mod => {
        updatedModules[mod.id] = { read: false, write: false, delete: false };
      });
      toast.showInfo(`Seluruh hak akses dibatasi untuk role ini.`, "Preset Dibatasi");
    }

    // Always enforce accounts lock for non-super-admin
    if (activeRole !== "super-admin") {
      updatedModules["accounts"] = { read: false, write: false, delete: false };
    }

    setPermissions(prev => ({
      ...prev,
      [activeRole]: updatedModules,
      ...(activeRole === "siswa" ? { student: updatedModules } : {})
    }));
  };

  // Toggle All per Column
  const handleToggleColumn = (action: "read" | "write" | "delete") => {
    if (activeRole === "super-admin") return;

    const currentRolePerms = permissions[activeRole] || {};
    const allEnabled = filteredModules.filter(m => m.id !== "accounts").every(mod => currentRolePerms[mod.id]?.[action]);

    setPermissions(prev => {
      const nextRolePerms = { ...(prev[activeRole] || {}) };
      filteredModules.forEach(mod => {
        if (mod.id === "accounts") {
          nextRolePerms[mod.id] = { read: false, write: false, delete: false };
          return;
        }
        const cur = nextRolePerms[mod.id] || { read: false, write: false, delete: false };
        const val = !allEnabled;
        
        cur[action] = val;
        if ((action === "write" || action === "delete") && val) cur.read = true;
        if (action === "read" && !val) {
          cur.write = false;
          cur.delete = false;
        }
        nextRolePerms[mod.id] = cur;
      });

      const nextPerms = { ...prev, [activeRole]: nextRolePerms };
      if (activeRole === "siswa") nextPerms["student"] = nextRolePerms;
      return nextPerms;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const roleModules = permissions[activeRole] || {};
      await setDoc(doc(db, "roles", activeRole), {
        roleId: activeRole,
        modules: roleModules,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      if (activeRole === "siswa") {
        await setDoc(doc(db, "roles", "student"), {
          roleId: "student",
          modules: roleModules,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      setIsSaving(false);
      setSaveSuccess(true);
      toast.showEdit(`Konfigurasi hak akses RBAC ${activeRoleData.name} berhasil disimpan di database.`, "Berhasil Simpan");
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving role permissions:", err);
      setIsSaving(false);
      toast.showError("Gagal menyimpan konfigurasi hak akses.", "Gagal");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Manajemen Role & Hak Akses (RBAC)</h1>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-[#F3F0FF] text-[#531FFF] rounded-full border border-[#531FFF]/20">
              Standar Sekolah
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Konfigurasi otorisasi dan kontrol akses modul untuk Admin, Guru, Siswa, Orang Tua, dan Kepala Sekolah.
          </p>
        </div>

        {/* Header Action Button */}
        <button
          onClick={handleSave}
          disabled={isSaving || activeRole === "super-admin"}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all text-sm shadow-sm active:scale-[0.98]",
            activeRole === "super-admin"
              ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
              : saveSuccess
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                : "bg-[#531FFF] hover:bg-[#4314cc] text-white shadow-[#531FFF]/20"
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
              {isSaving ? "Menyimpan..." : "Simpan Perubahan RBAC"}
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Roles Selector Sidebar */}
        <div className="lg:col-span-1 bg-white border border-gray-100 rounded-2xl p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] h-fit space-y-4">
          <div className="px-2 pt-1 flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Peran (Roles) Sekolah</h2>
            <span className="text-[11px] font-extrabold text-[#531FFF] bg-purple-50 px-2 py-0.5 rounded-md">
              {ROLES.length} Roles
            </span>
          </div>

          <div className="space-y-1.5">
            {ROLES.map((role) => {
              const Icon = role.icon;
              const isActive = activeRole === role.id;

              return (
                <button
                  key={role.id}
                  onClick={() => setActiveRole(role.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all group",
                    isActive 
                      ? "bg-[#531FFF] text-white shadow-md shadow-[#531FFF]/20 font-bold" 
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 border border-transparent hover:border-gray-200"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-lg shrink-0 transition-colors",
                    isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500 group-hover:text-[#531FFF]"
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-bold leading-tight truncate">{role.name}</div>
                    <div className={cn("text-[10px] font-medium truncate mt-0.5", isActive ? "text-white/80" : "text-gray-400")}>
                      {role.badge}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Main Permissions Workspace */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Active Role Banner & Summary */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-100 text-[#531FFF] flex items-center justify-center font-bold">
                  <activeRoleData.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-gray-900">Otorisasi Modul: {activeRoleData.name}</h3>
                    <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-purple-50 text-[#531FFF] rounded-md border border-purple-100">
                      {activeRoleData.badge}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{activeRoleData.description}</p>
                </div>
              </div>

              {activeRole === "super-admin" && (
                <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-bold flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  Super Admin Memiliki Akses Penuh
                </div>
              )}
            </div>

            {/* Quick Access Presets Bar */}
            {activeRole !== "super-admin" && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                  <Sparkles className="w-3.5 h-3.5 text-[#531FFF]" />
                  <span>Preset Akses Cepat:</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => applyPreset("standard")}
                    className="px-3 py-1.5 bg-[#F3F0FF] hover:bg-[#531FFF] text-[#531FFF] hover:text-white rounded-lg text-xs font-bold transition-all border border-[#531FFF]/20 flex items-center gap-1.5"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    Standar Sekolah
                  </button>

                  <button
                    onClick={() => applyPreset("readOnly")}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-all border border-gray-200 flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-600" />
                    Read-Only All
                  </button>

                  <button
                    onClick={() => applyPreset("fullWrite")}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-all border border-gray-200 flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                    Full Write
                  </button>

                  <button
                    onClick={() => applyPreset("clear")}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-all border border-rose-200 flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Batasi Semua
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Permissions Matrix Container */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
            
            {/* Filter & Bulk Select Bar */}
            <div className="p-4 border-b border-gray-100 bg-gray-50/60 flex flex-col md:flex-row items-center justify-between gap-4">
              
              {/* Search & Category filter */}
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-56">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Cari nama modul..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                  />
                </div>

                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                  {["Semua", "Akademik", "Master Data", "Keuangan", "Sistem", "Komunikasi"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap",
                        categoryFilter === cat 
                          ? "bg-white text-[#531FFF] border border-[#531FFF]/30 shadow-xs" 
                          : "text-gray-600 hover:text-gray-900"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bulk Toggle Buttons */}
              {activeRole !== "super-admin" && (
                <div className="flex items-center gap-2 text-xs">
                  <button 
                    onClick={() => handleToggleColumn("read")}
                    className="px-2.5 py-1 bg-white border border-gray-200 hover:border-blue-300 text-blue-700 rounded-md font-bold transition-all shadow-xs"
                  >
                    Toggle All Read
                  </button>
                  <button 
                    onClick={() => handleToggleColumn("write")}
                    className="px-2.5 py-1 bg-white border border-gray-200 hover:border-emerald-300 text-emerald-700 rounded-md font-bold transition-all shadow-xs"
                  >
                    Toggle All Write
                  </button>
                </div>
              )}
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-white text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Modul Fitur & Deskripsi</th>
                    <th className="px-6 py-4 text-center">Kategori</th>
                    <th className="px-6 py-4 text-center">Lihat (Read)</th>
                    <th className="px-6 py-4 text-center">Tambah/Edit (Write)</th>
                    <th className="px-6 py-4 text-center">Hapus (Delete)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {filteredModules.length > 0 ? (
                    filteredModules.map((mod) => {
                      const rolePerms = permissions[activeRole] || DEFAULT_PERMISSIONS[activeRole] || {};
                      const modPerms = rolePerms[mod.id] || { read: false, write: false, delete: false };
                      const isAccountsModule = mod.id === "accounts";
                      const isAccountsLocked = isAccountsModule && activeRole !== "super-admin";

                      return (
                        <tr key={mod.id} className={cn("hover:bg-gray-50/60 transition-colors group", isAccountsLocked && "bg-rose-50/20")}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-gray-900 group-hover:text-[#531FFF] transition-colors">
                                {mod.name}
                              </p>
                              {isAccountsModule && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                                  <Lock className="w-2.5 h-2.5" />
                                  Khusus Super Admin
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500 font-medium mt-0.5">{mod.description}</p>
                          </td>

                          <td className="px-6 py-4 text-center">
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                              {mod.category}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-center">
                            <PermissionCheckbox 
                              checked={modPerms.read} 
                              onChange={() => handleToggle(mod.id, "read")}
                              disabled={activeRole === "super-admin" || isAccountsLocked}
                              activeColor="bg-blue-600 border-blue-600"
                            />
                          </td>

                          <td className="px-6 py-4 text-center">
                            <PermissionCheckbox 
                              checked={modPerms.write} 
                              onChange={() => handleToggle(mod.id, "write")}
                              disabled={activeRole === "super-admin" || isAccountsLocked}
                              activeColor="bg-emerald-600 border-emerald-600"
                            />
                          </td>

                          <td className="px-6 py-4 text-center">
                            <PermissionCheckbox 
                              checked={modPerms.delete} 
                              onChange={() => handleToggle(mod.id, "delete")}
                              disabled={activeRole === "super-admin" || isAccountsLocked || (!modPerms.write && !modPerms.read)}
                              activeColor="bg-rose-600 border-rose-600"
                            />
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-gray-500 font-semibold">
                        Modul fitur tidak ditemukan. Coba reset pencarian atau kata kunci filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Matrix Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/40 flex items-center justify-between text-xs text-gray-500 font-medium">
              <p>Menampilkan <span className="font-bold text-gray-900">{filteredModules.length}</span> modul fitur RBAC</p>
              <p className="text-[11px] text-gray-400 font-mono">Modul tersinkronisasi dengan Sidebar Navigasi</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PermissionCheckbox({ 
  checked, 
  onChange, 
  disabled,
  activeColor = "bg-[#531FFF] border-[#531FFF]"
}: { 
  checked: boolean; 
  onChange: () => void; 
  disabled?: boolean;
  activeColor?: string;
}) {
  return (
    <label className={cn(
      "relative inline-flex items-center justify-center cursor-pointer p-1.5 rounded-lg transition-all",
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
        "w-5 h-5 flex items-center justify-center rounded-md border transition-all duration-200",
        checked 
          ? `${activeColor} text-white shadow-xs` 
          : "bg-white border-gray-300 text-transparent hover:border-gray-400"
      )}>
        <Check className="w-3.5 h-3.5" strokeWidth={3} />
      </div>
    </label>
  );
}
