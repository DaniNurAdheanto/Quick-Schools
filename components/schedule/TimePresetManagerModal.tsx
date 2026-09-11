"use client";

import React, { useState } from "react";
import { Clock, Plus, Trash2, Edit2, RotateCcw, X, Check, AlertCircle } from "lucide-react";
import { TimePreset, useTimePresets } from "@/lib/time-presets";
import { useToast } from "@/context/ToastContext";

interface TimePresetManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset?: (preset: TimePreset) => void;
}

export default function TimePresetManagerModal({
  isOpen,
  onClose,
  onSelectPreset,
}: TimePresetManagerModalProps) {
  const { presets, addPreset, updatePreset, deletePreset, resetToDefault } = useTimePresets();
  const { showSuccess, showError, showInfo } = useToast();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    startTime: "07:00",
    endTime: "08:30",
    description: "",
  });
  const [isAdding, setIsAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const calculateDuration = (start: string, end: string) => {
    try {
      const [sh, sm] = start.split(":").map(Number);
      const [eh, em] = end.split(":").map(Number);
      const totalMinutes = eh * 60 + em - (sh * 60 + sm);
      if (totalMinutes <= 0) return "Waktu tidak valid";
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      if (h > 0 && m > 0) return `${h} jam ${m} mnt (${totalMinutes} mnt)`;
      if (h > 0) return `${h} jam (${totalMinutes} mnt)`;
      return `${m} Menit`;
    } catch {
      return "-";
    }
  };

  const handleStartAdd = () => {
    setEditingId(null);
    setFormData({
      name: `Sesi ${presets.length + 1}`,
      startTime: "07:00",
      endTime: "08:30",
      description: "",
    });
    setIsAdding(true);
  };

  const handleStartEdit = (preset: TimePreset) => {
    setIsAdding(false);
    setEditingId(preset.id);
    setFormData({
      name: preset.name,
      startTime: preset.startTime,
      endTime: preset.endTime,
      description: preset.description || "",
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showError("Nama preset wajib diisi");
      return;
    }
    if (!formData.startTime || !formData.endTime) {
      showError("Jam mulai dan selesai wajib diisi");
      return;
    }
    if (formData.startTime >= formData.endTime) {
      showError("Jam mulai harus lebih awal dari jam selesai");
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await updatePreset(editingId, {
          name: formData.name.trim(),
          startTime: formData.startTime,
          endTime: formData.endTime,
          start: formData.startTime,
          end: formData.endTime,
          label: `${formData.startTime} - ${formData.endTime} (${formData.name.trim()})`,
          description: formData.description.trim(),
        });
        showSuccess("Template jam berhasil diperbarui");
        setEditingId(null);
      } else {
        await addPreset({
          name: formData.name.trim(),
          startTime: formData.startTime,
          endTime: formData.endTime,
          description: formData.description.trim(),
        });
        showSuccess("Template jam baru berhasil ditambahkan");
        setIsAdding(false);
      }
    } catch (err) {
      showError("Gagal menyimpan template jam");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus template preset "${name}"?`)) return;
    try {
      await deletePreset(id);
      showSuccess(`Preset "${name}" berhasil dihapus`);
      if (editingId === id) setEditingId(null);
    } catch (err) {
      showError("Gagal menghapus preset");
    }
  };

  const handleReset = async () => {
    if (
      !confirm(
        "Kembalikan template jam ke 5 preset standar sistem (07:00–08:30, 08:30–10:00, 10:30–12:00, 13:00–14:30, 14:30–16:00)?"
      )
    ) {
      return;
    }
    try {
      await resetToDefault();
      showInfo("Template jam berhasil direset ke standar sekolah");
      setEditingId(null);
      setIsAdding(false);
    } catch (err) {
      showError("Gagal mereset template jam");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-linear-to-r from-gray-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#531FFF]/10 flex items-center justify-center text-[#531FFF]">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Kelola Preset Jam & Template Waktu</h2>
              <p className="text-xs text-gray-500">
                Atur opsi sesi jam cepat untuk form Jadwal Ujian dan Jadwal Pelajaran
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Action Toolbar */}
          <div className="flex items-center justify-between gap-3">
            <div className="text-gray-600">
              Total <span className="font-bold text-gray-900">{presets.length} Template Jam</span> tersedia
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                title="Kembalikan preset jam bawaan"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Standar
              </button>
              {!isAdding && !editingId && (
                <button
                  type="button"
                  onClick={handleStartAdd}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#531FFF] hover:bg-[#4216d6] rounded-lg shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Preset Baru
                </button>
              )}
            </div>
          </div>

          {/* Form Add / Edit */}
          {(isAdding || editingId) && (
            <form
              onSubmit={handleSave}
              className="p-4 bg-purple-50/50 border border-purple-200 rounded-xl space-y-3.5 animate-in fade-in"
            >
              <div className="flex items-center justify-between border-b border-purple-200/60 pb-2">
                <span className="font-bold text-purple-950 text-xs flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#531FFF]" />
                  {editingId ? "Edit Template Jam" : "Tambah Template Jam Baru"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingId(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Nama Sesi / Label</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Sesi 1 / Jam Ke-1"
                    className="w-full px-3 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] text-center"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Jam Selesai</label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Deskripsi / Catatan (Opsional)</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Contoh: Sesi Pagi / Ujian Teori"
                    className="w-full px-3 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                  />
                </div>
                <div className="flex items-end">
                  <div className="w-full px-3 py-2 bg-purple-100/50 rounded-lg border border-purple-200 text-[11px] text-purple-900 font-medium">
                    Estimasi Durasi: <span className="font-bold">{calculateDuration(formData.startTime, formData.endTime)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingId(null);
                  }}
                  className="px-3 py-1.5 font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 font-bold text-white bg-[#531FFF] hover:bg-[#4216d6] rounded-lg shadow-xs transition-colors disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {editingId ? "Simpan Perubahan" : "Tambahkan Preset"}
                </button>
              </div>
            </form>
          )}

          {/* Table / List of Presets */}
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left divide-y divide-gray-200">
              <thead className="bg-gray-50 font-bold text-gray-700">
                <tr>
                  <th className="py-2.5 px-3.5 w-12 text-center">No</th>
                  <th className="py-2.5 px-3.5">Nama Sesi</th>
                  <th className="py-2.5 px-3.5">Jam Pelaksanaan</th>
                  <th className="py-2.5 px-3.5">Durasi</th>
                  <th className="py-2.5 px-3.5">Keterangan</th>
                  <th className="py-2.5 px-3.5 text-right w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700 bg-white">
                {presets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400">
                      Belum ada preset waktu. Klik "Reset Standar" atau "Tambah Preset Baru".
                    </td>
                  </tr>
                ) : (
                  presets.map((preset, idx) => (
                    <tr key={preset.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-2.5 px-3.5 text-center text-gray-400 font-bold">{idx + 1}</td>
                      <td className="py-2.5 px-3.5 font-bold text-gray-900">
                        <div className="flex items-center gap-1.5">
                          <span>{preset.name}</span>
                          {onSelectPreset && (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectPreset(preset);
                                onClose();
                              }}
                              className="px-1.5 py-0.5 text-[10px] bg-purple-50 text-[#531FFF] border border-purple-200 rounded font-semibold hover:bg-[#531FFF] hover:text-white transition-colors"
                            >
                              Gunakan
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 font-mono font-bold text-[#531FFF]">
                        {preset.startTime} – {preset.endTime}
                      </td>
                      <td className="py-2.5 px-3.5 text-gray-600 font-semibold">
                        {calculateDuration(preset.startTime, preset.endTime)}
                      </td>
                      <td className="py-2.5 px-3.5 text-gray-500 text-[11px]">
                        {preset.description || "-"}
                      </td>
                      <td className="py-2.5 px-3.5 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(preset)}
                          className="p-1.5 text-gray-500 hover:text-[#531FFF] hover:bg-purple-50 rounded-md transition-colors"
                          title="Edit Preset"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(preset.id, preset.name)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Hapus Preset"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Quick Notice */}
          <div className="flex items-start gap-2.5 p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-blue-900 text-[11px] leading-relaxed">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong>Informasi Sinkronisasi:</strong> Perubahan pada preset ini akan langsung diterapkan secara
              otomatis ke pilihan cepat di menu <strong>Jadwal Ujian</strong>, <strong>Jadwal Pelajaran</strong>, dan
              seluruh pengaturan waktu terkait di sistem sekolah. Jam ujian tetap dapat diubah secara manual jika ada
              jadwal khusus.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 bg-gray-50 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg transition-colors text-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
