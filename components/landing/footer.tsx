"use client";

import Link from "next/link";
import { Zap, Twitter, Instagram, Linkedin, Mail, MapPin, Phone } from "lucide-react";

interface FooterProps {
  lang: "id" | "en";
}

export default function LandingFooter({ lang }: FooterProps) {
  const t = {
    id: {
      tagline: "Platform sistem informasi manajemen sekolah cerdas terdepan di Indonesia.",
      prod: "Produk",
      company: "Perusahaan",
      contact: "Kontak",
      links: {
        prod: [
          "Absensi Siswa & Guru",
          "Jadwal & Kalender",
          "Pembayaran SPP",
          "Laporan Keuangan",
          "Pengumuman Sekolah",
          "Penilaian & Rapor"
        ],
        company: [
          "Tentang Kami",
          "Blog",
          "Karir",
          "Partner Sekolah",
          "Kebijakan Privasi",
          "Syarat & Ketentuan"
        ],
      },
      rights: "Hak cipta dilindungi undang-undang.",
      made: "Dibuat dengan ❤️ untuk pendidikan Indonesia",
    },
    en: {
      tagline: "Leading smart school management information platform in Indonesia.",
      prod: "Product",
      company: "Company",
      contact: "Contact",
      links: {
        prod: [
          "Student & Teacher Attendance",
          "Schedule & Calendar",
          "Tuition (SPP) Payment",
          "Financial Reports",
          "School Announcements",
          "Grades & Report Cards"
        ],
        company: [
          "About Us",
          "Blog",
          "Careers",
          "School Partners",
          "Privacy Policy",
          "Terms of Service"
        ],
      },
      rights: "All rights reserved.",
      made: "Made with ❤️ for Indonesian education",
    },
  }[lang];

  const prodLinks = [
    "/features/absensi",
    "/features/akademik",
    "/features/spp",
    "/features/keuangan",
    "/features/pengumuman",
    "/features/laporan"
  ];
  const companyLinks = ["#about", "#blog", "#careers", "#partners", "#privacy", "#terms"];

  return (
    <footer className="bg-slate-50 border-t border-slate-200/80 text-slate-600 relative overflow-hidden">
      {/* Subtle Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-[#531FFF]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 pt-16 pb-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          
          {/* Brand */}
          <div className="lg:col-span-1 space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#531FFF] to-[#4314cc] flex items-center justify-center shadow-md shadow-[#531FFF]/25">
                <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <div className="leading-none">
                <span className="font-extrabold text-[17px] text-slate-900 tracking-tight block">Quick Schools</span>
                <span className="text-[9px] font-bold text-[#531FFF] uppercase tracking-[0.2em] block mt-0.5">School OS</span>
              </div>
            </Link>
            
            <p className="text-[13px] leading-relaxed text-slate-500 max-w-[240px]">
              {t.tagline}
            </p>

            {/* Social Icons */}
            <div className="flex items-center gap-2.5 pt-1">
              {[Twitter, Instagram, Linkedin].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center text-slate-500 hover:text-[#531FFF] hover:border-[#531FFF]/40 hover:bg-slate-50 shadow-2xs transition-all"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-bold text-slate-900 text-[13px] mb-5 uppercase tracking-wider">
              {t.prod}
            </h4>
            <ul className="space-y-3">
              {t.links.prod.map((item, i) => (
                <li key={i}>
                  <Link
                    href={prodLinks[i]}
                    className="text-[13px] text-slate-500 hover:text-[#531FFF] transition-colors font-medium block"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-bold text-slate-900 text-[13px] mb-5 uppercase tracking-wider">
              {t.company}
            </h4>
            <ul className="space-y-3">
              {t.links.company.map((item, i) => (
                <li key={i}>
                  <a
                    href={companyLinks[i]}
                    className="text-[13px] text-slate-500 hover:text-[#531FFF] transition-colors font-medium block"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h4 className="font-bold text-slate-900 text-[13px] mb-5 uppercase tracking-wider">
              {t.contact}
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-[#531FFF] mt-0.5 shrink-0" />
                <span className="text-[13px] text-slate-500 font-medium">support@quickschools.id</span>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-[#531FFF] mt-0.5 shrink-0" />
                <span className="text-[13px] text-slate-500 font-medium">+62 21 1234 5678</span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#531FFF] mt-0.5 shrink-0" />
                <span className="text-[13px] text-slate-500 font-medium">Jakarta Selatan, Indonesia 12190</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-slate-500 font-medium">
            © {new Date().getFullYear()} Quick Schools. {t.rights}
          </p>
          <p className="text-[12px] text-slate-500 font-medium">
            {t.made}
          </p>
        </div>
      </div>
    </footer>
  );
}
