import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "face-biometrics.json");

function ensureFileExists() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(FILE_PATH)) {
    fs.writeFileSync(FILE_PATH, JSON.stringify({}), "utf-8");
  }
}

function readAllBiometrics(): Record<string, any> {
  ensureFileExists();
  try {
    const raw = fs.readFileSync(FILE_PATH, "utf-8");
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

function writeAllBiometrics(data: Record<string, any>) {
  ensureFileExists();
  fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

// GET /api/biometrics?id=... (supports user ID, NISN, or NIP)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const searchId = (searchParams.get("id") || "").trim();

    if (!searchId) {
      return NextResponse.json({ success: false, error: "ID query parameter required" }, { status: 400 });
    }

    const all = readAllBiometrics();

    // 1. Direct match
    if (all[searchId]) {
      return NextResponse.json({ success: true, biometric: all[searchId] });
    }

    // 2. Scan entries for studentId or nip or userName or userId
    for (const key of Object.keys(all)) {
      const item = all[key];
      if (
        item &&
        (item.studentId === searchId ||
         item.nip === searchId ||
         item.userId === searchId ||
         item.uid === searchId ||
         item.id === searchId ||
         (item.userName && item.userName.toLowerCase() === searchId.toLowerCase()))
      ) {
        return NextResponse.json({ success: true, biometric: item });
      }
    }

    return NextResponse.json({ success: false, biometric: null });
  } catch (err: any) {
    console.error("GET /api/biometrics error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST /api/biometrics - Save or update face biometric
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, studentId, nip, biometric } = body;

    const effectiveId = id || studentId || nip || biometric?.studentId || biometric?.nip;
    if (!effectiveId) {
      return NextResponse.json({ success: false, error: "Identifier (id/studentId/nip) required" }, { status: 400 });
    }

    const payload = biometric || body;
    const all = readAllBiometrics();

    // Index under all known identifiers
    const keysToStore = Array.from(new Set([
      id,
      effectiveId,
      studentId,
      nip,
      payload.studentId,
      payload.nip,
      payload.uid,
    ].filter(Boolean))) as string[];

    for (const k of keysToStore) {
      all[k] = payload;
    }

    writeAllBiometrics(all);

    return NextResponse.json({ success: true, message: "Face biometric saved successfully" });
  } catch (err: any) {
    console.error("POST /api/biometrics error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/biometrics?id=...
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const searchId = (searchParams.get("id") || "").trim();

    if (!searchId) {
      return NextResponse.json({ success: false, error: "ID query parameter required" }, { status: 400 });
    }

    const all = readAllBiometrics();
    let deletedCount = 0;

    for (const key of Object.keys(all)) {
      const item = all[key];
      if (
        key === searchId ||
        item?.studentId === searchId ||
        item?.nip === searchId ||
        item?.userId === searchId ||
        item?.uid === searchId
      ) {
        delete all[key];
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      writeAllBiometrics(all);
    }

    return NextResponse.json({ success: true, deleted: deletedCount });
  } catch (err: any) {
    console.error("DELETE /api/biometrics error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
