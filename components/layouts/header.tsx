"use client";

import { 
  Bell, 
  ChevronDown, 
  ChevronRight, 
  Home, 
  Calendar, 
  User, 
  LogOut, 
  Loader2, 
  RotateCcw, 
  Menu, 
  X,
  Settings,
  CalendarDays
} from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import React, { useEffect, useState, useRef, useMemo } from "react";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { useSidebar } from "@/context/SidebarContext";
import { useSchoolProfile } from "@/context/SchoolProfileContext";
import { cn } from "@/lib/utils";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { useAuth } from "@/context/AuthContext";
import { useNotificationBadges } from "@/context/NotificationBadgeContext";
import { NotificationCenterDropdown } from "@/components/notifications/notification-center-dropdown";

const ROUTE_LABELS: Record<string, string> = {
  "dashboard": "Dashboard",
  "saas-dashboard": "Dashboard SaaS",
  "data-siswa": "Data Siswa",
  "teachers": "Staff Guru",
  "parents": "Data Orang Tua",
  "classes": "Rombel & Kelas",
  "homeroom": "Wali Kelas",
  "subjects": "Mata Pelajaran",
  "attendance": "Presensi Siswa",
  "teacher-attendance": "Absensi Guru",
  "leave-requests": "Izin & Sakit",
  "schedule": "Jadwal Pelajaran",
  "grades": "Penilaian",
  "report-cards": "Rapor Digital",
  "exams": "Jadwal Ujian",
  "academic-years": "Tahun Ajaran",
  "payments": "Pembayaran SPP",
  "financial-reports": "Laporan Keuangan",
  "announcements": "Pengumuman",
  "profile": "Profil Pengguna",
  "settings": "Pengaturan Sekolah",
  "accounts": "Manajemen Akun",
  "roles": "Role & Permission",
  "saas-customers": "Kelola Pelanggan",
  "saas-school-admins": "Super Admin Sekolah",
  "subscription-requests": "Permintaan Berlangganan",
  "saas-packages": "Paket Layanan SaaS",
  "saas-billing": "Tagihan & Pembayaran",
  "calendar": "Kalender Akademik",
  "onboarding": "Onboarding Siswa",
};

export function Header() {
  const pathname = usePathname();
  const { profile } = useSchoolProfile();
  const {
    userName,
    userRole,
    userEmail,
    userAvatar,
    userData,
    isAuthLoading,
    isSuperAdmin,
    isAdmin,
    isSaaSAdmin,
    logout,
  } = useAuth();

  const { totalUnreadCount } = useNotificationBadges();
  const { isMobileOpen, toggleMobile } = useSidebar();

  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const profileDropdownRef = useRef<HTMLDivElement>(null);

  const { 
    activeAcademicYear, 
    activeSemester, 
    availableYears, 
    isArchiveMode,
    schoolDefaultYear,
    schoolDefaultSemester,
    resetToSchoolDefault,
    setActiveAcademicYear, 
    setActiveSemester 
  } = useAcademicYear();

  const isExplicitActive = userData?.status === "Aktif" || userData?.status === "Active" || userData?.isActive === true;
  const onboardingCompleted = isExplicitActive || (userData?.onboardingCompleted ?? (userData?.status !== "Belum Onboarding"));
  const hasPendingReminder = !isExplicitActive && (Boolean(userData?.pendingOnboardingReminder) || (onboardingCompleted === false));

  // Handle outside click to close profile dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      setShowLogoutConfirm(false);
      await logout("/login");
    } catch (error) {
      console.error("Error signing out:", error);
      setIsLoggingOut(false);
    }
  };
  
  // Breadcrumb generator with friendly Indonesian dictionary
  const breadcrumbs = useMemo(() => {
    if (!pathname) return [{ label: "Home", href: "/dashboard" }];
    
    const pathWithoutQuery = pathname.split("?")[0];
    const pathParts = pathWithoutQuery.split("/").filter(Boolean);
    
    if (pathParts.length === 0 || (pathParts.length === 1 && pathParts[0] === "dashboard")) {
      return [{ label: "Home", href: "/dashboard" }, { label: "Dashboard", href: "/dashboard" }];
    }
    
    const crumbs = [{ label: "Home", href: isSaaSAdmin ? "/saas-dashboard" : "/dashboard" }];
    
    let currentPath = "";
    pathParts.forEach((part) => {
      currentPath += `/${part}`;
      if (part === "dashboard" || part === "admin" || part === "(protected)") return;
      
      const formattedLabel = ROUTE_LABELS[part] || part
        .replace(/-/g, " ")
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
        
      crumbs.push({ label: formattedLabel, href: currentPath });
    });
    
    return crumbs;
  }, [pathname, isSaaSAdmin]);

  const currentPageLabel = breadcrumbs[breadcrumbs.length - 1]?.label || "Dashboard";
  const isStudentUnboarded = onboardingCompleted === false && (userRole === "siswa" || userRole === "student" || userRole === "");

  return (
    <div className="flex flex-col w-full sticky top-0 z-40 shrink-0">
      <header className="h-[68px] sm:h-[72px] bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-[0_1px_3px_0_rgba(0,0,0,0.02)] flex items-center px-3 sm:px-6 lg:px-8 shrink-0 w-full transition-all duration-200 justify-between gap-2 sm:gap-4">
        
        {/* ========================================================================= */}
        {/* LEFT SECTION: Hamburger Toggle, Mobile School Emblem, Breadcrumbs         */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {/* Mobile drawer toggle (< lg) with animated icon morphing */}
          <button
            type="button"
            onClick={toggleMobile}
            className={cn(
              "lg:hidden w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-95 shrink-0 border",
              isMobileOpen
                ? "bg-[#531FFF]/10 border-[#531FFF]/30 text-[#531FFF] shadow-xs"
                : "bg-slate-100/90 hover:bg-[#531FFF]/10 border-slate-200/80 text-slate-700 hover:text-[#531FFF] shadow-2xs"
            )}
            title={isMobileOpen ? "Tutup Menu" : "Buka Menu Navigasi"}
            aria-label={isMobileOpen ? "Tutup Menu Navigasi" : "Buka Menu Navigasi"}
            aria-expanded={isMobileOpen}
          >
            {isMobileOpen ? (
              <X className="w-5 h-5 text-[#531FFF] transition-transform animate-in spin-in-90 duration-150" />
            ) : (
              <Menu className="w-5 h-5 text-slate-700 transition-transform" />
            )}
          </button>

          {/* Compact Mobile School / Brand Chip (< sm) */}
          <div className="sm:hidden flex items-center gap-1.5 min-w-0 shrink">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#531FFF] to-[#7B42FF] text-white flex items-center justify-center shrink-0 shadow-xs overflow-hidden relative p-1">
              {profile?.logoUrl ? (
                <Image
                  src={profile.logoUrl}
                  alt={profile.schoolName || "Logo"}
                  fill
                  className="object-contain p-0.5"
                  unoptimized
                />
              ) : (
                <span className="font-black text-[11px] tracking-tight">QS</span>
              )}
            </div>
            <span className="font-extrabold text-xs text-slate-900 truncate max-w-[100px]" title={currentPageLabel}>
              {currentPageLabel}
            </span>
          </div>

          {/* Desktop & Tablet Breadcrumb Hierarchy (>= sm) */}
          <nav aria-label="Breadcrumb" className="hidden sm:flex max-w-full overflow-hidden min-w-0">
            <ol className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium truncate">
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                const isFirst = index === 0;

                return (
                  <li 
                    key={`${crumb.href}-${index}`} 
                    className={cn(
                      "flex items-center gap-1.5 sm:gap-2 min-w-0",
                      !isLast && !isFirst && "hidden md:flex"
                    )}
                  >
                    {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                    {isLast ? (
                      <span className="text-[#531FFF] font-extrabold truncate max-w-[140px] md:max-w-none">
                        {crumb.label}
                      </span>
                    ) : (
                      <Link 
                        href={crumb.href} 
                        className="text-slate-400 hover:text-slate-700 transition-colors flex items-center gap-1 shrink-0 font-semibold"
                      >
                        {index === 0 && <Home className="w-3.5 h-3.5 text-slate-400" />}
                        <span className="hidden md:inline">{crumb.label}</span>
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>

        {/* ========================================================================= */}
        {/* CENTER SECTION: Academic Year & Semester Switcher                         */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-center shrink-0 mx-1 sm:mx-2">
          <div className={cn(
            "flex items-center gap-1 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-xl border transition-all shadow-2xs",
            isArchiveMode 
              ? "bg-amber-50/80 border-amber-300 ring-2 ring-amber-100" 
              : "bg-slate-50/80 hover:bg-white border-slate-200/90 hover:border-[#531FFF]/40"
          )}>
            <Calendar className={cn("w-3.5 h-3.5 shrink-0", isArchiveMode ? "text-amber-600" : "text-[#531FFF]")} />
            
            {/* Year Selector */}
            <select
              value={activeAcademicYear}
              onChange={(e) => setActiveAcademicYear(e.target.value)}
              className="bg-transparent text-[11px] sm:text-xs font-black text-slate-800 focus:outline-none cursor-pointer max-w-[85px] sm:max-w-none"
              title="Pilih Tahun Ajaran Aktif / Arsip"
            >
              {availableYears.map((y) => {
                const yName = y.name || y.id;
                const isDefault = y.name === schoolDefaultYear || y.isDefault;
                return (
                  <option key={y.id || yName} value={yName}>
                    {yName} {isDefault ? "(Aktif)" : "(Arsip)"}
                  </option>
                );
              })}
            </select>

            <span className="text-slate-300 font-normal hidden sm:inline">|</span>

            {/* Semester Selector */}
            <select
              value={activeSemester}
              onChange={(e) => setActiveSemester(e.target.value as "Ganjil" | "Genap")}
              className={cn(
                "hidden sm:inline-block bg-transparent text-xs font-black focus:outline-none cursor-pointer",
                isArchiveMode ? "text-amber-700" : "text-[#531FFF]"
              )}
              title="Pilih Semester"
            >
              <option value="Ganjil">Sem. Ganjil</option>
              <option value="Genap">Sem. Genap</option>
            </select>

            {isArchiveMode && (
              <button
                type="button"
                onClick={resetToSchoolDefault}
                className="hidden xl:inline-flex items-center gap-1 ml-1 text-[10px] font-black text-amber-800 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                title={`Sedang melihat arsip periode. Klik untuk kembali ke periode aktif sekolah (${schoolDefaultYear} - ${schoolDefaultSemester})`}
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT SECTION: Notification Center & User Profile Dropdown               */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-3 shrink-0">
          
          {/* Notification Center Trigger */}
          <div className="relative">
            <button 
              type="button"
              onClick={() => {
                setShowNotifDropdown(prev => !prev);
                setShowProfileDropdown(false);
              }}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 border relative",
                showNotifDropdown
                  ? "bg-[#531FFF]/10 border-[#531FFF]/30 text-[#531FFF] shadow-xs"
                  : "bg-slate-100/90 hover:bg-[#531FFF]/10 border-slate-200/80 text-slate-600 hover:text-[#531FFF] shadow-2xs"
              )}
              title="Pusat Notifikasi & Pembaruan"
              aria-label="Pusat Notifikasi"
            >
              <Bell className="w-[18px] h-[18px]" />
              {totalUnreadCount > 0 ? (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#531FFF] text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-xs border-2 border-white animate-in zoom-in-75">
                  {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
                </span>
              ) : (!onboardingCompleted || hasPendingReminder) ? (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white animate-pulse" />
              ) : (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white" />
              )}
            </button>

            {/* Notification Center Dropdown Panel */}
            <NotificationCenterDropdown
              isOpen={showNotifDropdown}
              onClose={() => setShowNotifDropdown(false)}
            />
          </div>

          <div className="h-6 w-px bg-slate-200/80 hidden sm:block" />

          {/* Profile Dropdown Container */}
          <div className="relative" ref={profileDropdownRef}>
            {isAuthLoading ? (
              <div className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 animate-pulse select-none">
                <div className="w-9 h-9 rounded-full bg-slate-200 shrink-0" />
                <div className="hidden sm:flex flex-col gap-1 min-w-[70px]">
                  <div className="w-12 h-2.5 bg-slate-200 rounded" />
                  <div className="w-20 h-3 bg-slate-200 rounded" />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowProfileDropdown(prev => !prev);
                  setShowNotifDropdown(false);
                }}
                className={cn(
                  "flex items-center gap-2 sm:gap-2.5 p-1 sm:px-2 sm:py-1 rounded-xl transition-all border text-left cursor-pointer active:scale-98",
                  showProfileDropdown 
                    ? "bg-[#531FFF]/10 border-[#531FFF]/30 ring-2 ring-[#531FFF]/20 shadow-xs" 
                    : "hover:bg-slate-100/80 border-transparent hover:border-slate-200/80"
                )}
                title="Menu Profil Pengguna"
                aria-label="Menu Profil Pengguna"
              >
                <div className="relative">
                  <ProfileAvatar
                    name={userName}
                    imageUrl={userAvatar}
                    role={userRole}
                    size="sm"
                    shape="circle"
                    ring="ring-2 ring-white shadow-2xs"
                    showBadge={true}
                    badgeStatus="online"
                  />
                </div>
                <div className="flex flex-col text-left hidden sm:flex min-w-0">
                  <span className="text-[10px] text-[#531FFF] font-black uppercase tracking-wider leading-none">
                    {userRole || "Pengguna"}
                  </span>
                  <span className="text-xs font-extrabold text-slate-900 leading-tight truncate max-w-[110px] mt-0.5">
                    {userName}
                  </span>
                </div>
                <ChevronDown className={cn(
                  "w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ml-0.5",
                  showProfileDropdown && "rotate-180 text-[#531FFF]"
                )} />
              </button>
            )}

            {/* Profile Dropdown Menu Card */}
            {showProfileDropdown && (
              <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-24px)] bg-white/98 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-100 p-2.5 z-50 animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-150">
                {/* Header with Avatar, Name, Email, and Role Badge */}
                <div className="p-3 bg-gradient-to-r from-[#531FFF]/8 via-[#531FFF]/4 to-transparent rounded-xl flex items-center gap-3 border border-[#531FFF]/10 mb-1.5">
                  <ProfileAvatar
                    name={userName}
                    imageUrl={userAvatar}
                    role={userRole}
                    size="md"
                    shape="circle"
                    ring="ring-2 ring-white shadow-xs"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-black text-slate-900 truncate leading-snug">
                      {userName}
                    </h4>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                      {userEmail || "-"}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#531FFF]/15 text-[#531FFF] uppercase tracking-wider">
                        {userRole || "Pengguna"}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Aktif
                      </span>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-slate-100 my-1" />

                {/* Quick Navigation Items */}
                <div className="space-y-1">
                  <Link
                    href="/profile"
                    onClick={() => setShowProfileDropdown(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:text-[#531FFF] hover:bg-[#531FFF]/5 transition-all group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-[#531FFF]/10 text-slate-500 group-hover:text-[#531FFF] flex items-center justify-center transition-colors shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="leading-tight">Profil Akun Saya</p>
                      <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate">Lihat dan ubah informasi data diri</p>
                    </div>
                  </Link>

                  {(isSuperAdmin || isAdmin) && (
                    <Link
                      href="/settings"
                      onClick={() => setShowProfileDropdown(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:text-[#531FFF] hover:bg-[#531FFF]/5 transition-all group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-[#531FFF]/10 text-slate-500 group-hover:text-[#531FFF] flex items-center justify-center transition-colors shrink-0">
                        <Settings className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="leading-tight">Pengaturan Sekolah</p>
                        <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate">Konfigurasi kurikulum & presensi</p>
                      </div>
                    </Link>
                  )}

                  <Link
                    href="/calendar"
                    onClick={() => setShowProfileDropdown(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:text-[#531FFF] hover:bg-[#531FFF]/5 transition-all group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-[#531FFF]/10 text-slate-500 group-hover:text-[#531FFF] flex items-center justify-center transition-colors shrink-0">
                      <CalendarDays className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="leading-tight">Kalender Akademik</p>
                      <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate">Agenda sekolah & jadwal libur</p>
                    </div>
                  </Link>

                  <div className="h-px bg-slate-100 my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileDropdown(false);
                      setShowLogoutConfirm(true);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:text-rose-600 hover:bg-rose-50 transition-all group cursor-pointer text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-rose-100 text-slate-500 group-hover:text-rose-600 flex items-center justify-center transition-colors shrink-0">
                      <LogOut className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="leading-tight text-rose-600 font-extrabold">Keluar dari Akun</p>
                      <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate">Akhiri sesi login dengan aman</p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* LOGOUT CONFIRMATION MODAL                                                 */}
      {/* ========================================================================= */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-100 p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
              <LogOut className="w-7 h-7" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Keluar dari Sistem?
              </h3>
              <p className="text-xs font-medium text-slate-500 leading-relaxed">
                Apakah Anda yakin ingin mengakhiri sesi dan keluar dari akun Anda?
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                disabled={isLoggingOut}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {isLoggingOut && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Keluar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PERSISTENT ONBOARDING REMINDER BANNER FOR UNBOARDED STUDENTS              */}
      {/* ========================================================================= */}
      {isStudentUnboarded && (
        <div className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-[#531FFF] p-[1px] shadow-sm animate-in fade-in duration-300">
          <div className="bg-amber-50/95 backdrop-blur-md px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-medium text-amber-900">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 font-bold text-xs shadow-xs animate-bounce">
                !
              </span>
              <span>
                <strong className="font-bold">Pengingat Onboarding:</strong> Halo <span className="font-bold text-slate-900">{userName}</span>, profil Anda belum lengkap. Silakan lengkapi formulir pendaftaran 4 langkah agar biodata Anda tersimpan ke Data Siswa sekolah.
              </span>
            </div>
            <Link
              href="/onboarding"
              className="px-4 py-1.5 bg-[#531FFF] hover:bg-[#4314cc] text-white font-bold rounded-lg shadow-xs transition-all hover:scale-105 active:scale-95 shrink-0"
            >
              Lengkapi Sekarang ➔
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
