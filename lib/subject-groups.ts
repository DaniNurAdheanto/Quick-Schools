import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDoc,
  query,
  orderBy
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
        name: "Kelompok Mata Pelajaran Umum (Wajib)",
        category: "Wajib",
        major: "Semua Jurusan / Umum",
        level: "Semua Tingkat",
        description: "Mata pelajaran wajib kurikulum nasional untuk seluruh rombel peminatan.",
        subjectIds: [],
        order: 1,
        status: "Aktif",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "sg_sma_peminatan_mipa",
        code: "C-MIPA",
        name: "Kelompok Peminatan Matematika & IPA (MIPA)",
        category: "Peminatan",
        major: "IPA",
        level: "Kelas 10-12",
        description: "Mata pelajaran peminatan sains (Fisika, Kimia, Biologi, Matematika Peminatan).",
        subjectIds: [],
        order: 2,
        status: "Aktif",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "sg_sma_peminatan_ips",
        code: "C-IPS",
        name: "Kelompok Peminatan Ilmu Pengetahuan Sosial (IPS)",
        category: "Peminatan",
        major: "IPS",
        level: "Kelas 10-12",
        description: "Mata pelajaran peminatan sosial humaniora (Ekonomi, Sosiologi, Geografi, Sejarah Peminatan).",
        subjectIds: [],
        order: 3,
        status: "Aktif",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "sg_sma_peminatan_bahasa",
        code: "C-BHS",
        name: "Kelompok Peminatan Bahasa & Budaya",
        category: "Peminatan",
        major: "Bahasa",
        level: "Kelas 10-12",
        description: "Mata pelajaran sastra dan bahasa asing pilihan.",
        subjectIds: [],
        order: 4,
        status: "Aktif",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "sg_sma_mulok",
        code: "MULOK",
        name: "Muatan Lokal & Lintas Minat",
        category: "Muatan Lokal",
        major: "Semua Jurusan / Umum",
        level: "Semua Tingkat",
        description: "Kearifan lokal daerah dan mata pelajaran lintas minat.",
        subjectIds: [],
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
