
"use client";

import React, { useState, useEffect } from "react";
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
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { CrudSheet } from "@/components/layouts/crud-sheet";
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";






export default function CalendarPage() {
  const [crudState, setCrudState] = useState<{ open: boolean; mode: "create" | "edit" | "delete"; data?: any }>({
    open: false,
    mode: "create"
  });
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const today = new Date();
  const currentYear = today.getFullYear();
  const academicYearStart = new Date(today.getMonth() < 6 ? currentYear - 1 : currentYear, 6, 15);
  const academicYearEnd = new Date(today.getMonth() < 6 ? currentYear : currentYear + 1, 5, 15);

  const totalDays = Math.max(1, Math.ceil((academicYearEnd.getTime() - academicYearStart.getTime()) / (1000 * 60 * 60 * 24)));
  const passedDays = Math.max(0, Math.ceil((today.getTime() - academicYearStart.getTime()) / (1000 * 60 * 60 * 24)));
  const progressPercent = Math.max(0, Math.min(100, Math.round((passedDays / totalDays) * 100)));
  
  const currentSemester = today.getMonth() < 6 ? "Semester 2" : "Semester 1";
  const academicYearText = today.getMonth() < 6 ? `${currentYear - 1} / ${currentYear}` : `${currentYear} / ${currentYear + 1}`;

  const upcomingEvents = events
    .filter(e => e.date && new Date(e.date) >= new Date(new Date().setHours(0,0,0,0)))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const renderCalendarCells = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = '';

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, 'd');
        const cloneDay = day;
        
        // Find events for this day
        const dayEvents = events.filter(e => {
          if (!e.date) return false;
          try {
            return e.date === format(cloneDay, 'yyyy-MM-dd');
          } catch(err) { return false; }
        });

        days.push(
          <div
            key={day.toString()}
            className={`min-h-[120px] p-2 border-b border-r border-gray-100 transition-colors cursor-pointer group hover:bg-gray-50/50 ${
              !isSameMonth(day, monthStart)
                ? 'bg-gray-50/30'
                : isSameDay(day, new Date())
                ? 'bg-blue-50/20'
                : 'bg-white'
            }`}
            onClick={() => setCrudState({ open: true, mode: "create", data: { date: format(cloneDay, 'yyyy-MM-dd') } })}
          >
            <div className="flex justify-between items-start mb-2">
              <span
                className={`w-7 h-7 flex items-center justify-center rounded-full text-[13px] font-bold ${
                  isSameDay(day, new Date())
                    ? 'bg-[#531FFF] text-white shadow-md shadow-[#531FFF]/20'
                    : !isSameMonth(day, monthStart)
                    ? 'text-gray-400'
                    : 'text-gray-700 group-hover:text-gray-900'
                }`}
              >
                {formattedDate}
              </span>
              {dayEvents.length > 0 && (
                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">
                  {dayEvents.length}
                </span>
              )}
            </div>
            
            <div className="flex flex-col gap-1.5 mt-1">
              {dayEvents.slice(0, 3).map((event, idx) => {
                const details = getCategoryDetails(event.category);
                return (
                  <div
                    key={event.id || idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCrudState({ open: true, mode: "edit", data: event });
                    }}
                    className={`text-[11px] font-bold px-2 py-1.5 rounded-md truncate transition-all hover:opacity-80 flex items-center gap-1.5 ${details.bgClass} ${details.textClass} ${details.borderClass} border shadow-sm`}
                    title={event.title}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${details.indicatorClass}`}></div>
                    {event.title}
                  </div>
                );
              })}
              {dayEvents.length > 3 && (
                <div className="text-[10px] font-bold text-gray-400 pl-1 mt-0.5">
                  +{dayEvents.length - 3} lainnya
                </div>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return rows;
  };

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "calendar_events"), (snap) => {
      let evts: any[] = [];
      snap.forEach(d => {
        evts.push({ id: d.id, ...d.data() });
      });
      // Sort evts
      evts.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setEvents(evts);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async (data: any) => {
    if (crudState.mode === 'create') {
      await setDoc(doc(collection(db, "calendar_events")), {
        ...data,
        createdAt: serverTimestamp()
      });
    } else if (crudState.mode === 'edit' && crudState.data?.id) {
      await updateDoc(doc(db, "calendar_events", crudState.data.id), data);
    } else if (crudState.mode === 'delete' && crudState.data?.id) {
      await deleteDoc(doc(db, "calendar_events", crudState.data.id));
    }
  };

  const getCategoryDetails = (cat: string) => {
    switch(cat?.toUpperCase()) {
      case 'AKADEMIK': return { bgClass: 'bg-blue-50', textClass: 'text-blue-700', borderClass: 'border-blue-100', indicatorClass: 'bg-blue-500', icon: BookOpen };
      case 'UJIAN': return { bgClass: 'bg-orange-50', textClass: 'text-orange-700', borderClass: 'border-orange-100', indicatorClass: 'bg-orange-500', icon: ClipboardCheck };
      case 'LIBUR': return { bgClass: 'bg-red-50', textClass: 'text-red-700', borderClass: 'border-red-100', indicatorClass: 'bg-red-500', icon: Sun };
      case 'EVENT': return { bgClass: 'bg-green-50', textClass: 'text-green-700', borderClass: 'border-green-100', indicatorClass: 'bg-green-500', icon: Sparkles };
      case 'EKSKUL': return { bgClass: 'bg-purple-50', textClass: 'text-purple-700', borderClass: 'border-purple-100', indicatorClass: 'bg-purple-500', icon: Flag };
      default: return { bgClass: 'bg-gray-50', textClass: 'text-gray-700', borderClass: 'border-gray-200', indicatorClass: 'bg-gray-400', icon: CalendarIcon };
    }
  };

  return (
    <div className="p-8 pb-12 max-w-[1600px] mx-auto w-full h-full flex flex-col space-y-6">
      
      <CrudSheet 
        open={crudState.open}
        onOpenChange={(open) => setCrudState({ ...crudState, open })}
        mode={crudState.mode}
        entityName="Agenda"
        initialData={crudState.data}
        onSubmit={handleSave}
        fields={[
          { name: "title", label: "Judul Agenda", placeholder: "Contoh: Ujian Tengah Semester", type: "text" },
          { name: "date", label: "Tanggal", type: "date" },
          { name: "category", label: "Kategori", type: "select", options: [
            { label: "Akademik", value: "AKADEMIK" },
            { label: "Ujian", value: "UJIAN" },
            { label: "Libur Nasional", value: "LIBUR" },
            { label: "Event Sekolah", value: "EVENT" },
            { label: "Ekstrakurikuler", value: "EKSKUL" },
            { label: "Lainnya", value: "LAINNYA" }
          ]},
          { name: "desc", label: "Keterangan Tambahan", placeholder: "Opsional...", type: "text" },
        ]}
      />

      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Kalender Akademik</h1>
          <p className="text-gray-500 text-[14px]">Kelola jadwal, ujian, libur, dan event sekolah dalam satu tampilan.</p>
        </div>
        <div className="flex items-center gap-3">
           <button className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-[13px] px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2">
             <Download className="w-4 h-4" />
             Export Kalender
           </button>
           <button 
             onClick={() => setCrudState({ open: true, mode: "create" })}
             className="bg-[#531FFF] text-white hover:bg-[#4314E5] font-bold text-[13px] px-4 py-2.5 rounded-xl shadow-[0_4px_20px_-4px_rgba(83,31,255,0.4)] hover:shadow-[0_4px_25px_-4px_rgba(83,31,255,0.5)] transition-all flex items-center gap-2">
             <Plus className="w-4 h-4" />
             Tambah Agenda
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
             {/* Timeline Card */}
             <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] p-6 flex flex-col justify-between h-full">
               <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-3">
                   <h2 className="text-[16px] font-bold text-gray-900">Agenda Mendatang</h2>
                   <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded text-[10px] font-bold">{currentSemester}</span>
                 </div>
                 <button className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600">
                   <ChevronRight className="w-4 h-4" />
                 </button>
               </div>
               
               <div className="relative pt-4 pb-2 flex-1">
                 <div className="absolute top-[21px] left-0 right-0 h-[2px] bg-gray-100 rounded-full z-0"></div>
                 
                 <div className="flex justify-between relative z-10">
                   {upcomingEvents.length === 0 ? (
                     <div className="text-sm text-gray-500 text-center w-full py-4">Tidak ada agenda mendatang</div>
                   ) : upcomingEvents.map((evt, idx) => (
                    <div key={evt.id || idx} className="flex flex-col items-center gap-3 relative flex-1 max-w-[80px]">
                      <div className={`w-3 h-3 rounded-full ${idx === 0 ? 'bg-[#531FFF] ring-4 ring-[#531FFF]/20' : 'bg-gray-300 ring-4 ring-white'} z-10`}></div>
                      <div className="text-center px-1">
                        <p className="text-[10px] font-semibold text-gray-500 mb-1 capitalize">{format(new Date(evt.date), 'MMM yyyy', { locale: idLocale })}</p>
                        <p className="text-[12px] font-bold text-gray-900 leading-tight line-clamp-2" title={evt.title}>{evt.title}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{format(new Date(evt.date), 'dd MMM', { locale: idLocale })}</p>
                      </div>
                    </div>
                   ))}
                 </div>
               </div>
             </div>

             {/* Progress Card */}
             <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] p-6 flex flex-col justify-between h-full">
               <h2 className="text-[16px] font-bold text-gray-900 mb-6">Progress Tahun Ajaran {academicYearText}</h2>
               <div className="flex items-center gap-8">
                  <div className="w-[120px] h-[120px] relative shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[{ value: progressPercent }, { value: 100 - progressPercent }]}
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
                      <span className="text-2xl font-bold text-gray-900 leading-none">{progressPercent}%</span>
                      <span className="text-[10px] font-medium text-gray-500">Berjalan</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                     <div>
                       <p className="text-[11px] font-medium text-gray-500 mb-0.5">Hari Berjalan</p>
                       <p className="text-[14px] font-bold text-gray-900">{passedDays} Hari</p>
                     </div>
                     <div>
                       <p className="text-[11px] font-medium text-gray-500 mb-0.5">Sisa Hari</p>
                       <p className="text-[14px] font-bold text-gray-900">{totalDays - passedDays} Hari</p>
                     </div>
                     <div>
                       <p className="text-[11px] font-medium text-gray-500 mb-0.5">Semester</p>
                       <p className="text-[14px] font-bold text-gray-900">{currentSemester}</p>
                     </div>
                  </div>
               </div>
               <p className="text-[10px] text-gray-400 mt-4 pt-4 border-t border-gray-100">Periode: {format(academicYearStart, 'dd MMM yyyy', { locale: idLocale })} - {format(academicYearEnd, 'dd MMM yyyy', { locale: idLocale })}</p>
             </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1">
        
        {/* Main Content (Left) */}
        <div className="flex-1 space-y-6 flex flex-col">
          {/* Calendar Card */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] p-6">
            
            {/* Calendar Header */}
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center bg-gray-50 border border-gray-100 rounded-lg p-1">
                  <button onClick={prevMonth} className="p-1 px-2.5 hover:bg-white rounded shadow-sm text-gray-500 hover:text-gray-900 transition-all font-semibold">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={nextMonth} className="p-1 px-2.5 hover:bg-white rounded shadow-sm text-gray-500 hover:text-gray-900 transition-all font-semibold">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <button onClick={goToToday} className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
                  Today
                </button>
              </div>
              <h2 className="text-xl font-bold text-gray-900 capitalize">{format(currentDate, 'MMMM yyyy', { locale: idLocale })}</h2>
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
            <div className="border-t border-l border-gray-100 rounded-xl overflow-hidden">
              <div className="grid grid-cols-7 bg-gray-50/50 border-b border-gray-100">
                {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((day) => (
                  <div key={day} className="py-3 text-center text-[12px] font-bold text-gray-500 border-r border-gray-100">
                    {day}
                  </div>
                ))}
              </div>
              {renderCalendarCells()}
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
               {loading ? (
                 <div className="text-center py-4 text-gray-500 text-sm">Memuat data...</div>
               ) : upcomingEvents.length === 0 ? (
                 <div className="text-center py-4 text-gray-500 text-sm">Belum ada agenda</div>
               ) : upcomingEvents.map((event, idx) => {
                 const details = getCategoryDetails(event.category);
                 const Icon = details.icon;
                 return (
                 <div key={event.id || idx} className="flex gap-4 group items-center">
                   <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${details.bgClass} ${details.borderClass}`}>
                     <Icon className={`w-5 h-5 ${details.textClass}`} />
                   </div>
                   <div className="flex-1 min-w-0 flex flex-col justify-center">
                     <h3 className="text-[13px] font-bold text-gray-900 leading-tight mb-1 truncate">{event.title}</h3>
                     <p className="text-[11px] text-gray-500">{format(new Date(event.date), 'dd MMMM yyyy', { locale: idLocale })}</p>
                   </div>
                   <div className="shrink-0 flex items-center gap-2">
                      <button 
                         onClick={() => setCrudState({ open: true, mode: "edit", data: event })}
                         className="p-2 text-gray-400 hover:text-[#531FFF] hover:bg-[#531FFF]/10 rounded-lg transition-colors" title="Edit">
                        <PenTool className="w-3.5 h-3.5" />
                      </button>
                      <button 
                         onClick={() => setCrudState({ open: true, mode: "delete", data: event })}
                         className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                   </div>
                 </div>
                 );
               })}
            </div>
            <button className="w-full mt-6 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold text-[13px] rounded-xl transition-colors">
              Lihat Agenda Lengkap
            </button>
          </div>

          {/* Mini Stats / Analytics */}
          <div className="bg-[#531FFF] rounded-3xl shadow-sm p-6 relative overflow-hidden text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-[100px] pointer-events-none"></div>
            
            <h2 className="text-[16px] font-bold mb-1 relative z-10">Total Agenda</h2>
            <p className="text-[13px] text-white/70 font-medium mb-6 relative z-10">Semester Ini</p>
            
            <div className="flex items-end gap-3 mb-6 relative z-10">
              <span className="text-5xl font-extrabold tracking-tight">{events.length}</span>
              <span className="text-[13px] font-bold text-white/80 bg-white/10 px-2 py-1 rounded-lg pb-1.5">+3 bulan ini</span>
            </div>
            
            <div className="space-y-3 relative z-10">
              <div className="flex justify-between items-center text-[12px]">
                <div className="flex items-center gap-2 font-medium">
                  <div className="w-2 h-2 rounded-full bg-blue-300"></div>
                  Akademik
                </div>
                <span className="font-bold">{events.filter(e => e.category === 'AKADEMIK').length}</span>
              </div>
              <div className="flex justify-between items-center text-[12px]">
                <div className="flex items-center gap-2 font-medium">
                  <div className="w-2 h-2 rounded-full bg-green-300"></div>
                  Event Sekolah
                </div>
                <span className="font-bold">{events.filter(e => e.category === 'EVENT').length}</span>
              </div>
              <div className="flex justify-between items-center text-[12px]">
                <div className="flex items-center gap-2 font-medium">
                  <div className="w-2 h-2 rounded-full bg-orange-300"></div>
                  Ujian & Tes
                </div>
                <span className="font-bold">{events.filter(e => e.category === 'UJIAN').length}</span>
              </div>
            </div>
            
            <button className="w-full mt-6 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-[13px] rounded-xl transition-colors border border-white/10">
              Download Laporan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
