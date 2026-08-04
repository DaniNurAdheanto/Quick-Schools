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
  LineChart,
  Line,
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
  parseISO,
  isToday
} from 'date-fns';
import { id as idLocale } from 'date-fns/locale';


import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

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

export default function CalendarPage() {
  const [crudState, setCrudState] = useState<{ open: boolean; mode: "create" | "edit" | "delete"; data?: any }>({
    open: false,
    mode: "create"
  });
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

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
            key={day.toISOString()} 
            className={`p-2 border-b border-r border-gray-100 min-h-[96px] cursor-pointer hover:bg-gray-50 transition-colors ${!isSameMonth(day, monthStart) ? 'bg-gray-50/30' : ''}`}
            onClick={() => {
              setCrudState({ open: true, mode: 'create', data: { date: format(cloneDay, 'yyyy-MM-dd') } });
            }}
          >
            <div className="flex justify-between items-start mb-1">
              <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${
                isSameDay(day, new Date()) ? 'bg-[#531FFF] text-white' :
                !isSameMonth(day, monthStart) ? 'text-gray-400' :
                (i === 6) ? 'text-red-500' : 'text-gray-900'
              }`}>
                {formattedDate}
              </span>
            </div>
            <div className="mt-1 space-y-1">
              {dayEvents.map((evt, idx) => {
                const details = getCategoryDetails(evt.category);
                return (
                  <div key={idx} 
                    className={`text-[10px] font-semibold px-2 py-1 rounded truncate border flex items-center gap-1.5 ${details.bgClass} ${details.textClass} ${details.borderClass}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCrudState({ open: true, mode: 'edit', data: evt });
                    }}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${details.bgClass.replace('bg-', 'bg-').replace('-50', '-500')}`}></span> 
                    {evt.title}
                  </div>
                );
              })}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toISOString()}>
          {days}
        </div>
      );
      days = [];
    }
    return rows;
  };


  useEffect(() => {
    const unsub = onSnapshot(collection(db, "calendar_events"), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvents(data);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleCrudSubmit = async (data: any) => {
    try {
      if (crudState.mode === "create") {
        const id = crypto.randomUUID();
        await setDoc(doc(db, "calendar_events", id), {
          title: data.title || "Agenda Baru",
          date: data.date || "Belum ditentukan",
          category: data.category || "Akademik",
          location: data.location || "-",
          description: data.description || "-",
          time: data.time || "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else if (crudState.mode === "edit" && crudState.data?.id) {
        await updateDoc(doc(db, "calendar_events", crudState.data.id), {
          title: data.title || crudState.data.title,
          date: data.date || crudState.data.date,
          category: data.category || crudState.data.category,
          location: data.location || crudState.data.location,
          description: data.description || crudState.data.description,
          time: data.time !== undefined ? data.time : crudState.data.time,
          updatedAt: serverTimestamp()
        });
      } else if (crudState.mode === "delete" && crudState.data?.id) {
        await deleteDoc(doc(db, "calendar_events", crudState.data.id));
      }
      setCrudState({ open: false, mode: "create" });
    } catch (error) {
      console.error("Error saving agenda", error);
      alert("Terjadi kesalahan: " + (error as Error).message);
    }
  };

  const getCategoryDetails = (category: string) => {
    switch(category) {
      case 'Akademik': return { color: 'blue', icon: CalendarIcon, bgClass: 'bg-blue-50', textClass: 'text-blue-600', borderClass: 'border-blue-100' };
      case 'Ujian': return { color: 'orange', icon: ClipboardCheck, bgClass: 'bg-orange-50', textClass: 'text-orange-600', borderClass: 'border-orange-100' };
      case 'Event Sekolah': return { color: 'green', icon: Flag, bgClass: 'bg-green-50', textClass: 'text-green-600', borderClass: 'border-green-100' };
      case 'Ekstrakurikuler': return { color: 'purple', icon: BookOpen, bgClass: 'bg-purple-50', textClass: 'text-purple-600', borderClass: 'border-purple-100' };
      default: return { color: 'gray', icon: CalendarIcon, bgClass: 'bg-gray-50', textClass: 'text-gray-600', borderClass: 'border-gray-100' };
    }
  };

  const eventFields = [
    { name: "title", label: "Nama Kegiatan" },
    { name: "date", label: "Tanggal Pelaksanaan" },
    { name: "time", label: "Waktu (Opsional, cth: 07:00 - 08:00)" },
    { name: "category", label: "Kategori", type: "select", options: [
      {label: "Akademik", value: "Akademik"},
      {label: "Ujian", value: "Ujian"},
      {label: "Event Sekolah", value: "Event Sekolah"},
      {label: "Ekstrakurikuler", value: "Ekstrakurikuler"},
      {label: "Libur Nasional", value: "Libur Nasional"}
    ] },
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
        onSubmit={handleCrudSubmit}
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
            onClick={() => setCrudState({ open: true, mode: "create" })}
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
               <h3 className="text-xl font-bold text-gray-900 leading-none mb-1">{218 - events.filter(e => e.category === 'Libur Nasional').length} Hari</h3>
               <p className="text-[10px] text-gray-500">Estimasi aktif belajar</p>
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
               <h3 className="text-xl font-bold text-gray-900 leading-none mb-1">{events.filter(e => e.category === 'Libur Nasional').length} Event</h3>
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
               <h3 className="text-xl font-bold text-gray-900 leading-none mb-1">{events.filter(e => e.category === 'Ujian').length} Event</h3>
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
               <h3 className="text-xl font-bold text-gray-900 leading-none mb-1">{events.filter(e => e.category === 'Event Sekolah').length} Event</h3>
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
               <h3 className="text-xl font-bold text-gray-900 leading-none mb-1">{events.filter(e => e.category === 'Ekstrakurikuler').length} Event</h3>
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
               {loading ? (
                 <div className="text-center py-4 text-gray-500 text-sm">Memuat data...</div>
               ) : events.length === 0 ? (
                 <div className="text-center py-4 text-gray-500 text-sm">Belum ada agenda</div>
               ) : events.slice(0, 5).map((event, idx) => {
                 const details = getCategoryDetails(event.category);
                 const Icon = details.icon;
                 return (
                 <div key={event.id || idx} className="flex gap-4 group items-center">
                   <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${details.bgClass} ${details.borderClass}`}>
                     <Icon className={`w-5 h-5 ${details.textClass}`} />
                   </div>
                   <div className="flex-1 min-w-0 flex flex-col justify-center">
                     <h3 className="text-[13px] font-bold text-gray-900 leading-tight mb-1 truncate">{event.title}</h3>
                     <p className="text-[11px] text-gray-500">{event.date}</p>
                   </div>
                   <div className="shrink-0 flex items-center gap-2">
                      <span className={`px-2 py-1 text-[9px] font-bold rounded ${details.bgClass} ${details.textClass}`}>
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
               )})}
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
            <p className="text-[12px] text-gray-500 mb-6">Agenda Berdasarkan Waktu</p>
            
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-4 text-gray-500 text-sm">Memuat data...</div>
              ) : events.filter(e => e.time).length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">Tidak ada agenda hari ini</div>
              ) : events.filter(e => e.time).map((agenda, idx) => {
                 const details = getCategoryDetails(agenda.category);
                 return (
                 <div key={agenda.id || idx} className="flex items-center gap-4 group">
                    <div className="flex items-center gap-3 w-[100px] shrink-0">
                       <span className={`w-2 h-2 rounded-full shadow-sm ${details.bgClass.replace('bg-', 'bg-').replace('-50', '-500')} shadow-${details.color}-500/30`}></span>
                       <span className="text-[12px] font-semibold text-gray-600">{agenda.time}</span>
                    </div>
                    <div className="flex-1 min-w-0 group-hover:bg-gray-50 p-2 -my-2 rounded-lg transition-colors cursor-pointer flex justify-between items-center">
                       <h3 className="text-[13px] font-bold text-gray-900 truncate pr-2">{agenda.title}</h3>
                       <p className="text-[11px] font-medium text-gray-400 shrink-0">{agenda.location}</p>
                    </div>
                 </div>
              )})}
            </div>
          </div>

          {/* AI Insight */}
        </div>
      </div>
    </div>
  );
}
