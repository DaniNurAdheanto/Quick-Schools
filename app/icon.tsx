import { ImageResponse } from "next/og";
import { readStoredSchoolProfile } from "@/lib/school-profile-config";

export const runtime = "nodejs";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
  const profile = readStoredSchoolProfile();
  const logoUrl = profile.logoUrl;

  if (logoUrl && (logoUrl.startsWith("http://") || logoUrl.startsWith("https://"))) {
    try {
      return new ImageResponse(
        (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#531FFF",
              borderRadius: "22%",
              overflow: "hidden",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt="Logo"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>
        ),
        { ...size }
      );
    } catch (e) {
      // quiet fallback
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #6B38FF 0%, #4110D8 100%)",
          borderRadius: "22%",
          color: "white",
          fontSize: 20,
        }}
      >
        🎓
      </div>
    ),
    { ...size }
  );
}

