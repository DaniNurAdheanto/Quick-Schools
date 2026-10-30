"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ShieldCheck,
  Building2,
  Search,
  RefreshCw,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  AlertCircle,
  KeyRound,
  ChevronLeft,
  ChevronRight,
  Download,
  Sparkles,
  Copy,
  Check,
  Send,
  Eye,
  EyeOff,
  UserCheck,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

interface SchoolAdminItem {
  id: string;
  customerId?: string | null;
  customerCode: string;
  schoolName: string;
  schoolLevel: string;
  schoolType: string;
  npsn: string;
  subdomain: string;
  city: string;
  province: string;
  plan: string;
  subscriptionStatus: string;
  currentStudents: number;
  maxStudents: number;
  activeModules: string[];
  subscriptionEnd?: string | null;
  schoolCreatedAt: string;

  adminName: string;
  adminRole: string;
  adminEmail: string;
  adminPhone: string;

  hasAccount: boolean;
  userId?: string | null;
  userRole: string;
  userStatus: "AKTIF" | "NONAKTIF" | "BELUM_DIBUAT";
  onboardingCompleted: boolean;
  accountCreatedAt?: string | null;
  accountUpdatedAt?: string | null;
}

interface SummaryStats {
  totalAdmins: number;
  activeAccounts: number;
  pendingAccounts: number;
  activeSchools: number;
}

const PLAN_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  pro: { label: "Sekolah Pro", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  standard: { label: "Sekolah Rintisan", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  enterprise: { label: "Yayasan Enterprise", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  trial: { label: "Uji Coba 14 Hari", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
};

export default function SaaSSchoolAdminsPage() {
  const { isSaaSAdmin } = useAuth();
  const toast = useToast();

  const [admins, setAdmins] = useState<SchoolAdminItem[]>([]);
  const [summary, setSummary] = useState<SummaryStats>({
    totalAdmins: 0,
    activeAccounts: 0,
    pendingAccounts: 0,
    activeSchools: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSchoolStatus, setSelectedSchoolStatus] = useState("ALL");
  const [selectedAccountStatus, setSelectedAccountStatus] = useState("ALL");
  const [selectedPlan, setSelectedPlan] = useState("ALL");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Detail Modal & Action states
  const [selectedAdmin, setSelectedAdmin] = useState<SchoolAdminItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Provisioning & Password Reset Modal states
  const [isProvisionOpen, setIsProvisionOpen] = useState(false);
  const [customPassword, setCustomPassword] = useState("AdminSekolah123!");
  const [showPassword, setShowPassword] = useState(false);
  const [lastGeneratedCreds, setLastGeneratedCreds] = useState<{ email: string; pass: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch Data from API
  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas-school-admins");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAdmins(json.data);
        if (json.summary) {
          setSummary(json.summary);
        }
      } else {
        throw new Error(json.error || "Gagal memuat data super admin sekolah");
      }
    } catch (err: any) {
      console.error("fetchAdmins error:", err);
      toast.showError(err.message || "Gagal memuat data super admin sekolah", "Terjadi Kesalahan");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  // Filtering Logic
  const filteredAdmins = useMemo(() => {
    return admins.filter((item) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchSearch =
          item.adminName.toLowerCase().includes(q) ||
          item.adminEmail.toLowerCase().includes(q) ||
          item.schoolName.toLowerCase().includes(q) ||
          item.customerCode.toLowerCase().includes(q) ||
          item.npsn.toLowerCase().includes(q) ||
          item.subdomain.toLowerCase().includes(q) ||
          item.adminPhone.toLowerCase().includes(q);
        if (!matchSearch) return false;
      }

      // 2. School Status Filter
      if (selectedSchoolStatus !== "ALL" && item.subscriptionStatus !== selectedSchoolStatus) {
        return false;
      }

      // 3. Account Status Filter
      if (selectedAccountStatus !== "ALL") {
        if (selectedAccountStatus === "TERDAFTAR" && !item.hasAccount) return false;
        if (selectedAccountStatus === "BELUM_DIBUAT" && item.hasAccount) return false;
        if (selectedAccountStatus === "AKTIF" && item.userStatus !== "AKTIF") return false;
        if (selectedAccountStatus === "NONAKTIF" && item.userStatus !== "NONAKTIF") return false;
      }

      // 4. Plan Filter
      if (selectedPlan !== "ALL" && item.plan !== selectedPlan) {
        return false;
      }

      return true;
    });
  }, [admins, searchQuery, selectedSchoolStatus, selectedAccountStatus, selectedPlan]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedSchoolStatus, selectedAccountStatus, selectedPlan]);

  // Pagination Slice
  const totalItems = filteredAdmins.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedAdmins = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAdmins.slice(start, start + pageSize);
  }, [filteredAdmins, currentPage, pageSize]);

  // Action: Open Detail Modal
  const handleOpenDetail = (admin: SchoolAdminItem) => {
    setSelectedAdmin(admin);
    setIsDetailOpen(true);
    setLastGeneratedCreds(null);
  };

  // Action: Provision / Create Super Admin Account
  const handleProvisionAccount = async (admin: SchoolAdminItem, passOverride?: string) => {
    setActionLoading(true);
    try {
      const passToUse = passOverride || customPassword || "AdminSekolah123!";
      const res = await fetch("/api/saas-school-admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "PROVISION_ACCOUNT",
          customerId: admin.customerId,
          email: admin.adminEmail,
          name: admin.adminName,
          phone: admin.adminPhone,
          password: passToUse,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal mengaktivasi akun");
      }

      toast.showSuccess(
        `Akun Super Admin untuk ${admin.adminName} (${admin.adminEmail}) berhasil diaktivasi!`,
        "Aktivasi Berhasil"
      );

      setLastGeneratedCreds({
        email: admin.adminEmail,
        pass: passToUse,
      });

      // Update local state
      await fetchAdmins();

      // Update selected admin state if modal is open
      setSelectedAdmin((prev) =>
        prev && prev.id === admin.id
          ? {
              ...prev,
              hasAccount: true,
              userStatus: "AKTIF",
              userRole: "SUPER_ADMIN",
            }
          : prev
      );
      setIsProvisionOpen(false);
    } catch (err: any) {
      toast.showError(err.message || "Gagal membuat akun Super Admin", "Kesalahan");
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Reset Password
  const handleResetPassword = async (admin: SchoolAdminItem) => {
    setActionLoading(true);
    try {
      const newPassword = `Admin${Math.floor(100000 + Math.random() * 900000)}!`;
      const res = await fetch("/api/saas-school-admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RESET_PASSWORD",
          userId: admin.userId,
          email: admin.adminEmail,
          password: newPassword,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal me-reset password");
      }

      toast.showSuccess(
        `Kata sandi baru berhasil disetel untuk ${admin.adminName}: ${newPassword}`,
        "Password Di-reset"
      );

      setLastGeneratedCreds({
        email: admin.adminEmail,
        pass: newPassword,
      });
    } catch (err: any) {
      toast.showError(err.message || "Gagal me-reset kata sandi", "Kesalahan");
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Toggle Account Status (Aktif / Nonaktif)
  const handleToggleStatus = async (admin: SchoolAdminItem) => {
    setActionLoading(true);
    try {
      const nextStatus = admin.userStatus === "AKTIF" ? "NONAKTIF" : "AKTIF";
      const res = await fetch("/api/saas-school-admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TOGGLE_STATUS",
          userId: admin.userId,
          email: admin.adminEmail,
          targetStatus: nextStatus,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal memperbarui status akun");
      }

      toast.showSuccess(
        `Status akun Super Admin ${admin.adminName} kini ${nextStatus}.`,
        "Status Diperbarui"
      );

      // Update local state
      setAdmins((prev) =>
        prev.map((item) =>
          item.id === admin.id ? { ...item, userStatus: nextStatus as any } : item
        )
      );

      if (selectedAdmin && selectedAdmin.id === admin.id) {
        setSelectedAdmin((prev) => (prev ? { ...prev, userStatus: nextStatus as any } : null));
      }
    } catch (err: any) {
      toast.showError(err.message || "Gagal memperbarui status akun", "Kesalahan");
    } finally {
      setActionLoading(false);
    }
  };

  // Copy to clipboard helper
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.showSuccess("Kredensial berhasil disalin ke papan klip!", "Tersalin");
    setTimeout(() => setCopied(false), 2000);
  };

  // Export CSV Helper
  const handleExportCSV = () => {
    const headers = [
      "No",
      "Nama Sekolah",
      "Jenjang",
      "NPSN",
      "Subdomain",
      "Nama Super Admin",
      "Jabatan PIC",
      "Email Login",
      "WhatsApp",
      "Status Akun",
      "Paket SaaS",
      "Status Langganan",
    ];

    const rows = filteredAdmins.map((item, idx) => [
      idx + 1,
      `"${item.schoolName.replace(/"/g, '""')}"`,
      item.schoolLevel,
      item.npsn,
      item.subdomain,
      `"${item.adminName.replace(/"/g, '""')}"`,
      `"${item.adminRole.replace(/"/g, '""')}"`,
      item.adminEmail,
      item.adminPhone,
      item.userStatus,
      item.plan.toUpperCase(),
      item.subscriptionStatus,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Daftar_Super_Admin_Sekolah_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.showSuccess("Data Super Admin berhasil diekspor ke CSV.", "Ekspor Selesai");
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 pb-20 max-w-[1600px] mx-auto w-full space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. HEADER SECTION & EXECUTIVE ACTIONS                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-purple-100 text-[#531FFF] border border-purple-200">
              Direktori Administrator Sekolah
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              {isSaaSAdmin ? "SaaS Administrator" : "Operasional SaaS"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2.5 pt-1">
            <span>Data Super Admin Sekolah</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium">
            Direktori resmi akun Administrator Utama (Super Admin) dan Penanggung Jawab (PIC) untuk setiap institusi sekolah mitra Quick Schools.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchAdmins}
            disabled={loading}
            className="px-3.5 py-2.5 rounded-xl border border-gray-200 hover:border-gray-300 bg-white text-gray-700 font-bold text-xs flex items-center gap-2 shadow-2xs hover:bg-gray-50 transition-all cursor-pointer disabled:opacity-60"
            title="Muat ulang data dari basis data"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-gray-500", loading && "animate-spin text-[#531FFF]")} />
            <span>{loading ? "Memperbarui..." : "Segarkan"}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-bold text-xs flex items-center gap-2 shadow-2xs hover:bg-gray-50 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. TOP KPI SUMMARY METRICS                                    */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Super Admin */}
        <div className="bg-white p-5 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#531FFF] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Super Admin</p>
            <h3 className="text-2xl font-black text-gray-900 mt-0.5">{summary.totalAdmins} Akun</h3>
            <p className="text-[11px] text-gray-500 font-medium">Dari seluruh institusi sekolah mitra</p>
          </div>
        </div>

        {/* Card 2: Akun Aktif */}
        <div className="bg-white p-5 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Akun Login Aktif</p>
            <h3 className="text-2xl font-black text-gray-900 mt-0.5">{summary.activeAccounts} Akun</h3>
            <p className="text-[11px] text-emerald-600 font-bold">Terverifikasi di sistem otentikasi</p>
          </div>
        </div>

        {/* Card 3: Perlu Aktivasi / Belum Dibuat */}
        <div className="bg-white p-5 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Belum Aktivasi</p>
            <h3 className="text-2xl font-black text-gray-900 mt-0.5">{summary.pendingAccounts} Sekolah</h3>
            <p className="text-[11px] text-amber-600 font-bold">Perlu diterbitkan kredensial login</p>
          </div>
        </div>

        {/* Card 4: Sekolah Aktif Terkelola */}
        <div className="bg-white p-5 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sekolah Aktif</p>
            <h3 className="text-2xl font-black text-gray-900 mt-0.5">{summary.activeSchools} Sekolah</h3>
            <p className="text-[11px] text-gray-500 font-medium">Memiliki lisensi berlangganan aktif</p>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. FILTER, SEARCH & CONTROLS BAR                             */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-2xs space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Search Bar (Span 5) */}
          <div className="lg:col-span-5 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari Super Admin, nama sekolah, email, NPSN, subdomain..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/10 transition-all placeholder:text-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Akun Filter (Span 3) */}
          <div className="lg:col-span-3">
            <select
              value={selectedAccountStatus}
              onChange={(e) => setSelectedAccountStatus(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 bg-white focus:outline-none focus:border-[#531FFF] cursor-pointer"
            >
              <option value="ALL">Semua Status Akun (Login)</option>
              <option value="AKTIF">Akun Aktif (Dapat Login)</option>
              <option value="BELUM_DIBUAT">Belum Diaktivasi / Dibuat</option>
              <option value="NONAKTIF">Akun Dinonaktifkan</option>
            </select>
          </div>

          {/* Status Sekolah Filter (Span 2) */}
          <div className="lg:col-span-2">
            <select
              value={selectedSchoolStatus}
              onChange={(e) => setSelectedSchoolStatus(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 bg-white focus:outline-none focus:border-[#531FFF] cursor-pointer"
            >
              <option value="ALL">Semua Status Sekolah</option>
              <option value="AKTIF">Sekolah Aktif</option>
              <option value="TRIAL">Sekolah Trial</option>
              <option value="SUSPENDED">Sekolah Ditangguhkan</option>
            </select>
          </div>

          {/* Filter Paket SaaS (Span 2) */}
          <div className="lg:col-span-2">
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 bg-white focus:outline-none focus:border-[#531FFF] cursor-pointer"
            >
              <option value="ALL">Semua Paket</option>
              <option value="pro">Sekolah Pro</option>
              <option value="standard">Sekolah Rintisan</option>
              <option value="enterprise">Yayasan Enterprise</option>
              <option value="trial">Uji Coba Trial</option>
            </select>
          </div>
        </div>

        {/* Filter tags & Reset */}
        {(searchQuery || selectedAccountStatus !== "ALL" || selectedSchoolStatus !== "ALL" || selectedPlan !== "ALL") && (
          <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
            <span className="text-gray-500 font-medium">
              Menampilkan <strong>{filteredAdmins.length}</strong> dari {admins.length} total Super Admin
            </span>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedAccountStatus("ALL");
                setSelectedSchoolStatus("ALL");
                setSelectedPlan("ALL");
              }}
              className="text-[#531FFF] hover:underline font-bold"
            >
              Reset Filter
            </button>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. SUPER ADMIN TABLE                                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-black text-gray-400 uppercase tracking-wider">
                <th className="py-4 px-4 sm:px-6 w-14 text-center">No.</th>
                <th className="py-4 px-4 sm:px-6">Sekolah & Subdomain</th>
                <th className="py-4 px-4 sm:px-6">Super Admin (PIC)</th>
                <th className="py-4 px-4 sm:px-6">Kontak & Email Login</th>
                <th className="py-4 px-4 sm:px-6">Status Akun Login</th>
                <th className="py-4 px-4 sm:px-6">Paket SaaS</th>
                <th className="py-4 px-4 sm:px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#531FFF] mb-2" />
                    <p className="font-bold text-gray-600">Memuat direktori Super Admin sekolah...</p>
                  </td>
                </tr>
              ) : paginatedAdmins.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-400">
                    <ShieldCheck className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                    <p className="font-bold text-gray-700 text-sm">Tidak ada data Super Admin yang cocok</p>
                    <p className="text-xs text-gray-400 mt-0.5">Coba ubah kata kunci pencarian atau reset filter</p>
                  </td>
                </tr>
              ) : (
                paginatedAdmins.map((item, index) => {
                  const rowNumber = (currentPage - 1) * pageSize + index + 1;
                  const planMeta = PLAN_CONFIG[item.plan] || {
                    label: item.plan.toUpperCase(),
                    bg: "bg-gray-100",
                    text: "text-gray-800",
                    border: "border-gray-200",
                  };

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-purple-50/20 transition-colors group"
                    >
                      {/* No. */}
                      <td className="py-4 px-4 sm:px-6 font-mono font-bold text-gray-400 text-center">
                        {rowNumber}
                      </td>

                      {/* Sekolah & Subdomain */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-purple-100 text-[#531FFF] flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                            {item.schoolName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-gray-900 group-hover:text-[#531FFF] transition-colors">
                                {item.schoolName}
                              </span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                {item.schoolLevel}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500 font-medium">
                              <span className="font-mono text-gray-400">NPSN: {item.npsn}</span>
                              <span>•</span>
                              <span className="font-mono text-[#531FFF] font-bold">
                                {item.subdomain}.quickschools.id
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Super Admin (PIC) */}
                      <td className="py-4 px-4 sm:px-6">
                        <div>
                          <div className="font-extrabold text-gray-900 flex items-center gap-1.5">
                            <span>{item.adminName}</span>
                            {item.hasAccount && (
                              <span title="Akun login resmi aktif">
                                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                            {item.adminRole}
                          </p>
                        </div>
                      </td>

                      {/* Kontak & Email Login */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-gray-700 font-semibold text-[11px]">
                            <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="font-mono truncate max-w-[200px]" title={item.adminEmail}>
                              {item.adminEmail}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <a
                              href={`https://wa.me/${item.adminPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                                `Halo Bpk/Ibu ${item.adminName} (${item.schoolName}), perkenalkan kami dari Tim Solusi SaaS Quick Schools.`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                              title="Kirim pesan WhatsApp langsung"
                            >
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span>{item.adminPhone}</span>
                            </a>
                          </div>
                        </div>
                      </td>

                      {/* Status Akun Login (User Model) */}
                      <td className="py-4 px-4 sm:px-6">
                        {item.userStatus === "AKTIF" ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Aktif & Siap Login</span>
                            </span>
                            <p className="text-[10px] text-gray-400 pl-1 font-mono">Role: Super Admin</p>
                          </div>
                        ) : item.userStatus === "BELUM_DIBUAT" ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              <AlertCircle className="w-3 h-3" />
                              <span>Belum Diaktivasi</span>
                            </span>
                            <div>
                              <button
                                onClick={() => {
                                  setSelectedAdmin(item);
                                  setIsProvisionOpen(true);
                                }}
                                className="text-[10px] font-extrabold text-[#531FFF] hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <Sparkles className="w-2.5 h-2.5" />
                                <span>Aktivasi Akun Sekarang</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                            <XCircle className="w-3 h-3" />
                            <span>Dinonaktifkan</span>
                          </span>
                        )}
                      </td>

                      {/* Paket SaaS */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="space-y-1">
                          <span
                            className={cn(
                              "text-[10px] font-black px-2 py-0.5 rounded-md border uppercase inline-block",
                              planMeta.bg,
                              planMeta.text,
                              planMeta.border
                            )}
                          >
                            {planMeta.label}
                          </span>
                          <p className="text-[10px] text-gray-400 font-medium">
                            Status: <strong className="text-gray-700">{item.subscriptionStatus}</strong>
                          </p>
                        </div>
                      </td>

                      {/* Aksi */}
                      <td className="py-4 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDetail(item)}
                            className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-[#531FFF] text-[#531FFF] hover:text-white font-extrabold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs group-hover:bg-[#531FFF] group-hover:text-white"
                            title="Buka rincian Super Admin & pengelolaan akun"
                          >
                            <span>Kelola Akun</span>
                            <ChevronRight className="w-3.5 h-3.5" />
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

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TABLE FOOTER SUMMARY & PAGINATION                             */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-gray-500 font-medium text-center sm:text-left">
            Menampilkan{" "}
            <strong>
              {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1} -{" "}
              {Math.min(currentPage * pageSize, totalItems)}
            </strong>{" "}
            dari <strong>{totalItems}</strong> Super Admin Sekolah
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-gray-700 px-2">
              Halaman {currentPage} dari {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. MODAL DETAIL SUPER ADMIN & OPERASIONAL AKUN                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isDetailOpen && selectedAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto space-y-6">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-purple-50 text-[#531FFF] flex items-center justify-center font-black">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-gray-900">
                    Rincian Super Admin Sekolah
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    {selectedAdmin.schoolName} ({selectedAdmin.customerCode})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Identitas Super Admin */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/70 p-4 rounded-2xl border border-gray-100 text-xs">
              <div>
                <p className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Nama Lengkap Super Admin</p>
                <p className="font-black text-gray-900 text-sm mt-0.5">{selectedAdmin.adminName}</p>
                <p className="text-gray-500 font-medium">{selectedAdmin.adminRole}</p>
              </div>

              <div>
                <p className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Email Login Resmi</p>
                <p className="font-mono font-black text-[#531FFF] text-xs mt-0.5">{selectedAdmin.adminEmail}</p>
                <p className="text-gray-500 text-[11px] font-medium">No. WA: {selectedAdmin.adminPhone}</p>
              </div>

              <div>
                <p className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Subdomain Instansi</p>
                <p className="font-mono font-bold text-gray-800 text-xs mt-0.5">
                  https://{selectedAdmin.subdomain}.quickschools.id
                </p>
              </div>

              <div>
                <p className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Status Akun di Database</p>
                <div className="mt-0.5">
                  {selectedAdmin.userStatus === "AKTIF" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-2.5 h-2.5" /> AKTIF (Bisa Login)
                    </span>
                  ) : selectedAdmin.userStatus === "BELUM_DIBUAT" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      <AlertCircle className="w-2.5 h-2.5" /> BELUM DIAKTIVASI
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                      <XCircle className="w-2.5 h-2.5" /> DINONAKTIFKAN
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Jika ada kredensial baru yang di-generate */}
            {lastGeneratedCreds && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-emerald-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    Kredensial Login Super Admin Terbaru:
                  </span>
                  <button
                    onClick={() =>
                      handleCopy(
                        `*Kredensial Super Admin Quick Schools*\nSekolah: ${selectedAdmin.schoolName}\nEmail: ${lastGeneratedCreds.email}\nPassword: ${lastGeneratedCreds.pass}\nURL Login: https://${selectedAdmin.subdomain}.quickschools.id/login`
                      )
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10px] hover:bg-emerald-700 transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? "Tersalin!" : "Salin Kredensial"}</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded-xl border border-emerald-100 font-mono text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px]">Email Login:</span>
                    <strong className="text-gray-900">{lastGeneratedCreds.email}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">Password:</span>
                    <strong className="text-emerald-700">{lastGeneratedCreds.pass}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Tombol Aksi Operasional */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-500">
                Tindakan Operasional Akun
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Aksi 1: Aktivasi / Buat Akun */}
                {!selectedAdmin.hasAccount ? (
                  <button
                    onClick={() => {
                      setIsDetailOpen(false);
                      setIsProvisionOpen(true);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#531FFF] to-purple-800 hover:from-[#4314cc] hover:to-purple-900 text-white font-extrabold text-xs shadow-md shadow-[#531FFF]/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Aktivasi Akun Super Admin</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleResetPassword(selectedAdmin)}
                    disabled={actionLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-white border border-gray-200 hover:border-purple-200 hover:bg-purple-50/50 text-[#531FFF] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>{actionLoading ? "Memproses..." : "Reset Kata Sandi"}</span>
                  </button>
                )}

                {/* Aksi 2: Toggle Status Aktif/Nonaktif */}
                {selectedAdmin.hasAccount && (
                  <button
                    onClick={() => handleToggleStatus(selectedAdmin)}
                    disabled={actionLoading}
                    className={cn(
                      "w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 border",
                      selectedAdmin.userStatus === "AKTIF"
                        ? "bg-white border-rose-200 text-rose-600 hover:bg-rose-50"
                        : "bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    )}
                  >
                    {selectedAdmin.userStatus === "AKTIF" ? (
                      <>
                        <XCircle className="w-4 h-4" />
                        <span>Nonaktifkan Akses Super Admin</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Aktifkan Kembali Akun</span>
                      </>
                    )}
                  </button>
                )}

                {/* Aksi 3: Kirim Kredensial via WA */}
                <a
                  href={`https://wa.me/${selectedAdmin.adminPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                    `Halo Bpk/Ibu ${selectedAdmin.adminName},\n\nBerikut informasi akun Super Administrator Quick Schools untuk sekolah ${selectedAdmin.schoolName}:\n\n` +
                      `• Portal Sekolah: https://${selectedAdmin.subdomain}.quickschools.id\n` +
                      `• Email Login: ${selectedAdmin.adminEmail}\n` +
                      (lastGeneratedCreds?.pass ? `• Kata Sandi Sementara: ${lastGeneratedCreds.pass}\n\n` : `• Status: Akun Anda telah aktif.\n\n`) +
                      `Silakan login dan lengkapi konfigurasi data sekolah Anda. Jika membutuhkan bantuan teknis, Tim Quick Schools siap membantu.\n\nTerima kasih!`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer sm:col-span-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim Informasi Kredensial via WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 6. MODAL AKTIVASI AKUN SUPER ADMIN BARU                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isProvisionOpen && selectedAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in zoom-in-95 duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-gray-100 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-[#531FFF] flex items-center justify-center font-black">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900">Aktivasi Akun Super Admin</h3>
                <p className="text-xs text-gray-500">{selectedAdmin.schoolName}</p>
              </div>
            </div>

            <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 text-xs space-y-1">
              <p className="text-gray-500 font-medium">
                Nama PIC: <strong className="text-gray-900">{selectedAdmin.adminName}</strong>
              </p>
              <p className="text-gray-500 font-medium">
                Email Login: <strong className="text-[#531FFF] font-mono">{selectedAdmin.adminEmail}</strong>
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Kata Sandi Sementara (Default)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 font-mono font-bold text-gray-800 pr-10 focus:outline-none focus:border-[#531FFF]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  PIC sekolah dapat mengubah password ini setelah berhasil login.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsProvisionOpen(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleProvisionAccount(selectedAdmin)}
                className="px-5 py-2 rounded-xl bg-[#531FFF] hover:bg-[#4314cc] text-white font-extrabold text-xs shadow-md shadow-[#531FFF]/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{actionLoading ? "Memproses..." : "Aktifkan Sekarang"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
