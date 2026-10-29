import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const BACKUP_FILE = path.join(DATA_DIR, "saas-packages.json");

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
    const existingIndex = all.findIndex((item) => item.id === entry.id || item.code === entry.code);
    if (existingIndex >= 0) {
      all[existingIndex] = { ...all[existingIndex], ...entry };
    } else {
      all.push(entry);
    }
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(all, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not write to JSON backup:", err);
  }
}

// GET /api/saas-packages - Get all SaaS service packages
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    let whereClause: any = {};
    if (activeOnly) {
      whereClause.isActive = true;
    }

    let packages: any[] = [];
    try {
      packages = await prisma.saaSPackage.findMany({
        where: whereClause,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
    } catch (err) {
      console.warn("Error fetching packages from Prisma, using fallback:", err);
      packages = readBackup();
      if (activeOnly) {
        packages = packages.filter((p) => p.isActive);
      }
    }

    // If database was empty, populate from default seed
    if (packages.length === 0) {
      const defaultPackages = [
        {
          code: "trial",
          name: "Uji Coba Gratis (Trial)",
          tagline: "Eksplorasi fitur lengkap selama 14 hari tanpa biaya",
          badge: "14 Hari Gratis",
          priceMonthly: 0,
          priceYearly: 0,
          maxStudents: 150,
          features: [
            "Akses Semua Fitur Utama",
            "Maksimal 150 Siswa",
            "Presensi Guru & Siswa QR/GPS",
            "E-Rapor Kurikulum Merdeka",
            "Bantuan Onboarding Dasar",
            "Masa Aktif 14 Hari Kalender"
          ],
          isActive: true,
          isPopular: false,
          sortOrder: 1,
        },
        {
          code: "standard",
          name: "Sekolah Rintisan (Standard)",
          tagline: "Solusi terjangkau untuk sekolah dasar & menengah berkembang",
          badge: "Hemat & Efisien",
          priceMonthly: 750000,
          priceYearly: 7500000,
          maxStudents: 350,
          features: [
            "Kapasitas hingga 350 Siswa",
            "Absensi Face Recognition AI & Geofencing",
            "Jadwal & Mata Pelajaran Tak Terbatas",
            "E-Rapor Digital & Cetak PDF Resmi",
            "Notifikasi WhatsApp Gateway Dasar",
            "Dukungan Email & Jam Kerja"
          ],
          isActive: true,
          isPopular: false,
          sortOrder: 2,
        },
        {
          code: "pro",
          name: "Sekolah Unggulan (Pro)",
          tagline: "Otomasi lengkap manajemen akademik & keuangan sekolah modern",
          badge: "Paling Populer",
          priceMonthly: 1500000,
          priceYearly: 15000000,
          maxStudents: 800,
          features: [
            "Kapasitas hingga 800 Siswa",
            "Semua Fitur Standard",
            "Pembayaran SPP & Tagihan Online (VA/QRIS)",
            "Portal Khusus Orang Tua & Siswa Real-time",
            "WhatsApp Notifikasi Tagihan Otomatis",
            "Prioritas Dukungan Teknis 24/7",
            "Dedicated Account Manager"
          ],
          isActive: true,
          isPopular: true,
          sortOrder: 3,
        },
        {
          code: "enterprise",
          name: "Yayasan / Multi-Kampus (Enterprise)",
          tagline: "Skalabilitas tanpa batas untuk jaringan yayasan & sekolah besar",
          badge: "Skala Yayasan",
          priceMonthly: 3000000,
          priceYearly: 30000000,
          maxStudents: 2500,
          features: [
            "Kapasitas 2500+ Siswa (Multi-Unit)",
            "Multi-Tenant Yayasan Terpusat",
            "Custom Domain (sekolah.sch.id)",
            "Integrasi API & Webhook Kustom",
            "SLA Uptime 99.9% Bergaransi",
            "Pelatihan Onsite & Pelatihan Rutin Staf",
            "Migrasi Database Lengkap dari Sistem Lama"
          ],
          isActive: true,
          isPopular: false,
          sortOrder: 4,
        },
      ];

      try {
        for (const dp of defaultPackages) {
          const created = await prisma.saaSPackage.upsert({
            where: { code: dp.code },
            update: dp,
            create: dp,
          });
          packages.push(created);
          saveToBackup(created);
        }
      } catch (upsertErr) {
        console.warn("Could not upsert default packages into DB:", upsertErr);
        packages = defaultPackages.map((dp, idx) => ({ ...dp, id: `pkg-${idx + 1}` }));
      }
    }

    return NextResponse.json({
      success: true,
      data: packages,
      total: packages.length,
    });
  } catch (error: any) {
    console.error("GET /api/saas-packages error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal memuat paket layanan" },
      { status: 500 }
    );
  }
}

// POST /api/saas-packages - Create a new package
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      code,
      name,
      tagline,
      badge,
      priceMonthly = 0,
      priceYearly = 0,
      maxStudents = 500,
      features = [],
      isActive = true,
      isPopular = false,
      sortOrder = 0,
      performedBy = "SaaS Administrator",
    } = body;

    if (!code || !name) {
      return NextResponse.json(
        { success: false, error: "Kode dan Nama Paket wajib diisi" },
        { status: 400 }
      );
    }

    const cleanCode = code.toLowerCase().trim().replace(/[^a-z0-9_-]/g, "");

    // Check code uniqueness
    const existing = await prisma.saaSPackage.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Kode paket '${cleanCode}' sudah digunakan` },
        { status: 400 }
      );
    }

    // Format features array
    const featuresArray = Array.isArray(features)
      ? features.filter((f) => Boolean(f && f.trim()))
      : String(features || "")
          .split("\n")
          .map((f) => f.trim())
          .filter(Boolean);

    const createdPackage = await prisma.saaSPackage.create({
      data: {
        code: cleanCode,
        name: name.trim(),
        tagline: tagline?.trim() || null,
        badge: badge?.trim() || null,
        priceMonthly: Number(priceMonthly) || 0,
        priceYearly: Number(priceYearly) || 0,
        maxStudents: Number(maxStudents) || 500,
        features: featuresArray,
        isActive: Boolean(isActive),
        isPopular: Boolean(isPopular),
        sortOrder: Number(sortOrder) || 0,
      },
    });

    saveToBackup(createdPackage);

    // Audit log
    try {
      await prisma.saaSOperationLog.create({
        data: {
          action: "PACKAGE_CREATED",
          entityType: "PACKAGE",
          entityId: createdPackage.id,
          entityName: createdPackage.name,
          description: `Membuat paket layanan baru '${createdPackage.name}' (${createdPackage.code})`,
          performedBy,
          metadata: {
            code: cleanCode,
            priceMonthly,
            priceYearly,
            maxStudents,
          },
        },
      });
    } catch (logErr) {
      console.warn("Log creation error:", logErr);
    }

    return NextResponse.json({
      success: true,
      data: createdPackage,
      message: "Paket layanan berhasil dibuat",
    });
  } catch (error: any) {
    console.error("POST /api/saas-packages error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal membuat paket layanan" },
      { status: 500 }
    );
  }
}

