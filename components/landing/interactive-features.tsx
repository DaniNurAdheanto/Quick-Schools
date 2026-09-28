"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle2, CreditCard, Users,
  Sparkles, ArrowRight, ShieldCheck, Check,
  ChevronRight, Sliders, Laptop, Clock
} from "lucide-react";

interface InteractiveFeaturesProps {
  lang: "id" | "en";
}

export default function InteractiveFeatures({ lang }: InteractiveFeaturesProps) {
  const [activePillar, setActivePillar] = useState<number>(0);
  const [geofenceRadius, setGeofenceRadius] = useState<number>(100);

  const t = {
    id: {
      badge: "KAPABILITAS UTAMA",
      title: "Dibangun untuk Otomasi 360° Sekolah Modern",
      desc: "Tinggalkan sistem terpisah-pisah. Quick Schools menyatukan kehadiran, kurikulum, keuangan, dan komunikasi civitas dalam satu ekosistem terpadu.",
      exploreAll: "Jelajahi seluruh dokumentasi fitur",
      pillars: [
        {
          id: "absensi",
          tag: "KEHADIRAN & GPS",
          title: "Presensi Geofence & Anti-Fake GPS",
          shortDesc: "Validasi kehadiran presisi berbasis radius koordinat sekolah dengan proteksi manipulasi lokasi.",
          bullets: [
            "Radius geofence sekolah dapat dikonfigurasi 25m - 500m",
            "Proteksi otomatis terhadap aplikasi Fake GPS dan mock location",
            "Notifikasi instan via WhatsApp ke orang tua saat siswa tap-in/out",
            "Rekapitulasi otomatis untuk wali kelas dan laporan bulanan kepala sekolah"
          ],
          link: "/features/absensi",
          linkText: "Detail Fitur Presensi"
        },
        {
          id: "kurikulum",
          tag: "AKADEMIK & RAPOR",
          title: "Penilaian & Rapor Kurikulum Merdeka",
          shortDesc: "Input capaian kompetensi (TP), otomatisasi deskripsi rapor, dan cetak dokumen resmi dalam satu klik.",
          bullets: [
            "Kompatibel penuh dengan panduan asesmen Kurikulum Merdeka Kemdikbud",
            "Perumusan deskripsi capaian otomatis berdasarkan batas tuntas kompetensi",
            "Format rapor standar nasional siap unduh dan cetak PDF tanpa rusak layout",
            "Transparansi nilai harian, formatif, dan sumatif langsung ke portal wali murid"
          ],
          link: "/features/laporan",
          linkText: "Detail Fitur Rapor"
        },
        {
          id: "keuangan",
          tag: "BILLING & ARUS KAS",
          title: "Otomasi SPP & Laporan Keuangan",
          shortDesc: "Tagihan digital, rekonsiliasi pembayaran real-time via Virtual Account & QRIS, serta pembukuan arus kas.",
          bullets: [
            "Tagihan SPP dan iuran praktikum otomatis terbit setiap awal bulan",
            "Integrasi payment gateway tanpa cek manual mutasi rekening koran",
            "Notifikasi pengingat tunggakan sopan otomatis ke nomor WhatsApp orang tua",
            "Laporan laba rugi, rekap pemasukan/pengeluaran, dan export data akuntansi"
          ],
          link: "/features/spp",
          linkText: "Detail Fitur Keuangan"
        },
        {
          id: "komunikasi",
          tag: "PORTAL & BROADCAST",
          title: "Portal Multi-Role & Pengumuman Terarah",
          shortDesc: "Satu aplikasi dengan 5 hak akses khusus: Kepala Sekolah, Guru, Siswa, Orang Tua, dan Bendahara.",
          bullets: [
            "Ruang kerja terisolasi sesuai wewenang dan privasi masing-masing peran",
            "Kirim pengumuman tersegmentasi (misal: hanya kelas 12 atau hanya dewan guru)",
            "Lacak tanda terima siapa saja yang telah membaca pesan edaran sekolah",
            "Akses multi-platform melalui browser desktop, tablet, maupun smartphone"
          ],
          link: "/features/pengumuman",
          linkText: "Detail Fitur Komunikasi"
        }
      ],
      quickBadges: [
        { label: "Jadwal Pelajaran", href: "/features/akademik" },
        { label: "Kalender Akademik", href: "/features/akademik" },
        { label: "Laporan Keuangan", href: "/features/keuangan" },
        { label: "Data Master Siswa", href: "/data-siswa" },
        { label: "Pengumuman Sekolah", href: "/features/pengumuman" },
        { label: "Presensi Guru & Staf", href: "/features/absensi" },
      ]
    },
    en: {
      badge: "CORE CAPABILITIES",
      title: "Built for 360° Modern School Automation",
      desc: "Eliminate fragmented tools. Quick Schools unifies attendance, curriculum, finance, and community communications in one integrated ecosystem.",
      exploreAll: "Explore all feature documentation",
      pillars: [
        {
          id: "absensi",
          tag: "ATTENDANCE & GPS",
          title: "Geofence Attendance & Mock GPS Guard",
          shortDesc: "Pinpoint perimeter check-ins validated by GPS coordinate radius with hardware location spoof protection.",
          bullets: [
            "Customizable school perimeter radius from 25m to 500m",
            "Built-in protection against mock locations and fake GPS tools",
            "Instant WhatsApp notifications sent to parents upon student tap-in/out",
            "Automated summary ledgers for homeroom teachers and principals"
          ],
          link: "/features/absensi",
          linkText: "Attendance Feature Details"
        },
        {
          id: "kurikulum",
          tag: "ACADEMICS & REPORT",
          title: "Assessments & Merdeka Curriculum Reports",
          shortDesc: "Input learning objectives (TP), auto-generate descriptive narratives, and print official report cards.",
          bullets: [
            "Fully compliant with official national Merdeka Curriculum assessment standards",
            "Auto-generated outcome narratives calculated from mastery thresholds",
            "Print-ready standardized PDF report cards with consistent layouts",
            "Transparent formative & summative scores accessible from parent portal"
          ],
          link: "/features/laporan",
          linkText: "Report Card Feature Details"
        },
        {
          id: "keuangan",
          tag: "BILLING & CASHFLOW",
          title: "Tuition (SPP) Automation & School Accounting",
          shortDesc: "Digital invoicing, automated bank reconciliation via VA & QRIS, and clear institutional cashflow ledgers.",
          bullets: [
            "Monthly recurring tuition bills dispatched automatically",
            "Payment gateway integration eliminating manual bank statement checks",
            "Automated polite WhatsApp payment reminders sent to parents",
            "Real-time cashflow statements, expense monitoring, and accounting exports"
          ],
          link: "/features/spp",
          linkText: "Finance Feature Details"
        },
        {
          id: "komunikasi",
          tag: "PORTALS & BROADCAST",
          title: "Multi-Role Portals & Targeted Announcements",
          shortDesc: "A single unified app tailored with 5 dedicated user experiences: Principal, Teachers, Students, Parents, and Bursar.",
          bullets: [
            "Isolated workspaces tailored to the distinct duties and privacy of each role",
            "Segmented broadcast announcements (e.g. Grade 12 only, or Faculty only)",
            "Read-receipt tracking to monitor which parents have acknowledged school memos",
            "Cross-platform access via desktop web, tablet, or mobile smartphones"
          ],
          link: "/features/pengumuman",
          linkText: "Communication Feature Details"
        }
      ],
      quickBadges: [
        { label: "Class Schedules", href: "/features/akademik" },
        { label: "Academic Calendar", href: "/features/akademik" },
        { label: "Financial Reports", href: "/features/keuangan" },
        { label: "Master Student Data", href: "/data-siswa" },
        { label: "School Broadcasts", href: "/features/pengumuman" },
        { label: "Teacher Attendance", href: "/features/absensi" },
      ]
    }
  }[lang];

  const currentPillar = t.pillars[activePillar];

  return (
    <section id="features" className="py-24 md:py-32 bg-slate-50/70 border-t border-b border-gray-200/70 relative overflow-hidden">
      {/* Subtle background mesh */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-[#531FFF]/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#7B4DFF]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-[#F3F0FF] border border-[#531FFF]/20 text-[#531FFF] text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#531FFF]" />
            {t.badge}
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-[1.12] mb-5">
            {t.title}
          </h2>
          <p className="text-base sm:text-lg text-gray-600 leading-relaxed font-normal">
            {t.desc}
          </p>
        </div>

        {/* Editorial 2-Column Split Architecture */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Interactive Capability Selector */}
          <div className="lg:col-span-5 space-y-3">
            {t.pillars.map((pillar, idx) => {
              const isActive = activePillar === idx;
              return (
                <div
                  key={pillar.id}
                  onClick={() => setActivePillar(idx)}
                  className={`p-5 rounded-xl cursor-pointer transition-all border text-left relative ${
                    isActive
                      ? "bg-white border-[#531FFF]/30 shadow-[0_8px_24px_-6px_rgba(83,31,255,0.12)] ring-1 ring-[#531FFF]/20"
                      : "bg-white/60 hover:bg-white border-gray-200/80 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                      isActive ? "bg-[#F3F0FF] text-[#531FFF]" : "bg-gray-100 text-gray-500"
                    }`}>
                      {pillar.tag}
                    </span>
                    <span className="text-xs font-mono font-bold text-gray-400">
                      0{idx + 1}
                    </span>
                  </div>

                  <h3 className={`text-base font-extrabold tracking-tight mb-1.5 transition-colors ${
                    isActive ? "text-[#531FFF]" : "text-gray-900"
                  }`}>
                    {pillar.title}
                  </h3>

                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 font-medium">
                    {pillar.shortDesc}
                  </p>

                  {isActive && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-[#531FFF]">
                      <span className="flex items-center gap-1.5">
                        Simulasi Aktif <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                      <Link
                        href={pillar.link}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:underline flex items-center gap-1 text-[11px] text-gray-500 hover:text-[#531FFF]"
                      >
                        {pillar.linkText} <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Column: Live Interactive Simulation Sandbox */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-[0_15px_40px_-15px_rgba(0,0,0,0.06)] p-6 sm:p-8 relative min-h-[480px] flex flex-col justify-between">
              
              <AnimatePresence mode="wait">
                {/* SIMULATION 0: PRESENSI & GEOFENCE */}
                {activePillar === 0 && (
                  <motion.div
                    key="sim-0"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.22 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                      <div>
                        <h4 className="text-sm font-black text-gray-900">{currentPillar.title}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">Uji radius toleransi GPS kehadiran siswa</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200/80 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> GPS Spoof Blocked
                      </span>
                    </div>

                    {/* Interactive Radius Slider Tool */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-gray-200/80 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-gray-700 flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-[#531FFF]" /> Radius Geofence Kampus:
                        </span>
                        <span className="font-mono font-black text-sm text-[#531FFF] bg-[#F3F0FF] px-2.5 py-0.5 rounded-md">
                          {geofenceRadius} meter
                        </span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="300"
                        step="25"
                        value={geofenceRadius}
                        onChange={(e) => setGeofenceRadius(Number(e.target.value))}
                        className="w-full accent-[#531FFF] cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                        <span>50m (Satu Gedung)</span>
                        <span>150m (Standar Kompleks)</span>
                        <span>300m (Kampus Luas)</span>
                      </div>
                    </div>

                    {/* Visual Radar Mockup */}
                    <div className="relative h-44 rounded-xl bg-gradient-to-b from-slate-900 to-indigo-950 p-4 overflow-hidden flex items-center justify-center border border-slate-800">
                      {/* Grid lines */}
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px]" />
                      
                      {/* Radar circle reflecting slider */}
                      <motion.div
                        animate={{ scale: [1, 1.03, 1] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        style={{
                          width: `${Math.min(220, geofenceRadius * 0.9)}px`,
                          height: `${Math.min(220, geofenceRadius * 0.9)}px`,
                        }}
                        className="rounded-full border-2 border-[#7B4DFF]/70 bg-[#531FFF]/20 flex items-center justify-center relative transition-all duration-300"
                      >
                        <div className="w-3 h-3 rounded-full bg-[#531FFF] ring-4 ring-[#7B4DFF]/40 shadow-lg shadow-[#531FFF]" />
                        <span className="absolute bottom-2 text-[9px] font-mono text-purple-200 bg-slate-900/80 px-2 py-0.5 rounded-md border border-purple-500/30">
                          Titik Pusat Sekolah
                        </span>
                      </motion.div>

                      {/* Mock Student Pins */}
                      <div className="absolute top-8 left-12 flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold text-gray-900 shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Siswa A (38m) • Hadir
                      </div>

                      <div className="absolute bottom-6 right-10 flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold text-gray-900 shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Siswa B (74m) • Hadir
                      </div>
                    </div>

                    {/* Bullet Highlights */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                      {currentPillar.bullets.map((b, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-gray-700 font-medium">
                          <Check className="w-3.5 h-3.5 text-[#531FFF] shrink-0 mt-0.5" strokeWidth={3} />
                          <span>{b}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* SIMULATION 1: RAPOR & KURIKULUM MERDEKA */}
                {activePillar === 1 && (
                  <motion.div
                    key="sim-1"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.22 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                      <div>
                        <h4 className="text-sm font-black text-gray-900">{currentPillar.title}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">Automasi narasi capaian kompetensi siswa</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-md bg-[#F3F0FF] text-[#531FFF] text-xs font-bold border border-[#531FFF]/20 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#531FFF]" /> K-Merdeka Ready
                      </span>
                    </div>

                    {/* Interactive Rapor Sheet Sample */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-gray-200/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-extrabold text-gray-900">Mata Pelajaran: Fisika & Sains Terapan</p>
                          <p className="text-[10px] text-gray-500 font-mono">Guru Pengampu: Ir. Hendra Gunawan, M.Pd</p>
                        </div>
                        <span className="text-xs font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                          Nilai Akhir: 94 (A)
                        </span>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-gray-200 space-y-2">
                        <span className="text-[10px] font-bold text-[#531FFF] uppercase tracking-wider block">
                          Capaian Kompetensi Otomatis (TP):
                        </span>
                        <p className="text-xs text-gray-700 leading-relaxed font-medium">
                          "Menunjukkan penguasaan yang <strong className="text-emerald-700">sangat baik</strong> dalam merancang eksperimen dinamika fluida serta menganalisis efisiensi konversi energi kinetik, dan telah menuntaskan seluruh proyek portofolio dengan predikat mandiri."
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                        <span className="flex items-center gap-1 font-semibold text-gray-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Terkalkulasi dari 4 Nilai Formatif + 2 Sumatif
                        </span>
                        <span className="font-bold text-[#531FFF] cursor-pointer hover:underline">
                          Pratinjau PDF Cetak →
                        </span>
                      </div>
                    </div>

                    {/* Bullet Highlights */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                      {currentPillar.bullets.map((b, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-gray-700 font-medium">
                          <Check className="w-3.5 h-3.5 text-[#531FFF] shrink-0 mt-0.5" strokeWidth={3} />
                          <span>{b}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* SIMULATION 2: SPP & KEUANGAN */}
                {activePillar === 2 && (
                  <motion.div
                    key="sim-2"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.22 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                      <div>
                        <h4 className="text-sm font-black text-gray-900">{currentPillar.title}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">Penagihan otomatis, bebas konfirmasi bukti transfer fisik</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200/80 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-emerald-600" /> Virtual Account Aktif
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-xl bg-[#F3F0FF] border border-[#531FFF]/20">
                        <p className="text-[10px] font-bold text-[#531FFF] uppercase tracking-wide">Penerimaan SPP Bulan Ini</p>
                        <h5 className="text-xl font-black text-gray-900 mt-1">Rp 348.500.000</h5>
                        <p className="text-[10px] text-emerald-600 font-semibold mt-1">94.2% Lunas Tepat Waktu</p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50 border border-gray-200">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Pengingat Otomatis</p>
                        <h5 className="text-xl font-black text-gray-900 mt-1">1-Click Blast</h5>
                        <p className="text-[10px] text-gray-500 font-medium mt-1">Kirim rincian tagihan via WhatsApp</p>
                      </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-gray-900 border-b border-gray-100 pb-2">
                        <span>Antrean Rekonsiliasi Otomatis</span>
                        <span className="text-[10px] text-emerald-600">Sinkronisasi Bank 24/7</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs py-1">
                          <span className="font-semibold text-gray-800">VA BCA - 8271004128 (Dimas S.)</span>
                          <span className="font-bold text-emerald-600">Rp 750.000 (Lunas Otomatis)</span>
                        </div>
                        <div className="flex items-center justify-between text-xs py-1">
                          <span className="font-semibold text-gray-800">QRIS Yayasan - (Putri Nabila)</span>
                          <span className="font-bold text-emerald-600">Rp 500.000 (Lunas Otomatis)</span>
                        </div>
                      </div>
                    </div>

                    {/* Bullet Highlights */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                      {currentPillar.bullets.map((b, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-gray-700 font-medium">
                          <Check className="w-3.5 h-3.5 text-[#531FFF] shrink-0 mt-0.5" strokeWidth={3} />
                          <span>{b}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* SIMULATION 3: KOMUNIKASI & MULTI-ROLE */}
                {activePillar === 3 && (
                  <motion.div
                    key="sim-3"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.22 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                      <div>
                        <h4 className="text-sm font-black text-gray-900">{currentPillar.title}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">Broadcast pengumuman tertarget dengan tanda terima digital</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200/80 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-600" /> 5 Dedicated Roles
                      </span>
                    </div>

                    {/* Simulated Composer Card */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-gray-200/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-800">Target Penerima:</span>
                        <div className="flex gap-1.5">
                          <span className="text-[10px] font-bold bg-[#F3F0FF] text-[#531FFF] px-2 py-0.5 rounded">Wali Murid Kelas 12</span>
                          <span className="text-[10px] font-bold bg-gray-200 text-gray-700 px-2 py-0.5 rounded">Dewan Guru</span>
                        </div>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-gray-200 space-y-1">
                        <p className="text-xs font-bold text-gray-900">Edaran Persiapan Asesmen Bakat Minat & Try Out Nasional</p>
                        <p className="text-xs text-gray-600 leading-relaxed font-normal">
                          Diberitahukan kepada seluruh orang tua siswa kelas 12 bahwa simulasi tes minat bakat akan diselenggarakan pada Senin mendatang...
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" /> Terkirim ke 240 Wali Murid
                        </span>
                        <span className="text-[11px] font-bold text-emerald-600">
                          96.8% Telah Membaca (Read Receipt)
                        </span>
                      </div>
                    </div>

                    {/* Bullet Highlights */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                      {currentPillar.bullets.map((b, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-gray-700 font-medium">
                          <Check className="w-3.5 h-3.5 text-[#531FFF] shrink-0 mt-0.5" strokeWidth={3} />
                          <span>{b}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom Card Footer Action */}
              <div className="pt-6 mt-6 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                  <Laptop className="w-4 h-4 text-[#531FFF]" />
                  <span>Akses instan dari peramban web tanpa unduhan instalasi desktop.</span>
                </div>
                <Link
                  href={currentPillar.link}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#531FFF] text-white text-xs font-bold hover:bg-[#4314cc] transition-all shadow-xs"
                >
                  {currentPillar.linkText} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

            </div>
          </div>

        </div>

        {/* Quick feature shortcuts ribbon */}
        <div className="mt-14 pt-8 border-t border-gray-200/80 flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Modul Tambahan Siap Pakai:
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {t.quickBadges.map((badge, i) => (
              <Link
                key={i}
                href={badge.href}
                className="px-3.5 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:border-[#531FFF] hover:text-[#531FFF] hover:bg-[#F3F0FF]/30 transition-all shadow-2xs"
              >
                {badge.label} →
              </Link>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
