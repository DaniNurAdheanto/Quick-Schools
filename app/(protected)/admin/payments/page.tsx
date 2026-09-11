"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  CreditCard,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Printer,
  FileText,
  X,
  Loader2,
  Edit2,
  Trash2,
  Copy,
  Smartphone,
  LayoutGrid,
  List,
  Sparkles,
  AlertTriangle,
  Calendar,
  GraduationCap,
  RotateCcw,
  Receipt
} from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { useUnifiedStudents } from "@/hooks/use-unified-students";
import {
  SPPBill,
  PaymentStatus,
  SPP_MONTHS,
  PAYMENT_METHODS,
  formatRupiah,
  generateInvoiceNo,
  useSPPPayments,
} from "@/lib/spp-payments";

export default function PaymentsPage() {
  const toast = useToast();
  const showSuccess = toast?.showSuccess;
  const showError = toast?.showError;
  const showInfo = toast?.showInfo;

  // SPP hook & data
  const { bills, loading: billsLoading, createBill, bulkCreateBills, updateBill, recordPayment, deleteBill } =
    useSPPPayments();
  const { students } = useUnifiedStudents();

  // Auth & Role
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("admin");
  const [matchedStudent, setMatchedStudent] = useState<any | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>("Semua");
  const [selectedStatus, setSelectedStatus] = useState<string>("Semua");
  const [selectedClass, setSelectedClass] = useState<string>("Semua");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [isRecordPayModalOpen, setIsRecordPayModalOpen] = useState(false);
  const [isDetailInvoiceOpen, setIsDetailInvoiceOpen] = useState(false);
  const [isPayNowModalOpen, setIsPayNowModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Selected item state for modals
  const [activeBill, setActiveBill] = useState<SPPBill | null>(null);

  // Delete Confirmation Modal State
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    bill: SPPBill | null;
    loading: boolean;
  }>({
    isOpen: false,
    bill: null,
    loading: false,
  });

  // Forms state
  const [singleFormData, setSingleFormData] = useState({
    studentId: "",
    periodMonth: "September 2026",
    amount: 500000,
    dueDate: "2026-09-10",
    status: "Belum Dibayar" as PaymentStatus,
    notes: "Tagihan SPP Bulanan",
  });

  const [bulkFormData, setBulkFormData] = useState({
    classId: "Semua",
    periodMonth: "September 2026",
    amount: 500000,
    dueDate: "2026-09-10",
    notes: "Tagihan SPP Bulanan Terpadu",
  });

  const [payFormData, setPayFormData] = useState({
    paidAt: new Date().toISOString().split("T")[0],
    paymentMethod: "Transfer Bank BCA",
    paymentReference: "",
    notes: "Lunas",
  });

  const [editFormData, setEditFormData] = useState({
    amount: 500000,
    dueDate: "2026-09-10",
    status: "Belum Dibayar" as PaymentStatus,
    notes: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [copiedVa, setCopiedVa] = useState(false);

  // Role flags
  const isStudentOrParent = userRole === "siswa" || userRole === "student" || userRole === "orang-tua";

  // Auth detection & match student if role is student / parent
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          const snap = await getDoc(doc(db, "users", u.uid));
          if (snap.exists()) {
            const data = snap.data();
            const r = (data.role || "admin").toLowerCase();
            const normRole = r === "student" ? "siswa" : r;
            setUserRole(normRole);
            setCurrentUser({ uid: u.uid, email: u.email, ...data });

            // If student or parent, match their student data
            if (normRole === "siswa" || normRole === "orang-tua") {
              const matched = students.find(
                (s) =>
                  s.uid === u.uid ||
                  s.id === u.uid ||
                  (s.email && s.email.toLowerCase() === u.email?.toLowerCase()) ||
                  (data.studentId && s.id === data.studentId)
              );
              if (matched) {
                setMatchedStudent(matched);
              }
            }
          }
        } catch (err) {
          console.warn("User auth fetch error in payments:", err);
        }
      }
    });

    return () => unsubAuth();
  }, [students]);

  // Extract unique classes for filter
  const classList = useMemo(() => {
    const set = new Set<string>();
    bills.forEach((b) => {
      if (b.classId) set.add(b.classId);
    });
    students.forEach((s) => {
      if (s.className) set.add(s.className);
      else if (s.classId) set.add(s.classId);
    });
    return Array.from(set).sort();
  }, [bills, students]);

  // Scoped bills: If student/parent, only show bills for their student
  const scopedBills = useMemo(() => {
    if (!isStudentOrParent) return bills;

    if (matchedStudent) {
      return bills.filter(
        (b) =>
          b.studentId === matchedStudent.id ||
          b.nisn === matchedStudent.nisn ||
          b.studentName?.toLowerCase() === matchedStudent.name?.toLowerCase()
      );
    }

    // fallback matching email
    if (currentUser?.email) {
      return bills.filter((b) => b.studentId === currentUser.uid || b.studentName === currentUser.name);
    }

    return bills;
  }, [bills, isStudentOrParent, matchedStudent, currentUser]);

  // Filtered bills based on search, month, status, class
  const filteredBills = useMemo(() => {
    return scopedBills.filter((bill) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSearch =
          bill.studentName?.toLowerCase().includes(q) ||
          bill.invoiceNo?.toLowerCase().includes(q) ||
          bill.nisn?.toLowerCase().includes(q) ||
          bill.classId?.toLowerCase().includes(q);
        if (!matchSearch) return false;
      }

      // 2. Month Filter
      if (selectedMonth !== "Semua" && bill.periodMonth !== selectedMonth) {
        return false;
      }

      // 3. Status Filter
      if (selectedStatus !== "Semua" && bill.status !== selectedStatus) {
        return false;
      }

      // 4. Class Filter
      if (selectedClass !== "Semua" && bill.classId !== selectedClass) {
        return false;
      }

      return true;
    });
  }, [scopedBills, searchQuery, selectedMonth, selectedStatus, selectedClass]);

  // Metrics Summary
  const metrics = useMemo(() => {
    let totalNominal = 0;
    let lunasNominal = 0;
    let unpaidNominal = 0;
    let overdueNominal = 0;

    let totalCount = scopedBills.length;
    let lunasCount = 0;
    let unpaidCount = 0;
    let overdueCount = 0;

    scopedBills.forEach((b) => {
      totalNominal += b.amount || 0;
      if (b.status === "Lunas") {
        lunasNominal += b.amount || 0;
        lunasCount++;
      } else if (b.status === "Terlambat") {
        overdueNominal += b.amount || 0;
        overdueCount++;
      } else {
        // Belum Dibayar or Menunggu Pembayaran
        unpaidNominal += b.amount || 0;
        unpaidCount++;
      }
    });

    const percentLunas = totalNominal > 0 ? Math.round((lunasNominal / totalNominal) * 100) : 0;

    return {
      totalNominal,
      lunasNominal,
      unpaidNominal,
      overdueNominal,
      totalCount,
      lunasCount,
      unpaidCount,
      overdueCount,
      percentLunas,
    };
  }, [scopedBills]);

  // Handlers for Admin
  const handleOpenAddModal = () => {
    setIsBulkMode(false);
    setSingleFormData({
      studentId: students[0]?.id || "",
      periodMonth: "September 2026",
      amount: 500000,
      dueDate: "2026-09-10",
      status: "Belum Dibayar",
      notes: "Tagihan SPP Bulanan",
    });
    setBulkFormData({
      classId: "Semua",
      periodMonth: "September 2026",
      amount: 500000,
      dueDate: "2026-09-10",
      notes: "Tagihan SPP Bulanan Terpadu",
    });
    setIsAddModalOpen(true);
  };

  const handleSubmitSingleBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleFormData.studentId) {
      showError?.("Pilih siswa terlebih dahulu");
      return;
    }

    const selectedStd = students.find((s) => s.id === singleFormData.studentId);
    if (!selectedStd) {
      showError?.("Data siswa tidak ditemukan");
      return;
    }

    setSubmitting(true);
    try {
      const invoiceNo = generateInvoiceNo(singleFormData.periodMonth, bills.length + 1);
      await createBill({
        invoiceNo,
        studentId: selectedStd.id,
        studentName: selectedStd.name || selectedStd.fullName,
        nisn: selectedStd.nisn || selectedStd.nis || "-",
        classId: selectedStd.className || selectedStd.classId || "10 MIPA 1",
        periodMonth: singleFormData.periodMonth,
        periodYear: singleFormData.periodMonth.split(" ")[1] || "2026",
        academicYear: "2026/2027",
        amount: Number(singleFormData.amount),
        dueDate: singleFormData.dueDate,
        status: singleFormData.status,
        notes: singleFormData.notes,
      });

      showSuccess?.(`Tagihan SPP untuk ${selectedStd.name} berhasil dibuat!`);
      setIsAddModalOpen(false);
    } catch (err) {
      showError?.("Gagal membuat tagihan SPP");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitBulkBills = async (e: React.FormEvent) => {
    e.preventDefault();
    // Filter target students
    const targetStudents = students.filter((s) => {
      if (bulkFormData.classId === "Semua") return true;
      return (s.className || s.classId) === bulkFormData.classId;
    });

    if (targetStudents.length === 0) {
      showError?.("Tidak ada siswa ditemukan pada kelas ini");
      return;
    }

    setSubmitting(true);
    try {
      const newBills = targetStudents.map((std, idx) => ({
        invoiceNo: generateInvoiceNo(bulkFormData.periodMonth, bills.length + idx + 1),
        studentId: std.id,
        studentName: std.name || std.fullName,
        nisn: std.nisn || std.nis || "-",
        classId: std.className || std.classId || "10 MIPA 1",
        periodMonth: bulkFormData.periodMonth,
        periodYear: bulkFormData.periodMonth.split(" ")[1] || "2026",
        academicYear: "2026/2027",
        amount: Number(bulkFormData.amount),
        dueDate: bulkFormData.dueDate,
        status: "Belum Dibayar" as PaymentStatus,
        notes: bulkFormData.notes,
      }));

      await bulkCreateBills(newBills);
      showSuccess?.(`Berhasil menerbitkan ${newBills.length} tagihan SPP massal untuk ${bulkFormData.classId}!`);
      setIsAddModalOpen(false);
    } catch (err) {
      showError?.("Gagal menerbitkan tagihan massal");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenRecordPayment = (bill: SPPBill) => {
    setActiveBill(bill);
    setPayFormData({
      paidAt: new Date().toISOString().split("T")[0],
      paymentMethod: bill.paymentMethod || "Transfer Bank BCA",
      paymentReference: `REF-${Date.now().toString().slice(-6)}`,
      notes: "Pembayaran lunas terverifikasi",
    });
    setIsRecordPayModalOpen(true);
  };

  const handleSubmitRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBill) return;

    setSubmitting(true);
    try {
      await recordPayment(activeBill.id, payFormData);
      showSuccess?.(`Pembayaran untuk invoice ${activeBill.invoiceNo} berhasil dicatat LUNAS!`);
      setIsRecordPayModalOpen(false);
    } catch (err) {
      showError?.("Gagal mencatat pembayaran");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditModal = (bill: SPPBill) => {
    setActiveBill(bill);
    setEditFormData({
      amount: bill.amount,
      dueDate: bill.dueDate,
      status: bill.status,
      notes: bill.notes || "",
    });
    setIsEditModalOpen(true);
  };

  const handleSubmitEditBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBill) return;

    setSubmitting(true);
    try {
      await updateBill(activeBill.id, {
        amount: Number(editFormData.amount),
        dueDate: editFormData.dueDate,
        status: editFormData.status,
        notes: editFormData.notes,
      });
      showSuccess?.("Data tagihan SPP berhasil diperbarui!");
      setIsEditModalOpen(false);
    } catch (err) {
      showError?.("Gagal memperbarui tagihan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDeleteModal = (bill: SPPBill) => {
    setDeleteModalState({
      isOpen: true,
      bill,
      loading: false,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalState.bill) return;

    setDeleteModalState((prev) => ({ ...prev, loading: true }));
    try {
      await deleteBill(deleteModalState.bill.id);
      showSuccess?.(`Tagihan ${deleteModalState.bill.invoiceNo} berhasil dihapus dari database.`);
      setDeleteModalState({ isOpen: false, bill: null, loading: false });
    } catch (err) {
      showError?.("Gagal menghapus tagihan");
      setDeleteModalState((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleViewInvoice = (bill: SPPBill) => {
    setActiveBill(bill);
    setIsDetailInvoiceOpen(true);
  };

  const handleOpenPayNow = (bill: SPPBill) => {
    setActiveBill(bill);
    setCopiedVa(false);
    setIsPayNowModalOpen(true);
  };

  const handleCopyVa = (vaNumber: string) => {
    navigator.clipboard.writeText(vaNumber);
    setCopiedVa(true);
    showInfo?.(`Nomor Virtual Account ${vaNumber} disalin ke clipboard!`);
    setTimeout(() => setCopiedVa(false), 3000);
  };

  // Status Badge Component
  const renderStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case "Lunas":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Lunas
          </span>
        );
      case "Menunggu Pembayaran":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Menunggu Pembayaran
          </span>
        );
      case "Terlambat":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            Terlambat
          </span>
        );
      case "Belum Dibayar":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            Belum Dibayar
          </span>
        );
    }
  };

  // Helper for student initials & colors
  const getInitials = (name: string) => {
    if (!name) return "S";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-purple-100 text-[#531FFF] border-purple-200",
      "bg-blue-100 text-blue-700 border-blue-200",
      "bg-emerald-100 text-emerald-700 border-emerald-200",
      "bg-amber-100 text-amber-700 border-amber-200",
      "bg-rose-100 text-rose-700 border-rose-200",
      "bg-indigo-100 text-indigo-700 border-indigo-200",
      "bg-cyan-100 text-cyan-700 border-cyan-200",
    ];
    let hash = 0;
    for (let i = 0; i < (name || "").length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto w-full space-y-6 pb-20 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* 1. TOP PAGE HEADER & ACTION CONTROLS                                     */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 md:p-6 rounded-xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center shrink-0 shadow-2xs">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                Pembayaran SPP Sekolah
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#531FFF]/10 text-[#531FFF] border border-[#531FFF]/20">
                T.A 2026/2027
              </span>
            </div>
            <p className="text-gray-500 text-xs md:text-sm mt-0.5 font-medium">
              {isStudentOrParent
                ? `Status pembayaran tagihan SPP dan riwayat kuitansi untuk ${matchedStudent ? matchedStudent.name : "Siswa"}.`
                : "Kelola tagihan SPP bulanan siswa, penerbitan invoice massal, dan rekapitulasi pembayaran kasir."}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-lg shadow-2xs transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-gray-600" />
            <span>Cetak Rekap</span>
          </button>

          {!isStudentOrParent && (
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-[#531FFF] hover:bg-[#4216d6] rounded-lg shadow-sm shadow-[#531FFF]/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Tagihan SPP</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SUMMARY METRICS CARDS (INTERACTIVE QUICK FILTERS)                      */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Tagihan */}
        <div
          onClick={() => setSelectedStatus("Semua")}
          className={cn(
            "bg-white p-5 rounded-xl border transition-all cursor-pointer shadow-xs hover:shadow-md relative overflow-hidden group",
            selectedStatus === "Semua"
              ? "border-[#531FFF] ring-2 ring-[#531FFF]/20 bg-purple-50/20"
              : "border-gray-100 hover:border-purple-200"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Tagihan</span>
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-[#531FFF] flex items-center justify-center group-hover:scale-105 transition-transform">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-gray-900 tracking-tight font-mono">{formatRupiah(metrics.totalNominal)}</div>
            <div className="flex items-center justify-between text-xs text-gray-500 font-medium mt-1">
              <span>{metrics.totalCount} tagihan {isStudentOrParent ? "tercatat" : "seluruh siswa"}</span>
              <span className="text-[10px] text-[#531FFF] font-bold group-hover:underline">Semua</span>
            </div>
          </div>
        </div>

        {/* Card 2: Sudah Dibayar (Lunas) */}
        <div
          onClick={() => setSelectedStatus(selectedStatus === "Lunas" ? "Semua" : "Lunas")}
          className={cn(
            "bg-white p-5 rounded-xl border transition-all cursor-pointer shadow-xs hover:shadow-md relative overflow-hidden group",
            selectedStatus === "Lunas"
              ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20"
              : "border-gray-100 hover:border-emerald-200"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Sudah Dibayar</span>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-700 tracking-tight font-mono">{formatRupiah(metrics.lunasNominal)}</div>
            <div className="flex items-center justify-between text-xs mt-1.5">
              <span className="text-emerald-700 font-bold">{metrics.lunasCount} Tagihan Lunas</span>
              <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                {metrics.percentLunas}% Terkumpul
              </span>
            </div>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(metrics.percentLunas, 100)}%` }}
            />
          </div>
        </div>

        {/* Card 3: Belum Dibayar / Menunggu */}
        <div
          onClick={() => setSelectedStatus(selectedStatus === "Belum Dibayar" ? "Semua" : "Belum Dibayar")}
          className={cn(
            "bg-white p-5 rounded-xl border transition-all cursor-pointer shadow-xs hover:shadow-md relative overflow-hidden group",
            selectedStatus === "Belum Dibayar"
              ? "border-slate-500 ring-2 ring-slate-500/20 bg-slate-50/40"
              : "border-gray-100 hover:border-slate-300"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Belum Dibayar</span>
            <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-800 tracking-tight font-mono">{formatRupiah(metrics.unpaidNominal)}</div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium mt-1">
              <span>{metrics.unpaidCount} tagihan belum lunas</span>
              <span className="text-[10px] text-slate-600 font-bold group-hover:underline">Filter</span>
            </div>
          </div>
        </div>

        {/* Card 4: Jatuh Tempo / Terlambat */}
        <div
          onClick={() => setSelectedStatus(selectedStatus === "Terlambat" ? "Semua" : "Terlambat")}
          className={cn(
            "bg-white p-5 rounded-xl border transition-all cursor-pointer shadow-xs hover:shadow-md relative overflow-hidden group",
            selectedStatus === "Terlambat"
              ? "border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/30"
              : "border-gray-100 hover:border-rose-200"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Jatuh Tempo</span>
            <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-700 tracking-tight font-mono">{formatRupiah(metrics.overdueNominal)}</div>
            <div className="flex items-center justify-between text-xs font-medium mt-1">
              <span className="text-rose-600">{metrics.overdueCount} tagihan lewat batas</span>
              <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">Perlu Cek</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. FILTER & TOOLBAR SECTION                                               */}
      {/* ========================================================================= */}
      <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-3.5">
        {/* Quick Filter Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-b border-gray-100">
          <button
            onClick={() => setSelectedStatus("Semua")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5",
              selectedStatus === "Semua"
                ? "bg-[#531FFF] text-white shadow-2xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            <span>Semua Tagihan</span>
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px]",
                selectedStatus === "Semua" ? "bg-white/20 text-white" : "bg-white text-gray-700 font-bold"
              )}
            >
              {metrics.totalCount}
            </span>
          </button>

          <button
            onClick={() => setSelectedStatus("Lunas")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5",
              selectedStatus === "Lunas"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span>Lunas</span>
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px]",
                selectedStatus === "Lunas" ? "bg-white/20 text-white" : "bg-white text-emerald-800 font-bold"
              )}
            >
              {metrics.lunasCount}
            </span>
          </button>

          <button
            onClick={() => setSelectedStatus("Belum Dibayar")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5",
              selectedStatus === "Belum Dibayar"
                ? "bg-slate-700 text-white shadow-2xs"
                : "bg-gray-100 text-gray-600 hover:bg-slate-200"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
            <span>Belum Dibayar</span>
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px]",
                selectedStatus === "Belum Dibayar" ? "bg-white/20 text-white" : "bg-white text-slate-800 font-bold"
              )}
            >
              {metrics.unpaidCount}
            </span>
          </button>

          <button
            onClick={() => setSelectedStatus("Terlambat")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5",
              selectedStatus === "Terlambat"
                ? "bg-rose-600 text-white shadow-2xs"
                : "bg-gray-100 text-gray-600 hover:bg-rose-50 hover:text-rose-700"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
            <span>Terlambat</span>
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px]",
                selectedStatus === "Terlambat" ? "bg-white/20 text-white" : "bg-white text-rose-800 font-bold"
              )}
            >
              {metrics.overdueCount}
            </span>
          </button>
        </div>

        {/* Search, Dropdowns, and View Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan nama siswa, NISN, atau no invoice..."
              className="w-full pl-9 pr-9 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Periode Bulan */}
            <div className="flex items-center gap-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1">
              <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-bold text-gray-700 outline-none cursor-pointer py-1"
              >
                <option value="Semua">Semua Periode</option>
                {SPP_MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Kelas Filter (Admin Only) */}
            {!isStudentOrParent && (
              <div className="flex items-center gap-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1">
                <GraduationCap className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="bg-transparent text-xs font-bold text-gray-700 outline-none cursor-pointer py-1"
                >
                  <option value="Semua">Semua Kelas</option>
                  {classList.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Reset Filter Button if active */}
            {(selectedMonth !== "Semua" || selectedStatus !== "Semua" || selectedClass !== "Semua" || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedMonth("Semua");
                  setSelectedStatus("Semua");
                  setSelectedClass("Semua");
                  setSearchQuery("");
                }}
                className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                title="Reset Semua Filter"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50 p-0.5 ml-auto sm:ml-0">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={cn(
                  "p-1.5 rounded transition-all cursor-pointer",
                  viewMode === "table" ? "bg-white shadow-2xs text-[#531FFF] font-bold" : "text-gray-500 hover:text-gray-800"
                )}
                title="Tampilan Tabel"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={cn(
                  "p-1.5 rounded transition-all cursor-pointer",
                  viewMode === "cards" ? "bg-white shadow-2xs text-[#531FFF] font-bold" : "text-gray-500 hover:text-gray-800"
                )}
                title="Tampilan Kartu"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MAIN BILLS LIST (TABLE OR CARDS)                                       */}
      {/* ========================================================================= */}
      {billsLoading ? (
        <div className="p-12 text-center bg-white rounded-xl border border-gray-100 shadow-xs">
          <Loader2 className="w-8 h-8 text-[#531FFF] animate-spin mx-auto mb-2" />
          <p className="text-xs text-gray-500 font-semibold">Memuat data tagihan SPP...</p>
        </div>
      ) : filteredBills.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-gray-100 shadow-xs space-y-3">
          <div className="w-14 h-14 rounded-full bg-purple-50 text-[#531FFF] flex items-center justify-center mx-auto">
            <CreditCard className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Belum Ada Tagihan SPP</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
              {isStudentOrParent
                ? "Saat ini tidak ada tagihan SPP yang sesuai dengan filter atau seluruh tagihan telah lunas."
                : "Belum ada tagihan SPP pada filter yang dipilih. Silakan buat tagihan baru atau terbitkan tagihan massal."}
            </p>
          </div>
          {!isStudentOrParent && (
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#531FFF] hover:bg-[#4216d6] rounded-lg shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Tagihan Pertama</span>
            </button>
          )}
        </div>
      ) : viewMode === "table" ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left divide-y divide-gray-100 text-xs">
              <thead className="bg-gray-50/80 font-bold text-gray-700 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center">No</th>
                  <th className="py-3.5 px-4">No. Invoice</th>
                  <th className="py-3.5 px-4">Siswa & Kelas</th>
                  <th className="py-3.5 px-4">Periode</th>
                  <th className="py-3.5 px-4">Nominal</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Tgl & Metode Bayar</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {filteredBills.map((bill, idx) => (
                  <tr key={bill.id} className="hover:bg-gray-50/70 transition-colors">
                    {/* No */}
                    <td className="py-4 px-4 text-center text-gray-400 font-bold">{idx + 1}</td>

                    {/* Invoice No */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-[#531FFF] shrink-0" />
                        <span className="font-mono font-bold text-[#531FFF]">{bill.invoiceNo}</span>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5 pl-5">Jatuh Tempo: {bill.dueDate}</div>
                    </td>

                    {/* Student & Class */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border shrink-0",
                            getAvatarColor(bill.studentName)
                          )}
                        >
                          {getInitials(bill.studentName)}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 text-xs">{bill.studentName}</div>
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5">
                            <span className="bg-gray-100 px-1.5 py-0.2 rounded text-[10px] font-semibold text-gray-700">
                              {bill.classId}
                            </span>
                            <span>• NISN: {bill.nisn || "-"}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Period */}
                    <td className="py-4 px-4">
                      <span className="font-bold text-gray-800">{bill.periodMonth}</span>
                    </td>

                    {/* Nominal */}
                    <td className="py-4 px-4 font-mono font-black text-gray-900 text-sm">
                      {formatRupiah(bill.amount)}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">{renderStatusBadge(bill.status)}</td>

                    {/* Paid Date & Method */}
                    <td className="py-4 px-4">
                      {bill.status === "Lunas" ? (
                        <div>
                          <div className="font-bold text-gray-900 text-[11px]">{bill.paidAt || "-"}</div>
                          <div className="text-[10px] text-emerald-700 font-semibold">{bill.paymentMethod || "Transfer"}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-[11px] font-medium">-</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Detail / Invoice */}
                        <button
                          onClick={() => handleViewInvoice(bill)}
                          className="px-2.5 py-1.5 text-[11px] font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                          title="Lihat Invoice & Kuitansi"
                        >
                          <FileText className="w-3 h-3 text-gray-500" />
                          <span>Invoice</span>
                        </button>

                        {/* If Student / Parent & Unpaid -> Bayar Sekarang */}
                        {isStudentOrParent && bill.status !== "Lunas" && (
                          <button
                            onClick={() => handleOpenPayNow(bill)}
                            className="px-3 py-1.5 text-[11px] font-bold text-white bg-[#531FFF] hover:bg-[#4216d6] rounded-lg shadow-xs transition-colors cursor-pointer"
                          >
                            Bayar
                          </button>
                        )}

                        {/* Admin Action: Catat Pembayaran */}
                        {!isStudentOrParent && bill.status !== "Lunas" && (
                          <button
                            onClick={() => handleOpenRecordPayment(bill)}
                            className="px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                            title="Catat Pelunasan"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Catat Lunas</span>
                          </button>
                        )}

                        {/* Admin Action: Edit */}
                        {!isStudentOrParent && (
                          <button
                            onClick={() => handleOpenEditModal(bill)}
                            className="p-1.5 text-gray-400 hover:text-[#531FFF] hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Tagihan"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Admin Action: Delete */}
                        {!isStudentOrParent && (
                          <button
                            onClick={() => handleOpenDeleteModal(bill)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Tagihan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBills.map((bill) => (
            <div
              key={bill.id}
              className="bg-white rounded-xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-5 space-y-4 hover:border-purple-200 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-[#531FFF] shrink-0" />
                    <div>
                      <span className="font-mono text-xs font-bold text-[#531FFF]">{bill.invoiceNo}</span>
                      <p className="text-[10px] text-gray-400">Jatuh Tempo: {bill.dueDate}</p>
                    </div>
                  </div>
                  <div>{renderStatusBadge(bill.status)}</div>
                </div>

                <div className="pt-3 flex items-start gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-xs font-black border shrink-0",
                      getAvatarColor(bill.studentName)
                    )}
                  >
                    {getInitials(bill.studentName)}
                  </div>
                  <div className="space-y-1 flex-1">
                    <h4 className="font-bold text-sm text-gray-900">{bill.studentName}</h4>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="bg-gray-100 px-2 py-0.5 rounded text-[10px] font-bold text-gray-700">
                        {bill.classId}
                      </span>
                      <span>NISN: {bill.nisn || "-"}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-baseline justify-between pt-3 border-t border-gray-50 mt-3">
                  <span className="text-xs text-gray-500 font-medium">Periode: <strong>{bill.periodMonth}</strong></span>
                  <span className="font-mono text-base font-black text-gray-900">{formatRupiah(bill.amount)}</span>
                </div>

                {bill.status === "Lunas" && bill.paidAt && (
                  <div className="mt-3 p-2 bg-emerald-50/70 border border-emerald-200 rounded-lg text-[11px] text-emerald-800 flex items-center justify-between">
                    <span>Lunas: <strong>{bill.paidAt}</strong></span>
                    <span className="font-bold">{bill.paymentMethod || "Transfer"}</span>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleViewInvoice(bill)}
                  className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5 text-gray-500" />
                  <span>Detail Invoice</span>
                </button>

                <div className="flex items-center gap-1.5">
                  {isStudentOrParent && bill.status !== "Lunas" && (
                    <button
                      onClick={() => handleOpenPayNow(bill)}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#531FFF] hover:bg-[#4216d6] rounded-lg shadow-xs cursor-pointer"
                    >
                      Bayar Sekarang
                    </button>
                  )}

                  {!isStudentOrParent && bill.status !== "Lunas" && (
                    <button
                      onClick={() => handleOpenRecordPayment(bill)}
                      className="px-2.5 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer"
                    >
                      Catat Lunas
                    </button>
                  )}

                  {!isStudentOrParent && (
                    <>
                      <button
                        onClick={() => handleOpenEditModal(bill)}
                        className="p-1.5 text-gray-400 hover:text-[#531FFF] hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Tagihan"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenDeleteModal(bill)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Tagihan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL DETAIL INVOICE & KUITANSI (PRINTABLE)                             */}
      {/* ========================================================================= */}
      {isDetailInvoiceOpen && activeBill && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            {/* Header Toolbar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/60 no-print">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#531FFF]" />
                <h3 className="text-sm font-bold text-gray-900">
                  {activeBill.status === "Lunas" ? "Kuitansi Resmi Pembayaran SPP" : "Surat Tagihan Invoice SPP"}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gray-900 hover:bg-black rounded-lg transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Cetak PDF
                </button>
                <button
                  onClick={() => setIsDetailInvoiceOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Content Body */}
            <div className="p-8 overflow-y-auto space-y-6 text-xs text-gray-800 print-area">
              {/* School Letterhead */}
              <div className="flex items-center justify-between border-b-2 border-gray-900 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-[#531FFF] text-white flex items-center justify-center font-black text-xl">
                    QS
                  </div>
                  <div>
                    <h2 className="text-base font-black text-gray-900 uppercase">SMA GARUDA NUSANTARA SMART SCHOOL</h2>
                    <p className="text-[11px] text-gray-600">NPSN: 20194820 • Terakreditasi A (Unggul)</p>
                    <p className="text-[10px] text-gray-500">Jl. Pendidikan No. 45, Kompleks Akademika, Jakarta Selatan</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-gray-900 text-sm">{activeBill.invoiceNo}</div>
                  <div className="mt-1">{renderStatusBadge(activeBill.status)}</div>
                </div>
              </div>

              {/* Billing Info Grid */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Ditagihkan Kepada:</span>
                  <div className="font-bold text-sm text-gray-900 mt-1">{activeBill.studentName}</div>
                  <div className="text-gray-600 text-xs">NISN: {activeBill.nisn || "-"}</div>
                  <div className="text-gray-600 text-xs">Kelas: {activeBill.classId}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Rincian Periode:</span>
                  <div className="font-bold text-sm text-[#531FFF] mt-1">{activeBill.periodMonth}</div>
                  <div className="text-gray-600 text-xs">Tahun Ajaran: {activeBill.academicYear}</div>
                  <div className="text-gray-600 text-xs">Batas Jatuh Tempo: {activeBill.dueDate}</div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left divide-y divide-gray-200">
                  <thead className="bg-gray-100 font-bold text-gray-700">
                    <tr>
                      <th className="py-2.5 px-4">Deskripsi Pembayaran</th>
                      <th className="py-2.5 px-4 text-center">Periode</th>
                      <th className="py-2.5 px-4 text-right">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900">Iuran Sumbangan Pembinaan Pendidikan (SPP)</div>
                        <div className="text-[11px] text-gray-500">{activeBill.notes || "Biaya operasional & fasilitas pendidikan"}</div>
                      </td>
                      <td className="py-3 px-4 text-center font-semibold">{activeBill.periodMonth}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                        {formatRupiah(activeBill.amount)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-gray-50 font-bold">
                    <tr>
                      <td colSpan={2} className="py-3 px-4 text-right text-gray-700">
                        TOTAL TAGIHAN:
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-base text-[#531FFF]">
                        {formatRupiah(activeBill.amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Payment Details if Paid */}
              {activeBill.status === "Lunas" && (
                <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1 text-emerald-950">
                  <div className="font-bold text-xs flex items-center gap-1.5 text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" />
                    BUKTI PEMBAYARAN TELAH SAH & DIVERIFIKASI
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      Tanggal Pelunasan: <strong>{activeBill.paidAt || "-"}</strong>
                    </div>
                    <div>
                      Metode Pembayaran: <strong>{activeBill.paymentMethod || "Transfer Bank"}</strong>
                    </div>
                    <div>
                      Nomor Referensi: <strong className="font-mono">{activeBill.paymentReference || "REF-AUTO"}</strong>
                    </div>
                    <div>
                      Pencatat: <strong>Bagian Keuangan Sekolah</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Signatures */}
              <div className="grid grid-cols-2 text-center pt-8 border-t border-gray-200 text-xs">
                <div>
                  <p className="text-gray-500">Siswa / Orang Tua Siswa</p>
                  <div className="h-16" />
                  <p className="font-bold border-b border-gray-400 inline-block px-4">{activeBill.studentName}</p>
                </div>
                <div>
                  <p className="text-gray-500">Bendahara / Kasir Sekolah</p>
                  <div className="h-16" />
                  <p className="font-bold border-b border-gray-400 inline-block px-4">Siti Aminah, S.E.</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end px-6 py-3 bg-gray-50 border-t border-gray-100 no-print">
              <button
                onClick={() => setIsDetailInvoiceOpen(false)}
                className="px-4 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL CATAT PEMBAYARAN (ADMIN ONLY)                                    */}
      {/* ========================================================================= */}
      {isRecordPayModalOpen && activeBill && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-emerald-50/50">
              <div className="flex items-center gap-2 text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold">Catat Pelunasan SPP</h3>
              </div>
              <button
                onClick={() => setIsRecordPayModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRecordPayment} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl space-y-1">
                <div className="font-bold text-gray-900">{activeBill.studentName}</div>
                <div className="text-gray-500">
                  {activeBill.classId} • Periode: {activeBill.periodMonth}
                </div>
                <div className="font-mono font-black text-sm text-[#531FFF] pt-1">
                  Tagihan: {formatRupiah(activeBill.amount)}
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Tanggal Pembayaran</label>
                <input
                  type="date"
                  required
                  value={payFormData.paidAt}
                  onChange={(e) => setPayFormData({ ...payFormData, paidAt: e.target.value })}
                  className="w-full px-3 py-2 font-semibold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Metode Pembayaran</label>
                <select
                  value={payFormData.paymentMethod}
                  onChange={(e) => setPayFormData({ ...payFormData, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 font-semibold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Nomor Referensi / No. Kuitansi</label>
                <input
                  type="text"
                  required
                  value={payFormData.paymentReference}
                  onChange={(e) => setPayFormData({ ...payFormData, paymentReference: e.target.value })}
                  placeholder="Contoh: REF-81928 / KSR-001"
                  className="w-full px-3 py-2 font-mono font-semibold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Catatan Kasir (Opsional)</label>
                <input
                  type="text"
                  value={payFormData.notes}
                  onChange={(e) => setPayFormData({ ...payFormData, notes: e.target.value })}
                  placeholder="Contoh: Diterima lunas oleh kasir"
                  className="w-full px-3 py-2 font-semibold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsRecordPayModalOpen(false)}
                  className="px-4 py-2 font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Tandai Lunas</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL BUAT TAGIHAN (SATUAN / MASSAL) (ADMIN ONLY)                      */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/70">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#531FFF]" />
                <h3 className="text-sm font-bold text-gray-900">Penerbitan Tagihan SPP</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50/40 text-xs">
              <button
                type="button"
                onClick={() => setIsBulkMode(false)}
                className={cn(
                  "flex-1 py-3 text-center font-bold border-b-2 transition-all cursor-pointer",
                  !isBulkMode
                    ? "border-[#531FFF] text-[#531FFF] bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                )}
              >
                1. Tagihan Satuan (Per Siswa)
              </button>
              <button
                type="button"
                onClick={() => setIsBulkMode(true)}
                className={cn(
                  "flex-1 py-3 text-center font-bold border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5",
                  isBulkMode
                    ? "border-[#531FFF] text-[#531FFF] bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                )}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                2. Generate Massal (Satu Kelas)
              </button>
            </div>

            {/* Form Content */}
            {!isBulkMode ? (
              /* SINGLE BILL FORM */
              <form onSubmit={handleSubmitSingleBill} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Pilih Siswa</label>
                  <select
                    required
                    value={singleFormData.studentId}
                    onChange={(e) => setSingleFormData({ ...singleFormData, studentId: e.target.value })}
                    className="w-full px-3 py-2 font-semibold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                  >
                    <option value="">-- Pilih Siswa --</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name || s.fullName} ({s.className || s.classId || "Kelas"}) - NISN: {s.nisn || s.nis || "-"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Periode Bulan</label>
                    <select
                      value={singleFormData.periodMonth}
                      onChange={(e) => setSingleFormData({ ...singleFormData, periodMonth: e.target.value })}
                      className="w-full px-3 py-2 font-semibold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                    >
                      {SPP_MONTHS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Nominal Tagihan (Rp)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      step={10000}
                      value={singleFormData.amount}
                      onChange={(e) => setSingleFormData({ ...singleFormData, amount: Number(e.target.value) })}
                      className="w-full px-3 py-2 font-mono font-bold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Batas Jatuh Tempo</label>
                    <input
                      type="date"
                      required
                      value={singleFormData.dueDate}
                      onChange={(e) => setSingleFormData({ ...singleFormData, dueDate: e.target.value })}
                      className="w-full px-3 py-2 font-semibold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Status Awal</label>
                    <select
                      value={singleFormData.status}
                      onChange={(e) => setSingleFormData({ ...singleFormData, status: e.target.value as PaymentStatus })}
                      className="w-full px-3 py-2 font-semibold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                    >
                      <option value="Belum Dibayar">Belum Dibayar</option>
                      <option value="Menunggu Pembayaran">Menunggu Pembayaran</option>
                      <option value="Lunas">Lunas</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Keterangan / Catatan</label>
                  <input
                    type="text"
                    value={singleFormData.notes}
                    onChange={(e) => setSingleFormData({ ...singleFormData, notes: e.target.value })}
                    placeholder="Contoh: Tagihan SPP Bulanan Ganjil"
                    className="w-full px-3 py-2 font-semibold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-5 py-2 font-bold text-white bg-[#531FFF] hover:bg-[#4216d6] rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Terbitkan Tagihan</span>
                  </button>
                </div>
              </form>
            ) : (
              /* BULK BILL FORM */
              <form onSubmit={handleSubmitBulkBills} className="p-6 space-y-4 text-xs">
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 leading-relaxed">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    Penerbitan Tagihan Otomatis Sekaligus
                  </div>
                  <p className="mt-1 text-[11px]">
                    Sistem akan secara otomatis membuat nomor invoice dan tagihan SPP untuk setiap siswa aktif pada kelas
                    yang dipilih.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Pilih Kelas Target</label>
                  <select
                    value={bulkFormData.classId}
                    onChange={(e) => setBulkFormData({ ...bulkFormData, classId: e.target.value })}
                    className="w-full px-3 py-2 font-semibold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                  >
                    <option value="Semua">Semua Kelas ({students.length} Siswa)</option>
                    {classList.map((cls) => {
                      const count = students.filter((s) => (s.className || s.classId) === cls).length;
                      return (
                        <option key={cls} value={cls}>
                          {cls} ({count} Siswa)
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Periode Bulan</label>
                    <select
                      value={bulkFormData.periodMonth}
                      onChange={(e) => setBulkFormData({ ...bulkFormData, periodMonth: e.target.value })}
                      className="w-full px-3 py-2 font-semibold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                    >
                      {SPP_MONTHS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Nominal per Siswa (Rp)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      step={10000}
                      value={bulkFormData.amount}
                      onChange={(e) => setBulkFormData({ ...bulkFormData, amount: Number(e.target.value) })}
                      className="w-full px-3 py-2 font-mono font-bold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Batas Jatuh Tempo</label>
                  <input
                    type="date"
                    required
                    value={bulkFormData.dueDate}
                    onChange={(e) => setBulkFormData({ ...bulkFormData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 font-semibold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Keterangan / Catatan Tagihan</label>
                  <input
                    type="text"
                    value={bulkFormData.notes}
                    onChange={(e) => setBulkFormData({ ...bulkFormData, notes: e.target.value })}
                    placeholder="Contoh: Tagihan SPP Bulanan Terpadu"
                    className="w-full px-3 py-2 font-semibold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-5 py-2 font-bold text-white bg-[#531FFF] hover:bg-[#4216d6] rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Generate Tagihan Massal</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. MODAL EDIT TAGIHAN (ADMIN ONLY)                                        */}
      {/* ========================================================================= */}
      {isEditModalOpen && activeBill && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-purple-50/50">
              <div className="flex items-center gap-2 text-purple-950">
                <Edit2 className="w-5 h-5 text-[#531FFF]" />
                <h3 className="text-sm font-bold">Edit Tagihan SPP</h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEditBill} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl space-y-1">
                <div className="font-bold text-gray-900">{activeBill.studentName}</div>
                <div className="text-gray-500 font-mono text-[11px]">{activeBill.invoiceNo}</div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Nominal Tagihan (Rp)</label>
                <input
                  type="number"
                  required
                  min={0}
                  step={10000}
                  value={editFormData.amount}
                  onChange={(e) => setEditFormData({ ...editFormData, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 font-mono font-bold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Batas Jatuh Tempo</label>
                <input
                  type="date"
                  required
                  value={editFormData.dueDate}
                  onChange={(e) => setEditFormData({ ...editFormData, dueDate: e.target.value })}
                  className="w-full px-3 py-2 font-semibold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Status Tagihan</label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as PaymentStatus })}
                  className="w-full px-3 py-2 font-semibold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                >
                  <option value="Belum Dibayar">Belum Dibayar</option>
                  <option value="Menunggu Pembayaran">Menunggu Pembayaran</option>
                  <option value="Terlambat">Terlambat</option>
                  <option value="Lunas">Lunas</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Catatan</label>
                <input
                  type="text"
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className="w-full px-3 py-2 font-semibold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 font-bold text-white bg-[#531FFF] hover:bg-[#4216d6] rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. MODAL BAYAR SEKARANG (SISWA / ORANG TUA GATEWAY)                       */}
      {/* ========================================================================= */}
      {isPayNowModalOpen && activeBill && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-purple-50/60">
              <div className="flex items-center gap-2 text-[#531FFF]">
                <Smartphone className="w-5 h-5" />
                <h3 className="text-sm font-bold text-gray-900">Pembayaran SPP Digital</h3>
              </div>
              <button
                onClick={() => setIsPayNowModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Bill Details */}
              <div className="p-3.5 bg-gray-50 border border-gray-100 rounded-xl space-y-1 text-center">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                  Total Tagihan Yang Harus Dibayar:
                </span>
                <div className="text-2xl font-black text-[#531FFF] font-mono">{formatRupiah(activeBill.amount)}</div>
                <p className="text-[11px] text-gray-500">
                  {activeBill.invoiceNo} • {activeBill.periodMonth}
                </p>
              </div>

              {/* Virtual Account Box */}
              <div className="p-4 border-2 border-[#531FFF]/20 bg-purple-50/30 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-700">Bank Mandiri Virtual Account</span>
                  <span className="text-[10px] bg-[#531FFF] text-white font-bold px-1.5 py-0.5 rounded">Otomatis</span>
                </div>
                <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-purple-200">
                  <span className="font-mono font-black text-sm tracking-wider text-gray-900">
                    8920 0819 2831 002
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyVa("892008192831002")}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#531FFF] hover:underline cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedVa ? "Tersalin!" : "Salin"}
                  </button>
                </div>
                <p className="text-[10px] text-gray-500">
                  Nama Akun: <strong>SMA GARUDA - {activeBill.studentName}</strong>
                </p>
              </div>

              {/* Panduan Pembayaran */}
              <div className="space-y-1.5 text-[11px] text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="font-bold text-gray-800">Petunjuk Pembayaran ATM / Mobile Banking:</div>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Buka aplikasi Mobile Banking atau kunjungi ATM terdekat.</li>
                  <li>Pilih menu <strong>Bayar / Tagihan &gt; Pendidikan</strong>.</li>
                  <li>Masukkan nomor Virtual Account di atas.</li>
                  <li>Pastikan nama siswa dan nominal tagihan sesuai.</li>
                  <li>Konfirmasi pembayaran hingga transaksi selesai.</li>
                </ol>
              </div>

              {/* Action */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    updateBill(activeBill.id, {
                      status: "Menunggu Pembayaran",
                      paymentMethod: "Mandiri Virtual Account",
                      notes: "Konfirmasi transfer mandiri siswa/wali",
                    });
                    showSuccess?.("Konfirmasi pembayaran dikirimkan! Kasir sekolah akan memverifikasi.");
                    setIsPayNowModalOpen(false);
                  }}
                  className="w-full py-2.5 font-bold text-white bg-[#531FFF] hover:bg-[#4216d6] rounded-xl shadow-md shadow-[#531FFF]/20 transition-all cursor-pointer text-center text-xs"
                >
                  Konfirmasi Saya Sudah Transfer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. MODAL KONFIRMASI HAPUS KUSTOM (ADMIN ONLY)                           */}
      {/* ========================================================================= */}
      {deleteModalState.isOpen && deleteModalState.bill && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col">
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100 shadow-xs">
                <Trash2 className="w-7 h-7" />
              </div>

              <h3 className="text-base font-bold text-gray-900 mb-2">Hapus Tagihan SPP?</h3>

              <div className="text-xs text-gray-600 space-y-3 leading-relaxed">
                <p>
                  Apakah Anda yakin ingin menghapus tagihan SPP{" "}
                  <strong className="text-gray-900 font-bold font-mono">
                    "{deleteModalState.bill.invoiceNo}"
                  </strong>{" "}
                  untuk siswa{" "}
                  <strong className="text-gray-900 font-bold">{deleteModalState.bill.studentName}</strong> dari database?
                </p>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5 text-left">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Perhatian:</strong> Riwayat tagihan dan data kuitansi invoice terkait
                    akan terhapus secara permanen dari server database.
                  </div>
                </div>

                <p className="text-[11px] text-gray-400">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button
                type="button"
                disabled={deleteModalState.loading}
                onClick={() => setDeleteModalState({ isOpen: false, bill: null, loading: false })}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleteModalState.loading}
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-md shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {deleteModalState.loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{deleteModalState.loading ? "Menghapus..." : "Ya, Hapus Tagihan"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Styling */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      `,
        }}
      />
    </div>
  );
}
