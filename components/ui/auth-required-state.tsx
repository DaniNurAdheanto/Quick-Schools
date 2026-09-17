"use client";

import React from "react";
import Link from "next/link";
import { Lock, Home, LogIn, ShieldAlert, Sparkles } from "lucide-react";

interface AuthRequiredStateProps {
  pageName?: string;
  title?: string;
  description?: string;
  loginHref?: string;
  homeHref?: string;
  showRegisterLink?: boolean;
}

export function AuthRequiredState({
  pageName,
  title = "Autentikasi Akun Diperlukan",
  description,
  loginHref = "/login",
  homeHref = "/",
  showRegisterLink = true,
}: AuthRequiredStateProps) {
  const defaultDesc = pageName
    ? `Halaman ${pageName} merupakan area terproteksi sistem Smart School OS. Silakan masuk (login) ke akun terdaftar Anda untuk melihat dan mengelola data.`
    : "Halaman ini merupakan area terproteksi sistem Smart School OS. Silakan masuk (login) ke akun terdaftar Anda untuk melanjutkan.";

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-[#531FFF]/20">
      {/* Background Decorative Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#531FFF]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-400/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg z-10 animate-in fade-in zoom-in-95 duration-300">
        {/* Main Card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-purple-900/5 p-6 sm:p-10 text-center relative overflow-hidden">
          {/* Top Decorative Line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#531FFF] via-purple-500 to-[#531FFF]" />

          {/* Icon Badge */}
          <div className="relative mx-auto w-20 h-20 mb-6">
            <div className="w-20 h-20 rounded-2xl bg-purple-50 text-[#531FFF] border border-purple-100 flex items-center justify-center shadow-inner mx-auto">
              <Lock className="w-9 h-9" />
            </div>
            <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center border-2 border-white shadow-xs" title="Perlu Autentikasi">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Badge Tag */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-[#531FFF] text-[11px] font-bold border border-purple-100 mb-3">
            <Sparkles className="w-3 h-3 text-[#531FFF]" />
            <span>Akses Terbatas • Perlu Login</span>
          </div>

          {/* Title & Description */}
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight mb-2.5">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed max-w-md mx-auto mb-8">
            {description || defaultDesc}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            {/* Back to Home Button */}
            <Link
              href={homeHref}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-bold transition-all shadow-2xs active:scale-95 cursor-pointer order-2 sm:order-1"
            >
              <Home className="w-4 h-4 text-gray-500" />
              <span>Back to Home</span>
            </Link>

            {/* Login Button */}
            <Link
              href={loginHref}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#531FFF] hover:bg-[#4314cc] text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-[#531FFF]/25 hover:shadow-lg hover:shadow-[#531FFF]/30 active:scale-95 cursor-pointer order-1 sm:order-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk Sekarang (Login)</span>
            </Link>
          </div>

          {/* Optional Registration Link */}
          {showRegisterLink && (
            <div className="pt-6 mt-6 border-t border-gray-100 text-xs text-gray-500 flex items-center justify-center gap-1.5">
              <span>Belum memiliki akun terdaftar?</span>
              <Link
                href="/register"
                className="font-bold text-[#531FFF] hover:underline inline-flex items-center gap-1"
              >
                <span>Daftar Akun</span>
              </Link>
            </div>
          )}
        </div>

        {/* Footer Brand Info */}
        <p className="text-center text-[11px] text-gray-400 font-medium mt-6">
          Quick Schools Smart Operating System &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
