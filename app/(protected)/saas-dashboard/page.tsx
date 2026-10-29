"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Building2,
  Inbox,
  CheckCircle2,
  Clock,
  XCircle,
  CreditCard,
  RefreshCw,
  Phone,
  School,
  Activity,
  Layers,
  ArrowRight,
  ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

interface DashboardSummary {
  totalCustomers: number;
  activeSchools: number;
  trialSchools: number;
  suspendedSchools: number;
  nonaktifSchools: number;
  totalStudents: number;
  totalCapacity: number;
  estimatedMonthlyRunRate: number;
  totalRequests: number;
  pendingRequests: number;
  inProgressRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  conversionRate: number;
}

interface RecentCustomer {
  id: string;
  customerCode: string;
  schoolName: string;
  schoolLevel: string;
  city?: string | null;
  picName: string;
  picPhone: string;
  plan: string;
  status: string;
  currentStudents?: number;
  subscriptionEnd?: string | null;
  createdAt: string;
}

interface RecentRequest {
  id: string;
  requestNumber: string;
  schoolName: string;
  schoolLevel: string;
  picName: string;
  picPhone: string;
  planInterest: string;
  status: string;
  createdAt: string;
}

const PLAN_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  trial: { label: "Trial 14 Hari", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  standard: { label: "Sekolah Rintisan", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  pro: { label: "Sekolah Pro", color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  enterprise: { label: "Yayasan / Enterprise", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
};

export default function SaaSDashboardPage() {
  const { isSuperAdmin, isSaaSAdmin } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [plansDist, setPlansDist] = useState<Record<string, number>>({});
  const [levelsDist, setLevelsDist] = useState<Record<string, number>>({});
  const [recentCustomers, setRecentCustomers] = useState<RecentCustomer[]>([]);
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas-dashboard/stats");
      const json = await res.json();
      if (json.success && json.data) {
        setSummary(json.data.summary);
        setPlansDist(json.data.distributions?.plans || {});
        setLevelsDist(json.data.distributions?.levels || {});
        setRecentCustomers(json.data.recentCustomers || []);
        setRecentRequests(json.data.recentRequests || []);
      } else {
        throw new Error(json.error || "Gagal memuat statistik");
      }
    } catch (err: any) {
      console.error("fetchStats error:", err);
      toast.showError(err.message || "Gagal memuat data dashboard SaaS", "Kesalahan Jaringan");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const formatRupiah = (val?: number) => {
    if (!val) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-[#531FFF]/10 to-purple-100 text-[#531FFF] border border-[#531FFF]/20">
              <ShieldCheck className="w-3.5 h-3.5" /> {isSuperAdmin ? "Super Admin (Root System)" : isSaaSAdmin ? "SaaS Administrator (Bisnis & Operasional)" : "SaaS Operations Portal"}
            </span>
            <span className="text-xs font-bold text-gray-400">• Pusat Kendali SaaS Quick Schools</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Dashboard Eksekutif SaaS
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 max-w-xl">
            Ringkasan data pelanggan sekolah, status lisensi aktif, paket layanan, tagihan langganan, serta tindak lanjut permintaan onboarding secara terpusat.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="p-2.5 sm:px-3.5 sm:py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
            title="Segarkan Data"
          >
            <RefreshCw className={cn("w-4 h-4 text-gray-500", loading && "animate-spin text-[#531FFF]")} />
            <span className="hidden sm:inline">Segarkan</span>
          </button>

          <Link
            href="/subscription-requests"
            className="px-3.5 py-2.5 rounded-xl bg-purple-50 text-[#531FFF] border border-purple-200 hover:bg-purple-100 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
          >
            <Inbox className="w-4 h-4" />
            <span>Permintaan ({summary?.pendingRequests || 0})</span>
          </Link>

          <Link
            href="/saas-packages"
            className="px-3.5 py-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <Layers className="w-4 h-4 text-gray-500" />
            <span>Paket Layanan</span>
          </Link>

          <Link
            href="/saas-billing"
            className="px-3.5 py-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <CreditCard className="w-4 h-4 text-gray-500" />
            <span>Tagihan</span>
          </Link>

          <Link
            href="/saas-customers"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#531FFF] to-[#4314cc] hover:from-[#4314cc] hover:to-[#380fa8] text-white text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md shadow-[#531FFF]/20"
          >
            <Building2 className="w-4 h-4" />
            <span>Kelola Pelanggan</span>
          </Link>
        </div>
      </div>

      {/* TOP 4 PRIMARY KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* 1. Total Pelanggan */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs relative overflow-hidden group hover:border-[#531FFF]/30 transition-all">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Pelanggan</span>
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-[#531FFF] flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
              {loading ? "..." : summary?.totalCustomers || 0}
            </p>
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 pt-1">
              <span className="font-extrabold text-emerald-600">
                {summary?.activeSchools || 0} Aktif
              </span>
              <span>•</span>
              <span className="font-bold text-amber-600">
                {summary?.trialSchools || 0} Trial
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-[11px] text-gray-400 font-semibold">
            <span>Kapasitas: {summary?.totalCapacity?.toLocaleString() || 0} Siswa</span>
            <Link href="/saas-customers" className="text-[#531FFF] font-bold hover:underline flex items-center gap-0.5">
              Kelola <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* 2. Sekolah Aktif */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs relative overflow-hidden group hover:border-emerald-200 transition-all">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sekolah Aktif</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-3xl sm:text-4xl font-black text-emerald-700 tracking-tight">
              {loading ? "..." : summary?.activeSchools || 0}
            </p>
            <p className="text-xs font-semibold text-gray-500 pt-1">
              {summary?.totalCustomers ? Math.round(((summary.activeSchools) / summary.totalCustomers) * 100) : 0}% dari seluruh pelanggan terdaftar
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-[11px] text-gray-400 font-semibold">
            <span>Siswa Aktif: {summary?.totalStudents?.toLocaleString() || 0}</span>
            <span className="text-emerald-600 font-bold">SLA 99.9% Uptime</span>
          </div>
        </div>

        {/* 3. Permintaan Baru (Pending) */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs relative overflow-hidden group hover:border-amber-200 transition-all">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Permintaan Baru</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold relative">
              <Inbox className="w-5 h-5" />
              {(summary?.pendingRequests || 0) > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-500 border-2 border-white animate-pulse" />
              )}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-3xl sm:text-4xl font-black text-amber-700 tracking-tight">
              {loading ? "..." : summary?.pendingRequests || 0}
            </p>
            <p className="text-xs font-semibold text-gray-500 pt-1">
              Menunggu dihubungi tim sales / konsultan
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-[11px] text-gray-400 font-semibold">
            <span>Total Masuk: {summary?.totalRequests || 0}</span>
            <Link href="/subscription-requests" className="text-amber-700 font-bold hover:underline flex items-center gap-0.5">
              Tindak Lanjut <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* 4. Estimasi Pendapatan / Tingkat Persetujuan */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs relative overflow-hidden group hover:border-purple-200 transition-all">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Konversi & MRR</span>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500/10 to-[#531FFF]/10 text-[#531FFF] flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight truncate">
              {loading ? "..." : formatRupiah(summary?.estimatedMonthlyRunRate)}
            </p>
            <p className="text-xs font-semibold text-purple-700 pt-1">
              Estimasi MRR • {summary?.conversionRate || 0}% Konversi Permintaan
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-[11px] text-gray-400 font-semibold">
            <span>{summary?.approvedRequests || 0} Permintaan Disetujui</span>
            <span className="text-gray-500 font-bold">SaaS Billing</span>
          </div>
        </div>
      </div>

      {/* REQUEST LIFECYCLE STATUS STRIP */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">
              Status Siklus Permintaan Berlangganan
            </h2>
            <p className="text-xs text-gray-400">Monitoring tahapan tindak lanjut dari tim sales & konsultan Quick Schools</p>
          </div>
          <Link
            href="/subscription-requests"
            className="text-xs font-bold text-[#531FFF] hover:underline flex items-center gap-1"
          >
            Buka Panel Permintaan <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-2">
          {/* Menunggu */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1">
            <div className="flex items-center justify-between text-amber-800">
              <span className="text-xs font-bold">1. Menunggu</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-amber-900">
              {summary?.pendingRequests || 0}
            </p>
            <p className="text-[11px] text-amber-700 leading-tight">Belum dihubungi pihak sekolah</p>
          </div>

          {/* Diproses */}
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-1">
            <div className="flex items-center justify-between text-blue-800">
              <span className="text-xs font-bold">2. Diproses</span>
              <Activity className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-blue-900">
              {summary?.inProgressRequests || 0}
            </p>
            <p className="text-[11px] text-blue-700 leading-tight">Dalam diskusi demo / penawaran</p>
          </div>

          {/* Disetujui */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1">
            <div className="flex items-center justify-between text-emerald-800">
              <span className="text-xs font-bold">3. Disetujui</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-900">
              {summary?.approvedRequests || 0}
            </p>
            <p className="text-[11px] text-emerald-700 leading-tight">Resmi berlangganan aktif</p>
          </div>

          {/* Ditolak */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
            <div className="flex items-center justify-between text-gray-700">
              <span className="text-xs font-bold">4. Ditolak</span>
              <XCircle className="w-4 h-4 text-gray-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-gray-800">
              {summary?.rejectedRequests || 0}
            </p>
            <p className="text-[11px] text-gray-500 leading-tight">Batal / tidak mencapai kesepakatan</p>
          </div>
        </div>
      </div>

      {/* DISTRIBUTION & ANALYTICS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Paket Distribution */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#531FFF] flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">
                Distribusi Paket Pelanggan
              </h3>
            </div>
            <span className="text-xs font-bold text-gray-400">{summary?.totalCustomers || 0} Total</span>
          </div>

          <div className="space-y-3.5 pt-1">
            {Object.entries(PLAN_LABELS).map(([key, config]) => {
              const count = plansDist[key] || 0;
              const total = summary?.totalCustomers || 1;
              const pct = Math.round((count / total) * 100);

              return (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-700">{config.label}</span>
                    <span className="font-extrabold text-gray-900">
                      {count} Sekolah ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        key === "trial" && "bg-amber-500",
                        key === "standard" && "bg-blue-500",
                        key === "pro" && "bg-[#531FFF]",
                        key === "enterprise" && "bg-emerald-500"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Jenjang Sekolah Distribution */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <School className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">
                Distribusi Jenjang Sekolah
              </h3>
            </div>
            <span className="text-xs font-bold text-gray-400">Pendidikan</span>
          </div>

          <div className="space-y-3 pt-1">
            {Object.keys(levelsDist).length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">Belum ada data sebaran jenjang sekolah</p>
            ) : (
              Object.entries(levelsDist).map(([lvl, count]) => {
                const total = summary?.totalCustomers || 1;
                const pct = Math.round((count / total) * 100);

                return (
                  <div key={lvl} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-gray-50/80">
                    <span className="font-bold text-gray-800">{lvl}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 text-[11px]">{pct}%</span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-white border border-gray-200 text-gray-900 font-extrabold">
                        {count} Sekolah
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* DUAL TABLES SECTION: RECENT REQUESTS & RECENT CUSTOMERS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Table 1: Permintaan Berlangganan Terbaru */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Inbox className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">
                    Permintaan Terbaru
                  </h3>
                  <p className="text-[11px] text-gray-400">Pengajuan formulir request subscription terbaru</p>
                </div>
              </div>
              <Link
                href="/subscription-requests"
                className="text-xs font-bold text-[#531FFF] hover:underline flex items-center gap-1"
              >
                Lihat Semua <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-gray-100">
              {recentRequests.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">Belum ada permintaan masuk</p>
              ) : (
                recentRequests.map((req) => (
                  <div key={req.id} className="py-3.5 flex items-center justify-between gap-3 group">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-[#531FFF]">
                          {req.requestNumber}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase bg-gray-100 text-gray-600">
                          {req.schoolLevel}
                        </span>
                      </div>
                      <p className="font-extrabold text-sm text-gray-900 truncate">{req.schoolName}</p>
                      <p className="text-xs text-gray-500">
                        PIC: <span className="font-semibold text-gray-700">{req.picName}</span> • WA: {req.picPhone}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                          req.status === "PENDING" && "bg-amber-100 text-amber-800 border border-amber-200",
                          req.status === "CONTACTED" && "bg-blue-100 text-blue-800 border border-blue-200",
                          req.status === "APPROVED" && "bg-emerald-100 text-emerald-800 border border-emerald-200",
                          req.status === "REJECTED" && "bg-gray-100 text-gray-700 border border-gray-200"
                        )}
                      >
                        {req.status === "PENDING" && "Menunggu"}
                        {req.status === "CONTACTED" && "Diproses"}
                        {req.status === "APPROVED" && "Disetujui"}
                        {req.status === "REJECTED" && "Ditolak"}
                      </span>

                      <a
                        href={`https://wa.me/${req.picPhone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 hover:text-emerald-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        title="Chat WhatsApp"
                      >
                        <Phone className="w-3 h-3" />
                        <span>Chat WA</span>
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/subscription-requests"
              className="w-full py-2.5 px-4 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-xs text-center block transition-colors"
            >
              Buka Seluruh Permintaan Berlangganan →
            </Link>
          </div>
        </div>

        {/* Table 2: Pelanggan Sekolah Aktif Terbaru */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">
                    Pelanggan Sekolah Terkini
                  </h3>
                  <p className="text-[11px] text-gray-400">Daftar institusi sekolah yang terdaftar di sistem SaaS</p>
                </div>
              </div>
              <Link
                href="/saas-customers"
                className="text-xs font-bold text-[#531FFF] hover:underline flex items-center gap-1"
              >
                Lihat Semua <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-gray-100">
              {recentCustomers.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">Belum ada pelanggan terdaftar</p>
              ) : (
                recentCustomers.map((cust) => (
                  <div key={cust.id} className="py-3.5 flex items-center justify-between gap-3 group">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-gray-400">
                          {cust.customerCode}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] px-2 py-0.5 rounded-md font-bold uppercase",
                            PLAN_LABELS[cust.plan]?.bg || "bg-gray-100",
                            PLAN_LABELS[cust.plan]?.color || "text-gray-700"
                          )}
                        >
                          {PLAN_LABELS[cust.plan]?.label || cust.plan}
                        </span>
                      </div>
                      <p className="font-extrabold text-sm text-gray-900 truncate">{cust.schoolName}</p>
                      <p className="text-xs text-gray-500">
                        {cust.city || "Indonesia"} • {cust.currentStudents || 0} Siswa Aktif
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                          cust.status === "AKTIF" && "bg-emerald-100 text-emerald-800 border border-emerald-200",
                          cust.status === "TRIAL" && "bg-amber-100 text-amber-800 border border-amber-200",
                          cust.status === "SUSPENDED" && "bg-rose-100 text-rose-800 border border-rose-200",
                          cust.status === "NONAKTIF" && "bg-gray-100 text-gray-700 border border-gray-200"
                        )}
                      >
                        {cust.status}
                      </span>

                      <span className="text-[11px] text-gray-400">
                        PIC: {cust.picName.split(" ")[0]}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/saas-customers"
              className="w-full py-2.5 px-4 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-xs text-center block transition-colors"
            >
              Kelola Seluruh Pelanggan Sekolah →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
