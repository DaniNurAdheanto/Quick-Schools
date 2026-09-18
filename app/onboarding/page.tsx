"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Check,
  Copy,
  Lock,
  UserCheck,
  GraduationCap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { auth, db, storage } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, query, collection, where, getDocs, arrayUnion, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useToast } from "@/context/ToastContext";
import { useSchoolProfile } from "@/context/SchoolProfileContext";
import { createAuthAccount } from "@/lib/create-user-auth";
import { AuthRequiredState } from "@/components/ui/auth-required-state";

function cleanFirestoreData<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return "" as any;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanFirestoreData) as any;
  }
  if (typeof obj === "object" && !(obj instanceof Date)) {
    const cleaned: any = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) {
        cleaned[k] = cleanFirestoreData(v);
      }
    }
    return cleaned;
  }
  return obj;
}

async function compressImageFileToBase64(file: File, maxWidth = 360, quality = 0.75): Promise<string> {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement("img");
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            let width = img.width || maxWidth;
            let height = img.height || maxWidth;
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const dataUrl = canvas.toDataURL("image/jpeg", quality);
              resolve(dataUrl);
              return;
            }
            resolve((e.target?.result as string) || "");
          } catch {
            resolve((e.target?.result as string) || "");
          }
        };
        img.onerror = () => resolve((e.target?.result as string) || "");
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    } catch {
      resolve("");
    }
  });
}

export default function StudentOnboardingPage() {
  const router = useRouter();
  const toast = useToast();
  const { profile, currentStage, stageConfig, gradeLevels, majorOptions } = useSchoolProfile();
  const currentSchoolName = profile?.schoolName || "Smart School OS";

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Auto Parent Account State
  const [createdParentAccount, setCreatedParentAccount] = useState<{
    email: string;
    passwordDefault: string;
    name: string;
    isExisting: boolean;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string>("");

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.showSuccess(`${label} berhasil disalin ke clipboard!`, "Tersalin");
    setTimeout(() => setCopiedField(""), 2500);
  };

  const getSchoolSlug = (schoolNameStr?: string) => {
    if (!schoolNameStr) return "smagaruda";
    const simplified = schoolNameStr
      .toLowerCase()
      .replace(/smart school/g, "")
      .replace(/operating system/g, "")
      .replace(/[^a-z0-9]/g, "")
      .trim();
    return simplified.slice(0, 10) || "sekolah";
  };

  const generateParentDefaultPassword = (parentFullName: string, schoolNameStr?: string) => {
    const cleanFirstName = (parentFullName.trim().split(" ")[0] || "ortu").toLowerCase().replace(/[^a-z0-9]/g, "");
    const schoolSlug = getSchoolSlug(schoolNameStr);
    const base = `${cleanFirstName}-${schoolSlug}`;
    return base.length >= 6 ? base : `${base}123`;
  };

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

  // Step 2: Data Akademik (Dynamically synced with School Profile)
  const [akademik, setAkademik] = useState({
    entryYear: "2025/2026",
    level: currentStage || "SMA",
    gradeLevel: gradeLevels[0] || (currentStage === "SD" ? "Kelas 1" : currentStage === "SMP" ? "Kelas 7" : "Kelas 10"),
    className: "",
    major: majorOptions[0]?.value || (currentStage === "SMK" ? "RPL" : currentStage === "SMA" ? "MIPA" : "Umum"),
    studentStatus: "Siswa Baru",
    previousSchool: "",
    previousStudentId: ""
  });

  // Real-time listener for classes from Firestore
  const [classesList, setClassesList] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, "classes"));
    const unsub = onSnapshot(q, (snapshot) => {
      const cls = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setClassesList(cls);
    }, (err) => {
      console.warn("Classes listener warning:", err);
    });
    return () => unsub();
  }, []);

  // Update default akademik state when profile or stage changes
  useEffect(() => {
    setAkademik(prev => {
      const stage = currentStage || "SMA";
      const defaultLvl = gradeLevels[0] || (stage === "SD" ? "Kelas 1" : stage === "SMP" ? "Kelas 7" : "Kelas 10");
      const defaultMaj = majorOptions[0]?.value || (stage === "SMK" ? "RPL" : stage === "SMA" ? "MIPA" : "Umum");
      return {
        ...prev,
        entryYear: prev.entryYear || "2025/2026",
        level: prev.level || stage,
        gradeLevel: prev.gradeLevel || defaultLvl,
        major: prev.major || defaultMaj,
      };
    });
  }, [currentStage, gradeLevels, majorOptions]);

  // Compute dynamic available classes matching current stage and selected level
  const availableClasses = useMemo(() => {
    const stage = akademik.level || currentStage;
    const activeClasses = classesList.filter(c => (c.status || "Aktif") !== "Nonaktif");
    
    // If real classes exist in Firestore, prioritize matching classes
    if (activeClasses.length > 0) {
      const selGrade = akademik.gradeLevel || gradeLevels[0] || "";
      const selGradeNum = selGrade.replace(/\D/g, "");

      const matching = activeClasses.filter(c => {
        const cLevel = String(c.level || "");
        const cName = String(c.name || "");
        return (
          (selGrade && cLevel === selGrade) ||
          (selGradeNum && (cLevel.includes(selGradeNum) || cName.startsWith(selGradeNum)))
        );
      });

      if (matching.length > 0) {
        return matching.map(c => c.name || c.id);
      }
      return activeClasses.map(c => c.name || c.id);
    }

    // Smart fallback generated classes based on stage & grade level
    const selGrade = akademik.gradeLevel || gradeLevels[0] || (stage === "SD" ? "Kelas 1" : stage === "SMP" ? "Kelas 7" : "Kelas 10");
    const lvlNum = selGrade.replace(/\D/g, "") || (stage === "SD" ? "1" : stage === "SMP" ? "7" : "10");

    if (stage === "SD" || currentStage === "SD") {
      return [`${lvlNum}A`, `${lvlNum}B`, `${lvlNum}C`, `${lvlNum} Unggulan`];
    }
    if (stage === "SMP" || currentStage === "SMP") {
      return [`${lvlNum}A`, `${lvlNum}B`, `${lvlNum}C`, `${lvlNum} Unggulan`];
    }
    if (stage === "SMK" || currentStage === "SMK") {
      const activeVoc = (profile.vocationalPrograms && profile.vocationalPrograms.length > 0)
        ? profile.vocationalPrograms.filter(p => p.status !== "Non-Aktif")
        : [{ code: "RPL" }, { code: "TKJ" }, { code: "DKV" }];
      
      const gen: string[] = [];
      activeVoc.forEach(p => {
        gen.push(`${lvlNum} ${p.code} 1`);
        gen.push(`${lvlNum} ${p.code} 2`);
      });
      return gen;
    }
    // SMA
    return [
      `${lvlNum} MIPA 1`,
      `${lvlNum} MIPA 2`,
      `${lvlNum} IPS 1`,
      `${lvlNum} IPS 2`,
      `${lvlNum} Bahasa 1`
    ];
  }, [classesList, akademik.level, akademik.gradeLevel, currentStage, gradeLevels, profile.vocationalPrograms]);

  // Keep selected className valid when availableClasses changes
  useEffect(() => {
    if (availableClasses.length > 0 && (!akademik.className || !availableClasses.includes(akademik.className))) {
      setAkademik(prev => ({ ...prev, className: availableClasses[0] }));
    }
  }, [availableClasses, akademik.className]);

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
            const role = uData.role || "";
            setCurrentUserRole(role);
            setPribadi(prev => ({
              ...prev,
              fullName: uData.fullName || uData.name || prev.fullName,
              email: uData.email || user.email || prev.email
            }));
            if (uData.onboardingCompleted && (role === "siswa" || role === "student")) {
              // Only redirect if it is a student who already completed onboarding
              router.push("/dashboard");
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

  // Final Submit Handler - 100% Robust, Persistent & Deduplicated
  const handleSubmitOnboarding = async () => {
    // 0. Ensure user is authenticated
    if (!currentUser && !auth.currentUser) {
      toast.showError(
        "Silakan masuk (login) atau daftar akun terlebih dahulu agar data onboarding dapat disimpan ke database.",
        "Autentikasi Diperlukan"
      );
      return;
    }

    const finalFullName = (pribadi.fullName || "").trim();
    if (!finalFullName) {
      toast.showError("Nama lengkap siswa wajib diisi.", "Validasi Formulir");
      setStep(1);
      return;
    }

    setSubmitting(true);

    try {
      // 1. Process Photo with local base64 fallback to prevent broken blob: URLs
      let finalPhotoUrl = pribadi.photoUrl || "";
      if (photoFile) {
        const base64Data = await compressImageFileToBase64(photoFile, 360, 0.75);
        if (base64Data) {
          finalPhotoUrl = base64Data;
        }
        try {
          const uploadedUrl = await uploadPhotoIfAny();
          if (uploadedUrl && !uploadedUrl.startsWith("blob:")) {
            finalPhotoUrl = uploadedUrl;
          }
        } catch (e) {
          console.warn("Storage upload fallback used base64:", e);
        }
      }

      const activeUser = currentUser || auth.currentUser;
      const isAdminOrStaff = ["super-admin", "admin", "guru"].includes(currentUserRole);
      const isSelfRegistration = !isAdminOrStaff && activeUser?.uid;

      // 2. Discover existing student records to prevent duplicates and update pre-created docs
      const nisnClean = (pribadi.nisn || "").trim();
      const studentEmail = (pribadi.email || (isSelfRegistration ? activeUser?.email : "") || "").trim().toLowerCase();
      
      const docIdsToUpdate = new Set<string>();
      if (isSelfRegistration && activeUser?.uid) {
        docIdsToUpdate.add(activeUser.uid);
      }

      // Query students collection by NISN
      if (nisnClean && nisnClean !== "-") {
        try {
          const qNisn = query(collection(db, "students"), where("nisn", "==", nisnClean));
          const snapNisn = await getDocs(qNisn);
          snapNisn.docs.forEach(d => docIdsToUpdate.add(d.id));

          const qId = query(collection(db, "students"), where("id", "==", nisnClean));
          const snapId = await getDocs(qId);
          snapId.docs.forEach(d => docIdsToUpdate.add(d.id));
        } catch (e) {}
      }

      // Query students collection by Email
      if (studentEmail) {
        try {
          const qEmail = query(collection(db, "students"), where("email", "==", studentEmail));
          const snapEmail = await getDocs(qEmail);
          snapEmail.docs.forEach(d => docIdsToUpdate.add(d.id));
        } catch (e) {}
      }

      // Primary Student ID
      const primaryStudentId = (isSelfRegistration && activeUser?.uid)
        ? activeUser.uid
        : (Array.from(docIdsToUpdate)[0] || nisnClean || `siswa_${Date.now()}`);

      docIdsToUpdate.add(primaryStudentId);

      // 3. Construct Complete & Rich Unified Student Payload
      const resolvedClass = (akademik.className || availableClasses[0] || "Kelas 10").trim();
      const resolvedMajor = akademik.major || majorOptions[0]?.value || (currentStage === "SMK" ? "RPL" : currentStage === "SMA" ? "MIPA" : "Umum");

      const unifiedStudentPayload = cleanFirestoreData({
        uid: (isSelfRegistration && activeUser?.uid) ? activeUser.uid : primaryStudentId,
        id: nisnClean || primaryStudentId,
        nisn: nisnClean || `NISN-${Date.now().toString().slice(-6)}`,
        nis: (akademik.previousStudentId || "").trim() || nisnClean || `NIS-${Date.now().toString().slice(-6)}`,
        name: finalFullName,
        fullName: finalFullName,
        nickname: (pribadi.nickname || "").trim(),
        gender: pribadi.gender || "Laki-laki",
        birthPlace: (pribadi.birthPlace || "").trim(),
        birthDate: pribadi.birthDate || "",
        religion: pribadi.religion || "Islam",
        nik: (pribadi.nik || "").trim(),
        address: (pribadi.address || "").trim(),
        phone: (pribadi.phone || "").trim(),
        email: studentEmail || `${nisnClean || primaryStudentId}@quickschools.sch.id`,
        photoUrl: finalPhotoUrl,
        imageUrl: finalPhotoUrl,
        pasFoto: finalPhotoUrl,

        // Academic Data (Strictly synchronized with School Profile)
        entryYear: akademik.entryYear || "2025/2026",
        level: akademik.level || currentStage,
        gradeLevel: akademik.gradeLevel || gradeLevels[0] || "Kelas 10",
        educationalStage: currentStage,
        classId: resolvedClass,
        className: resolvedClass,
        class: resolvedClass,
        kelas: resolvedClass,
        major: resolvedMajor,
        studentStatus: akademik.studentStatus || "Siswa Baru",
        previousSchool: (akademik.previousSchool || "").trim(),
        previousStudentId: (akademik.previousStudentId || "").trim(),

        // Parents Data
        fatherName: (orangTua.fatherName || "").trim(),
        motherName: (orangTua.motherName || "").trim(),
        guardianName: (orangTua.guardianName || "").trim(),
        relation: orangTua.relation || "Ayah",
        parentPhone: (orangTua.parentPhone || "").trim(),
        parentEmail: (orangTua.parentEmail || "").trim(),
        parentAddress: (orangTua.parentAddress || "").trim(),
        parentJob: (orangTua.parentJob || "").trim(),
        parentIncome: orangTua.parentIncome || "< 5 Juta",

        // Emergency Contact
        emergencyName: (darurat.contactName || "").trim(),
        emergencyRelation: darurat.relation || "",
        emergencyPhone: (darurat.contactPhone || "").trim(),
        emergencyAddress: (darurat.contactAddress || "").trim(),

        // Status & Metadata
        role: "siswa",
        status: "Aktif",
        onboardingCompleted: true,
        pendingOnboardingReminder: false,
        hasPendingReminder: false,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      // 4. Save to `students` collection across all matching document IDs (eliminates orphaned pending records)
      for (const sId of docIdsToUpdate) {
        try {
          await setDoc(doc(db, "students", sId), unifiedStudentPayload, { merge: true });
        } catch (errStudents) {
          console.warn(`Could not save student doc ${sId}:`, errStudents);
        }
      }

      // 5. Save to `users` collection for authenticated user
      if (activeUser?.uid) {
        await setDoc(doc(db, "users", activeUser.uid), unifiedStudentPayload, { merge: true });
      }
      if (primaryStudentId !== activeUser?.uid) {
        try {
          await setDoc(doc(db, "users", primaryStudentId), unifiedStudentPayload, { merge: true });
        } catch (e) {}
      }

      // 6. PARENT RECORD CREATION (Guaranteed for `parents` and optionally `users`)
      const parentEmailInput = (orangTua.parentEmail || "").trim().toLowerCase();
      const bestParentName = (
        orangTua.fatherName ||
        orangTua.motherName ||
        orangTua.guardianName ||
        `${finalFullName} (Orang Tua)`
      ).trim();

      if (bestParentName) {
        let parentDocId = "";
        let defaultPassword = "";
        let isExisting = false;

        if (parentEmailInput) {
          defaultPassword = generateParentDefaultPassword(bestParentName, currentSchoolName);
          try {
            const authRes = await createAuthAccount(parentEmailInput, defaultPassword, bestParentName);
            parentDocId = authRes.uid;
          } catch (authErr: any) {
            if (
              authErr?.code === "auth/email-already-in-use" ||
              (authErr?.message && authErr.message.includes("sudah terdaftar"))
            ) {
              isExisting = true;
              try {
                const userQuery = query(collection(db, "users"), where("email", "==", parentEmailInput));
                const snap = await getDocs(userQuery);
                if (!snap.empty) {
                  parentDocId = snap.docs[0].id;
                }
              } catch (qErr) {}
            }
          }
        }

        if (!parentDocId) {
          parentDocId = `parent_${primaryStudentId}`;
        }

        const parentRelationFormatted =
          orangTua.relation === "Ibu"
            ? "Ibu Kandung"
            : orangTua.relation === "Wali"
            ? "Wali Murid"
            : "Ayah Kandung";

        const parentPayload = cleanFirestoreData({
          uid: parentDocId,
          id: parentDocId,
          parentId: `PRT-${parentDocId.slice(0, 5).toUpperCase()}`,
          name: bestParentName,
          fullName: bestParentName,
          email: parentEmailInput,
          phone: (orangTua.parentPhone || "").trim(),
          role: "orang-tua",
          status: "Aktif",
          relationship: parentRelationFormatted,
          relation: parentRelationFormatted,
          fatherName: (orangTua.fatherName || "").trim(),
          motherName: (orangTua.motherName || "").trim(),
          guardianName: (orangTua.guardianName || "").trim(),
          job: (orangTua.parentJob || "").trim(),
          parentJob: (orangTua.parentJob || "").trim(),
          income: orangTua.parentIncome || "< 5 Juta",
          parentIncome: orangTua.parentIncome || "< 5 Juta",
          address: (orangTua.parentAddress || "").trim(),
          parentAddress: (orangTua.parentAddress || "").trim(),
          emergencyName: (darurat.contactName || "").trim(),
          emergencyRelation: darurat.relation || "",
          emergencyPhone: (darurat.contactPhone || "").trim(),
          studentIds: arrayUnion(primaryStudentId, ...Array.from(docIdsToUpdate)),
          linkedStudentIds: arrayUnion(primaryStudentId, ...Array.from(docIdsToUpdate)),
          studentId: primaryStudentId,
          source: "student_onboarding",
          passwordHint: defaultPassword || undefined,
          updatedAt: new Date().toISOString(),
          ...(!isExisting ? { createdAt: new Date().toISOString() } : {})
        });

        // Always save to `parents` collection so parents appear in /parents
        try {
          await setDoc(doc(db, "parents", parentDocId), parentPayload, { merge: true });
        } catch (pErr) {
          console.warn("Could not save to parents collection:", pErr);
        }

        // Save to `users` collection if email account is created
        if (parentEmailInput) {
          try {
            await setDoc(doc(db, "users", parentDocId), parentPayload, { merge: true });
          } catch (uErr) {
            console.warn("Could not save to users collection for parent:", uErr);
          }
          setCreatedParentAccount({
            email: parentEmailInput,
            passwordDefault: defaultPassword,
            name: bestParentName,
            isExisting: isExisting
          });
        }
      }

      // 7. Save to LocalStorage immediately for instant local hydration
      try {
        localStorage.setItem("quick_schools_student_profile", JSON.stringify(unifiedStudentPayload));
        localStorage.setItem("onboarding_completed", "true");
      } catch (errLocal) {
        console.warn("LocalStorage save warning:", errLocal);
      }

      setSubmitting(false);
      setStep(6); // Selesai
      toast.showSuccess(
        `Data profil siswa ${finalFullName} berhasil disimpan lengkap ke database!`,
        "Registrasi Selesai"
      );
    } catch (err: any) {
      console.error("Error submitting onboarding data:", err);
      setSubmitting(false);
      toast.showError(
        err?.message ? `Gagal menyimpan data: ${err.message}` : "Gagal menyimpan data ke database. Silakan coba lagi.",
        "Penyimpanan Gagal"
      );
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

  // Auth Required Guard: Show Empty State if not authenticated
  if (!currentUser) {
    return (
      <AuthRequiredState
        pageName="Onboarding Siswa"
        title="Pendaftaran Memerlukan Autentikasi"
        description="Untuk memulai proses pengisian formulir Onboarding dan kelengkapan data akademik siswa, silakan masuk (login) terlebih dahulu menggunakan akun terdaftar atau daftarkan akun baru."
        loginHref="/login?redirect=/onboarding"
        homeHref="/"
        showRegisterLink={true}
      />
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
            {currentUser ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-lg text-xs font-bold shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Sesi: {currentUser.email?.split("@")[0] || "Terverifikasi"}
              </span>
            ) : (
              <a
                href="/login?redirect=/onboarding"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200/80 rounded-lg text-xs font-bold shadow-2xs hover:bg-amber-100 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Masuk Akun
              </a>
            )}
          </div>
        </div>

        {/* STEP 0: WELCOME SCREEN HERO */}
        {step === 0 && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-14 shadow-xs text-center space-y-10 animate-in fade-in duration-300 relative overflow-hidden">
            {/* Ambient background decoration */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#531FFF]/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

            {!currentUser && (
              <div className="max-w-xl mx-auto p-3.5 bg-amber-50 border border-amber-200/90 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-900 text-left relative z-20">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
                  <span className="font-medium">Anda belum masuk. Silakan login atau buat akun terlebih dahulu agar data pendaftaran tersimpan permanen.</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a href="/login?redirect=/onboarding" className="px-3 py-1.5 bg-white border border-amber-300 rounded-lg font-bold text-amber-900 hover:bg-amber-100 text-[11px]">
                    Masuk
                  </a>
                  <a href="/register?redirect=/onboarding" className="px-3 py-1.5 bg-[#531FFF] text-white rounded-lg font-bold hover:bg-[#4314cc] text-[11px]">
                    Daftar
                  </a>
                </div>
              </div>
            )}

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
                    <p className="text-[11px] text-[#531FFF] font-bold mt-1 inline-block bg-purple-500/20 px-2 py-0.5 rounded truncate max-w-full">
                      {akademik.className || "Kelas Rombel"} • {akademik.major || (currentStage === "SD" || currentStage === "SMP" ? "Tematik" : "Umum")}
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
                      <option value="2024/2025">2024/2025</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center justify-between">
                      <span>Jenjang Satuan Pendidikan *</span>
                      <span className="text-[10px] font-bold text-[#531FFF] bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        {stageConfig.name} Aktif
                      </span>
                    </label>
                    <select
                      value={akademik.level}
                      onChange={(e) => setAkademik({ ...akademik, level: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                    >
                      <option value="SD">SD (Sekolah Dasar)</option>
                      <option value="SMP">SMP (Sekolah Menengah Pertama)</option>
                      <option value="SMA">SMA (Sekolah Menengah Atas)</option>
                      <option value="SMK">SMK (Sekolah Menengah Kejuruan)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label>Tingkat / Tingkatan Kelas *</label>
                    <select
                      value={akademik.gradeLevel}
                      onChange={(e) => setAkademik({ ...akademik, gradeLevel: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                    >
                      {gradeLevels.map((lvl) => (
                        <option key={lvl} value={lvl}>{lvl}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label>Pilihan Kelas (Rombel) *</label>
                    <select
                      value={akademik.className}
                      onChange={(e) => setAkademik({ ...akademik, className: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                    >
                      {availableClasses.map((cls: string) => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                  </div>

                  {/* Dynamic Major Selection based on Active Stage */}
                  {(akademik.level === "SMK" || currentStage === "SMK") ? (
                    <div className="space-y-1.5 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-amber-600" />
                          Program Keahlian (Jurusan SMK) *
                        </label>
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {(profile.vocationalPrograms || []).length} Jurusan Tersedia
                        </span>
                      </div>
                      <select
                        value={akademik.major}
                        onChange={(e) => setAkademik({ ...akademik, major: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-white border border-amber-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                      >
                        {majorOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label} {opt.field ? `(${opt.field})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (akademik.level === "SMA" || currentStage === "SMA") ? (
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                        Peminatan Akademik (SMA) *
                      </label>
                      <select
                        value={akademik.major}
                        onChange={(e) => setAkademik({ ...akademik, major: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                      >
                        {majorOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="sm:col-span-2 p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 flex items-center justify-between">
                      <div>
                        <span className="font-extrabold text-emerald-900 text-xs block flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Model Kelas Reguler Terpadu ({stageConfig.name})
                        </span>
                        <span className="text-[11px] text-emerald-700">
                          Jenjang {stageConfig.name} tidak menerapkan penjurusan kejuruan. Siswa ditempatkan pada kelas rombel terpadu.
                        </span>
                      </div>
                      <span className="px-2 py-0.5 bg-white text-emerald-800 text-[10px] font-bold rounded border border-emerald-200 shrink-0">
                        Reguler
                      </span>
                    </div>
                  )}

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
                      placeholder={currentStage === "SD" ? "Nama TK / PAUD Asal" : currentStage === "SMP" ? "Nama SD / MI Asal" : "Nama SMP / MTs Asal"}
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
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" /> Email Orang Tua / Wali *
                      </label>
                      <span className="text-[10px] font-bold text-[#531FFF] bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Auto Akun Login
                      </span>
                    </div>
                    <input
                      type="email"
                      value={orangTua.parentEmail}
                      onChange={(e) => setOrangTua({ ...orangTua, parentEmail: e.target.value })}
                      placeholder="email.orangtua@gmail.com"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
                      required
                    />
                    <p className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                      Akun login ortu otomatis dibuat di Manajemen Akun. Password: <span className="font-mono font-bold text-[#531FFF]">[nama depan]-[nama sekolah]</span>
                    </p>
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
                        <p><span className="text-slate-500 font-medium">Kelas / Jenjang:</span> <span className="font-bold text-slate-900 block">{akademik.className} (Jenjang {akademik.level} • {akademik.gradeLevel})</span></p>
                        <p><span className="text-slate-500 font-medium">Jurusan:</span> <span className="font-bold text-slate-900 block">{akademik.major || "Umum / Reguler"}</span></p>
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

            {/* AUTOMATIC PARENT ACCOUNT DETAILS CARD */}
            {createdParentAccount && (
              <div className="p-5 bg-gradient-to-br from-purple-50/80 via-white to-purple-50/40 rounded-2xl border border-purple-200 text-left space-y-3.5 max-w-lg mx-auto shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-purple-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#531FFF] text-white flex items-center justify-center shrink-0">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900">
                        {createdParentAccount.isExisting
                          ? "Akun Portal Orang Tua Telah Ditautkan!"
                          : "Akun Portal Orang Tua Berhasil Dibuat!"}
                      </h4>
                      <p className="text-[10px] text-purple-700 font-medium">
                        Terdaftar di Manajemen Akun System (Role: Orang Tua)
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Langsung Aktif
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Orang tua / wali murid (<strong>{createdParentAccount.name}</strong>) dapat langsung masuk ke portal wali murid menggunakan kredensial berikut:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Email Login</span>
                      <span className="font-bold text-slate-800 break-all text-[11px]">{createdParentAccount.email}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(createdParentAccount.email, "Email Login")}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-[#531FFF] transition-colors cursor-pointer shrink-0 ml-1"
                      title="Salin Email"
                    >
                      {copiedField === "Email Login" ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Password Default</span>
                      <span className="font-mono font-bold text-[#531FFF] text-[11px]">{createdParentAccount.passwordDefault}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(createdParentAccount.passwordDefault, "Password Default")}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-[#531FFF] transition-colors cursor-pointer shrink-0 ml-1"
                      title="Salin Password"
                    >
                      {copiedField === "Password Default" ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 italic leading-relaxed">
                  * Format kata sandi: [nama depan ortu]-[nama sekolah]. Orang tua dapat mengganti kata sandi kapan saja di menu profil setelah berhasil masuk.
                </p>
              </div>
            )}

            <div className="pt-4">
              <button
                onClick={() => router.push("/dashboard")}
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
