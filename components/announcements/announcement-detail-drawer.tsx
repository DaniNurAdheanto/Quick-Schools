"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  Megaphone,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
  PenTool,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { getTargetBadgeInfo } from "@/lib/announcements-helper";

interface AnnouncementDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  announcement: any;
  onEdit?: () => void;
  onDelete?: () => void;
  isReadOnly?: boolean;
}

export function AnnouncementDetailDrawer({
  open,
  onClose,
  announcement,
  onEdit,
  onDelete,
  isReadOnly = false,
}: AnnouncementDetailDrawerProps) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !announcement) return null;

  const targetInfo = getTargetBadgeInfo(announcement.target || "Semua");
  const TargetIcon = targetInfo.icon;

  const isUrgent = announcement.tag === "PENTING";

  // Category theme styling
  const getThemeStyle = (theme?: string, tag?: string) => {
    if (tag === "PENTING") {
      return {
        banner: "from-rose-500/10 via-rose-500/5 to-transparent",
        accent: "text-rose-600",
        badge: "bg-rose-50 text-rose-700 border-rose-200/80",
        border: "border-rose-100",
      };
    }
    if (tag === "AKADEMIK" || theme === "orange") {
      return {
        banner: "from-sky-500/10 via-sky-500/5 to-transparent",
        accent: "text-sky-600",
        badge: "bg-sky-50 text-sky-700 border-sky-200/80",
        border: "border-sky-100",
      };
    }
    if (tag === "KEUANGAN" || theme === "green") {
      return {
        banner: "from-emerald-500/10 via-emerald-500/5 to-transparent",
        accent: "text-emerald-600",
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
        border: "border-emerald-100",
      };
    }
    return {
      banner: "from-[#531FFF]/10 via-[#531FFF]/5 to-transparent",
      accent: "text-[#531FFF]",
      badge: "bg-[#531FFF]/10 text-[#531FFF] border-[#531FFF]/20",
      border: "border-purple-100",
    };
  };

  const themeStyle = getThemeStyle(announcement.theme, announcement.tag);

  const handleCopyText = async () => {
    try {
      const textToCopy = `${announcement.title}\n\n${announcement.desc}\n\nTarget: ${announcement.target || "Semua"}\nTanggal: ${announcement.date || "-"}\nSumber: Smart School OS`;
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.showSuccess("Teks pengumuman berhasil disalin ke clipboard.", "Tersalin");
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      toast.showError("Gagal menyalin teks.", "Gagal");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full sm:w-[540px] md:w-[620px] bg-white h-full shadow-2xl z-10 flex flex-col border-l border-gray-100 animate-in slide-in-from-right duration-300 ease-out">
        
        {/* 1. Drawer Header Banner */}
        <div className={cn(
          "relative px-6 sm:px-8 pt-7 pb-5 border-b border-gray-100 bg-gradient-to-b shrink-0",
          themeStyle.banner
        )}>
          {/* Top Row: Badges & Close Button */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Pill */}
              <span className={cn(
                "px-2.5 py-1 text-[11px] font-black uppercase tracking-wider rounded-lg border shadow-2xs flex items-center gap-1.5",
                themeStyle.badge
              )}>
                {isUrgent && <AlertCircle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />}
                {announcement.tag || "INFORMASI"}
              </span>

              {/* Status Pill */}
              <span className={cn(
                "px-2.5 py-1 text-[11px] font-bold rounded-lg border shadow-2xs flex items-center gap-1.5",
                announcement.status === "Aktif"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                  : announcement.status === "Terjadwal"
                  ? "bg-amber-50 text-amber-700 border-amber-200/80"
                  : "bg-gray-100 text-gray-600 border-gray-200"
              )}>
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  announcement.status === "Aktif"
                    ? "bg-emerald-500 animate-pulse"
                    : announcement.status === "Terjadwal"
                    ? "bg-amber-500"
                    : "bg-gray-400"
                )} />
                {announcement.status || "Aktif"}
              </span>

              {/* Target Role Badge */}
              <span className={cn(
                "px-2.5 py-1 text-[11px] font-bold rounded-lg border shadow-2xs flex items-center gap-1.5",
                targetInfo.badgeColor
              )}>
                <TargetIcon className="w-3.5 h-3.5" />
                Target: {announcement.target || "Semua"}
              </span>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white border border-gray-200/80 hover:bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
              title="Tutup (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Title Headline */}
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-snug">
            {announcement.title}
          </h2>

          {/* Author & Publication Timestamp Row */}
          <div className="flex flex-wrap items-center gap-y-2 gap-x-4 mt-3 text-[12px] text-gray-500 font-medium">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center text-[10px] font-black">
                {announcement.author ? announcement.author[0].toUpperCase() : "A"}
              </div>
              <span className="font-semibold text-gray-800">{announcement.author || "Admin Sekolah"}</span>
            </div>

            <span className="text-gray-300">•</span>

            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span>{announcement.date || "Baru saja"}</span>
            </div>

            <span className="text-gray-300">•</span>

            <div className="flex items-center gap-1 text-emerald-600 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Resmi Terverifikasi</span>
            </div>
          </div>
        </div>

        {/* 2. Drawer Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-200">
          
          {/* Urgent Callout Box if PENTING */}
          {isUrgent && (
            <div className="p-4 rounded-xl bg-rose-50/90 border border-rose-200/90 flex items-start gap-3 shadow-2xs">
              <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0 animate-pulse" />
              <div>
                <h4 className="text-xs font-black text-rose-950 uppercase tracking-wider">
                  Pemberitahuan Prioritas Tinggi
                </h4>
                <p className="text-[12px] text-rose-800 mt-0.5 leading-relaxed font-medium">
                  Pengumuman ini ditandai penting untuk seluruh penerima terkait. Harap memperhatikan instruksi dan batas waktu yang tercantum.
                </p>
              </div>
            </div>
          )}

          {/* Announcement Full Text Body */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
              Isi Pengumuman
            </h3>
            <div className="p-5 rounded-2xl bg-gray-50/80 border border-gray-100 text-[14px] text-gray-800 leading-relaxed font-normal whitespace-pre-line selection:bg-[#531FFF]/10">
              {announcement.desc || "Tidak ada deskripsi pengumuman tambahan."}
            </div>
          </div>

          {/* Key Information Summary Grid */}
          <div className="space-y-3 pt-2">
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
              Informasi Terkait & Target
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Target Penerima Card */}
              <div className="p-3.5 rounded-xl border border-gray-100 bg-white shadow-2xs flex items-start gap-3">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", targetInfo.badgeColor)}>
                  <TargetIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Target Penerima
                  </span>
                  <p className="text-xs font-black text-gray-900 truncate mt-0.5">
                    {targetInfo.label}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1 leading-snug">
                    {targetInfo.description}
                  </p>
                </div>
              </div>

              {/* Status Publikasi Card */}
              <div className="p-3.5 rounded-xl border border-gray-100 bg-white shadow-2xs flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Status Tayang
                  </span>
                  <p className="text-xs font-black text-gray-900 mt-0.5">
                    {announcement.status || "Aktif"}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Diterbitkan pada {announcement.date || "-"}
                  </p>
                </div>
              </div>

              {/* Kategori Card */}
              <div className="p-3.5 rounded-xl border border-gray-100 bg-white shadow-2xs flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#531FFF] flex items-center justify-center shrink-0">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Kategori Pengumuman
                  </span>
                  <p className="text-xs font-black text-gray-900 mt-0.5">
                    {announcement.tag || "INFORMASI"}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Topik resmi administrasi & akademik
                  </p>
                </div>
              </div>

              {/* Penerbit / Author Card */}
              <div className="p-3.5 rounded-xl border border-gray-100 bg-white shadow-2xs flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Penerbit Resmi
                  </span>
                  <p className="text-xs font-black text-gray-900 mt-0.5">
                    {announcement.author || "Admin Sekolah"}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Otoritas Manajemen Sekolah
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Drawer Action Footer */}
        <div className="px-6 sm:px-8 py-4 bg-[#F9FAFB] border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 bg-white border border-gray-200/90 hover:bg-gray-50 transition-all shadow-2xs cursor-pointer active:scale-95"
              title="Salin isi pengumuman"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-gray-500" />
                  <span>Salin Teks</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {!isReadOnly && onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit();
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[#531FFF] bg-[#531FFF]/10 hover:bg-[#531FFF]/15 transition-all shadow-2xs cursor-pointer active:scale-95"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}

            {!isReadOnly && onDelete && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDelete();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-all shadow-2xs cursor-pointer active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-100 border border-gray-200 transition-all shadow-2xs cursor-pointer active:scale-95"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
