"use client";

import React, { useState } from "react";
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
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { 
  LeaveRequest, 
  approveLeaveRequest, 
  rejectLeaveRequest,
  deleteLeaveRequest 
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

  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAttachmentFull, setShowAttachmentFull] = useState(false);

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
      `Apakah Anda yakin ingin menghapus data pengajuan ${request.type} untuk ${request.studentName}?`
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

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("id-ID", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gray-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-gray-950 via-[#1e0847] to-[#3a1078] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm",
              request.type === "Sakit" ? "bg-blue-600" : "bg-[#531FFF]"
            )}>
              {request.type === "Sakit" ? <Stethoscope className="w-5 h-5 text-white" /> : <Calendar className="w-5 h-5 text-white" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight text-white leading-tight">
                  Detail Permohonan {request.type}
                </span>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider",
                  request.status === "Disetujui"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
                    : request.status === "Ditolak"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-400/40"
                    : "bg-amber-500/20 text-amber-300 border border-amber-400/40"
                )}>
                  {request.status}
                </span>
              </div>
              <p className="text-[11px] text-purple-200/80 font-medium mt-0.5">
                Diajukan pada: {new Date(request.submittedAt || request.createdAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
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
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Student Profile Card */}
          <div className="p-3.5 bg-gray-50 border border-gray-200/80 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ProfileAvatar
                name={request.studentName}
                role="student"
                size="md"
                shape="rounded-xl"
              />
              <div>
                <h4 className="text-xs sm:text-sm font-black text-gray-900 leading-tight">
                  {request.studentName}
                </h4>
                <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                  Kelas: <strong className="text-[#531FFF]">{request.className || "-"}</strong> • NISN: {request.studentNisn || "-"}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Durasi</span>
              <span className="text-xs font-black text-gray-800 bg-white px-2 py-0.5 rounded-md border border-gray-200 inline-block mt-0.5">
                {request.daysCount} Hari
              </span>
            </div>
          </div>

          {/* Dates & Range Info */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Tanggal Mulai</span>
              <span className="text-xs font-black text-gray-900 mt-0.5 block">{formatDate(request.startDate)}</span>
            </div>
            <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Tanggal Selesai</span>
              <span className="text-xs font-black text-gray-900 mt-0.5 block">{formatDate(request.endDate)}</span>
            </div>
          </div>

          {/* Reason Section */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5">
              Alasan / Keterangan dari Siswa:
            </label>
            <div className="p-3.5 bg-gray-50/90 border border-gray-200 rounded-xl text-xs text-gray-800 font-medium leading-relaxed whitespace-pre-wrap">
              {request.reason}
            </div>
          </div>

          {/* Attachment Preview Section */}
          {request.attachmentUrl ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-700">
                  Lampiran Bukti (Surat Dokter / Dokumen)
                </label>
                {request.attachmentUrl.startsWith("data:image/") && (
                  <button
                    type="button"
                    onClick={() => setShowAttachmentFull(!showAttachmentFull)}
                    className="text-[11px] font-bold text-[#531FFF] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>{showAttachmentFull ? "Perkecil Tampilan" : "Perbesar Foto"}</span>
                  </button>
                )}
              </div>

              {request.attachmentUrl.startsWith("data:image/") ? (
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-950/5 text-center p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={request.attachmentUrl}
                    alt="Lampiran Surat"
                    className={cn(
                      "mx-auto rounded-lg object-contain transition-all duration-300",
                      showAttachmentFull ? "max-h-[70vh] w-auto" : "max-h-52 w-auto"
                    )}
                  />
                </div>
              ) : (
                <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 text-[#531FFF] flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">{request.attachmentName || "Dokumen Lampiran"}</p>
                      <p className="text-[10px] text-gray-400">File dokumen PDF terlampir</p>
                    </div>
                  </div>
                  <a
                    href={request.attachmentUrl}
                    download={request.attachmentName || "lampiran_surat.pdf"}
                    className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh</span>
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-center text-xs text-gray-400">
              Tidak ada foto surat atau dokumen yang dilampirkan.
            </div>
          )}

          {/* Status History / Log */}
          {request.status === "Disetujui" && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1">
              <div className="flex items-center gap-2 text-emerald-800 font-extrabold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Permohonan Telah Disetujui</span>
              </div>
              <p className="text-emerald-700 text-[11px]">
                Disetujui oleh: <strong>{request.approvedBy || "Wali Kelas"}</strong>
                {request.approvedAt && ` • ${new Date(request.approvedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} WIB`}
              </p>
              {request.approvalNotes && (
                <p className="text-emerald-900 font-medium text-[11px] pt-1">
                  Catatan: {request.approvalNotes}
                </p>
              )}
              <div className="text-[10px] text-emerald-600 font-semibold pt-1 border-t border-emerald-200/60 mt-1.5 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Data kehadiran siswa pada tanggal tersebut telah otomatis diperbarui sebagai {request.type}.
              </div>
            </div>
          )}

          {request.status === "Ditolak" && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
              <div className="flex items-center gap-2 text-rose-800 font-extrabold">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Permohonan Ditolak</span>
              </div>
              <p className="text-rose-700 text-[11px]">
                Ditolak oleh: <strong>{request.rejectedBy || "Wali Kelas"}</strong>
                {request.rejectedAt && ` • ${new Date(request.rejectedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} WIB`}
              </p>
              {request.rejectedReason && (
                <p className="text-rose-950 font-bold text-[11px] pt-1">
                  Alasan Penolakan: {request.rejectedReason}
                </p>
              )}
            </div>
          )}

          {/* Wali Kelas Approval Form if Pending */}
          {canApprove && request.status === "Menunggu Persetujuan" && !showRejectForm && (
            <div className="p-4 bg-purple-50/60 border border-purple-200/80 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-black text-[#531FFF]">
                <UserCheck className="w-4 h-4" />
                <span>Tindakan Wali Kelas</span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">
                  Catatan Persetujuan (Opsional):
                </label>
                <input
                  type="text"
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Contoh: Disetujui, semoga lekas sembuh..."
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Setujui Permohonan ({request.type})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowRejectForm(true)}
                  disabled={isProcessing}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Tolak...
                </button>
              </div>
            </div>
          )}

          {/* Rejection Form Input */}
          {canApprove && request.status === "Menunggu Persetujuan" && showRejectForm && (
            <form onSubmit={handleReject} className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs font-black text-rose-900">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Tolak Permohonan Siswa
                </span>
                <button
                  type="button"
                  onClick={() => setShowRejectForm(false)}
                  className="text-[10px] text-gray-500 hover:underline"
                >
                  Batal
                </button>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                  Alasan Penolakan <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  rows={2}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Contoh: Bukti surat dokter tidak jelas atau tanggal izin bertepatan dengan ujian penting..."
                  className="w-full bg-white border border-rose-300 rounded-lg p-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRejectForm(false)}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>Konfirmasi Tolak</span>
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleDelete}
            className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 hover:underline cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus Data</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
