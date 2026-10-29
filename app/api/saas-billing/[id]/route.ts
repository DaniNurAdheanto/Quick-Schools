import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/saas-billing/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const invoice = await prisma.saaSInvoice.findUnique({
      where: { id },
      include: {
        customer: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "Tagihan tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: invoice });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Gagal memuat detail tagihan" },
      { status: 500 }
    );
  }
}

// PATCH /api/saas-billing/[id] - Update invoice or verify payment
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();

    const existing = await prisma.saaSInvoice.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Tagihan tidak ditemukan" },
        { status: 404 }
      );
    }

    const {
      status,
      paymentMethod,
      paymentProof,
      notes,
      dueDate,
      paidAt,
      performedBy = "SaaS Administrator",
    } = body;

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (paymentProof !== undefined) updateData.paymentProof = paymentProof;
    if (notes !== undefined) updateData.notes = notes;
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);

    // If marked as PAID
    if (status === "PAID") {
      updateData.paidAt = paidAt ? new Date(paidAt) : new Date();
      if (!updateData.paymentMethod && !existing.paymentMethod) {
        updateData.paymentMethod = "TRANSFER_BANK";
      }

      // Automatically extend customer's active subscription period & ensure status is AKTIF
      try {
        const currentEnd = existing.customer.subscriptionEnd
          ? new Date(existing.customer.subscriptionEnd)
          : new Date();
        const baseDate = currentEnd > new Date() ? currentEnd : new Date();

        const newEnd = new Date(baseDate);
        if (existing.billingCycle === "YEARLY") {
          newEnd.setFullYear(newEnd.getFullYear() + 1);
        } else {
          newEnd.setMonth(newEnd.getMonth() + 1);
        }

        await prisma.saaSCustomer.update({
          where: { id: existing.customerId },
          data: {
            status: "AKTIF",
            subscriptionEnd: newEnd,
          },
        });
      } catch (custErr) {
        console.warn("Could not auto-extend customer subscription end date:", custErr);
      }
    } else if (status === "UNPAID" || status === "OVERDUE") {
      if (paidAt === null) {
        updateData.paidAt = null;
      }
    }

    const updated = await prisma.saaSInvoice.update({
      where: { id },
      data: updateData,
      include: { customer: true },
    });

    // Audit log
    try {
      await prisma.saaSOperationLog.create({
        data: {
          action: status === "PAID" ? "INVOICE_PAID" : "INVOICE_UPDATED",
          entityType: "INVOICE",
          entityId: updated.id,
          entityName: updated.invoiceNumber,
          description: status === "PAID" 
            ? `Verifikasi pembayaran lunas tagihan ${updated.invoiceNumber} (${updated.schoolName}) via ${updated.paymentMethod || 'Transfer'}`
            : `Pembaruan tagihan ${updated.invoiceNumber} status: ${updated.status}`,
          performedBy,
          metadata: updateData,
        },
      });
    } catch (logErr) {
      console.warn("Log creation error:", logErr);
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: status === "PAID" 
        ? `Pembayaran tagihan ${updated.invoiceNumber} berhasil diverifikasi (LUNAS)`
        : `Tagihan ${updated.invoiceNumber} berhasil diperbarui`,
    });
  } catch (error: any) {
    console.error("PATCH /api/saas-billing/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal memperbarui tagihan" },
      { status: 500 }
    );
  }
}

// DELETE /api/saas-billing/[id] - Delete invoice
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(req.url);
    const performedBy = searchParams.get("performedBy") || "SaaS Administrator";

    const existing = await prisma.saaSInvoice.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Tagihan tidak ditemukan" },
        { status: 404 }
      );
    }

    await prisma.saaSInvoice.delete({
      where: { id },
    });

    // Audit log
    try {
      await prisma.saaSOperationLog.create({
        data: {
          action: "INVOICE_DELETED",
          entityType: "INVOICE",
          entityId: id,
          entityName: existing.invoiceNumber,
          description: `Menghapus tagihan ${existing.invoiceNumber} untuk ${existing.schoolName}`,
          performedBy,
        },
      });
    } catch (logErr) {
      console.warn("Log creation error:", logErr);
    }

    return NextResponse.json({
      success: true,
      message: `Tagihan ${existing.invoiceNumber} berhasil dihapus`,
    });
  } catch (error: any) {
    console.error("DELETE /api/saas-billing/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal menghapus tagihan" },
      { status: 500 }
    );
  }
}
