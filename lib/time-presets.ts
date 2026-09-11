import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

export interface TimePreset {
  id: string;
  name: string;
  label: string;
  start: string;
  end: string;
  startTime: string;
  endTime: string;
  description?: string;
}

export const DEFAULT_TIME_PRESETS: TimePreset[] = [
  {
    id: "preset-1",
    name: "Sesi 1",
    label: "07:00 - 08:30 (Sesi 1)",
    start: "07:00",
    end: "08:30",
    startTime: "07:00",
    endTime: "08:30",
    description: "Pagi / Jam Ke-1",
  },
  {
    id: "preset-2",
    name: "Sesi 2",
    label: "08:30 - 10:00 (Sesi 2)",
    start: "08:30",
    end: "10:00",
    startTime: "08:30",
    endTime: "10:00",
    description: "Pagi / Jam Ke-2",
  },
  {
    id: "preset-3",
    name: "Sesi 3",
    label: "10:30 - 12:00 (Sesi 3)",
    start: "10:30",
    end: "12:00",
    startTime: "10:30",
    endTime: "12:00",
    description: "Siang / Jam Ke-3 (Setelah Istirahat)",
  },
  {
    id: "preset-4",
    name: "Sesi 4",
    label: "13:00 - 14:30 (Sesi 4)",
    start: "13:00",
    end: "14:30",
    startTime: "13:00",
    endTime: "14:30",
    description: "Siang / Jam Ke-4 (Setelah Dzuhur)",
  },
  {
    id: "preset-5",
    name: "Sesi 5",
    label: "14:30 - 16:00 (Sesi 5)",
    start: "14:30",
    end: "16:00",
    startTime: "14:30",
    endTime: "16:00",
    description: "Sore / Jam Ke-5",
  },
];

const LOCAL_STORAGE_KEY = "quick_schools_time_presets";
const EVENT_NAME = "quick_schools_time_presets_changed";

export function normalizePreset(p: Partial<TimePreset> & Record<string, any>, idx: number = 0): TimePreset {
  const start = p.start || p.startTime || "07:00";
  const end = p.end || p.endTime || "08:30";
  const name = p.name || p.label?.replace(/\(.*?\)/g, "").trim() || `Sesi ${idx + 1}`;
  const label = p.label || `${start} - ${end} (${name})`;
  return {
    id: p.id || `preset-${Date.now()}-${idx}`,
    name,
    label,
    start,
    end,
    startTime: start,
    endTime: end,
    description: p.description || "",
  };
}

export function getTimePresetsSync(): TimePreset[] {
  if (typeof window === "undefined") return DEFAULT_TIME_PRESETS;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item, idx) => normalizePreset(item, idx));
      }
    }
  } catch (err) {
    console.warn("Failed to load time presets from localStorage", err);
  }
  return DEFAULT_TIME_PRESETS;
}

export async function saveTimePresets(presets: TimePreset[]): Promise<void> {
  const normalized = presets.map((p, idx) => normalizePreset(p, idx));

  // 1. LocalStorage
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: normalized }));
    } catch (err) {
      console.error("Failed to write presets to localStorage", err);
    }
  }

  // 2. Firestore Sync
  try {
    const ref = doc(db, "roles", "time_presets");
    await setDoc(
      ref,
      {
        presets: normalized,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("Could not sync presets to Firestore roles/time_presets:", err);
  }
}

export async function resetTimePresets(): Promise<void> {
  await saveTimePresets(DEFAULT_TIME_PRESETS);
}

export function useTimePresets() {
  const [presets, setPresets] = useState<TimePreset[]>(getTimePresetsSync);
  const [loading, setLoading] = useState<boolean>(true);

  // Initial load & Firestore real-time listener
  useEffect(() => {
    // 1. Load sync immediately
    const initial = getTimePresetsSync();
    setPresets(initial);
    setLoading(false);

    // 2. Listen to custom event and storage event
    const handleLocalEvent = (e: any) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setPresets(e.detail);
      } else {
        setPresets(getTimePresetsSync());
      }
    };
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_KEY) {
        setPresets(getTimePresetsSync());
      }
    };

    window.addEventListener(EVENT_NAME, handleLocalEvent);
    window.addEventListener("storage", handleStorageEvent);

    // 3. Firestore snapshot
    let unsubFirestore: (() => void) | null = null;
    try {
      const ref = doc(db, "roles", "time_presets");
      unsubFirestore = onSnapshot(
        ref,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (Array.isArray(data.presets) && data.presets.length > 0) {
              const normalized = data.presets.map((item: any, idx: number) => normalizePreset(item, idx));
              setPresets(normalized);
              try {
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
              } catch (e) {}
            }
          }
        },
        (error) => {
          // silently catch permission or network errors
          console.warn("Firestore time_presets onSnapshot error:", error);
        }
      );
    } catch (e) {
      console.warn("Firestore time_presets subscription failed:", e);
    }

    return () => {
      window.removeEventListener(EVENT_NAME, handleLocalEvent);
      window.removeEventListener("storage", handleStorageEvent);
      if (unsubFirestore) unsubFirestore();
    };
  }, []);

  const saveAll = useCallback(async (newPresets: TimePreset[]) => {
    setPresets(newPresets);
    await saveTimePresets(newPresets);
  }, []);

  const addPreset = useCallback(
    async (item: { name: string; startTime: string; endTime: string; description?: string }) => {
      const newPreset = normalizePreset({
        id: `preset-${Date.now()}`,
        name: item.name,
        startTime: item.startTime,
        endTime: item.endTime,
        start: item.startTime,
        end: item.endTime,
        label: `${item.startTime} - ${item.endTime} (${item.name})`,
        description: item.description,
      });
      const updated = [...presets, newPreset];
      setPresets(updated);
      await saveTimePresets(updated);
    },
    [presets]
  );

  const updatePreset = useCallback(
    async (id: string, patch: Partial<TimePreset>) => {
      const updated = presets.map((p) => {
        if (p.id !== id) return p;
        const merged = { ...p, ...patch };
        return normalizePreset(merged);
      });
      setPresets(updated);
      await saveTimePresets(updated);
    },
    [presets]
  );

  const deletePreset = useCallback(
    async (id: string) => {
      const updated = presets.filter((p) => p.id !== id);
      setPresets(updated);
      await saveTimePresets(updated);
    },
    [presets]
  );

  const resetToDefault = useCallback(async () => {
    setPresets(DEFAULT_TIME_PRESETS);
    await resetTimePresets();
  }, []);

  return {
    presets,
    loading,
    savePresets: saveAll,
    addPreset,
    updatePreset,
    deletePreset,
    resetToDefault,
  };
}
