"use client";

import { Search, Bell, ChevronDown, Command, CalendarDays, ChevronRight, Home } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState("Loading...");
  const [userRole, setUserRole] = useState("");

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
    
    // Remove query params and trailing slashes, then split
    const pathWithoutQuery = pathname.split('?')[0];
    const pathParts = pathWithoutQuery.split('/').filter(p => p);
    
    // Default to Home/Dashboard if we're at / or /admin
    if (pathParts.length === 0 || (pathParts.length === 1 && pathParts[0] === 'admin')) {
      return [{ label: "Home", href: "/admin/dashboard" }, { label: "Dashboard", href: "/admin/dashboard" }];
    }
    
    const breadcrumbs = [];
    breadcrumbs.push({ label: "Home", href: "/admin/dashboard" });
    
    // Skip 'admin' in breadcrumbs to make it cleaner, or keep it depending on preference
    // Let's hide 'admin' and capitalize the rest
    let currentPath = "";
    pathParts.forEach((part, index) => {
      currentPath += `/${part}`;
      if (part === "admin" || part === "(protected)") return; // skip showing these internally
      
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
    <header className="h-[72px] bg-[#F8F9FC] flex items-center px-8 shrink-0 sticky top-0 z-10 w-full mb-2">
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

      {/* Center - Search */}
      <div className="flex-1 min-w-0 flex justify-center">
         <div className="relative group w-full max-w-[400px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search for anything..." 
            className="w-full h-10 pl-10 pr-14 text-sm bg-transparent !outline-none !ring-0 border-none placeholder:text-gray-400"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-gray-400 opacity-60">
            <Command className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold">K</span>
          </div>
        </div>
      </div>

      {/* Right - Actions */}
      <div className="flex-1 min-w-0 flex items-center justify-end gap-3 sm:gap-5">
        <button className="relative text-gray-400 hover:text-gray-600 transition-colors">
          <Bell className="w-[20px] h-[20px]" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border-2 border-[#F8F9FC]"></span>
        </button>

        <div className="h-6 w-px bg-gray-200"></div>

        <div 
          className="flex items-center gap-3 cursor-pointer group hover:bg-gray-100/50 p-1.5 rounded-lg -mr-1.5 transition-colors"
          onClick={handleLogout}
          title="Click to logout"
        >
          <div className="relative">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-200 border border-gray-200 flex items-center justify-center font-bold text-gray-500">
              {userName.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[11px] text-gray-400 font-medium capitalize">{userRole || "Admin"}</span>
            <span className="text-sm font-semibold text-gray-900 leading-tight truncate max-w-[120px]">
              {userName}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 ml-1" />
        </div>
      </div>
    </header>
  );
}
