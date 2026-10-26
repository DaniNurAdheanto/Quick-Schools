"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  Megaphone,
  Users,
  GraduationCap,
  Award,
  FileCheck,
  FileText,
  CreditCard,
  Settings,
  ChevronDown,
  UserCog,
  PenLine,
  UserCheck,
  ClipboardCheck,
  ShieldCheck,
  Eye,
  ScanFace,
  School,
  Wallet,
  CheckCircle2,
  Lock,
  RotateCw,
  Search,
  Bell,
  Sparkles,
  MapPin,
  TrendingUp,
  Check,
  Smartphone,
  ArrowUpRight
} from "lucide-react";

interface HeroCanvasProps {
  lang: "id" | "en";
}

export default function HeroCanvas({ lang }: HeroCanvasProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "presensi" | "keuangan" | "akademik">("overview");
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [selectedRole, setSelectedRole] = useState("superadmin");

  const t = {
    id: {
      url: "https://app.quickschools.id/dashboard/admin",
      liveBadge: "Sistem Aktif · Cloud Synchronized",
      schoolName: "SMA Nusantara Mandiri Jakarta",
      npsn: "NPSN 20108392",
      akreditasi: "Akreditasi A Unggul",
      academicYear: "T.A. 2026/2027 Ganjil",
      hubTitle: "Super Administrator Executive Hub",
      hubGreeting: "Selamat Datang, Super Admin",
      hubDesc: "Pusat kendali ekosistem terpadu: Presensi GPS Geofence, Kurikulum Merdeka, SPP Virtual Account, & WhatsApp Gateway.",
      btnPreviewRole: "Pratinjau Role",
      previewSubtitle: "Beralih Sudut Pandang Portal",
      searchPlaceholder: "Cari siswa, NISN, tagihan SPP, rombel, guru...",
      
      // Sidebar Groups
      navGroupMain: "UTAMA",
      navDashboard: "Dashboard Super Admin",
      navCalendar: "Kalender Akademik",
      navSchedule: "Jadwal Pelajaran",
      navAnnounce: "Broadcast Pengumuman",
      
      navGroupMaster: "DATA POKOK",
      navStudents: "Database Siswa (NISN)",
      navTeachers: "Dewan Guru & Tendik",
      navParents: "Portal Wali Murid",
      navClasses: "Rombongan Belajar",
      
      navGroupAcademic: "AKADEMIK & PRESENSI",
      navAttendance: "Presensi GPS Siswa",
      navLeaves: "Izin & Sakit (Surat Dokter)",
      navTeacherAtt: "Absensi Guru & Tendik",
      navGrades: "Penilaian Kurikulum Merdeka",
      navReports: "Cetak e-Rapor Digital",
      
      navGroupFinance: "KEUANGAN SEKOLAH",
      navPayments: "Pembayaran SPP (VA & QRIS)",
      navFinReport: "Laporan Arus Kas",
      
      navGroupSystem: "SISTEM & HAK AKSES",
      navAccounts: "Manajemen Akun Sivitas",
      navRoles: "Role & Permission Matrix",
      navSettings: "Pengaturan Sekolah",

      // Tabs
      tabOverview: "Ikhtisar Eksekutif",
      tabPresensi: "Radar Presensi GPS",
      tabKeuangan: "Keuangan SPP & VA",
      tabAkademik: "Kurikulum & e-Rapor",

      // 6 Vitals
      v1Title: "Total Siswa Aktif",
      v1Val: "1.248",
      v1Sub: "36 Rombel · 612 L / 636 P",
      v2Title: "Dewan Guru & Tendik",
      v2Val: "84",
      v2Sub: "100% NUPTK Terverifikasi",
      v3Title: "Presensi Hari Ini",
      v3Val: "98.7%",
      v3Sub: "1.232 Hadir · Geofence Valid",
      v4Title: "SPP Terkumpul Bulan Ini",
      v4Val: "Rp 842.5M",
      v4Sub: "96.4% Otomatis BCA & Mandiri VA",
      v5Title: "Kurikulum Merdeka",
      v5Val: "36 Rombel",
      v5Sub: "100% TP Siap Cetak e-Rapor",
      v6Title: "Jadwal Pelajaran",
      v6Val: "100%",
      v6Sub: "0 Konflik Jam / Ruang",

      // Tab Presensi
      presensiStreamTitle: "Feed Log Presensi GPS Real-Time",
      presensiGeofenceTag: "Geofence Radius 50m Aktif",
      p1Name: "Raka Pratama",
      p1Class: "Kelas X MIPA 1 · NISN 0078129301",
      p1Time: "06:48 WIB · Pintu Gerbang Utama",
      p1Status: "Valid Radius 8m",
      p2Name: "Alya Zahra Safitri",
      p2Class: "Kelas XI IPS 2 · NISN 0064921029",
      p2Time: "06:52 WIB · Lobby Gedung B",
      p2Status: "Valid Radius 14m",
      p3Name: "Fikri Maulana",
      p3Class: "Kelas XII MIPA 3 · NISN 0053912084",
      p3Time: "06:55 WIB · Laboratorium Sains",
      p3Status: "Valid Radius 11m",

      leaveTitle: "Antrean Persetujuan Izin & Sakit",
      leaveBadge: "3 Butuh Approval",
      leave1Name: "Siti Rahmawati (X MIPA 2)",
      leave1Reason: "Sakit (Demam) · Surat Dokter Terlampir",
      leave1Status: "Menunggu Persetujuan",
      leave2Name: "Dimas Anggara (XI IPS 1)",
      leave2Reason: "Izin Dinas: Olimpiade Sains Nasional (OSN)",
      leave2Status: "Menunggu Persetujuan",

      // Tab Keuangan
      finStreamTitle: "Transaksi SPP Virtual Account & QRIS",
      finAutoRecon: "Rekonsiliasi Otomatis 100%",
      f1Student: "Budi Santoso (X MIPA 1)",
      f1Bank: "BCA Virtual Account",
      f1Amount: "Rp 750.000",
      f1Status: "Lunas Terverifikasi",
      f1Time: "07:10 WIB · Notif WA Terkirim",
      f2Student: "Nadia Utami (XI IPS 3)",
      f2Bank: "Mandiri Bill Payment",
      f2Amount: "Rp 750.000",
      f2Status: "Lunas Terverifikasi",
      f2Time: "07:05 WIB · Notif WA Terkirim",
      f3Student: "Rifqi Alamsyah (XII MIPA 2)",
      f3Bank: "QRIS Dinamis Yayasan",
      f3Amount: "Rp 1.500.000 (SPP + Ujian)",
      f3Status: "Lunas Terverifikasi",
      f3Time: "06:50 WIB · Notif WA Terkirim",

      // Tab Akademik
      raporTitle: "Progres Pengisian & Cetak e-Rapor Kurikulum Merdeka",
      raporReady: "34 dari 36 Rombel Siap Cetak",
      tpTitle: "Pemetaan Tujuan Pembelajaran (TP)",
      tpSub: "1.840 Capaian Pembelajaran Terdistribusi",
      topClassesTitle: "Rata-rata Capaian Asesmen Tertinggi",
    },
    en: {
      url: "https://app.quickschools.id/dashboard/admin",
      liveBadge: "System Active · Cloud Synchronized",
      schoolName: "Nusantara Mandiri High School Jakarta",
      npsn: "NPSN 20108392",
      akreditasi: "Grade A Superior Accreditation",
      academicYear: "A.Y. 2026/2027 Odd Semester",
      hubTitle: "Super Administrator Executive Hub",
      hubGreeting: "Welcome back, Super Admin",
      hubDesc: "Unified operational command center: GPS Geofence Attendance, Merdeka Curriculum, Tuition VA Auto-Reconciliation, & WhatsApp Gateway.",
      btnPreviewRole: "Preview Role",
      previewSubtitle: "Switch Portal Viewpoint",
      searchPlaceholder: "Search students, NISN, bills, classes, faculty...",
      
      // Sidebar Groups
      navGroupMain: "OVERVIEW",
      navDashboard: "Super Admin Dashboard",
      navCalendar: "Academic Calendar",
      navSchedule: "Class Timetables",
      navAnnounce: "Broadcast Announcements",
      
      navGroupMaster: "MASTER DATA",
      navStudents: "Student Database (NISN)",
      navTeachers: "Faculty & Staff",
      navParents: "Parent Portal",
      navClasses: "Cohorts & Classes",
      
      navGroupAcademic: "ACADEMIC & ATTENDANCE",
      navAttendance: "GPS Attendance",
      navLeaves: "Leave & Medical Notes",
      navTeacherAtt: "Faculty Check-In",
      navGrades: "Assessment & Gradebook",
      navReports: "Digital Report Cards",
      
      navGroupFinance: "SCHOOL FINANCE",
      navPayments: "Tuition Fees (VA & QRIS)",
      navFinReport: "Cashflow Reports",
      
      navGroupSystem: "SYSTEM & SECURITY",
      navAccounts: "User Accounts",
      navRoles: "Role & Permission Matrix",
      navSettings: "School Settings",

      // Tabs
      tabOverview: "Executive Overview",
      tabPresensi: "GPS Geofence Radar",
      tabKeuangan: "Tuition & VA Reconciliation",
      tabAkademik: "Curriculum & Report Cards",

      // 6 Vitals
      v1Title: "Total Active Students",
      v1Val: "1,248",
      v1Sub: "36 Cohorts · 612 Boys / 636 Girls",
      v2Title: "Faculty & Staff",
      v2Val: "84",
      v2Sub: "100% Certified Educators",
      v3Title: "Attendance Today",
      v3Val: "98.7%",
      v3Sub: "1,232 Present · Geofence Valid",
      v4Title: "Tuition Collected This Month",
      v4Val: "Rp 842.5M",
      v4Sub: "96.4% Auto VA BCA & Mandiri",
      v5Title: "Merdeka Curriculum",
      v5Val: "36 Cohorts",
      v5Sub: "100% Learning Goals Ready",
      v6Title: "Schedule Integrity",
      v6Val: "100%",
      v6Sub: "0 Conflicts Detected",

      // Tab Presensi
      presensiStreamTitle: "Live Real-Time GPS Check-In Stream",
      presensiGeofenceTag: "Geofence 50m Active",
      p1Name: "Raka Pratama",
      p1Class: "Grade 10-A · NISN 0078129301",
      p1Time: "06:48 AM · Main Gate Checkpoint",
      p1Status: "Valid Radius 8m",
      p2Name: "Alya Zahra Safitri",
      p2Class: "Grade 11-B · NISN 0064921029",
      p2Time: "06:52 AM · Building B Lobby",
      p2Status: "Valid Radius 14m",
      p3Name: "Fikri Maulana",
      p3Class: "Grade 12-A · NISN 0053912084",
      p3Time: "06:55 AM · Science Laboratory",
      p3Status: "Valid Radius 11m",

      leaveTitle: "Medical & Leave Approval Queue",
      leaveBadge: "3 Pending Review",
      leave1Name: "Siti Rahmawati (10-B)",
      leave1Reason: "Medical (Fever) · Doctor Note Attached",
      leave1Status: "Pending Approval",
      leave2Name: "Dimas Anggara (11-A)",
      leave2Reason: "Official Event: National Science Olympiad",
      leave2Status: "Pending Approval",

      // Tab Keuangan
      finStreamTitle: "Tuition Transactions via VA & QRIS",
      finAutoRecon: "100% Auto Reconciliation",
      f1Student: "Budi Santoso (10-A)",
      f1Bank: "BCA Virtual Account",
      f1Amount: "Rp 750,000",
      f1Status: "Verified Paid",
      f1Time: "07:10 AM · WhatsApp Sync Sent",
      f2Student: "Nadia Utami (11-C)",
      f2Bank: "Mandiri Bill Payment",
      f2Amount: "Rp 750,000",
      f2Status: "Verified Paid",
      f2Time: "07:05 AM · WhatsApp Sync Sent",
      f3Student: "Rifqi Alamsyah (12-B)",
      f3Bank: "Dynamic QRIS Payment",
      f3Amount: "Rp 1,500,000 (Tuition + Exam)",
      f3Status: "Verified Paid",
      f3Time: "06:50 AM · WhatsApp Sync Sent",

      // Tab Akademik
      raporTitle: "Digital Report Card Progress",
      raporReady: "34 of 36 Cohorts Ready to Export",
      tpTitle: "Learning Objectives Mapping",
      tpSub: "1,840 Curricular Goals Assigned",
      topClassesTitle: "Top Assessment Average Cohorts",
    },
  }[lang];

  const roleList = [
    { id: "superadmin", label: "Super Admin", desc: "Full Operational Control", icon: ShieldCheck, color: "text-[#531FFF]" },
    { id: "kepsek", label: "Kepala Sekolah", desc: "Executive KPI & Audit", icon: School, color: "text-indigo-600" },
    { id: "guru", label: "Dewan Guru", desc: "Presensi, Nilai & Rapor", icon: UserCheck, color: "text-amber-600" },
    { id: "ortu", label: "Orang Tua / Wali", desc: "Live Notif WA & Bayar SPP", icon: Users, color: "text-emerald-600" },
    { id: "siswa", label: "Siswa", desc: "Presensi GPS & Jadwal", icon: GraduationCap, color: "text-purple-600" },
  ];

  return (
    <div className="relative w-full max-w-7xl mx-auto select-none">
      {/* Background Soft Purple Aura */}
      <div className="absolute -top-14 inset-x-8 h-80 bg-gradient-to-b from-[#531FFF]/15 via-[#7C3AED]/10 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />

      {/* Floating Pill: Left Geofence Badge */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="hidden xl:flex items-center gap-2.5 absolute -top-5 left-6 bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-200 shadow-xl shadow-[#531FFF]/10 z-30"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
        <div className="leading-tight">
          <p className="text-[11px] font-bold text-slate-900">Geofence Radar v2.4 Active</p>
          <p className="text-[9px] text-slate-500">Akurasi GPS & Anti Titip Absen</p>
        </div>
      </motion.div>

      {/* Floating Pill: Right Bank VA Auto-Match */}
      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="hidden xl:flex items-center gap-3 absolute -top-5 right-6 bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-200 shadow-xl shadow-[#531FFF]/10 z-30"
      >
        <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-black">
          ✓
        </div>
        <div className="leading-tight">
          <p className="text-[11px] font-bold text-slate-900">BCA, Mandiri & BNI VA Match</p>
          <p className="text-[9px] text-emerald-600 font-semibold">Rekonsiliasi Otomatis 100%</p>
        </div>
      </motion.div>

      {/* ── Main macOS Container Window ── */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-[0_30px_90px_-20px_rgba(83,31,255,0.18),0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden transition-all hover:shadow-[0_40px_100px_-20px_rgba(83,31,255,0.24)]"
      >
        {/* ── Chrome Header Bar ── */}
        <div className="h-12 bg-slate-100/90 border-b border-slate-200/80 px-4 sm:px-5 flex items-center justify-between gap-3">
          {/* Traffic Lights */}
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]/60 inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]/60 inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]/60 inline-block" />
          </div>

          {/* Browser URL Pill */}
          <div className="flex items-center gap-2 px-3.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-500 text-[11px] font-medium shadow-2xs max-w-xs sm:max-w-md w-full justify-center">
            <Lock className="w-3 h-3 text-emerald-600 shrink-0" />
            <span className="tracking-tight text-slate-700 font-mono truncate">{t.url}</span>
            <RotateCw className="w-3 h-3 text-slate-400 ml-auto hidden sm:block shrink-0" />
          </div>

          {/* Live Sync Badge */}
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-1 rounded-full shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">{t.liveBadge}</span>
            <span className="sm:hidden">Live</span>
          </div>
        </div>

        {/* ── Window Body: Authentic Super Admin Layout ── */}
        <div className="grid grid-cols-12 min-h-[640px]">
          
          {/* ══════════════════════════════════════════════════════════════
              LEFT SIDEBAR: Complete Super Admin Module Navigation
          ══════════════════════════════════════════════════════════════ */}
          <aside className="col-span-3 lg:col-span-3 xl:col-span-2 border-r border-slate-100 bg-slate-50/70 p-3 sm:p-3.5 flex flex-col justify-between overflow-y-auto max-h-[760px]">
            <div className="space-y-4">
              {/* Brand Logo & School App Tag */}
              <div className="flex items-center gap-2.5 px-1 pb-1 border-b border-slate-200/60">
                <div className="w-7 h-7 rounded-xl bg-[#531FFF] flex items-center justify-center text-white shadow-xs shrink-0">
                  <span className="text-xs font-black">Q</span>
                </div>
                <div className="hidden sm:block leading-none">
                  <p className="text-xs font-black text-slate-900 tracking-tight">Quick Schools</p>
                  <p className="text-[8px] font-bold text-[#531FFF] uppercase tracking-wider mt-0.5">Super Admin OS</p>
                </div>
              </div>

              {/* Group 1: Overview */}
              <div className="space-y-1">
                <p className="px-2 text-[9px] font-black text-slate-400 uppercase tracking-wider hidden sm:block">
                  {t.navGroupMain}
                </p>
                {[
                  { id: "dashboard", icon: LayoutDashboard, label: t.navDashboard, targetTab: "overview" },
                  { id: "kalender", icon: CalendarDays, label: t.navCalendar, targetTab: "akademik" },
                  { id: "jadwal", icon: BookOpen, label: t.navSchedule, targetTab: "akademik" },
                  { id: "pengumuman", icon: Megaphone, label: t.navAnnounce, targetTab: "overview" },
                ].map((item) => {
                  const isActive = activeMenu === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveMenu(item.id);
                        setActiveTab(item.targetTab as any);
                      }}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all text-left ${
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
              </div>

              {/* Group 2: Master Data */}
              <div className="space-y-1">
                <p className="px-2 text-[9px] font-black text-slate-400 uppercase tracking-wider hidden sm:block">
                  {t.navGroupMaster}
                </p>
                {[
                  { id: "siswa", icon: GraduationCap, label: t.navStudents, targetTab: "overview" },
                  { id: "guru", icon: Users, label: t.navTeachers, targetTab: "overview" },
                  { id: "ortu", icon: UserCheck, label: t.navParents, targetTab: "overview" },
                  { id: "kelas", icon: School, label: t.navClasses, targetTab: "akademik" },
                ].map((item) => {
                  const isActive = activeMenu === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveMenu(item.id);
                        setActiveTab(item.targetTab as any);
                      }}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all text-left ${
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
              </div>

              {/* Group 3: Akademik & Presensi */}
              <div className="space-y-1">
                <p className="px-2 text-[9px] font-black text-slate-400 uppercase tracking-wider hidden sm:block">
                  {t.navGroupAcademic}
                </p>
                {[
                  { id: "presensi", icon: FileCheck, label: t.navAttendance, targetTab: "presensi" },
                  { id: "izin", icon: ClipboardCheck, label: t.navLeaves, targetTab: "presensi" },
                  { id: "guru-att", icon: ScanFace, label: t.navTeacherAtt, targetTab: "presensi" },
                  { id: "penilaian", icon: PenLine, label: t.navGrades, targetTab: "akademik" },
                  { id: "rapor", icon: Award, label: t.navReports, targetTab: "akademik" },
                ].map((item) => {
                  const isActive = activeMenu === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveMenu(item.id);
                        setActiveTab(item.targetTab as any);
                      }}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all text-left ${
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
              </div>

              {/* Group 4: Keuangan */}
              <div className="space-y-1">
                <p className="px-2 text-[9px] font-black text-slate-400 uppercase tracking-wider hidden sm:block">
                  {t.navGroupFinance}
                </p>
                {[
                  { id: "pembayaran", icon: CreditCard, label: t.navPayments, targetTab: "keuangan" },
                  { id: "laporan-uang", icon: FileText, label: t.navFinReport, targetTab: "keuangan" },
                ].map((item) => {
                  const isActive = activeMenu === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveMenu(item.id);
                        setActiveTab(item.targetTab as any);
                      }}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all text-left ${
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
              </div>

              {/* Group 5: Sistem & Security */}
              <div className="space-y-1">
                <p className="px-2 text-[9px] font-black text-slate-400 uppercase tracking-wider hidden sm:block">
                  {t.navGroupSystem}
                </p>
                {[
                  { id: "akun", icon: UserCog, label: t.navAccounts, targetTab: "overview" },
                  { id: "role", icon: ShieldCheck, label: t.navRoles, targetTab: "overview" },
                  { id: "pengaturan", icon: Settings, label: t.navSettings, targetTab: "overview" },
                ].map((item) => {
                  const isActive = activeMenu === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveMenu(item.id);
                        setActiveTab(item.targetTab as any);
                      }}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all text-left ${
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
              </div>
            </div>

            {/* School Profile Mini Footer */}
            <div className="hidden sm:flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200/70 shadow-2xs mt-4">
              <div className="w-7 h-7 rounded-lg bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center text-xs font-bold shrink-0">
                SN
              </div>
              <div className="truncate leading-tight">
                <p className="text-[10px] font-bold text-slate-800 truncate">SMA Nusantara Mandiri</p>
                <p className="text-[8px] text-slate-400 mt-0.5">Jakarta Selatan · A</p>
              </div>
            </div>
          </aside>

          {/* ══════════════════════════════════════════════════════════════
              RIGHT MAIN WORKSPACE: Super Admin Executive Dashboard
          ══════════════════════════════════════════════════════════════ */}
          <main className="col-span-9 lg:col-span-9 xl:col-span-10 p-4 sm:p-5 lg:p-6 bg-white space-y-5 overflow-y-auto max-h-[760px]">
            
            {/* Top Operational Bar: Search, Role Switcher Preview, Notification */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
              
              {/* Search Bar */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-400 text-[11px] w-full max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{t.searchPlaceholder}</span>
              </div>

              {/* Role Switcher Pill & Admin Account */}
              <div className="flex items-center gap-2.5 shrink-0">
                
                {/* Role Switcher Preview Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowRoleMenu(!showRoleMenu)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200/80 text-[#531FFF] text-[11px] font-bold hover:bg-indigo-100/70 transition-all cursor-pointer shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t.btnPreviewRole}:</span>
                    <span className="font-extrabold capitalize">{selectedRole}</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${showRoleMenu ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {showRoleMenu && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 5 }}
                        className="absolute right-0 mt-2 w-60 rounded-2xl bg-white border border-slate-200 shadow-2xl p-1.5 z-50 text-xs"
                      >
                        <p className="px-3 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                          {t.previewSubtitle}
                        </p>
                        {roleList.map((r) => (
                          <button
                            key={r.id}
                            onClick={() => {
                              setSelectedRole(r.id);
                              setShowRoleMenu(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer ${
                              selectedRole === r.id ? "bg-indigo-50 text-[#531FFF] font-bold" : "hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            <r.icon className={`w-4 h-4 ${r.color} shrink-0`} />
                            <div>
                              <p className="text-[11px] font-bold leading-tight">{r.label}</p>
                              <p className="text-[9px] text-slate-400">{r.desc}</p>
                            </div>
                            {selectedRole === r.id && <Check className="w-3 h-3 ml-auto text-[#531FFF]" />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Notifications Bell */}
                <div className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer">
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
                </div>

                {/* Admin Avatar */}
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#531FFF] to-[#7B4DFF] text-white flex items-center justify-center text-xs font-black shadow-xs">
                    SA
                  </div>
                  <div className="hidden lg:block leading-none">
                    <p className="text-[10px] font-bold text-slate-900">Dr. Budi Santoso, M.Pd</p>
                    <p className="text-[8px] text-slate-400 mt-0.5">Super Administrator</p>
                  </div>
                </div>

              </div>

            </div>

            {/* ══════════════════════════════════════════════════════════════
                EXECUTIVE BANNER (Matches actual Super Admin Dashboard)
            ══════════════════════════════════════════════════════════════ */}
            <div className="relative rounded-2xl overflow-hidden shadow-md border border-indigo-500/20 bg-gradient-to-br from-[#1E1B4B] via-[#312E81] to-[#4338CA] text-white p-4 sm:p-5 lg:p-6">
              
              {/* Subtle background glow */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 space-y-4">
                
                {/* School Accreditation & Sync Pill */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-full bg-white/15 text-white text-[11px] font-bold backdrop-blur-md border border-white/20 flex items-center gap-1.5 shadow-2xs">
                      <School className="w-3.5 h-3.5 text-indigo-300" />
                      <span>{t.schoolName}</span>
                    </span>

                    <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/90 text-[10px] font-mono font-bold backdrop-blur-sm border border-white/10">
                      {t.npsn}
                    </span>

                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/25 text-emerald-200 text-[10px] font-bold backdrop-blur-sm border border-emerald-400/30">
                      {t.akreditasi}
                    </span>

                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-100 text-[10px] font-semibold backdrop-blur-sm border border-indigo-400/30">
                      {t.academicYear}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-400/30 px-2.5 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Cloud Sync Real-Time</span>
                  </div>
                </div>

                {/* Banner Content & Quick Feature Pills */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-xl">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-400/20 text-indigo-200 text-[10px] font-bold border border-indigo-300/20">
                      <ShieldCheck className="w-3 h-3 text-indigo-300" />
                      <span>{t.hubTitle}</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                      {t.hubGreeting} 👋
                    </h3>
                    <p className="text-indigo-100/80 text-xs leading-relaxed">
                      {t.hubDesc}
                    </p>
                  </div>

                  {/* Interactive Tab Switcher inside Hero Illustrator */}
                  <div className="flex flex-wrap items-center gap-1.5 bg-white/10 p-1.5 rounded-xl border border-white/15 backdrop-blur-md">
                    {[
                      { id: "overview", label: t.tabOverview, icon: Sparkles },
                      { id: "presensi", label: t.tabPresensi, icon: MapPin },
                      { id: "keuangan", label: t.tabKeuangan, icon: Wallet },
                      { id: "akademik", label: t.tabAkademik, icon: BookOpen },
                    ].map((tab) => {
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isActive
                              ? "bg-white text-indigo-950 shadow-sm font-black"
                              : "text-white/80 hover:text-white hover:bg-white/10"
                          }`}
                        >
                          <tab.icon className={`w-3.5 h-3.5 ${isActive ? "text-[#531FFF]" : "text-white/70"}`} />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                6 MASTER VITALS (Real Super Admin KPIs)
            ══════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
              
              {/* 1. Siswa */}
              <div 
                onClick={() => setActiveTab("overview")}
                className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/70 hover:border-[#531FFF]/40 transition-all cursor-pointer group shadow-2xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{t.v1Title}</span>
                  <div className="w-5 h-5 rounded-md bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center">
                    <GraduationCap className="w-3 h-3" />
                  </div>
                </div>
                <p className="text-lg font-black text-slate-900 tracking-tight">{t.v1Val}</p>
                <p className="text-[9px] text-[#531FFF] font-semibold mt-0.5 truncate">{t.v1Sub}</p>
              </div>

              {/* 2. Guru */}
              <div 
                onClick={() => setActiveTab("overview")}
                className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/70 hover:border-blue-400/40 transition-all cursor-pointer group shadow-2xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{t.v2Title}</span>
                  <div className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Users className="w-3 h-3" />
                  </div>
                </div>
                <p className="text-lg font-black text-slate-900 tracking-tight">{t.v2Val}</p>
                <p className="text-[9px] text-blue-700 font-semibold mt-0.5 truncate">{t.v2Sub}</p>
              </div>

              {/* 3. Presensi */}
              <div 
                onClick={() => setActiveTab("presensi")}
                className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/70 hover:border-emerald-400/40 transition-all cursor-pointer group shadow-2xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{t.v3Title}</span>
                  <div className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3" />
                  </div>
                </div>
                <p className="text-lg font-black text-slate-900 tracking-tight">{t.v3Val}</p>
                <p className="text-[9px] text-emerald-600 font-semibold mt-0.5 truncate">{t.v3Sub}</p>
              </div>

              {/* 4. Keuangan SPP */}
              <div 
                onClick={() => setActiveTab("keuangan")}
                className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/70 hover:border-sky-400/40 transition-all cursor-pointer group shadow-2xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{t.v4Title}</span>
                  <div className="w-5 h-5 rounded-md bg-sky-100 text-sky-700 flex items-center justify-center">
                    <Wallet className="w-3 h-3" />
                  </div>
                </div>
                <p className="text-lg font-black text-slate-900 tracking-tight">{t.v4Val}</p>
                <p className="text-[9px] text-sky-700 font-semibold mt-0.5 truncate">{t.v4Sub}</p>
              </div>

              {/* 5. Kurikulum Merdeka */}
              <div 
                onClick={() => setActiveTab("akademik")}
                className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/70 hover:border-purple-400/40 transition-all cursor-pointer group shadow-2xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{t.v5Title}</span>
                  <div className="w-5 h-5 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center">
                    <Award className="w-3 h-3" />
                  </div>
                </div>
                <p className="text-lg font-black text-slate-900 tracking-tight">{t.v5Val}</p>
                <p className="text-[9px] text-purple-700 font-semibold mt-0.5 truncate">{t.v5Sub}</p>
              </div>

              {/* 6. Jadwal Bebas Bentrok */}
              <div 
                onClick={() => setActiveTab("akademik")}
                className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/70 hover:border-amber-400/40 transition-all cursor-pointer group shadow-2xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{t.v6Title}</span>
                  <div className="w-5 h-5 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center">
                    <BookOpen className="w-3 h-3" />
                  </div>
                </div>
                <p className="text-lg font-black text-slate-900 tracking-tight">{t.v6Val}</p>
                <p className="text-[9px] text-amber-700 font-semibold mt-0.5 truncate">{t.v6Sub}</p>
              </div>

            </div>

            {/* ══════════════════════════════════════════════════════════════
                INTERACTIVE TAB VIEW CONTAINER
            ══════════════════════════════════════════════════════════════ */}
            <div className="space-y-4">
              
              {/* TAB 1: OVERVIEW / DEFAULT */}
              {activeTab === "overview" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  
                  {/* Left Column: Live GPS Stream */}
                  <div className="lg:col-span-5 p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#531FFF]" />
                        <span className="text-xs font-bold text-slate-900">{t.presensiStreamTitle}</span>
                      </div>
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                        {t.presensiGeofenceTag}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {[
                        { name: t.p1Name, sub: t.p1Class, time: t.p1Time, dist: t.p1Status, color: "bg-emerald-500", tag: "RP" },
                        { name: t.p2Name, sub: t.p2Class, time: t.p2Time, dist: t.p2Status, color: "bg-[#531FFF]", tag: "AZ" },
                        { name: t.p3Name, sub: t.p3Class, time: t.p3Time, dist: t.p3Status, color: "bg-sky-500", tag: "FM" },
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between shadow-2xs hover:shadow-xs transition-all"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-7 h-7 rounded-lg ${item.color} text-white flex items-center justify-center text-[10px] font-black shrink-0`}>
                              {item.tag}
                            </div>
                            <div className="truncate leading-tight">
                              <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                              <p className="text-[10px] text-slate-400 truncate">{item.sub}</p>
                              <p className="text-[9px] text-slate-500 mt-0.5">{item.time}</p>
                            </div>
                          </div>
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md shrink-0">
                            {item.dist}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Trend Chart & Izin Queue */}
                  <div className="lg:col-span-7 space-y-4">
                    
                    {/* Weekly Attendance Spline Chart */}
                    <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-900">Tren Tingkat Kehadiran Siswa</span>
                          <p className="text-[10px] font-medium text-emerald-600">Rata-rata Mingguan: 98.4% (Target &gt;95%)</p>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                          <span>↑ 1.4% vs Minggu Lalu</span>
                        </div>
                      </div>

                      {/* SVG Area Chart */}
                      <div className="relative w-full h-28 pt-2">
                        <svg viewBox="0 0 320 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="heroAdminGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#531FFF" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="#531FFF" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          <line x1="0" y1="20" x2="320" y2="20" stroke="#E2E8F0" strokeDasharray="3 3" />
                          <line x1="0" y1="55" x2="320" y2="55" stroke="#E2E8F0" strokeDasharray="3 3" />
                          <line x1="0" y1="90" x2="320" y2="90" stroke="#E2E8F0" strokeDasharray="3 3" />

                          <path
                            d="M 0,75 Q 50,55 100,45 T 200,30 T 260,18 T 320,12 L 320,100 L 0,100 Z"
                            fill="url(#heroAdminGradient)"
                          />
                          <path
                            d="M 0,75 Q 50,55 100,45 T 200,30 T 260,18 T 320,12"
                            fill="none"
                            stroke="#531FFF"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                          <circle cx="260" cy="18" r="4" fill="#531FFF" stroke="#FFFFFF" strokeWidth="2" />
                        </svg>

                        <div className="absolute top-0 right-14 px-2 py-0.5 rounded-md bg-[#531FFF] text-white text-[9px] font-bold shadow-2xs">
                          99.2% Presensi
                        </div>
                      </div>

                      <div className="flex justify-between text-[10px] font-semibold text-slate-400 px-1 pt-1 border-t border-slate-200/60">
                        <span>Senin</span>
                        <span>Selasa</span>
                        <span>Rabu</span>
                        <span>Kamis</span>
                        <span>Jumat</span>
                        <span>Sabtu</span>
                      </div>
                    </div>

                    {/* Pending Leave Requests Mini Queue */}
                    <div className="p-3.5 rounded-2xl border border-amber-200/70 bg-amber-50/40 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                          <ClipboardCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{t.leaveTitle}</span>
                            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-bold">
                              {t.leaveBadge}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {t.leave1Name} · {t.leave1Reason}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => setActiveTab("presensi")}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold transition-all shadow-2xs shrink-0 cursor-pointer"
                      >
                        Tinjau & Setujui
                      </button>
                    </div>

                  </div>

                </div>
              )}

              {/* TAB 2: RADAR PRESENSI GPS & PERIZINAN */}
              {activeTab === "presensi" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Live Geofence Radar Box */}
                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                          <h4 className="text-xs font-bold text-slate-900">Geofence Sensor Kampus Utama</h4>
                        </div>
                        <span className="text-[9px] font-bold text-[#531FFF] bg-indigo-50 px-2 py-0.5 rounded-md">
                          Koordinat: -6.2088, 106.8456
                        </span>
                      </div>

                      <div className="space-y-2">
                        {[
                          { name: t.p1Name, sub: t.p1Class, time: t.p1Time, status: "Tepat Waktu · Radius 8m", color: "text-emerald-700 bg-emerald-50" },
                          { name: t.p2Name, sub: t.p2Class, time: t.p2Time, status: "Tepat Waktu · Radius 14m", color: "text-emerald-700 bg-emerald-50" },
                          { name: t.p3Name, sub: t.p3Class, time: t.p3Time, status: "Tepat Waktu · Radius 11m", color: "text-emerald-700 bg-emerald-50" },
                        ].map((item, idx) => (
                          <div key={idx} className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between shadow-2xs">
                            <div>
                              <p className="text-xs font-bold text-slate-800">{item.name}</p>
                              <p className="text-[10px] text-slate-400">{item.sub}</p>
                              <p className="text-[9px] text-slate-500">{item.time}</p>
                            </div>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${item.color}`}>
                              {item.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Medical & Leave Approval Box */}
                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900">{t.leaveTitle}</h4>
                        <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                          Notif Ortu via WhatsApp
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800">{t.leave1Name}</span>
                            <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                              Surat Dokter (.pdf)
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500">{t.leave1Reason}</p>
                          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                            <button className="flex-1 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-700 transition-colors">
                              ✓ Setujui Izin
                            </button>
                            <button className="px-3 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold hover:bg-slate-200 transition-colors">
                              Tolak
                            </button>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800">{t.leave2Name}</span>
                            <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                              Surat Tugas Sekolah
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500">{t.leave2Reason}</p>
                          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                            <button className="flex-1 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-700 transition-colors">
                              ✓ Setujui Izin
                            </button>
                            <button className="px-3 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold hover:bg-slate-200 transition-colors">
                              Tolak
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* TAB 3: KEUANGAN SPP & VA */}
              {activeTab === "keuangan" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                      <p className="text-[10px] font-bold uppercase">Total Penerimaan SPP Bulan Ini</p>
                      <p className="text-xl font-black mt-1">Rp 842.500.000</p>
                      <p className="text-[9px] text-emerald-700 font-semibold mt-0.5">96.4% dari Target Rp 875M</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900">
                      <p className="text-[10px] font-bold uppercase">Piutang / Belum Bayar</p>
                      <p className="text-xl font-black mt-1">Rp 32.500.000</p>
                      <p className="text-[9px] text-amber-700 font-semibold mt-0.5">44 Siswa · Pengingat WA Terjadwal</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-[#531FFF]">
                      <p className="text-[10px] font-bold uppercase">Rekonsiliasi Otomatis</p>
                      <p className="text-xl font-black mt-1">100% Cocok</p>
                      <p className="text-[9px] text-indigo-700 font-semibold mt-0.5">BCA, Mandiri, BNI & QRIS</p>
                    </div>
                  </div>

                  {/* Transaction Feed */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-[#531FFF]" />
                        <span className="text-xs font-bold text-slate-900">{t.finStreamTitle}</span>
                      </div>
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {t.finAutoRecon}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {[
                        { name: t.f1Student, bank: t.f1Bank, amount: t.f1Amount, status: t.f1Status, time: t.f1Time },
                        { name: t.f2Student, bank: t.f2Bank, amount: t.f2Amount, status: t.f2Status, time: t.f2Time },
                        { name: t.f3Student, bank: t.f3Bank, amount: t.f3Amount, status: t.f3Status, time: t.f3Time },
                      ].map((item, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between shadow-2xs">
                          <div>
                            <p className="text-xs font-bold text-slate-800">{item.name}</p>
                            <p className="text-[10px] text-slate-500">{item.bank} · <span className="font-bold text-emerald-700">{item.amount}</span></p>
                            <p className="text-[9px] text-slate-400 mt-0.5">{item.time}</p>
                          </div>
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                            ✓ {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: AKADEMIK & KURIKULUM MERDEKA */}
              {activeTab === "akademik" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* e-Rapor Status */}
                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900">{t.raporTitle}</h4>
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          {t.raporReady}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {[
                          { rombel: "Kelas X MIPA 1", wali: "Dra. Nurhayati", status: "100% Siap Cetak e-Rapor", color: "text-emerald-700 bg-emerald-50" },
                          { rombel: "Kelas XI IPS 2", wali: "Ahmad Fauzi, S.Pd", status: "100% Siap Cetak e-Rapor", color: "text-emerald-700 bg-emerald-50" },
                          { rombel: "Kelas XII MIPA 3", wali: "Sri Wahyuni, M.Pd", status: "96% Menunggu Nilai Ekskul", color: "text-amber-700 bg-amber-50" },
                        ].map((item, idx) => (
                          <div key={idx} className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between shadow-2xs">
                            <div>
                              <p className="text-xs font-bold text-slate-800">{item.rombel}</p>
                              <p className="text-[10px] text-slate-400">Wali Kelas: {item.wali}</p>
                            </div>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${item.color}`}>
                              {item.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Kurikulum Merdeka TP Breakdown */}
                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900">{t.topClassesTitle}</h4>
                        <span className="text-[9px] font-bold text-[#531FFF] bg-indigo-50 px-2 py-0.5 rounded-md">
                          Rata-rata KKM: 86.4
                        </span>
                      </div>

                      <div className="space-y-2">
                        {[
                          { kelas: "XII MIPA 1", score: "89.2", scale: "3.92 (Sangat Baik)", color: "bg-emerald-500" },
                          { kelas: "XI IPS 2", score: "87.5", scale: "3.84 (Sangat Baik)", color: "bg-[#531FFF]" },
                          { kelas: "X MIPA 2", score: "86.8", scale: "3.78 (Baik)", color: "bg-sky-500" },
                        ].map((item, idx) => (
                          <div key={idx} className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between shadow-2xs">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-6 h-6 rounded-md ${item.color} text-white flex items-center justify-center text-[10px] font-bold`}>
                                {idx + 1}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-800">{item.kelas}</p>
                                <p className="text-[10px] text-slate-400">{item.scale}</p>
                              </div>
                            </div>
                            <span className="text-xs font-black text-slate-900">
                              {item.score}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              )}

            </div>

            {/* Bottom Quick Feature Strip (WhatsApp Sync, Multi-Role & Dapodik Ready) */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-[11px]">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>WhatsApp Gateway Terintegrasi</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#531FFF]" />
                  <span>Role-Based Access Control (5 Role)</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-[11px]">
                  <School className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Format Rapor Resmi Kemendikbudristek</span>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[11px] font-bold text-[#531FFF] hover:underline cursor-pointer">
                <span>Eksplorasi Seluruh Modul</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </div>

          </main>

        </div>
      </motion.div>
    </div>
  );
}
