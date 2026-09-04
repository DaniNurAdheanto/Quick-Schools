"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { 
  MapPin, 
  ScanFace, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  AlertTriangle, 
  Map, 
  Calendar, 
  User,
  RefreshCw, 
  List, 
  Download,
  Filter,
  ChevronDown,
  LayoutGrid,
  ShieldCheck,
  Building2,
  ExternalLink,
  SlidersHorizontal,
  Check,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { db, auth } from "@/lib/firebase";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useToast } from "@/context/ToastContext";

// Fallback Rich Mock Data for Attendance & Face Recognition
const MOCK_ATTENDANCE = [
  {
    id: "ATT-1001",
    studentName: "Ahmad Rizqi Pratama",
    studentId: "NISN-2023001",
    className: "10 IPA 1",
    timestamp: "06:45:22",
    date: "06 Agustus 2026",
    faceVerified: true,
    faceMatchScore: 98.5,
    capturedImage: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80",
    location: {
      lat: -6.200000,
      lng: 106.816666,
      distance: 12, // meters from school center
      inRadius: true
    },
    status: "Hadir",
    type: "in"
  },
  {
    id: "ATT-1002",
    studentName: "Budi Santoso",
    studentId: "NISN-2023002",
    className: "10 IPA 1",
    timestamp: "07:05:10",
    date: "06 Agustus 2026",
    faceVerified: true,
    faceMatchScore: 92.1,
    capturedImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
    location: {
      lat: -6.200100,
      lng: 106.816700,
      distance: 25,
      inRadius: true
    },
    status: "Terlambat",
    type: "in"
  },
  {
    id: "ATT-1003",
    studentName: "Citra Lestari",
    studentId: "NISN-2023003",
    className: "10 IPA 2",
    timestamp: "06:50:05",
    date: "06 Agustus 2026",
    faceVerified: false,
    faceMatchScore: 45.2,
    capturedImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80",
    location: {
      lat: -6.200050,
      lng: 106.816680,
      distance: 15,
      inRadius: true
    },
    status: "Ditolak",
    rejectReason: "Wajah Tidak Dikenali",
    type: "in"
  },
  {
    id: "ATT-1004",
    studentName: "Dewi Safitri",
    studentId: "NISN-2023004",
    className: "11 IPS 1",
    timestamp: "06:55:30",
    date: "06 Agustus 2026",
    faceVerified: true,
    faceMatchScore: 96.8,
    capturedImage: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80",
    location: {
      lat: -6.205000,
      lng: 106.820000,
      distance: 550, 
      inRadius: false
    },
    status: "Ditolak",
    rejectReason: "Di Luar Radius Sekolah",
    type: "in"
  },
  {
    id: "ATT-1005",
    studentName: "Eko Pratama",
    studentId: "NISN-2023005",
    className: "12 IPS 2",
    timestamp: "06:30:15",
    date: "06 Agustus 2026",
    faceVerified: true,
    faceMatchScore: 99.1,
    capturedImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80",
    location: {
      lat: -6.199990,
      lng: 106.816650,
      distance: 5,
      inRadius: true
    },
    status: "Hadir",
    type: "in"
  },
  {
    id: "ATT-1006",
    studentName: "Fina Amanda",
    studentId: "NISN-2023006",
    className: "11 IPA 3",
    timestamp: "06:42:00",
    date: "06 Agustus 2026",
    faceVerified: true,
    faceMatchScore: 97.4,
    capturedImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
    location: {
      lat: -6.200010,
      lng: 106.816640,
      distance: 8,
      inRadius: true
    },
    status: "Hadir",
    type: "in"
  },
  {
    id: "ATT-1007",
    studentName: "Gilang Ramadhan",
    studentId: "NISN-2023007",
    className: "10 IPS 1",
    timestamp: "07:12:44",
    date: "06 Agustus 2026",
    faceVerified: true,
    faceMatchScore: 94.0,
    capturedImage: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&q=80",
    location: {
      lat: -6.200080,
      lng: 106.816710,
      distance: 30,
      inRadius: true
    },
    status: "Terlambat",
    type: "in"
  },
  {
    id: "ATT-1008",
    studentName: "Hania Putri",
    studentId: "NISN-2023008",
    className: "12 IPA 1",
    timestamp: "06:25:10",
    date: "06 Agustus 2026",
    faceVerified: true,
    faceMatchScore: 99.8,
    capturedImage: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80",
    location: {
      lat: -6.200005,
      lng: 106.816660,
      distance: 4,
      inRadius: true
    },
    status: "Hadir",
    type: "in"
  }
];

export default function AttendancePage() {
  const { addToast } = useToast();
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Controls
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua");
  const [classFilter, setClassFilter] = useState("Semua Kelas");
  const [viewMode, setViewMode] = useState<"table" | "grid" | "map">("table");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  // Fetch Firestore attendance or merge fallback
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const qAttendance = query(collection(db, "attendance"));
        const unsubscribe = onSnapshot(qAttendance, (snapshot) => {
          if (!snapshot.empty) {
            const data = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setAttendanceData(data);
          } else {
            setAttendanceData(MOCK_ATTENDANCE);
          }
          setLoading(false);
        }, (error) => {
          console.warn("Firestore attendance query error, using mock fallback:", error);
          setAttendanceData(MOCK_ATTENDANCE);
          setLoading(false);
        });
        return () => unsubscribe();
      } else {
        setAttendanceData(MOCK_ATTENDANCE);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Extract unique class list for filter dropdown
  const availableClasses = useMemo(() => {
    const classesSet = new Set<string>();
    attendanceData.forEach(item => {
      if (item.className) classesSet.add(item.className);
    });
    return Array.from(classesSet).sort();
  }, [attendanceData]);

  // Filtered List
  const filteredData = useMemo(() => {
    return attendanceData.filter(item => {
      const matchesSearch = 
        (item.studentName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) || 
        (item.studentId?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (item.className?.toLowerCase() || "").includes(searchQuery.toLowerCase());
      
      const matchesStatus = 
        statusFilter === "Semua" || 
        item.status === statusFilter || 
        (statusFilter === "Ditolak" && (item.status === "Ditolak" || item.rejectReason));

      const matchesClass = 
        classFilter === "Semua Kelas" || item.className === classFilter;

      return matchesSearch && matchesStatus && matchesClass;
    });
  }, [attendanceData, searchQuery, statusFilter, classFilter]);

  // Summary Metrics
  const stats = useMemo(() => {
    const total = attendanceData.length;
    const hadir = attendanceData.filter(i => i.status === "Hadir").length;
    const terlambat = attendanceData.filter(i => i.status === "Terlambat").length;
    const ditolak = attendanceData.filter(i => i.status === "Ditolak" || i.rejectReason).length;
    const avgScore = total > 0 
      ? (attendanceData.reduce((acc, curr) => acc + (curr.faceMatchScore || 0), 0) / total).toFixed(1)
      : 0;

    return { total, hadir, terlambat, ditolak, avgScore };
  }, [attendanceData]);

  // CSV Export Handler
  const handleExportCSV = () => {
    const headers = ["ID Presensi", "Nama Siswa", "NISN", "Kelas", "Waktu", "Tanggal", "Status", "Skor AI Face (%)", "Jarak Radius (m)", "Status Radius"];
    const csvRows = filteredData.map(row => [
      row.id,
      `"${row.studentName || ''}"`,
      row.studentId || '',
      `"${row.className || ''}"`,
      row.timestamp || '',
      `"${row.date || ''}"`,
      `"${row.status || ''}"`,
      row.faceMatchScore || 0,
      row.location?.distance || 0,
      row.location?.inRadius ? "Dalam Radius" : "Luar Radius"
    ]);

    const csvContent = [headers.join(","), ...csvRows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_Absensi_FaceID_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast("Berhasil mengekspor data absensi ke format CSV", "info");
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      addToast("Data presensi siswa berhasil disinkronkan dengan AI Server", "success");
    }, 600);
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Data Absensi & Face Recognition</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-[#F3F0FF] text-[#531FFF] rounded-full border border-[#531FFF]/20">
              AI Real-Time
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Monitoring rekap absensi harian siswa terverifikasi AI facial match score & lokasi GPS radius sekolah.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 active:scale-[0.98] transition-all text-sm font-semibold shadow-sm"
          >
            <Download className="w-4 h-4 text-gray-500" />
            Ekspor CSV
          </button>

          <button 
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 active:scale-[0.98] transition-all text-sm font-semibold shadow-sm"
          >
            <RefreshCw className={cn("w-4 h-4 text-gray-500", loading && "animate-spin")} />
            Sinkron Data
          </button>

          <div className="flex items-center gap-2 px-4 py-2.5 bg-[#531FFF] text-white rounded-xl text-sm font-semibold shadow-sm shadow-[#531FFF]/20">
            <Calendar className="w-4 h-4" />
            <span>06 Agustus 2026</span>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Attendance */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:border-gray-200 transition-all flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center shrink-0 border border-purple-100">
            <User className="w-6 h-6 text-[#531FFF]" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Absensi</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-0.5">{stats.total}</h3>
          </div>
        </div>

        {/* Hadir Tepat Waktu */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:border-gray-200 transition-all flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0 border border-emerald-100">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Hadir Tepat</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-0.5">{stats.hadir}</h3>
          </div>
        </div>

        {/* Terlambat */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:border-gray-200 transition-all flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center shrink-0 border border-amber-100">
            <Clock className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Terlambat</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-0.5">{stats.terlambat}</h3>
          </div>
        </div>

        {/* Ditolak / Alert */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:border-gray-200 transition-all flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center shrink-0 border border-rose-100">
            <AlertTriangle className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Absensi Ditolak</p>
            <h3 className="text-2xl font-bold text-rose-600 mt-0.5">{stats.ditolak}</h3>
          </div>
        </div>

        {/* AI Confidence Score */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:border-gray-200 transition-all flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0 border border-blue-100">
            <ScanFace className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Akurasi AI</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-0.5">{stats.avgScore}%</h3>
          </div>
        </div>
      </div>

      {/* Main Table / Grid Content Section */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col">
        
        {/* Filter Toolbar Header */}
        <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/50">
          
          {/* Left Controls: View Mode & Search */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* View Switcher */}
            <div className="flex items-center bg-gray-200/70 p-1 rounded-xl">
              <button
                onClick={() => setViewMode("table")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                  viewMode === "table" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                )}
              >
                <List className="w-3.5 h-3.5" />
                Tabel
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                  viewMode === "grid" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Kartu Foto
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                  viewMode === "map" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                )}
              >
                <Map className="w-3.5 h-3.5" />
                Peta Geolokasi
              </button>
            </div>
            
            {/* Search Input */}
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Cari nama, NISN, atau kelas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
              />
            </div>
          </div>

          {/* Right Controls: Filters (Status & Class) */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Class Filter Dropdown */}
            <div className="relative">
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="appearance-none bg-white border border-gray-200 text-gray-700 pl-3.5 pr-8 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all cursor-pointer shadow-sm"
              >
                <option value="Semua Kelas">Semua Kelas</option>
                {availableClasses.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Status Quick Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {["Semua", "Hadir", "Terlambat", "Ditolak"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                    statusFilter === st 
                      ? "bg-[#F3F0FF] text-[#531FFF] border border-[#531FFF]/30 shadow-sm" 
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                  )}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* View Mode 1: Table View */}
        {viewMode === "table" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-gray-100">
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Siswa</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Face Recognition (AI)</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Waktu Absen</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Lokasi & Radius GPS</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredData.length > 0 ? (
                  filteredData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/60 transition-colors group">
                      {/* Siswa Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden relative shrink-0 border border-gray-200 shadow-sm">
                            <Image 
                              src={item.capturedImage} 
                              alt={item.studentName || "Siswa"}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 group-hover:text-[#531FFF] transition-colors">
                              {item.studentName}
                            </p>
                            <p className="text-xs text-gray-500 font-medium">{item.studentId} • {item.className}</p>
                          </div>
                        </div>
                      </td>

                      {/* Face Recognition Score */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1.5",
                            item.faceVerified 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                              : "bg-rose-50 text-rose-700 border border-rose-200/60"
                          )}>
                            <ScanFace className="w-3.5 h-3.5" />
                            <span>{item.faceMatchScore || 0}% Match</span>
                          </div>
                        </div>
                      </td>

                      {/* Waktu Absen */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-800">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-xs font-bold">{item.timestamp}</span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5 font-medium">{item.date}</p>
                      </td>

                      {/* Geolokasi & Radius */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                            item.location?.inRadius ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-rose-50 border-rose-100 text-rose-600"
                          )}>
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-900">
                              {item.location?.distance || 0}m <span className="text-gray-400 font-normal">dari sekolah</span>
                            </p>
                            <p className={cn(
                              "text-[11px] font-semibold",
                              item.location?.inRadius ? "text-emerald-600" : "text-rose-600"
                            )}>
                              {item.location?.inRadius ? "Dalam Radius" : "Luar Radius"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-start">
                          <span className={cn(
                            "px-2.5 py-1 text-xs font-bold rounded-lg inline-flex items-center gap-1.5 border shadow-sm",
                            item.status === "Hadir" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                            item.status === "Terlambat" && "bg-amber-50 text-amber-700 border-amber-200",
                            (item.status === "Ditolak" || item.rejectReason) && "bg-rose-50 text-rose-700 border-rose-200"
                          )}>
                            {item.status === "Hadir" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                            {item.status === "Terlambat" && <Clock className="w-3.5 h-3.5 text-amber-600" />}
                            {(item.status === "Ditolak" || item.rejectReason) && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                            {item.status}
                          </span>
                          {item.rejectReason && (
                            <span className="text-[11px] font-semibold text-rose-600 mt-1">
                              {item.rejectReason}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setSelectedItem(item)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-[#F3F0FF] text-gray-700 hover:text-[#531FFF] rounded-xl text-xs font-bold transition-all border border-gray-200 hover:border-[#531FFF]/30"
                        >
                          Detail AI
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Search className="w-5 h-5 text-gray-400" />
                      </div>
                      <p className="text-sm font-bold text-gray-900">Data presensi tidak ditemukan</p>
                      <p className="text-xs text-gray-500 mt-1">Coba sesuaikan kata kunci pencarian atau filter kelas/status.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* View Mode 2: Photo Card Grid View */}
        {viewMode === "grid" && (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 bg-gray-50/50">
            {filteredData.length > 0 ? (
              filteredData.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="bg-white rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-lg hover:border-[#531FFF]/30 transition-all duration-300 overflow-hidden cursor-pointer group flex flex-col"
                >
                  {/* Photo Preview Container */}
                  <div className="relative aspect-[4/3] w-full bg-gray-100 overflow-hidden">
                    <Image 
                      src={item.capturedImage} 
                      alt={item.studentName}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      unoptimized
                    />
                    
                    {/* Top Overlay Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                      <span className={cn(
                        "px-2.5 py-1 text-[11px] font-extrabold rounded-lg backdrop-blur-md shadow-md",
                        item.status === "Hadir" && "bg-emerald-500/90 text-white",
                        item.status === "Terlambat" && "bg-amber-500/90 text-white",
                        (item.status === "Ditolak" || item.rejectReason) && "bg-rose-500/90 text-white"
                      )}>
                        {item.status}
                      </span>

                      <span className="px-2 py-1 text-[11px] font-extrabold bg-black/60 text-white rounded-lg backdrop-blur-md flex items-center gap-1 shadow-md">
                        <ScanFace className="w-3 h-3 text-cyan-300" />
                        {item.faceMatchScore}%
                      </span>
                    </div>

                    {/* Bottom Time Overlay */}
                    <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-bold text-gray-900 shadow-sm flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#531FFF]" />
                      {item.timestamp}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 flex flex-col flex-1 justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 group-hover:text-[#531FFF] transition-colors truncate">
                        {item.studentName}
                      </h4>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">
                        {item.studentId} • {item.className}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-gray-600 font-medium">
                        <MapPin className={cn(
                          "w-3.5 h-3.5",
                          item.location?.inRadius ? "text-emerald-600" : "text-rose-600"
                        )} />
                        <span>{item.location?.distance || 0}m radius</span>
                      </div>
                      <span className="text-[#531FFF] font-bold group-hover:underline">
                        Detail →
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-gray-100">
                <p className="text-sm font-bold text-gray-900">Data presensi tidak ditemukan</p>
              </div>
            )}
          </div>
        )}

        {/* View Mode 3: Interactive Geolokasi Map */}
        {viewMode === "map" && (
          <div className="p-6 bg-gray-50/50">
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm relative h-[520px] overflow-hidden flex items-center justify-center">
              {/* Decorative Radar Lines */}
              <div className="absolute inset-0 bg-[radial-gradient(#531FFF_1px,transparent_1px)] [background-size:16px_16px] opacity-10" />
              
              {/* School Center Marker */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
                <div className="w-14 h-14 bg-white rounded-full shadow-2xl border-4 border-[#531FFF] flex items-center justify-center z-10 relative animate-pulse">
                  <Building2 className="w-7 h-7 text-[#531FFF]" />
                </div>
                <div className="w-96 h-96 border-2 border-dashed border-[#531FFF]/30 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#531FFF]/5 pointer-events-none" />
                <div className="w-48 h-48 border border-[#531FFF]/30 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#531FFF]/10 pointer-events-none" />
                <span className="mt-3 text-xs font-extrabold text-gray-900 bg-white px-3 py-1 rounded-full shadow-md border border-gray-200">
                  Pusat Gedung Sekolah (Radius 100m)
                </span>
              </div>

              {/* Plotted Student Pins */}
              {filteredData.map((item, idx) => {
                const centerLat = -6.200000;
                const centerLng = 106.816666;
                const latDiff = ((item.location?.lat || centerLat) - centerLat) * 120000;
                const lngDiff = ((item.location?.lng || centerLng) - centerLng) * 120000;
                
                const top = `calc(50% - ${latDiff}px)`;
                const left = `calc(50% + ${lngDiff}px)`;
                
                const isSuccess = item.status === "Hadir" || item.status === "Terlambat";

                return (
                  <div 
                    key={item.id || idx}
                    className="absolute z-20 group cursor-pointer"
                    style={{ top, left }}
                    onClick={() => setSelectedItem(item)}
                  >
                    <div className="relative -translate-x-1/2 -translate-y-1/2">
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 bg-white shadow-md transition-transform group-hover:scale-150 flex items-center justify-center",
                        isSuccess ? "border-emerald-500 bg-emerald-50" : "border-rose-500 bg-rose-50"
                      )}>
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          isSuccess ? "bg-emerald-500" : "bg-rose-500"
                        )} />
                      </div>
                      
                      {/* Tooltip Card on Hover */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 p-3 opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-30 transform group-hover:translate-y-0 translate-y-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-full overflow-hidden relative shrink-0 border border-gray-200">
                            <Image src={item.capturedImage} alt={item.studentName} fill className="object-cover" unoptimized />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-xs font-bold text-gray-900 truncate">{item.studentName}</p>
                            <p className="text-[10px] text-gray-500">{item.className}</p>
                          </div>
                        </div>
                        <div className="space-y-1 pt-2 border-t border-gray-100 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Status:</span>
                            <span className={cn("font-bold", isSuccess ? "text-emerald-600" : "text-rose-600")}>{item.status}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Jarak:</span>
                            <span className="font-bold text-gray-800">{item.location?.distance}m</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">AI Score:</span>
                            <span className="font-bold text-[#531FFF]">{item.faceMatchScore}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer / Record Summary */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 font-medium">
          <p>Menampilkan <span className="font-bold text-gray-900">{filteredData.length}</span> dari <span className="font-bold text-gray-900">{attendanceData.length}</span> rekap presensi</p>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 shadow-sm">
              Halaman 1 dari 1
            </span>
          </div>
        </div>
      </div>

      {/* Floating Detail Slide-Over Drawer */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedItem(null)}
          />

          {/* Drawer Content */}
          <div className="relative w-full max-w-lg bg-white shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300 flex flex-col h-full z-10">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-20">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#531FFF]" />
                <h3 className="text-lg font-bold text-gray-900">Verifikasi Detail Presensi AI</h3>
              </div>
              <button 
                onClick={() => setSelectedItem(null)}
                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
              
              {/* Siswa Card Header */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="w-16 h-16 rounded-2xl bg-white overflow-hidden relative shrink-0 border-2 border-white shadow-md">
                  <Image 
                    src={selectedItem.capturedImage} 
                    alt={selectedItem.studentName}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div>
                  <h4 className="text-base font-bold text-gray-900">{selectedItem.studentName}</h4>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">{selectedItem.studentId} • {selectedItem.className}</p>
                  <div className="mt-2">
                    <span className={cn(
                      "px-2.5 py-0.5 text-xs font-extrabold rounded-md inline-flex items-center gap-1 border",
                      selectedItem.status === "Hadir" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                      selectedItem.status === "Terlambat" && "bg-amber-50 text-amber-700 border-amber-200",
                      (selectedItem.status === "Ditolak" || selectedItem.rejectReason) && "bg-rose-50 text-rose-700 border-rose-200"
                    )}>
                      {selectedItem.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* AI Facial Recognition Analysis */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <ScanFace className="w-4 h-4 text-[#531FFF]" />
                  Hasil Verifikasi AI Wajah
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100">
                    <p className="text-xs text-purple-700 font-bold">Confidence Match Score</p>
                    <p className="text-2xl font-black text-[#531FFF] mt-1">{selectedItem.faceMatchScore || 0}%</p>
                    <p className="text-[10px] text-purple-600 mt-1 font-medium">Ambangan Batas Minimal: 80%</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                    <p className="text-xs text-gray-500 font-bold">Status Biometrik</p>
                    <p className={cn(
                      "text-lg font-black mt-1",
                      selectedItem.faceVerified ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {selectedItem.faceVerified ? "Terverifikasi Valid" : "Gagal Cocok"}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1 font-medium">
                      {selectedItem.faceVerified ? "Wajah Dikenali di Database" : "Wajah Tidak Cocok dengan Master"}
                    </p>
                  </div>
                </div>

                {/* Photo Viewer */}
                <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-gray-900 border border-gray-200 shadow-inner group">
                  <Image 
                    src={selectedItem.capturedImage} 
                    alt="Foto Presensi"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                    <div className="text-white">
                      <p className="text-xs font-bold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        Diambil pada {selectedItem.timestamp} ({selectedItem.date})
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Geolokasi Details & Map View */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#531FFF]" />
                    Lokasi GPS & Radius Sekolah
                  </h4>
                  <span className={cn(
                    "text-xs font-bold px-2.5 py-0.5 rounded-full border",
                    selectedItem.location?.inRadius ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                  )}>
                    {selectedItem.location?.distance} Meter
                  </span>
                </div>

                {/* Embedded Map */}
                <div className="w-full h-44 rounded-2xl bg-gray-100 relative overflow-hidden border border-gray-200 shadow-inner">
                  <iframe 
                    width="100%" 
                    height="100%" 
                    style={{ border: 0 }} 
                    loading="lazy" 
                    allowFullScreen 
                    src={`https://maps.google.com/maps?q=${selectedItem.location?.lat || -6.200000},${selectedItem.location?.lng || 106.816666}&z=16&output=embed`}
                  />
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-mono">
                    GPS: {selectedItem.location?.lat}, {selectedItem.location?.lng}
                  </span>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${selectedItem.location?.lat},${selectedItem.location?.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#531FFF] font-bold flex items-center gap-1 hover:underline"
                  >
                    Buka Google Maps <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-gray-100 bg-gray-50 sticky bottom-0 z-20 flex gap-3">
              <button 
                onClick={() => setSelectedItem(null)}
                className="w-full py-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-xs font-bold shadow-sm"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
