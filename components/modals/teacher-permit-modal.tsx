"use client";

import React, { useState, useRef, useMemo } from "react";
import { 
  X, 
  Calendar, 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  Info,
  Loader2,
  Trash2,
  Stethoscope,
  Send,
  CalendarDays,
  Check,
  Briefcase
} from "lucide-react";
import { cn, getTodayDateString } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { getDatesBetween } from "@/lib/leave-requests-service";
import { ProfileAvatar } from "@/components/ui/profile-avatar";

export type TeacherPermitType = "Sakit" | "Izin" | "Cuti";

interface TeacherPermitModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: {
    id: string;
    uid?: string;
    name: string;
    nip?: string;
    subject?: string;
    homeroomClass?: string;
    imageUrl?: string;
  };
  academicYear?: string;
  onSubmitPermit: (payload: {
    teacherId: string;
    teacherName: string;
    nip: string;
    subject?: string;
    startDate: string;
    endDate: string;
    status: TeacherPermitType;
    reason: string;
    permitDocUrl?: string;
  }) => Promise<any>;
  onSuccess?: () => void;
}

export function TeacherPermitModal({
  isOpen,
  onClose,
  teacher,
  academicYear = "2025/2026",
  onSubmitPermit,
  onSuccess
}: TeacherPermitModalProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [type, setType] = useState<TeacherPermitType>("Izin");
  const [startDate, setStartDate] = useState<string>(() => getTodayDateString());
  const [endDate, setEndDate] = useState<string>(() => getTodayDateString());
  const [reason, setReason] = useState("");
  const [attachmentBase64, setAttachmentBase64] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate days duration
  const daysCount = useMemo(() => {
    return getDatesBetween(startDate, endDate).length;
  }, [startDate, endDate]);

  // Formatted Date Preview
  const formattedDateRange = useMemo(() => {
    try {
      const s = new Date(startDate);
      const e = new Date(endDate);
      const sStr = s.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
      const eStr = e.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
      if (startDate === endDate) {
        return sStr;
      }
      return `${sStr} — ${eStr}`;
    } catch {
      return `${startDate} s/d ${endDate}`;
    }
  }, [startDate, endDate]);

  if (!isOpen) return null;

  // Preset Date Selection Helper
  const handleSelectPreset = (days: number, startOffset = 0) => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() + startOffset);
    
    const end = new Date(start);
    end.setDate(start.getDate() + (days - 1));

    const toYMD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    setStartDate(toYMD(start));
    setEndDate(toYMD(end));
  };

  // Handle file upload & compress image if needed
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.showError("Ukuran file maksimal 5MB.", "File Terlalu Besar");
      return;
    }

    setAttachmentName(file.name);

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (file.type.startsWith("image/")) {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1200;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            const compressed = canvas.toDataURL("image/jpeg", 0.75);
            setAttachmentBase64(compressed);
          } else {
            setAttachmentBase64(result);
          }
        };
        img.src = result;
      } else {
        setAttachmentBase64(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate) {
      toast.showError("Pilih tanggal mulai izin / sakit / cuti.", "Form Belum Lengkap");
      return;
    }
    if (!endDate) {
      toast.showError("Pilih tanggal selesai izin / sakit / cuti.", "Form Belum Lengkap");
      return;
    }
    if (startDate > endDate) {
      toast.showError("Tanggal selesai tidak boleh lebih awal dari tanggal mulai.", "Tanggal Tidak Valid");
      return;
    }
    if (!reason.trim()) {
      toast.showError("Tuliskan alasan atau keterangan permohonan Anda.", "Keterangan Wajib");
      return;
    }

    if (type === "Sakit" && !attachmentBase64) {
      const confirmProceed = window.confirm(
        "Anda belum melampirkan Surat Keterangan Dokter. Lanjutkan pengajuan sakit?"
      );
      if (!confirmProceed) return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitPermit({
        teacherId: teacher.uid || teacher.id,
        teacherName: teacher.name,
        nip: teacher.nip || "-",
        subject: teacher.subject || "Guru Pengajar",
        startDate,
        endDate,
        status: type,
        reason: reason.trim(),
        permitDocUrl: attachmentBase64 || undefined,
      });

      toast.showSuccess(
        `Pengajuan ${type} (${daysCount} hari) berhasil disimpan dan dicatat ke rekap kehadiran guru.`,
        "Pengajuan Berhasil"
      );

      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.showError("Gagal mengirim pengajuan: " + (err.message || "Terjadi kesalahan"), "Gagal");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gray-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full flex flex-col overflow-hidden border border-gray-100 max-h-[96vh]">
        
        {/* Compact Header with Teacher Info */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-gray-950 via-[#1d0b45] to-[#3a1078] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <ProfileAvatar
              name={teacher.name}
              imageUrl={teacher.imageUrl}
              role="teacher"
              size="md"
              shape="rounded-xl"
              className="shrink-0 ring-2 ring-white/30"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black tracking-tight text-white leading-tight truncate">
                  Pengajuan Izin, Sakit & Cuti Guru
                </h3>
                <span className="px-2 py-0.2 rounded-md text-[10px] font-black bg-white/20 text-white border border-white/30">
                  {teacher.subject || "Pendidik"}
                </span>
                <span className="text-[10px] text-purple-200/90 font-medium hidden sm:inline">
                  NIP: {teacher.nip || "-"}
                </span>
              </div>
              <p className="text-[11px] text-purple-200/80 font-medium">
                {teacher.name} • Portal Presensi Guru T.A. {academicYear}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2-Column Responsive Form Body (Fits without vertical scrolling on desktop) */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            
            {/* ── LEFT COLUMN (7 Cols): Tipe, Waktu, & Alasan ── */}
            <div className="md:col-span-7 space-y-4">
              
              {/* 1. Segmented Type Selector: Sakit, Izin, Cuti */}
              <div>
                <label className="block text-xs font-black text-gray-800 tracking-tight mb-1.5">
                  1. Kategori Ketidakhadiran <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Izin */}
                  <button
                    type="button"
                    onClick={() => setType("Izin")}
                    className={cn(
                      "p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer",
                      type === "Izin"
                        ? "bg-purple-50/90 border-[#531FFF] text-purple-950 shadow-xs ring-2 ring-[#531FFF]/20"
                        : "bg-gray-50/80 hover:bg-gray-100 border-gray-200 text-gray-700"
                    )}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <div className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center font-bold",
                        type === "Izin" ? "bg-[#531FFF] text-white shadow-2xs" : "bg-gray-200 text-gray-600"
                      )}>
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                      {type === "Izin" && <Check className="w-3.5 h-3.5 text-[#531FFF]" />}
                    </div>
                    <div>
                      <span className="text-xs font-black block">Izin Resmi</span>
                      <span className="text-[9px] text-gray-500 block truncate">Dinas / Pribadi</span>
                    </div>
                  </button>

                  {/* Sakit */}
                  <button
                    type="button"
                    onClick={() => setType("Sakit")}
                    className={cn(
                      "p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer",
                      type === "Sakit"
                        ? "bg-blue-50/90 border-blue-500 text-blue-950 shadow-xs ring-2 ring-blue-500/20"
                        : "bg-gray-50/80 hover:bg-gray-100 border-gray-200 text-gray-700"
                    )}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <div className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center font-bold",
                        type === "Sakit" ? "bg-blue-600 text-white shadow-2xs" : "bg-gray-200 text-gray-600"
                      )}>
                        <Stethoscope className="w-3.5 h-3.5" />
                      </div>
                      {type === "Sakit" && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </div>
                    <div>
                      <span className="text-xs font-black block">Sakit</span>
                      <span className="text-[9px] text-gray-500 block truncate">Surat dokter</span>
                    </div>
                  </button>

                  {/* Cuti */}
                  <button
                    type="button"
                    onClick={() => setType("Cuti")}
                    className={cn(
                      "p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer",
                      type === "Cuti"
                        ? "bg-emerald-50/90 border-emerald-500 text-emerald-950 shadow-xs ring-2 ring-emerald-500/20"
                        : "bg-gray-50/80 hover:bg-gray-100 border-gray-200 text-gray-700"
                    )}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <div className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center font-bold",
                        type === "Cuti" ? "bg-emerald-600 text-white shadow-2xs" : "bg-gray-200 text-gray-600"
                      )}>
                        <Briefcase className="w-3.5 h-3.5" />
                      </div>
                      {type === "Cuti" && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <div>
                      <span className="text-xs font-black block">Cuti Guru</span>
                      <span className="text-[9px] text-gray-500 block truncate">Tahunan / Khusus</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. Tanggal & Presets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-gray-800 tracking-tight">
                    2. Rentang Tanggal <span className="text-rose-500">*</span>
                  </label>
                  
                  {/* Preset chips */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleSelectPreset(1, 0)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 hover:bg-purple-100 hover:text-[#531FFF] text-gray-700 transition-colors cursor-pointer"
                    >
                      Hari Ini
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectPreset(1, 1)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 hover:bg-purple-100 hover:text-[#531FFF] text-gray-700 transition-colors cursor-pointer"
                    >
                      Besok
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectPreset(2, 0)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 hover:bg-purple-100 hover:text-[#531FFF] text-gray-700 transition-colors cursor-pointer"
                    >
                      2 Hari
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectPreset(3, 0)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 hover:bg-purple-100 hover:text-[#531FFF] text-gray-700 transition-colors cursor-pointer"
                    >
                      3 Hari
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <span className="text-[10px] font-bold text-gray-500 block mb-1">Mulai</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        if (endDate < e.target.value) {
                          setEndDate(e.target.value);
                        }
                      }}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-500 block mb-1">Selesai</span>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Formatted Date Banner */}
                <div className="px-3 py-1.5 bg-purple-50/70 border border-purple-100 rounded-lg flex items-center justify-between text-xs text-purple-900">
                  <span className="flex items-center gap-1.5 text-[#531FFF] font-semibold text-[11px] truncate">
                    <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                    {formattedDateRange}
                  </span>
                  <span className="font-extrabold bg-white px-2 py-0.5 rounded text-[10px] border border-purple-200 text-[#531FFF] shrink-0">
                    {daysCount} Hari
                  </span>
                </div>
              </div>

              {/* 3. Alasan / Keterangan */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-black text-gray-800 tracking-tight">
                    3. Alasan / Keterangan <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-gray-400 font-medium">
                    {reason.length}/250
                  </span>
                </div>
                <textarea
                  rows={2}
                  maxLength={250}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    type === "Sakit"
                      ? "Jelaskan kondisi medis atau anjuran istirahat dokter..."
                      : type === "Cuti"
                      ? "Jelaskan keperluan cuti tahunan / urusan keluarga besar..."
                      : "Jelaskan keperluan izin penting / tugas dinas luar..."
                  }
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none placeholder:text-gray-400 resize-none leading-relaxed"
                  required
                />
              </div>
            </div>

            {/* ── RIGHT COLUMN (5 Cols): Lampiran & Aksi ── */}
            <div className="md:col-span-5 flex flex-col justify-between space-y-4">
              
              {/* 4. Lampiran Bukti */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-gray-800 tracking-tight">
                    4. Dokumen Lampiran
                  </label>
                  <span className="text-[10px] text-purple-600 font-bold bg-purple-50 px-2 py-0.2 rounded">
                    {type === "Sakit" ? "Surat Dokter" : "Dokumen Pendukung"}
                  </span>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*,.pdf"
                  className="hidden"
                />

                {!attachmentBase64 ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 hover:border-[#531FFF]/60 rounded-xl p-3.5 text-center cursor-pointer transition-all bg-gray-50/50 hover:bg-purple-50/30 group"
                  >
                    <div className="w-8 h-8 rounded-full bg-purple-100 text-[#531FFF] flex items-center justify-center mx-auto mb-1.5 group-hover:scale-110 transition-transform">
                      <UploadCloud className="w-4 h-4" />
                    </div>
                    <p className="text-[11px] font-extrabold text-gray-800 group-hover:text-[#531FFF] transition-colors">
                      Unggah berkas / foto surat
                    </p>
                    <p className="text-[9px] text-gray-400 mt-0.5">
                      JPG, PNG, atau PDF (Maks. 5MB)
                    </p>
                  </div>
                ) : (
                  <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between gap-2 shadow-2xs">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      {attachmentBase64.startsWith("data:image/") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={attachmentBase64}
                          alt="Preview"
                          className="w-10 h-10 object-cover rounded-lg border border-gray-200 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-purple-100 text-[#531FFF] flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                      )}
                      <div className="overflow-hidden">
                        <p className="text-[11px] font-bold text-gray-900 truncate">
                          {attachmentName || "Lampiran Surat"}
                        </p>
                        <p className="text-[9px] text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" /> Terlampir
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setAttachmentBase64(null);
                        setAttachmentName("");
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-colors shrink-0"
                      title="Hapus file"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* 5. Process Notice Card */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-start gap-2 text-xs text-emerald-950">
                <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed text-emerald-900 font-medium">
                  Pengajuan otomatis dicatat ke sistem presensi guru dan terintegrasi pada rekapitulasi kehadiran bulanan sekolah.
                </div>
              </div>

              {/* 6. Action Buttons */}
              <div className="pt-2 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors cursor-pointer text-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-gradient-to-r from-[#531FFF] to-[#7344FF] hover:from-[#4314cc] hover:to-[#5e31e6] text-white font-black text-xs rounded-xl transition-all shadow-md shadow-[#531FFF]/25 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Kirim Pengajuan</span>
                    </>
                  )}
                </button>
              </div>

            </div>

          </div>
        </form>

      </div>
    </div>
  );
}
