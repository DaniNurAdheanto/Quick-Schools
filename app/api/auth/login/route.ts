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

    const cleanIdentifier = String(email).trim();
    const cleanEmail = cleanIdentifier.toLowerCase();

    // 1. Search user in PostgreSQL (by email, teacher NIP, or student NISN/NIS)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanEmail },
          { teacher: { nip: cleanIdentifier } },
          { student: { nisn: cleanIdentifier } },
          { student: { nis: cleanIdentifier } },
        ],
      },
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
        { error: "Akun tidak ditemukan. Periksa kembali email atau username Anda." },
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
    let isMatch = false;
    if (user.passwordHash) {
      isMatch = await bcrypt.compare(password, user.passwordHash);
    }

    // Universal testing fallback: If password entered is standard default "asdasdasd", accept and auto-sync
    if (!isMatch && password === "asdasdasd") {
      isMatch = true;
      try {
        const newHash = await bcrypt.hash("asdasdasd", 10);
        await prisma.user.update({
          where: { id: user.id },
          data: {
            passwordHash: newHash,
            status: user.status,
          },
        });
      } catch (syncErr) {
        console.warn("Auto-sync password warning:", syncErr);
      }
    }

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

    // 4. Generate JWT Session Token (Keep cookie payload lightweight < 1KB)
    const cookieAvatar = user.avatarUrl && !user.avatarUrl.startsWith("data:") && user.avatarUrl.length < 512
      ? user.avatarUrl
      : null;

    const sessionPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: normalizedRole,
      status: user.status === "AKTIF" ? "Aktif" : user.status === "BELUM_ONBOARDING" ? "Belum Onboarding" : "Nonaktif",
      onboardingCompleted: user.onboardingCompleted,
      phone: user.phone || "-",
      avatarUrl: cookieAvatar,
      studentId: user.student?.id || null,
      teacherId: user.teacher?.id || null,
      parentId: user.parent?.id || null,
      classId: user.student?.classId || null,
      className: user.student?.class?.name || null,
      nip: user.teacher?.nip || null,
      nisn: user.student?.nisn || null,
    };

    const token = await signSessionToken(sessionPayload);

    // 5. Response with HTTP-only cookie (full avatar in JSON body for client)
    const response = NextResponse.json({
      success: true,
      message: `Selamat datang kembali, ${user.name}!`,
      user: {
        ...sessionPayload,
        avatarUrl: user.avatarUrl || null,
      },
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
