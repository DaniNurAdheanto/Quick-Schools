"use client";

import React from "react";
import {
  Megaphone,
  Bell,
  Users,
  Clock,
  FileText,
  Tag,
  ShieldCheck
} from "lucide-react";
import FeatureSubpageLayout, { FeatureSubpageData } from "@/components/landing/feature-subpage-layout";

const T: { id: FeatureSubpageData; en: FeatureSubpageData } = {
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
      "Tidak ada lagi siswa atau wali murid yang ketinggalan info penting sekolah",
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
      { icon: Megaphone, title: "Broadcast Delivery", desc: "Publish institutional notices in a single click to all campus members in real time." },
      { icon: Users, title: "Precise Audience Filter", desc: "Target by specific roles: All Students, Faculty & Staff, or Parents." },
      { icon: Tag, title: "Priority & Tagging", desc: "Mark notices as Urgent, Academic, Tuition, Holidays, or Extracurricular." },
      { icon: Clock, title: "Automated Timetable", desc: "Configure publication timestamps to match calendar milestones automatically." },
      { icon: FileText, title: "Document Attachments", desc: "Attach official circular PDFs, circular images, or event guidebooks." },
      { icon: ShieldCheck, title: "Digital History Archive", desc: "All circulars remain preserved and searchable across all academic terms." },
    ],
    workBadge: "Workflow",
    workTitle: "4 Steps to Broadcast Announcements",
    workSteps: [
      { n: "01", title: "Draft Circular", desc: "Author titles, descriptive directives, and attach required documentation." },
      { n: "02", title: "Designate Audiences", desc: "Select tags (Urgent/Tuition/Academics) and recipient groups." },
      { n: "03", title: "Instant Publishing", desc: "Notices appear simultaneously on student portals, teacher dashboards, and parent feeds." },
      { n: "04", title: "Monitor Engagement", desc: "Track readership counts and maintain persistent institutional records." },
    ],
    benefitBadge: "Benefits",
    benefitTitle: "Frictionless School Communication",
    benefits: [
      "Guarantees parents and learners never miss critical campus deadlines",
      "Live status banner on stakeholder dashboards upon login",
      "Uniform ministerial layout protecting institutional credibility",
      "Tuition deadline circulars synchronized with billing reminders",
      "Saves paper printouts with eco-friendly digital communications",
      "Full administrative governance to update or retract circulars on demand",
    ],
    ctaBannerTitle: "Supercharge Campus Communication Today",
    ctaBannerDesc: "Join 500+ modern schools managing real-time announcements with Quick Schools.",
    ctaBannerBtn: "Register Free Now",
  },
};

function AnnouncementsMockup() {
  const announcements = [
    { title: "Libur Hari Raya Idul Fitri 1447 H", tag: "PENTING", tagBg: "bg-purple-50", tagColor: "text-[#531FFF]", target: "Semua Civitas", date: "10 Apr 2026", views: "1.245", urgent: true },
    { title: "Pembayaran SPP Bulan Mei 2026", tag: "KEUANGAN", tagBg: "bg-emerald-50", tagColor: "text-emerald-700", target: "Orang Tua Siswa", date: "28 Apr 2026", views: "987", urgent: false },
    { title: "Jadwal Ujian Tengah Semester (UTS)", tag: "AKADEMIK", tagBg: "bg-blue-50", tagColor: "text-blue-700", target: "Siswa & Guru", date: "12 Mar 2026", views: "876", urgent: false },
    { title: "Pengumuman Kelulusan Siswa Kelas 12", tag: "PENTING", tagBg: "bg-amber-50", tagColor: "text-amber-700", target: "Kelas 12 & Wali", date: "20 Mei 2026", views: "765", urgent: true },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-[#531FFF] to-[#6D3DFF] px-5 py-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <Bell className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-purple-200 uppercase tracking-wider">Papan Pengumuman Resmi</p>
            <p className="text-xs font-black text-white">Quick Schools OS · Live Portal</p>
          </div>
        </div>
        <span className="bg-white/20 px-2.5 py-1 rounded-md text-[11px] font-bold backdrop-blur-xs flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Real-time
        </span>
      </div>

      {/* Announcements List */}
      <div className="p-4 space-y-2.5 bg-slate-50/50">
        {announcements.map((item, i) => (
          <div
            key={i}
            className={`p-3 bg-white rounded-xl border transition-all flex items-start gap-3 ${
              item.urgent ? "border-purple-200 shadow-xs" : "border-gray-100 shadow-2xs"
            }`}
          >
            <div className={`w-8 h-8 rounded-lg ${item.tagBg} ${item.tagColor} flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5`}>
              {item.tag[0]}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${item.tagBg} ${item.tagColor}`}>
                  {item.tag}
                </span>
                <span className="text-[10px] text-gray-400 font-semibold">• {item.target}</span>
              </div>
              <p className="text-xs font-bold text-gray-900 mt-1 truncate">{item.title}</p>
              <p className="text-[10px] text-gray-500 font-medium mt-0.5">{item.date} · {item.views} Pembaca</p>
            </div>
          </div>
        ))}

        <div className="mt-2 p-3 bg-white rounded-xl border border-gray-200/80 flex items-center justify-between text-xs">
          <span className="font-semibold text-gray-600">Total Pengumuman Aktif</span>
          <span className="font-extrabold text-[#531FFF]">12 Pengumuman Resmi</span>
        </div>
      </div>
    </div>
  );
}

export default function PengumumanPage() {
  return (
    <FeatureSubpageLayout
      moduleKey="pengumuman"
      translations={T}
      mockup={<AnnouncementsMockup />}
      dashboardHref="/announcements"
      icon={Megaphone}
    />
  );
}
