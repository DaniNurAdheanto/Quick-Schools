"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

export interface AcademicYearItem {
  id: string; // e.g. "2025-2026"
  name: string; // e.g. "2025/2026"
  semester: "Ganjil" | "Genap";
  isDefault: boolean;
  status: "Aktif" | "Arsip" | "Mendatang";
  startDate?: string;
  endDate?: string;
  description?: string;
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

  const fetchYearsFromPg = useCallback(async () => {
    try {
      const res = await fetch("/api/academic-years");
      const data = await res.json();
      if (data.success && Array.isArray(data.academicYears) && data.academicYears.length > 0) {
        setAvailableYears(data.academicYears);
        const defaultItem =
          data.academicYears.find((l: AcademicYearItem) => l.isDefault) ||
          data.academicYears.find((l: AcademicYearItem) => l.status === "Aktif") ||
          data.academicYears[0];
        if (defaultItem) {
          setSchoolDefaultYear(defaultItem.name);
          setSchoolDefaultSemester(defaultItem.semester || "Ganjil");
          const savedYear = typeof window !== "undefined" ? localStorage.getItem("qs_active_year") : null;
          if (!savedYear) {
            setActiveAcademicYearState(defaultItem.name);
            setActiveSemesterState(defaultItem.semester || "Ganjil");
          }
        }
      }
    } catch (e) {
      console.warn("Error fetching academic years from PostgreSQL:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedYear = typeof window !== "undefined" ? localStorage.getItem("qs_active_year") : null;
    const savedSem = typeof window !== "undefined" ? (localStorage.getItem("qs_active_sem") as "Ganjil" | "Genap") : null;
    if (savedYear) setActiveAcademicYearState(normalizeYearDisplay(savedYear));
    if (savedSem === "Ganjil" || savedSem === "Genap") setActiveSemesterState(savedSem);

    fetchYearsFromPg();
  }, [fetchYearsFromPg]);

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

  const setSchoolActivePeriod = useCallback(
    async (yearName: string, semester: "Ganjil" | "Genap") => {
      const normName = normalizeYearDisplay(yearName);
      setSchoolDefaultYear(normName);
      setSchoolDefaultSemester(semester);
      setActiveAcademicYear(normName);
      setActiveSemester(semester);

      try {
        await fetch("/api/academic-years", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "set_active", name: normName, semester }),
        });
        await fetchYearsFromPg();
        return { success: true };
      } catch (err: any) {
        return { success: true, savedLocally: true };
      }
    },
    [fetchYearsFromPg, setActiveAcademicYear, setActiveSemester]
  );

  const createAcademicYear = useCallback(
    async (
      name: string,
      semester: "Ganjil" | "Genap" = "Ganjil",
      options?: { startDate?: string; endDate?: string; setAsActive?: boolean }
    ) => {
      const normName = normalizeYearDisplay(name);
      try {
        await fetch("/api/academic-years", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: normName,
            semester,
            setAsActive: options?.setAsActive,
            startDate: options?.startDate,
            endDate: options?.endDate,
          }),
        });
        await fetchYearsFromPg();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    [fetchYearsFromPg]
  );

  const archiveAcademicYear = useCallback(
    async (yearIdOrName: string) => {
      setAvailableYears((prev) =>
        prev.map((y) =>
          y.id === yearIdOrName || y.name === yearIdOrName
            ? { ...y, status: "Arsip" as const, isDefault: false }
            : y
        )
      );
      return { success: true };
    },
    []
  );

  const matchesCurrentPeriod = useCallback(
    (
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

      if (itemYear) {
        const itemYr = normalizeYearDisplay(itemYear);
        const currYr = normalizeYearDisplay(activeAcademicYear);
        if (itemYr !== currYr) return false;
      } else if (itemId) {
        const parsedId = normalizeYearId(itemId);
        if (parsedId !== activeAcademicYearId) return false;
      }

      if (itemSemester) {
        const itemSem = itemSemester.trim().toLowerCase();
        const currSem = activeSemester.trim().toLowerCase();
        if (itemSem !== currSem) return false;
      }

      return true;
    },
    [activeAcademicYear, activeAcademicYearId, activeSemester]
  );

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
