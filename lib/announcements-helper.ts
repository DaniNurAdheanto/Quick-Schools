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
    if (target === "super admin" || target === "super-admin") {
      return false;
    }
    return true;
  }

  // Split comma-separated targets for multi-select support (e.g. "Siswa, Guru")
  const targets = target.split(",").map(t => t.trim().toLowerCase());

  return targets.some(t => {
    if (t === "semua" || t === "all" || t.includes("seluruh")) return true;

    // Siswa matching
    if (role === "siswa" || role === "student") {
      return t.includes("siswa") || t.includes("murid") || t.includes("kelas");
    }

    // Guru matching
    if (role === "guru" || role === "teacher") {
      return t.includes("guru") || t.includes("pengajar") || t.includes("staff") || t.includes("staf") || t.includes("pendidik");
    }

    // Orang Tua matching
    if (role === "orang-tua" || role === "parent" || role === "wali" || role.includes("parent")) {
      return t.includes("orang tua") || t.includes("wali") || t.includes("parent") || t.includes("paguyuban");
    }

    // Kepala Sekolah matching
    if (role === "kepala-sekolah" || role === "kepsek" || role === "principal") {
      return t.includes("kepala sekolah") || t.includes("kepsek") || t.includes("principal") || t.includes("pimpinan");
    }

    // Super Admin role check if not flagged via isSuperAdmin
    if (role === "super-admin" || role === "superadmin") {
      return true;
    }

    return false;
  });
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

/**
 * Splits a target string (e.g. "Siswa, Guru") into a list of badge info objects
 */
export function getTargetsBadgeList(target: string = "Semua"): TargetRoleOption[] {
  if (!target || target.trim().toLowerCase() === "semua" || target.trim().toLowerCase().includes("seluruh")) {
    return [TARGET_ROLE_OPTIONS[0]];
  }
  const parts = target.split(",").map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return [TARGET_ROLE_OPTIONS[0]];
  
  return parts.map(p => getTargetBadgeInfo(p));
}

export interface AnnouncementExecutionMeta {
  eventDate?: string;
  eventTime?: string;
  room?: string;
}

/**
 * Unconditionally strips any internal metadata comment from the description string
 * so the user only ever sees clean, pristine description text.
 */
export function cleanAnnouncementDesc(fullDesc: string = ""): string {
  if (!fullDesc) return "-";
  return fullDesc
    .replace(/\s*<!--qs_meta:[\s\S]*?-->/g, "")
    .replace(/<!--qs_meta:[\s\S]*?-->/g, "")
    .trim() || "-";
}

/**
 * Encodes execution metadata into announcement description text.
 * Keeps Firestore document payload strictly within the standard 11 fields,
 * guaranteeing compatibility with any strict security rules.
 */
export function packAnnouncementDesc(descText: string, meta: AnnouncementExecutionMeta): string {
  const clean = cleanAnnouncementDesc(descText);
  const base = clean || "-";

  if (!meta.eventDate && !meta.eventTime && !meta.room) {
    return base;
  }

  const payload = JSON.stringify({
    eventDate: meta.eventDate || "",
    eventTime: meta.eventTime || "",
    room: meta.room || ""
  });

  return `${base}\n<!--qs_meta:${payload}-->`;
}

/**
 * Decodes execution metadata from announcement description text.
 */
export function unpackAnnouncementDesc(fullDesc: string = ""): {
  cleanDesc: string;
  eventDate: string;
  eventTime: string;
  room: string;
} {
  if (!fullDesc) {
    return { cleanDesc: "-", eventDate: "", eventTime: "", room: "" };
  }

  const match = fullDesc.match(/<!--qs_meta:([\s\S]*?)-->/);
  const cleanDesc = cleanAnnouncementDesc(fullDesc);

  if (!match) {
    return { cleanDesc, eventDate: "", eventTime: "", room: "" };
  }

  try {
    const parsed = JSON.parse(match[1]);
    return {
      cleanDesc,
      eventDate: typeof parsed.eventDate === "string" ? parsed.eventDate : "",
      eventTime: typeof parsed.eventTime === "string" ? parsed.eventTime : "",
      room: typeof parsed.room === "string" ? parsed.room : "",
    };
  } catch (e) {
    return { cleanDesc, eventDate: "", eventTime: "", room: "" };
  }
}
