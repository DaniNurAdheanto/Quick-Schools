import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0];

    const [
      totalStudents,
      totalTeachers,
      totalClasses,
      totalSubjects,
      attendancesToday,
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

    return NextResponse.json({
      success: true,
      stats: {
        totalStudents,
        totalTeachers,
        totalClasses,
        totalSubjects,
        pendingLeaves,
        attendanceToday: attendanceSummary,
      },
      recentAnnouncements,
    });
  } catch (error: any) {
    console.error("GET /api/dashboard/stats error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
