"use client";

import Link from "next/link";
import { 
  ArrowRight, Sparkles, CheckCircle2, ChevronRight, Menu,
  Calendar, GraduationCap, Bot, LineChart, Check,
  ShieldCheck, Zap, Globe2, User, CheckSquare, CreditCard, MessageCircle,
  Play, Users, BookOpen, Shield
} from "lucide-react";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

// Bilingual Translations Dictionary
const TRANSLATIONS = {
  id: {
    nav: {
      features: "Fitur",
      howItWorks: "Cara Kerja",
      pricing: "Harga",
      testimonials: "Testimoni",
      signIn: "Masuk",
      getStarted: "Mulai Gratis",
      dashboard: "Ke Dashboard",
    },
    hero: {
      badge: "Sistem Manajemen Sekolah Berbasis AI Generasi Baru",
      titlePart1: "Kelola Sekolah Lebih ",
      titleHighlight: "Cerdas, Cepat",
      titlePart2: " & Modern",
      desc: "Platform serba ada untuk mengelola presensi AI face recognition, data siswa, kurikulum, jadwal otomatis, pembayaran, dan laporan akademik real-time.",
      btnPrimary: "Mulai Uji Coba Gratis",
      btnSecondary: "Lihat Fitur Lengkap",
      trust1: "Tanpa Kartu Kredit",
      trust2: "Setup Cepat 5 Menit",
      trust3: "Terintegrasi Cloud & AI",
      statsSiswa: "Total Siswa",
      statsPresensi: "Kehadiran AI",
      statsKelas: "Kelas Aktif",
      statsSPP: "SPP Terbayar",
      grafikTitle: "Grafik Kehadiran & Akademik",
      grafikSub: "Rekapitulasi Tahun Ajaran 2025/2026",
      liveBadge: "Live AI Face ID",
      aiScheduleTitle: "AI Schedule Optimizer",
      aiScheduleDesc: "Jadwal pelajaran otomatis tanpa bentrok",
      securityTitle: "Aman & Terenkripsi Cloud",
      securityDesc: "Privasi data sekolah terjamin 100%",
    },
    trustedBy: "Dipercaya oleh lebih dari 500+ Sekolah & Institusi di Indonesia",
    features: {
      badge: "Fitur Unggulan",
      title: "Semua Kebutuhan Manajemen Sekolah dalam Satu Platform",
      desc: "Dirancang khusus untuk mempermudah operasional sekolah modern dengan teknologi otomasi dan kecerdasan buatan.",
      f1Title: "Absensi & AI Face Recognition",
      f1Desc: "Presensi siswa berbasis verifikasi wajah AI dan validasi radius geolokasi GPS sekolah.",
      f2Title: "Manajemen Data Siswa & Guru",
      f2Desc: "Kelola biodata, wali kelas, jam mengajar, serta berkas administrasi secara terpusat.",
      f3Title: "Penyusunan Jadwal Otomatis",
      f3Desc: "AI Generator jadwal pelajaran pintar tanpa bentrok antar guru dan ruang kelas.",
      f4Title: "Pembayaran & Keuangan SPP",
      f4Desc: "Sistem tagihan digital, konfirmasi otomatis, dan rekap arus kas keuangan sekolah.",
      f5Title: "Pengumuman & Komunikasi",
      f5Desc: "Pesan instan dan pengumuman sekolah langsung ke siswa, guru, dan orang tua.",
      f6Title: "Laporan & Raport Akademik",
      f6Desc: "Olahan nilai otomatis, grafik performa siswa, dan cetak raport digital siap pakai.",
      more: "Selengkapnya",
    },
    pricing: {
      badge: "Paket Langganan",
      title: "Harga Transparan Tanpa Biaya Tersembunyi",
      desc: "Pilih paket yang paling sesuai dengan kebutuhan jumlah siswa dan skala sekolah Anda.",
      p1Name: "Paket Basic",
      p1Desc: "Cocok untuk sekolah skala kecil / yayasan pemula",
      p1Price: "Gratis",
      p1Unit: "/ selamanya",
      p1Btn: "Mulai Gratis",
      p2Name: "Paket Pro AI",
      p2Desc: "Untuk sekolah menengah & berkembang",
      p2Badge: "Paling Populer",
      p2Price: "Rp 199.000",
      p2Unit: "/ bulan",
      p2Btn: "Coba Gratis 14 Hari",
      p3Name: "Paket Enterprise",
      p3Desc: "Untuk grup sekolah & kompleks yayasan besar",
      p3Price: "Kustom",
      p3Btn: "Hubungi Tim Sales",
    },
    cta: {
      title: "Siap Mentransformasi Operasional Sekolah Anda?",
      desc: "Bergabunglah bersama ratusan sekolah lain di Indonesia yang telah beralih ke sistem sekolah modern berbasis AI.",
      btn: "Daftar Sekarang",
      stat: "Sekolah Aktif Terdaftar",
    },
    footer: {
      tagline: "Platform sistem informasi manajemen sekolah cerdas terdepan di Indonesia.",
      col1: "Produk",
      col2: "Perusahaan",
      col3: "Hubungi Kami",
      rights: "Quick Schools. Hak cipta dilindungi undang-undang.",
    }
  },
  en: {
    nav: {
      features: "Features",
      howItWorks: "How It Works",
      pricing: "Pricing",
      testimonials: "Testimonials",
      signIn: "Sign In",
      getStarted: "Get Started Free",
      dashboard: "Go to Dashboard",
    },
    hero: {
      badge: "Next-Gen AI Powered School Management Platform",
      titlePart1: "Manage Your School ",
      titleHighlight: "Smarter, Faster",
      titlePart2: " & Future-Ready",
      desc: "All-in-one platform to manage AI face recognition attendance, student data, academics, automated scheduling, payments, and real-time reports.",
      btnPrimary: "Start Free Trial",
      btnSecondary: "Explore All Features",
      trust1: "No Credit Card Required",
      trust2: "Fast 5-Min Setup",
      trust3: "Cloud & AI Integrated",
      statsSiswa: "Total Students",
      statsPresensi: "AI Attendance",
      statsKelas: "Active Classes",
      statsSPP: "Tuition Paid",
      grafikTitle: "Attendance & Academic Analytics",
      grafikSub: "Academic Year Summary 2025/2026",
      liveBadge: "Live AI Face ID",
      aiScheduleTitle: "AI Schedule Optimizer",
      aiScheduleDesc: "Conflict-free automated class timetable generator",
      securityTitle: "Secure Cloud Encryption",
      securityDesc: "100% Guaranteed school data privacy & safety",
    },
    trustedBy: "Trusted by over 500+ Schools & Institutions across Indonesia",
    features: {
      badge: "Core Features",
      title: "Everything You Need in One Unified School Platform",
      desc: "Designed specifically to streamline modern school operations with smart automation and artificial intelligence.",
      f1Title: "AI Face Recognition & GPS Attendance",
      f1Desc: "Student attendance powered by facial recognition AI and school location geofencing.",
      f2Title: "Student & Teacher Management",
      f2Desc: "Centralized bio-data, homeroom teachers, teaching hours, and administration files.",
      f3Title: "Automated AI Timetabling",
      f3Desc: "Smart schedule generator preventing room and teacher conflict seamlessly.",
      f4Title: "Tuition & Financial Management",
      f4Desc: "Digital invoicing, auto-reconciliation, and comprehensive school cashflow reports.",
      f5Title: "Communication & Announcements",
      f5Desc: "Direct messaging and school broadcast alerts to students, teachers, and parents.",
      f6Title: "Academic Reports & Report Cards",
      f6Desc: "Automated grade calculations, student progress charts, and digital report cards.",
      more: "Learn More",
    },
    pricing: {
      badge: "Subscription Plans",
      title: "Simple & Transparent Pricing Without Hidden Fees",
      desc: "Choose the perfect plan tailored to your school size and operational scale.",
      p1Name: "Basic Plan",
      p1Desc: "Ideal for small schools and new foundations",
      p1Price: "Free",
      p1Unit: "/ forever",
      p1Btn: "Start Free",
      p2Name: "Pro AI Plan",
      p2Desc: "Best for growing and medium-sized schools",
      p2Badge: "Most Popular",
      p2Price: "Rp 199,000",
      p2Unit: "/ month",
      p2Btn: "Start 14-Day Free Trial",
      p3Name: "Enterprise Plan",
      p3Desc: "For large school networks & multi-campus institutions",
      p3Price: "Custom",
      p3Btn: "Contact Sales Team",
    },
    cta: {
      title: "Ready to Transform Your School Operations?",
      desc: "Join hundreds of schools already leveraging Quick Schools for a smarter academic experience.",
      btn: "Register Now",
      stat: "Active Registered Schools",
    },
    footer: {
      tagline: "Leading smart school management information platform in Indonesia.",
      col1: "Product",
      col2: "Company",
      col3: "Contact Us",
      rights: "Quick Schools. All rights reserved.",
    }
  }
};

export default function LandingPage() {
  const [user, setUser] = useState<any>(null);
  const [lang, setLang] = useState<"id" | "en">("id");

  // Load language preference
  useEffect(() => {
    const savedLang = localStorage.getItem("qs_lang") as "id" | "en";
    if (savedLang === "id" || savedLang === "en") {
      setLang(savedLang);
    }
  }, []);

  const changeLanguage = (newLang: "id" | "en") => {
    setLang(newLang);
    localStorage.setItem("qs_lang", newLang);
  };

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      // 5 minutes timer
      inactivityTimer = setTimeout(async () => {
        if (auth.currentUser) {
          try {
            await signOut(auth);
            setUser(null);
            console.log("Logged out due to 5 minutes of inactivity on landing page");
          } catch (error) {
            console.error("Error signing out:", error);
          }
        }
      }, 5 * 60 * 1000);
    };

    const handleUserActivity = () => {
      if (auth.currentUser) {
        resetTimer();
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        resetTimer();
        window.addEventListener("mousemove", handleUserActivity);
        window.addEventListener("keydown", handleUserActivity);
        window.addEventListener("click", handleUserActivity);
        window.addEventListener("scroll", handleUserActivity);
      } else {
        clearTimeout(inactivityTimer);
        window.removeEventListener("mousemove", handleUserActivity);
        window.removeEventListener("keydown", handleUserActivity);
        window.removeEventListener("click", handleUserActivity);
        window.removeEventListener("scroll", handleUserActivity);
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(inactivityTimer);
      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
      window.removeEventListener("click", handleUserActivity);
      window.removeEventListener("scroll", handleUserActivity);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-[#531FFF]/20 overflow-x-hidden">
      {/* Navbar */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-xs"
      >
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#531FFF] to-[#8C6BFF] flex items-center justify-center shadow-lg shadow-[#531FFF]/20">
                 <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-gray-900 leading-tight">
                Quick Schools<br/>
                <span className="text-[10px] font-bold text-[#531FFF] uppercase tracking-widest block -mt-1">School Management System</span>
              </span>
           </div>
           
           <nav className="hidden lg:flex items-center gap-8">
             <Link href="#features" className="text-[14px] font-semibold text-gray-600 hover:text-[#531FFF] transition-colors">{t.nav.features}</Link>
             <Link href="#how-it-works" className="text-[14px] font-semibold text-gray-600 hover:text-[#531FFF] transition-colors">{t.nav.howItWorks}</Link>
             <Link href="#pricing" className="text-[14px] font-semibold text-gray-600 hover:text-[#531FFF] transition-colors">{t.nav.pricing}</Link>
             <Link href="#testimonials" className="text-[14px] font-semibold text-gray-600 hover:text-[#531FFF] transition-colors">{t.nav.testimonials}</Link>
           </nav>
           
           <div className="flex items-center gap-3">
             {/* Language Switcher Toggle */}
             <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
               <button
                 onClick={() => changeLanguage("id")}
                 className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${
                   lang === "id" 
                     ? "bg-white text-gray-900 shadow-xs" 
                     : "text-gray-500 hover:text-gray-900"
                 }`}
               >
                 <span>🇮🇩</span> ID
               </button>
               <button
                 onClick={() => changeLanguage("en")}
                 className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${
                   lang === "en" 
                     ? "bg-white text-gray-900 shadow-xs" 
                     : "text-gray-500 hover:text-gray-900"
                 }`}
               >
                 <span>🇬🇧</span> EN
               </button>
             </div>

             <div className="hidden lg:flex items-center gap-3">
               {user ? (
                 <Link href="/admin/dashboard" className="px-6 py-2.5 bg-[#531FFF] text-white rounded-lg text-[14px] font-bold hover:bg-[#4314cc] transition-all shadow-md shadow-[#531FFF]/20">
                   {t.nav.dashboard}
                 </Link>
               ) : (
                 <>
                   <Link href="/login" className="px-4 py-2.5 text-[14px] font-bold text-gray-700 hover:text-[#531FFF] transition-colors">
                     {t.nav.signIn}
                   </Link>
                   <Link href="/register" className="px-6 py-2.5 bg-[#531FFF] text-white rounded-lg text-[14px] font-bold hover:bg-[#4314cc] transition-all shadow-md shadow-[#531FFF]/20 hover:shadow-lg hover:shadow-[#531FFF]/30">
                     {t.nav.getStarted}
                   </Link>
                 </>
               )}
             </div>
             
             <button className="lg:hidden text-gray-900 p-2">
               <Menu className="w-6 h-6" />
             </button>
           </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 lg:pt-36 lg:pb-28 relative overflow-hidden bg-gradient-to-b from-slate-50/80 via-white to-white">
         <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:32px_32px] opacity-40 pointer-events-none" />
         <div className="absolute top-10 right-1/4 w-[500px] h-[500px] bg-[#531FFF]/5 rounded-full blur-3xl pointer-events-none" />
         <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

         <div className="max-w-[1400px] mx-auto px-6 relative z-10">
            
            <div className="text-center max-w-4xl mx-auto mb-14">
               <motion.div 
                 initial={{ opacity: 0, y: 15 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ duration: 0.5 }}
                 className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F3F0FF] border border-[#531FFF]/20 text-[#531FFF] text-xs font-extrabold mb-6 shadow-sm shadow-[#531FFF]/10"
               >
                 <Sparkles className="w-4 h-4 text-[#531FFF]" />
                 {t.hero.badge}
               </motion.div>
               
               <motion.h1 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.1, duration: 0.6 }}
                 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-gray-900 leading-[1.1] mb-6"
               >
                 {t.hero.titlePart1}<span className="bg-gradient-to-r from-[#531FFF] via-[#7B4DFF] to-[#3B82F6] bg-clip-text text-transparent">{t.hero.titleHighlight}</span>{t.hero.titlePart2}
               </motion.h1>
               
               <motion.p 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.2, duration: 0.6 }}
                 className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto font-medium leading-relaxed mb-8"
               >
                 {t.hero.desc}
               </motion.p>

               <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.3, duration: 0.6 }}
                 className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10"
               >
                 <Link 
                   href="/register" 
                   className="w-full sm:w-auto px-8 py-4 bg-[#531FFF] text-white rounded-lg text-15 font-bold hover:bg-[#4314cc] transition-all shadow-lg shadow-[#531FFF]/25 hover:shadow-xl hover:shadow-[#531FFF]/30 flex items-center justify-center gap-2.5 group"
                 >
                   {t.hero.btnPrimary} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                 </Link>

                 <Link 
                   href="#features" 
                   className="w-full sm:w-auto px-8 py-4 bg-white border border-gray-200 text-gray-800 rounded-lg text-15 font-bold hover:bg-gray-50 hover:border-gray-300 transition-all shadow-xs flex items-center justify-center gap-2"
                 >
                   <Play className="w-4 h-4 text-[#531FFF] fill-current" /> {t.hero.btnSecondary}
                 </Link>
               </motion.div>

               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 transition={{ delay: 0.4, duration: 0.6 }}
                 className="flex items-center justify-center gap-6 text-sm text-gray-500 font-medium flex-wrap"
               >
                  <div className="flex items-center gap-1.5 text-gray-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {t.hero.trust1}
                  </div>
                  <span className="text-gray-300">•</span>
                  <div className="flex items-center gap-1.5 text-gray-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {t.hero.trust2}
                  </div>
                  <span className="text-gray-300">•</span>
                  <div className="flex items-center gap-1.5 text-gray-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {t.hero.trust3}
                  </div>
               </motion.div>
            </div>

            {/* Clean Hero Mockup Section */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="relative max-w-6xl mx-auto"
            >
               <div className="bg-white rounded-3xl border border-gray-200/80 shadow-[0_20px_60px_-15px_rgba(83,31,255,0.12)] overflow-hidden p-2 sm:p-4">
                 
                 <div className="flex items-center justify-between px-4 py-3 bg-gray-50/80 border-b border-gray-100 rounded-t-2xl">
                   <div className="flex items-center gap-2">
                     <div className="w-3 h-3 rounded-full bg-rose-400" />
                     <div className="w-3 h-3 rounded-full bg-amber-400" />
                     <div className="w-3 h-3 rounded-full bg-emerald-400" />
                   </div>
                   <div className="px-4 py-1 bg-white border border-gray-200 rounded-full text-xs font-semibold text-gray-500 shadow-xs flex items-center gap-2">
                     <Shield className="w-3 h-3 text-[#531FFF]" />
                     <span>https://quickschools.id/admin/dashboard</span>
                   </div>
                   <div className="w-12" />
                 </div>

                 <div className="bg-slate-50/60 p-4 sm:p-6 rounded-b-2xl grid grid-cols-1 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-[#531FFF] font-bold">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase">{t.hero.statsSiswa}</p>
                        <p className="text-xl font-extrabold text-gray-900">1,482</p>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase">{t.hero.statsPresensi}</p>
                        <p className="text-xl font-extrabold text-emerald-600">98.5%</p>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase">{t.hero.statsKelas}</p>
                        <p className="text-xl font-extrabold text-gray-900">42 {lang === 'id' ? 'Kelas' : 'Classes'}</p>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 font-bold">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase">{t.hero.statsSPP}</p>
                        <p className="text-xl font-extrabold text-gray-900">94.2%</p>
                      </div>
                    </div>

                    <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between min-h-[220px]">
                      <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                        <div>
                          <p className="text-xs font-extrabold text-[#531FFF] uppercase tracking-wider">{t.hero.grafikTitle}</p>
                          <p className="text-sm font-bold text-gray-900">{t.hero.grafikSub}</p>
                        </div>
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg">Realtime</span>
                      </div>
                      <div className="h-32 w-full pt-4 relative flex items-end justify-between gap-2">
                         {[65, 78, 85, 92, 88, 96, 94, 98, 95, 99].map((val, idx) => (
                           <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                             <div 
                               style={{ height: `${val}%` }} 
                               className="w-full bg-gradient-to-t from-[#531FFF]/30 to-[#531FFF] rounded-t-lg transition-all group-hover:bg-[#4314cc]" 
                             />
                           </div>
                         ))}
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
                      <div>
                        <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">{t.hero.liveBadge}</p>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2.5 p-2 bg-emerald-50/60 rounded-xl border border-emerald-100">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            <div className="overflow-hidden">
                              <p className="text-xs font-bold text-gray-900 truncate">Ahmad Rizqi (10 IPA 1)</p>
                              <p className="text-[10px] text-emerald-700 font-semibold">98.5% Match • 06:45 WIB</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 p-2 bg-purple-50/60 rounded-xl border border-purple-100">
                            <div className="w-2 h-2 rounded-full bg-[#531FFF]" />
                            <div className="overflow-hidden">
                              <p className="text-xs font-bold text-gray-900 truncate">Siti Nurhaliza (11 IPS 2)</p>
                              <p className="text-[10px] text-[#531FFF] font-semibold">99.1% Match • 06:48 WIB</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] text-gray-400 text-center block pt-2 font-medium">GPS Verification Active</span>
                    </div>
                 </div>
               </div>

               <motion.div 
                 animate={{ y: [0, -8, 0] }}
                 transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                 className="absolute -left-6 top-1/3 bg-white p-4 rounded-2xl shadow-xl border border-gray-100 hidden xl:flex items-center gap-3 z-20"
               >
                 <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-[#531FFF]">
                   <Bot className="w-5 h-5" />
                 </div>
                 <div>
                   <p className="text-xs font-bold text-gray-900">{t.hero.aiScheduleTitle}</p>
                   <p className="text-[11px] text-gray-500 font-medium">{t.hero.aiScheduleDesc}</p>
                 </div>
               </motion.div>

               <motion.div 
                 animate={{ y: [0, 8, 0] }}
                 transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                 className="absolute -right-6 bottom-10 bg-white p-4 rounded-2xl shadow-xl border border-gray-100 hidden xl:flex items-center gap-3 z-20"
               >
                 <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                   <ShieldCheck className="w-5 h-5" />
                 </div>
                 <div>
                   <p className="text-xs font-bold text-gray-900">{t.hero.securityTitle}</p>
                   <p className="text-[11px] text-gray-500 font-medium">{t.hero.securityDesc}</p>
                 </div>
               </motion.div>
            </motion.div>
         </div>
      </section>

      {/* Trusted By Section */}
      <section className="py-14 border-y border-gray-100 bg-white">
        <div className="max-w-[1400px] mx-auto px-6">
          <p className="text-center text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-8">
            {t.trustedBy}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-10 lg:gap-16 opacity-70 hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2 cursor-pointer">
              <ShieldCheck className="w-7 h-7 text-blue-700" />
              <span className="font-bold text-base text-gray-800">SMA LABSCHOOL<br/><span className="text-[9px] text-gray-500 tracking-wider block -mt-1">JAKARTA</span></span>
            </div>
            <div className="flex items-center gap-2 cursor-pointer">
               <div className="w-7 h-7 rounded bg-red-700 flex items-center justify-center text-white font-serif font-bold italic text-sm">B</div>
               <span className="font-bold text-base text-gray-800">BINUS<br/><span className="text-[9px] text-gray-500 tracking-wider block -mt-1">SCHOOL</span></span>
            </div>
            <div className="flex items-center gap-2 cursor-pointer">
               <Globe2 className="w-7 h-7 text-emerald-700" />
               <span className="font-bold text-base text-gray-800">Al-Azhar<br/><span className="text-[9px] text-gray-500 tracking-wider block -mt-1">Kelapa Gading</span></span>
            </div>
            <div className="flex items-center gap-2 cursor-pointer">
               <GraduationCap className="w-7 h-7 text-purple-700" />
               <span className="font-bold text-base text-gray-800 uppercase">Global Jaya<br/><span className="text-[9px] text-gray-500 tracking-widest block -mt-1">S C H O O L</span></span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Features Section */}
      <section className="bg-slate-50/50 py-24 sm:py-32" id="features">
        <div className="max-w-[1400px] mx-auto px-6">
           <div className="text-center max-w-3xl mx-auto mb-20">
             <div className="inline-flex px-4 py-1.5 bg-[#F3F0FF] text-[#531FFF] border border-[#531FFF]/20 text-xs font-extrabold tracking-wider uppercase rounded-full mb-4">
               {t.features.badge}
             </div>
             <h2 className="text-3xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-5">
               {t.features.title}
             </h2>
             <p className="text-base sm:text-lg text-gray-600 font-medium">
               {t.features.desc}
             </p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {[
               { icon: CheckSquare, title: t.features.f1Title, desc: t.features.f1Desc },
               { icon: User, title: t.features.f2Title, desc: t.features.f2Desc },
               { icon: Calendar, title: t.features.f3Title, desc: t.features.f3Desc },
               { icon: CreditCard, title: t.features.f4Title, desc: t.features.f4Desc },
               { icon: MessageCircle, title: t.features.f5Title, desc: t.features.f5Desc },
               { icon: LineChart, title: t.features.f6Title, desc: t.features.f6Desc },
             ].map((f, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  key={i} 
                  className="bg-white border border-gray-200/80 p-8 rounded-3xl shadow-xs hover:shadow-xl hover:border-[#531FFF]/30 transition-all duration-300 group flex flex-col justify-between"
                >
                   <div>
                     <div className="w-14 h-14 rounded-2xl bg-[#F3F0FF] flex items-center justify-center mb-6 text-[#531FFF] group-hover:scale-110 group-hover:bg-[#531FFF] group-hover:text-white transition-all">
                       <f.icon className="w-7 h-7" strokeWidth={2} />
                     </div>
                     <h3 className="text-xl font-bold text-gray-900 mb-3">{f.title}</h3>
                     <p className="text-sm font-medium text-gray-600 leading-relaxed">
                       {f.desc}
                     </p>
                   </div>
                   <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-1 text-xs font-bold text-[#531FFF] group-hover:translate-x-1 transition-transform">
                     <span>{t.features.more}</span>
                     <ChevronRight className="w-3.5 h-3.5" />
                   </div>
                </motion.div>
             ))}
           </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="bg-white py-24 sm:py-32" id="pricing">
         <div className="max-w-[1400px] mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
               <div className="inline-flex px-4 py-1.5 bg-[#F3F0FF] text-[#531FFF] border border-[#531FFF]/20 text-xs font-extrabold tracking-wider uppercase rounded-full mb-4">
                 {t.pricing.badge}
               </div>
               <h2 className="text-3xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
                 {t.pricing.title}
               </h2>
               <p className="text-base text-gray-600 font-medium">
                 {t.pricing.desc}
               </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
               {/* Starter */}
               <div className="border border-gray-200 rounded-3xl p-8 bg-white shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{t.pricing.p1Name}</h3>
                    <p className="text-xs font-semibold text-gray-500 mt-1 mb-6">{t.pricing.p1Desc}</p>
                    <div className="flex items-baseline gap-1 mb-6">
                       <span className="text-4xl font-extrabold text-gray-900">{t.pricing.p1Price}</span>
                       <span className="text-xs font-bold text-gray-500">{t.pricing.p1Unit}</span>
                    </div>
                    <ul className="space-y-3.5 mb-8 text-xs font-semibold text-gray-700">
                       {[
                         lang === 'id' ? "Hingga 150 Siswa" : "Up to 150 Students", 
                         lang === 'id' ? "Absensi GPS Standard" : "Standard GPS Attendance", 
                         lang === 'id' ? "Manajemen Data Siswa" : "Student Bio-data Management", 
                         lang === 'id' ? "Laporan Rekap Bulanan" : "Monthly Summary Reports"
                       ].map((item, i) => (
                          <li key={i} className="flex gap-2.5 items-center">
                             <Check className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={3} />
                             <span>{item}</span>
                          </li>
                       ))}
                    </ul>
                  </div>
                  <button className="w-full py-3.5 rounded-xl border-2 border-gray-200 text-gray-800 font-bold text-sm hover:bg-gray-50 transition-colors">
                    {t.pricing.p1Btn}
                  </button>
               </div>

               {/* Pro (Most Popular) */}
               <div className="border-2 border-[#531FFF] rounded-3xl p-8 bg-white shadow-2xl relative flex flex-col justify-between transform lg:-translate-y-2">
                  <div className="absolute -top-4 right-8 bg-[#531FFF] text-white px-3.5 py-1 rounded-full text-xs font-extrabold tracking-wide uppercase shadow-md">
                    {t.pricing.p2Badge}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{t.pricing.p2Name}</h3>
                    <p className="text-xs font-semibold text-gray-500 mt-1 mb-6">{t.pricing.p2Desc}</p>
                    <div className="flex items-baseline gap-1 mb-6">
                       <span className="text-4xl font-extrabold text-gray-900">{t.pricing.p2Price}</span>
                       <span className="text-xs font-bold text-gray-500">{t.pricing.p2Unit}</span>
                    </div>
                    <ul className="space-y-3.5 mb-8 text-xs font-semibold text-gray-800">
                       {[
                         lang === 'id' ? "Hingga 1.000 Siswa" : "Up to 1,000 Students", 
                         lang === 'id' ? "Presensi AI Face Recognition" : "AI Face Recognition Attendance", 
                         lang === 'id' ? "AI Generator Jadwal Otomatis" : "Automated AI Timetabling", 
                         lang === 'id' ? "Sistem Pembayaran SPP Digital" : "Digital Fee & Invoicing System", 
                         lang === 'id' ? "Dukungan Prioritas 24/7" : "24/7 Priority Support"
                       ].map((item, i) => (
                          <li key={i} className="flex gap-2.5 items-center">
                             <Check className="w-4 h-4 text-[#531FFF] shrink-0" strokeWidth={3} />
                             <span>{item}</span>
                          </li>
                       ))}
                    </ul>
                  </div>
                  <button className="w-full py-3.5 rounded-xl bg-[#531FFF] text-white font-bold text-sm shadow-lg shadow-[#531FFF]/30 hover:bg-[#4314cc] transition-colors">
                    {t.pricing.p2Btn}
                  </button>
               </div>

               {/* Enterprise */}
               <div className="border border-gray-200 rounded-3xl p-8 bg-white shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{t.pricing.p3Name}</h3>
                    <p className="text-xs font-semibold text-gray-500 mt-1 mb-6">{t.pricing.p3Desc}</p>
                    <div className="flex items-baseline gap-1 mb-6">
                       <span className="text-3xl font-extrabold text-gray-900">{t.pricing.p3Price}</span>
                    </div>
                    <ul className="space-y-3.5 mb-8 text-xs font-semibold text-gray-700">
                       {[
                         lang === 'id' ? "Jumlah Siswa Tanpa Batas" : "Unlimited Students", 
                         lang === 'id' ? "Kustomisasi Server & Integrasi" : "Custom Server & API Integrations", 
                         lang === 'id' ? "Dedicated Account Manager" : "Dedicated Account Manager", 
                         lang === 'id' ? "SLA Garansi 99.9% Uptime" : "SLA 99.9% Uptime Guarantee"
                       ].map((item, i) => (
                          <li key={i} className="flex gap-2.5 items-center">
                             <Check className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={3} />
                             <span>{item}</span>
                          </li>
                       ))}
                    </ul>
                  </div>
                  <button className="w-full py-3.5 rounded-xl border border-gray-200 text-gray-800 font-bold text-sm hover:bg-gray-50 transition-colors">
                    {t.pricing.p3Btn}
                  </button>
               </div>
            </div>
         </div>
      </section>

      {/* CTA Pre-Footer */}
      <section className="bg-white px-6 pb-20">
         <div className="max-w-[1400px] mx-auto bg-gradient-to-r from-[#531FFF] to-[#7B4DFF] rounded-3xl p-10 lg:p-16 text-white flex flex-col lg:flex-row items-center justify-between gap-8 shadow-2xl">
            <div className="max-w-xl text-center lg:text-left">
               <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-4">
                 {t.cta.title}
               </h2>
               <p className="text-sm sm:text-base text-white/80 font-medium mb-8">
                 {t.cta.desc}
               </p>
               <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Link href="/register" className="px-8 py-3.5 bg-white text-[#531FFF] rounded-lg font-bold text-sm shadow-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                    {t.cta.btn} <ArrowRight className="w-4 h-4" />
                  </Link>
               </div>
            </div>
            
            <div className="w-full lg:w-auto flex justify-center">
              <div className="p-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-center">
                <p className="text-3xl font-extrabold mb-1">500+</p>
                <p className="text-xs font-semibold text-white/80">{t.cta.stat}</p>
              </div>
            </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 pt-16 pb-12 text-gray-400 text-xs">
         <div className="max-w-[1400px] mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div>
               <div className="flex items-center gap-2.5 mb-4">
                 <div className="w-8 h-8 rounded-lg bg-[#531FFF] flex items-center justify-center text-white">
                   <Zap className="w-4 h-4" />
                 </div>
                 <span className="font-bold text-base text-white">Quick Schools</span>
               </div>
               <p className="text-xs leading-relaxed text-gray-400">
                 {t.footer.tagline}
               </p>
            </div>
            
            <div>
               <h4 className="font-bold text-white mb-4">{t.footer.col1}</h4>
               <ul className="space-y-2.5">
                  <li><a href="#features" className="hover:text-white transition-colors">{lang === 'id' ? 'Absensi AI Wajah' : 'AI Face Attendance'}</a></li>
                  <li><a href="#features" className="hover:text-white transition-colors">{lang === 'id' ? 'Jadwal Pelajaran AI' : 'AI Class Timetable'}</a></li>
                  <li><a href="#pricing" className="hover:text-white transition-colors">{lang === 'id' ? 'Harga Paket' : 'Pricing Plans'}</a></li>
               </ul>
            </div>

            <div>
               <h4 className="font-bold text-white mb-4">{t.footer.col2}</h4>
               <ul className="space-y-2.5">
                  <li><a href="#" className="hover:text-white transition-colors">{lang === 'id' ? 'Tentang Kami' : 'About Us'}</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">{lang === 'id' ? 'Kontak Support' : 'Support Contact'}</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">{lang === 'id' ? 'Kebijakan Privasi' : 'Privacy Policy'}</a></li>
               </ul>
            </div>

            <div>
               <h4 className="font-bold text-white mb-4">{t.footer.col3}</h4>
               <p className="text-xs text-gray-400">Email: support@quickschools.id</p>
               <p className="text-xs text-gray-400 mt-1">Jakarta, Indonesia</p>
            </div>
         </div>
         
         <div className="max-w-[1400px] mx-auto px-6 pt-8 border-t border-gray-800 text-center font-medium">
            © {new Date().getFullYear()} {t.footer.rights}
         </div>
      </footer>
    </div>
  );
}
