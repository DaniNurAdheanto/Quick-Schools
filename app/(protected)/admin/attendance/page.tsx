"use client";

import React, { useState } from "react";
import Image from "next/image";
import { 
  MapPin, ScanFace, CheckCircle2, XCircle, Clock, 
  Search, Filter, AlertTriangle, Map, Calendar, User,
  MoreVertical, RefreshCcw, List
} from "lucide-react";
import { cn } from "@/lib/utils";

const MOCK_ATTENDANCE = [
  {
    id: "ATT-1001",
    studentName: "Ahmad Rizqi",
    studentId: "NISN-2023001",
    className: "10 IPA 1",
    timestamp: "06:45:22",
    date: "06 Agustus 2026",
    faceVerified: true,
    faceMatchScore: 98.5,
    capturedImage: "https://picsum.photos/seed/ahmad/200/200",
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
    capturedImage: "https://picsum.photos/seed/budi/200/200",
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
    capturedImage: "https://picsum.photos/seed/citra/200/200",
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
    capturedImage: "https://picsum.photos/seed/dewi/200/200",
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
    capturedImage: "https://picsum.photos/seed/eko/200/200",
    location: {
      lat: -6.199990,
      lng: 106.816650,
      distance: 5,
      inRadius: true
    },
    status: "Hadir",
    type: "in"
  }
];

export default function AttendancePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [selectedItem, setSelectedItem] = useState<typeof MOCK_ATTENDANCE[0] | null>(null);

  const filteredData = MOCK_ATTENDANCE.filter(item => {
    const matchesSearch = item.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.studentId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "Semua" || item.status === statusFilter || (statusFilter === "Ditolak" && item.status.includes("Ditolak"));
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Data Absensi & Face Recognition</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitoring kehadiran siswa dengan verifikasi wajah (AI) dan geolokasi radius sekolah.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm">
            <RefreshCcw className="w-4 h-4" />
            Sinkronisasi Data
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#531FFF] text-white rounded-xl hover:bg-[#4314cc] transition-colors text-sm font-medium shadow-sm shadow-[#531FFF]/20">
            <Calendar className="w-4 h-4" />
            06 Agustus 2026
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
            <User className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-0.5">Total Presensi</p>
            <h3 className="text-2xl font-bold text-gray-900">452</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-0.5">Berhasil (Hadir/Telat)</p>
            <h3 className="text-2xl font-bold text-gray-900">445</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
            <MapPin className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-0.5">Di Luar Radius</p>
            <h3 className="text-2xl font-bold text-gray-900">4</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
            <ScanFace className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-0.5">Wajah Tak Dikenali</p>
            <h3 className="text-2xl font-bold text-gray-900">3</h3>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col">
        {/* Filters */}
        <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex items-center bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all",
                  viewMode === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <List className="w-4 h-4" />
                List
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all",
                  viewMode === "map" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Map className="w-4 h-4" />
                Map
              </button>
            </div>
            
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Cari nama atau NISN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF] transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {["Semua", "Hadir", "Terlambat", "Ditolak"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
                  statusFilter === status 
                    ? "bg-[#F3F0FF] text-[#531FFF] border border-[#531FFF]/20" 
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {viewMode === "list" ? (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100">
                <th className="px-6 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider">Murid</th>
                <th className="px-6 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider">Waktu Presensi</th>
                <th className="px-6 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider">Geolokasi & Radius</th>
                <th className="px-6 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredData.length > 0 ? filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden relative shrink-0 border border-gray-200">
                        <Image 
                          src={item.capturedImage} 
                          alt={item.studentName}
                          fill
                          className="object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{item.studentName}</p>
                        <p className="text-[12px] text-gray-500">{item.studentId} • {item.className}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium">{item.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5 ml-6">Masuk</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-2">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border mt-0.5",
                        item.location.inRadius ? "bg-blue-50 border-blue-100" : "bg-orange-50 border-orange-100"
                      )}>
                        <MapPin className={cn(
                          "w-4 h-4",
                          item.location.inRadius ? "text-blue-600" : "text-orange-600"
                        )} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            "text-sm font-semibold",
                            item.location.inRadius ? "text-gray-900" : "text-orange-700"
                          )}>
                            {item.location.distance}m dari pusat
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                          {item.location.lat}, {item.location.lng}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-start">
                      <span className={cn(
                        "px-2.5 py-1 text-[12px] font-bold rounded-md inline-flex items-center gap-1.5",
                        item.status === "Hadir" && "bg-green-100/80 text-green-700",
                        item.status === "Terlambat" && "bg-yellow-100/80 text-yellow-700",
                        item.status === "Ditolak" && "bg-red-100/80 text-red-700"
                      )}>
                        {item.status === "Hadir" && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {item.status === "Terlambat" && <Clock className="w-3.5 h-3.5" />}
                        {item.status === "Ditolak" && <AlertTriangle className="w-3.5 h-3.5" />}
                        {item.status}
                      </span>
                      {item.rejectReason && (
                        <span className="text-[11px] text-red-600 font-medium mt-1.5">
                          {item.rejectReason}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setSelectedItem(item)}
                      className="p-2 hover:bg-gray-100 text-[#531FFF] hover:text-[#4314cc] rounded-lg transition-colors font-medium text-sm border border-transparent hover:border-gray-200"
                    >
                      Detail
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                      <Search className="w-6 h-6 text-gray-400" />
                    </div>
                    <h3 className="text-gray-900 font-semibold mb-1">Data tidak ditemukan</h3>
                    <p className="text-gray-500 text-sm">Tidak ada data absensi yang sesuai dengan filter.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination/Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/30 flex items-center justify-between text-sm text-gray-500">
          <p>Menampilkan {filteredData.length} data absensi</p>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">
              Sebelumnya
            </button>
            <button className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
              Selanjutnya
            </button>
          </div>
        </div>
        </>
        ) : (
          <div className="p-6 bg-gray-50">
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm relative h-[500px] overflow-hidden flex items-center justify-center">
              {/* Map Grid Background */}
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5" />
              <div className="absolute inset-0 bg-gradient-to-tr from-gray-50 to-gray-100/50" />
              
              {/* Center point (School) */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
                <div className="w-12 h-12 bg-white rounded-full shadow-lg border-4 border-[#531FFF] flex items-center justify-center z-10 relative">
                  <MapPin className="w-5 h-5 text-[#531FFF]" />
                </div>
                <div className="w-96 h-96 border border-[#531FFF]/20 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#531FFF]/5" />
                <div className="w-48 h-48 border border-[#531FFF]/20 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#531FFF]/5" />
                <span className="mt-2 text-xs font-bold text-gray-700 bg-white/80 px-2 py-0.5 rounded-full shadow-sm backdrop-blur-sm">Pusat Sekolah</span>
              </div>

              {/* Plotted Students */}
              {filteredData.map(item => {
                // Calculate rough x/y offset based on lat/lng difference from center
                const centerLat = -6.200000;
                const centerLng = 106.816666;
                const latDiff = (item.location.lat - centerLat) * 100000; // scale factor
                const lngDiff = (item.location.lng - centerLng) * 100000; // scale factor
                
                // Map the scaled differences to percentages for top/left
                const top = `calc(50% - ${latDiff}px)`;
                const left = `calc(50% + ${lngDiff}px)`;
                
                const isSuccess = item.status === "Hadir" || item.status === "Terlambat";
                const isRejected = item.status.includes("Ditolak");
                
                return (
                  <div 
                    key={item.id}
                    className="absolute z-20 group"
                    style={{ top, left }}
                  >
                    <div className="relative -translate-x-1/2 -translate-y-1/2">
                      <div className={cn(
                        "w-4 h-4 rounded-full border-2 bg-white shadow-sm transition-transform group-hover:scale-125 cursor-pointer",
                        isSuccess ? "border-green-500" : isRejected ? "border-red-500" : "border-gray-500"
                      )} />
                      
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
                        <div className="flex items-center gap-2 mb-2">
                          <Image src={item.capturedImage} alt={item.studentName} width={24} height={24} className="rounded-full" referrerPolicy="no-referrer" />
                          <span className="text-sm font-semibold text-gray-900 truncate">{item.studentName}</span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] text-gray-500 flex justify-between">
                            <span>Status</span>
                            <span className={cn("font-semibold", isSuccess ? "text-green-600" : "text-red-600")}>{item.status}</span>
                          </p>
                          <p className="text-[11px] text-gray-500 flex justify-between">
                            <span>Jarak</span>
                            <span className="font-semibold text-gray-700">{item.location.distance}m</span>
                          </p>
                          <p className="text-[11px] text-gray-500 flex justify-between">
                            <span>Waktu</span>
                            <span className="font-semibold text-gray-700">{item.timestamp}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Floating Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedItem(null)}
          />
          <div className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300 flex flex-col h-full">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <h3 className="text-lg font-bold text-gray-900">Detail Presensi</h3>
              <button 
                onClick={() => setSelectedItem(null)}
                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* User Info */}
              <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
                <div className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden relative shrink-0 border-2 border-white shadow-md">
                  <Image 
                    src={selectedItem.capturedImage} 
                    alt={selectedItem.studentName}
                    fill
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900">{selectedItem.studentName}</h4>
                  <p className="text-sm text-gray-500 font-medium">{selectedItem.studentId} • {selectedItem.className}</p>
                </div>
                <div className="ml-auto">
                  <span className={cn(
                    "px-3 py-1.5 text-sm font-bold rounded-lg inline-flex items-center gap-1.5 shadow-sm",
                    selectedItem.status === "Hadir" && "bg-green-100 text-green-700 border border-green-200",
                    selectedItem.status === "Terlambat" && "bg-yellow-100 text-yellow-700 border border-yellow-200",
                    selectedItem.status === "Ditolak" && "bg-red-100 text-red-700 border border-red-200"
                  )}>
                    {selectedItem.status}
                  </span>
                </div>
              </div>

              {/* Attendance Photo Detail */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <ScanFace className="w-4 h-4 text-gray-500" />
                  Foto Presensi
                </h4>
                <div className="w-full aspect-[4/3] relative rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 shadow-inner group">
                  <Image 
                    src={selectedItem.capturedImage} 
                    alt="Foto Absensi Detail" 
                    fill 
                    className="object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer" 
                    referrerPolicy="no-referrer"
                    onClick={() => window.open(selectedItem.capturedImage, '_blank')}
                  />
                </div>
              </div>

              {/* Status Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-[#531FFF]" />
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Waktu</span>
                  </div>
                  <p className="text-xl font-black text-gray-900">{selectedItem.timestamp}</p>
                  <p className="text-sm text-gray-500 mt-1 font-medium">{selectedItem.date}</p>
                </div>
                
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-[#531FFF]" />
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Tipe</span>
                  </div>
                  <p className="text-xl font-black text-gray-900">Masuk</p>
                  <p className="text-sm text-gray-500 mt-1 font-medium">Kehadiran Harian</p>
                </div>
              </div>

              {/* Location Detail */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      Geolokasi
                    </h4>
                    <p className="text-xs text-gray-500 mt-1 font-medium">Jarak: <span className="text-gray-900 font-bold">{selectedItem.location.distance} Meter</span> dari sekolah</p>
                  </div>
                  <span className={cn(
                    "text-xs font-bold px-3 py-1 rounded-full border shadow-sm",
                    selectedItem.location.inRadius ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
                  )}>
                    {selectedItem.location.inRadius ? "Dalam Radius" : "Luar Radius"}
                  </span>
                </div>
                
                {/* Google Maps View */}
                <div className="w-full h-48 rounded-2xl bg-gray-100 relative overflow-hidden border border-gray-200 shadow-inner flex items-center justify-center">
                  <iframe 
                    width="100%" 
                    height="100%" 
                    style={{ border: 0 }} 
                    loading="lazy" 
                    allowFullScreen 
                    src={`https://maps.google.com/maps?q=${selectedItem.location.lat},${selectedItem.location.lng}&z=16&output=embed`}
                  />
                </div>

                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-600 font-mono">
                    {selectedItem.location.lat}, {selectedItem.location.lng}
                  </p>
                  {selectedItem.rejectReason && (
                    <span className="text-xs font-bold text-red-600">
                      Error: {selectedItem.rejectReason}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 bg-gray-50 mt-auto sticky bottom-0 z-10">
              <button 
                onClick={() => setSelectedItem(null)}
                className="w-full py-3.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm font-bold shadow-sm"
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
