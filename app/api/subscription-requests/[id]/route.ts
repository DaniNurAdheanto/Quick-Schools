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

function updateBackupItem(id: string, patch: any) {
  ensureBackupFile();
  try {
    const raw = fs.readFileSync(BACKUP_FILE, "utf-8");
    const all = JSON.parse(raw || "[]");
    const idx = all.findIndex((r: any) => r.id === id || r.requestNumber === id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...patch, updatedAt: new Date().toISOString() };
      fs.writeFileSync(BACKUP_FILE, JSON.stringify(all, null, 2), "utf-8");
    }
  } catch (err) {
    console.warn("Could not update backup item:", err);
  }
}

function deleteBackupItem(id: string) {
  ensureBackupFile();
  try {
    const raw = fs.readFileSync(BACKUP_FILE, "utf-8");
    const all = JSON.parse(raw || "[]");
    const filtered = all.filter((r: any) => r.id !== id && r.requestNumber !== id);
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(filtered, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not delete backup item:", err);
  }
}

// GET /api/subscription-requests/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await prisma.subscriptionRequest.findFirst({
      where: {
        OR: [{ id }, { requestNumber: id }],
      },
    });

    if (!item) {
      return NextResponse.json({ success: false, error: "Permintaan tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: item });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH /api/subscription-requests/[id] - Update status, follow up notes, assigned sales, price quotation
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      status,
      followUpNotes,
      assignedTo,
      quotedPrice,
      contactedAt,
      notes,
    } = body;

    const dataToUpdate: any = {};
    if (status !== undefined) dataToUpdate.status = status;
    if (followUpNotes !== undefined) dataToUpdate.followUpNotes = followUpNotes;
    if (assignedTo !== undefined) dataToUpdate.assignedTo = assignedTo;
    if (quotedPrice !== undefined) dataToUpdate.quotedPrice = quotedPrice ? Number(quotedPrice) : null;
    if (contactedAt !== undefined) dataToUpdate.contactedAt = contactedAt ? new Date(contactedAt) : new Date();
    if (notes !== undefined) dataToUpdate.notes = notes;

    let updated = null;
    try {
      updated = await prisma.subscriptionRequest.update({
        where: { id },
        data: dataToUpdate,
      });
    } catch (dbErr) {
      // try matching by requestNumber
      try {
        updated = await prisma.subscriptionRequest.update({
          where: { requestNumber: id },
          data: dataToUpdate,
        });
      } catch (e) {
        console.warn("Prisma update fallback to json store:", e);
      }
    }

    updateBackupItem(id, dataToUpdate);

    return NextResponse.json({
      success: true,
      message: "Data tindak lanjut permintaan berhasil diperbarui.",
      data: updated,
    });
  } catch (error: any) {
    console.error("PATCH /api/subscription-requests/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/subscription-requests/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    try {
      await prisma.subscriptionRequest.delete({
        where: { id },
      });
    } catch {
      try {
        await prisma.subscriptionRequest.delete({
          where: { requestNumber: id },
        });
      } catch (e) {
        console.warn("Prisma delete notice:", e);
      }
    }

    deleteBackupItem(id);

    return NextResponse.json({
      success: true,
      message: "Permintaan berlangganan berhasil dihapus.",
    });
  } catch (error: any) {
    console.error("DELETE /api/subscription-requests/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
