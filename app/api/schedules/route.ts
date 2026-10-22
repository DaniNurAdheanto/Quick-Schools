import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const teacherId = searchParams.get("teacherId");
    const dayOfWeek = searchParams.get("dayOfWeek");

    const where: any = {};
    if (classId) where.classId = classId;
    if (teacherId) where.teacherId = teacherId;
    if (dayOfWeek) where.dayOfWeek = parseInt(dayOfWeek, 10);

    const schedules = await prisma.schedule.findMany({
      where,
      include: {
        class: true,
        subject: true,
        teacher: true,
        academicYear: true,
      },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    const formatted = schedules.map((s) => ({
      id: s.id,
      _firestoreId: s.id,
      dayOfWeek: s.dayOfWeek,
      day: ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][s.dayOfWeek] || "Senin",
      startTime: s.startTime,
      endTime: s.endTime,
      room: s.room || "R. Kelas",
      classId: s.classId,
      className: s.class?.name || "-",
      class: s.class?.name || "-",
      subjectId: s.subjectId,
      subject: s.subject?.name || "Mata Pelajaran",
      subjectName: s.subject?.name || "Mata Pelajaran",
      subjectCode: s.subject?.code || "-",
      teacherId: s.teacherId,
      teacher: s.teacher?.fullName || "Guru Pengajar",
      teacherName: s.teacher?.fullName || "Guru Pengajar",
      academicYearId: s.academicYearId,
      academicYear: s.academicYear?.name || "2025/2026",
      semester: s.academicYear?.semester || "Ganjil",
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    return NextResponse.json({ success: true, schedules: formatted });
  } catch (error: any) {
    console.error("GET /api/schedules error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { classId, subjectId, teacherId, dayOfWeek, startTime, endTime, room, academicYearId } = body;

    const schedule = await prisma.schedule.create({
      data: {
        classId,
        subjectId,
        teacherId,
        dayOfWeek: Number(dayOfWeek),
        startTime,
        endTime,
        room,
        academicYearId,
      },
      include: {
        class: true,
        subject: true,
        teacher: true,
        academicYear: true,
      },
    });

    const formatted = {
      id: schedule.id,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      room: schedule.room || "R. Kelas",
      classId: schedule.classId,
      className: schedule.class?.name || "-",
      class: schedule.class?.name || "-",
      subjectId: schedule.subjectId,
      subject: schedule.subject?.name || "Mata Pelajaran",
      subjectName: schedule.subject?.name || "Mata Pelajaran",
      teacherId: schedule.teacherId,
      teacher: schedule.teacher?.fullName || "-",
      teacherName: schedule.teacher?.fullName || "-",
      academicYearId: schedule.academicYearId,
      academicYear: schedule.academicYear?.name || "2025/2026",
      semester: schedule.academicYear?.semester || "Ganjil",
    };

    return NextResponse.json({ success: true, schedule: formatted }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/schedules error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, classId, subjectId, teacherId, dayOfWeek, startTime, endTime, room, academicYearId } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID jadwal wajib disertakan" }, { status: 400 });
    }

    const updated = await prisma.schedule.update({
      where: { id },
      data: {
        ...(classId ? { classId } : {}),
        ...(subjectId ? { subjectId } : {}),
        ...(teacherId ? { teacherId } : {}),
        ...(dayOfWeek !== undefined ? { dayOfWeek: Number(dayOfWeek) } : {}),
        ...(startTime ? { startTime } : {}),
        ...(endTime ? { endTime } : {}),
        ...(room !== undefined ? { room } : {}),
        ...(academicYearId !== undefined ? { academicYearId } : {}),
      },
      include: {
        class: true,
        subject: true,
        teacher: true,
        academicYear: true,
      },
    });

    const formatted = {
      id: updated.id,
      dayOfWeek: updated.dayOfWeek,
      startTime: updated.startTime,
      endTime: updated.endTime,
      room: updated.room || "R. Kelas",
      classId: updated.classId,
      className: updated.class?.name || "-",
      class: updated.class?.name || "-",
      subjectId: updated.subjectId,
      subject: updated.subject?.name || "Mata Pelajaran",
      subjectName: updated.subject?.name || "Mata Pelajaran",
      teacherId: updated.teacherId,
      teacher: updated.teacher?.fullName || "-",
      teacherName: updated.teacher?.fullName || "-",
      academicYearId: updated.academicYearId,
      academicYear: updated.academicYear?.name || "2025/2026",
      semester: updated.academicYear?.semester || "Ganjil",
    };

    return NextResponse.json({ success: true, schedule: formatted });
  } catch (error: any) {
    console.error("PUT /api/schedules error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");
    if (!id) {
      try {
        const body = await request.json();
        id = body.id;
      } catch (e) {}
    }

    if (!id) {
      return NextResponse.json({ success: false, error: "ID jadwal wajib disertakan" }, { status: 400 });
    }

    await prisma.schedule.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Jadwal berhasil dihapus" });
  } catch (error: any) {
    console.error("DELETE /api/schedules error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

