"use client";

import { motion } from "motion/react";
import {
  MapPin, CreditCard, GraduationCap,
  BookOpen, MessageSquare, Calendar
} from "lucide-react";

interface HeroOrbitProps {
  lang: "id" | "en";
}

export default function HeroOrbit({ lang }: HeroOrbitProps) {
  const t = {
    id: {
      stat1Val: "500+",
      stat1Lbl: "Sekolah Terdaftar",
      stat2Val: "1.2M+",
      stat2Lbl: "Siswa & Guru Aktif",
      stat3Val: "99.9%",
      stat3Lbl: "Cloud SLA Uptime",
      stat4Val: "4.9 ★",
      stat4Lbl: "Rating Kepuasan Guru",
      badge1: "Presensi GPS",
      badge2: "SPP Virtual Account",
      badge3: "Kurikulum Merdeka",
      badge4: "Perpustakaan Digital",
      badge5: "Notifikasi WhatsApp",
      badge6: "Jadwal Bebas Bentrok",
    },
    en: {
      stat1Val: "500+",
      stat1Lbl: "Registered Schools",
      stat2Val: "1.2M+",
      stat2Lbl: "Active Students & Staff",
      stat3Val: "99.9%",
      stat3Lbl: "Cloud SLA Uptime",
      stat4Val: "4.9 ★",
      stat4Lbl: "Educator Satisfaction",
      badge1: "GPS Geofence",
      badge2: "Tuition Auto-VA",
      badge3: "Merdeka Curriculum",
      badge4: "Digital Library",
      badge5: "WhatsApp Alerts",
      badge6: "Conflict-Free Timetable",
    },
  }[lang];

  // 6 Orbiting feature icons with colors and labels
  const orbitBadges = [
    { icon: MapPin, label: t.badge1, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
    { icon: CreditCard, label: t.badge2, color: "text-[#531FFF] bg-[#531FFF]/10 border-[#531FFF]/25" },
    { icon: GraduationCap, label: t.badge3, color: "text-amber-600 bg-amber-50 border-amber-200" },
    { icon: BookOpen, label: t.badge4, color: "text-sky-600 bg-sky-50 border-sky-200" },
    { icon: MessageSquare, label: t.badge5, color: "text-green-600 bg-green-50 border-green-200" },
    { icon: Calendar, label: t.badge6, color: "text-rose-600 bg-rose-50 border-rose-200" },
  ];

  return (
    <div className="relative w-full max-w-[420px] sm:max-w-[460px] md:max-w-[500px] aspect-square mx-auto flex items-center justify-center select-none">
      {/* Background Radial Glow */}
      <motion.div
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.7, 0.95, 0.7],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-8 rounded-full bg-gradient-to-tr from-[#531FFF]/18 via-[#7C3AED]/12 to-indigo-100/50 blur-3xl pointer-events-none -z-10"
      />

      {/* Outer Concentric Subtle Track Ring */}
      <div className="absolute inset-0 rounded-full border border-slate-200/70" />

      {/* Middle Dashed Orbit Track */}
      <div className="absolute inset-[10%] rounded-full border border-dashed border-[#531FFF]/25" />

      {/* Rotating Orbit Container for the 6 Badges */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        className="absolute inset-[10%] rounded-full pointer-events-none"
      >
        {orbitBadges.map((badge, idx) => {
          const angle = (idx * (360 / orbitBadges.length) * Math.PI) / 180;
          // Radius is 50% of the middle container
          const x = 50 + 50 * Math.cos(angle);
          const y = 50 + 50 * Math.sin(angle);

          return (
            <div
              key={idx}
              style={{
                position: "absolute",
                left: `${x}%`,
                top: `${y}%`,
                transform: "translate(-50%, -50%)",
              }}
              className="pointer-events-auto group/orbit cursor-pointer"
            >
              {/* Counter-rotate icon so it always stays upright */}
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                whileHover={{ scale: 1.15 }}
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full ${badge.color} border shadow-md flex items-center justify-center transition-transform`}
              >
                <badge.icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </motion.div>

              {/* Tooltip on Hover */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-slate-900 text-white text-[10px] font-bold tracking-tight whitespace-nowrap opacity-0 group-hover/orbit:opacity-100 transition-opacity pointer-events-none shadow-md z-30">
                {badge.label}
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Inner Central Glassmorphism Disc Housing Stacked Key Metrics */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="relative w-[64%] h-[64%] rounded-full bg-white/85 backdrop-blur-xl border border-white/80 shadow-[0_20px_50px_rgba(83,31,255,0.08),0_2px_8px_rgba(0,0,0,0.04)] flex flex-col items-center justify-center p-6 text-center z-10"
      >
        {/* Subtle decorative inner border ring */}
        <div className="absolute inset-2.5 rounded-full border border-slate-100/80 pointer-events-none" />

        {/* Stacked Metric Items in Clean Transix Style */}
        <div className="space-y-3.5 relative z-10">
          <div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">
              {t.stat1Val}
            </p>
            <p className="text-[11px] font-medium text-slate-400 mt-1 uppercase tracking-wider">
              {t.stat1Lbl}
            </p>
          </div>

          <div className="w-12 h-px bg-slate-100 mx-auto" />

          <div>
            <p className="text-xl sm:text-2xl font-black text-[#531FFF] tracking-tight leading-none">
              {t.stat2Val}
            </p>
            <p className="text-[11px] font-medium text-slate-400 mt-1 uppercase tracking-wider">
              {t.stat2Lbl}
            </p>
          </div>

          <div className="w-12 h-px bg-slate-100 mx-auto" />

          <div>
            <p className="text-base sm:text-lg font-black text-emerald-600 tracking-tight leading-none">
              {t.stat4Val}
            </p>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5 uppercase tracking-wider">
              {t.stat4Lbl}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
