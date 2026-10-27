import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromDb } from "@/lib/server-auth";
import { AccountStatus, UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionUser = await getCurrentUserFromDb();

    const {
      userId,
      email,
      fullName,
      name,
      nickname,
      gender,
      birthPlace,
      birthDate,
      religion,
      nik,
      address,
      phone,
      photoUrl,
      nisn,
      nis,
      className,
      classId,
      major,
      entryYear,
      level,
      fatherName,
      motherName,
      guardianName,
      relation,
      parentPhone,
      parentEmail,
      parentPassword,
      parentAddress,
      parentJob,
      parentIncome,
    } = body;

    const studentName = String(fullName || name || sessionUser?.name || "").trim();
    const studentEmail = String(email || sessionUser?.email || "").trim().toLowerCase();

    // 1. Identify target user
    let targetUser: any = sessionUser;
    if (!targetUser && userId) {
      targetUser = await prisma.user.findUnique({
        where: { id: String(userId).trim() },
        include: { student: true },
      });
    }
    if (!targetUser && studentEmail) {
      targetUser = await prisma.user.findUnique({
        where: { email: studentEmail },
        include: { student: true },
      });
    }

    if (!targetUser) {
      return NextResponse.json(
        { error: "Autentikasi diperlukan. Akun pengguna tidak ditemukan." },
        { status: 401 }
      );
    }

    // 2. Resolve Class
    let targetClassId: string | null = null;
    const targetClassQuery = classId || className;
    if (targetClassQuery) {
      const foundClass = await prisma.class.findFirst({
        where: {
          OR: [
            { id: String(targetClassQuery).trim() },
            { name: String(targetClassQuery).trim() },
          ],
        },
      });
      if (foundClass) {
        targetClassId = foundClass.id;
      }
    }

    // 3. Resolve NISN
    const studentNisn = String(nisn || "").trim() || `NISN-${targetUser.id.slice(-6)}`;
    const studentNis = String(nis || "").trim() || studentNisn;

    // 4. Upsert Student profile
    let student = await prisma.student.findFirst({
      where: {
        OR: [
          { userId: targetUser.id },
          { nisn: studentNisn },
        ],
      },
    });

    const parsedBirthDate = birthDate ? new Date(birthDate) : null;
    const validBirthDate = parsedBirthDate && !isNaN(parsedBirthDate.getTime()) ? parsedBirthDate : null;

    if (student) {
      student = await prisma.student.update({
        where: { id: student.id },
        data: {
          fullName: studentName || student.fullName,
          nickname: nickname || student.nickname,
          gender: gender || student.gender || "Laki-laki",
          birthPlace: birthPlace !== undefined ? birthPlace : student.birthPlace,
          birthDate: validBirthDate !== null ? validBirthDate : student.birthDate,
          religion: religion || student.religion || "Islam",
          nik: nik !== undefined ? nik : student.nik,
          address: address !== undefined ? address : student.address,
          phone: phone !== undefined ? phone : student.phone,
          photoUrl: photoUrl || student.photoUrl,
          classId: targetClassId || student.classId,
          major: major || student.major || "MIPA",
          entryYear: entryYear || student.entryYear || "2025/2026",
          level: level || student.level || "SMA",
          status: "Aktif",
          fatherName: fatherName !== undefined ? fatherName : student.fatherName,
          motherName: motherName !== undefined ? motherName : student.motherName,
          guardianName: guardianName !== undefined ? guardianName : student.guardianName,
          parentPhone: parentPhone !== undefined ? parentPhone : student.parentPhone,
          parentJob: parentJob !== undefined ? parentJob : student.parentJob,
          parentIncome: parentIncome !== undefined ? parentIncome : student.parentIncome,
          parentAddress: parentAddress !== undefined ? parentAddress : student.parentAddress,
          userId: targetUser.id,
        },
      });
    } else {
      student = await prisma.student.create({
        data: {
          nisn: studentNisn,
          nis: studentNis,
          fullName: studentName,
          nickname: nickname || null,
          gender: gender || "Laki-laki",
          birthPlace: birthPlace || null,
          birthDate: validBirthDate,
          religion: religion || "Islam",
          nik: nik || null,
          address: address || null,
          phone: phone || null,
          photoUrl: photoUrl || null,
          classId: targetClassId,
          major: major || "MIPA",
          entryYear: entryYear || "2025/2026",
          level: level || "SMA",
          status: "Aktif",
          fatherName: fatherName || null,
          motherName: motherName || null,
          guardianName: guardianName || null,
          parentPhone: parentPhone || null,
          parentJob: parentJob || null,
          parentIncome: parentIncome || null,
          parentAddress: parentAddress || null,
          userId: targetUser.id,
        },
      });
    }

    // 5. Parent User & Record Linkage (if parent name/email supplied)
    const bestParentName = (fatherName || motherName || guardianName || "").trim();
    if (bestParentName) {
      const cleanParentEmail = parentEmail && String(parentEmail).includes("@")
        ? String(parentEmail).toLowerCase().trim()
        : null;

      let parentUserId: string | null = null;

      // 5a. Create or update User account in PostgreSQL User table
      if (cleanParentEmail) {
        let parentUser = await prisma.user.findUnique({
          where: { email: cleanParentEmail },
        });

        const rawPassword = String(parentPassword || "").trim() || "asdasdasd";
        const passwordHash = await bcrypt.hash(rawPassword, 10);

        if (!parentUser) {
          parentUser = await prisma.user.create({
            data: {
              email: cleanParentEmail,
              passwordHash,
              name: bestParentName,
              role: UserRole.ORANG_TUA,
              status: AccountStatus.AKTIF,
              onboardingCompleted: true,
              phone: parentPhone || null,
            },
          });
        } else {
          // If parent user already exists, ensure active and update passwordHash
          const updates: any = {
            status: AccountStatus.AKTIF,
            onboardingCompleted: true,
          };
          if (parentPassword) {
            updates.passwordHash = await bcrypt.hash(String(parentPassword).trim(), 10);
          } else if (!parentUser.passwordHash) {
            updates.passwordHash = await bcrypt.hash("asdasdasd", 10);
          }
          parentUser = await prisma.user.update({
            where: { id: parentUser.id },
            data: updates,
          });
        }

        parentUserId = parentUser.id;
      }

      // 5b. Find or create Parent companion record
      let parent = null;
      if (parentUserId) {
        parent = await prisma.parent.findFirst({
          where: { userId: parentUserId },
        });
      }
      if (!parent && cleanParentEmail) {
        parent = await prisma.parent.findFirst({
          where: { email: cleanParentEmail },
        });
      }

      if (!parent) {
        parent = await prisma.parent.create({
          data: {
            userId: parentUserId,
            fullName: bestParentName,
            email: cleanParentEmail,
            phone: parentPhone || null,
            address: parentAddress || address || null,
            job: parentJob || null,
            income: parentIncome || null,
          },
        });
      } else if (parentUserId && !parent.userId) {
        // Link existing unlinked parent record to User account
        parent = await prisma.parent.update({
          where: { id: parent.id },
          data: {
            userId: parentUserId,
            fullName: bestParentName || parent.fullName,
            email: cleanParentEmail || parent.email,
            phone: parentPhone || parent.phone,
            address: parentAddress || parent.address,
            job: parentJob || parent.job,
            income: parentIncome || parent.income,
          },
        });
      }

      // 5c. Link parent to student in ParentStudent relation
      const existingLink = await prisma.parentStudent.findFirst({
        where: {
          parentId: parent.id,
          studentId: student.id,
        },
      });

      if (!existingLink) {
        await prisma.parentStudent.create({
          data: {
            parentId: parent.id,
            studentId: student.id,
            relationship: relation || "Orang Tua",
          },
        });
      }
    }

    // 6. Update User account: Set AKTIF and onboardingCompleted = true
    const updatedUser = await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        name: studentName,
        phone: phone || targetUser.phone,
        avatarUrl: photoUrl || targetUser.avatarUrl,
        status: AccountStatus.AKTIF,
        onboardingCompleted: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Data profil onboarding siswa berhasil disimpan.",
      student,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        status: "Aktif",
        onboardingCompleted: true,
      },
    });
  } catch (error: any) {
    console.error("POST /api/onboarding error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan data onboarding: " + error.message },
      { status: 500 }
    );
  }
}
