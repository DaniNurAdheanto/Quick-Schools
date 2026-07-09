"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Plus,
  Building,
  School,
  BookOpen,
  Users,
  AlertTriangle,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Grid,
  List,
  MoreVertical,
  CheckCircle2,
  Circle,
  Calculator,
  Microscope,
  BookA,
  Globe2,
  Heart,
  Dumbbell,
  PenTool,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CrudSheet } from "@/components/layouts/crud-sheet";

// Dummy Data
const SCHEDULE_BLOCKS = [
  { time: "07:00 - 07:45", days: [
      { day: "Senin", subject: "Matematika", teacher: "Pak Budi", room: "A101", color: "border-purple-500", bg: "bg-purple-50", text: "text-purple-700", icon: Calculator },
      { day: "Selasa", subject: "Fisika", teacher: "Bu Sari", room: "A102", color: "border-green-500", bg: "bg-green-50", text: "text-green-700", icon: Microscope },
      { day: "Rabu", subject: "Kimia", teacher: "Pak Rian", room: "Lab Kimia", color: "border-orange-500", bg: "bg-orange-50", text: "text-orange-700", icon: Microscope },
      { day: "Kamis", subject: "Matematika", teacher: "Pak Budi", room: "A101", color: "border-purple-500", bg: "bg-purple-50", text: "text-purple-700", icon: Calculator },
      { day: "Jumat", subject: "Bahasa Inggris", teacher: "Bu Maya", room: "A103", color: "border-red-500", bg: "bg-red-50", text: "text-red-700", icon: BookA },
      { day: "Sabtu", subject: "Pendidikan Agama", teacher: "Pak Hadi", room: "A104", color: "border-blue-500", bg: "bg-blue-50", text: "text-blue-700", icon: Heart },
    ]
  },
  { time: "08:00 - 08:45", days: [
      { day: "Senin", subject: "Matematika", teacher: "Pak Budi", room: "A101", color: "border-purple-500", bg: "bg-purple-50", text: "text-purple-700", icon: Calculator },
      { day: "Selasa", subject: "Fisika", teacher: "Bu Sari", room: "A102", color: "border-green-500", bg: "bg-green-50", text: "text-green-700", icon: Microscope },
      { day: "Rabu", subject: "Kimia", teacher: "Pak Rian", room: "Lab Kimia", color: "border-orange-500", bg: "bg-orange-50", text: "text-orange-700", icon: Microscope },
      { day: "Kamis", subject: "Matematika", teacher: "Pak Budi", room: "A101", color: "border-purple-500", bg: "bg-purple-50", text: "text-purple-700", icon: Calculator },
      { day: "Jumat", subject: "Bahasa Inggris", teacher: "Bu Maya", room: "A103", color: "border-red-500", bg: "bg-red-50", text: "text-red-700", icon: BookA },
      { day: "Sabtu", subject: "Pendidikan Agama", teacher: "Pak Hadi", room: "A104", color: "border-blue-500", bg: "bg-blue-50", text: "text-blue-700", icon: Heart },
    ]
  },
  { time: "09:00 - 09:45", days: [
      { day: "Senin", subject: "Bahasa Inggris", teacher: "Bu Maya", room: "A103", color: "border-red-500", bg: "bg-red-50", text: "text-red-700", icon: BookA },
      { day: "Selasa", subject: "Biologi", teacher: "Bu Rina", room: "Lab Bio", color: "border-green-500", bg: "bg-green-50", text: "text-green-700", icon: Microscope },
      { day: "Rabu", subject: "Sejarah", teacher: "Pak Dedi", room: "A105", color: "border-blue-500", bg: "bg-blue-50", text: "text-blue-700", icon: Globe2 },
      { day: "Kamis", subject: "Bahasa Indonesia", teacher: "Bu Lestari", room: "A106", color: "border-orange-500", bg: "bg-orange-50", text: "text-orange-700", icon: BookA },
      { day: "Jumat", subject: "Matematika", teacher: "Pak Budi", room: "A101", color: "border-purple-500", bg: "bg-purple-50", text: "text-purple-700", icon: Calculator },
      { day: "Sabtu", subject: "PJOK", teacher: "Pak Andi", room: "Lapangan", color: "border-teal-500", bg: "bg-teal-50", text: "text-teal-700", icon: Dumbbell },
    ]
  },
  { time: "10:00 - 10:45", days: [
      { day: "Senin", subject: "Bahasa Indonesia", teacher: "Bu Lestari", room: "A106", color: "border-orange-500", bg: "bg-orange-50", text: "text-orange-700", icon: BookA },
      { day: "Selasa", subject: "Biologi", teacher: "Bu Rina", room: "Lab Bio", color: "border-green-500", bg: "bg-green-50", text: "text-green-700", icon: Microscope },
      { day: "Rabu", subject: "Sejarah", teacher: "Pak Dedi", room: "A105", color: "border-blue-500", bg: "bg-blue-50", text: "text-blue-700", icon: Globe2 },
      { day: "Kamis", subject: "Fisika", teacher: "Bu Sari", room: "A102", color: "border-green-500", bg: "bg-green-50", text: "text-green-700", icon: Microscope },
      { day: "Jumat", subject: "Kimia", teacher: "Pak Rian", room: "Lab Kimia", color: "border-orange-500", bg: "bg-orange-50", text: "text-orange-700", icon: Microscope },
      { day: "Sabtu", subject: "Seni Budaya", teacher: "Bu Tika", room: "A107", color: "border-purple-500", bg: "bg-purple-50", text: "text-purple-700", icon: BookA },
    ]
  },
  { time: "11:00 - 11:45", days: [
      { day: "Senin", subject: "TIK", teacher: "Pak Arif", room: "Lab Komputer", color: "border-gray-500", bg: "bg-gray-50", text: "text-gray-700", icon: Microscope },
      { day: "Selasa", subject: "Ekonomi", teacher: "Bu Dina", room: "A108", color: "border-orange-500", bg: "bg-orange-50", text: "text-orange-700", icon: BookA },
      { day: "Rabu", subject: "Matematika", teacher: "Pak Budi", room: "A101", color: "border-purple-500", bg: "bg-purple-50", text: "text-purple-700", icon: Calculator },
      { day: "Kamis", subject: "Bahasa Inggris", teacher: "Bu Maya", room: "A103", color: "border-red-500", bg: "bg-red-50", text: "text-red-700", icon: BookA },
      { day: "Jumat", subject: "Sejarah", teacher: "Pak Dedi", room: "A105", color: "border-blue-500", bg: "bg-blue-50", text: "text-blue-700", icon: Globe2 },
      { day: "Sabtu", subject: "Prakarya", teacher: "Pak Dedi", room: "A109", color: "border-purple-500", bg: "bg-purple-50", text: "text-purple-700", icon: Plus },
    ]
  },
  { time: "12:00 - 12:45", isBreak: true, label: "Istirahat" },
  { time: "13:00 - 13:45", days: [
      { day: "Senin", subject: "Fisika", teacher: "Bu Sari", room: "A102", color: "border-green-500", bg: "bg-green-50", text: "text-green-700", icon: Microscope },
      { day: "Selasa", subject: "Kimia", teacher: "Pak Rian", room: "Lab Kimia", color: "border-orange-500", bg: "bg-orange-50", text: "text-orange-700", icon: Microscope },
      { day: "Rabu", subject: "Pendidikan Agama", teacher: "Pak Hadi", room: "A104", color: "border-blue-500", bg: "bg-blue-50", text: "text-blue-700", icon: Heart },
      { day: "Kamis", subject: "Biologi", teacher: "Bu Rina", room: "Lab Bio", color: "border-green-500", bg: "bg-green-50", text: "text-green-700", icon: Microscope },
      { day: "Jumat", subject: "Matematika", teacher: "Pak Budi", room: "A101", color: "border-purple-500", bg: "bg-purple-50", text: "text-purple-700", icon: Calculator },
      { day: "Sabtu", subject: "Ekstrakurikuler", teacher: "Pramuka", room: "Lapangan", color: "border-orange-500", bg: "bg-orange-50", text: "text-orange-700", icon: Plus },
    ]
  },
  { time: "14:00 - 14:45", days: [
      { day: "Senin", subject: "Kimia", teacher: "Pak Rian", room: "Lab Kimia", color: "border-orange-500", bg: "bg-orange-50", text: "text-orange-700", icon: Microscope },
      { day: "Selasa", subject: "Bahasa Indonesia", teacher: "Bu Lestari", room: "A106", color: "border-red-500", bg: "bg-red-50", text: "text-red-700", icon: BookA },
      { day: "Rabu", subject: "PJOK", teacher: "Pak Andi", room: "Lapangan", color: "border-teal-500", bg: "bg-teal-50", text: "text-teal-700", icon: Dumbbell },
      { day: "Kamis", subject: "TIK", teacher: "Pak Arif", room: "Lab Komputer", color: "border-gray-500", bg: "bg-gray-50", text: "text-gray-700", icon: Microscope },
      { day: "Jumat", subject: "Seni Budaya", teacher: "Bu Tika", room: "A107", color: "border-purple-500", bg: "bg-purple-50", text: "text-purple-700", icon: BookA },
      { day: "Sabtu", subject: "Ekstrakurikuler", teacher: "Pramuka", room: "Lapangan", color: "border-orange-500", bg: "bg-orange-50", text: "text-orange-700", icon: Plus },
    ]
  },
];

const CLASSES = [
  { id: "X_IPA_1", name: "X IPA 1", teacher: "Pak Budi" },
  { id: "X_IPA_2", name: "X IPA 2", teacher: "Bu Sari" },
  { id: "X_IPS_1", name: "X IPS 1", teacher: "Pak Rian" },
  { id: "X_IPS_2", name: "X IPS 2", teacher: "Bu Maya" },
  { id: "XI_IPA_1", name: "XI IPA 1", teacher: "Pak Dedi" },
  { id: "XI_IPA_2", name: "XI IPA 2", teacher: "Bu Tika" },
  { id: "XI_IPS_1", name: "XI IPS 1", teacher: "Pak Arif" },
  { id: "XI_IPS_2", name: "XI IPS 2", teacher: "Bu Lestari" },
  { id: "XII_IPA_1", name: "XII IPA 1", teacher: "Pak Hadi" },
  { id: "XII_IPA_2", name: "XII IPA 2", teacher: "Bu Rina" },
];

export default function SchedulePage() {
  const [selectedClass, setSelectedClass] = useState("X_IPA_1");
  const [classFilter, setClassFilter] = useState("");
  const [selectedMajor, setSelectedMajor] = useState("Semua Jurusan");
  const [isMajorDropdownOpen, setIsMajorDropdownOpen] = useState(false);
  const [crudState, setCrudState] = useState<{ open: boolean; mode: "create" | "edit" | "delete"; data?: any }>({
    open: false,
    mode: "create"
  });

  const scheduleFields = [
    { name: "day", label: "Hari" },
    { name: "time", label: "Jam Pelajaran" },
    { name: "subject", label: "Mata Pelajaran" },
    { name: "teacher", label: "Guru Pengajar" },
    { name: "room", label: "Ruangan" }
  ];

  const filteredClasses = CLASSES.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(classFilter.toLowerCase()) || c.teacher.toLowerCase().includes(classFilter.toLowerCase());
    const matchesMajor = selectedMajor === "Semua Jurusan" || c.name.includes(selectedMajor);
    return matchesSearch && matchesMajor;
  });

  return (
    <div className="p-8 pb-12 max-w-[1600px] mx-auto w-full h-full flex flex-col space-y-6">
      <CrudSheet 
        open={crudState.open} 
        onOpenChange={(open) => setCrudState(s => ({ ...s, open }))}
        mode={crudState.mode}
        entityName="Jadwal"
        fields={scheduleFields}
        initialData={crudState.data}
      />
      
      {/* Header View */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-gray-900 tracking-tight">Jadwal Pelajaran</h1>
          <p className="text-[13px] text-gray-500 mt-1">Kelola dan atur jadwal pembelajaran untuk seluruh kelas.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none items-center justify-center gap-2 px-4 py-2.5 bg-white border border-[#E5E7EB] text-[#531FFF] rounded-xl font-semibold text-[13px] hover:bg-gray-50 transition-colors shadow-sm flex">
            <Sparkles className="w-4 h-4" />
            <span className="whitespace-nowrap">Generate Jadwal Otomatis</span>
          </button>
          <button 
            onClick={() => setCrudState({ open: true, mode: "create" })}
            className="flex-1 md:flex-none items-center justify-center gap-2 px-4 py-2.5 bg-[#531FFF] text-white rounded-xl font-semibold text-[13px] hover:bg-[#4314E5] transition-colors shadow-sm flex"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Jadwal</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Kelas", value: "48", trend: "Kelas Aktif ↑ 4", icon: Building, color: "bg-blue-50 text-blue-600", trendColor: "text-emerald-600", chart: "blue-500" },
          { label: "Mata Pelajaran", value: "26", trend: "Mapel Aktif ↑ 2", icon: BookOpen, color: "bg-green-50 text-emerald-600", trendColor: "text-emerald-600", chart: "emerald-500" },
          { label: "Guru Mengajar", value: "86", trend: "Guru Aktif ↑ 6", icon: Users, color: "bg-blue-50 text-blue-600", trendColor: "text-emerald-600", chart: "blue-500" },
          { label: "Konflik Jadwal", value: "2", trend: "Perlu Ditinjau", icon: AlertTriangle, color: "bg-red-50 text-red-600", trendColor: "text-red-500", chart: "red-500" },
        ].map((metric, i) => (
          <div key={i} className="bg-white rounded-3xl border border-gray-100 p-6 flex flex-col justify-between h-[150px] shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] relative overflow-hidden group">
            <div className="flex items-start justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0", metric.color)}>
                  <metric.icon className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-gray-500 mb-0.5">{metric.label}</p>
                  <h3 className="text-[32px] font-bold text-gray-900 leading-none tracking-tight">{metric.value}</h3>
                  <p className={cn("text-[12px] font-semibold mt-2", metric.trendColor)}>{metric.trend}</p>
                </div>
              </div>
            </div>
            
            {/* Simple decorative chart line */}
            <div className="absolute bottom-2 left-4 right-4 h-[20px] pointer-events-none opacity-40">
               <svg viewBox="0 0 100 20" className="w-full h-full preserve-3d" preserveAspectRatio="none">
                 <path 
                   d={i % 2 === 0 ? "M0,15 Q10,5 20,10 T40,15 T60,5 T80,10 T100,0" : "M0,5 Q10,15 20,10 T40,5 T60,15 T80,10 T100,20"} 
                   fill="none" 
                   stroke={metric.chart === 'blue-500' ? '#3B82F6' : metric.chart === 'emerald-500' ? '#10B981' : '#EF4444'} 
                   strokeWidth="1.5" 
                   strokeLinecap="round" 
                   className="vector-non-scaling-stroke" 
                 />
                 {/* Decorative nodes */}
                 <circle cx="20" cy="10" r="1.5" fill={metric.chart === 'blue-500' ? '#3B82F6' : metric.chart === 'emerald-500' ? '#10B981' : '#EF4444'} />
                 <circle cx="40" cy={i % 2 === 0 ? "15" : "5"} r="1.5" fill={metric.chart === 'blue-500' ? '#3B82F6' : metric.chart === 'emerald-500' ? '#10B981' : '#EF4444'} />
                 <circle cx="60" cy={i % 2 === 0 ? "5" : "15"} r="1.5" fill={metric.chart === 'blue-500' ? '#3B82F6' : metric.chart === 'emerald-500' ? '#10B981' : '#EF4444'} />
               </svg>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1">
        
        {/* Left Sidebar - Classes List */}
        <div className="w-full lg:w-[260px] bg-white rounded-3xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] p-5 flex flex-col h-[700px] shrink-0">
          <div className="flex items-center justify-between mb-4">
             <h2 className="text-[14px] font-bold text-gray-900">Pilih Kelas</h2>
          </div>
          
          <div className="relative mb-4">
            <button 
              onClick={() => setIsMajorDropdownOpen(!isMajorDropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-2 border border-gray-200 rounded-xl text-[13px] font-medium text-gray-900 bg-white hover:bg-gray-50 focus:outline-none"
            >
              <span>{selectedMajor}</span>
              <ChevronDown className={cn("w-4 h-4 text-gray-500 transition-transform", isMajorDropdownOpen && "rotate-180")} />
            </button>
            {isMajorDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                {["Semua Jurusan", "IPA", "IPS"].map(major => (
                  <button
                    key={major}
                    onClick={() => {
                      setSelectedMajor(major);
                      setIsMajorDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-[13px] font-medium hover:bg-gray-50 transition-colors",
                      selectedMajor === major ? "text-[#531FFF] bg-[#531FFF]/5" : "text-gray-700"
                    )}
                  >
                    {major}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
               <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input 
              type="text" 
              placeholder="Cari kelas..." 
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full block pl-9 pr-3 py-2 text-[13px] border border-gray-200 rounded-xl focus:ring-[#531FFF] focus:border-[#531FFF] placeholder-gray-400 bg-gray-50/50" 
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-1 scrollbar-thin scrollbar-thumb-gray-200">
            {filteredClasses.map((c) => {
              const isSelected = selectedClass === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedClass(c.id)}
                  className={cn(
                    "w-full text-left flex flex-col px-3 py-2.5 rounded-xl border transition-all",
                    isSelected 
                      ? "bg-[#531FFF]/5 border-[#531FFF]" 
                      : "border-transparent hover:bg-gray-50 hover:border-gray-200"
                  )}
                >
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       <School className={cn("w-3.5 h-3.5", isSelected ? "text-[#531FFF]" : "text-gray-400")} />
                       <span className={cn("text-[13px] font-bold", isSelected ? "text-[#531FFF]" : "text-gray-700")}>{c.name}</span>
                     </div>
                     {isSelected ? <CheckCircle2 className="w-4 h-4 text-[#531FFF]" /> : null}
                   </div>
                   <span className="text-[11px] text-gray-500 font-medium ml-5.5 mt-0.5 block">Wali Kelas: {c.teacher}</span>
                </button>
              )
            })}
          </div>

          <div className="pt-4 mt-auto">
             <button className="w-full py-2 bg-gray-50 text-[#531FFF] font-semibold text-[13px] rounded-xl hover:bg-gray-100 transition-colors">
               Lihat Semua Kelas
             </button>
          </div>
        </div>

        {/* Main Schedule Content */}
        <div className="flex-1 bg-white rounded-3xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] p-6 flex flex-col">
          
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[16px] font-bold text-gray-900">Jadwal Mingguan - X IPA 1</h2>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center">
                <button className="p-1.5 border border-gray-200 rounded-l-lg hover:bg-gray-50 text-gray-600">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 px-4 py-1.5 border-y border-gray-200 bg-white">
                  <span className="text-[13px] font-bold text-gray-700">19 - 25 Mei 2026</span>
                  <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                </div>
                <button className="p-1.5 border border-gray-200 rounded-r-lg hover:bg-gray-50 text-gray-600">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                 <button className="px-3 py-1 bg-[#531FFF] text-white rounded-md text-[13px] font-semibold flex items-center gap-1.5 shadow-sm">
                   <Grid className="w-3.5 h-3.5" />
                   Grid
                 </button>
                 <button className="px-3 py-1 text-gray-500 rounded-md text-[13px] font-semibold hover:text-gray-900 flex items-center gap-1.5">
                   <List className="w-3.5 h-3.5" />
                   List
                 </button>
              </div>
            </div>
          </div>

          {/* Schedule Table Component */}
          <div className="flex-1 overflow-x-auto">
             <div className="min-w-[900px]">
               {/* Header */}
               <div className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr_1fr] gap-3 mb-3 border-b border-gray-100 pb-3">
                 <div className="text-[12px] font-semibold text-gray-500 text-center">Jam</div>
                 {["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"].map(day => (
                   <div key={day} className="text-[12px] font-semibold text-gray-900 text-center">{day}</div>
                 ))}
               </div>

               {/* Body */}
               <div className="space-y-4 pb-4">
                 {SCHEDULE_BLOCKS.map((row, i) => (
                   <div key={i} className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr_1fr] gap-3 items-stretch">
                     
                     {/* Time Column */}
                     <div className="flex flex-col items-center justify-center pt-2">
                       <span className="text-[12px] font-bold text-gray-900">{row.time.split(' - ')[0]}</span>
                       <span className="text-[10px] text-gray-500">{row.time.split(' - ')[1]}</span>
                     </div>

                     {/* Classes Columns */}
                     {row.isBreak ? (
                       <div className="col-span-6 bg-gray-50/80 border border-gray-100 border-dashed rounded-xl flex items-center justify-center h-8 my-2">
                         <span className="text-[12px] font-semibold text-gray-500 uppercase tracking-widest">{row.label}</span>
                       </div>
                     ) : (
                       row.days?.map((cell, j) => (
                         <div key={j} className={cn(
                           "relative p-3 rounded-xl border-l-[3px] border-y border-r flex flex-col gap-1.5 hover:shadow-md transition-shadow group cursor-pointer",
                           cell.color,
                           cell.bg,
                           "border-y-gray-100 border-r-gray-100"
                         )}>
                           <div className="flex items-start justify-between">
                             <div className="flex items-center gap-1.5">
                               <cell.icon className={cn("w-3 h-3", cell.text)} />
                               <span className="text-[12px] font-bold text-gray-900 line-clamp-1 pr-10">{cell.subject}</span>
                             </div>
                             <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 gap-1 bg-white/80 p-0.5 rounded-md backdrop-blur-sm border border-gray-100">
                               <button 
                                 onClick={(e) => { e.stopPropagation(); setCrudState({ open: true, mode: "edit", data: { ...cell, time: row.time } }); }}
                                 className="p-1 hover:text-[#531FFF] transition-colors rounded">
                                 <PenTool className="w-3 h-3" />
                               </button>
                               <button 
                                 onClick={(e) => { e.stopPropagation(); setCrudState({ open: true, mode: "delete", data: { ...cell, time: row.time } }); }}
                                 className="p-1 hover:text-red-500 transition-colors rounded">
                                 <Trash2 className="w-3 h-3" />
                               </button>
                             </div>
                           </div>
                           <div className="flex flex-col gap-0.5 pl-4.5">
                             <span className="text-[11px] font-medium text-gray-600">{cell.teacher}</span>
                           </div>
                         </div>
                       ))
                     )}
                   </div>
                 ))}
               </div>
             </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-6 overflow-x-auto whitespace-nowrap">
            <span className="text-[12px] font-bold text-gray-900">Legenda:</span>
            {[
              { label: "Matematika", color: "text-purple-500" },
              { label: "Sains", color: "text-green-500" },
              { label: "Bahasa", color: "text-orange-500" },
              { label: "Sosial", color: "text-red-500" },
              { label: "Agama", color: "text-blue-500" },
              { label: "Olahraga", color: "text-teal-500" },
              { label: "Lainnya", color: "text-gray-400" },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <Circle className={cn("w-2 h-2 fill-current", item.color)} />
                <span className="text-[11px] font-semibold text-gray-600">{item.label}</span>
              </div>
            ))}
          </div>

        </div>
      </div>
      
      {/* Bottom Row Dashboard Let's build the two blocks under schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-fit">
         
         {/* Teacher Workload */}
         <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] p-6">
           <div className="flex items-center justify-between mb-6">
             <h2 className="text-[16px] font-bold text-gray-900">Teacher Workload (Jam Mengajar)</h2>
             <button className="text-[#531FFF] text-[12px] font-bold hover:underline">Lihat Semua</button>
           </div>
           
           <div className="space-y-4">
             {[
               { name: "Pak Budi", subject: "Matematika", cur: 32, max: 40, color: "bg-purple-600" },
               { name: "Bu Sari", subject: "Fisika", cur: 28, max: 40, color: "bg-green-500" },
               { name: "Pak Rian", subject: "Kimia", cur: 24, max: 40, color: "bg-orange-500" },
               { name: "Bu Maya", subject: "Bahasa Inggris", cur: 20, max: 40, color: "bg-red-500" },
               { name: "Bu Lestari", subject: "Bahasa Indonesia", cur: 18, max: 40, color: "bg-blue-500" },
             ].map((t, i) => (
               <div key={i} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden shrink-0">
                    <img src={`https://ui-avatars.com/api/?name=${t.name}&background=EDEBFE&color=531FFF&bold=true`} alt={t.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="w-[120px] shrink-0">
                    <p className="text-[13px] font-bold text-gray-900 truncate">{t.name}</p>
                    <p className="text-[11px] text-gray-500">{t.subject}</p>
                  </div>
                  <div className="flex-1">
                    <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                       <div className={cn("h-full rounded-full transition-all", t.color)} style={{ width: `${(t.cur/t.max)*100}%` }} />
                    </div>
                  </div>
                  <div className="w-[60px] text-right shrink-0 text-[12px] font-bold text-gray-500">
                    {t.cur} / {t.max} Jam
                  </div>
               </div>
             ))}
           </div>
         </div>

         {/* Conflict Detection */}
         <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] p-6 flex flex-col justify-between">
           <div className="flex items-center justify-between mb-4">
             <h2 className="text-[16px] font-bold text-gray-900">Conflict Detection</h2>
             <button className="text-[#531FFF] text-[12px] font-bold hover:underline">Lihat Semua</button>
           </div>
           
           <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-start gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <h3 className="text-[13px] font-bold text-orange-900">2 Konflik Jadwal Terdeteksi</h3>
                <p className="text-[12px] text-orange-700 mt-0.5 font-medium leading-relaxed">Perlu penyesuaian untuk menghindari bentrok jadwal guru atau ruangan.</p>
              </div>
           </div>

           <div className="space-y-3">
              {[
                { title: "Pak Budi", role1: "Matematika X IPA 1", time1: "Senin, 08:00 - 09:00", title2: "Pak Budi", role2: "Matematika XI IPA 2", time2: "Senin, 08:00 - 09:00", conflictType: "Bentrok Guru" },
                { title: "Lab Kimia", role1: "Kimia X IPA 1", time1: "Rabu, 07:00 - 09:00", title2: "Lab Kimia", role2: "Kimia XII IPA 3", time2: "Rabu, 08:00 - 10:00", conflictType: "Bentrok Ruangan" },
              ].map((c, i) => (
                <div key={i} className="flex items-center justify-between border border-gray-100 rounded-2xl p-4 py-3 bg-white hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-4 lg:gap-8 flex-1">
                     
                     <div className="flex items-start gap-3 flex-1">
                        <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden shrink-0 mt-0.5">
                           {c.conflictType === "Bentrok Guru" ? (
                             <img src={`https://ui-avatars.com/api/?name=${c.title}&background=EDEBFE&color=531FFF&bold=true`} alt={c.title} className="w-full h-full object-cover" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center text-gray-500 bg-gray-100"><School className="w-4 h-4" /></div>
                           )}
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-gray-900">{c.title}</p>
                          <p className="text-[11px] text-gray-500 font-medium">{c.role1}</p>
                          <p className="text-[11px] text-gray-400 font-medium">{c.time1}</p>
                        </div>
                     </div>

                     <div className="text-[11px] font-bold text-red-500 shrink-0 bg-red-50 px-2 py-1 rounded-md">VS</div>

                     <div className="flex items-start gap-3 flex-1">
                        <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden shrink-0 mt-0.5">
                           {c.conflictType === "Bentrok Guru" ? (
                             <img src={`https://ui-avatars.com/api/?name=${c.title2}&background=EDEBFE&color=531FFF&bold=true`} alt={c.title2} className="w-full h-full object-cover" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center text-gray-500 bg-gray-100"><School className="w-4 h-4" /></div>
                           )}
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-gray-900">{c.title2}</p>
                          <p className="text-[11px] text-gray-500 font-medium">{c.role2}</p>
                          <p className="text-[11px] text-gray-400 font-medium">{c.time2}</p>
                        </div>
                     </div>

                  </div>

                  <div className="flex items-center gap-3 shrink-0 justify-end ml-4">
                    <span className="text-[11px] font-bold text-red-500 whitespace-nowrap">{c.conflictType}</span>
                    <button className="px-3 py-1.5 border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 text-[12px] font-bold rounded-lg shadow-sm">
                      Detail
                    </button>
                  </div>
                </div>
              ))}
           </div>
         </div>
         
      </div>

    </div>
  );
}
