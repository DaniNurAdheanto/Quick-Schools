"use client";

import React from "react";
import {
  FileText,
  PieChart,
  BarChart3,
  ShieldCheck,
  ArrowDownLeft,
  ArrowUpRight
} from "lucide-react";
import FeatureSubpageLayout, { FeatureSubpageData } from "@/components/landing/feature-subpage-layout";

const T: { id: FeatureSubpageData; en: FeatureSubpageData } = {
  id: {
    badge: "Modul Laporan Keuangan",
    h1a: "Laporan Keuangan Sekolah",
    h1b: "Akurat, Transparan & Otomatis",
    desc: "Sistem pembukuan dan rekap arus kas terpadu untuk mencatat pemasukan, pengeluaran operasional, dan laporan keuangan sekolah secara real-time.",
    cta1: "Mulai Gratis Sekarang",
    cta2: "Buka Laporan Keuangan",
    featBadge: "Fitur Keuangan",
    featTitle: "Solusi Manajemen Arus Kas & Pembukuan Sekolah",
    feats: [
      { icon: ArrowDownLeft, title: "Pencatatan Pemasukan Kas", desc: "Rekam otomatis penerimaan SPP, dana BOS, sumbangan yayasan, dan pemasukan lainnya." },
      { icon: ArrowUpRight, title: "Pencatatan Pengeluaran", desc: "Catat belanja operasional, gaji, pemeliharaan fasilitas, dan kegiatan sekolah per pos anggaran." },
      { icon: PieChart, title: "Rekap Arus Kas Real-Time", desc: "Dashboard mutasi kas masuk, keluar, dan saldo akhir sekolah terupdate seketika." },
      { icon: FileText, title: "Laporan Keuangan Periodik", desc: "Susun laporan bulanan, semesteran, dan tahunan siap cetak dan siap dipertanggungjawabkan." },
      { icon: BarChart3, title: "Monitoring Saldo Kas", desc: "Pantau posisi saldo kas bank dan kas tunai sekolah secara transparan dan akuntabel." },
      { icon: ShieldCheck, title: "Bukti Transaksi & Audit Trail", desc: "Setiap transaksi terekam dengan timestamp, nomor bukti, dan penanggung jawab." },
    ],
    workBadge: "Alur Kerja",
    workTitle: "4 Langkah Pengelolaan Keuangan",
    workSteps: [
      { n: "01", title: "Kategorisasi Pos Anggaran", desc: "Tentukan kategori pos penerimaan dan pengeluaran sesuai standar yayasan/sekolah." },
      { n: "02", title: "Input Transaksi Harian", desc: "Bendahara mencatat transaksi pemasukan atau pengeluaran beserta dokumen pendukung." },
      { n: "03", title: "Kalkulasi Otomatis", desc: "Sistem otomatis menghitung saldo kas, akumulasi bulanan, dan grafik tren arus kas." },
      { n: "04", title: "Ekspor & Pertanggungjawaban", desc: "Cetak rekap laporan keuangan ke format PDF/Excel untuk kepala sekolah dan yayasan." },
    ],
    benefitBadge: "Keunggulan",
    benefitTitle: "Keuntungan Menggunakan Quick Schools",
    benefits: [
      "Menggantikan pembukuan manual Excel yang rentan rumus error dan selisih",
      "Penerimaan dari modul SPP otomatis tercatat ke dalam kas masuk sekolah",
      "Kepala sekolah dan pengurus yayasan dapat memantau saldo kas kapan saja",
      "Format laporan rapi dan terstandarisasi untuk keperluan rapat evaluasi",
      "Riwayat pembukuan multi-tahun tersimpan aman di database cloud",
      "Meningkatkan transparansi dan akuntabilitas tata kelola dana sekolah",
    ],
    ctaBannerTitle: "Wujudkan Tata Kelola Keuangan Sekolah yang Sehat",
    ctaBannerDesc: "Kelola kas masuk, belanja operasional, dan laporan pertanggungjawaban secara profesional dengan Quick Schools.",
    ctaBannerBtn: "Daftar Gratis Sekarang",
  },
  en: {
    badge: "Financial Reports Module",
    h1a: "School Financial Reports",
    h1b: "Accurate, Transparent & Automated",
    desc: "Integrated ledger and cashflow summary system to log incoming revenue, operational expenses, and institutional financial statements in real time.",
    cta1: "Start Free Now",
    cta2: "Open Financial Reports",
    featBadge: "Finance Features",
    featTitle: "School Cashflow & Ledger Management Solution",
    feats: [
      { icon: ArrowDownLeft, title: "Cash Inflow Tracking", desc: "Automatic recording of tuition collections, government subsidies, and donor contributions." },
      { icon: ArrowUpRight, title: "Operational Expenditure", desc: "Track staff payroll, facility maintenance, and department budgets by allocation category." },
      { icon: PieChart, title: "Real-Time Cashflow Dashboard", desc: "Instant ledger updating for debit/credit operations, liquid capital, and ending balances." },
      { icon: FileText, title: "Periodic Financial Reports", desc: "Exportable monthly, semester, and fiscal-year balance sheets ready for board reviews." },
      { icon: BarChart3, title: "Bank & Vault Monitoring", desc: "Track digital accounts, petty cash vaults, and settlement statuses in full transparency." },
      { icon: ShieldCheck, title: "Audit Trail & Receipts", desc: "Every transaction is securely preserved with chronological timestamps and responsible officers." },
    ],
    workBadge: "Workflow",
    workTitle: "4 Steps to Financial Governance",
    workSteps: [
      { n: "01", title: "Budget Categorization", desc: "Configure custom ledger codes matching foundation financial standards." },
      { n: "02", title: "Daily Transaction Entry", desc: "Bursars log receivables or disbursements with digital attachments." },
      { n: "03", title: "Automated Balancing", desc: "The platform calculates running balances, charts, and variances automatically." },
      { n: "04", title: "Export & Board Review", desc: "Print comprehensive PDF/Excel executive balance statements in seconds." },
    ],
    benefitBadge: "Benefits",
    benefitTitle: "Advantages of Quick Schools Financial OS",
    benefits: [
      "Eliminates vulnerable offline spreadsheets and formula corruption risks",
      "Direct integration: tuition payments immediately flow into institutional revenue",
      "Executive portal gives principals and board members on-demand balance audits",
      "Standardized accounting statement formats for regulatory and foundation compliance",
      "Secure cloud persistence with multi-year archives and rollback logs",
      "Reinforces institutional integrity and fiduciary transparency across departments",
    ],
    ctaBannerTitle: "Elevate Your School's Financial Health & Integrity",
    ctaBannerDesc: "Oversee receivables, operational expenses, and executive reporting with Quick Schools.",
    ctaBannerBtn: "Register Free Now",
  },
};

function KeuanganMockup() {
  const transactions = [
    { desc: "Penerimaan SPP Kelas 10 & 11 (Termin 1)", type: "IN", amount: "+ Rp 84.500.000", date: "14 Sep 2026", cat: "SPP Siswa" },
    { desc: "Pengadaan Buku Pegangan Kurikulum Baru", type: "OUT", amount: "- Rp 18.250.000", date: "12 Sep 2026", cat: "Sarpras" },
    { desc: "Pemeliharaan AC & Jaringan Komputer Lab", type: "OUT", amount: "- Rp 6.800.000", date: "10 Sep 2026", cat: "Operasional" },
    { desc: "Dana Bantuan Operasional Sekolah (BOS)", type: "IN", amount: "+ Rp 125.000.000", date: "05 Sep 2026", cat: "BOS Reguler" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Top bar */}
      <div className="bg-gradient-to-r from-[#531FFF] to-[#6D3DFF] px-5 py-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-purple-200 uppercase tracking-wider">Laporan Kas Sekolah</p>
            <p className="text-xs font-black text-white">Saldo Kas: Rp 482.950.000</p>
          </div>
        </div>
        <span className="bg-white/20 px-2.5 py-1 rounded-md text-[11px] font-bold backdrop-blur-xs">
          September 2026
        </span>
      </div>

      {/* Feed list */}
      <div className="p-4 space-y-2.5 bg-slate-50/50">
        {transactions.map((tx, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-2xs hover:border-[#531FFF]/20 transition-all"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  tx.type === "IN" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                }`}
              >
                {tx.type === "IN" ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate">{tx.desc}</p>
                <p className="text-[11px] text-gray-500 font-medium">
                  {tx.date} · <span className="text-[#531FFF] font-semibold">{tx.cat}</span>
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <p className={`text-xs font-black ${tx.type === "IN" ? "text-emerald-700" : "text-gray-900"}`}>
                {tx.amount}
              </p>
              <span className="text-[9px] font-bold text-gray-400 uppercase">
                {tx.type === "IN" ? "Kas Masuk" : "Kas Keluar"}
              </span>
            </div>
          </div>
        ))}

        <div className="mt-2 p-3 bg-white rounded-xl border border-gray-200/80 flex items-center justify-between text-xs">
          <span className="font-semibold text-gray-600">Surplus Bersih Bulan Ini</span>
          <span className="font-extrabold text-emerald-600">+ Rp 184.450.000</span>
        </div>
      </div>
    </div>
  );
}

export default function KeuanganPage() {
  return (
    <FeatureSubpageLayout
      moduleKey="keuangan"
      translations={T}
      mockup={<KeuanganMockup />}
      dashboardHref="/financial-reports"
      icon={FileText}
    />
  );
}
