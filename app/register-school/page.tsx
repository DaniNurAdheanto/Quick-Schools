"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  School,
  Building2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Zap,
  Users,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CreditCard,
  Loader2,
  BookOpen,
  UserCheck,
  Bell,
  PenLine,
  BadgeCheck,
  Check,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";

interface PlanOption {
  id: "trial" | "standard" | "pro" | "enterprise";
  name: string;
  tagline: string;
  price: string;
  billing: string;
  popular?: boolean;
  badge?: string;
  color: string;
  border: string;
  features: string[];
}

const PLANS: PlanOption[] = [
  {
    id: "trial",
    name: "Uji Coba 14 Hari",
    tagline: "Eksplorasi seluruh modul tanpa komitmen",
    price: "Rp 0",
    billing: "Gratis selama 14 hari penuh",
    badge: "Bebas Biaya",
    color: "from-blue-600 to-indigo-600",
    border: "border-blue-200",
    features: [
      "Akses 100% seluruh fitur sistem",
      "Kapasitas uji coba hingga 200 siswa",
      "Presensi Face ID + Geofence GPS",
      "E-Rapor Kurikulum Merdeka",
      "Tanpa kartu kredit di awal",
    ],
  },
  {
    id: "standard",
    name: "Sekolah Rintisan",
    tagline: "Cocok untuk TK, SD, & SMP rintisan",
    price: "Rp 149.000",
    billing: "/ bulan (dibayar tahunan)",
    color: "from-emerald-600 to-teal-600",
    border: "border-emerald-200",
    features: [
      "Hingga 450 Siswa Aktif",
      "Presensi Real-time + Rekapitulasi",
      "Jadwal Kelas & Kalender Pendidikan",
      "Penilaian Akademik & Rapor",
      "Dukungan WhatsApp Jam Kerja",
    ],
  },
  {
    id: "pro",
    name: "Sekolah Unggulan (Pro)",
    tagline: "Otomasi lengkap untuk sekolah modern",
    price: "Rp 199.000",
    billing: "/ bulan (dibayar tahunan)",
    popular: true,
    badge: "Paling Populer",
    color: "from-[#531FFF] to-[#7B4DFF]",
    border: "border-[#531FFF]",
    features: [
      "Hingga 1.200 Siswa Aktif",
      "Face Recognition AI + Anti Fake-GPS",
      "Penagihan SPP Otomatis & Kas Sekolah",
      "Otomasi Rapor Kurikulum Merdeka (TP)",
      "Broadcast WhatsApp Otomatis ke Ortu",
      "Dukungan Prioritas 24/7",
    ],
  },
  {
    id: "enterprise",
    name: "Yayasan / Multi-Kampus",
    tagline: "Tata kelola terpusat multi-cabang & kustomisasi",
    price: "Kustom",
    billing: "Disesuaikan jumlah unit sekolah",
    badge: "Enterprise",
    color: "from-slate-800 to-gray-900",
    border: "border-gray-300",
    features: [
      "Siswa Tanpa Batas (Unlimited)",
      "Dashboard Konsolidasi Yayasan",
      "Kustomisasi Domain & Branding Sendiri",
      "SLA 99.9% Uptime & Dedicated Manager",
      "Pendampingan Setup & Migrasi Dapodik",
    ],
  },
];

const AVAILABLE_MODULES = [
  { id: "mod_presensi", name: "Presensi Face ID (AI) & Geofence GPS", icon: UserCheck, desc: "Absensi anti titip absen dengan foto selfie biometrik & titik radius sekolah." },
  { id: "mod_akademik", name: "Manajemen Akademik & Kalender", icon: BookOpen, desc: "Rombel kelas, mata pelajaran, jadwal guru, dan kalender pendidikan interaktif." },
  { id: "mod_rapor", name: "E-Rapor Kurikulum Merdeka", icon: PenLine, desc: "Formulir nilai formatif/sumatif, capaian kompetensi, dan cetak rapor instan." },
  { id: "mod_keuangan", name: "Pembayaran SPP & Keuangan Sekolah", icon: CreditCard, desc: "Penerbitan tagihan bulanan, pencatatan kas masuk/keluar, dan status lunas." },
  { id: "mod_pengumuman", name: "Broadcast & Notifikasi WhatsApp", icon: Bell, desc: "Kirim pengumuman resmi ke guru, siswa, dan orang tua murid secara real-time." },
];

function SchoolRegistrationContent() {
  const searchParams = useSearchParams();
  const toast = useToast();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedPlan, setSelectedPlan] = useState<"trial" | "standard" | "pro" | "enterprise">("pro");
  const [studentEstimate, setStudentEstimate] = useState<string>("200 - 500");
  const [selectedModules, setSelectedModules] = useState<string[]>([
    "mod_presensi",
    "mod_akademik",
    "mod_rapor",
    "mod_keuangan",
    "mod_pengumuman",
  ]);

  // Form Fields
  const [schoolName, setSchoolName] = useState("");
  const [npsn, setNpsn] = useState("");
  const [schoolLevel, setSchoolLevel] = useState("SMA");
  const [schoolType, setSchoolType] = useState<"Swasta" | "Negeri">("Swasta");
  const [province, setProvince] = useState("DKI Jakarta");
  const [city, setCity] = useState("Jakarta Selatan");
  const [address, setAddress] = useState("");
  const [subdomain, setSubdomain] = useState("");

  const [picName, setPicName] = useState("");
  const [picRole, setPicRole] = useState("Kepala Sekolah");
  const [picEmail, setPicEmail] = useState("");
  const [picPhone, setPicPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationSuccessData, setRegistrationSuccessData] = useState<any | null>(null);

  // Sync plan from URL search query (?plan=standard / ?plan=pro / ?plan=trial)
  useEffect(() => {
    const qPlan = searchParams.get("plan");
    if (qPlan && (qPlan === "trial" || qPlan === "standard" || qPlan === "pro" || qPlan === "enterprise")) {
      setSelectedPlan(qPlan as any);
    }
  }, [searchParams]);

  // Auto-generate subdomain proposal from school name
  const handleSchoolNameChange = (val: string) => {
    setSchoolName(val);
    if (!subdomain || subdomain === schoolName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 18)) {
      setSubdomain(val.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 18));
    }
  };

  const toggleModule = (modId: string) => {
    setSelectedModules((prev) =>
      prev.includes(modId) ? prev.filter((id) => id !== modId) : [...prev, modId]
    );
  };

  const validateStep = (currentStep: number): boolean => {
    if (currentStep === 1) {
      if (selectedModules.length === 0) {
        toast.showError("Pilih minimal satu modul layanan yang ingin digunakan.", "Pilihan Modul Kosong");
        return false;
      }
      return true;
    }
    if (currentStep === 2) {
      if (!schoolName.trim()) {
        toast.showError("Nama sekolah wajib diisi.", "Data Belum Lengkap");
        return false;
      }
      if (!npsn.trim() || npsn.trim().length < 6) {
        toast.showError("Masukkan NPSN sekolah yang valid (minimal 6-8 digit).", "NPSN Belum Sesuai");
        return false;
      }
      return true;
    }
    if (currentStep === 3) {
      if (!picName.trim() || !picEmail.trim() || !picPhone.trim()) {
        toast.showError("Nama penanggung jawab, email, dan nomor WhatsApp wajib diisi.", "Kontak Belum Lengkap");
        return false;
      }
      if (!picEmail.includes("@") || !picEmail.includes(".")) {
        toast.showError("Format alamat email PIC tidak valid.", "Email Tidak Valid");
        return false;
      }
      if (password.length < 6) {
        toast.showError("Password akun administrator minimal 6 karakter.", "Password Terlalu Pendek");
        return false;
      }
      if (password !== confirmPassword) {
        toast.showError("Konfirmasi password tidak cocok dengan password yang dimasukkan.", "Password Tidak Cocok");
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(4, prev + 1) as any);
      window.scrollTo({ top: 120, behavior: "smooth" });
    }
  };

  const handlePrevStep = () => {
    setStep((prev) => Math.max(1, prev - 1) as any);
    window.scrollTo({ top: 120, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;
    if (!agreeTerms) {
      toast.showError("Anda harus menyetujui Ketentuan Layanan & Kebijakan Privasi.", "Persetujuan Diperlukan");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        schoolName: schoolName.trim(),
        npsn: npsn.trim(),
        schoolLevel,
        schoolType,
        province,
        city,
        address,
        subdomain: subdomain.trim().toLowerCase() || "sekolah",
        picName: picName.trim(),
        picRole,
        picEmail: picEmail.trim().toLowerCase(),
        picPhone: picPhone.trim(),
        password,
        plan: selectedPlan,
        studentEstimate,
        selectedModules,
      };

      const res = await fetch("/api/school-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal memproses pendaftaran sekolah.");
      }

      setRegistrationSuccessData(data.registration);
      toast.showSuccess(`Sekolah ${schoolName} berhasil didaftarkan! Kredensial aktif.`, "Pendaftaran Sukses");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      console.error("School registration submission error:", err);
      toast.showError(err.message || "Terjadi kesalahan saat memproses pendaftaran. Silakan coba lagi.", "Pendaftaran Gagal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPlanObj = PLANS.find((p) => p.id === selectedPlan) || PLANS[2];

  // =============================================================
  // SUCCESS VIEW SCREEN
  // =============================================================
  if (registrationSuccessData) {
    const waMessage = encodeURIComponent(
      `Halo Tim Quick Schools, saya telah mendaftarkan sekolah *${registrationSuccessData.schoolName}* (NPSN: ${registrationSuccessData.npsn}) dengan Nomor Registrasi *${registrationSuccessData.registrationNumber}*. Mohon panduan aktivasi lebih lanjut. Terima kasih!`
    );

    return (
      <div className="min-h-screen bg-[#F8F9FC] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-2xl w-full bg-white rounded-3xl p-6 sm:p-10 border border-emerald-100 shadow-[0_20px_50px_-15px_rgba(16,185,129,0.15)] text-center space-y-6 animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center border border-emerald-100 shadow-inner">
            <BadgeCheck className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Sparkles className="w-3.5 h-3.5" /> Pendaftaran Berhasil & Akun Aktif
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Selamat Datang di Quick Schools OS!
            </h1>
            <p className="text-sm text-gray-600 max-w-md mx-auto">
              Institusi <strong className="text-gray-900">{registrationSuccessData.schoolName}</strong> telah berhasil didaftarkan ke sistem cloud.
            </p>
          </div>

          {/* Registration Details Card */}
          <div className="bg-gray-50/80 rounded-2xl p-5 border border-gray-100 text-left space-y-3.5 text-xs sm:text-sm">
            <div className="flex justify-between items-center pb-3 border-b border-gray-200/70">
              <span className="text-gray-500 font-semibold">Nomor Registrasi:</span>
              <span className="font-mono font-extrabold text-[#531FFF] bg-purple-50 px-2.5 py-0.5 rounded border border-purple-100">
                {registrationSuccessData.registrationNumber}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-semibold">Paket Terpilih:</span>
              <span className="font-bold text-gray-900 capitalize">
                {currentPlanObj.name} ({registrationSuccessData.status})
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-semibold">NPSN Resmi:</span>
              <span className="font-bold text-gray-900">{registrationSuccessData.npsn || "-"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-semibold">Subdomain Portal:</span>
              <span className="font-bold text-emerald-700 underline flex items-center gap-1">
                {registrationSuccessData.subdomain}.quickschools.id
              </span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-gray-200/70">
              <span className="text-gray-500 font-semibold">Login Administrator (PIC):</span>
              <span className="font-bold text-gray-900">{registrationSuccessData.picEmail}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-100 text-left text-xs text-purple-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#531FFF]" />
              Status Masa Uji Coba (Free 14-Day Trial) Aktif
            </p>
            <p className="text-purple-700 leading-relaxed">
              Anda dapat langsung masuk ke panel Super Admin untuk mulai memasukkan mata pelajaran, rombel kelas, import data guru & siswa via Excel, serta menguji coba Presensi Face Recognition AI.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Link
              href="/dashboard"
              className="w-full sm:flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#531FFF] to-[#4314cc] text-white text-sm font-extrabold shadow-lg shadow-[#531FFF]/25 hover:shadow-xl hover:shadow-[#531FFF]/35 transition-all text-center flex items-center justify-center gap-2"
            >
              <span>Buka Dashboard Sekolah</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href={`https://wa.me/6281234567890?text=${waMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto py-3.5 px-5 rounded-xl bg-white border border-gray-200 text-gray-700 hover:text-emerald-700 hover:bg-emerald-50/50 hover:border-emerald-200 text-sm font-bold transition-all text-center flex items-center justify-center gap-2"
            >
              <Phone className="w-4 h-4 text-emerald-600" />
              <span>Bantuan Onboarding WhatsApp</span>
            </a>
          </div>

          <Link
            href="/"
            className="inline-block text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors pt-2"
          >
            ← Kembali ke Halaman Utama
          </Link>
        </div>
      </div>
    );
  }

  // =============================================================
  // MAIN REGISTRATION FORM WIZARD
  // =============================================================
  return (
    <div className="min-h-screen bg-[#F8F9FC] text-gray-900 pb-20">
      {/* Top Simple Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#531FFF] to-[#4314cc] flex items-center justify-center shadow-md shadow-[#531FFF]/20">
              <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <span className="font-extrabold text-base text-gray-900 tracking-tight block">Quick Schools</span>
              <span className="text-[10px] font-bold text-[#531FFF] uppercase tracking-wider block">School Registration</span>
            </div>
          </Link>

          <div className="flex items-center gap-4 text-xs font-semibold text-gray-500">
            <span className="hidden sm:inline">Sudah memiliki akun institusi?</span>
            <Link
              href="/login"
              className="px-4 py-2 rounded-lg border border-gray-200 hover:border-gray-300 font-bold text-gray-700 hover:text-gray-900 bg-white transition-all shadow-2xs"
            >
              Masuk Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        {/* Banner Title */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-purple-50 text-[#531FFF] border border-purple-100">
            <Building2 className="w-3.5 h-3.5" /> Registrasi & Aktivasi Institusi Sekolah
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight">
            Mulai Transformasi Digital Sekolah Anda Hari Ini
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
            Daftarkan sekolah Anda untuk langsung menikmati otomasi sistem presensi Face ID, E-Rapor Kurikulum Merdeka, dan manajemen SPP cerdas.
          </p>
        </div>

        {/* Wizard Steps Progress Bar */}
        <div className="mb-10 max-w-3xl mx-auto">
          <div className="grid grid-cols-4 gap-2 relative">
            {[
              { num: 1, label: "Paket & Layanan" },
              { num: 2, label: "Profil Sekolah" },
              { num: 3, label: "Kontak PIC" },
              { num: 4, label: "Konfirmasi" },
            ].map((s) => (
              <div key={s.num} className="text-center space-y-1.5">
                <div
                  className={cn(
                    "w-8 h-8 sm:w-9 sm:h-9 mx-auto rounded-full flex items-center justify-center font-black text-xs transition-all",
                    step === s.num
                      ? "bg-[#531FFF] text-white shadow-md shadow-[#531FFF]/30 scale-105"
                      : step > s.num
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-100 text-gray-400"
                  )}
                >
                  {step > s.num ? <Check className="w-4 h-4 stroke-[3]" /> : s.num}
                </div>
                <span
                  className={cn(
                    "block text-[11px] font-bold truncate",
                    step === s.num ? "text-[#531FFF]" : step > s.num ? "text-gray-900" : "text-gray-400"
                  )}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Form Body Card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.06)] p-6 sm:p-10">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* ======================================================= */}
            {/* STEP 1: PAKET & KEBUTUHAN MODUL */}
            {/* ======================================================= */}
            {step === 1 && (
              <div className="space-y-8 animate-in fade-in duration-200">
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">1. Pilih Paket Layanan</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Seluruh paket sudah termasuk masa uji coba 14 hari bebas biaya dan pendampingan setup data awal.
                  </p>
                </div>

                {/* Plan Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {PLANS.map((plan) => {
                    const isSelected = selectedPlan === plan.id;
                    return (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan.id)}
                        className={cn(
                          "relative p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-4",
                          isSelected
                            ? "border-[#531FFF] bg-[#531FFF]/[0.02] shadow-md shadow-[#531FFF]/10"
                            : "border-gray-200/80 hover:border-gray-300 bg-white"
                        )}
                      >
                        {plan.badge && (
                          <span
                            className={cn(
                              "absolute -top-3 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white bg-gradient-to-r",
                              plan.color
                            )}
                          >
                            {plan.badge}
                          </span>
                        )}

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-base text-gray-900">{plan.name}</span>
                            <div
                              className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                                isSelected ? "border-[#531FFF] bg-[#531FFF]" : "border-gray-300"
                              )}
                            >
                              {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                          </div>
                          <p className="text-xs text-gray-500">{plan.tagline}</p>

                          <div className="pt-2">
                            <span className="text-2xl font-black text-gray-900">{plan.price}</span>
                            <span className="text-[11px] text-gray-400 font-medium ml-1.5">{plan.billing}</span>
                          </div>
                        </div>

                        <ul className="space-y-1.5 pt-3 border-t border-gray-100 text-xs text-gray-600">
                          {plan.features.map((feat, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>

                {/* Estimasi Jumlah Siswa */}
                <div className="pt-4 border-t border-gray-100 space-y-3">
                  <label className="block text-xs font-bold text-gray-800">
                    Perkiraan Total Siswa Aktif di Sekolah:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {["< 200 Siswa", "200 - 500 Siswa", "500 - 1.200 Siswa", "> 1.200 Siswa"].map((opt) => (
                      <button
                        type="button"
                        key={opt}
                        onClick={() => setStudentEstimate(opt)}
                        className={cn(
                          "py-2.5 px-3 rounded-xl text-xs font-bold border transition-all text-center",
                          studentEstimate === opt
                            ? "bg-purple-50 text-[#531FFF] border-[#531FFF] shadow-2xs"
                            : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Modul Pilihan */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-gray-800">
                    Modul Unggulan yang Ingin Diaktifkan:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {AVAILABLE_MODULES.map((mod) => {
                      const Icon = mod.icon;
                      const active = selectedModules.includes(mod.id);
                      return (
                        <div
                          key={mod.id}
                          onClick={() => toggleModule(mod.id)}
                          className={cn(
                            "p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all",
                            active
                              ? "bg-purple-50/50 border-[#531FFF]/50"
                              : "bg-gray-50/40 border-gray-200/80 hover:border-gray-300"
                          )}
                        >
                          <div
                            className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                              active ? "bg-[#531FFF] text-white" : "bg-gray-200 text-gray-500"
                            )}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-900 leading-tight">{mod.name}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{mod.desc}</p>
                          </div>
                          <div
                            className={cn(
                              "w-4 h-4 rounded border flex items-center justify-center mt-1 shrink-0",
                              active ? "bg-[#531FFF] border-[#531FFF]" : "border-gray-300 bg-white"
                            )}
                          >
                            {active && <Check className="w-3 h-3 text-white stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================= */}
            {/* STEP 2: PROFIL IDENTITAS SEKOLAH */}
            {/* ======================================================= */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">2. Identitas Resmi Sekolah</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Masukkan data resmi sekolah Anda untuk pembuatan subdomain dan konfigurasi profil instansi.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-bold text-gray-700">Nama Resmi Sekolah *</label>
                    <div className="relative">
                      <School className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="Contoh: SMA Negeri 1 Kota Bekasi / SMP Islam Al-Azhar"
                        value={schoolName}
                        onChange={(e) => handleSchoolNameChange(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/10"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">NPSN (Nomor Pokok Sekolah Nasional) *</label>
                    <input
                      type="text"
                      required
                      placeholder="8 digit NPSN resmi"
                      value={npsn}
                      onChange={(e) => setNpsn(e.target.value.replace(/[^0-9]/g, "").slice(0, 8))}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-mono font-bold tracking-wider focus:outline-none focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">Jenjang Pendidikan *</label>
                    <select
                      value={schoolLevel}
                      onChange={(e) => setSchoolLevel(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/10 cursor-pointer"
                    >
                      <option value="SD">SD / MI (Sekolah Dasar)</option>
                      <option value="SMP">SMP / MTs (Sekolah Menengah Pertama)</option>
                      <option value="SMA">SMA / MA (Sekolah Menengah Atas)</option>
                      <option value="SMK">SMK (Sekolah Menengah Kejuruan)</option>
                      <option value="Yayasan">Yayasan Pendidikan / Pesantren</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">Status Sekolah *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["Swasta", "Negeri"] as const).map((t) => (
                        <button
                          type="button"
                          key={t}
                          onClick={() => setSchoolType(t)}
                          className={cn(
                            "py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center",
                            schoolType === t
                              ? "bg-purple-50 text-[#531FFF] border-[#531FFF]"
                              : "bg-white text-gray-600 border-gray-200"
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">Provinsi & Kota / Kabupaten</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Provinsi"
                        value={province}
                        onChange={(e) => setProvince(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold focus:outline-none focus:border-[#531FFF]"
                      />
                      <input
                        type="text"
                        placeholder="Kota / Kab."
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold focus:outline-none focus:border-[#531FFF]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-bold text-gray-700">Alamat Lengkap Sekolah</label>
                    <textarea
                      rows={2}
                      placeholder="Jalan, No., Kelurahan, Kecamatan, Kode Pos"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#531FFF]"
                    />
                  </div>

                  {/* Subdomain Input */}
                  <div className="space-y-1.5 sm:col-span-2 pt-2">
                    <label className="text-xs font-bold text-gray-700">Pilihan Subdomain Portal Sekolah</label>
                    <div className="flex items-center rounded-xl border border-gray-200 overflow-hidden focus-within:border-[#531FFF] focus-within:ring-2 focus-within:ring-[#531FFF]/10">
                      <span className="px-3 bg-gray-50 text-gray-400 text-xs font-bold border-r border-gray-200 py-2.5">
                        https://
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="namasekolah"
                        value={subdomain}
                        onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20))}
                        className="w-full px-3 py-2 text-xs sm:text-sm font-bold text-[#531FFF] focus:outline-none"
                      />
                      <span className="px-3 bg-gray-50 text-gray-500 text-xs font-bold border-l border-gray-200 py-2.5">
                        .quickschools.id
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Portal web eksklusif yang nantinya akan diakses oleh seluruh Guru, Siswa, dan Orang Tua murid.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================= */}
            {/* STEP 3: DATA PENANGGUNG JAWAB (PIC & AKUN ADMIN) */}
            {/* ======================================================= */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">3. Kontak Penanggung Jawab (PIC)</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Akun ini akan otomatis ditetapkan sebagai Super Administrator utama sekolah.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">Nama Lengkap PIC *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nama lengkap & gelar (jika ada)"
                      value={picName}
                      onChange={(e) => setPicName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#531FFF]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">Jabatan di Sekolah *</label>
                    <select
                      value={picRole}
                      onChange={(e) => setPicRole(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#531FFF] cursor-pointer"
                    >
                      <option value="Kepala Sekolah">Kepala Sekolah</option>
                      <option value="Wakil Kepala Sekolah">Wakil Kepala Sekolah</option>
                      <option value="Ketua / Pengurus Yayasan">Ketua / Pengurus Yayasan</option>
                      <option value="Koordinator IT / Tim Teknis">Koordinator IT / Tim Teknis</option>
                      <option value="Operator Dapodik / Tata Usaha">Operator Dapodik / Tata Usaha</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">Email Resmi PIC *</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        placeholder="email@sekolah.sch.id / pribadi"
                        value={picEmail}
                        onChange={(e) => setPicEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#531FFF]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">Nomor WhatsApp Aktif *</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        placeholder="Contoh: 081234567890"
                        value={picPhone}
                        onChange={(e) => setPicPhone(e.target.value.replace(/[^0-9+]/g, ""))}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#531FFF]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">Password Akun Administrator *</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="Minimal 6 karakter"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#531FFF]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">Konfirmasi Password *</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="Ulangi password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#531FFF]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================= */}
            {/* STEP 4: KONFIRMASI RINGKASAN & AKTIVASI */}
            {/* ======================================================= */}
            {step === 4 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">4. Konfirmasi Data Pendaftaran</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Pastikan seluruh data institusi dan penanggung jawab sudah sesuai sebelum mengaktifkan sistem.
                  </p>
                </div>

                <div className="bg-gray-50/80 rounded-2xl p-5 border border-gray-200/80 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-gray-400 block font-semibold mb-0.5">Nama Sekolah:</span>
                      <strong className="text-sm text-gray-900">{schoolName || "-"}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block font-semibold mb-0.5">NPSN / Jenjang:</span>
                      <strong className="text-sm text-gray-900">{npsn || "-"} ({schoolLevel} - {schoolType})</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block font-semibold mb-0.5">Subdomain Portal:</span>
                      <strong className="text-sm text-[#531FFF]">https://{subdomain || "sekolah"}.quickschools.id</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block font-semibold mb-0.5">Paket Layanan:</span>
                      <strong className="text-sm text-emerald-700">{currentPlanObj.name} ({currentPlanObj.price})</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block font-semibold mb-0.5">Penanggung Jawab (PIC):</span>
                      <strong className="text-sm text-gray-900">{picName} ({picRole})</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block font-semibold mb-0.5">Kontak WhatsApp & Email:</span>
                      <strong className="text-sm text-gray-900">{picPhone} • {picEmail}</strong>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-200/70">
                    <span className="text-gray-500 text-xs font-bold block mb-1.5">Modul yang Diaktifkan:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedModules.map((mId) => {
                        const m = AVAILABLE_MODULES.find((item) => item.id === mId);
                        return (
                          <span
                            key={mId}
                            className="px-2.5 py-1 rounded-md bg-white border border-gray-200 text-[11px] font-bold text-gray-700 shadow-2xs"
                          >
                            ✓ {m?.name.split("(")[0].trim() || mId}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Terms and conditions checkbox */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-purple-50/50 border border-purple-100 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    id="terms-agree"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-[#531FFF] focus:ring-[#531FFF] cursor-pointer"
                  />
                  <label htmlFor="terms-agree" className="cursor-pointer leading-relaxed">
                    Saya menyatakan bahwa data yang saya masukkan adalah sah atas nama institusi sekolah, serta menyetujui{" "}
                    <Link href="#" className="text-[#531FFF] font-bold hover:underline">
                      Ketentuan Layanan
                    </Link>{" "}
                    dan{" "}
                    <Link href="#" className="text-[#531FFF] font-bold hover:underline">
                      Kebijakan Privasi
                    </Link>{" "}
                    Quick Schools.
                  </label>
                </div>
              </div>
            )}

            {/* Wizard Navigation Footer */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-100">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Kembali</span>
                </button>
              ) : (
                <div />
              )}

              {step < 4 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#531FFF] hover:bg-[#4314cc] text-white text-xs sm:text-sm font-extrabold shadow-md shadow-[#531FFF]/25 hover:shadow-lg transition-all cursor-pointer"
                >
                  <span>Lanjutkan</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Mendaftarkan Sekolah...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Konfirmasi & Aktifkan Sekolah Sekarang</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Guarantees Footer */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-2xs space-y-1">
            <Shield className="w-5 h-5 text-[#531FFF] mx-auto" />
            <h4 className="text-xs font-bold text-gray-900">Enkripsi Berstandar Bank</h4>
            <p className="text-[11px] text-gray-400">Data institusi tersimpan aman dengan TLS 1.3 & AES-256</p>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-2xs space-y-1">
            <Zap className="w-5 h-5 text-emerald-600 mx-auto" />
            <h4 className="text-xs font-bold text-gray-900">Aktivasi Instan</h4>
            <p className="text-[11px] text-gray-400">Langsung aktif tanpa harus menunggu approval manual berhari-hari</p>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-2xs space-y-1">
            <Users className="w-5 h-5 text-indigo-600 mx-auto" />
            <h4 className="text-xs font-bold text-gray-900">Pendampingan Setup Gratis</h4>
            <p className="text-[11px] text-gray-400">Tim teknis siap membantu migrasi Excel & panduan guru</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SchoolRegistrationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8F9FC]">
          <Loader2 className="w-8 h-8 animate-spin text-[#531FFF]" />
        </div>
      }
    >
      <SchoolRegistrationContent />
    </Suspense>
  );
}
