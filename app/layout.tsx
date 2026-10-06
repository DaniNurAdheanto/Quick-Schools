import type {Metadata} from 'next';
import './globals.css';
import { ToastProvider } from "@/context/ToastContext";
import { SchoolProfileProvider } from "@/context/SchoolProfileContext";

export const metadata: Metadata = {
  title: 'Smart School OS',
  description: 'Operating System Sekolah Pintar',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className="font-sans">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ToastProvider>
          <SchoolProfileProvider>
            {children}
          </SchoolProfileProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
