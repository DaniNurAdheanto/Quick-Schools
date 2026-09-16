"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  FileText, ArrowRight, Check, ChevronRight, TrendingUp,
  PieChart, DollarSign, BarChart3, ShieldCheck, Wallet,
  CheckCircle2, ArrowDownLeft, ArrowUpRight
} from "lucide-react";

const T = {
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
      { icon: ArrowDownLeft, title: "Income Logging", desc: "Automatically aggregate tuition receipts, government grants, donations, and auxiliary revenue." },
      { icon: ArrowUpRight, title: "Expenditure Tracking", desc: "Log operational expenditures, facility maintenance, events, and departmental supplies." },
      { icon: PieChart, title: "Real-Time Cashflow", desc: "Live dashboard tracking inflow, outflow, and net balance with immediate ledger balance updates." },
      { icon: FileText, title: "Periodic Financial Statements", desc: "Generate monthly, semester, and fiscal-year financial reports ready for board presentation." },
      { icon: BarChart3, title: "Cash Balance Monitoring", desc: "Track bank accounts and petty cash reserves transparently with zero reconciliation lag." },
      { icon: ShieldCheck, title: "Audit Trail & Proofs", desc: "Every transaction records timestamps, voucher IDs, and authorizing officer credentials." },
    ],
    workBadge: "Workflow",
    workTitle: "4 Steps to Financial Governance",
    workSteps: [
      { n: "01", title: "Define Ledger Categories", desc: "Configure revenue and cost codes to align with institutional accounting rules." },
      { n: "02", title: "Record Daily Entries", desc: "Treasurers post incoming and outgoing transactions with supporting receipt files." },
      { n: "03", title: "Automatic Computation", desc: "The engine reconciles balances, monthly aggregates, and variance calculations." },
      { n: "04", title: "Export & Report", desc: "Export compliant balance summaries to PDF or Excel for board review." },
    ],
    benefitBadge: "Benefits",
    benefitTitle: "Advantages of Quick Schools Finance",
    benefits: [
      "Replaces brittle manual spreadsheets with verified ledger tracking",
      "Tuition payments sync automatically into the central revenue register",
      "School directors and trustees can inspect cash reserves anytime securely",
      "Standardized reporting formats ready for institutional accreditation audits",
      "Multi-year fiscal history preserved securely in institutional cloud databases",
      "Promotes fiscal transparency and governance compliance across departments",
    ],
    ctaBannerTitle: "Achieve Fiscal Health & Accountability",
    ctaBannerDesc: "Handle school finances, audits, and ledgers effortlessly with Quick Schools.",
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
    <div style={{ backgroundColor: "white", borderRadius: 24, border: "1px solid #f3f4f6", boxShadow: "0 25px 50px -12px rgba(83,31,255,0.15), 0 0 0 1px rgba(83,31,255,0.06)", overflow: "hidden" }}>
      <div style={{ background: "linear-gradient(135deg, #531FFF 0%, #6D3DFF 100%)", padding: "20px 24px", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileText style={{ width: 18, height: 18, color: "white" }} />
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#DDD6FF", textTransform: "uppercase", letterSpacing: "0.08em" }}>Laporan Kas Sekolah</p>
              <p style={{ fontSize: 14, fontWeight: 800 }}>Saldo Kas: Rp 482.950.000</p>
            </div>
          </div>
          <div style={{ backgroundColor: "rgba(255,255,255,0.18)", padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
            September 2026
          </div>
        </div>
      </div>

      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10, backgroundColor: "#FAFBFF" }}>
        {transactions.map((tx, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 14px",
              backgroundColor: "white",
              borderRadius: 14,
              border: "1px solid #f3f4f6",
              boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: tx.type === "IN" ? "#ECFDF5" : "#FFF1F2", display: "flex", alignItems: "center", justifyContent: "center", color: tx.type === "IN" ? "#059669" : "#e11d48", flexShrink: 0 }}>
              {tx.type === "IN" ? <ArrowDownLeft style={{ width: 18, height: 18 }} /> : <ArrowUpRight style={{ width: 18, height: 18 }} />}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tx.desc}</p>
              <p style={{ fontSize: 11, color: "#6B7280", fontWeight: 500 }}>{tx.date} · <span style={{ color: "#531FFF" }}>{tx.cat}</span></p>
            </div>

            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: tx.type === "IN" ? "#059669" : "#111827" }}>{tx.amount}</p>
              <span style={{ fontSize: 9, fontWeight: 800, color: tx.type === "IN" ? "#059669" : "#e11d48", backgroundColor: tx.type === "IN" ? "#ECFDF5" : "#FFF1F2", padding: "2px 6px", borderRadius: 4 }}>
                {tx.type === "IN" ? "MASUK" : "KELUAR"}
              </span>
            </div>
          </div>
        ))}

        <div style={{ marginTop: 6, padding: "12px 16px", backgroundColor: "white", borderRadius: 12, border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#6B7280" }}>Surplus Bulan Berjalan</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: "#059669" }}>+ Rp 184.450.000</span>
        </div>
      </div>
    </div>
  );
}

export default function KeuanganPage() {
  const [lang, setLang] = useState<"id" | "en">("id");

  useEffect(() => {
    const saved = localStorage.getItem("qs_lang") as "id" | "en";
    if (saved === "id" || saved === "en") setLang(saved);
  }, []);

  const t = T[lang];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "white", color: "#111827" }}>
      {/* Hero */}
      <section style={{ position: "relative", paddingTop: 140, paddingBottom: 80, overflow: "hidden", background: "linear-gradient(135deg, #F3F0FF 0%, #FFFFFF 60%, #EEF2FF 100%)" }}>
        <div style={{ position: "absolute", top: 0, right: 0, width: 600, height: 600, background: "radial-gradient(circle, rgba(83,31,255,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(83,31,255,0.08) 1px, transparent 1px)", backgroundSize: "36px 36px", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 10, maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center" }} className="grid-cols-1 lg:grid-cols-2">
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", backgroundColor: "#F3F0FF", border: "1px solid rgba(83,31,255,0.25)", borderRadius: 12, marginBottom: 24 }}>
                <FileText style={{ width: 14, height: 14, color: "#531FFF" }} />
                <span style={{ fontSize: 12, fontWeight: 800, color: "#531FFF" }}>{t.badge}</span>
              </div>

              <h1 style={{ fontSize: "clamp(38px, 4.5vw, 56px)", fontWeight: 900, color: "#111827", lineHeight: 1.12, letterSpacing: "-0.03em", marginBottom: 20 }}>
                {t.h1a}{" "}
                <span style={{ background: "linear-gradient(135deg, #531FFF 0%, #7B4DFF 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  {t.h1b}
                </span>
              </h1>

              <p style={{ fontSize: 17, color: "#4B5563", lineHeight: 1.7, fontWeight: 500, marginBottom: 32, maxWidth: 520 }}>
                {t.desc}
              </p>

              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
                <Link href="/register" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "14px 32px", backgroundColor: "#531FFF", color: "white", borderRadius: 16, fontSize: 15, fontWeight: 700, textDecoration: "none", boxShadow: "0 8px 24px -4px rgba(83,31,255,0.4)", transition: "all 0.2s" }} className="hover:bg-[#4314cc]">
                  {t.cta1} <ArrowRight style={{ width: 16, height: 16 }} />
                </Link>
                <Link href="/admin/financial-reports" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 28px", backgroundColor: "white", border: "1.5px solid #e5e7eb", color: "#374151", borderRadius: 16, fontSize: 15, fontWeight: 700, textDecoration: "none" }}>
                  {t.cta2}
                </Link>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#6B7280", fontWeight: 500 }}>
                <CheckCircle2 style={{ width: 16, height: 16, color: "#10b981" }} />
                <span>Terintegrasi otomatis dengan penerimaan pembayaran SPP sekolah</span>
              </div>
            </div>

            <div>
              <KeuanganMockup />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: "96px 0", backgroundColor: "#FAFBFF" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 64px" }}>
            <div style={{ display: "inline-flex", padding: "6px 16px", backgroundColor: "#F3F0FF", border: "1px solid rgba(83,31,255,0.2)", borderRadius: 999, marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#531FFF", textTransform: "uppercase", letterSpacing: "0.12em" }}>{t.featBadge}</span>
            </div>
            <h2 style={{ fontSize: "clamp(28px, 3.5vw, 40px)", fontWeight: 900, color: "#111827", letterSpacing: "-0.02em" }}>{t.featTitle}</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
            {t.feats.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={i}
                  whileHover={{ y: -4, borderColor: "rgba(83,31,255,0.3)", boxShadow: "0 16px 32px -8px rgba(83,31,255,0.12)" }}
                  transition={{ duration: 0.2 }}
                  style={{ backgroundColor: "white", border: "1px solid #f3f4f6", borderRadius: 20, padding: 28, boxShadow: "0 2px 8px -4px rgba(0,0,0,0.05)", transition: "all 0.2s" }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "#F3F0FF", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                    <Icon style={{ width: 22, height: 22, color: "#531FFF" }} />
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 8 }}>{f.title}</h3>
                  <p style={{ fontSize: 14, color: "#6B7280", fontWeight: 500, lineHeight: 1.6 }}>{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section style={{ padding: "96px 0", backgroundColor: "white" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 64px" }}>
            <div style={{ display: "inline-flex", padding: "6px 16px", backgroundColor: "#F3F0FF", border: "1px solid rgba(83,31,255,0.2)", borderRadius: 999, marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#531FFF", textTransform: "uppercase", letterSpacing: "0.12em" }}>{t.workBadge}</span>
            </div>
            <h2 style={{ fontSize: "clamp(28px, 3.5vw, 40px)", fontWeight: 900, color: "#111827", letterSpacing: "-0.02em" }}>{t.workTitle}</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24 }}>
            {t.workSteps.map((s, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                style={{ background: "linear-gradient(135deg, rgba(243,240,255,0.5) 0%, white 100%)", border: "1px solid rgba(83,31,255,0.12)", borderRadius: 24, padding: 28 }}
              >
                <div style={{ fontSize: 36, fontWeight: 900, color: "#531FFF", opacity: 0.3, marginBottom: 12 }}>{s.n}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 8 }}>{s.title}</h3>
                <p style={{ fontSize: 13, color: "#6B7280", fontWeight: 500, lineHeight: 1.6 }}>{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section style={{ padding: "96px 0", backgroundColor: "#FAFBFF" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center" }} className="grid-cols-1 lg:grid-cols-2">
            <div>
              <div style={{ display: "inline-flex", padding: "6px 16px", backgroundColor: "#F3F0FF", border: "1px solid rgba(83,31,255,0.2)", borderRadius: 999, marginBottom: 16 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#531FFF", textTransform: "uppercase", letterSpacing: "0.12em" }}>{t.benefitBadge}</span>
              </div>
              <h2 style={{ fontSize: "clamp(28px, 3.5vw, 40px)", fontWeight: 900, color: "#111827", letterSpacing: "-0.02em", marginBottom: 28 }}>{t.benefitTitle}</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {t.benefits.map((b, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: "#F3F0FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                      <Check style={{ width: 13, height: 13, color: "#531FFF", strokeWidth: 3 }} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#374151", lineHeight: 1.5 }}>{b}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <KeuanganMockup />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "80px 24px", backgroundColor: "white" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", borderRadius: 32, background: "linear-gradient(135deg, #531FFF 0%, #6D3DFF 50%, #4314cc 100%)", padding: "64px 48px", textAlign: "center", boxShadow: "0 32px 80px -12px rgba(83,31,255,0.35)", color: "white" }}>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 900, marginBottom: 16 }}>{t.ctaBannerTitle}</h2>
          <p style={{ fontSize: 16, color: "#DDD6FF", fontWeight: 500, marginBottom: 32, maxWidth: 540, margin: "0 auto 32px" }}>{t.ctaBannerDesc}</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
            <Link href="/register" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "16px 36px", backgroundColor: "white", color: "#531FFF", borderRadius: 16, fontSize: 15, fontWeight: 700, textDecoration: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
              {t.ctaBannerBtn} <ArrowRight style={{ width: 16, height: 16 }} />
            </Link>
            <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "16px 32px", backgroundColor: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(255,255,255,0.25)", color: "white", borderRadius: 16, fontSize: 15, fontWeight: 700, textDecoration: "none" }}>
              {lang === "id" ? "Kembali ke Beranda" : "Back to Home"}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
