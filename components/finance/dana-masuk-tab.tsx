"use client";

import React, { useState, useMemo } from "react";
import {
  Landmark,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  Edit2,
  Trash2,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Banknote,
  Building2,
  Coins,
  Receipt,
  FileCheck,
  Check,
  Calendar,
  ShieldCheck,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";
import { useAcademicYear } from "@/context/AcademicYearContext";
import {
  SchoolIncome,
  IncomeCategory,
  IncomePaymentMethod,
  INCOME_CATEGORIES,
  INCOME_PAYMENT_METHODS,
  PRESET_ACCOUNTS,
  useSchoolIncomes,
} from "@/lib/school-incomes";
import { formatRupiah, angkaKeTerbilang } from "@/lib/spp-payments";

const PIE_COLORS = [
  "#2563EB", // BOS Reguler - Blue
  "#4F46E5", // BOS Kinerja - Indigo
  "#7C3AED", // BOS Afirmasi - Purple
  "#059669", // Bantuan Pemerintah - Emerald
  "#D97706", // Donasi & CSR - Amber
  "#0891B2", // Sumbangan Alumni - Cyan
  "#E11D48", // Hibah Lembaga - Rose
  "#0D9488", // Unit Usaha - Teal
  "#64748B", // Lainnya - Slate
];

export function DanaMasukTab() {
  const {
    activeAcademicYear,
    activeSemester,
    isArchiveMode,
    resetToSchoolDefault,
  } = useAcademicYear();

  const {
    incomes,
    stats,
    addIncome,
    updateIncome,
    deleteIncome,
  } = useSchoolIncomes(activeAcademicYear, activeSemester);

  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");
  const [selectedMethod, setSelectedMethod] = useState<string>("Semua");
  const [selectedStatus, setSelectedStatus] = useState<string>("Semua");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<SchoolIncome | null>(null);
  const [receiptIncome, setReceiptIncome] = useState<SchoolIncome | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form Fields State
  const [formData, setFormData] = useState({
    title: "",
    category: "BOS Reguler" as IncomeCategory,
    sourceName: "",
    amount: 0,
    amountStr: "",
    receivedDate: new Date().toISOString().slice(0, 10),
    paymentMethod: "Transfer Bank" as IncomePaymentMethod,
    accountDestination: PRESET_ACCOUNTS[0],
    referenceNumber: "",
    description: "",
    proofName: "",
    status: "Diterima" as "Diterima" | "Pending",
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Filtered List
  const filteredIncomes = useMemo(() => {
    let result = [...incomes];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.sourceName.toLowerCase().includes(q) ||
          (item.referenceNumber || "").toLowerCase().includes(q) ||
          (item.description || "").toLowerCase().includes(q) ||
          item.accountDestination.toLowerCase().includes(q)
      );
    }

    if (selectedCategory !== "Semua") {
      result = result.filter((item) => item.category === selectedCategory);
    }

    if (selectedMethod !== "Semua") {
      result = result.filter((item) => item.paymentMethod === selectedMethod);
    }

    if (selectedStatus !== "Semua") {
      result = result.filter((item) => item.status === selectedStatus);
    }

    if (dateFrom) {
      result = result.filter((item) => item.receivedDate >= dateFrom);
    }

    if (dateTo) {
      result = result.filter((item) => item.receivedDate <= dateTo);
    }

    // Sort by date descending
    result.sort((a, b) => (b.receivedDate || "").localeCompare(a.receivedDate || ""));

    return result;
  }, [incomes, searchQuery, selectedCategory, selectedMethod, selectedStatus, dateFrom, dateTo]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredIncomes.length / rowsPerPage));
  const paginatedIncomes = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredIncomes.slice(start, start + rowsPerPage);
  }, [filteredIncomes, currentPage, rowsPerPage]);

  // Chart Data: Composition by Category
  const pieChartData = useMemo(() => {
    return INCOME_CATEGORIES.map((cat, idx) => {
      const catStat = stats.byCategory[cat.id] || { total: 0, percentage: 0 };
      return {
        name: cat.label,
        value: catStat.total,
        percentage: catStat.percentage,
        color: PIE_COLORS[idx % PIE_COLORS.length],
      };
    }).filter((d) => d.value > 0);
  }, [stats]);

  // Chart Data: Bar Chart
  const barChartData = useMemo(() => {
    return INCOME_CATEGORIES.map((cat) => {
      const catStat = stats.byCategory[cat.id] || { total: 0 };
      return {
        category: cat.id.length > 12 ? cat.id.slice(0, 11) + "..." : cat.id,
        fullName: cat.label,
        Nominal: catStat.total,
      };
    }).filter((d) => d.Nominal > 0);
  }, [stats]);

  // Handlers for Form
  const handleOpenAdd = () => {
    setEditingIncome(null);
    setFormData({
      title: "",
      category: "BOS Reguler",
      sourceName: "",
      amount: 0,
      amountStr: "",
      receivedDate: new Date().toISOString().slice(0, 10),
      paymentMethod: "Transfer Bank",
      accountDestination: PRESET_ACCOUNTS[0],
      referenceNumber: "",
      description: "",
      proofName: "",
      status: "Diterima",
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (income: SchoolIncome) => {
    setEditingIncome(income);
    setFormData({
      title: income.title,
      category: income.category,
      sourceName: income.sourceName,
      amount: income.amount,
      amountStr: String(income.amount),
      receivedDate: income.receivedDate,
      paymentMethod: income.paymentMethod,
      accountDestination: income.accountDestination,
      referenceNumber: income.referenceNumber || "",
      description: income.description || "",
      proofName: income.proofName || "",
      status: income.status === "Dibatalkan" ? "Diterima" : income.status,
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleAmountChange = (raw: string) => {
    const cleanNum = raw.replace(/\D/g, "");
    const val = Number(cleanNum) || 0;
    setFormData((prev) => ({
      ...prev,
      amount: val,
      amountStr: cleanNum ? cleanNum : "",
    }));
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFormError("Nama atau judul pemasukan wajib diisi.");
      return;
    }
    if (!formData.sourceName.trim()) {
      setFormError("Instansi atau sumber pemberi dana wajib diisi.");
      return;
    }
    if (formData.amount <= 0) {
      setFormError("Jumlah nominal dana harus lebih besar dari Rp 0.");
      return;
    }
    if (!formData.receivedDate) {
      setFormError("Tanggal penerimaan dana wajib ditentukan.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingIncome) {
        await updateIncome(editingIncome.id, {
          title: formData.title.trim(),
          category: formData.category,
          sourceName: formData.sourceName.trim(),
          amount: formData.amount,
          receivedDate: formData.receivedDate,
          paymentMethod: formData.paymentMethod,
          accountDestination: formData.accountDestination,
          referenceNumber: formData.referenceNumber.trim() || undefined,
          description: formData.description.trim() || undefined,
          proofName: formData.proofName.trim() || undefined,
          status: formData.status,
        });
        showNotification("success", `Data penerimaan "${formData.title}" berhasil diperbarui.`);
      } else {
        await addIncome({
          title: formData.title.trim(),
          category: formData.category,
          sourceName: formData.sourceName.trim(),
          amount: formData.amount,
          receivedDate: formData.receivedDate,
          paymentMethod: formData.paymentMethod,
          accountDestination: formData.accountDestination,
          referenceNumber: formData.referenceNumber.trim() || undefined,
          description: formData.description.trim() || undefined,
          proofName: formData.proofName.trim() || undefined,
          academicYear: activeAcademicYear,
          semester: activeSemester as "Ganjil" | "Genap",
          status: formData.status,
          recordedBy: "Bendahara Sekolah",
        });
        showNotification("success", `Pemasukan dana "${formData.title}" berhasil dicatat untuk T.A. ${activeAcademicYear}.`);
      }
      setIsFormOpen(false);
    } catch (err: any) {
      setFormError(err.message || "Gagal menyimpan data pemasukan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteIncome(id);
      showNotification("success", "Data pemasukan berhasil dihapus.");
      setDeletingId(null);
    } catch (err: any) {
      showNotification("error", "Gagal menghapus data pemasukan: " + err.message);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      "No",
      "Tanggal Terima",
      "Kategori / Sumber",
      "Judul Pemasukan",
      "Pihak Pemberi",
      "Nominal (Rp)",
      "Metode Pembayaran",
      "Rekening Penerima",
      "No. Referensi / SP2D",
      "Status",
      "Tahun Ajaran",
      "Semester",
      "Keterangan",
    ];

    const rows = filteredIncomes.map((item, idx) => [
      String(idx + 1),
      item.receivedDate,
      item.category,
      item.title,
      item.sourceName,
      String(item.amount),
      item.paymentMethod,
      item.accountDestination,
      item.referenceNumber || "-",
      item.status,
      item.academicYear,
      item.semester,
      item.description || "-",
    ]);

    const BOM = "\uFEFF";
    const csvContent =
      BOM +
      [
        headers.join(","),
        ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")),
      ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Laporan_Dana_Masuk_${activeAcademicYear.replace(/\//g, "-")}_${activeSemester}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {notification && (
        <div
          className={cn(
            "fixed top-20 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold transition-all duration-300",
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-rose-50 text-rose-900 border-rose-200"
          )}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Banner & Period Context */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Landmark className="w-3.5 h-3.5" />
                Pemasukan Non-SPP & Hibah
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/15">
                <Calendar className="w-3.5 h-3.5 text-indigo-300" />
                Periode: T.A. {activeAcademicYear} ({activeSemester})
              </span>
              {isArchiveMode && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Clock className="w-3 h-3" /> Mode Arsip Riwayat
                </span>
              )}
            </div>
            <h2 className="text-xl lg:text-2xl font-black tracking-tight">
              Pencatatan & Laporan Dana Masuk Sekolah
            </h2>
            <p className="text-xs lg:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Pencatatan resmi seluruh dana eksternal sekolah (Dana BOS Reguler/Kinerja, bantuan APBD/DAK, hibah laboratorium, donasi CSR, dan unit usaha). Seluruh data terhubung aman dengan Tahun Ajaran aktif tanpa percampuran antarperiode.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {isArchiveMode && (
              <button
                onClick={resetToSchoolDefault}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-amber-200 border border-white/20 transition-all cursor-pointer"
              >
                Kembali ke Periode Aktif
              </button>
            )}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Catat Dana Masuk Baru
            </button>
          </div>
        </div>
      </div>

      {/* 4 Cards: Metric Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Dana Masuk */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-xs hover:shadow-md transition-all group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Total Dana Masuk Periode Ini
              </p>
              <p className="text-2xl font-black text-gray-900 mt-1.5 tracking-tight">
                {formatRupiah(stats.totalAmount)}
              </p>
              <p className="text-[11px] text-emerald-600 font-bold mt-1.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {stats.totalCount} transaksi penerimaan
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Banknote className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Dana BOS */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-xs hover:shadow-md transition-all group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Dana BOS (Reguler/Kinerja)
              </p>
              <p className="text-2xl font-black text-blue-700 mt-1.5 tracking-tight">
                {formatRupiah(stats.totalBOS)}
              </p>
              <p className="text-[11px] text-gray-400 font-medium mt-1.5">
                BOS Reguler, Kinerja & Afirmasi
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Landmark className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Bantuan Pemerintah & Hibah */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-xs hover:shadow-md transition-all group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Bantuan Pemda & Hibah
              </p>
              <p className="text-2xl font-black text-purple-700 mt-1.5 tracking-tight">
                {formatRupiah(stats.totalGov + stats.totalGrant)}
              </p>
              <p className="text-[11px] text-gray-400 font-medium mt-1.5">
                APBD, DAK, dan Hibah Sarpras
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Building2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Donasi & Unit Usaha */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-xs hover:shadow-md transition-all group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Donasi, Alumni & Koperasi
              </p>
              <p className="text-2xl font-black text-amber-700 mt-1.5 tracking-tight">
                {formatRupiah(stats.totalDonation + stats.totalBiz + stats.totalOthers)}
              </p>
              <p className="text-[11px] text-gray-400 font-medium mt-1.5">
                CSR, Sumbangan, dan SHU Unit Usaha
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Coins className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Visual Charts: Donut Composition & Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut Chart: Komposisi Sumber Dana */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Komposisi Sumber Dana Masuk</h3>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">Proporsi penerimaan T.A. {activeAcademicYear}</p>
            </div>
          </div>

          <div className="h-[220px]">
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #E2E8F0",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                    formatter={(val: any) => formatRupiah(Number(val) || 0)}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">
                Belum ada data penerimaan untuk periode ini
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-gray-100 max-h-[120px] overflow-y-auto">
            {pieChartData.map((d, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px]">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-gray-600 truncate">{d.name}</span>
                <span className="font-bold text-gray-900 ml-auto">{d.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar Chart: Nominal per Kategori */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Nominal Penerimaan per Kategori</h3>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">Rincian nominal rupiah yang telah disetorkan ke kas sekolah</p>
            </div>
          </div>

          <div className="h-[260px]">
            {barChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis
                    dataKey="category"
                    tick={{ fontSize: 10, fill: "#64748B", fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#94A3B8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) =>
                      v >= 1000000000
                        ? `${(v / 1000000000).toFixed(1)}M`
                        : v >= 1000000
                        ? `${(v / 1000000).toFixed(0)}jt`
                        : `${v}`
                    }
                  />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #E2E8F0",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                    formatter={(val: any) => formatRupiah(Number(val) || 0)}
                  />
                  <Bar dataKey="Nominal" fill="#10B981" radius={[6, 6, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">
                Belum ada data untuk ditampilkan pada grafik
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari judul pemasukan, nama pemberi, nomor SP2D/referensi..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer",
              showFilters
                ? "bg-[#531FFF]/10 text-[#531FFF] border-[#531FFF]/20"
                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
            )}
          >
            <Filter className="w-4 h-4" />
            Filter
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showFilters && "rotate-180")} />
          </button>

          {(searchQuery || selectedCategory !== "Semua" || selectedMethod !== "Semua" || selectedStatus !== "Semua" || dateFrom || dateTo) && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("Semua");
                setSelectedMethod("Semua");
                setSelectedStatus("Semua");
                setDateFrom("");
                setDateTo("");
                setCurrentPage(1);
              }}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-bold text-gray-500 bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>

        {/* Collapsible Filter Dropdowns */}
        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">
                Sumber / Kategori
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
              >
                <option value="Semua">Semua Kategori</option>
                {INCOME_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">
                Metode Bayar
              </label>
              <select
                value={selectedMethod}
                onChange={(e) => {
                  setSelectedMethod(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
              >
                <option value="Semua">Semua Metode</option>
                {INCOME_PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">
                Dari Tanggal
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">
                Sampai Tanggal
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/75 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Sumber & Judul Dana</th>
                <th className="py-3 px-4">Rekening Tujuan / Metode</th>
                <th className="py-3 px-4 text-right">Jumlah Dana (Rp)</th>
                <th className="py-3 px-4">Bukti / Dokumen</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {paginatedIncomes.length > 0 ? (
                paginatedIncomes.map((item) => {
                  const catCfg = INCOME_CATEGORIES.find((c) => c.id === item.category) || INCOME_CATEGORIES[8];

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Tanggal */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-gray-600 font-medium">
                        {new Date(item.receivedDate).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      {/* Judul & Sumber */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border",
                                catCfg.bg,
                                catCfg.color,
                                catCfg.border
                              )}
                            >
                              {item.category}
                            </span>
                            {item.referenceNumber && (
                              <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                Ref: {item.referenceNumber}
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-gray-900 leading-snug">{item.title}</p>
                          <p className="text-[11px] text-gray-500 flex items-center gap-1">
                            <span>Pemberi:</span>
                            <span className="font-medium text-gray-700">{item.sourceName}</span>
                          </p>
                        </div>
                      </td>

                      {/* Rekening Tujuan & Metode */}
                      <td className="py-3.5 px-4 text-gray-600">
                        <p className="font-medium text-gray-800 text-[11px] truncate max-w-[200px]">
                          {item.accountDestination}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5 font-medium">{item.paymentMethod}</p>
                      </td>

                      {/* Jumlah Nominal */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="text-sm font-black text-emerald-700 tracking-tight">
                          {formatRupiah(item.amount)}
                        </span>
                      </td>

                      {/* Bukti Dokumen */}
                      <td className="py-3.5 px-4">
                        {item.proofName ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            <FileText className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[120px]">{item.proofName}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[11px] italic">Tidak ada lampiran</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {item.status === "Diterima" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check className="w-3 h-3" /> Diterima
                          </span>
                        ) : item.status === "Pending" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" /> Menunggu
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-50 text-gray-500 border border-gray-200">
                            Dibatalkan
                          </span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setReceiptIncome(item)}
                            title="Lihat Kwitansi / Bukti Penerimaan"
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(item)}
                            title="Edit Data Pemasukan"
                            className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingId(item.id)}
                            title="Hapus Data"
                            className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                        <Landmark className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-gray-800">Belum Ada Catatan Dana Masuk</p>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Belum ada pemasukan non-SPP yang tercatat untuk periode Tahun Ajaran {activeAcademicYear} ({activeSemester}).
                      </p>
                      <button
                        onClick={handleOpenAdd}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#531FFF] text-white hover:bg-[#4314cc] transition-all cursor-pointer shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Catat Pemasukan Sekarang
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs text-gray-500 bg-gray-50/50">
            <span>
              Menampilkan {paginatedIncomes.length} dari {filteredIncomes.length} data pemasukan
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-gray-800">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════ MODAL: TAMBAH / EDIT DANA MASUK ═══════════════════════ */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl border border-gray-100 shadow-2xl overflow-hidden my-8 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {editingIncome ? "Edit Data Pemasukan Dana Sekolah" : "Catat Penerimaan Dana Masuk Baru"}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    Konteks Periode: T.A. {activeAcademicYear} ({activeSemester})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Context Banner */}
              <div className="bg-blue-50/70 rounded-xl p-3 border border-blue-200/80 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Pemasukan ini akan otomatis terikat ke <strong className="font-bold">Tahun Ajaran {activeAcademicYear} Semester {activeSemester}</strong> dan disimpan secara permanen di database tanpa bercampur dengan data tahun ajaran lainnya.
                </p>
              </div>

              {/* Row 1: Judul Pemasukan */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Nama / Judul Pemasukan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Pencairan Dana BOS Reguler Tahap II 2026"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  required
                />
              </div>

              {/* Row 2: Kategori & Pihak Pemberi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Sumber / Kategori Dana <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as IncomeCategory })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    {INCOME_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Instansi / Pihak Pemberi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Kemendikbudristek, Dinas Pendidikan, PT Telkom"
                    value={formData.sourceName}
                    onChange={(e) => setFormData({ ...formData, sourceName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Row 3: Nominal & Tanggal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Nominal Dana (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                      Rp
                    </span>
                    <input
                      type="text"
                      placeholder="0"
                      value={formData.amountStr}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-emerald-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      required
                    />
                  </div>
                  {formData.amount > 0 && (
                    <p className="text-[10px] text-gray-500 italic mt-1 leading-tight">
                      Terbilang: {angkaKeTerbilang(formData.amount)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Tanggal Penerimaan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.receivedDate}
                    onChange={(e) => setFormData({ ...formData, receivedDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Row 4: Rekening & Metode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Metode Penerimaan
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as IncomePaymentMethod })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    {INCOME_PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Rekening Tujuan / Kas
                  </label>
                  <select
                    value={formData.accountDestination}
                    onChange={(e) => setFormData({ ...formData, accountDestination: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    {PRESET_ACCOUNTS.map((acc) => (
                      <option key={acc} value={acc}>
                        {acc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 5: No Referensi & Dokumen */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    No. Referensi / No. SP2D / No. Bukti
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: SP2D/BOS/2026/08/042"
                    value={formData.referenceNumber}
                    onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Nama Dokumen / Lampiran Bukti
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: SP2D_BOS_Tahap2.pdf"
                    value={formData.proofName}
                    onChange={(e) => setFormData({ ...formData, proofName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Row 6: Keterangan / Peruntukan */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Keterangan & Rencana Alokasi Penggunaan Dana
                </label>
                <textarea
                  rows={3}
                  placeholder="Catatan detail mengenai peruntukan dana, pos mata anggaran, atau instruksi alokasi..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                />
              </div>

              {/* Status */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Status Penerimaan
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="Diterima"
                      checked={formData.status === "Diterima"}
                      onChange={() => setFormData({ ...formData, status: "Diterima" })}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Diterima (Kas Masuk Valid)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="Pending"
                      checked={formData.status === "Pending"}
                      onChange={() => setFormData({ ...formData, status: "Pending" })}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span>Menunggu Verifikasi / Pending</span>
                  </label>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Menyimpan...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingIncome ? "Simpan Perubahan" : "Simpan Penerimaan"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════ MODAL: BUKTI KWITANSI RESMI ═══════════════════════ */}
      {receiptIncome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-xl border border-gray-100 shadow-2xl overflow-hidden my-8 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold">Bukti Penerimaan Kas Resmi</h3>
                  <p className="text-[10px] text-slate-400">SMART SCHOOL OS — SISTEM AKUNTANSI SEKOLAH</p>
                </div>
              </div>
              <button
                onClick={() => setReceiptIncome(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Official Receipt Content */}
            <div className="p-6 space-y-5 text-gray-900" id="official-income-receipt">
              {/* Receipt Header Badge */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                <div>
                  <p className="text-xs font-mono font-bold text-gray-500">
                    NO: KW-IN/{receiptIncome.academicYear.replace("/", "-")}/{receiptIncome.id.slice(-6)}
                  </p>
                  <p className="text-lg font-black text-gray-900 mt-0.5">KWITANSI DANA MASUK</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                    {receiptIncome.category}
                  </span>
                  <p className="text-[10px] text-gray-400 font-semibold mt-1">
                    T.A. {receiptIncome.academicYear} ({receiptIncome.semester})
                  </p>
                </div>
              </div>

              {/* Body Details */}
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-3 py-1.5 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Telah Diterima Dari</span>
                  <span className="col-span-2 font-bold text-gray-900">{receiptIncome.sourceName}</span>
                </div>

                <div className="grid grid-cols-3 py-1.5 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Uraian / Judul</span>
                  <span className="col-span-2 font-semibold text-gray-800">{receiptIncome.title}</span>
                </div>

                <div className="grid grid-cols-3 py-1.5 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Nominal Uang</span>
                  <span className="col-span-2 text-base font-black text-emerald-700">
                    {formatRupiah(receiptIncome.amount)}
                  </span>
                </div>

                <div className="grid grid-cols-3 py-1.5 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Terbilang</span>
                  <span className="col-span-2 italic font-semibold text-gray-700 bg-gray-50 p-2 rounded-lg">
                    "{angkaKeTerbilang(receiptIncome.amount)}"
                  </span>
                </div>

                <div className="grid grid-cols-3 py-1.5 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Metode & Rekening</span>
                  <div className="col-span-2 font-medium text-gray-700 space-y-0.5">
                    <p>{receiptIncome.paymentMethod}</p>
                    <p className="text-[11px] text-gray-500 font-mono">{receiptIncome.accountDestination}</p>
                  </div>
                </div>

                {receiptIncome.referenceNumber && (
                  <div className="grid grid-cols-3 py-1.5 border-b border-gray-100">
                    <span className="text-gray-500 font-medium">No. SP2D / Bukti</span>
                    <span className="col-span-2 font-mono font-bold text-gray-800">
                      {receiptIncome.referenceNumber}
                    </span>
                  </div>
                )}

                {receiptIncome.description && (
                  <div className="grid grid-cols-3 py-1.5 border-b border-gray-100">
                    <span className="text-gray-500 font-medium">Keterangan Alokasi</span>
                    <span className="col-span-2 text-gray-700 leading-relaxed">
                      {receiptIncome.description}
                    </span>
                  </div>
                )}

                {receiptIncome.proofName && (
                  <div className="grid grid-cols-3 py-1.5 border-b border-gray-100">
                    <span className="text-gray-500 font-medium">Dokumen Terlampir</span>
                    <span className="col-span-2 text-blue-700 font-medium flex items-center gap-1">
                      <FileCheck className="w-3.5 h-3.5" />
                      {receiptIncome.proofName}
                    </span>
                  </div>
                )}
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-4 pt-4 text-center text-xs">
                <div>
                  <p className="text-[10px] text-gray-400 font-medium">Pihak Penyetor / Instansi</p>
                  <div className="h-16 flex items-end justify-center">
                    <p className="font-bold text-gray-800 underline underline-offset-4">{receiptIncome.sourceName}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-medium">
                    Bendahara / Penerima Sekolah, {new Date(receiptIncome.receivedDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                  <div className="h-16 flex flex-col items-center justify-end">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mb-1">
                      <CheckCircle2 className="w-3 h-3" /> Terverifikasi Sistem
                    </span>
                    <p className="font-bold text-gray-800 underline underline-offset-4">
                      {receiptIncome.recordedBy || "Bendahara Sekolah"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => setReceiptIncome(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Tutup
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#531FFF] hover:bg-[#4314cc] text-white shadow-md shadow-[#531FFF]/20 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Cetak Kwitansi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════ MODAL: KONFIRMASI HAPUS ═══════════════════════ */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-gray-100 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Hapus Data Pemasukan?</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Tindakan ini akan menghapus catatan penerimaan dana dari database. Pastikan tidak ada rekap kas atau pembukuan resmi yang bergantung pada catatan ini.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Batalkan
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition-all cursor-pointer"
              >
                Ya, Hapus Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
