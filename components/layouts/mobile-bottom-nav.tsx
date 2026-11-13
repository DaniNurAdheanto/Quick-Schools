"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  CalendarDays, 
  FileCheck, 
  Megaphone, 
  Menu, 
  X,
  CreditCard,
  Building2,
  Inbox,
  UserCheck,
  BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/context/AuthContext";
import { useNotificationBadges } from "@/context/NotificationBadgeContext";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { isMobileOpen, toggleMobile } = useSidebar();
  const { userRole, isSaaSAdmin } = useAuth();
  const { totalUnreadCount } = useNotificationBadges();

  const role = (userRole || "").toLowerCase();

  // Role-specific quick nav items
  const getNavItems = () => {
    // 1. SaaS Administrator
    if (isSaaSAdmin || role === "saas-admin") {
      return [
        { href: "/saas-dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/saas-customers", label: "Pelanggan", icon: Building2 },
        { href: "/subscription-requests", label: "Tiket", icon: Inbox },
        { href: "/saas-packages", label: "Paket", icon: CreditCard },
      ];
    }

    // 2. Guru
    if (role === "guru" || role === "teacher") {
      return [
        { href: "/dashboard", label: "Beranda", icon: LayoutDashboard },
        { href: "/schedule", label: "Jadwal", icon: BookOpen },
        { href: "/teacher-attendance", label: "Absensi", icon: UserCheck },
        { href: "/announcements", label: "Info", icon: Megaphone },
      ];
    }

    // 3. Siswa
    if (role === "siswa" || role === "student") {
      return [
        { href: "/dashboard", label: "Beranda", icon: LayoutDashboard },
        { href: "/schedule", label: "Jadwal", icon: BookOpen },
        { href: "/attendance", label: "Presensi", icon: FileCheck },
        { href: "/announcements", label: "Info", icon: Megaphone },
      ];
    }

    // 4. Orang Tua
    if (role === "orang-tua" || role === "parent") {
      return [
        { href: "/dashboard", label: "Beranda", icon: LayoutDashboard },
        { href: "/attendance", label: "Presensi", icon: FileCheck },
        { href: "/payments", label: "SPP", icon: CreditCard },
        { href: "/announcements", label: "Info", icon: Megaphone },
      ];
    }

    // 5. Super Admin / Admin Sekolah / Kepala Sekolah (Default)
    return [
      { href: "/dashboard", label: "Beranda", icon: LayoutDashboard },
      { href: "/calendar", label: "Kalender", icon: CalendarDays },
      { href: "/attendance", label: "Presensi", icon: FileCheck },
      { href: "/announcements", label: "Info", icon: Megaphone },
    ];
  };

  const navItems = getNavItems();

  return (
    <nav 
      aria-label="Navigasi Bawah Layar Sentuh"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 shadow-[0_-4px_25px_-5px_rgba(0,0,0,0.06)] px-2 py-1.5 flex items-center justify-around safe-bottom transition-all duration-200"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== "/dashboard" && item.href !== "/saas-dashboard" && pathname?.startsWith(item.href));
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-2xl transition-all duration-200 relative group cursor-pointer active:scale-95",
              isActive 
                ? "text-[#531FFF]" 
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            {/* Active Pill Accent */}
            <div className={cn(
              "w-10 h-7 rounded-xl flex items-center justify-center transition-all duration-200 relative",
              isActive ? "bg-[#531FFF]/12 text-[#531FFF]" : "text-slate-500 group-hover:bg-slate-100/70"
            )}>
              <Icon className={cn("w-5 h-5 transition-transform", isActive && "scale-105 stroke-[2.2]")} />
              
              {/* Unread badge on Info/Pengumuman */}
              {item.href === "/announcements" && totalUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#531FFF] border-2 border-white" />
              )}
            </div>
            
            <span className={cn(
              "text-[10px] tracking-tight mt-0.5 truncate max-w-[56px]",
              isActive ? "font-black text-[#531FFF]" : "font-semibold text-slate-500"
            )}>
              {item.label}
            </span>
          </Link>
        );
      })}

      {/* Menu / Drawer Toggle Button */}
      <button
        type="button"
        onClick={toggleMobile}
        className={cn(
          "flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-2xl transition-all duration-200 cursor-pointer active:scale-95",
          isMobileOpen ? "text-[#531FFF]" : "text-slate-500 hover:text-slate-800"
        )}
        aria-label={isMobileOpen ? "Tutup Menu Drawer" : "Buka Menu Lengkap"}
        aria-expanded={isMobileOpen}
      >
        <div className={cn(
          "w-10 h-7 rounded-xl flex items-center justify-center transition-all duration-200",
          isMobileOpen ? "bg-[#531FFF]/15 text-[#531FFF]" : "text-slate-600 hover:bg-slate-100/70"
        )}>
          {isMobileOpen ? (
            <X className="w-5 h-5 text-[#531FFF] animate-in spin-in-90 duration-150 stroke-[2.5]" />
          ) : (
            <Menu className="w-5 h-5 stroke-[2]" />
          )}
        </div>
        <span className={cn(
          "text-[10px] tracking-tight mt-0.5",
          isMobileOpen ? "font-black text-[#531FFF]" : "font-semibold text-slate-500"
        )}>
          {isMobileOpen ? "Tutup" : "Menu"}
        </span>
      </button>
    </nav>
  );
}

