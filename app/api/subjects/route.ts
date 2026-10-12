import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/subjects - List all subjects
export async function GET() {
  try {
    const subjects = await prisma.subject.findMany({
      orderBy: { name: "asc" },
      include: {
        teachers: {
          include: {
            teacher: true,
          },
        },
      },
    });

    const formatted = subjects.map((s) => ({
      id: s.id,
      _firestoreId: s.id,
      code: s.code,
      name: s.name,
      category: s.category || "Wajib",
      level: s.level || "SMA",
      creditHours: s.creditHours,
      teachers: s.teachers.map((t) => t.teacher.fullName),
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    return NextResponse.json({ success: true, subjects: formatted });
  } catch (err: any) {
    console.error("GET /api/subjects error:", err);
    return NextResponse.json({ error: "Gagal memuat mata pelajaran: " + err.message }, { status: 500 });
  }
}

// POST /api/subjects - Create new subject
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, name, category, level, creditHours } = body;

    if (!code || !name) {
      return NextResponse.json({ error: "Kode dan nama mata pelajaran wajib diisi." }, { status: 400 });
    }

    const cleanCode = String(code).trim().toUpperCase();

    const existing = await prisma.subject.findUnique({
      where: { code: cleanCode },
    });
    if (existing) {
      return NextResponse.json({ error: "Mata pelajaran dengan kode ini sudah ada." }, { status: 409 });
    }

    const newSubject = await prisma.subject.create({
      data: {
        code: cleanCode,
        name: String(name).trim(),
        category: category ? String(category).trim() : "Wajib",
        level: level ? String(level).trim() : "SMA",
        creditHours: creditHours ? Number(creditHours) : 2,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Mata pelajaran ${newSubject.name} berhasil ditambahkan.`,
      subject: newSubject,
    });
  } catch (err: any) {
    console.error("POST /api/subjects error:", err);
    return NextResponse.json({ error: "Gagal membuat mata pelajaran: " + err.message }, { status: 500 });
  }
}

// PUT /api/subjects - Update subject
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, code, name, category, level, creditHours } = body;

    if (!id) {
      return NextResponse.json({ error: "ID mata pelajaran wajib disertakan." }, { status: 400 });
    }

    const updated = await prisma.subject.update({
      where: { id },
      data: {
        ...(code ? { code: String(code).trim().toUpperCase() } : {}),
        ...(name ? { name: String(name).trim() } : {}),
        ...(category ? { category: String(category).trim() } : {}),
        ...(level ? { level: String(level).trim() } : {}),
        ...(creditHours !== undefined ? { creditHours: Number(creditHours) } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Mata pelajaran ${updated.name} berhasil diperbarui.`,
      subject: updated,
    });
  } catch (err: any) {
    console.error("PUT /api/subjects error:", err);
    return NextResponse.json({ error: "Gagal memperbarui mata pelajaran: " + err.message }, { status: 500 });
  }
}

// DELETE /api/subjects - Delete subject
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID mata pelajaran wajib disertakan." }, { status: 400 });
    }

    const deleted = await prisma.subject.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Mata pelajaran ${deleted.name} berhasil dihapus.`,
    });
  } catch (err: any) {
    console.error("DELETE /api/subjects error:", err);
    return NextResponse.json({ error: "Gagal menghapus mata pelajaran: " + err.message }, { status: 500 });
  }
}
