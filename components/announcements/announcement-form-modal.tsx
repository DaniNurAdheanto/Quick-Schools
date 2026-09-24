"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Megaphone,
  FileText,
  Users,
  Tag,
  Calendar,
  Clock,
  MapPin,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Info,
  Sparkles,
  Search,
  Check,
  Type,
  Radio
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TARGET_ROLE_OPTIONS, cleanAnnouncementDesc } from "@/lib/announcements-helper";

interface AnnouncementFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit" | "delete";
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
}

const CATEGORY_OPTIONS = [
  {
    value: "PENTING",
    label: "Penting",
    desc: "Mendesak & penting",
    emoji: "🔴",
    activeColor: "bg-red-50 text-red-700 border-red-300 ring-2 ring-red-400/20",
    dotColor: "bg-red-500",
  },
  {
    value: "AKADEMIK",
    label: "Akademik",
    desc: "Ujian, nilai & kurikulum",
    emoji: "📚",
    activeColor: "bg-blue-50 text-blue-700 border-blue-300 ring-2 ring-blue-400/20",
    dotColor: "bg-blue-500",
  },
  {
    value: "KEUANGAN",
    label: "Keuangan",
    desc: "SPP & tagihan",
    emoji: "💰",
    activeColor: "bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-400/20",
    dotColor: "bg-emerald-500",
  },
  {
    value: "KEGIATAN",
    label: "Kegiatan",
    desc: "Acara & event sekolah",
    emoji: "🎉",
    activeColor: "bg-purple-50 text-[#531FFF] border-[#531FFF]/40 ring-2 ring-[#531FFF]/20",
    dotColor: "bg-[#531FFF]",
  },
  {
    value: "INFORMASI",
    label: "Informasi",
    desc: "Berita umum sekolah",
    emoji: "ℹ️",
    activeColor: "bg-sky-50 text-sky-700 border-sky-300 ring-2 ring-sky-400/20",
    dotColor: "bg-sky-500",
  },
];

const STATUS_OPTIONS = [
  {
    value: "Aktif",
    label: "Aktif",
    desc: "Langsung ditampilkan",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  {
    value: "Terjadwal",
    label: "Terjadwal",
    desc: "Akan tayang sesuai jadwal",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  {
    value: "Berakhir",
    label: "Berakhir",
    desc: "Arsip / sudah selesai",
    badge: "bg-gray-100 text-gray-700 border-gray-200",
    dot: "bg-gray-400",
  },
];

export function AnnouncementFormModal({
  open,
  onOpenChange,
  mode,
  initialData,
  onSubmit,
}: AnnouncementFormModalProps) {
  // Form values
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [selectedTargets, setSelectedTargets] = useState<string[]>(["Semua"]);
  const [tag, setTag] = useState("INFORMASI");
  const [status, setStatus] = useState("Aktif");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [room, setRoom] = useState("");

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [targetDropdownOpen, setTargetDropdownOpen] = useState(false);
  const [targetSearchQuery, setTargetSearchQuery] = useState("");
  const targetDropdownRef = useRef<HTMLDivElement>(null);

  // Sync initialData when modal opens or initialData changes
  useEffect(() => {
    if (!open) return;

    if (initialData && (mode === "edit" || mode === "delete")) {
      setTitle(initialData.title || "");
      setDesc(cleanAnnouncementDesc(initialData.desc || ""));
      
      // Parse targets
      if (Array.isArray(initialData.target)) {
        setSelectedTargets(initialData.target.length ? initialData.target : ["Semua"]);
      } else if (typeof initialData.target === "string" && initialData.target.trim()) {
        const parts = initialData.target.split(",").map((s: string) => s.trim()).filter(Boolean);
        setSelectedTargets(parts.length ? parts : ["Semua"]);
      } else {
        setSelectedTargets(["Semua"]);
      }

      setTag(initialData.tag || "INFORMASI");
      setStatus(initialData.status || "Aktif");
      setEventDate(initialData.eventDate || "");
      setEventTime(initialData.eventTime || "");
      setRoom(initialData.room || "");
    } else {
      // Create mode defaults
      setTitle("");
      setDesc("");
      setSelectedTargets(["Semua"]);
      setTag("INFORMASI");
      setStatus("Aktif");
      setEventDate("");
      setEventTime("");
      setRoom("");
    }
  }, [open, initialData, mode]);

  // Close target dropdown on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (targetDropdownRef.current && !targetDropdownRef.current.contains(e.target as Node)) {
        setTargetDropdownOpen(false);
      }
    };
    if (targetDropdownOpen) {
      document.addEventListener("mousedown", handleOutside);
    }
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [targetDropdownOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onOpenChange, isSubmitting]);

  // Target toggle handler
  const handleToggleTarget = (val: string) => {
    if (val === "Semua") {
      setSelectedTargets(["Semua"]);
      return;
    }

    let next = selectedTargets.filter((t) => t !== "Semua");
    if (next.includes(val)) {
      next = next.filter((t) => t !== val);
      if (next.length === 0) next = ["Semua"];
    } else {
      next = [...next, val];
    }
    setSelectedTargets(next);
  };

  const handleRemoveTarget = (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let next = selectedTargets.filter((t) => t !== val);
    if (next.length === 0) next = ["Semua"];
    setSelectedTargets(next);
  };

  // Submit handler
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    if (mode !== "delete" && !title.trim()) {
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        title: title.trim(),
        desc: desc.trim(),
        target: selectedTargets,
        tag,
        status,
        eventDate,
        eventTime,
        room: room.trim(),
      });
      onOpenChange(false);
    } catch (err) {
      console.error("Submit error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  // Filter target role options
  const filteredRoleOptions = TARGET_ROLE_OPTIONS.filter((opt) => {
    if (!targetSearchQuery.trim()) return true;
    const q = targetSearchQuery.toLowerCase();
    return opt.label.toLowerCase().includes(q) || opt.description.toLowerCase().includes(q);
  });

  // Render Delete Confirmation Modal
  if (mode === "delete") {
    return (
      <div className="fixed inset-0 z-50 p-4 bg-gray-950/60 backdrop-blur-xs flex items-center justify-center animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl max-w-[460px] w-full p-6 shadow-2xl border border-gray-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100 shadow-sm">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Hapus Pengumuman?</h3>
          <p className="text-[13px] text-gray-500 mt-2 leading-relaxed">
            Apakah Anda yakin ingin menghapus pengumuman{" "}
            <strong className="text-gray-900">&quot;{initialData?.title || "ini"}&quot;</strong>?
            Tindakan ini permanen dan pengumuman tidak akan dapat dilihat lagi oleh warga sekolah.
          </p>

          <div className="flex items-center gap-3 w-full mt-6">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Menghapus...
                </>
              ) : (
                "Ya, Hapus"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isCreate = mode === "create";

  return (
    <div className="fixed inset-0 z-50 p-2 sm:p-5 bg-gray-950/60 backdrop-blur-xs flex items-center justify-center animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-100/90 my-auto flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* ================= MODAL HEADER ================= */}
        <div className="relative px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-purple-50/70 via-white to-indigo-50/40 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#531FFF] text-white flex items-center justify-center shadow-md shadow-[#531FFF]/25 shrink-0">
                <Megaphone className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">
                    {isCreate ? "Buat Pengumuman Baru" : "Edit Pengumuman"}
                  </h2>
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                      isCreate
                        ? "bg-purple-50 text-[#531FFF] border-purple-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    )}
                  >
                    {isCreate ? "Pengumuman Baru" : "Perbarui"}
                  </span>
                </div>
                <p className="text-[12px] sm:text-[13px] text-gray-500 font-medium mt-0.5">
                  {isCreate
                    ? "Rancang dan bagikan informasi resmi kepada warga sekolah."
                    : "Perbarui detail konten, sasaran penerima, atau agenda."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
              title="Tutup (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================= MODAL BODY / FORM ================= */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* SECTION 1: KONTEN UTAMA */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#531FFF] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> 1. Konten Pengumuman
              </span>
              <span className="text-[11px] text-gray-400 font-medium">
                Tanda <strong className="text-rose-500">*</strong> wajib diisi
              </span>
            </div>

            {/* Judul Input */}
            <div className="space-y-1.5">
              <label htmlFor="announcement-title" className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-[#531FFF]/70" />
                Judul Pengumuman <span className="text-rose-500">*</span>
              </label>
              <div className="relative rounded-2xl transition-all group">
                <input
                  id="announcement-title"
                  type="text"
                  required
                  placeholder="Contoh: Libur Hari Raya Idul Fitri 1447 H & Jadwal Masuk"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isSubmitting}
                  maxLength={150}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white focus:bg-white text-[13px] sm:text-sm font-semibold text-gray-900 placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:border-[#531FFF] focus:ring-4 focus:ring-[#531FFF]/10 transition-all shadow-2xs"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 pointer-events-none">
                  {title.length}/150
                </span>
              </div>
            </div>

            {/* Isi Pengumuman Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="announcement-desc" className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#531FFF]/70" />
                  Isi / Detail Pengumuman <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-gray-400">
                  {desc.length} karakter
                </span>
              </div>
              <textarea
                id="announcement-desc"
                required
                rows={5}
                placeholder="Tuliskan isi pengumuman secara lengkap, jelas, dan informatif di sini. Anda dapat menuliskan beberapa paragraf serta instruksi yang perlu diperhatikan..."
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white focus:bg-white text-[13px] sm:text-sm font-normal text-gray-900 placeholder:text-gray-400 leading-relaxed focus:outline-none focus:border-[#531FFF] focus:ring-4 focus:ring-[#531FFF]/10 transition-all resize-y min-h-[120px] shadow-2xs"
              />
              <p className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
                <Info className="w-3 h-3 text-gray-400 shrink-0" />
                Gunakan bahasa yang santun dan jelas agar mudah dimengerti penerima.
              </p>
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          {/* SECTION 2: SASARAN & KLASIFIKASI */}
          <div className="space-y-4">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#531FFF] flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> 2. Target Penerima & Kategori
            </span>

            {/* Target Penerima (Multi-Select with Chips) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#531FFF]/70" />
                  Target Penerima (Bisa Pilih Lebih Dari Satu) <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedTargets(["Semua"])}
                    className="text-[11px] font-bold text-[#531FFF] hover:underline cursor-pointer"
                  >
                    Set Semua
                  </button>
                </div>
              </div>

              {/* Target MultiSelect Box */}
              <div className="relative" ref={targetDropdownRef}>
                <div
                  onClick={() => !isSubmitting && setTargetDropdownOpen((prev) => !prev)}
                  className={cn(
                    "min-h-[46px] w-full px-3.5 py-2 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white focus-within:bg-white transition-all flex flex-wrap items-center justify-between gap-1.5 cursor-pointer shadow-2xs",
                    targetDropdownOpen && "ring-4 ring-[#531FFF]/10 border-[#531FFF] bg-white"
                  )}
                >
                  <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                    {selectedTargets.map((val) => {
                      const opt = TARGET_ROLE_OPTIONS.find((o) => o.value === val);
                      const IconComp = opt?.icon || Users;
                      return (
                        <span
                          key={val}
                          className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-xs border shadow-2xs transition-all",
                            opt?.badgeColor || "bg-purple-50 text-[#531FFF] border-purple-200"
                          )}
                        >
                          <IconComp className="w-3 h-3 shrink-0" />
                          <span>{val}</span>
                          <button
                            type="button"
                            onClick={(e) => handleRemoveTarget(val, e)}
                            className="ml-0.5 text-gray-400 hover:text-gray-700 hover:bg-black/5 rounded-full p-0.5 transition-colors"
                            title="Hapus"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0",
                      targetDropdownOpen && "rotate-180 text-[#531FFF]"
                    )}
                  />
                </div>

                {/* Dropdown Popover */}
                {targetDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 z-30 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-2 border-b border-gray-100 bg-gray-50/70">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Cari peran target..."
                          value={targetSearchQuery}
                          onChange={(e) => setTargetSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#531FFF]"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>

                    <div className="max-h-56 overflow-y-auto p-1.5 space-y-1">
                      {filteredRoleOptions.map((opt) => {
                        const isSelected = selectedTargets.includes(opt.value);
                        const IconComp = opt.icon;
                        return (
                          <div
                            key={opt.value}
                            onClick={() => handleToggleTarget(opt.value)}
                            className={cn(
                              "flex items-start gap-2.5 p-2 rounded-xl cursor-pointer transition-colors text-left",
                              isSelected ? "bg-purple-50/80 hover:bg-purple-50" : "hover:bg-gray-50"
                            )}
                          >
                            <div
                              className={cn(
                                "w-4 h-4 rounded-md border mt-0.5 flex items-center justify-center shrink-0 transition-colors",
                                isSelected
                                  ? "bg-[#531FFF] border-[#531FFF] text-white"
                                  : "border-gray-300 bg-white"
                              )}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <IconComp className="w-3.5 h-3.5 text-[#531FFF]/70 shrink-0" />
                                <span className="text-xs font-bold text-gray-900">{opt.label}</span>
                              </div>
                              <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">{opt.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-gray-400 font-medium">
                Pilih satu atau lebih peran. Jika memilih &quot;Semua&quot;, pengumuman dapat diakses seluruh warga sekolah.
              </p>
            </div>

            {/* Kategori / Tag Picker */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#531FFF]/70" />
                Kategori Pengumuman <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {CATEGORY_OPTIONS.map((cat) => {
                  const isSelected = tag === cat.value;
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setTag(cat.value)}
                      className={cn(
                        "p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer",
                        isSelected
                          ? cat.activeColor
                          : "bg-gray-50/50 border-gray-200/80 hover:bg-gray-100/60 text-gray-700"
                      )}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-base">{cat.emoji}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold">{cat.label}</div>
                        <div className="text-[10px] text-gray-500 leading-tight truncate">{cat.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status Publikasi */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-[#531FFF]/70" />
                Status Publikasi <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {STATUS_OPTIONS.map((st) => {
                  const isSelected = status === st.value;
                  return (
                    <div
                      key={st.value}
                      onClick={() => setStatus(st.value)}
                      className={cn(
                        "p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3",
                        isSelected
                          ? "bg-purple-50/60 border-[#531FFF] ring-2 ring-[#531FFF]/15"
                          : "bg-gray-50/50 border-gray-200 hover:bg-gray-100/60"
                      )}
                    >
                      <div
                        className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                          isSelected ? "border-[#531FFF]" : "border-gray-300"
                        )}
                      >
                        {isSelected && <div className="w-2 h-2 rounded-full bg-[#531FFF]" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", st.dot)} />
                          <span className="text-xs font-bold text-gray-900">{st.label}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 truncate">{st.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          {/* SECTION 3: AGENDA & LOKASI PELAKSANAAN (OPSIONAL) */}
          <div className="p-4 rounded-2xl bg-purple-50/30 border border-purple-100/80 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900">Agenda & Lokasi Pelaksanaan</h4>
                  <p className="text-[11px] text-gray-500">Opsional. Isi jika pengumuman terkait acara atau kegiatan bertanggal.</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-full">
                Opsional
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Tanggal Pelaksanaan */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#531FFF]/70" /> Tanggal
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-800 focus:outline-none focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/10 shadow-2xs"
                />
              </div>

              {/* Waktu Pelaksanaan */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#531FFF]/70" /> Waktu / Jam
                </label>
                <input
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-800 focus:outline-none focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/10 shadow-2xs"
                />
              </div>

              {/* Lokasi / Ruangan */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#531FFF]/70" /> Lokasi / Ruang
                </label>
                <input
                  type="text"
                  placeholder="Aula, Lab, Lapangan..."
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#531FFF] focus:ring-2 focus:ring-[#531FFF]/10 shadow-2xs"
                />
              </div>
            </div>
          </div>
        </form>

        {/* ================= MODAL FOOTER ================= */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSubmitting || !title.trim()}
            className="px-5 py-2.5 rounded-xl bg-[#531FFF] hover:bg-[#4314E5] text-white text-xs font-bold transition-all shadow-md shadow-[#531FFF]/20 hover:shadow-lg hover:shadow-[#531FFF]/25 flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>{isCreate ? "Publikasikan Pengumuman" : "Simpan Perubahan"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
