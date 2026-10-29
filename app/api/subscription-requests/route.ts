import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const BACKUP_FILE = path.join(DATA_DIR, "subscription-requests.json");

function ensureBackupFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BACKUP_FILE)) {
    fs.writeFileSync(BACKUP_FILE, JSON.stringify([], null, 2), "utf-8");
  }
}

function readBackup(): any[] {
  ensureBackupFile();
  try {
    const raw = fs.readFileSync(BACKUP_FILE, "utf-8");
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
}

function saveToBackup(entry: any) {
  ensureBackupFile();
  try {
    const all = readBackup();
    const existingIndex = all.findIndex((item) => item.id === entry.id || item.requestNumber === entry.requestNumber);
    if (existingIndex >= 0) {
      all[existingIndex] = { ...all[existingIndex], ...entry };
    } else {
      all.unshift(entry);
    }
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(all, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not write to JSON backup:", err);
  }
}

// GET /api/subscription-requests - List all requests
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const plan = searchParams.get("plan");
    const search = searchParams.get("search")?.toLowerCase().trim();

    let whereClause: any = {};

    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    if (plan && plan !== "ALL") {
      whereClause.planInterest = plan;
    }

    if (search) {
      whereClause.OR = [
        { schoolName: { contains: search, mode: "insensitive" } },
        { picName: { contains: search, mode: "insensitive" } },
        { picEmail: { contains: search, mode: "insensitive" } },
        { picPhone: { contains: search, mode: "insensitive" } },
        { requestNumber: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
      ];
    }

    let list = [];
    try {
      list = await prisma.subscriptionRequest.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
      });
    } catch (dbErr) {
      console.warn("Prisma subscriptionRequest query error, falling back to JSON backup:", dbErr);
      list = readBackup();
      if (status && status !== "ALL") {
        list = list.filter((r) => r.status === status);
      }
      if (plan && plan !== "ALL") {
        list = list.filter((r) => r.planInterest === plan);
      }
      if (search) {
        list = list.filter(
          (r) =>
            r.schoolName?.toLowerCase().includes(search) ||
            r.picName?.toLowerCase().includes(search) ||
            r.picEmail?.toLowerCase().includes(search) ||
            r.picPhone?.toLowerCase().includes(search) ||
            r.requestNumber?.toLowerCase().includes(search)
        );
      }
    }

    return NextResponse.json({
      success: true,
      total: list.length,
      data: list,
    });
  } catch (error: any) {
    console.error("GET /api/subscription-requests error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/subscription-requests - Submit new Request Subscription
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      schoolName,
      npsn,
      schoolLevel,
      schoolType = "Swasta",
      province = "",
      city = "",
      address = "",
      subdomain = "",
      picName,
      picRole = "Kepala Sekolah",
      picEmail,
      picPhone,
      studentCount,
      studentEstimate = "200 - 500",
      planInterest = "pro",
      selectedModules = [],
      notes = "",
      preferredTime = "WhatsApp Kapan Saja",
    } = body;

    if (!schoolName || !picName || !picEmail || !picPhone) {
      return NextResponse.json(
        {
          success: false,
          error: "Mohon lengkapi data sekolah, nama penanggung jawab, email, dan nomor WhatsApp.",
        },
        { status: 400 }
      );
    }

    const cleanEmail = String(picEmail).trim().toLowerCase();
    const cleanPhone = String(picPhone).trim();
    const cleanSchoolName = String(schoolName).trim();
    const cleanPicName = String(picName).trim();
    const cleanNpsn = String(npsn || "").trim();
    const cleanSubdomain = String(subdomain || cleanSchoolName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20)).toLowerCase();

    // Generate Request Number: REQ-SUB-YYYY-XXXXXX
    const randomCode = Math.floor(100000 + Math.random() * 900000);
    const requestNumber = `REQ-SUB-${new Date().getFullYear()}-${randomCode}`;

    const numStudents = studentCount ? Number(studentCount) : null;

    let createdRecord = null;
    try {
      createdRecord = await prisma.subscriptionRequest.create({
        data: {
          requestNumber,
          schoolName: cleanSchoolName,
          npsn: cleanNpsn,
          schoolLevel: schoolLevel || "SMA/MA",
          schoolType: schoolType || "Swasta",
          province,
          city,
          address,
          subdomain: cleanSubdomain,
          picName: cleanPicName,
          picRole: picRole || "Kepala Sekolah",
          picEmail: cleanEmail,
          picPhone: cleanPhone,
          studentCount: numStudents,
          studentEstimate: studentEstimate || "200 - 500",
          planInterest: planInterest || "pro",
          selectedModules: Array.isArray(selectedModules) ? selectedModules : [],
          notes: notes || "",
          preferredTime: preferredTime || "",
          status: "PENDING",
        },
      });
    } catch (dbErr: any) {
      console.warn("Prisma subscriptionRequest create fallback to memory/json:", dbErr);
      createdRecord = {
        id: "req-" + Date.now(),
        requestNumber,
        schoolName: cleanSchoolName,
        npsn: cleanNpsn,
        schoolLevel: schoolLevel || "SMA/MA",
        schoolType: schoolType || "Swasta",
        province,
        city,
        address,
        subdomain: cleanSubdomain,
        picName: cleanPicName,
        picRole: picRole || "Kepala Sekolah",
        picEmail: cleanEmail,
        picPhone: cleanPhone,
        studentCount: numStudents,
        studentEstimate: studentEstimate || "200 - 500",
        planInterest: planInterest || "pro",
        selectedModules: Array.isArray(selectedModules) ? selectedModules : [],
        notes: notes || "",
        preferredTime: preferredTime || "",
        status: "PENDING",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // Always backup to JSON file store
    saveToBackup(createdRecord);

    return NextResponse.json({
      success: true,
      message: `Permintaan berlangganan untuk ${cleanSchoolName} berhasil dikirim! Tim Quick Schools akan segera menghubungi Anda.`,
      request: createdRecord,
    });
  } catch (error: any) {
    console.error("POST /api/subscription-requests error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

