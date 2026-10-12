"use client";

import { useState, useEffect, useCallback } from "react";

export interface UnifiedTeacher {
  id: string;
  uid: string;
  nip: string;
  name: string;
  fullName: string;
  email: string;
  phone: string;
  contact: string;
  role: string;
  subject: string;
  subjectIds: string[];
  subjects: string[];
  homeroomClass?: string;
  status: "Aktif" | "Cuti" | "Nonaktif" | string;
  imageUrl?: string;
  photoUrl?: string;
  gender?: string;
  address?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

const CACHE_KEY = "qs_cached_unified_teachers";

export function useUnifiedTeachers() {
  const [teachers, setTeachers] = useState<UnifiedTeacher[]>(() => {
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

  const fetchTeachers = useCallback(async () => {
    try {
      const res = await fetch("/api/teachers");
      const data = await res.json();
      if (data.success && Array.isArray(data.teachers)) {
        setTeachers(data.teachers);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(data.teachers));
          } catch (e) {}
        }
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
    const interval = setInterval(fetchTeachers, 20000);
    return () => clearInterval(interval);
  }, [fetchTeachers]);

  return {
    teachers,
    setTeachers,
    loading,
    error,
    refreshTeachers: fetchTeachers,
  };
}
