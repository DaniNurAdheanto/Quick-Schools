"use client";

import React, { useState } from "react";
import { 
  AlertTriangle, 
  Trash2, 
  X, 
  Loader2, 
  FolderKanban, 
  Users 
} from "lucide-react";

interface DeleteSubjectModalProps {
  isOpen: boolean;
  subject: any | null;
  onClose: () => void;
  onConfirmDelete: (subject: any) => Promise<void>;
}

export function DeleteSubjectModal({
  isOpen,
  subject,
  onClose,
  onConfirmDelete,
}: DeleteSubjectModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !subject) return null;

  const handleConfirm = async () => {
    try {
      setDeleting(true);
      setError(null);
      await onConfirmDelete(subject);
      onClose();
    } catch (err: any) {
      console.error("Subject delete error:", err);
      setError(err?.message || "Gagal menghapus mata pelajaran dari database.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col relative overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
        
        {/* Header with Danger Accent */}
        <div className="p-6 bg-rose-50/60 border-b border-rose-100/80 relative flex flex-col items-center text-center">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 hover:bg-white/80 rounded-full transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-3 shadow-xs border border-rose-200">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <h3 className="text-lg font-black text-gray-900 tracking-tight">
            Hapus Mata Pelajaran
          </h3>
          <p className="text-xs text-rose-700 font-semibold mt-1">
            Konfirmasi penghapusan data mata pelajaran dari database
          </p>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700">
              {error}
            </div>
          )}

          {/* Subject Preview Card */}
          <div className="p-4 rounded-xl border border-gray-200/90 bg-gray-50/70 space-y-2 text-left">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-[#531FFF]/10 text-[#531FFF] border border-[#531FFF]/20">
                {subject.code || "KODE"}
              </span>
              <span className="text-xs font-extrabold text-gray-900 truncate">
                {subject.name}
              </span>
            </div>

            <div className="text-[11px] text-gray-500 font-medium space-y-1">
              <p className="flex items-center gap-1.5">
                <FolderKanban className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>Kelompok: <strong>{subject.groupName || subject.groupId || "Umum / Standar"}</strong></span>
              </p>
              <p className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>Jurusan: <strong>{subject.major || "Semua Jurusan / Umum"}</strong></span>
              </p>
            </div>
          </div>

          {/* Impact Explanations */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-left space-y-1.5">
            <h4 className="text-xs font-bold text-amber-900">Dampak Penghapusan:</h4>
            <ul className="text-[11px] text-amber-800 space-y-1 font-medium list-disc list-inside">
              <li>Mata pelajaran dihapus permanen dari master database sekolah.</li>
              <li>Dilepaskan otomatis dari daftar anggota kelompok mata pelajaran.</li>
              <li>Dilepaskan otomatis dari penugasan guru pengampu.</li>
              <li>Riwayat jadwal terkait dinonaktifkan agar tidak merusak jadwal pelajaran.</li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={deleting}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/25 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
          >
            {deleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menghapus...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Mata Pelajaran</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
