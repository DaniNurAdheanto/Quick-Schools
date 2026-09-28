"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  ArrowRight, CheckCircle2, Star,
  Zap, ArrowUpRight, Building2
} from "lucide-react";
import LandingNavbar from "@/components/landing/navbar";
import LandingFooter from "@/components/landing/footer";
import HeroCanvas from "@/components/landing/hero-canvas";
import InteractiveFeatures from "@/components/landing/interactive-features";
import WorkflowSteps from "@/components/landing/workflow-steps";
import BentoAdvantages from "@/components/landing/bento-advantages";
import PersonaShowcase from "@/components/landing/persona-showcase";
import PricingFaq from "@/components/landing/pricing-faq";

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

  const t = {
    id: {
      heroBadge: "Sistem Operasi Sekolah Modern",
      heroBadgeSub: "Standar Kurikulum Merdeka & Kemdikbudristek",
      heroH1a: "Satu Sistem Operasi untuk Seluruh",
      heroH1b: "Ekosistem Sekolah.",
      heroDesc: "Platform cerdas terintegrasi untuk mengelola presensi geofence, penilaian Kurikulum Merdeka, administrasi SPP otomatis, dan komunikasi 5 portal peran secara real-time.",
      heroCta1: "Mulai Uji Coba Gratis",
      heroCta2: "Pelajari Kapabilitas",
      heroTrust: "Aktif digunakan 500+ sekolah · Tanpa kartu kredit · Onboarding didampingi",
      statSchools: "Sekolah Terdaftar",
      statSchoolsVal: "500+",
      statAttend: "Log Presensi GPS",
      statAttendVal: "1.2M+",
      statUptime: "Uptime Cloud SLA",
      statUptimeVal: "99.9%",
      statSetup: "Waktu Onboarding",
      statSetupVal: "< 24 Jam",
      trustedTitle: "Dipercaya Lebih dari 500+ Sekolah & Yayasan Pendidikan di Seluruh Indonesia",
      testimonialsBadge: "BUKTI KEBERHASILAN",
      testimonialsTitle: "Cerita Nyata dari Pendidik & Pimpinan Sekolah",
      testimonialsDesc: "Bagaimana Quick Schools menghemat ratusan jam kerja staf dan meningkatkan akurasi operasional.",
      testis: [
        {
          quote: "Fitur presensi geofence GPS mengubah kedisiplinan di sekolah kami seketika. Siswa tidak bisa lagi titip absen, dan orang tua merasa sangat tenang karena notifikasi kehadiran otomatis masuk ke ponsel mereka saat itu juga.",
          name: "Dra. Hj. Siti Rahmawati, M.Pd",
          role: "Kepala SMA Negeri 5 Jakarta",
          school: "Akreditasi A · 1.120 Siswa",
          metric: "98.7% Kehadiran Tepat Waktu"
        },
        {
          quote: "Sebelumnya bendahara yayasan kami menghabiskan waktu berhari-hari untuk mencocokkan mutasi bank manual. Dengan sistem SPP dan Virtual Account Quick Schools, rekonsiliasi kas jadi 100% otomatis tanpa selisih.",
          name: "H. Ahmad Fauzi, S.E., M.M",
          role: "Ketua Bidang Keuangan Yayasan Al-Azhar",
          school: "Yayasan Multi-Kampus · 4 Cabang",
          metric: "Hemat 15 Jam/Minggu Kerja Kasir"
        },
        {
          quote: "Penilaian Kurikulum Merdeka sangat mudah dirumuskan. Rumus Tujuan Pembelajaran (TP) terisi otomatis dan cetak rapor digital siap dibagikan ke wali murid tanpa komplain formatting rusak.",
          name: "Dewi Santoso, S.Si",
          role: "Waka Kurikulum BINUS School",
          school: "Kurikulum Nasional Plus",
          metric: "100% Rapor Selesai Tepat Waktu"
        }
      ],
      ctaTitle: "Mulai Transformasi Digital Sekolah Anda Hari Ini",
      ctaDesc: "Bergabunglah bersama 500+ institusi pendidikan modern di Indonesia. Setup cepat didampingi langsung oleh tim ahli kami.",
      ctaBtn1: "Daftar Akun Sekolah — Gratis",
      ctaBtn2: "Konsultasi Tim Onboarding",
      ctaSub: "Tanpa instalasi server lokal · Data tersimpan aman di Google Cloud · Uji coba gratis 14 hari"
    },
    en: {
      heroBadge: "Modern School Operating System",
      heroBadgeSub: "National Curriculum & Ministry Compliant",
      heroH1a: "One Operating System for Your Entire",
      heroH1b: "School Ecosystem.",
      heroDesc: "An integrated intelligence platform managing GPS geofenced attendance, competency-based report cards, automated tuition billing, and 5 dedicated stakeholder portals in real-time.",
      heroCta1: "Start Free Trial",
      heroCta2: "Explore Capabilities",
      heroTrust: "Trusted by 500+ schools · No credit card required · Free guided setup",
      statSchools: "Registered Schools",
      statSchoolsVal: "500+",
      statAttend: "GPS Attendance Logs",
      statAttendVal: "1.2M+",
      statUptime: "Cloud Uptime SLA",
      statUptimeVal: "99.9%",
      statSetup: "Average Onboarding",
      statSetupVal: "< 24 Hours",
      trustedTitle: "Trusted by 500+ Premier Schools & Educational Foundations Across Indonesia",
      testimonialsBadge: "PROVEN IMPACT",
      testimonialsTitle: "Real Stories from Educators & School Leaders",
      testimonialsDesc: "How Quick Schools eliminated hundreds of administrative hours and boosted campus transparency.",
      testis: [
        {
          quote: "The GPS geofence feature completely transformed punctuality at our campus. Students can no longer falsify check-ins, and parents enjoy complete peace of mind with instant arrival notifications.",
          name: "Dra. Hj. Siti Rahmawati, M.Pd",
          role: "Principal, State High School 5 Jakarta",
          school: "Grade A Accreditation · 1,120 Students",
          metric: "98.7% On-Time Attendance"
        },
        {
          quote: "Our foundation's bursars previously spent days manually cross-referencing bank slips. With Quick Schools' Virtual Account automation, tuition reconciliation is 100% automatic with zero balance discrepancies.",
          name: "H. Ahmad Fauzi, S.E., M.M",
          role: "Head of Treasury, Al-Azhar Foundation",
          school: "Multi-Campus Trust · 4 Branches",
          metric: "Saved 15 Hours/Week Admin Time"
        },
        {
          quote: "Assessment tracking for the Merdeka Curriculum is effortless now. Learning objectives are automatically formulated, and print-ready digital report cards are generated without formatting headaches.",
          name: "Dewi Santoso, S.Si",
          role: "Vice Principal of Curriculum, BINUS School",
          school: "National Plus Curriculum",
          metric: "100% Reports On-Schedule"
        }
      ],
      ctaTitle: "Begin Your School's Digital Evolution Today",
      ctaDesc: "Join 500+ premier educational institutions across Indonesia. Rapid onboarding guided personally by our technical specialists.",
      ctaBtn1: "Register School Account — Free",
      ctaBtn2: "Talk to Onboarding Specialist",
      ctaSub: "Zero local hardware required · Enterprise data security on Google Cloud · Free 14-day trial"
    }
  }[lang];

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-[#531FFF]/15 selection:text-[#531FFF] overflow-x-hidden">
      {/* Global Navigation */}
      <LandingNavbar lang={lang} onChangeLang={changeLang} />

      {/* ── 1. HERO SECTION: High-Impact Editorial Showcase ── */}
      <section className="relative pt-28 pb-20 md:pt-36 md:pb-28 overflow-hidden bg-gradient-to-b from-[#F7F5FF] via-white to-white">
        {/* Editorial ambient lighting */}
        <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-gradient-to-b from-[#531FFF]/10 via-[#7B4DFF]/5 to-transparent rounded-full blur-[120px] pointer-events-none -z-0" />
        <div className="absolute top-1/3 left-0 w-[500px] h-[500px] bg-[#531FFF]/5 rounded-full blur-[100px] pointer-events-none -z-0" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Editorial Headline & Actions */}
            <div className="lg:col-span-6 space-y-6 text-left">
              
              {/* Dynamic Status Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-white border border-[#531FFF]/20 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#531FFF] animate-pulse" />
                <span className="text-[11px] font-extrabold text-[#531FFF] tracking-wide uppercase">
                  {t.heroBadge}
                </span>
                <span className="text-[11px] text-gray-400 font-medium hidden sm:inline">|</span>
                <span className="text-[11px] text-gray-600 font-semibold hidden sm:inline">
                  {t.heroBadgeSub}
                </span>
              </div>

              {/* Main Heading */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-gray-900 tracking-tight leading-[1.08]">
                {t.heroH1a}{" "}
                <span className="relative inline-block text-[#531FFF]">
                  {t.heroH1b}
                  <span className="absolute bottom-1.5 left-0 w-full h-3 bg-[#531FFF]/12 -z-10 rounded-sm" />
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-gray-600 leading-relaxed font-normal max-w-xl">
                {t.heroDesc}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-lg bg-[#531FFF] text-white text-sm font-bold hover:bg-[#4314cc] transition-all shadow-md shadow-[#531FFF]/25 hover:shadow-lg hover:shadow-[#531FFF]/30 group"
                >
                  <span>{t.heroCta1}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  href="#features"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-white border border-gray-200 text-gray-700 text-sm font-bold hover:border-gray-300 hover:bg-gray-50 transition-all shadow-2xs"
                >
                  <span>{t.heroCta2}</span>
                </Link>
              </div>

              {/* Trust Badge */}
              <div className="flex items-center gap-2 text-xs text-gray-500 font-medium pt-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{t.heroTrust}</span>
              </div>

              {/* Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-gray-200/80">
                <div>
                  <div className="text-2xl font-black text-gray-900 tracking-tight">{t.statSchoolsVal}</div>
                  <div className="text-xs text-gray-500 font-semibold mt-0.5">{t.statSchools}</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-gray-900 tracking-tight">{t.statAttendVal}</div>
                  <div className="text-xs text-gray-500 font-semibold mt-0.5">{t.statAttend}</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-emerald-600 tracking-tight">{t.statUptimeVal}</div>
                  <div className="text-xs text-gray-500 font-semibold mt-0.5">{t.statUptime}</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-[#531FFF] tracking-tight">{t.statSetupVal}</div>
                  <div className="text-xs text-gray-500 font-semibold mt-0.5">{t.statSetup}</div>
                </div>
              </div>

            </div>

            {/* Right Column: Live Interactive Quick Schools OS Canvas */}
            <div className="lg:col-span-6">
              <HeroCanvas lang={lang} />
            </div>

          </div>
        </div>
      </section>

      {/* ── 2. TRUSTED BY / SOCIAL PROOF STRIP ── */}
      <section className="py-12 bg-white border-t border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest mb-8">
            {t.trustedTitle}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14 opacity-75">
            {[
              "SMA Labschool Jakarta",
              "BINUS School Serpong",
              "Yayasan Al-Azhar Indonesia",
              "Global Jaya International",
              "SMA Tarakanita 1",
              "Sekolah Pelita Harapan"
            ].map((schoolName, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs sm:text-sm font-black text-gray-400 hover:text-gray-800 transition-colors cursor-default"
              >
                <Building2 className="w-4 h-4 text-gray-400" />
                <span>{schoolName}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. SECTION FITUR: Interactive Capability Studio ── */}
      <InteractiveFeatures lang={lang} />

      {/* ── 4. SECTION CARA KERJA: Connected Stepped Journey ── */}
      <WorkflowSteps lang={lang} />

      {/* ── 5. SECTION KEUNGGULAN: Asymmetrical Dark Bento Grid ── */}
      <BentoAdvantages lang={lang} />

      {/* ── 6. SECTION PERSONA: Tailored Stakeholder Experience ── */}
      <PersonaShowcase lang={lang} />

      {/* ── 7. SECTION TESTIMONIALS: Verified Educational Social Proof ── */}
      <section id="testimonials" className="py-24 md:py-32 bg-white border-t border-gray-100 relative">
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-[#F3F0FF] border border-[#531FFF]/20 text-[#531FFF] text-xs font-bold uppercase tracking-wider mb-4">
              <Star className="w-3.5 h-3.5 fill-[#531FFF] text-[#531FFF]" />
              {t.testimonialsBadge}
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-[1.12] mb-5">
              {t.testimonialsTitle}
            </h2>
            <p className="text-base sm:text-lg text-gray-600 leading-relaxed font-normal">
              {t.testimonialsDesc}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {t.testis.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-50/70 hover:bg-white rounded-xl p-8 border border-gray-200/80 hover:border-[#531FFF]/30 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-1 text-amber-400 mb-5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed font-medium italic mb-6">
                    "{item.quote}"
                  </p>
                </div>

                <div className="pt-5 border-t border-gray-200/80 space-y-1">
                  <p className="text-sm font-extrabold text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500 font-medium">{item.role}</p>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[10px] text-gray-400 font-semibold">{item.school}</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                      {item.metric}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── 8. SECTION PRICING & FAQ ── */}
      <PricingFaq lang={lang} />

      {/* ── 9. FINAL HIGH-CONVERTING CTA BANNER ── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto rounded-2xl bg-gradient-to-br from-[#531FFF] via-[#4812d4] to-[#1E085A] p-10 sm:p-14 md:p-16 text-white text-center shadow-[0_30px_90px_-20px_rgba(83,31,255,0.4)] relative overflow-hidden">
          {/* Subtle light orb in corner */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto space-y-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/15 text-purple-200 text-xs font-bold uppercase tracking-wider border border-white/20">
              <Zap className="w-3.5 h-3.5 text-amber-300" /> Transformasi Digital Sekolah
            </span>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.14]">
              {t.ctaTitle}
            </h2>

            <p className="text-base sm:text-lg text-purple-100 font-normal leading-relaxed">
              {t.ctaDesc}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-white text-[#531FFF] text-sm font-extrabold hover:bg-slate-50 transition-all shadow-md shadow-black/15"
              >
                <span>{t.ctaBtn1}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="https://wa.me/6281234567890"
                target="_blank"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-extrabold border border-white/25 transition-all"
              >
                <span>{t.ctaBtn2}</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>

            <p className="text-xs text-purple-200 font-medium pt-2">
              {t.ctaSub}
            </p>
          </div>
        </div>
      </section>

      {/* Global Footer */}
      <LandingFooter lang={lang} />
    </div>
  );
}
