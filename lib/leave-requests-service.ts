export type LeaveRequestType = "Izin" | "Sakit" | "Cuti" | "Dispensasi";
export type LeaveRequestStatus = "Menunggu Persetujuan" | "Disetujui" | "Ditolak";

export interface LeaveRequest {
  id: string;
  type: LeaveRequestType;
  studentId: string;
  studentName: string;
  studentNisn?: string;
  studentUid?: string;
  className: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  daysCount: number;
  reason: string;
  attachmentUrl?: string;
  proofUrl?: string;
  attachmentName?: string;
  status: LeaveRequestStatus;
  submittedAt: string;
  submittedBy?: string;
  submitterName?: string;
  submitterEmail?: string;
  homeroomTeacherName?: string;
  approvedBy?: string;
  approvedAt?: string;
  approvalNotes?: string;
  rejectedReason?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  academicYear?: string;
  semester?: string;
  createdAt: string;
}

const STORAGE_KEY = "quick_schools_leave_requests";

export function getDatesBetween(startDateStr: string, endDateStr: string): string[] {
  const dates: string[] = [];
  try {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return [startDateStr];
    }

    if (start > end) {
      return [startDateStr];
    }

    const current = new Date(start);
    while (current <= end) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, "0");
      const d = String(current.getDate()).padStart(2, "0");
      dates.push(`${y}-${m}-${d}`);
      current.setDate(current.getDate() + 1);
    }
  } catch {
    return [startDateStr];
  }
  return dates;
}

export function isLeaveRequestExpired(request: LeaveRequest): boolean {
  if (request.status !== "Menunggu Persetujuan") return false;

  const now = Date.now();
  if (request.startDate) {
    try {
      const parts = request.startDate.split("-").map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        const deadline = new Date(parts[0], parts[1] - 1, parts[2] + 1, 23, 59, 59, 999).getTime();
        if (now > deadline) return true;
      }
    } catch {}
  }
  return false;
}

export async function checkAndAutoApproveExpiredRequests(requests: LeaveRequest[]): Promise<void> {
  const expiredPending = requests.filter(
    (req) => req.status === "Menunggu Persetujuan" && isLeaveRequestExpired(req)
  );

  for (const req of expiredPending) {
    try {
      await approveLeaveRequest(
        req,
        "Sistem (Otomatis)",
        "Disetujui otomatis oleh sistem setelah melewati batas waktu persetujuan"
      );
    } catch (e) {}
  }
}

export function subscribeLeaveRequests(
  callback: (requests: LeaveRequest[]) => void
): () => void {
  let isMounted = true;

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/leave-requests");
      const data = await res.json();
      if (isMounted && data.success && Array.isArray(data.leaveRequests)) {
        const mapped = data.leaveRequests.map((r: any) => ({
          ...r,
          studentName: r.name || r.applicantName,
          daysCount: getDatesBetween(r.startDate, r.endDate).length,
          status: r.status === "Pending" ? "Menunggu Persetujuan" : r.status,
        }));
        callback(mapped);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
        } catch (e) {}
      }
    } catch (e) {
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached && isMounted) callback(JSON.parse(cached));
      } catch (err) {}
    }
  };

  fetchRequests();
  const interval = setInterval(fetchRequests, 10000);

  return () => {
    isMounted = false;
    clearInterval(interval);
  };
}

export async function createLeaveRequest(
  data: Omit<LeaveRequest, "id" | "status" | "createdAt">
): Promise<LeaveRequest> {
  const dates = getDatesBetween(data.startDate, data.endDate);
  const daysCount = dates.length;
  const nowIso = new Date().toISOString();

  try {
    const res = await fetch("/api/leave-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: data.studentId,
        nisn: data.studentNisn,
        type: data.type,
        startDate: data.startDate,
        endDate: data.endDate,
        reason: data.reason,
        proofUrl: data.attachmentUrl || data.proofUrl,
      }),
    });
    const resData = await res.json();
    return resData.leaveRequest || {
      ...data,
      id: `leave_${Date.now()}`,
      daysCount,
      status: "Menunggu Persetujuan",
      createdAt: nowIso,
      submittedAt: data.submittedAt || nowIso,
    };
  } catch (err: any) {
    return {
      ...data,
      id: `leave_${Date.now()}`,
      daysCount,
      status: "Menunggu Persetujuan",
      createdAt: nowIso,
      submittedAt: data.submittedAt || nowIso,
    };
  }
}

export async function approveLeaveRequest(
  request: LeaveRequest,
  approverName: string,
  approvalNotes?: string
): Promise<LeaveRequest> {
  const nowIso = new Date().toISOString();
  const updatedReq: LeaveRequest = {
    ...request,
    status: "Disetujui",
    approvedBy: approverName,
    approvedAt: nowIso,
    approvalNotes: approvalNotes || `Disetujui oleh Wali Kelas (${approverName})`,
  };

  try {
    await fetch("/api/leave-requests", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: request.id,
        status: "Disetujui",
      }),
    });
  } catch (e) {}

  return updatedReq;
}

export async function rejectLeaveRequest(
  request: LeaveRequest,
  rejectorName: string,
  rejectionReason: string
): Promise<LeaveRequest> {
  const nowIso = new Date().toISOString();
  const updatedReq: LeaveRequest = {
    ...request,
    status: "Ditolak",
    rejectedBy: rejectorName,
    rejectedAt: nowIso,
    rejectedReason: rejectionReason || "Permohonan izin belum memenuhi persyaratan sekolah.",
  };

  try {
    await fetch("/api/leave-requests", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: request.id,
        status: "Ditolak",
      }),
    });
  } catch (e) {}

  return updatedReq;
}

export async function deleteLeaveRequest(_requestId: string): Promise<void> {
  // Can be implemented if needed
}
