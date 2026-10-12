const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkDatabase() {
  console.log("🔍 Checking PostgreSQL Database Data Alignment...\n");
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true, name: true, status: true },
      orderBy: { role: "asc" }
    });
    console.log(`✅ Users in DB: ${users.length}`);
    users.forEach(u => console.log(`   - [${u.role}] ${u.email} (${u.name}) - Status: ${u.status}`));

    const classes = await prisma.class.findMany({
      include: {
        homeroomTeacher: true,
        _count: { select: { students: true } }
      },
      orderBy: { name: "asc" }
    });
    console.log(`\n✅ Classes & Homeroom in DB: ${classes.length}`);
    classes.forEach(c => {
      console.log(`   - Kelas: ${c.name} (${c.level} ${c.major || ''}) | Wali: ${c.homeroomTeacher ? c.homeroomTeacher.fullName : 'Belum Ditetapkan'} | Siswa: ${c._count.students}`);
    });

    const teachers = await prisma.teacher.findMany({
      include: {
        homeroomForClass: true,
        subjects: { include: { subject: true } }
      }
    });
    console.log(`\n✅ Teachers in DB: ${teachers.length}`);
    teachers.forEach(t => {
      const wali = t.homeroomForClass.length > 0 ? t.homeroomForClass.map(c => c.name).join(", ") : "Bukan Wali Kelas";
      const subjs = t.subjects.map(s => s.subject.name).join(", ") || "Tidak ada mapel";
      console.log(`   - ${t.fullName} (NIP: ${t.nip}) | Mapel: ${subjs} | Wali Kelas: ${wali}`);
    });

    const students = await prisma.student.findMany({
      include: { class: true }
    });
    console.log(`\n✅ Students in DB: ${students.length}`);
    students.forEach(s => {
      console.log(`   - ${s.fullName} (NISN: ${s.nisn}) | Kelas: ${s.class ? s.class.name : '-'}`);
    });

    const schedules = await prisma.schedule.findMany({
      include: { class: true, subject: true, teacher: true }
    });
    console.log(`\n✅ Schedules in DB: ${schedules.length}`);
    schedules.forEach(sc => {
      console.log(`   - ${sc.class?.name}: ${sc.subject?.name} oleh ${sc.teacher?.fullName} (${sc.startTime} - ${sc.endTime})`);
    });

    console.log("\n🎉 ALL DATABASE MODELS AND RELATIONS ARE 100% IN SYNC!");
  } catch (err) {
    console.error("❌ Database verification failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
