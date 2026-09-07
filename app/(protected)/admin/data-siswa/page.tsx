"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { 
  User, 
  Download, 
  MoreHorizontal, 
  TrendingUp, 
  Search, 
  ChevronDown, 
  LayoutGrid, 
  List,
  Edit2,
  Trash2,
  Loader2,
  X,
  Filter,
  RefreshCw,
  Users,
  GraduationCap,
  CheckCircle2,
  XCircle,
  Plus,
  Eye,
  Bell,
  Send,
  AlertTriangle,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CrudSheet } from "@/components/layouts/crud-sheet";
import { useToast } from "@/context/ToastContext";
import { db, auth, storage } from "@/lib/firebase";
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function DataSiswaPage() {
  const toast = useToast();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);

  // Refs to hold active raw collections from Firestore
  const rawStudentsRef = useRef<any[]>([]);
  const rawUsersRef = useRef<any[]>([]);

  // Count unboarded students
  const unboardedCount = useMemo(() => {
    return students.filter(
      (s) => (s.status || "") === "Belum Onboarding" || s.onboardingCompleted === false
    ).length;
  }, [students]);

  const handleCleanUnboardedStudents = async () => {
    try {
      setCleaning(true);
      const unboarded = students.filter(
        (s) => (s.status || "") === "Belum Onboarding" || s.onboardingCompleted === false
      );

      if (unboarded.length === 0) {
        toast.showInfo("Tidak ada data siswa dengan status Belum Onboarding.", "Informasi");
        setCleaning(false);
        return;
      }

      let count = 0;
      for (const student of unboarded) {
        const allDocIdsToDelete = new Set<string>();
        if (student._firestoreId) allDocIdsToDelete.add(student._firestoreId);
        if (student.uid) allDocIdsToDelete.add(student.uid);
        if (student._allDocIds && Array.isArray(student._allDocIds)) {
          student._allDocIds.forEach((id: string) => allDocIdsToDelete.add(id));
        }

        const targetEmail = (student.email || "").toLowerCase();
        const targetId = student.id || student.nis || student.nisn;

        rawStudentsRef.current.forEach((s) => {
          if (
            (targetEmail && s.email?.toLowerCase() === targetEmail) ||
            (student.uid && (s.uid === student.uid || s._firestoreId === student.uid)) ||
            (targetId && targetId !== "-" && (s.id === targetId || s.nis === targetId || s.nisn === targetId))
          ) {
            if (s._firestoreId) allDocIdsToDelete.add(s._firestoreId);
          }
        });

        rawUsersRef.current.forEach((u) => {
          if (
            (targetEmail && u.email?.toLowerCase() === targetEmail) ||
            (student.uid && (u.uid === student.uid || u._firestoreId === student.uid)) ||
            (targetId && targetId !== "-" && (u.id === targetId || u.nis === targetId || u.nisn === targetId))
          ) {
            if (u._firestoreId) allDocIdsToDelete.add(u._firestoreId);
          }
        });

        for (const docId of Array.from(allDocIdsToDelete)) {
          try {
            await deleteDoc(doc(db, "students", docId));
          } catch (e) {}
          try {
            await deleteDoc(doc(db, "users", docId));
          } catch (e) {}
        }
        count++;
      }

      // Optimistically update UI
      setStudents(prev => prev.filter(s => (s.status || "") !== "Belum Onboarding" && s.onboardingCompleted !== false));
      toast.showSuccess(`Berhasil menghapus ${count} data siswa yang Belum Onboarding.`, "Berhasil Hapus");
    } catch (err: any) {
      console.error("Clean error:", err);
      toast.showError("Gagal membersihkan data siswa.", "Gagal");
    } finally {
      setCleaning(false);
    }
  };

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");

  const [crudState, setCrudState] = useState<{ open: boolean; mode: "create" | "edit" | "delete" | "view"; data?: any }>({
    open: false,
    mode: "create"
  });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const qStudents = query(collection(db, "students"));
        const qUsers = query(collection(db, "users"));

        const updateCombinedList = () => {
          const studentMap = new Map<string, any>();

          // 1. Process items from `students` collection
          rawStudentsRef.current.forEach(item => {
            const key = item.uid || item.email?.toLowerCase() || item._firestoreId;
            const isUnboarded = item.status === "Belum Onboarding" || item.onboardingCompleted === false;
            
            studentMap.set(key, {
              ...item,
              _firestoreId: item._firestoreId,
              _allDocIds: [item._firestoreId],
              uid: item.uid || item._firestoreId,
              id: item.nisn || item.nis || item.id || "-",
              nis: item.nis || item.id || "-",
              nisn: item.nisn || item.id || "-",
              name: item.fullName || item.name || "",
              fullName: item.fullName || item.name || "",
              nickname: item.nickname || "",
              email: item.email || "",
              gender: item.gender || "Laki-laki",
              birthPlace: item.birthPlace || "",
              birthDate: item.birthDate || "",
              religion: item.religion || "Islam",
              nik: item.nik || "",
              address: item.address || "",
              phone: item.phone || "-",
              classId: item.classId || item.className || "10 IPA 1",
              className: item.className || item.classId || "10 IPA 1",
              major: item.major || "MIPA",
              entryYear: item.entryYear || "2025/2026",
              level: item.level || "SMA",
              studentStatus: item.studentStatus || "Siswa Baru",
              previousSchool: item.previousSchool || "",
              fatherName: item.fatherName || "",
              motherName: item.motherName || "",
              guardianName: item.guardianName || "",
              parentPhone: item.parentPhone || "",
              parentJob: item.parentJob || "",
              parentIncome: item.parentIncome || "",
              parentAddress: item.parentAddress || "",
              emergencyName: item.emergencyName || "",
              emergencyPhone: item.emergencyPhone || "",
              emergencyRelation: item.emergencyRelation || "",
              status: isUnboarded ? "Belum Onboarding" : (item.status || "Aktif"),
              onboardingCompleted: !isUnboarded,
              imageUrl: item.imageUrl || item.photoUrl || "",
              photoUrl: item.photoUrl || item.imageUrl || "",
              pendingOnboardingReminder: item.pendingOnboardingReminder || false,
              reminderSentAt: item.reminderSentAt || null
            });
          });

          // 2. Merge items from `users` collection where role is "siswa" or "student"
          rawUsersRef.current.forEach(u => {
            const role = (u.role || "").toLowerCase();
            if (role === "siswa" || role === "student") {
              const uEmail = (u.email || "").toLowerCase();
              const uUid = u.uid || u._firestoreId;
              const isUnboarded = u.onboardingCompleted === false || u.status === "Belum Onboarding";

              let existingKey: string | undefined;
              for (const [k, v] of studentMap.entries()) {
                if (
                  (uUid && (k === uUid || v.uid === uUid || v._firestoreId === uUid)) ||
                  (uEmail && v.email?.toLowerCase() === uEmail)
                ) {
                  existingKey = k;
                  break;
                }
              }

              if (existingKey) {
                const existing = studentMap.get(existingKey)!;
                if (!existing._allDocIds.includes(u._firestoreId)) {
                  existing._allDocIds.push(u._firestoreId);
                }
                // Merge fields from user profile if missing
                Object.keys(u).forEach(k => {
                  if ((existing[k] === undefined || existing[k] === "" || existing[k] === "-") && u[k]) {
                    existing[k] = u[k];
                  }
                });
                if (!existing.name || existing.name === "Siswa Baru") existing.name = u.fullName || u.name || existing.name;
                if (!existing.email) existing.email = u.email || "";
                if (!existing.imageUrl && (u.imageUrl || u.photoUrl)) existing.imageUrl = u.imageUrl || u.photoUrl;
                if (u.pendingOnboardingReminder) existing.pendingOnboardingReminder = true;
                if (u.reminderSentAt) existing.reminderSentAt = u.reminderSentAt;
              } else {
                const newKey = uUid || uEmail || u._firestoreId;
                studentMap.set(newKey, {
                  ...u,
                  _firestoreId: u._firestoreId,
                  _allDocIds: [u._firestoreId],
                  uid: uUid,
                  id: u.nisn || u.nis || u.id || "-",
                  nis: u.nis || "-",
                  nisn: u.nisn || "-",
                  name: u.fullName || u.name || u.email?.split('@')[0] || "Siswa Baru",
                  fullName: u.fullName || u.name || "",
                  nickname: u.nickname || "",
                  email: u.email || "",
                  gender: u.gender || "Laki-laki",
                  birthPlace: u.birthPlace || "",
                  birthDate: u.birthDate || "",
                  religion: u.religion || "Islam",
                  nik: u.nik || "",
                  address: u.address || "",
                  phone: u.phone || "-",
                  classId: u.classId || u.className || "10 IPA 1",
                  className: u.className || u.classId || "10 IPA 1",
                  major: u.major || "MIPA",
                  entryYear: u.entryYear || "2025/2026",
                  level: u.level || "SMA",
                  studentStatus: u.studentStatus || "Siswa Baru",
                  previousSchool: u.previousSchool || "",
                  fatherName: u.fatherName || "",
                  motherName: u.motherName || "",
                  guardianName: u.guardianName || "",
                  parentPhone: u.parentPhone || "",
                  parentJob: u.parentJob || "",
                  parentIncome: u.parentIncome || "",
                  parentAddress: u.parentAddress || "",
                  emergencyName: u.emergencyName || "",
                  emergencyPhone: u.emergencyPhone || "",
                  emergencyRelation: u.emergencyRelation || "",
                  status: isUnboarded ? "Belum Onboarding" : (u.status || "Aktif"),
                  onboardingCompleted: !isUnboarded,
                  grade: u.grade || "X",
                  photoUrl: u.photoUrl || u.imageUrl || "",
                  imageUrl: u.photoUrl || u.imageUrl || "",
                  pendingOnboardingReminder: u.pendingOnboardingReminder || false,
                  reminderSentAt: u.reminderSentAt || null
                });
              }
            }
          });

          setStudents(Array.from(studentMap.values()));
          setLoading(false);
        };

        const unsubscribeStudents = onSnapshot(qStudents, (snapshot) => {
          rawStudentsRef.current = snapshot.docs.map(doc => ({
            _firestoreId: doc.id,
            ...doc.data()
          }));
          updateCombinedList();
        }, (error) => {
          console.error("Error fetching students:", error);
          setLoading(false);
        });

        const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
          rawUsersRef.current = snapshot.docs.map(doc => ({
            _firestoreId: doc.id,
            ...doc.data()
          }));
          updateCombinedList();
        }, (error) => {
          console.error("Error fetching users:", error);
        });

        const qClasses = query(collection(db, "classes"));
        const unsubscribeClasses = onSnapshot(qClasses, (snapshot) => {
          const classesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setClasses(classesData);
        }, (error) => {
          console.error("Error fetching classes:", error);
        });
        
        return () => {
          unsubscribeStudents();
          unsubscribeUsers();
          unsubscribeClasses();
        };
      } else {
        setStudents([]);
        setClasses([]);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Send Onboarding Reminder to a specific student
  const handleSendReminder = async (student: any) => {
    try {
      const targetIds = Array.from(new Set([
        student._firestoreId,
        student.uid,
        ...(student._allDocIds || [])
      ].filter(Boolean)));

      const now = new Date().toISOString();
      for (const tId of targetIds) {
        try {
          await updateDoc(doc(db, "users", tId as string), {
            pendingOnboardingReminder: true,
            reminderSentAt: now
          });
        } catch (e) {}
        try {
          await updateDoc(doc(db, "students", tId as string), {
            pendingOnboardingReminder: true,
            reminderSentAt: now
          });
        } catch (e) {}
      }

      setStudents(prev => prev.map(s => {
        if (s._firestoreId === student._firestoreId || s.uid === student.uid) {
          return { ...s, pendingOnboardingReminder: true, reminderSentAt: now };
        }
        return s;
      }));

      toast.showSuccess(`Pengingat onboarding berhasil dikirim ke siswa ${student.name || student.email}.`, "Pengingat Terkirim");
    } catch (err: any) {
      console.error("Reminder error:", err);
      toast.showError("Gagal mengirim pengingat onboarding.", "Gagal");
    }
  };

  // Send Onboarding Reminder to ALL unboarded students
  const handleSendBulkReminders = async () => {
    const unboarded = students.filter(
      s => (s.status || "") === "Belum Onboarding" || s.onboardingCompleted === false
    );

    if (unboarded.length === 0) {
      toast.showInfo("Semua siswa telah menyelesaikan onboarding.", "Informasi");
      return;
    }

    try {
      const now = new Date().toISOString();
      let sentCount = 0;

      for (const student of unboarded) {
        const targetIds = Array.from(new Set([
          student._firestoreId,
          student.uid,
          ...(student._allDocIds || [])
        ].filter(Boolean)));

        for (const tId of targetIds) {
          try {
            await updateDoc(doc(db, "users", tId as string), {
              pendingOnboardingReminder: true,
              reminderSentAt: now
            });
          } catch (e) {}
          try {
            await updateDoc(doc(db, "students", tId as string), {
              pendingOnboardingReminder: true,
              reminderSentAt: now
            });
          } catch (e) {}
        }
        sentCount++;
      }

      setStudents(prev => prev.map(s => {
        if ((s.status || "") === "Belum Onboarding" || s.onboardingCompleted === false) {
          return { ...s, pendingOnboardingReminder: true, reminderSentAt: now };
        }
        return s;
      }));

      toast.showSuccess(`Berhasil mengirimkan pengingat onboarding ke ${sentCount} akun siswa!`, "Pengingat Terkirim");
    } catch (err: any) {
      console.error("Bulk reminder error:", err);
      toast.showError("Gagal mengirim pengingat onboarding massal.", "Gagal");
    }
  };

  const studentFields: CrudField[] = [
    // --- BIODATA PRIBADI ---
    { name: "name", label: "Nama Lengkap", category: "pribadi", colSpan: 2 },
    { name: "nickname", label: "Nama Panggilan", category: "pribadi" },
    { name: "id", label: "NISN / NIS", category: "pribadi" },
    { 
      name: "gender", 
      label: "Jenis Kelamin",
      category: "pribadi",
      type: "select",
      options: [
        { label: "Laki-laki", value: "Laki-laki" },
        { label: "Perempuan", value: "Perempuan" }
      ]
    },
    { name: "birthPlace", label: "Tempat Lahir", category: "pribadi" },
    { name: "birthDate", label: "Tanggal Lahir", category: "pribadi" },
    { 
      name: "religion", 
      label: "Agama",
      category: "pribadi",
      type: "select",
      options: [
        { label: "Islam", value: "Islam" },
        { label: "Kristen", value: "Kristen" },
        { label: "Katolik", value: "Katolik" },
        { label: "Hindu", value: "Hindu" },
        { label: "Buddha", value: "Buddha" },
        { label: "Konghucu", value: "Konghucu" }
      ]
    },
    { name: "nik", label: "Nomor Induk Kependudukan (NIK)", category: "pribadi" },
    { name: "email", label: "Email Siswa", category: "pribadi" },
    { name: "phone", label: "Nomor WhatsApp / HP", category: "pribadi" },
    { name: "address", label: "Alamat Tempat Tinggal", category: "pribadi", colSpan: 2 },

    // --- DATA AKADEMIK ---
    { 
      name: "classId", 
      label: "Kelas",
      category: "akademik",
      type: "select",
      placeholder: "Pilih Kelas",
      options: classes.length > 0 
        ? classes.map(c => ({ label: c.name || c.id, value: c.name || c.id }))
        : [
            { label: "10 IPA 1", value: "10 IPA 1" },
            { label: "10 IPA 2", value: "10 IPA 2" },
            { label: "10 IPS 1", value: "10 IPS 1" },
            { label: "11 MIPA 1", value: "11 MIPA 1" },
            { label: "12 MIPA 1", value: "12 MIPA 1" }
          ]
    },
    { 
      name: "major", 
      label: "Jurusan / Peminatan",
      category: "akademik",
      type: "select",
      options: [
        { label: "MIPA", value: "MIPA" },
        { label: "IPS", value: "IPS" },
        { label: "Bahasa", value: "Bahasa" }
      ]
    },
    { name: "entryYear", label: "Tahun Masuk", category: "akademik" },
    { 
      name: "level", 
      label: "Jenjang Pendidikan",
      category: "akademik",
      type: "select",
      options: [
        { label: "SMA", value: "SMA" },
        { label: "SMP", value: "SMP" },
        { label: "SD", value: "SD" }
      ]
    },
    { 
      name: "studentStatus", 
      label: "Status Masuk",
      category: "akademik",
      type: "select",
      options: [
        { label: "Siswa Baru", value: "Siswa Baru" },
        { label: "Pindahan", value: "Pindahan" }
      ]
    },
    { name: "previousSchool", label: "Asal Sekolah Sebelumnya", category: "akademik", colSpan: 2 },

    // --- DATA ORANG TUA & WALI ---
    { name: "fatherName", label: "Nama Ayah Kandung", category: "orangTua" },
    { name: "motherName", label: "Nama Ibu Kandung", category: "orangTua" },
    { name: "guardianName", label: "Nama Wali (Opsional)", category: "orangTua" },
    { name: "parentPhone", label: "No. HP Orang Tua / Wali", category: "orangTua" },
    { name: "parentJob", label: "Pekerjaan Orang Tua", category: "orangTua" },
    { name: "parentIncome", label: "Penghasilan Orang Tua", category: "orangTua" },
    { name: "parentAddress", label: "Alamat Orang Tua", category: "orangTua", colSpan: 2 },

    // --- KONTAK DARURAT & STATUS ---
    { name: "emergencyName", label: "Nama Kontak Darurat", category: "darurat" },
    { name: "emergencyPhone", label: "No. HP Kontak Darurat", category: "darurat" },
    { name: "emergencyRelation", label: "Hubungan Kontak Darurat", category: "darurat" },
    { 
      name: "status", 
      label: "Status Siswa",
      category: "darurat",
      type: "select",
      placeholder: "Pilih Status",
      options: [
        { label: "Aktif", value: "Aktif" },
        { label: "Belum Onboarding", value: "Belum Onboarding" },
        { label: "Nonaktif", value: "Nonaktif" }
      ]
    },
    {
      name: "pasFoto",
      label: "Pas Foto Siswa",
      category: "pribadi",
      type: "file",
      colSpan: 2
    }
  ];

  const handleCrudSubmit = async (data: any) => {
    try {
      let imageUrl = data.imageUrl || `https://images.unsplash.com/photo-${[
        "1539571696357-5a69c17a67c6",
        "1517841905240-472988babdf9",
        "1506794778202-cad84cf45f1d",
        "1534528741775-53994a69daeb"
      ][Math.floor(Math.random() * 4)]}?q=80&w=250&auto=format&fit=crop`;

      if (data.pasFoto instanceof File) {
        const fileRef = ref(storage, `students/${Date.now()}_${data.pasFoto.name}`);
        const snapshot = await uploadBytes(fileRef, data.pasFoto);
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      if (crudState.mode === "create") {
        const newStudentData = {
          id: data.id || data.nisn || `SISWA-${Date.now().toString().slice(-6)}`,
          nis: data.id || data.nisn || "",
          nisn: data.nisn || data.id || "",
          name: data.name || "",
          fullName: data.name || "",
          nickname: data.nickname || "",
          gender: data.gender || "Laki-laki",
          birthPlace: data.birthPlace || "",
          birthDate: data.birthDate || "",
          religion: data.religion || "Islam",
          nik: data.nik || "",
          address: data.address || "",
          phone: data.phone || "",
          email: data.email || "",
          classId: data.classId || "10 IPA 1",
          className: data.classId || "10 IPA 1",
          major: data.major || "MIPA",
          entryYear: data.entryYear || "2025/2026",
          level: data.level || "SMA",
          studentStatus: data.studentStatus || "Siswa Baru",
          previousSchool: data.previousSchool || "",
          fatherName: data.fatherName || "",
          motherName: data.motherName || "",
          guardianName: data.guardianName || "",
          parentPhone: data.parentPhone || "",
          parentJob: data.parentJob || "",
          parentIncome: data.parentIncome || "",
          parentAddress: data.parentAddress || "",
          emergencyName: data.emergencyName || "",
          emergencyPhone: data.emergencyPhone || "",
          emergencyRelation: data.emergencyRelation || "",
          status: data.status || "Aktif",
          onboardingCompleted: data.status !== "Belum Onboarding",
          imageUrl: imageUrl,
          photoUrl: imageUrl,
          role: "siswa",
          createdAt: new Date().toISOString()
        };

        await addDoc(collection(db, "students"), newStudentData);
      } else if (crudState.mode === "edit" && data._firestoreId) {
        const payload = {
          id: data.id || data.nisn || "",
          nis: data.id || data.nisn || "",
          nisn: data.nisn || data.id || "",
          name: data.name || "",
          fullName: data.name || "",
          nickname: data.nickname || "",
          gender: data.gender || "Laki-laki",
          birthPlace: data.birthPlace || "",
          birthDate: data.birthDate || "",
          religion: data.religion || "Islam",
          nik: data.nik || "",
          address: data.address || "",
          phone: data.phone || "",
          email: data.email || "",
          classId: data.classId || "",
          className: data.classId || "",
          major: data.major || "MIPA",
          entryYear: data.entryYear || "2025/2026",
          level: data.level || "SMA",
          studentStatus: data.studentStatus || "Siswa Baru",
          previousSchool: data.previousSchool || "",
          fatherName: data.fatherName || "",
          motherName: data.motherName || "",
          guardianName: data.guardianName || "",
          parentPhone: data.parentPhone || "",
          parentJob: data.parentJob || "",
          parentIncome: data.parentIncome || "",
          parentAddress: data.parentAddress || "",
          emergencyName: data.emergencyName || "",
          emergencyPhone: data.emergencyPhone || "",
          emergencyRelation: data.emergencyRelation || "",
          status: data.status || "Aktif",
          onboardingCompleted: data.status !== "Belum Onboarding",
          imageUrl: imageUrl,
          photoUrl: imageUrl,
          updatedAt: new Date().toISOString()
        };

        const targetIds = Array.from(new Set([
          data._firestoreId, 
          data.uid, 
          ...(data._allDocIds || [])
        ].filter(Boolean)));

        for (const tId of targetIds) {
          try {
            await updateDoc(doc(db, "students", tId as string), payload);
          } catch (err) {
            console.warn("Update students collection warning:", err);
          }
          try {
            await updateDoc(doc(db, "users", tId as string), payload);
          } catch (err) {
            console.warn("Update users collection warning:", err);
          }
        }
      } else if (crudState.mode === "delete" && data) {
        const allDocIdsToDelete = new Set<string>();

        if (data._firestoreId) allDocIdsToDelete.add(data._firestoreId);
        if (data.uid) allDocIdsToDelete.add(data.uid);
        if (data._allDocIds && Array.isArray(data._allDocIds)) {
          data._allDocIds.forEach((id: string) => allDocIdsToDelete.add(id));
        }

        const targetEmail = (data.email || "").toLowerCase();
        const targetId = data.id || data.nis || data.nisn;

        // Scan rawStudentsRef and rawUsersRef for any matching doc IDs
        rawStudentsRef.current.forEach(s => {
          if (
            (targetEmail && s.email?.toLowerCase() === targetEmail) ||
            (data.uid && (s.uid === data.uid || s._firestoreId === data.uid)) ||
            (targetId && targetId !== "-" && (s.id === targetId || s.nis === targetId || s.nisn === targetId))
          ) {
            if (s._firestoreId) allDocIdsToDelete.add(s._firestoreId);
          }
        });

        rawUsersRef.current.forEach(u => {
          if (
            (targetEmail && u.email?.toLowerCase() === targetEmail) ||
            (data.uid && (u.uid === data.uid || u._firestoreId === data.uid)) ||
            (targetId && targetId !== "-" && (u.id === targetId || u.nis === targetId || u.nisn === targetId))
          ) {
            if (u._firestoreId) allDocIdsToDelete.add(u._firestoreId);
          }
        });

        // Execute deleteDoc on both collections for all gathered IDs
        for (const docId of Array.from(allDocIdsToDelete)) {
          try {
            await deleteDoc(doc(db, "students", docId));
          } catch (err) {
            console.warn("Could not delete from students collection:", docId, err);
          }

          try {
            await deleteDoc(doc(db, "users", docId));
          } catch (err) {
            console.warn("Could not delete from users collection:", docId, err);
          }
        }

        // Optimistically remove from local state immediately
        setStudents((prev) =>
          prev.filter((s) => {
            const sEmail = (s.email || "").toLowerCase();
            const matchDoc = allDocIdsToDelete.has(s._firestoreId);
            const matchUid = data.uid && s.uid === data.uid;
            const matchEmail = targetEmail && sEmail === targetEmail;
            return !matchDoc && !matchUid && !matchEmail;
          })
        );
      }
    } catch (error) {
      console.error("Error saving student data:", error);
      throw error;
    }
  };

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchSearch = !searchQuery || 
        (student.name && student.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (student.id && student.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (student.classId && student.classId.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchClass = selectedClass === "All" || student.classId === selectedClass;
      const matchStatus = selectedStatus === "All" || (student.status || "Aktif") === selectedStatus;

      return matchSearch && matchClass && matchStatus;
    });
  }, [students, searchQuery, selectedClass, selectedStatus]);

  // Dynamic Statistics
  const dynamicStats = [
    { label: "Total Siswa", value: students.length.toString(), icon: Users, color: "text-[#531FFF] bg-[#531FFF]/10" },
    { label: "Siswa Aktif", value: students.filter(s => (s.status || "Aktif") === "Aktif").length.toString(), icon: CheckCircle2, color: "text-emerald-600 bg-emerald-100" },
    { label: "Belum Onboarding", value: unboardedCount.toString(), icon: Clock, color: "text-amber-600 bg-amber-100" },
    { label: "Siswa Nonaktif", value: students.filter(s => s.status === "Nonaktif").length.toString(), icon: XCircle, color: "text-rose-600 bg-rose-100" },
  ];

  // Unique classes options for filter
  const classOptions = useMemo(() => {
    const list = Array.from(new Set(students.map(s => s.classId).filter(Boolean)));
    classes.forEach(c => {
      const name = c.name || c.id;
      if (name && !list.includes(name)) list.push(name);
    });
    return list.sort();
  }, [students, classes]);

  // CSV Export Handler
  const handleExportCSV = () => {
    if (filteredStudents.length === 0) return;
    const headers = ["NIS/NISN", "Nama Lengkap", "Kelas", "Status"];
    const rows = filteredStudents.map(s => [
      `"${s.id || ""}"`,
      `"${s.name || ""}"`,
      `"${s.classId || ""}"`,
      `"${s.status || "Aktif"}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `data_siswa_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isFiltered = searchQuery !== "" || selectedClass !== "All" || selectedStatus !== "All";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedClass("All");
    setSelectedStatus("All");
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto w-full h-full space-y-6 animate-in fade-in duration-300">
      <CrudSheet 
        open={crudState.open} 
        onOpenChange={(open) => setCrudState(s => ({ ...s, open }))}
        mode={crudState.mode}
        entityName="Data Siswa"
        fields={studentFields}
        initialData={crudState.data}
        onSubmit={handleCrudSubmit}
        onEditRequested={() => setCrudState(s => ({ ...s, mode: "edit" }))}
      />

      {/* Page Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#531FFF]/10 flex items-center justify-center text-[#531FFF] shrink-0 font-bold">
            <User className="w-6 h-6 fill-current" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Data Siswa</h1>
            <p className="text-gray-500 text-xs md:text-sm font-medium mt-0.5">
              Manajemen direktori peserta didik, pencarian NISN, dan pengelompokan kelas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setCrudState({ open: true, mode: "create" })}
            className="flex items-center justify-center gap-2 bg-[#531FFF] hover:bg-[#531FFF]/90 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-[#531FFF]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Siswa</span>
          </button>
          
          <button 
            onClick={handleExportCSV}
            disabled={filteredStudents.length === 0}
            className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-bold border border-gray-200 shadow-xs transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-[#531FFF]" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Interactive Unboarded Students Reminder Banner */}
      {unboardedCount > 0 && (
        <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-amber-900">
                  Ada {unboardedCount} Siswa Belum Menyelesaikan Onboarding
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/80 text-amber-800">
                  Data Belum Lengkap
                </span>
              </div>
              <p className="text-xs text-amber-700 mt-0.5 font-medium leading-relaxed">
                Biodata akademik, orang tua, dan kontak darurat belum tersimpan penuh ke direktori data siswa. Kirim pengingat agar siswa segera melengkapi proses onboarding.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 justify-end">
            <button
              onClick={handleSendBulkReminders}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Ingatkan Semua ({unboardedCount})</span>
            </button>
            <button
              onClick={handleCleanUnboardedStudents}
              disabled={cleaning}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
            >
              {cleaning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              <span>Bersihkan</span>
            </button>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {dynamicStats.map((stat, i) => {
          const IconComp = stat.icon;
          return (
            <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-2xl md:text-3xl font-black text-gray-900 mt-1 tracking-tight">{stat.value}</h3>
              </div>
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center font-bold", stat.color)}>
                <IconComp className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Filter & Toolbar Bar */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search & Filters Left Group */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan nama, NISN, atau kelas..." 
              className="w-full pl-9 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter by Kelas Dropdown */}
          <div className="relative min-w-[150px]">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full pl-4 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] appearance-none cursor-pointer"
            >
              <option value="All">Semua Kelas</option>
              {classOptions.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Filter by Status Dropdown */}
          <div className="relative min-w-[150px]">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full pl-4 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] appearance-none cursor-pointer"
            >
              <option value="All">Semua Status</option>
              <option value="Aktif">Aktif</option>
              <option value="Belum Onboarding">Belum Onboarding</option>
              <option value="Nonaktif">Nonaktif</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Reset Filters Button */}
          {isFiltered && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
              title="Reset Filter"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* View Mode Switcher Right */}
        <div className="flex items-center justify-between md:justify-end gap-3">
          <span className="text-xs font-bold text-gray-400">
            {filteredStudents.length} dari {students.length} Siswa
          </span>

          <div className="flex items-center bg-gray-100 p-1 rounded-xl shrink-0 border border-gray-200">
            <button 
              onClick={() => setViewMode("grid")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5", 
                viewMode === "grid" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button 
              onClick={() => setViewMode("list")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5", 
                viewMode === "list" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
              )}
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Tabel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-24 bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center gap-3 text-gray-400 shadow-xs">
          <Loader2 className="w-8 h-8 animate-spin text-[#531FFF]" />
          <p className="text-sm font-semibold">Memuat direktori data siswa...</p>
        </div>
      ) : (
        <>
          {/* GRID VIEW */}
          {viewMode === "grid" && filteredStudents.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {filteredStudents.map((student, i) => (
                <div 
                  key={student._firestoreId || i} 
                  className="group bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_30px_-8px_rgba(83,31,255,0.12)] transition-all duration-300 hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between"
                >
                  {/* Top Decorative Cover Header */}
                  <div>
                    <div className="h-20 bg-gradient-to-r from-[#531FFF]/15 via-[#6E3BFF]/10 to-[#531FFF]/5 relative p-3 flex items-start justify-end">
                      {/* Status Badge */}
                      <div className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 backdrop-blur-md border shadow-xs",
                        (student.status === "Belum Onboarding" || student.onboardingCompleted === false)
                          ? "bg-amber-500/15 text-amber-700 border-amber-500/30"
                          : (student.status || "Aktif") === "Aktif" 
                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" 
                            : "bg-rose-500/10 text-rose-700 border-rose-500/20"
                      )}>
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          (student.status === "Belum Onboarding" || student.onboardingCompleted === false)
                            ? "bg-amber-500 animate-pulse"
                            : (student.status || "Aktif") === "Aktif" ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                        )} />
                        {student.status || "Aktif"}
                      </div>
                    </div>

                    {/* Overlapping Avatar */}
                    <div className="px-4 flex items-end justify-between -mt-8 relative z-10 mb-3">
                      <div className="w-16 h-16 rounded-2xl ring-4 ring-white shadow-md relative overflow-hidden border border-gray-100 bg-gray-100 shrink-0">
                        <Image 
                          src={student.imageUrl || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=250&auto=format&fit=crop"} 
                          alt={student.name || "Student"}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                          unoptimized
                        />
                      </div>

                      {/* Class Badge */}
                      <span className="px-3 py-1 rounded-xl bg-[#531FFF]/10 text-[#531FFF] font-extrabold text-xs border border-[#531FFF]/20">
                        {student.classId || "Tanpa Kelas"}
                      </span>
                    </div>

                    {/* Student Info Body */}
                    <div className="px-4 pb-2 space-y-1">
                      <h3 className="font-extrabold text-sm text-gray-900 group-hover:text-[#531FFF] transition-colors truncate tracking-tight" title={student.name}>
                        {student.name}
                      </h3>
                      <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400">
                        <span>NISN: <span className="text-gray-600">{student.id || "-"}</span></span>
                        {student.major && (
                          <span className="text-[#531FFF] bg-purple-50 px-1.5 py-0.5 rounded font-bold">{student.major}</span>
                        )}
                      </div>

                      {/* Reminder status badge if unboarded */}
                      {(student.status === "Belum Onboarding" || student.onboardingCompleted === false) && (
                        <div className="pt-1">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80">
                            <Clock className="w-3 h-3 text-amber-600" />
                            {student.reminderSentAt ? "Diingatkan" : "Belum Diingatkan"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="p-4 pt-3 border-t border-gray-100/80 flex items-center justify-between mt-2">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Profil Siswa
                    </span>

                    <div className="flex items-center gap-1.5">
                      {/* Send Reminder Button for Unboarded Students */}
                      {(student.status === "Belum Onboarding" || student.onboardingCompleted === false) && (
                        <button 
                          onClick={() => handleSendReminder(student)}
                          className="w-8 h-8 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/80 transition-all flex items-center justify-center cursor-pointer"
                          title={student.reminderSentAt ? `Sudah diingatkan (${new Date(student.reminderSentAt).toLocaleTimeString("id-ID")}). Klik untuk kirim ulang.` : "Kirim Pengingat Onboarding"}
                        >
                          <Bell className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button 
                        onClick={() => setCrudState({ open: true, mode: "view", data: student })}
                        className="w-8 h-8 rounded-xl bg-gray-50 hover:bg-[#531FFF]/10 text-gray-500 hover:text-[#531FFF] transition-all flex items-center justify-center"
                        title="Lihat Detail Siswa"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => setCrudState({ open: true, mode: "edit", data: student })}
                        className="w-8 h-8 rounded-xl bg-gray-50 hover:bg-[#531FFF]/10 text-gray-500 hover:text-[#531FFF] transition-all flex items-center justify-center"
                        title="Edit Data Siswa"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => setCrudState({ open: true, mode: "delete", data: student })}
                        className="w-8 h-8 rounded-xl bg-gray-50 hover:bg-rose-50 text-gray-500 hover:text-rose-600 transition-all flex items-center justify-center"
                        title="Hapus Data Siswa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* LIST / TABLE VIEW */}
          {viewMode === "list" && filteredStudents.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-400 text-[11px] font-extrabold uppercase tracking-wider">
                      <th className="py-3.5 px-6">Siswa</th>
                      <th className="py-3.5 px-6">NIS / NISN</th>
                      <th className="py-3.5 px-6">Kelas</th>
                      <th className="py-3.5 px-6">Status</th>
                      <th className="py-3.5 px-6 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredStudents.map((student, i) => (
                      <tr key={student._firestoreId || i} className="hover:bg-purple-50/20 transition-colors group">
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full relative overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                              <Image
                                src={student.imageUrl || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=250&auto=format&fit=crop"}
                                alt={student.name || "Student"}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                            <div>
                              <span className="font-bold text-sm text-gray-900 group-hover:text-[#531FFF] transition-colors block">
                                {student.name}
                              </span>
                              {student.major && (
                                <span className="text-[11px] text-gray-400 font-medium">{student.major}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-6 font-semibold text-sm text-gray-600">
                          {student.id || "-"}
                        </td>
                        <td className="py-3.5 px-6">
                          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#531FFF]/10 text-[#531FFF]">
                            {student.classId || "-"}
                          </span>
                        </td>
                        <td className="py-3.5 px-6">
                          <span className={cn(
                            "px-2.5 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1.5 border",
                            (student.status === "Belum Onboarding" || student.onboardingCompleted === false)
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : (student.status || "Aktif") === "Aktif"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                          )}>
                            <span className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              (student.status === "Belum Onboarding" || student.onboardingCompleted === false)
                                ? "bg-amber-500 animate-pulse"
                                : (student.status || "Aktif") === "Aktif" ? "bg-emerald-500" : "bg-rose-500"
                            )} />
                            {student.status || "Aktif"}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {(student.status === "Belum Onboarding" || student.onboardingCompleted === false) && (
                              <button
                                onClick={() => handleSendReminder(student)}
                                className="p-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 border border-amber-200 rounded-xl transition-colors cursor-pointer"
                                title={student.reminderSentAt ? `Sudah diingatkan (${new Date(student.reminderSentAt).toLocaleTimeString("id-ID")})` : "Kirim Pengingat Onboarding"}
                              >
                                <Bell className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => setCrudState({ open: true, mode: "view", data: student })}
                              className="p-2 text-gray-500 hover:text-[#531FFF] hover:bg-gray-100 rounded-xl transition-colors"
                              title="Lihat Detail"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setCrudState({ open: true, mode: "edit", data: student })}
                              className="p-2 text-gray-500 hover:text-[#531FFF] hover:bg-gray-100 rounded-xl transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setCrudState({ open: true, mode: "delete", data: student })}
                              className="p-2 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
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

          {/* EMPTY STATE */}
          {filteredStudents.length === 0 && (
            <div className="py-20 bg-white rounded-2xl border border-gray-100 text-center flex flex-col items-center justify-center p-6 shadow-xs">
              <div className="w-16 h-16 bg-purple-50 text-[#531FFF] rounded-full flex items-center justify-center mb-4">
                <User className="w-8 h-8" />
              </div>
              <h3 className="text-gray-900 font-extrabold text-base mb-1">
                {isFiltered ? "Siswa tidak ditemukan" : "Belum ada data siswa"}
              </h3>
              <p className="text-gray-500 text-sm max-w-sm mb-5 font-medium">
                {isFiltered 
                  ? "Coba ubah kata kunci pencarian atau reset filter untuk menampilkan siswa lainnya."
                  : "Silakan tambahkan siswa baru ke dalam sistem direktori sekolah."
                }
              </p>
              
              {isFiltered ? (
                <button 
                  onClick={handleResetFilters}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
                >
                  Reset Filter
                </button>
              ) : (
                <button 
                  onClick={() => setCrudState({ open: true, mode: "create" })}
                  className="bg-[#531FFF] hover:bg-[#531FFF]/90 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md shadow-[#531FFF]/20"
                >
                  + Tambah Siswa Baru
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
