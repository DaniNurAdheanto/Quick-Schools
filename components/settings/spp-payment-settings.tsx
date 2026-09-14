"use client";

import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Plus,
  Trash2,
  Edit2,
  Save,
  RotateCcw,
  ShieldCheck,
  QrCode,
  Banknote,
  GraduationCap,
  Percent,
  X,
  Loader2,
  Sliders,
  Layers,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import {
  SPPGeneralConfig,
  SPPTypeOption,
  SPPRateConfig,
  SPPPaymentMethodConfig,
  DEFAULT_SPP_CONFIG,
  formatRupiah,
  useSPPConfig,
} from "@/lib/spp-payments";

type SettingsSubTab = "general" | "types" | "rates" | "fines_installments" | "methods";

export default function SPPPaymentSettings() {
  const toast = useToast();
  const showSuccess = toast?.showSuccess;
  const showError = toast?.showError;

  const { sppConfig, updateSPPConfig } = useSPPConfig();

  // Local mutable state
  const [formConfig, setFormConfig] = useState<SPPGeneralConfig>(DEFAULT_SPP_CONFIG);
  const [activeSubTab, setActiveSubTab] = useState<SettingsSubTab>("general");
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Modals / Editors state
  const [typeModal, setTypeModal] = useState<{
    isOpen: boolean;
    mode: "add" | "edit";
    data: SPPTypeOption;
  }>({
    isOpen: false,
    mode: "add",
    data: {
      id: "",
      name: "",
      code: "",
      description: "",
      billingPeriod: "monthly",
      isActive: true,
    },
  });

  const [rateModal, setRateModal] = useState<{
    isOpen: boolean;
    mode: "add" | "edit";
    data: SPPRateConfig;
  }>({
    isOpen: false,
    mode: "add",
    data: {
      id: "",
      classLevel: "",
      monthlyFee: 500000,
      defaultDueDay: 10,
      description: "",
    },
  });

  // Sync from remote Firestore/cache config
  useEffect(() => {
    if (sppConfig) {
      setFormConfig(sppConfig);
    }
  }, [sppConfig]);

  // Handle Save to Database
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateSPPConfig(formConfig);
      setHasUnsavedChanges(false);
      showSuccess?.("Pengaturan Pembayaran SPP berhasil disimpan dan diterapkan ke seluruh sistem!");
    } catch (err: any) {
      showError?.(err.message || "Gagal menyimpan pengaturan SPP");
    } finally {
      setSaving(false);
    }
  };

  // Reset to default
  const handleResetDefaults = () => {
    if (confirm("Apakah Anda yakin ingin memulihkan seluruh pengaturan SPP ke standar sistem?")) {
      setFormConfig(DEFAULT_SPP_CONFIG);
      setHasUnsavedChanges(true);
      showSuccess?.("Pengaturan dikembalikan ke standar awal. Klik 'Simpan Pengaturan' untuk menerapkan ke database.");
    }
  };

  // Helper to mark changes
  const updateField = <K extends keyof SPPGeneralConfig>(field: K, val: SPPGeneralConfig[K]) => {
    setFormConfig((prev) => ({ ...prev, [field]: val }));
    setHasUnsavedChanges(true);
  };

  // Type management
  const handleSaveType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeModal.data.name.trim() || !typeModal.data.code.trim()) {
      showError?.("Nama jenis SPP dan kode wajib diisi.");
      return;
    }

    if (typeModal.mode === "add") {
      const newType: SPPTypeOption = {
        ...typeModal.data,
        id: "type-" + Date.now().toString().slice(-6),
      };
      setFormConfig((prev) => ({ ...prev, types: [...prev.types, newType] }));
    } else {
      setFormConfig((prev) => ({
        ...prev,
        types: prev.types.map((t) => (t.id === typeModal.data.id ? typeModal.data : t)),
      }));
    }

    setHasUnsavedChanges(true);
    setTypeModal({ ...typeModal, isOpen: false });
    showSuccess?.(`Jenis SPP '${typeModal.data.name}' berhasil diperbarui.`);
  };

  const handleDeleteType = (id: string, name: string) => {
    if (formConfig.types.length <= 1) {
      showError?.("Minimal harus terdapat 1 jenis SPP aktif pada sistem.");
      return;
    }
    if (confirm(`Hapus jenis SPP '${name}'?`)) {
      setFormConfig((prev) => ({ ...prev, types: prev.types.filter((t) => t.id !== id) }));
      setHasUnsavedChanges(true);
      showSuccess?.(`Jenis SPP '${name}' dihapus.`);
    }
  };

  const handleToggleType = (id: string) => {
    setFormConfig((prev) => ({
      ...prev,
      types: prev.types.map((t) => (t.id === id ? { ...t, isActive: !t.isActive } : t)),
    }));
    setHasUnsavedChanges(true);
  };

  // Rate management
  const handleSaveRate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rateModal.data.classLevel.trim()) {
      showError?.("Tingkat kelas wajib diisi.");
      return;
    }

    if (rateModal.mode === "add") {
      const newRate: SPPRateConfig = {
        ...rateModal.data,
        id: "rate-" + Date.now().toString().slice(-6),
        updatedAt: new Date().toISOString().split("T")[0],
      };
      setFormConfig((prev) => ({ ...prev, rates: [...prev.rates, newRate] }));
    } else {
      setFormConfig((prev) => ({
        ...prev,
        rates: prev.rates.map((r) =>
          r.id === rateModal.data.id
            ? { ...rateModal.data, updatedAt: new Date().toISOString().split("T")[0] }
            : r
        ),
      }));
    }

    setHasUnsavedChanges(true);
    setRateModal({ ...rateModal, isOpen: false });
    showSuccess?.(`Tarif untuk '${rateModal.data.classLevel}' berhasil diperbarui.`);
  };

  const handleDeleteRate = (id: string, classLevel: string) => {
    if (formConfig.rates.length <= 1) {
      showError?.("Minimal harus terdapat 1 tarif kelas pada sistem.");
      return;
    }
    if (confirm(`Hapus tarif untuk '${classLevel}'?`)) {
      setFormConfig((prev) => ({ ...prev, rates: prev.rates.filter((r) => r.id !== id) }));
      setHasUnsavedChanges(true);
      showSuccess?.(`Tarif '${classLevel}' dihapus.`);
    }
  };

  // Payment method toggle
  const handleToggleMethod = (id: string) => {
    setFormConfig((prev) => ({
      ...prev,
      paymentMethods: prev.paymentMethods.map((m) =>
        m.id === id ? { ...m, isActive: !m.isActive } : m
      ),
    }));
    setHasUnsavedChanges(true);
  };

  const handleUpdateMethodDetail = (
    id: string,
    field: keyof SPPPaymentMethodConfig,
    value: any
  ) => {
    setFormConfig((prev) => ({
      ...prev,
      paymentMethods: prev.paymentMethods.map((m) =>
        m.id === id ? { ...m, [field]: value } : m
      ),
    }));
    setHasUnsavedChanges(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Main Actions */}
      <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900">Pengaturan Pembayaran SPP</h2>
                {formConfig.isSystemActive ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Sistem Aktif
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    Sistem Ditangguhkan
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Pusat kendali kebijakan tarif, denda, cicilan, dan metode pembayaran SPP terhubung ke database.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end md:self-center">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
            <span>Reset Standar</span>
          </button>

          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={saving}
            className={cn(
              "px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md cursor-pointer inline-flex items-center gap-2",
              hasUnsavedChanges
                ? "bg-[#531FFF] hover:bg-[#4216d6] shadow-[#531FFF]/25 animate-pulse"
                : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
            )}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? "Menyimpan..." : hasUnsavedChanges ? "Simpan Perubahan *" : "Simpan Pengaturan"}</span>
          </button>
        </div>
      </div>

      {/* Unsaved Changes Alert Bar */}
      {hasUnsavedChanges && (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between text-xs text-purple-900 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#531FFF]" />
            <span>
              Terdapat perubahan konfigurasi yang belum disimpan ke database. Pastikan untuk menekan tombol{" "}
              <strong>Simpan Pengaturan</strong>.
            </span>
          </div>
          <button
            onClick={handleSaveSettings}
            className="px-3 py-1 bg-[#531FFF] hover:bg-[#4216d6] text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs"
          >
            Simpan Sekarang
          </button>
        </div>
      )}

      {/* Quick Status Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Status Layanan</span>
          <span className={cn("text-sm font-black mt-1 block", formConfig.isSystemActive ? "text-emerald-700" : "text-amber-700")}>
            {formConfig.isSystemActive ? "Online & Menerima Pembayaran" : "Ditangguhkan / Pemeliharaan"}
          </span>
          <span className="text-[10px] text-gray-400 block mt-0.5">Berlaku untuk seluruh siswa</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Jatuh Tempo Bulanan</span>
          <span className="text-sm font-mono font-black text-gray-900 mt-1 block">
            Tanggal {formConfig.dueDay} Setiap Bulan
          </span>
          <span className="text-[10px] text-gray-400 block mt-0.5">Toleransi {formConfig.gracePeriodDays} hari</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Denda & Cicilan</span>
          <span className="text-sm font-bold text-gray-900 mt-1 block">
            {formConfig.lateFee.enabled ? formatRupiah(formConfig.lateFee.amount) : "Denda Nonaktif"}
          </span>
          <span className="text-[10px] text-gray-400 block mt-0.5">
            {formConfig.installment.allowPartial ? "Cicilan Diizinkan" : "Wajib Bayar Lunas"}
          </span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Metode Pembayaran</span>
          <span className="text-sm font-black text-[#531FFF] mt-1 block">
            {formConfig.paymentMethods.filter((m) => m.isActive).length} dari {formConfig.paymentMethods.length} Aktif
          </span>
          <span className="text-[10px] text-gray-400 block mt-0.5">VA, QRIS, Bank, Kasir</span>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-2 overflow-x-auto no-scrollbar pb-px">
          {[
            { id: "general", label: "Umum & Jadwal Tagihan", icon: Calendar },
            { id: "types", label: `Jenis SPP (${formConfig.types.length})`, icon: Layers },
            { id: "rates", label: `Tarif per Kelas (${formConfig.rates.length})`, icon: DollarSign },
            { id: "fines_installments", label: "Denda & Cicilan", icon: Percent },
            {
              id: "methods",
              label: `Metode Pembayaran (${formConfig.paymentMethods.filter((m) => m.isActive).length})`,
              icon: CreditCard,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id as SettingsSubTab)}
                className={cn(
                  "flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-xs whitespace-nowrap transition-all cursor-pointer",
                  isActive
                    ? "border-[#531FFF] text-[#531FFF] bg-purple-50/30"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-[#531FFF]" : "text-gray-400")} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ===================================================================== */}
      {/* SUB-TAB 1: UMUM & JADWAL TAGIHAN                                      */}
      {/* ===================================================================== */}
      {activeSubTab === "general" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in duration-200">
          {/* Card: Status Sistem SPP */}
          <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#531FFF]" />
                <h3 className="font-bold text-xs text-gray-900">Status Operasional Sistem SPP</h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formConfig.isSystemActive}
                  onChange={(e) => updateField("isSystemActive", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5.5 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <p className="text-xs text-gray-600">
              Jika dinonaktifkan, siswa tidak dapat melakukan pembayaran mandiri dan muncul pemberitahuan pemeliharaan layanan.
            </p>

            {!formConfig.isSystemActive && (
              <div className="space-y-1.5 pt-2">
                <label className="block text-xs font-bold text-gray-700">Pesan Pengumuman Pemeliharaan</label>
                <textarea
                  rows={3}
                  value={formConfig.maintenanceNotice}
                  onChange={(e) => updateField("maintenanceNotice", e.target.value)}
                  className="w-full p-2.5 text-xs bg-amber-50/60 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 text-gray-800"
                  placeholder="Ketik pesan kepada siswa..."
                />
              </div>
            )}
          </div>

          {/* Card: Siklus & Tanggal Jatuh Tempo */}
          <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <Calendar className="w-4 h-4 text-[#531FFF]" />
              <h3 className="font-bold text-xs text-gray-900">Siklus & Tanggal Jatuh Tempo</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Periode Siklus Penagihan</label>
                <select
                  value={formConfig.billingCycle}
                  onChange={(e) => updateField("billingCycle", e.target.value as any)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20"
                >
                  <option value="monthly">Bulanan (Setiap Bulan) - Standar Sekolah</option>
                  <option value="semester">Semesteran (6 Bulan Sekali)</option>
                  <option value="yearly">Tahunan (1 Tahun Sekali)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Tanggal Jatuh Tempo Bulanan
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={formConfig.dueDay}
                      onChange={(e) => updateField("dueDay", Math.min(31, Math.max(1, Number(e.target.value))))}
                      className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold">
                      tiap bln
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Default: Tanggal 10</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Masa Tenggang (Grace Period)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={formConfig.gracePeriodDays}
                      onChange={(e) => updateField("gracePeriodDays", Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold">
                      hari
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Toleransi keterlambatan</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-TAB 2: JENIS & KATEGORI SPP                                       */}
      {/* ===================================================================== */}
      {activeSubTab === "types" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-gray-900">Daftar Kategori / Jenis SPP</h3>
              <p className="text-[11px] text-gray-500">
                Tentukan variasi tagihan SPP yang berlaku (Reguler, Asrama/Boarding, Program Unggulan, dll).
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setTypeModal({
                  isOpen: true,
                  mode: "add",
                  data: {
                    id: "",
                    name: "",
                    code: "",
                    description: "",
                    billingPeriod: "monthly",
                    isActive: true,
                  },
                })
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#531FFF] hover:bg-[#4216d6] rounded-xl shadow-xs cursor-pointer transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Jenis SPP</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {formConfig.types.map((type) => (
              <div
                key={type.id}
                className={cn(
                  "p-4 rounded-xl border bg-white transition-all flex flex-col justify-between gap-3 shadow-2xs",
                  type.isActive ? "border-gray-200" : "border-gray-200 opacity-60 bg-gray-50/50"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black px-2 py-0.5 bg-purple-100 text-[#531FFF] rounded-md">
                        {type.code}
                      </span>
                      <h4 className="font-bold text-gray-900 text-xs">{type.name}</h4>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{type.description}</p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={type.isActive}
                      onChange={() => handleToggleType(type.id)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4.5 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-gray-100 text-xs">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold">
                    Siklus: {type.billingPeriod === "monthly" ? "Bulanan" : type.billingPeriod}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTypeModal({ isOpen: true, mode: "edit", data: type })}
                      className="p-1.5 text-gray-500 hover:text-[#531FFF] hover:bg-purple-50 rounded-lg cursor-pointer transition-colors"
                      title="Ubah Jenis SPP"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteType(type.id, type.name)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                      title="Hapus Jenis SPP"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-TAB 3: TARIF & NOMINAL PER KELAS                                  */}
      {/* ===================================================================== */}
      {activeSubTab === "rates" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-gray-900">Tarif Standar SPP per Tingkat Kelas</h3>
              <p className="text-[11px] text-gray-500">
                Nominal acuan yang otomatis digunakan saat menerbitkan tagihan tunggal maupun tagihan massal (*bulk generation*).
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setRateModal({
                  isOpen: true,
                  mode: "add",
                  data: {
                    id: "",
                    classLevel: "",
                    monthlyFee: 500000,
                    defaultDueDay: formConfig.dueDay,
                    description: "",
                  },
                })
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#531FFF] hover:bg-[#4216d6] rounded-xl shadow-xs cursor-pointer transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Tingkat / Tarif</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {formConfig.rates.map((rate) => (
              <div
                key={rate.id}
                className="p-4 bg-white rounded-xl border border-gray-200 shadow-2xs flex flex-col justify-between gap-3 hover:border-purple-200 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg">
                      {rate.classLevel}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setRateModal({ isOpen: true, mode: "edit", data: rate })}
                        className="p-1 text-gray-500 hover:text-[#531FFF] hover:bg-purple-50 rounded-lg cursor-pointer"
                        title="Edit Tarif"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRate(rate.id, rate.classLevel)}
                        className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                        title="Hapus Tarif"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3">
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Nominal Tagihan per Bulan</span>
                    <span className="font-mono text-lg font-black text-[#531FFF]">
                      {formatRupiah(rate.monthlyFee)}
                    </span>
                  </div>

                  {rate.description && (
                    <p className="text-[11px] text-gray-500 mt-2">{rate.description}</p>
                  )}
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400 font-medium">
                  <span>Jatuh tempo: Tgl {rate.defaultDueDay || formConfig.dueDay}</span>
                  <span>Diperbarui: {rate.updatedAt || "Aktif"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-TAB 4: DENDA & ATURAN CICILAN (PARTIAL PAYMENT)                   */}
      {/* ===================================================================== */}
      {activeSubTab === "fines_installments" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in duration-200">
          {/* Section: Denda Keterlambatan */}
          <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <h3 className="font-bold text-xs text-gray-900">Kebijakan Denda Keterlambatan</h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formConfig.lateFee.enabled}
                  onChange={(e) => {
                    setFormConfig((prev) => ({
                      ...prev,
                      lateFee: { ...prev.lateFee, enabled: e.target.checked },
                    }));
                    setHasUnsavedChanges(true);
                  }}
                  className="sr-only peer"
                />
                <div className="w-10 h-5.5 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-rose-600"></div>
              </label>
            </div>

            <p className="text-xs text-gray-600">
              Aktifkan sanksi denda otomatis untuk tagihan siswa yang melampaui tanggal jatuh tempo dan batas toleransi.
            </p>

            {formConfig.lateFee.enabled && (
              <div className="space-y-3.5 pt-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Skema Perhitungan Denda</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "fixed", label: "Nominal Tetap (Rp)" },
                      { id: "percentage", label: "Persentase (%)" },
                      { id: "per_week", label: "Denda per Minggu" },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => {
                          setFormConfig((prev) => ({
                            ...prev,
                            lateFee: { ...prev.lateFee, type: mode.id as any },
                          }));
                          setHasUnsavedChanges(true);
                        }}
                        className={cn(
                          "py-2 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center",
                          formConfig.lateFee.type === mode.id
                            ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                        )}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      {formConfig.lateFee.type === "percentage" ? "Besaran Persen (%)" : "Nominal Denda (Rp)"}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formConfig.lateFee.amount}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setFormConfig((prev) => ({
                          ...prev,
                          lateFee: { ...prev.lateFee, amount: val },
                        }));
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500/20"
                    />
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      {formConfig.lateFee.type === "percentage"
                        ? `${formConfig.lateFee.amount}% dari tagihan`
                        : formatRupiah(formConfig.lateFee.amount)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Toleransi Hari (Grace Period)</label>
                    <input
                      type="number"
                      min={0}
                      value={formConfig.lateFee.gracePeriodDays}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setFormConfig((prev) => ({
                          ...prev,
                          lateFee: { ...prev.lateFee, gracePeriodDays: val },
                        }));
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500/20"
                    />
                    <span className="text-[10px] text-gray-400 mt-1 block">Denda berlaku setelah {formConfig.lateFee.gracePeriodDays} hari</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section: Aturan Cicilan (Partial Payment) */}
          <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#531FFF]" />
                <h3 className="font-bold text-xs text-gray-900">Aturan Cicilan & Pembayaran Parsial</h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formConfig.installment.allowPartial}
                  onChange={(e) => {
                    setFormConfig((prev) => ({
                      ...prev,
                      installment: { ...prev.installment, allowPartial: e.target.checked },
                    }));
                    setHasUnsavedChanges(true);
                  }}
                  className="sr-only peer"
                />
                <div className="w-10 h-5.5 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-[#531FFF]"></div>
              </label>
            </div>

            <p className="text-xs text-gray-600">
              Jika aktif, siswa dapat membayar tagihan secara bertahap (cicilan 50%, 25%, atau nominal kustom) hingga lunas.
            </p>

            {formConfig.installment.allowPartial ? (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Minimal Sekali Cicil (Rp)
                  </label>
                  <input
                    type="number"
                    min={10000}
                    step={10000}
                    value={formConfig.installment.minInstallmentAmount}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setFormConfig((prev) => ({
                        ...prev,
                        installment: { ...prev.installment, minInstallmentAmount: val },
                      }));
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20"
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    {formatRupiah(formConfig.installment.minInstallmentAmount)}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Maksimal Frekuensi Cicilan
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={formConfig.installment.maxInstallments}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setFormConfig((prev) => ({
                        ...prev,
                        installment: { ...prev.installment, maxInstallments: val },
                      }));
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20"
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    Maksimal {formConfig.installment.maxInstallments}x transaksi
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                <strong>Mode Wajib Lunas Aktif:</strong> Siswa hanya dapat membayar 100% lunas dalam satu transaksi. Opsi cicilan akan disembunyikan di modal pembayaran.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-TAB 5: METODE PEMBAYARAN & AKUN REKENING                          */}
      {/* ===================================================================== */}
      {activeSubTab === "methods" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div>
            <h3 className="text-xs font-bold text-gray-900">Manajemen Metode Pembayaran & Rekening Sekolah</h3>
            <p className="text-[11px] text-gray-500">
              Aktifkan metode pembayaran yang diizinkan dan atur kode prefix Virtual Account, nomor rekening, atau NMID QRIS sekolah.
            </p>
          </div>

          <div className="space-y-3">
            {formConfig.paymentMethods.map((method) => (
              <div
                key={method.id}
                className={cn(
                  "p-4 rounded-xl border bg-white transition-all shadow-2xs space-y-3",
                  method.isActive ? "border-gray-200" : "border-gray-200 opacity-60 bg-gray-50/50"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {method.category === "va" && <Building2 className="w-4 h-4 text-blue-600" />}
                    {method.category === "transfer" && <Building2 className="w-4 h-4 text-indigo-600" />}
                    {method.category === "qris" && <QrCode className="w-4 h-4 text-rose-600" />}
                    {method.category === "cash" && <Banknote className="w-4 h-4 text-emerald-600" />}
                    {method.category === "scholarship" && <GraduationCap className="w-4 h-4 text-amber-600" />}

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-900 text-xs">{method.name}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-gray-100 text-gray-600">
                          {method.categoryLabel}
                        </span>
                        {method.badge && (
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-700">
                            {method.badge}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={cn("text-[11px] font-bold", method.isActive ? "text-emerald-700" : "text-gray-400")}>
                      {method.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={method.isActive}
                        onChange={() => handleToggleMethod(method.id)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#531FFF]"></div>
                    </label>
                  </div>
                </div>

                {/* Method Editable Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100 text-xs">
                  {/* Virtual Account Prefix */}
                  {method.category === "va" && (
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                        Kode Awalan Perusahaan (VA Prefix)
                      </label>
                      <input
                        type="text"
                        value={method.codePrefix || ""}
                        onChange={(e) => handleUpdateMethodDetail(method.id, "codePrefix", e.target.value)}
                        placeholder="Contoh: 88201"
                        className="w-full px-2.5 py-1.5 font-mono text-xs font-bold bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                      />
                    </div>
                  )}

                  {/* Account Number */}
                  {(method.category === "transfer" || method.accountNumber) && (
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                        Nomor Rekening Sekolah
                      </label>
                      <input
                        type="text"
                        value={method.accountNumber || ""}
                        onChange={(e) => handleUpdateMethodDetail(method.id, "accountNumber", e.target.value)}
                        placeholder="Contoh: 882-019-2334"
                        className="w-full px-2.5 py-1.5 font-mono text-xs font-bold bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                      />
                    </div>
                  )}

                  {/* QRIS NMID */}
                  {method.category === "qris" && (
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                        NMID Standar Nasional
                      </label>
                      <input
                        type="text"
                        value={method.nmid || "ID102030405060"}
                        onChange={(e) => handleUpdateMethodDetail(method.id, "nmid", e.target.value)}
                        placeholder="ID102030405060"
                        className="w-full px-2.5 py-1.5 font-mono text-xs font-bold bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                      />
                    </div>
                  )}

                  {/* Account Holder Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                      Nama Pemilik Rekening / Merchant
                    </label>
                    <input
                      type="text"
                      value={method.accountName || ""}
                      onChange={(e) => handleUpdateMethodDetail(method.id, "accountName", e.target.value)}
                      placeholder="SMART SCHOOL OS"
                      className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: TAMBAH / EDIT JENIS SPP                                        */}
      {/* ===================================================================== */}
      {typeModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/70">
              <h4 className="text-xs font-bold text-gray-900">
                {typeModal.mode === "add" ? "Tambah Jenis SPP Baru" : "Ubah Jenis SPP"}
              </h4>
              <button
                type="button"
                onClick={() => setTypeModal({ ...typeModal, isOpen: false })}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveType} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nama Jenis SPP *</label>
                <input
                  type="text"
                  required
                  value={typeModal.data.name}
                  onChange={(e) =>
                    setTypeModal({
                      ...typeModal,
                      data: { ...typeModal.data, name: e.target.value },
                    })
                  }
                  placeholder="Contoh: SPP Boarding / Asrama"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Kode Singkatan *</label>
                  <input
                    type="text"
                    required
                    value={typeModal.data.code}
                    onChange={(e) =>
                      setTypeModal({
                        ...typeModal,
                        data: { ...typeModal.data, code: e.target.value.toUpperCase() },
                      })
                    }
                    placeholder="Contoh: BRD"
                    className="w-full px-3 py-2 font-mono uppercase bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Siklus Tagihan</label>
                  <select
                    value={typeModal.data.billingPeriod}
                    onChange={(e) =>
                      setTypeModal({
                        ...typeModal,
                        data: { ...typeModal.data, billingPeriod: e.target.value as any },
                      })
                    }
                    className="w-full px-2.5 py-2 font-semibold bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                  >
                    <option value="monthly">Bulanan</option>
                    <option value="semester">Semesteran</option>
                    <option value="yearly">Tahunan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Deskripsi / Catatan</label>
                <textarea
                  rows={2}
                  value={typeModal.data.description}
                  onChange={(e) =>
                    setTypeModal({
                      ...typeModal,
                      data: { ...typeModal.data, description: e.target.value },
                    })
                  }
                  placeholder="Keterangan peruntukan jenis SPP ini..."
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setTypeModal({ ...typeModal, isOpen: false })}
                  className="px-3.5 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-white bg-[#531FFF] hover:bg-[#4216d6] rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: TAMBAH / EDIT TARIF KELAS                                      */}
      {/* ===================================================================== */}
      {rateModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/70">
              <h4 className="text-xs font-bold text-gray-900">
                {rateModal.mode === "add" ? "Tambah Tarif Jenjang Kelas" : "Ubah Tarif Jenjang Kelas"}
              </h4>
              <button
                type="button"
                onClick={() => setRateModal({ ...rateModal, isOpen: false })}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRate} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Tingkat / Nama Kelas *</label>
                <input
                  type="text"
                  required
                  value={rateModal.data.classLevel}
                  onChange={(e) =>
                    setRateModal({
                      ...rateModal,
                      data: { ...rateModal.data, classLevel: e.target.value },
                    })
                  }
                  placeholder="Contoh: Kelas 10, Kelas 11 IPA, dsb"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Nominal SPP per Bulan (Rp) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">Rp</span>
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    required
                    value={rateModal.data.monthlyFee}
                    onChange={(e) =>
                      setRateModal({
                        ...rateModal,
                        data: { ...rateModal.data, monthlyFee: Number(e.target.value) },
                      })
                    }
                    className="w-full pl-10 pr-3 py-2 font-mono text-sm font-black bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                  />
                </div>
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Format: {formatRupiah(rateModal.data.monthlyFee)}
                </span>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Keterangan Tambahan</label>
                <input
                  type="text"
                  value={rateModal.data.description || ""}
                  onChange={(e) =>
                    setRateModal({
                      ...rateModal,
                      data: { ...rateModal.data, description: e.target.value },
                    })
                  }
                  placeholder="Contoh: Sudah termasuk lab & persiapan ujian"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setRateModal({ ...rateModal, isOpen: false })}
                  className="px-3.5 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-white bg-[#531FFF] hover:bg-[#4216d6] rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  Simpan Tarif
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
