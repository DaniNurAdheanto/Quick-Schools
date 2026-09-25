import { 
  Firestore, 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  writeBatch 
} from "firebase/firestore";
import type { SubjectGroup } from "@/lib/subject-groups";
import { saveSubjectGroupToDb } from "@/lib/subject-groups";
import { syncSubjectTeacherRelations } from "@/lib/subject-teacher-relations";

export interface SubjectInputData {
  code: string;
  name: string;
  groupId: string;
  groupName?: string;
  major: string;
  category: "Wajib" | "Peminatan" | "Muatan Lokal";
  creditHours: string;
  kkm: number;
  level: string;
  teacherIds: string[];
  description?: string;
  status: "Aktif" | "Nonaktif";
}

export interface SaveSubjectParams {
  db: Firestore;
  mode: "create" | "edit";
  subjectId?: string; // _firestoreId or id
  data: SubjectInputData;
  previousSubject?: any;
  allTeachers: any[];
  allSubjectGroups: SubjectGroup[];
}

export interface DeleteSubjectParams {
  db: Firestore;
  subjectId: string;
  subject: any;
  allTeachers: any[];
  allSubjectGroups: SubjectGroup[];
}

/**
 * Saves a subject (create or edit) and automatically cascades updates to:
 * 1. subjects collection
 * 2. subject_groups (maintains group membership & unlinks from old groups)
 * 3. teachers (syncs subjectIds and subjects arrays)
 * 4. schedules (updates subject name & ID if modified)
 * 5. grades (updates subject name & ID if modified)
 */
export async function saveSubjectWithCascade({
  db,
  mode,
  subjectId,
  data,
  previousSubject,
  allTeachers,
  allSubjectGroups,
}: SaveSubjectParams): Promise<{
  docId: string;
  schedulesUpdated: number;
  gradesUpdated: number;
}> {
  const cleanCode = (data.code || "").toUpperCase().trim();
  const cleanName = (data.name || "").trim();
  const cleanGroupId = (data.groupId || "").trim();

  // 1. Resolve selected group info
  const selectedGroup = allSubjectGroups.find(g => g.id === cleanGroupId);
  const groupName = selectedGroup ? selectedGroup.name : (data.groupName || "");
  const major = data.major || (selectedGroup && selectedGroup.major !== "Semua Jurusan / Umum" ? selectedGroup.major : "Semua Jurusan / Umum");

  // 2. Resolve teacher entities
  const rawTeacherIds = Array.isArray(data.teacherIds) ? data.teacherIds : [];
  const selectedTeachers = allTeachers.filter(t => {
    const tid = (t.id || "").toLowerCase();
    const tdoc = (t._firestoreId || "").toLowerCase();
    const tnip = (t.nip || "").toLowerCase();
    return rawTeacherIds.some(rid => {
      const norm = rid.toLowerCase().trim();
      return norm === tid || norm === tdoc || norm === tnip;
    });
  });

  const teacherIds = selectedTeachers.map(t => t.id || t._firestoreId || t.nip).filter((id): id is string => Boolean(id));
  const teachersDenorm = selectedTeachers.map(t => ({
    id: t.id || t._firestoreId || t.nip,
    name: t.name,
    nip: t.nip || ""
  }));
  const teacherString = teachersDenorm.map(t => t.name).join(", ") || (rawTeacherIds.length > 0 ? "Guru Pengajar Ditugaskan" : "-");

  const now = new Date().toISOString();
  const payload = {
    code: cleanCode,
    name: cleanName,
    groupId: cleanGroupId,
    groupName,
    major,
    category: data.category || (selectedGroup ? selectedGroup.category : "Wajib"),
    creditHours: data.creditHours || "3 JP",
    kkm: Number(data.kkm) || 75,
    level: data.level || "Semua Tingkat",
    teacherIds,
    teachers: teachersDenorm,
    teacher: teacherString,
    description: (data.description || "").trim(),
    status: data.status || "Aktif",
    updatedAt: now
  };

  let targetDocId = subjectId || previousSubject?._firestoreId || previousSubject?.id;

  // 3. Save to subjects collection
  if (mode === "create" || !targetDocId) {
    const docRef = await addDoc(collection(db, "subjects"), {
      ...payload,
      createdAt: now
    });
    targetDocId = docRef.id;
  } else {
    await setDoc(doc(db, "subjects", targetDocId), payload, { merge: true });
  }

  // 4. Synchronize with subject_groups
  for (const group of allSubjectGroups) {
    const groupSubjectIds: string[] = Array.isArray(group.subjectIds) ? [...group.subjectIds] : [];
    const hasThisSubject = groupSubjectIds.includes(targetDocId) || groupSubjectIds.includes(cleanCode) || (previousSubject?.code && groupSubjectIds.includes(previousSubject.code));

    if (group.id === cleanGroupId) {
      // Must include targetDocId
      if (!groupSubjectIds.includes(targetDocId)) {
        groupSubjectIds.push(targetDocId);
        await saveSubjectGroupToDb({
          ...group,
          subjectIds: groupSubjectIds,
          updatedAt: now
        });
      }
    } else {
      // Unlink from other groups to prevent duplicate or stale relationships
      if (hasThisSubject) {
        const filtered = groupSubjectIds.filter(id => id !== targetDocId && id !== cleanCode && id !== previousSubject?.code);
        await saveSubjectGroupToDb({
          ...group,
          subjectIds: filtered,
          updatedAt: now
        });
      }
    }
  }

  // 5. Synchronize teacher-subject relations (both directions)
  await syncSubjectTeacherRelations(db, targetDocId, teacherIds, allTeachers, {
    code: cleanCode,
    name: cleanName,
    category: payload.category
  });

  // 6. Cascade to schedules if name or code changed
  let schedulesUpdated = 0;
  const oldName = previousSubject?.name ? previousSubject.name.trim() : "";
  const oldCode = previousSubject?.code ? previousSubject.code.trim() : "";
  const isNameChanged = oldName && oldName.toLowerCase() !== cleanName.toLowerCase();
  const isCodeChanged = oldCode && oldCode.toUpperCase() !== cleanCode.toUpperCase();

  if (mode === "edit" && (isNameChanged || isCodeChanged)) {
    try {
      const snapSchedules = await getDocs(query(collection(db, "schedules")));
      const schedBatch = writeBatch(db);

      snapSchedules.forEach(d => {
        const s = d.data();
        const matchesId = s.subjectId && (s.subjectId === targetDocId || s.subjectId === oldCode);
        const matchesName = s.subject && oldName && s.subject.toLowerCase().trim() === oldName.toLowerCase();

        if (matchesId || matchesName) {
          schedBatch.update(doc(db, "schedules", d.id), {
            subject: cleanName,
            subjectId: targetDocId,
            updatedAt: now
          });
          schedulesUpdated++;
        }
      });

      if (schedulesUpdated > 0) {
        await schedBatch.commit();
      }
    } catch (err) {
      console.warn("Cascade schedule update warning:", err);
    }
  }

  // 7. Cascade to grades if subject name changed
  let gradesUpdated = 0;
  if (mode === "edit" && isNameChanged) {
    try {
      const snapGrades = await getDocs(query(collection(db, "grades")));
      const gradeBatch = writeBatch(db);

      snapGrades.forEach(d => {
        const g = d.data();
        const matchesName = g.subject && oldName && g.subject.toLowerCase().trim() === oldName.toLowerCase();
        const matchesId = g.subjectId && (g.subjectId === targetDocId || g.subjectId === oldCode);

        if (matchesName || matchesId) {
          gradeBatch.update(doc(db, "grades", d.id), {
            subject: cleanName,
            subjectId: targetDocId,
            updatedAt: now
          });
          gradesUpdated++;
        }
      });

      if (gradesUpdated > 0) {
        await gradeBatch.commit();
      }
    } catch (err) {
      console.warn("Cascade grades update warning:", err);
    }
  }

  return {
    docId: targetDocId,
    schedulesUpdated,
    gradesUpdated
  };
}

/**
 * Deletes a subject with full cascading cleanup across:
 * 1. subjects collection
 * 2. subject_groups (removes subject ID from all groups)
 * 3. teachers (removes subject from teachers' subjects and subjectIds)
 * 4. schedules (safely marks as nonaktif / unlinked)
 */
export async function deleteSubjectWithCascade({
  db,
  subjectId,
  subject,
  allTeachers,
  allSubjectGroups,
}: DeleteSubjectParams): Promise<{
  deletedId: string;
  groupsCleaned: number;
  schedulesCleaned: number;
}> {
  const cleanId = subjectId || subject._firestoreId || subject.id;
  const cleanCode = (subject.code || "").toUpperCase().trim();
  const cleanName = (subject.name || "").trim();
  const now = new Date().toISOString();

  // 1. Delete document from 'subjects'
  await deleteDoc(doc(db, "subjects", cleanId));

  // 2. Remove subject from all subject groups
  let groupsCleaned = 0;
  for (const group of allSubjectGroups) {
    const groupSubjectIds: string[] = Array.isArray(group.subjectIds) ? [...group.subjectIds] : [];
    if (groupSubjectIds.includes(cleanId) || groupSubjectIds.includes(cleanCode)) {
      const filtered = groupSubjectIds.filter(id => id !== cleanId && id !== cleanCode);
      await saveSubjectGroupToDb({
        ...group,
        subjectIds: filtered,
        updatedAt: now
      });
      groupsCleaned++;
    }
  }

  // 3. Remove subject from assigned teachers
  await syncSubjectTeacherRelations(db, cleanId, [], allTeachers, {
    code: cleanCode,
    name: cleanName
  });

  // 4. Safely update any referencing schedules
  let schedulesCleaned = 0;
  try {
    const snapSchedules = await getDocs(query(collection(db, "schedules")));
    const schedBatch = writeBatch(db);

    snapSchedules.forEach(d => {
      const s = d.data();
      const matchesId = s.subjectId && (s.subjectId === cleanId || s.subjectId === cleanCode);
      const matchesName = s.subject && cleanName && s.subject.toLowerCase().trim() === cleanName.toLowerCase();

      if (matchesId || matchesName) {
        schedBatch.update(doc(db, "schedules", d.id), {
          subject: `${cleanName} (Nonaktif)`,
          status: "Nonaktif",
          updatedAt: now
        });
        schedulesCleaned++;
      }
    });

    if (schedulesCleaned > 0) {
      await schedBatch.commit();
    }
  } catch (err) {
    console.warn("Cascade schedules cleanup warning:", err);
  }

  return {
    deletedId: cleanId,
    groupsCleaned,
    schedulesCleaned
  };
}
