import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromDb } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import * as bcrypt from "bcryptjs";

// GET /api/auth/profile - Fetch full current user profile
export async function GET() {
  try {
    const user = await getCurrentUserFromDb();
    if (!user) {
      return NextResponse.json({ error: "Sesi tidak ditemukan atau telah berakhir" }, { status: 401 });
    }

    const roleMap: Record<string, string> = {
      SUPER_ADMIN: "super-admin",
      ADMIN: "admin",
      KEPALA_SEKOLAH: "kepala-sekolah",
      GURU: "guru",
      SISWA: "siswa",
      ORANG_TUA: "orang-tua",
    };
    const normalizedRole = roleMap[user.role] || user.role.toLowerCase().replace(/_/g, "-");

    const phone = user.phone || user.student?.phone || user.teacher?.phone || user.parent?.phone || "";
    const address = user.student?.address || user.teacher?.address || user.parent?.address || "";
    const gender = user.student?.gender || user.teacher?.gender || "Laki-laki";
    const avatar = user.avatarUrl || user.student?.photoUrl || user.teacher?.photoUrl || "";

    const payload = {
      id: user.id,
      uid: user.id,
      email: user.email,
      name: user.name,
      fullName: user.name,
      role: normalizedRole,
      rawRole: user.role,
      status: user.status === "AKTIF" ? "Aktif" : user.status === "BELUM_ONBOARDING" ? "Belum Onboarding" : "Nonaktif",
      onboardingCompleted: user.onboardingCompleted,
      phone: phone || "",
      address: address || "",
      gender: gender,
      avatarUrl: avatar || null,
      imageUrl: avatar || "",
      photoUrl: avatar || "",
      studentId: user.student?.id || null,
      teacherId: user.teacher?.id || null,
      parentId: user.parent?.id || null,
      classId: user.student?.classId || null,
      className: user.student?.class?.name || null,
      major: user.student?.major || null,
      level: user.student?.level || null,
      nip: user.teacher?.nip || null,
      nisn: user.student?.nisn || null,
      nis: user.student?.nis || null,
      subject: user.teacher?.subjects?.map((s) => s.subject.name).join(", ") || null,
      homeroomClass: user.teacher?.homeroomForClass?.[0]?.name || null,
      childName: user.parent?.students?.[0]?.student?.fullName || null,
      childClass: user.parent?.students?.[0]?.student?.class?.name || null,
      childNisn: user.parent?.students?.[0]?.student?.nisn || null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };

    return NextResponse.json({ success: true, user: payload });
  } catch (err: any) {
    console.error("GET /api/auth/profile error:", err);
    return NextResponse.json({ error: "Gagal memuat data profil: " + err.message }, { status: 500 });
  }
}

// PUT /api/auth/profile - Update current user profile or password
export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUserFromDb();
    if (!user) {
      return NextResponse.json({ error: "Sesi tidak ditemukan atau telah berakhir" }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, address, gender, avatarUrl, password, nip } = body;

    const userUpdateData: any = {};
    if (name) userUpdateData.name = String(name).trim();
    if (phone !== undefined) userUpdateData.phone = String(phone).trim() || null;
    if (avatarUrl !== undefined) userUpdateData.avatarUrl = avatarUrl;
    if (password) {
      if (password.length < 6) {
        return NextResponse.json({ error: "Kata sandi minimal 6 karakter" }, { status: 400 });
      }
      userUpdateData.passwordHash = await bcrypt.hash(password, 10);
    }

    // 1. Update User table
    if (Object.keys(userUpdateData).length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: userUpdateData,
      });
    }

    // 2. Synchronize related profile if applicable
    if (user.student) {
      const studentUpdate: any = {};
      if (name) studentUpdate.fullName = String(name).trim();
      if (phone !== undefined) studentUpdate.phone = String(phone).trim() || null;
      if (address !== undefined) studentUpdate.address = String(address).trim() || null;
      if (gender) studentUpdate.gender = gender;
      if (avatarUrl !== undefined) studentUpdate.photoUrl = avatarUrl;

      if (Object.keys(studentUpdate).length > 0) {
        await prisma.student.update({
          where: { id: user.student.id },
          data: studentUpdate,
        });
      }
    } else if (user.teacher) {
      const teacherUpdate: any = {};
      if (name) teacherUpdate.fullName = String(name).trim();
      if (phone !== undefined) teacherUpdate.phone = String(phone).trim() || null;
      if (address !== undefined) teacherUpdate.address = String(address).trim() || null;
      if (gender) teacherUpdate.gender = gender;
      if (nip !== undefined) teacherUpdate.nip = String(nip).trim() || null;
      if (avatarUrl !== undefined) teacherUpdate.photoUrl = avatarUrl;

      if (Object.keys(teacherUpdate).length > 0) {
        await prisma.teacher.update({
          where: { id: user.teacher.id },
          data: teacherUpdate,
        });
      }
    } else if (user.parent) {
      const parentUpdate: any = {};
      if (name) parentUpdate.fullName = String(name).trim();
      if (phone !== undefined) parentUpdate.phone = String(phone).trim() || null;
      if (address !== undefined) parentUpdate.address = String(address).trim() || null;

      if (Object.keys(parentUpdate).length > 0) {
        await prisma.parent.update({
          where: { id: user.parent.id },
          data: parentUpdate,
        });
      }
    }

    // Fetch refreshed user
    const updatedUser = await getCurrentUserFromDb();

    return NextResponse.json({
      success: true,
      message: password ? "Kata sandi dan profil berhasil diperbarui" : "Informasi profil berhasil diperbarui",
      user: updatedUser,
    });
  } catch (err: any) {
    console.error("PUT /api/auth/profile error:", err);
    return NextResponse.json({ error: "Gagal memperbarui profil: " + err.message }, { status: 500 });
  }
}
