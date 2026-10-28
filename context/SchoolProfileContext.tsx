"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import {
  EducationalStage,
  VocationalProgram,
  StageConfig,
  detectStageFromSchoolType,
  getStageConfig,
  getGradeLevelsForStage,
  getMajorOptionsForStage,
  DEFAULT_VOCATIONAL_PRESETS,
  STAGE_CONFIGS,
} from "@/lib/school-level-config";

import { OperationalDaysPattern } from "@/lib/operational-days";
import {
  SchoolProfile,
  DEFAULT_SCHOOL_PROFILE
} from "@/lib/school-profile-config";

export type { EducationalStage, VocationalProgram, StageConfig, OperationalDaysPattern };
export type { SchoolProfile };
export { DEFAULT_SCHOOL_PROFILE };

const STORAGE_KEY = "quick_schools_school_profile";

interface SchoolProfileContextType {
  profile: SchoolProfile;
  loading: boolean;
  saveProfile: (data: Partial<SchoolProfile>) => Promise<{ success: boolean; error?: string }>;
  resetToDefault: () => Promise<void>;
  currentStage: EducationalStage;
  stageConfig: StageConfig;
  gradeLevels: string[];
  majorOptions: { label: string; value: string; field?: string }[];
  setEducationalStage: (stage: EducationalStage) => Promise<{ success: boolean; error?: string }>;
  addVocationalProgram: (program: Omit<VocationalProgram, "id">) => Promise<{ success: boolean; error?: string }>;
  updateVocationalProgram: (id: string, updates: Partial<VocationalProgram>) => Promise<{ success: boolean; error?: string }>;
  deleteVocationalProgram: (id: string) => Promise<{ success: boolean; error?: string }>;
  resetVocationalProgramsToDefault: () => Promise<{ success: boolean; error?: string }>;
}

const defaultContextValue: SchoolProfileContextType = {
  profile: DEFAULT_SCHOOL_PROFILE,
  loading: false,
  saveProfile: async () => ({ success: false }),
  resetToDefault: async () => { },
  currentStage: "SMA",
  stageConfig: STAGE_CONFIGS.SMA,
  gradeLevels: STAGE_CONFIGS.SMA.gradeLevels,
  majorOptions: STAGE_CONFIGS.SMA.defaultMajors,
  setEducationalStage: async () => ({ success: false }),
  addVocationalProgram: async () => ({ success: false }),
  updateVocationalProgram: async () => ({ success: false }),
  deleteVocationalProgram: async () => ({ success: false }),
  resetVocationalProgramsToDefault: async () => ({ success: false }),
};

const SchoolProfileContext = createContext<SchoolProfileContextType>(defaultContextValue);

export function SchoolProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<SchoolProfile>(DEFAULT_SCHOOL_PROFILE);
  const [loading, setLoading] = useState(true);

  // 1. Immediately hydrate from localStorage and backend
  useEffect(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const resolvedStage = parsed.educationalStage || detectStageFromSchoolType(parsed.schoolType || DEFAULT_SCHOOL_PROFILE.schoolType);
        setProfile((prev) => ({
          ...prev,
          ...parsed,
          educationalStage: resolvedStage,
        }));
      }
    } catch (e) { }

    // Fetch from backend API
    fetch("/api/school-profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.profile) {
          const resolvedStage = data.profile.educationalStage || detectStageFromSchoolType(data.profile.schoolType || DEFAULT_SCHOOL_PROFILE.schoolType);
          setProfile((prev) => ({
            ...prev,
            ...data.profile,
            educationalStage: resolvedStage,
          }));
        }
      })
      .catch(() => { })
      .finally(() => setLoading(false));
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
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        setProfile(merged);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("school-profile-updated", { detail: merged }));
        }

        await fetch("/api/school-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(merged),
        });

        return { success: true };
      } catch (err: any) {
        return { success: true };
      }
    },
    [profile]
  );

  const resetToDefault = useCallback(async () => {
    await saveProfile(DEFAULT_SCHOOL_PROFILE);
  }, [saveProfile]);

  const currentStage: EducationalStage = profile.educationalStage || detectStageFromSchoolType(profile.schoolType);
  const stageConfig = getStageConfig(currentStage);
  const gradeLevels = getGradeLevelsForStage(currentStage);
  const majorOptions = getMajorOptionsForStage(currentStage, profile.vocationalPrograms);

  const setEducationalStage = useCallback(
    async (stage: EducationalStage): Promise<{ success: boolean; error?: string }> => {
      const updates: Partial<SchoolProfile> = {
        educationalStage: stage,
      };
      if (stage === "SMK" && (!profile.vocationalPrograms || profile.vocationalPrograms.length === 0)) {
        updates.vocationalPrograms = DEFAULT_VOCATIONAL_PRESETS.map((p, i) => ({
          id: `prog_${Date.now()}_${i + 1}`,
          ...p,
        }));
      }
      return await saveProfile(updates);
    },
    [profile, saveProfile]
  );

  const addVocationalProgram = useCallback(
    async (program: Omit<VocationalProgram, "id">): Promise<{ success: boolean; error?: string }> => {
      const currentList = Array.isArray(profile.vocationalPrograms) ? [...profile.vocationalPrograms] : [];
      const newProgram: VocationalProgram = {
        ...program,
        id: `prog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      currentList.push(newProgram);
      return await saveProfile({ vocationalPrograms: currentList });
    },
    [profile, saveProfile]
  );

  const updateVocationalProgram = useCallback(
    async (id: string, updates: Partial<VocationalProgram>): Promise<{ success: boolean; error?: string }> => {
      const currentList = Array.isArray(profile.vocationalPrograms) ? [...profile.vocationalPrograms] : [];
      const updatedList = currentList.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p));
      return await saveProfile({ vocationalPrograms: updatedList });
    },
    [profile, saveProfile]
  );

  const deleteVocationalProgram = useCallback(
    async (id: string): Promise<{ success: boolean; error?: string }> => {
      const currentList = Array.isArray(profile.vocationalPrograms) ? [...profile.vocationalPrograms] : [];
      const filtered = currentList.filter((p) => p.id !== id);
      return await saveProfile({ vocationalPrograms: filtered });
    },
    [profile, saveProfile]
  );

  const resetVocationalProgramsToDefault = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    const resetList: VocationalProgram[] = DEFAULT_VOCATIONAL_PRESETS.map((p, i) => ({
      id: `prog_${Date.now()}_${i + 1}`,
      ...p,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    return await saveProfile({ vocationalPrograms: resetList });
  }, [saveProfile]);

  return (
    <SchoolProfileContext.Provider
      value={{
        profile,
        loading,
        saveProfile,
        resetToDefault,
        currentStage,
        stageConfig,
        gradeLevels,
        majorOptions,
        setEducationalStage,
        addVocationalProgram,
        updateVocationalProgram,
        deleteVocationalProgram,
        resetVocationalProgramsToDefault,
      }}
    >
      {children}
    </SchoolProfileContext.Provider>
  );
}

export function useSchoolProfile(): SchoolProfileContextType {
  const context = useContext(SchoolProfileContext);
  return context || defaultContextValue;
}
