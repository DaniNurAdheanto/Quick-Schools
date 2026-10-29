import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const BACKUP_FILE = path.join(DATA_DIR, "saas-customers.json");

function updateBackup(id: string, updatedData?: any, isDelete = false) {
  try {
    if (!fs.existsSync(BACKUP_FILE)) return;
    const raw = fs.readFileSync(BACKUP_FILE, "utf-8");
    let all = JSON.parse(raw || "[]");
    if (isDelete) {
      all = all.filter((item: any) => item.id !== id);
    } else if (updatedData) {
      const idx = all.findIndex((item: any) => item.id === id);
      if (idx >= 0) {
        all[idx] = { ...all[idx], ...updatedData };
      }
    }
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(all, null, 2), "utf-8");
  } catch (e) {
    console.warn("Could not sync to backup JSON:", e);
  }
}

// GET /api/saas-customers/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const customer = await prisma.saaSCustomer.findUnique({
      where: { id },
      include: {
        subscriptionRequest: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Pelanggan tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, customer });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Gagal mengambil data pelanggan" },
      { status: 500 }
    );
  }
}

// PATCH /api/saas-customers/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();

    const dataToUpdate: any = {};

    if (body.schoolName !== undefined) dataToUpdate.schoolName = body.schoolName.trim();
    if (body.npsn !== undefined) dataToUpdate.npsn = body.npsn?.trim() || null;
    if (body.subdomain !== undefined) dataToUpdate.subdomain = body.subdomain?.trim().toLowerCase();
    if (body.schoolLevel !== undefined) dataToUpdate.schoolLevel = body.schoolLevel;
    if (body.schoolType !== undefined) dataToUpdate.schoolType = body.schoolType;
    if (body.address !== undefined) dataToUpdate.address = body.address?.trim() || null;
    if (body.city !== undefined) dataToUpdate.city = body.city?.trim() || null;
    if (body.province !== undefined) dataToUpdate.province = body.province?.trim() || null;
    if (body.logoUrl !== undefined) dataToUpdate.logoUrl = body.logoUrl || null;

    if (body.picName !== undefined) dataToUpdate.picName = body.picName.trim();
    if (body.picRole !== undefined) dataToUpdate.picRole = body.picRole.trim();
    if (body.picEmail !== undefined) dataToUpdate.picEmail = body.picEmail.trim().toLowerCase();
    if (body.picPhone !== undefined) dataToUpdate.picPhone = body.picPhone.trim();

    if (body.plan !== undefined) dataToUpdate.plan = body.plan;
    if (body.status !== undefined) dataToUpdate.status = body.status;
    if (body.billingCycle !== undefined) dataToUpdate.billingCycle = body.billingCycle;
    if (body.priceAmount !== undefined) dataToUpdate.priceAmount = parseFloat(body.priceAmount);
    if (body.maxStudents !== undefined) dataToUpdate.maxStudents = parseInt(body.maxStudents, 10);
    if (body.currentStudents !== undefined) dataToUpdate.currentStudents = parseInt(body.currentStudents, 10);
    if (body.activeModules !== undefined) dataToUpdate.activeModules = body.activeModules;

    if (body.subscriptionStart !== undefined) {
      dataToUpdate.subscriptionStart = body.subscriptionStart ? new Date(body.subscriptionStart) : new Date();
    }
    if (body.subscriptionEnd !== undefined) {
      dataToUpdate.subscriptionEnd = body.subscriptionEnd ? new Date(body.subscriptionEnd) : null;
    }
    if (body.notes !== undefined) dataToUpdate.notes = body.notes?.trim() || null;

    const updated = await prisma.saaSCustomer.update({
      where: { id },
      data: dataToUpdate,
      include: {
        subscriptionRequest: true,
      },
    });

    updateBackup(id, updated);

    return NextResponse.json({
      success: true,
      customer: updated,
      message: `Data pelanggan ${updated.schoolName} berhasil diperbarui.`,
    });
  } catch (err: any) {
    console.error("PATCH /api/saas-customers/[id] error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memperbarui data pelanggan" },
      { status: 500 }
    );
  }
}

// DELETE /api/saas-customers/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const deleted = await prisma.saaSCustomer.delete({
      where: { id },
    });

    updateBackup(id, null, true);

    return NextResponse.json({
      success: true,
      message: `Pelanggan ${deleted.schoolName} (${deleted.customerCode}) berhasil dihapus.`,
    });
  } catch (err: any) {
    console.error("DELETE /api/saas-customers/[id] error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal menghapus data pelanggan" },
      { status: 500 }
    );
  }
}
