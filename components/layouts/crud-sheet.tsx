"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  X, 
  Loader2, 
  Edit3, 
  User, 
  Info, 
  AlertTriangle,
  GraduationCap,
  Users,
  ShieldAlert,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  Briefcase,
  FileText,
  CheckCircle2,
  BookOpen,
  Clock,
  LayoutGrid,
  Copy,
  Check,
  Search,
  Table,
  Sparkles,
  AlertCircle,
  Share2
} from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";

export interface CrudField {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  options?: { label: string; value: string }[];
  category?: "pribadi" | "akademik" | "orangTua" | "darurat" | "lainnya" | string;
  colSpan?: 1 | 2;
}

export interface CrudSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit" | "delete" | "view";
  entityName: string;
  fields: CrudField[];
  initialData?: any;
  onSubmit?: (data: any) => Promise<void> | void;
  onDataChange?: (data: any) => void;
  onEditRequested?: () => void;
}

const CATEGORY_DEFINITIONS: Record<string, { label: string; icon: any }> = {
  pribadi: { label: "Biodata Pribadi", icon: User },
  akademik: { label: "Akademik", icon: GraduationCap },
  orangTua: { label: "Orang Tua / Wali", icon: Users },
  darurat: { label: "Kontak Darurat & Status", icon: ShieldAlert },
  lainnya: { label: "Lainnya", icon: Info },
};

export function CrudSheet({
  open,
  onOpenChange,
  mode,
  entityName,
  fields,
  initialData,
  onSubmit,
  onDataChange,
  onEditRequested
}: CrudSheetProps) {
  const [formData, setFormData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("pribadi");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewFormat, setViewFormat] = useState<"grid" | "table">("grid");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [summaryCopied, setSummaryCopied] = useState<boolean>(false);
  const toast = useToast();

  useEffect(() => {
    if (open) {
      const data = initialData || {};
      setFormData(data);
      if (onDataChange) onDataChange(data);
      setActiveTab("pribadi");
      setSearchQuery("");
      setCopiedField(null);
      setSummaryCopied(false);
    }
  }, [open, initialData]);

  // Determine category for fields
  const getFieldCategory = (field: CrudField): string => {
    if (field.category) return field.category;
    const name = field.name.toLowerCase();
    if (
      name.includes("father") || 
      name.includes("mother") || 
      name.includes("parent") || 
      name.includes("guardian") || 
      name.includes("wali") || 
      name.includes("ayah") || 
      name.includes("ibu") || 
      name.includes("income") || 
      name.includes("job")
    ) {
      return "orangTua";
    }
    if (
      name.includes("class") || 
      name.includes("kelas") || 
      name.includes("major") || 
      name.includes("jurusan") || 
      name.includes("school") || 
      name.includes("sekolah") || 
      name.includes("entry") || 
      name.includes("level") || 
      name.includes("jenjang") || 
      name.includes("semester") || 
      name.includes("tahun")
    ) {
      return "akademik";
    }
    if (name.includes("emergency") || name.includes("darurat") || name === "status") {
      return "darurat";
    }
    return "pribadi";
  };

  // Field icons helper
  const getFieldIcon = (fieldName: string) => {
    const name = fieldName.toLowerCase();
    if (name.includes("mail")) return Mail;
    if (name.includes("phone") || name.includes("hp") || name.includes("telepon") || name.includes("kontak")) return Phone;
    if (name.includes("address") || name.includes("alamat") || name.includes("place") || name.includes("tempat")) return MapPin;
    if (name.includes("date") || name.includes("tanggal") || name.includes("year") || name.includes("tahun")) return Calendar;
    if (name.includes("id") || name.includes("nis") || name.includes("nik") || name.includes("nip")) return FileText;
    if (name.includes("class") || name.includes("kelas") || name.includes("school") || name.includes("sekolah")) return GraduationCap;
    if (name.includes("major") || name.includes("jurusan")) return BookOpen;
    if (name.includes("income") || name.includes("penghasilan") || name.includes("biaya") || name.includes("gaji")) return CreditCard;
    if (name.includes("job") || name.includes("pekerjaan")) return Briefcase;
    if (name.includes("emergency") || name.includes("darurat")) return ShieldAlert;
    if (name === "status") return CheckCircle2;
    return User;
  };

  // Data completeness calculation
  const dataStats = useMemo(() => {
    const validFields = fields.filter(
      f => f.type !== "file" && f.name !== "pasFoto" && f.name !== "photoUrl" && f.name !== "avatar"
    );
    const data = initialData || formData;
    let filled = 0;
    validFields.forEach(f => {
      const v = data?.[f.name];
      if (v !== undefined && v !== null && String(v).trim() !== "" && String(v).trim() !== "-") {
        filled++;
      }
    });
    const total = validFields.length;
    const percentage = total > 0 ? Math.round((filled / total) * 100) : 0;
    const uncompleted = total - filled;
    return { filled, total, percentage, uncompleted };
  }, [fields, initialData, formData]);

  // Available tabs calculation
  const availableTabs = useMemo(() => {
    const categoriesPresent = new Set<string>();
    fields.forEach(f => {
      if (f.type !== "file" && f.name !== "photoUrl" && f.name !== "avatar" && f.name !== "pasFoto") {
        categoriesPresent.add(getFieldCategory(f));
      }
    });

    const tabsOrder = ["pribadi", "akademik", "orangTua", "darurat", "lainnya"];
    const sortedCategories = Array.from(categoriesPresent).sort((a, b) => {
      const idxA = tabsOrder.indexOf(a);
      const idxB = tabsOrder.indexOf(b);
      return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
    });

    const tabs = sortedCategories.map(catKey => {
      const def = CATEGORY_DEFINITIONS[catKey] || { 
        label: catKey.charAt(0).toUpperCase() + catKey.slice(1), 
        icon: Info 
      };
      const count = fields.filter(
        f => getFieldCategory(f) === catKey && f.type !== "file" && f.name !== "pasFoto"
      ).length;
      return {
        id: catKey,
        label: def.label,
        icon: def.icon,
        count
      };
    });

    if (tabs.length > 1) {
      tabs.push({
        id: "all",
        label: "Semua Data",
        icon: LayoutGrid,
        count: fields.filter(f => f.type !== "file" && f.name !== "pasFoto").length
      });
    }

    if (dataStats.uncompleted > 0) {
      tabs.push({
        id: "incomplete",
        label: "Belum Lengkap",
        icon: AlertCircle,
        count: dataStats.uncompleted
      });
    }

    return tabs;
  }, [fields, dataStats.uncompleted]);

  // Ensure activeTab is valid
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.some(t => t.id === activeTab)) {
      setActiveTab(availableTabs[0].id);
    }
  }, [availableTabs, activeTab]);

  if (!open) return null;

  const isDelete = mode === "delete";
  const isView = mode === "view";

  const getTitle = () => {
    if (mode === "create") return `Tambah ${entityName}`;
    if (mode === "edit") return `Edit ${entityName}`;
    if (mode === "delete") return `Hapus ${entityName}`;
    if (mode === "view") return `Detail ${entityName}`;
    return "";
  };

  const getDescription = () => {
    if (isDelete) return `Menghapus data ini juga akan menghapus akun pengguna terkait secara permanen dari sistem.`;
    if (isView) return `Informasi detail data ${entityName} yang tersimpan dalam sistem.`;
    return `Silakan isi formulir di bawah ini untuk ${mode === "create" ? "menambahkan" : "memperbarui"} data ${entityName}.`;
  };

  const handleChange = (name: string, value: string | File) => {
    setFormData((prev: any) => {
      const next = { ...prev, [name]: value };
      if (onDataChange) onDataChange(next);
      return next;
    });
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      if (onSubmit) {
        await onSubmit(isDelete ? initialData : formData);
      }
      
      if (mode === "create") {
        toast.showSuccess(`Data ${entityName} berhasil ditambahkan.`, "Berhasil Tambah");
      } else if (mode === "edit") {
        toast.showEdit(`Data ${entityName} berhasil diperbarui.`, "Berhasil Edit");
      } else if (mode === "delete") {
        toast.showError(`Data ${entityName} berhasil dihapus.`, "Berhasil Hapus");
      }

      onOpenChange(false);
    } catch (error: any) {
      console.error("Error submitting form:", error);
      toast.showError(error?.message || `Gagal menyimpan data ${entityName}.`, "Gagal");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to copy text to clipboard
  const handleCopyValue = (fieldName: string, textToCopy: string, fieldLabel: string) => {
    if (!textToCopy || textToCopy === "-" || textToCopy === "Belum Dilengkapi") return;
    navigator.clipboard.writeText(String(textToCopy));
    setCopiedField(fieldName);
    toast.showSuccess(`${fieldLabel} disalin ke clipboard!`, "Tersalin");
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  // Helper to copy entire student profile summary
  const handleCopySummary = () => {
    const data = initialData || formData;
    const name = data?.fullName || data?.name || "-";
    const nisn = data?.nisn || data?.nis || data?.id || "-";
    const kelas = data?.classId || "-";
    const status = data?.status || "-";
    
    let summaryText = `📋 *DATA SISWA - QUICK SCHOOLS*\n`;
    summaryText += `Nama: ${name}\n`;
    summaryText += `NISN / NIS: ${nisn}\n`;
    summaryText += `Kelas: ${kelas}\n`;
    summaryText += `Jurusan: ${data?.major || "-"}\n`;
    summaryText += `Status: ${status}\n`;
    summaryText += `Jenis Kelamin: ${data?.gender || "-"}\n`;
    summaryText += `Tempat/Tgl Lahir: ${data?.birthPlace || "-"}, ${data?.birthDate || "-"}\n`;
    summaryText += `Agama: ${data?.religion || "-"}\n`;
    summaryText += `NIK: ${data?.nik || "-"}\n`;
    summaryText += `No. WhatsApp: ${data?.phone || "-"}\n`;
    summaryText += `Email: ${data?.email || "-"}\n`;
    summaryText += `Alamat: ${data?.address || "-"}\n\n`;
    summaryText += `👨‍👩‍👧 *DATA ORANG TUA / WALI*\n`;
    summaryText += `Ayah: ${data?.fatherName || "-"}\n`;
    summaryText += `Ibu: ${data?.motherName || "-"}\n`;
    summaryText += `Wali: ${data?.guardianName || "-"}\n`;
    summaryText += `No. HP Ortu: ${data?.parentPhone || "-"}\n`;
    summaryText += `Pekerjaan Ortu: ${data?.parentJob || "-"}\n\n`;
    summaryText += `🚨 *KONTAK DARURAT*\n`;
    summaryText += `Nama: ${data?.emergencyName || "-"}\n`;
    summaryText += `No. HP: ${data?.emergencyPhone || "-"}\n`;
    summaryText += `Hubungan: ${data?.emergencyRelation || "-"}\n`;

    navigator.clipboard.writeText(summaryText);
    setSummaryCopied(true);
    toast.showSuccess("Ringkasan data siswa berhasil disalin ke clipboard!", "Ringkasan Tersalin");
    setTimeout(() => {
      setSummaryCopied(false);
    }, 2500);
  };

  // Helper to format field values in View mode
  const renderFormattedValue = (field: CrudField, rawValue: any) => {
    if (rawValue === undefined || rawValue === null || rawValue === "" || rawValue === "-") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50/80 px-2.5 py-0.5 rounded-lg border border-amber-200/60">
          <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
          Belum Dilengkapi
        </span>
      );
    }

    if (field.type === "select" && field.options) {
      const found = field.options.find(opt => opt.value === String(rawValue));
      const text = found ? found.label : String(rawValue);

      if (field.name === "status") {
        const isPending = text === "Belum Onboarding";
        const isAktif = text === "Aktif";
        return (
          <span className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-xs border shadow-2xs",
            isPending 
              ? "bg-amber-50 text-amber-700 border-amber-200" 
              : isAktif 
                ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                : "bg-rose-50 text-rose-700 border-rose-200"
          )}>
            <span className={cn(
              "w-1.5 h-1.5 rounded-full",
              isPending ? "bg-amber-500 animate-pulse" : isAktif ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
            )} />
            {text}
          </span>
        );
      }

      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-purple-50 text-[#531FFF] border border-purple-100 rounded-lg font-bold text-xs">
          {text}
        </span>
      );
    }

    if (typeof rawValue === "boolean") {
      return (
        <span className={cn(
          "px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1",
          rawValue ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-gray-100 text-gray-500"
        )}>
          {rawValue ? "Aktif" : "Non-Aktif"}
        </span>
      );
    }

    // Phone clickable
    if (field.name.toLowerCase().includes("phone") || field.name.toLowerCase().includes("hp")) {
      return (
        <a 
          href={`tel:${rawValue}`} 
          className="text-[#531FFF] hover:underline font-bold text-[13px] inline-flex items-center gap-1.5"
          title="Klik untuk menghubungi"
        >
          <Phone className="w-3.5 h-3.5 text-[#531FFF]/70 shrink-0" />
          {String(rawValue)}
        </a>
      );
    }

    // Email clickable
    if (field.name.toLowerCase().includes("email")) {
      return (
        <a 
          href={`mailto:${rawValue}`} 
          className="text-[#531FFF] hover:underline font-bold text-[13px] inline-flex items-center gap-1.5 truncate max-w-full"
          title="Kirim email"
        >
          <Mail className="w-3.5 h-3.5 text-[#531FFF]/70 shrink-0" />
          {String(rawValue)}
        </a>
      );
    }

    return <span className="text-gray-900 font-bold text-[13px] sm:text-[14px] leading-relaxed break-words">{String(rawValue)}</span>;
  };

  // Header display name / avatar logic for view mode
  const primaryTitle = initialData?.fullName || initialData?.name || initialData?.title || initialData?.studentName || initialData?.teacherName || initialData?.code || entityName;
  const secondarySubtitle = initialData?.nisn || initialData?.nis || initialData?.id || initialData?.nip || initialData?.category || initialData?.grade || initialData?.email;
  const photoUrl = initialData?.imageUrl || initialData?.photoUrl || initialData?.avatar || initialData?.image;
  const isUnboarded = initialData?.status === "Belum Onboarding" || initialData?.onboardingCompleted === false;

  // Filter fields based on activeTab, incomplete filter, and search query
  const visibleFields = fields.filter((field) => {
    if (field.type === "file" || field.name === "photoUrl" || field.name === "avatar" || field.name === "pasFoto") {
      return false;
    }
    if (!isView) return true;

    // Search query takes precedence across all fields
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const val = String(initialData ? initialData[field.name] : formData[field.name] || "").toLowerCase();
      const lbl = field.label.toLowerCase();
      return lbl.includes(q) || val.includes(q) || field.name.toLowerCase().includes(q);
    }

    if (activeTab === "incomplete") {
      const val = initialData ? initialData[field.name] : formData[field.name];
      return val === undefined || val === null || String(val).trim() === "" || String(val).trim() === "-";
    }

    if (activeTab === "all") return true;
    return getFieldCategory(field) === activeTab;
  });

  return (
    <div className={cn(
      "fixed inset-0 z-50 p-2 sm:p-4 bg-gray-950/60 backdrop-blur-xs animate-in fade-in duration-200 flex",
      isDelete ? "items-center justify-center" : "justify-end"
    )}>
      <div className={cn(
        "bg-white rounded-3xl w-full shadow-2xl flex flex-col relative overflow-hidden border border-gray-100 transition-all duration-300",
        isDelete 
          ? "max-w-[440px] h-auto max-h-[90vh] animate-in zoom-in-95 duration-200" 
          : isView 
            ? "max-w-[880px] h-full animate-in slide-in-from-right duration-300"
            : "max-w-[640px] h-full animate-in slide-in-from-right duration-300"
      )}>
        
        {/* ================= HEADER SECTION ================= */}
        <div className={cn(
          "relative p-5 sm:p-6 border-b border-gray-100 shrink-0 rounded-t-3xl",
          isView ? "bg-gradient-to-b from-[#F7F5FF] via-white to-white" : isDelete ? "bg-rose-50/60" : "bg-[#FAFAFA]"
        )}>
          <button 
            onClick={() => onOpenChange(false)} 
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 hover:bg-white/80 rounded-full transition-colors z-20 shadow-2xs cursor-pointer"
            disabled={isSubmitting}
            title="Tutup (Esc)"
          >
            <X className="w-5 h-5" />
          </button>

          {isDelete ? (
            <div className="pt-2 pb-1 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-3 shadow-sm border border-rose-200">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h2 className="text-[20px] font-extrabold text-gray-900 tracking-tight">{getTitle()}</h2>
              <p className="text-[13px] text-rose-600 font-semibold mt-1 px-4 leading-relaxed">
                {getDescription()}
              </p>
            </div>
          ) : isView ? (
            /* REDESIGNED HERO PROFILE & QUICK INSPECTION BAR */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left pr-8">
                {/* Avatar with Status Indicator */}
                <div className="relative shrink-0">
                  {photoUrl ? (
                    <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl overflow-hidden ring-4 ring-white shadow-md border border-gray-100 bg-gray-100">
                      <img src={photoUrl} alt={primaryTitle} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-gradient-to-tr from-[#531FFF] to-[#7B42FF] text-white flex items-center justify-center font-black text-2xl shadow-md shadow-[#531FFF]/20">
                      {primaryTitle ? primaryTitle.charAt(0).toUpperCase() : <User className="w-8 h-8" />}
                    </div>
                  )}
                  <span className={cn(
                    "absolute -bottom-1.5 -right-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold border-2 border-white shadow-xs flex items-center gap-1",
                    isUnboarded
                      ? "bg-amber-500 text-white"
                      : (initialData?.status || "Aktif") === "Aktif"
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                  )}>
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    {initialData?.status || "Aktif"}
                  </span>
                </div>

                {/* Profile Overview */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                    <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight truncate">
                      {primaryTitle}
                    </h2>
                    {initialData?.nickname && (
                      <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-md">
                        &ldquo;{initialData.nickname}&rdquo;
                      </span>
                    )}
                  </div>

                  {/* Badges row */}
                  <div className="flex flex-wrap items-center gap-2 mt-2 justify-center sm:justify-start">
                    {secondarySubtitle && secondarySubtitle !== "-" && (
                      <span className="px-2.5 py-0.5 bg-[#531FFF]/10 text-[#531FFF] text-xs font-bold rounded-lg border border-[#531FFF]/20">
                        NISN: {secondarySubtitle}
                      </span>
                    )}
                    {initialData?.classId && (
                      <span className="px-2.5 py-0.5 bg-purple-50 text-[#531FFF] text-xs font-bold rounded-lg border border-purple-200">
                        Kelas: {initialData.classId}
                      </span>
                    )}
                    {initialData?.major && (
                      <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-200">
                        {initialData.major}
                      </span>
                    )}
                    {initialData?.gender && (
                      <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg">
                        {initialData.gender}
                      </span>
                    )}
                  </div>

                  {/* Contact snippets & Quick Action */}
                  <div className="flex flex-wrap items-center gap-4 mt-2.5 text-xs text-gray-500 font-medium justify-center sm:justify-start">
                    {initialData?.email && initialData.email !== "-" && (
                      <span className="flex items-center gap-1.5 text-gray-600 truncate max-w-[240px]">
                        <Mail className="w-3.5 h-3.5 text-[#531FFF] shrink-0" />
                        {initialData.email}
                      </span>
                    )}
                    {initialData?.phone && initialData.phone !== "-" && (
                      <span className="flex items-center gap-1.5 text-gray-600">
                        <Phone className="w-3.5 h-3.5 text-[#531FFF] shrink-0" />
                        {initialData.phone}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Copy Summary Action Pill */}
                <div className="hidden lg:flex flex-col items-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-2xs cursor-pointer",
                      summaryCopied
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : "bg-white text-gray-700 border-gray-200 hover:border-[#531FFF]/40 hover:text-[#531FFF]"
                    )}
                    title="Salin seluruh data siswa ke clipboard"
                  >
                    {summaryCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
                    <span>{summaryCopied ? "Tersalin!" : "Salin Biodata"}</span>
                  </button>
                </div>
              </div>

              {/* Data Completeness Progress Bar (Audit Tool) */}
              <div className="bg-white/80 border border-gray-100 rounded-2xl p-2.5 sm:px-3.5 sm:py-2.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                    dataStats.percentage === 100 
                      ? "bg-emerald-100 text-emerald-600" 
                      : dataStats.percentage >= 60 
                        ? "bg-purple-100 text-[#531FFF]" 
                        : "bg-amber-100 text-amber-600"
                  )}>
                    {dataStats.percentage === 100 ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-gray-900">
                        Kelengkapan Data: {dataStats.percentage}%
                      </span>
                      <span className="text-[11px] font-bold text-gray-400">
                        ({dataStats.filled} dari {dataStats.total} atribut terisi)
                      </span>
                    </div>
                    {/* Mini Progress Track */}
                    <div className="w-full sm:w-48 h-1.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          dataStats.percentage === 100 
                            ? "bg-emerald-500" 
                            : dataStats.percentage >= 60 
                              ? "bg-gradient-to-r from-[#531FFF] to-purple-400" 
                              : "bg-amber-500"
                        )}
                        style={{ width: `${dataStats.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Inspection Controls: Search & Layout View Mode Switcher */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {/* Inline Search Input */}
                  <div className="relative flex-1 sm:w-48">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Cari atribut..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-7 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#531FFF] focus:border-[#531FFF] transition-all font-medium"
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* View Format Toggle: Grid vs Table */}
                  <div className="flex items-center bg-gray-100 p-0.5 rounded-xl border border-gray-200/60 shrink-0">
                    <button
                      type="button"
                      onClick={() => setViewFormat("grid")}
                      className={cn(
                        "p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                        viewFormat === "grid" 
                          ? "bg-white text-[#531FFF] shadow-xs" 
                          : "text-gray-400 hover:text-gray-700"
                      )}
                      title="Tampilan Kartu"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewFormat("table")}
                      className={cn(
                        "p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                        viewFormat === "table" 
                          ? "bg-white text-[#531FFF] shadow-xs" 
                          : "text-gray-400 hover:text-gray-700"
                      )}
                      title="Tampilan Tabel Ringkas (Dossier)"
                    >
                      <Table className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Segmented Navigation Tabs */}
              {!searchQuery && availableTabs.length > 1 && (
                <div className="flex items-center gap-1.5 p-1 bg-gray-100/90 rounded-2xl overflow-x-auto custom-scrollbar">
                  {availableTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer",
                          isActive 
                            ? "bg-white text-[#531FFF] shadow-xs scale-[1.01]" 
                            : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
                        )}
                      >
                        <Icon className={cn("w-3.5 h-3.5", isActive ? "text-[#531FFF]" : "text-gray-400")} />
                        <span>{tab.label}</span>
                        {tab.count !== undefined && (
                          <span className={cn(
                            "px-1.5 py-0.2 rounded-full text-[10px]",
                            isActive 
                              ? "bg-purple-100 text-[#531FFF] font-extrabold" 
                              : tab.id === "incomplete" 
                                ? "bg-amber-100 text-amber-700 font-extrabold" 
                                : "bg-gray-200/80 text-gray-600"
                          )}>
                            {tab.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Search Active Notification */}
              {searchQuery && (
                <div className="flex items-center justify-between text-xs px-2 text-gray-500 font-medium">
                  <span>Hasil pencarian untuk &ldquo;{searchQuery}&rdquo;: <strong>{visibleFields.length} atribut</strong> ditemukan</span>
                  <button 
                    onClick={() => setSearchQuery("")} 
                    className="text-[#531FFF] hover:underline font-bold"
                  >
                    Reset Pencarian
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="pr-8">
              <h2 className="text-[20px] font-extrabold text-gray-900 mb-1">{getTitle()}</h2>
              <p className="text-[13px] text-gray-500 font-medium leading-relaxed">
                {getDescription()}
              </p>
            </div>
          )}
        </div>

        {/* ================= BODY CONTENT SECTION ================= */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar">
          {isView ? (
            /* VIEW MODE: User-Friendly Inspection (Grid Kartu or Tabel Dossier) */
            <div className="space-y-4">
              {/* Unboarded Warning Pill if applicable */}
              {isUnboarded && (
                <div className="p-3.5 bg-amber-50 border border-amber-200/90 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <p className="text-xs font-bold text-amber-900">
                      Akun ini belum menyelesaikan seluruh formulir Onboarding Siswa.
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-200/80 text-amber-800 shrink-0">
                    Status: Pending
                  </span>
                </div>
              )}

              {/* FORMAT 1: GRID KARTU (COMPACT & BEAUTIFUL WITH 1-CLICK COPY) */}
              {viewFormat === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
                  {visibleFields.map((field) => {
                    const value = initialData ? initialData[field.name] : formData[field.name];
                    const FieldIcon = getFieldIcon(field.name);
                    const isLongField = field.colSpan === 2 || field.name.toLowerCase().includes("address") || field.name.toLowerCase().includes("sekolah");
                    const hasValue = value !== undefined && value !== null && String(value).trim() !== "" && String(value).trim() !== "-";
                    const isCopied = copiedField === field.name;

                    return (
                      <div 
                        key={field.name}
                        className={cn(
                          "bg-gray-50/80 hover:bg-white border border-gray-100 hover:border-[#531FFF]/30 rounded-2xl p-3.5 sm:p-4 transition-all flex flex-col justify-between shadow-2xs hover:shadow-xs group relative",
                          isLongField ? "sm:col-span-2" : "sm:col-span-1"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                            <FieldIcon className="w-3.5 h-3.5 text-[#531FFF]/70 group-hover:text-[#531FFF] transition-colors shrink-0" />
                            <span>{field.label}</span>
                          </div>

                          {/* 1-Click Copy Icon Button */}
                          {hasValue && (
                            <button
                              type="button"
                              onClick={() => handleCopyValue(field.name, value, field.label)}
                              className={cn(
                                "p-1 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer",
                                isCopied 
                                  ? "bg-emerald-50 text-emerald-600 opacity-100" 
                                  : "text-gray-400 hover:text-[#531FFF] hover:bg-purple-50"
                              )}
                              title={`Salin ${field.label}`}
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>

                        <div>
                          {renderFormattedValue(field, value)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* FORMAT 2: TABEL DOSSIER (ULTRA-COMPACT, ZERO SCROLL AUDITING) */
                <div className="border border-gray-200/80 rounded-2xl overflow-hidden bg-white shadow-2xs divide-y divide-gray-100">
                  {visibleFields.map((field, idx) => {
                    const value = initialData ? initialData[field.name] : formData[field.name];
                    const FieldIcon = getFieldIcon(field.name);
                    const hasValue = value !== undefined && value !== null && String(value).trim() !== "" && String(value).trim() !== "-";
                    const isCopied = copiedField === field.name;

                    return (
                      <div 
                        key={field.name}
                        className={cn(
                          "flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:px-4 sm:py-2.5 transition-colors gap-1.5 sm:gap-4 hover:bg-purple-50/20 group",
                          idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                        )}
                      >
                        {/* Field Label with Icon */}
                        <div className="flex items-center gap-2 w-full sm:w-64 shrink-0">
                          <FieldIcon className="w-3.5 h-3.5 text-[#531FFF]/70 shrink-0" />
                          <span className="text-xs font-bold text-gray-500 group-hover:text-gray-800 transition-colors">
                            {field.label}
                          </span>
                        </div>

                        {/* Field Value and Copy */}
                        <div className="flex-1 flex items-center justify-between sm:justify-end gap-3 min-w-0">
                          <div className="truncate">
                            {renderFormattedValue(field, value)}
                          </div>

                          {hasValue && (
                            <button
                              type="button"
                              onClick={() => handleCopyValue(field.name, value, field.label)}
                              className={cn(
                                "p-1 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0 cursor-pointer",
                                isCopied 
                                  ? "bg-emerald-50 text-emerald-600 opacity-100" 
                                  : "text-gray-400 hover:text-[#531FFF] hover:bg-purple-50"
                              )}
                              title={`Salin ${field.label}`}
                            >
                              {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {visibleFields.length === 0 && (
                <div className="py-16 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                    <Search className="w-6 h-6" />
                  </div>
                  <p className="text-gray-600 font-bold text-sm">Tidak ada data ditemukan</p>
                  <p className="text-gray-400 text-xs">
                    {searchQuery ? `Tidak ada atribut yang cocok dengan kata kunci "${searchQuery}".` : "Tidak ada kolom data pada bagian ini."}
                  </p>
                </div>
              )}
            </div>
          ) : !isDelete ? (
            /* EDIT / CREATE MODE: Ergonomic 2-Column Form Inputs */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map((field) => {
                const isLong = field.colSpan === 2 || field.name.toLowerCase().includes("address") || field.name === "name" || field.name === "pasFoto";
                return (
                  <div 
                    key={field.name} 
                    className={cn(
                      "space-y-1.5",
                      isLong ? "sm:col-span-2" : "sm:col-span-1"
                    )}
                  >
                    <label className="text-[13px] font-bold text-gray-800 block">
                      {field.label}
                    </label>
                    {field.type === "select" ? (
                      <select
                        id={field.name}
                        value={formData[field.name] || ""}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all font-medium appearance-none bg-white cursor-pointer"
                        disabled={isSubmitting}
                      >
                        <option value="" disabled>{field.placeholder || `Pilih ${field.label.toLowerCase()}`}</option>
                        {field.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === "file" ? (
                      <input
                        id={field.name}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleChange(field.name, file);
                          }
                        }}
                        disabled={isSubmitting}
                        className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all font-medium file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#531FFF]/10 file:text-[#531FFF] hover:file:bg-[#531FFF]/20 cursor-pointer"
                      />
                    ) : (
                      <input
                        id={field.name}
                        type={field.type || "text"}
                        placeholder={field.placeholder || `Masukkan ${field.label.toLowerCase()}`}
                        value={formData[field.name] || ""}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        disabled={isSubmitting}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all font-medium"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-3 px-1 space-y-4">
              <div className="p-4 bg-rose-50 border border-rose-200/80 rounded-2xl flex items-start gap-3 text-left">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-rose-900">Perhatian Penting!</h4>
                  <p className="text-xs font-medium text-rose-700 leading-relaxed">
                    Menghapus data <strong>{primaryTitle}</strong> akan secara otomatis <strong>menghapus akun pengguna (hak akses login) & seluruh profil</strong> yang bersangkutan dari database sistem.
                  </p>
                </div>
              </div>
              <p className="text-center text-xs font-semibold text-gray-400">
                Seluruh riwayat data terhapus secara permanen dan tidak dapat dikembalikan.
              </p>
            </div>
          )}
        </div>

        {/* ================= FOOTER SECTION ================= */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-t border-gray-100 bg-white rounded-b-3xl shrink-0">
          {isView ? (
            <>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => onOpenChange(false)}
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className={cn(
                    "flex lg:hidden items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all border cursor-pointer",
                    summaryCopied 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300" 
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  )}
                  title="Salin Biodata Lengkap"
                >
                  {summaryCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4 text-gray-500" />}
                  <span>{summaryCopied ? "Tersalin!" : "Salin"}</span>
                </button>
              </div>

              {onEditRequested && (
                <button 
                  onClick={() => {
                    onOpenChange(false);
                    onEditRequested();
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#531FFF] hover:bg-[#4314cc] shadow-md shadow-[#531FFF]/20 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Data {entityName}</span>
                </button>
              )}
            </>
          ) : (
            <>
              <button 
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                disabled={isSubmitting}
              >
                Batal
              </button>
              <button 
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-md transition-all flex items-center gap-2 active:scale-95 cursor-pointer",
                  isDelete 
                    ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20" 
                    : "bg-[#531FFF] hover:bg-[#4314cc] shadow-[#531FFF]/20"
                )}
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>
                  {isDelete 
                    ? "Hapus Permanen" 
                    : mode === "create" 
                      ? `Simpan Data ${entityName}` 
                      : `Perbarui Data ${entityName}`}
                </span>
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
