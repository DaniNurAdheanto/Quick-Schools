"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MapPin, CheckCircle2, ShieldCheck, ArrowUpRight,
  CreditCard, Sparkles, UserCheck, Bell, School
} from "lucide-react";

interface HeroCanvasProps {
  lang: "id" | "en";
}

export default function HeroCanvas({ lang }: HeroCanvasProps) {
  const [activeTab, setActiveTab] = useState<"presensi" | "rapor" | "spp">("presensi");

  const t = {
    id: {
      liveStatus: "Sistem Terhubung Real-Time",
      schoolName: "SMA Nusantara Mandiri Jakarta",
      academicYear: "T.A. 2026/2027 · Semester Ganjil",
      tabAttendance: "Presensi Geofence",
      tabGrades: "Rapor K-Merdeka",
      tabFinance: "Billing SPP",
      attendanceBadge: "Radius Sekolah: 120m",
      onTimeRate: "Tingkat Kehadiran",
      onTimeValue: "98.4%",
      studentsPresent: "1.142 dari 1.160 siswa hadir",
      recentCheckins: "Aktivitas Presensi Terverifikasi",
      gradesBadge: "Otomasi Kurikulum Merdeka",
      gradeSummary: "100% Rapor Siap Cetak",
      gradeDesc: "Deskripsi capaian TP dirumuskan otomatis dari rekap formatif & sumatif.",
      financeBadge: "Rekap SPP Real-Time",
      financeRate: "Tingkat Pelunasan",
      financeValue: "Rp 348.500.000",
      financeSub: "94.2% tagihan terbayar bulan ini",
    },
    en: {
      liveStatus: "System Connected Real-Time",
      schoolName: "Nusantara Mandiri High School",
      academicYear: "A.Y. 2026/2027 · Odd Semester",
      tabAttendance: "Geofence Attendance",
      tabGrades: "Merdeka Report Cards",
      tabFinance: "Tuition Billing",
      attendanceBadge: "School Radius: 120m",
      onTimeRate: "Attendance Rate",
      onTimeValue: "98.4%",
      studentsPresent: "1,142 of 1,160 students present",
      recentCheckins: "Verified Attendance Stream",
      gradesBadge: "Merdeka Curriculum Engine",
      gradeSummary: "100% Ready-to-Print Cards",
      gradeDesc: "Outcome narratives automatically computed from formative & summative scores.",
      financeBadge: "Real-Time Tuition Stream",
      financeRate: "Collection Rate",
      financeValue: "Rp 348,500,000",
      financeSub: "94.2% bills cleared this month",
    }
  }[lang];

  return (
    <div className="relative w-full max-w-2xl mx-auto lg:max-w-none select-none">
      {/* Outer ambient glow */}
      <div className="absolute -inset-4 bg-gradient-to-tr from-[#531FFF]/20 via-[#7B4DFF]/15 to-transparent rounded-2xl blur-xl -z-10 pointer-events-none" />

      {/* Main SaaS Window Frame */}
      <div className="bg-white/95 backdrop-blur-xl rounded-xl md:rounded-2xl border border-gray-200/90 shadow-[0_20px_60px_-15px_rgba(83,31,255,0.18),0_0_0_1px_rgba(83,31,255,0.06)] overflow-hidden">
        
        {/* Window Chrome Header */}
        <div className="bg-slate-900 px-4 py-3 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/90" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400/90" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/90" />
            </div>
            <div className="hidden sm:flex items-center gap-1.5 ml-3 px-3 py-1 bg-slate-800/80 rounded-md text-[11px] text-slate-300 font-mono">
              <ShieldCheck className="w-3 h-3 text-[#7B4DFF]" />
              <span className="text-slate-400">https://</span>quickschools.id/os/live-preview
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {t.liveStatus}
            </span>
          </div>
        </div>

        {/* Window Subheader & School Identity */}
        <div className="px-5 py-3.5 bg-slate-50/80 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#531FFF] to-[#7B4DFF] flex items-center justify-center text-white shadow-xs">
              <School className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900 tracking-tight">{t.schoolName}</h4>
              <p className="text-[10px] text-gray-500 font-medium">{t.academicYear}</p>
            </div>
          </div>

          {/* Interactive Feature Tabs */}
          <div className="flex items-center gap-1 p-1 bg-white border border-gray-200/80 rounded-lg shadow-xs">
            {(["presensi", "rapor", "spp"] as const).map((tab) => {
              const label = tab === "presensi" ? t.tabAttendance : tab === "rapor" ? t.tabGrades : t.tabFinance;
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                    isActive ? "text-[#531FFF] shadow-xs" : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="canvasActiveTab"
                      className="absolute inset-0 bg-[#F3F0FF] rounded-md -z-0"
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Canvas Workspace */}
        <div className="p-5 min-h-[330px] bg-gradient-to-b from-white to-slate-50/50">
          <AnimatePresence mode="wait">
            {activeTab === "presensi" && (
              <motion.div
                key="presensi"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Metric Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-lg bg-white border border-gray-100 shadow-xs">
                    <div className="flex items-center justify-between text-gray-400 mb-1">
                      <span className="text-[11px] font-semibold text-gray-500">{t.onTimeRate}</span>
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-xl font-extrabold text-gray-900 tracking-tight">{t.onTimeValue}</div>
                    <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">↑ +1.2% dari minggu lalu</p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-white border border-gray-100 shadow-xs">
                    <div className="flex items-center justify-between text-gray-400 mb-1">
                      <span className="text-[11px] font-semibold text-gray-500">{t.attendanceBadge}</span>
                      <MapPin className="w-4 h-4 text-[#531FFF]" />
                    </div>
                    <div className="text-xl font-extrabold text-[#531FFF] tracking-tight">Geofence GPS</div>
                    <p className="text-[10px] text-gray-500 font-medium mt-0.5">Validasi koordinat radius 120m</p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-white border border-gray-100 shadow-xs sm:col-span-1">
                    <div className="flex items-center justify-between text-gray-400 mb-1">
                      <span className="text-[11px] font-semibold text-gray-500">Rekapitulasi</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    </div>
                    <div className="text-xs font-bold text-gray-800">{t.studentsPresent}</div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className="bg-gradient-to-r from-[#531FFF] to-emerald-500 h-full rounded-full w-[98.4%]" />
                    </div>
                  </div>
                </div>

                {/* Simulated Live Check-in Feed */}
                <div className="bg-slate-50/80 rounded-xl p-3 border border-gray-100">
                  <div className="flex items-center justify-between px-1 mb-2.5">
                    <span className="text-[11px] font-bold text-gray-700 tracking-wide uppercase">{t.recentCheckins}</span>
                    <span className="text-[10px] font-semibold text-[#531FFF] bg-[#F3F0FF] px-2 py-0.5 rounded-md">3 detik lalu</span>
                  </div>

                  <div className="space-y-2">
                    {[
                      { name: "Rafi Pratama", class: "11-IPA 1", time: "06:48 WIB", dist: "34m dari titik pusat", status: "Terverifikasi" },
                      { name: "Anindya Putri", class: "10-IPS 2", time: "06:51 WIB", dist: "18m dari titik pusat", status: "Terverifikasi" },
                      { name: "Daffa Alfarizi", class: "12-MIPA 3", time: "06:53 WIB", dist: "62m dari titik pusat", status: "Terverifikasi" },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-gray-100 shadow-2xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-md bg-[#F3F0FF] text-[#531FFF] font-bold text-xs flex items-center justify-center">
                            {item.name[0]}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-900 leading-tight">{item.name}</p>
                            <p className="text-[10px] text-gray-500">{item.class} · {item.time}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-right">
                          <span className="text-[10px] text-gray-400 font-mono hidden sm:inline">{item.dist}</span>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold text-[10px] border border-emerald-100 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {item.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "rapor" && (
              <motion.div
                key="rapor"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="bg-[#F3F0FF]/60 border border-[#531FFF]/20 rounded-xl p-3.5 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#531FFF] text-white flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-gray-900">{t.gradeSummary}</h5>
                    <p className="text-[11px] text-gray-600 leading-relaxed mt-0.5">{t.gradeDesc}</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-gray-100">
                    <span className="font-bold text-gray-900">Format Rapor K-Merdeka (Fase E/F)</span>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">Format Kemdikbudristek</span>
                  </div>

                  {[
                    { mapel: "Matematika Tingkat Lanjut", tp: "Mampu memodelkan fungsi trigonometri dan menyelesaikan persamaan diferensial sederhana", score: 92, badge: "Sangat Baik" },
                    { mapel: "Bahasa Indonesia", tp: "Mampu mengevaluasi informasi dan gagasan dalam teks editorial serta menyajikan teks eksposisi", score: 88, badge: "Tercapai" },
                    { mapel: "Informatika & Pemrograman", tp: "Mampu merancang algoritma sorting serta menerapkan konsep modularitas perangkat lunak", score: 95, badge: "Sangat Baik" },
                  ].map((sub, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-slate-50/70 border border-gray-100 flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900">{sub.mapel}</span>
                          <span className="text-[9px] font-bold text-[#531FFF] bg-[#F3F0FF] px-1.5 py-0.2 rounded">Nilai Akhir: {sub.score}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 line-clamp-1">{sub.tp}</p>
                      </div>
                      <span className="shrink-0 text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded">
                        {sub.badge}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === "spp" && (
              <motion.div
                key="spp"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-[#531FFF] to-[#4314cc] text-white shadow-xs">
                    <p className="text-[11px] font-semibold text-purple-200">{t.financeRate}</p>
                    <h3 className="text-2xl font-black mt-1 tracking-tight">{t.financeValue}</h3>
                    <p className="text-[10px] text-purple-200 mt-1">{t.financeSub}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-gray-100 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-gray-400 mb-1">
                        <span className="text-[11px] font-semibold text-gray-500">Rekonsiliasi Otomatis</span>
                        <CreditCard className="w-4 h-4 text-emerald-600" />
                      </div>
                      <h4 className="text-base font-black text-gray-900">Virtual Account & QRIS</h4>
                      <p className="text-[10px] text-gray-500 mt-0.5">Integrasi payment gateway tanpa verifikasi mutasi manual.</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 mt-2">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 100% Bukti Bayar Otomatis Dikirim via WA
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {[
                    { student: "Muhammad Farhan", invoice: "INV-SPP-2026-0901", amount: "Rp 650.000", method: "BCA VA", status: "Lunas" },
                    { student: "Zahra Aulia", invoice: "INV-SPP-2026-0902", amount: "Rp 650.000", method: "Mandiri VA", status: "Lunas" },
                  ].map((inv, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-gray-100 shadow-2xs">
                      <div>
                        <p className="text-xs font-bold text-gray-900">{inv.student}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{inv.invoice} · {inv.method}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-gray-900">{inv.amount}</p>
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer info bar */}
        <div className="px-5 py-2.5 bg-slate-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#531FFF]" />
            <span className="font-semibold text-gray-700">Multi-Role Portal:</span>
            <span className="hidden sm:inline text-gray-500">Admin · Guru · Siswa · Orang Tua · Bendahara</span>
          </div>
          <span className="text-[10px] font-bold text-[#531FFF] flex items-center gap-1">
            Simulasi Interaktif <ArrowUpRight className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* Floating Micro-Card 1 (Left): Live Geofence Radar badge */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="hidden xl:flex items-center gap-3 absolute -left-8 top-1/4 bg-white/95 backdrop-blur-md p-3 rounded-xl border border-gray-100 shadow-lg z-20"
      >
        <div className="w-8 h-8 rounded-lg bg-[#F3F0FF] flex items-center justify-center text-[#531FFF] shrink-0">
          <MapPin className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-900 leading-tight">Geofence Presisi</p>
          <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Anti-Fake GPS Aktif
          </p>
        </div>
      </motion.div>

      {/* Floating Micro-Card 2 (Right): WhatsApp Real-time Alert */}
      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
        className="hidden xl:flex items-center gap-3 absolute -right-8 bottom-12 bg-white/95 backdrop-blur-md p-3 rounded-xl border border-gray-100 shadow-lg z-20"
      >
        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
          <Bell className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-900 leading-tight">Notifikasi Wali Murid</p>
          <p className="text-[10px] text-gray-500 font-medium">Anak tiba di sekolah (06:48)</p>
        </div>
      </motion.div>
    </div>
  );
}
