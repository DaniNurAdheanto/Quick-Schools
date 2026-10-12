import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UserRole, AccountStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";

// GET /api/parents - List all parents with their linked students
export async function GET() {
  try {
    const parents = await prisma.parent.findMany({
      orderBy: { fullName: "asc" },
      include: {
        user: true,
        students: {
          include: {
            student: {
              include: {
                class: true,
              },
            },
          },
        },
      },
    });

    const formatted = parents.map((p) => {
      const studentNames = p.students.map((ps) => ps.student.fullName);
      const studentIds = p.students.map((ps) => ps.student.id || ps.student.nisn);
      const firstChildClass = p.students[0]?.student.class?.name || null;

      return {
        id: p.id,
        _firestoreId: p.id,
        name: p.fullName,
        fullName: p.fullName,
        email: p.email || p.user?.email || "-",
        phone: p.phone || p.user?.phone || "-",
        address: p.address || "-",
        job: p.job || "-",
        income: p.income || "-",
        relationship: p.students[0]?.relationship || "Orang Tua",
        status: p.user ? (p.user.status === AccountStatus.AKTIF ? "Aktif" : "Nonaktif") : "Aktif",
        studentName: studentNames.join(", ") || "-",
        studentNames,
        studentIds,
        studentClass: firstChildClass,
        students: p.students.map((ps) => ({
          id: ps.student.id,
          nisn: ps.student.nisn,
          name: ps.student.fullName,
          className: ps.student.class?.name || "-",
          relationship: ps.relationship,
        })),
        userUid: p.userId,
        hasUserAccount: Boolean(p.userId),
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({ success: true, parents: formatted });
  } catch (error: any) {
    console.error("GET /api/parents error:", error);
    return NextResponse.json({ success: false, error: "Gagal memuat data orang tua: " + error.message }, { status: 500 });
  }
}

// POST /api/parents - Create new parent and optionally link students
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, fullName, email, phone, address, job, income, relationship = "Orang Tua", studentIds = [], password } = body;

    const parentName = String(fullName || name || "").trim();
    if (!parentName) {
      return NextResponse.json({ error: "Nama orang tua wajib diisi." }, { status: 400 });
    }

    let userId: string | null = null;
    const cleanEmail = email ? String(email).toLowerCase().trim() : null;

    if (cleanEmail && cleanEmail.includes("@")) {
      const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
      if (!existingUser) {
        const passwordHash = password ? await bcrypt.hash(password, 10) : await bcrypt.hash("asdasdasd", 10);
        const newUser = await prisma.user.create({
          data: {
            email: cleanEmail,
            name: parentName,
            role: UserRole.ORANG_TUA,
            status: AccountStatus.AKTIF,
            passwordHash,
            phone: phone || null,
          },
        });
        userId = newUser.id;
      } else {
        userId = existingUser.id;
      }
    }

    const newParent = await prisma.parent.create({
      data: {
        fullName: parentName,
        email: cleanEmail,
        phone: phone || null,
        address: address || null,
        job: job || null,
        income: income || null,
        userId,
      },
    });

    // Link students if specified
    if (Array.isArray(studentIds) && studentIds.length > 0) {
      for (const stId of studentIds) {
        const foundStudent = await prisma.student.findFirst({
          where: { OR: [{ id: stId }, { nisn: stId }] },
        });
        if (foundStudent) {
          try {
            await prisma.parentStudent.create({
              data: {
                parentId: newParent.id,
                studentId: foundStudent.id,
                relationship: relationship || "Orang Tua",
              },
            });
          } catch (e) {}
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Data orang tua ${parentName} berhasil disimpan.`,
      parent: newParent,
    });
  } catch (error: any) {
    console.error("POST /api/parents error:", error);
    return NextResponse.json({ error: "Gagal membuat data orang tua: " + error.message }, { status: 500 });
  }
}

// PUT /api/parents - Update parent
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, fullName, email, phone, address, job, income, relationship, studentIds } = body;

    if (!id) {
      return NextResponse.json({ error: "ID orang tua wajib disertakan." }, { status: 400 });
    }

    const parent = await prisma.parent.findUnique({ where: { id } });
    if (!parent) {
      return NextResponse.json({ error: "Data orang tua tidak ditemukan." }, { status: 404 });
    }

    const updatedName = String(fullName || name || parent.fullName).trim();

    const updated = await prisma.parent.update({
      where: { id },
      data: {
        fullName: updatedName,
        email: email ? String(email).toLowerCase().trim() : parent.email,
        phone: phone || parent.phone,
        address: address || parent.address,
        job: job || parent.job,
        income: income || parent.income,
      },
    });

    if (parent.userId) {
      await prisma.user.update({
        where: { id: parent.userId },
        data: {
          name: updatedName,
          ...(email ? { email: String(email).toLowerCase().trim() } : {}),
        },
      });
    }

    // Update students links if provided
    if (Array.isArray(studentIds)) {
      await prisma.parentStudent.deleteMany({ where: { parentId: parent.id } });
      for (const stId of studentIds) {
        const foundStudent = await prisma.student.findFirst({
          where: { OR: [{ id: stId }, { nisn: stId }] },
        });
        if (foundStudent) {
          try {
            await prisma.parentStudent.create({
              data: {
                parentId: parent.id,
                studentId: foundStudent.id,
                relationship: relationship || "Orang Tua",
              },
            });
          } catch (e) {}
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Data orang tua ${updated.fullName} berhasil diperbarui.`,
      parent: updated,
    });
  } catch (error: any) {
    console.error("PUT /api/parents error:", error);
    return NextResponse.json({ error: "Gagal memperbarui data orang tua: " + error.message }, { status: 500 });
  }
}

// DELETE /api/parents - Delete parent
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID orang tua wajib disertakan." }, { status: 400 });
    }

    const parent = await prisma.parent.findUnique({ where: { id } });
    if (!parent) {
      return NextResponse.json({ error: "Data orang tua tidak ditemukan." }, { status: 404 });
    }

    await prisma.parent.delete({ where: { id } });
    if (parent.userId) {
      try {
        await prisma.user.delete({ where: { id: parent.userId } });
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      message: `Data orang tua ${parent.fullName} berhasil dihapus dari database.`,
    });
  } catch (error: any) {
    console.error("DELETE /api/parents error:", error);
    return NextResponse.json({ error: "Gagal menghapus data orang tua: " + error.message }, { status: 500 });
  }
}
