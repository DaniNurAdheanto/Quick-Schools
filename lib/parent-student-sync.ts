"use client";

export interface ParentSyncInput {
  parentUid: string;
  parentName: string;
  parentEmail?: string;
  parentPhone?: string;
  studentId?: string;
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

export async function syncParentWithStudents(input: ParentSyncInput): Promise<string[]> {
  return input.studentIds || (input.studentId ? [input.studentId] : []);
}

export async function autoLinkStudentWithParent(_input: StudentSyncInput): Promise<boolean> {
  return true;
}

export async function healOrphanedParentStudentLinks(): Promise<{ linkedCount: number; details: string[] }> {
  return { linkedCount: 0, details: [] };
}

export async function healSingleParentLink(_parentUid: string): Promise<boolean> {
  return true;
}
