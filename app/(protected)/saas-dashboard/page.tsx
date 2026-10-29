"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Building2,
  Inbox,
  CheckCircle2,
  RefreshCw,
  Phone,
  Activity,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Wallet,
  Sparkles,
  PieChart as PieChartIcon,
  BarChart3,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";
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
  totalPaidRevenue: number;
  periodPaidRevenue: number;
  unpaidRevenue: number;
  overdueRevenue: number;
  mrr: number;
  arr: number;
  expiringCount: number;
  growthRate: number;
  totalRequests: number;
  pendingRequests: number;
  inProgressRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  conversionRate: number;
}

interface MonthlyTrendItem {
  month: string;
  shortMonth: string;
  customers: number;
  revenue: number;
  requests: number;
}

interface PlanDistributionItem {
  key: string;
  name: string;
  count: number;
  revenue: number;
  students: number;
  percentage: number;
  color: string;
}

interface ExpiringSubscriptionItem {
  id: string;
  customerCode: string;
  schoolName: string;
  schoolLevel: string;
  plan: string;
  status: string;
  picName: string;
  picPhone: string;
  subscriptionEnd: string;
  daysLeft: number;
  isExpired: boolean;
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

interface RecentLog {
  id: string;
  action: string;
  entityType: string;
  entityName?: string | null;
  description: string;
  performedBy: string;
  createdAt: string;
}

export default function SaaSDashboardPage() {
  const { isSuperAdmin, isSaaSAdmin } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<"all" | "30d" | "90d" | "ytd">("all");
  const [chartMetric, setChartMetric] = useState<"revenue" | "growth">("revenue");

  // Analytics states
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrendItem[]>([]);
  const [planDistributions, setPlanDistributions] = useState<PlanDistributionItem[]>([]);
  const [expiringSubscriptions, setExpiringSubscriptions] = useState<ExpiringSubscriptionItem[]>([]);
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchStats = useCallback(async (period: string = selectedPeriod) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/saas-dashboard/stats?period=${period}`);
      const json = await res.json();
      if (json.success && json.data) {
        setSummary(json.data.summary);
        setMonthlyTrends(json.data.monthlyTrends || []);
        setPlanDistributions(json.data.distributions?.plans || []);
        setExpiringSubscriptions(json.data.expiringSubscriptions || []);
        setRecentRequests(json.data.recentRequests || []);
        setRecentLogs(json.data.recentLogs || []);
      } else {
        throw new Error(json.error || "Gagal memuat statistik");
      }
    } catch (err: any) {
      console.error("fetchStats error:", err);
      toast.showError(err.message || "Gagal memuat data dashboard SaaS", "Kesalahan Jaringan");
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, toast]);

  useEffect(() => {
    fetchStats(selectedPeriod);
  }, [fetchStats, selectedPeriod]);

  const formatRupiah = (val?: number) => {
    if (!val && val !== 0) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const diffHours = Math.round((Date.now() - d.getTime()) / (1000 * 60 * 60));
      if (diffHours < 1) return "Baru saja";
      if (diffHours < 24) return `${diffHours} jam lalu`;
      const diffDays = Math.round(diffHours / 24);
      if (diffDays === 1) return "Kemarin";
      if (diffDays < 7) return `${diffDays} hari lalu`;
      return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    } catch {
      return "-";
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "CUSTOMER_CREATED":
        return { label: "Pelanggan Baru", bg: "bg-purple-50 text-[#531FFF] border-purple-200" };
      case "INVOICE_PAID":
        return { label: "Tagihan Lunas", bg: "bg-emerald-50 text-emerald-800 border-emerald-200" };
      case "INVOICE_CREATED":
        return { label: "Tagihan Terbit", bg: "bg-blue-50 text-blue-800 border-blue-200" };
      case "REQUEST_FOLLOWUP":
        return { label: "Tindak Lanjut", bg: "bg-amber-50 text-amber-800 border-amber-200" };
      case "STATUS_CHANGE":
        return { label: "Ubah Status", bg: "bg-indigo-50 text-indigo-800 border-indigo-200" };
      default:
        return { label: action.replace(/_/g, " "), bg: "bg-gray-100 text-gray-700 border-gray-200" };
    }
  };

  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-xs p-3.5 rounded-2xl border border-gray-100 shadow-xl text-xs space-y-1.5 min-w-[170px]">
          <p className="font-extrabold text-gray-900 border-b border-gray-100 pb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="font-semibold text-gray-600">{entry.name}:</span>
              </span>
              <span className="font-extrabold text-gray-900">
                {entry.name.includes("Pendapatan")
                  ? formatRupiah(entry.value)
                  : `${entry.value.toLocaleString("id-ID")} Sekolah`}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 pb-20 max-w-[1600px] mx-auto w-full space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. EXECUTIVE HEADER SECTION                                    */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-[#531FFF]/10 to-purple-100 text-[#531FFF] border border-[#531FFF]/20">
              <ShieldCheck className="w-3.5 h-3.5" /> {isSaaSAdmin ? "SaaS Administrator" : isSuperAdmin ? "Super Admin" : "SaaS Management"}
            </span>
            <span className="text-xs font-bold text-gray-400">• Executive Business Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Dashboard Eksekutif SaaS Quick Schools
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 max-w-xl">
            Pemantauan performa bisnis, recurring run rate (MRR/ARR), pertumbuhan pelanggan, konversi prospek, dan kesehatan lisensi sekolah secara menyeluruh.
          </p>
        </div>

        {/* Filter Periode Waktu & Tombol Aksi */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Period Filter Dropdown */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl">
            {[
              { id: "all", label: "Semua Waktu" },
              { id: "30d", label: "30 Hari" },
              { id: "90d", label: "Kuartal (90h)" },
              { id: "ytd", label: "Tahun Ini" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPeriod(p.id as any)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  selectedPeriod === p.id
                    ? "bg-white text-[#531FFF] shadow-2xs font-black"
                    : "text-gray-500 hover:text-gray-900"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchStats(selectedPeriod)}
            disabled={loading}
            className="p-2.5 sm:px-3.5 sm:py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            title="Segarkan Data Real-Time"
          >
            <RefreshCw className={cn("w-4 h-4 text-gray-500", loading && "animate-spin text-[#531FFF]")} />
            <span className="hidden sm:inline">Segarkan</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. RINGKASAN 6 KPI UTAMA (EXECUTIVE BUSINESS METRICS)         */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5 sm:gap-4">
        {/* KPI 1: Total Sekolah Terdaftar */}
        <Link
          href="/saas-customers"
          className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-2xs hover:border-[#531FFF]/40 transition-all space-y-2 block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Sekolah</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#531FFF] flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-gray-900">
            {loading ? "..." : summary?.totalCustomers || 0}
          </p>
          <div className="flex items-center gap-1 text-[11px] font-bold text-purple-600">
            <TrendingUp className="w-3 h-3" />
            <span>+{summary?.growthRate || 0}% MoM</span>
          </div>
        </Link>

        {/* KPI 2: Sekolah Aktif Berlangganan */}
        <Link
          href="/saas-customers"
          className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-2xs hover:border-emerald-300 transition-all space-y-2 block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-emerald-700 text-xs font-bold uppercase tracking-wider">Sekolah Aktif</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-700">
            {loading ? "..." : summary?.activeSchools || 0}
          </p>
          <span className="text-[11px] text-emerald-600 font-semibold block">
            {summary?.trialSchools || 0} Trial aktif
          </span>
        </Link>

        {/* KPI 3: Permintaan Baru (Pipeline Prospek) */}
        <Link
          href="/subscription-requests"
          className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-2xs hover:border-amber-300 transition-all space-y-2 block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-amber-700 text-xs font-bold uppercase tracking-wider">Permintaan Baru</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-700">
            {loading ? "..." : summary?.totalRequests || 0}
          </p>
          <span className="text-[11px] text-amber-600 font-semibold block">
            {summary?.pendingRequests || 0} perlu dihubungi
          </span>
        </Link>

        {/* KPI 4: Total Pendapatan Terkumpul */}
        <Link
          href="/saas-billing"
          className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-2xs hover:border-emerald-300 transition-all space-y-2 block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Pendapatan</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-black text-gray-900 truncate" title={formatRupiah(summary?.totalPaidRevenue)}>
            {loading ? "..." : formatRupiah(summary?.totalPaidRevenue)}
          </p>
          <span className="text-[11px] text-emerald-700 font-semibold block">
            Pembayaran lunas
          </span>
        </Link>

        {/* KPI 5: Recurring Revenue (MRR / Run-rate) */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-purple-700 text-xs font-bold uppercase tracking-wider">Estimasi MRR</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#531FFF] flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-black text-purple-700 truncate" title={formatRupiah(summary?.mrr)}>
            {loading ? "..." : formatRupiah(summary?.mrr)}
          </p>
          <span className="text-[11px] text-gray-400 font-semibold block">
            ARR: {formatRupiah(summary?.arr)}
          </span>
        </div>

        {/* KPI 6: Langganan Berakhir (Renewal Risk) */}
        <div className={cn(
          "rounded-2xl p-4 sm:p-5 border shadow-2xs space-y-2 transition-all",
          (summary?.expiringCount || 0) > 0
            ? "bg-rose-50/40 border-rose-200"
            : "bg-white border-gray-100"
        )}>
          <div className="flex items-center justify-between">
            <span className={cn(
              "text-xs font-bold uppercase tracking-wider",
              (summary?.expiringCount || 0) > 0 ? "text-rose-700" : "text-gray-400"
            )}>
              Akan Berakhir
            </span>
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center font-bold",
              (summary?.expiringCount || 0) > 0 ? "bg-rose-100 text-rose-700" : "bg-gray-100 text-gray-400"
            )}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className={cn(
            "text-2xl sm:text-3xl font-black",
            (summary?.expiringCount || 0) > 0 ? "text-rose-700" : "text-gray-900"
          )}>
            {loading ? "..." : summary?.expiringCount || 0}
          </p>
          <span className={cn(
            "text-[11px] font-semibold block",
            (summary?.expiringCount || 0) > 0 ? "text-rose-600" : "text-gray-400"
          )}>
            {(summary?.expiringCount || 0) > 0 ? "Segera perpanjang" : "Lisensi aman"}
          </span>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. SECTION GRAFIK TREN BISNIS & DISTRIBUSI PAKET              */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GRAFIK 1: Tren Pertumbuhan Pelanggan & Pendapatan (2 Columns on Desktop) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-purple-50 text-[#531FFF]">
                  <BarChart3 className="w-4 h-4" />
                </span>
                <h3 className="text-base font-black text-gray-900 tracking-tight">
                  Tren Pertumbuhan & Performa Finansial
                </h3>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Visualisasi dinamika pendapatan dan akumulasi institusi sekolah dalam 6 bulan terakhir
              </p>
            </div>

            {/* Metric Toggle */}
            <div className="inline-flex p-1 bg-gray-100 rounded-xl">
              <button
                type="button"
                onClick={() => setChartMetric("revenue")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  chartMetric === "revenue"
                    ? "bg-white text-[#531FFF] shadow-2xs font-black"
                    : "text-gray-500 hover:text-gray-900"
                )}
              >
                Pendapatan (IDR)
              </button>
              <button
                type="button"
                onClick={() => setChartMetric("growth")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  chartMetric === "growth"
                    ? "bg-white text-[#531FFF] shadow-2xs font-black"
                    : "text-gray-500 hover:text-gray-900"
                )}
              >
                Jumlah Sekolah
              </button>
            </div>
          </div>

          {/* Chart Rendering */}
          <div className="h-72 w-full pt-2">
            {!isMounted || loading ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-gray-400">
                <RefreshCw className="w-6 h-6 animate-spin text-[#531FFF]" />
                <span className="text-xs font-bold">Membuat visualisasi analitik...</span>
              </div>
            ) : monthlyTrends.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-gray-400 text-center">
                <BarChart3 className="w-8 h-8 text-gray-300" />
                <span className="text-xs font-semibold">Belum ada riwayat transaksi pada rentang waktu ini</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {chartMetric === "revenue" ? (
                  <AreaChart data={monthlyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#531FFF" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#531FFF" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis
                      dataKey="shortMonth"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94A3B8", fontSize: 11, fontWeight: 600 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94A3B8", fontSize: 11 }}
                      tickFormatter={(val) => `${Math.round(val / 1000000)} jt`}
                    />
                    <RechartsTooltip content={<CustomChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Pendapatan"
                      stroke="#531FFF"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#revenueGradient)"
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={monthlyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis
                      dataKey="shortMonth"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94A3B8", fontSize: 11, fontWeight: 600 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94A3B8", fontSize: 11 }}
                      allowDecimals={false}
                    />
                    <RechartsTooltip content={<CustomChartTooltip />} />
                    <Bar
                      dataKey="customers"
                      name="Sekolah Terdaftar"
                      fill="#531FFF"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="requests"
                      name="Permintaan Masuk"
                      fill="#F59E0B"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* GRAFIK 2: Distribusi Paket Langganan SaaS */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-purple-50 text-[#531FFF]">
                  <PieChartIcon className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-black text-gray-900 tracking-tight">
                  Sebaran Paket Langganan
                </h3>
              </div>
              <span className="text-[11px] font-bold text-gray-400">Tiers Produk</span>
            </div>

            {/* List Distribution Progress Bars */}
            <div className="space-y-4 pt-4">
              {planDistributions.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">Belum ada data sebaran paket</p>
              ) : (
                planDistributions.map((plan) => (
                  <div key={plan.key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: plan.color }} />
                        <span className="font-bold text-gray-800">{plan.name}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="text-gray-400">{plan.count} Sekolah</span>
                        <span className="font-black text-gray-900">({plan.percentage}%)</span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(plan.percentage, 4)}%`, backgroundColor: plan.color }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-400">
                      <span>{plan.students.toLocaleString("id-ID")} Siswa</span>
                      <span className="font-semibold text-gray-600">{formatRupiah(plan.revenue)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <Link
              href="/saas-packages"
              className="text-xs font-bold text-[#531FFF] hover:underline flex items-center justify-between"
            >
              <span>Kelola Katalog Paket SaaS</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. OPERATIONAL CAPACITY & EXPIRING SUBSCRIPTIONS BANNER        */}
      {/* ───────────────────────────────────────────────────────────── */}
      {expiringSubscriptions.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-amber-100 text-amber-800">
                <AlertTriangle className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-black text-amber-900">
                  Perhatian: {expiringSubscriptions.length} Sekolah Membutuhkan Perpanjangan Lisensi Segera
                </h3>
                <p className="text-xs text-amber-700">
                  Masa aktif langganan akan berakhir dalam 30 hari ke depan atau telah jatuh tempo perpanjangan.
                </p>
              </div>
            </div>
            <Link
              href="/saas-customers"
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all"
            >
              <span>Tinjau Pelanggan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {expiringSubscriptions.slice(0, 3).map((exp) => (
              <div key={exp.id} className="bg-white p-3.5 rounded-2xl border border-amber-200/80 shadow-2xs flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] font-bold text-gray-400">{exp.customerCode}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 uppercase">
                      {exp.plan}
                    </span>
                  </div>
                  <p className="font-extrabold text-xs text-gray-900 truncate mt-0.5">{exp.schoolName}</p>
                  <p className="text-[10px] text-gray-500">PIC: {exp.picName} ({exp.picPhone})</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={cn(
                    "text-xs font-black block",
                    exp.daysLeft <= 0 ? "text-rose-600" : "text-amber-600"
                  )}>
                    {exp.daysLeft <= 0 ? "Kadaluarsa" : `${exp.daysLeft} hari lagi`}
                  </span>
                  <a
                    href={`https://wa.me/${exp.picPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                      `Halo ${exp.picName} (${exp.schoolName}), perkenalkan kami dari Quick Schools ingin mengonfirmasi terkait perpanjangan langganan SaaS sekolah Anda yang akan berakhir.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 mt-1 hover:bg-emerald-100"
                  >
                    <Phone className="w-2.5 h-2.5" />
                    <span>Chat WA</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. DUAL TABLES: PERMINTAAN TERBARU & LOG OPERASIONAL BISNIS  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TABEL 1: Permintaan Berlangganan Terbaru (Pipeline Prospek) */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Inbox className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                    Permintaan Berlangganan Terbaru
                  </h3>
                  <p className="text-[11px] text-gray-400">Pengajuan formulir calon sekolah yang masuk</p>
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
                <div className="py-12 text-center text-gray-400 space-y-1">
                  <Inbox className="w-8 h-8 mx-auto text-gray-300" />
                  <p className="text-xs font-semibold">Belum ada permintaan berlangganan baru</p>
                </div>
              ) : (
                recentRequests.map((req, idx) => (
                  <div key={req.id} className="py-3.5 flex items-center justify-between gap-3 group">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-gray-100 text-gray-500 font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
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
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                          req.status === "PENDING" && "bg-amber-100 text-amber-800 border border-amber-200",
                          req.status === "CONTACTED" && "bg-blue-100 text-blue-800 border border-blue-200",
                          req.status === "OFFER_SENT" && "bg-purple-100 text-purple-800 border border-purple-200",
                          req.status === "APPROVED" && "bg-emerald-100 text-emerald-800 border border-emerald-200",
                          req.status === "REJECTED" && "bg-gray-100 text-gray-700 border border-gray-200"
                        )}
                      >
                        {req.status === "PENDING" && "Menunggu"}
                        {req.status === "CONTACTED" && "Diproses"}
                        {req.status === "OFFER_SENT" && "Penawaran"}
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

        {/* TABEL 2: Aktivitas Operasional Bisnis Terkini (SaaSOperationLog) */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#531FFF] flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                    Aktivitas Operasional Bisnis
                  </h3>
                  <p className="text-[11px] text-gray-400">Jejak audit aksi tim SaaS dan update pelanggan</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Live Audit
              </span>
            </div>

            <div className="divide-y divide-gray-100">
              {recentLogs.length === 0 ? (
                <div className="py-12 text-center text-gray-400 space-y-1">
                  <Activity className="w-8 h-8 mx-auto text-gray-300" />
                  <p className="text-xs font-semibold">Belum ada aktivitas operasional tercatat</p>
                </div>
              ) : (
                recentLogs.map((log, idx) => {
                  const badge = getActionBadge(log.action);
                  return (
                    <div key={log.id} className="py-3.5 flex items-start justify-between gap-3 group">
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-gray-100 text-gray-500 font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn("text-[10px] px-2 py-0.2 rounded font-black uppercase border", badge.bg)}>
                              {badge.label}
                            </span>
                            {log.entityName && (
                              <span className="font-extrabold text-xs text-gray-900 truncate max-w-[200px]">
                                {log.entityName}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 leading-snug line-clamp-2">
                            {log.description}
                          </p>
                          <p className="text-[10px] text-gray-400 font-medium">
                            Oleh: <strong className="text-gray-700">{log.performedBy}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-bold text-gray-400 block whitespace-nowrap">
                          {formatRelativeTime(log.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })
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
