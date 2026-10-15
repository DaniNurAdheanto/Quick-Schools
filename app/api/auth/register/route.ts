import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as bcrypt from "bcryptjs";
import { UserRole, AccountStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name, role, nip, nisn, className, phone, status } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Nama, email, dan kata sandi wajib diisi." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).toLowerCase().trim();

    // Check existing
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Akun dengan email ini sudah terdaftar." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Map role string to enum
    const roleMapping: Record<string, UserRole> = {
      "super-admin": UserRole.SUPER_ADMIN,
      "admin": UserRole.ADMIN,
      "kepala-sekolah": UserRole.KEPALA_SEKOLAH,
      "guru": UserRole.GURU,
      "teacher": UserRole.GURU,
      "siswa": UserRole.SISWA,
      "student": UserRole.SISWA,
      "orang-tua": UserRole.ORANG_TUA,
      "parent": UserRole.ORANG_TUA,
    };

    const targetRole = roleMapping[String(role).toLowerCase()] || UserRole.SISWA;
    const isStudent = targetRole === UserRole.SISWA;
    let targetStatus: AccountStatus;
    if (status === "Nonaktif" || status === "NONAKTIF") {
      targetStatus = AccountStatus.NONAKTIF;
    } else if (status === "Aktif" || status === "AKTIF") {
      targetStatus = AccountStatus.AKTIF;
    } else if (status === "Belum Onboarding" || status === "BELUM_ONBOARDING") {
      targetStatus = AccountStatus.BELUM_ONBOARDING;
    } else {
      // Siswa baru wajib onboarding terlebih dahulu, peran staff/admin langsung aktif
      targetStatus = isStudent ? AccountStatus.BELUM_ONBOARDING : AccountStatus.AKTIF;
    }

    // Create user in PostgreSQL
    const newUser = await prisma.user.create({
      data: {
        email: cleanEmail,
        passwordHash,
        name: name.trim(),
        role: targetRole,
        status: targetStatus,
        phone: phone || null,
        onboardingCompleted: targetStatus === AccountStatus.AKTIF,
      },
    });

    // Create companion profile if needed
    if (targetRole === UserRole.GURU && nip) {
      await prisma.teacher.create({
        data: {
          nip: String(nip).trim(),
          userId: newUser.id,
          fullName: name.trim(),
          phone: phone || null,
          status: "Aktif",
        },
      });
    } else if (targetRole === UserRole.SISWA && nisn) {
      // Find class by name or id if provided
      let targetClassId: string | null = null;
      if (className) {
        const foundClass = await prisma.class.findFirst({
          where: {
            OR: [
              { id: String(className).trim() },
              { name: String(className).trim() },
            ],
          },
        });
        if (foundClass) targetClassId = foundClass.id;
      }

      await prisma.student.create({
        data: {
          nisn: String(nisn).trim(),
          userId: newUser.id,
          fullName: name.trim(),
          phone: phone || null,
          status: "Aktif",
          classId: targetClassId,
        },
      });
    } else if (targetRole === UserRole.ORANG_TUA) {
      await prisma.parent.create({
        data: {
          userId: newUser.id,
          fullName: name.trim(),
          email: cleanEmail,
          phone: phone || null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Akun ${name} berhasil didaftarkan ke database PostgreSQL.`,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: targetRole,
      },
    });
  } catch (err: any) {
    console.error("Register API error:", err);
    return NextResponse.json(
      { error: "Gagal mendaftarkan akun baru ke database: " + err.message },
      { status: 500 }
    );
  }
}
