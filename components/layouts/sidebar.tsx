"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSchoolProfile } from "@/context/SchoolProfileContext";
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  Megaphone,
  User,
  Users,
  GraduationCap,
  Award,
  FileCheck,
  FileText,
  CalendarRange,
  CreditCard,
  Settings,
  LogOut,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  UserCog,
  PenLine,
  UserCheck,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isSuperAdminRole, isStudentRole, isParentRole } from "@/lib/roles-config";
import { useAuth } from "@/context/AuthContext";
import { useNotificationBadges } from "@/context/NotificationBadgeContext";
import { SidebarSkeleton } from "@/components/ui/role-loading-skeleton";

const NAV_MODULE_MAP: Record<string, string> = {
  "/dashboard": "dashboard",
  "/calendar": "academic",
  "/schedule": "academic",
  "/announcements": "announcements",
  "/data-siswa": "users",
  "/parents": "users",
  "/classes": "academic",
  "/teachers": "users",
  "/homeroom": "users",
  "/subjects": "academic",
  "/attendance": "attendance",
  "/teacher-attendance": "attendance",
  "/grades": "grades",
  "/report-cards": "grades",
  "/exams": "academic",
  "/academic-years": "settings",
  "/payments": "finance",
  "/financial-reports": "finance",
  "/accounts": "accounts",
  "/settings": "settings",
  "/roles": "settings",
};

const OVERVIEW_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Kalender Akademik", icon: CalendarDays },
  { href: "/schedule", label: "Jadwal Pelajaran", icon: BookOpen },
  { href: "/announcements", label: "Pengumuman", icon: Megaphone },
];

const MASTER_DATA_NAV = [
  { href: "/data-siswa", label: "Data Siswa", icon: User },
  { href: "/parents", label: "Data Orang Tua", icon: Users },
  { href: "/classes", label: "Kelas", icon: Users },
  { href: "/teachers", label: "Staff Guru", icon: GraduationCap },
  { href: "/homeroom", label: "Wali Kelas", icon: GraduationCap },
  { href: "/subjects", label: "Mata Pelajaran", icon: BookOpen },
];

const AKADEMIK_NAV = [
  { href: "/attendance", label: "Absensi Siswa", icon: FileCheck },
  { href: "/teacher-attendance", label: "Absensi Guru", icon: UserCheck },
  { href: "/grades", label: "Penilaian", icon: PenLine },
  { href: "/report-cards", label: "Rapor Digital", icon: Award },
  { href: "/exams", label: "Jadwal Ujian", icon: CalendarRange },
  { href: "/academic-years", label: "Tahun Ajaran & Kenaikan", icon: CalendarDays },
];

const KEUANGAN_NAV = [
  { href: "/payments", label: "Pembayaran SPP", icon: CreditCard },
  { href: "/financial-reports", label: "Laporan Keuangan", icon: FileText },
];

const SYSTEM_NAV = [
  { href: "/profile", label: "Profile", icon: User },
  { href: "/accounts", label: "Manajemen Akun System", icon: UserCheck },
  { href: "/settings", label: "Pengaturan Sekolah", icon: Settings },
  { href: "/roles", label: "Role & Permission", icon: UserCog },
  { href: "/", label: "Keluar", icon: LogOut, isDanger: true },
];

function NavGroup({ 
  title, 
  items, 
  currentPath, 
  isCollapsed, 
  userPermissions, 
  userRole = "admin", 
  isFooter = false,
  onLogoutClick,
  getBadgeCount,
  onItemClick,
}: { 
  title: string; 
  items: any[]; 
  currentPath: string; 
  isCollapsed: boolean; 
  userPermissions: Record<string, { read: boolean; write: boolean; delete: boolean }>;
  userRole?: string;
  isFooter?: boolean;
  onLogoutClick?: () => void;
  getBadgeCount?: (path: string) => number;
  onItemClick?: (path: string) => void;
}) {
  const isSuperAdmin = isSuperAdminRole(userRole) || (userRole || "").toLowerCase() === "admin";
  const isParent = isParentRole(userRole) || (userRole || "").toLowerCase() === "orang-tua";
  const isStudent = isStudentRole(userRole) || (userRole || "").toLowerCase() === "siswa";

  // Hide entire MASTER DATA group for parents and students
  if ((isParent || isStudent) && title === "MASTER DATA") {
    return null;
  }

  // Filter items based on permissions
  const visibleItems = items.filter(item => {
    if (item.isDanger || item.href === "/" || item.href === "/profile") return true;

    // Strict rule: Manajemen Akun System is exclusively visible & accessible to Super Admin / Admin
    if (item.href === "/accounts" || NAV_MODULE_MAP[item.href] === "accounts") {
      return isSuperAdmin;
    }

    // Strict rule: Laporan Keuangan is exclusively for Super Admin / Admin
    if (item.href === "/financial-reports") {
      return isSuperAdmin;
    }

    // Strict rule: Pengaturan Sekolah & Role & Permission are exclusively for Super Admin / Admin
    if (item.href === "/settings" || item.href === "/roles") {
      if (isParent || isStudent) return false;
    }

    // Strict rule: Tahun Ajaran & Kenaikan is for school staff only
    if (item.href === "/academic-years") {
      if (isParent || isStudent) return false;
    }

    // Pembayaran SPP is accessible to Admin, Guru (Wali Kelas), Siswa, and Orang Tua
    if (item.href === "/payments") {
      return true;
    }

    // Strict rule: Absensi Guru is strictly for Guru, Admin, Kepala Sekolah, Super Admin (HIDDEN from Siswa and Orang Tua)
    if (item.href === "/teacher-attendance") {
      if (isStudent || isParent) {
        return false;
      }
      return true;
    }

    const modId = NAV_MODULE_MAP[item.href];
    if (!modId) return true;
    const modPerm = userPermissions[modId];
    return modPerm ? modPerm.read : true;
  });

  if (visibleItems.length === 0) return null;

  return (
    <div className={cn(isFooter ? "mb-0" : isCollapsed ? "mb-3" : "mb-7")}>
      {!isCollapsed ? (
        <div className="px-6 flex items-center justify-between mb-2.5 text-gray-400 select-none">
          <h3 className="text-[11px] font-extrabold tracking-wider uppercase">{title}</h3>
          {!isFooter && <ChevronDown className="w-3.5 h-3.5 opacity-60" />}
        </div>
      ) : (
        !isFooter && (
          <div className="py-1 px-3">
            <div className="w-8 h-px bg-gray-200/90 mx-auto rounded-full" />
          </div>
        )
      )}

      <div className={cn("space-y-1", isCollapsed && "space-y-1.5 px-2")}>
        {visibleItems.map((item) => {
          const isActive = currentPath === item.href || (item.href === '/data-siswa' && currentPath.includes('/data-siswa'));
          const Icon = item.icon;
          const itemBadge = getBadgeCount ? getBadgeCount(item.href) : (item.badge || 0);

          if (isCollapsed) {
            return (
              <div key={item.label} className="relative flex justify-center group my-0.5">
                {item.isDanger ? (
                  <button
                    type="button"
                    onClick={() => onLogoutClick?.()}
                    className={cn(
                      "w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 relative cursor-pointer active:scale-95 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                    )}
                    title={item.label}
                  >
                    <Icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110 text-rose-500" />
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    onClick={() => onItemClick?.(item.href)}
                    className={cn(
                      "w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 relative cursor-pointer active:scale-95",
                      isActive
                        ? "bg-white text-[#531FFF] shadow-md shadow-[#531FFF]/10 border border-[#531FFF]/25 font-bold"
                        : "text-[#4B5563] hover:bg-white hover:text-gray-900 hover:shadow-xs"
                    )}
                  >
                    {/* Left Active Accent Indicator */}
                    {isActive && (
                      <span className="absolute -left-2 top-2.5 bottom-2.5 w-1 bg-[#531FFF] rounded-r-full shadow-xs" />
                    )}

                    <Icon className={cn(
                      "w-5 h-5 transition-transform duration-200 group-hover:scale-110",
                      isActive ? "text-[#531FFF]" : "text-[#4B5563]"
                    )} />

                    {/* Notification Badge / Pill in Collapsed View */}
                    {itemBadge > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#531FFF] text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-xs border-2 border-[#F9FAFB] animate-in zoom-in-75 duration-200">
                        {itemBadge > 99 ? "99+" : itemBadge}
                      </span>
                    )}
                  </Link>
                )}

                {/* Instant Floating Tooltip */}
                <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-xl shadow-2xl z-50 whitespace-nowrap pointer-events-none transition-all duration-150 animate-in fade-in zoom-in-95">
                  <span>{item.label}</span>
                  {itemBadge > 0 && (
                    <span className="px-1.5 py-0.2 bg-[#531FFF] text-white text-[10px] font-black rounded-md flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                      {itemBadge > 99 ? "99+" : itemBadge}
                    </span>
                  )}
                  {/* Tooltip left arrow */}
                  <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                </div>
              </div>
            );
          }

          // Expanded / Open Mode View
          if (item.isDanger) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => onLogoutClick?.()}
                className="w-[calc(100%-2rem)] mx-4 flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all relative group cursor-pointer text-rose-500 hover:text-rose-600 rounded-xl hover:bg-rose-50 font-semibold text-left"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 transition-colors text-rose-500" />
                  <span className="text-[13px]">{item.label}</span>
                </div>
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => onItemClick?.(item.href)}
              className={cn(
                "flex items-center justify-between mx-4 px-3.5 py-2.5 rounded-xl transition-all relative group cursor-pointer",
                isActive
                  ? "bg-white text-[#531FFF] rounded-xl shadow-[0_2px_15px_-4px_rgba(0,0,0,0.05)] border border-gray-100 font-bold"
                  : "text-[#4B5563] hover:bg-gray-100/80 hover:text-gray-900 rounded-xl font-semibold"
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className={cn(
                  "w-4 h-4 transition-colors shrink-0", 
                  isActive ? "text-[#531FFF]" : "text-[#4B5563]"
                )} />
                <span className="text-[13px] truncate">{item.label}</span>
              </div>
              {itemBadge > 0 && (
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className={cn(
                    "px-2 py-0.5 text-[10px] rounded-full font-black tracking-wide transition-all duration-200 flex items-center gap-1 shadow-xs",
                    isActive
                      ? "bg-[#531FFF] text-white shadow-[#531FFF]/20"
                      : "bg-[#531FFF]/10 text-[#531FFF] group-hover:bg-[#531FFF] group-hover:text-white"
                  )}>
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#531FFF] opacity-75 group-hover:bg-white" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#531FFF] group-hover:bg-white" />
                    </span>
                    <span>{itemBadge > 99 ? "99+" : itemBadge}</span>
                  </span>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { profile } = useSchoolProfile();
  const { role, rawRole, rolePermissions, isAuthLoading, isRoleReady, logout } = useAuth();
  const { getBadgeCount, markAsRead } = useNotificationBadges();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSidebarLogout = async () => {
    try {
      setIsLoggingOut(true);
      setShowLogoutConfirm(false);
      await logout("/login");
    } catch (err) {
      console.error("Sidebar logout error:", err);
      setIsLoggingOut(false);
    }
  };

  // Derive active normalized role for navigation filtering
  const effectiveUserRole = (rawRole || role || "").toLowerCase();

  // Keyboard shortcut ⌘B or Ctrl+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setIsCollapsed((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <aside className={cn(
      "bg-[#F9FAFB] border-r border-gray-100 flex flex-col h-screen shrink-0 sticky top-0 z-30 transition-all duration-300 ease-in-out",
      isCollapsed ? "w-[82px] overflow-visible" : "w-[290px] overflow-hidden"
    )}>
      
      {/* Header */}
      <div className={cn(
         "h-[88px] flex items-center shrink-0 transition-all",
         isCollapsed ? "justify-center px-2" : "justify-between px-6"
      )}>
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <div className="w-[42px] h-[42px] rounded-2xl bg-white border border-gray-100 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] flex items-center justify-center shrink-0 overflow-hidden relative p-1.5">
                {profile.logoUrl ? (
                  <Image 
                    src={profile.logoUrl} 
                    alt={profile.schoolName || "Logo Sekolah"} 
                    fill 
                    className="object-contain p-1" 
                    unoptimized 
                  />
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 6C17.3137 6 20 8.68629 20 12C20 15.3137 17.3137 18 14 18C10.6863 18 8 15.3137 8 12C8 8.68629 10.6863 6 14 6Z" stroke="#531FFF" strokeWidth="4"/>
                    <circle cx="14" cy="12" r="2" fill="#531FFF"/>
                  </svg>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-[15px] text-gray-900 tracking-tight truncate leading-tight" title={profile.schoolName}>
                  {profile.schoolName || "Quick Schools"}
                </span>
                <span className="text-[11px] text-gray-400 font-medium truncate mt-0.5">
                  {profile.schoolType || "Smart School OS"}
                </span>
              </div>
            </div>
            
            <button 
              onClick={() => setIsCollapsed(true)}
              className="text-gray-400 hover:text-gray-700 transition-colors bg-white border border-gray-100 hover:border-gray-200 shadow-xs rounded-xl p-2 cursor-pointer hover:bg-gray-50 active:scale-95 shrink-0"
              title="Sembunyikan Menu (⌘B)"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </>
        ) : (
          /* Collapsed Header Brand Icon */
          <div className="relative flex justify-center group my-1">
            <button
              onClick={() => setIsCollapsed(false)}
              className="w-12 h-12 rounded-2xl bg-white border border-gray-100 hover:border-[#531FFF]/30 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] hover:shadow-md hover:shadow-[#531FFF]/10 flex items-center justify-center shrink-0 transition-all cursor-pointer active:scale-95 group overflow-hidden p-1.5 relative"
              title={`Buka Sidebar (${profile.schoolName || "Quick Schools"})`}
            >
              {profile.logoUrl ? (
                <Image 
                  src={profile.logoUrl} 
                  alt={profile.schoolName || "Logo"} 
                  fill 
                  className="object-contain p-1.5 transition-transform group-hover:scale-105" 
                  unoptimized 
                />
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="transition-transform group-hover:scale-105">
                  <path d="M14 6C17.3137 6 20 8.68629 20 12C20 15.3137 17.3137 18 14 18C10.6863 18 8 15.3137 8 12C8 8.68629 10.6863 6 14 6Z" stroke="#531FFF" strokeWidth="4"/>
                  <circle cx="14" cy="12" r="2" fill="#531FFF"/>
                </svg>
              )}
            </button>

            {/* Instant Floating Tooltip */}
            <div className="absolute left-[calc(100%+14px)] top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-xl shadow-2xl z-50 whitespace-nowrap pointer-events-none transition-all duration-150 animate-in fade-in zoom-in-95">
              <span>{profile.schoolName || "Quick Schools"} • Buka Menu (⌘B)</span>
              <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
            </div>
          </div>
        )}
      </div>

      {/* Nav Content Filtered by Permissions or Loading Skeleton */}
      {isAuthLoading || !isRoleReady ? (
        <div className="flex-1 overflow-hidden">
          <SidebarSkeleton isCollapsed={isCollapsed} />
        </div>
      ) : (
        <>
          <div className={cn(
            "flex-1 pt-3 pb-2 scrollbar-none",
            isCollapsed ? "overflow-y-auto overflow-x-visible" : "overflow-y-auto overflow-x-hidden"
          )}>
            <NavGroup 
              title="OVERVIEW" 
              items={OVERVIEW_NAV} 
              currentPath={pathname} 
              isCollapsed={isCollapsed} 
              userPermissions={rolePermissions} 
              userRole={effectiveUserRole} 
              getBadgeCount={getBadgeCount}
              onItemClick={markAsRead}
            />
            <NavGroup 
              title="MASTER DATA" 
              items={MASTER_DATA_NAV} 
              currentPath={pathname} 
              isCollapsed={isCollapsed} 
              userPermissions={rolePermissions} 
              userRole={effectiveUserRole} 
              getBadgeCount={getBadgeCount}
              onItemClick={markAsRead}
            />
            <NavGroup 
              title="AKADEMIK" 
              items={AKADEMIK_NAV} 
              currentPath={pathname} 
              isCollapsed={isCollapsed} 
              userPermissions={rolePermissions} 
              userRole={effectiveUserRole} 
              getBadgeCount={getBadgeCount}
              onItemClick={markAsRead}
            />
            <NavGroup 
              title="KEUANGAN" 
              items={KEUANGAN_NAV} 
              currentPath={pathname} 
              isCollapsed={isCollapsed} 
              userPermissions={rolePermissions} 
              userRole={effectiveUserRole} 
              getBadgeCount={getBadgeCount}
              onItemClick={markAsRead}
            />
          </div>

          {/* Pinned Bottom Section: SYSTEM & SETTINGS */}
          <div className="shrink-0 border-t border-gray-100/90 bg-[#F9FAFB] pt-2.5 pb-3">
            <NavGroup 
              title="SYSTEM & SETTINGS" 
              items={SYSTEM_NAV} 
              currentPath={pathname} 
              isCollapsed={isCollapsed} 
              userPermissions={rolePermissions} 
              userRole={effectiveUserRole} 
              isFooter={true} 
              onLogoutClick={() => setShowLogoutConfirm(true)}
              getBadgeCount={getBadgeCount}
              onItemClick={markAsRead}
            />
          </div>
        </>
      )}

        {/* Expand & Collapse Control Bar */}
        <div className={cn(
          "pt-2 mt-1.5 border-t border-gray-100/70 transition-all",
          isCollapsed ? "px-2 flex justify-center" : "px-4"
        )}>
          {isCollapsed ? (
            <div className="relative group">
              <button
                onClick={() => setIsCollapsed(false)}
                className="w-11 h-11 rounded-2xl bg-white hover:bg-gray-50 border border-gray-200/80 shadow-xs flex items-center justify-center text-gray-500 hover:text-[#531FFF] transition-all cursor-pointer active:scale-95 hover:shadow-sm"
                title="Perluas Menu"
              >
                <PanelLeftOpen className="w-5 h-5 transition-transform group-hover:scale-110" />
              </button>
              <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-xl shadow-2xl z-50 whitespace-nowrap pointer-events-none transition-all duration-150 animate-in fade-in zoom-in-95">
                <span>Perluas Menu (⌘B)</span>
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsCollapsed(true)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-900 hover:bg-white hover:shadow-xs border border-transparent hover:border-gray-200/60 transition-all cursor-pointer group active:scale-[0.98]"
            >
              <span className="flex items-center gap-2.5">
                <PanelLeftClose className="w-4 h-4 transition-colors group-hover:text-[#531FFF]" />
                <span>Sembunyikan Menu</span>
              </span>
              <kbd className="text-[10px] bg-gray-200/70 text-gray-500 px-1.5 py-0.5 rounded-md font-mono group-hover:bg-gray-200">
                ⌘B
              </kbd>
            </button>
          )}
        </div>

      {/* LOGOUT CONFIRMATION DIALOG FOR SIDEBAR */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl border border-gray-100 p-6 space-y-4 animate-in zoom-in-95 duration-200 text-left">
            <div className="w-14 h-14 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
              <LogOut className="w-7 h-7" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-black text-gray-900 tracking-tight">
                Keluar dari Sistem?
              </h3>
              <p className="text-xs font-medium text-gray-500 leading-relaxed">
                Apakah Anda yakin ingin keluar dari akun Anda?
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                disabled={isLoggingOut}
                className="flex-1 py-2.5 rounded-lg text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSidebarLogout}
                disabled={isLoggingOut}
                className="flex-1 py-2.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {isLoggingOut && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Keluar</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </aside>
  );
}
