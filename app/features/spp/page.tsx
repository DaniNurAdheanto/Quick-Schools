"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  CreditCard, ArrowRight, Check, ChevronRight, Receipt,
  CheckCircle2, Bell, BarChart3, RefreshCw, SmartphoneNfc,
  Wallet, Sparkles, AlertCircle
} from "lucide-react";

const T = {
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
      { icon: Receipt, title: "Digital Invoicing", desc: "Auto-generate and organize monthly tuition fees for all active students." },
      { icon: CheckCircle2, title: "Real-Time Confirmation", desc: "Instantly register and verify student payments, flipping status to paid in real time." },
      { icon: BarChart3, title: "Arrears & Status Monitoring", desc: "Filter students by paid, pending, or overdue status across classrooms and terms." },
      { icon: Wallet, title: "Official Digital Receipts", desc: "Generate and print official verified digital receipts with school branding." },
      { icon: RefreshCw, title: "Monthly Auto Summaries", desc: "Cumulative monthly tuition revenue flows directly into school treasury records." },
      { icon: Bell, title: "Due Date Reminders", desc: "Integrates with announcements to notify parents of approaching payment deadlines." },
    ],
    workBadge: "Workflow",
    workTitle: "4 Steps to Effortless Tuition Control",
    workSteps: [
      { n: "01", title: "Define Fee Schedule", desc: "Set monthly rates per grade tier or academic year cohort in settings." },
      { n: "02", title: "Automated Monthly Bills", desc: "Student billing records populate at the start of each calendar month." },
      { n: "03", title: "Log & Confirm", desc: "Finance officers log incoming cash or transfer payments with instant confirmation." },
      { n: "04", title: "Instant Receipts & Ledgers", desc: "Receipts generate automatically while cashflow figures update live." },
    ],
    benefitBadge: "Benefits",
    benefitTitle: "Advantages of Quick Schools Tuition Module",
    benefits: [
      "Error-free, fully accountable payment ledgers with zero discrepancy",
      "Homeroom teachers and treasurers view real-time class payment summaries",
      "Instant printable digital receipts replace manual handwritten paper slips",
      "Clear overdue tracking enables proactive communication with guardians",
      "Direct integration into the school cashflow and financial reports module",
      "Complete historical payment archives preserved securely through graduation",
    ],
    ctaBannerTitle: "Streamline Tuition Collection Today",
    ctaBannerDesc: "Handle billing, payments, and financial accountability with Quick Schools.",
    ctaBannerBtn: "Register Free Now",
  },
};

function SPPMockup() {
  const transactions = [
    { name: "Ahmad Rizqi Pratama", class: "10 IPA 1", month: "September 2026", amount: "Rp 350.000", status: "LUNAS", date: "05 Sep 2026", isPaid: true },
    { name: "Siti Nurhaliza", class: "11 IPS 2", month: "September 2026", amount: "Rp 350.000", status: "LUNAS", date: "08 Sep 2026", isPaid: true },
    { name: "Budi Santoso", class: "12 IPA 3", month: "September 2026", amount: "Rp 350.000", status: "LUNAS", date: "10 Sep 2026", isPaid: true },
    { name: "Dewi Rahayu Putri", class: "10 IPS 1", month: "September 2026", amount: "Rp 350.000", status: "PENDING", date: "Tenggat 15 Sep", isPaid: false },
  ];

  return (
    <div style={{ backgroundColor: "white", borderRadius: 24, border: "1px solid #f3f4f6", boxShadow: "0 25px 50px -12px rgba(83,31,255,0.15), 0 0 0 1px rgba(83,31,255,0.06)", overflow: "hidden" }}>
      <div style={{ background: "linear-gradient(135deg, #531FFF 0%, #6D3DFF 100%)", padding: "20px 24px", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CreditCard style={{ width: 18, height: 18, color: "white" }} />
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#DDD6FF", textTransform: "uppercase", letterSpacing: "0.08em" }}>Rekap SPP Real-Time</p>
              <p style={{ fontSize: 14, fontWeight: 800 }}>Periode September 2026</p>
            </div>
          </div>
          <div style={{ backgroundColor: "rgba(255,255,255,0.18)", padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
            92% Terbayar
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
            <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: tx.isPaid ? "#ECFDF5" : "#FFFBEB", display: "flex", alignItems: "center", justifyContent: "center", color: tx.isPaid ? "#059669" : "#d97706", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
              {tx.name[0]}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tx.name}</p>
              <p style={{ fontSize: 11, color: "#6B7280", fontWeight: 500 }}>{tx.class} · {tx.date}</p>
            </div>

            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: "#111827" }}>{tx.amount}</p>
              <span style={{ fontSize: 10, fontWeight: 800, color: tx.isPaid ? "#059669" : "#d97706", backgroundColor: tx.isPaid ? "#ECFDF5" : "#FFFBEB", padding: "2px 8px", borderRadius: 6 }}>
                {tx.status}
              </span>
            </div>
          </div>
        ))}

        <div style={{ marginTop: 6, padding: "12px 16px", backgroundColor: "white", borderRadius: 12, border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#6B7280" }}>Total Terkumpul Bulan Ini</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: "#531FFF" }}>Rp 412.300.000</span>
        </div>
      </div>
    </div>
  );
}

export default function SPPPage() {
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
                <CreditCard style={{ width: 14, height: 14, color: "#531FFF" }} />
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
                <Link href="/admin/payments" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 28px", backgroundColor: "white", border: "1.5px solid #e5e7eb", color: "#374151", borderRadius: 16, fontSize: 15, fontWeight: 700, textDecoration: "none" }}>
                  {t.cta2}
                </Link>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#6B7280", fontWeight: 500 }}>
                <CheckCircle2 style={{ width: 16, height: 16, color: "#10b981" }} />
                <span>Terhubung langsung ke modul Laporan Keuangan sekolah</span>
              </div>
            </div>

            <div>
              <SPPMockup />
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
              <SPPMockup />
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
