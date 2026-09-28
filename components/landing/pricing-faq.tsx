"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  Check, ArrowRight, HelpCircle, ChevronDown, Zap
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
      title: "Transparan Tanpa Biaya Tersembunyi",
      desc: "Pilih paket yang tepat untuk skala sekolah Anda. Seluruh paket mencakup onboarding data dan pendampingan setup gratis.",
      monthly: "Tagihan Bulanan",
      annual: "Tagihan Tahunan",
      discountBadge: "Hemat 20% + Setup Prioritas",
      popularBadge: "Paling Banyak Dipilih",
      plans: [
        {
          id: "starter",
          name: "Perintis (Starter)",
          desc: "Untuk sekolah skala kecil yang baru memulai digitalisasi",
          priceMonthly: "Gratis",
          priceAnnual: "Gratis",
          unit: "selamanya",
          buttonText: "Mulai Gratis",
          buttonLink: "/register",
          popular: false,
          features: [
            "Hingga 150 Siswa Aktif",
            "Presensi GPS Standard Sekolah",
            "Manajemen Data Siswa & Pengajar",
            "Jadwal Pelajaran & Kalender",
            "Laporan Kehadiran Bulanan",
            "Dukungan Komunitas & Email"
          ]
        },
        {
          id: "pro",
          name: "Sekolah Unggulan (Pro)",
          desc: "Untuk sekolah berkembang yang membutuhkan otomasi menyeluruh",
          priceMonthly: "Rp 249.000",
          priceAnnual: "Rp 199.000",
          unit: "/ bulan (dibayar tahunan)",
          buttonText: "Coba 14 Hari Gratis",
          buttonLink: "/register",
          popular: true,
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
          desc: "Untuk yayasan pendidikan besar dengan beberapa cabang sekolah",
          priceMonthly: "Kustom",
          priceAnnual: "Kustom",
          unit: "sesuai kebutuhan",
          buttonText: "Hubungi Tim Solusi",
          buttonLink: "https://wa.me/6281234567890",
          popular: false,
          features: [
            "Kapasitas Siswa Tanpa Batas",
            "Multi-Sekolah & Dashboard Konsolidasi Yayasan",
            "Integrasi API & Sinkronisasi Dapodik Kustom",
            "Dedicated Account Manager & Pelatihan Staf",
            "Perjanjian Tingkat Layanan (SLA 99.9% Uptime)",
            "Migrasi Basis Data Berkelanjutan Didampingi Ahli"
          ]
        }
      ],
      faqBadge: "TANYA JAWAB (FAQ)",
      faqTitle: "Pertanyaan yang Sering Diajukan",
      faqDesc: "Segala hal yang perlu Anda ketahui sebelum mengadopsi Quick Schools di institusi Anda.",
      faqs: [
        {
          q: "Apakah data siswa dan keuangan sekolah kami dijamin aman?",
          a: "Sangat aman. Quick Schools dibangun di atas Google Cloud & Firebase dengan enkripsi tingkat perbankan (AES-256 dan TLS 1.3). Kami menerapkan isolasi basis data multi-tenant dan backup otomatis berkala, sehingga data sekolah Anda tidak dapat diakses pihak lain."
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
      title: "Transparent, Zero Hidden Fees",
      desc: "Select the right plan for your school scale. All packages include complimentary onboarding and guided data setup.",
      monthly: "Monthly Billing",
      annual: "Annual Billing",
      discountBadge: "Save 20% + Priority Setup",
      popularBadge: "Most Popular",
      plans: [
        {
          id: "starter",
          name: "Starter School",
          desc: "For small educational initiatives taking their first digital steps",
          priceMonthly: "Free",
          priceAnnual: "Free",
          unit: "forever",
          buttonText: "Start Free",
          buttonLink: "/register",
          popular: false,
          features: [
            "Up to 150 Active Students",
            "Standard GPS Campus Attendance",
            "Student & Faculty Directory",
            "Class Schedules & Academic Calendar",
            "Monthly Attendance Summaries",
            "Community & Email Support"
          ]
        },
        {
          id: "pro",
          name: "Excellence (Pro)",
          desc: "For growing schools requiring end-to-end automation",
          priceMonthly: "Rp 249,000",
          priceAnnual: "Rp 199,000",
          unit: "/ month (billed annually)",
          buttonText: "Try 14 Days Free",
          buttonLink: "/register",
          popular: true,
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
          desc: "For large educational trusts operating multiple campus branches",
          priceMonthly: "Custom",
          priceAnnual: "Custom",
          unit: "tailored scope",
          buttonText: "Contact Solutions Team",
          buttonLink: "https://wa.me/6281234567890",
          popular: false,
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
      faqBadge: "FREQUENTLY ASKED QUESTIONS",
      faqTitle: "Common Questions & Clarifications",
      faqDesc: "Everything you need to know before adopting Quick Schools at your institution.",
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
    <div id="pricing" className="py-24 md:py-32 bg-white relative">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Pricing Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-[#F3F0FF] border border-[#531FFF]/20 text-[#531FFF] text-xs font-bold uppercase tracking-wider mb-4">
            <Zap className="w-3.5 h-3.5 text-[#531FFF]" />
            {t.badge}
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-[1.12] mb-5">
            {t.title}
          </h2>
          <p className="text-base sm:text-lg text-gray-600 leading-relaxed font-normal mb-8">
            {t.desc}
          </p>

          {/* Billing Cycle Switcher */}
          <div className="inline-flex items-center gap-2 p-1.5 bg-slate-100/80 rounded-lg border border-gray-200 shadow-inner">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-2 rounded-md text-xs sm:text-sm font-bold transition-all ${
                billingCycle === "monthly"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {t.monthly}
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs sm:text-sm font-bold transition-all ${
                billingCycle === "annual"
                  ? "bg-[#531FFF] text-white shadow-md shadow-[#531FFF]/25"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <span>{t.annual}</span>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                billingCycle === "annual" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700"
              }`}>
                {t.discountBadge}
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto mb-28">
          {t.plans.map((plan) => {
            const isPopular = plan.popular;
            const price = billingCycle === "annual" ? plan.priceAnnual : plan.priceMonthly;

            return (
              <div
                key={plan.id}
                className={`rounded-xl p-8 flex flex-col justify-between transition-all duration-300 relative ${
                  isPopular
                    ? "bg-[#531FFF] text-white shadow-[0_25px_60px_-15px_rgba(83,31,255,0.35)] ring-2 ring-[#531FFF] lg:-translate-y-4"
                    : "bg-white text-gray-900 border border-gray-200/90 hover:border-gray-300 shadow-sm"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 text-[11px] font-black uppercase tracking-wider px-3.5 py-1 rounded-md shadow-md">
                    ★ {t.popularBadge}
                  </div>
                )}

                <div>
                  <div className="mb-6">
                    <h3 className={`text-xl font-black tracking-tight ${isPopular ? "text-white" : "text-gray-900"}`}>
                      {plan.name}
                    </h3>
                    <p className={`text-xs mt-1 leading-relaxed ${isPopular ? "text-purple-200" : "text-gray-500"}`}>
                      {plan.desc}
                    </p>
                  </div>

                  <div className="mb-8 pb-6 border-b border-gray-100/20">
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-4xl font-black tracking-tight ${isPopular ? "text-white" : "text-gray-900"}`}>
                        {price}
                      </span>
                      <span className={`text-xs font-semibold ${isPopular ? "text-purple-200" : "text-gray-400"}`}>
                        {plan.unit}
                      </span>
                    </div>
                  </div>

                  {/* Feature Checklist */}
                  <ul className="space-y-3.5 mb-8">
                    {plan.features.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                          isPopular ? "bg-white/20 text-white" : "bg-[#F3F0FF] text-[#531FFF]"
                        }`}>
                          <Check className="w-3.5 h-3.5" strokeWidth={3} />
                        </div>
                        <span className={`text-xs font-semibold leading-tight ${isPopular ? "text-purple-100" : "text-gray-700"}`}>
                          {feat}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  href={plan.buttonLink}
                  className={`w-full py-3.5 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                    isPopular
                      ? "bg-white text-[#531FFF] hover:bg-slate-50 shadow-md shadow-black/10"
                      : "bg-[#531FFF] text-white hover:bg-[#4314cc] shadow-md shadow-[#531FFF]/25"
                  }`}
                >
                  <span>{plan.buttonText}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>

        {/* Section FAQ */}
        <div id="faq" className="max-w-4xl mx-auto pt-16 border-t border-gray-200/80">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-[#F3F0FF] border border-[#531FFF]/20 text-[#531FFF] text-xs font-bold uppercase tracking-wider mb-3">
              <HelpCircle className="w-3.5 h-3.5 text-[#531FFF]" />
              {t.faqBadge}
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mb-3">
              {t.faqTitle}
            </h3>
            <p className="text-sm text-gray-500">
              {t.faqDesc}
            </p>
          </div>

          <div className="space-y-3.5">
            {t.faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-gray-200/90 bg-white overflow-hidden transition-all shadow-2xs"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-gray-900 hover:text-[#531FFF] transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ${
                      isOpen ? "rotate-180 text-[#531FFF]" : ""
                    }`} />
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-5 pb-5 text-xs sm:text-sm text-gray-600 leading-relaxed font-normal border-t border-gray-100 pt-3">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
