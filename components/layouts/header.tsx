"use client";

import { Bell, ChevronDown, ChevronRight, Home, Calendar } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState("Loading...");
  const [userRole, setUserRole] = useState("");

  const { activeAcademicYear, activeSemester, availableYears, setActiveAcademicYear, setActiveSemester } = useAcademicYear();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setUserName(userDoc.data().name || "User");
            setUserRole(userDoc.data().role || "admin");
          } else {
            setUserName(user.email?.split('@')[0] || "User");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUserName(user.email?.split('@')[0] || "User");
        }
      } else {
        setUserName("Guest");
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

  return (
    <header className="h-[72px] bg-[#F8F9FC] flex items-center px-8 shrink-0 sticky top-0 z-50 w-full mb-2 border-b border-gray-100">
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
      <div className="flex-1 min-w-0 flex items-center justify-end gap-3 sm:gap-5">
        <button className="relative text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100">
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-[#F8F9FC]"></span>
        </button>

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
  );
}
