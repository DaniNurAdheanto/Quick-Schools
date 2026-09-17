"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  ArrowRight, Sparkles, CheckCircle2, Users, BookOpen, CreditCard,
  GraduationCap, UserCheck, FileText, Bell, BarChart3, ChevronRight,
  Check, Star, Shield, Zap, Calendar, LayoutDashboard, PenLine,
  Award, CalendarDays, Settings, BookMarked, MapPin
} from "lucide-react";
import LandingNavbar from "@/components/landing/navbar";
import LandingFooter from "@/components/landing/footer";

const T = {
  id: {
    heroBadge: "Platform Manajemen Sekolah Modern",
    heroH1a: "Kelola Sekolah Lebih",
    heroH1b: "Cerdas & Terpadu",
    heroDesc: "Satu platform untuk mengelola presensi, data siswa, kelas, jadwal, penilaian, keuangan SPP, pengumuman, dan laporan sekolah secara real-time.",
    heroCta1: "Mulai Gratis Sekarang",
    heroCta2: "Lihat Fitur",
    heroTrust: "Dipercaya 500+ sekolah · Tanpa kartu kredit · Setup 5 menit",
    statStudents: "Total Siswa",
    statAttend: "Kehadiran Hari Ini",
    statClasses: "Kelas Aktif",
    statSPP: "SPP Terbayar",
    trustedTitle: "Dipercaya 500+ Sekolah & Institusi Pendidikan di Indonesia",
    featBadge: "Fitur Sistem",
    featTitle: "Semua Kebutuhan Manajemen Sekolah dalam Satu Platform",
    featDesc: "Modul yang sudah tersedia dan siap digunakan langsung — tidak ada instalasi tambahan.",
    feats: [
      { icon: LayoutDashboard, title: "Dashboard Real-Time",       desc: "Pantau ringkasan kehadiran, keuangan, dan akademik sekolah dalam satu tampilan." },
      { icon: UserCheck,       title: "Absensi Siswa & Guru",      desc: "Rekap absensi harian siswa dan guru dengan validasi radius geofence lokasi sekolah." },
      { icon: Calendar,        title: "Kalender & Jadwal Pelajaran",desc: "Kelola kalender akademik, jadwal pelajaran per kelas, dan jadwal ujian." },
      { icon: Users,           title: "Data Siswa, Guru & Kelas",  desc: "Kelola biodata siswa, data guru, wali kelas, dan komposisi kelas secara lengkap." },
      { icon: PenLine,         title: "Penilaian & Rapor Digital", desc: "Input nilai per kompetensi, rekap nilai otomatis, cetak rapor digital siap pakai." },
      { icon: CreditCard,      title: "Pembayaran SPP",            desc: "Tagihan SPP digital, rekap pembayaran, konfirmasi real-time, dan laporan tunggakan." },
      { icon: FileText,        title: "Laporan Keuangan",          desc: "Rekap arus kas, laporan pemasukan & pengeluaran, dan monitoring anggaran sekolah." },
      { icon: Bell,            title: "Pengumuman Sekolah",        desc: "Kirim pengumuman ke siswa, guru, staf, dan orang tua dalam satu klik." },
    ],
    howBadge: "Cara Kerja",
    howTitle: "Mulai dalam 3 Langkah Mudah",
    howSteps: [
      { step: "01", title: "Daftar & Setup Profil Sekolah", desc: "Buat akun, lengkapi identitas institusi, logo, NPSN, alamat, dan set radius geofence lokasi sekolah." },
      { step: "02", title: "Tambah Data Siswa & Guru",      desc: "Import atau tambahkan data siswa, guru, kelas, mata pelajaran, dan jadwal pelajaran." },
      { step: "03", title: "Jalankan & Pantau Real-Time",   desc: "Mulai gunakan absensi, input nilai, kelola SPP, dan pantau semua aktivitas di dashboard." },
    ],
    whyBadge: "Keunggulan",
    whyTitle: "Solusi Lengkap untuk Sekolah Modern",
    whys: [
      { icon: Zap,      title: "Setup Cepat < 1 Hari",      desc: "Onboarding sekolah selesai dalam waktu kurang dari satu hari kerja, tanpa instalasi." },
      { icon: Shield,   title: "Keamanan Data Enterprise",   desc: "Data tersimpan aman di Firebase dengan enkripsi dan backup otomatis setiap hari." },
      { icon: BarChart3,title: "Analitik Real-Time",         desc: "Laporan kehadiran, nilai, dan keuangan terupdate otomatis tanpa refresh manual." },
      { icon: MapPin,   title: "Geofence Lokasi Sekolah",   desc: "Admin set radius geofence sekolah untuk validasi absensi berbasis lokasi GPS." },
      { icon: Users,    title: "Multi-Role Access",          desc: "Admin, Guru, Siswa, Orang Tua, dan Super Admin punya portal akses tersendiri." },
      { icon: Settings, title: "Pengaturan Terpusat",        desc: "Profil sekolah diatur di satu tempat dan otomatis dipakai di seluruh sistem." },
    ],
    testiBadge: "Testimoni",
    testiTitle: "Dipercaya Ribuan Pendidik",
    testis: [
      { name: "Dra. Siti Rahmawati", role: "Kepala SMA Negeri 5 Jakarta",  text: "Quick Schools benar-benar mengubah cara kami mengelola sekolah. Absensi geofence sangat membantu, dan rapor digital menghemat waktu staf luar biasa.", rating: 5 },
      { name: "Bpk. Ahmad Fauzi",    role: "Bendahara Yayasan Al-Azhar",   text: "Laporan keuangan dan SPP-nya luar biasa. Rekap bulanan jadi otomatis, kami hemat lebih dari 10 jam per minggu dari pekerjaan administrasi.", rating: 5 },
      { name: "Ibu Dewi Santoso",    role: "Waka Kurikulum BINUS School",  text: "Jadwal pelajaran dan penilaian dalam satu sistem memudahkan guru kami. Rapor digital bisa langsung dicetak tanpa perlu format ulang.", rating: 5 },
    ],
    priceBadge: "Harga",
    priceTitle: "Transparan, Tanpa Biaya Tersembunyi",
    priceDesc: "Pilih paket sesuai skala sekolah. Semua paket termasuk onboarding gratis.",
    plans: [
      { name: "Basic", desc: "Untuk sekolah kecil & pemula", price: "Gratis", unit: "selamanya", btn: "Mulai Gratis", popular: false,
        items: ["Hingga 150 Siswa", "Absensi GPS Standard", "Data Siswa & Guru", "Jadwal Pelajaran", "Laporan Bulanan", "Support Email"] },
      { name: "Pro", desc: "Untuk sekolah menengah & berkembang", price: "Rp 199.000", unit: "/ bulan", btn: "Coba 14 Hari Gratis", popular: true,
        items: ["Hingga 1.000 Siswa", "Absensi + Geofence", "Penilaian & Rapor Digital", "Pembayaran SPP Digital", "Laporan Keuangan Lengkap", "Pengumuman Multi-Target", "Support Prioritas 24/7"] },
      { name: "Enterprise", desc: "Untuk grup sekolah & yayasan besar", price: "Kustom", unit: "", btn: "Hubungi Sales", popular: false,
        items: ["Siswa Tanpa Batas", "Multi-Kampus & Cabang", "API & Integrasi Kustom", "Account Manager Dedikasi", "SLA 99.9% Uptime"] },
    ],
    popularBadge: "Paling Populer",
    ctaTitle: "Siap Mentransformasi Operasional Sekolah Anda?",
    ctaDesc: "Bergabunglah dengan 500+ sekolah yang telah beralih ke Quick Schools.",
    ctaBtn: "Daftar Sekarang — Gratis",
    ctaSub: "Tanpa kartu kredit · Cancel kapanpun · Onboarding gratis",
  },
  en: {
    heroBadge: "Modern School Management Platform",
    heroH1a: "Manage Your School",
    heroH1b: "Smarter & Integrated",
    heroDesc: "One platform for attendance, student data, classes, schedules, grades, tuition payments, announcements, and real-time school reports.",
    heroCta1: "Start Free Now",
    heroCta2: "View Features",
    heroTrust: "Trusted by 500+ schools · No credit card · 5-min setup",
    statStudents: "Total Students",
    statAttend: "Attendance Today",
    statClasses: "Active Classes",
    statSPP: "SPP Paid",
    trustedTitle: "Trusted by 500+ Schools & Educational Institutions in Indonesia",
    featBadge: "System Features",
    featTitle: "All School Management Needs in One Platform",
    featDesc: "Available modules ready to use — no extra installation needed.",
    feats: [
      { icon: LayoutDashboard, title: "Real-Time Dashboard",        desc: "Monitor attendance, finance, and academic summaries in one view." },
      { icon: UserCheck,       title: "Student & Teacher Attendance",desc: "Daily attendance recap with school geofence location validation." },
      { icon: Calendar,        title: "Calendar & Class Schedule",   desc: "Manage academic calendar, class schedules, and exam timetables." },
      { icon: Users,           title: "Student, Teacher & Class Data",desc: "Manage bio-data, teacher data, homeroom, and class compositions." },
      { icon: PenLine,         title: "Grades & Digital Report Cards",desc: "Grade input, auto calculation, and print-ready digital report cards." },
      { icon: CreditCard,      title: "Tuition (SPP) Payment",      desc: "Digital invoicing, payment recap, real-time confirmation & outstanding." },
      { icon: FileText,        title: "Financial Reports",           desc: "Cashflow recap, income & expense reports, and budget monitoring." },
      { icon: Bell,            title: "School Announcements",        desc: "Send announcements to students, teachers, staff, and parents in one click." },
    ],
    howBadge: "How It Works",
    howTitle: "Up & Running in 3 Easy Steps",
    howSteps: [
      { step: "01", title: "Register & Setup School Profile", desc: "Create an account, fill in identity, logo, NPSN, address, and set geofence location radius." },
      { step: "02", title: "Add Student & Teacher Data",      desc: "Import or add students, teachers, classes, subjects, and schedules." },
      { step: "03", title: "Run & Monitor Live",               desc: "Use attendance, grade input, SPP management, and monitor all activities on the dashboard." },
    ],
    whyBadge: "Why Us",
    whyTitle: "Complete Solution for Modern Schools",
    whys: [
      { icon: Zap,      title: "Setup in < 1 Day",           desc: "School onboarding done in less than one business day, no installation." },
      { icon: Shield,   title: "Enterprise Data Security",    desc: "Data stored securely in Firebase with encryption and daily backups." },
      { icon: BarChart3,title: "Real-Time Analytics",         desc: "Attendance, grades, and financial reports auto-update without refresh." },
      { icon: MapPin,   title: "School Geofence Location",   desc: "Admin sets school geofence radius for GPS-based attendance validation." },
      { icon: Users,    title: "Multi-Role Access",           desc: "Admin, Teacher, Student, Parent, and Super Admin each have their own portal." },
      { icon: Settings, title: "Centralized Settings",        desc: "School profile configured once and auto-applied throughout the system." },
    ],
    testiBadge: "Testimonials",
    testiTitle: "Trusted by Thousands of Educators",
    testis: [
      { name: "Dra. Siti Rahmawati", role: "Principal, SMA Negeri 5 Jakarta",  text: "Quick Schools truly changed how we manage our school. Geofence attendance helps control presence, and digital report cards save our staff enormous time.", rating: 5 },
      { name: "Mr. Ahmad Fauzi",     role: "Treasurer, Al-Azhar Foundation",   text: "The financial reports and SPP system are outstanding. Monthly summaries are now automatic — saving over 10 hours per week in admin work.", rating: 5 },
      { name: "Ms. Dewi Santoso",    role: "Vice Principal, BINUS School",     text: "Schedules and assessments in one system make things easy for our teachers. Digital report cards can be printed directly without reformatting.", rating: 5 },
    ],
    priceBadge: "Pricing",
    priceTitle: "Transparent, No Hidden Fees",
    priceDesc: "Choose the plan that fits your school scale. All plans include free onboarding.",
    plans: [
      { name: "Basic", desc: "For small schools & beginners", price: "Free", unit: "forever", btn: "Start Free", popular: false,
        items: ["Up to 150 Students", "Standard GPS Attendance", "Student & Teacher Data", "Class Schedule", "Monthly Reports", "Email Support"] },
      { name: "Pro", desc: "For growing & medium schools", price: "Rp 199,000", unit: "/ month", btn: "Try 14 Days Free", popular: true,
        items: ["Up to 1,000 Students", "Attendance + Geofence", "Grades & Digital Report Cards", "Digital SPP Payment", "Full Financial Reports", "Multi-Target Announcements", "24/7 Priority Support"] },
      { name: "Enterprise", desc: "For school groups & large foundations", price: "Custom", unit: "", btn: "Contact Sales", popular: false,
        items: ["Unlimited Students", "Multi-Campus & Branches", "Custom API & Integration", "Dedicated Account Manager", "SLA 99.9% Uptime"] },
    ],
    popularBadge: "Most Popular",
    ctaTitle: "Ready to Transform Your School Operations?",
    ctaDesc: "Join 500+ schools that have switched to Quick Schools.",
    ctaBtn: "Register Now — It's Free",
    ctaSub: "No credit card · Cancel anytime · Free onboarding",
  },
};

/* ── Dashboard Mockup mirroring real Quick Schools admin UI ── */
function DashboardMockup() {
  return (
    <div className="w-full select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 25px 60px -12px rgba(83,31,255,0.15), 0 0 0 1px rgba(83,31,255,0.06)" }}>
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
          <div className="flex gap-1.5 shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
          </div>
          <div className="flex-1 mx-3 px-3 py-1 bg-white rounded-lg border border-gray-200 flex items-center gap-1.5">
            <svg className="w-2.5 h-2.5 text-purple-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            <span className="text-gray-400 font-semibold" style={{ fontSize: 10 }}>quickschools.id/dashboard</span>
          </div>
        </div>

        {/* App layout */}
        <div className="flex" style={{ height: 380 }}>
          {/* Sidebar — exact colors from real sidebar.tsx */}
          <div className="border-r border-gray-100 flex flex-col shrink-0 py-3" style={{ width: 130, backgroundColor: "#F9FAFB" }}>
            {/* Logo */}
            <div className="flex items-center gap-2 px-3 mb-4">
              <div className="w-7 h-7 rounded-lg bg-white border border-gray-100 shadow-sm flex items-center justify-center shrink-0">
                <Zap className="w-3.5 h-3.5" style={{ color: "#531FFF" }} />
              </div>
              <div>
                <p className="font-extrabold text-gray-800 leading-tight" style={{ fontSize: 9 }}>Quick Schools</p>
                <p className="text-gray-400 font-semibold" style={{ fontSize: 7 }}>Smart School OS</p>
              </div>
            </div>

            {/* OVERVIEW group */}
            <div className="px-2 space-y-0.5">
              <p className="font-extrabold text-gray-400 uppercase px-1 mb-1" style={{ fontSize: 7, letterSpacing: "0.08em" }}>OVERVIEW</p>
              {[
                { icon: LayoutDashboard, label: "Dashboard", active: true },
                { icon: CalendarDays, label: "Kalender", active: false },
                { icon: BookOpen, label: "Jadwal", active: false },
                { icon: Bell, label: "Pengumuman", active: false, badge: 3 },
              ].map((n, i) => (
                <div key={i} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
                  style={{ backgroundColor: n.active ? "white" : "transparent", color: n.active ? "#531FFF" : "#6B7280",
                    boxShadow: n.active ? "0 1px 4px rgba(0,0,0,0.06)" : "none" }}>
                  <n.icon style={{ width: 11, height: 11, color: n.active ? "#531FFF" : "#9CA3AF" }} />
                  <span className="font-semibold" style={{ fontSize: 8 }}>{n.label}</span>
                  {n.badge && <span className="ml-auto font-bold text-white px-1 rounded" style={{ fontSize: 7, backgroundColor: "#531FFF" }}>{n.badge}</span>}
                </div>
              ))}

              {/* MASTER DATA */}
              <p className="font-extrabold text-gray-400 uppercase px-1 mt-3 mb-1" style={{ fontSize: 7, letterSpacing: "0.08em" }}>MASTER DATA</p>
              {[
                { icon: Users, label: "Data Siswa" },
                { icon: GraduationCap, label: "Guru" },
                { icon: BookMarked, label: "Pelajaran" },
              ].map((n, i) => (
                <div key={i} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-gray-500">
                  <n.icon style={{ width: 11, height: 11, color: "#9CA3AF" }} />
                  <span className="font-semibold" style={{ fontSize: 8 }}>{n.label}</span>
                </div>
              ))}

              {/* AKADEMIK */}
              <p className="font-extrabold text-gray-400 uppercase px-1 mt-3 mb-1" style={{ fontSize: 7, letterSpacing: "0.08em" }}>AKADEMIK</p>
              {[
                { icon: UserCheck, label: "Absensi" },
                { icon: PenLine, label: "Penilaian" },
                { icon: Award, label: "Rapor" },
              ].map((n, i) => (
                <div key={i} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-gray-500">
                  <n.icon style={{ width: 11, height: 11, color: "#9CA3AF" }} />
                  <span className="font-semibold" style={{ fontSize: 8 }}>{n.label}</span>
                </div>
              ))}

              {/* KEUANGAN */}
              <p className="font-extrabold text-gray-400 uppercase px-1 mt-3 mb-1" style={{ fontSize: 7, letterSpacing: "0.08em" }}>KEUANGAN</p>
              {[
                { icon: CreditCard, label: "SPP" },
                { icon: FileText, label: "Keuangan" },
              ].map((n, i) => (
                <div key={i} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-gray-500">
                  <n.icon style={{ width: 11, height: 11, color: "#9CA3AF" }} />
                  <span className="font-semibold" style={{ fontSize: 8 }}>{n.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 p-3 overflow-hidden" style={{ backgroundColor: "#FAFBFF" }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-gray-400 font-semibold" style={{ fontSize: 9 }}>Selamat Datang 👋</p>
                <p className="font-extrabold text-gray-900" style={{ fontSize: 13 }}>Dashboard Utama</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ backgroundColor: "#F3F0FF" }}>
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#531FFF" }}></div>
                  <span className="font-bold" style={{ fontSize: 9, color: "#531FFF" }}>Live</span>
                </div>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#531FFF" }}>
                  <span className="text-white font-extrabold" style={{ fontSize: 9 }}>A</span>
                </div>
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[
                { label: "Total Siswa", val: "1.248", iconEl: <Users style={{ width: 14, height: 14, color: "#531FFF" }} />, iconBg: "#F3F0FF", change: "+12", changeColor: "#10b981" },
                { label: "Hadir Hari Ini", val: "96%", iconEl: <UserCheck style={{ width: 14, height: 14, color: "#059669" }} />, iconBg: "#ECFDF5", change: "+2%", changeColor: "#10b981" },
                { label: "Kelas Aktif", val: "36", iconEl: <BookOpen style={{ width: 14, height: 14, color: "#2563eb" }} />, iconBg: "#EFF6FF", change: "Stabil", changeColor: "#6b7280" },
                { label: "SPP Lunas", val: "92%", iconEl: <CreditCard style={{ width: 14, height: 14, color: "#d97706" }} />, iconBg: "#FFFBEB", change: "+5%", changeColor: "#10b981" },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-xl p-2.5 border border-gray-100" style={{ boxShadow: "0 2px 8px -4px rgba(0,0,0,0.06)" }}>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center mb-1.5" style={{ backgroundColor: s.iconBg }}>
                    {s.iconEl}
                  </div>
                  <p className="font-extrabold text-gray-900" style={{ fontSize: 13 }}>{s.val}</p>
                  <p className="text-gray-400 font-semibold uppercase mt-0.5" style={{ fontSize: 7 }}>{s.label}</p>
                  <p className="font-bold mt-0.5" style={{ fontSize: 8, color: s.changeColor }}>↑ {s.change}</p>
                </div>
              ))}
            </div>

            {/* Chart + Live Feed */}
            <div className="grid grid-cols-3 gap-2">
              {/* Bar chart */}
              <div className="col-span-2 bg-white rounded-xl p-3 border border-gray-100" style={{ boxShadow: "0 2px 8px -4px rgba(0,0,0,0.06)" }}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-extrabold uppercase" style={{ fontSize: 9, color: "#531FFF", letterSpacing: "0.06em" }}>Grafik Kehadiran</p>
                    <p className="font-bold text-gray-800" style={{ fontSize: 10 }}>10 Hari Terakhir</p>
                  </div>
                  <span className="text-gray-400 font-bold bg-gray-100 px-2 py-0.5 rounded-full" style={{ fontSize: 8 }}>Real-time</span>
                </div>
                <div className="flex items-end gap-1.5 mt-1" style={{ height: 80 }}>
                  {[72, 85, 78, 92, 88, 96, 91, 98, 95, 97].map((v, i) => (
                    <div key={i} className="flex-1 rounded-t" style={{ height: `${v}%`, backgroundColor: i === 9 ? "#531FFF" : "#DDD6FF" }}></div>
                  ))}
                </div>
              </div>

              {/* Live feed */}
              <div className="bg-white rounded-xl p-2.5 border border-gray-100" style={{ boxShadow: "0 2px 8px -4px rgba(0,0,0,0.06)" }}>
                <p className="text-gray-500 font-extrabold uppercase mb-1.5" style={{ fontSize: 8, letterSpacing: "0.06em" }}>Absensi Live</p>
                <div className="space-y-1.5">
                  {[
                    { name: "Ahmad R.", cl: "10A", color: "#10b981", active: false },
                    { name: "Siti N.", cl: "11B", color: "#531FFF", active: true },
                    { name: "Budi S.", cl: "12C", color: "#10b981", active: false },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5 p-1.5 rounded-lg border"
                      style={{ backgroundColor: s.active ? "rgba(83,31,255,0.04)" : "rgba(236,253,245,0.6)", borderColor: s.active ? "rgba(83,31,255,0.2)" : "rgba(167,243,208,1)" }}>
                      <div className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ backgroundColor: s.color }}></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 truncate" style={{ fontSize: 8 }}>{s.name} · {s.cl}</p>
                        <p className="font-semibold" style={{ fontSize: 7, color: s.active ? "#531FFF" : "#059669" }}>hadir</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating badges */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        style={{ position: "absolute", left: -44, top: "25%", backgroundColor: "white", borderRadius: 16, padding: "10px 14px", border: "1px solid #f3f4f6", boxShadow: "0 10px 30px -8px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", gap: 10 }}
        className="hidden xl:flex"
      >
        <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "#F3F0FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CheckCircle2 style={{ width: 16, height: 16, color: "#531FFF" }} />
        </div>
        <div>
          <p className="font-bold text-gray-900" style={{ fontSize: 11 }}>Absensi Aktif</p>
          <p className="font-semibold" style={{ fontSize: 10, color: "#531FFF" }}>96% hadir hari ini</p>
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        style={{ position: "absolute", right: -44, bottom: 64, backgroundColor: "white", borderRadius: 16, padding: "10px 14px", border: "1px solid #f3f4f6", boxShadow: "0 10px 30px -8px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", gap: 10 }}
        className="hidden xl:flex"
      >
        <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "#F3F0FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CreditCard style={{ width: 16, height: 16, color: "#531FFF" }} />
        </div>
        <div>
          <p className="font-bold text-gray-900" style={{ fontSize: 11 }}>SPP Terbayar</p>
          <p className="font-semibold" style={{ fontSize: 10, color: "#531FFF" }}>92% bulan ini</p>
        </div>
      </motion.div>
    </div>
  );
}

export default function LandingPage() {
  const [lang, setLang] = useState<"id" | "en">("id");

  useEffect(() => {
    const saved = localStorage.getItem("qs_lang") as "id" | "en";
    if (saved === "id" || saved === "en") setLang(saved);
  }, []);

  const changeLang = (l: "id" | "en") => {
    setLang(l);
    localStorage.setItem("qs_lang", l);
  };

  const t = T[lang];

  const featIconBg = ["#F3F0FF","#ECFDF5","#EFF6FF","#F3F0FF","#FFFBEB","#F0F9FF","#F0FDF4","#FFF1F2"];
  const featIconColor = ["#531FFF","#059669","#2563eb","#531FFF","#d97706","#0284c7","#16a34a","#e11d48"];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "white", fontFamily: "var(--font-sans, system-ui, sans-serif)", color: "#111827", overflowX: "hidden" }}>
      <LandingNavbar lang={lang} onChangeLang={changeLang} />

      {/* ── HERO ── */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", paddingTop: 80, paddingBottom: 64, overflow: "hidden" }}>
        {/* Backgrounds via inline style — not Tailwind-dependent */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #F3F0FF 0%, #ffffff 50%, #EEF2FF 100%)" }} />
        <div style={{ position: "absolute", top: 0, right: 0, width: 800, height: 800, background: "radial-gradient(circle, rgba(83,31,255,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(83,31,255,0.08) 1px, transparent 1px)", backgroundSize: "36px 36px", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 10, maxWidth: 1280, margin: "0 auto", padding: "0 24px", width: "100%" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}
            className="grid-cols-1 lg:grid-cols-2">
            {/* Left text */}
            <div>
              {/* Badge */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", backgroundColor: "#F3F0FF", border: "1px solid rgba(83,31,255,0.25)", borderRadius: 12, marginBottom: 24 }}>
                <Sparkles style={{ width: 14, height: 14, color: "#531FFF" }} />
                <span style={{ fontSize: 12, fontWeight: 800, color: "#531FFF" }}>🎓 {t.heroBadge}</span>
              </div>

              {/* H1 */}
              <h1 style={{ fontSize: "clamp(40px, 5vw, 64px)", fontWeight: 900, color: "#111827", lineHeight: 1.08, letterSpacing: "-0.03em", marginBottom: 24 }}>
                {t.heroH1a}{" "}
                <span style={{ background: "linear-gradient(135deg, #531FFF 0%, #7B4DFF 50%, #531FFF 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  {t.heroH1b}
                </span>
              </h1>

              {/* Desc */}
              <p style={{ fontSize: 18, color: "#4B5563", lineHeight: 1.7, fontWeight: 500, marginBottom: 32, maxWidth: 520 }}>
                {t.heroDesc}
              </p>

              {/* CTAs */}
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
                <Link href="/register" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "14px 32px", backgroundColor: "#531FFF", color: "white", borderRadius: 16, fontSize: 15, fontWeight: 700, textDecoration: "none", boxShadow: "0 8px 24px -4px rgba(83,31,255,0.4)", transition: "all 0.2s" }}
                  className="hover:bg-[#4314cc] hover:shadow-xl">
                  {t.heroCta1}
                  <ArrowRight style={{ width: 16, height: 16 }} />
                </Link>
                <Link href="#features" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 32px", backgroundColor: "white", border: "1.5px solid #e5e7eb", color: "#374151", borderRadius: 16, fontSize: 15, fontWeight: 700, textDecoration: "none", transition: "all 0.2s" }}>
                  {t.heroCta2}
                </Link>
              </div>

              {/* Trust line */}
              <p style={{ fontSize: 13, color: "#6B7280", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                <CheckCircle2 style={{ width: 16, height: 16, color: "#10b981", flexShrink: 0 }} />
                {t.heroTrust}
              </p>

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginTop: 40, paddingTop: 32, borderTop: "1px solid rgba(83,31,255,0.1)" }}>
                {[
                  { val: "1.2K+", label: t.statStudents },
                  { val: "96%", label: t.statAttend },
                  { val: "36", label: t.statClasses },
                  { val: "92%", label: t.statSPP },
                ].map((s, i) => (
                  <div key={i}>
                    <p style={{ fontSize: 24, fontWeight: 900, color: "#111827" }}>{s.val}</p>
                    <p style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, marginTop: 2 }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Dashboard Mockup */}
            <div style={{ position: "relative" }}>
              <DashboardMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUSTED BY ── */}
      <section style={{ padding: "56px 0", backgroundColor: "white", borderTop: "1px solid #f3f4f6", borderBottom: "1px solid #f3f4f6" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
          <p style={{ textAlign: "center", fontSize: 11, fontWeight: 800, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.25em", marginBottom: 32 }}>
            {t.trustedTitle}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "16px 64px" }}>
            {["SMA Labschool · Jakarta","BINUS School · Serpong","Al-Azhar · Kelapa Gading","Global Jaya · International","Tarakanita · Jakarta Pusat"].map((s, i) => (
              <p key={i} style={{ fontSize: 14, fontWeight: 800, color: "#9CA3AF", opacity: 0.7, cursor: "default" }}>{s}</p>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ padding: "112px 0", backgroundColor: "#FAFBFF" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", maxWidth: 700, margin: "0 auto 80px" }}>
            <div style={{ display: "inline-flex", padding: "6px 16px", backgroundColor: "#F3F0FF", border: "1px solid rgba(83,31,255,0.2)", borderRadius: 999, marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#531FFF", textTransform: "uppercase", letterSpacing: "0.12em" }}>{t.featBadge}</span>
            </div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 900, color: "#111827", letterSpacing: "-0.02em", marginBottom: 16 }}>{t.featTitle}</h2>
            <p style={{ fontSize: 16, color: "#6B7280", fontWeight: 500 }}>{t.featDesc}</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
            {t.feats.map((f, i) => {
              const Icon = f.icon;
              const featLinks = [
                "/dashboard",
                "/features/absensi",
                "/features/akademik",
                "/data-siswa",
                "/features/laporan",
                "/features/spp",
                "/features/keuangan",
                "/features/pengumuman",
              ];
              return (
                <Link
                  key={i}
                  href={featLinks[i] || "#"}
                  style={{ textDecoration: "none", color: "inherit", display: "flex" }}
                >
                  <motion.div
                    style={{ backgroundColor: "white", border: "1px solid #f3f4f6", borderRadius: 20, padding: 24, display: "flex", flexDirection: "column", width: "100%", cursor: "pointer", transition: "all 0.3s", boxShadow: "0 2px 8px -4px rgba(0,0,0,0.05)" }}
                    whileHover={{ y: -6, boxShadow: "0 20px 40px -12px rgba(83,31,255,0.15)", borderColor: "rgba(83,31,255,0.25)" }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: featIconBg[i], display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                      <Icon style={{ width: 20, height: 20, color: featIconColor[i] }} />
                    </div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 8 }}>{f.title}</h3>
                    <p style={{ fontSize: 13, color: "#6B7280", fontWeight: 500, lineHeight: 1.6, flex: 1 }}>{f.desc}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 16, fontSize: 12, fontWeight: 700, color: "#531FFF" }}>
                      <span>{lang === "id" ? "Pelajari Fitur" : "Learn more"}</span>
                      <ChevronRight style={{ width: 14, height: 14 }} />
                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: "112px 0", backgroundColor: "white" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 80px" }}>
            <div style={{ display: "inline-flex", padding: "6px 16px", backgroundColor: "#F3F0FF", border: "1px solid rgba(83,31,255,0.2)", borderRadius: 999, marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#531FFF", textTransform: "uppercase", letterSpacing: "0.12em" }}>{t.howBadge}</span>
            </div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 900, color: "#111827", letterSpacing: "-0.02em" }}>{t.howTitle}</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 32 }}>
            {t.howSteps.map((s, i) => (
              <motion.div key={i}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                style={{ background: "linear-gradient(135deg, rgba(243,240,255,0.6) 0%, white 100%)", border: "1px solid rgba(83,31,255,0.1)", borderRadius: 24, padding: 32 }}
              >
                <div style={{ fontSize: 48, fontWeight: 900, color: "rgba(83,31,255,0.1)", marginBottom: 16 }}>{s.step}</div>
                <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#531FFF", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, boxShadow: "0 4px 12px rgba(83,31,255,0.3)" }}>
                  {i === 0 && <Settings style={{ width: 18, height: 18, color: "white" }} />}
                  {i === 1 && <Users style={{ width: 18, height: 18, color: "white" }} />}
                  {i === 2 && <LayoutDashboard style={{ width: 18, height: 18, color: "white" }} />}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 12 }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: "#6B7280", fontWeight: 500, lineHeight: 1.6 }}>{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY — Dark ── */}
      <section style={{ padding: "112px 0", backgroundColor: "#0D0820", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 30% 50%, rgba(83,31,255,0.12) 0%, transparent 60%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 70% 20%, rgba(83,31,255,0.08) 0%, transparent 50%)" }} />
        <div style={{ position: "relative", zIndex: 10, maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 80px" }}>
            <div style={{ display: "inline-flex", padding: "6px 16px", backgroundColor: "rgba(83,31,255,0.2)", border: "1px solid rgba(83,31,255,0.3)", borderRadius: 999, marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#A78BFA", textTransform: "uppercase", letterSpacing: "0.12em" }}>{t.whyBadge}</span>
            </div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 900, color: "white", letterSpacing: "-0.02em" }}>{t.whyTitle}</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
            {t.whys.map((w, i) => (
              <motion.div key={i}
                whileHover={{ backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(83,31,255,0.4)", y: -4 }}
                transition={{ duration: 0.2 }}
                style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 24, backdropFilter: "blur(8px)", transition: "all 0.3s" }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(83,31,255,0.2)", border: "1px solid rgba(83,31,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                  <w.icon style={{ width: 20, height: 20, color: "#A78BFA" }} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "white", marginBottom: 8 }}>{w.title}</h3>
                <p style={{ fontSize: 13, color: "#9CA3AF", fontWeight: 500, lineHeight: 1.6 }}>{w.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" style={{ padding: "112px 0", backgroundColor: "white" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 64px" }}>
            <div style={{ display: "inline-flex", padding: "6px 16px", backgroundColor: "#FFFBEB", border: "1px solid rgba(217,119,6,0.2)", borderRadius: 999, marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#d97706", textTransform: "uppercase", letterSpacing: "0.12em" }}>{t.testiBadge}</span>
            </div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 900, color: "#111827", letterSpacing: "-0.02em" }}>{t.testiTitle}</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 32 }}>
            {t.testis.map((testi, i) => (
              <motion.div key={i}
                whileHover={{ y: -4, boxShadow: "0 20px 40px -12px rgba(83,31,255,0.1)", borderColor: "rgba(83,31,255,0.15)" }}
                transition={{ duration: 0.2 }}
                style={{ backgroundColor: "white", border: "1px solid #f3f4f6", borderRadius: 24, padding: 32, boxShadow: "0 2px 8px -4px rgba(0,0,0,0.06)", transition: "all 0.3s" }}
              >
                <div style={{ display: "flex", gap: 2, marginBottom: 20 }}>
                  {Array.from({ length: testi.rating }).map((_, j) => (
                    <Star key={j} style={{ width: 16, height: 16, color: "#f59e0b", fill: "#f59e0b" }} />
                  ))}
                </div>
                <p style={{ fontSize: 14, color: "#374151", fontWeight: 500, lineHeight: 1.7, marginBottom: 24, fontStyle: "italic" }}>"{testi.text}"</p>
                <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 20, borderTop: "1px solid #f3f4f6" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #531FFF 0%, #7B4DFF 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 14 }}>
                    {testi.name[0]}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{testi.name}</p>
                    <p style={{ fontSize: 11, color: "#6B7280", fontWeight: 500 }}>{testi.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ padding: "112px 0", backgroundColor: "#FAFBFF" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 64px" }}>
            <div style={{ display: "inline-flex", padding: "6px 16px", backgroundColor: "#F3F0FF", border: "1px solid rgba(83,31,255,0.2)", borderRadius: 999, marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#531FFF", textTransform: "uppercase", letterSpacing: "0.12em" }}>{t.priceBadge}</span>
            </div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 900, color: "#111827", letterSpacing: "-0.02em", marginBottom: 12 }}>{t.priceTitle}</h2>
            <p style={{ fontSize: 16, color: "#6B7280", fontWeight: 500 }}>{t.priceDesc}</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 32, maxWidth: 1000, margin: "0 auto" }}>
            {t.plans.map((plan, i) => (
              <motion.div key={i}
                whileHover={{ y: plan.popular ? -16 : -4 }}
                transition={{ duration: 0.2 }}
                style={{
                  position: "relative", display: "flex", flexDirection: "column", borderRadius: 24, padding: 32,
                  backgroundColor: plan.popular ? "#531FFF" : "white",
                  border: plan.popular ? "1px solid #531FFF" : "1px solid #e5e7eb",
                  boxShadow: plan.popular ? "0 24px 60px -12px rgba(83,31,255,0.3)" : "0 2px 8px -4px rgba(0,0,0,0.06)",
                  transform: plan.popular ? "translateY(-12px)" : "none",
                }}
              >
                {plan.popular && (
                  <div style={{ position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(90deg, #f59e0b, #f97316)", color: "white", fontSize: 11, fontWeight: 800, padding: "6px 16px", borderRadius: 999, boxShadow: "0 4px 12px rgba(249,115,22,0.4)", whiteSpace: "nowrap" }}>
                    ⭐ {t.popularBadge}
                  </div>
                )}
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: plan.popular ? "white" : "#111827" }}>{plan.name}</h3>
                  <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 24, color: plan.popular ? "#DDD6FF" : "#6B7280" }}>{plan.desc}</p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontSize: 36, fontWeight: 900, color: plan.popular ? "white" : "#111827" }}>{plan.price}</span>
                    {plan.unit && <span style={{ fontSize: 12, fontWeight: 600, color: plan.popular ? "#C4B5FD" : "#9CA3AF" }}>{plan.unit}</span>}
                  </div>
                </div>
                <ul style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
                  {plan.items.map((item, j) => (
                    <li key={j} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", backgroundColor: plan.popular ? "rgba(255,255,255,0.2)" : "#F3F0FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Check style={{ width: 12, height: 12, color: plan.popular ? "white" : "#531FFF", strokeWidth: 3 }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: plan.popular ? "#EDE9FE" : "#374151" }}>{item}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/register" style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 0", borderRadius: 16, fontSize: 14, fontWeight: 700, textDecoration: "none", transition: "all 0.2s",
                  backgroundColor: plan.popular ? "white" : "#531FFF",
                  color: plan.popular ? "#531FFF" : "white",
                  boxShadow: plan.popular ? "0 4px 12px rgba(0,0,0,0.1)" : "0 4px 12px rgba(83,31,255,0.25)",
                }}>
                  {plan.btn} <ArrowRight style={{ width: 16, height: 16 }} />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: "80px 24px", backgroundColor: "white" }}>
        <div
          style={{ maxWidth: 960, margin: "0 auto", position: "relative", overflow: "hidden", borderRadius: 32, background: "linear-gradient(135deg, #531FFF 0%, #6D3DFF 50%, #4314cc 100%)", padding: "64px 48px", textAlign: "center", boxShadow: "0 32px 80px -12px rgba(83,31,255,0.35)" }}
        >
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at top right, rgba(255,255,255,0.08) 0%, transparent 60%)" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 900, color: "white", marginBottom: 20, lineHeight: 1.2 }}>{t.ctaTitle}</h2>
            <p style={{ fontSize: 17, color: "#C4B5FD", fontWeight: 500, marginBottom: 32, maxWidth: 560, margin: "0 auto 32px" }}>{t.ctaDesc}</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
              <Link href="/register" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "16px 32px", backgroundColor: "white", color: "#531FFF", borderRadius: 16, fontSize: 15, fontWeight: 700, textDecoration: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                {t.ctaBtn} <ArrowRight style={{ width: 16, height: 16 }} />
              </Link>
              <Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "16px 32px", backgroundColor: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(255,255,255,0.25)", color: "white", borderRadius: 16, fontSize: 15, fontWeight: 700, textDecoration: "none" }}>
                {lang === "id" ? "Masuk ke Dashboard" : "Go to Dashboard"}
              </Link>
            </div>
            <p style={{ fontSize: 12, color: "#C4B5FD", fontWeight: 500, marginTop: 20 }}>{t.ctaSub}</p>
          </div>
        </div>
      </section>

      <LandingFooter lang={lang} />
    </div>
  );
}
