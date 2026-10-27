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

const DEFAULT_CLASS_PRESETS = [
  { id: "class-10-mipa-1", name: "10 MIPA 1", level: "Kelas 10", major: "IPA" },
  { id: "class-10-mipa-2", name: "10 MIPA 2", level: "Kelas 10", major: "IPA" },
  { id: "class-10-ips-1", name: "10 IPS 1", level: "Kelas 10", major: "IPS" },
  { id: "class-10-ips-2", name: "10 IPS 2", level: "Kelas 10", major: "IPS" },
  { id: "class-11-mipa-1", name: "11 MIPA 1", level: "Kelas 11", major: "IPA" },
  { id: "class-11-mipa-2", name: "11 MIPA 2", level: "Kelas 11", major: "IPA" },
  { id: "class-11-ips-1", name: "11 IPS 1", level: "Kelas 11", major: "IPS" },
  { id: "class-11-ips-2", name: "11 IPS 2", level: "Kelas 11", major: "IPS" },
  { id: "class-12-mipa-1", name: "12 MIPA 1", level: "Kelas 12", major: "IPA" },
  { id: "class-12-mipa-2", name: "12 MIPA 2", level: "Kelas 12", major: "IPA" },
  { id: "class-12-ips-1", name: "12 IPS 1", level: "Kelas 12", major: "IPS" },
  { id: "class-12-ips-2", name: "12 IPS 2", level: "Kelas 12", major: "IPS" },
];

// Helper to sort classes naturally: Tingkat (10->11->12), Jurusan (MIPA->IPS), No (1->2)
function sortClassesNaturally(list: any[]) {
  return [...list].sort((a, b) => {
    const aName = a.name || a;
    const bName = b.name || b;
    const aGrade = parseInt(String(aName).match(/\d+/)?.[0] || "0", 10);
    const bGrade = parseInt(String(bName).match(/\d+/)?.[0] || "0", 10);
    if (aGrade !== bGrade) return aGrade - bGrade;

    const getMajorScore = (str: string) => {
      const l = String(str).toLowerCase();
      if (l.includes("mipa") || l.includes("ipa")) return 1;
      if (l.includes("ips")) return 2;
      return 3;
    };
    const aMaj = getMajorScore(aName);
    const bMaj = getMajorScore(bName);
    if (aMaj !== bMaj) return aMaj - bMaj;

    return String(aName).localeCompare(String(bName), undefined, { numeric: true });
  });
}

// GET /api/classes - List all classes with student count & homeroom teacher
export async function GET() {
  try {
    // 0. Clean up rogue unregistered classes and ensure standard classes exist
    try {
      const rogueClasses = await prisma.class.findMany({
        where: {
          OR: [
            { name: { contains: "Bahasa", mode: "insensitive" } },
            { name: { contains: "undefined", mode: "insensitive" } },
          ],
        },
      });

      for (const rc of rogueClasses) {
        await prisma.student.updateMany({
          where: { classId: rc.id },
          data: { classId: "class-10-mipa-1" },
        });
        await prisma.class.delete({
          where: { id: rc.id },
        });
      }

      const count = await prisma.class.count();
      if (count < 12) {
        for (const p of DEFAULT_CLASS_PRESETS) {
          await prisma.class.upsert({
            where: { id: p.id },
            update: {
              name: p.name,
              level: p.level,
              major: p.major,
            },
            create: {
              id: p.id,
              name: p.name,
              level: p.level,
              major: p.major,
            },
          });
        }
      }
    } catch (seedErr) {
      console.warn("Class auto-seed warning:", seedErr);
    }

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

    return NextResponse.json({ success: true, classes: sortClassesNaturally(formatted) });
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

