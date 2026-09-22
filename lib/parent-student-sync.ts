"use client";

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface ParentSyncInput {
  parentUid: string;
  parentName: string;
  parentEmail?: string;
  parentPhone?: string;
  studentId?: string; // NISN or Custom ID
  nisn?: string;
  studentIds?: string[];
  studentName?: string;
}

export interface StudentSyncInput {
  studentDocId?: string;
  studentUid?: string;
  studentName: string;
  nisn?: string;
  studentId?: string;
  fatherName?: string;
  motherName?: string;
  guardianName?: string;
  parentPhone?: string;
  parentEmail?: string;
}

/**
 * Bi-directionally links a Parent account with their child student in Firestore (Strict 1-to-1).
 * 1. Updates users/{parentUid} with single studentId, nisn, studentName, studentIds: [studentId]
 * 2. Updates matching doc in users & students collection with parentUid, parentName, parentEmail, parentPhone, hasLinkedParent
 */
export async function syncParentWithStudents(input: ParentSyncInput): Promise<string[]> {
  const {
    parentUid,
    parentName,
    parentEmail = "",
    parentPhone = "",
    studentId = "",
    nisn = "",
    studentIds = [],
    studentName = ""
  } = input;

  if (!parentUid) return [];

  // Target strictly 1 student ID
  const primaryId = studentId.trim() || nisn.trim() || (studentIds.length > 0 ? String(studentIds[0]).trim() : "");
  if (!primaryId) return [];

  const finalStudentIds = [primaryId];

  // 1. Update Parent doc in users collection
  try {
    const parentUserRef = doc(db, "users", parentUid);
    const userPayload: any = {
      uid: parentUid,
      role: "orang-tua",
      name: parentName.trim(),
      fullName: parentName.trim(),
      studentIds: finalStudentIds,
      linkedStudentIds: finalStudentIds,
      studentId: primaryId,
      nisn: nisn.trim() || primaryId,
      hasLinkedParent: true,
      status: "Aktif",
      updatedAt: new Date().toISOString(),
    };
    if (parentEmail) userPayload.email = parentEmail.trim().toLowerCase();
    if (parentPhone) userPayload.phone = parentPhone.trim();
    if (studentName.trim()) {
      userPayload.studentName = studentName.trim();
    }
    await setDoc(parentUserRef, userPayload, { merge: true });
  } catch (err) {
    console.warn("Could not update parent in users collection:", err);
  }

  // 2. Update parent in parents collection if accessible
  try {
    const parentDocRef = doc(db, "parents", parentUid);
    await setDoc(parentDocRef, {
      id: parentUid,
      uid: parentUid,
      userUid: parentUid,
      parentId: `PRT-${parentUid.slice(0, 4).toUpperCase()}`,
      name: parentName.trim(),
      fullName: parentName.trim(),
      email: parentEmail.trim().toLowerCase(),
      phone: parentPhone.trim() || "-",
      relationship: "Ayah Kandung",
      studentIds: finalStudentIds,
      linkedStudentIds: finalStudentIds,
      studentId: primaryId,
      nisn: nisn.trim() || primaryId,
      studentName: studentName.trim(),
      hasLinkedParent: true,
      status: "Aktif",
      role: "orang-tua",
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    // Expected if security rules restrict direct write to parents collection
  }

  // 3. Bi-directional link: update ONLY the specific target student doc
  try {
    const stRef = doc(db, "students", primaryId);
    await setDoc(stRef, {
      parentUid,
      parentUserId: parentUid,
      parentId: `PRT-${parentUid.slice(0, 4).toUpperCase()}`,
      parentName: parentName.trim(),
      parentEmail: parentEmail.trim().toLowerCase(),
      parentPhone: parentPhone.trim(),
      hasLinkedParent: true,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (e) {}

  try {
    const uRef = doc(db, "users", primaryId);
    await setDoc(uRef, {
      parentUid,
      parentUserId: parentUid,
      parentId: `PRT-${parentUid.slice(0, 4).toUpperCase()}`,
      parentName: parentName.trim(),
      parentEmail: parentEmail.trim().toLowerCase(),
      parentPhone: parentPhone.trim(),
      hasLinkedParent: true,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (e) {}

  return finalStudentIds;
}

/**
 * Auto-links student with parent account when exact parent ID or verified email/phone matches.
 */
export async function autoLinkStudentWithParent(input: StudentSyncInput): Promise<boolean> {
  const {
    studentDocId,
    studentUid,
    studentName,
    nisn = "",
    studentId = "",
    parentPhone = "",
    parentEmail = ""
  } = input;

  const targetStudentId = studentDocId || studentUid || studentId || nisn;
  if (!targetStudentId) return false;

  const cleanEmail = parentEmail.toLowerCase().trim();
  const cleanPhone = parentPhone.replace(/[^0-9]/g, "");

  try {
    const parentsQuery = query(collection(db, "users"), where("role", "==", "orang-tua"));
    const pSnap = await getDocs(parentsQuery);

    for (const pDoc of pSnap.docs) {
      const pData = pDoc.data();
      const pEmail = (pData.email || "").toLowerCase().trim();
      const pPhone = (pData.phone || "").replace(/[^0-9]/g, "");
      const pStudentId = String(pData.studentId || "").trim();
      const pNisn = String(pData.nisn || "").trim();

      const idMatch =
        (pStudentId && (pStudentId === studentDocId || pStudentId === studentUid || pStudentId === nisn)) ||
        (pNisn && (pNisn === studentDocId || pNisn === studentUid || pNisn === nisn));
      const emailMatch = cleanEmail && pEmail && pEmail === cleanEmail;
      const phoneMatch = cleanPhone && pPhone && cleanPhone.length >= 8 && pPhone === cleanPhone;

      if (idMatch || emailMatch || phoneMatch) {
        await syncParentWithStudents({
          parentUid: pDoc.id,
          parentName: pData.name || pData.fullName || "Orang Tua",
          parentEmail: pData.email || "",
          parentPhone: pData.phone || "",
          studentId: targetStudentId,
          nisn: nisn || targetStudentId,
          studentIds: [targetStudentId],
          studentName: studentName.trim(),
        });
        return true;
      }
    }
  } catch (err) {
    console.warn("Auto-link student with parent error:", err);
  }

  return false;
}

/**
 * Disabled global sweeper to preserve 1-to-1 data integrity and prevent cross-account pollution.
 */
export async function healOrphanedParentStudentLinks(): Promise<{ linkedCount: number; details: string[] }> {
  return { linkedCount: 0, details: [] };
}

/**
 * Heals single parent link strictly to their ONE matching student if currently unlinked.
 */
export async function healSingleParentLink(parentUid: string): Promise<boolean> {
  if (!parentUid) return false;

  try {
    const userRef = doc(db, "users", parentUid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return false;

    const p = userSnap.data();
    if (Array.isArray(p.studentIds) && p.studentIds.length > 0 && p.studentId) {
      // Already has connected child
      return true;
    }

    const pEmail = (p.email || "").toLowerCase().trim();
    const pPhone = (p.phone || "").replace(/[^0-9]/g, "");
    const pStudentId = String(p.studentId || p.nisn || "").trim();

    const [studentsSnap, usersSnap] = await Promise.all([
      getDocs(collection(db, "students")),
      getDocs(query(collection(db, "users"), where("role", "==", "siswa"))),
    ]);

    const allStudentsList: any[] = [];
    studentsSnap.forEach((d) => allStudentsList.push({ _docId: d.id, ...d.data() }));
    usersSnap.forEach((d) => allStudentsList.push({ _docId: d.id, ...d.data() }));

    // Find the single best match
    const matchedStudent = allStudentsList.find((st) => {
      const sParentUid = st.parentUid || st.parentUserId;
      if (sParentUid && sParentUid === parentUid) return true;

      const sDocId = st._docId;
      const sId = st.id;
      const sNisn = st.nisn;
      if (pStudentId && (sDocId === pStudentId || sId === pStudentId || sNisn === pStudentId)) return true;

      const sParentEmail = (st.parentEmail || "").toLowerCase().trim();
      if (pEmail && sParentEmail && pEmail === sParentEmail) return true;

      const sParentPhone = (st.parentPhone || "").replace(/[^0-9]/g, "");
      if (pPhone && sParentPhone && pPhone.length >= 8 && pPhone === sParentPhone) return true;

      return false;
    });

    if (matchedStudent) {
      const canonicalId = matchedStudent._docId || matchedStudent.id || matchedStudent.nisn;
      await syncParentWithStudents({
        parentUid,
        parentName: p.name || p.fullName || "Orang Tua",
        parentEmail: p.email || "",
        parentPhone: p.phone || "",
        studentId: canonicalId,
        nisn: matchedStudent.nisn || canonicalId,
        studentIds: [canonicalId],
        studentName: matchedStudent.name || matchedStudent.fullName || "",
      });
      return true;
    }
  } catch (err) {
    console.warn("healSingleParentLink error:", err);
  }

  return false;
}
