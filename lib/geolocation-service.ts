"use client";

export interface GeolocationResult {
  lat: number;
  lng: number;
  accuracy: number;
  distanceMeters: number;
  inRadius: boolean;
  timestamp: number;
}

export interface GeolocationErrorState {
  code: number | "UNSUPPORTED" | "UNKNOWN";
  title: string;
  message: string;
  instruction: string;
  isPermissionDenied: boolean;
  canRetry: boolean;
}

/**
 * Calculates distance in meters between two coordinates using Haversine formula.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Format meters distance into human readable Indonesian string.
 */
export function formatDistanceIndonesian(distanceMeters: number): string {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} meter`;
  }
  return `${(distanceMeters / 1000).toFixed(2)} km`;
}

/**
 * Format GeolocationPositionError into clear Indonesian error state.
 */
export function formatGeolocationError(err: any): GeolocationErrorState {
  const code = err?.code ?? "UNKNOWN";
  if (code === 1) {
    return {
      code: 1,
      title: "Izin Lokasi Belum Diaktifkan",
      message: "Akses lokasi/GPS ditolak oleh peramban atau pengaturan perangkat.",
      instruction: "Klik ikon gembok/pengaturan di bilah alamat browser Anda, ubah izin Lokasi menjadi 'Izinkan' (Allow), lalu klik Coba Lagi.",
      isPermissionDenied: true,
      canRetry: true,
    };
  }
  if (code === 2) {
    return {
      code: 2,
      title: "Sinyal GPS Tidak Terdeteksi",
      message: "Perangkat tidak dapat memperoleh sinyal atau data koordinat saat ini.",
      instruction: "Pastikan fitur Layanan Lokasi (GPS / Location Services) pada perangkat Anda telah diaktifkan.",
      isPermissionDenied: false,
      canRetry: true,
    };
  }
  if (code === 3) {
    return {
      code: 3,
      title: "Waktu Permintaan GPS Habis",
      message: "Waktu pencarian koordinat GPS presisi habis (timeout).",
      instruction: "Silakan klik tombol 'Coba Lagi' atau pastikan perangkat Anda berada di area dengan koneksi internet yang stabil.",
      isPermissionDenied: false,
      canRetry: true,
    };
  }
  return {
    code: "UNKNOWN",
    title: "Gagal Mengambil Lokasi GPS",
    message:
      typeof err?.message === "string" && err.message.length > 0
        ? `Tidak dapat mengambil koordinat lokasi perangkat: ${err.message}`
        : "Terjadi kendala saat membaca koordinat GPS perangkat.",
    instruction: "Pastikan izin lokasi aktif dan silakan coba lagi.",
    isPermissionDenied: false,
    canRetry: true,
  };
}

/**
 * Robust two-tier geolocation acquisition:
 * 1. High accuracy GPS attempt with reasonable timeout (7s)
 * 2. Automatic fallback to network/cell/WiFi triangulation (10s) if satellite GPS times out
 */
export async function acquireCurrentLocation(
  schoolLat: number = -6.200000,
  schoolLng: number = 106.816666,
  radiusMeters: number = 100
): Promise<GeolocationResult> {
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    throw {
      code: "UNSUPPORTED",
      title: "GPS Tidak Didukung",
      message: "Perangkat atau peramban Anda tidak mendukung teknologi Geolocation GPS.",
      instruction: "Gunakan browser modern seperti Google Chrome, Safari, atau Firefox yang mendukung GPS.",
      isPermissionDenied: false,
      canRetry: false,
    } as GeolocationErrorState;
  }

  // Helper promise for getCurrentPosition
  const getPos = (options: PositionOptions): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  };

  let position: GeolocationPosition | null = null;
  let firstError: any = null;

  // Tier 1: Try High-Accuracy GPS first
  try {
    position = await getPos({
      enableHighAccuracy: true,
      timeout: 7000,
      maximumAge: 10000,
    });
  } catch (err: any) {
    firstError = err;
    // If user explicitly denied permission, do not retry tier 2 (it will just fail immediately)
    if (err?.code === 1) {
      throw formatGeolocationError(err);
    }
  }

  // Tier 2: Fallback to standard/cached accuracy if high-accuracy timed out or unavailable
  if (!position) {
    try {
      position = await getPos({
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000,
      });
    } catch (err: any) {
      // Both attempts failed, format final error
      throw formatGeolocationError(err || firstError);
    }
  }

  const lat = Number(position.coords.latitude.toFixed(6));
  const lng = Number(position.coords.longitude.toFixed(6));
  const accuracy = Math.round(position.coords.accuracy || 10);
  const distance = calculateDistanceMeters(lat, lng, schoolLat, schoolLng);
  const inRadius = distance <= radiusMeters;

  return {
    lat,
    lng,
    accuracy,
    distanceMeters: distance,
    inRadius,
    timestamp: position.timestamp || Date.now(),
  };
}
