import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AttendanceStatus } from "@prisma/client";

const statusMappingToEnum: Record<string, AttendanceStatus> = {
  "Hadir": AttendanceStatus.HADIR,
  "Terlambat": AttendanceStatus.TERLAMBAT,
  "Izin": AttendanceStatus.IZIN,
  "Sakit": AttendanceStatus.SAKIT,
  "Alpa": AttendanceStatus.ALPA,
};

const statusEnumToString: Record<AttendanceStatus, string> = {
  HADIR: "Hadir",
  TERLAMBAT: "Terlambat",
  IZIN: "Izin",
  SAKIT: "Sakit",
  ALPA: "Alpa",
};

// GET /api/teacher-attendance - List teacher attendance records for a specific date
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

    // 1. Fetch teacher attendance records from PostgreSQL
    const attendances = await prisma.teacherAttendance.findMany({
      where: { date },
      include: {
        teacher: {
          include: {
            user: true,
            homeroomForClass: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // 2. Fetch all active teachers to ensure complete roster
    const allTeachers = await prisma.teacher.findMany({
      where: { status: "Aktif" },
      include: {
        user: true,
        homeroomForClass: true,
      },
      orderBy: { fullName: "asc" },
    });

    const attendanceMap = new Map(attendances.map((a) => [a.teacherId, a]));

    let hadirCount = 0;
    let tepatWaktuCount = 0;
    let terlambatCount = 0;
    let izinCount = 0;
    let sakitCount = 0;
    let alpaCount = 0;

    const mergedList = allTeachers.map((tc) => {
      const att = attendanceMap.get(tc.id);
      let statusStr = "Belum Absen";

      if (att) {
        statusStr = statusEnumToString[att.status] || "Hadir";
      }

      if (statusStr === "Hadir") {
        hadirCount++;
        tepatWaktuCount++;
      } else if (statusStr === "Terlambat") {
        hadirCount++;
        terlambatCount++;
      } else if (statusStr === "Izin") {
        izinCount++;
      } else if (statusStr === "Sakit") {
        sakitCount++;
      } else if (statusStr === "Alpa") {
        alpaCount++;
      }

      const checkInTimeStr = att?.time || (att?.checkInTime ? att.checkInTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-");

      return {
        id: att?.id || `tc_att_${tc.id}`,
        teacherId: tc.id,
        nip: tc.nip,
        name: tc.fullName,
        fullName: tc.fullName,
        email: tc.user?.email || "-",
        phone: tc.phone || "-",
        date,
        time: checkInTimeStr,
        clockIn: att ? {
          time: checkInTimeStr,
          status: att.status === AttendanceStatus.TERLAMBAT ? "Terlambat" : "Tepat Waktu",
        } : null,
        clockOut: att?.checkOutTime ? {
          time: att.checkOutTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
          status: "Normal",
        } : null,
        status: statusStr,
        notes: att?.notes || null,
        latitude: att?.latitude || null,
        longitude: att?.longitude || null,
      };
    });

    const totalTeachers = allTeachers.length;
    const rate = totalTeachers > 0 ? Math.min(100, Math.round((hadirCount / totalTeachers) * 100)) : 0;

    return NextResponse.json({
      success: true,
      date,
      stats: {
        totalTeachers,
        hadir: hadirCount,
        tepatWaktu: tepatWaktuCount,
        terlambat: terlambatCount,
        izin: izinCount,
        sakit: sakitCount,
        alpa: alpaCount,
        rate,
      },
      records: mergedList,
      attendance: mergedList,
    });
  } catch (err: any) {
    console.error("GET /api/teacher-attendance error:", err);
    return NextResponse.json(
      { error: "Gagal memuat data presensi guru: " + err.message },
      { status: 500 }
    );
  }
}

// POST /api/teacher-attendance - Record or update teacher attendance in PostgreSQL
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { teacherId, date, time, status, notes, latitude, longitude } = body;

    if (!teacherId) {
      return NextResponse.json(
        { error: "ID guru wajib disertakan." },
        { status: 400 }
      );
    }

    const todayStr = date || new Date().toISOString().split("T")[0];
    const targetStatus = statusMappingToEnum[status] || AttendanceStatus.HADIR;

    const record = await prisma.teacherAttendance.upsert({
      where: {
        teacherId_date: {
          teacherId,
          date: todayStr,
        },
      },
      update: {
        status: targetStatus,
        time: time || undefined,
        notes: notes || undefined,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
      },
      create: {
        teacherId,
        date: todayStr,
        time: time || new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        status: targetStatus,
        notes: notes || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Presensi guru berhasil disimpan di database.",
      record,
    });
  } catch (err: any) {
    console.error("POST /api/teacher-attendance error:", err);
    return NextResponse.json(
      { error: "Gagal menyimpan presensi guru: " + err.message },
      { status: 500 }
    );
  }
}
