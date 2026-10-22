import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AttendanceStatus } from "@prisma/client";
import { isSchoolOperationalDay, getIndonesianDayName, OperationalDaysPattern } from "@/lib/operational-days";

const statusMappingToEnum: Record<string, AttendanceStatus> = {
  "Hadir": AttendanceStatus.HADIR,
  "Terlambat": AttendanceStatus.TERLAMBAT,
  "Izin": AttendanceStatus.IZIN,
  "Sakit": AttendanceStatus.SAKIT,
  "Alpa": AttendanceStatus.ALPA,
  "Tidak Hadir": AttendanceStatus.ALPA,
  "Ditolak": AttendanceStatus.ALPA,
};

const statusEnumToString: Record<AttendanceStatus, string> = {
  HADIR: "Hadir",
  TERLAMBAT: "Terlambat",
  IZIN: "Izin",
  SAKIT: "Sakit",
  ALPA: "Alpa",
};

function getDaysBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  const curr = new Date(`${start}T12:00:00`);
  const stop = new Date(`${end}T12:00:00`);
  while (curr <= stop) {
    dates.push(curr.toISOString().split("T")[0]);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

// GET /api/attendance - List attendance records, historical range queries, and daily trends
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const today = new Date().toISOString().split("T")[0];
    const operationalDays = (searchParams.get("operationalDays") || "Senin - Jumat") as OperationalDaysPattern;
    const classId = searchParams.get("classId");
    const range = searchParams.get("range"); // "7d" | "14d" | "30d"
    let startDate = searchParams.get("startDate");
    let endDate = searchParams.get("endDate");
    const singleDate = searchParams.get("date");

    // 1. Fetch total active students for baseline rate calculations
    const studentsWhere: any = { status: "Aktif" };
    if (classId && classId !== "all") {
      studentsWhere.classId = classId;
    }
    const allStudents = await prisma.student.findMany({
      where: studentsWhere,
      include: { class: true },
    });
    const totalStudents = allStudents.length;

    const month = searchParams.get("month"); // e.g. "2026-10"
    const studentId = searchParams.get("studentId");

    // Handle month / range calculation
    if (month && !startDate) {
      const [yStr, mStr] = month.split("-");
      const year = parseInt(yStr, 10);
      const m = parseInt(mStr, 10);
      if (!isNaN(year) && !isNaN(m)) {
        const lastDay = new Date(year, m, 0).getDate();
        startDate = `${month}-01`;
        endDate = `${month}-${String(lastDay).padStart(2, "0")}`;
      }
    } else if (range && !startDate) {
      const daysCount = range === "30d" ? 30 : range === "14d" ? 14 : 7;
      const startD = new Date();
      startD.setDate(startD.getDate() - (daysCount - 1));
      startDate = startD.toISOString().split("T")[0];
      endDate = today;
    }

    const isRangeQuery = Boolean(startDate && endDate);

    // -------------------------------------------------------------
    // Branch A: Range Query (Multi-day Historical Data & Trends)
    // -------------------------------------------------------------
    if (isRangeQuery && startDate && endDate) {
      const whereClause: any = {
        date: {
          gte: startDate,
          lte: endDate,
        },
      };
      if (classId && classId !== "all") {
        whereClause.classId = classId;
      }
      if (studentId) {
        whereClause.studentId = studentId;
      }

      const attendances = await prisma.attendance.findMany({
        where: whereClause,
        include: {
          student: {
            include: {
              class: true,
            },
          },
        },
        orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      });

      // Group records by date
      const recordsByDate = new Map<string, typeof attendances>();
      attendances.forEach((att) => {
        const list = recordsByDate.get(att.date) || [];
        list.push(att);
        recordsByDate.set(att.date, list);
      });

      const allDatesInRange = getDaysBetween(startDate, endDate);
      const now = new Date();

      const dailyTrends = allDatesInRange.map((dStr) => {
        const isOp = isSchoolOperationalDay(dStr, operationalDays);
        const dayLabel = getIndonesianDayName(dStr);
        const dayRecords = recordsByDate.get(dStr) || [];

        let hadir = 0;
        let terlambat = 0;
        let izin = 0;
        let sakit = 0;
        let alpa = 0;

        dayRecords.forEach((att) => {
          if (att.status === AttendanceStatus.HADIR) hadir++;
          else if (att.status === AttendanceStatus.TERLAMBAT) { terlambat++; hadir++; }
          else if (att.status === AttendanceStatus.IZIN) izin++;
          else if (att.status === AttendanceStatus.SAKIT) sakit++;
          else if (att.status === AttendanceStatus.ALPA) alpa++;
        });

        const isPastDate = dStr < today;
        const isToday = dStr === today;
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        // Auto-alpa only on operational school days for unrecorded active students (after 09:00 WIB threshold / 10:00 WIB lock)
        const isPastAbsentTime = isPastDate || (isToday && currentMinutes >= 9 * 60);
        if (isOp && isPastAbsentTime && totalStudents > dayRecords.length) {
          alpa += (totalStudents - dayRecords.length);
        }

        const totalMarked = hadir + izin + sakit + alpa;
        const rate = isOp && totalStudents > 0
          ? Math.min(100, Math.round((hadir / totalStudents) * 100))
          : 0;

        return {
          date: new Date(`${dStr}T12:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
          fullDate: dStr,
          dayName: dayLabel,
          isOperational: isOp,
          hadir,
          terlambat,
          izin,
          sakit,
          alpa,
          tidakHadir: izin + sakit + alpa,
          total: totalMarked,
          rate,
          totalStudents,
        };
      });

      const mappedRecords = attendances.map((att) => ({
        id: att.id,
        studentId: att.studentId,
        nisn: att.student.nisn,
        name: att.student.fullName,
        fullName: att.student.fullName,
        className: att.student.class?.name || "10 MIPA 1",
        classId: att.classId,
        date: att.date,
        time: att.time || "-",
        status: statusEnumToString[att.status] || "Hadir",
        notes: att.notes || null,
        isFinal: att.isFinal,
        latitude: att.latitude,
        longitude: att.longitude,
      }));

      return NextResponse.json({
        success: true,
        startDate,
        endDate,
        operationalDays,
        totalStudents,
        dailyTrends,
        records: mappedRecords,
        attendance: mappedRecords,
      });
    }

    // -------------------------------------------------------------
    // Branch B: Single Date Query (Default / Specific Date)
    // -------------------------------------------------------------
    const targetDate = singleDate || today;
    const isOperational = isSchoolOperationalDay(targetDate, operationalDays);
    const dayName = getIndonesianDayName(targetDate);

    const whereClause: any = { date: targetDate };
    if (classId && classId !== "all") {
      whereClause.classId = classId;
    }

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

    const attendanceMap = new Map(attendances.map((a) => [a.studentId, a]));

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const isPastDate = targetDate < today;
    const isToday = targetDate === today;
    const isPastAbsentThreshold = isPastDate || (isToday && currentMinutes >= 9 * 60); // Selewat 09:00 WIB -> Alpa
    const isPastCutoff = isPastDate || (isToday && currentMinutes >= 10 * 60); // 10:00 WIB -> Final Lock

    // Otomatis simpan siswa yang belum absen ke database PostgreSQL saat sudah melewati 10:00 WIB (Data Final Terkunci)
    if (isOperational && isPastCutoff) {
      const missingStudents = allStudents.filter((st) => !attendanceMap.has(st.id));
      if (missingStudents.length > 0) {
        await prisma.attendance.createMany({
          data: missingStudents.map((st) => ({
            studentId: st.id,
            classId: st.classId,
            date: targetDate,
            status: AttendanceStatus.ALPA,
            time: "-",
            notes: "Otomatis Alpa (Melewati Batas Presensi 09:00 WIB & Terkunci Final 10:00 WIB)",
            isFinal: true,
          })),
          skipDuplicates: true,
        });

        // Refresh database records
        const refreshedAttendances = await prisma.attendance.findMany({
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
        attendances.length = 0;
        attendances.push(...refreshedAttendances);
        attendanceMap.clear();
        refreshedAttendances.forEach((a) => attendanceMap.set(a.studentId, a));
      }

      // Kunci semua presensi hari ini berstatus isFinal = true
      await prisma.attendance.updateMany({
        where: {
          date: targetDate,
          isFinal: false,
        },
        data: {
          isFinal: true,
        },
      });
    }

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
      } else if (!isOperational) {
        // Non-operational days (holiday) should NOT be counted as Alpa
        statusStr = "Libur";
      } else if (isPastAbsentThreshold || isPastCutoff) {
        // Selewat jam 09:00 WIB otomatis menjadi Alpa
        statusStr = "Alpa";
      }

      if (statusStr === "Hadir") hadirCount++;
      else if (statusStr === "Terlambat") { terlambatCount++; hadirCount++; }
      else if (statusStr === "Izin") izinCount++;
      else if (statusStr === "Sakit") sakitCount++;
      else if (statusStr === "Alpa") alpaCount++;

      return {
        id: att?.id || `sim_${st.id}`,
        studentId: st.id,
        nisn: st.nisn,
        name: st.fullName,
        fullName: st.fullName,
        className: st.class?.name || "10 MIPA 1",
        classId: st.classId,
        date: targetDate,
        time: att?.time || (att ? att.createdAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"),
        status: statusStr,
        notes: att?.notes || null,
        isFinal: isPastCutoff || att?.isFinal || false,
        isRecorded: Boolean(att),
        latitude: att?.latitude || null,
        longitude: att?.longitude || null,
      };
    });

    return NextResponse.json({
      success: true,
      date: targetDate,
      dayName,
      isOperational,
      operationalDays,
      stats: {
        totalStudents: allStudents.length,
        hadir: hadirCount,
        terlambat: terlambatCount,
        izin: izinCount,
        sakit: sakitCount,
        alpa: alpaCount,
        rate: isOperational && allStudents.length > 0 ? Math.round((hadirCount / allStudents.length) * 100) : 0,
      },
      records: mergedList,
      attendance: mergedList,
    });
  } catch (err: any) {
    console.error("GET /api/attendance error:", err);
    return NextResponse.json({ error: "Gagal memuat data presensi: " + err.message }, { status: 500 });
  }
}

// POST /api/attendance - Log, update, or batch upsert attendance records permanently in PostgreSQL
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Check if this is a batch upsert
    const isBatch = Array.isArray(body) || (body.batch && Array.isArray(body.batch));
    const items = isBatch ? (Array.isArray(body) ? body : body.batch) : [body];

    if (items.length === 0) {
      return NextResponse.json({ error: "Data presensi kosong." }, { status: 400 });
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const now = new Date();

    const upsertPromises = items.map(async (item: any) => {
      const { studentId, nisn, date, status, notes, time, latitude, longitude, classId } = item;
      const targetDate = date || todayStr;

      // Find student
      const student = await prisma.student.findFirst({
        where: {
          OR: [{ id: studentId || "" }, { nisn: String(nisn || studentId || "").trim() }],
        },
      });

      if (!student) return null;

      const targetStatus = statusMappingToEnum[String(status)] || AttendanceStatus.HADIR;
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const isPastCutoff = targetDate < todayStr || (targetDate === todayStr && currentMinutes >= 10 * 60);
      const currentTimeStr = time || now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

      // Cek apakah data sudah dikunci (isFinal) di database atau sudah lewat pukul 10:00 WIB
      const existing = await prisma.attendance.findUnique({
        where: {
          studentId_date: {
            studentId: student.id,
            date: targetDate,
          },
        },
      });

      if (existing?.isFinal || (existing && isPastCutoff)) {
        // Data sudah berstatus FINAL dan dikunci (tidak dapat diubah kembali)
        return existing;
      }

      return prisma.attendance.upsert({
        where: {
          studentId_date: {
            studentId: student.id,
            date: targetDate,
          },
        },
        update: {
          status: targetStatus,
          notes: notes !== undefined ? notes : undefined,
          time: currentTimeStr,
          isFinal: isPastCutoff,
          latitude: latitude ? Number(latitude) : undefined,
          longitude: longitude ? Number(longitude) : undefined,
          classId: classId || student.classId,
        },
        create: {
          studentId: student.id,
          classId: classId || student.classId,
          date: targetDate,
          status: targetStatus,
          time: currentTimeStr,
          notes: notes || null,
          isFinal: isPastCutoff,
          latitude: latitude ? Number(latitude) : null,
          longitude: longitude ? Number(longitude) : null,
        },
      });
    });

    const results = (await Promise.all(upsertPromises)).filter(Boolean);

    return NextResponse.json({
      success: true,
      message: `Berhasil menyimpan ${results.length} data presensi siswa ke database secara permanen.`,
      count: results.length,
      records: results,
    });
  } catch (err: any) {
    console.error("POST /api/attendance error:", err);
    return NextResponse.json({ error: "Gagal mencatat presensi: " + err.message }, { status: 500 });
  }
}
