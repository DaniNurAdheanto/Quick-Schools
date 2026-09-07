"use client";

import { Bell, ChevronDown, ChevronRight, Home, Calendar } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAcademicYear } from "@/context/AcademicYearContext";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState("Loading...");
  const [userRole, setUserRole] = useState("");
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [hasPendingReminder, setHasPendingReminder] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const { activeAcademicYear, activeSemester, availableYears, setActiveAcademicYear, setActiveSemester } = useAcademicYear();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserName(data.name || "User");
            setUserRole(data.role || "admin");
            const isCompleted = data.onboardingCompleted ?? (data.status !== "Belum Onboarding");
            setOnboardingCompleted(isCompleted);
            setHasPendingReminder(Boolean(data.pendingOnboardingReminder) || !isCompleted);
          } else {
            setUserName(user.email?.split('@')[0] || "User");
            setOnboardingCompleted(true);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUserName(user.email?.split('@')[0] || "User");
          setOnboardingCompleted(true);
        }
      } else {
        setUserName("Guest");
        setOnboardingCompleted(true);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };
  
  const generateBreadcrumbs = () => {
    if (!pathname) return [{ label: "Home", href: "/admin/dashboard" }];
    
    const pathWithoutQuery = pathname.split('?')[0];
    const pathParts = pathWithoutQuery.split('/').filter(p => p);
    
    if (pathParts.length === 0 || (pathParts.length === 1 && pathParts[0] === 'admin')) {
      return [{ label: "Home", href: "/admin/dashboard" }, { label: "Dashboard", href: "/admin/dashboard" }];
    }
    
    const breadcrumbs = [];
    breadcrumbs.push({ label: "Home", href: "/admin/dashboard" });
    
    let currentPath = "";
    pathParts.forEach((part) => {
      currentPath += `/${part}`;
      if (part === "admin" || part === "(protected)") return;
      
      const formattedLabel = part
        .replace(/-/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
        
      breadcrumbs.push({ label: formattedLabel, href: currentPath });
    });
    
    return breadcrumbs;
  };
  
  const breadcrumbs = generateBreadcrumbs();

  const isStudentUnboarded = onboardingCompleted === false && (userRole === "siswa" || userRole === "student" || userRole === "");

  return (
    <div className="flex flex-col w-full sticky top-0 z-50 shrink-0 mb-2">
      <header className="h-[72px] bg-[#F8F9FC] flex items-center px-8 shrink-0 w-full border-b border-gray-100">
        {/* Left - Breadcrumbs */}
        <div className="flex-1 min-w-0 flex justify-start items-center">
          <nav aria-label="Breadcrumb" className="max-w-full overflow-hidden">
            <ol className="flex items-center gap-2 text-sm font-medium truncate">
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                return (
                  <li key={`${crumb.href}-${index}`} className="flex items-center gap-2">
                    {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-300" />}
                    {isLast ? (
                      <span className="text-[#531FFF] font-semibold">{crumb.label}</span>
                    ) : (
                      <Link href={crumb.href} className="text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1.5">
                        {index === 0 && <Home className="w-3.5 h-3.5" />}
                        {crumb.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>

        {/* Center - Academic Year Switcher */}
        <div className="flex items-center justify-center">
          {/* Global Academic Year Selector */}
          <div className="flex items-center gap-2 bg-white border border-gray-200/80 px-3.5 py-1.5 rounded-xl shadow-2xs hover:border-[#531FFF]/40 transition-all">
            <Calendar className="w-3.5 h-3.5 text-[#531FFF] shrink-0" />
            <select
              value={activeAcademicYear}
              onChange={(e) => setActiveAcademicYear(e.target.value)}
              className="bg-transparent text-xs font-extrabold text-gray-900 focus:outline-none cursor-pointer"
              title="Pilih Tahun Ajaran Aktif"
            >
              {availableYears.map((y) => {
                const yName = y.name || y.id;
                return (
                  <option key={y.id || yName} value={yName}>
                    Tahun Ajaran {yName}
                  </option>
                );
              })}
            </select>
            <span className="text-gray-300 font-normal">|</span>
            <select
              value={activeSemester}
              onChange={(e) => setActiveSemester(e.target.value)}
              className="bg-transparent text-xs font-extrabold text-[#531FFF] focus:outline-none cursor-pointer"
              title="Pilih Semester Aktif"
            >
              <option value="Ganjil">Semester Ganjil</option>
              <option value="Genap">Semester Genap</option>
            </select>
          </div>
        </div>

        {/* Right - Actions */}
        <div className="flex-1 min-w-0 flex items-center justify-end gap-3 sm:gap-5 relative">
          <div className="relative">
            <button 
              onClick={() => setShowNotifDropdown(prev => !prev)}
              className="relative text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer"
              title="Notifikasi & Pengingat"
            >
              <Bell className="w-[18px] h-[18px]" />
              {(!onboardingCompleted || hasPendingReminder) ? (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white animate-pulse"></span>
              ) : (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-[#F8F9FC]"></span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {showNotifDropdown && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#531FFF]" />
                    Notifikasi & Pengingat
                  </h4>
                  <button
                    onClick={() => setShowNotifDropdown(false)}
                    className="text-xs text-gray-400 hover:text-gray-600 font-semibold cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>

                <div className="py-3 space-y-2.5">
                  {(!onboardingCompleted || hasPendingReminder) ? (
                    <div className="p-3.5 bg-amber-50/90 border border-amber-200/80 rounded-xl space-y-2">
                      <div className="flex items-start gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0 animate-pulse" />
                        <div>
                          <p className="font-bold text-amber-950 text-xs">
                            Pengingat Selesaikan Onboarding
                          </p>
                          <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                            Akun Anda belum menyelesaikan proses pendaftaran siswa. Lengkapi biodata, data orang tua & kontak darurat agar data tersimpan lengkap di Data Siswa.
                          </p>
                        </div>
                      </div>
                      <Link
                        href="/onboarding"
                        onClick={() => setShowNotifDropdown(false)}
                        className="block text-center w-full py-2 bg-[#531FFF] hover:bg-[#4314cc] text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                      >
                        Lanjutkan Onboarding Sekarang ➔
                      </Link>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs text-gray-400 font-medium">
                      Tidak ada notifikasi baru saat ini. Akun Anda telah aktif dan terverifikasi.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-gray-200"></div>

          <div 
            className="flex items-center gap-3 cursor-pointer group hover:bg-gray-100/50 p-1.5 rounded-lg -mr-1.5 transition-colors"
            onClick={handleLogout}
            title="Klik untuk logout"
          >
            <div className="relative">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-purple-50 text-[#531FFF] border border-purple-200 flex items-center justify-center font-extrabold text-xs">
                {userName.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="flex flex-col text-left hidden sm:flex">
              <span className="text-[10px] text-gray-400 font-bold uppercase">{userRole || "Admin"}</span>
              <span className="text-xs font-bold text-gray-900 leading-tight truncate max-w-[110px]">
                {userName}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-1" />
          </div>
        </div>
      </header>

      {/* Persistent Onboarding Reminder Banner for Unboarded Students */}
      {isStudentUnboarded && (
        <div className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-[#531FFF] p-[1px] shadow-sm animate-in fade-in duration-300">
          <div className="bg-amber-50/95 backdrop-blur-md px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-medium text-amber-900">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 font-bold text-xs shadow-xs animate-bounce">
                !
              </span>
              <span>
                <strong className="font-bold">Pengingat Onboarding:</strong> Halo <span className="font-bold text-gray-900">{userName}</span>, profil Anda belum lengkap. Silakan lengkapi formulir pendaftaran 4 langkah agar biodata Anda tersimpan ke Data Siswa sekolah.
              </span>
            </div>
            <Link
              href="/onboarding"
              className="px-4 py-1.5 bg-[#531FFF] hover:bg-[#4314cc] text-white font-bold rounded-xl shadow-xs transition-all hover:scale-105 active:scale-95 shrink-0"
            >
              Lengkapi Sekarang ➔
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
