"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  ArrowRight, CheckCircle2, Star,
  Zap, ArrowUpRight, Play
} from "lucide-react";
import LandingNavbar from "@/components/landing/navbar";
import LandingFooter from "@/components/landing/footer";
import BentoFeatures from "@/components/landing/bento-features";
import TrustedSchools from "@/components/landing/trusted-schools";
import PersonaShowcase from "@/components/landing/persona-showcase";
import PricingFaq from "@/components/landing/pricing-faq";

export default function LandingPage() {
  const [lang, setLang] = useState<"id" | "en">("id");

  useEffect(() => {
    const saved = localStorage.getItem("qs_lang") as "id" | "en";
    if (saved === "id" || saved === "en") setLang(saved);

    const onLangChange = () => {
      const updated = localStorage.getItem("qs_lang") as "id" | "en";
      if (updated === "id" || updated === "en") setLang(updated);
    };
    window.addEventListener("qs_lang_change", onLangChange);
    return () => window.removeEventListener("qs_lang_change", onLangChange);
  }, []);

  const changeLang = (l: "id" | "en") => {
    setLang(l);
    localStorage.setItem("qs_lang", l);
    window.dispatchEvent(new Event("qs_lang_change"));
  };

  const t = {
    id: {
      avatarBadge: "Dipercaya 500+ Sekolah & Yayasan · Rating 4.9 ★",
      heroH1a: "Satu Sistem Operasi",
      heroH1b: "untuk Sekolah Modern.",
      heroDesc: "Platform cerdas untuk mengelola presensi GPS geofence, kurikulum merdeka, rekonsiliasi SPP otomatis, dan 5 portal peran secara real-time tanpa kerumitan teknis.",
      heroCta1: "Mulai Uji Coba Gratis",
      heroCta2: "Jadwalkan Demo Sistem",
      heroTrust1: "14 Hari Gratis Penuh",
      heroTrust2: "Tanpa Kartu Kredit",
      heroTrust3: "Setup Mandiri < 24 Jam",
      statSchools: "Sekolah Terdaftar",
      statSchoolsVal: "500+",
      statAttend: "Presensi Geofence Tepat Waktu",
      statAttendVal: "98.7%",
      statFinance: "Otomasi Rekonsiliasi SPP",
      statFinanceVal: "100%",
      statUptime: "Cloud SLA Uptime",
      statUptimeVal: "99.9%",
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
      ctaBadge: "TRANSFORMASI DIGITAL SEKOLAH",
      ctaTitle: "Siap Membawa Sekolah Anda ke Standar Digital Modern?",
      ctaDesc: "Bergabunglah bersama 500+ institusi pendidikan unggulan di seluruh Indonesia. Mulai uji coba gratis 14 hari dengan pendampingan langsung oleh tim ahli kami.",
      ctaBtn1: "Daftar Akun Sekolah — Gratis",
      ctaBtn2: "Konsultasi Tim Onboarding",
      ctaSub: "Tanpa instalasi server lokal · Data tersimpan aman di Google Cloud · Uji coba gratis 14 hari"
    },
    en: {
      avatarBadge: "Trusted by 500+ Schools & Trusts · 4.9 ★ Rating",
      heroH1a: "One Operating System",
      heroH1b: "for Modern Schools.",
      heroDesc: "An all-in-one cloud platform uniting GPS geofenced attendance, competency report cards, automated tuition reconciliation, and 5 dedicated user portals in real-time.",
      heroCta1: "Start 14-Day Free Trial",
      heroCta2: "Schedule Live Demo",
      heroTrust1: "14-Day Full Free Trial",
      heroTrust2: "No Credit Card Required",
      heroTrust3: "Instant Setup in < 24 Hours",
      statSchools: "Registered Schools",
      statSchoolsVal: "500+",
      statAttend: "On-Time GPS Attendance",
      statAttendVal: "98.7%",
      statFinance: "Tuition Auto-Reconciliation",
      statFinanceVal: "100%",
      statUptime: "Cloud SLA Uptime",
      statUptimeVal: "99.9%",
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
      ctaBadge: "DIGITAL SCHOOL TRANSFORMATION",
      ctaTitle: "Ready to Elevate Your School to Modern Standards?",
      ctaDesc: "Join 500+ premier educational institutions across Indonesia. Start your 14-day free trial with personal guidance from our onboarding specialists.",
      ctaBtn1: "Register School Account — Free",
      ctaBtn2: "Talk to Onboarding Specialist",
      ctaSub: "Zero local hardware required · Enterprise data security on Google Cloud · Free 14-day trial"
    }
  }[lang];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-[#531FFF]/15 selection:text-[#531FFF] overflow-x-hidden">
      {/* ── 1. GLOBAL NAVBAR ── */}
      <LandingNavbar lang={lang} onChangeLang={changeLang} />

      {/* ── 2. HERO SECTION: Clean, Minimalist, Centered with Rich Primary Ambient Glow ── */}
      <section className="relative pt-36 pb-20 md:pt-44 md:pb-24 overflow-hidden bg-gradient-to-b from-white via-slate-50/40 to-white">
        
        {/* Layer 1: Grand Central Primary Glow (#531FFF) */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[850px] sm:w-[1000px] h-[520px] bg-gradient-to-b from-[#531FFF]/22 via-[#7C3AED]/18 to-transparent rounded-full blur-[130px] pointer-events-none -z-0" />

        {/* Layer 2: Top-Left Floating Indigo Accent */}
        <div className="absolute -top-12 -left-20 w-[520px] h-[420px] bg-gradient-to-br from-[#531FFF]/20 via-[#6366F1]/15 to-transparent rounded-full blur-[110px] pointer-events-none -z-0" />

        {/* Layer 3: Top-Right Floating Violet/Fuchsia Accent */}
        <div className="absolute -top-8 -right-20 w-[550px] h-[440px] bg-gradient-to-bl from-[#7C3AED]/22 via-[#9333EA]/14 to-transparent rounded-full blur-[110px] pointer-events-none -z-0" />

        {/* Layer 4: Subtle Interactive Ambient Mesh Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#531FFF_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.06] [mask-image:radial-gradient(ellipse_70%_55%_at_50%_35%,#000_60%,transparent_100%)] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 relative z-10 text-center">
          
          {/* Centered Social Proof Pill Badge */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/90 backdrop-blur-md border border-[#531FFF]/20 shadow-sm shadow-[#531FFF]/10 mb-8"
          >
            {/* 3 Overlapping Avatars */}
            <div className="flex -space-x-1.5 shrink-0">
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center text-[7px] font-black ring-2 ring-white">
                SR
              </div>
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#531FFF] to-indigo-400 text-white flex items-center justify-center text-[7px] font-black ring-2 ring-white">
                AF
              </div>
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 text-white flex items-center justify-center text-[7px] font-black ring-2 ring-white">
                DS
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-700 tracking-tight">
                {t.avatarBadge}
              </span>
            </div>
          </motion.div>

          {/* Main Hero Headline (Bold, Spacious, High Typographic Hierarchy) */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-[68px] font-black text-slate-900 tracking-tight leading-[1.08] max-w-4xl mx-auto mb-6"
          >
            {t.heroH1a} <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-[#531FFF] via-[#6366F1] to-[#7C3AED] bg-clip-text text-transparent">
              {t.heroH1b}
            </span>
          </motion.h1>

          {/* Subtitle: High clarity, uncluttered */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-lg md:text-xl text-slate-600 leading-relaxed font-normal max-w-2xl mx-auto mb-10"
          >
            {t.heroDesc}
          </motion.p>

          {/* Action Buttons: Minimalist Pill Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-4 mb-8"
          >
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#531FFF] text-white text-sm font-bold hover:bg-[#4314cc] transition-all shadow-lg shadow-[#531FFF]/30 hover:shadow-xl hover:shadow-[#531FFF]/40 active:scale-98 group"
            >
              <span>{t.heroCta1}</span>
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>

            <Link
              href="#fitur"
              className="inline-flex items-center gap-2 px-7 py-4 rounded-full bg-white hover:bg-slate-50 text-slate-800 text-sm font-bold border border-slate-200/90 shadow-2xs transition-all active:scale-98 group/demo"
            >
              <div className="w-5 h-5 rounded-full bg-[#531FFF]/10 flex items-center justify-center text-[#531FFF] group-hover/demo:scale-110 transition-transform shadow-2xs">
                <Play className="w-2.5 h-2.5 fill-[#531FFF] ml-0.5" />
              </div>
              <span>{t.heroCta2}</span>
            </Link>
          </motion.div>

          {/* Trust Points Row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs text-slate-500 font-medium"
          >
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{t.heroTrust1}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{t.heroTrust2}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{t.heroTrust3}</span>
            </div>
          </motion.div>

        </div>

        {/* ── Minimalist 4-Metric Ribbon with Ambient Primary Edge ── */}
        <div className="max-w-5xl mx-auto px-6 mt-16 md:mt-20 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-white via-white to-[#F8F6FF] border border-[#531FFF]/20 shadow-[0_15px_50px_-15px_rgba(83,31,255,0.12),0_2px_8px_rgba(83,31,255,0.04)]"
          >
            <div className="text-center p-3 border-r border-slate-200/60 last:border-none">
              <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">
                {t.statSchoolsVal}
              </p>
              <p className="text-xs text-slate-500 font-medium">
                {t.statSchools}
              </p>
            </div>

            <div className="text-center p-3 sm:border-r border-slate-200/60 last:border-none">
              <p className="text-2xl sm:text-3xl font-black text-[#531FFF] tracking-tight leading-none mb-1">
                {t.statAttendVal}
              </p>
              <p className="text-xs text-slate-500 font-medium">
                {t.statAttend}
              </p>
            </div>

            <div className="text-center p-3 border-r border-slate-200/60 last:border-none">
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight leading-none mb-1">
                {t.statFinanceVal}
              </p>
              <p className="text-xs text-slate-500 font-medium">
                {t.statFinance}
              </p>
            </div>

            <div className="text-center p-3">
              <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">
                {t.statUptimeVal}
              </p>
              <p className="text-xs text-slate-500 font-medium">
                {t.statUptime}
              </p>
            </div>
          </motion.div>
        </div>

      </section>

      {/* ── 3. TRUSTED SCHOOLS & LOGOS STRIP ── */}
      <TrustedSchools lang={lang} />

      {/* ── 4. BENTO GRID FEATURES: Layout Bento Minimalis ── */}
      <BentoFeatures lang={lang} />

      {/* ── 5. PERSONA SHOWCASE: Spesifik untuk Setiap Peran Sekolah ── */}
      <PersonaShowcase lang={lang} />

      {/* ── 6. TESTIMONIALS: Verified Educational Social Proof ── */}
      <section id="testimonials" className="py-20 md:py-28 bg-slate-50/50 border-t border-slate-100 relative">
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-[#531FFF] text-xs font-bold uppercase tracking-wider mb-4 shadow-2xs">
              <Star className="w-3.5 h-3.5 fill-[#531FFF] text-[#531FFF]" />
              {t.testimonialsBadge}
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-[1.12] mb-4">
              {t.testimonialsTitle}
            </h2>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
              {t.testimonialsDesc}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {t.testis.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                whileHover={{ y: -4 }}
                className="bg-white rounded-2xl p-7 sm:p-8 border border-slate-200/80 hover:border-[#531FFF]/30 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Terverifikasi
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium mb-6">
                    &ldquo;{item.quote}&rdquo;
                  </p>
                </div>

                <div className="pt-5 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500 font-medium">{item.role}</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">{item.school}</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/80">
                    {item.metric}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* ── 7. PRICING & FAQ ── */}
      <PricingFaq lang={lang} />

      {/* ── 8. FINAL HIGH-CONVERTING CTA BANNER (Light Theme with Rich Primary Ambient Glow) ── */}
      <section className="py-24 px-6 bg-slate-50/60 border-t border-slate-100 relative overflow-hidden">
        
        {/* Strong External Primary Ambient Aura behind the CTA Card */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[450px] bg-gradient-to-tr from-[#531FFF]/25 via-[#7C3AED]/20 to-indigo-300/15 rounded-full blur-[110px] pointer-events-none -z-0" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-6xl mx-auto rounded-3xl bg-gradient-to-b from-white via-white to-[#F6F3FF] border border-[#531FFF]/25 p-10 sm:p-14 md:p-16 text-slate-900 text-center shadow-[0_25px_80px_-15px_rgba(83,31,255,0.18),0_2px_10px_rgba(83,31,255,0.06)] relative overflow-hidden z-10"
        >
          {/* Internal Primary Ambient Lights */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-[#531FFF]/20 via-[#7C3AED]/10 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-72 h-72 bg-[#531FFF]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -top-16 -left-16 w-72 h-72 bg-[#7C3AED]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#531FFF]/10 text-[#531FFF] text-xs font-bold uppercase tracking-wider border border-[#531FFF]/25 shadow-xs shadow-[#531FFF]/10">
              <Zap className="w-3.5 h-3.5 text-[#531FFF]" /> {t.ctaBadge}
            </span>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-[1.12]">
              {lang === "id" ? (
                <>
                  Siap Membawa Sekolah Anda ke{" "}
                  <span className="bg-gradient-to-r from-[#531FFF] via-[#6366F1] to-[#7C3AED] bg-clip-text text-transparent">
                    Standar Digital Modern?
                  </span>
                </>
              ) : (
                <>
                  Ready to Elevate Your School to{" "}
                  <span className="bg-gradient-to-r from-[#531FFF] via-[#6366F1] to-[#7C3AED] bg-clip-text text-transparent">
                    Modern Standards?
                  </span>
                </>
              )}
            </h2>

            <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed">
              {t.ctaDesc}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#531FFF] text-white text-sm font-bold hover:bg-[#4314cc] transition-all shadow-lg shadow-[#531FFF]/30 hover:shadow-xl hover:shadow-[#531FFF]/40 active:scale-98 group"
              >
                <span>{t.ctaBtn1}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href="https://wa.me/6281234567890"
                target="_blank"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white hover:bg-slate-50 text-slate-800 text-sm font-bold border border-slate-200/90 shadow-2xs transition-all active:scale-98"
              >
                <span>{t.ctaBtn2}</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>

            <p className="text-xs text-slate-500 font-medium pt-2">
              {t.ctaSub}
            </p>
          </div>
        </motion.div>
      </section>

      {/* ── 9. GLOBAL FOOTER ── */}
      <LandingFooter lang={lang} />
    </div>
  );
}
