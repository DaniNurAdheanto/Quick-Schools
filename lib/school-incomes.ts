"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { db } from "@/lib/firebase";
import {
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

export type IncomeCategory =
  | "BOS Reguler"
  | "BOS Kinerja"
  | "BOS Afirmasi"
  | "Bantuan Pemerintah"
  | "Donasi & CSR"
  | "Sumbangan Alumni & Wali"
  | "Hibah Lembaga"
  | "Unit Usaha & Koperasi"
  | "Lainnya";

export type IncomePaymentMethod = "Transfer Bank" | "Tunai / Kas Sekolah" | "Cek / Giro";

export interface SchoolIncome {
  id: string;
  title: string;
  category: IncomeCategory;
  sourceName: string;
  amount: number;
  receivedDate: string; // YYYY-MM-DD
  paymentMethod: IncomePaymentMethod;
  accountDestination: string;
  referenceNumber?: string;
  description?: string;
  proofName?: string;
  proofUrl?: string;
  academicYear: string; // e.g. "2026/2027"
  semester: "Ganjil" | "Genap";
  recordedBy?: string;
  status: "Diterima" | "Pending" | "Dibatalkan";
  createdAt: string;
  updatedAt?: string;
}

export const INCOME_CATEGORIES: { id: IncomeCategory; label: string; color: string; bg: string; border: string }[] = [
  { id: "BOS Reguler", label: "BOS Reguler", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  { id: "BOS Kinerja", label: "BOS Kinerja", color: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-200" },
  { id: "BOS Afirmasi", label: "BOS Afirmasi", color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
  { id: "Bantuan Pemerintah", label: "Bantuan Pemerintah (APBD/DAK)", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  { id: "Donasi & CSR", label: "Donasi & CSR Perusahaan", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  { id: "Sumbangan Alumni & Wali", label: "Sumbangan Alumni / Wali", color: "text-cyan-700", bg: "bg-cyan-50", border: "border-cyan-200" },
  { id: "Hibah Lembaga", label: "Hibah Yayasan / Lembaga", color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200" },
  { id: "Unit Usaha & Koperasi", label: "Unit Usaha & Koperasi", color: "text-teal-700", bg: "bg-teal-50", border: "border-teal-200" },
  { id: "Lainnya", label: "Sumber Dana Lainnya", color: "text-slate-700", bg: "bg-slate-50", border: "border-slate-200" },
];

export const INCOME_PAYMENT_METHODS: IncomePaymentMethod[] = [
  "Transfer Bank",
  "Tunai / Kas Sekolah",
  "Cek / Giro",
];

export const PRESET_ACCOUNTS = [
  "Bank BNI - 0987654321 (Rekening Giro BOS)",
  "Bank Mandiri - 137001928491 (Rekening Sarpras & Hibah)",
  "Bank BRI - 0129847192 (Rekening Operasional Sekolah)",
  "Bank BSI - 7192837482 (Kas Pembangunan & Ibadah)",
  "Kas Tunai Bendahara Sekolah",
];

const LOCAL_STORAGE_KEY = "quick_schools_school_incomes_v1";

const INITIAL_MOCK_INCOMES: SchoolIncome[] = [
  {
    id: "INC-2026-001",
    title: "Pencairan Dana BOS Reguler Tahap II 2026",
    category: "BOS Reguler",
    sourceName: "Kemendikbudristek RI",
    amount: 245000000,
    receivedDate: "2026-08-15",
    paymentMethod: "Transfer Bank",
    accountDestination: "Bank BNI - 0987654321 (Rekening Giro BOS)",
    referenceNumber: "SP2D/BOS/2026/08/042",
    description: "Dana BOS Reguler gelombang II untuk belanja operasional sekolah, langganan daya dan jasa, serta pemeliharaan sarana.",
    proofName: "SP2D_BOS_Reguler_Tahap2.pdf",
    academicYear: "2026/2027",
    semester: "Ganjil",
    recordedBy: "Bendahara BOS",
    status: "Diterima",
    createdAt: "2026-08-15T09:30:00Z",
  },
  {
    id: "INC-2026-002",
    title: "Bantuan Hibah Revitalisasi Laboratorium Komputer",
    category: "Hibah Lembaga",
    sourceName: "Yayasan Pendidikan Nusantara",
    amount: 75000000,
    receivedDate: "2026-09-02",
    paymentMethod: "Transfer Bank",
    accountDestination: "Bank Mandiri - 137001928491 (Rekening Sarpras & Hibah)",
    referenceNumber: "HB-LAB/IX/2026/01",
    description: "Bantuan dana pengadaan 20 unit komputer desktop dan upgrade server CBT ujian sekolah.",
    proofName: "Surat_Keputusan_Hibah_Lab.pdf",
    academicYear: "2026/2027",
    semester: "Ganjil",
    recordedBy: "Staff Keuangan",
    status: "Diterima",
    createdAt: "2026-09-02T11:15:00Z",
  },
  {
    id: "INC-2026-003",
    title: "Program CSR Beasiswa & Peralatan Belajar Digital",
    category: "Donasi & CSR",
    sourceName: "PT Telekomunikasi Indonesia Tbk",
    amount: 50000000,
    receivedDate: "2026-07-28",
    paymentMethod: "Transfer Bank",
    accountDestination: "Bank BRI - 0129847192 (Rekening Operasional Sekolah)",
    referenceNumber: "CSR/TELKOM/EDU/07/2026",
    description: "Alokasi program CSR Telkom Peduli Pendidikan untuk beasiswa siswa berprestasi dan kuota internet sekolah.",
    proofName: "MoU_CSR_Telkom_2026.pdf",
    academicYear: "2026/2027",
    semester: "Ganjil",
    recordedBy: "Wakasek Humas",
    status: "Diterima",
    createdAt: "2026-07-28T14:00:00Z",
  },
  {
    id: "INC-2026-004",
    title: "Bantuan Operasional Sekolah Daerah (BOSDA)",
    category: "Bantuan Pemerintah",
    sourceName: "Dinas Pendidikan Provinsi",
    amount: 110000000,
    receivedDate: "2026-09-10",
    paymentMethod: "Transfer Bank",
    accountDestination: "Bank BNI - 0987654321 (Rekening Giro BOS)",
    referenceNumber: "BOSDA/DISDIK/IX/2026/19",
    description: "Subsidi BOSDA untuk pembiayaan kegiatan ekstrakurikuler, lomba kesiswaan, dan pembinaan guru.",
    proofName: "SK_Gubernur_BOSDA_2026.pdf",
    academicYear: "2026/2027",
    semester: "Ganjil",
    recordedBy: "Bendahara Sekolah",
    status: "Diterima",
    createdAt: "2026-09-10T10:00:00Z",
  },
  {
    id: "INC-2026-005",
    title: "Sumbangan Sukarela Pembangunan Kanopi Lapangan",
    category: "Sumbangan Alumni & Wali",
    sourceName: "Paguyuban Alumni & Komite Sekolah",
    amount: 32500000,
    receivedDate: "2026-08-20",
    paymentMethod: "Transfer Bank",
    accountDestination: "Bank BSI - 7192837482 (Kas Pembangunan & Ibadah)",
    referenceNumber: "INFAQ/KNP/VIII/2026",
    description: "Sumbangan swadaya untuk peneduh kanopi lapangan upacara dan olahraga outdoor.",
    proofName: "Bukti_Setor_Bank_BSI.jpg",
    academicYear: "2026/2027",
    semester: "Ganjil",
    recordedBy: "Komite Sekolah",
    status: "Diterima",
    createdAt: "2026-08-20T16:20:00Z",
  },
  {
    id: "INC-2026-006",
    title: "Bagi Hasil SHU Koperasi & Sewa Kantin Sekolah",
    category: "Unit Usaha & Koperasi",
    sourceName: "Koperasi Siswa Mandiri & Pengelola Kantin",
    amount: 14200000,
    receivedDate: "2026-09-25",
    paymentMethod: "Tunai / Kas Sekolah",
    accountDestination: "Kas Tunai Bendahara Sekolah",
    referenceNumber: "SHU/KANTIN/IX/2026",
    description: "Setoran rutin pendapatan sewa kios kantin dan bagi hasil penjualan atribut seragam koperasi.",
    proofName: "Kwitansi_Kas_Kantin_Sep26.pdf",
    academicYear: "2026/2027",
    semester: "Ganjil",
    recordedBy: "Kasir Sekolah",
    status: "Diterima",
    createdAt: "2026-09-25T13:45:00Z",
  },
  // Archive data for 2025/2026 (Preserved past year)
  {
    id: "INC-2025-001",
    title: "Dana BOS Reguler Tahap I 2025/2026",
    category: "BOS Reguler",
    sourceName: "Kemendikbudristek RI",
    amount: 230000000,
    receivedDate: "2025-08-10",
    paymentMethod: "Transfer Bank",
    accountDestination: "Bank BNI - 0987654321 (Rekening Giro BOS)",
    referenceNumber: "SP2D/BOS/2025/08/011",
    description: "Dana BOS Reguler T.A. 2025/2026 Semester Ganjil.",
    proofName: "SP2D_BOS_2025_Tahap1.pdf",
    academicYear: "2025/2026",
    semester: "Ganjil",
    recordedBy: "Bendahara BOS",
    status: "Diterima",
    createdAt: "2025-08-10T10:00:00Z",
  },
  {
    id: "INC-2025-002",
    title: "Hibah Pengadaan Buku Perpustakaan Digital",
    category: "Hibah Lembaga",
    sourceName: "Perpustakaan Nasional RI",
    amount: 40000000,
    receivedDate: "2026-02-15",
    paymentMethod: "Transfer Bank",
    accountDestination: "Bank Mandiri - 137001928491 (Rekening Sarpras & Hibah)",
    referenceNumber: "PERPUS/HB/2026/02",
    description: "Bantuan literasi buku digital T.A. 2025/2026 Semester Genap.",
    proofName: "Berita_Acara_Hibah_Buku.pdf",
    academicYear: "2025/2026",
    semester: "Genap",
    recordedBy: "Kepala Perpustakaan",
    status: "Diterima",
    createdAt: "2026-02-15T11:00:00Z",
  },
];

export function useSchoolIncomes(targetAcademicYear?: string, targetSemester?: string) {
  const [allIncomes, setAllIncomes] = useState<SchoolIncome[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {
        console.warn("Failed reading cached school incomes:", e);
      }
    }
    return INITIAL_MOCK_INCOMES;
  });

  const [isLoading, setIsLoading] = useState(true);

  // Sync to localStorage
  const saveLocal = useCallback((items: SchoolIncome[]) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
      } catch (e) {
        console.warn("Failed saving school incomes cache:", e);
      }
    }
  }, []);

  // Listen to Firestore
  useEffect(() => {
    const docRef = doc(db, "roles", "school_incomes");
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (Array.isArray(data.incomes) && data.incomes.length > 0) {
            setAllIncomes(data.incomes);
            saveLocal(data.incomes);
          }
        }
        setIsLoading(false);
      },
      (err) => {
        console.warn("Firestore school_incomes listen warning (using local cache):", err.message);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [saveLocal]);

  // Persist update to Firestore & Local Cache
  const persistIncomes = useCallback(
    async (updated: SchoolIncome[]) => {
      setAllIncomes(updated);
      saveLocal(updated);

      try {
        await setDoc(
          doc(db, "roles", "school_incomes"),
          {
            incomes: updated,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (err: any) {
        console.warn("Firestore sync warning (stored in local cache):", err.message);
      }
    },
    [saveLocal]
  );

  // CRUD Actions
  const addIncome = useCallback(
    async (data: Omit<SchoolIncome, "id" | "createdAt" | "status"> & { status?: "Diterima" | "Pending" | "Dibatalkan" }) => {
      const newIncome: SchoolIncome = {
        ...data,
        id: `INC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        status: data.status || "Diterima",
        createdAt: new Date().toISOString(),
      };

      const next = [newIncome, ...allIncomes];
      await persistIncomes(next);
      return newIncome;
    },
    [allIncomes, persistIncomes]
  );

  const updateIncome = useCallback(
    async (id: string, updates: Partial<SchoolIncome>) => {
      const next = allIncomes.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
        }
        return item;
      });

      await persistIncomes(next);
    },
    [allIncomes, persistIncomes]
  );

  const deleteIncome = useCallback(
    async (id: string) => {
      const next = allIncomes.filter((item) => item.id !== id);
      await persistIncomes(next);
    },
    [allIncomes, persistIncomes]
  );

  // Filtered by academic year and optional semester
  const incomes = useMemo(() => {
    let result = allIncomes;
    if (targetAcademicYear) {
      result = result.filter((inc) => inc.academicYear === targetAcademicYear);
    }
    if (targetSemester) {
      result = result.filter((inc) => inc.semester === targetSemester);
    }
    return result;
  }, [allIncomes, targetAcademicYear, targetSemester]);

  // Financial Stats & Aggregations
  const stats = useMemo(() => {
    const totalAmount = incomes.reduce((sum, item) => sum + (item.status === "Diterima" ? item.amount : 0), 0);
    const totalCount = incomes.length;

    // Group by category
    const byCategory: Record<string, { count: number; total: number; percentage: number }> = {};
    INCOME_CATEGORIES.forEach((cat) => {
      byCategory[cat.id] = { count: 0, total: 0, percentage: 0 };
    });

    incomes.forEach((item) => {
      if (item.status === "Diterima") {
        const cat = item.category || "Lainnya";
        if (!byCategory[cat]) {
          byCategory[cat] = { count: 0, total: 0, percentage: 0 };
        }
        byCategory[cat].count += 1;
        byCategory[cat].total += item.amount;
      }
    });

    Object.keys(byCategory).forEach((key) => {
      if (totalAmount > 0) {
        byCategory[key].percentage = Math.round((byCategory[key].total / totalAmount) * 100);
      }
    });

    // Special category groups
    const totalBOS = (byCategory["BOS Reguler"]?.total || 0) + (byCategory["BOS Kinerja"]?.total || 0) + (byCategory["BOS Afirmasi"]?.total || 0);
    const totalGov = (byCategory["Bantuan Pemerintah"]?.total || 0);
    const totalDonation = (byCategory["Donasi & CSR"]?.total || 0) + (byCategory["Sumbangan Alumni & Wali"]?.total || 0);
    const totalGrant = (byCategory["Hibah Lembaga"]?.total || 0);
    const totalBiz = (byCategory["Unit Usaha & Koperasi"]?.total || 0);
    const totalOthers = (byCategory["Lainnya"]?.total || 0);

    return {
      totalAmount,
      totalCount,
      byCategory,
      totalBOS,
      totalGov,
      totalDonation,
      totalGrant,
      totalBiz,
      totalOthers,
    };
  }, [incomes]);

  return {
    allIncomes,
    incomes,
    stats,
    isLoading,
    addIncome,
    updateIncome,
    deleteIncome,
  };
}
