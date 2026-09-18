export type EducationalStage = "SD" | "SMP" | "SMA" | "SMK";

export interface VocationalProgram {
  id: string;
  code: string;
  name: string;
  field: string;
  headOfProgram?: string;
  description?: string;
  status: "Aktif" | "Non-Aktif";
  createdAt?: string;
  updatedAt?: string;
}

export interface SubjectPresetDef {
  code: string;
  name: string;
  category: "Wajib" | "Peminatan" | "Kejuruan / Produktif" | "Muatan Lokal";
  creditHours: string;
  level: string;
  kkm: number;
  icon: string;
  description: string;
  vocationalProgramCode?: string;
}

export interface StageConfig {
  id: EducationalStage;
  name: string;
  fullName: string;
  levelRange: string;
  curriculumCycle: string;
  gradeLevels: string[];
  defaultKkm: number;
  hasMajors: boolean;
  majorLabel: string;
  majorType: "none" | "academic_track" | "vocational";
  defaultMajors: { label: string; value: string; field?: string }[];
  badgeColor: string;
  badgeBg: string;
  borderColor: string;
  iconName: string;
  description: string;
}

/**
 * Default Populer Vocational Programs (Jurusan) untuk SMK di Indonesia
 */
export const DEFAULT_VOCATIONAL_PRESETS: Omit<VocationalProgram, "id">[] = [
  {
    code: "RPL",
    name: "Rekayasa Perangkat Lunak",
    field: "Teknologi Informasi & Komunikasi",
    headOfProgram: "-",
    description: "Pengembangan web, mobile app, basis data, dan rekayasa perangkat lunak modern.",
    status: "Aktif"
  },
  {
    code: "TKJ",
    name: "Teknik Komputer dan Jaringan",
    field: "Teknologi Informasi & Komunikasi",
    headOfProgram: "-",
    description: "Administrasi infrastruktur jaringan, server, fiber optic, dan keamanan siber.",
    status: "Aktif"
  },
  {
    code: "DKV",
    name: "Desain Komunikasi Visual (Multimedia)",
    field: "Seni & Ekonomi Kreatif",
    headOfProgram: "-",
    description: "Desain grafis, animasi, videografi, UI/UX, dan produksi media kreatif.",
    status: "Aktif"
  },
  {
    code: "AKL",
    name: "Akuntansi dan Keuangan Lembaga",
    field: "Bisnis & Manajemen",
    headOfProgram: "-",
    description: "Pembukuan keuangan, perpajakan, audit perbankan, dan sistem akuntansi digital.",
    status: "Aktif"
  },
  {
    code: "MPLB",
    name: "Manajemen Perkantoran & Layanan Bisnis (OTKP)",
    field: "Bisnis & Manajemen",
    headOfProgram: "-",
    description: "Administrasi perkantoran digital, kearsipan elektronik, dan korespondensi bisnis.",
    status: "Aktif"
  },
  {
    code: "TKRO",
    name: "Teknik Kendaraan Ringan Otomotif",
    field: "Teknologi Manufaktur & Rekayasa",
    headOfProgram: "-",
    description: "Perawatan mesin otomotif, chasis, kelistrikan kendaraan, dan electronic fuel injection.",
    status: "Aktif"
  }
];

/**
 * Konfigurasi Master Tiap Jenjang Satuan Pendidikan
 */
export const STAGE_CONFIGS: Record<EducationalStage, StageConfig> = {
  SD: {
    id: "SD",
    name: "SD",
    fullName: "Sekolah Dasar / Madrasah Ibtidaiyah",
    levelRange: "Kelas 1 s/d 6",
    curriculumCycle: "Fase A (Kls 1-2), Fase B (Kls 3-4), Fase C (Kls 5-6)",
    gradeLevels: ["Kelas 1", "Kelas 2", "Kelas 3", "Kelas 4", "Kelas 5", "Kelas 6"],
    defaultKkm: 70,
    hasMajors: false,
    majorLabel: "Fokus / Rombel",
    majorType: "none",
    defaultMajors: [
      { label: "Tematik / Umum", value: "Umum" }
    ],
    badgeColor: "text-rose-700",
    badgeBg: "bg-rose-50",
    borderColor: "border-rose-200",
    iconName: "Sparkles",
    description: "Fondasi literasi, numerasi, pembentukan karakter anak, dan pembelajaran tematik terpadu."
  },
  SMP: {
    id: "SMP",
    name: "SMP",
    fullName: "Sekolah Menengah Pertama / Madrasah Tsanawiyah",
    levelRange: "Kelas 7 s/d 9",
    curriculumCycle: "Fase D (Kelas 7, 8, dan 9)",
    gradeLevels: ["Kelas 7", "Kelas 8", "Kelas 9"],
    defaultKkm: 73,
    hasMajors: false,
    majorLabel: "Rombel Kelas",
    majorType: "none",
    defaultMajors: [
      { label: "Reguler / Umum", value: "Umum" }
    ],
    badgeColor: "text-blue-700",
    badgeBg: "bg-blue-50",
    borderColor: "border-blue-200",
    iconName: "BookOpen",
    description: "Pendidikan menengah pertama dengan pematangan mata pelajaran terpadu dan eksplorasi minat bakat."
  },
  SMA: {
    id: "SMA",
    name: "SMA",
    fullName: "Sekolah Menengah Atas / Madrasah Aliyah",
    levelRange: "Kelas 10 s/d 12",
    curriculumCycle: "Fase E (Kelas 10) & Fase F (Kelas 11-12)",
    gradeLevels: ["Kelas 10", "Kelas 11", "Kelas 12"],
    defaultKkm: 75,
    hasMajors: true,
    majorLabel: "Peminatan / Jurusan",
    majorType: "academic_track",
    defaultMajors: [
      { label: "MIPA (Matematika & IPA)", value: "IPA", field: "Sains & Teknologi" },
      { label: "IPS (Ilmu Pengetahuan Sosial)", value: "IPS", field: "Sosial & Humaniora" },
      { label: "Bahasa & Budaya", value: "Bahasa", field: "Bahasa & Sastra" },
      { label: "Kurikulum Merdeka (Umum)", value: "Umum", field: "Lintas Minat" }
    ],
    badgeColor: "text-indigo-700",
    badgeBg: "bg-indigo-50",
    borderColor: "border-indigo-200",
    iconName: "GraduationCap",
    description: "Pendidikan akademik lanjutan untuk persiapan perguruan tinggi dengan peminatan sains, sosial, dan bahasa."
  },
  SMK: {
    id: "SMK",
    name: "SMK",
    fullName: "Sekolah Menengah Kejuruan / MAK",
    levelRange: "Kelas 10 s/d 12 (atau 13)",
    curriculumCycle: "Fase E (Dasar Kejuruan) & Fase F (Konsentrasi Keahlian & PKL)",
    gradeLevels: ["Kelas 10", "Kelas 11", "Kelas 12"],
    defaultKkm: 75,
    hasMajors: true,
    majorLabel: "Program / Kompetensi Keahlian",
    majorType: "vocational",
    defaultMajors: DEFAULT_VOCATIONAL_PRESETS.map(p => ({
      label: `${p.code} - ${p.name}`,
      value: p.code,
      field: p.field
    })),
    badgeColor: "text-amber-700",
    badgeBg: "bg-amber-50",
    borderColor: "border-amber-200",
    iconName: "Briefcase",
    description: "Pendidikan kejuruan berorientasi vokasi, sertifikasi kompetensi industri, dan praktik kerja lapangan (PKL)."
  }
};

/**
 * Standard Subject Presets Per Stage
 */
export const STAGE_SUBJECT_PRESETS: Record<EducationalStage, SubjectPresetDef[]> = {
  SD: [
    { code: "PAI", name: "Pendidikan Agama & Budi Pekerti", category: "Wajib", creditHours: "3 JP", level: "Semua Tingkat", kkm: 70, icon: "🕌", description: "Nilai keimanan, ketakwaan, dan akhlak mulia" },
    { code: "PKN", name: "Pendidikan Pancasila", category: "Wajib", creditHours: "4 JP", level: "Semua Tingkat", kkm: 70, icon: "🏛️", description: "Pancasila, UUD 1945, keberagaman, dan cinta tanah air" },
    { code: "BIN", name: "Bahasa Indonesia", category: "Wajib", creditHours: "6 JP", level: "Semua Tingkat", kkm: 70, icon: "🇮🇩", description: "Membaca, menulis, menyimak, dan literasi dasar" },
    { code: "MAT", name: "Matematika", category: "Wajib", creditHours: "5 JP", level: "Semua Tingkat", kkm: 70, icon: "📐", description: "Berhitung, bilangan, operasi hitung, geometri dan pengukuran" },
    { code: "IPS", name: "Ilmu Pengetahuan Alam & Sosial (IPAS)", category: "Wajib", creditHours: "5 JP", level: "Kelas 3-6", kkm: 70, icon: "🌱", description: "Pengenalan sains dasar, lingkungan hidup, dan kehidupan sosial" },
    { code: "PJK", name: "Pendidikan Jasmani, Olahraga & Kesehatan (PJOK)", category: "Wajib", creditHours: "3 JP", level: "Semua Tingkat", kkm: 70, icon: "⚽", description: "Aktivitas jasmani, gerak dasar, dan pola hidup sehat" },
    { code: "SNB", name: "Seni dan Budaya (Rupa / Musik / Tari)", category: "Wajib", creditHours: "3 JP", level: "Semua Tingkat", kkm: 70, icon: "🎨", description: "Eksplorasi karya seni visual, musik, dan gerak tari" },
    { code: "BIG", name: "Bahasa Inggris Dasar", category: "Wajib", creditHours: "2 JP", level: "Kelas 4-6", kkm: 70, icon: "🇬🇧", description: "Pengenalan kosa kata dan percakapan sederhana sehari-hari" },
    { code: "BHD", name: "Bahasa Daerah", category: "Muatan Lokal", creditHours: "2 JP", level: "Semua Tingkat", kkm: 70, icon: "🗣️", description: "Bahasa dan kebudayaan daerah setempat" }
  ],
  SMP: [
    { code: "PAI", name: "Pendidikan Agama & Budi Pekerti", category: "Wajib", creditHours: "3 JP", level: "Semua Tingkat", kkm: 73, icon: "🕌", description: "Pendidikan akidah, ibadah, dan pembentukan karakter" },
    { code: "PKN", name: "Pendidikan Pancasila", category: "Wajib", creditHours: "3 JP", level: "Semua Tingkat", kkm: 73, icon: "🏛️", description: "Norma hukum, ketatanegaraan, dan wawasan kebangsaan" },
    { code: "BIN", name: "Bahasa Indonesia", category: "Wajib", creditHours: "5 JP", level: "Semua Tingkat", kkm: 73, icon: "🇮🇩", description: "Teks laporan, eksposisi, narasi, dan apresiasi sastra" },
    { code: "BIG", name: "Bahasa Inggris", category: "Wajib", creditHours: "4 JP", level: "Semua Tingkat", kkm: 73, icon: "🇬🇧", description: "Komunikasi interpersonal, transaksional, dan teks fungsional" },
    { code: "MAT", name: "Matematika", category: "Wajib", creditHours: "5 JP", level: "Semua Tingkat", kkm: 73, icon: "📐", description: "Aljabar, geometri, transformasi, statistika, dan peluang" },
    { code: "IPA", name: "Ilmu Pengetahuan Alam (IPA Terpadu)", category: "Wajib", creditHours: "5 JP", level: "Semua Tingkat", kkm: 73, icon: "🔬", description: "Kajian biologi sel, fisika mekanika, zat dan energi" },
    { code: "IPS", name: "Ilmu Pengetahuan Sosial (IPS Terpadu)", category: "Wajib", creditHours: "4 JP", level: "Semua Tingkat", kkm: 73, icon: "🌏", description: "Geografi nusantara, sejarah nasional, dan aktivitas ekonomi" },
    { code: "INF", name: "Informatika", category: "Wajib", creditHours: "2 JP", level: "Semua Tingkat", kkm: 73, icon: "💻", description: "Berpikir komputasional, algoritma, TIK, dan etika digital" },
    { code: "PJK", name: "PJOK", category: "Wajib", creditHours: "3 JP", level: "Semua Tingkat", kkm: 73, icon: "⚽", description: "Kebugaran jasmani, senam, atletik, dan kesehatan reproduksi" },
    { code: "PRA", name: "Prakarya & Seni Budaya", category: "Wajib", creditHours: "2 JP", level: "Semua Tingkat", kkm: 73, icon: "🛠️", description: "Kerajinan, rekayasa teknologi sederhana, dan budidaya" },
    { code: "BHD", name: "Bahasa Daerah", category: "Muatan Lokal", creditHours: "2 JP", level: "Semua Tingkat", kkm: 73, icon: "🗣️", description: "Aksara, kesantunan bertutur, dan kearifan lokal" }
  ],
  SMA: [
    { code: "PAI", name: "Pendidikan Agama & Budi Pekerti", category: "Wajib", creditHours: "3 JP", level: "Semua Tingkat", kkm: 75, icon: "🕌", description: "Nilai keimanan, moral, dan akhlak mulia" },
    { code: "PKN", name: "Pendidikan Pancasila (PPKn)", category: "Wajib", creditHours: "2 JP", level: "Semua Tingkat", kkm: 75, icon: "🏛️", description: "Konstitusi, hak asasi manusia, dan integrasi nasional" },
    { code: "BIN", name: "Bahasa Indonesia", category: "Wajib", creditHours: "4 JP", level: "Semua Tingkat", kkm: 75, icon: "🇮🇩", description: "Karya ilmiah, kritik sastra, retorika, dan jurnalistik" },
    { code: "MAT", name: "Matematika Wajib", category: "Wajib", creditHours: "4 JP", level: "Semua Tingkat", kkm: 75, icon: "📐", description: "Fungsi, trigonometri, kalkulus dasar, dan statistika" },
    { code: "BIG", name: "Bahasa Inggris", category: "Wajib", creditHours: "3 JP", level: "Semua Tingkat", kkm: 75, icon: "🇬🇧", description: "Debat, esai akademik, dan presentasi formal" },
    { code: "SEJ", name: "Sejarah Indonesia", category: "Wajib", creditHours: "2 JP", level: "Semua Tingkat", kkm: 75, icon: "📜", description: "Dinamika perjuangan dan perkembangan Indonesia modern" },
    { code: "PJK", name: "Pendidikan Jasmani (PJOK)", category: "Wajib", creditHours: "3 JP", level: "Semua Tingkat", kkm: 75, icon: "⚽", description: "Kebugaran fisik, sportivitas, dan pola hidup sehat" },
    { code: "SNB", name: "Seni Budaya & Prakarya", category: "Wajib", creditHours: "2 JP", level: "Semua Tingkat", kkm: 75, icon: "🎨", description: "Kreativitas seni rupa, musik modern, dan seni peran" },
    // Peminatan MIPA
    { code: "FIS", name: "Fisika", category: "Peminatan", creditHours: "4 JP", level: "Kelas 10-12", kkm: 75, icon: "⚛️", description: "Mekanika, fluida, termodinamika, medan magnet, dan fisika kuantum" },
    { code: "KIM", name: "Kimia", category: "Peminatan", creditHours: "4 JP", level: "Kelas 10-12", kkm: 75, icon: "🧪", description: "Struktur atom, termokimia, kesetimbangan, dan kimia organik" },
    { code: "BIO", name: "Biologi", category: "Peminatan", creditHours: "4 JP", level: "Kelas 10-12", kkm: 75, icon: "🧬", description: "Fisiologi sel, genetika populasi, evolusi, dan bioteknologi" },
    { code: "MTL", name: "Matematika Tingkat Lanjut", category: "Peminatan", creditHours: "4 JP", level: "Kelas 11-12", kkm: 75, icon: "📊", description: "Kalkulus diferensial-integral lanjutan, matriks, dan vektor" },
    // Peminatan IPS
    { code: "EKO", name: "Ekonomi", category: "Peminatan", creditHours: "4 JP", level: "Kelas 10-12", kkm: 75, icon: "💰", description: "Pasar modal, akuntansi perusahaan, moneter, dan perdagangan global" },
    { code: "GEO", name: "Geografi", category: "Peminatan", creditHours: "4 JP", level: "Kelas 10-12", kkm: 75, icon: "🌍", description: "Geomorfologi, demografi, SIG, dan pembangunan berkelanjutan" },
    { code: "SOS", name: "Sosiologi", category: "Peminatan", creditHours: "4 JP", level: "Kelas 10-12", kkm: 75, icon: "👥", description: "Struktur sosial, dinamika konflik, globalisasi, dan riset sosial" }
  ],
  SMK: [
    // Muatan Umum
    { code: "PAI", name: "Pendidikan Agama & Budi Pekerti", category: "Wajib", creditHours: "3 JP", level: "Semua Tingkat", kkm: 75, icon: "🕌", description: "Etika profesi, keimanan, dan integritas kerja" },
    { code: "PKN", name: "Pendidikan Pancasila", category: "Wajib", creditHours: "2 JP", level: "Semua Tingkat", kkm: 75, icon: "🏛️", description: "Kesadaran hukum ketenagakerjaan dan kewarganegaraan" },
    { code: "BIN", name: "Bahasa Indonesia Terapan", category: "Wajib", creditHours: "4 JP", level: "Semua Tingkat", kkm: 75, icon: "🇮🇩", description: "Komunikasi profesional, SOP industri, dan dokumen kerja" },
    { code: "BIG", name: "Bahasa Inggris Kejuruan (Vocational English)", category: "Wajib", creditHours: "4 JP", level: "Semua Tingkat", kkm: 75, icon: "🇬🇧", description: "Percakapan teknis industri, manual book, dan korespondensi internasional" },
    { code: "MAT", name: "Matematika Terapan", category: "Wajib", creditHours: "4 JP", level: "Semua Tingkat", kkm: 75, icon: "📐", description: "Perhitungan teknis, statistik produksi, dan estimasi biaya" },
    { code: "INF", name: "Informatika & Literasi Digital", category: "Wajib", creditHours: "4 JP", level: "Kelas 10", kkm: 75, icon: "💻", description: "Kecakapan digital, pemrograman dasar, dan cloud tools" },
    { code: "IPAS", name: "Projek IPAS Terapan", category: "Wajib", creditHours: "6 JP", level: "Kelas 10", kkm: 75, icon: "🧪", description: "Sains terapan dalam ekosistem industri dan lingkungan kerja" },
    { code: "PJK", name: "PJOK & Kesehatan Kerja (K3)", category: "Wajib", creditHours: "3 JP", level: "Semua Tingkat", kkm: 75, icon: "⚽", description: "Kebugaran fisik, keselamatan, dan kesehatan kerja industri" },
    // Muatan Kejuruan / Produktif
    { code: "DPK", name: "Dasar-Dasar Program Keahlian", category: "Kejuruan / Produktif", creditHours: "12 JP", level: "Kelas 10", kkm: 75, icon: "⚙️", description: "Pengenalan industri, proses bisnis, K3LH, dan teknik dasar kejuruan" },
    { code: "KK1", name: "Konsentrasi Keahlian I (Teori & Praktik)", category: "Kejuruan / Produktif", creditHours: "18 JP", level: "Kelas 11", kkm: 76, icon: "🛠️", description: "Kompetensi inti kejuruan sesuai program keahlian spesifik" },
    { code: "KK2", name: "Konsentrasi Keahlian II (Lanjutan & Sertifikasi)", category: "Kejuruan / Produktif", creditHours: "22 JP", level: "Kelas 12", kkm: 78, icon: "🏭", description: "Penyelarasan standar industri dan persiapan uji kompetensi keahlian" },
    { code: "PKK", name: "Projek Kreatif dan Kewirausahaan (PKK)", category: "Kejuruan / Produktif", creditHours: "5 JP", level: "Kelas 11-12", kkm: 75, icon: "💼", description: "Perencanaan bisnis, pembuatan prototipe produk, dan pemasaran nyata" },
    { code: "PKL", name: "Praktik Kerja Lapangan (PKL Industri)", category: "Kejuruan / Produktif", creditHours: "44 JP", level: "Kelas 12", kkm: 78, icon: "🏢", description: "Praktek kerja nyata di dunia usaha dan dunia industri (DUDI)" }
  ]
};

/**
 * Otomatis mendeteksi jenjang pendidikan dari string schoolType yang sudah ada di database
 */
export function detectStageFromSchoolType(schoolType?: string | null): EducationalStage {
  if (!schoolType) return "SMA";
  const s = schoolType.toUpperCase();

  if (s.includes("SMK") || s.includes("KEJURUAN") || s.includes("MAK")) {
    return "SMK";
  }
  if (s.includes("SMP") || s.includes("MTS") || s.includes("MENENGAH PERTAMA")) {
    return "SMP";
  }
  if (s.includes("SD") || s.includes("DASAR") || s.includes("IBTIDAIYAH") || s.includes("MI")) {
    return "SD";
  }
  if (s.includes("SMA") || s.includes("ALIYAH") || s.includes("MENENGAH ATAS")) {
    return "SMA";
  }

  return "SMA";
}

/**
 * Mengambil metadata jenjang
 */
export function getStageConfig(stage: EducationalStage): StageConfig {
  return STAGE_CONFIGS[stage] || STAGE_CONFIGS.SMA;
}

/**
 * Mengambil daftar tingkat kelas sesuai jenjang
 */
export function getGradeLevelsForStage(stage: EducationalStage): string[] {
  return getStageConfig(stage).gradeLevels;
}

/**
 * Mengambil opsi jurusan / peminatan dinamis sesuai jenjang
 */
export function getMajorOptionsForStage(
  stage: EducationalStage, 
  customVocationalPrograms: VocationalProgram[] = []
): { label: string; value: string; field?: string }[] {
  const config = getStageConfig(stage);

  if (stage === "SMK") {
    if (customVocationalPrograms && customVocationalPrograms.length > 0) {
      return customVocationalPrograms
        .filter(p => p.status !== "Non-Aktif")
        .map(p => ({
          label: `${p.code} - ${p.name}`,
          value: p.code,
          field: p.field
        }));
    }
    return config.defaultMajors;
  }

  return config.defaultMajors;
}

/**
 * Mengambil daftar preset mata pelajaran sesuai jenjang
 */
export function getSubjectPresetsForStage(stage: EducationalStage): SubjectPresetDef[] {
  return STAGE_SUBJECT_PRESETS[stage] || STAGE_SUBJECT_PRESETS.SMA;
}

/**
 * Mengambil KKM default sesuai jenjang
 */
export function getDefaultKkmForStage(stage: EducationalStage): number {
  return getStageConfig(stage).defaultKkm;
}
