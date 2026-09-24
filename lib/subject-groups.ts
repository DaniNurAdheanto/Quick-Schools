import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  addDoc,
  deleteDoc, 
  getDoc,
  query,
  orderBy,
  serverTimestamp
} from "firebase/firestore";
import type { EducationalStage } from "@/lib/school-level-config";

export interface SubjectGroup {
  id: string;
  code: string;
  name: string;
  category: "Wajib" | "Peminatan" | "Muatan Lokal";
  major: string; // "Semua Jurusan / Umum" | "RPL" | "TKJ" | "IPA" | "IPS" etc.
  level: string; // "Semua Tingkat" | "Kelas 10" | "Kelas 11" | "Kelas 12" etc.
  description?: string;
  subjectIds: string[]; // List of subject codes or firestore IDs belonging to this group
  order?: number;
  status: "Aktif" | "Nonaktif";
  createdAt?: string;
  updatedAt?: string;
}

const LOCAL_STORAGE_KEY = "quick_schools_subject_groups";

/**
 * Generate standard preset subject groups according to educational stage & majors
 */
export function getPresetSubjectGroups(stage: EducationalStage, activeMajors: { label: string; value: string }[] = []): SubjectGroup[] {
  const now = new Date().toISOString();

  if (stage === "SMK") {
    const groups: SubjectGroup[] = [
      {
        id: "sg_smk_muatan_nasional",
        code: "A-NAS",
        name: "Muatan Nasional (Kelompok A)",
        category: "Wajib",
        major: "Semua Jurusan / Umum",
        level: "Semua Tingkat",
        description: "Mata pelajaran wajib kurikulum nasional (Pendidikan Agama, PPKn, Bahasa Indonesia, Matematika, Sejarah, Bahasa Inggris).",
        subjectIds: [],
        order: 1,
        status: "Aktif",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "sg_smk_muatan_kewilayahan",
        code: "B-WIL",
        name: "Muatan Kewilayahan (Kelompok B)",
        category: "Wajib",
        major: "Semua Jurusan / Umum",
        level: "Semua Tingkat",
        description: "Mata pelajaran pengembangan kewilayahan dan karakter (Seni Budaya, PJOK).",
        subjectIds: [],
        order: 2,
        status: "Aktif",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "sg_smk_c1_dasar_bidang",
        code: "C1-TIK",
        name: "Dasar Bidang Keahlian (C1)",
        category: "Peminatan",
        major: "Semua Jurusan / Umum",
        level: "Kelas 10",
        description: "Kompetensi dasar rumpun teknologi dan rekayasa (Simulasi Digital, Fisika Terapan, Kimia Terapan).",
        subjectIds: [],
        order: 3,
        status: "Aktif",
        createdAt: now,
        updatedAt: now
      },
    ];

    let orderCounter = 4;
    // For each vocational program / major, add C2 & C3
    const majorsToProcess = activeMajors.length > 0 
      ? activeMajors.filter(m => m.value !== "Umum" && m.value !== "All")
      : [
          { label: "RPL - Rekayasa Perangkat Lunak", value: "RPL" },
          { label: "TKJ - Teknik Komputer & Jaringan", value: "TKJ" },
          { label: "DKV - Desain Komunikasi Visual", value: "DKV" }
        ];

    majorsToProcess.forEach(m => {
      groups.push({
        id: `sg_smk_c2_${m.value.toLowerCase()}`,
        code: `C2-${m.value}`,
        name: `Dasar Program Keahlian (C2) - ${m.value}`,
        category: "Peminatan",
        major: m.value,
        level: "Kelas 10",
        description: `Dasar-dasar kompetensi keahlian kejuruan ${m.label}.`,
        subjectIds: [],
        order: orderCounter++,
        status: "Aktif",
        createdAt: now,
        updatedAt: now
      });

      groups.push({
        id: `sg_smk_c3_${m.value.toLowerCase()}`,
        code: `C3-${m.value}`,
        name: `Konsentrasi Keahlian (C3) - ${m.value}`,
        category: "Peminatan",
        major: m.value,
        level: "Kelas 11-12",
        description: `Mata pelajaran produktif spesialisasi dan projek kreatif kewirausahaan jurusan ${m.label}.`,
        subjectIds: [],
        order: orderCounter++,
        status: "Aktif",
        createdAt: now,
        updatedAt: now
      });
    });

    groups.push({
      id: "sg_smk_muatan_lokal",
      code: "MULOK",
      name: "Muatan Lokal & Ekstrakurikuler",
      category: "Muatan Lokal",
      major: "Semua Jurusan / Umum",
      level: "Semua Tingkat",
      description: "Pengembangan potensi kearifan lokal, bahasa daerah, dan keterampilan pilihan.",
      subjectIds: [],
      order: orderCounter++,
      status: "Aktif",
      createdAt: now,
      updatedAt: now
    });

    return groups;
  }

  if (stage === "SMA") {
    return [
      {
        id: "sg_sma_wajib_umum",
        code: "A-UMUM",
        name: "Kelompok Mata Pelajaran Umum",
        category: "Wajib",
        major: "Semua Jurusan / Umum",
        level: "Semua Tingkat",
        description: "Pendidikan Agama dan Budi Pekerti, Pendidikan Pancasila, Bahasa Indonesia, Matematika, Bahasa Inggris, PJOK, dan Sejarah.",
        subjectIds: ["PAI", "PKN", "BIN", "MAT", "BIG", "PJK", "SEJ"],
        order: 1,
        status: "Aktif",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "sg_sma_peminatan_mipa",
        code: "C-MIPA",
        name: "Kelompok MIPA",
        category: "Peminatan",
        major: "IPA",
        level: "Kelas 10-12",
        description: "Biologi, Fisika, Kimia, dan Matematika Tingkat Lanjut.",
        subjectIds: ["BIO", "FIS", "KIM", "MTL"],
        order: 2,
        status: "Aktif",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "sg_sma_peminatan_ips",
        code: "C-IPS",
        name: "Kelompok IPS",
        category: "Peminatan",
        major: "IPS",
        level: "Kelas 10-12",
        description: "Ekonomi, Geografi, Sosiologi, dan Sejarah Tingkat Lanjut.",
        subjectIds: ["EKO", "GEO", "SOS", "SJL"],
        order: 3,
        status: "Aktif",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "sg_sma_peminatan_bahasa",
        code: "C-BHS",
        name: "Kelompok Bahasa",
        category: "Peminatan",
        major: "Bahasa",
        level: "Kelas 10-12",
        description: "Bahasa dan Sastra Indonesia, Bahasa dan Sastra Inggris, Bahasa Asing Pilihan, dan Antropologi.",
        subjectIds: ["BSI", "BSE", "BSA", "ANT"],
        order: 4,
        status: "Aktif",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "sg_sma_mulok",
        code: "MULOK",
        name: "Muatan Lokal & Pilihan",
        category: "Muatan Lokal",
        major: "Semua Jurusan / Umum",
        level: "Semua Tingkat",
        description: "Kearifan lokal daerah dan mata pelajaran keterampilan pilihan.",
        subjectIds: ["BHD", "PLH"],
        order: 5,
        status: "Aktif",
        createdAt: now,
        updatedAt: now
      }
    ];
  }

  // SMP / SD Defaults
  return [
    {
      id: "sg_dasar_kelompok_a",
      code: "KEL-A",
      name: "Kelompok A (Mata Pelajaran Wajib)",
      category: "Wajib",
      major: "Semua Jurusan / Umum",
      level: "Semua Tingkat",
      description: "Mata pelajaran inti kebangsaan, literasi, numerasi, dan budi pekerti.",
      subjectIds: [],
      order: 1,
      status: "Aktif",
      createdAt: now,
      updatedAt: now
    },
    {
      id: "sg_dasar_kelompok_b",
      code: "KEL-B",
      name: "Kelompok B (Terapan, Seni & Jasmani)",
      category: "Wajib",
      major: "Semua Jurusan / Umum",
      level: "Semua Tingkat",
      description: "Mata pelajaran seni budaya, prakarya, dan pendidikan jasmani.",
      subjectIds: [],
      order: 2,
      status: "Aktif",
      createdAt: now,
      updatedAt: now
    },
    {
      id: "sg_dasar_mulok",
      code: "MULOK",
      name: "Muatan Lokal",
      category: "Muatan Lokal",
      major: "Semua Jurusan / Umum",
      level: "Semua Tingkat",
      description: "Pembelajaran bahasa dan budaya kearifan daerah.",
      subjectIds: [],
      order: 3,
      status: "Aktif",
      createdAt: now,
      updatedAt: now
    }
  ];
}

/**
 * Fetch all subject groups from Firestore with localStorage and stage preset fallback
 */
export async function fetchSubjectGroupsFromDb(
  stage?: EducationalStage, 
  activeMajors?: { label: string; value: string }[]
): Promise<SubjectGroup[]> {
  try {
    // 1. Try fetching from primary 'subject_groups' collection
    const snap = await getDocs(query(collection(db, "subject_groups"), orderBy("order", "asc")));
    if (!snap.empty) {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as SubjectGroup));
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
      } catch (e) {}
      return list;
    }

    // 2. Try fetching from backup 'roles/subject_groups_store'
    const backupDoc = await getDoc(doc(db, "roles", "subject_groups_store"));
    if (backupDoc.exists() && Array.isArray(backupDoc.data()?.list) && backupDoc.data()?.list.length > 0) {
      const list = backupDoc.data()?.list as SubjectGroup[];
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
      } catch (e) {}
      return list;
    }
  } catch (err) {
    console.warn("Error fetching subject groups from Firestore, checking localStorage:", err);
  }

  // 3. Fallback to localStorage
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {}

  // 4. Default presets if stage is provided
  if (stage) {
    const defaults = getPresetSubjectGroups(stage, activeMajors);
    return defaults;
  }

  return [];
}

/**
 * Save / Update a Subject Group in Firestore & LocalStorage
 */
export async function saveSubjectGroupToDb(group: SubjectGroup): Promise<void> {
  const now = new Date().toISOString();
  const cleanId = group.id || `sg_${Date.now()}`;
  const payload: SubjectGroup = {
    ...group,
    id: cleanId,
    updatedAt: now,
    createdAt: group.createdAt || now,
    status: group.status || "Aktif",
    subjectIds: Array.isArray(group.subjectIds) ? group.subjectIds : []
  };

  // 1. Write to 'subject_groups'
  try {
    await setDoc(doc(db, "subject_groups", cleanId), payload, { merge: true });
  } catch (err) {
    console.warn("Direct subject_groups collection write warning:", err);
  }

  // 2. Also save to backup store in 'roles/subject_groups_store' for 100% reliable permissions
  try {
    const currentList = await fetchSubjectGroupsFromDb();
    const index = currentList.findIndex(g => g.id === cleanId);
    let updatedList = [...currentList];
    if (index >= 0) {
      updatedList[index] = payload;
    } else {
      updatedList.push(payload);
    }
    await setDoc(doc(db, "roles", "subject_groups_store"), {
      list: updatedList,
      updatedAt: now
    }, { merge: true });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
  } catch (err) {
    console.warn("Backup subject groups write error:", err);
  }
}

/**
 * Delete a Subject Group
 */
export async function deleteSubjectGroupFromDb(groupId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "subject_groups", groupId));
  } catch (err) {
    console.warn("Delete from subject_groups warning:", err);
  }

  try {
    const currentList = await fetchSubjectGroupsFromDb();
    const filtered = currentList.filter(g => g.id !== groupId);
    await setDoc(doc(db, "roles", "subject_groups_store"), {
      list: filtered,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.warn("Delete from backup store warning:", err);
  }
}

/**
 * Batch save multiple subject groups (e.g. when loading preset templates)
 */
export async function batchSaveSubjectGroups(groups: SubjectGroup[]): Promise<void> {
  const now = new Date().toISOString();
  for (const g of groups) {
    try {
      await setDoc(doc(db, "subject_groups", g.id), { ...g, updatedAt: now }, { merge: true });
    } catch (e) {}
  }

  try {
    await setDoc(doc(db, "roles", "subject_groups_store"), {
      list: groups,
      updatedAt: now
    }, { merge: true });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(groups));
  } catch (e) {}
}

export interface StandardPresetSubject {
  code: string;
  name: string;
  groupId: string;
  groupName: string;
  category: "Wajib" | "Peminatan" | "Muatan Lokal";
  major: string;
  kkm: number;
  creditHours: string;
  description: string;
}

/**
 * Standard Subject Definitions for SMA curriculum organized by Group & Major
 */
export const SMA_STANDARD_SUBJECTS: StandardPresetSubject[] = [
  // 1. Kelompok Mata Pelajaran Umum (Semua Jurusan)
  {
    code: "PAI",
    name: "Pendidikan Agama dan Budi Pekerti",
    groupId: "sg_sma_wajib_umum",
    groupName: "Kelompok Mata Pelajaran Umum",
    category: "Wajib",
    major: "Semua Jurusan / Umum",
    kkm: 75,
    creditHours: "3 JP",
    description: "Mata pelajaran wajib pengembangan iman, takwa, dan akhlak mulia."
  },
  {
    code: "PKN",
    name: "Pendidikan Pancasila",
    groupId: "sg_sma_wajib_umum",
    groupName: "Kelompok Mata Pelajaran Umum",
    category: "Wajib",
    major: "Semua Jurusan / Umum",
    kkm: 75,
    creditHours: "2 JP",
    description: "Mata pelajaran wajib nilai-nilai luhur Pancasila dan kewarganegaraan."
  },
  {
    code: "BIN",
    name: "Bahasa Indonesia",
    groupId: "sg_sma_wajib_umum",
    groupName: "Kelompok Mata Pelajaran Umum",
    category: "Wajib",
    major: "Semua Jurusan / Umum",
    kkm: 75,
    creditHours: "4 JP",
    description: "Mata pelajaran wajib literasi, penalaran teks, dan komunikasi nasional."
  },
  {
    code: "MAT",
    name: "Matematika",
    groupId: "sg_sma_wajib_umum",
    groupName: "Kelompok Mata Pelajaran Umum",
    category: "Wajib",
    major: "Semua Jurusan / Umum",
    kkm: 75,
    creditHours: "4 JP",
    description: "Mata pelajaran wajib logika, penalaran kuantitatif, dan pemecahan masalah."
  },
  {
    code: "BIG",
    name: "Bahasa Inggris",
    groupId: "sg_sma_wajib_umum",
    groupName: "Kelompok Mata Pelajaran Umum",
    category: "Wajib",
    major: "Semua Jurusan / Umum",
    kkm: 75,
    creditHours: "3 JP",
    description: "Mata pelajaran wajib kemahiran bahasa dan komunikasi global."
  },
  {
    code: "PJK",
    name: "PJOK",
    groupId: "sg_sma_wajib_umum",
    groupName: "Kelompok Mata Pelajaran Umum",
    category: "Wajib",
    major: "Semua Jurusan / Umum",
    kkm: 75,
    creditHours: "3 JP",
    description: "Pendidikan Jasmani, Olahraga, dan Kesehatan untuk kebugaran fisik dan sportivitas."
  },
  {
    code: "SEJ",
    name: "Sejarah",
    groupId: "sg_sma_wajib_umum",
    groupName: "Kelompok Mata Pelajaran Umum",
    category: "Wajib",
    major: "Semua Jurusan / Umum",
    kkm: 75,
    creditHours: "2 JP",
    description: "Mata pelajaran wajib perjalanan sejarah bangsa Indonesia dan wawasan kebangsaan."
  },

  // 2. Kelompok MIPA (Jurusan IPA)
  {
    code: "BIO",
    name: "Biologi",
    groupId: "sg_sma_peminatan_mipa",
    groupName: "Kelompok MIPA",
    category: "Peminatan",
    major: "IPA",
    kkm: 75,
    creditHours: "5 JP",
    description: "Mata pelajaran peminatan sains tentang biosfer, bioteknologi, dan sistem kehidupan."
  },
  {
    code: "FIS",
    name: "Fisika",
    groupId: "sg_sma_peminatan_mipa",
    groupName: "Kelompok MIPA",
    category: "Peminatan",
    major: "IPA",
    kkm: 75,
    creditHours: "5 JP",
    description: "Mata pelajaran peminatan sains tentang mekanika, gelombang, termodinamika, dan energi."
  },
  {
    code: "KIM",
    name: "Kimia",
    groupId: "sg_sma_peminatan_mipa",
    groupName: "Kelompok MIPA",
    category: "Peminatan",
    major: "IPA",
    kkm: 75,
    creditHours: "5 JP",
    description: "Mata pelajaran peminatan sains tentang ikatan kimia, reaksi, larutan, dan stoikiometri."
  },
  {
    code: "MTL",
    name: "Matematika Tingkat Lanjut",
    groupId: "sg_sma_peminatan_mipa",
    groupName: "Kelompok MIPA",
    category: "Peminatan",
    major: "IPA",
    kkm: 75,
    creditHours: "5 JP",
    description: "Mata pelajaran peminatan trigonometri lanjutan, kalkulus, dan matriks vektor."
  },

  // 3. Kelompok IPS (Jurusan IPS)
  {
    code: "EKO",
    name: "Ekonomi",
    groupId: "sg_sma_peminatan_ips",
    groupName: "Kelompok IPS",
    category: "Peminatan",
    major: "IPS",
    kkm: 75,
    creditHours: "5 JP",
    description: "Mata pelajaran peminatan sosial tentang pasar, moneter, akuntansi, dan kebijakan fiskal."
  },
  {
    code: "GEO",
    name: "Geografi",
    groupId: "sg_sma_peminatan_ips",
    groupName: "Kelompok IPS",
    category: "Peminatan",
    major: "IPS",
    kkm: 75,
    creditHours: "5 JP",
    description: "Mata pelajaran peminatan sosial tentang geosfer, pemetaan, dan dinamika lingkungan."
  },
  {
    code: "SOS",
    name: "Sosiologi",
    groupId: "sg_sma_peminatan_ips",
    groupName: "Kelompok IPS",
    category: "Peminatan",
    major: "IPS",
    kkm: 75,
    creditHours: "5 JP",
    description: "Mata pelajaran peminatan sosial tentang interaksi sosial, diferensiasi, dan perubahan sosial."
  },
  {
    code: "SJL",
    name: "Sejarah Tingkat Lanjut",
    groupId: "sg_sma_peminatan_ips",
    groupName: "Kelompok IPS",
    category: "Peminatan",
    major: "IPS",
    kkm: 75,
    creditHours: "5 JP",
    description: "Mata pelajaran peminatan sejarah peradaban dunia dan metodologi penelitian sejarah."
  },

  // 4. Kelompok Bahasa (Jurusan Bahasa)
  {
    code: "BSI",
    name: "Bahasa dan Sastra Indonesia",
    groupId: "sg_sma_peminatan_bahasa",
    groupName: "Kelompok Bahasa",
    category: "Peminatan",
    major: "Bahasa",
    kkm: 75,
    creditHours: "5 JP",
    description: "Mata pelajaran peminatan linguistik dan sastra Indonesia mendalam."
  },
  {
    code: "BSE",
    name: "Bahasa dan Sastra Inggris",
    groupId: "sg_sma_peminatan_bahasa",
    groupName: "Kelompok Bahasa",
    category: "Peminatan",
    major: "Bahasa",
    kkm: 75,
    creditHours: "5 JP",
    description: "Mata pelajaran peminatan kemahiran literatur dan ekspresi bahasa Inggris."
  },
  {
    code: "BSA",
    name: "Bahasa Asing Pilihan",
    groupId: "sg_sma_peminatan_bahasa",
    groupName: "Kelompok Bahasa",
    category: "Peminatan",
    major: "Bahasa",
    kkm: 75,
    creditHours: "5 JP",
    description: "Mata pelajaran peminatan kemahiran bahasa asing pilihan (Jepang / Jerman / Arab / Mandarin / Prancis)."
  },
  {
    code: "ANT",
    name: "Antropologi",
    groupId: "sg_sma_peminatan_bahasa",
    groupName: "Kelompok Bahasa",
    category: "Peminatan",
    major: "Bahasa",
    kkm: 75,
    creditHours: "5 JP",
    description: "Mata pelajaran peminatan studi kebudayaan, etnografi, dan ragam manusia."
  }
];

/**
 * Synchronize full SMA Curriculum Structure (Groups and Subjects) into Firestore
 */
export async function syncSmaCurriculumStructureToDb(): Promise<{
  groupsCount: number;
  subjectsCount: number;
}> {
  const groups = getPresetSubjectGroups("SMA");

  // Ambil daftar mata pelajaran yang ada di Firestore subjects
  let existingSubjects: any[] = [];
  try {
    const snap = await getDocs(collection(db, "subjects"));
    existingSubjects = snap.docs.map(d => ({ _docId: d.id, ...d.data() }));
  } catch (err) {
    console.warn("Could not fetch existing subjects for sync:", err);
  }

  let syncedSubjects = 0;
  const groupSubjectIdsMap: Record<string, string[]> = {
    sg_sma_wajib_umum: ["PAI", "PKN", "BIN", "MAT", "BIG", "PJK", "SEJ"],
    sg_sma_peminatan_mipa: ["BIO", "FIS", "KIM", "MTL"],
    sg_sma_peminatan_ips: ["EKO", "GEO", "SOS", "SJL"],
    sg_sma_peminatan_bahasa: ["BSI", "BSE", "BSA", "ANT"],
    sg_sma_mulok: ["BHD", "PLH"]
  };

  for (const std of SMA_STANDARD_SUBJECTS) {
    // Cari dokumen yang cocok berdasarkan kode atau nama
    const match = existingSubjects.find((s: any) => 
      (s.code && String(s.code).toUpperCase().trim() === std.code.toUpperCase().trim()) ||
      (s.name && s.name.toLowerCase().trim() === std.name.toLowerCase().trim())
    );

    const payload = {
      code: std.code,
      name: std.name,
      groupId: std.groupId,
      groupName: std.groupName,
      category: std.category,
      major: std.major,
      kkm: std.kkm,
      creditHours: std.creditHours,
      description: std.description,
      status: "Aktif",
      level: "Semua Tingkat",
      updatedAt: serverTimestamp()
    };

    let docId = match?._docId;

    if (match && docId) {
      await setDoc(doc(db, "subjects", docId), payload, { merge: true });
    } else {
      const docRef = await addDoc(collection(db, "subjects"), {
        ...payload,
        icon: std.category === "Wajib" ? "📚" : "🔬",
        createdAt: serverTimestamp()
      });
      docId = docRef.id;
    }

    if (docId && std.groupId && groupSubjectIdsMap[std.groupId]) {
      if (!groupSubjectIdsMap[std.groupId].includes(docId)) {
        groupSubjectIdsMap[std.groupId].push(docId);
      }
    }

    syncedSubjects++;
  }

  // Update subject groups with both subject codes and document IDs
  const updatedGroups = groups.map(g => ({
    ...g,
    subjectIds: groupSubjectIdsMap[g.id] || g.subjectIds || []
  }));

  await batchSaveSubjectGroups(updatedGroups);

  return {
    groupsCount: updatedGroups.length,
    subjectsCount: syncedSubjects
  };
}
