"use client";

import React from "react";
import {
  UserCheck,
  MapPin,
  Clock,
  ShieldCheck,
  Smartphone,
  BarChart2
} from "lucide-react";
import FeatureSubpageLayout, { FeatureSubpageData } from "@/components/landing/feature-subpage-layout";

const T: { id: FeatureSubpageData; en: FeatureSubpageData } = {
  id: {
    badge: "Modul Absensi Siswa & Guru",
    h1a: "Presensi Sekolah Akurat",
    h1b: "Bebas Titip Absen",
    desc: "Sistem absensi berbasis validasi lokasi radius GPS (Geofence) sekolah dan pencatatan kehadiran real-time untuk seluruh siswa dan dewan guru.",
    cta1: "Mulai Gratis Sekarang",
    cta2: "Buka Absensi",
    featBadge: "Fitur Presensi",
    featTitle: "Sistem Absensi Lengkap & Terpercaya",
    feats: [
      { icon: MapPin, title: "Validasi GPS Geofence", desc: "Siswa dan guru hanya bisa presensi saat berada dalam radius koordinat lokasi sekolah." },
      { icon: Clock, title: "Pencatatan Real-Time", desc: "Waktu check-in dan check-out tercatat langsung ke sistem detik itu juga tanpa jeda." },
      { icon: ShieldCheck, title: "Anti Titip Absen", desc: "Validasi lokasi perangkat dan sesi login mencegah kecurangan presensi." },
      { icon: UserCheck, title: "Presensi Guru & Staf", desc: "Modul khusus absensi tenaga pendidik dan kependidikan dengan laporan jam kerja." },
      { icon: Smartphone, title: "Akses Fleksibel Mobile", desc: "Dapat diakses melalui browser smartphone, tablet, maupun komputer ruang piket." },
      { icon: BarChart2, title: "Rekap & Ekspor Otomatis", desc: "Rekap harian, mingguan, bulanan, dan semester siap cetak ke format PDF atau Excel." },
    ],
    workBadge: "Alur Presensi",
    workTitle: "Cara Kerja Absensi Geofence",
    workSteps: [
      { n: "01", title: "Buka Portal Absensi", desc: "Siswa atau guru membuka portal Quick Schools melalui perangkat saat tiba di sekolah." },
      { n: "02", title: "Deteksi Koordinat GPS", desc: "Sistem memverifikasi posisi GPS perangkat terhadap titik koordinat dan radius sekolah." },
      { n: "03", title: "Pencatatan Otomatis", desc: "Status Hadir, Terlambat, atau Pulang otomatis dicatat dengan waktu presisi." },
      { n: "04", title: "Sinkronisasi Dashboard", desc: "Admin, wali kelas, dan orang tua dapat langsung melihat rekap kehadiran secara live." },
    ],
    benefitBadge: "Keunggulan",
    benefitTitle: "Manfaat Sistem Absensi Quick Schools",
    benefits: [
      "Validasi GPS akurat sesuai radius geofence yang diatur admin di profil sekolah",
      "Mencegah titip absen dan manipulasi kehadiran siswa maupun guru",
      "Rekap kehadiran harian kelas terbit otomatis tanpa perlu hitung manual",
      "Terintegrasi langsung ke sistem penilaian sikap dan cetak rapor digital",
      "Hemat waktu guru piket dalam mendata siswa yang hadir atau terlambat",
      "Data tersimpan permanen di cloud dengan riwayat per semester",
    ],
    ctaBannerTitle: "Tingkatkan Kedisiplinan Sekolah Anda Hari Ini",
    ctaBannerDesc: "Kelola absensi siswa dan guru dengan mudah, cepat, dan transparan bersama Quick Schools.",
    ctaBannerBtn: "Daftar Gratis Sekarang",
  },
  en: {
    badge: "Student & Teacher Attendance Module",
    h1a: "Accurate School Attendance",
    h1b: "Zero Proxy Check-Ins",
    desc: "Attendance system with school GPS geofence radius validation and real-time check-in logging for all students and teaching staff.",
    cta1: "Start Free Now",
    cta2: "Open Attendance",
    featBadge: "Attendance Features",
    featTitle: "Complete & Reliable Attendance Solution",
    feats: [
      { icon: MapPin, title: "GPS Geofence Validation", desc: "Check-in is only permitted when user is physically within the configured school radius." },
      { icon: Clock, title: "Real-Time Timestamp", desc: "Clock-in and clock-out times are immediately synced to the database with no delay." },
      { icon: ShieldCheck, title: "Anti-Fraud Security", desc: "Device location validation and single-session login prevent proxy attendance." },
      { icon: UserCheck, title: "Teacher & Staff Module", desc: "Dedicated teacher attendance system with work hour tracking and recap reports." },
      { icon: Smartphone, title: "Mobile & Tablet Ready", desc: "Accessible from any mobile phone browser, tablet, or front-desk school station." },
      { icon: BarChart2, title: "Automated Reports & Export", desc: "Daily, weekly, and semester recaps ready to print or export to Excel/PDF." },
    ],
    workBadge: "Workflow",
    workTitle: "How Geofence Attendance Works",
    workSteps: [
      { n: "01", title: "Open Attendance Portal", desc: "Students or teachers open the Quick Schools attendance page upon arriving at school." },
      { n: "02", title: "Verify GPS Location", desc: "The system verifies current GPS coordinates against the school geofence perimeter." },
      { n: "03", title: "Instant Record", desc: "Present, Late, or Departure statuses are registered with precision timestamps." },
      { n: "04", title: "Dashboard Sync", desc: "Admins, homeroom teachers, and parents immediately see attendance metrics." },
    ],
    benefitBadge: "Benefits",
    benefitTitle: "Advantages of Quick Schools Attendance",
    benefits: [
      "Precise GPS validation based on admin-defined radius in school settings",
      "Eliminates proxy attendance and fraudulent time entries",
      "Automated daily classroom recaps without manual tallying",
      "Direct integration into conduct grading and digital report cards",
      "Saves hours of administration time for duty teachers each morning",
      "Secure cloud storage with full multi-year semester archives",
    ],
    ctaBannerTitle: "Upgrade School Discipline & Punctuality",
    ctaBannerDesc: "Manage student and teacher attendance with complete transparency and ease with Quick Schools.",
    ctaBannerBtn: "Register Free Now",
  },
};

function AbsensiMockup() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#531FFF] to-[#6D3DFF] px-5 py-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <div>
            <p className="text-[10px] font-bold text-purple-200 uppercase tracking-wider">Live Presensi Geofence GPS</p>
            <p className="text-xs font-black text-white">Senin, 15 September 2026 — 06:52 WIB</p>
          </div>
        </div>
        <span className="bg-white/20 px-2.5 py-1 rounded-md text-[11px] font-bold backdrop-blur-xs">
          Radius: 100m
        </span>
      </div>

      {/* Feed */}
      <div className="p-4 space-y-2.5 bg-slate-50/50">
        {[
          { name: "Ahmad Rizqi Pratama", class: "10 IPA 1", time: "06:45 WIB", dist: "18m dari gerbang", status: "HADIR" },
          { name: "Siti Nurhaliza", class: "11 IPS 2", time: "06:48 WIB", dist: "32m dari gerbang", status: "HADIR" },
          { name: "Budi Santoso", class: "12 IPA 3", time: "06:51 WIB", dist: "15m dari gerbang", status: "HADIR" },
          { name: "Dewi Rahayu Putri", class: "10 IPS 1", time: "06:52 WIB", dist: "44m dari gerbang", status: "HADIR" },
        ].map((s, i) => (
          <div key={i} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-2xs hover:border-[#531FFF]/20 transition-all">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-purple-50 text-[#531FFF] flex items-center justify-center font-bold text-xs shrink-0">
                {s.name[0]}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate">{s.name}</p>
                <p className="text-[11px] text-gray-500 font-medium">
                  {s.class} · <span className="text-emerald-600 font-semibold">✓ {s.dist}</span>
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] font-bold text-gray-700">{s.time}</p>
              <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {s.status}
              </span>
            </div>
          </div>
        ))}

        <div className="mt-2 p-3 bg-white rounded-xl border border-gray-200/80 flex items-center justify-between text-xs">
          <span className="font-semibold text-gray-600">Total Hadir Hari Ini</span>
          <span className="font-extrabold text-[#531FFF]">1.189 / 1.248 Siswa (95.3%)</span>
        </div>
      </div>
    </div>
  );
}

export default function AbsensiPage() {
  return (
    <FeatureSubpageLayout
      moduleKey="absensi"
      translations={T}
      mockup={<AbsensiMockup />}
      dashboardHref="/attendance"
      icon={UserCheck}
    />
  );
}
