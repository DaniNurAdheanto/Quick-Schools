import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { classId, className, studentIds, action } = body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { error: "Daftar ID siswa wajib disertakan (minimal 1 siswa)." },
        { status: 400 }
      );
    }

    const cleanAction = String(action || "assign").toLowerCase().trim();
    const cleanStudentIds = studentIds.map((id: any) => String(id).trim()).filter(Boolean);

    // 1. Unassign action: Remove students from class
    if (cleanAction === "unassign" || cleanAction === "remove") {
      // Find matching students in database
      const matchedStudents = await prisma.student.findMany({
        where: {
          OR: [
            { id: { in: cleanStudentIds } },
            { nisn: { in: cleanStudentIds } },
            { nis: { in: cleanStudentIds } },
            { userId: { in: cleanStudentIds } },
          ],
        },
      });

      if (matchedStudents.length > 0) {
        const studentPrimaryIds = matchedStudents.map((s) => s.id);
        await prisma.student.updateMany({
          where: { id: { in: studentPrimaryIds } },
          data: { classId: null },
        });
      }

      return NextResponse.json({
        success: true,
        message: `Berhasil mengeluarkan ${matchedStudents.length} siswa dari kelas.`,
        count: matchedStudents.length,
      });
    }

    // 2. Assign or Transfer action:
    const targetClassQuery = String(classId || className || "").trim();
    if (!targetClassQuery) {
      return NextResponse.json(
        { error: "ID atau nama kelas tujuan wajib disertakan." },
        { status: 400 }
      );
    }

    // Resolve target class
    const foundClass = await prisma.class.findFirst({
      where: {
        OR: [
          { id: targetClassQuery },
          { name: { equals: targetClassQuery, mode: "insensitive" } },
        ],
      },
    });

    if (!foundClass) {
      return NextResponse.json(
        { error: `Kelas tujuan '${targetClassQuery}' tidak ditemukan di database.` },
        { status: 404 }
      );
    }

    // Find students by various matching identifiers (id, nisn, nis, userId)
    const matchedStudents = await prisma.student.findMany({
      where: {
        OR: [
          { id: { in: cleanStudentIds } },
          { nisn: { in: cleanStudentIds } },
          { nis: { in: cleanStudentIds } },
          { userId: { in: cleanStudentIds } },
        ],
      },
    });

    if (matchedStudents.length === 0) {
      return NextResponse.json(
        { error: "Siswa yang dipilih tidak ditemukan di database." },
        { status: 404 }
      );
    }

    const studentPrimaryIds = matchedStudents.map((s) => s.id);

    // Update students in PostgreSQL
    await prisma.student.updateMany({
      where: { id: { in: studentPrimaryIds } },
      data: {
        classId: foundClass.id,
        ...(foundClass.major ? { major: foundClass.major } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Berhasil memasukkan ${matchedStudents.length} siswa ke kelas ${foundClass.name}.`,
      count: matchedStudents.length,
      class: {
        id: foundClass.id,
        name: foundClass.name,
        level: foundClass.level,
        major: foundClass.major,
      },
    });
  } catch (error: any) {
    console.error("POST /api/classes/assign error:", error);
    return NextResponse.json(
      { error: "Gagal memproses penempatan siswa ke kelas: " + error.message },
      { status: 500 }
    );
  }
}
