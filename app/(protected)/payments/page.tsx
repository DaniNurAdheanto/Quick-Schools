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
  LayoutGrid,
  List,
  Sparkles,
  AlertTriangle,
  Calendar,
  GraduationCap,
  RotateCcw,
  Receipt,
  Download,
  DollarSign,
  ArrowUpDown,
  History,
  Settings,
  MessageSquare,
  Check,
  Ban,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Eye,
  UserCheck,
  Building2,
  QrCode,
  Wallet,
  Copy,
  Banknote,
  Info,
  ShieldCheck,
  ArrowRight,
  CheckCheck,
  Lock,
  Activity,
} from "lucide-react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { useUnifiedStudents } from "@/hooks/use-unified-students";
import { useUnifiedTeachers } from "@/hooks/use-unified-teachers";
import { isStudentRole, isTeacherRole, isSuperAdminRole, isParentRole } from "@/lib/roles-config";
import { resolveParentStudent } from "@/lib/parent-child-resolver";
import Image from "next/image";
import { useSchoolProfile } from "@/context/SchoolProfileContext";
import {
  SPPBill,
  PaymentStatus,
  PaymentTransaction,
  SPPRateConfig,
  SPP_MONTHS,
  PAYMENT_METHOD_OPTIONS,
  formatRupiah,
  angkaKeTerbilang,
  generateInvoiceNo,
  generateReceiptNo,
  useSPPPayments,
  calculateLateFee,
} from "@/lib/spp-payments";

export default function PaymentsPage() {
  const toast = useToast();
  const showSuccess = toast?.showSuccess;
  const showError = toast?.showError;
  const showInfo = toast?.showInfo;

  // SPP hook & data
  const {
    bills,
    rateConfigs,
    sppConfig,
    activities,
    loading: billsLoading,
    createBill,
    bulkCreateBills,
    recordPayment,
    updateBill,
    cancelBill,
    deleteBill,
    updateRateConfigs,
  } = useSPPPayments();

  const { students } = useUnifiedStudents();
  const { teachers: unifiedTeachers } = useUnifiedTeachers();
  const { profile: schoolProfile } = useSchoolProfile();

  // Auth & Role from central AuthContext
  const {
    user: authUser,
    userData,
    role: authRole,
    isGuru: isAuthGuru,
    isStudent: isAuthStudent,
    isAdmin: isAuthAdmin,
    isSuperAdmin: isAuthSuperAdmin,
  } = useAuth();

  const currentUser: any = userData || authUser;
  const userRole = authRole || userData?.role || "admin";
  const isParent = isParentRole(userRole) || userRole === "orang-tua" || isParentRole(userData?.role);
  const isStudent = isAuthStudent || isStudentRole(userRole) || isParent;
  const isGuru = isAuthGuru || isTeacherRole(userRole);
  const isSuperAdmin = isAuthSuperAdmin || isSuperAdminRole(userRole);
  const isAdmin = (isAuthAdmin || isSuperAdmin || userRole === "admin") && !isGuru && !isStudent;
  const isReadOnly = isGuru || isStudent;
  const canManagePayments = isAdmin && !isReadOnly;

  const [matchedStudent, setMatchedStudent] = useState<any | null>(null);

  // Active Main Navigation Tab: "bills" | "arrears" | "activities"
  const [mainTab, setMainTab] = useState<"bills" | "arrears" | "activities">("bills");

  // Active Payment Methods derived from central School SPP Settings
  const activePaymentMethods = useMemo(() => {
    if (sppConfig?.paymentMethods && sppConfig.paymentMethods.length > 0) {
      const active = sppConfig.paymentMethods.filter((m) => m.isActive !== false);
      if (active.length > 0) return active;
    }
    return PAYMENT_METHOD_OPTIONS;
  }, [sppConfig]);

  // Filters & Controls
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>("Semua");
  const [selectedStatus, setSelectedStatus] = useState<string>("Semua");
  const [selectedClass, setSelectedClass] = useState<string>("Semua");
  const [sortBy, setSortBy] = useState<"dueDateAsc" | "dueDateDesc" | "remainingDesc" | "amountDesc" | "nameAsc">("dueDateAsc");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modals & Drawer state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [isRecordPayModalOpen, setIsRecordPayModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"tracking" | "activity">("tracking");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // Active Selected Item State
  const [activeBill, setActiveBill] = useState<SPPBill | null>(null);
  const [activeTransaction, setActiveTransaction] = useState<PaymentTransaction | null>(null);
  const [cancelReason, setCancelReason] = useState("");

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

  // Forms state: Single Bill
  const [singleFormData, setSingleFormData] = useState({
    studentId: "",
    periodMonth: "September 2026",
    amount: 500000,
    dueDate: "2026-09-10",
    initialPaid: 0,
    paymentMethod: "Cash / Tunai di Kasir",
    paymentReference: "",
    notes: "Tagihan SPP Bulanan",
  });

  // Forms state: Bulk Bill
  const [bulkFormData, setBulkFormData] = useState({
    classId: "Semua",
    periodMonth: "September 2026",
    amount: 500000,
    useStandardRates: true,
    dueDate: "2026-09-10",
    skipExisting: true,
    notes: "Tagihan SPP Bulanan Terpadu",
  });

  // Forms state: Record Payment
  const [payFormData, setPayFormData] = useState({
    payType: "full" as "full" | "partial" | "custom",
    amount: 0,
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "Cash / Tunai di Kasir",
    referenceNo: "",
    cashierName: "Bendahara Keuangan",
    notes: "Pelunasan SPP",
    printReceiptAfter: true,
  });

  // Forms state: Edit Bill
  const [editFormData, setEditFormData] = useState({
    amount: 500000,
    dueDate: "2026-09-10",
    notes: "",
  });

  // Forms state: Rates Config
  const [tempRates, setTempRates] = useState<SPPRateConfig[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Multi-step Payment Modal States
  const [payStep, setPayStep] = useState<1 | 2 | 3>(1);
  const [selectedMethodCategory, setSelectedMethodCategory] = useState<string>("all");
  const [copiedAccountKey, setCopiedAccountKey] = useState<string | null>(null);

  const handleCopyNumber = (text: string, key: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedAccountKey(key);
      setTimeout(() => setCopiedAccountKey(null), 2500);
      showSuccess?.(`Berhasil disalin: ${text}`);
    }
  };

  const getStudentCode = (bill: SPPBill) => {
    const std = students.find((s) => (s._firestoreId || s.uid || s.id) === bill.studentId);
    return std?.nisn || bill.studentId.replace(/[^0-9]/g, "").slice(-8) || "2026001";
  };

  // Firestore live collections for homeroom detection
  const [classesList, setClassesList] = useState<any[]>([]);
  const [teachersList, setTeachersList] = useState<any[]>([]);

  useEffect(() => {
    const unsubClasses = onSnapshot(collection(db, "classes"), (snap) => {
      setClassesList(snap.docs.map((d) => ({ _firestoreId: d.id, ...d.data() })));
    });
    return () => {
      unsubClasses();
    };
  }, []);

  useEffect(() => {
    setTeachersList(unifiedTeachers);
  }, [unifiedTeachers]);

  // Resolve Teacher Homeroom Classes (Wali Kelas)
  const teacherHomeroomClasses = useMemo(() => {
    const matched = new Set<string>();
    const tEmail = currentUser?.email?.toLowerCase();
    const tName = (currentUser?.name || currentUser?.displayName || currentUser?.fullName || "").trim().toLowerCase();
    const tUid = currentUser?.uid;

    // 1. Direct field in user doc
    const directClass = currentUser?.homeroomClass || currentUser?.homeroom || currentUser?.class || currentUser?.className;
    if (directClass && directClass !== "-" && directClass !== "All" && directClass !== "Semua Kelas") {
      matched.add(directClass);
    }

    // 2. Check classes collection
    classesList.forEach((c) => {
      const cHomeroom = (c.homeroom || c.homeroomTeacher || c.waliKelas || "").trim().toLowerCase();
      const cId = (c.homeroomId || "").trim();
      if (
        (tName && cHomeroom && (cHomeroom === tName || cHomeroom.includes(tName) || tName.includes(cHomeroom))) ||
        (tUid && cId && cId === tUid)
      ) {
        if (c.name || c.className) matched.add(c.name || c.className);
      }
    });

    // 3. Check teachers collection
    const tDoc = teachersList.find(
      (t) =>
        (tEmail && t.email?.toLowerCase() === tEmail) ||
        (tUid && (t.uid === tUid || t._firestoreId === tUid)) ||
        (tName && t.name?.toLowerCase() === tName)
    );
    if (tDoc) {
      const tClass = tDoc.homeroomClass || tDoc.homeroom || tDoc.class || tDoc.className || tDoc.waliKelas;
      if (tClass && tClass !== "-" && tClass !== "All") matched.add(tClass);
    }

    // Fallback if teacher has no homeroom assigned in DB yet
    if (matched.size === 0 && isGuru) {
      const defaultHomeroom = classesList[0]?.name || "12 MIPA 1";
      matched.add(defaultHomeroom);
    }

    return Array.from(matched);
  }, [currentUser, classesList, teachersList, isGuru]);

  // When students or currentUser load, match student if role is student or parent
  useEffect(() => {
    if (isParent && students.length > 0) {
      const resolved = resolveParentStudent(currentUser, userData, students);
      if (resolved.student) {
        setMatchedStudent(resolved.student);
        return;
      }
    }
    if (isStudent) {
      if (students.length > 0) {
        const email = currentUser?.email?.toLowerCase();
        const nisn = currentUser?.nisn;
        const matched = students.find((s) => {
          return (
            (nisn && s.nisn === nisn) ||
            (email && s.email?.toLowerCase() === email) ||
            s.id === currentUser?.uid ||
            s.studentId === currentUser?.uid ||
            (currentUser?.displayName && s.name && s.name.toLowerCase().includes(currentUser.displayName.toLowerCase())) ||
            (currentUser?.name && s.name && s.name.toLowerCase().includes(currentUser.name.toLowerCase()))
          );
        });
        if (matched) {
          setMatchedStudent(matched);
          return;
        }
      }
      if (currentUser) {
        setMatchedStudent({
          name: currentUser?.displayName || currentUser?.name || currentUser?.fullName || "Siswa",
          nisn: currentUser?.nisn || "-",
          className: currentUser?.classId || currentUser?.className || "12 MIPA 1",
          id: currentUser?.uid,
        });
      }
    }
  }, [isParent, isStudent, currentUser, userData, students]);

  // Auto-set selectedClass for Wali Kelas
  useEffect(() => {
    if (isGuru && teacherHomeroomClasses.length > 0) {
      if (!teacherHomeroomClasses.includes(selectedClass)) {
        setSelectedClass(teacherHomeroomClasses[0]);
      }
    }
  }, [isGuru, teacherHomeroomClasses, selectedClass]);

  // If role is student, ensure they stay on bills tab
  useEffect(() => {
    if (isStudent && mainTab !== "bills") {
      setMainTab("bills");
    }
  }, [isStudent, mainTab]);

  // Sync temp rates when rateConfigs change
  useEffect(() => {
    if (rateConfigs && rateConfigs.length > 0) {
      setTempRates(rateConfigs);
    }
  }, [rateConfigs]);

  // Unique class list from students & bills
  const classList = useMemo(() => {
    const setCls = new Set<string>();
    students.forEach((s) => {
      if (s.className) setCls.add(s.className);
      if (s.classId) setCls.add(s.classId);
    });
    classesList.forEach((c) => {
      if (c.name) setCls.add(c.name);
    });
    bills.forEach((b) => {
      if (b.classId) setCls.add(b.classId);
    });
    return Array.from(setCls).filter(Boolean).sort();
  }, [students, classesList, bills]);

  // Selectable classes filter list: locked exclusively to homeroom for Guru
  const availableFilterClasses = useMemo(() => {
    if (isGuru) {
      return teacherHomeroomClasses;
    }
    return classList;
  }, [isGuru, teacherHomeroomClasses, classList]);

  // Scoped bills based on role
  const scopedBills = useMemo(() => {
    // 1. Siswa: strictly sees only their own bills
    if (isStudent) {
      const targetStd = matchedStudent;
      if (targetStd) {
        return bills.filter(
          (b) =>
            b.studentId === (targetStd._firestoreId || targetStd.uid || targetStd.id) ||
            b.studentId === targetStd.id ||
            (targetStd.nisn && targetStd.nisn !== "-" && b.nisn === targetStd.nisn) ||
            (targetStd.name && b.studentName.toLowerCase() === targetStd.name.toLowerCase())
        );
      }
      if (currentUser?.email) {
        return bills.filter(
          (b) =>
            b.studentId === currentUser.uid ||
            ((b as any).studentEmail && (b as any).studentEmail.toLowerCase() === currentUser.email.toLowerCase()) ||
            b.studentName.toLowerCase().includes(currentUser.displayName?.toLowerCase() || "")
        );
      }
      return [];
    }

    // 2. Guru / Wali Kelas: strictly sees only bills from their homeroom class(es)
    if (isGuru) {
      if (teacherHomeroomClasses.length === 0) return [];
      return bills.filter((b) => {
        const bCls = (b.classId || "").trim().toLowerCase();
        const bClsNoSpace = bCls.replace(/\s+/g, "");
        return teacherHomeroomClasses.some((tc) => {
          const target = tc.trim().toLowerCase();
          return bCls === target || bClsNoSpace === target.replace(/\s+/g, "");
        });
      });
    }

    // 3. Admin: sees all bills
    return bills;
  }, [bills, isStudent, isGuru, matchedStudent, students, currentUser, teacherHomeroomClasses]);

  // Filtered & Sorted bills
  const filteredAndSortedBills = useMemo(() => {
    let result = scopedBills.filter((bill) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSearch =
          bill.studentName?.toLowerCase().includes(q) ||
          bill.invoiceNo?.toLowerCase().includes(q) ||
          bill.nisn?.toLowerCase().includes(q) ||
          bill.classId?.toLowerCase().includes(q) ||
          bill.transactions?.some((t) => t.receiptNo.toLowerCase().includes(q) || t.referenceNo?.toLowerCase().includes(q));
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

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "dueDateAsc":
          return a.dueDate.localeCompare(b.dueDate);
        case "dueDateDesc":
          return b.dueDate.localeCompare(a.dueDate);
        case "remainingDesc":
          return (b.remainingAmount || 0) - (a.remainingAmount || 0);
        case "amountDesc":
          return (b.amount || 0) - (a.amount || 0);
        case "nameAsc":
          return a.studentName.localeCompare(b.studentName);
        default:
          return b.invoiceNo.localeCompare(a.invoiceNo);
      }
    });

    return result;
  }, [scopedBills, searchQuery, selectedMonth, selectedStatus, selectedClass, sortBy]);

  // Pagination slice
  const paginatedBills = useMemo(() => {
    const startIdx = (currentPage - 1) * rowsPerPage;
    return filteredAndSortedBills.slice(startIdx, startIdx + rowsPerPage);
  }, [filteredAndSortedBills, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedBills.length / rowsPerPage) || 1;

  // Arrears Data (Siswa yang memiliki tunggakan Overdue / Unpaid lewat jatuh tempo)
  const arrearsSummary = useMemo(() => {
    const studentMap = new Map<
      string,
      {
        studentId: string;
        studentName: string;
        classId: string;
        nisn: string;
        overdueBills: SPPBill[];
        totalDebt: number;
        oldestDueDate: string;
      }
    >();

    scopedBills.forEach((bill) => {
      if (bill.status === "Overdue" || (bill.status === "Partial" && bill.dueDate < new Date().toISOString().split("T")[0])) {
        const key = bill.studentId || bill.studentName;
        const existing = studentMap.get(key) || {
          studentId: bill.studentId,
          studentName: bill.studentName,
          classId: bill.classId,
          nisn: bill.nisn,
          overdueBills: [],
          totalDebt: 0,
          oldestDueDate: bill.dueDate,
        };

        existing.overdueBills.push(bill);
        existing.totalDebt += bill.remainingAmount;
        if (bill.dueDate < existing.oldestDueDate) {
          existing.oldestDueDate = bill.dueDate;
        }

        studentMap.set(key, existing);
      }
    });

    return Array.from(studentMap.values()).sort((a, b) => b.totalDebt - a.totalDebt);
  }, [scopedBills]);

  // Dashboard Metrics Summary (Real-time calculation)
  const metrics = useMemo(() => {
    let totalNominal = 0;
    let paidNominal = 0;
    let unpaidNominal = 0;
    let overdueNominal = 0;

    let totalCount = scopedBills.length;
    let paidCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;
    let overdueCount = 0;
    let cancelledCount = 0;

    scopedBills.forEach((b) => {
      if (b.status === "Cancelled") {
        cancelledCount++;
        return;
      }

      totalNominal += b.amount || 0;
      paidNominal += b.paidAmount || 0;

      if (b.status === "Paid") {
        paidCount++;
      } else if (b.status === "Partial") {
        partialCount++;
        unpaidNominal += b.remainingAmount || 0;
      } else if (b.status === "Overdue") {
        overdueCount++;
        overdueNominal += b.remainingAmount || 0;
      } else {
        // Unpaid
        unpaidCount++;
        unpaidNominal += b.remainingAmount || 0;
      }
    });

    const percentPaid = totalNominal > 0 ? Math.round((paidNominal / totalNominal) * 100) : 0;

    return {
      totalNominal,
      paidNominal,
      unpaidNominal,
      overdueNominal,
      totalCount,
      paidCount,
      partialCount,
      unpaidCount,
      overdueCount,
      cancelledCount,
      percentPaid,
    };
  }, [scopedBills]);

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

  // Status Badge Component
  const renderStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case "Paid":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Lunas
          </span>
        );
      case "Partial":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Cicilan
          </span>
        );
      case "Overdue":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs animate-pulse">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            Terlambat
          </span>
        );
      case "Cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
            <Ban className="w-3.5 h-3.5 text-gray-400" />
            Dibatalkan
          </span>
        );
      case "Unpaid":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            Belum Bayar
          </span>
        );
    }
  };

  // Handlers: Open Modals
  const handleOpenAddModal = () => {
    setIsBulkMode(false);
    const defaultStd = students[0];
    const defaultStdId = defaultStd ? (defaultStd._firestoreId || defaultStd.uid || defaultStd.id) : "";

    // Dynamic due date from central settings (dueDay)
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = String(now.getMonth() + 1).padStart(2, "0");
    const configuredDueDay = String(sppConfig?.dueDay || 10).padStart(2, "0");
    const calculatedDueDate = `${curYear}-${curMonth}-${configuredDueDay}`;

    // Dynamic standard rate lookup
    let defaultNominal = 500000;
    const activeRates = sppConfig?.rates || rateConfigs;
    if (activeRates && activeRates.length > 0) {
      const matchedRate = activeRates.find((r) =>
        (defaultStd?.className && (defaultStd.className.includes(r.classLevel) || defaultStd.className.includes(r.classLevel.replace("Kelas ", "")))) ||
        (defaultStd?.classId && (defaultStd.classId.includes(r.classLevel) || defaultStd.classId.includes(r.classLevel.replace("Kelas ", ""))))
      );
      if (matchedRate) {
        defaultNominal = matchedRate.monthlyFee;
      } else {
        defaultNominal = activeRates[0].monthlyFee;
      }
    } else {
      if (defaultStd?.className?.includes("12") || defaultStd?.classId?.includes("12")) defaultNominal = 550000;
      else if (defaultStd?.className?.includes("11") || defaultStd?.classId?.includes("11")) defaultNominal = 525000;
    }

    setSingleFormData({
      studentId: defaultStdId,
      periodMonth: "September 2026",
      amount: defaultNominal,
      dueDate: calculatedDueDate,
      initialPaid: 0,
      paymentMethod: activePaymentMethods[0]?.name || "Cash / Tunai di Kasir",
      paymentReference: "",
      notes: "Tagihan SPP Bulanan",
    });
    setBulkFormData({
      classId: "Semua",
      periodMonth: "September 2026",
      amount: defaultNominal,
      useStandardRates: true,
      dueDate: calculatedDueDate,
      skipExisting: true,
      notes: "Tagihan SPP Bulanan Terpadu",
    });
    setIsAddModalOpen(true);
  };

  const handleOpenRecordPayment = (bill: SPPBill) => {
    setActiveBill(bill);
    setPayStep(1);
    setSelectedMethodCategory("all");
    setPayFormData({
      payType: "full",
      amount: bill.remainingAmount,
      paymentDate: new Date().toISOString().split("T")[0],
      paymentMethod: "BCA Virtual Account",
      referenceNo: `TRX-${Date.now().toString().slice(-6)}`,
      cashierName: isParent
        ? `Pembayaran Mandiri Orang Tua (${currentUser?.name || 'Wali'})`
        : isStudent
        ? `Mandiri Siswa (${currentUser?.name || bill.studentName})`
        : currentUser?.name || currentUser?.displayName || "Kasir Tata Usaha",
      notes: bill.remainingAmount === bill.amount ? "Pelunasan SPP" : "Pembayaran Cicilan SPP",
      printReceiptAfter: true,
    });
    setIsRecordPayModalOpen(true);
  };

  const handleOpenDetailDrawer = (bill: SPPBill) => {
    setActiveBill(bill);
    setDrawerTab("tracking");
    setIsDetailDrawerOpen(true);
  };

  const handleOpenReceiptModal = (bill: SPPBill, transaction?: PaymentTransaction) => {
    setActiveBill(bill);
    setActiveTransaction(transaction || (bill.transactions && bill.transactions.length > 0 ? bill.transactions[bill.transactions.length - 1] : null));
    setIsReceiptModalOpen(true);
  };

  const handleOpenEditModal = (bill: SPPBill) => {
    setActiveBill(bill);
    setEditFormData({
      amount: bill.amount,
      dueDate: bill.dueDate,
      notes: bill.notes || "",
    });
    setIsEditModalOpen(true);
  };

  const handleOpenCancelModal = (bill: SPPBill) => {
    setActiveBill(bill);
    setCancelReason("");
    setIsCancelModalOpen(true);
  };

  const handleOpenDeleteModal = (bill: SPPBill) => {
    setDeleteModalState({
      isOpen: true,
      bill,
      loading: false,
    });
  };

  const handleOpenRatesModal = () => {
    setTempRates(rateConfigs.map((r) => ({ ...r })));
    setIsRatesModalOpen(true);
  };

  // Form Submissions
  const handleSubmitSingleBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      showError?.("Aksi ditolak: Hanya Admin/Kasir yang berwenang menerbitkan tagihan SPP.");
      return;
    }
    if (!singleFormData.studentId) {
      showError?.("Pilih siswa terlebih dahulu");
      return;
    }

    const selectedStd = students.find(
      (s) =>
        (s._firestoreId || s.uid || s.id) === singleFormData.studentId ||
        s.id === singleFormData.studentId ||
        s.uid === singleFormData.studentId
    );
    if (!selectedStd) {
      showError?.("Data siswa tidak ditemukan di database");
      return;
    }

    setSubmitting(true);
    try {
      const invoiceNo = generateInvoiceNo(singleFormData.periodMonth, bills.length + 1);
      const studentIdentifier = selectedStd._firestoreId || selectedStd.uid || selectedStd.id;
      const studentDisplayName = selectedStd.fullName || selectedStd.name || "Siswa";
      const studentClass = selectedStd.className || selectedStd.classId || "12 MIPA 1";
      const studentNisn = selectedStd.nisn || selectedStd.nis || "-";

      await createBill({
        invoiceNo,
        studentId: studentIdentifier,
        studentName: studentDisplayName,
        nisn: studentNisn,
        classId: studentClass,
        periodMonth: singleFormData.periodMonth,
        periodYear: singleFormData.periodMonth.split(" ")[1] || "2026",
        academicYear: "2026/2027",
        amount: Number(singleFormData.amount),
        initialPaid: Number(singleFormData.initialPaid || 0),
        dueDate: singleFormData.dueDate,
        paymentMethod: singleFormData.paymentMethod,
        paymentReference: singleFormData.paymentReference,
        cashierName: currentUser?.name || currentUser?.displayName || "Bendahara Sekolah",
        notes: singleFormData.notes,
      });

      showSuccess?.(`Tagihan SPP untuk ${studentDisplayName} berhasil diterbitkan!`);
      setIsAddModalOpen(false);
    } catch (err) {
      showError?.("Gagal membuat tagihan SPP");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitBulkBills = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      showError?.("Aksi ditolak: Hanya Admin/Kasir yang berwenang menerbitkan tagihan massal.");
      return;
    }
    // Filter target students
    const targetStudents = students.filter((s) => {
      if (bulkFormData.classId === "Semua") return true;
      return (s.className || s.classId) === bulkFormData.classId;
    });

    if (targetStudents.length === 0) {
      showError?.("Tidak ada siswa ditemukan pada kelas/kriteria ini");
      return;
    }

    setSubmitting(true);
    try {
      let counter = bills.length + 1;
      const billsToCreate: any[] = [];
      let skippedCount = 0;

      for (const std of targetStudents) {
        const stdIdentifier = std._firestoreId || std.uid || std.id;
        const stdNisn = std.nisn || std.nis;

        // Prevent duplicates if requested
        if (bulkFormData.skipExisting) {
          const alreadyHasBill = bills.some(
            (b) =>
              (b.studentId === stdIdentifier || b.studentId === std.id || (stdNisn && stdNisn !== "-" && b.nisn === stdNisn)) &&
              b.periodMonth === bulkFormData.periodMonth &&
              b.status !== "Cancelled"
          );
          if (alreadyHasBill) {
            skippedCount++;
            continue;
          }
        }

        // Determine rate
        let nominal = Number(bulkFormData.amount);
        if (bulkFormData.useStandardRates) {
          const stdClass = std.className || std.classId || "";
          const activeRates = sppConfig?.rates || rateConfigs;
          const foundRate = activeRates?.find((r) =>
            stdClass.includes(r.classLevel) || stdClass.includes(r.classLevel.replace("Kelas ", ""))
          );
          if (foundRate) {
            nominal = foundRate.monthlyFee;
          } else {
            if (stdClass.includes("12")) nominal = 550000;
            else if (stdClass.includes("11")) nominal = 525000;
            else nominal = 500000;
          }
        }

        const invoiceNo = generateInvoiceNo(bulkFormData.periodMonth, counter++);
        billsToCreate.push({
          invoiceNo,
          studentId: stdIdentifier,
          studentName: std.fullName || std.name || "Siswa",
          nisn: std.nisn || std.nis || "-",
          classId: std.className || std.classId || "12 MIPA 1",
          periodMonth: bulkFormData.periodMonth,
          periodYear: bulkFormData.periodMonth.split(" ")[1] || "2026",
          academicYear: "2026/2027",
          amount: nominal,
          dueDate: bulkFormData.dueDate,
          notes: bulkFormData.notes || "Tagihan SPP Bulanan Terpadu",
        });
      }

      if (billsToCreate.length === 0) {
        showInfo?.(
          `Seluruh siswa (${skippedCount} siswa) sudah memiliki tagihan untuk periode ${bulkFormData.periodMonth}.`
        );
        setIsAddModalOpen(false);
        setSubmitting(false);
        return;
      }

      await bulkCreateBills(billsToCreate);
      showSuccess?.(
        `Berhasil menerbitkan ${billsToCreate.length} tagihan SPP!${
          skippedCount > 0 ? ` (${skippedCount} siswa dilewati karena sudah ada tagihan)` : ""
        }`
      );
      setIsAddModalOpen(false);
    } catch (err) {
      showError?.("Gagal menerbitkan tagihan massal");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuru) {
      showError?.("Aksi ditolak: Wali Kelas hanya memiliki hak akses baca (Read-Only).");
      return;
    }
    if (!activeBill) return;

    const amountToPay = Number(payFormData.amount);
    if (amountToPay <= 0) {
      showError?.("Nominal pembayaran harus lebih besar dari 0");
      return;
    }
    if (amountToPay > activeBill.remainingAmount) {
      showError?.(`Nominal tidak boleh melebihi sisa tagihan (${formatRupiah(activeBill.remainingAmount)})`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await recordPayment(activeBill.id, {
        amount: amountToPay,
        paymentDate: payFormData.paymentDate,
        paymentMethod: payFormData.paymentMethod,
        referenceNo: payFormData.referenceNo || `REF-${Date.now().toString().slice(-6)}`,
        cashierName: payFormData.cashierName || currentUser?.displayName || "Staff Kasir",
        notes: payFormData.notes,
      });

      showSuccess?.(
        `Pembayaran ${formatRupiah(amountToPay)} untuk ${activeBill.studentName} berhasil dicatat! Status: ${
          res.updatedBill.status
        }`
      );
      setIsRecordPayModalOpen(false);

      if (payFormData.printReceiptAfter && res.newTransaction) {
        handleOpenReceiptModal(res.updatedBill, res.newTransaction);
      }
    } catch (err: any) {
      showError?.(err.message || "Gagal mencatat pembayaran");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      showError?.("Aksi ditolak: Hanya Admin yang berwenang mengubah data tagihan.");
      return;
    }
    if (!activeBill) return;

    setSubmitting(true);
    try {
      await updateBill(activeBill.id, {
        amount: Number(editFormData.amount),
        dueDate: editFormData.dueDate,
        notes: editFormData.notes,
      });

      showSuccess?.(`Data tagihan ${activeBill.invoiceNo} berhasil diperbarui!`);
      setIsEditModalOpen(false);
    } catch (err) {
      showError?.("Gagal memperbarui tagihan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (isReadOnly) {
      showError?.("Aksi ditolak: Hanya Admin yang berwenang membatalkan tagihan.");
      return;
    }
    if (!activeBill) return;
    setSubmitting(true);
    try {
      await cancelBill(activeBill.id, cancelReason || "Dibatalkan oleh Admin");
      showSuccess?.(`Tagihan ${activeBill.invoiceNo} berhasil dibatalkan`);
      setIsCancelModalOpen(false);
    } catch (err) {
      showError?.("Gagal membatalkan tagihan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (isReadOnly) {
      showError?.("Aksi ditolak: Hanya Admin yang berwenang menghapus tagihan.");
      return;
    }
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

  const handleSaveRates = () => {
    if (isReadOnly) {
      showError?.("Aksi ditolak: Hanya Admin yang berwenang mengubah pengaturan tarif SPP.");
      return;
    }
    updateRateConfigs(tempRates);
    showSuccess?.("Pengaturan tarif SPP sekolah berhasil diperbarui!");
    setIsRatesModalOpen(false);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      "No. Invoice",
      "Nama Siswa",
      "NISN",
      "Kelas",
      "Periode",
      "Tagihan",
      "Dibayar",
      "Sisa Tagihan",
      "Jatuh Tempo",
      "Status",
      "Tgl Bayar Terakhir",
      "Metode",
    ];

    const rows = filteredAndSortedBills.map((b) => [
      `"${b.invoiceNo}"`,
      `"${b.studentName}"`,
      `"${b.nisn || "-"}"`,
      `"${b.classId}"`,
      `"${b.periodMonth}"`,
      b.amount,
      b.paidAmount,
      b.remainingAmount,
      `"${b.dueDate}"`,
      `"${b.status}"`,
      `"${b.paidAt || "-"}"`,
      `"${b.paymentMethod || "-"}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const filePrefix = isGuru 
      ? `Rekap_SPP_Kelas_${(teacherHomeroomClasses[0] || "Binaan").replace(/\s+/g, "_")}`
      : isStudent
      ? `Tagihan_SPP_${(matchedStudent?.name || "Siswa").replace(/\s+/g, "_")}`
      : `Rekap_SPP_Sekolah`;
    link.setAttribute("download", `${filePrefix}_${selectedMonth.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showInfo?.(
      isGuru
        ? `Rekapitulasi SPP siswa kelas ${teacherHomeroomClasses[0] || "binaan"} berhasil diekspor!`
        : "Data rekapitulasi SPP berhasil diekspor ke CSV!"
    );
  };

  // Quick WhatsApp Reminder generator for Arrears
  const handleSendWaReminder = (item: any) => {
    const message = `Yth. Orang Tua / Wali dari ${item.studentName} (${item.classId}), kami menginformasikan tunggakan SPP sebesar ${formatRupiah(
      item.totalDebt
    )} untuk ${item.overdueBills.length} periode tagihan. Mohon untuk melakukan pelunasan ke loket kasir atau via transfer virtual account. Terima kasih. (SMART SCHOOL OS)`;
    navigator.clipboard.writeText(message);
    setCopiedText(true);
    showSuccess?.(`Format pesan pengingat untuk ${item.studentName} telah disalin ke clipboard!`);
    setTimeout(() => setCopiedText(false), 3000);
  };

  // Related system audit activities for active bill in drawer
  const relatedBillActivities = useMemo(() => {
    if (!activeBill) return [];
    return activities.filter((act) => {
      const inv = activeBill.invoiceNo;
      const stdId = activeBill.studentId;
      return (
        act.details?.invoiceNo === inv ||
        (act.summary && act.summary.includes(inv)) ||
        (act.details?.studentId && act.details.studentId === stdId)
      );
    });
  }, [activities, activeBill]);

  // Installment progression computation for active bill
  const installmentTimeline = useMemo(() => {
    if (!activeBill?.transactions || activeBill.transactions.length === 0) return [];
    let runningTotal = 0;
    return activeBill.transactions.map((trx, idx) => {
      runningTotal += Number(trx.amount || 0);
      const remainingAfter = Math.max(0, activeBill.amount - runningTotal);
      const percent = Math.min(100, Math.round((runningTotal / (activeBill.amount || 1)) * 100));
      return {
        ...trx,
        stepIndex: idx + 1,
        runningTotal,
        remainingAfter,
        percent,
        isCompleted: remainingAfter === 0,
      };
    });
  }, [activeBill]);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto w-full space-y-6 pb-24 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* 1. TOP MAIN HEADER CARD                                                   */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 md:p-6 rounded-xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center shrink-0 shadow-2xs">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                Pembayaran & Tagihan SPP
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#531FFF]/10 text-[#531FFF] border border-[#531FFF]/20">
                T.A 2026/2027
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync
              </span>
            </div>
            <p className="text-gray-500 text-xs md:text-sm mt-0.5 font-medium">
              {isStudent
                ? `Informasi tagihan SPP, status pembayaran, dan riwayat transaksi resmi untuk ${matchedStudent ? matchedStudent.name : "Siswa"}.`
                : isGuru
                ? `Monitoring pembayaran SPP siswa khusus kelas binaan (${teacherHomeroomClasses.join(", ") || "12 MIPA 1"}). Akses bersifat read-only.`
                : "Sistem otomasi tagihan SPP sekolah, pencatatan kasir, riwayat cicilan, dan analisis tunggakan."}
            </p>
          </div>
        </div>

        {/* Action Controls based on Role */}
        <div className="flex items-center gap-2 flex-wrap">
          {canManagePayments && (
            <>
              <Link
                href="/admin/settings?tab=spp_config"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-purple-50/50 hover:border-[#531FFF]/40 hover:text-[#531FFF] rounded-lg shadow-2xs transition-all cursor-pointer"
                title="Kelola seluruh konfigurasi pembayaran SPP di Pengaturan Sekolah"
              >
                <Settings className="w-3.5 h-3.5 text-[#531FFF]" />
                <span>Pengaturan SPP</span>
              </Link>

              <button
                onClick={handleOpenRatesModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg shadow-2xs transition-all cursor-pointer"
                title="Atur tarif SPP per tingkat"
              >
                <DollarSign className="w-3.5 h-3.5 text-gray-500" />
                <span>Tarif SPP</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg shadow-2xs transition-all cursor-pointer"
                title="Ekspor data ke file CSV / Excel"
              >
                <Download className="w-3.5 h-3.5 text-gray-500" />
                <span>Ekspor CSV</span>
              </button>

              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg shadow-2xs transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-gray-500" />
                <span>Cetak Rekap</span>
              </button>

              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#531FFF] hover:bg-[#4216d6] rounded-lg shadow-sm shadow-[#531FFF]/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Terbitkan Tagihan</span>
              </button>
            </>
          )}

          {isGuru && (
            <>
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg shadow-2xs transition-all cursor-pointer"
                title="Ekspor rekap SPP kelas binaan"
              >
                <Download className="w-3.5 h-3.5 text-amber-700" />
                <span>Ekspor CSV Kelas</span>
              </button>

              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg shadow-2xs transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-gray-500" />
                <span>Cetak Rekap Kelas</span>
              </button>
            </>
          )}

          {isStudent && (
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg shadow-2xs transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-gray-500" />
              <span>Cetak Riwayat</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1.05 MAINTENANCE / STATUS BANNER DARI PENGATURAN                          */}
      {/* ========================================================================= */}
      {sppConfig && sppConfig.isSystemActive === false && (
        <div className="p-4 rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 flex items-start gap-3.5 shadow-2xs animate-in fade-in duration-150">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <div className="font-bold text-amber-900 flex items-center gap-2">
              <span className="text-sm">Sistem Pembayaran SPP Nonaktif (Mode Pemeliharaan)</span>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-amber-200 text-amber-900 rounded font-black">
                Maintenance
              </span>
            </div>
            <p className="text-amber-800 mt-1 leading-relaxed">
              {sppConfig.maintenanceNotice ||
                "Sistem pembayaran SPP online sedang dalam pemeliharaan berkala atau penutupan buku. Pembayaran online sementara dibatasi."}
            </p>
          </div>
          {canManagePayments && (
            <Link
              href="/admin/settings?tab=spp_config"
              className="shrink-0 px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-200/80 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer"
            >
              Ubah Pengaturan
            </Link>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1.1 ROLE CONTEXT BANNERS                                                  */}
      {/* ========================================================================= */}
      {isGuru && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-900 shadow-2xs animate-in fade-in duration-150">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 text-amber-700 mt-0.5">
            <Eye className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-xs uppercase tracking-wider bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-md">
                Akses Wali Kelas (Read-Only)
              </span>
              <span className="text-xs font-bold text-amber-800">
                Kelas Binaan: {teacherHomeroomClasses.join(", ") || "12 MIPA 1"}
              </span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed font-medium">
              Anda memiliki hak akses untuk memantau status pembayaran dan tunggakan SPP siswa di kelas binaan Anda. Penagihan, pencatatan transaksi kasir, dan perubahan tarif dikelola langsung oleh Petugas Keuangan/Admin.
            </p>
          </div>
        </div>
      )}

      {isStudent && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 text-emerald-900 shadow-2xs animate-in fade-in duration-150">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-700 mt-0.5">
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-xs uppercase tracking-wider bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded-md">
                {isParent ? "Portal Orang Tua" : "Portal Siswa"}
              </span>
              <span className="text-xs font-bold text-emerald-900">
                {matchedStudent ? `${matchedStudent.name} (${matchedStudent.className || "12 MIPA 1"} - NISN: ${matchedStudent.nisn || "-"})` : "Data Siswa"}
              </span>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed font-medium">
              {isParent
                ? "Berikut adalah rincian tagihan SPP, status pembayaran, dan riwayat transaksi resmi untuk putra/putri Anda. Anda dapat melakukan pembayaran SPP secara langsung melalui sistem."
                : "Berikut adalah rincian tagihan SPP, status cicilan, sisa pembayaran, dan riwayat transaksi resmi Anda. Untuk pembayaran, silakan hubungi bendahara sekolah atau loket kasir resmi."}
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SUMMARY METRICS CARDS (INTERACTIVE QUICK FILTERS)                      */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Tagihan */}
        <div
          onClick={() => {
            setMainTab("bills");
            setSelectedStatus("Semua");
          }}
          className={cn(
            "bg-white p-5 rounded-xl border transition-all cursor-pointer shadow-xs hover:shadow-md relative overflow-hidden group",
            selectedStatus === "Semua" && mainTab === "bills"
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
            <div className="text-2xl font-black text-gray-900 tracking-tight font-mono">
              {formatRupiah(metrics.totalNominal)}
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 font-medium mt-1">
              <span>{metrics.totalCount} tagihan terdaftar</span>
              <span className="text-[10px] text-[#531FFF] font-bold group-hover:underline">Semua</span>
            </div>
          </div>
        </div>

        {/* Card 2: Sudah Dibayar */}
        <div
          onClick={() => {
            setMainTab("bills");
            setSelectedStatus(selectedStatus === "Paid" ? "Semua" : "Paid");
          }}
          className={cn(
            "bg-white p-5 rounded-xl border transition-all cursor-pointer shadow-xs hover:shadow-md relative overflow-hidden group",
            selectedStatus === "Paid" && mainTab === "bills"
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
            <div className="text-2xl font-black text-emerald-700 tracking-tight font-mono">
              {formatRupiah(metrics.paidNominal)}
            </div>
            <div className="flex items-center justify-between text-xs mt-1.5">
              <span className="text-emerald-700 font-bold">{metrics.paidCount} Lunas • {metrics.partialCount} Cicil</span>
              <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                {metrics.percentPaid}% Terkumpul
              </span>
            </div>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(metrics.percentPaid, 100)}%` }}
            />
          </div>
        </div>

        {/* Card 3: Belum Dibayar */}
        <div
          onClick={() => {
            setMainTab("bills");
            setSelectedStatus(selectedStatus === "Unpaid" ? "Semua" : "Unpaid");
          }}
          className={cn(
            "bg-white p-5 rounded-xl border transition-all cursor-pointer shadow-xs hover:shadow-md relative overflow-hidden group",
            selectedStatus === "Unpaid" && mainTab === "bills"
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
            <div className="text-2xl font-black text-slate-800 tracking-tight font-mono">
              {formatRupiah(metrics.unpaidNominal)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium mt-1">
              <span>{metrics.unpaidCount} belum bayar</span>
              <span className="text-[10px] text-slate-600 font-bold group-hover:underline">Filter</span>
            </div>
          </div>
        </div>

        {/* Card 4: Tunggakan / Overdue */}
        <div
          onClick={() => {
            if (isStudent) {
              setMainTab("bills");
              setSelectedStatus(selectedStatus === "Overdue" ? "Semua" : "Overdue");
            } else {
              setMainTab("arrears");
            }
          }}
          className={cn(
            "bg-white p-5 rounded-xl border transition-all cursor-pointer shadow-xs hover:shadow-md relative overflow-hidden group",
            (mainTab === "arrears" || (isStudent && selectedStatus === "Overdue"))
              ? "border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/30"
              : "border-gray-100 hover:border-rose-200"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Tunggakan (Overdue)</span>
            <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-700 tracking-tight font-mono">
              {formatRupiah(metrics.overdueNominal)}
            </div>
            <div className="flex items-center justify-between text-xs font-medium mt-1">
              <span className="text-rose-600">{metrics.overdueCount} tagihan lewat tempo</span>
              <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                {isStudent ? "Status" : `${arrearsSummary.length} Siswa`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN NAVIGATION TABS                                                   */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-1">
        <button
          onClick={() => setMainTab("bills")}
          className={cn(
            "px-4 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2",
            mainTab === "bills"
              ? "bg-[#531FFF] text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          )}
        >
          <Receipt className="w-4 h-4" />
          <span>
            {isStudent
              ? "Tagihan & Pembayaran Saya"
              : isGuru
              ? `Daftar Tagihan Siswa (${teacherHomeroomClasses[0] || "Kelas Binaan"})`
              : "Daftar Tagihan & Pembayaran"}
          </span>
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[10px] font-extrabold",
            mainTab === "bills" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
          )}>
            {scopedBills.length}
          </span>
        </button>

        {!isStudent && (
          <button
            onClick={() => setMainTab("arrears")}
            className={cn(
              "px-4 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2",
              mainTab === "arrears"
                ? "bg-rose-600 text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-rose-50 hover:text-rose-700"
            )}
          >
            <AlertCircle className="w-4 h-4" />
            <span>
              {isGuru
                ? `Tunggakan Siswa (${teacherHomeroomClasses[0] || "Kelas"})`
                : "Pusat Tunggakan Siswa"}
            </span>
            {arrearsSummary.length > 0 && (
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-extrabold",
                mainTab === "arrears" ? "bg-white/20 text-white" : "bg-rose-100 text-rose-800"
              )}>
                {arrearsSummary.length}
              </span>
            )}
          </button>
        )}

        {isAdmin && (
          <button
            onClick={() => setMainTab("activities")}
            className={cn(
              "px-4 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2",
              mainTab === "activities"
                ? "bg-gray-900 text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            )}
          >
            <History className="w-4 h-4" />
            <span>Riwayat Aktivitas Keuangan</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. TAB CONTENT: DAFTAR TAGIHAN (TAB 1)                                    */}
      {/* ========================================================================= */}
      {mainTab === "bills" && (
        <div className="space-y-4">
          {/* Filter & Toolbar Box */}
          <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-3.5">
            {/* Quick Status Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-b border-gray-100">
              <button
                onClick={() => {
                  setSelectedStatus("Semua");
                  setCurrentPage(1);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5",
                  selectedStatus === "Semua"
                    ? "bg-[#531FFF] text-white shadow-2xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                <span>Semua Tagihan</span>
                <span className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px]",
                  selectedStatus === "Semua" ? "bg-white/20 text-white" : "bg-white text-gray-700 font-bold"
                )}>
                  {metrics.totalCount}
                </span>
              </button>

              <button
                onClick={() => {
                  setSelectedStatus("Paid");
                  setCurrentPage(1);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5",
                  selectedStatus === "Paid"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
                )}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span>Paid (Lunas)</span>
                <span className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px]",
                  selectedStatus === "Paid" ? "bg-white/20 text-white" : "bg-white text-emerald-800 font-bold"
                )}>
                  {metrics.paidCount}
                </span>
              </button>

              <button
                onClick={() => {
                  setSelectedStatus("Partial");
                  setCurrentPage(1);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5",
                  selectedStatus === "Partial"
                    ? "bg-amber-600 text-white shadow-2xs"
                    : "bg-gray-100 text-gray-600 hover:bg-amber-50 hover:text-amber-700"
                )}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span>Partial (Cicilan)</span>
                <span className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px]",
                  selectedStatus === "Partial" ? "bg-white/20 text-white" : "bg-white text-amber-800 font-bold"
                )}>
                  {metrics.partialCount}
                </span>
              </button>

              <button
                onClick={() => {
                  setSelectedStatus("Unpaid");
                  setCurrentPage(1);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5",
                  selectedStatus === "Unpaid"
                    ? "bg-slate-700 text-white shadow-2xs"
                    : "bg-gray-100 text-gray-600 hover:bg-slate-200"
                )}
              >
                <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                <span>Unpaid (Belum Bayar)</span>
                <span className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px]",
                  selectedStatus === "Unpaid" ? "bg-white/20 text-white" : "bg-white text-slate-800 font-bold"
                )}>
                  {metrics.unpaidCount}
                </span>
              </button>

              <button
                onClick={() => {
                  setSelectedStatus("Overdue");
                  setCurrentPage(1);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5",
                  selectedStatus === "Overdue"
                    ? "bg-rose-600 text-white shadow-2xs"
                    : "bg-gray-100 text-gray-600 hover:bg-rose-50 hover:text-rose-700"
                )}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                <span>Overdue (Terlambat)</span>
                <span className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px]",
                  selectedStatus === "Overdue" ? "bg-white/20 text-white" : "bg-white text-rose-800 font-bold"
                )}>
                  {metrics.overdueCount}
                </span>
              </button>

              {metrics.cancelledCount > 0 && (
                <button
                  onClick={() => {
                    setSelectedStatus("Cancelled");
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5",
                    selectedStatus === "Cancelled"
                      ? "bg-gray-800 text-white shadow-2xs"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  <Ban className="w-3 h-3 text-gray-400 shrink-0" />
                  <span>Dibatalkan</span>
                  <span className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px]",
                    selectedStatus === "Cancelled" ? "bg-white/20 text-white" : "bg-white text-gray-800 font-bold"
                  )}>
                    {metrics.cancelledCount}
                  </span>
                </button>
              )}
            </div>

            {/* Search, Filter Controls & Sorters */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Cari siswa, NISN, no invoice, kuitansi..."
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

              {/* Filter controls */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Bulan */}
                <div className="flex items-center gap-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <select
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(e.target.value);
                      setCurrentPage(1);
                    }}
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

                {/* Kelas */}
                {isGuru ? (
                  <div className="flex items-center gap-1.5 text-xs bg-amber-50/80 border border-amber-200 rounded-lg px-2.5 py-1">
                    <GraduationCap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="text-xs font-bold text-amber-900 py-1">
                      Kelas: {teacherHomeroomClasses.join(", ") || "12 MIPA 1"}
                    </span>
                  </div>
                ) : !isStudent ? (
                  <div className="flex items-center gap-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1">
                    <GraduationCap className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <select
                      value={selectedClass}
                      onChange={(e) => {
                        setSelectedClass(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="bg-transparent text-xs font-bold text-gray-700 outline-none cursor-pointer py-1"
                    >
                      <option value="Semua">Semua Kelas</option>
                      {availableFilterClasses.map((cls) => (
                        <option key={cls} value={cls}>
                          {cls}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                {/* Sorting */}
                <div className="flex items-center gap-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1">
                  <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <select
                    value={sortBy}
                    onChange={(e: any) => setSortBy(e.target.value)}
                    className="bg-transparent text-xs font-bold text-gray-700 outline-none cursor-pointer py-1"
                  >
                    <option value="dueDateAsc">Jatuh Tempo Terdekat</option>
                    <option value="dueDateDesc">Jatuh Tempo Terjauh</option>
                    <option value="remainingDesc">Sisa Tagihan Terbesar</option>
                    <option value="amountDesc">Nominal Terbesar</option>
                    <option value="nameAsc">Nama Siswa A-Z</option>
                  </select>
                </div>

                {/* Reset button */}
                {(selectedMonth !== "Semua" || selectedStatus !== "Semua" || selectedClass !== "Semua" || searchQuery) && (
                  <button
                    onClick={() => {
                      setSelectedMonth("Semua");
                      setSelectedStatus("Semua");
                      setSelectedClass("Semua");
                      setSearchQuery("");
                      setCurrentPage(1);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                    title="Reset Filter"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Reset</span>
                  </button>
                )}

                {/* View Mode Switcher: Kartu (Default Utama), Tabel (Pilihan Kedua) */}
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50 p-0.5 ml-auto sm:ml-0">
                  <button
                    type="button"
                    onClick={() => setViewMode("cards")}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded transition-all cursor-pointer text-xs font-semibold",
                      viewMode === "cards" ? "bg-white shadow-2xs text-[#531FFF] font-bold" : "text-gray-500 hover:text-gray-800"
                    )}
                    title="Tampilan Kartu (Default Utama)"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Kartu</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded transition-all cursor-pointer text-xs font-semibold",
                      viewMode === "table" ? "bg-white shadow-2xs text-[#531FFF] font-bold" : "text-gray-500 hover:text-gray-800"
                    )}
                    title="Tampilan Tabel (Pilihan Kedua)"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Tabel</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bills List / Table */}
          {billsLoading ? (
            <div className="p-12 text-center bg-white rounded-xl border border-gray-100 shadow-xs">
              <Loader2 className="w-8 h-8 text-[#531FFF] animate-spin mx-auto mb-2" />
              <p className="text-xs text-gray-500 font-semibold">Memuat data tagihan SPP...</p>
            </div>
          ) : filteredAndSortedBills.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-gray-100 shadow-xs space-y-3">
              <div className="w-14 h-14 rounded-full bg-purple-50 text-[#531FFF] flex items-center justify-center mx-auto">
                <CreditCard className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Belum Ada Tagihan SPP</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                  {isStudent
                    ? "Saat ini tidak ada tagihan SPP yang sesuai dengan filter atau seluruh tagihan Anda telah lunas."
                    : isGuru
                    ? `Belum ada data tagihan SPP untuk siswa kelas ${teacherHomeroomClasses[0] || "binaan Anda"}.`
                    : "Belum ada tagihan SPP pada filter yang dipilih. Silakan buat tagihan baru atau terbitkan tagihan massal."}
                </p>
              </div>
              {canManagePayments && (
                <button
                  onClick={handleOpenAddModal}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#531FFF] hover:bg-[#4216d6] rounded-lg shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Terbitkan Tagihan</span>
                </button>
              )}
            </div>
          ) : viewMode === "cards" ? (
            /* ========================================================================= */
            /* 1. CARDS VIEW (DEFAULT UTAMA)                                             */
            /* ========================================================================= */
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedBills.map((bill) => (
                  <div
                    key={bill.id}
                    onClick={() => handleOpenDetailDrawer(bill)}
                    className="bg-white rounded-xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-5 space-y-4 hover:border-purple-200 transition-all flex flex-col justify-between cursor-pointer group"
                  >
                    <div>
                      {/* Header */}
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

                      {/* Student Info */}
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
                          <h4 className="font-bold text-sm text-gray-900 group-hover:text-[#531FFF] transition-colors">
                            {bill.studentName}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="bg-gray-100 px-2 py-0.5 rounded text-[10px] font-bold text-gray-700">
                              {bill.classId}
                            </span>
                            <span>NISN: {bill.nisn || "-"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Nominal Breakdown */}
                      <div className="grid grid-cols-3 gap-2 mt-4 p-2.5 bg-gray-50 rounded-lg text-center">
                        <div>
                          <span className="text-[10px] text-gray-500 block font-semibold">Tagihan</span>
                          <span className="font-mono text-xs font-black text-gray-900">{formatRupiah(bill.amount)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-emerald-600 block font-semibold">Dibayar</span>
                          <span className="font-mono text-xs font-black text-emerald-700">{formatRupiah(bill.paidAmount)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-rose-600 block font-semibold">Sisa</span>
                          <span className="font-mono text-xs font-black text-rose-700">{formatRupiah(bill.remainingAmount)}</span>
                        </div>
                      </div>

                      {/* Payment info note */}
                      {bill.paidAmount > 0 && bill.paidAt && (
                        <div className="mt-3 p-2 bg-emerald-50/70 border border-emerald-200 rounded-lg text-[11px] text-emerald-800 flex items-center justify-between">
                          <span>Lunas/Bayar: <strong>{bill.paidAt}</strong></span>
                          <span className="font-bold">{bill.paymentMethod || "Kasir"}</span>
                        </div>
                      )}
                    </div>

                    {/* Card Actions Footer */}
                    <div
                      className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleOpenDetailDrawer(bill)}
                        className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5 text-gray-500" />
                        <span>Detail</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        {(canManagePayments || isStudent) && bill.status !== "Paid" && bill.status !== "Cancelled" && (
                          <button
                            onClick={() => handleOpenRecordPayment(bill)}
                            className={cn(
                              "px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all",
                              isStudent
                                ? "text-white bg-[#531FFF] hover:bg-[#4216d6] shadow-xs"
                                : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
                            )}
                          >
                            {isStudent ? "Bayar SPP" : "Bayar"}
                          </button>
                        )}

                        {bill.paidAmount > 0 && (
                          <button
                            onClick={() => handleOpenReceiptModal(bill)}
                            className="p-1.5 text-gray-500 hover:text-[#531FFF] hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                            title="Cetak Kuitansi"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {canManagePayments && (
                          <>
                            <button
                              onClick={() => handleOpenEditModal(bill)}
                              className="p-1.5 text-gray-400 hover:text-[#531FFF] hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenDeleteModal(bill)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus"
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

              {/* Pagination Bar for Card View */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 bg-white rounded-xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <span>Baris per halaman:</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-white border border-gray-200 rounded px-2 py-1 font-bold text-gray-700 outline-none cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span>
                    Menampilkan <strong>{(currentPage - 1) * rowsPerPage + 1}</strong> -{" "}
                    <strong>{Math.min(currentPage * rowsPerPage, filteredAndSortedBills.length)}</strong> dari{" "}
                    <strong>{filteredAndSortedBills.length}</strong> tagihan
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 font-bold text-gray-800">
                    Halaman {currentPage} dari {totalPages}
                  </span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* 2. TABLE VIEW (PILIHAN KEDUA)                                             */
            /* ========================================================================= */
            <div className="bg-white rounded-xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left divide-y divide-gray-100 text-xs">
                  <thead className="bg-gray-50/80 font-bold text-gray-700 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4 w-12 text-center">No</th>
                      <th className="py-3.5 px-4">No. Invoice</th>
                      <th className="py-3.5 px-4">Nama Siswa</th>
                      <th className="py-3.5 px-4">Kelas</th>
                      <th className="py-3.5 px-4">Periode</th>
                      <th className="py-3.5 px-4 text-right">Tagihan</th>
                      <th className="py-3.5 px-4 text-right">Dibayar</th>
                      <th className="py-3.5 px-4 text-right">Sisa</th>
                      <th className="py-3.5 px-4">Jatuh Tempo</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginatedBills.map((bill, index) => {
                      const rowNum = (currentPage - 1) * rowsPerPage + index + 1;
                      const isPastDue =
                        bill.status === "Overdue" ||
                        (bill.remainingAmount > 0 && new Date(bill.dueDate) < new Date());

                      return (
                        <tr
                          key={bill.id}
                          onClick={() => handleOpenDetailDrawer(bill)}
                          className="hover:bg-purple-50/40 transition-colors cursor-pointer group"
                        >
                          {/* No */}
                          <td className="py-4 px-4 text-center text-gray-400 font-mono">{rowNum}</td>

                          {/* Invoice */}
                          <td className="py-4 px-4 font-mono font-bold text-[#531FFF]">
                            <div className="flex items-center gap-1.5">
                              <Receipt className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                              <span>{bill.invoiceNo}</span>
                            </div>
                          </td>

                          {/* Student */}
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
                                <div className="font-bold text-gray-900 group-hover:text-[#531FFF] transition-colors">
                                  {bill.studentName}
                                </div>
                                <div className="text-[11px] text-gray-400">NISN: {bill.nisn || "-"}</div>
                              </div>
                            </div>
                          </td>

                          {/* Class */}
                          <td className="py-4 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-gray-100 text-gray-700">
                              {bill.classId}
                            </span>
                          </td>

                          {/* Period */}
                          <td className="py-4 px-4 font-bold text-gray-800">{bill.periodMonth}</td>

                          {/* Tagihan */}
                          <td className="py-4 px-4 text-right font-mono font-bold text-gray-900">
                            {formatRupiah(bill.amount)}
                          </td>

                          {/* Dibayar */}
                          <td className="py-4 px-4 text-right">
                            <div className="font-mono font-bold text-emerald-700">{formatRupiah(bill.paidAmount)}</div>
                            {bill.paidAmount > 0 && bill.paidAmount < bill.amount && (
                              <div className="w-16 ml-auto bg-gray-200 h-1 rounded-full mt-1 overflow-hidden">
                                <div
                                  className="bg-emerald-500 h-1 rounded-full"
                                  style={{ width: `${Math.round((bill.paidAmount / bill.amount) * 100)}%` }}
                                />
                              </div>
                            )}
                          </td>

                          {/* Sisa Tagihan */}
                          <td className="py-4 px-4 text-right">
                            {bill.remainingAmount > 0 ? (
                              <span className="font-mono font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200/60">
                                {formatRupiah(bill.remainingAmount)}
                              </span>
                            ) : (
                              <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                Rp 0
                              </span>
                            )}
                          </td>

                          {/* Due Date */}
                          <td className="py-4 px-4">
                            <div className={cn("font-medium", isPastDue ? "text-rose-600 font-bold" : "text-gray-600")}>
                              {bill.dueDate}
                            </div>
                            {isPastDue && (
                              <span className="text-[10px] text-rose-500 font-semibold block">Lewat Tempo</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-4 px-4 text-center">{renderStatusBadge(bill.status)}</td>

                          {/* Action */}
                          <td
                            className="py-4 px-4 text-right"
                            onClick={(e) => e.stopPropagation()} // Prevent row click
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Detail Drawer */}
                              <button
                                onClick={() => handleOpenDetailDrawer(bill)}
                                className="px-2 py-1 text-[11px] font-bold text-gray-700 bg-gray-100 hover:bg-purple-100 hover:text-[#531FFF] rounded-lg transition-colors cursor-pointer"
                                title="Lihat Detail & Riwayat"
                              >
                                Detail
                              </button>

                              {/* Pay button */}
                              {(canManagePayments || isStudent) && bill.status !== "Paid" && bill.status !== "Cancelled" && (
                                <button
                                  onClick={() => handleOpenRecordPayment(bill)}
                                  className={cn(
                                    "px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer",
                                    isStudent
                                      ? "text-white bg-[#531FFF] hover:bg-[#4216d6]"
                                      : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
                                  )}
                                  title={isStudent ? "Bayar Tagihan SPP" : "Catat Pembayaran"}
                                >
                                  {isStudent ? "Bayar SPP" : "Bayar"}
                                </button>
                              )}

                              {/* Receipt print */}
                              {bill.paidAmount > 0 && (
                                <button
                                  onClick={() => handleOpenReceiptModal(bill)}
                                  className="p-1.5 text-gray-500 hover:text-[#531FFF] hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                                  title="Cetak Kuitansi Resmi"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Admin edit & delete */}
                              {canManagePayments && (
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
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar for Table View */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <span>Baris per halaman:</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-white border border-gray-200 rounded px-2 py-1 font-bold text-gray-700 outline-none cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span>
                    Menampilkan <strong>{(currentPage - 1) * rowsPerPage + 1}</strong> -{" "}
                    <strong>{Math.min(currentPage * rowsPerPage, filteredAndSortedBills.length)}</strong> dari{" "}
                    <strong>{filteredAndSortedBills.length}</strong> tagihan
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 font-bold text-gray-800">
                    Halaman {currentPage} dari {totalPages}
                  </span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TAB CONTENT: PUSAT TUNGGAKAN SISWA (TAB 2)                             */}
      {/* ========================================================================= */}
      {mainTab === "arrears" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header Banner */}
          <div className="bg-rose-50 border border-rose-200 p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base md:text-lg font-black text-rose-900">
                  Pusat Rekapitulasi Tunggakan SPP Siswa
                </h2>
                <p className="text-xs text-rose-700 font-medium mt-0.5">
                  Terdapat <strong>{arrearsSummary.length} siswa</strong> yang memiliki tagihan terlambat dengan total
                  tunggakan akumulatif sebesar <strong>{formatRupiah(metrics.overdueNominal)}</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 text-xs font-bold text-rose-800 bg-white border border-rose-300 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Laporan Tunggakan</span>
              </button>
            </div>
          </div>

          {/* Arrears Student Table */}
          {arrearsSummary.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-gray-100 shadow-xs space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Tidak Ada Tunggakan SPP</h3>
              <p className="text-xs text-gray-500">
                Seluruh siswa telah melunasi tagihan tepat waktu atau belum ada tagihan yang melewati batas tempo.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left divide-y divide-gray-100 text-xs">
                  <thead className="bg-gray-50/80 font-bold text-gray-700 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4 w-12 text-center">No</th>
                      <th className="py-3.5 px-4">Nama Siswa</th>
                      <th className="py-3.5 px-4">Kelas & NISN</th>
                      <th className="py-3.5 px-4">Jumlah Bulan Menunggak</th>
                      <th className="py-3.5 px-4">Batas Tempo Terlama</th>
                      <th className="py-3.5 px-4 text-right">Total Tunggakan</th>
                      <th className="py-3.5 px-4 text-right">Aksi Pengingat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                    {arrearsSummary.map((item, idx) => (
                      <tr key={item.studentId || idx} className="hover:bg-rose-50/30 transition-colors">
                        <td className="py-4 px-4 text-center text-gray-400 font-bold">{idx + 1}</td>

                        {/* Student Name */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border shrink-0",
                                getAvatarColor(item.studentName)
                              )}
                            >
                              {getInitials(item.studentName)}
                            </div>
                            <span className="font-bold text-gray-900">{item.studentName}</span>
                          </div>
                        </td>

                        {/* Class & NISN */}
                        <td className="py-4 px-4">
                          <span className="bg-gray-100 px-2 py-0.5 rounded text-[10px] font-bold text-gray-700">
                            {item.classId}
                          </span>
                          <span className="text-gray-400 text-[11px] ml-2">NISN: {item.nisn || "-"}</span>
                        </td>

                        {/* Months in Arrears */}
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1">
                            {item.overdueBills.map((b) => (
                              <span
                                key={b.id}
                                className="bg-rose-100/80 text-rose-800 font-bold text-[10px] px-2 py-0.5 rounded"
                              >
                                {b.periodMonth} ({formatRupiah(b.remainingAmount)})
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Oldest Due Date */}
                        <td className="py-4 px-4 font-bold text-rose-600">{item.oldestDueDate}</td>

                        {/* Total Debt & Late Fee */}
                        <td className="py-4 px-4 text-right">
                          <span className="font-mono font-black text-rose-700 text-sm block">
                            {formatRupiah(item.totalDebt)}
                          </span>
                          {(() => {
                            const totalLateFee = item.overdueBills.reduce(
                              (acc, b) => acc + calculateLateFee(b, sppConfig),
                              0
                            );
                            if (totalLateFee > 0) {
                              return (
                                <span className="text-[10px] text-amber-700 font-bold block mt-0.5">
                                  + Denda: {formatRupiah(totalLateFee)}
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleSendWaReminder(item)}
                              className="px-3 py-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                              title="Salin Pesan Pengingat WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{copiedText ? "Tersalin!" : "Pengingat WA"}</span>
                            </button>

                            {canManagePayments && item.overdueBills[0] && (
                              <button
                                onClick={() => handleOpenRecordPayment(item.overdueBills[0])}
                                className="px-3 py-1.5 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer"
                              >
                                Lunasi
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
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. TAB CONTENT: RIWAYAT AKTIVITAS (TAB 3)                                 */}
      {/* ========================================================================= */}
      {mainTab === "activities" && (
        <div className="bg-white p-5 md:p-6 rounded-xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-4 animate-in fade-in duration-200">
          <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base md:text-lg font-black text-gray-900 flex items-center gap-2">
                <History className="w-5 h-5 text-[#531FFF]" />
                Audit Trail Aktivitas Pembayaran & Tagihan
              </h2>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Merekam kronologi perubahan data tagihan, pembayaran kasir, dan penerbitan invoice secara transparan.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-100 rounded-lg">
            <table className="w-full text-left divide-y divide-gray-100 text-xs">
              <thead className="bg-gray-50 font-bold text-gray-700 text-[11px] uppercase">
                <tr>
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Pengguna & Role</th>
                  <th className="py-3 px-4">Aksi</th>
                  <th className="py-3 px-4">Deskripsi Aktivitas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                {activities.map((act) => (
                  <tr key={act.id} className="hover:bg-gray-50/70">
                    <td className="py-3.5 px-4 text-gray-500 font-mono text-[11px]">{act.timestamp}</td>
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      <div>{act.user}</div>
                      <span className="text-[10px] text-gray-400 font-normal">{act.role}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="bg-purple-50 text-[#531FFF] border border-purple-200 px-2 py-0.5 rounded text-[10px] font-bold">
                        {act.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-700">{act.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. DETAIL PEMBAYARAN DRAWER / SLIDE-OVER                                   */}
      {/* ========================================================================= */}
      {isDetailDrawerOpen && activeBill && (
        <div className="fixed inset-0 z-[120] flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Receipt className="w-5 h-5 text-[#531FFF]" />
                <div>
                  <h3 className="font-bold text-base text-gray-900">Detail Tagihan & Riwayat Cicilan</h3>
                  <p className="font-mono text-xs text-gray-500">{activeBill.invoiceNo}</p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailDrawerOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200/60 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Student Profile Box */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/60 flex items-start gap-3.5">
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center text-sm font-black border shrink-0",
                    getAvatarColor(activeBill.studentName)
                  )}
                >
                  {getInitials(activeBill.studentName)}
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-gray-900 text-sm">{activeBill.studentName}</h4>
                    {renderStatusBadge(activeBill.status)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="bg-white px-2 py-0.5 rounded border border-gray-200 font-bold text-gray-700">
                      {activeBill.classId}
                    </span>
                    <span>NISN: {activeBill.nisn || "-"}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 pt-0.5">
                    Periode: <strong>{activeBill.periodMonth}</strong> (Jatuh Tempo: {activeBill.dueDate})
                  </p>
                </div>
              </div>

              {/* Financial Balance Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 text-center">
                  <span className="text-[10px] font-bold text-gray-500 block uppercase">Total Tagihan</span>
                  <span className="font-mono text-sm font-black text-gray-900">{formatRupiah(activeBill.amount)}</span>
                </div>
                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-center">
                  <span className="text-[10px] font-bold text-emerald-600 block uppercase">Sudah Dibayar</span>
                  <span className="font-mono text-sm font-black text-emerald-700">
                    {formatRupiah(activeBill.paidAmount)}
                  </span>
                </div>
                <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100 text-center">
                  <span className="text-[10px] font-bold text-rose-600 block uppercase">Sisa Tagihan</span>
                  <span className="font-mono text-sm font-black text-rose-700">
                    {formatRupiah(activeBill.remainingAmount)}
                  </span>
                </div>
              </div>

              {/* Actions Toolbar inside Drawer */}
              {(canManagePayments || isStudent) && activeBill.status !== "Paid" && activeBill.status !== "Cancelled" && (
                <button
                  onClick={() => {
                    handleOpenRecordPayment(activeBill);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#531FFF] hover:bg-[#4216d6] text-white text-xs font-bold shadow-md shadow-[#531FFF]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>{isStudent ? "Bayar SPP Sekarang (Pilih Metode & Langkah)" : "Catat Pembayaran / Cicilan Sekarang"}</span>
                </button>
              )}

              {/* Installment Progress & Activity Tracking Card */}
              {(() => {
                const paidPercent = Math.min(
                  100,
                  Math.round(((activeBill.paidAmount || 0) / (activeBill.amount || 1)) * 100)
                );
                const isPartial = (activeBill.paidAmount || 0) > 0 && (activeBill.remainingAmount || 0) > 0;
                const isFullyPaid = (activeBill.remainingAmount || 0) === 0;

                return (
                  <div className="p-4 bg-gradient-to-br from-purple-50/70 via-indigo-50/40 to-slate-50 rounded-2xl border border-purple-100 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#531FFF]" />
                        <span className="font-bold text-xs text-gray-900">
                          Tracking Progres & Aktivitas Pembayaran
                        </span>
                      </div>
                      {isFullyPaid ? (
                        <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100/80 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Lunas Sepenuhnya (100%)
                        </span>
                      ) : isPartial ? (
                        <span className="text-[10px] font-extrabold text-[#531FFF] bg-purple-100 border border-purple-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Cicilan Aktif ({activeBill.transactions?.length || 1}x Bayar)
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-gray-600 bg-gray-200/80 px-2.5 py-0.5 rounded-full">
                          Menunggu Pembayaran
                        </span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-gray-600">
                        <span>
                          Progres Pembayaran: <strong className="text-gray-900">{paidPercent}%</strong>
                        </span>
                        <span>
                          {formatRupiah(activeBill.paidAmount)} / {formatRupiah(activeBill.amount)}
                        </span>
                      </div>
                      <div className="w-full h-3 bg-gray-200/80 rounded-full overflow-hidden p-0.5">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            isFullyPaid
                              ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                              : "bg-gradient-to-r from-[#531FFF] to-indigo-500"
                          )}
                          style={{ width: `${paidPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Quick Guidance Text */}
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      {isFullyPaid
                        ? `Seluruh tagihan SPP periode ${activeBill.periodMonth} telah lunas melalui ${activeBill.transactions?.length || 1} kali transaksi pembayaran resmi.`
                        : isPartial
                        ? `Tagihan berstatus cicilan berjalan. Masih terdapat sisa ${formatRupiah(
                            activeBill.remainingAmount
                          )} yang perlu dilunasi sebelum tanggal jatuh tempo ${activeBill.dueDate}.`
                        : `Belum ada pembayaran yang masuk untuk tagihan periode ${activeBill.periodMonth}. Jatuh tempo pada ${activeBill.dueDate}.`}
                    </p>
                  </div>
                );
              })()}

              {/* Drawer Sub-Tabs: Timeline vs System Activities */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setDrawerTab("tracking")}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                      drawerTab === "tracking"
                        ? "bg-white text-[#531FFF] shadow-xs"
                        : "text-gray-500 hover:text-gray-800"
                    )}
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Timeline & Riwayat Cicilan ({activeBill.transactions?.length || 0})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDrawerTab("activity")}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                      drawerTab === "activity"
                        ? "bg-white text-[#531FFF] shadow-xs"
                        : "text-gray-500 hover:text-gray-800"
                    )}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Log Aktivitas Sistem ({relatedBillActivities.length})</span>
                  </button>
                </div>

                {/* =============================================================== */}
                {/* TAB 1: TIMELINE & RIWAYAT CICILAN BERTAHAP                      */}
                {/* =============================================================== */}
                {drawerTab === "tracking" && (
                  <div className="space-y-3 pt-1 animate-in fade-in duration-150">
                    {/* Step 0: Invoice Creation Milestone */}
                    <div className="relative pl-6 pb-4 border-l-2 border-[#531FFF]/30">
                      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[#531FFF] text-white flex items-center justify-center text-[9px] font-black">
                        0
                      </div>
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-900">Penerbitan Tagihan SPP</span>
                          <span className="text-[10px] text-gray-500">{activeBill.periodMonth}</span>
                        </div>
                        <p className="text-[11px] text-gray-600">
                          Invoice No: <strong className="font-mono text-gray-900">{activeBill.invoiceNo}</strong> • Nominal Awal:{" "}
                          <strong className="font-mono text-gray-900">{formatRupiah(activeBill.amount)}</strong>
                        </p>
                        <p className="text-[10px] text-gray-400">
                          Batas Jatuh Tempo: {activeBill.dueDate}
                        </p>
                      </div>
                    </div>

                    {/* Step 1..N: Installment Transactions Milestone */}
                    {installmentTimeline.length === 0 ? (
                      <div className="relative pl-6 border-l-2 border-dashed border-gray-200 pb-2">
                        <div className="p-5 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400 text-xs font-medium">
                          Belum ada transaksi cicilan atau pembayaran yang masuk untuk tagihan ini.
                        </div>
                      </div>
                    ) : (
                      installmentTimeline.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="relative pl-6 pb-4 border-l-2 border-emerald-400"
                        >
                          <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-black">
                            {item.stepIndex}
                          </div>

                          <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-2.5">
                            {/* Header row */}
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[11px] font-extrabold text-gray-900 uppercase tracking-wide">
                                    {item.isCompleted ? "Pelunasan SPP" : `Cicilan Ke-${item.stepIndex}`}
                                  </span>
                                  <span className="text-[10px] bg-purple-50 text-[#531FFF] border border-purple-200 px-2 py-0.5 rounded font-bold">
                                    {item.paymentMethod}
                                  </span>
                                </div>
                                <span className="font-mono text-[11px] font-bold text-gray-500 block mt-0.5">
                                  Kuitansi: {item.receiptNo}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="font-mono font-black text-sm text-emerald-700 block">
                                  +{formatRupiah(item.amount)}
                                </span>
                                <span className="text-[10px] font-semibold text-gray-500 block">
                                  {item.percent}% Terbayar
                                </span>
                              </div>
                            </div>

                            {/* Tracking Details Strip */}
                            <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between text-[11px] text-gray-600">
                              <span>
                                Sisa Setelah Cicilan Ini:{" "}
                                <strong className="font-mono text-gray-800">
                                  {formatRupiah(item.remainingAfter)}
                                </strong>
                              </span>
                              <span>
                                {item.isCompleted ? (
                                  <span className="text-emerald-700 font-bold">Lunas</span>
                                ) : (
                                  <span className="text-amber-700 font-bold">Belum Lunas</span>
                                )}
                              </span>
                            </div>

                            {/* Meta row: Date, Cashier & Receipt Button */}
                            <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-100 flex-wrap gap-2">
                              <div>
                                <span>Tgl: {item.paymentDate}</span>
                                {item.cashierName && (
                                  <span className="ml-2">• Kasir: <strong>{item.cashierName}</strong></span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleOpenReceiptModal(activeBill, item)}
                                className="text-[#531FFF] hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Lihat Kuitansi</span>
                              </button>
                            </div>

                            {item.notes && (
                              <p className="text-[10px] text-gray-500 italic bg-gray-50 p-1.5 rounded">
                                Catatan: "{item.notes}"
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}

                    {/* Step Final: Remaining Balance or Fully Settled */}
                    <div className="relative pl-6">
                      {activeBill.remainingAmount > 0 ? (
                        <>
                          <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[9px] font-black">
                            !
                          </div>
                          <div className="p-3.5 bg-amber-50/80 rounded-xl border border-amber-200 text-xs space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-amber-900">
                                Sisa Tagihan Yang Belum Terbayar
                              </span>
                              <span className="font-mono font-black text-amber-800 text-sm">
                                {formatRupiah(activeBill.remainingAmount)}
                              </span>
                            </div>
                            <p className="text-[11px] text-amber-800">
                              Jatuh tempo pembayaran selanjutnya adalah tanggal <strong>{activeBill.dueDate}</strong>.
                            </p>
                            {(canManagePayments || isStudent) && (
                              <button
                                type="button"
                                onClick={() => handleOpenRecordPayment(activeBill)}
                                className="w-full py-2 px-3 bg-[#531FFF] hover:bg-[#4216d6] text-white rounded-lg font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>Lanjutkan Bayar Cicilan Berikutnya</span>
                              </button>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-black">
                            ✓
                          </div>
                          <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CheckCheck className="w-4 h-4 text-emerald-600" />
                              <span className="font-bold text-emerald-900">
                                Tagihan SPP Telah Lunas Sepenuhnya
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                              Selesai
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* =============================================================== */}
                {/* TAB 2: LOG AKTIVITAS SISTEM (AUDIT TRAIL)                       */}
                {/* =============================================================== */}
                {drawerTab === "activity" && (
                  <div className="space-y-2.5 pt-1 animate-in fade-in duration-150">
                    {relatedBillActivities.length === 0 ? (
                      <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400 text-xs font-medium space-y-1">
                        <Activity className="w-6 h-6 text-gray-300 mx-auto" />
                        <p>Belum ada catatan aktivitas audit sistem tambahan untuk tagihan ini.</p>
                      </div>
                    ) : (
                      relatedBillActivities.map((act) => (
                        <div
                          key={act.id}
                          className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-1.5 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-purple-100 text-[#531FFF] flex items-center justify-center font-bold text-[10px]">
                                {act.user?.substring(0, 2).toUpperCase() || "SY"}
                              </div>
                              <span className="font-bold text-gray-900 text-[11px]">{act.user}</span>
                              <span className="text-[10px] text-gray-400">({act.role})</span>
                            </div>
                            <span className="text-[10px] text-gray-400">{act.timestamp}</span>
                          </div>
                          <p className="text-[11px] text-gray-700 leading-relaxed">{act.summary}</p>
                          <div className="flex items-center gap-1 text-[10px]">
                            <span className="px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 font-mono font-bold">
                              {act.action}
                            </span>
                            {act.details?.receiptNo && (
                              <span className="px-1.5 py-0.2 rounded bg-purple-50 text-[#531FFF] font-mono font-bold">
                                {act.details.receiptNo}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Notes */}
              {activeBill.notes && (
                <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600 border border-gray-200/60">
                  <span className="font-bold text-gray-700 block mb-0.5">Catatan Tagihan:</span>
                  {activeBill.notes}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <button
                onClick={() => setIsDetailDrawerOpen(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg text-xs cursor-pointer"
              >
                Tutup
              </button>

              {canManagePayments && activeBill.status !== "Cancelled" && (
                <button
                  onClick={() => handleOpenCancelModal(activeBill)}
                  className="px-3 py-2 text-rose-600 hover:bg-rose-50 font-bold rounded-lg text-xs transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Batalkan Tagihan</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. MODAL CATAT PEMBAYARAN MULTI-STEP WIZARD (3 STEPS)                     */}
      {/* ========================================================================= */}
      {isRecordPayModalOpen && activeBill && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    {isStudent ? "Pembayaran SPP Siswa" : "Catat Pembayaran SPP Siswa"}
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    {activeBill.studentName} • Kelas {activeBill.classId} • {activeBill.invoiceNo}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRecordPayModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Progress Bar */}
            <div className="px-6 py-3 bg-white border-b border-gray-100 shrink-0">
              <div className="flex items-center justify-between max-w-lg mx-auto">
                {/* Step 1 */}
                <button
                  type="button"
                  onClick={() => setPayStep(1)}
                  className="flex items-center gap-2 text-left cursor-pointer group"
                >
                  <div
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                      payStep === 1
                        ? "bg-[#531FFF] text-white shadow-xs ring-4 ring-[#531FFF]/15"
                        : payStep > 1
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-100 text-gray-400"
                    )}
                  >
                    {payStep > 1 ? <Check className="w-3.5 h-3.5" /> : "1"}
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-bold">Langkah 1</span>
                    <span
                      className={cn(
                        "text-xs font-bold",
                        payStep === 1 ? "text-[#531FFF]" : payStep > 1 ? "text-emerald-700" : "text-gray-500"
                      )}
                    >
                      Nominal & Cicilan
                    </span>
                  </div>
                </button>

                {/* Divider 1 */}
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-3 transition-colors",
                    payStep > 1 ? "bg-emerald-500" : "bg-gray-200"
                  )}
                />

                {/* Step 2 */}
                <button
                  type="button"
                  onClick={() => {
                    if (payFormData.amount > 0 && payFormData.amount <= activeBill.remainingAmount) {
                      setPayStep(2);
                    }
                  }}
                  className={cn(
                    "flex items-center gap-2 text-left transition-all",
                    payFormData.amount > 0 && payFormData.amount <= activeBill.remainingAmount
                      ? "cursor-pointer group"
                      : "cursor-not-allowed opacity-60"
                  )}
                >
                  <div
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                      payStep === 2
                        ? "bg-[#531FFF] text-white shadow-xs ring-4 ring-[#531FFF]/15"
                        : payStep > 2
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-100 text-gray-400"
                    )}
                  >
                    {payStep > 2 ? <Check className="w-3.5 h-3.5" /> : "2"}
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-bold">Langkah 2</span>
                    <span
                      className={cn(
                        "text-xs font-bold",
                        payStep === 2 ? "text-[#531FFF]" : payStep > 2 ? "text-emerald-700" : "text-gray-500"
                      )}
                    >
                      Pilih Metode
                    </span>
                  </div>
                </button>

                {/* Divider 2 */}
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-3 transition-colors",
                    payStep > 2 ? "bg-emerald-500" : "bg-gray-200"
                  )}
                />

                {/* Step 3 */}
                <button
                  type="button"
                  onClick={() => {
                    if (payFormData.amount > 0 && payFormData.amount <= activeBill.remainingAmount) {
                      setPayStep(3);
                    }
                  }}
                  className={cn(
                    "flex items-center gap-2 text-left transition-all",
                    payFormData.amount > 0 && payFormData.amount <= activeBill.remainingAmount
                      ? "cursor-pointer group"
                      : "cursor-not-allowed opacity-60"
                  )}
                >
                  <div
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                      payStep === 3
                        ? "bg-[#531FFF] text-white shadow-xs ring-4 ring-[#531FFF]/15"
                        : "bg-gray-100 text-gray-400"
                    )}
                  >
                    3
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-bold">Langkah 3</span>
                    <span
                      className={cn(
                        "text-xs font-bold",
                        payStep === 3 ? "text-[#531FFF]" : "text-gray-500"
                      )}
                    >
                      Konfirmasi
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Modal Body Container with Scroll */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              {/* =================================================================== */}
              {/* STEP 1: NOMINAL & PILIHAN CICILAN                                   */}
              {/* =================================================================== */}
              {payStep === 1 && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  {/* Bill Summary Card */}
                  <div className="p-4 bg-gradient-to-r from-purple-50/60 to-indigo-50/40 rounded-xl border border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-black text-[#531FFF] tracking-wider">
                        Rincian Tagihan Siswa
                      </span>
                      <p className="font-bold text-gray-900 text-sm">{activeBill.studentName}</p>
                      <p className="text-xs text-gray-500">
                        Periode: <strong>{activeBill.periodMonth}</strong> • Jatuh Tempo:{" "}
                        <span className="font-mono text-gray-700">{activeBill.dueDate}</span>
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-purple-100">
                      <div>
                        <span className="text-[10px] text-gray-500 block font-semibold">Total Tagihan</span>
                        <span className="font-mono text-xs font-bold text-gray-800">
                          {formatRupiah(activeBill.amount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-600 block font-semibold">Sudah Bayar</span>
                        <span className="font-mono text-xs font-bold text-emerald-700">
                          {formatRupiah(activeBill.paidAmount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-rose-600 block font-black uppercase">Sisa Tagihan</span>
                        <span className="font-mono text-sm font-black text-rose-600">
                          {formatRupiah(activeBill.remainingAmount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Payment Options (Lunas vs Cicilan) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block font-bold text-gray-800">
                        Pilih Skema / Nominal Pembayaran
                      </label>
                      {sppConfig?.installment?.allowPartial === false && (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-200">
                          Kebijakan: Pembayaran Wajib Lunas 100% (Cicilan Nonaktif)
                        </span>
                      )}
                    </div>
                    <div className={cn(
                      "grid gap-2",
                      sppConfig?.installment?.allowPartial === false
                        ? "grid-cols-1"
                        : "grid-cols-1 sm:grid-cols-3"
                    )}>
                      {/* Option 100% Lunas */}
                      <button
                        type="button"
                        onClick={() =>
                          setPayFormData((prev) => ({
                            ...prev,
                            payType: "full",
                            amount: activeBill.remainingAmount,
                            notes: "Pelunasan SPP",
                          }))
                        }
                        className={cn(
                          "p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between",
                          payFormData.payType === "full" && payFormData.amount === activeBill.remainingAmount
                            ? "bg-[#531FFF] text-white border-[#531FFF] shadow-md shadow-[#531FFF]/20"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-purple-50/40 hover:border-purple-200"
                        )}
                      >
                        <span className="text-[10px] uppercase font-bold opacity-80 block">Lunasi 100%</span>
                        <span className="text-xs font-black font-mono mt-1 block">
                          {formatRupiah(activeBill.remainingAmount)}
                        </span>
                        <span className="text-[10px] opacity-75 mt-1 block">Bebas Seluruh Tagihan</span>
                      </button>

                      {sppConfig?.installment?.allowPartial !== false && (
                        <>
                          {/* Option 50% Cicilan */}
                          <button
                            type="button"
                            onClick={() =>
                              setPayFormData((prev) => ({
                                ...prev,
                                payType: "partial",
                                amount: Math.max(
                                  sppConfig?.installment?.minInstallmentAmount || 50000,
                                  Math.round(activeBill.remainingAmount / 2)
                                ),
                                notes: "Pembayaran Cicilan 50%",
                              }))
                            }
                            className={cn(
                              "p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between",
                              payFormData.payType === "partial" &&
                                payFormData.amount === Math.round(activeBill.remainingAmount / 2)
                                ? "bg-[#531FFF] text-white border-[#531FFF] shadow-md shadow-[#531FFF]/20"
                                : "bg-white text-gray-700 border-gray-200 hover:bg-purple-50/40 hover:border-purple-200"
                            )}
                          >
                            <span className="text-[10px] uppercase font-bold opacity-80 block">Cicilan 50%</span>
                            <span className="text-xs font-black font-mono mt-1 block">
                              {formatRupiah(Math.round(activeBill.remainingAmount / 2))}
                            </span>
                            <span className="text-[10px] opacity-75 mt-1 block">Cicil Separuh</span>
                          </button>

                          {/* Option 25% Cicilan */}
                          <button
                            type="button"
                            onClick={() =>
                              setPayFormData((prev) => ({
                                ...prev,
                                payType: "partial",
                                amount: Math.max(
                                  sppConfig?.installment?.minInstallmentAmount || 50000,
                                  Math.round(activeBill.remainingAmount / 4)
                                ),
                                notes: "Pembayaran Cicilan 25%",
                              }))
                            }
                            className={cn(
                              "p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between",
                              payFormData.payType === "partial" &&
                                payFormData.amount === Math.round(activeBill.remainingAmount / 4)
                                ? "bg-[#531FFF] text-white border-[#531FFF] shadow-md shadow-[#531FFF]/20"
                                : "bg-white text-gray-700 border-gray-200 hover:bg-purple-50/40 hover:border-purple-200"
                            )}
                          >
                            <span className="text-[10px] uppercase font-bold opacity-80 block">Cicilan 25%</span>
                            <span className="text-xs font-black font-mono mt-1 block">
                              {formatRupiah(Math.round(activeBill.remainingAmount / 4))}
                            </span>
                            <span className="text-[10px] opacity-75 mt-1 block">Cicilan Ringan</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Nominal Input Field (Disabled to preserve SPP payment data integrity) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-gray-800 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-gray-500" />
                        <span>Nominal Yang Dibayarkan Kali Ini (Rp)</span>
                        <span className="text-rose-500">*</span>
                        <span className="text-[10px] font-bold text-gray-600 bg-gray-200/80 px-2 py-0.5 rounded-md">
                          Disabled
                        </span>
                      </label>
                      <span className="text-[11px] text-gray-500">
                        Sisa Tagihan: <strong className="font-mono text-gray-800">{formatRupiah(activeBill.remainingAmount)}</strong>
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm select-none">
                        Rp
                      </span>
                      <input
                        type="number"
                        min={1000}
                        max={activeBill.remainingAmount}
                        value={payFormData.amount || ""}
                        disabled
                        readOnly
                        placeholder="0"
                        className="w-full pl-11 pr-4 py-2.5 text-base font-mono font-black bg-gray-100 text-gray-800 border border-gray-200 rounded-xl cursor-not-allowed select-none transition-all shadow-2xs"
                        required
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-500 flex-wrap gap-1">
                      <p className="italic">
                        Terbilang: <strong>{angkaKeTerbilang(payFormData.amount || 0)}</strong>
                      </p>
                      <span className="text-gray-400 text-[10px]">
                        *Input dikunci otomatis untuk menjaga keaslian data pembayaran SPP
                      </span>
                    </div>
                  </div>

                  {/* Real-time Calculation Simulation Card */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                    <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs">
                      <Info className="w-3.5 h-3.5 text-[#531FFF]" />
                      <span>Simulasi Perhitungan Tagihan</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-2.5 bg-white rounded-lg border border-gray-100">
                        <span className="text-[10px] text-gray-400 block font-semibold">Sisa Saat Ini</span>
                        <span className="font-mono font-bold text-gray-800">
                          {formatRupiah(activeBill.remainingAmount)}
                        </span>
                      </div>

                      <div className="p-2.5 bg-white rounded-lg border border-purple-100">
                        <span className="text-[10px] text-[#531FFF] block font-semibold">Dibayar Sekarang</span>
                        <span className="font-mono font-black text-[#531FFF]">
                          {formatRupiah(payFormData.amount || 0)}
                        </span>
                      </div>

                      <div className="p-2.5 bg-white rounded-lg border border-gray-100">
                        <span className="text-[10px] text-gray-400 block font-semibold">Sisa Tagihan Nanti</span>
                        <span className="font-mono font-bold text-rose-600">
                          {formatRupiah(Math.max(0, activeBill.remainingAmount - (payFormData.amount || 0)))}
                        </span>
                      </div>

                      <div className="p-2.5 bg-white rounded-lg border border-gray-100 flex flex-col justify-between">
                        <span className="text-[10px] text-gray-400 block font-semibold">Status Akhir</span>
                        {payFormData.amount >= activeBill.remainingAmount ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            LUNAS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-700">
                            <Clock className="w-3 h-3 text-amber-600" />
                            CICILAN
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* =================================================================== */}
              {/* STEP 2: METODE PEMBAYARAN LENGKAP & BERAGAM                         */}
              {/* =================================================================== */}
              {payStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Selected Amount Banner */}
                  <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-[#531FFF]" />
                      <span className="text-xs text-gray-700">
                        Nominal Pembayaran: <strong className="font-mono text-sm text-[#531FFF]">{formatRupiah(payFormData.amount)}</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPayStep(1)}
                      className="text-[11px] text-[#531FFF] hover:underline font-bold cursor-pointer"
                    >
                      Ubah Nominal
                    </button>
                  </div>

                  {/* Method Category Filter Tabs */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {[
                      { id: "all", label: "Semua Metode" },
                      { id: "va", label: "Virtual Account (VA)" },
                      { id: "qris", label: "QRIS & E-Wallet" },
                      { id: "transfer", label: "Transfer Bank" },
                      { id: "cash", label: "Kasir / Tunai" },
                      { id: "scholarship", label: "Beasiswa / KIP" },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedMethodCategory(cat.id)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
                          selectedMethodCategory === cat.id
                            ? "bg-[#531FFF] text-white shadow-2xs"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        )}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Payment Method Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                    {activePaymentMethods.filter(
                      (m) => selectedMethodCategory === "all" || m.category === selectedMethodCategory
                    ).map((method) => {
                      const isSelected = payFormData.paymentMethod === method.name;
                      return (
                        <div
                          key={method.id}
                          onClick={() => setPayFormData((prev) => ({ ...prev, paymentMethod: method.name }))}
                          className={cn(
                            "p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start justify-between gap-2.5",
                            isSelected
                              ? "bg-purple-50/60 border-[#531FFF] ring-2 ring-[#531FFF]/20 shadow-xs"
                              : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/60"
                          )}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              {method.category === "va" && <Building2 className="w-3.5 h-3.5 text-blue-600" />}
                              {method.category === "transfer" && <Building2 className="w-3.5 h-3.5 text-indigo-600" />}
                              {method.category === "qris" && <QrCode className="w-3.5 h-3.5 text-rose-600" />}
                              {method.category === "cash" && <Banknote className="w-3.5 h-3.5 text-emerald-600" />}
                              {method.category === "scholarship" && <GraduationCap className="w-3.5 h-3.5 text-amber-600" />}
                              <span className="font-bold text-gray-900 text-xs">{method.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                                {method.categoryLabel}
                              </span>
                              {method.badge && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">
                                  {method.badge}
                                </span>
                              )}
                            </div>
                          </div>

                          <div
                            className={cn(
                              "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5",
                              isSelected
                                ? "border-[#531FFF] bg-[#531FFF] text-white"
                                : "border-gray-300 bg-white"
                            )}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Interactive Details Container for Selected Method */}
                  {(() => {
                    const currentMethod =
                      activePaymentMethods.find((m) => m.name === payFormData.paymentMethod) ||
                      activePaymentMethods[0] ||
                      PAYMENT_METHOD_OPTIONS[0];
                    const studentCode = getStudentCode(activeBill);
                    const vaNumber = (currentMethod.codePrefix || "88201") + studentCode;
                    const accNumber = currentMethod.accountNumber || "882-019-2334";

                    return (
                      <div className="p-4 bg-gradient-to-br from-slate-50 to-purple-50/30 rounded-xl border border-purple-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-[#531FFF]" />
                            <span className="font-bold text-xs text-gray-900">
                              Detail & Petunjuk Pembayaran: {currentMethod.name}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            Tersedia & Terverifikasi
                          </span>
                        </div>

                        {/* If Virtual Account */}
                        {currentMethod.category === "va" && (
                          <div className="space-y-2.5">
                            <div className="bg-white p-3.5 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-gray-400 block">
                                  Nomor Virtual Account ({currentMethod.name})
                                </span>
                                <span className="font-mono text-base font-black text-gray-900 tracking-wider">
                                  {vaNumber}
                                </span>
                                <span className="text-[10px] text-gray-500 block">
                                  Atas Nama: <strong>SMART SCHOOL OS - {activeBill.studentName}</strong>
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopyNumber(vaNumber, "va")}
                                className="px-3 py-1.5 rounded-lg bg-[#531FFF] hover:bg-[#4216d6] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-center"
                              >
                                {copiedAccountKey === "va" ? (
                                  <>
                                    <CheckCheck className="w-3.5 h-3.5" />
                                    <span>Tersalin!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Salin No. VA</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Instructions */}
                            <div className="bg-white/80 p-3 rounded-lg border border-gray-100 text-[11px] text-gray-600 space-y-1">
                              <span className="font-bold text-gray-800 block mb-1">Tata Cara Pembayaran:</span>
                              {currentMethod.instructions.map((inst, i) => (
                                <p key={i} className="flex items-start gap-1.5">
                                  <span className="font-bold text-[#531FFF] shrink-0">{i + 1}.</span>
                                  <span>{inst}</span>
                                </p>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* If Transfer Bank Manual */}
                        {currentMethod.category === "transfer" && (
                          <div className="space-y-2.5">
                            <div className="bg-white p-3.5 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-gray-400 block">
                                  Nomor Rekening Tujuan ({currentMethod.name})
                                </span>
                                <span className="font-mono text-base font-black text-gray-900 tracking-wider">
                                  {accNumber}
                                </span>
                                <span className="text-[10px] text-gray-500 block">
                                  Atas Nama: <strong>Yayasan Pendidikan Smart School Nusantara</strong>
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopyNumber(accNumber, "rek")}
                                className="px-3 py-1.5 rounded-lg bg-[#531FFF] hover:bg-[#4216d6] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-center"
                              >
                                {copiedAccountKey === "rek" ? (
                                  <>
                                    <CheckCheck className="w-3.5 h-3.5" />
                                    <span>Tersalin!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Salin Rekening</span>
                                  </>
                                )}
                              </button>
                            </div>

                            <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-[11px] text-amber-800">
                              <strong>PENTING:</strong> Mohon cantumkan No. Tagihan{" "}
                              <code className="bg-white px-1.5 py-0.5 rounded font-bold">{activeBill.invoiceNo}</code>{" "}
                              pada berita transfer untuk mempercepat verifikasi otomatis.
                            </div>
                          </div>
                        )}

                        {/* If QRIS / E-Wallet */}
                        {currentMethod.category === "qris" && (
                          <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col items-center text-center space-y-3 shadow-2xs">
                            <div className="flex items-center justify-between w-full border-b border-gray-100 pb-2">
                              <span className="font-bold text-gray-800 text-xs">QRIS Standar Nasional</span>
                              <span className="text-[10px] bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded">
                                NMID: ID102030405060
                              </span>
                            </div>

                            {/* Stylized QRIS Mockup */}
                            <div className="p-3 bg-white border-2 border-gray-800 rounded-xl shadow-inner flex flex-col items-center">
                              <div className="w-40 h-40 bg-gray-950 p-2 rounded-lg flex flex-col items-center justify-center relative overflow-hidden">
                                <div className="absolute inset-1.5 border-2 border-dashed border-white/40 rounded flex items-center justify-center">
                                  <QrCode className="w-28 h-28 text-white" />
                                </div>
                                <div className="absolute top-2 left-2 w-5 h-5 border-2 border-white bg-white/20" />
                                <div className="absolute top-2 right-2 w-5 h-5 border-2 border-white bg-white/20" />
                                <div className="absolute bottom-2 left-2 w-5 h-5 border-2 border-white bg-white/20" />
                              </div>
                              <span className="text-[10px] font-mono font-bold text-gray-700 mt-2 uppercase tracking-widest">
                                SMART SCHOOL OS
                              </span>
                            </div>

                            <div className="space-y-1">
                              <p className="text-xs font-black text-gray-900">
                                Scan & Bayar: <span className="text-[#531FFF] font-mono">{formatRupiah(payFormData.amount)}</span>
                              </p>
                              <p className="text-[10px] text-gray-500">
                                Mendukung: BCA, Mandiri, BRI, BNI, BSI, GoPay, OVO, DANA, ShopeePay, LinkAja
                              </p>
                            </div>
                          </div>
                        )}

                        {/* If Cash / Tunai */}
                        {currentMethod.category === "cash" && (
                          <div className="bg-white p-3.5 rounded-xl border border-gray-200 text-[11px] text-gray-700 space-y-2">
                            <div className="flex items-center gap-2">
                              <Banknote className="w-4 h-4 text-emerald-600" />
                              <span className="font-bold text-gray-900 text-xs">Loket Kasir Tata Usaha Sekolah</span>
                            </div>
                            <p>
                              Pembayaran tunai dilayani di Loket Keuangan Gedung Tata Usaha Lt. 1 pada hari kerja (Senin - Jumat, pukul 07.30 - 15.00 WIB).
                            </p>
                            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-800 text-[10px] font-medium">
                              Kuitansi fisik berstempel resmi sekolah akan langsung dicetak dan diserahkan di loket.
                            </div>
                          </div>
                        )}

                        {/* If Scholarship */}
                        {currentMethod.category === "scholarship" && (
                          <div className="bg-white p-3.5 rounded-xl border border-gray-200 text-[11px] text-gray-700 space-y-1.5">
                            <span className="font-bold text-gray-900 text-xs block">Program Beasiswa & Bantuan KIP</span>
                            <p>
                              Pembayaran disubsidi melalui program beasiswa berprestasi atau bantuan Program Indonesia Pintar (KIP).
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Reference & Payment Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Nomor Referensi / No. Transaksi
                      </label>
                      <input
                        type="text"
                        value={payFormData.referenceNo}
                        onChange={(e) => setPayFormData({ ...payFormData, referenceNo: e.target.value })}
                        placeholder="Contoh: REF-928374 / TRX-01"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20 text-xs font-mono font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Tanggal Pembayaran <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={payFormData.paymentDate}
                        onChange={(e) => setPayFormData({ ...payFormData, paymentDate: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20 text-xs font-semibold"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* =================================================================== */}
              {/* STEP 3: KONFIRMASI & VERIFIKASI PEMBAYARAN                          */}
              {/* =================================================================== */}
              {payStep === 3 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Digital Receipt / Ticket Summary Card */}
                  <div className="bg-white rounded-2xl border-2 border-purple-100 shadow-sm overflow-hidden">
                    {/* Ticket Header */}
                    <div className="p-4 bg-[#531FFF] text-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-purple-200" />
                        <div>
                          <h4 className="font-black text-xs uppercase tracking-wider">Konfirmasi Pembayaran SPP</h4>
                          <span className="text-[10px] text-purple-200 font-mono">
                            Smart School OS • Billing Gateway
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold bg-white/20 text-white px-2.5 py-1 rounded-full">
                        {activeBill.invoiceNo}
                      </span>
                    </div>

                    {/* Ticket Details Grid */}
                    <div className="p-5 space-y-4 text-xs">
                      <div className="grid grid-cols-2 gap-3 pb-3 border-b border-dashed border-gray-200">
                        <div>
                          <span className="text-[10px] text-gray-400 block font-semibold uppercase">Nama Siswa</span>
                          <span className="font-bold text-gray-900">{activeBill.studentName}</span>
                          <span className="text-[11px] text-gray-500 block">Kelas: {activeBill.classId}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 block font-semibold uppercase">Periode SPP</span>
                          <span className="font-bold text-gray-900">{activeBill.periodMonth}</span>
                          <span className="text-[11px] text-gray-500 block">Jatuh Tempo: {activeBill.dueDate}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pb-3 border-b border-dashed border-gray-200">
                        <div>
                          <span className="text-[10px] text-gray-400 block font-semibold uppercase">Metode Pembayaran</span>
                          <span className="font-bold text-[#531FFF]">{payFormData.paymentMethod}</span>
                          <span className="text-[10px] font-mono text-gray-500 block">
                            Ref: {payFormData.referenceNo || `TRX-${Date.now().toString().slice(-6)}`}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 block font-semibold uppercase">Tanggal Transaksi</span>
                          <span className="font-bold text-gray-900">{payFormData.paymentDate}</span>
                          <span className="text-[10px] text-gray-500 block">Status: Siap Diverifikasi</span>
                        </div>
                      </div>

                      {/* Prominent Payment Amount Block */}
                      <div className="p-4 bg-gradient-to-r from-purple-50/80 to-emerald-50/60 rounded-xl border border-purple-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-black text-gray-500 tracking-wider block">
                            Nominal Yang Dibayarkan
                          </span>
                          <span className="font-mono text-xl font-black text-[#531FFF]">
                            {formatRupiah(payFormData.amount)}
                          </span>
                          <p className="text-[10px] text-gray-500 italic mt-0.5">
                            {angkaKeTerbilang(payFormData.amount)}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-gray-400 block uppercase font-bold">Status Akhir</span>
                          {payFormData.amount >= activeBill.remainingAmount ? (
                            <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md inline-block">
                              LUNAS
                            </span>
                          ) : (
                            <div>
                              <span className="text-xs font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md inline-block">
                                CICILAN
                              </span>
                              <span className="text-[10px] text-rose-600 block mt-1 font-mono font-bold">
                                Sisa: {formatRupiah(activeBill.remainingAmount - payFormData.amount)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cashier & Notes Form Section */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        {isStudent ? "Nama Pembayar / Siswa" : "Petugas Kasir / Penerima"}
                      </label>
                      <input
                        type="text"
                        value={payFormData.cashierName}
                        onChange={(e) => setPayFormData({ ...payFormData, cashierName: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20 text-xs font-semibold"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Catatan Tambahan</label>
                      <input
                        type="text"
                        value={payFormData.notes}
                        onChange={(e) => setPayFormData({ ...payFormData, notes: e.target.value })}
                        placeholder="Contoh: Pembayaran SPP Bulan Ini"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20 text-xs font-semibold"
                      />
                    </div>
                  </div>

                  {/* Print Receipt Option */}
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200/60">
                    <input
                      type="checkbox"
                      id="printReceiptCheck"
                      checked={payFormData.printReceiptAfter}
                      onChange={(e) => setPayFormData({ ...payFormData, printReceiptAfter: e.target.checked })}
                      className="rounded text-[#531FFF] focus:ring-[#531FFF] cursor-pointer"
                    />
                    <label htmlFor="printReceiptCheck" className="text-gray-700 font-semibold cursor-pointer text-xs">
                      Buka & Cetak Kuitansi Resmi bertanda tangan digital setelah transaksi berhasil
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer with Stepper Controls */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between shrink-0">
              {/* Left Back / Cancel button */}
              <div>
                {payStep === 1 ? (
                  <button
                    type="button"
                    onClick={() => setIsRecordPayModalOpen(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-200/60 rounded-xl font-bold cursor-pointer transition-colors text-xs"
                  >
                    Batal
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPayStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : 1))}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl font-bold cursor-pointer transition-all text-xs"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Kembali</span>
                  </button>
                )}
              </div>

              {/* Right Next / Submit Button */}
              <div>
                {payStep === 1 && (
                  <button
                    type="button"
                    disabled={
                      !payFormData.amount ||
                      payFormData.amount <= 0 ||
                      payFormData.amount > activeBill.remainingAmount ||
                      (sppConfig?.installment?.allowPartial === false && payFormData.amount < activeBill.remainingAmount) ||
                      (sppConfig?.installment?.allowPartial !== false &&
                        Boolean(sppConfig?.installment?.minInstallmentAmount) &&
                        payFormData.amount < (sppConfig?.installment?.minInstallmentAmount || 0) &&
                        payFormData.amount < activeBill.remainingAmount)
                    }
                    onClick={() => {
                      if (sppConfig?.installment?.allowPartial === false && payFormData.amount < activeBill.remainingAmount) {
                        showError?.("Kebijakan sekolah saat ini mewajibkan pembayaran lunas 100%.");
                        return;
                      }
                      if (
                        sppConfig?.installment?.minInstallmentAmount &&
                        payFormData.amount < sppConfig.installment.minInstallmentAmount &&
                        payFormData.amount < activeBill.remainingAmount
                      ) {
                        showError?.(`Nominal pembayaran minimal adalah ${formatRupiah(sppConfig.installment.minInstallmentAmount)}.`);
                        return;
                      }
                      setPayStep(2);
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-white bg-[#531FFF] hover:bg-[#4216d6] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold shadow-md shadow-[#531FFF]/20 transition-all cursor-pointer text-xs"
                  >
                    <span>Lanjut ke Metode Pembayaran</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                {payStep === 2 && (
                  <button
                    type="button"
                    onClick={() => setPayStep(3)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-white bg-[#531FFF] hover:bg-[#4216d6] rounded-xl font-bold shadow-md shadow-[#531FFF]/20 transition-all cursor-pointer text-xs"
                  >
                    <span>Lanjut ke Konfirmasi</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                {payStep === 3 && (
                  <button
                    type="button"
                    onClick={handleSubmitPayment}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-6 py-2.5 text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer text-xs"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>Konfirmasi & Simpan Pembayaran</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. MODAL KUITANSI RESMI SIAP CETAK (RECEIPT PREVIEW)                      */}
      {/* ========================================================================= */}
      {isReceiptModalOpen && activeBill && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50 no-print">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#531FFF]" />
                <h3 className="text-sm font-bold text-gray-900">Kuitansi Pembayaran SPP Sekolah</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-[#531FFF] hover:bg-[#4216d6] text-white rounded-lg text-xs font-bold shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Kuitansi</span>
                </button>
                <button
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Area */}
            <div className="p-8 overflow-y-auto print-area space-y-6 text-gray-800">
              {/* Letterhead */}
              <div className="flex items-center justify-between border-b-2 border-gray-900 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-900 text-white flex items-center justify-center font-black text-xl overflow-hidden relative p-1 border border-gray-200">
                    {schoolProfile?.logoUrl ? (
                      <Image 
                        src={schoolProfile.logoUrl} 
                        alt="Logo" 
                        fill 
                        className="object-contain p-1" 
                        unoptimized 
                      />
                    ) : (
                      <span>QS</span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-gray-900">
                      {schoolProfile?.schoolName || "SMART SCHOOL OS"}
                    </h2>
                    <p className="text-xs text-gray-500 font-medium">
                      {schoolProfile?.address ? `${schoolProfile.address}, ${schoolProfile.city || ""}` : "SMA NEGERI INDONESIA UNGGUL • JL. PENDIDIKAN NO. 45"}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      Telp: {schoolProfile?.phone || "(021) 789-0123"} • Email: {schoolProfile?.email || "finance@smartschool.sch.id"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 font-black text-xs rounded border border-emerald-300">
                    BUKTI RESMI KASIR
                  </div>
                  <p className="font-mono text-xs font-bold text-gray-700 mt-1">
                    {activeTransaction?.receiptNo || generateReceiptNo(1)}
                  </p>
                </div>
              </div>

              {/* Title */}
              <div className="text-center">
                <h3 className="text-base font-black text-gray-900 uppercase tracking-wider">
                  Kuitansi Pembayaran SPP Siswa
                </h3>
                <p className="text-xs text-gray-500 font-mono">Invoice Ref: {activeBill.invoiceNo}</p>
              </div>

              {/* Metadata Table */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="space-y-1.5">
                  <div className="flex">
                    <span className="w-28 text-gray-500 font-semibold">Nama Siswa</span>
                    <span className="font-bold text-gray-900">: {activeBill.studentName}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-gray-500 font-semibold">NISN</span>
                    <span className="font-bold text-gray-900">: {activeBill.nisn || "-"}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-gray-500 font-semibold">Kelas</span>
                    <span className="font-bold text-gray-900">: {activeBill.classId}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex">
                    <span className="w-32 text-gray-500 font-semibold">Periode Pembayaran</span>
                    <span className="font-bold text-gray-900">: {activeBill.periodMonth}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 text-gray-500 font-semibold">Tanggal Transaksi</span>
                    <span className="font-bold text-gray-900">
                      : {activeTransaction?.paymentDate || new Date().toISOString().split("T")[0]}
                    </span>
                  </div>
                  <div className="flex">
                    <span className="w-32 text-gray-500 font-semibold">Metode Pembayaran</span>
                    <span className="font-bold text-gray-900">
                      : {activeTransaction?.paymentMethod || activeBill.paymentMethod || "Tunai"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Breakdown Table */}
              <table className="w-full text-xs text-left border border-gray-200">
                <thead className="bg-gray-100 font-bold text-gray-700">
                  <tr>
                    <th className="p-2.5 border-b">Uraian Pembayaran</th>
                    <th className="p-2.5 border-b text-right">Nominal Tagihan</th>
                    <th className="p-2.5 border-b text-right">Jumlah Dibayar Ini</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2.5 border-b">
                      Pembayaran SPP Bulanan ({activeBill.periodMonth})
                      <span className="block text-[11px] text-gray-500">
                        {activeTransaction?.notes || "Pembayaran Terverifikasi"}
                      </span>
                    </td>
                    <td className="p-2.5 border-b text-right font-mono font-bold text-gray-800">
                      {formatRupiah(activeBill.amount)}
                    </td>
                    <td className="p-2.5 border-b text-right font-mono font-black text-emerald-700 text-sm">
                      {formatRupiah(activeTransaction?.amount || activeBill.paidAmount)}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-bold">
                    <td colSpan={2} className="p-2.5 text-right text-gray-700">
                      Sisa Tagihan Setelah Pembayaran Ini:
                    </td>
                    <td className="p-2.5 text-right font-mono font-black text-rose-700">
                      {formatRupiah(activeBill.remainingAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Terbilang */}
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 text-xs">
                <span className="font-bold text-purple-900 block mb-0.5">Terbilang:</span>
                <span className="italic font-bold text-purple-800">
                  "{angkaKeTerbilang(activeTransaction?.amount || activeBill.paidAmount)}"
                </span>
              </div>

              {/* Signatures & Stamp */}
              <div className="grid grid-cols-2 gap-8 pt-6">
                <div className="text-center space-y-12">
                  <p className="text-xs text-gray-500 font-semibold">Penyetor / Siswa</p>
                  <p className="text-xs font-bold text-gray-900 border-t border-gray-300 pt-1 w-44 mx-auto">
                    ( {activeBill.studentName} )
                  </p>
                </div>

                <div className="text-center space-y-12 relative">
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 -rotate-12 border-2 border-emerald-600 text-emerald-700 font-black text-xs px-3 py-1 rounded opacity-85">
                    ★ LUNAS TERVERIFIKASI ★
                  </div>
                  <p className="text-xs text-gray-500 font-semibold">Kasir / Bagian Keuangan</p>
                  <p className="text-xs font-bold text-gray-900 border-t border-gray-300 pt-1 w-44 mx-auto">
                    ( {activeTransaction?.cashierName || currentUser?.name || currentUser?.displayName || "Bendahara Keuangan"} )
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. MODAL PENERBITAN TAGIHAN (SINGLE & BULK GENERATOR)                     */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header Tabs */}
            <div className="flex border-b border-gray-100 bg-gray-50">
              <button
                type="button"
                onClick={() => setIsBulkMode(false)}
                className={cn(
                  "flex-1 py-3 text-xs font-bold text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5",
                  !isBulkMode ? "bg-white text-[#531FFF] border-b-2 border-[#531FFF]" : "text-gray-500 hover:text-gray-800"
                )}
              >
                <Plus className="w-4 h-4" />
                <span>Satu Siswa (Individu)</span>
              </button>
              <button
                type="button"
                onClick={() => setIsBulkMode(true)}
                className={cn(
                  "flex-1 py-3 text-xs font-bold text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5",
                  isBulkMode ? "bg-white text-[#531FFF] border-b-2 border-[#531FFF]" : "text-gray-500 hover:text-gray-800"
                )}
              >
                <Sparkles className="w-4 h-4" />
                <span>Penerbitan Massal (Satu Kelas / Semua)</span>
              </button>
            </div>

            {/* Content Form */}
            {!isBulkMode ? (
              /* SINGLE BILL FORM */
              <form onSubmit={handleSubmitSingleBill} className="p-6 space-y-4 text-xs">
                {/* Siswa Selector */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Pilih Siswa</label>
                  <select
                    value={singleFormData.studentId}
                    onChange={(e) => {
                      const stdId = e.target.value;
                      const s = students.find(
                        (x) =>
                          (x._firestoreId || x.uid || x.id) === stdId ||
                          x.id === stdId ||
                          x.uid === stdId
                      );
                      let defaultNominal = 500000;
                      const activeRates = sppConfig?.rates || rateConfigs;
                      if (activeRates && activeRates.length > 0) {
                        const matchedRate = activeRates.find((r) =>
                          (s?.className && (s.className.includes(r.classLevel) || s.className.includes(r.classLevel.replace("Kelas ", "")))) ||
                          (s?.classId && (s.classId.includes(r.classLevel) || s.classId.includes(r.classLevel.replace("Kelas ", ""))))
                        );
                        if (matchedRate) {
                          defaultNominal = matchedRate.monthlyFee;
                        } else {
                          defaultNominal = activeRates[0].monthlyFee;
                        }
                      } else {
                        if (s?.className?.includes("12") || s?.classId?.includes("12")) defaultNominal = 550000;
                        else if (s?.className?.includes("11") || s?.classId?.includes("11")) defaultNominal = 525000;
                      }

                      setSingleFormData({
                        ...singleFormData,
                        studentId: stdId,
                        amount: defaultNominal,
                      });
                    }}
                    className="w-full px-3 py-2 font-semibold bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                    required
                  >
                    <option value="">-- Pilih Siswa Dari Database --</option>
                    {students.map((s) => {
                      const val = s._firestoreId || s.uid || s.id;
                      return (
                        <option key={val} value={val}>
                          {s.fullName || s.name} ({s.className || s.classId || "Tanpa Kelas"}) - NISN: {s.nisn || s.nis || "-"}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Periode & Jatuh Tempo */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Periode Bulan</label>
                    <select
                      value={singleFormData.periodMonth}
                      onChange={(e) => setSingleFormData({ ...singleFormData, periodMonth: e.target.value })}
                      className="w-full px-3 py-2 font-semibold bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                    >
                      {SPP_MONTHS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Tanggal Jatuh Tempo</label>
                    <input
                      type="date"
                      value={singleFormData.dueDate}
                      onChange={(e) => setSingleFormData({ ...singleFormData, dueDate: e.target.value })}
                      className="w-full px-3 py-2 font-semibold bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                      required
                    />
                  </div>
                </div>

                {/* Nominal */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Nominal Tagihan (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={singleFormData.amount}
                    onChange={(e) => setSingleFormData({ ...singleFormData, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 font-mono font-bold bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                    required
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Format: {formatRupiah(singleFormData.amount)}</p>
                </div>

                {/* Notes */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Catatan Tambahan</label>
                  <input
                    type="text"
                    value={singleFormData.notes}
                    onChange={(e) => setSingleFormData({ ...singleFormData, notes: e.target.value })}
                    placeholder="Contoh: Tagihan SPP Reguler"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-bold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-5 py-2 text-white bg-[#531FFF] hover:bg-[#4216d6] rounded-lg font-bold shadow-sm transition-all cursor-pointer"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    <span>Terbitkan Tagihan</span>
                  </button>
                </div>
              </form>
            ) : (
              /* BULK GENERATOR FORM */
              <form onSubmit={handleSubmitBulkBills} className="p-6 space-y-4 text-xs">
                <div className="p-3.5 bg-purple-50 rounded-xl border border-purple-200 text-purple-900">
                  <p className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#531FFF]" />
                    Penerbitan Tagihan Otomatis Seluruh Siswa
                  </p>
                  <p className="text-[11px] text-purple-700 mt-1">
                    Sistem akan membuat invoice tagihan SPP untuk seluruh siswa pada kelas/tingkat yang dipilih. Siswa
                    yang sudah memiliki tagihan aktif pada periode ini dapat dilewati otomatis.
                  </p>
                </div>

                {/* Target Class */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Target Kelas</label>
                  <select
                    value={bulkFormData.classId}
                    onChange={(e) => setBulkFormData({ ...bulkFormData, classId: e.target.value })}
                    className="w-full px-3 py-2 font-semibold bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                  >
                    <option value="Semua">Semua Kelas (Seluruh Sekolah)</option>
                    {classList.map((cls) => (
                      <option key={cls} value={cls}>
                        Kelas {cls}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Periode & Jatuh Tempo */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Periode Bulan</label>
                    <select
                      value={bulkFormData.periodMonth}
                      onChange={(e) => setBulkFormData({ ...bulkFormData, periodMonth: e.target.value })}
                      className="w-full px-3 py-2 font-semibold bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                    >
                      {SPP_MONTHS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Tanggal Jatuh Tempo</label>
                    <input
                      type="date"
                      value={bulkFormData.dueDate}
                      onChange={(e) => setBulkFormData({ ...bulkFormData, dueDate: e.target.value })}
                      className="w-full px-3 py-2 font-semibold bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                      required
                    />
                  </div>
                </div>

                {/* Rate Option */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="useStandardRatesCheck"
                      checked={bulkFormData.useStandardRates}
                      onChange={(e) => setBulkFormData({ ...bulkFormData, useStandardRates: e.target.checked })}
                      className="rounded text-[#531FFF] focus:ring-[#531FFF]"
                    />
                    <label htmlFor="useStandardRatesCheck" className="text-gray-800 font-bold cursor-pointer">
                      Gunakan Tarif Standar Otomatis per Tingkat (
                      {(sppConfig?.rates || rateConfigs)
                        .map((r) => `${r.classLevel}: ${formatRupiah(r.monthlyFee)}`)
                        .join(", ")}
                      )
                    </label>
                  </div>

                  {!bulkFormData.useStandardRates && (
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Nominal Tagihan Seragam (Rp)</label>
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={bulkFormData.amount}
                        onChange={(e) => setBulkFormData({ ...bulkFormData, amount: Number(e.target.value) })}
                        className="w-full px-3 py-2 font-mono font-bold bg-white border border-gray-200 rounded-lg"
                        required
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="skipExistingCheck"
                      checked={bulkFormData.skipExisting}
                      onChange={(e) => setBulkFormData({ ...bulkFormData, skipExisting: e.target.checked })}
                      className="rounded text-[#531FFF] focus:ring-[#531FFF]"
                    />
                    <label htmlFor="skipExistingCheck" className="text-gray-700 font-semibold cursor-pointer">
                      Lewati siswa yang sudah memiliki tagihan pada bulan ini (Cegah Duplikasi)
                    </label>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-bold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-5 py-2 text-white bg-[#531FFF] hover:bg-[#4216d6] rounded-lg font-bold shadow-sm transition-all cursor-pointer"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>Generate Tagihan Massal</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 11. MODAL PENGATURAN TARIF SPP (RATE CONFIGS)                              */}
      {/* ========================================================================= */}
      {isRatesModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/60">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#531FFF]" />
                <h3 className="text-sm font-bold text-gray-900">Pengaturan Struktur Tarif SPP Sekolah</h3>
              </div>
              <button
                onClick={() => setIsRatesModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-gray-500 font-medium">
                Sesuaikan tarif bulanan standar dan tanggal jatuh tempo default untuk setiap tingkatan kelas.
              </p>

              <div className="space-y-3">
                {tempRates.map((rate, index) => (
                  <div key={rate.id} className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900 text-sm">{rate.classLevel}</span>
                      <span className="text-[10px] text-gray-400 font-mono">Tgl Jatuh Tempo: Setiap tgl {rate.defaultDueDay}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-gray-600 font-semibold block mb-1">Tarif Bulanan (Rp)</label>
                        <input
                          type="number"
                          step={1000}
                          value={rate.monthlyFee}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setTempRates((prev) =>
                              prev.map((r, i) => (i === index ? { ...r, monthlyFee: val } : r))
                            );
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-gray-600 font-semibold block mb-1">Tgl Jatuh Tempo (1-28)</label>
                        <input
                          type="number"
                          min={1}
                          max={28}
                          value={rate.defaultDueDay}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setTempRates((prev) =>
                              prev.map((r, i) => (i === index ? { ...r, defaultDueDay: val } : r))
                            );
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded font-bold"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsRatesModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveRates}
                  className="inline-flex items-center gap-2 px-5 py-2 text-white bg-[#531FFF] hover:bg-[#4216d6] rounded-lg font-bold shadow-sm transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Pengaturan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 12. MODAL EDIT TAGIHAN                                                     */}
      {/* ========================================================================= */}
      {isEditModalOpen && activeBill && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/60">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#531FFF]" />
                <h3 className="text-sm font-bold text-gray-900">Ubah Tagihan {activeBill.invoiceNo}</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="p-6 space-y-4 text-xs">
              <div>
                <span className="text-gray-500 font-semibold block">Siswa</span>
                <span className="font-bold text-gray-900 text-sm">
                  {activeBill.studentName} ({activeBill.classId})
                </span>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Nominal Tagihan (Rp)</label>
                <input
                  type="number"
                  min={activeBill.paidAmount}
                  step={1000}
                  value={editFormData.amount}
                  onChange={(e) => setEditFormData({ ...editFormData, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 font-mono font-bold bg-white border border-gray-200 rounded-lg"
                  required
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Minimal Rp {formatRupiah(activeBill.paidAmount)} (sudah dibayar)
                </p>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Tanggal Jatuh Tempo</label>
                <input
                  type="date"
                  value={editFormData.dueDate}
                  onChange={(e) => setEditFormData({ ...editFormData, dueDate: e.target.value })}
                  className="w-full px-3 py-2 font-semibold bg-white border border-gray-200 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Catatan</label>
                <input
                  type="text"
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 text-white bg-[#531FFF] hover:bg-[#4216d6] rounded-lg font-bold shadow-sm transition-all cursor-pointer"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 13. MODAL BATALKAN TAGIHAN (VOID / CANCEL)                                */}
      {/* ========================================================================= */}
      {isCancelModalOpen && activeBill && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <Ban className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Batalkan Tagihan SPP?</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Tagihan <strong>{activeBill.invoiceNo}</strong> untuk {activeBill.studentName} akan diubah statusnya
                  menjadi <strong>Cancelled</strong> dan tidak akan ditagihkan lagi.
                </p>
              </div>

              <div className="text-left text-xs">
                <label className="block font-bold text-gray-700 mb-1">Alasan Pembatalan</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Contoh: Siswa pindah sekolah / Penerima beasiswa penuh yayasan"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg h-20"
                  required
                />
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleConfirmCancel}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  {submitting ? "Memproses..." : "Ya, Batalkan Tagihan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 14. CUSTOM DELETE CONFIRMATION MODAL                                      */}
      {/* ========================================================================= */}
      {deleteModalState.isOpen && deleteModalState.bill && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Hapus Tagihan SPP?</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Apakah Anda yakin ingin menghapus tagihan <strong>{deleteModalState.bill.invoiceNo}</strong> milik{" "}
                  <strong>{deleteModalState.bill.studentName}</strong> ({deleteModalState.bill.periodMonth}) secara
                  permanen dari database?
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalState({ isOpen: false, bill: null, loading: false })}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={deleteModalState.loading}
                  onClick={handleConfirmDelete}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  {deleteModalState.loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Ya, Hapus Tagihan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print CSS Styles */}
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
