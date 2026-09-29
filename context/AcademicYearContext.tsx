"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { collection, onSnapshot, doc, setDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface AcademicYearItem {
  id: string; // e.g. "2025-2026"
  name: string; // e.g. "2025/2026"
  semester: "Ganjil" | "Genap";
  isDefault: boolean;
  status: "Aktif" | "Arsip" | "Mendatang";
  startDate?: string;
  endDate?: string;
  description?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface AcademicYearContextType {
  activeAcademicYear: string;
  activeAcademicYearId: string;
  activeSemester: "Ganjil" | "Genap";
  periodKey: string;
  schoolDefaultYear: string;
  schoolDefaultSemester: "Ganjil" | "Genap";
  isArchiveMode: boolean;
  availableYears: AcademicYearItem[];
  academicYears: AcademicYearItem[];
  academicYearsList: AcademicYearItem[];
  loading: boolean;
  setActiveAcademicYear: (year: string) => void;
  setActiveSemester: (semester: "Ganjil" | "Genap") => void;
  resetToSchoolDefault: () => void;
  setSchoolActivePeriod: (yearName: string, semester: "Ganjil" | "Genap") => Promise<any>;
  createAcademicYear: (
    name: string, 
    semester?: "Ganjil" | "Genap", 
    options?: { startDate?: string; endDate?: string; setAsActive?: boolean }
  ) => Promise<any>;
  archiveAcademicYear: (yearIdOrName: string) => Promise<any>;
  matchesCurrentPeriod: (
    itemOrYear?: { academicYear?: string; semester?: string; academicYearId?: string } | string | null,
    semesterParam?: string | null
  ) => boolean;
}

export function normalizeYearId(year: string): string {
  if (!year) return "";
  return year.trim().replace(/\//g, "-").replace(/\s+/g, "");
}

export function normalizeYearDisplay(year: string): string {
  if (!year) return "";
  const cleaned = year.trim().replace(/\s+/g, "");
  if (cleaned.includes("-")) {
    return cleaned.replace(/-/g, "/");
  }
  return cleaned;
}

const DEFAULT_YEARS: AcademicYearItem[] = [
  { id: "2025-2026", name: "2025/2026", semester: "Ganjil", isDefault: true, status: "Aktif", startDate: "2025-07-14", endDate: "2026-06-20" },
  { id: "2024-2025", name: "2024/2025", semester: "Genap", isDefault: false, status: "Arsip", startDate: "2024-07-15", endDate: "2025-06-21" },
  { id: "2023-2024", name: "2023/2024", semester: "Genap", isDefault: false, status: "Arsip", startDate: "2023-07-17", endDate: "2024-06-22" },
];

const AcademicYearContext = createContext<AcademicYearContextType>({
  activeAcademicYear: "2025/2026",
  activeAcademicYearId: "2025-2026",
  activeSemester: "Ganjil",
  periodKey: "2025-2026_Ganjil",
  schoolDefaultYear: "2025/2026",
  schoolDefaultSemester: "Ganjil",
  isArchiveMode: false,
  availableYears: DEFAULT_YEARS,
  academicYears: DEFAULT_YEARS,
  academicYearsList: DEFAULT_YEARS,
  loading: false,
  setActiveAcademicYear: () => {},
  setActiveSemester: () => {},
  resetToSchoolDefault: () => {},
  setSchoolActivePeriod: async () => {},
  createAcademicYear: async () => {},
  archiveAcademicYear: async () => {},
  matchesCurrentPeriod: () => true,
});

export function AcademicYearProvider({ children }: { children: ReactNode }) {
  const [activeAcademicYear, setActiveAcademicYearState] = useState<string>("2025/2026");
  const [activeSemester, setActiveSemesterState] = useState<"Ganjil" | "Genap">("Ganjil");
  const [schoolDefaultYear, setSchoolDefaultYear] = useState<string>("2025/2026");
  const [schoolDefaultSemester, setSchoolDefaultSemester] = useState<"Ganjil" | "Genap">("Ganjil");
  const [availableYears, setAvailableYears] = useState<AcademicYearItem[]>(DEFAULT_YEARS);
  const [loading, setLoading] = useState<boolean>(true);

  // Load initial settings from localStorage & Firestore
  useEffect(() => {
    const savedYear = typeof window !== "undefined" ? localStorage.getItem("qs_active_year") : null;
    const savedSem = typeof window !== "undefined" ? (localStorage.getItem("qs_active_sem") as "Ganjil" | "Genap") : null;
    const cachedYearsStr = typeof window !== "undefined" ? localStorage.getItem("qs_cached_academic_years") : null;
    
    if (savedYear) setActiveAcademicYearState(normalizeYearDisplay(savedYear));
    if (savedSem === "Ganjil" || savedSem === "Genap") setActiveSemesterState(savedSem);

    if (cachedYearsStr) {
      try {
        const parsed = JSON.parse(cachedYearsStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAvailableYears(parsed);
          const defaultItem = parsed.find((l: any) => l.isDefault) || parsed.find((l: any) => l.status === "Aktif") || parsed[0];
          if (defaultItem) {
            setSchoolDefaultYear(defaultItem.name);
            setSchoolDefaultSemester(defaultItem.semester || "Ganjil");
            if (!savedYear) {
              setActiveAcademicYearState(defaultItem.name);
              setActiveSemesterState(defaultItem.semester || "Ganjil");
            }
          }
        }
      } catch (e) {
        console.warn("Failed to parse cached academic years:", e);
      }
    }

    const unsubYears = onSnapshot(collection(db, "academicYears"), (snap) => {
      const list: AcademicYearItem[] = snap.docs.map(d => {
        const data = d.data();
        const rawName = data.name || d.id;
        const normalizedName = normalizeYearDisplay(rawName);
        const normalizedId = normalizeYearId(rawName);
        return {
          id: normalizedId,
          name: normalizedName,
          semester: data.semester === "Genap" ? "Genap" : "Ganjil",
          isDefault: !!data.isDefault,
          status: data.status || (data.isDefault ? "Aktif" : "Arsip"),
          startDate: data.startDate,
          endDate: data.endDate,
          description: data.description,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      });

      if (list.length > 0) {
        // Sort years descending (newest on top)
        list.sort((a, b) => b.name.localeCompare(a.name));
        setAvailableYears(list);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("qs_cached_academic_years", JSON.stringify(list));
          } catch (e) {}
        }

        // Find official default year configured in database
        const defaultItem = list.find(l => l.isDefault) || list.find(l => l.status === "Aktif") || list[0];
        if (defaultItem) {
          setSchoolDefaultYear(defaultItem.name);
          setSchoolDefaultSemester(defaultItem.semester || "Ganjil");

          // If user hasn't explicitly chosen a session year/sem in localStorage, sync with official default
          if (!savedYear) {
            setActiveAcademicYearState(defaultItem.name);
            setActiveSemesterState(defaultItem.semester || "Ganjil");
          }
        }
      } else {
        // Initialize default years in Firestore if empty
        initializeDefaultYearsInFirestore();
      }
      setLoading(false);
    }, (err) => {
      console.warn("Academic years Firestore listener fallback:", err);
      setLoading(false);
    });

    return () => unsubYears();
  }, []);

  const initializeDefaultYearsInFirestore = async () => {
    try {
      const batch = writeBatch(db);
      DEFAULT_YEARS.forEach(y => {
        const ref = doc(db, "academicYears", y.id);
        batch.set(ref, {
          name: y.name,
          semester: y.semester,
          isDefault: y.isDefault,
          status: y.status,
          startDate: y.startDate,
          endDate: y.endDate,
          createdAt: serverTimestamp(),
        }, { merge: true });
      });
      await batch.commit();
    } catch (e) {
      console.warn("Could not seed default academic years in Firestore:", e);
    }
  };

  const activeAcademicYearId = normalizeYearId(activeAcademicYear);
  const periodKey = `${activeAcademicYearId}_${activeSemester}`;
  const isArchiveMode = 
    normalizeYearDisplay(activeAcademicYear) !== normalizeYearDisplay(schoolDefaultYear) || 
    activeSemester !== schoolDefaultSemester;

  const setActiveAcademicYear = useCallback((year: string) => {
    const formatted = normalizeYearDisplay(year);
    setActiveAcademicYearState(formatted);
    if (typeof window !== "undefined") {
      localStorage.setItem("qs_active_year", formatted);
    }
  }, []);

  const setActiveSemester = useCallback((semester: "Ganjil" | "Genap") => {
    setActiveSemesterState(semester);
    if (typeof window !== "undefined") {
      localStorage.setItem("qs_active_sem", semester);
    }
  }, []);

  const resetToSchoolDefault = useCallback(() => {
    setActiveAcademicYear(schoolDefaultYear);
    setActiveSemester(schoolDefaultSemester);
  }, [schoolDefaultYear, schoolDefaultSemester, setActiveAcademicYear, setActiveSemester]);

  // Set official school-wide active period in Firestore
  const setSchoolActivePeriod = useCallback(async (yearName: string, semester: "Ganjil" | "Genap") => {
    const normName = normalizeYearDisplay(yearName);
    const targetId = normalizeYearId(yearName);

    // 1. Optimistic Local State & LocalStorage Update
    setSchoolDefaultYear(normName);
    setSchoolDefaultSemester(semester);
    setActiveAcademicYear(normName);
    setActiveSemester(semester);

    setAvailableYears(prev => {
      const updated = prev.map(y => {
        const isTarget = y.id === targetId || y.name === normName;
        return {
          ...y,
          isDefault: isTarget,
          status: (isTarget ? "Aktif" : "Arsip") as "Aktif" | "Arsip" | "Mendatang",
          semester: isTarget ? semester : y.semester,
        };
      });
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("qs_cached_academic_years", JSON.stringify(updated));
        } catch (e) {}
      }
      return updated;
    });

    // 2. Persist to Firestore
    try {
      const batch = writeBatch(db);

      availableYears.forEach(y => {
        const ref = doc(db, "academicYears", y.id);
        const isTarget = y.id === targetId || y.name === normName;
        batch.set(ref, {
          isDefault: isTarget,
          status: isTarget ? "Aktif" : "Arsip",
          semester: isTarget ? semester : y.semester,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      });

      const targetRef = doc(db, "academicYears", targetId);
      batch.set(targetRef, {
        name: normName,
        semester: semester,
        isDefault: true,
        status: "Aktif",
        updatedAt: serverTimestamp(),
      }, { merge: true });

      const profileRef = doc(db, "settings", "school_profile");
      batch.set(profileRef, {
        activeAcademicYear: normName,
        activeSemester: semester,
        activeAcademicYearId: targetId,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      await batch.commit();
      return { success: true };
    } catch (err: any) {
      console.warn("Failed to set school active period in Firestore (persisted in local session):", err);
      if (err?.code === "permission-denied" || err?.message?.includes("permissions")) {
        return {
          success: true,
          savedLocally: true,
          permissionWarning: true,
          message: "Periode diaktifkan di sesi browser. Catatan: Aturan firestore.rules untuk 'academicYears' belum dipublish di Firebase Console."
        };
      }
      throw err;
    }
  }, [availableYears, setActiveAcademicYear, setActiveSemester]);

  // Create new academic year document in Firestore without overwriting or deleting previous data
  const createAcademicYear = useCallback(async (
    name: string,
    semester: "Ganjil" | "Genap" = "Ganjil",
    options?: { startDate?: string; endDate?: string; setAsActive?: boolean }
  ) => {
    const normName = normalizeYearDisplay(name);
    const targetId = normalizeYearId(name);
    const setAsActive = !!options?.setAsActive;

    // 1. Optimistic Local State & LocalStorage Update
    const newItem: AcademicYearItem = {
      id: targetId,
      name: normName,
      semester: semester,
      isDefault: setAsActive,
      status: setAsActive ? "Aktif" : "Mendatang",
      startDate: options?.startDate || "",
      endDate: options?.endDate || "",
    };

    setAvailableYears(prev => {
      const filtered = prev.filter(y => y.id !== targetId && y.name !== normName);
      const updated = setAsActive
        ? filtered.map(y => ({ ...y, isDefault: false, status: "Arsip" as const }))
        : filtered;
      const combined = [newItem, ...updated].sort((a, b) => b.name.localeCompare(a.name));
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("qs_cached_academic_years", JSON.stringify(combined));
        } catch (e) {}
      }
      return combined;
    });

    if (setAsActive) {
      setSchoolDefaultYear(normName);
      setSchoolDefaultSemester(semester);
      setActiveAcademicYear(normName);
      setActiveSemester(semester);
    }

    // 2. Persist to Firestore
    try {
      const batch = writeBatch(db);

      if (setAsActive) {
        availableYears.forEach(y => {
          const ref = doc(db, "academicYears", y.id);
          batch.set(ref, {
            isDefault: false,
            status: "Arsip",
            updatedAt: serverTimestamp(),
          }, { merge: true });
        });

        const profileRef = doc(db, "settings", "school_profile");
        batch.set(profileRef, {
          activeAcademicYear: normName,
          activeSemester: semester,
          activeAcademicYearId: targetId,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }

      const newDocRef = doc(db, "academicYears", targetId);
      batch.set(newDocRef, {
        name: normName,
        semester: semester,
        isDefault: setAsActive,
        status: setAsActive ? "Aktif" : "Mendatang",
        startDate: options?.startDate || "",
        endDate: options?.endDate || "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      await batch.commit();
      return { success: true };
    } catch (err: any) {
      console.warn("Firestore write skipped or rejected for academicYears (saved in local session):", err);
      if (err?.code === "permission-denied" || err?.message?.includes("permissions")) {
        return {
          success: true,
          savedLocally: true,
          permissionWarning: true,
          message: "Tahun ajaran berhasil dibuat dan aktif di sesi browser. Catatan: Aturan firestore.rules di Firebase Console perlu dipublish untuk koleksi 'academicYears' agar tersimpan permanen di cloud."
        };
      }
      throw err;
    }
  }, [availableYears, setActiveAcademicYear, setActiveSemester]);

  // Mark an academic year as Archived
  const archiveAcademicYear = useCallback(async (yearIdOrName: string) => {
    const targetId = normalizeYearId(yearIdOrName);

    // Optimistic Local State Update
    setAvailableYears(prev => {
      const updated = prev.map(y => (y.id === targetId || y.name === yearIdOrName) ? { ...y, status: "Arsip" as const, isDefault: false } : y);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("qs_cached_academic_years", JSON.stringify(updated));
        } catch (e) {}
      }
      return updated;
    });

    try {
      const ref = doc(db, "academicYears", targetId);
      await setDoc(ref, {
        status: "Arsip",
        isDefault: false,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      return { success: true };
    } catch (err: any) {
      console.warn("Failed to archive academic year in Firestore (applied locally):", err);
      if (err?.code === "permission-denied" || err?.message?.includes("permissions")) {
        return {
          success: true,
          savedLocally: true,
          permissionWarning: true,
        };
      }
      throw err;
    }
  }, []);

  // Helper function to check if any item matches the currently active period
  const matchesCurrentPeriod = useCallback((
    itemOrYear?: { academicYear?: string; semester?: string; academicYearId?: string } | string | null,
    semesterParam?: string | null
  ) => {
    if (!itemOrYear) return false;

    let itemYear = "";
    let itemSemester = semesterParam || "";
    let itemId = "";

    if (typeof itemOrYear === "string") {
      itemYear = itemOrYear;
    } else {
      itemYear = itemOrYear.academicYear || "";
      if (!itemSemester && itemOrYear.semester) itemSemester = itemOrYear.semester;
      if (itemOrYear.academicYearId) itemId = itemOrYear.academicYearId;
    }

    // Check Academic Year match
    if (itemYear) {
      const itemYr = normalizeYearDisplay(itemYear);
      const currYr = normalizeYearDisplay(activeAcademicYear);
      if (itemYr !== currYr) return false;
    } else if (itemId) {
      const parsedId = normalizeYearId(itemId);
      if (parsedId !== activeAcademicYearId) return false;
    }

    // Check Semester match
    if (itemSemester) {
      const itemSem = itemSemester.trim().toLowerCase();
      const currSem = activeSemester.trim().toLowerCase();
      if (itemSem !== currSem) return false;
    }

    return true;
  }, [activeAcademicYear, activeAcademicYearId, activeSemester]);

  return (
    <AcademicYearContext.Provider
      value={{
        activeAcademicYear,
        activeAcademicYearId,
        activeSemester,
        periodKey,
        schoolDefaultYear,
        schoolDefaultSemester,
        isArchiveMode,
        availableYears,
        academicYears: availableYears,
        academicYearsList: availableYears,
        loading,
        setActiveAcademicYear,
        setActiveSemester,
        resetToSchoolDefault,
        setSchoolActivePeriod,
        createAcademicYear,
        archiveAcademicYear,
        matchesCurrentPeriod,
      }}
    >
      {children}
    </AcademicYearContext.Provider>
  );
}

export function useAcademicYear() {
  const context = useContext(AcademicYearContext);
  if (!context) {
    throw new Error("useAcademicYear must be used within an AcademicYearProvider");
  }
  return context;
}
