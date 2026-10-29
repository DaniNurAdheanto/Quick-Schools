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
  ChevronLeft,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  Loader2
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
  const { user, isSaaSAdmin, isSuperAdmin } = useAuth();

  const [requests, setRequests] = useState<SubscriptionRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedPlan, setSelectedPlan] = useState<string>("ALL");

  // Sorting & Pagination
  const [sortBy, setSortBy] = useState<string>("createdAt_desc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

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

  // Handlers for search & filters (automatically reset page to 1)
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    setCurrentPage(1);
  };

  const handlePlanChange = (plan: string) => {
    setSelectedPlan(plan);
    setCurrentPage(1);
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedStatus("ALL");
    setSelectedPlan("ALL");
    setSortBy("createdAt_desc");
    setCurrentPage(1);
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

  // Sorted requests
  const sortedRequests = useMemo(() => {
    const list = [...filteredRequests];
    if (sortBy === "createdAt_desc") {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === "createdAt_asc") {
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sortBy === "schoolName_asc") {
      list.sort((a, b) => (a.schoolName || "").localeCompare(b.schoolName || ""));
    } else if (sortBy === "schoolName_desc") {
      list.sort((a, b) => (b.schoolName || "").localeCompare(a.schoolName || ""));
    } else if (sortBy === "studentCount_desc") {
      list.sort((a, b) => (b.studentCount || 0) - (a.studentCount || 0));
    }
    return list;
  }, [filteredRequests, sortBy]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(sortedRequests.length / (pageSize === -1 ? sortedRequests.length || 1 : pageSize)));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedRequests = useMemo(() => {
    if (pageSize === -1) return sortedRequests;
    const start = (currentPage - 1) * pageSize;
    return sortedRequests.slice(start, start + pageSize);
  }, [sortedRequests, currentPage, pageSize]);

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

    const rows = sortedRequests.map((r) => [
      `"${r.requestNumber}"`,
      `"${new Date(r.createdAt).toLocaleDateString("id-ID")}"`,
      `"${(r.schoolName || "").replace(/"/g, '""')}"`,
      `"${r.npsn || "-"}"`,
      `"${r.schoolLevel}"`,
      `"${r.schoolType || "Swasta"}"`,
      `"${(r.city || "") + ", " + (r.province || "")}"`,
      `"${(r.picName || "").replace(/"/g, '""')}"`,
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
    <div className="p-4 sm:p-6 md:p-8 pb-20 max-w-[1600px] mx-auto w-full space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-purple-50 text-[#531FFF] border border-purple-200">
              <ShieldCheck className="w-3.5 h-3.5" /> {isSaaSAdmin ? "SaaS Administrator" : isSuperAdmin ? "Super Admin" : "Operasional SaaS"}
            </span>
            <span className="text-xs font-bold text-gray-400">• Pipeline Permintaan Berlangganan</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Permintaan Berlangganan SaaS
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 max-w-xl">
            Tindak lanjuti pengajuan formulir calon pelanggan sekolah, jadwal konsultasi, penawaran harga, dan konversi ke pelanggan aktif.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchRequests}
            disabled={loading}
            className="p-2.5 sm:px-3 sm:py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            title="Segarkan Data"
          >
            <RefreshCw className={cn("w-4 h-4 text-gray-500", loading && "animate-spin text-[#531FFF]")} />
            <span className="hidden sm:inline">Segarkan</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="p-2.5 sm:px-3.5 sm:py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
          >
            <Download className="w-4 h-4 text-gray-500" />
            <span className="hidden sm:inline">Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS (Interactive status triggers) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
        {/* Total */}
        <div
          onClick={() => handleStatusChange("ALL")}
          className={cn(
            "bg-white rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer shadow-2xs space-y-2 group",
            selectedStatus === "ALL"
              ? "border-[#531FFF] ring-2 ring-[#531FFF]/20 bg-[#531FFF]/5"
              : "border-gray-100 hover:border-gray-200 hover:shadow-xs"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Masuk</span>
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
              selectedStatus === "ALL" ? "bg-[#531FFF] text-white" : "bg-purple-50 text-[#531FFF]"
            )}>
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-gray-900">{counts.total}</p>
          <span className="text-[11px] text-gray-400 font-semibold block">Semua pengajuan</span>
        </div>

        {/* Pending */}
        <div
          onClick={() => handleStatusChange("PENDING")}
          className={cn(
            "bg-white rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer shadow-2xs space-y-2 group",
            selectedStatus === "PENDING"
              ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/40"
              : "border-gray-100 hover:border-gray-200 hover:shadow-xs"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-amber-700 text-xs font-bold uppercase tracking-wider">Perlu Dihubungi</span>
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
              selectedStatus === "PENDING" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-600"
            )}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-700">{counts.pending}</p>
          <span className="text-[11px] text-amber-600 font-semibold block">Prioritas tindak lanjut</span>
        </div>

        {/* Contacted */}
        <div
          onClick={() => handleStatusChange("CONTACTED")}
          className={cn(
            "bg-white rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer shadow-2xs space-y-2 group",
            selectedStatus === "CONTACTED"
              ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/40"
              : "border-gray-100 hover:border-gray-200 hover:shadow-xs"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-blue-700 text-xs font-bold uppercase tracking-wider">Dalam Diskusi</span>
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
              selectedStatus === "CONTACTED" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600"
            )}>
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-blue-700">{counts.contacted}</p>
          <span className="text-[11px] text-blue-600 font-semibold block">Konsultasi / demo</span>
        </div>

        {/* Offer Sent */}
        <div
          onClick={() => handleStatusChange("OFFER_SENT")}
          className={cn(
            "bg-white rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer shadow-2xs space-y-2 group",
            selectedStatus === "OFFER_SENT"
              ? "border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/40"
              : "border-gray-100 hover:border-gray-200 hover:shadow-xs"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-purple-700 text-xs font-bold uppercase tracking-wider">Penawaran</span>
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
              selectedStatus === "OFFER_SENT" ? "bg-purple-600 text-white" : "bg-purple-50 text-purple-600"
            )}>
              <Send className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-purple-700">{counts.offerSent}</p>
          <span className="text-[11px] text-purple-600 font-semibold block">Menunggu respon</span>
        </div>

        {/* Approved */}
        <div
          onClick={() => handleStatusChange("APPROVED")}
          className={cn(
            "bg-white rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer shadow-2xs space-y-2 group",
            selectedStatus === "APPROVED"
              ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/40"
              : "border-gray-100 hover:border-gray-200 hover:shadow-xs"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-emerald-700 text-xs font-bold uppercase tracking-wider">Berlangganan</span>
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
              selectedStatus === "APPROVED" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-600"
            )}>
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-700">{counts.approved}</p>
          <span className="text-[11px] text-emerald-600 font-semibold block">Closing disetujui</span>
        </div>

        {/* Rejected */}
        <div
          onClick={() => handleStatusChange("REJECTED")}
          className={cn(
            "bg-white rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer shadow-2xs space-y-2 group",
            selectedStatus === "REJECTED"
              ? "border-gray-400 ring-2 ring-gray-400/20 bg-gray-100"
              : "border-gray-100 hover:border-gray-200 hover:shadow-xs"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Dibatalkan</span>
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
              selectedStatus === "REJECTED" ? "bg-gray-600 text-white" : "bg-gray-100 text-gray-500"
            )}>
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-gray-700">{counts.rejected}</p>
          <span className="text-[11px] text-gray-500 font-semibold block">Tidak berlanjut</span>
        </div>
      </div>

      {/* SEARCH, FILTER & SORT BAR */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama sekolah, PIC, WhatsApp, no. tiket, kota..."
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

        {/* Filters & Sorters */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0">
          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="py-2.5 px-3 rounded-xl border border-gray-200 text-xs sm:text-sm font-bold text-gray-700 bg-white focus:outline-none focus:border-[#531FFF] cursor-pointer"
          >
            <option value="ALL">Semua Status ({requests.length})</option>
            <option value="PENDING">Menunggu ({counts.pending})</option>
            <option value="CONTACTED">Dalam Diskusi ({counts.contacted})</option>
            <option value="OFFER_SENT">Penawaran Dikirim ({counts.offerSent})</option>
            <option value="APPROVED">Berlangganan ({counts.approved})</option>
            <option value="REJECTED">Dibatalkan ({counts.rejected})</option>
          </select>

          {/* Plan Filter */}
          <select
            value={selectedPlan}
            onChange={(e) => handlePlanChange(e.target.value)}
            className="py-2.5 px-3 rounded-xl border border-gray-200 text-xs sm:text-sm font-bold text-gray-700 bg-white focus:outline-none focus:border-[#531FFF] cursor-pointer"
          >
            <option value="ALL">Semua Paket</option>
            <option value="trial">Uji Coba 14 Hari</option>
            <option value="standard">Sekolah Rintisan</option>
            <option value="pro">Sekolah Unggulan</option>
            <option value="enterprise">Yayasan / Enterprise</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="py-2.5 px-3 rounded-xl border border-gray-200 text-xs sm:text-sm font-bold text-gray-700 bg-white focus:outline-none focus:border-[#531FFF] cursor-pointer"
          >
            <option value="createdAt_desc">Terbaru Masuk</option>
            <option value="createdAt_asc">Terlama Masuk</option>
            <option value="schoolName_asc">Nama Sekolah (A-Z)</option>
            <option value="schoolName_desc">Nama Sekolah (Z-A)</option>
            <option value="studentCount_desc">Siswa Terbanyak</option>
          </select>

          {/* Reset button */}
          {(searchQuery || selectedStatus !== "ALL" || selectedPlan !== "ALL" || sortBy !== "createdAt_desc") && (
            <button
              onClick={handleResetFilters}
              className="py-2.5 px-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
              title="Reset Filter"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* MAIN DATA TABLE CARD */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead className="bg-[#F8F9FC] border-b border-gray-100 text-[11px] font-extrabold uppercase text-gray-400 tracking-wider">
              <tr>
                <th className="py-4 px-3 sm:px-4 text-center w-14">No.</th>
                <th className="py-4 px-4 sm:px-6">Sekolah & Jenjang</th>
                <th className="py-4 px-4">No. Tiket & Tanggal</th>
                <th className="py-4 px-4">Penanggung Jawab (PIC)</th>
                <th className="py-4 px-4">Paket & Modul</th>
                <th className="py-4 px-4">Status & Progres</th>
                <th className="py-4 px-4 sm:px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-14">
                    <Loader2 className="w-7 h-7 text-[#531FFF] animate-spin mx-auto mb-2" />
                    <p className="text-xs text-gray-500 font-bold">Memuat data permintaan berlangganan SaaS...</p>
                  </td>
                </tr>
              ) : sortedRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 px-4">
                    <div className="w-14 h-14 bg-purple-50 text-[#531FFF] rounded-2xl mx-auto flex items-center justify-center mb-3">
                      <Inbox className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-extrabold text-gray-900">Belum Ada Permintaan yang Cocok</h3>
                    <p className="text-xs text-gray-400 max-w-md mx-auto mt-1">
                      {searchQuery || selectedStatus !== "ALL" || selectedPlan !== "ALL"
                        ? "Tidak ada data permintaan berlangganan yang sesuai dengan filter pencarian Anda."
                        : "Belum ada calon sekolah yang mengirimkan formulir permintaan berlangganan."}
                    </p>
                    {(searchQuery || selectedStatus !== "ALL" || selectedPlan !== "ALL") && (
                      <button
                        onClick={handleResetFilters}
                        className="mt-4 px-4 py-2 rounded-xl bg-purple-50 text-[#531FFF] hover:bg-purple-100 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Filter Pencarian</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedRequests.map((req, idx) => {
                  const rowNumber = (currentPage - 1) * (pageSize === -1 ? 0 : pageSize) + idx + 1;
                  const statusConf = STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDING;

                  const cleanPhone = (req.picPhone || "").replace(/[^0-9]/g, "");
                  const formattedWa = cleanPhone.startsWith("0") ? "62" + cleanPhone.slice(1) : cleanPhone;
                  const waUrl = `https://wa.me/${formattedWa}?text=${encodeURIComponent(
                    `Halo ${req.picName} (${req.picRole} ${req.schoolName}), perkenalkan saya dari Tim Konsultan Quick Schools terkait permohonan berlangganan dengan No. Tiket ${req.requestNumber}. Apakah ada waktu luang untuk berdiskusi?`
                  )}`;

                  return (
                    <tr key={req.id} className="hover:bg-purple-50/20 transition-colors group">
                      {/* 1. Row Number */}
                      <td className="py-4 px-3 sm:px-4 text-center font-mono text-xs font-bold text-gray-400">
                        {rowNumber}
                      </td>

                      {/* 2. Sekolah & Jenjang */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#531FFF] border border-purple-100 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                            {req.schoolName?.substring(0, 2).toUpperCase() || "QS"}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-bold uppercase bg-gray-100 text-gray-700">
                                {req.schoolLevel}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-bold uppercase bg-purple-50 text-[#531FFF]">
                                {req.schoolType || "Swasta"}
                              </span>
                            </div>
                            <p className="font-extrabold text-gray-900 leading-tight">
                              {req.schoolName}
                            </p>
                            <p className="text-[11px] text-gray-400">
                              {req.city || req.province || "Lokasi belum diatur"}
                              {req.npsn && ` • NPSN: ${req.npsn}`}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 3. No. Tiket & Tanggal */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <span className="font-mono font-black text-[#531FFF] text-xs block">
                            {req.requestNumber}
                          </span>
                          <span className="text-[11px] text-gray-500 font-semibold block">
                            {new Date(req.createdAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                          {req.preferredTime && (
                            <span className="inline-block text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100" title="Waktu konsultasi yang diharapkan">
                              🕒 {req.preferredTime}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. Penanggung Jawab (PIC) */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-gray-800 leading-tight">{req.picName}</p>
                          <p className="text-[11px] text-gray-400">{req.picRole}</p>
                          <div className="flex items-center gap-2 pt-1">
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-[11px] text-emerald-700 hover:text-emerald-800 font-bold bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200/60 transition-all shadow-2xs"
                              title="Hubungi PIC via WhatsApp"
                            >
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span>{req.picPhone}</span>
                            </a>
                            <a
                              href={`mailto:${req.picEmail}`}
                              className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                              title={`Kirim email ke ${req.picEmail}`}
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      </td>

                      {/* 5. Paket & Modul */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <span className="font-bold text-[#531FFF] text-xs block">
                            {PLAN_LABELS[req.planInterest] || req.planInterest}
                          </span>
                          <p className="text-[11px] text-gray-600 font-medium">
                            {req.studentCount ? `${req.studentCount.toLocaleString("id-ID")} Siswa` : req.studentEstimate || "-"}
                          </p>
                          <span className="inline-block text-[10px] px-2 py-0.5 rounded-md font-bold bg-gray-100 text-gray-600">
                            {req.selectedModules.length} Modul Terpilih
                          </span>
                        </div>
                      </td>

                      {/* 6. Status & Progres */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border",
                              statusConf.bg,
                              statusConf.text,
                              statusConf.border
                            )}
                          >
                            <span className={cn(
                              "w-1.5 h-1.5 rounded-full shrink-0",
                              req.status === "PENDING" ? "bg-amber-500 animate-pulse" :
                              req.status === "CONTACTED" ? "bg-blue-500" :
                              req.status === "OFFER_SENT" ? "bg-purple-500" :
                              req.status === "APPROVED" ? "bg-emerald-500" : "bg-gray-400"
                            )} />
                            <span>{statusConf.label}</span>
                          </span>

                          {req.followUpNotes && (
                            <p className="text-[11px] text-gray-500 italic line-clamp-1 max-w-[200px]" title={req.followUpNotes}>
                              {req.followUpNotes}
                            </p>
                          )}

                          {req.assignedTo && (
                            <p className="text-[10px] text-gray-400 font-semibold">
                              PIC: {req.assignedTo}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* 7. Aksi */}
                      <td className="py-4 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDetail(req)}
                            className="px-3 py-1.5 rounded-xl bg-purple-50 text-[#531FFF] hover:bg-[#531FFF] hover:text-white font-extrabold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs group-hover:bg-[#531FFF] group-hover:text-white"
                            title="Buka Lembar Tindak Lanjut"
                          >
                            <span>Tindak Lanjut</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setDeleteConfirmId(req.id)}
                            className="p-2 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Hapus Permintaan"
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
        {!loading && sortedRequests.length > 0 && (
          <div className="px-6 py-4 bg-gray-50/70 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500 font-medium">
            {/* Left: Summary and Page Size */}
            <div className="flex flex-wrap items-center gap-3">
              <div>
                Menampilkan{" "}
                <span className="font-bold text-gray-800">
                  {pageSize === -1
                    ? sortedRequests.length
                    : Math.min((currentPage - 1) * pageSize + 1, sortedRequests.length)}
                  -
                  {pageSize === -1
                    ? sortedRequests.length
                    : Math.min(currentPage * pageSize, sortedRequests.length)}
                </span>{" "}
                dari <span className="font-bold text-gray-800">{sortedRequests.length}</span> permintaan
                {filteredRequests.length !== requests.length && (
                  <span className="text-gray-400 ml-1">(difilter dari total {requests.length})</span>
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
                    // Show first, last, and around current
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
                const cleanPhone = (activeRequest.picPhone || "").replace(/[^0-9]/g, "");
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
