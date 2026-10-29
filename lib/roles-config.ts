import { 
  ShieldAlert, 
  ShieldCheck, 
  Users, 
  GraduationCap, 
  User, 
  BookUser,
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  Megaphone,
  Award,
  FileCheck,
  FileText,
  CalendarRange,
  CreditCard,
  Settings,
  UserCog,
  PenLine,
  UserCheck,
  ClipboardCheck,
  Inbox,
  Building2,
  BarChart3,
  Layers,
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

export type PermissionAction = "view" | "create" | "edit" | "delete" | "approve" | "export";

export interface MenuPermission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
  export: boolean;
  read?: boolean;
  write?: boolean;
}

// Backward compatibility alias for ModulePermission
export type ModulePermission = MenuPermission;

export interface AppMenuDefinition {
  id: string;
  name: string;
  route: string;
  category: "Umum" | "Master Data" | "Akademik" | "Keuangan" | "Komunikasi" | "Sistem";
  description: string;
  icon: LucideIcon;
  legacyModule: string;
  supportsApprove?: boolean;
}

// Backward compatibility alias
export type PermissionModule = AppMenuDefinition;

export type RolePermissions = Record<string, Record<string, MenuPermission>>;

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
    id: "saas-admin", 
    name: "SaaS Administrator", 
    icon: Building2, 
    badge: "Operasional Bisnis SaaS",
    journey: "Dashboard Bisnis SaaS → Kelola Pelanggan → Permintaan Berlangganan → Paket & Tagihan",
    description: "Hak akses karyawan internal Quick Schools untuk mengelola operasional bisnis SaaS, pelanggan sekolah, paket layanan, tagihan langganan, dan permintaan onboarding." 
  },
  { 
    id: "super-admin", 
    name: "Super Admin (Administrator Utama)", 
    icon: ShieldAlert, 
    badge: "Akses Penuh Sistem",
    journey: "Manajemen Akun System → Role & Permission → Audit Keamanan → Konfigurasi Global",
    description: "Hak akses tertinggi untuk administrasi teknis sistem, manajemen akun pengguna sistem, dan pengaturan izin global." 
  },
];

/**
 * Master list of all application menus with their route, category, and capabilities
 */
export const APP_MENUS: AppMenuDefinition[] = [
  // ── 1. UMUM ──
  {
    id: "dashboard",
    name: "Dashboard & Analitik",
    route: "/dashboard",
    category: "Umum",
    description: "Grafik rekapitulasi data sekolah, kehadiran hari ini, dan ringkasan keuangan.",
    icon: LayoutDashboard,
    legacyModule: "dashboard",
  },
  {
    id: "calendar",
    name: "Kalender Akademik",
    route: "/calendar",
    category: "Umum",
    description: "Agenda kegiatan sekolah, hari libur nasional, dan kalender pendidikan.",
    icon: CalendarDays,
    legacyModule: "academic",
  },
  {
    id: "schedule",
    name: "Jadwal Pelajaran",
    route: "/schedule",
    category: "Umum",
    description: "Jadwal mengajar guru dan jadwal pelajaran per rombongan belajar kelas.",
    icon: BookOpen,
    legacyModule: "academic",
  },
  {
    id: "announcements",
    name: "Pengumuman Sekolah",
    route: "/announcements",
    category: "Komunikasi",
    description: "Penerbitan warta pengumuman resmi dan broadcast informasi sekolah.",
    icon: Megaphone,
    legacyModule: "announcements",
  },

  // ── 2. MASTER DATA ──
  {
    id: "students",
    name: "Data Siswa",
    route: "/data-siswa",
    category: "Master Data",
    description: "Direktori siswa aktif, biodata Dapodik, dan status kelulusan siswa.",
    icon: User,
    legacyModule: "users",
  },
  {
    id: "parents",
    name: "Data Orang Tua & Wali",
    route: "/parents",
    category: "Master Data",
    description: "Informasi kontak wali murid dan keterhubungan anak di sekolah.",
    icon: Users,
    legacyModule: "users",
  },
  {
    id: "classes",
    name: "Kelas & Rombel",
    route: "/classes",
    category: "Master Data",
    description: "Manajemen rombongan belajar, kapasitas ruang, dan tingkatan kelas.",
    icon: Users,
    legacyModule: "academic",
  },
  {
    id: "teachers",
    name: "Staff Guru & Pendidik",
    route: "/teachers",
    category: "Master Data",
    description: "Direktori pendidik, NIP/NUPTK, status kepegawaian, dan mata pelajaran.",
    icon: GraduationCap,
    legacyModule: "users",
  },
  {
    id: "homeroom",
    name: "Wali Kelas",
    route: "/homeroom",
    category: "Master Data",
    description: "Penetapan guru sebagai wali kelas pembina rombel belajar.",
    icon: GraduationCap,
    legacyModule: "users",
  },
  {
    id: "subjects",
    name: "Mata Pelajaran",
    route: "/subjects",
    category: "Master Data",
    description: "Kurikulum mata pelajaran, alokasi jam mengajar, dan kategori materi.",
    icon: BookOpen,
    legacyModule: "academic",
  },

  // ── 3. AKADEMIK ──
  {
    id: "attendance",
    name: "Absensi Siswa (Presensi)",
    route: "/attendance",
    category: "Akademik",
    description: "Presensi harian siswa, biometrik Face Recognition AI, dan GPS Geofence.",
    icon: FileCheck,
    legacyModule: "attendance",
  },
  {
    id: "leave-requests",
    name: "Izin & Sakit Siswa",
    route: "/leave-requests",
    category: "Akademik",
    description: "Pengajuan surat keterangan sakit, izin, dan persetujuan wali kelas.",
    icon: ClipboardCheck,
    legacyModule: "attendance",
    supportsApprove: true,
  },
  {
    id: "teacher-attendance",
    name: "Absensi Guru & Karyawan",
    route: "/teacher-attendance",
    category: "Akademik",
    description: "Presensi kehadiran jam masuk/pulang tenaga pendidik dan kependidikan.",
    icon: UserCheck,
    legacyModule: "attendance",
  },
  {
    id: "grades",
    name: "Penilaian & Asesmen",
    route: "/grades",
    category: "Akademik",
    description: "Penginputan nilai formatif, sumatif, capaian TP, dan evaluasi hasil belajar.",
    icon: PenLine,
    legacyModule: "grades",
  },
  {
    id: "report-cards",
    name: "E-Rapor Kurikulum Merdeka",
    route: "/report-cards",
    category: "Akademik",
    description: "Pengolahan nilai rapor, narasi capaian kompetensi, dan cetak rapor digital.",
    icon: Award,
    legacyModule: "grades",
    supportsApprove: true,
  },
  {
    id: "exams",
    name: "Jadwal & Hasil Ujian",
    route: "/exams",
    category: "Akademik",
    description: "Penjadwalan ujian tengah/akhir semester dan publikasi hasil ujian.",
    icon: CalendarRange,
    legacyModule: "academic",
  },
  {
    id: "academic-years",
    name: "Tahun Ajaran & Kenaikan",
    route: "/academic-years",
    category: "Akademik",
    description: "Kalender tahun akademik aktif, penguncian semester, dan kenaikan kelas.",
    icon: CalendarDays,
    legacyModule: "settings",
  },

  // ── 4. KEUANGAN ──
  {
    id: "payments",
    name: "Pembayaran SPP & Tagihan",
    route: "/payments",
    category: "Keuangan",
    description: "Penerbitan tagihan SPP, pencatatan transaksi, dan validasi pelunasan kasir.",
    icon: CreditCard,
    legacyModule: "finance",
    supportsApprove: true,
  },
  {
    id: "financial-reports",
    name: "Laporan Keuangan & Kas",
    route: "/financial-reports",
    category: "Keuangan",
    description: "Arus kas masuk/keluar, rekapitulasi penerimaan SPP, dan pembukuan yayasan.",
    icon: FileText,
    legacyModule: "finance",
  },

  // ── 5. SISTEM ──
  {
    id: "accounts",
    name: "Manajemen Akun System",
    route: "/accounts",
    category: "Sistem",
    description: "Kelola akun pengguna, aktivasi/nonaktif, dan kontrol sesi login (Khusus Super Admin).",
    icon: UserCheck,
    legacyModule: "accounts",
  },
  {
    id: "settings",
    name: "Pengaturan Sekolah",
    route: "/settings",
    category: "Sistem",
    description: "Konfigurasi identitas sekolah, jam operasional presensi, dan preferensi aplikasi.",
    icon: Settings,
    legacyModule: "settings",
  },
  {
    id: "roles",
    name: "Role & Permission",
    route: "/roles",
    category: "Sistem",
    description: "Matriks hak akses menu dan hak View, Create, Edit, Delete, Approve, Export antar peran.",
    icon: UserCog,
    legacyModule: "settings",
  },
  {
    id: "subscription-requests",
    name: "Permintaan Berlangganan",
    route: "/subscription-requests",
    category: "Sistem",
    description: "Pengelolaan dan tindak lanjut formulir permintaan berlangganan (Request Subscription) sekolah.",
    icon: Inbox,
    legacyModule: "settings",
  },
  {
    id: "saas-dashboard",
    name: "Dashboard Operasional SaaS",
    route: "/saas-dashboard",
    category: "Sistem",
    description: "Pusat ringkasan eksekutif jumlah pelanggan, sekolah aktif, dan status permintaan berlangganan.",
    icon: BarChart3,
    legacyModule: "dashboard",
  },
  {
    id: "saas-customers",
    name: "Kelola Pelanggan Sekolah",
    route: "/saas-customers",
    category: "Sistem",
    description: "Pengelolaan data pelanggan sekolah (tenants), paket langganan, kuota siswa, dan masa aktif.",
    icon: Building2,
    legacyModule: "settings",
  },
  {
    id: "saas-packages",
    name: "Paket Layanan SaaS",
    route: "/saas-packages",
    category: "Sistem",
    description: "Katalog paket langganan SaaS, penetapan harga lisensi, dan kapasitas kuota siswa.",
    icon: Layers,
    legacyModule: "settings",
  },
  {
    id: "saas-billing",
    name: "Tagihan & Pembayaran SaaS",
    route: "/saas-billing",
    category: "Sistem",
    description: "Data invoice penagihan langganan sekolah dan konfirmasi status pembayaran.",
    icon: CreditCard,
    legacyModule: "finance",
  },
];

// Alias for backwards compatibility
export const PERMISSION_MODULES: PermissionModule[] = APP_MENUS;

/**
 * Mapping between routes and canonical menu IDs
 */
export const ROUTE_TO_MENU_ID: Record<string, string> = {
  "/dashboard": "dashboard",
  "/calendar": "calendar",
  "/schedule": "schedule",
  "/announcements": "announcements",
  "/data-siswa": "students",
  "/parents": "parents",
  "/classes": "classes",
  "/teachers": "teachers",
  "/homeroom": "homeroom",
  "/subjects": "subjects",
  "/attendance": "attendance",
  "/leave-requests": "leave-requests",
  "/teacher-attendance": "teacher-attendance",
  "/grades": "grades",
  "/report-cards": "report-cards",
  "/exams": "exams",
  "/academic-years": "academic-years",
  "/payments": "payments",
  "/financial-reports": "financial-reports",
  "/accounts": "accounts",
  "/settings": "settings",
  "/roles": "roles",
  "/subscription-requests": "subscription-requests",
  "/saas-dashboard": "saas-dashboard",
  "/saas-customers": "saas-customers",
  "/saas-packages": "saas-packages",
  "/saas-billing": "saas-billing",
};

/**
 * Legacy NAV_MODULE_MAP for backwards compatibility
 */
export const NAV_MODULE_MAP: Record<string, string> = {
  ...ROUTE_TO_MENU_ID,
  "/data-siswa": "students",
};

/**
 * Helper to normalize any permission object to full 6-action schema
 */
export function resolveMenuPermission(perm?: Partial<MenuPermission> | null): MenuPermission {
  if (!perm) {
    return {
      view: false,
      create: false,
      edit: false,
      delete: false,
      approve: false,
      export: false,
      read: false,
      write: false,
    };
  }

  // Handle legacy read / write
  const viewVal = perm.view !== undefined ? Boolean(perm.view) : Boolean(perm.read);
  const createVal = perm.create !== undefined ? Boolean(perm.create) : Boolean(perm.write);
  const editVal = perm.edit !== undefined ? Boolean(perm.edit) : Boolean(perm.write);
  const deleteVal = Boolean(perm.delete);
  const approveVal = Boolean(perm.approve);
  const exportVal = perm.export !== undefined ? Boolean(perm.export) : viewVal;

  return {
    view: viewVal,
    create: createVal,
    edit: editVal,
    delete: deleteVal,
    approve: approveVal,
    export: exportVal,
    read: viewVal,
    write: createVal || editVal,
  };
}

/**
 * Initial factory default permissions for all roles
 */
export const DEFAULT_PERMISSIONS: RolePermissions = {
  "super-admin": {},
  "admin": {
    "dashboard": resolveMenuPermission({ view: true, create: true, edit: true, delete: false, approve: false, export: true }),
    "calendar": resolveMenuPermission({ view: true, create: true, edit: true, delete: true, approve: false, export: true }),
    "schedule": resolveMenuPermission({ view: true, create: true, edit: true, delete: true, approve: false, export: true }),
    "announcements": resolveMenuPermission({ view: true, create: true, edit: true, delete: true, approve: false, export: true }),
    "students": resolveMenuPermission({ view: true, create: true, edit: true, delete: true, approve: true, export: true }),
    "parents": resolveMenuPermission({ view: true, create: true, edit: true, delete: true, approve: false, export: true }),
    "classes": resolveMenuPermission({ view: true, create: true, edit: true, delete: true, approve: false, export: true }),
    "teachers": resolveMenuPermission({ view: true, create: true, edit: true, delete: true, approve: false, export: true }),
    "homeroom": resolveMenuPermission({ view: true, create: true, edit: true, delete: true, approve: false, export: true }),
    "subjects": resolveMenuPermission({ view: true, create: true, edit: true, delete: true, approve: false, export: true }),
    "attendance": resolveMenuPermission({ view: true, create: true, edit: true, delete: true, approve: true, export: true }),
    "leave-requests": resolveMenuPermission({ view: true, create: true, edit: true, delete: true, approve: true, export: true }),
    "teacher-attendance": resolveMenuPermission({ view: true, create: true, edit: true, delete: true, approve: true, export: true }),
    "grades": resolveMenuPermission({ view: true, create: true, edit: true, delete: false, approve: true, export: true }),
    "report-cards": resolveMenuPermission({ view: true, create: true, edit: true, delete: false, approve: true, export: true }),
    "exams": resolveMenuPermission({ view: true, create: true, edit: true, delete: true, approve: true, export: true }),
    "academic-years": resolveMenuPermission({ view: true, create: true, edit: true, delete: false, approve: true, export: true }),
    "payments": resolveMenuPermission({ view: true, create: true, edit: true, delete: false, approve: true, export: true }),
    "financial-reports": resolveMenuPermission({ view: true, create: true, edit: true, delete: false, approve: true, export: true }),
    "accounts": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    "settings": resolveMenuPermission({ view: true, create: false, edit: true, delete: false, approve: false, export: true }),
    "roles": resolveMenuPermission({ view: true, create: true, edit: true, delete: false, approve: true, export: true }),
    "subscription-requests": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    "saas-dashboard": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    "saas-customers": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    "saas-packages": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    "saas-billing": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    // Legacy module fallbacks
    "users": resolveMenuPermission({ view: true, create: true, edit: true, delete: true, approve: true, export: true }),
    "academic": resolveMenuPermission({ view: true, create: true, edit: true, delete: true, approve: true, export: true }),
    "finance": resolveMenuPermission({ view: true, create: true, edit: true, delete: false, approve: true, export: true }),
  },
  "saas-admin": {
    "saas-dashboard": resolveMenuPermission({ view: true, create: true, edit: true, delete: false, approve: true, export: true }),
    "saas-customers": resolveMenuPermission({ view: true, create: true, edit: true, delete: true, approve: true, export: true }),
    "subscription-requests": resolveMenuPermission({ view: true, create: true, edit: true, delete: true, approve: true, export: true }),
    "saas-packages": resolveMenuPermission({ view: true, create: true, edit: true, delete: false, approve: true, export: true }),
    "saas-billing": resolveMenuPermission({ view: true, create: true, edit: true, delete: false, approve: true, export: true }),
    "profile": resolveMenuPermission({ view: true, create: false, edit: true, delete: false, approve: false, export: false }),
    // School internal academic & system root locked
    "dashboard": resolveMenuPermission({ view: false }),
    "calendar": resolveMenuPermission({ view: false }),
    "schedule": resolveMenuPermission({ view: false }),
    "announcements": resolveMenuPermission({ view: false }),
    "students": resolveMenuPermission({ view: false }),
    "parents": resolveMenuPermission({ view: false }),
    "classes": resolveMenuPermission({ view: false }),
    "teachers": resolveMenuPermission({ view: false }),
    "homeroom": resolveMenuPermission({ view: false }),
    "subjects": resolveMenuPermission({ view: false }),
    "attendance": resolveMenuPermission({ view: false }),
    "leave-requests": resolveMenuPermission({ view: false }),
    "teacher-attendance": resolveMenuPermission({ view: false }),
    "grades": resolveMenuPermission({ view: false }),
    "report-cards": resolveMenuPermission({ view: false }),
    "exams": resolveMenuPermission({ view: false }),
    "academic-years": resolveMenuPermission({ view: false }),
    "payments": resolveMenuPermission({ view: false }),
    "financial-reports": resolveMenuPermission({ view: false }),
    "accounts": resolveMenuPermission({ view: false }),
    "settings": resolveMenuPermission({ view: false }),
    "roles": resolveMenuPermission({ view: false }),
  },
  "guru": {
    "dashboard": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: true }),
    "calendar": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: false }),
    "schedule": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: false }),
    "announcements": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: false }),
    "students": resolveMenuPermission({ view: true, create: true, edit: true, delete: false, approve: false, export: true }),
    "parents": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: false }),
    "classes": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: false }),
    "teachers": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: false }),
    "homeroom": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: false }),
    "subjects": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: false }),
    "attendance": resolveMenuPermission({ view: true, create: true, edit: true, delete: false, approve: true, export: true }),
    "leave-requests": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: true, export: true }),
    "teacher-attendance": resolveMenuPermission({ view: true, create: true, edit: false, delete: false, approve: false, export: false }),
    "grades": resolveMenuPermission({ view: true, create: true, edit: true, delete: false, approve: true, export: true }),
    "report-cards": resolveMenuPermission({ view: true, create: true, edit: true, delete: false, approve: true, export: true }),
    "exams": resolveMenuPermission({ view: true, create: true, edit: true, delete: false, approve: false, export: true }),
    "academic-years": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    "payments": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: false }),
    "financial-reports": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    "accounts": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    "settings": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    "roles": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    "subscription-requests": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    // Legacy module fallbacks
    "users": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: false }),
    "academic": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: false }),
    "finance": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: false }),
  },
  "siswa": {
    "dashboard": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: false }),
    "calendar": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: false }),
    "schedule": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: false }),
    "announcements": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: false }),
    "students": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    "parents": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    "classes": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    "teachers": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    "homeroom": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    "subjects": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    "attendance": resolveMenuPermission({ view: true, create: true, edit: false, delete: false, approve: false, export: false }),
    "leave-requests": resolveMenuPermission({ view: true, create: true, edit: false, delete: false, approve: false, export: false }),
    "teacher-attendance": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    "grades": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: true }),
    "report-cards": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: true }),
    "exams": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: false }),
    "academic-years": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    "payments": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: false }),
    "financial-reports": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    "accounts": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    "settings": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    "roles": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    "subscription-requests": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    // Legacy module fallbacks
    "users": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    "academic": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: false }),
    "finance": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: false }),
  },
  "orang-tua": {
    "dashboard": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: false }),
    "calendar": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: false }),
    "schedule": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: false }),
    "announcements": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: false }),
    "students": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    "parents": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    "classes": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    "teachers": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    "homeroom": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    "subjects": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    "attendance": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: false }),
    "leave-requests": resolveMenuPermission({ view: true, create: true, edit: false, delete: false, approve: false, export: false }),
    "teacher-attendance": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    "grades": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: true }),
    "report-cards": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: true }),
    "exams": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: false }),
    "academic-years": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    "payments": resolveMenuPermission({ view: true, create: true, edit: false, delete: false, approve: false, export: true }),
    "financial-reports": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    "accounts": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    "settings": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    "roles": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    "subscription-requests": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    // Legacy module fallbacks
    "users": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    "academic": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: false }),
    "finance": resolveMenuPermission({ view: true, create: true, edit: false, delete: false, approve: false, export: true }),
  },
  "kepala-sekolah": {
    "dashboard": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: true, export: true }),
    "calendar": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: true }),
    "schedule": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: true }),
    "announcements": resolveMenuPermission({ view: true, create: true, edit: true, delete: false, approve: true, export: true }),
    "students": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: true }),
    "parents": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: true }),
    "classes": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: true }),
    "teachers": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: true }),
    "homeroom": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: true }),
    "subjects": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: true }),
    "attendance": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: true, export: true }),
    "leave-requests": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: true, export: true }),
    "teacher-attendance": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: true, export: true }),
    "grades": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: true, export: true }),
    "report-cards": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: true, export: true }),
    "exams": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: true }),
    "academic-years": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: true }),
    "payments": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: true, export: true }),
    "financial-reports": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: true, export: true }),
    "accounts": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    "settings": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: false }),
    "roles": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    "subscription-requests": resolveMenuPermission({ view: false, create: false, edit: false, delete: false, approve: false, export: false }),
    // Legacy module fallbacks
    "users": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: true }),
    "academic": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: false, export: true }),
    "finance": resolveMenuPermission({ view: true, create: false, edit: false, delete: false, approve: true, export: true }),
  },
};

// Ensure super-admin has full permissions for all menus
APP_MENUS.forEach(menu => {
  if (!DEFAULT_PERMISSIONS["super-admin"]) {
    DEFAULT_PERMISSIONS["super-admin"] = {};
  }
  DEFAULT_PERMISSIONS["super-admin"][menu.id] = resolveMenuPermission({
    view: true,
    create: true,
    edit: true,
    delete: true,
    approve: true,
    export: true,
  });
});
["users", "academic", "attendance", "grades", "finance", "announcements", "settings", "accounts", "dashboard"].forEach(mod => {
  DEFAULT_PERMISSIONS["super-admin"][mod] = resolveMenuPermission({
    view: true,
    create: true,
    edit: true,
    delete: true,
    approve: true,
    export: true,
  });
});

/**
 * Normalizes and checks if a role string represents Super Admin
 */
export function isSuperAdminRole(role?: string | null): boolean {
  if (!role) return false;
  const raw = role.toLowerCase().trim();
  const normalized = raw.replace(/[-_ /]/g, "");
  return (
    normalized.includes("superadmin") ||
    normalized.includes("superadministrator") ||
    normalized === "owner" ||
    normalized === "developer" ||
    normalized === "root"
  );
}

/**
 * Normalizes and checks if a role string represents SaaS Administrator
 */
export function isSaaSAdminRole(role?: string | null): boolean {
  if (!role) return false;
  const raw = role.toLowerCase().trim();
  const normalized = raw.replace(/[-_ /]/g, "");
  return (
    normalized.includes("saasadmin") ||
    normalized.includes("saasadministrator") ||
    normalized === "saas" ||
    normalized === "saasoperations"
  );
}

/**
 * Normalizes and checks if a role string represents Student/Siswa
 */
export function isStudentRole(role?: string | null): boolean {
  if (!role) return false;
  const raw = role.toLowerCase().trim();
  const normalized = raw.replace(/[-_ /]/g, "");
  return (
    normalized.includes("siswa") ||
    normalized.includes("student") ||
    normalized.includes("murid") ||
    normalized.includes("pesertadidik") ||
    normalized.includes("pelajar")
  );
}

/**
 * Normalizes and checks if a role string represents Teacher/Guru
 */
export function isTeacherRole(role?: string | null): boolean {
  if (!role) return false;
  const raw = role.toLowerCase().trim();
  const normalized = raw.replace(/[-_ /]/g, "");
  if (normalized.includes("walimurid") || normalized.includes("orangtua") || normalized.includes("parent")) {
    return false;
  }
  return (
    normalized.includes("guru") ||
    normalized.includes("teacher") ||
    normalized.includes("pengajar") ||
    normalized.includes("pendidik") ||
    normalized.includes("walikelas") ||
    normalized.includes("homeroom")
  );
}

/**
 * Normalizes and checks if a role string represents Parent/Orang Tua/Wali
 */
export function isParentRole(role?: string | null): boolean {
  if (!role) return false;
  const raw = role.toLowerCase().trim();
  const normalized = raw.replace(/[-_ /]/g, "");
  if (normalized.includes("walikelas") || normalized.includes("homeroom")) {
    return false;
  }
  return (
    normalized.includes("orangtua") ||
    normalized.includes("parent") ||
    normalized.includes("walimurid") ||
    normalized.includes("wali") ||
    raw.includes("orang tua")
  );
}

/**
 * Normalizes and checks if a role string represents Kepala Sekolah / Principal
 */
export function isKepalaSekolahRole(role?: string | null): boolean {
  if (!role) return false;
  const raw = role.toLowerCase().trim();
  const normalized = raw.replace(/[-_ /]/g, "");
  return (
    normalized.includes("kepalasekolah") ||
    normalized.includes("kelapasekolah") ||
    normalized.includes("kelapaseokolah") ||
    normalized.includes("kepalaseokolah") ||
    normalized.includes("kepsek") ||
    normalized.includes("principal") ||
    normalized.includes("headmaster") ||
    normalized.includes("tohar")
  );
}

/**
 * Resolves any route, path, alias, or menu identifier to its canonical menu ID
 */
export function resolveMenuId(menuIdOrRoute: string): string {
  if (!menuIdOrRoute) return "";
  let clean = menuIdOrRoute.split("?")[0].split("#")[0].trim();
  if (clean.length > 1 && clean.endsWith("/")) {
    clean = clean.slice(0, -1);
  }
  if (ROUTE_TO_MENU_ID[clean]) {
    return ROUTE_TO_MENU_ID[clean];
  }
  const withoutSlash = clean.startsWith("/") ? clean.slice(1) : clean;
  if (ROUTE_TO_MENU_ID["/" + withoutSlash]) {
    return ROUTE_TO_MENU_ID["/" + withoutSlash];
  }
  const found = APP_MENUS.find(
    m => m.id === withoutSlash || m.id === clean || m.route === clean || m.legacyModule === clean
  );
  if (found) {
    return found.id;
  }
  const firstSegment = "/" + withoutSlash.split("/")[0];
  if (ROUTE_TO_MENU_ID[firstSegment]) {
    return ROUTE_TO_MENU_ID[firstSegment];
  }
  return withoutSlash || clean;
}

/**
 * Check whether a role or permission allows a specific action on a menu or route
 */
export function canAccessMenu(
  role: string | null | undefined,
  permissions: Record<string, Partial<MenuPermission>> | Record<string, any> | undefined,
  menuIdOrRoute: string,
  action: PermissionAction = "view"
): boolean {
  if (!role) return false;

  // Resolve menu ID if route or path was passed
  const menuId = resolveMenuId(menuIdOrRoute);

  const isSaaSMenu = 
    menuId === "saas-dashboard" ||
    menuId === "saas-customers" ||
    menuId === "subscription-requests" ||
    menuId === "saas-packages" ||
    menuId === "saas-billing";

  // Strict isolation: SaaS management menus are EXCLUSIVELY for SaaS Administrator
  // Hidden and blocked for Super Admin and all other roles
  if (isSaaSMenu) {
    return isSaaSAdminRole(role);
  }

  // Strict isolation: SaaS Administrator cannot access internal school academic or system admin modules
  if (isSaaSAdminRole(role)) {
    if (menuId === "profile" || menuId === "") return true;
    return false;
  }

  // Super Admin has full technical & system management rights for non-SaaS menus
  if (isSuperAdminRole(role)) return true;

  // 1. Strict lock: Manajemen Akun System is exclusively for Super Admin
  if (menuId === "accounts") {
    return isSuperAdminRole(role);
  }

  // 2. Profile and root are universal pages accessible to all authenticated users
  if (menuId === "profile" || menuId === "") {
    return true;
  }

  const canonicalRole = normalizeRole(role);

  // 3. Resolve menuPermMap if permissions is a 2-level object keyed by role
  let menuPermMap: Record<string, Partial<MenuPermission>> | undefined = permissions as any;
  if (permissions && typeof permissions === "object") {
    if (
      permissions[canonicalRole] &&
      typeof permissions[canonicalRole] === "object" &&
      !("view" in permissions[canonicalRole])
    ) {
      menuPermMap = permissions[canonicalRole];
    } else if (
      role &&
      permissions[role] &&
      typeof permissions[role] === "object" &&
      !("view" in permissions[role])
    ) {
      menuPermMap = permissions[role];
    }
  }

  // 4. Check explicit permissions passed in
  if (menuPermMap) {
    const perm = menuPermMap[menuId];
    if (perm !== undefined && perm !== null) {
      const resolved = resolveMenuPermission(perm);
      return Boolean(resolved[action]);
    }

    // Check legacy module key if menu was not found directly
    const appMenu = APP_MENUS.find(m => m.id === menuId);
    if (
      appMenu &&
      appMenu.legacyModule &&
      menuPermMap[appMenu.legacyModule] !== undefined &&
      menuPermMap[appMenu.legacyModule] !== null
    ) {
      const legPerm = resolveMenuPermission(menuPermMap[appMenu.legacyModule]);
      return Boolean(legPerm[action]);
    }
  }

  // 5. Fallback to default permissions matrix
  const roleDefaults = DEFAULT_PERMISSIONS[canonicalRole] || DEFAULT_PERMISSIONS["admin"];
  if (roleDefaults && roleDefaults[menuId] !== undefined && roleDefaults[menuId] !== null) {
    const resolved = resolveMenuPermission(roleDefaults[menuId]);
    return Boolean(resolved[action]);
  }

  return false;
}

/**
 * Helper to check whether a role / permission allows modifying a module
 * Backward compatible with legacy signature
 */
export function canMutateModule(
  role: string | null | undefined,
  permissions: Record<string, Partial<MenuPermission>> | Record<string, any> | undefined,
  module: string,
  action: "write" | "delete" | "create" | "edit" | "approve" | "export" = "write"
): boolean {
  if (!role) return false;
  if (isSuperAdminRole(role)) return true;

  const targetAction: PermissionAction = 
    action === "write" ? "edit" : (action as PermissionAction);

  return canAccessMenu(role, permissions, module, targetAction);
}

// Aliases for consistent lookup across roles
DEFAULT_PERMISSIONS["parent"] = DEFAULT_PERMISSIONS["orang-tua"];
DEFAULT_PERMISSIONS["orangtua"] = DEFAULT_PERMISSIONS["orang-tua"];
DEFAULT_PERMISSIONS["orang-tua / wali"] = DEFAULT_PERMISSIONS["orang-tua"];
DEFAULT_PERMISSIONS["wali-murid"] = DEFAULT_PERMISSIONS["orang-tua"];
DEFAULT_PERMISSIONS["wali"] = DEFAULT_PERMISSIONS["orang-tua"];

DEFAULT_PERMISSIONS["teacher"] = DEFAULT_PERMISSIONS["guru"];
DEFAULT_PERMISSIONS["guru pengajar"] = DEFAULT_PERMISSIONS["guru"];
DEFAULT_PERMISSIONS["pengajar"] = DEFAULT_PERMISSIONS["guru"];

DEFAULT_PERMISSIONS["student"] = DEFAULT_PERMISSIONS["siswa"];
DEFAULT_PERMISSIONS["murid"] = DEFAULT_PERMISSIONS["siswa"];

DEFAULT_PERMISSIONS["saasadmin"] = DEFAULT_PERMISSIONS["saas-admin"];
DEFAULT_PERMISSIONS["saas_admin"] = DEFAULT_PERMISSIONS["saas-admin"];
DEFAULT_PERMISSIONS["saas-operations"] = DEFAULT_PERMISSIONS["saas-admin"];

DEFAULT_PERMISSIONS["kepalasekolah"] = DEFAULT_PERMISSIONS["kepala-sekolah"];
DEFAULT_PERMISSIONS["kelapasekolah"] = DEFAULT_PERMISSIONS["kepala-sekolah"];
DEFAULT_PERMISSIONS["kelapaseokolah"] = DEFAULT_PERMISSIONS["kepala-sekolah"];
DEFAULT_PERMISSIONS["kepalaseokolah"] = DEFAULT_PERMISSIONS["kepala-sekolah"];
DEFAULT_PERMISSIONS["kepsek"] = DEFAULT_PERMISSIONS["kepala-sekolah"];
DEFAULT_PERMISSIONS["principal"] = DEFAULT_PERMISSIONS["kepala-sekolah"];
DEFAULT_PERMISSIONS["headmaster"] = DEFAULT_PERMISSIONS["kepala-sekolah"];

/**
 * Universally normalizes any role string or alias to canonical ID
 */
export function normalizeRole(roleStr: string = ""): string {
  const r = (roleStr || "").toLowerCase().trim();
  if (!r) return "admin";

  if (isSuperAdminRole(r)) return "super-admin";
  if (isSaaSAdminRole(r)) return "saas-admin";
  if (isKepalaSekolahRole(r)) return "kepala-sekolah";
  if (isParentRole(r)) return "orang-tua";
  if (isTeacherRole(r)) return "guru";
  if (isStudentRole(r)) return "siswa";

  return "admin";
}
