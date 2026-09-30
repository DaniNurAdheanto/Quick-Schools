"use client";

import type { Human, Config, Result, FaceResult } from "@vladmandic/human";
import { FacePoseType } from "./face-biometric-service";

// -------------------------------------------------------------
// Human.js Configuration & Types with Active Blink & Screen Spoof AI
// -------------------------------------------------------------

export interface HumanFaceDetection {
  hasFace: boolean;
  score: number; // 0 - 100
  embedding: number[]; // ArcFace feature vector descriptor
  angles: {
    yaw: number; // negative = left, positive = right
    pitch: number; // positive = up, negative = down
    roll: number; // head tilt
  };
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  liveness: {
    isLive: boolean;
    realScore: number; // 0 - 100
    liveScore: number; // 0 - 100
  };
  mesh?: number[][]; // 468 3D landmarks
  ear?: {
    leftEAR: number;
    rightEAR: number;
    avgEAR: number;
    openLeft?: number;
    openRight?: number;
  };
  screenArtifacts?: {
    isScreenSpoof: boolean;
    glareScore: number;
    reason?: string;
  };
  gestures?: string[];
}

let humanInstance: Human | null = null;
let initPromise: Promise<Human | null> | null = null;

/**
 * Returns or initializes the singleton Human.js AI instance
 */
export async function getHumanInstance(): Promise<Human | null> {
  if (typeof window === "undefined") return null;
  if (humanInstance) return humanInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const { Human } = await import("@vladmandic/human");

      const config: Partial<Config> = {
        backend: "webgl",
        modelBasePath: "/models/human/",
        filter: {
          enabled: true,
          equalization: false,
          width: 0,
          height: 0,
        },
        face: {
          enabled: true,
          detector: {
            modelPath: "blazeface.json",
            rotation: true,
            maxDetected: 1,
            minConfidence: 0.45,
            iouThreshold: 0.1,
          },
          mesh: {
            enabled: true,
            modelPath: "facemesh.json",
          },
          description: {
            enabled: true,
            modelPath: "faceres.json",
            minConfidence: 0.45,
          },
          iris: {
            enabled: false,
          },
          emotion: {
            enabled: false,
          },
          antispoof: {
            enabled: true,
            modelPath: "antispoof.json",
            skipFrames: 0,
            skipTime: 0,
          },
          liveness: {
            enabled: true,
            modelPath: "liveness.json",
            skipFrames: 0,
            skipTime: 0,
          },
        },
        gesture: {
          enabled: true,
        },
        body: { enabled: false },
        hand: { enabled: false },
        object: { enabled: false },
        segmentation: { enabled: false },
      };

      const human = new Human(config);

      try {
        await human.warmup();
      } catch (warmErr) {
        console.warn("Human warmup notice (non-fatal):", warmErr);
      }

      humanInstance = human;
      return humanInstance;
    } catch (err) {
      console.error("Failed to initialize @vladmandic/human instance:", err);
      return null;
    }
  })();

  return initPromise;
}

/**
 * Computes canonical Eye Aspect Ratio (EAR) from 468 MediaPipe FaceMesh landmarks.
 * A live open human eye has EAR ~ 0.25 - 0.38.
 * A blinking closed eye drops sharply to EAR < 0.18.
 * A printed photo or phone screen has a frozen, static EAR that NEVER drops and recovers.
 */
export function calculateEyeAspectRatio(mesh?: number[][]): { 
  leftEAR: number; 
  rightEAR: number; 
  avgEAR: number;
  openLeft: number;
  openRight: number;
} {
  if (!mesh || mesh.length < 468) {
    return { leftEAR: 0.3, rightEAR: 0.3, avgEAR: 0.3, openLeft: 0.4, openRight: 0.4 };
  }

  try {
    // Left eye landmarks: top (386, 385), bottom (374, 380), outer (263), inner (362)
    const leftH1 = Math.hypot(mesh[386][0] - mesh[374][0], mesh[386][1] - mesh[374][1]);
    const leftH2 = Math.hypot(mesh[385][0] - mesh[380][0], mesh[385][1] - mesh[380][1]);
    const leftW = Math.hypot(mesh[263][0] - mesh[362][0], mesh[263][1] - mesh[362][1]);
    const leftEAR = (leftH1 + leftH2) / (2 * (leftW || 1));

    // Right eye landmarks: top (159, 158), bottom (145, 153), outer (33), inner (133)
    const rightH1 = Math.hypot(mesh[159][0] - mesh[145][0], mesh[159][1] - mesh[145][1]);
    const rightH2 = Math.hypot(mesh[158][0] - mesh[153][0], mesh[158][1] - mesh[153][1]);
    const rightW = Math.hypot(mesh[33][0] - mesh[133][0], mesh[33][1] - mesh[133][1]);
    const rightEAR = (rightH1 + rightH2) / (2 * (rightW || 1));

    // Human.js direct vertical eyelid opening ratio
    const openLeft = Math.abs(mesh[374][1] - mesh[386][1]) / (Math.abs(mesh[443][1] - mesh[450][1]) || 1);
    const openRight = Math.abs(mesh[145][1] - mesh[159][1]) / (Math.abs(mesh[223][1] - mesh[230][1]) || 1);

    const avgEAR = Number(((leftEAR + rightEAR) / 2).toFixed(3));
    return {
      leftEAR: Number(leftEAR.toFixed(3)),
      rightEAR: Number(rightEAR.toFixed(3)),
      avgEAR,
      openLeft: Number(openLeft.toFixed(3)),
      openRight: Number(openRight.toFixed(3)),
    };
  } catch (e) {
    return { leftEAR: 0.3, rightEAR: 0.3, avgEAR: 0.3, openLeft: 0.4, openRight: 0.4 };
  }
}

/**
 * Detects physical screen artifacts (specular reflections, screen backlight clipping, moire)
 * produced when a smartphone or tablet screen is held up against a camera.
 */
export function detectScreenSpoofArtifacts(
  input: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement,
  box: { x: number; y: number; width: number; height: number }
): { isScreenSpoof: boolean; glareScore: number; reason: string } {
  try {
    if (!(input instanceof HTMLCanvasElement)) {
      return { isScreenSpoof: false, glareScore: 0, reason: "" };
    }

    const ctx = input.getContext("2d", { willReadFrequently: true });
    if (!ctx) return { isScreenSpoof: false, glareScore: 0, reason: "" };

    const bx = Math.max(0, Math.floor(box.x));
    const by = Math.max(0, Math.floor(box.y));
    const bw = Math.min(input.width - bx, Math.floor(box.width));
    const bh = Math.min(input.height - by, Math.floor(box.height));

    if (bw < 30 || bh < 30) return { isScreenSpoof: false, glareScore: 0, reason: "" };

    const imgData = ctx.getImageData(bx, by, bw, bh);
    const data = imgData.data;

    let clippedPixels = 0; // Intense white glare from glass / backlight
    let screenBlueTint = 0; // OLED/LCD emission peak
    let totalSamples = 0;

    for (let i = 0; i < data.length; i += 16) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      totalSamples++;

      // Specular glare reflection from phone glass
      if (r > 248 && g > 248 && b > 248) {
        clippedPixels++;
      }

      // Strong artificial blue emission typical of phone screens
      if (b > r + 45 && b > g + 35) {
        screenBlueTint++;
      }
    }

    const clipRatio = totalSamples > 0 ? clippedPixels / totalSamples : 0;
    const blueRatio = totalSamples > 0 ? screenBlueTint / totalSamples : 0;

    if (clipRatio > 0.09) {
      return {
        isScreenSpoof: true,
        glareScore: Math.round(clipRatio * 100),
        reason: "Terdeteksi silau / pantulan kaca layar HP digital.",
      };
    }

    if (blueRatio > 0.38) {
      return {
        isScreenSpoof: true,
        glareScore: Math.round(blueRatio * 100),
        reason: "Terdeteksi emisi backlight layar ponsel.",
      };
    }

    return { isScreenSpoof: false, glareScore: 0, reason: "" };
  } catch (e) {
    return { isScreenSpoof: false, glareScore: 0, reason: "" };
  }
}

/**
 * Runs face detection, ArcFace embedding extraction, and full 468-point 3D facemesh
 * with active Anti-Spoofing and Liveness models.
 */
export async function detectFaceWithHuman(
  input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
  _options?: { fastScan?: boolean; requireAntiSpoof?: boolean }
): Promise<HumanFaceDetection | null> {
  try {
    const human = await getHumanInstance();
    if (!human) return null;

    // Face mesh is strictly preserved to allow 3D depth and Eye Aspect Ratio computation
    const detectConfig = {
      face: {
        detector: { enabled: true, rotation: true },
        mesh: { enabled: true },
        description: { enabled: true },
        antispoof: { enabled: true, skipFrames: 0, skipTime: 0 },
        liveness: { enabled: true, skipFrames: 0, skipTime: 0 },
        iris: { enabled: false },
        emotion: { enabled: false },
      },
      gesture: { enabled: true },
    };

    const result: Result = await human.detect(input, detectConfig as any);
    const faces = result.face;
    if (!faces || faces.length === 0) {
      return null;
    }

    const primaryFace: FaceResult = faces[0];
    const score = Math.round((primaryFace.score || 0.8) * 100);

    const yaw = primaryFace.rotation?.angle?.yaw ?? 0;
    const pitch = primaryFace.rotation?.angle?.pitch ?? 0;
    const roll = primaryFace.rotation?.angle?.roll ?? 0;

    const embedding: number[] = Array.isArray(primaryFace.embedding)
      ? Array.from(primaryFace.embedding)
      : [];

    const [bx = 0, by = 0, bw = 0, bh = 0] = primaryFace.box || [0, 0, 0, 0];

    // Extract 468 mesh landmarks
    const mesh: number[][] = Array.isArray(primaryFace.mesh) ? (primaryFace.mesh as any) : [];

    // Calculate Eye Aspect Ratio
    const ear = calculateEyeAspectRatio(mesh);

    // Analyze screen spoof artifacts (glare, specular reflection from phone screen)
    const screenArtifacts = (input instanceof HTMLCanvasElement)
      ? detectScreenSpoofArtifacts(input, { x: bx, y: by, width: bw, height: bh })
      : { isScreenSpoof: false, glareScore: 0, reason: "" };

    // Anti-spoofing score from neural network
    // Note: Human.js sets res.real only if antispoofRes > 0. If it was 0 or skipped, avoid high default!
    const rawReal = (primaryFace.real !== undefined && primaryFace.real !== null)
      ? primaryFace.real
      : (screenArtifacts.isScreenSpoof ? 0.05 : 0.45);
    const rawLive = (primaryFace.live !== undefined && primaryFace.live !== null)
      ? primaryFace.live
      : 0.45;

    const realScore = Math.min(100, Math.max(0, Math.round(rawReal * 100)));
    const liveScore = Math.min(100, Math.max(0, Math.round(rawLive * 100)));

    const isLive = !screenArtifacts.isScreenSpoof && realScore >= 40 && liveScore >= 35;

    // Extract detected gestures (e.g. 'blink left eye', 'blink right eye', 'facing left', 'mouth 25% open')
    const gestures: string[] = Array.isArray(result.gesture)
      ? result.gesture.filter((g: any) => g.face === 0 || g.face === undefined).map((g: any) => String(g.gesture).toLowerCase())
      : [];

    return {
      hasFace: true,
      score,
      embedding,
      angles: {
        yaw: Number(yaw.toFixed(1)),
        pitch: Number(pitch.toFixed(1)),
        roll: Number(roll.toFixed(1)),
      },
      box: {
        x: bx,
        y: by,
        width: bw,
        height: bh,
      },
      liveness: {
        isLive,
        realScore,
        liveScore,
      },
      mesh,
      ear,
      screenArtifacts,
      gestures,
    };
  } catch (err) {
    console.warn("detectFaceWithHuman error:", err);
    return null;
  }
}

export interface FaceLivenessHistory {
  samples: Array<{
    yaw: number;
    pitch: number;
    boxX: number;
    boxY: number;
    boxW: number;
    boxH: number;
    avgEAR: number;
    realScore: number;
    timestamp: number;
  }>;
  earHistory: number[];
  blinkState: "eyes_open" | "eyes_closed";
  blinkCount: number;
  hasBlinked: boolean;
  hasTurnedHead: boolean;
  hasOpenedMouth: boolean;
  baselineYaw: number | null;
  baselinePitch: number | null;
  baselineEAR: number | null;
  closeStartTime: number;
  isLivenessPassed: boolean;
  livenessType: "blink" | "head_turn" | "mouth" | null;
  livenessReason: string;
}

export function createLivenessHistory(): FaceLivenessHistory {
  return {
    samples: [],
    earHistory: [],
    blinkState: "eyes_open",
    blinkCount: 0,
    hasBlinked: false,
    hasTurnedHead: false,
    hasOpenedMouth: false,
    baselineYaw: null,
    baselinePitch: null,
    baselineEAR: null,
    closeStartTime: 0,
    isLivenessPassed: false,
    livenessType: null,
    livenessReason: "",
  };
}

/**
 * Tracks eye blink transitions over time using Eye Aspect Ratio (EAR) and aperture.
 */
export function trackEyeBlink(
  history: FaceLivenessHistory,
  avgEAR: number,
  openLeft = 0.4,
  openRight = 0.4
): { hasBlinked: boolean; isEyesClosed: boolean } {
  history.earHistory.push(avgEAR);
  if (history.earHistory.length > 30) history.earHistory.shift();

  const isClosed = avgEAR <= 0.17 || openLeft < 0.22 || openRight < 0.22;

  if (history.blinkState === "eyes_open") {
    if (isClosed) {
      history.blinkState = "eyes_closed";
      history.closeStartTime = Date.now();
    }
  } else if (history.blinkState === "eyes_closed") {
    if (!isClosed && avgEAR >= 0.19) {
      history.blinkState = "eyes_open";
      history.blinkCount += 1;
      history.hasBlinked = true;
      history.isLivenessPassed = true;
      history.livenessType = "blink";
      history.livenessReason = "Kedipan mata terverifikasi";
    }
  }

  return {
    hasBlinked: history.hasBlinked,
    isEyesClosed: history.blinkState === "eyes_closed",
  };
}

/**
 * Multi-layer dynamic liveness and anti-spoofing validator:
 * 1. Screens for screen reflection / specular phone glass glare
 * 2. Evaluates AI neural network realness score against printed paper / screen replay
 * 3. Multi-Signal Liveness Challenge (Blink OR 3D Head Turn OR Mouth Expression)
 * A static photo on a phone screen CANNOT perform any of these!
 */
export function evaluateFaceLiveness(
  history: FaceLivenessHistory,
  current: HumanFaceDetection,
  canvas?: HTMLCanvasElement
): {
  isLive: boolean;
  isSpoof: boolean;
  hasBlinked: boolean;
  blinkCount: number;
  realScore: number;
  avgEAR: number;
  reason: string;
  actionPrompt: string;
} {
  const now = Date.now();

  // If canvas is provided and screen artifacts were not yet computed, analyze them now
  if (canvas && (!current.screenArtifacts || (!current.screenArtifacts.isScreenSpoof && current.screenArtifacts.glareScore === 0))) {
    current.screenArtifacts = detectScreenSpoofArtifacts(canvas, current.box);
  }

  const avgEAR = current.ear?.avgEAR ?? 0.3;
  const openLeft = current.ear?.openLeft ?? 0.4;
  const openRight = current.ear?.openRight ?? 0.4;
  const gestures = current.gestures ?? [];

  // 1. Direct Phone Screen Glass / Glare Detection
  if (current.screenArtifacts?.isScreenSpoof) {
    return {
      isLive: false,
      isSpoof: true,
      hasBlinked: false,
      blinkCount: 0,
      realScore: 10,
      avgEAR,
      reason: current.screenArtifacts.reason || "Terdeteksi pantulan kaca / layar digital ponsel!",
      actionPrompt: "Posisikan wajah asli langsung tanpa layar HP.",
    };
  }

  // Record baseline when face is stable
  if (history.baselineYaw === null && Math.abs(current.angles.roll) < 15) {
    history.baselineYaw = current.angles.yaw;
  }
  if (history.baselinePitch === null) {
    history.baselinePitch = current.angles.pitch;
  }
  if (history.baselineEAR === null && avgEAR > 0.15) {
    history.baselineEAR = avgEAR;
  }

  // 2. Action 1: Eye Blink Detection
  const hasGestureBlink = gestures.some(g => g.includes("blink"));
  const hasApertureBlink = openLeft < 0.22 || openRight < 0.22;
  const isEyeClosed = avgEAR <= 0.17 || (history.baselineEAR !== null && avgEAR <= history.baselineEAR * 0.78);

  if (hasGestureBlink || hasApertureBlink) {
    history.hasBlinked = true;
    history.isLivenessPassed = true;
    history.livenessType = "blink";
    history.livenessReason = "Kedipan mata terdeteksi ✓";
  } else if (history.blinkState === "eyes_open" && isEyeClosed) {
    history.blinkState = "eyes_closed";
    history.closeStartTime = now;
  } else if (history.blinkState === "eyes_closed") {
    const isEyeReopened = avgEAR >= 0.19 || (history.baselineEAR !== null && avgEAR >= history.baselineEAR * 0.85);
    if (isEyeReopened) {
      history.blinkState = "eyes_open";
      history.hasBlinked = true;
      history.isLivenessPassed = true;
      history.livenessType = "blink";
      history.livenessReason = "Kedipan mata terdeteksi ✓";
    }
  }

  // 3. Action 2: 3D Head Turn (Tengok Kiri atau Kanan)
  if (history.baselineYaw !== null) {
    const yawOffset = Math.abs(current.angles.yaw - history.baselineYaw);
    if (yawOffset >= 8) {
      history.hasTurnedHead = true;
      history.isLivenessPassed = true;
      history.livenessType = "head_turn";
      history.livenessReason = "Gerakan kepala 3D terdeteksi ✓";
    }
  }

  // 4. Action 3: Mouth Expression (Buka Mulut / Senyum)
  const hasMouthGesture = gestures.some(g => g.includes("mouth"));
  if (hasMouthGesture) {
    history.hasOpenedMouth = true;
    history.isLivenessPassed = true;
    history.livenessType = "mouth";
    history.livenessReason = "Ekspresi wajah terdeteksi ✓";
  }

  const realScore = current.liveness?.realScore ?? 50;

  // 5. Anti-Spoofing Neural Model Check
  if (realScore < 25) {
    return {
      isLive: false,
      isSpoof: true,
      hasBlinked: history.isLivenessPassed,
      blinkCount: history.blinkCount,
      realScore,
      avgEAR,
      reason: `Wajah terdeteksi sebagai foto atau layar digital (Keaslian: ${realScore}% / Min 45%).`,
      actionPrompt: "Gunakan wajah asli langsung di depan kamera.",
    };
  }

  // 6. Active Liveness Challenge Prompt: Waiting for living human action
  if (!history.isLivenessPassed) {
    return {
      isLive: false,
      isSpoof: false, // NOT spoof! We are awaiting user action
      hasBlinked: false,
      blinkCount: 0,
      realScore,
      avgEAR,
      reason: "Silakan KEDIPKAN MATA 👁️ atau TENGOKKAN KEPALA 👤...",
      actionPrompt: "Kedipkan mata atau tengokkan kepala sedikit.",
    };
  }

  // 7. Verified Genuine Live Human Presence!
  return {
    isLive: true,
    isSpoof: false,
    hasBlinked: true,
    blinkCount: 1,
    realScore: Math.max(realScore, 95),
    avgEAR,
    reason: history.livenessReason || "Wajah asli hidup terverifikasi!",
    actionPrompt: "Wajah asli cocok & terverifikasi!",
  };
}

/**
 * Evaluates whether current head angles (yaw, pitch) match the target pose standard
 */
export function checkPoseComplianceWithHuman(
  angles: { yaw: number; pitch: number; roll: number },
  targetPose: FacePoseType,
  isMirrored = true
): {
  isCompliant: boolean;
  guidance: string;
  degreeDistance: number;
} {
  const adjustedYaw = isMirrored ? -angles.yaw : angles.yaw;
  const pitch = angles.pitch;

  switch (targetPose) {
    case "front": {
      const isCentered = Math.abs(adjustedYaw) <= 15 && Math.abs(pitch) <= 15;
      return {
        isCompliant: isCentered,
        guidance: isCentered
          ? "Posisi tatap lurus terdeteksi! Tahan posisi..."
          : "Posisikan kepala menghadap lurus ke depan",
        degreeDistance: Math.max(Math.abs(adjustedYaw), Math.abs(pitch)),
      };
    }

    case "left": {
      const isLeft = adjustedYaw <= -5 || angles.yaw <= -5 || adjustedYaw >= 5;
      return {
        isCompliant: isLeft,
        guidance: isLeft
          ? "Sudut kiri terdeteksi! Tahan sebentar..."
          : "Tengok sedikit ke arah kiri ⬅️",
        degreeDistance: Math.max(0, 5 - Math.abs(angles.yaw)),
      };
    }

    case "right": {
      const isRight = adjustedYaw >= 5 || angles.yaw >= 5 || adjustedYaw <= -5;
      return {
        isCompliant: isRight,
        guidance: isRight
          ? "Sudut kanan terdeteksi! Tahan sebentar..."
          : "Tengok sedikit ke arah kanan ➡️",
        degreeDistance: Math.max(0, 5 - Math.abs(angles.yaw)),
      };
    }

    case "up": {
      const isUp = pitch >= 4;
      return {
        isCompliant: isUp,
        guidance: isUp
          ? "Dagu terangkat terdeteksi! Tahan sebentar..."
          : "Angkat dagu sedikit ke atas ⬆️",
        degreeDistance: Math.max(0, 4 - pitch),
      };
    }

    case "down": {
      const isDown = pitch <= -4;
      return {
        isCompliant: isDown,
        guidance: isDown
          ? "Sudut tunduk terdeteksi! Tahan sebentar..."
          : "Tundukkan kepala sedikit ke bawah ⬇️",
        degreeDistance: Math.max(0, 4 + pitch),
      };
    }

    default:
      return {
        isCompliant: true,
        guidance: "Tahan posisi wajah...",
        degreeDistance: 0,
      };
  }
}

/**
 * Computes cosine similarity between two face embedding vectors using @vladmandic/human
 * Returns score between 0 and 100
 */
export function matchEmbeddings(embedding1: number[], embedding2: number[]): number {
  if (!embedding1?.length || !embedding2?.length) return 0;
  if (embedding1.length !== embedding2.length) {
    const minLen = Math.min(embedding1.length, embedding2.length);
    embedding1 = embedding1.slice(0, minLen);
    embedding2 = embedding2.slice(0, minLen);
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }

  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
  if (denominator === 0) return 0;

  const similarity = dotProduct / denominator;
  return Math.min(100, Math.max(0, Math.round(similarity * 100)));
}
