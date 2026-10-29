import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const BACKUP_FILE = path.join(DATA_DIR, "saas-customers.json");

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
    const existingIndex = all.findIndex((item) => item.id === entry.id || item.customerCode === entry.customerCode);
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

// GET /api/saas-customers - List customers
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
      whereClause.plan = plan;
    }

    if (search) {
      whereClause.OR = [
        { schoolName: { contains: search, mode: "insensitive" } },
        { customerCode: { contains: search, mode: "insensitive" } },
        { npsn: { contains: search, mode: "insensitive" } },
        { picName: { contains: search, mode: "insensitive" } },
        { picEmail: { contains: search, mode: "insensitive" } },
        { picPhone: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
      ];
    }

    let customers = await prisma.saaSCustomer.findMany({
      where: whereClause,
      include: {
        subscriptionRequest: {
          select: {
            requestNumber: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Fallback to backup if empty and no filters
    if (customers.length === 0 && !search && (!status || status === "ALL") && (!plan || plan === "ALL")) {
      customers = readBackup();
    }

    // Compute aggregated KPI stats
    const allCustomers = await prisma.saaSCustomer.findMany({
      select: {
        status: true,
        plan: true,
        priceAmount: true,
        currentStudents: true,
      },
    });

    const stats = {
      total: allCustomers.length,
      active: allCustomers.filter((c) => c.status === "AKTIF").length,
      trial: allCustomers.filter((c) => c.status === "TRIAL").length,
      suspended: allCustomers.filter((c) => c.status === "SUSPENDED").length,
      nonaktif: allCustomers.filter((c) => c.status === "NONAKTIF").length,
      totalStudents: allCustomers.reduce((acc, c) => acc + (c.currentStudents || 0), 0),
      estimatedRevenue: allCustomers
        .filter((c) => c.status === "AKTIF")
        .reduce((acc, c) => acc + (c.priceAmount || 0), 0),
    };

    return NextResponse.json({
      success: true,
      customers,
      stats,
    });
  } catch (err: any) {
    console.error("GET /api/saas-customers error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal mengambil data pelanggan SaaS" },
      { status: 500 }
    );
  }
}

// POST /api/saas-customers - Create new customer
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.schoolName?.trim()) {
      return NextResponse.json(
        { success: false, error: "Nama sekolah wajib diisi" },
        { status: 400 }
      );
    }
    if (!body.picName?.trim()) {
      return NextResponse.json(
        { success: false, error: "Nama penanggung jawab (PIC) wajib diisi" },
        { status: 400 }
      );
    }
    if (!body.picEmail?.trim()) {
      return NextResponse.json(
        { success: false, error: "Email penanggung jawab wajib diisi" },
        { status: 400 }
      );
    }
    if (!body.picPhone?.trim()) {
      return NextResponse.json(
        { success: false, error: "Nomor WhatsApp penanggung jawab wajib diisi" },
        { status: 400 }
      );
    }

    // Generate unique customerCode: e.g. "CUST-2026-XXXX"
    const year = new Date().getFullYear();
    const count = await prisma.saaSCustomer.count();
    const customerCode = `CUST-${year}-${String(count + 1).padStart(3, "0")}`;

    // Subdomain formatting
    const rawSubdomain = (body.subdomain || body.schoolName)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 20);

    const newCustomer = await prisma.saaSCustomer.create({
      data: {
        customerCode,
        schoolName: body.schoolName.trim(),
        npsn: body.npsn?.trim() || null,
        subdomain: rawSubdomain || customerCode.toLowerCase(),
        schoolLevel: body.schoolLevel || "SMA/MA",
        schoolType: body.schoolType || "Swasta",
        address: body.address?.trim() || null,
        city: body.city?.trim() || null,
        province: body.province?.trim() || null,
        logoUrl: body.logoUrl || null,
        picName: body.picName.trim(),
        picRole: body.picRole?.trim() || "Kepala Sekolah",
        picEmail: body.picEmail.trim().toLowerCase(),
        picPhone: body.picPhone.trim(),
        plan: body.plan || "pro",
        status: body.status || "AKTIF",
        billingCycle: body.billingCycle || "MONTHLY",
        priceAmount: typeof body.priceAmount === "number" ? body.priceAmount : 199000,
        maxStudents: typeof body.maxStudents === "number" ? body.maxStudents : 1000,
        currentStudents: typeof body.currentStudents === "number" ? body.currentStudents : 0,
        activeModules: Array.isArray(body.activeModules) ? body.activeModules : ["mod_presensi", "mod_keuangan", "mod_rapor"],
        subscriptionStart: body.subscriptionStart ? new Date(body.subscriptionStart) : new Date(),
        subscriptionEnd: body.subscriptionEnd ? new Date(body.subscriptionEnd) : null,
        notes: body.notes?.trim() || null,
        subscriptionRequestId: body.subscriptionRequestId || null,
      },
      include: {
        subscriptionRequest: true,
      },
    });

    saveToBackup(newCustomer);

    // If originated from subscription request, update that request to APPROVED
    if (body.subscriptionRequestId) {
      await prisma.subscriptionRequest.update({
        where: { id: body.subscriptionRequestId },
        data: {
          status: "APPROVED",
          followUpNotes: `Telah dikonversi menjadi Pelanggan Aktif (${customerCode})`,
        },
      }).catch((e) => console.warn("Could not sync subscriptionRequest status:", e));
    }

    return NextResponse.json({
      success: true,
      customer: newCustomer,
      message: `Pelanggan ${newCustomer.schoolName} berhasil didaftarkan.`,
    });
  } catch (err: any) {
    console.error("POST /api/saas-customers error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal membuat data pelanggan baru" },
      { status: 500 }
    );
  }
}

