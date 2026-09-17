"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  UserCheck, ArrowRight, Check,
  MapPin, Clock, ShieldCheck, Smartphone, BarChart2,
  CheckCircle2
} from "lucide-react";

const T = {
  id: {
    badge: "Modul Absensi Siswa & Guru",
    h1a: "Presensi Sekolah Akurat",
    h1b: "Bebas Titip Absen",
    desc: "Sistem absensi berbasis validasi lokasi radius GPS (Geofence) sekolah dan pencatatan kehadiran real-time untuk seluruh siswa dan dewan guru.",
    cta1: "Mulai Gratis Sekarang",
    cta2: "Buka Absensi",
    featBadge: "Fitur Presensi",
    featTitle: "Sistem Absensi Lengkap & Terpercaya",
    feats: [
      { icon: MapPin, title: "Validasi GPS Geofence", desc: "Siswa dan guru hanya bisa presensi saat berada dalam radius koordinat lokasi sekolah." },
      { icon: Clock, title: "Pencatatan Real-Time", desc: "Waktu check-in dan check-out tercatat langsung ke sistem detik itu juga tanpa jeda." },
      { icon: ShieldCheck, title: "Anti Titip Absen", desc: "Validasi lokasi perangkat dan sesi login mencegah kecurangan presensi." },
      { icon: UserCheck, title: "Presensi Guru & Staf", desc: "Modul khusus absensi tenaga pendidik dan kependidikan dengan laporan jam kerja." },
      { icon: Smartphone, title: "Akses Fleksibel Mobile", desc: "Dapat diakses melalui browser smartphone, tablet, maupun komputer ruang piket." },
      { icon: BarChart2, title: "Rekap & Ekspor Otomatis", desc: "Rekap harian, mingguan, bulanan, dan semester siap cetak ke format PDF atau Excel." },
    ],
    workBadge: "Alur Presensi",
    workTitle: "Cara Kerja Absensi Geofence",
    workSteps: [
      { n: "01", title: "Buka Portal Absensi", desc: "Siswa atau guru membuka portal Quick Schools melalui perangkat saat tiba di sekolah." },
      { n: "02", title: "Deteksi Koordinat GPS", desc: "Sistem memverifikasi posisi GPS perangkat terhadap titik koordinat dan radius sekolah." },
      { n: "03", title: "Pencatatan Otomatis", desc: "Status Hadir, Terlambat, atau Pulang otomatis dicatat dengan waktu presisi." },
      { n: "04", title: "Sinkronisasi Dashboard", desc: "Admin, wali kelas, dan orang tua dapat langsung melihat rekap kehadiran secara live." },
    ],
    benefitBadge: "Keunggulan",
    benefitTitle: "Manfaat Sistem Absensi Quick Schools",
    benefits: [
      "Validasi GPS akurat sesuai radius geofence yang diatur admin di profil sekolah",
      "Mencegah titip absen dan manipulasi kehadiran siswa maupun guru",
      "Rekap kehadiran harian kelas terbit otomatis tanpa perlu hitung manual",
      "Terintegrasi langsung ke sistem penilaian sikap dan cetak rapor digital",
      "Hemat waktu guru piket dalam mendata siswa yang hadir atau terlambat",
      "Data tersimpan aman di cloud Firebase dengan riwayat per semester",
    ],
    ctaBannerTitle: "Tingkatkan Kedisiplinan Sekolah Anda",
    ctaBannerDesc: "Kelola absensi siswa dan guru dengan mudah, cepat, dan transparan bersama Quick Schools.",
    ctaBannerBtn: "Daftar Gratis Sekarang",
  },
  en: {
    badge: "Student & Teacher Attendance Module",
    h1a: "Accurate School Attendance",
    h1b: "Zero Proxy Check-Ins",
    desc: "Attendance system with school GPS geofence radius validation and real-time check-in logging for all students and teaching staff.",
    cta1: "Start Free Now",
    cta2: "Open Attendance",
    featBadge: "Attendance Features",
    featTitle: "Complete & Reliable Attendance Solution",
    feats: [
      { icon: MapPin, title: "GPS Geofence Validation", desc: "Check-in is only permitted when user is physically within the configured school radius." },
      { icon: Clock, title: "Real-Time Timestamp", desc: "Clock-in and clock-out times are immediately synced to the database with no delay." },
      { icon: ShieldCheck, title: "Anti-Fraud Security", desc: "Device location validation and single-session login prevent proxy attendance." },
      { icon: UserCheck, title: "Teacher & Staff Module", desc: "Dedicated teacher attendance system with work hour tracking and recap reports." },
      { icon: Smartphone, title: "Mobile & Tablet Ready", desc: "Accessible from any mobile phone browser, tablet, or front-desk school station." },
      { icon: BarChart2, title: "Automated Reports & Export", desc: "Daily, weekly, and semester recaps ready to print or export to Excel/PDF." },
    ],
    workBadge: "Workflow",
    workTitle: "How Geofence Attendance Works",
    workSteps: [
      { n: "01", title: "Open Attendance Portal", desc: "Students or teachers open the Quick Schools attendance page upon arriving at school." },
      { n: "02", title: "Verify GPS Location", desc: "The system verifies current GPS coordinates against the school geofence perimeter." },
      { n: "03", title: "Instant Record", desc: "Present, Late, or Departure statuses are registered with precision timestamps." },
      { n: "04", title: "Dashboard Sync", desc: "Admins, homeroom teachers, and parents immediately see attendance metrics." },
    ],
    benefitBadge: "Benefits",
    benefitTitle: "Advantages of Quick Schools Attendance",
    benefits: [
      "Precise GPS validation based on admin-defined radius in school settings",
      "Eliminates proxy attendance and fraudulent time entries",
      "Automated daily classroom recaps without manual tallying",
      "Direct integration into conduct grading and digital report cards",
      "Saves hours of administration time for duty teachers each morning",
      "Secure cloud storage with full multi-year semester archives",
    ],
    ctaBannerTitle: "Upgrade School Discipline & Punctuality",
    ctaBannerDesc: "Manage student and teacher attendance with complete transparency and ease with Quick Schools.",
    ctaBannerBtn: "Register Free Now",
  },
};

function AbsensiMockup() {
  return (
    <div style={{ backgroundColor: "white", borderRadius: 24, border: "1px solid #f3f4f6", boxShadow: "0 25px 50px -12px rgba(83,31,255,0.15), 0 0 0 1px rgba(83,31,255,0.06)", overflow: "hidden" }}>
      {/* Top bar */}
      <div style={{ background: "linear-gradient(135deg, #531FFF 0%, #6D3DFF 100%)", padding: "20px 24px", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#34d399", animation: "pulse 2s infinite" }} />
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#DDD6FF", textTransform: "uppercase", letterSpacing: "0.08em" }}>Live Presensi Radius Geofence</p>
              <p style={{ fontSize: 14, fontWeight: 800 }}>Senin, 15 September 2026 — 06:52 WIB</p>
            </div>
          </div>
          <div style={{ backgroundColor: "rgba(255,255,255,0.18)", padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
            Radius: 100m
          </div>
        </div>
      </div>

      {/* Feed */}
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10, backgroundColor: "#FAFBFF" }}>
        {[
          { name: "Ahmad Rizqi Pratama", class: "10 IPA 1", time: "06:45 WIB", dist: "18m dari gerbang", status: "HADIR", ok: true },
          { name: "Siti Nurhaliza", class: "11 IPS 2", time: "06:48 WIB", dist: "32m dari gerbang", status: "HADIR", ok: true },
          { name: "Budi Santoso", class: "12 IPA 3", time: "06:51 WIB", dist: "15m dari gerbang", status: "HADIR", ok: true },
          { name: "Dewi Rahayu Putri", class: "10 IPS 1", time: "06:52 WIB", dist: "44m dari gerbang", status: "HADIR", ok: true },
        ].map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", backgroundColor: "white", borderRadius: 14, border: "1px solid #f3f4f6", boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "#F3F0FF", display: "flex", alignItems: "center", justifyContent: "center", color: "#531FFF", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
              {s.name[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</p>
              <p style={{ fontSize: 11, color: "#6B7280", fontWeight: 500 }}>{s.class} · <span style={{ color: "#059669" }}>✓ {s.dist}</span></p>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#374151" }}>{s.time}</p>
              <span style={{ fontSize: 10, fontWeight: 800, color: "#059669", backgroundColor: "#ECFDF5", padding: "2px 8px", borderRadius: 6 }}>
                {s.status}
              </span>
            </div>
          </div>
        ))}

        <div style={{ marginTop: 6, padding: "12px 16px", backgroundColor: "white", borderRadius: 12, border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#6B7280" }}>Total Hadir Hari Ini</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: "#531FFF" }}>1.189 / 1.248 Siswa (95.3%)</span>
        </div>
      </div>
    </div>
  );
}

export default function AbsensiPage() {
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
                <UserCheck style={{ width: 14, height: 14, color: "#531FFF" }} />
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
                <Link href="/attendance" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 28px", backgroundColor: "white", border: "1.5px solid #e5e7eb", color: "#374151", borderRadius: 16, fontSize: 15, fontWeight: 700, textDecoration: "none" }}>
                  {t.cta2}
                </Link>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#6B7280", fontWeight: 500 }}>
                <CheckCircle2 style={{ width: 16, height: 16, color: "#10b981" }} />
                <span>Radius sekolah diatur langsung di Pengaturan Profil Sekolah</span>
              </div>
            </div>

            <div>
              <AbsensiMockup />
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
              <AbsensiMockup />
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
