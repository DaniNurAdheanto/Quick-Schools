import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as bcrypt from "bcryptjs";
import { UserRole, AccountStatus } from "@prisma/client";

const roleMappingToEnum: Record<string, UserRole> = {
  "super-admin": UserRole.SUPER_ADMIN,
  "saas-admin": UserRole.SAAS_ADMIN,
  "admin": UserRole.ADMIN,
  "kepala-sekolah": UserRole.KEPALA_SEKOLAH,
  "guru": UserRole.GURU,
  "teacher": UserRole.GURU,
  "siswa": UserRole.SISWA,
  "student": UserRole.SISWA,
  "orang-tua": UserRole.ORANG_TUA,
  "parent": UserRole.ORANG_TUA,
};

const roleEnumToString: Record<UserRole, string> = {
  SUPER_ADMIN: "super-admin",
  SAAS_ADMIN: "saas-admin",
  ADMIN: "admin",
  KEPALA_SEKOLAH: "kepala-sekolah",
  GURU: "guru",
  SISWA: "siswa",
  ORANG_TUA: "orang-tua",
};

// GET /api/accounts - List all accounts from PostgreSQL
export async function GET() {
  try {
    // 0. Self-healing reconciliation: Reconcile unlinked parents and ensure all parent default passwords are 'asdasdasd'
    try {
      const defaultParentPassword = "asdasdasd";
      const defaultHash = await bcrypt.hash(defaultParentPassword, 10);

      const unlinkedParents = await prisma.parent.findMany({
        where: {
          userId: null,
          email: { not: null },
        },
      });

      for (const p of unlinkedParents) {
        if (!p.email || !p.email.includes("@")) continue;
        const cleanEmail = p.email.toLowerCase().trim();
        let user = await prisma.user.findUnique({
          where: { email: cleanEmail },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email: cleanEmail,
              name: p.fullName,
              role: UserRole.ORANG_TUA,
              status: AccountStatus.AKTIF,
              onboardingCompleted: true,
              passwordHash: defaultHash,
              phone: p.phone,
            },
          });
        }

        await prisma.parent.update({
          where: { id: p.id },
          data: { userId: user.id },
        });
      }

      // Ensure all ORANG_TUA user accounts have active status and default password "asdasdasd" so login works immediately
      await prisma.user.updateMany({
        where: {
          role: UserRole.ORANG_TUA,
        },
        data: {
          passwordHash: defaultHash,
          status: AccountStatus.AKTIF,
          onboardingCompleted: true,
        },
      });
    } catch (reconcileErr) {
      console.warn("Account parent reconciliation warning:", reconcileErr);
    }

    const users = await prisma.user.findMany({
      orderBy: { name: "asc" },
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
        parent: {
          include: {
            students: {
              include: {
                student: true,
              },
            },
          },
        },
      },
    });

    const formatted = users.map((u) => {
      const roleStr = roleEnumToString[u.role] || "siswa";
      const statusStr = u.status === AccountStatus.AKTIF ? "Aktif" : u.status === AccountStatus.BELUM_ONBOARDING ? "Belum Onboarding" : "Nonaktif";

      return {
        id: u.id,
        uid: u.id,
        name: u.name,
        email: u.email,
        role: roleStr,
        status: statusStr,
        onboardingCompleted: u.onboardingCompleted,
        phone: u.phone || "-",
        avatarUrl: u.avatarUrl || null,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
        nip: u.teacher?.nip || null,
        subject: u.teacher?.subjects?.map((s) => s.subject.name).join(", ") || null,
        nisn: u.student?.nisn || null,
        className: u.student?.class?.name || null,
        classId: u.student?.classId || null,
        studentName: u.parent?.students?.map((s) => s.student.fullName).join(", ") || null,
        studentIds: u.parent?.students?.map((s) => s.studentId) || [],
      };
    });

    return NextResponse.json({ success: true, users: formatted });
  } catch (err: any) {
    console.error("GET /api/accounts error:", err);
    return NextResponse.json({ error: "Gagal memuat data akun dari database: " + err.message }, { status: 500 });
  }
}

// POST /api/accounts - Create new account in PostgreSQL
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name, role, nip, nisn, className, subject, phone, status } = body;

    if (!email || !name) {
      return NextResponse.json({ error: "Nama dan email wajib diisi." }, { status: 400 });
    }

    const cleanEmail = String(email).toLowerCase().trim();

    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });
    if (existing) {
      return NextResponse.json({ error: "Akun dengan email ini sudah terdaftar." }, { status: 409 });
    }

    const passwordHash = password ? await bcrypt.hash(password, 10) : await bcrypt.hash("asdasdasd", 10);
    const targetRole = roleMappingToEnum[String(role).toLowerCase()] || UserRole.SISWA;
    const isStudent = targetRole === UserRole.SISWA;
    let targetStatus: AccountStatus;
    if (status === "Nonaktif" || status === "NONAKTIF") {
      targetStatus = AccountStatus.NONAKTIF;
    } else if (status === "Aktif" || status === "AKTIF") {
      targetStatus = AccountStatus.AKTIF;
    } else if (status === "Belum Onboarding" || status === "BELUM_ONBOARDING") {
      targetStatus = AccountStatus.BELUM_ONBOARDING;
    } else {
      targetStatus = isStudent ? AccountStatus.BELUM_ONBOARDING : AccountStatus.AKTIF;
    }

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

    // Create companion profile
    if (targetRole === UserRole.GURU) {
      const teacher = await prisma.teacher.create({
        data: {
          nip: nip ? String(nip).trim() : `NIP-${Date.now()}`,
          userId: newUser.id,
          fullName: name.trim(),
          phone: phone || null,
          status: "Aktif",
        },
      });

      if (subject) {
        // Link or create subject
        const sub = await prisma.subject.upsert({
          where: { code: `MAPEL-${Date.now()}` },
          update: {},
          create: {
            code: `MAPEL-${Date.now()}`,
            name: String(subject).trim(),
          },
        });
        await prisma.teacherSubject.create({
          data: {
            teacherId: teacher.id,
            subjectId: sub.id,
          },
        });
      }
    } else if (targetRole === UserRole.SISWA) {
      let targetClassId: string | null = null;
      if (className) {
        const foundClass = await prisma.class.findFirst({
          where: { OR: [{ id: className }, { name: className }] },
        });
        if (foundClass) targetClassId = foundClass.id;
      }

      await prisma.student.create({
        data: {
          nisn: nisn ? String(nisn).trim() : `NISN-${Date.now()}`,
          userId: newUser.id,
          fullName: name.trim(),
          phone: phone || null,
          status: "Aktif",
          classId: targetClassId,
        },
      });
    } else if (targetRole === UserRole.ORANG_TUA) {
      const parent = await prisma.parent.create({
        data: {
          userId: newUser.id,
          fullName: name.trim(),
          email: cleanEmail,
          phone: phone || null,
        },
      });

      if (nisn) {
        const student = await prisma.student.findFirst({
          where: { OR: [{ nisn: String(nisn).trim() }, { id: String(nisn).trim() }] },
        });
        if (student) {
          await prisma.parentStudent.create({
            data: {
              parentId: parent.id,
              studentId: student.id,
              relationship: "Orang Tua",
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Akun ${name} berhasil dibuat di database PostgreSQL.`,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: roleEnumToString[newUser.role],
      },
    });
  } catch (err: any) {
    console.error("POST /api/accounts error:", err);
    return NextResponse.json({ error: "Gagal membuat akun: " + err.message }, { status: 500 });
  }
}

// PUT /api/accounts - Update account details or toggle status
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, email, role, status, password, nip, nisn, className } = body;

    const cleanEmail = email ? String(email).toLowerCase().trim() : undefined;
    const cleanId = id ? String(id).trim() : undefined;

    if (!cleanId && !cleanEmail) {
      return NextResponse.json({ error: "ID atau Email akun wajib disertakan." }, { status: 400 });
    }

    const targetUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(cleanId ? [{ id: cleanId }] : []),
          ...(cleanEmail ? [{ email: cleanEmail }] : []),
        ],
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Akun tidak ditemukan di database." }, { status: 404 });
    }

    const updateData: any = {};
    if (name) updateData.name = String(name).trim();
    if (cleanEmail) updateData.email = cleanEmail;
    if (role && roleMappingToEnum[String(role).toLowerCase()]) {
      updateData.role = roleMappingToEnum[String(role).toLowerCase()];
    }
    if (status) {
      updateData.status = status === "Nonaktif" ? AccountStatus.NONAKTIF : status === "Belum Onboarding" ? AccountStatus.BELUM_ONBOARDING : AccountStatus.AKTIF;
      if (status === "Aktif") updateData.onboardingCompleted = true;
    }
    if (password && password.length >= 6) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUser.id },
      data: updateData,
    });

    // Update companion teacher or student if relevant
    if (updatedUser.role === UserRole.GURU && nip) {
      await prisma.teacher.updateMany({
        where: { userId: id },
        data: { nip: String(nip).trim(), fullName: updatedUser.name },
      });
    } else if (updatedUser.role === UserRole.SISWA && (nisn || className)) {
      let classIdUpdate: string | undefined;
      if (className) {
        const found = await prisma.class.findFirst({
          where: { OR: [{ id: className }, { name: className }] },
        });
        if (found) classIdUpdate = found.id;
      }
      await prisma.student.updateMany({
        where: { userId: id },
        data: {
          ...(nisn ? { nisn: String(nisn).trim() } : {}),
          ...(classIdUpdate ? { classId: classIdUpdate } : {}),
          fullName: updatedUser.name,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Akun ${updatedUser.name} berhasil diperbarui.`,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: roleEnumToString[updatedUser.role],
        status: updatedUser.status === AccountStatus.AKTIF ? "Aktif" : "Nonaktif",
      },
    });
  } catch (err: any) {
    console.error("PUT /api/accounts error:", err);
    return NextResponse.json({ error: "Gagal memperbarui akun: " + err.message }, { status: 500 });
  }
}

// DELETE /api/accounts - Delete account from PostgreSQL
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID akun wajib disertakan." }, { status: 400 });
    }

    const user = await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Akun ${user.name} berhasil dihapus permanen dari PostgreSQL.`,
    });
  } catch (err: any) {
    console.error("DELETE /api/accounts error:", err);
    return NextResponse.json({ error: "Gagal menghapus akun: " + err.message }, { status: 500 });
  }
}
