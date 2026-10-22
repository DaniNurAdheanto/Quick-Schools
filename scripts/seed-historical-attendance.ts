import { PrismaClient, AttendanceStatus } from "@prisma/client";

const prisma = new PrismaClient();

// List of operational weekdays in October 2026 before today (2026-10-22)
const OPERATIONAL_DATES = [
  "2026-10-01", // Kamis
  "2026-10-02", // Jumat
  "2026-10-05", // Senin
  "2026-10-06", // Selasa
  "2026-10-07", // Rabu
  "2026-10-08", // Kamis
  "2026-10-09", // Jumat
  "2026-10-12", // Senin
  "2026-10-13", // Selasa
  "2026-10-14", // Rabu
  "2026-10-15", // Kamis
  "2026-10-16", // Jumat
  "2026-10-19", // Senin
  "2026-10-20", // Selasa
  "2026-10-21", // Rabu
];

async function seedHistoricalAttendance() {
  console.log("Seeding historical attendance for October 2026...");

  const students = await prisma.student.findMany({
    include: { class: true },
  });

  const teachers = await prisma.teacher.findMany();

  console.log(`Found ${students.length} students and ${teachers.length} teachers.`);

  // Generate realistic student attendance profiles
  for (const st of students) {
    console.log(`Processing student: ${st.fullName} (${st.nisn})`);

    for (const d of OPERATIONAL_DATES) {
      // Deterministic profile per student & date
      let status: AttendanceStatus = AttendanceStatus.HADIR;
      let time = "07:12";
      let notes = "Hadir tepat waktu di sekolah (Biometrik Wajah)";

      if (st.fullName === "Ahmad Fauzi") {
        if (d === "2026-10-05") {
          status = AttendanceStatus.TERLAMBAT;
          time = "07:35";
          notes = "Terlambat 20 menit (Kendala transportasi)";
        } else if (d === "2026-10-14") {
          status = AttendanceStatus.ALPA;
          time = "-";
          notes = "Otomatis Alpa (Melewati Batas Maksimal 09:00 WIB)";
        } else if (d === "2026-10-16") {
          status = AttendanceStatus.IZIN;
          time = "-";
          notes = "Izin urusan keluarga (Surat izin orang tua disetujui)";
        } else {
          status = AttendanceStatus.HADIR;
          time = ["07:08", "07:14", "07:18", "07:10", "07:22"][parseInt(d.slice(-2)) % 5];
          notes = "Hadir tepat waktu di sekolah (Biometrik Wajah)";
        }
      } else if (st.fullName === "Budi Santoso") {
        if (d === "2026-10-07") {
          status = AttendanceStatus.SAKIT;
          time = "-";
          notes = "Sakit flu & demam (Surat dokter terlampir)";
        } else if (d === "2026-10-12") {
          status = AttendanceStatus.TERLAMBAT;
          time = "07:28";
          notes = "Terlambat 13 menit";
        } else if (d === "2026-10-19") {
          status = AttendanceStatus.IZIN;
          time = "-";
          notes = "Izin menghadiri perlombaan sains";
        } else {
          status = AttendanceStatus.HADIR;
          time = ["07:05", "07:11", "07:15", "07:09", "07:20"][parseInt(d.slice(-2)) % 5];
          notes = "Hadir tepat waktu di sekolah (Biometrik Wajah)";
        }
      } else if (st.fullName === "Agus Santoso") {
        if (d === "2026-10-09") {
          status = AttendanceStatus.TERLAMBAT;
          time = "07:40";
          notes = "Terlambat 25 menit";
        } else if (d === "2026-10-15") {
          status = AttendanceStatus.SAKIT;
          time = "-";
          notes = "Sakit sakit tenggorokan & istirahat";
        } else {
          status = AttendanceStatus.HADIR;
          time = ["07:06", "07:16", "07:19", "07:12", "07:24"][parseInt(d.slice(-2)) % 5];
          notes = "Hadir tepat waktu di sekolah (Biometrik Wajah)";
        }
      }

      await prisma.attendance.upsert({
        where: {
          studentId_date: {
            studentId: st.id,
            date: d,
          },
        },
        update: {
          status,
          time,
          notes,
          isFinal: true,
          classId: st.classId,
        },
        create: {
          studentId: st.id,
          classId: st.classId,
          date: d,
          status,
          time,
          notes,
          isFinal: true,
        },
      });
    }
  }

  // Generate teacher attendance for each teacher
  for (const t of teachers) {
    for (const d of OPERATIONAL_DATES) {
      await prisma.teacherAttendance.upsert({
        where: {
          teacherId_date: {
            teacherId: t.id,
            date: d,
          },
        },
        update: {
          status: AttendanceStatus.HADIR,
          time: "06:55",
          notes: "Hadir bertugas di sekolah",
        },
        create: {
          teacherId: t.id,
          date: d,
          status: AttendanceStatus.HADIR,
          time: "06:55",
          notes: "Hadir bertugas di sekolah",
        },
      });
    }
  }

  const count = await prisma.attendance.count();
  console.log(`Historical attendance seeded successfully! Total attendance records in DB: ${count}`);
}

seedHistoricalAttendance()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
