"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  CheckCircle2, MapPin, Sparkles,
  FileSpreadsheet, Radio, BellRing
} from "lucide-react";

interface WorkflowStepsProps {
  lang: "id" | "en";
}

export default function WorkflowSteps({ lang }: WorkflowStepsProps) {
  const [activeStep, setActiveStep] = useState<number>(0);

  const t = {
    id: {
      badge: "ALUR SETUP & ONBOARDING",
      title: "Transisi Mulus ke Sekolah Digital dalam Hitungan Jam",
      desc: "Tidak memerlukan instalasi server rumit atau konsultan teknis mahal. Tim kami mendampingi migrasi data sekolah Anda hingga tuntas.",
      steps: [
        {
          num: "01",
          title: "Setup Profil & Radius Geofence",
          subtitle: "Konfigurasi instan tanpa infrastruktur lokal",
          desc: "Tentukan identitas institusi, logo, jenjang pendidikan, serta kunci radius GPS lokasi sekolah untuk validasi presensi siswa dan guru secara otomatis.",
          badge: "Waktu Setup: 15 Menit",
          visualTitle: "Parameter Geofence & Kampus",
          tags: ["NPSN Terintegrasi", "Batas GPS Presisi", "Kalender Akademik"]
        },
        {
          num: "02",
          title: "Import Cerdas Data Siswa & Guru",
          subtitle: "Kompatibel dengan format Excel & Dapodik",
          desc: "Cukup unggah lembar data Excel/CSV yang sudah ada. Sistem pintar kami memetakan biodata, rombel kelas, wali kelas, serta nomor kontak orang tua tanpa input manual ulang.",
          badge: "Otomasi Parser AI",
          visualTitle: "Smart Data Importer",
          tags: ["Validasi Duplikasi", "Pemetaan NISN", "Generate Akun Instan"]
        },
        {
          num: "03",
          title: "Aktivasi Portal & Operasional Mandiri",
          subtitle: "Seluruh civitas sekolah terhubung serentak",
          desc: "Guru siap mencatat kehadiran & nilai, bendahara memantau mutasi SPP, siswa presensi tepat waktu di area sekolah, dan orang tua menerima update real-time via ponsel.",
          badge: "Operasional Penuh",
          visualTitle: "Live Real-Time Stream",
          tags: ["Notifikasi WhatsApp", "Multi-Role Terisolasi", "Rapor Siap Cetak"]
        }
      ]
    },
    en: {
      badge: "ONBOARDING & WORKFLOW",
      title: "Seamless Transition to a Digital School in Hours",
      desc: "No local server installations or expensive consultants required. Our team guides your school's data migration from start to finish.",
      steps: [
        {
          num: "01",
          title: "Profile Setup & Geofence Perimeter",
          subtitle: "Instant configuration with zero local hardware",
          desc: "Define your school identity, logo, academic levels, and set the GPS radius boundary for automated student and faculty attendance validation.",
          badge: "Setup Time: 15 Mins",
          visualTitle: "Geofence & Campus Parameters",
          tags: ["NPSN Integrated", "Precise GPS Bounds", "Academic Calendar"]
        },
        {
          num: "02",
          title: "Smart Import of Students & Faculty",
          subtitle: "Fully compatible with existing Excel & Dapodik files",
          desc: "Simply upload your existing Excel/CSV sheets. Our parser automatically maps student records, classroom assignments, homerooms, and parent contact numbers.",
          badge: "Smart Data Parser",
          visualTitle: "Smart Data Importer",
          tags: ["Duplicate Guard", "NISN Mapping", "Instant Credentials"]
        },
        {
          num: "03",
          title: "Portal Activation & Autonomous Operation",
          subtitle: "All school stakeholders connected simultaneously",
          desc: "Teachers record attendance and grades, bursars monitor tuition flows, students check in on campus grounds, and parents receive live updates on their smartphones.",
          badge: "Fully Operational",
          visualTitle: "Live Real-Time Stream",
          tags: ["WhatsApp Alerts", "Isolated Multi-Role", "Print-Ready Reports"]
        }
      ]
    }
  }[lang];

  return (
    <section id="cara-kerja" className="py-24 md:py-32 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-[#F3F0FF] border border-[#531FFF]/20 text-[#531FFF] text-xs font-bold uppercase tracking-wider mb-4">
            <Radio className="w-3.5 h-3.5 text-[#531FFF]" />
            {t.badge}
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-[1.14] mb-5">
            {t.title}
          </h2>
          <p className="text-base sm:text-lg text-gray-600 leading-relaxed font-normal">
            {t.desc}
          </p>
        </div>

        {/* Dynamic Connected Workflow - Editorial Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Column: Interactive Step Progression Guide */}
          <div className="lg:col-span-6 space-y-6">
            {t.steps.map((step, idx) => {
              const isActive = activeStep === idx;
              return (
                <div
                  key={step.num}
                  onClick={() => setActiveStep(idx)}
                  className={`group p-6 rounded-xl cursor-pointer transition-all border text-left relative ${
                    isActive
                      ? "bg-[#FAFBFF] border-[#531FFF]/30 shadow-[0_8px_24px_-6px_rgba(83,31,255,0.12)]"
                      : "bg-white hover:bg-slate-50/70 border-gray-200/80"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Step Number Circle */}
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-all ${
                      isActive
                        ? "bg-[#531FFF] text-white shadow-md shadow-[#531FFF]/25 scale-102"
                        : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"
                    }`}>
                      {step.num}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                          isActive ? "bg-[#F3F0FF] text-[#531FFF]" : "bg-gray-100 text-gray-500"
                        }`}>
                          {step.badge}
                        </span>
                        <span className="text-xs text-gray-400 font-semibold">{step.subtitle}</span>
                      </div>

                      <h3 className={`text-lg font-black tracking-tight transition-colors ${
                        isActive ? "text-[#531FFF]" : "text-gray-900"
                      }`}>
                        {step.title}
                      </h3>

                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-normal">
                        {step.desc}
                      </p>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {step.tags.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="text-[10px] font-semibold text-gray-600 bg-white border border-gray-200 px-2 py-0.5 rounded"
                          >
                            ✓ {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: High-Fidelity Step Sandbox Canvas */}
          <div className="lg:col-span-6">
            <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 text-white border border-slate-800 shadow-xl relative overflow-hidden min-h-[440px] flex flex-col justify-between">
              {/* Background ambient lighting */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-[#531FFF]/25 rounded-full blur-3xl pointer-events-none" />

              {/* Sandbox Top Bar */}
              <div className="flex items-center justify-between pb-5 border-b border-slate-800 relative z-10">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-mono font-bold text-slate-300">
                    Step {t.steps[activeStep].num}: {t.steps[activeStep].visualTitle}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#A78BFA] bg-[#531FFF]/20 border border-[#531FFF]/30 px-2.5 py-0.5 rounded-md">
                  Automated Pipeline
                </span>
              </div>

              {/* Dynamic Interactive Body based on step */}
              <div className="py-6 relative z-10">
                {activeStep === 0 && (
                  <motion.div
                    key="step-vis-0"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium">Titik Pusat Koordinat GPS</span>
                        <span className="font-mono text-emerald-400 font-bold">-6.2088° S, 106.8456° E</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium">Perimeter Geofence Toleransi</span>
                        <span className="font-mono text-[#A78BFA] font-bold">120 Meter Radius</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium">Sinkronisasi NPSN Kemdikbud</span>
                        <span className="font-mono text-white font-bold">20108392 (Terverifikasi)</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-gradient-to-r from-[#531FFF]/30 to-purple-900/30 border border-[#531FFF]/40 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#531FFF] flex items-center justify-center text-white shrink-0">
                        <MapPin className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Radius Kampus Siap Digunakan</p>
                        <p className="text-[11px] text-slate-300">Setiap siswa yang berada di dalam radius 120m otomatis diizinkan presensi mandiri.</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeStep === 1 && (
                  <motion.div
                    key="step-vis-1"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> data_siswa_2026_final.xlsx
                        </span>
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                          100% Parsed
                        </span>
                      </div>
                      <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-400 h-full w-full rounded-full" />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center pt-1">
                        <div className="p-2 rounded-lg bg-slate-900/70 border border-slate-700">
                          <p className="text-sm font-black text-white">1.160</p>
                          <p className="text-[9px] text-slate-400 uppercase">Siswa Terdaftar</p>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-900/70 border border-slate-700">
                          <p className="text-sm font-black text-white">64</p>
                          <p className="text-[9px] text-slate-400 uppercase">Guru & Staf</p>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-900/70 border border-slate-700">
                          <p className="text-sm font-black text-emerald-400">0</p>
                          <p className="text-[9px] text-slate-400 uppercase">Konflik Data</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700 text-xs text-slate-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      Kredensial login portal siswa dan wali murid digenerate otomatis tanpa ribet.
                    </div>
                  </motion.div>
                )}

                {activeStep === 2 && (
                  <motion.div
                    key="step-vis-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-3">
                      <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-700">
                        <span className="font-bold text-white flex items-center gap-2">
                          <BellRing className="w-4 h-4 text-[#A78BFA]" /> Multi-Portal Live Stream
                        </span>
                        <span className="text-[10px] text-emerald-400 font-mono">Sync latency: 42ms</span>
                      </div>

                      <div className="space-y-2">
                        <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-700/60 flex items-center justify-between text-xs">
                          <span className="text-slate-300 font-medium">Presensi Masuk Siswa</span>
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded">Terkirim ke WA Ortu</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-700/60 flex items-center justify-between text-xs">
                          <span className="text-slate-300 font-medium">Input Nilai Formatif Guru</span>
                          <span className="text-[10px] font-bold text-purple-400 bg-purple-950 px-2 py-0.5 rounded">Rapor Terupdate</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-700/60 flex items-center justify-between text-xs">
                          <span className="text-slate-300 font-medium">Pembayaran Tagihan SPP</span>
                          <span className="text-[10px] font-bold text-blue-400 bg-blue-950 px-2 py-0.5 rounded">Rekonsiliasi Bank VA</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#531FFF]/20 border border-[#531FFF]/40 text-xs text-purple-200 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-300 shrink-0" />
                      Semua data terhubung langsung ke dashboard eksekutif Kepala Sekolah.
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Sandbox Footer Action */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 relative z-10">
                <span>Langkah {activeStep + 1} dari 3</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveStep((prev) => (prev > 0 ? prev - 1 : 2))}
                    className="px-3 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors"
                  >
                    Sebelumnya
                  </button>
                  <button
                    onClick={() => setActiveStep((prev) => (prev < 2 ? prev + 1 : 0))}
                    className="px-3 py-1 rounded-md bg-[#531FFF] hover:bg-[#4314cc] text-white font-bold transition-colors"
                  >
                    Berikutnya →
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
