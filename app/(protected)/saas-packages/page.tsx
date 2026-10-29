"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  ArrowRight,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Table as TableIcon,
  LayoutGrid
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
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [popularFilter, setPopularFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("sortOrder_asc");

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

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

  // Search & Filter change handlers
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handlePopularChange = (popular: string) => {
    setPopularFilter(popular);
    setCurrentPage(1);
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setPopularFilter("ALL");
    setSortBy("sortOrder_asc");
    setCurrentPage(1);
  };

  // Filtered packages
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          pkg.name.toLowerCase().includes(q) ||
          pkg.code.toLowerCase().includes(q) ||
          (pkg.tagline && pkg.tagline.toLowerCase().includes(q)) ||
          (pkg.badge && pkg.badge.toLowerCase().includes(q)) ||
          (pkg.features && pkg.features.some((f) => f.toLowerCase().includes(q)));
        if (!match) return false;
      }

      if (statusFilter === "ACTIVE" && !pkg.isActive) return false;
      if (statusFilter === "INACTIVE" && pkg.isActive) return false;

      if (popularFilter === "POPULAR" && !pkg.isPopular) return false;
      if (popularFilter === "REGULAR" && pkg.isPopular) return false;

      return true;
    });
  }, [packages, searchQuery, statusFilter, popularFilter]);

  // Sorted packages
  const sortedPackages = useMemo(() => {
    const list = [...filteredPackages];
    if (sortBy === "sortOrder_asc") {
      list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    } else if (sortBy === "name_asc") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "price_asc") {
      list.sort((a, b) => a.priceMonthly - b.priceMonthly);
    } else if (sortBy === "price_desc") {
      list.sort((a, b) => b.priceMonthly - a.priceMonthly);
    } else if (sortBy === "students_desc") {
      list.sort((a, b) => b.maxStudents - a.maxStudents);
    }
    return list;
  }, [filteredPackages, sortBy]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(sortedPackages.length / (pageSize === -1 ? sortedPackages.length || 1 : pageSize)));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedPackages = useMemo(() => {
    if (pageSize === -1) return sortedPackages;
    const start = (currentPage - 1) * pageSize;
    return sortedPackages.slice(start, start + pageSize);
  }, [sortedPackages, currentPage, pageSize]);

  // Aggregated Stats
  const totalPackages = packages.length;
  const activePackages = packages.filter((p) => p.isActive).length;
  const popularPackage = packages.find((p) => p.isPopular)?.name || "Sekolah Pro";
  const avgMonthlyPrice = totalPackages > 0
    ? Math.round(packages.reduce((sum, p) => sum + p.priceMonthly, 0) / totalPackages)
    : 0;

  return (
    <div className="p-4 sm:p-6 md:p-8 pb-20 max-w-[1600px] mx-auto w-full space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-purple-50 text-[#531FFF] border border-purple-200">
              <ShieldCheck className="w-3.5 h-3.5" /> {isSaaSAdmin ? "SaaS Administrator" : isSuperAdmin ? "Super Admin" : "Operasional SaaS"}
            </span>
            <span className="text-xs font-bold text-gray-400">• Katalog Paket Layanan SaaS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Paket Layanan SaaS Quick Schools
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 max-w-xl">
            Kelola tiers paket berlangganan sekolah, struktur tarif bulanan & tahunan, kuota siswa, serta hak akses modul produk.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchPackages}
            disabled={loading}
            className="p-2.5 sm:px-3 sm:py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            title="Segarkan Data"
          >
            <RefreshCw className={cn("w-4 h-4 text-gray-500", loading && "animate-spin text-[#531FFF]")} />
            <span className="hidden sm:inline">Segarkan</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#531FFF] to-[#4314cc] hover:from-[#4314cc] hover:to-[#380fa8] text-white text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all shadow-md shadow-[#531FFF]/20 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Paket Layanan</span>
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Paket */}
        <div
          onClick={() => handleStatusChange("ALL")}
          className={cn(
            "bg-white p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs space-y-2 group",
            statusFilter === "ALL" && popularFilter === "ALL"
              ? "border-[#531FFF] ring-2 ring-[#531FFF]/20 bg-[#531FFF]/5"
              : "border-gray-100 hover:border-gray-200"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Paket</span>
            <div className="p-2 rounded-xl bg-purple-50 text-[#531FFF]">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-gray-900">{totalPackages}</div>
          <div className="text-[11px] font-semibold text-gray-400">Katalog tiers layanan terdaftar</div>
        </div>

        {/* Paket Aktif */}
        <div
          onClick={() => handleStatusChange(statusFilter === "ACTIVE" ? "ALL" : "ACTIVE")}
          className={cn(
            "bg-white p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs space-y-2 group",
            statusFilter === "ACTIVE"
              ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/40"
              : "border-gray-100 hover:border-gray-200"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Paket Aktif</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700">{activePackages}</div>
          <div className="text-[11px] font-semibold text-emerald-600">Tampil di formulir pendaftaran</div>
        </div>

        {/* Paket Unggulan */}
        <div
          onClick={() => handlePopularChange(popularFilter === "POPULAR" ? "ALL" : "POPULAR")}
          className={cn(
            "bg-white p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs space-y-2 group",
            popularFilter === "POPULAR"
              ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/40"
              : "border-gray-100 hover:border-gray-200"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Paket Unggulan</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Star className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-gray-900 truncate" title={popularPackage}>
            {popularPackage}
          </div>
          <div className="text-[11px] font-semibold text-amber-600">Ditandai paling diminati</div>
        </div>

        {/* Rata-rata Tarif */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Rata-rata Tarif</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-blue-700">
            Rp {avgMonthlyPrice.toLocaleString("id-ID")}
            <span className="text-xs font-medium text-gray-400">/bln</span>
          </div>
          <div className="text-[11px] font-semibold text-gray-400">Benchmark tarif bulanan</div>
        </div>
      </div>

      {/* SEARCH, FILTER, VIEW SWITCHER & BILLING SIMULATOR */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama paket, kode slug, badge, atau fitur..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#531FFF] focus:ring-1 focus:ring-[#531FFF] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters, Sorters & View Mode */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="py-2.5 px-3 rounded-xl border border-gray-200 text-xs sm:text-sm font-bold text-gray-700 bg-white focus:outline-none focus:border-[#531FFF] cursor-pointer"
          >
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">Aktif Saja</option>
            <option value="INACTIVE">Nonaktif Saja</option>
          </select>

          {/* Popular Filter */}
          <select
            value={popularFilter}
            onChange={(e) => handlePopularChange(e.target.value)}
            className="py-2.5 px-3 rounded-xl border border-gray-200 text-xs sm:text-sm font-bold text-gray-700 bg-white focus:outline-none focus:border-[#531FFF] cursor-pointer"
          >
            <option value="ALL">Semua Tipe</option>
            <option value="POPULAR">Unggulan (Populer)</option>
            <option value="REGULAR">Reguler</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="py-2.5 px-3 rounded-xl border border-gray-200 text-xs sm:text-sm font-bold text-gray-700 bg-white focus:outline-none focus:border-[#531FFF] cursor-pointer"
          >
            <option value="sortOrder_asc">Urutan Tampil (Order)</option>
            <option value="name_asc">Nama Paket (A-Z)</option>
            <option value="price_asc">Harga Terendah</option>
            <option value="price_desc">Harga Tertinggi</option>
            <option value="students_desc">Kapasitas Terbanyak</option>
          </select>

          {/* Reset button */}
          {(searchQuery || statusFilter !== "ALL" || popularFilter !== "ALL" || sortBy !== "sortOrder_asc") && (
            <button
              onClick={handleResetFilters}
              className="py-2.5 px-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
              title="Reset Filter"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          {/* View Mode Toggle: Table vs Cards */}
          <div className="inline-flex p-1 bg-gray-100 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer",
                viewMode === "table"
                  ? "bg-white text-[#531FFF] shadow-2xs font-black"
                  : "text-gray-500 hover:text-gray-800"
              )}
              title="Tampilan Tabel Data"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tabel</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={cn(
                "p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer",
                viewMode === "cards"
                  ? "bg-white text-[#531FFF] shadow-2xs font-black"
                  : "text-gray-500 hover:text-gray-800"
              )}
              title="Tampilan Kartu Pricing"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kartu</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: DATA TABLE (DEFAULT) */}
      {viewMode === "table" && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead className="bg-[#F8F9FC] border-b border-gray-100 text-[11px] font-extrabold uppercase text-gray-400 tracking-wider">
                <tr>
                  <th className="py-4 px-3 sm:px-4 text-center w-14">No.</th>
                  <th className="py-4 px-4 sm:px-6">Paket Layanan</th>
                  <th className="py-4 px-4">Harga Bulanan</th>
                  <th className="py-4 px-4">Harga Tahunan</th>
                  <th className="py-4 px-4">Kapasitas</th>
                  <th className="py-4 px-4">Fitur Produk</th>
                  <th className="py-4 px-4 text-center">Urutan</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4 sm:px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-14">
                      <Loader2 className="w-7 h-7 text-[#531FFF] animate-spin mx-auto mb-2" />
                      <p className="text-xs text-gray-500 font-bold">Memuat katalog paket layanan SaaS...</p>
                    </td>
                  </tr>
                ) : sortedPackages.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16 px-4">
                      <div className="w-14 h-14 bg-purple-50 text-[#531FFF] rounded-2xl mx-auto flex items-center justify-center mb-3">
                        <Layers className="w-7 h-7" />
                      </div>
                      <h3 className="text-base font-extrabold text-gray-900">Belum Ada Paket yang Cocok</h3>
                      <p className="text-xs text-gray-400 max-w-md mx-auto mt-1">
                        {searchQuery || statusFilter !== "ALL" || popularFilter !== "ALL"
                          ? "Tidak ada paket layanan yang sesuai dengan kriteria filter pencarian Anda."
                          : "Belum ada paket layanan SaaS yang terdaftar dalam sistem."}
                      </p>
                      {(searchQuery || statusFilter !== "ALL" || popularFilter !== "ALL") && (
                        <button
                          onClick={handleResetFilters}
                          className="mt-4 px-4 py-2 rounded-xl bg-purple-50 text-[#531FFF] hover:bg-purple-100 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset Filter</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedPackages.map((pkg, idx) => {
                    const rowNumber = (currentPage - 1) * (pageSize === -1 ? 0 : pageSize) + idx + 1;

                    return (
                      <tr key={pkg.id} className="hover:bg-purple-50/20 transition-colors group">
                        {/* 1. Row Number */}
                        <td className="py-4 px-3 sm:px-4 text-center font-mono text-xs font-bold text-gray-400">
                          {rowNumber}
                        </td>

                        {/* 2. Paket Layanan */}
                        <td className="py-4 px-4 sm:px-6">
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 mt-0.5 border",
                              pkg.isPopular
                                ? "bg-[#531FFF] text-white border-[#531FFF]"
                                : "bg-purple-50 text-[#531FFF] border-purple-100"
                            )}>
                              {pkg.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                  {pkg.code}
                                </span>
                                {pkg.badge && (
                                  <span className={cn(
                                    "text-[10px] px-2 py-0.2 rounded-full font-black uppercase tracking-wider flex items-center gap-1",
                                    pkg.isPopular ? "bg-[#531FFF] text-white" : "bg-gray-900 text-white"
                                  )}>
                                    {pkg.isPopular && <Star className="w-2.5 h-2.5 fill-current text-amber-300" />}
                                    <span>{pkg.badge}</span>
                                  </span>
                                )}
                              </div>
                              <p className="font-extrabold text-gray-900 leading-tight">
                                {pkg.name}
                              </p>
                              <p className="text-[11px] text-gray-400 line-clamp-1 max-w-xs">
                                {pkg.tagline || "Solusi manajemen sekolah Quick Schools"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* 3. Harga Bulanan */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="space-y-0.5">
                            <span className="font-black text-gray-900 text-sm block">
                              {pkg.priceMonthly === 0 ? "Gratis" : `Rp ${pkg.priceMonthly.toLocaleString("id-ID")}`}
                            </span>
                            <span className="text-[10px] text-gray-400 font-semibold block">
                              per bulan / sekolah
                            </span>
                          </div>
                        </td>

                        {/* 4. Harga Tahunan */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="space-y-0.5">
                            <span className="font-black text-[#531FFF] text-sm block">
                              {pkg.priceYearly === 0 ? "Gratis" : `Rp ${pkg.priceYearly.toLocaleString("id-ID")}`}
                            </span>
                            {pkg.priceYearly > 0 && pkg.priceMonthly > 0 && (
                              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-extrabold inline-block border border-emerald-200">
                                Hemat 2 Bulan
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 5. Kapasitas */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-50 border border-gray-200/80 text-gray-800 font-bold text-xs">
                            <Users className="w-3.5 h-3.5 text-[#531FFF]" />
                            <span>Maks. {pkg.maxStudents.toLocaleString("id-ID")} Siswa</span>
                          </div>
                        </td>

                        {/* 6. Fitur Produk */}
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-50 text-[#531FFF] border border-purple-100">
                              {pkg.features?.length || 0} Fitur Termasuk
                            </span>
                            <p className="text-[11px] text-gray-500 line-clamp-1 max-w-[180px]">
                              {pkg.features?.[0] || "Fitur standar sekolah"}
                            </p>
                          </div>
                        </td>

                        {/* 7. Urutan */}
                        <td className="py-4 px-4 text-center font-mono text-xs font-bold text-gray-500">
                          <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-700">
                            #{pkg.sortOrder || 0}
                          </span>
                        </td>

                        {/* 8. Status */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black border",
                              pkg.isActive
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-gray-100 text-gray-600 border-gray-200"
                            )}
                          >
                            <span className={cn(
                              "w-1.5 h-1.5 rounded-full shrink-0",
                              pkg.isActive ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
                            )} />
                            <span>{pkg.isActive ? "Aktif" : "Nonaktif"}</span>
                          </span>
                        </td>

                        {/* 9. Aksi */}
                        <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleToggleActive(pkg)}
                              className={cn(
                                "p-2 rounded-xl transition-colors cursor-pointer",
                                pkg.isActive
                                  ? "text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                                  : "text-emerald-600 hover:bg-emerald-50"
                              )}
                              title={pkg.isActive ? "Nonaktifkan Paket" : "Aktifkan Paket"}
                            >
                              {pkg.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                            </button>

                            <button
                              onClick={() => handleOpenEdit(pkg)}
                              className="p-2 rounded-xl text-gray-600 hover:text-[#531FFF] hover:bg-purple-50 transition-colors cursor-pointer"
                              title="Edit Data Paket"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => {
                                setPackageToDelete(pkg);
                                setDeleteModalOpen(true);
                              }}
                              className="p-2 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Hapus Paket"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* TABLE SUMMARY & PAGINATION FOOTER */}
          {!loading && sortedPackages.length > 0 && (
            <div className="px-6 py-4 bg-gray-50/70 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500 font-medium">
              {/* Left: Summary and Page Size */}
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  Menampilkan{" "}
                  <span className="font-bold text-gray-800">
                    {pageSize === -1
                      ? sortedPackages.length
                      : Math.min((currentPage - 1) * pageSize + 1, sortedPackages.length)}
                    -
                    {pageSize === -1
                      ? sortedPackages.length
                      : Math.min(currentPage * pageSize, sortedPackages.length)}
                  </span>{" "}
                  dari <span className="font-bold text-gray-800">{sortedPackages.length}</span> paket layanan
                  {filteredPackages.length !== packages.length && (
                    <span className="text-gray-400 ml-1">(difilter dari total {packages.length})</span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 pl-2 border-l border-gray-200">
                  <span className="text-[11px] text-gray-400">Baris:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 rounded-lg border border-gray-200 bg-white font-bold text-gray-700 cursor-pointer text-xs"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={-1}>Semua</option>
                  </select>
                </div>
              </div>

              {/* Right: Page Buttons */}
              {pageSize !== -1 && totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white text-gray-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
                    title="Halaman Sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={cn(
                              "w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer",
                              currentPage === page
                                ? "bg-[#531FFF] text-white shadow-2xs font-black"
                                : "border border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
                            )}
                          >
                            {page}
                          </button>
                        );
                      }
                      if (
                        (page === currentPage - 2 && page > 1) ||
                        (page === currentPage + 2 && page < totalPages)
                      ) {
                        return (
                          <span key={page} className="px-1 text-gray-400 text-xs">
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white text-gray-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
                    title="Halaman Selanjutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 2: PRICING CARDS GRID */}
      {viewMode === "cards" && (
        <div className="space-y-6">
          {/* Cycle Toggle Simulator */}
          <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-gray-100 shadow-2xs flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-[#531FFF]" />
              <div>
                <h3 className="text-sm font-bold text-gray-900">Simulasi Tampilan Kartu Berlangganan</h3>
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

          {/* Cards Grid */}
          {loading ? (
            <div className="bg-white p-12 rounded-3xl border border-gray-100 shadow-2xs flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#531FFF] animate-spin" />
              <p className="text-sm font-bold text-gray-600">Memuat katalog paket layanan SaaS...</p>
            </div>
          ) : sortedPackages.length === 0 ? (
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
              {sortedPackages.map((pkg) => {
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
                        {(pkg.features || []).map((feat, fIdx) => (
                          <div key={fIdx} className="flex items-start gap-2.5 text-xs text-gray-600 leading-snug">
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
                        <span>Konfigurasi Paket</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Urutan Tampil (Sort Order)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#531FFF] focus:ring-1 focus:ring-[#531FFF]"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center gap-6 pt-5">
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
                    <span className="text-xs font-bold text-gray-700">Tandai Populer (Highlight)</span>
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#531FFF] text-white hover:bg-[#4314cc] text-xs font-bold flex items-center gap-2 shadow-md shadow-[#531FFF]/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
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
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white hover:bg-rose-700 text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/20 transition-all disabled:opacity-50 cursor-pointer"
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
