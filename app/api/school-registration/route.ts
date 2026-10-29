import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const REG_FILE_PATH = path.join(DATA_DIR, "subscription-requests.json");

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
    let list = [];
    try {
      list = await prisma.subscriptionRequest.findMany({
        orderBy: { createdAt: "desc" },
      });
    } catch {
      list = readRegistrations();
    }
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
      schoolLevel = "SMA/MA",
      schoolType = "Swasta",
      province = "",
      city = "",
      address = "",
      subdomain = "",
      picName,
      picRole = "Kepala Sekolah",
      picEmail,
      picPhone,
      plan = "pro",
      planInterest,
      studentCount,
      studentEstimate = "200 - 500",
      selectedModules = [],
      notes = "",
      preferredTime = "WhatsApp Kapan Saja",
    } = body;

    if (!schoolName || !picName || !picEmail || !picPhone) {
      return NextResponse.json(
        { success: false, error: "Mohon lengkapi data sekolah, nama penanggung jawab, email, dan nomor WhatsApp." },
        { status: 400 }
      );
    }

    const cleanEmail = String(picEmail).trim().toLowerCase();
    const cleanPhone = String(picPhone).trim();
    const cleanNpsn = String(npsn || "").trim();
    const cleanSubdomain = String(subdomain || schoolName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20)).toLowerCase();
    const regNumber = `REQ-SUB-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const targetPlan = planInterest || plan || "pro";
    const numStudents = studentCount ? Number(studentCount) : null;

    let createdRecord = null;
    try {
      createdRecord = await prisma.subscriptionRequest.create({
        data: {
          requestNumber: regNumber,
          schoolName: schoolName.trim(),
          npsn: cleanNpsn,
          schoolLevel: schoolLevel || "SMA/MA",
          schoolType: schoolType || "Swasta",
          province,
          city,
          address,
          subdomain: cleanSubdomain,
          picName: picName.trim(),
          picRole: picRole || "Kepala Sekolah",
          picEmail: cleanEmail,
          picPhone: cleanPhone,
          studentCount: numStudents,
          studentEstimate: studentEstimate || "200 - 500",
          planInterest: targetPlan,
          selectedModules: Array.isArray(selectedModules) ? selectedModules : [],
          notes: notes || "",
          preferredTime: preferredTime || "",
          status: "PENDING",
        },
      });
    } catch (e) {
      console.warn("Prisma subscriptionRequest create notice:", e);
      createdRecord = {
        id: regNumber,
        requestNumber: regNumber,
        schoolName: schoolName.trim(),
        npsn: cleanNpsn,
        schoolLevel,
        schoolType,
        province,
        city,
        address,
        subdomain: cleanSubdomain,
        picName: picName.trim(),
        picRole,
        picEmail: cleanEmail,
        picPhone: cleanPhone,
        planInterest: targetPlan,
        studentCount: numStudents,
        studentEstimate,
        selectedModules,
        notes,
        status: "PENDING",
        createdAt: new Date().toISOString(),
      };
    }

    saveRegistration(createdRecord);

    return NextResponse.json({
      success: true,
      message: `Permintaan berlangganan untuk ${schoolName} berhasil dikirim! Tim Quick Schools akan segera menghubungi Anda untuk konsultasi & penawaran harga.`,
      registration: createdRecord,
      request: createdRecord,
    });
  } catch (error: any) {
    console.error("POST /api/school-registration error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
