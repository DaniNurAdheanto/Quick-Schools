"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Inbox,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Phone,
  Mail,
  Trash2,
  MessageSquare,
  FileText,
  Send,
  Download,
  RefreshCw,
  X,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";

export type RequestStatus = "PENDING" | "CONTACTED" | "OFFER_SENT" | "APPROVED" | "REJECTED";

export interface SubscriptionRequestItem {
  id: string;
  requestNumber: string;
  schoolName: string;
  npsn?: string | null;
  schoolLevel: string;
  schoolType?: string | null;
  province?: string | null;
  city?: string | null;
  address?: string | null;
  subdomain?: string | null;
  picName: string;
  picRole: string;
  picEmail: string;
  picPhone: string;
  studentCount?: number | null;
  studentEstimate?: string | null;
  planInterest: string;
  selectedModules: string[];
  notes?: string | null;
  preferredTime?: string | null;
  status: RequestStatus;
  followUpNotes?: string | null;
  assignedTo?: string | null;
  quotedPrice?: number | null;
  contactedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<
  RequestStatus,
  { label: string; bg: string; text: string; border: string; icon: any }
> = {
  PENDING: {
    label: "Menunggu Dihubungi",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    icon: Clock,
  },
  CONTACTED: {
    label: "Dalam Diskusi / Follow-Up",
    bg: "bg-blue-50",
    text: "text-blue-800",
    border: "border-blue-200",
    icon: MessageSquare,
  },
  OFFER_SENT: {
    label: "Penawaran Terkirim",
    bg: "bg-purple-50",
    text: "text-purple-800",
    border: "border-purple-200",
    icon: Send,
  },
  APPROVED: {
    label: "Berlangganan Aktif",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "Dibatalkan / Ditolak",
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-200",
    icon: XCircle,
  },
};

const MODULE_LABELS: Record<string, string> = {
  mod_presensi: "Presensi Face ID & GPS",
  mod_akademik: "Akademik & Kalender",
  mod_rapor: "E-Rapor Merdeka",
  mod_keuangan: "SPP & Kas Keuangan",
  mod_pengumuman: "Broadcast WA Ortu",
  mod_ujian: "Ujian Digital (CBT)",
};

const PLAN_LABELS: Record<string, string> = {
  trial: "Uji Coba 14 Hari (Trial)",
  standard: "Sekolah Rintisan (Standard)",
  pro: "Sekolah Unggulan (Pro)",
  enterprise: "Yayasan / Enterprise",
};

export default function SubscriptionRequestsPage() {
  const toast = useToast();
  const { user } = useAuth();

  const [requests, setRequests] = useState<SubscriptionRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedPlan, setSelectedPlan] = useState<string>("ALL");

  // Selected item for drawer/modal detail & follow-up
  const [activeRequest, setActiveRequest] = useState<SubscriptionRequestItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Follow-up form state
  const [editStatus, setEditStatus] = useState<RequestStatus>("PENDING");
  const [editNotes, setEditNotes] = useState("");
  const [editAssignedTo, setEditAssignedTo] = useState("");
  const [editQuotedPrice, setEditQuotedPrice] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete modal state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch Requests
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/subscription-requests");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setRequests(data.data);
      } else {
        setRequests([]);
      }
    } catch (err) {
      console.error("Fetch subscription requests error:", err);
      toast.showError("Gagal memuat data permintaan berlangganan.", "Gagal Memuat");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Open Drawer and populate form
  const handleOpenDetail = (req: SubscriptionRequestItem) => {
    setActiveRequest(req);
    setEditStatus(req.status);
    setEditNotes(req.followUpNotes || "");
    setEditAssignedTo(req.assignedTo || user?.displayName || user?.email || "Tim Solusi Quick Schools");
    setEditQuotedPrice(req.quotedPrice ? String(req.quotedPrice) : "");
    setIsDrawerOpen(true);
  };

  // Submit Follow-up updates
  const handleSaveFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRequest) return;

    setIsUpdating(true);
    try {
      const payload = {
        status: editStatus,
        followUpNotes: editNotes.trim(),
        assignedTo: editAssignedTo.trim(),
        quotedPrice: editQuotedPrice ? parseFloat(editQuotedPrice) : null,
        contactedAt: editStatus !== "PENDING" ? new Date().toISOString() : null,
      };

      const res = await fetch(`/api/subscription-requests/${activeRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal memperbarui status tindak lanjut.");
      }

      toast.showSuccess(
        `Tindak lanjut untuk ${activeRequest.schoolName} berhasil disimpan.`,
        "Perubahan Disimpan"
      );

      // Update local state
      const updatedList = requests.map((item) =>
        item.id === activeRequest.id
          ? {
              ...item,
              ...payload,
              updatedAt: new Date().toISOString(),
            }
          : item
      );
      setRequests(updatedList);
      setActiveRequest((prev) => (prev ? { ...prev, ...payload } : null));
    } catch (err: any) {
      toast.showError(err.message || "Gagal menyimpan tindak lanjut.", "Gagal");
    } finally {
      setIsUpdating(false);
    }
  };

  // Convert approved request to official SaaS Customer
  const handleConvertToCustomer = async () => {
    if (!activeRequest) return;
    setIsUpdating(true);
    try {
      const payload = {
        schoolName: activeRequest.schoolName,
        npsn: activeRequest.npsn || null,
        schoolLevel: activeRequest.schoolLevel,
        schoolType: activeRequest.schoolType || "Swasta",
        city: activeRequest.city || null,
        province: activeRequest.province || null,
        address: activeRequest.address || null,
        picName: activeRequest.picName,
        picRole: activeRequest.picRole,
        picEmail: activeRequest.picEmail,
        picPhone: activeRequest.picPhone,
        plan: activeRequest.planInterest || "pro",
        status: "AKTIF",
        priceAmount: editQuotedPrice ? parseFloat(editQuotedPrice) : 199000,
        maxStudents: activeRequest.studentCount || 1000,
        currentStudents: activeRequest.studentCount || 0,
        activeModules: activeRequest.selectedModules || [],
        subscriptionRequestId: activeRequest.id,
        notes: `Dikonversi dari tiket ${activeRequest.requestNumber}. Catatan tindak lanjut: ${editNotes || "-"}`,
      };

      const res = await fetch("/api/saas-customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal membuat data pelanggan baru");
      }

      toast.showSuccess(
        `Sekolah ${activeRequest.schoolName} resmi disetujui & terdaftar sebagai Pelanggan Aktif (${data.customer?.customerCode})!`,
        "Pelanggan Baru Terdaftar"
      );

      // Refresh list
      fetchRequests();
      setIsDrawerOpen(false);
    } catch (err: any) {
      toast.showError(err.message || "Gagal mengonversi ke pelanggan", "Kesalahan");
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete Request
  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/subscription-requests/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal menghapus data permintaan.");
      }

      toast.showSuccess("Data permintaan berlangganan berhasil dihapus.", "Terhapus");
      setRequests((prev) => prev.filter((r) => r.id !== id));
      if (activeRequest?.id === id) {
        setIsDrawerOpen(false);
        setActiveRequest(null);
      }
      setDeleteConfirmId(null);
    } catch (err: any) {
      toast.showError(err.message || "Gagal menghapus data.", "Gagal");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          r.schoolName?.toLowerCase().includes(q) ||
          r.picName?.toLowerCase().includes(q) ||
          r.picEmail?.toLowerCase().includes(q) ||
          r.picPhone?.toLowerCase().includes(q) ||
          r.requestNumber?.toLowerCase().includes(q) ||
          r.city?.toLowerCase().includes(q);
        if (!match) return false;
      }

      // 2. Status Filter
      if (selectedStatus !== "ALL" && r.status !== selectedStatus) {
        return false;
      }

      // 3. Plan Filter
      if (selectedPlan !== "ALL" && r.planInterest !== selectedPlan) {
        return false;
      }

      return true;
    });
  }, [requests, searchQuery, selectedStatus, selectedPlan]);

  // Status Summary Counts
  const counts = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((r) => r.status === "PENDING").length;
    const contacted = requests.filter((r) => r.status === "CONTACTED").length;
    const offerSent = requests.filter((r) => r.status === "OFFER_SENT").length;
    const approved = requests.filter((r) => r.status === "APPROVED").length;
    const rejected = requests.filter((r) => r.status === "REJECTED").length;
    return { total, pending, contacted, offerSent, approved, rejected };
  }, [requests]);

  // Export to CSV
  const handleExportCSV = () => {
    if (requests.length === 0) {
      toast.showError("Tidak ada data permintaan untuk diekspor.", "Data Kosong");
      return;
    }

    const headers = [
      "No. Tiket",
      "Tanggal Masuk",
      "Nama Sekolah",
      "NPSN",
      "Jenjang",
      "Status Sekolah",
      "Kota / Provinsi",
      "Nama PIC",
      "Jabatan",
      "Email PIC",
      "WhatsApp PIC",
      "Paket Diminati",
      "Estimasi Siswa",
      "Modul Diminati",
      "Status Permintaan",
      "Catatan Tindak Lanjut",
      "Penanggung Jawab Tim",
      "Penawaran Harga (Rp)",
    ];

    const rows = requests.map((r) => [
      `"${r.requestNumber}"`,
      `"${new Date(r.createdAt).toLocaleDateString("id-ID")}"`,
      `"${r.schoolName.replace(/"/g, '""')}"`,
      `"${r.npsn || "-"}"`,
      `"${r.schoolLevel}"`,
      `"${r.schoolType || "Swasta"}"`,
      `"${(r.city || "") + ", " + (r.province || "")}"`,
      `"${r.picName.replace(/"/g, '""')}"`,
      `"${r.picRole}"`,
      `"${r.picEmail}"`,
      `"${r.picPhone}"`,
      `"${PLAN_LABELS[r.planInterest] || r.planInterest}"`,
      `"${r.studentCount ? r.studentCount + " Siswa" : r.studentEstimate || "-"}"`,
      `"${r.selectedModules.map((m) => MODULE_LABELS[m] || m).join("; ")}"`,
      `"${STATUS_CONFIG[r.status]?.label || r.status}"`,
      `"${(r.followUpNotes || "").replace(/"/g, '""')}"`,
      `"${r.assignedTo || "-"}"`,
      `"${r.quotedPrice || "-"}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `permintaan_berlangganan_quickschools_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.showSuccess("Data permintaan berhasil diekspor ke format CSV.", "Ekspor Selesai");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#531FFF]/10 text-[#531FFF]">
              <Inbox className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Permintaan Berlangganan (SaaS Requests)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Kelola dan tindak lanjuti permintaan berlangganan, konsultasi kebutuhan sekolah, dan penawaran harga dari calon institusi.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchRequests}
            disabled={loading}
            className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs flex items-center gap-2 shadow-2xs transition-all cursor-pointer"
            title="Segarkan Data"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin text-[#531FFF]")} />
            <span className="hidden sm:inline">Segarkan</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs flex items-center gap-2 shadow-2xs transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-gray-500" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div
          onClick={() => setSelectedStatus("ALL")}
          className={cn(
            "p-4 rounded-2xl border transition-all cursor-pointer",
            selectedStatus === "ALL"
              ? "bg-[#531FFF]/5 border-[#531FFF] shadow-md shadow-[#531FFF]/10"
              : "bg-white border-gray-100 hover:border-gray-200"
          )}
        >
          <span className="text-[11px] font-bold text-gray-500 block truncate">Total Permintaan</span>
          <span className="text-2xl font-black text-gray-900 mt-1 block">{counts.total}</span>
          <span className="text-[10px] text-gray-400 font-semibold block mt-0.5">Semua status</span>
        </div>

        <div
          onClick={() => setSelectedStatus("PENDING")}
          className={cn(
            "p-4 rounded-2xl border transition-all cursor-pointer",
            selectedStatus === "PENDING"
              ? "bg-amber-50 border-amber-300 shadow-md shadow-amber-500/10"
              : "bg-white border-gray-100 hover:border-gray-200"
          )}
        >
          <span className="text-[11px] font-bold text-amber-800 block truncate">Perlu Dihubungi</span>
          <span className="text-2xl font-black text-amber-700 mt-1 block">{counts.pending}</span>
          <span className="text-[10px] text-amber-600 font-semibold block mt-0.5">Prioritas respon</span>
        </div>

        <div
          onClick={() => setSelectedStatus("CONTACTED")}
          className={cn(
            "p-4 rounded-2xl border transition-all cursor-pointer",
            selectedStatus === "CONTACTED"
              ? "bg-blue-50 border-blue-300 shadow-md shadow-blue-500/10"
              : "bg-white border-gray-100 hover:border-gray-200"
          )}
        >
          <span className="text-[11px] font-bold text-blue-800 block truncate">Dalam Diskusi</span>
          <span className="text-2xl font-black text-blue-700 mt-1 block">{counts.contacted}</span>
          <span className="text-[10px] text-blue-600 font-semibold block mt-0.5">Konsultasi / Demo</span>
        </div>

        <div
          onClick={() => setSelectedStatus("OFFER_SENT")}
          className={cn(
            "p-4 rounded-2xl border transition-all cursor-pointer",
            selectedStatus === "OFFER_SENT"
              ? "bg-purple-50 border-purple-300 shadow-md shadow-purple-500/10"
              : "bg-white border-gray-100 hover:border-gray-200"
          )}
        >
          <span className="text-[11px] font-bold text-purple-800 block truncate">Penawaran Dikirim</span>
          <span className="text-2xl font-black text-purple-700 mt-1 block">{counts.offerSent}</span>
          <span className="text-[10px] text-purple-600 font-semibold block mt-0.5">Menunggu respon</span>
        </div>

        <div
          onClick={() => setSelectedStatus("APPROVED")}
          className={cn(
            "p-4 rounded-2xl border transition-all cursor-pointer",
            selectedStatus === "APPROVED"
              ? "bg-emerald-50 border-emerald-300 shadow-md shadow-emerald-500/10"
              : "bg-white border-gray-100 hover:border-gray-200"
          )}
        >
          <span className="text-[11px] font-bold text-emerald-800 block truncate">Berlangganan Aktif</span>
          <span className="text-2xl font-black text-emerald-700 mt-1 block">{counts.approved}</span>
          <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">Closing sukses</span>
        </div>

        <div
          onClick={() => setSelectedStatus("REJECTED")}
          className={cn(
            "p-4 rounded-2xl border transition-all cursor-pointer",
            selectedStatus === "REJECTED"
              ? "bg-gray-100 border-gray-300"
              : "bg-white border-gray-100 hover:border-gray-200"
          )}
        >
          <span className="text-[11px] font-bold text-gray-700 block truncate">Dibatalkan</span>
          <span className="text-2xl font-black text-gray-700 mt-1 block">{counts.rejected}</span>
          <span className="text-[10px] text-gray-500 font-semibold block mt-0.5">Tidak lanjut</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama sekolah, PIC, WhatsApp, no. tiket..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 font-semibold text-xs focus:outline-none focus:border-[#531FFF]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Select */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400 font-bold text-[11px]">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 font-bold bg-white text-gray-700 focus:outline-none focus:border-[#531FFF] cursor-pointer"
            >
              <option value="ALL">Semua Status ({requests.length})</option>
              <option value="PENDING">Menunggu Dihubungi ({counts.pending})</option>
              <option value="CONTACTED">Dalam Diskusi ({counts.contacted})</option>
              <option value="OFFER_SENT">Penawaran Terkirim ({counts.offerSent})</option>
              <option value="APPROVED">Berlangganan Aktif ({counts.approved})</option>
              <option value="REJECTED">Dibatalkan ({counts.rejected})</option>
            </select>
          </div>

          {/* Plan Select */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400 font-bold text-[11px]">Paket:</span>
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 font-bold bg-white text-gray-700 focus:outline-none focus:border-[#531FFF] cursor-pointer"
            >
              <option value="ALL">Semua Paket</option>
              <option value="trial">Uji Coba 14 Hari</option>
              <option value="standard">Sekolah Rintisan (Standard)</option>
              <option value="pro">Sekolah Unggulan (Pro)</option>
              <option value="enterprise">Yayasan / Enterprise</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-center">
            <RefreshCw className="w-8 h-8 text-[#531FFF] animate-spin" />
            <p className="text-xs font-bold text-gray-500">Memuat data permintaan berlangganan...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-3">
            <div className="w-14 h-14 bg-purple-50 text-[#531FFF] rounded-2xl mx-auto flex items-center justify-center">
              <Inbox className="w-7 h-7" />
            </div>
            <h3 className="text-base font-extrabold text-gray-900">Belum Ada Permintaan yang Cocok</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              {searchQuery || selectedStatus !== "ALL" || selectedPlan !== "ALL"
                ? "Tidak ada data permintaan berlangganan yang sesuai dengan filter pencarian Anda."
                : "Belum ada sekolah yang mengirimkan formulir permintaan berlangganan."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">No. Tiket & Tanggal</th>
                  <th className="py-3.5 px-4">Institusi Sekolah</th>
                  <th className="py-3.5 px-4">Penanggung Jawab (PIC)</th>
                  <th className="py-3.5 px-4">Paket & Skala</th>
                  <th className="py-3.5 px-4">Status & Progres</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filteredRequests.map((req) => {
                  const statusConf = STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDING;
                  const StatusIcon = statusConf.icon;

                  const cleanPhone = req.picPhone.replace(/[^0-9]/g, "");
                  const formattedWa = cleanPhone.startsWith("0") ? "62" + cleanPhone.slice(1) : cleanPhone;
                  const waUrl = `https://wa.me/${formattedWa}?text=${encodeURIComponent(
                    `Halo ${req.picName} (${req.picRole} ${req.schoolName}), perkenalkan saya dari Tim Konsultan Quick Schools terkait permohonan berlangganan dengan No. Tiket ${req.requestNumber}. Apakah ada waktu luang untuk berdiskusi?`
                  )}`;

                  return (
                    <tr key={req.id} className="hover:bg-gray-50/80 transition-colors group">
                      {/* Tiket & Tanggal */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-extrabold text-[#531FFF] text-xs block">
                          {req.requestNumber}
                        </span>
                        <span className="text-[11px] text-gray-400 block mt-0.5">
                          {new Date(req.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </td>

                      {/* Data Sekolah */}
                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-gray-900 block">{req.schoolName}</span>
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5">
                          <span className="font-bold text-gray-700">{req.schoolLevel}</span>
                          <span>•</span>
                          <span>{req.city || req.province || req.schoolType || "Swasta"}</span>
                          {req.npsn && (
                            <>
                              <span>•</span>
                              <span className="font-mono">NPSN: {req.npsn}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* PIC & Kontak Cepat */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-gray-900 block">{req.picName}</span>
                        <span className="text-[11px] text-gray-500 block">{req.picRole}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold border border-emerald-200 transition-colors"
                            title="Chat WhatsApp Langsung"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{req.picPhone}</span>
                          </a>

                          <a
                            href={`mailto:${req.picEmail}`}
                            className="text-gray-400 hover:text-gray-700 text-[11px]"
                            title={`Kirim email ke ${req.picEmail}`}
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>

                      {/* Paket & Skala Siswa */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-[#531FFF] block">
                          {PLAN_LABELS[req.planInterest] || req.planInterest}
                        </span>
                        <span className="text-[11px] text-gray-500 block mt-0.5">
                          {req.studentCount ? `${req.studentCount} Siswa` : req.studentEstimate || "-"}
                        </span>
                        <span className="text-[10px] text-gray-400 block">
                          {req.selectedModules.length} modul diminati
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border",
                            statusConf.bg,
                            statusConf.text,
                            statusConf.border
                          )}
                        >
                          <StatusIcon className="w-3 h-3" />
                          <span>{statusConf.label}</span>
                        </span>
                        {req.followUpNotes && (
                          <p className="text-[10px] text-gray-500 italic mt-1 line-clamp-1 max-w-[200px]" title={req.followUpNotes}>
                            Catatan: {req.followUpNotes}
                          </p>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDetail(req)}
                            className="px-3 py-1.5 rounded-lg bg-[#531FFF]/10 hover:bg-[#531FFF] text-[#531FFF] hover:text-white font-bold text-xs transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <span>Tindak Lanjut</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setDeleteConfirmId(req.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Hapus Permintaan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/* DETAIL & FOLLOW-UP DRAWER MODAL */}
      {/* ============================================================= */}
      {isDrawerOpen && activeRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 p-6 sm:p-8 space-y-6">
            {/* Drawer Header */}
            <div className="flex items-start justify-between pb-4 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-[#531FFF] text-sm bg-purple-50 px-2.5 py-0.5 rounded border border-purple-100">
                    {activeRequest.requestNumber}
                  </span>
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border",
                      STATUS_CONFIG[activeRequest.status]?.bg,
                      STATUS_CONFIG[activeRequest.status]?.text,
                      STATUS_CONFIG[activeRequest.status]?.border
                    )}
                  >
                    {STATUS_CONFIG[activeRequest.status]?.label}
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-gray-900 mt-1">
                  {activeRequest.schoolName}
                </h2>
                <p className="text-xs text-gray-500">
                  Diterima pada {new Date(activeRequest.createdAt).toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })} WIB
                </p>
              </div>

              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* School & PIC Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-gray-50/80 p-4 rounded-2xl border border-gray-200/70">
              <div>
                <span className="text-gray-400 font-bold block text-[11px]">NPSN & Jenjang:</span>
                <span className="font-bold text-gray-800">
                  {activeRequest.npsn ? `NPSN: ${activeRequest.npsn}` : "Tanpa NPSN"} • {activeRequest.schoolLevel} ({activeRequest.schoolType || "Swasta"})
                </span>
              </div>

              <div>
                <span className="text-gray-400 font-bold block text-[11px]">Lokasi Sekolah:</span>
                <span className="font-bold text-gray-800">
                  {activeRequest.city || "-"}, {activeRequest.province || "-"}
                </span>
              </div>

              <div>
                <span className="text-gray-400 font-bold block text-[11px]">Penanggung Jawab (PIC):</span>
                <span className="font-extrabold text-gray-900 block">{activeRequest.picName}</span>
                <span className="text-gray-500">{activeRequest.picRole}</span>
              </div>

              <div>
                <span className="text-gray-400 font-bold block text-[11px]">Kontak WhatsApp & Email:</span>
                <span className="font-bold text-emerald-700 block">{activeRequest.picPhone}</span>
                <span className="text-gray-600 truncate block">{activeRequest.picEmail}</span>
              </div>

              {activeRequest.address && (
                <div className="sm:col-span-2 pt-1 border-t border-gray-200/50">
                  <span className="text-gray-400 font-bold block text-[11px]">Alamat Lengkap:</span>
                  <span className="text-gray-700">{activeRequest.address}</span>
                </div>
              )}

              {activeRequest.preferredTime && (
                <div className="sm:col-span-2">
                  <span className="text-gray-400 font-bold block text-[11px]">Waktu Konsultasi yang Diinginkan:</span>
                  <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                    {activeRequest.preferredTime}
                  </span>
                </div>
              )}

              {activeRequest.notes && (
                <div className="sm:col-span-2 pt-1 border-t border-gray-200/50">
                  <span className="text-gray-400 font-bold block text-[11px]">Catatan / Kebutuhan Khusus dari Sekolah:</span>
                  <p className="text-gray-800 italic mt-0.5">{activeRequest.notes}</p>
                </div>
              )}
            </div>

            {/* Modules Requested */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-700">Paket & Modul Layanan yang Diminati:</span>
                <span className="font-extrabold text-[#531FFF]">
                  {PLAN_LABELS[activeRequest.planInterest] || activeRequest.planInterest}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activeRequest.selectedModules.map((modId) => (
                  <span
                    key={modId}
                    className="px-2.5 py-1 rounded-lg bg-purple-50 text-[#531FFF] text-xs font-bold border border-purple-100"
                  >
                    ✓ {MODULE_LABELS[modId] || modId}
                  </span>
                ))}
              </div>
            </div>

            {/* Quick Action Contact Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {(() => {
                const cleanPhone = activeRequest.picPhone.replace(/[^0-9]/g, "");
                const formattedWa = cleanPhone.startsWith("0") ? "62" + cleanPhone.slice(1) : cleanPhone;
                const waUrl = `https://wa.me/${formattedWa}?text=${encodeURIComponent(
                  `Halo Bapak/Ibu ${activeRequest.picName} (${activeRequest.picRole} di ${activeRequest.schoolName}), saya dari Tim Konsultan Quick Schools menindaklanjuti formulir Permintaan Berlangganan No. Tiket ${activeRequest.requestNumber}. Kapan waktu yang tepat bagi kami untuk berdiskusi/presentasi singkat? Terima kasih!`
                )}`;
                return (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Hubungi PIC via WhatsApp</span>
                  </a>
                );
              })()}

              <a
                href={`mailto:${activeRequest.picEmail}?subject=${encodeURIComponent(
                  `Penawaran & Konsultasi Quick Schools - ${activeRequest.schoolName}`
                )}`}
                className="py-2.5 px-4 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all"
              >
                <Mail className="w-3.5 h-3.5 text-gray-500" />
                <span>Kirim Email Penawaran</span>
              </a>
            </div>

            {/* Follow-Up Management Form */}
            <form onSubmit={handleSaveFollowUp} className="pt-4 border-t border-gray-100 space-y-4 text-xs">
              <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#531FFF]" />
                Form Tindak Lanjut Tim Penjualan & Konsultan
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Status Tindak Lanjut *</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as RequestStatus)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-bold text-gray-800 focus:outline-none focus:border-[#531FFF] cursor-pointer"
                  >
                    <option value="PENDING">Menunggu Dihubungi</option>
                    <option value="CONTACTED">Dalam Diskusi / Sudah Dihubungi</option>
                    <option value="OFFER_SENT">Penawaran Harga Resmi Dikirim</option>
                    <option value="APPROVED">Berlangganan Aktif (Disetujui)</option>
                    <option value="REJECTED">Dibatalkan / Tidak Jadi</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Penanggung Jawab Tim (PIC Sales)</label>
                  <input
                    type="text"
                    placeholder="Nama staf / tim yang memfollow up"
                    value={editAssignedTo}
                    onChange={(e) => setEditAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-semibold focus:outline-none focus:border-[#531FFF]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-gray-700 mb-1">Nominal Penawaran yang Disepakati (Rp)</label>
                  <input
                    type="number"
                    placeholder="Contoh: 1800000 (biaya per tahun atau paket)"
                    value={editQuotedPrice}
                    onChange={(e) => setEditQuotedPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-mono font-bold text-[#531FFF] focus:outline-none focus:border-[#531FFF]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-gray-700 mb-1">Catatan Tindak Lanjut (Internal Notes)</label>
                  <textarea
                    rows={3}
                    placeholder="Tuliskan hasil diskusi, jadwal presentasi demo, kesepakatan harga, atau alasan pembatalan..."
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 font-semibold focus:outline-none focus:border-[#531FFF]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <div>
                  {editStatus === "APPROVED" && (
                    <button
                      type="button"
                      onClick={handleConvertToCustomer}
                      disabled={isUpdating}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                      title="Otomatis membuat entri di data Pelanggan SaaS Sekolah"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Setujui & Buat Akun Pelanggan</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold cursor-pointer"
                  >
                    Tutup
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-5 py-2 rounded-xl bg-[#531FFF] hover:bg-[#4314cc] text-white font-extrabold shadow-md shadow-[#531FFF]/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isUpdating ? "Menyimpan..." : "Simpan Tindak Lanjut"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-xl border border-gray-100 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-gray-900">Hapus Permintaan?</h3>
              <p className="text-xs text-gray-500 mt-1">
                Data permintaan berlangganan ini akan dihapus secara permanen dari basis data.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 cursor-pointer disabled:opacity-60"
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus Data"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
