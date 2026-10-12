import { prisma } from "../lib/prisma";

async function inspectPostgres() {
  console.log("========================================");
  console.log("📊 POSTGRESQL DATABASE STATUS & COUNTS");
  console.log("========================================\n");

  const usersCount = await prisma.user.count();
  const classesCount = await prisma.class.count();
  const subjectsCount = await prisma.subject.count();
  const teachersCount = await prisma.teacher.count();
  const studentsCount = await prisma.student.count();
  const parentsCount = await prisma.parent.count();
  const attendancesCount = await prisma.attendance.count();
  const leavesCount = await prisma.leaveRequest.count();
  const academicYearsCount = await prisma.academicYear.count();

  console.log(`- 👥 Users (Akun): ${usersCount}`);
  console.log(`- 🏫 Classes (Kelas): ${classesCount}`);
  console.log(`- 📚 Subjects (Mata Pelajaran): ${subjectsCount}`);
  console.log(`- 👨‍🏫 Teachers (Guru): ${teachersCount}`);
  console.log(`- 🎓 Students (Siswa): ${studentsCount}`);
  console.log(`- 👨‍👩‍👧 Parents (Wali Murid): ${parentsCount}`);
  console.log(`- 📅 Attendances (Presensi): ${attendancesCount}`);
  console.log(`- 📝 Leave Requests (Izin/Sakit): ${leavesCount}`);
  console.log(`- 🗓 Academic Years (Tahun Ajaran): ${academicYearsCount}`);

  console.log("\n--- Sample Users in PostgreSQL ---");
  const sampleUsers = await prisma.user.findMany({
    take: 10,
    orderBy: { name: "asc" },
  });
  sampleUsers.forEach((u) => {
    console.log(`  • ${u.name} | ${u.email} | Role: ${u.role} | Status: ${u.status}`);
  });

  console.log("\n========================================");
}

inspectPostgres()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
