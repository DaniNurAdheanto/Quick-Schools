import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UserRole, AccountStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";

// GET /api/students - List all students with class & parents
export async function GET() {
  try {
    const students = await prisma.student.findMany({
      orderBy: { fullName: "asc" },
      include: {
        user: true,
        class: true,
        parents: {
          include: {
            parent: true,
          },
        },
      },
    });

    const formatted = students.map((s) => ({
      id: s.nisn,
      _firestoreId: s.id,
      uid: s.userId || s.id,
      nisn: s.nisn,
      nis: s.nis || s.nisn,
      name: s.fullName,
      fullName: s.fullName,
      nickname: s.nickname || "",
      email: s.user?.email || "-",
      gender: s.gender || "Laki-laki",
      birthPlace: s.birthPlace || "",
      birthDate: s.birthDate ? s.birthDate.toISOString() : "",
      religion: s.religion || "Islam",
      nik: s.nik || "",
      address: s.address || "",
      classId: s.class?.id || s.classId || "",
      className: s.class?.name || s.classId || "",
      class: s.class?.name || s.classId || "",
      kelas: s.class?.name || s.classId || "",
      classDocId: s.class?.id || s.classId || "",
      major: s.major || s.class?.major || "MIPA",
      entryYear: s.entryYear || "2025/2026",
      level: s.level || "SMA",
      studentStatus: "Siswa Aktif",
      status: s.status || "Aktif",
      onboardingCompleted: s.user?.onboardingCompleted ?? true,
      imageUrl: s.photoUrl || s.user?.avatarUrl || "",
      photoUrl: s.photoUrl || s.user?.avatarUrl || "",
      fatherName: s.fatherName || "",
      motherName: s.motherName || "",
      guardianName: s.guardianName || "",
      parentPhone: s.parentPhone || "",
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    return NextResponse.json({ success: true, students: formatted });
  } catch (err: any) {
    console.error("GET /api/students error:", err);
    return NextResponse.json({ error: "Gagal memuat data siswa: " + err.message }, { status: 500 });
  }
}

// POST /api/students - Create new student
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      nisn,
      nis,
      fullName,
      name,
      email,
      gender,
      birthPlace,
      birthDate,
      religion,
      nik,
      address,
      phone,
      classId,
      className,
      major,
      entryYear,
      status,
      fatherName,
      motherName,
      guardianName,
      parentPhone,
    } = body;

    const studentName = String(fullName || name || "").trim();
    const studentNisn = String(nisn || nis || "").trim();

    if (!studentName || !studentNisn) {
      return NextResponse.json({ error: "NISN dan Nama Lengkap siswa wajib diisi." }, { status: 400 });
    }

    // Check NISN uniqueness
    const existing = await prisma.student.findUnique({
      where: { nisn: studentNisn },
    });
    if (existing) {
      return NextResponse.json({ error: `Siswa dengan NISN ${studentNisn} sudah terdaftar.` }, { status: 409 });
    }

    // Resolve class
    let targetClassId: string | null = null;
    const targetClassQuery = classId || className;
    if (targetClassQuery) {
      const qStr = String(targetClassQuery).trim();
      if (qStr && qStr !== "-" && qStr !== "null" && qStr.toLowerCase() !== "tanpa kelas") {
        const foundClass = await prisma.class.findFirst({
          where: {
            OR: [
              { id: qStr },
              { name: { equals: qStr, mode: "insensitive" } },
            ],
          },
        });
        if (foundClass) targetClassId = foundClass.id;
      }
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
            name: studentName,
            role: UserRole.SISWA,
            status: status === "Nonaktif" ? AccountStatus.NONAKTIF : AccountStatus.AKTIF,
            passwordHash,
            phone: phone || null,
          },
        });
        userId = newUser.id;
      } else {
        userId = existingUser.id;
      }
    }

    const newStudent = await prisma.student.create({
      data: {
        nisn: studentNisn,
        nis: nis ? String(nis).trim() : studentNisn,
        fullName: studentName,
        gender: gender || "Laki-laki",
        birthPlace: birthPlace || null,
        birthDate: birthDate ? new Date(birthDate) : null,
        religion: religion || "Islam",
        nik: nik ? String(nik).trim() : null,
        address: address || null,
        phone: phone || null,
        classId: targetClassId,
        major: major || "MIPA",
        entryYear: entryYear || "2025/2026",
        status: status || "Aktif",
        fatherName: fatherName || null,
        motherName: motherName || null,
        guardianName: guardianName || null,
        parentPhone: parentPhone || null,
        userId,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Data siswa ${studentName} berhasil ditambahkan ke database.`,
      student: newStudent,
    });
  } catch (err: any) {
    console.error("POST /api/students error:", err);
    return NextResponse.json({ error: "Gagal menambahkan siswa: " + err.message }, { status: 500 });
  }
}

// PUT /api/students - Update student
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      _firestoreId,
      nisn,
      nis,
      fullName,
      name,
      email,
      gender,
      birthPlace,
      birthDate,
      religion,
      nik,
      address,
      phone,
      classId,
      className,
      major,
      entryYear,
      status,
      fatherName,
      motherName,
      guardianName,
      parentPhone,
    } = body;

    const studentIdentifier = _firestoreId || id;
    if (!studentIdentifier) {
      return NextResponse.json({ error: "ID atau NISN siswa wajib disertakan." }, { status: 400 });
    }

    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { id: studentIdentifier },
          { nisn: String(nisn || studentIdentifier).trim() },
          { userId: studentIdentifier },
        ],
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Data siswa tidak ditemukan." }, { status: 404 });
    }

    const updatedName = String(fullName || name || student.fullName).trim();

    // Resolve class if updated
    let targetClassId = student.classId;
    const targetClassQuery = classId !== undefined ? classId : className;
    if (targetClassQuery !== undefined) {
      const qStr = String(targetClassQuery || "").trim();
      if (!qStr || qStr === "-" || qStr === "null" || qStr.toLowerCase() === "tanpa kelas") {
        targetClassId = null;
      } else {
        const foundClass = await prisma.class.findFirst({
          where: {
            OR: [
              { id: qStr },
              { name: { equals: qStr, mode: "insensitive" } },
            ],
          },
        });
        if (foundClass) targetClassId = foundClass.id;
      }
    }

    const updated = await prisma.student.update({
      where: { id: student.id },
      data: {
        fullName: updatedName,
        ...(nisn ? { nisn: String(nisn).trim() } : {}),
        ...(nis ? { nis: String(nis).trim() } : {}),
        gender: gender || student.gender,
        birthPlace: birthPlace !== undefined ? birthPlace : student.birthPlace,
        birthDate: birthDate ? new Date(birthDate) : student.birthDate,
        religion: religion || student.religion,
        nik: nik !== undefined ? nik : student.nik,
        address: address !== undefined ? address : student.address,
        phone: phone !== undefined ? phone : student.phone,
        classId: targetClassId,
        major: major || student.major,
        entryYear: entryYear || student.entryYear,
        status: status || student.status,
        fatherName: fatherName !== undefined ? fatherName : student.fatherName,
        motherName: motherName !== undefined ? motherName : student.motherName,
        guardianName: guardianName !== undefined ? guardianName : student.guardianName,
        parentPhone: parentPhone !== undefined ? parentPhone : student.parentPhone,
      },
    });

    // Update user if linked
    if (student.userId) {
      await prisma.user.update({
        where: { id: student.userId },
        data: {
          name: updatedName,
          ...(email && String(email).includes("@") ? { email: String(email).toLowerCase().trim() } : {}),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Data siswa ${updated.fullName} berhasil diperbarui.`,
      student: updated,
    });
  } catch (err: any) {
    console.error("PUT /api/students error:", err);
    return NextResponse.json({ error: "Gagal memperbarui siswa: " + err.message }, { status: 500 });
  }
}

// DELETE /api/students - Delete student
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID atau NISN siswa wajib disertakan." }, { status: 400 });
    }

    const student = await prisma.student.findFirst({
      where: { OR: [{ id }, { nisn: id }] },
    });

    if (!student) {
      return NextResponse.json({ error: "Data siswa tidak ditemukan." }, { status: 404 });
    }

    // Delete student & linked user
    await prisma.student.delete({ where: { id: student.id } });
    if (student.userId) {
      try {
        await prisma.user.delete({ where: { id: student.userId } });
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      message: `Data siswa ${student.fullName} berhasil dihapus dari database.`,
    });
  } catch (err: any) {
    console.error("DELETE /api/students error:", err);
    return NextResponse.json({ error: "Gagal menghapus data siswa: " + err.message }, { status: 500 });
  }
}
