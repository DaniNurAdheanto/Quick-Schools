"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Users, 
  UserCheck, 
  UserX, 
  ShieldCheck, 
  ShieldAlert, 
  GraduationCap, 
  User, 
  BookUser, 
  Search, 
  Filter, 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  X, 
  Shield,
  LogIn,
  AlertCircle,
  Bell,
  Send
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  setDoc, 
  query,
  getDocs,
  where,
  addDoc
} from "firebase/firestore";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useToast } from "@/context/ToastContext";

interface AccountUser {
  id: string; // doc ID
  uid: string;
  name: string;
  email: string;
  role: string;
  status: "Aktif" | "Nonaktif" | "Belum Onboarding" | string;
  onboardingCompleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  phone?: string;
  pendingOnboardingReminder?: boolean;
  reminderSentAt?: string | null;
}

const ROLE_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: any }> = {
  "super-admin": { label: "Super Admin", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", icon: ShieldAlert },
  "admin": { label: "Admin Sekolah", bg: "bg-purple-50", text: "text-[#531FFF]", border: "border-purple-200", icon: ShieldCheck },
  "guru": { label: "Guru Pengajar", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: GraduationCap },
  "siswa": { label: "Siswa", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", icon: User },
  "student": { label: "Siswa", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", icon: User },
  "orang-tua": { label: "Orang Tua / Wali", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: Users },
  "kepala-sekolah": { label: "Kepala Sekolah", bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200", icon: BookUser },
};

export default function AccountManagementPage() {
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [usersList, setUsersList] = useState<AccountUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("Semua");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("Semua");

  // Modals
  const [editModal, setEditModal] = useState<{ open: boolean; data: AccountUser | null }>({ open: false, data: null });
  const [detailModal, setDetailModal] = useState<{ open: boolean; data: AccountUser | null }>({ open: false, data: null });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; data: AccountUser | null }>({ open: false, data: null });
  const [createModal, setCreateModal] = useState(false);

  // Form states for Create / Edit
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState("siswa");
  const [formStatus, setFormStatus] = useState("Aktif");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Listen to Auth State
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthChecking(false);
      if (!user) {
        setLoading(false);
      }
    });
    return () => unsubAuth();
  }, []);

  // 2. Subscribe to real-time users collection once authenticated
  useEffect(() => {
    if (!currentUser) return;

    setLoading(true);
    const qUsers = query(collection(db, "users"));
    const unsubscribe = onSnapshot(qUsers, (snapshot) => {
      const list: AccountUser[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const docId = docSnap.id;
        
        let statusNormalized = data.status || "Aktif";
        if (data.onboardingCompleted === false && statusNormalized !== "Nonaktif") {
          statusNormalized = "Belum Onboarding";
        }

        list.push({
          id: docId,
          uid: data.uid || docId,
          name: data.name || data.email?.split("@")[0] || "Tanpa Nama",
          email: data.email || "-",
          role: (data.role || "siswa").toLowerCase(),
          status: statusNormalized,
          onboardingCompleted: data.onboardingCompleted ?? true,
          createdAt: data.createdAt || null,
          updatedAt: data.updatedAt || null,
          phone: data.phone || "-",
          pendingOnboardingReminder: data.pendingOnboardingReminder || false,
          reminderSentAt: data.reminderSentAt || null
        });
      });

      list.sort((a, b) => a.name.localeCompare(b.name));
      setUsersList(list);
      setLoading(false);
    }, (err) => {
      console.warn("Firestore snapshot error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Quick Login as Admin
  const handleQuickLoginAdmin = async () => {
    setIsLoggingIn(true);
    try {
      await signInWithEmailAndPassword(auth, "dani@gmail.com", "asdasdasd");
      toast.showSuccess("Berhasil masuk sebagai Administrator (Dani).", "Login Berhasil");
    } catch (err: any) {
      console.error("Quick login error:", err);
      toast.showError("Gagal login: " + (err.message || "Periksa koneksi"), "Login Gagal");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = usersList.length;
    const active = usersList.filter(u => u.status === "Aktif").length;
    const inactive = usersList.filter(u => u.status === "Nonaktif").length;
    const pendingOnboarding = usersList.filter(u => u.status === "Belum Onboarding" || u.onboardingCompleted === false).length;

    return { total, active, inactive, pendingOnboarding };
  }, [usersList]);

  // Filtered accounts list
  const filteredUsers = useMemo(() => {
    return usersList.filter(user => {
      const queryLower = searchQuery.toLowerCase();
      const matchesSearch = 
        user.name.toLowerCase().includes(queryLower) ||
        user.email.toLowerCase().includes(queryLower) ||
        user.uid.toLowerCase().includes(queryLower);

      const matchesRole = 
        selectedRoleFilter === "Semua" ||
        (selectedRoleFilter === "siswa" && (user.role === "siswa" || user.role === "student")) ||
        user.role === selectedRoleFilter;

      const matchesStatus = 
        selectedStatusFilter === "Semua" ||
        user.status === selectedStatusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [usersList, searchQuery, selectedRoleFilter, selectedStatusFilter]);

  // Handle Quick Toggle Status
  const handleToggleStatus = async (user: AccountUser) => {
    const nextStatus = user.status === "Aktif" ? "Nonaktif" : "Aktif";
    
    // Update local state immediately
    setUsersList(prev => prev.map(u => u.id === user.id ? { ...u, status: nextStatus } : u));

    try {
      await updateDoc(doc(db, "users", user.id), {
        status: nextStatus,
        onboardingCompleted: nextStatus === "Aktif" ? true : user.onboardingCompleted,
        updatedAt: new Date().toISOString()
      });

      // Also update matching student document if any
      try {
        const studentSnap = await getDocs(query(collection(db, "students"), where("uid", "==", user.uid)));
        for (const stDoc of studentSnap.docs) {
          await updateDoc(doc(db, "students", stDoc.id), { status: nextStatus });
        }
      } catch (e) {}

      toast.showEdit(
        `Status akun ${user.name} berhasil diubah menjadi "${nextStatus}".`,
        "Status Diperbarui"
      );
    } catch (err: any) {
      console.error("Failed to update status in Firestore:", err);
      if (err.code === "permission-denied") {
        toast.showError(
          "Aturan Cloud Firestore membatasi hak ubah dokumen akun. Pastikan firestore.rules sudah dipublish di Firebase Console.",
          "Izin Ditolak (Permission Denied)"
        );
      } else {
        toast.showError("Gagal memperbarui status akun di database: " + err.message, "Gagal");
      }
    }
  };

  // Send Onboarding Reminder to single user
  const handleSendReminder = async (user: AccountUser) => {
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, "users", user.id), {
        pendingOnboardingReminder: true,
        reminderSentAt: now
      });

      // Also update in students collection if document exists
      try {
        const snap = await getDocs(query(collection(db, "students"), where("uid", "==", user.uid)));
        for (const d of snap.docs) {
          await updateDoc(doc(db, "students", d.id), {
            pendingOnboardingReminder: true,
            reminderSentAt: now
          });
        }
      } catch (e) {}

      setUsersList(prev => prev.map(u => u.id === user.id ? {
        ...u,
        pendingOnboardingReminder: true,
        reminderSentAt: now
      } : u));

      toast.showSuccess(`Pengingat onboarding berhasil dikirim ke akun ${user.name} (${user.email}).`, "Pengingat Terkirim");
    } catch (err: any) {
      console.error("Reminder error:", err);
      toast.showError("Gagal mengirim pengingat onboarding.", "Gagal");
    }
  };

  // Send Onboarding Reminder to ALL unboarded users
  const handleSendBulkReminders = async () => {
    const unboarded = usersList.filter(u => u.status === "Belum Onboarding" || u.onboardingCompleted === false);
    if (unboarded.length === 0) {
      toast.showInfo("Tidak ada akun pengguna yang belum onboarding.", "Informasi");
      return;
    }

    try {
      const now = new Date().toISOString();
      for (const u of unboarded) {
        try {
          await updateDoc(doc(db, "users", u.id), {
            pendingOnboardingReminder: true,
            reminderSentAt: now
          });
        } catch (e) {}
      }

      setUsersList(prev => prev.map(u => {
        if (u.status === "Belum Onboarding" || u.onboardingCompleted === false) {
          return { ...u, pendingOnboardingReminder: true, reminderSentAt: now };
        }
        return u;
      }));

      toast.showSuccess(`Berhasil mengirimkan pengingat onboarding ke ${unboarded.length} akun terdaftar!`, "Pengingat Terkirim");
    } catch (err) {
      console.error("Bulk reminder error:", err);
      toast.showError("Gagal mengirimkan pengingat onboarding.", "Gagal");
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (user: AccountUser) => {
    setEditModal({ open: true, data: user });
    setFormName(user.name);
    setFormEmail(user.email);
    setFormRole(user.role);
    setFormStatus(user.status);
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal.data) return;

    setIsSubmitting(true);
    const targetId = editModal.data.id;

    // Optimistically update local state
    setUsersList(prev => prev.map(u => u.id === targetId ? {
      ...u,
      name: formName,
      email: formEmail,
      role: formRole,
      status: formStatus
    } : u));

    try {
      await updateDoc(doc(db, "users", targetId), {
        name: formName,
        email: formEmail,
        role: formRole,
        status: formStatus,
        onboardingCompleted: formStatus === "Belum Onboarding" ? false : true,
        updatedAt: new Date().toISOString()
      });

      // Also sync to matching student or teacher doc if exists
      if (formRole === "siswa") {
        try {
          const sSnap = await getDocs(query(collection(db, "students"), where("uid", "==", editModal.data.uid)));
          for (const sDoc of sSnap.docs) {
            await updateDoc(doc(db, "students", sDoc.id), { name: formName, status: formStatus });
          }
        } catch (e) {}
      } else if (formRole === "guru") {
        try {
          const tSnap = await getDocs(query(collection(db, "teachers"), where("uid", "==", editModal.data.uid)));
          for (const tDoc of tSnap.docs) {
            await updateDoc(doc(db, "teachers", tDoc.id), { name: formName, status: formStatus });
          }
        } catch (e) {}
      }

      toast.showEdit(`Data akun ${formName} berhasil diperbarui.`, "Perubahan Disimpan");
      setEditModal({ open: false, data: null });
    } catch (err: any) {
      console.error("Save edit error:", err);
      if (err.code === "permission-denied") {
        toast.showError(
          "Izin ditolak oleh Cloud Firestore. Untuk mengizinkan admin mengubah akun pengguna lain, publish firestore.rules di Firebase Console.",
          "Izin Ditolak (Rules Belum Dipublish)"
        );
      } else {
        toast.showError("Gagal menyimpan perubahan: " + err.message, "Error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create New Account
  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail.trim() || !formName.trim()) {
      toast.showError("Nama dan Email wajib diisi.", "Validasi Gagal");
      return;
    }

    setIsSubmitting(true);
    try {
      const newDocRef = doc(collection(db, "users"));
      const newAccountData = {
        uid: newDocRef.id,
        name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        role: formRole,
        status: formStatus,
        onboardingCompleted: formStatus === "Belum Onboarding" ? false : true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(newDocRef, newAccountData);

      // If role is siswa, create companion in students collection
      if (formRole === "siswa") {
        try {
          await addDoc(collection(db, "students"), {
            id: String(Math.floor(100000 + Math.random() * 900000)),
            name: formName.trim(),
            classId: "10 MIPA 1",
            status: formStatus === "Nonaktif" ? "Nonaktif" : "Aktif"
          });
        } catch (e) {}
      } else if (formRole === "guru") {
        try {
          await addDoc(collection(db, "teachers"), {
            name: formName.trim(),
            subject: "Mata Pelajaran Umum",
            status: formStatus === "Nonaktif" ? "Nonaktif" : "Aktif"
          });
        } catch (e) {}
      }

      toast.showSuccess(`Akun ${formName} (${formRole}) berhasil dibuat.`, "Akun Dibuat");
      setCreateModal(false);
      setFormName("");
      setFormEmail("");
    } catch (err: any) {
      console.error("Create account error:", err);
      if (err.code === "permission-denied") {
        toast.showError(
          "Izin ditolak oleh Cloud Firestore. Silakan pastikan akun admin sudah login dan firestore.rules telah dipublish.",
          "Permission Denied"
        );
      } else {
        toast.showError("Gagal membuat akun: " + err.message, "Error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Account
  const handleConfirmDelete = async () => {
    if (!deleteModal.data) return;
    const targetUser = deleteModal.data;
    const targetId = targetUser.id;
    const targetUid = targetUser.uid;
    const targetEmail = targetUser.email && targetUser.email !== "-" ? targetUser.email.toLowerCase() : "";

    setIsSubmitting(true);

    // Optimistically update local state so the row disappears immediately
    setUsersList((prev) => prev.filter((u) => u.id !== targetId && u.uid !== targetUid && (targetEmail ? u.email?.toLowerCase() !== targetEmail : true)));

    try {
      const userDocsToDelete = new Set<string>();
      if (targetId) userDocsToDelete.add(targetId);
      if (targetUid) userDocsToDelete.add(targetUid);

      const studentDocsToDelete = new Set<string>();
      if (targetId) studentDocsToDelete.add(targetId);
      if (targetUid) studentDocsToDelete.add(targetUid);

      const teacherDocsToDelete = new Set<string>();
      if (targetId) teacherDocsToDelete.add(targetId);
      if (targetUid) teacherDocsToDelete.add(targetUid);

      // Query `users` collection by email
      if (targetEmail) {
        try {
          const qUsersEmail = query(collection(db, "users"), where("email", "==", targetEmail));
          const snap = await getDocs(qUsersEmail);
          snap.forEach(d => userDocsToDelete.add(d.id));
        } catch (e) {}
      }

      // Query `students` collection by email or uid
      if (targetEmail) {
        try {
          const qStEmail = query(collection(db, "students"), where("email", "==", targetEmail));
          const snap = await getDocs(qStEmail);
          snap.forEach(d => studentDocsToDelete.add(d.id));
        } catch (e) {}
      }
      if (targetUid) {
        try {
          const qStUid = query(collection(db, "students"), where("uid", "==", targetUid));
          const snap = await getDocs(qStUid);
          snap.forEach(d => studentDocsToDelete.add(d.id));
        } catch (e) {}
      }

      // Query `teachers` collection by email or uid
      if (targetEmail) {
        try {
          const qTcEmail = query(collection(db, "teachers"), where("email", "==", targetEmail));
          const snap = await getDocs(qTcEmail);
          snap.forEach(d => teacherDocsToDelete.add(d.id));
        } catch (e) {}
      }
      if (targetUid) {
        try {
          const qTcUid = query(collection(db, "teachers"), where("uid", "==", targetUid));
          const snap = await getDocs(qTcUid);
          snap.forEach(d => teacherDocsToDelete.add(d.id));
        } catch (e) {}
      }

      // 1. Delete from `students` collection
      for (const id of Array.from(studentDocsToDelete)) {
        try {
          await deleteDoc(doc(db, "students", id));
        } catch (e) {}
      }

      // 2. Delete from `teachers` collection
      for (const id of Array.from(teacherDocsToDelete)) {
        try {
          await deleteDoc(doc(db, "teachers", id));
        } catch (e) {}
      }

      // 3. Delete from `users` collection
      let usersDeleteFailed = false;
      let usersErrorMessage = "";
      for (const id of Array.from(userDocsToDelete)) {
        try {
          await deleteDoc(doc(db, "users", id));
        } catch (e: any) {
          console.warn("Could not delete doc from users:", id, e);
          if (e.code === "permission-denied") {
            usersDeleteFailed = true;
            usersErrorMessage = e.message;
          }
        }
      }

      if (usersDeleteFailed) {
        toast.showWarning(
          `Data di siswa/guru telah dibersihkan. Namun dokumen users terhalang aturan Cloud Firestore. Pastikan firestore.rules sudah dipublish di Firebase Console.`,
          "Perhatian Izin Rules"
        );
      } else {
        toast.showDelete(`Akun ${targetUser.name} telah dihapus secara permanen.`, "Akun Dihapus");
      }

      setDeleteModal({ open: false, data: null });
    } catch (err: any) {
      console.error("Delete account error:", err);
      toast.showError(err?.message || "Gagal menghapus akun pengguna.", "Error Hapus Akun");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      
      {/* Auth Warning Banner if Guest */}
      {!authChecking && !currentUser && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900">Sesi Login Belum Terhubung (Guest)</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Firebase Firestore memerlukan sesi akun Administrator untuk memuat, menambah, mengedit, dan menghapus akun pengguna.
              </p>
            </div>
          </div>
          <button
            onClick={handleQuickLoginAdmin}
            disabled={isLoggingIn}
            className="flex items-center gap-2 px-4 py-2 bg-[#531FFF] hover:bg-[#4314cc] text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 active:scale-95"
          >
            <LogIn className="w-4 h-4" />
            {isLoggingIn ? "Menghubungkan..." : "Login Cepat Administrator"}
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Manajemen Akun Terdaftar</h1>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-[#F3F0FF] text-[#531FFF] rounded-full border border-[#531FFF]/20 flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Super Admin System
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Monitoring seluruh akun pengguna terdaftar, atur status keaktifan (Aktif/Nonaktif), ubah peranan (Role), dan hapus akun secara terpusat.
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={() => {
            setFormName("");
            setFormEmail("");
            setFormRole("siswa");
            setFormStatus("Aktif");
            setCreateModal(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#531FFF] hover:bg-[#4314cc] text-white rounded-xl font-bold text-sm shadow-md shadow-[#531FFF]/20 transition-all active:scale-[0.98] shrink-0"
        >
          <Plus className="w-4 h-4" />
          Tambah Akun Baru
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Akun Terdaftar</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{stats.total}</h3>
            <p className="text-[11px] text-gray-500 font-medium mt-0.5">Semua role dalam sistem</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-[#531FFF] border border-purple-100 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Akun Aktif</p>
            <h3 className="text-2xl font-black text-emerald-700 mt-1">{stats.active}</h3>
            <p className="text-[11px] text-gray-500 font-medium mt-0.5">Bisa akses penuh & login</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Akun Nonaktif</p>
            <h3 className="text-2xl font-black text-rose-700 mt-1">{stats.inactive}</h3>
            <p className="text-[11px] text-gray-500 font-medium mt-0.5">Akses login diblokir</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center font-bold">
            <UserX className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Belum Onboarding</p>
            <h3 className="text-2xl font-black text-amber-700 mt-1">{stats.pendingOnboarding}</h3>
            <p className="text-[11px] text-gray-500 font-medium mt-0.5">Proses pendaftaran awal</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Alert Banner for Pending Onboarding Accounts */}
      {stats.pendingOnboarding > 0 && (
        <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-amber-900">
                  {stats.pendingOnboarding} Akun Pengguna Belum Menyelesaikan Onboarding
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/80 text-amber-800">
                  Perlu Ditindaklanjuti
                </span>
              </div>
              <p className="text-xs text-amber-700 mt-0.5 font-medium leading-relaxed">
                Akun siswa belum melengkapi biodata dan data orang tua. Kirimkan pengingat sistem agar siswa segera menyelesaikan pendaftaran.
              </p>
            </div>
          </div>
          <button
            onClick={handleSendBulkReminders}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 shrink-0 cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            <span>Kirim Pengingat ke Semua ({stats.pendingOnboarding})</span>
          </button>
        </div>
      )}

      {/* Main Table Workspace */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
        
        {/* Search & Filter Header Bar */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/60 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text"
              placeholder="Cari nama, email, atau UID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all shadow-xs"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
            
            {/* Filter Role */}
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-xs">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs font-bold text-gray-500">Role:</span>
              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-gray-800 focus:outline-none cursor-pointer"
              >
                <option value="Semua">Semua Role</option>
                <option value="super-admin">Super Admin</option>
                <option value="admin">Admin Sekolah</option>
                <option value="guru">Guru Pengajar</option>
                <option value="siswa">Siswa</option>
                <option value="orang-tua">Orang Tua / Wali</option>
                <option value="kepala-sekolah">Kepala Sekolah</option>
              </select>
            </div>

            {/* Filter Status */}
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-xs">
              <span className="text-xs font-bold text-gray-500">Status:</span>
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-gray-800 focus:outline-none cursor-pointer"
              >
                <option value="Semua">Semua Status</option>
                <option value="Aktif">Aktif</option>
                <option value="Nonaktif">Nonaktif</option>
                <option value="Belum Onboarding">Belum Onboarding</option>
              </select>
            </div>

            {(searchQuery || selectedRoleFilter !== "Semua" || selectedStatusFilter !== "Semua") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedRoleFilter("Semua");
                  setSelectedStatusFilter("Semua");
                }}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition-all"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-white text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4">Pengguna (User Account)</th>
                <th className="px-6 py-4">Role System</th>
                <th className="px-6 py-4 text-center">Status Keaktifan</th>
                <th className="px-6 py-4 text-center">Onboarding</th>
                <th className="px-6 py-4">Tanggal Buat</th>
                <th className="px-6 py-4 text-right">Aksi & Kelola</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-[#531FFF]" />
                      <span className="font-semibold text-xs text-gray-600">Memuat data seluruh akun pengguna...</span>
                    </div>
                  </td>
                </tr>
              ) : !currentUser ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <AlertCircle className="w-8 h-8 text-amber-500" />
                      <div className="space-y-1">
                        <p className="font-bold text-gray-800 text-sm">Sesi Login Belum Terdeteksi</p>
                        <p className="text-xs text-gray-500 max-w-md mx-auto">
                          Untuk menampilkan seluruh daftar akun pengguna, silakan masuk dengan akun Administrator.
                        </p>
                      </div>
                      <button
                        onClick={handleQuickLoginAdmin}
                        disabled={isLoggingIn}
                        className="px-5 py-2.5 bg-[#531FFF] hover:bg-[#4314cc] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-[#531FFF]/20"
                      >
                        {isLoggingIn ? "Menghubungkan..." : "Login Sebagai Administrator"}
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => {
                  const roleObj = ROLE_CONFIG[user.role] || { 
                    label: user.role, 
                    bg: "bg-gray-100", 
                    text: "text-gray-700", 
                    border: "border-gray-200", 
                    icon: User 
                  };
                  const RoleIcon = roleObj.icon;

                  const isAktif = user.status === "Aktif";
                  const isNonaktif = user.status === "Nonaktif";

                  return (
                    <tr key={user.id} className="hover:bg-gray-50/60 transition-colors group">
                      
                      {/* Name & Email & UID */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border shadow-xs",
                            roleObj.bg, roleObj.text, roleObj.border
                          )}>
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="overflow-hidden">
                            <p className="font-bold text-gray-900 group-hover:text-[#531FFF] transition-colors truncate">
                              {user.name}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                              <span className="truncate">{user.email}</span>
                              <span className="text-gray-300">•</span>
                              <span className="font-mono text-[10px] text-gray-400 truncate">UID: {user.uid.slice(0, 8)}...</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border",
                          roleObj.bg, roleObj.text, roleObj.border
                        )}>
                          <RoleIcon className="w-3.5 h-3.5" />
                          {roleObj.label}
                        </span>
                      </td>

                      {/* Interactive Status Toggle Badge */}
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(user)}
                          title="Klik untuk mengubah status (Aktif ↔ Nonaktif)"
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-all active:scale-95 shadow-xs cursor-pointer",
                            isAktif
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : isNonaktif
                                ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                                : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                          )}
                        >
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            isAktif ? "bg-emerald-500 animate-pulse" : isNonaktif ? "bg-rose-500" : "bg-amber-500"
                          )} />
                          {user.status}
                        </button>
                      </td>

                      {/* Onboarding Completed Status */}
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        {user.onboardingCompleted ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Selesai
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                            <Clock className="w-3.5 h-3.5" />
                            Belum
                          </span>
                        )}
                      </td>

                      {/* Tanggal Buat */}
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-medium text-[11px]">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric"
                        }) : "-"}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {(user.status === "Belum Onboarding" || user.onboardingCompleted === false) && (
                            <button
                              onClick={() => handleSendReminder(user)}
                              title={user.reminderSentAt ? `Sudah diingatkan (${new Date(user.reminderSentAt).toLocaleTimeString("id-ID")}). Klik untuk kirim ulang.` : "Kirim Pengingat Onboarding"}
                              className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors border border-amber-200 cursor-pointer"
                            >
                              <Bell className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => setDetailModal({ open: true, data: user })}
                            title="Lihat Detail Akun"
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenEdit(user)}
                            title="Edit Role & Status"
                            className="p-1.5 text-gray-400 hover:text-[#531FFF] hover:bg-purple-50 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setDeleteModal({ open: true, data: user })}
                            title="Hapus Akun Permanen"
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 font-medium">
                    Tidak ada data akun yang cocok dengan filter atau kata kunci pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/40 flex items-center justify-between text-xs text-gray-500 font-medium">
          <p>Menampilkan <span className="font-bold text-gray-900">{filteredUsers.length}</span> dari <span className="font-bold text-gray-900">{usersList.length}</span> akun terdaftar</p>
          <p className="text-[11px] text-gray-400">Sinkronisasi langsung dengan Firestore collection `users`</p>
        </div>
      </div>

      {/* ================= EDIT MODAL ================= */}
      {editModal.open && editModal.data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#531FFF] border border-purple-100 flex items-center justify-center font-bold">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Edit Akun Pengguna</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Ubah nama, email, peranan, atau status keaktifan</p>
                </div>
              </div>
              <button 
                onClick={() => setEditModal({ open: false, data: null })}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Email Pengguna</label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Role / Peranan Sistem</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl font-bold text-gray-800 focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none cursor-pointer"
                >
                  <option value="super-admin">Super Admin (Akses Penuh)</option>
                  <option value="admin">Admin Sekolah / TU</option>
                  <option value="guru">Guru Pengajar</option>
                  <option value="siswa">Siswa</option>
                  <option value="orang-tua">Orang Tua / Wali</option>
                  <option value="kepala-sekolah">Kepala Sekolah</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Status Keaktifan Akun</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl font-bold text-gray-800 focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none cursor-pointer"
                >
                  <option value="Aktif">Aktif (Dapat Login)</option>
                  <option value="Nonaktif">Nonaktif (Akses Diblokir)</option>
                  <option value="Belum Onboarding">Belum Onboarding (Pending)</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditModal({ open: false, data: null })}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[#531FFF] hover:bg-[#4314cc] text-white rounded-xl font-bold transition-all shadow-md shadow-[#531FFF]/20"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= CREATE MODAL ================= */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#531FFF] border border-purple-100 flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Tambah Akun Pengguna Baru</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Buat entri profil akun pengguna baru</p>
                </div>
              </div>
              <button 
                onClick={() => setCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCreate} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ahmad Subagyo"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Email Pengguna</label>
                <input
                  type="email"
                  required
                  placeholder="ahmad@sekolah.sch.id"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Role / Peranan Sistem</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl font-bold text-gray-800 focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none cursor-pointer"
                >
                  <option value="siswa">Siswa</option>
                  <option value="guru">Guru Pengajar</option>
                  <option value="admin">Admin Sekolah / TU</option>
                  <option value="orang-tua">Orang Tua / Wali</option>
                  <option value="kepala-sekolah">Kepala Sekolah</option>
                  <option value="super-admin">Super Admin</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Status Awal</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl font-bold text-gray-800 focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] focus:outline-none cursor-pointer"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Nonaktif">Nonaktif</option>
                  <option value="Belum Onboarding">Belum Onboarding</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setCreateModal(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[#531FFF] hover:bg-[#4314cc] text-white rounded-xl font-bold transition-all shadow-md shadow-[#531FFF]/20"
                >
                  {isSubmitting ? "Memproses..." : "Buat Akun"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= DETAIL MODAL ================= */}
      {detailModal.open && detailModal.data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Detail Akun Pengguna</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Atribut & metadata profil akun</p>
                </div>
              </div>
              <button 
                onClick={() => setDetailModal({ open: false, data: null })}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3.5 text-xs">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="font-bold text-gray-500">Nama Lengkap:</span>
                <span className="font-bold text-gray-900">{detailModal.data.name}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="font-bold text-gray-500">Email:</span>
                <span className="font-semibold text-gray-900">{detailModal.data.email}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="font-bold text-gray-500">UID Database:</span>
                <span className="font-mono text-[11px] text-gray-700 bg-gray-100 px-2 py-0.5 rounded">{detailModal.data.uid}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="font-bold text-gray-500">Role System:</span>
                <span className="font-bold text-[#531FFF] bg-purple-50 border border-purple-100 px-2.5 py-0.5 rounded-lg capitalize">
                  {detailModal.data.role}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="font-bold text-gray-500">Status Keaktifan:</span>
                <span className={cn(
                  "font-bold px-2.5 py-0.5 rounded-full border text-[11px]",
                  detailModal.data.status === "Aktif" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                )}>
                  {detailModal.data.status}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="font-bold text-gray-500">Status Onboarding:</span>
                <span className={cn(
                  "font-bold px-2.5 py-0.5 rounded-full border text-[11px]",
                  detailModal.data.onboardingCompleted ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                )}>
                  {detailModal.data.onboardingCompleted ? "Selesai (Completed)" : "Belum Selesai (Pending)"}
                </span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="font-bold text-gray-500">Pengingat Terakhir:</span>
                <span className="font-bold text-gray-800 text-[11px]">
                  {detailModal.data.reminderSentAt 
                    ? new Date(detailModal.data.reminderSentAt).toLocaleString("id-ID") 
                    : "Belum pernah diingatkan"}
                </span>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <div>
                {(detailModal.data.status === "Belum Onboarding" || detailModal.data.onboardingCompleted === false) && (
                  <button
                    onClick={() => {
                      handleSendReminder(detailModal.data!);
                      setDetailModal(prev => ({
                        ...prev,
                        data: prev.data ? { ...prev.data, pendingOnboardingReminder: true, reminderSentAt: new Date().toISOString() } : null
                      }));
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-xs"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>Kirim Pengingat Onboarding</span>
                  </button>
                )}
              </div>
              <button
                onClick={() => setDetailModal({ open: false, data: null })}
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl text-xs transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= DELETE CONFIRMATION MODAL (CENTERED) ================= */}
      {deleteModal.open && deleteModal.data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-[440px] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-4">
              
              {/* Warning Icon */}
              <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
                <AlertTriangle className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900">Hapus Akun Pengguna?</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Anda akan menghapus akun <span className="font-bold text-gray-900">{deleteModal.data.name}</span> ({deleteModal.data.email}).
                </p>
              </div>

              {/* Warning Notice Box */}
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-left text-xs text-rose-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-rose-900">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>Peringatan Penting:</span>
                </div>
                <p className="text-[11px] leading-relaxed text-rose-700">
                  Tindakan ini menghapus profil login pengguna dari database secara permanen. Pengguna ini tidak akan bisa login kembali ke sistem.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModal({ open: false, data: null })}
                  className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-all"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmDelete}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md shadow-rose-600/20 transition-all"
                >
                  {isSubmitting ? "Menghapus..." : "Ya, Hapus Akun"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
