import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/saas-packages/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const pkg = await prisma.saaSPackage.findUnique({
      where: { id },
    });

    if (!pkg) {
      return NextResponse.json(
        { success: false, error: "Paket tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: pkg });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Gagal memuat paket" },
      { status: 500 }
    );
  }
}

// PATCH /api/saas-packages/[id] - Update package
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();

    const existing = await prisma.saaSPackage.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Paket tidak ditemukan" },
        { status: 404 }
      );
    }

    const {
      name,
      tagline,
      badge,
      priceMonthly,
      priceYearly,
      maxStudents,
      features,
      isActive,
      isPopular,
      sortOrder,
      performedBy = "SaaS Administrator",
    } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (tagline !== undefined) updateData.tagline = tagline?.trim() || null;
    if (badge !== undefined) updateData.badge = badge?.trim() || null;
    if (priceMonthly !== undefined) updateData.priceMonthly = Number(priceMonthly);
    if (priceYearly !== undefined) updateData.priceYearly = Number(priceYearly);
    if (maxStudents !== undefined) updateData.maxStudents = Number(maxStudents);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (isPopular !== undefined) updateData.isPopular = Boolean(isPopular);
    if (sortOrder !== undefined) updateData.sortOrder = Number(sortOrder);

    if (features !== undefined) {
      updateData.features = Array.isArray(features)
        ? features.filter((f) => Boolean(f && f.trim()))
        : String(features || "")
            .split("\n")
            .map((f) => f.trim())
            .filter(Boolean);
    }

    const updated = await prisma.saaSPackage.update({
      where: { id },
      data: updateData,
    });

    // Audit log
    try {
      await prisma.saaSOperationLog.create({
        data: {
          action: "PACKAGE_UPDATED",
          entityType: "PACKAGE",
          entityId: updated.id,
          entityName: updated.name,
          description: `Memperbarui paket layanan '${updated.name}'`,
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
      message: "Paket layanan berhasil diperbarui",
    });
  } catch (error: any) {
    console.error("PATCH /api/saas-packages/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal memperbarui paket" },
      { status: 500 }
    );
  }
}

// DELETE /api/saas-packages/[id] - Delete package
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(req.url);
    const performedBy = searchParams.get("performedBy") || "SaaS Administrator";

    const existing = await prisma.saaSPackage.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Paket tidak ditemukan" },
        { status: 404 }
      );
    }

    await prisma.saaSPackage.delete({
      where: { id },
    });

    // Audit log
    try {
      await prisma.saaSOperationLog.create({
        data: {
          action: "PACKAGE_DELETED",
          entityType: "PACKAGE",
          entityId: id,
          entityName: existing.name,
          description: `Menghapus paket layanan '${existing.name}' (${existing.code})`,
          performedBy,
        },
      });
    } catch (logErr) {
      console.warn("Log creation error:", logErr);
    }

    return NextResponse.json({
      success: true,
      message: "Paket layanan berhasil dihapus",
    });
  } catch (error: any) {
    console.error("DELETE /api/saas-packages/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal menghapus paket" },
      { status: 500 }
    );
  }
}
