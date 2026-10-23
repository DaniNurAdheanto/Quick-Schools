"use client";

import React from "react";
import {
  CreditCard,
  Receipt,
  CheckCircle2,
  Bell,
  BarChart3,
  RefreshCw,
  Wallet
} from "lucide-react";
import FeatureSubpageLayout, { FeatureSubpageData } from "@/components/landing/feature-subpage-layout";

const T: { id: FeatureSubpageData; en: FeatureSubpageData } = {
  id: {
    badge: "Modul Pembayaran SPP",
    h1a: "Kelola Pembayaran SPP",
    h1b: "Rapi, Transparan & Otomatis",
    desc: "Sistem pencatatan tagihan dan pembayaran SPP digital terintegrasi. Pantau status pembayaran tiap siswa, rekap bulanan, dan kelola konfirmasi secara real-time.",
    cta1: "Mulai Gratis Sekarang",
    cta2: "Buka Pembayaran SPP",
    featBadge: "Fitur Pembayaran",
    featTitle: "Solusi Manajemen SPP & Tagihan Sekolah",
    feats: [
      { icon: Receipt, title: "Pencatatan Tagihan Digital", desc: "Buat dan rekam tagihan SPP bulanan untuk seluruh siswa secara otomatis dan terorganisir." },
      { icon: CheckCircle2, title: "Konfirmasi Real-Time", desc: "Konfirmasi pembayaran siswa langsung masuk ke sistem dan memperbarui status lunas seketika." },
      { icon: BarChart3, title: "Monitoring Status & Tunggakan", desc: "Pantau daftar siswa yang sudah lunas maupun yang memiliki tunggakan per kelas dan periode." },
      { icon: Wallet, title: "Kuitansi & Bukti Digital", desc: "Cetak atau unduh bukti pembayaran SPP resmi berlogo sekolah dalam hitungan detik." },
      { icon: RefreshCw, title: "Rekap Bulanan Otomatis", desc: "Total penerimaan SPP per bulan terakumulasi otomatis ke dalam rekapitulasi kas sekolah." },
      { icon: Bell, title: "Notifikasi Pengingat", desc: "Terhubung dengan sistem pengumuman untuk mengingatkan tenggat waktu pembayaran SPP." },
    ],
    workBadge: "Alur Kerja",
    workTitle: "4 Langkah Mudah Kelola SPP",
    workSteps: [
      { n: "01", title: "Atur Nominal SPP", desc: "Admin/bendahara menentukan tarif SPP bulanan sesuai jenjang kelas atau angkatan." },
      { n: "02", title: "Tagihan Terbit Otomatis", desc: "Daftar tagihan siswa aktif otomatis terbit setiap awal periode bulan berjalan." },
      { n: "03", title: "Input / Verifikasi Pembayaran", desc: "Petugas TU atau admin merekam pembayaran tunai maupun transfer yang diterima." },
      { n: "04", title: "Laporan & Kuitansi Instan", desc: "Status siswa otomatis lunas, kuitansi digital siap dicetak, dan kas sekolah terupdate." },
    ],
    benefitBadge: "Keunggulan",
    benefitTitle: "Keuntungan Menggunakan Modul SPP Quick Schools",
    benefits: [
      "Pencatatan keuangan SPP rapi, akuntabel, dan bebas selisih pembukuan",
      "Wali kelas dan bendahara dapat melihat rekap pembayaran kelas secara live",
      "Kuitansi resmi langsung terbit tanpa perlu tulis tangan manual",
      "Data tunggakan terpantau jelas sehingga tindak lanjut lebih cepat",
      "Terhubung langsung dengan laporan arus kas masuk di modul keuangan",
      "Riwayat pembayaran tersimpan aman hingga siswa lulus sekolah",
    ],
    ctaBannerTitle: "Tingkatkan Kelancaran Pembayaran SPP Sekolah",
    ctaBannerDesc: "Kelola tagihan, pembayaran, dan laporan SPP sekolah dengan sistem modern Quick Schools.",
    ctaBannerBtn: "Daftar Gratis Sekarang",
  },
  en: {
    badge: "Tuition (SPP) Payment Module",
    h1a: "Manage Tuition Payments",
    h1b: "Transparent & Automated",
    desc: "Integrated digital tuition invoicing and payment logging system. Track student payment statuses, monthly summaries, and confirmations in real time.",
    cta1: "Start Free Now",
    cta2: "Open Tuition Module",
    featBadge: "Tuition Features",
    featTitle: "Comprehensive School Tuition Solution",
    feats: [
      { icon: Receipt, title: "Automated Billing Generator", desc: "Generate monthly tuition fees for all active cohorts in structured batches." },
      { icon: CheckCircle2, title: "Instant Verification", desc: "Payment confirmations update student clearance statuses with zero ledger delay." },
      { icon: BarChart3, title: "Arrears & Collection Analytics", desc: "Track settled accounts and overdue balances by grade level and term." },
      { icon: Wallet, title: "Digital Stamped Receipts", desc: "Print or export official branded tuition payment receipts in seconds." },
      { icon: RefreshCw, title: "Automated Monthly Tally", desc: "All incoming tuition payments flow automatically into the institutional cash ledger." },
      { icon: Bell, title: "Gentle SMS / WhatsApp Alerts", desc: "Linked with circular notices to remind parents of upcoming payment windows." },
    ],
    workBadge: "Workflow",
    workTitle: "4 Steps to Frictionless Tuition Management",
    workSteps: [
      { n: "01", title: "Set Fee Tiers", desc: "Bursars configure base tuition rates by grade levels or cohort programs." },
      { n: "02", title: "Auto-Generate Invoices", desc: "Monthly billing ledger items issue automatically at the start of each month." },
      { n: "03", title: "Verify Payments", desc: "Finance officers reconcile cash, bank transfer, or payment gateway transactions." },
      { n: "04", title: "Instant Receipts & Reports", desc: "Clearance marks apply instantly, receipts print out, and school cashbook updates." },
    ],
    benefitBadge: "Benefits",
    benefitTitle: "Advantages of Quick Schools Tuition OS",
    benefits: [
      "Pristine tuition accounts free from manual mathematical ledger discrepancies",
      "Homeroom mentors and bursars audit class payment progress simultaneously",
      "Official institutional digital receipts generated without hand-writing booklets",
      "Delinquent account tracking enables proactive and respectful follow-ups",
      "Full automatic reconciliation into general financial inflow reports",
      "Permanent historical payment archives preserved through student graduation",
    ],
    ctaBannerTitle: "Streamline School Tuition Collection Today",
    ctaBannerDesc: "Manage billing, payments, and financial accountability with Quick Schools.",
    ctaBannerBtn: "Register Free Now",
  },
};

function SPPMockup() {
  const transactions = [
    { name: "Ahmad Rizqi Pratama", class: "10 IPA 1", month: "September 2026", amount: "Rp 350.000", status: "LUNAS", date: "05 Sep 2026", isPaid: true },
    { name: "Siti Nurhaliza", class: "11 IPS 2", month: "September 2026", amount: "Rp 350.000", status: "LUNAS", date: "08 Sep 2026", isPaid: true },
    { name: "Budi Santoso", class: "12 IPA 3", month: "September 2026", amount: "Rp 350.000", status: "LUNAS", date: "10 Sep 2026", isPaid: true },
    { name: "Dewi Rahayu Putri", class: "10 IPS 1", month: "September 2026", amount: "Rp 350.000", status: "BELUM LUNAS", date: "Tenggat 15 Sep", isPaid: false },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-[#531FFF] to-[#6D3DFF] px-5 py-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-purple-200 uppercase tracking-wider">Rekap SPP Real-Time</p>
            <p className="text-xs font-black text-white">Periode September 2026</p>
          </div>
        </div>
        <span className="bg-white/20 px-2.5 py-1 rounded-md text-[11px] font-bold backdrop-blur-xs">
          92% Terbayar
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
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                  tx.isPaid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                }`}
              >
                {tx.name[0]}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate">{tx.name}</p>
                <p className="text-[11px] text-gray-500 font-medium">
                  {tx.class} · {tx.date}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <p className="text-xs font-black text-gray-900">{tx.amount}</p>
              <span
                className={`text-[9.5px] font-black px-1.5 py-0.5 rounded border inline-block ${
                  tx.isPaid
                    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                    : "text-amber-700 bg-amber-50 border-amber-200"
                }`}
              >
                {tx.status}
              </span>
            </div>
          </div>
        ))}

        <div className="mt-2 p-3 bg-white rounded-xl border border-gray-200/80 flex items-center justify-between text-xs">
          <span className="font-semibold text-gray-600">Total SPP Terhimpun</span>
          <span className="font-extrabold text-[#531FFF]">Rp 412.300.000 (1.178 Siswa)</span>
        </div>
      </div>
    </div>
  );
}

export default function SPPPage() {
  return (
    <FeatureSubpageLayout
      moduleKey="spp"
      translations={T}
      mockup={<SPPMockup />}
      dashboardHref="/payments"
      icon={CreditCard}
    />
  );
}
