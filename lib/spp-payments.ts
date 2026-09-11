import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

export type PaymentStatus = "Lunas" | "Belum Dibayar" | "Menunggu Pembayaran" | "Terlambat";

export interface SPPBill {
  id: string;
  invoiceNo: string;
  studentId: string;
  studentName: string;
  nisn: string;
  classId: string;
  periodMonth: string; // e.g. "September 2026"
  periodYear: string;  // e.g. "2026"
  academicYear: string; // e.g. "2026/2027"
  amount: number;      // e.g. 500000
  dueDate: string;     // e.g. "2026-09-10"
  status: PaymentStatus;
  paidAt?: string;     // e.g. "2026-09-08"
  paymentMethod?: string; // e.g. "Transfer Bank BCA", "Mandiri Virtual Account", "Tunai / Kasir Sekolah", "QRIS"
  paymentReference?: string;
  notes?: string;
  receiptUrl?: string;
  createdAt?: any;
  updatedAt?: any;
}

export const SPP_MONTHS = [
  "Juli 2026",
  "Agustus 2026",
  "September 2026",
  "Oktober 2026",
  "November 2026",
  "Desember 2026",
  "Januari 2027",
  "Februari 2027",
  "Maret 2027",
  "April 2027",
  "Mei 2027",
  "Juni 2027",
];

export const PAYMENT_METHODS = [
  "Transfer Bank BCA",
  "Mandiri Virtual Account",
  "BRI Virtual Account",
  "BNI Virtual Account",
  "QRIS Standard",
  "Tunai / Kasir Sekolah",
  "GoPay / E-Wallet",
];

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

const LOCAL_STORAGE_KEY = "quick_schools_spp_bills";
const EVENT_NAME = "quick_schools_spp_changed";

// Initial realistic default seed bills
export const INITIAL_SEED_BILLS: SPPBill[] = [
  {
    id: "spp-001",
    invoiceNo: "INV-SPP/2026/09/001",
    studentId: "std-01",
    studentName: "Ahmad Fauzi",
    nisn: "0068192831",
    classId: "10 MIPA 1",
    periodMonth: "September 2026",
    periodYear: "2026",
    academicYear: "2026/2027",
    amount: 500000,
    dueDate: "2026-09-10",
    status: "Lunas",
    paidAt: "2026-09-08",
    paymentMethod: "Mandiri Virtual Account",
    paymentReference: "MDR-981249102",
    notes: "Pembayaran tepat waktu via VA Mandiri",
  },
  {
    id: "spp-002",
    invoiceNo: "INV-SPP/2026/09/002",
    studentId: "std-02",
    studentName: "Adinda Putri Rahayu",
    nisn: "0069182301",
    classId: "10 MIPA 1",
    periodMonth: "September 2026",
    periodYear: "2026",
    academicYear: "2026/2027",
    amount: 500000,
    dueDate: "2026-09-10",
    status: "Belum Dibayar",
    notes: "Tagihan rutin bulanan semester ganjil",
  },
  {
    id: "spp-003",
    invoiceNo: "INV-SPP/2026/09/003",
    studentId: "std-03",
    studentName: "Budi Santoso",
    nisn: "0059182049",
    classId: "10 MIPA 2",
    periodMonth: "September 2026",
    periodYear: "2026",
    academicYear: "2026/2027",
    amount: 500000,
    dueDate: "2026-09-10",
    status: "Menunggu Pembayaran",
    paymentMethod: "Transfer Bank BCA",
    paymentReference: "TRF-849182",
    notes: "Bukti transfer diunggah orang tua, menunggu verifikasi kasir",
  },
  {
    id: "spp-004",
    invoiceNo: "INV-SPP/2026/08/004",
    studentId: "std-04",
    studentName: "Citra Lestari",
    nisn: "0061298412",
    classId: "11 IPS 1",
    periodMonth: "Agustus 2026",
    periodYear: "2026",
    academicYear: "2026/2027",
    amount: 500000,
    dueDate: "2026-08-10",
    status: "Terlambat",
    notes: "Lewat jatuh tempo 10 Agustus 2026. Reminder telah terkirim via WA",
  },
  {
    id: "spp-005",
    invoiceNo: "INV-SPP/2026/08/005",
    studentId: "std-01",
    studentName: "Ahmad Fauzi",
    nisn: "0068192831",
    classId: "10 MIPA 1",
    periodMonth: "Agustus 2026",
    periodYear: "2026",
    academicYear: "2026/2027",
    amount: 500000,
    dueDate: "2026-08-10",
    status: "Lunas",
    paidAt: "2026-08-05",
    paymentMethod: "Tunai / Kasir Sekolah",
    paymentReference: "KSR-REC-08129",
    notes: "Lunas di kasir sekolah lantai 1",
  },
  {
    id: "spp-006",
    invoiceNo: "INV-SPP/2026/07/006",
    studentId: "std-02",
    studentName: "Adinda Putri Rahayu",
    nisn: "0069182301",
    classId: "10 MIPA 1",
    periodMonth: "Juli 2026",
    periodYear: "2026",
    academicYear: "2026/2027",
    amount: 500000,
    dueDate: "2026-07-10",
    status: "Lunas",
    paidAt: "2026-07-09",
    paymentMethod: "QRIS Standard",
    paymentReference: "QRIS-82910491",
    notes: "Pembayaran awal tahun ajaran baru",
  },
  {
    id: "spp-007",
    invoiceNo: "INV-SPP/2026/09/007",
    studentId: "std-05",
    studentName: "Dion Pratama",
    nisn: "0058291039",
    classId: "12 MIPA 1",
    periodMonth: "September 2026",
    periodYear: "2026",
    academicYear: "2026/2027",
    amount: 550000,
    dueDate: "2026-09-10",
    status: "Lunas",
    paidAt: "2026-09-02",
    paymentMethod: "Transfer Bank BCA",
    paymentReference: "BCA-192841",
    notes: "SPP Kelas 12 + Ujian Praktik",
  },
  {
    id: "spp-008",
    invoiceNo: "INV-SPP/2026/09/008",
    studentId: "std-06",
    studentName: "Farah Salsabila",
    nisn: "0059283912",
    classId: "12 MIPA 1",
    periodMonth: "September 2026",
    periodYear: "2026",
    academicYear: "2026/2027",
    amount: 550000,
    dueDate: "2026-09-10",
    status: "Belum Dibayar",
    notes: "Tagihan rutin bulanan semester ganjil",
  },
];

export function getLocalBillsSync(): SPPBill[] {
  if (typeof window === "undefined") return INITIAL_SEED_BILLS;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Failed to load SPP bills from localStorage", err);
  }
  return INITIAL_SEED_BILLS;
}

export function saveLocalBillsSync(bills: SPPBill[]) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(bills));
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: bills }));
    } catch (e) {
      console.error("Failed to write SPP bills to localStorage", e);
    }
  }
}

export function generateInvoiceNo(monthStr: string, index: number): string {
  const cleanMonth = monthStr.split(" ")[0] || "BLN";
  const year = monthStr.split(" ")[1] || "2026";
  const num = String(index).padStart(4, "0");
  return `INV-SPP/${year}/${cleanMonth.toUpperCase().slice(0, 3)}/${num}`;
}

export function useSPPPayments() {
  const [bills, setBills] = useState<SPPBill[]>(getLocalBillsSync);
  const [loading, setLoading] = useState(true);

  // Sync with Firestore & localStorage
  useEffect(() => {
    // 1. Load initial cache immediately
    const initial = getLocalBillsSync();
    setBills(initial);
    setLoading(false);

    // 2. Storage & event listener
    const handleLocalEvent = (e: any) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setBills(e.detail);
      } else {
        setBills(getLocalBillsSync());
      }
    };
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_KEY) {
        setBills(getLocalBillsSync());
      }
    };

    window.addEventListener(EVENT_NAME, handleLocalEvent);
    window.addEventListener("storage", handleStorageEvent);

    // 3. Firestore listener on `payments`
    let unsubFirestore: (() => void) | null = null;
    try {
      unsubFirestore = onSnapshot(
        collection(db, "payments"),
        (snap) => {
          if (!snap.empty) {
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SPPBill));
            setBills(list);
            saveLocalBillsSync(list);
          } else {
            // First time seeding if Firestore is completely empty
            const cached = getLocalBillsSync();
            if (cached.length > 0) {
              setBills(cached);
            }
          }
        },
        (error) => {
          console.warn("Firestore payments listener fallback to cache:", error);
        }
      );
    } catch (err) {
      console.warn("Could not subscribe to Firestore payments:", err);
    }

    return () => {
      window.removeEventListener(EVENT_NAME, handleLocalEvent);
      window.removeEventListener("storage", handleStorageEvent);
      if (unsubFirestore) unsubFirestore();
    };
  }, []);

  // Actions
  const createBill = useCallback(
    async (newBillData: Omit<SPPBill, "id" | "createdAt" | "updatedAt">) => {
      const tempId = `spp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const payload: SPPBill = {
        ...newBillData,
        id: tempId,
      };

      // 1. Immediate local update
      const updated = [payload, ...bills];
      setBills(updated);
      saveLocalBillsSync(updated);

      // 2. Firestore sync
      try {
        const docRef = await addDoc(collection(db, "payments"), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        // replace temp id with real id
        const finalUpdated = updated.map((b) => (b.id === tempId ? { ...b, id: docRef.id } : b));
        setBills(finalUpdated);
        saveLocalBillsSync(finalUpdated);
      } catch (err) {
        console.warn("Failed to write bill to Firestore, persisted locally:", err);
      }
    },
    [bills]
  );

  const bulkCreateBills = useCallback(
    async (newBills: Array<Omit<SPPBill, "id" | "createdAt" | "updatedAt">>) => {
      const generatedBills: SPPBill[] = newBills.map((b, idx) => ({
        ...b,
        id: `spp-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
      }));

      const updated = [...generatedBills, ...bills];
      setBills(updated);
      saveLocalBillsSync(updated);

      // Firestore parallel write
      try {
        for (const bill of generatedBills) {
          try {
            await addDoc(collection(db, "payments"), {
              ...bill,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } catch (e) {}
        }
      } catch (err) {
        console.warn("Bulk write to Firestore error:", err);
      }
    },
    [bills]
  );

  const updateBill = useCallback(
    async (id: string, patch: Partial<SPPBill>) => {
      const updated = bills.map((b) => (b.id === id ? { ...b, ...patch } : b));
      setBills(updated);
      saveLocalBillsSync(updated);

      try {
        await setDoc(doc(db, "payments", id), { ...patch, updatedAt: serverTimestamp() }, { merge: true });
      } catch (err) {
        console.warn("Update bill in Firestore error:", err);
      }
    },
    [bills]
  );

  const recordPayment = useCallback(
    async (
      id: string,
      data: {
        paidAt: string;
        paymentMethod: string;
        paymentReference?: string;
        notes?: string;
      }
    ) => {
      const patch: Partial<SPPBill> = {
        status: "Lunas",
        paidAt: data.paidAt || new Date().toISOString().split("T")[0],
        paymentMethod: data.paymentMethod || "Transfer Bank BCA",
        paymentReference: data.paymentReference || `REF-${Date.now().toString().slice(-6)}`,
        notes: data.notes || "Lunas",
      };

      const updated = bills.map((b) => (b.id === id ? { ...b, ...patch } : b));
      setBills(updated);
      saveLocalBillsSync(updated);

      try {
        await setDoc(doc(db, "payments", id), { ...patch, updatedAt: serverTimestamp() }, { merge: true });
      } catch (err) {
        console.warn("Record payment in Firestore error:", err);
      }
    },
    [bills]
  );

  const deleteBill = useCallback(
    async (id: string) => {
      const updated = bills.filter((b) => b.id !== id);
      setBills(updated);
      saveLocalBillsSync(updated);

      try {
        await deleteDoc(doc(db, "payments", id));
      } catch (err) {
        console.warn("Delete bill in Firestore error:", err);
      }
    },
    [bills]
  );

  return {
    bills,
    loading,
    createBill,
    bulkCreateBills,
    updateBill,
    recordPayment,
    deleteBill,
  };
}
