"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { DashboardSkeleton } from "@/components/ui/role-loading-skeleton";
import { isParentRole, isTeacherRole, isStudentRole } from "@/lib/roles-config";
import { StudentDashboardView } from "@/components/dashboard/student-dashboard-view";
import { TeacherDashboardView } from "@/components/dashboard/teacher-dashboard-view";
import { AdminDashboardView } from "@/components/dashboard/admin-dashboard-view";
import { ParentDashboardView } from "@/components/dashboard/parent-dashboard-view";

export default function DashboardPage() {
  const {
    userName: authUserName,
    role,
    rawRole,
    isAuthLoading,
    isRoleReady,
  } = useAuth();

  const [previewRole, setPreviewRole] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("Selamat pagi");
  const [academicYear, setAcademicYear] = useState("2026 / 2027");
  const [currentDate, setCurrentDate] = useState("");
  const [currentDay, setCurrentDay] = useState("");

  useEffect(() => {
    const updateGreeting = () => {
      const now = new Date();
      const currentHour = (now.getUTCHours() + 7) % 24; // WIB (UTC+7)
      
      if (currentHour >= 5 && currentHour < 12) {
        setGreeting("Selamat pagi");
      } else if (currentHour >= 12 && currentHour < 15) {
        setGreeting("Selamat siang");
      } else if (currentHour >= 15 && currentHour < 18) {
        setGreeting("Selamat sore");
      } else {
        setGreeting("Selamat malam");
      }

      const year = now.getFullYear();
      const month = now.getMonth();
      const startYear = month >= 6 ? year : year - 1;
      setAcademicYear(`${startYear} / ${startYear + 1}`);

      const dateFormatter = new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      setCurrentDate(dateFormatter.format(now));

      const dayFormatter = new Intl.DateTimeFormat('id-ID', {
        weekday: 'long'
      });
      setCurrentDay(dayFormatter.format(now));
    };
    
    updateGreeting();
  }, []);

  // 1. Role-Based Loading Guard: NEVER render Admin dashboard before user role is verified
  if (isAuthLoading || !isRoleReady) {
    return <DashboardSkeleton />;
  }

  const effectiveRole = (previewRole || rawRole || role || "admin").toLowerCase();
  const userName = authUserName || "User";

  // 2. Student Dashboard
  if (effectiveRole === "siswa" || effectiveRole === "student" || isStudentRole(effectiveRole)) {
    return (
      <div className="relative">
        {previewRole && (
          <div className="bg-[#531FFF] text-white px-6 py-2.5 text-xs font-bold flex items-center justify-between shadow-sm sticky top-0 z-30">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Pratinjau Siswa: Anda sedang melihat Dashboard sebagai <strong>Siswa (Student)</strong>.</span>
            </div>
            <button
              onClick={() => setPreviewRole(null)}
              className="px-3 py-1 bg-white text-[#531FFF] rounded-md text-xs font-black hover:bg-purple-50 transition-colors cursor-pointer"
            >
              Kembali ke Mode Asli ({rawRole || role})
            </button>
          </div>
        )}
        <StudentDashboardView 
          userName={userName}
          greeting={greeting}
          academicYear={academicYear}
          currentDate={currentDate}
          currentDay={currentDay}
        />
      </div>
    );
  }

  // 3. Teacher Dashboard
  if (effectiveRole === "guru" || effectiveRole === "teacher" || isTeacherRole(effectiveRole)) {
    return (
      <div className="relative">
        {previewRole && (
          <div className="bg-amber-500 text-white px-6 py-2.5 text-xs font-bold flex items-center justify-between shadow-sm sticky top-0 z-30">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>Pratinjau Guru: Anda sedang melihat Dashboard sebagai <strong>Guru Pengajar</strong>.</span>
            </div>
            <button
              onClick={() => setPreviewRole(null)}
              className="px-3 py-1 bg-white text-amber-900 rounded-md text-xs font-black hover:bg-amber-100 transition-colors cursor-pointer"
            >
              Kembali ke Mode Asli ({rawRole || role})
            </button>
          </div>
        )}
        <TeacherDashboardView 
          userName={userName}
          greeting={greeting}
          academicYear={academicYear}
          currentDate={currentDate}
          currentDay={currentDay}
        />
      </div>
    );
  }

  // 4. Parent Dashboard
  if (effectiveRole === "orang-tua" || effectiveRole === "parent" || isParentRole(effectiveRole)) {
    return (
      <div className="relative">
        {previewRole && (
          <div className="bg-[#531FFF] text-white px-6 py-2.5 text-xs font-bold flex items-center justify-between shadow-sm sticky top-0 z-30">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Pratinjau Orang Tua: Anda sedang melihat Dashboard sebagai <strong>Orang Tua / Wali Murid</strong>.</span>
            </div>
            <button
              onClick={() => setPreviewRole(null)}
              className="px-3 py-1 bg-white text-[#531FFF] rounded-md text-xs font-black hover:bg-purple-50 transition-colors cursor-pointer"
            >
              Kembali ke Mode Asli ({rawRole || role})
            </button>
          </div>
        )}
        <ParentDashboardView 
          userName={userName}
          greeting={greeting}
          academicYear={academicYear}
          currentDate={currentDate}
          currentDay={currentDay}
        />
      </div>
    );
  }

  // 5. Admin / Super Admin Dashboard
  return (
    <AdminDashboardView
      userName={userName}
      greeting={greeting}
      academicYear={academicYear}
      currentDate={currentDate}
      currentDay={currentDay}
      userRole={rawRole || role || "admin"}
      setPreviewRole={setPreviewRole}
    />
  );
}
