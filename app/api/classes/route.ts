import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

// POST /api/classes - Create new class
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, level, major, homeroomTeacherId } = body;

    if (!name || !level) {
      return NextResponse.json({ error: "Nama kelas dan tingkatan wajib diisi." }, { status: 400 });
    }

    const newClass = await prisma.class.create({
      data: {
        name: String(name).trim(),
        level: String(level).trim(),
        major: major ? String(major).trim() : null,
        homeroomTeacherId: homeroomTeacherId || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Kelas ${newClass.name} berhasil dibuat di database.`,
      class: newClass,
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

    if (!id) {
      return NextResponse.json({ error: "ID kelas wajib disertakan." }, { status: 400 });
    }

    const updated = await prisma.class.update({
      where: { id },
      data: {
        ...(name ? { name: String(name).trim() } : {}),
        ...(level ? { level: String(level).trim() } : {}),
        ...(major !== undefined ? { major: major ? String(major).trim() : null } : {}),
        ...(homeroomTeacherId !== undefined ? { homeroomTeacherId: homeroomTeacherId || null } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Kelas ${updated.name} berhasil diperbarui.`,
      class: updated,
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

    const deleted = await prisma.class.delete({
      where: { id },
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
