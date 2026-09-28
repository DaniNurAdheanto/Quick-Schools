import {
  ShieldCheck, MapPin, Users,
  Database, Smartphone, Layers, Sparkles
} from "lucide-react";

interface BentoAdvantagesProps {
  lang: "id" | "en";
}

export default function BentoAdvantages({ lang }: BentoAdvantagesProps) {
  const t = {
    id: {
      badge: "KEUNGGULAN ARSITEKTUR",
      title: "Mengapa Sekolah Unggulan Memilih Quick Schools",
      desc: "Dirancang khusus untuk standar institusi pendidikan modern di Indonesia — cepat, aman, tanpa beban pemeliharaan server lokal.",
      bento1Title: "Presisi Geofence GPS Tanpa Titip Absen",
      bento1Desc: "Algoritma verifikasi radius dengan proteksi anti-mock location dan fake GPS. Memastikan siswa dan guru benar-benar hadir di dalam lingkungan sekolah.",
      bento1Metric: "99.8%",
      bento1MetricLabel: "Akurasi verifikasi koordinat",
      bento2Title: "Keamanan Data Cloud Enterprise",
      bento2Desc: "Didukung infrastruktur Google Cloud & Firebase dengan enkripsi data in-transit & at-rest, serta backup otomatis harian.",
      bento2Badge: "ISO / Kemdikbud Standard",
      bento3Title: "Otomasi Rapor Kurikulum Merdeka",
      bento3Desc: "Ratusan lembar rapor digital berformat resmi siap cetak dan bagikan dalam hitungan menit, tanpa rumus manual Excel yang rentan korup.",
      bento3Badge: "Hemat 10+ Jam/Guru",
      bento4Title: "Isolasi 5 Hak Akses Peran",
      bento4Desc: "Ruang portal terpisah untuk Kepala Sekolah, Wali Kelas, Siswa, Orang Tua, dan Bendahara dengan proteksi data ketat.",
      bento4Badge: "Zero Data Leak",
      bento5Title: "Notifikasi Otomatis ke WhatsApp Ortu",
      bento5Desc: "Wali murid mendapatkan kepastian kedatangan anak dan transparansi pembayaran SPP langsung di ponsel mereka tanpa aplikasi rumit.",
      bento5Badge: "Tingkat Baca 98%",
    },
    en: {
      badge: "ARCHITECTURAL ADVANTAGES",
      title: "Why Top Schools Choose Quick Schools",
      desc: "Custom-built for modern Indonesian educational standards — rapid, secure, and free from local server maintenance overhead.",
      bento1Title: "High-Precision GPS Geofencing with Zero Spoofing",
      bento1Desc: "Radius verification algorithm built with anti-mock location and fake GPS shields. Guarantees students and teachers are physically on school grounds.",
      bento1Metric: "99.8%",
      bento1MetricLabel: "Coordinate accuracy rate",
      bento2Title: "Enterprise Cloud Data Security",
      bento2Desc: "Powered by Google Cloud & Firebase with in-transit and at-rest encryption, alongside automated daily incremental backups.",
      bento2Badge: "ISO / Kemdikbud Standards",
      bento3Title: "Merdeka Curriculum Report Automation",
      bento3Desc: "Hundreds of standardized digital report cards computed, formatted, and ready to print in minutes, eliminating fragile Excel formulas.",
      bento3Badge: "Saves 10+ Hours/Teacher",
      bento4Title: "Isolated 5-Tier Role Access",
      bento4Desc: "Dedicated portal workspaces for Principal, Homeroom, Students, Parents, and Bursar with strict data privacy barriers.",
      bento4Badge: "Zero Data Leak",
      bento5Title: "Instant WhatsApp Alerts for Parents",
      bento5Desc: "Parents receive instant arrival confirmations and transparent tuition receipts directly on WhatsApp without cumbersome downloads.",
      bento5Badge: "98% Open Rate",
    }
  }[lang];

  return (
    <section id="keunggulan" className="py-24 md:py-32 bg-[#090514] text-white relative overflow-hidden">
      {/* Editorial ambient radial backdrop */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#531FFF]/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#7B4DFF]/10 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Subtle fine tech grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-[#531FFF]/20 border border-[#531FFF]/40 text-[#A78BFA] text-xs font-bold uppercase tracking-wider mb-4">
            <Layers className="w-3.5 h-3.5 text-[#A78BFA]" />
            {t.badge}
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.12] mb-5">
            {t.title}
          </h2>
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
            {t.desc}
          </p>
        </div>

        {/* Dynamic Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Bento Card 1: Large Spotlight (8 Cols) - Geofence GPS Tech */}
          <div className="md:col-span-12 lg:col-span-8 bg-slate-900/80 backdrop-blur-xl border border-slate-800 hover:border-[#531FFF]/50 rounded-2xl p-7 md:p-9 relative overflow-hidden transition-all duration-300 group shadow-2xl flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#531FFF]/20 via-transparent to-transparent pointer-events-none" />

            <div className="relative z-10 space-y-4 max-w-xl">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#531FFF]/20 border border-[#531FFF]/40 flex items-center justify-center text-[#A78BFA] shadow-md shadow-[#531FFF]/20">
                  <MapPin className="w-5 h-5 text-[#A78BFA]" />
                </div>
                <span className="text-xs font-mono font-bold text-[#A78BFA] bg-[#531FFF]/20 border border-[#531FFF]/30 px-3 py-1 rounded-md">
                  Hardware GPS Sensor Guard
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {t.bento1Title}
              </h3>

              <p className="text-sm text-slate-300 leading-relaxed font-normal">
                {t.bento1Desc}
              </p>
            </div>

            {/* Radar Telemetry Graphic Widget */}
            <div className="relative z-10 mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <span className="text-xs font-medium text-slate-400 block">{t.bento1MetricLabel}</span>
                <span className="text-2xl font-black text-emerald-400 mt-1 block">{t.bento1Metric}</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Sub-meter GPS validation</span>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <span className="text-xs font-medium text-slate-400 block">Deteksi Fake GPS</span>
                <span className="text-2xl font-black text-white mt-1 block">Aktif 100%</span>
                <span className="text-[10px] text-emerald-400 mt-0.5 block">Blokir otomatis saat tap</span>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <span className="text-xs font-medium text-slate-400 block">Radius Kustom</span>
                <span className="text-2xl font-black text-[#A78BFA] mt-1 block">25m - 500m</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Dapat disesuaikan denah</span>
              </div>
            </div>
          </div>

          {/* Bento Card 2: Enterprise Cloud Architecture (4 Cols) */}
          <div className="md:col-span-6 lg:col-span-4 bg-slate-900/80 backdrop-blur-xl border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-7 md:p-8 flex flex-col justify-between transition-all duration-300 shadow-2xl relative overflow-hidden">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Database className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800/80 px-2.5 py-1 rounded-md">
                  {t.bento2Badge}
                </span>
              </div>

              <h3 className="text-xl font-black text-white tracking-tight">
                {t.bento2Title}
              </h3>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                {t.bento2Desc}
              </p>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <ShieldCheck className="w-4 h-4" /> 99.9% Uptime SLA
              </span>
              <span className="font-mono">Google Cloud</span>
            </div>
          </div>

          {/* Bento Card 3: Kurikulum Merdeka Engine (4 Cols) */}
          <div className="md:col-span-6 lg:col-span-4 bg-slate-900/80 backdrop-blur-xl border border-slate-800 hover:border-purple-500/40 rounded-2xl p-7 md:p-8 flex flex-col justify-between transition-all duration-300 shadow-2xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                  <Sparkles className="w-5 h-5 text-purple-300" />
                </div>
                <span className="text-[11px] font-bold text-purple-300 bg-purple-950/70 border border-purple-800/80 px-2.5 py-1 rounded-md">
                  {t.bento3Badge}
                </span>
              </div>

              <h3 className="text-xl font-black text-white tracking-tight">
                {t.bento3Title}
              </h3>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                {t.bento3Desc}
              </p>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span className="text-purple-300 font-bold">Kemdikbudristek Standard</span>
              <span className="font-mono">PDF Siap Cetak</span>
            </div>
          </div>

          {/* Bento Card 4: Multi-Role Isolation (4 Cols) */}
          <div className="md:col-span-6 lg:col-span-4 bg-slate-900/80 backdrop-blur-xl border border-slate-800 hover:border-blue-500/40 rounded-2xl p-7 md:p-8 flex flex-col justify-between transition-all duration-300 shadow-2xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-300">
                  <Users className="w-5 h-5 text-blue-300" />
                </div>
                <span className="text-[11px] font-bold text-blue-300 bg-blue-950/70 border border-blue-800/80 px-2.5 py-1 rounded-md">
                  {t.bento4Badge}
                </span>
              </div>

              <h3 className="text-xl font-black text-white tracking-tight">
                {t.bento4Title}
              </h3>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                {t.bento4Desc}
              </p>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span className="text-blue-300 font-bold">5 Portals In 1 App</span>
              <span className="font-mono">RBAC Security</span>
            </div>
          </div>

          {/* Bento Card 5: WhatsApp Notification Hub (4 Cols) */}
          <div className="md:col-span-6 lg:col-span-4 bg-slate-900/80 backdrop-blur-xl border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-7 md:p-8 flex flex-col justify-between transition-all duration-300 shadow-2xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800/80 px-2.5 py-1 rounded-md">
                  {t.bento5Badge}
                </span>
              </div>

              <h3 className="text-xl font-black text-white tracking-tight">
                {t.bento5Title}
              </h3>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                {t.bento5Desc}
              </p>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span className="text-emerald-400 font-bold">Direct To Parent Phone</span>
              <span className="font-mono">Instant Dispatch</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
