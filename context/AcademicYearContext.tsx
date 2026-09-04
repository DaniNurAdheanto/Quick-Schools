"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { collection, onSnapshot, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface AcademicYearContextType {
  activeAcademicYear: string;
  activeSemester: string;
  availableYears: Array<{ id: string; name: string; isDefault?: boolean }>;
  setActiveAcademicYear: (year: string) => void;
  setActiveSemester: (semester: string) => void;
  loading: boolean;
}

const AcademicYearContext = createContext<AcademicYearContextType>({
  activeAcademicYear: "2025/2026",
  activeSemester: "Ganjil",
  availableYears: [{ id: "2025/2026", name: "2025/2026", isDefault: true }, { id: "2024/2025", name: "2024/2025" }],
  setActiveAcademicYear: () => {},
  setActiveSemester: () => {},
  loading: false,
});

export function AcademicYearProvider({ children }: { children: ReactNode }) {
  const [activeAcademicYear, setActiveAcademicYearState] = useState<string>("2025/2026");
  const [activeSemester, setActiveSemesterState] = useState<string>("Ganjil");
  const [availableYears, setAvailableYears] = useState<Array<{ id: string; name: string; isDefault?: boolean }>>([
    { id: "2025/2026", name: "2025/2026", isDefault: true },
    { id: "2024/2025", name: "2024/2025" },
    { id: "2023/2024", name: "2023/2024" }
  ]);
  const [loading, setLoading] = useState<boolean>(true);

  // Load initial settings from localStorage & Firestore
  useEffect(() => {
    const savedYear = typeof window !== "undefined" ? localStorage.getItem("qs_active_year") : null;
    const savedSem = typeof window !== "undefined" ? localStorage.getItem("qs_active_sem") : null;
    
    if (savedYear) setActiveAcademicYearState(savedYear);
    if (savedSem) setActiveSemesterState(savedSem);

    const unsubYears = onSnapshot(collection(db, "academicYears"), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      if (list.length > 0) {
        setAvailableYears(list);
        // Find default active year if not saved locally
        if (!savedYear) {
          const defaultItem = list.find(l => l.isDefault) || list[0];
          if (defaultItem?.name) setActiveAcademicYearState(defaultItem.name);
        }
      }
      setLoading(false);
    }, (err) => {
      console.warn("Academic years listener fallback:", err);
      setLoading(false);
    });

    return () => unsubYears();
  }, []);

  const setActiveAcademicYear = (year: string) => {
    setActiveAcademicYearState(year);
    if (typeof window !== "undefined") {
      localStorage.setItem("qs_active_year", year);
    }
  };

  const setActiveSemester = (semester: string) => {
    setActiveSemesterState(semester);
    if (typeof window !== "undefined") {
      localStorage.setItem("qs_active_sem", semester);
    }
  };

  return (
    <AcademicYearContext.Provider
      value={{
        activeAcademicYear,
        activeSemester,
        availableYears,
        setActiveAcademicYear,
        setActiveSemester,
        loading
      }}
    >
      {children}
    </AcademicYearContext.Provider>
  );
}

export function useAcademicYear() {
  return useContext(AcademicYearContext);
}
