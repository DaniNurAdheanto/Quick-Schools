"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSchoolProfile } from "@/context/SchoolProfileContext";

function getPageName(pathname: string | null): string {
  if (!pathname || pathname === "/" || pathname === "/dashboard") return "Dashboard";
  if (pathname.includes("/data-siswa")) return "Data Siswa";
  if (pathname.includes("/parents")) return "Data Orang Tua";
  if (pathname.includes("/teachers")) return "Staff Guru";
  if (pathname.includes("/classes")) return "Kelas & Rombel";
  if (pathname.includes("/homeroom")) return "Wali Kelas";
  if (pathname.includes("/subjects")) return "Mata Pelajaran";
  if (pathname.includes("/schedule")) return "Jadwal Pelajaran";
  if (pathname.includes("/grades")) return "Penilaian";
  if (pathname.includes("/teacher-attendance")) return "Presensi Guru";
  if (pathname.includes("/leave-requests")) return "Izin & Sakit Siswa";
  if (pathname.includes("/attendance")) return "Presensi Siswa";
  if (pathname.includes("/exams")) return "Jadwal Ujian";
  if (pathname.includes("/calendar")) return "Kalender Akademik";
  if (pathname.includes("/announcements")) return "Pengumuman";
  if (pathname.includes("/report-cards")) return "E-Rapor Digital";
  if (pathname.includes("/financial-reports")) return "Laporan Keuangan";
  if (pathname.includes("/payments")) return "Pembayaran SPP";
  if (pathname.includes("/academic-years")) return "Tahun Ajaran";
  if (pathname.includes("/accounts")) return "Manajemen Akun";
  if (pathname.includes("/roles")) return "Role & Permission";
  if (pathname.includes("/settings")) return "Pengaturan Sekolah";
  if (pathname.includes("/profile")) return "Profil";
  if (pathname.includes("/login")) return "Masuk Portal";
  if (pathname.includes("/register-school")) return "Daftar Sekolah";
  return "Smart School OS";
}

export function DynamicFavicon() {
  const { profile } = useSchoolProfile();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof document === "undefined") return;

    // 1. Dynamic Favicon: Determine active school logo URL
    const iconUrl = profile.logoUrl && profile.logoUrl.trim().length > 0 
      ? profile.logoUrl.trim() 
      : "/api/school-profile/logo";

    // Update or inject <link> tags in document.head
    const relTypes = ["icon", "shortcut icon", "apple-touch-icon"];
    relTypes.forEach((rel) => {
      let link: HTMLLinkElement | null = document.querySelector(`link[rel='${rel}']`);
      if (!link) {
        link = document.createElement("link");
        link.rel = rel;
        document.head.appendChild(link);
      }
      if (link.href !== iconUrl) {
        link.href = iconUrl;
      }
    });

    // 2. Dynamic Title: Reflect current school name and active page
    const schoolName = profile.schoolName || "Smart School OS";
    const pageName = getPageName(pathname);

    if (pathname === "/" || pathname === "/login") {
      document.title = `${schoolName} · Portal Terpadu`;
    } else {
      document.title = `${pageName} | ${schoolName}`;
    }
  }, [profile.logoUrl, profile.schoolName, pathname]);

  return null;
}

