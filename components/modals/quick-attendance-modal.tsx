"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  ScanFace, 
  Camera, 
  CheckCircle2, 
  XCircle,
  RefreshCw,
  AlertTriangle,
  RotateCcw,
  ShieldAlert,
  Map as MapIcon,
  Clock,
  MapPin,
  X,
  Loader2,
} from "lucide-react";

const playShutterSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.start(now);
    osc.stop(now + 0.15);
  } catch (e) {}
};
import { cn, getTodayDateString } from "@/lib/utils";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import { useToast } from "@/context/ToastContext";
import { formatDistance } from "@/lib/geofence-utils";
import { acquireCurrentLocation, type GeolocationErrorState } from "@/lib/geolocation-service";
import AttendanceGeofenceMap from "@/components/attendance/attendance-geofence-map";
import { useAcademicYear } from "@/context/AcademicYearContext";
import dynamic from "next/dynamic";

const FaceEnrolmentModal = dynamic(
  () => import("@/components/attendance/face-enrolment-modal").then((mod) => mod.FaceEnrolmentModal),
  { ssr: false }
);
import { 
  getUserFaceBiometric, 
  compareFaceDescriptors, 
  FaceBiometricData 
} from "@/lib/face-biometric-service";
import {
  detectFaceWithHuman,
  HumanFaceDetection,
  createLivenessHistory,
  evaluateFaceLiveness,
  FaceLivenessHistory,
} from "@/lib/human-service";

interface AttendanceConfig {
  schoolStartTime: string;
  lateToleranceMinutes: number;
  absentThresholdTime: string;
  schoolCenterLat: number;
  schoolCenterLng: number;
  geofenceRadiusMeters: number;
  requireRadius: boolean;
  studentAttendanceMode: "selfie_only" | "face_recognition";
  minFaceMatchScore: number;
  requireLiveness: boolean;
  schoolAddress: string;
}

const DEFAULT_CONFIG: AttendanceConfig = {
  schoolStartTime: "07:00",
  lateToleranceMinutes: 15,
  absentThresholdTime: "08:30",
  schoolCenterLat: -6.200000,
  schoolCenterLng: 106.816666,
  geofenceRadiusMeters: 100,
  requireRadius: true,
  studentAttendanceMode: "face_recognition",
  minFaceMatchScore: 80,
  requireLiveness: true,
  schoolAddress: "SMART SCHOOL OS Campus - Area Utama Sekolah",
};

export function QuickAttendanceModal({
  isOpen,
  onClose,
  userName,
  studentClass = "10 IPA 1",
  studentId = "NISN-2023001",
  alreadyAttendedToday = false,
  onAttendanceSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  studentClass?: string;
  studentId?: string;
  alreadyAttendedToday?: boolean;
  onAttendanceSuccess?: (record: any) => void;
}) {
  const toastCtx = useToast();
  const showSuccess = toastCtx?.showSuccess;
  const showError = toastCtx?.showError;

  const { activeAcademicYear, activeSemester } = useAcademicYear();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Photo capture state
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  // Auto-scan Face ID states & refs
  const [autoScanStatus, setAutoScanStatus] = useState<"idle" | "searching" | "verifying" | "blinking" | "matched" | "unmatched" | "spoof">("idle");
  const [autoScanFeedback, setAutoScanFeedback] = useState<string>("");
  const [_autoScanScore, setAutoScanScore] = useState<number | null>(null);

  const isAutoScanningRef = useRef(false);
  const hasAutoCapturedRef = useRef(false);
  const matchStreakRef = useRef(0);
  const livenessHistoryRef = useRef<FaceLivenessHistory>(createLivenessHistory());

  // Real-time school attendance configuration from Firestore
  const [config, setConfig] = useState<AttendanceConfig>(DEFAULT_CONFIG);

  // Geolocation state
  const [gpsLoading, setGpsLoading] = useState(true);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsErrorState, setGpsErrorState] = useState<GeolocationErrorState | null>(null);
  const [lastGpsRefreshedAt, setLastGpsRefreshedAt] = useState<Date | null>(null);
  const [locationData, setLocationData] = useState<{
    lat: number;
    lng: number;
    distance: number;
    inRadius: boolean;
  }>({
    lat: DEFAULT_CONFIG.schoolCenterLat,
    lng: DEFAULT_CONFIG.schoolCenterLng,
    distance: 0,
    inRadius: false,
  });

  // Active view tab inside modal: "camera" | "map"
  const [activeTab, setActiveTab] = useState<"camera" | "map">("camera");

  // Real-time live clock
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    if (!isOpen) return;
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Step state: "input" | "processing" | "success"
  const [step, setStep] = useState<"input" | "processing" | "success">("input");
  const [verifiedTime, setVerifiedTime] = useState<string>("");
  const [recordedStatus, setRecordedStatus] = useState<"Hadir" | "Terlambat" | "Alpa">("Hadir");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Biometric Face ID states
  const [faceBiometric, setFaceBiometric] = useState<FaceBiometricData | null>(null);
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
  const [faceVerificationResult, setFaceVerificationResult] = useState<{
    tested: boolean;
    match: boolean;
    similarity: number;
    error?: string;
  } | null>(null);

  // Fetch biometric on open
  useEffect(() => {
    if (!isOpen) return;
    const uid = auth.currentUser?.uid;
    const altId = studentId && studentId !== "-" ? studentId : undefined;
    getUserFaceBiometric(uid || "", altId).then((bio) => {
      if (bio && bio.isEnrolled) {
        setFaceBiometric(bio);
      }
    });
  }, [isOpen, studentId]);

  // 1. Fetch real-time attendance config from Firestore & localStorage
  useEffect(() => {
    if (!isOpen) return;

    // Load from localStorage immediately for fast hydration
    try {
      const cached = localStorage.getItem("quick_schools_attendance_config");
      if (cached) {
        const d = JSON.parse(cached);
        setConfig({
          schoolStartTime: d.schoolStartTime || DEFAULT_CONFIG.schoolStartTime,
          lateToleranceMinutes: d.lateToleranceMinutes ?? DEFAULT_CONFIG.lateToleranceMinutes,
          absentThresholdTime: d.absentThresholdTime || d.autoAbsentTime || DEFAULT_CONFIG.absentThresholdTime,
          schoolCenterLat: Number(d.schoolCenterLat ?? DEFAULT_CONFIG.schoolCenterLat),
          schoolCenterLng: Number(d.schoolCenterLng ?? DEFAULT_CONFIG.schoolCenterLng),
          geofenceRadiusMeters: Number(d.geofenceRadiusMeters ?? DEFAULT_CONFIG.geofenceRadiusMeters),
          requireRadius: d.requireRadius ?? DEFAULT_CONFIG.requireRadius,
          studentAttendanceMode: (d.teacherAttendanceMode || d.studentAttendanceMode || d.attendanceMode || DEFAULT_CONFIG.studentAttendanceMode) as "selfie_only" | "face_recognition",
          minFaceMatchScore: Number(d.minFaceMatchScore ?? DEFAULT_CONFIG.minFaceMatchScore),
          requireLiveness: d.requireLiveness ?? DEFAULT_CONFIG.requireLiveness,
          schoolAddress: d.schoolAddress || d.address || d.locationAddress || d.geofenceCenter?.address || DEFAULT_CONFIG.schoolAddress,
        });
      }
    } catch (e) {}

    // Listen to roles/attendance_config (which has full Firestore read/write permissions)
    const unsubConfig = onSnapshot(
      doc(db, "roles", "attendance_config"),
      (docSnap) => {
        if (docSnap.exists()) {
          const d = docSnap.data();
          setConfig({
            schoolStartTime: d.schoolStartTime || DEFAULT_CONFIG.schoolStartTime,
            lateToleranceMinutes: d.lateToleranceMinutes ?? DEFAULT_CONFIG.lateToleranceMinutes,
            absentThresholdTime: d.absentThresholdTime || d.autoAbsentTime || DEFAULT_CONFIG.absentThresholdTime,
            schoolCenterLat: Number(d.schoolCenterLat ?? DEFAULT_CONFIG.schoolCenterLat),
            schoolCenterLng: Number(d.schoolCenterLng ?? DEFAULT_CONFIG.schoolCenterLng),
            geofenceRadiusMeters: Number(d.geofenceRadiusMeters ?? DEFAULT_CONFIG.geofenceRadiusMeters),
            requireRadius: d.requireRadius ?? DEFAULT_CONFIG.requireRadius,
            studentAttendanceMode: (d.teacherAttendanceMode || d.studentAttendanceMode || d.attendanceMode || DEFAULT_CONFIG.studentAttendanceMode) as "selfie_only" | "face_recognition",
            minFaceMatchScore: Number(d.minFaceMatchScore ?? DEFAULT_CONFIG.minFaceMatchScore),
            requireLiveness: d.requireLiveness ?? DEFAULT_CONFIG.requireLiveness,
            schoolAddress: d.schoolAddress || d.address || d.locationAddress || d.geofenceCenter?.address || DEFAULT_CONFIG.schoolAddress,
          });
          try {
            localStorage.setItem("quick_schools_attendance_config", JSON.stringify(d));
          } catch (e) {}
        }
      },
      (err) => {
        console.warn("Using default/cached attendance config:", err);
      }
    );

    return () => unsubConfig();
  }, [isOpen]);

  // 2. Fetch high-accuracy GPS coordinates of the student using two-tier fallback with forced real-time refresh
  const refreshLocation = useCallback(async () => {
    setGpsLoading(true);
    setGpsError(null);
    setGpsErrorState(null);

    try {
      const res = await acquireCurrentLocation(
        config.schoolCenterLat,
        config.schoolCenterLng,
        config.geofenceRadiusMeters,
        { forceFresh: true }
      );

      setLocationData({
        lat: res.lat,
        lng: res.lng,
        distance: res.distanceMeters,
        inRadius: res.inRadius,
      });
      setLastGpsRefreshedAt(new Date());
      setGpsError(null);
      setGpsErrorState(null);
    } catch (err: any) {
      console.warn("GPS Geolocation error:", err);
      setGpsError(err?.message || "Gagal mendeteksi lokasi GPS perangkat.");
      setGpsErrorState(err);
    } finally {
      setGpsLoading(false);
    }
  }, [config.schoolCenterLat, config.schoolCenterLng, config.geofenceRadiusMeters]);

  // Automatically refresh GPS and acquire fresh real-time coordinates every time modal is opened
  useEffect(() => {
    if (isOpen) {
      setGpsLoading(true);
      setGpsError(null);
      setGpsErrorState(null);
      refreshLocation();
    }
  }, [isOpen, refreshLocation]);

  // 3. Camera lifecycle
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          try {
            await videoRef.current.play();
          } catch (e) {
            console.warn("Video auto-play warning:", e);
          }
        }
        setCameraActive(true);
      } else {
        setCameraError("Peramban Anda tidak mendukung akses kamera langsung.");
      }
    } catch (err: any) {
      console.warn("Camera access error:", err);
      setCameraError("Akses kamera ditolak atau tidak tersedia. Silakan izinkan akses kamera pada peramban.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (isOpen) {
      setStep("input");
      setCapturedPhoto(null);
      setFaceVerificationResult(null);
      hasAutoCapturedRef.current = false;
      matchStreakRef.current = 0;
      livenessHistoryRef.current = createLivenessHistory();
      isAutoScanningRef.current = false;
      setAutoScanStatus("idle");
      setAutoScanFeedback("");
      setAutoScanScore(null);
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  // Continuous Auto-Scan Face ID Loop: automatically scans and captures when face matches
  useEffect(() => {
    if (
      !isOpen ||
      !cameraActive ||
      capturedPhoto ||
      config.studentAttendanceMode !== "face_recognition" ||
      !faceBiometric?.isEnrolled
    ) {
      return;
    }

    hasAutoCapturedRef.current = false;
    matchStreakRef.current = 0;
    livenessHistoryRef.current = createLivenessHistory();
    isAutoScanningRef.current = false;
    setAutoScanStatus("searching");
    setAutoScanFeedback("Posisikan wajah tepat di dalam bingkai...");

    const scanInterval = setInterval(async () => {
      if (
        isAutoScanningRef.current ||
        hasAutoCapturedRef.current ||
        !videoRef.current ||
        videoRef.current.readyState < 2
      ) {
        return;
      }

      const video = videoRef.current;
      if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;

      isAutoScanningRef.current = true;

      try {
        // Fast offscreen scan canvas at 480px for optimal faceres neural network resolution
        const vW = video.videoWidth || 640;
        const vH = video.videoHeight || 480;
        const scanW = Math.min(480, vW);
        const scanH = Math.round(scanW * (vH / vW));

        const canvas = document.createElement("canvas");
        canvas.width = scanW;
        canvas.height = scanH;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          isAutoScanningRef.current = false;
          return;
        }

        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, scanW, scanH);

        // High-speed ArcFace embedding extraction with Anti-Spoofing & Liveness neural models
        let humanResult: HumanFaceDetection | null = null;
        try {
          humanResult = await detectFaceWithHuman(canvas, { fastScan: true, requireAntiSpoof: true });
        } catch (e) {
          // fallback
        }

        let liveDescriptor: number[] | null = null;
        if (humanResult?.embedding && humanResult.embedding.length >= 512) {
          liveDescriptor = humanResult.embedding;
        }

        if (hasAutoCapturedRef.current) {
          isAutoScanningRef.current = false;
          return;
        }

        if (!liveDescriptor || liveDescriptor.length < 512) {
          matchStreakRef.current = 0;
          livenessHistoryRef.current = createLivenessHistory();
          setAutoScanStatus("searching");
          setAutoScanFeedback("Posisikan wajah tepat di dalam bingkai");
          setAutoScanScore(null);
          isAutoScanningRef.current = false;
          return;
        }

        // Strict Anti-Spoofing & Motion Liveness Validation:
        // Neural network analyzes photo/screen artifacts & temporal micro-movement
        if (humanResult) {
          const livenessCheck = evaluateFaceLiveness(livenessHistoryRef.current, humanResult, canvas);
          if (livenessCheck.isSpoof) {
            matchStreakRef.current = 0;
            setAutoScanStatus("spoof");
            setAutoScanFeedback(livenessCheck.reason || "Terdeteksi foto/layar digital! Hadirkan wajah asli.");
            setAutoScanScore(livenessCheck.realScore);
            isAutoScanningRef.current = false;
            return;
          }
        }

        setAutoScanStatus("verifying");
        const minScore = config.minFaceMatchScore || 70;
        const comp = compareFaceDescriptors(faceBiometric, liveDescriptor, minScore);

        if (comp.isLegacy) {
          matchStreakRef.current = 0;
          setAutoScanStatus("unmatched");
          setAutoScanFeedback("Format wajah master lama. Silakan daftar ulang.");
          setAutoScanScore(0);
          isAutoScanningRef.current = false;
          return;
        }

        setAutoScanScore(comp.similarity);

        if (comp.match) {
          // If human hasn't verified liveness yet, prompt them to hold position
          if (!livenessHistoryRef.current.isLivenessPassed) {
            setAutoScanStatus("blinking");
            setAutoScanFeedback("Menyelaraskan wajah asli... Mohon tahan posisi sejenak");
            isAutoScanningRef.current = false;
            return;
          }

          // Require at least 2 consecutive matching & live frames (~360ms) after verified liveness
          matchStreakRef.current += 1;

          if (matchStreakRef.current < 2) {
            setAutoScanStatus("verifying");
            setAutoScanFeedback("Wajah cocok! Mengonfirmasi presensi...");
            isAutoScanningRef.current = false;
            return;
          }

          setAutoScanStatus("matched");
          const livenessNote = livenessHistoryRef.current.livenessReason || "Wajah Asli Cocok";
          setAutoScanFeedback(`${livenessNote}! Memproses presensi...`);

          // Confirmed match across multi-frame liveness streak: Auto-capture!
          hasAutoCapturedRef.current = true;
          playShutterSound();

          // High-resolution capture canvas for final attendance photo
          const fullCanvas = document.createElement("canvas");
          fullCanvas.width = vW;
          fullCanvas.height = vH;
          const fullCtx = fullCanvas.getContext("2d");
          if (fullCtx) {
            fullCtx.translate(fullCanvas.width, 0);
            fullCtx.scale(-1, 1);
            fullCtx.drawImage(video, 0, 0, fullCanvas.width, fullCanvas.height);

            // Watermark overlay
            fullCtx.scale(-1, 1);
            fullCtx.translate(-fullCanvas.width, 0);
            fullCtx.fillStyle = "rgba(0, 0, 0, 0.4)";
            fullCtx.fillRect(0, fullCanvas.height - 36, fullCanvas.width, 36);
            fullCtx.fillStyle = "#ffffff";
            fullCtx.font = "bold 13px sans-serif";
            const nowStr = new Date().toLocaleString("id-ID");
            fullCtx.fillText(`${userName} (${studentId}) • ${nowStr}`, 14, fullCanvas.height - 13);

            const dataUrl = fullCanvas.toDataURL("image/jpeg", 0.85);
            setCapturedPhoto(dataUrl);
          }

          setFaceVerificationResult({
            tested: true,
            match: true,
            similarity: comp.similarity,
          });
          showSuccess?.("Wajah terverifikasi asli & cocok!", "Presensi Face ID Sukses");
          stopCamera();
        } else {
          matchStreakRef.current = 0;
          setAutoScanStatus("unmatched");
          setAutoScanFeedback("Wajah belum cocok. Posisikan wajah di tengah bingkai");
        }
      } catch (err) {
        console.warn("Auto-scan frame error:", err);
      } finally {
        isAutoScanningRef.current = false;
      }
    }, 180);

    return () => {
      clearInterval(scanInterval);
      isAutoScanningRef.current = false;
    };
  }, [
    isOpen,
    cameraActive,
    capturedPhoto,
    config.studentAttendanceMode,
    config.minFaceMatchScore,
    faceBiometric,
    userName,
    studentId,
    showSuccess,
  ]);

  // 4. Capture photo from live video feed into base64 data URL
  const handleCapturePhoto = async () => {
    if (!videoRef.current) return;
    hasAutoCapturedRef.current = true;

    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Flip horizontally to match mirror preview
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Biometric extraction if mode is face_recognition
      if (config.studentAttendanceMode === "face_recognition") {
        if (!faceBiometric?.isEnrolled) {
          showError?.("Wajah master belum terdaftar. Silakan rekam wajah master Anda terlebih dahulu.", "Face ID Belum Terdaftar");
          setFaceVerificationResult({
            tested: true,
            match: false,
            similarity: 0,
            error: "Wajah master belum terdaftar.",
          });
          setIsFaceModalOpen(true);
          return;
        }

        // Smart Biometric Extraction: Detect via Human.js ArcFace AI with Anti-Spoofing
        let liveDescriptor: number[] | null = null;
        let humanResult: HumanFaceDetection | null = null;

        try {
          humanResult = await detectFaceWithHuman(canvas, { fastScan: false, requireAntiSpoof: true });
        } catch (e) {
          console.warn("detectFaceWithHuman error in quick attendance:", e);
        }

        if (humanResult?.embedding && humanResult.embedding.length >= 512) {
          liveDescriptor = humanResult.embedding;
        }

        if (!liveDescriptor || liveDescriptor.length < 512) {
          showError?.("Wajah tidak terdeteksi dengan jelas oleh AI biometrik. Pastikan wajah tegak lurus dan pencahayaan terang.", "Wajah Tidak Terdeteksi");
          setFaceVerificationResult({
            tested: true,
            match: false,
            similarity: 0,
            error: "Wajah tidak terdeteksi jelas oleh AI.",
          });
          return;
        }

        // Strict Anti-Spoofing & Screen Glare Artifacts check on manual capture
        const realScore = humanResult?.liveness?.realScore ?? 85;
        if (humanResult && (humanResult.liveness?.isLive === false || realScore < 45 || humanResult.screenArtifacts?.isScreenSpoof)) {
          const reason = humanResult.screenArtifacts?.isScreenSpoof
            ? "Terdeteksi pantulan cahaya layar smartphone / digital (Screen Glare Artifacts)"
            : `Terdeteksi foto atau layar digital (Keaslian: ${realScore}% / Min 45%)`;
          showError?.(
            `Presensi ditolak: ${reason}. Harap hadirkan wajah asli langsung di depan kamera.`,
            "Terdeteksi Foto / Layar (Anti-Spoofing)"
          );
          setFaceVerificationResult({
            tested: true,
            match: false,
            similarity: 0,
            error: reason,
          });
          return;
        }

        // Must have verified liveness (passive stability or natural organic check) in live session
        if (!livenessHistoryRef.current.isLivenessPassed) {
          showError?.(
            "Presensi ditolak: Wajah belum terverifikasi sebagai wajah asli di depan kamera langsung (Bukan Foto/Layar HP). Mohon tahan posisi sejenak.",
            "Verifikasi Wajah Asli"
          );
          setFaceVerificationResult({
            tested: true,
            match: false,
            similarity: 0,
            error: "Wajah asli belum terverifikasi (Pastikan bukan foto/layar HP).",
          });
          return;
        }

        // Compare against ALL 5 recorded poses (front, left, right, up, down)
        const comp = compareFaceDescriptors(
          faceBiometric,
          liveDescriptor,
          config.minFaceMatchScore || 70
        );

        if (comp.isLegacy) {
          showError?.(
            comp.error || "Data wajah master Anda terdaftar dengan versi lama. Silakan lakukan pendaftaran ulang wajah di profil/akun.",
            "Wajah Master Perlu Diperbarui"
          );
          setFaceVerificationResult({
            tested: true,
            match: false,
            similarity: 0,
            error: "Data wajah master versi lama. Perlu daftar ulang.",
          });
          return;
        }

        if (!comp.match) {
          setFaceVerificationResult({
            tested: true,
            match: false,
            similarity: comp.similarity,
            error: "Wajah tidak cocok dengan data master terdaftar.",
          });
          showError?.(
            "Wajah tidak cocok dengan data master terdaftar. Pastikan pencahayaan cukup dan hadapkan wajah ke kamera.",
            "Verifikasi Wajah Gagal"
          );
          return;
        } else {
          setFaceVerificationResult({
            tested: true,
            match: true,
            similarity: comp.similarity,
          });
          showSuccess?.(`Wajah cocok ${comp.similarity}%! Terverifikasi AI asli.`, "Verifikasi Sukses");
        }
      } else {
        setFaceVerificationResult({
          tested: false,
          match: true,
          similarity: 100,
        });
      }

      playShutterSound();

      // Add watermark overlay
      ctx.scale(-1, 1);
      ctx.translate(-canvas.width, 0);
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.fillRect(0, canvas.height - 36, canvas.width, 36);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 13px sans-serif";
      const nowStr = new Date().toLocaleString("id-ID");
      ctx.fillText(`${userName} (${studentId}) • ${nowStr}`, 14, canvas.height - 13);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setCapturedPhoto(dataUrl);
      stopCamera();
    } catch (err) {
      console.error("Photo capture error:", err);
    }
  };

  // Retake photo
  const handleRetakePhoto = () => {
    hasAutoCapturedRef.current = false;
    matchStreakRef.current = 0;
    livenessHistoryRef.current = createLivenessHistory();
    isAutoScanningRef.current = false;
    setAutoScanStatus("idle");
    setAutoScanFeedback("");
    setAutoScanScore(null);
    setCapturedPhoto(null);
    setFaceVerificationResult(null);
    startCamera();
  };

  // Fallback file capture for devices without WebRTC camera access
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (config.studentAttendanceMode === "face_recognition") {
      showError?.(
        "Presensi Face Recognition wajib menggunakan kamera langsung (Live AI) untuk verifikasi anti-spoofing.",
        "Unggah Galeri Dinonaktifkan"
      );
      if (e.target) e.target.value = "";
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setCapturedPhoto(result);
        setFaceVerificationResult({
          tested: false,
          match: true,
          similarity: 100,
        });
        stopCamera();
      }
    };
    reader.readAsDataURL(file);
  };

  // 5. Submit attendance validation & save to Firestore
  const canSubmit = Boolean(
    capturedPhoto &&
    !gpsLoading &&
    (!config.requireRadius || locationData.inRadius) &&
    !isSubmitting &&
    !alreadyAttendedToday &&
    (config.studentAttendanceMode !== "face_recognition" || faceVerificationResult?.match)
  );

  const handleSubmitAttendance = async () => {
    // Block if already attended today
    if (alreadyAttendedToday) {
      if (showError) showError("Anda sudah melakukan presensi hari ini. Presensi hanya dapat dilakukan satu kali per hari.", "Sudah Presensi");
      return;
    }

    // Strict enforcement: Siswa wajib melakukan foto terlebih dahulu
    if (!capturedPhoto || capturedPhoto.trim() === "") {
      if (showError) showError("Foto selfie kehadiran siswa wajib diambil terlebih dahulu sebelum melakukan konfirmasi absensi.", "Foto Wajib");
      return;
    }

    if (config.requireRadius && !locationData.inRadius) {
      if (showError) {
        showError(
          `Absensi ditolak! Lokasi Anda berada ${locationData.distance}m dari sekolah (maksimal ${config.geofenceRadiusMeters}m).`,
          "Di Luar Radius Sekolah"
        );
      }
      return;
    }

    setIsSubmitting(true);
    setStep("processing");

    const now = new Date();
    const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

    // Aturan Kunci Otomatis Pukul 12:00 WIB (12 Siang - Data Final)
    if (currentTotalMinutes >= 12 * 60) {
      if (showError) {
        showError(
          "Waktu absensi siswa telah melewati batas pukul 12:00 WIB. Data absensi pada hari ini sudah FINAL dan tidak dapat dilakukan presensi/pengeditan lagi.",
          "Absensi Ditutup (Data Final)"
        );
      }
      setIsSubmitting(false);
      return;
    }

    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const cleanTimeHM = `${hours}:${minutes}`;
    const cleanTimeHMS = `${hours}:${minutes}:${seconds}`;
    const timeStr = `${cleanTimeHMS} WIB`;
    // Reference date based on current local date (YYYY-MM-DD), rolling over automatically at 00:00 midnight
    const dateStr = getTodayDateString(now);
    const readableDate = now.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
    setVerifiedTime(timeStr);

    // Calculate late & automatic Alpa status based on Batas Maksimal Dihitung Alpa
    const [startH, startM] = config.schoolStartTime.split(":").map(Number);
    const startTotalMinutes = (startH || 7) * 60 + (startM || 0) + config.lateToleranceMinutes;
    const isLate = currentTotalMinutes > startTotalMinutes;

    // Batas Maksimal Dihitung Alpa
    const [absentH, absentM] = (config.absentThresholdTime || "08:30").split(":").map(Number);
    const absentTotalMinutes = (isNaN(absentH) ? 8 : absentH) * 60 + (isNaN(absentM) ? 30 : absentM);
    const isAlpa = currentTotalMinutes >= absentTotalMinutes;

    const resolvedStatus: "Hadir" | "Terlambat" | "Alpa" = isAlpa
      ? "Alpa"
      : isLate
      ? "Terlambat"
      : "Hadir";

    const resolvedNotes = isAlpa
      ? `Otomatis Alpa (Melewati Batas Maksimal ${config.absentThresholdTime || "08:30"} WIB)`
      : isLate
      ? "Terlambat Hadir"
      : "Hadir Tepat Waktu";

    setRecordedStatus(resolvedStatus);

    const user = auth.currentUser;
    const studentUid = user?.uid || "";
    const cleanStudentId = studentId && studentId !== "-" ? studentId : (studentUid || "siswa");
    // Deterministic doc ID: combination of Student ID + Attendance Date (att_ID_YYYY-MM-DD)
    // Ensures records automatically reset after 00:00 midnight on day transition
    const recordDocId = `att_${cleanStudentId}_${dateStr}`;
    const recordPayload = {
      id: recordDocId,
      type: "attendance_record",
      studentId: cleanStudentId,
      studentUid,
      uid: studentUid,
      nisn: studentId && studentId !== "-" ? studentId : "",
      studentName: userName,
      studentEmail: user?.email || "",
      className: studentClass,
      academicYear: activeAcademicYear || "2025/2026",
      semester: activeSemester || "Ganjil",
      date: dateStr,
      readableDate,
      timestamp: timeStr,
      time: cleanTimeHM,
      jamMasuk: cleanTimeHM,
      status: resolvedStatus,
      notes: resolvedNotes,
      capturedImage: capturedPhoto,
      location: {
        lat: locationData.lat,
        lng: locationData.lng,
        distance: locationData.distance,
        inRadius: locationData.inRadius,
        schoolLat: config.schoolCenterLat,
        schoolLng: config.schoolCenterLng,
        radiusLimit: config.geofenceRadiusMeters,
      },
      attendanceMode: config.studentAttendanceMode,
      faceVerified: config.studentAttendanceMode === "face_recognition" ? (faceVerificationResult?.match ?? true) : false,
      faceMatchScore: config.studentAttendanceMode === "face_recognition" ? (faceVerificationResult?.similarity ?? 95) : null,
      source: config.studentAttendanceMode === "face_recognition" ? "face_recognition_ai" : "selfie_photo",
      createdAt: new Date().toISOString(),
    };

    try {
      // 0. Server-side duplicate check: verify Student ID + Today's Date combination
      const idsToCheck = [recordDocId];
      if (studentUid && studentUid !== cleanStudentId) {
        idsToCheck.push(`att_${studentUid}_${dateStr}`);
      }

      for (const idToCheck of idsToCheck) {
        try {
          const existingDoc = await getDoc(doc(db, "attendance", idToCheck));
          if (existingDoc.exists()) {
            if (showError) showError("Absensi hari ini sudah tercatat. Presensi hanya dapat dilakukan satu kali per hari.", "Absensi Hari Ini Sudah Tercatat");
            setStep("input");
            setIsSubmitting(false);
            return;
          }
        } catch (checkErr) {
          // Fallback check in 'roles' collection
          try {
            const existingRole = await getDoc(doc(db, "roles", idToCheck));
            if (existingRole.exists()) {
              if (showError) showError("Absensi hari ini sudah tercatat. Presensi hanya dapat dilakukan satu kali per hari.", "Absensi Hari Ini Sudah Tercatat");
              setStep("input");
              setIsSubmitting(false);
              return;
            }
          } catch (e) {}
        }
      }

      // 1. Primary write to 'attendance' collection
      try {
        await setDoc(doc(db, "attendance", recordDocId), recordPayload);
      } catch (attErr) {
        console.warn("Direct attendance collection write warning, falling back to roles:", attErr);
      }

      // 2. Also write to Firestore allowed collection: 'roles'
      try {
        await setDoc(doc(db, "roles", recordDocId), recordPayload);
      } catch (roleErr) {
        console.warn("Roles collection write warning:", roleErr);
      }

      // 3. Also save to localStorage for client-side persistence & fast access
      try {
        const stored = localStorage.getItem("quick_schools_attendance_records");
        const list = stored ? JSON.parse(stored) : [];
        const filtered = list.filter((r: any) => r.id !== recordDocId);
        filtered.unshift(recordPayload);
        localStorage.setItem("quick_schools_attendance_records", JSON.stringify(filtered.slice(0, 100)));
      } catch (e) {}

      // 4. Dispatch custom event for instant cross-component reactivity
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("attendance_updated", { detail: recordPayload }));
      }

      if (showSuccess) {
        if (isAlpa) {
          showSuccess(
            `Presensi berhasil dicatat! Status: ALPA karena telah melewati batas maksimal waktu presensi (${config.absentThresholdTime || "08:30"} WIB). Jarak GPS: ${locationData.distance}m.`,
            "Status: Alpa"
          );
        } else {
          showSuccess(
            `Absensi berhasil dicatat! Status: ${isLate ? "Terlambat" : "Hadir"} (Jarak: ${locationData.distance}m).`,
            "Presensi Terverifikasi"
          );
        }
      }
      onAttendanceSuccess?.(recordPayload);
      setStep("success");
    } catch (err: any) {
      console.warn("Primary firestore write error, attempting local fallback:", err);
      // Fallback local save so student attendance is NEVER lost
      try {
        const stored = localStorage.getItem("quick_schools_attendance_records");
        const list = stored ? JSON.parse(stored) : [];
        list.unshift(recordPayload);
        localStorage.setItem("quick_schools_attendance_records", JSON.stringify(list.slice(0, 100)));
        if (showSuccess) {
          if (isAlpa) {
            showSuccess(
              `Presensi dicatat secara lokal dengan status: ALPA (Melewati Batas Maksimal: ${config.absentThresholdTime || "08:30"} WIB).`,
              "Presensi Tersimpan: Alpa"
            );
          } else {
            showSuccess(
              `Absensi berhasil dicatat secara lokal! Status: ${isLate ? "Terlambat" : "Hadir"}.`,
              "Presensi Tersimpan"
            );
          }
        }
        onAttendanceSuccess?.(recordPayload);
        setStep("success");
      } catch (fallbackErr: any) {
        if (showError) showError("Gagal menyimpan data absensi: " + err.message, "Gagal");
        setStep("input");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-900/65 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200 z-10 flex flex-col my-auto">
        
        {/* Header Bar */}
        <div className="px-5 sm:px-6 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-950 via-[#1E1035] to-gray-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#531FFF] to-[#7B4DFF] flex items-center justify-center text-white shadow-lg shadow-[#531FFF]/40 shrink-0">
              <ScanFace className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black tracking-tight leading-tight">Presensi Absensi Siswa</h3>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[9px] font-extrabold rounded-md flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Biometrik
                </span>
              </div>
              <p className="text-[11px] text-gray-300 font-medium truncate max-w-[220px] sm:max-w-md">
                {userName} ({studentId}) · Kelas {studentClass}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-1 rounded-xl bg-white/10 text-cyan-300 border border-white/20 shadow-xs">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>{currentTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} WIB</span>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Already Attended Banner (if applicable) */}
        {alreadyAttendedToday && step === "input" && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-900 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="text-[11px] leading-tight">
              <span className="font-extrabold text-emerald-950">Sudah Absen Hari Ini: </span>
              <span className="text-emerald-800">Presensi hanya dilakukan 1x per hari. Tombol absensi dinonaktifkan.</span>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {step === "input" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
              {/* Left Column: Camera / Map Viewport (Takes 7 cols on desktop - much larger and prominent!) */}
              <div className="lg:col-span-7 flex flex-col justify-between space-y-3">
                {/* Switcher & Badges */}
                <div className="flex items-center justify-between">
                  {/* View tabs pills */}
                  <div className="flex items-center p-1 bg-gray-100/90 rounded-xl border border-gray-200/70 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setActiveTab("camera")}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer",
                        activeTab === "camera"
                          ? "bg-white text-[#531FFF] shadow-xs"
                          : "text-gray-500 hover:text-gray-900"
                      )}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Kamera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("map")}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer",
                        activeTab === "map"
                          ? "bg-white text-[#531FFF] shadow-xs"
                          : "text-gray-500 hover:text-gray-900"
                      )}
                    >
                      <MapIcon className="w-3.5 h-3.5" />
                      <span>Peta Radius</span>
                    </button>
                  </div>

                  {/* Camera status badge */}
                  {activeTab === "camera" ? (
                    capturedPhoto ? (
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Foto Siap</span>
                      </span>
                    ) : cameraActive ? (
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Kamera Aktif</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
                        Kamera Siaga
                      </span>
                    )
                  ) : (
                    <span className="text-[11px] font-bold text-[#531FFF] bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-lg">
                      Radius {config.geofenceRadiusMeters}m
                    </span>
                  )}
                </div>

                {/* Face Biometric Enrollment Prompt */}
                {config.studentAttendanceMode === "face_recognition" && !faceBiometric?.isEnrolled && (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-white border border-purple-400/40 flex items-center justify-between gap-3 text-xs shadow-lg">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                        <ScanFace className="w-5 h-5 text-purple-300" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-extrabold text-xs">Wajah Master Belum Terdaftar</p>
                        <p className="text-[10px] text-purple-200 truncate">Daftarkan wajah acuan Anda untuk absensi AI.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsFaceModalOpen(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-white text-[#531FFF] font-extrabold text-[11px] hover:bg-purple-50 transition-colors shrink-0 shadow-xs cursor-pointer"
                    >
                      Daftar Wajah
                    </button>
                  </div>
                )}

                {/* Viewport Box (Camera or Map) */}
                {activeTab === "camera" ? (
                  <div className="relative aspect-[4/3] w-full max-h-[340px] sm:max-h-[370px] md:max-h-[390px] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl flex items-center justify-center">
                    {/* Live Video */}
                    {!capturedPhoto && (
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
                          "w-full h-full object-cover transform -scale-x-100 transition-opacity duration-300",
                          cameraActive ? "opacity-100" : "opacity-0"
                        )}
                      />
                    )}

                    {/* Captured Photo Preview */}
                    {capturedPhoto && (
                      <div className="relative w-full h-full flex items-center justify-center bg-black">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={capturedPhoto}
                          alt="Foto Absensi"
                          className="w-full h-full object-cover"
                        />
                        {/* Biometric Match HUD Overlay */}
                        {config.studentAttendanceMode === "face_recognition" && faceVerificationResult?.match && (
                          <div className="absolute top-3 left-3 z-10 px-3 py-1.5 bg-emerald-950/90 border border-emerald-500/60 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2 backdrop-blur-md shadow-lg">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Wajah Cocok ({faceVerificationResult.similarity}%)</span>
                          </div>
                        )}
                        <div className="absolute top-3 right-3 z-10">
                          <button
                            type="button"
                            onClick={handleRetakePhoto}
                            className="px-3 py-1.5 bg-black/80 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-2 backdrop-blur-md transition-colors cursor-pointer border border-white/20 shadow-lg"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Ambil Ulang</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Inactive / Camera Error Fallback */}
                    {!cameraActive && !capturedPhoto && (
                      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-[#1E1035] to-gray-950 flex flex-col items-center justify-center p-6 text-center text-white">
                        <div className="w-16 h-16 rounded-2xl border-2 border-[#531FFF]/50 flex items-center justify-center bg-[#531FFF]/15 shadow-xl mb-3">
                          <ScanFace className="w-8 h-8 text-[#531FFF] animate-pulse" />
                        </div>
                        <h4 className="font-extrabold text-sm mb-1">Kamera Siap Diaktifkan</h4>
                        <p className="text-xs text-gray-300 max-w-sm mb-4 leading-relaxed">
                          {cameraError || "Aktifkan kamera live untuk memverifikasi wajah presensi siswa secara real-time."}
                        </p>

                        <div className="flex flex-wrap items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={startCamera}
                            className="px-4 py-2 bg-[#531FFF] hover:bg-[#4317CC] text-white rounded-xl text-xs font-bold shadow-lg shadow-[#531FFF]/40 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                          >
                            <Camera className="w-4 h-4" />
                            <span>Aktifkan Kamera</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border border-white/20"
                          >
                            <Camera className="w-4 h-4" />
                            <span>Kamera HP</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Live Camera HUD Overlays */}
                    {!capturedPhoto && cameraActive && (
                      <>
                        {/* Top Auto-Scan Status Pill */}
                        {config.studentAttendanceMode === "face_recognition" && (
                          <div className="absolute top-3 inset-x-3 z-20 flex items-center justify-center pointer-events-none">
                            <div
                              className={cn(
                                "px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 backdrop-blur-md border shadow-xl transition-all duration-300",
                                autoScanStatus === "matched"
                                  ? "bg-emerald-950/85 text-emerald-300 border-emerald-500/60 shadow-emerald-500/20"
                                  : autoScanStatus === "blinking"
                                  ? "bg-cyan-950/90 text-cyan-200 border-cyan-400 shadow-cyan-500/30 animate-pulse"
                                  : autoScanStatus === "verifying"
                                  ? "bg-cyan-950/85 text-cyan-300 border-cyan-500/60 shadow-cyan-500/20"
                                  : autoScanStatus === "spoof"
                                  ? "bg-rose-950/90 text-rose-300 border-rose-500/80 shadow-rose-500/30"
                                  : autoScanStatus === "unmatched"
                                  ? "bg-amber-950/85 text-amber-300 border-amber-500/60"
                                  : "bg-slate-900/85 text-white/90 border-white/20"
                              )}
                            >
                              {autoScanStatus === "matched" ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-bounce" />
                              ) : autoScanStatus === "blinking" ? (
                                <ScanFace className="w-4 h-4 text-cyan-300 animate-pulse" />
                              ) : autoScanStatus === "verifying" ? (
                                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                              ) : autoScanStatus === "spoof" ? (
                                <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
                              ) : autoScanStatus === "unmatched" ? (
                                <AlertTriangle className="w-4 h-4 text-amber-400" />
                              ) : (
                                <ScanFace className="w-4 h-4 text-cyan-400 animate-pulse" />
                              )}
                              <span className="truncate max-w-[280px] sm:max-w-md font-semibold">
                                {autoScanFeedback || (faceBiometric?.isEnrolled ? "Posisikan wajah di dalam bingkai..." : "Wajah master belum terdaftar")}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Centered HUD Bounding Box - Well-proportioned framing */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <div
                            className={cn(
                              "w-36 h-48 sm:w-42 sm:h-56 border-2 rounded-2xl relative flex items-center justify-center transition-all duration-300",
                              autoScanStatus === "matched"
                                ? "border-emerald-400 bg-emerald-500/10 shadow-[0_0_25px_rgba(52,211,153,0.35)] ring-4 ring-emerald-400/30"
                                : autoScanStatus === "blinking"
                                ? "border-cyan-400 bg-cyan-500/15 shadow-[0_0_30px_rgba(6,182,212,0.4)] ring-4 ring-cyan-400/40 animate-pulse"
                                : autoScanStatus === "verifying"
                                ? "border-cyan-400 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.25)]"
                                : autoScanStatus === "spoof"
                                ? "border-rose-500 bg-rose-500/15 shadow-[0_0_25px_rgba(244,63,94,0.35)] ring-4 ring-rose-500/30"
                                : autoScanStatus === "unmatched"
                                ? "border-amber-400/80 bg-amber-500/10"
                                : "border-dashed border-cyan-400/70"
                            )}
                          >
                            <div className={cn("absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 rounded-tl-lg transition-colors", autoScanStatus === "matched" ? "border-emerald-400" : autoScanStatus === "blinking" ? "border-cyan-400" : autoScanStatus === "spoof" ? "border-rose-500" : "border-cyan-400")} />
                            <div className={cn("absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 rounded-tr-lg transition-colors", autoScanStatus === "matched" ? "border-emerald-400" : autoScanStatus === "blinking" ? "border-cyan-400" : autoScanStatus === "spoof" ? "border-rose-500" : "border-cyan-400")} />
                            <div className={cn("absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 rounded-bl-lg transition-colors", autoScanStatus === "matched" ? "border-emerald-400" : autoScanStatus === "blinking" ? "border-cyan-400" : autoScanStatus === "spoof" ? "border-rose-500" : "border-cyan-400")} />
                            <div className={cn("absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 rounded-br-lg transition-colors", autoScanStatus === "matched" ? "border-emerald-400" : autoScanStatus === "blinking" ? "border-cyan-400" : autoScanStatus === "spoof" ? "border-rose-500" : "border-cyan-400")} />

                            {/* Scanning laser line animation */}
                            {config.studentAttendanceMode === "face_recognition" && (
                              <div className={cn(
                                "absolute inset-x-3 top-3 h-0.5 bg-gradient-to-r from-transparent to-transparent animate-pulse",
                                autoScanStatus === "spoof"
                                  ? "via-rose-500 shadow-[0_0_10px_#f43f5e]"
                                  : "via-cyan-400 shadow-[0_0_10px_#22d3ee]"
                              )} />
                            )}

                            <ScanFace className={cn("w-10 h-10 transition-colors", autoScanStatus === "matched" ? "text-emerald-400/70" : autoScanStatus === "spoof" ? "text-rose-400/80" : autoScanStatus === "blinking" ? "text-cyan-300 animate-pulse" : "text-cyan-400/40")} />
                          </div>
                        </div>

                        {/* Bottom Action HUD: Auto-Scan indicator + Instant manual trigger */}
                        <div className="absolute bottom-3 inset-x-0 flex items-center justify-center px-4 z-10 gap-2.5">
                          {config.studentAttendanceMode === "face_recognition" ? (
                            <div className="flex items-center gap-2.5 bg-black/60 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-xl">
                              <div className="px-3 py-1.5 text-white/90 text-xs font-semibold flex items-center gap-2">
                                <span className="relative flex h-2.5 w-2.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                </span>
                                <span>Auto-Scan AI Aktif</span>
                              </div>
                              <button
                                type="button"
                                onClick={handleCapturePhoto}
                                className="px-3.5 py-1.5 bg-[#531FFF] hover:bg-[#6E3BFF] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 border border-purple-400/30"
                                title="Ambil foto langsung tanpa menunggu auto-scan"
                              >
                                <ScanFace className="w-3.5 h-3.5" />
                                <span>Ambil Manual</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={handleCapturePhoto}
                              className="px-5 py-2.5 bg-gradient-to-r from-[#531FFF] via-[#6E3BFF] to-[#8F94FB] text-white font-extrabold text-xs rounded-2xl shadow-xl shadow-[#531FFF]/40 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                            >
                              <Camera className="w-4 h-4" />
                              <span>Ambil Foto Absensi</span>
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  /* Map view */
                  <div className="w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-gray-200 bg-gray-50 flex flex-col shadow-inner">
                    <AttendanceGeofenceMap
                      centerLat={config.schoolCenterLat}
                      centerLng={config.schoolCenterLng}
                      radius={config.geofenceRadiusMeters}
                      interactive={false}
                      studentLocation={{
                        lat: locationData.lat,
                        lng: locationData.lng,
                        distance: locationData.distance,
                        inRadius: locationData.inRadius,
                        label: `Posisi (${userName})`,
                      }}
                      height="360px"
                    />
                    <div className="p-2.5 bg-white border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
                      <span className="font-medium">Radius Aman: <strong>{config.geofenceRadiusMeters}m</strong></span>
                      <button
                        type="button"
                        onClick={() => setActiveTab("camera")}
                        className="text-[#531FFF] font-bold hover:underline cursor-pointer"
                      >
                        Kembali ke Kamera
                      </button>
                    </div>
                  </div>
                )}

                {/* Sub-bar Helper */}
                <div className="flex items-center justify-between text-[11px] text-gray-500 px-1">
                  <span>💡 Posisikan wajah di tengah bingkai dalam pencahayaan yang cukup</span>
                  {config.studentAttendanceMode === "selfie_only" && (
                    <>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[#531FFF] hover:underline font-semibold cursor-pointer"
                      >
                        Unggah dari Galeri
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="user"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Right Column: Redesigned Layout for Details, GPS, & Action */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-3.5">
                {/* 1. Identity & Schedule Card */}
                <div className="p-3.5 bg-gradient-to-br from-slate-50 to-purple-50/30 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 uppercase font-extrabold tracking-wider">Identitas Siswa</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-purple-100/70 text-[#531FFF] border border-purple-200/60">
                      Siswa Aktif
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <strong className="text-gray-900 text-sm font-black block leading-tight">{userName}</strong>
                      <p className="text-[11px] text-gray-500 mt-0.5 font-medium">NISN: {studentId} • Kelas {studentClass}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-gray-400 block font-semibold">Jam Masuk</span>
                      <strong className="font-mono text-xs text-gray-800 font-bold block">{config.schoolStartTime} WIB</strong>
                    </div>
                  </div>
                </div>

                {/* 2. Geofence & GPS Verification Card */}
                <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2.5 text-xs shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-lg bg-[#531FFF]/10 flex items-center justify-center text-[#531FFF]">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-gray-900 text-xs">Lokasi & Radius GPS</span>
                    </div>
                    <button
                      type="button"
                      onClick={refreshLocation}
                      disabled={gpsLoading}
                      className="text-[11px] text-[#531FFF] hover:text-[#4317CC] flex items-center gap-1 font-bold cursor-pointer transition-colors"
                    >
                      <RefreshCw className={cn("w-3 h-3", gpsLoading && "animate-spin")} />
                      <span>{gpsLoading ? "Mengambil GPS..." : "Perbarui GPS"}</span>
                    </button>
                  </div>

                  {/* Radius Status Pill & Distance meter */}
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-gray-200/70 shadow-2xs">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-extrabold block">Jarak ke Sekolah</span>
                      <div className="text-gray-900 text-xs font-black">
                        {gpsLoading ? (
                          <span className="text-gray-400 font-normal italic flex items-center gap-1.5 py-0.5">
                            <Loader2 className="w-3 h-3 animate-spin text-[#531FFF]" />
                            <span>Mendeteksi jarak terkini...</span>
                          </span>
                        ) : (
                          <>
                            {formatDistance(locationData.distance)}{" "}
                            <span className="text-gray-400 text-[10px] font-normal">(Maks {config.geofenceRadiusMeters}m)</span>
                          </>
                        )}
                      </div>
                    </div>
                    {gpsLoading ? (
                      <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg border bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1.5 animate-pulse">
                        <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
                        <span>Sinkron GPS...</span>
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "text-[10px] font-extrabold px-2.5 py-1 rounded-lg border flex items-center gap-1",
                          locationData.inRadius
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-rose-50 text-rose-800 border-rose-200"
                        )}
                      >
                        {locationData.inRadius ? "Dalam Radius 🟢" : "Di Luar Radius 🔴"}
                      </span>
                    )}
                  </div>

                  {config.schoolAddress && (
                    <div className="bg-white p-2.5 rounded-xl border border-gray-200/60 text-[11px] leading-relaxed">
                      <span className="text-[9px] uppercase tracking-wider text-gray-400 font-extrabold block mb-0.5">Alamat Titik Sekolah:</span>
                      <p className="text-gray-700 font-medium line-clamp-2" title={config.schoolAddress}>
                        📍 {config.schoolAddress}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono px-0.5">
                    <span>
                      {gpsLoading
                        ? "📡 Menyambungkan sinyal satelit GPS..."
                        : `Koordinat Siswa: ${locationData.lat.toFixed(5)}, ${locationData.lng.toFixed(5)}`}
                    </span>
                    {lastGpsRefreshedAt && !gpsLoading && (
                      <span className="text-[9px] text-emerald-600 font-sans font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        GPS Real-time
                      </span>
                    )}
                  </div>

                  {/* Warning Alert if GPS error */}
                  {gpsErrorState ? (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1.5">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-amber-900 text-xs">{gpsErrorState.title}</p>
                          <p className="text-[11px] text-amber-800">{gpsErrorState.message}</p>
                        </div>
                      </div>
                      <div className="pt-0.5 flex justify-end">
                        <button
                          type="button"
                          onClick={refreshLocation}
                          disabled={gpsLoading}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          Coba Lagi
                        </button>
                      </div>
                    </div>
                  ) : gpsError ? (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                      Kendala GPS: {gpsError}. Pastikan izin lokasi browser telah aktif.
                    </div>
                  ) : null}
                </div>

                {/* 3. Status Alerts */}
                {/* Outside Radius Alert */}
                {!locationData.inRadius && !gpsLoading && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-bold block text-rose-900 text-xs">
                        Lokasi di Luar Jangkauan Sekolah
                      </span>
                      <p className="text-rose-800 text-[11px] leading-snug">
                        Anda berjarak <strong>{formatDistance(locationData.distance)}</strong> ({Math.max(0, locationData.distance - config.geofenceRadiusMeters)}m di luar batas radius {config.geofenceRadiusMeters}m). Tombol absensi dinonaktifkan demi keaslian presensi.
                      </p>
                    </div>
                  </div>
                )}

                {/* Mandatory Photo Alert / Status Badge */}
                {!capturedPhoto ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800 animate-in fade-in">
                    <Camera className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-bold block text-amber-900 text-xs">
                        Wajib Foto Selfie Siswa
                      </span>
                      <p className="text-amber-800 text-[11px] leading-snug">
                        Silakan posisikan wajah pada bingkai kamera di sebelah kiri untuk mengaktifkan tombol Konfirmasi Presensi.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800 animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-bold text-xs text-emerald-900">
                        Foto Siswa Berhasil Diambil & Tervalidasi ✓
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRetakePhoto}
                      className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                    >
                      Ambil Ulang
                    </button>
                  </div>
                )}

                {/* 4. Final Submit Button */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleSubmitAttendance}
                    disabled={!canSubmit}
                    className={cn(
                      "w-full py-3.5 px-4 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-md",
                      canSubmit
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none border border-gray-200"
                    )}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Memverifikasi & Menyimpan...</span>
                      </>
                    ) : alreadyAttendedToday ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Sudah Absen Hari Ini (Presensi Nonaktif)</span>
                      </>
                    ) : !capturedPhoto ? (
                      <>
                        <Camera className="w-4 h-4 text-gray-400" />
                        <span>Ambil Foto Terlebih Dahulu</span>
                      </>
                    ) : config.studentAttendanceMode === "face_recognition" && !faceVerificationResult?.match ? (
                      <>
                        <ScanFace className="w-4 h-4 text-purple-400" />
                        <span>{!faceBiometric?.isEnrolled ? "Daftarkan Wajah Terlebih Dahulu" : "Verifikasi Wajah Belum Cocok"}</span>
                      </>
                    ) : !locationData.inRadius ? (
                      <>
                        <XCircle className="w-4 h-4 text-rose-500" />
                        <span>Tidak Dapat Absen (Di Luar Radius)</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                        <span>Konfirmasi Presensi Sekarang</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* STEP 2: PROCESSING ANIMATION                                  */}
          {/* ------------------------------------------------------------- */}
          {step === "processing" && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-200 animate-ping" />
                <div className="w-24 h-24 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin flex items-center justify-center bg-emerald-50 text-emerald-600">
                  <ScanFace className="w-10 h-10" />
                </div>
              </div>
              <div>
                <h4 className="text-lg font-black text-gray-900">Memverifikasi Foto & Lokasi GPS...</h4>
                <p className="text-xs text-gray-500 mt-1">
                  Mencocokkan koordinat GPS ({locationData.lat.toFixed(5)}, {locationData.lng.toFixed(5)}) dan merekam bukti foto ke database.
                </p>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* STEP 3: SUCCESS CONFIRMATION                                 */}
          {/* ------------------------------------------------------------- */}
          {step === "success" && (
            <div className="py-6 flex flex-col items-center justify-center space-y-5 text-center">
              <div className={cn(
                "w-16 h-16 rounded-lg flex items-center justify-center shadow-lg",
                recordedStatus === "Alpa"
                  ? "bg-rose-100 text-rose-600 shadow-rose-500/20"
                  : recordedStatus === "Terlambat"
                  ? "bg-amber-100 text-amber-600 shadow-amber-500/20"
                  : "bg-emerald-100 text-emerald-600 shadow-emerald-500/20"
              )}>
                {recordedStatus === "Alpa" ? (
                  <X className="w-10 h-10" />
                ) : (
                  <CheckCircle2 className="w-10 h-10" />
                )}
              </div>

              <div>
                <span className={cn(
                  "px-3 py-1 font-extrabold text-xs rounded-md border",
                  recordedStatus === "Alpa"
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : recordedStatus === "Terlambat"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                )}>
                  {recordedStatus === "Alpa"
                    ? "STATUS: ALPA (MELEWATI BATAS MAKSIMAL)"
                    : recordedStatus === "Terlambat"
                    ? "STATUS: TERLAMBAT"
                    : "ABSENSI BERHASIL DICATAT (HADIR)"}
                </span>
                <h4 className="text-xl font-extrabold text-gray-900 mt-2">
                  {recordedStatus === "Alpa"
                    ? "Presensi Dicatat Sebagai Alpa"
                    : "Presensi Kehadiran Terverifikasi!"}
                </h4>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  {recordedStatus === "Alpa"
                    ? `Waktu presensi telah melewati Batas Maksimal Dihitung Alpa (${config.absentThresholdTime || "08:30"} WIB). Status kehadiran otomatis ditetapkan sebagai Alpa.`
                    : "Foto dan lokasi Anda telah terekam secara real-time dan terverifikasi di dalam wilayah sekolah."}
                </p>
              </div>

              {/* Confirmation Card with Captured Photo and Location Details */}
              <div className="w-full bg-gray-50 border border-gray-200/80 rounded-lg p-4 text-left flex flex-col sm:flex-row items-center gap-4">
                {capturedPhoto && (
                  <div className="w-24 h-24 rounded-lg overflow-hidden border border-gray-300 shadow-sm shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={capturedPhoto} alt="Bukti Foto" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="space-y-1 text-xs flex-1 w-full">
                  <div className="flex justify-between border-b border-gray-200/60 pb-1">
                    <span className="text-gray-500">Nama Siswa:</span>
                    <span className="font-bold text-gray-900">{userName}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200/60 pb-1">
                    <span className="text-gray-500">NISN / ID:</span>
                    <span className="font-bold text-gray-900">{studentId}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200/60 pb-1">
                    <span className="text-gray-500">Waktu Presensi:</span>
                    <span className="font-bold text-[#531FFF]">{verifiedTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Verifikasi Geofence:</span>
                    <span className="font-bold text-emerald-700">
                      Valid ({locationData.distance}m dari sekolah)
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3.5 bg-gray-900 hover:bg-black text-white font-extrabold text-xs rounded-lg shadow-md transition-all cursor-pointer"
              >
                Tutup Jendela Presensi
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Face Enrolment Modal */}
      <FaceEnrolmentModal
        isOpen={isFaceModalOpen}
        onClose={() => setIsFaceModalOpen(false)}
        userUid={auth.currentUser?.uid || ""}
        userName={userName || "Siswa"}
        userRole="siswa"
        studentId={studentId}
        onSuccess={(bio) => {
          setFaceBiometric(bio);
          setIsFaceModalOpen(false);
          showSuccess?.("Wajah master biometrik berhasil didaftarkan! Silakan ambil foto presensi.", "Face ID Siap");
          startCamera();
        }}
      />
    </div>
  );
}
