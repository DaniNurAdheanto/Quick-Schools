"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  UserCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { DEFAULT_PERMISSIONS, isSuperAdminRole } from "@/lib/roles-config";

const NAV_MODULE_MAP: Record<string, string> = {
  "/admin/dashboard": "dashboard",
  "/admin/calendar": "academic",
  "/admin/schedule": "academic",
  "/admin/announcements": "announcements",
  "/admin/data-siswa": "users",
  "/admin/classes": "academic",
  "/admin/teachers": "users",
  "/admin/homeroom": "users",
  "/admin/subjects": "academic",
  "/admin/attendance": "attendance",
  "/admin/grades": "grades",
  "/admin/report-cards": "grades",
  "/admin/exams": "academic",
  "/admin/academic-years": "settings",
  "/admin/payments": "finance",
  "/admin/financial-reports": "finance",
  "/admin/accounts": "accounts",
  "/admin/settings": "settings",
  "/admin/roles": "settings",
};

const OVERVIEW_NAV = [
  { href: "/admin/dashboard", label: "Dashboard", badge: 1, icon: LayoutDashboard },
  { href: "/admin/calendar", label: "Kalender Akademik", badge: 10, icon: CalendarDays },
  { href: "/admin/schedule", label: "Jadwal Pelajaran", badge: 8, icon: BookOpen },
  { href: "/admin/announcements", label: "Pengumuman", badge: 8, icon: Megaphone },
];

const MASTER_DATA_NAV = [
  { href: "/admin/data-siswa", label: "Data Siswa", icon: User },
  { href: "/admin/classes", label: "Kelas", icon: Users },
  { href: "/admin/teachers", label: "Staff Guru", icon: GraduationCap },
  { href: "/admin/homeroom", label: "Wali Kelas", icon: GraduationCap },
  { href: "/admin/subjects", label: "Mata Pelajaran", badge: 8, icon: BookOpen },
];

const AKADEMIK_NAV = [
  { href: "/admin/attendance", label: "Absensi", badge: 12, icon: FileCheck },
  { href: "/admin/grades", label: "Penilaian", icon: PenLine },
  { href: "/admin/report-cards", label: "Rapor Digital", icon: Award },
  { href: "/admin/exams", label: "Jadwal Ujian", icon: CalendarRange },
  { href: "/admin/academic-years", label: "Tahun Ajaran & Kenaikan", icon: CalendarDays },
];

const KEUANGAN_NAV = [
  { href: "/admin/payments", label: "Pembayaran SPP", icon: CreditCard },
  { href: "/admin/financial-reports", label: "Laporan Keuangan", icon: FileText },
];

const SYSTEM_NAV = [
  { href: "/admin/profile", label: "Profile", icon: User },
  { href: "/admin/accounts", label: "Manajemen Akun System", icon: UserCheck },
  { href: "/admin/settings", label: "Pengaturan Sekolah", icon: Settings },
  { href: "/admin/roles", label: "Role & Permission", icon: UserCog },
  { href: "/", label: "Keluar", icon: LogOut, isDanger: true },
];

function NavGroup({ title, items, currentPath, isCollapsed, userPermissions, userRole = "admin", isFooter = false }: { 
  title: string; 
  items: any[]; 
  currentPath: string; 
  isCollapsed: boolean; 
  userPermissions: Record<string, { read: boolean; write: boolean; delete: boolean }>;
  userRole?: string;
  isFooter?: boolean 
}) {
  const isSuperAdmin = isSuperAdminRole(userRole) || (userRole || "").toLowerCase() === "admin";

  // Filter items based on permissions
  const visibleItems = items.filter(item => {
    if (item.isDanger || item.href === "/" || item.href === "/admin/profile") return true;

    // Strict rule: Manajemen Akun System is exclusively visible & accessible to Super Admin / Admin
    if (item.href === "/admin/accounts" || NAV_MODULE_MAP[item.href] === "accounts") {
      return isSuperAdmin;
    }

    const modId = NAV_MODULE_MAP[item.href];
    if (!modId) return true;
    const modPerm = userPermissions[modId];
    return modPerm ? modPerm.read : true;
  });

  if (visibleItems.length === 0) return null;

  return (
    <div className={cn(isFooter ? "mb-0" : isCollapsed ? "mb-6" : "mb-8", isCollapsed ? "px-2" : "")}>
      {!isCollapsed ? (
        <div className="px-6 flex items-center justify-between mb-3 text-gray-400">
          <h3 className="text-[12px] font-bold tracking-wider uppercase">{title}</h3>
          {!isFooter && <ChevronDown className="w-4 h-4 opacity-70" />}
        </div>
      ) : (
        !isFooter && (
          <div className="flex justify-center mb-4">
            <div className="w-6 h-1 bg-gray-200 rounded-full" />
          </div>
        )
      )}
      <div className={cn("space-y-1", isCollapsed && "space-y-3")}>
        {visibleItems.map((item) => {
          const isActive = currentPath === item.href || (item.href === '/admin/data-siswa' && currentPath.includes('/admin/data-siswa'));
          
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center transition-all relative group",
                isCollapsed 
                  ? "justify-center mx-auto w-[46px] h-[46px]" 
                  : "justify-between mx-4 px-3 py-2",
                isActive
                  ? "bg-white text-[#531FFF] rounded-xl shadow-[0_2px_15px_-4px_rgba(0,0,0,0.05)] border border-gray-100 font-bold"
                  : item.isDanger 
                     ? "text-red-500 hover:text-red-600 rounded-xl hover:bg-red-50 font-semibold" 
                     : "text-[#4B5563] hover:bg-gray-100 hover:text-gray-900 rounded-xl font-semibold"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <div className="flex items-center gap-2.5">
                <item.icon className={cn(
                  isCollapsed ? "w-5 h-5" : "w-4 h-4", 
                  isActive ? "text-[#531FFF]" : item.isDanger ? "text-red-500" : "text-[#4B5563]"
                )} />
                {!isCollapsed && <span className="text-[13px]">{item.label}</span>}
              </div>
              {!isCollapsed && item.badge && (
                <span className={cn(
                  "px-2 py-0.5 text-[11px] rounded-md font-bold",
                  isActive ? "bg-[#F3F0FF] text-[#531FFF]" : "bg-gray-200/60 text-gray-500"
                )}>
                  {item.badge}
                </span>
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userRole, setUserRole] = useState<string>("admin");
  const [rolePermissions, setRolePermissions] = useState<Record<string, { read: boolean; write: boolean; delete: boolean }>>(
    DEFAULT_PERMISSIONS["admin"]
  );

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userSnap = await getDoc(doc(db, "users", user.uid));
          const rawRole = userSnap.exists() ? (userSnap.data().role || "admin") : "admin";
          const role = (rawRole === "student" || rawRole === "siswa") ? "siswa" : rawRole;
          setUserRole(role);

          // Get permissions for this role
          try {
            const roleSnap = await getDoc(doc(db, "roles", role));
            if (roleSnap.exists() && roleSnap.data().modules) {
              setRolePermissions(roleSnap.data().modules);
              return;
            }
          } catch (e) {
            // fallback to DEFAULT_PERMISSIONS
          }

          setRolePermissions(DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS["siswa"] || DEFAULT_PERMISSIONS["admin"]);
        } catch (err) {
          console.error("Sidebar role fetch error:", err);
        }
      }
    });

    return () => unsubAuth();
  }, []);

  return (
    <aside className={cn(
      "bg-[#F9FAFB] border-r border-gray-100 flex flex-col h-screen shrink-0 sticky top-0 overflow-hidden z-20 transition-all duration-300",
      isCollapsed ? "w-[88px]" : "w-[300px]"
    )}>
      
      {/* Header */}
      <div className={cn(
         "h-[88px] flex items-center shrink-0 mt-4",
         isCollapsed ? "justify-center relative w-full" : "justify-between px-6"
      )}>
        <div className="flex items-center gap-3">
          <div className="w-[42px] h-[42px] rounded-2xl bg-white border border-gray-100 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] flex items-center justify-center shrink-0">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
               <path d="M14 6C17.3137 6 20 8.68629 20 12C20 15.3137 17.3137 18 14 18C10.6863 18 8 15.3137 8 12C8 8.68629 10.6863 6 14 6Z" stroke="#531FFF" strokeWidth="4"/>
               <circle cx="14" cy="12" r="2" fill="#531FFF"/>
             </svg>
          </div>
          {!isCollapsed && <span className="font-bold text-[20px] text-gray-900 tracking-tight">Quick Schools</span>}
        </div>
        {!isCollapsed && (
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-400 hover:text-gray-600 transition-colors bg-white border border-gray-100 shadow-sm rounded-full p-1.5 z-10"
          >
            <PanelLeftClose className="w-5 h-5" />
          </button>
        )}
        {isCollapsed && (
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors bg-white border border-gray-200 shadow-md rounded-full p-1.5 z-10 opacity-0 md:opacity-100 hover:opacity-100"
          >
            <PanelLeftOpen className="w-4 h-4 ml-0.5" />
          </button>
        )}
      </div>

      {/* Nav Content Filtered by Permissions */}
      <div className="flex-1 overflow-y-auto pt-6 pb-2 scrollbar-none">
        <NavGroup title="OVERVIEW" items={OVERVIEW_NAV} currentPath={pathname} isCollapsed={isCollapsed} userPermissions={rolePermissions} userRole={userRole} />
        <NavGroup title="MASTER DATA" items={MASTER_DATA_NAV} currentPath={pathname} isCollapsed={isCollapsed} userPermissions={rolePermissions} userRole={userRole} />
        <NavGroup title="AKADEMIK" items={AKADEMIK_NAV} currentPath={pathname} isCollapsed={isCollapsed} userPermissions={rolePermissions} userRole={userRole} />
        <NavGroup title="KEUANGAN" items={KEUANGAN_NAV} currentPath={pathname} isCollapsed={isCollapsed} userPermissions={rolePermissions} userRole={userRole} />
      </div>

      {/* Footer Fixed */}
      <div className={cn(
        "shrink-0 pt-4",
        isCollapsed ? "pb-4" : "pb-6"
      )}>
        <NavGroup title="SYSTEM & SETTINGS" items={SYSTEM_NAV} currentPath={pathname} isCollapsed={isCollapsed} userPermissions={rolePermissions} userRole={userRole} isFooter={true} />
      </div>

    </aside>
  );
}
