"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Calendar, Plus, GraduationCap, CheckCircle2, 
  Archive, ShieldCheck, ArrowRight, Clock,
  RefreshCw, ExternalLink
} from "lucide-react";
import { useAcademicYear, AcademicYearItem } from "@/context/AcademicYearContext";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";

export default function AcademicYearSettings() {
  const {
    activeAcademicYear,
    activeSemester,
    schoolDefaultYear,
    schoolDefaultSemester,
    isArchiveMode,
    availableYears,
    setActiveAcademicYear,
    setActiveSemester,
    resetToSchoolDefault,
    setSchoolActivePeriod,
    createAcademicYear,
    archiveAcademicYear,
  } = useAcademicYear();

  const { showSuccess, showError, showInfo } = useToast();

  const [isCreatingYear, setIsCreatingYear] = useState(false);
  const [newYearName, setNewYearName] = useState("");
  const [newYearSemester, setNewYearSemester] = useState<"Ganjil" | "Genap">("Ganjil");
  const [newYearStartDate, setNewYearStartDate] = useState("");
  const [newYearEndDate, setNewYearEndDate] = useState("");
  const [newYearSetAsActive, setNewYearSetAsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Suggest next academic year based on latest available
  const suggestedNextYear = React.useMemo(() => {
    if (availableYears.length > 0) {
      const topYear = availableYears[0].name;
      const parts = topYear.split("/");
      if (parts.length === 2) {
        const start = parseInt(parts[0], 10);
        const end = parseInt(parts[1], 10);
        if (!isNaN(start) && !isNaN(end)) {
          return `${start + 1}/${end + 1}`;
        }
      }
    }
    return "2026/2027";
  }, [availableYears]);

  const handleCreateNewYear = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newYearName.trim() || suggestedNextYear;
    if (!trimmed) {
      showError("Nama tahun ajaran tidak boleh kosong.", "Validasi Gagal");
      return;
    }

    setIsSubmitting(true);
    try {
      const res: any = await createAcademicYear(trimmed, newYearSemester, {
        startDate: newYearStartDate,
        endDate: newYearEndDate,
        setAsActive: newYearSetAsActive,
      });

      if (res?.permissionWarning) {
        showSuccess(
          `Tahun Ajaran ${trimmed} (${newYearSemester}) berhasil dibuat dan aktif di sesi browser! Jangan lupa deploy firestore.rules di Firebase Console untuk sinkronisasi cloud.`,
          "Tahun Ajaran Dibuat"
        );
      } else {
        showSuccess(`Tahun Ajaran ${trimmed} (${newYearSemester}) berhasil dibuat dan disimpan!`, "Tahun Ajaran Dibuat");
      }
      setIsCreatingYear(false);
      setNewYearName("");
      setNewYearStartDate("");
      setNewYearEndDate("");
    } catch (err: any) {
      console.error(err);
      showError(`Gagal membuat tahun ajaran baru: ${err?.message || "Terjadi kesalahan"}`, "Gagal Tambah");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetActive = async (year: AcademicYearItem, semester?: "Ganjil" | "Genap") => {
    const targetSem = semester || year.semester || "Ganjil";
    setIsSubmitting(true);
    try {
      const res: any = await setSchoolActivePeriod(year.name, targetSem);
      if (res?.permissionWarning) {
        showSuccess(`Tahun Ajaran ${year.name} Semester ${targetSem} kini aktif di sesi ini!`, "Periode Diaktifkan");
      } else {
        showSuccess(`Tahun Ajaran ${year.name} Semester ${targetSem} kini aktif untuk seluruh sistem sekolah!`, "Periode Diaktifkan");
      }
    } catch (err: any) {
      console.error(err);
      showError(`Gagal mengaktifkan periode: ${err?.message || "Terjadi kesalahan"}`, "Gagal Aktifkan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveYear = async (year: AcademicYearItem) => {
    if (year.isDefault) {
      showError("Tahun ajaran default aktif tidak dapat diarsipkan sebelum mengaktifkan periode lain.", "Peringatan");
      return;
    }
    try {
      await archiveAcademicYear(year.id);
      showSuccess(`Tahun Ajaran ${year.name} berhasil ditandai sebagai arsip.`, "Berhasil Arsipkan");
    } catch (err: any) {
      showError(`Gagal mengarsipkan: ${err?.message || "Terjadi kesalahan"}`, "Gagal Arsip");
    }
  };

  return (
    <div className="space-y-6">
      {/* ── 1. ACTIVE PERIOD HERO BANNER ── */}
      <div className="bg-gradient-to-br from-[#531FFF] via-[#4514d4] to-[#1E085A] rounded-xl p-6 sm:p-7 text-white shadow-xl shadow-[#531FFF]/15 relative overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-purple-400/10 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/15 text-purple-200 border border-white/20 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                Periode Resmi Sekolah Aktif
              </span>
              {isArchiveMode && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-400 text-slate-900 text-xs font-black uppercase">
                  Sedang Menjelajah Arsip ({activeAcademicYear} - {activeSemester})
                </span>
              )}
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
                <span>T.A. {schoolDefaultYear}</span>
                <span className="text-purple-200 font-bold text-lg sm:text-xl">• Semester {schoolDefaultSemester}</span>
              </h2>
              <p className="text-purple-100/90 text-xs sm:text-sm font-medium mt-1 max-w-xl">
                Seluruh data baru (nilai, absensi siswa/guru, tagihan SPP, jadwal KBM, ujian, dan rapor digital) otomatis terhubung dengan periode ini.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            {isArchiveMode && (
              <button
                type="button"
                onClick={resetToSchoolDefault}
                className="px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-white/20 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Kembali ke Periode Aktif</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                const newSem = schoolDefaultSemester === "Ganjil" ? "Genap" : "Ganjil";
                handleSetActive(
                  availableYears.find(y => y.name === schoolDefaultYear) || { id: schoolDefaultYear, name: schoolDefaultYear, semester: newSem, isDefault: true, status: "Aktif" },
                  newSem
                );
              }}
              disabled={isSubmitting}
              className="px-4 py-2.5 bg-white text-[#531FFF] hover:bg-purple-50 rounded-lg text-xs font-extrabold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Ganti ke Semester {schoolDefaultSemester === "Ganjil" ? "Genap" : "Ganjil"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setNewYearName(suggestedNextYear);
                setIsCreatingYear(true);
              }}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-extrabold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Tahun Ajaran Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. DATA PARTITION & INTEGRITY NOTICE ── */}
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

      {/* ── 3. FORM BUAT TAHUN AJARAN BARU (MODAL / INLINE COLLAPSIBLE) ── */}
      {isCreatingYear && (
        <form onSubmit={handleCreateNewYear} className="bg-white rounded-xl border border-gray-200/90 shadow-sm p-5 sm:p-6 space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-gray-900">Form Pembuatan Tahun Ajaran Baru</h3>
                <p className="text-xs text-gray-500 font-medium">Buat wadah periode baru untuk data akademik & operasional mendatang.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsCreatingYear(false)}
              className="text-xs text-gray-400 hover:text-gray-700 font-bold px-2.5 py-1 rounded-md hover:bg-gray-100 cursor-pointer"
            >
              Batal
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Nama Tahun Ajaran <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="misal: 2026/2027"
                value={newYearName}
                onChange={(e) => setNewYearName(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#531FFF] focus:bg-white"
                required
              />
              <p className="text-[10px] text-gray-400 mt-1">Format baku: YYYY/YYYY (contoh: 2026/2027)</p>
            </div>

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

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={newYearSetAsActive}
                onChange={(e) => setNewYearSetAsActive(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#531FFF] focus:ring-[#531FFF]"
              />
              <span className="text-xs font-bold text-gray-800">
                Langsung tetapkan sebagai Tahun Ajaran Aktif sekolah saat ini
              </span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCreatingYear(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-extrabold text-white bg-[#531FFF] hover:bg-[#4314cc] rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Menyimpan..." : "Simpan Tahun Ajaran Baru"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ── 4. TABEL MANAJEMEN TAHUN AJARAN ── */}
      <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-gray-900">Daftar Seluruh Periode Tahun Ajaran</h3>
            <p className="text-xs text-gray-500 font-medium">Kelola status periode aktif, arsip historis, dan pengalihan konteks data.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/academic-years"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-[#531FFF] transition-colors"
            >
              <GraduationCap className="w-3.5 h-3.5 text-[#531FFF]" />
              <span>Wizard Kenaikan Kelas</span>
              <ExternalLink className="w-3 h-3 text-gray-400" />
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Tahun Ajaran</th>
                <th className="py-3 px-4">Semester</th>
                <th className="py-3 px-4">Status Periode</th>
                <th className="py-3 px-4">Rentang Waktu</th>
                <th className="py-3 px-4">Konteks Data</th>
                <th className="py-3 px-4 text-right">Aksi Manajemen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {availableYears.map((yr) => {
                const isDefault = yr.isDefault || yr.name === schoolDefaultYear;
                const isViewingThis = yr.name === activeAcademicYear;

                return (
                  <tr key={yr.id} className={cn("hover:bg-purple-50/20 transition-colors", isDefault && "bg-purple-50/30")}>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0",
                          isDefault ? "bg-[#531FFF] text-white shadow-2xs" : "bg-gray-100 text-gray-600"
                        )}>
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-extrabold text-gray-900 text-xs sm:text-sm">{yr.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono">ID: {yr.id}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-gray-800">
                      Semester {yr.semester || "Ganjil"}
                    </td>

                    <td className="py-3.5 px-4">
                      {isDefault ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Aktif (Default Sekolah)
                        </span>
                      ) : yr.status === "Mendatang" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <Clock className="w-3 h-3 text-blue-600" />
                          Mendatang
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                          <Archive className="w-3 h-3 text-gray-500" />
                          Tersimpan (Arsip)
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-gray-500 font-mono text-[11px]">
                      {yr.startDate && yr.endDate ? `${yr.startDate} s/d ${yr.endDate}` : "Satu Tahun Ajaran Penuh"}
                    </td>

                    <td className="py-3.5 px-4">
                      {isViewingThis ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#531FFF]">
                          <span className="w-2 h-2 rounded-full bg-[#531FFF] animate-pulse" />
                          Sedang Ditampilkan
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400">Tersimpan di Database</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-2">
                      {!isDefault && (
                        <button
                          type="button"
                          onClick={() => handleSetActive(yr)}
                          disabled={isSubmitting}
                          className="px-3 py-1.5 rounded-md bg-[#531FFF] text-white hover:bg-[#4314cc] text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                          title="Tetapkan periode ini sebagai default aktif sekolah"
                        >
                          Aktifkan
                        </button>
                      )}

                      {!isViewingThis && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveAcademicYear(yr.name);
                            setActiveSemester(yr.semester || "Ganjil");
                            showInfo(`Beralih ke tampilan arsip data ${yr.name} (${yr.semester || "Ganjil"}).`, "Mode Arsip");
                          }}
                          className="px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-bold transition-colors cursor-pointer"
                          title="Buka dan telusuri data periode ini tanpa mengubah default sekolah"
                        >
                          Buka Data
                        </button>
                      )}

                      {!isDefault && yr.status !== "Arsip" && (
                        <button
                          type="button"
                          onClick={() => handleArchiveYear(yr)}
                          className="px-2.5 py-1.5 rounded-md text-gray-400 hover:text-amber-700 hover:bg-amber-50 text-xs font-medium transition-colors cursor-pointer"
                          title="Tandai sebagai Arsip"
                        >
                          Arsipkan
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 5. PROMOTION & YEAR ROLLOVER BANNER ── */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-[#531FFF] flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-gray-900">Pergantian Tahun Ajaran: Kenaikan Kelas & Kelulusan</h4>
            <p className="text-xs text-gray-500 font-medium">
              Gunakan wizard kenaikan kelas otomatis saat tahun ajaran berganti agar siswa kelas 10 naik ke kelas 11, kelas 11 ke 12, dan kelas 12 lulus ke alumni secara serentak.
            </p>
          </div>
        </div>

        <Link
          href="/academic-years"
          className="px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 shrink-0"
        >
          <span>Buka Wizard Kenaikan Kelas</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
