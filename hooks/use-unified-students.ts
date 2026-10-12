"use client";

import { useState, useEffect, useCallback } from "react";

export interface UnifiedStudent {
  id: string;
  uid: string;
  nis: string;
  nisn: string;
  name: string;
  fullName: string;
  nickname?: string;
  email: string;
  gender: string;
  birthPlace?: string;
  birthDate?: string;
  religion?: string;
  nik?: string;
  address?: string;
  phone?: string;
  classId: string;
  className: string;
  major?: string;
  entryYear?: string;
  level?: string;
  status: string;
  onboardingCompleted: boolean;
  imageUrl?: string;
  photoUrl?: string;
  fatherName?: string;
  motherName?: string;
  guardianName?: string;
  parentPhone?: string;
  parentJob?: string;
  parentIncome?: string;
  parentAddress?: string;
  [key: string]: any;
}

const CACHE_KEY = "qs_cached_unified_students";

export function useUnifiedStudents() {
  const [students, setStudents] = useState<UnifiedStudent[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return [];
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const fetchStudents = useCallback(async () => {
    try {
      const res = await fetch("/api/students");
      const data = await res.json();
      if (data.success && Array.isArray(data.students)) {
        setStudents(data.students);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(data.students));
          } catch (e) {}
        }
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getStudentByIdOrName = useCallback(
    (identifier: string): UnifiedStudent | undefined => {
      if (!identifier) return undefined;
      const clean = identifier.trim().toLowerCase();
      return students.find(
        (s) =>
          s.id.toLowerCase() === clean ||
          s.nisn.toLowerCase() === clean ||
          s.nis.toLowerCase() === clean ||
          s.fullName.toLowerCase() === clean ||
          s.name.toLowerCase() === clean
      );
    },
    [students]
  );

  useEffect(() => {
    fetchStudents();
    const interval = setInterval(fetchStudents, 20000);
    return () => clearInterval(interval);
  }, [fetchStudents]);

  return {
    students,
    setStudents,
    loading,
    error,
    rawStudents: students,
    rawUsers: [] as any[],
    getStudentByIdOrName,
    refreshStudents: fetchStudents,
  };
}
