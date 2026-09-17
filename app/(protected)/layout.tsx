"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layouts/sidebar";
import { Header } from "@/components/layouts/header";
import { AcademicYearProvider } from "@/context/AcademicYearContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ShieldAlert, Lock, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AuthRequiredState } from "@/components/ui/auth-required-state";

function ProtectedContentGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthLoading, role, isSuperAdmin, isStudent, isParent } = useAuth();
  const pathname = usePathname();

  // Route protection rules (URL without role prefixes)
  const isAccountsRoute = pathname === "/accounts" || pathname?.startsWith("/accounts/");
  const isRolesRoute = pathname === "/roles" || pathname?.startsWith("/roles/");
  const isTeachersRoute = pathname === "/teachers" || pathname?.startsWith("/teachers/");
  const isStudentsManagementRoute = pathname === "/data-siswa" || pathname?.startsWith("/data-siswa/");
  const isSettingsRoute = pathname === "/settings" || pathname?.startsWith("/settings/");
  const isClassesRoute = pathname === "/classes" || pathname?.startsWith("/classes/");
  const isHomeroomRoute = pathname === "/homeroom" || pathname?.startsWith("/homeroom/");
  const isSubjectsRoute = pathname === "/subjects" || pathname?.startsWith("/subjects/");
  const isTeacherAttendanceRoute = pathname === "/teacher-attendance" || pathname?.startsWith("/teacher-attendance/");
  const isFinancialReportsRoute = pathname === "/financial-reports" || pathname?.startsWith("/financial-reports/");
  const isAcademicYearsRoute = pathname === "/academic-years" || pathname?.startsWith("/academic-years/");
  const isParentsRoute = pathname === "/parents" || pathname?.startsWith("/parents/");

  const isSchoolAdminRoute = 
    isAccountsRoute ||
    isRolesRoute ||
    isTeachersRoute ||
    isStudentsManagementRoute ||
    isSettingsRoute ||
    isClassesRoute ||
    isHomeroomRoute ||
    isSubjectsRoute ||
    isTeacherAttendanceRoute ||
    isFinancialReportsRoute ||
    isAcademicYearsRoute ||
    isParentsRoute;

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

function getPageTitleFromPath(pathname: string | null): string {
  if (!pathname) return "Dashboard & Sistem Sekolah";
  if (pathname.includes("/data-siswa")) return "Data Siswa";
  if (pathname.includes("/parents")) return "Data Orang Tua & Wali";
  if (pathname.includes("/teachers")) return "Data Guru & Tenaga Pengajar";
  if (pathname.includes("/classes")) return "Kelas & Rombel";
  if (pathname.includes("/homeroom")) return "Wali Kelas";
  if (pathname.includes("/subjects")) return "Mata Pelajaran";
  if (pathname.includes("/schedule")) return "Jadwal Pelajaran";
  if (pathname.includes("/grades")) return "Penilaian & Nilai Siswa";
  if (pathname.includes("/teacher-attendance")) return "Presensi Guru";
  if (pathname.includes("/attendance")) return "Presensi Siswa";
  if (pathname.includes("/exams")) return "Jadwal & Hasil Ujian";
  if (pathname.includes("/calendar")) return "Kalender Akademik";
  if (pathname.includes("/announcements")) return "Pengumuman Sekolah";
  if (pathname.includes("/report-cards")) return "E-Rapor Siswa";
  if (pathname.includes("/financial-reports")) return "Laporan Keuangan";
  if (pathname.includes("/payments")) return "Pembayaran SPP";
  if (pathname.includes("/academic-years")) return "Tahun Ajaran";
  if (pathname.includes("/accounts")) return "Manajemen Akun System";
  if (pathname.includes("/roles")) return "Manajemen Role & Hak Akses";
  if (pathname.includes("/settings")) return "Pengaturan Sekolah";
  if (pathname.includes("/profile")) return "Profil Pengguna";
  if (pathname.includes("/dashboard") || pathname === "/") return "Dashboard Utama";
  return "Area Manajemen Sekolah";
}

  // 2. Unauthenticated state: Render statement & empty state with Back to Home & Login buttons
  if (!user) {
    const pageTitle = getPageTitleFromPath(pathname);
    return (
      <AuthRequiredState
        pageName={pageTitle}
        title="Autentikasi Akun Diperlukan"
        description={`Halaman ${pageTitle} merupakan area terproteksi sistem Smart School OS. Silakan masuk (login) dengan akun terdaftar untuk melihat atau mengelola data pada menu ini.`}
        loginHref={`/login?redirect=${encodeURIComponent(pathname || "/dashboard")}`}
        homeHref="/"
        showRegisterLink={true}
      />
    );
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
            href="/dashboard"
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
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-[#531FFF] hover:bg-[#531FFF]/90 text-white text-xs font-bold rounded-lg shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Dashboard Siswa</span>
          </Link>
        </div>
      </div>
    );
  }

  // 5. Strict Route Guard for Parents accessing school administration & master data
  if (isParent && isSchoolAdminRoute) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-xl max-w-md space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-lg bg-purple-50 text-[#531FFF] flex items-center justify-center mx-auto shadow-sm border border-purple-100">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-extrabold text-gray-900">Akses Dibatasi: Khusus Manajemen Sekolah</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Sebagai <strong>Orang Tua / Wali Murid</strong>, akun Anda hanya memiliki kewenangan memantau informasi perkembangan akademik putra/putri Anda. Menu administrasi dan master data sekolah tidak dapat diakses.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-[#531FFF] hover:bg-[#4314cc] text-white text-xs font-bold rounded-lg shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Dashboard Orang Tua</span>
          </Link>
        </div>
      </div>
    );
  }

  // 6. Authorized state: Render full layout with isolated components
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
        <ProtectedContentGuard>{children}</ProtectedContentGuard>
      </AcademicYearProvider>
    </AuthProvider>
  );
}
