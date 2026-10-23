"use client";

import React from "react";
import {
  BookOpen,
  Calendar,
  BarChart2,
  Users,
  CalendarDays,
  Layers
} from "lucide-react";
import FeatureSubpageLayout, { FeatureSubpageData } from "@/components/landing/feature-subpage-layout";

const T: { id: FeatureSubpageData; en: FeatureSubpageData } = {
  id: {
    badge: "Modul Akademik & Jadwal",
    h1a: "Kelola Jadwal & Akademik",
    h1b: "Terpadu & Terstruktur",
    desc: "Platform manajemen kalender pendidikan, distribusi jadwal pelajaran per kelas, mata pelajaran, dan wali kelas dalam satu ekosistem terpadu.",
    cta1: "Mulai Gratis Sekarang",
    cta2: "Buka Jadwal Pelajaran",
    featBadge: "Fitur Akademik",
    featTitle: "Solusi Manajemen Kurikulum & Kelas",
    feats: [
      { icon: BookOpen, title: "Master Mata Pelajaran", desc: "Kelola daftar mata pelajaran, kode mapel, KKM, dan guru pengampu secara terpusat." },
      { icon: CalendarDays, title: "Kalender Akademik", desc: "Penanggalan kegiatan belajar, agenda sekolah, libur semester, dan jadwal ujian resmi." },
      { icon: Calendar, title: "Jadwal Pelajaran per Kelas", desc: "Pengaturan jadwal harian dari Senin hingga Jumat/Sabtu per rombongan belajar." },
      { icon: Users, title: "Manajemen Rombel & Wali Kelas", desc: "Pengelompokan siswa ke dalam kelas serta penugasan guru sebagai wali kelas." },
      { icon: Layers, title: "Tahun Ajaran & Semester", desc: "Pengaturan tahun pelajaran aktif (Ganjil/Genap) dengan riwayat data tersimpan rapi." },
      { icon: BarChart2, title: "Monitoring Beban Ajar", desc: "Pemantauan distribusi jam mengajar setiap guru agar seimbang dan terpantau." },
    ],
    workBadge: "Alur Kerja",
    workTitle: "4 Langkah Pengaturan Akademik",
    workSteps: [
      { n: "01", title: "Setup Mata Pelajaran & Guru", desc: "Input data mata pelajaran dan tentukan guru pengampu untuk tiap bidang studi." },
      { n: "02", title: "Atur Rombongan Belajar", desc: "Tentukan tingkatan kelas (X, XI, XII) dan tunjuk dewan guru sebagai wali kelas." },
      { n: "03", title: "Susun Jadwal Pelajaran", desc: "Tentukan jam pelajaran, hari, dan ruangan untuk tiap kelas tanpa bentrok." },
      { n: "04", title: "Publikasi ke Siswa & Guru", desc: "Jadwal dan kalender langsung dapat diakses dari dashboard siswa dan pendidik." },
    ],
    benefitBadge: "Keunggulan",
    benefitTitle: "Manfaat Manajemen Akademik Quick Schools",
    benefits: [
      "Jadwal pelajaran tersinkronisasi otomatis ke portal guru dan siswa",
      "Kalender akademik interaktif memudahkan perencanaan kegiatan sekolah",
      "Wali kelas memiliki ruang kerja khusus untuk memantau rombongan belajar",
      "Pembaruan jadwal langsung tampil seketika tanpa perlu cetak ulang lembaran",
      "Mencegah jadwal guru ganda pada waktu yang bersamaan",
      "Data akademik terintegrasi dengan modul absensi harian dan rekap nilai",
    ],
    ctaBannerTitle: "Mulai Digitalisasi Akademik Sekolah Anda Hari Ini",
    ctaBannerDesc: "Satu sistem untuk mengelola seluruh jadwal, kelas, dan kurikulum sekolah modern.",
    ctaBannerBtn: "Daftar Gratis Sekarang",
  },
  en: {
    badge: "Academic & Schedule Module",
    h1a: "Manage Schedules & Academics",
    h1b: "Structured & Integrated",
    desc: "Comprehensive platform for academic calendars, class schedule distribution, subjects, and homeroom assignments in one system.",
    cta1: "Start Free Now",
    cta2: "Open Class Schedule",
    featBadge: "Academic Features",
    featTitle: "Curriculum & Classroom Management Solution",
    feats: [
      { icon: BookOpen, title: "Master Subject Directory", desc: "Manage subject registries, course codes, passing thresholds, and instructors centrally." },
      { icon: CalendarDays, title: "Academic Calendar", desc: "Full school calendar for terms, official exam blocks, and pedagogical holidays." },
      { icon: Calendar, title: "Class Timetables", desc: "Weekly schedules mapped from Monday through Friday for each cohort." },
      { icon: Users, title: "Cohort & Homeroom Setup", desc: "Student cohort group assignments and dedicated homeroom faculty pairing." },
      { icon: Layers, title: "Academic Terms & Archive", desc: "Active semester control with pristine multi-year historic data persistence." },
      { icon: BarChart2, title: "Faculty Workload Monitor", desc: "Monitor distribution of teaching hours per instructor with no scheduling conflicts." },
    ],
    workBadge: "Workflow",
    workTitle: "4 Steps to Academic Configuration",
    workSteps: [
      { n: "01", title: "Setup Subjects & Faculty", desc: "Enter course catalogs and assign primary educators for each subject domain." },
      { n: "02", title: "Organize Class Cohorts", desc: "Structure grades and assign faculty members as homeroom mentors." },
      { n: "03", title: "Map Weekly Schedules", desc: "Allocate period slots, days, and campus classrooms with automated collision detection." },
      { n: "04", title: "Publish Real-Time", desc: "Timetables immediately synchronize across student portals and teacher dashboards." },
    ],
    benefitBadge: "Benefits",
    benefitTitle: "Advantages of Quick Schools Academic OS",
    benefits: [
      "Real-time synchronized schedules on faculty and student devices",
      "Interactive academic calendar streamlining semester milestone planning",
      "Dedicated workspace for homeroom mentors to supervise their cohort",
      "Instant schedule updates with zero reprinting paper handouts",
      "Intelligent conflict detector eliminates double-booked instructor hours",
      "Fully linked with daily attendance logs and report card generation",
    ],
    ctaBannerTitle: "Digitize Your School's Academic Operations",
    ctaBannerDesc: "One unified OS for class schedules, homeroom rosters, and modern curriculum standards.",
    ctaBannerBtn: "Register Free Now",
  },
};

function AkademikMockup() {
  const schedule = [
    { time: "07:00 - 08:30", subject: "Matematika Peminatan", teacher: "Drs. Budi Santoso", room: "Ruang 10-A", active: true },
    { time: "08:30 - 10:00", subject: "Fisika Modern", teacher: "Ir. Hendra Wijaya", room: "Lab Fisika", active: false },
    { time: "10:15 - 11:45", subject: "Bahasa Inggris Lanjutan", teacher: "Sarah Jenkins, M.Ed", room: "Ruang 10-A", active: false },
    { time: "12:30 - 14:00", subject: "Teknologi Informasi", teacher: "Danur Adhi, M.Kom", room: "Lab Komputer 1", active: false },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Top bar */}
      <div className="bg-gradient-to-r from-[#531FFF] to-[#6D3DFF] px-5 py-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-purple-200 uppercase tracking-wider">Jadwal Hari Ini</p>
            <p className="text-xs font-black text-white">Kelas 10 IPA 1 · Semester Ganjil</p>
          </div>
        </div>
        <span className="bg-white/20 px-2.5 py-1 rounded-md text-[11px] font-bold backdrop-blur-xs">
          Senin
        </span>
      </div>

      {/* Feed list */}
      <div className="p-4 space-y-2.5 bg-slate-50/50">
        {schedule.map((item, i) => (
          <div
            key={i}
            className={`flex items-center justify-between p-3 bg-white rounded-xl border transition-all ${
              item.active ? "border-[#531FFF] shadow-xs ring-2 ring-[#531FFF]/10" : "border-gray-100 shadow-2xs"
            }`}
          >
            <div className="text-center min-w-[76px] pr-2.5 border-r border-gray-100 shrink-0">
              <p className={`text-[11px] font-extrabold ${item.active ? "text-[#531FFF]" : "text-gray-700"}`}>
                {item.time}
              </p>
              {item.active && (
                <span className="text-[9px] font-black text-white bg-[#531FFF] px-1.5 py-0.5 rounded mt-0.5 inline-block">
                  Berjalan
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0 pl-3">
              <p className="text-xs font-bold text-gray-900 truncate">{item.subject}</p>
              <p className="text-[11px] text-gray-500 font-medium">
                {item.teacher} · <span className="text-[#531FFF] font-semibold">{item.room}</span>
              </p>
            </div>

            <div className={`w-2 h-2 rounded-full shrink-0 ${item.active ? "bg-[#531FFF] animate-ping" : "bg-gray-200"}`} />
          </div>
        ))}

        <div className="mt-2 p-3 bg-white rounded-xl border border-gray-200/80 flex items-center justify-between text-xs">
          <span className="font-semibold text-gray-600">Total Beban Belajar</span>
          <span className="font-extrabold text-[#531FFF]">4 Sesi / 6 Jam Pelajaran</span>
        </div>
      </div>
    </div>
  );
}

export default function AkademikPage() {
  return (
    <FeatureSubpageLayout
      moduleKey="akademik"
      translations={T}
      mockup={<AkademikMockup />}
      dashboardHref="/calendar"
      icon={BookOpen}
    />
  );
}
