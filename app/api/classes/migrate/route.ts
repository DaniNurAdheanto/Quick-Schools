import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateClassId } from "@/lib/class-relations";

// GET /api/classes/migrate - Migrates existing classes to standard class-(tingkatan)-(jurusan)-(nomer) IDs
export async function GET() {
  try {
    const classes = await prisma.class.findMany({
      include: {
        students: true,
      },
    });

    const migrated: any[] = [];

    for (const c of classes) {
      const standardId = generateClassId(c.name, c.level, c.major);

      // If already matching the template, skip
      if (c.id === standardId) {
        continue;
      }

      // Check if standardId already exists in DB
      const existingNew = await prisma.class.findUnique({
        where: { id: standardId },
      });

      let finalClassId = standardId;

      if (!existingNew) {
        // Create new class with the standard template ID
        const created = await prisma.class.create({
          data: {
            id: standardId,
            name: c.name,
            level: c.level,
            major: c.major,
            homeroomTeacherId: c.homeroomTeacherId,
            academicYearId: c.academicYearId,
          },
        });
        finalClassId = created.id;
      }

      // Move relations to the new standard ID
      await prisma.student.updateMany({
        where: { classId: c.id },
        data: { classId: finalClassId },
      });

      await prisma.schedule.updateMany({
        where: { classId: c.id },
        data: { classId: finalClassId },
      });

      await prisma.attendance.updateMany({
        where: { classId: c.id },
        data: { classId: finalClassId },
      });

      await prisma.grade.updateMany({
        where: { classId: c.id },
        data: { classId: finalClassId },
      });

      // If old class ID is different from standardId, delete old record
      if (c.id !== finalClassId) {
        try {
          await prisma.class.delete({
            where: { id: c.id },
          });
        } catch (delErr) {
          console.warn(`Could not delete old class ${c.id}:`, delErr);
        }
      }

      migrated.push({
        name: c.name,
        oldId: c.id,
        newId: finalClassId,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Migrasi selesai. ${migrated.length} kelas telah diselaraskan ke format template class-(tingkatan)-(jurusan)-(nomer).`,
      migrated,
    });
  } catch (err: any) {
    console.error("GET /api/classes/migrate error:", err);
    return NextResponse.json(
      { error: "Gagal migrasi format ID kelas: " + err.message },
      { status: 500 }
    );
  }
}
