import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    let years = await prisma.academicYear.findMany({
      orderBy: { name: "desc" },
    });

    // Seed default if empty
    if (years.length === 0) {
      const defaultYear = await prisma.academicYear.create({
        data: {
          name: "2025/2026",
          semester: "Ganjil",
          isActive: true,
          isLocked: false,
          startDate: new Date("2025-07-14"),
          endDate: new Date("2026-06-20"),
        },
      });
      years = [defaultYear];
    }

    const formatted = years.map((y) => ({
      id: y.name.replace(/\//g, "-"),
      name: y.name,
      semester: y.semester as "Ganjil" | "Genap",
      isDefault: y.isActive,
      status: y.isActive ? ("Aktif" as const) : ("Arsip" as const),
      startDate: y.startDate ? y.startDate.toISOString().split("T")[0] : undefined,
      endDate: y.endDate ? y.endDate.toISOString().split("T")[0] : undefined,
    }));

    return NextResponse.json({ success: true, academicYears: formatted });
  } catch (error: any) {
    console.error("GET /api/academic-years error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, name, semester = "Ganjil", setAsActive = false, startDate, endDate } = body;

    if (action === "set_active") {
      // Deactivate all
      await prisma.academicYear.updateMany({
        data: { isActive: false },
      });

      // Find or create target year
      const existing = await prisma.academicYear.findFirst({
        where: { name },
      });

      if (existing) {
        await prisma.academicYear.update({
          where: { id: existing.id },
          data: { isActive: true, semester },
        });
      } else {
        await prisma.academicYear.create({
          data: {
            name,
            semester,
            isActive: true,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
          },
        });
      }

      return NextResponse.json({ success: true, message: `Periode ${name} (${semester}) berhasil diaktifkan.` });
    }

    if (setAsActive) {
      await prisma.academicYear.updateMany({
        data: { isActive: false },
      });
    }

    const created = await prisma.academicYear.create({
      data: {
        name,
        semester,
        isActive: Boolean(setAsActive),
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
    });

    return NextResponse.json({ success: true, academicYear: created }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/academic-years error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
