'use client';

import { Mail, Lock, EyeOff, Eye, BarChart3, ShieldCheck, Zap, Building2, Loader2 } from "lucide-react";
import Link from "next/link";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/admin/dashboard");
    } catch (err: any) {
      setError(err.message || "Gagal masuk");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white flex flex-col lg:flex-row font-sans selection:bg-[#531FFF]/20">
      {/* Left Column - Branding & Features */}
      <div className="w-full lg:w-[45%] xl:w-[40%] bg-[#F8F9FE] p-10 lg:p-16 flex flex-col relative min-h-screen justify-center overflow-hidden border-r border-gray-100">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-[#531FFF] flex items-center justify-center shadow-sm">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white"/>
                 <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                 <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
               </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg text-gray-900 leading-none">Quick Schools</span>
              <span className="text-xs text-gray-500 font-medium mt-0.5">Operating System</span>
            </div>
          </div>

          <h1 className="text-3xl lg:text-[2.5rem] font-bold tracking-tight text-gray-900 mb-4 leading-[1.1]">
            Kelola sekolah<br />
            lebih <span className="text-[#531FFF]">cerdas</span>,<br />
            semua dalam satu<br />
            sistem.
          </h1>
          
          <p className="text-gray-500 text-sm mb-8 max-w-sm leading-relaxed">
            Quick Schools Operating System membantu sekolah mengelola akademik, keuangan, kehadiran, dan komunikasi dengan mudah.
          </p>

          <div className="space-y-4 mb-20 bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative z-10 w-full max-w-md">
             <div className="flex gap-4">
               <div className="w-10 h-10 rounded-full bg-[#531FFF] flex items-center justify-center shrink-0 shadow-sm shadow-[#531FFF]/20">
                 <BarChart3 className="w-5 h-5 text-white" />
               </div>
               <div>
                 <h3 className="text-sm font-bold text-gray-900">Manajemen Terintegrasi</h3>
                 <p className="text-xs text-gray-500 mt-0.5 leading-relaxed pr-4">Semua data sekolah dalam satu platform yang terintegrasi.</p>
               </div>
             </div>
             <div className="flex gap-4 pt-1">
               <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/20">
                 <ShieldCheck className="w-5 h-5 text-white" />
               </div>
               <div>
                 <h3 className="text-sm font-bold text-gray-900">Aman & Terpercaya</h3>
                 <p className="text-xs text-gray-500 mt-0.5 leading-relaxed pr-4">Keamanan data tingkat enterprise untuk melindungi informasi sekolah.</p>
               </div>
             </div>
             <div className="flex gap-4 pt-1">
               <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/20">
                 <Zap className="w-5 h-5 text-white" />
               </div>
               <div>
                 <h3 className="text-sm font-bold text-gray-900">Mudah Digunakan</h3>
                 <p className="text-xs text-gray-500 mt-0.5 leading-relaxed pr-4">Antarmuka modern yang intuitif untuk semua pengguna.</p>
               </div>
             </div>
          </div>

          {/* Bottom Illustration Placeholder using pure CSS shapes */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[350px] h-[200px] flex items-end justify-center pointer-events-none opacity-90 overflow-hidden">
            {/* Base platform */}
            <div className="absolute bottom-4 w-64 h-16 bg-[#531FFF]/5 rounded-[100%] blur-md"></div>
            {/* Building elements */}
            <div className="relative w-48 h-32 bg-white rounded-t-xl border border-gray-100 shadow-md flex justify-center items-end bottom-12">
               {/* Roof */}
               <div className="absolute -top-10 w-56 h-12 bg-[#531FFF]/10 rounded-t-lg" style={{clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)"}}></div>
               <div className="absolute -top-8 w-52 h-10 bg-[#531FFF]/20" style={{clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)"}}></div>
               {/* Clock */}
               <div className="absolute top-4 w-8 h-8 bg-gray-50 rounded-full border border-gray-200 flex items-center justify-center">
                 <div className="w-1 h-3 bg-gray-400 rounded-full origin-bottom rotate-45 transform translate-y-[-2px] translate-x-[-1px]"></div>
               </div>
               {/* Door */}
               <div className="w-12 h-16 bg-[#531FFF] rounded-t-lg"></div>
               {/* Bushes */}
               <div className="absolute -left-12 -bottom-2 w-14 h-14 bg-emerald-400 rounded-full"></div>
               <div className="absolute -left-6 -bottom-4 w-10 h-10 bg-emerald-500 rounded-full"></div>
               <div className="absolute -right-10 -bottom-2 w-12 h-12 bg-emerald-400 rounded-full"></div>
               <div className="absolute -right-4 -bottom-4 w-10 h-10 bg-emerald-500 rounded-full"></div>
            </div>
            {/* Flag */}
             <div className="absolute bottom-44 mb-1 left-1/2 -translate-x-1/2">
               <div className="w-1 h-12 bg-gray-300 rounded-full"></div>
               <div className="absolute top-0 right-1 w-10 h-6 bg-pink-400 rounded-r shadow-sm" style={{clipPath: "polygon(0 0, 100% 10%, 90% 50%, 100% 90%, 0 100%)"}}></div>
             </div>
          </div>
          
          <div className="absolute bottom-6 left-0 w-full text-center z-10">
            <p className="text-[11px] font-medium text-gray-400">
              © 2025 Quick Schools Operating System. All rights reserved.
            </p>
          </div>
        </div>

        {/* Right Column - Form */}
        <div className="w-full lg:flex-1 flex flex-col justify-center px-10 lg:px-24 xl:px-32 py-12 relative bg-white min-h-screen border-l border-gray-100/50">
          <div className="w-full max-w-[420px] mx-auto">
            
            <h2 className="text-[1.75rem] font-bold tracking-tight text-gray-900 mb-1 flex items-center gap-2">
              Selamat datang kembali <span className="text-2xl">👋</span>
            </h2>
            <p className="text-gray-500 text-sm mb-8">Masuk ke akun Quick Schools Anda</p>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">
                {error}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleLogin}>
              
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-gray-900" htmlFor="email">Email atau Username</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Masukkan email atau username" 
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] placeholder:text-gray-400"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-gray-900" htmlFor="password">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password" 
                    className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] placeholder:text-gray-400"
                    required
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div className="flex justify-end pt-1">
                <Link href="#" className="text-[13px] font-semibold text-[#531FFF] hover:text-[#531FFF]/80">Lupa password?</Link>
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 bg-[#531FFF] hover:bg-[#531FFF]/90 text-white font-medium py-3 rounded-xl text-[15px] transition-all shadow-sm disabled:opacity-70"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Masuk
                </button>
              </div>
              
              <div className="relative py-4 flex items-center justify-center">
                <div className="absolute inset-x-0 h-px bg-gray-200" />
                <span className="relative z-10 bg-white px-4 text-xs font-medium text-gray-500">
                  atau masuk dengan
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pb-2">
                <button type="button" className="flex items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 rounded-xl text-[13px] transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                     <path fillRule="evenodd" clipRule="evenodd" d="M23.04 12.2614C23.04 11.4459 22.9668 10.6618 22.8309 9.90909H12V14.3575H18.1891C17.922 15.795 17.1124 17.0227 15.8943 17.8382V20.7136H19.6109C21.7855 18.7118 23.04 15.7636 23.04 12.2614Z" fill="#4285F4"/>
                     <path fillRule="evenodd" clipRule="evenodd" d="M12 23.4998C15.105 23.4998 17.7082 22.4703 19.6109 20.7135L15.8943 17.8381C14.8648 18.5276 13.545 18.9453 12 18.9453C9.00497 18.9453 6.46951 16.9208 5.56542 14.185H1.72314V17.164C3.61542 20.9231 7.50451 23.4998 12 23.4998Z" fill="#34A853"/>
                     <path fillRule="evenodd" clipRule="evenodd" d="M5.56523 14.1855C5.33523 13.496 5.20455 12.7586 5.20455 12.0005C5.20455 11.2423 5.33523 10.5049 5.56523 9.8154V6.83643H1.72295C0.944318 8.38415 0.5 10.1413 0.5 12.0005C0.5 13.8595 0.944318 15.6168 1.72295 17.1645L5.56523 14.1855Z" fill="#FBBC05"/>
                     <path fillRule="evenodd" clipRule="evenodd" d="M12 5.05455C13.6882 5.05455 15.2082 5.635 16.405 6.77455L19.695 3.48455C17.6977 1.625 15.0945 0.5 12 0.5C7.50451 0.5 3.61542 3.07682 1.72314 6.83636L5.56542 9.81545C6.46951 7.07955 9.00497 5.05455 12 5.05455Z" fill="#EA4335"/>
                  </svg>
                  Google
                </button>
                
                <button type="button" className="flex items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 rounded-xl text-[13px] transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 10H0V0H10V10Z" fill="#F25022"/>
                    <path d="M21 10H11V0H21V10Z" fill="#7FBA00"/>
                    <path d="M10 21H0V11H10V21Z" fill="#00A4EF"/>
                    <path d="M21 21H11V11H21V21Z" fill="#FFB900"/>
                  </svg>
                  Microsoft
                </button>
              </div>

              <button type="button" className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-xl text-[13px] transition-colors">
                <Building2 className="w-4 h-4 text-gray-500" />
                SSO Sekolah
              </button>
              
              <div className="pt-6 text-center">
                <p className="text-[13px] font-medium text-gray-500">
                  Belum punya akun? <Link href="/register" className="text-[#531FFF] hover:underline font-bold">Daftar sekarang</Link>
                </p>
              </div>
            </form>
          </div>
          
        </div>
    </main>
  );
}
