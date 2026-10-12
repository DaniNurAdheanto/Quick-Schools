import { prisma } from "../lib/prisma";

async function testModules() {
  console.log("🚀 Testing PostgreSQL Master Data & Attendance Modules...");

  // 1. Create Class
  const testClass = await prisma.class.upsert({
    where: { id: "test-class-10-ipa-1" },
    update: {},
    create: {
      id: "test-class-10-ipa-1",
      name: "10 IPA 1",
      level: "10",
      major: "MIPA",
    },
  });
  console.log("✔ Class created/verified:", testClass.name);

  // 2. Create Subject
  const testSubject = await prisma.subject.upsert({
    where: { code: "MAT-10" },
    update: {},
    create: {
      code: "MAT-10",
      name: "Matematika Wajib",
      category: "Wajib",
      level: "SMA",
      creditHours: 2,
    },
  });
  console.log("✔ Subject created/verified:", testSubject.code, "-", testSubject.name);

  // 3. Create Teacher & Link Subject
  const testTeacher = await prisma.teacher.upsert({
    where: { nip: "198501012010011001" },
    update: {},
    create: {
      nip: "198501012010011001",
      fullName: "Budi Santoso, M.Pd.",
      gender: "Laki-laki",
      phone: "081234567890",
      status: "Aktif",
    },
  });
  await prisma.teacherSubject.upsert({
    where: {
      teacherId_subjectId: {
        teacherId: testTeacher.id,
        subjectId: testSubject.id,
      },
    },
    update: {},
    create: {
      teacherId: testTeacher.id,
      subjectId: testSubject.id,
    },
  });
  console.log("✔ Teacher & Subject linked:", testTeacher.fullName);

  // 4. Create Student
  const testStudent = await prisma.student.upsert({
    where: { nisn: "0081234567" },
    update: { classId: testClass.id },
    create: {
      nisn: "0081234567",
      nis: "20251001",
      fullName: "Ahmad Dahlan",
      gender: "Laki-laki",
      classId: testClass.id,
      major: "MIPA",
      status: "Aktif",
    },
  });
  console.log("✔ Student created/verified:", testStudent.fullName, `(NISN: ${testStudent.nisn})`);

  // 5. Test Attendance Logging
  const todayStr = new Date().toISOString().split("T")[0];
  const testAtt = await prisma.attendance.upsert({
    where: {
      studentId_date: {
        studentId: testStudent.id,
        date: todayStr,
      },
    },
    update: { status: "HADIR", time: "07:15" },
    create: {
      studentId: testStudent.id,
      classId: testClass.id,
      date: todayStr,
      status: "HADIR",
      time: "07:15",
    },
  });
  console.log("✔ Attendance logged for today:", todayStr, "-", testAtt.status);

  console.log("🎉 All PostgreSQL Modules Tested Successfully!");
}

testModules()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
