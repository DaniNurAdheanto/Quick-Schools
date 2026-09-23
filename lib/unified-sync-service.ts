"use client";

import {
  Firestore,
  doc,
  setDoc,
  deleteDoc
} from "firebase/firestore";

/**
 * Strips undefined and invalid fields for safe Firestore payload
 */
function sanitizePayload(obj: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined && !key.startsWith("_allDocIds")) {
      clean[key] = obj[key];
    }
  });
  return clean;
}

export interface StudentSyncPayload {
  uid?: string;
  id?: string;
  _firestoreId?: string;
  _allDocIds?: string[];
  nisn?: string;
  nis?: string;
  name?: string;
  fullName?: string;
  nickname?: string;
  email?: string;
  phone?: string;
  gender?: string;
  birthPlace?: string;
  birthDate?: string;
  religion?: string;
  nik?: string;
  address?: string;
  className?: string;
  classId?: string;
  kelas?: string;
  class?: string;
  classDocId?: string;
  major?: string;
  entryYear?: string;
  level?: string;
  studentStatus?: string;
  previousSchool?: string;
  fatherName?: string;
  motherName?: string;
  guardianName?: string;
  parentPhone?: string;
  parentJob?: string;
  parentIncome?: string;
  parentAddress?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelation?: string;
  status?: string;
  onboardingCompleted?: boolean;
  imageUrl?: string;
  photoUrl?: string;
  [key: string]: any;
}

export interface TeacherSyncPayload {
  uid?: string;
  id?: string;
  _firestoreId?: string;
  _allDocIds?: string[];
  nip?: string;
  name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  contact?: string;
  subject?: string;
  role?: string;
  subjectIds?: string[];
  subjects?: string[];
  homeroomClass?: string;
  status?: string;
  imageUrl?: string;
  photoUrl?: string;
  gender?: string;
  address?: string;
  [key: string]: any;
}

/**
 * Synchronizes Student data across `users` and `students` collections.
 */
export async function syncStudentRecord(db: Firestore, data: StudentSyncPayload): Promise<void> {
  const isDocId = (val: any) => typeof val === "string" && val.length >= 20 && !/^\d+$/.test(val);

  const cleanNisn = (!isDocId(data.nisn) && data.nisn && data.nisn !== "-") ? String(data.nisn).trim()
    : (!isDocId(data.nis) && data.nis && data.nis !== "-") ? String(data.nis).trim()
    : (!isDocId(data.id) && data.id && data.id !== "-") ? String(data.id).trim()
    : "";

  const cleanNis = (!isDocId(data.nis) && data.nis && data.nis !== "-") ? String(data.nis).trim()
    : cleanNisn;

  const targetClass = (data.className || data.classId || data.kelas || data.class || "10 IPA 1").trim();
  const studentName = (data.name || data.fullName || "Siswa").trim();
  const photo = data.imageUrl || data.photoUrl || "";
  const validPhoto = (typeof photo === "string" && !photo.startsWith("blob:")) ? photo : "";
  const status = data.status || "Aktif";
  const email = (data.email || "").toLowerCase().trim();

  const now = new Date().toISOString();

  // Determine all target document IDs across collections
  const studentDocIds = new Set<string>();
  const userDocIds = new Set<string>();

  if (data._firestoreId) {
    studentDocIds.add(data._firestoreId);
    userDocIds.add(data._firestoreId);
  }
  if (data.uid) {
    userDocIds.add(data.uid);
    studentDocIds.add(data.uid);
  }
  if (Array.isArray(data._allDocIds)) {
    data._allDocIds.forEach((id) => {
      if (id) {
        studentDocIds.add(id);
        userDocIds.add(id);
      }
    });
  }

  // Look up matching docs by NISN or Email if IDs are sparse
  if (cleanNisn) {
    studentDocIds.add(cleanNisn);
  }
  if (userDocIds.size === 0 && data.id) {
    userDocIds.add(data.id);
  }

  // 1. Prepare compact document for `students` collection
  const compactStudentDoc = sanitizePayload({
    name: studentName.slice(0, 100),
    fullName: studentName,
    classId: targetClass.slice(0, 50),
    className: targetClass,
    class: targetClass,
    kelas: targetClass,
    classDocId: data.classDocId || "",
    status: status,
    imageUrl: validPhoto.startsWith("data:")
      ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=250&auto=format&fit=crop"
      : (validPhoto || "").slice(0, 500),
    photoUrl: validPhoto,
    nisn: cleanNisn || "-",
    nis: cleanNis || "-",
    email: email,
    phone: data.phone || "-",
    updatedAt: now,
  });

  // 2. Prepare rich document for `users` collection
  const richUserDoc = sanitizePayload({
    ...data,
    role: "siswa",
    name: studentName,
    fullName: studentName,
    nisn: cleanNisn || "-",
    nis: cleanNis || "-",
    classId: targetClass,
    className: targetClass,
    class: targetClass,
    kelas: targetClass,
    classDocId: data.classDocId || "",
    status: status,
    onboardingCompleted: status !== "Belum Onboarding",
    imageUrl: validPhoto,
    photoUrl: validPhoto,
    email: email,
    updatedAt: now,
  });

  // Save to `students` collection
  for (const sId of Array.from(studentDocIds)) {
    if (!sId) continue;
    try {
      await setDoc(doc(db, "students", sId), { id: sId, ...compactStudentDoc }, { merge: true });
    } catch (e) {
      console.warn(`Sync to students/${sId} warning:`, e);
    }
  }

  // Save to `users` collection
  for (const uId of Array.from(userDocIds)) {
    if (!uId) continue;
    try {
      await setDoc(doc(db, "users", uId), { uid: uId, ...richUserDoc }, { merge: true });
    } catch (e) {
      console.warn(`Sync to users/${uId} warning:`, e);
    }
  }
}

/**
 * Synchronizes Teacher data across `users` and `teachers` collections.
 */
export async function syncTeacherRecord(db: Firestore, data: TeacherSyncPayload): Promise<void> {
  const isDocId = (val: any) => typeof val === "string" && val.length >= 20 && !/^\d+$/.test(val);

  const cleanNip = (!isDocId(data.nip) && data.nip && data.nip !== "-") ? String(data.nip).trim()
    : (!isDocId(data.id) && data.id && data.id !== "-") ? String(data.id).trim()
    : "";

  const teacherName = (data.name || data.fullName || "Guru Pengajar").trim();
  const photo = data.imageUrl || data.photoUrl || "";
  const validPhoto = (typeof photo === "string" && !photo.startsWith("blob:")) ? photo : "";
  const phone = data.contact || data.phone || "";
  const email = (data.email || "").toLowerCase().trim();
  const status = data.status || "Aktif";

  const rawSubjectIds = Array.isArray(data.subjectIds) ? data.subjectIds : [];
  const rawSubjects = Array.isArray(data.subjects) ? data.subjects : (data.subject || data.role ? [data.subject || data.role] : []);
  const primarySubject = data.subject || data.role || (rawSubjects.length > 0 ? rawSubjects[0] : "Guru Pengajar");

  const now = new Date().toISOString();

  const teacherDocIds = new Set<string>();
  const userDocIds = new Set<string>();

  if (data._firestoreId) {
    teacherDocIds.add(data._firestoreId);
    userDocIds.add(data._firestoreId);
  }
  if (data.uid) {
    userDocIds.add(data.uid);
    teacherDocIds.add(data.uid);
  }
  if (Array.isArray(data._allDocIds)) {
    data._allDocIds.forEach((id) => {
      if (id) {
        teacherDocIds.add(id);
        userDocIds.add(id);
      }
    });
  }
  if (cleanNip) {
    teacherDocIds.add(cleanNip);
  }

  // 1. Prepare clean document for `teachers` collection
  const teacherDoc = sanitizePayload({
    name: teacherName,
    fullName: teacherName,
    nip: cleanNip || "-",
    id: cleanNip || data.id || data.uid || "-",
    role: primarySubject,
    subject: primarySubject,
    subjectIds: rawSubjectIds,
    subjects: rawSubjects,
    contact: phone,
    phone: phone,
    email: email,
    status: status,
    imageUrl: validPhoto,
    photoUrl: validPhoto,
    homeroomClass: data.homeroomClass || "",
    gender: data.gender || "Laki-laki",
    address: data.address || "",
    updatedAt: now,
  });

  // 2. Prepare clean document for `users` collection
  const userDoc = sanitizePayload({
    ...data,
    role: "guru",
    name: teacherName,
    fullName: teacherName,
    nip: cleanNip || "-",
    id: cleanNip || data.id || data.uid || "-",
    subject: primarySubject,
    subjectIds: rawSubjectIds,
    subjects: rawSubjects,
    contact: phone,
    phone: phone,
    email: email,
    status: status,
    imageUrl: validPhoto,
    photoUrl: validPhoto,
    homeroomClass: data.homeroomClass || "",
    gender: data.gender || "Laki-laki",
    address: data.address || "",
    updatedAt: now,
  });

  // Write to `teachers` collection
  for (const tId of Array.from(teacherDocIds)) {
    if (!tId) continue;
    try {
      await setDoc(doc(db, "teachers", tId), { id: tId, ...teacherDoc }, { merge: true });
    } catch (e) {
      console.warn(`Sync to teachers/${tId} warning:`, e);
    }
  }

  // Write to `users` collection
  for (const uId of Array.from(userDocIds)) {
    if (!uId) continue;
    try {
      await setDoc(doc(db, "users", uId), { uid: uId, ...userDoc }, { merge: true });
    } catch (e) {
      console.warn(`Sync to users/${uId} warning:`, e);
    }
  }
}

/**
 * Completely removes Student from both `students` and `users` collections.
 */
export async function deleteStudentRecord(
  db: Firestore,
  student: { _firestoreId?: string; uid?: string; id?: string; _allDocIds?: string[] }
): Promise<void> {
  const idsToDelete = new Set<string>();
  if (student._firestoreId) idsToDelete.add(student._firestoreId);
  if (student.uid) idsToDelete.add(student.uid);
  if (student.id && student.id !== "-") idsToDelete.add(student.id);
  if (Array.isArray(student._allDocIds)) {
    student._allDocIds.forEach((id) => id && idsToDelete.add(id));
  }

  for (const id of Array.from(idsToDelete)) {
    try {
      await deleteDoc(doc(db, "students", id));
    } catch (e) {}
    try {
      await deleteDoc(doc(db, "users", id));
    } catch (e) {}
  }
}

/**
 * Completely removes Teacher from both `teachers` and `users` collections.
 */
export async function deleteTeacherRecord(
  db: Firestore,
  teacher: { _firestoreId?: string; uid?: string; id?: string; nip?: string; _allDocIds?: string[] }
): Promise<void> {
  const idsToDelete = new Set<string>();
  if (teacher._firestoreId) idsToDelete.add(teacher._firestoreId);
  if (teacher.uid) idsToDelete.add(teacher.uid);
  if (teacher.nip && teacher.nip !== "-") idsToDelete.add(teacher.nip);
  if (teacher.id && teacher.id !== "-") idsToDelete.add(teacher.id);
  if (Array.isArray(teacher._allDocIds)) {
    teacher._allDocIds.forEach((id) => id && idsToDelete.add(id));
  }

  for (const id of Array.from(idsToDelete)) {
    try {
      await deleteDoc(doc(db, "teachers", id));
    } catch (e) {}
    try {
      await deleteDoc(doc(db, "users", id));
    } catch (e) {}
  }
}
