"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Bell, ArrowRight, Check, Megaphone,
  Users, Clock, FileText, CheckCircle2,
  Tag, ShieldCheck
} from "lucide-react";

const T = {
  id: {
    badge: "Modul Pengumuman Sekolah",
    h1a: "Sampaikan Informasi",
    h1b: "Cepat, Akurat & Terarah",
    desc: "Kirim pengumuman resmi sekolah langsung ke siswa, guru, dan orang tua. Dilengkapi penandaan prioritas, target audiens, dan arsip digital terpusat.",
    cta1: "Mulai Gratis Sekarang",
    cta2: "Buka Pengumuman",
    featBadge: "Fitur Unggulan",
    featTitle: "Sistem Pengumuman Terintegrasi Quick Schools",
    feats: [
      { icon: Megaphone, title: "Broadcast Pengumuman", desc: "Kirim pengumuman sekolah dalam satu klik ke seluruh warga sekolah secara real-time." },
      { icon: Users, title: "Target Audiens Tepat", desc: "Filter penerima berdasarkan peran: Semua Siswa, Guru & Staf, atau Orang Tua Siswa." },
      { icon: Tag, title: "Kategori & Label Prioritas", desc: "Tandai pengumuman Penting, Akademik, Keuangan, Libur, atau Kegiatan Sekolah." },
      { icon: Clock, title: "Penjadwalan Otomatis", desc: "Atur tanggal dan waktu tayang pengumuman agar terbit tepat sesuai jadwal kalender." },
      { icon: FileText, title: "Lampiran Dokumen", desc: "Sertakan surat edaran dinas, panduan PDF, atau gambar kegiatan pendukung." },
      { icon: ShieldCheck, title: "Arsip & Riwayat Digital", desc: "Semua pengumuman tersimpan rapi dan dapat ditelusuri kapan saja di portal." },
    ],
    workBadge: "Alur Kerja",
    workTitle: "4 Langkah Publikasi Pengumuman",
    workSteps: [
      { n: "01", title: "Buat Draf Pengumuman", desc: "Admin atau staf mengetik judul, isi pesan pengumuman, dan lampirkan file pendukung." },
      { n: "02", title: "Tentukan Kategori & Target", desc: "Pilih label (Penting/Akademik/SPP) dan tentukan audiens: siswa, guru, atau orang tua." },
      { n: "03", title: "Publikasi Real-Time", desc: "Pengumuman langsung tayang di dashboard siswa, portal guru, dan notifikasi orang tua." },
      { n: "04", title: "Pantau Respon & Arsip", desc: "Cek jumlah pembaca dan simpan riwayat pengumuman di database sekolah terpusat." },
    ],
    benefitBadge: "Keunggulan",
    benefitTitle: "Komunikasi Sekolah Tanpa Hambatan",
    benefits: [
      "Tidak ada lagi siswa atau wali murid yang ketinggalan info penting",
      "Notifikasi langsung muncul di dashboard penerima secara real-time",
      "Format seragam dan resmi menjaga kredibilitas informasi institusi",
      "Pengumuman SPP dan jadwal ujian terhubung dengan modul sistem",
      "Hemat kertas surat edaran dengan digitalisasi ramah lingkungan",
      "Admin dapat mengedit atau menghapus pengumuman sewaktu-waktu",
    ],
    ctaBannerTitle: "Tingkatkan Efektivitas Komunikasi Sekolah Anda",
    ctaBannerDesc: "Gabung sekarang dan rasakan kemudahan mengelola pengumuman dan operasional sekolah dengan Quick Schools.",
    ctaBannerBtn: "Daftar Gratis Sekarang",
  },
  en: {
    badge: "School Announcements Module",
    h1a: "Deliver Information",
    h1b: "Fast, Accurate & Targeted",
    desc: "Send official school announcements directly to students, teachers, and parents with priority tags, targeted audiences, and a centralized digital archive.",
    cta1: "Start Free Now",
    cta2: "Open Announcements",
    featBadge: "Key Features",
    featTitle: "Quick Schools Integrated Announcement System",
    feats: [
      { icon: Megaphone, title: "Broadcast Announcements", desc: "Send school-wide announcements in a single click in real-time." },
      { icon: Users, title: "Targeted Audience", desc: "Filter recipients by role: All Students, Teachers & Staff, or Parents." },
      { icon: Tag, title: "Priority & Category Tags", desc: "Tag announcements as Urgent, Academic, Financial, Holiday, or School Events." },
      { icon: Clock, title: "Automated Scheduling", desc: "Schedule publish dates and times to align with academic calendar deadlines." },
      { icon: FileText, title: "Document Attachments", desc: "Attach official circulars, PDF guidelines, or event posters easily." },
      { icon: ShieldCheck, title: "Digital History & Archive", desc: "All announcements are securely archived and searchable in the portal anytime." },
    ],
    workBadge: "Workflow",
    workTitle: "4 Steps to Publish Announcements",
    workSteps: [
      { n: "01", title: "Draft Announcement", desc: "Admin or staff enters the title, body content, and attaches supporting documents." },
      { n: "02", title: "Set Category & Target", desc: "Select tags (Urgent/Academic/Tuition) and audience: students, teachers, or parents." },
      { n: "03", title: "Publish Real-Time", desc: "Instantly appears on student dashboards, teacher portals, and parent notifications." },
      { n: "04", title: "Monitor & Archive", desc: "Track readership and maintain a complete institutional record in the database." },
    ],
    benefitBadge: "Benefits",
    benefitTitle: "Seamless School Communication",
    benefits: [
      "No student or parent misses critical school notices",
      "Real-time visibility across student and teacher portals",
      "Consistent official formatting reinforces school brand authority",
      "Tuition and exam reminders integrate with core system modules",
      "Save paper circular costs with 100% paperless digital notices",
      "Instant edit and retraction capabilities for administrators",
    ],
    ctaBannerTitle: "Upgrade Your School Communication Today",
    ctaBannerDesc: "Join hundreds of forward-thinking schools that streamline operations with Quick Schools.",
    ctaBannerBtn: "Get Started Free",
  },
};

/* Real mockup mirroring Quick Schools announcements admin dashboard */
function AnnouncementsMockup() {
  const announcements = [
    { title: "Libur Hari Raya Idul Fitri 1447 H", tag: "PENTING", tagBg: "#F3F0FF", tagColor: "#531FFF", target: "Semua Civitas", date: "10 Apr 2026", views: "1.245", urgent: true },
    { title: "Pembayaran SPP Bulan Mei 2026", tag: "KEUANGAN", tagBg: "#ECFDF5", tagColor: "#059669", target: "Orang Tua Siswa", date: "28 Apr 2026", views: "987", urgent: false },
    { title: "Jadwal Ujian Tengah Semester (UTS)", tag: "AKADEMIK", tagBg: "#EFF6FF", tagColor: "#2563eb", target: "Siswa & Guru", date: "12 Mar 2026", views: "876", urgent: false },
    { title: "Pengumuman Kelulusan Siswa Kelas 12", tag: "PENTING", tagBg: "#FFFBEB", tagColor: "#d97706", target: "Kelas 12 & Wali", date: "20 Mei 2026", views: "765", urgent: true },
  ];

  return (
    <div style={{ backgroundColor: "white", borderRadius: 24, border: "1px solid #f3f4f6", boxShadow: "0 25px 50px -12px rgba(83,31,255,0.15), 0 0 0 1px rgba(83,31,255,0.06)", overflow: "hidden" }}>
      {/* Top Header */}
      <div style={{ background: "linear-gradient(135deg, #531FFF 0%, #6D3DFF 100%)", padding: "20px 24px", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "between", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Bell style={{ width: 18, height: 18, color: "white" }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#DDD6FF", textTransform: "uppercase", letterSpacing: "0.08em" }}>Papan Pengumuman Resmi</p>
            <p style={{ fontSize: 15, fontWeight: 800 }}>Quick Schools OS · Live Portal</p>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.2)", fontSize: 11, fontWeight: 700 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#34d399", display: "inline-block" }}></span>
            Real-time
          </div>
        </div>
      </div>

      {/* Announcements List */}
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12, backgroundColor: "#FAFBFF" }}>
        {announcements.map((item, i) => (
          <div
            key={i}
            style={{
              backgroundColor: "white",
              border: item.urgent ? "1px solid rgba(83,31,255,0.2)" : "1px solid #f3f4f6",
              borderRadius: 16,
              padding: "14px 16px",
              display: "flex",
              alignItems: "flex-start",
              gap: 14,
              boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: item.tagBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Megaphone style={{ width: 18, height: 18, color: item.tagColor }} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    padding: "3px 8px",
                    borderRadius: 6,
                    backgroundColor: item.tagBg,
                    color: item.tagColor,
                    letterSpacing: "0.06em",
                  }}
                >
                  {item.tag}
                </span>
                <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>{item.date}</span>
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {item.title}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: "#6B7280", fontWeight: 500 }}>
                <span>🎯 {item.target}</span>
                <span>·</span>
                <span style={{ color: "#531FFF", fontWeight: 600 }}>👁 {item.views} dilihat</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PengumumanPage() {
  const [lang, setLang] = useState<"id" | "en">("id");

  useEffect(() => {
    const saved = localStorage.getItem("qs_lang") as "id" | "en";
    if (saved === "id" || saved === "en") setLang(saved);
  }, []);

  const t = T[lang];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "white", color: "#111827" }}>
      {/* Hero Section */}
      <section style={{ position: "relative", paddingTop: 140, paddingBottom: 80, overflow: "hidden", background: "linear-gradient(135deg, #F3F0FF 0%, #FFFFFF 60%, #EEF2FF 100%)" }}>
        <div style={{ position: "absolute", top: 0, right: 0, width: 600, height: 600, background: "radial-gradient(circle, rgba(83,31,255,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(83,31,255,0.08) 1px, transparent 1px)", backgroundSize: "36px 36px", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 10, maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center" }} className="grid-cols-1 lg:grid-cols-2">
            <div>
              {/* Badge */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", backgroundColor: "#F3F0FF", border: "1px solid rgba(83,31,255,0.25)", borderRadius: 12, marginBottom: 24 }}>
                <Bell style={{ width: 14, height: 14, color: "#531FFF" }} />
                <span style={{ fontSize: 12, fontWeight: 800, color: "#531FFF" }}>{t.badge}</span>
              </div>

              {/* H1 */}
              <h1 style={{ fontSize: "clamp(38px, 4.5vw, 56px)", fontWeight: 900, color: "#111827", lineHeight: 1.12, letterSpacing: "-0.03em", marginBottom: 20 }}>
                {t.h1a}{" "}
                <span style={{ background: "linear-gradient(135deg, #531FFF 0%, #7B4DFF 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  {t.h1b}
                </span>
              </h1>

              {/* Desc */}
              <p style={{ fontSize: 17, color: "#4B5563", lineHeight: 1.7, fontWeight: 500, marginBottom: 32, maxWidth: 520 }}>
                {t.desc}
              </p>

              {/* CTAs */}
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
                <Link href="/register" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "14px 32px", backgroundColor: "#531FFF", color: "white", borderRadius: 16, fontSize: 15, fontWeight: 700, textDecoration: "none", boxShadow: "0 8px 24px -4px rgba(83,31,255,0.4)", transition: "all 0.2s" }} className="hover:bg-[#4314cc]">
                  {t.cta1} <ArrowRight style={{ width: 16, height: 16 }} />
                </Link>
                <Link href="/announcements" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 28px", backgroundColor: "white", border: "1.5px solid #e5e7eb", color: "#374151", borderRadius: 16, fontSize: 15, fontWeight: 700, textDecoration: "none" }}>
                  {t.cta2}
                </Link>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#6B7280", fontWeight: 500 }}>
                <CheckCircle2 style={{ width: 16, height: 16, color: "#10b981" }} />
                <span>Terhubung otomatis dengan Dashboard Guru, Siswa, dan Admin</span>
              </div>
            </div>

            {/* Right Mockup */}
            <div>
              <AnnouncementsMockup />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
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

      {/* Workflow Section */}
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

      {/* Benefits Section */}
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
              <AnnouncementsMockup />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
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
