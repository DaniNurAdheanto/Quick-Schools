"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { BookMarked, ArrowRight, Check, ChevronRight, BookOpen, Search, RefreshCw, BarChart2, Users, ClipboardList } from "lucide-react";

const T = {
  id: {
    badge: "Perpustakaan Digital", h1a: "Perpustakaan Sekolah", h1b: "Serba Digital",
    desc: "Kelola koleksi buku, proses peminjaman, dan pengembalian buku secara digital. Pantau stok dan histori peminjaman siswa secara real-time.",
    cta1: "Mulai Gratis", cta2: "Lihat Demo",
    featBadge: "Fitur Perpustakaan", featTitle: "Pengelolaan Perpustakaan yang Modern & Efisien",
    feats: [
      { icon: BookOpen, title: "Katalog Buku Digital", desc: "Kelola katalog koleksi buku lengkap dengan kategori, kode ISBN, dan jumlah stok." },
      { icon: Search, title: "Pencarian Koleksi", desc: "Siswa dan guru bisa cari buku berdasarkan judul, penulis, atau kategori dengan cepat." },
      { icon: ClipboardList, title: "Manajemen Peminjaman", desc: "Proses peminjaman dan pengembalian buku dengan pencatatan tanggal otomatis." },
      { icon: RefreshCw, title: "Perpanjangan Otomatis", desc: "Sistem kirim notifikasi jatuh tempo dan proses perpanjangan peminjaman." },
      { icon: Users, title: "Histori per Siswa", desc: "Rekap riwayat peminjaman lengkap per siswa beserta status pengembalian." },
      { icon: BarChart2, title: "Laporan Sirkulasi", desc: "Statistik buku paling banyak dipinjam, stok kritis, dan tren peminjaman." },
    ],
    workBadge: "Alur Peminjaman", workTitle: "Dari Cari Buku Hingga Pengembalian",
    workSteps: [
      { n: "1", title: "Cari Koleksi", desc: "Siswa cari buku yang tersedia melalui katalog digital." },
      { n: "2", title: "Pinjam & Catat", desc: "Petugas proses peminjaman, sistem catat tanggal pinjam & jatuh tempo." },
      { n: "3", title: "Notifikasi Jatuh Tempo", desc: "Sistem otomatis kirim reminder H-3 sebelum batas pengembalian." },
      { n: "4", title: "Kembalikan & Update Stok", desc: "Setelah dikembalikan, stok otomatis terupdate di katalog." },
    ],
    benefitBadge: "Manfaat", benefits: ["Tidak ada lagi catatan manual", "Stok buku selalu update", "Notifikasi jatuh tempo otomatis", "Histori peminjaman lengkap", "Laporan sirkulasi real-time", "Pencarian koleksi cepat"],
    ctaBannerTitle: "Digitalisasi Perpustakaan Sekolah Anda", ctaBannerBtn: "Mulai Sekarang",
  },
  en: {
    badge: "Digital Library", h1a: "School Library", h1b: "Going Digital",
    desc: "Manage book collections, process loans, and returns digitally. Monitor stock and student borrowing history in real-time.",
    cta1: "Start Free", cta2: "Watch Demo",
    featBadge: "Library Features", featTitle: "Modern & Efficient Library Management",
    feats: [
      { icon: BookOpen, title: "Digital Book Catalog", desc: "Manage complete book collection catalog with categories, ISBN codes, and stock counts." },
      { icon: Search, title: "Collection Search", desc: "Students and teachers can search books by title, author, or category quickly." },
      { icon: ClipboardList, title: "Loan Management", desc: "Process book loans and returns with automatic date recording." },
      { icon: RefreshCw, title: "Auto Renewal", desc: "System sends due date notifications and processes loan extensions." },
      { icon: Users, title: "Per-Student History", desc: "Complete borrowing history per student with return status." },
      { icon: BarChart2, title: "Circulation Reports", desc: "Stats on most borrowed books, critical stock, and borrowing trends." },
    ],
    workBadge: "Borrowing Flow", workTitle: "From Book Search to Return",
    workSteps: [
      { n: "1", title: "Search Catalog", desc: "Student searches for available books through the digital catalog." },
      { n: "2", title: "Borrow & Record", desc: "Librarian processes loan, system records borrow date and due date." },
      { n: "3", title: "Due Date Notification", desc: "System auto-sends reminder 3 days before the return deadline." },
      { n: "4", title: "Return & Update Stock", desc: "After return, stock is automatically updated in the catalog." },
    ],
    benefitBadge: "Benefits", benefits: ["No more manual records", "Book stock always updated", "Automatic due date notifications", "Complete borrowing history", "Real-time circulation reports", "Fast collection search"],
    ctaBannerTitle: "Digitize Your School Library", ctaBannerBtn: "Start Now",
  },
};

import type { Variants } from "motion/react";
const fadeUp: Variants = { hidden: { opacity: 0, y: 24 }, show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.55, ease: "easeOut" } }) };

function PerpusMockup() {
  return (
    <div className="bg-white rounded-2xl shadow-2xl shadow-teal-200/40 border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-4">
        <p className="text-[11px] text-teal-100 font-semibold uppercase tracking-wider">Katalog Perpustakaan</p>
        <p className="text-[14px] font-bold text-white">250 Koleksi Buku Tersedia</p>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[{ l: "Total Buku", v: "1.248", c: "text-teal-600", bg: "bg-teal-50" }, { l: "Dipinjam", v: "87", c: "text-amber-600", bg: "bg-amber-50" }, { l: "Terlambat", v: "12", c: "text-red-500", bg: "bg-red-50" }].map((s, i) => (
            <div key={i} className={`${s.bg} rounded-xl p-3 text-center`}>
              <p className={`text-[18px] font-extrabold ${s.c}`}>{s.v}</p>
              <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">{s.l}</p>
            </div>
          ))}
        </div>
        <div className="space-y-2.5">
          {[
            { title: "Laskar Pelangi", author: "Andrea Hirata", cat: "Fiksi", status: "Tersedia", stock: 3, sc: "text-emerald-600", sb: "bg-emerald-50" },
            { title: "Fisika SMA Kelas 12", author: "Marthen Kanginan", cat: "Pelajaran", status: "Dipinjam", stock: 0, sc: "text-amber-600", sb: "bg-amber-50" },
            { title: "Bumi Manusia", author: "Pramoedya A.T.", cat: "Fiksi", status: "Tersedia", stock: 2, sc: "text-emerald-600", sb: "bg-emerald-50" },
            { title: "Matematika SMA Kelas 11", author: "Kemendikbud", cat: "Pelajaran", status: "Terlambat", stock: 1, sc: "text-red-500", sb: "bg-red-50" },
          ].map((b, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-10 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-teal-600" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-gray-800">{b.title}</p>
                  <p className="text-[10px] text-gray-400 font-semibold">{b.author} · {b.cat}</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold ${b.sc} ${b.sb} px-2.5 py-1 rounded-full shrink-0`}>{b.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PerpustakaanPage() {
  const [lang, setLang] = useState<"id" | "en">("id");
  useEffect(() => { const s = localStorage.getItem("qs_lang") as "id" | "en"; if (s === "id" || s === "en") setLang(s); }, []);
  const t = T[lang];

  return (
    <div>
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#ECFDF5] via-white to-[#F0FDFA]" />
        <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-teal-500/8 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle,#0D948818_1px,transparent_1px)] bg-[size:36px_36px]" />
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <div>
              <motion.div initial="hidden" animate="show" variants={fadeUp}
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-100 border border-teal-200/60 text-teal-700 text-[12px] font-extrabold rounded-xl mb-6">
                <BookMarked className="w-3.5 h-3.5" />{t.badge}
              </motion.div>
              <motion.h1 initial="hidden" animate="show" variants={fadeUp} custom={1}
                className="text-5xl sm:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight mb-6">
                {t.h1a}{" "}<span className="bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">{t.h1b}</span>
              </motion.h1>
              <motion.p initial="hidden" animate="show" variants={fadeUp} custom={2} className="text-lg text-gray-600 font-medium leading-relaxed mb-8 max-w-[500px]">{t.desc}</motion.p>
              <motion.div initial="hidden" animate="show" variants={fadeUp} custom={3} className="flex gap-4">
                <Link href="/register" className="flex items-center gap-2 px-7 py-3.5 bg-teal-600 text-white rounded-2xl text-[14px] font-bold hover:bg-teal-700 transition-all shadow-lg shadow-teal-500/30 group">
                  {t.cta1} <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link href="#features" className="flex items-center gap-2 px-7 py-3.5 bg-white border border-gray-200 text-gray-700 rounded-2xl text-[14px] font-bold hover:bg-gray-50 transition-all">{t.cta2}</Link>
              </motion.div>
            </div>
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.3 }}><PerpusMockup /></motion.div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-white" id="features">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex px-4 py-1.5 bg-teal-100 text-teal-700 text-[11px] font-extrabold uppercase tracking-widest rounded-full mb-4">{t.featBadge}</div>
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">{t.featTitle}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {t.feats.map((f, i) => (
              <motion.div key={i} initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} custom={i * 0.6}
                className="bg-white border border-gray-100 rounded-2xl p-6 hover:border-teal-200 hover:shadow-xl hover:shadow-teal-50 hover:-translate-y-1 transition-all duration-300 group">
                <div className="w-11 h-11 rounded-2xl bg-teal-50 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform"><f.icon className="w-5 h-5 text-teal-600" /></div>
                <h3 className="text-[15px] font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-[13px] text-gray-500 font-medium leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-gradient-to-br from-teal-50 to-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex px-4 py-1.5 bg-teal-100 text-teal-700 text-[11px] font-extrabold uppercase tracking-widest rounded-full mb-4">{t.workBadge}</div>
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">{t.workTitle}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {t.workSteps.map((s, i) => (
              <motion.div key={i} initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} custom={i * 0.7}
                className="relative bg-white rounded-2xl p-6 border border-teal-100 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white font-extrabold text-[15px] mb-5">{s.n}</div>
                {i < t.workSteps.length - 1 && <ChevronRight className="absolute top-8 -right-3.5 w-6 h-6 text-teal-300 hidden lg:block" />}
                <h3 className="text-[15px] font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-[13px] text-gray-500 font-medium">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}>
              <div className="inline-flex px-4 py-1.5 bg-teal-100 text-teal-700 text-[11px] font-extrabold uppercase tracking-widest rounded-full mb-4">{t.benefitBadge}</div>
              <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-8">{lang === "id" ? "Perpustakaan Rapi, Siswa Rajin Membaca" : "Organized Library, Students Love Reading"}</h2>
              <ul className="space-y-4">
                {t.benefits.map((b, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center shrink-0"><Check className="w-3.5 h-3.5 text-teal-600" strokeWidth={3} /></div>
                    <span className="text-[14px] font-semibold text-gray-700">{b}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}><PerpusMockup /></motion.div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-[#F0FDFA]">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-teal-600 to-emerald-600 rounded-3xl p-12 text-center shadow-2xl shadow-teal-500/25">
          <h2 className="text-4xl font-extrabold text-white mb-6">{t.ctaBannerTitle}</h2>
          <Link href="/register" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-teal-700 rounded-2xl text-[15px] font-bold hover:bg-teal-50 transition-all shadow-lg group">
            {t.ctaBannerBtn} <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </section>
    </div>
  );
}
