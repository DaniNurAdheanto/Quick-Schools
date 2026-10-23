"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  LayoutDashboard, UserCheck, BookOpen, CreditCard,
  GraduationCap, Users, FileText, Settings, Search,
  Bell, ChevronDown, CheckCircle2, School
} from "lucide-react";

interface HeroCanvasProps {
  lang: "id" | "en";
}

export default function HeroCanvas({ lang }: HeroCanvasProps) {
  const [activeMenu, setActiveMenu] = useState("dashboard");

  const t = {
    id: {
      welcome: "Selamat datang, Admin Sekolah 👋",
      school: "SMA Nusantara Mandiri Jakarta",
      date: "Sen, 14 Okt 2026",
      searchPlaceholder: "Cari siswa, kelas, invoice...",
      navDashboard: "Dashboard",
      navAttendance: "Presensi",
      navAcademic: "Akademik",
      navFinance: "Keuangan",
      navStudents: "Siswa",
      navTeachers: "Guru",
      navReports: "Laporan",
      navSettings: "Pengaturan",
      kpi1Title: "Tingkat Kehadiran",
      kpi1Badge: "↑ 1.2% dari minggu lalu",
      kpi2Title: "Siswa Aktif",
      kpi2Badge: "+12 siswa baru",
      kpi3Title: "Guru",
      kpi3Badge: "+2 guru baru",
      kpi4Title: "SPP Terkumpul",
      kpi4Badge: "Rata-rata per siswa/bln",
      activityTitle: "Aktivitas Terbaru",
      seeAll: "Lihat Semua",
      chartTitle: "Presensi Hari Ini",
      chartSub: "1.142 siswa",
      act1Title: "Presensi Siswa",
      act1Sub: "Kelas X MIPA 1 · 07:12 WIB",
      act1Status: "Terverifikasi",
      act2Title: "Pengumpulan Tugas",
      act2Sub: "Matematika · 10:24 WIB",
      act2Status: "Menunggu",
      act3Title: "Pembayaran SPP",
      act3Sub: "Raka Pratama · 09:18 WIB",
      act3Status: "Berhasil",
      act4Title: "Laporan Nilai",
      act4Sub: "Kelas XI IPS 2 · 08:45 WIB",
      act4Status: "Diproses",
      floatingPill1: "Geofence Aktif · 0 Titip Absen",
      floatingPill2Title: "SPP Terverifikasi (BCA VA)",
      floatingPill2Sub: "Rp 750.000 · Rekonsiliasi Otomatis",
    },
    en: {
      welcome: "Welcome back, School Admin 👋",
      school: "Nusantara Mandiri High School",
      date: "Mon, Oct 14, 2026",
      searchPlaceholder: "Search students, classes, bills...",
      navDashboard: "Dashboard",
      navAttendance: "Attendance",
      navAcademic: "Academics",
      navFinance: "Finance",
      navStudents: "Students",
      navTeachers: "Teachers",
      navReports: "Reports",
      navSettings: "Settings",
      kpi1Title: "Attendance Rate",
      kpi1Badge: "↑ 1.2% vs last week",
      kpi2Title: "Active Students",
      kpi2Badge: "+12 new enrollments",
      kpi3Title: "Teachers",
      kpi3Badge: "+2 new faculty",
      kpi4Title: "Tuition Collected",
      kpi4Badge: "Avg per student/mo",
      activityTitle: "Recent Activity",
      seeAll: "View All",
      chartTitle: "Today's Attendance",
      chartSub: "1,142 students",
      act1Title: "Student Check-in",
      act1Sub: "Class 10-A · 07:12 AM",
      act1Status: "Verified",
      act2Title: "Assignment Submitted",
      act2Sub: "Mathematics · 10:24 AM",
      act2Status: "Pending",
      act3Title: "Tuition Payment",
      act3Sub: "Raka Pratama · 09:18 AM",
      act3Status: "Success",
      act4Title: "Grade Report",
      act4Sub: "Class 11-B · 08:45 AM",
      act4Status: "In Review",
      floatingPill1: "Geofence Active · 0 Spoofing",
      floatingPill2Title: "Tuition Verified (BCA VA)",
      floatingPill2Sub: "Rp 750,000 · Auto Reconciled",
    }
  }[lang];

  const navItems = [
    { id: "dashboard", icon: LayoutDashboard, label: t.navDashboard },
    { id: "presensi", icon: UserCheck, label: t.navAttendance },
    { id: "akademik", icon: BookOpen, label: t.navAcademic },
    { id: "keuangan", icon: CreditCard, label: t.navFinance },
    { id: "siswa", icon: GraduationCap, label: t.navStudents },
    { id: "guru", icon: Users, label: t.navTeachers },
    { id: "laporan", icon: FileText, label: t.navReports },
    { id: "pengaturan", icon: Settings, label: t.navSettings },
  ];

  return (
    <div className="relative w-full max-w-2xl mx-auto lg:max-w-none select-none">
      {/* Dynamic Animated Pastel Aura behind Mockup */}
      <motion.div
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.65, 0.9, 0.65]
        }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-12 -right-10 w-[500px] h-[450px] bg-gradient-to-bl from-[#531FFF]/15 via-[#7B4DFF]/10 to-transparent rounded-full blur-3xl -z-10 pointer-events-none"
      />
      <motion.div
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.5, 0.75, 0.5]
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute -bottom-8 -left-8 w-[380px] h-[380px] bg-[#531FFF]/8 rounded-full blur-2xl -z-10 pointer-events-none"
      />

      {/* Floating Eye-Candy Micro-Pill 1: Top-Right Geofence Radar */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        className="hidden xl:flex items-center gap-2.5 absolute -top-5 -right-4 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200/90 shadow-lg shadow-[#531FFF]/5 z-20"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-[11px] font-bold text-slate-800">{t.floatingPill1}</span>
      </motion.div>

      {/* Floating Eye-Candy Micro-Pill 2: Bottom-Left Auto-Reconciliation */}
      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
        className="hidden xl:flex items-center gap-2.5 absolute -bottom-5 -left-4 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200/90 shadow-lg shadow-[#531FFF]/5 z-20"
      >
        <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-bold">
          ✓
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-800 leading-none">{t.floatingPill2Title}</p>
          <p className="text-[8px] text-slate-400 mt-0.5">{t.floatingPill2Sub}</p>
        </div>
      </motion.div>

      {/* Main SaaS Mockup Card with Entrance & Subtle Hover Depth */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        whileHover={{ y: -3 }}
        className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/90 shadow-[0_25px_70px_-15px_rgba(83,31,255,0.12),0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden transition-shadow hover:shadow-[0_30px_80px_-15px_rgba(83,31,255,0.18)]"
      >
        {/* Inner 2-Column Layout: Mini Sidebar + Dashboard Body */}
        <div className="grid grid-cols-12 min-h-[440px]">
          
          {/* ── Left Mini Sidebar (3 cols on md+) ── */}
          <div className="col-span-3 sm:col-span-3 border-r border-slate-100 bg-slate-50/70 p-3 sm:p-4 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Mini Brand Logo */}
              <div className="flex items-center gap-2 px-1">
                <div className="w-6 h-6 rounded-md bg-[#531FFF] flex items-center justify-center text-white shadow-xs">
                  <span className="text-[11px] font-black leading-none">Q</span>
                </div>
                <div className="hidden sm:block leading-none">
                  <p className="text-[12px] font-black text-slate-900 tracking-tight">Quick Schools</p>
                  <p className="text-[8px] font-bold text-[#531FFF] uppercase tracking-wider">School OS</p>
                </div>
              </div>

              {/* Sidebar Navigation */}
              <nav className="space-y-0.5">
                {navItems.map((item) => {
                  const isActive = activeMenu === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveMenu(item.id)}
                      className={`w-full flex items-center gap-2 px-2 sm:px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all text-left ${
                        isActive
                          ? "bg-[#531FFF] text-white shadow-xs font-bold"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                      }`}
                    >
                      <item.icon className="w-3.5 h-3.5 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                      <span className="hidden sm:inline truncate">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* School Profile Pill bottom */}
            <div className="hidden sm:flex items-center gap-2 p-1.5 rounded-lg bg-white border border-slate-200/60 shadow-2xs mt-4">
              <div className="w-6 h-6 rounded-full bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center text-[10px] font-bold">
                SN
              </div>
              <div className="truncate leading-none">
                <p className="text-[10px] font-bold text-slate-800 truncate">SMA Nusantara</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[8px] text-emerald-600 font-semibold">Online</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right Dashboard Body (9 cols) ── */}
          <div className="col-span-9 sm:col-span-9 p-4 sm:p-5 flex flex-col justify-between space-y-4 bg-white">
            
            {/* Top Bar: Search, Notification, Avatar */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/70 text-slate-400 text-[11px] w-full max-w-[200px] sm:max-w-[240px]">
                <Search className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate hidden sm:inline">{t.searchPlaceholder}</span>
                <span className="truncate sm:hidden">Cari...</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="relative p-1.5 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer">
                  <Bell className="w-3.5 h-3.5" />
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#531FFF] animate-ping" />
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#531FFF]" />
                </div>
                <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#531FFF] to-[#7B4DFF] text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                    AD
                  </div>
                  <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block" />
                </div>
              </div>
            </div>

            {/* Greeting Header */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">
                  {t.welcome}
                </h4>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                  <School className="w-3 h-3 text-slate-400" />
                  <span>{t.school}</span>
                </div>
              </div>
              <span className="text-[10px] font-medium text-slate-400 shrink-0 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                {t.date}
              </span>
            </div>

            {/* 4 KPI Metric Cards with Interactive Hover */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <motion.div
                whileHover={{ y: -2 }}
                transition={{ duration: 0.15 }}
                className="p-2 sm:p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 shadow-2xs hover:border-[#531FFF]/30 hover:bg-white transition-colors"
              >
                <p className="text-[9px] sm:text-[10px] text-slate-500 font-medium truncate">{t.kpi1Title}</p>
                <p className="text-sm sm:text-base font-black text-slate-900 tracking-tight mt-0.5">98.4%</p>
                <span className="text-[8px] font-bold text-emerald-600 block mt-0.5 truncate">{t.kpi1Badge}</span>
              </motion.div>

              <motion.div
                whileHover={{ y: -2 }}
                transition={{ duration: 0.15 }}
                className="p-2 sm:p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 shadow-2xs hover:border-[#531FFF]/30 hover:bg-white transition-colors"
              >
                <p className="text-[9px] sm:text-[10px] text-slate-500 font-medium truncate">{t.kpi2Title}</p>
                <p className="text-sm sm:text-base font-black text-slate-900 tracking-tight mt-0.5">1.142</p>
                <span className="text-[8px] font-bold text-[#531FFF] block mt-0.5 truncate">{t.kpi2Badge}</span>
              </motion.div>

              <motion.div
                whileHover={{ y: -2 }}
                transition={{ duration: 0.15 }}
                className="p-2 sm:p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 shadow-2xs hover:border-[#531FFF]/30 hover:bg-white transition-colors"
              >
                <p className="text-[9px] sm:text-[10px] text-slate-500 font-medium truncate">{t.kpi3Title}</p>
                <p className="text-sm sm:text-base font-black text-slate-900 tracking-tight mt-0.5">62</p>
                <span className="text-[8px] font-bold text-[#531FFF] block mt-0.5 truncate">{t.kpi3Badge}</span>
              </motion.div>

              <motion.div
                whileHover={{ y: -2 }}
                transition={{ duration: 0.15 }}
                className="p-2 sm:p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 shadow-2xs hover:border-[#531FFF]/30 hover:bg-white transition-colors"
              >
                <p className="text-[9px] sm:text-[10px] text-slate-500 font-medium truncate">{t.kpi4Title}</p>
                <p className="text-xs sm:text-[13px] font-black text-slate-900 tracking-tight mt-0.5 truncate">Rp 285jt</p>
                <span className="text-[8px] text-slate-400 block mt-0.5 truncate">{t.kpi4Badge}</span>
              </motion.div>
            </div>

            {/* Bottom 2 Columns: Aktivitas Terbaru & Chart Presensi Hari Ini */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
              
              {/* Left Column: Aktivitas Terbaru (7 cols) */}
              <div className="sm:col-span-7 p-3 rounded-xl bg-white border border-slate-100 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#531FFF] animate-pulse" />
                    <span className="text-[11px] font-extrabold text-slate-900">{t.activityTitle}</span>
                  </div>
                  <span className="text-[9px] font-bold text-[#531FFF] hover:underline cursor-pointer">{t.seeAll}</span>
                </div>

                <div className="space-y-1.5">
                  {[
                    { title: t.act1Title, sub: t.act1Sub, status: t.act1Status, badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-100" },
                    { title: t.act2Title, sub: t.act2Sub, status: t.act2Status, badgeColor: "bg-sky-50 text-sky-700 border-sky-100" },
                    { title: t.act3Title, sub: t.act3Sub, status: t.act3Status, badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-100" },
                    { title: t.act4Title, sub: t.act4Sub, status: t.act4Status, badgeColor: "bg-slate-100 text-slate-600 border-slate-200" },
                  ].map((act, i) => (
                    <motion.div
                      key={i}
                      whileHover={{ x: 2 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50/60 hover:bg-slate-100/60 transition-colors cursor-default"
                    >
                      <div className="truncate mr-2">
                        <p className="text-[10px] font-bold text-slate-800 truncate">{act.title}</p>
                        <p className="text-[8px] text-slate-400 truncate">{act.sub}</p>
                      </div>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md border shrink-0 ${act.badgeColor}`}>
                        {act.status}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Right Column: Presensi Hari Ini + SVG Area Chart (5 cols) */}
              <div className="sm:col-span-5 p-3 rounded-xl bg-white border border-slate-100 shadow-2xs flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-slate-500">{t.chartTitle}</p>
                  <p className="text-sm font-black text-slate-900 tracking-tight mt-0.5">{t.chartSub}</p>
                </div>

                {/* SVG Curve Chart with Dynamic Pulsing Peak */}
                <div className="my-2">
                  <svg viewBox="0 0 160 60" className="w-full h-14 overflow-visible">
                    <defs>
                      <linearGradient id="purpleAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#531FFF" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="#531FFF" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {/* Area fill */}
                    <path
                      d="M 0,42 Q 25,38 50,48 T 100,28 T 135,16 T 160,22 L 160,60 L 0,60 Z"
                      fill="url(#purpleAreaGrad)"
                    />
                    {/* Line stroke */}
                    <path
                      d="M 0,42 Q 25,38 50,48 T 100,28 T 135,16 T 160,22"
                      fill="none"
                      stroke="#531FFF"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    {/* Data Points with gentle pulse on peak */}
                    <circle cx="100" cy="28" r="3" fill="#531FFF" />
                    <motion.circle
                      cx="135"
                      cy="16"
                      r="3.5"
                      fill="#531FFF"
                      animate={{ scale: [1, 1.35, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </svg>

                  {/* Day labels along bottom */}
                  <div className="flex items-center justify-between text-[8px] font-semibold text-slate-400 px-1 pt-1 border-t border-slate-100">
                    <span>Sen</span>
                    <span>Sel</span>
                    <span>Rab</span>
                    <span>Kam</span>
                    <span>Jum</span>
                    <span>Sab</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[8px] text-slate-400 font-medium">
                  <span className="flex items-center gap-1 text-emerald-600 font-bold">
                    <CheckCircle2 className="w-2.5 h-2.5" /> 98.4% Hadir
                  </span>
                  <span>Target: 95%</span>
                </div>
              </div>

            </div>

          </div>

        </div>

      </motion.div>
    </div>
  );
}
