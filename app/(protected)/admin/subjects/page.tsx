"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  BookOpen, 
  Plus, 
  Search, 
  PenTool, 
  Trash2, 
  Loader2, 
  Eye, 
  Sparkles, 
  Clock, 
  Target, 
  UserCheck, 
  Layers, 
  LayoutGrid, 
  Table as TableIcon, 
  Check, 
  X, 
  ChevronRight,
  GraduationCap
} from "lucide-react";
import { CrudSheet, CrudField } from "@/components/layouts/crud-sheet";
import { db, auth } from "@/lib/firebase";
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, writeBatch } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";

// Standard Curriculum Presets (Kurikulum Merdeka & Nasional)
interface SubjectPreset {
  code: string;
  name: string;
  category: "Wajib" | "Peminatan" | "Muatan Lokal";
  creditHours: string;
  level: string;
  kkm: number;
  icon: string;
  description: string;
}

const STANDARD_PRESETS: SubjectPreset[] = [
  { code: "PAI", name: "Pendidikan Agama & Budi Pekerti", category: "Wajib", creditHours: "3 JP", level: "Semua Tingkat", kkm: 75, icon: "🕌", description: "Pendidikan nilai keimanan, moral, dan akhlak mulia" },
  { code: "PKN", name: "Pendidikan Pancasila (PPKn)", category: "Wajib", creditHours: "2 JP", level: "Semua Tingkat", kkm: 75, icon: "🏛️", description: "Pendidikan kewarganegaraan, konstitusi, dan ideologi bangsa" },
  { code: "BIN", name: "Bahasa Indonesia", category: "Wajib", creditHours: "4 JP", level: "Semua Tingkat", kkm: 75, icon: "🇮🇩", description: "Literasi, tata bahasa, dan sastra bahasa Indonesia" },
  { code: "MAT", name: "Matematika Wajib", category: "Wajib", creditHours: "4 JP", level: "Semua Tingkat", kkm: 75, icon: "📐", description: "Aljabar, geometri, statistika, dan penalaran kuantitatif" },
  { code: "BIG", name: "Bahasa Inggris", category: "Wajib", creditHours: "3 JP", level: "Semua Tingkat", kkm: 75, icon: "🇬🇧", description: "Komunikasi lisan, tulisan, dan literatur Bahasa Inggris" },
  { code: "SEJ", name: "Sejarah Indonesia", category: "Wajib", creditHours: "2 JP", level: "Semua Tingkat", kkm: 75, icon: "📜", description: "Sejarah kemerdekaan, peradaban, dan dinamika kebangsaan" },
  { code: "PJK", name: "Pendidikan Jasmani (PJOK)", category: "Wajib", creditHours: "3 JP", level: "Semua Tingkat", kkm: 75, icon: "⚽", description: "Kebugaran fisik, sportivitas, dan pola hidup sehat" },
  { code: "SNB", name: "Seni Budaya & Prakarya", category: "Wajib", creditHours: "2 JP", level: "Semua Tingkat", kkm: 75, icon: "🎨", description: "Kreativitas seni musik, rupa, tari, dan karya terapan" },
  { code: "INF", name: "Informatika", category: "Wajib", creditHours: "2 JP", level: "Semua Tingkat", kkm: 75, icon: "💻", description: "Pemrograman, literasi digital, algoritma, dan sistem komputasi" },
  // Peminatan MIPA
  { code: "FIS", name: "Fisika", category: "Peminatan", creditHours: "4 JP", level: "Kelas 10-12", kkm: 75, icon: "⚛️", description: "Mekanika, termodinamika, gelombang, dan fisika modern" },
  { code: "KIM", name: "Kimia", category: "Peminatan", creditHours: "4 JP", level: "Kelas 10-12", kkm: 75, icon: "🧪", description: "Struktur atom, ikatan kimia, stoikiometri, dan kinetika" },
  { code: "BIO", name: "Biologi", category: "Peminatan", creditHours: "4 JP", level: "Kelas 10-12", kkm: 75, icon: "🧬", description: "Genetika, ekosistem, bioteknologi, dan fisiologi makhluk hidup" },
  { code: "MTL", name: "Matematika Tingkat Lanjut", category: "Peminatan", creditHours: "4 JP", level: "Kelas 11-12", kkm: 75, icon: "📊", description: "Kalkulus lanjutan, aljabar matriks, vektor, dan polinomial" },
  // Peminatan IPS
  { code: "EKO", name: "Ekonomi", category: "Peminatan", creditHours: "4 JP", level: "Kelas 10-12", kkm: 75, icon: "💰", description: "Makroekonomi, mikroekonomi, akuntansi, dan perbankan" },
  { code: "GEO", name: "Geografi", category: "Peminatan", creditHours: "4 JP", level: "Kelas 10-12", kkm: 75, icon: "🌍", description: "Litosfer, hidrosfer, atmosfer, dan sistem informasi geografis" },
  { code: "SOS", name: "Sosiologi", category: "Peminatan", creditHours: "4 JP", level: "Kelas 10-12", kkm: 75, icon: "👥", description: "Dinamika sosial, konflik, stratifikasi, dan perubahan masyarakat" },
  // Muatan Lokal
  { code: "BHD", name: "Bahasa Daerah", category: "Muatan Lokal", creditHours: "2 JP", level: "Semua Tingkat", kkm: 75, icon: "🗣️", description: "Pelestarian budaya dan tata krama bahasa daerah" },
  { code: "PLH", name: "Pendidikan Lingkungan Hidup", category: "Muatan Lokal", creditHours: "2 JP", level: "Semua Tingkat", kkm: 75, icon: "🌱", description: "Ekologi sekolah, konservasi alam, dan pengelolaan sampah" }
];

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedBatchPresets, setSelectedBatchPresets] = useState<string[]>([]);
  const [isBatchAdding, setIsBatchAdding] = useState(false);
  const toast = useToast();

  const [crudState, setCrudState] = useState<{ open: boolean; mode: "create" | "edit" | "delete" | "view"; data?: any }>({
    open: false,
    mode: "create"
  });

  // Real-time subjects & teachers listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const qSubjects = query(collection(db, "subjects"));
        const unsubSubjects = onSnapshot(qSubjects, (snapshot) => {
          const data = snapshot.docs.map(doc => ({
            _firestoreId: doc.id,
            ...doc.data()
          }));
          setSubjects(data);
          setLoading(false);
        }, (error) => {
          console.error("Error fetching subjects:", error);
          setLoading(false);
        });

        const qTeachers = query(collection(db, "teachers"));
        const unsubTeachers = onSnapshot(qTeachers, (snapshot) => {
          const tList = snapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name || "Guru",
            subject: doc.data().subject || ""
          }));
          setTeachers(tList);
        });
        
        return () => {
          unsubSubjects();
          unsubTeachers();
        };
      } else {
        setSubjects([]);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Form Fields Configuration for CrudSheet
  const subjectFields: CrudField[] = useMemo(() => [
    { 
      name: "code", 
      label: "Kode Mapel", 
      placeholder: "Contoh: MAT, BIN, IPA-10", 
      category: "akademik",
      colSpan: 1
    },
    { 
      name: "name", 
      label: "Nama Mata Pelajaran", 
      placeholder: "Contoh: Matematika Wajib", 
      category: "akademik",
      colSpan: 1
    },
    { 
      name: "category", 
      label: "Kategori Kelompok Mapel", 
      type: "select", 
      category: "akademik",
      options: [
        { label: "Wajib", value: "Wajib" },
        { label: "Peminatan", value: "Peminatan" },
        { label: "Muatan Lokal", value: "Muatan Lokal" }
      ],
      colSpan: 1
    },
    { 
      name: "creditHours", 
      label: "Alokasi Jam (JP / Minggu)", 
      placeholder: "Contoh: 4 JP", 
      category: "akademik",
      colSpan: 1
    },
    { 
      name: "kkm", 
      label: "KKM (Kriteria Ketuntasan)", 
      placeholder: "Contoh: 75", 
      category: "akademik",
      colSpan: 1
    },
    { 
      name: "level", 
      label: "Tingkat / Sasaran Kelas", 
      type: "select",
      category: "akademik",
      options: [
        { label: "Semua Tingkat", value: "Semua Tingkat" },
        { label: "Kelas 10", value: "Kelas 10" },
        { label: "Kelas 11", value: "Kelas 11" },
        { label: "Kelas 12", value: "Kelas 12" }
      ],
      colSpan: 1
    },
    {
      name: "teacher",
      label: "Guru Pengampu / Koordinator",
      type: "select",
      category: "akademik",
      options: [
        { label: "-- Belum Ditentukan --", value: "-" },
        ...teachers.map(t => ({ label: `${t.name} (${t.subject || "Guru"})`, value: t.name }))
      ],
      colSpan: 2
    },
    {
      name: "description",
      label: "Deskripsi Mata Pelajaran",
      placeholder: "Ringkasan cakupan materi pembelajaran...",
      category: "pribadi",
      colSpan: 2
    },
    { 
      name: "status", 
      label: "Status Mapel", 
      type: "select", 
      category: "darurat",
      options: [
        { label: "Aktif", value: "Aktif" },
        { label: "Nonaktif", value: "Nonaktif" }
      ],
      colSpan: 2
    }
  ], [teachers]);

  // CRUD Submission Handler
  const handleCrudSubmit = async (data: any) => {
    try {
      const payload = {
        code: (data.code || "").toUpperCase().trim(),
        name: (data.name || "").trim(),
        category: data.category || "Wajib",
        creditHours: data.creditHours || "3 JP",
        kkm: Number(data.kkm) || 75,
        level: data.level || "Semua Tingkat",
        teacher: data.teacher || "-",
        description: data.description || "",
        status: data.status || "Aktif",
        updatedAt: new Date().toISOString()
      };

      if (crudState.mode === "create") {
        await addDoc(collection(db, "subjects"), {
          ...payload,
          createdAt: new Date().toISOString()
        });
      } else if (crudState.mode === "edit" && data._firestoreId) {
        await updateDoc(doc(db, "subjects", data._firestoreId), payload);
      } else if (crudState.mode === "delete" && data._firestoreId) {
        await deleteDoc(doc(db, "subjects", data._firestoreId));
      }
    } catch (error: any) {
      console.error("Error saving subject data:", error);
      throw error;
    }
  };

  // Quick Apply Preset to New Form
  const handleApplyPreset = (preset: SubjectPreset) => {
    setCrudState({
      open: true,
      mode: "create",
      data: {
        code: preset.code,
        name: preset.name,
        category: preset.category,
        creditHours: preset.creditHours,
        level: preset.level,
        kkm: preset.kkm,
        description: preset.description,
        teacher: "-",
        status: "Aktif"
      }
    });
  };

  // Batch Add Standard Curriculum Package
  const handleBatchAddPresets = async () => {
    if (selectedBatchPresets.length === 0) {
      toast.showError("Pilih minimal 1 mata pelajaran untuk ditambahkan.", "Peringatan");
      return;
    }

    try {
      setIsBatchAdding(true);
      const batch = writeBatch(db);
      let count = 0;

      selectedBatchPresets.forEach(code => {
        const preset = STANDARD_PRESETS.find(p => p.code === code);
        if (preset) {
          const docRef = doc(collection(db, "subjects"));
          batch.set(docRef, {
            code: preset.code,
            name: preset.name,
            category: preset.category,
            creditHours: preset.creditHours,
            level: preset.level,
            kkm: preset.kkm,
            description: preset.description,
            teacher: "-",
            status: "Aktif",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          count++;
        }
      });

      await batch.commit();
      setShowBatchModal(false);
      setSelectedBatchPresets([]);
      toast.showSuccess(`Berhasil menambahkan ${count} mata pelajaran standar nasional!`, "Paket Berhasil Ditambahkan");
    } catch (err: any) {
      console.error("Batch add error:", err);
      toast.showError("Gagal menambahkan paket mata pelajaran.", "Gagal");
    } finally {
      setIsBatchAdding(false);
    }
  };

  // Filtered & Searched Subjects List
  const filteredSubjects = useMemo(() => {
    return subjects.filter((item) => {
      const matchSearch = 
        !searchQuery.trim() ||
        (item.name || "").toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        (item.code || "").toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        (item.teacher || "").toLowerCase().includes(searchQuery.toLowerCase().trim());

      const matchCategory = 
        selectedCategory === "All" || item.category === selectedCategory;

      const matchStatus = 
        selectedStatus === "All" || (item.status || "Aktif") === selectedStatus;

      return matchSearch && matchCategory && matchStatus;
    });
  }, [subjects, searchQuery, selectedCategory, selectedStatus]);

  // Analytics
  const activeCount = subjects.filter(s => (s.status || "Aktif") === "Aktif").length;
  const wajibCount = subjects.filter(s => s.category === "Wajib").length;
  const peminatanCount = subjects.filter(s => s.category === "Peminatan").length;
  const mulokCount = subjects.filter(s => s.category === "Muatan Lokal").length;

  // Existing subject codes in lowercase for quick checking in batch modal
  const existingCodes = useMemo(() => {
    return new Set(subjects.map(s => (s.code || "").toUpperCase().trim()));
  }, [subjects]);

  return (
    <div className="p-4 sm:p-8 pb-16 max-w-[1600px] mx-auto w-full flex flex-col space-y-6">
      
      {/* ================= CRUD DRAWER / SHEET ================= */}
      <CrudSheet 
        open={crudState.open} 
        onOpenChange={(open) => setCrudState(s => ({ ...s, open }))}
        mode={crudState.mode}
        entityName="Mata Pelajaran"
        fields={subjectFields}
        initialData={crudState.data}
        onSubmit={handleCrudSubmit}
        onEditRequested={() => setCrudState(s => ({ ...s, mode: "edit" }))}
      />

      {/* ================= HEADER SECTION ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-purple-50/70 via-white to-indigo-50/40 p-6 rounded-3xl border border-purple-100/60 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#531FFF] text-white flex items-center justify-center shadow-md shadow-[#531FFF]/25">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                Mata Pelajaran
              </h1>
              <p className="text-[13px] text-gray-500 font-medium">
                Kelola struktur kurikulum, alokasi jam pembelajaran (JP), KKM, dan penugasan guru pengampu.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Batch Add Preset Button */}
          <button
            type="button"
            onClick={() => {
              // Preselect subjects that aren't yet in system
              const unadded = STANDARD_PRESETS.filter(p => !existingCodes.has(p.code.toUpperCase())).map(p => p.code);
              setSelectedBatchPresets(unadded);
              setShowBatchModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-50 text-[#531FFF] hover:bg-purple-100 border border-purple-200/80 rounded-xl text-[13px] font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-[#531FFF]" />
            <span>Paket Kurikulum Nasional</span>
          </button>

          {/* New Subject Button */}
          <button 
            type="button"
            onClick={() => setCrudState({ 
              open: true, 
              mode: "create",
              data: {
                category: "Wajib",
                creditHours: "3 JP",
                kkm: 75,
                level: "Semua Tingkat",
                status: "Aktif",
                teacher: "-"
              }
            })}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#531FFF] hover:bg-[#4314cc] text-white rounded-xl text-[13px] font-bold shadow-md shadow-[#531FFF]/25 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Mapel Baru</span>
          </button>
        </div>
      </div>

      {/* ================= QUICK PRESET TEMPLATES BAR ================= */}
      <div className="bg-white border border-gray-100 rounded-3xl p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#531FFF]" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-800">
              Template Cepat: Tambah Sekali Klik
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-gray-400">
            Klik nama mapel untuk mengisi formulir otomatis
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {STANDARD_PRESETS.slice(0, 10).map((preset) => {
            const isAlreadyAdded = existingCodes.has(preset.code.toUpperCase());
            return (
              <button
                key={preset.code}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all border cursor-pointer",
                  isAlreadyAdded 
                    ? "bg-gray-50/80 text-gray-600 border-gray-200 hover:border-[#531FFF]/50 hover:text-[#531FFF]" 
                    : "bg-purple-50/60 text-[#531FFF] border-purple-200 hover:bg-purple-100 hover:border-purple-300"
                )}
                title={preset.description}
              >
                <span>{preset.icon}</span>
                <span>{preset.name}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white border text-gray-500 font-mono">
                  {preset.code}
                </span>
                {isAlreadyAdded && (
                  <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setShowBatchModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#531FFF] hover:underline shrink-0 cursor-pointer"
          >
            <span>Lihat Semua ({STANDARD_PRESETS.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ================= METRICS STATS TILES ================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Mapel */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Mapel</p>
            <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">{subjects.length}</p>
            <span className="text-[11px] font-semibold text-emerald-600 mt-0.5 inline-block">
              {activeCount} Mapel Aktif
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#531FFF] flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        {/* Mapel Wajib */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Kelompok Wajib</p>
            <p className="text-2xl sm:text-3xl font-black text-blue-600 mt-1">{wajibCount}</p>
            <span className="text-[11px] font-semibold text-gray-400 mt-0.5 inline-block">
              Kurikulum Nasional
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>

        {/* Mapel Peminatan */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Peminatan</p>
            <p className="text-2xl sm:text-3xl font-black text-purple-600 mt-1">{peminatanCount}</p>
            <span className="text-[11px] font-semibold text-gray-400 mt-0.5 inline-block">
              MIPA &amp; IPS Terarah
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Muatan Lokal */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Muatan Lokal</p>
            <p className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">{mulokCount}</p>
            <span className="text-[11px] font-semibold text-gray-400 mt-0.5 inline-block">
              Kearifan Sekolah &amp; Daerah
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Target className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ================= FILTER & SEARCH TOOLBAR ================= */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-2xs flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Search & Category Pills */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          {/* Search box */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input 
              type="text"
              placeholder="Cari nama, kode, atau guru..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 p-1 bg-gray-100/80 rounded-xl overflow-x-auto w-full sm:w-auto shrink-0">
            {["All", "Wajib", "Peminatan", "Muatan Lokal"].map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer",
                    isActive 
                      ? "bg-white text-[#531FFF] shadow-2xs" 
                      : "text-gray-500 hover:text-gray-800"
                  )}
                >
                  {cat === "All" ? "Semua Kategori" : cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right side: Status Filter & View Mode Switcher */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 cursor-pointer"
          >
            <option value="All">Semua Status</option>
            <option value="Aktif">Aktif</option>
            <option value="Nonaktif">Nonaktif</option>
          </select>

          {/* View Format Switcher */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200/60 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                viewMode === "grid" 
                  ? "bg-white text-[#531FFF] shadow-xs" 
                  : "text-gray-400 hover:text-gray-700"
              )}
              title="Tampilan Kartu"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                viewMode === "table" 
                  ? "bg-white text-[#531FFF] shadow-xs" 
                  : "text-gray-400 hover:text-gray-700"
              )}
              title="Tampilan Tabel"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ================= MAIN SUBJECTS LISTING ================= */}
      {loading ? (
        <div className="py-24 bg-white border border-gray-100 rounded-3xl flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#531FFF]" />
          <p className="text-xs font-bold text-gray-500">Memuat daftar mata pelajaran...</p>
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="py-20 bg-white border border-gray-100 rounded-3xl flex flex-col items-center justify-center text-center p-6 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-purple-50 text-[#531FFF] flex items-center justify-center">
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900">Tidak ada mata pelajaran ditemukan</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-md">
              {searchQuery || selectedCategory !== "All" || selectedStatus !== "All"
                ? "Tidak ada data yang cocok dengan filter yang Anda gunakan. Coba reset filter."
                : "Belum ada mata pelajaran terdaftar dalam sistem. Anda dapat menambahkan mapel baru atau mengimpor paket kurikulum nasional."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {searchQuery || selectedCategory !== "All" || selectedStatus !== "All" ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                  setSelectedStatus("All");
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Reset Filter
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setShowBatchModal(true)}
                  className="px-4 py-2 bg-purple-50 text-[#531FFF] hover:bg-purple-100 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-purple-200"
                >
                  ⚡ Impor Paket Standar
                </button>
                <button
                  type="button"
                  onClick={() => setCrudState({ open: true, mode: "create" })}
                  className="px-4 py-2 bg-[#531FFF] text-white hover:bg-[#4314cc] rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  + Tambah Manual
                </button>
              </>
            )}
          </div>
        </div>
      ) : viewMode === "grid" ? (
        /* ================= GRID CARDS VIEW ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredSubjects.map((item) => {
            const isWajib = item.category === "Wajib";
            const isPeminatan = item.category === "Peminatan";

            return (
              <div
                key={item._firestoreId}
                className="bg-white hover:bg-gradient-to-b hover:from-white hover:to-purple-50/20 border border-gray-100 hover:border-[#531FFF]/30 rounded-3xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top Bar: Code chip + Category Pill + Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-xl bg-gray-100 font-mono font-black text-xs text-gray-800 border border-gray-200/60">
                        {item.code || "MAPEL"}
                      </span>
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-lg text-[11px] font-bold border",
                        isWajib 
                          ? "bg-blue-50 text-blue-700 border-blue-200" 
                          : isPeminatan 
                            ? "bg-purple-50 text-purple-700 border-purple-200" 
                            : "bg-amber-50 text-amber-700 border-amber-200"
                      )}>
                        {item.category || "Wajib"}
                      </span>
                    </div>

                    <span className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border",
                      (item.status || "Aktif") === "Aktif"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-gray-100 text-gray-500 border-gray-200"
                    )}>
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        (item.status || "Aktif") === "Aktif" ? "bg-emerald-500" : "bg-gray-400"
                      )} />
                      {item.status || "Aktif"}
                    </span>
                  </div>

                  {/* Subject Title */}
                  <h3 className="text-lg font-black text-gray-900 group-hover:text-[#531FFF] transition-colors leading-tight">
                    {item.name || "-"}
                  </h3>
                  
                  {item.description && (
                    <p className="text-xs text-gray-400 font-medium mt-1 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  {/* Quick Specs Badges */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                      <Clock className="w-3.5 h-3.5 text-[#531FFF]" />
                      <span>{item.creditHours || "3 JP"}</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                      <Target className="w-3.5 h-3.5 text-emerald-600" />
                      <span>KKM: <strong>{item.kkm || 75}</strong></span>
                    </div>

                    <div className="col-span-2 flex items-center gap-2 text-xs font-semibold text-gray-600 truncate">
                      <UserCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span className="truncate">
                        Guru: {item.teacher && item.teacher !== "-" ? item.teacher : <em className="text-gray-400">Belum Ditentukan</em>}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions Bar */}
                <div className="flex items-center justify-between gap-2 mt-5 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setCrudState({ open: true, mode: "view", data: item })}
                    className="text-xs font-bold text-gray-500 hover:text-[#531FFF] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Lihat Detail</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCrudState({ open: true, mode: "edit", data: item })}
                      className="p-2 rounded-xl text-gray-400 hover:text-[#531FFF] hover:bg-purple-50 transition-all cursor-pointer"
                      title="Edit Mapel"
                    >
                      <PenTool className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCrudState({ open: true, mode: "delete", data: item })}
                      className="p-2 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                      title="Hapus Mapel"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= TABLE VIEW ================= */
        <div className="bg-white border border-gray-100 rounded-3xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/60 border-b border-gray-100">
                  <th className="py-3.5 px-6 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Kode</th>
                  <th className="py-3.5 px-6 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Mata Pelajaran</th>
                  <th className="py-3.5 px-6 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Kategori</th>
                  <th className="py-3.5 px-6 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Beban / KKM</th>
                  <th className="py-3.5 px-6 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Guru Pengampu</th>
                  <th className="py-3.5 px-6 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider text-center">Status</th>
                  <th className="py-3.5 px-6 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSubjects.map((item) => (
                  <tr key={item._firestoreId} className="hover:bg-purple-50/20 transition-colors group">
                    <td className="py-4 px-6 font-mono font-black text-xs text-gray-800">
                      {item.code || "-"}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-extrabold text-sm text-gray-900 group-hover:text-[#531FFF] transition-colors">
                        {item.name || "-"}
                      </div>
                      {item.level && item.level !== "Semua Tingkat" && (
                        <span className="text-[10px] text-gray-400 font-semibold">{item.level}</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-lg text-xs font-bold border",
                        item.category === "Wajib" 
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : item.category === "Peminatan"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                      )}>
                        {item.category || "Wajib"}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-xs font-bold text-gray-800">{item.creditHours || "3 JP"}</div>
                      <div className="text-[11px] font-medium text-emerald-600">KKM: {item.kkm || 75}</div>
                    </td>
                    <td className="py-4 px-6 text-xs font-semibold text-gray-700">
                      {item.teacher && item.teacher !== "-" ? item.teacher : <span className="text-gray-400 italic">Belum Ada</span>}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                        (item.status || "Aktif") === "Aktif"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-gray-100 text-gray-500 border-gray-200"
                      )}>
                        {item.status || "Aktif"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setCrudState({ open: true, mode: "view", data: item })}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-[#531FFF] hover:bg-purple-50 transition-colors cursor-pointer"
                          title="Lihat Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCrudState({ open: true, mode: "edit", data: item })}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-[#531FFF] hover:bg-purple-50 transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <PenTool className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCrudState({ open: true, mode: "delete", data: item })}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= BATCH ADD MODAL (PAKET KURIKULUM NASIONAL) ================= */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 p-3 sm:p-6 bg-gray-950/60 backdrop-blur-xs flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50/80 to-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#531FFF] text-white flex items-center justify-center shadow-md shadow-[#531FFF]/25">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 tracking-tight">
                    Impor Paket Kurikulum Standar Nasional
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    Pilih mata pelajaran yang ingin ditambahkan secara massal ke database sekolah.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Select All Bar */}
            <div className="p-4 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between text-xs font-bold text-gray-600 shrink-0">
              <span>{selectedBatchPresets.length} dari {STANDARD_PRESETS.length} dipilih</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const unadded = STANDARD_PRESETS.filter(p => !existingCodes.has(p.code.toUpperCase())).map(p => p.code);
                    setSelectedBatchPresets(unadded);
                  }}
                  className="text-[#531FFF] hover:underline cursor-pointer"
                >
                  Pilih Semua yang Belum Ada
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setSelectedBatchPresets([])}
                  className="text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  Batal Pilih Semua
                </button>
              </div>
            </div>

            {/* Modal Presets List */}
            <div className="p-5 overflow-y-auto flex-1 custom-scrollbar space-y-2.5">
              {STANDARD_PRESETS.map((preset) => {
                const isAlreadyInSystem = existingCodes.has(preset.code.toUpperCase());
                const isSelected = selectedBatchPresets.includes(preset.code);

                return (
                  <div
                    key={preset.code}
                    onClick={() => {
                      if (isAlreadyInSystem) return;
                      setSelectedBatchPresets(prev => 
                        prev.includes(preset.code) 
                          ? prev.filter(c => c !== preset.code) 
                          : [...prev, preset.code]
                      );
                    }}
                    className={cn(
                      "p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 select-none",
                      isAlreadyInSystem
                        ? "bg-gray-50/60 border-gray-200/60 opacity-60 cursor-not-allowed"
                        : isSelected
                          ? "bg-purple-50/50 border-[#531FFF] shadow-2xs cursor-pointer"
                          : "bg-white border-gray-200 hover:border-gray-300 cursor-pointer"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all",
                        isAlreadyInSystem
                          ? "bg-gray-200 border-gray-300 text-gray-500"
                          : isSelected
                            ? "bg-[#531FFF] border-[#531FFF] text-white"
                            : "border-gray-300 bg-white"
                      )}>
                        {(isAlreadyInSystem || isSelected) && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      <span className="text-xl shrink-0">{preset.icon}</span>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-gray-900 truncate">
                            {preset.name}
                          </span>
                          <span className="font-mono text-[11px] font-bold px-1.5 py-0.2 bg-gray-100 rounded text-gray-600">
                            {preset.code}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 font-medium truncate mt-0.5">
                          {preset.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-lg text-[10px] font-bold border",
                        preset.category === "Wajib" ? "bg-blue-50 text-blue-700 border-blue-200" : preset.category === "Peminatan" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-amber-50 text-amber-700 border-amber-200"
                      )}>
                        {preset.category}
                      </span>
                      <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-lg">
                        {preset.creditHours}
                      </span>
                      {isAlreadyInSystem && (
                        <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          Sudah Ada
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 sm:p-5 border-t border-gray-100 bg-white flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                disabled={isBatchAdding}
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleBatchAddPresets}
                disabled={isBatchAdding || selectedBatchPresets.length === 0}
                className="px-6 py-2.5 bg-[#531FFF] hover:bg-[#4314cc] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-[#531FFF]/25 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {isBatchAdding ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menambahkan ke Database...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Tambahkan {selectedBatchPresets.length} Mapel Terpilih</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
