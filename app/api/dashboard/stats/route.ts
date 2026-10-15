import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSchoolOperationalDay, getIndonesianDayName } from "@/lib/operational-days";

export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0];

    // Compute last 7 days dates
    const last7Days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Days.push(d.toISOString().split("T")[0]);
    }
    const startDate = last7Days[0];
    const endDate = today;

    const [
      totalStudents,
      totalTeachers,
      totalClasses,
      totalSubjects,
      attendancesToday,
      teacherAttendancesToday,
      studentHistorical7d,
      teacherHistorical7d,
      pendingLeaves,
      recentAnnouncements,
    ] = await Promise.all([
      prisma.student.count({ where: { status: "Aktif" } }),
      prisma.teacher.count({ where: { status: "Aktif" } }),
      prisma.class.count(),
      prisma.subject.count(),
      prisma.attendance.groupBy({
        by: ["status"],
        where: { date: today },
        _count: { status: true },
      }),
      prisma.teacherAttendance.groupBy({
        by: ["status"],
        where: { date: today },
        _count: { status: true },
      }),
      prisma.attendance.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
        },
        select: { date: true, status: true },
      }),
      prisma.teacherAttendance.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
        },
        select: { date: true, status: true },
      }),
      prisma.leaveRequest.count({ where: { status: "PENDING" } }),
      prisma.announcement.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const attendanceSummary = {
      HADIR: 0,
      TERLAMBAT: 0,
      IZIN: 0,
      SAKIT: 0,
      ALPA: 0,
    };

    attendancesToday.forEach((item) => {
      if (item.status in attendanceSummary) {
        attendanceSummary[item.status as keyof typeof attendanceSummary] = item._count.status;
      }
    });

    const teacherAttendanceSummary = {
      HADIR: 0,
      TERLAMBAT: 0,
      IZIN: 0,
      SAKIT: 0,
      ALPA: 0,
    };

    teacherAttendancesToday.forEach((item) => {
      if (item.status in teacherAttendanceSummary) {
        teacherAttendanceSummary[item.status as keyof typeof teacherAttendanceSummary] = item._count.status;
      }
    });

    // Compute weekly trend
    const weeklyTrends = last7Days.map((dStr) => {
      const isOp = isSchoolOperationalDay(dStr, "Senin - Jumat");
      const dayLabel = getIndonesianDayName(dStr);

      const sRecs = studentHistorical7d.filter((r) => r.date === dStr);
      let sHadir = 0;
      let sTerlambat = 0;
      let sIzin = 0;
      let sSakit = 0;
      let sAlpa = 0;

      sRecs.forEach((r) => {
        if (r.status === "HADIR") sHadir++;
        else if (r.status === "TERLAMBAT") { sTerlambat++; sHadir++; }
        else if (r.status === "IZIN") sIzin++;
        else if (r.status === "SAKIT") sSakit++;
        else if (r.status === "ALPA") sAlpa++;
      });

      const tRecs = teacherHistorical7d.filter((r) => r.date === dStr);
      let tHadir = 0;
      let tTerlambat = 0;

      tRecs.forEach((r) => {
        if (r.status === "HADIR") tHadir++;
        else if (r.status === "TERLAMBAT") { tTerlambat++; tHadir++; }
      });

      const sRate = isOp && totalStudents > 0 ? Math.min(100, Math.round((sHadir / totalStudents) * 100)) : 0;
      const tRate = isOp && totalTeachers > 0 ? Math.min(100, Math.round((tHadir / totalTeachers) * 100)) : 0;

      return {
        date: new Date(`${dStr}T12:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
        fullDate: dStr,
        dayName: dayLabel,
        isOperational: isOp,
        siswaHadir: sHadir,
        siswaTerlambat: sTerlambat,
        siswaIzin: sIzin,
        siswaSakit: sSakit,
        siswaAlpa: sAlpa,
        siswaRate: sRate,
        guruHadir: tHadir,
        guruRate: tRate,
      };
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalStudents,
        totalTeachers,
        totalClasses,
        totalSubjects,
        pendingLeaves,
        attendanceToday: attendanceSummary,
        teacherAttendanceToday: teacherAttendanceSummary,
        weeklyTrends,
      },
      recentAnnouncements,
    });
  } catch (error: any) {
    console.error("GET /api/dashboard/stats error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
