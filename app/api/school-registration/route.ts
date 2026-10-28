import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

const DATA_DIR = path.join(process.cwd(), "data");
const REG_FILE_PATH = path.join(DATA_DIR, "school-registrations.json");

function ensureDirectoryAndFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(REG_FILE_PATH)) {
    fs.writeFileSync(REG_FILE_PATH, JSON.stringify([], null, 2), "utf-8");
  }
}

function readRegistrations(): any[] {
  ensureDirectoryAndFile();
  try {
    const raw = fs.readFileSync(REG_FILE_PATH, "utf-8");
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
}

function saveRegistration(entry: any) {
  ensureDirectoryAndFile();
  const all = readRegistrations();
  all.unshift(entry);
  fs.writeFileSync(REG_FILE_PATH, JSON.stringify(all, null, 2), "utf-8");
}

export async function GET() {
  try {
    const list = readRegistrations();
    return NextResponse.json({
      success: true,
      total: list.length,
      registrations: list,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      schoolName,
      npsn,
      schoolLevel,
      schoolType, // "Negeri" | "Swasta"
      province,
      city,
      address,
      subdomain,
      picName,
      picRole,
      picEmail,
      picPhone,
      password,
      plan = "trial", // "trial" | "standard" | "pro" | "enterprise"
      studentEstimate = "200 - 500",
      selectedModules = [],
      notes = "",
    } = body;

    if (!schoolName || !picName || !picEmail || !picPhone) {
      return NextResponse.json(
        { success: false, error: "Mohon lengkapi data sekolah, nama PIC, email, dan nomor WhatsApp." },
        { status: 400 }
      );
    }

    const cleanEmail = String(picEmail).trim().toLowerCase();
    const cleanNpsn = String(npsn || "").trim();
    const cleanSubdomain = String(subdomain || schoolName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20)).toLowerCase();
    const regNumber = `REG-SCH-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const registrationData = {
      id: regNumber,
      registrationNumber: regNumber,
      schoolName: schoolName.trim(),
      npsn: cleanNpsn,
      schoolLevel: schoolLevel || "SMA",
      schoolType: schoolType || "Swasta",
      province: province || "",
      city: city || "",
      address: address || "",
      subdomain: cleanSubdomain,
      schoolUrl: `https://${cleanSubdomain}.quickschools.id`,
      picName: picName.trim(),
      picRole: picRole || "Kepala Sekolah / Admin",
      picEmail: cleanEmail,
      picPhone: picPhone.trim(),
      plan,
      studentEstimate,
      selectedModules,
      notes,
      status: plan === "enterprise" ? "Menunggu Verifikasi Tim Solusi" : "Aktif (Masa Trial 14 Hari)",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };

    // 1. Save to JSON store
    saveRegistration(registrationData);

    // 2. Automatically create Super Admin user in PostgreSQL if password provided
    let createdUserId = null;
    if (password && password.length >= 6) {
      try {
        const existingUser = await prisma.user.findUnique({
          where: { email: cleanEmail },
        });

        if (!existingUser) {
          const hashedPassword = await bcrypt.hash(password, 10);
          const newUser = await prisma.user.create({
            data: {
              name: picName.trim(),
              email: cleanEmail,
              passwordHash: hashedPassword,
              role: "SUPER_ADMIN",
              phone: picPhone.trim(),
              status: "AKTIF",
              onboardingCompleted: true,
            },
          });
          createdUserId = newUser.id;
        }
      } catch (dbErr) {
        console.warn("PostgreSQL user creation notice during school registration:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Pendaftaran sekolah ${schoolName} berhasil disimpan! Sistem siap digunakan.`,
      registration: registrationData,
      createdUserId,
      redirectUrl: "/dashboard",
    });
  } catch (error: any) {
    console.error("POST /api/school-registration error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

