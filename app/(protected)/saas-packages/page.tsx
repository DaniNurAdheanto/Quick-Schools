"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Layers,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  X,
  Check,
  Loader2,
  Star,
  Users,
  CreditCard,
  ShieldCheck,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";

export interface SaaSPackageItem {
  id: string;
  code: string;
  name: string;
  tagline?: string | null;
  badge?: string | null;
  priceMonthly: number;
  priceYearly: number;
  maxStudents: number;
  features: string[];
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export default function SaaSPackagesPage() {
  const toast = useToast();
  const { isSuperAdmin, isSaaSAdmin } = useAuth();

  const [packages, setPackages] = useState<SaaSPackageItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [billingCycleView, setBillingCycleView] = useState<"monthly" | "yearly">("monthly");

  // Modal states
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingPackage, setEditingPackage] = useState<SaaSPackageItem | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [packageToDelete, setPackageToDelete] = useState<SaaSPackageItem | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Form states
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    tagline: "",
    badge: "",
    priceMonthly: 0,
    priceYearly: 0,
    maxStudents: 500,
    featuresText: "",
    isActive: true,
    isPopular: false,
    sortOrder: 0,
  });

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas-packages");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPackages(json.data);
      } else {
        throw new Error(json.error || "Gagal memuat paket");
      }
    } catch (err: any) {
      toast.showError(err.message || "Terjadi kesalahan saat memuat katalog paket SaaS", "Gagal Mengambil Data");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingPackage(null);
    setFormData({
      code: "",
      name: "",
      tagline: "",
      badge: "",
      priceMonthly: 0,
      priceYearly: 0,
      maxStudents: 500,
      featuresText: "Akses Semua Fitur Utama\nPresensi Guru & Siswa Face ID\nE-Rapor Digital Kurikulum Merdeka\nDukungan Teknis Standar",
      isActive: true,
      isPopular: false,
      sortOrder: packages.length + 1,
    });
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (pkg: SaaSPackageItem) => {
    setEditingPackage(pkg);
    setFormData({
      code: pkg.code,
      name: pkg.name,
      tagline: pkg.tagline || "",
      badge: pkg.badge || "",
      priceMonthly: pkg.priceMonthly,
      priceYearly: pkg.priceYearly,
      maxStudents: pkg.maxStudents,
      featuresText: (pkg.features || []).join("\n"),
      isActive: pkg.isActive,
      isPopular: pkg.isPopular,
      sortOrder: pkg.sortOrder || 0,
    });
    setModalOpen(true);
  };

  // Save (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.showError("Nama paket dan Kode paket wajib diisi", "Validasi Gagal");
      return;
    }

    setSubmitting(true);
    try {
      const featuresArray = formData.featuresText
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean);

      const payload = {
        code: formData.code.toLowerCase().trim(),
        name: formData.name.trim(),
        tagline: formData.tagline.trim(),
        badge: formData.badge.trim(),
        priceMonthly: Number(formData.priceMonthly),
        priceYearly: Number(formData.priceYearly),
        maxStudents: Number(formData.maxStudents),
        features: featuresArray,
        isActive: formData.isActive,
        isPopular: formData.isPopular,
        sortOrder: Number(formData.sortOrder),
      };

      let res;
      if (editingPackage) {
        res = await fetch(`/api/saas-packages/${editingPackage.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/saas-packages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (json.success) {
        toast.showSuccess(
          editingPackage ? "Paket layanan berhasil diperbarui" : "Paket layanan baru berhasil ditambahkan",
          "Berhasil"
        );
        setModalOpen(false);
        fetchPackages();
      } else {
        throw new Error(json.error || "Gagal menyimpan paket");
      }
    } catch (err: any) {
      toast.showError(err.message || "Terjadi kesalahan saat memproses paket", "Gagal Menyimpan");
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Toggle Active Status
  const handleToggleActive = async (pkg: SaaSPackageItem) => {
    try {
      const res = await fetch(`/api/saas-packages/${pkg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !pkg.isActive }),
      });
      const json = await res.json();
      if (json.success) {
        toast.showSuccess(
          `Paket ${pkg.name} ${!pkg.isActive ? "diaktifkan" : "dinonaktifkan"}`,
          "Status Diperbarui"
        );
        fetchPackages();
      } else {
        throw new Error(json.error || "Gagal mengubah status paket");
      }
    } catch (err: any) {
      toast.showError(err.message, "Gagal Mengubah Status");
    }
  };

  // Delete
  const handleDeleteConfirm = async () => {
    if (!packageToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/saas-packages/${packageToDelete.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.showSuccess(
          `Paket ${packageToDelete.name} berhasil dihapus dari sistem`,
          "Paket Dihapus"
        );
        setDeleteModalOpen(false);
        setPackageToDelete(null);
        fetchPackages();
      } else {
        throw new Error(json.error || "Gagal menghapus paket");
      }
    } catch (err: any) {
      toast.showError(err.message, "Gagal Menghapus");
    } finally {
      setDeleting(false);
    }
  };

  // Aggregated Stats
  const totalPackages = packages.length;
  const activePackages = packages.filter((p) => p.isActive).length;
  const popularPackage = packages.find((p) => p.isPopular)?.name || "Sekolah Pro";
  const avgMonthlyPrice = totalPackages > 0
    ? Math.round(packages.reduce((sum, p) => sum + p.priceMonthly, 0) / totalPackages)
    : 0;

  return (
    <div className="space-y-8 pb-16">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-[#531FFF]/10 to-purple-100 text-[#531FFF] border border-[#531FFF]/20">
              <ShieldCheck className="w-3.5 h-3.5" /> {isSuperAdmin ? "Super Admin" : isSaaSAdmin ? "SaaS Administrator" : "Operasional SaaS"}
            </span>
            <span className="text-xs font-bold text-gray-400">• Katalog Paket Layanan SaaS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Paket Layanan SaaS Quick Schools
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 max-w-xl">
            Kelola tiers paket berlangganan sekolah, struktur tarif bulanan dan tahunan, kapasitas siswa maksimal, serta daftar fitur produk.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchPackages}
            disabled={loading}
            className="p-2.5 sm:px-3.5 sm:py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
            title="Segarkan Data"
          >
            <RefreshCw className={cn("w-4 h-4 text-gray-500", loading && "animate-spin text-[#531FFF]")} />
            <span className="hidden sm:inline">Segarkan</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 rounded-xl bg-[#531FFF] text-white hover:bg-[#4314cc] text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-md shadow-[#531FFF]/20 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Paket Layanan</span>
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Paket</span>
            <div className="p-2 rounded-xl bg-purple-50 text-[#531FFF]">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">{totalPackages}</div>
          <div className="text-[11px] font-semibold text-gray-500">Katalog tiers layanan terdaftar</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Paket Aktif</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">{activePackages}</div>
          <div className="text-[11px] font-semibold text-emerald-700">Tampil di formulir pendaftaran</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Paket Unggulan</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Star className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-black text-gray-900 truncate" title={popularPackage}>
            {popularPackage}
          </div>
          <div className="text-[11px] font-semibold text-amber-700">Ditandai paling diminati</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Rata-rata Tarif</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-black text-blue-700">
            Rp {avgMonthlyPrice.toLocaleString("id-ID")}
            <span className="text-xs font-medium text-gray-400">/bln</span>
          </div>
          <div className="text-[11px] font-semibold text-gray-500">Estimasi benchmark industri</div>
        </div>
      </div>

      {/* BILLING CYCLE SELECTOR TOGGLE */}
      <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-gray-100 shadow-2xs flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-[#531FFF]" />
          <div>
            <h3 className="text-sm font-bold text-gray-900">Tampilan Harga & Estimasi Lisensi</h3>
            <p className="text-xs text-gray-500">Pilih skema penagihan untuk melihat simulasi tarif sekolah</p>
          </div>
        </div>

        <div className="inline-flex p-1 bg-gray-100 rounded-xl">
          <button
            onClick={() => setBillingCycleView("monthly")}
            className={cn(
              "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
              billingCycleView === "monthly"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-500 hover:text-gray-900"
            )}
          >
            Bulanan (Monthly)
          </button>
          <button
            onClick={() => setBillingCycleView("yearly")}
            className={cn(
              "px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5",
              billingCycleView === "yearly"
                ? "bg-white text-[#531FFF] shadow-xs font-black"
                : "text-gray-500 hover:text-gray-900"
            )}
          >
            <span>Tahunan (Yearly)</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-extrabold">Hemat 2 Bulan</span>
          </button>
        </div>
      </div>

      {/* PACKAGES GRID */}
      {loading ? (
        <div className="bg-white p-12 rounded-3xl border border-gray-100 shadow-2xs flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[#531FFF] animate-spin" />
          <p className="text-sm font-bold text-gray-600">Memuat katalog paket layanan SaaS...</p>
        </div>
      ) : packages.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-gray-100 shadow-2xs flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 text-[#531FFF] flex items-center justify-center">
            <Layers className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-gray-900">Belum Ada Paket Layanan</h3>
            <p className="text-xs text-gray-500 max-w-sm">
              Buat paket layanan pertama untuk mulai menawarkan produk SaaS Quick Schools ke sekolah-sekolah.
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 rounded-xl bg-[#531FFF] text-white hover:bg-[#4314cc] text-xs font-bold"
          >
            Tambah Paket Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {packages.map((pkg) => {
            const displayPrice = billingCycleView === "yearly" ? pkg.priceYearly : pkg.priceMonthly;
            const cycleSuffix = billingCycleView === "yearly" ? "/tahun" : "/bulan";

            return (
              <div
                key={pkg.id}
                className={cn(
                  "bg-white rounded-3xl border transition-all flex flex-col justify-between relative p-6 sm:p-7 shadow-xs hover:shadow-md",
                  pkg.isPopular ? "border-[#531FFF] ring-2 ring-[#531FFF]/20" : "border-gray-100",
                  !pkg.isActive && "opacity-75 bg-gray-50/50"
                )}
              >
                {/* Popular / Custom Badge */}
                {pkg.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider shadow-xs flex items-center gap-1",
                      pkg.isPopular
                        ? "bg-[#531FFF] text-white"
                        : "bg-gray-900 text-white"
                    )}>
                      {pkg.isPopular && <Star className="w-3 h-3 fill-current text-amber-300" />}
                      <span>{pkg.badge}</span>
                    </span>
                  </div>
                )}

                <div>
                  {/* Top Header */}
                  <div className="flex items-start justify-between gap-2 pt-1 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-gray-400 uppercase tracking-wider">
                          CODE: {pkg.code}
                        </span>
                        {!pkg.isActive && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-200 text-gray-600">
                            Nonaktif
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-black text-gray-900 tracking-tight mt-0.5">
                        {pkg.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(pkg)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                        title="Edit Paket"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setPackageToDelete(pkg);
                          setDeleteModalOpen(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Paket"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Tagline */}
                  <p className="text-xs text-gray-500 min-h-[32px] leading-relaxed mb-4">
                    {pkg.tagline || "Solusi manajemen sekolah terintegrasi dengan Quick Schools."}
                  </p>

                  {/* Pricing Display */}
                  <div className="py-4 px-4 bg-gray-50/80 rounded-2xl border border-gray-100 mb-5">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                        {displayPrice === 0 ? "Gratis" : `Rp ${displayPrice.toLocaleString("id-ID")}`}
                      </span>
                      {displayPrice > 0 && (
                        <span className="text-xs font-bold text-gray-400">{cycleSuffix}</span>
                      )}
                    </div>
                    {billingCycleView === "yearly" && displayPrice > 0 && (
                      <p className="text-[11px] text-gray-400 mt-1">
                        Setara Rp {Math.round(displayPrice / 12).toLocaleString("id-ID")}/bulan
                      </p>
                    )}
                  </div>

                  {/* Quota Info */}
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-700 mb-4 pb-3 border-b border-gray-100">
                    <Users className="w-4 h-4 text-[#531FFF]" />
                    <span>Kapasitas: Maksimal {pkg.maxStudents.toLocaleString("id-ID")} Siswa</span>
                  </div>

                  {/* Features List */}
                  <div className="space-y-2.5 mb-6">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                      Fitur Termasuk:
                    </span>
                    {(pkg.features || []).map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-gray-600 leading-snug">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Card Controls */}
                <div className="pt-4 border-t border-gray-100 space-y-2">
                  <button
                    onClick={() => handleToggleActive(pkg)}
                    className={cn(
                      "w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer",
                      pkg.isActive
                        ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
                        : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
                    )}
                  >
                    {pkg.isActive ? (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-gray-500" />
                        <span>Nonaktifkan Paket</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Aktifkan Paket</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleOpenEdit(pkg)}
                    className="w-full py-2 rounded-xl text-xs font-bold text-[#531FFF] hover:bg-purple-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>Konfigurasi & Urutan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: CREATE / EDIT PACKAGE */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-lg font-black text-gray-900 tracking-tight">
                  {editingPackage ? "Edit Paket Layanan" : "Tambah Paket Layanan Baru"}
                </h3>
                <p className="text-xs text-gray-500">
                  Konfigurasikan spesifikasi teknis, harga lisensi, dan hak fitur paket.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Nama Paket <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Sekolah Unggulan (Pro)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#531FFF] focus:ring-1 focus:ring-[#531FFF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Kode Unik Paket (Slug) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingPackage)}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="trial / standard / pro / enterprise"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#531FFF] focus:ring-1 focus:ring-[#531FFF] disabled:bg-gray-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Tagline Ringkas
                  </label>
                  <input
                    type="text"
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                    placeholder="Contoh: Otomasi lengkap untuk sekolah modern"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#531FFF] focus:ring-1 focus:ring-[#531FFF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Badge Label (Pill)
                  </label>
                  <input
                    type="text"
                    value={formData.badge}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    placeholder="Contoh: Paling Populer / Hemat"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#531FFF] focus:ring-1 focus:ring-[#531FFF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Harga Bulanan (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.priceMonthly}
                    onChange={(e) => setFormData({ ...formData, priceMonthly: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#531FFF] focus:ring-1 focus:ring-[#531FFF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Harga Tahunan (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.priceYearly}
                    onChange={(e) => setFormData({ ...formData, priceYearly: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#531FFF] focus:ring-1 focus:ring-[#531FFF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Kapasitas Maks. Siswa
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxStudents}
                    onChange={(e) => setFormData({ ...formData, maxStudents: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#531FFF] focus:ring-1 focus:ring-[#531FFF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Daftar Fitur (1 fitur per baris)
                </label>
                <textarea
                  rows={6}
                  value={formData.featuresText}
                  onChange={(e) => setFormData({ ...formData, featuresText: e.target.value })}
                  placeholder="Kapasitas hingga 800 Siswa&#10;Presensi Face Recognition & GPS&#10;WhatsApp Gateway Otomatis&#10;Dukungan Prioritas 24/7"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#531FFF] focus:ring-1 focus:ring-[#531FFF] font-sans"
                />
                <span className="text-[11px] text-gray-400">
                  Tulis satu poin fitur per baris. Akan ditampilkan sebagai daftar checklist di formulir & kartu.
                </span>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-[#531FFF] rounded border-gray-300 focus:ring-[#531FFF]"
                  />
                  <span className="text-xs font-bold text-gray-700">Paket Aktif & Tampil</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.isPopular}
                    onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                    className="w-4 h-4 text-[#531FFF] rounded border-gray-300 focus:ring-[#531FFF]"
                  />
                  <span className="text-xs font-bold text-gray-700">Tandai Paling Populer (Highlighted)</span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#531FFF] text-white hover:bg-[#4314cc] text-xs font-bold flex items-center gap-2 shadow-md shadow-[#531FFF]/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingPackage ? "Simpan Perubahan" : "Terbitkan Paket"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {deleteModalOpen && packageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-gray-900">
                Hapus Paket &quot;{packageToDelete.name}&quot;?
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Tindakan ini tidak dapat dibatalkan. Sekolah yang saat ini menggunakan paket ini tetap berjalan, namun paket tidak akan tersedia lagi untuk pendaftaran baru.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white hover:bg-rose-700 text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/20 transition-all disabled:opacity-50"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Hapus Paket</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
