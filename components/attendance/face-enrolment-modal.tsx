"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  ScanFace,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  RotateCcw,
  X,
  Target,
  Check,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import {
  saveUserFaceBiometric,
  FaceBiometricData,
  FacePoseType,
  FaceBiometricPoseItem,
} from "@/lib/face-biometric-service";
import {
  detectFaceWithHuman,
  HumanFaceDetection,
} from "@/lib/human-service";

interface FaceEnrolmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (biometric: FaceBiometricData) => void;
  userUid: string;
  userName: string;
  userRole?: string;
  studentId?: string;
  nip?: string;
  existingPhotoUrl?: string;
  title?: string;
  description?: string;
}

export interface PoseDefinition {
  key: FacePoseType;
  label: string;
  shortLabel: string;
  instruction: string;
  badgeHint: string;
  icon: "center" | "left" | "right" | "up" | "down";
}

export const POSE_DEFINITIONS: PoseDefinition[] = [
  {
    key: "front",
    label: "Sudut Depan (Lurus)",
    shortLabel: "1. Depan",
    instruction: "Posisikan wajah di tengah lingkaran dan hadap lurus ke kamera.",
    badgeHint: "Tatap lurus ke depan",
    icon: "center",
  },
  {
    key: "up",
    label: "Sudut Atas (Dagu Naik)",
    shortLabel: "2. Atas",
    instruction: "Angkat dagu Anda sedikit ke atas.",
    badgeHint: "Angkat dagu ke atas ⬆️",
    icon: "up",
  },
  {
    key: "right",
    label: "Sudut Samping Kanan",
    shortLabel: "3. Kanan",
    instruction: "Tengokkan wajah perlahan ke kanan.",
    badgeHint: "Tengok ke kanan ➡️",
    icon: "right",
  },
  {
    key: "down",
    label: "Sudut Bawah (Tunduk)",
    shortLabel: "4. Bawah",
    instruction: "Tundukkan kepala Anda sedikit ke bawah.",
    badgeHint: "Tunduk ke bawah ⬇️",
    icon: "down",
  },
  {
    key: "left",
    label: "Sudut Samping Kiri",
    shortLabel: "5. Kiri",
    instruction: "Tengokkan wajah perlahan ke kiri.",
    badgeHint: "Tengok ke kiri ⬅️",
    icon: "left",
  },
];

const TOTAL_TICKS = 36; // 36 ticks around 360° (each tick = 10°)

export function FaceEnrolmentModal({
  isOpen,
  onClose,
  onSuccess,
  userUid,
  userName,
  userRole = "siswa",
  studentId = "",
  nip = "",
  title = "Pendaftaran Face ID Biometrik",
  description = "Putar kepala Anda perlahan membentuk lingkaran untuk merekam data acuan biometrik 3D.",
}: FaceEnrolmentModalProps) {
  const { showSuccess, showError } = useToast();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Workflow phase: "center" (align front) | "circle" (roll head) | "saving" | "completed"
  const [phase, setPhase] = useState<"center" | "circle" | "saving" | "completed">("center");

  // Circular scan ticks tracking
  const [ticks, setTicks] = useState<boolean[]>(() => new Array(TOTAL_TICKS).fill(false));
  const ticksRef = useRef<boolean[]>(new Array(TOTAL_TICKS).fill(false));
  const [activeTickIndex, setActiveTickIndex] = useState<number | null>(null);

  // Pose gallery captured during the continuous 3D circular scan
  const capturedPosesRef = useRef<Partial<Record<FacePoseType, FaceBiometricPoseItem>>>({});
  const [capturedPosesState, setCapturedPosesState] = useState<Partial<Record<FacePoseType, FaceBiometricPoseItem>>>({});

  // @vladmandic/human AI tracking states
  const humanFaceRef = useRef<HumanFaceDetection | null>(null);
  const isDetectingHumanRef = useRef<boolean>(false);

  // Camera & Stream states
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Progress metrics
  const completedTicksCount = useMemo(() => ticks.filter(Boolean).length, [ticks]);
  const progressPercent = useMemo(
    () => Math.min(100, Math.round((completedTicksCount / TOTAL_TICKS) * 100)),
    [completedTicksCount]
  );

  // Stability timer for initial frontal centering lock
  const centerStabilityRef = useRef<number>(0);
  const isFrontLockedRef = useRef<boolean>(false);

  // Smoothing filters (Low-Pass / EMA) for Apple Face ID fluid tracking
  const smoothPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Multi-frame stability counters for each pose before capturing (prevents capture during quick pass)
  const cardinalHoldRef = useRef<{ up: number; right: number; down: number; left: number }>({
    up: 0,
    right: 0,
    down: 0,
    left: 0,
  });

  // Guidance instruction text displayed below circular viewport
  const [guidance, setGuidance] = useState<string>("Posisikan wajah Anda di dalam lingkaran...");
  const [centerHoldRatio, setCenterHoldRatio] = useState<number>(0);
  const lastSoundTickRef = useRef<number>(0);

  // Audio synthesis for Apple-like feedback chimes
  const playTickSound = useCallback(() => {
    const now = Date.now();
    if (now - lastSoundTickRef.current < 90) return;
    lastSoundTickRef.current = now;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    } catch {}
  }, []);

  const playFrontLockedSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      [
        { f: 523.25, t: 0, d: 0.1 },    // C5
        { f: 659.25, t: 0.09, d: 0.18 }, // E5
      ].forEach(({ f, t, d }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, now + t);
        gain.gain.setValueAtTime(0.12, now + t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + d);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + t);
        osc.stop(now + t + d);
      });
    } catch {}
  }, []);

  const playCompleteChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      [
        { f: 587.33, t: 0, d: 0.12 },    // D5
        { f: 880.00, t: 0.11, d: 0.2 },   // A5
        { f: 1174.66, t: 0.22, d: 0.35 }, // D6
      ].forEach(({ f, t, d }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, now + t);
        gain.gain.setValueAtTime(0.15, now + t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + d);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + t);
        osc.stop(now + t + d);
      });
    } catch {}
  }, []);

  // 1. Start Camera Stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        try {
          await videoRef.current.play();
          setCameraActive(true);
        } catch {
          setCameraActive(true);
        }
      } else {
        setCameraActive(true);
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      let errMsg = "Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan di browser.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        errMsg = "Izin akses kamera ditolak. Silakan izinkan akses kamera di pengaturan browser Anda.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        errMsg = "Tidak ada perangkat kamera yang terdeteksi di perangkat ini.";
      }
      setCameraError(errMsg);
      setCameraActive(false);
    }
  }, []);

  // 2. Stop Camera Stream
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStream(null);
    setCameraActive(false);
  }, []);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().then(() => {
        setCameraActive(true);
      }).catch(() => {});
    }
  }, [stream]);

  // Modal open/close lifecycle
  useEffect(() => {
    if (isOpen) {
      setPhase("center");
      setTicks(new Array(TOTAL_TICKS).fill(false));
      ticksRef.current = new Array(TOTAL_TICKS).fill(false);
      capturedPosesRef.current = {};
      setCapturedPosesState({});
      centerStabilityRef.current = 0;
      isFrontLockedRef.current = false;
      setActiveTickIndex(null);
      setGuidance("Posisikan wajah Anda di dalam lingkaran...");
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Helper to extract a high-quality 480x480 square crop from the video stream
  const capturePoseSnapshot = useCallback((poseKey: FacePoseType) => {
    const video = videoRef.current;
    if (!video || !humanFaceRef.current?.embedding || humanFaceRef.current.embedding.length < 512) return;

    try {
      const snapCanvas = document.createElement("canvas");
      snapCanvas.width = 480;
      snapCanvas.height = 480;
      const ctx = snapCanvas.getContext("2d");
      if (!ctx) return;

      const vW = video.videoWidth || 640;
      const vH = video.videoHeight || 480;
      const minDim = Math.min(vW, vH);
      const startX = (vW - minDim) / 2;
      const startY = (vH - minDim) / 2;

      // Direct 1:1 un-mirrored capture matching natural camera view and AI biometric coordinate system
      ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, snapCanvas.width, snapCanvas.height);

      const dataUrl = snapCanvas.toDataURL("image/jpeg", 0.88);
      capturedPosesRef.current[poseKey] = {
        photoUrl: dataUrl,
        descriptor: humanFaceRef.current.embedding,
        qualityScore: 95,
        capturedAt: new Date().toISOString(),
      };
      setCapturedPosesState({ ...capturedPosesRef.current });
    } catch (e) {
      console.warn("Failed to capture snapshot for pose:", poseKey, e);
    }
  }, []);

  // Save Biometrics to Database and complete
  const finalizeEnrolment = useCallback(async () => {
    setPhase("saving");
    try {
      const frontData = capturedPosesRef.current.front;
      if (!frontData || !frontData.descriptor || frontData.descriptor.length < 512) {
        showError("Data biometrik depan belum lengkap. Silakan coba lagi.", "Pendaftaran Gagal");
        setPhase("center");
        return;
      }

      // Ensure all 5 poses have valid data (fallback to front if head didn't pause on an exact cardinal)
      const finalPoses: Partial<Record<FacePoseType, FaceBiometricPoseItem>> = {
        front: frontData,
        up: capturedPosesRef.current.up || frontData,
        right: capturedPosesRef.current.right || frontData,
        down: capturedPosesRef.current.down || frontData,
        left: capturedPosesRef.current.left || frontData,
      };

      const biometricData: FaceBiometricData = {
        isEnrolled: true,
        enrolledAt: new Date().toISOString(),
        faceDescriptor: frontData.descriptor,
        photoUrl: frontData.photoUrl,
        qualityScore: 96,
        poses: finalPoses,
        userName,
        userRole,
        studentId,
        nip,
      };

      await saveUserFaceBiometric(userUid, biometricData, userRole);

      setPhase("completed");
      playCompleteChime();
      showSuccess("Face ID 360° berhasil didaftarkan secara penuh!", "Face ID Aktif");

      if (onSuccess) {
        onSuccess(biometricData);
      }

      setTimeout(() => {
        onClose();
      }, 1900);
    } catch (err: any) {
      console.error("Error saving Face ID:", err);
      showError("Gagal menyimpan data biometrik: " + (err.message || "Kesalahan server"), "Gagal Menyimpan");
      setPhase("circle");
    }
  }, [userUid, userName, userRole, studentId, nip, onSuccess, onClose, showError, showSuccess, playCompleteChime]);

  // 3. Real-time Video Frame Analysis & 3D Circular Scan Engine
  useEffect(() => {
    if (!isOpen || (phase !== "center" && phase !== "circle") || !cameraActive) return;

    let isRunning = true;

    const processFrame = () => {
      if (!isRunning) return;

      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth > 0) {
        // Trigger background AI inference at 480px native speed
        if (!isDetectingHumanRef.current) {
          isDetectingHumanRef.current = true;
          detectFaceWithHuman(video)
            .then((hResult) => {
              isDetectingHumanRef.current = false;
              if (hResult) {
                humanFaceRef.current = hResult;
              }
            })
            .catch(() => {
              isDetectingHumanRef.current = false;
            });
        }

        const face = humanFaceRef.current;
        const hasAiEmbedding = Boolean(face?.embedding && face.embedding.length >= 512);
        const realScore = face?.liveness?.realScore ?? 80;
        const isSpoof = realScore < 45 || face?.screenArtifacts?.isScreenSpoof;

        if (isSpoof) {
          setGuidance("⚠️ Terdeteksi foto/layar digital! Hadirkan wajah asli langsung.");
          centerStabilityRef.current = 0;
          animFrameRef.current = requestAnimationFrame(processFrame);
          return;
        }

        if (!face?.hasFace) {
          setGuidance("Posisikan wajah Anda di dalam lingkaran...");
          centerStabilityRef.current = 0;
          animFrameRef.current = requestAnimationFrame(processFrame);
          return;
        }

        if (!hasAiEmbedding) {
          setGuidance("Menyiapkan sensor biometrik AI... Tahan sejenak");
          centerStabilityRef.current = 0;
          smoothPosRef.current = { x: 0, y: 0 };
          animFrameRef.current = requestAnimationFrame(processFrame);
          return;
        }

        const rawYaw = face.angles.yaw;
        const pitch = face.angles.pitch;

        // 1. Natural Screen-Space Coordinate Conversion (Observer / Non-Selfie View):
        // In un-mirrored camera feed (viewing like another person):
        // - When head turns towards SCREEN RIGHT: Human.js rawYaw is negative, so eulerX = -rawYaw is POSITIVE.
        // - When head turns towards SCREEN LEFT: Human.js rawYaw is positive, so eulerX = -rawYaw is NEGATIVE.
        // - When head tilts UP: pitch is negative, so eulerY = pitch is NEGATIVE (screen top).
        // - When head tilts DOWN: pitch is positive, so eulerY = pitch is POSITIVE (screen bottom).
        const eulerX = -rawYaw;
        const eulerY = pitch;

        // 2. 3D Face Landmark Fusion (Nose tip [1] relative to Eye Bridge [168]):
        let lmX = eulerX;
        let lmY = eulerY;
        if (face.mesh && face.mesh.length >= 169) {
          const noseTip = face.mesh[1];
          const eyeBridge = face.mesh[168];
          const boxW = Math.max(80, face.box.width);
          const boxH = Math.max(80, face.box.height);
          // Normalizes relative displacement so it scales consistently with head movement
          const normDx = (noseTip[0] - eyeBridge[0]) / boxW;
          const normDy = (noseTip[1] - eyeBridge[1] - (boxH * 0.10)) / boxH;
          lmX = normDx * 85;
          lmY = normDy * 85;
        }

        // 3. Sensor Fusion: 60% 3D Euler Pose + 40% Landmark Displacement
        const instantX = 0.6 * eulerX + 0.4 * lmX;
        const instantY = 0.6 * eulerY + 0.4 * lmY;

        // 4. Low-pass Smoothing Filter (EMA):
        // Eliminates jitter, camera sensor noise, and rapid tremors like Apple Face ID
        const ALPHA = 0.38;
        smoothPosRef.current.x = ALPHA * instantX + (1 - ALPHA) * smoothPosRef.current.x;
        smoothPosRef.current.y = ALPHA * instantY + (1 - ALPHA) * smoothPosRef.current.y;
        const smoothX = smoothPosRef.current.x;
        const smoothY = smoothPosRef.current.y;
        const smoothMag = Math.hypot(smoothX, smoothY);

        // ================= PHASE 1: INITIAL CENTER LOCK =================
        if (!isFrontLockedRef.current) {
          const isCentered = Math.abs(smoothX) <= 8.0 && Math.abs(smoothY) <= 8.0;
          if (isCentered) {
            centerStabilityRef.current += 1;
            const ratio = Math.min(1, centerStabilityRef.current / 8);
            setCenterHoldRatio(ratio);
            const pct = Math.round(ratio * 100);
            setGuidance(`Wajah di tengah! Tahan posisi... (${pct}%)`);

            if (centerStabilityRef.current >= 8) {
              // Lock front pose!
              isFrontLockedRef.current = true;
              capturePoseSnapshot("front");
              playFrontLockedSound();
              setPhase("circle");
              setGuidance("Bagus! Sekarang putar kepala perlahan membentuk lingkaran 🔄");
            }
          } else {
            centerStabilityRef.current = Math.max(0, centerStabilityRef.current - 1);
            setCenterHoldRatio(Math.min(1, centerStabilityRef.current / 8));
            if (smoothX > 8.0) setGuidance("Posisikan kepala lurus (jangan menengok ke Kanan)");
            else if (smoothX < -8.0) setGuidance("Posisikan kepala lurus (jangan menengok ke Kiri)");
            else if (smoothY < -8.0) setGuidance("Posisikan kepala lurus (jangan mendongak ke Atas)");
            else if (smoothY > 8.0) setGuidance("Posisikan kepala lurus (jangan menunduk ke Bawah)");
            else setGuidance("Hadapkan wajah lurus ke kamera");
          }
          animFrameRef.current = requestAnimationFrame(processFrame);
          return;
        }

        // ================= PHASE 2: CONTINUOUS 3D CIRCULAR HEAD ROLL =================
        if (isFrontLockedRef.current) {
          // If user moves head slightly outward from center (>= 4.0 degrees)
          if (smoothMag >= 4.0) {
            // Natural polar coordinate mapping:
            // 0° = Atas (Up), 90° = Kanan (Right), 180° = Bawah (Down), 270° = Kiri (Left)
            // - smoothX > 0: user faces Right -> angle moves towards 90° (Right)
            // - smoothX < 0: user faces Left  -> angle moves towards 270° (Left)
            // - smoothY < 0: user tilts Up   -> -smoothY > 0 -> angle moves towards 0° (Up)
            // - smoothY > 0: user tilts Down -> -smoothY < 0 -> angle moves towards 180° (Down)
            const rad = Math.atan2(smoothX, -smoothY);
            const deg = (rad * (180 / Math.PI) + 360) % 360;
            const tickIdx = Math.floor((deg + (360 / (2 * TOTAL_TICKS))) / (360 / TOTAL_TICKS)) % TOTAL_TICKS;

            setActiveTickIndex(tickIdx);

            // Fill the current tick + adjacent neighbors for a buttery-smooth fluid sweep
            let newTickFilled = false;
            const updated = [...ticksRef.current];
            const neighbors = [
              tickIdx,
              (tickIdx + 1) % TOTAL_TICKS,
              (tickIdx + TOTAL_TICKS - 1) % TOTAL_TICKS,
            ];

            neighbors.forEach((idx) => {
              if (!updated[idx]) {
                updated[idx] = true;
                newTickFilled = true;
              }
            });

            if (newTickFilled) {
              ticksRef.current = updated;
              setTicks(updated);
              playTickSound();
            }

            // Multi-Frame Stability Validation before Capturing Cardinal Poses
            // Head motion must be stable (not whipping past too rapidly)
            const isStableSpeed = Math.abs(instantX - smoothX) < 5.5 && Math.abs(instantY - smoothY) < 5.5;

            // Top sector (Atas): tickIdx >= 34 || tickIdx <= 2
            if ((tickIdx >= 34 || tickIdx <= 2) && !capturedPosesRef.current.up) {
              cardinalHoldRef.current.up = isStableSpeed ? cardinalHoldRef.current.up + 1 : cardinalHoldRef.current.up;
              if (cardinalHoldRef.current.up >= 5) {
                capturePoseSnapshot("up");
                playFrontLockedSound();
              }
            } else {
              cardinalHoldRef.current.up = Math.max(0, cardinalHoldRef.current.up - 1);
            }

            // Right sector (Kanan): tickIdx >= 7 && tickIdx <= 11
            if (tickIdx >= 7 && tickIdx <= 11 && !capturedPosesRef.current.right) {
              cardinalHoldRef.current.right = isStableSpeed ? cardinalHoldRef.current.right + 1 : cardinalHoldRef.current.right;
              if (cardinalHoldRef.current.right >= 5) {
                capturePoseSnapshot("right");
                playFrontLockedSound();
              }
            } else {
              cardinalHoldRef.current.right = Math.max(0, cardinalHoldRef.current.right - 1);
            }

            // Bottom sector (Bawah): tickIdx >= 16 && tickIdx <= 20
            if (tickIdx >= 16 && tickIdx <= 20 && !capturedPosesRef.current.down) {
              cardinalHoldRef.current.down = isStableSpeed ? cardinalHoldRef.current.down + 1 : cardinalHoldRef.current.down;
              if (cardinalHoldRef.current.down >= 5) {
                capturePoseSnapshot("down");
                playFrontLockedSound();
              }
            } else {
              cardinalHoldRef.current.down = Math.max(0, cardinalHoldRef.current.down - 1);
            }

            // Left sector (Kiri): tickIdx >= 25 && tickIdx <= 29
            if (tickIdx >= 25 && tickIdx <= 29 && !capturedPosesRef.current.left) {
              cardinalHoldRef.current.left = isStableSpeed ? cardinalHoldRef.current.left + 1 : cardinalHoldRef.current.left;
              if (cardinalHoldRef.current.left >= 5) {
                capturePoseSnapshot("left");
                playFrontLockedSound();
              }
            } else {
              cardinalHoldRef.current.left = Math.max(0, cardinalHoldRef.current.left - 1);
            }

            // Count progress
            const count = updated.filter(Boolean).length;
            const pct = Math.round((count / TOTAL_TICKS) * 100);

            if (count >= 32 || pct >= 89) {
              // 90%+ covered: auto-fill remaining ticks and complete!
              ticksRef.current = new Array(TOTAL_TICKS).fill(true);
              setTicks(new Array(TOTAL_TICKS).fill(true));
              setGuidance("Selesai! Menyimpan data Face ID... ✨");
              finalizeEnrolment();
              return;
            } else {
              // Responsive natural directional guidance with feedback on hold
              if (tickIdx >= 34 || tickIdx <= 2) {
                setGuidance(capturedPosesRef.current.up ? `Arah Atas tersimpan ✓ Lanjutkan putaran (${pct}%)...` : `Arah Atas terdeteksi — tahan posisi sejenak (${pct}%)...`);
              } else if (tickIdx >= 7 && tickIdx <= 11) {
                setGuidance(capturedPosesRef.current.right ? `Arah Kanan tersimpan ✓ Lanjutkan putaran (${pct}%)...` : `Arah Kanan terdeteksi — tahan posisi sejenak (${pct}%)...`);
              } else if (tickIdx >= 16 && tickIdx <= 20) {
                setGuidance(capturedPosesRef.current.down ? `Arah Bawah tersimpan ✓ Lanjutkan putaran (${pct}%)...` : `Arah Bawah terdeteksi — tahan posisi sejenak (${pct}%)...`);
              } else if (tickIdx >= 25 && tickIdx <= 29) {
                setGuidance(capturedPosesRef.current.left ? `Arah Kiri tersimpan ✓ Lanjutkan putaran (${pct}%)...` : `Arah Kiri terdeteksi — tahan posisi sejenak (${pct}%)...`);
              } else {
                setGuidance(`Putar kepala perlahan mengikuti lingkaran (${pct}%)...`);
              }
            }
          } else {
            setActiveTickIndex(null);
            setGuidance("Putar kepala Anda perlahan membentuk lingkaran 🔄");
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(processFrame);
    };

    animFrameRef.current = requestAnimationFrame(processFrame);

    return () => {
      isRunning = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isOpen, phase, cameraActive, playTickSound, playFrontLockedSound, capturePoseSnapshot, finalizeEnrolment]);

  // Pre-calculate SVG tick marks around the circular camera ring
  const svgTicks = useMemo(() => {
    const cx = 150;
    const cy = 150;
    const rIn = 118;
    const rOut = 138;
    const items = [];

    for (let i = 0; i < TOTAL_TICKS; i++) {
      const angleDeg = i * (360 / TOTAL_TICKS);
      const rad = ((angleDeg - 90) * Math.PI) / 180;
      const x1 = cx + rIn * Math.cos(rad);
      const y1 = cy + rIn * Math.sin(rad);
      const x2 = cx + rOut * Math.cos(rad);
      const y2 = cy + rOut * Math.sin(rad);
      items.push({ index: i, angleDeg, x1, y1, x2, y2 });
    }
    return items;
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white border border-slate-200/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Clean Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#531FFF] to-[#8C52FF] flex items-center justify-center text-white shadow-md shadow-[#531FFF]/20">
              <ScanFace className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight flex items-center gap-2">
                <span>{title}</span>
                <span className="text-[10px] font-bold text-[#531FFF] bg-[#531FFF]/10 border border-[#531FFF]/20 px-2 py-0.5 rounded-full">
                  Lingkaran 360°
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 font-medium line-clamp-1">{description}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Main Apple Face ID Circular Scanner Viewport */}
        <div className="p-6 flex flex-col items-center justify-center space-y-5 overflow-y-auto bg-white">
          {/* Circular Stage with 36 Radial Ticks */}
          <div className="relative w-[300px] h-[300px] flex items-center justify-center select-none">
            {/* 1. Camera Video (Clipped cleanly into a circular window) */}
            <div className="w-[210px] h-[210px] rounded-full overflow-hidden bg-slate-100 relative border-2 border-slate-200 shadow-xl flex items-center justify-center z-10">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={cn(
                  "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
                  cameraActive ? "opacity-100" : "opacity-0"
                )}
              />

              {/* Camera Loading State */}
              {!cameraActive && (
                <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center p-4 text-center z-20 space-y-2">
                  {cameraError ? (
                    <>
                      <AlertTriangle className="w-8 h-8 text-amber-500 animate-pulse" />
                      <p className="text-[10px] text-amber-700 max-w-[170px] leading-relaxed">{cameraError}</p>
                      <button
                        type="button"
                        onClick={startCamera}
                        className="px-3 py-1.5 bg-[#531FFF] text-white text-[10px] font-bold rounded-lg cursor-pointer hover:bg-[#4314cc] transition-colors"
                      >
                        Nyalakan Ulang
                      </button>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-6 h-6 text-[#531FFF] animate-spin" />
                      <p className="text-[10px] text-slate-500 font-medium">Menghubungkan kamera...</p>
                    </>
                  )}
                </div>
              )}

              {/* Center Lock Reticle in Phase 1 */}
              {phase === "center" && cameraActive && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="relative w-[150px] h-[150px] flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 150 150">
                      <circle
                        cx="75"
                        cy="75"
                        r="66"
                        fill="none"
                        stroke="#cbd5e1"
                        strokeWidth="2.5"
                        strokeDasharray="4 4"
                      />
                      <circle
                        cx="75"
                        cy="75"
                        r="66"
                        fill="none"
                        stroke={centerHoldRatio >= 0.9 ? "#10b981" : "#0284c7"}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 66}
                        strokeDashoffset={(2 * Math.PI * 66) * (1 - centerHoldRatio)}
                        className="transition-all duration-100"
                      />
                    </svg>
                    <Target className={cn(
                      "w-7 h-7 transition-all duration-200",
                      centerHoldRatio >= 0.8 ? "text-emerald-500 scale-110" : "text-sky-500"
                    )} />
                  </div>
                </div>
              )}

              {/* Completion Green Flash Overlay */}
              {phase === "completed" && (
                <div className="absolute inset-0 bg-emerald-500/90 backdrop-blur-xs flex flex-col items-center justify-center z-30 animate-in zoom-in-75 duration-300 text-white">
                  <CheckCircle2 className="w-16 h-16 text-white animate-bounce" />
                  <span className="text-xs font-black text-white mt-2">Face ID Siap!</span>
                </div>
              )}
            </div>

            {/* 2. SVG 36-Tick Radial Ring Overlay */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-20"
              viewBox="0 0 300 300"
            >
              {svgTicks.map((tick) => {
                const isCompleted = ticks[tick.index];
                const isActive = activeTickIndex === tick.index;

                return (
                  <line
                    key={tick.index}
                    x1={tick.x1}
                    y1={tick.y1}
                    x2={tick.x2}
                    y2={tick.y2}
                    stroke={
                      phase === "completed"
                        ? "#10b981"
                        : isActive
                        ? "#0284c7"
                        : isCompleted
                        ? "#10b981"
                        : "#cbd5e1"
                    }
                    strokeWidth={isActive ? 5 : isCompleted || phase === "completed" ? 4 : 3}
                    strokeLinecap="round"
                    className={cn(
                      "transition-all duration-150",
                      isActive && "drop-shadow-[0_0_8px_rgba(2,132,199,0.7)]",
                      isCompleted && "drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                    )}
                  />
                );
              })}

              {/* Active Head Direction Tracker Dot on the 36-tick ring */}
              {phase === "circle" && activeTickIndex !== null && svgTicks[activeTickIndex] && (
                <>
                  <circle
                    cx={svgTicks[activeTickIndex].x2}
                    cy={svgTicks[activeTickIndex].y2}
                    r={6}
                    fill="#0284c7"
                    className="animate-ping opacity-60"
                  />
                  <circle
                    cx={svgTicks[activeTickIndex].x2}
                    cy={svgTicks[activeTickIndex].y2}
                    r={4}
                    fill="#0284c7"
                    className="drop-shadow-[0_0_8px_rgba(2,132,199,0.9)]"
                  />
                </>
              )}
            </svg>
          </div>

          {/* 3. Progress Percentage Pill & Dynamic Guidance */}
          <div className="text-center space-y-2 max-w-sm">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-mono font-bold shadow-xs">
              {phase === "center" ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700">
                  <Target className="w-3.5 h-3.5 text-sky-600" />
                  <span>Tahap 1: Kunci Posisi Depan</span>
                </div>
              ) : phase === "completed" ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>100% Selesai Terverifikasi</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Kemajuan: {progressPercent}%</span>
                </div>
              )}
            </div>

            <p className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight transition-all">
              {guidance}
            </p>
          </div>

          {/* 4. Cardinal Angles Status Bar */}
          <div className="grid grid-cols-4 gap-2 w-full max-w-xs pt-1">
            {[
              { key: "up", label: "Atas", done: Boolean(capturedPosesState.up) },
              { key: "right", label: "Kanan", done: Boolean(capturedPosesState.right) },
              { key: "down", label: "Bawah", done: Boolean(capturedPosesState.down) },
              { key: "left", label: "Kiri", done: Boolean(capturedPosesState.left) },
            ].map((item) => (
              <div
                key={item.key}
                className={cn(
                  "py-1.5 px-2 rounded-xl border text-center transition-all flex items-center justify-center gap-1",
                  item.done
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 font-bold"
                    : "bg-slate-50 border-slate-200/80 text-slate-400 font-medium"
                )}
              >
                <span className="text-[10px]">{item.label}</span>
                {item.done && <Check className="w-2.5 h-2.5 text-emerald-600" />}
              </div>
            ))}
          </div>

          {/* 5. Bottom Actions */}
          <div className="flex items-center gap-2 w-full pt-1">
            <button
              type="button"
              onClick={() => {
                setPhase("center");
                setTicks(new Array(TOTAL_TICKS).fill(false));
                ticksRef.current = new Array(TOTAL_TICKS).fill(false);
                capturedPosesRef.current = {};
                setCapturedPosesState({});
                centerStabilityRef.current = 0;
                setCenterHoldRatio(0);
                smoothPosRef.current = { x: 0, y: 0 };
                cardinalHoldRef.current = { up: 0, right: 0, down: 0, left: 0 };
                isFrontLockedRef.current = false;
                setActiveTickIndex(null);
                setGuidance("Posisikan wajah Anda di dalam lingkaran...");
              }}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Ulangi Putaran</span>
            </button>

            {/* Quick Completion Button if user has locked front pose and wishes to finish early */}
            {isFrontLockedRef.current && (
              <button
                type="button"
                onClick={finalizeEnrolment}
                disabled={phase === "saving" || phase === "completed"}
                className="flex-1 py-2.5 bg-gradient-to-r from-[#531FFF] to-[#8C52FF] hover:from-[#4414d6] hover:to-[#7941ea] disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-[#531FFF]/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan Sekarang</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
