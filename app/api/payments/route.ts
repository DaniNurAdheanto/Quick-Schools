import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isStudentRole, isTeacherRole, isKepalaSekolahRole } from "@/lib/roles-config";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = (searchParams.get("role") || "").toLowerCase();
    const uid = searchParams.get("uid") || "";
    const email = (searchParams.get("email") || "").toLowerCase();
    const homeroomClass = searchParams.get("homeroomClass") || "";

    const payments = await prisma.payment.findMany({
      include: {
        student: {
          include: {
            class: true,
            user: { select: { email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedBills = payments.map((p) => ({
      id: p.id,
      invoiceNumber: p.invoiceNumber,
      title: p.title,
      amount: p.amount,
      status: p.status === "LUNAS" ? "Lunas" : p.status === "PENDING" ? "Menunggu Verifikasi" : "Belum Bayar",
      dueDate: p.dueDate ? p.dueDate.toISOString().split("T")[0] : null,
      paidAt: p.paidAt ? p.paidAt.toISOString() : null,
      paymentMethod: p.paymentMethod || null,
      receiptUrl: p.receiptUrl || null,
      studentId: p.studentId,
      studentName: p.student.fullName,
      studentEmail: p.student.user?.email || "",
      nisn: p.student.nisn,
      classId: p.student.class?.name || "",
      className: p.student.class?.name || "",
    }));

    if (isStudentRole(role)) {
      const scopedBills = formattedBills.filter(
        (b) => b.studentId === uid || (email && b.studentEmail?.toLowerCase() === email)
      );
      return NextResponse.json({ success: true, role: "siswa", readOnly: true, bills: scopedBills });
    }

    if (isTeacherRole(role)) {
      if (!homeroomClass) {
        return NextResponse.json({ success: true, role: "guru", readOnly: true, homeroomClass: "", bills: [] });
      }
      const normalizedHomeroom = homeroomClass.trim().toLowerCase();
      const scopedBills = formattedBills.filter(
        (b) => b.className.trim().toLowerCase() === normalizedHomeroom
      );
      return NextResponse.json({ success: true, role: "guru", readOnly: true, homeroomClass, bills: scopedBills });
    }

    if (isKepalaSekolahRole(role)) {
      return NextResponse.json({ success: true, role: "kepala-sekolah", readOnly: true, bills: formattedBills });
    }

    return NextResponse.json({ success: true, role: "admin", readOnly: false, bills: formattedBills });
  } catch (error: any) {
    console.error("GET /api/payments error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, payload, role = "" } = body;

    if (isStudentRole(role)) {
      return NextResponse.json(
        { success: false, error: "Akses Ditolak: Siswa tidak memiliki izin." },
        { status: 403 }
      );
    }

    if (action === "create_bill") {
      const invoiceNumber = payload.invoiceNumber || `INV-${Date.now()}`;
      const created = await prisma.payment.create({
        data: {
          invoiceNumber,
          title: payload.title || "Tagihan SPP",
          amount: Number(payload.amount || 0),
          status: payload.status === "Lunas" ? "LUNAS" : "BELUM_BAYAR",
          dueDate: payload.dueDate ? new Date(payload.dueDate) : undefined,
          studentId: payload.studentId,
          paymentMethod: payload.paymentMethod,
        },
      });
      return NextResponse.json({ success: true, bill: created });
    }

    if (action === "record_payment") {
      const updated = await prisma.payment.update({
        where: { id: payload.billId },
        data: {
          status: "LUNAS",
          paidAt: new Date(),
          paymentMethod: payload.paymentMethod || "Transfer Bank",
          receiptUrl: payload.receiptUrl,
        },
      });
      return NextResponse.json({ success: true, bill: updated });
    }

    if (action === "delete_bill") {
      await prisma.payment.delete({
        where: { id: payload.billId },
      });
      return NextResponse.json({ success: true, message: "Tagihan dihapus" });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/payments error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
