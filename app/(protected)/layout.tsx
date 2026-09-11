"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layouts/sidebar";
import { Header } from "@/components/layouts/header";
import { AcademicYearProvider } from "@/context/AcademicYearContext";
import { ToastProvider } from "@/context/ToastContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ShieldAlert, Lock, ArrowLeft } from "lucide-react";
import Link from "next/link";

function ProtectedContentGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthLoading, role, isSuperAdmin, isStudent } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Redirect to login if user is not authenticated after loading completes
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/login");
    }
  }, [isAuthLoading, user, router]);

  // Route protection rules
  const isAccountsRoute = pathname?.startsWith("/admin/accounts");
  const isRolesRoute = pathname?.startsWith("/admin/roles");
  const isTeachersRoute = pathname?.startsWith("/admin/teachers");
  const isStudentsManagementRoute = pathname === "/admin/data-siswa" || pathname?.startsWith("/admin/data-siswa/");

  // 1. Loading screen: NEVER render Super Admin layout while verifying
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex flex-col items-center justify-center p-6 selection:bg-[#531FFF]/20">
        <div className="flex flex-col items-center gap-6 max-w-sm text-center animate-in fade-in zoom-in-95 duration-300">
          {/* Branded Quick Schools Logo with subtle pulsing glow */}
          <div className="relative">
            <div className="w-16 h-16 rounded-xl bg-white border border-gray-100 shadow-xl shadow-[#531FFF]/10 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-pulse">
                <path d="M14 6C17.3137 6 20 8.68629 20 12C20 15.3137 17.3137 18 14 18C10.6863 18 8 15.3137 8 12C8 8.68629 10.6863 6 14 6Z" stroke="#531FFF" strokeWidth="3.5" />
                <circle cx="14" cy="12" r="2.5" fill="#531FFF" />
              </svg>
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#531FFF] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-[#531FFF]"></span>
            </span>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-base font-extrabold text-gray-900 tracking-tight">Quick Schools Operating System</h2>
            <p className="text-xs text-gray-400 font-medium">Memverifikasi hak akses & menyiapkan dashboard...</p>
          </div>

          <div className="w-36 h-1.5 bg-gray-200/80 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#531FFF] to-indigo-500 rounded-full animate-indeterminate" />
          </div>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated state fallback
  if (!user) {
    return null;
  }

  // 3. Strict Route Guard: Manajemen Akun System is exclusively for Super Admin
  if (isAccountsRoute && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-xl max-w-md space-y-5">
          <div className="w-16 h-16 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-extrabold text-gray-900">Akses Terbatas: Khusus Super Admin</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Menu <strong>Manajemen Akun System</strong> hanya dapat diakses oleh pengguna dengan role <strong>Super Admin</strong>. Akun Anda terdaftar sebagai <span className="font-bold text-gray-800 uppercase">{role}</span>.
            </p>
          </div>
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-[#531FFF] hover:bg-[#531FFF]/90 text-white text-xs font-bold rounded-lg shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Dashboard Saya</span>
          </Link>
        </div>
      </div>
    );
  }

  // 4. Strict Route Guard for Students accessing staff management
  if (isStudent && (isTeachersRoute || isStudentsManagementRoute || isRolesRoute)) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-xl max-w-md space-y-5">
          <div className="w-16 h-16 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-extrabold text-gray-900">Halaman Tidak Tersedia</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Halaman ini diperuntukkan bagi Guru dan Manajemen Sekolah. Anda dapat mengakses informasi Anda di Portal Siswa.
            </p>
          </div>
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-[#531FFF] hover:bg-[#531FFF]/90 text-white text-xs font-bold rounded-lg shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Dashboard Siswa</span>
          </Link>
        </div>
      </div>
    );
  }

  // 5. Authorized state: Render full layout with isolated components
  return (
    <div className="min-h-screen bg-[#F8F9FC] flex text-gray-900 font-sans selection:bg-[#531FFF]/20">
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-screen min-w-0">
        <Header />
        <div className="flex-1 overflow-auto flex flex-col relative w-full h-full">
          <div className="flex-1 flex flex-col w-full h-full">
            {children}
          </div>
          <footer className="w-full px-8 py-6 flex items-center justify-between text-[11px] text-gray-400 font-medium">
            <p>© 2025 Smart School Operating System. All rights reserved.</p>
            <p>Versi 1.0.0</p>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AcademicYearProvider>
        <ToastProvider>
          <ProtectedContentGuard>{children}</ProtectedContentGuard>
        </ToastProvider>
      </AcademicYearProvider>
    </AuthProvider>
  );
}
