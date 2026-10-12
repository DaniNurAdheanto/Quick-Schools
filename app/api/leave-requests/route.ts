import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LeaveType, ApprovalStatus, AttendanceStatus } from "@prisma/client";

// GET /api/leave-requests - List all leave requests
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const whereClause: any = {};
    if (status && status !== "all") {
      whereClause.status = status.toUpperCase() === "DISETUJUI" ? ApprovalStatus.DISETUJUI : status.toUpperCase() === "DITOLAK" ? ApprovalStatus.DITOLAK : ApprovalStatus.PENDING;
    }

    const requests = await prisma.leaveRequest.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        student: {
          include: {
            class: true,
          },
        },
        teacher: true,
        approvedBy: true,
      },
    });

    const formatted = requests.map((r) => ({
      id: r.id,
      _firestoreId: r.id,
      applicantType: r.studentId ? "siswa" : "guru",
      applicantName: r.student?.fullName || r.teacher?.fullName || "Pemohon",
      name: r.student?.fullName || r.teacher?.fullName || "Pemohon",
      className: r.student?.class?.name || "-",
      nipOrNisn: r.student?.nisn || r.teacher?.nip || "-",
      type: r.type === LeaveType.SAKIT ? "Sakit" : r.type === LeaveType.IZIN ? "Izin" : r.type === LeaveType.CUTI ? "Cuti" : "Dispensasi",
      startDate: r.startDate.toISOString().split("T")[0],
      endDate: r.endDate.toISOString().split("T")[0],
      reason: r.reason,
      proofUrl: r.proofUrl,
      status: r.status === ApprovalStatus.DISETUJUI ? "Disetujui" : r.status === ApprovalStatus.DITOLAK ? "Ditolak" : "Pending",
      approvedBy: r.approvedBy?.name || null,
      approvedAt: r.approvedAt ? r.approvedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    }));

    return NextResponse.json({ success: true, leaveRequests: formatted });
  } catch (err: any) {
    console.error("GET /api/leave-requests error:", err);
    return NextResponse.json({ error: "Gagal memuat pengajuan izin: " + err.message }, { status: 500 });
  }
}

// POST /api/leave-requests - Submit new leave request
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentId, teacherId, nisn, nip, type, startDate, endDate, reason, proofUrl } = body;

    if (!startDate || !endDate || !reason) {
      return NextResponse.json({ error: "Tanggal mulai, selesai, dan alasan wajib diisi." }, { status: 400 });
    }

    let targetStudentId: string | null = null;
    let targetTeacherId: string | null = null;

    if (studentId || nisn) {
      const st = await prisma.student.findFirst({
        where: { OR: [{ id: studentId || "" }, { nisn: String(nisn || studentId || "").trim() }] },
      });
      if (st) targetStudentId = st.id;
    }

    if (teacherId || nip) {
      const tc = await prisma.teacher.findFirst({
        where: { OR: [{ id: teacherId || "" }, { nip: String(nip || teacherId || "").trim() }] },
      });
      if (tc) targetTeacherId = tc.id;
    }

    const leaveTypeEnum = type === "Sakit" ? LeaveType.SAKIT : type === "Cuti" ? LeaveType.CUTI : type === "Dispensasi" ? LeaveType.DISPENSASI : LeaveType.IZIN;

    const newRequest = await prisma.leaveRequest.create({
      data: {
        studentId: targetStudentId,
        teacherId: targetTeacherId,
        type: leaveTypeEnum,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason: String(reason).trim(),
        proofUrl: proofUrl || null,
        status: ApprovalStatus.PENDING,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Pengajuan izin berhasil dikirim dan menunggu persetujuan.",
      leaveRequest: newRequest,
    });
  } catch (err: any) {
    console.error("POST /api/leave-requests error:", err);
    return NextResponse.json({ error: "Gagal mengirim pengajuan izin: " + err.message }, { status: 500 });
  }
}

// PUT /api/leave-requests - Approve or Reject leave request
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, approvedById } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "ID pengajuan dan status wajib diisi." }, { status: 400 });
    }

    const approvalStatus = status === "Disetujui" ? ApprovalStatus.DISETUJUI : status === "Ditolak" ? ApprovalStatus.DITOLAK : ApprovalStatus.PENDING;

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: approvalStatus,
        approvedById: approvedById || null,
        approvedAt: new Date(),
      },
      include: {
        student: true,
      },
    });

    // If approved for a student, automatically create/update attendance records for those dates
    if (approvalStatus === ApprovalStatus.DISETUJUI && updated.studentId) {
      const attStatus = updated.type === LeaveType.SAKIT ? AttendanceStatus.SAKIT : AttendanceStatus.IZIN;
      const start = new Date(updated.startDate);
      const end = new Date(updated.endDate);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split("T")[0];
        try {
          await prisma.attendance.upsert({
            where: {
              studentId_date: {
                studentId: updated.studentId,
                date: dateStr,
              },
            },
            update: {
              status: attStatus,
              notes: `Disetujui dari pengajuan: ${updated.reason}`,
            },
            create: {
              studentId: updated.studentId,
              classId: updated.student?.classId,
              date: dateStr,
              status: attStatus,
              notes: `Disetujui dari pengajuan: ${updated.reason}`,
              isFinal: true,
            },
          });
        } catch (attErr) {}
      }
    }

    return NextResponse.json({
      success: true,
      message: `Pengajuan izin berhasil diubah menjadi "${status}".`,
      leaveRequest: updated,
    });
  } catch (err: any) {
    console.error("PUT /api/leave-requests error:", err);
    return NextResponse.json({ error: "Gagal memperbarui status pengajuan: " + err.message }, { status: 500 });
  }
}
