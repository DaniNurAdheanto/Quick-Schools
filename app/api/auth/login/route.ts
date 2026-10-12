import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as bcrypt from "bcryptjs";
import { signSessionToken } from "@/lib/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/server-auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan kata sandi wajib diisi." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).toLowerCase().trim();

    // 1. Search user in PostgreSQL
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: {
        student: {
          include: {
            class: true,
          },
        },
        teacher: {
          include: {
            subjects: {
              include: {
                subject: true,
              },
            },
          },
        },
        parent: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Akun dengan email ini tidak ditemukan." },
        { status: 404 }
      );
    }

    if (user.status === "NONAKTIF") {
      return NextResponse.json(
        { error: "Akun Anda berstatus Nonaktif. Hubungi Administrator untuk mengaktifkan kembali." },
        { status: 403 }
      );
    }

    // 2. Check Password
    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "Akun ini belum memiliki kata sandi terdaftar." },
        { status: 401 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Kata sandi yang Anda masukkan salah." },
        { status: 401 }
      );
    }

    // 3. Normalize role string
    const roleMap: Record<string, string> = {
      SUPER_ADMIN: "super-admin",
      ADMIN: "admin",
      KEPALA_SEKOLAH: "kepala-sekolah",
      GURU: "guru",
      SISWA: "siswa",
      ORANG_TUA: "orang-tua",
    };
    const normalizedRole = roleMap[user.role] || user.role.toLowerCase().replace(/_/g, "-");

    // 4. Generate JWT Session Token
    const sessionPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: normalizedRole,
      status: user.status === "AKTIF" ? "Aktif" : user.status === "BELUM_ONBOARDING" ? "Belum Onboarding" : "Nonaktif",
      onboardingCompleted: user.onboardingCompleted,
      phone: user.phone || "-",
      avatarUrl: user.avatarUrl || null,
      studentId: user.student?.id || null,
      teacherId: user.teacher?.id || null,
      parentId: user.parent?.id || null,
      classId: user.student?.classId || null,
      className: user.student?.class?.name || null,
      nip: user.teacher?.nip || null,
      nisn: user.student?.nisn || null,
    };

    const token = await signSessionToken(sessionPayload);

    // 5. Response with HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      message: `Selamat datang kembali, ${user.name}!`,
      user: sessionPayload,
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err: any) {
    console.error("Login API error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server saat proses login." },
      { status: 500 }
    );
  }
}
