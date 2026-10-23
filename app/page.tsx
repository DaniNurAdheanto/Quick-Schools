"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  ArrowRight, CheckCircle2, Star,
  Zap, ArrowUpRight, Building2, Play,
  Users, Cloud
} from "lucide-react";
import LandingNavbar from "@/components/landing/navbar";
import LandingFooter from "@/components/landing/footer";
import HeroCanvas from "@/components/landing/hero-canvas";
import BentoFeatures from "@/components/landing/bento-features";
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
      heroBadge: "Sistem Operasi Sekolah Modern",
      heroH1a: "Satu Sistem Operasi",
      heroH1b: "untuk Seluruh",
      heroH1c: "Ekosistem Sekolah.",
      heroDesc: "Platform cerdas terintegrasi untuk mengelola presensi geofence, penilaian Kurikulum Merdeka, administrasi SPP otomatis, dan komunikasi 5 portal peran secara real-time.",
      heroCta1: "Mulai Uji Coba Gratis",
      heroCta2: "Lihat Demo",
      heroTrust1: "Aktif digunakan 500+ sekolah",
      heroTrust2: "Tanpa kartu kredit",
      heroTrust3: "Onboarding didampingi",
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
      heroH1a: "One Operating System",
      heroH1b: "for Your Entire",
      heroH1c: "School Ecosystem.",
      heroDesc: "An integrated intelligence platform managing GPS geofenced attendance, competency-based report cards, automated tuition billing, and 5 dedicated stakeholder portals in real-time.",
      heroCta1: "Start Free Trial",
      heroCta2: "Watch Demo",
      heroTrust1: "Used by 500+ schools",
      heroTrust2: "No credit card required",
      heroTrust3: "Guided onboarding",
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

      {/* ── 1. HERO SECTION: Minimalist 2-Column Showcase with Animated Flourishes ── */}
      <section className="relative pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden bg-white">
        {/* Animated subtle floating background ambient orbs */}
        <motion.div
          animate={{
            x: [0, 20, 0],
            y: [0, -15, 0],
            scale: [1, 1.06, 1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-b from-[#531FFF]/8 via-[#7B4DFF]/5 to-transparent rounded-full blur-[100px] pointer-events-none -z-0"
        />
        <motion.div
          animate={{
            x: [0, -15, 0],
            y: [0, 15, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-1/3 left-0 w-[450px] h-[450px] bg-[#531FFF]/4 rounded-full blur-[90px] pointer-events-none -z-0"
        />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
            
            {/* Left Column: Staggered Entrance Animations */}
            <div className="lg:col-span-6 space-y-6 text-left">
              
              {/* Dynamic Status Pill */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F3F0FF] border border-[#531FFF]/20 text-[#531FFF] shadow-2xs"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#531FFF] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#531FFF]"></span>
                </span>
                <span className="text-xs font-bold tracking-wide">
                  {t.heroBadge}
                </span>
              </motion.div>

              {/* Main Heading */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-4xl sm:text-5xl md:text-[54px] font-black text-slate-900 tracking-tight leading-[1.12]"
              >
                {t.heroH1a} <br />
                {t.heroH1b} <br />
                <span className="text-[#531FFF]">{t.heroH1c}</span>
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal max-w-xl"
              >
                {t.heroDesc}
              </motion.p>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-wrap items-center gap-3.5 pt-1"
              >
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-6 sm:px-7 py-3.5 rounded-xl bg-[#531FFF] text-white text-sm font-bold hover:bg-[#4314cc] transition-all shadow-md shadow-[#531FFF]/25 hover:shadow-lg hover:shadow-[#531FFF]/35 active:scale-98 group"
                >
                  <span>{t.heroCta1}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  href="#fitur"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-800 text-sm font-bold hover:bg-slate-100 transition-all active:scale-98 group/demo"
                >
                  <div className="w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[#531FFF] group-hover/demo:scale-110 transition-transform">
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
                className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs text-slate-600 font-medium pt-2"
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

            {/* Right Column: Live SaaS Application Dashboard Mockup */}
            <div className="lg:col-span-6">
              <HeroCanvas lang={lang} />
            </div>

          </div>
        </div>
      </section>

      {/* ── 2. METRICS / STATS RIBBON: Animated Horizontal Bar ── */}
      <section className="border-y border-slate-100 bg-white py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-4 px-2 sm:px-4 py-2 cursor-default group"
            >
              <div className="w-12 h-12 rounded-full bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-[#531FFF]/15 transition-all">
                <Building2 className="w-6 h-6 text-[#531FFF]" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{t.statSchoolsVal}</p>
                <p className="text-xs text-slate-500 font-medium">{t.statSchools}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2, delay: 0.05 }}
              className="flex items-center gap-4 px-2 sm:px-4 py-2 pt-4 md:pt-2 cursor-default group"
            >
              <div className="w-12 h-12 rounded-full bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-[#531FFF]/15 transition-all">
                <Users className="w-6 h-6 text-[#531FFF]" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{t.statAttendVal}</p>
                <p className="text-xs text-slate-500 font-medium">{t.statAttend}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className="flex items-center gap-4 px-2 sm:px-4 py-2 pt-4 md:pt-2 cursor-default group"
            >
              <div className="w-12 h-12 rounded-full bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-[#531FFF]/15 transition-all">
                <Cloud className="w-6 h-6 text-[#531FFF]" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{t.statUptimeVal}</p>
                <p className="text-xs text-slate-500 font-medium">{t.statUptime}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2, delay: 0.15 }}
              className="flex items-center gap-4 px-2 sm:px-4 py-2 pt-4 md:pt-2 cursor-default group"
            >
              <div className="w-12 h-12 rounded-full bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-[#531FFF]/15 transition-all">
                <Zap className="w-6 h-6 text-[#531FFF]" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{t.statSetupVal}</p>
                <p className="text-xs text-slate-500 font-medium">{t.statSetup}</p>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── 3. BENTO GRID FEATURES: Layout Bento Minimalis with Motion ── */}
      <BentoFeatures lang={lang} />

      {/* ── 4. TRUSTED BY / SOCIAL PROOF STRIP with Hover Lift ── */}
      <section className="py-12 bg-slate-50/70 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6">
            {t.trustedTitle}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {[
              { name: "SMA Labschool Jakarta", badge: "DKI Jakarta" },
              { name: "BINUS School Serpong", badge: "Tangerang" },
              { name: "Yayasan Al-Azhar Indonesia", badge: "Pusat" },
              { name: "Global Jaya International", badge: "Bintaro" },
              { name: "SMA Tarakanita 1", badge: "Jakarta" },
              { name: "Sekolah Pelita Harapan", badge: "Karawaci" }
            ].map((school, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.03, y: -2 }}
                transition={{ duration: 0.2 }}
                className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-[#531FFF]/30 hover:shadow-xs transition-all group cursor-default"
              >
                <div className="w-5 h-5 rounded-md bg-slate-100 group-hover:bg-[#531FFF]/10 flex items-center justify-center transition-colors">
                  <Building2 className="w-3 h-3 text-slate-500 group-hover:text-[#531FFF] transition-colors" />
                </div>
                <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
                  {school.name}
                </span>
                <span className="text-[10px] text-slate-400 font-medium px-1.5 py-0.5 rounded bg-slate-50 border border-slate-100">
                  {school.badge}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

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
