"use client";

import React, { useState, useRef } from "react";
import { 
  X, 
  Calendar, 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Trash2,
  Stethoscope,
  Send
} from "lucide-react";
import { cn, getTodayDateString } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { 
  createLeaveRequest, 
  getDatesBetween, 
  LeaveRequestType 
} from "@/lib/leave-requests-service";

interface CreateLeaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: {
    id: string;
    name: string;
    nisn?: string;
    className?: string;
    uid?: string;
  };
  academicYear?: string;
  semester?: string;
  onSuccess?: () => void;
}

export function CreateLeaveRequestModal({
  isOpen,
  onClose,
  student,
  academicYear = "2025/2026",
  semester = "Ganjil",
  onSuccess
}: CreateLeaveRequestModalProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [type, setType] = useState<LeaveRequestType>("Sakit");
  const [startDate, setStartDate] = useState<string>(() => getTodayDateString());
  const [endDate, setEndDate] = useState<string>(() => getTodayDateString());
  const [reason, setReason] = useState("");
  const [attachmentBase64, setAttachmentBase64] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate days duration
  const daysCount = React.useMemo(() => {
    return getDatesBetween(startDate, endDate).length;
  }, [startDate, endDate]);

  if (!isOpen) return null;

  // Handle file upload & compress image if needed
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size max 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast.showError("Ukuran file maksimal 5MB.", "File Terlalu Besar");
      return;
    }

    setAttachmentName(file.name);

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (file.type.startsWith("image/")) {
        // Compress image using canvas
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
      toast.showError("Pilih tanggal mulai izin / sakit.", "Form Belum Lengkap");
      return;
    }
    if (!endDate) {
      toast.showError("Pilih tanggal selesai izin / sakit.", "Form Belum Lengkap");
      return;
    }
    if (startDate > endDate) {
      toast.showError("Tanggal selesai tidak boleh lebih awal dari tanggal mulai.", "Tanggal Tidak Valid");
      return;
    }
    if (!reason.trim()) {
      toast.showError("Tuliskan alasan atau keterangan pengajuan izin/sakit.", "Keterangan Wajib");
      return;
    }

    // Recommended attachment for Sakit
    if (type === "Sakit" && !attachmentBase64) {
      const confirmProceed = window.confirm(
        "Anda belum melampirkan Surat Keterangan Dokter atau bukti sakit. Pengajuan tanpa surat dokter mungkin memerlukan konfirmasi tambahan dari Wali Kelas. Lanjutkan kirim?"
      );
      if (!confirmProceed) return;
    }

    setIsSubmitting(true);
    try {
      await createLeaveRequest({
        type,
        studentId: student.id || student.nisn || "siswa",
        studentName: student.name,
        studentNisn: student.nisn,
        studentUid: student.uid,
        className: student.className || "Umum",
        startDate,
        endDate,
        daysCount,
        reason: reason.trim(),
        attachmentUrl: attachmentBase64 || undefined,
        attachmentName: attachmentName || undefined,
        submittedAt: new Date().toISOString(),
        submittedBy: "siswa",
        submitterName: student.name,
        academicYear,
        semester,
      });

      toast.showSuccess(
        `Pengajuan ${type} untuk ${student.name} (${daysCount} hari) berhasil dikirim. Menunggu persetujuan Wali Kelas.`,
        "Pengajuan Terkirim"
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
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden border border-gray-100">
        
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-gray-950 via-[#1e0847] to-[#3a1078] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shrink-0">
              {type === "Sakit" ? <Stethoscope className="w-5 h-5 text-blue-300" /> : <Calendar className="w-5 h-5 text-purple-300" />}
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight text-white leading-tight">
                Pengajuan Izin / Sakit
              </h3>
              <p className="text-[11px] text-purple-200/80 font-medium">
                Kirim permohonan ke Wali Kelas untuk persetujuan kehadiran
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Student Info Box */}
          <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Siswa Pengaju</span>
              <span className="font-extrabold text-gray-900">{student.name}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Kelas / NISN</span>
              <span className="font-bold text-[#531FFF]">
                {student.className || "Kelas -"} • {student.nisn || "-"}
              </span>
            </div>
          </div>

          {/* Type Selector (Sakit vs Izin) */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Jenis Permohonan <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setType("Sakit")}
                className={cn(
                  "p-3 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer",
                  type === "Sakit"
                    ? "bg-blue-50 border-blue-400 text-blue-950 shadow-xs ring-2 ring-blue-500/20"
                    : "bg-gray-50/80 hover:bg-gray-100 border-gray-200 text-gray-700"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold",
                  type === "Sakit" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-600"
                )}>
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-extrabold">Sakit</div>
                  <div className="text-[10px] text-gray-500">Dengan surat dokter / gejala</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setType("Izin")}
                className={cn(
                  "p-3 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer",
                  type === "Izin"
                    ? "bg-purple-50 border-[#531FFF] text-purple-950 shadow-xs ring-2 ring-[#531FFF]/20"
                    : "bg-gray-50/80 hover:bg-gray-100 border-gray-200 text-gray-700"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold",
                  type === "Izin" ? "bg-[#531FFF] text-white" : "bg-gray-200 text-gray-600"
                )}>
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-extrabold">Izin Resmi</div>
                  <div className="text-[10px] text-gray-500">Urusan keluarga / dinas</div>
                </div>
              </button>
            </div>
          </div>

          {/* Date Range Picker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Tanggal Mulai <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (endDate < e.target.value) {
                    setEndDate(e.target.value);
                  }
                }}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Tanggal Selesai <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Duration Badge */}
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200/80 rounded-xl text-xs font-semibold text-gray-700">
            <span className="flex items-center gap-1.5 text-gray-500">
              <Calendar className="w-3.5 h-3.5 text-[#531FFF]" />
              Durasi Waktu Tidak Hadir:
            </span>
            <span className="font-extrabold text-[#531FFF] bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
              {daysCount} Hari
            </span>
          </div>

          {/* Reason Textarea */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Alasan / Keterangan Lengkap <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                type === "Sakit"
                  ? "Contoh: Mengalami demam dan radang tenggorokan sejak malam, dokter menganjurkan istirahat selama 2 hari..."
                  : "Contoh: Menghadiri acara pernikahan kakak kandung di luar kota bersama keluarga..."
              }
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none placeholder:text-gray-400 resize-none leading-relaxed"
              required
            />
          </div>

          {/* Attachment Box (Surat Dokter / Bukti) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-gray-700">
                Lampiran Bukti ({type === "Sakit" ? "Surat Dokter" : "Surat Izin Orang Tua"})
              </label>
              <span className="text-[10px] text-gray-400 font-medium">Opsional / Disarankan</span>
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
                className="border-2 border-dashed border-gray-200 hover:border-[#531FFF]/60 rounded-xl p-4 text-center cursor-pointer transition-colors bg-gray-50/50 hover:bg-purple-50/20 group"
              >
                <div className="w-10 h-10 rounded-full bg-purple-100 text-[#531FFF] flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <p className="text-xs font-extrabold text-gray-800">
                  Klik untuk unggah foto surat / dokumen
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Format: JPG, PNG, atau PDF (Maks. 5MB)
                </p>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  {attachmentBase64.startsWith("data:image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={attachmentBase64}
                      alt="Preview"
                      className="w-12 h-12 object-cover rounded-lg border border-gray-200 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-purple-100 text-[#531FFF] flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-gray-900 truncate">
                      {attachmentName || "Lampiran Surat"}
                    </p>
                    <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3 h-3" /> Siap diunggah
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
                  className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center shrink-0 transition-colors"
                  title="Hapus file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Information Notice */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              Setelah dikirim, permohonan akan diverifikasi dan <strong>disetujui oleh Wali Kelas</strong>. Ketika disetujui, kehadiran otomatis tercatat sebagai <strong>{type}</strong> pada rekap presensi.
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-gradient-to-r from-[#531FFF] to-[#7344FF] hover:from-[#4314cc] hover:to-[#5e31e6] text-white font-extrabold text-xs rounded-xl transition-all shadow-md shadow-[#531FFF]/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengirim Pengajuan...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Kirim ke Wali Kelas</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
