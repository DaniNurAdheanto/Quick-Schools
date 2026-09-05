"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Calendar, CheckCircle2, Plus, Edit3, Trash2, GraduationCap, 
  ArrowRight, ShieldCheck, RefreshCw, AlertTriangle, Layers, 
  Users, School, Sparkles, BookOpen, Loader2, Save, FileText, ChevronRight, ShieldAlert
} from "lucide-react";
import { collection, onSnapshot, doc, setDoc, addDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch, getDocs, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { AlertBox, AlertType } from "@/components/ui/alert-box";

export default function AcademicYearsPage() {
  const { activeAcademicYear, activeSemester, availableYears, setActiveAcademicYear, setActiveSemester } = useAcademicYear();

  const [userRole, setUserRole] = useState<string>("admin");
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [dbYears, setDbYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Add New Academic Year Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newYearName, setNewYearName] = useState("2026/2027");

  // Promotion Wizard State
  const [targetNewYear, setTargetNewYear] = useState("2026/2027");

  // Firestore Subscriptions & Auth Check
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userSnap = await getDoc(doc(db, "users", user.uid));
          if (userSnap.exists()) {
            const rawRole = userSnap.data().role || "admin";
            const role = (rawRole === "student" || rawRole === "siswa") ? "siswa" : rawRole;
            setUserRole(role);
          }
        } catch (err) {
          console.error("Error fetching user role:", err);
        }
      }
    });

    const unsubYears = onSnapshot(collection(db, "academicYears"), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setDbYears(list);
      setLoading(false);
    });

    const unsubStudents = onSnapshot(collection(db, "students"), (snap) => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubClasses = onSnapshot(collection(db, "classes"), (snap) => {
      setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubAuth();
      unsubYears();
      unsubStudents();
      unsubClasses();
    };
  }, []);

  // Combined Academic Years list with fallbacks
  const yearsList = useMemo(() => {
    if (dbYears.length > 0) return dbYears;
    return [
      { id: "2025/2026", name: "2025/2026", isDefault: true, status: "Aktif", semester: "Ganjil" },
      { id: "2024/2025", name: "2024/2025", isDefault: false, status: "Arsip", semester: "Genap" },
      { id: "2023/2024", name: "2023/2024", isDefault: false, status: "Arsip", semester: "Genap" }
    ];
  }, [dbYears]);

  // Handle Add New Academic Year
  const handleAddAcademicYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newYearName) return;

    try {
      await setDoc(doc(db, "academicYears", newYearName), {
        name: newYearName,
        isDefault: false,
        status: "Mendatang",
        semester: "Ganjil",
        createdAt: serverTimestamp()
      });

      triggerAlert("success", `Tahun Ajaran Baru ${newYearName} berhasil ditambahkan!`, "Berhasil Tambah");
      setIsAddModalOpen(false);
    } catch (err: any) {
      console.error("Error adding academic year:", err);
      triggerAlert("error", "Gagal menambahkan Tahun Ajaran Baru.", "Gagal");
    }
  };

  // Handle Set Default Active Academic Year
  const handleSetDefaultYear = async (yearObj: any) => {
    try {
      const yearName = yearObj.name || yearObj.id;
      setActiveAcademicYear(yearName);

      // Update Firestore documents
      const batch = writeBatch(db);
      yearsList.forEach(y => {
        const ref = doc(db, "academicYears", y.id || y.name);
        batch.set(ref, { isDefault: (y.id || y.name) === yearName, status: (y.id || y.name) === yearName ? "Aktif" : "Arsip" }, { merge: true });
      });
      await batch.commit();

      triggerAlert("edit", `Tahun Ajaran Aktif sistem diubah ke ${yearName}!`, "Berhasil Edit");
    } catch (err) {
      console.error("Error setting active academic year:", err);
      triggerAlert("error", "Gagal mengubah Tahun Ajaran Aktif.", "Gagal");
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

      // Switch active year to new target year
      setActiveAcademicYear(targetNewYear);
      setActiveSemester("Ganjil");

      triggerAlert(
        "success", 
        `Proses Kenaikan Kelas Selesai! ${promotedCount} siswa naik kelas & ${graduatedCount} siswa lulus ke alumni. Tahun ajaran aktif sekarang ${targetNewYear}.`, 
        "Berhasil"
      );
    } catch (err: any) {
      console.error("Error processing promotion:", err);
      triggerAlert("error", `Gagal memproses kenaikan kelas: ${err?.message || "Terjadi kesalahan"}`, "Gagal");
    } finally {
      setIsProcessing(false);
    }
  };

  if (userRole === "siswa") {
    return (
      <div className="p-8 max-w-2xl mx-auto my-16 text-center bg-white rounded-3xl border border-gray-100 shadow-xl p-12 space-y-4">
        <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
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
    <div className="p-4 sm:p-6 md:p-8 max-w-full mx-auto w-full flex-1 flex flex-col min-h-screen bg-gray-50/50 animate-in fade-in duration-300 relative">
      
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

      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4 bg-white p-5 md:p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Tahun Ajaran & Kenaikan Kelas</h1>
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#531FFF]/10 text-[#531FFF] border border-[#531FFF]/20">
              Aktif: {activeAcademicYear} ({activeSemester})
            </span>
          </div>
          <p className="text-gray-500 text-xs md:text-sm font-medium mt-1">
            Pengaturan periode akademik, pengarsipan data historis, serta wizard kenaikan kelas & kelulusan siswa.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Tab Navigation */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab("list")}
              className={cn(
                "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                activeTab === "list" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
              )}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Daftar Tahun Ajaran</span>
            </button>
            <button
              onClick={() => setActiveTab("promotion")}
              className={cn(
                "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                activeTab === "promotion" ? "bg-white text-[#531FFF] shadow-xs" : "text-gray-500 hover:text-gray-900"
              )}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Kenaikan Kelas & Kelulusan</span>
            </button>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-[#531FFF] hover:bg-[#531FFF]/90 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-[#531FFF]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Tahun Ajaran Baru</span>
          </button>
        </div>
      </div>

      {/* System Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#531FFF] flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Tahun Ajaran Aktif</span>
            <p className="text-base font-extrabold text-gray-900 leading-none mt-1">{activeAcademicYear}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Siswa Aktif</span>
            <p className="text-base font-extrabold text-gray-900 leading-none mt-1">{students.filter(s => s.status === 'Aktif').length} Siswa</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <School className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Total Kelas</span>
            <p className="text-base font-extrabold text-gray-900 leading-none mt-1">{classes.length} Kelas</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Alumni Lulus</span>
            <p className="text-base font-extrabold text-gray-900 leading-none mt-1">{students.filter(s => s.status === 'Lulus').length} Alumni</p>
          </div>
        </div>
      </div>

      {/* TAB 1: DAFTAR TAHUN AJARAN */}
      {activeTab === "list" && (
        <div className="space-y-6">
          
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <h3 className="font-bold text-xs text-gray-800 uppercase tracking-wider">Daftar Periode Tahun Ajaran ({yearsList.length})</h3>
              <span className="text-xs text-gray-400 font-medium">Klik "Set Aktif" untuk berpindah periode sistem</span>
            </div>

            <div className="divide-y divide-gray-100">
              {yearsList.map((y) => {
                const yearName = y.name || y.id;
                const isActive = yearName === activeAcademicYear;

                return (
                  <div 
                    key={y.id || yearName}
                    className={cn(
                      "p-5 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4",
                      isActive ? "bg-purple-50/30" : "hover:bg-gray-50/50"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-sm shrink-0 border",
                        isActive 
                          ? "bg-[#531FFF] text-white border-[#531FFF] shadow-md shadow-[#531FFF]/20" 
                          : "bg-gray-100 text-gray-600 border-gray-200"
                      )}>
                        <Calendar className="w-6 h-6" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-base text-gray-900">Tahun Ajaran {yearName}</h4>
                          {isActive && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              AKTIF SEKARANG
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 font-medium mt-1">
                          Semester Aktif: <span className="font-bold text-gray-800">{isActive ? activeSemester : (y.semester || "Ganjil")}</span> · 
                          Status: <span className="font-bold text-gray-800">{isActive ? "Berjalan" : (y.status || "Arsip")}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      {/* Semester Switcher for active year */}
                      {isActive && (
                        <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-2xs">
                          <button
                            onClick={() => {
                              setActiveSemester("Ganjil");
                              triggerAlert("edit", "Semester aktif diubah ke Semester Ganjil", "Berhasil Edit");
                            }}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-xs font-bold transition-all",
                              activeSemester === "Ganjil" ? "bg-[#531FFF] text-white" : "text-gray-600 hover:text-gray-900"
                            )}
                          >
                            Ganjil
                          </button>
                          <button
                            onClick={() => {
                              setActiveSemester("Genap");
                              triggerAlert("edit", "Semester aktif diubah ke Semester Genap", "Berhasil Edit");
                            }}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-xs font-bold transition-all",
                              activeSemester === "Genap" ? "bg-[#531FFF] text-white" : "text-gray-600 hover:text-gray-900"
                            )}
                          >
                            Genap
                          </button>
                        </div>
                      )}

                      {!isActive && (
                        <button
                          onClick={() => handleSetDefaultYear(y)}
                          className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                        >
                          Set Sebagai Aktif
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: WIZARD KENAIKAN KELAS & KELULUSAN */}
      {activeTab === "promotion" && (
        <div className="space-y-6">
          
          {/* Information & Instruction Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[#531FFF]/10 to-transparent rounded-bl-full pointer-events-none" />

            <div className="flex items-center gap-3 mb-2">
              <GraduationCap className="w-6 h-6 text-[#531FFF]" />
              <h3 className="font-extrabold text-base text-gray-900">Wizard Kenaikan Kelas & Kelulusan Akhir Tahun</h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed max-w-3xl">
              Proses ini akan meluluskan siswa kelas akhir (Kelas 12) menjadi alumni, serta menaikkan kelas siswa tingkat bawah (Kelas 10 ➔ 11, Kelas 11 ➔ 12) secara otomatis. Seluruh data rapor dan nilai tahun lalu tetap tersimpan utuh di arsip histori.
            </p>

            <div className="mt-6 p-4 rounded-xl bg-purple-50/50 border border-purple-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-extrabold text-purple-700 uppercase tracking-wider">Target Tahun Ajaran Baru</span>
                <div className="flex items-center gap-3 mt-1">
                  <span className="font-extrabold text-sm text-gray-900">{activeAcademicYear}</span>
                  <ArrowRight className="w-4 h-4 text-purple-600" />
                  <select
                    value={targetNewYear}
                    onChange={(e) => setTargetNewYear(e.target.value)}
                    className="bg-white border border-purple-200 text-purple-900 text-xs font-extrabold rounded-xl py-1.5 px-3 focus:ring-2 focus:ring-[#531FFF]/20"
                  >
                    <option value="2026/2027">2026/2027</option>
                    <option value="2027/2028">2027/2028</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleProcessPromotion}
                disabled={isProcessing}
                className="flex items-center gap-2 bg-[#531FFF] hover:bg-[#531FFF]/90 text-white px-5 py-2.5 rounded-xl text-xs font-extrabold shadow-md shadow-[#531FFF]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span>Proses Kenaikan Kelas Automatis</span>
              </button>
            </div>
          </div>

          {/* Promotion Preview Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Step 1: Kelulusan Kelas 12 */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
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
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
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
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
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

      {/* MODAL TAMBAH TAHUN AJARAN BARU */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md p-6 text-gray-900">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#531FFF]" />
                <h3 className="font-extrabold text-base">Tambah Tahun Ajaran Baru</h3>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddAcademicYear} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Format Tahun Ajaran</label>
                <input
                  type="text"
                  required
                  value={newYearName}
                  onChange={(e) => setNewYearName(e.target.value)}
                  placeholder="Contoh: 2026/2027"
                  className="w-full px-3 py-2 font-bold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                />
                <p className="text-[11px] text-gray-400 mt-1">Gunakan format TTTT/TTTT (misal: 2026/2027)</p>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 font-bold text-gray-500 hover:bg-gray-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-[#531FFF] hover:bg-[#531FFF]/90 text-white px-5 py-2 rounded-xl font-bold shadow-md shadow-[#531FFF]/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Periode</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
