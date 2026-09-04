"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, PenTool, Trash2, Loader2, Calendar, Clock, LayoutGrid, List
} from "lucide-react";
import { CrudSheet } from "@/components/layouts/crud-sheet";
import { db, auth } from "@/lib/firebase";
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<"weekly" | "daily">("weekly");
  const [selectedDay, setSelectedDay] = useState<string>("Senin");
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("All");

  const [formSubject, setFormSubject] = useState<string>("");
  const [crudState, setCrudState] = useState<{ open: boolean; mode: "create" | "edit" | "delete"; data?: any }>({
    open: false,
    mode: "create"
  });

  useEffect(() => {
    setMounted(true);
    const dayIndex = new Date().getDay();
    const dayStr = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][dayIndex];
    if (dayStr !== "Minggu") setSelectedDay(dayStr);
    // Update time every minute
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const currentDayString = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][now.getDay()];
  const currentTimeString = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');

  const isActive = (schedule: any) => {
    if (!mounted) return false;
    if (schedule.day !== currentDayString) return false;
    return currentTimeString >= schedule.startTime && currentTimeString <= schedule.endTime;
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(collection(db, "schedules"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const schedulesData = snapshot.docs.map(doc => ({
            _firestoreId: doc.id,
            ...doc.data()
          }));
          setSchedules(schedulesData);
          setLoading(false);
        }, (error) => {
          console.error("Error fetching schedules:", error);
          setLoading(false);
        });

        const unsubSubjects = onSnapshot(query(collection(db, "subjects")), (snapshot) => {
          setSubjects(snapshot.docs.map(d => ({ _firestoreId: d.id, ...d.data() })));
        });

        const unsubClasses = onSnapshot(query(collection(db, "classes")), (snapshot) => {
          setClasses(snapshot.docs.map(d => ({ _firestoreId: d.id, ...d.data() } as any)));
        });

        const unsubTeachers = onSnapshot(query(collection(db, "teachers")), (snapshot) => {
          setTeachers(snapshot.docs.map(d => ({ _firestoreId: d.id, ...d.data() })));
        });

        return () => {
          unsubscribe();
          unsubSubjects();
          unsubClasses();
          unsubTeachers();
        };
      } else {
        setSchedules([]);
        setSubjects([]);
        setClasses([]);
        setTeachers([]);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const scheduleFields = [
    { 
      name: "day", 
      label: "Hari",
      type: "select",
      placeholder: "Pilih Hari",
      options: DAYS.map(d => ({ label: d, value: d }))
    },
    { 
      name: "class", 
      label: "Kelas",
      type: "select",
      placeholder: "Pilih Kelas",
      options: classes.map(c => ({ label: c.name, value: c.name }))
    },
    { 
      name: "subject", 
      label: "Mata Pelajaran",
      type: "select",
      placeholder: "Pilih Mata Pelajaran",
      options: subjects.map(s => ({ label: s.name, value: s.name }))
    },
    { 
      name: "teacher", 
      label: "Guru Pengajar",
      type: "select",
      placeholder: "Pilih Guru",
      options: teachers.filter(t => !formSubject || t.role === formSubject).map(t => ({ label: t.name, value: t.name }))
    },
    { name: "startTime", label: "Jam Mulai", type: "time", placeholder: "07:00" },
    { name: "endTime", label: "Jam Selesai", type: "time", placeholder: "08:30" }
  ];

  const handleCrudSubmit = async (data: any) => {
    try {
      if (crudState.mode === "create" || crudState.mode === "edit") {
        const conflict = schedules.find((s: any) => {
          if (crudState.mode === "edit" && s._firestoreId === crudState.data?._firestoreId) return false;
          if (s.day !== data.day) return false;
          if (s.teacher !== data.teacher) return false;
          if (!s.teacher || !data.teacher) return false;
          
          const newStart = data.startTime;
          const newEnd = data.endTime;
          const existingStart = s.startTime;
          const existingEnd = s.endTime;
          
          return (newStart < existingEnd && newEnd > existingStart);
        });

        if (conflict) {
          alert(`Jadwal bentrok! Guru ${data.teacher} sudah memiliki jadwal mengajar di kelas ${conflict.class} pada jam ${conflict.startTime} - ${conflict.endTime} hari ${data.day}.`);
          return;
        }
      }

      if (crudState.mode === "create") {
        await addDoc(collection(db, "schedules"), {
          day: data.day || "Senin",
          class: data.class || "",
          subject: data.subject || "",
          teacher: data.teacher || "",
          startTime: data.startTime || "",
          endTime: data.endTime || "",
          createdAt: new Date().toISOString()
        });
      } else if (crudState.mode === "edit" && crudState.data?._firestoreId) {
        const docRef = doc(db, "schedules", crudState.data._firestoreId);
        await updateDoc(docRef, {
          day: data.day || "Senin",
          class: data.class || "",
          subject: data.subject || "",
          teacher: data.teacher || "",
          startTime: data.startTime || "",
          endTime: data.endTime || "",
          updatedAt: new Date().toISOString()
        });
      } else if (crudState.mode === "delete" && crudState.data?._firestoreId) {
        await deleteDoc(doc(db, "schedules", crudState.data._firestoreId));
      }
    } catch (error) {
      console.error("Error performing CRUD operation:", error);
      alert("Terjadi kesalahan. Pastikan Anda memiliki akses.");
    }
  };

  

  return (
    <div className="p-8 max-w-full mx-auto w-full flex-1 flex flex-col h-full animate-in fade-in duration-500">
      <CrudSheet
        open={crudState.open}
        onOpenChange={(open) => !open && setCrudState(prev => ({ ...prev, open: false }))}
        mode={crudState.mode}
        entityName="Jadwal Pelajaran"
        fields={scheduleFields}
        initialData={crudState.data}
        onSubmit={handleCrudSubmit}
        onDataChange={(data) => setFormSubject(data?.subject || "")}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
        <div>
          <h1 className="text-[24px] font-extrabold text-gray-900 tracking-tight mb-1">Jadwal Pelajaran</h1>
          <p className="text-gray-500 text-[14px] font-medium">Kelola jadwal pelajaran mingguan kelas secara real-time.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
             <Clock className="w-4 h-4 text-[#531FFF]" />
             <div className="text-[13px] font-bold text-gray-700">
               {mounted ? `${currentDayString}, ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : ""}
             </div>
          </div>
          <button 
            onClick={() => setCrudState({ open: true, mode: "create", data: {} })}
            className="flex items-center gap-2 bg-[#531FFF] hover:bg-[#531FFF]/90 text-white px-5 py-2.5 rounded-xl text-[14px] font-bold shadow-sm transition-all"
          >
            <Plus className="w-5 h-5" />
            Tambah Jadwal
          </button>
        </div>
      </div>

      
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col flex-1 overflow-hidden p-6">
        <div className="flex flex-col gap-4 pb-4 mb-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
              <button
                onClick={() => setViewMode("weekly")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold transition-all ${viewMode === "weekly" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                <LayoutGrid className="w-4 h-4" />
                Mingguan
              </button>
              <button
                onClick={() => setViewMode("daily")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold transition-all ${viewMode === "daily" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                <List className="w-4 h-4" />
                Harian
              </button>
            </div>
            
            {viewMode === "daily" && (
              <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
                {DAYS.map(day => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`px-4 py-2 rounded-xl text-[13px] font-bold whitespace-nowrap transition-all ${selectedDay === day ? "bg-[#531FFF] text-white shadow-sm" : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"}`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <select 
                value={selectedClassFilter} 
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="bg-white border border-gray-200 text-gray-700 text-[13px] font-bold rounded-xl focus:ring-[#531FFF] focus:border-[#531FFF] block w-full py-2 px-4 h-[38px] shadow-sm appearance-none pr-8 cursor-pointer relative"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.5rem center',
                  backgroundSize: '1.2em 1.2em'
                }}
              >
                <option value="All">Semua Kelas</option>
                {classes.map(c => (
                  <option key={c._firestoreId || c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          
        </div>

        {loading ? (

          <div className="h-full flex flex-col items-center justify-center py-20 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin text-[#531FFF] mb-4" />
            <p className="text-sm font-medium">Memuat data jadwal...</p>
          </div>
        ) : (
          
          <>
            {viewMode === "weekly" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 h-full overflow-y-auto custom-scrollbar pr-2">
                {DAYS.map(day => (
                  <div key={day} className="flex flex-col min-h-[400px]">
                    <div className={`text-center py-3 rounded-xl mb-4 border ${mounted && day === currentDayString ? 'bg-[#531FFF] text-white border-[#531FFF]' : 'bg-gray-50 border-gray-100 text-gray-700'}`}>
                      <h3 className="font-bold text-[14px]">{day}</h3>
                    </div>
                    
                    <div className="flex-1 space-y-3">
                      {schedules
                        .filter(s => s.day === day)
                        .filter(s => selectedClassFilter === "All" || s.class === selectedClassFilter)
                        .sort((a, b) => a.startTime.localeCompare(b.startTime))
                        .map((schedule, i) => {
                          const active = isActive(schedule);
                          return (
                            <div 
                              key={schedule._firestoreId || i} 
                              className={`relative group p-4 rounded-xl border transition-all ${
                                active 
                                  ? 'bg-[#531FFF]/5 border-[#531FFF] shadow-[0_0_0_2px_rgba(83,31,255,0.1)]' 
                                  : 'bg-white border-gray-200 hover:border-[#531FFF]/30 hover:shadow-sm'
                              }`}
                            >
                              {active && (
                                <div className="absolute -top-2.5 -right-2.5">
                                  <span className="flex h-5 w-5 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#531FFF] opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-5 w-5 bg-[#531FFF] border-2 border-white items-center justify-center"></span>
                                  </span>
                                </div>
                              )}
                              <div className={`text-[12px] font-extrabold mb-1.5 ${active ? 'text-[#531FFF]' : 'text-gray-500'}`}>
                                {schedule.startTime} - {schedule.endTime}
                              </div>
                              <h4 className="font-bold text-[14px] text-gray-900 leading-tight mb-2">
                                {schedule.subject || "Kosong"}
                              </h4>
                              <div className="space-y-1">
                                <div className="text-[12px] font-medium text-gray-600 flex items-center justify-between">
                                  <span>Kelas:</span>
                                  <span className="font-bold text-gray-800">{schedule.class || "-"}</span>
                                </div>
                                <div className="text-[12px] font-medium text-gray-600 flex items-center justify-between">
                                  <span>Guru:</span>
                                  <span className="font-bold text-gray-800 truncate ml-2 text-right">{schedule.teacher || "-"}</span>
                                </div>
                              </div>
                              
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                                <button 
                                  onClick={() => setCrudState({ open: true, mode: "edit", data: schedule })}
                                  className="p-1.5 bg-white shadow-sm border border-gray-100 text-gray-500 hover:text-[#531FFF] rounded-md transition-colors" title="Edit">
                                  <PenTool className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => setCrudState({ open: true, mode: "delete", data: schedule })}
                                  className="p-1.5 bg-white shadow-sm border border-gray-100 text-gray-500 hover:text-red-500 rounded-md transition-colors" title="Hapus">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                      })}
                      {schedules.filter(s => s.day === day).filter(s => selectedClassFilter === "All" || s.class === selectedClassFilter).length === 0 && (
                        <div className="h-24 flex items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50">
                          <span className="text-[12px] font-medium text-gray-400">Kosong</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 h-full">
                <div className="max-w-3xl mx-auto h-full">
                  <div className="relative border-l-2 border-[#531FFF]/20 ml-4 md:ml-8 space-y-8 py-4">
                    {schedules
                      .filter(s => s.day === selectedDay)
                      .filter(s => selectedClassFilter === "All" || s.class === selectedClassFilter)
                      .sort((a, b) => a.startTime.localeCompare(b.startTime))
                      .map((schedule, i) => {
                        const active = isActive(schedule);
                        return (
                          <div key={schedule._firestoreId || i} className="relative pl-8 md:pl-12">
                            <div className={`absolute -left-[9px] top-4 w-4 h-4 rounded-full border-4 border-white ${active ? 'bg-red-500' : 'bg-[#531FFF]'}`}></div>
                            
                            <div className={`group p-5 rounded-2xl border transition-all ${
                              active 
                                ? 'bg-[#531FFF]/5 border-[#531FFF] shadow-[0_0_0_2px_rgba(83,31,255,0.1)]' 
                                : 'bg-white border-gray-200 hover:border-[#531FFF]/30 hover:shadow-sm'
                            }`}>
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <div className={`text-[14px] font-extrabold mb-1 ${active ? 'text-[#531FFF]' : 'text-gray-500'}`}>
                                    {schedule.startTime} - {schedule.endTime}
                                  </div>
                                  <h4 className="font-bold text-[18px] text-gray-900 leading-tight">
                                    {schedule.subject || "Kosong"}
                                  </h4>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <button onClick={() => setCrudState({ open: true, mode: "edit", data: schedule })} className="p-2 bg-white shadow-sm border border-gray-100 text-gray-500 hover:text-[#531FFF] rounded-md transition-colors" title="Edit">
                                      <PenTool className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setCrudState({ open: true, mode: "delete", data: schedule })} className="p-2 bg-white shadow-sm border border-gray-100 text-gray-500 hover:text-red-500 rounded-md transition-colors" title="Hapus">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 mt-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div>
                                  <div className="text-[12px] font-medium text-gray-500 mb-1">Kelas</div>
                                  <div className="font-bold text-gray-900">{schedule.class || "-"}</div>
                                </div>
                                <div>
                                  <div className="text-[12px] font-medium text-gray-500 mb-1">Guru Pengajar</div>
                                  <div className="font-bold text-gray-900 truncate">{schedule.teacher || "-"}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                    })}
                    
                    {schedules.filter(s => s.day === selectedDay).filter(s => selectedClassFilter === "All" || s.class === selectedClassFilter).length === 0 && (
                      <div className="pl-8 md:pl-12 py-8">
                        <div className="p-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50">
                          <Calendar className="w-10 h-10 text-gray-300 mb-3" />
                          <h3 className="text-gray-900 font-bold mb-1">Tidak ada jadwal</h3>
                          <p className="text-[13px] font-medium text-gray-500 text-center">Belum ada jadwal yang ditambahkan untuk hari {selectedDay}.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>

        )}
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #E2E8F0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #CBD5E1;
        }
      `}} />
    </div>
  );
}
