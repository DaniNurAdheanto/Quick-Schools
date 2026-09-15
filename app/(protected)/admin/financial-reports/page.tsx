"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  Search,
  Download,
  Printer,
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
  Filter,
  Users,
  GraduationCap,
  Banknote,
  Activity,
  Receipt,
  Loader2,
  ShieldCheck,
  Ban,
  CircleDollarSign,
  Landmark,
  ChevronDown,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { isSuperAdminRole } from "@/lib/roles-config";
import { useUnifiedStudents } from "@/hooks/use-unified-students";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import {
  SPPBill,
  PaymentTransaction,
  formatRupiah,
  useSPPPayments,
  SPP_MONTHS,
  calculateLateFee,
} from "@/lib/spp-payments";

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  Paid:      { label: "Lunas",       color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200", icon: CheckCircle2 },
  Partial:   { label: "Sebagian",    color: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-200",   icon: Clock },
  Unpaid:    { label: "Belum Bayar", color: "text-slate-600",   bg: "bg-slate-50",    border: "border-slate-200",   icon: CreditCard },
  Overdue:   { label: "Terlambat",   color: "text-rose-700",    bg: "bg-rose-50",     border: "border-rose-200",    icon: AlertTriangle },
  Cancelled: { label: "Dibatalkan",  color: "text-gray-500",    bg: "bg-gray-50",     border: "border-gray-200",    icon: Ban },
};

type MainTab = "ringkasan" | "transaksi" | "tagihan" | "tunggakan" | "kelas";

// ─── Helper Functions ────────────────────────────────────────────────────────

function formatShortDate(dateStr?: string): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const BOM = "\uFEFF";
  const csvContent = BOM + [headers.join(","), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function FinancialReportsPage() {
  // Auth & Role
  const {
    role: authRole,
    userData,
    isAdmin: isAuthAdmin,
    isSuperAdmin: isAuthSuperAdmin,
    isStudent: isAuthStudent,
    isAuthLoading,
  } = useAuth();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const userRole = authRole || userData?.role || "admin";
  const isSuperAdmin = isAuthSuperAdmin || isSuperAdminRole(userRole);
  const canAccess =
    isSuperAdmin ||
    isAuthAdmin ||
    (userRole || "").toLowerCase() === "admin" ||
    (userRole || "").toLowerCase() === "super-admin" ||
    !isAuthStudent;

  // Data hooks
  const {
    bills,
    sppConfig,
    activities,
  } = useSPPPayments();

  const { students } = useUnifiedStudents();

  // UI State
  const [mainTab, setMainTab] = useState<MainTab>("ringkasan");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("Semua");
  const [selectedClass, setSelectedClass] = useState("Semua");
  const [selectedStatus, setSelectedStatus] = useState("Semua");
  const [selectedMethod, setSelectedMethod] = useState("Semua");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState<string>("dateDesc");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [drawerBill, setDrawerBill] = useState<SPPBill | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  // ─── Derived Data ────────────────────────────────────────────────────────

  // All unique classes from bills + students
  const allClasses = useMemo(() => {
    const set = new Set<string>();
    bills.forEach(b => { if (b.classId) set.add(b.classId); });
    students.forEach(s => { if (s.classId) set.add(s.classId); });
    return Array.from(set).sort();
  }, [bills, students]);

  // All unique payment methods from transactions
  const allMethods = useMemo(() => {
    const set = new Set<string>();
    bills.forEach(b => {
      (b.transactions || []).forEach(t => { if (t.paymentMethod) set.add(t.paymentMethod); });
    });
    return Array.from(set).sort();
  }, [bills]);

  // Flatten all transactions from all bills
  const allTransactions = useMemo(() => {
    const txs: (PaymentTransaction & { bill: SPPBill })[] = [];
    bills.forEach(b => {
      (b.transactions || []).forEach(t => {
        txs.push({ ...t, bill: b });
      });
    });
    return txs.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [bills]);

  // ─── Summary Stats ──────────────────────────────────────────────────────

  const summaryStats = useMemo(() => {
    const totalTagihan = bills.reduce((sum, b) => sum + (b.amount || 0), 0);
    const totalPaid = bills.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
    const totalRemaining = bills.reduce((sum, b) => sum + (b.remainingAmount || 0), 0);
    const totalBills = bills.length;
    const paidBills = bills.filter(b => b.status === "Paid").length;
    const overdueBills = bills.filter(b => b.status === "Overdue").length;
    const partialBills = bills.filter(b => b.status === "Partial").length;
    const unpaidBills = bills.filter(b => b.status === "Unpaid").length;
    const cancelledBills = bills.filter(b => b.status === "Cancelled").length;
    const collectRate = totalBills > 0 ? Math.round((paidBills / totalBills) * 100) : 0;

    // This month vs last month comparison
    const now = new Date();
    const thisMonthStr = now.toISOString().slice(0, 7);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthStr = lastMonth.toISOString().slice(0, 7);

    const thisMonthIncome = allTransactions
      .filter(t => (t.paymentDate || t.createdAt || "").startsWith(thisMonthStr))
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const lastMonthIncome = allTransactions
      .filter(t => (t.paymentDate || t.createdAt || "").startsWith(lastMonthStr))
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const incomeTrend = lastMonthIncome > 0 ? Math.round(((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100) : thisMonthIncome > 0 ? 100 : 0;

    const totalLateFees = bills.reduce((sum, b) => sum + calculateLateFee(b, sppConfig), 0);

    return {
      totalTagihan, totalPaid, totalRemaining, totalBills,
      paidBills, overdueBills, partialBills, unpaidBills, cancelledBills,
      collectRate, thisMonthIncome, lastMonthIncome, incomeTrend, totalLateFees,
    };
  }, [bills, allTransactions, sppConfig]);

  // ─── Chart Data ──────────────────────────────────────────────────────────

  // Monthly income trend (12 months)
  const monthlyTrendData = useMemo(() => {
    return SPP_MONTHS.map(month => {
      const monthBills = bills.filter(b => b.periodMonth === month);
      const tagihan = monthBills.reduce((s, b) => s + (b.amount || 0), 0);
      const dibayar = monthBills.reduce((s, b) => s + (b.paidAmount || 0), 0);
      const parts = month.split(" ");
      const shortMonth = (parts[0] || "").slice(0, 3);
      return { name: shortMonth, Tagihan: tagihan, Pemasukan: dibayar };
    });
  }, [bills]);

  // Status distribution for pie chart
  const statusDistribution = useMemo(() => {
    return [
      { name: "Lunas", value: summaryStats.paidBills, color: "#10B981" },
      { name: "Sebagian", value: summaryStats.partialBills, color: "#F59E0B" },
      { name: "Belum Bayar", value: summaryStats.unpaidBills, color: "#94A3B8" },
      { name: "Terlambat", value: summaryStats.overdueBills, color: "#EF4444" },
      { name: "Dibatalkan", value: summaryStats.cancelledBills, color: "#D1D5DB" },
    ].filter(d => d.value > 0);
  }, [summaryStats]);

  // Per-class breakdown
  const classBreakdown = useMemo(() => {
    const map = new Map<string, { kelas: string; totalTagihan: number; totalDibayar: number; totalSisa: number; jumlahSiswa: number; lunas: number; tunggakan: number }>();
    bills.forEach(b => {
      const k = b.classId || "Lainnya";
      const existing = map.get(k) || { kelas: k, totalTagihan: 0, totalDibayar: 0, totalSisa: 0, jumlahSiswa: 0, lunas: 0, tunggakan: 0 };
      existing.totalTagihan += b.amount || 0;
      existing.totalDibayar += b.paidAmount || 0;
      existing.totalSisa += b.remainingAmount || 0;
      existing.jumlahSiswa += 1;
      if (b.status === "Paid") existing.lunas += 1;
      if (b.status === "Overdue" || b.status === "Unpaid" || b.status === "Partial") existing.tunggakan += 1;
      map.set(k, existing);
    });
    return Array.from(map.values()).sort((a, b) => a.kelas.localeCompare(b.kelas));
  }, [bills]);

  const classChartData = useMemo(() => {
    return classBreakdown.map(c => ({
      name: c.kelas,
      Tagihan: c.totalTagihan,
      Pemasukan: c.totalDibayar,
    }));
  }, [classBreakdown]);

  // ─── Filtered Bills ──────────────────────────────────────────────────────

  const filteredBills = useMemo(() => {
    let result = [...bills];

    if (selectedMonth !== "Semua") {
      result = result.filter(b => b.periodMonth === selectedMonth);
    }
    if (selectedClass !== "Semua") {
      result = result.filter(b => b.classId === selectedClass);
    }
    if (selectedStatus !== "Semua") {
      result = result.filter(b => b.status === selectedStatus);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(b =>
        (b.studentName || "").toLowerCase().includes(q) ||
        (b.invoiceNo || "").toLowerCase().includes(q) ||
        (b.nisn || "").toLowerCase().includes(q) ||
        (b.studentId || "").toLowerCase().includes(q)
      );
    }
    if (dateFrom) {
      result = result.filter(b => (b.paidAt || b.dueDate || "") >= dateFrom);
    }
    if (dateTo) {
      result = result.filter(b => (b.paidAt || b.dueDate || "") <= dateTo);
    }

    // Sort
    if (sortBy === "dateDesc") result.sort((a, b) => (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || ""));
    if (sortBy === "dateAsc") result.sort((a, b) => (a.updatedAt || a.createdAt || "").localeCompare(b.updatedAt || b.createdAt || ""));
    if (sortBy === "amountDesc") result.sort((a, b) => (b.amount || 0) - (a.amount || 0));
    if (sortBy === "nameAsc") result.sort((a, b) => (a.studentName || "").localeCompare(b.studentName || ""));
    if (sortBy === "remainingDesc") result.sort((a, b) => (b.remainingAmount || 0) - (a.remainingAmount || 0));

    return result;
  }, [bills, selectedMonth, selectedClass, selectedStatus, searchQuery, dateFrom, dateTo, sortBy]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    let result = [...allTransactions];

    if (selectedMonth !== "Semua") {
      result = result.filter(t => t.bill.periodMonth === selectedMonth);
    }
    if (selectedClass !== "Semua") {
      result = result.filter(t => t.bill.classId === selectedClass);
    }
    if (selectedMethod !== "Semua") {
      result = result.filter(t => t.paymentMethod === selectedMethod);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(t =>
        (t.bill.studentName || "").toLowerCase().includes(q) ||
        (t.bill.invoiceNo || "").toLowerCase().includes(q) ||
        (t.receiptNo || "").toLowerCase().includes(q)
      );
    }
    if (dateFrom) {
      result = result.filter(t => (t.paymentDate || "") >= dateFrom);
    }
    if (dateTo) {
      result = result.filter(t => (t.paymentDate || "") <= dateTo);
    }

    if (sortBy === "dateDesc") result.sort((a, b) => (b.paymentDate || b.createdAt || "").localeCompare(a.paymentDate || a.createdAt || ""));
    if (sortBy === "dateAsc") result.sort((a, b) => (a.paymentDate || a.createdAt || "").localeCompare(b.paymentDate || b.createdAt || ""));
    if (sortBy === "amountDesc") result.sort((a, b) => (b.amount || 0) - (a.amount || 0));

    return result;
  }, [allTransactions, selectedMonth, selectedClass, selectedMethod, searchQuery, dateFrom, dateTo, sortBy]);

  // Arrears (tunggakan) = bills with Unpaid, Overdue, or Partial status
  const arrearsBills = useMemo(() => {
    return filteredBills.filter(b => b.status === "Unpaid" || b.status === "Overdue" || b.status === "Partial");
  }, [filteredBills]);

  // Pagination helper
  const paginate = <T,>(items: T[]) => {
    const totalPages = Math.max(1, Math.ceil(items.length / rowsPerPage));
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * rowsPerPage;
    return {
      items: items.slice(start, start + rowsPerPage),
      totalPages,
      total: items.length,
      currentPage: safePage,
    };
  };

  // Reset page on filter change
  const handleFilterChange = useCallback((setter: (v: string) => void, value: string) => {
    setter(value);
    setCurrentPage(1);
  }, []);

  // ─── Export Handlers ─────────────────────────────────────────────────────

  const handleExportCSV = useCallback(() => {
    const source = mainTab === "transaksi" ? "transaksi" : mainTab === "tunggakan" ? "tunggakan" : "tagihan";

    if (source === "transaksi") {
      const headers = ["No", "No. Kuitansi", "Invoice", "Nama Siswa", "Kelas", "Periode", "Nominal", "Metode", "Tanggal Bayar", "Kasir"];
      const rows = filteredTransactions.map((t, i) => [
        String(i + 1), t.receiptNo, t.bill.invoiceNo, t.bill.studentName, t.bill.classId,
        t.bill.periodMonth, String(t.amount), t.paymentMethod, t.paymentDate, t.cashierName
      ]);
      downloadCSV(`Laporan_Transaksi_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    } else {
      const data = source === "tunggakan" ? arrearsBills : filteredBills;
      const headers = ["No", "Invoice", "Nama Siswa", "NISN", "Kelas", "Periode", "Tagihan", "Dibayar", "Sisa", "Status", "Jatuh Tempo"];
      const rows = data.map((b, i) => [
        String(i + 1), b.invoiceNo, b.studentName, b.nisn || "-", b.classId,
        b.periodMonth, String(b.amount), String(b.paidAmount), String(b.remainingAmount),
        STATUS_CONFIG[b.status]?.label || b.status, b.dueDate
      ]);
      downloadCSV(`Laporan_${source === "tunggakan" ? "Tunggakan" : "Tagihan"}_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    }
  }, [mainTab, filteredTransactions, filteredBills, arrearsBills]);

  const handlePrintPDF = useCallback(() => {
    window.print();
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedMonth("Semua");
    setSelectedClass("Semua");
    setSelectedStatus("Semua");
    setSelectedMethod("Semua");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  }, []);

  // ─── Render Helpers ──────────────────────────────────────────────────────

  const StatusBadge = ({ status }: { status: string }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Unpaid;
    const Icon = cfg.icon;
    return (
      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border", cfg.bg, cfg.color, cfg.border)}>
        <Icon className="w-3 h-3" />
        {cfg.label}
      </span>
    );
  };

  // ─── Access Guard ────────────────────────────────────────────────────────

  if (isAuthLoading && !isMounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#531FFF] animate-spin" />
          <p className="text-sm font-medium text-gray-500">Memuat laporan keuangan...</p>
        </div>
      </div>
    );
  }

  if (isMounted && !canAccess && !isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm text-center max-w-md">
          <div className="w-14 h-14 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Akses Ditolak</h2>
          <p className="text-sm text-gray-500">Halaman Laporan Keuangan hanya dapat diakses oleh Admin dan Super Admin sekolah.</p>
        </div>
      </div>
    );
  }

  // ─── Tab Definitions ─────────────────────────────────────────────────────

  const TABS: { id: MainTab; label: string; icon: any; count?: number }[] = [
    { id: "ringkasan", label: "Ringkasan", icon: BarChart3 },
    { id: "transaksi", label: "Transaksi", icon: Receipt, count: allTransactions.length },
    { id: "tagihan", label: "Tagihan SPP", icon: CreditCard, count: bills.length },
    { id: "tunggakan", label: "Tunggakan", icon: AlertTriangle, count: arrearsBills.length },
    { id: "kelas", label: "Per Kelas", icon: GraduationCap, count: classBreakdown.length },
  ];

  // ─── Main Render ─────────────────────────────────────────────────────────

  return (
    <div ref={printRef} className="financial-reports-print p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto w-full space-y-6 animate-in fade-in duration-300">

      {/* ═══════════════════════ PAGE HEADER ═══════════════════════ */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#531FFF] to-[#7B42FF] flex items-center justify-center text-white shrink-0 shadow-lg shadow-[#531FFF]/20">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Laporan Keuangan</h1>
              <p className="text-gray-500 text-xs md:text-sm font-medium mt-0.5">
                Ringkasan pembayaran SPP dan kondisi keuangan sekolah — Data real-time dari database
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Export Excel
            </button>
            <button
              onClick={handlePrintPDF}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold bg-[#531FFF]/10 text-[#531FFF] border border-[#531FFF]/20 hover:bg-[#531FFF]/15 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Cetak PDF
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════ SUMMARY CARDS ═══════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pemasukan */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-xs hover:shadow-md transition-shadow group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Pemasukan</p>
              <p className="text-2xl font-black text-gray-900 mt-1.5 tracking-tight">{formatRupiah(summaryStats.totalPaid)}</p>
              <div className="flex items-center gap-1.5 mt-2">
                {summaryStats.incomeTrend >= 0 ? (
                  <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                    <TrendingUp className="w-3 h-3" /> +{summaryStats.incomeTrend}%
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5 text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                    <TrendingDown className="w-3 h-3" /> {summaryStats.incomeTrend}%
                  </span>
                )}
                <span className="text-[10px] text-gray-400 font-medium">vs bulan lalu</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Total Tagihan */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-xs hover:shadow-md transition-shadow group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Tagihan</p>
              <p className="text-2xl font-black text-gray-900 mt-1.5 tracking-tight">{formatRupiah(summaryStats.totalTagihan)}</p>
              <p className="text-[11px] text-gray-400 font-medium mt-2">
                {summaryStats.totalBills} tagihan terdaftar
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Total Tunggakan */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-xs hover:shadow-md transition-shadow group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Tunggakan</p>
              <p className="text-2xl font-black text-rose-600 mt-1.5 tracking-tight">{formatRupiah(summaryStats.totalRemaining)}</p>
              <p className="text-[11px] text-gray-400 font-medium mt-2">
                {summaryStats.overdueBills + summaryStats.unpaidBills + summaryStats.partialBills} tagihan belum lunas
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Rasio Pembayaran */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-xs hover:shadow-md transition-shadow group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Rasio Lunas</p>
              <p className="text-2xl font-black text-gray-900 mt-1.5 tracking-tight">{summaryStats.collectRate}%</p>
              <div className="w-full bg-gray-100 rounded-full h-2 mt-3 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#531FFF] to-emerald-500 transition-all duration-700"
                  style={{ width: `${summaryStats.collectRate}%` }}
                />
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════ TAB NAVIGATION ═══════════════════════ */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-xs print:hidden">
        <div className="flex overflow-x-auto border-b border-gray-100">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = mainTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setMainTab(tab.id); setCurrentPage(1); }}
                className={cn(
                  "flex items-center gap-2 px-5 py-3.5 text-xs font-bold whitespace-nowrap border-b-2 transition-all cursor-pointer",
                  isActive
                    ? "border-[#531FFF] text-[#531FFF] bg-[#531FFF]/5"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold",
                    isActive ? "bg-[#531FFF]/10 text-[#531FFF]" : "bg-gray-100 text-gray-500"
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════ FILTER BAR ═══════════════════════ */}
      {mainTab !== "ringkasan" && (
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-xs space-y-3 print:hidden">
          {/* Search + Toggle */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari nama siswa, invoice, NISN..."
                value={searchQuery}
                onChange={e => handleFilterChange(setSearchQuery, e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer",
                showFilters ? "bg-[#531FFF]/10 text-[#531FFF] border-[#531FFF]/20" : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
              )}
            >
              <Filter className="w-4 h-4" />
              Filter
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showFilters && "rotate-180")} />
            </button>
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold text-gray-500 bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Periode</label>
                <select
                  value={selectedMonth}
                  onChange={e => handleFilterChange(setSelectedMonth, e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                >
                  <option value="Semua">Semua Periode</option>
                  {SPP_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Kelas</label>
                <select
                  value={selectedClass}
                  onChange={e => handleFilterChange(setSelectedClass, e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                >
                  <option value="Semua">Semua Kelas</option>
                  {allClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {mainTab !== "transaksi" && (
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Status</label>
                  <select
                    value={selectedStatus}
                    onChange={e => handleFilterChange(setSelectedStatus, e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                  >
                    <option value="Semua">Semua Status</option>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              )}
              {mainTab === "transaksi" && (
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Metode Bayar</label>
                  <select
                    value={selectedMethod}
                    onChange={e => handleFilterChange(setSelectedMethod, e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                  >
                    <option value="Semua">Semua Metode</option>
                    {allMethods.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Urutkan</label>
                <select
                  value={sortBy}
                  onChange={e => handleFilterChange(setSortBy, e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                >
                  <option value="dateDesc">Tanggal Terbaru</option>
                  <option value="dateAsc">Tanggal Terlama</option>
                  <option value="amountDesc">Nominal Terbesar</option>
                  <option value="nameAsc">Nama Siswa (A-Z)</option>
                  <option value="remainingDesc">Sisa Terbesar</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Dari Tanggal</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => handleFilterChange(setDateFrom, e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Sampai Tanggal</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => handleFilterChange(setDateTo, e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════ TAB: RINGKASAN ═══════════════════════ */}
      {mainTab === "ringkasan" && (
        <div className="space-y-6">
          {/* Row 1: Tren Pemasukan & Status Pie */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Area Chart: Tren Pemasukan vs Tagihan */}
            <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-gray-100 shadow-xs">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Tren Pemasukan & Tagihan Bulanan</h3>
                  <p className="text-[11px] text-gray-400 font-medium mt-0.5">Perbandingan 12 bulan tahun akademik</p>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-bold">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-[#531FFF]" /> Pemasukan</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-gray-300" /> Tagihan</span>
                </div>
              </div>
              <div className="h-[280px]">
                {isMounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyTrendData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradPemasukan" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#531FFF" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#531FFF" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradTagihan" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#94A3B8" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94A3B8", fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(0)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : String(v)} />
                      <RechartsTooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: 11, fontWeight: 600 }}
                        formatter={(value: any) => formatRupiah(Number(value) || 0)}
                      />
                      <Area type="monotone" dataKey="Tagihan" stroke="#94A3B8" strokeWidth={2} fill="url(#gradTagihan)" />
                      <Area type="monotone" dataKey="Pemasukan" stroke="#531FFF" strokeWidth={2.5} fill="url(#gradPemasukan)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-gray-400 font-medium">Memuat grafik tren...</div>
                )}
              </div>
            </div>

            {/* Pie Chart: Distribusi Status */}
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-xs">
              <h3 className="text-sm font-bold text-gray-900 mb-1">Distribusi Status Pembayaran</h3>
              <p className="text-[11px] text-gray-400 font-medium mb-4">Dari {summaryStats.totalBills} total tagihan</p>

              {statusDistribution.length > 0 ? (
                <>
                  <div className="h-[200px]">
                    {isMounted ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={3}
                            dataKey="value"
                            stroke="none"
                          >
                            {statusDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            contentStyle={{ borderRadius: 10, fontSize: 11, fontWeight: 600 }}
                            formatter={(value: any, name: any) => [`${value} tagihan`, String(name)]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-gray-400 font-medium">Memuat distribusi...</div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
                    {statusDistribution.map((d, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-[11px] font-semibold text-gray-600">{d.name}</span>
                        <span className="text-[11px] font-bold text-gray-900">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-[200px] text-gray-400 text-xs font-medium">
                  Belum ada data tagihan
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Per-Class Bar Chart */}
          {classChartData.length > 0 && (
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-xs">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Pemasukan & Tagihan Per Kelas</h3>
                  <p className="text-[11px] text-gray-400 font-medium mt-0.5">Breakdown kondisi keuangan setiap kelas</p>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-bold">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-[#531FFF]" /> Pemasukan</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-gray-300" /> Tagihan</span>
                </div>
              </div>
              <div className="h-[260px]">
                {isMounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={classChartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94A3B8", fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(0)}jt` : `${(v / 1000).toFixed(0)}rb`} />
                      <RechartsTooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 11, fontWeight: 600 }}
                        formatter={(value: any) => formatRupiah(Number(value) || 0)}
                      />
                      <Bar dataKey="Tagihan" fill="#E2E8F0" radius={[4, 4, 0, 0]} barSize={28} />
                      <Bar dataKey="Pemasukan" fill="#531FFF" radius={[4, 4, 0, 0]} barSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-gray-400 font-medium">Memuat data kelas...</div>
                )}
              </div>
            </div>
          )}

          {/* Row 3: Quick Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-[#531FFF] to-[#7B42FF] rounded-xl p-5 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Banknote className="w-4 h-4 opacity-80" />
                <p className="text-[11px] font-bold opacity-80 uppercase tracking-wider">Pemasukan Bulan Ini</p>
              </div>
              <p className="text-xl font-black">{formatRupiah(summaryStats.thisMonthIncome)}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-amber-500" />
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Denda Keterlambatan</p>
              </div>
              <p className="text-xl font-black text-gray-900">{formatRupiah(summaryStats.totalLateFees)}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-500" />
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Siswa</p>
              </div>
              <p className="text-xl font-black text-gray-900">{students.filter(s => s.status === "Aktif" || s.onboardingCompleted).length}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <CircleDollarSign className="w-4 h-4 text-purple-500" />
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Transaksi</p>
              </div>
              <p className="text-xl font-black text-gray-900">{allTransactions.length}</p>
            </div>
          </div>

          {/* Row 4: Recent Activity Log */}
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-xs">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Aktivitas Terkini</h3>
            {activities.length > 0 ? (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {activities.slice(0, 10).map((act, i) => (
                  <div key={act.id || i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50/70 hover:bg-gray-100/80 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center shrink-0 mt-0.5">
                      <Activity className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 leading-snug">{act.summary}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-400 font-medium">{act.timestamp}</span>
                        <span className="text-[10px] text-gray-400">•</span>
                        <span className="text-[10px] font-bold text-[#531FFF]/70">{act.user}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 font-medium text-center py-8">Belum ada aktivitas tercatat</p>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════ TAB: TRANSAKSI ═══════════════════════ */}
      {mainTab === "transaksi" && (() => {
        const paged = paginate(filteredTransactions);
        return (
          <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-12">No</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">No. Kuitansi</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nama Siswa</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Kelas</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Periode</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Nominal</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Metode</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tgl Bayar</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Kasir</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-16 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.items.length > 0 ? paged.items.map((t, i) => (
                    <tr key={t.id + i} className="border-b border-gray-50 hover:bg-[#531FFF]/[0.02] transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-500 font-medium">{(paged.currentPage - 1) * rowsPerPage + i + 1}</td>
                      <td className="px-4 py-3 text-xs font-bold text-[#531FFF]">{t.receiptNo}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-gray-900">
                        <div className="flex items-center gap-2">
                          <ProfileAvatar
                            name={t.bill.studentName}
                            imageUrl={(t.bill as any)?.imageUrl || (t.bill as any)?.photoUrl}
                            role="student"
                            size="xs"
                            shape="circle"
                          />
                          <span>{t.bill.studentName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 font-medium">{t.bill.classId}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 font-medium">{t.bill.periodMonth}</td>
                      <td className="px-4 py-3 text-xs font-bold text-emerald-700 text-right">{formatRupiah(t.amount)}</td>
                      <td className="px-4 py-3 text-[11px] text-gray-600 font-medium max-w-[140px] truncate">{t.paymentMethod}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 font-medium">{formatShortDate(t.paymentDate)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 font-medium">{t.cashierName}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setDrawerBill(t.bill)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-[#531FFF] hover:bg-[#531FFF]/10 transition-colors cursor-pointer"
                          title="Lihat Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={10} className="text-center py-16 text-gray-400 text-xs font-medium">
                        <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        Tidak ada transaksi ditemukan
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {paged.total > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-gray-500 font-medium">
                    Menampilkan {((paged.currentPage - 1) * rowsPerPage) + 1} - {Math.min(paged.currentPage * rowsPerPage, paged.total)} dari {paged.total}
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                    <span>Per hal:</span>
                    <select
                      value={rowsPerPage}
                      onChange={e => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                      className="px-2 py-0.5 rounded border border-gray-200 text-xs font-semibold text-gray-700 bg-white cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>
                {paged.totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={paged.currentPage <= 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: Math.min(paged.totalPages, 5) }, (_, i) => {
                      const page = paged.currentPage <= 3 ? i + 1 : paged.currentPage - 2 + i;
                      if (page < 1 || page > paged.totalPages) return null;
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            "w-8 h-8 rounded-lg text-xs font-bold transition-colors cursor-pointer",
                            page === paged.currentPage ? "bg-[#531FFF] text-white" : "text-gray-500 hover:bg-gray-100"
                          )}
                        >
                          {page}
                        </button>
                      );
                    })}
                    <button
                      disabled={paged.currentPage >= paged.totalPages}
                      onClick={() => setCurrentPage(p => Math.min(paged.totalPages, p + 1))}
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* ═══════════════════════ TAB: TAGIHAN SPP ═══════════════════════ */}
      {mainTab === "tagihan" && (() => {
        const paged = paginate(filteredBills);
        return (
          <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-12">No</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Invoice</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nama Siswa</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Kelas</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Periode</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Tagihan</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Dibayar</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Sisa</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Jatuh Tempo</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-16 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.items.length > 0 ? paged.items.map((b, i) => (
                    <tr key={b.id + i} className="border-b border-gray-50 hover:bg-[#531FFF]/[0.02] transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-500 font-medium">{(paged.currentPage - 1) * rowsPerPage + i + 1}</td>
                      <td className="px-4 py-3 text-xs font-bold text-[#531FFF]">{b.invoiceNo}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-gray-900">
                        <div className="flex items-center gap-2">
                          <ProfileAvatar
                            name={b.studentName}
                            imageUrl={(b as any)?.imageUrl || (b as any)?.photoUrl}
                            role="student"
                            size="xs"
                            shape="circle"
                          />
                          <span>{b.studentName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 font-medium">{b.classId}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 font-medium">{b.periodMonth}</td>
                      <td className="px-4 py-3 text-xs font-bold text-gray-900 text-right">{formatRupiah(b.amount)}</td>
                      <td className="px-4 py-3 text-xs font-bold text-emerald-700 text-right">{formatRupiah(b.paidAmount)}</td>
                      <td className="px-4 py-3 text-xs font-bold text-rose-600 text-right">{b.remainingAmount > 0 ? formatRupiah(b.remainingAmount) : "-"}</td>
                      <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                      <td className="px-4 py-3 text-xs text-gray-600 font-medium">{formatShortDate(b.dueDate)}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setDrawerBill(b)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-[#531FFF] hover:bg-[#531FFF]/10 transition-colors cursor-pointer"
                          title="Lihat Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={11} className="text-center py-16 text-gray-400 text-xs font-medium">
                        <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        Tidak ada tagihan ditemukan
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {paged.total > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-gray-500 font-medium">
                    Menampilkan {((paged.currentPage - 1) * rowsPerPage) + 1} - {Math.min(paged.currentPage * rowsPerPage, paged.total)} dari {paged.total}
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                    <span>Per hal:</span>
                    <select
                      value={rowsPerPage}
                      onChange={e => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                      className="px-2 py-0.5 rounded border border-gray-200 text-xs font-semibold text-gray-700 bg-white cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>
                {paged.totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={paged.currentPage <= 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: Math.min(paged.totalPages, 5) }, (_, i) => {
                      const page = paged.currentPage <= 3 ? i + 1 : paged.currentPage - 2 + i;
                      if (page < 1 || page > paged.totalPages) return null;
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            "w-8 h-8 rounded-lg text-xs font-bold transition-colors cursor-pointer",
                            page === paged.currentPage ? "bg-[#531FFF] text-white" : "text-gray-500 hover:bg-gray-100"
                          )}
                        >
                          {page}
                        </button>
                      );
                    })}
                    <button
                      disabled={paged.currentPage >= paged.totalPages}
                      onClick={() => setCurrentPage(p => Math.min(paged.totalPages, p + 1))}
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* ═══════════════════════ TAB: TUNGGAKAN ═══════════════════════ */}
      {mainTab === "tunggakan" && (() => {
        const paged = paginate(arrearsBills);
        const totalArrears = arrearsBills.reduce((s, b) => s + (b.remainingAmount || 0), 0);

        return (
          <div className="space-y-4">
            {/* Arrears Summary Banner */}
            <div className="bg-gradient-to-r from-rose-50 to-amber-50 rounded-xl p-5 border border-rose-200/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Total Tunggakan Aktif</p>
                    <p className="text-[11px] text-gray-500 font-medium">{arrearsBills.length} tagihan belum lunas dari {bills.length} total tagihan</p>
                  </div>
                </div>
                <p className="text-2xl font-black text-rose-600">{formatRupiah(totalArrears)}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100">
                      <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-12">No</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Invoice</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nama Siswa</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Kelas</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Periode</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Tagihan</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Sisa Bayar</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Jatuh Tempo</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Denda</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-16 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.items.length > 0 ? paged.items.map((b, i) => {
                      const lateFee = calculateLateFee(b, sppConfig);
                      return (
                        <tr key={b.id + i} className="border-b border-gray-50 hover:bg-rose-50/30 transition-colors">
                          <td className="px-4 py-3 text-xs text-gray-500 font-medium">{(paged.currentPage - 1) * rowsPerPage + i + 1}</td>
                          <td className="px-4 py-3 text-xs font-bold text-[#531FFF]">{b.invoiceNo}</td>
                          <td className="px-4 py-3 text-xs font-semibold text-gray-900">
                            <div className="flex items-center gap-2">
                              <ProfileAvatar
                                name={b.studentName}
                                imageUrl={(b as any)?.imageUrl || (b as any)?.photoUrl}
                                role="student"
                                size="xs"
                                shape="circle"
                              />
                              <span>{b.studentName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 font-medium">{b.classId}</td>
                          <td className="px-4 py-3 text-xs text-gray-600 font-medium">{b.periodMonth}</td>
                          <td className="px-4 py-3 text-xs font-bold text-gray-900 text-right">{formatRupiah(b.amount)}</td>
                          <td className="px-4 py-3 text-xs font-bold text-rose-600 text-right">{formatRupiah(b.remainingAmount)}</td>
                          <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                          <td className="px-4 py-3 text-xs text-gray-600 font-medium">{formatShortDate(b.dueDate)}</td>
                          <td className="px-4 py-3 text-xs font-bold text-amber-600 text-right">{lateFee > 0 ? formatRupiah(lateFee) : "-"}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => setDrawerBill(b)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-[#531FFF] hover:bg-[#531FFF]/10 transition-colors cursor-pointer"
                              title="Lihat Detail"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={11} className="text-center py-16 text-gray-400 text-xs font-medium">
                          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-300" />
                          Tidak ada tunggakan — semua tagihan lunas! 🎉
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {paged.total > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-gray-500 font-medium">
                      Menampilkan {((paged.currentPage - 1) * rowsPerPage) + 1} - {Math.min(paged.currentPage * rowsPerPage, paged.total)} dari {paged.total}
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <span>Per hal:</span>
                      <select
                        value={rowsPerPage}
                        onChange={e => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                        className="px-2 py-0.5 rounded border border-gray-200 text-xs font-semibold text-gray-700 bg-white cursor-pointer"
                      >
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                  </div>
                  {paged.totalPages > 1 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={paged.currentPage <= 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      {Array.from({ length: Math.min(paged.totalPages, 5) }, (_, i) => {
                        const page = paged.currentPage <= 3 ? i + 1 : paged.currentPage - 2 + i;
                        if (page < 1 || page > paged.totalPages) return null;
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={cn(
                              "w-8 h-8 rounded-lg text-xs font-bold transition-colors cursor-pointer",
                              page === paged.currentPage ? "bg-[#531FFF] text-white" : "text-gray-500 hover:bg-gray-100"
                            )}
                          >
                            {page}
                          </button>
                        );
                      })}
                      <button
                        disabled={paged.currentPage >= paged.totalPages}
                        onClick={() => setCurrentPage(p => Math.min(paged.totalPages, p + 1))}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════ TAB: PER KELAS ═══════════════════════ */}
      {mainTab === "kelas" && (
        <div className="space-y-4">
          {classBreakdown.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {classBreakdown.map((cls) => {
                const rate = cls.jumlahSiswa > 0 ? Math.round((cls.lunas / cls.jumlahSiswa) * 100) : 0;
                return (
                  <div key={cls.kelas} className="bg-white rounded-xl p-5 border border-gray-100 shadow-xs hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center font-bold text-sm">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-gray-900 truncate">{cls.kelas}</h4>
                        <p className="text-[10px] text-gray-400 font-medium">{cls.jumlahSiswa} tagihan</p>
                      </div>
                      <div className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold",
                        rate >= 80 ? "bg-emerald-50 text-emerald-700" : rate >= 50 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
                      )}>
                        {rate}% Lunas
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-100 rounded-full h-2 mb-4 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-700",
                          rate >= 80 ? "bg-emerald-500" : rate >= 50 ? "bg-amber-500" : "bg-rose-500"
                        )}
                        style={{ width: `${rate}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-2.5 rounded-lg bg-gray-50">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Tagihan</p>
                        <p className="text-xs font-black text-gray-900 mt-0.5">{formatRupiah(cls.totalTagihan)}</p>
                      </div>
                      <div className="text-center p-2.5 rounded-lg bg-emerald-50/70">
                        <p className="text-[10px] text-emerald-600 font-bold uppercase">Dibayar</p>
                        <p className="text-xs font-black text-emerald-700 mt-0.5">{formatRupiah(cls.totalDibayar)}</p>
                      </div>
                      <div className="text-center p-2.5 rounded-lg bg-rose-50/70">
                        <p className="text-[10px] text-rose-600 font-bold uppercase">Sisa</p>
                        <p className="text-xs font-black text-rose-700 mt-0.5">{formatRupiah(cls.totalSisa)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                          <CheckCircle2 className="w-3 h-3" /> {cls.lunas} Lunas
                        </span>
                        <span className="text-gray-300">|</span>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600">
                          <AlertTriangle className="w-3 h-3" /> {cls.tunggakan} Tunggakan
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl p-16 border border-gray-100 shadow-xs text-center">
              <GraduationCap className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-400">Belum ada data kelas</p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════ DETAIL DRAWER ═══════════════════════ */}
      {drawerBill && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-40 animate-in fade-in duration-200 print:hidden"
            onClick={() => setDrawerBill(null)}
          />
          {/* Drawer */}
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-[520px] bg-white shadow-2xl z-50 animate-in slide-in-from-right duration-300 flex flex-col print:hidden">
            {/* Drawer Header */}
            <div className="p-5 border-b border-gray-100 bg-gradient-to-b from-[#F7F5FF] to-white shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-[#531FFF] uppercase tracking-wider">Detail Tagihan</p>
                  <h3 className="text-lg font-black text-gray-900 mt-1">{drawerBill.invoiceNo}</h3>
                </div>
                <button
                  onClick={() => setDrawerBill(null)}
                  className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-white/80 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Student Info */}
              <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3.5">
                <ProfileAvatar
                  name={drawerBill.studentName}
                  imageUrl={(drawerBill as any)?.imageUrl || (drawerBill as any)?.photoUrl}
                  role="student"
                  size="lg"
                  shape="rounded"
                />
                <div className="flex-1 grid grid-cols-2 gap-y-2">
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">Nama</p>
                    <p className="text-xs font-bold text-gray-900">{drawerBill.studentName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">NISN</p>
                    <p className="text-xs font-bold text-gray-900">{drawerBill.nisn || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">Kelas</p>
                    <p className="text-xs font-bold text-gray-900">{drawerBill.classId}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">Tahun Akademik</p>
                    <p className="text-xs font-bold text-gray-900">{drawerBill.academicYear || "2026/2027"}</p>
                  </div>
                </div>
              </div>

              {/* Bill Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Detail Tagihan</p>
                <div className="grid grid-cols-2 gap-y-2">
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">Periode</p>
                    <p className="text-xs font-bold text-gray-900">{drawerBill.periodMonth}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">Status</p>
                    <StatusBadge status={drawerBill.status} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">Jatuh Tempo</p>
                    <p className="text-xs font-bold text-gray-900">{formatShortDate(drawerBill.dueDate)}</p>
                  </div>
                  {drawerBill.paidAt && (
                    <div>
                      <p className="text-[10px] text-gray-400 font-medium">Tanggal Bayar</p>
                      <p className="text-xs font-bold text-gray-900">{formatShortDate(drawerBill.paidAt)}</p>
                    </div>
                  )}
                </div>

                {/* Amount Breakdown */}
                <div className="mt-3 pt-3 border-t border-gray-200/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-medium">Total Tagihan</span>
                    <span className="text-xs font-bold text-gray-900">{formatRupiah(drawerBill.amount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-600 font-medium">Total Dibayar</span>
                    <span className="text-xs font-bold text-emerald-700">{formatRupiah(drawerBill.paidAmount)}</span>
                  </div>
                  {drawerBill.remainingAmount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-rose-600 font-medium">Sisa Bayar</span>
                      <span className="text-xs font-bold text-rose-700">{formatRupiah(drawerBill.remainingAmount)}</span>
                    </div>
                  )}
                  {(() => {
                    const fee = calculateLateFee(drawerBill, sppConfig);
                    return fee > 0 ? (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-amber-600 font-medium">Denda Keterlambatan</span>
                        <span className="text-xs font-bold text-amber-700">{formatRupiah(fee)}</span>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>

              {/* Transaction History */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Riwayat Pembayaran ({(drawerBill.transactions || []).length})</p>
                {(drawerBill.transactions || []).length > 0 ? (
                  <div className="space-y-2">
                    {drawerBill.transactions.map((tx, idx) => (
                      <div key={tx.id || idx} className="bg-emerald-50/50 rounded-xl p-3.5 border border-emerald-100/80">
                        <div className="flex items-start justify-between mb-1.5">
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">{tx.receiptNo}</span>
                          <span className="text-xs font-black text-emerald-700">{formatRupiah(tx.amount)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-y-1 mt-2">
                          <div>
                            <p className="text-[9px] text-gray-400 font-medium">Metode</p>
                            <p className="text-[11px] font-semibold text-gray-700 truncate">{tx.paymentMethod}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-gray-400 font-medium">Tanggal</p>
                            <p className="text-[11px] font-semibold text-gray-700">{formatShortDate(tx.paymentDate)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-gray-400 font-medium">Kasir</p>
                            <p className="text-[11px] font-semibold text-gray-700">{tx.cashierName}</p>
                          </div>
                          {tx.referenceNo && tx.referenceNo !== "-" && (
                            <div>
                              <p className="text-[9px] text-gray-400 font-medium">Ref.</p>
                              <p className="text-[11px] font-semibold text-gray-700">{tx.referenceNo}</p>
                            </div>
                          )}
                        </div>
                        {tx.notes && (
                          <p className="text-[10px] text-gray-400 mt-2 italic">{tx.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Receipt className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
                    <p className="text-[11px] font-medium">Belum ada pembayaran tercatat</p>
                  </div>
                )}
              </div>

              {/* Notes */}
              {drawerBill.notes && (
                <div className="bg-amber-50/60 rounded-xl p-4 border border-amber-200/60">
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Catatan</p>
                  <p className="text-xs text-amber-800 font-medium">{drawerBill.notes}</p>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/50 shrink-0">
              <button
                onClick={() => setDrawerBill(null)}
                className="w-full py-2.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════ PRINT STYLES ═══════════════════════ */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body * { visibility: hidden; }
          .print\\:hidden { display: none !important; }
          [class*="sidebar"], [class*="Sidebar"], nav, header { display: none !important; }
          div[class*="max-w-\\[1600px\\]"], div[class*="max-w-\\[1600px\\]"] * { visibility: visible; }
          div[class*="max-w-\\[1600px\\]"] { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
          @page { size: A4 landscape; margin: 12mm; }
          table { font-size: 10px !important; }
          .shadow-xs, .shadow-sm, .shadow-md, .shadow-lg, .shadow-2xl { box-shadow: none !important; }
        }
      `,
        }}
      />
    </div>
  );
}
