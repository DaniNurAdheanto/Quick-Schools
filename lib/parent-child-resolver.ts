export interface LinkedStudentResult {
  student: any | null;
  allChildren: any[];
  classId: string | null;
  className: string | null;
}

/**
 * Resolves the linked child student for a parent account or fallback to first student if demo/unlinked.
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
  const parentEmail = (currentUser?.email || "").toLowerCase().trim();
  const parentPhone = (currentUserData?.phone || currentUser?.phoneNumber || "").replace(/[^0-9]/g, "");
  const parentName = (currentUserData?.name || "").toLowerCase().trim();

  // Explicit IDs
  const linkedIds: string[] = [];
  if (currentUserData?.studentId) linkedIds.push(String(currentUserData.studentId));
  if (currentUserData?.studentIds && Array.isArray(currentUserData.studentIds)) {
    linkedIds.push(...currentUserData.studentIds.map(String));
  }
  if (currentUserData?.linkedStudentIds && Array.isArray(currentUserData.linkedStudentIds)) {
    linkedIds.push(...currentUserData.linkedStudentIds.map(String));
  }
  if (currentUserData?.nisn) linkedIds.push(String(currentUserData.nisn));

  const matched = studentsList.filter((s) => {
    const sId = String(s.id || s._firestoreId || "");
    const sNisn = String(s.nisn || "");
    const sNis = String(s.nis || "");
    const sUid = String(s.uid || "");

    // Direct ID/NISN match
    if (linkedIds.some((lid) => lid === sId || lid === sNisn || lid === sNis || lid === sUid)) {
      return true;
    }

    // Direct UID match
    if (parentUid && (s.parentUid === parentUid || s.parentUserId === parentUid)) {
      return true;
    }

    // Phone match
    if (parentPhone && s.parentPhone) {
      const cleanSPhone = String(s.parentPhone).replace(/[^0-9]/g, "");
      if (cleanSPhone && (cleanSPhone === parentPhone || cleanSPhone.endsWith(parentPhone) || parentPhone.endsWith(cleanSPhone))) {
        return true;
      }
    }

    // Email match
    if (parentEmail && s.parentEmail && String(s.parentEmail).toLowerCase().trim() === parentEmail) {
      return true;
    }

    // Parent name match
    if (parentName && parentName.length > 2) {
      const pNameLow = (s.parentName || s.fatherName || s.motherName || s.guardianName || "").toLowerCase().trim();
      if (pNameLow && (pNameLow.includes(parentName) || parentName.includes(pNameLow))) {
        return true;
      }
    }

    return false;
  });

  const activeStudent = matched.length > 0 ? matched[0] : studentsList[0];
  const classId = activeStudent?.classId || activeStudent?.className || activeStudent?.rombel || null;
  const className = activeStudent?.className || activeStudent?.classId || activeStudent?.rombel || null;

  return {
    student: activeStudent,
    allChildren: matched.length > 0 ? matched : [activeStudent],
    classId,
    className,
  };
}
