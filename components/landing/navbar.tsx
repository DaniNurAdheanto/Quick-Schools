"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  Zap, ChevronDown, Menu, X, ArrowRight,
  LayoutDashboard, UserCheck, Calendar, Users, PenLine,
  CreditCard, FileText, Bell, BookOpen, Settings
} from "lucide-react";

/* Real features in the system — linking to dedicated showcase pages and modules */
const FEATURES = [
  { href: "/features/absensi",     icon: UserCheck,      label: { id: "Absensi Siswa & Guru",  en: "Student & Teacher Attendance" }, desc: { id: "Rekap kehadiran + geofence GPS",          en: "Attendance recap + GPS geofence" },           color: "text-[#531FFF]", bg: "bg-[#F3F0FF]" },
  { href: "/features/akademik",    icon: BookOpen,       label: { id: "Jadwal & Kalender",     en: "Schedule & Calendar" },          desc: { id: "Jadwal per kelas & kalender akademik",   en: "Per-class schedules & academic calendar" },   color: "text-[#531FFF]", bg: "bg-[#F3F0FF]" },
  { href: "/features/laporan",     icon: PenLine,        label: { id: "Penilaian & Rapor",      en: "Grades & Report Cards" },        desc: { id: "Input nilai & cetak rapor digital",      en: "Grade input & digital report cards" },         color: "text-[#531FFF]", bg: "bg-[#F3F0FF]" },
  { href: "/features/spp",         icon: CreditCard,     label: { id: "Pembayaran SPP",         en: "Tuition Payment" },              desc: { id: "Tagihan, rekap, & konfirmasi SPP",       en: "Invoicing, recap & payment confirmation" },    color: "text-[#531FFF]", bg: "bg-[#F3F0FF]" },
  { href: "/features/keuangan",    icon: FileText,       label: { id: "Laporan Keuangan",       en: "Financial Reports" },            desc: { id: "Rekap arus kas & laporan pengeluaran",  en: "Cashflow & expense reports" },                 color: "text-[#531FFF]", bg: "bg-[#F3F0FF]" },
  { href: "/features/pengumuman",  icon: Bell,           label: { id: "Pengumuman Sekolah",     en: "School Announcements" },         desc: { id: "Broadcast ke seluruh civitas sekolah",   en: "Broadcast to all school members" },            color: "text-[#531FFF]", bg: "bg-[#F3F0FF]" },
];

interface NavbarProps {
  lang: "id" | "en";
  onChangeLang: (l: "id" | "en") => void;
}

export default function LandingNavbar({ lang, onChangeLang }: NavbarProps) {
  const [user, setUser] = useState<any>(null);
  const [scrolled, setScrolled] = useState(false);
  const [featDropdown, setFeatDropdown] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileFeat, setMobileFeat] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => { unsub(); window.removeEventListener("scroll", onScroll); };
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setFeatDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const t = {
    id: { features: "Fitur", pricing: "Harga", about: "Tentang", signIn: "Masuk", getStarted: "Mulai Gratis", dashboard: "Dashboard" },
    en: { features: "Features", pricing: "Pricing", about: "About", signIn: "Sign In", getStarted: "Get Started", dashboard: "Dashboard" },
  }[lang];

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-sm shadow-black/5"
          : "bg-white/80 backdrop-blur-md"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#531FFF] to-[#4314cc] flex items-center justify-center shadow-lg shadow-[#531FFF]/30">
            <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div className="leading-none">
            <span className="font-extrabold text-[17px] text-gray-900 tracking-tight block">Quick Schools</span>
            <span className="text-[9px] font-bold text-[#531FFF] uppercase tracking-[0.2em] block mt-0.5">School OS</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1">
          <Link href="/" className="px-4 py-2 text-[14px] font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100/70 rounded-xl transition-all">
            {lang === "id" ? "Beranda" : "Home"}
          </Link>

          {/* Features Dropdown */}
          <div className="relative" ref={dropRef}>
            <button
              onMouseEnter={() => setFeatDropdown(true)}
              onClick={() => setFeatDropdown(v => !v)}
              className="flex items-center gap-1.5 px-4 py-2 text-[14px] font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100/70 rounded-xl transition-all"
            >
              {t.features}
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${featDropdown ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {featDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.97 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  onMouseLeave={() => setFeatDropdown(false)}
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[560px] bg-white rounded-2xl shadow-2xl shadow-black/10 border border-gray-100 p-4 grid grid-cols-2 gap-1.5 z-50"
                >
                  {FEATURES.map((f) => (
                    <Link
                      key={f.href}
                      href={f.href}
                      onClick={() => setFeatDropdown(false)}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F3F0FF]/60 transition-colors group"
                    >
                      <div className={`w-9 h-9 rounded-xl ${f.bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                        <f.icon className={f.color} style={{ width: 18, height: 18 }} strokeWidth={2} />
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-gray-900">{f.label[lang]}</p>
                        <p className="text-[11px] text-gray-500 font-medium">{f.desc[lang]}</p>
                      </div>
                    </Link>
                  ))}
                  <div className="col-span-2 mt-1 pt-3 border-t border-gray-100 flex items-center justify-between px-1">
                    <p className="text-[11px] text-gray-400 font-medium">
                      {lang === "id" ? "Platform manajemen sekolah terintegrasi" : "Integrated school management platform"}
                    </p>
                    <Link href="/admin/dashboard" className="flex items-center gap-1.5 text-[12px] font-bold text-[#531FFF] hover:text-[#4314cc] transition-colors">
                      {lang === "id" ? "Buka Dashboard" : "Open Dashboard"} <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Link href="#pricing" className="px-4 py-2 text-[14px] font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100/70 rounded-xl transition-all">
            {t.pricing}
          </Link>
          <Link href="#testimonials" className="px-4 py-2 text-[14px] font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100/70 rounded-xl transition-all">
            {lang === "id" ? "Testimoni" : "Testimonials"}
          </Link>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Language Toggle */}
          <div className="hidden md:flex items-center bg-gray-100/80 p-1 rounded-xl gap-0.5">
            {(["id", "en"] as const).map((l) => (
              <button
                key={l}
                onClick={() => onChangeLang(l)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  lang === l ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {l === "id" ? "🇮🇩 ID" : "🇬🇧 EN"}
              </button>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-2">
            {user ? (
              <Link href="/admin/dashboard" className="flex items-center gap-2 px-5 py-2.5 bg-[#531FFF] text-white rounded-xl text-[13px] font-bold hover:bg-[#4314cc] transition-all shadow-md shadow-[#531FFF]/25 hover:shadow-lg hover:shadow-[#531FFF]/30">
                <LayoutDashboard className="w-3.5 h-3.5" /> {t.dashboard}
              </Link>
            ) : (
              <>
                <Link href="/login" className="px-4 py-2.5 text-[13px] font-bold text-gray-700 hover:text-[#531FFF] transition-colors">
                  {t.signIn}
                </Link>
                <Link href="/register" className="flex items-center gap-1.5 px-5 py-2.5 bg-[#531FFF] text-white rounded-xl text-[13px] font-bold hover:bg-[#4314cc] transition-all shadow-md shadow-[#531FFF]/25 hover:shadow-lg hover:shadow-[#531FFF]/30 group">
                  {t.getStarted} <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5 text-gray-700" /> : <Menu className="w-5 h-5 text-gray-700" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="lg:hidden bg-white/97 backdrop-blur-xl border-t border-gray-100 overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-6 py-4 space-y-1">
              <Link href="/" onClick={() => setMobileOpen(false)} className="block px-4 py-3 text-[14px] font-semibold text-gray-700 hover:bg-[#F3F0FF] rounded-xl">
                {lang === "id" ? "Beranda" : "Home"}
              </Link>

              <button
                onClick={() => setMobileFeat(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-[14px] font-semibold text-gray-700 hover:bg-[#F3F0FF] rounded-xl"
              >
                {t.features} <ChevronDown className={`w-4 h-4 transition-transform ${mobileFeat ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {mobileFeat && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pl-4 space-y-0.5">
                    {FEATURES.map((f) => (
                      <Link key={f.href} href={f.href} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#F3F0FF] rounded-xl">
                        <div className={`w-7 h-7 rounded-lg ${f.bg} flex items-center justify-center`}>
                          <f.icon className={`w-4 h-4 ${f.color}`} />
                        </div>
                        <span className="text-[13px] font-semibold text-gray-700">{f.label[lang]}</span>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <Link href="#pricing" onClick={() => setMobileOpen(false)} className="block px-4 py-3 text-[14px] font-semibold text-gray-700 hover:bg-[#F3F0FF] rounded-xl">
                {t.pricing}
              </Link>

              <div className="pt-4 pb-2 border-t border-gray-100 flex flex-col gap-3">
                <div className="flex items-center gap-2 justify-center">
                  {(["id", "en"] as const).map((l) => (
                    <button key={l} onClick={() => onChangeLang(l)} className={`px-4 py-2 text-[12px] font-bold rounded-xl transition-all ${lang === l ? "bg-[#F3F0FF] text-[#531FFF]" : "text-gray-500 hover:bg-gray-100"}`}>
                      {l === "id" ? "🇮🇩 Indonesia" : "🇬🇧 English"}
                    </button>
                  ))}
                </div>
                {user ? (
                  <Link href="/admin/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center justify-center gap-2 py-3 bg-[#531FFF] text-white rounded-xl text-[14px] font-bold">
                    <LayoutDashboard className="w-4 h-4" /> {t.dashboard}
                  </Link>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setMobileOpen(false)} className="block py-3 text-center text-[14px] font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">
                      {t.signIn}
                    </Link>
                    <Link href="/register" onClick={() => setMobileOpen(false)} className="flex items-center justify-center gap-2 py-3 bg-[#531FFF] text-white rounded-xl text-[14px] font-bold">
                      {t.getStarted} <ArrowRight className="w-4 h-4" />
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
