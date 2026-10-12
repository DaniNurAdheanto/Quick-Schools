import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const classId = searchParams.get("classId");
    const subjectId = searchParams.get("subjectId");
    const teacherId = searchParams.get("teacherId");

    const where: any = {};
    if (studentId) where.studentId = studentId;
    if (classId) where.classId = classId;
    if (subjectId) where.subjectId = subjectId;
    if (teacherId) where.teacherId = teacherId;

    const grades = await prisma.grade.findMany({
      where,
      include: {
        student: { select: { id: true, fullName: true, nisn: true } },
        subject: { select: { id: true, name: true, code: true } },
        class: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = grades.map((g) => ({
      id: g.id,
      _firestoreId: g.id,
      type: g.type,
      score: g.score,
      notes: g.notes || "-",
      studentId: g.studentId,
      studentName: g.student?.fullName || "-",
      subjectId: g.subjectId,
      subject: g.subject?.name || "Mata Pelajaran",
      subjectName: g.subject?.name || "Mata Pelajaran",
      subjectCode: g.subject?.code || "-",
      classId: g.classId,
      className: g.class?.name || "-",
      class: g.class?.name || "-",
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.updatedAt.toISOString(),
    }));

    return NextResponse.json({ success: true, grades: formatted });
  } catch (error: any) {
    console.error("GET /api/grades error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, subjectId, classId, teacherId, academicYearId, type, score, notes } = body;

    const grade = await prisma.grade.create({
      data: {
        studentId,
        subjectId,
        classId,
        teacherId,
        academicYearId,
        type: type || "Tugas",
        score: Number(score),
        notes,
      },
      include: {
        student: true,
        subject: true,
        class: true,
      },
    });

    const formatted = {
      id: grade.id,
      type: grade.type,
      score: grade.score,
      notes: grade.notes || "-",
      studentId: grade.studentId,
      studentName: grade.student?.fullName || "-",
      subjectId: grade.subjectId,
      subject: grade.subject?.name || "Mata Pelajaran",
      subjectName: grade.subject?.name || "Mata Pelajaran",
      classId: grade.classId,
      className: grade.class?.name || "-",
    };

    return NextResponse.json({ success: true, grade: formatted }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/grades error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, type, score, notes, studentId, subjectId, classId, teacherId, academicYearId } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID nilai wajib disertakan" }, { status: 400 });
    }

    const updated = await prisma.grade.update({
      where: { id },
      data: {
        ...(type !== undefined ? { type } : {}),
        ...(score !== undefined ? { score: Number(score) } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(studentId ? { studentId } : {}),
        ...(subjectId ? { subjectId } : {}),
        ...(classId ? { classId } : {}),
        ...(teacherId !== undefined ? { teacherId } : {}),
        ...(academicYearId !== undefined ? { academicYearId } : {}),
      },
      include: {
        student: { select: { id: true, fullName: true, nisn: true } },
        subject: { select: { id: true, name: true, code: true } },
        class: { select: { id: true, name: true } },
      },
    });

    const formatted = {
      id: updated.id,
      type: updated.type,
      score: updated.score,
      notes: updated.notes || "-",
      studentId: updated.studentId,
      studentName: updated.student?.fullName || "-",
      subjectId: updated.subjectId,
      subject: updated.subject?.name || "Mata Pelajaran",
      subjectName: updated.subject?.name || "Mata Pelajaran",
      classId: updated.classId,
      className: updated.class?.name || "-",
    };

    return NextResponse.json({ success: true, grade: formatted });
  } catch (error: any) {
    console.error("PUT /api/grades error:", error);
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
      return NextResponse.json({ success: false, error: "ID nilai wajib disertakan" }, { status: 400 });
    }

    await prisma.grade.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Nilai berhasil dihapus" });
  } catch (error: any) {
    console.error("DELETE /api/grades error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

