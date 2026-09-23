"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Clock, LogOut, RefreshCw, AlertTriangle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

// Constants
export const DEFAULT_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
export const WARNING_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes warning countdown
const THROTTLE_INTERVAL_MS = 3000; // Throttle activity updates to once every 3 seconds
const CHECK_INTERVAL_MS = 1000; // Check idle status every 1 second
export const LAST_ACTIVITY_KEY = "quick_schools_last_activity_timestamp";
export const SESSION_EXPIRED_PARAM = "session_expired=1";

interface IdleTimeoutManagerProps {
  customTimeoutMs?: number;
  customWarningMs?: number;
}

export function IdleTimeoutManager({
  customTimeoutMs,
  customWarningMs,
}: IdleTimeoutManagerProps) {
  const { user, isAuthLoading, isLoggingOut, logout } = useAuth();
  const toast = useToast();

  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(120);

  const lastActivityRef = useRef<number>(Date.now());
  const lastThrottleRef = useRef<number>(0);
  const isLoggingOutRef = useRef<boolean>(false);

  // Determine timeout duration: custom prop > localStorage debug override > default 30 mins
  const getTimeoutDuration = useCallback(() => {
    if (customTimeoutMs && customTimeoutMs > 0) return customTimeoutMs;
    if (typeof window !== "undefined") {
      const debugSec = localStorage.getItem("qs_debug_idle_timeout_sec");
      if (debugSec && !isNaN(Number(debugSec)) && Number(debugSec) > 0) {
        return Number(debugSec) * 1000;
      }
    }
    return DEFAULT_IDLE_TIMEOUT_MS;
  }, [customTimeoutMs]);

  const getWarningDuration = useCallback(() => {
    if (customWarningMs && customWarningMs > 0) return customWarningMs;
    const timeout = getTimeoutDuration();
    // If debug timeout is very short (e.g. <= 60s), adjust warning window accordingly
    if (timeout <= 60 * 1000) {
      return Math.min(timeout / 2, 20 * 1000);
    }
    return WARNING_THRESHOLD_MS;
  }, [customWarningMs, getTimeoutDuration]);

  // Record user activity (throttled)
  const recordActivity = useCallback((force: boolean = false) => {
    if (!user || isLoggingOutRef.current) return;

    const now = Date.now();
    if (force || now - lastThrottleRef.current >= THROTTLE_INTERVAL_MS) {
      lastThrottleRef.current = now;
      lastActivityRef.current = now;
      try {
        localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
      } catch (e) {}

      // If warning modal is open, user activity dismisses it and extends session
      setIsWarningOpen((prev) => {
        if (prev) {
          toast.showInfo("Aktivitas terdeteksi. Sesi Anda dilanjutkan.", "Sesi Diperpanjang");
          return false;
        }
        return false;
      });
    }
  }, [user, toast]);

  // Explicitly extend session via button
  const handleExtendSession = () => {
    recordActivity(true);
    setIsWarningOpen(false);
    toast.showSuccess("Sesi berhasil diperpanjang 30 menit ke depan.", "Sesi Aktif");
  };

  // Immediate logout from timeout
  const handleTimeoutLogout = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    setIsWarningOpen(false);

    try {
      localStorage.removeItem(LAST_ACTIVITY_KEY);
      localStorage.removeItem("quick_schools_auth_session");
      localStorage.removeItem("quick_schools_student_profile");
      localStorage.removeItem("onboarding_completed");
    } catch (e) {}

    // Redirect to login with session_expired query parameter
    await logout(`/login?${SESSION_EXPIRED_PARAM}`);
  }, [logout]);

  // Main activity listeners and interval check
  useEffect(() => {
    if (!user || isAuthLoading || isLoggingOut) {
      setIsWarningOpen(false);
      return;
    }

    // Initialize last activity timestamp
    const now = Date.now();
    lastActivityRef.current = now;
    try {
      const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
      if (stored && !isNaN(Number(stored))) {
        const storedTime = Number(stored);
        // If stored time is reasonable, sync with it
        if (now - storedTime < getTimeoutDuration()) {
          lastActivityRef.current = storedTime;
        } else {
          // Stored time is already past timeout (e.g. from closed laptop)
          handleTimeoutLogout();
          return;
        }
      } else {
        localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
      }
    } catch (e) {}

    // Event handler for user interaction
    const handleUserInteraction = () => {
      recordActivity(false);
    };

    // User activity events across the application
    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "click",
      "wheel",
    ];

    events.forEach((eventName) => {
      window.addEventListener(eventName, handleUserInteraction, { passive: true });
    });

    // Cross-tab synchronization via storage event
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LAST_ACTIVITY_KEY && e.newValue) {
        const remoteTime = Number(e.newValue);
        if (!isNaN(remoteTime)) {
          lastActivityRef.current = remoteTime;
          setIsWarningOpen(false);
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);

    // Visibility & focus check (handles device sleep / tab wake-up immediately)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const currentNow = Date.now();
        let effectiveLastActive = lastActivityRef.current;
        try {
          const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
          if (stored && !isNaN(Number(stored))) {
            effectiveLastActive = Math.max(effectiveLastActive, Number(stored));
          }
        } catch (e) {}

        const elapsed = currentNow - effectiveLastActive;
        const timeoutMs = getTimeoutDuration();

        if (elapsed >= timeoutMs) {
          handleTimeoutLogout();
        } else {
          // User woke tab, refresh activity
          recordActivity(true);
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    // Periodic evaluation timer
    const intervalId = setInterval(() => {
      if (isLoggingOutRef.current) return;

      const currentNow = Date.now();
      let effectiveLastActive = lastActivityRef.current;

      try {
        const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
        if (stored && !isNaN(Number(stored))) {
          const storedTime = Number(stored);
          if (storedTime > effectiveLastActive) {
            effectiveLastActive = storedTime;
            lastActivityRef.current = storedTime;
          }
        }
      } catch (e) {}

      const elapsed = currentNow - effectiveLastActive;
      const timeoutMs = getTimeoutDuration();
      const warningMs = getWarningDuration();

      if (elapsed >= timeoutMs) {
        handleTimeoutLogout();
      } else if (elapsed >= timeoutMs - warningMs) {
        const remainingSec = Math.max(0, Math.ceil((timeoutMs - elapsed) / 1000));
        setSecondsRemaining(remainingSec);
        setIsWarningOpen(true);
      } else {
        setIsWarningOpen(false);
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      events.forEach((eventName) => {
        window.removeEventListener(eventName, handleUserInteraction);
      });
      window.removeEventListener("storage", handleStorageChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [user, isAuthLoading, isLoggingOut, getTimeoutDuration, getWarningDuration, recordActivity, handleTimeoutLogout]);

  // Format seconds as MM:SS
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // If warning is not active or user is not logged in, render nothing
  if (!user || !isWarningOpen || isLoggingOut) {
    return null;
  }

  const warningTotalSec = Math.ceil(getWarningDuration() / 1000);
  const progressPercent = Math.min(100, Math.max(0, (secondsRemaining / warningTotalSec) * 100));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-timeout-title"
      className="fixed inset-0 z-[9990] flex items-center justify-center p-4 sm:p-6 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200 relative">
        {/* Top Progress bar indicator */}
        <div className="h-1.5 w-full bg-amber-100">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="p-6 sm:p-8 text-center space-y-5">
          {/* Animated Warning Icon */}
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-2xl bg-amber-500/20 animate-ping opacity-60" />
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-inner relative">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Inaktivitas Terdeteksi</span>
            </div>
            <h3 id="session-timeout-title" className="text-xl font-extrabold text-gray-900 tracking-tight">
              Sesi Anda Akan Segera Berakhir
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">
              Tidak ada aktivitas selama beberapa waktu. Demi keamanan data sekolah, akun Anda akan otomatis keluar dalam:
            </p>
          </div>

          {/* Countdown Clock Box */}
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl py-3 px-6 inline-flex items-center justify-center gap-2 shadow-inner">
            <Clock className="w-5 h-5 text-amber-600 animate-spin" style={{ animationDuration: "6s" }} />
            <span className="font-mono text-2xl font-black text-amber-900 tracking-widest">
              {formatTime(secondsRemaining)}
            </span>
          </div>

          <p className="text-[11px] text-gray-400">
            Klik tombol di bawah atau gerakkan mouse untuk melanjutkan sesi Anda.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={handleExtendSession}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#531FFF] hover:bg-[#4314cc] text-white text-xs sm:text-sm font-bold shadow-lg shadow-[#531FFF]/20 transition-all active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Lanjutkan Sesi Saya</span>
            </button>
            <button
              type="button"
              onClick={() => logout("/login")}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-100 hover:bg-rose-50 hover:text-rose-600 text-gray-600 text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar Sekarang</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
