import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import {
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

export type PaymentStatus = "Paid" | "Partial" | "Unpaid" | "Overdue" | "Cancelled";

export interface PaymentTransaction {
  id: string;
  billId: string;
  receiptNo: string; // e.g. "KW-SPP/2026/09/0001"
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  paymentMethod: string; // "Cash / Tunai di Kasir", "Transfer Bank BCA", "Mandiri Virtual Account", "QRIS Standard", etc.
  referenceNo?: string;
  cashierName: string;
  notes?: string;
  createdAt: string;
}

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
  amount: number;      // Total Bill (Tagihan) e.g. 500000
  paidAmount: number;  // Total Paid (Dibayar) e.g. 250000
  remainingAmount: number; // Remaining (Sisa) e.g. 250000
  dueDate: string;     // e.g. "2026-09-10"
  status: PaymentStatus;
  transactions: PaymentTransaction[];
  paidAt?: string;     // e.g. "2026-09-08" (date of latest payment)
  paymentMethod?: string; // Latest payment method
  paymentReference?: string;
  cashierName?: string;
  notes?: string;
  cancelledReason?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface SPPRateConfig {
  id: string;
  classLevel: string; // e.g. "Kelas 10", "Kelas 11", "Kelas 12"
  monthlyFee: number;
  defaultDueDay: number; // e.g. 10
  description?: string;
  updatedAt?: string;
}

export interface PaymentActivityLog {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: "CREATE_BILL" | "BULK_GENERATE" | "RECORD_PAYMENT" | "UPDATE_BILL" | "CANCEL_BILL" | "DELETE_BILL" | "UPDATE_RATES" | "UPDATE_CONFIG";
  summary: string;
  details?: any;
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

export interface PaymentMethodDetail {
  id: string;
  name: string;
  category: "cash" | "va" | "transfer" | "qris" | "scholarship";
  categoryLabel: string;
  accountNumber?: string;
  accountName?: string;
  codePrefix?: string;
  nmid?: string;
  location?: string;
  instructions: string[];
  badge?: string;
  isActive?: boolean;
}

export interface SPPTypeOption {
  id: string;
  name: string;
  code: string;
  description: string;
  billingPeriod: "monthly" | "semester" | "yearly";
  isActive: boolean;
}

export interface SPPPaymentMethodConfig extends PaymentMethodDetail {
  isActive: boolean;
}

export interface SPPGeneralConfig {
  isSystemActive: boolean;
  maintenanceNotice: string;
  types: SPPTypeOption[];
  rates: SPPRateConfig[];
  billingCycle: "monthly" | "semester" | "yearly";
  dueDay: number; // 1 - 31
  gracePeriodDays: number;
  lateFee: {
    enabled: boolean;
    type: "fixed" | "percentage" | "per_week";
    amount: number;
    gracePeriodDays: number;
  };
  installment: {
    allowPartial: boolean;
    minInstallmentAmount: number;
    maxInstallments: number;
  };
  paymentMethods: SPPPaymentMethodConfig[];
  updatedAt?: string;
  updatedBy?: string;
}

export const PAYMENT_METHOD_OPTIONS: PaymentMethodDetail[] = [
  {
    id: "cash",
    name: "Tunai / Kasir Tata Usaha",
    category: "cash",
    categoryLabel: "Kasir / Tunai",
    accountName: "Loket Keuangan Tata Usaha Sekolah",
    badge: "Langsung Lunas",
    instructions: [
      "Kunjungi loket kasir tata usaha sekolah pada jam kerja (07.30 - 15.00 WIB).",
      "Sebutkan Nomor Invoice atau NISN siswa kepada petugas kasir.",
      "Lakukan pembayaran tunai sesuai nominal dan terima kuitansi resmi bertanda tangan & stempel."
    ],
  },
  {
    id: "bca_va",
    name: "BCA Virtual Account",
    category: "va",
    categoryLabel: "Virtual Account",
    codePrefix: "88201",
    accountName: "SMART SCHOOL OS",
    badge: "Otomatis 24 Jam",
    instructions: [
      "Buka aplikasi BCA Mobile / myBCA / ATM BCA.",
      "Pilih menu 'Transfer' -> 'BCA Virtual Account'.",
      "Masukkan nomor Virtual Account (Kode Perusahaan: 88201 + NISN).",
      "Periksa nama siswa dan tagihan, lalu selesaikan pembayaran."
    ],
  },
  {
    id: "mandiri_va",
    name: "Mandiri Virtual Account",
    category: "va",
    categoryLabel: "Virtual Account",
    codePrefix: "89110",
    accountName: "SMART SCHOOL OS",
    badge: "Otomatis 24 Jam",
    instructions: [
      "Buka aplikasi Livin' by Mandiri atau ATM Mandiri.",
      "Pilih menu 'Bayar' -> 'Penyedia Jasa' -> Masukkan Kode 89110.",
      "Masukkan NISN siswa sebagai Nomor Pelanggan / VA.",
      "Konfirmasi rincian tagihan dan selesaikan transaksi."
    ],
  },
  {
    id: "bri_va",
    name: "BRI Virtual Account (BRIVA)",
    category: "va",
    categoryLabel: "Virtual Account",
    codePrefix: "72300",
    accountName: "SMART SCHOOL OS",
    badge: "Otomatis 24 Jam",
    instructions: [
      "Buka aplikasi BRImo atau ATM BRI.",
      "Pilih menu 'Tagihan' -> 'BRIVA'.",
      "Masukkan nomor BRIVA (72300 + NISN siswa).",
      "Periksa nama siswa dan jumlah nominal, lalu konfirmasi pembayaran."
    ],
  },
  {
    id: "bni_va",
    name: "BNI Virtual Account",
    category: "va",
    categoryLabel: "Virtual Account",
    codePrefix: "98822",
    accountName: "SMART SCHOOL OS",
    badge: "Otomatis 24 Jam",
    instructions: [
      "Buka BNI Mobile Banking atau ATM BNI.",
      "Pilih menu 'Transfer' -> 'Virtual Account Billing'.",
      "Input nomor VA (98822 + NISN siswa).",
      "Validasi data siswa dan lakukan pembayaran."
    ],
  },
  {
    id: "bsi_va",
    name: "BSI Virtual Account",
    category: "va",
    categoryLabel: "Virtual Account",
    codePrefix: "44501",
    accountName: "SMART SCHOOL OS",
    badge: "Syariah",
    instructions: [
      "Buka aplikasi BSI Mobile atau ATM BSI.",
      "Pilih menu 'Pembayaran' -> 'Institusi Pendidikan'.",
      "Masukkan kode 44501 diikuti nomor NISN siswa.",
      "Konfirmasi nama siswa dan nominal, lalu masukkan PIN."
    ],
  },
  {
    id: "tf_bca",
    name: "Transfer Bank BCA",
    category: "transfer",
    categoryLabel: "Transfer Bank",
    accountNumber: "882-019-2334",
    accountName: "YAYASAN PENDIDIKAN SMART SCHOOL",
    badge: "Transfer Manual",
    instructions: [
      "Transfer antar bank atau sesama BCA ke Rekening 882-019-2334.",
      "Pastikan nama penerima adalah 'YAYASAN PENDIDIKAN SMART SCHOOL'.",
      "Cantumkan No. Invoice pada berita transfer.",
      "Simpan bukti transfer dan tunjukkan ke kasir atau masukkan No. Referensi."
    ],
  },
  {
    id: "tf_mandiri",
    name: "Transfer Bank Mandiri",
    category: "transfer",
    categoryLabel: "Transfer Bank",
    accountNumber: "123-00-998877-6",
    accountName: "YAYASAN PENDIDIKAN SMART SCHOOL",
    badge: "Transfer Manual",
    instructions: [
      "Lakukan transfer ke Rekening Mandiri 123-00-998877-6.",
      "Atas nama penerima: 'YAYASAN PENDIDIKAN SMART SCHOOL'.",
      "Tuliskan No. Tagihan SPP pada kolom berita transfer."
    ],
  },
  {
    id: "tf_bri",
    name: "Transfer Bank BRI",
    category: "transfer",
    categoryLabel: "Transfer Bank",
    accountNumber: "0341-01-000998-30-2",
    accountName: "YAYASAN PENDIDIKAN SMART SCHOOL",
    badge: "Transfer Manual",
    instructions: [
      "Transfer ke Rekening BRI 0341-01-000998-30-2 a.n 'YAYASAN PENDIDIKAN SMART SCHOOL'.",
      "Simpan struk / bukti mutasi transfer."
    ],
  },
  {
    id: "qris",
    name: "QRIS Standar Nasional",
    category: "qris",
    categoryLabel: "QRIS & E-Wallet",
    accountName: "SMART SCHOOL OS (NMID: ID102030405060)",
    badge: "Scan Instan",
    instructions: [
      "Buka aplikasi mobile banking (BCA, Livin, BRImo, BNI) atau e-wallet (GoPay, OVO, DANA, ShopeePay, LinkAja).",
      "Pilih fitur 'Scan / Bayar QRIS'.",
      "Arahkan kamera ke QR Code yang tertera di layar.",
      "Pastikan nama merchant 'SMART SCHOOL OS' dan nominal telah sesuai, lalu konfirmasi bayar."
    ],
  },
  {
    id: "gopay_ovo_dana",
    name: "GoPay / OVO / DANA / ShopeePay",
    category: "qris",
    categoryLabel: "QRIS & E-Wallet",
    accountName: "SMART SCHOOL OFFICIAL WALLET",
    badge: "E-Wallet",
    instructions: [
      "Gunakan menu transfer atau scan QR pada dompet digital Anda.",
      "Ketik nomor referensi invoice pada catatan transfer."
    ],
  },
  {
    id: "scholarship",
    name: "Potongan Beasiswa / KIP",
    category: "scholarship",
    categoryLabel: "Beasiswa",
    badge: "Keringanan Khusus",
    instructions: [
      "Pencatatan subsidi atau pembebasan biaya melalui program beasiswa berprestasi, KIP, atau bantuan yayasan.",
      "Wajib menyertakan Nomor SK atau Surat Keterangan pada kolom referensi."
    ],
  },
];

export const PAYMENT_METHODS = PAYMENT_METHOD_OPTIONS.map((m) => m.name);

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

// Convert numbers into Indonesian words for official receipts
export function angkaKeTerbilang(nilai: number): string {
  if (isNaN(nilai) || nilai === 0) return "Nol Rupiah";
  const satuan = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];

  function bilang(n: number): string {
    n = Math.floor(Math.abs(n));
    if (n < 12) return " " + satuan[n];
    if (n < 20) return bilang(n - 10) + " Belas";
    if (n < 100) return bilang(Math.floor(n / 10)) + " Puluh" + bilang(n % 10);
    if (n < 200) return " Seratus" + bilang(n - 100);
    if (n < 1000) return bilang(Math.floor(n / 100)) + " Ratus" + bilang(n % 100);
    if (n < 2000) return " Seribu" + bilang(n - 1000);
    if (n < 1000000) return bilang(Math.floor(n / 1000)) + " Ribu" + bilang(n % 1000);
    if (n < 1000000000) return bilang(Math.floor(n / 1000000)) + " Juta" + bilang(n % 1000000);
    if (n < 1000000000000) return bilang(Math.floor(n / 1000000000)) + " Miliar" + bilang(n % 1000000000);
    return bilang(Math.floor(n / 1000000000000)) + " Triliun" + bilang(n % 1000000000000);
  }

  return (bilang(nilai).trim() + " Rupiah").replace(/\s+/g, " ");
}

// Automatic computation of payment status based on amounts and due date
export function computeBillStatus(
  amount: number,
  paidAmount: number,
  dueDate: string,
  isCancelled: boolean = false
): PaymentStatus {
  if (isCancelled) return "Cancelled";
  if (paidAmount >= amount && amount > 0) return "Paid";
  
  // Check if overdue
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const isPastDue = Boolean(dueDate && dueDate < todayStr);

  if (paidAmount > 0 && paidAmount < amount) {
    return "Partial";
  }

  if (paidAmount === 0) {
    return isPastDue ? "Overdue" : "Unpaid";
  }

  return isPastDue ? "Overdue" : "Unpaid";
}

const LOCAL_STORAGE_KEY = "quick_schools_spp_bills_real_v3";
const RATES_STORAGE_KEY = "quick_schools_spp_rates_real_v3";
const ACTIVITIES_STORAGE_KEY = "quick_schools_spp_activities_real_v3";
export const SPP_CONFIG_STORAGE_KEY = "quick_schools_spp_config_real_v3";
const EVENT_NAME = "quick_schools_spp_changed_real_v3";

export const DEFAULT_RATE_CONFIGS: SPPRateConfig[] = [
  { id: "rate-10", classLevel: "Kelas 10", monthlyFee: 500000, defaultDueDay: 10, description: "SPP Tingkat 10 Reguler", updatedAt: "2026-09-01" },
  { id: "rate-11", classLevel: "Kelas 11", monthlyFee: 525000, defaultDueDay: 10, description: "SPP Tingkat 11 Reguler", updatedAt: "2026-09-01" },
  { id: "rate-12", classLevel: "Kelas 12", monthlyFee: 550000, defaultDueDay: 10, description: "SPP Tingkat 12 Reguler + Persiapan PTN", updatedAt: "2026-09-01" },
];

export const DEFAULT_SPP_TYPES: SPPTypeOption[] = [
  {
    id: "type-reguler",
    name: "SPP Reguler (Wajib Bulanan)",
    code: "REG",
    description: "Iuran operasional pendidikan wajib per bulan untuk seluruh siswa aktif.",
    billingPeriod: "monthly",
    isActive: true,
  },
  {
    id: "type-boarding",
    name: "SPP Boarding / Asrama",
    code: "BRD",
    description: "Biaya pendidikan terpadu plus asrama, konsumsi, dan pembinaan santri/boarding.",
    billingPeriod: "monthly",
    isActive: true,
  },
  {
    id: "type-unggulan",
    name: "SPP Program Unggulan / Internasional",
    code: "UNG",
    description: "Program pengayaan kurikulum Cambridge / sertifikasi internasional.",
    billingPeriod: "monthly",
    isActive: true,
  },
  {
    id: "type-subsidi",
    name: "SPP Subsidi / Bantuan KIP",
    code: "SUB",
    description: "Tarif bersubsidi bagi siswa penerima KIP atau beasiswa yayasan.",
    billingPeriod: "monthly",
    isActive: true,
  },
];

export const DEFAULT_SPP_CONFIG: SPPGeneralConfig = {
  isSystemActive: true,
  maintenanceNotice: "Layanan pembayaran SPP sedang dalam pemeliharaan berkala.",
  types: DEFAULT_SPP_TYPES,
  rates: DEFAULT_RATE_CONFIGS,
  billingCycle: "monthly",
  dueDay: 10,
  gracePeriodDays: 3,
  lateFee: {
    enabled: true,
    type: "fixed",
    amount: 25000,
    gracePeriodDays: 3,
  },
  installment: {
    allowPartial: true,
    minInstallmentAmount: 100000,
    maxInstallments: 4,
  },
  paymentMethods: PAYMENT_METHOD_OPTIONS.map((m) => ({
    ...m,
    isActive: true,
  })),
  updatedAt: "2026-09-01T00:00:00.000Z",
  updatedBy: "Admin",
};

export function generateInvoiceNo(periodMonth: string, counter: number): string {
  const parts = periodMonth.split(" ");
  const year = parts[1] || new Date().getFullYear().toString();
  const monthMap: Record<string, string> = {
    Januari: "01",
    Februari: "02",
    Maret: "03",
    April: "04",
    Mei: "05",
    Juni: "06",
    Juli: "07",
    Agustus: "08",
    September: "09",
    Oktober: "10",
    November: "11",
    Desember: "12",
  };
  const monthStr = monthMap[parts[0]] || "09";
  const numStr = String(counter).padStart(3, "0");
  return `INV-SPP/${year}/${monthStr}/${numStr}`;
}

export function generateReceiptNo(counter: number): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const numStr = String(counter).padStart(4, "0");
  return `KW-SPP/${year}/${month}/${numStr}`;
}

// Clean any stale legacy dummy localStorage
function purgeLegacyDummyStorage() {
  if (typeof window === "undefined") return;
  try {
    const legacyKeys = [
      "quick_schools_spp_bills",
      "quick_schools_spp_bills_v2",
      "quick_schools_spp_activities",
      "quick_schools_spp_rates",
    ];
    for (const k of legacyKeys) {
      localStorage.removeItem(k);
    }
  } catch (e) {
    // Ignore
  }
}

export function useSPPPayments() {
  const [bills, setBills] = useState<SPPBill[]>([]);
  const [rateConfigs, setRateConfigs] = useState<SPPRateConfig[]>(DEFAULT_RATE_CONFIGS);
  const [sppConfig, setSppConfig] = useState<SPPGeneralConfig>(DEFAULT_SPP_CONFIG);
  const [activities, setActivities] = useState<PaymentActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Initial Load & Cache Sync
  const loadLocalCache = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      purgeLegacyDummyStorage();

      // Load Bills
      const localBills = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (localBills) {
        const parsed = JSON.parse(localBills);
        if (Array.isArray(parsed)) {
          // Filter out any dummy names if any leaked
          const cleaned = parsed.filter(
            (b) =>
              b &&
              b.studentName !== "Ahmad Fauzi" &&
              b.studentName !== "Ahmad Rizky Pratama" &&
              !String(b.id || "").startsWith("spp-seed-")
          );
          setBills(cleaned);
        }
      }

      // Load Rate Configs
      const localRates = localStorage.getItem(RATES_STORAGE_KEY);
      if (localRates) {
        const parsed = JSON.parse(localRates);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRateConfigs(parsed);
        }
      }

      // Load SPP General Config
      const localConfig = localStorage.getItem(SPP_CONFIG_STORAGE_KEY);
      if (localConfig) {
        const parsed = JSON.parse(localConfig);
        if (parsed && typeof parsed === "object") {
          setSppConfig((prev) => ({
            ...prev,
            ...parsed,
            types: parsed.types && parsed.types.length > 0 ? parsed.types : prev.types,
            rates: parsed.rates && parsed.rates.length > 0 ? parsed.rates : prev.rates,
            paymentMethods:
              parsed.paymentMethods && parsed.paymentMethods.length > 0
                ? parsed.paymentMethods
                : prev.paymentMethods,
          }));
          if (Array.isArray(parsed.rates) && parsed.rates.length > 0) {
            setRateConfigs(parsed.rates);
          }
        }
      }

      // Load Activities
      const localActs = localStorage.getItem(ACTIVITIES_STORAGE_KEY);
      if (localActs) {
        const parsed = JSON.parse(localActs);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(
            (a) => a && a.id !== "act-01" && a.id !== "act-02" && a.id !== "act-03"
          );
          setActivities(cleaned);
        }
      }
    } catch (e) {
      console.warn("SPP loadLocalCache error:", e);
    }
  }, []);

  // Save to Cache
  const saveBillsCache = (updated: SPPBill[]) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event(EVENT_NAME));
    } catch (e) {}
  };

  const saveActivitiesCache = (updated: PaymentActivityLog[]) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}
  };

  const saveRatesCache = (updated: SPPRateConfig[]) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}
  };

  const saveConfigCache = (updated: SPPGeneralConfig) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(SPP_CONFIG_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event(EVENT_NAME));
    } catch (e) {}
  };

  // Activity logger helper
  const logActivity = async (
    action: PaymentActivityLog["action"],
    summary: string,
    details?: any,
    user: string = "Admin Keuangan",
    role: string = "Staff Kasir"
  ) => {
    const newLog: PaymentActivityLog = {
      id: "act-" + Date.now(),
      timestamp:
        new Date().toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }) + " WIB",
      user,
      role,
      action,
      summary,
      details,
    };

    setActivities((prev) => {
      const updated = [newLog, ...prev.slice(0, 99)];
      saveActivitiesCache(updated);
      return updated;
    });

    // Persist to Firestore roles/spp_activities
    try {
      await setDoc(
        doc(db, "roles", "spp_activities"),
        {
          activities: [newLog, ...activities.slice(0, 99)],
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn("Firestore spp_activities write error:", e);
    }
  };

  // 2. Real-Time Firestore Synchronization
  useEffect(() => {
    loadLocalCache();

    // Listener A: Live SPP Bills in Firestore
    const billsDocRef = doc(db, "roles", "spp_bills");
    const unsubBills = onSnapshot(
      billsDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const remoteBills: SPPBill[] = Array.isArray(data.bills) ? data.bills : [];
          // Sanitize & recompute real-time status
          const sanitized = remoteBills.map((b) => {
            const amount = Number(b.amount || 0);
            const paid = Number(b.paidAmount || 0);
            const remaining = Math.max(0, amount - paid);
            const status = computeBillStatus(amount, paid, b.dueDate, b.status === "Cancelled");
            return {
              ...b,
              amount,
              paidAmount: paid,
              remainingAmount: remaining,
              status,
              transactions: Array.isArray(b.transactions) ? b.transactions : [],
            };
          });

          // Sort by invoice descending
          sanitized.sort((a, b) => (b.invoiceNo || "").localeCompare(a.invoiceNo || ""));
          setBills(sanitized);
          saveBillsCache(sanitized);
        } else {
          // Document does not exist yet in DB: initialize empty bills array
          setBills([]);
          saveBillsCache([]);
          setDoc(
            billsDocRef,
            { bills: [], updatedAt: new Date().toISOString() },
            { merge: true }
          ).catch(() => {});
        }
        setLoading(false);
      },
      (error) => {
        console.warn("Firestore spp_bills snapshot error, using local cache:", error);
        loadLocalCache();
        setLoading(false);
      }
    );

    // Listener B: Live Rates Config in Firestore
    const ratesDocRef = doc(db, "roles", "spp_rates");
    const unsubRates = onSnapshot(
      ratesDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (Array.isArray(data.rates) && data.rates.length > 0) {
            setRateConfigs(data.rates);
            saveRatesCache(data.rates);
          }
        } else {
          // Initialize with default template
          setDoc(
            ratesDocRef,
            { rates: DEFAULT_RATE_CONFIGS, updatedAt: new Date().toISOString() },
            { merge: true }
          ).catch(() => {});
        }
      },
      (err) => console.warn("Firestore spp_rates snapshot error:", err)
    );

    // Listener C: Live Activities in Firestore
    const actDocRef = doc(db, "roles", "spp_activities");
    const unsubActs = onSnapshot(
      actDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (Array.isArray(data.activities)) {
            setActivities(data.activities);
            saveActivitiesCache(data.activities);
          }
        }
      },
      (err) => console.warn("Firestore spp_activities snapshot error:", err)
    );

    // Listener D: Live SPP General Settings in Firestore
    const settingsDocRef = doc(db, "roles", "spp_settings");
    const unsubSettings = onSnapshot(
      settingsDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Partial<SPPGeneralConfig>;
          const merged: SPPGeneralConfig = {
            ...DEFAULT_SPP_CONFIG,
            ...data,
            types: data.types && data.types.length > 0 ? data.types : DEFAULT_SPP_TYPES,
            rates: data.rates && data.rates.length > 0 ? data.rates : DEFAULT_RATE_CONFIGS,
            paymentMethods:
              data.paymentMethods && data.paymentMethods.length > 0
                ? data.paymentMethods
                : DEFAULT_SPP_CONFIG.paymentMethods,
          };
          setSppConfig(merged);
          saveConfigCache(merged);
          if (Array.isArray(merged.rates) && merged.rates.length > 0) {
            setRateConfigs(merged.rates);
            saveRatesCache(merged.rates);
          }
        } else {
          // Initialize in DB
          setDoc(
            settingsDocRef,
            { ...DEFAULT_SPP_CONFIG, updatedAt: new Date().toISOString() },
            { merge: true }
          ).catch(() => {});
        }
      },
      (err) => console.warn("Firestore spp_settings snapshot error:", err)
    );

    // Cross-tab sync
    const handleStorageChange = () => {
      loadLocalCache();
    };
    window.addEventListener(EVENT_NAME, handleStorageChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      unsubBills();
      unsubRates();
      unsubActs();
      unsubSettings();
      window.removeEventListener(EVENT_NAME, handleStorageChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [loadLocalCache]);

  // Helper to persist bills array to Firestore
  const syncBillsToFirestore = async (newBillsList: SPPBill[]) => {
    try {
      await setDoc(
        doc(db, "roles", "spp_bills"),
        {
          bills: newBillsList,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn("Could not sync spp_bills to Firestore:", err);
    }
  };

  // 3. Database CRUD Operations

  // Create single bill
  const createBill = async (
    billData: Omit<SPPBill, "id" | "paidAmount" | "remainingAmount" | "status" | "transactions"> & {
      amount: number;
      initialPaid?: number;
      initialStatus?: PaymentStatus;
    }
  ) => {
    const id = "spp-" + Date.now();
    const paid = Number(billData.initialPaid || 0);
    const amount = Number(billData.amount || 0);
    const remaining = Math.max(0, amount - paid);
    const status = billData.initialStatus || computeBillStatus(amount, paid, billData.dueDate);

    const initialTransactions: PaymentTransaction[] =
      paid > 0
        ? [
            {
              id: "trx-" + Date.now(),
              billId: id,
              receiptNo: generateReceiptNo(bills.length + 1),
              amount: paid,
              paymentDate: new Date().toISOString().split("T")[0],
              paymentMethod: billData.paymentMethod || "Cash / Tunai di Kasir",
              referenceNo: billData.paymentReference || "-",
              cashierName: billData.cashierName || "Kasir Sekolah",
              notes: "Pembayaran awal saat penerbitan tagihan",
              createdAt: new Date().toISOString(),
            },
          ]
        : [];

    const newBill: SPPBill = {
      ...billData,
      id,
      amount,
      paidAmount: paid,
      remainingAmount: remaining,
      status,
      transactions: initialTransactions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Update local state immediately
    const updated = [newBill, ...bills];
    setBills(updated);
    saveBillsCache(updated);

    // Save directly to Firestore database
    await syncBillsToFirestore(updated);

    // Best-effort redundant sync to payments collection
    try {
      setDoc(doc(db, "payments", id), {
        ...newBill,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    } catch (e) {}

    await logActivity(
      "CREATE_BILL",
      `Menerbitkan tagihan SPP ${newBill.invoiceNo} untuk ${newBill.studentName} (${newBill.classId}) nominal ${formatRupiah(amount)}`,
      { invoiceNo: newBill.invoiceNo, studentId: newBill.studentId, amount }
    );

    return newBill;
  };

  // Bulk generate bills for a class/period
  const bulkCreateBills = async (
    newBillsData: Array<
      Omit<SPPBill, "id" | "paidAmount" | "remainingAmount" | "status" | "transactions">
    >
  ) => {
    const createdBills: SPPBill[] = newBillsData.map((data, index) => {
      const id = "spp-" + Date.now() + "-" + index;
      const amount = Number(data.amount || 0);
      return {
        ...data,
        id,
        amount,
        paidAmount: 0,
        remainingAmount: amount,
        status: computeBillStatus(amount, 0, data.dueDate),
        transactions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    const updated = [...createdBills, ...bills];
    setBills(updated);
    saveBillsCache(updated);

    // Save directly to Firestore database
    await syncBillsToFirestore(updated);

    // Redundant best-effort payments collection sync
    for (const bill of createdBills) {
      try {
        setDoc(doc(db, "payments", bill.id), {
          ...bill,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      } catch (e) {}
    }

    const totalNominal = createdBills.reduce((acc, curr) => acc + curr.amount, 0);
    await logActivity(
      "BULK_GENERATE",
      `Penerbitan tagihan massal untuk ${createdBills.length} siswa dengan total ${formatRupiah(totalNominal)}`,
      { count: createdBills.length, totalNominal }
    );

    return createdBills;
  };

  // Record payment (with partial payment / installment support)
  const recordPayment = async (
    billId: string,
    paymentDetails: {
      amount: number;
      paymentDate: string;
      paymentMethod: string;
      referenceNo?: string;
      cashierName?: string;
      notes?: string;
    }
  ) => {
    const existing = bills.find((b) => b.id === billId);
    if (!existing) throw new Error("Tagihan tidak ditemukan");

    const payAmount = Number(paymentDetails.amount);
    if (payAmount <= 0) throw new Error("Nominal pembayaran harus lebih dari 0");

    const newPaidAmount = existing.paidAmount + payAmount;
    const newRemaining = Math.max(0, existing.amount - newPaidAmount);
    const newStatus = computeBillStatus(existing.amount, newPaidAmount, existing.dueDate);

    // Calculate total transactions counter across all bills
    const totalTransactions = bills.reduce(
      (acc, b) => acc + (b.transactions?.length || 0),
      0
    );
    const receiptNo = generateReceiptNo(totalTransactions + 1);

    const newTransaction: PaymentTransaction = {
      id: "trx-" + Date.now(),
      billId,
      receiptNo,
      amount: payAmount,
      paymentDate: paymentDetails.paymentDate || new Date().toISOString().split("T")[0],
      paymentMethod: paymentDetails.paymentMethod,
      referenceNo: paymentDetails.referenceNo || "-",
      cashierName: paymentDetails.cashierName || "Kasir Sekolah",
      notes:
        paymentDetails.notes || (newRemaining === 0 ? "Pelunasan" : "Pembayaran Cicilan"),
      createdAt: new Date().toISOString(),
    };

    const updatedBill: SPPBill = {
      ...existing,
      paidAmount: newPaidAmount,
      remainingAmount: newRemaining,
      status: newStatus,
      paidAt: paymentDetails.paymentDate,
      paymentMethod: paymentDetails.paymentMethod,
      paymentReference: paymentDetails.referenceNo,
      cashierName: paymentDetails.cashierName || "Kasir Sekolah",
      transactions: [...(existing.transactions || []), newTransaction],
      updatedAt: new Date().toISOString(),
    };

    const updatedList = bills.map((b) => (b.id === billId ? updatedBill : b));
    setBills(updatedList);
    saveBillsCache(updatedList);

    // Save directly to Firestore database
    await syncBillsToFirestore(updatedList);

    // Best-effort payments collection sync
    try {
      setDoc(doc(db, "payments", billId), {
        ...updatedBill,
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    } catch (e) {}

    await logActivity(
      "RECORD_PAYMENT",
      `Mencatat pembayaran ${formatRupiah(payAmount)} untuk ${existing.studentName} (${existing.invoiceNo}) via ${paymentDetails.paymentMethod}. Kuitansi: ${receiptNo}`,
      {
        invoiceNo: existing.invoiceNo,
        receiptNo,
        amount: payAmount,
        status: newStatus,
        remainingAmount: newRemaining,
      }
    );

    return { updatedBill, newTransaction };
  };

  // Update existing bill details
  const updateBill = async (billId: string, updates: Partial<SPPBill>) => {
    const existing = bills.find((b) => b.id === billId);
    if (!existing) throw new Error("Tagihan tidak ditemukan");

    const amount = updates.amount !== undefined ? Number(updates.amount) : existing.amount;
    const paidAmount =
      updates.paidAmount !== undefined ? Number(updates.paidAmount) : existing.paidAmount;
    const remainingAmount = Math.max(0, amount - paidAmount);
    const status =
      updates.status || computeBillStatus(amount, paidAmount, updates.dueDate || existing.dueDate);

    const updatedBill: SPPBill = {
      ...existing,
      ...updates,
      amount,
      paidAmount,
      remainingAmount,
      status,
      updatedAt: new Date().toISOString(),
    };

    const updatedList = bills.map((b) => (b.id === billId ? updatedBill : b));
    setBills(updatedList);
    saveBillsCache(updatedList);

    // Save directly to Firestore database
    await syncBillsToFirestore(updatedList);

    // Best effort payments collection sync
    try {
      setDoc(doc(db, "payments", billId), {
        ...updatedBill,
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    } catch (e) {}

    await logActivity(
      "UPDATE_BILL",
      `Memperbarui data tagihan ${existing.invoiceNo} milik ${existing.studentName}`,
      { invoiceNo: existing.invoiceNo, updates }
    );

    return updatedBill;
  };

  // Cancel / Void bill
  const cancelBill = async (billId: string, reason: string) => {
    const existing = bills.find((b) => b.id === billId);
    if (!existing) return;

    const updatedBill: SPPBill = {
      ...existing,
      status: "Cancelled",
      cancelledReason: reason || "Dibatalkan oleh Administrator",
      updatedAt: new Date().toISOString(),
    };

    const updatedList = bills.map((b) => (b.id === billId ? updatedBill : b));
    setBills(updatedList);
    saveBillsCache(updatedList);

    // Save directly to Firestore database
    await syncBillsToFirestore(updatedList);

    // Best effort payments collection sync
    try {
      setDoc(doc(db, "payments", billId), {
        ...updatedBill,
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    } catch (e) {}

    await logActivity(
      "CANCEL_BILL",
      `Membatalkan tagihan ${existing.invoiceNo} (${existing.studentName}) dengan alasan: ${reason || "Dibatalkan"}`,
      { invoiceNo: existing.invoiceNo, reason }
    );
  };

  // Delete bill permanently
  const deleteBill = async (billId: string) => {
    const target = bills.find((b) => b.id === billId);
    const updated = bills.filter((b) => b.id !== billId);
    setBills(updated);
    saveBillsCache(updated);

    // Save directly to Firestore database
    await syncBillsToFirestore(updated);

    // Best effort payments collection delete
    try {
      deleteDoc(doc(db, "payments", billId)).catch(() => {});
    } catch (e) {}

    if (target) {
      await logActivity(
        "DELETE_BILL",
        `Menghapus tagihan ${target.invoiceNo} (${target.studentName}, ${target.periodMonth})`,
        { invoiceNo: target.invoiceNo, studentName: target.studentName }
      );
    }
  };

  // Update Rate Configs
  const updateRateConfigs = async (newRates: SPPRateConfig[]) => {
    setRateConfigs(newRates);
    saveRatesCache(newRates);

    // Save directly to Firestore database
    try {
      await setDoc(
        doc(db, "roles", "spp_rates"),
        {
          rates: newRates,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn("Firestore spp_rates update error:", e);
    }

    await logActivity(
      "UPDATE_RATES",
      "Memperbarui struktur tarif SPP sekolah",
      { rates: newRates }
    );
  };

  // Update Comprehensive General SPP Config
  const updateSPPConfig = async (newConfig: Partial<SPPGeneralConfig>) => {
    const merged: SPPGeneralConfig = {
      ...sppConfig,
      ...newConfig,
      updatedAt: new Date().toISOString(),
    };

    setSppConfig(merged);
    saveConfigCache(merged);

    // Keep rateConfigs in sync if provided
    if (Array.isArray(merged.rates) && merged.rates.length > 0) {
      setRateConfigs(merged.rates);
      saveRatesCache(merged.rates);
      try {
        await setDoc(
          doc(db, "roles", "spp_rates"),
          { rates: merged.rates, updatedAt: new Date().toISOString() },
          { merge: true }
        );
      } catch (e) {}
    }

    // Save directly to Firestore database roles/spp_settings
    try {
      await setDoc(doc(db, "roles", "spp_settings"), merged, { merge: true });
    } catch (e) {
      console.warn("Firestore spp_settings update error:", e);
    }

    // Redundant mirror sync to settings/spp_configuration
    try {
      await setDoc(doc(db, "settings", "spp_configuration"), merged, { merge: true });
    } catch (e) {}

    await logActivity(
      "UPDATE_CONFIG",
      "Memperbarui seluruh konfigurasi & kebijakan pembayaran SPP sekolah",
      {
        isSystemActive: merged.isSystemActive,
        dueDay: merged.dueDay,
        ratesCount: merged.rates.length,
        typesCount: merged.types.length,
      }
    );

    return merged;
  };

  return {
    bills,
    rateConfigs,
    sppConfig,
    activities,
    loading,
    createBill,
    bulkCreateBills,
    recordPayment,
    updateBill,
    cancelBill,
    deleteBill,
    updateRateConfigs,
    updateSPPConfig,
    logActivity,
  };
}

// Standalone hook for configuration consumers
export function useSPPConfig() {
  const { sppConfig, updateSPPConfig, loading } = useSPPPayments();
  return { sppConfig, updateSPPConfig, loading };
}

// Helper to compute late fee based on general SPP configuration
export function calculateLateFee(bill: SPPBill, config?: SPPGeneralConfig): number {
  if (!config || !config.lateFee?.enabled) return 0;
  if (bill.status === "Paid" || bill.status === "Cancelled") return 0;
  const dueDate = new Date(bill.dueDate);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
  const graceDays = config.lateFee.gracePeriodDays || 0;
  if (diffDays <= graceDays) return 0;

  if (config.lateFee.type === "fixed") {
    return config.lateFee.amount;
  } else if (config.lateFee.type === "percentage") {
    return Math.round((bill.remainingAmount * config.lateFee.amount) / 100);
  } else if (config.lateFee.type === "per_week") {
    const overdueWeeks = Math.ceil((diffDays - graceDays) / 7);
    return overdueWeeks * config.lateFee.amount;
  }
  return 0;
}
