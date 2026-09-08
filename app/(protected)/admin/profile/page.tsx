"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Key, 
  Save, 
  Edit3,
  MessageCircle,
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  BadgeCheck, 
  Copy, 
  Check, 
  X, 
  Eye, 
  EyeOff 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, updatePassword, updateProfile } from "firebase/auth";
import { 
  doc, 
  getDoc, 
  getDocs, 
  collection, 
  query, 
  where, 
  updateDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { ROLES } from "@/lib/roles-config";

type ProfileTab = "biodata" | "security";

export default function ProfilePage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<ProfileTab>("biodata");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUid, setCurrentUid] = useState<string>("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // User Data State
  const [profileData, setProfileData] = useState<any>({
    name: "",
    email: "",
    role: "admin",
    phone: "",
    nip: "",
    nisn: "",
    subject: "",
    address: "",
    status: "Aktif",
    gender: "Laki-laki",
    createdAt: "Terdaftar",
    imageUrl: ""
  });

  const [formData, setFormData] = useState<any>({});
  const [matchedTeacher, setMatchedTeacher] = useState<any>(null);

  // Password update states
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUid(user.uid);
        try {
          // 1. Fetch Primary User Doc
          const userDoc = await getDoc(doc(db, "users", user.uid));
          let userData: any = {};
          if (userDoc.exists()) {
            userData = userDoc.data();
          }

          const rawRole = userData.role || "admin";
          const normalizedRole = 
            rawRole === "student" ? "siswa" :
            rawRole === "teacher" ? "guru" : rawRole;

          const combined = {
            name: userData.name || user.displayName || "User",
            email: userData.email || user.email || "",
            role: normalizedRole,
            rawRole: rawRole,
            phone: userData.phone || userData.contact || "",
            nip: userData.nip || userData.id || "",
            nisn: userData.nisn || userData.id || "",
            subject: userData.subject || "",
            address: userData.address || "",
            status: userData.status || "Aktif",
            gender: userData.gender || "Laki-laki",
            createdAt: userData.createdAt?.toDate 
              ? userData.createdAt.toDate().toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric"
                }) 
              : "Terdaftar",
            imageUrl: userData.imageUrl || userData.photoUrl || user.photoURL || ""
          };

          setProfileData(combined);
          setFormData(combined);

          // 2. Synchronize teacher record if guru
          try {
            let teacherFound: any = null;
            const tDoc = await getDoc(doc(db, "teachers", user.uid));
            if (tDoc.exists()) {
              teacherFound = { _id: tDoc.id, ...tDoc.data() };
            } else {
              const tSnap = await getDocs(query(collection(db, "teachers"), where("name", "==", combined.name)));
              if (!tSnap.empty) {
                teacherFound = { _id: tSnap.docs[0].id, ...tSnap.docs[0].data() };
              }
            }
            if (teacherFound) {
              setMatchedTeacher(teacherFound);
              if (!combined.nip && (teacherFound.nip || teacherFound.id)) {
                setProfileData((p: any) => ({ ...p, nip: teacherFound.nip || teacherFound.id }));
              }
              if (!combined.subject && (teacherFound.role || teacherFound.subject)) {
                setProfileData((p: any) => ({ ...p, subject: teacherFound.role || teacherFound.subject }));
              }
            }
          } catch (err) {
            console.warn("Could not sync teacher details:", err);
          }

        } catch (error) {
          console.error("Error fetching user profile data:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Matched Role Definition from ROLES configuration in admin/roles
  const roleDefinition = React.useMemo(() => {
    const roleId = profileData.role;
    return ROLES.find((r: any) => r.id === roleId) || ROLES.find((r: any) => r.id === "admin") || {
      id: roleId,
      name: roleId.charAt(0).toUpperCase() + roleId.slice(1),
      icon: ShieldCheck,
      badge: "Pengguna Terdaftar",
      journey: "Akses menu sesuai penugasan",
      description: "Hak akses pengguna dalam sistem Quick Schools."
    };
  }, [profileData.role]);

  const RoleIcon = roleDefinition.icon || ShieldCheck;

  const handleCopy = (text: string, label: string) => {
    if (!text || text === "-") return;
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.showSuccess(`${label} berhasil disalin ke clipboard!`, "Tersalin");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUid) return;

    try {
      setSaving(true);
      const payload: any = {
        name: formData.name || "",
        phone: formData.phone || "",
        address: formData.address || "",
        gender: formData.gender || "Laki-laki",
        updatedAt: serverTimestamp()
      };

      if (profileData.role === "guru") {
        payload.nip = formData.nip || "";
        payload.subject = formData.subject || "";
      }

      await updateDoc(doc(db, "users", currentUid), payload);

      if (auth.currentUser && formData.name) {
        await updateProfile(auth.currentUser, {
          displayName: formData.name
        });
      }

      setProfileData((prev: any) => ({ ...prev, ...payload }));
      setIsEditing(false);
      toast.showSuccess("Informasi profil Anda berhasil diperbarui.", "Profil Tersimpan");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.showError(error?.message || "Gagal memperbarui profil.", "Gagal");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.showError("Kata sandi baru minimal harus 6 karakter.", "Validasi Gagal");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.showError("Konfirmasi kata sandi tidak cocok.", "Validasi Gagal");
      return;
    }

    if (!auth.currentUser) return;

    try {
      setUpdatingPassword(true);
      await updatePassword(auth.currentUser, newPassword);
      setNewPassword("");
      setConfirmPassword("");
      toast.showSuccess("Kata sandi akun Anda berhasil diperbarui.", "Sandi Berhasil Diubah");
    } catch (error: any) {
      console.error("Error updating password:", error);
      if (error.code === "auth/requires-recent-login") {
        toast.showError("Untuk alasan keamanan, silakan logout dan login ulang sebelum mengganti kata sandi.", "Perlu Re-login");
      } else {
        toast.showError(error?.message || "Gagal mengubah kata sandi.", "Gagal");
      }
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="py-32 flex flex-col items-center justify-center gap-3 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#531FFF]" />
        <p className="text-sm font-semibold">Memuat data profil pengguna...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1500px] mx-auto w-full space-y-6 animate-in fade-in duration-300">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-[#531FFF]/5 via-[#531FFF]/2 to-transparent pointer-events-none" />
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#531FFF] to-[#7B42FF] flex items-center justify-center text-white shadow-lg shadow-[#531FFF]/25 shrink-0 font-bold">
            <RoleIcon className="w-7 h-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Profil Pengguna</h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black bg-[#531FFF]/10 text-[#531FFF] border border-[#531FFF]/20">
                <BadgeCheck className="w-3.5 h-3.5" />
                {roleDefinition.badge}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {profileData.status}
              </span>
            </div>
            <p className="text-gray-500 text-xs sm:text-sm font-medium mt-1">
              Kelola informasi identitas akun, data kontak pribadi, dan keamanan kata sandi Anda.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center justify-center gap-2 bg-[#531FFF] hover:bg-[#4314cc] text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold shadow-md shadow-[#531FFF]/20 transition-all cursor-pointer active:scale-95"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Profil</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setIsEditing(false);
                setFormData(profileData);
              }}
              className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Batal</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Dual-Column Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ========================================================================= */}
        {/* LEFT COLUMN: IDENTITY SUMMARY CARD                                        */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* User Identity Card */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs relative overflow-hidden text-center">
            {/* Top Background Accent */}
            <div className="h-24 bg-gradient-to-r from-[#531FFF]/15 via-[#6E3BFF]/10 to-[#531FFF]/5 -mx-6 -mt-6 mb-4 relative" />

            {/* Avatar */}
            <div className="relative mx-auto w-24 h-24 -mt-16 mb-3">
              <div className="w-full h-full rounded-3xl ring-4 ring-white shadow-xl bg-gradient-to-tr from-[#531FFF] to-[#8252FF] text-white flex items-center justify-center font-black text-3xl overflow-hidden relative border border-gray-100">
                {profileData.imageUrl ? (
                  <Image 
                    src={profileData.imageUrl} 
                    alt={profileData.name} 
                    fill 
                    className="object-cover" 
                    unoptimized 
                  />
                ) : (
                  <span>{profileData.name ? profileData.name.charAt(0).toUpperCase() : "U"}</span>
                )}
              </div>
              <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full ring-1 ring-emerald-200 shadow-xs" title="Akun Aktif" />
            </div>

            {/* Name & Role */}
            <h2 className="text-xl font-black text-gray-900 tracking-tight leading-snug">
              {profileData.name}
            </h2>
            
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-[#531FFF]/10 text-[#531FFF] border border-[#531FFF]/20 uppercase tracking-wider flex items-center gap-1.5">
                <RoleIcon className="w-3.5 h-3.5" />
                {roleDefinition.name}
              </span>
            </div>

            {/* Role Description Callout */}
            <p className="text-xs text-gray-500 font-medium mt-2 leading-relaxed px-2">
              {roleDefinition.description}
            </p>

            <div className="h-px bg-gray-100 my-5" />

            {/* Quick Contact & Info List */}
            <div className="space-y-3 text-left">
              {/* Email */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/70 border border-gray-100 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-white text-[#531FFF] flex items-center justify-center shrink-0 border border-gray-200/80 shadow-2xs">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email Akun</p>
                    <p className="text-xs font-bold text-gray-900 truncate" title={profileData.email}>
                      {profileData.email || "-"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(profileData.email, "Email")}
                  className="p-1.5 text-gray-400 hover:text-[#531FFF] hover:bg-white rounded-lg transition-colors cursor-pointer"
                  title="Salin Email"
                >
                  {copiedField === "Email" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Phone / WhatsApp */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/70 border border-gray-100 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-white text-[#531FFF] flex items-center justify-center shrink-0 border border-gray-200/80 shadow-2xs">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">No. WhatsApp</p>
                    <p className="text-xs font-bold text-gray-900 truncate">
                      {profileData.phone || (matchedTeacher?.contact) || "Belum ditambahkan"}
                    </p>
                  </div>
                </div>
                {(profileData.phone || matchedTeacher?.contact) ? (
                  <a
                    href={`https://wa.me/${(profileData.phone || matchedTeacher?.contact).replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Buka Chat WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("biodata");
                      setIsEditing(true);
                    }}
                    className="text-[10px] font-bold text-[#531FFF] hover:underline cursor-pointer"
                  >
                    Tambah
                  </button>
                )}
              </div>

              {/* Tanggal Bergabung */}
              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-gray-50/70 border border-gray-100">
                <div className="w-8 h-8 rounded-xl bg-white text-[#531FFF] flex items-center justify-center shrink-0 border border-gray-200/80 shadow-2xs">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Terdaftar Sejak</p>
                  <p className="text-xs font-bold text-gray-900">{profileData.createdAt}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Account Security Info Card */}
          <div className="bg-gradient-to-br from-[#531FFF]/10 via-[#531FFF]/5 to-transparent rounded-3xl border border-[#531FFF]/20 p-5 space-y-2.5">
            <div className="flex items-center gap-2 text-[#531FFF]">
              <ShieldCheck className="w-5 h-5" />
              <h4 className="text-xs font-black uppercase tracking-wider">Keamanan Akun</h4>
            </div>
            <p className="text-xs font-medium text-gray-600 leading-relaxed">
              Akun Anda terlindungi dengan sistem otentikasi aman dan hak akses peran institusi.
            </p>
            <div className="flex items-center justify-between text-[11px] font-bold pt-1 text-gray-700">
              <span>Status Proteksi:</span>
              <span className="text-emerald-700 font-black">Aktif & Terverifikasi</span>
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: FOCUSED 2 TABS (BIODATA & KEAMANAN)                         */}
        {/* ========================================================================= */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Navigation Tabs Bar */}
          <div className="flex items-center gap-2 bg-gray-100/90 p-1.5 rounded-2xl border border-gray-200 w-full sm:w-fit">
            <button
              type="button"
              onClick={() => setActiveTab("biodata")}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap",
                activeTab === "biodata"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              )}
            >
              <User className="w-4 h-4 text-[#531FFF]" />
              <span>Biodata & Informasi Pribadi</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("security")}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap",
                activeTab === "security"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              )}
            >
              <Key className="w-4 h-4 text-[#531FFF]" />
              <span>Keamanan & Sandi</span>
            </button>
          </div>

          {/* ======================================================================= */}
          {/* TAB 1: BIODATA & INFORMASI PRIBADI                                      */}
          {/* ======================================================================= */}
          {activeTab === "biodata" && (
            <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-7 shadow-xs space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h3 className="text-lg font-black text-gray-900 tracking-tight">Informasi Pribadi & Kontak</h3>
                  <p className="text-xs font-medium text-gray-500 mt-0.5">
                    Data identitas resmi yang terhubung dengan akun Anda di Quick Schools.
                  </p>
                </div>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 text-xs font-extrabold text-[#531FFF] hover:underline cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Ubah Biodata</span>
                  </button>
                )}
              </div>

              {isEditing ? (
                <form onSubmit={handleSaveProfile} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700">Nama Lengkap & Gelar</label>
                      <input
                        type="text"
                        value={formData.name || ""}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700">Alamat Email (Akun Utama)</label>
                      <input
                        type="email"
                        value={formData.email || ""}
                        disabled
                        className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm font-semibold text-gray-400 cursor-not-allowed"
                      />
                      <p className="text-[10px] text-gray-400">Email akun terikat pada kredensial login.</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700">Nomor WhatsApp / HP</label>
                      <input
                        type="text"
                        value={formData.phone || ""}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="Contoh: 081234567890"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700">Jenis Kelamin</label>
                      <select
                        value={formData.gender || "Laki-laki"}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                      >
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                      </select>
                    </div>

                    {profileData.role === "guru" && (
                      <>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-700">NIP (Nomor Induk Pegawai)</label>
                          <input
                            type="text"
                            value={formData.nip || ""}
                            onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-700">Mata Pelajaran Utama</label>
                          <input
                            type="text"
                            value={formData.subject || ""}
                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                          />
                        </div>
                      </>
                    )}

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-bold text-gray-700">Alamat Lengkap Domisili</label>
                      <textarea
                        rows={3}
                        value={formData.address || ""}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Jl. Pendidikan No. 10, Kelurahan, Kecamatan..."
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setFormData(profileData);
                      }}
                      className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                      disabled={saving}
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-white bg-[#531FFF] hover:bg-[#4314cc] shadow-md shadow-[#531FFF]/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                      <Save className="w-4 h-4" />
                      <span>Simpan Perubahan</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-gray-50/70 border border-gray-100">
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Nama Lengkap</p>
                    <p className="text-sm font-bold text-gray-900 mt-1">{profileData.name}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-gray-50/70 border border-gray-100">
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Email Utama</p>
                    <p className="text-sm font-bold text-gray-900 mt-1">{profileData.email || "-"}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-gray-50/70 border border-gray-100">
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">No. WhatsApp / HP</p>
                    <p className="text-sm font-bold text-gray-900 mt-1">
                      {profileData.phone || matchedTeacher?.contact || "Belum dilengkapi"}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-gray-50/70 border border-gray-100">
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Jenis Kelamin</p>
                    <p className="text-sm font-bold text-gray-900 mt-1">{profileData.gender || "Laki-laki"}</p>
                  </div>

                  {profileData.role === "guru" && (
                    <>
                      <div className="p-4 rounded-2xl bg-gray-50/70 border border-gray-100">
                        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">NIP (Nomor Induk Pegawai)</p>
                        <p className="text-sm font-bold text-gray-900 mt-1">{profileData.nip || matchedTeacher?.nip || matchedTeacher?.id || "-"}</p>
                      </div>

                      <div className="p-4 rounded-2xl bg-gray-50/70 border border-gray-100">
                        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Mata Pelajaran</p>
                        <p className="text-sm font-bold text-[#531FFF] mt-1">{profileData.subject || matchedTeacher?.role || matchedTeacher?.subject || "-"}</p>
                      </div>
                    </>
                  )}

                  <div className="p-4 rounded-2xl bg-gray-50/70 border border-gray-100 md:col-span-2">
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Alamat Domisili</p>
                    <p className="text-sm font-bold text-gray-900 mt-1 leading-relaxed">
                      {profileData.address || "Belum ada informasi alamat yang dicantumkan."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================================= */}
          {/* TAB 2: KEAMANAN & SANDI                                                 */}
          {/* ======================================================================= */}
          {activeTab === "security" && (
            <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-7 shadow-xs space-y-6 animate-in fade-in duration-200">
              <div className="pb-4 border-b border-gray-100">
                <h3 className="text-lg font-black text-gray-900 tracking-tight">Keamanan Akun & Sandi</h3>
                <p className="text-xs font-medium text-gray-500 mt-0.5">
                  Perbarui kata sandi login dan kelola proteksi akun institusi Anda.
                </p>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-lg">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">Kata Sandi Baru</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      required
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(prev => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">Konfirmasi Kata Sandi Baru</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi baru"
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={updatingPassword}
                    className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-white bg-[#531FFF] hover:bg-[#4314cc] shadow-md shadow-[#531FFF]/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {updatingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Key className="w-4 h-4" />
                    <span>Perbarui Kata Sandi</span>
                  </button>
                </div>
              </form>

              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs font-medium leading-relaxed flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Pastikan kata sandi Anda menggunakan kombinasi huruf besar, huruf kecil, dan angka untuk menjaga keamanan akun institusi Anda.
                </span>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
