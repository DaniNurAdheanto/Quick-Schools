import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetRole = searchParams.get("role");

    const where: any = {};
    if (targetRole && targetRole !== "Semua" && targetRole !== "ALL") {
      where.OR = [
        { targetRole: "Semua" },
        { targetRole: targetRole },
      ];
    }

    const announcements = await prisma.announcement.findMany({
      where,
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      include: {
        author: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    return NextResponse.json({ success: true, announcements });
  } catch (error: any) {
    console.error("GET /api/announcements error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, targetRole = "Semua", isPinned = false, authorId } = body;

    const created = await prisma.announcement.create({
      data: {
        title,
        content,
        targetRole,
        isPinned: Boolean(isPinned),
        authorId: authorId || undefined,
      },
    });

    return NextResponse.json({ success: true, announcement: created }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/announcements error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "ID announcement is required" }, { status: 400 });
    }

    await prisma.announcement.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Announcement deleted" });
  } catch (error: any) {
    console.error("DELETE /api/announcements error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
