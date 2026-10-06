import { db } from "@/lib/firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where 
} from "firebase/firestore";

export type LeaveRequestType = "Izin" | "Sakit";
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
  attachmentUrl?: string; // base64 / URL
  attachmentName?: string;
  status: LeaveRequestStatus;
  submittedAt: string;
  submittedBy?: string; // "siswa" | "orang-tua"
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
  typeMarker?: string; // "leave_request" for collection query compatibility
}

const STORAGE_KEY = "quick_schools_leave_requests";

/**
 * Returns an array of YYYY-MM-DD date strings between start and end inclusive.
 */
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

/**
 * Checks whether a pending leave request has exceeded the 1-day approval deadline after the absence date.
 * (Batas waktu persetujuan maksimal 1 hari setelah tanggal absensi).
 */
export function isLeaveRequestExpired(request: LeaveRequest): boolean {
  if (request.status !== "Menunggu Persetujuan") return false;

  const now = Date.now();

  // 1. Check based on startDate (tanggal absensi)
  if (request.startDate) {
    try {
      const parts = request.startDate.split("-").map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        // End of 1 day after absence date (23:59:59.999)
        const deadline = new Date(parts[0], parts[1] - 1, parts[2] + 1, 23, 59, 59, 999).getTime();
        if (now > deadline) {
          return true;
        }
      }
    } catch {}
  }

  // 2. Fallback check based on submittedAt / createdAt if older than 24-48 hours and absence date has passed
  if (request.submittedAt || request.createdAt) {
    try {
      const submitTime = new Date(request.submittedAt || request.createdAt).getTime();
      if (!isNaN(submitTime) && now - submitTime > 24 * 60 * 60 * 1000) {
        if (request.startDate) {
          const parts = request.startDate.split("-").map(Number);
          if (parts.length === 3) {
            const startDateEnd = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999).getTime();
            if (now > startDateEnd) {
              return true;
            }
          }
        } else {
          return true;
        }
      }
    } catch {}
  }

  return false;
}

// Track IDs currently being auto-approved to prevent concurrent duplicate calls
const autoApprovingIds = new Set<string>();

/**
 * Automatically approves any pending leave requests that have exceeded the 1-day deadline.
 */
export async function checkAndAutoApproveExpiredRequests(requests: LeaveRequest[]): Promise<void> {
  const expiredPending = requests.filter(
    (req) => req.status === "Menunggu Persetujuan" && isLeaveRequestExpired(req) && !autoApprovingIds.has(req.id)
  );

  if (expiredPending.length === 0) return;

  for (const req of expiredPending) {
    autoApprovingIds.add(req.id);
    try {
      await approveLeaveRequest(
        req,
        "Sistem (Otomatis)",
        "Disetujui otomatis oleh sistem setelah melewati batas waktu persetujuan"
      );
    } catch (e) {
      console.warn("Auto-approve leave request error for", req.id, e);
    } finally {
      autoApprovingIds.delete(req.id);
    }
  }
}

/**
 * Subscribe to leave requests in real-time from Firestore & fallback to localStorage.
 */
export function subscribeLeaveRequests(
  callback: (requests: LeaveRequest[]) => void
): () => void {
  // 1. Initial read from localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        callback(parsed);
        // Check for any expired requests in cached data
        checkAndAutoApproveExpiredRequests(parsed);
      }
    }
  } catch (e) {
    console.warn("Error reading leave requests from localStorage:", e);
  }

  // 2. Realtime listener to 'leave_requests' collection
  let leaveRequestsCollectionList: LeaveRequest[] = [];
  let rolesCollectionList: LeaveRequest[] = [];

  const mergeAndEmit = () => {
    const map = new Map<string, LeaveRequest>();
    // Add roles
    rolesCollectionList.forEach((r) => map.set(r.id, r));
    // Add leave_requests (takes precedence)
    leaveRequestsCollectionList.forEach((r) => map.set(r.id, r));

    // Also merge localStorage items
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const localList: LeaveRequest[] = JSON.parse(stored);
        if (Array.isArray(localList)) {
          localList.forEach((l) => {
            if (!map.has(l.id)) {
              map.set(l.id, l);
            }
          });
        }
      }
    } catch (e) {}

    const all = Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt || b.submittedAt || 0).getTime() - new Date(a.createdAt || a.submittedAt || 0).getTime()
    );

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all.slice(0, 300)));
    } catch (e) {}

    callback(all);

    // Auto-approve expired requests in the background
    checkAndAutoApproveExpiredRequests(all);
  };

  const unsubLeaveReq = onSnapshot(
    collection(db, "leave_requests"),
    (snapshot) => {
      leaveRequestsCollectionList = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      mergeAndEmit();
    },
    (err) => {
      console.warn("leave_requests onSnapshot error, using fallback:", err);
    }
  );

  const unsubRoles = onSnapshot(
    query(collection(db, "roles"), where("type", "==", "leave_request")),
    (snapshot) => {
      rolesCollectionList = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      mergeAndEmit();
    },
    (err) => {
      console.warn("roles leave_request onSnapshot error:", err);
    }
  );

  return () => {
    unsubLeaveReq();
    unsubRoles();
  };
}

/**
 * Creates a new leave request (submitted by Siswa or Orang Tua).
 */
export async function createLeaveRequest(
  data: Omit<LeaveRequest, "id" | "status" | "createdAt">
): Promise<LeaveRequest> {
  const dates = getDatesBetween(data.startDate, data.endDate);
  const daysCount = dates.length;
  const nowIso = new Date().toISOString();
  const docId = `leave_req_${Date.now()}_${data.studentId || "student"}`;

  const payload: LeaveRequest = {
    ...data,
    id: docId,
    daysCount,
    status: "Menunggu Persetujuan",
    createdAt: nowIso,
    submittedAt: data.submittedAt || nowIso,
    typeMarker: "leave_request",
  };

  // 1. Primary write to 'roles' collection for security rules compatibility
  try {
    await setDoc(doc(db, "roles", docId), { ...payload, type: "leave_request" }, { merge: true });
  } catch (e) {
    console.warn("Write leave request to roles error:", e);
  }

  // 2. Try write to 'leave_requests'
  try {
    await setDoc(doc(db, "leave_requests", docId), payload, { merge: true });
  } catch (e) {
    console.warn("Write leave request to leave_requests error:", e);
  }

  // 3. Save to localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const list: LeaveRequest[] = stored ? JSON.parse(stored) : [];
    list.unshift(payload);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 300)));
  } catch (e) {}

  // 4. Notify app listeners
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("leave_request_updated", { detail: payload }));
  }

  return payload;
}

/**
 * Approves a leave request by Wali Kelas / Admin.
 * Automatically creates/updates attendance records in Firestore & local cache so the student's status
 * is immediately recorded as 'Izin' or 'Sakit' across all dates.
 */
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

  // 1. Update the leave request document in Firestore & roles
  try {
    await setDoc(doc(db, "leave_requests", request.id), updatedReq, { merge: true });
  } catch (e) {}
  try {
    await setDoc(doc(db, "roles", request.id), { ...updatedReq, type: "leave_request" }, { merge: true });
  } catch (e) {}

  // 2. Update localStorage for leave requests
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const list: LeaveRequest[] = stored ? JSON.parse(stored) : [];
    const updated = list.map((item) => (item.id === request.id ? updatedReq : item));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(0, 300)));
  } catch (e) {}

  // 3. Automatically sync to Attendance Records for every day in the range!
  const dateList = getDatesBetween(request.startDate, request.endDate);
  const attendancePayloads: any[] = [];

  for (const dateStr of dateList) {
    const attDocId = `att_rec_${dateStr}_${request.studentId}`;
    const attPayload = {
      id: attDocId,
      type: "attendance_record",
      studentId: request.studentId,
      studentName: request.studentName,
      className: request.className || "Umum",
      academicYear: request.academicYear || "2025/2026",
      semester: request.semester || "Ganjil",
      date: dateStr,
      time: "07:00",
      timestamp: "07:00 WIB",
      jamMasuk: "07:00",
      status: request.type, // "Izin" or "Sakit"
      notes: `Permohonan ${request.type} disetujui Wali Kelas (${approverName}): ${request.reason}`,
      source: "permit",
      markedBy: approverName,
      capturedImage: request.attachmentUrl || null,
      createdAt: nowIso,
    };

    attendancePayloads.push(attPayload);

    // Write to Firestore roles and attendance
    try {
      await setDoc(doc(db, "roles", attDocId), attPayload, { merge: true });
    } catch (e) {}
    try {
      await setDoc(doc(db, "attendance", attDocId), attPayload, { merge: true });
    } catch (e) {}

    // Dispatch instant live attendance event
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("attendance_updated", { detail: attPayload }));
    }
  }

  // Update attendance in localStorage
  try {
    const storedAtt = localStorage.getItem("quick_schools_attendance_records");
    let currentAttList = storedAtt ? JSON.parse(storedAtt) : [];
    if (!Array.isArray(currentAttList)) currentAttList = [];

    // Merge or prepend
    const map = new Map<string, any>();
    currentAttList.forEach((a: any) => map.set(a.id, a));
    attendancePayloads.forEach((a: any) => map.set(a.id, a));
    const mergedList = Array.from(map.values());
    localStorage.setItem("quick_schools_attendance_records", JSON.stringify(mergedList.slice(0, 300)));
  } catch (e) {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("leave_request_updated", { detail: updatedReq }));
  }

  return updatedReq;
}

/**
 * Rejects a leave request by Wali Kelas / Admin with a rejection note.
 */
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
    await setDoc(doc(db, "leave_requests", request.id), updatedReq, { merge: true });
  } catch (e) {}
  try {
    await setDoc(doc(db, "roles", request.id), { ...updatedReq, type: "leave_request" }, { merge: true });
  } catch (e) {}

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const list: LeaveRequest[] = stored ? JSON.parse(stored) : [];
    const updated = list.map((item) => (item.id === request.id ? updatedReq : item));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(0, 300)));
  } catch (e) {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("leave_request_updated", { detail: updatedReq }));
  }

  return updatedReq;
}

/**
 * Deletes a leave request (Admin or creator before approval).
 */
export async function deleteLeaveRequest(requestId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "leave_requests", requestId));
  } catch (e) {}
  try {
    await deleteDoc(doc(db, "roles", requestId));
  } catch (e) {}

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const list: LeaveRequest[] = JSON.parse(stored);
      const filtered = list.filter((r) => r.id !== requestId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
  } catch (e) {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("leave_request_updated", { detail: { id: requestId, deleted: true } }));
  }
}
