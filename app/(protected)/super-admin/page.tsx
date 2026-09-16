"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Users,
  UserCheck,
  UserCog,
  GraduationCap,
  ArrowRight,
  Sparkles,
  CheckCircle2
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({
    totalParents: 0,
    totalStudents: 0,
    totalAccounts: 0,
    totalTeachers: 0,
    loading: true,
  });

  useEffect(() => {
    // Listen to parents collection
    const unsubParents = onSnapshot(collection(db, "parents"), (snapshot) => {
      setStats((prev) => ({ ...prev, totalParents: snapshot.size }));
    }, () => {});

    // Listen to students collection
    const unsubStudents = onSnapshot(collection(db, "students"), (snapshot) => {
      setStats((prev) => ({ ...prev, totalStudents: snapshot.size }));
    }, () => {});

    // Listen to users collection
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      setStats((prev) => ({ ...prev, totalAccounts: snapshot.size, loading: false }));
    }, () => {
      setStats((prev) => ({ ...prev, loading: false }));
    });

    // Listen to teachers collection
    const unsubTeachers = onSnapshot(collection(db, "teachers"), (snapshot) => {
      setStats((prev) => ({ ...prev, totalTeachers: snapshot.size }));
    }, () => {});

    return () => {
      unsubParents();
      unsubStudents();
      unsubUsers();
      unsubTeachers();
    };
  }, []);

  const quickModules = [
    {
      title: "Data Orang Tua / Wali",
      subtitle: "Master Data & Relasi Siswa",
      description: "Kelola direktori orang tua/wali murid dan hubungkan dengan data siswa via studentId tanpa duplikasi.",
      href: "/admin/parents",
      icon: Users,
      badge: "Baru Diperbarui",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      stats: `${stats.totalParents} Orang Tua`,
      accentColor: "from-blue-600 to-indigo-600",
      buttonText: "Buka Data Orang Tua",
    },
    {
      title: "Master Data Siswa",
      subtitle: "Database Siswa & NISN",
      description: "Kelola biodata siswa terdaftar, NISN, kelas, serta verifikasi status hubungan dengan orang tua.",
      href: "/admin/data-siswa",
      icon: GraduationCap,
      badge: "Core Master",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
      stats: `${stats.totalStudents} Siswa Terdaftar`,
      accentColor: "from-[#531FFF] to-purple-600",
      buttonText: "Kelola Siswa",
    },
    {
      title: "Manajemen Akun System",
      subtitle: "Kredensial & Autentikasi",
      description: "Kelola akun pengguna multi-role (Admin, Guru, Siswa, Orang Tua), reset password, dan status aktif.",
      href: "/admin/accounts",
      icon: UserCheck,
      badge: "Keamanan Sistem",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      stats: `${stats.totalAccounts} Akun Aktif`,
      accentColor: "from-amber-500 to-orange-600",
      buttonText: "Buka Manajemen Akun",
    },
    {
      title: "Role & Hak Akses (RBAC)",
      subtitle: "Matriks Perizinan",
      description: "Atur konfigurasi hak akses modul (Read, Write, Delete) untuk tiap role termasuk role Orang Tua.",
      href: "/admin/roles",
      icon: UserCog,
      badge: "RBAC Engine",
      badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
      stats: "6 Role Terdefinisi",
      accentColor: "from-rose-500 to-pink-600",
      buttonText: "Konfigurasi Role",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      {/* Super Admin Executive Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold tracking-wide">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>SUPER ADMIN CONSOLE</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Pusat Kendali & Master Data Sekolah
              </h1>
              <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
                Akses level tertinggi untuk mengelola seluruh ekosistem Quick Schools, sinkronisasi relasi Orang Tua dan Siswa, manajemen akun pengguna, dan konfigurasi hak akses.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/admin/parents"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#531FFF] hover:bg-[#4316cc] text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Users className="w-4 h-4" />
                <span>Kelola Data Orang Tua</span>
              </Link>
              <Link
                href="/admin/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/10 text-sm font-medium transition-all"
              >
                <span>Dashboard Umum</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800/80">
            <div className="bg-white/5 rounded-xl p-3.5 border border-white/5">
              <div className="text-xs text-slate-400 font-medium">Total Orang Tua</div>
              <div className="text-xl sm:text-2xl font-bold text-white mt-1">
                {stats.loading ? "..." : stats.totalParents}
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-3.5 border border-white/5">
              <div className="text-xs text-slate-400 font-medium">Total Siswa Terdaftar</div>
              <div className="text-xl sm:text-2xl font-bold text-indigo-400 mt-1">
                {stats.loading ? "..." : stats.totalStudents}
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-3.5 border border-white/5">
              <div className="text-xs text-slate-400 font-medium">Akun Pengguna Sistem</div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1">
                {stats.loading ? "..." : stats.totalAccounts}
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-3.5 border border-white/5">
              <div className="text-xs text-slate-400 font-medium">Staff Pengajar & Guru</div>
              <div className="text-xl sm:text-2xl font-bold text-amber-400 mt-1">
                {stats.loading ? "..." : stats.totalTeachers}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {/* Core Administrative Cards Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Modul Administrasi Utama</h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Pilih menu untuk mengelola master data, relasi keluarga siswa, kredensial, dan konfigurasi.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {quickModules.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="group relative bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 group-hover:bg-[#531FFF] group-hover:text-white transition-colors duration-200">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {item.subtitle}
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mt-0.5 group-hover:text-[#531FFF] transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-xs font-semibold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md">
                      {item.stats}
                    </div>

                    <Link
                      href={item.href}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#531FFF] hover:text-[#4316cc] group-hover:translate-x-0.5 transition-all"
                    >
                      <span>{item.buttonText}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Feature Highlight: Data Orang Tua & Siswa Synchronization */}
        <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 rounded-2xl p-6 sm:p-8 border border-indigo-100/80 shadow-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Arsitektur Relasi Referensial Tanpa Duplikasi</span>
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">
                Hubungkan Siswa dengan Orang Tua Secara Tepat & Aman
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Sistem menyimpan array <code>studentIds</code> pada dokumen Orang Tua sebagai referensi langsung ke master <code>students</code>. Biodata akademik, nilai rapor, dan presensi anak tidak terduplikasi, dan portal Orang Tua otomatis menyajikan data yang sinkron secara real-time.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/parents"
                className="px-5 py-2.5 rounded-xl bg-[#531FFF] hover:bg-[#4316cc] text-white text-sm font-semibold shadow-sm transition-all"
              >
                Buka Data Orang Tua
              </Link>
              <Link
                href="/admin/data-siswa"
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-sm font-semibold transition-all"
              >
                Cek Data Siswa
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-indigo-100">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-bold text-slate-900">Multi-Anak Didukung</div>
                <div className="text-xs text-slate-500 mt-0.5">Satu wali murid dapat terhubung dengan 1 atau lebih siswa sekaligus.</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-bold text-slate-900">Read-Only Enforced</div>
                <div className="text-xs text-slate-500 mt-0.5">Seluruh menu portal wali murid bersifat read-only kecuali bayar SPP.</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-bold text-slate-900">Sinkronisasi Akun Otomatis</div>
                <div className="text-xs text-slate-500 mt-0.5">Pembuatan akun role Orang Tua otomatis menghubungkan profil wali.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
