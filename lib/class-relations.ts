import { 
  Firestore, 
  collection, 
  getDocs, 
  writeBatch, 
  doc, 
  arrayUnion, 
  updateDoc 
} from "firebase/firestore";

export interface ClassEntity {
  id?: string;
  _firestoreId?: string;
  name: string;
  level?: string;
  major?: string;
  homeroom?: string;
  maxCapacity?: number;
  status?: string;
  previousNames?: string[];
  [key: string]: any;
}

export interface StudentEntity {
  id?: string;
  _firestoreId?: string;
  uid?: string;
  name?: string;
  fullName?: string;
  classId?: string;
  className?: string;
  class?: string;
  kelas?: string;
  classDocId?: string;
  status?: string;
  [key: string]: any;
}

/**
 * Normalizes strings for robust, fault-tolerant comparisons (case-insensitive, trims & strips extra whitespace).
 */
export function normalizeClassName(val: string | null | undefined): string {
  if (!val) return "";
  return val.toLowerCase().replace(/[\s\-_]/g, "").trim();
}

/**
 * Checks whether a student is enrolled in a specific class, using multiple fallbacks:
 * 1. Permanent Class Doc ID (classDocId === class._firestoreId or class.id)
 * 2. Class Unique ID (classId === class._firestoreId or class.id)
 * 3. Exact / Normalized current class name
 * 4. Historical class names (previousNames)
 */
export function isStudentInClass(student: StudentEntity, classObj: ClassEntity): boolean {
  if (!student || !classObj) return false;

  const targetClassDocId = classObj._firestoreId || classObj.id || "";
  const targetClassId = classObj.id || classObj._firestoreId || "";
  const targetCurrentName = (classObj.name || "").trim();
  const normalizedTargetName = normalizeClassName(targetCurrentName);

  // 1. Direct match by unique Firestore ID
  if (student.classDocId && targetClassDocId && student.classDocId === targetClassDocId) {
    return true;
  }
  if (student.classId && targetClassDocId && student.classId === targetClassDocId) {
    return true;
  }
  if (student.classId && targetClassId && student.classId === targetClassId) {
    return true;
  }

  // 2. Match by student class string fields
  const studentClassStrings = [
    student.className,
    student.classId,
    student.class,
    student.kelas,
  ].filter(Boolean) as string[];

  for (const str of studentClassStrings) {
    const trimmed = str.trim();
    if (!trimmed || trimmed === "-" || trimmed === "Semua Kelas") continue;

    // Direct string equality
    if (trimmed.toLowerCase() === targetCurrentName.toLowerCase()) {
      return true;
    }

    // Normalized comparison (e.g. "12 MIPA 1" vs "12-MIPA-1" vs "12MIPA1")
    const norm = normalizeClassName(trimmed);
    if (norm && norm === normalizedTargetName) {
      return true;
    }

    // Check historical / previous names
    if (Array.isArray(classObj.previousNames) && classObj.previousNames.length > 0) {
      for (const prev of classObj.previousNames) {
        if (!prev) continue;
        if (trimmed.toLowerCase() === prev.toLowerCase().trim()) return true;
        if (norm === normalizeClassName(prev)) return true;
      }
    }
  }

  return false;
}

/**
 * Performs a cascade update across all collections when a class is modified:
 * - Updates the class document with previousNames history.
 * - Updates all enrolled students in `students` and `users` collections.
 * - Updates schedules in `schedules` collection.
 * - Updates exams in `examSchedules` collection.
 * - Updates teacher homeroom references in `teachers` collection.
 */
export async function cascadeUpdateClassRelations(
  db: Firestore,
  existingClass: ClassEntity,
  updatedFields: Partial<ClassEntity>
): Promise<{ studentsUpdated: number; schedulesUpdated: number; examsUpdated: number }> {
  const oldName = (existingClass.name || "").trim();
  const newName = (updatedFields.name || oldName).trim();
  const classDocId = existingClass._firestoreId || existingClass.id;
  const isNameChanged = oldName !== "" && newName !== "" && oldName.toLowerCase() !== newName.toLowerCase();

  let studentsCount = 0;
  let schedulesCount = 0;
  let examsCount = 0;

  // 1. Update the class document itself
  if (classDocId) {
    const classRef = doc(db, "classes", classDocId);
    const updatePayload: any = {
      ...updatedFields,
      name: newName,
      updatedAt: new Date().toISOString()
    };

    if (isNameChanged) {
      // Record old name into previousNames array
      updatePayload.previousNames = arrayUnion(oldName);
    }

    await updateDoc(classRef, updatePayload);
  }

  // If the class name has not changed, we don't need cascade text updates to child documents
  if (!isNameChanged) {
    return { studentsUpdated: 0, schedulesUpdated: 0, examsUpdated: 0 };
  }

  // 2. Cascade update to `students` and `users` collections
  try {
    const studentsSnap = await getDocs(collection(db, "students"));
    const batch = writeBatch(db);
    let batchOperations = 0;

    for (const sDoc of studentsSnap.docs) {
      const sData = sDoc.data() as StudentEntity;
      sData._firestoreId = sDoc.id;
      sData.id = sDoc.id;

      if (isStudentInClass(sData, existingClass)) {
        studentsCount++;
        const sRef = doc(db, "students", sDoc.id);
        batch.update(sRef, {
          classId: newName,
          className: newName,
          class: newName,
          kelas: newName,
          classDocId: classDocId || "",
          updatedAt: new Date().toISOString()
        });
        batchOperations++;

        // Also update corresponding user profile in `users` collection
        const userUid = sData.uid || sDoc.id;
        const uRef = doc(db, "users", userUid);
        batch.update(uRef, {
          classId: newName,
          className: newName,
          class: newName,
          kelas: newName,
          classDocId: classDocId || "",
          updatedAt: new Date().toISOString()
        });
        batchOperations++;

        // Firestore batch max size is 500 operations
        if (batchOperations >= 450) {
          await batch.commit();
          batchOperations = 0;
        }
      }
    }

    if (batchOperations > 0) {
      await batch.commit();
    }
  } catch (err) {
    console.warn("Cascade update to students/users collection warning:", err);
  }

  // 3. Cascade update to `schedules` collection
  try {
    const schedulesSnap = await getDocs(collection(db, "schedules"));
    const batchSchedules = writeBatch(db);
    let schedOps = 0;

    for (const schDoc of schedulesSnap.docs) {
      const data = schDoc.data();
      const schedClass = (data.class || data.className || data.targetClass || "").trim();
      if (
        schedClass.toLowerCase() === oldName.toLowerCase() ||
        normalizeClassName(schedClass) === normalizeClassName(oldName) ||
        (data.classDocId && data.classDocId === classDocId)
      ) {
        schedulesCount++;
        batchSchedules.update(doc(db, "schedules", schDoc.id), {
          class: newName,
          className: newName,
          classDocId: classDocId || "",
          updatedAt: new Date().toISOString()
        });
        schedOps++;
      }
    }

    if (schedOps > 0) {
      await batchSchedules.commit();
    }
  } catch (err) {
    console.warn("Cascade update to schedules warning:", err);
  }

  // 4. Cascade update to `examSchedules` collection
  try {
    const examsSnap = await getDocs(collection(db, "examSchedules"));
    const batchExams = writeBatch(db);
    let examOps = 0;

    for (const exDoc of examsSnap.docs) {
      const data = exDoc.data();
      const examClass = (data.class || data.className || data.targetClass || "").trim();
      if (
        examClass.toLowerCase() === oldName.toLowerCase() ||
        normalizeClassName(examClass) === normalizeClassName(oldName) ||
        (data.classDocId && data.classDocId === classDocId)
      ) {
        examsCount++;
        batchExams.update(doc(db, "examSchedules", exDoc.id), {
          class: newName,
          className: newName,
          targetClass: newName,
          classDocId: classDocId || "",
          updatedAt: new Date().toISOString()
        });
        examOps++;
      }
    }

    if (examOps > 0) {
      await batchExams.commit();
    }
  } catch (err) {
    console.warn("Cascade update to examSchedules warning:", err);
  }

  // 5. Cascade update to `teachers` collection (Homeroom assignments)
  try {
    const teachersSnap = await getDocs(collection(db, "teachers"));
    const batchTeachers = writeBatch(db);
    let teacherOps = 0;

    for (const tDoc of teachersSnap.docs) {
      const data = tDoc.data();
      const homeroom = (data.homeroomClass || data.homeroom || data.waliKelas || "").trim();
      if (
        homeroom.toLowerCase() === oldName.toLowerCase() ||
        normalizeClassName(homeroom) === normalizeClassName(oldName)
      ) {
        batchTeachers.update(doc(db, "teachers", tDoc.id), {
          homeroomClass: newName,
          homeroom: newName,
          waliKelas: newName,
          updatedAt: new Date().toISOString()
        });
        teacherOps++;
      }
    }

    if (teacherOps > 0) {
      await batchTeachers.commit();
    }
  } catch (err) {
    console.warn("Cascade update to teachers warning:", err);
  }

  return {
    studentsUpdated: studentsCount,
    schedulesUpdated: schedulesCount,
    examsUpdated: examsCount,
  };
}
