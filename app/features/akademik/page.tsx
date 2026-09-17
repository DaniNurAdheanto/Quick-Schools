"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  ArrowRight, CheckCircle2, BookOpen, Calendar,
  BarChart2, Users, Check,
  CalendarDays, Layers
} from "lucide-react";

const T = {
  id: {
    badge: "Modul Akademik & Jadwal",
    h1a: "Kelola Jadwal & Akademik",
    h1b: "Terpadu & Terstruktur",
    desc: "Platform manajemen kalender pendidikan, distribusi jadwal pelajaran per kelas, mata pelajaran, dan wali kelas dalam satu ekosistem terpadu.",
    cta1: "Mulai Gratis Sekarang",
    cta2: "Buka Jadwal Pelajaran",
    featBadge: "Fitur Akademik",
    featTitle: "Solusi Manajemen Kurikulum & Kelas",
    feats: [
      { icon: BookOpen, title: "Master Mata Pelajaran", desc: "Kelola daftar mata pelajaran, kode mapel, KKM, dan guru pengampu secara terpusat." },
      { icon: CalendarDays, title: "Kalender Akademik", desc: "Penanggalan kegiatan belajar, agenda sekolah, libur semester, dan jadwal ujian resmi." },
      { icon: Calendar, title: "Jadwal Pelajaran per Kelas", desc: "Pengaturan jadwal harian dari Senin hingga Jumat/Sabtu per rombongan belajar." },
      { icon: Users, title: "Manajemen Rombel & Wali Kelas", desc: "Pengelompokan siswa ke dalam kelas serta penugasan guru sebagai wali kelas." },
      { icon: Layers, title: "Tahun Ajaran & Semester", desc: "Pengaturan tahun pelajaran aktif (Ganjil/Genap) dengan riwayat data tersimpan rapi." },
      { icon: BarChart2, title: "Monitoring Beban Ajar", desc: "Pemantauan distribusi jam mengajar setiap guru agar seimbang dan terpantau." },
    ],
    workBadge: "Alur Kerja",
    workTitle: "4 Langkah Pengaturan Akademik",
    workSteps: [
      { n: "01", title: "Setup Mata Pelajaran & Guru", desc: "Input data mata pelajaran dan tentukan guru pengampu untuk tiap bidang studi." },
      { n: "02", title: "Atur Rombongan Belajar", desc: "Tentukan tingkatan kelas (X, XI, XII) dan tunjuk dewan guru sebagai wali kelas." },
      { n: "03", title: "Susun Jadwal Pelajaran", desc: "Tentukan jam pelajaran, hari, dan ruangan untuk tiap kelas tanpa bentrok." },
      { n: "04", title: "Publikasi ke Siswa & Guru", desc: "Jadwal dan kalender langsung dapat diakses dari dashboard siswa dan pendidik." },
    ],
    benefitBadge: "Keunggulan",
    benefitTitle: "Manfaat Manajemen Akademik Quick Schools",
    benefits: [
      "Jadwal pelajaran tersinkronisasi otomatis ke portal guru dan siswa",
      "Kalender akademik interaktif memudahkan perencanaan kegiatan sekolah",
      "Wali kelas memiliki ruang kerja khusus untuk memantau rombongan belajar",
      "Pembaruan jadwal langsung tampil seketika tanpa perlu cetak ulang lembaran",
      "Mencegah jadwal guru ganda pada waktu yang bersamaan",
      "Data akademik terintegrasi dengan modul absensi harian dan rekap nilai",
    ],
    ctaBannerTitle: "Mulai Digitalisasi Akademik Sekolah Anda",
    ctaBannerDesc: "Satu sistem untuk mengelola seluruh jadwal, kelas, dan kurikulum sekolah modern.",
    ctaBannerBtn: "Daftar Gratis Sekarang",
  },
  en: {
    badge: "Academic & Schedule Module",
    h1a: "Manage Schedules & Academics",
    h1b: "Structured & Integrated",
    desc: "Comprehensive platform for academic calendars, class schedule distribution, subjects, and homeroom assignments in one system.",
    cta1: "Start Free Now",
    cta2: "Open Class Schedule",
    featBadge: "Academic Features",
    featTitle: "Curriculum & Classroom Management Solution",
    feats: [
      { icon: BookOpen, title: "Master Subjects", desc: "Manage subject catalogs, course codes, criteria, and assigned teachers centrally." },
      { icon: CalendarDays, title: "Academic Calendar", desc: "Institutional timeline for learning days, exams, events, and semester breaks." },
      { icon: Calendar, title: "Per-Class Timetable", desc: "Daily schedule setup from Monday to Friday/Saturday for each study group." },
      { icon: Users, title: "Classes & Homeroom", desc: "Organize student rosters and assign dedicated faculty as homeroom teachers." },
      { icon: Layers, title: "Academic Years & Terms", desc: "Configure active school years and semesters (Odd/Even) with persistent archives." },
      { icon: BarChart2, title: "Teaching Load Monitor", desc: "Audit teacher workloads to ensure balanced and compliant teaching hours." },
    ],
    workBadge: "Workflow",
    workTitle: "4 Steps to Academic Setup",
    workSteps: [
      { n: "01", title: "Configure Subjects & Faculty", desc: "Enter subject directories and assign qualified educators to each discipline." },
      { n: "02", title: "Structure Study Groups", desc: "Define grade levels and designate experienced teachers as homeroom supervisors." },
      { n: "03", title: "Assemble Timetable", desc: "Schedule course periods and classroom assignments without scheduling overlaps." },
      { n: "04", title: "Publish Live", desc: "Timetables immediately reflect on student dashboards and faculty portals." },
    ],
    benefitBadge: "Benefits",
    benefitTitle: "Advantages of Quick Schools Academic Engine",
    benefits: [
      "Real-time synchronized timetables across student and staff devices",
      "Interactive academic calendars for efficient institution-wide planning",
      "Dedicated workspace for homeroom teachers to track student cohorts",
      "Paperless updates eliminate re-printing costs on schedule revisions",
      "Prevents teacher and classroom double-booking conflicts",
      "Direct integration into daily attendance validation and grade books",
    ],
    ctaBannerTitle: "Transform Your School's Academic Operations",
    ctaBannerDesc: "One single platform to organize timetables, classes, and modern curricula.",
    ctaBannerBtn: "Register Free Now",
  },
};

function AkademikMockup() {
  const schedule = [
    { time: "07:00 - 08:30", subject: "Matematika Peminatan", teacher: "Drs. Budi Santoso", room: "Ruang 10-A", active: true },
    { time: "08:30 - 10:00", subject: "Fisika Modern", teacher: "Ir. Hendra Wijaya", room: "Lab Fisika", active: false },
    { time: "10:15 - 11:45", subject: "Bahasa Inggris Lanjutan", teacher: "Sarah Jenkins, M.Ed", room: "Ruang 10-A", active: false },
    { time: "12:30 - 14:00", subject: "Teknologi Informasi", teacher: "Danur Adhi, M.Kom", room: "Lab Komputer 1", active: false },
  ];

  return (
    <div style={{ backgroundColor: "white", borderRadius: 24, border: "1px solid #f3f4f6", boxShadow: "0 25px 50px -12px rgba(83,31,255,0.15), 0 0 0 1px rgba(83,31,255,0.06)", overflow: "hidden" }}>
      <div style={{ background: "linear-gradient(135deg, #531FFF 0%, #6D3DFF 100%)", padding: "20px 24px", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Calendar style={{ width: 18, height: 18, color: "white" }} />
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#DDD6FF", textTransform: "uppercase", letterSpacing: "0.08em" }}>Jadwal Hari Ini</p>
              <p style={{ fontSize: 14, fontWeight: 800 }}>Kelas 10 IPA 1 · Semester Ganjil</p>
            </div>
          </div>
          <div style={{ backgroundColor: "rgba(255,255,255,0.18)", padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
            Senin
          </div>
        </div>
      </div>

      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10, backgroundColor: "#FAFBFF" }}>
        {schedule.map((item, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "12px 16px",
              backgroundColor: "white",
              borderRadius: 14,
              border: item.active ? "1.5px solid #531FFF" : "1px solid #f3f4f6",
              boxShadow: item.active ? "0 4px 12px rgba(83,31,255,0.1)" : "0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ textAlign: "center", minWidth: 80, borderRight: "1px solid #f3f4f6", paddingRight: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: item.active ? "#531FFF" : "#374151" }}>{item.time}</p>
              {item.active && <span style={{ fontSize: 9, fontWeight: 800, color: "white", backgroundColor: "#531FFF", padding: "1px 6px", borderRadius: 4 }}>Sedang Berjalan</span>}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.subject}</p>
              <p style={{ fontSize: 11, color: "#6B7280", fontWeight: 500 }}>{item.teacher} · <span style={{ color: "#531FFF", fontWeight: 600 }}>{item.room}</span></p>
            </div>

            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: item.active ? "#531FFF" : "#E5E7EB" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AkademikPage() {
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
                <Calendar style={{ width: 14, height: 14, color: "#531FFF" }} />
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
                <Link href="/schedule" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 28px", backgroundColor: "white", border: "1.5px solid #e5e7eb", color: "#374151", borderRadius: 16, fontSize: 15, fontWeight: 700, textDecoration: "none" }}>
                  {t.cta2}
                </Link>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#6B7280", fontWeight: 500 }}>
                <CheckCircle2 style={{ width: 16, height: 16, color: "#10b981" }} />
                <span>Terintegrasi dengan modul Kalender Akademik dan Pengaturan Kelas</span>
              </div>
            </div>

            <div>
              <AkademikMockup />
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
              <AkademikMockup />
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
