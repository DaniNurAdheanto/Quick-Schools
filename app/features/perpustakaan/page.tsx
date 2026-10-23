"use client";

import React from "react";
import {
  BookMarked,
  BookOpen,
  Search,
  RefreshCw,
  BarChart2,
  Users,
  ClipboardList
} from "lucide-react";
import FeatureSubpageLayout, { FeatureSubpageData } from "@/components/landing/feature-subpage-layout";

const T: { id: FeatureSubpageData; en: FeatureSubpageData } = {
  id: {
    badge: "Modul Perpustakaan Digital",
    h1a: "Perpustakaan Sekolah",
    h1b: "Serba Digital & Terorganisir",
    desc: "Kelola koleksi buku, proses sirkulasi peminjaman, dan pengembalian buku secara digital. Pantau stok dan histori peminjaman siswa secara real-time.",
    cta1: "Mulai Gratis Sekarang",
    cta2: "Buka Modul Perpustakaan",
    featBadge: "Fitur Perpustakaan",
    featTitle: "Pengelolaan Perpustakaan yang Modern & Efisien",
    feats: [
      { icon: BookOpen, title: "Katalog Buku Digital", desc: "Kelola katalog koleksi buku lengkap dengan kategori, kode ISBN, dan jumlah stok." },
      { icon: Search, title: "Pencarian Koleksi Cepat", desc: "Siswa dan guru bisa cari buku berdasarkan judul, penulis, atau kategori dengan cepat." },
      { icon: ClipboardList, title: "Manajemen Peminjaman", desc: "Proses peminjaman dan pengembalian buku dengan pencatatan tanggal otomatis." },
      { icon: RefreshCw, title: "Perpanjangan & Reminder", desc: "Sistem kirim notifikasi jatuh tempo dan proses perpanjangan peminjaman." },
      { icon: Users, title: "Histori per Siswa", desc: "Rekap riwayat peminjaman lengkap per siswa beserta status pengembalian." },
      { icon: BarChart2, title: "Laporan Sirkulasi", desc: "Statistik buku paling banyak dipinjam, stok kritis, dan tren peminjaman." },
    ],
    workBadge: "Alur Sirkulasi",
    workTitle: "Dari Cari Buku Hingga Pengembalian",
    workSteps: [
      { n: "01", title: "Cari Koleksi Buku", desc: "Siswa cari buku yang tersedia melalui katalog digital perpustakaan sekolah." },
      { n: "02", title: "Pinjam & Catat Digital", desc: "Petugas proses peminjaman, sistem catat tanggal pinjam dan jatuh tempo." },
      { n: "03", title: "Notifikasi Jatuh Tempo", desc: "Sistem otomatis kirim reminder H-3 sebelum batas pengembalian buku." },
      { n: "04", title: "Kembalikan & Update Stok", desc: "Setelah dikembalikan, stok otomatis terupdate di katalog seketika." },
    ],
    benefitBadge: "Keunggulan",
    benefitTitle: "Manfaat Perpustakaan Digital Quick Schools",
    benefits: [
      "Menggantikan buku besar peminjaman manual yang rentan robek dan hilang",
      "Stok buku dan ketersediaan judul selalu terupdate secara real-time",
      "Pengingat jatuh tempo otomatis mencegah keterlambatan pengembalian",
      "Histori peminjaman siswa tersimpan rapi untuk apresiasi literasi",
      "Laporan statistik sirkulasi buku siap unduh untuk evaluasi pengadaan",
      "Mendukung program literasi sekolah dengan integrasi data siswa",
    ],
    ctaBannerTitle: "Digitalisasi Perpustakaan Sekolah Anda Hari Ini",
    ctaBannerDesc: "Wujudkan perpustakaan yang rapi, modern, dan mudah diakses seluruh siswa.",
    ctaBannerBtn: "Daftar Gratis Sekarang",
  },
  en: {
    badge: "Digital Library Module",
    h1a: "School Digital Library",
    h1b: "Organized & Modern",
    desc: "Manage book collections, process circulation loans, and returns digitally. Monitor stock levels and student reading history in real time.",
    cta1: "Start Free Now",
    cta2: "Open Library Module",
    featBadge: "Library Features",
    featTitle: "Modern & Efficient Library Management",
    feats: [
      { icon: BookOpen, title: "Digital Book Catalog", desc: "Manage complete book collection catalog with categories, ISBN codes, and stock counts." },
      { icon: Search, title: "Instant Catalog Search", desc: "Students and teachers can search books by title, author, or category quickly." },
      { icon: ClipboardList, title: "Loan & Return Circulation", desc: "Process book loans and returns with automated date tracking and barcodes." },
      { icon: RefreshCw, title: "Automated Renewal", desc: "System sends due date notifications and processes loan extensions seamlessly." },
      { icon: Users, title: "Per-Student Reading History", desc: "Complete borrowing history per student with return and penalty tracking." },
      { icon: BarChart2, title: "Circulation Analytics", desc: "Statistical reports on most borrowed books, low stocks, and readership trends." },
    ],
    workBadge: "Workflow",
    workTitle: "From Book Discovery to Return",
    workSteps: [
      { n: "01", title: "Search Catalog", desc: "Student searches for available books through the digital catalog." },
      { n: "02", title: "Borrow & Log", desc: "Librarian processes loan, system records borrow date and due date." },
      { n: "03", title: "Due Date Notification", desc: "System auto-sends reminder 3 days before the return deadline." },
      { n: "04", title: "Return & Restock", desc: "After return, stock is automatically updated in the catalog." },
    ],
    benefitBadge: "Benefits",
    benefitTitle: "Advantages of Quick Schools Digital Library",
    benefits: [
      "Eliminates vulnerable manual paper logbooks and lost return cards",
      "Real-time visibility into shelf availability and borrowed copies",
      "Automated SMS/WhatsApp due-date alerts preventing late return fines",
      "Persistent student literacy tracking powering reading award programs",
      "Exportable circulation analytics to justify annual budget procurements",
      "Encourages school-wide literacy culture with seamless digital lookups",
    ],
    ctaBannerTitle: "Digitize Your School Library Operations",
    ctaBannerDesc: "Create an accessible, modern, and transparent library ecosystem with Quick Schools.",
    ctaBannerBtn: "Register Free Now",
  },
};

function PerpusMockup() {
  const books = [
    { title: "Laskar Pelangi", author: "Andrea Hirata", cat: "Fiksi", status: "Tersedia", sb: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { title: "Fisika Dasar Jilid 1", author: "Halliday & Resnick", cat: "Sains", status: "Dipinjam", sb: "bg-amber-50 text-amber-700 border-amber-200" },
    { title: "Bumi Manusia", author: "Pramoedya Ananta Toer", cat: "Sastra", status: "Tersedia", sb: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { title: "Matematika Diskrit", author: "Rinaldi Munir", cat: "Matematika", status: "Dipinjam", sb: "bg-amber-50 text-amber-700 border-amber-200" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-[#531FFF] to-[#6D3DFF] px-5 py-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <BookMarked className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-purple-200 uppercase tracking-wider">Koleksi & Sirkulasi Buku</p>
            <p className="text-xs font-black text-white">Perpustakaan Digital Quick Schools</p>
          </div>
        </div>
        <span className="bg-white/20 px-2.5 py-1 rounded-md text-[11px] font-bold backdrop-blur-xs">
          3.450 Judul
        </span>
      </div>

      {/* Book list */}
      <div className="p-4 space-y-2.5 bg-slate-50/50">
        {books.map((b, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-2xs hover:border-[#531FFF]/20 transition-all"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#531FFF] flex items-center justify-center font-bold text-xs shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate">{b.title}</p>
                <p className="text-[11px] text-gray-500 font-medium">
                  {b.author} · <span className="text-[#531FFF] font-semibold">{b.cat}</span>
                </p>
              </div>
            </div>

            <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${b.sb}`}>
              {b.status}
            </span>
          </div>
        ))}

        <div className="mt-2 p-3 bg-white rounded-xl border border-gray-200/80 flex items-center justify-between text-xs">
          <span className="font-semibold text-gray-600">Peminjaman Aktif Minggu Ini</span>
          <span className="font-extrabold text-[#531FFF]">342 Transaksi Sirkulasi</span>
        </div>
      </div>
    </div>
  );
}

export default function PerpustakaanPage() {
  return (
    <FeatureSubpageLayout
      moduleKey="perpustakaan"
      translations={T}
      mockup={<PerpusMockup />}
      dashboardHref="/dashboard"
      icon={BookMarked}
    />
  );
}
