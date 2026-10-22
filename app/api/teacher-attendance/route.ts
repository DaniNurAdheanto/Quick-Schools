import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AttendanceStatus } from "@prisma/client";
import { isSchoolOperationalDay, getIndonesianDayName, OperationalDaysPattern } from "@/lib/operational-days";

const statusMappingToEnum: Record<string, AttendanceStatus> = {
  "Hadir": AttendanceStatus.HADIR,
  "Tepat Waktu": AttendanceStatus.HADIR,
  "Terlambat": AttendanceStatus.TERLAMBAT,
  "Izin": AttendanceStatus.IZIN,
  "Sakit": AttendanceStatus.SAKIT,
  "Alpa": AttendanceStatus.ALPA,
  "Cuti": AttendanceStatus.IZIN,
  "Pulang Awal": AttendanceStatus.HADIR,
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

// GET /api/teacher-attendance - List teacher attendance records, date range queries, and daily trends
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const today = new Date().toISOString().split("T")[0];
    const operationalDays = (searchParams.get("operationalDays") || "Senin - Jumat") as OperationalDaysPattern;
    const range = searchParams.get("range"); // "7d" | "14d" | "30d" | "all"
    let startDate = searchParams.get("startDate");
    let endDate = searchParams.get("endDate");
    const singleDate = searchParams.get("date");
    const month = searchParams.get("month"); // "YYYY-MM"
    const all = searchParams.get("all") === "true" || range === "all";
    const teacherId = searchParams.get("teacherId");

    // 1. Fetch all active teachers
    const allTeachers = await prisma.teacher.findMany({
      where: { status: "Aktif" },
      include: {
        user: true,
        homeroomForClass: true,
      },
      orderBy: { fullName: "asc" },
    });
    const totalTeachers = allTeachers.length;

    // Handle "all" preset
    if (all) {
      startDate = "2020-01-01";
      endDate = "2030-12-31";
    }

    // Handle "month" preset (e.g. 2026-10)
    if (month && !startDate) {
      const parts = month.split("-").map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        const y = parts[0];
        const m = parts[1];
        const daysInMonth = new Date(y, m, 0).getDate();
        startDate = `${month}-01`;
        endDate = `${month}-${String(daysInMonth).padStart(2, "0")}`;
      }
    }

    // Handle range preset
    if (range && range !== "all" && !startDate) {
      const daysCount = range === "30d" ? 30 : range === "14d" ? 14 : 7;
      const startD = new Date();
      startD.setDate(startD.getDate() - (daysCount - 1));
      startDate = startD.toISOString().split("T")[0];
      endDate = today;
    }

    const isRangeQuery = Boolean(startDate && endDate);

    // -------------------------------------------------------------
    // Branch A: Range / Month / All Query (Multi-day Historical Data & Trends)
    // -------------------------------------------------------------
    if (isRangeQuery && startDate && endDate) {
      const whereClause: any = {
        date: {
          gte: startDate,
          lte: endDate,
        },
      };

      if (teacherId) {
        whereClause.teacherId = teacherId;
      }

      const attendances = await prisma.teacherAttendance.findMany({
        where: whereClause,
        include: {
          teacher: {
            include: {
              user: true,
              homeroomForClass: true,
            },
          },
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      });

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
        let tepatWaktu = 0;
        let terlambat = 0;
        let izin = 0;
        let sakit = 0;
        let alpa = 0;

        dayRecords.forEach((att) => {
          if (att.status === AttendanceStatus.HADIR) {
            hadir++;
            tepatWaktu++;
          } else if (att.status === AttendanceStatus.TERLAMBAT) {
            hadir++;
            terlambat++;
          } else if (att.status === AttendanceStatus.IZIN) {
            izin++;
          } else if (att.status === AttendanceStatus.SAKIT) {
            sakit++;
          } else if (att.status === AttendanceStatus.ALPA) {
            alpa++;
          }
        });

        const isPastDate = dStr < today;
        const isToday = dStr === today;
        const isPastCutoff = isPastDate || (isToday && now.getHours() >= 12);

        // Auto-alpa for teachers on operational days after cutoff if not checked in
        if (isOp && isPastCutoff && totalTeachers > dayRecords.length) {
          alpa += (totalTeachers - dayRecords.length);
        }

        const totalMarked = hadir + izin + sakit + alpa;
        const rate = isOp && totalTeachers > 0
          ? Math.min(100, Math.round((hadir / totalTeachers) * 100))
          : 0;

        return {
          date: new Date(`${dStr}T12:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
          fullDate: dStr,
          dayName: dayLabel,
          isOperational: isOp,
          hadir,
          tepatWaktu,
          terlambat,
          izin,
          sakit,
          alpa,
          tidakHadir: izin + sakit + alpa,
          total: totalMarked,
          rate,
          totalTeachers,
        };
      });

      const mappedRecords = attendances.map((att) => {
        const statusStr = statusEnumToString[att.status] || "Hadir";
        const isHadirOrTerlambat = att.status === AttendanceStatus.HADIR || att.status === AttendanceStatus.TERLAMBAT;
        const isTerlambat = att.status === AttendanceStatus.TERLAMBAT;
        const checkInTimeStr = att.time || (att.checkInTime ? att.checkInTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "07:00");
        const checkOutTimeStr = att.checkOutTime ? att.checkOutTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : (isHadirOrTerlambat ? "15:30" : null);

        return {
          id: att.id,
          teacherId: att.teacherId,
          nip: att.teacher.nip,
          name: att.teacher.fullName,
          fullName: att.teacher.fullName,
          teacherName: att.teacher.fullName,
          subject: (att.teacher as any).subject || "Guru Pengajar",
          email: att.teacher.user?.email || "-",
          phone: att.teacher.phone || "-",
          date: att.date,
          time: checkInTimeStr,
          clockIn: isHadirOrTerlambat ? {
            time: checkInTimeStr,
            timestamp: `${att.date}T${checkInTimeStr}:00`,
            status: isTerlambat ? "Terlambat" : "Tepat Waktu",
            lateMinutes: isTerlambat ? 15 : 0,
            location: {
              lat: att.latitude || -6.16968,
              lng: att.longitude || 107.00562,
              address: "Area Kampus Sekolah",
              inRadius: true,
              distanceMeters: 5,
            },
            notes: att.notes || (isTerlambat ? "Terlambat hadir" : "Presensi masuk tepat waktu"),
          } : null,
          clockOut: checkOutTimeStr ? {
            time: checkOutTimeStr,
            timestamp: `${att.date}T${checkOutTimeStr}:00`,
            status: "Normal",
            earlyMinutes: 0,
            location: {
              lat: att.latitude || -6.16968,
              lng: att.longitude || 107.00562,
              address: "Area Kampus Sekolah",
              inRadius: true,
              distanceMeters: 5,
            },
            notes: "Presensi pulang harian",
          } : null,
          workDurationMinutes: isHadirOrTerlambat ? 480 : 0,
          workDurationFormatted: isHadirOrTerlambat ? "8 jam" : "0m",
          academicYear: "2025/2026",
          semester: "Ganjil",
          status: statusStr,
          notes: att.notes || null,
          latitude: att.latitude,
          longitude: att.longitude,
        };
      });

      return NextResponse.json({
        success: true,
        startDate,
        endDate,
        operationalDays,
        totalTeachers,
        dailyTrends,
        records: mappedRecords,
        attendance: mappedRecords,
      });
    }

    // -------------------------------------------------------------
    // Branch B: Single Date Query
    // -------------------------------------------------------------
    const targetDate = singleDate || today;
    const isOperational = isSchoolOperationalDay(targetDate, operationalDays);
    const dayName = getIndonesianDayName(targetDate);

    const attendances = await prisma.teacherAttendance.findMany({
      where: { date: targetDate },
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

    const attendanceMap = new Map(attendances.map((a) => [a.teacherId, a]));

    const now = new Date();
    const isPastDate = targetDate < today;
    const isToday = targetDate === today;
    const isPastCutoff = isPastDate || (isToday && now.getHours() >= 12);

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
      } else if (!isOperational) {
        statusStr = "Libur";
      } else if (isPastCutoff) {
        statusStr = "Alpa";
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

      const isHadirOrTerlambat = statusStr === "Hadir" || statusStr === "Terlambat";
      const isTerlambat = statusStr === "Terlambat";

      return {
        id: att?.id || `tc_att_${tc.id}`,
        teacherId: tc.id,
        nip: tc.nip,
        name: tc.fullName,
        fullName: tc.fullName,
        teacherName: tc.fullName,
        subject: (tc as any).subject || "Guru Pengajar",
        email: tc.user?.email || "-",
        phone: tc.phone || "-",
        date: targetDate,
        time: checkInTimeStr,
        clockIn: att ? {
          time: checkInTimeStr,
          timestamp: `${targetDate}T${checkInTimeStr}:00`,
          status: isTerlambat ? "Terlambat" : "Tepat Waktu",
          lateMinutes: isTerlambat ? 15 : 0,
        } : null,
        clockOut: att?.checkOutTime ? {
          time: att.checkOutTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
          timestamp: `${targetDate}T${att.checkOutTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}:00`,
          status: "Normal",
        } : (isHadirOrTerlambat ? {
          time: "15:30",
          status: "Normal",
        } : null),
        workDurationMinutes: isHadirOrTerlambat ? 480 : 0,
        workDurationFormatted: isHadirOrTerlambat ? "8 jam" : "0m",
        academicYear: "2025/2026",
        semester: "Ganjil",
        status: statusStr,
        notes: att?.notes || null,
        latitude: att?.latitude || null,
        longitude: att?.longitude || null,
      };
    });

    const rate = isOperational && totalTeachers > 0 ? Math.min(100, Math.round((hadirCount / totalTeachers) * 100)) : 0;

    return NextResponse.json({
      success: true,
      date: targetDate,
      dayName,
      isOperational,
      operationalDays,
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

    const isBatch = Array.isArray(body) || (body.batch && Array.isArray(body.batch));
    const items = isBatch ? (Array.isArray(body) ? body : body.batch) : [body];

    if (items.length === 0) {
      return NextResponse.json({ error: "Data presensi guru kosong." }, { status: 400 });
    }

    const todayStr = new Date().toISOString().split("T")[0];

    const upsertPromises = items.map(async (item: any) => {
      const { teacherId, nip, date, time, status, notes, latitude, longitude } = item;

      // Find teacher by id or nip
      const teacher = await prisma.teacher.findFirst({
        where: {
          OR: [
            { id: teacherId || "" },
            { nip: String(nip || teacherId || "").trim() },
          ],
        },
      });

      if (!teacher) return null;

      const targetDate = date || todayStr;
      const targetStatus = statusMappingToEnum[String(status)] || AttendanceStatus.HADIR;

      return prisma.teacherAttendance.upsert({
        where: {
          teacherId_date: {
            teacherId: teacher.id,
            date: targetDate,
          },
        },
        update: {
          status: targetStatus,
          time: time || undefined,
          notes: notes !== undefined ? notes : undefined,
          latitude: latitude ? parseFloat(latitude) : undefined,
          longitude: longitude ? parseFloat(longitude) : undefined,
        },
        create: {
          teacherId: teacher.id,
          date: targetDate,
          time: time || new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
          status: targetStatus,
          notes: notes || null,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
        },
      });
    });

    const results = (await Promise.all(upsertPromises)).filter(Boolean);

    return NextResponse.json({
      success: true,
      message: `Presensi ${results.length} guru berhasil disimpan di database secara permanen.`,
      count: results.length,
      records: results,
    });
  } catch (err: any) {
    console.error("POST /api/teacher-attendance error:", err);
    return NextResponse.json(
      { error: "Gagal menyimpan presensi guru: " + err.message },
      { status: 500 }
    );
  }
}
