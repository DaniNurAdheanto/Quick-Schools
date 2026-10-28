"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  Check, ArrowRight, HelpCircle, ChevronDown, Zap,
  Sparkles, Building2, ShieldCheck, Headphones, RefreshCw,
  GraduationCap, CheckCircle2, MessageCircle
} from "lucide-react";

interface PricingFaqProps {
  lang: "id" | "en";
}

export default function PricingFaq({ lang }: PricingFaqProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const t = {
    id: {
      badge: "INVESTASI & BIAYA",
      title: "Transparan, Terjangkau & Tanpa Biaya Tersembunyi",
      desc: "Pilih paket investasi yang sesuai dengan skala sekolah Anda. Seluruh paket sudah termasuk bantuan migrasi data dan pendampingan implementasi gratis.",
      monthly: "Tagihan Bulanan",
      annual: "Tagihan Tahunan",
      discountBadge: "Hemat 20%",
      popularBadge: "Paling Banyak Dipilih",
      plans: [
        {
          id: "starter",
          name: "Perintis (Starter)",
          target: "Sekolah Perintis / TK & SD Baru",
          desc: "Solusi tepat bagi sekolah yang ingin memulai digitalisasi manajemen tanpa beban biaya.",
          priceMonthly: "Gratis",
          priceAnnual: "Gratis",
          unit: "selamanya",
          buttonText: "Mulai Gratis Sekarang",
          buttonLink: "/register-school?plan=trial",
          popular: false,
          icon: GraduationCap,
          highlight: false,
          features: [
            "Hingga 150 Siswa Aktif",
            "Presensi GPS Standard Sekolah",
            "Manajemen Data Siswa & Pengajar",
            "Jadwal Pelajaran & Kalender Akademik",
            "Laporan Kehadiran Bulanan Otomatis",
            "Dukungan Komunitas & Email"
          ]
        },
        {
          id: "pro",
          name: "Sekolah Unggulan (Pro)",
          target: "SD, SMP, & SMA Unggulan",
          desc: "Paket lengkap dengan otomasi menyeluruh untuk sekolah modern yang mengutamakan kecepatan & transparansi.",
          priceMonthly: "Rp 249.000",
          priceAnnual: "Rp 199.000",
          unit: "/ bulan (dibayar tahunan)",
          savings: "Hemat Rp 600.000/tahun",
          buttonText: "Daftar Paket Pro",
          buttonLink: "/register-school?plan=pro",
          popular: true,
          icon: Zap,
          highlight: true,
          features: [
            "Hingga 1.200 Siswa Aktif",
            "Presensi Geofence + Proteksi Anti-Fake GPS",
            "Otomasi Rapor Kurikulum Merdeka (TP)",
            "Penagihan SPP Otomatis + Virtual Account",
            "Laporan Keuangan & Arus Kas Lengkap",
            "Broadcast Pengumuman Multi-Target",
            "Notifikasi Otomatis ke WhatsApp Orang Tua",
            "Dukungan Prioritas WhatsApp 24/7"
          ]
        },
        {
          id: "enterprise",
          name: "Yayasan / Multi-Kampus",
          target: "Yayasan Pendidikan & Multi-Cabang",
          desc: "Tata kelola terpusat lintas sekolah dengan keamanan korporasi dan pendampingan khusus.",
          priceMonthly: "Kustom",
          priceAnnual: "Kustom",
          unit: "disesuaikan kebutuhan",
          buttonText: "Daftar / Konsultasi Enterprise",
          buttonLink: "/register-school?plan=enterprise",
          popular: false,
          icon: Building2,
          highlight: false,
          features: [
            "Kapasitas Siswa Tanpa Batas",
            "Multi-Sekolah & Dashboard Konsolidasi Yayasan",
            "Integrasi API & Sinkronisasi Dapodik Kustom",
            "Dedicated Account Manager & Workshop Staf",
            "Perjanjian Layanan (SLA 99.9% Uptime)",
            "Migrasi Basis Data Berkelanjutan Didampingi Ahli"
          ]
        }
      ],
      guarantees: [
        {
          icon: ShieldCheck,
          title: "Keamanan Cloud Terenkripsi",
          desc: "AES-256 & TLS 1.3 berstandar perbankan di Google Cloud"
        },
        {
          icon: Headphones,
          title: "Setup & Onboarding Gratis",
          desc: "Didampingi tim teknis hingga sistem 100% siap digunakan"
        },
        {
          icon: RefreshCw,
          title: "Migrasi Data Excel & Dapodik",
          desc: "Bantuan import seluruh data siswa dan guru tanpa ribet"
        },
        {
          icon: CheckCircle2,
          title: "Tanpa Kontrak Mengikat",
          desc: "Bebas upgrade, downgrade, atau batalkan kapan saja"
        }
      ],
      faqBadge: "TANYA JAWAB (FAQ)",
      faqTitle: "Pertanyaan yang Sering Diajukan",
      faqDesc: "Segala hal yang perlu Anda ketahui mengenai implementasi Quick Schools di institusi Anda.",
      faqContactTitle: "Masih memiliki pertanyaan spesifik?",
      faqContactAction: "Chat dengan Tim Support WhatsApp",
      faqs: [
        {
          q: "Apakah data siswa dan keuangan sekolah kami dijamin aman?",
          a: "Sangat aman. Quick Schools dibangun di atas infrastruktur Google Cloud & Firebase dengan enkripsi tingkat perbankan (AES-256 dan TLS 1.3). Kami menerapkan isolasi basis data multi-tenant dan backup otomatis berkala, sehingga data sekolah Anda tidak dapat diakses pihak lain."
        },
        {
          q: "Bagaimana jika sekolah kami belum memiliki server fisik atau staf IT khusus?",
          a: "Quick Schools adalah sistem berbasis Cloud SaaS. Sekolah Anda sama sekali tidak memerlukan server fisik, instalasi lokal, ataupun teknisi IT khusus. Seluruh sistem dapat diakses langsung melalui browser di laptop atau smartphone guru."
        },
        {
          q: "Apakah sistem rapor sudah sesuai dengan panduan Kurikulum Merdeka Kemdikbud?",
          a: "Ya, 100% kompatibel. Sistem penilaian kami mendukung input Tujuan Pembelajaran (TP), asesmen formatif, sumatif, serta perumusan narasi capaian kompetensi otomatis yang siap diunduh dan dicetak sesuai format baku rapor Kurikulum Merdeka."
        },
        {
          q: "Bagaimana cara memindahkan data siswa lama kami dari Excel atau Dapodik?",
          a: "Sangat mudah. Anda hanya perlu mengekspor data siswa, guru, dan rombel kelas ke format Excel/CSV standar, lalu gunakan fitur Smart Importer Quick Schools. Tim support kami juga siap membantu proses migrasi data Anda secara gratis."
        },
        {
          q: "Apakah orang tua siswa harus membayar biaya langganan tambahan?",
          a: "Tidak sama sekali. Portal orang tua siswa dapat diakses 100% gratis oleh seluruh wali murid untuk memantau absensi anak, riwayat SPP, dan mengunduh rapor digital."
        }
      ]
    },
    en: {
      badge: "INVESTMENT & PRICING",
      title: "Transparent, Affordable & Zero Hidden Fees",
      desc: "Select the optimal investment plan for your school's scale. Every package includes complimentary data migration and guided staff onboarding.",
      monthly: "Monthly Billing",
      annual: "Annual Billing",
      discountBadge: "Save 20%",
      popularBadge: "Most Popular",
      plans: [
        {
          id: "starter",
          name: "Starter School",
          target: "Early Stage / Small Schools",
          desc: "The ideal gateway for educational institutions starting their digital journey at zero cost.",
          priceMonthly: "Free",
          priceAnnual: "Free",
          unit: "forever",
          buttonText: "Start Free Today",
          buttonLink: "/register-school?plan=trial",
          popular: false,
          icon: GraduationCap,
          highlight: false,
          features: [
            "Up to 150 Active Students",
            "Standard GPS Campus Attendance",
            "Student & Faculty Directory",
            "Class Schedules & Academic Calendar",
            "Automated Monthly Attendance Reports",
            "Community & Email Support"
          ]
        },
        {
          id: "pro",
          name: "Excellence (Pro)",
          target: "Top Primary & Secondary Schools",
          desc: "Complete end-to-end automation suite for modern institutions that prioritize speed & transparency.",
          priceMonthly: "Rp 249,000",
          priceAnnual: "Rp 199,000",
          unit: "/ month (billed annually)",
          savings: "Save Rp 600,000/year",
          buttonText: "Register Pro Plan",
          buttonLink: "/register-school?plan=pro",
          popular: true,
          icon: Zap,
          highlight: true,
          features: [
            "Up to 1,200 Active Students",
            "Geofence GPS + Anti-Spoof Protection",
            "Merdeka Curriculum Automated Report Cards",
            "Automated Tuition Billing + Virtual Accounts",
            "Full Accounting & Cashflow Ledgers",
            "Segmented Multi-Target Broadcasts",
            "Automated WhatsApp Alerts to Parents",
            "24/7 Dedicated Priority Support"
          ]
        },
        {
          id: "enterprise",
          name: "Foundation / Multi-Campus",
          target: "Multi-Campus Educational Trusts",
          desc: "Centralized governance across campus branches with enterprise-grade security and tailored onboarding.",
          priceMonthly: "Custom",
          priceAnnual: "Custom",
          unit: "tailored scope",
          buttonText: "Register / Consult Enterprise",
          buttonLink: "/register-school?plan=enterprise",
          popular: false,
          icon: Building2,
          highlight: false,
          features: [
            "Unlimited Student Capacity",
            "Multi-Campus Centralized Foundation Dashboard",
            "Custom API Integrations & Dapodik Sync",
            "Dedicated Account Manager & Staff Workshops",
            "99.9% Uptime Service Level Agreement (SLA)",
            "Guided High-Volume Historical Data Migration"
          ]
        }
      ],
      guarantees: [
        {
          icon: ShieldCheck,
          title: "Bank-Grade Encryption",
          desc: "AES-256 & TLS 1.3 cloud security on Google Cloud"
        },
        {
          icon: Headphones,
          title: "Free Guided Onboarding",
          desc: "Hands-on implementation until fully deployed"
        },
        {
          icon: RefreshCw,
          title: "Assisted Data Migration",
          desc: "Hassle-free import from Excel and student registers"
        },
        {
          icon: CheckCircle2,
          title: "Zero Locked-In Contracts",
          desc: "Flexibility to upgrade, downgrade, or cancel anytime"
        }
      ],
      faqBadge: "FREQUENTLY ASKED QUESTIONS",
      faqTitle: "Common Questions & Clarifications",
      faqDesc: "Everything you need to know before adopting Quick Schools at your institution.",
      faqContactTitle: "Have a specific operational question?",
      faqContactAction: "Chat with Our WhatsApp Support Team",
      faqs: [
        {
          q: "Is our school's student and financial data secure?",
          a: "Extremely secure. Quick Schools is built on Google Cloud & Firebase with banking-grade encryption (AES-256 and TLS 1.3). Multi-tenant isolation guarantees your school's records are completely safeguarded."
        },
        {
          q: "What if our school doesn't have on-premise servers or dedicated IT staff?",
          a: "Quick Schools is a modern Cloud SaaS. You need zero local servers, zero installations, and zero on-site engineers. Everything is accessed through any standard browser on laptops or smartphones."
        },
        {
          q: "Are report cards compliant with official Merdeka Curriculum standards?",
          a: "Yes, 100% compliant. Our assessment engine handles Learning Objectives (TP), formative assessments, summative scores, and generates official descriptive narratives ready to print."
        },
        {
          q: "How easily can we migrate existing student records from Excel or Dapodik?",
          a: "Effortlessly. Export your existing student and teacher lists to Excel/CSV, and our Smart Importer will ingest them. Our onboarding specialists are also available to handle the migration for free."
        },
        {
          q: "Do parents need to pay an extra subscription fee?",
          a: "No, never. The parent and guardian portal is 100% free for all families to monitor attendance, view tuition invoices, and download report cards."
        }
      ]
    }
  }[lang];

  return (
    <section id="pricing" className="py-24 md:py-32 bg-white relative overflow-hidden">
      {/* Subtle Ambient Primary Glow */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[720px] h-[340px] bg-[#531FFF]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -left-40 w-96 h-96 bg-[#531FFF]/3 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-2/3 -right-40 w-96 h-96 bg-[#531FFF]/3 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* ── Section Header ── */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#531FFF]/10 border border-[#531FFF]/20 text-[#531FFF] text-xs font-black uppercase tracking-wider mb-4 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-[#531FFF]" />
            <span>{t.badge}</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-[1.12] mb-5">
            {t.title}
          </h2>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal mb-8">
            {t.desc}
          </p>

          {/* ── Segmented Billing Cycle Toggle ── */}
          <div className="inline-flex items-center p-1.5 bg-slate-100 rounded-full border border-slate-200/90 shadow-inner">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`relative px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 ${
                billingCycle === "monthly"
                  ? "text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {billingCycle === "monthly" && (
                <motion.div
                  layoutId="billingCyclePill"
                  className="absolute inset-0 bg-white rounded-full shadow-xs"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10">{t.monthly}</span>
            </button>

            <button
              onClick={() => setBillingCycle("annual")}
              className={`relative flex items-center gap-2 px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 ${
                billingCycle === "annual"
                  ? "text-white"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {billingCycle === "annual" && (
                <motion.div
                  layoutId="billingCyclePill"
                  className="absolute inset-0 bg-[#531FFF] rounded-full shadow-md shadow-[#531FFF]/25"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10">{t.annual}</span>
              <span
                className={`relative z-10 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full transition-colors ${
                  billingCycle === "annual"
                    ? "bg-white/20 text-white"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {t.discountBadge}
              </span>
            </button>
          </div>
        </div>

        {/* ── Pricing Cards Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto mb-16">
          {t.plans.map((plan) => {
            const isPopular = plan.popular;
            const price = billingCycle === "annual" ? plan.priceAnnual : plan.priceMonthly;
            const PlanIcon = plan.icon;

            return (
              <motion.div
                key={plan.id}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.25 }}
                className={`rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 relative bg-white ${
                  isPopular
                    ? "border-2 border-[#531FFF] shadow-2xl shadow-[#531FFF]/12 lg:-translate-y-2 ring-4 ring-[#531FFF]/10"
                    : "border border-slate-200/90 hover:border-slate-300 shadow-sm hover:shadow-lg"
                }`}
              >
                {/* Popular Highlight Tag */}
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#531FFF] to-[#7B4DFF] text-white text-[11px] font-extrabold uppercase tracking-wider px-4 py-1 rounded-full shadow-md shadow-[#531FFF]/30 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    <span>{t.popularBadge}</span>
                  </div>
                )}

                <div>
                  {/* Card Header & Tier Badge */}
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold tracking-wider uppercase px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 inline-block">
                        {plan.target}
                      </span>
                      <h3 className="text-2xl font-black tracking-tight text-slate-900 pt-1">
                        {plan.name}
                      </h3>
                    </div>
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                        isPopular
                          ? "bg-[#531FFF]/10 text-[#531FFF]"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      <PlanIcon className="w-5 h-5" strokeWidth={2.2} />
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal min-h-[38px] mb-6">
                    {plan.desc}
                  </p>

                  {/* Price Block */}
                  <div className="mb-7 pb-6 border-b border-slate-100">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                        {price}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">
                        {plan.unit}
                      </span>
                    </div>

                    {isPopular && billingCycle === "annual" && plan.savings && (
                      <p className="text-[11px] font-bold text-emerald-600 mt-2 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{plan.savings}</span>
                      </p>
                    )}
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-3 mb-8">
                    <p className="text-[11px] font-extrabold tracking-wider text-slate-400 uppercase">
                      {lang === "id" ? "Fitur Termasuk:" : "Included Features:"}
                    </p>
                    <ul className="space-y-3">
                      {plan.features.map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-2.5">
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                              isPopular
                                ? "bg-[#531FFF]/15 text-[#531FFF]"
                                : "bg-emerald-50 text-emerald-600 border border-emerald-200/60"
                            }`}
                          >
                            <Check className="w-2.5 h-2.5" strokeWidth={3} />
                          </div>
                          <span className="text-xs font-medium leading-tight text-slate-700">
                            {feat}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* CTA Action Button */}
                <Link
                  href={plan.buttonLink}
                  className={`w-full py-3.5 px-6 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 ${
                    isPopular
                      ? "bg-[#531FFF] text-white hover:bg-[#4314cc] shadow-md shadow-[#531FFF]/25 hover:shadow-lg hover:shadow-[#531FFF]/30"
                      : "bg-slate-900 text-white hover:bg-slate-800 shadow-xs"
                  }`}
                >
                  <span>{plan.buttonText}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* ── Value & Trust Reassurance Bar ── */}
        <div className="max-w-6xl mx-auto mb-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6 sm:p-8 rounded-3xl bg-slate-50 border border-slate-200/80 shadow-2xs">
            {t.guarantees.map((item, gIdx) => {
              const GIcon = item.icon;
              return (
                <div key={gIdx} className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center shrink-0 shadow-2xs text-[#531FFF]">
                    <GIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Section FAQ ── */}
        <div id="faq" className="max-w-4xl mx-auto pt-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#531FFF]/10 border border-[#531FFF]/20 text-[#531FFF] text-xs font-black uppercase tracking-wider mb-3">
              <HelpCircle className="w-3.5 h-3.5 text-[#531FFF]" />
              <span>{t.faqBadge}</span>
            </div>
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-3">
              {t.faqTitle}
            </h3>
            <p className="text-sm sm:text-base text-slate-500">
              {t.faqDesc}
            </p>
          </div>

          <div className="space-y-3.5">
            {t.faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <motion.div
                  key={idx}
                  initial={false}
                  className={`rounded-2xl border transition-all duration-200 bg-white overflow-hidden shadow-2xs ${
                    isOpen
                      ? "border-[#531FFF]/40 shadow-sm ring-2 ring-[#531FFF]/5"
                      : "border-slate-200/90 hover:border-slate-300"
                  }`}
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-slate-900 hover:text-[#531FFF] transition-colors"
                  >
                    <span className="leading-snug">{faq.q}</span>
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isOpen ? "bg-[#531FFF]/10 text-[#531FFF]" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: "easeInOut" }}
                      >
                        <div className="px-5 sm:px-6 pb-6 text-xs sm:text-sm text-slate-600 leading-relaxed font-normal border-t border-slate-100 pt-3.5">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {/* Direct Support Consultation Bar */}
          <div className="mt-10 p-5 rounded-2xl bg-gradient-to-r from-slate-50 via-[#531FFF]/5 to-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900">
                {t.faqContactTitle}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {lang === "id"
                  ? "Tim implementasi kami siap memandu demo interaktif via zoom atau WhatsApp."
                  : "Our implementation specialists are available for live interactive walkthroughs."}
              </p>
            </div>
            <a
              href="https://wa.me/6281234567890"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-bold hover:bg-[#531FFF] hover:text-white hover:border-[#531FFF] transition-all shadow-2xs shrink-0 active:scale-98"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600 group-hover:text-white" />
              <span>{t.faqContactAction}</span>
            </a>
          </div>

        </div>

      </div>
    </section>
  );
}
