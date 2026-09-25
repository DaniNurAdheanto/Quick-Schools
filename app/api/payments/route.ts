import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { isStudentRole, isTeacherRole, isKepalaSekolahRole } from "@/lib/roles-config";

/**
 * Backend Route Handler for SPP Payments
 * Enforces role-based security on the server side:
 * - Siswa: Read-only, strictly scoped to student's own bills.
 * - Guru (Wali Kelas): Read-only, strictly scoped to students in their homeroom class.
 * - Kepala Sekolah: Read-only, full school monitoring across all classes.
 * - Admin / Super Admin: Full Read/Write CRUD access.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = (searchParams.get("role") || "").toLowerCase();
    const uid = searchParams.get("uid") || "";
    const email = (searchParams.get("email") || "").toLowerCase();
    const homeroomClass = searchParams.get("homeroomClass") || "";

    // 1. Fetch all bills from Firestore backend
    const billsDocRef = doc(db, "roles", "spp_bills");
    const snap = await getDoc(billsDocRef);
    const allBills: any[] = snap.exists() && Array.isArray(snap.data()?.bills) ? snap.data()?.bills : [];

    // 2. Enforce Backend Role Scoping
    if (isStudentRole(role)) {
      // Siswa can ONLY see their own bills
      const scopedBills = allBills.filter((b) => {
        return (
          b.studentId === uid ||
          (email && b.studentEmail?.toLowerCase() === email) ||
          b.nisn === searchParams.get("nisn")
        );
      });
      return NextResponse.json({
        success: true,
        role: "siswa",
        readOnly: true,
        bills: scopedBills,
      });
    }

    if (isTeacherRole(role)) {
      // Wali Kelas can ONLY see bills from their assigned homeroom class and is Read-Only
      if (!homeroomClass) {
        return NextResponse.json({
          success: true,
          role: "guru",
          readOnly: true,
          homeroomClass: "",
          message: "Guru belum ditugaskan sebagai Wali Kelas pada kelas tertentu.",
          bills: [],
        });
      }

      const normalizedHomeroom = homeroomClass.trim().toLowerCase();
      const scopedBills = allBills.filter((b) => {
        const billClass = (b.classId || "").trim().toLowerCase();
        return billClass === normalizedHomeroom || billClass.replace(/\s+/g, "") === normalizedHomeroom.replace(/\s+/g, "");
      });

      return NextResponse.json({
        success: true,
        role: "guru",
        readOnly: true,
        homeroomClass,
        bills: scopedBills,
      });
    }

    if (isKepalaSekolahRole(role)) {
      // Kepala Sekolah has full monitoring access to all bills across the entire school, marked as Read-Only
      return NextResponse.json({
        success: true,
        role: "kepala-sekolah",
        readOnly: true,
        bills: allBills,
      });
    }

    // Default: Admin / Super Admin
    return NextResponse.json({
      success: true,
      role: "admin",
      readOnly: false,
      bills: allBills,
    });
  } catch (error: any) {
    console.error("Backend SPP GET error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal mengambil data SPP di backend" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const role = (body.role || "").toLowerCase();

    // Strict Backend Permission Check
    if (isStudentRole(role)) {
      return NextResponse.json(
        {
          success: false,
          error: "Akses Ditolak (403): Siswa tidak memiliki izin untuk menerbitkan atau mengubah data SPP.",
        },
        { status: 403 }
      );
    }

    if (isTeacherRole(role)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Akses Ditolak (403): Wali Kelas hanya memiliki hak akses baca (Read-Only). Pencatatan pembayaran dan penerbitan tagihan hanya dapat dilakukan oleh Bendahara atau Administrator.",
        },
        { status: 403 }
      );
    }

    if (isKepalaSekolahRole(role)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Akses Ditolak (403): Kepala Sekolah memiliki hak akses pemantauan (Read-Only). Transaksi, pengubahan, atau penghapusan data pembayaran SPP hanya dapat dilakukan oleh Bendahara atau Administrator.",
        },
        { status: 403 }
      );
    }

    // Process action (create / bulk / pay)
    const { action, payload } = body;
    const billsDocRef = doc(db, "roles", "spp_bills");
    const snap = await getDoc(billsDocRef);
    const existingBills: any[] = snap.exists() && Array.isArray(snap.data()?.bills) ? snap.data()?.bills : [];

    let updatedBills = [...existingBills];

    if (action === "create_bill") {
      updatedBills = [payload, ...existingBills];
    } else if (action === "bulk_create") {
      updatedBills = [...payload, ...existingBills];
    } else if (action === "record_payment") {
      const idx = updatedBills.findIndex((b) => b.id === payload.billId);
      if (idx !== -1) {
        updatedBills[idx] = payload.updatedBill;
      }
    } else if (action === "update_bill") {
      const idx = updatedBills.findIndex((b) => b.id === payload.id);
      if (idx !== -1) {
        updatedBills[idx] = payload;
      }
    } else if (action === "delete_bill") {
      updatedBills = updatedBills.filter((b) => b.id !== payload.billId);
    }

    await setDoc(
      billsDocRef,
      {
        bills: updatedBills,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true, updatedCount: updatedBills.length });
  } catch (error: any) {
    console.error("Backend SPP POST error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal memproses transaksi SPP di backend" },
      { status: 500 }
    );
  }
}
