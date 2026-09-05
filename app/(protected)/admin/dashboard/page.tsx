
"use client";

import Link from "next/link";
import { 
  Users, 
  GraduationCap, 
  CalendarCheck, 
  Wallet, 
  ChevronDown,
  ChevronRight,
  Megaphone,
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
  Droplet,
  Award,
  BookOpen,
  MapPin,
  Camera,
  ScanFace,
  XCircle,
  RefreshCw,
  ShieldCheck
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
  Cell,
  BarChart,
  Bar,
  ReferenceLine
} from 'recharts';
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";

const ATTENDANCE_DATA = [
  { date: '15 Mei', value: 40 },
  { date: '16 Mei', value: 65 },
  { date: '17 Mei', value: 80 },
  { date: '18 Mei', value: 60 },
  { date: '19 Mei', value: 75 },
  { date: '20 Mei', value: 97 },
  { date: '21 Mei', value: 85 },
];

import { QuickAttendanceModal } from "@/components/modals/quick-attendance-modal";

const DISTRIBUTION_DATA = [
  { name: 'Average', value: 75, color: '#4ADE80' }, 
  { name: 'Remaining', value: 25, color: '#E2E8F0' }, 
];

function StudentDashboardView({ userName, greeting, academicYear, currentDate, currentDay }: {
  userName: string;
  greeting: string;
  academicYear: string;
  currentDate: string;
  currentDay: string;
}) {
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);

  const STUDENT_GRADES_DATA = [
    { subject: "Matematika", score: 88, kkm: 75, grade: "A" },
    { subject: "B. Indonesia", score: 92, kkm: 75, grade: "A+" },
    { subject: "B. Inggris", score: 95, kkm: 75, grade: "A+" },
    { subject: "Fisika", score: 82, kkm: 75, grade: "B+" },
    { subject: "Kimia", score: 85, kkm: 75, grade: "A" },
    { subject: "Biologi", score: 90, kkm: 75, grade: "A" },
    { subject: "Sejarah", score: 86, kkm: 75, grade: "A" },
  ];

  const STUDENT_ATTENDANCE_DATA = [
    { name: "Hadir", value: 96.8, color: "#531FFF", count: "45 Hari" },
    { name: "Izin", value: 2.2, color: "#F59E0B", count: "1 Hari" },
    { name: "Sakit", value: 1.0, color: "#3B82F6", count: "1 Hari" },
    { name: "Alfa", value: 0.0, color: "#EF4444", count: "0 Hari" },
  ];

  const TODAY_SCHEDULE = [
    { time: "07:00 - 08:30", subject: "Matematika", room: "Ruang X-IPA-1", teacher: "Drs. Bambang H.", status: "Selesai", type: "Wajib" },
    { time: "08:30 - 10:00", subject: "Bahasa Indonesia", room: "Ruang X-IPA-1", teacher: "Ibu Dewi R., M.Pd", status: "Berlangsung", type: "Wajib" },
    { time: "10:15 - 11:45", subject: "Fisika Dasar", room: "Lab Fisika A", teacher: "Bp. Hendra W., S.T", status: "Selanjutnya", type: "Praktikum" },
    { time: "12:30 - 14:00", subject: "Bahasa Inggris", room: "Ruang X-IPA-1", teacher: "Ibu Rina K., M.Hum", status: "Selanjutnya", type: "Wajib" },
  ];

  const RECENT_EVALUATIONS = [
    { subject: "Bahasa Inggris", type: "UTS Genap", score: 95, kkm: 75, date: "02 Mei 2026", status: "Lulus KKM" },
    { subject: "Matematika", type: "Tugas 2 Integral", score: 88, kkm: 75, date: "28 Apr 2026", status: "Lulus KKM" },
    { subject: "Fisika Dasar", type: "Kuis Termodinamika", score: 82, kkm: 75, date: "22 Apr 2026", status: "Lulus KKM" },
    { subject: "Biologi", type: "Praktikum Sel", score: 90, kkm: 75, date: "15 Apr 2026", status: "Lulus KKM" },
  ];

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto w-full space-y-6 animate-in fade-in duration-300">
      
      {/* Quick Attendance Modal */}
      <QuickAttendanceModal 
        isOpen={showAttendanceModal}
        onClose={() => setShowAttendanceModal(false)}
        userName={userName}
      />

      {/* Student Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#531FFF] via-[#6E3BFF] to-[#8F94FB] p-6 md:p-8 text-white shadow-xl flex flex-col lg:flex-row justify-between lg:items-center gap-6 border border-white/10">
        <div className="z-10 relative space-y-4 flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 flex items-center gap-1.5 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Siswa Aktif
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white border border-white/20 backdrop-blur-md">
              Tahun Ajaran {academicYear}
            </span>
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight mb-1 flex items-center gap-2">
              {greeting}, {userName}! <span className="animate-bounce">👋</span>
            </h1>
            <p className="text-white/80 text-sm md:text-base font-medium max-w-2xl">
              Selamat datang di portal akademik Anda. Lakukan presensi harian dengan scan wajah & lokasi GPS di sini.
            </p>
          </div>

          {/* Action Button & Quick Info Chips */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={() => setShowAttendanceModal(true)}
              className="inline-flex items-center gap-2.5 px-5 py-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white rounded-2xl font-extrabold text-sm shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.03] active:scale-[0.98] transition-all cursor-pointer border border-white/20"
            >
              <ScanFace className="w-5 h-5 animate-pulse" />
              <span>Absen Sekarang (Scan Face & GPS)</span>
              <Sparkles className="w-4 h-4 text-amber-200" />
            </button>

            <div className="bg-white/10 hover:bg-white/20 px-3.5 py-2.5 rounded-2xl border border-white/15 backdrop-blur-md text-xs font-bold flex items-center gap-2">
              <span className="text-white/60">NISN:</span> 202300124
            </div>
            <div className="bg-white/10 hover:bg-white/20 px-3.5 py-2.5 rounded-2xl border border-white/15 backdrop-blur-md text-xs font-bold flex items-center gap-2">
              <span className="text-white/60">Kelas:</span> X-IPA-1
            </div>
          </div>
        </div>

        {/* Motivational Card Right */}
        <div className="z-10 relative bg-white/15 backdrop-blur-md border border-white/25 p-5 rounded-2xl shrink-0 lg:w-[320px] flex flex-col justify-between space-y-3 shadow-inner">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-white/80">Indeks Prestasi Siswa</span>
            <div className="w-8 h-8 rounded-xl bg-amber-400/20 flex items-center justify-center text-amber-300">
              <Star className="w-4 h-4 fill-amber-300" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white tracking-tight flex items-baseline gap-2">
              88.5 <span className="text-xs font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-400/30">+3.2%</span>
            </div>
            <p className="text-xs text-white/80 font-medium mt-1">Predikat A · Sangat Memuaskan</p>
          </div>
          <div className="pt-2 border-t border-white/15 flex items-center justify-between text-xs font-bold text-white/90">
            <span>Presensi Harian</span>
            <span className="text-emerald-300">96.8% (Tinggi)</span>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Rata-Rata Nilai</span>
            <div className="w-10 h-10 rounded-2xl bg-[#531FFF]/10 text-[#531FFF] flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-gray-900 tracking-tight mb-1">88.5 <span className="text-xs text-gray-400 font-normal">/ 100</span></div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 flex items-center gap-0.5">
              <ArrowUp className="w-3 h-3" /> +3.2%
            </span>
            <span className="text-gray-400">vs semester lalu</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div 
          onClick={() => setShowAttendanceModal(true)}
          className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all group cursor-pointer hover:border-emerald-200"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Kehadiran Presensi</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <ScanFace className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mb-1">
            <div className="text-2xl font-extrabold text-gray-900 tracking-tight">96.8%</div>
            <span className="text-[11px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              + Scan Absen
            </span>
          </div>
          <div className="text-xs text-gray-500 font-medium">45 Hadir · 1 Izin · 0 Alfa</div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Jadwal Pelajaran</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-gray-900 tracking-tight mb-1">4 Matpel</div>
          <div className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md inline-block">
            Next: Matematika @ 08:30 WIB
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status SPP</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 tracking-tight mb-1">LUNAS</div>
          <div className="text-xs text-gray-500 font-medium">SPP Bulan Mei 2026 (Terbayar)</div>
        </div>

      </div>

      {/* Visual Data & Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart 1: Bar Chart Nilai per Mata Pelajaran (Spans 2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-[#531FFF]" />
                Perkembangan Nilai per Mata Pelajaran
              </h2>
              <p className="text-xs text-gray-500 font-medium mt-0.5">Grafik pencapaian nilai vs Batas KKM (75)</p>
            </div>
            <span className="text-xs font-bold text-[#531FFF] bg-[#531FFF]/10 px-3 py-1 rounded-full border border-[#531FFF]/20">
              Semester Genap
            </span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={STUDENT_GRADES_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="subject" tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1E293B', borderRadius: '12px', color: '#fff', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  formatter={(val: any) => [`${val} / 100`, 'Nilai Siswa']}
                />
                <ReferenceLine y={75} stroke="#EF4444" strokeDasharray="4 4" label={{ value: 'Batas KKM (75)', fill: '#EF4444', fontSize: 10, fontWeight: 700 }} />
                <Bar dataKey="score" radius={[8, 8, 0, 0]} fill="#531FFF">
                  {STUDENT_GRADES_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.score >= 90 ? '#531FFF' : '#7B42FF'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-gray-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-[#531FFF]" /> Nilai di Atas 90
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-[#7B42FF]" /> Nilai KKM 75 - 89
              </span>
            </div>
            <span className="text-emerald-600 font-bold">100% Lulus KKM</span>
          </div>
        </div>

        {/* Chart 2: Pie Chart Presensi Kehadiran */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-emerald-500" />
                Ringkasan Kehadiran
              </h2>
              <p className="text-xs text-gray-500 font-medium mt-0.5">Persentase kehadiran semester ini</p>
            </div>
          </div>

          <div className="h-[200px] w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={STUDENT_ATTENDANCE_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {STUDENT_ATTENDANCE_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(val: any) => [`${val}%`, 'Persentase']} />
              </PieChart>
            </ResponsiveContainer>

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-extrabold text-gray-900">96.8%</span>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Tinggi</span>
            </div>
          </div>

          {/* Breakdown Legend */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            {STUDENT_ATTENDANCE_DATA.map(item => (
              <div key={item.name} className="flex items-center justify-between text-xs font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-gray-700 font-bold">{item.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400">{item.count}</span>
                  <span className="font-extrabold text-gray-900">{item.value}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Tables & Widgets Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Table 1: Jadwal Pelajaran Hari Ini (Spans 2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div>
              <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#531FFF]" />
                Jadwal Pelajaran Hari Ini ({currentDay}, {currentDate})
              </h2>
              <p className="text-xs text-gray-500 font-medium mt-0.5">Daftar kelas & mata pelajaran yang harus diikuti hari ini</p>
            </div>
            <Link href="/admin/schedule" className="text-xs font-bold text-[#531FFF] hover:underline flex items-center gap-1">
              Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-400 uppercase tracking-wider font-extrabold border-b border-gray-100">
                  <th className="py-3.5 px-6">Waktu</th>
                  <th className="py-3.5 px-6">Mata Pelajaran</th>
                  <th className="py-3.5 px-6">Ruangan</th>
                  <th className="py-3.5 px-6">Guru Pengajar</th>
                  <th className="py-3.5 px-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {TODAY_SCHEDULE.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-4 px-6 font-bold text-gray-900">{item.time}</td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-gray-900 text-sm">{item.subject}</div>
                      <span className="text-[10px] text-gray-400 font-semibold">{item.type}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-[#531FFF] rounded-lg font-bold">
                        <MapPin className="w-3 h-3" /> {item.room}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-600 font-semibold">{item.teacher}</td>
                    <td className="py-4 px-6 text-right">
                      {item.status === "Berlangsung" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Sedang Berlangsung
                        </span>
                      ) : item.status === "Selesai" ? (
                        <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full font-bold">
                          Selesai
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full font-bold">
                          Selanjutnya
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: Nilai & Evaluasi Terbaru */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  Nilai Terbaru
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-0.5">Hasil ujian & tugas terakhir</p>
              </div>
              <Link href="/admin/grades" className="text-xs font-bold text-[#531FFF] hover:underline flex items-center gap-1">
                Lihat Nilai <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-4 space-y-3">
              {RECENT_EVALUATIONS.map((evalItem, i) => (
                <div key={i} className="p-3.5 bg-gray-50/80 hover:bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-between transition-all">
                  <div>
                    <h3 className="text-xs font-bold text-gray-900">{evalItem.subject}</h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">{evalItem.type} · {evalItem.date}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-extrabold text-[#531FFF]">{evalItem.score}</div>
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                      KKM {evalItem.kkm}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shortcut Quick Action Cards */}
          <div className="p-4 border-t border-gray-100 bg-gray-50/30 grid grid-cols-2 gap-2 text-center text-xs font-bold">
            <Link href="/admin/schedule" className="p-3 bg-white hover:bg-purple-50 border border-gray-100 hover:border-purple-200 rounded-xl text-[#531FFF] transition-all flex items-center justify-center gap-2">
              <Calendar className="w-4 h-4" /> Jadwal Pelajaran
            </Link>
            <Link href="/admin/report-cards" className="p-3 bg-white hover:bg-purple-50 border border-gray-100 hover:border-purple-200 rounded-xl text-[#531FFF] transition-all flex items-center justify-center gap-2">
              <FileText className="w-4 h-4" /> Rapor Digital
            </Link>
          </div>

        </div>

      </div>

    </div>
  );
}

export default function DashboardPage() {
  const [userName, setUserName] = useState("Adiratna");
  const [userRole, setUserRole] = useState<string>("admin");
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
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.name) setUserName(data.name);
            else setUserName(user.displayName || user.email?.split('@')[0] || "User");

            const rawRole = data.role || "admin";
            const role = (rawRole === "student" || rawRole === "siswa") ? "siswa" : rawRole;
            setUserRole(role);
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

  if (userRole === "siswa") {
    return (
      <StudentDashboardView 
        userName={userName}
        greeting={greeting}
        academicYear={academicYear}
        currentDate={currentDate}
        currentDay={currentDay}
      />
    );
  }

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
          {userRole !== "siswa" && (
            <button className="w-full flex items-center justify-center gap-2 bg-white text-[#4E54C8] hover:bg-gray-50 px-5 py-3 rounded-xl text-sm font-bold transition-colors shadow-sm">
              <BarChart2 className="w-4 h-4" />
              Generate Report
            </button>
          )}
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
