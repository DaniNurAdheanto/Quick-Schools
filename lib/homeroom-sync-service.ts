"use client";

import {
  Firestore,
  doc,
  updateDoc,
  serverTimestamp
} from "firebase/firestore";
import { syncTeacherRecord, TeacherSyncPayload } from "@/lib/unified-sync-service";

/**
 * Normalizes person name by removing academic titles and honorifics
 * for reliable multi-source matching.
 */
export function normalizePersonName(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/,\s*(s\.pd|m\.pd|s\.kom|m\.kom|s\.t|m\.t|s\.si|m\.si|dr|dra|drs|lc|m\.a|s\.ag|m\.ag|m\.hum|s\.e|m\.m)[^,]*/gi, "")
    .replace(/\b(dr|dra|drs|ustadz|kyai|ir|prof|h|hj)\.?\s+/gi, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Determines whether a teacher is assigned to a specific class.
 * Uses 4-way robust matching:
 * 1. Match by Firestore Document ID / UID
 * 2. Match by clean NIP / ID
 * 3. Match by homeroomClass field on teacher
 * 4. Match by normalized name
 */
export function isTeacherAssignedToClass(teacher: any, classItem: any): boolean {
  if (!teacher || !classItem) return false;

  // 1. Direct ID matching
  const classHomeroomId = String(classItem.homeroomId || "").trim();
  if (classHomeroomId) {
    if (
      classHomeroomId === teacher._firestoreId ||
      classHomeroomId === teacher.id ||
      classHomeroomId === teacher.uid ||
      (Array.isArray(teacher._allDocIds) && teacher._allDocIds.includes(classHomeroomId))
    ) {
      return true;
    }
  }

  // 2. NIP matching
  const classNip = String(classItem.homeroomNip || "").trim();
  const teacherNip = String(teacher.nip || teacher.id || "").trim();
  if (classNip && classNip !== "-" && teacherNip && teacherNip !== "-") {
    if (classNip.toLowerCase() === teacherNip.toLowerCase()) {
      return true;
    }
  }

  // 3. Teacher's homeroomClass property matching
  const teacherClass = String(teacher.homeroomClass || teacher.waliKelas || "").trim().toLowerCase();
  const className = String(classItem.name || "").trim().toLowerCase();
  const classDocId = String(classItem._firestoreId || classItem.id || "").trim().toLowerCase();
  if (teacherClass && (teacherClass === className || teacherClass === classDocId)) {
    return true;
  }

  // 4. Normalized name matching
  const classHomeroomName = String(classItem.homeroom || "").trim();
  const teacherName = String(teacher.name || teacher.fullName || "").trim();
  if (classHomeroomName && teacherName) {
    const normClassTeacher = normalizePersonName(classHomeroomName);
    const normTeacher = normalizePersonName(teacherName);
    if (normClassTeacher && normClassTeacher === normTeacher) {
      return true;
    }
  }

  return false;
}

/**
 * Finds which class a teacher is assigned to, or null if unassigned.
 */
export function findAssignedClassForTeacher(teacher: any, classes: any[]): any | null {
  if (!teacher || !classes || classes.length === 0) return null;
  return classes.find((cls) => isTeacherAssignedToClass(teacher, cls)) || null;
}

/**
 * Finds which teacher is assigned to a given class, or null if unassigned.
 */
export function findAssignedTeacherForClass(classItem: any, teachers: any[]): any | null {
  if (!classItem || !teachers || teachers.length === 0) return null;
  return teachers.find((t) => isTeacherAssignedToClass(t, classItem)) || null;
}

/**
 * Assigns a teacher as homeroom to a target class.
 * Ensures:
 * 1. Target class in `classes` is updated with full teacher details.
 * 2. Selected teacher in `teachers` and `users` is updated with `homeroomClass`.
 * 3. Any previous class held by this teacher is cleared.
 * 4. Any previous teacher held by this target class is cleared.
 */
export async function assignHomeroomTeacher(
  db: Firestore,
  teacher: any | null,
  targetClass: any,
  allClasses: any[],
  allTeachers: any[]
): Promise<void> {
  const targetClassDocId = targetClass._firestoreId || targetClass.id;
  const targetClassName = targetClass.name || "";

  if (!targetClassDocId) {
    throw new Error("Target class document ID is invalid.");
  }

  // Case 1: Unassigning/clearing the class (teacher is null)
  if (!teacher) {
    await unassignHomeroomTeacher(db, targetClass, allTeachers);
    return;
  }

  const teacherName = (teacher.name || teacher.fullName || "").trim();
  const teacherNip = (teacher.nip && teacher.nip !== "-") ? teacher.nip : (teacher.id || "");
  const teacherContact = teacher.contact || teacher.phone || "";
  const teacherDocId = teacher._firestoreId || teacher.uid || teacher.id || "";

  // 1. Check if the target class currently has a different teacher assigned
  const prevTeacher = findAssignedTeacherForClass(targetClass, allTeachers);
  if (prevTeacher && !isSameTeacher(prevTeacher, teacher)) {
    await clearTeacherHomeroomAssignment(db, prevTeacher);
  }

  // 2. Check if the selected teacher currently holds another class
  const prevClassOfTeacher = findAssignedClassForTeacher(teacher, allClasses);
  if (prevClassOfTeacher && (prevClassOfTeacher._firestoreId || prevClassOfTeacher.id) !== targetClassDocId) {
    const prevClassDocId = prevClassOfTeacher._firestoreId || prevClassOfTeacher.id;
    try {
      await updateDoc(doc(db, "classes", prevClassDocId), {
        homeroom: "",
        homeroomNip: "",
        homeroomContact: "",
        homeroomId: "",
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.warn(`Failed to clear previous class ${prevClassDocId} of teacher:`, err);
    }
  }

  // 3. Update the target class document
  await updateDoc(doc(db, "classes", targetClassDocId), {
    homeroom: teacherName,
    homeroomNip: teacherNip || "-",
    homeroomContact: teacherContact,
    homeroomId: teacherDocId,
    updatedAt: serverTimestamp()
  });

  // 4. Update the selected teacher across `teachers` and `users` collections
  const teacherPayload: TeacherSyncPayload = {
    ...teacher,
    name: teacherName,
    fullName: teacherName,
    nip: teacherNip || "-",
    contact: teacherContact,
    phone: teacherContact,
    homeroomClass: targetClassName,
    waliKelas: targetClassName,
    classDocId: targetClassDocId,
    status: teacher.status || "Aktif",
    updatedAt: new Date().toISOString()
  };

  await syncTeacherRecord(db, teacherPayload);

  // Direct safety update for all linked documents
  await broadcastTeacherHomeroomChange(db, teacher, targetClassName, targetClassDocId);
}

/**
 * Unassigns a teacher from a target class.
 * Clears both the class document and the teacher's profile.
 */
export async function unassignHomeroomTeacher(
  db: Firestore,
  targetClass: any,
  allTeachers: any[]
): Promise<void> {
  const targetClassDocId = targetClass._firestoreId || targetClass.id;
  if (!targetClassDocId) return;

  // 1. Clear class document
  await updateDoc(doc(db, "classes", targetClassDocId), {
    homeroom: "",
    homeroomNip: "",
    homeroomContact: "",
    homeroomId: "",
    updatedAt: serverTimestamp()
  });

  // 2. Identify the teacher and clear their homeroom assignment
  const assignedTeacher = findAssignedTeacherForClass(targetClass, allTeachers);
  if (assignedTeacher) {
    await clearTeacherHomeroomAssignment(db, assignedTeacher);
  }
}

/**
 * Clears a teacher's homeroomClass assignment across `teachers` and `users`.
 */
export async function clearTeacherHomeroomAssignment(db: Firestore, teacher: any): Promise<void> {
  if (!teacher) return;

  const payload: TeacherSyncPayload = {
    ...teacher,
    homeroomClass: "",
    waliKelas: "",
    classDocId: "",
    updatedAt: new Date().toISOString()
  };

  await syncTeacherRecord(db, payload);
  await broadcastTeacherHomeroomChange(db, teacher, "", "");
}

/**
 * Updates the corresponding class document when teacher's name/contact/NIP is edited in Teachers menu.
 */
export async function syncClassOnTeacherUpdate(
  db: Firestore,
  updatedTeacher: any,
  allClasses: any[]
): Promise<void> {
  if (!updatedTeacher || !allClasses || allClasses.length === 0) return;

  const assignedClass = findAssignedClassForTeacher(updatedTeacher, allClasses);
  if (!assignedClass) return;

  const classDocId = assignedClass._firestoreId || assignedClass.id;
  if (!classDocId) return;

  const newName = (updatedTeacher.name || updatedTeacher.fullName || "").trim();
  const newNip = (updatedTeacher.nip && updatedTeacher.nip !== "-") ? updatedTeacher.nip : (updatedTeacher.id || "");
  const newContact = updatedTeacher.contact || updatedTeacher.phone || "";
  const teacherId = updatedTeacher._firestoreId || updatedTeacher.uid || updatedTeacher.id || "";

  try {
    await updateDoc(doc(db, "classes", classDocId), {
      homeroom: newName,
      homeroomNip: newNip || "-",
      homeroomContact: newContact,
      homeroomId: teacherId,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.warn(`Failed to sync class ${classDocId} on teacher update:`, err);
  }
}

/**
 * Clears the homeroom assignment on classes when a teacher is deleted.
 */
export async function syncClassOnTeacherDelete(
  db: Firestore,
  deletedTeacher: any,
  allClasses: any[]
): Promise<void> {
  if (!deletedTeacher || !allClasses || allClasses.length === 0) return;

  const assignedClass = findAssignedClassForTeacher(deletedTeacher, allClasses);
  if (!assignedClass) return;

  const classDocId = assignedClass._firestoreId || assignedClass.id;
  if (!classDocId) return;

  try {
    await updateDoc(doc(db, "classes", classDocId), {
      homeroom: "",
      homeroomNip: "",
      homeroomContact: "",
      homeroomId: "",
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.warn(`Failed to clear class ${classDocId} on teacher delete:`, err);
  }
}

/**
 * Reconciles all class-teacher homeroom relations across the database.
 * Fills missing `homeroomId`, `homeroomNip`, `homeroomContact` in classes,
 * and sets `homeroomClass` in teacher records.
 */
export async function reconcileAllHomeroomData(
  db: Firestore,
  classes: any[],
  teachers: any[]
): Promise<{ reconciledCount: number; errors: number }> {
  let reconciledCount = 0;
  let errors = 0;

  for (const cls of classes) {
    const hasClassHomeroom = Boolean(cls.homeroom && String(cls.homeroom).trim() !== "");
    const assignedTeacher = findAssignedTeacherForClass(cls, teachers);

    if (hasClassHomeroom && assignedTeacher) {
      const clsId = cls._firestoreId || cls.id;
      const tDocId = assignedTeacher._firestoreId || assignedTeacher.id || assignedTeacher.uid || "";
      const tNip = assignedTeacher.nip || assignedTeacher.id || "-";
      const tContact = assignedTeacher.contact || assignedTeacher.phone || "";
      const tName = assignedTeacher.name || assignedTeacher.fullName || cls.homeroom;

      // Check if class doc needs backfill
      const needsClassUpdate = !cls.homeroomId || cls.homeroomId !== tDocId || !cls.homeroomNip || cls.homeroomNip === "-" || !cls.homeroomContact;
      if (needsClassUpdate && clsId) {
        try {
          await updateDoc(doc(db, "classes", clsId), {
            homeroom: tName,
            homeroomId: tDocId,
            homeroomNip: tNip,
            homeroomContact: tContact,
            updatedAt: serverTimestamp()
          });
          reconciledCount++;
        } catch (e) {
          console.warn("Error reconciling class:", e);
          errors++;
        }
      }

      // Check if teacher needs backfill
      if (assignedTeacher.homeroomClass !== cls.name) {
        try {
          await broadcastTeacherHomeroomChange(db, assignedTeacher, cls.name, clsId);
          reconciledCount++;
        } catch (e) {
          console.warn("Error reconciling teacher:", e);
          errors++;
        }
      }
    }
  }

  return { reconciledCount, errors };
}

/**
 * Internal helper to check if two teacher objects refer to the same teacher.
 */
function isSameTeacher(t1: any, t2: any): boolean {
  if (!t1 || !t2) return false;
  if (t1._firestoreId && t2._firestoreId && t1._firestoreId === t2._firestoreId) return true;
  if (t1.uid && t2.uid && t1.uid === t2.uid) return true;
  if (t1.nip && t2.nip && t1.nip !== "-" && t1.nip === t2.nip) return true;
  if (t1.name && t2.name && normalizePersonName(t1.name) === normalizePersonName(t2.name)) return true;
  return false;
}

/**
 * Directly writes homeroomClass update to all document IDs associated with this teacher.
 */
async function broadcastTeacherHomeroomChange(
  db: Firestore,
  teacher: any,
  className: string,
  classDocId: string
): Promise<void> {
  const ids = new Set<string>();
  if (teacher._firestoreId) ids.add(teacher._firestoreId);
  if (teacher.uid) ids.add(teacher.uid);
  if (teacher.id && teacher.id !== "-") ids.add(teacher.id);
  if (Array.isArray(teacher._allDocIds)) {
    teacher._allDocIds.forEach((id: string) => id && ids.add(id));
  }

  const now = new Date().toISOString();
  const updateData = {
    homeroomClass: className,
    homeroom: className,
    waliKelas: className,
    classDocId: classDocId,
    updatedAt: now
  };

  for (const docId of Array.from(ids)) {
    try {
      await updateDoc(doc(db, "teachers", docId), updateData);
    } catch {
      // document might not exist in teachers, ignore
    }
    try {
      await updateDoc(doc(db, "users", docId), updateData);
    } catch {
      // document might not exist in users, ignore
    }
  }
}
