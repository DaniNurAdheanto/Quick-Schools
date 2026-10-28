import fs from "fs";
import path from "path";
import {
  EducationalStage,
  VocationalProgram,
  DEFAULT_VOCATIONAL_PRESETS,
} from "@/lib/school-level-config";
import { OperationalDaysPattern } from "@/lib/operational-days";

export interface SchoolProfile {
  schoolName: string;
  schoolCode: string;
  npsn: string;
  schoolType: string;
  educationalStage: EducationalStage;
  vocationalPrograms?: VocationalProgram[];
  accreditation: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string;
  principalName: string;
  principalNip: string;
  operatingHours: string;
  operationalDays: OperationalDaysPattern;
  description: string;
  // Geolocation & Attendance Geofence
  latitude: number;
  longitude: number;
  radiusMeters: number;
  locationAddress: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_SCHOOL_PROFILE: SchoolProfile = {
  schoolName: "SMA Garuda Nusantara Smart School",
  schoolCode: "SCH-GNS-2026",
  npsn: "20194820",
  schoolType: "SMA (Sekolah Menengah Atas)",
  educationalStage: "SMA",
  vocationalPrograms: DEFAULT_VOCATIONAL_PRESETS.map((p, i) => ({ id: `prog_${i + 1}`, ...p })),
  accreditation: "A (Sangat Baik / Unggul)",
  address: "Jl. Pendidikan No. 45, Kompleks Akademika",
  city: "Jakarta Selatan",
  province: "DKI Jakarta",
  postalCode: "12430",
  phone: "+62 21 7890-1234",
  email: "info@garudanusa.sch.id",
  website: "https://garudanusa.sch.id",
  logoUrl: "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=400&auto=format&fit=crop&q=80",
  principalName: "Dr. Danur Adhi, M.Pd",
  principalNip: "19750812 200003 1 002",
  operatingHours: "06:30 - 16:00 WIB",
  operationalDays: "Senin - Jumat",
  description: "Pusat keunggulan pendidikan berbasis teknologi AI, biometrik, dan kepemimpinan berkarakter.",
  latitude: -6.200000,
  longitude: 106.816666,
  radiusMeters: 100,
  locationAddress: "Kampus Utama - Gerbang & Area Sekolah",
};

const PROFILE_FILE = path.join(process.cwd(), "data", "school-profile.json");

export function readStoredSchoolProfile(): SchoolProfile {
  try {
    if (fs.existsSync(PROFILE_FILE)) {
      const content = fs.readFileSync(PROFILE_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === "object") {
        return {
          ...DEFAULT_SCHOOL_PROFILE,
          ...parsed,
        };
      }
    }
  } catch (err) {
    console.warn("Could not read school-profile.json, fallback to defaults:", err);
  }
  return DEFAULT_SCHOOL_PROFILE;
}

export function writeStoredSchoolProfile(data: Partial<SchoolProfile>): SchoolProfile {
  const current = readStoredSchoolProfile();
  const merged: SchoolProfile = {
    ...current,
    ...data,
    updatedAt: new Date().toISOString(),
  };

  try {
    const dir = path.dirname(PROFILE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(PROFILE_FILE, JSON.stringify(merged, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving school-profile.json:", err);
  }

  return merged;
}

