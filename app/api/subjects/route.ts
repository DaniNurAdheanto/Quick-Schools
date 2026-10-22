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

// Helper function to upsert a subject safely
async function upsertSubjectItem(item: any) {
  const { code, name, category, level, creditHours, teacherIds } = item;
  if (!code || !name) return null;

  const cleanCode = String(code).trim().toUpperCase();
  const cleanName = String(name).trim();

  // Find existing by code or name
  const existing = await prisma.subject.findFirst({
    where: {
      OR: [
        { code: cleanCode },
        { name: { equals: cleanName, mode: "insensitive" } },
      ],
    },
  });

  let subject;
  if (existing) {
    let finalCode = existing.code;
    if (existing.code !== cleanCode) {
      const conflict = await prisma.subject.findUnique({ where: { code: cleanCode } });
      if (!conflict) {
        finalCode = cleanCode;
      }
    }

    subject = await prisma.subject.update({
      where: { id: existing.id },
      data: {
        code: finalCode,
        name: cleanName,
        category: category ? String(category).trim() : existing.category,
        level: level ? String(level).trim() : existing.level,
        creditHours: creditHours !== undefined ? (Number(String(creditHours).replace(/\D/g, "")) || existing.creditHours) : existing.creditHours,
      },
    });
  } else {
    let finalCode = cleanCode;
    const conflict = await prisma.subject.findUnique({ where: { code: finalCode } });
    if (conflict) {
      finalCode = `${cleanCode}-${Date.now().toString().slice(-4)}`;
    }

    subject = await prisma.subject.create({
      data: {
        code: finalCode,
        name: cleanName,
        category: category ? String(category).trim() : "Wajib",
        level: level ? String(level).trim() : "SMA",
        creditHours: creditHours !== undefined ? (Number(String(creditHours).replace(/\D/g, "")) || 2) : 2,
      },
    });
  }

  // Link teachers if provided
  if (Array.isArray(teacherIds) && teacherIds.length > 0) {
    for (const tId of teacherIds) {
      const cleanTid = String(tId).trim();
      const teacher = await prisma.teacher.findFirst({
        where: { OR: [{ id: cleanTid }, { nip: cleanTid }] },
      });
      if (teacher) {
        try {
          await prisma.teacherSubject.upsert({
            where: {
              teacherId_subjectId: {
                teacherId: teacher.id,
                subjectId: subject.id,
              },
            },
            create: { teacherId: teacher.id, subjectId: subject.id },
            update: {},
          });
        } catch (e) {}
      }
    }
  }

  return subject;
}

// POST /api/subjects - Create new subject or batch create if array/subjects provided
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Check if batch creation
    const rawList = Array.isArray(body)
      ? body
      : Array.isArray(body?.subjects)
      ? body.subjects
      : null;

    if (rawList) {
      if (rawList.length === 0) {
        return NextResponse.json({ success: true, count: 0, subjects: [] });
      }

      const results = [];
      for (const item of rawList) {
        const res = await upsertSubjectItem(item);
        if (res) results.push(res);
      }

      return NextResponse.json({
        success: true,
        message: `${results.length} mata pelajaran berhasil disimpan ke database.`,
        count: results.length,
        subjects: results,
      });
    }

    // Single subject creation
    const { code, name } = body;
    if (!code || !name) {
      return NextResponse.json({ error: "Kode dan nama mata pelajaran wajib diisi." }, { status: 400 });
    }

    const subject = await upsertSubjectItem(body);

    return NextResponse.json({
      success: true,
      message: `Mata pelajaran ${subject?.name || name} berhasil disimpan.`,
      subject,
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
    const { id, code, name, category, level, creditHours, teacherIds } = body;

    if (!id && !code) {
      return NextResponse.json({ error: "ID atau kode mata pelajaran wajib disertakan." }, { status: 400 });
    }

    const cleanId = id ? String(id).trim() : "";
    const cleanCode = code ? String(code).trim().toUpperCase() : "";

    const existing = await prisma.subject.findFirst({
      where: {
        OR: [
          ...(cleanId ? [{ id: cleanId }] : []),
          ...(cleanCode ? [{ code: cleanCode }] : []),
        ],
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Mata pelajaran tidak ditemukan." }, { status: 404 });
    }

    const updated = await prisma.subject.update({
      where: { id: existing.id },
      data: {
        ...(cleanCode ? { code: cleanCode } : {}),
        ...(name ? { name: String(name).trim() } : {}),
        ...(category ? { category: String(category).trim() } : {}),
        ...(level ? { level: String(level).trim() } : {}),
        ...(creditHours !== undefined ? { creditHours: Number(creditHours) } : {}),
      },
    });

    // Update teacher assignments
    if (Array.isArray(teacherIds)) {
      await prisma.teacherSubject.deleteMany({ where: { subjectId: updated.id } });
      for (const tId of teacherIds) {
        const cleanTid = String(tId).trim();
        const teacher = await prisma.teacher.findFirst({
          where: { OR: [{ id: cleanTid }, { nip: cleanTid }] },
        });
        if (teacher) {
          try {
            await prisma.teacherSubject.create({
              data: { teacherId: teacher.id, subjectId: updated.id },
            });
          } catch (e) {}
        }
      }
    }

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

    const cleanId = String(id).trim();
    const existing = await prisma.subject.findFirst({
      where: {
        OR: [
          { id: cleanId },
          { code: cleanId.toUpperCase() },
        ],
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Mata pelajaran tidak ditemukan." }, { status: 404 });
    }

    // Clean relations
    await prisma.teacherSubject.deleteMany({ where: { subjectId: existing.id } });
    const deleted = await prisma.subject.delete({
      where: { id: existing.id },
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
