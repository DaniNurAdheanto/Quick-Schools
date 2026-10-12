import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UserRole, AccountStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";

// GET /api/teachers - List all teachers with subjects & homeroom class
export async function GET() {
  try {
    const teachers = await prisma.teacher.findMany({
      orderBy: { fullName: "asc" },
      include: {
        user: true,
        subjects: {
          include: {
            subject: true,
          },
        },
        homeroomForClass: true,
      },
    });

    const formatted = teachers.map((t) => ({
      id: t.nip,
      _firestoreId: t.id,
      uid: t.userId || t.id,
      nip: t.nip,
      name: t.fullName,
      fullName: t.fullName,
      email: t.user?.email || "-",
      phone: t.phone || t.user?.phone || "-",
      contact: t.phone || t.user?.phone || "-",
      gender: t.gender || "Laki-laki",
      address: t.address || "-",
      status: t.status || "Aktif",
      role: "guru",
      photoUrl: t.photoUrl || t.user?.avatarUrl || "",
      imageUrl: t.photoUrl || t.user?.avatarUrl || "",
      homeroomClass: t.homeroomForClass?.[0]?.name || "",
      subjectIds: t.subjects.map((s) => s.subject.id),
      subjects: t.subjects.map((s) => s.subject.name),
      subject: t.subjects.map((s) => s.subject.name).join(", ") || "Guru Pengajar",
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    return NextResponse.json({ success: true, teachers: formatted });
  } catch (err: any) {
    console.error("GET /api/teachers error:", err);
    return NextResponse.json({ error: "Gagal memuat daftar guru: " + err.message }, { status: 500 });
  }
}

// POST /api/teachers - Create new teacher
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nip, name, fullName, email, phone, contact, gender, address, subjectIds, homeroomClass, status } = body;

    const teacherName = String(fullName || name || "").trim();
    const teacherNip = String(nip || "").trim();

    if (!teacherName || !teacherNip) {
      return NextResponse.json({ error: "NIP dan Nama Lengkap guru wajib diisi." }, { status: 400 });
    }

    // Check NIP uniqueness
    const existing = await prisma.teacher.findUnique({
      where: { nip: teacherNip },
    });
    if (existing) {
      return NextResponse.json({ error: `Guru dengan NIP ${teacherNip} sudah terdaftar.` }, { status: 409 });
    }

    // Create user account if email provided
    let userId: string | null = null;
    if (email && String(email).includes("@")) {
      const cleanEmail = String(email).toLowerCase().trim();
      const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
      if (!existingUser) {
        const passwordHash = await bcrypt.hash("asdasdasd", 10);
        const newUser = await prisma.user.create({
          data: {
            email: cleanEmail,
            name: teacherName,
            role: UserRole.GURU,
            status: status === "Nonaktif" ? AccountStatus.NONAKTIF : AccountStatus.AKTIF,
            passwordHash,
            phone: phone || contact || null,
          },
        });
        userId = newUser.id;
      } else {
        userId = existingUser.id;
      }
    }

    const newTeacher = await prisma.teacher.create({
      data: {
        nip: teacherNip,
        fullName: teacherName,
        phone: phone || contact || null,
        gender: gender || "Laki-laki",
        address: address || null,
        status: status || "Aktif",
        userId,
      },
    });

    // Link subjects
    if (Array.isArray(subjectIds) && subjectIds.length > 0) {
      for (const sId of subjectIds) {
        try {
          await prisma.teacherSubject.create({
            data: { teacherId: newTeacher.id, subjectId: sId },
          });
        } catch (e) {}
      }
    }

    // Set homeroom class if requested
    if (homeroomClass) {
      await prisma.class.updateMany({
        where: { name: homeroomClass },
        data: { homeroomTeacherId: newTeacher.id },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Data guru ${teacherName} berhasil ditambahkan ke database.`,
      teacher: newTeacher,
    });
  } catch (err: any) {
    console.error("POST /api/teachers error:", err);
    return NextResponse.json({ error: "Gagal menambahkan guru: " + err.message }, { status: 500 });
  }
}

// PUT /api/teachers - Update teacher
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, _firestoreId, nip, fullName, name, email, phone, contact, gender, address, subjectIds, homeroomClass, status } = body;

    const teacherIdentifier = _firestoreId || id;
    if (!teacherIdentifier) {
      return NextResponse.json({ error: "ID atau NIP guru wajib disertakan." }, { status: 400 });
    }

    const teacher = await prisma.teacher.findFirst({
      where: {
        OR: [{ id: teacherIdentifier }, { nip: String(nip || teacherIdentifier).trim() }],
      },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Data guru tidak ditemukan." }, { status: 404 });
    }

    const updatedName = String(fullName || name || teacher.fullName).trim();

    const updated = await prisma.teacher.update({
      where: { id: teacher.id },
      data: {
        fullName: updatedName,
        ...(nip ? { nip: String(nip).trim() } : {}),
        phone: phone || contact || teacher.phone,
        gender: gender || teacher.gender,
        address: address || teacher.address,
        status: status || teacher.status,
      },
    });

    // Update user name & email if linked
    if (teacher.userId) {
      await prisma.user.update({
        where: { id: teacher.userId },
        data: {
          name: updatedName,
          ...(email && String(email).includes("@") ? { email: String(email).toLowerCase().trim() } : {}),
        },
      });
    }

    // Update subject mappings
    if (Array.isArray(subjectIds)) {
      await prisma.teacherSubject.deleteMany({ where: { teacherId: teacher.id } });
      for (const sId of subjectIds) {
        try {
          await prisma.teacherSubject.create({
            data: { teacherId: teacher.id, subjectId: sId },
          });
        } catch (e) {}
      }
    }

    // Update homeroom class
    if (homeroomClass !== undefined) {
      // Remove old homeroom assignments
      await prisma.class.updateMany({
        where: { homeroomTeacherId: teacher.id },
        data: { homeroomTeacherId: null },
      });
      if (homeroomClass) {
        await prisma.class.updateMany({
          where: { name: homeroomClass },
          data: { homeroomTeacherId: teacher.id },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Data guru ${updated.fullName} berhasil diperbarui.`,
      teacher: updated,
    });
  } catch (err: any) {
    console.error("PUT /api/teachers error:", err);
    return NextResponse.json({ error: "Gagal memperbarui guru: " + err.message }, { status: 500 });
  }
}

// DELETE /api/teachers - Delete teacher
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID atau NIP guru wajib disertakan." }, { status: 400 });
    }

    const teacher = await prisma.teacher.findFirst({
      where: { OR: [{ id }, { nip: id }] },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Data guru tidak ditemukan." }, { status: 404 });
    }

    // Delete teacher & associated user
    await prisma.teacher.delete({ where: { id: teacher.id } });
    if (teacher.userId) {
      try {
        await prisma.user.delete({ where: { id: teacher.userId } });
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      message: `Data guru ${teacher.fullName} berhasil dihapus dari database.`,
    });
  } catch (err: any) {
    console.error("DELETE /api/teachers error:", err);
    return NextResponse.json({ error: "Gagal menghapus data guru: " + err.message }, { status: 500 });
  }
}
