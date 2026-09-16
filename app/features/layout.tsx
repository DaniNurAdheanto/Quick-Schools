"use client";

import { useState, useEffect } from "react";
import LandingNavbar from "@/components/landing/navbar";
import LandingFooter from "@/components/landing/footer";

export default function FeaturesLayout({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<"id" | "en">("id");

  useEffect(() => {
    const saved = localStorage.getItem("qs_lang") as "id" | "en";
    if (saved === "id" || saved === "en") setLang(saved);
  }, []);

  const changeLang = (l: "id" | "en") => {
    setLang(l);
    localStorage.setItem("qs_lang", l);
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 overflow-x-hidden selection:bg-blue-100">
      <LandingNavbar lang={lang} onChangeLang={changeLang} />
      <div data-lang={lang}>
        {children}
      </div>
      <LandingFooter lang={lang} />
    </div>
  );
}
