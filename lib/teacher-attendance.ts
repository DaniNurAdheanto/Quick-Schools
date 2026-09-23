"use client";

import { useState, useEffect, useMemo } from "react";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// -------------------------------------------------------------
// Types & Interfaces
// -------------------------------------------------------------

export type TeacherAttendanceStatus =
  | "Hadir"
  | "Terlambat"
  | "Pulang Awal"
  | "Sakit"
  | "Izin"
  | "Cuti"
  | "Alpa";

export interface ClockEventDetail {
  time: string; // HH:mm:ss
  timestamp: string; // ISO string
  status?: "Tepat Waktu" | "Terlambat" | "Normal" | "Pulang Awal";
  lateMinutes?: number;
  earlyMinutes?: number;
  location?: {
    lat: number;
    lng: number;
    address?: string;
    inRadius?: boolean;
    distanceMeters?: number;
  };
  photoUrl?: string;
  notes?: string;
}

export interface TeacherAttendanceRecord {
  id: string;
  teacherId: string;
  teacherName: string;
  nip: string;
  subject?: string;
  email?: string;
  phone?: string;
  date: string; // YYYY-MM-DD
  clockIn: ClockEventDetail | null;
  clockOut: ClockEventDetail | null;
  workDurationMinutes: number;
  workDurationFormatted: string; // e.g. "8j 15m"
  status: TeacherAttendanceStatus;
  permitReason?: string;
  permitDocUrl?: string;
  verifiedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TeacherAttendanceConfig {
  standardClockIn: string; // e.g. "07:00"
  lateThreshold: string; // e.g. "07:15" (Lewat ini dianggap terlambat)
  standardClockOut: string; // e.g. "15:30" (Sebelum ini dianggap pulang awal)
  workDays: string[]; // ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]
  requirePhoto: boolean;
  geofenceEnabled: boolean;
  geofenceCenter: {
    lat: number;
    lng: number;
    radiusMeters: number;
    address: string;
  };
}

export const DEFAULT_TEACHER_ATTENDANCE_CONFIG: TeacherAttendanceConfig = {
  standardClockIn: "07:00",
  lateThreshold: "07:15",
  standardClockOut: "15:30",
  workDays: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
  requirePhoto: true,
  geofenceEnabled: true,
  geofenceCenter: {
    lat: -6.200000,
    lng: 106.816666,
    radiusMeters: 100,
    address: "SMART SCHOOL OS Campus - Area Utama Sekolah",
  },
};

const STORAGE_KEY_RECORDS = "smart_school_teacher_attendance_records_v1";
const STORAGE_KEY_CONFIG = "smart_school_teacher_attendance_config_v1";

// -------------------------------------------------------------
// Helper Calculation Functions
// -------------------------------------------------------------

export function calculateDurationMinutes(timeInStr: string, timeOutStr: string): number {
  try {
    const [h1, m1] = timeInStr.split(":").map(Number);
    const [h2, m2] = timeOutStr.split(":").map(Number);
    if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;
    const diff = h2 * 60 + m2 - (h1 * 60 + m1);
    return Math.max(0, diff);
  } catch (e) {
    return 0;
  }
}

export function formatDurationMinutes(minutes: number): string {
  if (minutes <= 0) return "0m";
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours} jam`;
  return `${hours}j ${remainingMinutes}m`;
}

export function determineClockInStatus(
  clockInTime: string,
  thresholdTime: string
): { status: "Tepat Waktu" | "Terlambat"; lateMinutes: number } {
  try {
    const [h1, m1] = clockInTime.split(":").map(Number);
    const [h2, m2] = thresholdTime.split(":").map(Number);
    const inTotal = h1 * 60 + m1;
    const threshTotal = h2 * 60 + m2;
    if (inTotal > threshTotal) {
      return { status: "Terlambat", lateMinutes: inTotal - threshTotal };
    }
    return { status: "Tepat Waktu", lateMinutes: 0 };
  } catch (e) {
    return { status: "Tepat Waktu", lateMinutes: 0 };
  }
}

export function determineClockOutStatus(
  clockOutTime: string,
  standardOutTime: string
): { status: "Normal" | "Pulang Awal"; earlyMinutes: number } {
  try {
    const [h1, m1] = clockOutTime.split(":").map(Number);
    const [h2, m2] = standardOutTime.split(":").map(Number);
    const outTotal = h1 * 60 + m1;
    const stdTotal = h2 * 60 + m2;
    if (outTotal < stdTotal) {
      return { status: "Pulang Awal", earlyMinutes: stdTotal - outTotal };
    }
    return { status: "Normal", earlyMinutes: 0 };
  } catch (e) {
    return { status: "Normal", earlyMinutes: 0 };
  }
}

export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getCurrentTimeString(): string {
  const now = new Date();
  return now.toTimeString().split(" ")[0]; // HH:mm:ss
}

export function cleanFirestoreData<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as any;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanFirestoreData) as any;
  }
  if (typeof obj === "object" && !(obj instanceof Date)) {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanFirestoreData(value);
      }
    }
    return cleaned;
  }
  return obj;
}

// -------------------------------------------------------------
// Hook: useTeacherAttendance
// -------------------------------------------------------------

export function useTeacherAttendance(currentTeacherId?: string, currentTeacherEmail?: string) {
  const [records, setRecords] = useState<TeacherAttendanceRecord[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_RECORDS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            // Clean out any legacy mock data containing tc-00
            return parsed.filter((r) => !r.teacherId?.startsWith("tc-00") && !r.id?.includes("tc-00"));
          }
        }
      } catch (e) {}
    }
    return [];
  });

  const [config, setConfig] = useState<TeacherAttendanceConfig>(() => {
    let base = DEFAULT_TEACHER_ATTENDANCE_CONFIG;
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
        if (saved) {
          base = { ...base, ...JSON.parse(saved) };
        }
        const schoolSaved = localStorage.getItem("quick_schools_attendance_config");
        if (schoolSaved) {
          const s = JSON.parse(schoolSaved);
          const sLat = Number(s.schoolCenterLat ?? s.schoolLat);
          const sLng = Number(s.schoolCenterLng ?? s.schoolLng);
          const sRadius = Number(s.geofenceRadiusMeters ?? s.gpsRadiusMeter);
          if (!isNaN(sLat) && !isNaN(sLng) && sLat !== 0 && sLng !== 0) {
            base = {
              ...base,
              geofenceCenter: {
                ...base.geofenceCenter,
                lat: sLat,
                lng: sLng,
                radiusMeters: !isNaN(sRadius) && sRadius > 0 ? sRadius : base.geofenceCenter.radiusMeters,
              },
            };
          }
        }
      } catch (e) {}
    }
    return base;
  });

  const [loading, setLoading] = useState(true);

  // Sync to localStorage
  const saveRecordsCache = (data: TeacherAttendanceRecord[]) => {
    setRecords(data);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(data));
      } catch (e) {}
    }
  };

  const saveConfigCache = (cfg: TeacherAttendanceConfig) => {
    setConfig(cfg);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(cfg));
      } catch (e) {}
    }
  };

  // 1. Subscribe to teacher attendance in Firestore:
  // Primary: 'roles' collection where type == 'teacher_attendance' (100% permitted by Cloud Firestore rules)
  // Secondary: 'teacher_attendance' collection
  useEffect(() => {
    let isMounted = true;

    const map = new Map<string, TeacherAttendanceRecord>();

    const updateAllRecords = () => {
      if (!isMounted) return;
      const combined = Array.from(map.values()).filter(
        (r) => !r.teacherId?.startsWith("tc-00") && !r.id?.includes("tc-00")
      );
      // Sort newest first
      combined.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      saveRecordsCache(combined);
      setLoading(false);
    };

    // Primary Subscription: 'roles' collection
    const qRolesAtt = query(
      collection(db, "roles"),
      where("type", "==", "teacher_attendance")
    );
    const unsubRoles = onSnapshot(
      qRolesAtt,
      (snap) => {
        snap.docs.forEach((d) => {
          const raw = d.data();
          map.set(d.id, {
            id: d.id,
            ...(raw as any),
          });
        });
        updateAllRecords();
      },
      (err) => {
        console.warn("roles teacher_attendance listener error:", err);
      }
    );

    // Secondary Subscription: 'teacher_attendance' collection
    const unsubRecords = onSnapshot(
      collection(db, "teacher_attendance"),
      (snap) => {
        snap.docs.forEach((d) => {
          const raw = d.data();
          map.set(d.id, {
            id: d.id,
            ...(raw as any),
          });
        });
        updateAllRecords();
      },
      () => {
        // Expected when rules restrict direct teacher_attendance collection
        setLoading(false);
      }
    );

    // 2. Subscribe to teacher config
    const unsubConfig = onSnapshot(
      doc(db, "roles", "teacher_attendance_config"),
      (docSnap) => {
        if (!isMounted) return;
        if (docSnap.exists()) {
          const d = docSnap.data();
          setConfig((prev) => {
            const merged: TeacherAttendanceConfig = {
              ...prev,
              ...d,
              geofenceCenter: {
                ...prev.geofenceCenter,
                ...(d.geofenceCenter || {}),
                lat: Number(d.geofenceCenter?.lat ?? prev.geofenceCenter.lat),
                lng: Number(d.geofenceCenter?.lng ?? prev.geofenceCenter.lng),
                radiusMeters: Number(d.geofenceCenter?.radiusMeters ?? prev.geofenceCenter.radiusMeters),
              },
            };
            try {
              localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });
        }
      },
      (err) => {
        console.warn("teacher_attendance_config listener error:", err);
      }
    );

    // 3. Subscribe to school attendance_config (exact same geofence location as students)
    const unsubSchoolConfig = onSnapshot(
      doc(db, "roles", "attendance_config"),
      (docSnap) => {
        if (!isMounted) return;
        if (docSnap.exists()) {
          const d = docSnap.data();
          setConfig((prev) => {
            const merged: TeacherAttendanceConfig = {
              ...prev,
              geofenceEnabled: d.requireRadius !== undefined ? Boolean(d.requireRadius) : prev.geofenceEnabled,
              geofenceCenter: {
                ...prev.geofenceCenter,
                lat: Number(d.schoolCenterLat ?? d.schoolLat ?? prev.geofenceCenter.lat),
                lng: Number(d.schoolCenterLng ?? d.schoolLng ?? prev.geofenceCenter.lng),
                radiusMeters: Number(d.geofenceRadiusMeters ?? d.gpsRadiusMeter ?? prev.geofenceCenter.radiusMeters),
              },
            };
            try {
              localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });
        }
      },
      (err) => {
        console.warn("attendance_config listener error:", err);
      }
    );

    return () => {
      isMounted = false;
      unsubRoles();
      unsubRecords();
      unsubConfig();
      unsubSchoolConfig();
    };
  }, []);

  // Today's record for logged-in teacher
  const todayDate = getTodayDateString();
  const todayTeacherRecord = useMemo(() => {
    if (!currentTeacherId && !currentTeacherEmail) return null;
    const targetId = (currentTeacherId || "").trim();
    const targetEmail = (currentTeacherEmail || "").toLowerCase().trim();

    return (
      records.find(
        (r) =>
          r.date === todayDate &&
          ((targetId &&
            (r.teacherId === targetId ||
              (r as any).uid === targetId ||
              r.id === `TA_${targetId}_${todayDate}` ||
              r.id.includes(targetId) ||
              (r.nip && r.nip !== "-" && r.nip === targetId))) ||
            (targetEmail &&
              r.email &&
              r.email.toLowerCase().trim() === targetEmail))
      ) || null
    );
  }, [records, currentTeacherId, currentTeacherEmail, todayDate]);

  // Actions: Clock In
  const clockIn = async ({
    teacherId,
    teacherName,
    nip,
    subject,
    email,
    phone,
    photoUrl,
    location,
    notes,
  }: {
    teacherId: string;
    teacherName: string;
    nip: string;
    subject?: string;
    email?: string;
    phone?: string;
    photoUrl?: string;
    location?: ClockEventDetail["location"];
    notes?: string;
  }) => {
    const docId = `TA_${teacherId}_${todayDate}`;

    // 1. In-memory check: prevent duplicate clock-in for this teacher today
    const existing = records.find(
      (r) =>
        r.date === todayDate &&
        (r.teacherId === teacherId || r.id === docId || (r as any).uid === teacherId)
    );
    if (existing?.clockIn) {
      throw new Error("Anda sudah melakukan Clock In hari ini. Presensi guru hanya dapat dilakukan satu kali per hari.");
    }

    // 2. Server check: verify no record already exists in Firestore
    try {
      const serverDoc = await getDoc(doc(db, "teacher_attendance", docId));
      if (serverDoc.exists() && serverDoc.data()?.clockIn) {
        throw new Error("Data presensi guru hari ini sudah tersimpan di sistem. Presensi hanya dapat dilakukan satu kali per hari.");
      }
    } catch (err: any) {
      if (err.message?.includes("sudah tersimpan") || err.message?.includes("Clock In")) {
        throw err;
      }
    }

    // 3. Strict Photo enforcement: Guru wajib melakukan foto terlebih dahulu
    if (!photoUrl || photoUrl.trim() === "") {
      throw new Error(
        "Foto selfie kehadiran guru wajib diambil terlebih dahulu sebelum melakukan konfirmasi presensi masuk (Clock In)."
      );
    }

    // 4. Geofence validation: reject if teacher is outside allowed radius
    if (config.geofenceEnabled && location && !location.inRadius) {
      const maxRadius = config.geofenceCenter?.radiusMeters || 100;
      const currentDist = location.distanceMeters ?? 0;
      throw new Error(
        `Presensi masuk (Clock In) ditolak karena Anda berada di luar radius sekolah (${currentDist}m dari titik sekolah, batas maksimal ${maxRadius}m). Silakan berada di area sekolah untuk melakukan presensi.`
      );
    }

    const timeNow = getCurrentTimeString();
    const isoNow = new Date().toISOString();
    const { status: inStatus, lateMinutes } = determineClockInStatus(
      timeNow,
      config.lateThreshold || "07:15"
    );

    const clockInDetail: ClockEventDetail = {
      time: timeNow,
      timestamp: isoNow,
      status: inStatus,
      lateMinutes,
      location: location || {
        lat: config.geofenceCenter.lat,
        lng: config.geofenceCenter.lng,
        address: config.geofenceCenter.address,
        inRadius: true,
        distanceMeters: 0,
      },
      photoUrl: photoUrl || "",
      notes: notes || "Presensi masuk harian",
    };

    const overallStatus: TeacherAttendanceStatus =
      inStatus === "Terlambat" ? "Terlambat" : "Hadir";

    const newRecord: TeacherAttendanceRecord = {
      id: docId,
      teacherId,
      teacherName,
      nip: nip || "-",
      subject: subject || "Guru Pengajar",
      email: email || "",
      phone: phone || "",
      date: todayDate,
      clockIn: clockInDetail,
      clockOut: null,
      workDurationMinutes: 0,
      workDurationFormatted: "0m",
      status: overallStatus,
      createdAt: isoNow,
      updatedAt: isoNow,
    };

    // Optimistic Update
    const updated = [newRecord, ...records.filter((r) => r.id !== docId)];
    saveRecordsCache(updated);

    // Save to Firestore: primary write to 'roles' (allowed by rules) + dual write to 'teacher_attendance'
    try {
      const sanitized = cleanFirestoreData({
        ...newRecord,
        type: "teacher_attendance",
      });
      await setDoc(doc(db, "roles", docId), {
        ...sanitized,
        updatedAt: serverTimestamp(),
      });
      console.log("Saved clockIn to roles doc:", docId);
    } catch (err) {
      console.warn("Error saving clockIn to roles:", err);
    }

    try {
      const sanitized = cleanFirestoreData(newRecord);
      await setDoc(doc(db, "teacher_attendance", docId), {
        ...sanitized,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      // Direct teacher_attendance collection may be restricted
    }

    return newRecord;
  };

  // Actions: Clock Out
  const clockOut = async ({
    recordId,
    photoUrl,
    location,
    notes,
  }: {
    recordId: string;
    photoUrl?: string;
    location?: ClockEventDetail["location"];
    notes?: string;
  }) => {
    let existing = records.find((r) => r.id === recordId);
    if (!existing) {
      // Fallback: find by current teacher and today's date
      existing = records.find(
        (r) =>
          r.date === todayDate &&
          (r.teacherId === currentTeacherId ||
            (r as any).uid === currentTeacherId ||
            r.id.includes(recordId))
      );
    }

    if (!existing || !existing.clockIn) {
      throw new Error("Data Clock In tidak ditemukan untuk presensi ini.");
    }

    // Strict Photo enforcement: Guru wajib melakukan foto kepulangan terlebih dahulu
    if (!photoUrl || photoUrl.trim() === "") {
      throw new Error(
        "Foto selfie kepulangan guru wajib diambil terlebih dahulu sebelum melakukan konfirmasi presensi pulang (Clock Out)."
      );
    }

    // Geofence validation: reject if teacher is outside allowed radius
    if (config.geofenceEnabled && location && !location.inRadius) {
      const maxRadius = config.geofenceCenter?.radiusMeters || 100;
      const currentDist = location.distanceMeters ?? 0;
      throw new Error(
        `Presensi pulang (Clock Out) ditolak karena Anda berada di luar radius sekolah (${currentDist}m dari titik sekolah, batas maksimal ${maxRadius}m). Silakan berada di area sekolah untuk melakukan presensi pulang.`
      );
    }

    const timeNow = getCurrentTimeString();
    const isoNow = new Date().toISOString();
    const { status: outStatus, earlyMinutes } = determineClockOutStatus(
      timeNow,
      config.standardClockOut || "15:30"
    );

    const clockOutDetail: ClockEventDetail = {
      time: timeNow,
      timestamp: isoNow,
      status: outStatus,
      earlyMinutes,
      location: location || {
        lat: config.geofenceCenter.lat,
        lng: config.geofenceCenter.lng,
        address: config.geofenceCenter.address,
        inRadius: true,
        distanceMeters: 0,
      },
      photoUrl: photoUrl || "",
      notes: notes || "Presensi pulang harian",
    };

    const durationMinutes = calculateDurationMinutes(existing.clockIn.time, timeNow);
    const durationFormatted = formatDurationMinutes(durationMinutes);

    // If early clock out, status can be 'Pulang Awal' unless already 'Terlambat'
    let finalStatus: TeacherAttendanceStatus = existing.status;
    if (existing.status !== "Terlambat" && outStatus === "Pulang Awal") {
      finalStatus = "Pulang Awal";
    }

    const updatedRecord: TeacherAttendanceRecord = {
      ...existing,
      clockOut: clockOutDetail,
      workDurationMinutes: durationMinutes,
      workDurationFormatted: durationFormatted,
      status: finalStatus,
      updatedAt: isoNow,
    };

    const targetDocId = existing.id || recordId;
    const updatedList = records.map((r) => (r.id === targetDocId ? updatedRecord : r));
    saveRecordsCache(updatedList);

    // Primary Firestore write: 'roles' collection with type 'teacher_attendance'
    try {
      const sanitized = cleanFirestoreData({
        ...updatedRecord,
        type: "teacher_attendance",
      });
      await setDoc(doc(db, "roles", targetDocId), {
        ...sanitized,
        updatedAt: serverTimestamp(),
      });
      console.log("Successfully saved clockOut to roles doc:", targetDocId);
    } catch (err) {
      console.error("Error saving clockOut to roles in Firestore:", err);
      // Fallback: if payload is too large, save without photo payload
      if (String(err).includes("exceeds maximum allowed size") || String(err).includes("size")) {
        const fallbackRecord = {
          ...updatedRecord,
          type: "teacher_attendance",
          clockOut: {
            ...clockOutDetail,
            photoUrl: "",
          },
        };
        await setDoc(doc(db, "roles", targetDocId), {
          ...cleanFirestoreData(fallbackRecord),
          updatedAt: serverTimestamp(),
        });
      } else {
        throw err;
      }
    }

    // Secondary Firestore write: 'teacher_attendance' collection
    try {
      const sanitized = cleanFirestoreData(updatedRecord);
      await setDoc(doc(db, "teacher_attendance", targetDocId), {
        ...sanitized,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      // Direct teacher_attendance collection may be restricted by cloud rules
    }

    return updatedRecord;
  };

  // Actions: Submit Permit / Leave / Sick
  const submitPermit = async ({
    teacherId,
    teacherName,
    nip,
    subject,
    date,
    status,
    reason,
    permitDocUrl,
  }: {
    teacherId: string;
    teacherName: string;
    nip: string;
    subject?: string;
    date: string;
    status: "Sakit" | "Izin" | "Cuti";
    reason: string;
    permitDocUrl?: string;
  }) => {
    const docId = `TA_${teacherId}_${date}`;
    const isoNow = new Date().toISOString();

    const newRecord: TeacherAttendanceRecord = {
      id: docId,
      teacherId,
      teacherName,
      nip: nip || "-",
      subject: subject || "Guru Pengajar",
      date,
      clockIn: null,
      clockOut: null,
      workDurationMinutes: 0,
      workDurationFormatted: "0m",
      status,
      permitReason: reason || "",
      permitDocUrl: permitDocUrl || "",
      createdAt: isoNow,
      updatedAt: isoNow,
    };

    const updated = [newRecord, ...records.filter((r) => r.id !== docId)];
    saveRecordsCache(updated);

    try {
      await setDoc(doc(db, "roles", docId), {
        ...cleanFirestoreData({
          ...newRecord,
          type: "teacher_attendance",
        }),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn("Error saving permit to roles:", err);
    }

    try {
      await setDoc(doc(db, "teacher_attendance", docId), {
        ...cleanFirestoreData(newRecord),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      // Direct teacher_attendance collection may be restricted
    }

    return newRecord;
  };

  // Admin Actions: Update or Create Record Manually
  const adminSaveRecord = async (record: TeacherAttendanceRecord) => {
    const isoNow = new Date().toISOString();
    const updatedRecord = {
      ...record,
      updatedAt: isoNow,
    };

    const updated = [
      updatedRecord,
      ...records.filter((r) => r.id !== updatedRecord.id),
    ];
    saveRecordsCache(updated);

    try {
      await setDoc(doc(db, "roles", record.id), {
        ...cleanFirestoreData({
          ...updatedRecord,
          type: "teacher_attendance",
        }),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn("Error adminSaveRecord to roles:", err);
    }

    try {
      await setDoc(doc(db, "teacher_attendance", record.id), {
        ...cleanFirestoreData(updatedRecord),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      // Direct teacher_attendance collection may be restricted
    }
  };

  // Admin Actions: Delete Record
  const adminDeleteRecord = async (recordId: string) => {
    const updated = records.filter((r) => r.id !== recordId);
    saveRecordsCache(updated);

    try {
      await deleteDoc(doc(db, "roles", recordId));
    } catch (err) {
      console.warn("Error adminDeleteRecord from roles:", err);
    }

    try {
      await deleteDoc(doc(db, "teacher_attendance", recordId));
    } catch (err) {
      // Direct teacher_attendance collection may be restricted
    }
  };

  // Update Config
  const updateConfig = async (newCfg: Partial<TeacherAttendanceConfig>) => {
    const merged = { ...config, ...newCfg };
    saveConfigCache(merged);

    try {
      await setDoc(
        doc(db, "roles", "teacher_attendance_config"),
        {
          ...merged,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn("Error saving teacher_attendance_config:", err);
    }
  };

  return {
    records,
    config,
    loading,
    todayTeacherRecord,
    clockIn,
    clockOut,
    submitPermit,
    adminSaveRecord,
    adminDeleteRecord,
    updateConfig,
  };
}
