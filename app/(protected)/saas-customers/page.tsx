"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Search,
  Plus,
  Edit,
  Trash2,
  Phone,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Download,
  RefreshCw,
  X,
  ShieldCheck,
  CreditCard,
  School,
  Users,
  Eye,
  Check,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";

export type CustomerStatus = "AKTIF" | "TRIAL" | "SUSPENDED" | "NONAKTIF";

export interface SaaSCustomerItem {
  id: string;
  customerCode: string;
  schoolName: string;
  npsn?: string | null;
  subdomain?: string | null;
  schoolLevel: string;
  schoolType?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  logoUrl?: string | null;
  picName: string;
  picRole: string;
  picEmail: string;
  picPhone: string;
  plan: string;
  status: CustomerStatus;
  billingCycle: string;
  priceAmount: number;
  maxStudents: number;
  currentStudents: number;
  activeModules: string[];
  subscriptionStart: string;
  subscriptionEnd?: string | null;
  notes?: string | null;
  subscriptionRequestId?: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<
  CustomerStatus,
  { label: string; bg: string; text: string; border: string; icon: any }
> = {
  AKTIF: {
    label: "Aktif",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
    icon: CheckCircle2,
  },
  TRIAL: {
    label: "Masa Trial",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    icon: Clock,
  },
  SUSPENDED: {
    label: "Ditangguhkan",
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200",
    icon: AlertTriangle,
  },
  NONAKTIF: {
    label: "Nonaktif",
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-200",
    icon: XCircle,
  },
};

const PLAN_CONFIG: Record<string, { label: string; badge: string; color: string }> = {
  trial: { label: "Uji Coba 14 Hari", badge: "Trial", color: "bg-amber-100 text-amber-800 border-amber-200" },
  standard: { label: "Sekolah Rintisan", badge: "Standard", color: "bg-blue-100 text-blue-800 border-blue-200" },
  pro: { label: "Sekolah Unggulan", badge: "Pro", color: "bg-purple-100 text-purple-800 border-purple-200" },
  enterprise: { label: "Yayasan Multi-Kampus", badge: "Enterprise", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
};

const AVAILABLE_MODULES = [
  { id: "mod_presensi", name: "Presensi Face ID & GPS" },
  { id: "mod_keuangan", name: "SPP & Kas Keuangan" },
  { id: "mod_rapor", name: "E-Rapor Kurikulum Merdeka" },
  { id: "mod_akademik", name: "Akademik & Kalender" },
  { id: "mod_pengumuman", name: "Broadcast WhatsApp" },
  { id: "mod_ujian", name: "Jadwal & Ujian CBT" },
];

export default function SaaSCustomersPage() {
  const toast = useToast();
  const { isSuperAdmin } = useAuth();

  const [customers, setCustomers] = useState<SaaSCustomerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<any>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [planFilter, setPlanFilter] = useState<string>("ALL");

  // Modals & Drawers
  const [selectedCustomer, setSelectedCustomer] = useState<SaaSCustomerItem | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<SaaSCustomerItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State (for Create & Edit)
  const [formData, setFormData] = useState({
    id: "",
    schoolName: "",
    npsn: "",
    subdomain: "",
    schoolLevel: "SMA/MA",
    schoolType: "Swasta",
    address: "",
    city: "",
    province: "",
    picName: "",
    picRole: "Kepala Sekolah",
    picEmail: "",
    picPhone: "",
    plan: "pro",
    status: "AKTIF" as CustomerStatus,
    billingCycle: "MONTHLY",
    priceAmount: 199000,
    maxStudents: 1000,
    currentStudents: 0,
    activeModules: ["mod_presensi", "mod_keuangan", "mod_rapor"],
    subscriptionStart: new Date().toISOString().split("T")[0],
    subscriptionEnd: "",
    notes: "",
  });

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (planFilter !== "ALL") params.append("plan", planFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await fetch(`/api/saas-customers?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers || []);
        setStats(data.stats || null);
      } else {
        throw new Error(data.error || "Gagal memuat pelanggan");
      }
    } catch (err: any) {
      console.error("fetchCustomers error:", err);
      toast.showError(err.message || "Gagal mengambil data pelanggan SaaS", "Gagal Memuat");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, planFilter, searchQuery, toast]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const openCreateModal = () => {
    setFormData({
      id: "",
      schoolName: "",
      npsn: "",
      subdomain: "",
      schoolLevel: "SMA/MA",
      schoolType: "Swasta",
      address: "",
      city: "",
      province: "",
      picName: "",
      picRole: "Kepala Sekolah",
      picEmail: "",
      picPhone: "",
      plan: "pro",
      status: "AKTIF",
      billingCycle: "MONTHLY",
      priceAmount: 199000,
      maxStudents: 1000,
      currentStudents: 0,
      activeModules: ["mod_presensi", "mod_keuangan", "mod_rapor", "mod_pengumuman"],
      subscriptionStart: new Date().toISOString().split("T")[0],
      subscriptionEnd: "",
      notes: "",
    });
    setIsCreateModalOpen(true);
  };

  const openEditModal = (cust: SaaSCustomerItem) => {
    setFormData({
      id: cust.id,
      schoolName: cust.schoolName,
      npsn: cust.npsn || "",
      subdomain: cust.subdomain || "",
      schoolLevel: cust.schoolLevel,
      schoolType: cust.schoolType || "Swasta",
      address: cust.address || "",
      city: cust.city || "",
      province: cust.province || "",
      picName: cust.picName,
      picRole: cust.picRole,
      picEmail: cust.picEmail,
      picPhone: cust.picPhone,
      plan: cust.plan,
      status: cust.status,
      billingCycle: cust.billingCycle || "MONTHLY",
      priceAmount: cust.priceAmount || 199000,
      maxStudents: cust.maxStudents || 1000,
      currentStudents: cust.currentStudents || 0,
      activeModules: cust.activeModules || [],
      subscriptionStart: cust.subscriptionStart ? cust.subscriptionStart.split("T")[0] : "",
      subscriptionEnd: cust.subscriptionEnd ? cust.subscriptionEnd.split("T")[0] : "",
      notes: cust.notes || "",
    });
    setSelectedCustomer(cust);
    setIsEditModalOpen(true);
  };

  const openDetailDrawer = (cust: SaaSCustomerItem) => {
    setSelectedCustomer(cust);
    setIsDetailDrawerOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.schoolName.trim()) {
      toast.showError("Nama resmi sekolah wajib diisi.", "Validasi Gagal");
      return;
    }
    if (!formData.picName.trim() || !formData.picPhone.trim() || !formData.picEmail.trim()) {
      toast.showError("Data penanggung jawab (Nama, HP, Email) wajib diisi lengkap.", "Validasi Gagal");
      return;
    }

    setIsSubmitting(true);
    try {
      const isEditing = Boolean(formData.id);
      const url = isEditing ? `/api/saas-customers/${formData.id}` : "/api/saas-customers";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || "Gagal menyimpan data pelanggan");
      }

      toast.showSuccess(
        isEditing
          ? `Data ${formData.schoolName} berhasil diperbarui.`
          : `Pelanggan baru ${formData.schoolName} berhasil ditambahkan!`,
        isEditing ? "Perubahan Disimpan" : "Pelanggan Terdaftar"
      );

      setIsCreateModalOpen(false);
      setIsEditModalOpen(false);
      fetchCustomers();
    } catch (err: any) {
      toast.showError(err.message || "Terjadi kendala saat menyimpan data.", "Gagal Simpan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/saas-customers/${customerToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal menghapus data pelanggan");
      }

      toast.showSuccess(`Data ${customerToDelete.schoolName} telah dihapus dari sistem.`, "Pelanggan Dihapus");
      setCustomerToDelete(null);
      if (selectedCustomer?.id === customerToDelete.id) {
        setIsDetailDrawerOpen(false);
      }
      fetchCustomers();
    } catch (err: any) {
      toast.showError(err.message || "Gagal menghapus pelanggan", "Kesalahan Sistem");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleModuleSelection = (modId: string) => {
    setFormData((prev) => ({
      ...prev,
      activeModules: prev.activeModules.includes(modId)
        ? prev.activeModules.filter((id) => id !== modId)
        : [...prev.activeModules, modId],
    }));
  };

  const exportToCSV = () => {
    if (customers.length === 0) {
      toast.showError("Tidak ada data untuk diekspor", "Ekspor Gagal");
      return;
    }

    const headers = [
      "Kode Pelanggan",
      "Nama Sekolah",
      "Jenjang",
      "NPSN",
      "Kota",
      "Provinsi",
      "Nama PIC",
      "Jabatan",
      "Email PIC",
      "WhatsApp PIC",
      "Paket",
      "Status",
      "Kapasitas Siswa",
      "Siswa Aktif",
      "Mulai Langganan",
      "Selesai Langganan",
    ];

    const rows = customers.map((c) => [
      c.customerCode,
      `"${c.schoolName.replace(/"/g, '""')}"`,
      c.schoolLevel,
      c.npsn || "-",
      c.city || "-",
      c.province || "-",
      `"${c.picName.replace(/"/g, '""')}"`,
      c.picRole,
      c.picEmail,
      `'${c.picPhone}`,
      c.plan,
      c.status,
      c.maxStudents,
      c.currentStudents,
      c.subscriptionStart ? c.subscriptionStart.split("T")[0] : "-",
      c.subscriptionEnd ? c.subscriptionEnd.split("T")[0] : "-",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Data_Pelanggan_QuickSchools_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.showSuccess("Data pelanggan berhasil diekspor ke file CSV.", "Ekspor Berhasil");
  };

  const formatRupiah = (val?: number) => {
    if (!val) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-purple-50 text-[#531FFF] border border-purple-200">
              <ShieldCheck className="w-3.5 h-3.5" /> {isSuperAdmin ? "Super Admin (Akses Penuh)" : "Super Admin Portal"}
            </span>
            <span className="text-xs font-bold text-gray-400">• Manajemen Tenant & Institusi</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Kelola Pelanggan SaaS Sekolah
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 max-w-xl">
            Pusat data sekolah pelanggan Quick Schools, kontrol status lisensi aktif, kuota siswa, paket modul, dan kontak resmi penanggung jawab.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchCustomers}
            disabled={loading}
            className="p-2.5 sm:px-3 sm:py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            title="Segarkan Data"
          >
            <RefreshCw className={cn("w-4 h-4 text-gray-500", loading && "animate-spin text-[#531FFF]")} />
            <span className="hidden sm:inline">Segarkan</span>
          </button>

          <button
            onClick={exportToCSV}
            className="p-2.5 sm:px-3.5 sm:py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
          >
            <Download className="w-4 h-4 text-gray-500" />
            <span className="hidden sm:inline">Ekspor CSV</span>
          </button>

          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#531FFF] to-[#4314cc] hover:from-[#4314cc] hover:to-[#380fa8] text-white text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all shadow-md shadow-[#531FFF]/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Pelanggan Baru</span>
          </button>
        </div>
      </div>

      {/* KPI METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-xs space-y-1">
          <span className="text-gray-400 text-xs font-bold block">Total Pelanggan</span>
          <p className="text-2xl sm:text-3xl font-black text-gray-900">{stats?.total || customers.length}</p>
          <span className="text-[11px] text-gray-400 font-medium">Institusi terdaftar</span>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-xs space-y-1">
          <span className="text-emerald-600 text-xs font-bold block">Sekolah Aktif</span>
          <p className="text-2xl sm:text-3xl font-black text-emerald-700">
            {stats?.active || customers.filter((c) => c.status === "AKTIF").length}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium">Berlangganan penuh</span>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-xs space-y-1">
          <span className="text-amber-600 text-xs font-bold block">Masa Uji Coba (Trial)</span>
          <p className="text-2xl sm:text-3xl font-black text-amber-700">
            {stats?.trial || customers.filter((c) => c.status === "TRIAL").length}
          </p>
          <span className="text-[11px] text-amber-600 font-medium">Uji coba 14-30 hari</span>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-xs space-y-1">
          <span className="text-purple-600 text-xs font-bold block">Total Siswa Terlayani</span>
          <p className="text-2xl sm:text-3xl font-black text-purple-700">
            {stats?.totalStudents?.toLocaleString() || customers.reduce((a, b) => a + (b.currentStudents || 0), 0).toLocaleString()}
          </p>
          <span className="text-[11px] text-purple-600 font-medium">Akun siswa aktif</span>
        </div>
      </div>

      {/* FILTERS & SEARCH BAR */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama sekolah, kode pelanggan, NPSN, PIC, atau kota..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#531FFF] focus:ring-1 focus:ring-[#531FFF]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
            >
              Hapus
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2.5 px-3 rounded-xl border border-gray-200 text-xs sm:text-sm font-bold text-gray-700 bg-white focus:outline-none focus:border-[#531FFF] cursor-pointer"
          >
            <option value="ALL">Semua Status</option>
            <option value="AKTIF">Aktif</option>
            <option value="TRIAL">Masa Trial</option>
            <option value="SUSPENDED">Ditangguhkan</option>
            <option value="NONAKTIF">Nonaktif</option>
          </select>

          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="py-2.5 px-3 rounded-xl border border-gray-200 text-xs sm:text-sm font-bold text-gray-700 bg-white focus:outline-none focus:border-[#531FFF] cursor-pointer"
          >
            <option value="ALL">Semua Paket</option>
            <option value="trial">Trial 14 Hari</option>
            <option value="standard">Sekolah Rintisan</option>
            <option value="pro">Sekolah Pro</option>
            <option value="enterprise">Enterprise Yayasan</option>
          </select>
        </div>
      </div>

      {/* CUSTOMERS DATA TABLE */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#F8F9FC] border-b border-gray-100 text-[11px] font-extrabold uppercase text-gray-400 tracking-wider">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">Sekolah & Kode</th>
                <th className="py-3.5 px-4">Penanggung Jawab (PIC)</th>
                <th className="py-3.5 px-4">Paket & Billing</th>
                <th className="py-3.5 px-4">Kapasitas Siswa</th>
                <th className="py-3.5 px-4">Masa Aktif</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Loader2 className="w-7 h-7 text-[#531FFF] animate-spin mx-auto mb-2" />
                    <p className="text-xs text-gray-500 font-bold">Memuat data pelanggan SaaS...</p>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-14">
                    <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-extrabold text-gray-700">Tidak ada data pelanggan yang cocok</p>
                    <p className="text-xs text-gray-400 mt-1">Coba ubah kata kunci pencarian atau filter status.</p>
                  </td>
                </tr>
              ) : (
                customers.map((cust) => {
                  const statusInfo = STATUS_CONFIG[cust.status] || STATUS_CONFIG.AKTIF;
                  const planInfo = PLAN_CONFIG[cust.plan] || PLAN_CONFIG.pro;
                  const StatusIcon = statusInfo.icon;
                  const studentPct = cust.maxStudents > 0 ? Math.round((cust.currentStudents / cust.maxStudents) * 100) : 0;

                  return (
                    <tr key={cust.id} className="hover:bg-purple-50/20 transition-colors group">
                      {/* Sekolah & Kode */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-bold text-gray-400">
                              {cust.customerCode}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-bold uppercase bg-gray-100 text-gray-600">
                              {cust.schoolLevel}
                            </span>
                          </div>
                          <p className="font-extrabold text-gray-900 leading-tight">
                            {cust.schoolName}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {cust.city || "Kota belum diatur"} • {cust.schoolType || "Swasta"}
                            {cust.npsn && ` • NPSN: ${cust.npsn}`}
                          </p>
                        </div>
                      </td>

                      {/* Penanggung Jawab */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-gray-800">{cust.picName}</p>
                          <p className="text-[11px] text-gray-400">{cust.picRole}</p>
                          <div className="flex items-center gap-2 pt-1">
                            <a
                              href={`https://wa.me/${cust.picPhone.replace(/[^0-9]/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100"
                            >
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span>{cust.picPhone}</span>
                            </a>
                          </div>
                        </div>
                      </td>

                      {/* Paket & Billing */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-black border", planInfo.color)}>
                            {planInfo.badge}
                          </span>
                          <p className="font-black text-gray-900 text-xs">
                            {formatRupiah(cust.priceAmount)}
                            <span className="text-[10px] text-gray-400 font-normal"> / {cust.billingCycle === "YEARLY" ? "tahun" : "bulan"}</span>
                          </p>
                        </div>
                      </td>

                      {/* Kapasitas Siswa */}
                      <td className="py-4 px-4">
                        <div className="space-y-1 w-32">
                          <div className="flex justify-between text-[11px] font-bold">
                            <span className="text-gray-900">{cust.currentStudents.toLocaleString()}</span>
                            <span className="text-gray-400">/ {cust.maxStudents.toLocaleString()}</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                studentPct > 90 ? "bg-rose-500" : studentPct > 70 ? "bg-amber-500" : "bg-[#531FFF]"
                              )}
                              style={{ width: `${Math.min(studentPct, 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-400 font-medium block">{studentPct}% kuota terpakai</span>
                        </div>
                      </td>

                      {/* Masa Aktif */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5 text-xs">
                          <span className="text-gray-400 text-[10px] block font-semibold">Berakhir:</span>
                          <span className="font-bold text-gray-800">
                            {cust.subscriptionEnd ? new Date(cust.subscriptionEnd).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "Tidak Terbatas"}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border",
                            statusInfo.bg,
                            statusInfo.text,
                            statusInfo.border
                          )}
                        >
                          <StatusIcon className="w-3.5 h-3.5" />
                          <span>{statusInfo.label}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openDetailDrawer(cust)}
                            className="p-2 rounded-xl text-gray-600 hover:text-[#531FFF] hover:bg-purple-50 transition-colors cursor-pointer"
                            title="Lihat Detail Pelanggan"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(cust)}
                            className="p-2 rounded-xl text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Edit Data Pelanggan"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setCustomerToDelete(cust)}
                            className="p-2 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Hapus Pelanggan"
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
      </div>

      {/* CREATE & EDIT CUSTOMER MODAL */}
      {(isCreateModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-[#531FFF] flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-900 tracking-tight">
                    {isEditModalOpen ? "Ubah Data Pelanggan SaaS" : "Tambah Sekolah Pelanggan Baru"}
                  </h2>
                  <p className="text-xs text-gray-400">
                    {isEditModalOpen ? `Kode: ${selectedCustomer?.customerCode}` : "Daftarkan institusi sekolah baru ke dalam sistem Quick Schools"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleFormSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Seksi 1: Data Identitas Sekolah */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-gray-100">
                  <School className="w-3.5 h-3.5 text-[#531FFF]" /> Identitas Sekolah
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-gray-700">Nama Resmi Sekolah *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: SMA Negeri 1 Kota Bekasi"
                      value={formData.schoolName}
                      onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#531FFF]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700">Jenjang Pendidikan</label>
                    <select
                      value={formData.schoolLevel}
                      onChange={(e) => setFormData({ ...formData, schoolLevel: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#531FFF] bg-white cursor-pointer"
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

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700">NPSN (Opsional)</label>
                    <input
                      type="text"
                      placeholder="8 digit nomor pokok sekolah"
                      value={formData.npsn}
                      onChange={(e) => setFormData({ ...formData, npsn: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#531FFF]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700">Kota / Kabupaten</label>
                    <input
                      type="text"
                      placeholder="Contoh: Kota Bandung"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#531FFF]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700">Provinsi</label>
                    <input
                      type="text"
                      placeholder="Contoh: Jawa Barat"
                      value={formData.province}
                      onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#531FFF]"
                    />
                  </div>
                </div>
              </div>

              {/* Seksi 2: Kontak Penanggung Jawab (PIC) */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-gray-100">
                  <Users className="w-3.5 h-3.5 text-[#531FFF]" /> Penanggung Jawab (PIC)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700">Nama PIC *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nama & gelar penanggung jawab"
                      value={formData.picName}
                      onChange={(e) => setFormData({ ...formData, picName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#531FFF]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700">Jabatan di Sekolah</label>
                    <select
                      value={formData.picRole}
                      onChange={(e) => setFormData({ ...formData, picRole: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#531FFF] bg-white cursor-pointer"
                    >
                      <option value="Kepala Sekolah">Kepala Sekolah</option>
                      <option value="Wakil Kepala Sekolah">Wakil Kepala Sekolah</option>
                      <option value="Ketua Yayasan">Ketua Yayasan</option>
                      <option value="Bendahara Sekolah">Bendahara Sekolah</option>
                      <option value="Koordinator IT">Koordinator IT</option>
                      <option value="Staf Tata Usaha">Staf Tata Usaha</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700">Nomor WhatsApp *</label>
                    <input
                      type="tel"
                      required
                      placeholder="Contoh: 081234567890"
                      value={formData.picPhone}
                      onChange={(e) => setFormData({ ...formData, picPhone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#531FFF]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700">Email PIC *</label>
                    <input
                      type="email"
                      required
                      placeholder="email@sekolah.sch.id"
                      value={formData.picEmail}
                      onChange={(e) => setFormData({ ...formData, picEmail: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#531FFF]"
                    />
                  </div>
                </div>
              </div>

              {/* Seksi 3: Lisensi & Paket SaaS */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-gray-100">
                  <CreditCard className="w-3.5 h-3.5 text-[#531FFF]" /> Lisensi & Langganan
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700">Paket Langganan</label>
                    <select
                      value={formData.plan}
                      onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#531FFF] bg-white cursor-pointer"
                    >
                      <option value="trial">Trial 14 Hari</option>
                      <option value="standard">Sekolah Rintisan (Standard)</option>
                      <option value="pro">Sekolah Unggulan (Pro)</option>
                      <option value="enterprise">Yayasan Multi-Kampus (Enterprise)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700">Status Langganan</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#531FFF] bg-white cursor-pointer"
                    >
                      <option value="AKTIF">Aktif</option>
                      <option value="TRIAL">Masa Trial</option>
                      <option value="SUSPENDED">Ditangguhkan</option>
                      <option value="NONAKTIF">Nonaktif</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700">Siklus Tagihan</label>
                    <select
                      value={formData.billingCycle}
                      onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#531FFF] bg-white cursor-pointer"
                    >
                      <option value="MONTHLY">Bulanan (Monthly)</option>
                      <option value="YEARLY">Tahunan (Yearly)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700">Biaya Langganan (Rp)</label>
                    <input
                      type="number"
                      value={formData.priceAmount}
                      onChange={(e) => setFormData({ ...formData, priceAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#531FFF]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700">Kapasitas Maks Siswa</label>
                    <input
                      type="number"
                      value={formData.maxStudents}
                      onChange={(e) => setFormData({ ...formData, maxStudents: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#531FFF]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700">Jumlah Siswa Saat Ini</label>
                    <input
                      type="number"
                      value={formData.currentStudents}
                      onChange={(e) => setFormData({ ...formData, currentStudents: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#531FFF]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700">Tanggal Mulai</label>
                    <input
                      type="date"
                      value={formData.subscriptionStart}
                      onChange={(e) => setFormData({ ...formData, subscriptionStart: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#531FFF]"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-gray-700">Tanggal Berakhir Lisensi</label>
                    <input
                      type="date"
                      value={formData.subscriptionEnd}
                      onChange={(e) => setFormData({ ...formData, subscriptionEnd: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#531FFF]"
                    />
                  </div>
                </div>

                {/* Modul Checkboxes */}
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold text-gray-700 block">Modul Fitur Aktif:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {AVAILABLE_MODULES.map((mod) => {
                      const isChecked = formData.activeModules.includes(mod.id);
                      return (
                        <div
                          key={mod.id}
                          onClick={() => toggleModuleSelection(mod.id)}
                          className={cn(
                            "p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all text-xs font-bold",
                            isChecked
                              ? "bg-purple-50/60 border-[#531FFF] text-[#531FFF]"
                              : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                          )}
                        >
                          <div
                            className={cn(
                              "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                              isChecked ? "bg-[#531FFF] border-[#531FFF]" : "border-gray-300 bg-white"
                            )}
                          >
                            {isChecked && <Check className="w-3 h-3 text-white stroke-[3]" />}
                          </div>
                          <span className="truncate">{mod.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Catatan Khusus */}
                <div className="space-y-1 pt-2">
                  <label className="text-xs font-bold text-gray-700">Catatan Internal / Memo</label>
                  <textarea
                    rows={2}
                    placeholder="Catatan khusus negosiasi, perpanjangan, atau nomor MoU..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#531FFF]"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="px-4 py-2.5 rounded-xl text-gray-700 hover:bg-gray-100 font-bold text-xs sm:text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#531FFF] to-[#4314cc] hover:from-[#4314cc] hover:to-[#380fa8] text-white font-extrabold text-xs sm:text-sm shadow-md shadow-[#531FFF]/20 flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{isEditModalOpen ? "Simpan Perubahan" : "Simpan Pelanggan Baru"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL DRAWER */}
      {isDetailDrawerOpen && selectedCustomer && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl p-6 sm:p-8 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200 space-y-6">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="space-y-0.5">
                  <span className="font-mono text-xs font-black text-[#531FFF]">
                    {selectedCustomer.customerCode}
                  </span>
                  <h2 className="text-lg font-black text-gray-900 tracking-tight">
                    {selectedCustomer.schoolName}
                  </h2>
                </div>
                <button
                  onClick={() => setIsDetailDrawerOpen(false)}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status & Plan Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-black border",
                    STATUS_CONFIG[selectedCustomer.status]?.bg,
                    STATUS_CONFIG[selectedCustomer.status]?.text,
                    STATUS_CONFIG[selectedCustomer.status]?.border
                  )}
                >
                  {STATUS_CONFIG[selectedCustomer.status]?.label}
                </span>

                <span
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-black border",
                    PLAN_CONFIG[selectedCustomer.plan]?.color || "bg-gray-100 text-gray-700"
                  )}
                >
                  Paket: {PLAN_CONFIG[selectedCustomer.plan]?.label || selectedCustomer.plan}
                </span>
              </div>

              {/* Detail Items */}
              <div className="space-y-3.5 bg-gray-50/80 p-4 rounded-2xl border border-gray-100 text-xs sm:text-sm">
                <div>
                  <span className="text-gray-400 block text-[11px] font-bold">NPSN & Jenjang:</span>
                  <span className="font-extrabold text-gray-800">
                    {selectedCustomer.npsn || "Tidak ada NPSN"} • {selectedCustomer.schoolLevel} ({selectedCustomer.schoolType})
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px] font-bold">Lokasi:</span>
                  <span className="font-bold text-gray-800">
                    {selectedCustomer.city || "-"}, {selectedCustomer.province || "-"}
                  </span>
                  {selectedCustomer.address && (
                    <p className="text-gray-500 text-xs mt-0.5">{selectedCustomer.address}</p>
                  )}
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px] font-bold">Kapasitas & Siswa:</span>
                  <span className="font-extrabold text-[#531FFF]">
                    {selectedCustomer.currentStudents.toLocaleString()} Siswa Aktif
                  </span>{" "}
                  <span className="text-gray-500">/ kuota {selectedCustomer.maxStudents.toLocaleString()} siswa</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px] font-bold">Biaya Langganan:</span>
                  <span className="font-extrabold text-gray-900">
                    {formatRupiah(selectedCustomer.priceAmount)} / {selectedCustomer.billingCycle === "YEARLY" ? "Tahun" : "Bulan"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px] font-bold">Periode Lisensi:</span>
                  <span className="font-bold text-gray-800">
                    {new Date(selectedCustomer.subscriptionStart).toLocaleDateString("id-ID")} s.d{" "}
                    {selectedCustomer.subscriptionEnd
                      ? new Date(selectedCustomer.subscriptionEnd).toLocaleDateString("id-ID")
                      : "Berjalan"}
                  </span>
                </div>
              </div>

              {/* PIC Card */}
              <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-100 space-y-2 text-xs sm:text-sm">
                <span className="text-[#531FFF] block text-[11px] font-black uppercase tracking-wider">
                  Penanggung Jawab Sekolah (PIC)
                </span>
                <p className="font-extrabold text-gray-900">{selectedCustomer.picName}</p>
                <p className="text-gray-500 text-xs">{selectedCustomer.picRole}</p>
                <p className="text-gray-600 text-xs">{selectedCustomer.picEmail}</p>

                <div className="pt-2">
                  <a
                    href={`https://wa.me/${selectedCustomer.picPhone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Hubungi via WhatsApp ({selectedCustomer.picPhone})</span>
                  </a>
                </div>
              </div>

              {/* Modul Fitur Aktif */}
              <div className="space-y-2">
                <span className="text-gray-400 block text-[11px] font-black uppercase tracking-wider">
                  Modul Fitur yang Digunakan:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCustomer.activeModules?.map((modId) => (
                    <span
                      key={modId}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200"
                    >
                      {AVAILABLE_MODULES.find((m) => m.id === modId)?.name || modId}
                    </span>
                  ))}
                </div>
              </div>

              {/* Catatan / Notes */}
              {selectedCustomer.notes && (
                <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs text-amber-900 space-y-1">
                  <span className="font-bold block">Catatan / Memo Internal:</span>
                  <p>{selectedCustomer.notes}</p>
                </div>
              )}
            </div>

            {/* Drawer Actions */}
            <div className="pt-4 border-t border-gray-100 flex items-center gap-2.5">
              <button
                onClick={() => {
                  setIsDetailDrawerOpen(false);
                  openEditModal(selectedCustomer);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#531FFF] hover:bg-[#4314cc] text-white font-bold text-xs sm:text-sm text-center transition-all shadow-md shadow-[#531FFF]/20 cursor-pointer"
              >
                Ubah Data Pelanggan
              </button>
              <button
                onClick={() => {
                  setCustomerToDelete(selectedCustomer);
                }}
                className="p-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-all cursor-pointer"
                title="Hapus Pelanggan"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {customerToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-gray-100 p-6 space-y-4 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
              <Trash2 className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-gray-900 tracking-tight">
                Hapus Pelanggan SaaS?
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Anda akan menghapus data sekolah <strong>{customerToDelete.schoolName}</strong> ({customerToDelete.customerCode}). Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                onClick={() => setCustomerToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteCustomer}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
