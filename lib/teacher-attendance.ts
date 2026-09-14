"use client";

import { useState, useEffect, useMemo } from "react";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  serverTimestamp,
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
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return DEFAULT_TEACHER_ATTENDANCE_CONFIG;
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

  // 1. Subscribe to Firestore collection `teacher_attendance`
  useEffect(() => {
    let isMounted = true;

    const unsubRecords = onSnapshot(
      collection(db, "teacher_attendance"),
      (snap) => {
        if (!isMounted) return;
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as TeacherAttendanceRecord[];

        // Filter out any legacy dummy records with tc-00
        const cleanList = list.filter((r) => !r.teacherId?.startsWith("tc-00") && !r.id?.includes("tc-00"));
        saveRecordsCache(cleanList);
        setLoading(false);
      },
      (err) => {
        console.warn("teacher_attendance listener error, using cache/fallback:", err);
        setLoading(false);
      }
    );

    // 2. Subscribe to teacher config
    const unsubConfig = onSnapshot(
      doc(db, "roles", "teacher_attendance_config"),
      (docSnap) => {
        if (!isMounted) return;
        if (docSnap.exists()) {
          saveConfigCache({ ...DEFAULT_TEACHER_ATTENDANCE_CONFIG, ...docSnap.data() });
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
          setConfig((prev) => ({
            ...prev,
            geofenceCenter: {
              ...prev.geofenceCenter,
              lat: Number(d.schoolCenterLat ?? prev.geofenceCenter.lat),
              lng: Number(d.schoolCenterLng ?? prev.geofenceCenter.lng),
              radiusMeters: Number(d.geofenceRadiusMeters ?? prev.geofenceCenter.radiusMeters),
            },
          }));
        }
      },
      (err) => {
        console.warn("attendance_config listener error:", err);
      }
    );

    return () => {
      isMounted = false;
      unsubRecords();
      unsubConfig();
      unsubSchoolConfig();
    };
  }, []);

  // Today's record for logged-in teacher
  const todayDate = getTodayDateString();
  const todayTeacherRecord = useMemo(() => {
    if (!currentTeacherId && !currentTeacherEmail) return null;
    return (
      records.find(
        (r) =>
          r.date === todayDate &&
          ((currentTeacherId &&
            (r.teacherId === currentTeacherId ||
              (r as any).uid === currentTeacherId ||
              r.id === `TA_${currentTeacherId}_${todayDate}`)) ||
            (currentTeacherEmail &&
              r.email &&
              r.email.toLowerCase() === currentTeacherEmail.toLowerCase()))
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
      location,
      photoUrl,
      notes,
    };

    const overallStatus: TeacherAttendanceStatus =
      inStatus === "Terlambat" ? "Terlambat" : "Hadir";

    const docId = `TA_${teacherId}_${todayDate}`;
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

    // Save to Firestore
    try {
      await setDoc(doc(db, "teacher_attendance", docId), {
        ...newRecord,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn("Error saving clockIn to Firestore:", err);
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
    const existing = records.find((r) => r.id === recordId);
    if (!existing || !existing.clockIn) {
      throw new Error("Data Clock In tidak ditemukan untuk presensi ini.");
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
      location,
      photoUrl,
      notes,
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

    const updatedList = records.map((r) => (r.id === recordId ? updatedRecord : r));
    saveRecordsCache(updatedList);

    try {
      await setDoc(doc(db, "teacher_attendance", recordId), {
        ...updatedRecord,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn("Error saving clockOut to Firestore:", err);
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
      permitReason: reason,
      permitDocUrl,
      createdAt: isoNow,
      updatedAt: isoNow,
    };

    const updated = [newRecord, ...records.filter((r) => r.id !== docId)];
    saveRecordsCache(updated);

    try {
      await setDoc(doc(db, "teacher_attendance", docId), {
        ...newRecord,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn("Error saving permit to Firestore:", err);
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
      await setDoc(doc(db, "teacher_attendance", record.id), {
        ...updatedRecord,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn("Error adminSaveRecord to Firestore:", err);
    }
  };

  // Admin Actions: Delete Record
  const adminDeleteRecord = async (recordId: string) => {
    const updated = records.filter((r) => r.id !== recordId);
    saveRecordsCache(updated);

    try {
      await deleteDoc(doc(db, "teacher_attendance", recordId));
    } catch (err) {
      console.warn("Error adminDeleteRecord from Firestore:", err);
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
