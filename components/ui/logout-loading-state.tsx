"use client";

import React from "react";
import Image from "next/image";
import { LogOut, ShieldCheck, Loader2 } from "lucide-react";
import { useSchoolProfile } from "@/context/SchoolProfileContext";

interface LogoutLoadingStateProps {
  title?: string;
  subtitle?: string;
}

export function LogoutLoadingState({
  title = "Sedang Mengakhiri Sesi...",
  subtitle = "Menghapus sesi login secara aman dan mengalihkan Anda ke halaman masuk. Mohon tunggu sejenak..."
}: LogoutLoadingStateProps) {
  const { profile } = useSchoolProfile();

  return (
    <div className="fixed inset-0 z-[9999] min-h-screen bg-[#F8F9FC] flex flex-col items-center justify-center p-6 selection:bg-[#531FFF]/20 animate-in fade-in duration-200">
      {/* Background Decorative Ambient Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-gradient-to-tr from-[#531FFF]/15 via-indigo-500/10 to-purple-400/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-purple-300/10 rounded-full blur-3xl" />
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-indigo-300/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md z-10 animate-in fade-in zoom-in-95 duration-300">
        {/* Main Glass Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-gray-100/90 shadow-2xl shadow-purple-950/10 p-8 sm:p-10 text-center relative overflow-hidden">
          {/* Top Gradient Accent Ribbon */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#531FFF] via-indigo-500 to-purple-600" />

          {/* Central Animated Badge */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-2xl bg-[#531FFF]/15 animate-ping opacity-30" />
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-50 via-indigo-50/60 to-white border border-purple-100 flex items-center justify-center shadow-inner relative">
              {profile.logoUrl ? (
                <div className="relative w-12 h-12">
                  <Image
                    src={profile.logoUrl}
                    alt={profile.schoolName || "Logo"}
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
              ) : (
                <LogOut className="w-9 h-9 text-[#531FFF] transition-transform animate-pulse" />
              )}
            </div>
            {/* Spinning Indicator Badge */}
            <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#531FFF] text-white shadow-md border-2 border-white">
              <Loader2 className="w-4 h-4 animate-spin" />
            </span>
          </div>

          {/* Security Tag */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-[#531FFF] text-[11px] font-bold border border-purple-100 mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-[#531FFF]" />
            <span>Sesi Aman • Quick Schools OS</span>
          </div>

          {/* Titles */}
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight mb-2">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed max-w-sm mx-auto">
            {subtitle}
          </p>

          {/* Smooth Gradient Progress Bar */}
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mt-6 mb-3 relative">
            <div className="h-full bg-gradient-to-r from-[#531FFF] via-indigo-500 to-[#531FFF] rounded-full animate-indeterminate shadow-xs" />
          </div>

          {/* Micro Status Steps */}
          <div className="pt-4 border-t border-gray-100/80 flex items-center justify-center gap-4 text-[11px] font-semibold text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#531FFF] animate-pulse" />
              Sesi Dinonaktifkan
            </span>
            <span className="text-gray-300">•</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              Cache Dibersihkan
            </span>
            <span className="text-gray-300">•</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Menuju Login
            </span>
          </div>
        </div>

        {/* Brand Footer Signature */}
        <p className="text-center text-[11px] text-gray-400 font-medium mt-4">
          {profile.schoolName || "Smart School Operating System"}
        </p>
      </div>
    </div>
  );
}
