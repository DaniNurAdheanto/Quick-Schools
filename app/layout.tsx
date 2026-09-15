import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { cn } from "@/lib/utils";
import { ToastProvider } from "@/context/ToastContext";
import { SchoolProfileProvider } from "@/context/SchoolProfileContext";

const geist = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'Smart School OS',
  description: 'Operating System Sekolah Pintar',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
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
