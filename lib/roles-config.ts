import { 
  ShieldAlert, 
  ShieldCheck, 
  Users, 
  GraduationCap, 
  User, 
  BookUser,
  type LucideIcon 
} from "lucide-react";

export interface RoleDefinition {
  id: string;
  name: string;
  icon: LucideIcon;
  badge: string;
  journey: string;
  description: string;
}

export interface PermissionModule {
  id: string;
  name: string;
  category: string;
  description: string;
}

export interface ModulePermission {
  read: boolean;
  write: boolean;
  delete: boolean;
}

export type RolePermissions = Record<string, Record<string, ModulePermission>>;

export const ROLES: RoleDefinition[] = [
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

export const PERMISSION_MODULES: PermissionModule[] = [
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

export const DEFAULT_PERMISSIONS: RolePermissions = {
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
    "attendance": { read: true, write: true, delete: false },
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
    "finance": { read: true, write: true, delete: false },
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
    "announcements": { read: true, write: true, delete: false },
    "settings": { read: true, write: false, delete: false },
  },
};

// Ensure super-admin has full permissions for all modules
PERMISSION_MODULES.forEach(mod => {
  if (!DEFAULT_PERMISSIONS["super-admin"]) {
    DEFAULT_PERMISSIONS["super-admin"] = {};
  }
  DEFAULT_PERMISSIONS["super-admin"][mod.id] = { read: true, write: true, delete: true };
});

/**
 * Normalizes and checks if a role string represents Super Admin
 */
export function isSuperAdminRole(role?: string | null): boolean {
  if (!role) return false;
  const normalized = role.toLowerCase().trim().replace(/[-_ ]/g, "");
  return normalized === "superadmin";
}

/**
 * Normalizes and checks if a role string represents Student/Siswa
 */
export function isStudentRole(role?: string | null): boolean {
  if (!role) return false;
  const normalized = role.toLowerCase().trim();
  return normalized === "siswa" || normalized === "student";
}

/**
 * Normalizes and checks if a role string represents Teacher/Guru
 */
export function isTeacherRole(role?: string | null): boolean {
  if (!role) return false;
  const normalized = role.toLowerCase().trim();
  return normalized === "guru" || normalized === "teacher";
}
