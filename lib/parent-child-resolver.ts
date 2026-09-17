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

  // Strict deduplication by unique student ID
  const uniqueStudentsMap = new Map<string, any>();

  studentsList.forEach((s) => {
    const sId = String(s.id || s._firestoreId || "");
    const sNisn = String(s.nisn || "");
    const sNis = String(s.nis || "");
    const sUid = String(s.uid || "");

    // 1. Match explicit ID or NISN
    const isIdMatch = linkedIds.some((lid) => lid && (lid === sId || lid === sNisn || lid === sNis || lid === sUid));
    if (isIdMatch) {
      uniqueStudentsMap.set(sId || sUid, s);
      return;
    }

    // 2. Match explicit parent UID
    if (parentUid && (s.parentUid === parentUid || s.parentUserId === parentUid)) {
      uniqueStudentsMap.set(sId || sUid, s);
      return;
    }

    // 3. Match verified phone
    if (parentPhone && parentPhone.length >= 8 && s.parentPhone) {
      const cleanSPhone = String(s.parentPhone).replace(/[^0-9]/g, "");
      if (cleanSPhone && cleanSPhone === parentPhone) {
        uniqueStudentsMap.set(sId || sUid, s);
        return;
      }
    }

    // 4. Match verified email
    if (parentEmail && parentEmail.includes("@") && s.parentEmail && String(s.parentEmail).toLowerCase().trim() === parentEmail) {
      uniqueStudentsMap.set(sId || sUid, s);
      return;
    }
  });

  const matched = Array.from(uniqueStudentsMap.values());
  const activeStudent = matched.length > 0 ? matched[0] : null;
  const classId = activeStudent?.classId || activeStudent?.className || activeStudent?.rombel || null;
  const className = activeStudent?.className || activeStudent?.classId || activeStudent?.rombel || null;

  return {
    student: activeStudent,
    allChildren: matched,
    classId,
    className,
  };
}
