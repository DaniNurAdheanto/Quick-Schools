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
import HeroOrbit from "@/components/landing/hero-orbit";
import BentoFeatures from "@/components/landing/bento-features";
import TrustedSchools from "@/components/landing/trusted-schools";
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
      avatarBadge: "500+ Sekolah Terdaftar · Rating 4.9 ★",
      heroH1a: "Satu Sistem Operasi",
      heroH1b: "untuk Seluruh",
      heroH1c: "Ekosistem Sekolah.",
      heroDesc: "Platform terintegrasi untuk mengelola presensi geofence, kurikulum merdeka, rekonsiliasi SPP otomatis, dan 5 portal peran secara real-time.",
      heroCta1: "Mulai Uji Coba Gratis",
      heroCta2: "Lihat Demo Sistem",
      heroTrust1: "14 Hari Gratis",
      heroTrust2: "Tanpa Kartu Kredit",
      heroTrust3: "Setup < 24 Jam",
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
      avatarBadge: "500+ Registered Schools · 4.9 ★ Rating",
      heroH1a: "One Operating System",
      heroH1b: "for Your Entire",
      heroH1c: "School Ecosystem.",
      heroDesc: "An all-in-one platform managing GPS geofenced attendance, competency report cards, automated tuition reconciliation, and 5 dedicated user portals in real-time.",
      heroCta1: "Start Free Trial",
      heroCta2: "Watch Live Demo",
      heroTrust1: "14-Day Free Trial",
      heroTrust2: "No Credit Card Required",
      heroTrust3: "Setup in < 24 Hours",
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
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-[#531FFF]/15 selection:text-[#531FFF] overflow-x-hidden">
      {/* Global Navigation */}
      <LandingNavbar lang={lang} onChangeLang={changeLang} />

      {/* ── 1. HERO SECTION: Minimalist, Modern, Transix-Inspired Layout ── */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-gradient-to-b from-slate-50/70 via-white to-slate-50/40">
        
        {/* Subtle background technical grid mask (matching modern clean SaaS standards) */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35 pointer-events-none" />

        {/* Ambient Radial Color Glows */}
        <motion.div
          animate={{
            x: [0, 20, 0],
            y: [0, -15, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-12 right-1/4 w-[500px] h-[500px] bg-gradient-to-tr from-[#531FFF]/10 via-[#7C3AED]/6 to-transparent rounded-full blur-[100px] pointer-events-none -z-0"
        />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          
          {/* Top Row: Clean 2-Column Split (Headline & Value on Left, Radial Orbit on Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Bold Minimalist Headline & Direct CTAs */}
            <div className="lg:col-span-7 space-y-6 text-left">
              
              {/* Transix-Style Social Proof Avatar Stack Pill */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-white border border-slate-200/90 shadow-2xs"
              >
                {/* 3 Overlapping Avatars */}
                <div className="flex -space-x-1.5 shrink-0">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center text-[8px] font-black ring-2 ring-white shadow-2xs">
                    SR
                  </div>
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#531FFF] to-indigo-400 text-white flex items-center justify-center text-[8px] font-black ring-2 ring-white shadow-2xs">
                    AF
                  </div>
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 text-white flex items-center justify-center text-[8px] font-black ring-2 ring-white shadow-2xs">
                    DS
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-slate-700 tracking-tight">
                    {t.avatarBadge}
                  </span>
                </div>
              </motion.div>

              {/* Main Heading: Confident, Spacious, Clean */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-4xl sm:text-5xl md:text-[56px] font-black text-slate-900 tracking-tight leading-[1.1] max-w-2xl"
              >
                {t.heroH1a} <br />
                {t.heroH1b} <br />
                <span className="text-[#531FFF]">{t.heroH1c}</span>
              </motion.h1>

              {/* Subtitle: High legibility, uncluttered */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal max-w-xl"
              >
                {t.heroDesc}
              </motion.p>

              {/* Action Buttons: Pill-shaped like Transix & Burak with ArrowUpRight */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-wrap items-center gap-3.5 pt-1"
              >
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-7 sm:px-8 py-3.5 rounded-full bg-[#531FFF] text-white text-sm font-bold hover:bg-[#4314cc] transition-all shadow-md shadow-[#531FFF]/25 hover:shadow-lg hover:shadow-[#531FFF]/35 active:scale-98 group"
                >
                  <span>{t.heroCta1}</span>
                  <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Link>

                <Link
                  href="#fitur"
                  className="inline-flex items-center gap-2 px-6 sm:px-7 py-3.5 rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-sm font-bold transition-all active:scale-98 group/demo"
                >
                  <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[#531FFF] group-hover/demo:scale-110 transition-transform shadow-2xs">
                    <Play className="w-2.5 h-2.5 fill-[#531FFF] ml-0.5" />
                  </div>
                  <span>{t.heroCta2}</span>
                </Link>
              </motion.div>

              {/* Trust Checkmarks Row */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs text-slate-500 font-medium pt-2"
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

            {/* Right Column: Transix-Inspired Radial Orbit & Key Metrics Centerpiece */}
            <div className="lg:col-span-5 flex items-center justify-center">
              <HeroOrbit lang={lang} />
            </div>

          </div>

        </div>
      </section>

      {/* ── 3. BENTO GRID FEATURES: Layout Bento Minimalis with Motion ── */}
      <BentoFeatures lang={lang} />

      {/* ── 4. TRUSTED BY / SOCIAL PROOF STRIP (Logos Only) ── */}
      <TrustedSchools lang={lang} />

      {/* ── 5. SECTION PRICING & FAQ ── */}
      <PricingFaq lang={lang} />

      {/* ── 6. SECTION TESTIMONIALS: Verified Educational Social Proof ── */}
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

      {/* ── 7. FINAL HIGH-CONVERTING CTA BANNER with Gentle Ambient Glow ── */}
      <section className="py-20 px-6 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-6xl mx-auto rounded-3xl bg-[#0B0F19] border border-slate-800 p-10 sm:p-14 md:p-16 text-white text-center shadow-2xl relative overflow-hidden"
        >
          {/* Animated subtle ambient breathing lighting */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-0 right-0 w-80 h-80 bg-[#531FFF]/25 rounded-full blur-3xl pointer-events-none"
          />
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl pointer-events-none"
          />

          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-purple-200 text-xs font-bold uppercase tracking-wider border border-white/15">
              <Zap className="w-3.5 h-3.5 text-amber-300" /> Transformasi Digital Sekolah
            </span>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.14]">
              {t.ctaTitle}
            </h2>

            <p className="text-sm sm:text-base text-slate-300 font-normal leading-relaxed">
              {t.ctaDesc}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-slate-900 text-sm font-extrabold hover:bg-slate-100 transition-all shadow-md active:scale-98"
              >
                <span>{t.ctaBtn1}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="https://wa.me/6281234567890"
                target="_blank"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-semibold border border-white/20 transition-all active:scale-98"
              >
                <span>{t.ctaBtn2}</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>

            <p className="text-xs text-slate-400 font-medium pt-2">
              {t.ctaSub}
            </p>
          </div>
        </motion.div>
      </section>

      {/* Global Footer */}
      <LandingFooter lang={lang} />
    </div>
  );
}
