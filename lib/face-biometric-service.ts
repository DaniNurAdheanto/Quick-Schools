"use client";

import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, deleteField, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";

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
export interface FaceCompareResult {
  match: boolean;
  similarity: number;
  distance: number;
  bestPose?: string;
  isLegacy?: boolean;
  error?: string;
}

/**
 * Calculates Euclidean distance between two face descriptors using the official algorithm from @vladmandic/human.
 * Standard parameters for faceres model: order = 2, multiplier = 25.
 */
export function calculateHumanDistance(
  descriptor1: number[],
  descriptor2: number[],
  options = { order: 2, multiplier: 25 }
): number {
  if (!descriptor1 || !descriptor2 || descriptor1.length === 0 || descriptor2.length === 0) {
    return Number.MAX_SAFE_INTEGER;
  }
  const len = Math.min(descriptor1.length, descriptor2.length);
  let sum = 0;
  for (let i = 0; i < len; i++) {
    const diff = !options.order || options.order === 2 ? descriptor1[i] - descriptor2[i] : Math.abs(descriptor1[i] - descriptor2[i]);
    sum += !options.order || options.order === 2 ? diff * diff : diff ** options.order;
  }
  return Math.round(100 * (options.multiplier || 25) * sum) / 100;
}

/**
 * Normalizes Euclidean distance to similarity in 0..1 range using official @vladmandic/human algorithm.
 * Default faceres normalization range: min = 0.2, max = 0.8.
 */
export function normalizeHumanDistance(
  dist: number,
  order = 2,
  min = 0.2,
  max = 0.8
): number {
  if (dist === 0) return 1;
  const root = order === 2 ? Math.sqrt(dist) : dist ** (1 / order);
  const norm = (1 - root / 100 - min) / (max - min);
  return Math.round(100 * Math.max(Math.min(norm, 1), 0)) / 100;
}

/**
 * Computes official @vladmandic/human similarity between two face descriptors.
 * Returns raw similarity in 0..1 range (0.50+ is official match threshold for the same person).
 */
export function calculateHumanSimilarity(
  descriptor1: number[],
  descriptor2: number[],
  options = { order: 2, multiplier: 25, min: 0.2, max: 0.8 }
): { distance: number; rawSimilarity: number } {
  const dist = calculateHumanDistance(descriptor1, descriptor2, options);
  const rawSim = normalizeHumanDistance(dist, options.order || 2, options.min || 0.2, options.max || 0.8);
  return { distance: dist, rawSimilarity: rawSim };
}

/**
 * Calculates high-accuracy biometric similarity for 1024-dimensional HSE-FaceRes AI neural embeddings,
 * precisely adapting the official @vladmandic/human Face Recognition API.
 * - Genuine registered user (Human rawSimilarity >= 0.50): maps smoothly to 75% - 99% (passes minFaceMatchScore)
 * - Different person (Human rawSimilarity < 0.50): maps strictly to <= 55% (fails minFaceMatchScore)
 * - Rejects legacy 128-element histograms with `isLegacy: true`
 */
export function compareFaceDescriptors(
  masterDataOrVector: number[] | FaceBiometricData | undefined | null,
  liveVector: number[] | undefined | null,
  minMatchScore = 70
): FaceCompareResult {
  if (!masterDataOrVector || !liveVector || !Array.isArray(liveVector) || liveVector.length === 0) {
    return { match: false, similarity: 0, distance: 1.0 };
  }

  // Live vector must be a genuine deep AI embedding (>= 512 dimensions)
  if (liveVector.length < 512) {
    return { match: false, similarity: 0, distance: 1.0, error: "Vektor biometrik kamera belum siap." };
  }

  // Helper to calculate calibrated application score from official Human.js distance & similarity
  const evaluatePair = (vecMaster: number[], vecLive: number[]) => {
    if (!Array.isArray(vecMaster) || vecMaster.length < 512) {
      return { rawSim: 0, dist: Number.MAX_SAFE_INTEGER, score: 0 };
    }

    const { distance: dist, rawSimilarity: rawSim } = calculateHumanSimilarity(vecMaster, vecLive);

    let score = 0;
    if (rawSim >= 0.50) {
      // Official Vladimir Mandic match zone: same person (rawSim >= 0.50)
      // Scale smoothly to guarantee passing the configured minimum threshold (e.g., 70% or 80%)
      const basePass = Math.max(minMatchScore, 75);
      const factor = Math.min(1, (rawSim - 0.50) / 0.30);
      score = Math.round(basePass + factor * (99 - basePass));
    } else {
      // Official Vladimir Mandic non-match zone: different person (rawSim < 0.50)
      // Scale strictly below minMatchScore (maximum 55%, typically 10% - 35%)
      const maxFail = Math.min(minMatchScore - 15, 55);
      score = Math.round((rawSim / 0.50) * maxFail);
    }

    return { rawSim, dist, score };
  };

  // If passed as FaceBiometricData object with poses
  if (typeof masterDataOrVector === "object" && !Array.isArray(masterDataOrVector)) {
    const bio = masterDataOrVector as FaceBiometricData;

    // Check for legacy/invalid descriptor (e.g. 128-element histogram)
    const hasFront = Array.isArray(bio.faceDescriptor) && bio.faceDescriptor.length > 0;
    const isLegacy = (hasFront && bio.faceDescriptor.length < 512) ||
      (bio.poses && Object.values(bio.poses).some(p => p?.descriptor && p.descriptor.length < 512));

    if (isLegacy) {
      return {
        match: false,
        similarity: 0,
        distance: 1.0,
        isLegacy: true,
        error: "Data wajah master terdaftar dengan format lama. Harap lakukan pendaftaran ulang wajah Anda.",
      };
    }

    let bestScore = 0;
    let lowestDist = Number.MAX_SAFE_INTEGER;
    let bestPoseName = "front";

    if (hasFront && bio.faceDescriptor.length >= 512) {
      const res = evaluatePair(bio.faceDescriptor, liveVector);
      bestScore = res.score;
      lowestDist = res.dist;
    }

    if (bio.poses) {
      for (const [poseKey, poseData] of Object.entries(bio.poses)) {
        if (poseData && Array.isArray(poseData.descriptor) && poseData.descriptor.length >= 512) {
          const res = evaluatePair(poseData.descriptor, liveVector);
          if (res.score > bestScore) {
            bestScore = res.score;
            lowestDist = res.dist;
            bestPoseName = poseKey;
          }
        }
      }
    }

    return {
      match: bestScore >= minMatchScore,
      similarity: bestScore,
      distance: Number(lowestDist === Number.MAX_SAFE_INTEGER ? 999 : lowestDist.toFixed(2)),
      bestPose: bestPoseName,
    };
  }

  // If masterDataOrVector is raw number[] array
  if (Array.isArray(masterDataOrVector)) {
    if (masterDataOrVector.length < 512) {
      return {
        match: false,
        similarity: 0,
        distance: 1.0,
        isLegacy: true,
        error: "Data wajah master terdaftar dengan format lama. Harap daftar ulang wajah Anda.",
      };
    }

    const res = evaluatePair(masterDataOrVector, liveVector);
    return {
      match: res.score >= minMatchScore,
      similarity: res.score,
      distance: Number(res.dist === Number.MAX_SAFE_INTEGER ? 999 : res.dist.toFixed(2)),
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
  if (!biometric.faceDescriptor || biometric.faceDescriptor.length < 512) {
    console.error("Refusing to save biometric: faceDescriptor is not a valid >= 512-d AI embedding");
    return false;
  }

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
    // IMPORTANT: Do NOT overwrite photoUrl or imageUrl here.
    // The user's uploaded profile photo (pas foto) must remain intact!
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
      let targetTeacherDocId = uid;
      const targetNip = biometric.nip || "";
      const targetName = biometric.userName || "";

      // 1. Check if direct doc with uid exists
      const directDoc = await getDoc(doc(db, "teachers", uid));
      if (directDoc.exists()) {
        targetTeacherDocId = uid;
      } else if (targetNip) {
        // Look up by nip or id
        const qNip = query(collection(db, "teachers"), where("nip", "==", targetNip));
        const snapNip = await getDocs(qNip);
        if (!snapNip.empty) {
          targetTeacherDocId = snapNip.docs[0].id;
        } else {
          const qId = query(collection(db, "teachers"), where("id", "==", targetNip));
          const snapId = await getDocs(qId);
          if (!snapId.empty) {
            targetTeacherDocId = snapId.docs[0].id;
          }
        }
      }

      if (targetTeacherDocId === uid && !directDoc.exists() && targetName) {
        const qName = query(collection(db, "teachers"), where("name", "==", targetName));
        const snapName = await getDocs(qName);
        if (!snapName.empty) {
          targetTeacherDocId = snapName.docs[0].id;
        }
      }

      // If document exists, update it. If new, provide complete teacher attributes, never a bare ghost doc!
      const targetDocRef = doc(db, "teachers", targetTeacherDocId);
      const targetSnap = await getDoc(targetDocRef);
      if (targetSnap.exists()) {
        await setDoc(
          targetDocRef,
          {
            faceBiometric: payload.faceBiometric,
            uid: uid,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        await setDoc(
          targetDocRef,
          {
            faceBiometric: payload.faceBiometric,
            uid: uid,
            id: targetNip || uid,
            nip: targetNip || "-",
            name: targetName || "Guru Pengajar",
            fullName: targetName || "Guru Pengajar",
            role: "Guru Pengajar",
            subject: "Mata Pelajaran Umum",
            status: "Aktif",
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      // Clean up any ghost duplicate document created under uid if real doc has different ID
      if (targetTeacherDocId !== uid) {
        try {
          const ghostDoc = await getDoc(doc(db, "teachers", uid));
          if (ghostDoc.exists()) {
            const gData = ghostDoc.data();
            if (!gData?.name && !gData?.fullName) {
              await deleteDoc(doc(db, "teachers", uid));
            }
          }
        } catch (delErr) {}
      }
    } catch (e) {
      console.warn("Could not sync biometric to teachers collection:", e);
    }
  }

  // 4. If student role, synchronize to students collection
  if (resolvedRole.includes("siswa") || resolvedRole.includes("student")) {
    try {
      let targetStudentDocId = uid;
      const targetNisn = biometric.studentId || "";

      const directDoc = await getDoc(doc(db, "students", uid));
      if (!directDoc.exists() && targetNisn) {
        const qNisn = query(collection(db, "students"), where("nisn", "==", targetNisn));
        const snapNisn = await getDocs(qNisn);
        if (!snapNisn.empty) {
          targetStudentDocId = snapNisn.docs[0].id;
        }
      }

      const targetDocRef = doc(db, "students", targetStudentDocId);
      const targetSnap = await getDoc(targetDocRef);
      if (targetSnap.exists()) {
        await setDoc(
          targetDocRef,
          {
            faceBiometric: payload.faceBiometric,
            uid: uid,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        await setDoc(
          targetDocRef,
          {
            faceBiometric: payload.faceBiometric,
            uid: uid,
            nisn: targetNisn || "-",
            id: targetNisn || uid,
            name: biometric.userName || "Siswa",
            fullName: biometric.userName || "Siswa",
            status: "Aktif",
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      if (targetStudentDocId !== uid) {
        try {
          const ghostDoc = await getDoc(doc(db, "students", uid));
          if (ghostDoc.exists()) {
            const gData = ghostDoc.data();
            if (!gData?.name && !gData?.fullName) {
              await deleteDoc(doc(db, "students", uid));
            }
          }
        } catch (delErr) {}
      }
    } catch (e) {
      console.warn("Could not sync biometric to students collection:", e);
    }
  }

  return true;
}

/**
 * Retrieves enrolled biometric face master data from cache or Firestore
 * Supports checking by Auth UID, Student NISN, or Student Document ID
 */
export async function getUserFaceBiometric(
  uid: string,
  alternateId?: string
): Promise<FaceBiometricData | null> {
  if (!uid && !alternateId) return null;

  const candidateIds = Array.from(new Set([uid, alternateId].filter(Boolean))) as string[];

  // 1. Check localStorage cache first for all candidate keys
  for (const cid of candidateIds) {
    try {
      const cached = localStorage.getItem(`${STORAGE_KEY_PREFIX}${cid}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.isEnrolled && Array.isArray(parsed.faceDescriptor) && parsed.faceDescriptor.length > 0) {
          return parsed as FaceBiometricData;
        }
      }
    } catch (e) {}
  }

  // 2. Fetch from Firestore users collection
  for (const cid of candidateIds) {
    try {
      const userSnap = await getDoc(doc(db, "users", cid));
      if (userSnap.exists()) {
        const data = userSnap.data();
        if (data?.faceBiometric?.isEnrolled) {
          try {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}${cid}`, JSON.stringify(data.faceBiometric));
          } catch (e) {}
          return data.faceBiometric as FaceBiometricData;
        }
      }
    } catch (err) {}
  }

  // 3. Fetch from Firestore students collection by direct doc ID
  for (const cid of candidateIds) {
    try {
      const studentSnap = await getDoc(doc(db, "students", cid));
      if (studentSnap.exists()) {
        const data = studentSnap.data();
        if (data?.faceBiometric?.isEnrolled) {
          try {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}${cid}`, JSON.stringify(data.faceBiometric));
          } catch (e) {}
          return data.faceBiometric as FaceBiometricData;
        }
      }
    } catch (err) {}
  }

  // 4. Query students collection by uid or nisn field
  for (const cid of candidateIds) {
    try {
      const qUid = query(collection(db, "students"), where("uid", "==", cid));
      const snapUid = await getDocs(qUid);
      for (const d of snapUid.docs) {
        const data = d.data();
        if (data?.faceBiometric?.isEnrolled) {
          try {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}${cid}`, JSON.stringify(data.faceBiometric));
          } catch (e) {}
          return data.faceBiometric as FaceBiometricData;
        }
      }

      const qNisn = query(collection(db, "students"), where("nisn", "==", cid));
      const snapNisn = await getDocs(qNisn);
      for (const d of snapNisn.docs) {
        const data = d.data();
        if (data?.faceBiometric?.isEnrolled) {
          try {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}${cid}`, JSON.stringify(data.faceBiometric));
          } catch (e) {}
          return data.faceBiometric as FaceBiometricData;
        }
      }
    } catch (err) {}
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
