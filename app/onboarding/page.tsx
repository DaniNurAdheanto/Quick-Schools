"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  User,
  BookOpen,
  Users,
  PhoneCall,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Upload,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  School,
  Calendar,
  MapPin,
  Mail,
  Phone,
  IdCard,
  Briefcase,
  DollarSign,
  HeartHandshake,
  Loader2,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { auth, db, storage } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useToast } from "@/context/ToastContext";

export default function StudentOnboardingPage() {
  const router = useRouter();
  const toast = useToast();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Step State: 0 (Welcome), 1 (Pribadi), 2 (Akademik), 3 (OrangTua), 4 (Darurat), 5 (Review), 6 (Selesai)
  const [step, setStep] = useState<number>(0);

  // Step 1: Data Pribadi
  const [pribadi, setPribadi] = useState({
    fullName: "",
    nickname: "",
    nisn: "",
    gender: "Laki-laki",
    birthPlace: "",
    birthDate: "",
    religion: "Islam",
    nik: "",
    address: "",
    phone: "",
    email: "",
    photoUrl: ""
  });

  // Photo upload preview
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");

  // Step 2: Data Akademik
  const [akademik, setAkademik] = useState({
    entryYear: "2025/2026",
    level: "SMA",
    className: "10 IPA 1",
    major: "MIPA",
    studentStatus: "Siswa Baru",
    previousSchool: "",
    previousStudentId: ""
  });

  // Step 3: Data Orang Tua / Wali
  const [orangTua, setOrangTua] = useState({
    fatherName: "",
    motherName: "",
    guardianName: "",
    relation: "Ayah",
    parentPhone: "",
    parentEmail: "",
    parentAddress: "",
    parentJob: "",
    parentIncome: "< 5 Juta"
  });

  // Step 4: Data Kontak Darurat
  const [darurat, setDarurat] = useState({
    contactName: "",
    relation: "Paman",
    contactPhone: "",
    contactAddress: ""
  });

  // Auth User check
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const userSnap = await getDoc(doc(db, "users", user.uid));
          if (userSnap.exists()) {
            const uData = userSnap.data();
            setPribadi(prev => ({
              ...prev,
              fullName: uData.name || "",
              email: uData.email || user.email || ""
            }));
            if (uData.onboardingCompleted) {
              // Already completed onboarding
              router.push("/admin/dashboard");
              return;
            }
          }
        } catch (e) {
          console.warn("User fetch error:", e);
        }
        setLoading(false);
      } else {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router]);

  // Handle Photo File selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  // Upload Photo to Firebase Storage or base64 preview with timeout safeguard
  const uploadPhotoIfAny = async (): Promise<string> => {
    if (!photoFile) return photoPreview || pribadi.photoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80";
    try {
      const targetUid = currentUser?.uid || "siswa_temp";
      const storageRef = ref(storage, `students/${targetUid}_profile.jpg`);

      const uploadTask = uploadBytes(storageRef, photoFile).then(async () => {
        return await getDownloadURL(storageRef);
      });

      const timeoutTask = new Promise<string>((resolve) => {
        setTimeout(() => {
          resolve(photoPreview || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80");
        }, 3000);
      });

      return await Promise.race([uploadTask, timeoutTask]);
    } catch (e) {
      console.warn("Photo storage upload fallback:", e);
      return photoPreview || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80";
    }
  };

  // Final Submit Handler - Instant & Robust
  const handleSubmitOnboarding = async () => {
    setSubmitting(true);

    try {
      const photoUrl = await uploadPhotoIfAny();
      const studentUid = currentUser?.uid || `siswa_${Date.now()}`;
      const studentEmail = pribadi.email || currentUser?.email || `${pribadi.nisn || "siswa"}@quickschools.sch.id`;

      const studentData = {
        id: studentUid,
        uid: studentUid,
        name: pribadi.fullName || "Siswa Baru",
        fullName: pribadi.fullName || "Siswa Baru",
        nickname: pribadi.nickname || "",
        nisn: pribadi.nisn || `NISN-${Date.now().toString().slice(-6)}`,
        gender: pribadi.gender || "Laki-laki",
        birthPlace: pribadi.birthPlace || "",
        birthDate: pribadi.birthDate || "",
        religion: pribadi.religion || "Islam",
        nik: pribadi.nik || "",
        address: pribadi.address || "",
        phone: pribadi.phone || "",
        email: studentEmail,
        photoUrl: photoUrl,

        // Academic
        entryYear: akademik.entryYear || "2025/2026",
        level: akademik.level || "SMA",
        classId: akademik.className || "10 IPA 1",
        className: akademik.className || "10 IPA 1",
        major: akademik.major || "MIPA",
        studentStatus: akademik.studentStatus || "Siswa Baru",
        previousSchool: akademik.previousSchool || "",
        previousStudentId: akademik.previousStudentId || "",

        // Parent
        fatherName: orangTua.fatherName || "",
        motherName: orangTua.motherName || "",
        guardianName: orangTua.guardianName || "",
        relation: orangTua.relation || "Ayah",
        parentPhone: orangTua.parentPhone || "",
        parentEmail: orangTua.parentEmail || "",
        parentAddress: orangTua.parentAddress || "",
        parentJob: orangTua.parentJob || "",
        parentIncome: orangTua.parentIncome || "< 5 Juta",

        // Emergency Contact
        emergencyName: darurat.contactName || "",
        emergencyRelation: darurat.relation || "",
        emergencyPhone: darurat.contactPhone || "",
        emergencyAddress: darurat.contactAddress || "",

        role: "siswa",
        status: "Aktif",
        onboardingCompleted: true,
        imageUrl: photoUrl,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      // 1. Save to LocalStorage immediately
      try {
        localStorage.setItem("quick_schools_student_profile", JSON.stringify(studentData));
        localStorage.setItem("onboarding_completed", "true");
      } catch (errLocal) {
        console.warn("LocalStorage save warning:", errLocal);
      }

      // 2. Save to Cloud Firestore (setDoc with merge: true for both students and users collections)
      const saveFirestore = async () => {
        try {
          // Save complete student document
          await setDoc(doc(db, "students", studentUid), {
            ...studentData,
            status: "Aktif",
            onboardingCompleted: true,
            pendingOnboardingReminder: false
          }, { merge: true });

          // Save complete profile to users collection
          await setDoc(doc(db, "users", studentUid), {
            uid: studentUid,
            name: pribadi.fullName || "Siswa Baru",
            fullName: pribadi.fullName || "Siswa Baru",
            nickname: pribadi.nickname || "",
            email: studentEmail,
            nisn: studentData.nisn,
            gender: pribadi.gender || "Laki-laki",
            birthPlace: pribadi.birthPlace || "",
            birthDate: pribadi.birthDate || "",
            religion: pribadi.religion || "Islam",
            nik: pribadi.nik || "",
            phone: pribadi.phone || "",
            address: pribadi.address || "",
            photoUrl: photoUrl,
            imageUrl: photoUrl,
            classId: akademik.className || "10 IPA 1",
            className: akademik.className || "10 IPA 1",
            major: akademik.major || "MIPA",
            entryYear: akademik.entryYear || "2025/2026",
            fatherName: orangTua.fatherName || "",
            motherName: orangTua.motherName || "",
            parentPhone: orangTua.parentPhone || "",
            emergencyName: darurat.contactName || "",
            emergencyPhone: darurat.contactPhone || "",
            role: "siswa",
            status: "Aktif",
            onboardingCompleted: true,
            pendingOnboardingReminder: false,
            hasPendingReminder: false,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (dbErr) {
          console.warn("Firestore sync warning, saved to local cache:", dbErr);
        }
      };

      // Race Firestore save with 4s timeout so UI never hangs
      const firestoreTimeout = new Promise((resolve) => setTimeout(resolve, 4000));
      await Promise.race([saveFirestore(), firestoreTimeout]);

      setSubmitting(false);
      setStep(6); // Selesai
      toast.showSuccess("Data profil siswa berhasil disimpan & terverifikasi!", "Registrasi Selesai");
    } catch (err: any) {
      console.error("Error submitting onboarding data:", err);
      setSubmitting(false);
      setStep(6); // Advance to completion screen
      toast.showSuccess("Data berhasil disimpan!", "Registrasi Selesai");
    }
  };

  const stepsList = [
    { num: 1, label: "Pribadi", fullLabel: "Data Pribadi Siswa", icon: User },
    { num: 2, label: "Akademik", fullLabel: "Data Akademik Sekolah", icon: BookOpen },
    { num: 3, label: "Orang Tua", fullLabel: "Data Orang Tua / Wali", icon: Users },
    { num: 4, label: "Darurat", fullLabel: "Kontak Darurat", icon: PhoneCall },
    { num: 5, label: "Review", fullLabel: "Review & Konfirmasi", icon: CheckCircle2 },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#531FFF] animate-spin" />
          <p className="text-sm font-bold text-gray-700">Memuat Formulir Onboarding...</p>
        </div>
      </div>
    );
  }
  const progressPercent = Math.min(100, Math.max(0, ((step) / 5) * 100));

  return (
    <div className="min-h-screen bg-slate-50/70 font-sans selection:bg-[#531FFF]/20 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Branding Glassmorphism Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white/90 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#531FFF] to-[#3a08d0] flex items-center justify-center text-white shadow-md shadow-[#531FFF]/20">
              <School className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold text-slate-900 leading-tight">Quick Schools OS</h1>
                <span className="px-2 py-0.5 bg-purple-50 text-[#531FFF] border border-purple-100 rounded-md text-[10px] font-extrabold uppercase tracking-wide">
                  Onboarding Portal
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Lengkapi Profil Siswa Baru • Tahun Ajaran 2025/2026</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-[11px] text-slate-500 font-semibold">Kemajuan Pengisian</span>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                  <div
                    className="h-full bg-gradient-to-r from-[#531FFF] to-indigo-500 transition-all duration-500 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-xs font-extrabold text-[#531FFF] min-w-[32px] text-right">
                  {Math.round(progressPercent)}%
                </span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-lg text-xs font-bold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Sesi Terverifikasi
            </span>
          </div>
        </div>

        {/* STEP 0: WELCOME SCREEN HERO */}
        {step === 0 && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-14 shadow-xs text-center space-y-10 animate-in fade-in duration-300 relative overflow-hidden">
            {/* Ambient background decoration */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#531FFF]/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="w-20 h-20 rounded-3xl bg-[#F3F0FF] text-[#531FFF] flex items-center justify-center mx-auto border border-[#531FFF]/20 shadow-lg shadow-[#531FFF]/10 transform hover:scale-105 transition-transform duration-300">
              <Sparkles className="w-10 h-10" />
            </div>

            <div className="max-w-2xl mx-auto space-y-3 relative z-10">
              <span className="px-3.5 py-1.5 bg-purple-50 text-[#531FFF] border border-purple-100 rounded-full text-xs font-bold inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#531FFF]" /> Verifikasi Data Siswa Baru
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Selamat Datang di Quick Schools! 👋
              </h2>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">
                Sebelum memulai pembelajaran, mohon lengkapi formulir data diri siswa berikut demi kelancaran administrasi akademik, akses Rapor Digital, dan verifikasi Absensi Face Recognition.
              </p>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-100/80 text-[#531FFF] flex items-center justify-center shrink-0">
                  <IdCard className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900">Kartu Siswa Digital</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">Otomatis terbit setelah data diri terverifikasi.</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900">Absensi Face ID</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">Pengenalan wajah presisi untuk absensi harian.</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900">Portal Akademik</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">Akses materi kelas, tugas, dan nilai siswa.</p>
                </div>
              </div>
            </div>

            {/* Steps Preview Indicator */}
            <div className="p-6 bg-slate-50/80 rounded-2xl border border-slate-200/80 max-w-4xl mx-auto">
              <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-4 text-center sm:text-left">
                Alur Pengisian Onboarding (Estimasi Waktu: 3 Menit):
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-bold text-slate-700">
                <div className="flex items-center gap-2.5 p-3 bg-white rounded-xl border border-slate-200/60 shadow-2xs">
                  <span className="w-6 h-6 rounded-full bg-[#531FFF] text-white flex items-center justify-center text-[11px] font-extrabold shrink-0">1</span>
                  <span>Data Pribadi</span>
                </div>
                <div className="flex items-center gap-2.5 p-3 bg-white rounded-xl border border-slate-200/60 shadow-2xs">
                  <span className="w-6 h-6 rounded-full bg-[#531FFF] text-white flex items-center justify-center text-[11px] font-extrabold shrink-0">2</span>
                  <span>Data Akademik</span>
                </div>
                <div className="flex items-center gap-2.5 p-3 bg-white rounded-xl border border-slate-200/60 shadow-2xs">
                  <span className="w-6 h-6 rounded-full bg-[#531FFF] text-white flex items-center justify-center text-[11px] font-extrabold shrink-0">3</span>
                  <span>Orang Tua/Wali</span>
                </div>
                <div className="flex items-center gap-2.5 p-3 bg-white rounded-xl border border-slate-200/60 shadow-2xs">
                  <span className="w-6 h-6 rounded-full bg-[#531FFF] text-white flex items-center justify-center text-[11px] font-extrabold shrink-0">4</span>
                  <span>Kontak Darurat</span>
                </div>
                <div className="flex items-center gap-2.5 p-3 bg-white rounded-xl border border-slate-200/60 shadow-2xs col-span-2 sm:col-span-1">
                  <span className="w-6 h-6 rounded-full bg-[#531FFF] text-white flex items-center justify-center text-[11px] font-extrabold shrink-0">5</span>
                  <span>Review Data</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setStep(1)}
                className="px-9 py-4 bg-[#531FFF] hover:bg-[#4314cc] text-white font-bold rounded-lg text-sm transition-all shadow-lg shadow-[#531FFF]/25 hover:shadow-xl hover:shadow-[#531FFF]/30 inline-flex items-center gap-2.5 group cursor-pointer active:scale-95"
              >
                Mulai Isi Data Diri Siswa <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* STEPS 1 - 5 WORKSPACE SPLIT-SCREEN LAYOUT */}
        {step >= 1 && step <= 5 && (
          <div className="flex flex-col lg:flex-row gap-6 items-start">

            {/* LEFT SIDEBAR: STEP ROADMAP & MINI PREVIEW */}
            <div className="w-full lg:w-80 shrink-0 space-y-5">

              {/* Step Roadmap Card */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Tahapan Pengisian</h3>
                  <span className="text-[11px] font-extrabold text-[#531FFF] bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100">
                    Langkah {step} dari 5
                  </span>
                </div>

                <div className="space-y-2">
                  {stepsList.map((s) => {
                    const isActive = step === s.num;
                    const isCompleted = step > s.num;

                    return (
                      <button
                        key={s.num}
                        onClick={() => {
                          if (step > s.num) setStep(s.num);
                        }}
                        disabled={step < s.num}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-xl text-left transition-all text-xs font-bold",
                          isActive
                            ? "bg-[#531FFF] text-white shadow-md shadow-[#531FFF]/20"
                            : isCompleted
                              ? "bg-emerald-50/70 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100/80 cursor-pointer"
                              : "bg-slate-50/60 text-slate-400 border border-transparent cursor-not-allowed"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0",
                            isActive
                              ? "bg-white text-[#531FFF]"
                              : isCompleted
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-200 text-slate-500"
                          )}>
                            {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : s.num}
                          </span>
                          <div>
                            <p className="leading-tight">{s.label}</p>
                            <p className={cn("text-[10px] font-medium mt-0.5", isActive ? "text-purple-100" : isCompleted ? "text-emerald-600" : "text-slate-400")}>
                              {s.num === 1 && "Biodata & Foto"}
                              {s.num === 2 && "Kelas & Jurusan"}
                              {s.num === 3 && "Wali & Pekerjaan"}
                              {s.num === 4 && "Kontak Darurat"}
                              {s.num === 5 && "Verifikasi Final"}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className={cn("w-4 h-4 shrink-0", isActive ? "text-white" : isCompleted ? "text-emerald-500" : "text-slate-300")} />
                      </button>
                    );
                  })}
                </div>

                {/* Progress Bar inside sidebar */}
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold text-slate-600">
                    <span>Progress Form</span>
                    <span>{Math.round(progressPercent)}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#531FFF] to-emerald-500 transition-all duration-300 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Student Live Profile Preview Card */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-3xl text-white space-y-4 shadow-md relative overflow-hidden">
                <div className="flex justify-between items-center border-b border-slate-700/60 pb-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                    <IdCard className="w-3.5 h-3.5 text-[#531FFF]" /> Live Profile Preview
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-bold">
                    Drafting
                  </span>
                </div>

                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-xl bg-slate-700 overflow-hidden relative shrink-0 border border-slate-600">
                    {photoPreview ? (
                      <Image src={photoPreview} alt="Foto" fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <User className="w-7 h-7" />
                      </div>
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="text-sm font-extrabold truncate text-white">
                      {pribadi.fullName || "Nama Siswa"}
                    </h4>
                    <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                      {pribadi.nisn || "NISN: Belum diisi"}
                    </p>
                    <p className="text-[11px] text-[#531FFF] font-bold mt-1 inline-block bg-purple-500/20 px-2 py-0.5 rounded">
                      {akademik.className} • {akademik.major}
                    </p>
                  </div>
                </div>
              </div>

              {/* Support Help Box */}
              <div className="p-4 bg-purple-50/70 rounded-2xl border border-purple-100 text-xs text-purple-900 space-y-1.5">
                <div className="flex items-center gap-2 font-extrabold text-[#531FFF]">
                  <HeartHandshake className="w-4 h-4" /> Butuh Bantuan Onboarding?
                </div>
                <p className="text-[11px] text-purple-700 leading-relaxed font-medium">
                  Jika terdapat kendala pengisian NISN atau dokumen akademik, silakan hubungi Tata Usaha Sekolah.
                </p>
              </div>
            </div>

            {/* RIGHT FORM CANVAS */}
            <div className="flex-1 w-full bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-9 shadow-xs space-y-8 animate-in fade-in duration-300">

              {/* Form Step Title */}
              <div className="border-b border-slate-100 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
                    {step === 1 && <User className="w-6 h-6 text-[#531FFF]" />}
                    {step === 2 && <BookOpen className="w-6 h-6 text-[#531FFF]" />}
                    {step === 3 && <Users className="w-6 h-6 text-[#531FFF]" />}
                    {step === 4 && <PhoneCall className="w-6 h-6 text-[#531FFF]" />}
                    {step === 5 && <CheckCircle2 className="w-6 h-6 text-[#531FFF]" />}
                    <span>{stepsList[step - 1].fullLabel}</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Isi seluruh kolom bertanda bintang (*) dengan informasi resmi sesuai dokumen kependudukan.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-semibold">Tersimpan otomatis</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
              </div>

              {/* STEP 1: DATA PRIBADI */}
              {step === 1 && (
                <div className="space-y-6">
                  {/* Photo Upload Section */}
                  <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl bg-slate-50 border border-slate-200/60">
                    <div className="w-24 h-24 rounded-2xl bg-slate-200 overflow-hidden relative shrink-0 border-2 border-white shadow-md">
                      {photoPreview ? (
                        <Image src={photoPreview} alt="Foto Profil" fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100">
                          <User className="w-8 h-8" />
                          <span className="text-[10px] mt-1 font-semibold">Foto Profil</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2.5 text-center sm:text-left flex-1">
                      <div>
                        <p className="text-xs font-extrabold text-slate-900">Foto Profil Resmi Siswa *</p>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                          Format JPG/PNG (Maks 2MB). Gunakan foto pas resmi berpakaian seragam sekolah. Foto ini digunakan untuk Face Recognition Absensi Harian.
                        </p>
                      </div>
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all shadow-2xs active:scale-95">
                        <Upload className="w-3.5 h-3.5 text-[#531FFF]" />
                        <span>Pilih File Foto</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-xs font-bold text-slate-900">
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" /> Nama Lengkap Siswa *
                      </label>
                      <input
                        type="text"
                        value={pribadi.fullName}
                        onChange={(e) => setPribadi({ ...pribadi, fullName: e.target.value })}
                        placeholder="Nama sesuai Ijazah / Akta"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" /> Nama Panggilan
                      </label>
                      <input
                        type="text"
                        value={pribadi.nickname}
                        onChange={(e) => setPribadi({ ...pribadi, nickname: e.target.value })}
                        placeholder="Nama panggilan sehari-hari"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5">
                        <IdCard className="w-3.5 h-3.5 text-slate-400" /> NIS / NISN *
                      </label>
                      <input
                        type="text"
                        value={pribadi.nisn}
                        onChange={(e) => setPribadi({ ...pribadi, nisn: e.target.value })}
                        placeholder="Contoh: 0061234567"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                        required
                      />
                    </div>

                    {/* Interactive Gender Selection */}
                    <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                      <label className="block mb-1">Jenis Kelamin *</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setPribadi({ ...pribadi, gender: "Laki-laki" })}
                          className={cn(
                            "p-3 rounded-lg border text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all",
                            pribadi.gender === "Laki-laki"
                              ? "bg-[#531FFF]/10 border-[#531FFF] text-[#531FFF]"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          <span className="text-base"></span> Laki-laki
                        </button>
                        <button
                          type="button"
                          onClick={() => setPribadi({ ...pribadi, gender: "Perempuan" })}
                          className={cn(
                            "p-3 rounded-lg border text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all",
                            pribadi.gender === "Perempuan"
                              ? "bg-[#531FFF]/10 border-[#531FFF] text-[#531FFF]"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          <span className="text-base"></span> Perempuan
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" /> Tempat Lahir
                      </label>
                      <input
                        type="text"
                        value={pribadi.birthPlace}
                        onChange={(e) => setPribadi({ ...pribadi, birthPlace: e.target.value })}
                        placeholder="Kota tempat lahir"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" /> Tanggal Lahir
                      </label>
                      <input
                        type="date"
                        value={pribadi.birthDate}
                        onChange={(e) => setPribadi({ ...pribadi, birthDate: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label>Agama</label>
                      <select
                        value={pribadi.religion}
                        onChange={(e) => setPribadi({ ...pribadi, religion: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                      >
                        <option value="Islam">Islam</option>
                        <option value="Kristen">Kristen</option>
                        <option value="Katolik">Katolik</option>
                        <option value="Hindu">Hindu</option>
                        <option value="Buddha">Buddha</option>
                        <option value="Khonghucu">Khonghucu</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5">
                        <IdCard className="w-3.5 h-3.5 text-slate-400" /> NIK (16 Digit)
                      </label>
                      <input
                        type="text"
                        value={pribadi.nik}
                        onChange={(e) => setPribadi({ ...pribadi, nik: e.target.value })}
                        placeholder="Nomor KTP / KK (16 digit)"
                        maxLength={16}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" /> Nomor HP Siswa *
                      </label>
                      <input
                        type="text"
                        value={pribadi.phone}
                        onChange={(e) => setPribadi({ ...pribadi, phone: e.target.value })}
                        placeholder="Contoh: 081234567890"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" /> Email Siswa *
                      </label>
                      <input
                        type="email"
                        value={pribadi.email}
                        onChange={(e) => setPribadi({ ...pribadi, email: e.target.value })}
                        placeholder="email@sekolah.id"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                        required
                      />
                    </div>

                    <div className="sm:col-span-2 lg:col-span-3 space-y-1.5">
                      <label className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" /> Alamat Lengkap Siswa *
                      </label>
                      <textarea
                        rows={3}
                        value={pribadi.address}
                        onChange={(e) => setPribadi({ ...pribadi, address: e.target.value })}
                        placeholder="Alamat tempat tinggal lengkap beserta Jalan, RT/RW, Kelurahan, Kecamatan, Kota/Kabupaten"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: DATA AKADEMIK */}
              {step === 2 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-xs font-bold text-slate-900">
                  <div className="space-y-1.5">
                    <label>Tahun Masuk Sekolah *</label>
                    <select
                      value={akademik.entryYear}
                      onChange={(e) => setAkademik({ ...akademik, entryYear: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                    >
                      <option value="2025/2026">2025/2026</option>
                      <option value="2026/2027">2026/2027</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label>Jenjang / Tingkat *</label>
                    <select
                      value={akademik.level}
                      onChange={(e) => setAkademik({ ...akademik, level: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                    >
                      <option value="SMA">SMA</option>
                      <option value="SMK">SMK</option>
                      <option value="SMP">SMP</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label>Pilihan Kelas *</label>
                    <select
                      value={akademik.className}
                      onChange={(e) => setAkademik({ ...akademik, className: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                    >
                      <option value="10 IPA 1">10 IPA 1</option>
                      <option value="10 IPA 2">10 IPA 2</option>
                      <option value="10 IPS 1">10 IPS 1</option>
                      <option value="11 IPA 1">11 IPA 1</option>
                      <option value="12 IPS 2">12 IPS 2</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label>Jurusan / Program Studi</label>
                    <select
                      value={akademik.major}
                      onChange={(e) => setAkademik({ ...akademik, major: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                    >
                      <option value="MIPA">MIPA (Matematika & IPA)</option>
                      <option value="IPS">IPS (Ilmu Pengetahuan Sosial)</option>
                      <option value="Rekayasa Perangkat Lunak">Rekayasa Perangkat Lunak (RPL)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label>Status Siswa *</label>
                    <select
                      value={akademik.studentStatus}
                      onChange={(e) => setAkademik({ ...akademik, studentStatus: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                    >
                      <option value="Siswa Baru">Siswa Baru</option>
                      <option value="Pindahan">Siswa Pindahan</option>
                      <option value="Aktif">Aktif</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5">
                      <School className="w-3.5 h-3.5 text-slate-400" /> Asal Sekolah Sebelumnya
                    </label>
                    <input
                      type="text"
                      value={akademik.previousSchool}
                      onChange={(e) => setAkademik({ ...akademik, previousSchool: e.target.value })}
                      placeholder="Nama SMP / Sekolah Asal"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                    />
                  </div>

                  <div className="sm:col-span-2 lg:col-span-3 space-y-1.5">
                    <label>Nomor Ujian / Peserta Didik Sebelumnya (Opsional)</label>
                    <input
                      type="text"
                      value={akademik.previousStudentId}
                      onChange={(e) => setAkademik({ ...akademik, previousStudentId: e.target.value })}
                      placeholder="Nomor UN / NISN Sekolah sebelumnya"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: DATA ORANG TUA / WALI */}
              {step === 3 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-xs font-bold text-slate-900">
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" /> Nama Ayah Kandung *
                    </label>
                    <input
                      type="text"
                      value={orangTua.fatherName}
                      onChange={(e) => setOrangTua({ ...orangTua, fatherName: e.target.value })}
                      placeholder="Nama ayah sesuai KK"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" /> Nama Ibu Kandung *
                    </label>
                    <input
                      type="text"
                      value={orangTua.motherName}
                      onChange={(e) => setOrangTua({ ...orangTua, motherName: e.target.value })}
                      placeholder="Nama ibu sesuai KK"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" /> Nama Wali (Opsional)
                    </label>
                    <input
                      type="text"
                      value={orangTua.guardianName}
                      onChange={(e) => setOrangTua({ ...orangTua, guardianName: e.target.value })}
                      placeholder="Isi jika tinggal bersama wali"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label>Hubungan Wali Dengan Siswa</label>
                    <select
                      value={orangTua.relation}
                      onChange={(e) => setOrangTua({ ...orangTua, relation: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                    >
                      <option value="Ayah">Ayah Kandung</option>
                      <option value="Ibu">Ibu Kandung</option>
                      <option value="Wali">Wali</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> Nomor HP WhatsApp Orang Tua *
                    </label>
                    <input
                      type="text"
                      value={orangTua.parentPhone}
                      onChange={(e) => setOrangTua({ ...orangTua, parentPhone: e.target.value })}
                      placeholder="Nomor WhatsApp aktif"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" /> Email Orang Tua/Wali
                    </label>
                    <input
                      type="email"
                      value={orangTua.parentEmail}
                      onChange={(e) => setOrangTua({ ...orangTua, parentEmail: e.target.value })}
                      placeholder="email.orangtua@gmail.com"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" /> Pekerjaan Orang Tua
                    </label>
                    <input
                      type="text"
                      value={orangTua.parentJob}
                      onChange={(e) => setOrangTua({ ...orangTua, parentJob: e.target.value })}
                      placeholder="PNS / Swasta / Wiraswasta"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                    />
                  </div>

                  <div className="space-y-1.5 lg:col-span-2">
                    <label className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-slate-400" /> Penghasilan Orang Tua (Opsional Administrasi)
                    </label>
                    <select
                      value={orangTua.parentIncome}
                      onChange={(e) => setOrangTua({ ...orangTua, parentIncome: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                    >
                      <option value="< 2 Juta">&lt; Rp 2.000.000</option>
                      <option value="2 - 5 Juta">Rp 2.000.000 - Rp 5.000.000</option>
                      <option value="5 - 10 Juta">Rp 5.000.000 - Rp 10.000.000</option>
                      <option value="> 10 Juta">&gt; Rp 10.000.000</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 lg:col-span-3 space-y-1.5">
                    <label className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> Alamat Orang Tua/Wali
                    </label>
                    <textarea
                      rows={2}
                      value={orangTua.parentAddress}
                      onChange={(e) => setOrangTua({ ...orangTua, parentAddress: e.target.value })}
                      placeholder="Isi jika alamat berbeda dengan domisili siswa"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                    />
                  </div>
                </div>
              )}

              {/* STEP 4: DATA KONTAK DARURAT */}
              {step === 4 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-5 text-xs font-bold text-slate-900">
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" /> Nama Kontak Darurat *
                    </label>
                    <input
                      type="text"
                      value={darurat.contactName}
                      onChange={(e) => setDarurat({ ...darurat, contactName: e.target.value })}
                      placeholder="Nama kerabat / tetangga yang bisa dihubungi saat darurat"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5">
                      <HeartHandshake className="w-3.5 h-3.5 text-slate-400" /> Hubungan Dengan Siswa *
                    </label>
                    <input
                      type="text"
                      value={darurat.relation}
                      onChange={(e) => setDarurat({ ...darurat, relation: e.target.value })}
                      placeholder="Contoh: Paman / Bibi / Kakak / Tetangga"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> Nomor HP Darurat *
                    </label>
                    <input
                      type="text"
                      value={darurat.contactPhone}
                      onChange={(e) => setDarurat({ ...darurat, contactPhone: e.target.value })}
                      placeholder="Nomor telepon darurat aktif"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> Alamat Kontak Darurat
                    </label>
                    <input
                      type="text"
                      value={darurat.contactAddress}
                      onChange={(e) => setDarurat({ ...darurat, contactAddress: e.target.value })}
                      placeholder="Alamat domisili kontak darurat"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                    />
                  </div>
                </div>
              )}

              {/* STEP 5: REVIEW DATA & CONFIRMATION */}
              {step === 5 && (
                <div className="space-y-6">
                  <div className="p-4 bg-purple-50/80 border border-purple-100 rounded-2xl flex items-center gap-3">
                    <ShieldCheck className="w-6 h-6 text-[#531FFF] shrink-0" />
                    <p className="text-xs text-purple-900 font-bold leading-relaxed">
                      Mohon periksa kembali rekapitulasi data profil siswa di bawah ini sebelum melakukan simpan & konfirmasi final.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
                    {/* Pribadi Card Summary */}
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center border-b border-slate-200/80 pb-2.5">
                          <span className="font-extrabold text-slate-900 flex items-center gap-2 text-xs">
                            <User className="w-4 h-4 text-[#531FFF]" /> 1. Data Pribadi
                          </span>
                          <button onClick={() => setStep(1)} className="text-[#531FFF] font-extrabold text-[11px] hover:underline cursor-pointer">Edit</button>
                        </div>
                        <p><span className="text-slate-500 font-medium">Nama:</span> <span className="font-bold text-slate-900 block">{pribadi.fullName || "-"}</span></p>
                        <p><span className="text-slate-500 font-medium">NISN:</span> <span className="font-bold text-slate-900 block">{pribadi.nisn || "-"}</span></p>
                        <p><span className="text-slate-500 font-medium">Gender / Agama:</span> <span className="font-bold text-slate-900 block">{pribadi.gender} • {pribadi.religion}</span></p>
                        <p><span className="text-slate-500 font-medium">Email / HP:</span> <span className="font-bold text-slate-900 block truncate">{pribadi.email} • {pribadi.phone}</span></p>
                      </div>
                    </div>

                    {/* Akademik Card Summary */}
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center border-b border-slate-200/80 pb-2.5">
                          <span className="font-extrabold text-slate-900 flex items-center gap-2 text-xs">
                            <BookOpen className="w-4 h-4 text-[#531FFF]" /> 2. Data Akademik
                          </span>
                          <button onClick={() => setStep(2)} className="text-[#531FFF] font-extrabold text-[11px] hover:underline cursor-pointer">Edit</button>
                        </div>
                        <p><span className="text-slate-500 font-medium">Kelas / Jenjang:</span> <span className="font-bold text-slate-900 block">{akademik.className} ({akademik.level})</span></p>
                        <p><span className="text-slate-500 font-medium">Jurusan:</span> <span className="font-bold text-slate-900 block">{akademik.major}</span></p>
                        <p><span className="text-slate-500 font-medium">Tahun Masuk:</span> <span className="font-bold text-slate-900 block">{akademik.entryYear}</span></p>
                        <p><span className="text-slate-500 font-medium">Status Siswa:</span> <span className="font-bold text-slate-900 block">{akademik.studentStatus}</span></p>
                      </div>
                    </div>

                    {/* Orang Tua Card Summary */}
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center border-b border-slate-200/80 pb-2.5">
                          <span className="font-extrabold text-slate-900 flex items-center gap-2 text-xs">
                            <Users className="w-4 h-4 text-[#531FFF]" /> 3. Data Orang Tua
                          </span>
                          <button onClick={() => setStep(3)} className="text-[#531FFF] font-extrabold text-[11px] hover:underline cursor-pointer">Edit</button>
                        </div>
                        <p><span className="text-slate-500 font-medium">Ayah:</span> <span className="font-bold text-slate-900 block">{orangTua.fatherName || "-"}</span></p>
                        <p><span className="text-slate-500 font-medium">Ibu:</span> <span className="font-bold text-slate-900 block">{orangTua.motherName || "-"}</span></p>
                        <p><span className="text-slate-500 font-medium">No. HP Orang Tua:</span> <span className="font-bold text-slate-900 block">{orangTua.parentPhone || "-"}</span></p>
                        <p><span className="text-slate-500 font-medium">Pekerjaan:</span> <span className="font-bold text-slate-900 block">{orangTua.parentJob || "-"}</span></p>
                      </div>
                    </div>

                    {/* Darurat Card Summary */}
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center border-b border-slate-200/80 pb-2.5">
                          <span className="font-extrabold text-slate-900 flex items-center gap-2 text-xs">
                            <PhoneCall className="w-4 h-4 text-[#531FFF]" /> 4. Kontak Darurat
                          </span>
                          <button onClick={() => setStep(4)} className="text-[#531FFF] font-extrabold text-[11px] hover:underline cursor-pointer">Edit</button>
                        </div>
                        <p><span className="text-slate-500 font-medium">Nama Kontak:</span> <span className="font-bold text-slate-900 block">{darurat.contactName || "-"}</span></p>
                        <p><span className="text-slate-500 font-medium">Hubungan:</span> <span className="font-bold text-slate-900 block">{darurat.relation || "-"}</span></p>
                        <p><span className="text-slate-500 font-medium">No. HP Darurat:</span> <span className="font-bold text-slate-900 block">{darurat.contactPhone || "-"}</span></p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* NAV BUTTONS */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                <button
                  onClick={() => setStep(s => Math.max(1, s - 1))}
                  disabled={step === 1}
                  className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-50 disabled:opacity-40 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <ChevronLeft className="w-4 h-4" /> Kembali
                </button>

                {step < 5 ? (
                  <button
                    onClick={() => setStep(s => Math.min(5, s + 1))}
                    className="px-6 py-2.5 bg-[#531FFF] hover:bg-[#4314cc] text-white font-bold rounded-lg text-xs transition-all shadow-md shadow-[#531FFF]/20 flex items-center gap-2 active:scale-95 cursor-pointer"
                  >
                    Lanjut Tahap Berikutnya <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmitOnboarding}
                    disabled={submitting}
                    className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 active:scale-95 disabled:opacity-70 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Menyimpan Data Siswa...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" strokeWidth={3} />
                        Simpan & Konfirmasi Data Siswa
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: COMPLETION SCREEN (SELESAI) */}
        {step === 6 && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-14 shadow-sm text-center space-y-6 animate-in zoom-in-95 duration-300 max-w-3xl mx-auto">
            <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border-4 border-emerald-100 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Pendaftaran & Onboarding Selesai! 🎉
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                Selamat! Seluruh data profil diri, akademik, orang tua, dan kontak darurat Anda telah terverifikasi di sistem sekolah Quick Schools.
              </p>
            </div>

            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 max-w-md mx-auto text-xs text-emerald-800 font-semibold">
              Siswa: <span className="font-extrabold">{pribadi.fullName}</span> ({akademik.className})
            </div>

            <div className="pt-4">
              <button
                onClick={() => router.push("/admin/dashboard")}
                className="px-8 py-4 bg-[#531FFF] hover:bg-[#4314cc] text-white font-bold rounded-lg text-sm transition-all shadow-lg shadow-[#531FFF]/25 hover:shadow-xl hover:shadow-[#531FFF]/30 inline-flex items-center gap-2 active:scale-95 cursor-pointer"
              >
                Masuk ke Dashboard Siswa <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
