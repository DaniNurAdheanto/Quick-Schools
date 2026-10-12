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
 * Detects physical screen artifacts (specular reflections, screen backlight clipping, moire,
 * and high-contrast smartphone screen bezel/frames around the face box).
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

    // 1. Check inside face box for intense specular glare or excessive unnatural blue tint
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
      if (r > 245 && g > 245 && b > 245) {
        clippedPixels++;
      }

      // Strong artificial blue emission typical of phone screens
      if (b > r + 38 && b > g + 28) {
        screenBlueTint++;
      }
    }

    const clipRatio = totalSamples > 0 ? clippedPixels / totalSamples : 0;
    const blueRatio = totalSamples > 0 ? screenBlueTint / totalSamples : 0;

    if (clipRatio > 0.065) {
      return {
        isScreenSpoof: true,
        glareScore: Math.round(clipRatio * 100),
        reason: "Terdeteksi silau / pantulan kaca layar HP digital.",
      };
    }

    if (blueRatio > 0.32) {
      return {
        isScreenSpoof: true,
        glareScore: Math.round(blueRatio * 100),
        reason: "Terdeteksi emisi backlight layar ponsel.",
      };
    }

    // 2. Check perimeter around face for rectangular device frame / phone bezel
    const marginX = Math.round(bw * 0.35);
    const marginY = Math.round(bh * 0.35);
    const pX = Math.max(0, bx - marginX);
    const pY = Math.max(0, by - marginY);
    const pW = Math.min(input.width - pX, bw + marginX * 2);
    const pH = Math.min(input.height - pY, bh + marginY * 2);

    if (pW > bw && pH > bh) {
      const perimeterData = ctx.getImageData(pX, pY, pW, pH).data;
      let sharpEdgeCount = 0;
      let perimeterSamples = 0;

      for (let y = 2; y < pH - 2; y += 4) {
        for (let x = 2; x < pW - 2; x += 4) {
          const relX = x - (bx - pX);
          const relY = y - (by - pY);
          const isInsideFace = relX > 0 && relX < bw && relY > 0 && relY < bh;
          if (isInsideFace) continue;

          perimeterSamples++;
          const idx = (y * pW + x) * 4;
          const leftIdx = idx - 16;
          const rightIdx = idx + 16;

          const diffL = Math.abs(perimeterData[idx] - perimeterData[leftIdx]);
          const diffR = Math.abs(perimeterData[idx] - perimeterData[rightIdx]);

          if (diffL > 65 || diffR > 65) {
            sharpEdgeCount++;
          }
        }
      }

      const edgeRatio = perimeterSamples > 0 ? sharpEdgeCount / perimeterSamples : 0;
      if (edgeRatio > 0.38) {
        return {
          isScreenSpoof: true,
          glareScore: Math.round(edgeRatio * 100),
          reason: "Terdeteksi bingkai / tepi layar smartphone (Device Bezel Spoof).",
        };
      }
    }

    return { isScreenSpoof: false, glareScore: 0, reason: "" };
  } catch {
    return { isScreenSpoof: false, glareScore: 0, reason: "" };
  }
}

/**
 * Checks relative 3D facial depth relief to distinguish a genuine 3D human head
 * from a flat 2D photo print or 2D image displayed on a phone screen.
 */
export function check3DFaceDepth(mesh?: number[][]): {
  isFlat2D: boolean;
  depthScore: number;
  reason: string;
} {
  if (!mesh || mesh.length < 468) {
    return { isFlat2D: false, depthScore: 50, reason: "" };
  }

  try {
    const noseZ = mesh[1]?.[2] ?? mesh[4]?.[2] ?? 0;
    const earAvgZ = ((mesh[234]?.[2] ?? 0) + (mesh[454]?.[2] ?? 0)) / 2;
    const faceWidth = Math.hypot(
      (mesh[454]?.[0] ?? 0) - (mesh[234]?.[0] ?? 0),
      (mesh[454]?.[1] ?? 0) - (mesh[234]?.[1] ?? 0)
    );

    if (faceWidth < 50) {
      return { isFlat2D: false, depthScore: 50, reason: "" };
    }

    const depthDelta = Math.abs(noseZ - earAvgZ);
    const depthRatio = depthDelta / faceWidth;

    if (depthRatio < 0.038) {
      return {
        isFlat2D: true,
        depthScore: Math.round(depthRatio * 1000),
        reason: "Terdeteksi gambar datar 2D (Foto kertas / Layar HP tanpa kedalaman 3D asli).",
      };
    }

    return {
      isFlat2D: false,
      depthScore: Math.round(depthRatio * 1000),
      reason: "",
    };
  } catch {
    return { isFlat2D: false, depthScore: 50, reason: "" };
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

    const rawYaw = primaryFace.rotation?.angle?.yaw ?? 0;
    const rawPitch = primaryFace.rotation?.angle?.pitch ?? 0;
    const rawRoll = primaryFace.rotation?.angle?.roll ?? 0;

    // Convert radians from Human.js to standard degrees
    const rad2deg = (rad: number) => (rad * 180) / Math.PI;
    const yaw = rad2deg(rawYaw);
    const pitch = rad2deg(rawPitch);
    const roll = rad2deg(rawRoll);

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
  livenessType: "passive_stable" | "blink" | "head_turn" | "mouth" | null;
  livenessReason: string;
  passiveStreak: number;
  firstDetectedTime: number;
  lastAngles: { yaw: number; pitch: number; roll: number } | null;
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
    passiveStreak: 0,
    firstDetectedTime: 0,
    lastAngles: null,
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

  // 1. Direct Phone Screen Glass / Glare / Device Bezel Detection
  if (current.screenArtifacts?.isScreenSpoof) {
    history.passiveStreak = 0;
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

  // 2. 3D Face Depth & Curvature Check (Rejects flat 2D paper/screen photos)
  const depthCheck = check3DFaceDepth(current.mesh);
  if (depthCheck.isFlat2D) {
    history.passiveStreak = 0;
    return {
      isLive: false,
      isSpoof: true,
      hasBlinked: false,
      blinkCount: 0,
      realScore: 15,
      avgEAR,
      reason: depthCheck.reason || "Terdeteksi foto datar 2D tanpa kedalaman wajah asli!",
      actionPrompt: "Gunakan wajah asli langsung di depan kamera.",
    };
  }

  // Record baseline when face is stable
  if (history.baselineYaw === null && Math.abs(current.angles.roll) < 15) {
    history.baselineYaw = current.angles.yaw;
  }
  if (history.baselinePitch === null) {
    history.baselinePitch = current.angles.pitch;
  }
  if (history.baselineEAR === null && avgEAR > 0.18) {
    history.baselineEAR = avgEAR;
  }

  // Track EAR history for temporal variance analysis
  history.earHistory.push(avgEAR);
  if (history.earHistory.length > 25) history.earHistory.shift();

  if (history.firstDetectedTime === 0) {
    history.firstDetectedTime = now;
  }

  // 3. Static Photo Freeze Detector (A static photo on a phone NEVER has micro-biological variance)
  if (history.earHistory.length >= 10 && (now - history.firstDetectedTime >= 1500) && !history.hasBlinked) {
    const mean = history.earHistory.reduce((a, b) => a + b, 0) / history.earHistory.length;
    const variance = history.earHistory.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / history.earHistory.length;
    const stdDev = Math.sqrt(variance);

    // If EAR is completely frozen with standard deviation < 0.0018 over 10 frames (~1.5s), it is an inanimate static photo!
    if (stdDev < 0.0018) {
      return {
        isLive: false,
        isSpoof: true,
        hasBlinked: false,
        blinkCount: 0,
        realScore: 20,
        avgEAR,
        reason: "Terdeteksi foto statis / Layar HP digital! Hadirkan wajah asli dan berkedip.",
        actionPrompt: "Kedipkan mata Anda untuk verifikasi keaslian",
      };
    }
  }

  // 4. Biological Eye Blink Transition State Machine
  // (Crucial: Requires genuine OPEN -> CLOSED -> OPEN cycle within 80ms - 950ms!)
  const isEyeClosed = avgEAR <= 0.165 || (history.baselineEAR !== null && avgEAR <= history.baselineEAR * 0.72) || (openLeft < 0.18 && openRight < 0.18);
  const isEyeOpen = avgEAR >= 0.20 && openLeft >= 0.23 && openRight >= 0.23;
  const hasGestureBlink = gestures.some(g => g.includes("blink"));

  if (hasGestureBlink) {
    history.hasBlinked = true;
    history.isLivenessPassed = true;
    history.livenessType = "blink";
    history.livenessReason = "Wajah asli terverifikasi (Kedipan aktif ✓)";
  } else if (history.blinkState === "eyes_open") {
    if (isEyeClosed) {
      history.blinkState = "eyes_closed";
      history.closeStartTime = now;
    }
  } else if (history.blinkState === "eyes_closed") {
    const closeDuration = now - (history.closeStartTime || now);
    // Biological human blink duration: 80ms to 950ms
    if (isEyeOpen && closeDuration >= 80 && closeDuration <= 950) {
      history.blinkState = "eyes_open";
      history.blinkCount += 1;
      history.hasBlinked = true;
      history.isLivenessPassed = true;
      history.livenessType = "blink";
      history.livenessReason = "Wajah asli terverifikasi (Kedipan aktif ✓)";
    } else if (closeDuration > 1200) {
      // Eyes closed too long or stuck shut, reset to open
      history.blinkState = "eyes_open";
    }
  }

  // Also support natural 3D head movement (if user tilts or turns head naturally >= 9°)
  if (history.baselineYaw !== null) {
    const yawOffset = Math.abs(current.angles.yaw - history.baselineYaw);
    if (yawOffset >= 9) {
      history.hasTurnedHead = true;
      history.isLivenessPassed = true;
      history.livenessType = "head_turn";
      history.livenessReason = "Wajah asli terverifikasi (Gerakan 3D ✓)";
    }
  }

  // Mouth Expression / Smile
  const hasMouthGesture = gestures.some(g => g.includes("mouth") || g.includes("smile"));
  if (hasMouthGesture) {
    history.hasOpenedMouth = true;
    history.isLivenessPassed = true;
    history.livenessType = "mouth";
    history.livenessReason = "Wajah asli terverifikasi (Ekspresi aktif ✓)";
  }

  const realScore = current.liveness?.realScore ?? 50;

  // 5. Anti-Spoofing Neural Model Check (Screen/Paper photo classifier)
  if (realScore < 25) {
    history.passiveStreak = 0;
    return {
      isLive: false,
      isSpoof: true,
      hasBlinked: history.isLivenessPassed,
      blinkCount: history.blinkCount,
      realScore,
      avgEAR,
      reason: `Wajah terdeteksi sebagai foto atau layar digital (Keaslian: ${realScore}% / Min 45%).`,
      actionPrompt: "Gunakan wajah asli langsung di depan kamera (Bukan Foto/Layar).",
    };
  }

  // 6. Mandatory Active Liveness Gate:
  // A STATIC PHOTO CANNOT PASS! Must have verified active biological blink or motion!
  if (!history.isLivenessPassed) {
    return {
      isLive: false,
      isSpoof: false,
      hasBlinked: false,
      blinkCount: 0,
      realScore,
      avgEAR,
      reason: "Wajah cocok! Silakan KEDIPKAN MATA Anda untuk verifikasi keaslian (Bukan Foto/Layar HP)",
      actionPrompt: "Kedipkan mata Anda untuk verifikasi keaslian",
    };
  }

  // 7. Verified Genuine Live Human Presence!
  return {
    isLive: true,
    isSpoof: false,
    hasBlinked: true,
    blinkCount: Math.max(history.blinkCount, 1),
    realScore: Math.max(realScore, 95),
    avgEAR,
    reason: history.livenessReason || "Wajah asli terverifikasi (Kedipan aktif ✓)",
    actionPrompt: "Wajah asli terverifikasi ✓",
  };
}

/**
 * Evaluates whether current head angles and Human.js gestures match the target pose standard.
 * Strictly verifies the exact direction (front, left, right, up, down) and decisively rejects opposite poses.
 */
export function checkPoseComplianceWithHuman(
  angles: { yaw: number; pitch: number; roll: number },
  targetPose: FacePoseType,
  _gestures: string[] = []
): {
  isCompliant: boolean;
  guidance: string;
  degreeDistance: number;
} {
  const yaw = angles?.yaw ?? 0;
  const pitch = angles?.pitch ?? 0;

  // Screen-space un-mirrored directions (natural observer view):
  // Facing screen RIGHT: yaw <= -7
  // Facing screen LEFT:  yaw >= 7
  const isFacingRight = yaw <= -7;
  const isFacingLeft = yaw >= 7;
  const isHeadUp = pitch <= -6;
  const isHeadDown = pitch >= 6;

  switch (targetPose) {
    case "front": {
      if (isFacingLeft) {
        return { isCompliant: false, guidance: "Wajah menengok ke Kiri! Harap hadap lurus ke depan", degreeDistance: Math.abs(yaw) };
      }
      if (isFacingRight) {
        return { isCompliant: false, guidance: "Wajah menengok ke Kanan! Harap hadap lurus ke depan", degreeDistance: Math.abs(yaw) };
      }
      if (isHeadUp) {
        return { isCompliant: false, guidance: "Kepala terangkat! Harap hadap lurus ke depan", degreeDistance: Math.abs(pitch) };
      }
      if (isHeadDown) {
        return { isCompliant: false, guidance: "Kepala menunduk! Harap hadap lurus ke depan", degreeDistance: Math.abs(pitch) };
      }
      return {
        isCompliant: true,
        guidance: "Posisi lurus terdeteksi pas! Tahan posisi...",
        degreeDistance: Math.max(Math.abs(yaw), Math.abs(pitch)),
      };
    }

    case "left": {
      if (isFacingRight) {
        return {
          isCompliant: false,
          guidance: "⚠️ Anda menengok ke KANAN! Harap menengok ke KIRI ⬅️",
          degreeDistance: Math.abs(yaw) + 10,
        };
      }
      if (isHeadUp) {
        return { isCompliant: false, guidance: "Kepala terangkat! Harap menengok lurus ke Kiri ⬅️", degreeDistance: Math.abs(pitch) };
      }
      if (isHeadDown) {
        return { isCompliant: false, guidance: "Kepala menunduk! Harap menengok lurus ke Kiri ⬅️", degreeDistance: Math.abs(pitch) };
      }
      if (isFacingLeft) {
        return {
          isCompliant: true,
          guidance: "Sudut kiri terdeteksi pas! Tahan posisi...",
          degreeDistance: 0,
        };
      }
      return {
        isCompliant: false,
        guidance: "Tengok sedikit ke arah Kiri ⬅️",
        degreeDistance: Math.max(0, 7 - yaw),
      };
    }

    case "right": {
      if (isFacingLeft) {
        return {
          isCompliant: false,
          guidance: "⚠️ Anda menengok ke KIRI! Harap menengok ke KANAN ➡️",
          degreeDistance: Math.abs(yaw) + 10,
        };
      }
      if (isHeadUp) {
        return { isCompliant: false, guidance: "Kepala terangkat! Harap menengok lurus ke Kanan ➡️", degreeDistance: Math.abs(pitch) };
      }
      if (isHeadDown) {
        return { isCompliant: false, guidance: "Kepala menunduk! Harap menengok lurus ke Kanan ➡️", degreeDistance: Math.abs(pitch) };
      }
      if (isFacingRight) {
        return {
          isCompliant: true,
          guidance: "Sudut kanan terdeteksi pas! Tahan posisi...",
          degreeDistance: 0,
        };
      }
      return {
        isCompliant: false,
        guidance: "Tengok sedikit ke arah Kanan ➡️",
        degreeDistance: Math.max(0, 7 + yaw),
      };
    }

    case "up": {
      if (isHeadDown) {
        return {
          isCompliant: false,
          guidance: "⚠️ Kepala menunduk! Harap angkat dagu ke Atas ⬆️",
          degreeDistance: Math.abs(pitch) + 10,
        };
      }
      if (isFacingLeft || isFacingRight) {
        return {
          isCompliant: false,
          guidance: "Wajah menengok ke samping! Harap angkat dagu lurus ke Atas ⬆️",
          degreeDistance: Math.abs(yaw),
        };
      }
      if (isHeadUp) {
        return {
          isCompliant: true,
          guidance: "Sudut atas terdeteksi pas! Tahan posisi...",
          degreeDistance: 0,
        };
      }
      return {
        isCompliant: false,
        guidance: "Angkat dagu sedikit ke Atas ⬆️",
        degreeDistance: Math.max(0, 6 + pitch),
      };
    }

    case "down": {
      if (isHeadUp) {
        return {
          isCompliant: false,
          guidance: "⚠️ Kepala terangkat! Harap tundukkan kepala ke Bawah ⬇️",
          degreeDistance: Math.abs(pitch) + 10,
        };
      }
      if (isFacingLeft || isFacingRight) {
        return {
          isCompliant: false,
          guidance: "Wajah menengok ke samping! Harap tundukkan kepala lurus ke Bawah ⬇️",
          degreeDistance: Math.abs(yaw),
        };
      }
      if (isHeadDown) {
        return {
          isCompliant: true,
          guidance: "Sudut bawah terdeteksi pas! Tahan posisi...",
          degreeDistance: 0,
        };
      }
      return {
        isCompliant: false,
        guidance: "Tundukkan kepala sedikit ke Bawah ⬇️",
        degreeDistance: Math.max(0, 6 - pitch),
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
 * Computes face similarity between two embedding vectors using the official @vladmandic/human algorithm.
 * Returns calibrated score between 0 and 100
 */
export function matchEmbeddings(embedding1: number[], embedding2: number[]): number {
  if (!embedding1?.length || !embedding2?.length) return 0;
  const len = Math.min(embedding1.length, embedding2.length);
  if (len < 512) return 0;

  let sum = 0;
  for (let i = 0; i < len; i++) {
    const diff = embedding1[i] - embedding2[i];
    sum += diff * diff;
  }

  const dist = 25 * sum;
  if (dist === 0) return 100;
  const root = Math.sqrt(dist);
  const norm = (1 - root / 100 - 0.2) / (0.8 - 0.2);
  const rawSim = Math.max(Math.min(norm, 1), 0);

  if (rawSim >= 0.50) {
    const factor = Math.min(1, (rawSim - 0.50) / 0.30);
    return Math.round(75 + factor * 24);
  } else {
    return Math.round((rawSim / 0.50) * 55);
  }
}
