"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  GraduationCap, CreditCard,
  CheckCircle2, Award, BarChart3,
  HeartHandshake, Users
} from "lucide-react";

interface PersonaShowcaseProps {
  lang: "id" | "en";
}

export default function PersonaShowcase({ lang }: PersonaShowcaseProps) {
  const [activePersona, setActivePersona] = useState<number>(0);

  const t = {
    id: {
      badge: "DIRANCANG UNTUK SETIAP PERAN",
      title: "Satu Platform, Pengalaman Spesifik untuk Seluruh Civitas",
      desc: "Setiap pengguna berinteraksi dengan antarmuka yang disederhanakan sesuai tugas pokok dan wewenangnya, tanpa kekacauan visual.",
      personas: [
        {
          role: "Kepala Sekolah & Yayasan",
          icon: Award,
          tagline: "Visibilitas Eksekutif & Pengambilan Keputusan Berbasis Data",
          quote: "Memantau kehadiran seluruh guru & siswa hari ini, status kas SPP, dan akreditasi sekolah dalam satu layar smartphone saya.",
          benefits: [
            "Dashboard analitik kehadiran real-time seluruh rombel kelas",
            "Rekapitulasi keuangan arus kas dan tunggakan per semester",
            "Verifikasi dan tanda tangan digital dokumen rapor resmi",
            "Pemberian izin & disposisi pengajuan surat secara instan"
          ],
          mockupTitle: "Portal Eksekutif Kepala Sekolah",
          metricValue: "98.4%",
          metricLabel: "Kehadiran Total Hari Ini",
          badgeColor: "bg-purple-100 text-[#531FFF]"
        },
        {
          role: "Guru & Wali Kelas",
          icon: GraduationCap,
          tagline: "Hemat 10+ Jam Per Minggu dari Beban Administrasi Kertas",
          quote: "Input nilai Kurikulum Merdeka dan cetak rapor jadi sangat cepat. Saya bisa lebih fokus mengajar daripada menyalin rumus Excel.",
          benefits: [
            "Absensi satu ketukan di kelas dengan auto-sinkron ke orang tua",
            "Input nilai formatif & sumatif dengan deskripsi TP otomatis",
            "Jadwal mengajar dan agenda kelas tersusun rapi",
            "Cetak rapor digital semesteran siap tanda tangan"
          ],
          mockupTitle: "Portal Akademik Wali Kelas",
          metricValue: "< 3 Menit",
          metricLabel: "Rata-rata Waktu Input Rapor / Siswa",
          badgeColor: "bg-blue-100 text-blue-700"
        },
        {
          role: "Orang Tua Siswa",
          icon: HeartHandshake,
          tagline: "Ketenangan Pikiran & Transparansi Tumbuh Kembang Anak",
          quote: "Setiap pagi saya langsung tenang saat mendapat notifikasi WhatsApp bahwa anak saya sudah sampai di sekolah tepat waktu.",
          benefits: [
            "Notifikasi kedatangan & kepulangan anak di sekolah secara real-time",
            "Pantau riwayat absensi, surat izin sakit, dan catatan disiplin",
            "Rincian tagihan SPP transparan dengan pembayaran instan via VA",
            "Unduh salinan rapor digital langsung dari smartphone"
          ],
          mockupTitle: "Portal Pendampingan Orang Tua",
          metricValue: "100%",
          metricLabel: "Transparansi Riwayat Kehadiran",
          badgeColor: "bg-emerald-100 text-emerald-700"
        },
        {
          role: "Bendahara & Staf TU",
          icon: CreditCard,
          tagline: "Pembukuan Rapi, Nol Cek Mutasi Bank Manual",
          quote: "Tidak ada lagi slip transfer yang tercecer atau wali murid yang komplain karena status bayar belum diverifikasi.",
          benefits: [
            "Penerbitan tagihan SPP massal otomatis setiap awal bulan",
            "Sinkronisasi pembayaran otomatis via Virtual Account & QRIS",
            "Kirim pengingat tagihan santun via WhatsApp sekali klik",
            "Laporan pembukuan laba rugi dan rekap kas siap audit"
          ],
          mockupTitle: "Portal Keuangan & Tata Usaha",
          metricValue: "94.2%",
          metricLabel: "Ketepatan Waktu Pembayaran SPP",
          badgeColor: "bg-amber-100 text-amber-700"
        }
      ]
    },
    en: {
      badge: "TAILORED FOR EVERY ROLE",
      title: "One Platform, Dedicated Experiences for Every Stakeholder",
      desc: "Every stakeholder interacts with a tailored interface designed specifically for their core responsibilities, free from clutter.",
      personas: [
        {
          role: "Principals & Foundations",
          icon: Award,
          tagline: "Executive Visibility & Data-Driven Decision Making",
          quote: "Monitor faculty and student attendance, tuition cashflow, and accreditation standards directly on my smartphone.",
          benefits: [
            "Executive analytics dashboard with live attendance across all classes",
            "Semester cashflow statements and outstanding tuition summaries",
            "Digital approval and official sign-off for semester report cards",
            "Instant workflow for administrative leaves and official school memos"
          ],
          mockupTitle: "Executive Principal Portal",
          metricValue: "98.4%",
          metricLabel: "Total School Attendance Today",
          badgeColor: "bg-purple-100 text-[#531FFF]"
        },
        {
          role: "Teachers & Homeroom Staff",
          icon: GraduationCap,
          tagline: "Save 10+ Hours Every Week from Paper Administration",
          quote: "Entering Merdeka Curriculum scores and generating report cards is effortless now. I can focus on teaching rather than fixing Excel sheets.",
          benefits: [
            "One-tap classroom roll call with instant parent synchronization",
            "Formative & summative grade entry with auto-computed TP narratives",
            "Organized weekly teaching schedules and lesson timelines",
            "Print-ready standardized digital semester report cards"
          ],
          mockupTitle: "Faculty & Homeroom Portal",
          metricValue: "< 3 Mins",
          metricLabel: "Average Grade Entry Time / Student",
          badgeColor: "bg-blue-100 text-blue-700"
        },
        {
          role: "Parents & Guardians",
          icon: HeartHandshake,
          tagline: "Peace of Mind & Complete Transparency for Your Child",
          quote: "Every morning brings total peace of mind when an automated WhatsApp arrives confirming my child safely reached campus.",
          benefits: [
            "Instant alerts on student arrival and departure from school gates",
            "View real-time attendance logs, medical leaves, and conduct remarks",
            "Transparent digital tuition invoices payable via instant Virtual Account",
            "Download digital report cards directly from mobile web"
          ],
          mockupTitle: "Parent Guardian Portal",
          metricValue: "100%",
          metricLabel: "Attendance Log Transparency",
          badgeColor: "bg-emerald-100 text-emerald-700"
        },
        {
          role: "Bursars & Admin Staff",
          icon: CreditCard,
          tagline: "Pristine Accounting with Zero Manual Bank Checks",
          quote: "No more lost bank paper receipts or frantic parents asking why their payment hasn't been verified yet.",
          benefits: [
            "Automated batch tuition billing dispatched on the 1st of every month",
            "Instant reconciliation via Virtual Accounts & static QRIS",
            "Polite automated WhatsApp reminder blasts in one click",
            "Audit-ready profit & loss ledgers and cashflow balance reports"
          ],
          mockupTitle: "Finance & Accounting Portal",
          metricValue: "94.2%",
          metricLabel: "On-Time Tuition Payment Rate",
          badgeColor: "bg-amber-100 text-amber-700"
        }
      ]
    }
  }[lang];

  const current = t.personas[activePersona];
  const IconComponent = current.icon;

  return (
    <section className="py-24 md:py-32 bg-slate-50/60 border-t border-gray-200/70 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-[#F3F0FF] border border-[#531FFF]/20 text-[#531FFF] text-xs font-bold uppercase tracking-wider mb-4">
            <Users className="w-3.5 h-3.5 text-[#531FFF]" />
            {t.badge}
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-[1.14] mb-5">
            {t.title}
          </h2>
          <p className="text-base sm:text-lg text-gray-600 leading-relaxed font-normal">
            {t.desc}
          </p>
        </div>

        {/* Persona Switcher Navigation Pills */}
        <div className="flex items-center justify-start sm:justify-center overflow-x-auto pb-4 gap-2 mb-12 scrollbar-none">
          {t.personas.map((p, idx) => {
            const isActive = activePersona === idx;
            const PtrIcon = p.icon;
            return (
              <button
                key={idx}
                onClick={() => setActivePersona(idx)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-all border shrink-0 ${
                  isActive
                    ? "bg-[#531FFF] text-white border-[#531FFF] shadow-md shadow-[#531FFF]/25 scale-102"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-900 shadow-2xs"
                }`}
              >
                <PtrIcon className={`w-4 h-4 ${isActive ? "text-white" : "text-gray-400"}`} />
                <span>{p.role}</span>
              </button>
            );
          })}
        </div>

        {/* Active Persona Showcase Stage */}
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-[0_15px_40px_-15px_rgba(83,31,255,0.06)] p-6 sm:p-10 md:p-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePersona}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center"
            >
              {/* Left Column: Role Narrative & Benefits */}
              <div className="lg:col-span-6 space-y-6">
                <div>
                  <span className={`text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-md inline-block mb-3 ${current.badgeColor}`}>
                    {current.role}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-snug">
                    {current.tagline}
                  </h3>
                </div>

                {/* Quote card */}
                <div className="p-4 rounded-xl bg-slate-50 border-l-4 border-[#531FFF] italic text-xs sm:text-sm text-gray-700 leading-relaxed font-medium">
                  "{current.quote}"
                </div>

                {/* Benefit checklist */}
                <div className="space-y-3 pt-2">
                  {current.benefits.map((b, bIdx) => (
                    <div key={bIdx} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#F3F0FF] flex items-center justify-center text-[#531FFF] shrink-0 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#531FFF]" />
                      </div>
                      <span className="text-xs sm:text-sm font-semibold text-gray-800 leading-tight">
                        {b}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: High-Fidelity Persona Micro-Preview */}
              <div className="lg:col-span-6">
                <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-7 border border-slate-800 shadow-xl space-y-5">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#531FFF] flex items-center justify-center text-white">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-white tracking-tight">
                        {current.mockupTitle}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                      Live Environment
                    </span>
                  </div>

                  {/* Primary Metric Showcase */}
                  <div className="p-5 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/80 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 font-medium">{current.metricLabel}</p>
                      <h4 className="text-3xl font-black text-white mt-1 tracking-tight">{current.metricValue}</h4>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-[#531FFF]/20 border border-[#531FFF]/40 flex items-center justify-center text-[#A78BFA]">
                      <BarChart3 className="w-5 h-5 text-[#A78BFA]" />
                    </div>
                  </div>

                  {/* Micro-Features Row */}
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">Validasi Hak Akses</span>
                      <span className="font-mono text-emerald-400 font-semibold">Tersertifikasi RBAC</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">Sinkronisasi Basis Data</span>
                      <span className="font-mono text-[#A78BFA] font-semibold">Cloud Real-Time</span>
                    </div>
                  </div>

                  {/* Quick Action Preview */}
                  <div className="pt-2 text-center">
                    <p className="text-[11px] text-slate-400 font-medium">
                      Setiap akun civitas memiliki URL login dan kredensial aman tersendiri.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}
