import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AttendanceStatus } from "@prisma/client";

const statusMappingToEnum: Record<string, AttendanceStatus> = {
  "Hadir": AttendanceStatus.HADIR,
  "Terlambat": AttendanceStatus.TERLAMBAT,
  "Izin": AttendanceStatus.IZIN,
  "Sakit": AttendanceStatus.SAKIT,
  "Alpa": AttendanceStatus.ALPA,
  "Tidak Hadir": AttendanceStatus.ALPA,
};

const statusEnumToString: Record<AttendanceStatus, string> = {
  HADIR: "Hadir",
  TERLAMBAT: "Terlambat",
  IZIN: "Izin",
  SAKIT: "Sakit",
  ALPA: "Alpa",
};

// GET /api/attendance - List attendance records, with optional date & classId filter
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const classId = searchParams.get("classId");

    const whereClause: any = { date };
    if (classId && classId !== "all") {
      whereClause.classId = classId;
    }

    // 1. Fetch attendance records for this date
    const attendances = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        student: {
          include: {
            class: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // 2. Fetch all active students to calculate totals and auto-alpa
    const studentsWhere: any = { status: "Aktif" };
    if (classId && classId !== "all") {
      studentsWhere.classId = classId;
    }
    const allStudents = await prisma.student.findMany({
      where: studentsWhere,
      include: { class: true },
    });

    const attendanceMap = new Map(attendances.map((a) => [a.studentId, a]));

    // 3. Current time check for 12:00 WIB cutoff
    const now = new Date();
    const isPastCutoff = now.getHours() >= 12;

    let hadirCount = 0;
    let terlambatCount = 0;
    let izinCount = 0;
    let sakitCount = 0;
    let alpaCount = 0;

    const mergedList = allStudents.map((st) => {
      const att = attendanceMap.get(st.id);
      let statusStr = "Belum Absen";

      if (att) {
        statusStr = statusEnumToString[att.status] || "Hadir";
      } else if (isPastCutoff) {
        statusStr = "Alpa";
      }

      if (statusStr === "Hadir") hadirCount++;
      else if (statusStr === "Terlambat") terlambatCount++;
      else if (statusStr === "Izin") izinCount++;
      else if (statusStr === "Sakit") sakitCount++;
      else if (statusStr === "Alpa") alpaCount++;

      return {
        id: att?.id || `sim_${st.id}`,
        studentId: st.id,
        nisn: st.nisn,
        name: st.fullName,
        fullName: st.fullName,
        className: st.class?.name || "10 IPA 1",
        classId: st.classId,
        date,
        time: att?.time || (att ? att.createdAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"),
        status: statusStr,
        notes: att?.notes || null,
        isFinal: isPastCutoff || att?.isFinal || false,
        latitude: att?.latitude || null,
        longitude: att?.longitude || null,
      };
    });

    return NextResponse.json({
      success: true,
      date,
      stats: {
        totalStudents: allStudents.length,
        hadir: hadirCount,
        terlambat: terlambatCount,
        izin: izinCount,
        sakit: sakitCount,
        alpa: alpaCount,
        rate: allStudents.length > 0 ? Math.round((hadirCount / allStudents.length) * 100) : 0,
      },
      records: mergedList,
    });
  } catch (err: any) {
    console.error("GET /api/attendance error:", err);
    return NextResponse.json({ error: "Gagal memuat data presensi: " + err.message }, { status: 500 });
  }
}

// POST /api/attendance - Log or update attendance record
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentId, nisn, date, status, notes, time, latitude, longitude } = body;

    const targetDate = date || new Date().toISOString().split("T")[0];

    // Find student
    const student = await prisma.student.findFirst({
      where: {
        OR: [{ id: studentId || "" }, { nisn: String(nisn || studentId || "").trim() }],
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Siswa tidak ditemukan." }, { status: 404 });
    }

    const now = new Date();
    const isPastCutoff = now.getHours() >= 12;
    const targetStatus = statusMappingToEnum[String(status)] || AttendanceStatus.HADIR;

    // Check if locked after 12:00
    const existing = await prisma.attendance.findUnique({
      where: {
        studentId_date: {
          studentId: student.id,
          date: targetDate,
        },
      },
    });

    if (existing && existing.isFinal) {
      return NextResponse.json({ error: "Presensi untuk tanggal ini sudah final dan tidak dapat diubah lagi." }, { status: 403 });
    }

    const currentTimeStr = time || now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

    const attendanceRecord = await prisma.attendance.upsert({
      where: {
        studentId_date: {
          studentId: student.id,
          date: targetDate,
        },
      },
      update: {
        status: targetStatus,
        notes: notes || null,
        time: currentTimeStr,
        isFinal: isPastCutoff,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
      },
      create: {
        studentId: student.id,
        classId: student.classId,
        date: targetDate,
        status: targetStatus,
        time: currentTimeStr,
        notes: notes || null,
        isFinal: isPastCutoff,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Presensi ${student.fullName} berhasil dicatat sebagai "${status || "Hadir"}".`,
      attendance: attendanceRecord,
    });
  } catch (err: any) {
    console.error("POST /api/attendance error:", err);
    return NextResponse.json({ error: "Gagal mencatat presensi: " + err.message }, { status: 500 });
  }
}
