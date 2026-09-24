import { 
  Firestore, 
  writeBatch, 
  doc 
} from "firebase/firestore";

export interface SubjectTeacherRef {
  id: string;
  name: string;
  nip?: string;
  email?: string;
}

export interface SubjectEntity {
  _firestoreId?: string;
  id?: string;
  code: string;
  name: string;
  category?: string;
  creditHours?: string;
  kkm?: number;
  level?: string;
  teacher?: string; // Fallback string (e.g., "Pak Budi, Bu Siti")
  teacherIds?: string[]; // IDs of assigned teachers
  teachers?: SubjectTeacherRef[]; // Denormalized teacher records
  description?: string;
  status?: string;
  [key: string]: any;
}

export interface TeacherSubjectRef {
  id: string;
  code: string;
  name: string;
  category?: string;
}

export interface TeacherEntity {
  _firestoreId?: string;
  id?: string;
  nip?: string;
  name: string;
  role?: string; // Fallback string (e.g., "Matematika, Fisika")
  subject?: string; // Fallback string
  subjectIds?: string[]; // IDs of subjects taught
  subjects?: string[]; // Names of subjects taught
  contact?: string;
  phone?: string;
  status?: string;
  classes?: string[];
  [key: string]: any;
}

/**
 * Normalizes string identifiers for robust ID matching
 */
export function normalizeId(id: string | null | undefined): string {
  if (!id) return "";
  return id.trim().toLowerCase();
}

/**
 * Normalizes subject names for fallback matching
 */
export function normalizeSubjectName(name: string | null | undefined): string {
  if (!name) return "";
  return name.trim().toLowerCase().replace(/[\s\-_]/g, "");
}

/**
 * Gets all teacher entities assigned to a given subject
 * Uses teacherIds and teachers array first, with fallback to legacy teacher name string.
 */
export function getTeachersForSubject(subject: SubjectEntity, allTeachers: TeacherEntity[]): TeacherEntity[] {
  if (!subject) return [];

  const matchedTeachers = new Map<string, TeacherEntity>();

  // 1. Match by teacherIds array
  const sTeacherIds = Array.isArray(subject.teacherIds) ? subject.teacherIds : [];
  if (sTeacherIds.length > 0) {
    const idSet = new Set(sTeacherIds.map(id => normalizeId(id)));
    allTeachers.forEach(t => {
      const tId = normalizeId(t.id || t._firestoreId || t.nip);
      const tDocId = normalizeId(t._firestoreId);
      const tNip = normalizeId(t.nip);
      if (idSet.has(tId) || (tDocId && idSet.has(tDocId)) || (tNip && idSet.has(tNip))) {
        matchedTeachers.set(t._firestoreId || t.id || t.name, t);
      }
    });
  }

  // 2. Match by denormalized teachers array
  if (Array.isArray(subject.teachers)) {
    subject.teachers.forEach(st => {
      const targetId = normalizeId(st.id);
      const found = allTeachers.find(t => 
        normalizeId(t.id) === targetId || 
        normalizeId(t._firestoreId) === targetId || 
        normalizeId(t.nip) === targetId ||
        (st.name && t.name && t.name.toLowerCase() === st.name.toLowerCase())
      );
      if (found) {
        matchedTeachers.set(found._firestoreId || found.id || found.name, found);
      }
    });
  }

  // 3. Match from teacher's own subjectIds or subjects list
  const subDocId = normalizeId(subject._firestoreId || subject.id);
  const subCode = normalizeId(subject.code);
  const subName = normalizeSubjectName(subject.name);

  allTeachers.forEach(t => {
    // Check subjectIds
    if (Array.isArray(t.subjectIds)) {
      const hasSubjectId = t.subjectIds.some(sId => {
        const norm = normalizeId(sId);
        return norm === subDocId || (subCode && norm === subCode);
      });
      if (hasSubjectId) {
        matchedTeachers.set(t._firestoreId || t.id || t.name, t);
      }
    }

    // Check subjects string array
    if (Array.isArray(t.subjects)) {
      const hasSubjectName = t.subjects.some(sName => {
        return normalizeSubjectName(sName) === subName;
      });
      if (hasSubjectName) {
        matchedTeachers.set(t._firestoreId || t.id || t.name, t);
      }
    }

    // Legacy fallback: t.role or t.subject string contains subject name
    const legacyRole = (t.role || t.subject || "").toLowerCase();
    if (legacyRole && subName && (
      legacyRole === subject.name?.toLowerCase() ||
      legacyRole.includes(subject.name?.toLowerCase() || "___")
    )) {
      matchedTeachers.set(t._firestoreId || t.id || t.name, t);
    }
  });

  // 4. Legacy fallback from subject.teacher string
  if (matchedTeachers.size === 0 && subject.teacher && subject.teacher !== "-") {
    const rawTeachers = subject.teacher.split(/[,;&]/).map(s => s.trim().toLowerCase());
    allTeachers.forEach(t => {
      const tName = (t.name || "").trim().toLowerCase();
      if (rawTeachers.some(rt => rt === tName || (tName.length > 5 && rt.includes(tName)) || (rt.length > 5 && tName.includes(rt)))) {
        matchedTeachers.set(t._firestoreId || t.id || t.name, t);
      }
    });
  }

  return Array.from(matchedTeachers.values());
}

/**
 * Gets all subject entities taught by a given teacher
 */
export function getSubjectsForTeacher(teacher: TeacherEntity, allSubjects: SubjectEntity[]): SubjectEntity[] {
  if (!teacher) return [];

  const matchedSubjects = new Map<string, SubjectEntity>();
  const tDocId = normalizeId(teacher._firestoreId);
  const tId = normalizeId(teacher.id);
  const tNip = normalizeId(teacher.nip);
  const tName = (teacher.name || "").trim().toLowerCase();

  // 1. From teacher's subjectIds
  if (Array.isArray(teacher.subjectIds) && teacher.subjectIds.length > 0) {
    const sIdSet = new Set(teacher.subjectIds.map(id => normalizeId(id)));
    allSubjects.forEach(s => {
      const sDocId = normalizeId(s._firestoreId);
      const sId = normalizeId(s.id);
      const sCode = normalizeId(s.code);
      if (sIdSet.has(sDocId) || sIdSet.has(sId) || sIdSet.has(sCode)) {
        matchedSubjects.set(s._firestoreId || s.id || s.name, s);
      }
    });
  }

  // 2. From teacher's subjects array
  if (Array.isArray(teacher.subjects) && teacher.subjects.length > 0) {
    const sNameSet = new Set(teacher.subjects.map(s => normalizeSubjectName(s)));
    allSubjects.forEach(s => {
      if (sNameSet.has(normalizeSubjectName(s.name))) {
        matchedSubjects.set(s._firestoreId || s.id || s.name, s);
      }
    });
  }

  // 3. From subjects collection where teacherIds includes this teacher
  allSubjects.forEach(s => {
    if (Array.isArray(s.teacherIds)) {
      const hasTeacherId = s.teacherIds.some(tid => {
        const norm = normalizeId(tid);
        return norm === tDocId || norm === tId || (tNip && norm === tNip);
      });
      if (hasTeacherId) {
        matchedSubjects.set(s._firestoreId || s.id || s.name, s);
      }
    }

    if (Array.isArray(s.teachers)) {
      const hasTeacherObj = s.teachers.some(to => {
        const norm = normalizeId(to.id);
        return norm === tDocId || norm === tId || (tNip && norm === tNip) || (to.name && to.name.toLowerCase() === tName);
      });
      if (hasTeacherObj) {
        matchedSubjects.set(s._firestoreId || s.id || s.name, s);
      }
    }

    // Fallback: subject.teacher string matches teacher name
    if (s.teacher && s.teacher !== "-" && tName) {
      const rawTeachers = s.teacher.split(/[,;&]/).map(item => item.trim().toLowerCase());
      if (rawTeachers.some(rt => rt === tName || (tName.length > 5 && rt.includes(tName)) || (rt.length > 5 && tName.includes(rt)))) {
        matchedSubjects.set(s._firestoreId || s.id || s.name, s);
      }
    }
  });

  // 4. Legacy fallback: teacher.role or teacher.subject string matches subject.name
  const legacyRole = (teacher.role || teacher.subject || "").trim();
  if (matchedSubjects.size === 0 && legacyRole && legacyRole !== "-") {
    const rawRoles = legacyRole.split(/[,;&]/).map(r => normalizeSubjectName(r));
    allSubjects.forEach(s => {
      const norm = normalizeSubjectName(s.name);
      if (rawRoles.some(rr => rr === norm || (norm.length > 3 && rr.includes(norm)))) {
        matchedSubjects.set(s._firestoreId || s.id || s.name, s);
      }
    });
  }

  return Array.from(matchedSubjects.values());
}

/**
 * Checks whether a teacher is assigned to teach a specific subject
 */
export function isTeacherAssignedToSubject(teacher: TeacherEntity, subject: SubjectEntity): boolean {
  if (!teacher || !subject) return false;

  const tDocId = normalizeId(teacher._firestoreId);
  const tId = normalizeId(teacher.id);
  const tNip = normalizeId(teacher.nip);
  const tName = (teacher.name || "").trim().toLowerCase();

  const sDocId = normalizeId(subject._firestoreId);
  const sId = normalizeId(subject.id);
  const sCode = normalizeId(subject.code);
  const sName = normalizeSubjectName(subject.name);

  // Check subject.teacherIds
  if (Array.isArray(subject.teacherIds)) {
    for (const tid of subject.teacherIds) {
      const norm = normalizeId(tid);
      if (norm && (norm === tDocId || norm === tId || norm === tNip)) {
        return true;
      }
    }
  }

  // Check subject.teachers array
  if (Array.isArray(subject.teachers)) {
    for (const to of subject.teachers) {
      const norm = normalizeId(to.id);
      if (norm && (norm === tDocId || norm === tId || norm === tNip)) {
        return true;
      }
      if (to.name && to.name.toLowerCase() === tName) {
        return true;
      }
    }
  }

  // Check teacher.subjectIds
  if (Array.isArray(teacher.subjectIds)) {
    for (const sid of teacher.subjectIds) {
      const norm = normalizeId(sid);
      if (norm && (norm === sDocId || norm === sId || norm === sCode)) {
        return true;
      }
    }
  }

  // Check teacher.subjects
  if (Array.isArray(teacher.subjects)) {
    for (const sn of teacher.subjects) {
      if (normalizeSubjectName(sn) === sName) {
        return true;
      }
    }
  }

  // Check legacy string matching
  if (subject.teacher && subject.teacher !== "-" && tName) {
    const raw = subject.teacher.split(/[,;&]/).map(item => item.trim().toLowerCase());
    if (raw.some(item => item === tName || (tName.length > 5 && item.includes(tName)) || (item.length > 5 && tName.includes(item)))) {
      return true;
    }
  }

  const legacyRole = (teacher.role || teacher.subject || "").trim();
  if (legacyRole && legacyRole !== "-" && sName) {
    const raw = legacyRole.split(/[,;&]/).map(item => normalizeSubjectName(item));
    if (raw.some(item => item === sName || (sName.length > 3 && item.includes(sName)))) {
      return true;
    }
  }

  return false;
}

/**
 * Syncs teacher data when a subject's teacherIds change (two-way sync)
 */
export async function syncSubjectTeacherRelations(
  db: Firestore,
  subjectDocId: string,
  newTeacherIds: string[],
  allTeachers: TeacherEntity[],
  subjectInfo: { code: string; name: string; category?: string }
): Promise<void> {
  if (!subjectDocId || !db) return;

  try {
    const batch = writeBatch(db);
    const targetIdsSet = new Set(newTeacherIds.map(id => normalizeId(id)));

    for (const teacher of allTeachers) {
      const tDocId = teacher._firestoreId;
      if (!tDocId) continue;

      const tKeyId = normalizeId(teacher.id || teacher._firestoreId || teacher.nip);
      const isAssigned = targetIdsSet.has(tKeyId) || targetIdsSet.has(normalizeId(tDocId)) || (teacher.nip && targetIdsSet.has(normalizeId(teacher.nip)));

      const currentSubjectIds: string[] = Array.isArray(teacher.subjectIds) ? [...teacher.subjectIds] : [];
      const currentSubjects: string[] = Array.isArray(teacher.subjects) ? [...teacher.subjects] : [];

      const hasSubjectId = currentSubjectIds.some(id => normalizeId(id) === normalizeId(subjectDocId) || normalizeId(id) === normalizeId(subjectInfo.code));
      const hasSubjectName = currentSubjects.some(name => normalizeSubjectName(name) === normalizeSubjectName(subjectInfo.name));

      let changed = false;

      if (isAssigned) {
        if (!hasSubjectId) {
          currentSubjectIds.push(subjectDocId);
          changed = true;
        }
        if (!hasSubjectName) {
          currentSubjects.push(subjectInfo.name);
          changed = true;
        }
      } else {
        if (hasSubjectId) {
          const filtered = currentSubjectIds.filter(id => normalizeId(id) !== normalizeId(subjectDocId) && normalizeId(id) !== normalizeId(subjectInfo.code));
          currentSubjectIds.length = 0;
          currentSubjectIds.push(...filtered);
          changed = true;
        }
        if (hasSubjectName) {
          const filtered = currentSubjects.filter(name => normalizeSubjectName(name) !== normalizeSubjectName(subjectInfo.name));
          currentSubjects.length = 0;
          currentSubjects.push(...filtered);
          changed = true;
        }
      }

      if (changed) {
        const roleString = currentSubjects.join(", ") || teacher.role || teacher.subject || "";
        const allDocIdsToUpdate = Array.from(new Set([tDocId, ...(teacher._allDocIds || [])])).filter(Boolean);
        for (const docIdToSync of allDocIdsToUpdate) {
          const teacherRef = doc(db, "teachers", docIdToSync);
          batch.set(teacherRef, {
            subjectIds: currentSubjectIds,
            subjects: currentSubjects,
            role: roleString,
            subject: roleString,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }

        // Also update users/{uid} if teacher has linked uid
        const userUid = teacher.uid;
        if (userUid && typeof userUid === "string" && userUid.length >= 10) {
          try {
            const userRef = doc(db, "users", userUid);
            batch.set(userRef, {
              subjectIds: currentSubjectIds,
              subjects: currentSubjects,
              subject: roleString,
              updatedAt: new Date().toISOString()
            }, { merge: true });
          } catch {
            // Ignore if users doc doesn't exist
          }
        }
      }
    }

    await batch.commit();
  } catch (err) {
    console.warn("syncSubjectTeacherRelations error:", err);
  }
}

/**
 * Syncs subject data when a teacher's subjectIds change (two-way sync)
 */
export async function syncTeacherSubjectRelations(
  db: Firestore,
  teacherDocId: string,
  newSubjectIds: string[],
  allSubjects: SubjectEntity[],
  teacherInfo: { id: string; name: string; nip?: string }
): Promise<void> {
  if (!teacherDocId || !db) return;

  try {
    const batch = writeBatch(db);
    const targetSubjectIdsSet = new Set(newSubjectIds.map(id => normalizeId(id)));
    const targetTeacherKey = teacherInfo.id || teacherDocId;

    for (const subject of allSubjects) {
      const sDocId = subject._firestoreId;
      if (!sDocId) continue;

      const sKey = normalizeId(subject._firestoreId || subject.id || subject.code);
      const isAssigned = targetSubjectIdsSet.has(sKey) || targetSubjectIdsSet.has(normalizeId(sDocId)) || targetSubjectIdsSet.has(normalizeId(subject.code));

      const currentTeacherIds: string[] = Array.isArray(subject.teacherIds) ? [...subject.teacherIds] : [];
      let currentTeachers: SubjectTeacherRef[] = Array.isArray(subject.teachers) ? [...subject.teachers] : [];

      const hasTeacherId = currentTeacherIds.some(id => 
        normalizeId(id) === normalizeId(targetTeacherKey) || 
        normalizeId(id) === normalizeId(teacherDocId) ||
        (teacherInfo.nip && normalizeId(id) === normalizeId(teacherInfo.nip))
      );

      let changed = false;

      if (isAssigned) {
        if (!hasTeacherId) {
          currentTeacherIds.push(targetTeacherKey);
          changed = true;
        }
        if (!currentTeachers.some(t => normalizeId(t.id) === normalizeId(targetTeacherKey) || (t.name && t.name === teacherInfo.name))) {
          currentTeachers.push({
            id: targetTeacherKey,
            name: teacherInfo.name,
            nip: teacherInfo.nip || ""
          });
          changed = true;
        }
      } else {
        if (hasTeacherId) {
          const filtered = currentTeacherIds.filter(id => 
            normalizeId(id) !== normalizeId(targetTeacherKey) && 
            normalizeId(id) !== normalizeId(teacherDocId) &&
            (!teacherInfo.nip || normalizeId(id) !== normalizeId(teacherInfo.nip))
          );
          currentTeacherIds.length = 0;
          currentTeacherIds.push(...filtered);
          changed = true;
        }
        const filteredObj = currentTeachers.filter(t => 
          normalizeId(t.id) !== normalizeId(targetTeacherKey) && 
          normalizeId(t.id) !== normalizeId(teacherDocId) &&
          t.name !== teacherInfo.name
        );
        if (filteredObj.length !== currentTeachers.length) {
          currentTeachers = filteredObj;
          changed = true;
        }
      }

      if (changed) {
        const subjectRef = doc(db, "subjects", sDocId);
        const teacherString = currentTeachers.map(t => t.name).join(", ") || (currentTeacherIds.length > 0 ? teacherInfo.name : "-");
        batch.update(subjectRef, {
          teacherIds: currentTeacherIds,
          teachers: currentTeachers,
          teacher: teacherString,
          updatedAt: new Date().toISOString()
        });
      }
    }

    await batch.commit();
  } catch (err) {
    console.warn("syncTeacherSubjectRelations error:", err);
  }
}
