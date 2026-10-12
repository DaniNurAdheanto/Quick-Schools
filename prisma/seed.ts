import { PrismaClient, UserRole, AccountStatus, AttendanceStatus, PaymentStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Resetting and seeding PostgreSQL Database with exactly 1 user per role and synchronized master data...");

  // 0. Clean old records in proper foreign key order
  await prisma.payment.deleteMany({});
  await prisma.grade.deleteMany({});
  await prisma.schedule.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.teacherAttendance.deleteMany({});
  await prisma.leaveRequest.deleteMany({});
  await prisma.parentStudent.deleteMany({});
  await prisma.parent.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.teacherSubject.deleteMany({});
  await prisma.class.deleteMany({});
  await prisma.teacher.deleteMany({});
  await prisma.subject.deleteMany({});
  await prisma.academicYear.deleteMany({});
  await prisma.announcement.deleteMany({});
  await prisma.user.deleteMany({});

  const defaultPasswordHash = await bcrypt.hash("asdasdasd", 10);
  const todayStr = new Date().toISOString().split("T")[0];

  // 1. Exactly 1 user per role:
  // Role 1: SUPER_ADMIN
  const userSuperAdmin = await prisma.user.create({
    data: {
      email: "dani@gmail.com",
      name: "Dani Nur Adheanto",
      role: UserRole.SUPER_ADMIN,
      status: AccountStatus.AKTIF,
      passwordHash: defaultPasswordHash,
      onboardingCompleted: true,
      phone: "081234567890",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=250&auto=format&fit=crop",
    },
  });

  // Role 2: ADMIN
  await prisma.user.create({
    data: {
      email: "admin@quickschools.sch.id",
      name: "Administrator Sekolah",
      role: UserRole.ADMIN,
      status: AccountStatus.AKTIF,
      passwordHash: defaultPasswordHash,
      onboardingCompleted: true,
      phone: "081234567891",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=250&auto=format&fit=crop",
    },
  });

  // Role 3: KEPALA_SEKOLAH
  await prisma.user.create({
    data: {
      email: "kepalasekolah@quickschools.sch.id",
      name: "Drs. Toharudin, M.Pd.",
      role: UserRole.KEPALA_SEKOLAH,
      status: AccountStatus.AKTIF,
      passwordHash: defaultPasswordHash,
      onboardingCompleted: true,
      phone: "081234567892",
      avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=250&auto=format&fit=crop",
    },
  });

  // Role 4: GURU
  const userGuru = await prisma.user.create({
    data: {
      email: "budi.guru@quickschools.sch.id",
      name: "Budi Santoso, M.Pd.",
      role: UserRole.GURU,
      status: AccountStatus.AKTIF,
      passwordHash: defaultPasswordHash,
      onboardingCompleted: true,
      phone: "081234567801",
      avatarUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=250&auto=format&fit=crop",
    },
  });

  // Role 5: SISWA
  const userSiswa = await prisma.user.create({
    data: {
      email: "ahmad.siswa@quickschools.sch.id",
      name: "Ahmad Fauzi",
      role: UserRole.SISWA,
      status: AccountStatus.AKTIF,
      passwordHash: defaultPasswordHash,
      onboardingCompleted: true,
      phone: "081234567855",
      avatarUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=250&auto=format&fit=crop",
    },
  });

  // Role 6: ORANG_TUA
  const userOrangTua = await prisma.user.create({
    data: {
      email: "dahlan.wali@quickschools.sch.id",
      name: "Dahlan Iskandar",
      role: UserRole.ORANG_TUA,
      status: AccountStatus.AKTIF,
      passwordHash: defaultPasswordHash,
      onboardingCompleted: true,
      phone: "081987654301",
      avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=250&auto=format&fit=crop",
    },
  });

  // 2. Academic Year
  const academicYear = await prisma.academicYear.create({
    data: {
      id: "ay-2025-2026-ganjil",
      name: "2025/2026",
      semester: "Ganjil",
      isActive: true,
      isLocked: false,
    },
  });

  // 3. Subjects
  const subMat = await prisma.subject.create({
    data: {
      code: "MAT-WAJIB",
      name: "Matematika Wajib",
      category: "Wajib",
      creditHours: 4,
      level: "SMA",
    },
  });

  await prisma.subject.create({
    data: {
      code: "BIND-WAJIB",
      name: "Bahasa Indonesia",
      category: "Wajib",
      creditHours: 3,
      level: "SMA",
    },
  });

  await prisma.subject.create({
    data: {
      code: "FIS-PEMINATAN",
      name: "Fisika",
      category: "Peminatan",
      creditHours: 3,
      level: "SMA",
    },
  });

  // 4. Teacher Profile (Budi Santoso)
  const teacher = await prisma.teacher.create({
    data: {
      nip: "198501012010011001",
      userId: userGuru.id,
      fullName: "Budi Santoso, M.Pd.",
      gender: "Laki-laki",
      phone: "081234567801",
      address: "Jl. Pendidikan No. 12, Jakarta",
      status: "Aktif",
      photoUrl: userGuru.avatarUrl,
    },
  });

  // Teacher teaches Matematika Wajib
  await prisma.teacherSubject.create({
    data: {
      teacherId: teacher.id,
      subjectId: subMat.id,
    },
  });

  // 5. Class (10 MIPA 1) with Budi Santoso as Homeroom
  const cls = await prisma.class.create({
    data: {
      id: "class-10-mipa-1",
      name: "10 MIPA 1",
      level: "10",
      major: "MIPA",
      academicYearId: academicYear.id,
      homeroomTeacherId: teacher.id,
    },
  });

  // 6. Student Profile (Ahmad Fauzi) in 10 MIPA 1
  const student = await prisma.student.create({
    data: {
      nisn: "0081234501",
      nis: "1001",
      userId: userSiswa.id,
      fullName: "Ahmad Fauzi",
      gender: "Laki-laki",
      classId: cls.id,
      major: "MIPA",
      entryYear: "2025/2026",
      level: "SMA",
      status: "Aktif",
      religion: "Islam",
      phone: "081234567855",
      address: "Jl. Anggrek No. 5, Jakarta",
      fatherName: "Dahlan Iskandar",
      parentPhone: "081987654301",
      photoUrl: userSiswa.avatarUrl,
    },
  });

  // 7. Parent Profile (Dahlan Iskandar) & Link to Ahmad Fauzi
  const parent = await prisma.parent.create({
    data: {
      id: `parent-${student.nisn}`,
      userId: userOrangTua.id,
      fullName: "Dahlan Iskandar",
      email: "dahlan.wali@quickschools.sch.id",
      phone: "081987654301",
      address: "Jl. Anggrek No. 5, Jakarta",
      job: "Wiraswasta",
    },
  });

  await prisma.parentStudent.create({
    data: {
      parentId: parent.id,
      studentId: student.id,
      relationship: "Ayah",
    },
  });

  // 8. Schedule: Senin 07:30 - 09:00 Matematika Wajib
  await prisma.schedule.create({
    data: {
      dayOfWeek: 1, // Senin
      startTime: "07:30",
      endTime: "09:00",
      room: "R. 101",
      classId: cls.id,
      subjectId: subMat.id,
      teacherId: teacher.id,
      academicYearId: academicYear.id,
    },
  });

  // 9. Attendance today for Student & Teacher
  await prisma.attendance.create({
    data: {
      studentId: student.id,
      classId: cls.id,
      date: todayStr,
      time: "07:15",
      status: AttendanceStatus.HADIR,
      notes: "Hadir tepat waktu di kelas",
    },
  });

  await prisma.teacherAttendance.create({
    data: {
      teacherId: teacher.id,
      date: todayStr,
      time: "07:05",
      status: AttendanceStatus.HADIR,
      notes: "Hadir tepat waktu",
    },
  });

  // 10. Grade for Ahmad Fauzi (Tugas 1: 88)
  await prisma.grade.create({
    data: {
      type: "Tugas 1",
      score: 88,
      notes: "Pemahaman materi Aljabar sangat baik",
      studentId: student.id,
      subjectId: subMat.id,
      classId: cls.id,
      teacherId: teacher.id,
      academicYearId: academicYear.id,
    },
  });

  // 11. SPP Payment for Ahmad Fauzi
  await prisma.payment.create({
    data: {
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      title: "SPP Bulan Oktober 2026",
      amount: 350000,
      status: PaymentStatus.LUNAS,
      paymentMethod: "Transfer Bank",
      paidAt: new Date(),
      studentId: student.id,
    },
  });

  // 12. Announcement
  await prisma.announcement.create({
    data: {
      title: "Selamat Datang di Tahun Ajaran Baru 2025/2026",
      content: "Seluruh civitas akademika diharapkan mematuhi jadwal KBM dan tata tertib sekolah yang berlaku.",
      targetRole: "Semua",
      isPinned: true,
      authorId: userSuperAdmin.id,
    },
  });

  console.log("=========================================================");
  console.log("✔ DATABASE RESET & SEEDED: 1 ROLE = 1 AKUN (TOTAL 6 USERS)");
  console.log("---------------------------------------------------------");
  console.log("1. SUPER ADMIN   : dani@gmail.com / asdasdasd (Dani Nur Adheanto)");
  console.log("2. ADMIN         : admin@quickschools.sch.id / asdasdasd (Administrator Sekolah)");
  console.log("3. KEPALA SEKOLAH: kepalasekolah@quickschools.sch.id / asdasdasd (Drs. Toharudin, M.Pd.)");
  console.log("4. GURU          : budi.guru@quickschools.sch.id / asdasdasd (Budi Santoso, M.Pd.)");
  console.log("5. SISWA         : ahmad.siswa@quickschools.sch.id / asdasdasd (Ahmad Fauzi)");
  console.log("6. ORANG TUA     : dahlan.wali@quickschools.sch.id / asdasdasd (Dahlan Iskandar)");
  console.log("---------------------------------------------------------");
  console.log(`✔ 1 Academic Year : ${academicYear.name} ${academicYear.semester}`);
  console.log(`✔ 1 Class         : ${cls.name} (Wali: ${teacher.fullName})`);
  console.log(`✔ 1 Student       : ${student.fullName} (Kelas: ${cls.name})`);
  console.log(`✔ 1 Parent Link   : ${parent.fullName} -> ${student.fullName}`);
  console.log("=========================================================");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
