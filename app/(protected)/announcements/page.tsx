
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Megaphone, Plus, Search, Calendar, User, 
  Eye, AlertCircle, BookOpen, CreditCard, Activity, Info, Clock, CheckCircle2,
  Send, Sparkles, ChevronDown, PenTool, Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AnnouncementFormModal } from "@/components/announcements/announcement-form-modal";
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isParentRole } from "@/lib/roles-config";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { PageContentSkeleton } from "@/components/ui/role-loading-skeleton";
import { 
  TARGET_ROLE_OPTIONS, 
  isAnnouncementVisibleForRole, 
  getTargetsBadgeList,
  packAnnouncementDesc, 
  unpackAnnouncementDesc,
  cleanAnnouncementDesc 
} from "@/lib/announcements-helper";
import { AnnouncementDetailDrawer } from "@/components/announcements/announcement-detail-drawer";

const POPULAR_ANNOUNCEMENTS = [
  { title: "Libur Idul Fitri 1447 H", views: "1.245", date: "10 Apr 2026", color: "text-[#531FFF]", bgColor: "bg-[#531FFF]/10" },
  { title: "Pembayaran SPP Bulan Mei 2026", views: "987", date: "28 Apr 2026", color: "text-[#531FFF]", bgColor: "bg-[#531FFF]/10" },
  { title: "Ujian Tengah Semester Genap", views: "876", date: "12 Mar 2026", color: "text-red-500", bgColor: "bg-red-50" },
  { title: "Pengumuman Kelulusan Kelas 12", views: "765", date: "20 Mei 2025", color: "text-amber-500", bgColor: "bg-amber-50" },
  { title: "Daftar Ulang Tahun Ajaran Baru", views: "654", date: "15 Jun 2025", color: "text-emerald-500", bgColor: "bg-emerald-50" },
];

export default function AnnouncementsPage() {
  const toast = useToast();
  const [crudState, setCrudState] = useState<{ open: boolean; mode: "create" | "edit" | "delete" | "view"; data?: any }>({
    open: false,
    mode: "create"
  });
  
  // State for the modern detail drawer
  const [detailDrawer, setDetailDrawer] = useState<{ open: boolean; data?: any }>({
    open: false,
  });

  // Filters state
  const [statusFilter, setStatusFilter] = useState<string>("Semua");
  const [targetFilter, setTargetFilter] = useState<string>("Semua");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [quickTarget, setQuickTarget] = useState<string>("Semua");
  
  // Centralized useAuth
  const { role: authRole, rawRole: authRawRole, isAuthLoading, isRoleReady, isSuperAdmin, isAdmin, user } = useAuth();
  const userRole = (authRawRole || authRole || "").toLowerCase();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isStudent = userRole === "siswa" || userRole === "student";
  const isParent = isParentRole(userRole) || userRole === "orang-tua" || userRole === "parent";
  const isReadOnly = isStudent || isParent;

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "announcements"), (snap) => {
      const data = snap.docs.map(doc => {
        const raw = doc.data() as any;
        const meta = unpackAnnouncementDesc(raw.desc || "");
        return {
          id: doc.id,
          ...raw,
          desc: meta.cleanDesc,
          eventDate: raw.eventDate || meta.eventDate || "",
          eventTime: raw.eventTime || meta.eventTime || "",
          room: raw.room || meta.room || ""
        };
      });
      setAnnouncements(data);
      setLoading(false);
    }, (error) => {
      console.error("Announcements listener error:", error);
      setLoading(false);
    });

    return () => {
      unsub();
    };
  }, []);

  const getTheme = (tag: string) => {
    switch (tag) {
      case 'PENTING': return 'purple';
      case 'AKADEMIK': return 'orange';
      case 'KEUANGAN': return 'green';
      case 'KEGIATAN': return 'purple';
      case 'INFORMASI': return 'teal';
      default: return 'purple';
    }
  };

  const getTagColor = (tag: string) => {
    switch (tag) {
      case 'PENTING': return 'text-red-500 bg-red-50';
      case 'AKADEMIK': return 'text-blue-500 bg-blue-50';
      case 'KEUANGAN': return 'text-emerald-500 bg-emerald-50';
      case 'KEGIATAN': return 'text-[#531FFF] bg-[#531FFF]/10';
      case 'INFORMASI': return 'text-blue-500 bg-blue-50';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  /**
   * Parse Indonesian short-date strings like "10 Apr 2026", "5 Mei 2025", "2 Agu 2026"
   * into a JS Date (midnight, local time). Returns null if unparseable.
   */
  const parseIndonesianDate = (dateStr: string): Date | null => {
    if (!dateStr || typeof dateStr !== "string") return null;
    const MONTHS: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4,
      jun: 5, jul: 6, agu: 7, aug: 7, sep: 8, okt: 9, oct: 9, nov: 10, des: 11, dec: 11,
    };
    const parts = dateStr.trim().split(/\s+/);
    if (parts.length < 3) return null;
    const day = parseInt(parts[0], 10);
    const monthKey = parts[1].toLowerCase().slice(0, 3);
    const year = parseInt(parts[2], 10);
    const month = MONTHS[monthKey];
    if (isNaN(day) || month === undefined || isNaN(year)) return null;
    return new Date(year, month, day, 0, 0, 0, 0);
  };

  /**
   * Returns the effective display status for an announcement.
   * Priority: eventDate (ISO YYYY-MM-DD from date picker) → date (Indonesian string).
   * If the resolved date is in the past and status is Aktif/Terjadwal, returns "Berakhir".
   * Never writes to Firestore.
   */
  const getComputedStatus = (item: any): string => {
    const storedStatus: string = item.status || "Aktif";
    if (storedStatus === "Berakhir") return "Berakhir";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Prefer eventDate (ISO YYYY-MM-DD from the date picker — easy to parse)
    if (item.eventDate && typeof item.eventDate === "string" && item.eventDate.length >= 10) {
      const d = new Date(item.eventDate + "T00:00:00");
      if (!isNaN(d.getTime()) && d < today) return "Berakhir";
      return storedStatus;
    }

    // 2. Fall back to Indonesian-formatted date string
    const parsed = parseIndonesianDate(item.date || "");
    if (!parsed) return storedStatus;
    if (parsed < today) return "Berakhir";
    return storedStatus;
  };

  const handleCrudSubmit = async (data: any) => {
    if (isReadOnly) return;

    try {
      if (crudState.mode === "create") {
        const id = crypto.randomUUID();
        const tag = data.tag || "INFORMASI";
        const cleanDescText = cleanAnnouncementDesc(data.desc || "");
        const packedDesc = packAnnouncementDesc(cleanDescText, {
          eventDate: data.eventDate || "",
          eventTime: data.eventTime || "",
          room: data.room || ""
        });

        // Normalize target (handles array from multiselect)
        let targetString = "Semua";
        if (Array.isArray(data.target)) {
          if (data.target.includes("Semua") || data.target.length === 0) {
            targetString = "Semua";
          } else {
            targetString = data.target.join(", ");
          }
        } else if (typeof data.target === "string" && data.target.trim()) {
          targetString = data.target.trim();
        }

        // Exactly 11 keys required by Firestore security rules:
        // ['title', 'desc', 'target', 'tag', 'author', 'status', 'tagColor', 'theme', 'date', 'createdAt', 'updatedAt']
        await setDoc(doc(db, "announcements", id), {
          title: (data.title || "Pengumuman Baru").slice(0, 200),
          desc: packedDesc.slice(0, 2000),
          target: targetString.slice(0, 100),
          tag: tag.slice(0, 50),
          author: (user?.displayName || (isSuperAdmin ? "Super Admin" : "Admin Sekolah")).slice(0, 100),
          status: data.status || "Aktif",
          tagColor: getTagColor(tag),
          theme: getTheme(tag),
          date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        toast.showSuccess("Pengumuman baru berhasil dibuat dan dipublikasikan.", "Berhasil Buat");
      } else if (crudState.mode === "edit" && crudState.data?.id) {
        const tag = data.tag || crudState.data.tag || "INFORMASI";
        const cleanDescText = cleanAnnouncementDesc(data.desc !== undefined ? data.desc : crudState.data.desc || "");
        const packedDesc = packAnnouncementDesc(cleanDescText, {
          eventDate: data.eventDate !== undefined ? data.eventDate : crudState.data.eventDate || "",
          eventTime: data.eventTime !== undefined ? data.eventTime : crudState.data.eventTime || "",
          room: data.room !== undefined ? data.room : crudState.data.room || ""
        });

        // Normalize target (handles array from multiselect)
        let targetString = crudState.data.target || "Semua";
        if (data.target !== undefined) {
          if (Array.isArray(data.target)) {
            if (data.target.includes("Semua") || data.target.length === 0) {
              targetString = "Semua";
            } else {
              targetString = data.target.join(", ");
            }
          } else if (typeof data.target === "string" && data.target.trim()) {
            targetString = data.target.trim();
          }
        }

        // Update fields matching security rules:
        // ['title', 'desc', 'target', 'tag', 'author', 'status', 'tagColor', 'theme', 'date', 'updatedAt']
        await updateDoc(doc(db, "announcements", crudState.data.id), {
          title: (data.title || crudState.data.title || "Pengumuman").slice(0, 200),
          desc: packedDesc.slice(0, 2000),
          target: targetString.slice(0, 100),
          tag: tag.slice(0, 50),
          status: data.status || crudState.data.status || "Aktif",
          tagColor: getTagColor(tag),
          theme: getTheme(tag),
          updatedAt: serverTimestamp()
        });
        toast.showEdit("Pengumuman berhasil diperbarui.", "Berhasil Edit");
      } else if (crudState.mode === "delete" && crudState.data?.id) {
        await deleteDoc(doc(db, "announcements", crudState.data.id));
        toast.showError("Pengumuman telah berhasil dihapus dari sistem.", "Berhasil Hapus");
      }
    } catch (error) {
      console.error("Error saving announcement", error);
      throw error;
    }
  };

  /**
   * Helper to extract a timestamp value from an announcement document
   * for consistent, deterministic sorting.
   */
  const getAnnouncementTimestamp = (item: any): number => {
    if (item.createdAt?.toMillis && typeof item.createdAt.toMillis === "function") {
      return item.createdAt.toMillis();
    }
    if (item.createdAt?.seconds) {
      return item.createdAt.seconds * 1000;
    }
    if (item.eventDate && typeof item.eventDate === "string") {
      const t = new Date(item.eventDate + "T00:00:00").getTime();
      if (!isNaN(t)) return t;
    }
    const parsed = parseIndonesianDate(item.date || "");
    if (parsed) return parsed.getTime();
    return 0;
  };

  // 1. Filter based on user role authorization (Siswa only sees Siswa/Semua, etc.)
  const visibleAnnouncements = useMemo(() => {
    return announcements.filter((item) =>
      isAnnouncementVisibleForRole(item.target, userRole, isSuperAdmin, isAdmin)
    );
  }, [announcements, userRole, isSuperAdmin, isAdmin]);

  // 2. Filter based on selected tabs, target role pills, and search query
  //    Sort: Pengumuman yang BELUM KADALUWARSA di ATAS, KADALUWARSA di BAWAH
  const filteredAnnouncements = useMemo(() => {
    const list = visibleAnnouncements.filter((item) => {
      const effectiveStatus = getComputedStatus(item);

      // Status tab filter — compare against computed (auto-expired) status
      if (statusFilter !== "Semua") {
        if (statusFilter === "Pengumuman Aktif" && effectiveStatus !== "Aktif") return false;
        if (statusFilter === "Terjadwal" && effectiveStatus !== "Terjadwal") return false;
        if (statusFilter === "Berakhir" && effectiveStatus !== "Berakhir") return false;
      }

      // Target role filter (for Admin / Super Admin)
      if (targetFilter !== "Semua") {
        const itemTarget = (item.target || "Semua").toLowerCase();
        const selected = targetFilter.toLowerCase();
        if (selected !== "semua" && !itemTarget.includes(selected)) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (item.title || "").toLowerCase().includes(q);
        const matchesDesc = (item.desc || "").toLowerCase().includes(q);
        const matchesAuthor = (item.author || "").toLowerCase().includes(q);
        const matchesTarget = (item.target || "").toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesAuthor && !matchesTarget) return false;
      }

      return true;
    });

    // Urutkan: Yang belum kadaluwarsa (Aktif, Terjadwal) di ATAS, yang kadaluwarsa (Berakhir) di BAWAH
    return list.sort((a, b) => {
      const statusA = getComputedStatus(a);
      const statusB = getComputedStatus(b);
      const isExpiredA = statusA === "Berakhir";
      const isExpiredB = statusB === "Berakhir";

      // 1. Belum kadaluwarsa selalu ditempatkan sebelum yang sudah kadaluwarsa
      if (isExpiredA !== isExpiredB) {
        return isExpiredA ? 1 : -1;
      }

      // 2. Dalam grup yang sama, urutkan berdasarkan data terbaru (descending timestamp)
      const timeA = getAnnouncementTimestamp(a);
      const timeB = getAnnouncementTimestamp(b);
      return timeB - timeA;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleAnnouncements, statusFilter, targetFilter, searchQuery]);

  const metrics = [
    { label: "Total Pengumuman", value: visibleAnnouncements.length, desc: "Sesuai hak akses", icon: Megaphone, color: "text-[#531FFF]", bgColor: "bg-[#531FFF]/10", iconBg: "bg-[#531FFF]" },
    { label: "Pengumuman Aktif", value: visibleAnnouncements.filter(a => getComputedStatus(a) === 'Aktif').length, desc: "Sedang berjalan", icon: Send, color: "text-emerald-500", bgColor: "bg-emerald-50", iconBg: "bg-emerald-500" },
    { label: "Terjadwal", value: visibleAnnouncements.filter(a => getComputedStatus(a) === 'Terjadwal').length, desc: "Akan tayang", icon: Clock, color: "text-amber-500", bgColor: "bg-amber-50", iconBg: "bg-amber-500" },
    { label: "Berakhir", value: visibleAnnouncements.filter(a => getComputedStatus(a) === 'Berakhir').length, desc: "Selesai", icon: CheckCircle2, color: "text-blue-500", bgColor: "bg-blue-50", iconBg: "bg-blue-500" },
  ];

  const categories = [
    { label: "Penting", count: visibleAnnouncements.filter(a => a.tag === 'PENTING').length, icon: AlertCircle, color: "text-red-500", bgColor: "bg-red-50" },
    { label: "Akademik", count: visibleAnnouncements.filter(a => a.tag === 'AKADEMIK').length, icon: BookOpen, color: "text-blue-500", bgColor: "bg-blue-50" },
    { label: "Keuangan", count: visibleAnnouncements.filter(a => a.tag === 'KEUANGAN').length, icon: CreditCard, color: "text-emerald-500", bgColor: "bg-emerald-50" },
    { label: "Kegiatan", count: visibleAnnouncements.filter(a => a.tag === 'KEGIATAN').length, icon: Activity, color: "text-amber-500", bgColor: "bg-amber-50" },
    { label: "Informasi", count: visibleAnnouncements.filter(a => a.tag === 'INFORMASI').length, icon: Info, color: "text-blue-400", bgColor: "bg-blue-50" },
  ];

  if (isAuthLoading || !isRoleReady || loading) {
    return <PageContentSkeleton />;
  }

  return (
    <div className="p-8 pb-12 max-w-[1600px] mx-auto w-full h-full flex flex-col space-y-6">
      {/* 1. Modal Form CRUD Redesigned (Create, Edit, Delete) */}
      <AnnouncementFormModal 
        open={crudState.open} 
        onOpenChange={(open) => setCrudState(s => ({ ...s, open }))}
        mode={crudState.mode as "create" | "edit" | "delete"}
        initialData={crudState.data}
        onSubmit={handleCrudSubmit}
      />

      {/* 2. Redesigned Announcement Detail Drawer */}
      <AnnouncementDetailDrawer
        open={detailDrawer.open}
        onClose={() => setDetailDrawer({ open: false })}
        announcement={detailDrawer.data}
        onEdit={!isReadOnly ? () => {
          const item = detailDrawer.data;
          setDetailDrawer({ open: false });
          setCrudState({ 
            open: true, 
            mode: "edit", 
            data: {
              ...item,
              desc: cleanAnnouncementDesc(item?.desc),
              target: item?.target || "Semua"
            } 
          });
        } : undefined}
        onDelete={!isReadOnly ? () => {
          const item = detailDrawer.data;
          setDetailDrawer({ open: false });
          setCrudState({ open: true, mode: "delete", data: item });
        } : undefined}
        isReadOnly={isReadOnly}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Pengumuman</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#531FFF]/10 text-[#531FFF]">
              {visibleAnnouncements.length} Total
            </span>
          </div>
          <p className="text-[13px] text-gray-500 mt-1 font-medium">
            Informasi resmi terverifikasi yang ditujukan untuk warga sekolah sesuai peran pengguna.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isReadOnly && (
            <button 
              onClick={() => setCrudState({ open: true, mode: "create" })}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#531FFF] text-white hover:bg-[#4314E5] rounded-xl text-[13px] font-bold shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" /> Buat Pengumuman
            </button>
          )}
        </div>
      </div>


      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-[24px] p-5 flex items-center justify-between shadow-sm">
             <div className="flex items-center gap-4">
               <div className={cn("w-14 h-14 rounded-full flex items-center justify-center", m.bgColor)}>
                 <m.icon className={cn("w-6 h-6", m.color)} />
               </div>
               <div>
                  <div className="text-[12px] font-bold text-gray-500 mb-0.5">{m.label}</div>
                  <div className="text-2xl font-bold text-gray-900">{m.value}</div>
                  <div className="text-[11px] font-medium text-gray-400 mt-0.5">{m.desc}</div>
               </div>
             </div>
          </div>
        ))}
      </div>

      {/* Main Layout Area */}
      <div className="flex flex-col xl:flex-row gap-6 items-start mt-2">
          {/* Left Column: List */}
          <div className="flex-1 w-full flex flex-col gap-6">
            {/* Tabs and Search */}
            <div className="flex flex-col gap-3 border-b border-gray-100 pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                  {(["Semua", "Pengumuman Aktif", "Terjadwal", "Berakhir"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setStatusFilter(tab)}
                      className={cn(
                        "text-[13px] font-bold pb-2 transition-all cursor-pointer relative",
                        statusFilter === tab
                          ? "text-[#531FFF] border-b-2 border-[#531FFF]"
                          : "text-gray-500 hover:text-gray-900 border-b-2 border-transparent"
                      )}
                    >
                      {tab === "Pengumuman Aktif" && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 align-middle" />
                      )}
                      {tab}
                    </button>
                  ))}
                </div>
                
                <div className="relative w-full sm:w-[280px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari pengumuman..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-[13px] placeholder:text-gray-400 bg-white focus:outline-none focus:border-[#531FFF] focus:ring-1 focus:ring-[#531FFF] transition-all"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Target Role Filter Pills for Admins */}
              {(isSuperAdmin || isAdmin) && (
                <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1 scrollbar-none">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1">
                    Target:
                  </span>
                  {["Semua", "Siswa", "Guru", "Orang Tua", "Kepala Sekolah", "Admin Sekolah", "Super Admin"].map((r) => {
                    const isSelected = targetFilter === r;
                    return (
                      <button
                        key={r}
                        onClick={() => setTargetFilter(r)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer active:scale-95",
                          isSelected
                            ? "bg-[#531FFF] text-white shadow-2xs"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200/70"
                        )}
                      >
                        {r === "Semua" ? "Semua Target" : r}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Announcements List */}
            <div className="flex flex-col gap-4">
              {loading ? (
                <div className="py-12 flex justify-center text-gray-400 font-medium">Memuat data pengumuman...</div>
              ) : filteredAnnouncements.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-gray-400 bg-white border border-gray-100 rounded-2xl border-dashed p-6 text-center shadow-xs">
                  <div className="w-14 h-14 rounded-2xl bg-purple-50 text-[#531FFF] flex items-center justify-center mb-3">
                    <Megaphone className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-gray-800">Tidak ada pengumuman</h3>
                  <p className="text-[13px] text-gray-500 mt-1 max-w-sm">
                    {searchQuery 
                      ? "Tidak ditemukan pengumuman yang sesuai dengan kata kunci pencarian Anda."
                      : "Belum ada pengumuman yang aktif untuk kategori atau filter yang dipilih."}
                  </p>
                  {(searchQuery || statusFilter !== "Semua" || targetFilter !== "Semua") && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("Semua");
                        setTargetFilter("Semua");
                      }}
                      className="mt-4 px-3.5 py-1.5 text-xs font-bold text-[#531FFF] bg-[#531FFF]/10 hover:bg-[#531FFF]/15 rounded-lg transition-colors cursor-pointer"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>
              ) : (
                filteredAnnouncements.map((item, index) => {
                  const targetBadges = getTargetsBadgeList(item.target || "Semua");
                  // Compute effective status (auto-expire by date) — no DB write
                  const effectiveStatus = getComputedStatus(item);
                  const isAutoExpired = effectiveStatus === "Berakhir" && item.status !== "Berakhir";
                  const isExpired = effectiveStatus === "Berakhir";

                  // Check if this is the transition point from non-expired to expired announcements
                  const prevItem = index > 0 ? filteredAnnouncements[index - 1] : null;
                  const isFirstExpiredItem = isExpired && (prevItem ? getComputedStatus(prevItem) !== "Berakhir" : false);

                  return (
                    <React.Fragment key={item.id}>
                      {isFirstExpiredItem && (
                        <div className="flex items-center gap-3 pt-4 pb-1">
                          <div className="h-px bg-gray-200/80 flex-1" />
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 bg-gray-100 border border-gray-200/80 px-3.5 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            Pengumuman Kedaluwarsa / Selesai
                          </span>
                          <div className="h-px bg-gray-200/80 flex-1" />
                        </div>
                      )}

                      <div 
                        onClick={() => setDetailDrawer({ open: true, data: item })}
                        className={cn(
                        "flex flex-col sm:flex-row rounded-2xl p-4 transition-all gap-4 items-stretch group cursor-pointer border",
                        isExpired
                          ? "bg-gray-50 border-gray-200/70 opacity-70 grayscale-[30%] hover:opacity-90 hover:grayscale-0 hover:border-gray-300 shadow-none"
                          : "bg-white border-gray-100 hover:border-[#531FFF]/30 shadow-xs hover:shadow-md"
                      )}
                    >
                      {/* Illustration Thumbnail */}
                      <div className={cn(
                        "w-full sm:w-[200px] h-[130px] sm:h-auto rounded-xl relative overflow-hidden shrink-0 flex items-center justify-center p-4 transition-transform",
                        !isExpired && "group-hover:scale-[1.01]",
                        isExpired
                          ? "bg-gray-200/60"
                          : item.theme === "purple" ? "bg-gradient-to-br from-purple-100 to-indigo-100"
                          : item.theme === "orange" ? "bg-gradient-to-br from-amber-100 to-orange-100"
                          : item.theme === "green" ? "bg-gradient-to-br from-emerald-100 to-teal-100"
                          : "bg-gradient-to-br from-sky-100 to-cyan-100"
                      )}>
                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_white_10%,_transparent_60%)]"></div>
                        <h3 className={cn(
                          "text-lg font-black text-center z-10 leading-tight tracking-tight",
                          isExpired ? "text-gray-400"
                          : item.theme === "purple" ? "text-purple-800"
                          : item.theme === "orange" ? "text-orange-800"
                          : item.theme === "green" ? "text-emerald-800"
                          : "text-sky-800"
                        )}>
                          {item.title.split(" ").slice(0, 2).join(" ")}<br/>
                          {item.title.split(" ").slice(2, 5).join(" ")}
                        </h3>
                        {/* Expired overlay ribbon */}
                        {isExpired && (
                          <div className="absolute bottom-0 inset-x-0 bg-gray-400/20 backdrop-blur-[1px] flex items-center justify-center py-1.5">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">
                              Berakhir
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 flex flex-col justify-between py-1 pr-1">
                        <div>
                          <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {/* Category Badge */}
                              <span className={cn(
                                "text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider",
                                isExpired ? "text-gray-400 bg-gray-100" : item.tagColor
                              )}>
                                {item.tag}
                              </span>

                              {/* Target Role Badges (Supports Multi-Role) */}
                              {targetBadges.map((tb, idx) => {
                                const IconComp = tb.icon;
                                return (
                                  <span
                                    key={idx}
                                    className={cn(
                                      "text-[11px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 shadow-2xs",
                                      isExpired ? "text-gray-400 bg-gray-50 border-gray-200" : tb.badgeColor
                                    )}
                                  >
                                    <IconComp className="w-3 h-3" />
                                    <span>{tb.label.split(" (")[0]}</span>
                                  </span>
                                );
                              })}

                              {/* Auto-expired pill — only shows when date-based, not manually set */}
                              {isAutoExpired && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 border border-gray-200 flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  Kedaluwarsa otomatis
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              {/* Status pill — shows computed status */}
                              <span className={cn(
                                "text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1",
                                effectiveStatus === "Aktif"
                                  ? "text-emerald-700 bg-emerald-50 border border-emerald-200/70"
                                  : effectiveStatus === "Terjadwal"
                                  ? "text-amber-700 bg-amber-50 border border-amber-200/70"
                                  : "text-gray-500 bg-gray-100 border border-gray-200"
                              )}>
                                <span className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  effectiveStatus === "Aktif" ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
                                )} />
                                {effectiveStatus}
                              </span>

                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => setDetailDrawer({ open: true, data: item })}
                                  className="p-1.5 text-gray-400 hover:text-[#531FFF] hover:bg-[#531FFF]/10 rounded-lg transition-colors cursor-pointer" 
                                  title="Buka Drawer Pengumuman"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                {!isReadOnly && (
                                  <>
                                    <button 
                                      onClick={() => setCrudState({ 
                                        open: true, 
                                        mode: "edit", 
                                        data: {
                                          ...item,
                                          desc: cleanAnnouncementDesc(item.desc),
                                          target: item.target || "Semua"
                                        } 
                                      })}
                                      className="p-1.5 text-gray-400 hover:text-[#531FFF] hover:bg-[#531FFF]/10 rounded-lg transition-colors cursor-pointer" 
                                      title="Edit Pengumuman"
                                    >
                                      <PenTool className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => setCrudState({ open: true, mode: "delete", data: item })}
                                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer" 
                                      title="Hapus Pengumuman"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <h3 className={cn(
                            "text-[16px] font-bold mb-1.5 leading-snug transition-colors",
                            isExpired
                              ? "text-gray-400"
                              : "text-gray-900 group-hover:text-[#531FFF]"
                          )}>
                            {item.title}
                          </h3>
                          <p className={cn(
                            "text-[13px] leading-relaxed max-w-3xl line-clamp-2",
                            isExpired ? "text-gray-400" : "text-gray-500"
                          )}>
                            {cleanAnnouncementDesc(item.desc)}
                          </p>
                        </div>
                        
                        <div className={cn(
                          "flex flex-wrap items-center gap-4 sm:gap-6 mt-4 pt-2 border-t text-[12px]",
                          isExpired ? "border-gray-100 text-gray-400" : "border-gray-50 text-gray-500"
                        )}>
                          <div className="flex items-center gap-1.5">
                            <Calendar className={cn("w-3.5 h-3.5", isExpired ? "text-gray-300" : "text-gray-400")} />
                            <span className="font-medium">{item.date || "-"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <User className={cn("w-3.5 h-3.5", isExpired ? "text-gray-300" : "text-gray-400")} />
                            <span className="font-medium">{item.author || "Admin Sekolah"}</span>
                          </div>
                          {isExpired ? (
                            <div className="flex items-center gap-1 text-gray-400 font-semibold ml-auto">
                              <Clock className="w-3.5 h-3.5" />
                              <span className="text-[11px]">Sudah Berakhir</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[#531FFF] font-semibold ml-auto">
                              <span>Baca Selengkapnya</span>
                              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })
              )}
            </div>
          </div>

          {/* Right Column: Sidebar Panels */}
          <div className="w-full xl:w-[340px] shrink-0 flex flex-col gap-6">
            
            {/* Categories */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-[14px] font-bold text-gray-900">Kategori Pengumuman</h3>
                {!isReadOnly && (
                  <button 
                    onClick={() => setCrudState({ open: true, mode: "create" })}
                    className="text-[11px] font-bold text-[#531FFF] hover:underline"
                  >
                    + Tambah
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-2.5">
                {categories.map((c, i) => (
                  <div 
                    key={i} 
                    onClick={() => {
                      setSearchQuery(c.label.toUpperCase());
                    }}
                    className="flex items-center justify-between p-2.5 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group border border-transparent hover:border-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shadow-2xs", c.bgColor)}>
                        <c.icon className={cn("w-4 h-4", c.color)} />
                      </div>
                      <span className="text-[13px] font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">
                        {c.label}
                      </span>
                    </div>
                    <span className="text-[12px] font-bold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-md">
                      {c.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Popular Announcements */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs">
              <h3 className="text-[14px] font-bold text-gray-900 mb-5">Pengumuman Terpopuler</h3>
              <div className="flex flex-col gap-4">
                {POPULAR_ANNOUNCEMENTS.map((p, i) => (
                  <div 
                    key={i} 
                    onClick={() => {
                      const matched = announcements.find(a => (a.title || "").toLowerCase().includes(p.title.toLowerCase().slice(0, 10)));
                      if (matched) {
                        setDetailDrawer({ open: true, data: matched });
                      } else {
                        setDetailDrawer({
                          open: true,
                          data: {
                            title: p.title,
                            desc: `Informasi lengkap mengenai ${p.title}. Diumumkan secara resmi melalui portal Quick Schools untuk seluruh warga sekolah.`,
                            date: p.date,
                            target: "Semua",
                            tag: "INFORMASI",
                            status: "Aktif",
                            author: "Admin Sekolah"
                          }
                        });
                      }
                    }}
                    className="flex gap-3 group cursor-pointer p-1.5 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs", p.bgColor)}>
                      <Megaphone className={cn("w-4 h-4", p.color)} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[13px] font-bold text-gray-800 group-hover:text-[#531FFF] transition-colors leading-tight mb-1 line-clamp-1">
                        {p.title}
                      </h4>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-gray-400">
                          <Eye className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-medium">{p.views}</span>
                        </div>
                        <span className="text-[10px] font-medium text-gray-400">{p.date}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Send (Only for Staff / Admin) */}
            {!isReadOnly && (
              <div className="bg-[#F8F9FE] border border-[#531FFF]/15 rounded-2xl p-6 shadow-xs relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#531FFF]/5 rounded-bl-[100px] pointer-events-none"></div>
                
                <div className="flex items-center justify-between mb-2 relative z-10">
                  <h3 className="text-[14px] font-bold text-gray-900">Kirim Pengumuman Cepat</h3>
                  <Sparkles className="w-4 h-4 text-[#531FFF]" />
                </div>
                
                <p className="text-[12px] text-gray-500 mb-4 leading-relaxed relative z-10">
                  Pilih target role yang dituju untuk membuat pengumuman spesifik.
                </p>
                
                <div className="flex flex-col gap-3 relative z-10">
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1.5">
                      Target Penerima Role
                    </label>
                    <div className="relative">
                      <select 
                        value={quickTarget}
                        onChange={(e) => setQuickTarget(e.target.value)}
                        className="w-full appearance-none bg-white border border-gray-200 text-gray-800 text-[13px] rounded-lg px-3 py-2.5 outline-none focus:border-[#531FFF] focus:ring-1 focus:ring-[#531FFF] font-semibold shadow-2xs"
                      >
                        {TARGET_ROLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setCrudState({ 
                      open: true, 
                      mode: "create",
                      data: { target: quickTarget }
                    })}
                    className="w-full bg-[#531FFF] text-white font-bold text-[13px] py-2.5 rounded-xl hover:bg-[#4314E5] transition-all shadow-xs hover:shadow-md mt-1 cursor-pointer active:scale-98"
                  >
                    Tulis Pengumuman
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
  );
}


