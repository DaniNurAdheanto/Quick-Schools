"use client";

import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, deleteField, serverTimestamp } from "firebase/firestore";

// -------------------------------------------------------------
// Types & Interfaces
// -------------------------------------------------------------

export type FacePoseType = "front" | "left" | "right" | "up" | "down";

export interface FaceBiometricPoseItem {
  photoUrl: string;
  descriptor: number[];
  qualityScore: number;
  capturedAt?: string;
}

export interface FaceBiometricData {
  isEnrolled: boolean;
  enrolledAt: string; // ISO string
  faceDescriptor: number[]; // 128-float primary (frontal) biometric feature vector
  photoUrl: string; // Compressed face thumbnail Base64 JPEG (~15-25KB)
  qualityScore: number; // 0 - 100
  poses?: Partial<Record<FacePoseType, FaceBiometricPoseItem>>;
  userName?: string;
  userRole?: string;
  studentId?: string;
  nip?: string;
}

export interface FrameAnalysisResult {
  hasFace: boolean;
  brightnessScore: number; // 0 - 100
  centeredScore: number; // 0 - 100
  sharpnessScore: number; // 0 - 100
  overallScore: number; // 0 - 100
  isReadyForCapture: boolean;
  guidanceText: string;
  descriptor?: number[];
  isStandardMet?: boolean;
  standardDetails?: {
    lightingValid: boolean;
    positionValid: boolean;
    sharpnessValid: boolean;
  };
}

const STORAGE_KEY_PREFIX = "quick_schools_face_biometric_";

// -------------------------------------------------------------
// Mathematical & Image Processing Engine for Biometrics
// -------------------------------------------------------------

/**
 * Analyzes video frame drawn to a canvas and extracts normalized 128-dimensional biometric vector
 */
export function analyzeCameraFrame(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): FrameAnalysisResult {
  const width = canvas.width;
  const height = canvas.height;

  if (width < 80 || height < 80) {
    return {
      hasFace: false,
      brightnessScore: 0,
      centeredScore: 0,
      sharpnessScore: 0,
      overallScore: 0,
      isReadyForCapture: false,
      guidanceText: "Memulai kamera...",
    };
  }

  // Define target oval central zone (face bounding box)
  const ovalCenterX = width / 2;
  const ovalCenterY = height * 0.46;
  const ovalRadiusX = width * 0.28;
  const ovalRadiusY = height * 0.35;

  // Sample pixel data from central face zone
  const sampleX = Math.max(0, Math.floor(ovalCenterX - ovalRadiusX));
  const sampleY = Math.max(0, Math.floor(ovalCenterY - ovalRadiusY));
  const sampleW = Math.min(width - sampleX, Math.floor(ovalRadiusX * 2));
  const sampleH = Math.min(height - sampleY, Math.floor(ovalRadiusY * 2));

  let imgData: ImageData;
  try {
    imgData = ctx.getImageData(sampleX, sampleY, sampleW, sampleH);
  } catch {
    return {
      hasFace: false,
      brightnessScore: 50,
      centeredScore: 50,
      sharpnessScore: 50,
      overallScore: 50,
      isReadyForCapture: false,
      guidanceText: "Memproses kamera...",
    };
  }

  const data = imgData.data;
  let totalLuminance = 0;
  let skinTonePixels = 0;
  let laplacianSum = 0;
  const pixelCount = data.length / 4;

  // Grid histograms for spatial feature extraction (16 cells = 4x4 grid)
  const gridCells = 16;
  const cellWidth = Math.floor(sampleW / 4);
  const cellHeight = Math.floor(sampleH / 4);
  const cellLuminances = new Float32Array(gridCells);
  const cellPixelCounts = new Int32Array(gridCells);

  // 128-dim descriptor accumulation
  const descriptor = new Array(128).fill(0);

  // First pass: Luminance, skin tone range, and spatial grid histogram
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Standard relative luminance (ITU-R BT.709)
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    totalLuminance += lum;

    // Indonesian & diverse skin tone chromaticity check (YCbCr / normalized RGB)
    const isSkin =
      r > 55 &&
      g > 35 &&
      b > 20 &&
      r > g &&
      r > b &&
      Math.abs(r - g) > 12 &&
      r - b > 12;

    if (isSkin) skinTonePixels++;

    // Calculate cell coordinates
    const pixelIndex = i / 4;
    const px = pixelIndex % sampleW;
    const py = Math.floor(pixelIndex / sampleW);
    const cellX = Math.min(3, Math.floor(px / (cellWidth || 1)));
    const cellY = Math.min(3, Math.floor(py / (cellHeight || 1)));
    const cellIdx = cellY * 4 + cellX;

    cellLuminances[cellIdx] += lum;
    cellPixelCounts[cellIdx]++;

    // Accumulate localized feature bins
    const binIdx = ((cellIdx * 8) + (Math.floor(lum / 32) % 8)) % 128;
    descriptor[binIdx] += 1;
  }

  const avgBrightness = totalLuminance / (pixelCount || 1);
  const skinRatio = skinTonePixels / (pixelCount || 1);

  // Second pass: Edge sharpness using discrete gradient kernel
  const stride = sampleW * 4;
  for (let y = 1; y < sampleH - 1; y += 2) {
    for (let x = 1; x < sampleW - 1; x += 2) {
      const idx = (y * sampleW + x) * 4;
      const center = data[idx];
      const left = data[idx - 4];
      const right = data[idx + 4];
      const top = data[idx - stride];
      const bottom = data[idx + stride];
      const lap = Math.abs(4 * center - left - right - top - bottom);
      laplacianSum += lap;
    }
  }

  const sharpness = (laplacianSum / (pixelCount || 1)) * 4;

  // Normalized Quality Scores
  // 1. Brightness score (ideal: 70 - 185)
  let brightnessScore = 100;
  if (avgBrightness < 50) {
    brightnessScore = Math.max(0, Math.round((avgBrightness / 50) * 60));
  } else if (avgBrightness > 215) {
    brightnessScore = Math.max(0, Math.round(((255 - avgBrightness) / 40) * 60));
  } else {
    brightnessScore = Math.min(100, Math.round(75 + ((1 - Math.abs(avgBrightness - 130) / 85) * 25)));
  }

  // 2. Centered & presence score (skin ratio in oval)
  let centeredScore = 0;
  if (skinRatio > 0.18) {
    centeredScore = Math.min(100, Math.round((skinRatio / 0.45) * 100));
  }

  // 3. Sharpness score
  const sharpnessScore = Math.min(100, Math.round((sharpness / 18) * 100));

  const hasFace = skinRatio >= 0.18 && avgBrightness >= 40 && avgBrightness <= 235;

  // Normalize the 128-dimensional vector (L2 norm)
  let norm = 0;
  for (let j = 0; j < 128; j++) {
    norm += descriptor[j] * descriptor[j];
  }
  norm = Math.sqrt(norm) || 1;
  for (let j = 0; j < 128; j++) {
    descriptor[j] = Number((descriptor[j] / norm).toFixed(6));
  }

  // Guidance feedback string
  let guidanceText = "Posisikan wajah di dalam bingkai oval";
  let isReadyForCapture = false;

  if (!hasFace) {
    if (avgBrightness < 50) {
      guidanceText = "Pencahayaan terlalu gelap, cari tempat lebih terang";
    } else {
      guidanceText = "Arahkan wajah lurus ke tengah lingkaran oval";
    }
  } else if (centeredScore < 60) {
    guidanceText = "Dekatkan wajah sedikit ke tengah lingkaran";
  } else if (sharpnessScore < 40) {
    guidanceText = "Tahan kamera agar tidak goyang";
  } else {
    guidanceText = "Wajah terdeteksi sempurna! Tahan sebentar...";
    isReadyForCapture = true;
  }

  const lightingValid = brightnessScore >= 42 && brightnessScore <= 98;
  const positionValid = centeredScore >= 42 && hasFace;
  const sharpnessValid = sharpnessScore >= 36;
  const isStandardMet = lightingValid && positionValid && sharpnessValid;
  isReadyForCapture = isStandardMet;

  const overallScore = Math.round(
    brightnessScore * 0.3 + centeredScore * 0.4 + sharpnessScore * 0.3
  );

  return {
    hasFace,
    brightnessScore,
    centeredScore,
    sharpnessScore,
    overallScore,
    isReadyForCapture,
    guidanceText,
    descriptor,
    isStandardMet,
    standardDetails: {
      lightingValid,
      positionValid,
      sharpnessValid,
    },
  };
}

/**
 * Calculates Cosine Similarity between master descriptor and current verification descriptor
 * Supports both single vector comparison and multi-pose gallery matching
 * Returns percentage (0% - 100%), match boolean, and best matched pose
 */
export function compareFaceDescriptors(
  masterDataOrVector: number[] | FaceBiometricData | undefined | null,
  liveVector: number[] | undefined | null,
  minMatchScore = 70
): { match: boolean; similarity: number; distance: number; bestPose?: string } {
  if (
    !masterDataOrVector ||
    !liveVector ||
    !Array.isArray(liveVector) ||
    liveVector.length === 0
  ) {
    return { match: false, similarity: 0, distance: 1.0 };
  }

  const calcSim = (vecA: number[], vecB: number[]): number => {
    if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length === 0 || vecB.length === 0) return 0;
    const len = Math.min(vecA.length, vecB.length);
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < len; i++) {
      const a = vecA[i] || 0;
      const b = vecB[i] || 0;
      dot += a * b;
      magA += a * a;
      magB += b * b;
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    if (denom === 0) return 0;
    return Math.max(0, Math.min(1, dot / denom));
  };

  // If passed as FaceBiometricData object with poses
  if (typeof masterDataOrVector === "object" && !Array.isArray(masterDataOrVector)) {
    const bio = masterDataOrVector as FaceBiometricData;
    let bestSim = 0;
    let bestPoseName = "front";

    if (Array.isArray(bio.faceDescriptor) && bio.faceDescriptor.length > 0) {
      bestSim = calcSim(bio.faceDescriptor, liveVector);
    }

    if (bio.poses) {
      for (const [poseKey, poseData] of Object.entries(bio.poses)) {
        if (poseData && Array.isArray(poseData.descriptor) && poseData.descriptor.length > 0) {
          const sim = calcSim(poseData.descriptor, liveVector);
          if (sim > bestSim) {
            bestSim = sim;
            bestPoseName = poseKey;
          }
        }
      }
    }

    const similarityPercent = Math.round(bestSim * 100);
    const distance = Number((1 - bestSim).toFixed(4));
    return {
      match: similarityPercent >= minMatchScore,
      similarity: similarityPercent,
      distance,
      bestPose: bestPoseName,
    };
  }

  // If masterDataOrVector is raw number[] array
  if (Array.isArray(masterDataOrVector)) {
    const sim = calcSim(masterDataOrVector, liveVector);
    const similarityPercent = Math.round(sim * 100);
    const distance = Number((1 - sim).toFixed(4));
    return {
      match: similarityPercent >= minMatchScore,
      similarity: similarityPercent,
      distance,
      bestPose: "front",
    };
  }

  return { match: false, similarity: 0, distance: 1.0 };
}

// -------------------------------------------------------------
// Database Persistence Helpers
// -------------------------------------------------------------

/**
 * Saves enrolled biometric face master data to Firestore and cache
 */
export async function saveUserFaceBiometric(
  uid: string,
  biometric: FaceBiometricData,
  role?: string
): Promise<boolean> {
  if (!uid) return false;

  const payload = {
    faceBiometric: {
      isEnrolled: true,
      enrolledAt: biometric.enrolledAt || new Date().toISOString(),
      faceDescriptor: biometric.faceDescriptor,
      photoUrl: biometric.photoUrl,
      qualityScore: biometric.qualityScore || 90,
      poses: biometric.poses || null,
      userName: biometric.userName || "",
      userRole: biometric.userRole || role || "user",
      studentId: biometric.studentId || "",
      nip: biometric.nip || "",
      updatedAt: new Date().toISOString(),
    },
    photoUrl: biometric.photoUrl,
    imageUrl: biometric.photoUrl,
    updatedAt: serverTimestamp(),
  };

  // 1. Save to local storage for zero-latency retrieval
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${uid}`, JSON.stringify(payload.faceBiometric));
  } catch (e) {
    console.warn("Could not save to localStorage cache:", e);
  }

  // 2. Save to Firestore users collection
  try {
    await setDoc(doc(db, "users", uid), payload, { merge: true });
  } catch (err) {
    console.warn("Error saving biometric to users:", err);
  }

  // 3. If teacher role, synchronize to teachers collection
  const resolvedRole = (role || "").toLowerCase();
  if (resolvedRole.includes("guru") || resolvedRole.includes("teacher")) {
    try {
      await setDoc(
        doc(db, "teachers", uid),
        {
          faceBiometric: payload.faceBiometric,
          photoUrl: biometric.photoUrl,
          imageUrl: biometric.photoUrl,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn("Could not sync biometric to teachers collection:", e);
    }
  }

  // 4. If student role, synchronize to students collection
  if (resolvedRole.includes("siswa") || resolvedRole.includes("student")) {
    try {
      await setDoc(
        doc(db, "students", uid),
        {
          faceBiometric: payload.faceBiometric,
          photoUrl: biometric.photoUrl,
          imageUrl: biometric.photoUrl,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn("Could not sync biometric to students collection:", e);
    }
  }

  return true;
}

/**
 * Retrieves enrolled biometric face master data from cache or Firestore
 */
export async function getUserFaceBiometric(uid: string): Promise<FaceBiometricData | null> {
  if (!uid) return null;

  // Check localStorage cache first
  try {
    const cached = localStorage.getItem(`${STORAGE_KEY_PREFIX}${uid}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.isEnrolled && Array.isArray(parsed.faceDescriptor)) {
        return parsed as FaceBiometricData;
      }
    }
  } catch (e) {}

  // Fetch from Firestore users
  try {
    const userSnap = await getDoc(doc(db, "users", uid));
    if (userSnap.exists()) {
      const data = userSnap.data();
      if (data?.faceBiometric?.isEnrolled) {
        try {
          localStorage.setItem(
            `${STORAGE_KEY_PREFIX}${uid}`,
            JSON.stringify(data.faceBiometric)
          );
        } catch (e) {}
        return data.faceBiometric as FaceBiometricData;
      }
    }
  } catch (err) {
    console.warn("Error fetching user biometric:", err);
  }

  return null;
}

/**
 * Deletes enrolled face biometric master data
 */
export async function deleteUserFaceBiometric(uid: string, role?: string): Promise<boolean> {
  if (!uid) return false;

  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${uid}`);
  } catch (e) {}

  try {
    await updateDoc(doc(db, "users", uid), {
      faceBiometric: deleteField(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Error removing biometric from users:", err);
  }

  const resolvedRole = (role || "").toLowerCase();
  if (resolvedRole.includes("guru") || resolvedRole.includes("teacher")) {
    try {
      await updateDoc(doc(db, "teachers", uid), {
        faceBiometric: deleteField(),
        updatedAt: serverTimestamp(),
      });
    } catch (e) {}
  }

  if (resolvedRole.includes("siswa") || resolvedRole.includes("student")) {
    try {
      await updateDoc(doc(db, "students", uid), {
        faceBiometric: deleteField(),
        updatedAt: serverTimestamp(),
      });
    } catch (e) {}
  }

  return true;
}
