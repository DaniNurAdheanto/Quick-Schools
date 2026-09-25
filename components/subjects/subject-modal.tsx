"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  X, 
  BookOpen, 
  Save, 
  Edit3, 
  Users, 
  Check, 
  Loader2, 
  AlertCircle,
  Search,
  FolderKanban
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SubjectGroup } from "@/lib/subject-groups";
import type { SubjectInputData } from "@/lib/subject-sync-service";
import type { EducationalStage } from "@/lib/school-level-config";
import { ProfileAvatar } from "@/components/ui/profile-avatar";

interface SubjectModalProps {
  isOpen: boolean;
  mode: "create" | "edit" | "view";
  subject: any | null;
  onClose: () => void;
  onSave: (data: SubjectInputData, previousSubject?: any) => Promise<void>;
  onSwitchToEdit?: (subject: any) => void;
  subjectGroups: SubjectGroup[];
  majorOptions: { label: string; value: string }[];
  gradeLevels: string[];
  currentStage: EducationalStage;
  stageConfig: any;
  teachers: any[];
  isGuru?: boolean;
}

export function SubjectModal({
  isOpen,
  mode,
  subject,
  onClose,
  onSave,
  onSwitchToEdit,
  subjectGroups,
  majorOptions,
  gradeLevels,
  currentStage,
  stageConfig,
  teachers,
  isGuru = false,
}: SubjectModalProps) {
  const [formData, setFormData] = useState<SubjectInputData>({
    code: "",
    name: "",
    groupId: "",
    groupName: "",
    major: "Semua Jurusan / Umum",
    category: "Wajib",
    creditHours: "3 JP",
    kkm: 75,
    level: "Semua Tingkat",
    teacherIds: [],
    description: "",
    status: "Aktif",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Multi-select teacher dropdown state
  const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = useState(false);
  const [teacherSearchQuery, setTeacherSearchQuery] = useState("");
  const teacherDropdownRef = useRef<HTMLDivElement>(null);

  // Populate form data on open or subject change
  useEffect(() => {
    if (isOpen) {
      if (subject && (mode === "edit" || mode === "view")) {
        // Resolve teacherIds array
        let resolvedTeacherIds: string[] = [];
        if (Array.isArray(subject.teacherIds) && subject.teacherIds.length > 0) {
          resolvedTeacherIds = subject.teacherIds;
        } else if (Array.isArray(subject.teachers) && subject.teachers.length > 0) {
          resolvedTeacherIds = subject.teachers.map((t: any) => t.id || t.nip || t.name).filter(Boolean);
        } else if (typeof subject.teacher === "string" && subject.teacher !== "-") {
          const names = subject.teacher.split(",").map((s: string) => s.trim().toLowerCase());
          resolvedTeacherIds = teachers
            .filter(t => names.some((n: string) => t.name.toLowerCase().includes(n)))
            .map(t => t.id || t._firestoreId || t.nip)
            .filter(Boolean);
        }

        setFormData({
          code: subject.code || "",
          name: subject.name || "",
          groupId: subject.groupId || "",
          groupName: subject.groupName || "",
          major: subject.major || "Semua Jurusan / Umum",
          category: subject.category || "Wajib",
          creditHours: subject.creditHours || "3 JP",
          kkm: Number(subject.kkm) || stageConfig?.defaultKkm || 75,
          level: subject.level || "Semua Tingkat",
          teacherIds: resolvedTeacherIds,
          description: subject.description || "",
          status: subject.status || "Aktif",
        });
      } else {
        // New form defaults
        setFormData({
          code: "",
          name: "",
          groupId: "",
          groupName: "",
          major: "Semua Jurusan / Umum",
          category: "Wajib",
          creditHours: "3 JP",
          kkm: stageConfig?.defaultKkm || 75,
          level: "Semua Tingkat",
          teacherIds: [],
          description: "",
          status: "Aktif",
        });
      }
      setError(null);
      setIsTeacherDropdownOpen(false);
      setTeacherSearchQuery("");
    }
  }, [isOpen, subject, mode, stageConfig, teachers]);

  // Click outside to close teacher dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (teacherDropdownRef.current && !teacherDropdownRef.current.contains(e.target as Node)) {
        setIsTeacherDropdownOpen(false);
      }
    };
    if (isTeacherDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isTeacherDropdownOpen]);

  if (!isOpen) return null;

  // Filter teachers for dropdown
  const filteredTeachers = teachers.filter(t => {
    if (!teacherSearchQuery.trim()) return true;
    const q = teacherSearchQuery.toLowerCase().trim();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.nip && t.nip.toLowerCase().includes(q)) ||
      (t.subject && t.subject.toLowerCase().includes(q))
    );
  });

  const toggleTeacher = (tId: string) => {
    setFormData(prev => {
      const exists = prev.teacherIds.includes(tId);
      const updated = exists 
        ? prev.teacherIds.filter(id => id !== tId)
        : [...prev.teacherIds, tId];
      return { ...prev, teacherIds: updated };
    });
  };

  const removeTeacher = (tId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFormData(prev => ({
      ...prev,
      teacherIds: prev.teacherIds.filter(id => id !== tId)
    }));
  };

  // When group changes, auto-align major & category if group is specific
  const handleGroupChange = (newGroupId: string) => {
    const selectedGroup = subjectGroups.find(g => g.id === newGroupId);
    setFormData(prev => ({
      ...prev,
      groupId: newGroupId,
      groupName: selectedGroup ? selectedGroup.name : "",
      category: selectedGroup ? selectedGroup.category : prev.category,
      major: selectedGroup && selectedGroup.major !== "Semua Jurusan / Umum" ? selectedGroup.major : prev.major
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "view") return;

    if (!formData.code.trim()) {
      setError("Kode Mata Pelajaran wajib diisi.");
      return;
    }
    if (!formData.name.trim()) {
      setError("Nama Mata Pelajaran wajib diisi.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onSave(formData, subject);
      onClose();
    } catch (err: any) {
      console.error("Subject save error:", err);
      setError(err?.message || "Gagal menyimpan mata pelajaran ke database.");
    } finally {
      setSaving(false);
    }
  };

  // Assigned teachers objects for display
  const assignedTeacherObjects = teachers.filter(t => {
    const tId = (t.id || "").toLowerCase();
    const tDoc = (t._firestoreId || "").toLowerCase();
    const tNip = (t.nip || "").toLowerCase();
    return formData.teacherIds.some(rid => {
      const norm = rid.toLowerCase().trim();
      return norm === tId || norm === tDoc || norm === tNip;
    });
  });

  const matchedGroupName = subjectGroups.find(g => g.id === formData.groupId)?.name || formData.groupName || "Umum / Standar";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className={cn(
          "bg-white rounded-2xl w-full shadow-2xl flex flex-col relative overflow-hidden border border-gray-100 max-h-[92vh]",
          mode === "view" ? "max-w-2xl" : "max-w-3xl"
        )}
      >
        {/* ================= MODAL HEADER ================= */}
        <div className="relative px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-purple-50/70 via-white to-indigo-50/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#531FFF] text-white flex items-center justify-center shadow-md shadow-[#531FFF]/20 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black text-gray-900 tracking-tight">
                  {mode === "create" 
                    ? "Tambah Mata Pelajaran" 
                    : mode === "edit" 
                      ? "Edit Mata Pelajaran" 
                      : "Detail Mata Pelajaran"}
                </h3>
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-[11px] font-bold border",
                  formData.status === "Aktif" 
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                    : "bg-rose-50 text-rose-700 border-rose-200"
                )}>
                  {formData.status}
                </span>
                {mode === "view" && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-[#531FFF] border border-purple-200">
                    {formData.category}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                {mode === "create"
                  ? "Tambahkan mata pelajaran baru ke kurikulum sekolah."
                  : mode === "edit"
                    ? `Perbarui informasi dan relasi mata pelajaran "${formData.name || subject?.name}".`
                    : "Informasi lengkap kurikulum, guru pengampu, dan alokasi jam."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            title="Tutup"
            disabled={saving}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= MODAL BODY ================= */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs font-bold text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {mode === "view" ? (
            /* ================= VIEW MODE ================= */
            <div className="space-y-6">
              {/* Highlight Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-purple-500/10 border border-purple-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-extrabold text-[#531FFF] uppercase tracking-wider">
                    {formData.code || "KODE"}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5">
                    {formData.name}
                  </h2>
                  <p className="text-xs font-semibold text-gray-500 mt-1 flex items-center gap-2">
                    <FolderKanban className="w-3.5 h-3.5 text-[#531FFF]" />
                    <span>{matchedGroupName}</span>
                    <span>•</span>
                    <span>{formData.major}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="bg-white px-3.5 py-2 rounded-xl border border-purple-100 text-center shadow-2xs">
                    <span className="text-[10px] font-bold text-gray-400 block uppercase">Alokasi</span>
                    <span className="text-sm font-black text-[#531FFF]">{formData.creditHours}</span>
                  </div>
                  <div className="bg-white px-3.5 py-2 rounded-xl border border-purple-100 text-center shadow-2xs">
                    <span className="text-[10px] font-bold text-gray-400 block uppercase">KKM</span>
                    <span className="text-sm font-black text-emerald-600">{formData.kkm}</span>
                  </div>
                </div>
              </div>

              {/* Grid Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-1">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Kategori Kurikulum</span>
                  <p className="text-sm font-extrabold text-gray-800">{formData.category}</p>
                </div>
                <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-1">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Sasaran Tingkat</span>
                  <p className="text-sm font-extrabold text-gray-800">{formData.level}</p>
                </div>
                <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-1 sm:col-span-2">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Kelompok Mata Pelajaran (Jurusan)</span>
                  <p className="text-sm font-extrabold text-gray-800">{matchedGroupName}</p>
                  <p className="text-xs text-gray-500 font-medium">Jurusan / Peminatan: <strong>{formData.major}</strong></p>
                </div>
              </div>

              {/* Guru Pengampu Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#531FFF]" />
                    <span>Guru Pengampu ({assignedTeacherObjects.length})</span>
                  </h4>
                </div>

                {assignedTeacherObjects.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {assignedTeacherObjects.map((t) => (
                      <div key={t.id || t._firestoreId} className="p-3 rounded-xl border border-purple-100 bg-purple-50/40 flex items-center gap-3">
                        <ProfileAvatar 
                          name={t.name}
                          size="md"
                          role="guru"
                          className="w-9 h-9 rounded-lg shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">{t.name}</p>
                          <p className="text-[11px] text-gray-500 font-medium">NIP: {t.nip || "-"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 text-center">
                    <p className="text-xs font-semibold text-gray-400">Belum ada guru pengampu yang ditugaskan untuk mapel ini.</p>
                  </div>
                )}
              </div>

              {/* Deskripsi */}
              {formData.description && (
                <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-1.5">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Deskripsi / Cakupan Materi</span>
                  <p className="text-xs font-medium text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {formData.description}
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* ================= CREATE / EDIT FORM ================= */
            <form id="subject-form" onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Kode Mapel */}
                <div>
                  <label className="text-[12px] font-bold text-gray-700 uppercase tracking-wide block mb-1.5">
                    Kode Mapel <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="Contoh: MAT, BIN, RPL-PBO"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] uppercase transition-all"
                  />
                  <p className="text-[10px] text-gray-400 font-medium mt-1">Kode unik untuk jadwal, rpp, dan rapor.</p>
                </div>

                {/* Nama Mapel */}
                <div>
                  <label className="text-[12px] font-bold text-gray-700 uppercase tracking-wide block mb-1.5">
                    Nama Mata Pelajaran <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Contoh: Pemrograman Berorientasi Objek"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                  />
                </div>

                {/* Kelompok Mata Pelajaran */}
                <div>
                  <label className="text-[12px] font-bold text-gray-700 uppercase tracking-wide block mb-1.5">
                    Kelompok Mata Pelajaran
                  </label>
                  <select
                    value={formData.groupId}
                    onChange={(e) => handleGroupChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                  >
                    <option value="">-- Tanpa Kelompok (Umum / Standar) --</option>
                    {subjectGroups.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.code}){g.major && g.major !== "Semua Jurusan / Umum" ? ` • ${g.major}` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-400 font-medium mt-1">Mengelompokkan mapel di rapor (Nasional, Peminatan, Mulok).</p>
                </div>

                {/* Jurusan / Program Keahlian */}
                <div>
                  <label className="text-[12px] font-bold text-gray-700 uppercase tracking-wide block mb-1.5">
                    Jurusan / Program Keahlian
                  </label>
                  <select
                    value={formData.major}
                    onChange={(e) => setFormData(prev => ({ ...prev, major: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                  >
                    <option value="Semua Jurusan / Umum">Semua Jurusan / Umum</option>
                    {majorOptions.map(m => (
                      <option key={m.value} value={m.value}>
                        {m.label} ({m.value})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Kategori Kurikulum */}
                <div>
                  <label className="text-[12px] font-bold text-gray-700 uppercase tracking-wide block mb-1.5">
                    Kategori Kurikulum
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                  >
                    {currentStage === "SMK" ? (
                      <>
                        <option value="Wajib">Wajib (Muatan Nasional / Kewilayahan)</option>
                        <option value="Peminatan">Peminatan / Kejuruan (Produktif)</option>
                        <option value="Muatan Lokal">Muatan Lokal</option>
                      </>
                    ) : currentStage === "SD" ? (
                      <>
                        <option value="Wajib">Wajib / Tematik</option>
                        <option value="Peminatan">Peminatan / Ekstrakurikuler</option>
                        <option value="Muatan Lokal">Muatan Lokal</option>
                      </>
                    ) : (
                      <>
                        <option value="Wajib">Wajib (Umum)</option>
                        <option value="Peminatan">Peminatan (MIPA / IPS / Bahasa)</option>
                        <option value="Muatan Lokal">Muatan Lokal</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Tingkat / Sasaran Kelas */}
                <div>
                  <label className="text-[12px] font-bold text-gray-700 uppercase tracking-wide block mb-1.5">
                    Tingkat / Sasaran Kelas
                  </label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData(prev => ({ ...prev, level: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                  >
                    <option value="Semua Tingkat">Semua Tingkat</option>
                    {gradeLevels.map(lvl => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                </div>

                {/* Beban Jam (JP) */}
                <div>
                  <label className="text-[12px] font-bold text-gray-700 uppercase tracking-wide block mb-1.5">
                    Alokasi Jam (JP / Minggu)
                  </label>
                  <input
                    type="text"
                    value={formData.creditHours}
                    onChange={(e) => setFormData(prev => ({ ...prev, creditHours: e.target.value }))}
                    placeholder="Contoh: 4 JP"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                  />
                </div>

                {/* KKM */}
                <div>
                  <label className="text-[12px] font-bold text-gray-700 uppercase tracking-wide block mb-1.5">
                    KKM (Kriteria Ketuntasan)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.kkm}
                    onChange={(e) => setFormData(prev => ({ ...prev, kkm: Number(e.target.value) || 75 }))}
                    placeholder="Contoh: 75"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                  />
                </div>

                {/* Guru Pengajar Multi-Select */}
                <div className="sm:col-span-2 relative" ref={teacherDropdownRef}>
                  <label className="text-[12px] font-bold text-gray-700 uppercase tracking-wide block mb-1.5">
                    Guru Pengajar (Bisa Lebih dari 1)
                  </label>

                  {/* Trigger Box with Selected Chips */}
                  <div
                    onClick={() => setIsTeacherDropdownOpen(prev => !prev)}
                    className={cn(
                      "min-h-[46px] w-full px-3 py-2 border border-gray-200 rounded-xl text-xs transition-all flex flex-wrap items-center justify-between gap-1.5 cursor-pointer bg-white",
                      isTeacherDropdownOpen && "ring-2 ring-[#531FFF]/20 border-[#531FFF]"
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                      {assignedTeacherObjects.length > 0 ? (
                        assignedTeacherObjects.map((t) => (
                          <span
                            key={t.id || t._firestoreId}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-[#531FFF] border border-purple-200 shadow-2xs"
                          >
                            <span>{t.name}</span>
                            <button
                              type="button"
                              onClick={(e) => removeTeacher(t.id || t._firestoreId || t.nip, e)}
                              className="p-0.5 hover:bg-purple-200/60 rounded-full text-purple-600 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 font-medium">Klik untuk memilih satu atau lebih guru pengajar...</span>
                      )}
                    </div>
                    <Users className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
                  </div>

                  {/* Dropdown Menu */}
                  {isTeacherDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-100 rounded-xl shadow-xl z-30 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                      <div className="p-2.5 border-b border-gray-100 bg-gray-50/60">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={teacherSearchQuery}
                            onChange={(e) => setTeacherSearchQuery(e.target.value)}
                            placeholder="Cari nama guru atau NIP..."
                            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-[#531FFF] bg-white font-medium"
                            autoFocus
                          />
                        </div>
                      </div>

                      <div className="max-h-56 overflow-y-auto p-1.5 custom-scrollbar divide-y divide-gray-50">
                        {filteredTeachers.length > 0 ? (
                          filteredTeachers.map((t) => {
                            const tKey = t.id || t._firestoreId || t.nip;
                            const isSelected = formData.teacherIds.includes(tKey);
                            return (
                              <div
                                key={tKey}
                                onClick={() => toggleTeacher(tKey)}
                                className={cn(
                                  "flex items-center justify-between p-2.5 rounded-lg text-xs cursor-pointer transition-colors",
                                  isSelected 
                                    ? "bg-purple-50 text-[#531FFF] font-bold" 
                                    : "hover:bg-gray-50 text-gray-700 font-medium"
                                )}
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className={cn(
                                    "w-4 h-4 rounded flex items-center justify-center border transition-all",
                                    isSelected 
                                      ? "bg-[#531FFF] border-[#531FFF] text-white" 
                                      : "border-gray-300 bg-white"
                                  )}>
                                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold leading-none">{t.name}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">NIP: {t.nip || "-"}</p>
                                  </div>
                                </div>
                                {isSelected && (
                                  <span className="text-[10px] font-extrabold text-[#531FFF]">Terpilih</span>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-3 text-center text-xs text-gray-400 font-medium">
                            Tidak ada guru ditemukan.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Status Mapel */}
                <div>
                  <label className="text-[12px] font-bold text-gray-700 uppercase tracking-wide block mb-1.5">
                    Status Mapel
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>

                {/* Deskripsi */}
                <div className="sm:col-span-2">
                  <label className="text-[12px] font-bold text-gray-700 uppercase tracking-wide block mb-1.5">
                    Deskripsi / Silabus Pembelajaran
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Ringkasan cakupan materi pembelajaran, kompetensi dasar, dan capaian pembelajaran..."
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all custom-scrollbar"
                  />
                </div>

              </div>
            </form>
          )}
        </div>

        {/* ================= MODAL FOOTER ================= */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/70 flex items-center justify-between shrink-0">
          {mode === "view" ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 transition-colors cursor-pointer"
              >
                Tutup
              </button>
              {!isGuru && onSwitchToEdit && (
                <button
                  type="button"
                  onClick={() => onSwitchToEdit(subject)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#531FFF] hover:bg-[#4314cc] shadow-md shadow-[#531FFF]/20 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Mata Pelajaran</span>
                </button>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                form="subject-form"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#531FFF] hover:bg-[#4314cc] shadow-md shadow-[#531FFF]/25 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan ke Database...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>{mode === "create" ? "Simpan Mata Pelajaran" : "Perbarui Data Mata Pelajaran"}</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
