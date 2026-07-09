"use client";

import React, { useState } from "react";
import { 
  Megaphone, Plus, Filter, Grid, Search, MoreHorizontal, Calendar, User, Users, 
  Eye, Zap, AlertCircle, BookOpen, CreditCard, Activity, Info, Clock, CheckCircle2,
  Send, ListFilter, Sparkles, ChevronDown, PenTool, Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CrudSheet } from "@/components/layouts/crud-sheet";

const METRICS = [
  { label: "Total Pengumuman", value: 48, desc: "Semua waktu", icon: Megaphone, color: "text-[#531FFF]", bgColor: "bg-[#531FFF]/10", iconBg: "bg-[#531FFF]" },
  { label: "Pengumuman Aktif", value: 12, desc: "Sedang berjalan", icon: Send, color: "text-emerald-500", bgColor: "bg-emerald-50", iconBg: "bg-emerald-500" },
  { label: "Terjadwal", value: 5, desc: "Akan tayang", icon: Clock, color: "text-amber-500", bgColor: "bg-amber-50", iconBg: "bg-amber-500" },
  { label: "Berakhir", value: 31, desc: "Selesai", icon: CheckCircle2, color: "text-blue-500", bgColor: "bg-blue-50", iconBg: "bg-blue-500" },
];

const CATEGORIES = [
  { label: "Penting", count: 12, icon: AlertCircle, color: "text-red-500", bgColor: "bg-red-50" },
  { label: "Akademik", count: 16, icon: BookOpen, color: "text-blue-500", bgColor: "bg-blue-50" },
  { label: "Keuangan", count: 8, icon: CreditCard, color: "text-emerald-500", bgColor: "bg-emerald-50" },
  { label: "Kegiatan", count: 7, icon: Activity, color: "text-amber-500", bgColor: "bg-amber-50" },
  { label: "Informasi", count: 5, icon: Info, color: "text-blue-400", bgColor: "bg-blue-50" },
];

const POPULAR_ANNOUNCEMENTS = [
  { title: "Libur Idul Fitri 1447 H", views: "1.245", date: "10 Apr 2026", color: "text-[#531FFF]", bgColor: "bg-[#531FFF]/10" },
  { title: "Pembayaran SPP Bulan Mei 2026", views: "987", date: "28 Apr 2026", color: "text-[#531FFF]", bgColor: "bg-[#531FFF]/10" },
  { title: "Ujian Tengah Semester Genap", views: "876", date: "12 Mar 2026", color: "text-red-500", bgColor: "bg-red-50" },
  { title: "Pengumuman Kelulusan Kelas 12", views: "765", date: "20 Mei 2025", color: "text-amber-500", bgColor: "bg-amber-50" },
  { title: "Daftar Ulang Tahun Ajaran Baru", views: "654", date: "15 Jun 2025", color: "text-emerald-500", bgColor: "bg-emerald-50" },
];

const MAIN_ANNOUNCEMENTS = [
  {
    tag: "PENTING",
    title: "Libur Kenaikan Isa Almasih",
    desc: "Diberitahukan kepada seluruh siswa, guru dan staff bahwa sekolah akan libur pada hari Kamis, 29 Mei 2026 dalam rangka memperingati Kenaikan Isa Almasih.",
    date: "18 Mei 2026",
    author: "Super Admin",
    target: "Semua Siswa, Guru & Staff",
    status: "Aktif",
    tagColor: "text-red-500 bg-red-50",
    theme: "purple"
  },
  {
    tag: "AKADEMIK",
    title: "Ujian Akhir Semester Genap 2025/2026",
    desc: "Ujian Akhir Semester Genap akan dilaksanakan mulai tanggal 2 - 10 Juni 2026. Pastikan semua siswa mempersiapkan diri dengan baik.",
    date: "17 Mei 2026",
    author: "Waka Kurikulum",
    target: "Siswa Kelas 7-12",
    status: "Aktif",
    tagColor: "text-blue-500 bg-blue-50",
    theme: "orange"
  },
  {
    tag: "KEUANGAN",
    title: "Pembayaran SPP Bulan Juni 2026",
    desc: "Diharapkan kepada seluruh orang tua/wali siswa untuk melakukan pembayaran SPP paling lambat tanggal 10 Juni 2026.",
    date: "16 Mei 2026",
    author: "Bagian Keuangan",
    target: "Orang Tua/Wali",
    status: "Aktif",
    tagColor: "text-emerald-500 bg-emerald-50",
    theme: "green"
  },
  {
    tag: "KEGIATAN",
    title: "Kegiatan Ekstrakurikuler Pramuka",
    desc: "Kegiatan pramuka rutin akan diadakan setiap hari Sabtu pukul 13.00 - 15.00 WIB di lapangan sekolah. Semua anggota wajib hadir.",
    date: "15 Mei 2026",
    author: "Pembina Pramuka",
    target: "Anggota Pramuka",
    status: "Aktif",
    tagColor: "text-[#531FFF] bg-[#531FFF]/10",
    theme: "purple"
  },
  {
    tag: "INFORMASI",
    title: "Rapat Komite Sekolah",
    desc: "Rapat komite sekolah akan dilaksanakan pada hari Jumat, 30 Mei 2026 pukul 09.00 WIB di ruang rapat utama.",
    date: "14 Mei 2026",
    author: "Ketua Komite",
    target: "Komite Sekolah",
    status: "Terjadwal",
    tagColor: "text-blue-500 bg-blue-50",
    theme: "teal"
  }
];

export default function AnnouncementsPage() {
  const [crudState, setCrudState] = useState<{ open: boolean; mode: "create" | "edit" | "delete"; data?: any }>({
    open: false,
    mode: "create"
  });

  const announcementFields = [
    { name: "title", label: "Judul Pengumuman" },
    { name: "desc", label: "Deskripsi" },
    { name: "target", label: "Target Penerima" },
    { name: "tag", label: "Kategori" }
  ];

  return (
    <div className="p-8 pb-12 max-w-[1600px] mx-auto w-full h-full flex flex-col space-y-6">
      <CrudSheet 
        open={crudState.open} 
        onOpenChange={(open) => setCrudState(s => ({ ...s, open }))}
        mode={crudState.mode}
        entityName="Pengumuman"
        fields={announcementFields}
        initialData={crudState.data}
      />
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Pengumuman</h1>
          <p className="text-[13px] text-gray-500 mt-1 font-medium">Kelola dan sampaikan informasi penting untuk seluruh warga sekolah.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 rounded-xl text-[13px] font-bold shadow-sm transition-colors">
            <Filter className="w-4 h-4" /> Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 rounded-xl text-[13px] font-bold shadow-sm transition-colors">
            <Grid className="w-4 h-4" /> Kategori
          </button>
          <button 
            onClick={() => setCrudState({ open: true, mode: "create" })}
            className="flex items-center gap-2 px-4 py-2 bg-[#531FFF] text-white hover:bg-[#4314E5] rounded-xl text-[13px] font-bold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Buat Pengumuman
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {METRICS.map((m, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-[24px] p-5 flex items-center justify-between shadow-sm">
             <div className="flex items-center gap-4">
               <div className={cn("w-14 h-14 rounded-full flex items-center justify-center", m.bgColor)}>
                 <m.icon className={cn("w-6 h-6", m.color)} />
               </div>
               <div>
                  <div className="text-[12px] font-bold text-gray-500 mb-0.5">{m.label}</div>
                  <div className="text-2xl font-bold text-gray-900">{m.value}</div>
                  <div className="text-[11px] font-medium text-gray-400 mt-0.5">{m.desc}</div>
               </div>
             </div>
          </div>
        ))}
      </div>

      {/* Main Layout Area */}
      <div className="flex flex-col xl:flex-row gap-6 items-start mt-2">
         {/* Left Column: List */}
         <div className="flex-1 w-full flex flex-col gap-6">
            {/* Tabs and Search */}
            <div className="flex flex-col sm:flex-row items-center justify-between border-b border-gray-100 pb-2">
               <div className="flex items-center gap-6">
                 <button className="text-[13px] font-bold text-[#531FFF] border-b-2 border-[#531FFF] pb-2 relative top-[9px]">
                    Semua
                 </button>
                 <button className="text-[13px] font-bold text-gray-500 hover:text-gray-900 pb-2 relative top-[9px] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Pengumuman Aktif
                 </button>
                 <button className="text-[13px] font-bold text-gray-500 hover:text-gray-900 pb-2 relative top-[9px]">
                    Terjadwal
                 </button>
                 <button className="text-[13px] font-bold text-gray-500 hover:text-gray-900 pb-2 relative top-[9px]">
                    Berakhir
                 </button>
               </div>
               
               <div className="relative mt-4 sm:mt-0 w-full sm:w-[280px]">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                 <input 
                   type="text"
                   placeholder="Cari pengumuman..."
                   className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-[13px] placeholder:text-gray-400 bg-white focus:outline-none focus:border-[#531FFF] focus:ring-1 focus:ring-[#531FFF] transition-all"
                 />
               </div>
            </div>

            {/* Announcements List */}
            <div className="flex flex-col gap-4">
              {MAIN_ANNOUNCEMENTS.map((item, i) => (
                <div key={i} className="flex flex-col sm:flex-row bg-white border border-gray-100 rounded-3xl p-3 shadow-sm hover:shadow-md transition-all gap-4 items-stretch group">
                   {/* Illustration Thumbnail */}
                   <div className={cn(
                     "w-full sm:w-[220px] h-[140px] sm:h-auto rounded-2xl relative overflow-hidden shrink-0 flex items-center justify-center p-4",
                     item.theme === "purple" ? "bg-purple-100" :
                     item.theme === "orange" ? "bg-orange-100" :
                     item.theme === "green" ? "bg-emerald-100" : "bg-teal-100"
                   )}>
                      {/* Decorative Shapes for Thumbnail - purely CSS to mimic illustration */}
                      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_white_10%,_transparent_60%)]"></div>
                      <h3 className={cn(
                         "text-xl font-black text-center z-10 leading-tight",
                         item.theme === "purple" ? "text-purple-800" :
                         item.theme === "orange" ? "text-orange-800" :
                         item.theme === "green" ? "text-emerald-800" : "text-teal-800"
                      )}>
                        {item.title.split(" ").slice(0, 2).join(" ")}<br/>
                        {item.title.split(" ").slice(2).join(" ")}
                      </h3>
                   </div>
                   
                   {/* Content */}
                   <div className="flex-1 flex flex-col justify-between py-2 pr-2">
                     <div>
                       <div className="flex justify-between items-start mb-2">
                         <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider", item.tagColor)}>
                           {item.tag}
                         </span>
                         <div className="flex items-center gap-2">
                           <span className={cn(
                             "text-[11px] font-bold px-2.5 py-1 rounded-md",
                             item.status === "Aktif" ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50"
                           )}>
                             {item.status}
                           </span>
                           <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
                             <button 
                               onClick={() => setCrudState({ open: true, mode: "edit", data: item })}
                               className="p-1.5 text-gray-400 hover:text-[#531FFF] hover:bg-[#531FFF]/10 rounded-md transition-colors" title="Edit">
                               <PenTool className="w-4 h-4" />
                             </button>
                             <button 
                               onClick={() => setCrudState({ open: true, mode: "delete", data: item })}
                               className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Hapus">
                               <Trash2 className="w-4 h-4" />
                             </button>
                           </div>
                         </div>
                       </div>
                       
                       <h3 className="text-[16px] font-bold text-gray-900 mb-1 leading-snug">{item.title}</h3>
                       <p className="text-[13px] text-gray-500 leading-relaxed max-w-3xl line-clamp-2">
                         {item.desc}
                       </p>
                     </div>
                     
                     <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-4">
                       <div className="flex items-center gap-1.5 text-gray-500">
                         <Calendar className="w-4 h-4 text-gray-400" />
                         <span className="text-[12px] font-medium">{item.date}</span>
                       </div>
                       <div className="flex items-center gap-1.5 text-gray-500">
                         <User className="w-4 h-4 text-gray-400" />
                         <span className="text-[12px] font-medium">{item.author}</span>
                       </div>
                       <div className="flex items-center gap-1.5 text-gray-500">
                         <Users className="w-4 h-4 text-gray-400" />
                         <span className="text-[12px] font-medium">{item.target}</span>
                       </div>
                     </div>
                   </div>
                </div>
              ))}
            </div>
         </div>

         {/* Right Column: Sidebar Panels */}
         <div className="w-full xl:w-[340px] shrink-0 flex flex-col gap-6">
            
            {/* Categories */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
               <div className="flex justify-between items-center mb-5">
                 <h3 className="text-[14px] font-bold text-gray-900">Kategori Pengumuman</h3>
                 <button className="text-[11px] font-bold text-[#531FFF] hover:underline">Kelola Kategori</button>
               </div>
               <div className="flex flex-col gap-3">
                 {CATEGORIES.map((c, i) => (
                   <div key={i} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group">
                     <div className="flex items-center gap-3">
                       <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", c.bgColor)}>
                         <c.icon className={cn("w-4 h-4", c.color)} />
                       </div>
                       <span className="text-[13px] font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">{c.label}</span>
                     </div>
                     <span className="text-[12px] font-bold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-md">{c.count}</span>
                   </div>
                 ))}
               </div>
            </div>

            {/* Popular Announcements */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
               <h3 className="text-[14px] font-bold text-gray-900 mb-5">Pengumuman Terpopuler</h3>
               <div className="flex flex-col gap-4">
                 {POPULAR_ANNOUNCEMENTS.map((p, i) => (
                   <div key={i} className="flex gap-3 group cursor-pointer">
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", p.bgColor)}>
                        <Megaphone className={cn("w-4 h-4", p.color)} />
                      </div>
                      <div>
                        <h4 className="text-[13px] font-bold text-gray-800 group-hover:text-[#531FFF] transition-colors leading-tight mb-1">{p.title}</h4>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-gray-400">
                             <Eye className="w-3.5 h-3.5" />
                             <span className="text-[11px] font-medium">{p.views}</span>
                          </div>
                          <span className="text-[10px] font-medium text-gray-400">{p.date}</span>
                        </div>
                      </div>
                   </div>
                 ))}
               </div>
            </div>

            {/* Quick Send */}
            <div className="bg-[#F8F9FE] border border-[#531FFF]/10 rounded-3xl p-6 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 w-24 h-24 bg-[#531FFF]/5 rounded-bl-[100px] pointer-events-none"></div>
               
               <div className="flex items-center justify-between mb-2 relative z-10">
                 <h3 className="text-[14px] font-bold text-gray-900">Kirim Pengumuman Cepat</h3>
                 <Sparkles className="w-4 h-4 text-[#531FFF]" />
               </div>
               
               <p className="text-[12px] text-gray-500 mb-5 leading-relaxed relative z-10">
                 Kirim pengumuman singkat ke seluruh warga sekolah atau grup tertentu.
               </p>
               
               <div className="flex flex-col gap-3 relative z-10">
                 <div>
                   <label className="text-[11px] font-bold text-gray-700 block mb-1.5">Pilih Penerima</label>
                   <div className="relative">
                     <select className="w-full appearance-none bg-white border border-gray-200 text-gray-700 text-[13px] rounded-xl px-3 py-2.5 outline-none focus:border-[#531FFF] font-medium">
                       <option>Pilih kelompok penerima...</option>
                       <option>Semua Warga Sekolah</option>
                       <option>Semua Guru & Staff</option>
                       <option>Semua Siswa</option>
                     </select>
                     <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                   </div>
                 </div>
                 
                 <button 
                   onClick={() => setCrudState({ open: true, mode: "create" })}
                   className="w-full bg-[#531FFF] text-white font-bold text-[13px] py-2.5 rounded-xl hover:bg-[#4314E5] transition-colors shadow-sm mt-2">
                   Buat Pengumuman
                 </button>
               </div>
            </div>

            {/* AI Assistant Promo */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6 flex flex-col items-center justify-center shadow-sm">
               <div className="flex w-full justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center shadow-sm">
                       <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="font-bold text-[13px] text-gray-900">AI Assistant</span>
                  </div>
                  <span className="text-[9px] font-bold bg-[#531FFF]/10 text-[#531FFF] px-2 py-0.5 rounded-full tracking-wider">BETA</span>
               </div>
               <p className="text-[12px] text-gray-500 w-full mb-4">Butuh bantuan membuat pengumuman?</p>
               <button className="w-full py-2.5 border border-[#531FFF]/20 text-[#531FFF] hover:bg-[#531FFF]/5 font-bold text-[13px] rounded-xl flex items-center justify-center gap-2 transition-colors">
                  <Sparkles className="w-4 h-4" /> Buat dengan AI
               </button>
            </div>

         </div>
      </div>
    </div>
  );
}
