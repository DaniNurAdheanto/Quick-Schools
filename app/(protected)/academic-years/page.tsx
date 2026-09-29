"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Calendar, Plus, GraduationCap, 
  ArrowRight, RefreshCw, 
  Users, School, Loader2, ShieldAlert,
  CheckCircle2, ShieldCheck, FolderArchive, X, Clock
} from "lucide-react";
import { collection, onSnapshot, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { useAcademicYear, AcademicYearItem } from "@/context/AcademicYearContext";
import { AlertBox, AlertType } from "@/components/ui/alert-box";
import { useAuth } from "@/context/AuthContext";
import { PageContentSkeleton } from "@/components/ui/role-loading-skeleton";
import { useUnifiedStudents } from "@/hooks/use-unified-students";

export default function AcademicYearsPage() {
  const { 
    activeAcademicYear, 
    activeSemester, 
    schoolDefaultYear,
    schoolDefaultSemester,
    isArchiveMode,
    availableYears,
    loading: academicYearLoading,
    setActiveAcademicYear, 
    setActiveSemester,
    resetToSchoolDefault,
    setSchoolActivePeriod,
    createAcademicYear,
    archiveAcademicYear,
  } = useAcademicYear();

  const { role: authRole, rawRole: authRawRole, isAuthLoading, isRoleReady } = useAuth();
  const { students: unifiedStudents } = useUnifiedStudents();

  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<"list" | "promotion" | "archive">("list");

  // Alert Box Toast
  const [alertState, setAlertState] = useState<{
    type: AlertType;
    title?: string;
    message: string;
  } | null>(null);

  const triggerAlert = (type: AlertType, message: string, title?: string) => {
    setAlertState({ type, message, title });
    setTimeout(() => {
      setAlertState(null);
    }, 5000);
  };

  // Add New Academic Year Modal Form State (Identical to Pengaturan Sekolah)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newYearName, setNewYearName] = useState("");
  const [newYearSemester, setNewYearSemester] = useState<"Ganjil" | "Genap">("Ganjil");
  const [newYearStartDate, setNewYearStartDate] = useState("");
  const [newYearEndDate, setNewYearEndDate] = useState("");
  const [newYearSetAsActive, setNewYearSetAsActive] = useState(false);
  const [isSubmittingYear, setIsSubmittingYear] = useState(false);

  // Promotion Wizard State: Smart default next academic year
  const defaultNextYear = useMemo(() => {
    const parts = activeAcademicYear.split("/");
    if (parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
      return `${Number(parts[0]) + 1}/${Number(parts[1]) + 1}`;
    }
    return "2027/2028";
  }, [activeAcademicYear]);

  const [targetNewYear, setTargetNewYear] = useState(defaultNextYear);

  useEffect(() => {
    setTargetNewYear(defaultNextYear);
  }, [defaultNextYear]);

  // Firestore Subscriptions for Classes & Students
  useEffect(() => {
    const unsubClasses = onSnapshot(collection(db, "classes"), (snap) => {
      setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsubClasses();
  }, []);

  useEffect(() => {
    setStudents(unifiedStudents);
  }, [unifiedStudents]);

  // Synchronized Academic Years list from Context (Shared with Pengaturan Sekolah)
  const yearsList = availableYears;

  // Handle Add New Academic Year (Using Context for Unified Persistence & Validation)
  const handleAddAcademicYear = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newYearName.trim();
    if (!trimmed) {
      triggerAlert("error", "Nama tahun ajaran tidak boleh kosong.", "Validasi Gagal");
      return;
    }

    setIsSubmittingYear(true);
    try {
      const res: any = await createAcademicYear(trimmed, newYearSemester, {
        startDate: newYearStartDate,
        endDate: newYearEndDate,
        setAsActive: newYearSetAsActive,
      });

      if (res?.permissionWarning) {
        triggerAlert(
          "success",
          `Tahun Ajaran ${trimmed} (${newYearSemester}) berhasil dibuat dan aktif di sesi browser!`,
          "Tahun Ajaran Dibuat"
        );
      } else {
        triggerAlert(
          "success", 
          `Tahun Ajaran ${trimmed} (${newYearSemester}) berhasil dibuat dan tersimpan!`, 
          "Tahun Ajaran Dibuat"
        );
      }

      setIsAddModalOpen(false);
      setNewYearName("");
      setNewYearStartDate("");
      setNewYearEndDate("");
      setNewYearSetAsActive(false);
    } catch (err: any) {
      console.error("Error creating academic year:", err);
      triggerAlert("error", `Gagal membuat tahun ajaran: ${err?.message || "Terjadi kesalahan"}`, "Gagal Tambah");
    } finally {
      setIsSubmittingYear(false);
    }
  };

  // Handle Set Default Active Academic Year (Official School-wide Active Period)
  const handleSetOfficialActive = async (year: AcademicYearItem, semester?: "Ganjil" | "Genap") => {
    const targetSem = semester || year.semester || "Ganjil";
    try {
      const res: any = await setSchoolActivePeriod(year.name, targetSem);
      if (res?.permissionWarning) {
        triggerAlert("success", `Tahun Ajaran ${year.name} Semester ${targetSem} kini aktif di sesi ini!`, "Periode Diaktifkan");
      } else {
        triggerAlert("success", `Tahun Ajaran ${year.name} Semester ${targetSem} kini aktif untuk seluruh sistem sekolah!`, "Periode Diaktifkan");
      }
    } catch (err: any) {
      console.error("Error setting active academic year:", err);
      triggerAlert("error", `Gagal mengubah Tahun Ajaran Aktif: ${err?.message || "Terjadi kesalahan"}`, "Gagal");
    }
  };

  // Handle Browse Historic Archive Data (Without Changing Official School Default)
  const handleBrowsePeriod = (year: AcademicYearItem, semester?: "Ganjil" | "Genap") => {
    const targetSem = semester || year.semester || "Ganjil";
    setActiveAcademicYear(year.name);
    setActiveSemester(targetSem);
    triggerAlert("edit", `Beralih ke konteks data ${year.name} (${targetSem}). Data lama ditampilkan sebagai arsip riwayat.`, "Konteks Diubah");
  };

  // Handle Archive Academic Year
  const handleArchiveYear = async (year: AcademicYearItem) => {
    if (year.isDefault) {
      triggerAlert("error", "Tahun ajaran default aktif tidak dapat diarsipkan sebelum mengaktifkan periode lain.", "Peringatan");
      return;
    }
    try {
      await archiveAcademicYear(year.id);
      triggerAlert("success", `Tahun Ajaran ${year.name} berhasil ditandai sebagai arsip.`, "Berhasil Arsipkan");
    } catch (err: any) {
      console.error("Error archiving year:", err);
      triggerAlert("error", `Gagal mengarsipkan: ${err?.message || "Terjadi kesalahan"}`, "Gagal Arsip");
    }
  };

  // Handle Process Class Promotion (Kenaikan Kelas & Kelulusan)
  const handleProcessPromotion = async () => {
    if (!confirm(`Apakah Anda yakin ingin memproses Kenaikan Kelas & Kelulusan dari ${activeAcademicYear} ke ${targetNewYear}?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      let promotedCount = 0;
      let graduatedCount = 0;

      students.forEach(st => {
        const currentClass = st.classId || "";
        let newClass = currentClass;

        if (currentClass.includes("12")) {
          // Grade 12 Graduates
          batch.update(doc(db, "students", st.id), {
            status: "Lulus",
            graduatedYear: activeAcademicYear,
            updatedAt: serverTimestamp()
          });
          graduatedCount++;
        } else if (currentClass.includes("10")) {
          // Grade 10 -> Grade 11
          newClass = currentClass.replace("10", "11");
          batch.update(doc(db, "students", st.id), {
            classId: newClass,
            updatedAt: serverTimestamp()
          });
          promotedCount++;
        } else if (currentClass.includes("11")) {
          // Grade 11 -> Grade 12
          newClass = currentClass.replace("11", "12");
          batch.update(doc(db, "students", st.id), {
            classId: newClass,
            updatedAt: serverTimestamp()
          });
          promotedCount++;
        }
      });

      await batch.commit();

      // Ensure target academic year exists in available years, or create it if missing
      const exists = availableYears.some(y => y.name === targetNewYear);
      if (!exists) {
        await createAcademicYear(targetNewYear, "Ganjil", { setAsActive: true });
      } else {
        await setSchoolActivePeriod(targetNewYear, "Ganjil");
      }

      triggerAlert(
        "success", 
        `Proses Kenaikan Kelas Selesai! ${promotedCount} siswa naik kelas & ${graduatedCount} siswa lulus ke alumni. Tahun ajaran resmi aktif sekarang ${targetNewYear}.`, 
        "Kenaikan Kelas Berhasil"
      );
    } catch (err: any) {
      console.error("Error processing promotion:", err);
      triggerAlert("error", `Gagal memproses kenaikan kelas: ${err?.message || "Terjadi kesalahan"}`, "Gagal");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isAuthLoading || !isRoleReady || academicYearLoading) {
    return <PageContentSkeleton />;
  }

  const normalizedRole = (authRawRole || authRole || "").toLowerCase();
  const isStudent = normalizedRole === "siswa" || normalizedRole === "student";

  if (isStudent) {
    return (
      <div className="p-8 max-w-2xl mx-auto my-16 text-center bg-white rounded-xl border border-gray-100 shadow-xl p-12 space-y-4">
        <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-lg flex items-center justify-center mx-auto mb-4 shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Akses Ditolak</h2>
        <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed font-medium">
          Halaman Manajemen Tahun Ajaran & Kenaikan Kelas hanya dapat diakses oleh Admin Sekolah / Pengelola Kurikulum.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-full mx-auto w-full flex-1 flex flex-col min-h-screen bg-gray-50/50 animate-in fade-in duration-300 relative space-y-6">
      
      {/* FLOATING TOAST ALERT NOTIFICATION BOX */}
      {alertState && (
        <div className="fixed top-6 right-6 z-50 max-w-md w-full animate-in slide-in-from-top-4 fade-in duration-300">
          <AlertBox
            type={alertState.type}
            title={alertState.title}
            message={alertState.message}
            onClose={() => setAlertState(null)}
          />
        </div>
      )}

      {/* ── 1. HEADER HERO BAR ── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 md:p-6 rounded-xl border border-gray-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
              Tahun Ajaran & Kenaikan Kelas
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-[#531FFF]/10 text-[#531FFF] border border-[#531FFF]/20">
              Aktif: {schoolDefaultYear} ({schoolDefaultSemester})
            </span>
            {isArchiveMode && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-slate-900">
                Menjelajah Arsip ({activeAcademicYear} - {activeSemester})
              </span>
            )}
          </div>
          <p className="text-gray-500 text-xs md:text-sm font-medium mt-1">
            Data tersinkronisasi langsung dengan Pengaturan Sekolah sebagai konteks utama seluruh operasional dan akademik.
          </p>
        </div>

        {/* Action Controls & Tab Switcher */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {isArchiveMode && (
            <button
              onClick={resetToSchoolDefault}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset ke Periode Aktif</span>
            </button>
          )}

          <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab("list")}
              className={cn(
                "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer",
                activeTab === "list" ? "bg-white text-gray-900 shadow-2xs font-extrabold" : "text-gray-600 hover:text-gray-900"
              )}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Daftar Tahun Ajaran</span>
            </button>
            <button
              onClick={() => setActiveTab("promotion")}
              className={cn(
                "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer",
                activeTab === "promotion" ? "bg-white text-[#531FFF] shadow-2xs font-extrabold" : "text-gray-600 hover:text-gray-900"
              )}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Kenaikan Kelas & Kelulusan</span>
            </button>
          </div>

          <button
            onClick={() => {
              setNewYearName("");
              setNewYearSemester("Ganjil");
              setNewYearStartDate("");
              setNewYearEndDate("");
              setNewYearSetAsActive(false);
              setIsAddModalOpen(true);
            }}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-[#531FFF] hover:bg-[#4314cc] text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md shadow-[#531FFF]/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Tahun Ajaran Baru</span>
          </button>
        </div>
      </div>

      {/* ── 2. METRIC STAT CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-[#531FFF] flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tahun Ajaran Aktif</span>
            <p className="text-base font-extrabold text-gray-900 leading-none mt-1">{schoolDefaultYear}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Siswa Aktif</span>
            <p className="text-base font-extrabold text-gray-900 leading-none mt-1">{students.filter(s => s.status === 'Aktif').length} Siswa</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <School className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Kelas</span>
            <p className="text-base font-extrabold text-gray-900 leading-none mt-1">{classes.length} Kelas</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Alumni Lulus</span>
            <p className="text-base font-extrabold text-gray-900 leading-none mt-1">{students.filter(s => s.status === 'Lulus').length} Alumni</p>
          </div>
        </div>
      </div>

      {/* ── 3. DATA INTEGRITY CALLOUT ── */}
      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-4 sm:p-5 flex items-start gap-3.5 text-xs text-emerald-900 shadow-2xs">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-extrabold text-sm text-emerald-950">
            Jaminan Integritas & Isolasi Data Multi-Tahun Quick Schools
          </p>
          <p className="text-emerald-800 leading-relaxed font-medium">
            Ketika sekolah membuat atau mengaktifkan tahun ajaran baru, seluruh data historis dari tahun ajaran sebelumnya <strong>tidak akan pernah dihapus</strong>. Sistem menggunakan <code>academicYear</code> dan <code>semester</code> sebagai relasi utama basis data, sehingga Anda dapat kapan saja beralih ke periode lama untuk melihat arsip nilai, riwayat presensi, cetak rapor terdahulu, dan rekapitulasi SPP tanpa tercampur dengan data tahun ajaran baru.
          </p>
        </div>
      </div>

      {/* ── TAB 1: DAFTAR TAHUN AJARAN (Selaras dengan Pengaturan Sekolah) ── */}
      {activeTab === "list" && (
        <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/40">
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">Daftar Seluruh Periode Tahun Ajaran ({yearsList.length})</h3>
              <p className="text-xs text-gray-500 font-medium">Tersinkronisasi langsung dengan Pengaturan Sekolah & database Firestore.</p>
            </div>
            <button
              onClick={() => {
                setNewYearName("");
                setNewYearSemester("Ganjil");
                setNewYearStartDate("");
                setNewYearEndDate("");
                setNewYearSetAsActive(false);
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#531FFF] hover:bg-[#4314cc] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buat Tahun Ajaran</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider text-[10px] border-b border-gray-100">
                <tr>
                  <th className="py-3 px-4 sm:px-6">Tahun Ajaran</th>
                  <th className="py-3 px-4">Semester</th>
                  <th className="py-3 px-4">Status Periode</th>
                  <th className="py-3 px-4">Rentang Waktu</th>
                  <th className="py-3 px-4">Konteks Data</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Aksi Manajemen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {yearsList.map((year) => {
                  const isOfficialActive = year.name === schoolDefaultYear;
                  const isCurrentlyBrowsing = year.name === activeAcademicYear;

                  return (
                    <tr 
                      key={year.id} 
                      className={cn(
                        "transition-colors",
                        isCurrentlyBrowsing ? "bg-purple-50/40" : "hover:bg-gray-50/70"
                      )}
                    >
                      {/* Name & ID */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border",
                            isOfficialActive 
                              ? "bg-[#531FFF] text-white border-[#531FFF] shadow-xs" 
                              : "bg-gray-100 text-gray-600 border-gray-200"
                          )}>
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-extrabold text-gray-900 text-sm">{year.name}</div>
                            <div className="text-[10px] text-gray-400 font-mono">ID: {year.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Semester */}
                      <td className="py-4 px-4">
                        <span className="font-bold text-gray-800">
                          Semester {year.semester || "Ganjil"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {isOfficialActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Aktif (Default Sekolah)
                          </span>
                        ) : year.status === "Arsip" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 border border-gray-200 text-xs font-semibold">
                            <FolderArchive className="w-3 h-3 text-gray-400" />
                            Tersimpan (Arsip)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                            <Clock className="w-3 h-3 text-blue-400" />
                            Mendatang
                          </span>
                        )}
                      </td>

                      {/* Dates */}
                      <td className="py-4 px-4 text-gray-500 text-[11px]">
                        {year.startDate && year.endDate ? (
                          <span>{year.startDate} s/d {year.endDate}</span>
                        ) : (
                          <span className="text-gray-400 italic">Satu Tahun Ajaran Penuh</span>
                        )}
                      </td>

                      {/* Context viewing */}
                      <td className="py-4 px-4">
                        {isCurrentlyBrowsing ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#531FFF]">
                            <span className="w-2 h-2 rounded-full bg-[#531FFF] animate-pulse" />
                            Sedang Ditampilkan
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-400">
                            Tersimpan di Database
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick semester switcher if official active */}
                          {isOfficialActive && (
                            <div className="flex items-center bg-gray-100 rounded-md p-0.5 mr-1 border border-gray-200">
                              <button
                                type="button"
                                onClick={() => handleSetOfficialActive(year, "Ganjil")}
                                className={cn(
                                  "px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer",
                                  schoolDefaultSemester === "Ganjil" ? "bg-white text-[#531FFF] shadow-2xs" : "text-gray-500 hover:text-gray-800"
                                )}
                              >
                                Ganjil
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetOfficialActive(year, "Genap")}
                                className={cn(
                                  "px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer",
                                  schoolDefaultSemester === "Genap" ? "bg-white text-[#531FFF] shadow-2xs" : "text-gray-500 hover:text-gray-800"
                                )}
                              >
                                Genap
                              </button>
                            </div>
                          )}

                          {!isOfficialActive && (
                            <button
                              type="button"
                              onClick={() => handleSetOfficialActive(year)}
                              className="px-2.5 py-1.5 bg-[#531FFF] hover:bg-[#4314cc] text-white rounded-md text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                              title="Jadikan sebagai periode resmi aktif sistem sekolah"
                            >
                              Aktifkan
                            </button>
                          )}

                          {!isCurrentlyBrowsing && (
                            <button
                              type="button"
                              onClick={() => handleBrowsePeriod(year)}
                              className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-xs font-bold transition-colors cursor-pointer border border-gray-200"
                              title="Buka dan lihat arsip data periode ini"
                            >
                              Buka Data
                            </button>
                          )}

                          {!isOfficialActive && year.status !== "Arsip" && (
                            <button
                              type="button"
                              onClick={() => handleArchiveYear(year)}
                              className="px-2.5 py-1.5 bg-gray-50 hover:bg-rose-50 text-gray-600 hover:text-rose-600 rounded-md text-xs font-semibold transition-colors cursor-pointer border border-gray-200"
                              title="Tandai sebagai arsip historis"
                            >
                              Arsipkan
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: WIZARD KENAIKAN KELAS & KELULUSAN ── */}
      {activeTab === "promotion" && (
        <div className="space-y-6">
          
          {/* Information & Instruction Card */}
          <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[#531FFF]/10 to-transparent rounded-bl-full pointer-events-none" />

            <div className="flex items-center gap-3 mb-2">
              <GraduationCap className="w-6 h-6 text-[#531FFF]" />
              <h3 className="font-black text-base text-gray-900">Wizard Kenaikan Kelas & Kelulusan Akhir Tahun</h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed max-w-3xl">
              Proses ini akan meluluskan siswa kelas akhir (Kelas 12) menjadi alumni, serta menaikkan kelas siswa tingkat bawah (Kelas 10 ➔ 11, Kelas 11 ➔ 12) secara otomatis. Seluruh data rapor, nilai, presensi, dan pembayaran tahun lalu tetap tersimpan utuh di arsip histori.
            </p>

            <div className="mt-6 p-4 rounded-xl bg-purple-50/50 border border-purple-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black text-purple-700 uppercase tracking-wider">Target Tahun Ajaran Baru</span>
                <div className="flex items-center gap-3 mt-1">
                  <span className="font-extrabold text-sm text-gray-900">{schoolDefaultYear}</span>
                  <ArrowRight className="w-4 h-4 text-purple-600" />
                  <input
                    type="text"
                    value={targetNewYear}
                    onChange={(e) => setTargetNewYear(e.target.value)}
                    placeholder="misal: 2027/2028"
                    className="bg-white border border-purple-200 text-purple-900 text-xs font-extrabold rounded-lg py-1.5 px-3 focus:outline-none focus:border-[#531FFF] w-36"
                  />
                </div>
                <p className="text-[10px] text-purple-600 font-medium mt-1">
                  Periode target akan otomatis dibuat dan diaktifkan di seluruh sistem.
                </p>
              </div>

              <button
                onClick={handleProcessPromotion}
                disabled={isProcessing}
                className="flex items-center gap-2 bg-[#531FFF] hover:bg-[#4314cc] text-white px-5 py-2.5 rounded-lg text-xs font-extrabold shadow-md shadow-[#531FFF]/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span>Proses Kenaikan Kelas Automatis</span>
              </button>
            </div>
          </div>

          {/* Promotion Preview Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Step 1: Kelulusan Kelas 12 */}
            <div className="bg-white p-5 rounded-xl border border-gray-200/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                  Langkah 1
                </span>
                <span className="text-xs font-bold text-gray-400">Kelas 12</span>
              </div>
              <h4 className="font-extrabold text-sm text-gray-900">Kelulusan Siswa Kelas 12</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Status siswa kelas 12 akan diubah menjadi <span className="font-bold text-amber-700">"Lulus"</span> dan ditransfer ke data Alumni.
              </p>
              <div className="pt-2 font-extrabold text-xs text-gray-800">
                Estimasi: {students.filter(s => (s.classId || "").includes("12")).length} Siswa Lulus
              </div>
            </div>

            {/* Step 2: Kenaikan Kelas 11 -> 12 */}
            <div className="bg-white p-5 rounded-xl border border-gray-200/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                  Langkah 2
                </span>
                <span className="text-xs font-bold text-gray-400">Kelas 11 ➔ 12</span>
              </div>
              <h4 className="font-extrabold text-sm text-gray-900">Kenaikan Kelas 11 ke Kelas 12</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Siswa kelas 11 akan dipromosikan naik ke <span className="font-bold text-blue-700">Kelas 12</span> pada tahun ajaran baru.
              </p>
              <div className="pt-2 font-extrabold text-xs text-gray-800">
                Estimasi: {students.filter(s => (s.classId || "").includes("11")).length} Siswa Naik
              </div>
            </div>

            {/* Step 3: Kenaikan Kelas 10 -> 11 */}
            <div className="bg-white p-5 rounded-xl border border-gray-200/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Langkah 3
                </span>
                <span className="text-xs font-bold text-gray-400">Kelas 10 ➔ 11</span>
              </div>
              <h4 className="font-extrabold text-sm text-gray-900">Kenaikan Kelas 10 ke Kelas 11</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Siswa kelas 10 akan dipromosikan naik ke <span className="font-bold text-emerald-700">Kelas 11</span> pada tahun ajaran baru.
              </p>
              <div className="pt-2 font-extrabold text-xs text-gray-800">
                Estimasi: {students.filter(s => (s.classId || "").includes("10")).length} Siswa Naik
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ── 4. MODAL TAMBAH TAHUN AJARAN BARU (REDESIGNED AGAR IDENTIK DENGAN PENGATURAN SEKOLAH) ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200/90 w-full max-w-xl p-6 sm:p-7 text-gray-900 animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-gray-900">Form Pembuatan Tahun Ajaran Baru</h3>
                  <p className="text-xs text-gray-500 font-medium">Buat wadah periode baru untuk data akademik & operasional mendatang.</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Integrity Notice inside Modal */}
            <div className="my-4 bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-emerald-800 font-medium leading-relaxed">
                Menambahkan tahun ajaran baru tidak akan menghapus data lama. Data nilai, absensi, SPP, dan jadwal periode sebelumnya tetap tersimpan rapi sebagai arsip historis.
              </p>
            </div>

            {/* Form Fields identical to Pengaturan Sekolah */}
            <form onSubmit={handleAddAcademicYear} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* 1. Nama Tahun Ajaran */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Nama Tahun Ajaran <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="misal: 2027/2028"
                    value={newYearName}
                    onChange={(e) => setNewYearName(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#531FFF] focus:bg-white"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Format baku: YYYY/YYYY (contoh: 2027/2028)</p>
                </div>

                {/* 2. Semester Dimulai */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Semester Dimulai <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newYearSemester}
                    onChange={(e) => setNewYearSemester(e.target.value as "Ganjil" | "Genap")}
                    className="w-full px-3 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#531FFF] focus:bg-white cursor-pointer"
                  >
                    <option value="Ganjil">Semester Ganjil (Juli - Des)</option>
                    <option value="Genap">Semester Genap (Jan - Juni)</option>
                  </select>
                </div>

                {/* 3. Tanggal Mulai */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Tanggal Mulai (Opsional)
                  </label>
                  <input
                    type="date"
                    value={newYearStartDate}
                    onChange={(e) => setNewYearStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#531FFF] focus:bg-white"
                  />
                </div>

                {/* 4. Tanggal Selesai */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Tanggal Selesai (Opsional)
                  </label>
                  <input
                    type="date"
                    value={newYearEndDate}
                    onChange={(e) => setNewYearEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#531FFF] focus:bg-white"
                  />
                </div>
              </div>

              {/* Set as Active Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-gray-200 bg-gray-50/70 hover:bg-gray-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={newYearSetAsActive}
                    onChange={(e) => setNewYearSetAsActive(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-[#531FFF] focus:ring-[#531FFF] mt-0.5 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">
                      Langsung tetapkan sebagai Tahun Ajaran Aktif sekolah saat ini
                    </span>
                    <span className="text-[11px] text-gray-500 font-medium block mt-0.5">
                      Seluruh operasional (nilai, absensi siswa/guru, tagihan SPP, jadwal KBM, dan rapor) otomatis menggunakan periode baru ini.
                    </span>
                  </div>
                </label>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingYear}
                  className="flex items-center gap-2 bg-[#531FFF] hover:bg-[#4314cc] text-white px-5 py-2 rounded-lg text-xs font-black shadow-md shadow-[#531FFF]/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingYear ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Simpan Tahun Ajaran Baru</span>
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
