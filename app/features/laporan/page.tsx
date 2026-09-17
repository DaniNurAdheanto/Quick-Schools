"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Award, ArrowRight, Check,
  TrendingUp, Download, PieChart,
  CheckCircle2, PenLine
} from "lucide-react";

const T = {
  id: {
    badge: "Modul Penilaian & Rapor Digital",
    h1a: "Penilaian & Rapor Digital",
    h1b: "Siap Cetak Otomatis",
    desc: "Kalkulasi nilai akhir siswa dari komponen tugas, UTS, dan UAS secara otomatis. Terbitkan rapor digital berstandar resmi siap cetak dan bagikan ke orang tua.",
    cta1: "Mulai Gratis Sekarang",
    cta2: "Buka Rapor Digital",
    featBadge: "Fitur Penilaian",
    featTitle: "Solusi Manajemen Nilai & Rapor Sekolah",
    feats: [
      { icon: PenLine, title: "Input Nilai Guru Terpadu", desc: "Guru mata pelajaran dapat memasukkan nilai tugas, ulangan harian, UTS, dan UAS secara terstruktur." },
      { icon: PieChart, title: "Kalkulasi Nilai Otomatis", desc: "Sistem otomatis mengkalkulasi nilai akhir, predikat huruf (A/B/C), dan capaian kompetensi." },
      { icon: Award, title: "Cetak Rapor Digital", desc: "Format rapor digital rapi sesuai standar kurikulum, lengkap dengan identitas sekolah dan tanda tangan." },
      { icon: TrendingUp, title: "Grafik Perkembangan Belajar", desc: "Visualisasi performa akademik siswa per mata pelajaran dan perbandingan antar semester." },
      { icon: CheckCircle2, title: "Validasi Wali Kelas", desc: "Wali kelas dapat meninjau catatan sikap, kehadiran siswa, dan ekstrakurikuler sebelum rapor dicetak." },
      { icon: Download, title: "Ekspor PDF Siap Bagikan", desc: "Cetak langsung per siswa atau unduh seluruh rapor satu kelas dalam format dokumen PDF resmi." },
    ],
    workBadge: "Alur Kerja",
    workTitle: "4 Langkah Penerbitan Rapor",
    workSteps: [
      { n: "01", title: "Guru Input Nilai Mapel", desc: "Guru menginput nilai harian, tugas mandiri, serta ujian tengah & akhir semester." },
      { n: "02", title: "Hitung Otomatis Sistem", desc: "Bobot penilaian dan KKM dihitung otomatis tanpa risiko kesalahan rumus manual." },
      { n: "03", title: "Catatan Wali & Presensi", desc: "Data kehadiran dari modul absensi dan catatan perkembangan siswa otomatis tersemat." },
      { n: "04", title: "Cetak & Distribusi Rapor", desc: "Rapor digital terbit dan siap dibagikan ke siswa serta orang tua saat pembagian rapor." },
    ],
    benefitBadge: "Keunggulan",
    benefitTitle: "Keuntungan Menggunakan Rapor Quick Schools",
    benefits: [
      "Menghemat hingga 80% waktu guru dan staf tata usaha pada masa pengolahan rapor",
      "Format cetak profesional berlogo institusi dan siap ditandatangani kepala sekolah",
      "Data absensi harian siswa otomatis tersinkronisasi ke dalam lembar rapor",
      "Mencegah selisih hitung nilai akhir dan peringkat kelas",
      "Orang tua dan siswa dapat melihat riwayat nilai secara transparan",
      "Arsip digital tersimpan permanen dan dapat dicetak ulang kapan saja",
    ],
    ctaBannerTitle: "Tingkatkan Efisiensi Penerbitan Rapor Sekolah",
    ctaBannerDesc: "Satu sistem untuk mengelola seluruh penilaian, rekapitulasi, dan rapor digital siswa.",
    ctaBannerBtn: "Daftar Gratis Sekarang",
  },
  en: {
    badge: "Grades & Digital Report Cards Module",
    h1a: "Assessment & Digital Cards",
    h1b: "Print-Ready & Automated",
    desc: "Automatically compute final student scores from assignments, midterm, and final exams. Publish official print-ready digital report cards for parents.",
    cta1: "Start Free Now",
    cta2: "Open Report Cards",
    featBadge: "Assessment Features",
    featTitle: "Comprehensive School Grading & Report Solution",
    feats: [
      { icon: PenLine, title: "Integrated Grade Input", desc: "Subject educators enter assignments, daily quizzes, midterms, and finals systematically." },
      { icon: PieChart, title: "Automated Computation", desc: "Calculates final weighted scores, letter grades (A/B/C), and competency achievements automatically." },
      { icon: Award, title: "Official Digital Report Cards", desc: "Official layout complying with curriculum guidelines, complete with institutional seal and signatures." },
      { icon: TrendingUp, title: "Academic Growth Analytics", desc: "Visual charts illustrating student learning trajectories per course across semesters." },
      { icon: CheckCircle2, title: "Homeroom Teacher Review", desc: "Homeroom supervisors review conduct remarks, attendance figures, and extracurricular merits." },
      { icon: Download, title: "Batch PDF Generation", desc: "Print individual cards directly or export the entire classroom batch in verified PDF format." },
    ],
    workBadge: "Workflow",
    workTitle: "4 Steps to Report Card Publishing",
    workSteps: [
      { n: "01", title: "Faculty Grade Entry", desc: "Educators submit continuous assessments, project marks, and semester exam scores." },
      { n: "02", title: "System Compilation", desc: "Component weights and passing thresholds calculate with zero manual formula risk." },
      { n: "03", title: "Attendance & Remarks", desc: "Attendance records from the geofence engine and conduct notes link automatically." },
      { n: "04", title: "Print & Distribute", desc: "Verified digital reports are ready for presentation to students and guardians." },
    ],
    benefitBadge: "Benefits",
    benefitTitle: "Advantages of Quick Schools Digital Report Cards",
    benefits: [
      "Saves up to 80% of faculty administrative workload during semester-end grading",
      "Clean institutional formatting ready for immediate printing and administrative archiving",
      "Daily attendance logs sync directly onto student performance transcripts",
      "Eliminates calculation discrepancies and inaccurate classroom ranking calculations",
      "Guardians and students gain transparent visibility into academic performance",
      "Permanent digital cloud archives allow immediate transcript reprints at any point",
    ],
    ctaBannerTitle: "Modernize Your School's Academic Transcripts",
    ctaBannerDesc: "Handle continuous assessments, grade computations, and digital report cards with Quick Schools.",
    ctaBannerBtn: "Register Free Now",
  },
};

function LaporanMockup() {
  const grades = [
    { mapel: "Matematika Peminatan", kkm: "75", tugas: "88", uts: "85", uas: "90", akhir: "88", pred: "A" },
    { mapel: "Bahasa Indonesia", kkm: "75", tugas: "85", uts: "82", uas: "86", akhir: "84", pred: "B+" },
    { mapel: "Bahasa Inggris Lanjutan", kkm: "75", tugas: "92", uts: "89", uas: "94", akhir: "92", pred: "A" },
    { mapel: "Fisika", kkm: "75", tugas: "80", uts: "78", uas: "85", akhir: "81", pred: "B" },
  ];

  return (
    <div style={{ backgroundColor: "white", borderRadius: 24, border: "1px solid #f3f4f6", boxShadow: "0 25px 50px -12px rgba(83,31,255,0.15), 0 0 0 1px rgba(83,31,255,0.06)", overflow: "hidden" }}>
      <div style={{ background: "linear-gradient(135deg, #531FFF 0%, #6D3DFF 100%)", padding: "20px 24px", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Award style={{ width: 18, height: 18, color: "white" }} />
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#DDD6FF", textTransform: "uppercase", letterSpacing: "0.08em" }}>Preview Rapor Digital</p>
              <p style={{ fontSize: 14, fontWeight: 800 }}>Ahmad Rizqi Pratama · 10 IPA 1</p>
            </div>
          </div>
          <div style={{ backgroundColor: "rgba(255,255,255,0.18)", padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
            Rata-rata: 86.25
          </div>
        </div>
      </div>

      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10, backgroundColor: "#FAFBFF" }}>
        {grades.map((g, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px",
              backgroundColor: "white",
              borderRadius: 14,
              border: "1px solid #f3f4f6",
              boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
            }}
          >
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{g.mapel}</p>
              <p style={{ fontSize: 11, color: "#6B7280", fontWeight: 500 }}>
                Tugas: {g.tugas} · UTS: {g.uts} · UAS: {g.uas}
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 14, fontWeight: 900, color: "#531FFF" }}>{g.akhir}</p>
                <p style={{ fontSize: 10, color: "#9CA3AF" }}>KKM: {g.kkm}</p>
              </div>
              <div style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: "#F3F0FF", display: "flex", alignItems: "center", justifyContent: "center", color: "#531FFF", fontWeight: 800, fontSize: 12 }}>
                {g.pred}
              </div>
            </div>
          </div>
        ))}

        <div style={{ marginTop: 6, padding: "12px 16px", backgroundColor: "white", borderRadius: 12, border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#6B7280" }}>Kehadiran: Hadir 98%, Sakit 2%</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: "#059669" }}>✓ Siap Cetak PDF</span>
        </div>
      </div>
    </div>
  );
}

export default function LaporanPage() {
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
                <Award style={{ width: 14, height: 14, color: "#531FFF" }} />
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
                <Link href="/report-cards" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 28px", backgroundColor: "white", border: "1.5px solid #e5e7eb", color: "#374151", borderRadius: 16, fontSize: 15, fontWeight: 700, textDecoration: "none" }}>
                  {t.cta2}
                </Link>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#6B7280", fontWeight: 500 }}>
                <CheckCircle2 style={{ width: 16, height: 16, color: "#10b981" }} />
                <span>Terhubung langsung dengan modul Input Nilai dan Absensi Siswa</span>
              </div>
            </div>

            <div>
              <LaporanMockup />
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
              <LaporanMockup />
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
