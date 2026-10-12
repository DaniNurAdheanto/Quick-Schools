"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
  EyeOff,
  Camera,
  ScanFace,
  Trash2,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  MapPin
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { ROLES, normalizeRole } from "@/lib/roles-config";
import dynamic from "next/dynamic";
import { getUserFaceBiometric, deleteUserFaceBiometric, FaceBiometricData } from "@/lib/face-biometric-service";

const FaceEnrolmentModal = dynamic(
  () => import("@/components/attendance/face-enrolment-modal").then((mod) => mod.FaceEnrolmentModal),
  { ssr: false }
);

type ProfileTab = "biodata" | "security" | "biometric";

// Helper to compress uploaded photo into lightweight Base64 JPEG data URL (~15-25KB)
async function compressImageFileToBase64(file: File, maxWidth = 360, quality = 0.75): Promise<string> {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement("img");
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve((e.target?.result as string) || "");
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", quality);
          resolve(compressed);
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

export default function ProfilePage() {
  const toast = useToast();
  const { userData, role: authRole, refreshUserData } = useAuth();
  
  const [activeTab, setActiveTab] = useState<ProfileTab>("biodata");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // User Profile State
  const [profileData, setProfileData] = useState<any>({
    id: "",
    uid: "",
    name: "",
    email: "",
    role: "admin",
    rawRole: "ADMIN",
    phone: "",
    nip: "",
    nisn: "",
    nis: "",
    subject: "",
    homeroomClass: "",
    className: "",
    major: "",
    level: "",
    childName: "",
    childClass: "",
    childNisn: "",
    address: "",
    status: "Aktif",
    gender: "Laki-laki",
    createdAt: "Terdaftar",
    imageUrl: ""
  });

  const [formData, setFormData] = useState<any>({});

  // Password update states
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Biometric Face ID states
  const [faceBiometric, setFaceBiometric] = useState<FaceBiometricData | null>(null);
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
  const [deletingBiometric, setDeletingBiometric] = useState(false);

  // Load Profile from DB
  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/auth/profile", {
        method: "GET",
        headers: { "Cache-Control": "no-cache" }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.user) {
          const u = json.user;
          const formattedDate = u.createdAt
            ? new Date(u.createdAt).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric"
              })
            : "Terdaftar";

          const merged = {
            id: u.id || u.uid,
            uid: u.id || u.uid,
            name: u.name || u.fullName || "User",
            email: u.email || "",
            role: u.role || normalizeRole(u.rawRole || "admin"),
            rawRole: u.rawRole || "ADMIN",
            phone: u.phone || "",
            nip: u.nip || "",
            nisn: u.nisn || "",
            nis: u.nis || "",
            subject: u.subject || "",
            homeroomClass: u.homeroomClass || "",
            className: u.className || "",
            major: u.major || "",
            level: u.level || "",
            childName: u.childName || "",
            childClass: u.childClass || "",
            childNisn: u.childNisn || "",
            address: u.address || "",
            status: u.status || "Aktif",
            gender: u.gender || "Laki-laki",
            createdAt: formattedDate,
            imageUrl: u.avatarUrl || u.imageUrl || u.photoUrl || ""
          };

          setProfileData(merged);
          setFormData(merged);

          // Fetch Face Biometric for this user
          if (merged.id) {
            getUserFaceBiometric(merged.id)
              .then((bio) => {
                if (bio && bio.isEnrolled) {
                  setFaceBiometric(bio);
                }
              })
              .catch(() => {});
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // If context already has user data, pre-populate to avoid flashing
    if (userData) {
      const roleStr = authRole || normalizeRole(userData.role || "admin");
      setProfileData((prev: any) => ({
        ...prev,
        id: userData.uid || userData.id || prev.id,
        uid: userData.uid || userData.id || prev.uid,
        name: userData.fullName || userData.name || prev.name,
        email: userData.email || prev.email,
        role: roleStr,
        phone: userData.phone || prev.phone,
        nip: userData.nip || prev.nip,
        nisn: userData.nisn || prev.nisn,
        subject: userData.subject || prev.subject,
        homeroomClass: userData.homeroomClass || prev.homeroomClass,
        className: userData.className || userData.class || prev.className,
        imageUrl: userData.avatarUrl || userData.imageUrl || userData.photoUrl || prev.imageUrl,
      }));
    }
    fetchProfile();
  }, [userData, authRole]);

  // Matched Role Definition from ROLES configuration in roles-config
  const roleDefinition = useMemo(() => {
    const roleId = profileData.role || "admin";
    const found = ROLES.find((r: any) => r.id === roleId || r.id === normalizeRole(roleId));
    if (found) return found;

    return {
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

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPhoto(true);
      const compressed = await compressImageFileToBase64(file, 360, 0.75);
      if (!compressed) throw new Error("Gagal memproses gambar");

      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: compressed })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengunggah foto profil");

      setProfileData((prev: any) => ({ ...prev, imageUrl: compressed, avatarUrl: compressed }));
      setFormData((prev: any) => ({ ...prev, imageUrl: compressed, avatarUrl: compressed }));
      await refreshUserData();
      toast.showSuccess("Foto profil berhasil diperbarui dan diselaraskan ke semua menu!", "Foto Tersimpan");
    } catch (err: any) {
      console.error("Error uploading profile photo:", err);
      toast.showError(err?.message || "Gagal mengunggah foto profil.", "Gagal");
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      const payload: any = {
        name: formData.name || "",
        phone: formData.phone || "",
        address: formData.address || "",
        gender: formData.gender || "Laki-laki"
      };

      if (profileData.role === "guru" && formData.nip !== undefined) {
        payload.nip = formData.nip;
      }

      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui profil");

      setProfileData((prev: any) => ({ ...prev, ...payload }));
      setIsEditing(false);
      await refreshUserData();
      toast.showSuccess("Informasi profil Anda berhasil diperbarui dan diselaraskan di seluruh sistem.", "Profil Tersimpan");
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

    try {
      setUpdatingPassword(true);
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengubah kata sandi");

      setNewPassword("");
      setConfirmPassword("");
      toast.showSuccess("Kata sandi akun Anda berhasil diperbarui.", "Sandi Berhasil Diubah");
    } catch (error: any) {
      console.error("Error updating password:", error);
      toast.showError(error?.message || "Gagal mengubah kata sandi.", "Gagal");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleDeleteBiometric = async () => {
    const targetUid = profileData.id || profileData.uid;
    if (!targetUid) return;
    if (!window.confirm("Apakah Anda yakin ingin menghapus data acuan wajah master biometrik Anda? Anda perlu merekam ulang jika ingin menggunakan Face Recognition AI.")) {
      return;
    }
    setDeletingBiometric(true);
    try {
      await deleteUserFaceBiometric(targetUid, profileData.role);
      setFaceBiometric(null);
      toast.showSuccess("Data wajah master biometrik berhasil dihapus.", "Dihapus");
    } catch (err: any) {
      toast.showError("Gagal menghapus data wajah: " + err.message, "Gagal");
    } finally {
      setDeletingBiometric(false);
    }
  };

  if (loading) {
    return (
      <div className="py-32 flex flex-col items-center justify-center gap-3 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#531FFF]" />
        <p className="text-sm font-semibold">Memuat data profil akun...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1500px] mx-auto w-full space-y-6 animate-in fade-in duration-300">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-xl p-6 sm:p-7 border border-gray-100 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-[#531FFF]/5 via-[#531FFF]/2 to-transparent pointer-events-none" />
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-lg bg-gradient-to-tr from-[#531FFF] to-[#7B42FF] flex items-center justify-center text-white shadow-lg shadow-[#531FFF]/25 shrink-0 font-bold">
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
              onClick={() => {
                setFormData(profileData);
                setIsEditing(true);
              }}
              className="flex items-center justify-center gap-2 bg-[#531FFF] hover:bg-[#4314cc] text-white px-5 py-2.5 rounded-lg text-xs sm:text-sm font-extrabold shadow-md shadow-[#531FFF]/20 transition-all cursor-pointer active:scale-95"
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
              className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer"
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
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-xs relative overflow-hidden text-center">
            {/* Top Background Accent */}
            <div className="h-24 bg-gradient-to-r from-[#531FFF]/15 via-[#6E3BFF]/10 to-[#531FFF]/5 -mx-6 -mt-6 mb-4 relative" />

            {/* Avatar */}
            <div className="relative mx-auto w-24 h-24 -mt-16 mb-3 group">
              <ProfileAvatar
                name={profileData.name}
                imageUrl={profileData.imageUrl}
                role={profileData.role}
                size="2xl"
                shape="rounded-xl"
                ring="ring-4 ring-white shadow-xl"
                className="w-24 h-24"
              />

              {/* Photo Upload Trigger Button */}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                title="Ubah Foto Profil"
                className="absolute inset-0 bg-black/45 hover:bg-black/60 text-white rounded-xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-xs z-10"
              >
                {uploadingPhoto ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Camera className="w-5 h-5" />
                    <span className="text-[10px] font-bold mt-0.5">Ubah Foto</span>
                  </>
                )}
              </button>

              <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full ring-1 ring-emerald-200 shadow-xs z-20" title="Akun Aktif" />
            </div>

            {/* Name & Role */}
            <h2 className="text-xl font-black text-gray-900 tracking-tight leading-snug">
              {profileData.name || "Nama Pengguna"}
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

            {/* Face ID Status Pill */}
            <div className="mt-3 flex items-center justify-center">
              {faceBiometric?.isEnrolled ? (
                <button
                  type="button"
                  onClick={() => setActiveTab("biometric")}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  <ScanFace className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Face ID Aktif ({faceBiometric.qualityScore || 90}%)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab("biometric")}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-[#531FFF] border border-purple-200 hover:bg-purple-100 transition-colors cursor-pointer"
                >
                  <ScanFace className="w-3.5 h-3.5" />
                  <span>Daftarkan Face ID</span>
                </button>
              )}
            </div>

            <div className="h-px bg-gray-100 my-5" />

            {/* Quick Contact & Info List */}
            <div className="space-y-3 text-left">
              {/* Email */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50/70 border border-gray-100 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white text-[#531FFF] flex items-center justify-center shrink-0 border border-gray-200/80 shadow-2xs">
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
                  className="p-1.5 text-gray-400 hover:text-[#531FFF] hover:bg-white rounded-md transition-colors cursor-pointer"
                  title="Salin Email"
                >
                  {copiedField === "Email" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Phone / WhatsApp */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50/70 border border-gray-100 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white text-[#531FFF] flex items-center justify-center shrink-0 border border-gray-200/80 shadow-2xs">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">No. WhatsApp</p>
                    <p className="text-xs font-bold text-gray-900 truncate">
                      {profileData.phone || "Belum ditambahkan"}
                    </p>
                  </div>
                </div>
                {profileData.phone ? (
                  <a
                    href={`https://wa.me/${profileData.phone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                    title="Buka Chat WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("biodata");
                      setFormData(profileData);
                      setIsEditing(true);
                    }}
                    className="text-[10px] font-bold text-[#531FFF] hover:underline cursor-pointer"
                  >
                    Tambah
                  </button>
                )}
              </div>

              {/* Tanggal Bergabung */}
              <div className="flex items-center gap-2.5 p-3 rounded-lg bg-gray-50/70 border border-gray-100">
                <div className="w-8 h-8 rounded-lg bg-white text-[#531FFF] flex items-center justify-center shrink-0 border border-gray-200/80 shadow-2xs">
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
          <div className="bg-gradient-to-br from-[#531FFF]/10 via-[#531FFF]/5 to-transparent rounded-xl border border-[#531FFF]/20 p-5 space-y-2.5">
            <div className="flex items-center gap-2 text-[#531FFF]">
              <ShieldCheck className="w-5 h-5" />
              <h4 className="text-xs font-black uppercase tracking-wider">Keamanan Akun</h4>
            </div>
            <p className="text-xs font-medium text-gray-600 leading-relaxed">
              Akun Anda terlindungi dengan sistem otentikasi database terenkripsi dan hak akses institusi resmi.
            </p>
            <div className="flex items-center justify-between text-[11px] font-bold pt-1 text-gray-700">
              <span>Status Proteksi:</span>
              <span className="text-emerald-700 font-black">Aktif & Terverifikasi</span>
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: 3 TABS (BIODATA, KEAMANAN, BIOMETRIK)                       */}
        {/* ========================================================================= */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Navigation Tabs Bar */}
          <div className="flex items-center gap-2 bg-gray-100/90 p-1.5 rounded-lg border border-gray-200 w-full sm:w-fit overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("biodata")}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap",
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
                "flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap",
                activeTab === "security"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              )}
            >
              <Key className="w-4 h-4 text-[#531FFF]" />
              <span>Keamanan & Sandi</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("biometric")}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap",
                activeTab === "biometric"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              )}
            >
              <ScanFace className="w-4 h-4 text-[#531FFF]" />
              <span>Biometrik Wajah (Face ID)</span>
              {faceBiometric?.isEnrolled && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              )}
            </button>
          </div>

          {/* ======================================================================= */}
          {/* TAB 1: BIODATA & INFORMASI PRIBADI                                      */}
          {/* ======================================================================= */}
          {activeTab === "biodata" && (
            <div className="bg-white rounded-xl border border-gray-100 p-6 sm:p-7 shadow-xs space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h3 className="text-lg font-black text-gray-900 tracking-tight">Informasi Pribadi & Kontak</h3>
                  <p className="text-xs font-medium text-gray-500 mt-0.5">
                    Data identitas resmi yang terhubung dengan akun Anda di Quick Schools.
                  </p>
                </div>
                {!isEditing && (
                  <button
                    onClick={() => {
                      setFormData(profileData);
                      setIsEditing(true);
                    }}
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
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700">Alamat Email (Akun Utama)</label>
                      <input
                        type="email"
                        value={formData.email || ""}
                        disabled
                        className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm font-semibold text-gray-400 cursor-not-allowed"
                      />
                      <p className="text-[10px] text-gray-400">Email akun terikat pada kredensial login institusi.</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700">Nomor WhatsApp / HP</label>
                      <input
                        type="text"
                        value={formData.phone || ""}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="Contoh: 081234567890"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700">Jenis Kelamin</label>
                      <select
                        value={formData.gender || "Laki-laki"}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                      >
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                      </select>
                    </div>

                    {profileData.role === "guru" && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700">NIP (Nomor Induk Pegawai)</label>
                        <input
                          type="text"
                          value={formData.nip || ""}
                          onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                          placeholder="Nomor Induk Pegawai"
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-bold text-gray-700">Alamat Lengkap Domisili</label>
                      <textarea
                        rows={3}
                        value={formData.address || ""}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Jl. Pendidikan No. 10, Kelurahan, Kecamatan..."
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
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
                      className="px-5 py-2.5 rounded-lg text-xs sm:text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                      disabled={saving}
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2.5 rounded-lg text-xs sm:text-sm font-extrabold text-white bg-[#531FFF] hover:bg-[#4314cc] shadow-md shadow-[#531FFF]/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                      <Save className="w-4 h-4" />
                      <span>Simpan Perubahan</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-5">
                  {/* General Profile Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-gray-50/70 border border-gray-100">
                      <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Nama Lengkap</p>
                      <p className="text-sm font-bold text-gray-900 mt-1">{profileData.name || "-"}</p>
                    </div>

                    <div className="p-4 rounded-lg bg-gray-50/70 border border-gray-100">
                      <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Email Utama</p>
                      <p className="text-sm font-bold text-gray-900 mt-1">{profileData.email || "-"}</p>
                    </div>

                    <div className="p-4 rounded-lg bg-gray-50/70 border border-gray-100">
                      <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">No. WhatsApp / HP</p>
                      <p className="text-sm font-bold text-gray-900 mt-1">
                        {profileData.phone || "Belum dilengkapi"}
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-gray-50/70 border border-gray-100">
                      <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Jenis Kelamin</p>
                      <p className="text-sm font-bold text-gray-900 mt-1">{profileData.gender || "Laki-laki"}</p>
                    </div>
                  </div>

                  {/* Role Specific Section */}
                  <div className="pt-2">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <RoleIcon className="w-4 h-4 text-[#531FFF]" />
                      Informasi Penugasan & Data Institusi ({roleDefinition.name})
                    </h4>

                    {/* Siswa Details */}
                    {profileData.role === "siswa" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100">
                          <p className="text-[10px] font-bold text-[#531FFF] uppercase tracking-wider">NISN</p>
                          <p className="text-sm font-black text-gray-900 mt-1">{profileData.nisn || "-"}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100">
                          <p className="text-[10px] font-bold text-[#531FFF] uppercase tracking-wider">Kelas</p>
                          <p className="text-sm font-black text-gray-900 mt-1">{profileData.className || "-"}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100">
                          <p className="text-[10px] font-bold text-[#531FFF] uppercase tracking-wider">Jurusan</p>
                          <p className="text-sm font-black text-gray-900 mt-1">{profileData.major || "MIPA / IPS"}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100">
                          <p className="text-[10px] font-bold text-[#531FFF] uppercase tracking-wider">Jenjang</p>
                          <p className="text-sm font-black text-gray-900 mt-1">{profileData.level ? `Tingkat ${profileData.level}` : "SMA"}</p>
                        </div>
                      </div>
                    )}

                    {/* Guru Details */}
                    {profileData.role === "guru" && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100">
                          <p className="text-[10px] font-bold text-[#531FFF] uppercase tracking-wider">NIP (Nomor Induk Pegawai)</p>
                          <p className="text-sm font-black text-gray-900 mt-1">{profileData.nip || "-"}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100">
                          <p className="text-[10px] font-bold text-[#531FFF] uppercase tracking-wider">Mata Pelajaran</p>
                          <p className="text-sm font-black text-[#531FFF] mt-1">{profileData.subject || "-"}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100">
                          <p className="text-[10px] font-bold text-[#531FFF] uppercase tracking-wider">Wali Kelas</p>
                          <p className="text-sm font-black text-gray-900 mt-1">{profileData.homeroomClass ? `Kelas ${profileData.homeroomClass}` : "Bukan Wali Kelas"}</p>
                        </div>
                      </div>
                    )}

                    {/* Orang Tua Details */}
                    {profileData.role === "orang-tua" && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100">
                          <p className="text-[10px] font-bold text-[#531FFF] uppercase tracking-wider">Anak yang Didampingi</p>
                          <p className="text-sm font-black text-gray-900 mt-1">{profileData.childName || "-"}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100">
                          <p className="text-[10px] font-bold text-[#531FFF] uppercase tracking-wider">Kelas Anak</p>
                          <p className="text-sm font-black text-[#531FFF] mt-1">{profileData.childClass || "-"}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100">
                          <p className="text-[10px] font-bold text-[#531FFF] uppercase tracking-wider">NISN Siswa</p>
                          <p className="text-sm font-black text-gray-900 mt-1">{profileData.childNisn || "-"}</p>
                        </div>
                      </div>
                    )}

                    {/* Admin / Kepala Sekolah Details */}
                    {["admin", "super-admin", "kepala-sekolah"].includes(profileData.role) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100">
                          <p className="text-[10px] font-bold text-[#531FFF] uppercase tracking-wider">Hak Akses Sistem</p>
                          <p className="text-sm font-black text-gray-900 mt-1">{roleDefinition.badge}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100">
                          <p className="text-[10px] font-bold text-[#531FFF] uppercase tracking-wider">Institusi / Sekolah</p>
                          <p className="text-sm font-black text-[#531FFF] mt-1">SMA Keren Parah</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Address Section */}
                  <div className="p-4 rounded-lg bg-gray-50/70 border border-gray-100">
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      Alamat Domisili
                    </p>
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
            <div className="bg-white rounded-xl border border-gray-100 p-6 sm:p-7 shadow-xs space-y-6 animate-in fade-in duration-200">
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
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
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
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={updatingPassword}
                    className="px-6 py-2.5 rounded-lg text-xs sm:text-sm font-extrabold text-white bg-[#531FFF] hover:bg-[#4314cc] shadow-md shadow-[#531FFF]/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {updatingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Key className="w-4 h-4" />
                    <span>Perbarui Kata Sandi</span>
                  </button>
                </div>
              </form>

              <div className="p-4 rounded-lg bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs font-medium leading-relaxed flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Pastikan kata sandi Anda menggunakan kombinasi huruf besar, huruf kecil, dan angka untuk menjaga keamanan akun institusi Anda.
                </span>
              </div>
            </div>
          )}

          {/* ======================================================================= */}
          {/* TAB 3: BIOMETRIK WAJAH (FACE ID)                                        */}
          {/* ======================================================================= */}
          {activeTab === "biometric" && (
            <div className="bg-white rounded-xl border border-gray-100 p-6 sm:p-7 shadow-xs space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
                <div>
                  <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                    <ScanFace className="w-5 h-5 text-[#531FFF]" />
                    Pendaftaran &amp; Manajemen Wajah Master (Face ID)
                  </h3>
                  <p className="text-xs font-medium text-gray-500 mt-0.5">
                    Data acuan biometrik resmi untuk validasi kehadiran cerdas bertenaga AI.
                  </p>
                </div>
                {faceBiometric?.isEnrolled && (
                  <button
                    type="button"
                    onClick={() => setIsFaceModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-[#531FFF] bg-[#531FFF]/10 hover:bg-[#531FFF]/15 transition-colors cursor-pointer w-fit"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Pindai Ulang Wajah</span>
                  </button>
                )}
              </div>

              {faceBiometric?.isEnrolled ? (
                <div className="space-y-6">
                  {/* Master Face Detail Card */}
                  <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950 border border-purple-500/20 text-white shadow-lg space-y-5">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                      <div className="relative w-32 h-32 rounded-2xl overflow-hidden border-2 border-emerald-400 shadow-xl shrink-0 group">
                        <img
                          src={faceBiometric.photoUrl}
                          alt="Master Face"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider shadow-xs">
                          {faceBiometric.qualityScore || 95}% AI
                        </div>
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 text-center">
                          <span className="text-[9px] font-mono text-emerald-300">MASTER ACTIVE</span>
                        </div>
                      </div>

                      <div className="space-y-3 flex-1 text-center sm:text-left">
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            Terdaftar Resmi
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-mono">
                            128-Vektor Descriptors
                          </span>
                        </div>

                        <div>
                          <h4 className="text-base font-bold text-white">
                            {faceBiometric.userName || profileData.name}
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Didaftarkan pada:{" "}
                            <span className="text-slate-200 font-medium">
                              {faceBiometric.enrolledAt
                                ? new Date(faceBiometric.enrolledAt).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }) + " WIB"
                                : "Terdaftar"}
                            </span>
                          </p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 text-left">
                          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                            <span className="text-[10px] text-slate-400 block font-medium">Model AI</span>
                            <span className="text-xs font-bold text-purple-300">Biometric 128D</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                            <span className="text-[10px] text-slate-400 block font-medium">Ambang Batas</span>
                            <span className="text-xs font-bold text-emerald-300">Min. 70% Match</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 col-span-2 sm:col-span-1">
                            <span className="text-[10px] text-slate-400 block font-medium">Status Cloud</span>
                            <span className="text-xs font-bold text-blue-300">Tersinkronisasi</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                      <p className="text-slate-400 text-[11px] text-center sm:text-left">
                        Data vektor wajah disimpan dalam format aman dan terenkripsi untuk perlindungan privasi.
                      </p>
                      <button
                        type="button"
                        onClick={handleDeleteBiometric}
                        disabled={deletingBiometric}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-red-400 hover:text-red-300 hover:bg-red-950/40 border border-red-500/20 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        {deletingBiometric ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        <span>Hapus Data Wajah</span>
                      </button>
                    </div>
                  </div>

                  {/* Info Box */}
                  <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200/80 text-purple-950 text-xs space-y-2">
                    <p className="font-bold flex items-center gap-1.5 text-purple-900">
                      <Sparkles className="w-4 h-4 text-[#531FFF]" />
                      Cara Kerja Presensi Face Recognition
                    </p>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      Saat sekolah atau kelas mengaktifkan mode <strong>Face Recognition (AI)</strong>, kamera presensi harian akan mendeteksi dan mengekstrak vektor wajah Anda secara real-time, lalu memverifikasinya terhadap foto master ini. Jika tingkat kecocokan memenuhi standar (&ge; 70%), presensi akan langsung tercatat otomatis.
                    </p>
                  </div>
                </div>
              ) : (
                /* Unenrolled Empty State */
                <div className="text-center py-10 px-4 space-y-6 max-w-lg mx-auto">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#531FFF]/10 via-[#7942FF]/15 to-[#531FFF]/5 text-[#531FFF] flex items-center justify-center mx-auto border-2 border-[#531FFF]/20 shadow-lg shadow-[#531FFF]/10">
                    <ScanFace className="w-10 h-10 animate-pulse" />
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xl font-black text-gray-900 tracking-tight">
                      Wajah Master Belum Didaftarkan
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed">
                      Daftarkan acuan wajah Anda untuk mengaktifkan fitur <strong>Face Recognition (AI)</strong> pada absensi sekolah. Proses ini hanya memakan waktu 5 detik.
                    </p>
                  </div>

                  {/* 3 Step Guidance */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left pt-2">
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-[10px] font-bold text-[#531FFF] block">Langkah 1</span>
                      <p className="text-xs font-bold text-gray-900 mt-0.5">Buka Kamera</p>
                      <p className="text-[10px] text-gray-500 mt-1">Berikan izin akses kamera perangkat Anda.</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-[10px] font-bold text-[#531FFF] block">Langkah 2</span>
                      <p className="text-xs font-bold text-gray-900 mt-0.5">Posisikan Wajah</p>
                      <p className="text-[10px] text-gray-500 mt-1">Posisikan wajah di tengah bingkai oval panduan.</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-[10px] font-bold text-[#531FFF] block">Langkah 3</span>
                      <p className="text-xs font-bold text-gray-900 mt-0.5">Tersimpan Otomatis</p>
                      <p className="text-[10px] text-gray-500 mt-1">Sistem mengekstrak vektor biometrik master.</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setIsFaceModalOpen(true)}
                      className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#531FFF] to-[#7942FF] hover:from-[#4314cc] hover:to-[#6a34ea] text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-[#531FFF]/25 transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer active:scale-95"
                    >
                      <ScanFace className="w-4 h-4" />
                      <span>Mulai Pendaftaran Wajah Sekarang</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Face Enrolment Modal */}
      <FaceEnrolmentModal
        isOpen={isFaceModalOpen}
        onClose={() => setIsFaceModalOpen(false)}
        userUid={profileData.id || profileData.uid}
        userName={profileData.name || "Pengguna"}
        userRole={profileData.role || "user"}
        studentId={profileData.nisn || profileData.id}
        nip={profileData.nip || ""}
        onSuccess={(bio) => {
          setFaceBiometric(bio);
          setIsFaceModalOpen(false);
          toast.showSuccess("Wajah master biometrik berhasil diperbarui!", "Tersimpan");
        }}
      />

    </div>
  );
}
