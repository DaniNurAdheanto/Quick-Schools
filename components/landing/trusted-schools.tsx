"use client";

import { useState, useRef } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TrustedSchoolsProps {
  lang: "id" | "en";
}

export default function TrustedSchools({ lang }: TrustedSchoolsProps) {
  const title =
    lang === "id"
      ? "Dipercaya Lebih dari 500+ Sekolah & Yayasan Pendidikan di Seluruh Indonesia"
      : "Trusted by 500+ Premier Schools & Educational Foundations Across Indonesia";

  const schools = [
    {
      name: "YPI Al-Azhar",
      logo: (
        <svg viewBox="0 0 120 120" className="w-16 h-16 sm:w-18 sm:h-18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            {/* Curved Path for YPI Al-Azhar Text */}
            <path id="azhar-arc" d="M 18,60 A 42,42 0 1,1 102,60" fill="none" />
            <linearGradient id="azhar-blue" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0B4F9C" />
              <stop offset="100%" stopColor="#063268" />
            </linearGradient>
            <linearGradient id="azhar-dome" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
          </defs>

          {/* Outer Black Border */}
          <circle cx="60" cy="60" r="57" fill="#0B4F9C" stroke="#0F172A" strokeWidth="2" />
          
          {/* Inner Golden Ring */}
          <circle cx="60" cy="60" r="55" fill="url(#azhar-blue)" stroke="#F59E0B" strokeWidth="2" />

          {/* Curved Text: YAYASAN PESANTREN ISLAM AL AZHAR */}
          <text fill="#FFFFFF" fontSize="6.4" fontWeight="800" letterSpacing="0.8">
            <textPath href="#azhar-arc" startOffset="50%" textAnchor="middle">
              YPI AL-AZHAR INDONESIA
            </textPath>
          </text>

          {/* Bottom Stars */}
          <g fill="#FBBF24">
            <polygon points="40,105 41.5,108 45,108.5 42.5,111 43,114.5 40,112.5 37,114.5 37.5,111 35,108.5 38.5,108" />
            <polygon points="60,107 61.5,110 65,110.5 62.5,113 63,116.5 60,114.5 57,116.5 57.5,113 55,110.5 58.5,110" />
            <polygon points="80,105 81.5,108 85,108.5 82.5,111 83,114.5 80,112.5 77,114.5 77.5,111 75,108.5 78.5,108" />
          </g>

          {/* Center White Disc with Inner Gold Trim */}
          <circle cx="60" cy="60" r="38" fill="#FFFFFF" stroke="#E5A823" strokeWidth="1.5" />

          {/* Mosque Colonnade Base */}
          <rect x="36" y="70" width="48" height="13" rx="1" fill="#047857" />
          {/* Mosque Arched Entrances */}
          <path d="M 42,83 L 42,75 Q 45,71 48,75 L 48,83 Z" fill="#FFFFFF" />
          <path d="M 52,83 L 52,73 Q 56,69 60,73 L 60,83 Z" fill="#FFFFFF" />
          <path d="M 64,83 L 64,73 Q 68,69 72,73 L 72,83 Z" fill="#FFFFFF" />
          <path d="M 76,83 L 76,75 Q 79,71 82,75 L 82,83 Z" fill="#FFFFFF" />

          {/* Grand Central Dome */}
          <path
            d="M 48,70 C 48,53 54,43 60,40 C 66,43 72,53 72,70 Z"
            fill="url(#azhar-dome)"
            stroke="#065F46"
            strokeWidth="0.8"
          />
          {/* Crescent Finial on Dome */}
          <path
            d="M 60,33 C 61.8,33 63,34.2 63,36 C 63,37.8 61.8,39 60,39 C 61,38 61.2,36.5 60.5,35.2 C 59.8,34 58.5,33.5 60,33 Z"
            fill="#F59E0B"
          />
          <line x1="60" y1="36" x2="60" y2="40" stroke="#F59E0B" strokeWidth="1.2" />

          {/* Left Towering Minaret */}
          <rect x="33" y="38" width="5.5" height="34" fill="#065F46" />
          {/* Minaret Balconies */}
          <rect x="31" y="52" width="9.5" height="2" rx="0.5" fill="#F59E0B" />
          <rect x="31.5" y="42" width="8.5" height="2" rx="0.5" fill="#F59E0B" />
          {/* Minaret Cone Spire */}
          <polygon points="35.75,28 32.5,38 39,38" fill="#047857" stroke="#F59E0B" strokeWidth="0.6" />
          <circle cx="35.75" cy="27" r="1.2" fill="#F59E0B" />

          {/* Open Quran on Rehal Base */}
          <path
            d="M 60,80 C 56,77 50,78 47,81 L 47,84 C 50,81 56,80 60,82 Z"
            fill="#FEF3C7"
            stroke="#D97706"
            strokeWidth="0.5"
          />
          <path
            d="M 60,80 C 64,77 70,78 73,81 L 73,84 C 70,81 64,80 60,82 Z"
            fill="#FEF3C7"
            stroke="#D97706"
            strokeWidth="0.5"
          />
          <line x1="53" y1="83" x2="67" y2="89" stroke="#92400E" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="67" y1="83" x2="53" y2="89" stroke="#92400E" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      name: "BINUS SCHOOL",
      logo: (
        <svg viewBox="0 0 170 68" className="w-28 sm:w-32 h-12 sm:h-14" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* BINUS Iconic Innovation Eye Symbol (Left) */}
          <g transform="translate(6, 6)">
            {/* Top Orange Curved Swoosh */}
            <path
              d="M 4,28 C 8,16 22,8 36,12 C 43,14 48,18 52,24 C 44,18 32,16 22,20 C 14,23 9,27 4,28 Z"
              fill="#F37021"
            />
            {/* Bottom Red Dynamic Swoosh */}
            <path
              d="M 52,28 C 48,40 34,48 20,44 C 13,42 8,38 4,32 C 12,38 24,40 34,36 C 42,33 47,29 52,28 Z"
              fill="#E31B23"
            />
            {/* 4 Directional Tech Rays */}
            <line x1="8" y1="12" x2="16" y2="18" stroke="#F37021" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="48" y1="12" x2="40" y2="18" stroke="#F37021" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="8" y1="44" x2="16" y2="38" stroke="#E31B23" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="48" y1="44" x2="40" y2="38" stroke="#E31B23" strokeWidth="2.2" strokeLinecap="round" />
            
            {/* Central Iris / Pupil */}
            <circle cx="28" cy="28" r="7.5" fill="#1E293B" />
            <circle cx="30" cy="26" r="2.5" fill="#FFFFFF" />
          </g>

          {/* BINUS SCHOOL Typography Lockup */}
          {/* "BINUS" in Bold Heavy Geometric Black */}
          <text x="68" y="34" fill="#1E293B" fontSize="22" fontWeight="900" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="0.5">
            BINUS
          </text>
          {/* Accent Diamond on top of letter I */}
          <polygon points="106.5,13 109.5,16 106.5,19 103.5,16" fill="#F37021" />

          {/* "SCHOOL" in Vibrant Orange */}
          <text x="69" y="52" fill="#F37021" fontSize="12" fontWeight="800" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="4.2">
            SCHOOL
          </text>
        </svg>
      ),
    },
    {
      name: "Labschool Jakarta",
      logo: (
        <svg viewBox="0 0 120 120" className="w-16 h-16 sm:w-18 sm:h-18" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Labschool Pentagon Shield Outer */}
          <polygon
            points="60,8 106,32 94,98 60,114 26,98 14,32"
            fill="#065F46"
            stroke="#D97706"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          {/* Inner Golden Stroke */}
          <polygon
            points="60,14 100,35 89,93 60,107 31,93 20,35"
            fill="#044E3B"
            stroke="#FDE68A"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Top 5-Point Star */}
          <polygon
            points="60,20 62.8,26.5 69.5,27 64.5,31.5 66,38 60,34.5 54,38 55.5,31.5 50.5,27 57.2,26.5"
            fill="#FBBF24"
          />

          {/* Radiating Mandala Sunburst (UNJ Tradition) */}
          <circle cx="60" cy="54" r="16" fill="none" stroke="#D97706" strokeWidth="1" strokeDasharray="2 3" />
          <circle cx="60" cy="54" r="12" fill="#065F46" stroke="#FBBF24" strokeWidth="1.2" />

          {/* Educational Torch Handle & Cup */}
          <rect x="57.5" y="53" width="5" height="23" rx="1.5" fill="#D97706" stroke="#FDE68A" strokeWidth="0.8" />
          <polygon points="54,53 66,53 63,48 57,48" fill="#FBBF24" />

          {/* Flaming Flame Tongues (Red & Gold) */}
          <path
            d="M 60,37 C 53,42 52,48 60,51 C 68,48 67,42 60,37 Z"
            fill="#EF4444"
          />
          <path
            d="M 60,40 C 56,43 56,47 60,49 C 64,47 64,43 60,40 Z"
            fill="#FDE047"
          />

          {/* Open Book Wings */}
          <path
            d="M 60,76 C 52,72 41,74 36,78 L 36,83 C 41,79 52,78 60,82 Z"
            fill="#FFFFFF"
            stroke="#CBD5E1"
            strokeWidth="0.8"
          />
          <path
            d="M 60,76 C 68,72 79,74 84,78 L 84,83 C 79,79 68,78 60,82 Z"
            fill="#FFFFFF"
            stroke="#CBD5E1"
            strokeWidth="0.8"
          />
          <line x1="60" y1="76" x2="60" y2="83" stroke="#D97706" strokeWidth="1.5" />

          {/* Golden Ribbon with "LABSCHOOL" */}
          <path
            d="M 28,91 L 60,88 L 92,91 L 88,100 L 60,97 L 32,100 Z"
            fill="#FBBF24"
            stroke="#D97706"
            strokeWidth="1"
          />
          <text x="60" y="96.5" fill="#044E3B" fontSize="6.8" fontWeight="900" textAnchor="middle" letterSpacing="0.8">
            LABSCHOOL
          </text>
        </svg>
      ),
    },
    {
      name: "BPK Penabur",
      logo: (
        <svg viewBox="0 0 120 120" className="w-16 h-16 sm:w-18 sm:h-18" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Iconic Inverted Triangle Shield */}
          <path
            d="M 60,12 C 65,12 104,74 101,83 C 98,92 22,92 19,83 C 16,74 55,12 60,12 Z"
            fill="#0B2F7E"
            stroke="#F59E0B"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          {/* Inner Navy Field */}
          <path
            d="M 60,18 C 63,18 96,73 94,80 C 92,86 28,86 26,80 C 24,73 57,18 60,18 Z"
            fill="#08225C"
            stroke="#FDE68A"
            strokeWidth="1.2"
          />

          {/* Radiating Light Rays behind Cross */}
          <g stroke="#FDE047" strokeWidth="1.5" strokeLinecap="round" opacity="0.9">
            <line x1="60" y1="36" x2="48" y2="28" />
            <line x1="60" y1="36" x2="72" y2="28" />
            <line x1="60" y1="46" x2="42" y2="44" />
            <line x1="60" y1="46" x2="78" y2="44" />
            <line x1="60" y1="56" x2="46" y2="60" />
            <line x1="60" y1="56" x2="74" y2="60" />
          </g>

          {/* Pure White Latin Cross */}
          <rect x="57" y="27" width="6" height="42" rx="1.2" fill="#FFFFFF" />
          <rect x="44" y="37" width="32" height="6" rx="1.2" fill="#FFFFFF" />

          {/* Holy Flame atop the Cross */}
          <path
            d="M 60,19 C 56,23 55,27 60,29 C 65,27 64,23 60,19 Z"
            fill="#EF4444"
          />
          <path
            d="M 60,21 C 58,24 58,26 60,28 C 62,26 62,24 60,21 Z"
            fill="#FBBF24"
          />

          {/* Open Bible at the Cross Base */}
          <path
            d="M 60,65 C 52,61 43,63 38,67 L 38,73 C 43,69 52,68 60,71 Z"
            fill="#FEF08A"
            stroke="#D97706"
            strokeWidth="0.8"
          />
          <path
            d="M 60,65 C 68,61 77,63 82,67 L 82,73 C 77,69 68,68 60,71 Z"
            fill="#FEF08A"
            stroke="#D97706"
            strokeWidth="0.8"
          />

          {/* Ribbon with "BPK PENABUR" */}
          <path
            d="M 27,77 Q 60,72 93,77 L 91,85 Q 60,81 29,85 Z"
            fill="#F59E0B"
            stroke="#B45309"
            strokeWidth="0.8"
          />
          <text x="60" y="82.5" fill="#08225C" fontSize="5.5" fontWeight="900" textAnchor="middle" letterSpacing="0.8">
            BPK PENABUR
          </text>
        </svg>
      ),
    },
    {
      name: "Yayasan Tarakanita",
      logo: (
        <svg viewBox="0 0 120 120" className="w-16 h-16 sm:w-18 sm:h-18" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Tarakanita Heraldic Shield */}
          <path
            d="M 60,10 C 90,10 100,24 100,52 C 100,80 80,98 60,110 C 40,98 20,80 20,52 C 20,24 30,10 60,10 Z"
            fill="#0D3B82"
            stroke="#F59E0B"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          {/* Inner Light Navy Field */}
          <path
            d="M 60,16 C 85,16 93,28 93,52 C 93,76 76,92 60,102 C 44,92 27,76 27,52 C 27,28 35,16 60,16 Z"
            fill="#09295C"
            stroke="#FDE68A"
            strokeWidth="1.2"
          />

          {/* Pure White Latin Cross */}
          <rect x="56.5" y="30" width="7" height="46" rx="1.5" fill="#FFFFFF" />
          <rect x="42" y="42" width="36" height="7" rx="1.5" fill="#FFFFFF" />

          {/* 8-Point Star of Bethlehem (Upper Right Canton) */}
          <g transform="translate(76, 28)">
            <polygon points="0,-10 3,-3 10,0 3,3 0,10 -3,3 -10,0 -3,-3" fill="#FBBF24" />
            <polygon points="0,-7 2,-2 7,0 2,2 0,7 -2,2 -7,0 -2,-2" fill="#FEF08A" transform="rotate(45)" />
          </g>

          {/* White Madonna Lily Petals on Left & Right Base */}
          <path
            d="M 53,74 C 47,70 44,62 50,56 C 54,64 55,69 53,74 Z"
            fill="#E0E7FF"
            stroke="#818CF8"
            strokeWidth="0.8"
          />
          <path
            d="M 67,74 C 73,70 76,62 70,56 C 66,64 65,69 67,74 Z"
            fill="#E0E7FF"
            stroke="#818CF8"
            strokeWidth="0.8"
          />

          {/* Golden Ribbon with "TARAKANITA" */}
          <path
            d="M 30,86 L 60,82 L 90,86 L 86,94 L 60,90 L 34,94 Z"
            fill="#F59E0B"
            stroke="#B45309"
            strokeWidth="0.8"
          />
          <text x="60" y="90" fill="#09295C" fontSize="5.8" fontWeight="900" textAnchor="middle" letterSpacing="0.8">
            TARAKANITA
          </text>
        </svg>
      ),
    },
    {
      name: "Sekolah Pelita Harapan",
      logo: (
        <svg viewBox="0 0 120 120" className="w-16 h-16 sm:w-18 sm:h-18" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* SPH Prestigious Crest */}
          <path
            d="M 60,10 L 98,22 C 98,62 82,94 60,110 C 38,94 22,62 22,22 Z"
            fill="#0B1B3D"
            stroke="#D4AF37"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          {/* Inner Crest Field */}
          <path
            d="M 60,16 L 92,26 C 92,60 78,88 60,102 C 42,88 28,60 28,26 Z"
            fill="#071329"
            stroke="#FDE68A"
            strokeWidth="1.2"
          />

          {/* 7 Golden Radiating Beacon Rays */}
          <g stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round">
            <line x1="60" y1="24" x2="60" y2="18" />
            <line x1="49" y1="28" x2="43" y2="23" />
            <line x1="71" y1="28" x2="77" y2="23" />
            <line x1="42" y1="38" x2="35" y2="35" />
            <line x1="78" y1="38" x2="85" y2="35" />
            <line x1="39" y1="50" x2="33" y2="50" />
            <line x1="81" y1="50" x2="87" y2="50" />
          </g>

          {/* Pelita (Beacon / Flame of Hope) */}
          <path
            d="M 60,26 C 52,35 51,44 60,55 C 69,44 68,35 60,26 Z"
            fill="#FBBF24"
          />
          <path
            d="M 60,32 C 55,37 55,43 60,49 C 65,43 65,37 60,32 Z"
            fill="#FEF08A"
          />
          {/* Lighthouse Cup Base */}
          <path d="M 50,55 L 70,55 L 66,61 L 54,61 Z" fill="#D4AF37" />

          {/* Open Bible of Truth */}
          <path
            d="M 60,69 C 50,65 40,67 35,71 L 35,78 C 40,74 50,73 60,76 Z"
            fill="#FFFFFF"
            stroke="#CBD5E1"
            strokeWidth="0.8"
          />
          <path
            d="M 60,69 C 70,65 80,67 85,71 L 85,78 C 80,74 70,73 60,76 Z"
            fill="#FFFFFF"
            stroke="#CBD5E1"
            strokeWidth="0.8"
          />
          <line x1="60" y1="69" x2="60" y2="78" stroke="#D4AF37" strokeWidth="1.8" />

          {/* Golden Ribbon with "PELITA HARAPAN" */}
          <path
            d="M 28,88 L 60,84 L 92,88 L 88,96 L 60,92 L 32,96 Z"
            fill="#D4AF37"
            stroke="#B45309"
            strokeWidth="0.8"
          />
          <text x="60" y="92" fill="#071329" fontSize="4.8" fontWeight="900" textAnchor="middle" letterSpacing="0.8">
            PELITA HARAPAN
          </text>
        </svg>
      ),
    },
    {
      name: "Kolese Kanisius",
      logo: (
        <svg viewBox="0 0 120 120" className="w-16 h-16 sm:w-18 sm:h-18" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Kanisius Jesuit Collegiate Oval Shield */}
          <path
            d="M 60,10 C 90,10 102,30 102,60 C 102,90 90,110 60,110 C 30,110 18,90 18,60 C 18,30 30,10 60,10 Z"
            fill="#172554"
            stroke="#D97706"
            strokeWidth="3.5"
          />
          {/* Inner Deep Blue Field */}
          <path
            d="M 60,16 C 85,16 95,33 95,60 C 95,87 85,104 60,104 C 35,104 25,87 25,60 C 25,33 35,16 60,16 Z"
            fill="#0F172A"
          />

          {/* Radiant Sunburst (Sol Iustitiae - 16 Rays) */}
          <g stroke="#F59E0B" strokeWidth="2" strokeLinecap="round">
            {[0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5].map(
              (deg) => (
                <line
                  key={deg}
                  x1="60"
                  y1="56"
                  x2={60 + 28 * Math.cos((deg * Math.PI) / 180)}
                  y2={56 + 28 * Math.sin((deg * Math.PI) / 180)}
                  strokeDasharray="16 8"
                />
              )
            )}
          </g>

          {/* Central Sun Disc */}
          <circle cx="60" cy="56" r="18" fill="#FBBF24" stroke="#D97706" strokeWidth="1.5" />

          {/* Jesuit Red Cross */}
          <rect x="57" y="42" width="6" height="28" fill="#DC2626" rx="1" />
          <rect x="47" y="49" width="26" height="6" fill="#DC2626" rx="1" />

          {/* Three Passion Nails Base */}
          <path d="M 52,66 L 60,74 L 68,66" stroke="#172554" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Banner with "CANISIUS" */}
          <path
            d="M 32,86 L 60,82 L 88,86 L 85,94 L 60,90 L 35,94 Z"
            fill="#D97706"
            stroke="#78350F"
            strokeWidth="0.8"
          />
          <text x="60" y="90" fill="#FFFFFF" fontSize="5.5" fontWeight="900" textAnchor="middle" letterSpacing="1.2">
            CANISIUS
          </text>
        </svg>
      ),
    },
    {
      name: "Santa Ursula Jakarta",
      logo: (
        <svg viewBox="0 0 120 120" className="w-16 h-16 sm:w-18 sm:h-18" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Ursuline Green & Blue Crest */}
          <path
            d="M 60,10 L 98,22 C 98,64 82,94 60,110 C 38,94 22,64 22,22 Z"
            fill="#064E3B"
            stroke="#F59E0B"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          {/* Inner Deep Green Field */}
          <path
            d="M 60,16 L 92,26 C 92,60 78,88 60,102 C 42,88 28,60 28,26 Z"
            fill="#022C22"
            stroke="#FDE68A"
            strokeWidth="1.2"
          />

          {/* Ursa Minor Constellation (7 Golden Stars) */}
          {/* Polaris (North Star) - Largest */}
          <polygon points="76,28 78,33 83,34 79,37 80,42 76,39 72,42 73,37 69,34 74,33" fill="#FDE047" />
          <circle cx="60" cy="38" r="2.4" fill="#FBBF24" />
          <circle cx="50" cy="46" r="2.2" fill="#FBBF24" />
          <circle cx="44" cy="56" r="2.2" fill="#FBBF24" />
          <circle cx="54" cy="62" r="2.2" fill="#FBBF24" />
          <circle cx="66" cy="60" r="2.2" fill="#FBBF24" />
          <circle cx="62" cy="52" r="2.2" fill="#FBBF24" />

          {/* Dotted Constellation Lines */}
          <polyline
            points="76,35 60,38 50,46 44,56 54,62 66,60 62,52 44,56"
            fill="none"
            stroke="#FBBF24"
            strokeWidth="1"
            strokeDasharray="2 2"
            opacity="0.8"
          />

          {/* Golden Latin Cross (Symbol of Faith) */}
          <rect x="36" y="28" width="4" height="24" fill="#FBBF24" rx="0.8" />
          <rect x="30" y="34" width="16" height="4" fill="#FBBF24" rx="0.8" />

          {/* Silver Banner with Historic "SERVIAM" Motto */}
          <path
            d="M 28,88 L 60,84 L 92,88 L 88,96 L 60,92 L 32,96 Z"
            fill="#E2E8F0"
            stroke="#94A3B8"
            strokeWidth="0.8"
          />
          <text x="60" y="92.5" fill="#022C22" fontSize="6.2" fontWeight="900" textAnchor="middle" letterSpacing="1.5">
            SERVIAM
          </text>
        </svg>
      ),
    },
  ];

  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -280 : 280;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // Duplicate for seamless infinite marquee loop
  const marqueeSchools = [...schools, ...schools, ...schools];

  return (
    <section className="py-14 md:py-18 bg-slate-50/70 border-y border-slate-100 overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-6 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Section Header */}
        <div className="text-center sm:text-left">
          <p className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight">
            {title}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {lang === "id"
              ? "Standar kurikulum nasional, swasta unggulan, hingga yayasan multi-kampus"
              : "Premier national, private, and multi-campus educational foundations"}
          </p>
        </div>

        {/* Carousel Navigation Chevrons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => scroll("left")}
            aria-label="Scroll left"
            className="w-8 h-8 rounded-full bg-white border border-slate-200/90 shadow-2xs hover:bg-slate-50 hover:border-[#531FFF]/40 text-slate-600 hover:text-[#531FFF] flex items-center justify-center transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            aria-label="Scroll right"
            className="w-8 h-8 rounded-full bg-white border border-slate-200/90 shadow-2xs hover:bg-slate-50 hover:border-[#531FFF]/40 text-slate-600 hover:text-[#531FFF] flex items-center justify-center transition-all cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Carousel Container with Feathered Edge Fade Masks */}
      <div
        className="relative w-full overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Left Gradient Edge Fade */}
        <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-r from-slate-50 to-transparent z-10 pointer-events-none" />

        {/* Right Gradient Edge Fade */}
        <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-l from-slate-50 to-transparent z-10 pointer-events-none" />

        {/* Horizontal Marquee Runway */}
        <div
          ref={scrollRef}
          className="flex overflow-x-auto scrollbar-none py-2 px-4"
        >
          <motion.div
            animate={isPaused ? {} : { x: ["0%", "-33.333%"] }}
            transition={{
              ease: "linear",
              duration: 32,
              repeat: Infinity,
            }}
            className="flex items-center gap-4 sm:gap-6 shrink-0"
          >
            {marqueeSchools.map((school, i) => (
              <div
                key={i}
                title={school.name}
                aria-label={school.name}
                className="w-[180px] sm:w-[200px] md:w-[220px] shrink-0 flex flex-col items-center justify-center py-3 px-4 transition-all group cursor-pointer select-none"
              >
                <div className="transition-transform duration-300 group-hover:scale-110 flex items-center justify-center h-14 sm:h-16 w-full">
                  {school.logo}
                </div>
                <p className="mt-2.5 text-center text-xs sm:text-[13px] font-semibold text-slate-700 group-hover:text-[#531FFF] transition-colors leading-snug px-1 truncate w-full">
                  {school.name}
                </p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
