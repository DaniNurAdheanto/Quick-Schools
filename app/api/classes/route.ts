import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateClassId } from "@/lib/class-relations";

// Safe teacher ID resolver: matches ID, NIP, userId, or fullName
async function resolveTeacherId(teacherIdentifier?: string | null): Promise<string | null> {
  if (!teacherIdentifier) return null;
  const clean = String(teacherIdentifier).trim();
  if (!clean || clean === "-" || clean === "null" || clean === "undefined") return null;

  try {
    const teacher = await prisma.teacher.findFirst({
      where: {
        OR: [
          { id: clean },
          { nip: clean },
          { userId: clean },
          { fullName: { equals: clean, mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });
    return teacher ? teacher.id : null;
  } catch (err) {
    console.warn("Error resolving teacher ID:", err);
    return null;
  }
}

// GET /api/classes - List all classes with student count & homeroom teacher
export async function GET() {
  try {
    const classes = await prisma.class.findMany({
      orderBy: { name: "asc" },
      include: {
        homeroomTeacher: true,
        _count: {
          select: { students: true },
        },
      },
    });

    const formatted = classes.map((c) => ({
      id: c.id,
      _firestoreId: c.id,
      name: c.name,
      level: c.level,
      major: c.major || "MIPA",
      homeroomTeacherId: c.homeroomTeacherId,
      homeroom: c.homeroomTeacher?.fullName || null,
      studentsCount: c._count.students,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    return NextResponse.json({ success: true, classes: formatted });
  } catch (err: any) {
    console.error("GET /api/classes error:", err);
    return NextResponse.json({ error: "Gagal memuat daftar kelas: " + err.message }, { status: 500 });
  }
}

// POST /api/classes - Create new class or update if exists
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, level, major, homeroomTeacherId } = body;

    if (!name || !level) {
      return NextResponse.json({ error: "Nama kelas dan tingkatan wajib diisi." }, { status: 400 });
    }

    const cleanName = String(name).trim();
    const cleanLevel = String(level).trim();
    const cleanMajor = major ? String(major).trim() : null;

    // Generate standard ID: class-(tingkatan)-(jurusan)-(nomer)
    const classCustomId = (id && String(id).startsWith("class-"))
      ? String(id).trim().toLowerCase()
      : generateClassId(cleanName, cleanLevel, cleanMajor);

    // Safely resolve teacher to prevent foreign key errors
    const validTeacherId = await resolveTeacherId(homeroomTeacherId);

    // Check if class with same ID or same name already exists
    const existing = await prisma.class.findFirst({
      where: {
        OR: [
          { id: classCustomId },
          { name: { equals: cleanName, mode: "insensitive" } },
        ],
      },
      include: {
        homeroomTeacher: true,
        _count: { select: { students: true } },
      },
    });

    let targetClass;
    if (existing) {
      targetClass = await prisma.class.update({
        where: { id: existing.id },
        data: {
          name: cleanName,
          level: cleanLevel,
          major: cleanMajor,
          ...(validTeacherId !== undefined ? { homeroomTeacherId: validTeacherId } : {}),
        },
        include: {
          homeroomTeacher: true,
          _count: { select: { students: true } },
        },
      });
    } else {
      targetClass = await prisma.class.create({
        data: {
          id: classCustomId,
          name: cleanName,
          level: cleanLevel,
          major: cleanMajor,
          homeroomTeacherId: validTeacherId,
        },
        include: {
          homeroomTeacher: true,
          _count: { select: { students: true } },
        },
      });
    }

    const formatted = {
      id: targetClass.id,
      _firestoreId: targetClass.id,
      name: targetClass.name,
      level: targetClass.level,
      major: targetClass.major || "MIPA",
      homeroomTeacherId: targetClass.homeroomTeacherId,
      homeroom: targetClass.homeroomTeacher?.fullName || null,
      studentsCount: targetClass._count.students,
      createdAt: targetClass.createdAt.toISOString(),
      updatedAt: targetClass.updatedAt.toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: `Kelas ${targetClass.name} berhasil disimpan di database.`,
      class: formatted,
    });
  } catch (err: any) {
    console.error("POST /api/classes error:", err);
    return NextResponse.json({ error: "Gagal membuat kelas: " + err.message }, { status: 500 });
  }
}

// PUT /api/classes - Update class
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, level, major, homeroomTeacherId } = body;

    if (!id && !name) {
      return NextResponse.json({ error: "ID atau nama kelas wajib disertakan." }, { status: 400 });
    }

    const cleanId = id ? String(id).trim() : "";
    const cleanName = name ? String(name).trim() : "";

    const existing = await prisma.class.findFirst({
      where: {
        OR: [
          ...(cleanId ? [{ id: cleanId }] : []),
          ...(cleanName ? [{ name: { equals: cleanName, mode: "insensitive" as const } }] : []),
        ],
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Kelas tidak ditemukan." }, { status: 404 });
    }

    // Safely resolve teacher if homeroomTeacherId was provided
    let validTeacherId: string | null | undefined = undefined;
    if (homeroomTeacherId !== undefined) {
      validTeacherId = await resolveTeacherId(homeroomTeacherId);
    }

    const updated = await prisma.class.update({
      where: { id: existing.id },
      data: {
        ...(cleanName ? { name: cleanName } : {}),
        ...(level ? { level: String(level).trim() } : {}),
        ...(major !== undefined ? { major: major ? String(major).trim() : null } : {}),
        ...(validTeacherId !== undefined ? { homeroomTeacherId: validTeacherId } : {}),
      },
      include: {
        homeroomTeacher: true,
        _count: { select: { students: true } },
      },
    });

    const formatted = {
      id: updated.id,
      _firestoreId: updated.id,
      name: updated.name,
      level: updated.level,
      major: updated.major || "MIPA",
      homeroomTeacherId: updated.homeroomTeacherId,
      homeroom: updated.homeroomTeacher?.fullName || null,
      studentsCount: updated._count.students,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: `Kelas ${updated.name} berhasil diperbarui.`,
      class: formatted,
    });
  } catch (err: any) {
    console.error("PUT /api/classes error:", err);
    return NextResponse.json({ error: "Gagal memperbarui kelas: " + err.message }, { status: 500 });
  }
}

// DELETE /api/classes - Delete class
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID kelas wajib disertakan." }, { status: 400 });
    }

    const cleanId = String(id).trim();
    const existing = await prisma.class.findFirst({
      where: {
        OR: [
          { id: cleanId },
          { name: { equals: cleanId, mode: "insensitive" } },
        ],
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Kelas tidak ditemukan." }, { status: 404 });
    }

    // Unassign students from this class first to prevent orphan foreign key issues
    await prisma.student.updateMany({
      where: { classId: existing.id },
      data: { classId: null },
    });

    const deleted = await prisma.class.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({
      success: true,
      message: `Kelas ${deleted.name} berhasil dihapus dari database.`,
    });
  } catch (err: any) {
    console.error("DELETE /api/classes error:", err);
    return NextResponse.json({ error: "Gagal menghapus kelas: " + err.message }, { status: 500 });
  }
}

