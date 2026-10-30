import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as bcrypt from "bcryptjs";
import { UserRole, AccountStatus } from "@prisma/client";

// GET /api/saas-school-admins
// Mengambil seluruh data Super Admin / PIC dari masing-masing sekolah pelanggan SaaS
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.toLowerCase().trim();
    const status = searchParams.get("status"); // ALL | AKTIF | TRIAL | SUSPENDED | NONAKTIF
    const accountStatus = searchParams.get("accountStatus"); // ALL | TERDAFTAR | BELUM_DIBUAT

    // 1. Ambil seluruh data sekolah pelanggan SaaS
    const customers = await prisma.saaSCustomer.findMany({
      orderBy: { createdAt: "desc" },
    });

    // 2. Ambil seluruh user dengan role SUPER_ADMIN atau KEPALA_SEKOLAH di sistem
    const adminUsers = await prisma.user.findMany({
      where: {
        role: {
          in: [UserRole.SUPER_ADMIN, UserRole.KEPALA_SEKOLAH, UserRole.ADMIN],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        avatarUrl: true,
        onboardingCompleted: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Buat map email -> user record untuk lookup cepat
    const userByEmail = new Map<string, (typeof adminUsers)[0]>();
    adminUsers.forEach((u) => {
      userByEmail.set(u.email.toLowerCase().trim(), u);
    });

    // 3. Gabungkan data Super Admin per sekolah
    let schoolAdmins = customers.map((c) => {
      const cleanPicEmail = (c.picEmail || "").toLowerCase().trim();
      const matchedUser = userByEmail.get(cleanPicEmail);

      const hasAccount = Boolean(matchedUser);
      const userStatus = matchedUser
        ? matchedUser.status === AccountStatus.AKTIF
          ? "AKTIF"
          : "NONAKTIF"
        : "BELUM_DIBUAT";

      return {
        id: c.id,
        customerId: c.id,
        customerCode: c.customerCode,
        schoolName: c.schoolName,
        schoolLevel: c.schoolLevel,
        schoolType: c.schoolType || "Swasta",
        npsn: c.npsn || "-",
        subdomain: c.subdomain || c.customerCode.toLowerCase(),
        city: c.city || "-",
        province: c.province || "-",
        plan: c.plan,
        subscriptionStatus: c.status,
        currentStudents: c.currentStudents || 0,
        maxStudents: c.maxStudents || 1000,
        activeModules: c.activeModules || [],
        subscriptionEnd: c.subscriptionEnd ? c.subscriptionEnd.toISOString() : null,
        schoolCreatedAt: c.createdAt.toISOString(),

        // Data Super Admin / PIC
        adminName: c.picName,
        adminRole: c.picRole || "Super Admin Sekolah",
        adminEmail: c.picEmail,
        adminPhone: c.picPhone || "-",

        // Status Akun Login Sistem (User Model)
        hasAccount,
        userId: matchedUser ? matchedUser.id : null,
        userRole: matchedUser ? matchedUser.role : "SUPER_ADMIN",
        userStatus,
        onboardingCompleted: matchedUser ? matchedUser.onboardingCompleted : false,
        accountCreatedAt: matchedUser ? matchedUser.createdAt.toISOString() : null,
        accountUpdatedAt: matchedUser ? matchedUser.updatedAt.toISOString() : null,
      };
    });

    // Sertakan juga standalone SUPER_ADMIN (misal user super admin default sistem jika belum terpetakan ke customer)
    const registeredEmailsInCustomers = new Set(
      customers.map((c) => (c.picEmail || "").toLowerCase().trim())
    );

    const standaloneSuperAdmins = adminUsers
      .filter((u) => u.role === UserRole.SUPER_ADMIN && !registeredEmailsInCustomers.has(u.email.toLowerCase().trim()))
      .map((u) => ({
        id: `standalone-${u.id}`,
        customerId: null,
        customerCode: "INTERNAL-SYS",
        schoolName: "SMA Garuda Nusantara Smart School (Akun Utama)",
        schoolLevel: "SMA/MA",
        schoolType: "Swasta",
        npsn: "20194820",
        subdomain: "garudanusantara",
        city: "Jakarta",
        province: "DKI Jakarta",
        plan: "enterprise",
        subscriptionStatus: "AKTIF",
        currentStudents: 450,
        maxStudents: 1000,
        activeModules: ["mod_presensi", "mod_akademik", "mod_rapor", "mod_keuangan"],
        subscriptionEnd: null,
        schoolCreatedAt: u.createdAt.toISOString(),

        adminName: u.name,
        adminRole: "Super Administrator Utama",
        adminEmail: u.email,
        adminPhone: u.phone || "-",

        hasAccount: true,
        userId: u.id,
        userRole: u.role,
        userStatus: u.status === AccountStatus.AKTIF ? "AKTIF" : "NONAKTIF",
        onboardingCompleted: u.onboardingCompleted,
        accountCreatedAt: u.createdAt.toISOString(),
        accountUpdatedAt: u.updatedAt.toISOString(),
      }));

    let allAdmins = [...schoolAdmins, ...standaloneSuperAdmins];

    // Filter pencarian
    if (search) {
      allAdmins = allAdmins.filter(
        (a) =>
          a.adminName.toLowerCase().includes(search) ||
          a.adminEmail.toLowerCase().includes(search) ||
          a.schoolName.toLowerCase().includes(search) ||
          a.customerCode.toLowerCase().includes(search) ||
          a.npsn.toLowerCase().includes(search) ||
          a.subdomain.toLowerCase().includes(search) ||
          a.adminPhone.toLowerCase().includes(search)
      );
    }

    // Filter status sekolah
    if (status && status !== "ALL") {
      allAdmins = allAdmins.filter((a) => a.subscriptionStatus === status);
    }

    // Filter status akun
    if (accountStatus && accountStatus !== "ALL") {
      if (accountStatus === "TERDAFTAR") {
        allAdmins = allAdmins.filter((a) => a.hasAccount);
      } else if (accountStatus === "BELUM_DIBUAT") {
        allAdmins = allAdmins.filter((a) => !a.hasAccount);
      } else {
        allAdmins = allAdmins.filter((a) => a.userStatus === accountStatus);
      }
    }

    // Hitung ringkasan statistik KPI
    const totalAdmins = allAdmins.length;
    const activeAccounts = allAdmins.filter((a) => a.userStatus === "AKTIF").length;
    const pendingAccounts = allAdmins.filter((a) => !a.hasAccount || a.userStatus === "BELUM_DIBUAT").length;
    const activeSchools = allAdmins.filter((a) => a.subscriptionStatus === "AKTIF").length;

    return NextResponse.json({
      success: true,
      data: allAdmins,
      summary: {
        totalAdmins,
        activeAccounts,
        pendingAccounts,
        activeSchools,
      },
    });
  } catch (err: any) {
    console.error("GET /api/saas-school-admins error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memuat data super admin sekolah" },
      { status: 500 }
    );
  }
}

// POST /api/saas-school-admins
// Operasi Akun Super Admin: Aktivasi / Buat Akun Baru, Reset Password, atau Ubah Status
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, email, name, phone, password, userId, targetStatus } = body;

    if (!action) {
      return NextResponse.json({ success: false, error: "Aksi tidak ditentukan" }, { status: 400 });
    }

    // 1. BUAT / AKTIVASI AKUN SUPER ADMIN SEKOLAH (PROVISIONING)
    if (action === "PROVISION_ACCOUNT") {
      if (!email || !name) {
        return NextResponse.json({ success: false, error: "Nama dan email wajib diisi" }, { status: 400 });
      }

      const cleanEmail = String(email).toLowerCase().trim();
      const rawPassword = password?.trim() || "AdminSekolah123!";
      const passwordHash = await bcrypt.hash(rawPassword, 10);

      // Cek apakah user sudah ada
      let user = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      if (user) {
        // Update user agar role menjadi SUPER_ADMIN dan status aktif
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            name: name.trim(),
            role: UserRole.SUPER_ADMIN,
            status: AccountStatus.AKTIF,
            passwordHash,
            phone: phone ? phone.trim() : user.phone,
            onboardingCompleted: true,
          },
        });
      } else {
        // Buat user baru dengan role SUPER_ADMIN
        user = await prisma.user.create({
          data: {
            email: cleanEmail,
            name: name.trim(),
            role: UserRole.SUPER_ADMIN,
            status: AccountStatus.AKTIF,
            passwordHash,
            phone: phone ? phone.trim() : null,
            onboardingCompleted: true,
          },
        });
      }

      // Catat ke log operasional SaaS
      await prisma.saaSOperationLog.create({
        data: {
          action: "SUPER_ADMIN_PROVISIONED",
          entityType: "USER",
          entityId: user.id,
          entityName: user.name,
          description: `Akun Super Admin untuk ${name} (${cleanEmail}) berhasil diaktivasi dengan password default.`,
          performedBy: "SaaS Administrator",
        },
      }).catch((e) => console.warn("Operation log error:", e));

      return NextResponse.json({
        success: true,
        message: `Akun Super Admin untuk ${name} (${cleanEmail}) berhasil dibuat & diaktivasi.`,
        credentials: {
          email: cleanEmail,
          password: rawPassword,
          role: "SUPER_ADMIN",
        },
        user,
      });
    }

    // 2. RESET PASSWORD SUPER ADMIN
    if (action === "RESET_PASSWORD") {
      const cleanEmail = email ? String(email).toLowerCase().trim() : null;
      let targetUser = null;

      if (userId) {
        targetUser = await prisma.user.findUnique({ where: { id: userId } });
      } else if (cleanEmail) {
        targetUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
      }

      if (!targetUser) {
        return NextResponse.json(
          { success: false, error: "Akun pengguna tidak ditemukan di basis data" },
          { status: 404 }
        );
      }

      // Buat password acak yang mudah dibaca atau gunakan custom password
      const newPassword = password?.trim() || `Pass${Math.floor(100000 + Math.random() * 900000)}!`;
      const passwordHash = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
        where: { id: targetUser.id },
        data: {
          passwordHash,
          status: AccountStatus.AKTIF,
        },
      });

      // Catat ke log operasional SaaS
      await prisma.saaSOperationLog.create({
        data: {
          action: "SUPER_ADMIN_PASSWORD_RESET",
          entityType: "USER",
          entityId: targetUser.id,
          entityName: targetUser.name,
          description: `Password Super Admin ${targetUser.name} (${targetUser.email}) berhasil di-reset oleh SaaS Administrator.`,
          performedBy: "SaaS Administrator",
        },
      }).catch((e) => console.warn("Operation log error:", e));

      return NextResponse.json({
        success: true,
        message: `Kata sandi Super Admin untuk ${targetUser.name} berhasil di-reset.`,
        newPassword,
        email: targetUser.email,
      });
    }

    // 3. TOGGLE STATUS AKUN (AKTIF / NONAKTIF)
    if (action === "TOGGLE_STATUS") {
      const cleanEmail = email ? String(email).toLowerCase().trim() : null;
      let targetUser = null;

      if (userId) {
        targetUser = await prisma.user.findUnique({ where: { id: userId } });
      } else if (cleanEmail) {
        targetUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
      }

      if (!targetUser) {
        return NextResponse.json(
          { success: false, error: "Akun pengguna tidak ditemukan" },
          { status: 404 }
        );
      }

      const nextStatus = targetStatus
        ? targetStatus === "AKTIF"
          ? AccountStatus.AKTIF
          : AccountStatus.NONAKTIF
        : targetUser.status === AccountStatus.AKTIF
        ? AccountStatus.NONAKTIF
        : AccountStatus.AKTIF;

      await prisma.user.update({
        where: { id: targetUser.id },
        data: { status: nextStatus },
      });

      // Catat ke log operasional SaaS
      await prisma.saaSOperationLog.create({
        data: {
          action: "SUPER_ADMIN_STATUS_CHANGED",
          entityType: "USER",
          entityId: targetUser.id,
          entityName: targetUser.name,
          description: `Status akun Super Admin ${targetUser.name} diubah menjadi ${nextStatus}.`,
          performedBy: "SaaS Administrator",
        },
      }).catch((e) => console.warn("Operation log error:", e));

      return NextResponse.json({
        success: true,
        message: `Status akun Super Admin ${targetUser.name} berhasil diubah menjadi ${nextStatus}.`,
        status: nextStatus,
      });
    }

    return NextResponse.json({ success: false, error: "Aksi tidak dikenali" }, { status: 400 });
  } catch (err: any) {
    console.error("POST /api/saas-school-admins error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memproses aksi akun Super Admin" },
      { status: 500 }
    );
  }
}
