"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TeacherPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/dashboard");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] text-gray-400 text-sm font-medium">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-[#531FFF] border-t-transparent rounded-full animate-spin" />
        <span>Memuat Portal Guru...</span>
      </div>
    </div>
  );
}
