import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/context/ToastContext";
import { SchoolProfileProvider } from "@/context/SchoolProfileContext";
import { DynamicFavicon } from "@/components/common/dynamic-favicon";
import { readStoredSchoolProfile } from "@/lib/school-profile-config";

const initialProfile = readStoredSchoolProfile();

export const metadata: Metadata = {
  title: {
    template: `%s | ${initialProfile.schoolName || "Smart School OS"}`,
    default: `${initialProfile.schoolName || "Smart School OS"} - Portal Terpadu`,
  },
  description: initialProfile.description || "Operating System Sekolah Pintar Terpadu",
  icons: {
    icon: [
      { url: "/api/school-profile/logo", sizes: "any" },
      { url: "/icon", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/api/school-profile/logo",
    apple: "/api/school-profile/logo",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="font-sans">
      <head>
        <link rel="icon" href="/api/school-profile/logo" sizes="any" />
        <link rel="shortcut icon" href="/api/school-profile/logo" />
        <link rel="apple-touch-icon" href="/api/school-profile/logo" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ToastProvider>
          <SchoolProfileProvider>
            <DynamicFavicon />
            {children}
          </SchoolProfileProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
