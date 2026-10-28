import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { readStoredSchoolProfile } from "@/lib/school-profile-config";

// Default SVG emblem representing Smart School OS
const DEFAULT_SVG_LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6B38FF"/>
      <stop offset="100%" stop-color="#4110D8"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#531FFF" flood-opacity="0.3"/>
    </filter>
  </defs>
  <rect width="128" height="128" rx="28" fill="url(#grad)" filter="url(#shadow)"/>
  <!-- School Crest / Graduation Cap Emblem -->
  <path d="M64 30L22 50L64 70L106 50L64 30Z" fill="#FFFFFF"/>
  <path d="M38 58V78C38 78 50 88 64 88C78 88 90 78 90 78V58L64 70L38 58Z" fill="#FFFFFF" fill-opacity="0.95"/>
  <path d="M106 50V78C106 78 102 82 98 84V54L106 50Z" fill="#F3EEFF"/>
  <circle cx="98" cy="85" r="4" fill="#FFD700"/>
  <!-- Accent Stars / Dots -->
  <circle cx="64" cy="104" r="3.5" fill="#FFFFFF" fill-opacity="0.8"/>
  <circle cx="50" cy="103" r="2.5" fill="#FFFFFF" fill-opacity="0.5"/>
  <circle cx="78" cy="103" r="2.5" fill="#FFFFFF" fill-opacity="0.5"/>
</svg>`;

export async function GET() {
  try {
    const profile = readStoredSchoolProfile();
    const logoUrl = profile.logoUrl;

    if (logoUrl) {
      // 1. If Base64 data URL
      const base64Match = logoUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.*)$/);
      if (base64Match) {
        const mimeType = base64Match[1];
        const buffer = Buffer.from(base64Match[2], "base64");
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": mimeType,
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
          },
        });
      }

      // 2. If local public file path
      if (logoUrl.startsWith("/")) {
        const localPath = path.join(process.cwd(), "public", logoUrl.replace(/^\//, ""));
        if (fs.existsSync(localPath)) {
          const buffer = fs.readFileSync(localPath);
          const ext = path.extname(localPath).toLowerCase();
          const mimeType =
            ext === ".svg" ? "image/svg+xml" :
            ext === ".png" ? "image/png" :
            ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
            ext === ".webp" ? "image/webp" : "image/png";
          return new NextResponse(buffer, {
            headers: {
              "Content-Type": mimeType,
              "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
            },
          });
        }
      }

      // 3. If HTTP/HTTPS URL
      if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);
          const res = await fetch(logoUrl, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (res.ok) {
            const arrayBuf = await res.arrayBuffer();
            const contentType = res.headers.get("content-type") || "image/png";
            return new NextResponse(Buffer.from(arrayBuf), {
              headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
              },
            });
          }
        } catch (fetchErr) {
          // If fetch fails, redirect directly to logo URL so the browser can load it
          return NextResponse.redirect(logoUrl, 307);
        }
      }
    }

    // Default fallback: return high quality SVG school logo
    return new NextResponse(DEFAULT_SVG_LOGO, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    return new NextResponse(DEFAULT_SVG_LOGO, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }
}

