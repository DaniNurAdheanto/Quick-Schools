"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  Stethoscope,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  ArrowRight,
  Eye,
  Filter,
  Check
} from "lucide-react";
import { cn, getTodayDateString } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import {
  LeaveRequest,
  subscribeLeaveRequests,
  approveLeaveRequest,
  getDatesBetween
} from "@/lib/leave-requests-service";
import { LeaveRequestDetailModal } from "@/components/modals/leave-request-detail-modal";
import { ProfileAvatar } from "@/components/ui/profile-avatar";

interface TeacherLeaveRequestsWidgetProps {
  teacherName: string;
  homeroomClass?: string;
  taughtClasses?: string[];
  className?: string;
}

export function TeacherLeaveRequestsWidget({
  teacherName,
  homeroomClass = "",
  taughtClasses = [],
  className
}: TeacherLeaveRequestsWidgetProps) {
  const toast = useToast();
  const todayStr = useMemo(() => getTodayDateString(), []);

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [activeFilter, setActiveFilter] = useState<"pending" | "today" | "all" | "sakit" | "izin">("pending");
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("all");
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // 1. Subscribe to real-time leave requests
  useEffect(() => {
    const unsub = subscribeLeaveRequests((requests) => {
      setLeaveRequests(requests);
    });
    return () => unsub();
  }, []);

  // 2. Available classes to filter
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    if (homeroomClass && homeroomClass !== "-") {
      set.add(homeroomClass.trim());
    }
    taughtClasses.forEach((c) => {
      if (c && c !== "-") set.add(c.trim());
    });
    leaveRequests.forEach((r) => {
      if (r.className) set.add(r.className.trim());
    });
    return Array.from(set);
  }, [homeroomClass, taughtClasses, leaveRequests]);

  // 3. Relevant requests for this teacher
  const relevantRequests = useMemo(() => {
    const hr = (homeroomClass || "").trim().toLowerCase();
    const taughtSet = new Set(taughtClasses.map((c) => c.trim().toLowerCase()));

    return leaveRequests.filter((req) => {
      const reqClass = (req.className || "").trim().toLowerCase();
      
      // If user selected a specific class filter in widget
      if (selectedClassFilter !== "all") {
        if (reqClass !== selectedClassFilter.toLowerCase()) return false;
      }

      // If teacher is homeroom, or teaches this class, or if no classes mapped, show all
      if (hr && reqClass === hr) return true;
      if (taughtSet.has(reqClass)) return true;
      if (!hr && taughtSet.size === 0) return true;

      return true;
    });
  }, [leaveRequests, homeroomClass, taughtClasses, selectedClassFilter]);

  // 4. Metrics
  const metrics = useMemo(() => {
    let pendingCount = 0;
    let todayActiveCount = 0;
    let homeroomPendingCount = 0;
    const hr = (homeroomClass || "").trim().toLowerCase();

    leaveRequests.forEach((req) => {
      const reqClass = (req.className || "").trim().toLowerCase();
      const isHr = hr && reqClass === hr;

      if (req.status === "Menunggu Persetujuan") {
        pendingCount++;
        if (isHr) homeroomPendingCount++;
      }

      // Active today?
      if (req.status === "Disetujui" || req.status === "Menunggu Persetujuan") {
        const dates = getDatesBetween(req.startDate, req.endDate);
        if (dates.includes(todayStr)) {
          todayActiveCount++;
        }
      }
    });

    return {
      pending: pendingCount,
      todayActive: todayActiveCount,
      homeroomPending: homeroomPendingCount,
      total: leaveRequests.length
    };
  }, [leaveRequests, homeroomClass, todayStr]);

  // 5. Filtered list for display
  const displayedRequests = useMemo(() => {
    return relevantRequests.filter((req) => {
      if (activeFilter === "pending") {
        return req.status === "Menunggu Persetujuan";
      }
      if (activeFilter === "today") {
        const dates = getDatesBetween(req.startDate, req.endDate);
        return dates.includes(todayStr);
      }
      if (activeFilter === "sakit") {
        return req.type === "Sakit";
      }
      if (activeFilter === "izin") {
        return req.type === "Izin";
      }
      return true; // "all"
    }).slice(0, 8); // Display top 8 in widget
  }, [relevantRequests, activeFilter, todayStr]);

  // 6. Quick Approve Handler
  const handleQuickApprove = async (e: React.MouseEvent, req: LeaveRequest) => {
    e.stopPropagation();
    setApprovingId(req.id);
    try {
      await approveLeaveRequest(
        req,
        teacherName || "Wali Kelas",
        "Disetujui langsung dari Dashboard Guru"
      );
      toast.showSuccess(
        `Surat ${req.type} untuk ${req.studentName} (${req.daysCount} hari) telah disetujui. Presensi siswa otomatis tercatat.`,
        "Surat Disetujui"
      );
    } catch (err: any) {
      toast.showError("Gagal menyetujui surat: " + (err.message || "Terjadi kesalahan"), "Gagal");
    } finally {
      setApprovingId(null);
    }
  };

  // Helper date formatter
  const formatDateBadge = (start: string, end: string) => {
    try {
      const s = new Date(start);
      const e = new Date(end);
      const sFormatted = s.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
      const eFormatted = e.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
      if (start === end) {
        return `${sFormatted} (${start === todayStr ? "Hari ini" : s.toLocaleDateString("id-ID", { weekday: "short" })})`;
      }
      return `${sFormatted} - ${eFormatted}`;
    } catch {
      return `${start} - ${end}`;
    }
  };

  return (
    <>
      <div className={cn(
        "bg-white rounded-xl p-6 md:p-7 border border-gray-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.05)] space-y-5 transition-all",
        className
      )}>
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#531FFF] to-[#7344FF] text-white flex items-center justify-center shadow-xs">
                <ClipboardCheck className="w-4 h-4" />
              </div>
              <h3 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
                Cek Surat Izin & Sakit Siswa
              </h3>
              {metrics.pending > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500 text-white shadow-xs animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  {metrics.pending} Menunggu Review
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 font-medium">
              Verifikasi dan tinjau pengajuan ketidakhadiran siswa dengan persetujuan terintegrasi langsung ke rekap absensi.
            </p>
          </div>

          <Link
            href="/leave-requests"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#531FFF] hover:text-[#4314cc] hover:underline shrink-0"
          >
            <span>Buka Portal Izin Lengkap</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Filter Pills & Class Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-lg overflow-x-auto text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveFilter("pending")}
              className={cn(
                "px-3 py-1.5 rounded-md transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5",
                activeFilter === "pending"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/60"
              )}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Perlu Persetujuan ({metrics.pending})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("today")}
              className={cn(
                "px-3 py-1.5 rounded-md transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5",
                activeFilter === "today"
                  ? "bg-[#531FFF] text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/60"
              )}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Izin/Sakit Hari Ini ({metrics.todayActive})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("sakit")}
              className={cn(
                "px-2.5 py-1.5 rounded-md transition-all whitespace-nowrap cursor-pointer flex items-center gap-1",
                activeFilter === "sakit"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/60"
              )}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Sakit</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("izin")}
              className={cn(
                "px-2.5 py-1.5 rounded-md transition-all whitespace-nowrap cursor-pointer flex items-center gap-1",
                activeFilter === "izin"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/60"
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Izin</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={cn(
                "px-2.5 py-1.5 rounded-md transition-all whitespace-nowrap cursor-pointer",
                activeFilter === "all"
                  ? "bg-gray-900 text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/60"
              )}
            >
              Semua ({metrics.total})
            </button>
          </div>

          {/* Class Filter Dropdown if teacher has multiple classes */}
          {availableClasses.length > 1 && (
            <div className="flex items-center gap-1.5 shrink-0 text-xs">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-700 font-bold px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:border-[#531FFF]"
              >
                <option value="all">Semua Kelas</option>
                {availableClasses.map((cls) => (
                  <option key={cls} value={cls}>
                    Kelas {cls}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Requests List */}
        {displayedRequests.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-gray-50/80 border border-dashed border-gray-200 space-y-2">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-gray-800 text-sm">
              {activeFilter === "pending"
                ? "Tidak Ada Surat Izin / Sakit Menunggu Review"
                : "Tidak Ada Data Surat Pengajuan"}
            </h4>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              {activeFilter === "pending"
                ? "Semua permohonan ketidakhadiran siswa telah selesai diverifikasi oleh Wali Kelas."
                : "Belum ada riwayat pengajuan izin atau surat sakit pada kategori yang dipilih."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {displayedRequests.map((req) => {
              const isPending = req.status === "Menunggu Persetujuan";
              const isApproved = req.status === "Disetujui";
              const isSakit = req.type === "Sakit";
              const isTodayActive = getDatesBetween(req.startDate, req.endDate).includes(todayStr);

              return (
                <div
                  key={req.id}
                  onClick={() => setSelectedRequest(req)}
                  className={cn(
                    "p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 group hover:shadow-md",
                    isPending
                      ? "bg-amber-50/30 border-amber-200 hover:border-amber-400"
                      : isApproved
                      ? "bg-white border-gray-200 hover:border-[#531FFF]/40"
                      : "bg-rose-50/20 border-rose-200 opacity-80"
                  )}
                >
                  {/* Card Top: Student Info & Badges */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-3 min-w-0">
                      <ProfileAvatar
                        name={req.studentName}
                        role="student"
                        size="md"
                        shape="rounded-xl"
                        className="shrink-0 mt-0.5"
                      />
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-black text-gray-900 truncate group-hover:text-[#531FFF] transition-colors">
                            {req.studentName}
                          </h4>
                          <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-gray-100 text-gray-700 border border-gray-200">
                            {req.className || "Kelas"}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 font-medium">
                          NISN: {req.studentNisn || req.studentId || "-"}
                        </p>
                      </div>
                    </div>

                    {/* Type Badge */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 shadow-2xs",
                        isSakit ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                      )}>
                        {isSakit ? <Stethoscope className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                        {req.type}
                      </span>
                      {isTodayActive && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                          Hari Ini
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Middle: Date Range & Reason */}
                  <div className="p-2.5 rounded-lg bg-white border border-gray-100/80 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-gray-500 font-semibold">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {formatDateBadge(req.startDate, req.endDate)}
                      </span>
                      <span className="font-bold text-gray-700 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200/60">
                        {req.daysCount} Hari
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed italic">
                      &ldquo;{req.reason || "Tidak ada keterangan tambahan."}&rdquo;
                    </p>

                    {/* Attachment status */}
                    {req.attachmentUrl && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-[#531FFF] pt-0.5">
                        <FileText className="w-3 h-3" />
                        <span>Lampiran Surat / Bukti Tersedia</span>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom: Status & Quick Action */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 text-xs">
                      {isPending ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Menunggu Review
                        </span>
                      ) : isApproved ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Disetujui
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          Ditolak
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isPending && (
                        <button
                          type="button"
                          disabled={approvingId === req.id}
                          onClick={(e) => handleQuickApprove(e, req)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-3 h-3" />
                          <span>{approvingId === req.id ? "Memproses..." : "Setujui"}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRequest(req);
                        }}
                        className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Detail</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DETAIL & ACTION MODAL */}
      <LeaveRequestDetailModal
        isOpen={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
        request={selectedRequest}
        canApprove={true}
        approverName={teacherName || "Wali Kelas"}
        onUpdated={() => {
          setSelectedRequest(null);
        }}
      />
    </>
  );
}
