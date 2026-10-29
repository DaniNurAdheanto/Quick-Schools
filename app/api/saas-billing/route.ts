import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const BACKUP_FILE = path.join(DATA_DIR, "saas-billing.json");

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
    const existingIndex = all.findIndex((item) => item.id === entry.id || item.invoiceNumber === entry.invoiceNumber);
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

// Generate unique invoice number: INV-SAAS-2026-XXXX
async function generateInvoiceNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");
  const prefix = `INV-SAAS-${currentYear}${currentMonth}`;

  try {
    const count = await prisma.saaSInvoice.count();
    const seq = String(count + 1).padStart(4, "0");
    return `${prefix}-${seq}`;
  } catch {
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${random}`;
  }
}

// GET /api/saas-billing - List invoices with filters and stats
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const customerId = searchParams.get("customerId");
    const search = searchParams.get("search")?.toLowerCase().trim();

    let whereClause: any = {};

    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    if (customerId) {
      whereClause.customerId = customerId;
    }

    if (search) {
      whereClause.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { schoolName: { contains: search, mode: "insensitive" } },
        { plan: { contains: search, mode: "insensitive" } },
        { customer: { picName: { contains: search, mode: "insensitive" } } },
        { customer: { picEmail: { contains: search, mode: "insensitive" } } },
      ];
    }

    let invoices: any[] = [];
    try {
      invoices = await prisma.saaSInvoice.findMany({
        where: whereClause,
        include: {
          customer: {
            select: {
              id: true,
              customerCode: true,
              schoolName: true,
              schoolLevel: true,
              picName: true,
              picEmail: true,
              picPhone: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (err) {
      console.warn("Prisma saaSInvoice query error, using fallback:", err);
      invoices = readBackup();
    }

    // Auto-update overdue invoices if past dueDate and status is UNPAID
    const now = new Date();
    for (const inv of invoices) {
      if (inv.status === "UNPAID" && new Date(inv.dueDate) < now) {
        try {
          await prisma.saaSInvoice.update({
            where: { id: inv.id },
            data: { status: "OVERDUE" },
          });
          inv.status = "OVERDUE";
        } catch {}
      }
    }

    // Compute aggregated stats
    const allInvoices = await prisma.saaSInvoice.findMany({
      select: {
        status: true,
        amount: true,
      },
    });

    const totalInvoices = allInvoices.length;
    const paidInvoices = allInvoices.filter((i) => i.status === "PAID");
    const unpaidInvoices = allInvoices.filter((i) => i.status === "UNPAID");
    const overdueInvoices = allInvoices.filter((i) => i.status === "OVERDUE");
    const cancelledInvoices = allInvoices.filter((i) => i.status === "CANCELLED");

    const totalPaidAmount = paidInvoices.reduce((sum, i) => sum + i.amount, 0);
    const totalUnpaidAmount = unpaidInvoices.reduce((sum, i) => sum + i.amount, 0);
    const totalOverdueAmount = overdueInvoices.reduce((sum, i) => sum + i.amount, 0);

    return NextResponse.json({
      success: true,
      data: invoices,
      stats: {
        totalInvoices,
        countPaid: paidInvoices.length,
        countUnpaid: unpaidInvoices.length,
        countOverdue: overdueInvoices.length,
        countCancelled: cancelledInvoices.length,
        totalPaidAmount,
        totalUnpaidAmount,
        totalOverdueAmount,
      },
    });
  } catch (error: any) {
    console.error("GET /api/saas-billing error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal memuat tagihan langganan" },
      { status: 500 }
    );
  }
}

// POST /api/saas-billing - Create a new invoice
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customerId,
      schoolName,
      plan,
      amount,
      billingCycle = "MONTHLY",
      dueDate,
      notes,
      performedBy = "SaaS Administrator",
    } = body;

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: "Pelanggan sekolah wajib dipilih" },
        { status: 400 }
      );
    }

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json(
        { success: false, error: "Nominal tagihan harus lebih besar dari 0" },
        { status: 400 }
      );
    }

    // Fetch customer details
    const customer = await prisma.saaSCustomer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Data pelanggan sekolah tidak ditemukan" },
        { status: 404 }
      );
    }

    const invoiceNumber = await generateInvoiceNumber();

    const parsedDueDate = dueDate
      ? new Date(dueDate)
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days default

    const invoice = await prisma.saaSInvoice.create({
      data: {
        invoiceNumber,
        customerId: customer.id,
        schoolName: schoolName?.trim() || customer.schoolName,
        plan: plan?.toLowerCase().trim() || customer.plan,
        amount: Number(amount),
        billingCycle: billingCycle.toUpperCase(),
        status: "UNPAID",
        dueDate: parsedDueDate,
        notes: notes?.trim() || null,
      },
      include: {
        customer: true,
      },
    });

    saveToBackup(invoice);

    // Audit log
    try {
      await prisma.saaSOperationLog.create({
        data: {
          action: "INVOICE_CREATED",
          entityType: "INVOICE",
          entityId: invoice.id,
          entityName: invoice.invoiceNumber,
          description: `Menerbitkan tagihan baru ${invoice.invoiceNumber} untuk sekolah ${invoice.schoolName} sebesar Rp ${Number(amount).toLocaleString("id-ID")}`,
          performedBy,
          metadata: {
            invoiceNumber,
            schoolName: invoice.schoolName,
            amount,
            billingCycle,
          },
        },
      });
    } catch (logErr) {
      console.warn("Log creation error:", logErr);
    }

    return NextResponse.json({
      success: true,
      data: invoice,
      message: `Tagihan ${invoice.invoiceNumber} berhasil diterbitkan`,
    });
  } catch (error: any) {
    console.error("POST /api/saas-billing error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal menerbitkan tagihan" },
      { status: 500 }
    );
  }
}

