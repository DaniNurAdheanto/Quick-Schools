"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface ProfileAvatarProps {
  name?: string;
  imageUrl?: string | null;
  photoUrl?: string | null;
  avatar?: string | null;
  photoURL?: string | null;
  gender?: "Laki-laki" | "Perempuan" | string | null;
  role?: "student" | "teacher" | "guru" | "siswa" | "admin" | "user" | string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | number;
  shape?: "circle" | "rounded" | "rounded-xl";
  className?: string;
  ring?: boolean | string;
  border?: boolean;
  showBadge?: boolean;
  badgeStatus?: "online" | "hadir" | "terlambat" | "absen" | "aktif";
  alt?: string;
  unoptimized?: boolean;
}

// 8 Harmonious modern color palettes (Tailwind gradients) for fallback initials
const GRADIENT_PALETTES = [
  "from-[#531FFF] to-[#7B42FF] text-white", // Quick Schools Signature Purple
  "from-blue-600 to-indigo-600 text-white", // Deep Royal Blue
  "from-emerald-500 to-teal-600 text-white", // Fresh Emerald
  "from-violet-600 to-purple-600 text-white", // Vibrant Violet
  "from-amber-500 to-orange-500 text-white", // Warm Amber
  "from-rose-500 to-pink-600 text-white", // Modern Rose
  "from-indigo-600 to-sky-600 text-white", // Sky Indigo
  "from-cyan-600 to-blue-600 text-white", // Ocean Blue
];

/**
 * Deterministic hash from name or id to pick consistent avatar color palette
 */
function getDeterministicPalette(name: string = ""): string {
  if (!name) return GRADIENT_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GRADIENT_PALETTES.length;
  return GRADIENT_PALETTES[index];
}

/**
 * Extract up to 2 uppercase initials from a name (e.g. "Ahmad Fauzi" -> "AF", "Dewi" -> "D")
 */
export function getInitials(name: string = "", fallback: string = "U"): string {
  if (!name || typeof name !== "string") return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) {
    return parts[0].substring(0, Math.min(2, parts[0].length)).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * Clean and validate photo URL
 */
export function getCleanPhotoUrl(
  objOrUrl?: any,
  photoUrl?: string | null,
  avatar?: string | null,
  photoURL?: string | null
): string {
  if (!objOrUrl) {
    const direct = photoUrl || avatar || photoURL || "";
    return isValidPhotoUrl(direct) ? direct : "";
  }
  if (typeof objOrUrl === "string") {
    return isValidPhotoUrl(objOrUrl) ? objOrUrl : "";
  }
  const raw =
    objOrUrl.imageUrl ||
    objOrUrl.photoUrl ||
    objOrUrl.avatar ||
    objOrUrl.photoURL ||
    objOrUrl.image ||
    photoUrl ||
    avatar ||
    photoURL ||
    "";
  return isValidPhotoUrl(raw) ? raw : "";
}

function isValidPhotoUrl(url: any): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === "-" || trimmed === "null" || trimmed === "undefined") return false;
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:image/") ||
    trimmed.startsWith("/")
  );
}

const SIZE_CONFIGS = {
  xs: { box: "w-6 h-6", font: "text-[9px] font-black", px: 24 },
  sm: { box: "w-8 h-8", font: "text-xs font-black", px: 32 },
  md: { box: "w-10 h-10", font: "text-sm font-black", px: 40 },
  lg: { box: "w-12 h-12", font: "text-base font-black", px: 48 },
  xl: { box: "w-16 h-16", font: "text-xl font-black", px: 64 },
  "2xl": { box: "w-20 h-20 sm:w-22 sm:h-22", font: "text-2xl font-black", px: 88 }
};

export function ProfileAvatar({
  name = "",
  imageUrl,
  photoUrl,
  avatar,
  photoURL,
  gender: _gender,
  role,
  size = "md",
  shape = "circle",
  className,
  ring = false,
  border = true,
  showBadge = false,
  badgeStatus = "online",
  alt,
  unoptimized = true
}: ProfileAvatarProps) {
  const [hasError, setHasError] = useState(false);

  // Extract source photo
  const photoSrc = getCleanPhotoUrl(imageUrl, photoUrl, avatar, photoURL);

  // Reset error when photo src changes
  useEffect(() => {
    setHasError(false);
  }, [photoSrc]);

  // Size styling
  const sizeStyle = typeof size === "number" 
    ? { width: `${size}px`, height: `${size}px`, fontSize: `${Math.max(10, Math.floor(size * 0.38))}px` }
    : undefined;

  const sizeClass = typeof size === "string" ? SIZE_CONFIGS[size]?.box || SIZE_CONFIGS.md.box : "";
  const fontClass = typeof size === "string" ? SIZE_CONFIGS[size]?.font || SIZE_CONFIGS.md.font : "font-black";

  // Shape styling
  const shapeClass = shape === "circle" 
    ? "rounded-full" 
    : shape === "rounded-xl" 
      ? "rounded-xl" 
      : "rounded-lg";

  // Ring styling
  const ringClass = ring === true 
    ? "ring-2 ring-white shadow-xs" 
    : typeof ring === "string" 
      ? ring 
      : "";

  // Fallback initial
  const defaultFallbackChar = (role === "teacher" || role === "guru") ? "G" : (role === "student" || role === "siswa") ? "S" : "U";
  const initials = getInitials(name, defaultFallbackChar);
  const paletteGradient = getDeterministicPalette(name || initials);

  const canShowImage = Boolean(photoSrc && !hasError);

  return (
    <div
      className={cn(
        "relative shrink-0 select-none overflow-hidden flex items-center justify-center transition-transform",
        sizeClass,
        shapeClass,
        ringClass,
        border && "border border-gray-100/80 shadow-2xs",
        className
      )}
      style={sizeStyle}
      title={name || undefined}
    >
      {canShowImage ? (
        <Image
          src={photoSrc}
          alt={alt || name || "Profile"}
          fill
          sizes="(max-width: 768px) 80px, 120px"
          className={cn("object-cover", shapeClass)}
          onError={() => setHasError(true)}
          unoptimized={unoptimized}
        />
      ) : (
        <div
          className={cn(
            "w-full h-full bg-gradient-to-tr flex items-center justify-center tracking-tight shadow-inner",
            paletteGradient,
            fontClass,
            shapeClass
          )}
        >
          <span>{initials}</span>
        </div>
      )}

      {/* Optional Status Badge */}
      {showBadge && (
        <span
          className={cn(
            "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white",
            badgeStatus === "online" || badgeStatus === "hadir" || badgeStatus === "aktif"
              ? "bg-emerald-500"
              : badgeStatus === "terlambat"
                ? "bg-amber-500"
                : "bg-rose-500"
          )}
        />
      )}
    </div>
  );
}
