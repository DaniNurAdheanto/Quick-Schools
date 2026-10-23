"use client";

import React from "react";
import {
  FileText,
  Award,
  BarChart2,
  CheckCircle2,
  BookOpen,
  Printer
} from "lucide-react";
import FeatureSubpageLayout, { FeatureSubpageData } from "@/components/landing/feature-subpage-layout";

const T: { id: FeatureSubpageData; en: FeatureSubpageData } = {
  id: {
    badge: "Modul Penilaian & Rapor",
    h1a: "Penilaian & Rapor Digital",
    h1b: "Format Kurikulum Merdeka",
    desc: "Sistem penginputan nilai tugas, ulangan harian, UTS, UAS, serta perumusan capaian kompetensi dan cetak rapor digital siap dibagikan.",
    cta1: "Mulai Gratis Sekarang",
    cta2: "Buka Penilaian & Rapor",
    featBadge: "Fitur Penilaian",
    featTitle: "Solusi Manajemen Nilai & Rapor Sekolah",
    feats: [
      { icon: BookOpen, title: "Penilaian Capaian Belajar", desc: "Input nilai tugas harian, sumatif, dan formatif berbasis Tujuan Pembelajaran (TP)." },
      { icon: Award, title: "Deskripsi Capaian Otomatis", desc: "Sistem otomatis merumuskan deskripsi narasi rapor sesuai batas KKM tiap kompetensi." },
      { icon: Printer, title: "Cetak Rapor Standar Nasional", desc: "Format rapor resmi siap unduh dan cetak ke format PDF dalam hitungan detik." },
      { icon: BarChart2, title: "Rekap Nilai Kelas & Mapel", desc: "Grafik dan tabel rekapitulasi nilai per rombel memudahkan guru wali kelas mengevaluasi." },
      { icon: CheckCircle2, title: "Transparansi ke Orang Tua", desc: "Hasil penilaian dan rapor dapat dilihat langsung oleh wali murid melalui portal siswa." },
      { icon: FileText, title: "Riwayat Rapor Permanen", desc: "Arsip nilai siswa dari semester awal hingga kelulusan tersimpan rapi di cloud database." },
    ],
    workBadge: "Alur Kerja",
    workTitle: "4 Langkah Mudah Olah Nilai",
    workSteps: [
      { n: "01", title: "Pilih Kelas & Mata Pelajaran", desc: "Guru mata pelajaran memilih rombongan belajar dan kompetensi yang diujikan." },
      { n: "02", title: "Input Nilai Siswa", desc: "Masukkan nilai tugas harian, nilai UTS, dan UAS langsung melalui portal guru." },
      { n: "03", title: "Rumus & Deskripsi Otomatis", desc: "Sistem menghitung nilai akhir, predikat huruf, dan narasi capaian kompetensi." },
      { n: "04", title: "Cetak / Publikasikan Rapor", desc: "Wali kelas memeriksa verifikasi akhir dan menerbitkan rapor digital berformat resmi." },
    ],
    benefitBadge: "Keunggulan",
    benefitTitle: "Keuntungan Menggunakan Quick Schools",
    benefits: [
      "Menghemat puluhan jam kerja guru dalam menghitung nilai dan menulis deskripsi rapor",
      "Kompatibel penuh dengan panduan asesmen Kurikulum Merdeka Kemdikbudristek",
      "Format cetak PDF rapi, tidak berantakan saat dibuka di perangkat manapun",
      "Wali murid dapat memantau perkembangan nilai akademik anak secara transparan",
      "Mencegah human error dalam perhitungan rata-rata dan konversi predikat",
      "Data nilai terarsip permanen dan mudah dipanggil saat akreditasi sekolah",
    ],
    ctaBannerTitle: "Tingkatkan Efisiensi Penilaian Sekolah Anda",
    ctaBannerDesc: "Kelola seluruh proses penilaian dan pembagian rapor digital secara otomatis dan profesional.",
    ctaBannerBtn: "Daftar Gratis Sekarang",
  },
  en: {
    badge: "Grading & Report Card Module",
    h1a: "Digital Grading & Reports",
    h1b: "National Standards Compliant",
    desc: "Streamlined grade entries for formative, summative, midterms, and finals with automated competency descriptions and PDF report card printing.",
    cta1: "Start Free Now",
    cta2: "Open Grading & Reports",
    featBadge: "Grading Features",
    featTitle: "Comprehensive Academic Evaluation Solution",
    feats: [
      { icon: BookOpen, title: "Competency-Based Input", desc: "Log daily assignments, format assessments, and summative exams mapped to learning goals." },
      { icon: Award, title: "Automated Competency Narrative", desc: "The platform dynamically drafts narrative qualitative evaluations according to thresholds." },
      { icon: Printer, title: "Official Report Card Printing", desc: "Standardized ministerial-compliant report cards generated and printed to PDF in seconds." },
      { icon: BarChart2, title: "Cohort & Subject Analytics", desc: "Performance charts and class distributions assisting homeroom mentors in evaluation." },
      { icon: CheckCircle2, title: "Parent Transparency", desc: "Real-time grade availability published directly to parent and student web portals." },
      { icon: FileText, title: "Permanent Digital Archive", desc: "Complete academic transcripts saved securely in the cloud from enrollment to graduation." },
    ],
    workBadge: "Workflow",
    workTitle: "4 Steps to Report Card Delivery",
    workSteps: [
      { n: "01", title: "Select Cohort & Course", desc: "Educators choose their assigned roster and active semester evaluation criteria." },
      { n: "02", title: "Input Score Breakdown", desc: "Enter assignment scores, quizzes, and midterm/final exam grades into the portal." },
      { n: "03", title: "Automatic Formulation", desc: "The engine tabulates final averages, letter marks, and competency descriptors." },
      { n: "04", title: "Publish Official Cards", desc: "Homeroom mentors sign off and publish verified digital report card packages." },
    ],
    benefitBadge: "Benefits",
    benefitTitle: "Advantages of Quick Schools Evaluation OS",
    benefits: [
      "Saves dozens of faculty hours drafting repetitive qualitative narrative descriptors",
      "Fully compliant with National Merdeka Curriculum ministerial assessment directives",
      "Pristine print-ready PDF styling that never breaks formatting across printers",
      "Parents track real-time academic progression without waiting for end-of-term surprises",
      "Guarantees error-free mathematical calculations and letter grade conversions",
      "Permanent institutional transcript archive ready for official school accreditations",
    ],
    ctaBannerTitle: "Upgrade Academic Assessment Efficiency",
    ctaBannerDesc: "Automate grading computations and official report card deliveries with Quick Schools.",
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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Top bar */}
      <div className="bg-gradient-to-r from-[#531FFF] to-[#6D3DFF] px-5 py-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <Award className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-purple-200 uppercase tracking-wider">Preview Rapor Digital</p>
            <p className="text-xs font-black text-white">Ahmad Rizqi Pratama · 10 IPA 1</p>
          </div>
        </div>
        <span className="bg-white/20 px-2.5 py-1 rounded-md text-[11px] font-bold backdrop-blur-xs">
          Rata-rata: 86.25
        </span>
      </div>

      {/* Feed list */}
      <div className="p-4 space-y-2.5 bg-slate-50/50">
        {grades.map((g, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-2xs hover:border-[#531FFF]/20 transition-all"
          >
            <div className="min-w-0 pr-3">
              <p className="text-xs font-bold text-gray-900 truncate">{g.mapel}</p>
              <p className="text-[11px] text-gray-500 font-medium">
                Tugas: {g.tugas} · UTS: {g.uts} · UAS: {g.uas}
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <div className="text-right">
                <p className="text-sm font-black text-[#531FFF]">{g.akhir}</p>
                <p className="text-[10px] text-gray-400">KKM: {g.kkm}</p>
              </div>
              <span className="w-7 h-7 rounded-lg bg-purple-50 text-[#531FFF] flex items-center justify-center font-black text-xs border border-purple-200">
                {g.pred}
              </span>
            </div>
          </div>
        ))}

        <div className="mt-2 p-3 bg-white rounded-xl border border-gray-200/80 flex items-center justify-between text-xs">
          <span className="font-semibold text-gray-600">Status Kelulusan Kompetensi</span>
          <span className="font-extrabold text-emerald-600">Tuntas 100% Seluruh Mapel</span>
        </div>
      </div>
    </div>
  );
}

export default function LaporanPage() {
  return (
    <FeatureSubpageLayout
      moduleKey="laporan"
      translations={T}
      mockup={<LaporanMockup />}
      dashboardHref="/grades"
      icon={FileText}
    />
  );
}
