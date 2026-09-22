export interface LinkedStudentResult {
  student: any | null;
  allChildren: any[];
  classId: string | null;
  className: string | null;
}

/**
 * Resolves the linked child student for a parent account (strictly 1-to-1).
 * Uses hierarchical exact matching:
 * 1. Parent UID on student record
 * 2. Primary studentId / NISN
 * 3. Verified parent phone
 * 4. Verified parent email
 * 5. Exact parent name on student record
 */
export function resolveParentStudent(
  currentUser: any | null,
  currentUserData: any | null,
  studentsList: any[]
): LinkedStudentResult {
  if (!studentsList || studentsList.length === 0) {
    return { student: null, allChildren: [], classId: null, className: null };
  }

  const parentUid = currentUser?.uid;
  const parentEmail = (currentUser?.email || currentUserData?.email || "").toLowerCase().trim();
  const parentPhone = (currentUserData?.phone || currentUser?.phoneNumber || "").replace(/[^0-9]/g, "");
  const pName = (currentUserData?.name || currentUserData?.fullName || currentUser?.displayName || "").toLowerCase().trim();
  const targetStudentName = (currentUserData?.studentName || "").toLowerCase().trim();

  // Primary single target ID
  const primaryStudentId = String(
    currentUserData?.studentId ||
    currentUserData?.nisn ||
    (Array.isArray(currentUserData?.studentIds) && currentUserData.studentIds.length > 0 ? currentUserData.studentIds[0] : "")
  ).toLowerCase().trim();

  let matchedStudent: any = null;

  // 1. First Priority: Direct parentUid match on student record
  if (parentUid) {
    matchedStudent = studentsList.find((s) => {
      const sParentUid = String(s.parentUid || s.parentUserId || "").trim();
      return sParentUid && sParentUid === parentUid;
    });
  }

  // 2. Second Priority: Direct Student ID or NISN match
  if (!matchedStudent && primaryStudentId) {
    matchedStudent = studentsList.find((s) => {
      const sDocId = String(s._firestoreId || s.docId || "").toLowerCase();
      const sId = String(s.id || "").toLowerCase();
      const sRawId = String(s.rawId || "").toLowerCase();
      const sNisn = String(s.nisn || "").toLowerCase();
      const sNis = String(s.nis || "").toLowerCase();
      const sUid = String(s.uid || "").toLowerCase();
      return (
        sDocId === primaryStudentId ||
        sId === primaryStudentId ||
        sRawId === primaryStudentId ||
        sNisn === primaryStudentId ||
        sNis === primaryStudentId ||
        sUid === primaryStudentId
      );
    });
  }

  // 3. Third Priority: Exact Verified Parent Phone match
  if (!matchedStudent && parentPhone && parentPhone.length >= 8) {
    matchedStudent = studentsList.find((s) => {
      const sPhone = String(s.parentPhone || "").replace(/[^0-9]/g, "");
      return sPhone && sPhone === parentPhone;
    });
  }

  // 4. Fourth Priority: Exact Verified Parent Email match
  if (!matchedStudent && parentEmail && parentEmail.includes("@")) {
    matchedStudent = studentsList.find((s) => {
      const sEmail = String(s.parentEmail || "").toLowerCase().trim();
      return sEmail && sEmail === parentEmail;
    });
  }

  // 5. Fifth Priority: Exact Student Name match
  if (!matchedStudent && targetStudentName && targetStudentName.length >= 3) {
    matchedStudent = studentsList.find((s) => {
      const sName = String(s.name || s.fullName || "").toLowerCase().trim();
      return sName === targetStudentName;
    });
  }

  // 6. Sixth Priority: Exact Parent Name match
  if (!matchedStudent && pName && pName.length >= 3) {
    matchedStudent = studentsList.find((s) => {
      const fName = String(s.fatherName || "").toLowerCase().trim();
      const mName = String(s.motherName || "").toLowerCase().trim();
      const gName = String(s.guardianName || "").toLowerCase().trim();
      const sParent = String(s.parentName || "").toLowerCase().trim();
      return fName === pName || mName === pName || gName === pName || sParent === pName;
    });
  }

  const allChildren = matchedStudent ? [matchedStudent] : [];
  const classId = matchedStudent?.classId || matchedStudent?.className || matchedStudent?.kelas || matchedStudent?.rombel || null;
  const className = matchedStudent?.className || matchedStudent?.classId || matchedStudent?.kelas || matchedStudent?.rombel || null;

  return {
    student: matchedStudent,
    allChildren,
    classId,
    className,
  };
}
