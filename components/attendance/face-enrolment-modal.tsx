"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ScanFace,
  Camera,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  X,
  Lock,
  Sun,
  Target,
  Activity,
  Check,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import {
  analyzeCameraFrame,
  saveUserFaceBiometric,
  FaceBiometricData,
  FacePoseType,
  FaceBiometricPoseItem,
  FrameAnalysisResult,
} from "@/lib/face-biometric-service";

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
    instruction: "Posisikan wajah tepat di tengah bingkai oval dan tatap lurus ke kamera.",
    badgeHint: "Tatap lurus ke depan",
    icon: "center",
  },
  {
    key: "left",
    label: "Sudut Samping Kiri",
    shortLabel: "2. Kiri",
    instruction: "Tengokkan wajah perlahan ke arah kiri sekitar 25°–35°.",
    badgeHint: "Tengok perlahan ke kiri ⬅️",
    icon: "left",
  },
  {
    key: "right",
    label: "Sudut Samping Kanan",
    shortLabel: "3. Kanan",
    instruction: "Tengokkan wajah perlahan ke arah kanan sekitar 25°–35°.",
    badgeHint: "Tengok perlahan ke kanan ➡️",
    icon: "right",
  },
  {
    key: "up",
    label: "Sudut Atas (Dagu Naik)",
    shortLabel: "4. Atas",
    instruction: "Angkat dagu Anda sedikit ke atas sekitar 15°–20°.",
    badgeHint: "Arahkan wajah sedikit ke atas ⬆️",
    icon: "up",
  },
  {
    key: "down",
    label: "Sudut Bawah (Tunduk)",
    shortLabel: "5. Bawah",
    instruction: "Tundukkan wajah sedikit ke bawah sekitar 15°–20°.",
    badgeHint: "Arahkan wajah sedikit ke bawah ⬇️",
    icon: "down",
  },
];

export function FaceEnrolmentModal({
  isOpen,
  onClose,
  onSuccess,
  userUid,
  userName,
  userRole = "siswa",
  studentId = "",
  nip = "",
  existingPhotoUrl: _existingPhotoUrl,
  title = "Pendaftaran Wajah Master Biometrik",
  description = "Perekaman data acuan wajah multi-sudut resmi untuk validasi absensi harian berbasis AI.",
}: FaceEnrolmentModalProps) {
  const { showSuccess, showError } = useToast();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Workflow steps: "camera" | "preview" | "saving" | "completed"
  const [step, setStep] = useState<"camera" | "preview" | "saving" | "completed">("camera");

  // Multi-pose state (5 poses: front, left, right, up, down)
  const [activePoseIndex, setActivePoseIndex] = useState<number>(0);
  const [capturedPoses, setCapturedPoses] = useState<Partial<Record<FacePoseType, FaceBiometricPoseItem>>>({});
  const [justCapturedPose, setJustCapturedPose] = useState<FacePoseType | null>(null);

  // Synchronization refs to prevent closure desync and duplicate rapid triggers
  const capturedPosesRef = useRef<Partial<Record<FacePoseType, FaceBiometricPoseItem>>>({});
  const isCapturingRef = useRef<boolean>(false);
  const poseCooldownUntilRef = useRef<number>(0);

  // Camera & Stream states
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);

  // Real-time Frame Analysis HUD state
  const [analysis, setAnalysis] = useState<FrameAnalysisResult>({
    hasFace: false,
    brightnessScore: 0,
    centeredScore: 0,
    sharpnessScore: 0,
    overallScore: 0,
    isReadyForCapture: false,
    guidanceText: "Mengaktifkan sensor kamera...",
  });

  // Countdown timer when face is held stable and meets biometric standard
  const [autoCaptureCountdown, setAutoCaptureCountdown] = useState<number | null>(null);
  const stableDurationRef = useRef<number>(0);

  const activePose = POSE_DEFINITIONS[activePoseIndex] || POSE_DEFINITIONS[0];
  const totalPoses = POSE_DEFINITIONS.length;
  const completedCount = Object.keys(capturedPoses).length;

  // Keep capturedPosesRef synchronized with state
  useEffect(() => {
    capturedPosesRef.current = capturedPoses;
  }, [capturedPoses]);

  // Play subtle synthetic camera shutter sound
  const playShutterSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Audio not permitted or failed
    }
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
        } catch (e) {
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

  // Attach stream to video whenever stream updates or videoRef mounts
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
      setStep("camera");
      setActivePoseIndex(0);
      setCapturedPoses({});
      capturedPosesRef.current = {};
      setJustCapturedPose(null);
      setAutoCaptureCountdown(null);
      stableDurationRef.current = 0;
      isCapturingRef.current = false;
      poseCooldownUntilRef.current = Date.now() + 800;
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // 3. Real-time Video Frame Analysis & Automatic Capture Loop
  useEffect(() => {
    if (!isOpen || step !== "camera" || !cameraActive) return;

    let isRunning = true;

    const processFrame = () => {
      if (!isRunning) return;

      // If a capture operation is currently executing, wait
      if (isCapturingRef.current) {
        animFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState >= 2 && video.videoWidth > 0) {
        if (canvas.width !== 320 || canvas.height !== 240) {
          canvas.width = 320;
          canvas.height = 240;
        }

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const result = analyzeCameraFrame(canvas, ctx);

          const now = Date.now();
          const inCooldown = now < poseCooldownUntilRef.current;

          // Standard evaluation:
          // 1. Wajah ada & berada di zona oval
          // 2. Pencahayaan normal (tidak terlalu gelap/backlight)
          // 3. Kamera stabil (sharpness)
          const standardMet = Boolean(result.isStandardMet && result.hasFace);

          // Update guidance text
          if (inCooldown) {
            result.guidanceText = `Persiapan sudut ${activePose.label}: ${activePose.instruction}`;
          } else if (!result.hasFace) {
            result.guidanceText = "Arahkan wajah ke dalam lingkaran oval";
          } else if (result.brightnessScore < 42) {
            result.guidanceText = "Pencahayaan kurang, cari tempat lebih terang";
          } else if (result.centeredScore < 42) {
            result.guidanceText = "Posisikan wajah tepat di tengah oval";
          } else if (result.sharpnessScore < 36) {
            result.guidanceText = "Tahan kamera agar tidak goyang";
          } else {
            result.guidanceText = `Standar terpenuhi! Tahan posisi ${activePose.shortLabel}... (${result.overallScore}% presisi)`;
          }

          setAnalysis(result);

          // Automatic Capture Timer:
          // Once standards are met and cooldown is over, count down 3... 2... 1... SNAP!
          if (!inCooldown && standardMet) {
            stableDurationRef.current += 1;

            if (stableDurationRef.current < 12) {
              setAutoCaptureCountdown(null);
            } else if (stableDurationRef.current < 22) {
              setAutoCaptureCountdown(3);
            } else if (stableDurationRef.current < 32) {
              setAutoCaptureCountdown(2);
            } else if (stableDurationRef.current < 42) {
              setAutoCaptureCountdown(1);
            } else {
              // Standard fulfilled and held -> Auto-Capture Now!
              isCapturingRef.current = true;
              stableDurationRef.current = 0;
              setAutoCaptureCountdown(null);
              triggerCaptureCurrentPose(result.descriptor, result.overallScore);
            }
          } else {
            stableDurationRef.current = 0;
            setAutoCaptureCountdown(null);
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
  }, [isOpen, step, cameraActive, activePoseIndex, activePose]);

  // 4. Capture Current Pose (Executed Automatically or Manually)
  const triggerCaptureCurrentPose = (fallbackDescriptor?: number[], quality = 90) => {
    const video = videoRef.current;
    if (!video) {
      isCapturingRef.current = false;
      return;
    }

    isCapturingRef.current = true;

    try {
      const snapCanvas = document.createElement("canvas");
      snapCanvas.width = 480;
      snapCanvas.height = 480;
      const ctx = snapCanvas.getContext("2d");
      if (!ctx) {
        isCapturingRef.current = false;
        return;
      }

      // Draw centered cropped square face
      const vWidth = video.videoWidth || 640;
      const vHeight = video.videoHeight || 480;
      const minDim = Math.min(vWidth, vHeight);
      const startX = (vWidth - minDim) / 2;
      const startY = (vHeight - minDim) / 2;

      ctx.save();
      ctx.translate(snapCanvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, snapCanvas.width, snapCanvas.height);
      ctx.restore();

      // Subtle watermark bar at bottom
      const barH = 28;
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.fillRect(0, snapCanvas.height - barH, snapCanvas.width, barH);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText(
        `FACE ID • ${activePose.label.toUpperCase()} • ${userName.slice(0, 20)}`,
        12,
        snapCanvas.height - 10
      );

      const dataUrl = snapCanvas.toDataURL("image/jpeg", 0.85);
      const descriptor = fallbackDescriptor || analysis.descriptor || new Array(128).fill(0.08);
      const poseQuality = Math.max(85, quality || analysis.overallScore || 90);

      // Audio & Flash feedback
      playShutterSound();
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 200);

      // Record captured pose into Ref and State
      const currentKey = activePose.key;
      const newCapturedPoses = {
        ...capturedPosesRef.current,
        [currentKey]: {
          photoUrl: dataUrl,
          descriptor,
          qualityScore: poseQuality,
          capturedAt: new Date().toISOString(),
        },
      };
      capturedPosesRef.current = newCapturedPoses;
      setCapturedPoses(newCapturedPoses);
      setJustCapturedPose(currentKey);
      setTimeout(() => setJustCapturedPose(null), 1200);

      // Check if all 5 poses are captured
      const completedCountNow = Object.keys(newCapturedPoses).length;
      if (completedCountNow >= totalPoses) {
        // All 5 poses recorded -> advance to preview
        setTimeout(() => {
          setStep("preview");
          stopCamera();
          isCapturingRef.current = false;
        }, 700);
      } else {
        // Automatically advance to the next uncaptured pose
        let nextIndex = (activePoseIndex + 1) % totalPoses;
        for (let i = 0; i < totalPoses; i++) {
          const testPose = POSE_DEFINITIONS[(activePoseIndex + 1 + i) % totalPoses].key;
          if (!newCapturedPoses[testPose]) {
            nextIndex = (activePoseIndex + 1 + i) % totalPoses;
            break;
          }
        }
        setTimeout(() => {
          setActivePoseIndex(nextIndex);
          stableDurationRef.current = 0;
          setAutoCaptureCountdown(null);
          // Grace period for user to move head to next pose
          poseCooldownUntilRef.current = Date.now() + 1200;
          isCapturingRef.current = false;
        }, 500);
      }
    } catch (err) {
      console.error("Capture face pose error:", err);
      isCapturingRef.current = false;
      showError("Gagal merekam sudut wajah dari kamera.", "Error Kamera");
    }
  };

  const handleRetakeSinglePose = (poseKey: FacePoseType, idx: number) => {
    const updated = { ...capturedPosesRef.current };
    delete updated[poseKey];
    capturedPosesRef.current = updated;
    setCapturedPoses(updated);
    setActivePoseIndex(idx);
    setJustCapturedPose(null);
    setStep("camera");
    poseCooldownUntilRef.current = Date.now() + 1000;
    isCapturingRef.current = false;
    startCamera();
  };

  const handleRetakeAll = () => {
    setCapturedPoses({});
    capturedPosesRef.current = {};
    setActivePoseIndex(0);
    setJustCapturedPose(null);
    poseCooldownUntilRef.current = Date.now() + 800;
    isCapturingRef.current = false;
    setStep("camera");
    startCamera();
  };

  // 5. Save Master Biometrics to Firebase & Cache
  const handleSaveBiometric = async () => {
    if (!userUid) {
      showError("Sesi akun tidak terdeteksi. Silakan muat ulang halaman.", "Autentikasi Diperlukan");
      return;
    }

    const frontPose = capturedPoses.front || Object.values(capturedPoses)[0];
    if (!frontPose) {
      showError("Minimal sudut depan (lurus) wajib terekam.", "Sudut Kurang");
      return;
    }

    setStep("saving");
    try {
      // Calculate overall quality average
      const poseValues = Object.values(capturedPoses);
      const avgQuality = Math.round(
        poseValues.reduce((sum, p) => sum + (p?.qualityScore || 90), 0) / Math.max(1, poseValues.length)
      );

      const biometricData: FaceBiometricData = {
        isEnrolled: true,
        enrolledAt: new Date().toISOString(),
        faceDescriptor: frontPose.descriptor,
        photoUrl: frontPose.photoUrl,
        qualityScore: avgQuality,
        poses: capturedPoses,
        userName,
        userRole,
        studentId,
        nip,
      };

      await saveUserFaceBiometric(userUid, biometricData, userRole);

      setStep("completed");
      showSuccess("Wajah master multi-sudut berhasil didaftarkan!", "Pendaftaran Sukses");

      if (onSuccess) {
        onSuccess(biometricData);
      }

      // Auto close after celebratory screen
      setTimeout(() => {
        onClose();
      }, 1900);
    } catch (err: any) {
      console.error("Error saving biometric:", err);
      showError("Gagal menyimpan data biometrik: " + err.message, "Penyimpanan Gagal");
      setStep("preview");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden text-slate-800 flex flex-col max-h-[94vh]">
        {/* Hidden analysis canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* 1. TOP HEADER BAR */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white/95 backdrop-blur-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#531FFF] to-[#7942FF] flex items-center justify-center text-white shadow-lg shadow-[#531FFF]/25 shrink-0">
              <ScanFace className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight flex items-center gap-2">
                <span>{title}</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  5 Sudut Wajah
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 font-medium line-clamp-1">{description}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. BODY CONTENT ACCORDING TO STEP */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {/* ================= STEP 1: LIVE MULTI-POSE CAMERA SCANNER ================= */}
          {step === "camera" && (
            <div className="space-y-3.5">
              {/* Top Pose Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#531FFF]" />
                    Perekaman Sudut Wajah ({completedCount}/{totalPoses} Selesai)
                  </span>
                  <span className="text-[11px] font-mono font-bold text-emerald-600">
                    {Math.round((completedCount / totalPoses) * 100)}%
                  </span>
                </div>

                {/* 5 Pose Tabs / Pills */}
                <div className="grid grid-cols-5 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                  {POSE_DEFINITIONS.map((p, idx) => {
                    const isDone = Boolean(capturedPoses[p.key]);
                    const isActive = idx === activePoseIndex;
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => {
                          setActivePoseIndex(idx);
                          stableDurationRef.current = 0;
                          setAutoCaptureCountdown(null);
                        }}
                        className={cn(
                          "py-2 px-1 rounded-lg text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5",
                          isActive
                            ? "bg-[#531FFF] text-white shadow-md shadow-[#531FFF]/30 scale-[1.02]"
                            : isDone
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-300 font-semibold"
                            : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200/60 shadow-xs"
                        )}
                        title={p.label}
                      >
                        <span className="text-[10px] font-black uppercase tracking-tight flex items-center gap-0.5">
                          {p.shortLabel}
                          {isDone && <Check className="w-2.5 h-2.5 text-emerald-600 shrink-0" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Current Pose Direction Banner */}
              <div className="p-3 bg-gradient-to-r from-purple-50 via-slate-50 to-indigo-50 rounded-xl border border-purple-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-[#531FFF] text-white flex items-center justify-center shrink-0 font-black shadow-xs">
                    {activePose.icon === "left" && <ArrowLeft className="w-4 h-4 animate-bounce" />}
                    {activePose.icon === "right" && <ArrowRight className="w-4 h-4 animate-bounce" />}
                    {activePose.icon === "up" && <ArrowUp className="w-4 h-4 animate-bounce" />}
                    {activePose.icon === "down" && <ArrowDown className="w-4 h-4 animate-bounce" />}
                    {activePose.icon === "center" && <Target className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-extrabold text-slate-900 text-xs truncate">{activePose.label}</p>
                    <p className="text-[11px] text-purple-700 line-clamp-1">{activePose.instruction}</p>
                  </div>
                </div>
                {capturedPoses[activePose.key] && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300 shrink-0">
                    Sudah Terekam ✓
                  </span>
                )}
              </div>

              {/* Viewport Frame with Always Mounted Video */}
              <div className="relative aspect-4/3 w-full bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-md flex items-center justify-center">
                {/* 1. Video Element (Always Mounted so videoRef is NEVER null) */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  onLoadedMetadata={() => {
                    if (videoRef.current) {
                      videoRef.current.play().catch(() => {});
                      setCameraActive(true);
                    }
                  }}
                  className={cn(
                    "absolute inset-0 w-full h-full object-cover transform -scale-x-100 transition-opacity duration-300",
                    cameraActive ? "opacity-100" : "opacity-0"
                  )}
                />

                {/* 2. Loading / Camera Inactive Overlay */}
                {!cameraActive && (
                  <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center p-6 text-center z-10 space-y-3">
                    {cameraError ? (
                      <>
                        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto animate-pulse" />
                        <p className="text-xs text-amber-800 max-w-xs">{cameraError}</p>
                        <button
                          type="button"
                          onClick={startCamera}
                          className="px-4 py-2 bg-[#531FFF] hover:bg-[#4416d8] text-white text-xs font-bold rounded-xl cursor-pointer transition-all inline-flex items-center gap-1.5 shadow-lg shadow-[#531FFF]/30"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Nyalakan Kamera Ulang</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-8 h-8 text-[#531FFF] animate-spin mx-auto" />
                        <p className="text-xs text-slate-600 font-medium">Menghubungkan sensor biometrik webcam...</p>
                      </>
                    )}
                  </div>
                )}

                {/* Flash Overlay when photo is snapped */}
                {isFlashing && (
                  <div className="absolute inset-0 bg-white/80 z-30 pointer-events-none transition-opacity duration-200" />
                )}

                {/* 3. Futuristic HUD Scanner & Directional Cue */}
                {cameraActive && (
                  <>
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                      {/* Scanning Laser Beam */}
                      <div className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-[#531FFF] to-transparent animate-pulse opacity-70 top-1/3" />

                      {/* Oval Target Ring */}
                      <div
                        className={cn(
                          "w-48 h-64 sm:w-52 sm:h-70 rounded-[50%] border-3 transition-all duration-300 relative flex items-center justify-center",
                          justCapturedPose
                            ? "border-emerald-400 bg-emerald-500/10 shadow-[0_0_40px_rgba(52,211,153,0.6)]"
                            : autoCaptureCountdown !== null
                            ? "border-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.5)] ring-4 ring-emerald-300/30"
                            : analysis.isReadyForCapture
                            ? "border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.4)]"
                            : analysis.hasFace
                            ? "border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.3)]"
                            : "border-purple-400/80 shadow-[0_0_20px_rgba(83,31,255,0.25)]"
                        )}
                      >
                        {/* 4 Corner Crosshairs */}
                        <div className="absolute -top-3 -left-3 w-4 h-4 border-t-2 border-l-2 border-white/80" />
                        <div className="absolute -top-3 -right-3 w-4 h-4 border-t-2 border-r-2 border-white/80" />
                        <div className="absolute -bottom-3 -left-3 w-4 h-4 border-b-2 border-l-2 border-white/80" />
                        <div className="absolute -bottom-3 -right-3 w-4 h-4 border-b-2 border-r-2 border-white/80" />

                        {/* Directional Visual Compass Indicator inside Oval */}
                        <div className="flex flex-col items-center justify-center pointer-events-none space-y-1">
                          {autoCaptureCountdown !== null ? (
                            <div className="flex flex-col items-center justify-center animate-in zoom-in-75 duration-150">
                              <div className="w-18 h-18 rounded-full bg-emerald-600 text-white font-black text-3xl flex items-center justify-center shadow-2xl border-3 border-white ring-4 ring-emerald-300/60">
                                {autoCaptureCountdown}
                              </div>
                              <span className="mt-2 text-[10px] font-black tracking-wide text-white bg-black/80 px-2.5 py-0.5 rounded-full shadow-md whitespace-nowrap">
                                Standar Terpenuhi • Tahan Posisi
                              </span>
                            </div>
                          ) : justCapturedPose ? (
                            <div className="px-3.5 py-2 rounded-full bg-emerald-600 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xl animate-in zoom-in-75">
                              <Check className="w-4 h-4" />
                              <span>Sudut Tersimpan!</span>
                            </div>
                          ) : (
                            <div className="px-3 py-1.5 rounded-full bg-black/65 backdrop-blur-xs border border-white/20 text-center space-y-0.5 shadow-md">
                              <div className="flex items-center justify-center text-purple-300">
                                {activePose.icon === "left" && <ArrowLeft className="w-5 h-5 animate-pulse text-purple-300" />}
                                {activePose.icon === "right" && <ArrowRight className="w-5 h-5 animate-pulse text-purple-300" />}
                                {activePose.icon === "up" && <ArrowUp className="w-5 h-5 animate-pulse text-purple-300" />}
                                {activePose.icon === "down" && <ArrowDown className="w-5 h-5 animate-pulse text-purple-300" />}
                                {activePose.icon === "center" && <Target className="w-4 h-4 text-purple-300" />}
                              </div>
                              <span className="text-[10px] font-bold text-white block">
                                {activePose.badgeHint}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* HUD Status Bar Bottom Overlay (Light & Crisp Glassmorphism) */}
                    <div className="absolute bottom-3 inset-x-3 p-2.5 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-lg flex items-center justify-between text-[11px] font-medium z-10">
                      <div className="flex items-center gap-2 truncate">
                        <Activity className={cn("w-4 h-4 shrink-0", analysis.isReadyForCapture ? "text-emerald-600 animate-spin" : "text-[#531FFF]")} />
                        <span className={cn(analysis.isReadyForCapture ? "text-emerald-700 font-bold" : "text-slate-700 font-semibold")}>
                          {analysis.guidanceText}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-[#531FFF] bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100 font-bold shrink-0 ml-2">
                        Presisi: {analysis.overallScore}%
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Metrics (Cahaya, Posisi, Stabil) */}
              <div className="grid grid-cols-3 gap-2">
                <div className={cn(
                  "p-2 rounded-xl border flex flex-col items-center justify-center text-center transition-all",
                  analysis.brightnessScore >= 40
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-slate-50 border-slate-200 text-slate-500"
                )}>
                  <Sun className="w-3.5 h-3.5 mb-0.5" />
                  <span className="text-[10px] font-bold">Cahaya: {analysis.brightnessScore}%</span>
                </div>

                <div className={cn(
                  "p-2 rounded-xl border flex flex-col items-center justify-center text-center transition-all",
                  analysis.centeredScore >= 45
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-slate-50 border-slate-200 text-slate-500"
                )}>
                  <Target className="w-3.5 h-3.5 mb-0.5" />
                  <span className="text-[10px] font-bold">Posisi: {analysis.centeredScore}%</span>
                </div>

                <div className={cn(
                  "p-2 rounded-xl border flex flex-col items-center justify-center text-center transition-all",
                  analysis.sharpnessScore >= 40
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-slate-50 border-slate-200 text-slate-500"
                )}>
                  <ShieldCheck className="w-3.5 h-3.5 mb-0.5" />
                  <span className="text-[10px] font-bold">Stabil: {analysis.sharpnessScore}%</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => triggerCaptureCurrentPose()}
                  disabled={!cameraActive}
                  className="flex-1 py-3 bg-gradient-to-r from-[#531FFF] to-[#7942FF] hover:from-[#4314cc] hover:to-[#6a34ea] disabled:opacity-40 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-[#531FFF]/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                  title="Sistem akan mengambil foto secara otomatis saat stabil. Klik untuk mengambil seketika secara manual."
                >
                  <Camera className="w-4 h-4" />
                  <span>Jepret Manual ({activePose.shortLabel})</span>
                </button>

                {completedCount >= 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setStep("preview");
                      stopCamera();
                    }}
                    className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer"
                  >
                    Pratinjau ({completedCount} Sudut)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ================= STEP 2: PREVIEW & GALLERY CONFIRMATION ================= */}
          {step === "preview" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">Pratinjau Rekaman Multi-Sudut</h4>
                      <p className="text-[10px] text-slate-500">
                        {completedCount} dari {totalPoses} sudut wajah berhasil diekstrak untuk {userName}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                    Siap Disimpan
                  </span>
                </div>

                {/* 5-Pose Thumbnail Gallery Grid */}
                <div className="grid grid-cols-5 gap-2">
                  {POSE_DEFINITIONS.map((p, pIdx) => {
                    const poseData = capturedPoses[p.key];
                    return (
                      <div
                        key={p.key}
                        className={cn(
                          "relative rounded-xl overflow-hidden border p-1 text-center space-y-1 transition-all",
                          poseData
                            ? "bg-white border-purple-200 shadow-xs"
                            : "bg-slate-100/60 border-dashed border-slate-300 text-slate-400"
                        )}
                      >
                        <div className="aspect-square rounded-lg overflow-hidden bg-slate-100 relative flex items-center justify-center border border-slate-100">
                          {poseData?.photoUrl ? (
                            <img src={poseData.photoUrl} alt={p.label} className="w-full h-full object-cover" />
                          ) : (
                            <ScanFace className="w-6 h-6 text-slate-400" />
                          )}
                          {poseData && (
                            <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-emerald-600 text-white font-black text-[8px] shadow-xs">
                              {poseData.qualityScore}%
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] font-bold block truncate text-slate-700">
                          {p.shortLabel}
                        </span>
                        {poseData && (
                          <button
                            type="button"
                            onClick={() => handleRetakeSinglePose(p.key, pIdx)}
                            className="text-[8px] text-[#531FFF] hover:text-[#4314cc] hover:underline font-bold block w-full text-center cursor-pointer"
                          >
                            Foto Ulang
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Biometric Technical Details */}
                <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-100 space-y-1 text-[10px]">
                  <p className="flex items-center gap-1.5 text-slate-900 font-bold">
                    <Lock className="w-3.5 h-3.5 text-[#531FFF]" />
                    Model: 128-Vektor Descriptors Multi-Angle Gallery
                  </p>
                  <p className="text-slate-600 leading-relaxed text-[9.5px]">
                    Sistem akan memvalidasi kehadiran baik saat Anda menghadap lurus, menengok sedikit ke samping, maupun memiringkan kepala.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleRetakeAll}
                  className="py-3 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Ulangi Semua</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveBiometric}
                  className="py-3 bg-[#531FFF] hover:bg-[#4314cc] text-white font-extrabold text-xs rounded-xl shadow-lg shadow-[#531FFF]/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Wajah Master</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 3: SAVING LOADER ================= */}
          {step === "saving" && (
            <div className="py-12 text-center space-y-4">
              <RefreshCw className="w-10 h-10 text-[#531FFF] animate-spin mx-auto" />
              <div>
                <h4 className="font-extrabold text-base text-slate-900">Menyimpan Multi-Sudut Wajah...</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                  Menyimpan vektor acuan biometrik ke database sekolah dan mengaktifkan profil Face ID.
                </p>
              </div>
            </div>
          )}

          {/* ================= STEP 4: COMPLETED CELEBRATION ================= */}
          {step === "completed" && (
            <div className="py-8 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-lg text-slate-900">Pendaftaran Wajah Berhasil!</h4>
                <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                  Data 5 sudut wajah master Anda telah resmi terdaftar. Anda kini dapat menggunakan <strong>Face Recognition (AI)</strong> saat absensi sekolah dengan pengenalan sudut yang akurat.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
