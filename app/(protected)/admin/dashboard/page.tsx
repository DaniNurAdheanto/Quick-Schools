"use client";

import { 
  Users, 
  GraduationCap, 
  CalendarCheck, 
  Wallet, 
  Plus,
  ChevronDown,
  Megaphone,
  Award,
  MoreVertical,
  Activity,
  ArrowUp,
  ArrowDown,
  Calendar,
  Clock,
  Clock3,
  BarChart2,
  FileText,
  Settings,
  Sparkles,
  AlertTriangle,
  Star,
  CheckCircle2,
  UserCheck,
  Shield,
  Droplet
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import Image from "next/image";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const ATTENDANCE_DATA = [
  { date: '15 Mei', value: 40 },
  { date: '16 Mei', value: 65 },
  { date: '17 Mei', value: 80 },
  { date: '18 Mei', value: 60 },
  { date: '19 Mei', value: 75 },
  { date: '20 Mei', value: 97 },
  { date: '21 Mei', value: 85 },
];

const DISTRIBUTION_DATA = [
  { name: 'Average', value: 75, color: '#4ADE80' }, 
  { name: 'Remaining', value: 25, color: '#E2E8F0' }, 
];

export default function DashboardPage() {
  const [userName, setUserName] = useState("Adiratna");
  const [greeting, setGreeting] = useState("Selamat pagi");
  const [academicYear, setAcademicYear] = useState("2026 / 2027");
  const [currentDate, setCurrentDate] = useState("");
  const [currentDay, setCurrentDay] = useState("");

  useEffect(() => {
    const updateGreeting = () => {
      const now = new Date();
      const currentHour = (now.getUTCHours() + 7) % 24; // WIB (UTC+7)
      
      if (currentHour >= 5 && currentHour < 12) {
        setGreeting("Selamat pagi");
      } else if (currentHour >= 12 && currentHour < 15) {
        setGreeting("Selamat siang");
      } else if (currentHour >= 15 && currentHour < 18) {
        setGreeting("Selamat sore");
      } else {
        setGreeting("Selamat malam");
      }

      const year = now.getFullYear();
      const month = now.getMonth();
      const startYear = month >= 6 ? year : year - 1;
      setAcademicYear(`${startYear} / ${startYear + 1}`);

      const dateFormatter = new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      setCurrentDate(dateFormatter.format(now));

      const dayFormatter = new Intl.DateTimeFormat('id-ID', {
        weekday: 'long'
      });
      setCurrentDay(dayFormatter.format(now));
    };
    
    updateGreeting();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists() && userDoc.data().name) {
            setUserName(userDoc.data().name);
          } else {
            setUserName(user.displayName || user.email?.split('@')[0] || "User");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUserName(user.displayName || user.email?.split('@')[0] || "User");
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="p-8 pb-12 max-w-[1600px] mx-auto w-full h-full space-y-6">
      
      {/* Top Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#4E54C8] to-[#8F94FB] p-8 text-white shadow-md flex justify-between items-center">
        <div className="z-10 relative space-y-6 flex-1">
          <div>
            <h1 className="text-[32px] font-bold tracking-tight mb-2 flex items-center gap-2">
              {greeting}, {userName}! <span>👋</span>
            </h1>
            <p className="text-white/80 text-[15px]">Kelola sekolah dengan lebih mudah hari ini.</p>
          </div>
          
          <div className="flex gap-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-white/80 font-medium">Tahun Ajaran</span>
                <span className="text-lg font-bold">{academicYear}</span>
              </div>
            </div>

            <div className="w-px h-10 bg-white/20"></div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <CalendarCheck className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-white/80 font-medium">Hari ini</span>
                <span className="text-lg font-bold">{currentDate || "Memuat..."}</span>
                <span className="text-[11px] text-white/80 mt-[-2px]">{currentDay}</span>
              </div>
            </div>

            <div className="w-px h-10 bg-white/20"></div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Clock3 className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-white/80 font-medium">Tingkat Kehadiran</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">95,4%</span>
                  <span className="text-[10px] bg-emerald-500/80 px-1.5 py-0.5 rounded-full flex items-center text-white font-bold backdrop-blur-sm border border-emerald-400">
                    <ArrowUp className="w-2.5 h-2.5 mr-0.5" /> 1.2%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Action Buttons & Illustration area */}
        <div className="z-10 relative flex flex-col items-end gap-3 min-w-[200px]">
          <button className="w-full flex items-center justify-center gap-2 bg-white text-[#4E54C8] hover:bg-gray-50 px-5 py-3 rounded-xl text-sm font-bold transition-colors shadow-sm">
            <BarChart2 className="w-4 h-4" />
            Generate Report
          </button>
          <button className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-5 py-3 rounded-xl text-sm font-bold transition-all backdrop-blur-sm">
            <Calendar className="w-4 h-4" />
            Lihat Kalender
          </button>
        </div>
        
        {/* Background Building Illustration Placeholder */}
        <div className="absolute right-[25%] bottom-0 h-[100px] w-[300px] pointer-events-none opacity-60">
            {/* Simple CSS shapes imitating buildings since we don't have the exact image */}
            <div className="absolute bottom-0 left-10 w-20 h-28 bg-[#A8B2FF] rounded-t-lg"></div>
            <div className="absolute bottom-0 left-28 w-32 h-36 bg-[#E2E8FF] rounded-t-lg">
              {/* Clock */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white flex items-center justify-center">
                <div className="w-1 h-3 bg-gray-300 rounded-full origin-bottom rotate-45 transform translate-y-[-2px]"></div>
              </div>
            </div>
            <div className="absolute bottom-0 left-56 w-24 h-24 bg-[#B8C2FF] rounded-t-lg"></div>
            {/* Base platform */}
            <div className="absolute bottom-0 left-0 w-full h-2 bg-[#CBD5E1]"></div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Total Siswa */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] relative overflow-hidden flex flex-col justify-between h-[130px]">
          <div className="flex gap-4 z-10">
            <div className="w-10 h-10 rounded-full bg-[#531FFF]/10 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 text-[#531FFF]" />
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-gray-500 mb-0.5">Total Siswa</p>
              <div className="flex items-end gap-2 justify-between w-full">
                <span className="text-[28px] leading-none font-bold text-gray-900 tracking-tight">2.456</span>
                <div className="flex flex-col items-end gap-0.5 mb-1">
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded flex items-center gap-0.5">
                    <ArrowUp className="w-2.5 h-2.5" /> 12
                  </span>
                  <span className="text-[8px] text-gray-400">dari bulan lalu</span>
                </div>
              </div>
            </div>
          </div>
          {/* Subtle line chart graphic bottom */}
          <svg className="absolute bottom-0 left-0 w-full h-8 opacity-20" viewBox="0 0 100 20" preserveAspectRatio="none">
             <path d="M0,20 L10,15 L30,18 L50,8 L70,12 L90,2 L100,2 L100,20 Z" fill="url(#grad1)" />
             <polyline points="0,15 10,15 30,18 50,8 70,12 90,2 100,2" fill="none" stroke="#531FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
             <defs>
               <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
                 <stop offset="0%" stopColor="#531FFF" stopOpacity="0.5" />
                 <stop offset="100%" stopColor="#531FFF" stopOpacity="0" />
               </linearGradient>
             </defs>
          </svg>
        </div>

        {/* Total Guru */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] relative overflow-hidden flex flex-col justify-between h-[130px]">
          <div className="flex gap-4 z-10">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-gray-500 mb-0.5">Total Guru</p>
              <div className="flex items-end gap-2 justify-between w-full">
                <span className="text-[28px] leading-none font-bold text-gray-900 tracking-tight">156</span>
                <div className="flex flex-col items-end gap-0.5 mb-1">
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded flex items-center gap-0.5">
                    <ArrowUp className="w-2.5 h-2.5" /> 4
                  </span>
                  <span className="text-[8px] text-gray-400">dari bulan lalu</span>
                </div>
              </div>
            </div>
          </div>
          <svg className="absolute bottom-0 left-0 w-full h-8 opacity-20" viewBox="0 0 100 20" preserveAspectRatio="none">
             <path d="M0,20 L15,10 L35,16 L55,5 L75,10 L100,2 L100,20 Z" fill="url(#grad2)" />
             <polyline points="0,10 15,10 35,16 55,5 75,10 100,2" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
             <defs>
               <linearGradient id="grad2" x1="0%" y1="0%" x2="0%" y2="100%">
                 <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.5" />
                 <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
               </linearGradient>
             </defs>
          </svg>
        </div>

        {/* Total Kelas */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] relative overflow-hidden flex flex-col justify-between h-[130px]">
          <div className="flex gap-4 z-10">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M4 22H20C21.1 22 22 21.1 22 20V6C22 4.9 21.1 4 20 4H14L12 2H4C2.9 2 2 2.9 2 4V20C2 21.1 2.9 22 4 22Z" fill="#10B981" fillOpacity="0.8"/>
               </svg>
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-gray-500 mb-0.5">Total Kelas</p>
              <div className="flex items-end gap-2 justify-between w-full">
                <span className="text-[28px] leading-none font-bold text-gray-900 tracking-tight">64</span>
                <div className="flex flex-col items-end gap-0.5 mb-1">
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded flex items-center gap-0.5">
                    <ArrowUp className="w-2.5 h-2.5" /> 2
                  </span>
                  <span className="text-[8px] text-gray-400">dari bulan lalu</span>
                </div>
              </div>
            </div>
          </div>
          <svg className="absolute bottom-0 left-0 w-full h-8 opacity-20" viewBox="0 0 100 20" preserveAspectRatio="none">
             <path d="M0,20 L10,12 L30,15 L60,4 L80,9 L100,5 L100,20 Z" fill="url(#grad3)" />
             <polyline points="0,12 10,12 30,15 60,4 80,9 100,5" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
             <defs>
               <linearGradient id="grad3" x1="0%" y1="0%" x2="0%" y2="100%">
                 <stop offset="0%" stopColor="#10B981" stopOpacity="0.5" />
                 <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
               </linearGradient>
             </defs>
          </svg>
        </div>

        {/* Kehadiran Hari Ini */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] relative overflow-hidden flex flex-col justify-between h-[130px]">
          <div className="flex gap-4 z-10">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
              <CalendarCheck className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-gray-500 mb-0.5">Kehadiran Hari Ini</p>
              <div className="flex items-end gap-2 justify-between w-full">
                <span className="text-[28px] leading-none font-bold text-gray-900 tracking-tight">95,4%</span>
                <div className="flex flex-col items-end gap-0.5 mb-1">
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded flex items-center gap-0.5">
                    <ArrowUp className="w-2.5 h-2.5" /> 1.2%
                  </span>
                  <span className="text-[8px] text-gray-400">dari kemarin</span>
                </div>
              </div>
            </div>
          </div>
          <svg className="absolute bottom-0 left-0 w-full h-8 opacity-20" viewBox="0 0 100 20" preserveAspectRatio="none">
             <path d="M0,20 L20,15 L40,8 L70,12 L90,2 L100,4 L100,20 Z" fill="url(#grad4)" />
             <polyline points="0,15 20,15 40,8 70,12 90,2 100,4" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
             <defs>
               <linearGradient id="grad4" x1="0%" y1="0%" x2="0%" y2="100%">
                 <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.5" />
                 <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
               </linearGradient>
             </defs>
          </svg>
        </div>

        {/* Pendapatan */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] relative overflow-hidden flex flex-col justify-between h-[130px]">
          <div className="flex gap-4 z-10">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-gray-500 mb-0.5 whitespace-nowrap">Pendapatan Bulan Ini</p>
              <div className="flex items-end gap-2 justify-between w-full">
                <span className="text-[20px] leading-none font-bold text-gray-900 tracking-tight pb-0.5">Rp 125M</span>
                <div className="flex flex-col items-end gap-0.5 mb-1">
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded flex items-center gap-0.5">
                    <ArrowUp className="w-2.5 h-2.5" /> 8.4%
                  </span>
                  <span className="text-[8px] text-gray-400">dari bulan lalu</span>
                </div>
              </div>
            </div>
          </div>
          <svg className="absolute bottom-0 left-0 w-full h-8 opacity-20" viewBox="0 0 100 20" preserveAspectRatio="none">
             <path d="M0,20 L15,10 L30,12 L50,4 L80,10 L100,2 L100,20 Z" fill="url(#grad5)" />
             <polyline points="0,10 15,10 30,12 50,4 80,10 100,2" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
             <defs>
               <linearGradient id="grad5" x1="0%" y1="0%" x2="0%" y2="100%">
                 <stop offset="0%" stopColor="#EF4444" stopOpacity="0.5" />
                 <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
               </linearGradient>
             </defs>
          </svg>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Area Chart Kehadiran */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-[16px] text-gray-900">Analitik Kehadiran</h2>
            <button className="flex items-center gap-2 text-[11px] font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm">
              7 Hari Terakhir
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
          <div className="flex flex-1 gap-6">
             {/* Chart */}
             <div className="flex-1 min-w-0 pr-2 mt-4">
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={ATTENDANCE_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                   <XAxis 
                     dataKey="date" 
                     axisLine={false} 
                     tickLine={false} 
                     tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 500 }} 
                     dy={10} 
                   />
                   <YAxis 
                     axisLine={false} 
                     tickLine={false} 
                     tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 500 }} 
                     ticks={[0, 25, 50, 75, 100]}
                     domain={[0, 100]}
                     tickFormatter={(val) => `${val}%`}
                   />
                   <RechartsTooltip 
                      cursor={{ stroke: '#531FFF', strokeWidth: 1, strokeDasharray: '3 3' }}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100 min-w-[120px]">
                              <p className="text-[11px] text-gray-500 mb-1 font-medium">{label}</p>
                              <p className="font-bold text-gray-900 text-sm">
                                Kehadiran: <span className="text-[#531FFF]">{payload[0].value}%</span>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                   />
                   <Line 
                     type="monotone" 
                     dataKey="value" 
                     stroke="#531FFF" 
                     strokeWidth={3} 
                     dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#531FFF' }} 
                     activeDot={{ r: 6, strokeWidth: 0, fill: '#531FFF' }}
                   />
                 </LineChart>
               </ResponsiveContainer>
             </div>
             
             {/* Legend Stats */}
             <div className="w-[150px] flex flex-col justify-center gap-4 shrink-0">
               <div className="bg-white border border-emerald-100/60 rounded-xl p-4 shadow-sm shadow-emerald-50">
                 <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center gap-1.5">
                     <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                       <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                     </div>
                     <span className="text-[12px] font-bold text-gray-600">Hadir</span>
                   </div>
                 </div>
                 <div className="flex items-baseline justify-between mt-1">
                    <span className="text-[18px] font-bold text-gray-900">2.312</span>
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">90,2%</span>
                 </div>
               </div>
               
               <div className="bg-white border border-amber-100/60 rounded-xl p-4 shadow-sm shadow-amber-50">
                 <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center gap-1.5">
                     <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                       <Clock className="w-3.5 h-3.5 text-amber-600" />
                     </div>
                     <span className="text-[12px] font-bold text-gray-600">Terlambat</span>
                   </div>
                 </div>
                 <div className="flex items-baseline justify-between mt-1">
                    <span className="text-[18px] font-bold text-gray-900">86</span>
                    <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">3,4%</span>
                 </div>
               </div>

               <div className="bg-white border border-red-100/60 rounded-xl p-4 shadow-sm shadow-red-50">
                 <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center gap-1.5">
                     <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                       <span className="text-[12px]">🚫</span>
                     </div>
                     <span className="text-[12px] font-bold text-gray-600">Tidak Hadir</span>
                   </div>
                 </div>
                 <div className="flex items-baseline justify-between mt-1">
                    <span className="text-[18px] font-bold text-gray-900">58</span>
                    <span className="text-[11px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">2,4%</span>
                 </div>
               </div>
             </div>
          </div>
        </div>

        {/* Performa Akademik chart */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] h-[400px] flex flex-col">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-[16px] text-gray-900">Performa Akademik</h2>
            <button className="flex items-center gap-2 text-[11px] font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm">
              Semester Genap
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
          
          <div className="flex flex-1 mt-6 gap-6">
            <div className="flex-1 flex flex-col pr-2">
               
               <div>
                 <p className="text-[12px] font-medium text-gray-500 mb-1">Rata-rata Nilai</p>
                 <div className="flex items-baseline gap-1">
                   <span className="text-[32px] font-bold text-gray-900 tracking-tight">3,68</span>
                   <span className="text-[12px] font-medium text-gray-400 font-mono">/ 4,00</span>
                 </div>
                 <div className="inline-flex mt-1 items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-1 rounded text-[11px] font-bold">
                   <ArrowUp className="w-3 h-3" /> 0.12 <span className="font-medium text-gray-500 ml-1">dari semester lalu</span>
                 </div>
               </div>

               <div className="flex-1 flex items-center justify-center mt-4 min-h-[180px]">
                 <div className="w-[180px] h-[180px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={DISTRIBUTION_DATA}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        cornerRadius={8}
                      >
                        {DISTRIBUTION_DATA.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-12 h-12 bg-[#531FFF] rounded-full flex items-center justify-center shadow-lg shadow-[#531FFF]/20">
                       <GraduationCap className="w-6 h-6 text-white" />
                     </div>
                  </div>
                 </div>
               </div>
            </div>

            <div className="w-[45%] flex flex-col justify-between pb-1">
               <div>
                 <p className="text-[13px] font-semibold text-gray-900 mb-4">Kelas Terbaik</p>
                 <div className="space-y-4">
                   <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                     <div className="flex items-center gap-2.5">
                       <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 xl:w-6 xl:h-6 xl:rounded-full text-[11px] font-bold flex items-center justify-center">1</span>
                       <span className="text-[13px] font-bold text-gray-900">X IPA 1</span>
                     </div>
                     <span className="text-[13px] font-bold text-gray-900">3,92</span>
                   </div>
                   <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                     <div className="flex items-center gap-2.5">
                       <span className="w-6 h-6 rounded-full bg-gray-50 text-gray-500 xl:w-6 xl:h-6 xl:rounded-full text-[11px] font-bold flex items-center justify-center">2</span>
                       <span className="text-[13px] font-semibold text-gray-700">XI IPA 2</span>
                     </div>
                     <span className="text-[13px] font-bold text-gray-900">3,78</span>
                   </div>
                   <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                     <div className="flex items-center gap-2.5">
                       <span className="w-6 h-6 rounded-full bg-gray-50 text-gray-500 xl:w-6 xl:h-6 xl:rounded-full text-[11px] font-bold flex items-center justify-center">3</span>
                       <span className="text-[13px] font-semibold text-gray-700">XII IPA 1</span>
                     </div>
                     <span className="text-[13px] font-bold text-gray-900">3,74</span>
                   </div>
                 </div>
               </div>

               <div className="mt-6 bg-red-50/50 rounded-xl p-3.5 flex gap-3 border border-red-100 items-center shrink-0">
                 <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                   <Users className="w-5 h-5 text-red-600" />
                 </div>
                 <div className="flex-1 min-w-0">
                   <div className="flex items-baseline justify-between mb-0.5">
                     <p className="text-[11px] font-medium text-gray-600 truncate mr-2">Siswa Perlu Perhatian</p>
                     <p className="text-[13px] font-bold text-red-600 shrink-0">12 Siswa</p>
                   </div>
                   <p className="text-[10px] text-gray-500 leading-tight">Perlu bimbingan lebih lanjut</p>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Cards Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        
        {/* Jadwal Hari Ini */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] flex flex-col h-[280px]">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-[14px] text-gray-900">Jadwal Hari Ini</h2>
            <button className="text-[11px] font-semibold text-[#531FFF] hover:underline">Lihat Semua</button>
          </div>
          <div className="space-y-4 overflow-y-auto pr-2 scrollbar-thin flex-1">
            <div className="flex items-start gap-3 relative pb-4">
              <div className="absolute left-5 top-8 bottom-0 w-px bg-gray-100"></div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 relative z-10 border-[3px] border-white shadow-sm">
                <FileText className="w-4 h-4" />
              </div>
              <div className="w-full">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[10px] font-bold text-gray-500">08:00 - 09:30</span>
                </div>
                <h3 className="font-bold text-[12px] text-gray-900">Matematika</h3>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-[10px] text-gray-500">Kelas X IPA 1</p>
                  <span className="px-1.5 py-0.5 bg-blue-50 text-[#531FFF] rounded text-[9px] font-bold">Ruang 201</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3 relative pb-4">
              <div className="absolute left-5 top-8 bottom-0 w-px bg-gray-100"></div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0 relative z-10 border-[3px] border-white shadow-sm">
                <Shield className="w-4 h-4" />
              </div>
              <div className="w-full">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[10px] font-bold text-gray-500">10:00 - 11:30</span>
                </div>
                <h3 className="font-bold text-[12px] text-gray-900">Fisika</h3>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-[10px] text-gray-500">Kelas X IPA 2</p>
                  <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[9px] font-bold">Ruang 203</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 relative">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 relative z-10 border-[3px] border-white shadow-sm">
                <Droplet className="w-4 h-4" />
              </div>
              <div className="w-full">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[10px] font-bold text-gray-500">13:00 - 14:30</span>
                </div>
                <h3 className="font-bold text-[12px] text-gray-900">Kimia</h3>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-[10px] text-gray-500">Kelas XI IPA 1</p>
                  <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-bold">Ruang 205</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pengumuman Terbaru */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] flex flex-col h-[280px]">
           <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-[14px] text-gray-900">Pengumuman Terbaru</h2>
            <button className="text-[11px] font-semibold text-[#531FFF] hover:underline">Lihat Semua</button>
          </div>
          <div className="space-y-2 flex-1 overflow-y-auto pr-1 scrollbar-thin">
            <div className="flex gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
              <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center shrink-0 text-red-500">
                <Megaphone className="w-4 h-4 ml-[-2px] mt-[-2px]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between items-start mb-0.5">
                  <h3 className="font-bold text-[11px] text-gray-900 truncate pr-2">Ujian Tengah Semester</h3>
                  <span className="text-[9px] font-medium text-gray-400 shrink-0">20 Mei 2026</span>
                </div>
                <p className="text-[10px] text-gray-500 line-clamp-1">Ujian akan dilaksanakan pada 1 - 7 Juni 2026</p>
              </div>
            </div>

            <div className="flex gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
              <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center shrink-0 text-amber-500">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between items-start mb-0.5">
                  <h3 className="font-bold text-[11px] text-gray-900 truncate pr-2">Libur Kenaikan Isa Al Masih</h3>
                  <span className="text-[9px] font-medium text-gray-400 shrink-0">18 Mei 2026</span>
                </div>
                <p className="text-[10px] text-gray-500 line-clamp-1">Sekolah libur pada 29 Mei 2026</p>
              </div>
            </div>

            <div className="flex gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
              <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-600">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between items-start mb-0.5">
                  <h3 className="font-bold text-[11px] text-gray-900 truncate pr-2">Rapor Semester Genap</h3>
                  <span className="text-[9px] font-medium text-gray-400 shrink-0">16 Mei 2026</span>
                </div>
                <p className="text-[10px] text-gray-500 line-clamp-1">Rapor akan dibagikan pada 20 Juni 2026</p>
              </div>
            </div>
          </div>
        </div>

        {/* Ringkasan Keuangan */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] flex flex-col justify-between h-[280px]">
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-[14px] text-gray-900">Ringkasan Keuangan</h2>
              <button className="flex items-center gap-1 text-[10px] font-semibold text-gray-600 hover:text-gray-900 bg-gray-50 border border-gray-200 px-2 py-1 rounded-md">
                Bulan Ini
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-50/50 border border-emerald-100 flex items-center justify-center text-emerald-500">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-medium">Total Pemasukan</p>
                    <p className="text-[12px] font-bold text-gray-900">Rp 450.000.000</p>
                  </div>
                </div>
                <span className="text-[9px] font-bold text-emerald-600 flex items-center"><ArrowUp className="w-2.5 h-2.5 mr-0.5" /> 12.6%</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-red-50/50 border border-red-100 flex items-center justify-center text-red-500">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-medium">Total Tertunggak</p>
                    <p className="text-[12px] font-bold text-gray-900">Rp 35.000.000</p>
                  </div>
                </div>
                <span className="text-[9px] font-bold text-amber-500 flex items-center"><ArrowUp className="w-2.5 h-2.5 mr-0.5" /> 5.2%</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-rose-50/50 border border-rose-100 flex items-center justify-center text-rose-500">
                    <Clock3 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-medium">Total Terlambat</p>
                    <p className="text-[12px] font-bold text-gray-900">Rp 12.000.000</p>
                  </div>
                </div>
                <span className="text-[9px] font-bold text-rose-500 flex items-center"><ArrowUp className="w-2.5 h-2.5 mr-0.5" /> 3.1%</span>
              </div>
            </div>
          </div>
          
          <button className="text-[11px] font-semibold text-[#531FFF] hover:underline text-right mt-2 flex items-center justify-end gap-1">
            Lihat Laporan Keuangan <span className="text-[9px]">→</span>
          </button>
        </div>

        {/* AI Insight */}
        <div className="bg-[#F8F7FF] p-5 rounded-3xl border border-[#531FFF]/10 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] flex flex-col h-[280px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[14px] text-gray-900 flex items-center gap-1.5">
              AI Insight
              <Sparkles className="w-3.5 h-3.5 text-[#531FFF]" />
            </h2>
            <div className="w-6 h-6 rounded bg-[#531FFF]/10 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-[#531FFF]" />
            </div>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto scrollbar-thin">
            <div className="flex gap-2.5">
              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                 <ArrowUp className="w-3 h-3 text-emerald-600" />
              </div>
              <p className="text-[11px] text-gray-700 leading-snug">
                Tingkat kehadiran meningkat <span className="font-bold text-gray-900">5%</span> dibandingkan minggu lalu.
              </p>
            </div>

            <div className="flex gap-2.5">
              <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                 <AlertTriangle className="w-3 h-3 text-amber-600" />
              </div>
              <p className="text-[11px] text-gray-700 leading-snug">
                <span className="font-bold">12 siswa</span> menunjukkan penurunan performa akademik.
              </p>
            </div>

            <div className="flex gap-2.5">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                 <Star className="w-3 h-3 text-blue-600" />
              </div>
              <p className="text-[11px] text-gray-700 leading-snug">
                Kelas <span className="font-bold">XI IPA 2</span> adalah kelas dengan performa terbaik bulan ini.
              </p>
            </div>
          </div>

          <button className="text-[11px] font-bold text-[#531FFF] hover:underline text-center mt-2 flex items-center justify-center gap-1 pt-2 border-t border-[#531FFF]/10">
            Lihat Semua Insight <span className="text-[9px]">→</span>
          </button>
        </div>

      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        
        {/* Aktivitas Terbaru */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[14px] text-gray-900">Aktivitas Terbaru</h2>
            <button className="text-[11px] font-semibold text-[#531FFF] hover:underline">Lihat Semua</button>
          </div>
          
          <div className="grid grid-cols-4 gap-3">
            
            <div className="flex gap-2.5 items-center">
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden">
                  <Image src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=150&auto=format&fit=crop" width={36} height={36} alt="User" unoptimized />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-[1.5px] border-white rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-2 h-2 text-white" />
                </div>
              </div>
              <div className="min-w-0">
                <h3 className="text-[11px] font-bold text-gray-900 truncate">Aidan Pratama</h3>
                <p className="text-[10px] text-gray-500 truncate">Check in pukul 07:01</p>
                <p className="text-[9px] text-gray-400 mt-0.5">2 menit yang lalu</p>
              </div>
            </div>

            <div className="flex gap-2.5 items-center">
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden">
                  <Image src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop" width={36} height={36} alt="User" unoptimized />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-blue-500 border-[1.5px] border-white rounded-full flex items-center justify-center">
                  <FileText className="w-2 h-2 text-white" />
                </div>
              </div>
              <div className="min-w-0">
                <h3 className="text-[11px] font-bold text-gray-900 truncate">Maya Putri</h3>
                <p className="text-[10px] text-gray-500 truncate">Mengumpulkan tugas</p>
                <p className="text-[9px] text-gray-400 mt-0.5">15 menit yang lalu</p>
              </div>
            </div>

            <div className="flex gap-2.5 items-center">
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden">
                  <Image src="https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=150&auto=format&fit=crop" width={36} height={36} alt="User" unoptimized />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-[1.5px] border-white rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-2 h-2 text-white" />
                </div>
              </div>
              <div className="min-w-0">
                <h3 className="text-[11px] font-bold text-gray-900 truncate">Rizky Akbar</h3>
                <p className="text-[10px] text-gray-500 truncate">Kehadiran disetujui</p>
                <p className="text-[9px] text-gray-400 mt-0.5">1 jam yang lalu</p>
              </div>
            </div>

            <div className="flex gap-2.5 items-center">
               <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden">
                  <Image src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150&auto=format&fit=crop" width={36} height={36} alt="User" unoptimized />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-rose-500 border-[1.5px] border-white rounded-full flex items-center justify-center">
                  <span className="text-white text-[6px] font-bold mt-px">PDF</span>
                </div>
              </div>
              <div className="min-w-0">
                <h3 className="text-[11px] font-bold text-gray-900 truncate">Bu Santi</h3>
                <p className="text-[10px] text-gray-500 truncate">Mengunggah materi</p>
                <p className="text-[9px] text-gray-400 mt-0.5">2 jam yang lalu</p>
              </div>
            </div>

          </div>
        </div>

        {/* Quick Access */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)]">
           <h2 className="font-bold text-[14px] text-gray-900 mb-4">Quick Access</h2>
           
           <div className="grid grid-cols-3 gap-y-4 gap-x-2">
             <div className="flex flex-col items-center gap-1.5 cursor-pointer group">
               <div className="w-10 h-10 rounded-2xl bg-gray-50 group-hover:bg-[#531FFF]/5 flex items-center justify-center transition-colors shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] border border-gray-100/50">
                 <UserCheck className="w-4 h-4 text-[#531FFF]" />
               </div>
               <span className="text-[9px] font-bold text-gray-600 text-center">Tambah Siswa</span>
             </div>

             <div className="flex flex-col items-center gap-1.5 cursor-pointer group">
               <div className="w-10 h-10 rounded-2xl bg-gray-50 group-hover:bg-emerald-50 flex items-center justify-center transition-colors shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] border border-gray-100/50">
                 <CalendarCheck className="w-4 h-4 text-emerald-500" />
               </div>
               <span className="text-[9px] font-bold text-gray-600 text-center">Absensi</span>
             </div>

             <div className="flex flex-col items-center gap-1.5 cursor-pointer group">
               <div className="w-10 h-10 rounded-2xl bg-gray-50 group-hover:bg-amber-50 flex items-center justify-center transition-colors shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] border border-gray-100/50">
                 <FileText className="w-4 h-4 text-amber-500" />
               </div>
               <span className="text-[9px] font-bold text-gray-600 text-center">Penilaian</span>
             </div>

             <div className="flex flex-col items-center gap-1.5 cursor-pointer group">
               <div className="w-10 h-10 rounded-2xl bg-gray-50 group-hover:bg-red-50 flex items-center justify-center transition-colors shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] border border-gray-100/50">
                 <Megaphone className="w-4 h-4 text-red-500" />
               </div>
               <span className="text-[9px] font-bold text-gray-600 text-center">Pengumuman</span>
             </div>

             <div className="flex flex-col items-center gap-1.5 cursor-pointer group">
               <div className="w-10 h-10 rounded-2xl bg-gray-50 group-hover:bg-blue-50 flex items-center justify-center transition-colors shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] border border-gray-100/50">
                 <BarChart2 className="w-4 h-4 text-blue-500" />
               </div>
               <span className="text-[9px] font-bold text-gray-600 text-center">Laporan</span>
             </div>

             <div className="flex flex-col items-center gap-1.5 cursor-pointer group">
               <div className="w-10 h-10 rounded-2xl bg-gray-50 group-hover:bg-gray-100 flex items-center justify-center transition-colors shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] border border-gray-100/50">
                 <Settings className="w-4 h-4 text-gray-500" />
               </div>
               <span className="text-[9px] font-bold text-gray-600 text-center">Pengaturan</span>
             </div>
           </div>
        </div>

      </div>
    </div>
  );
}
