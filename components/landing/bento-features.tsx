"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  UserCheck, Bell, Calendar, ArrowRight,
  CheckCircle2, Sparkles, ChevronRight
} from "lucide-react";

interface BentoFeaturesProps {
  lang: "id" | "en";
}

export default function BentoFeatures({ lang }: BentoFeaturesProps) {
  const [selectedRole, setSelectedRole] = useState<number>(0);

  const t = {
    id: {
      tag: "FITUR UNGGULAN",
      title: "Semua yang Anda Butuhkan, dalam Satu Platform",
      desc: "Dari presensi, akademik, keuangan hingga komunikasi, semua terintegrasi dalam satu sistem yang mudah digunakan.",
      viewAll: "Lihat Semua Fitur",
      // Card 1
      c1Badge: "GEOFENCE RADIUS 100M",
      c1Title: "Presensi Geofence GPS & Proteksi Anti-Titip Absen",
      c1Desc: "Validasi koordinat GPS radius sekolah otomatis dengan kamera selfie dan sensor guard anti-mock location / fake GPS.",
      c1PillTitle: "Presensi Geofence",
      c1PillSub: "Siswa hadir di area sekolah",
      c1Live: "1.142 Siswa Hadir Tepat Waktu · 0 Pelanggaran",
      c1Link: "Eksplorasi Fitur Absensi",
      // Card 2
      c2Badge: "REKONSILIASI KAS REAL-TIME",
      c2Title: "Manajemen SPP & Rekonsiliasi Kas 100% Otomatis",
      c2Desc: "Integrasi QRIS dan Virtual Account Bank langsung mencatat pelunasan secara real-time ke buku kas yayasan.",
      c2Student: "Raka Pratama · Kelas X-A",
      c2Bill: "SPP Periode Oktober 2026",
      c2Amount: "Rp 750.000",
      c2Status: "LUNAS OTOMATIS",
      c2Channel: "BCA Virtual Account • QRIS Instan",
      c2WaReceipt: "Kuitansi digital terkirim ke WhatsApp orang tua",
      c2Link: "Eksplorasi Fitur SPP",
      // Card 3
      c3Badge: "STANDAR KEMENDIKBUD",
      c3Title: "Rapor Kurikulum Merdeka & Rumusan TP/CP Otomatis",
      c3Desc: "Hitung otomatis nilai akhir dan rumusan deskripsi capaian pembelajaran tanpa rumus Excel manual yang rentan rusak.",
      c3Progress: "96% Capaian Tujuan Pembelajaran Tercapai",
      c3P5: "Rapor P5: Mandiri & Bernalar Kritis",
      c3Action: "1-Klik Cetak Rapor PDF Resmi",
      c3Link: "Eksplorasi Rapor Merdeka",
      // Card 4
      c4Badge: "ISOLASI HAK AKSES",
      c4Title: "Satu Ekosistem untuk 5 Peran Sekolah",
      c4Desc: "Portal khusus dengan privasi data ketat untuk Super Admin, Kepala Sekolah, Guru, Orang Tua, dan Siswa.",
      c4Roles: ["Super Admin", "Kepala Sekolah", "Guru & Staf", "Orang Tua", "Siswa"],
      c4RoleDesc: [
        "Kontrol penuh master data, manajemen hak akses, dan audit log menyeluruh.",
        "Pemantauan performa akademik, grafik disiplin presensi, dan neraca kas.",
        "Input nilai harian, absen kelas, dan jurnal mengajar terintegrasi.",
        "Pantau kehadiran anak real-time, jadwal ujian, dan histori pembayaran SPP.",
        "Akses materi tugas, jadwal kelas, dan pengumuman sekolah langsung."
      ],
      c4Link: "Eksplorasi Manajemen Peran",
      // Card 5
      c5Badge: "KOMUNIKASI INSTAN",
      c5Title: "Notifikasi Otomatis ke WhatsApp Orang Tua",
      c5Desc: "Wali murid mendapatkan kepastian kedatangan anak, rekap nilai, dan tagihan SPP langsung di aplikasi WhatsApp mereka.",
      c5WaHeader: "SMA Nusantara Mandiri Jakarta",
      c5WaMsg: "Pemberitahuan Presensi: Ananda Farah Nabila telah check-in di sekolah pukul 06:48 WIB. Kehadiran: Tepat Waktu.",
      c5WaTime: "06:48 WIB · Terkirim",
      c5Link: "Eksplorasi Pengumuman",
      // Card 6
      c6Badge: "EFISIENSI OPERASIONAL",
      c6Title: "Penjadwalan Bebas Bentrok & Kalender Akademik",
      c6Desc: "Susun jadwal pelajaran mingguan bebas bentrok antar ruang dan guru secara otomatis, terintegrasi penuh dengan kalender akademik semester.",
      c6Stat1: "0 Konflik Jadwal",
      c6Stat2: "Kalender Semester Terpadu",
      c6Stat3: "Sinkronisasi Otomatis",
      c6Link: "Eksplorasi Fitur Akademik",
    },
    en: {
      tag: "FEATURED CAPABILITIES",
      title: "Everything You Need, in One Seamless Platform",
      desc: "From GPS attendance and academics to automated billing and parent broadcasts, all connected in one modern OS.",
      viewAll: "View All Features",
      // Card 1
      c1Badge: "100M GEOFENCE RADIUS",
      c1Title: "GPS Geofenced Attendance & Anti-Spoofing Guard",
      c1Desc: "Automated arrival validation within campus boundary with selfie verification and active mock location defense.",
      c1PillTitle: "Geofence Attendance",
      c1PillSub: "Student verified on campus grounds",
      c1Live: "1,142 Students On-Time · 0 Spoof Attempts",
      c1Link: "Explore Attendance",
      // Card 2
      c2Badge: "REAL-TIME RECONCILIATION",
      c2Title: "Automated Tuition Billing & Instant Bank Reconciliation",
      c2Desc: "Integrated QRIS and Virtual Accounts reconcile ledgers instantly without manual cashier verification.",
      c2Student: "Raka Pratama · Grade 10-A",
      c2Bill: "Tuition Invoice October 2026",
      c2Amount: "Rp 750,000",
      c2Status: "PAID AUTOMATICALLY",
      c2Channel: "BCA Virtual Account • Instant QRIS",
      c2WaReceipt: "Digital receipt sent to parent's WhatsApp",
      c2Link: "Explore Tuition Billing",
      // Card 3
      c3Badge: "MINISTRY COMPLIANT",
      c3Title: "Merdeka Curriculum Engine & Automatic Outcomes",
      c3Desc: "Automatically compute final scores and learning objective narratives without fragile spreadsheet formulas.",
      c3Progress: "96% Learning Objectives Attained",
      c3P5: "P5 Character Assessment: Highly Developing",
      c3Action: "1-Click Export Official PDF Cards",
      c3Link: "Explore Report Cards",
      // Card 4
      c4Badge: "ROLE ISOLATION",
      c4Title: "One Ecosystem for 5 Stakeholder Roles",
      c4Desc: "Dedicated secure portals for Super Admin, Principal, Teachers, Parents, and Students with granular data borders.",
      c4Roles: ["Super Admin", "Principal", "Teachers", "Parents", "Students"],
      c4RoleDesc: [
        "Complete master data control, permission governance, and comprehensive audit trails.",
        "Executive oversight on campus discipline, academic performance, and treasury cashflow.",
        "Daily attendance logs, formative score inputs, and digital teaching journals.",
        "Real-time student arrival pings, examination timetables, and billing receipts.",
        "Direct access to assignment briefs, daily class schedule, and school broadcasts."
      ],
      c4Link: "Explore Role Workspaces",
      // Card 5
      c5Badge: "INSTANT CHANNELS",
      c5Title: "Instant Automated WhatsApp Alerts for Parents",
      c5Desc: "Parents receive arrival confirmations, academic updates, and tuition receipts directly on WhatsApp without app downloads.",
      c5WaHeader: "Nusantara Mandiri Academy",
      c5WaMsg: "Attendance Alert: Student Farah Nabila successfully checked in on campus at 06:48 AM. Status: On-Time.",
      c5WaTime: "06:48 AM · Delivered",
      c5Link: "Explore Announcements",
      // Card 6
      c6Badge: "OPERATIONAL MASTERY",
      c6Title: "Conflict-Free Timetabling & Academic Calendar",
      c6Desc: "Automatically build weekly clash-free schedules across rooms and teachers, fully integrated with semester academic calendars.",
      c6Stat1: "0 Schedule Clashes",
      c6Stat2: "Integrated Calendar",
      c6Stat3: "Auto-Synchronization",
      c6Link: "Explore Academic Suite",
    }
  }[lang];

  return (
    <section id="fitur" className="py-20 md:py-28 bg-white relative">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl space-y-3">
            <span className="text-[12px] font-extrabold text-[#531FFF] tracking-widest uppercase block">
              {t.tag}
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-[42px] font-black text-slate-900 tracking-tight leading-[1.15]">
              {t.title}
            </h2>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
              {t.desc}
            </p>
          </div>

          <Link
            href="/features/absensi"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#531FFF] hover:text-[#4314cc] transition-colors group shrink-0"
          >
            <span>{t.viewAll}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* ── BENTO GRID LAYOUT WITH MOTION ENHANCEMENTS ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* ── Bento Card 1: Large School Campus with Geofence Floating Badge (7 Cols) ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6 }}
            whileHover={{ y: -3 }}
            className="md:col-span-12 lg:col-span-7 rounded-2xl md:rounded-3xl border border-slate-200/90 bg-white overflow-hidden shadow-xs hover:shadow-lg transition-all flex flex-col justify-between group"
          >
            {/* Campus Image Container with Animated Floating Geofence Badge */}
            <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-slate-100">
              <Image
                src="/school-campus.jpg"
                alt="Modern School Campus"
                fill
                className="object-cover group-hover:scale-103 transition-transform duration-700"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

              {/* Eye-Candy Animated Floating Frosted Pill Badge */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-5 left-5 sm:left-6 inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/95 backdrop-blur-md border border-white/80 shadow-lg shadow-black/10"
              >
                <div className="relative w-8 h-8 rounded-full bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4 text-[#531FFF]" />
                  <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                </div>
                <div className="pr-1">
                  <p className="text-xs font-extrabold text-slate-900 leading-tight">
                    {t.c1PillTitle}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] text-slate-600 font-medium">{t.c1PillSub}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  </div>
                </div>
              </motion.div>

              {/* Live Status Pill at bottom of image */}
              <div className="absolute bottom-4 left-5 sm:left-6 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{t.c1Live}</span>
              </div>
            </div>

            {/* Bottom Content Area */}
            <div className="p-6 sm:p-7 space-y-3">
              <span className="text-[10px] font-bold text-[#531FFF] tracking-wider uppercase px-2.5 py-1 rounded-md bg-[#531FFF]/10 inline-block">
                {t.c1Badge}
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {t.c1Title}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed font-normal">
                {t.c1Desc}
              </p>
              <div className="pt-2">
                <Link
                  href="/features/absensi"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#531FFF] hover:text-[#4314cc] transition-colors group/link"
                >
                  <span>{t.c1Link}</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          </motion.div>

          {/* ── Bento Card 2: Otomasi Tagihan SPP & Multi-Gateway (5 Cols) ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            whileHover={{ y: -3 }}
            className="md:col-span-12 lg:col-span-5 rounded-2xl md:rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 flex flex-col justify-between shadow-xs hover:shadow-lg transition-all space-y-6"
          >
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-emerald-700 tracking-wider uppercase px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-100 inline-block">
                {t.c2Badge}
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {t.c2Title}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed font-normal">
                {t.c2Desc}
              </p>
            </div>

            {/* Interactive Invoice Card Preview with Live Pulsing Reconciled Badge */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-extrabold text-slate-900">{t.c2Student}</p>
                  <p className="text-[10px] text-slate-500">{t.c2Bill}</p>
                </div>
                <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  {t.c2Status}
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-2 border-t border-slate-200/60">
                <span className="text-xs text-slate-500 font-medium">Total Tagihan</span>
                <span className="text-base font-black text-slate-900 tracking-tight">{t.c2Amount}</span>
              </div>

              <div className="p-2 rounded-lg bg-white border border-slate-100 flex items-center justify-between text-[10px]">
                <span className="text-slate-500 font-medium">{t.c2Channel}</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  ✓ Reconciled
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 pt-0.5">
                <Bell className="w-3 h-3 text-emerald-600 shrink-0" />
                <span className="truncate">{t.c2WaReceipt}</span>
              </div>
            </div>

            <div>
              <Link
                href="/features/spp"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#531FFF] hover:text-[#4314cc] transition-colors group/link"
              >
                <span>{t.c2Link}</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </motion.div>

          {/* ── Bento Card 3: Rapor Kurikulum Merdeka (4 Cols) ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: 0.15 }}
            whileHover={{ y: -3 }}
            className="md:col-span-12 lg:col-span-4 rounded-2xl md:rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 flex flex-col justify-between shadow-xs hover:shadow-lg transition-all space-y-5"
          >
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-[#531FFF] tracking-wider uppercase px-2.5 py-1 rounded-md bg-[#531FFF]/10 inline-block">
                {t.c3Badge}
              </span>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                {t.c3Title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                {t.c3Desc}
              </p>
            </div>

            {/* Visual Animated TP/CP Progress Bar */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Capaian TP Matematika</span>
                <span className="font-extrabold text-[#531FFF]">92 / 100</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: "92%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                  className="bg-[#531FFF] h-full rounded-full"
                />
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-100 text-[10px] text-slate-600">
                <span className="font-bold text-slate-900 block">{t.c3P5}</span>
                <span className="text-emerald-600 font-semibold mt-0.5 block">● Berkembang Sesuai Harapan</span>
              </div>
            </div>

            <div>
              <Link
                href="/features/laporan"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#531FFF] hover:text-[#4314cc] transition-colors group/link"
              >
                <span>{t.c3Link}</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </motion.div>

          {/* ── Bento Card 4: 5 Portal Peran Terisolasi with Smooth Layout Switch (4 Cols) ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            whileHover={{ y: -3 }}
            className="md:col-span-12 lg:col-span-4 rounded-2xl md:rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 flex flex-col justify-between shadow-xs hover:shadow-lg transition-all space-y-5"
          >
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-indigo-700 tracking-wider uppercase px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-100 inline-block">
                {t.c4Badge}
              </span>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                {t.c4Title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                {t.c4Desc}
              </p>
            </div>

            {/* Interactive Role Selector with Spring Transitions */}
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {t.c4Roles.map((role, idx) => {
                  const isActive = selectedRole === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedRole(idx)}
                      className={`relative px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        isActive ? "text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="activeRoleHighlight"
                          className="absolute inset-0 bg-[#531FFF] rounded-lg -z-0"
                          transition={{ type: "spring", stiffness: 450, damping: 35 }}
                        />
                      )}
                      <span className="relative z-10">{role}</span>
                    </button>
                  );
                })}
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 min-h-[64px] flex items-center">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={selectedRole}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                    className="text-[11px] text-slate-600 font-medium leading-relaxed"
                  >
                    {t.c4RoleDesc[selectedRole]}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>

            <div>
              <Link
                href="/features/akademik"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#531FFF] hover:text-[#4314cc] transition-colors group/link"
              >
                <span>{t.c4Link}</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </motion.div>

          {/* ── Bento Card 5: WhatsApp Ortu & Broadcast with Floating Bubble (4 Cols) ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: 0.25 }}
            whileHover={{ y: -3 }}
            className="md:col-span-12 lg:col-span-4 rounded-2xl md:rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 flex flex-col justify-between shadow-xs hover:shadow-lg transition-all space-y-5"
          >
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-emerald-700 tracking-wider uppercase px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-100 inline-block">
                {t.c5Badge}
              </span>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                {t.c5Title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                {t.c5Desc}
              </p>
            </div>

            {/* Realistic Floating WhatsApp Chat Bubble Mockup */}
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              className="p-3 rounded-xl bg-[#EFEAE2] border border-slate-200/80 space-y-1.5 shadow-2xs"
            >
              <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{t.c5WaHeader}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white shadow-2xs text-[11px] text-slate-800 leading-relaxed relative">
                <p>{t.c5WaMsg}</p>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="text-[9px] text-slate-400 font-mono">06:48 WIB</span>
                  <span className="text-[#53bdeb] text-[10px] font-bold">✓✓</span>
                </div>
              </div>
            </motion.div>

            <div>
              <Link
                href="/features/pengumuman"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#531FFF] hover:text-[#4314cc] transition-colors group/link"
              >
                <span>{t.c5Link}</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </motion.div>

          {/* ── Bento Card 6: Wide Full-Width Card (12 Cols) - Penjadwalan & Kalender Akademik ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="md:col-span-12 rounded-2xl md:rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs hover:shadow-lg transition-all"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              <div className="lg:col-span-6 space-y-4">
                <span className="text-[10px] font-bold text-[#531FFF] tracking-wider uppercase px-2.5 py-1 rounded-md bg-[#531FFF]/10 inline-block">
                  {t.c6Badge}
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {t.c6Title}
                </h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
                  {t.c6Desc}
                </p>

                <div className="flex flex-wrap gap-2.5 pt-1">
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700 shadow-2xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t.c6Stat1}</span>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700 shadow-2xs"
                  >
                    <Calendar className="w-3.5 h-3.5 text-[#531FFF]" />
                    <span>{t.c6Stat2}</span>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700 shadow-2xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>{t.c6Stat3}</span>
                  </motion.div>
                </div>

                <div className="pt-2">
                  <Link
                    href="/features/akademik"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all shadow-xs active:scale-98"
                  >
                    <span>{t.c6Link}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Right: Timetable Schedule Preview Grid with Hover Elevate */}
              <div className="lg:col-span-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/70 shadow-2xs space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                  <span className="text-xs font-extrabold text-slate-900">Jadwal Mingguan Kelas X-MIPA 1</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Bebas Bentrok Ruang
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-left">
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="p-2.5 rounded-xl bg-white border border-slate-200/60 shadow-2xs space-y-1 transition-colors hover:border-[#531FFF]/30"
                  >
                    <span className="text-[9px] font-bold text-slate-400 block">SENIN · 07:30</span>
                    <p className="text-xs font-extrabold text-slate-800 leading-tight">Matematika</p>
                    <p className="text-[10px] text-slate-500">Drs. Bambang · R.101</p>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -2 }}
                    className="p-2.5 rounded-xl bg-[#531FFF]/5 border border-[#531FFF]/25 shadow-2xs space-y-1 transition-colors hover:bg-[#531FFF]/10"
                  >
                    <span className="text-[9px] font-bold text-[#531FFF] block">SENIN · 09:30</span>
                    <p className="text-xs font-extrabold text-[#531FFF] leading-tight">Fisika Terapan</p>
                    <p className="text-[10px] text-slate-600">Siti Rahayu, M.Si · Lab 1</p>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -2 }}
                    className="p-2.5 rounded-xl bg-white border border-slate-200/60 shadow-2xs space-y-1 transition-colors hover:border-[#531FFF]/30"
                  >
                    <span className="text-[9px] font-bold text-slate-400 block">SELASA · 07:30</span>
                    <p className="text-xs font-extrabold text-slate-800 leading-tight">B. Indonesia</p>
                    <p className="text-[10px] text-slate-500">Nurul H., S.Pd · R.102</p>
                  </motion.div>
                </div>

                <div className="p-2 rounded-lg bg-white border border-slate-200/60 flex items-center justify-between text-[11px] text-slate-600 relative overflow-hidden">
                  {/* Subtle animated scan beam across calendar event */}
                  <motion.div
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear", repeatDelay: 1.5 }}
                    className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-[#531FFF]/10 to-transparent skew-x-12 pointer-events-none"
                  />
                  <span className="flex items-center gap-1.5 font-medium relative z-10">
                    <Calendar className="w-3.5 h-3.5 text-[#531FFF]" />
                    <span>Agenda Akademik: <strong>Ujian Tengah Semester Ganjil</strong></span>
                  </span>
                  <span className="text-slate-400 font-mono text-[10px] relative z-10">Mulai: 28 Okt</span>
                </div>
              </div>

            </div>
          </motion.div>

        </div>

      </div>
    </section>
  );
}
