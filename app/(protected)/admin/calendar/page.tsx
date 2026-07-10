"use client";

import React, { useState } from "react";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  Download, 
  Plus,
  Sun,
  ClipboardCheck,
  Flag,
  BookOpen,
  Filter,
  Sparkles,
  PenTool,
  Trash2
} from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { CrudSheet } from "@/components/layouts/crud-sheet";
import { AddAgendaModal } from "./components/AddAgendaModal";

const sparklineDataBlue = [
  { value: 10 }, { value: 25 }, { value: 15 }, { value: 30 }, { value: 20 }, { value: 40 }, { value: 35 }
];
const sparklineDataRed = [
  { value: 5 }, { value: 10 }, { value: 8 }, { value: 12 }, { value: 7 }, { value: 15 }, { value: 10 }
];
const sparklineDataOrange = [
  { value: 2 }, { value: 5 }, { value: 3 }, { value: 7 }, { value: 4 }, { value: 8 }, { value: 6 }
];
const sparklineDataGreen = [
  { value: 15 }, { value: 20 }, { value: 18 }, { value: 25 }, { value: 22 }, { value: 30 }, { value: 28 }
];

const UpcomingEvents = [
  {
    title: "Masa Pengenalan Lingkungan Sekolah (MPLS)",
    date: "22 - 24 Juli 2026",
    category: "Akademik",
    color: "blue",
    icon: CalendarIcon,
    bgClass: "bg-blue-50",
    textClass: "text-blue-600",
    borderClass: "border-blue-100",
  },
  {
    title: "Ujian Tengah Semester (UTS)",
    date: "12 - 16 September 2026",
    category: "Ujian",
    color: "orange",
    icon: ClipboardCheck,
    bgClass: "bg-orange-50",
    textClass: "text-orange-600",
    borderClass: "border-orange-100",
  },
  {
    title: "Pentas Seni & Budaya",
    date: "20 September 2026",
    category: "Event Sekolah",
    color: "green",
    icon: Flag,
    bgClass: "bg-green-50",
    textClass: "text-green-600",
    borderClass: "border-green-100",
  },
  {
    title: "Ujian Akhir Semester (UAS)",
    date: "28 Nov - 4 Des 2026",
    category: "Ujian",
    color: "orange",
    icon: ClipboardCheck,
    bgClass: "bg-orange-50",
    textClass: "text-orange-600",
    borderClass: "border-orange-100",
  },
  {
    title: "Pembagian Rapor Semester 1",
    date: "20 Desember 2026",
    category: "Akademik",
    color: "blue",
    icon: CalendarIcon,
    bgClass: "bg-blue-50",
    textClass: "text-blue-600",
    borderClass: "border-blue-100",
  }
];

const AgendaToday = [
  { time: "07:00 - 08:00", title: "Upacara Bendera", location: "Lapangan Utama", colorClass: "bg-green-500 shadow-green-500/30" },
  { time: "09:00 - 11:00", title: "Rapat Guru", location: "Ruang Guru", colorClass: "bg-blue-500 shadow-blue-500/30" },
  { time: "13:00 - 15:00", title: "Pembagian Rapor", location: "Aula Sekolah", colorClass: "bg-orange-500 shadow-orange-500/30" },
  { time: "15:30 - 17:00", title: "Ekstrakurikuler Pramuka", location: "Lapangan Sekolah", colorClass: "bg-purple-500 shadow-purple-500/30" },
];

export default function CalendarPage() {
  const [crudState, setCrudState] = useState<{ open: boolean; mode: "create" | "edit" | "delete"; data?: any }>({
    open: false,
    mode: "create"
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const eventFields = [
    { name: "title", label: "Nama Kegiatan" },
    { name: "date", label: "Tanggal Pelaksanaan" },
    { name: "category", label: "Kategori (Akademik, Ujian, dll)" },
    { name: "location", label: "Lokasi" },
    { name: "description", label: "Keterangan" },
  ];

  return (
    <div className="p-8 pb-12 max-w-[1600px] mx-auto w-full h-full flex flex-col space-y-6">
      <CrudSheet 
        open={crudState.open} 
        onOpenChange={(open) => setCrudState(s => ({ ...s, open }))}
        mode={crudState.mode}
        entityName="Agenda"
        fields={eventFields}
        initialData={crudState.data}
      />
      <AddAgendaModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />
      
      {/* Header View */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kalender Akademik</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola seluruh agenda dan kegiatan akademik sekolah.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
            <CalendarIcon className="w-4 h-4 text-gray-500" />
            Tahun Ajaran 2026 / 2027
            <ChevronDown className="w-4 h-4 text-gray-500 ml-1" />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
            <Download className="w-4 h-4 text-gray-500" />
            Export PDF
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#531FFF] text-white rounded-xl text-sm font-semibold hover:bg-[#531FFF]/90 transition-colors shadow-sm shadow-[#531FFF]/20"
          >
            <Plus className="w-4 h-4" />
            Tambah Agenda
          </button>
        </div>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Hari Efektif */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] relative overflow-hidden">
           <div className="flex items-start gap-3 relative z-10">
             <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
               <CalendarIcon className="w-5 h-5 text-blue-600" />
             </div>
             <div>
               <p className="text-[11px] font-medium text-gray-500 mb-0.5">Hari Efektif</p>
               <h3 className="text-xl font-bold text-gray-900 leading-none mb-1">218 Hari</h3>
               <p className="text-[10px] text-gray-500">80.3% dari total tahun ajaran</p>
             </div>
           </div>
           <div className="absolute bottom-0 left-0 right-0 h-10 opacity-30">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineDataBlue}>
                <Line type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
           </div>
        </div>

        {/* Libur Nasional */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] relative overflow-hidden">
           <div className="flex items-start gap-3 relative z-10">
             <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
               <Sun className="w-5 h-5 text-red-600" />
             </div>
             <div>
               <p className="text-[11px] font-medium text-gray-500 mb-0.5">Libur Nasional</p>
               <h3 className="text-xl font-bold text-gray-900 leading-none mb-1">17 Hari</h3>
               <p className="text-[10px] text-gray-500">Termasuk hari besar nasional</p>
             </div>
           </div>
           <div className="absolute bottom-0 left-0 right-0 h-10 opacity-30">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineDataRed}>
                <Line type="monotone" dataKey="value" stroke="#DC2626" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
           </div>
        </div>

        {/* Ujian */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] relative overflow-hidden">
           <div className="flex items-start gap-3 relative z-10">
             <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
               <ClipboardCheck className="w-5 h-5 text-orange-600" />
             </div>
             <div>
               <p className="text-[11px] font-medium text-gray-500 mb-0.5">Ujian</p>
               <h3 className="text-xl font-bold text-gray-900 leading-none mb-1">8 Event</h3>
               <p className="text-[10px] text-gray-500">UTS, UAS & lainnya</p>
             </div>
           </div>
           <div className="absolute bottom-0 left-0 right-0 h-10 opacity-30">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineDataOrange}>
                <Line type="monotone" dataKey="value" stroke="#EA580C" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
           </div>
        </div>

        {/* Event Sekolah */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] relative overflow-hidden">
           <div className="flex items-start gap-3 relative z-10">
             <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
               <Flag className="w-5 h-5 text-green-600" />
             </div>
             <div>
               <p className="text-[11px] font-medium text-gray-500 mb-0.5">Event Sekolah</p>
               <h3 className="text-xl font-bold text-gray-900 leading-none mb-1">24 Event</h3>
               <p className="text-[10px] text-gray-500">Kegiatan sekolah</p>
             </div>
           </div>
           <div className="absolute bottom-0 left-0 right-0 h-10 opacity-30">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineDataGreen}>
                <Line type="monotone" dataKey="value" stroke="#16A34A" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
           </div>
        </div>

        {/* Ekstrakurikuler */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] relative overflow-hidden">
           <div className="flex items-start gap-3 relative z-10">
             <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
               <BookOpen className="w-5 h-5 text-blue-600" />
             </div>
             <div>
               <p className="text-[11px] font-medium text-gray-500 mb-0.5">Ekstrakurikuler</p>
               <h3 className="text-xl font-bold text-gray-900 leading-none mb-1">15 Event</h3>
               <p className="text-[10px] text-gray-500">Kegiatan siswa</p>
             </div>
           </div>
           <div className="absolute bottom-0 left-0 right-0 h-10 opacity-30">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineDataBlue}>
                <Line type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
           </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1">
        
        {/* Main Content (Left) */}
        <div className="flex-1 space-y-6 flex flex-col">
          {/* Calendar Card */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] p-6">
            
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-100">
                  <button className="p-1 px-2.5 hover:bg-white rounded shadow-sm text-gray-500 hover:text-gray-900 transition-all font-semibold">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button className="p-1 px-2.5 hover:bg-white rounded shadow-sm text-gray-500 hover:text-gray-900 transition-all font-semibold">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <button className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
                  Today
                </button>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Mei 2026</h2>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  Month
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  <Filter className="w-3.5 h-3.5" />
                  Filter
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/50">
                {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((day) => (
                  <div key={day} className="py-3 text-center text-[12px] font-bold text-gray-500 border-r border-gray-100 last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Row 1 */}
              <div className="grid grid-cols-7 border-b border-gray-100 h-24">
                 <div className="p-2 border-r border-gray-100 "><span className="text-sm font-semibold text-gray-400">27</span></div>
                 <div className="p-2 border-r border-gray-100 "><span className="text-sm font-semibold text-gray-400">28</span></div>
                 <div className="p-2 border-r border-gray-100 "><span className="text-sm font-semibold text-gray-400">29</span></div>
                 <div className="p-2 border-r border-gray-100 "><span className="text-sm font-semibold text-gray-400">30</span></div>
                 <div className="p-2 border-r border-gray-100 ">
                   <span className="text-sm font-semibold text-gray-900">1</span>
                   <div className="mt-1 bg-blue-50 text-blue-600 text-[10px] font-semibold px-2 py-1 rounded truncate border border-blue-100 flex items-center gap-1.5">
                     <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"></span> Hari Buruh
                   </div>
                 </div>
                 <div className="p-2 border-r border-gray-100 "><span className="text-sm font-semibold text-gray-900">2</span></div>
                 <div className="p-2 "><span className="text-sm font-semibold text-gray-900">3</span></div>
              </div>
              
              {/* Row 2 */}
              <div className="grid grid-cols-7 border-b border-gray-100 h-24">
                 <div className="p-2 border-r border-gray-100 ">
                   <span className="text-sm font-semibold text-gray-900">4</span>
                   <div className="mt-1 bg-green-50 text-green-600 text-[10px] font-semibold px-2 py-1 rounded truncate border border-green-100 flex items-center gap-1.5">
                     <span className="w-1.5 h-1.5 rounded-full bg-green-600 shrink-0"></span> Upacara Bendera
                   </div>
                 </div>
                 <div className="p-2 border-r border-gray-100 ">
                   <span className="text-sm font-semibold text-gray-900">5</span>
                   <div className="mt-1 bg-purple-50 text-purple-600 text-[10px] font-semibold px-2 py-1 rounded truncate border border-purple-100 flex items-center gap-1.5">
                     <span className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0"></span> Ekstrakurikuler
                   </div>
                 </div>
                 <div className="p-2 border-r border-gray-100 "><span className="text-sm font-semibold text-gray-900">6</span></div>
                 <div className="p-2 border-r border-gray-100 ">
                   <span className="text-sm font-semibold text-gray-900">7</span>
                   <div className="mt-1 bg-blue-50 text-blue-600 text-[10px] font-semibold px-2 py-1 rounded truncate border border-blue-100 flex items-center gap-1.5">
                     <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"></span> Rapat Guru
                   </div>
                 </div>
                 <div className="p-2 border-r border-gray-100 ">
                   <span className="text-sm font-semibold text-gray-900">8</span>
                   <div className="mt-1 bg-orange-50 text-orange-600 text-[10px] font-semibold px-2 py-1 rounded truncate border border-orange-100 flex items-center gap-1.5">
                     <span className="w-1.5 h-1.5 rounded-full bg-orange-600 shrink-0"></span> Ujian Harian
                   </div>
                 </div>
                 <div className="p-2 border-r border-gray-100 "><span className="text-sm font-semibold text-gray-900">9</span></div>
                 <div className="p-2 ">
                   <span className="text-sm font-semibold text-red-500">10</span>
                   <div className="mt-1 bg-red-50 text-red-600 text-[10px] font-semibold px-2 py-1 rounded truncate border border-red-100 flex items-center gap-1.5">
                     <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0"></span> Hari Raya Waisak
                   </div>
                 </div>
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-7 border-b border-gray-100 h-24">
                 <div className="p-2 border-r border-gray-100 "><span className="text-sm font-semibold text-gray-900">11</span></div>
                 <div className="p-2 border-r border-gray-100 ">
                   <span className="text-sm font-semibold text-gray-900">12</span>
                   <div className="mt-1 bg-orange-50 text-orange-600 text-[10px] font-semibold px-2 py-1 rounded truncate border border-orange-100 flex items-center gap-1.5">
                     <span className="w-1.5 h-1.5 rounded-full bg-orange-600 shrink-0"></span> UTS Dimulai
                   </div>
                 </div>
                 <div className="p-2 border-r border-gray-100 ">
                   <span className="text-sm font-semibold text-gray-900">13</span>
                   <div className="mt-1 bg-blue-50 text-blue-600 text-[10px] font-semibold px-2 py-1 rounded truncate border border-blue-100 flex items-center gap-1.5">
                     <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"></span> Literasi Sekolah
                   </div>
                 </div>
                 <div className="p-2 border-r border-gray-100 "><span className="text-sm font-semibold text-gray-900">14</span></div>
                 <div className="p-2 border-r border-gray-100 ">
                   <span className="text-sm font-semibold text-gray-900">15</span>
                   <div className="mt-1 bg-purple-50 text-purple-600 text-[10px] font-semibold px-2 py-1 rounded truncate border border-purple-100 flex items-center gap-1.5">
                     <span className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0"></span> Kelas Inspirasi
                   </div>
                 </div>
                 <div className="p-2 border-r border-gray-100 "><span className="text-sm font-semibold text-gray-900">16</span></div>
                 <div className="p-2 ">
                   <span className="text-sm font-semibold text-red-500">17</span>
                   <div className="mt-1 bg-red-50 text-red-600 text-[10px] font-semibold px-2 py-1 rounded truncate border border-red-100 flex items-center gap-1.5">
                     <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0"></span> Libur Nasional
                   </div>
                 </div>
              </div>

               {/* Row 4 */}
               <div className="grid grid-cols-7 border-b border-gray-100 h-24">
                 <div className="p-2 border-r border-gray-100 "><span className="text-sm font-semibold text-gray-900">18</span></div>
                 <div className="p-2 border-r border-gray-100 "><span className="text-sm font-semibold text-gray-900">19</span></div>
                 <div className="p-2 border-r border-gray-100 ">
                   <span className="text-sm font-semibold text-gray-900">20</span>
                   <div className="mt-1 bg-green-50 text-green-600 text-[10px] font-semibold px-2 py-1 rounded truncate border border-green-100 flex items-center gap-1.5">
                     <span className="w-1.5 h-1.5 rounded-full bg-green-600 shrink-0"></span> Pentas Seni
                   </div>
                 </div>
                 <div className="p-2 border-r border-gray-100 ">
                   <span className="text-sm font-semibold text-gray-900">21</span>
                   <div className="mt-1 bg-blue-50 text-blue-600 text-[10px] font-semibold px-2 py-1 rounded truncate border border-blue-100 flex items-center gap-1.5">
                     <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"></span> Rapat Komite
                   </div>
                 </div>
                 <div className="p-2 border-r border-gray-100 ">
                   <span className="text-sm font-semibold text-gray-900">22</span>
                   <div className="mt-1 bg-purple-50 text-purple-600 text-[10px] font-semibold px-2 py-1 rounded truncate border border-purple-100 flex items-center gap-1.5">
                     <span className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0"></span> Jumat Bersih
                   </div>
                 </div>
                 <div className="p-2 border-r border-gray-100 "><span className="text-sm font-semibold text-gray-900">23</span></div>
                 <div className="p-2 "><span className="text-sm font-semibold text-gray-900">24</span></div>
              </div>

               {/* Row 5 */}
               <div className="grid grid-cols-7 h-24">
                 <div className="p-2 border-r border-gray-100 "><span className="text-sm font-semibold text-gray-900">25</span></div>
                 <div className="p-2 border-r border-gray-100 ">
                   <span className="text-sm font-semibold text-gray-900">26</span>
                   <div className="mt-1 bg-blue-50 text-blue-600 text-[10px] font-semibold px-2 py-1 rounded truncate border border-blue-100 flex items-center gap-1.5">
                     <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"></span> Ujian Praktek
                   </div>
                 </div>
                 <div className="p-2 border-r border-gray-100 ">
                   <span className="text-sm font-semibold text-gray-900">27</span>
                   <div className="mt-1 bg-blue-50 text-blue-600 text-[10px] font-semibold px-2 py-1 rounded truncate border border-blue-100 flex items-center gap-1.5">
                     <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"></span> Ujian Praktek
                   </div>
                 </div>
                 <div className="p-2 border-r border-gray-100 ">
                   <span className="text-sm font-semibold text-gray-900">28</span>
                   <div className="mt-1 bg-orange-50 text-orange-600 text-[10px] font-semibold px-2 py-1 rounded truncate border border-orange-100 flex items-center gap-1.5">
                     <span className="w-1.5 h-1.5 rounded-full bg-orange-600 shrink-0"></span> UAS Dimulai
                   </div>
                 </div>
                 <div className="p-2 border-r border-gray-100 relative">
                   <div className="w-6 h-6 bg-[#531FFF] text-white rounded-full flex items-center justify-center text-sm font-bold absolute top-1 left-2">29</div>
                   <div className="mt-6 bg-green-50 text-green-600 text-[10px] font-semibold px-2 py-1 rounded truncate border border-green-100 flex items-center gap-1.5">
                     <span className="w-1.5 h-1.5 rounded-full bg-green-600 shrink-0"></span> Pembagian Rapor
                   </div>
                 </div>
                 <div className="p-2 border-r border-gray-100 "><span className="text-sm font-semibold text-gray-900">30</span></div>
                 <div className="p-2 ">
                   <span className="text-sm font-semibold text-red-500">31</span>
                   <div className="mt-1 bg-red-50 text-red-600 text-[10px] font-semibold px-2 py-1 rounded truncate border border-red-100 flex items-center gap-1.5">
                     <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0"></span> Hari Lahir Pancasila
                   </div>
                 </div>
              </div>
            </div>

            {/* Tags Legenda */}
            <div className="mt-6 flex items-center gap-6">
              <span className="text-sm font-bold text-gray-900">Legenda</span>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span className="text-[12px] font-semibold text-gray-600">Akademik</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  <span className="text-[12px] font-semibold text-gray-600">Ujian</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span className="text-[12px] font-semibold text-gray-600">Libur Nasional</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span className="text-[12px] font-semibold text-gray-600">Event Sekolah</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  <span className="text-[12px] font-semibold text-gray-600">Ekstrakurikuler</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                  <span className="text-[12px] font-semibold text-gray-600">Lainnya</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
             {/* Timeline Card */}
             <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] p-6 flex flex-col justify-between h-full">
               <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-3">
                   <h2 className="text-[16px] font-bold text-gray-900">Timeline Tahun Ajaran 2026 / 2027</h2>
                   <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded text-[10px] font-bold">Semester 1</span>
                 </div>
                 <button className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600">
                   <ChevronRight className="w-4 h-4" />
                 </button>
               </div>
               
               <div className="relative pt-4 pb-2">
                 <div className="absolute top-[21px] left-0 right-0 h-[2px] bg-gray-100 rounded-full z-0"></div>
                 <div className="absolute top-[21px] left-0 w-[40%] h-[2px] bg-[#531FFF] rounded-full z-0"></div>
                 
                 <div className="flex justify-between relative z-10">
                    <div className="flex flex-col items-center gap-3 relative">
                      <div className="w-3 h-3 rounded-full bg-[#531FFF] ring-4 ring-white"></div>
                      <div className="text-center">
                        <p className="text-[10px] font-semibold text-gray-500 mb-1">Jul 2026</p>
                        <p className="text-[12px] font-bold text-gray-900 leading-tight">MPLS</p>
                        <p className="text-[10px] text-gray-400">14 - 16 Jul</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-center gap-3 relative">
                      <div className="w-3 h-3 rounded-full bg-[#531FFF] ring-4 ring-white"></div>
                      <div className="text-center">
                        <p className="text-[10px] font-semibold text-gray-500 mb-1">Agu 2026</p>
                        <p className="text-[12px] font-bold text-gray-900 leading-tight">Hari Kemerdekaan</p>
                        <p className="text-[10px] text-gray-400">17 Agu</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-3 relative">
                      <div className="w-4 h-4 rounded-full bg-[#531FFF] border-[3px] border-white shadow-sm flex items-center justify-center translate-y-[-2px]">
                         <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-semibold text-gray-500 mb-1 mt-[-2px]">Sep 2026</p>
                        <p className="text-[12px] font-bold text-gray-900 leading-tight">UTS</p>
                        <p className="text-[10px] text-gray-400">12 - 16 Sep</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-3 relative">
                      <div className="w-3 h-3 rounded-full bg-gray-200 ring-4 ring-white"></div>
                      <div className="text-center">
                        <p className="text-[10px] font-semibold text-gray-500 mb-1">Okt 2026</p>
                        <p className="text-[12px] font-bold text-gray-900 leading-tight">Kelas Inspirasi</p>
                        <p className="text-[10px] text-gray-400">18 Okt</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-3 relative">
                      <div className="w-3 h-3 rounded-full bg-gray-200 ring-4 ring-white"></div>
                      <div className="text-center">
                        <p className="text-[10px] font-semibold text-gray-500 mb-1">Des 2026</p>
                        <p className="text-[12px] font-bold text-gray-900 leading-tight">UAS</p>
                        <p className="text-[10px] text-gray-400">28 Nov - 4 Des</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-3 relative">
                      <div className="w-3 h-3 rounded-full bg-gray-200 ring-4 ring-white"></div>
                      <div className="text-center">
                        <p className="text-[10px] font-semibold text-gray-500 mb-1">Des 2026</p>
                        <p className="text-[12px] font-bold text-gray-900 leading-tight">Pembagian Rapor</p>
                        <p className="text-[10px] text-gray-400">20 Des</p>
                      </div>
                    </div>
                 </div>
               </div>
             </div>

             {/* Progress Card */}
             <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] p-6 flex flex-col justify-between h-full">
               <h2 className="text-[16px] font-bold text-gray-900 mb-6">Progress Tahun Ajaran</h2>
               <div className="flex items-center gap-8">
                  <div className="w-[120px] h-[120px] relative shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[{ value: 65 }, { value: 35 }]}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={55}
                          dataKey="value"
                          startAngle={90}
                          endAngle={-270}
                          stroke="none"
                        >
                           <Cell fill="#531FFF" />
                           <Cell fill="#F3F4F6" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-bold text-gray-900 leading-none">65%</span>
                      <span className="text-[10px] font-medium text-gray-500">Berjalan</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                     <div>
                       <p className="text-[11px] font-medium text-gray-500 mb-0.5">Hari Efektif Berjalan</p>
                       <p className="text-[14px] font-bold text-gray-900">142 Hari</p>
                     </div>
                     <div>
                       <p className="text-[11px] font-medium text-gray-500 mb-0.5">Sisa Hari Efektif</p>
                       <p className="text-[14px] font-bold text-gray-900">76 Hari</p>
                     </div>
                     <div>
                       <p className="text-[11px] font-medium text-gray-500 mb-0.5">Semester</p>
                       <p className="text-[14px] font-bold text-gray-900">Semester 1</p>
                     </div>
                  </div>
               </div>
               <p className="text-[10px] text-gray-400 mt-4 pt-4 border-t border-gray-100">Periode: 14 Juli 2026 - 30 Juni 2027</p>
             </div>
          </div>
        </div>

        {/* Sidebar Space (Right) */}
        <div className="w-full lg:w-[35%] space-y-6 flex flex-col h-fit">
          
          {/* Upcoming Events */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[16px] font-bold text-gray-900">Upcoming Events</h2>
              <button className="text-[12px] font-semibold text-[#531FFF] hover:text-[#531FFF]/80 transition-colors">
                Lihat Semua
              </button>
            </div>
            <div className="space-y-4">
               {UpcomingEvents.map((event, idx) => (
                 <div key={idx} className="flex gap-4 group items-center">
                   <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${event.bgClass} ${event.borderClass}`}>
                     <event.icon className={`w-5 h-5 ${event.textClass}`} />
                   </div>
                   <div className="flex-1 min-w-0 flex flex-col justify-center">
                     <h3 className="text-[13px] font-bold text-gray-900 leading-tight mb-1 truncate">{event.title}</h3>
                     <p className="text-[11px] text-gray-500">{event.date}</p>
                   </div>
                   <div className="shrink-0 flex items-center gap-2">
                      <span className={`px-2 py-1 text-[9px] font-bold rounded ${event.bgClass} ${event.textClass}`}>
                        {event.category}
                      </span>
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                        <button 
                          onClick={() => setCrudState({ open: true, mode: "edit", data: event })}
                          className="p-1.5 text-gray-400 hover:text-[#531FFF] transition-colors rounded-lg hover:bg-gray-50">
                          <PenTool className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setCrudState({ open: true, mode: "delete", data: event })}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-gray-50">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                   </div>
                 </div>
               ))}
            </div>
          </div>

          {/* Agenda Hari Ini */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[16px] font-bold text-gray-900">Agenda Hari Ini</h2>
              <button className="text-[12px] font-semibold text-[#531FFF] hover:text-[#531FFF]/80 transition-colors">
                Lihat Semua
              </button>
            </div>
            <p className="text-[12px] text-gray-500 mb-6">Jumat, 29 Mei 2026</p>
            
            <div className="space-y-4">
              {AgendaToday.map((agenda, idx) => (
                 <div key={idx} className="flex items-center gap-4 group">
                    <div className="flex items-center gap-3 w-[100px] shrink-0">
                       <span className={`w-2 h-2 rounded-full shadow-sm ${agenda.colorClass}`}></span>
                       <span className="text-[12px] font-semibold text-gray-600">{agenda.time}</span>
                    </div>
                    <div className="flex-1 min-w-0 group-hover:bg-gray-50 p-2 -my-2 rounded-lg transition-colors cursor-pointer flex justify-between items-center">
                       <h3 className="text-[13px] font-bold text-gray-900 truncate pr-2">{agenda.title}</h3>
                       <p className="text-[11px] font-medium text-gray-400 shrink-0">{agenda.location}</p>
                    </div>
                 </div>
              ))}
            </div>
          </div>

          {/* AI Insight */}
        </div>
      </div>
    </div>
  );
}
