import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signSessionToken } from "@/lib/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/server-auth";
import { UserRole, AccountStatus } from "@prisma/client";

// GET /api/auth/google?email=... - Check if an email exists in PostgreSQL User table
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email wajib disertakan." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: cleanEmail,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          exists: false,
          error: "Akun ini belum terdaftar di tabel akun database sekolah.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      exists: true,
      status: user.status,
      role: user.role,
    });
  } catch (err: any) {
    console.error("GET /api/auth/google error:", err);
    return NextResponse.json(
      { error: "Gagal memeriksa akun di database: " + err.message },
      { status: 500 }
    );
  }
}

// POST /api/auth/google - Authenticate or register Google account in PostgreSQL User table
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, photoUrl, isRegister, displayName, name } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email akun Google wajib disertakan." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).toLowerCase().trim();

    // 1. Look up account in PostgreSQL User table
    let user = await prisma.user.findFirst({
      where: {
        email: {
          equals: cleanEmail,
          mode: "insensitive",
        },
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

    // 2. If account does NOT exist in the database table
    if (!user) {
      if (isRegister) {
        // Automatically register new student user in PostgreSQL
        const finalName = (name || displayName || cleanEmail.split("@")[0]).trim();
        const avatar =
          photoUrl && !photoUrl.startsWith("data:") && photoUrl.length < 512
            ? photoUrl
            : null;

        user = await prisma.user.create({
          data: {
            email: cleanEmail,
            name: finalName,
            role: UserRole.SISWA,
            status: AccountStatus.BELUM_ONBOARDING,
            onboardingCompleted: false,
            avatarUrl: avatar,
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
      } else {
        return NextResponse.json(
          {
            success: false,
            error:
              "Akun Google ini belum terdaftar di tabel akun database sekolah. Silakan daftar terlebih dahulu melalui halaman Registrasi atau hubungi Administrator.",
            registeredInDatabase: false,
          },
          { status: 404 }
        );
      }
    }

    // 3. Reject if account is deactivated in database
    if (user.status === AccountStatus.NONAKTIF) {
      return NextResponse.json(
        {
          success: false,
          error: "Akun Anda berstatus Nonaktif di database sekolah. Hubungi Administrator untuk mengaktifkan kembali akun Anda.",
          registeredInDatabase: true,
          status: "NONAKTIF",
        },
        { status: 403 }
      );
    }

    // 4. Update avatar in database if user has none yet
    if (photoUrl && !user.avatarUrl && !photoUrl.startsWith("data:") && photoUrl.length < 512) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { avatarUrl: photoUrl },
        });
      } catch (e) {}
    }

    // 5. Normalize role string
    const roleMap: Record<string, string> = {
      SUPER_ADMIN: "super-admin",
      ADMIN: "admin",
      KEPALA_SEKOLAH: "kepala-sekolah",
      GURU: "guru",
      SISWA: "siswa",
      ORANG_TUA: "orang-tua",
    };
    const normalizedRole = roleMap[user.role] || user.role.toLowerCase().replace(/_/g, "-");

    // 6. Generate lightweight JWT Session Token
    const cookieAvatar = (user.avatarUrl || photoUrl) && !(user.avatarUrl || photoUrl)?.startsWith("data:") && (user.avatarUrl || photoUrl)!.length < 512
      ? (user.avatarUrl || photoUrl)
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

    // 7. Response with HTTP-only session cookie
    const response = NextResponse.json({
      success: true,
      message: `Selamat datang kembali, ${user.name}!`,
      user: {
        ...sessionPayload,
        avatarUrl: user.avatarUrl || photoUrl || null,
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
    console.error("POST /api/auth/google error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server saat verifikasi akun Google." },
      { status: 500 }
    );
  }
}
