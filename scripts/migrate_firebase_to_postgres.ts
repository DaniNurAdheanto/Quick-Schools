import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { readFileSync } from "fs";
import { prisma } from "../lib/prisma";
import * as bcrypt from "bcryptjs";
import { UserRole, AccountStatus, AttendanceStatus, LeaveType, ApprovalStatus } from "@prisma/client";

// 1. Initialize Firebase
const config = JSON.parse(readFileSync("./firebase-applet-config.json", "utf-8"));
const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app, config.firestoreDatabaseId);

const roleMapping: Record<string, UserRole> = {
  "super-admin": UserRole.SUPER_ADMIN,
  "superadmin": UserRole.SUPER_ADMIN,
  "admin": UserRole.ADMIN,
  "kepala-sekolah": UserRole.KEPALA_SEKOLAH,
  "kepsek": UserRole.KEPALA_SEKOLAH,
  "guru": UserRole.GURU,
  "teacher": UserRole.GURU,
  "siswa": UserRole.SISWA,
  "student": UserRole.SISWA,
  "orang-tua": UserRole.ORANG_TUA,
  "parent": UserRole.ORANG_TUA,
  "wali": UserRole.ORANG_TUA,
};

function resolveRole(rawRole?: string, email?: string): UserRole {
  const cleanEmail = (email || "").toLowerCase().trim();
  if (cleanEmail === "dani@gmail.com" || cleanEmail.includes("superadmin")) return UserRole.SUPER_ADMIN;

  if (rawRole && roleMapping[rawRole.toLowerCase()]) {
    return roleMapping[rawRole.toLowerCase()];
  }

  if (cleanEmail.includes("kelapa") || cleanEmail.includes("kepala") || cleanEmail.includes("kepsek") || cleanEmail.includes("principal")) {
    return UserRole.KEPALA_SEKOLAH;
  }
  if (cleanEmail.includes(".guru@") || cleanEmail.includes("guru.") || cleanEmail.includes("teacher")) {
    return UserRole.GURU;
  }
  if (cleanEmail.includes(".wali@") || cleanEmail.includes("wali.") || cleanEmail.includes("parent")) {
    return UserRole.ORANG_TUA;
  }
  if (cleanEmail.includes("admin")) {
    return UserRole.ADMIN;
  }
  return UserRole.SISWA;
}

async function runMigration() {
  console.log("=================================================");
  console.log("🚀 STARTING FIREBASE ➡️ POSTGRESQL MIGRATION");
  console.log("=================================================\n");

  try {
    await signInWithEmailAndPassword(auth, "dani@gmail.com", "asdasdasd");
    console.log("✔ Firebase Authenticated as Admin (Dani)\n");
  } catch (err: any) {
    console.warn("⚠ Firebase login note:", err.message);
  }

  const defaultPasswordHash = await bcrypt.hash("asdasdasd", 10);

  // -------------------------------------------------------------
  // 1. Migrate Academic Years
  // -------------------------------------------------------------
  console.log("📂 [1/11] Migrating Academic Years...");
  let countAY = 0;
  try {
    const snap = await getDocs(collection(db, "academic_years"));
    for (const docSnap of snap.docs) {
      const d = docSnap.data();
      await prisma.academicYear.upsert({
        where: { id: docSnap.id },
        update: {
          name: d.name || "2025/2026",
          semester: d.semester || "Ganjil",
          isActive: d.isActive ?? true,
          isLocked: d.isLocked ?? false,
        },
        create: {
          id: docSnap.id,
          name: d.name || "2025/2026",
          semester: d.semester || "Ganjil",
          isActive: d.isActive ?? true,
          isLocked: d.isLocked ?? false,
        },
      });
      countAY++;
    }
  } catch (e) {}

  // Ensure default academic year exists
  await prisma.academicYear.upsert({
    where: { id: "ay-2025-2026-ganjil" },
    update: {},
    create: {
      id: "ay-2025-2026-ganjil",
      name: "2025/2026",
      semester: "Ganjil",
      isActive: true,
      isLocked: false,
    },
  });
  console.log(`✔ Migrated ${countAY} Academic Year records.\n`);

  // -------------------------------------------------------------
  // 2. Migrate Classes
  // -------------------------------------------------------------
  console.log("📂 [2/11] Migrating Classes...");
  let countClasses = 0;
  const classMap = new Map<string, string>(); // name/id -> classId

  try {
    const snap = await getDocs(collection(db, "classes"));
    for (const docSnap of snap.docs) {
      const d = docSnap.data();
      const name = d.name || docSnap.id;
      const level = d.level || (name.includes("12") ? "12" : name.includes("11") ? "11" : "10");
      const major = d.major || (name.includes("IPS") ? "IPS" : "MIPA");

      const created = await prisma.class.upsert({
        where: { id: docSnap.id },
        update: { name, level, major },
        create: {
          id: docSnap.id,
          name,
          level,
          major,
        },
      });

      classMap.set(docSnap.id, created.id);
      classMap.set(name, created.id);
      countClasses++;
    }
  } catch (e) {
    console.warn("Classes migration note:", e);
  }
  console.log(`✔ Migrated ${countClasses} Class records.\n`);

  // -------------------------------------------------------------
  // 3. Migrate Subjects
  // -------------------------------------------------------------
  console.log("📂 [3/11] Migrating Subjects...");
  let countSubjects = 0;
  const subjectMap = new Map<string, string>();

  try {
    const snap = await getDocs(collection(db, "subjects"));
    for (const docSnap of snap.docs) {
      const d = docSnap.data();
      const code = (d.code || `SUB-${docSnap.id}`).toUpperCase();
      const name = d.name || "Mata Pelajaran";

      const created = await prisma.subject.upsert({
        where: { code },
        update: {
          name,
          category: d.category || "Wajib",
          level: d.level || "SMA",
          creditHours: d.creditHours ? Number(d.creditHours) : 2,
        },
        create: {
          id: docSnap.id,
          code,
          name,
          category: d.category || "Wajib",
          level: d.level || "SMA",
          creditHours: d.creditHours ? Number(d.creditHours) : 2,
        },
      });

      subjectMap.set(docSnap.id, created.id);
      subjectMap.set(code, created.id);
      subjectMap.set(name, created.id);
      countSubjects++;
    }
  } catch (e) {
    console.warn("Subjects migration note:", e);
  }
  console.log(`✔ Migrated ${countSubjects} Subject records.\n`);

  // -------------------------------------------------------------
  // 4. Migrate Users (Accounts)
  // -------------------------------------------------------------
  console.log("📂 [4/11] Migrating Users & Accounts...");
  let countUsers = 0;
  const userMap = new Map<string, string>(); // firebaseUid/email -> postgresUserId

  try {
    const snap = await getDocs(collection(db, "users"));
    for (const docSnap of snap.docs) {
      const d = docSnap.data();
      if (d.status === "deleted" || d.isDeleted === true) continue;

      const rawEmail = (d.email || "").toLowerCase().trim();
      const email = (rawEmail && rawEmail.includes("@")) ? rawEmail : `user_${docSnap.id}@quickschools.local`;
      const name = d.name || d.fullName || email.split("@")[0];
      const targetRole = resolveRole(d.role, email);
      const targetStatus = d.status === "Nonaktif" ? AccountStatus.NONAKTIF : d.status === "Belum Onboarding" || d.onboardingCompleted === false ? AccountStatus.BELUM_ONBOARDING : AccountStatus.AKTIF;

      const userRecord = await prisma.user.upsert({
        where: { email },
        update: {
          name,
          role: targetRole,
          status: targetStatus,
          onboardingCompleted: targetStatus === AccountStatus.AKTIF,
          phone: d.phone || d.contact || null,
        },
        create: {
          id: docSnap.id.length >= 25 ? docSnap.id : undefined,
          email,
          name,
          passwordHash: defaultPasswordHash,
          role: targetRole,
          status: targetStatus,
          onboardingCompleted: targetStatus === AccountStatus.AKTIF,
          phone: d.phone || d.contact || null,
        },
      });

      userMap.set(docSnap.id, userRecord.id);
      if (rawEmail) userMap.set(rawEmail, userRecord.id);
      countUsers++;
    }
  } catch (e) {
    console.warn("Users migration note:", e);
  }
  console.log(`✔ Migrated ${countUsers} User accounts.\n`);

  // -------------------------------------------------------------
  // 5. Migrate Teachers
  // -------------------------------------------------------------
  console.log("📂 [5/11] Migrating Teachers...");
  let countTeachers = 0;
  const teacherMap = new Map<string, string>(); // nip/id -> teacherId

  try {
    const snap = await getDocs(collection(db, "teachers"));
    for (const docSnap of snap.docs) {
      const d = docSnap.data();
      const nip = (d.nip || d.id || docSnap.id).trim();
      const fullName = d.fullName || d.name || "Guru Pengajar";
      const email = (d.email || "").toLowerCase().trim();
      const userId = userMap.get(docSnap.id) || (email ? userMap.get(email) : null) || null;

      const created = await prisma.teacher.upsert({
        where: { nip },
        update: {
          fullName,
          gender: d.gender || "Laki-laki",
          phone: d.phone || d.contact || null,
          address: d.address || null,
          status: d.status || "Aktif",
          photoUrl: d.photoUrl || d.imageUrl || null,
          userId: userId || undefined,
        },
        create: {
          nip,
          fullName,
          gender: d.gender || "Laki-laki",
          phone: d.phone || d.contact || null,
          address: d.address || null,
          status: d.status || "Aktif",
          photoUrl: d.photoUrl || d.imageUrl || null,
          userId: userId || undefined,
        },
      });

      teacherMap.set(docSnap.id, created.id);
      teacherMap.set(nip, created.id);
      countTeachers++;

      // Link subjects if array of subjects or string subject is provided
      const subList: string[] = Array.isArray(d.subjectIds) ? d.subjectIds : Array.isArray(d.subjects) ? d.subjects : d.subject ? [d.subject] : [];
      for (const sItem of subList) {
        const foundSubId = subjectMap.get(sItem);
        if (foundSubId) {
          try {
            await prisma.teacherSubject.upsert({
              where: {
                teacherId_subjectId: {
                  teacherId: created.id,
                  subjectId: foundSubId,
                },
              },
              update: {},
              create: {
                teacherId: created.id,
                subjectId: foundSubId,
              },
            });
          } catch (teSubErr) {}
        }
      }

      // Assign homeroom class
      if (d.homeroomClass) {
        const targetClassId = classMap.get(d.homeroomClass);
        if (targetClassId) {
          await prisma.class.update({
            where: { id: targetClassId },
            data: { homeroomTeacherId: created.id },
          });
        }
      }
    }
  } catch (e) {
    console.warn("Teachers migration note:", e);
  }
  console.log(`✔ Migrated ${countTeachers} Teacher records.\n`);

  // -------------------------------------------------------------
  // 6. Migrate Students
  // -------------------------------------------------------------
  console.log("📂 [6/11] Migrating Students...");
  let countStudents = 0;
  const studentMap = new Map<string, string>(); // nisn/id -> studentId

  try {
    const snap = await getDocs(collection(db, "students"));
    for (const docSnap of snap.docs) {
      const d = docSnap.data();
      const nisn = (d.nisn || d.nis || d.id || docSnap.id).trim();
      const fullName = d.fullName || d.name || "Siswa";
      const email = (d.email || "").toLowerCase().trim();
      const userId = userMap.get(docSnap.id) || (email ? userMap.get(email) : null) || null;

      const classIdentifier = d.classId || d.className || d.kelas || d.class;
      const targetClassId = classIdentifier ? (classMap.get(classIdentifier) || null) : null;

      const created = await prisma.student.upsert({
        where: { nisn },
        update: {
          nis: d.nis ? String(d.nis).trim() : nisn,
          fullName,
          nickname: d.nickname || null,
          gender: d.gender || "Laki-laki",
          birthPlace: d.birthPlace || null,
          birthDate: d.birthDate ? new Date(d.birthDate) : null,
          religion: d.religion || "Islam",
          nik: d.nik || null,
          address: d.address || null,
          phone: d.phone || null,
          classId: targetClassId,
          major: d.major || "MIPA",
          entryYear: d.entryYear || "2025/2026",
          level: d.level || "SMA",
          status: d.status || "Aktif",
          photoUrl: d.photoUrl || d.imageUrl || null,
          fatherName: d.fatherName || null,
          motherName: d.motherName || null,
          guardianName: d.guardianName || null,
          parentPhone: d.parentPhone || null,
          parentJob: d.parentJob || null,
          parentIncome: d.parentIncome || null,
          parentAddress: d.parentAddress || null,
          userId: userId || undefined,
        },
        create: {
          nisn,
          nis: d.nis ? String(d.nis).trim() : nisn,
          fullName,
          nickname: d.nickname || null,
          gender: d.gender || "Laki-laki",
          birthPlace: d.birthPlace || null,
          birthDate: d.birthDate ? new Date(d.birthDate) : null,
          religion: d.religion || "Islam",
          nik: d.nik || null,
          address: d.address || null,
          phone: d.phone || null,
          classId: targetClassId,
          major: d.major || "MIPA",
          entryYear: d.entryYear || "2025/2026",
          level: d.level || "SMA",
          status: d.status || "Aktif",
          photoUrl: d.photoUrl || d.imageUrl || null,
          fatherName: d.fatherName || null,
          motherName: d.motherName || null,
          guardianName: d.guardianName || null,
          parentPhone: d.parentPhone || null,
          parentJob: d.parentJob || null,
          parentIncome: d.parentIncome || null,
          parentAddress: d.parentAddress || null,
          userId: userId || undefined,
        },
      });

      studentMap.set(docSnap.id, created.id);
      studentMap.set(nisn, created.id);
      countStudents++;
    }
  } catch (e) {
    console.warn("Students migration note:", e);
  }
  console.log(`✔ Migrated ${countStudents} Student records.\n`);

  // -------------------------------------------------------------
  // 7. Migrate Parents & ParentStudent Links
  // -------------------------------------------------------------
  console.log("📂 [7/11] Migrating Parents & Children Linking...");
  let countParents = 0;

  try {
    const snap = await getDocs(collection(db, "parents"));
    for (const docSnap of snap.docs) {
      const d = docSnap.data();
      const fullName = d.parentName || d.name || d.fullName || "Wali Murid";
      const email = (d.email || d.parentEmail || "").toLowerCase().trim();
      const userId = userMap.get(docSnap.id) || (email ? userMap.get(email) : null) || null;

      const created = await prisma.parent.upsert({
        where: { id: docSnap.id },
        update: {
          fullName,
          email: email || null,
          phone: d.phone || d.parentPhone || d.noHp || null,
          address: d.address || d.parentAddress || null,
          job: d.job || d.parentJob || null,
          income: d.income || d.parentIncome || null,
          userId: userId || undefined,
        },
        create: {
          id: docSnap.id,
          fullName,
          email: email || null,
          phone: d.phone || d.parentPhone || d.noHp || null,
          address: d.address || d.parentAddress || null,
          job: d.job || d.parentJob || null,
          income: d.income || d.parentIncome || null,
          userId: userId || undefined,
        },
      });

      countParents++;

      // Link children
      const rawChildren: string[] = Array.isArray(d.studentIds) ? d.studentIds : Array.isArray(d.linkedStudentIds) ? d.linkedStudentIds : d.studentId ? [d.studentId] : [];
      for (const chItem of rawChildren) {
        const studentPgId = studentMap.get(chItem);
        if (studentPgId) {
          try {
            await prisma.parentStudent.upsert({
              where: {
                parentId_studentId: {
                  parentId: created.id,
                  studentId: studentPgId,
                },
              },
              update: {},
              create: {
                parentId: created.id,
                studentId: studentPgId,
                relationship: d.relationship || "Orang Tua",
              },
            });
          } catch (psErr) {}
        }
      }
    }
  } catch (e) {
    console.warn("Parents migration note:", e);
  }
  console.log(`✔ Migrated ${countParents} Parent records.\n`);

  // -------------------------------------------------------------
  // 8. Migrate Attendance Records
  // -------------------------------------------------------------
  console.log("📂 [8/11] Migrating Attendance Records...");
  let countAttendance = 0;

  try {
    const snap = await getDocs(collection(db, "attendance"));
    for (const docSnap of snap.docs) {
      const d = docSnap.data();
      const rawDate = d.date || new Date().toISOString().split("T")[0];
      const studentIdentifier = d.studentId || d.nisn || d.id;
      const studentPgId = studentIdentifier ? studentMap.get(studentIdentifier) : null;

      if (!studentPgId) continue;

      const statusMap: Record<string, AttendanceStatus> = {
        "Hadir": AttendanceStatus.HADIR,
        "Terlambat": AttendanceStatus.TERLAMBAT,
        "Izin": AttendanceStatus.IZIN,
        "Sakit": AttendanceStatus.SAKIT,
        "Alpa": AttendanceStatus.ALPA,
      };
      const attStatus = statusMap[d.status] || AttendanceStatus.HADIR;

      await prisma.attendance.upsert({
        where: {
          studentId_date: {
            studentId: studentPgId,
            date: rawDate,
          },
        },
        update: {
          status: attStatus,
          time: d.time || null,
          notes: d.notes || null,
          isFinal: d.isFinal ?? false,
          latitude: d.latitude ? Number(d.latitude) : null,
          longitude: d.longitude ? Number(d.longitude) : null,
        },
        create: {
          studentId: studentPgId,
          date: rawDate,
          status: attStatus,
          time: d.time || null,
          notes: d.notes || null,
          isFinal: d.isFinal ?? false,
          latitude: d.latitude ? Number(d.latitude) : null,
          longitude: d.longitude ? Number(d.longitude) : null,
        },
      });
      countAttendance++;
    }
  } catch (e) {
    console.warn("Attendance migration note:", e);
  }
  console.log(`✔ Migrated ${countAttendance} Attendance records.\n`);

  // -------------------------------------------------------------
  // 9. Migrate Leave Requests
  // -------------------------------------------------------------
  console.log("📂 [9/11] Migrating Leave Requests...");
  let countLeave = 0;

  try {
    const snap = await getDocs(collection(db, "leave_requests"));
    for (const docSnap of snap.docs) {
      const d = docSnap.data();
      const studentIdentifier = d.studentId || d.nisn;
      const teacherIdentifier = d.teacherId || d.nip;

      const studentPgId = studentIdentifier ? studentMap.get(studentIdentifier) : null;
      const teacherPgId = teacherIdentifier ? teacherMap.get(teacherIdentifier) : null;

      const leaveTypeEnum = d.type === "Sakit" ? LeaveType.SAKIT : d.type === "Cuti" ? LeaveType.CUTI : d.type === "Dispensasi" ? LeaveType.DISPENSASI : LeaveType.IZIN;
      const approvalEnum = d.status === "Disetujui" || d.status === "Approved" ? ApprovalStatus.DISETUJUI : d.status === "Ditolak" || d.status === "Rejected" ? ApprovalStatus.DITOLAK : ApprovalStatus.PENDING;

      await prisma.leaveRequest.upsert({
        where: { id: docSnap.id },
        update: {
          type: leaveTypeEnum,
          status: approvalEnum,
          reason: d.reason || "Pengajuan izin",
          proofUrl: d.proofUrl || null,
          startDate: d.startDate ? new Date(d.startDate) : new Date(),
          endDate: d.endDate ? new Date(d.endDate) : new Date(),
        },
        create: {
          id: docSnap.id,
          studentId: studentPgId,
          teacherId: teacherPgId,
          type: leaveTypeEnum,
          status: approvalEnum,
          reason: d.reason || "Pengajuan izin",
          proofUrl: d.proofUrl || null,
          startDate: d.startDate ? new Date(d.startDate) : new Date(),
          endDate: d.endDate ? new Date(d.endDate) : new Date(),
        },
      });
      countLeave++;
    }
  } catch (e) {
    console.warn("Leave requests migration note:", e);
  }
  console.log(`✔ Migrated ${countLeave} Leave Request records.\n`);

  // -------------------------------------------------------------
  // 10. Migrate Announcements
  // -------------------------------------------------------------
  console.log("📂 [10/11] Migrating Announcements...");
  let countAnnouncements = 0;

  try {
    const snap = await getDocs(collection(db, "announcements"));
    for (const docSnap of snap.docs) {
      const d = docSnap.data();
      await prisma.announcement.upsert({
        where: { id: docSnap.id },
        update: {
          title: d.title || "Pengumuman",
          content: d.content || "",
          targetRole: d.targetRole || "Semua",
          isPinned: d.isPinned ?? false,
        },
        create: {
          id: docSnap.id,
          title: d.title || "Pengumuman",
          content: d.content || "",
          targetRole: d.targetRole || "Semua",
          isPinned: d.isPinned ?? false,
        },
      });
      countAnnouncements++;
    }
  } catch (e) {
    console.warn("Announcements migration note:", e);
  }
  console.log(`✔ Migrated ${countAnnouncements} Announcement records.\n`);

  console.log("=================================================");
  console.log("🎉 FIREBASE ➡️ POSTGRESQL MIGRATION COMPLETE!");
  console.log("=================================================\n");
}

runMigration()
  .catch((e) => {
    console.error("Migration fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
