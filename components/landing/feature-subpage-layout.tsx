"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Zap,
  Building2,
  Clock,
  ArrowUpRight
} from "lucide-react";

export interface FeatureSubpageData {
  badge: string;
  h1a: string;
  h1b: string;
  desc: string;
  cta1: string;
  cta2: string;
  featBadge: string;
  featTitle: string;
  feats: { icon: any; title: string; desc: string }[];
  workBadge: string;
  workTitle: string;
  workSteps: { n: string; title: string; desc: string }[];
  benefitBadge: string;
  benefitTitle: string;
  benefits: string[];
  ctaBannerTitle: string;
  ctaBannerDesc: string;
  ctaBannerBtn: string;
}

interface FeatureSubpageLayoutProps {
  moduleKey: string;
  translations: {
    id: FeatureSubpageData;
    en: FeatureSubpageData;
  };
  mockup: React.ReactNode;
  dashboardHref: string;
  icon?: any;
}

export default function FeatureSubpageLayout({
  moduleKey,
  translations,
  mockup,
  dashboardHref,
  icon: ModuleIcon
}: FeatureSubpageLayoutProps) {
  const [lang, setLang] = useState<"id" | "en">("id");

  useEffect(() => {
    const saved = localStorage.getItem("qs_lang") as "id" | "en";
    if (saved === "id" || saved === "en") setLang(saved);

    const handleStorageChange = () => {
      const updated = localStorage.getItem("qs_lang") as "id" | "en";
      if (updated === "id" || updated === "en") setLang(updated);
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("qs_lang_change", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("qs_lang_change", handleStorageChange);
    };
  }, []);

  const t = translations[lang] || translations.id;

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-[#531FFF]/10 selection:text-[#531FFF]">
      {/* ── 1. HERO SECTION ── */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-gradient-to-b from-slate-50/70 via-white to-white">
        {/* Subtle dot pattern & ambient gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-60" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[680px] h-[360px] bg-gradient-to-tr from-[#531FFF]/6 via-[#7B4DFF]/4 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-6">
            <Link href="/" className="hover:text-slate-900 transition-colors">
              {lang === "id" ? "Beranda" : "Home"}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <Link href="/#features" className="hover:text-slate-900 transition-colors">
              {lang === "id" ? "Fitur & Modul" : "Features"}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-[#531FFF] font-bold">{t.badge}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            {/* Left Column: Headlines & CTAs */}
            <div className="lg:col-span-6 space-y-6">
              {/* Category Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-slate-200/90 shadow-2xs">
                {ModuleIcon ? (
                  <ModuleIcon className="w-3.5 h-3.5 text-[#531FFF]" />
                ) : (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#531FFF] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#531FFF]"></span>
                  </span>
                )}
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#531FFF]">
                  {t.badge}
                </span>
                <span className="text-gray-300">·</span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Quick Schools OS
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-[1.12]">
                {t.h1a}{" "}
                <span className="relative inline-block text-[#531FFF]">
                  {t.h1b}
                  <span className="absolute bottom-1.5 left-0 w-full h-2.5 bg-[#531FFF]/10 -z-10 rounded-sm" />
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal max-w-xl">
                {t.desc}
              </p>

              {/* CTA Group */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#531FFF] text-white text-sm font-bold hover:bg-[#4314cc] transition-all shadow-md shadow-[#531FFF]/20 hover:shadow-lg hover:shadow-[#531FFF]/25 group cursor-pointer active:scale-98"
                >
                  <span>{t.cta1}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  href={dashboardHref}
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white border border-slate-200/90 text-slate-700 text-sm font-bold hover:border-slate-300 hover:bg-slate-50/80 transition-all shadow-2xs cursor-pointer active:scale-98"
                >
                  <span>{t.cta2}</span>
                  <ArrowUpRight className="w-4 h-4 text-slate-400" />
                </Link>
              </div>

              {/* Minimal Trust Strip */}
              <div className="flex flex-wrap items-center gap-y-2 gap-x-6 pt-3 text-xs text-slate-500 font-semibold border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Cloud Database Real-Time</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Standar Kurikulum Merdeka</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Multi-Role Terintegrasi</span>
                </div>
              </div>
            </div>

            {/* Right Column: Visual Mockup with Minimalist Frame */}
            <div className="lg:col-span-6">
              <div className="relative rounded-2xl bg-white border border-slate-200/80 shadow-[0_20px_50px_-15px_rgba(83,31,255,0.12)] overflow-hidden">
                {/* Minimal Mac-Style Window Header */}
                <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/90 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400/90 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/90 inline-block" />
                    <span className="ml-2 text-[11px] font-mono text-slate-300 truncate">
                      quickschools.id/{moduleKey}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live System
                  </div>
                </div>

                {/* Inner Mockup Container */}
                <div className="p-4 sm:p-6 bg-white overflow-x-auto">
                  {mockup}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. KEY CAPABILITIES GRID (FITUR UNGGULAN) ── */}
      <section id="features" className="py-20 md:py-28 bg-slate-50/60 border-t border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 border border-purple-200/70 text-[#531FFF] text-xs font-bold uppercase tracking-wider mb-4">
              <Sparkles className="w-3.5 h-3.5 text-[#531FFF]" />
              {t.featBadge}
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-tight">
              {t.featTitle}
            </h2>
            <p className="text-sm sm:text-base text-gray-500 mt-3 font-normal leading-relaxed">
              {lang === "id"
                ? "Dirancang presisi dan terstruktur untuk menyederhanakan tugas staf, guru, dan pimpinan sekolah."
                : "Engineered with precision to streamline the workflows of staff, teachers, and school leadership."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {t.feats.map((f, i) => {
              const Icon = f.icon || Sparkles;
              return (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-7 border border-gray-200/80 hover:border-[#531FFF]/40 shadow-xs hover:shadow-xl hover:shadow-[#531FFF]/5 transition-all duration-300 flex flex-col justify-between group"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-purple-50 group-hover:bg-[#531FFF] text-[#531FFF] group-hover:text-white flex items-center justify-center mb-5 transition-colors duration-300 shadow-2xs">
                      <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-[#531FFF] transition-colors">
                      {f.title}
                    </h3>
                    <p className="text-xs sm:text-[13px] text-gray-500 leading-relaxed font-normal">
                      {f.desc}
                    </p>
                  </div>
                  <div className="pt-4 mt-4 border-t border-gray-100 flex items-center gap-1.5 text-xs font-semibold text-[#531FFF] opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>{lang === "id" ? "Pelajari kapabilitas" : "Explore capability"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 3. WORKFLOW JOURNEY (ALUR KERJA) ── */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider mb-4">
              <Clock className="w-3.5 h-3.5 text-slate-600" />
              {t.workBadge}
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-tight">
              {t.workTitle}
            </h2>
            <p className="text-sm sm:text-base text-gray-500 mt-3 font-normal leading-relaxed">
              {lang === "id"
                ? "Implementasi tanpa hambatan melalui alur kerja yang intuitif dan terintegrasi."
                : "Frictionless execution through intuitive and interconnected operational stages."}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {t.workSteps.map((step, idx) => (
              <div
                key={idx}
                className="relative bg-slate-50/60 hover:bg-white rounded-2xl p-7 border border-gray-200/80 hover:border-[#531FFF]/30 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <span className="text-3xl font-black text-[#531FFF]/25 block mb-4 tracking-tighter">
                    {step.n}
                  </span>
                  <h3 className="text-base font-bold text-gray-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-xs sm:text-[13px] text-gray-500 leading-relaxed font-normal">
                    {step.desc}
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-gray-200/60 flex items-center justify-between text-[11px] font-bold text-gray-400">
                  <span>Tahap {idx + 1} dari {t.workSteps.length}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. BENEFITS & VALUE PROPOSITION ── */}
      <section className="py-20 md:py-28 bg-slate-50/60 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left: Bullet Points */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                {t.benefitBadge}
              </div>

              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-tight">
                {t.benefitTitle}
              </h2>

              <p className="text-sm sm:text-base text-gray-600 leading-relaxed font-normal">
                {lang === "id"
                  ? "Standar pengelolaan institusi pendidikan kini lebih akurat, transparan, dan terpercaya."
                  : "Elevate your school's operational standards with transparency, accuracy, and institutional trust."}
              </p>

              <div className="space-y-3.5 pt-2">
                {t.benefits.map((b, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-xl bg-white border border-gray-100 shadow-2xs hover:border-emerald-200 transition-colors"
                  >
                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                    <span className="text-xs sm:text-[13px] font-semibold text-gray-800 leading-snug">
                      {b}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Minimal Highlights Summary */}
            <div className="lg:col-span-6">
              <div className="bg-white rounded-2xl border border-gray-200/80 p-8 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#531FFF] flex items-center justify-center font-bold">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">Performa & Keandalan Modul</h4>
                      <p className="text-[11px] text-gray-500">Benchmark operasional Quick Schools OS</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    SLA 99.9%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-gray-100">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Efisiensi Waktu</span>
                    <span className="text-2xl font-black text-gray-900 mt-1 block">85% Lebih Cepat</span>
                    <p className="text-[11px] text-gray-500 mt-1">Mengeliminasi input manual berulang</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-gray-100">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Akurasi Pencatatan</span>
                    <span className="text-2xl font-black text-emerald-600 mt-1 block">100% Presisi</span>
                    <p className="text-[11px] text-gray-500 mt-1">Validasi otomatis & bebas selisih</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-gray-100">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Multi-Role Sinkron</span>
                    <span className="text-2xl font-black text-[#531FFF] mt-1 block">5 Portal Terpadu</span>
                    <p className="text-[11px] text-gray-500 mt-1">Kepala Sekolah s/d Wali Murid</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-gray-100">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Keamanan Data</span>
                    <span className="text-2xl font-black text-gray-900 mt-1 block">Standar Enterprise</span>
                    <p className="text-[11px] text-gray-500 mt-1">Backup otomatis & akses terenkripsi</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <Building2 className="w-5 h-5 text-[#531FFF] shrink-0" />
                    <p className="text-xs text-purple-950 font-medium">
                      Siap diterapkan untuk SD, SMP, SMA, SMK, maupun Yayasan Pendidikan Multi-Kampus.
                    </p>
                  </div>
                  <Link
                    href="/register"
                    className="shrink-0 text-xs font-bold text-[#531FFF] hover:underline"
                  >
                    Daftar Sekolah &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. PROFESSIONAL MINIMALIST CTA BANNER ── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto rounded-3xl bg-[#0B0F19] border border-slate-800 p-10 sm:p-14 md:p-16 text-white text-center shadow-2xl relative overflow-hidden">
          {/* Subtle ambient light blur */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#531FFF]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-purple-200 text-xs font-bold uppercase tracking-wider border border-white/15">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              {t.badge}
            </span>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
              {t.ctaBannerTitle}
            </h2>

            <p className="text-sm sm:text-base text-slate-300 font-normal leading-relaxed">
              {t.ctaBannerDesc}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3.5 pt-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-slate-900 text-sm font-extrabold hover:bg-slate-100 transition-all shadow-md active:scale-98 cursor-pointer"
              >
                <span>{t.ctaBannerBtn}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-semibold border border-white/20 transition-all cursor-pointer active:scale-98"
              >
                <span>{lang === "id" ? "Kembali ke Beranda" : "Back to Home"}</span>
              </Link>
            </div>

            <p className="text-[11px] text-slate-400 font-medium pt-2">
              {lang === "id"
                ? "Tanpa kartu kredit · Setup instan didampingi tim · Bebas batasan siswa selama masa uji coba"
                : "No credit card required · Free guided onboarding · Unlimited students during trial period"}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
