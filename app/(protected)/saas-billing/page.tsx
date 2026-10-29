"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  RefreshCw,
  X,
  Loader2,
  Trash2,
  Printer,
  Copy,
  Check,
  ShieldCheck,
  Receipt,
  FileCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";

export type InvoiceStatus = "UNPAID" | "PAID" | "OVERDUE" | "CANCELLED";

export interface SaaSInvoiceItem {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customer?: {
    id: string;
    customerCode: string;
    schoolName: string;
    schoolLevel: string;
    picName: string;
    picEmail: string;
    picPhone: string;
    status: string;
  };
  schoolName: string;
  plan: string;
  amount: number;
  billingCycle: string;
  status: InvoiceStatus;
  dueDate: string;
  paidAt?: string | null;
  paymentMethod?: string | null;
  paymentProof?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillingStats {
  totalInvoices: number;
  countPaid: number;
  countUnpaid: number;
  countOverdue: number;
  countCancelled: number;
  totalPaidAmount: number;
  totalUnpaidAmount: number;
  totalOverdueAmount: number;
}

const STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; bg: string; text: string; border: string; icon: any }
> = {
  PAID: {
    label: "Lunas",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
    icon: CheckCircle2,
  },
  UNPAID: {
    label: "Menunggu Pembayaran",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    icon: Clock,
  },
  OVERDUE: {
    label: "Jatuh Tempo (Overdue)",
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200",
    icon: AlertTriangle,
  },
  CANCELLED: {
    label: "Dibatalkan",
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-200",
    icon: XCircle,
  },
};

const PLAN_LABELS: Record<string, string> = {
  trial: "Trial 14 Hari",
  standard: "Sekolah Rintisan",
  pro: "Sekolah Unggulan",
  enterprise: "Yayasan Multi-Kampus",
};

export default function SaaSBillingPage() {
  const toast = useToast();
  const { isSuperAdmin, isSaaSAdmin } = useAuth();

  const [invoices, setInvoices] = useState<SaaSInvoiceItem[]>([]);
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [customers, setCustomers] = useState<any[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  const [newInvoiceData, setNewInvoiceData] = useState({
    customerId: "",
    schoolName: "",
    plan: "pro",
    amount: 1500000,
    billingCycle: "MONTHLY",
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    notes: "",
  });

  // Verify Payment Modal
  const [verifyModalOpen, setVerifyModalOpen] = useState<boolean>(false);
  const [invoiceToVerify, setInvoiceToVerify] = useState<SaaSInvoiceItem | null>(null);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [verifyData, setVerifyData] = useState({
    paymentMethod: "TRANSFER_BCA",
    paidAt: new Date().toISOString().split("T")[0],
    paymentProof: "",
    notes: "",
  });

  // Receipt Preview Modal
  const [receiptModalOpen, setReceiptModalOpen] = useState<boolean>(false);
  const [invoiceForReceipt, setInvoiceForReceipt] = useState<SaaSInvoiceItem | null>(null);

  // Delete Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<SaaSInvoiceItem | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/saas-billing?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setInvoices(json.data || []);
        if (json.stats) setStats(json.stats);
      } else {
        throw new Error(json.error || "Gagal memuat tagihan");
      }
    } catch (err: any) {
      toast.showError(err.message, "Gagal Mengambil Tagihan");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, toast]);

  // Fetch customers for invoice generation dropdown
  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch("/api/saas-customers");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setCustomers(json.data);
      }
    } catch (err) {
      console.warn("Could not load customers for billing dropdown:", err);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Handle customer selection in create modal
  const handleCustomerSelect = (custId: string) => {
    const selected = customers.find((c) => c.id === custId);
    if (selected) {
      setNewInvoiceData((prev) => ({
        ...prev,
        customerId: selected.id,
        schoolName: selected.schoolName,
        plan: selected.plan || "pro",
        amount: selected.priceAmount || (selected.plan === "standard" ? 750000 : selected.plan === "enterprise" ? 3000000 : 1500000),
        billingCycle: selected.billingCycle || "MONTHLY",
      }));
    } else {
      setNewInvoiceData((prev) => ({ ...prev, customerId: custId }));
    }
  };

  // Submit New Invoice
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvoiceData.customerId) {
      toast.showError("Silakan pilih sekolah pelanggan terlebih dahulu", "Pilih Sekolah");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/saas-billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newInvoiceData),
      });
      const json = await res.json();
      if (json.success) {
        toast.showSuccess(json.message || "Tagihan langganan sekolah berhasil dibuat", "Tagihan Diterbitkan");
        setCreateModalOpen(false);
        fetchInvoices();
      } else {
        throw new Error(json.error || "Gagal menerbitkan tagihan");
      }
    } catch (err: any) {
      toast.showError(err.message, "Gagal Menerbitkan Tagihan");
    } finally {
      setCreating(false);
    }
  };

  // Open Verify Modal
  const handleOpenVerify = (invoice: SaaSInvoiceItem) => {
    setInvoiceToVerify(invoice);
    setVerifyData({
      paymentMethod: invoice.paymentMethod || "TRANSFER_BCA",
      paidAt: new Date().toISOString().split("T")[0],
      paymentProof: invoice.paymentProof || "",
      notes: invoice.notes || "",
    });
    setVerifyModalOpen(true);
  };

  // Submit Verify Payment
  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceToVerify) return;

    setVerifying(true);
    try {
      const res = await fetch(`/api/saas-billing/${invoiceToVerify.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "PAID",
          paymentMethod: verifyData.paymentMethod,
          paidAt: verifyData.paidAt,
          paymentProof: verifyData.paymentProof,
          notes: verifyData.notes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.showSuccess(
          `Tagihan ${invoiceToVerify.invoiceNumber} berhasil diverifikasi LUNAS dan masa aktif sekolah diperpanjang.`,
          "Pembayaran Diverifikasi"
        );
        setVerifyModalOpen(false);
        setInvoiceToVerify(null);
        fetchInvoices();
      } else {
        throw new Error(json.error || "Gagal memverifikasi pembayaran");
      }
    } catch (err: any) {
      toast.showError(err.message, "Gagal Verifikasi");
    } finally {
      setVerifying(false);
    }
  };

  // Delete Invoice
  const handleDeleteConfirm = async () => {
    if (!invoiceToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/saas-billing/${invoiceToDelete.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.showSuccess(
          `Invoice ${invoiceToDelete.invoiceNumber} berhasil dihapus`,
          "Tagihan Dihapus"
        );
        setDeleteModalOpen(false);
        setInvoiceToDelete(null);
        fetchInvoices();
      } else {
        throw new Error(json.error || "Gagal menghapus tagihan");
      }
    } catch (err: any) {
      toast.showError(err.message, "Gagal Menghapus");
    } finally {
      setDeleting(false);
    }
  };

  // Copy invoice number helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 pb-20 max-w-[1600px] mx-auto w-full space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-[#531FFF]/10 to-purple-100 text-[#531FFF] border border-[#531FFF]/20">
              <ShieldCheck className="w-3.5 h-3.5" /> {isSuperAdmin ? "Super Admin" : isSaaSAdmin ? "SaaS Administrator" : "Operasional SaaS"}
            </span>
            <span className="text-xs font-bold text-gray-400">• Manajemen Tagihan & Penagihan SaaS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Tagihan & Pembayaran Langganan
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 max-w-xl">
            Pusat monitoring penagihan lisensi sekolah, konfirmasi pembayaran lunas, verifikasi bukti transfer, serta pencetakan kuitansi resmi.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchInvoices}
            disabled={loading}
            className="p-2.5 sm:px-3.5 sm:py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
            title="Segarkan Data"
          >
            <RefreshCw className={cn("w-4 h-4 text-gray-500", loading && "animate-spin text-[#531FFF]")} />
            <span className="hidden sm:inline">Segarkan</span>
          </button>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#531FFF] text-white hover:bg-[#4314cc] text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-md shadow-[#531FFF]/20 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Terbitkan Tagihan Baru</span>
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Pembayaran Lunas</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600">
            Rp {(stats?.totalPaidAmount || 0).toLocaleString("id-ID")}
          </div>
          <div className="text-[11px] font-semibold text-emerald-700">
            {stats?.countPaid || 0} tagihan berhasil diverifikasi
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Menunggu Pembayaran</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600">
            Rp {(stats?.totalUnpaidAmount || 0).toLocaleString("id-ID")}
          </div>
          <div className="text-[11px] font-semibold text-amber-700">
            {stats?.countUnpaid || 0} invoice menunggu pelunasan
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Jatuh Tempo (Overdue)</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600">
            Rp {(stats?.totalOverdueAmount || 0).toLocaleString("id-ID")}
          </div>
          <div className="text-[11px] font-semibold text-rose-700">
            {stats?.countOverdue || 0} tagihan perlu ditindaklanjuti
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Invoice</span>
            <div className="p-2 rounded-xl bg-purple-50 text-[#531FFF]">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-gray-900">
            {stats?.totalInvoices || invoices.length}
          </div>
          <div className="text-[11px] font-semibold text-gray-500">
            Total siklus penagihan terbit
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: "ALL", label: "Semua Tagihan" },
            { id: "PAID", label: "Lunas" },
            { id: "UNPAID", label: "Menunggu" },
            { id: "OVERDUE", label: "Overdue" },
            { id: "CANCELLED", label: "Dibatalkan" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
                statusFilter === tab.id
                  ? "bg-[#531FFF] text-white shadow-xs font-black"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nomor invoice, sekolah..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#531FFF] focus:ring-1 focus:ring-[#531FFF]"
          />
        </div>
      </div>

      {/* INVOICES TABLE */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#531FFF] animate-spin mx-auto" />
            <p className="text-xs font-bold text-gray-500">Memuat data tagihan langganan...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">Tidak Ada Tagihan Ditemukan</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {searchQuery || statusFilter !== "ALL"
                ? "Tidak ada tagihan yang sesuai dengan filter pencarian saat ini."
                : "Belum ada invoice tagihan yang diterbitkan."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-100 text-gray-400 font-extrabold uppercase tracking-wider text-[11px]">
                  <th className="py-4 px-3 sm:px-4 text-center w-12">No.</th>
                  <th className="py-4 px-6">No. Invoice</th>
                  <th className="py-4 px-6">Sekolah Pelanggan</th>
                  <th className="py-4 px-6">Paket & Siklus</th>
                  <th className="py-4 px-6">Nominal</th>
                  <th className="py-4 px-6">Jatuh Tempo</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {invoices.map((inv, idx) => {
                  const cfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.UNPAID;
                  const StatusIcon = cfg.icon;

                  return (
                    <tr key={inv.id} className="hover:bg-purple-50/20 transition-colors">
                      {/* Row Number */}
                      <td className="py-4 px-3 sm:px-4 text-center font-mono text-xs font-bold text-gray-400">
                        {idx + 1}
                      </td>

                      {/* Invoice Number */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-gray-900 text-xs">
                            {inv.invoiceNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(inv.invoiceNumber, inv.id)}
                            className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors"
                            title="Salin No. Invoice"
                          >
                            {copiedId === inv.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {new Date(inv.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </td>

                      {/* School & PIC */}
                      <td className="py-4 px-6">
                        <div className="font-bold text-gray-900 leading-tight">
                          {inv.schoolName}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {inv.customer?.picName ? `PIC: ${inv.customer.picName}` : "Pelanggan Sekolah"}
                        </div>
                      </td>

                      {/* Plan & Cycle */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-50 text-[#531FFF] border border-purple-100">
                          {PLAN_LABELS[inv.plan.toLowerCase()] || inv.plan.toUpperCase()}
                        </span>
                        <div className="text-[10px] text-gray-400 font-semibold mt-1">
                          {inv.billingCycle === "YEARLY" ? "Tahunan (Yearly)" : "Bulanan (Monthly)"}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="font-black text-gray-900 text-sm">
                          Rp {inv.amount.toLocaleString("id-ID")}
                        </span>
                      </td>

                      {/* Due Date */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="text-gray-700 font-medium">
                          {new Date(inv.dueDate).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        {inv.status === "PAID" && inv.paidAt && (
                          <div className="text-[10px] text-emerald-600 font-bold mt-0.5">
                            Lunas: {new Date(inv.paidAt).toLocaleDateString("id-ID")}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border",
                          cfg.bg,
                          cfg.text,
                          cfg.border
                        )}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          <span>{cfg.label}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Verify Button if UNPAID or OVERDUE */}
                          {(inv.status === "UNPAID" || inv.status === "OVERDUE") && (
                            <button
                              onClick={() => handleOpenVerify(inv)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                              title="Verifikasi Pembayaran Lunas"
                            >
                              <FileCheck className="w-3.5 h-3.5" />
                              <span>Verifikasi Lunas</span>
                            </button>
                          )}

                          {/* Receipt Modal Trigger */}
                          <button
                            onClick={() => {
                              setInvoiceForReceipt(inv);
                              setReceiptModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                            title="Lihat & Cetak Kuitansi"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => {
                              setInvoiceToDelete(inv);
                              setDeleteModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Hapus Tagihan"
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

        {/* Table Summary Footer */}
        {!loading && invoices.length > 0 && (
          <div className="px-6 py-3.5 bg-gray-50/70 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 font-medium gap-2">
            <div>
              Menampilkan <span className="font-bold text-gray-800">{invoices.length}</span> tagihan SaaS
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Lunas: <strong className="text-gray-700">{stats?.countPaid || 0}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Menunggu: <strong className="text-gray-700">{stats?.countUnpaid || 0}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Overdue: <strong className="text-gray-700">{stats?.countOverdue || 0}</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: TERBITKAN TAGIHAN BARU */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-900">Terbitkan Tagihan Baru</h3>
                <p className="text-xs text-gray-500">Pilih sekolah pelanggan dan rincian nominal tagihan lisensi</p>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Pilih Sekolah Pelanggan <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={newInvoiceData.customerId}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#531FFF]"
                >
                  <option value="">-- Pilih Sekolah --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.schoolName} ({c.schoolLevel}) - {c.customerCode}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Paket Layanan
                  </label>
                  <select
                    value={newInvoiceData.plan}
                    onChange={(e) => setNewInvoiceData({ ...newInvoiceData, plan: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#531FFF]"
                  >
                    <option value="trial">Uji Coba 14 Hari</option>
                    <option value="standard">Sekolah Rintisan (Standard)</option>
                    <option value="pro">Sekolah Unggulan (Pro)</option>
                    <option value="enterprise">Yayasan (Enterprise)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Siklus Penagihan
                  </label>
                  <select
                    value={newInvoiceData.billingCycle}
                    onChange={(e) => setNewInvoiceData({ ...newInvoiceData, billingCycle: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#531FFF]"
                  >
                    <option value="MONTHLY">Bulanan (Monthly)</option>
                    <option value="YEARLY">Tahunan (Yearly)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Nominal Tagihan (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newInvoiceData.amount}
                    onChange={(e) => setNewInvoiceData({ ...newInvoiceData, amount: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#531FFF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Tanggal Jatuh Tempo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={newInvoiceData.dueDate}
                    onChange={(e) => setNewInvoiceData({ ...newInvoiceData, dueDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#531FFF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Catatan Tagihan (Opsional)
                </label>
                <textarea
                  rows={3}
                  value={newInvoiceData.notes}
                  onChange={(e) => setNewInvoiceData({ ...newInvoiceData, notes: e.target.value })}
                  placeholder="Contoh: Tagihan lisensi software Quick Schools periode November 2026."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#531FFF]"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  disabled={creating}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 rounded-xl bg-[#531FFF] text-white hover:bg-[#4314cc] text-xs font-bold flex items-center gap-2 shadow-md shadow-[#531FFF]/20 disabled:opacity-50"
                >
                  {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Terbitkan Tagihan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VERIFIKASI PEMBAYARAN */}
      {verifyModalOpen && invoiceToVerify && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-900">Verifikasi Pembayaran Lunas</h3>
                <p className="text-xs text-gray-500">Konfirmasikan bukti pembayaran dari pihak sekolah</p>
              </div>
              <button
                onClick={() => setVerifyModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleVerifySubmit} className="p-6 space-y-4">
              {/* Invoice Summary Box */}
              <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-100 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-500">No. Invoice:</span>
                  <span className="font-mono font-bold text-gray-900">{invoiceToVerify.invoiceNumber}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-500">Sekolah:</span>
                  <span className="font-bold text-gray-900">{invoiceToVerify.schoolName}</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-purple-200/60">
                  <span className="font-bold text-gray-700">Nominal Lunas:</span>
                  <span className="font-black text-sm text-[#531FFF]">
                    Rp {invoiceToVerify.amount.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Metode Pembayaran
                  </label>
                  <select
                    value={verifyData.paymentMethod}
                    onChange={(e) => setVerifyData({ ...verifyData, paymentMethod: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#531FFF]"
                  >
                    <option value="TRANSFER_BCA">Transfer Bank BCA</option>
                    <option value="TRANSFER_MANDIRI">Transfer Bank Mandiri</option>
                    <option value="TRANSFER_BRI">Transfer Bank BRI</option>
                    <option value="TRANSFER_BNI">Transfer Bank BNI</option>
                    <option value="QRIS">QRIS Statis/Dinamis</option>
                    <option value="VIRTUAL_ACCOUNT">Virtual Account</option>
                    <option value="MANUAL">Tunai / Setor Kasir</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Tanggal Pembayaran
                  </label>
                  <input
                    type="date"
                    required
                    value={verifyData.paidAt}
                    onChange={(e) => setVerifyData({ ...verifyData, paidAt: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#531FFF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Nomor Referensi / Bukti Transfer
                </label>
                <input
                  type="text"
                  value={verifyData.paymentProof}
                  onChange={(e) => setVerifyData({ ...verifyData, paymentProof: e.target.value })}
                  placeholder="Contoh: REF#88291038 / URL Bukti Transfer"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#531FFF]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Catatan Verifikasi (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={verifyData.notes}
                  onChange={(e) => setVerifyData({ ...verifyData, notes: e.target.value })}
                  placeholder="Catatan pelunasan untuk arsip keuangan SaaS"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#531FFF]"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-[11px] font-semibold flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>
                  Sistem otomatis memperpanjang masa aktif langganan sekolah dan memperbarui status akun sekolah menjadi <strong>AKTIF</strong>.
                </span>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setVerifyModalOpen(false)}
                  disabled={verifying}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={verifying}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {verifying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Konfirmasi Pembayaran Lunas</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INVOICE / RECEIPT PREVIEW (PRINTABLE) */}
      {receiptModalOpen && invoiceForReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[95vh]">
            {/* Modal Controls */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between print:hidden">
              <span className="text-xs font-bold text-gray-500">Pratinjau Kuitansi Resmi SaaS</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-[#531FFF] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer hover:bg-[#4314cc]"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak / PDF</span>
                </button>
                <button
                  onClick={() => setReceiptModalOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Area */}
            <div className="p-8 sm:p-10 space-y-8 flex-1 overflow-y-auto bg-white text-gray-900">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-gray-200 pb-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#531FFF] text-white flex items-center justify-center font-black text-sm">
                      QS
                    </div>
                    <span className="text-xl font-black text-gray-900 tracking-tight">Quick Schools</span>
                  </div>
                  <p className="text-xs text-gray-500">PT Inovasi Sekolah Modern Indonesia</p>
                  <p className="text-[11px] text-gray-400">Jakarta & Bandung • billing@quickschools.id</p>
                </div>

                <div className="text-right space-y-1">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-[#531FFF]">
                    {invoiceForReceipt.status === "PAID" ? "KUITANSI PEMBAYARAN" : "INVOICE PENAGIHAN"}
                  </span>
                  <div className="font-mono font-black text-sm text-gray-900">
                    {invoiceForReceipt.invoiceNumber}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Tanggal: {new Date(invoiceForReceipt.createdAt).toLocaleDateString("id-ID")}
                  </div>
                </div>
              </div>

              {/* Billed To & Status Stamp */}
              <div className="flex items-start justify-between gap-6">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    DITAGIHKAN KEPADA:
                  </span>
                  <h4 className="text-base font-black text-gray-900">{invoiceForReceipt.schoolName}</h4>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {invoiceForReceipt.customer?.picName ? `Up: ${invoiceForReceipt.customer.picName}` : ""}
                  </p>
                  <p className="text-xs text-gray-500">
                    {invoiceForReceipt.customer?.picEmail || ""} • {invoiceForReceipt.customer?.picPhone || ""}
                  </p>
                </div>

                {/* Stamp */}
                <div className="text-right">
                  {invoiceForReceipt.status === "PAID" ? (
                    <div className="inline-block px-4 py-2 rounded-2xl border-2 border-emerald-600 text-emerald-600 font-black text-lg tracking-widest uppercase rotate-[-6deg] shadow-xs">
                      ✓ LUNAS
                    </div>
                  ) : (
                    <div className="inline-block px-4 py-2 rounded-2xl border-2 border-amber-600 text-amber-600 font-black text-xs tracking-wider uppercase">
                      BELUM DIBAYAR
                    </div>
                  )}
                </div>
              </div>

              {/* Table Breakdown */}
              <div className="rounded-2xl border border-gray-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-4">Deskripsi Layanan</th>
                      <th className="py-3 px-4">Periode</th>
                      <th className="py-3 px-4 text-right">Jumlah (IDR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="py-4 px-4">
                        <div className="font-bold text-gray-900">
                          Lisensi Software Quick Schools ({PLAN_LABELS[invoiceForReceipt.plan.toLowerCase()] || invoiceForReceipt.plan.toUpperCase()})
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          Akses platform web, mobile portal, absensi AI, e-rapor, dan database cloud terintegrasi.
                        </div>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap text-gray-600">
                        {invoiceForReceipt.billingCycle === "YEARLY" ? "1 Tahun (12 Bulan)" : "1 Bulan Kalender"}
                      </td>
                      <td className="py-4 px-4 text-right font-black text-gray-900 whitespace-nowrap">
                        Rp {invoiceForReceipt.amount.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-gray-50/80 font-bold border-t border-gray-200">
                    <tr>
                      <td colSpan={2} className="py-3 px-4 text-right text-gray-700">
                        Total Pembayaran:
                      </td>
                      <td className="py-3 px-4 text-right font-black text-base text-[#531FFF]">
                        Rp {invoiceForReceipt.amount.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Footer info */}
              <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-gray-500 gap-2">
                <div>
                  <span className="font-bold text-gray-700">Metode: </span>
                  <span>{invoiceForReceipt.paymentMethod || "Transfer Rekening Resmi"}</span>
                  {invoiceForReceipt.paidAt && (
                    <span className="ml-2">• Lunas pada {new Date(invoiceForReceipt.paidAt).toLocaleDateString("id-ID")}</span>
                  )}
                </div>
                <div className="text-gray-400 text-[11px]">
                  Dicetak secara otomatis oleh Smart School OS
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {deleteModalOpen && invoiceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-gray-900">
                Hapus Tagihan {invoiceToDelete.invoiceNumber}?
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Tindakan ini akan menghapus riwayat invoice tagihan untuk sekolah <strong>{invoiceToDelete.schoolName}</strong>.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white hover:bg-rose-700 text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/20 disabled:opacity-50"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Hapus Tagihan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
