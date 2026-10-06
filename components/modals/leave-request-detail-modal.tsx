"use client";

import React, { useState, useMemo } from "react";
import { 
  X, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  FileText, 
  Download, 
  Stethoscope, 
  UserCheck, 
  ShieldCheck, 
  Loader2, 
  Trash2, 
  ExternalLink,
  Clock,
  Check,
  CalendarDays
} from "lucide-react";
import { cn, getTodayDateString } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { 
  LeaveRequest, 
  approveLeaveRequest, 
  rejectLeaveRequest, 
  deleteLeaveRequest,
  getDatesBetween
} from "@/lib/leave-requests-service";
import { ProfileAvatar } from "@/components/ui/profile-avatar";

interface LeaveRequestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: LeaveRequest | null;
  canApprove?: boolean;
  approverName?: string;
  onUpdated?: () => void;
}

export function LeaveRequestDetailModal({
  isOpen,
  onClose,
  request,
  canApprove = false,
  approverName = "Wali Kelas",
  onUpdated,
}: LeaveRequestDetailModalProps) {
  const toast = useToast();
  const todayStr = useMemo(() => getTodayDateString(), []);

  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAttachmentFull, setShowAttachmentFull] = useState(false);

  // Formatted date range helper
  const formattedDateRange = useMemo(() => {
    if (!request) return "";
    try {
      const s = new Date(request.startDate);
      const e = new Date(request.endDate);
      const sStr = s.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
      const eStr = e.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
      if (request.startDate === request.endDate) {
        return sStr;
      }
      return `${sStr} — ${eStr}`;
    } catch {
      return `${request.startDate} s/d ${request.endDate}`;
    }
  }, [request]);

  const isTodayActive = useMemo(() => {
    if (!request) return false;
    const dates = getDatesBetween(request.startDate, request.endDate);
    return dates.includes(todayStr);
  }, [request, todayStr]);

  if (!isOpen || !request) return null;

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await approveLeaveRequest(request, approverName, approvalNotes.trim());
      toast.showSuccess(
        `Permohonan ${request.type} untuk ${request.studentName} (${request.daysCount} hari) telah disetujui. Presensi siswa otomatis diperbarui.`,
        "Permohonan Disetujui"
      );
      onUpdated?.();
      onClose();
    } catch (err: any) {
      toast.showError("Gagal menyetujui permohonan: " + (err.message || "Terjadi kesalahan"), "Gagal");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      toast.showError("Berikan alasan penolakan permohonan.", "Alasan Wajib");
      return;
    }

    setIsProcessing(true);
    try {
      await rejectLeaveRequest(request, approverName, rejectReason.trim());
      toast.showInfo(
        `Permohonan ${request.type} untuk ${request.studentName} ditolak.`,
        "Permohonan Ditolak"
      );
      onUpdated?.();
      onClose();
    } catch (err: any) {
      toast.showError("Gagal menolak permohonan: " + (err.message || "Terjadi kesalahan"), "Gagal");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    const confirmDel = window.confirm(
      `Apakah Anda yakin ingin menghapus berkas pengajuan ${request.type} untuk ${request.studentName}?`
    );
    if (!confirmDel) return;

    setIsProcessing(true);
    try {
      await deleteLeaveRequest(request.id);
      toast.showSuccess("Data pengajuan berhasil dihapus.", "Terhapus");
      onUpdated?.();
      onClose();
    } catch (err: any) {
      toast.showError("Gagal menghapus: " + err.message, "Gagal");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gray-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full flex flex-col overflow-hidden border border-gray-100 max-h-[96vh]">
        
        {/* Header with Status Pill */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-gray-950 via-[#1d0b45] to-[#3a1078] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm",
              request.type === "Sakit" ? "bg-blue-500/30 text-blue-300 border border-blue-400/30" : "bg-purple-500/30 text-purple-300 border border-purple-400/30"
            )}>
              {request.type === "Sakit" ? <Stethoscope className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black tracking-tight text-white leading-tight">
                  Detail Permohonan {request.type} — {request.studentName}
                </h3>
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-2xs",
                  request.status === "Disetujui"
                    ? "bg-emerald-500 text-white"
                    : request.status === "Ditolak"
                    ? "bg-rose-500 text-white"
                    : "bg-amber-500 text-white animate-pulse"
                )}>
                  {request.status === "Disetujui" && <Check className="w-3 h-3" />}
                  {request.status === "Ditolak" && <XCircle className="w-3 h-3" />}
                  {request.status === "Menunggu Persetujuan" && <Clock className="w-3 h-3" />}
                  {request.status}
                </span>
              </div>
              <p className="text-[11px] text-purple-200/80 font-medium">
                Diajukan pada: {new Date(request.submittedAt || request.createdAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })} WIB
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

        {/* 2-Column Responsive Body */}
        <div className="p-5 sm:p-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            
            {/* ── LEFT COLUMN (6 Cols): Identitas & Alasan ── */}
            <div className="md:col-span-6 space-y-3.5">
              
              {/* Student Identity */}
              <div className="p-3 bg-gradient-to-r from-purple-50/80 to-indigo-50/50 border border-purple-100 rounded-xl flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <ProfileAvatar
                    name={request.studentName}
                    role="student"
                    size="md"
                    shape="rounded-xl"
                    className="shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">
                      Siswa Pengaju
                    </span>
                    <h4 className="text-xs font-black text-gray-900 truncate">
                      {request.studentName}
                    </h4>
                    <p className="text-[10px] text-gray-500 font-medium">
                      NISN: {request.studentNisn || request.studentId || "-"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="px-2 py-0.5 rounded text-xs font-black bg-white text-[#531FFF] border border-purple-200 shadow-2xs">
                    {request.className || "Kelas -"}
                  </span>
                  {isTodayActive && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-800">
                      Hari Ini
                    </span>
                  )}
                </div>
              </div>

              {/* Dates & Duration Banner */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-gray-600">
                  <span className="flex items-center gap-1.5 text-[#531FFF]">
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>Rentang Absensi:</span>
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-[#531FFF] text-white font-extrabold text-[10px]">
                    {request.daysCount} Hari
                  </span>
                </div>
                <p className="text-xs font-extrabold text-gray-900 pl-5">
                  {formattedDateRange}
                </p>
              </div>

              {/* Reason Box */}
              <div className="space-y-1">
                <label className="text-xs font-black text-gray-800 tracking-tight block">
                  Keterangan / Alasan dari Siswa:
                </label>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 font-medium leading-relaxed whitespace-pre-wrap italic">
                  &ldquo;{request.reason}&rdquo;
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN (6 Cols): Lampiran & Status / Aksi ── */}
            <div className="md:col-span-6 space-y-3.5 flex flex-col justify-between">
              
              {/* Attachment Viewer */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-gray-800 tracking-tight">
                    Lampiran Bukti
                  </label>
                  {request.attachmentUrl?.startsWith("data:image/") && (
                    <button
                      type="button"
                      onClick={() => setShowAttachmentFull(!showAttachmentFull)}
                      className="text-[10px] font-bold text-[#531FFF] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>{showAttachmentFull ? "Perkecil" : "Perbesar"}</span>
                    </button>
                  )}
                </div>

                {request.attachmentUrl ? (
                  request.attachmentUrl.startsWith("data:image/") ? (
                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-950/5 text-center p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={request.attachmentUrl}
                        alt="Lampiran Surat"
                        className={cn(
                          "mx-auto rounded-lg object-contain transition-all duration-300",
                          showAttachmentFull ? "max-h-[60vh] w-auto" : "max-h-36 w-auto"
                        )}
                      />
                    </div>
                  ) : (
                    <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className="w-5 h-5 text-[#531FFF] shrink-0" />
                        <span className="text-xs font-bold text-gray-900 truncate">
                          {request.attachmentName || "Dokumen Lampiran"}
                        </span>
                      </div>
                      <a
                        href={request.attachmentUrl}
                        download={request.attachmentName || "lampiran_surat.pdf"}
                        className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0"
                      >
                        <Download className="w-3 h-3" /> Unduh
                      </a>
                    </div>
                  )
                ) : (
                  <div className="p-3 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-center text-xs text-gray-400">
                    Tidak ada lampiran surat dokter/bukti.
                  </div>
                )}
              </div>

              {/* Status Log if already reviewed */}
              {request.status === "Disetujui" && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-black">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Permohonan Disetujui</span>
                  </div>
                  <p className="text-emerald-700 text-[11px]">
                    Oleh: <strong>{request.approvedBy || "Wali Kelas"}</strong>
                    {request.approvedAt && ` • ${new Date(request.approvedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} WIB`}
                  </p>
                  {request.approvalNotes && (
                    <p className="text-emerald-900 text-[11px] font-medium pt-0.5">
                      Catatan: {request.approvalNotes}
                    </p>
                  )}
                  <div className="text-[10px] text-emerald-700 font-semibold pt-1 border-t border-emerald-200/80 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    Presensi otomatis tercatat sebagai {request.type}.
                  </div>
                </div>
              )}

              {request.status === "Ditolak" && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-rose-800 font-black">
                    <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>Permohonan Ditolak</span>
                  </div>
                  <p className="text-rose-700 text-[11px]">
                    Oleh: <strong>{request.rejectedBy || "Wali Kelas"}</strong>
                    {request.rejectedAt && ` • ${new Date(request.rejectedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} WIB`}
                  </p>
                  {request.rejectedReason && (
                    <p className="text-rose-950 text-[11px] font-bold pt-0.5">
                      Alasan: {request.rejectedReason}
                    </p>
                  )}
                </div>
              )}

              {/* Wali Kelas Actions Form */}
              {canApprove && request.status === "Menunggu Persetujuan" && !showRejectForm && (
                <div className="p-3.5 bg-gradient-to-br from-purple-50/80 to-indigo-50/50 border border-purple-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#531FFF] flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5" />
                      Keputusan Wali Kelas
                    </span>
                    <span className="text-[10px] text-gray-400 font-bold">{approverName}</span>
                  </div>

                  <input
                    type="text"
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    placeholder="Catatan persetujuan (opsional)..."
                    className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20"
                  />

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={isProcessing}
                      className="flex-1 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-xs font-black flex items-center justify-center gap-1 shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      <span>Setujui ({request.type})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowRejectForm(true)}
                      disabled={isProcessing}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      Tolak
                    </button>
                  </div>
                </div>
              )}

              {/* Rejection Form Input */}
              {canApprove && request.status === "Menunggu Persetujuan" && showRejectForm && (
                <form onSubmit={handleReject} className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-black text-rose-900">
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      Tolak Permohonan
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowRejectForm(false)}
                      className="text-[10px] text-gray-500 hover:underline cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>

                  <textarea
                    rows={2}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Alasan penolakan..."
                    className="w-full bg-white border border-rose-300 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    required
                  />

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRejectForm(false)}
                      className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                      <span>Konfirmasi Tolak</span>
                    </button>
                  </div>
                </form>
              )}

            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleDelete}
            className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 hover:underline cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus Berkas</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
