"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  Check, ArrowRight, HelpCircle, ChevronDown, Zap,
  Sparkles, Building2, ShieldCheck, Headphones, RefreshCw,
  GraduationCap, CheckCircle2, MessageCircle
} from "lucide-react";

export interface SaaSPackageItem {
  id: string;
  code: string;
  name: string;
  tagline?: string | null;
  badge?: string | null;
  priceMonthly: number;
  priceYearly: number;
  maxStudents: number;
  features: string[];
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
}

const INITIAL_PACKAGES: SaaSPackageItem[] = [
  {
    id: "trial",
    code: "trial",
    name: "Uji Coba 14 Hari (Trial)",
    tagline: "Coba seluruh fitur tanpa komitmen biaya",
    badge: "Gratis",
    priceMonthly: 0,
    priceYearly: 0,
    maxStudents: 150,
    features: [
      "Presensi Online GPS",
      "Jadwal Pelajaran",
      "Penilaian Siswa",
      "Akses Uji Coba 14 Hari"
    ],
    isActive: true,
    isPopular: false,
    sortOrder: 1,
  },
  {
    id: "standard",
    code: "standard",
    name: "Sekolah Rintisan (Standard)",
    tagline: "Solusi terjangkau untuk sekolah bertumbuh",
    badge: "Hemat",
    priceMonthly: 150000,
    priceYearly: 1500000,
    maxStudents: 450,
    features: [
      "Kapasitas s.d 450 Siswa",
      "Presensi Real-time + Rekap",
      "Penilaian & E-Rapor Digital",
      "Dukungan WhatsApp Jam Kerja"
    ],
    isActive: true,
    isPopular: false,
    sortOrder: 2,
  },
  {
    id: "pro",
    code: "pro",
    name: "Sekolah Unggulan (Pro)",
    tagline: "Otomasi lengkap berteknologi AI untuk sekolah modern",
    badge: "Paling Populer",
    priceMonthly: 200000,
    priceYearly: 2000000,
    maxStudents: 1200,
    features: [
      "Kapasitas s.d 1.200 Siswa",
      "Face Recognition AI & Anti-Fake GPS",
      "Otomatisasi Tagihan SPP & Kas",
      "Broadcast WhatsApp Otomatis ke Ortu",
      "Dukungan Prioritas 24/7"
    ],
    isActive: true,
    isPopular: true,
    sortOrder: 3,
  },
  {
    id: "enterprise",
    code: "enterprise",
    name: "Yayasan / Multi-Kampus",
    tagline: "Tata kelola sentral multi-cabang & kustomisasi domain",
    badge: "Enterprise",
    priceMonthly: -1,
    priceYearly: -1,
    maxStudents: 5000,
    features: [
      "Kapasitas Siswa Unlimited",
      "Dashboard Konsolidasi Yayasan Multi-Sekolah",
      "Kustomisasi Domain & Branding Sendiri",
      "Dedicated Account Manager & SLA 99.9%",
      "Integrasi & Sinkronisasi Dapodik"
    ],
    isActive: true,
    isPopular: false,
    sortOrder: 4,
  },
];

const getPackageIcon = (code: string) => {
  const c = (code || "").toLowerCase();
  if (c.includes("trial") || c.includes("starter")) return GraduationCap;
  if (c.includes("standard") || c.includes("rintisan")) return Sparkles;
  if (c.includes("pro") || c.includes("unggulan")) return Zap;
  if (c.includes("enterprise") || c.includes("yayasan")) return Building2;
  return ShieldCheck;
};

const getButtonText = (pkg: SaaSPackageItem, lang: "id" | "en") => {
  const isContact = pkg.priceMonthly === -1 || pkg.priceYearly === -1;
  if (isContact) {
    return lang === "id" ? "Konsultasi & Hubungi Kami" : "Contact Sales & Consult";
  }
  const c = pkg.code.toLowerCase();
  if (pkg.priceMonthly === 0) {
    return lang === "id" ? "Ajukan Uji Coba 14 Hari" : "Start 14-Day Free Trial";
  }
  if (c === "standard") {
    return lang === "id" ? "Ajukan Paket Standard" : "Choose Standard Plan";
  }
  if (c === "pro") {
    return lang === "id" ? "Ajukan Berlangganan Pro" : "Register Pro Plan";
  }
  return lang === "id" ? `Pilih Paket ${pkg.name}` : `Choose ${pkg.name}`;
};

interface PricingFaqProps {
  lang: "id" | "en";
}

export default function PricingFaq({ lang }: PricingFaqProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [packages, setPackages] = useState<SaaSPackageItem[]>(INITIAL_PACKAGES);

  // Sync real-time with SaaS Administrator "Paket Layanan SaaS" (/api/saas-packages)
  useEffect(() => {
    let isMounted = true;
    fetch("/api/saas-packages?activeOnly=true")
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.success && Array.isArray(json.data) && json.data.length > 0) {
          setPackages(json.data);
        }
      })
      .catch((err) => {
        console.warn("PricingFaq: failed to fetch packages from API, using default fallback:", err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const t = {
    id: {
      badge: "INVESTASI & BIAYA",
      title: "Transparan, Terjangkau & Tanpa Biaya Tersembunyi",
      desc: "Pilih paket investasi yang sesuai dengan skala sekolah Anda. Seluruh paket sudah termasuk bantuan migrasi data dan pendampingan implementasi gratis.",
      monthly: "Tagihan Bulanan",
      annual: "Tagihan Tahunan",
      discountBadge: "Hemat Biaya",
      popularBadge: "Paling Banyak Dipilih",
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
      discountBadge: "Cost Savings",
      popularBadge: "Most Popular",
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

        {/* ── Pricing Cards Grid (Integrated Dynamically with SaaS Packages) ── */}
        <div
          className={`grid gap-6 items-stretch mx-auto mb-16 ${
            packages.length <= 2
              ? "grid-cols-1 md:grid-cols-2 max-w-4xl"
              : packages.length === 3
              ? "grid-cols-1 lg:grid-cols-3 max-w-6xl"
              : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4 max-w-7xl"
          }`}
        >
          {packages.map((pkg) => {
            const isPopular = pkg.isPopular;
            const PlanIcon = getPackageIcon(pkg.code);

            // Format Prices dynamically from SaaS Administrator DB
            const isContact = pkg.priceMonthly === -1 || pkg.priceYearly === -1;
            const isFree = !isContact && pkg.priceMonthly === 0 && pkg.priceYearly === 0;
            let displayPrice = "";
            let unitText = "";
            let savingsText: string | null = null;
            let monthlyEquivalentText: string | null = null;

            if (isContact) {
              displayPrice = lang === "id" ? "Hubungi Kami" : "Contact Us";
              unitText = lang === "id" ? "penawaran kustom" : "tailored scope";
            } else if (isFree) {
              displayPrice = lang === "id" ? "Gratis" : "Free";
              unitText = lang === "id" ? "14 hari trial" : "14-day trial";
            } else if (billingCycle === "annual") {
              if (pkg.priceYearly > 0) {
                displayPrice = `Rp ${pkg.priceYearly.toLocaleString("id-ID")}`;
                unitText = lang === "id" ? "/ tahun" : "/ year";
                monthlyEquivalentText = `~Rp ${Math.round(pkg.priceYearly / 12).toLocaleString("id-ID")}/bln`;

                if (pkg.priceMonthly > 0 && pkg.priceMonthly * 12 > pkg.priceYearly) {
                  const diff = pkg.priceMonthly * 12 - pkg.priceYearly;
                  savingsText =
                    lang === "id"
                      ? `Hemat Rp ${diff.toLocaleString("id-ID")}/tahun`
                      : `Save Rp ${diff.toLocaleString("id-ID")}/year`;
                }
              } else {
                displayPrice = `Rp ${pkg.priceMonthly.toLocaleString("id-ID")}`;
                unitText = lang === "id" ? "/ bulan" : "/ month";
              }
            } else {
              displayPrice = `Rp ${pkg.priceMonthly.toLocaleString("id-ID")}`;
              unitText = lang === "id" ? "/ bulan" : "/ month";
            }

            const buttonLink = `/register-school?plan=${encodeURIComponent(pkg.code)}`;
            const buttonText = getButtonText(pkg, lang);
            const targetBadge =
              pkg.badge ||
              (pkg.maxStudents >= 2500
                ? lang === "id"
                  ? "Siswa Unlimited"
                  : "Unlimited Students"
                : lang === "id"
                ? `Hingga ${pkg.maxStudents.toLocaleString("id-ID")} Siswa`
                : `Up to ${pkg.maxStudents.toLocaleString("id-ID")} Students`);

            return (
              <motion.div
                key={pkg.id || pkg.code}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.25 }}
                className={`rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 relative bg-white ${
                  isPopular
                    ? "border-2 border-[#531FFF] shadow-2xl shadow-[#531FFF]/12 lg:-translate-y-2 ring-4 ring-[#531FFF]/10"
                    : "border border-slate-200/90 hover:border-slate-300 shadow-sm hover:shadow-lg"
                }`}
              >
                {/* Popular Highlight Tag */}
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#531FFF] to-[#7B4DFF] text-white text-[11px] font-extrabold uppercase tracking-wider px-4 py-1 rounded-full shadow-md shadow-[#531FFF]/30 flex items-center gap-1.5 whitespace-nowrap">
                    <Sparkles className="w-3 h-3" />
                    <span>{t.popularBadge}</span>
                  </div>
                )}

                <div>
                  {/* Card Header & Tier Badge */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="space-y-1 min-w-0">
                      <span className="text-[10px] font-extrabold tracking-wider uppercase px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 inline-block truncate max-w-full">
                        {targetBadge}
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 pt-1">
                        {pkg.name}
                      </h3>
                    </div>
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        isPopular
                          ? "bg-[#531FFF]/10 text-[#531FFF]"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      <PlanIcon className="w-5 h-5" strokeWidth={2.2} />
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal min-h-[38px] mb-5">
                    {pkg.tagline ||
                      (lang === "id"
                        ? `Paket lengkap dengan kapasitas hingga ${pkg.maxStudents} siswa.`
                        : `Full package with capacity up to ${pkg.maxStudents} students.`)}
                  </p>

                  {/* Price Block */}
                  <div className="mb-6 pb-5 border-b border-slate-100">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                        {displayPrice}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">
                        {unitText}
                      </span>
                    </div>

                    {billingCycle === "annual" && monthlyEquivalentText && (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-[11px] font-semibold text-slate-400">
                          {monthlyEquivalentText}
                        </span>
                        {savingsText && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>{savingsText}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-3 mb-8">
                    <p className="text-[11px] font-extrabold tracking-wider text-slate-400 uppercase">
                      {lang === "id" ? "Fitur Termasuk:" : "Included Features:"}
                    </p>
                    <ul className="space-y-2.5">
                      {(pkg.features || []).map((feat, fIdx) => (
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
                  href={buttonLink}
                  className={`w-full py-3 px-5 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 ${
                    isPopular
                      ? "bg-[#531FFF] text-white hover:bg-[#4314cc] shadow-md shadow-[#531FFF]/25 hover:shadow-lg hover:shadow-[#531FFF]/30"
                      : "bg-slate-900 text-white hover:bg-slate-800 shadow-xs"
                  }`}
                >
                  <span>{buttonText}</span>
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
