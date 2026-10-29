import { NextResponse } from "next/server";
import { getCurrentUserFromDb } from "@/lib/server-auth";

export async function GET() {
  try {
    const user = await getCurrentUserFromDb();

    if (!user) {
      return NextResponse.json(
        { user: null, authenticated: false },
        { status: 200 }
      );
    }

    const roleMap: Record<string, string> = {
      SUPER_ADMIN: "super-admin",
      SAAS_ADMIN: "saas-admin",
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

    const sessionPayload = {
      id: user.id,
      uid: user.id,
      email: user.email,
      name: user.name,
      fullName: user.name,
      role: normalizedRole,
      rawRole: user.role,
      status: user.status === "AKTIF" ? "Aktif" : user.status === "BELUM_ONBOARDING" ? "Belum Onboarding" : "Nonaktif",
      onboardingCompleted: user.onboardingCompleted,
      phone: phone || "-",
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
      subject: user.teacher?.subjects?.map(s => s.subject.name).join(", ") || null,
      homeroomClass: user.teacher?.homeroomForClass?.[0]?.name || null,
      childName: user.parent?.students?.[0]?.student?.fullName || null,
      childClass: user.parent?.students?.[0]?.student?.class?.name || null,
      childNisn: user.parent?.students?.[0]?.student?.nisn || null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };

    return NextResponse.json({
      authenticated: true,
      user: sessionPayload,
    });
  } catch (err) {
    console.error("Auth Me API error:", err);
    return NextResponse.json(
      { user: null, authenticated: false },
      { status: 200 }
    );
  }
}
