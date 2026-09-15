"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

export interface SchoolProfile {
  schoolName: string;
  schoolCode: string;
  npsn: string;
  schoolType: string;
  accreditation: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string;
  principalName: string;
  principalNip: string;
  operatingHours: string;
  description: string;
  // Geolocation & Attendance Geofence
  latitude: number;
  longitude: number;
  radiusMeters: number;
  locationAddress: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_SCHOOL_PROFILE: SchoolProfile = {
  schoolName: "SMA Garuda Nusantara Smart School",
  schoolCode: "SCH-GNS-2026",
  npsn: "20194820",
  schoolType: "SMA / Nasional Plus",
  accreditation: "A (Sangat Baik / Unggul)",
  address: "Jl. Pendidikan No. 45, Kompleks Akademika",
  city: "Jakarta Selatan",
  province: "DKI Jakarta",
  postalCode: "12430",
  phone: "+62 21 7890-1234",
  email: "info@garudanusa.sch.id",
  website: "https://garudanusa.sch.id",
  logoUrl: "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=400&auto=format&fit=crop&q=80",
  principalName: "Dr. Danur Adhi, M.Pd",
  principalNip: "19750812 200003 1 002",
  operatingHours: "06:30 - 16:00 WIB",
  description: "Pusat keunggulan pendidikan berbasis teknologi AI, biometrik, dan kepemimpinan berkarakter.",
  latitude: -6.200000,
  longitude: 106.816666,
  radiusMeters: 100,
  locationAddress: "Kampus Utama - Gerbang & Area Sekolah",
};

const STORAGE_KEY = "quick_schools_school_profile";

interface SchoolProfileContextType {
  profile: SchoolProfile;
  loading: boolean;
  saveProfile: (data: Partial<SchoolProfile>) => Promise<{ success: boolean; error?: string }>;
  resetToDefault: () => Promise<void>;
}

const defaultContextValue: SchoolProfileContextType = {
  profile: DEFAULT_SCHOOL_PROFILE,
  loading: false,
  saveProfile: async () => ({ success: false }),
  resetToDefault: async () => {},
};

const SchoolProfileContext = createContext<SchoolProfileContextType>(defaultContextValue);

export function SchoolProfileProvider({ children }: { children: ReactNode }) {
  // Always initialize with DEFAULT_SCHOOL_PROFILE to prevent SSR-Client hydration mismatch
  const [profile, setProfile] = useState<SchoolProfile>(DEFAULT_SCHOOL_PROFILE);
  const [loading, setLoading] = useState(true);

  // 1. Immediately hydrate from localStorage on client mount (safe from SSR hydration mismatches)
  useEffect(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        setProfile((prev) => ({
          ...prev,
          ...parsed,
          latitude: Number(parsed.latitude ?? prev.latitude ?? DEFAULT_SCHOOL_PROFILE.latitude),
          longitude: Number(parsed.longitude ?? prev.longitude ?? DEFAULT_SCHOOL_PROFILE.longitude),
          radiusMeters: Number(parsed.radiusMeters ?? prev.radiusMeters ?? DEFAULT_SCHOOL_PROFILE.radiusMeters),
        }));
      }
    } catch (e) {
      console.warn("Error parsing cached school profile:", e);
    }
  }, []);

  // 2. Sync real-time with Firestore when user is authenticated
  useEffect(() => {
    let isMounted = true;
    let unsubRoles: (() => void) | null = null;
    let unsubSettings: (() => void) | null = null;

    const unsubAuth = auth.onAuthStateChanged((currentUser) => {
      if (!isMounted) return;

      // Clean up previous listeners
      if (unsubRoles) {
        unsubRoles();
        unsubRoles = null;
      }
      if (unsubSettings) {
        unsubSettings();
        unsubSettings = null;
      }

      if (currentUser) {
        // Authenticated: Attach real-time listener to Firestore
        try {
          unsubRoles = onSnapshot(
            doc(db, "roles", "school_profile"),
            (snap) => {
              if (!isMounted) return;
              if (snap.exists()) {
                const data = snap.data() as Partial<SchoolProfile>;
                setProfile((prev) => {
                  const merged: SchoolProfile = {
                    ...prev,
                    ...data,
                    latitude: Number(data.latitude ?? prev.latitude),
                    longitude: Number(data.longitude ?? prev.longitude),
                    radiusMeters: Number(data.radiusMeters ?? prev.radiusMeters),
                  };
                  try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
                  } catch (e) {}
                  return merged;
                });
              }
              setLoading(false);
            },
            () => {
              // Graceful fallback to cached/default profile
              setLoading(false);
            }
          );
        } catch (e) {
          setLoading(false);
        }

        try {
          unsubSettings = onSnapshot(
            doc(db, "settings", "school_profile"),
            (snap) => {
              if (!isMounted) return;
              if (snap.exists()) {
                const data = snap.data() as Partial<SchoolProfile>;
                setProfile((prev) => {
                  const merged: SchoolProfile = {
                    ...prev,
                    ...data,
                    latitude: Number(data.latitude ?? prev.latitude),
                    longitude: Number(data.longitude ?? prev.longitude),
                    radiusMeters: Number(data.radiusMeters ?? prev.radiusMeters),
                  };
                  try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
                  } catch (e) {}
                  return merged;
                });
              }
            },
            () => {}
          );
        } catch (e) {}
      } else {
        // Unauthenticated (e.g. login page): No permission errors
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubAuth();
      if (unsubRoles) unsubRoles();
      if (unsubSettings) unsubSettings();
    };
  }, []);

  const saveProfile = useCallback(
    async (updatedData: Partial<SchoolProfile>): Promise<{ success: boolean; error?: string }> => {
      const merged: SchoolProfile = {
        ...profile,
        ...updatedData,
        latitude: Number(updatedData.latitude ?? profile.latitude),
        longitude: Number(updatedData.longitude ?? profile.longitude),
        radiusMeters: Number(updatedData.radiusMeters ?? profile.radiusMeters),
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.email || "Admin",
      };

      try {
        // 1. Save to primary Firestore store
        await setDoc(doc(db, "roles", "school_profile"), merged, { merge: true });

        // 2. Also save to settings/school_profile
        try {
          await setDoc(doc(db, "settings", "school_profile"), merged, { merge: true });
        } catch (e) {}

        // 3. Automatically sync location & radius into roles/attendance_config
        const attendancePayload = {
          schoolCenterLat: merged.latitude,
          schoolCenterLng: merged.longitude,
          geofenceRadiusMeters: merged.radiusMeters,
          schoolLat: merged.latitude,
          schoolLng: merged.longitude,
          gpsRadiusMeter: merged.radiusMeters,
          locationAddress: merged.locationAddress || merged.address,
          updatedAt: new Date().toISOString(),
          updatedBy: auth.currentUser?.email || "Admin",
        };

        try {
          await setDoc(doc(db, "roles", "attendance_config"), attendancePayload, { merge: true });
        } catch (e) {}

        // 4. Update localStorage for instant offline hydration across pages
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));

          // Also sync student attendance localStorage configs
          const cachedAtt = localStorage.getItem("quick_schools_attendance_config");
          const existingAtt = cachedAtt ? JSON.parse(cachedAtt) : {};
          localStorage.setItem(
            "quick_schools_attendance_config",
            JSON.stringify({
              ...existingAtt,
              ...attendancePayload,
            })
          );

          // Also sync teacher attendance localStorage config
          const cachedTeacherAtt = localStorage.getItem("smart_school_teacher_attendance_config_v1");
          const existingTeacherAtt = cachedTeacherAtt ? JSON.parse(cachedTeacherAtt) : {};
          localStorage.setItem(
            "smart_school_teacher_attendance_config_v1",
            JSON.stringify({
              ...existingTeacherAtt,
              geofenceCenter: {
                lat: merged.latitude,
                lng: merged.longitude,
                radiusMeters: merged.radiusMeters,
                address: merged.locationAddress || `${merged.schoolName} - Area Utama`,
              },
            })
          );
        } catch (e) {}

        // 5. Update local state
        setProfile(merged);

        return { success: true };
      } catch (err: any) {
        console.error("Failed to save school profile:", err);
        // Fallback to localStorage
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          setProfile(merged);
          return { success: true };
        } catch (e) {
          return { success: false, error: err.message || "Gagal menyimpan profil sekolah" };
        }
      }
    },
    [profile]
  );

  const resetToDefault = useCallback(async () => {
    await saveProfile(DEFAULT_SCHOOL_PROFILE);
  }, [saveProfile]);

  return (
    <SchoolProfileContext.Provider value={{ profile, loading, saveProfile, resetToDefault }}>
      {children}
    </SchoolProfileContext.Provider>
  );
}

export function useSchoolProfile(): SchoolProfileContextType {
  const context = useContext(SchoolProfileContext);
  return context || defaultContextValue;
}
