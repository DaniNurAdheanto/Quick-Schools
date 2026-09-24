import {
  Users,
  User,
  GraduationCap,
  ShieldCheck,
  ShieldAlert,
  BookUser,
  Globe
} from "lucide-react";

export interface TargetRoleOption {
  label: string;
  value: string;
  description: string;
  badgeColor: string;
  icon: any;
}

export const TARGET_ROLE_OPTIONS: TargetRoleOption[] = [
  {
    label: "Semua (Seluruh Pengguna)",
    value: "Semua",
    description: "Tampil untuk semua pengguna sekolah (Siswa, Guru, Orang Tua, Staf & Admin)",
    badgeColor: "bg-purple-50 text-[#531FFF] border-purple-200/80",
    icon: Globe,
  },
  {
    label: "Siswa",
    value: "Siswa",
    description: "Khusus untuk siswa aktif kelas 7-12",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200/80",
    icon: User,
  },
  {
    label: "Guru",
    value: "Guru",
    description: "Khusus untuk seluruh dewan guru & pengajar",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    icon: GraduationCap,
  },
  {
    label: "Orang Tua",
    value: "Orang Tua",
    description: "Khusus untuk wali murid & orang tua siswa",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200/80",
    icon: Users,
  },
  {
    label: "Kepala Sekolah",
    value: "Kepala Sekolah",
    description: "Khusus untuk pimpinan executive & kepala sekolah",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
    icon: BookUser,
  },
  {
    label: "Admin Sekolah",
    value: "Admin Sekolah",
    description: "Khusus untuk staf tata usaha & admin operasional sekolah",
    badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200/80",
    icon: ShieldCheck,
  },
  {
    label: "Super Admin",
    value: "Super Admin",
    description: "Khusus untuk pemilik sistem & super administrator",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200/80",
    icon: ShieldAlert,
  },
];

/**
 * Checks whether an announcement is visible for a given user role.
 * Super Admin and Admin Sekolah always have administrative visibility to oversee all announcements.
 * Other roles (Siswa, Guru, Orang Tua, Kepala Sekolah) only see announcements targeted to them or "Semua".
 */
export function isAnnouncementVisibleForRole(
  announcementTarget: string = "Semua",
  userRole: string = "",
  isSuperAdmin: boolean = false,
  isAdmin: boolean = false
): boolean {
  // Super Admin can always oversee all announcements
  if (isSuperAdmin) return true;

  const target = (announcementTarget || "Semua").trim().toLowerCase();
  // Target "Semua" or "All" or empty means visible to everyone
  if (!target || target === "semua" || target === "all" || target.includes("seluruh")) return true;

  const role = (userRole || "").trim().toLowerCase();

  // If user is Admin Sekolah
  if (isAdmin || role === "admin" || role === "admin-sekolah" || role.includes("admin sekolah")) {
    // Admin sees everything except announcements strictly meant only for Super Admin
    if (target === "super admin" || target === "super-admin") {
      return false;
    }
    return true;
  }

  // Siswa matching
  if (role === "siswa" || role === "student") {
    return target.includes("siswa") || target.includes("murid") || target.includes("kelas");
  }

  // Guru matching
  if (role === "guru" || role === "teacher") {
    return target.includes("guru") || target.includes("pengajar") || target.includes("staff") || target.includes("staf") || target.includes("pendidik");
  }

  // Orang Tua matching
  if (role === "orang-tua" || role === "parent" || role === "wali" || role.includes("parent")) {
    return target.includes("orang tua") || target.includes("wali") || target.includes("parent") || target.includes("paguyuban");
  }

  // Kepala Sekolah matching
  if (role === "kepala-sekolah" || role === "kepsek" || role === "principal") {
    return target.includes("kepala sekolah") || target.includes("kepsek") || target.includes("principal") || target.includes("pimpinan");
  }

  // Super Admin role check if not flagged via isSuperAdmin
  if (role === "super-admin" || role === "superadmin") {
    return true;
  }

  return false;
}


/**
 * Returns badge styling and icon for a target value
 */
export function getTargetBadgeInfo(target: string = "Semua") {
  const found = TARGET_ROLE_OPTIONS.find(
    (opt) => opt.value.toLowerCase() === target.toLowerCase() || opt.label.toLowerCase().includes(target.toLowerCase())
  );
  if (found) return found;

  const t = target.toLowerCase();
  if (t.includes("siswa")) return TARGET_ROLE_OPTIONS[1];
  if (t.includes("guru")) return TARGET_ROLE_OPTIONS[2];
  if (t.includes("orang tua") || t.includes("wali")) return TARGET_ROLE_OPTIONS[3];
  if (t.includes("kepala sekolah") || t.includes("kepsek")) return TARGET_ROLE_OPTIONS[4];
  if (t.includes("super admin")) return TARGET_ROLE_OPTIONS[6];
  if (t.includes("admin")) return TARGET_ROLE_OPTIONS[5];

  return TARGET_ROLE_OPTIONS[0];
}
