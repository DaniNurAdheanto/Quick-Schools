"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  School,
  Building2,
  Sparkles,
  Zap,
  Phone,
  Mail,
  Loader2,
  BookOpen,
  UserCheck,
  Bell,
  PenLine,
  BadgeCheck,
  Check,
  Shield,
  CreditCard,
  Printer,
  Calendar,
  Send,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";

interface PlanOption {
  id: "trial" | "standard" | "pro" | "enterprise";
  name: string;
  badge?: string;
  priceNote: string;
  description: string;
}

const PLANS: PlanOption[] = [
  {
    id: "trial",
    name: "Uji Coba 14 Hari",
    badge: "Gratis",
    priceNote: "Bebas Biaya",
    description: "Coba seluruh modul tanpa komitmen biaya apapun",
  },
  {
    id: "standard",
    name: "Sekolah Rintisan",
    priceNote: "Mulai Rp 149rb / bln",
    description: "Kapasitas s.d 450 siswa, presensi real-time & rapor",
  },
  {
    id: "pro",
    name: "Sekolah Unggulan (Pro)",
    badge: "Paling Populer",
    priceNote: "Mulai Rp 199rb / bln",
    description: "Face ID AI, SPP otomatis, E-Rapor, broadcast WA ortu",
  },
  {
    id: "enterprise",
    name: "Yayasan / Multi-Kampus",
    badge: "Enterprise",
    priceNote: "Penawaran Kustom",
    description: "Siswa unlimited, konsolidasi multi-cabang, sinkron Dapodik",
  },
];

const AVAILABLE_MODULES = [
  { id: "mod_presensi", name: "Presensi Face ID AI & GPS", icon: UserCheck },
  { id: "mod_keuangan", name: "SPP & Kas Keuangan", icon: CreditCard },
  { id: "mod_rapor", name: "E-Rapor Kurikulum Merdeka", icon: PenLine },
  { id: "mod_akademik", name: "Akademik & Kalender", icon: BookOpen },
  { id: "mod_pengumuman", name: "Broadcast WhatsApp Ortu", icon: Bell },
  { id: "mod_ujian", name: "Jadwal & Ujian CBT", icon: Calendar },
];

function SingleSubscriptionFormContent() {
  const searchParams = useSearchParams();
  const toast = useToast();

  // Form Fields
  const [schoolName, setSchoolName] = useState("");
  const [npsn, setNpsn] = useState("");
  const [schoolLevel, setSchoolLevel] = useState("SMA/MA");
  const [schoolType, setSchoolType] = useState<"Swasta" | "Negeri">("Swasta");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");

  const [picName, setPicName] = useState("");
  const [picRole, setPicRole] = useState("Kepala Sekolah");
  const [picEmail, setPicEmail] = useState("");
  const [picPhone, setPicPhone] = useState("");

  const [studentEstimate, setStudentEstimate] = useState<string>("300 - 600");
  const [studentCount, setStudentCount] = useState<string>("");
  const [selectedPlan, setSelectedPlan] = useState<"trial" | "standard" | "pro" | "enterprise">("pro");
  const [selectedModules, setSelectedModules] = useState<string[]>([
    "mod_presensi",
    "mod_keuangan",
    "mod_rapor",
    "mod_pengumuman",
  ]);
  const [preferredTime, setPreferredTime] = useState("WhatsApp Kapan Saja");
  const [notes, setNotes] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<any | null>(null);

  // Sync plan from URL (?plan=pro, ?plan=trial, etc.)
  useEffect(() => {
    const qPlan = searchParams.get("plan");
    if (qPlan && (qPlan === "trial" || qPlan === "standard" || qPlan === "pro" || qPlan === "enterprise")) {
      setSelectedPlan(qPlan as any);
    }
  }, [searchParams]);

  const toggleModule = (modId: string) => {
    setSelectedModules((prev) =>
      prev.includes(modId) ? prev.filter((id) => id !== modId) : [...prev, modId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!schoolName.trim()) {
      toast.showError("Nama resmi sekolah wajib diisi.", "Data Belum Lengkap");
      return;
    }
    if (!picName.trim()) {
      toast.showError("Nama penanggung jawab (PIC) wajib diisi.", "Kontak Belum Lengkap");
      return;
    }
    if (!picEmail.trim() || !picEmail.includes("@") || !picEmail.includes(".")) {
      toast.showError("Masukkan alamat email yang valid.", "Email Tidak Valid");
      return;
    }
    if (!picPhone.trim() || picPhone.trim().length < 9) {
      toast.showError("Masukkan nomor WhatsApp aktif yang valid.", "Nomor WA Tidak Valid");
      return;
    }
    if (selectedModules.length === 0) {
      toast.showError("Pilih minimal satu layanan / modul yang diminati.", "Pilih Layanan");
      return;
    }
    if (!agreeTerms) {
      toast.showError("Anda harus menyetujui ketentuan permohonan konsultasi.", "Persetujuan Diperlukan");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        schoolName: schoolName.trim(),
        npsn: npsn.trim(),
        schoolLevel,
        schoolType,
        province: province.trim(),
        city: city.trim(),
        subdomain: schoolName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 18),
        picName: picName.trim(),
        picRole,
        picEmail: picEmail.trim().toLowerCase(),
        picPhone: picPhone.trim(),
        studentEstimate,
        studentCount: studentCount ? parseInt(studentCount, 10) : undefined,
        planInterest: selectedPlan,
        selectedModules,
        preferredTime,
        notes: notes.trim(),
      };

      const res = await fetch("/api/subscription-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal mengirim formulir permintaan berlangganan.");
      }

      const finalRecord = data.request || {
        ...payload,
        requestNumber: `REQ-SUB-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
        status: "PENDING",
        createdAt: new Date().toISOString(),
      };

      setSubmittedData(finalRecord);
      toast.showSuccess(
        `Permintaan untuk ${schoolName} berhasil dikirim! Tim Quick Schools akan segera menghubungi Anda.`,
        "Permintaan Terkirim"
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      console.error("Subscription request error:", err);
      toast.showError(
        err.message || "Terjadi kendala saat mengirim formulir. Silakan coba kembali.",
        "Pengiriman Gagal"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPlanObj = PLANS.find((p) => p.id === selectedPlan) || PLANS[2];

  // =============================================================
  // SUCCESS CONFIRMATION VIEW
  // =============================================================
  if (submittedData) {
    const waMessage = encodeURIComponent(
      `Halo Tim Quick Schools, saya telah mengajukan Permintaan Berlangganan untuk sekolah *${submittedData.schoolName}* dengan No. Tiket *${submittedData.requestNumber}*. Mohon informasi penawaran harga & jadwal konsultasi. Terima kasih!`
    );

    return (
      <div className="min-h-screen bg-[#F8F9FC] py-12 sm:py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-2xl w-full bg-white rounded-3xl p-8 sm:p-12 border border-emerald-100 shadow-[0_20px_50px_-15px_rgba(16,185,129,0.18)] text-center space-y-8 animate-in zoom-in-95 duration-200">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center border border-emerald-100 shadow-inner">
            <BadgeCheck className="w-10 h-10" />
          </div>

          <div className="space-y-2.5">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Sparkles className="w-4 h-4" /> Permintaan Berhasil Dikirim
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Terima Kasih, Permintaan Anda Telah Diterima!
            </h1>
            <p className="text-sm sm:text-base text-gray-600 max-w-lg mx-auto leading-relaxed">
              Tim konsultan Quick Schools akan segera menghubungi pihak sekolah untuk konsultasi kebutuhan, penawaran harga resmi, dan proses berlangganan lebih lanjut.
            </p>
          </div>

          {/* Ticket Card */}
          <div className="bg-gray-50/90 rounded-2xl p-5 sm:p-6 border border-gray-200 text-left space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <div>
                <span className="text-gray-400 font-bold block text-xs">Nomor Tiket Permintaan:</span>
                <span className="font-mono font-black text-[#531FFF] text-lg sm:text-xl">
                  {submittedData.requestNumber}
                </span>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wider">
                Menunggu Dihubungi
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1 text-xs sm:text-sm">
              <div>
                <span className="text-gray-400 block text-xs">Sekolah:</span>
                <span className="font-extrabold text-gray-900 text-sm">{submittedData.schoolName}</span>
                <span className="text-gray-500 text-xs block">
                  {submittedData.schoolLevel} {submittedData.schoolType ? `(${submittedData.schoolType})` : ""}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-xs">Penanggung Jawab (PIC):</span>
                <span className="font-extrabold text-gray-900 text-sm">{submittedData.picName}</span>
                <span className="text-gray-500 text-xs block">{submittedData.picRole}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-xs">Kontak WhatsApp:</span>
                <span className="font-extrabold text-emerald-700 text-sm">{submittedData.picPhone}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-xs">Paket yang Diminati:</span>
                <span className="font-extrabold text-[#531FFF] text-sm">{currentPlanObj.name}</span>
              </div>
            </div>
          </div>

          {/* Next Steps Notice */}
          <div className="p-4 rounded-2xl bg-purple-50/80 border border-purple-100 text-left text-xs sm:text-sm text-purple-900 space-y-1.5">
            <p className="font-black flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#531FFF]" />
              Langkah Selanjutnya:
            </p>
            <p className="text-purple-800 text-xs sm:text-sm leading-relaxed">
              Tim konsultan kami akan menghubungi WhatsApp <strong>{submittedData.picPhone}</strong> dalam 1x24 jam kerja untuk demonstrasi fitur sistem dan penyusunan surat penawaran harga resmi.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
            <a
              href={`https://wa.me/6281234567890?text=${waMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:flex-1 py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black shadow-lg shadow-emerald-600/20 transition-all text-center flex items-center justify-center gap-2"
            >
              <Phone className="w-4 h-4" />
              <span>Hubungi Tim via WhatsApp</span>
            </a>

            <button
              onClick={() => window.print()}
              type="button"
              className="w-full sm:w-auto py-3.5 px-5 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <Printer className="w-4 h-4 text-gray-500" />
              <span>Cetak Tiket</span>
            </button>
          </div>

          <div className="pt-2 flex items-center justify-center gap-4 text-xs font-bold text-gray-400">
            <button
              onClick={() => setSubmittedData(null)}
              className="text-[#531FFF] hover:underline cursor-pointer"
            >
              + Kirim Permintaan Lain
            </button>
            <span>•</span>
            <Link href="/" className="hover:text-gray-600 transition-colors">
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // =============================================================
  // SINGLE UNIFIED SUBSCRIPTION FORM
  // =============================================================
  return (
    <div className="min-h-screen bg-[#F8F9FC] text-gray-900 pb-24">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-18 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#531FFF] to-[#4314cc] flex items-center justify-center shadow-md shadow-[#531FFF]/20">
              <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <span className="font-black text-base text-gray-900 tracking-tight block">Quick Schools</span>
              <span className="text-[10px] font-bold text-[#531FFF] uppercase tracking-wider block">
                Permintaan Berlangganan SaaS
              </span>
            </div>
          </Link>

          <Link
            href="/login"
            className="px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-300 font-bold text-gray-700 hover:text-gray-900 bg-white text-xs sm:text-sm transition-all shadow-2xs hover:shadow-xs"
          >
            Masuk Portal
          </Link>
        </div>
      </header>

      {/* Main Container - Extended to max-w-5xl for optimal screen usage */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12">
        {/* Banner Title */}
        <div className="text-center space-y-3 mb-8 sm:mb-10">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black bg-purple-50 text-[#531FFF] border border-purple-200 shadow-2xs">
            <Building2 className="w-4 h-4" /> Formulir Permintaan Berlangganan (Request Subscription)
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight">
            Konsultasi & Penawaran Sistem Sekolah
          </h1>
          <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Isi formulir terpadu di bawah ini. Tim konsultan Quick Schools akan segera menghubungi pihak sekolah untuk konsultasi kebutuhan, demonstrasi fitur sistem, dan penawaran harga resmi.
          </p>
        </div>

        {/* Unified Card Form with generous padding and modern spacing */}
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-[0_15px_40px_-15px_rgba(0,0,0,0.06)] p-6 sm:p-10 lg:p-12">
          <form onSubmit={handleSubmit} className="space-y-8 sm:space-y-10">
            {/* 1. DATA IDENTITAS SEKOLAH */}
            <div className="space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <span className="w-8 h-8 rounded-xl bg-purple-50 text-[#531FFF] flex items-center justify-center font-black text-sm border border-purple-100">
                  1
                </span>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-gray-900 uppercase tracking-wider">
                    Data Identitas Sekolah
                  </h2>
                  <p className="text-xs text-gray-400">Identitas resmi lembaga pendidikan yang akan didaftarkan</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                  <label className="text-xs sm:text-sm font-bold text-gray-700">Nama Resmi Sekolah *</label>
                  <div className="relative">
                    <School className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Contoh: SMA Negeri 1 Kota Bekasi / SMP Islam Al-Azhar"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 text-sm sm:text-base font-semibold focus:outline-none focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/10 transition-all placeholder:text-gray-400 placeholder:font-normal"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-bold text-gray-700">Jenjang Pendidikan *</label>
                  <select
                    value={schoolLevel}
                    onChange={(e) => setSchoolLevel(e.target.value)}
                    className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 text-sm sm:text-base font-semibold focus:outline-none focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/10 transition-all cursor-pointer bg-white"
                  >
                    <option value="PAUD/TK">PAUD / TK</option>
                    <option value="SD/MI">SD / MI</option>
                    <option value="SMP/MTs">SMP / MTs</option>
                    <option value="SMA/MA">SMA / MA</option>
                    <option value="SMK">SMK</option>
                    <option value="Pesantren/Yayasan">Pondok Pesantren / Yayasan</option>
                    <option value="Lainnya">Lainnya / PKBM</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-bold text-gray-700">Status Sekolah *</label>
                  <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                    {(["Swasta", "Negeri"] as const).map((t) => (
                      <button
                        type="button"
                        key={t}
                        onClick={() => setSchoolType(t)}
                        className={cn(
                          "py-2.5 sm:py-3 px-3 rounded-xl text-xs sm:text-sm font-bold border transition-all text-center cursor-pointer",
                          schoolType === t
                            ? "bg-purple-50 text-[#531FFF] border-[#531FFF] shadow-2xs"
                            : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-bold text-gray-700">NPSN (Opsional)</label>
                  <input
                    type="text"
                    placeholder="8 digit NPSN"
                    value={npsn}
                    onChange={(e) => setNpsn(e.target.value.replace(/[^0-9]/g, "").slice(0, 8))}
                    className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 text-sm sm:text-base font-mono font-bold focus:outline-none focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/10 transition-all placeholder:text-gray-400 placeholder:font-normal"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-1 lg:col-span-2">
                  <label className="text-xs sm:text-sm font-bold text-gray-700">Kota / Kabupaten (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Contoh: Kota Bandung / Jakarta Selatan"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 text-sm sm:text-base font-semibold focus:outline-none focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/10 transition-all placeholder:text-gray-400 placeholder:font-normal"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-1 lg:col-span-1">
                  <label className="text-xs sm:text-sm font-bold text-gray-700">Provinsi (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Contoh: Jawa Barat"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 text-sm sm:text-base font-semibold focus:outline-none focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/10 transition-all placeholder:text-gray-400 placeholder:font-normal"
                  />
                </div>
              </div>
            </div>

            {/* 2. DATA PENANGGUNG JAWAB (PIC) */}
            <div className="space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <span className="w-8 h-8 rounded-xl bg-purple-50 text-[#531FFF] flex items-center justify-center font-black text-sm border border-purple-100">
                  2
                </span>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-gray-900 uppercase tracking-wider">
                    Data Penanggung Jawab (PIC)
                  </h2>
                  <p className="text-xs text-gray-400">Kontak resmi perwakilan sekolah untuk koordinasi konsultasi dan penawaran</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-bold text-gray-700">Nama Lengkap PIC *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama penanggung jawab & gelar"
                    value={picName}
                    onChange={(e) => setPicName(e.target.value)}
                    className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 text-sm sm:text-base font-semibold focus:outline-none focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/10 transition-all placeholder:text-gray-400 placeholder:font-normal"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-bold text-gray-700">Jabatan di Sekolah *</label>
                  <select
                    value={picRole}
                    onChange={(e) => setPicRole(e.target.value)}
                    className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 text-sm sm:text-base font-semibold focus:outline-none focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/10 transition-all cursor-pointer bg-white"
                  >
                    <option value="Kepala Sekolah">Kepala Sekolah</option>
                    <option value="Wakil Kepala Sekolah">Wakil Kepala Sekolah</option>
                    <option value="Ketua / Pengurus Yayasan">Ketua / Pengurus Yayasan</option>
                    <option value="Bendahara / Keuangan">Bendahara / Keuangan</option>
                    <option value="Koordinator IT / Tim Teknis">Koordinator IT / Tim Teknis</option>
                    <option value="Operator Dapodik / Tata Usaha">Operator Dapodik / Tata Usaha</option>
                    <option value="Guru Pengajar">Guru Pengajar</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-bold text-gray-700">Nomor WhatsApp Aktif *</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      placeholder="Contoh: 081234567890"
                      value={picPhone}
                      onChange={(e) => setPicPhone(e.target.value.replace(/[^0-9+]/g, ""))}
                      className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 text-sm sm:text-base font-semibold focus:outline-none focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/10 transition-all placeholder:text-gray-400 placeholder:font-normal"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-bold text-gray-700">Alamat Email PIC *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="email@sekolah.sch.id / email penanggung jawab"
                      value={picEmail}
                      onChange={(e) => setPicEmail(e.target.value)}
                      className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 text-sm sm:text-base font-semibold focus:outline-none focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/10 transition-all placeholder:text-gray-400 placeholder:font-normal"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. PAKET & KEBUTUHAN LAYANAN */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <span className="w-8 h-8 rounded-xl bg-purple-50 text-[#531FFF] flex items-center justify-center font-black text-sm border border-purple-100">
                  3
                </span>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-gray-900 uppercase tracking-wider">
                    Paket & Layanan yang Diminati
                  </h2>
                  <p className="text-xs text-gray-400">Kebutuhan paket skala institusi dan modul spesifik yang diperlukan</p>
                </div>
              </div>

              {/* Paket Options Grid */}
              <div className="space-y-2.5">
                <label className="text-xs sm:text-sm font-bold text-gray-700 block">Pilihan Paket Langganan:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {PLANS.map((plan) => {
                    const isSelected = selectedPlan === plan.id;
                    return (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan.id)}
                        className={cn(
                          "p-4 sm:p-5 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between gap-3 relative",
                          isSelected
                            ? "bg-purple-50/70 border-[#531FFF] ring-2 ring-[#531FFF]/20 shadow-md"
                            : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-xs"
                        )}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span
                              className={cn(
                                "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md",
                                isSelected ? "bg-[#531FFF] text-white" : "bg-gray-100 text-gray-600"
                              )}
                            >
                              {plan.badge || "Paket"}
                            </span>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-[#531FFF] text-white flex items-center justify-center shadow-2xs">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-extrabold text-sm sm:text-base text-gray-900">{plan.name}</p>
                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{plan.description}</p>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-gray-100">
                          <p className="text-xs sm:text-sm font-black text-[#531FFF]">{plan.priceNote}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Estimasi Siswa */}
              <div className="space-y-2.5">
                <label className="text-xs sm:text-sm font-bold text-gray-700 block">Perkiraan Jumlah Siswa Aktif:</label>
                <div className="flex flex-wrap items-center gap-2.5">
                  {["< 100", "100 - 300", "300 - 600", "> 600 Siswa"].map((opt) => (
                    <button
                      type="button"
                      key={opt}
                      onClick={() => setStudentEstimate(opt)}
                      className={cn(
                        "py-2 px-4 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer",
                        studentEstimate === opt
                          ? "bg-purple-50 text-[#531FFF] border-[#531FFF] shadow-2xs"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="Atau ketik angka riil"
                      value={studentCount}
                      onChange={(e) => setStudentCount(e.target.value)}
                      className="w-44 sm:w-52 px-3.5 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/10 transition-all placeholder:text-gray-400 placeholder:font-normal"
                    />
                  </div>
                </div>
              </div>

              {/* Modul Checkboxes */}
              <div className="space-y-2.5">
                <label className="text-xs sm:text-sm font-bold text-gray-700 block">Modul Fitur yang Diminati: *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {AVAILABLE_MODULES.map((mod) => {
                    const active = selectedModules.includes(mod.id);
                    const IconComp = mod.icon;
                    return (
                      <div
                        key={mod.id}
                        onClick={() => toggleModule(mod.id)}
                        className={cn(
                          "p-3.5 sm:p-4 rounded-xl border flex items-center gap-3 cursor-pointer transition-all",
                          active
                            ? "bg-purple-50/60 border-[#531FFF] text-[#531FFF] shadow-2xs"
                            : "bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-xs"
                        )}
                      >
                        <div
                          className={cn(
                            "w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all",
                            active ? "bg-[#531FFF] border-[#531FFF]" : "border-gray-300 bg-white"
                          )}
                        >
                          {active && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                        </div>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <IconComp className={cn("w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0", active ? "text-[#531FFF]" : "text-gray-400")} />
                          <span className="text-xs sm:text-sm font-bold leading-tight truncate">{mod.name}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Preferensi Konsultasi & Catatan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-bold text-gray-700">Waktu Konsultasi yang Nyaman</label>
                  <select
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 text-sm sm:text-base font-semibold focus:outline-none focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/10 transition-all cursor-pointer bg-white"
                  >
                    <option value="WhatsApp Kapan Saja">Chat WhatsApp Kapan Saja</option>
                    <option value="Pagi (09:00 - 12:00 WIB)">Telepon Pagi (09:00 - 12:00 WIB)</option>
                    <option value="Siang (13:00 - 16:00 WIB)">Telepon Siang (13:00 - 16:00 WIB)</option>
                    <option value="Demo Online Zoom">Demo Online via Zoom / Google Meet</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-bold text-gray-700">Catatan Khusus / Pertanyaan (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Tuliskan kebutuhan khusus atau pertanyaan..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 text-sm sm:text-base font-semibold focus:outline-none focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/10 transition-all placeholder:text-gray-400 placeholder:font-normal"
                  />
                </div>
              </div>
            </div>

            {/* Checkbox Persetujuan */}
            <div className="pt-2">
              <label className="flex items-start gap-3 text-xs sm:text-sm text-gray-600 cursor-pointer p-4 rounded-xl bg-gray-50/70 border border-gray-200/60">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-[#531FFF] focus:ring-[#531FFF] cursor-pointer"
                />
                <span className="leading-relaxed">
                  Saya bersedia dihubungi oleh Tim Konsultan Quick Schools untuk demonstrasi fitur sistem dan penyusunan surat penawaran harga resmi institusi sekolah.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-gray-100">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-8 rounded-2xl bg-gradient-to-r from-[#531FFF] to-[#4314cc] hover:from-[#4314cc] hover:to-[#380fa8] text-white font-black text-sm sm:text-base shadow-xl shadow-[#531FFF]/25 hover:shadow-[#531FFF]/35 flex items-center justify-center gap-2.5 cursor-pointer transition-all disabled:opacity-60 transform active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Mengirimkan Permintaan Konsultasi...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Kirim Permintaan Berlangganan (Request Subscription)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footnote */}
        <div className="mt-8 sm:mt-10 text-center text-xs text-gray-400 space-y-1.5">
          <p className="flex items-center justify-center gap-2">
            <Shield className="w-4 h-4 text-[#531FFF]" />
            <span>Kerahasiaan data sekolah dijamin 100% dan tidak dikenakan biaya saat pengajuan permohonan.</span>
          </p>
          <p className="text-[11px] text-gray-400">
            Butuh bantuan langsung? Hubungi WhatsApp Helpdesk di <span className="font-semibold text-gray-600">+62 812-3456-7890</span>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function SchoolRegistrationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#531FFF] animate-spin" />
        </div>
      }
    >
      <SingleSubscriptionFormContent />
    </Suspense>
  );
}
