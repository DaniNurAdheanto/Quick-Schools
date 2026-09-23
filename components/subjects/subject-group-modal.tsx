"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  FolderKanban, 
  Save, 
  AlertCircle 
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SubjectGroup } from "@/lib/subject-groups";
import type { EducationalStage } from "@/lib/school-level-config";

interface SubjectGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (group: SubjectGroup) => Promise<void>;
  editingGroup: SubjectGroup | null;
  majorOptions: { label: string; value: string; field?: string }[];
  gradeLevels: string[];
  currentStage: EducationalStage;
  availableSubjects: any[];
}

export function SubjectGroupModal({
  isOpen,
  onClose,
  onSave,
  editingGroup,
  majorOptions,
  gradeLevels,
  currentStage,
  availableSubjects,
}: SubjectGroupModalProps) {
  const [formData, setFormData] = useState<Partial<SubjectGroup>>({
    name: "",
    code: "",
    category: "Wajib",
    major: "Semua Jurusan / Umum",
    level: "Semua Tingkat",
    description: "",
    subjectIds: [],
    status: "Aktif",
    order: 1,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingGroup) {
      setFormData({
        ...editingGroup,
        subjectIds: Array.isArray(editingGroup.subjectIds) ? editingGroup.subjectIds : [],
      });
    } else {
      setFormData({
        name: "",
        code: "",
        category: "Wajib",
        major: "Semua Jurusan / Umum",
        level: "Semua Tingkat",
        description: "",
        subjectIds: [],
        status: "Aktif",
        order: 1,
      });
    }
    setError(null);
  }, [editingGroup, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.code?.trim()) {
      setError("Nama Kelompok dan Kode Kelompok wajib diisi.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const payload: SubjectGroup = {
        id: editingGroup?.id || `sg_${Date.now()}`,
        name: formData.name.trim(),
        code: formData.code.toUpperCase().trim(),
        category: formData.category || "Wajib",
        major: formData.major || "Semua Jurusan / Umum",
        level: formData.level || "Semua Tingkat",
        description: formData.description?.trim() || "",
        subjectIds: formData.subjectIds || [],
        order: Number(formData.order) || 1,
        status: formData.status || "Aktif",
        createdAt: editingGroup?.createdAt || now,
        updatedAt: now,
      };

      await onSave(payload);
      onClose();
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan kelompok mata pelajaran.");
    } finally {
      setSaving(false);
    }
  };

  const toggleSubject = (subId: string) => {
    const current = formData.subjectIds || [];
    if (current.includes(subId)) {
      setFormData({ ...formData, subjectIds: current.filter(id => id !== subId) });
    } else {
      setFormData({ ...formData, subjectIds: [...current, subId] });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-50 via-white to-indigo-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#531FFF] text-white flex items-center justify-center shadow-md shadow-[#531FFF]/20">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-gray-900 leading-tight">
                {editingGroup ? "Ubah Kelompok Mata Pelajaran" : "Tambah Kelompok Mata Pelajaran Baru"}
              </h3>
              <p className="text-xs text-gray-500">
                Wadahi mata pelajaran per jurusan/peminatan untuk Kelas, Jadwal, Penilaian &amp; Rapot.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nama Kelompok */}
            <div className="space-y-1 sm:col-span-2">
              <label className="block font-bold text-gray-700">
                Nama Kelompok Mata Pelajaran <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: Dasar Program Keahlian (C2) - RPL atau Peminatan MIPA"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] font-semibold text-xs"
                required
              />
            </div>

            {/* Kode Kelompok */}
            <div className="space-y-1">
              <label className="block font-bold text-gray-700">
                Kode Kelompok <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.code || ""}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Contoh: C2-RPL, A-NAS, C-MIPA"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] font-mono font-bold text-xs"
                required
              />
            </div>

            {/* Jurusan / Program Keahlian */}
            <div className="space-y-1">
              <label className="block font-bold text-gray-700">
                Terkait Jurusan / Program Keahlian
              </label>
              <select
                value={formData.major || "Semua Jurusan / Umum"}
                onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] font-bold text-xs cursor-pointer"
              >
                <option value="Semua Jurusan / Umum">Semua Jurusan / Umum (Nasional)</option>
                {majorOptions.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label} ({m.value})
                  </option>
                ))}
              </select>
            </div>

            {/* Kategori Kurikulum */}
            <div className="space-y-1">
              <label className="block font-bold text-gray-700">Kategori Kurikulum</label>
              <select
                value={formData.category || "Wajib"}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] font-bold text-xs cursor-pointer"
              >
                <option value="Wajib">Wajib (Muatan Nasional / Inti)</option>
                <option value="Peminatan">Peminatan / Kejuruan (Produktif / Minat)</option>
                <option value="Muatan Lokal">Muatan Lokal</option>
              </select>
            </div>

            {/* Sasaran Tingkat */}
            <div className="space-y-1">
              <label className="block font-bold text-gray-700">Sasaran Tingkat Kelas</label>
              <select
                value={formData.level || "Semua Tingkat"}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] font-bold text-xs cursor-pointer"
              >
                <option value="Semua Tingkat">Semua Tingkat</option>
                {gradeLevels.map((lvl) => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
                {currentStage === "SMK" && (
                  <option value="Kelas 11-12">Kelas 11 &amp; 12 (Konsentrasi Produktif)</option>
                )}
              </select>
            </div>

            {/* Urutan & Status */}
            <div className="space-y-1">
              <label className="block font-bold text-gray-700">Urutan Tampil Rapot</label>
              <input
                type="number"
                min={1}
                max={99}
                value={formData.order || 1}
                onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) || 1 })}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] font-bold text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-gray-700">Status Kelompok</label>
              <select
                value={formData.status || "Aktif"}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] font-bold text-xs cursor-pointer"
              >
                <option value="Aktif">Aktif</option>
                <option value="Nonaktif">Nonaktif</option>
              </select>
            </div>

            {/* Deskripsi */}
            <div className="space-y-1 sm:col-span-2">
              <label className="block font-bold text-gray-700">Deskripsi / Ruang Lingkup</label>
              <textarea
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Catatan mengenai cakupan materi ajar atau kelompok kompetensi ini..."
                rows={2}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] text-xs resize-none"
              />
            </div>

            {/* Pilih Mata Pelajaran Ditampung */}
            <div className="space-y-1.5 sm:col-span-2 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <label className="block font-extrabold text-gray-800">
                  Tautkan Mata Pelajaran ({formData.subjectIds?.length || 0} Terpilih)
                </label>
                <span className="text-[10px] text-gray-400">
                  Centang mata pelajaran yang masuk ke dalam kelompok ini
                </span>
              </div>

              {availableSubjects.length > 0 ? (
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-2.5 divide-y divide-gray-100 custom-scrollbar bg-gray-50/50">
                  {availableSubjects.map((sub) => {
                    const subId = sub._firestoreId || sub.code;
                    const isSelected = (formData.subjectIds || []).includes(subId);
                    return (
                      <label
                        key={subId}
                        className={cn(
                          "flex items-center justify-between py-2 px-2.5 rounded-lg cursor-pointer transition-colors",
                          isSelected ? "bg-purple-50 text-[#531FFF]" : "hover:bg-gray-100 text-gray-700"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSubject(subId)}
                            className="rounded border-gray-300 text-[#531FFF] focus:ring-[#531FFF] cursor-pointer"
                          />
                          <div>
                            <span className="font-bold block text-xs">{sub.name}</span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {sub.code} • {sub.creditHours || "3 JP"} • KKM: {sub.kkm || 75}
                            </span>
                          </div>
                        </div>
                        <span className={cn(
                          "text-[9px] font-extrabold px-2 py-0.5 rounded-full border",
                          sub.category === "Wajib" ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-purple-50 text-purple-700 border-purple-100"
                        )}>
                          {sub.category || "Wajib"}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  Belum ada master mata pelajaran. Tambahkan mata pelajaran terlebih dahulu.
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-bold text-white bg-[#531FFF] hover:bg-[#4314cc] rounded-xl shadow-md shadow-[#531FFF]/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? "Menyimpan..." : editingGroup ? "Perbarui Kelompok" : "Simpan Kelompok"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
